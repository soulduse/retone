# Retone

[English](README.md) | **한국어** | [日本語](README.ja.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

X (트위터) / Threads 초안을 작성창 안에서 바로 여러 가지 톤으로 다듬어 주는 Chrome 확장 프로그램 + 로컬 LLM 헬퍼입니다.

![Retone demo](docs/assets/demo.png)

**이미 결제 중인 구독을 그대로 활용하세요.** Retone은 공식 `claude` / `codex` / `agy`(Antigravity) CLI를 헤드리스 서브프로세스로 감싸 실행하므로, Claude Pro/Max, ChatGPT Plus/Pro 또는 Google AI Pro/Ultra 구독으로 리라이팅이 이뤄집니다 — OAuth 토큰 추출도, 서드파티 서버도 없습니다. 직접 준비한 API 키(Anthropic / OpenAI / Gemini)도 지원합니다.

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

## 설치

### 1. 헬퍼 실행

```bash
git clone https://github.com/soulduse/retone.git
cd retone
npm install          # devDeps for building the extension (the helper itself is zero-dep)
npm start            # starts the helper on 127.0.0.1:7386
```

**자동 시작 (권장, macOS)** — 한 번만 실행해 두면 로그인 후 헬퍼가 항상 켜져 있습니다:

```bash
cd helper && node src/index.js install     # undo: uninstall
```

### 2. 확장 프로그램 빌드 & 로드

```bash
npm run build        # produces extension/dist/
```

Chrome → `chrome://extensions` → 개발자 모드 활성화 → **압축해제된 확장 프로그램을 로드합니다** → `retone/extension/dist` 선택.

### 3. 옵션

확장 프로그램 옵션 페이지를 열면 **헬퍼와 자동으로 연결·페어링됩니다**(토큰 복사 불필요, `POST /v1/pair`). 헬퍼가 실행 중이 아니면 단계별 안내가 표시됩니다.

1. 연결 상태를 확인 (우측 상단 알약 표시가 초록색으로 바뀝니다)
2. 프로바이더/모델 선택 (Claude CLI: Sonnet 5/Haiku 4.5/Opus 4.8, Codex: GPT-5.5, Antigravity: Gemini 3.5 Flash, …)
3. (선택) API 프로바이더를 쓰려면 API 키 입력 — 키는 헬퍼 설정 파일(`~/.config/retone/config.json`, 권한 0600)에만 저장되며 브라우저에는 절대 저장되지 않습니다

자동 페어링이 실패한다면 `retone token` 출력을 고급 설정에 직접 붙여넣으세요.

## 사용법

1. x.com 또는 threads.com의 글/답글 작성창에 초안을 작성
2. 작성창 우측 상단의 **Re✦** 버튼 클릭
3. 톤 프리셋 선택(복수 선택 가능) → **다듬기**
4. 각 결과 카드에서: **삽입** (작성창에 삽입) / **복사** / **↻** (해당 프리셋만 다시 생성)

기본 프리셋 7종: 심플 다듬기 · 정중하게 · 캐주얼 · 위트 있게 · 간결하게 · 바이럴 훅 · 영어 번역. 옵션 페이지에서 모두 수정할 수 있고, 커스텀 프리셋도 추가할 수 있습니다.

> 확장 프로그램 UI는 현재 한국어로 제공됩니다.

## 헬퍼 CLI

```bash
node src/index.js serve            # start the server (same as npm start)
node src/index.js token [--rotate] # print / rotate the auth token
node src/index.js status           # server status + provider availability
node src/index.js test "text" --provider claude-cli --preset polish,concise
node src/index.js install          # register launchd auto-start (macOS)
node src/index.js stop             # stop the server
```

## 개발

```bash
npm run dev          # watch build for the extension
npm test             # helper unit tests (node --test)
cd extension && npx tsc --noEmit   # typecheck
```

HTTP API 레퍼런스: [`docs/api.md`](docs/api.md)

## 참고 사항

- **ToS**: OAuth 토큰을 추출해 API를 직접 호출하는 방식은 2026년부터 금지되었고 서버 측에서도 차단됩니다. Retone은 오직 공식 CLI 바이너리를 서브프로세스로 실행할 뿐입니다. `claude`를 실행할 때는 환경변수에서 `ANTHROPIC_API_KEY`를 제거해 CLI가 구독 모드를 유지하게 합니다(키가 남아 있으면 사용량이 조용히 API 과금으로 전환됩니다).
- X/Threads의 DOM이 바뀌면 직접 삽입이 동작하지 않을 수 있습니다 — 이 경우 Retone이 자동으로 클립보드 복사로 폴백합니다. 사이트별 셀렉터는 `extension/src/content/sites/`에 분리되어 있습니다.
- CLI 프로바이더를 통한 리라이팅은 보통 5–15초가 걸리고, 같은 머신에서 다른 세션(예: Claude Code)이 돌고 있으면 더 느려질 수 있습니다. 빠른 응답이 필요하다면 API 프로바이더(예: Gemini Flash)를 선택하세요.
- **Google 구독(Antigravity)**: Gemini CLI의 개인/AI Pro 티어는 2026년 6월에 종료되어, Retone은 대신 Antigravity CLI(`agy`)를 사용합니다. https://antigravity.google 에서 설치 후 터미널에서 `~/.local/bin/agy`를 한 번 실행해 Google 계정으로 로그인하세요.

## 프라이버시

작성한 초안은 로컬 헬퍼를 거쳐 **선택한 AI 프로바이더로만** 전송됩니다. 수집 서버도, 텔레메트리도, 로그 업로드도 없습니다. API 키는 `~/.config/retone/config.json`(권한 0600)에만 저장됩니다.

## 라이선스

MIT — 마음껏 쓰고, 포크하고, 배포하세요. 유용했다면 ⭐ 하나 부탁드립니다.
