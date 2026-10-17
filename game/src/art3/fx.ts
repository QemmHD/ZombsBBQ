/**
 * In-world FX v3 — little icons floated over heads and items: cash ready to collect, a full cash item,
 * thought bubbles, mood faces, stink lines and so on. Muted like everything else, but with clear INK
 * outlines and one strong accent each so they read over a busy joint.
 *
 * FRAME: every key is FX_W x FX_H (26 x 26), anchor (0.5, 1) = bottom-centre, which sits on the point the
 * scene floats it above. `bubble_think`, `bubble_check` and `fx_daydream` are BUBBLE_W x BUBBLE_H (34 x 30), same anchor;
 * `bubble_think`'s cloud is empty in the middle — the scene draws a dish icon centred at BUBBLE_SLOT.
 */
import type { ArtAsset } from '../art/types';
import type { Doc, Pt } from '../art/svg';
import { f, poly } from '../art/svg';
import { F, INK, L, asset, blob, dot, rnd, speckle } from './kit';
import { brain, cel, fly, gloss, rell } from './dishes';

export const FX_W = 26;
export const FX_H = 26;
export const BUBBLE_W = 34;
export const BUBBLE_H = 30;
/** Centre of the empty space inside `bubble_think`, in image pixels (the dish icon goes here, ~22 px wide). */
export const BUBBLE_SLOT = { x: 17, y: 11.5, w: 24, h: 15 };

export const FX3_KEYS = [
  'fx_cash', 'fx_full', 'bubble_think', 'face_happy', 'face_angry', 'face_sleep',
  'fx_skull', 'fx_sweat', 'fx_heart', 'fx_hit', 'fx_lock', 'fx_star', 'fx_stink', 'fx_daydream', 'bubble_check',
] as const;
export type Fx3Key = (typeof FX3_KEYS)[number];

const fx = (key: Fx3Key, body: (d: Doc) => string): ArtAsset => asset(key, FX_W, FX_H, 0.5, 1, body);

/** Outlined stroke: ink underlay, colour on top (for glyphs drawn as strokes). */
function inked(path: string, w: number, col: string, ink = 1.1, extra = ''): string {
  return L(path, w + ink * 2, INK, extra) + L(path, w, col, extra);
}

/** Spiky burst polygon. */
function burst(cx: number, cy: number, ro: number, ri: number, n: number, seed: number, sy = 1): string {
  const r = rnd(seed);
  const pts: Pt[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = (k % 2 ? ri : ro) * (0.9 + r() * 0.1);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy]);
  }
  return poly(pts);
}

/** Lumpy thought cloud: scalloped ellipse built from outward arcs. */
function cloud(cx: number, cy: number, rx: number, ry: number, n: number, seed: number): string {
  const r = rnd(seed);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.2;
    const m = 0.94 + r() * 0.1;
    pts.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
  }
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let k = 0; k < n; k++) {
    const p = pts[(k + 1) % n];
    const q = pts[k];
    const rad = (Math.hypot(p[0] - q[0], p[1] - q[1]) / 2) * (1.02 + r() * 0.12);
    d += `A${f(rad)},${f(rad)} 0 0 1 ${f(p[0])},${f(p[1])}`;
  }
  return d + 'Z';
}

function bubbleBase(d: Doc, seed: number): string {
  const c = cloud(17, 11.6, 14.4, 9.6, 11, seed);
  // the original's thought cloud: clean white with a blue outline
  const BLUE = '#7799CD';
  let s = F(c, '#140E08', 0, 'opacity="0.2" transform="translate(0.9 1.1)"');
  s += F(c, '#FFFFFF');
  s += d.clip(c, F(blob(24, 18, 7, 4, seed + 4, 8, 0.5), '#DCE6F4', 0, 'opacity="0.6"'));
  s += L(c, 1.3, BLUE);
  // trailing puffs down to the anchor
  const p1 = rell(14.8, 24.4, 2.3, 1.9, 0, 14);
  const p2 = rell(16.4, 28, 1.3, 1.1, 0, 12);
  s += F(p1, '#FFFFFF', 0) + L(p1, 0.95, BLUE) + F(p2, '#FFFFFF', 0) + L(p2, 0.85, BLUE);
  return s;
}

