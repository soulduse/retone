# Retone

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md) | **繁體中文**

直接在 X（Twitter）/ Threads 的輸入框中，用多種語氣改寫你的草稿 —— 一個 Chrome 擴充功能 + 本機 LLM 小幫手。

![Retone demo](docs/assets/demo.png)

**善用你已經付費的訂閱。** Retone 將官方的 `claude` / `codex` CLI 以無頭子行程方式包裝呼叫，因此改寫工作由你的 Claude Pro/Max 或 ChatGPT Plus/Pro 訂閱完成 —— 不擷取 OAuth 權杖，也沒有任何第三方伺服器。同時也支援自備 API 金鑰（Anthropic / OpenAI / Gemini）。

```
Chrome extension (content script on x.com / threads.com)
   │  localhost HTTP (127.0.0.1:7386, token auth)
   ▼
Local helper (zero-dependency Node ESM)
   ├─ claude-cli  : claude -p (Claude subscription)
   ├─ codex-cli   : codex exec (ChatGPT subscription)
   └─ anthropic / openai / gemini : your own API keys
```

## 安裝

### 1. 執行小幫手

```bash
git clone https://github.com/soulduse/retone.git
cd retone
npm install          # devDeps for building the extension (the helper itself is zero-dep)
npm start            # starts the helper on 127.0.0.1:7386
```

**自動啟動（建議，macOS）** —— 執行一次後，小幫手在每次登入後都會保持執行：

```bash
cd helper && node src/index.js install     # undo: uninstall
```

### 2. 建置並載入擴充功能

```bash
npm run build        # produces extension/dist/
```

開啟 Chrome → `chrome://extensions` → 啟用開發人員模式 → **載入未封裝項目** → 選取 `retone/extension/dist`。

### 3. 選項設定

開啟擴充功能的選項頁面 —— 它會**自動連線並與小幫手配對**（無需複製權杖；`POST /v1/pair`）。若小幫手未在執行，頁面會顯示逐步操作說明。

1. 確認連線狀態（右上角的狀態指示燈轉為綠色）
2. 選擇供應商 / 模型（Claude CLI：sonnet/haiku/opus，Codex：gpt-5.5，…）
3. （選用）填入 API 金鑰以使用 API 供應商 —— 金鑰僅儲存在小幫手的設定檔中（`~/.config/retone/config.json`，權限 0600），絕不會存放在瀏覽器裡

若自動配對失敗，請手動將 `retone token` 的輸出貼到進階設定中。

## 使用方式

1. 在 x.com 或 threads.com 的發文/回覆框中寫好草稿
2. 點擊輸入框右上角的 **Re✦** 按鈕
3. 選擇語氣預設集（可複選）→ **다듬기**（潤飾）
4. 在每張結果卡片上：**삽입**（插入輸入框）/ **복사**（複製）/ **↻**（僅重新生成該預設集）

內建七種預設集：簡單潤飾 · 有禮 · 輕鬆 · 詼諧 · 精簡 · 爆紅開場 · 英文翻譯。全部都能在選項頁面編輯，也可以新增自訂預設集。

> 擴充功能介面目前僅提供韓文。

## 小幫手 CLI

```bash
node src/index.js serve            # start the server (same as npm start)
node src/index.js token [--rotate] # print / rotate the auth token
node src/index.js status           # server status + provider availability
node src/index.js test "text" --provider claude-cli --preset polish,concise
node src/index.js install          # register launchd auto-start (macOS)
node src/index.js stop             # stop the server
```

## 開發

```bash
npm run dev          # watch build for the extension
npm test             # helper unit tests (node --test)
cd extension && npx tsc --noEmit   # typecheck
```

HTTP API 參考文件：[`docs/api.md`](docs/api.md)

## 注意事項

- **服務條款**：自 2026 年起，擷取 OAuth 權杖並直接呼叫 API 已被禁止（且已在伺服器端封鎖）。Retone 始終只以子行程方式執行官方 CLI 執行檔。啟動 `claude` 時會從環境變數中移除 `ANTHROPIC_API_KEY`，確保 CLI 維持在訂閱模式（若該金鑰存在，用量會在不知不覺間改以 API 計費）。
- X/Threads 的 DOM 變更可能導致直接插入失效 —— 此時 Retone 會自動改為複製到剪貼簿。站台選擇器皆獨立存放於 `extension/src/content/sites/`。
- 透過 CLI 供應商改寫通常需要 5–15 秒；若同一台機器上還有其他工作階段（例如 Claude Code）在執行，速度可能更慢。若需要快速回應，請改選 API 供應商（例如 Gemini Flash）。

## 隱私

你的草稿經由本機小幫手**只會傳送給你所選擇的 AI 供應商**。沒有蒐集伺服器、沒有遙測，也不會上傳任何記錄。API 金鑰僅儲存在 `~/.config/retone/config.json`（權限 0600）。

## 授權條款

MIT —— 儘管使用、fork、上線。如果覺得實用，歡迎給個 ⭐。
