/**
 * HUD / menu icons (replace the emoji placeholders). Every icon is 64 x 64, anchor (0.5, 0.5).
 * Chunky game-UI look: thick #2B1B17 outlines (3.2 units, still ~1.6 px at 32 px), flat cel
 * shading, a small white gloss highlight, palette maroon / gold / zombie green / cream.
 * Icons have no button plate: the HUD draws the rounded-square button behind them.
 */
import type { ArtAsset } from './types';
import { Doc, OUT, P, S, ell, f, hl, poly, rrect } from './svg';
import type { Pt } from './svg';
import { starPts, txt } from './raidkit';

const SZ = 64;
const O = 3.2; // outline
const O2 = 2.2; // inner detail outline

const C = {
  maroon: '#B3263A',
  maroonD: '#8E1B2E',
  red: '#E2343B',
  redD: '#B3263A',
  gold: '#FFC83D',
  goldD: '#D9971A',
  goldL: '#FFF0A8',
  green: '#8DC63F',
  greenD: '#5E9A2A',
  greenL: '#B8E26B',
  sauce: '#39E07A',
  sauceD: '#0F8F4A',
  cream: '#FFF4DC',
  creamD: '#E8D5AE',
  wood: '#C98B55',
  woodD: '#A8693A',
  woodDD: '#7A4524',
  steel: '#C9D2DC',
  steelD: '#9AA1AB',
  blue: '#4FA3F0',
  blueD: '#2F6FC0',
  check: '#4CC85A',
  checkD: '#2E9A3E',
  eye: '#FFE14D',
};

function icon(key: string, body: (d: Doc) => string): ArtAsset {
  const d = new Doc(key);
  return { key, svg: d.build(SZ, SZ, body(d)), w: SZ, h: SZ, ox: 0.5, oy: 0.5 };
}

/** Outlined thick stroke (a "rod" with dark outline). */
function rod(dd: string, w: number, col: string, o = O): string {
  return S(dd, w + o * 2, OUT) + S(dd, w, col);
}

function coin(d: Doc, cx: number, cy: number, r: number, label = '$'): string {
  return (
    d.shaded(ell(cx, cy, r), C.gold, C.goldD, O, [-2, -2]) +
    S(ell(cx, cy, r * 0.74), 1.8, C.goldD) +
    txt(cx, cy + r * 0.42, label, r * 1.2, '#B87A0A', { extra: 'stroke="#9A6A00" stroke-width="0.6"' }) +
    hl(cx - r * 0.42, cy - r * 0.5, r * 0.26, r * 0.12, -35, 0.9, C.goldL)
  );
}

function zombieFace(cx: number, cy: number, s: number, big = true): string {
  // eyes: one droopy lid; stitch; grin with a tooth
  let z = P(ell(cx - 7 * s, cy - 1 * s, 5.4 * s, 6 * s), C.eye, O2) + P(ell(cx + 7.4 * s, cy - 0.4 * s, 4.6 * s, 5.2 * s), C.eye, O2);
  z += P(ell(cx - 6.4 * s, cy - 0.2 * s, 1.5 * s), OUT) + P(ell(cx + 7.8 * s, cy + 0.6 * s, 1.4 * s), OUT);
  z += P(`M${f(cx + 2.6 * s)},${f(cy - 2.4 * s)}C${f(cx + 4 * s)},${f(cy - 7 * s)} ${f(cx + 11 * s)},${f(cy - 7 * s)} ${f(cx + 12.2 * s)},${f(cy - 2 * s)}Z`, C.greenD, O2 * 0.8);
  if (big) {
    z += P(`M${f(cx - 8 * s)},${f(cy + 8 * s)}Q${f(cx)},${f(cy + 15 * s)} ${f(cx + 9 * s)},${f(cy + 7 * s)}Q${f(cx)},${f(cy + 10 * s)} ${f(cx - 8 * s)},${f(cy + 8 * s)}Z`, '#5A1E22', O2 * 0.9);
    z += P(`M${f(cx - 3 * s)},${f(cy + 9.4 * s)}h${f(3.4 * s)}v${f(2.6 * s)}h${f(-3.4 * s)}z`, '#FFFFFF', 1);
  }
  return z;
}

