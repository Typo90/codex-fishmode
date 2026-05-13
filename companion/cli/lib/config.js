import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const CONFIG_DIR_NAME = ".codex-fishmode";
export const CONFIG_FILE_NAME = "config.json";

export const DEFAULT_CONFIG = {
  enabled: true,
  mode: "random",
  activeSite: "https://www.youtube.com",
  lastSite: null,
  codexAppName: "Codex",
  sites: [
    { name: "X / Twitter", url: "https://x.com", enabled: true },
    { name: "YouTube", url: "https://www.youtube.com", enabled: true },
    { name: "TikTok", url: "https://www.tiktok.com", enabled: true },
    { name: "Instagram", url: "https://www.instagram.com", enabled: true },
    { name: "Facebook", url: "https://www.facebook.com", enabled: true },
    { name: "Rednote", url: "https://www.xiaohongshu.com", enabled: true },
  ],
};

export function getConfigPath(home = homedir()) {
  return join(home, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
}

export function normalizeConfig(value = {}) {
  const mode = ["random", "round_robin", "fixed"].includes(value.mode)
    ? value.mode
    : DEFAULT_CONFIG.mode;
  const sites = Array.isArray(value.sites)
    ? value.sites
        .filter((site) => site && typeof site.url === "string")
        .map((site) => ({
          name: typeof site.name === "string" && site.name.trim() ? site.name : site.url,
          url: site.url,
          enabled: site.enabled !== false,
        }))
    : DEFAULT_CONFIG.sites;

  return {
    enabled: value.enabled !== false,
    mode,
    activeSite:
      typeof value.activeSite === "string" && value.activeSite.trim()
        ? value.activeSite
        : DEFAULT_CONFIG.activeSite,
    lastSite: typeof value.lastSite === "string" ? value.lastSite : null,
    codexAppName:
      typeof value.codexAppName === "string" && value.codexAppName.trim()
        ? value.codexAppName
        : DEFAULT_CONFIG.codexAppName,
    sites: sites.length ? sites : DEFAULT_CONFIG.sites,
  };
}

export async function loadConfig(path = getConfigPath()) {
  try {
    return normalizeConfig(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return normalizeConfig(DEFAULT_CONFIG);
  }
}

export async function saveConfig(path = getConfigPath(), config = DEFAULT_CONFIG) {
  const normalized = normalizeConfig(config);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export async function ensureConfig({ home = homedir(), path = getConfigPath(home) } = {}) {
  try {
    const existing = await readFile(path, "utf8");
    const config = normalizeConfig(JSON.parse(existing));
    await saveConfig(path, config);
    return config;
  } catch {
    return saveConfig(path, DEFAULT_CONFIG);
  }
}

export function selectSite(config, random = Math.random) {
  const normalized = normalizeConfig(config);
  const enabledSites = normalized.sites.filter((site) => site.enabled);
  if (!enabledSites.length) {
    return { site: null, nextConfig: normalized };
  }

  const activeSite = enabledSites.find((site) => site.url === normalized.activeSite);
  if (activeSite) {
    return { site: activeSite, nextConfig: { ...normalized, lastSite: activeSite.url } };
  }

  if (config.mode === "fixed") {
    const site = enabledSites[0];
    return { site, nextConfig: { ...normalized, lastSite: site.url } };
  }

  if (config.mode === "round_robin") {
    const currentIndex = enabledSites.findIndex((site) => site.url === config.lastSite);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabledSites.length;
    const site = enabledSites[nextIndex];
    return { site, nextConfig: { ...normalized, lastSite: site.url } };
  }

  const site = enabledSites[Math.floor(random() * enabledSites.length)];
  return { site, nextConfig: { ...normalized, lastSite: site.url } };
}
