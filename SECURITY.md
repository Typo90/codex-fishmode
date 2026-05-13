# Security Policy

## Supported Versions

This project is an early prototype. Security fixes target the latest `main` branch until versioned releases exist.

## Reporting a Vulnerability

Please do not open a public issue for a vulnerability.

Instead, contact the maintainers through GitHub Security Advisories after the repository is published, or use the maintainer contact listed in the repository.

Include:

- Affected version or commit
- Operating system
- Reproduction steps
- Expected impact
- Any suggested mitigation

## Security Model

Codex Fishmode:

- Runs local hook commands configured in `~/.codex/hooks.json`.
- Opens user-configured URLs in the user's browser.
- Stores config locally in `~/.codex-fishmode/config.json`.
- Does not proxy traffic.
- Does not collect telemetry.

Treat custom URLs as user-controlled input. Avoid adding behavior that executes page content outside the browser sandbox.
