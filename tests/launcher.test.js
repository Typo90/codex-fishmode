import assert from "node:assert/strict";
import test from "node:test";

import {
  createBrowserLaunchPlan,
  createFocusPlan,
  createLinuxBrowserCandidates,
  createMacBrowserCandidates,
  createWindowsBrowserCandidates,
} from "../companion/cli/lib/launcher.js";

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
    "--new-window",
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
    "--new-window",
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
    "--new-window",
  ]);
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
