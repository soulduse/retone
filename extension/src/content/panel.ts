import { loadState, saveSettings } from '../shared/storage.js';
import { resolvePresets, type Preset } from '../shared/presets.js';
import { FALLBACK_PROVIDERS } from '../shared/providers.js';
import { withCloud } from '../shared/cloud.js';
import { errorMessage } from '../shared/errors.js';
import { sendBg } from '../shared/rpc.js';
import type { BgResponse, CloudQuota, ErrorCode, ProviderInfo, Variant } from '../shared/messages.js';
import type { SiteAdapter } from './sites/types.js';
import { insertText, copyText } from './insert.js';
import { showToast } from './toast.js';

const send = (msg: Parameters<typeof sendBg>[0]) => sendBg(msg, 240_000); // rewrite는 오래 걸릴 수 있음

// 헬퍼의 실제 provider 목록 — 페이지 세션 동안 1회만 조회, 실패 시 정적 폴백 사용
let providersCache: ProviderInfo[] | null = null;
async function fetchProviders(): Promise<ProviderInfo[] | null> {
  const res = await sendBg({ type: 'helper-models' }, 8_000);
  if (res.ok && 'data' in res) {
    const data = res.data as { providers?: ProviderInfo[] };
    if (Array.isArray(data?.providers) && data.providers.length > 0) return withCloud(data.providers);
  }
  return null;
}

export class RetonePanel {
  private el: HTMLDivElement;
  private body: HTMLDivElement;
  private meta: HTMLSpanElement;
  private composer: HTMLElement | null = null;
  private presets: Preset[] = [];
  private selected = new Set<string>();
  private variants: Variant[] = [];
  /** Cloud 경로에서만 채워진다 — 결과 하단의 잔여량 표시용. */
  private quota: CloudQuota | null = null;
  private requestId: string | null = null;
  private elapsedTimer: number | undefined;
  private insertMode: 'insert' | 'copy' = 'insert';
  private providers: ProviderInfo[] = withCloud(FALLBACK_PROVIDERS);
  private provider = '';
  private modelByProvider: Record<string, string> = {};

  constructor(
    root: ShadowRoot,
    private adapter: SiteAdapter,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'rt-panel';

    const head = document.createElement('div');
    head.className = 'rt-head';
    const title = document.createElement('span');
    title.className = 'rt-title';
    title.textContent = 'Retone';
    this.meta = document.createElement('span');
    this.meta.className = 'rt-meta';
    this.meta.title = '설정 열기';
    this.meta.onclick = () => send({ type: 'open-options' });
    const close = document.createElement('button');
    close.className = 'rt-close';
    close.textContent = '✕';
    close.onclick = () => this.close();
    head.append(title, this.meta, close);

    this.body = document.createElement('div');
    this.body.className = 'rt-body';

    this.el.append(head, this.body);
    root.appendChild(this.el);

    const reposition = () => this.position();
    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  }

  isOpen(): boolean {
    return this.el.classList.contains('visible');
  }

  async openFor(composer: HTMLElement): Promise<void> {
    this.composer = composer;
    const state = await loadState();
    this.presets = resolvePresets(state.builtinOverrides, state.customPresets);
    this.insertMode = state.settings.insertMode;
    this.selected = new Set(
      state.settings.selectedPresetIds.filter((id) => this.presets.some((p) => p.id === id)),
    );
    if (this.selected.size === 0 && this.presets.length > 0) this.selected.add(this.presets[0].id);

    this.provider = state.settings.provider;
    this.modelByProvider = { ...state.settings.modelByProvider };
    if (providersCache) this.providers = providersCache;
    this.updateMeta();

    this.renderIdle();
    this.el.classList.add('visible');
    this.position();

    // 실제 가용성/모델 목록은 비동기로 갱신 — 도착하면 idle 화면의 셀렉터만 다시 그린다
    if (!providersCache) {
      void fetchProviders().then((list) => {
        if (!list) return;
        providersCache = list;
        this.providers = list;
        if (this.isOpen() && this.body.querySelector('.rt-selects')) this.renderIdle();
      });
    }
  }

  /** 현재 provider의 유효 모델 — 저장값이 없으면 provider 기본값. */
  private currentModel(): string {
    const def = this.providers.find((p) => p.id === this.provider);
    return this.modelByProvider[this.provider] ?? def?.defaultModel ?? '';
  }