// ------------------------------------------------------------------ main HUD buttons
function hud(): ArtAsset[] {
  const out: ArtAsset[] = [];

  out.push(
    icon('ui_shop', (d) => {
      let s = rod('M22,24V18A10,10 0 0 1 42,18V24', 3.4, C.goldD);
      const bag = 'M11,24H53L50,57Q49.6,60 46.6,60H17.4Q14.4,60 14,57Z';
      s += d.shaded(bag, C.red, C.redD, O, [-2.4, -2.4]);
      s += P('M11,24H53L52.4,30H11.6Z', C.maroonD, 0, OUT, 'opacity="0.35"');
      s += P(ell(22, 27, 2), OUT) + P(ell(42, 27, 2), OUT);
      s += txt(32, 52, '$', 24, C.gold, { sw: 3.4 });
      s += hl(18, 33, 2.6, 7, 8, 0.45);
      return s;
    }),
  );

  out.push(
    icon('ui_menu', (d) => {
      let s = P('M14,10H50V56H14Z', OUT);
      s += d.shaded('M16,8H50Q53,8 53,11V53Q53,56 50,56H16Z', C.maroon, C.maroonD, O, [-2, -2]);
      // page edge + spine
      s += P('M16,56H50V60H16Z', C.cream, O2) + S('M20,58h28', 0.8, C.creamD);
      s += P('M11,8H19V60H11Q9,60 9,57V11Q9,8 11,8Z', C.maroonD, O);
      s += S('M14,14v40', 1, '#5C0F1D');
      // fork + knife
      s += rod('M29,20V48', 3.2, C.gold, 2) + rod('M24,18V27Q24,31 29,31Q34,31 34,27V18', 2.2, C.gold, 2) + S('M29,18v7', 1.6, OUT);
      s += rod('M42,48V36', 3.2, C.gold, 2) + P('M40,36V18Q46,20 45,30L44,36Z', C.gold, 2);
      // ribbon bookmark
      s += P('M44,56V63L47,60L50,63V56Z', C.gold, 1.8);
      s += hl(22, 14, 4, 1.2, 0, 0.5);
      return s;
    }),
  );

  out.push(
    icon('ui_crew', (d) => {
      let s = '';
      // messy hair tuft behind
      s += P('M18,20C14,10 26,4 30,9C32,3 44,4 44,11C50,8 54,16 48,20Z', '#5C3A22', O);
      s += d.shaded('M10,32C10,14 54,12 54,32C54,48 46,58 32,58C18,58 10,48 10,32Z', C.green, C.greenD, O, [-2.4, -2.4]);
      // ear
      s += P('M10,32c-5,-2 -6,7 0,8', C.green, O2);
      s += zombieFace(32, 32, 1.05);
      // stitches
      s += S('M16,20L24,26', 1.6) + S('M18,25l3,-3M21,27l3,-3', 1.2);
      // drool
      s += P('M38,44c0,4 1,7 -0.4,8c-1.4,-1 -1,-4 0.4,-8z', C.greenL, 1.2);
      s += hl(20, 22, 4, 1.8, -35, 0.45);
      return s;
    }),
  );

  out.push(
    icon('ui_raid', (d) => {
      // folded treasure map: three panels
      const pan = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, col: string) => P(`M${x0},${y0}L${x1},${y1}L${x2},${y2}L${x3},${y3}Z`, col, O);
      let s = pan(6, 14, 22, 9, 22, 51, 6, 56, '#F2DFB0') + pan(22, 9, 42, 15, 42, 57, 22, 51, C.cream) + pan(42, 15, 58, 9, 58, 51, 42, 57, '#EBD5A2');
      // terrain doodles
      s += P('M10,24c4,-3 8,-3 8,2c0,3 -6,4 -8,-2z', '#8FD15A', 1.6) + P('M45,22l4,-6l4,6z', '#B9A58A', 1.6);
      s += P('M27,40c3,-2 7,-1 8,2c-2,3 -7,3 -8,-2z', '#7FC4EE', 1.4);
      // dashed red route to the X
      s += S('M11,48C18,40 22,32 30,30C38,28 42,36 50,28', 2.4, C.red, 'stroke-dasharray="3.4 3"');
      s += S('M46,20l8,8M54,20l-8,8', 5.6, OUT) + S('M46,20l8,8M54,20l-8,8', 3.2, C.red);
      // tiny skull
      s += P('M12,34c0,-4 6,-4 6,0c0,2 -1,2 -1,3h-4c0,-1 -1,-1 -1,-3z', '#FFFFFF', 1.2) + P(ell(13.8, 34, 0.8), OUT) + P(ell(16.2, 34, 0.8), OUT);
      void d;
      return s;
    }),
  );

  out.push(
    icon('ui_goals', (d) => {
      let s = d.shaded(rrect(10, 9, 40, 51, 5), C.wood, C.woodD, O, [-2, -2]);
      s += P(rrect(14, 15, 32, 41, 2), C.cream, O2);
      s += P(rrect(21, 5, 18, 10, 3), C.steel, O) + P(ell(30, 8.4, 2), OUT) + S('M23,12h14', 1, C.steelD);
      for (let k = 0; k < 3; k++) {
        const y = 24 + k * 10;
        s += S(`M18,${y}l2.6,3l5,-6`, 2.4, k < 2 ? C.checkD : C.creamD);
        s += S(`M29,${y}h${k === 1 ? 10 : 13}`, 2.2, '#B9A88C');
      }
      // pencil
      s += `<g transform="rotate(35 46 40)">` + P('M42,20H50V50H42Z', C.gold, O2) + P('M42,20H50V16Q46,13 42,16Z', '#F7A8C0', O2) + P('M42,20H50V23H42Z', C.steel, 1.4) + P('M42,50H50L46,58Z', '#F2D2A8', O2) + P('M44.6,55.4L46,58L47.4,55.4Z', OUT) + S('M46,24V49', 1, C.goldD) + '</g>';
      return s;
    }),
  );

  out.push(
    icon('ui_pets', (d) => {
      let s = '';
      // floppy ears
      s += P('M12,18C4,18 4,34 10,38C14,34 16,26 18,22Z', '#5A4A3A', O) + P('M52,18C60,18 60,34 54,38C50,34 48,26 46,22Z', '#5A4A3A', O);
      s += d.shaded('M12,34C10,18 22,12 32,12C42,12 54,18 52,34C52,48 44,58 32,58C20,58 12,48 12,34Z', '#C2C08E', '#9A9A66', O, [-2.2, -2.2]);
      // green rot patch + stitches
      s += P('M38,16C46,16 50,22 48,28C44,26 40,24 38,16Z', C.green, O2) + S('M40,20l4,2M42,18l-1,4', 1.2);
      // wrinkles
      s += S('M26,20q6,-3 12,0M28,24q4,-2 8,0', 1.4, '#8A7550');
      // dark muzzle
      s += P('M20,40C20,32 44,32 44,40C44,50 20,50 20,40Z', '#4A3A2E', O2);
      s += P(ell(32, 37, 4.4, 3), OUT) + hl(30.6, 36, 1.2, 0.6, 0, 0.8);
      // mismatched eyes
      s += P(ell(22, 29, 5.6, 6), C.eye, O2) + P(ell(22.6, 29.6, 1.8), OUT);
      s += P(ell(42, 29, 4.2, 4.6), C.eye, O2) + P(ell(42.4, 30, 1.4), OUT) + P('M37.6,26.6C38,22 46,22 46.4,26.6Z', '#A8936A', 1.6);
      // tongue
      s += P('M30,46c0,7 6,7 6,0z', '#F07A90', O2) + S('M33,46v3', 1);
      return s;
    }),
  );

  out.push(
    icon('ui_zombiepedia', (d) => {
      let s = P('M14,10H52V56H14Z', OUT);
      s += d.shaded('M16,7H50Q53,7 53,10V53Q53,56 50,56H16Z', '#4CA845', '#2F7A3A', O, [-2, -2]);
      s += P('M16,56H50V60H16Z', C.cream, O2);
      s += P('M11,7H19V60H11Q9,60 9,57V10Q9,7 11,7Z', '#2F7A3A', O);
      s += S('M14,12v42', 1, '#1F5A28');
      // zombie face on the cover
      s += d.shaded('M24,30C24,18 46,18 46,30C46,40 42,46 35,46C28,46 24,40 24,30Z', C.greenL, C.green, O2, [-1.4, -1.4]);
      s += P(ell(30.4, 30, 3.2, 3.6), C.eye, 1.6) + P(ell(39.6, 30.4, 2.8, 3.2), C.eye, 1.6) + P(ell(30.8, 30.6, 1), OUT) + P(ell(39.8, 31, 1), OUT);
      s += P('M36.6,28.6C37,26 42,26 42.4,28.6Z', C.greenD, 1.2);
      s += S('M30,39q5,3 10,-1', 1.8) + S('M26,22l5,3', 1.2);
      s += hl(22, 13, 4, 1.2, 0, 0.5);
      return s;
    }),
  );

  out.push(
    icon('ui_storage', (d) => {
      let s = box(d, 32, 40, false);
      // green down arrow
      s += P('M26,4H38V18H46L32,32L18,18H26Z', C.check, O) + P('M28,6H33V19H28Z', '#FFFFFF', 0, OUT, 'opacity="0.35"');
      return s;
    }),
  );

  out.push(
    icon('ui_edit', (d) => {
      // wrench (behind, diagonal)
      let s = `<g transform="rotate(45 32 32)">`;
      s += d.shaded('M28.6,22H35.4V56Q35.4,59 32,59Q28.6,59 28.6,56Z', C.steel, C.steelD, O, [-1.4, 0]);
      s += d.shaded('M22,14C22,6 30,3 30,3V13H34V3C34,3 42,6 42,14C42,20 37,23 35.4,24H28.6C27,23 22,20 22,14Z', C.steel, C.steelD, O, [-1.4, -1.4]);
      s += '</g>';
      // hammer (front)
      s += `<g transform="rotate(-40 32 32)">`;
      s += d.shaded(rrect(28.6, 20, 6.8, 40, 3), C.wood, C.woodD, O, [-1.4, 0]);
      s += P('M28.6,48H35.4V54H28.6Z', C.maroon, O2);
      s += d.shaded('M18,8H42Q46,8 46,12V20Q46,22 44,22H18Q14,22 14,18V12Q14,8 18,8Z', '#6B727C', '#4A4F58', O, [-1.4, -1.4]);
      s += P('M46,10L52,12L50,20L46,20Z', '#6B727C', O2);
      s += hl(22, 11.6, 4, 1, 0, 0.6);
      s += '</g>';
      return s;
    }),
  );

  out.push(
    icon('ui_fridge', (d) => {
      let s = d.shaded(rrect(12, 4, 40, 56, 7), '#FFFFFF', '#D8DEE6', O, [-2.4, -2.4]);
      s += S('M12,24H52', O);
      s += rod('M18,11V19', 2.4, C.steelD, 1.6) + rod('M18,29V44', 2.4, C.steelD, 1.6);
      // magnets + note
      s += P(ell(42, 13, 3.4), C.red, 1.8) + P(rrect(34, 31, 13, 14, 1), C.gold, 1.8) + S('M36.4,35.6h8M36.4,39h6', 1.2, C.goldD) + P(ell(40.5, 31.6, 1.8), C.check, 1.2);
      // green slime drip from the freezer door
      s += P('M24,24h16c0,3 -1,4 -2,4c-1,0 -1,6 -3,6c-2,0 -1,-4 -3,-4c-2,0 -2,3 -3,3c-2,0 -1,-5 -3,-5z', C.sauce, 1.6);
      s += P(rrect(16, 58, 7, 4, 1), '#6B727C', 1.6) + P(rrect(41, 58, 7, 4, 1), '#6B727C', 1.6);
      s += hl(20, 46, 1.2, 6, 0, 0.6, C.steel);
      return s;
    }),
  );

  out.push(
    icon('ui_settings', (d) => {
      const pts: Pt[] = [];
      const N = 8;
      for (let k = 0; k < N * 4; k++) {
        const a = (k / (N * 4)) * Math.PI * 2;
        const r = k % 4 < 2 ? 27 : 20.5;
        pts.push([32 + Math.cos(a + 0.1) * r, 32 + Math.sin(a + 0.1) * r]);
      }
      let s = d.shaded(poly(pts), '#8A909A', '#5E646E', O, [-2, -2]);
      s += P(ell(32, 32, 14), '#B5BBC4', O2) + P(ell(32, 32, 7), C.cream, O);
      s += hl(23, 20, 3.4, 1.4, -35, 0.6);
      return s;
    }),
  );

  out.push(icon('ui_cash', (d) => coin(d, 32, 32, 26)));

  out.push(
    icon('ui_sauce', (d) => {
      let s = P(ell(32, 36, 31), d.radial(32, 36, 31, [[0, C.sauce, 0.9], [0.6, C.sauce, 0.45], [1, C.sauce, 0]]));
      const jar = 'M16,22Q16,18 20,18H44Q48,18 48,22V54Q48,60 42,60H22Q16,60 16,54Z';
      s += P(jar, '#E8FFF0', O);
      s += d.clip(jar, d.shaded('M10,30Q32,26 54,30V64H10Z', C.sauce, C.sauceD, 0, [-2.4, -2.4]) + S('M10,30Q32,26 54,30', 1.6, '#B8FFD0'));
      // brain floating inside
      s += P('M24,44C23,38 29,36 32,38C34,35 40,36 40,41C43,43 41,48 38,48C36,51 30,51 28,48C24,49 22,46 24,44Z', '#F7A8C0', 1.8) + S('M27,43q3,-2 5,0t5,-1M28,46q3,1 5,-1', 1, '#C25A7A');
      s += P(ell(21, 36, 2), '#B8FFD0', 1) + P(ell(44, 50, 1.6), '#B8FFD0', 1);
      s += S(jar, O);
      // lid
      s += d.shaded(rrect(14, 8, 36, 11, 3), C.maroon, C.maroonD, O, [-1.4, -1.4]) + S('M19,11v6M25,11v6M31,11v6M37,11v6M43,11v6', 1.2, C.maroonD);
      s += hl(21, 30, 1.6, 8, 0, 0.7);
      return s;
    }),
  );

  out.push(
    icon('ui_xp', (d) => {
      let s = d.shaded(poly(starPts(32, 34, 28, 13)), C.blue, C.blueD, O, [-2.4, -2.4]);
      s += txt(32, 41, 'XP', 15, '#FFFFFF', { sw: 3 });
      s += hl(22, 22, 3, 1.4, -35, 0.7);
      return s;
    }),
  );

  out.push(
    icon('ui_star', (d) => {
      let s = d.shaded(poly(starPts(32, 34, 28, 13)), C.gold, C.goldD, O, [-2.4, -2.4]);
      s += hl(23, 22, 3.4, 1.6, -35, 0.85, C.goldL) + P(ell(41, 40, 1.4), C.goldL, 0, OUT, 'opacity="0.8"');
      return s;
    }),
  );
  return out;
}

