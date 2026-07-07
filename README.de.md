# Retone

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Français](README.fr.md) | **Deutsch** | [Español](README.es.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

Schreiben Sie Ihre X (Twitter)- / Threads-Entwürfe in mehreren Tonlagen um — direkt im Eingabefeld. Eine Chrome-Erweiterung + ein lokaler LLM-Helper.

![Retone demo](docs/assets/demo.png)

**Nutzen Sie das Abo, das Sie bereits bezahlen.** Retone kapselt die offiziellen `claude`- / `codex`-CLIs als Headless-Subprozesse, sodass Ihr Claude-Pro/Max- oder ChatGPT-Plus/Pro-Abo das Umschreiben übernimmt — keine OAuth-Token-Extraktion, keine Drittanbieter-Server. Eigene API-Schlüssel (Anthropic / OpenAI / Gemini) werden ebenfalls unterstützt.

```
Chrome extension (content script on x.com / threads.com)
   │  localhost HTTP (127.0.0.1:7386, token auth)
   ▼
Local helper (zero-dependency Node ESM)
   ├─ claude-cli  : claude -p (Claude subscription)
   ├─ codex-cli   : codex exec (ChatGPT subscription)
   └─ anthropic / openai / gemini : your own API keys
```

## Installation

### 1. Helper starten

```bash
git clone https://github.com/soulduse/retone.git
cd retone
npm install          # devDeps for building the extension (the helper itself is zero-dep)
npm start            # starts the helper on 127.0.0.1:7386
```

**Autostart (empfohlen, macOS)** — einmal ausführen, und der Helper läuft nach jeder Anmeldung automatisch:

```bash
cd helper && node src/index.js install     # undo: uninstall
```

### 2. Erweiterung bauen und laden

```bash
npm run build        # produces extension/dist/
```

Chrome → `chrome://extensions` → Entwicklermodus aktivieren → **Entpackte Erweiterung laden** → `retone/extension/dist` auswählen.

### 3. Optionen

Öffnen Sie die Optionsseite der Erweiterung — sie **verbindet und koppelt sich automatisch mit dem Helper** (kein Token-Kopieren; `POST /v1/pair`). Läuft der Helper nicht, wird eine Schritt-für-Schritt-Anleitung angezeigt.

1. Verbindung prüfen (die Statusanzeige oben rechts wird grün)
2. Anbieter / Modell wählen (Claude CLI: sonnet/haiku/opus, Codex: gpt-5.5, …)
3. (Optional) API-Schlüssel eingeben, um API-Anbieter zu nutzen — die Schlüssel werden ausschließlich in der Helper-Konfiguration gespeichert (`~/.config/retone/config.json`, Modus 0600), niemals im Browser

Sollte die automatische Kopplung einmal fehlschlagen, fügen Sie die Ausgabe von `retone token` manuell in den erweiterten Einstellungen ein.

## Verwendung

1. Schreiben Sie einen Entwurf in ein Beitrags-/Antwortfeld auf x.com oder threads.com
2. Klicken Sie auf die Schaltfläche **Re✦** oben rechts im Eingabefeld
3. Wählen Sie Ton-Presets aus (Mehrfachauswahl möglich) → **다듬기** (Verfeinern)
4. Auf jeder Ergebniskarte: **삽입** (In das Eingabefeld einfügen) / **복사** (Kopieren) / **↻** (Nur dieses Preset neu generieren)

Sieben integrierte Presets: Einfacher Feinschliff · Höflich · Locker · Witzig · Prägnant · Viraler Aufhänger · Englische Übersetzung. Alle bearbeitbar — inklusive eigener Presets — auf der Optionsseite.

> Die Benutzeroberfläche der Erweiterung ist derzeit auf Koreanisch.

## Helper-CLI

```bash
node src/index.js serve            # start the server (same as npm start)
node src/index.js token [--rotate] # print / rotate the auth token
node src/index.js status           # server status + provider availability
node src/index.js test "text" --provider claude-cli --preset polish,concise
node src/index.js install          # register launchd auto-start (macOS)
node src/index.js stop             # stop the server
```

## Entwicklung

```bash
npm run dev          # watch build for the extension
npm test             # helper unit tests (node --test)
cd extension && npx tsc --noEmit   # typecheck
```

HTTP-API-Referenz: [`docs/api.md`](docs/api.md)

## Hinweise

- **Nutzungsbedingungen**: Das Extrahieren von OAuth-Tokens und der direkte Aufruf der API sind seit 2026 verboten (und serverseitig blockiert). Retone führt ausschließlich die offiziellen CLI-Binärdateien als Subprozesse aus. Beim Starten von `claude` wird `ANTHROPIC_API_KEY` aus der Umgebung entfernt, damit das CLI im Abo-Modus bleibt (ist der Schlüssel vorhanden, wechselt die Nutzung stillschweigend zur API-Abrechnung).
- DOM-Änderungen bei X/Threads können das direkte Einfügen brechen — in diesem Fall greift Retone automatisch auf das Kopieren in die Zwischenablage zurück. Die Site-Selektoren sind in `extension/src/content/sites/` isoliert.
- Umschreibungen über CLI-Anbieter dauern typischerweise 5–15 Sekunden und können langsamer sein, wenn andere Sitzungen (z. B. Claude Code) auf derselben Maschine laufen. Wählen Sie einen API-Anbieter (z. B. Gemini Flash), wenn Sie schnelle Antworten benötigen.

## Datenschutz

Ihr Entwurf gelangt über den lokalen Helper **ausschließlich zu dem von Ihnen ausgewählten KI-Anbieter**. Kein Sammelserver, keine Telemetrie, keine Log-Uploads. API-Schlüssel werden nur in `~/.config/retone/config.json` gespeichert (Modus 0600).

## Lizenz

MIT — nutzen, forken, ausliefern. Wenn es Ihnen nützlich ist, freuen wir uns über einen ⭐.
