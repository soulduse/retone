# Retone

**English** | [한국어](README.ko.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

Rewrite your X (Twitter) / Threads drafts in multiple tones, right inside the compose box — a Chrome extension + local LLM helper.

![Retone demo](docs/assets/demo.png)

**Use the subscription you already pay for.** Retone wraps the official `claude` / `codex` CLIs as headless subprocesses, so your Claude Pro/Max or ChatGPT Plus/Pro subscription does the rewriting — no OAuth token extraction, no third-party servers. BYO API keys (Anthropic / OpenAI / Gemini) are also supported.

```
Chrome extension (content script on x.com / threads.com)
   │  localhost HTTP (127.0.0.1:7386, token auth)
   ▼
Local helper (zero-dependency Node ESM)
   ├─ claude-cli  : claude -p (Claude subscription)
   ├─ codex-cli   : codex exec (ChatGPT subscription)
   └─ anthropic / openai / gemini : your own API keys
```

## Install

### 1. Run the helper

```bash
git clone https://github.com/soulduse/retone.git
cd retone
npm install          # devDeps for building the extension (the helper itself is zero-dep)
npm start            # starts the helper on 127.0.0.1:7386
```

**Auto-start (recommended, macOS)** — run once and the helper is always running after login:

```bash
cd helper && node src/index.js install     # undo: uninstall
```

### 2. Build & load the extension

```bash
npm run build        # produces extension/dist/
```

Chrome → `chrome://extensions` → enable Developer mode → **Load unpacked** → select `retone/extension/dist`.

### 3. Options

Open the extension options page — it **connects and pairs with the helper automatically** (no token copying; `POST /v1/pair`). If the helper isn't running, step-by-step instructions are shown.

1. Check the connection (the pill in the top-right corner turns green)
2. Pick a provider / model (Claude CLI: sonnet/haiku/opus, Codex: gpt-5.5, …)
3. (Optional) enter API keys to use API providers — keys are stored only in the helper config (`~/.config/retone/config.json`, mode 0600), never in the browser

If automatic pairing ever fails, paste the output of `retone token` into Advanced settings manually.

## Usage

1. Write a draft in a post/reply box on x.com or threads.com
2. Click the **Re✦** button at the top-right of the compose box
3. Select tone presets (multiple allowed) → **다듬기** (Refine)
4. On each result card: **삽입** (Insert into the compose box) / **복사** (Copy) / **↻** (Regenerate that preset only)

Seven built-in presets: Simple polish · Polite · Casual · Witty · Concise · Viral hook · English translation. All editable — plus custom presets — on the options page.

> The extension UI is currently in Korean.

## Helper CLI

```bash
node src/index.js serve            # start the server (same as npm start)
node src/index.js token [--rotate] # print / rotate the auth token
node src/index.js status           # server status + provider availability
node src/index.js test "text" --provider claude-cli --preset polish,concise
node src/index.js install          # register launchd auto-start (macOS)
node src/index.js stop             # stop the server
```

## Development

```bash
npm run dev          # watch build for the extension
npm test             # helper unit tests (node --test)
cd extension && npx tsc --noEmit   # typecheck
```

HTTP API reference: [`docs/api.md`](docs/api.md)

## Notes

- **ToS**: Extracting OAuth tokens and calling the API directly has been prohibited (and server-side blocked) since 2026. Retone only ever executes the official CLI binaries as subprocesses. When spawning `claude`, `ANTHROPIC_API_KEY` is removed from the environment so the CLI stays in subscription mode (if the key is present, usage silently switches to API billing).
- X/Threads DOM changes can break direct insertion — in that case Retone automatically falls back to copying to the clipboard. Site selectors are isolated in `extension/src/content/sites/`.
- Rewrites via CLI providers typically take 5–15 seconds, and can be slower when other sessions (e.g. Claude Code) are running on the same machine. Pick an API provider (e.g. Gemini Flash) if you need fast responses.

## Privacy

Your draft goes through the local helper **only to the AI provider you selected**. No collection server, no telemetry, no log uploads. API keys are stored only in `~/.config/retone/config.json` (mode 0600).

## License

MIT — use it, fork it, ship it. If you find it useful, a ⭐ is appreciated.