/** Cardboard box (3/4 view). cx, cy = centre of the front face. */
function box(d: Doc, cx: number, cy: number, open: boolean): string {
  let s = '';
  const front = poly([[cx - 22, cy - 8], [cx + 4, cy - 2], [cx + 4, cy + 22], [cx - 22, cy + 14]]);
  const side = poly([[cx + 4, cy - 2], [cx + 24, cy - 10], [cx + 24, cy + 12], [cx + 4, cy + 22]]);
  const top = poly([[cx - 22, cy - 8], [cx - 2, cy - 16], [cx + 24, cy - 10], [cx + 4, cy - 2]]);
  s += d.shaded(front, '#D9A066', '#C08550', O, [-1.6, -1.6]) + P(side, '#B47A45', O);
  if (open) {
    s += P(top, '#6E4A2C', O);
    s += P(poly([[cx - 22, cy - 8], [cx - 30, cy - 18], [cx - 8, cy - 26], [cx - 2, cy - 16]]), '#E3B07A', O2);
    s += P(poly([[cx + 24, cy - 10], [cx + 32, cy - 20], [cx + 12, cy - 12], [cx + 4, cy - 2]]), '#C99260', O2);
  } else {
    s += P(top, '#E3B07A', O);
    s += P(poly([[cx - 12, cy - 12], [cx - 6, cy - 14], [cx + 18, cy - 8], [cx + 12, cy - 6]]), '#F2DFB0', 1.4);
  }
  // tape on the front + a "this side up" doodle
  s += P(poly([[cx - 12, cy - 5], [cx - 6, cy - 3.6], [cx - 6, cy + 4], [cx - 12, cy + 2.6]]), '#F2DFB0', 1.4);
  s += S(`M${f(cx - 17)},${f(cy + 9)}l3,-4l3,4M${f(cx - 14)},${f(cy + 5)}v7`, 1.4, '#8A5A30');
  return s;
}

