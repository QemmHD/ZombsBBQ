/** Small DOM helpers shared by the HUD modules. */
import { artUrl } from '../scenes/assets';

export const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

export const fmtTime = (sec: number) => {
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, '0')}s`;
  return `${Math.floor(sec / 3600)}h ${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}m`;
};

export const energyColor = (f: number) => (f > 0.5 ? '#7a9a32' : f > 0.25 ? '#c9a63a' : '#a3342a');

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** <img> for a UI icon / prop key. */
export const icon = (key: string, cls = 'ico') => {
  const u = artUrl(key);
  return u ? `<img class="${cls}" src="${u}" alt="" draggable="false"/>` : '';
};

export function priceHtml(p: { cash?: number; sauce?: number }) {
  if (p.sauce) return `${icon('ui_sauce', 'ico-s')}${p.sauce}`;
  return `${icon('ui_cash', 'ico-s')}${fmt(p.cash ?? 0)}`;
}

export function starsHtml(st: number) {
  let h = '';
  for (let i = 1; i <= 5; i++) h += st >= i ? '<b class="st on">★</b>' : st >= i - 0.5 ? '<b class="st half">★</b>' : '<b class="st">★</b>';
  return h;
}

/** Wire every [data-a] inside root to handler(action, element). */
export function bindActions(root: HTMLElement, handler: (a: string, el: HTMLElement) => void) {
  root.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      handler(b.dataset.a!, b);
    };
  });
}
