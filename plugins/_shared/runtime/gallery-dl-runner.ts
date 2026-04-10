// ─── Shared gallery-dl runner ─────────────────────────────────────────────
//
// A thin, reusable wrapper around the `gallery-dl` CLI. Callers own the
// full gallery-dl config object (the runner just writes it to a temp JSON
// file, executes the CLI, parses stdout for downloaded files, and cleans up).
//
// Consumers today:
//   - plugin-gallery-dl: passes its rich buildConfig() result
//   - plugin-social:     passes a minimal per-post config for redgifs/imgur/etc.
//
// Cross-pipeline rule: this file must NOT import from `_shared/view/**`.

import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

import type {
  SharedLogger,
  SharedShellHelpers,
  SharedIoHelpers,
} from "./types";

const execAsync = promisify(exec);

export interface GalleryDlRunOptions {
  url: string;
  outputDir: string;
  /** Full gallery-dl config; the runner writes it to JSON and passes `--config`. */
  config: Record<string, unknown>;
  /** Extra CLI args inserted after `--config` and before the URL. */
  extraArgs?: string[];
  /** Kill the subprocess if it runs longer than this. Default 60_000 ms. */
  timeoutMs?: number;
  /** Optional external cancel signal. */
  signal?: AbortSignal;
  /**
   * Directory for the temporary config JSON. Defaults to
   * `<outputDir>/.gallery-dl-plugin/` (matches plugin-gallery-dl's historical
   * behavior). Callers that don't want a dotfile in their output can pass
   * `os.tmpdir()`.
   */
  configFileDir?: string;
  logger: SharedLogger;
  shell: SharedShellHelpers;
  io: SharedIoHelpers;
}

export interface GalleryDlRunResult {
  success: boolean;
  message: string;
  /** Absolute paths of files gallery-dl reported as downloaded on this run. */
  downloadedFiles: string[];
  /** gallery-dl version as reported on this run (if the binary was reachable). */
  version?: string;
  stdout: string;
  stderr: string;
}

// ─── gallery-dl availability probe ────────────────────────────────────────

let cachedAvailability: Promise<{
  available: boolean;
  version?: string;
  message: string;
}> | null = null;

/**
 * Probe whether `gallery-dl` is on PATH and report its version. The result
 * is cached for the lifetime of the Node process — callers that want to
 * re-probe (e.g. after the user installs gallery-dl mid-session) should call
 * {@link resetGalleryDlAvailabilityCache} first.
 */
export async function checkGalleryDlAvailable(
  _shell: SharedShellHelpers,
  logger: SharedLogger
): Promise<{ available: boolean; version?: string; message: string }> {
  if (cachedAvailability) return cachedAvailability;
  cachedAvailability = (async () => {
    try {
      const { stdout } = await execAsync("gallery-dl --version", {
        timeout: 10_000,
      });
      const version = stdout.trim();
      logger.info(`gallery-dl version: ${version}`);
      return { available: true, version, message: `gallery-dl ${version}` };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err);
      return {
        available: false,
        message:
          "gallery-dl is not installed or not in PATH. Install via: pip install gallery-dl (or pipx install gallery-dl). " +
          msg,
      };
    }
  })();
  return cachedAvailability;
}

export function resetGalleryDlAvailabilityCache(): void {
  cachedAvailability = null;
}

// ─── Runner ───────────────────────────────────────────────────────────────

/**
 * Runs `gallery-dl` with the supplied config against a single URL. Never
 * throws: any failure (missing binary, non-zero exit, timeout, cancellation)
 * is surfaced via `{ success: false, message, stderr }`.
 */
export async function runGalleryDl(
  opts: GalleryDlRunOptions
): Promise<GalleryDlRunResult> {
  const {
    url,
    outputDir,
    config,
    extraArgs = [],
    timeoutMs = 60_000,
    signal,
    logger,
    shell,
    io,
  } = opts;

  const availability = await checkGalleryDlAvailable(shell, logger);
  if (!availability.available) {
    return {
      success: false,
      message: availability.message,
      downloadedFiles: [],
      stdout: "",
      stderr: "",
    };
  }

  await io.ensureDir(outputDir);

  const configFileDir = opts.configFileDir ?? path.join(outputDir, ".gallery-dl-plugin");
  await io.ensureDir(configFileDir);

  // plugin-gallery-dl historically writes config.json into the output folder
  // and keeps it around for debugging. To preserve that, the runner only
  // cleans up when the caller explicitly opted into the OS tmpdir.
  const cleanupTemp = configFileDir === os.tmpdir();
  const configBasename = cleanupTemp
    ? `gallery-dl-config-${process.pid}-${Date.now()}.json`
    : "config.json";
  const configPath = path.join(configFileDir, configBasename);

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Failed to write gallery-dl config at ${configPath}: ${msg}`,
      downloadedFiles: [],
      stdout: "",
      stderr: "",
    };
  }

  const args = [
    "--config-ignore",
    "--config",
    configPath,
    ...extraArgs,
    url,
  ];

  logger.info(
    `Running gallery-dl (timeout ${timeoutMs}ms): gallery-dl ${args
      .map((a) => (a === configPath ? `"${a}"` : a))
      .join(" ")}`
  );

  const result = await new Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean; aborted: boolean }>(
    (resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let aborted = false;

      const child = spawn("gallery-dl", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        // Hard-kill fallback if it refuses to die
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
        }, 5_000);
      }, timeoutMs);

      const onAbort = () => {
        aborted = true;
        child.kill("SIGTERM");
      };
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener("abort", onAbort, { once: true });
      }

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (err) => {
        stderr += `\n[spawn error] ${err.message}`;
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
        resolve({ code, stdout, stderr, timedOut, aborted });
      });
    }
  );

  // Clean up the temp config file. On macOS/Linux this is best-effort —
  // we don't want cleanup errors to mask a real success/failure.
  if (cleanupTemp) {
    try {
      fs.unlinkSync(configPath);
    } catch {
      /* ignore */
    }
  }

  // Parse downloaded file paths from stdout. gallery-dl prints one file path
  // per line, optionally prefixed with `# ` for "already exists" messages in
  // verbose mode. We accept both and dedupe.
  const downloadedFiles: string[] = [];
  const seen = new Set<string>();
  const normalizedOutputDir = path.resolve(outputDir);
  for (const rawLine of result.stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Strip "# " prefix (gallery-dl verbose output for skipped files).
    const candidate = line.startsWith("# ") ? line.slice(2) : line;
    // Filter to lines that look like absolute paths under outputDir.
    if (!path.isAbsolute(candidate)) continue;
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(normalizedOutputDir)) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    downloadedFiles.push(resolved);
  }

  if (result.timedOut) {
    return {
      success: false,
      message: `gallery-dl timed out after ${timeoutMs}ms`,
      downloadedFiles,
      version: availability.version,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
  if (result.aborted) {
    return {
      success: false,
      message: "gallery-dl run was cancelled",
      downloadedFiles,
      version: availability.version,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
  if (result.code !== 0) {
    const tail = result.stderr.trim().split(/\r?\n/).slice(-3).join("\n");
    return {
      success: false,
      message: `gallery-dl exited with code ${result.code}${tail ? `: ${tail}` : ""}`,
      downloadedFiles,
      version: availability.version,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  return {
    success: true,
    message:
      downloadedFiles.length > 0
        ? `Downloaded ${downloadedFiles.length} file(s)`
        : "gallery-dl completed (no new files)",
    downloadedFiles,
    version: availability.version,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
