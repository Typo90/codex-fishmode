import { homedir } from "node:os";

import { ensureConfig, getConfigPath, saveConfig, selectSite } from "./config.js";
import * as defaultLauncher from "./launcher.js";

export async function handleEvent(eventName, options = {}) {
  const home = options.home || homedir();
  const configPath = options.configPath || getConfigPath(home);
  const launcher = options.launcher || defaultLauncher;
  const eventArgs = options.eventArgs || [];
  const config = await ensureConfig({ home, path: configPath });
  const openDelayMs = options.openDelayMs ?? config.openDelayMs;

  if (eventName === "start") {
    if (!config.enabled) {
      return { action: "disabled" };
    }

    const { site, nextConfig } = selectSite(config);
    if (!site) {
      return { action: "no-sites" };
    }

    await saveConfig(configPath, nextConfig);
    if (openDelayMs > 0) {
      await launcher.scheduleFishWindowOpen(site.url, openDelayMs, { home });
      return { action: "scheduled", site, delayMs: openDelayMs };
    }

    await launcher.openFishWindow(site.url, { home });
    return { action: "opened", site };
  }

  if (eventName === "open-pending") {
    const token = eventArgs[0] || options.token;
    const delayMs = Number(eventArgs[1] || options.delayMs || 0);
    return launcher.openPendingFishWindow(token, { home, delayMs });
  }

  if (eventName === "permission" || eventName === "stop") {
    await launcher.cancelPendingFishWindowOpen({ home });
    await launcher.returnToCodex(config.codexAppName, { home });
    return { action: "returned", appName: config.codexAppName };
  }

  throw new Error(`Unknown fishmode event: ${eventName}`);
}
