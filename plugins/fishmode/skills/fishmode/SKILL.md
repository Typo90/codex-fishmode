---
name: fishmode
description: Use when the user asks to configure, test, enable, disable, or troubleshoot Codex Fishmode.
---

# Codex Fishmode

Codex Fishmode opens a configurable browser app-window while Codex is working and returns attention to Codex when the user is needed.

## Commands

- Enable: `fishmode on`
- Disable: `fishmode off`
- Configure onboarding: `fishmode config`
- Print current config: `fishmode status`
- Test open and return behavior: `fishmode test`

## Behavior

- User prompt submitted: run `fishmode event start`
- Permission requested: run `fishmode event permission`
- Turn stopped: run `fishmode event stop`

If hooks are unavailable, follow the same behavior manually at the matching moments.
