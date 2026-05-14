import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { DEFAULT_CONFIG, saveConfig } from "../companion/cli/lib/config.js";
import { handleEvent } from "../companion/cli/lib/events.js";

async function withHome(fn) {
  const home = await mkdtemp(join(tmpdir(), "fishmode-event-"));
  try {
    await fn(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

test("start event schedules a selected site after the configured delay", async () => {
  await withHome(async (home) => {
    const calls = [];
    const result = await handleEvent("start", {
      home,
      launcher: {
        openFishWindow: async (url) => calls.push(["open", url]),
        scheduleFishWindowOpen: async (url, delayMs) => calls.push(["schedule", url, delayMs]),
        returnToCodex: async () => calls.push(["return"]),
      },
    });

    assert.equal(result.action, "scheduled");
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "schedule");
    assert.match(calls[0][1], /^https:\/\//);
    assert.equal(calls[0][2], 3000);
  });
});

test("disabled mode ignores start events", async () => {
  await withHome(async (home) => {
    await saveConfig(join(home, ".codex-fishmode", "config.json"), {
      ...DEFAULT_CONFIG,
      enabled: false,
    });

    const calls = [];
    const result = await handleEvent("start", {
      home,
      launcher: {
        openFishWindow: async (url) => calls.push(["open", url]),
        scheduleFishWindowOpen: async (url) => calls.push(["schedule", url]),
        returnToCodex: async () => calls.push(["return"]),
      },
    });

    assert.equal(result.action, "disabled");
    assert.deepEqual(calls, []);
  });
});

test("permission and stop events return attention to Codex", async () => {
  await withHome(async (home) => {
    const calls = [];
    const launcher = {
      openFishWindow: async (url) => calls.push(["open", url]),
      scheduleFishWindowOpen: async (url) => calls.push(["schedule", url]),
      cancelPendingFishWindowOpen: async () => calls.push(["cancel"]),
      returnToCodex: async (appName) => calls.push(["return", appName]),
    };

    assert.equal((await handleEvent("permission", { home, launcher })).action, "returned");
    assert.equal((await handleEvent("stop", { home, launcher })).action, "returned");
    assert.deepEqual(calls, [
      ["cancel"],
      ["return", "Codex"],
      ["cancel"],
      ["return", "Codex"],
    ]);
  });
});

test("zero open delay keeps immediate opening available", async () => {
  await withHome(async (home) => {
    await saveConfig(join(home, ".codex-fishmode", "config.json"), {
      ...DEFAULT_CONFIG,
      openDelayMs: 0,
    });

    const calls = [];
    const result = await handleEvent("start", {
      home,
      launcher: {
        openFishWindow: async (url) => calls.push(["open", url]),
        scheduleFishWindowOpen: async (url) => calls.push(["schedule", url]),
        returnToCodex: async () => calls.push(["return"]),
      },
    });

    assert.equal(result.action, "opened");
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "open");
  });
});
