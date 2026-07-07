import type { SiteAdapter } from './sites/types.js';

/**
 * 컴포저 감지: 전역 focusin(주 경로) + 디바운스 MutationObserver(모달 등 포커스 없이 열리는 케이스).
 * onFocus는 사용자가 컴포저에 포커스할 때마다(중복 포함) 호출 — 버튼 앵커 이동용.
 */
export function observeComposers(
  adapter: SiteAdapter,
  onFocus: (composer: HTMLElement) => void,
): void {
  document.addEventListener(
    'focusin',
    (e) => {
      const composer = adapter.findComposer(e.target as Element);
      if (composer) onFocus(composer);
    },
    true,
  );

  let timer: number | undefined;
  const scan = () => {
    // 포커스 없이 등장한 컴포저 중 현재 포커스된 것이 있으면 anchor
    const active = document.activeElement;
    if (active) {
      const composer = adapter.findComposer(active);
      if (composer) onFocus(composer);
    }
  };
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = window.setTimeout(scan, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
}
