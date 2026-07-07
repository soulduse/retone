# Retone

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Español](README.es.md) | **简体中文** | [繁體中文](README.zh-TW.md)

直接在 X（Twitter）/ Threads 的输入框里，用多种语气改写你的草稿 —— 一个 Chrome 扩展程序 + 本地 LLM 助手。

![Retone demo](docs/assets/demo.png)

**直接利用你已经付费的订阅。** Retone 将官方的 `claude` / `codex` / `agy`（Antigravity）CLI 作为无头子进程封装调用，因此改写工作由你的 Claude Pro/Max、ChatGPT Plus/Pro 或 Google AI Pro/Ultra 订阅完成 —— 不提取 OAuth 令牌，也没有任何第三方服务器。同时也支持自带 API 密钥（Anthropic / OpenAI / Gemini）。

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

## 安装

### 1. 运行助手

```bash
git clone https://github.com/soulduse/retone.git
cd retone
npm install          # devDeps for building the extension (the helper itself is zero-dep)
npm start            # starts the helper on 127.0.0.1:7386
```

**自动启动（推荐，macOS）** —— 运行一次后，助手会在每次登录后始终保持运行：

```bash
cd helper && node src/index.js install     # undo: uninstall
```

### 2. 构建并加载扩展程序

```bash
npm run build        # produces extension/dist/
```

打开 Chrome → `chrome://extensions` → 启用开发者模式 → **加载已解压的扩展程序** → 选择 `retone/extension/dist`。

### 3. 选项设置

打开扩展程序的选项页面 —— 它会**自动连接并与助手配对**（无需复制令牌；`POST /v1/pair`）。如果助手未在运行，页面会显示分步操作指引。

1. 确认连接状态（右上角的状态标签变为绿色）
2. 选择提供商 / 模型（Claude CLI：Sonnet 5/Haiku 4.5/Opus 4.8，Codex：GPT-5.5，Antigravity：Gemini 3.5 Flash，…）
3. （可选）填入 API 密钥以使用 API 提供商 —— 密钥仅保存在助手的配置文件中（`~/.config/retone/config.json`，权限 0600），绝不会存储在浏览器里

如果自动配对失败，请手动将 `retone token` 的输出粘贴到高级设置中。

## 使用方法

1. 在 x.com 或 threads.com 的发帖/回复框中写好草稿
2. 点击输入框右上角的 **Re✦** 按钮
3. 选择语气预设（可多选）→ **다듬기**（润色）
4. 在每张结果卡片上：**삽입**（插入到输入框）/ **복사**（复制）/ **↻**（仅重新生成该预设）

内置七种预设：简单润色 · 礼貌 · 随意 · 风趣 · 精简 · 病毒式开头 · 英文翻译。全部可在选项页面编辑，还可以添加自定义预设。

> 扩展程序界面目前仅提供韩语。

## 助手 CLI

```bash
node src/index.js serve            # start the server (same as npm start)
node src/index.js token [--rotate] # print / rotate the auth token
node src/index.js status           # server status + provider availability
node src/index.js test "text" --provider claude-cli --preset polish,concise
node src/index.js install          # register launchd auto-start (macOS)
node src/index.js stop             # stop the server
```

## 开发

```bash
npm run dev          # watch build for the extension
npm test             # helper unit tests (node --test)
cd extension && npx tsc --noEmit   # typecheck
```

HTTP API 参考文档：[`docs/api.md`](docs/api.md)

## 注意事项

- **服务条款**：自 2026 年起，提取 OAuth 令牌并直接调用 API 已被禁止（且已在服务端封锁）。Retone 始终只以子进程方式执行官方 CLI 可执行文件。在启动 `claude` 时会从环境变量中移除 `ANTHROPIC_API_KEY`，以确保 CLI 保持订阅模式（如果该密钥存在，用量会在不知不觉中切换为按 API 计费）。
- X/Threads 的 DOM 变更可能导致直接插入失效 —— 此时 Retone 会自动回退为复制到剪贴板。站点选择器均隔离存放在 `extension/src/content/sites/` 中。
- 通过 CLI 提供商改写通常需要 5–15 秒，如果同一台机器上还有其他会话（例如 Claude Code）在运行，速度可能更慢。如需快速响应，请选择 API 提供商（例如 Gemini Flash）。
- **Google 订阅（Antigravity）**：Gemini CLI 的个人/AI Pro 层级已于 2026 年 6 月停止服务，因此 Retone 改用 Antigravity CLI（`agy`）。请从 https://antigravity.google 安装，并在终端运行一次 `~/.local/bin/agy` 完成 Google 账号登录。

## 隐私

你的草稿经由本地助手**只会发送给你所选择的 AI 提供商**。没有收集服务器，没有遥测，也不会上传日志。API 密钥仅保存在 `~/.config/retone/config.json` 中（权限 0600）。

## 许可证

MIT —— 随意使用、fork、发布。如果觉得有用，欢迎点个 ⭐。