// ------------------------------------------------------------------ store tabs
function tabs(): ArtAsset[] {
  const out: ArtAsset[] = [];

  out.push(
    icon('ui_tab_featured', (d) => {
      // ribbon tails
      let s = P('M22,36L14,58L22,54L26,61L32,40Z', C.maroon, O) + P('M42,36L50,58L42,54L38,61L32,40Z', C.maroonD, O);
      // rosette
      const pts: Pt[] = [];
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const r = k % 2 ? 19 : 22;
        pts.push([32 + Math.cos(a) * r, 26 + Math.sin(a) * r]);
      }
      s += d.shaded(poly(pts), C.red, C.redD, O, [-1.6, -1.6]);
      s += d.shaded(ell(32, 26, 13), C.gold, C.goldD, O2, [-1.4, -1.4]);
      s += P(poly(starPts(32, 26.6, 8, 3.6)), '#FFFFFF', 1.4);
      // sparkles
      const sp = (x: number, y: number, r: number) => P(`M${x},${y - r}Q${x},${y} ${x + r},${y}Q${x},${y} ${x},${y + r}Q${x},${y} ${x - r},${y}Q${x},${y} ${x},${y - r}Z`, C.goldL, 1.4);
      s += sp(55, 10, 6) + sp(9, 14, 4.4) + sp(56, 40, 3.6);
      return s;
    }),
  );

  out.push(
    icon('ui_tab_decor', (d) => {
      // picture frame behind
      let s = `<g transform="rotate(-8 22 22)">` + d.shaded(rrect(5, 6, 32, 26, 2), C.gold, C.goldD, O, [-1.4, -1.4]) + P(rrect(10, 11, 22, 16, 1), '#7FD3FF', O2) + P('M10,27L17,18L22,23L26,19L32,27Z', '#5FAE45', 1.4) + P(ell(27, 15, 2), C.eye) + '</g>';
      // pot
      s += d.shaded('M30,44H58L54,61H34Z', '#E07A4A', '#B85A30', O, [-1.6, -1.6]);
      s += P(rrect(28, 40, 32, 7, 2), '#E8946A', O);
      // leaves
      s += P('M44,40C40,30 34,24 26,26C30,32 36,38 44,40Z', '#5FAE45', O2);
      s += P('M44,40C46,28 52,22 60,22C58,30 52,38 44,40Z', '#4E9A3C', O2);
      s += P('M44,40C42,28 44,18 50,12C52,22 50,32 44,40Z', '#7CC24A', O2);
      s += S('M44,40C40,32 34,28 30,27M44,40C47,32 52,26 57,24', 1, '#2C6A2C');
      return s;
    }),
  );

  out.push(
    icon('ui_tab_kitchen', (d) => {
      // flames above the grill
      let s = P('M20,26C14,18 20,10 24,6C24,12 28,14 28,18C30,14 32,12 32,8C38,14 40,20 36,26Z', C.gold, O2) + P('M24,26C22,22 24,18 26,16C27,20 30,21 30,26Z', '#FF8A1F', 1.4);
      s += P('M34,26C32,20 36,16 40,12C40,18 44,20 44,26Z', '#FF8A1F', O2) + P('M37,26c0,-3 2,-5 3,-6c0,3 2,4 2,6z', C.gold, 1.2);
      // kettle grill bowl + grate
      s += d.shaded('M8,28H56C56,42 46,50 32,50C18,50 8,42 8,28Z', '#3A3A44', '#24242C', O, [-1.6, -1.6]);
      s += P(rrect(6, 25, 52, 5, 2.4), '#8A909A', O2) + S('M14,27.5h36', 1, '#C9D2DC', 'stroke-dasharray="3 2"');
      s += rod('M20,48L14,60M44,48L50,60M32,50V60', 2.4, '#6B727C', 2);
      s += P(rrect(28, 34, 8, 4, 1.6), '#8A909A', 1.4);
      s += hl(16, 34, 3, 1.4, 20, 0.35);
      return s;
    }),
  );

  out.push(
    icon('ui_tab_furniture', (d) => {
      // table
      let s = rod('M30,30V58M54,30V58', 3, C.woodD, 2.6);
      s += d.shaded(rrect(24, 24, 36, 8, 2.4), C.wood, C.woodD, O, [-1.4, -1.4]);
      s += P('M26,24H58V28H26Z', '#E2343B', 0, OUT, 'opacity="0.0"');
      // checkered tablecloth corner
      s += P('M24,24H60V32H24Z', 'none');
      // chair
      s += rod('M10,8V58', 3.6, C.woodD, 2.6) + rod('M26,40V58', 3.6, C.woodD, 2.6) + rod('M10,40V58', 3, C.woodD, 2.6);
      s += d.shaded(rrect(7, 8, 8, 32, 2.4), C.wood, C.woodD, O, [-1.2, -1.2]);
      s += P(rrect(10, 14, 3, 18, 1), C.woodD);
      s += d.shaded(rrect(6, 36, 24, 7, 2.4), C.maroon, C.maroonD, O, [-1.2, -1.2]);
      // a plate with a burger on the table
      s += P(ell(44, 23, 9, 3), '#FFFFFF', O2) + P('M38,22c0,-7 12,-7 12,0z', '#F0A64B', 1.8) + P(rrect(37.6, 20.4, 12.8, 2.4, 1), '#6B3A22', 1);
      return s;
    }),
  );

  out.push(
    icon('ui_tab_walls', (d) => {
      // tile grid behind
      let s = d.shaded(rrect(28, 6, 30, 30, 3), '#E8ECF0', '#C9D2DC', O, [-1.4, -1.4]);
      s += S('M38,6V36M48,6V36M28,16H58M28,26H58', 1.6, '#9AA1AB') + P('M38,16H48V26H38Z', C.green, 1.2) + P('M28,6H38V16H31Q28,16 28,13Z', '#7FD3FF', 0);
      // wallpaper roll
      s += d.shaded('M10,24H40V54H10Z', C.maroon, C.maroonD, O, [-1.6, 0]);
      s += S('M17,30l4,4l4,-4l4,4l4,-4M17,42l4,4l4,-4l4,4l4,-4', 1.6, C.gold);
      s += d.shaded(ell(10, 39, 6, 15), '#E8D5AE', '#C9B48E', O, [-1, 0]) + P(ell(10, 39, 2.6, 6.4), '#8A5A30', 1.6);
      // unrolled strip
      s += P('M40,24H40Q48,24 48,30V60H40Z', '#C9404F', O) + S('M42,36l3,3M42,48l3,3', 1.4, C.gold);
      return s;
    }),
  );

  out.push(
    icon('ui_tab_special', (d) => {
      // gift box with a big bow
      let s = d.shaded(rrect(10, 28, 44, 32, 3), '#7A4F9A', '#5A3578', O, [-1.6, -1.6]);
      s += P(rrect(7, 20, 50, 11, 3), '#8E62B0', O);
      s += P('M27,20H37V60H27Z', C.gold, O2);
      s += P('M32,20C22,6 10,12 18,20Z', C.gold, O2) + P('M32,20C42,6 54,12 46,20Z', C.goldD, O2);
      s += P(ell(32, 20, 4.4, 3.4), C.gold, O2);
      s += txt(32, 50, '?', 14, '#FFFFFF', { sw: 2.6 });
      s += hl(15, 33, 1.4, 4, 0, 0.45);
      return s;
    }),
  );

  out.push(icon('ui_tab_storage', (d) => `<g transform="translate(-8.8 -10.8) scale(1.3)">${box(d, 32, 36, false)}</g>`));
  return out;
}

