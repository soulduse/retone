# Chrome Web Store 배포 가이드

개발자 계정 등록이 끝난 상태를 전제로 한다. 소요 시간: 폼 입력 ~20분 + 심사 대기(보통 1~3일).

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
| `host_permissions (127.0.0.1, localhost)` | Communicates with the Retone helper application that runs on the user's own machine at 127.0.0.1:7386. No remote servers are contacted by the extension. |
| 콘텐츠 스크립트 (x.com 등) | Adds a rewrite button next to the compose box and reads only the draft the user explicitly submits for rewriting. |

**원격 코드(Remote code) 사용 여부**: **아니요** — 모든 JS는 패키지에 번들되어 있음 (esbuild, 외부 스크립트 로드 없음).

**데이터 사용(Data usage) 체크리스트**: 수집 항목 **전부 체크 해제** (개인 통신, 위치, 사용자 활동 등 아무것도 수집하지 않음). 하단의 인증 문구 3개(데이터를 판매하지 않음 등)에 동의 체크.

**개인정보처리방침 URL**:

```
https://github.com/soulduse/retone/blob/master/PRIVACY.md
```

## 4. 배포 설정 (Distribution)

- **공개 범위**: 공개(Public) — 신호 측정이 목적이므로. 조용히 시작하려면 '검색 제외(Unlisted)'로 올렸다가 나중에 공개로 전환해도 됨 (재심사 없음)
- **지역**: 전체
- **가격**: 무료

## 5. 심사 노트 (검토자 참고사항)

심사자는 로컬 헬퍼 없이 테스트하므로, 대시보드의 검토자 노트에 아래를 남긴다:

```
This extension requires a companion helper app running locally (open source: https://github.com/soulduse/retone). Without the helper, the extension degrades gracefully: the options page shows setup instructions and the rewrite panel shows a "helper unreachable" error. It never contacts any remote server — only 127.0.0.1. To fully test: clone the repo, `npm install && npm start`, then open the options page.
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
