/**
 * The last few v2 drawings the game still shows, kept until they are redrawn in the v3 style:
 * the heat lamp ('keep_warm', a HUD icon) and the raid item icons (heal plus, retreat flag,
 * Health Stone, Summon stone). Moved here from the retired v2 sets (src/art props / raid props).
 * Any v3 drawing with the same key wins (see src/scenes/artreg.ts).
 */
import type { ArtAsset } from '../art/types';
import { Doc, P, PW, S, ell, f, hl, poly, rrect } from '../art/svg';
import type { Pt } from '../art/svg';
import { starPts } from '../art/raidkit';

const HW = 48;
const HH = 24;
const CHROME = ['#D5DAE0', '#9AA2AC'] as const;
const CHROME_HI = '#F7F9FB';

function asset(key: string, w: number, h: number, ox: number, oy: number, body: (d: Doc) => string): ArtAsset {
  const d = new Doc(key);
  return { key, svg: d.build(w, h, body(d)), w, h, ox, oy };
}

/** Iso point: i, j in tile units relative to (cx, cy); z up in world units. */
const iso = (cx: number, cy: number, i: number, j: number, z = 0): Pt => [cx + (i - j) * HW, cy + (i + j) * HH - z];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const label = (x: number, y: number, size: number, fill: string, str: string) =>
  `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${f(size)}" fill="${fill}">${esc(str)}</text>`;

