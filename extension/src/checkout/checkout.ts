import {
  CLOUD_CHECKOUT_ORIGIN,
  CLOUD_PAID_PER_DAY,
  CLOUD_PAID_PER_MONTH,
  CLOUD_PLANS,
  checkoutUrl,
  type CloudPlan,
} from '../shared/cloud.js';
import { sendBg } from '../shared/rpc.js';
import type { CloudIdentity, CloudQuota } from '../shared/messages.js';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

let identity: CloudIdentity | null = null;

/**
 * 화면 전환의 단일 진입점.
 * ⚠️ 구획별 hidden 을 호출부마다 따로 토글하면 반드시 어긋난다 — 실제로 완료 화면을
 *    다시 숨기는 코드가 없어 결제 후 플랜으로 돌아가면 완료 패널이 겹쳐 남았다.
 *    새 구획이 생겨도 여기만 고치면 되도록 한 함수가 전부를 책임진다.
 */
function showStep(step: 'plan' | 'frame' | 'done'): void {
  $('#planStep').hidden = step !== 'plan';
  $('#frameStep').hidden = step !== 'frame';
  $('#doneStep').hidden = step !== 'done';
}

// ── 플랜 선택 ────────────────────────────────────────────────

function renderPlans(): void {
  const host = $('#plans');
  host.textContent = '';
  for (const plan of CLOUD_PLANS) {
    const card = document.createElement('button');
    card.className = `plan-card${plan.id === 'yearly' ? ' featured' : ''}`;
    card.type = 'button';

    if (plan.id === 'yearly') {
      const tag = document.createElement('span');
      tag.className = 'plan-tag';
      tag.textContent = '가장 인기';
      card.appendChild(tag);
    }

    const name = document.createElement('b');
    name.className = 'plan-name';
    name.textContent = plan.label;
    card.appendChild(name);

    const price = document.createElement('div');
    price.className = 'plan-price';
    price.textContent = plan.price;
    card.appendChild(price);

    const note = document.createElement('div');
    note.className = 'plan-note';
    note.textContent = plan.note;
    card.appendChild(note);

    card.onclick = () => openCheckout(plan);
    host.appendChild(card);
  }
}

/** 프리필 안내 — 어느 계정으로 결제가 연결되는지 미리 보여줘야 불안이 줄어든다. */
function renderIdentityNote(): void {
  const note = $('#identityNote');
  if (identity?.email) {
    note.hidden = false;
    note.textContent = `${identity.email} 계정으로 연결됩니다 — 결제 후 바로 사용할 수 있어요.`;
    return;
  }
  note.hidden = false;
  note.textContent =
    '결제에 사용한 이메일로 라이선스 키를 보내드려요. 설정에서 Google 계정을 연결해 두면 키 입력 없이 자동으로 연결됩니다.';
}

// ── 결제창(오버레이) ──────────────────────────────────────────

function openCheckout(plan: CloudPlan): void {
  const frame = $<HTMLIFrameElement>('#checkoutFrame');
  frame.src = checkoutUrl(plan, {
    email: identity?.email ?? undefined,
    googleSub: identity?.googleSub ?? undefined,
    deviceId: identity?.deviceId,
    dark: matchMedia('(prefers-color-scheme: dark)').matches,
  });
  $('#framePlan').textContent = `${plan.label} · ${plan.price}`;
  showStep('frame');
  $('#lead').textContent = '카드 정보는 결제사(Lemon Squeezy)가 직접 처리합니다.';
}

function backToPlans(): void {
  $<HTMLIFrameElement>('#checkoutFrame').src = 'about:blank';
  $('#frameLoading').hidden = false;
  showStep('plan');
  $('#lead').textContent = '플랜을 고르면 결제창이 바로 열려요.';
}

/**
 * 결제창이 부모로 보내는 메시지 처리.
 *
 * ⚠️ **신뢰 경계** — 여기 오는 값은 iframe 이 보낸 것이라 권한 판단의 근거가 될 수 없다.
 *    "GA.Purchase" 는 오직 *서버에 물어볼 때가 됐다* 는 힌트로만 쓰고, 실제 구독 인정은
 *    웹훅으로 발급된 서버 라이선스를 조회해서 확인한다(confirmLicense).
 * ⚠️ 공식 lemon.js 는 event.origin 을 검사하지 않는다 — 우리는 반드시 검사한다.
 *    검사하지 않으면 아무 프레임이나 "결제 완료" 를 위조해 UI 를 속일 수 있다.
 */
