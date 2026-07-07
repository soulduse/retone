# Retone

[English](README.md) | [한국어](README.ko.md) | **日本語** | [Français](README.fr.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

X（Twitter）/ Threads の下書きを、投稿ボックスの中でそのまま複数のトーンにリライトできる Chrome 拡張機能 + ローカル LLM ヘルパーです。

![Retone demo](docs/assets/demo.png)

**すでに契約しているサブスクリプションをそのまま活用。** Retone は公式の `claude` / `codex` / `agy`（Antigravity）CLI をヘッドレスなサブプロセスとしてラップするため、Claude Pro/Max、ChatGPT Plus/Pro、Google AI Pro/Ultra のサブスクリプションでリライトが行われます — OAuth トークンの抽出も、サードパーティのサーバーも一切ありません。自前の API キー（Anthropic / OpenAI / Gemini）にも対応しています。

```
Chrome extension (content script on x.com / threads.com)
   │  localhost HTTP (127.0.0.1:7386, token auth)
   ▼
Local helper (zero-dependency Node ESM)
   ├─ claude-cli      : claude -p (Claude subscription)
   ├─ codex-cli       : codex exec (ChatGPT subscription)
   ├─ antigravity-cli : agy -p (Google AI Pro/Ultra subscription)
   └─ anthropic / openai / gemini : your own API keys
```

## インストール

### 1. ヘルパーを起動する

```bash
git clone https://github.com/soulduse/retone.git
cd retone
npm install          # devDeps for building the extension (the helper itself is zero-dep)
npm start            # starts the helper on 127.0.0.1:7386
```

**自動起動（推奨、macOS）** — 一度実行しておけば、ログイン後は常にヘルパーが起動した状態になります:

```bash
cd helper && node src/index.js install     # undo: uninstall
```

### 2. 拡張機能をビルドして読み込む

```bash
npm run build        # produces extension/dist/
```

Chrome → `chrome://extensions` → デベロッパーモードを有効化 → **パッケージ化されていない拡張機能を読み込む** → `retone/extension/dist` を選択。

### 3. オプション

拡張機能のオプションページを開くと、**ヘルパーと自動的に接続・ペアリングされます**（トークンのコピーは不要、`POST /v1/pair`）。ヘルパーが起動していない場合は、手順が順を追って表示されます。

1. 接続を確認する（右上のピルが緑色に変わります）
2. プロバイダー / モデルを選択する（Claude CLI: Sonnet 5/Haiku 4.5/Opus 4.8、Codex: GPT-5.5、Antigravity: Gemini 3.5 Flash など）
3. （任意）API プロバイダーを使う場合は API キーを入力 — キーはヘルパーの設定ファイル（`~/.config/retone/config.json`、パーミッション 0600）にのみ保存され、ブラウザには一切保存されません

自動ペアリングに失敗した場合は、`retone token` の出力を詳細設定に手動で貼り付けてください。

## 使い方

1. x.com または threads.com の投稿/返信ボックスに下書きを書く
2. 投稿ボックス右上の **Re✦** ボタンをクリック
3. トーンプリセットを選択（複数選択可）→ **다듬기**（リライト）
4. 各結果カードで: **삽입**（挿入 — 投稿ボックスに挿入）/ **복사**（コピー）/ **↻**（そのプリセットのみ再生成）

内蔵プリセットは 7 種類: シンプルな推敲・丁寧・カジュアル・ウィット・簡潔・バズるフック・英語翻訳。すべてオプションページで編集でき、カスタムプリセットの追加も可能です。

> 拡張機能の UI は現在韓国語のみです。

## ヘルパー CLI

```bash
node src/index.js serve            # start the server (same as npm start)
node src/index.js token [--rotate] # print / rotate the auth token
node src/index.js status           # server status + provider availability
node src/index.js test "text" --provider claude-cli --preset polish,concise
node src/index.js install          # register launchd auto-start (macOS)
node src/index.js stop             # stop the server
```

## 開発

```bash
npm run dev          # watch build for the extension
npm test             # helper unit tests (node --test)
cd extension && npx tsc --noEmit   # typecheck
```

HTTP API リファレンス: [`docs/api.md`](docs/api.md)

## 補足

- **利用規約（ToS）**: OAuth トークンを抽出して API を直接呼び出す方法は 2026 年以降禁止されており、サーバー側でもブロックされています。Retone は公式 CLI バイナリをサブプロセスとして実行するだけです。`claude` を起動する際は環境変数から `ANTHROPIC_API_KEY` を取り除き、CLI がサブスクリプションモードを維持するようにしています（キーが残っていると、使用量が知らないうちに API 課金へ切り替わります）。
- X/Threads の DOM 変更によって直接挿入が動かなくなることがあります — その場合、Retone は自動的にクリップボードへのコピーにフォールバックします。サイトごとのセレクタは `extension/src/content/sites/` に分離されています。
- CLI プロバイダー経由のリライトは通常 5〜15 秒かかり、同じマシンで他のセッション（Claude Code など）が動いているとさらに遅くなることがあります。速いレスポンスが必要な場合は API プロバイダー（Gemini Flash など）を選んでください。
- **Google サブスクリプション（Antigravity）**: Gemini CLI の個人/AI Pro ティアは 2026 年 6 月に終了したため、Retone は代わりに Antigravity CLI（`agy`）を使用します。https://antigravity.google からインストールし、ターミナルで `~/.local/bin/agy` を一度実行して Google アカウントでサインインしてください。

## プライバシー

下書きはローカルヘルパーを経由して、**選択した AI プロバイダーにのみ**送信されます。収集サーバーもテレメトリーもログのアップロードもありません。API キーは `~/.config/retone/config.json`（パーミッション 0600）にのみ保存されます。

## ライセンス

MIT — 自由に使って、フォークして、公開してください。役に立ったら ⭐ をいただけると嬉しいです。
