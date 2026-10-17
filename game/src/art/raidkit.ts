/**
 * Text and star helpers shared by the HUD icons (src/art3/ui3.ts) and the older icons still in use
 * (src/art3/legacyicons.ts). The rest of the v2 raid kit went with the v2 art.
 */
import { OUT, f } from './svg';
import type { Pt } from './svg';

export const FONT = `font-family="'Arial Black', 'Arial Rounded MT Bold', Arial, Helvetica, sans-serif" font-weight="900"`;

/** Chunky outlined text. */
export function txt(
  x: number,
  y: number,
  s: string,
  size: number,
  fill: string,
  o: { stroke?: string; sw?: number; anchor?: 'start' | 'middle' | 'end'; ls?: number; extra?: string; italic?: boolean } = {},
): string {
  const st = o.sw ? ` stroke="${o.stroke ?? OUT}" stroke-width="${f(o.sw)}" paint-order="stroke" stroke-linejoin="round"` : '';
  const ls = o.ls ? ` letter-spacing="${f(o.ls)}"` : '';
  const it = o.italic ? ' font-style="italic"' : '';
  return `<text x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor ?? 'middle'}" ${FONT} font-size="${f(size)}"${ls}${it}${st} fill="${fill}"${o.extra ? ' ' + o.extra : ''}>${s}</text>`;
}

/** Star polygon points. */
export function starPts(cx: number, cy: number, r1: number, r2: number, n = 5, rot = -Math.PI / 2): Pt[] {
  const pts: Pt[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = rot + (k / (n * 2)) * Math.PI * 2;
    const r = k % 2 ? r2 : r1;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
