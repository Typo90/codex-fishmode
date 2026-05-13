import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  DEFAULT_CONFIG,
  ensureConfig,
  loadConfig,
  saveConfig,
  selectSite,
} from "../companion/cli/lib/config.js";

async function withHome(fn) {
  const home = await mkdtemp(join(tmpdir(), "fishmode-test-"));
  try {
    await fn(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

test("ensureConfig creates defaults in the requested home directory", async () => {
  await withHome(async (home) => {
    const config = await ensureConfig({ home });

    assert.equal(config.enabled, true);
    assert.equal(config.mode, "random");
    assert.equal(config.activeSite, DEFAULT_CONFIG.sites[1].url);
    assert.equal(config.sites.length, DEFAULT_CONFIG.sites.length);

    const raw = JSON.parse(
      await readFile(join(home, ".codex-fishmode", "config.json"), "utf8"),
    );
    assert.equal(raw.codexAppName, "Codex");
  });
});

test("loadConfig repairs malformed JSON with safe defaults", async () => {
  await withHome(async (home) => {
    await writeFile(join(home, "broken.json"), "{ nope", "utf8");

    const config = await loadConfig(join(home, "broken.json"));

    assert.equal(config.enabled, true);
    assert.equal(config.sites.some((site) => site.name === "YouTube"), true);
  });
});

test("saveConfig preserves custom sites and disabled state", async () => {
  await withHome(async (home) => {
    const path = join(home, "config.json");
    await saveConfig(path, {
      ...DEFAULT_CONFIG,
      enabled: false,
      sites: [
        ...DEFAULT_CONFIG.sites,
        { name: "Docs", url: "https://developers.openai.com", enabled: true },
      ],
    });

    const config = await loadConfig(path);

    assert.equal(config.enabled, false);
    assert.equal(config.sites.at(-1).name, "Docs");
  });
});

test("selectSite supports fixed and round_robin modes", async () => {
  const fixed = selectSite({
    ...DEFAULT_CONFIG,
    activeSite: "https://missing.example",
    mode: "fixed",
    lastSite: "YouTube",
  });
  assert.equal(fixed.site.name, DEFAULT_CONFIG.sites[0].name);

  const roundRobin = selectSite({
    ...DEFAULT_CONFIG,
    activeSite: "https://missing.example",
    mode: "round_robin",
    lastSite: DEFAULT_CONFIG.sites[0].url,
  });
  assert.equal(roundRobin.site.url, DEFAULT_CONFIG.sites[1].url);
  assert.equal(roundRobin.nextConfig.lastSite, DEFAULT_CONFIG.sites[1].url);
});

test("selectSite prefers the active site when one is configured", async () => {
  const selected = selectSite({
    ...DEFAULT_CONFIG,
    activeSite: DEFAULT_CONFIG.sites[2].url,
    mode: "random",
  });

  assert.equal(selected.site.url, DEFAULT_CONFIG.sites[2].url);
  assert.equal(selected.nextConfig.lastSite, DEFAULT_CONFIG.sites[2].url);
});