  private updateMeta(): void {
    const label = this.providers.find((p) => p.id === this.provider)?.label ?? this.provider;
    const model = this.currentModel();
    this.meta.textContent = `${model ? `${this.provider} · ${model}` : label} ⚙`;
  }

  close(): void {
    if (this.requestId) this.cancel();
    this.el.classList.remove('visible');
  }

  private position(): void {
    if (!this.isOpen() || !this.composer?.isConnected) return;
    const rect = this.composer.getBoundingClientRect();
    const panel = this.el.getBoundingClientRect();
    const width = panel.width || 380;
    const height = panel.height || 300;

    let left = Math.min(rect.left, window.innerWidth - width - 12);
    left = Math.max(12, left);
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, rect.top - height - 8);
    }
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  // ── 상태 렌더링 ──────────────────────────────────────────

  private renderIdle(): void {
    this.body.textContent = '';
    this.body.appendChild(this.buildSelects());

    const chips = document.createElement('div');
    chips.className = 'rt-chips';
    for (const preset of this.presets) {
      const chip = document.createElement('button');
      chip.className = `rt-chip${this.selected.has(preset.id) ? ' on' : ''}`;
      chip.textContent = preset.name;
      chip.onclick = () => {
        if (this.selected.has(preset.id)) this.selected.delete(preset.id);
        else this.selected.add(preset.id);
        chip.classList.toggle('on');
        saveSettings({ selectedPresetIds: [...this.selected] });
      };
      chips.appendChild(chip);
    }
    this.body.appendChild(chips);

    const run = document.createElement('button');
    run.className = 'rt-primary';
    run.textContent = '다듬기';
    run.onclick = () => {
      const chosen = this.presets.filter((p) => this.selected.has(p.id));
      if (chosen.length === 0) {
        showToast('프리셋을 하나 이상 선택하세요');
        return;
      }
      this.run(chosen);
    };
    this.body.appendChild(run);
    this.position();
  }

  /** provider/모델 인라인 셀렉터 — 설정 페이지와 storage로 동기화된다. */
  private buildSelects(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'rt-selects';

    const provSel = document.createElement('select');
    provSel.className = 'rt-select';
    provSel.title = 'AI 프로바이더';
    for (const p of this.providers) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.available ? p.label : `${p.label} — 사용 불가`;
      opt.disabled = !p.available;
      opt.selected = p.id === this.provider;
      provSel.appendChild(opt);
    }
    if (!this.providers.some((p) => p.id === this.provider)) {
      const opt = document.createElement('option');
      opt.value = this.provider;
      opt.textContent = this.provider;
      opt.selected = true;
      provSel.appendChild(opt);
    }

    const modelSel = document.createElement('select');
    modelSel.className = 'rt-select';
    modelSel.title = '모델';
    const fillModels = () => {
      modelSel.textContent = '';
      const models = this.providers.find((p) => p.id === this.provider)?.models ?? [];
      const current = this.currentModel();
      for (const m of models) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        opt.selected = m.id === current;
        modelSel.appendChild(opt);
      }
      if (current && !models.some((m) => m.id === current)) {
        const opt = document.createElement('option');
        opt.value = current;
        opt.textContent = current;
        opt.selected = true;
        modelSel.appendChild(opt);
      }
      // 모델 개념이 없는 provider(Retone Cloud)는 셀렉터 자체를 숨긴다
      modelSel.style.display = modelSel.options.length === 0 ? 'none' : '';
    };
    fillModels();

    provSel.onchange = () => {
      this.provider = provSel.value;
      fillModels();
      if (modelSel.value) this.modelByProvider[this.provider] = modelSel.value;
      void saveSettings({ provider: this.provider, modelByProvider: { ...this.modelByProvider } });
      this.updateMeta();
    };
    modelSel.onchange = () => {
      this.modelByProvider[this.provider] = modelSel.value;
      void saveSettings({ modelByProvider: { ...this.modelByProvider } });
      this.updateMeta();
    };

    row.append(provSel, modelSel);
    return row;
  }

  private renderLoading(): void {
    this.body.textContent = '';
    const row = document.createElement('div');
    row.className = 'rt-loading';
    const spinner = document.createElement('div');
    spinner.className = 'rt-spinner';
    const label = document.createElement('span');
    label.textContent = '다듬는 중 · 0s (보통 5~15초)';
    const cancel = document.createElement('button');
    cancel.className = 'rt-cancel';
    cancel.textContent = '취소';
    cancel.onclick = () => {
      this.cancel();
      this.renderIdle();
    };
    row.append(spinner, label, cancel);
    this.body.appendChild(row);

    // 지연 안내 — CLI provider는 같은 컴퓨터의 다른 AI 작업량에 따라 수십 초까지 늘어질 수 있다
    const hint = document.createElement('div');
    hint.className = 'rt-loading-hint';
    this.body.appendChild(hint);

    const started = Date.now();
    clearInterval(this.elapsedTimer);
    this.elapsedTimer = window.setInterval(() => {
      const s = Math.round((Date.now() - started) / 1000);
      label.textContent = `다듬는 중 · ${s}s${s < 20 ? ' (보통 5~15초)' : ''}`;
      if (s >= 20 && !hint.textContent) {
        hint.textContent = '평소보다 오래 걸리고 있어요 — 이 컴퓨터에서 다른 AI 작업이 실행 중이면 느려질 수 있어요. 취소 후 다른 AI로 바꿔도 돼요.';
        this.position();
      }
    }, 1000);
    this.position();
  }

  private renderError(code: ErrorCode, detail?: string): void {
    this.body.textContent = '';
    const box = document.createElement('div');
    box.className = 'rt-error';
    box.textContent = `⚠️ ${errorMessage(code, detail)}`;

    // 체험 소진은 결제로 바로 이어주는 게 정답 — 설정 화면을 한 단계 거치게 하지 않는다.
    // ⚠️ 판정은 서버가 준 **코드**로만 한다. 예전엔 detail 문구에 '이번 달' 이 들어있는지로
    //    갈랐는데, 서버 카피 한 줄만 바꿔도 이미 결제한 사용자에게 구독 버튼이 뜬다.
    if (code === 'TRIAL_EXHAUSTED') {
      const subscribe = document.createElement('button');
      subscribe.className = 'rt-primary';
      subscribe.textContent = '구독하고 계속하기';
      subscribe.onclick = () => send({ type: 'open-checkout' });
      box.appendChild(subscribe);
    }

    // 설정에서 해결해야 하는 에러는 행동 버튼을 우선 노출
    const fixInOptions = (['HELPER_UNREACHABLE', 'UNAUTHORIZED', 'CLI_NOT_FOUND', 'NO_API_KEY', 'LICENSE_INVALID', 'QUOTA_EXCEEDED', 'TRIAL_EXHAUSTED'] as ErrorCode[]).includes(code);
    if (fixInOptions) {
      const open = document.createElement('button');
      open.className = 'rt-cancel';
      open.textContent = '설정 열기';
      open.onclick = () => send({ type: 'open-options' });
      box.appendChild(open);
    }
    const retry = document.createElement('button');
    retry.className = fixInOptions ? 'rt-cancel' : 'rt-primary';
    retry.textContent = '다시 시도';
    retry.onclick = () => this.renderIdle();
    box.appendChild(retry);
    this.body.appendChild(box);
    this.position();
  }

  private renderResults(): void {
    this.body.textContent = '';
    for (const variant of this.variants) {
      this.body.appendChild(this.buildCard(variant));
    }
    const again = document.createElement('button');
    again.className = 'rt-primary';
    again.textContent = '프리셋 다시 고르기';
    again.onclick = () => this.renderIdle();
    this.body.appendChild(again);

    const quotaLine = this.buildQuotaLine();
    if (quotaLine) this.body.appendChild(quotaLine);
    this.position();
  }

  /**
   * 결과 하단의 잔여량 한 줄. 체험이 얼마 안 남았을 때만 구독 링크를 함께 건다 —
   * 매번 결제를 권하면 도구가 아니라 광고가 된다.
   */
  private buildQuotaLine(): HTMLElement | null {
    const q = this.quota;
    if (!q) return null;

    const line = document.createElement('div');
    line.className = 'rt-quota';
    const scope = q.scope === 'month' ? '이번 달' : '오늘';
    const text = document.createElement('span');
    text.textContent = `${scope} ${q.used.toLocaleString()}/${q.limit.toLocaleString()}회 사용`;
    line.appendChild(text);

    if (q.plan === 'trial' && q.remaining <= 2) {
      const link = document.createElement('button');
      link.className = 'rt-quota-link';
      link.textContent = q.remaining > 0 ? `${q.remaining}회 남음 · 구독하기` : '구독하기';
      link.onclick = () => send({ type: 'open-checkout' });
      line.appendChild(link);
    }
    return line;
  }

  private buildCard(variant: Variant): HTMLElement {
    const preset = this.presets.find((p) => p.id === variant.presetId);
    const card = document.createElement('div');
    card.className = 'rt-card';

    const head = document.createElement('div');
    head.className = 'rt-card-head';
    const badge = document.createElement('span');
    badge.className = 'rt-badge';
    badge.textContent = preset?.name ?? variant.presetId;
    head.appendChild(badge);
    card.appendChild(head);

    const text = document.createElement('div');
    text.className = 'rt-card-text';
    text.textContent = variant.text;
    card.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'rt-card-actions';

    if (this.insertMode === 'insert') {
      const insert = document.createElement('button');
      insert.textContent = '삽입';
      insert.onclick = async () => {
        if (!this.composer?.isConnected) {
          showToast('입력창을 찾을 수 없어 클립보드에 복사했어요');
          await copyText(variant.text);
          return;
        }
        const result = await insertText(this.adapter, this.composer, variant.text);
        if (result === 'inserted') {
          this.close();
          showToast('입력창에 넣었어요 ✓');
        } else if (result === 'copied') {
          showToast('직접 삽입에 실패해 클립보드에 복사했어요 — 전체 선택(⌘A) 후 붙여넣기(⌘V) 하세요');
        } else {
          showToast('삽입과 복사 모두 실패했어요');
        }
      };
      actions.appendChild(insert);
    }

    const copy = document.createElement('button');
    copy.textContent = '복사';
    copy.onclick = async () => {
      showToast((await copyText(variant.text)) ? '클립보드에 복사했어요 ✓' : '복사에 실패했어요');
    };
    actions.appendChild(copy);

    const regen = document.createElement('button');
    regen.textContent = '↻';
    regen.title = '이 프리셋만 다시 생성';
    regen.onclick = async () => {
      if (!preset) return;
      regen.classList.add('busy');
      regen.textContent = '…';
      const res = await this.request([preset]);
      if (res.ok && 'variants' in res && res.variants[0]) {
        const idx = this.variants.findIndex((v) => v.presetId === variant.presetId);
        if (idx >= 0) this.variants[idx] = res.variants[0];
        this.renderResults();
      } else {
        regen.classList.remove('busy');
        regen.textContent = '↻';
        showToast(res.ok ? '재생성에 실패했어요' : errorMessage(res.code, res.detail));
      }
    };
    actions.appendChild(regen);

    card.appendChild(actions);
    return card;
  }

  // ── 요청 처리 ──────────────────────────────────────────

  private async request(presets: Preset[]): Promise<BgResponse> {
    if (!this.composer) return { ok: false, code: 'UNKNOWN' };
    const text = this.adapter.getText(this.composer).trim();
    if (!text) {
      showToast('입력창에 먼저 글을 작성하세요');
      return { ok: false, code: 'BAD_REQUEST', detail: '빈 초안' };
    }
    this.requestId = crypto.randomUUID();
    try {
      return await send({
        type: 'rewrite',
        requestId: this.requestId,
        text,
        presets,
        context: { site: this.adapter.site, kind: this.adapter.kind(this.composer) },
      });
    } finally {
      this.requestId = null;
    }
  }

  private async run(presets: Preset[]): Promise<void> {
    const composer = this.composer;
    if (!composer) return;
    const draft = this.adapter.getText(composer).trim();
    if (!draft) {
      showToast('입력창에 먼저 글을 작성하세요');
      return;
    }

    this.renderLoading();
    const res = await this.request(presets);
    clearInterval(this.elapsedTimer);

    if (!this.isOpen()) return; // 로딩 중 닫힘
    if (!res.ok) {
      if (res.code === 'CANCELLED') this.renderIdle();
      else this.renderError(res.code, res.detail);
      return;
    }
    if (!('variants' in res)) {
      this.renderError('PARSE_ERROR');
      return;
    }
    this.variants = res.variants;
    this.quota = res.quota ?? null;
    this.renderResults();
  }

  private cancel(): void {
    clearInterval(this.elapsedTimer);
    if (this.requestId) {
      send({ type: 'cancel', requestId: this.requestId });
      this.requestId = null;
    }
  }
}