function onFrameMessage(event: MessageEvent): void {
  if (event.origin !== CLOUD_CHECKOUT_ORIGIN) return;

  const data = event.data as unknown;
  if (data === 'mounted') {
    $('#frameLoading').hidden = true;
    return;
  }
  if (data === 'close') {
    backToPlans();
    return;
  }
  const eventName = typeof data === 'object' && data !== null ? (data as { event?: string }).event : undefined;
  if (eventName === 'GA.Purchase') void onPurchaseSignal();
}

// ── 결제 후 확정 ──────────────────────────────────────────────

/**
 * 결제 신호를 받은 뒤 실제 라이선스가 붙을 때까지 기다린다.
 *
 * 웹훅 도착과 결제 완료 사이에는 짧은 시차가 있다 — 여기서 곧바로 "구독 완료" 라고
 * 단정하면 사용자가 설정 화면에서 여전히 '무료 체험' 을 보게 된다. 그래서 서버가
 * 유료로 인정할 때까지 폴링하고, 그동안 화면은 "확인 중" 을 유지한다.
 */
let confirming = false;

async function onPurchaseSignal(): Promise<void> {
  // 결제창이 같은 신호를 두 번 보내도 확인 폴링을 두 번 돌리지 않는다
  if (confirming) return;
  confirming = true;

  showStep('done');
  $('#lead').textContent = '';

  const paid = await confirmLicense();
  confirming = false;
  const title = $('#doneTitle');
  const msg = $('#doneMsg');

  if (paid) {
    title.textContent = '구독이 활성화됐어요';
    msg.textContent = `이제 하루 ${CLOUD_PAID_PER_DAY}회 · 월 ${CLOUD_PAID_PER_MONTH.toLocaleString()}회까지 다듬을 수 있어요. X나 Threads로 돌아가면 바로 적용돼 있어요.`;
    $('#doneClose').hidden = false;
  } else {
    title.textContent = '결제는 완료됐어요';
    msg.textContent =
      '구독 반영에 잠시 시간이 걸리고 있어요. 결제에 사용한 이메일로 라이선스 키를 보내드리니, 설정에서 키를 넣거나 Google 계정으로 연결해 주세요.';
    $('#doneOptions').hidden = false;
  }
}

/** Google 로그인으로 이미 계정이 붙어 있으면 키를 자동으로 되찾아 온다. */
async function refetchLicenseIfLinked(): Promise<void> {
  if (!identity?.googleSub) return;
  await sendBg({ type: 'cloud-google-signin' });
}

async function confirmLicense(): Promise<boolean> {
  // 웹훅 지연을 흡수하는 짧은 폴링 — 간격을 늘려가며 최대 ~30초.
  const delays = [1500, 2000, 3000, 4000, 5000, 6000, 8000];
  for (const wait of delays) {
    const res = await sendBg({ type: 'cloud-quota' });
    if (res.ok && 'data' in res && (res.data as CloudQuota).plan === 'paid') return true;
    await new Promise((r) => setTimeout(r, wait));
    // 키가 계정에 붙었는데 확장이 아직 모르는 경우가 있다 — 중간에 한 번 되찾아 본다.
    if (wait === 3000) await refetchLicenseIfLinked();
  }
  const final = await sendBg({ type: 'cloud-quota' });
  return final.ok && 'data' in final && (final.data as CloudQuota).plan === 'paid';
}

// ── 초기화 ────────────────────────────────────────────────────

async function init(): Promise<void> {
  const res = await sendBg({ type: 'cloud-identity' });
  if (res.ok && 'data' in res) identity = res.data as CloudIdentity;

  renderPlans();
  renderIdentityNote();

  $('#backToPlans').onclick = backToPlans;
  $('#doneClose').onclick = () => window.close();
  $('#doneOptions').onclick = () => void sendBg({ type: 'open-options' });
  window.addEventListener('message', onFrameMessage);

  // 특정 플랜으로 곧장 들어온 경우(한도 초과 배너 등) 바로 결제창을 연다
  const requested = new URLSearchParams(location.search).get('plan');
  const plan = CLOUD_PLANS.find((p) => p.id === requested);
  if (plan) openCheckout(plan);
}

void init();
