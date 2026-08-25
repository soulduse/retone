# Chrome Web Store 배포 가이드

개발자 계정 등록이 끝난 상태를 전제로 한다. 소요 시간: 폼 입력 ~20분 + 심사 대기(보통 1~3일).

## ⛔ 제출 전 차단 항목 (이거 안 하고 올리면 반려되거나 사용자가 설치를 못 한다)

| # | 항목 | 확인 방법 |
|---|------|-----------|
| 1 | **확장을 실제로 로드해 결제 오버레이를 눌러본다** | `chrome://extensions` → 개발자 모드 → `extension/dist` 로드 → 설정에서 "구독하기" → 결제창이 **빈 화면이 아니라 실제로 뜨는지**. iframe 실렌더는 정적 검증으로 확인 불가 |
| 2 | **버전을 올린다** | `extension/public/manifest.json` 의 `version` (같은 버전 재업로드 불가) |
| 3 | **스크린샷을 현재 UI 로 다시 찍는다** | `docs/store/screenshot-1280x800.png` 는 7월 캡처 — 그 뒤 UI·가격·잔여량 표시가 바뀌었다. 스토어 메타데이터 불일치는 반려 사유 |
| 4 | **GitHub 릴리스를 만든다** | 사이트 설치 안내가 `/releases` 를 가리키는데 **현재 릴리스가 0개**다. 심사와 무관하지만 그대로 두면 사용자가 설치를 못 한다 |
| 5 | **PRIVACY.md 에 결제·로그인 축을 반영** | 현재 방침은 헬퍼 경로 위주다. Google 로그인(이메일·sub 저장)과 결제 처리자(Lemon Squeezy)를 명시해야 데이터 신고와 어긋나지 않는다 |

## 0. 패키징

```bash
npm run pack        # 빌드 후 retone-extension-v<버전>.zip 생성 (저장소 루트)
```

- zip 루트에 `manifest.json`이 바로 있어야 한다 (`extension/dist`의 내용물이 루트). `npm run pack`이 보장한다.
- 업로드마다 `extension/public/manifest.json`의 `version`을 올려야 한다 (같은 버전 재업로드 불가).

## 1. 아이템 생성 & zip 업로드

