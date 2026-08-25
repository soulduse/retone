# Retone Cloud — 결제 퍼널 구조

확장에서 구독 결제까지 이어지는 경로와, 그 과정에서 반드시 지켜야 하는 제약을 적는다.
서버(라이선스·쿼터·웹훅) 구현은 apis-py `src/apis_py/domains/retone/` 가 정본이다.

## 전체 흐름

```
확장(체험 소진 / 설정 화면)
  └─ open-checkout ──> checkout.html (확장 페이지, 새 탭)
                         └─ iframe: pay.admob.pro (Lemon Squeezy)
                              │  checkout[email] 프리필
                              │  checkout[custom][google_sub]  ← 계정 즉시 바인딩용
                              │  checkout[custom][device_id]   ← 폴백
                              ├─ postMessage "mounted" / "close"
                              └─ postMessage {event:'GA.Purchase'} ── 힌트일 뿐
                                   └─ 확장이 GET /quota 폴링 → plan==='paid' 확인
Lemon Squeezy ──웹훅──> apis-py /webhook/lemonsqueezy
                          └─ 라이선스 발급 + custom_data.google_sub 로 계정 바인딩
```

## 왜 확장 페이지인가 (콘텐츠 스크립트가 아니라)

x.com 의 CSP `frame-src` 화이트리스트에 결제 도메인이 없다. 콘텐츠 스크립트로 x.com 문서에
iframe 을 꽂으면 **브라우저가 차단**한다. 그래서 CSP 를 우리가 통제하는 확장 페이지
(`chrome-extension://…/checkout.html`)를 새 탭으로 열고 그 안에서 결제창을 띄운다.

## 어긋나면 조용히 깨지는 두 값

| 위치 | 값 |
|------|-----|
| `public/manifest.json` → `content_security_policy.extension_pages` 의 `frame-src` | `https://pay.admob.pro` |
| `src/shared/cloud.ts` → `CLOUD_CHECKOUT_ORIGIN` | `https://pay.admob.pro` |

둘이 다르면 **빌드·타입체크·테스트는 전부 통과하고 결제창만 빈 화면**이 된다.
`build.mjs` 의 `assertCheckoutOriginMatchesCsp()` 가 빌드를 깨뜨려 막는다 — 게이트를 지우지 말 것.

`CLOUD_CHECKOUT_ORIGIN` 은 postMessage 의 **origin 검증 기준**이기도 하다.

## 신뢰 경계

결제창이 보내는 `GA.Purchase` 는 iframe 이 만든 값이라 **권한의 근거가 아니다**.
"이제 서버에 물어봐도 된다"는 힌트로만 쓰고, 실제 구독 인정은 서버 라이선스 조회로 확인한다
(`confirmLicense` — 웹훅 도착 시차를 흡수하는 ~30초 폴링).

공식 `lemon.js` 는 `event.origin` 을 검사하지 않는다. 우리는 검사한다 — 검사하지 않으면
아무 프레임이나 "결제 완료" 를 위조해 UI 를 속일 수 있다.

`readIdTokenClaim()`(background.ts)은 **서명을 검증하지 않는다.** 프리필·표시 전용이며,
권한 판단은 서버 `google_verify` 의 몫이다. 이 값을 인가에 쓰지 말 것.

## 구독 버튼 노출 판정

서버가 주는 **에러 코드**로만 판단한다.

| 코드 | 의미 | 구독 버튼 |
|------|------|:---------:|
| `TRIAL_EXHAUSTED` | 체험 소진 — 결제로 해소됨 | 노출 |
| `QUOTA_EXCEEDED` | 유료 일·월 한도 초과 — 결제로 안 풀림 | 숨김 |

🪤 예전에는 에러 **문구**에 '이번 달' 이 들어있는지로 갈랐다. 서버 카피 한 줄만 고쳐도
이미 결제한 사용자에게 "구독하고 계속하기" 가 뜬다 — 문구 기반 판정으로 되돌리지 말 것.

## 상품(variant)

| 플랜 | 가격 | variant | 자동 갱신 |
|------|------|---------|:---------:|
| 월간 | $4.99 | 2055413 | O |
| 연간 | $39.99 | 2055422 | O |
| 3개월 이용권 | $12.99 | 2055423 | X |

가격을 바꾸면 **`site/` 페이지 3곳(index·products·terms)과 `CLOUD_PLANS` 를 함께** 고친다.
표시가와 실제 청구액이 다르면 분쟁 사유가 된다(MoR 이라 세금은 별도 부과 — "VAT 포함" 금지).

## 한도

| 구분 | 한도 | 상수 |
|------|------|------|
| 무료 체험 | 하루 5회 | `TRIAL_DAILY_LIMIT` |
| 구독 | 하루 100회 · 월 3,000회 | `PAID_DAILY_LIMIT` / `PAID_MONTHLY_LIMIT` |

"제한 없이" "무제한" 같은 표현을 쓰지 말 것 — 사실이 아니다.
