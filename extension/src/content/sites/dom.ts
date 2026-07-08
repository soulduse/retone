/**
 * 컴포저 텍스트 읽기 — textContent 대신 DOM을 직접 걷는다.
 * X(Draft.js)는 이모지를 <img alt="😄">로 치환하므로 textContent만 보면 이모지가 누락되어
 * 삽입 검증이 어긋난다. IMG는 alt로, BR/블록 경계는 개행으로 복원한다.
 */
export function readComposerText(root: HTMLElement): string {
  let out = '';
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.nodeValue ?? '';
      return;
    }
    if (node instanceof HTMLElement) {
      if (node.tagName === 'IMG') {
        out += (node as HTMLImageElement).alt ?? '';
        return;
      }
      if (node.tagName === 'BR') {
        out += '\n';
        return;
      }
    }
    node.childNodes.forEach(walk);
  };
  walk(root);
  return out;
}
