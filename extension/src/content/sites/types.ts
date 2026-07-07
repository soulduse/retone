export interface SiteAdapter {
  site: 'x' | 'threads';
  /** observe.ts가 주기 스캔에 사용하는 컴포저 셀렉터 */
  composerSelector: string;
  /** 임의 요소에서 컴포저 루트를 찾는다 (focusin 경로) */
  findComposer(el: Element): HTMLElement | null;
  getText(composer: HTMLElement): string;
  kind(composer: HTMLElement): 'post' | 'reply';
}