1. [Chrome Web Store 개발자 대시보드](https://chrome.google.com/webstore/devconsole) → **새 항목** → zip 업로드
2. 업로드 직후 자동 검사에서 manifest 오류가 있으면 여기서 바로 알려준다

## 2. 스토어 등록정보 (Store listing)

| 항목 | 값 |
|---|---|
| 이름 | Retone |
| 요약(짧은 설명) | X/Threads 초안을 여러 톤으로 다듬어주는 로컬 AI 어시스턴트 |
| 카테고리 | 생산성 → 도구 (Workflow & Planning도 무방) |
| 언어 | 한국어 (기본 UI가 한국어) |
| 아이콘 128px | `extension/public/icons/icon128.png` |
| 스크린샷 (1280×800) | `docs/store/screenshot-1280x800.png` (필수 1장 이상, 실사용 캡처 추가 권장) |
| 프로모 타일 440×280 | 선택 — 없어도 게시 가능 |

상세 설명 초안:

```
X(트위터)와 Threads 작성창에서 쓰던 초안을 그 자리에서 여러 가지 톤으로 다듬어 줍니다.

• 작성창 위 Re✦ 버튼 → 톤 선택 → 결과를 바로 삽입하거나 복사
• 기본 프리셋 7종(심플 다듬기/정중/캐주얼/위트/간결/바이럴 훅/영어 번역) + 커스텀 프리셋
• 이미 결제 중인 Claude Pro/Max, ChatGPT Plus/Pro 구독을 공식 CLI로 그대로 활용 (또는 본인 API 키)
• 로컬 우선: 초안은 내 컴퓨터의 헬퍼를 거쳐 내가 선택한 AI로만 전송. 수집 서버·텔레메트리 없음

⚠ 사용하려면 로컬 헬퍼 실행이 필요합니다 (Node.js):
https://github.com/soulduse/retone
```

## 3. 개인정보 보호 (Privacy practices 탭) — 심사 핵심

여기가 심사 통과의 관건. 아래를 그대로 입력한다.

**Single purpose (단일 목적)**:

```
Rewrites the user's X/Threads draft text into user-selected tones and inserts the chosen result back into the compose box. All processing goes through a helper application running on the user's own machine.
```

**권한별 사용 이유 (Permission justification)**:

| 권한 | 입력할 문구 |
|---|---|
| `storage` | Stores the user's settings and tone presets locally. Nothing is synced or uploaded. |
| `clipboardWrite` | Implements the "Copy" button and the clipboard fallback used when direct insertion into the compose box is not possible. |
| `host_permissions (127.0.0.1, localhost)` | Communicates with the Retone helper application that runs on the user's own machine at 127.0.0.1:7386. Used for the default self-hosted mode. |
| `host_permissions (api.retone.dev)` | Communicates with the optional "Retone Cloud" hosted rewriting service, only when the user explicitly selects the Retone Cloud provider. Drafts are processed in memory and never stored; see the privacy policy. |
| `identity` | Used only for an optional "Sign in with Google" button that lets a paying user restore their Retone Cloud subscription on a new device. We request only the `openid email` scopes via `launchWebAuthFlow`, and use the returned ID token solely to look up the license tied to that account. No contacts, profile data, or Google services are accessed. |
| 콘텐츠 스크립트 (x.com 등) | Adds a rewrite button next to the compose box and reads only the draft the user explicitly submits for rewriting. |

**원격 코드(Remote code) 사용 여부**: **아니요** — 모든 JS는 패키지에 번들되어 있음 (esbuild, 외부 스크립트 로드 없음).

> ⚠️ **결제 오버레이는 원격 코드가 아니다.** 확장 페이지(`checkout.html`)가 결제사 페이지를
> `<iframe>`으로 띄우지만, 이는 문서 임베드이지 우리 확장 컨텍스트에서 외부 스크립트를
> 실행하는 것이 아니다. manifest 의 `content_security_policy.extension_pages` 에
> `frame-src https://pay.admob.pro` 만 허용했고 `script-src 'self'` 는 그대로다.
> 심사에서 물으면 이 점(스크립트 실행 아님 / 결제는 Lemon Squeezy 가 처리 / 카드정보는
> 확장이 만지지 않음)을 그대로 답한다.

**데이터 사용(Data usage) 체크리스트**: "User activity" 등 수집 항목 **전부 체크 해제**. Cloud 사용 시에도 저장·프로파일링 없이 일시 처리(웹사이트 콘텐츠=사용자가 명시 제출한 초안만 전송)이므로 "Website content" 항목만 상황에 따라 체크 검토 — 체크 시 용도는 "App functionality". 하단의 인증 문구 3개(데이터를 판매하지 않음 등)에 동의 체크.

**개인정보처리방침 URL**:

```
https://retone.dev/privacy.html
```

(저장소 사본: `https://github.com/soulduse/retone/blob/master/PRIVACY.md` — 둘의 내용이 어긋나지 않게 함께 갱신할 것)

## 4. 배포 설정 (Distribution)

- **공개 범위**: 공개(Public) — 신호 측정이 목적이므로. 조용히 시작하려면 '검색 제외(Unlisted)'로 올렸다가 나중에 공개로 전환해도 됨 (재심사 없음)
- **지역**: 전체
- **가격**: 무료

## 5. 심사 노트 (검토자 참고사항)

심사자는 로컬 헬퍼 없이 테스트하므로, 대시보드의 검토자 노트에 아래를 남긴다:

```
This extension rewrites the user's social-media draft into several tones. It works in two modes.

(1) Retone Cloud (easiest way to review — no setup required)
    Open the options page, choose "Retone Cloud (설치 불필요)" as the provider, then go to
    x.com, type a draft in the compose box and click the "Re✦ 다듬기" button next to it.
    Every install gets 5 free rewrites per day with no account and no payment, so the full
    core UX is testable out of the box.

(2) Self-hosted (default)
    The extension talks only to a companion helper app running on the user's own machine
    (open source: https://github.com/soulduse/retone). Without the helper it degrades
    gracefully — the options page shows step-by-step setup instructions.
    To test: `npm install -g retone && retone install`, then open the options page.

Notes on permissions and payments:
- "identity" is used only for an optional "Sign in with Google" button that restores an
  existing paid subscription on another device (scopes: openid email). It is never required
  to use the extension.
- The paid subscription is optional. Checkout is opened in an extension page that embeds our
  payment provider (Lemon Squeezy) in an iframe; the extension never handles card data, and
  no remote scripts are executed in the extension context (script-src is 'self').
- Drafts are processed in memory and are never stored: https://retone.dev/privacy.html
```

## 6. 제출 후

- 심사는 보통 1~3일. `host_permissions`가 localhost뿐이라 광범위 호스트 권한 심사 지연 리스크는 낮다
- 게시되면 스토어 URL을 README의 Install 섹션 상단에 추가 (unpacked 로드 안내는 개발용으로 유지)
- **업데이트 배포**: `version` 올리고 `npm run pack` → 대시보드에서 새 zip 업로드 → 제출 (변경 규모에 따라 자동/수동 심사)

## 자주 걸리는 반려 사유 (Retone 관점 점검)

- ~~원격 코드 로드~~ → 없음 (전부 번들)
- ~~불필요한 권한~~ → storage/clipboardWrite/localhost 3개뿐, 각각 정당화 문구 제출
- ~~단일 목적 위반~~ → 리라이팅 단일 기능
- ~~메타데이터 품질~~ → 설명에 키워드 스팸 금지, 스크린샷 실제 기능 반영
- 설명에 "다른 앱(헬퍼) 설치 필요"를 **명시해야** 함 → 상세 설명의 ⚠ 문단이 그 역할 (숨기면 반려 사유)
