import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(import.meta.dirname, "..");

test("installed fishmode shim works without PATH in hook-like environment", async () => {
  const home = await mkdtemp(join(tmpdir(), "fishmode-install-"));
  try {
    const install = spawnSync("./install.sh", {
      cwd: repoRoot,
      env: { ...process.env, HOME: home },
      encoding: "utf8",
    });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const configPath = join(home, ".codex-fishmode", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    await writeFile(configPath, `${JSON.stringify({ ...config, enabled: false }, null, 2)}\n`);

    const shim = join(home, ".codex-fishmode", "bin", "fishmode");
    const result = spawnSync(shim, ["event", "start"], {
      env: { HOME: home },
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("installer writes hook commands as executable wrapper paths without shell quoting", async () => {
  const home = await mkdtemp(join(tmpdir(), "fishmode-hooks-"));
  try {
    const install = spawnSync("./install.sh", {
      cwd: repoRoot,
      env: { ...process.env, HOME: home },
      encoding: "utf8",
    });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const hooks = JSON.parse(await readFile(join(home, ".codex", "hooks.json"), "utf8"));
    const startCommand = hooks.hooks.UserPromptSubmit[0].hooks[0].command;
    const stopCommand = hooks.hooks.Stop[0].hooks[0].command;

    assert.equal(startCommand, join(home, ".codex-fishmode", "bin", "fishmode-start"));
    assert.equal(stopCommand, join(home, ".codex-fishmode", "bin", "fishmode-stop"));
    assert.equal(startCommand.includes("'"), false);
    assert.equal(startCommand.includes(" event "), false);

    const result = spawnSync(startCommand, {
      env: { HOME: home },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
