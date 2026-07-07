# Retone

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | **Français** | [Deutsch](README.de.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

Réécrivez vos brouillons X (Twitter) / Threads dans plusieurs tons, directement dans la zone de rédaction — une extension Chrome + un assistant LLM local.

![Retone demo](docs/assets/demo.png)

**Utilisez l'abonnement que vous payez déjà.** Retone encapsule les CLI officiels `claude` / `codex` en tant que sous-processus headless, de sorte que c'est votre abonnement Claude Pro/Max ou ChatGPT Plus/Pro qui effectue la réécriture — aucune extraction de jeton OAuth, aucun serveur tiers. Vos propres clés API (Anthropic / OpenAI / Gemini) sont également prises en charge.

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

### 1. Lancer l'assistant

```bash
git clone https://github.com/soulduse/retone.git
cd retone
npm install          # devDeps for building the extension (the helper itself is zero-dep)
npm start            # starts the helper on 127.0.0.1:7386
```

**Démarrage automatique (recommandé, macOS)** — exécutez la commande une seule fois et l'assistant tournera en permanence après chaque connexion :

```bash
cd helper && node src/index.js install     # undo: uninstall
```

### 2. Compiler et charger l'extension

```bash
npm run build        # produces extension/dist/
```

Chrome → `chrome://extensions` → activez le mode développeur → **Charger l'extension non empaquetée** → sélectionnez `retone/extension/dist`.

### 3. Options

Ouvrez la page d'options de l'extension — elle **se connecte et s'appaire automatiquement avec l'assistant** (pas de copie de jeton ; `POST /v1/pair`). Si l'assistant n'est pas en cours d'exécution, des instructions pas à pas s'affichent.

1. Vérifiez la connexion (la pastille en haut à droite devient verte)
2. Choisissez un fournisseur / modèle (Claude CLI : sonnet/haiku/opus, Codex : gpt-5.5, …)
3. (Facultatif) saisissez des clés API pour utiliser les fournisseurs API — les clés sont stockées uniquement dans la configuration de l'assistant (`~/.config/retone/config.json`, mode 0600), jamais dans le navigateur

Si l'appairage automatique venait à échouer, collez manuellement la sortie de `retone token` dans les paramètres avancés.

## Utilisation

1. Rédigez un brouillon dans une zone de publication/réponse sur x.com ou threads.com
2. Cliquez sur le bouton **Re✦** en haut à droite de la zone de rédaction
3. Sélectionnez des préréglages de ton (plusieurs autorisés) → **다듬기** (Reformuler)
4. Sur chaque carte de résultat : **삽입** (Insérer dans la zone de rédaction) / **복사** (Copier) / **↻** (Régénérer uniquement ce préréglage)

Sept préréglages intégrés : Retouche simple · Poli · Décontracté · Spirituel · Concis · Accroche virale · Traduction en anglais. Tous modifiables — avec en plus des préréglages personnalisés — depuis la page d'options.

> L'interface de l'extension est actuellement en coréen.

## CLI de l'assistant

```bash
node src/index.js serve            # start the server (same as npm start)
node src/index.js token [--rotate] # print / rotate the auth token
node src/index.js status           # server status + provider availability
node src/index.js test "text" --provider claude-cli --preset polish,concise
node src/index.js install          # register launchd auto-start (macOS)
node src/index.js stop             # stop the server
```

## Développement

```bash
npm run dev          # watch build for the extension
npm test             # helper unit tests (node --test)
cd extension && npx tsc --noEmit   # typecheck
```

Référence de l'API HTTP : [`docs/api.md`](docs/api.md)

## Remarques

- **Conditions d'utilisation** : l'extraction de jetons OAuth et l'appel direct de l'API sont interdits (et bloqués côté serveur) depuis 2026. Retone se contente d'exécuter les binaires CLI officiels en tant que sous-processus. Lors du lancement de `claude`, la variable `ANTHROPIC_API_KEY` est retirée de l'environnement afin que le CLI reste en mode abonnement (si la clé est présente, l'utilisation bascule silencieusement vers la facturation API).
- Les changements du DOM de X/Threads peuvent casser l'insertion directe — dans ce cas, Retone se rabat automatiquement sur la copie dans le presse-papiers. Les sélecteurs propres à chaque site sont isolés dans `extension/src/content/sites/`.
- Les réécritures via les fournisseurs CLI prennent généralement de 5 à 15 secondes, et peuvent être plus lentes lorsque d'autres sessions (par exemple Claude Code) tournent sur la même machine. Choisissez un fournisseur API (par exemple Gemini Flash) si vous avez besoin de réponses rapides.

## Confidentialité

Votre brouillon transite par l'assistant local **uniquement vers le fournisseur d'IA que vous avez sélectionné**. Aucun serveur de collecte, aucune télémétrie, aucun envoi de journaux. Les clés API sont stockées uniquement dans `~/.config/retone/config.json` (mode 0600).

## Licence

MIT — utilisez-le, forkez-le, distribuez-le. Si vous le trouvez utile, une ⭐ est la bienvenue.
