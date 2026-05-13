#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const installRoot = join(homedir(), ".codex-fishmode");
const cliRoot = join(installRoot, "cli");
const binRoot = join(installRoot, "bin");
const marketplaceRoot = join(installRoot, "marketplace");
const pluginRoot = join(marketplaceRoot, "plugins", "fishmode");
const hooksPath = join(homedir(), ".codex", "hooks.json");
const uninstall = process.argv.includes("--uninstall");

if (uninstall) {
  await uninstallFishmode();
} else {
  await installFishmode();
}

async function installFishmode() {
  await mkdir(binRoot, { recursive: true });
  await mkdir(dirname(hooksPath), { recursive: true });
  await rm(cliRoot, { recursive: true, force: true });
  await rm(pluginRoot, { recursive: true, force: true });

  await cp(join(repoRoot, "companion", "cli"), cliRoot, { recursive: true });
  await cp(join(repoRoot, "plugins", "fishmode"), pluginRoot, { recursive: true });

  await writeShim();
  await writeMarketplace();
  await writeHooks();
  await ensureDefaultConfig();
  registerMarketplace();

  console.log(`Codex Fishmode installed at ${installRoot}`);
  console.log(`Add ${binRoot} to PATH if the fishmode command is not found.`);
  console.log("Run `fishmode config` to customize sites.");
}

async function uninstallFishmode() {
  await removeHooks();
  await rm(installRoot, { recursive: true, force: true });
  console.log("Codex Fishmode hooks and installed files removed.");
}

async function writeShim() {
  const entry = join(cliRoot, "fishmode.js");
  const nodePath = process.execPath;
  const shim = join(binRoot, "fishmode");
  await writeFile(shim, `#!/usr/bin/env sh\nexec "${nodePath}" "${entry}" "$@"\n`, {
    mode: 0o755,
  });

  for (const eventName of ["start", "permission", "stop"]) {
    await writeFile(
      join(binRoot, `fishmode-${eventName}`),
      `#!/usr/bin/env sh\nexec "${nodePath}" "${entry}" event ${eventName}\n`,
      { mode: 0o755 },
    );
  }

  if (platform() === "win32") {
    await writeFile(join(binRoot, "fishmode.cmd"), `@echo off\r\n"${nodePath}" "${entry}" %*\r\n`, "utf8");
    for (const eventName of ["start", "permission", "stop"]) {
      await writeFile(
        join(binRoot, `fishmode-${eventName}.cmd`),
        `@echo off\r\n"${nodePath}" "${entry}" event ${eventName}\r\n`,
        "utf8",
      );
    }
  }
}

async function writeMarketplace() {
  const path = join(marketplaceRoot, ".agents", "plugins", "marketplace.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify(
      {
        name: "codex-fishmode-marketplace",
        interface: { displayName: "Codex Fishmode" },
        plugins: [
          {
            name: "codex-fishmode",
            source: { source: "local", path: "./plugins/fishmode" },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "Productivity",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function writeHooks() {
  const hooks = await readHooks();
  hooks.hooks = hooks.hooks || {};

  upsertEvent(hooks, "UserPromptSubmit", "start");
  upsertEvent(hooks, "PermissionRequest", "permission");
  upsertEvent(hooks, "Stop", "stop");

  await writeFile(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`, "utf8");
}

async function removeHooks() {
  const hooks = await readHooks();
  if (!hooks.hooks) return;

  for (const eventName of Object.keys(hooks.hooks)) {
    hooks.hooks[eventName] = hooks.hooks[eventName]
      .map((matcher) => ({
        ...matcher,
        hooks: (matcher.hooks || []).filter((hook) => !isFishmodeHookCommand(hook.command)),
      }))
      .filter((matcher) => matcher.hooks.length);
    if (!hooks.hooks[eventName].length) delete hooks.hooks[eventName];
  }

  await mkdir(dirname(hooksPath), { recursive: true });
  await writeFile(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`, "utf8");
}

async function readHooks() {
  try {
    return JSON.parse(await readFile(hooksPath, "utf8"));
  } catch {
    return { hooks: {} };
  }
}

function upsertEvent(hooks, eventName, fishmodeEvent) {
  const command = join(binRoot, platform() === "win32" ? `fishmode-${fishmodeEvent}.cmd` : `fishmode-${fishmodeEvent}`);
  const statusMessage = fishmodeEvent === "start" ? "Opening Fishmode" : "Returning to Codex";
  const existing = hooks.hooks[eventName] || [];
  const withoutFishmode = existing
    .map((matcher) => ({
      ...matcher,
      hooks: (matcher.hooks || []).filter((hook) => !isFishmodeHookCommand(hook.command)),
    }))
    .filter((matcher) => matcher.hooks.length);

  hooks.hooks[eventName] = [
    ...withoutFishmode,
    {
      hooks: [
        {
          type: "command",
          command,
          timeout: 15,
          statusMessage,
        },
      ],
    },
  ];
}

async function ensureDefaultConfig() {
  const configPath = join(installRoot, "config.json");
  if (existsSync(configPath)) return;

  await writeFile(
    configPath,
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function registerMarketplace() {
  const result = spawnSync("codex", ["plugin", "marketplace", "add", marketplaceRoot], {
    stdio: "inherit",
  });
  if (result.error) {
    console.warn("Could not register Codex marketplace automatically. Add it manually with:");
    console.warn(`codex plugin marketplace add ${marketplaceRoot}`);
  }
}

function isFishmodeHookCommand(command) {
  const value = String(command || "");
  return value.includes("fishmode event") || value.includes(".codex-fishmode/bin/fishmode");
}
