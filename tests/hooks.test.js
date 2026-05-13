import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("plugin hooks map Codex lifecycle events to fishmode events", async () => {
  const hooks = JSON.parse(await readFile("plugins/fishmode/hooks/hooks.json", "utf8"));

  assert.match(
    hooks.hooks.UserPromptSubmit[0].hooks[0].command,
    /fishmode event start/,
  );
  assert.match(
    hooks.hooks.PermissionRequest[0].hooks[0].command,
    /fishmode event permission/,
  );
  assert.match(hooks.hooks.Stop[0].hooks[0].command, /fishmode event stop/);
});
