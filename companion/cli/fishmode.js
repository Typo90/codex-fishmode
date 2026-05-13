#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { stdin as input, stdout as output } from "node:process";

import {
  DEFAULT_CONFIG,
  ensureConfig,
  getConfigPath,
  loadConfig,
  saveConfig,
} from "./lib/config.js";
import { handleEvent } from "./lib/events.js";

const [command, subcommand, ...rest] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "event":
      await handleEvent(subcommand);
      break;
    case "on":
      await updateEnabled(true);
      console.log("Fishmode enabled.");
      break;
    case "off":
      await updateEnabled(false);
      console.log("Fishmode disabled.");
      break;
    case "status":
      await printStatus();
      break;
    case "config":
      await configure();
      break;
    case "test":
      await handleEvent("start");
      setTimeout(async () => {
        await handleEvent("stop");
      }, Number(rest[0] || 1200));
      break;
    case "uninstall":
      await uninstall();
      console.log("Fishmode hooks and installed files removed.");
      break;
    case undefined:
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

async function updateEnabled(enabled) {
  const config = await ensureConfig();
  await saveConfig(getConfigPath(), { ...config, enabled });
}

async function printStatus() {
  const config = await ensureConfig();
  console.log(JSON.stringify(config, null, 2));
}

async function configure() {
  const prompt = await createPrompt();
  const existing = await ensureConfig();
  console.log("Choose the page Fishmode should open by default:");
  existing.sites.forEach((site, index) => {
    const marker = site.url === existing.activeSite ? "*" : " ";
    console.log(`${marker} ${index + 1}. ${site.name} - ${site.url}`);
  });
  console.log("  A. Add a new page");

  const choice = await prompt.question(`Default page [${siteIndexFor(existing.activeSite, existing.sites) + 1}]: `);
  let sites = existing.sites;
  let activeSite = existing.activeSite;

  if (/^a$/i.test(choice.trim())) {
    const url = await prompt.question("New page URL: ");
    const nameAnswer = await prompt.question("Display name (optional): ");
    const normalizedUrl = normalizeUrl(url.trim());
    const name = nameAnswer.trim() || normalizedUrl.replace(/^https?:\/\//, "");
    sites = [...sites, { name, url: normalizedUrl, enabled: true }];
    activeSite = normalizedUrl;
  } else if (choice.trim()) {
    const index = Number(choice.trim()) - 1;
    if (Number.isInteger(index) && sites[index]) {
      activeSite = sites[index].url;
    }
  }

  const enabledAnswer = await prompt.question(`Enable Fishmode? [Y/n] `);
  prompt.close();

  const config = await saveConfig(getConfigPath(), {
    ...existing,
    enabled: !/^n/i.test(enabledAnswer.trim()),
    activeSite,
    sites,
  });

  console.log(`Saved Fishmode config to ${getConfigPath()}`);
  console.log(`Enabled: ${config.enabled}`);
  console.log(`Default page: ${config.sites.find((site) => site.url === config.activeSite)?.name || config.activeSite}`);
}

function printHelp() {
  console.log(`fishmode commands:
  fishmode event <start|permission|stop>
  fishmode on
  fishmode off
  fishmode status
  fishmode config
  fishmode test [return-delay-ms]
  fishmode uninstall`);
}

async function createPrompt() {
  if (input.isTTY) {
    const rl = createInterface({ input, output });
    return {
      question: (question) => rl.question(question),
      close: () => rl.close(),
    };
  }

  const chunks = [];
  for await (const chunk of input) chunks.push(chunk);
  const answers = Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
  return {
    question: async (question) => {
      output.write(question);
      const answer = answers.shift() || "";
      output.write(`${answer}\n`);
      return answer;
    },
    close: () => {},
  };
}

async function uninstall() {
  const hooksPath = join(homedir(), ".codex", "hooks.json");
  let hooks = { hooks: {} };
  try {
    hooks = JSON.parse(await readFile(hooksPath, "utf8"));
  } catch {
    // Nothing to clean.
  }

  if (hooks.hooks) {
    for (const eventName of Object.keys(hooks.hooks)) {
      hooks.hooks[eventName] = hooks.hooks[eventName]
        .map((matcher) => ({
          ...matcher,
          hooks: (matcher.hooks || []).filter((hook) => !isFishmodeHookCommand(hook.command)),
        }))
        .filter((matcher) => matcher.hooks.length);
      if (!hooks.hooks[eventName].length) delete hooks.hooks[eventName];
    }
    await writeFile(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`, "utf8");
  }

  const installRoot = dirname(dirname(fileURLToPathSafe(import.meta.url)));
  if (installRoot.endsWith(".codex-fishmode")) {
    await rm(installRoot, { recursive: true, force: true });
  }
}

function fileURLToPathSafe(url) {
  return new URL(url).pathname;
}

function isFishmodeHookCommand(command) {
  const value = String(command || "");
  return value.includes("fishmode event") || value.includes(".codex-fishmode/bin/fishmode");
}

function siteIndexFor(url, sites) {
  const index = sites.findIndex((site) => site.url === url);
  return index === -1 ? 0 : index;
}

function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
