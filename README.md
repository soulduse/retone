# Retone

X(트위터)·Threads에서 작성 중인 글을 여러 톤으로 다듬어주는 Chrome 확장 + 로컬 LLM 헬퍼.

> **English TL;DR** — Retone rewrites your X/Threads drafts in multiple tones (polish, polite, witty, concise, viral hook, English translation) right inside the compose box. It runs **entirely on your machine**: a local helper wraps the official `claude` / `codex` CLIs so you can use your existing Claude Pro/Max or ChatGPT subscription — no OAuth token extraction, no third-party servers. BYO API keys (Anthropic/OpenAI/Gemini) also supported.

**구독을 그대로 활용** — Claude Pro/Max(`claude` CLI), ChatGPT Plus/Pro(`codex` CLI)를 공식 CLI headless 서브프로세스로 감싸서 사용합니다. OAuth 토큰을 직접 다루지 않으므로 ToS 안전 경로입니다. API 키 직접 입력(Anthropic/OpenAI/Gemini)도 지원합니다.

```
Chrome 확장 (x.com / threads.com 콘텐츠 스크립트)
   │  localhost HTTP (127.0.0.1:7386, 토큰 인증)
   ▼
로컬 헬퍼 (zero-dependency Node ESM)
   ├─ claude-cli  : claude -p (Claude 구독)
   ├─ codex-cli   : codex exec (ChatGPT 구독)
   └─ anthropic / openai / gemini : API 키 직접
```

## 설치

### 1. 헬퍼 실행

```bash
cd retone
npm install          # 확장 빌드용 devDeps (헬퍼는 zero-dep)
npm start            # = helper 서버 기동 (127.0.0.1:7386)
```

**자동 시작 등록(권장, macOS)** — 한 번만 실행하면 이후 로그인 시 헬퍼가 항상 떠 있습니다:

```bash
cd helper && node src/index.js install     # 해제: uninstall
```

### 2. 확장 빌드 & 로드

```bash
npm run build        # extension/dist/ 생성
```

Chrome → `chrome://extensions` → 개발자 모드 ON → **압축해제된 확장 프로그램 로드** → `retone/extension/dist` 선택.

### 3. 옵션 설정

옵션 페이지를 열면 **자동으로 헬퍼에 연결·페어링**됩니다(토큰 복사 불필요 — `POST /v1/pair`). 헬퍼가 꺼져 있으면 실행 방법이 단계별로 안내됩니다.

1. 연결 확인 (우상단 상태 필이 "헬퍼 연결됨"이면 완료)
2. Provider / 모델 선택 (Claude CLI는 sonnet/haiku/opus, Codex는 gpt-5.5 등)
3. (선택) API provider를 쓰려면 API 키 입력 — 키는 헬퍼 config(`~/.config/retone/config.json`, 0600)에만 저장

수동 토큰 입력이 필요한 경우(자동 페어링 실패)에만 고급 설정에서 `retone token` 값을 붙여넣습니다.

## 사용

1. x.com 또는 threads.com에서 글/답글 입력창에 초안 작성
2. 입력창 우상단의 **Re✦** 버튼 클릭
3. 톤 프리셋 선택(복수 가능) → **다듬기**
4. 결과 카드에서 **삽입**(입력창에 바로) / **복사** / **↻**(해당 프리셋만 재생성)

빌트인 프리셋 7종: 심플 다듬기 · 정중 · 캐주얼 · 위트 · 간결 · 바이럴/후킹 · 영어 번역. 옵션 페이지에서 수정/비활성/커스텀 추가 가능.

## 헬퍼 CLI

```bash
node src/index.js serve            # 서버 기동 (npm start)
node src/index.js token [--rotate] # 토큰 출력/교체
node src/index.js status           # 실행 중 서버 상태 + provider 가용성
node src/index.js test "문장" --provider claude-cli --preset polish,concise
node src/index.js stop             # 서버 종료
```

## 개발

```bash
npm run dev          # 확장 watch 빌드
npm test             # 헬퍼 단위 테스트 (node --test)
cd extension && npx tsc --noEmit   # 타입체크
```

HTTP API 명세: `docs/api.md`

## 주의

- **ToS**: OAuth 토큰을 추출해 API를 직접 호출하는 방식은 2026년부터 금지·차단되었습니다. Retone은 공식 CLI 바이너리를 서브프로세스로 실행하는 방식만 사용합니다. `claude` spawn 시 `ANTHROPIC_API_KEY`를 env에서 제거해 구독 모드를 유지합니다(키가 있으면 API 과금으로 전환됨).
- X/Threads의 DOM 구조 변경으로 직접 삽입이 깨질 수 있습니다 — 그 경우 자동으로 클립보드 복사로 폴백합니다. 셀렉터는 `extension/src/content/sites/`에 격리되어 있습니다.
- 리라이팅 속도는 CLI provider 기준 보통 5~15초이며, 같은 머신에서 Claude Code 등 다른 세션이 많이 돌고 있으면 느려질 수 있습니다. 빠른 응답이 필요하면 API provider(Gemini Flash 등)를 선택하세요.

## 프라이버시

작성 중인 글은 로컬 헬퍼를 거쳐 **내가 선택한 AI provider에게만** 전송됩니다. 별도의 수집 서버, 텔레메트리, 로그 업로드는 없습니다. API 키는 `~/.config/retone/config.json`(권한 0600)에만 저장됩니다.

## License

MIT — 자유롭게 쓰고 고치고 배포하세요. 유용했다면 ⭐ 하나 부탁드립니다.
