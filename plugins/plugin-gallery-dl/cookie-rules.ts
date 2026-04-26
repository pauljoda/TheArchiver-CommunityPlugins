import type { PluginLogger, PluginSettingsAccessor } from "./plugin-api";

function getSetting(settings: PluginSettingsAccessor, key: string): string {
  const raw = settings.get(key);
  if (!raw || raw === "null" || raw === "undefined" || raw === "none") return "";
  return String(raw).trim();
}

function hostnameMatchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith("." + domain);
}

export function resolveCookieFileForUrl(
  settings: PluginSettingsAccessor,
  url: string,
  logger?: Pick<PluginLogger, "warn">
): string {
  const globalCookiesFile = getSetting(settings, "cookies_file");
  const rawSiteCookies = getSetting(settings, "site_cookies");
  if (!rawSiteCookies) return globalCookiesFile;

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return globalCookiesFile;
  }

  let siteCookies: Record<string, unknown>;
  try {
    siteCookies = JSON.parse(rawSiteCookies);
  } catch {
    logger?.warn("site_cookies setting is not valid JSON, using global cookies file");
    return globalCookiesFile;
  }

  const matchingRule = Object.entries(siteCookies)
    .map(([domain, cookiesFile]) => ({
      domain: domain.trim().toLowerCase(),
      cookiesFile: typeof cookiesFile === "string" ? cookiesFile.trim() : "",
    }))
    .filter((rule) => rule.domain && rule.cookiesFile)
    .sort((a, b) => b.domain.length - a.domain.length)
    .find((rule) => hostnameMatchesDomain(hostname, rule.domain));

  return matchingRule?.cookiesFile || globalCookiesFile;
}
