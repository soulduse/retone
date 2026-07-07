import type { SiteAdapter } from './types.js';

// X(트위터)는 Draft.js 기반. data-testid는 tweetTextarea_0, tweetTextarea_1(스레드 추가글),
// 답글 모달 등 suffix가 달라지므로 prefix 매칭으로 커버한다.
const SELECTOR = 'div[data-testid^="tweetTextarea_"][contenteditable="true"]';

export const xAdapter: SiteAdapter = {
  site: 'x',
  composerSelector: SELECTOR,

  findComposer(el) {
    return el.closest?.(SELECTOR) as HTMLElement | null;
  },

  getText(composer) {
    return composer.textContent ?? '';
  },

  kind() {
    // 상세(스레드) 페이지에서 열리는 컴포저는 대부분 답글
    return location.pathname.includes('/status/') ? 'reply' : 'post';
  },
};
