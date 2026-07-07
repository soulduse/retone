import { loadState, saveSettings } from '../shared/storage.js';
import { resolvePresets, type Preset } from '../shared/presets.js';
import { errorMessage } from '../shared/errors.js';
import { sendBg } from '../shared/rpc.js';
import type { BgResponse, ErrorCode, Variant } from '../shared/messages.js';
import type { SiteAdapter } from './sites/types.js';
import { insertText, copyText } from './insert.js';
import { showToast } from './toast.js';

const send = (msg: Parameters<typeof sendBg>[0]) => sendBg(msg, 240_000); // rewrite는 오래 걸릴 수 있음

export class RetonePanel {
  private el: HTMLDivElement;
  private body: HTMLDivElement;
  private meta: HTMLSpanElement;
  private composer: HTMLElement | null = null;
  private presets: Preset[] = [];
  private selected = new Set<string>();
  private variants: Variant[] = [];
  private requestId: string | null = null;
  private elapsedTimer: number | undefined;
  private insertMode: 'insert' | 'copy' = 'insert';

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

    const model = state.settings.modelByProvider[state.settings.provider];
    this.meta.textContent = `${state.settings.provider}${model ? ` · ${model}` : ''} ⚙`;

    this.renderIdle();
    this.el.classList.add('visible');
    this.position();
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

    const started = Date.now();
    clearInterval(this.elapsedTimer);
    this.elapsedTimer = window.setInterval(() => {
      label.textContent = `다듬는 중 · ${Math.round((Date.now() - started) / 1000)}s (보통 5~15초)`;
    }, 1000);
    this.position();
  }

  private renderError(code: ErrorCode, detail?: string): void {
    this.body.textContent = '';
    const box = document.createElement('div');
    box.className = 'rt-error';
    box.textContent = `⚠️ ${errorMessage(code, detail)}`;
    const retry = document.createElement('button');
    retry.className = 'rt-primary';
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
    this.position();
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
          showToast('직접 삽입에 실패해 클립보드에 복사했어요 — ⌘V로 붙여넣으세요');
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
