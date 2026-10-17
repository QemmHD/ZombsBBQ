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

const STAR_PATH = 'M12 1.6l3.2 6.6 7.2 1-5.2 5 1.3 7.2L12 18l-6.5 3.4 1.3-7.2-5.2-5 7.2-1z';

/**
 * One star, the same everywhere (HUD, rating, raid results): gold = earned, a dark hollow outline =
 * not yet, purple = a bonus star. Sized by the surrounding font-size (1em).
 */
export function star(kind: 'on' | 'half' | 'off' | 'purple') {
  const fill = kind === 'on' ? '<path class="st-fill" d="' + STAR_PATH + '"/>' : kind === 'purple' ? '<path class="st-fill" d="' + STAR_PATH + '"/>' : '';
  // half: the gold fill over the left half only (its own polygon, so no clip ids are needed)
  const half = kind === 'half' ? '<path class="st-fill" d="M12 1.6L8.8 8.2 1.6 9.2l5.2 5-1.3 7.2L12 18z"/>' : '';
  const shine = kind === 'on' || kind === 'purple' ? '<path class="st-shine" d="M8.6 9.6l2.4-.4 1-2.2"/>' : '';
  return `<svg class="st ${kind === 'off' ? '' : kind}" viewBox="0 0 24 24" aria-hidden="true"><path class="st-slot" d="${STAR_PATH}"/>${fill}${half}${shine}<path class="st-line" d="${STAR_PATH}"/></svg>`;
}

export function starsHtml(st: number) {
  let h = '';
  for (let i = 1; i <= 5; i++) h += star(st >= i ? 'on' : st >= i - 0.5 ? 'half' : 'off');
  return h;
}

/** Purple bonus stars, drawn after the normal five. */
export function purpleStarsHtml(n: number) {
  let h = '';
  for (let i = 0; i < n; i++) h += star('purple');
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
