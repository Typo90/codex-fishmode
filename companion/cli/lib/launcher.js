import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { homedir, platform } from "node:os";
import { spawn } from "node:child_process";

import { CONFIG_DIR_NAME } from "./config.js";

function runDetached(command, args, options = {}) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    shell: false,
    ...options,
  });
  child.unref();
}

async function runForeground(command, args, options = {}) {
  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      shell: false,
      ...options,
    });
    return await new Promise((resolve) => child.on("close", resolve));
  } catch {
    return 1;
  }
}

async function executableExists(path) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function getRuntimeStatePath(home = homedir()) {
  return join(home, CONFIG_DIR_NAME, "state.json");
}

export async function writeRuntimeState(state, home = homedir()) {
  const path = getRuntimeStatePath(home);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return path;
}

export async function openFishWindow(url, { home = homedir() } = {}) {
  await writeRuntimeState({ visible: true, url, updatedAt: new Date().toISOString() }, home);
  const browserPath = process.env.FISHMODE_BROWSER || (await findBrowserPath(platform()));

  if (browserPath) {
    if (await restoreExistingFishWindow(url, { browserPath, platform: platform() })) {
      return { method: "restored-browser-app-window", url, browserPath };
    }

    const plan = createBrowserLaunchPlan(url, { platform: platform(), browserPath });
    runDetached(plan.command, plan.args, plan.options);
    return { method: "browser-app-window", url, browserPath };
  }

  const plan = createDefaultBrowserPlan(url, platform());
  runDetached(plan.command, plan.args, plan.options);
  return { method: "default-browser", url };
}

export async function returnToCodex(appName = "Codex", { home = homedir() } = {}) {
  await writeRuntimeState({ visible: false, returnTo: appName, updatedAt: new Date().toISOString() }, home);
  const plan = createFocusPlan(appName, platform());
  runDetached(plan.command, plan.args, plan.options);
  return { method: plan.method, appName };
}

export function createBrowserLaunchPlan(url, { platform: os = platform(), browserPath }) {
  const appArgs = [`--app=${url}`, "--window-size=440,720"];

  if (os === "darwin") {
    return {
      command: "open",
      args: ["-n", "-a", browserPath, "--args", ...appArgs],
      method: "mac-browser-app-window",
    };
  }

  return {
    command: browserPath,
    args: appArgs,
    method: `${os}-browser-app-window`,
    options: os === "win32" ? { windowsHide: true } : undefined,
  };
}

export async function restoreExistingFishWindow(url, { browserPath, platform: os = platform() }) {
  if (os !== "darwin") return false;
  const plan = createMacRestorePlan(url, browserPath);
  return (await runForeground(plan.command, plan.args, plan.options)) === 0;
}

export function createMacRestorePlan(url, browserPath) {
  const appName = createMacBrowserAppName(browserPath);
  const prefix = createUrlMatchPrefix(url);
  const script = `
tell application "${escapeAppleScriptString(appName)}"
  repeat with win in windows
    try
      if (URL of active tab of win) starts with "${escapeAppleScriptString(prefix)}" then
        set index of win to 1
        activate
        return
      end if
    end try
  end repeat
end tell
error "No Fishmode window for ${escapeAppleScriptString(prefix)}"
`;

  return {
    command: "osascript",
    args: ["-e", script],
    method: "mac-restore-browser-window",
  };
}

export function createDefaultBrowserPlan(url, os = platform()) {
  if (os === "darwin") {
    return { command: "open", args: [url], method: "mac-default-browser" };
  }
  if (os === "win32") {
    return {
      command: "cmd.exe",
      args: ["/c", "start", "", url],
      method: "windows-default-browser",
      options: { windowsHide: true },
    };
  }
  return { command: "xdg-open", args: [url], method: "linux-default-browser" };
}

export function createFocusPlan(appName = "Codex", os = platform()) {
  if (os === "darwin") {
    return {
      command: "osascript",
      args: ["-e", `tell application "${appName}" to activate`],
      method: "osascript",
    };
  }

  if (os === "win32") {
    return {
      command: "powershell.exe",
      args: [
      "-NoProfile",
      "-WindowStyle",
      "Hidden",
      "-Command",
      `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate('${appName}')`,
      ],
      method: "powershell",
      options: { windowsHide: true },
    };
  }

  return {
    command: "sh",
    args: [
      "-lc",
      `command -v wmctrl >/dev/null && wmctrl -a '${appName}' || command -v notify-send >/dev/null && notify-send 'Codex needs attention'`,
    ],
    method: "linux-fallback",
  };
}

export async function findBrowserPath(os = platform()) {
  if (os === "darwin") {
    return findFirstExisting(createMacBrowserCandidates());
  }
  if (os === "win32") {
    return findFirstExisting(createWindowsBrowserCandidates());
  }
  return findFirstCommand(createLinuxBrowserCandidates());
}

export function createMacBrowserCandidates() {
  return [
    "/Applications/Google Chrome.app",
    "/Applications/Microsoft Edge.app",
    "/Applications/Brave Browser.app",
    "/Applications/Chromium.app",
  ];
}

export function createWindowsBrowserCandidates(env = process.env) {
  const roots = [
    env.PROGRAMFILES,
    env["PROGRAMFILES(X86)"],
    env.LOCALAPPDATA,
  ].filter(Boolean);

  return roots.flatMap((root) => [
    join(root, "Google", "Chrome", "Application", "chrome.exe"),
    join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
    join(root, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
  ]);
}

export function createLinuxBrowserCandidates() {
  return ["google-chrome", "microsoft-edge", "brave-browser", "chromium", "chromium-browser"];
}

function createMacBrowserAppName(browserPath) {
  const name = browserPath.split("/").pop() || browserPath;
  return name.replace(/\.app$/i, "");
}

function createUrlMatchPrefix(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function escapeAppleScriptString(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function findFirstExisting(candidates) {
  for (const candidate of candidates) {
    if (await executableExists(candidate)) return candidate;
  }
  return null;
}

async function findFirstCommand(candidates) {
  for (const candidate of candidates) {
    try {
      const command = spawn("sh", ["-lc", `command -v ${candidate}`], {
        stdio: "ignore",
      });
      const exitCode = await new Promise((resolve) => command.on("close", resolve));
      if (exitCode === 0) return candidate;
    } catch {
      // Keep checking candidates.
    }
  }
  return null;
}
