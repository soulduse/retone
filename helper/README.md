# Retone

Local helper for the [Retone Chrome extension](https://github.com/soulduse/retone) — rewrite your X/Threads drafts in multiple tones, right inside the compose box, using **your own AI subscription** (Claude Code / Codex / Antigravity CLI) or your own API keys (Anthropic / OpenAI / Gemini). Zero dependencies, local-first: your drafts never leave your machine except to the AI provider you choose.

## Install

```bash
npm install -g retone && retone install   # installs + registers auto-start (macOS launchd)
```

Then load the Chrome extension and open its options page — pairing is automatic. Full setup guide: [github.com/soulduse/retone](https://github.com/soulduse/retone)

## Commands

```bash
retone serve       # run the helper in the foreground (127.0.0.1:7386)
retone install     # register auto-start on login (macOS) — undo: retone uninstall
retone stop        # stop the background server
retone status      # check server status
retone token       # print the pairing token (advanced)
retone test "..."  # rewrite a sentence from the CLI
```

## License

MIT — see the [main repository](https://github.com/soulduse/retone).
