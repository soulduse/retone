# Retone 헬퍼 HTTP API

Base: `http://127.0.0.1:7386` (포트는 `~/.config/retone/config.json`의 `port`)

- 인증: `/health` 제외 전부 `X-Retone-Token: <token>` 헤더 필수
- 방어: 127.0.0.1 바인딩, `Host`가 `127.0.0.1|localhost[:port]`가 아니면 403, 본문 256KB 상한
- 에러 형식: `{"error":{"code":"...","message":"..."}}`

| 코드 | HTTP | 의미 |
|------|------|------|
| `UNAUTHORIZED` | 401 | 토큰 불일치 |
| `FORBIDDEN` | 403 | Host 검증 실패 |
| `BAD_REQUEST` | 400 | 요청 형식 오류 |
| `CLI_NOT_FOUND` | 424 | claude/codex CLI 미설치 |
| `NO_API_KEY` | 424 | API provider 키 미등록 |
| `TIMEOUT` | 504 | timeoutMs(기본 90s) 초과 |
| `PARSE_ERROR` | 502 | LLM 응답 파싱 실패 |
| `PROVIDER_ERROR` | 502 | CLI 종료코드≠0 / API 오류 |

## GET /health (무인증)

```bash
curl http://127.0.0.1:7386/health
# {"ok":true,"name":"retone-helper","version":"0.1.0"}
```

## POST /v1/pair (무인증 — 원클릭 페어링)

토큰을 반환한다. `x-retone-pair: 1` 커스텀 헤더 필수 — 웹페이지가 커스텀 헤더를 보내려면 CORS preflight가 필요하고 이 서버는 CORS를 허용하지 않으므로 브라우저가 차단한다. host_permissions를 가진 확장만 호출 가능.

```bash
curl -X POST -H "x-retone-pair: 1" http://127.0.0.1:7386/v1/pair
# {"token":"..."}   (헤더 없으면 403)
```

## GET /v1/models

provider 가용성 + 모델 목록. CLI는 `--version` 실행(60초 캐시), API는 키 존재로 판정.

```bash
curl -H "x-retone-token: $TOKEN" http://127.0.0.1:7386/v1/models
```

```json
{"providers":[{"id":"claude-cli","label":"Claude CLI (구독)","kind":"cli",
  "models":[{"id":"sonnet","label":"Sonnet"},...],"defaultModel":"sonnet",
  "available":true,"version":"2.1.202 (Claude Code)"}, ...]}
```

## POST /v1/rewrite

1회 호출로 선택된 모든 프리셋의 변형을 동시 생성.

```bash
curl -X POST -H "x-retone-token: $TOKEN" -H "content-type: application/json" \
  http://127.0.0.1:7386/v1/rewrite -d '{
  "text": "다듬을 초안",
  "provider": "claude-cli",
  "model": "haiku",
  "context": {"site": "x", "kind": "post"},
  "presets": [
    {"id": "polish", "name": "심플 다듬기", "instruction": "자연스럽게 다듬어줘."}
  ]
}'
# → {"variants":[{"presetId":"polish","text":"..."}],"elapsedMs":8424,"provider":"claude-cli","model":"haiku"}
```

- `model` 생략 시 provider의 defaultModel
- 프리셋은 요청에 통째로 실려온다 — 헬퍼는 프리셋에 대해 완전 stateless
- 연결이 끊기면(`req close`) 진행 중인 CLI child를 SIGKILL (확장의 취소 버튼)
- 응답 variants는 요청 presetId 커버리지로 검증 — 누락분은 제외하고 반환(카드별 재생성으로 복구)

## GET /v1/config

키 presence만 반환 (원문 절대 미반환): `{"port":7386,"timeoutMs":90000,"keys":{"anthropic":true,"openai":false,"gemini":false}}`

## PUT /v1/config/keys

```bash
curl -X PUT -H "x-retone-token: $TOKEN" -H "content-type: application/json" \
  http://127.0.0.1:7386/v1/config/keys -d '{"gemini":"AI..."}'
```

빈 문자열 = 해당 키 삭제. 응답은 presence.

## Provider 구현 노트

- **claude-cli**: `claude -p "<user>" --model <m> --fallback-model sonnet --output-format json --json-schema '<inline schema>' --append-system-prompt "<sys>"`. env에서 `ANTHROPIC_API_KEY` 제거(구독 모드 유지), cwd=`~/.config/retone/work/`. `--bare`는 keychain 인증을 건너뛸 수 있어 미사용.
- **codex-cli**: `codex exec - --skip-git-repo-check -s read-only --ephemeral -m <m> -c model_reasoning_effort="low" --output-schema <file> -o <outfile>`, 프롬프트는 stdin. env에서 `OPENAI_API_KEY` 제거.
- **anthropic**: Messages API + structured outputs(`output_config.format.json_schema`)
- **openai**: chat/completions + `response_format json_schema strict` + `reasoning_effort: low`
- **gemini**: `generateContent` + `responseSchema`(additionalProperties 제거 변환)
