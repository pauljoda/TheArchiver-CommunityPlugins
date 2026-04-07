import path from "path";
import type {
  DownloadResult,
  PluginSettingsAccessor,
  PluginLogger,
  DownloadContext,
  ActionContext,
  ActionResult,
  ArchiverPlugin,
} from "./plugin-api";

interface Credentials {
  access_key: string;
  access_secret: string;
  logged_in_sig: string;
  logged_in_user: string;
}

interface XauthnResponse {
  success: boolean;
  values: {
    s3?: { access: string; secret: string };
    cookies?: { "logged-in-user": string; "logged-in-sig": string };
    screenname?: string;
    reason?: string;
  };
}

function loadStoredCredentials(settings: PluginSettingsAccessor): Credentials | null {
  const access_key = settings.get("access_key") || "";
  const access_secret = settings.get("access_secret") || "";
  const logged_in_sig = settings.get("logged_in_sig") || "";
  const logged_in_user = settings.get("logged_in_user") || "";

  if (!access_key && !access_secret && !logged_in_sig && !logged_in_user) {
    return null;
  }

  return { access_key, access_secret, logged_in_sig, logged_in_user };
}

function authCookies(credentials: Credentials): string {
  return `logged-in-sig=${credentials.logged_in_sig}; logged-in-user=${credentials.logged_in_user}`;
}

function authHeaders(credentials: Credentials): Record<string, string> {
  if (!credentials.access_key || !credentials.access_secret) return {};
  return {
    Authorization: `LOW ${credentials.access_key}:${credentials.access_secret}`,
  };
}

async function downloadFileWithAuth(
  url: string,
  outputPath: string,
  credentials: Credentials | null,
  helpers: DownloadContext["helpers"],
  logger: PluginLogger
): Promise<void> {
  const headers: Record<string, string> = {};
  if (credentials) {
    Object.assign(headers, authHeaders(credentials));
  }

  // Check for redirect first (archive.org redirects to S3 for file content)
  const checkRes = await fetch(url, { headers, redirect: "manual" });
  const finalUrl =
    checkRes.status >= 300 && checkRes.status < 400
      ? checkRes.headers.get("location") || url
      : url;

  if (finalUrl !== url) {
    logger.info(`Redirecting to: ${finalUrl}`);
  }

  // Download using core helper (handles directory creation and streaming)
  await helpers.io.downloadFile(finalUrl, outputPath, { headers });
}

async function downloadDirectory(
  url: string,
  outputDir: string,
  maxThreads: number,
  credentials: Credentials | null,
  context: DownloadContext
): Promise<DownloadResult> {
  const { helpers, logger } = context;

  try {
    logger.info(`Fetching directory listing: ${url}`);
    const cookies = credentials ? authCookies(credentials) : undefined;
    const html = await helpers.html.fetchPage(url, { cookies });
    logger.info(`Received ${html.length} bytes of HTML`);

    const $ = helpers.html.parse(html);

    const titleEl = $("div.download-directory-listing h1").first();
    if (!titleEl.length) {
      logger.error(`No directory listing found on page - may not be a valid /download/ page`);
      return { success: false, message: `Could not find directory listing title on ${url}` };
    }

    let title = titleEl.text().replace("Files for ", "");
    title = decodeURIComponent(helpers.string.sanitizeFilename(title));
    logger.info(`Item title: ${title}`);

    const downloadDir = path.join(outputDir, title);
    await helpers.io.ensureDir(downloadDir);

    // Extract links from the directory listing table
    const links: { href: string; text: string }[] = [];
    $("table.directory-listing-table tbody tr td a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text();
      links.push({ href, text });
    });
    logger.info(`Found ${links.length} total links on page`);

    const filtered = links.filter(
      (l) =>
        !l.text.includes("Go to parent directory") &&
        !l.text.includes("View Contents")
    );

    const baseUrl = url.replace(/\/+$/, "");
    const allLinks = filtered.map((l) => `${baseUrl}/${l.href}`);

    const directories = allLinks.filter((l) => l.endsWith("/"));
    const files = allLinks.filter((l) => !l.endsWith("/") && !l.includes(".ia."));
    logger.info(`Found ${files.length} files and ${directories.length} subdirectories`);

    if (files.length === 0 && directories.length === 0) {
      logger.warn(`No downloadable content found on ${url}`);
      return { success: false, message: `No downloadable files found on ${url}` };
    }

    // Download files with concurrency control
    const totalBatches = Math.ceil(files.length / maxThreads);
    for (let i = 0; i < files.length; i += maxThreads) {
      const batchNum = Math.floor(i / maxThreads) + 1;
      const chunk = files.slice(i, i + maxThreads);
      logger.info(`Downloading batch ${batchNum}/${totalBatches} (${chunk.length} files)`);
      await Promise.all(
        chunk.map(async (fileUrl) => {
          try {
            const fileName = decodeURIComponent(
              path.basename(new URL(fileUrl).pathname)
            );
            const localPath = path.join(downloadDir, fileName);

            if (await helpers.io.fileExists(localPath)) {
              logger.info(`Skipping existing: ${fileName}`);
              return;
            }

            logger.info(`Downloading: ${fileName}`);
            await downloadFileWithAuth(fileUrl, localPath, credentials, helpers, logger);
            logger.info(`Completed: ${fileName}`);
          } catch (e) {
            logger.error(`Failed: ${fileUrl} - ${(e as Error).message}`);
          }
        })
      );
    }

    // Recurse into subdirectories
    for (const subDir of directories) {
      logger.info(`Entering subdirectory: ${subDir}`);
      const result = await downloadDirectory(
        subDir,
        downloadDir,
        maxThreads,
        credentials,
        context
      );
      if (!result.success) return result;
    }
  } catch (e) {
    logger.error(`Error downloading ${url}: ${(e as Error).message}`);
    return {
      success: false,
      message: `Error downloading ${url}: ${(e as Error).message}`,
    };
  }

  logger.info(`Finished downloading from ${url}`);
  return { success: true, message: `Downloaded from ${url}` };
}

