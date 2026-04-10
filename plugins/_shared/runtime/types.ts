// ─── Shared runtime types ─────────────────────────────────────────────────
//
// Minimal structural interfaces used by `plugins/_shared/runtime/*` modules.
// These deliberately do NOT import from any plugin's `plugin-api.d.ts` so the
// shared modules stay insulated from plugin-api version skew across plugins.
// Each plugin's own `PluginLogger` / `PluginHelpers.string` / `PluginHelpers.io`
// conform to these interfaces structurally at the call site.
//
// Rule of thumb: if a field needs to move between `_shared/runtime/*` and a
// plugin, declare it here with the smallest possible surface.

export interface SharedLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface SharedShellHelpers {
  shellEscape(arg: string): string;
}

export interface SharedIoHelpers {
  ensureDir(dirPath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
}
