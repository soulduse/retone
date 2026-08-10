# Retone Privacy Policy

_Last updated: 2026-08-10_

Retone is a local-first browser extension. By default, **the developer does not collect, store, or transmit any of your data. There are no analytics and no telemetry.** An optional hosted tier ("Retone Cloud") processes your draft on our server only when you explicitly select it — see below.

## What data is processed, and where it goes

- **Your draft text (default, self-hosted)**: when you click "다듬기" (Refine), the draft you wrote in the X/Threads compose box is sent to the **Retone helper running on your own machine** (`127.0.0.1`). The helper forwards it **only to the AI provider you selected** — either through the official `claude` / `codex` CLI installed on your machine (your own subscription) or directly to the Anthropic / OpenAI / Google API using API keys you provided. Processing by those providers is governed by their respective terms and privacy policies.
- **Your draft text (Retone Cloud, opt-in)**: if you select the **Retone Cloud** provider, your draft and tone presets are sent over HTTPS to the Retone server, forwarded once to an AI provider for rewriting, and the result is returned. **Drafts and results are processed in memory only — they are never stored in a database and never written to logs.** The server keeps only anonymous usage counters (requests per day) tied to a random device ID or your license key, to enforce the free-trial and fair-use limits.
- **Settings and presets**: stored locally in your browser via `chrome.storage.local`. Never synced or uploaded.
- **API keys**: stored only in the helper's local config file (`~/.config/retone/config.json`, permission 0600). They are never stored in the browser and never leave your machine except to authenticate with the provider you configured.
- **License key & device ID (Retone Cloud only)**: a license key you enter and a randomly generated device ID are stored locally and sent with Cloud requests to identify your subscription/trial quota. They are not linked to your identity; your email address is used only to deliver the license key at purchase and is handled by the payment provider.

## What is NOT collected

- No browsing history, no page content other than the draft you explicitly submit
- No personal information, no usage statistics beyond anonymous Cloud request counts
- No cookies, no fingerprinting
- Cloud tier: no storage of draft text or generated text, ever

## Permissions

- `storage` — save your settings and presets locally
- `clipboardWrite` — the "복사" (Copy) button and the clipboard fallback when direct insertion fails
- `host_permissions` for `127.0.0.1` / `localhost` — communicate with the local helper
- `host_permissions` for `api.retone.dev` — communicate with the optional Retone Cloud tier (only used when you select the Retone Cloud provider)

## Contact

Questions or concerns: [open an issue](https://github.com/soulduse/retone/issues) on GitHub.
