# Contributing to Codex Fishmode

Thanks for helping improve Codex Fishmode.

## Development Setup

```sh
git clone https://github.com/OWNER/codex-fishmode.git
cd codex-fishmode
npm test
```

Local install from checkout:

```sh
./install.sh
```

## Pull Request Checklist

- Keep changes focused.
- Add or update tests for behavior changes.
- Run `npm test`.
- Update README or translated docs when commands or behavior change.
- Avoid committing local config, caches, or screenshots unless they are intentional docs assets.

## Project Principles

- Easy install beats perfect architecture.
- Prefer the user's existing browser and login state.
- Keep hooks deterministic and fast.
- Store config locally.
- Avoid telemetry by default.

## Reporting Bugs

Please include:

- Operating system
- Browser used by Fishmode
- Codex CLI/App version
- `fishmode status` output with private URLs removed
- Steps to reproduce

## Feature Requests

Describe the workflow, expected behavior, and why the current commands are not enough.
