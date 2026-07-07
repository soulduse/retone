let el: HTMLDivElement | null = null;
let timer: number | undefined;

export function initToast(root: ShadowRoot): void {
  el = document.createElement('div');
  el.className = 'rt-toast';
  root.appendChild(el);
}

export function showToast(message: string, ms = 2200): void {
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(timer);
  timer = window.setTimeout(() => el?.classList.remove('show'), ms);
}
