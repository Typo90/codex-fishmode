# Codex Fishmode

[English](README.md) | [简体中文](docs/README.zh-CN.md) | [日本語](docs/README.ja.md) | [Español](docs/README.es.md)

Codex Fishmode is a lightweight Codex plugin that opens a small browser app-window while Codex works, then returns focus to Codex when a permission prompt appears or the turn finishes.

The first version intentionally uses the user's existing browser instead of a bundled WebView. That keeps installation small, preserves browser login sessions, and avoids platform-specific binary releases.

## Highlights

- Automatic Codex lifecycle hooks.
- Small browser app-window via Chrome, Edge, Brave, or Chromium.
- Falls back to the system default browser.
- Simple default-page onboarding with `fishmode config`.
- Local-only config, no telemetry, no proxying.
- Open-source plugin structure ready for Codex marketplaces.

## Quick Start

From a cloned checkout:

```sh
./install.sh
export PATH="$HOME/.codex-fishmode/bin:$PATH"
fishmode config
fishmode test
```

Windows PowerShell:

```powershell
.\install.ps1
fishmode config
fishmode test
```

GitHub raw install, after replacing the repository URL in the install scripts:

```sh
curl -fsSL https://raw.githubusercontent.com/OWNER/codex-fishmode/main/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/OWNER/codex-fishmode/main/install.ps1 | iex
```

## Usage

```sh
fishmode on
fishmode off
fishmode status
fishmode config
fishmode test
fishmode uninstall
```

`fishmode config` lets users choose the default page or add a new page. `fishmode test` opens the selected page and then returns to Codex after a short delay.

## How It Works

Codex Fishmode registers user-level Codex hooks:

| Codex event | Fishmode command | Effect |
| --- | --- | --- |
| `UserPromptSubmit` | `fishmode event start` | Open the selected page |
| `PermissionRequest` | `fishmode event permission` | Return focus to Codex |
| `Stop` | `fishmode event stop` | Return focus to Codex |

The browser launcher prefers app-window capable browsers:

- macOS: Google Chrome, Microsoft Edge, Brave, Chromium
- Windows: Chrome, Edge, Brave
- Linux: Chrome, Edge, Brave, Chromium

If none are found, Fishmode opens the URL in the system default browser.

## Configuration

Config lives at:

```text
~/.codex-fishmode/config.json
```

Example:

```json
{
  "enabled": true,
  "mode": "random",
  "activeSite": "https://www.youtube.com",
  "lastSite": null,
  "codexAppName": "Codex",
  "sites": [
    { "name": "YouTube", "url": "https://www.youtube.com", "enabled": true }
  ]
}
```

User-level Codex hooks are registered in:

```text
~/.codex/hooks.json
```

## Repository Layout

```text
plugins/fishmode/      Codex plugin manifest, hooks, skill, and assets
companion/cli/         Fishmode CLI, config logic, events, browser launcher
scripts/install.mjs    Cross-platform installer core
install.sh             macOS/Linux installer wrapper
install.ps1            Windows installer wrapper
tests/                 Node test suite
```

## Development

Requirements:

- Node.js 22 or newer
- Codex CLI/App for real hook testing

Run tests:

```sh
npm test
```

Install locally from checkout:

```sh
./install.sh
```

Uninstall:

```sh
fishmode uninstall
```

## Roadmap

- Publish real GitHub install URLs.
- Add signed release artifacts if the project later needs a native companion.
- Add browser-window positioning controls.
- Add richer onboarding UI.
- Add Codex plugin hook-only mode once plugin hooks are broadly stable.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## Privacy

Fishmode stores config locally and does not collect telemetry. See [PRIVACY.md](PRIVACY.md).

## License

MIT
