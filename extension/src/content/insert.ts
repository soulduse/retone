import type { SiteAdapter } from './sites/types.js';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function verify(adapter: SiteAdapter, composer: HTMLElement, text: string): boolean {
  const current = norm(adapter.getText(composer));
  const target = norm(text);
  return current.includes(target.slice(0, Math.min(40, target.length)));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function selectAll(composer: HTMLElement): void {
  composer.focus();
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(composer);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** 1) 합성 paste → 2) execCommand insertText → 3) 클립보드 복사. */
export async function insertText(
  adapter: SiteAdapter,
  composer: HTMLElement,
  text: string,
): Promise<'inserted' | 'copied' | 'failed'> {
  if (composer.isConnected) {
    // 1단계: 합성 paste — Draft.js/Lexical 모두 paste 핸들러로 내부 상태를 갱신한다
    try {
      selectAll(composer);
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      composer.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      );
      await wait(150);
      if (verify(adapter, composer, text)) return 'inserted';
    } catch { /* 다음 단계 */ }

    // 2단계: execCommand — deprecated지만 beforeinput/input을 발생시켜 수용되는 경우가 많다
    try {
      selectAll(composer);
      document.execCommand('insertText', false, text);
      await wait(150);
      if (verify(adapter, composer, text)) return 'inserted';
    } catch { /* 다음 단계 */ }
  }

  // 3단계: 클립보드 폴백 — 사용자는 항상 결과를 얻는다
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
