# Retone Privacy Policy

_Last updated: 2026-07-07_

Retone is a local-first browser extension. **The developer does not collect, store, or transmit any of your data. There are no developer-operated servers, no analytics, and no telemetry.**

## What data is processed, and where it goes

- **Your draft text**: when you click "다듬기" (Refine), the draft you wrote in the X/Threads compose box is sent to the **Retone helper running on your own machine** (`127.0.0.1`). The helper forwards it **only to the AI provider you selected** — either through the official `claude` / `codex` CLI installed on your machine (your own subscription) or directly to the Anthropic / OpenAI / Google API using API keys you provided. Processing by those providers is governed by their respective terms and privacy policies.
- **Settings and presets**: stored locally in your browser via `chrome.storage.local`. Never synced or uploaded.
- **API keys**: stored only in the helper's local config file (`~/.config/retone/config.json`, permission 0600). They are never stored in the browser and never leave your machine except to authenticate with the provider you configured.

## What is NOT collected

- No browsing history, no page content other than the draft you explicitly submit
- No personal information, no identifiers, no usage statistics
- No cookies, no fingerprinting

## Permissions

- `storage` — save your settings and presets locally
- `clipboardWrite` — the "복사" (Copy) button and the clipboard fallback when direct insertion fails
- `host_permissions` for `127.0.0.1` / `localhost` — communicate with the local helper only

## Contact

Questions or concerns: [open an issue](https://github.com/soulduse/retone/issues) on GitHub.