const plugin: ArchiverPlugin = {
  name: "Archive.org",
  version: "2.0.0",
  description: "Download content from Archive.org with optional authentication",
  urlPatterns: ["https://archive.org"],
  settings: [
    {
      key: "email",
      type: "string",
      label: "Email",
      description: "Your Archive.org account email address",
      required: false,
      sortOrder: 0,
    },
    {
      key: "password",
      type: "password",
      label: "Password",
      description: "Your Archive.org account password",
      required: false,
      sortOrder: 1,
    },
    {
      key: "authenticate",
      type: "action",
      label: "Authenticate",
      description: "Login to Archive.org and fetch session cookies",
      required: false,
      sortOrder: 2,
    },
  ],

  actions: {
    async authenticate({ settings, logger }): Promise<ActionResult> {
      const email = settings.get("email") || "";
      const password = settings.get("password") || "";

      if (!email || !password) {
        return {
          success: false,
          message: "Email and password are required",
        };
      }

      try {
        const body = new URLSearchParams({ email, password });
        const res = await fetch("https://archive.org/services/xauthn/?op=login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });

        if (!res.ok) {
          return {
            success: false,
            message: `Authentication request failed: ${res.status} ${res.statusText}`,
          };
        }

        const json = (await res.json()) as XauthnResponse;

        if (!json.success) {
          const reason = json.values?.reason || "unknown error";
          return { success: false, message: `Authentication failed: ${reason}` };
        }

        logger.info("Archive.org authentication successful");

        return {
          success: true,
          message: `Authenticated as ${json.values.cookies?.["logged-in-user"] || email}`,
          settingsUpdates: [
            { key: "access_key", value: json.values.s3?.access || "" },
            { key: "access_secret", value: json.values.s3?.secret || "" },
            { key: "logged_in_sig", value: json.values.cookies?.["logged-in-sig"] || "" },
            { key: "logged_in_user", value: json.values.cookies?.["logged-in-user"] || "" },
          ],
        };
      } catch (e) {
        return {
          success: false,
          message: `Authentication error: ${(e as Error).message}`,
        };
      }
    },
  },

  async download(context) {
    const { url, rootDirectory, maxDownloadThreads, helpers, logger, settings } = context;

    logger.info(`Starting download for: ${url}`);

    const credentials = loadStoredCredentials(settings);
    if (credentials) {
      logger.info("Using Archive.org credentials");
    } else {
      logger.warn("No credentials stored - downloading without authentication. Use the Authenticate button in settings to login.");
    }

    const outputDir = path.join(rootDirectory, "ArchiveOrg");

    // If already on a /download/ page, go directly to directory download
    if (url.includes("/download/")) {
      logger.info(`URL is already a download page, proceeding directly`);
      return downloadDirectory(url, outputDir, maxDownloadThreads, credentials, context);
    }

    // Extract the item identifier from the URL path and construct the /download/ URL
    // Handles: /details/{identifier}, /details/{identifier}/, and other archive.org paths
    const urlPath = new URL(url).pathname;
    const pathSegments = urlPath.split("/").filter(Boolean);
    const detailsIndex = pathSegments.indexOf("details");

    if (detailsIndex === -1 || detailsIndex + 1 >= pathSegments.length) {
      logger.error(`Could not extract item identifier from URL: ${url}`);
      return {
        success: false,
        message: `Could not extract item identifier from URL: ${url}. Expected a /details/{identifier} URL.`,
      };
    }

    const identifier = pathSegments[detailsIndex + 1];
    const downloadUrl = `https://archive.org/download/${identifier}`;
    logger.info(`Extracted identifier: ${identifier}`);
    logger.info(`Constructed download page: ${downloadUrl}`);

    return downloadDirectory(downloadUrl, outputDir, maxDownloadThreads, credentials, context);
  },
};

export default plugin;