export function buildLegacyIcons(): ArtAsset[] {
  const out: ArtAsset[] = [];
  out.push(
    asset('keep_warm', 88, 66, 0.5, 1, (d) => {
      const L = iso(44, 66, -0.38, 0.32);
      const Rt = iso(44, 66, 0.32, -0.38);
      const H = 40;
      let s = '';
      // light cone onto the stove top
      const cone = d.linear(0, 66 - H, 0, 66, [
        [0, '#FF6A2A', 0.42],
        [1, '#FF3B1F', 0],
      ]);
      s += P(`M${f(L[0] + 6)},${f(L[1] - H + 6)}L${f(Rt[0] - 6)},${f(Rt[1] - H + 6)}L${f(Rt[0] + 2)},66L${f(L[0] - 2)},66Z`, cone);
      // heat squiggles
      for (const x of [-16, -4, 8, 20]) s += S(`M${f(44 + x)},${f(52)}q-2,-3 0,-6t0,-6`, 1, '#FFB23D', 'opacity="0.6"');
      // posts
      for (const p of [L, Rt]) {
        s += P(ell(p[0], p[1], 3.6, 1.6), '#5A5F68', 1);
        s += S(`M${f(p[0])},${f(p[1])}V${f(p[1] - H + 2)}`, 4.4) + S(`M${f(p[0])},${f(p[1])}V${f(p[1] - H + 2)}`, 2.2, CHROME[0]) + S(`M${f(p[0] - 0.6)},${f(p[1] - 2)}V${f(p[1] - H + 4)}`, 0.7, CHROME_HI);
      }
      // hood: a long red heat lamp with glowing bulbs underneath
      const y0 = L[1] - H;
      const hood = `M${f(L[0] - 5)},${f(y0 + 4)}L${f(L[0] - 1)},${f(y0 - 6)}H${f(Rt[0] + 1)}L${f(Rt[0] + 5)},${f(y0 + 4)}Z`;
      s += d.shaded(hood, '#E2343B', '#B3263A', PW, [0, -1.6]);
      s += P(`M${f(L[0] - 1)},${f(y0 - 6)}H${f(Rt[0] + 1)}L${f(Rt[0] - 1)},${f(y0 - 8.4)}H${f(L[0] + 1)}Z`, '#F0565C', 1.4);
      s += S(`M${f(L[0] + 2)},${f(y0 - 3)}H${f(Rt[0] - 2)}`, 0.8, '#FF8A8E');
      const glow = d.blur(1.6);
      s += `<g filter="${glow}">${P(rrect(L[0] - 2, y0 + 3, Rt[0] - L[0] + 4, 4, 2), '#FFB23D')}</g>`;
      for (let k = 0; k < 4; k++) {
        const x = lerp(L[0] + 4, Rt[0] - 4, k / 3);
        s += P(ell(x, y0 + 5.2, 4, 1.8), '#FFD873', 0.8, '#B3263A') + P(ell(x, y0 + 4.8, 2, 0.8), '#FFF6D0');
      }
      // label + cord
      s += P(rrect(44 - 9, y0 - 3.6, 18, 5, 1.2), '#2B1B17') + label(44, y0, 3.4, '#FFC23D', 'KEEP WARM');
      s += S(`M${f(Rt[0])},${f(Rt[1] - 10)}q5,1 4,5t5,2`, 1, '#2B2B33');
      return s;
    }),
  );
  out.push(
    asset('fx_heal', 20, 20, 0.5, 1, (d) => {
      const plus = 'M7,1.6H13V7H18.4V13H13V18.4H7V13H1.6V7H7Z';
      return d.shaded(plus, '#5BE08A', '#21A85A', 1.6, [-1, -1]) + hl(8.6, 4.6, 1, 2, 0, 0.8);
    }),
  );
  out.push(
    asset('fx_flag', 28, 28, 0.5, 1, (d) => {
      let s = P(rrect(4.6, 2, 2.8, 25, 1.2), '#A8693A', 1.4) + P(ell(6, 2.2, 2), '#FFC83D', 1.2);
      const flag = 'M7.4,4C12,1.4 15,6.6 19.6,4.4C22,3.4 24,3.4 26,4.6C24.6,8 25.2,12 26.4,15C22,13 19.6,17.4 14.6,16C11.6,15.2 9.6,15.6 7.4,16.8Z';
      s += d.shaded(flag, '#FFFFFF', '#D8DEE6', 1.6, [-0.8, -0.8]);
      s += S('M11,8c3,1.4 6,-1 9,0.6M11,12c3,1.4 5,-1 8,0.4', 0.7, '#B9C2CC');
      return s;
    }),
  );
  out.push(
    asset('fx_headstone', 30, 30, 0.5, 1, (d) => {
      const g = d.radial(15, 14, 15, [
        [0, '#5BE08A', 0.55],
        [1, '#5BE08A', 0],
      ]);
      let s = P(ell(15, 14, 15), g);
      s += P(ell(15, 27.4, 12, 2.6), '#5C3A22', 1.2) + S('M5,27c1,-3 2,-3 3,0M21,27c1,-3 2,-3 3,0', 1, '#7CC24A');
      const stone = 'M6,27V12A9,9 0 0 1 24,12V27Z';
      s += d.shaded(stone, '#B5BBC4', '#8A909A', 1.6, [-1, -1]);
      s += S('M9,13.6a6,6 0 0 1 12,0', 0.8, '#8A909A');
      s += P('M12.6,13.4h4.8v3.4h3.4v4.8h-3.4V25h-4.8v-3.4H9.2v-4.8h3.4Z', '#5BE08A', 1.1, '#0F8F4A');
      s += P(poly(starPts(24.6, 6, 2.8, 1.1)), '#FFFFFF', 0.6) + P(poly(starPts(5, 8, 2, 0.8)), '#FFFFFF', 0.6);
      return s;
    }),
  );
  out.push(
    asset('fx_summon', 30, 30, 0.5, 1, (d) => {
      const g = d.radial(15, 15, 15, [
        [0, '#FF8A1F', 0.55],
        [1, '#FF8A1F', 0],
      ]);
      let s = P(ell(15, 15, 15), g);
      s += P(ell(15, 27.2, 12, 2.6), '#5C3A22', 1.2);
      const stone = 'M7,27L5.6,10C5.6,5 10,2.4 15,2.4C21,2.4 24.4,5.6 24,11L23,27Z';
      s += d.shaded(stone, '#8C8FA0', '#666A7A', 1.6, [-1, -1]);
      s += S('M8,8l3,2M21,20l-2,3', 0.8, '#5A5D6B');
      // glowing hot-dog rune: bun (two lips), sausage poking out both ends, mustard zigzag
      const blurF = d.blur(1.1);
      const rune = 'M9.4,15.6C11,22 19,22 20.6,15.6M9.4,15.6C11,18.2 19,18.2 20.6,15.6M7.4,14.6C7.4,11.6 22.6,11.6 22.6,14.6C22.6,17 7.4,17 7.4,14.6Z';
      s += `<path d="${rune}" fill="none" stroke="#FF8A1F" stroke-width="3" filter="${blurF}"/>`;
      s += P('M7.4,14.6C7.4,11.6 22.6,11.6 22.6,14.6C22.6,17 7.4,17 7.4,14.6Z', '#7A3A1A', 1.1, '#FFE14D');
      s += P('M9.4,15.6C11,22 19,22 20.6,15.6C19,18.2 11,18.2 9.4,15.6Z', '#E8A24E', 1.1, '#FFE14D');
      s += S('M10,13.8l1.6,1.2l1.6,-1.2l1.6,1.2l1.6,-1.2l1.6,1.2l1.6,-1.2', 0.9, '#FFE14D');
      s += S('M12,7l1.4,2.4M18,7l-1.4,2.4M15,5.4v3', 1, '#FFE14D');
      return s;
    }),
  );
  return out;
}
