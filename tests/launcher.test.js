import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  cancelPendingFishWindowOpen,
  createBrowserLaunchPlan,
  createMacRestorePlan,
  createFocusPlan,
  createLinuxBrowserCandidates,
  createMacBrowserCandidates,
  createWindowsBrowserCandidates,
  getPendingOpenPath,
  openPendingFishWindow,
} from "../companion/cli/lib/launcher.js";

async function withHome(fn) {
  const home = await mkdtemp(join(tmpdir(), "fishmode-launcher-"));
  try {
    await fn(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

test("macOS browser launcher prefers Chrome app window arguments", () => {
  const plan = createBrowserLaunchPlan("https://x.com", {
    platform: "darwin",
    browserPath: "/Applications/Google Chrome.app",
  });

  assert.deepEqual(plan.command, "open");
  assert.deepEqual(plan.args, [
    "-n",
    "-a",
    "/Applications/Google Chrome.app",
    "--args",
    "--app=https://x.com",
    "--window-size=440,720",
  ]);
});

test("Windows browser launcher uses browser executable app mode", () => {
  const plan = createBrowserLaunchPlan("https://www.youtube.com", {
    platform: "win32",
    browserPath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });

  assert.equal(plan.command, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
  assert.deepEqual(plan.args, [
    "--app=https://www.youtube.com",
    "--window-size=440,720",
  ]);
});

test("Linux browser launcher uses app mode when chromium browser exists", () => {
  const plan = createBrowserLaunchPlan("https://www.tiktok.com", {
    platform: "linux",
    browserPath: "google-chrome",
  });

  assert.equal(plan.command, "google-chrome");
  assert.deepEqual(plan.args, [
    "--app=https://www.tiktok.com",
    "--window-size=440,720",
  ]);
});

test("macOS restore plan focuses an existing browser window by active tab URL", () => {
  const plan = createMacRestorePlan("https://www.xiaohongshu.com/explore", "/Applications/Google Chrome.app");

  assert.equal(plan.command, "osascript");
  assert.equal(plan.args[0], "-e");
  assert.match(plan.args[1], /Google Chrome/);
  assert.match(plan.args[1], /xiaohongshu/);
  assert.match(plan.args[1], /set index of win to 1/);
});

test("browser candidate lists include common app-window capable browsers", () => {
  assert.equal(createMacBrowserCandidates().some((item) => item.includes("Chrome")), true);
  assert.equal(
    createWindowsBrowserCandidates({
      PROGRAMFILES: "C:\\Program Files",
      "PROGRAMFILES(X86)": "C:\\Program Files (x86)",
      LOCALAPPDATA: "C:\\Users\\Ada\\AppData\\Local",
    }).some((item) => item.includes("msedge")),
    true,
  );
  assert.equal(createLinuxBrowserCandidates().includes("chromium"), true);
});

test("focus plans are platform specific and non-empty", () => {
  assert.equal(createFocusPlan("Codex", "darwin").command, "osascript");
  assert.equal(createFocusPlan("Codex", "win32").command, "powershell.exe");
  assert.equal(createFocusPlan("Codex", "linux").command, "sh");
});

test("pending fish window opens only when its token is still current", async () => {
  await withHome(async (home) => {
    const pendingPath = getPendingOpenPath(home);
    await mkdir(dirname(pendingPath), { recursive: true });
    await writeFile(
      pendingPath,
      `${JSON.stringify({ token: "current", url: "https://www.youtube.com" }, null, 2)}\n`,
      "utf8",
    );

    const calls = [];
    const result = await openPendingFishWindow("current", {
      home,
      delayMs: 10,
      sleep: async (ms) => calls.push(["sleep", ms]),
      opener: async (url) => calls.push(["open", url]),
    });

    assert.equal(result.action, "opened");
    assert.deepEqual(calls, [
      ["sleep", 10],
      ["open", "https://www.youtube.com"],
    ]);
    await assert.rejects(readFile(pendingPath, "utf8"));
  });
});

test("canceling pending fish window prevents delayed open", async () => {
  await withHome(async (home) => {
    const pendingPath = getPendingOpenPath(home);
    await mkdir(dirname(pendingPath), { recursive: true });
    await writeFile(
      pendingPath,
      `${JSON.stringify({ token: "old", url: "https://x.com" }, null, 2)}\n`,
      "utf8",
    );

    await cancelPendingFishWindowOpen({ home });

    const calls = [];
    const result = await openPendingFishWindow("old", {
      home,
      sleep: async () => calls.push(["sleep"]),
      opener: async (url) => calls.push(["open", url]),
    });

    assert.equal(result.action, "canceled");
    assert.deepEqual(calls, [["sleep"]]);
  });
});