/** Shared face disc: shaded sphere, grime freckles. */
function faceDisc(d: Doc, base: string, mid: string, dark: string, seed: number): { s: string; disc: string } {
  const disc = rell(13, 13.6, 11.2, 11.2, 0, 32);
  let s = F(rell(13.6, 14.4, 11.2, 11.2, 0, 32), '#140E08', 0, 'opacity="0.25"');
  s += F(disc, d.radial(9.4, 9.6, 15, [[0, base], [0.55, mid], [1, dark]]));
  s += speckle(d, disc, [1, 2, 24, 24], 16, [dark, '#5E5232'], seed, 0.25, 0.6, 0.45);
  return { s, disc };
}

const BUILD: Record<Fx3Key, () => ArtAsset> = {
  fx_cash: () =>
    fx('fx_cash', (d) => {
      // a fat green dollar sign with a dark outline, a soft glow so it pops off the floor
      let s = F(rell(13, 13.4, 11, 11.4, 0, 24), d.radial(13, 13.4, 12, [[0, '#B8E07A', 0.45], [1, '#B8E07A', 0]]));
      const S = 'M18.4,7.4C17.2,4.4 8.6,4 8.6,8.8C8.6,13.6 18.4,12 18.4,17.6C18.4,22.6 9.4,22.4 7.8,18.8';
      const bar = 'M13.4,2.4L13.4,24';
      s += L(S, 6.6, INK) + L(bar, 4.4, INK);
      s += L(bar, 2.4, '#3E6A1E') + L(S, 4.4, '#3E6A1E');
      s += L(bar, 1.6, '#6EA03A', 'transform="translate(-0.3 -0.2)"') + L(S, 3.2, '#6EA03A', 'transform="translate(-0.4 -0.4)"');
      s += L('M17,6.2C15.4,4.6 10.6,4.6 10,7.6', 0.9, '#C4E08A', 'opacity="0.9"') + L('M11.4,12.6C13.6,13.6 16.6,14.4 16.8,16.8', 0.7, '#C4E08A', 'opacity="0.7"');
      s += dot(12.8, 3.6, 0.45, '#C4E08A', 0.9);
      return s;
    }),
  fx_full: () =>
    fx('fx_full', (d) => {
      // the cash item is full: a yellow "!" on a muted red burst
      const b = burst(13, 13.6, 12, 8, 11, 5);
      let s = F(b, '#140E08', 0, 'opacity="0.25" transform="translate(0.8 1)"');
      s += F(b, d.radial(10, 9.6, 15, [[0, '#C04A36'], [0.6, '#9A3226'], [1, '#6A1E16']]), 1.1);
      s += L(burst(13, 13.6, 9, 6.2, 11, 5), 0.5, '#D86A4A', 'opacity="0.6"');
      const ex = 'M11.1,4.8L15.5,4.6L14.2,15.6L12.4,15.6Z';
      s += F(ex, '#E6C044', 1.1);
      s += F('M11.9,5.4L13.6,5.3L12.9,14.6Z', '#F6DE84', 0, 'opacity="0.8"');
      s += F(rell(13.3, 19.6, 2, 1.9, 0, 16), '#E6C044', 1.1);
      s += gloss(12.7, 19, 0.7, 0.45, -20, 0.7);
      return s;
    }),
  bubble_think: () => asset('bubble_think', BUBBLE_W, BUBBLE_H, 0.5, 1, (d) => bubbleBase(d, 11)),
  bubble_check: () =>
    asset('bubble_check', BUBBLE_W, BUBBLE_H, 0.5, 1, (d) => {
      // a dish is ready: the white bubble with a fat green tick in it
      let s = bubbleBase(d, 37);
      const tick = 'M10.2,11.6L15,16.2L24.4,6.4';
      s += L(tick, 5.4, INK, 'stroke-linejoin="round"');
      s += L(tick, 3.4, '#5E9A2A', 'stroke-linejoin="round"');
      s += L('M11.4,11.4L15,14.8L23.6,6.2', 1.1, '#B4DC78', 'stroke-linejoin="round" opacity="0.8"');
      return s;
    }),
  fx_daydream: () =>
    asset('fx_daydream', BUBBLE_W, BUBBLE_H, 0.5, 1, (d) => {
      let s = bubbleBase(d, 23);
      s += brain(d, 17, 11.8, 9, 6, 31, 0.8);
      // drool of longing
      s += F('M24.6,14.2q0.8,1.6 0.3,3q-0.6,0.5 -0.9,-0.3q0,-1.4 0.6,-2.7Z', '#A8C8C8', 0.4, 'opacity="0.9"');
      return s;
    }),
  face_happy: () =>
    fx('face_happy', (d) => {
      // a yellow grin: heavy-lidded, gap-toothed, a bit of drool
      const { s: base, disc } = faceDisc(d, '#FEDE58', '#E8C23E', '#A0801E', 41);
      let s = base;
      let inner = '';
      // eyes: half shut, smug
      for (const x of [8.6, 17]) {
        inner += F(rell(x, 10.6, 2.6, 1.9, 0, 16), '#EEE6C8', 0.6);
        inner += dot(x + 0.5, 11.2, 1.05, INK);
        inner += F(`M${f(x - 2.9)},${f(10.9)}C${f(x - 2.6)},${f(8)} ${f(x + 2.6)},${f(8)} ${f(x + 2.9)},${f(10.6)}Q${f(x)},${f(9.8)} ${f(x - 2.9)},${f(10.9)}Z`, '#B8922E', 0.6);
        inner += L(`M${f(x - 1.8)},${f(13.4)}Q${f(x)},${f(14.2)} ${f(x + 1.8)},${f(13.2)}`, 0.45, '#7A5A1A'); // eye bags
      }
      // wide crooked grin
      const mouth = 'M4.6,15.4C6.6,18.4 9.6,21.4 13.4,21.2C17.6,21 20.4,18 21.8,14.4C17,16.6 9.8,16.8 4.6,15.4Z';
      inner += F(mouth, '#3A1A10', 0.8);
      inner += d.clip(mouth, F('M5,15.4C9.8,17 17,16.8 21.8,14.4L21.4,16.6C16.6,18.4 9.6,18.4 5.4,17Z', '#E2D8B6') + L('M8.4,16.2L8.6,18.2M11.6,16.6L11.6,18.6M17.8,16.2L17.4,18.2', 0.35, '#7A6A4A') + F('M14,16.5L16,16.4L15.8,18.4L14.2,18.4Z', '#3A1A10') + F(rell(14.2, 21, 3.4, 1.8, 0, 14), '#9A4A44'));
      inner += L(mouth, 0.8);
      // drool
      inner += F('M20.6,17.2q0.9,2 0.4,3.6q-0.7,0.6 -1,-0.3q0,-1.8 0.6,-3.3Z', '#B8D0C8', 0.35, 'opacity="0.9"');
      // cheek lines + a wart
      inner += L('M3.6,13.8q0.8,0.8 0.8,1.8M22.2,12.8q-0.6,1 -0.4,2', 0.5, '#7A5A1A');
      inner += F(rell(19.6, 6.4, 0.75, 0.7, 0, 10), '#B0922E', 0.35);
      s += inner;
      s += gloss(8, 5.6, 3.2, 1.4, -30, 0.35);
      s += L(disc, 1.15);
      return s;
    }),
  face_angry: () =>
    fx('face_angry', (d) => {
      // blue, scowling, gritted teeth and a popping vein
      const { s: base, disc } = faceDisc(d, '#48C2F9', '#2E9AD2', '#1A6494', 43);
      let s = base;
      for (const [x, dir] of [[8.6, 1], [17.4, -1]] as [number, number][]) {
        s += F(rell(x, 11.4, 2.3, 1.5, dir * 8, 14), '#E6E2CC', 0.55);
        s += dot(x + dir * 0.6, 11.6, 0.95, INK);
        // brows crashing down toward the nose
        s += F(`M${f(x - dir * 3.4)},${f(7.8)}L${f(x + dir * 3)},${f(10.2)}L${f(x + dir * 3.2)},${f(11.2)}L${f(x - dir * 3.2)},${f(9.4)}Z`, '#1E2A36', 0.5);
      }
      // gritted teeth in a frown
      const m = 'M6.4,19.8C7,16.6 19,16.6 19.6,19.8C17,18.8 9,18.8 6.4,19.8Z';
      const teeth = 'M7.2,18.4C9.6,17.2 16.4,17.2 18.8,18.4L18.9,20.2C16,19.4 10,19.4 7.1,20.2Z';
      s += F(teeth, '#E2DCC2', 0.7);
      s += L('M9.4,17.8L9.4,19.8M11.6,17.5L11.6,19.5M13.8,17.5L13.8,19.5M16,17.6L16,19.6M7.2,19.1Q13,18.2 18.8,19.2', 0.4, '#5E5A48');
      s += L(m, 0.45, '#1E2A36', 'opacity="0.6"');
      // frown creases
      s += L('M4.8,17.6q0.8,1.6 2,2.6M21.2,17.4q-0.8,1.6 -2,2.6', 0.5, '#1E2A36');
      // vein mark
      s += L('M18.6,3.6l0.8,1.8l1.8,0.2M23.4,5.4l-1.8,0.4l-0.4,1.8M21.6,9.4l-0.6,-1.8l-1.8,-0.4', 1.2, '#A8322A');
      s += gloss(7.6, 5.6, 3, 1.3, -30, 0.3);
      s += L(disc, 1.15);
      return s;
    }),
  face_sleep: () =>
    fx('face_sleep', (d) => {
      // "Zzz" — three slab-serif Zs drifting up and to the right
      const z = (x: number, y: number, w: number, h: number, t: number) =>
        poly([
          [x, y], [x + w, y], [x + w, y + t], [x + t * 1.3, y + h - t], [x + w, y + h - t], [x + w, y + h],
          [x, y + h], [x, y + h - t], [x + w - t * 1.3, y + t], [x, y + t],
        ]);
      const fill = d.linear(0, 2, 0, 25, [[0, '#D8E0E4'], [1, '#8EA0AC']]);
      let s = '';
      for (const [x, y, w, h, t, rot] of [[2.4, 14, 10, 10, 2.6, -8], [12.4, 6.6, 7, 7, 2, -4], [19, 1.4, 5, 5, 1.6, 4]] as [number, number, number, number, number, number][]) {
        const p = z(x, y, w, h, t);
        const tr = `rotate(${f(rot)} ${f(x + w / 2)} ${f(y + h / 2)})`;
        s += `<g transform="${tr}">${F(p, '#140E08', 0, 'opacity="0.25" transform="translate(0.7 0.8)"')}${F(p, fill, 1)}${L(`M${f(x + 0.6)},${f(y + 0.7)}L${f(x + w - 0.6)},${f(y + 0.7)}`, 0.5, '#FFFFFF', 'opacity="0.6"')}</g>`;
      }
      return s;
    }),
  fx_skull: () =>
    fx('fx_skull', (d) => {
      const cr = 'M4.4,12.4C4,6 8.2,2.4 13,2.4C17.8,2.4 22,6 21.6,12.4C21.4,15 20.2,16 19.2,16.6L19,20.6L7,20.6L6.8,16.6C5.6,16 4.6,15 4.4,12.4Z';
      let s = F(cr, '#140E08', 0, 'opacity="0.25" transform="translate(0.8 1)"');
      s += cel(d, cr, '#DCD3B4', '#A89C78', 0, [-1.2, -1.2]);
      s += d.clip(cr, F(blob(19, 9, 3, 4, 51, 6, 0.4), '#8A7A50', 0, 'opacity="0.3"') + speckle(d, cr, [4, 2, 18, 19], 14, ['#8A7A50', '#6E6040'], 52, 0.25, 0.5, 0.6));
      s += L(cr, 1.15);
      // sockets, nose, teeth
      s += F(blob(9.4, 11.6, 2.6, 2.4, 53, 7, 0.25), '#2A2018', 0.6) + F(blob(16.6, 11.6, 2.6, 2.4, 54, 7, 0.25), '#2A2018', 0.6);
      s += dot(9.8, 11.8, 0.6, '#DECC54', 0.85) + dot(16.2, 11.8, 0.6, '#DECC54', 0.85);
      s += F('M13,14L11.8,16.6L14.2,16.6Z', '#2A2018', 0.4);
      s += F('M7.4,18.4L18.6,18.4L18.6,22.8Q13,24 7.4,22.8Z', '#D2C8A6', 0.8);
      s += L('M9.6,18.4V23.2M12,18.4V23.5M14.4,18.4V23.5M16.6,18.4V23.2M7.6,20.6H18.4', 0.45);
      s += F('M14.4,20.6L16.6,20.6L16.6,23.2L14.4,23.4Z', '#2A2018'); // missing tooth
      // crack in the dome
      s += L('M14.6,2.6L13.8,5L15.2,6.4L14.2,8.4', 0.55);
      s += gloss(8.6, 5.6, 2.4, 1, -35, 0.45);
      return s;
    }),
  fx_sweat: () =>
    fx('fx_sweat', (d) => {
      const drop = 'M13,3C15.8,8.4 19.6,12 19.6,16.6C19.6,20.6 16.6,23.4 13,23.4C9.4,23.4 6.4,20.6 6.4,16.6C6.4,12 10.2,8.4 13,3Z';
      let s = F(drop, '#140E08', 0, 'opacity="0.22" transform="translate(0.8 0.9)"');
      s += cel(d, drop, '#8EB4C8', '#527E98', 0, [-1.2, -1.2]);
      s += F(blob(15, 19.8, 3, 1.6, 61, 6, 0.4), '#3E6A84', 0, 'opacity="0.35"');
      s += L(drop, 1.1);
      s += F('M10.2,14.8C10.4,12.6 11.4,11 12.4,9.6C12.4,11.6 11.6,13.4 11.4,15.4C11.2,16.4 10.2,16.2 10.2,14.8Z', '#E8F2F4', 0, 'opacity="0.85"');
      // flicked droplets
      s += F(rell(21.6, 7.2, 1.3, 1.6, 30, 12), '#8EB4C8', 0.7) + F(rell(4.4, 8.6, 1, 1.25, -30, 12), '#8EB4C8', 0.6);
      s += L('M20,4.2l-1,-1.2M23.4,4.8l0.8,-1.4M5.6,5.6l0.8,-1.2', 0.6, '#527E98');
      return s;
    }),
  fx_heart: () =>
    fx('fx_heart', (d) => {
      // a lumpy, stitched-together heart
      const h = 'M13,23.4C9,20 3,15.6 3,9.8C3,6.2 5.6,3.6 8.6,3.6C10.6,3.6 12.2,4.8 13,6.6C13.8,4.8 15.4,3.6 17.4,3.6C20.4,3.6 23,6.2 23,9.8C23,15.6 17,20 13,23.4Z';
      let s = F(h, '#140E08', 0, 'opacity="0.25" transform="translate(0.8 1)"');
      s += cel(d, h, '#B23E42', '#782228', 0, [-1.3, -1.3]);
      s += d.clip(h, F(blob(18.4, 15, 3, 2, 71, 6, 0.4), '#5A1A1E', 0, 'opacity="0.45"') + L('M5,9.4Q7.6,11 6.6,14.4M19.6,6.8Q18,9 19.4,11.4', 0.5, '#6A1E26', 'opacity="0.7"'));
      s += L(h, 1.15);
      // stitches down the middle
      s += L('M13,6.8L12.2,10.2L13.6,13.6L12.6,17L13,21.2', 0.6, '#3A1014');
      for (const [x, y] of [[12.6, 8.4], [12.9, 11.8], [13.1, 15.2], [12.8, 18.8]] as Pt[]) s += L(`M${f(x - 1.5)},${f(y - 0.6)}L${f(x + 1.5)},${f(y + 0.6)}`, 0.55, '#D8D0B8');
      s += gloss(7.4, 7.2, 2, 1, -35, 0.5);
      return s;
    }),
  fx_hit: () =>
    fx('fx_hit', (d) => {
      // a muted comic "POW"
      const b = burst(13, 13.4, 12.6, 8.2, 9, 81, 0.92);
      let s = F(b, '#140E08', 0, 'opacity="0.22" transform="translate(0.8 0.9)"');
      s += F(b, d.radial(10, 10, 15, [[0, '#D89A48'], [1, '#9A5E28']]), 1.1);
      s += F(burst(13, 13.4, 9.6, 6.4, 9, 82, 0.92), '#E2C468', 0.5);
      // letters as strokes
      const P = 'M4.6,17.6V9.4H7.6Q9.6,9.4 9.6,11.6Q9.6,13.8 7.6,13.8H4.6';
      const O = 'M13.4,9.2C11.2,9.2 10.8,11.6 10.8,13.4C10.8,15.4 11.4,17.6 13.4,17.6C15.4,17.6 16,15.4 16,13.4C16,11.6 15.6,9.2 13.4,9.2Z';
      const W = 'M16.8,9.4L18.2,17.4L19.6,12.4L21,17.4L22.4,9.4';
      const g = (p: string) => inked(p, 1.9, '#F2EAD0', 0.75);
      s += `<g transform="rotate(-8 13 13)">${g(P)}${g(O)}${g(W)}</g>`;
      return s;
    }),
  fx_lock: () =>
    fx('fx_lock', (d) => {
      const sh = 'M8,12.4V8.6C8,4.8 10.2,2.8 13,2.8C15.8,2.8 18,4.8 18,8.6V12.4';
      let s = inked(sh, 2.4, '#8E918A', 0.8) + L('M9.2,11.6V8.6C9.2,5.6 10.8,4.1 12.8,4', 0.6, '#D4D8D0', 'opacity="0.8"');
      const body = 'M5.2,12.2Q5.2,11 6.4,11H19.6Q20.8,11 20.8,12.2V22.4Q20.8,23.6 19.6,23.6H6.4Q5.2,23.6 5.2,22.4Z';
      s += F(body, '#140E08', 0, 'opacity="0.25" transform="translate(0.8 1)"');
      s += F(body, d.linear(5, 11, 21, 24, [[0, '#D0A850'], [0.5, '#A8822E'], [1, '#6E5218']]));
      s += d.clip(body, speckle(d, body, [5, 11, 16, 13], 14, ['#5E4412', '#7A5A2A'], 91, 0.25, 0.6, 0.7) + L('M6.6,16.4l3,-1.2M15.4,21.4l3.2,-1', 0.4, '#E6CC88', 'opacity="0.6"') + F(blob(18.4, 20.4, 2.4, 1.6, 92, 6, 0.6), '#5A6A4A', 0, 'opacity="0.45"'));
      s += L(body, 1.1);
      s += L('M6.4,12.6H19.2', 0.6, '#E6CC88', 'opacity="0.7"');
      s += F('M13,15C14.2,15 14.8,15.8 14.6,16.8C14.5,17.4 14,17.7 13.7,17.9L14.2,20.6H11.8L12.3,17.9C11.9,17.7 11.4,17.3 11.4,16.6C11.4,15.6 12,15 13,15Z', '#1E180E', 0.4);
      for (const [x, y] of [[7, 13.4], [19, 13.4], [7, 21.8], [19, 21.8]] as Pt[]) s += dot(x, y, 0.55, '#5E4412') + dot(x - 0.15, y - 0.15, 0.25, '#E6CC88');
      return s;
    }),
  fx_star: () =>
    fx('fx_star', (d) => {
      const pts: Pt[] = [];
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = k % 2 ? 4.9 : 11.6;
        pts.push([13 + Math.cos(a) * rr, 13.8 + Math.sin(a) * rr]);
      }
      const st = poly(pts);
      let s = F(st, '#140E08', 0, 'opacity="0.25" transform="translate(0.8 1)"');
      s += F(st, '#B08A26');
      // bevelled facets: light from upper left
      for (let k = 0; k < 10; k++) {
        const p = pts[k];
        const q = pts[(k + 1) % 10];
        const mx = (p[0] + q[0]) / 2 - 13;
        const my = (p[1] + q[1]) / 2 - 13.8;
        const lit = -mx * 0.7 - my * 0.7;
        const col = lit > 1.5 ? '#F2D870' : lit > -1.5 ? '#DDB848' : '#B08A2C';
        s += F(poly([[13, 13.8], p, q]), col);
      }
      s += d.clip(st, speckle(d, st, [1, 2, 24, 24], 10, ['#7A5A14', '#FFF0B0'], 101, 0.2, 0.45, 0.6));
      s += L(st, 1.1);
      s += dot(9.6, 9.8, 0.7, '#FFF8D8', 0.8);
      return s;
    }),
  fx_stink: () =>
    fx('fx_stink', (d) => {
      // three green stink wiggles rising off something nasty, a fly doing laps
      let s = F(blob(13, 23.4, 9, 2.2, 111, 7, 0.4), d.radial(13, 23.4, 10, [[0, '#7E9A2A', 0.5], [1, '#7E9A2A', 0]]));
      for (const [x, h, ph] of [[6.6, 15, 1], [13, 19, -1], [19.4, 14, 1]] as [number, number, number][]) {
        const y0 = 24;
        const p = `M${f(x)},${f(y0)}c${f(ph * 2.6)},${f(-h * 0.17)} ${f(-ph * 2.6)},${f(-h * 0.33)} 0,${f(-h * 0.5)}s${f(-ph * 2.6)},${f(-h * 0.33)} 0,${f(-h * 0.5)}`;
        s += inked(p, 1.7, '#86A830', 0.75) + L(p, 0.5, '#C4DA7A', 'transform="translate(-0.4 0)" opacity="0.7"');
      }
      s += fly(21.4, 5.4, 1.4) + L('M16.6,7.4q2,-3.6 3.8,-1.4', 0.4, INK, 'stroke-dasharray="0.8 0.8" opacity="0.7"');
      return s;
    }),
};

export function buildFx(): ArtAsset[] {
  return FX3_KEYS.map((k) => BUILD[k]());
}
