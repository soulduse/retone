/**
 * 단일 플로팅 버튼 — 마지막으로 포커스된 컴포저의 우상단에 앵커된다.
 * React 트리 내부에 DOM을 주입하지 않기 위해 Shadow DOM 오버레이에 fixed로 띄운다.
 */
export class RetoneButton {
  private el: HTMLButtonElement;
  private composer: HTMLElement | null = null;
  private raf = 0;

  constructor(root: ShadowRoot, onClick: (composer: HTMLElement) => void) {
    this.el = document.createElement('button');
    this.el.className = 'rt-btn';
    this.el.textContent = 'Re✦';
    this.el.title = 'Retone — 글 다듬기';
    // mousedown에서 포커스 이탈로 컴포저가 접히는 것을 방지
    this.el.addEventListener('mousedown', (e) => e.preventDefault());
    this.el.addEventListener('click', () => {
      if (this.composer) onClick(this.composer);
    });
    root.appendChild(this.el);

    const reposition = () => this.reposition();
    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    setInterval(reposition, 500); // 셀렉터 밖 레이아웃 변화 대비
  }

  attachTo(composer: HTMLElement): void {
    this.composer = composer;
    this.el.classList.add('visible');
    this.reposition();
  }

  current(): HTMLElement | null {
    return this.composer;
  }

  private reposition(): void {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      if (!this.composer || !this.composer.isConnected) {
        this.el.classList.remove('visible');
        return;
      }
      const rect = this.composer.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        this.el.classList.remove('visible');
        return;
      }
      this.el.classList.add('visible');
      const btn = this.el.getBoundingClientRect();
      this.el.style.top = `${Math.max(4, rect.top - 2)}px`;
      this.el.style.left = `${Math.max(4, rect.right - (btn.width || 58) - 4)}px`;
    });
  }
}