// ------------------------------------------------------------------ edit tools
function tools(): ArtAsset[] {
  const out: ArtAsset[] = [];
  const arrowHead = (x: number, y: number, ang: number, size: number, col: string) => {
    const a = (ang * Math.PI) / 180;
    const p = (dx: number, dy: number): Pt => [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)];
    return P(poly([p(size, 0), p(-size * 0.5, -size * 0.9), p(-size * 0.5, size * 0.9)]), col, O);
  };

  out.push(
    icon('ui_rotate', (d) => {
      const arc = 'M50,40A19,19 0 1 1 46,18';
      let s = S(arc, 10 + O * 2, OUT) + S(arc, 10, C.blue) + S('M49,38A17,17 0 1 1 44,18', 2.4, '#9FD0FF', 'opacity="0.7"');
      s += arrowHead(48, 16, -40, 13, C.blue);
      void d;
      return s;
    }),
  );

  out.push(
    icon('ui_move', (d) => {
      let s = '';
      const arm = 'M32,12V52M12,32H52';
      s += S(arm, 7 + O * 2, OUT);
      s += arrowHead(32, 6, -90, 10, C.gold) + arrowHead(32, 58, 90, 10, C.gold) + arrowHead(6, 32, 180, 10, C.gold) + arrowHead(58, 32, 0, 10, C.gold);
      s += S(arm, 7, C.gold);
      s += d.shaded(ell(32, 32, 7), C.gold, C.goldD, O, [-1, -1]);
      return s;
    }),
  );

  out.push(
    icon('ui_sell', (d) => {
      let s = coin(d, 28, 30, 22);
      s += d.shaded(ell(46, 46, 13), C.red, C.redD, O, [-1.4, -1.4]);
      s += P(rrect(39, 43.4, 14, 5.2, 2), '#FFFFFF', 1.6);
      return s;
    }),
  );

  out.push(
    icon('ui_check', () => {
      const c = 'M10,34L25,49L54,16';
      return S(c, 13 + O * 2, OUT) + S(c, 13, C.check) + S('M12,32.6L25,45.6', 3, '#A6F0AE', 'opacity="0.8"');
    }),
  );

  out.push(
    icon('ui_cancel', () => {
      const c = 'M14,14L50,50M50,14L14,50';
      return S(c, 13 + O * 2, OUT) + S(c, 13, C.red) + S('M15.4,13.4L30,28', 3, '#FF9AA0', 'opacity="0.8"');
    }),
  );

  out.push(
    icon('ui_expand', (d) => {
      // iso floor plan with a grid, arrows pointing outward from each edge
      const fl = 'M32,18L52,28L32,38L12,28Z';
      let s = d.shaded(fl, C.cream, C.creamD, O, [-1, -1]);
      s += S('M22,23L42,33M42,23L22,33', 1.4, '#B9A88C');
      s += P('M32,18L42,23L32,28L22,23Z', C.wood, 1.2);
      const ar = (x: number, y: number, ang: number) => {
        const a = (ang * Math.PI) / 180;
        const x2 = x + Math.cos(a) * 8;
        const y2 = y + Math.sin(a) * 8;
        return S(`M${f(x)},${f(y)}L${f(x2)},${f(y2)}`, 3.4 + O * 2, OUT) + arrowHead(x2 + Math.cos(a) * 2, y2 + Math.sin(a) * 2, ang, 7, C.check) + S(`M${f(x)},${f(y)}L${f(x2)},${f(y2)}`, 3.4, C.check);
      };
      s += ar(19, 19, -153) + ar(45, 19, -27) + ar(45, 37, 27) + ar(19, 37, 153);
      // "+" badge
      s += d.shaded(ell(32, 50, 9), C.check, C.checkD, O, [-1, -1]) + S('M27.6,50h8.8M32,45.6v8.8', 2.8, '#FFFFFF');
      return s;
    }),
  );

  const speaker = (d: Doc) =>
    d.shaded('M5,22H17L34,7V57L17,42H5Z', C.cream, C.creamD, O, [-1.6, -1.6]) + P('M5,22H17V42H5Z', '#B9A88C', O2) + hl(26, 20, 1.4, 5, 30, 0.7);
  out.push(
    icon('ui_sound_on', (d) => {
      let s = speaker(d);
      for (const [r, w] of [[11, 4.4], [21, 4.4]] as Pt[]) {
        const a = `M${f(37 + r * Math.cos(-0.8))},${f(32 + r * Math.sin(-0.8))}A${r},${r} 0 0 1 ${f(37 + r * Math.cos(0.8))},${f(32 + r * Math.sin(0.8))}`;
        s += S(a, w + O * 2, OUT) + S(a, w, C.check);
      }
      return s;
    }),
  );
  out.push(
    icon('ui_sound_off', (d) => {
      const c = 'M41,23L58,40M58,23L41,40';
      return speaker(d) + S(c, 6.4 + O * 2, OUT) + S(c, 6.4, C.red);
    }),
  );
  return out;
}

// ------------------------------------------------------------------ open / closed door sign
function signs(): ArtAsset[] {
  const sign = (d: Doc, open: boolean) => {
    const board = open ? C.green : C.red;
    const boardD = open ? C.greenD : C.redD;
    let s = rod('M32,7L13,26M32,7L51,26', 1.6, '#6B4A2E', 1.2); // string
    s += d.shaded(ell(32, 7, 3.4), C.steel, C.steelD, O2, [-0.8, -0.8]); // nail
    // board hangs a little crooked when closed (it's been slammed)
    s += `<g transform="rotate(${open ? 0 : -6} 32 40)">`;
    s += d.shaded(rrect(5, 24, 54, 30, 6), board, boardD, O, [-2, -2]);
    s += S(rrect(9.5, 28.5, 45, 21, 3.5), 1.6, open ? C.greenL : '#FF8A80');
    s += txt(32, open ? 45.6 : 44.8, open ? 'OPEN' : 'CLOSED', open ? 15 : 11.6, '#FFFFFF', { sw: 2.6, extra: open ? '' : 'textLength="40" lengthAdjust="spacingAndGlyphs"' });
    s += hl(14, 29, 6, 1.4, 0, 0.55);
    if (!open) s += P('M44,52Q47,59 44,62Q41,59 44,52Z', C.green, O2); // a zombie drip, because of course
    s += '</g>';
    return s;
  };
  return [icon('ui_open', (d) => sign(d, true)), icon('ui_closed', (d) => sign(d, false))];
}

export function buildUiIcons(): ArtAsset[] {
  return [...hud(), ...tabs(), ...tools(), ...signs()];
}

