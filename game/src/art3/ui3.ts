/**
 * U1 — UI art v3 (docs/09-art-v3-contract.md §3 U1, look per docs/08 §1.4).
 *
 * HUD icons: 64 x 64, anchor (0.5, 0.5), one per v2 `ui_*` key. Muted, textured and a bit gross,
 * thin warm-black outlines (about 1.9 units at 64 px, so about 1 px at 32 px), two-tone cel shading
 * with a soft volume gradient, speckle and grime. Icons carry no button plate: the HUD draws that.
 *
 * Panel / texture art for CSS backgrounds (anchor 0, 0):
 *  - tex_awning 512 x 64   maroon / dusty-rose stripes, olive stains, torn scalloped edge; tiles on x
 *  - tex_chalk  256 x 160  chalkboard in a 24-unit wood frame (nine-slice: border-image-slice 24)
 *  - tex_paper  256 x 256  yellow legal-pad sheet with a red pushpin
 *  - tex_parchment 256 x 256  torn, stained paper
 *  - btn_olive / btn_red 160 x 48  slanted sticker buttons, no text (nine-slice: 16 24)
 *  - tex_brick  512 x 256  dark spot-lit brick menu backdrop
 *  - tex_cork   256 x 256  corkboard, tiles on both axes
 */
import type { ArtAsset } from '../art/types';
import { Doc, capsule, ell, f, poly, rrect } from '../art/svg';
import type { Pt } from '../art/svg';
import { starPts, txt } from '../art/raidkit';
import { INK, F, L, PAL, asset, blob, crack, dot, op, rnd, speckle } from './kit';

const SZ = 64;
const OW = 1.9; // outer outline at 64 px
const IW = 1.0; // inner detail lines
const TW = 0.65; // fine texture lines

type Box = [number, number, number, number];

// ---------------------------------------------------------------- UI palette (muted; accents small)
const U = {
  maroon: '#6D1727',
  maroonD: '#4C0F1B',
  rose: '#7E454E',
  roseD: '#5E3138',
  roseHi: '#A26A72',
  olive: '#658433',
  oliveD: '#486D0D',
  oliveHi: '#8FAA5A',
  oliveStain: '#8C8A4A',
  kraft: '#B39566',
  kraftD: '#8C7148',
  kraftDD: '#6A5434',
  paper: '#DAD6C8',
  paperD: '#B9B4A3',
  legal: '#E3D58A',
  legalD: '#C9B96C',
  parch: '#CDB98A',
  parchD: '#A8915E',
  steel: '#9A9F9C',
  steelD: '#62676A',
  steelHi: '#C8CCC6',
  rust: '#8A4A24',
  rustD: '#5E2F16',
  brass: '#B8973A',
  brassD: '#86691F',
  brassHi: '#D9BE6A',
  gold: '#E0B53C',
  goldD: '#A97F1C',
  goldHi: '#F2D57A',
  zgreen: '#88BB44',
  zgreenAlt: '#55AA66',
  zgreenD: '#427E40',
  zgreenDD: '#254424',
  zeye: '#DECC54',
  khaki: '#A89C74',
  khakiD: '#837855',
  charcoal: '#3A3833',
  charcoalD: '#26241F',
  slate: '#2C6985',
  slateD: '#1E4A60',
  oxblood: '#691122',
  oxbloodD: '#470A16',
  blood: '#7A2A22',
  bloodD: '#561A15',
  coffee: '#6A4524',
  toxin: '#7CF23A',
  toxinD: '#2EAE2A',
  toxinHi: '#D4FF96',
  red: '#A8302E',
  redD: '#6D1727',
  cream: '#DAD6C8',
  creamD: '#ADA793',
  teeth: '#D6CFAE',
  flesh: '#3A1A14',
};

const GRIME = ['#3B2E1C', '#5E5232', '#2A2218'];

function icon(key: string, body: (d: Doc) => string): ArtAsset {
  return asset(key, SZ, SZ, 0.5, 0.5, body);
}

/** Two-tone cel fill (shadow crescent falls lower-right), no outline. */
function cel(d: Doc, p: string, base: string, shade: string, off: Pt = [-1.8, -1.8]): string {
  const cid = d.clipId(p);
  return `<path d="${p}" fill="${shade}"/><g clip-path="url(#${cid})"><path d="${p}" fill="${base}" transform="translate(${f(off[0])} ${f(off[1])})"/></g>`;
}

/** Soft volume: light from the upper left, dark toward the lower right. */
function vol(d: Doc, p: string, b: Box, lo = 0.16, hi = 0.22): string {
  const g = d.linear(b[0], b[1], b[0] + b[2], b[1] + b[3], [
    [0, '#FFFFFF', lo],
    [0.45, '#FFFFFF', 0],
    [1, '#000000', hi],
  ]);
  return `<path d="${p}" fill="${g}"/>`;
}

interface SolidOpts {
  off?: Pt;
  sw?: number;
  vol?: boolean;
  spk?: number;
  cols?: string[];
  seed?: number;
  grime?: number;
}

/** A finished solid: cel fill + volume + speckle/grime clipped to the shape + outline. */
function solid(d: Doc, p: string, b: Box, base: string, shade: string, o: SolidOpts = {}): string {
  let s = cel(d, p, base, shade, o.off);
  if (o.vol !== false) s += vol(d, p, b);
  if (o.spk) s += speckle(d, p, b, o.spk, o.cols ?? GRIME, o.seed ?? 1, 0.25, 0.7, 0.55);
  if (o.grime) s += grime(d, p, b, o.seed ?? 1, o.grime);
  if ((o.sw ?? OW) > 0) s += L(p, o.sw ?? OW);
  return s;
}

/** Soft dark smudges inside a shape. */
function grime(d: Doc, p: string, b: Box, seed: number, n = 2, col = '#3B2E1C', o = 0.22): string {
  const r = rnd(seed * 31 + 7);
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = b[0] + r() * b[2];
    const y = b[1] + b[3] * (0.35 + r() * 0.65);
    s += F(blob(x, y, b[2] * (0.12 + r() * 0.14), b[3] * (0.08 + r() * 0.12), seed + k * 13), col, 0, `opacity="${f(o * (0.6 + r() * 0.6))}"`);
  }
  return d.clip(p, s);
}

/** Round the corners of a polygon. */
function roundPoly(pts: Pt[], r: number | number[]): string {
  const n = pts.length;
  let s = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const rr = Array.isArray(r) ? r[i] : r;
    const l1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) || 1;
    const l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
    const t1 = Math.min(0.5, rr / l1);
    const t2 = Math.min(0.5, rr / l2);
    const a: Pt = [p1[0] + (p0[0] - p1[0]) * t1, p1[1] + (p0[1] - p1[1]) * t1];
    const c: Pt = [p1[0] + (p2[0] - p1[0]) * t2, p1[1] + (p2[1] - p1[1]) * t2];
    s += `${i === 0 ? 'M' : 'L'}${f(a[0])},${f(a[1])}Q${f(p1[0])},${f(p1[1])} ${f(c[0])},${f(c[1])}`;
  }
  return s + 'Z';
}

/** Outlined thick stroke (a rod: ink under, colour on top). */
function rod(p: string, w: number, col: string, o = OW): string {
  return L(p, w + o * 2) + L(p, w, col);
}

/** Bloody (or slimy) handprint, about 26 units tall at s = 1, palm centre at (x, y). */
function handprint(x: number, y: number, s: number, rot: number, col: string, o = 0.85, seed = 3): string {
  const fingers =
    capsule([-4.6, -5], [-7, -15.5], 3.2, 2.7) +
    capsule([-1.4, -7], [-2, -19], 3.4, 2.9) +
    capsule([2.2, -7], [3.2, -18], 3.3, 2.8) +
    capsule([5.4, -5], [7.6, -13.5], 3, 2.5) +
    capsule([6.2, 1.5], [12.5, -3.5], 3.4, 3);
  const drips = capsule([-3, 6], [-3.4, 12], 1.6, 1.1) + capsule([2.5, 6], [2.8, 9.5], 1.4, 1);
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})" opacity="${f(o)}">${F(blob(0, 0, 7, 7.6, seed, 8, 0.25) + fingers + drips, col)}</g>`;
}

/** Fake handwriting scribble line. */
function scribble(x: number, y: number, w: number, seed: number, sw = 0.8, col = INK, o = 0.7): string {
  const r = rnd(seed);
  let p = `M${f(x)},${f(y)}`;
  let cx = x;
  while (cx < x + w) {
    const st = 1.6 + r() * 1.8;
    p += `q${f(st / 2)},${f(-1.6 - r() * 1.4)} ${f(st)},${f((r() - 0.5) * 0.8)}`;
    cx += st;
  }
  return L(p, sw, col, `opacity="${f(o)}"`);
}

function g(inner: string, tr: string, extra = ''): string {
  return `<g transform="${tr}"${extra ? ' ' + extra : ''}>${inner}</g>`;
}

/** Mask that erases the union of circles (bites, holes). */
function biteMask(d: Doc, w: number, h: number, circles: [number, number, number][]): string {
  const id = d.id('m');
  d.def(
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#FFFFFF"/>` +
      circles.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#000000"/>`).join('') +
      `</mask>`,
  );
  return `url(#${id})`;
}

/** Yellow, pupil-less zombie eye with a heavy lid. */
function zEye(cx: number, cy: number, w: number, h: number, lid: number, lidCol: string): string {
  const e = `M${f(cx - w)},${f(cy)}Q${f(cx)},${f(cy - h * 1.5)} ${f(cx + w)},${f(cy - h * 0.1)}Q${f(cx)},${f(cy + h)} ${f(cx - w)},${f(cy)}Z`;
  const lidP = `M${f(cx - w - 0.6)},${f(cy + 0.2)}Q${f(cx)},${f(cy - h * 1.9)} ${f(cx + w + 0.6)},${f(cy - h * 0.1)}Q${f(cx)},${f(cy - h * (1.2 - lid))} ${f(cx - w - 0.6)},${f(cy + 0.2)}Z`;
  return F(e, U.zeye, IW) + F(lidP, lidCol, IW * 0.9) + dot(cx - w * 0.35, cy - h * 0.05, 0.7, '#FFF6C0', 0.8);
}

// ================================================================= main HUD icons
function iShop(): ArtAsset {
  return icon('ui_shop', (d) => {
    let s = '';
    // back handle (behind the bag)
    s += rod('M27,22C26,9 45,8 44,22', 1.6, U.kraftDD, 1.4);
    const front = 'M12,24L43,21.5L45.5,58.5L10.5,59Z';
    const side = 'M43,21.5L53.5,25.5L52.5,55L45.5,58.5Z';
    s += solid(d, side, [43, 21, 11, 38], U.kraftD, U.kraftDD, { spk: 18, seed: 4, vol: false });
    s += solid(d, front, [10, 21, 36, 38], U.kraft, U.kraftD, { off: [-1.4, -1.4], spk: 40, seed: 5, grime: 2 });
    // gusset crease + top fold band
    s += L('M48,23.5L48.6,56.4', TW, U.kraftDD, 'opacity="0.8"');
    s += L('M11.7,29L43.3,26.6', IW, U.kraftDD, 'opacity="0.85"');
    s += L('M43.3,26.6L53.3,30.3', TW, '#4A3A22', 'opacity="0.7"');
    // crumple creases
    s += L('M18,34l4,6l-2,7M37,31l-3,9l3,10M24,52l7,-2', TW, U.kraftDD, 'opacity="0.55"');
    // printed $ (faded)
    s += txt(28, 50, '$', 19, '#4E5A36', { extra: 'opacity="0.85"' });
    // grease blot + bloody handprint
    s += d.clip(front, F(blob(39, 32, 5, 4, 9), '#6A5434', 0, 'opacity="0.35"') + handprint(18, 47, 0.62, 18, U.blood, 0.88, 6));
    // front handle (twine) with knots
    s += rod('M18,25C17,8 37,7 36,24', 1.8, '#A08A5E', 1.5);
    s += dot(18, 25.2, 1.6, U.kraftDD) + dot(36, 24, 1.6, U.kraftDD);
    s += L(front, OW);
    return s;
  });
}

function iMenu(): ArtAsset {
  return icon('ui_menu', (d) => {
    let s = '';
    const pages = 'M17,14L52,11L56,54L19,58Z';
    s += solid(d, pages, [17, 11, 39, 47], U.paper, U.paperD, { vol: false, sw: OW });
    s += L('M52.5,17L56.3,53M51.8,13.5L55.5,50M53,20L56.6,56', TW, '#8A8474', 'opacity="0.8"');
    const cover = 'M13,12L49,9L52,51L15,55Z';
    s += solid(d, cover, [13, 9, 39, 46], U.oxblood, U.oxbloodD, { off: [-1.6, -1.6], spk: 40, cols: ['#2A0810', '#8E3040', '#3B2E1C'], seed: 8, grime: 2 });
    // worn corners + scuffs
    s += d.clip(cover, F(blob(49, 10, 4, 3, 2), '#9A5A5A', 0, 'opacity="0.55"') + F(blob(15, 54, 4, 3, 3), '#9A5A5A', 0, 'opacity="0.5"') + L('M30,44l9,-2M24,20l5,-1', TW, '#B07A7A', 'opacity="0.5"'));
    // grease stain
    s += d.clip(cover, F(blob(26, 42, 6, 5, 11), '#2A0810', 0, 'opacity="0.35"'));
    // label with scrawl
    const lab = 'M21,17L42,15.5L43,25L22,26.6Z';
    s += solid(d, lab, [21, 15, 22, 12], U.paper, U.paperD, { sw: IW, vol: false, spk: 10, seed: 3 });
    s += scribble(24, 21.5, 15, 4, 0.9, INK, 0.75);
    // rings
    for (const y of [17, 26, 35, 44]) {
      s += L(`M10,${f(y + 1)}C10,${f(y - 3)} 17,${f(y - 4)} 17,${f(y)}`, 3.6) + L(`M10,${f(y + 1)}C10,${f(y - 3)} 17,${f(y - 4)} 17,${f(y)}`, 1.7, U.steel);
      s += dot(17, y + 0.6, 1.2, '#1A0A0A');
    }
    // fork stabbed in: puncture, cracks, ooze
    s += crack(34, 37, 2.6, 7, 21, 0.7, INK, 0) + crack(34, 37, 4.2, 6, 22, 0.6, INK, 0) + crack(34, 37, 1.1, 5, 23, 0.6, INK, 0);
    s += F(blob(34, 38.4, 3.4, 1.6, 5), U.blood, 0, 'opacity="0.8"') + F('M33,39q0.6,4 -0.4,6q-1.2,-2 0.4,-6z', U.blood, 0, 'opacity="0.85"');
    const fork = g(
      // tine stubs entering the cover, neck, handle (fork drawn upright, tines at y = 0)
      F('M-3.4,0V-5H3.4V0', U.steel, IW) +
        L('M-1.1,0V-4.6M1.1,0V-4.6', 0.7, U.steelD) +
        F('M-3.4,-5Q-3.4,-9 -1,-10.5V-15H1V-10.5Q3.4,-9 3.4,-5Z', U.steel, IW) +
        F(rrect(-2.6, -36, 5.2, 22, 2.6), U.steelD, IW) +
        F(rrect(-2.6, -36, 2.4, 22, 1.2), U.steel, 0) +
        L('M-1.5,-33V-18', 0.7, U.steelHi, 'opacity="0.9"') +
        dot(0, -31, 0.8, INK) +
        dot(0, -25, 0.8, INK) +
        F(blob(0.8, -20, 1.5, 2.6, 9), U.rust, 0, 'opacity="0.7"'),
      'translate(34 37.5) rotate(32)',
    );
    s += fork;
    return s;
  });
}

function iCrew(): ArtAsset {
  return icon('ui_crew', (d) => {
    let s = '';
    // torn collar + neck
    const collar = 'M10,64L13,56Q22,50 32,53Q42,50 51,56L54,64Z';
    s += solid(d, 'M24,46L40,46L41,58L23,58Z', [23, 46, 18, 12], U.zgreenD, U.zgreenDD, { vol: false });
    s += solid(d, collar, [10, 50, 44, 14], U.charcoal, U.charcoalD, { spk: 14, seed: 2 });
    s += L('M27,54L32,60L37,54', IW, U.charcoalD) + L('M18,57l2,4M45,57l-1,3', TW, '#55524A');
    // ears (left one bitten)
    const earL = 'M16,26Q9,25 9.5,32Q10,39 16,39Z';
    s += solid(d, earL, [9, 25, 7, 14], U.zgreen, U.zgreenD, { vol: false });
    s += F('M10,30q2,1.4 0.4,2.8q2,0.8 0.4,2.6', 'none', 0) + L('M12.5,30q2,2 0,5', TW, U.zgreenDD);
    const earR = 'M48,27Q55,26 54.5,33Q54,39 48,39Z';
    s += solid(d, earR, [48, 26, 7, 14], U.zgreen, U.zgreenD, { vol: false });
    // head
    const head = 'M32,8C43,8 50,15 50,27C50,34 49,39 46,44C43,50 38,53.5 32,53.5C25,53.5 20,50 17.5,45C14.5,39.5 14,33 14.4,27C15,15 22,8 32,8Z';
    s += cel(d, head, U.zgreen, U.zgreenD, [-2.4, -2]);
    s += d.clip(head, F(blob(41, 15, 8, 6, 4), U.zgreenAlt, 0, 'opacity="0.7"') + F(blob(21, 44, 5, 4, 8), U.zgreenAlt, 0, 'opacity="0.5"') + F(blob(44, 40, 4, 3, 5), '#6E8A30', 0, 'opacity="0.6"'));
    s += vol(d, head, [14, 8, 36, 46], 0.12, 0.26);
    // stubble + mottling
    s += speckle(d, head, [16, 40, 32, 14], 40, [U.zgreenDD, '#2F5A2A'], 12, 0.25, 0.5, 0.7);
    s += speckle(d, head, [14, 8, 36, 30], 20, [U.zgreenDD, '#B7D27A'], 13, 0.3, 0.8, 0.45);
    // wound on the cheek
    s += F(blob(43, 36, 2.6, 2, 2), U.flesh, 0, 'opacity="0.85"') + F(blob(43.4, 36.4, 1.2, 0.9, 3), U.blood, 0);
    s += L(head, OW);
    // receding hair wisps
    s += L('M22,13C20,8 24,6 25,10M27,9.5C27,5 31,4.5 31,8.5M35,9C37,5 40,6 39,10M19,17C15,14 15,12 18,12', 1.5, '#2E2618');
    s += L('M16,24C14,19 15,16 17,15M48,22C49,18 48,16 46,14', 1.2, '#2E2618', 'opacity="0.8"');
    // forehead stitches
    s += L('M35,14L46,24', IW, INK) + L('M36,17.2l2.4,-2.6M38.8,19.6l2.4,-2.6M41.6,22l2.4,-2.6', 0.8, INK);
    // brows + eyes + bags
    s += L('M18.5,25.5Q23,22.5 29,25', 1.6, U.zgreenDD) + L('M34.5,25Q40,22 46.5,24.5', 1.6, U.zgreenDD);
    s += zEye(23.6, 30, 5, 3.2, 0.3, U.zgreenD) + zEye(40.4, 29.6, 5.4, 3.4, 0.6, U.zgreenD);
    s += L('M19.5,34Q23.5,36 28,33.6M36,33.6Q40.5,36.4 45.5,33.4', TW, U.zgreenDD);
    s += L('M20.5,36.2Q24,37.6 27,36M37,36Q41,38 44.5,35.8', TW, U.zgreenDD, 'opacity="0.6"');
    // nose
    s += L('M31.5,31.5Q34.2,37.5 31.4,39.4Q29.6,39.6 29,38.4', IW, INK) + dot(30.3, 38.6, 0.7, INK) + dot(33.2, 38.6, 0.7, INK);
    // mouth: crooked grimace, missing tooth
    const mouth = 'M22.5,44.2Q30,41 42.5,42Q39,48.4 31,48Q25.5,47.8 22.5,44.2Z';
    s += F(mouth, U.flesh, IW);
    s += F('M27,43.3l3,-0.5v2.6l-2.8,0.3z', U.teeth, 0.6) + F('M33.4,42.6l3.4,0.1l-0.4,3l-2.8,-0.3z', U.teeth, 0.6) + F('M38,42.8l2.4,0.2l-0.8,2l-1.6,-0.4z', '#B8AE82', 0.5);
    s += L('M24,48.4Q31,51 40,48', TW, U.zgreenDD);
    // drool
    s += F('M39.5,46.5q1.2,3.6 0.2,6q-1.4,-1.2 -0.6,-6z', '#B8D07A', 0.5, 'opacity="0.85"');
    return s;
  });
}

function iRaid(): ArtAsset {
  return icon('ui_raid', (d) => {
    // folded map, three panels, a bite out of the top-right corner
    const A: Pt = [6, 16];
    const B: Pt = [23, 11];
    const C: Pt = [40, 16];
    const Dd: Pt = [58, 11];
    const E: Pt = [58, 49];
    const Fp: Pt = [40, 54];
    const Gp: Pt = [23, 49];
    const H: Pt = [6, 54];
    const p1 = poly([A, B, Gp, H]);
    const p2 = poly([B, C, Fp, Gp]);
    const p3 = poly([C, Dd, E, Fp]);
    const all = poly([A, B, C, Dd, E, Fp, Gp, H]);
    const bites: [number, number, number][] = [
      [58, 18, 5.2],
      [53.5, 12.5, 5],
      [59.5, 24.5, 3.6],
      [47.4, 9.6, 3.4],
      [59.6, 10.4, 3.4],
    ];
    const m = biteMask(d, SZ, SZ, bites);
    let s = '';
    s += solid(d, p1, [6, 11, 17, 43], U.parch, U.parchD, { vol: false, sw: 0, spk: 20, seed: 1 });
    s += solid(d, p2, [23, 11, 17, 43], '#B8A273', '#9A8456', { vol: false, sw: 0, spk: 20, seed: 2 });
    s += solid(d, p3, [40, 11, 18, 43], U.parch, U.parchD, { vol: false, sw: 0, spk: 20, seed: 3 });
    // land + water
    let geo = '';
    geo += F(blob(16, 27, 8, 7, 4), '#7E9A3A', TW) + F(blob(33, 38, 7, 6, 6), '#6B8A2C', TW) + F(blob(48, 30, 6, 7, 9), '#7E9A3A', TW);
    geo += F(blob(14, 45, 7, 3.4, 2), '#6E8C8E', TW) + F(blob(47, 46, 6, 3, 12), '#6E8C8E', TW);
    geo += L('M12,24l3,-2l3,2M30,35l2,-2l2,2', TW, '#3A4F0F');
    // route + X + skull dot
    geo += L('M12,32Q20,40 28,30T45,34', 1.6, U.blood, 'stroke-dasharray="2.6 2.2"');
    geo += L('M44,30.5l5,5M49,30.5l-5,5', 2.2, U.blood);
    geo += F(ell(13, 32, 2.2), U.paper, 0.8) + dot(12.2, 31.8, 0.5, INK) + dot(13.8, 31.8, 0.5, INK);
    // coffee ring + fold shadows
    geo += L(ell(30, 21, 5, 4), 1.1, U.coffee, 'opacity="0.45"');
    geo += d.clip(p2, `<path d="${p2}" fill="${d.linear(23, 0, 40, 0, [[0, '#000', 0.25], [1, '#000', 0]])}"/>`);
    geo += d.clip(p3, `<path d="${p3}" fill="${d.linear(40, 0, 50, 0, [[0, '#000', 0.12], [1, '#000', 0]])}"/>`);
    s += d.clip(all, geo);
    s += L(`M${B[0]},${B[1]}L${Gp[0]},${Gp[1]}M${C[0]},${C[1]}L${Fp[0]},${Fp[1]}`, IW, '#6A5434');
    s += L(all, OW);
    // bite outline (circle strokes; the mask leaves only the half inside the paper)
    s += d.clip(all, bites.map(([x, y, r]) => L(ell(x, y, r), OW * 2)).join(''));
    // tooth dents + saliva stain near the bite
    s += d.clip(all, F(blob(51, 20, 5, 4, 7), '#8E9A4A', 0, 'opacity="0.35"') + dot(50.2, 17, 0.7, U.parchD) + dot(54.5, 20.7, 0.7, U.parchD) + dot(46.6, 14.2, 0.6, U.parchD));
    return `<g mask="${m}">${s}</g>` + dot(61, 29, 0.9, U.parchD) + dot(56.6, 31.4, 0.6, U.parchD);
  });
}

function iGoals(): ArtAsset {
  return icon('ui_goals', (d) => {
    let s = '';
    const board = rrect(11, 9, 40, 51, 3.5);
    const paper = 'M15,15L47.5,14.5L47,55.6L15.4,56Z';
    let inner = solid(d, board, [11, 9, 40, 51], '#7A5434', '#5A3A22', { spk: 30, seed: 4, cols: ['#3B2814', '#9A7048'] });
    inner += solid(d, paper, [15, 14, 33, 42], U.paper, U.paperD, { sw: IW, spk: 20, seed: 7, grime: 1 });
    // dog-ear
    inner += F('M47,47.6L47,55.6L39.6,56Z', U.paperD, IW) + F('M47,47.6L40.6,49.6L39.6,56Z', '#C9C4B2', IW);
    // checklist
    const rows = [23, 31, 39, 47];
    rows.forEach((y, k) => {
      inner += F(rrect(18, y - 3.4, 5, 5, 0.6), '#E4E0D2', 0.9);
      inner += scribble(26, y + 0.5, k === 3 ? 9 : 16 - k * 2, 10 + k, 0.8, '#3A3833', 0.75);
      if (k < 2) inner += L(`M18.4,${f(y - 1)}l2.2,2.8l4.4,-6.4`, 1.6, '#36521A');
    });
    inner += L('M26,31.6h12', 0.8, U.red, 'opacity="0.7"'); // crossed out
    // coffee ring
    inner += d.clip(paper, L(ell(38, 41, 7.5, 7), 1.6, U.coffee, 'opacity="0.55"') + L(ell(38, 41, 6.4, 6), 0.6, U.coffee, 'opacity="0.35"') + F(blob(31.5, 46, 1.6, 2.4, 3), U.coffee, 0, 'opacity="0.4"'));
    s += g(inner, 'rotate(-4 31 35)');
    // clip
    const clip = 'M22,6.5Q22,4 24.5,4H37.5Q40,4 40,6.5L41.5,14H20.5Z';
    s += solid(d, clip, [20, 4, 22, 10], U.steel, U.steelD, { spk: 8, seed: 3, cols: [U.rust, '#3B2E1C'] });
    s += F(ell(31, 8, 2.2, 1.6), '#2A2A28', 0.8) + L('M24,12.4h14', TW, U.steelHi);
    // chewed pencil
    s += g(
      F(rrect(-2.2, -14, 4.4, 24, 0.6), '#C2A23E', IW) +
        L('M-0.6,-13V9', TW, '#8E7426') +
        F('M-2.2,10L0,15.6L2.2,10Z', '#D8C9A0', IW) +
        F('M-0.7,13.8L0,15.6L0.7,13.8Z', INK) +
        F('M-2.2,-14l1,-2l1.1,1.4l1.2,-1.8l1.1,2.4z', '#9A8456', IW * 0.8),
      'translate(50 46) rotate(-32)',
    );
    return s;
  });
}

function iPets(): ArtAsset {
  return icon('ui_pets', (d) => {
    let s = '';
    const fur = '#8A7A62';
    const furD = '#625641';
    // collar + tag (behind the jowls)
    s += solid(d, 'M18,49Q32,56 46,49L47,55Q32,62 17,55Z', [17, 49, 30, 13], U.maroon, U.maroonD, { vol: false, spk: 6, seed: 1 });
    s += F('M27,58Q29,52 32,58Q35,52 37,58', 'none', 0);
    s += solid(d, ell(32, 59.5, 3.6, 3.2), [28, 56, 8, 7], U.brass, U.brassD, { sw: IW, vol: false });
    // ears: left floppy, right torn
    const earL = 'M19,17Q8,16 7,30Q7,40 13,42Q17,36 19,28Z';
    const earR = 'M45,17Q56,16 57,30L55.5,33L57,35.5L54,37L55,40.5Q51,38 47,28Z';
    s += solid(d, earL, [7, 16, 12, 26], '#5E4E3A', '#423626', { vol: false, spk: 10, seed: 3 });
    s += solid(d, earR, [45, 16, 12, 25], '#5E4E3A', '#423626', { vol: false, spk: 10, seed: 4 });
    // head
    const head = 'M32,12C43,12 49,19 49,30C49,40 44,51 32,51C20,51 15,40 15,30C15,19 21,12 32,12Z';
    s += cel(d, head, fur, furD, [-2.2, -2]);
    s += d.clip(head, F(blob(42, 20, 6, 6, 9), '#6E8A30', 0, 'opacity="0.85"') + F(blob(42, 20, 3.4, 3.2, 10), U.zgreenD, 0, 'opacity="0.6"'));
    s += vol(d, head, [15, 12, 34, 39], 0.12, 0.25);
    s += speckle(d, head, [15, 12, 34, 39], 40, ['#4A3E2C', '#A89A80'], 7, 0.3, 0.7, 0.55);
    s += L(head, OW);
    // stitches round the rot patch
    s += L('M36,15.5Q34,22 38,27.5', IW) + L('M34.4,17.4l2.6,0.6M34.2,21l2.6,0.4M35,24.6l2.6,-0.4', 0.7);
    // brow wrinkles
    s += L('M26,20.5q6,-2 12,0M27.5,23q4.5,-1.4 9,0', TW, '#4A3E2C');
    // muzzle
    const muz = 'M23,39Q23,32 32,32Q41,32 41,39Q41,46 32,46Q23,46 23,39Z';
    s += solid(d, muz, [23, 32, 18, 14], '#B3A688', '#8E8164', { sw: IW, spk: 12, seed: 5, cols: ['#4A3E2C'] });
    // eyes
    s += zEye(24.5, 28.5, 4, 2.8, 0.25, '#5E4E3A') + zEye(39.6, 28.2, 4.2, 3, 0.65, '#5E4E3A');
    // nose
    s += F('M28.4,35.4Q32,33.6 35.6,35.4Q35,39 32,39.4Q29,39 28.4,35.4Z', '#241C16', IW) + dot(30.6, 35.2, 0.7, '#8A8070');
    s += L('M32,39.4V42M26.5,42Q32,45.5 37.5,42', IW);
    // lolling tongue with a drip
    s += F('M33,42.6Q38.4,42 38.6,47.4Q38.4,52 35,51.8Q32.2,51.4 33,42.6Z', '#9A5A58', IW) + L('M35.6,44.4V49.6', TW, '#6A3432') + F('M36,51.6q0.8,2.6 -0.2,4q-1,-1.6 0.2,-4z', '#B8B2A0', 0.5);
    return s;
  });
}

function iPedia(): ArtAsset {
  return icon('ui_zombiepedia', (d) => {
    let s = '';
    // severed finger bookmark sticking out of the top (behind the cover)
    s += g(
      F(capsule([0, 14], [0, -2], 6.4, 6), '#8DAF52', IW) +
        F('M-2.2,-3.2Q0,-6 2.2,-3.2L2,1.6H-2Z', '#C9C2A0', IW * 0.8) +
        L('M-2.6,5h2.8M-2.4,8.4h3', TW, U.zgreenDD) +
        F(blob(1.2, 4, 1.2, 1, 2), U.zgreenD, 0, 'opacity="0.7"'),
      'translate(41 6) rotate(10)',
    );
    // pages (right edge) + spine
    s += solid(d, 'M48,9L52.5,11L54,56L50,57Z', [48, 9, 6, 48], U.paper, U.paperD, { vol: false });
    s += L('M50,12L51.6,55M51.4,12.6L52.8,55.4', TW, '#8A8474');
    const spine = 'M10,12.5L16.5,9.5L18.5,58L12,56.5Z';
    s += solid(d, spine, [10, 9, 9, 49], '#3F3F2E', '#2C2C20', { vol: false, spk: 10, seed: 3 });
    const cover = 'M16.5,9.5L50,8.4L51,57L18.5,58Z';
    s += solid(d, cover, [16, 8, 35, 50], '#5D5D44', '#44442F', { off: [-1.6, -1.6], spk: 45, seed: 9, grime: 3, cols: ['#2A2A1C', '#7A7A5A', '#3B2E1C'] });
    // duct-taped spine
    s += F('M8.6,30.5L21,29.8L21.4,37.2L9,38Z', '#8D8E86', IW) + L('M10,32.6l10.6,-0.6M10.2,35.4l10.6,-0.5', TW, '#B0B1A8') + L('M21,29.8l-0.6,1.4l1,1.2l-0.6,1.6l0.8,1.4l-0.4,1.8', TW);
    // embossed band
    s += L('M19,15.5L49.6,14.6M19.6,51.8L50.6,51.2', 1, '#2C2C20', 'opacity="0.7"') + L('M19,16.4L49.6,15.5', TW, '#7A7A5A', 'opacity="0.6"');
    // polaroid of a zombie, taped on
    let pol = F(rrect(-11, -12, 22, 25, 1), '#D2CDBA', IW) + F('M-8.6,-9.6H8.6V7H-8.6Z', '#2F3A2C', 0.8);
    pol += F('M0,-7.4C5,-7.4 6.4,-3.6 6.2,0.6C6,4.6 3.6,7 0,7C-3.6,7 -6,4.6 -6.2,0.6C-6.4,-3.6 -5,-7.4 0,-7.4Z', U.zgreen, 0.8);
    pol += F('M-4.4,-1.4q1.8,-1.6 3.2,0q-1.6,1 -3.2,0z', U.zeye, 0.5) + F('M1.4,-1.2q1.8,-1.8 3.4,0q-1.8,1.2 -3.4,0z', U.zeye, 0.5);
    pol += L('M-3,3.6q3,-1 6,0.6', 0.8) + L('M-6,-4.6l2.4,1.6', 0.6, U.zgreenDD);
    pol += scribble(-7, 11, 12, 3, 0.6, '#3A3833', 0.8);
    pol += F('M-4,-14.4l8,0.4l-0.4,4l-8,-0.4z', '#C9C2A0', 0.6, 'opacity="0.9"');
    s += g(pol, 'translate(34 33) rotate(-6)');
    s += handprint(46, 50, 0.32, -30, '#6E9A2A', 0.7, 2);
    return s;
  });
}

function crate(d: Doc, cx: number, top: number, w: number, hgt: number, seed: number): string {
  // 3/4 crate: top diamond, left + right faces
  const hw = w / 2;
  const dh = w * 0.27;
  const T: Pt = [cx, top];
  const R: Pt = [cx + hw, top + dh];
  const Bc: Pt = [cx, top + dh * 2];
  const Lf: Pt = [cx - hw, top + dh];
  const left = poly([Lf, Bc, [Bc[0], Bc[1] + hgt], [Lf[0], Lf[1] + hgt]]);
  const right = poly([Bc, R, [R[0], R[1] + hgt], [Bc[0], Bc[1] + hgt]]);
  const topP = poly([T, R, Bc, Lf]);
  let s = '';
  s += solid(d, left, [Lf[0], Lf[1], hw, hgt + dh], PAL.woodHi, PAL.wood, { vol: false, sw: 0, spk: 20, seed, cols: [PAL.woodD, '#3B2814'] });
  s += solid(d, right, [Bc[0], R[1], hw, hgt + dh], PAL.wood, PAL.woodD, { vol: false, sw: 0, spk: 20, seed: seed + 1, cols: [PAL.woodD, '#3B2814'] });
  // planks on each face
  for (let k = 1; k < 3; k++) {
    const y = (hgt * k) / 3;
    s += L(`M${f(Lf[0])},${f(Lf[1] + y)}L${f(Bc[0])},${f(Bc[1] + y)}`, TW, PAL.woodD);
    s += L(`M${f(Bc[0])},${f(Bc[1] + y)}L${f(R[0])},${f(R[1] + y)}`, TW, '#4A2E16');
  }
  // corner posts / braces
  const post = (x0: number, y0: number, x1: number, y1: number, col: string) =>
    F(poly([[x0, y0], [x1, y1], [x1, y1 + hgt], [x0, y0 + hgt]]), col, IW * 0.8);
  s += post(Lf[0], Lf[1], Lf[0] + 3.4, Lf[1] + 3.4 * 0.54, PAL.woodD);
  s += post(Bc[0] - 3, Bc[1] - 3 * 0.54, Bc[0], Bc[1], PAL.wood);
  s += post(Bc[0], Bc[1], Bc[0] + 3, Bc[1] - 3 * 0.54, '#5A3A1C');
  s += post(R[0] - 3.4, R[1] + 3.4 * 0.54, R[0], R[1], '#5A3A1C');
  // diagonal brace on the left face
  s += L(`M${f(Lf[0] + 3)},${f(Lf[1] + hgt - 1)}L${f(Bc[0] - 3)},${f(Bc[1] + 2)}`, 3.6) + L(`M${f(Lf[0] + 3)},${f(Lf[1] + hgt - 1)}L${f(Bc[0] - 3)},${f(Bc[1] + 2)}`, 2, PAL.woodHi);
  // top rim with dark open interior
  s += F(topP, '#2A1A0C', OW * 0.9);
  const inset = poly([
    [T[0], T[1] + 2.6],
    [R[0] - 4.6, R[1]],
    [Bc[0], Bc[1] - 2.6],
    [Lf[0] + 4.6, Lf[1]],
  ]);
  s += F(inset, '#1A1008', 0) + F(poly([[Lf[0] + 4.6, Lf[1]], [T[0], T[1] + 2.6], [R[0] - 4.6, R[1]], [R[0] - 8, R[1] + 1.2], [T[0], T[1] + 5], [Lf[0] + 8, Lf[1] + 1.2]]), '#3A2410', 0);
  s += L(left, OW) + L(right, OW);
  return s;
}

function iStorage(): ArtAsset {
  return icon('ui_storage', (d) => {
    let s = crate(d, 32, 23.5, 42, 17.5, 3);
    // stencilled skull on the right face
    s += g(F(ell(0, 0, 3.4, 3), '#2A1A0C', 0, 'opacity="0.6"') + dot(-1.2, -0.3, 0.9, PAL.wood) + dot(1.4, -0.4, 0.9, PAL.wood) + L('M-3,4.4l6,-1.6M-3,2.8l6,1.6', 0.9, '#2A1A0C', 'opacity="0.6"'), 'translate(42.6 43.4) skewY(-28)');
    // green arrow going in
    const arrow = 'M27,3H37V19H44L32,32L20,19H27Z';
    s += solid(d, arrow, [20, 3, 24, 29], U.olive, U.oliveD, { off: [-1.6, -1.4], spk: 10, seed: 6, cols: ['#2E4508', '#3B2E1C'] });
    s += L('M28.8,5V19.8', TW, U.oliveHi, 'opacity="0.7"');
    return s;
  });
}

function iEdit(): ArtAsset {
  return icon('ui_edit', () => {
    let s = '';
    // paintbrush (behind), bristles up-left
    const brush =
      F(rrect(-3, 6, 6, 26, 3), U.oxblood, OW) +
      L('M-1.2,9V29', TW, '#9A4A50') +
      F(blob(1, 22, 1.4, 2, 4), '#B07A60', 0, 'opacity="0.7"') +
      F('M-4,-4H4L3.4,7H-3.4Z', U.steel, OW) +
      L('M-3.6,-1H3.6M-3.5,2.6H3.5', TW, U.steelD) +
      F('M-4,-4Q-5,-12 -3,-17Q0,-19 3,-17Q5,-12 4,-4Z', '#4A3A26', OW) +
      F('M-4.4,-8Q-5,-13 -3,-17Q0,-19 3,-17Q5,-13 4.5,-8Q2,-6.6 0,-8.4Q-2,-6.4 -4.4,-8Z', U.maroon, 0) +
      L('M-1.6,-15V-6M1.4,-16V-7', TW, '#2A1A0C', 'opacity="0.6"') +
      F('M2,-6.6q1.2,4 0,6q-1.4,-2 0,-6z', U.maroon, 0.6);
    s += g(brush, 'translate(39 35) rotate(-40)');
    // claw hammer (front), head up-right
    const hammer =
      F(rrect(-3, -4, 6, 36, 2.6), PAL.wood, OW) +
      L('M-1,-2C-1.6,8 0.4,16 -1,28M1.2,0C0.6,10 1.8,18 1,27', TW, PAL.woodD) +
      F(rrect(-3.8, 17, 7.6, 10, 1), '#8D8E86', OW * 0.8) +
      L('M-3.4,19.6h6.8M-3.4,22.4h6.8M-3.4,25h6.8', TW, '#B0B1A8') +
      F('M-11,-12H5L5,-3H-11Z', U.steel, OW) +
      F('M-14,-13.4H-9.4V-1.6H-14Z', U.steelD, OW) +
      F('M5,-11.6Q14,-12 16,-3Q12,-7.4 5,-5Z', U.steelD, OW) +
      L('M16,-3l-1.8,-1M15.4,-4.4l-2,-0.2', TW) +
      L('M-9,-10.6H3', TW, U.steelHi) +
      F(blob(-2, -6.4, 2.6, 1.6, 2), U.rust, 0, 'opacity="0.75"') +
      dot(1.6, -9, 0.6, U.rustD);
    s += g(hammer, 'translate(24 33) rotate(38)');
    return g(s, 'translate(32 33) scale(0.88) translate(-32 -33)');
  });
}

function iFridge(): ArtAsset {
  return icon('ui_fridge', (d) => {
    let s = '';
    const side = 'M46,9Q50,10 51,14L51,58L46,60Z';
    s += solid(d, side, [46, 9, 5, 51], U.paperD, '#8E8A7A', { vol: false, spk: 8, seed: 2 });
    const body = 'M15,15Q15,6 24,6H39Q46,6 46,14V60H15Z';
    s += solid(d, body, [15, 6, 31, 54], U.paper, U.paperD, { off: [-1.8, -1.4], spk: 40, seed: 5, grime: 2 });
    // rust along the bottom + drips from the seam
    s += d.clip(body, F('M15,55Q20,52 25,55T36,54T46,53V60H15Z', U.rust, 0, 'opacity="0.55"') + F(blob(20, 26.4, 3, 1.2, 3), U.rust, 0, 'opacity="0.6"') + L('M19,26v4M22,26.4v2.8', 0.8, U.rust, 'opacity="0.7"') + speckle(d, body, [15, 48, 31, 12], 20, [U.rust, U.rustD], 9, 0.3, 0.8, 0.8));
    // door seam + kick plate
    s += L('M15,24.6H46', IW) + L('M15.4,25.6H45.6', TW, '#FFFFFF', 'opacity="0.35"');
    s += F('M17,55H44V59H17Z', U.charcoal, IW) + L('M19,57h23', 0.7, '#6E6A60', 'stroke-dasharray="1.4 1"');
    // handles
    s += F(rrect(18, 13, 3, 8, 1.4), U.steel, IW) + F(rrect(18, 29, 3, 13, 1.4), U.steel, IW) + L('M18.8,30.4v10', TW, U.steelHi);
    // slime handprint
    s += d.clip(body, handprint(34, 44, 0.42, -12, '#6E9A2A', 0.85, 7));
    // note + magnet
    s += g(F('M-6,-6H6V7H-6Z', U.legal, IW) + scribble(-4.4, -2, 8, 5, 0.6) + scribble(-4.4, 1.4, 7, 6, 0.6) + scribble(-4.4, 4.4, 5, 7, 0.6), 'translate(36 16) rotate(7)');
    s += F(ell(36.6, 10, 2.2), U.red, IW) + dot(36, 9.4, 0.6, '#E07070');
    return s;
  });
}

function iSettings(): ArtAsset {
  return icon('ui_settings', (d) => {
    const n = 8;
    const R1 = 26;
    const R2 = 20.5;
    const pts: Pt[] = [];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2 - Math.PI / 2;
      const st = (Math.PI * 2) / n;
      const broken = k === 2;
      const rt = broken ? R2 + 2.2 : R1;
      for (const [da, r] of [
        [-0.5, R2],
        [-0.3, rt],
        [0.3 * (broken ? 0.4 : 1), rt],
        [0.5, R2],
      ] as [number, number][]) {
        pts.push([32 + Math.cos(a0 + da * st * 0.9) * r, 32 + Math.sin(a0 + da * st * 0.9) * r]);
      }
    }
    const gear = poly(pts) + ell(32, 32, 7.4).replace(/Z$/, 'Z');
    let s = '';
    s += `<g fill-rule="evenodd">${solid(d, gear, [6, 6, 52, 52], U.steel, U.steelD, { off: [-2, -2], spk: 50, seed: 4, cols: [U.rust, '#3B2E1C', U.rustD] })}</g>`;
    s += d.clip(gear, F(blob(44, 44, 9, 7, 3), U.rust, 0, 'opacity="0.55"') + F(blob(18, 41, 5, 4, 5), U.rust, 0, 'opacity="0.45"') + F(blob(22, 18, 4, 3, 8), '#3B2E1C', 0, 'opacity="0.3"'));
    s += L(ell(32, 32, 14.5), IW, U.steelD) + L('M20,24A14.5,14.5 0 0 1 30,17.6', TW, U.steelHi);
    // hex nut in the hole
    const hex = poly([0, 1, 2, 3, 4, 5].map((k) => [32 + Math.cos((k / 6) * Math.PI * 2) * 6.2, 32 + Math.sin((k / 6) * Math.PI * 2) * 6.2] as Pt));
    s += solid(d, hex, [26, 26, 12, 12], '#7A7E7A', '#4A4E4E', { sw: IW });
    s += F(ell(32, 32, 2.6), '#1A1A18', IW * 0.8);
    s += crack(43.6, 17, -0.9, 5, 3, 0.7);
    return s;
  });
}

function iCash(): ArtAsset {
  return icon('ui_cash', (d) => {
    let s = '';
    const bill = (dx: number, dy: number, rot: number, top: boolean, seed: number) => {
      const p = rrect(-19, -10, 38, 20, 1.2);
      let b = solid(d, p, [-19, -10, 38, 20], '#8E9E70', '#6A7A50', { vol: true, spk: top ? 24 : 0, seed, cols: ['#4A5A36', '#3B2E1C'] });
      if (top) {
        b += L(rrect(-16.4, -7.4, 32.8, 14.8, 1), TW, '#4A5A36');
        b += F(ell(0, 0, 6.4, 5.6), '#A4B282', 0.8);
        b += txt(0, 3.6, '$', 10, '#3E4A2A');
        b += dot(-12.6, -4, 1.4, '#4A5A36', 0.8) + dot(12.6, 4, 1.4, '#4A5A36', 0.8);
        b += d.clip(p, handprint(11, 3, 0.26, 30, U.blood, 0.7, 4));
      }
      return g(b, `translate(${f(dx)} ${f(dy)}) rotate(${f(rot)})`);
    };
    s += bill(30, 21, -14, false, 1) + bill(29, 26, -6, false, 2) + bill(28, 31, 3, true, 3);
    // paper band
    s += g(F('M-4,-11H4V11H-4Z', '#C9B98A', IW) + L('M-4,-6H4M-4,6H4', TW, '#8E7A50'), 'translate(22 31) rotate(3)');
    // coin in front
    s += solid(d, ell(44, 44, 12.4), [31, 31, 26, 26], U.brass, U.brassD, { off: [-1.8, -1.8], spk: 20, seed: 9, cols: [U.brassD, '#3B2E1C'] });
    s += L(ell(44, 44, 9.4), IW, U.brassD) + txt(44, 49, '$', 14, '#6A5016', { sw: 0.6, stroke: '#4A3810' });
    s += L('M36.4,38A9.4,9.4 0 0 1 41,35', 1, U.brassHi);
    s += F(blob(49, 49, 2.4, 1.8, 3), '#3B2E1C', 0, 'opacity="0.35"');
    return s;
  });
}

function iSauce(): ArtAsset {
  return icon('ui_sauce', (d) => {
    let s = '';
    // glow
    s += F(ell(32, 41, 24, 20), d.radial(32, 41, 24, [[0, U.toxin, 0.35], [1, U.toxin, 0]]));
    const vial = 'M25,16H39V22C45,24 47,29 47,34V52Q47,59 40,59H24Q17,59 17,52V34C17,29 19,24 25,22Z';
    // glass back
    s += F(vial, '#3E4A40', 0, 'opacity="0.55"');
    // liquid with a wobbly meniscus
    const liquid = 'M17,33Q22,30.5 27,33T37,32.6T47,32.4V60H17Z';
    let inner = F(liquid, U.toxinD) + F('M17,33Q22,30.5 27,33T37,32.6T47,32.4V48Q36,52 26,46T17,48Z', U.toxin, 0);
    inner += F(blob(25, 41, 3.4, 4.6, 4), U.toxinHi, 0, 'opacity="0.55"');
    inner += F(ell(36, 44, 2.2), U.toxinHi, 0.6, 'opacity="0.9"') + F(ell(30, 52, 1.5), U.toxinHi, 0.5) + F(ell(40, 38.6, 1.2), U.toxinHi, 0.5);
    inner += L('M17,33Q22,30.5 27,33T37,32.6T47,32.4', 1, '#1E5A14');
    inner += F(blob(36, 55, 9, 4, 2), '#1E5A14', 0, 'opacity="0.45"');
    s += d.clip(vial, inner);
    // label: crossbones, stained
    s += g(F('M-7,-5.4H7V5.4H-7Z', U.paper, IW) + L('M-3.6,-2.4L3.6,3M-3.6,3L3.6,-2.4', 1.2) + F(ell(0, -0.4, 2.2, 2), U.paper, 0.8) + dot(-0.8, -0.6, 0.5, INK) + dot(0.8, -0.6, 0.5, INK) + F(blob(4, 3, 3, 2, 3), U.toxinD, 0, 'opacity="0.5"'), 'translate(36 47) rotate(-6)');
    // glass highlights + outline
    s += L('M21,35V51', 2, '#FFFFFF', 'opacity="0.45"') + L('M21.4,30Q22.6,26 26,24.4', 1.2, '#FFFFFF', 'opacity="0.4"') + L('M43.6,38V50', 0.9, '#FFFFFF', 'opacity="0.25"');
    s += L(vial, OW);
    s += L('M25,22H39', TW, INK, 'opacity="0.6"');
    // cork
    const cork = 'M23,5.5Q23,3.5 25,3.5H39Q41,3.5 41,5.5L40,16.5H24Z';
    s += solid(d, cork, [23, 3, 18, 14], PAL.woodHi, PAL.wood, { spk: 24, seed: 8, cols: [PAL.woodD, '#3B2814'] });
    s += L('M24.4,9.6H39.6', TW, PAL.woodD);
    // drip running down the outside
    s += F('M39,16Q41.4,19 40.4,23Q41,26.6 39.6,28.4Q38.2,26.6 38.8,23Q37.8,19.6 39,16Z', U.toxin, IW * 0.8);
    s += F('M17.5,57Q12,58 11,60.6Q14,61.4 18.6,59.6Z', U.toxinD, IW * 0.8, 'opacity="0.9"');
    return s;
  });
}

function iXp(): ArtAsset {
  return icon('ui_xp', (d) => {
    let s = '';
    // scalloped tin rim
    const n = 16;
    const rim: Pt[] = [];
    for (let k = 0; k < n * 2; k++) {
      const a = (k / (n * 2)) * Math.PI * 2;
      const r = k % 2 ? 25.6 : 27.4;
      rim.push([32 + Math.cos(a) * r, 32 + Math.sin(a) * r]);
    }
    s += solid(d, roundPoly(rim, 1.2), [5, 5, 54, 54], U.brass, U.brassD, { off: [-1.8, -1.8], spk: 30, seed: 3, cols: [U.brassD, '#3B2E1C'] });
    const enamel = ell(32, 32, 20.4);
    s += solid(d, enamel, [12, 12, 40, 40], U.slate, U.slateD, { off: [-2, -2], sw: IW * 1.2, spk: 30, seed: 6, cols: ['#163644', '#6E8E9A'] });
    // chipped enamel showing tin
    s += F('M44,18Q47,21 46.4,24Q44,22.6 42,23.4Q42.4,20.6 44,18Z', U.brassHi, 0.6) + F(blob(19, 44, 2, 1.4, 4), U.brassHi, 0.5);
    s += L('M16,26A17,17 0 0 1 27,15.6', 1.2, '#FFFFFF', 'opacity="0.3"');
    s += L('M24,48l9,-3M38,46l4,-6', TW, '#9AB8C4', 'opacity="0.5"');
    s += txt(32.5, 39.2, 'XP', 19, U.cream, { sw: 1.8, stroke: INK, ls: -0.5 });
    s += F(poly(starPts(32, 20.5, 3.6, 1.6)), U.gold, 0.7) + F(poly(starPts(23.4, 22.4, 2.2, 1)), U.gold, 0.5) + F(poly(starPts(40.6, 22.4, 2.2, 1)), U.gold, 0.5);
    return s;
  });
}

function starShape(d: Doc, cx: number, cy: number, R: number, r: number, seed: number): string {
  // slightly hand-cut star with a chipped tip
  const pts = starPts(cx, cy, R, r);
  const rr = rnd(seed);
  const jit = pts.map(([x, y], k) => [x + (rr() - 0.5) * 1.2, y + (rr() - 0.5) * 1.2 + (k === 4 ? 2.6 : 0)] as Pt);
  const p = roundPoly(jit, 1.4);
  let s = solid(d, p, [cx - R, cy - R, R * 2, R * 2], U.gold, U.goldD, { off: [-2.4, -2.2], spk: 36, seed, cols: [U.goldD, '#5E5232', '#3B2E1C'] });
  s += d.clip(p, F(blob(cx + R * 0.3, cy + R * 0.4, R * 0.3, R * 0.2, seed + 3), '#5E5232', 0, 'opacity="0.3"'));
  s += L(`M${f(cx - R * 0.5)},${f(cy - R * 0.2)}L${f(cx - R * 0.16)},${f(cy - R * 0.56)}`, 1.4, U.goldHi, 'opacity="0.85"');
  s += crack(cx + R * 0.2, cy + R * 0.1, 0.9, R * 0.35, seed + 5, 0.6, '#5E4210', 0);
  return s;
}

function iStar(): ArtAsset {
  return icon('ui_star', (d) => starShape(d, 32, 34, 28.5, 12.6, 5));
}

// ================================================================= store tabs
function iTabFeatured(): ArtAsset {
  return icon('ui_tab_featured', (d) => {
    let s = '';
    // ribbon tails
    s += solid(d, 'M22,36L14,60L20.6,56.4L24,62L31,40Z', [14, 36, 17, 26], U.maroon, U.maroonD, { vol: false, spk: 8, seed: 2 });
    s += solid(d, 'M42,36L50,59L43.4,55.6L40.4,62L33,40Z', [33, 36, 17, 26], U.maroon, U.maroonD, { vol: false, spk: 8, seed: 3 });
    // pleated rosette
    const n = 18;
    const ros: Pt[] = [];
    for (let k = 0; k < n * 2; k++) {
      const a = (k / (n * 2)) * Math.PI * 2;
      const r = k % 2 ? 19.4 : 23;
      ros.push([32 + Math.cos(a) * r, 29 + Math.sin(a) * r]);
    }
    const rp = roundPoly(ros, 1.6);
    s += solid(d, rp, [9, 6, 46, 46], U.rose, U.roseD, { off: [-2, -2], spk: 30, seed: 5 });
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      s += L(`M${f(32 + Math.cos(a) * 14)},${f(29 + Math.sin(a) * 14)}L${f(32 + Math.cos(a) * 21.6)},${f(29 + Math.sin(a) * 21.6)}`, TW, U.roseD);
    }
    // olive stain on the rosette
    s += d.clip(rp, F(blob(17, 37, 5, 4, 6), U.oliveStain, 0, 'opacity="0.6"'));
    // brass centre with a star
    s += solid(d, ell(32, 29, 13), [19, 16, 26, 26], U.brass, U.brassD, { off: [-1.6, -1.6], spk: 16, seed: 8, cols: [U.brassD] });
    s += L(ell(32, 29, 10.4), TW, U.brassD);
    s += F(poly(starPts(32, 29.6, 8.4, 3.6)), U.gold, IW) + L('M28.6,26.4l2,-2.6', 0.9, U.goldHi);
    return s;
  });
}

function iTabDecor(): ArtAsset {
  return icon('ui_tab_decor', (d) => {
    let s = '';
    // crooked frame on the wall behind
    let fr = solid(d, 'M0,0H24V20H0Z', [0, 0, 24, 20], '#7A5434', '#5A3A22', { vol: false, spk: 10, seed: 3 });
    fr += F('M3.4,3.4H20.6V16.6H3.4Z', '#6E7A6A', IW) + F('M5,16.6Q9,9 12,12T19,9V16.6Z', '#4E5A44', 0) + F(ell(16, 7, 2), '#B8AE82', 0) + crack(6, 4, 0.9, 9, 4, 0.6, '#2A2A22', 0);
    s += g(fr, 'translate(4 6) rotate(-9)');
    // wilted plant
    s += L('M36,40C35,30 30,24 26,20', 1.8 + OW * 2) + L('M36,40C35,30 30,24 26,20', 1.8, '#5E6A2A');
    s += L('M37,40C38,30 44,24 49,26', 1.6 + OW * 2) + L('M37,40C38,30 44,24 49,26', 1.6, '#5E6A2A');
    s += solid(d, 'M26,20Q19,20 17,28Q23,28 26,20Z', [17, 20, 9, 8], '#7A7A3A', '#55552A', { vol: false, sw: IW });
    s += solid(d, 'M49,26Q53,31 51,38Q47,33 49,26Z', [47, 26, 6, 12], '#8A7A44', '#5E5232', { vol: false, sw: IW });
    s += solid(d, 'M34,28Q28,30 26,37Q32,36 34,28Z', [26, 28, 8, 9], '#6E6A3A', '#4E4A28', { vol: false, sw: IW });
    s += solid(d, 'M41,30Q46,34 46,41Q40,38 41,30Z', [40, 30, 6, 11], '#7A6A3A', '#55482A', { vol: false, sw: IW });
    s += F('M47.6,40.4l1.4,3.4l-2.6,-0.6z', '#6A5A30', 0.6); // fallen leaf
    // cracked terracotta pot
    const pot = 'M24,40H50L46.4,60H27.6Z';
    s += solid(d, pot, [24, 40, 26, 20], '#9A5A3A', '#73402A', { spk: 20, seed: 7, grime: 1 });
    s += solid(d, 'M22.6,38H51.4V44H22.6Z', [22, 38, 29, 6], '#A8664A', '#7E4A32', { sw: OW, vol: false });
    s += crack(41, 44.4, 1.4, 14, 5, 0.9) + F('M36,44h3.4l-1.4,3.4z', '#3A2014', 0.5);
    s += F(blob(29, 52, 2.6, 4, 2), '#4E5A2A', 0, 'opacity="0.5"');
    return s;
  });
}

function iTabKitchen(): ArtAsset {
  return icon('ui_tab_kitchen', (d) => {
    let s = '';
    // muted flames under the pan
    const flame = (x: number, h: number, w: number) => `M${f(x - w)},54Q${f(x - w)},${f(54 - h * 0.5)} ${f(x)},${f(54 - h)}Q${f(x + w)},${f(54 - h * 0.5)} ${f(x + w)},54Z`;
    s += F(flame(18, 14, 4.4) + flame(30, 17, 5) + flame(42, 13, 4.4), '#B8652A', IW);
    s += F(flame(18, 7, 2) + flame(30, 9, 2.4) + flame(42, 6.6, 2), '#E0B53C', 0);
    // handle
    s += g(F(rrect(0, -3.2, 20, 6.4, 3), U.charcoal, OW) + F(ell(15, 0, 1.6), '#121110', 0) + L('M2,-1.4H12', TW, '#6E6A60'), 'translate(48 36) rotate(-14)');
    // skillet (iso ellipse)
    s += F(ell(30, 40, 24, 13.4), U.charcoalD, OW) + F(ell(30, 37.6, 24, 12.4), U.charcoal, OW);
    s += F(ell(30, 38, 20, 10), '#1E1D1A', IW);
    s += L('M14,35A20,10 0 0 1 28,28.4', 1, '#6E6A60', 'opacity="0.8"');
    s += speckle(d, ell(30, 38, 20, 10), [10, 28, 40, 20], 20, ['#4A3E2C', '#5E5232'], 3, 0.3, 0.9, 0.7);
    // fried egg with an eyeball yolk
    const white = blob(30, 37.4, 11.6, 6.6, 4, 9, 0.38);
    s += solid(d, white, [18, 30, 24, 14], '#D8D2BC', '#ACA48A', { sw: IW, vol: false, spk: 8, seed: 2, cols: ['#8A7A50'] });
    s += L('M21,40q3,1.4 6,0.4', TW, '#8A7A50', 'opacity="0.8"');
    s += F(ell(31, 35.6, 5.8, 5.2), '#E2DCC6', IW);
    s += L('M26.2,36.6q1.8,-0.2 2.6,-1.6M27,33.2q1.6,0.6 2.2,1.6M35.6,37.8q-1.4,-0.6 -2,-1.8', 0.55, U.red);
    s += F(ell(31.8, 35, 2.8, 2.6), '#6E8A30', 0.7) + F(ell(32, 34.9, 1.3), '#121110', 0) + dot(30.9, 34, 0.7, '#FFFFFF', 0.9);
    // grease splatter
    s += dot(47, 26, 0.9, '#B8AE82', 0.8) + dot(12, 28, 0.8, '#B8AE82', 0.8) + dot(44, 22, 0.6, '#B8AE82', 0.7);
    return g(s, 'translate(29 36) scale(0.9) translate(-32 -36)');
  });
}

function iTabFurniture(): ArtAsset {
  return icon('ui_tab_furniture', (d) => {
    let s = '';
    // chrome frame (back legs first)
    s += rod('M39,40L41,60', 1.8, U.steel, 1.4) + rod('M21,40L19.6,58', 1.8, U.steel, 1.4);
    // backrest uprights
    s += rod('M22,10L23,36M42,9L41,36', 1.8, U.steel, 1.4);
    // backrest vinyl pad (torn, taped)
    const back = rrect(17.4, 6, 29.2, 18.4, 5);
    s += solid(d, back, [17, 6, 30, 19], U.oxblood, U.oxbloodD, { off: [-1.6, -1.6], spk: 16, seed: 3, cols: ['#2A0810', '#9A4A50'] });
    s += F('M30,10.6Q33,13.6 31.4,18.4Q29,15.4 30,10.6Z', '#C9B26A', IW * 0.8) + L('M30.6,12.6l1,4', TW, '#8E7A3A');
    s += L('M22,9.4Q32,7.4 42,9.4', 1, '#9A4A50', 'opacity="0.7"');
    // seat: parallelogram top + front edge
    const seat = 'M14,36Q14,32.6 18,32.6H46Q50,32.6 50,36L49,39.6Q49,42 46,42H17Q14,42 14,39.6Z';
    s += solid(d, seat, [14, 32, 36, 10], '#7E2232', U.oxbloodD, { off: [-1.6, -1.6], spk: 16, seed: 4, cols: ['#2A0810', '#9A4A50'] });
    s += L('M16,38.2Q32,39.6 48,38.2', TW, '#3A0812');
    // duct tape X on the seat
    s += F('M24,33.2L36,40.6L34.4,42L22.4,34.6Z', '#8D8E86', 0.7) + F('M36,33L24.6,41.6L22.8,40.4L34.4,32.2Z', '#9A9B92', 0.7);
    // front legs
    s += rod('M18,42L15,61M46,42L48.6,61', 2, U.steel, 1.5) + L('M17.4,44l-2,13', 0.6, U.steelHi);
    s += F(ell(15, 61.2, 2.4, 1.2), INK) + F(ell(48.6, 61.2, 2.4, 1.2), INK);
    s += F(blob(40, 58, 4, 1.2, 4), U.rust, 0, 'opacity="0.5"');
    return s;
  });
}

function iTabWalls(): ArtAsset {
  return icon('ui_tab_walls', (d) => {
    let s = '';
    // unrolled strip hanging down
    const strip = 'M18,20H44V50L41,53L38,50.6L35,54L31,51L27.6,55L24,51.4L21,54L18,51Z';
    let pat = '';
    for (let y = 22; y < 56; y += 8)
      for (let x = 20 + ((y / 8) % 2) * 4; x < 46; x += 8)
        pat += F(`M${f(x)},${f(y - 2.8)}L${f(x + 2.2)},${f(y)}L${f(x)},${f(y + 2.8)}L${f(x - 2.2)},${f(y)}Z`, U.maroon, 0, 'opacity="0.85"') + dot(x + 4, y + 4, 0.8, U.olive, 0.9);
    s += solid(d, strip, [18, 20, 26, 35], '#C9B894', '#A8966E', { vol: false, sw: 0 });
    s += d.clip(strip, pat + L('M24,20V54M32,20V55M40,20V54', 1, U.rose, 'opacity="0.7"') + F(blob(37, 41, 7, 8, 5), '#7A5A30', 0, 'opacity="0.35"') + F(blob(37, 41, 5, 6, 6), '#C9B894', 0, 'opacity="0.35"'));
    s += vol(d, strip, [18, 20, 26, 35]);
    s += L(strip, OW);
    // curling corner
    s += F('M44,44Q47,47 44.6,50.6L41,53Q43,48 44,44Z', '#8E7E5A', IW);
    // roll on top (cylinder)
    const roll = 'M14,13Q14,8 18,8H46Q50,8 50,13V17Q50,22 46,22H18Q14,22 14,17Z';
    s += solid(d, roll, [14, 8, 36, 14], '#C9B894', '#9A8862', { off: [0, -1.6] });
    s += d.clip(roll, L('M16,12H48', 2.2, '#FFFFFF', 'opacity="0.25"') + pat);
    s += F(ell(48, 15, 3, 7), '#B8A47E', IW) + L(ell(48, 15, 1.8, 4.4), TW, '#8E7E5A') + F(ell(48, 15, 0.8, 1.8), '#5E4E30', 0);
    // paste brush resting on it
    s += g(F(rrect(-2, 0, 4, 14, 2), PAL.wood, IW) + F('M-3.4,-6H3.4V0H-3.4Z', U.steel, IW) + F('M-3.6,-6Q-4,-11 0,-12Q4,-11 3.6,-6Z', '#D8D0B0', IW), 'translate(10 46) rotate(28)');
    return s;
  });
}

function iTabSpecial(): ArtAsset {
  return icon('ui_tab_special', (d) => {
    let s = '';
    // zombie hand reaching out between box and lid
    const arm = 'M27,38L24,22L22,13Q21,10 23,9.4Q25,9 25.4,12L26.6,17.4L26.4,8Q26.4,5.4 28.4,5.4Q30.4,5.4 30.4,8L30.8,16.4L31.6,7.6Q31.8,5.2 33.8,5.6Q35.6,6 35.4,8.4L34.6,17L36.4,10.4Q37,8.4 38.8,9Q40.4,9.8 39.6,12L37,23L38,38Z';
    s += solid(d, arm, [21, 5, 20, 33], U.zgreen, U.zgreenD, { spk: 14, seed: 6, cols: [U.zgreenDD] });
    s += L('M27.8,10.6l1.6,0.2M32.6,10.4l1.6,0.4M23.4,14.6l1.4,-0.4', TW, U.zgreenDD) + F('M26.6,7.4q1.6,-1 3,0l-0.2,1.8h-2.6z', '#C9C2A0', 0.5);
    s += F(blob(33, 28, 2, 2.6, 2), U.blood, 0, 'opacity="0.7"');
    // box
    const box = 'M14,36H50V60H14Z';
    s += solid(d, box, [14, 36, 36, 24], U.rose, U.roseD, { spk: 30, seed: 3, grime: 2 });
    s += F('M28,36H36V60H28Z', U.olive, IW) + L('M30,37V59', TW, U.oliveHi, 'opacity="0.7"');
    s += d.clip(box, F(blob(19, 53, 5, 4, 7), U.oliveStain, 0, 'opacity="0.6"'));
    // lid knocked askew
    const lid = 'M0,0H30V9H0Z';
    s += g(solid(d, lid, [0, 0, 30, 9], '#8E5560', U.roseD, { spk: 12, seed: 4 }) + F('M11,0H18V9H11Z', U.olive, IW), 'translate(31 26) rotate(-24)');
    // bow on the lid
    s += g(F('M0,0Q-9,-7 -8,-1Q-7,3 0,0Z', U.olive, IW) + F('M0,0Q8,-8 8.4,-2Q8.4,3 0,0Z', U.oliveD, IW) + F(ell(0, 0, 2.2), U.oliveHi, IW), 'translate(43.6 18.6) rotate(-24)');
    return s;
  });
}

function iTabStorage(): ArtAsset {
  return icon('ui_tab_storage', (d) => {
    let s = '';
    const K = '#B08C5A';
    const KD = '#8A6A3E';
    // back flaps
    s += solid(d, 'M22,22L44,18L40,10L18,14Z', [18, 10, 26, 12], KD, '#6E5230', { vol: false, sw: IW });
    s += solid(d, 'M44,18L52,27L56,18L48,11Z', [44, 11, 12, 16], KD, '#6E5230', { vol: false, sw: IW });
    // interior
    s += F('M12,27L22,22L44,18L52,27Z', '#3A2A18', IW);
    // front + side faces
    const front = 'M12,27L40,32L40,60L12,54Z';
    const side = 'M40,32L52,27L52,54L40,60Z';
    s += solid(d, side, [40, 27, 12, 33], KD, '#6E5230', { vol: false, spk: 14, seed: 2 });
    s += solid(d, front, [12, 27, 28, 33], K, KD, { spk: 30, seed: 4, grime: 2 });
    // front flaps hanging open
    s += solid(d, 'M12,27L40,32L33,40L6,34Z', [6, 27, 34, 13], '#C29C66', K, { vol: false, sw: IW });
    s += solid(d, 'M40,32L52,27L60,33L47,39Z', [40, 27, 20, 12], K, KD, { vol: false, sw: IW });
    // tape + arrows doodle + stain
    s += F('M23,34.5L29,35.6L29,58L23,56.6Z', '#C9B98A', 0.6, 'opacity="0.85"');
    s += L('M16,50l0,-7l-2,2.4M16,43l2,2.4M34,52l0,-7l-2,2.4M34,45l2,2.4', 0.9, '#3A2A18');
    s += d.clip(front, L(ell(33, 50, 5, 4), 1.2, U.coffee, 'opacity="0.45"'));
    s += F(blob(46, 50, 3, 4, 3), '#6E9A2A', 0, 'opacity="0.55"');
    return s;
  });
}

// ================================================================= edit tools
const PAINT = U.cream;
const PAINT_D = U.creamD;

function iRotate(): ArtAsset {
  return icon('ui_rotate', (d) => {
    // thick painted 270-degree arc (gap at the bottom) ending in an arrowhead, turning clockwise
    const r1 = 22;
    const r2 = 13;
    const rm = (r1 + r2) / 2;
    const ts = 0.75 * Math.PI;
    const te = 2.25 * Math.PI;
    const P = (a: number, r: number): Pt => [32 + Math.cos(a) * r, 33 + Math.sin(a) * r];
    const pt = (q: Pt) => `${f(q[0])},${f(q[1])}`;
    const p =
      `M${pt(P(ts, r1))}A${r1},${r1} 0 1 1 ${pt(P(te, r1))}` +
      `L${pt(P(te, r1 + 5.6))}L${pt(P(te + 0.62, rm))}L${pt(P(te, r2 - 5.6))}L${pt(P(te, r2))}` +
      `A${r2},${r2} 0 1 0 ${pt(P(ts, r2))}Z`;
    let s = solid(d, p, [6, 7, 52, 50], PAINT, PAINT_D, { off: [-1.8, -1.8], spk: 30, seed: 3, grime: 2 });
    s += d.clip(p, L(`M${pt(P(ts + 0.2, r1 - 2.6))}A${r1 - 2.6},${r1 - 2.6} 0 0 1 ${pt(P(1.55 * Math.PI, r1 - 2.6))}`, 1.4, '#FFFFFF', 'opacity="0.4"'));
    s += L(`M${pt(P(ts + 0.12, rm - 2))}l1.6,-2.4`, TW, '#5E5232', 'opacity="0.6"');
    return s;
  });
}

function iMove(): ArtAsset {
  return icon('ui_move', (d) => {
    // four-way arrow cross
    const a = 5; // half arm width
    const h = 9; // head half width
    const t = 26; // tip distance
    const n = 14; // head base distance
    const pts: Pt[] = [];
    for (let k = 0; k < 4; k++) {
      const rot = (k * Math.PI) / 2;
      const R = ([x, y]: Pt): Pt => [32 + x * Math.cos(rot) - y * Math.sin(rot), 32 + x * Math.sin(rot) + y * Math.cos(rot)];
      pts.push(R([-a, -a]), R([-a, -n]), R([-h, -n]), R([0, -t]), R([h, -n]), R([a, -n]));
    }
    const p = roundPoly(pts, 0.8);
    let s = solid(d, p, [6, 6, 52, 52], PAINT, PAINT_D, { off: [-1.8, -1.8], spk: 30, seed: 5, grime: 2 });
    s += F(ell(32, 32, 3.2), '#8A8474', IW) + dot(31.2, 31.2, 0.9, '#FFFFFF', 0.6);
    return s;
  });
}

function iSell(): ArtAsset {
  return icon('ui_sell', (d) => {
    let s = '';
    s += L('M24,16C16,6 6,10 8,20', 1.2 + 1.6) + L('M24,16C16,6 6,10 8,20', 1.2, '#C9B98A');
    const tg = g(
      solid(d, 'M0,0L13,-13H44V13H13Z', [0, -13, 44, 26], '#C9B38A', '#A08A60', { off: [-1.6, -1.6], spk: 26, seed: 4, grime: 2 }) +
        F(ell(11, 0, 2.6), '#3A2A18', IW) +
        L('M19,-9.4H41V9.4H19Z', TW, '#8E7A50', 'stroke-dasharray="2 1.4"') +
        txt(30.6, 7.6, '$', 21, '#3E4A2A', { sw: 0.8, stroke: '#2A3018' }) +
        handprint(38, 6, 0.24, 20, U.blood, 0.75, 9),
      'translate(10 40) rotate(-38)',
    );
    s += tg;
    s += L('M10,22Q12,24 14,21', 1.2, '#C9B98A');
    return s;
  });
}

function iCheck(): ArtAsset {
  return icon('ui_check', (d) => {
    const p = 'M7,34Q10,29 14,31L25,40Q36,22 51,9Q56,6 58,10Q59,13 55,17Q40,33 29,53Q26,57 22,54Z';
    let s = solid(d, p, [7, 6, 52, 51], '#79A03A', '#4E6E1A', { off: [-1.8, -1.8], spk: 30, seed: 4, cols: ['#2E4508', '#3B2E1C', '#A8C46A'] });
    s += d.clip(p, L('M12,32L24,42M52,10Q40,22 30,38', 1.6, '#B4CE7A', 'opacity="0.55"') + L('M30,44l5,-7M44,26l4,-4', TW, '#2E4508', 'opacity="0.6"'));
    s += F('M56,16q2,3 1,5q-1.6,-1.6 -1,-5z', '#79A03A', 0.6);
    return s;
  });
}

function iCancel(): ArtAsset {
  return icon('ui_cancel', (d) => {
    const bar1 = 'M9,15Q8,9 14,9Q18,9 21,12L54,46Q57,50 54,54Q50,57 46,53L11,20Q9,18 9,15Z';
    const bar2 = 'M50,9Q55,8 56,13Q56,17 53,20L20,53Q16,56 12,54Q8,51 11,47L45,12Q47,9.6 50,9Z';
    let s = solid(d, bar2, [8, 8, 48, 48], '#9A2E2B', U.redD, { off: [-1.8, -1.8], spk: 20, seed: 3, cols: ['#3A0812', '#C26A60'] });
    s += solid(d, bar1, [8, 8, 48, 48], U.red, U.redD, { off: [-1.8, -1.8], spk: 20, seed: 4, cols: ['#3A0812', '#C26A60'] });
    s += d.clip(bar1, L('M13,12L50,48', 1.4, '#D48A80', 'opacity="0.5"'));
    s += F('M45,52q1,4 -0.6,6q-1.2,-2.2 0.6,-6z', U.red, 0.6);
    return s;
  });
}

function iExpand(): ArtAsset {
  return icon('ui_expand', (d) => {
    let s = '';
    // iso floor patch with tiles
    const fl = poly([[32, 19.5], [48, 29.5], [32, 39.5], [16, 29.5]]);
    s += solid(d, fl, [16, 19, 32, 21], '#CFCFCB', '#A8A8A2', { vol: false, spk: 16, seed: 2 });
    for (let k = 1; k < 3; k++) {
      const t = k / 3;
      s += L(`M${f(32 - 16 * t)},${f(19.5 + 10 * t)}L${f(48 - 16 * t)},${f(29.5 + 10 * t)}`, TW, '#7B7B76');
      s += L(`M${f(32 + 16 * t)},${f(19.5 + 10 * t)}L${f(16 + 16 * t)},${f(29.5 + 10 * t)}`, TW, '#7B7B76');
    }
    s += d.clip(fl, F(blob(37, 33, 4, 2, 4), '#6E9A2A', 0, 'opacity="0.4"') + F(blob(26, 27, 3, 1.6, 5), '#7A2A22', 0, 'opacity="0.35"'));
    s += L(fl, OW);
    // outward arrows at the four corners
    const arrow = (x: number, y: number, rot: number) =>
      g(solid(d, 'M-3,6V-1H-7L0,-9L7,-1H3V6Z', [-7, -9, 14, 15], PAINT, PAINT_D, { sw: OW * 0.9, vol: false }), `translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(0.86)`);
    s += arrow(32, 11, 0) + arrow(54, 29.5, 90) + arrow(32, 48.5, 180) + arrow(10, 29.5, 270);
    // "+" badge
    s += g(solid(d, ell(50, 49, 9), [41, 40, 18, 18], U.olive, U.oliveD, { off: [-1.4, -1.4], spk: 8, seed: 3 }) + F('M48.4,43.6H51.6V47.4H55.4V50.6H51.6V54.4H48.4V50.6H44.6V47.4H48.4Z', PAINT, IW), 'translate(3 3)');
    return s;
  });
}

function horn(d: Doc): string {
  let s = '';
  // driver housing
  s += solid(d, rrect(6, 24, 12, 16, 2.6), [6, 24, 12, 16], '#4E5444', '#363B2E', { spk: 8, seed: 2 });
  s += L('M8,28h8M8,32h8M8,36h8', TW, '#23261E');
  // cone
  const cone = 'M17,27L36,12Q39,11 39,15V49Q39,53 36,52L17,37Z';
  s += solid(d, cone, [17, 11, 22, 42], '#6E7A5A', '#4E583E', { off: [-1.6, -1.6], spk: 24, seed: 5, cols: [U.rust, '#2A2E22'], grime: 1 });
  s += d.clip(cone, F(blob(32, 44, 4, 3, 3), U.rust, 0, 'opacity="0.6"') + L('M20,28L35,16.4', 1.2, '#A8B08E', 'opacity="0.5"'));
  // rim
  s += F(ell(38.6, 32, 3.4, 20.6), '#4E583E', OW) + F(ell(38.8, 32, 1.6, 17.6), '#1E2018', 0);
  // bracket
  s += F('M10,40H14L15,48H9Z', '#363B2E', IW);
  return s;
}

function iSoundOn(): ArtAsset {
  return icon('ui_sound_on', (d) => {
    let s = horn(d);
    s += rod('M46,24Q50,32 46,40', 2, PAINT, 1.6) + rod('M51,17Q58,32 51,47', 2.2, PAINT, 1.6);
    return s;
  });
}

function iSoundOff(): ArtAsset {
  return icon('ui_sound_off', (d) => {
    let s = horn(d);
    // duct tape across the horn mouth
    const tape = 'M-17,-4.4L17,-4.4L16,-2.6L17.4,-0.6L16.2,1.4L17,4.4L-17,4.4L-16,2.4L-17.4,0.4L-16.2,-1.6Z';
    s += g(F(tape, '#8D8E86', IW) + L('M-15,-1.4H15M-15,1.8H15', TW, '#B0B1A8', 'opacity="0.8"') + F(blob(4, 0, 4, 2, 3), '#5E5232', 0, 'opacity="0.35"'), 'translate(30 32) rotate(-62)');
    // red X
    s += rod('M45,23L58,40M58,23L45,40', 3, U.red, 1.6);
    return s;
  });
}

// ================================================================= door sign
function sign(d: Doc, open: boolean): string {
  let s = '';
  // nail + string
  s += L('M32,6L12,25M32,6L52,25', 1.2 + 1.6) + L('M32,6L12,25M32,6L52,25', 1.2, '#B8A47E');
  const board = 'M6,24H58V50H6Z';
  const base = open ? '#5E7A2E' : '#7A2230';
  const shade = open ? '#45601C' : '#5A1420';
  let b = solid(d, board, [6, 24, 52, 26], base, shade, { off: [-1.6, -1.6], spk: 30, seed: open ? 2 : 3, cols: ['#2A2218', '#9A8A6A'] });
  // chipped paint showing wood
  b += d.clip(
    board,
    F(blob(10, 47, 4, 2.4, 4), PAL.wood, 0) +
      F(blob(55, 27, 3.4, 2.2, 5), PAL.wood, 0) +
      F(blob(44, 48, 2.6, 1.6, 6), PAL.woodD, 0) +
      L('M8,30H56M8,42H56', TW, '#1E1A12', 'opacity="0.4"'),
  );
  b += L(rrect(9, 27, 46, 20, 1.6), TW, open ? '#A8BC7A' : '#B07A80', 'opacity="0.7"');
  b += txt(32, open ? 43.4 : 42.2, open ? 'OPEN' : 'CLOSED', open ? 15 : 11, U.cream, {
    sw: 1.4,
    stroke: INK,
    extra: open ? '' : 'textLength="42" lengthAdjust="spacingAndGlyphs"',
  });
  if (!open) b += L('M14,34l4,8M18,33l4,8M22,33l4,8', 1, INK, 'opacity="0.55"'); // claw marks
  else b += F(blob(48, 31, 3, 2.2, 8), U.blood, 0, 'opacity="0.6"');
  s += g(b, open ? 'rotate(0)' : 'rotate(-7 32 26)');
  s += F(ell(32, 6, 2.6), U.steel, IW) + dot(31.4, 5.4, 0.7, U.steelHi);
  if (!open) s += F('M45,54q1.4,4 0,6q-1.6,-2.4 0,-6z', U.zgreen, 0.6);
  return s;
}

// ================================================================= textures / panels
const AW_W = 512;
const AW_H = 64;

function texAwning(): ArtAsset {
  return asset('tex_awning', AW_W, AW_H, 0, 0, (d) => {
    const SW = 64; // stripe width
    const BODY = 40; // flat part
    const RY = 18; // scallop depth
    const r = rnd(77);
    const stripes: string[] = [];
    const edges: string[] = [];
    // ragged notches on some scallops (stripe index -> notch centre param 0..1)
    const torn: Record<number, number> = { 1: 0.32, 4: 0.7, 6: 0.2 };
    for (let k = 0; k < AW_W / SW; k++) {
      const x0 = k * SW;
      const pts: Pt[] = [];
      const N = 28;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const a = t * Math.PI; // from right (0) round the bottom to the left (pi)
        let rx = SW / 2;
        let ry = RY;
        const tc = torn[k];
        if (tc !== undefined && Math.abs(t - tc) < 0.12) {
          const depth = (1 - Math.abs(t - tc) / 0.12) * 7;
          const zig = i % 2 ? 1 : 0.35;
          ry -= depth * zig;
          rx -= depth * zig * 0.4;
        }
        pts.push([x0 + SW / 2 + Math.cos(a) * rx, BODY + Math.sin(a) * ry]);
      }
      const p = `M${x0},0H${x0 + SW}V${BODY}` + pts.map(([x, y]) => `L${f(x)},${f(y)}`).join('') + `L${x0},${BODY}Z`;
      stripes.push(p);
      edges.push('M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L'));
    }
    const union = stripes.join('');
    let s = '';
    // drop shadow under the scallops
    s += `<g transform="translate(0 3)" opacity="0.35" filter="${d.blur(1.6)}">${F(union, '#000000')}</g>`;
    stripes.forEach((p, k) => {
      const maroon = k % 2 === 0;
      const base = maroon ? U.maroon : U.rose;
      const x0 = k * SW;
      // fabric curvature: light centre-left, darker sides
      s += F(p, base);
      s += F(p, d.linear(x0, 0, x0 + SW, 0, [[0, '#000000', 0.22], [0.35, '#FFFFFF', maroon ? 0.08 : 0.06], [0.7, '#000000', 0.02], [1, '#000000', 0.26]]));
      // shadow under the top bar, darker scallop bottom
      s += F(p, d.linear(0, 0, 0, AW_H, [[0, '#000000', 0.45], [0.16, '#000000', 0.08], [0.55, '#000000', 0], [0.95, '#000000', 0.2]]));
    });
    // canvas weave
    const wid = d.id('p');
    d.def(
      `<pattern id="${wid}" patternUnits="userSpaceOnUse" width="4" height="4"><path d="M0,0.5H4M0,2.5H4" stroke="#000000" stroke-width="0.5" opacity="0.12"/><path d="M1,0V4M3,0V4" stroke="#FFFFFF" stroke-width="0.4" opacity="0.05"/></pattern>`,
    );
    s += F(union, `url(#${wid})`);
    // water streaks + olive stains (drawn at x and x +- 512 so the tile wraps)
    let st = '';
    const stains: [number, number, number, number, number][] = [];
    for (let k = 0; k < 8; k++) stains.push([r() * AW_W, 12 + r() * 30, 6 + r() * 11, 5 + r() * 8, k]);
    for (const [x, y, rx, ry, k] of stains)
      for (const dx of [-AW_W, 0, AW_W]) {
        if (x + dx + rx * 3 < 0 || x + dx - rx * 3 > AW_W) continue;
        const cx = x + dx;
        st += F(blob(cx, y, rx, ry, 30 + k, 9, 0.5), U.oliveStain, 0, 'opacity="0.55"');
        st += F(blob(cx + rx * 0.2, y + ry * 0.3, rx * 0.55, ry * 0.5, 40 + k), '#6E6A36', 0, 'opacity="0.35"');
        const rr = rnd(50 + k);
        for (let j = 0; j < 6; j++) {
          const a = rr() * Math.PI * 2;
          const dd = rx * (1.2 + rr() * 1.1);
          st += dot(cx + Math.cos(a) * dd, y + Math.sin(a) * dd * 0.8, 0.6 + rr() * 1.3, U.oliveStain, 0.55);
        }
        if (k % 2 === 0) st += F(`M${f(cx - 1.4)},${f(y + ry * 0.6)}Q${f(cx)},${f(y + ry + 10)} ${f(cx + 1)},${f(y + ry * 0.6)}Z`, U.oliveStain, 0, 'opacity="0.5"');
      }
    for (let k = 0; k < 10; k++) {
      const x = r() * AW_W;
      for (const dx of [-AW_W, 0, AW_W]) {
        const cx = x + dx;
        if (cx < -10 || cx > AW_W + 10) continue;
        st += L(`M${f(cx)},4Q${f(cx + 1)},${f(14 + (k % 3) * 6)} ${f(cx - 0.5)},${f(26 + (k % 4) * 6)}`, 1.4 + (k % 3), '#1A0608', 'opacity="0.12"');
      }
    }
    st += speckle(d, union, [0, 0, AW_W, AW_H], 260, ['#2A0810', '#3B2E1C', '#B07A80'], 9, 0.3, 0.9, 0.45);
    s += d.clip(union, st);
    // seams between stripes
    for (let k = 0; k <= AW_W / SW; k++) s += L(`M${k * SW},4V${BODY + 4}`, 0.7, '#1A0608', 'opacity="0.45"');
    // pale rim inside the scallop edge + ink outline along the bottom
    stripes.forEach((p) => {
      s += d.clip(p, L(p, 3.2, '#C99AA0', 'opacity="0.55"'));
    });
    for (const e of edges) s += L(e, 1.3, INK);
    // top bar (frame / valance pipe)
    s += F(`M0,0H${AW_W}V5H0Z`, '#2A0A10') + L(`M0,5.4H${AW_W}`, 0.8, INK) + L(`M0,1.4H${AW_W}`, 0.6, '#8E4A54', 'opacity="0.6"');
    // dangling threads at the tears
    for (const [k, tc] of Object.entries(torn)) {
      const a = tc * Math.PI;
      const x = +k * SW + SW / 2 + Math.cos(a) * (SW / 2 - 2);
      const y = BODY + Math.sin(a) * (RY - 5);
      s += L(`M${f(x)},${f(y)}q1.4,4 -0.6,7`, 0.6, '#C99AA0', 'opacity="0.9"');
    }
    return s;
  });
}

function woodGrain(r: () => number, x0: number, y0: number, len: number, across: number, horizontal: boolean, n: number, col: string): string {
  let s = '';
  for (let k = 0; k < n; k++) {
    const o = (k + 0.5 + (r() - 0.5) * 0.6) * (across / n);
    const w = 0.4 + r() * 0.5;
    const wob = (r() - 0.5) * 1.6;
    const p = horizontal
      ? `M${f(x0)},${f(y0 + o)}C${f(x0 + len * 0.3)},${f(y0 + o + wob)} ${f(x0 + len * 0.6)},${f(y0 + o - wob)} ${f(x0 + len)},${f(y0 + o)}`
      : `M${f(x0 + o)},${f(y0)}C${f(x0 + o + wob)},${f(y0 + len * 0.3)} ${f(x0 + o - wob)},${f(y0 + len * 0.6)} ${f(x0 + o)},${f(y0 + len)}`;
    s += L(p, w, col, `opacity="${f(0.35 + r() * 0.35)}"`);
  }
  return s;
}

function texChalk(): ArtAsset {
  const W = 256;
  const H = 160;
  const B = 24; // frame width == border-image-slice
  return asset('tex_chalk', W, H, 0, 0, (d) => {
    const r = rnd(5);
    let s = '';
    // board
    const inner = `M${B},${B}H${W - B}V${H - B}H${B}Z`;
    s += F(inner, '#2F3B33');
    s += F(inner, d.radial(W / 2, H / 2, W * 0.55, [[0, '#4A5A4E', 0.55], [1, '#141A16', 0.5]]));
    let ch = '';
    // eraser smears
    for (let k = 0; k < 9; k++) {
      const x = B + 10 + r() * (W - 2 * B - 40);
      const y = B + 10 + r() * (H - 2 * B - 24);
      ch += L(`M${f(x)},${f(y)}q${f(18 + r() * 30)},${f(-8 + r() * 16)} ${f(40 + r() * 40)},${f(-4 + r() * 8)}`, 8 + r() * 10, '#E8EEE0', `opacity="${f(0.022 + r() * 0.03)}"`);
    }
    // ghosts of old scrawl
    for (let k = 0; k < 5; k++) ch += scribble(B + 14 + r() * 120, B + 16 + r() * 80, 30 + r() * 50, 60 + k, 1.2, '#E8EEE0', 0.08);
    ch += speckle(d, inner, [B, B, W - 2 * B, H - 2 * B], 220, ['#DDE4D4', '#0E120F'], 11, 0.25, 0.8, 0.3);
    s += d.clip(inner, ch);
    // frame: four mitred boards
    const sides: [string, boolean, Box, string, string][] = [
      [`M0,0H${W}L${W - B},${B}H${B}Z`, true, [0, 0, W, B], '#8A5E34', '#6A4524'],
      [`M0,${H}H${W}L${W - B},${H - B}H${B}Z`, true, [0, H - B, W, B], '#74502C', '#58391E'],
      [`M0,0V${H}L${B},${H - B}V${B}Z`, false, [0, 0, B, H], '#80572F', '#634220'],
      [`M${W},0V${H}L${W - B},${H - B}V${B}Z`, false, [W - B, 0, B, H], '#6E4A28', '#52361C'],
    ];
    sides.forEach(([p, horiz, b, base, sh], k) => {
      s += F(p, base);
      s += F(p, d.linear(horiz ? 0 : b[0], horiz ? b[1] : 0, horiz ? 0 : b[0] + b[2], horiz ? b[1] + b[3] : 0, [[0, '#FFFFFF', 0.12], [0.5, '#FFFFFF', 0], [1, '#000000', 0.25]]));
      s += d.clip(p, woodGrain(rnd(20 + k), b[0], b[1], horiz ? b[2] : b[3], horiz ? b[3] : b[2], horiz, 7, sh) + speckle(d, p, b, 120, ['#3B2814', '#A97A48'], 30 + k, 0.25, 0.7, 0.5));
      void sh;
    });
    // mitre joints, outer + inner ink lines, bevels
    s += L(`M0,0L${B},${B}M${W},0L${W - B},${B}M0,${H}L${B},${H - B}M${W},${H}L${W - B},${H - B}`, 0.8, INK, 'opacity="0.8"');
    s += L(`M1.5,1.5H${W - 1.5}`, 1, '#C49A68', 'opacity="0.5"') + L(`M1.5,1.5V${H - 1.5}`, 1, '#C49A68', 'opacity="0.35"');
    s += L(`M${B - 3},${B - 3}H${W - B + 3}V${H - B + 3}H${B - 3}Z`, 0.8, '#3A2410', 'opacity="0.55"');
    s += L(`M${B},${B}H${W - B}V${H - B}H${B}Z`, 1.6, INK);
    s += L(`M${B + 1.6},${B + 1.6}H${W - B - 1.6}M${B + 1.6},${B + 1.6}V${H - B - 1.6}`, 2.2, '#000000', 'opacity="0.35"');
    s += L(`M0.8,0.8H${W - 0.8}V${H - 0.8}H0.8Z`, 1.6, INK);
    // nails in the corners
    for (const [x, y] of [[11, 11], [W - 11, 11], [11, H - 11], [W - 11, H - 11]] as Pt[]) s += F(ell(x, y, 2.2), '#7A7E7A', 0.8) + dot(x - 0.6, y - 0.6, 0.7, '#C8CCC6') + F(blob(x + 1.4, y + 2.6, 1.4, 2.4, x + y), U.rust, 0, 'opacity="0.55"');
    return s;
  });
}

function texPaper(): ArtAsset {
  const W = 256;
  const H = 256;
  return asset('tex_paper', W, H, 0, 0, (d) => {
    const r = rnd(9);
    // perforated (torn-off) top edge
    let top = 'M4,12';
    for (let x = 4; x <= 250; x += 4) top += `L${f(x)},${f(10 + r() * 3)}`;
    const sheet = top + 'L250,236L234,252L4,252Z';
    let s = '';
    s += `<g transform="translate(2.4 3)" opacity="0.4" filter="${d.blur(2)}">${F(sheet, '#000000')}</g>`;
    s += F(sheet, U.legal);
    s += F(sheet, d.linear(0, 0, W, H, [[0, '#FFFFFF', 0.12], [0.6, '#FFFFFF', 0], [1, '#5E5232', 0.18]]));
    let inner = '';
    // rules
    inner += L('M4,40H250', 1.2, '#6E8AA4', 'opacity="0.75"');
    for (let y = 58; y < 252; y += 18) inner += L(`M4,${y}H250`, 0.8, '#7E9AB0', 'opacity="0.7"');
    // red margin (double)
    inner += L('M17,12V252M20.4,12V252', 0.9, '#B0473F', 'opacity="0.8"');
    // stains: coffee ring, grease, a bloody fingerprint, water
    inner += L(ell(196, 200, 24, 22), 3, U.coffee, 'opacity="0.35"') + L(ell(196, 200, 21, 19.6), 1, U.coffee, 'opacity="0.25"');
    inner += F(blob(176, 222, 6, 4, 3), U.coffee, 0, 'opacity="0.25"');
    inner += F(blob(70, 214, 18, 12, 5), '#B8A050', 0, 'opacity="0.35"');
    inner += handprint(226, 92, 0.5, -24, U.blood, 0.45, 5);
    inner += F(blob(90, 120, 30, 20, 7), '#FFFFFF', 0, 'opacity="0.08"');
    inner += speckle(d, sheet, [0, 0, W, H], 260, ['#8A7A50', '#5E5232', '#FFFFFF'], 4, 0.3, 0.9, 0.35);
    s += d.clip(sheet, inner);
    // dog-ear
    s += F('M250,236L234,252L236,238Z', '#B8A860', 0.8) + F('M250,236L236,238L234,252Z', '#D8C878', 0.9) + L('M236,238L250,236', 0.6, '#8A7A40');
    s += L(sheet, 1.4, '#5E5232');
    // pushpin (with the puncture shadow)
    s += F(ell(132, 24, 7, 3.4), '#000000', 0, 'opacity="0.25"');
    s += L('M128,26L128,20', 1.6, '#9A9F9C');
    // base flange, waist, cap (seen from the front, slightly above)
    s += F(ell(128, 21, 9, 3.4), U.redD, 1.3) + F(ell(128, 20, 8.4, 2.8), '#8E2424', 0);
    const waist = 'M123.4,10.4H132.6L131.4,20H124.6Z';
    s += cel(d, waist, U.red, U.redD, [-1.2, 0]) + L(waist, 1.3);
    s += F(ell(128, 9.6, 8.6, 4.4), U.redD, 1.3) + F(ell(128, 8.8, 8, 3.6), U.red, 0) + F(ell(125.6, 7.8, 3.2, 1.4), '#E0908A', 0, 'opacity="0.75"');
    s += L('M125.6,12V18.6', 1, '#D07A70', 'opacity="0.6"');
    return s;
  });
}

function texParchment(): ArtAsset {
  const W = 256;
  const H = 256;
  return asset('tex_parchment', W, H, 0, 0, (d) => {
    const r = rnd(13);
    // torn outline: jittered rectangle with a few deep tears
    const pts: Pt[] = [];
    const edge = (ax: number, ay: number, bx: number, by: number, n: number, tear: number) => {
      for (let i = 0; i < n; i++) {
        const t = i / n;
        let j = (r() - 0.5) * 6;
        if (Math.abs(t - tear) < 0.03) j += 14;
        const nx = -(by - ay);
        const ny = bx - ax;
        const l = Math.hypot(nx, ny);
        pts.push([ax + (bx - ax) * t + (nx / l) * j, ay + (by - ay) * t + (ny / l) * j]);
      }
    };
    edge(10, 12, 246, 8, 40, 0.62);
    edge(246, 8, 248, 246, 40, 0.3);
    edge(248, 246, 8, 248, 40, 0.45);
    edge(8, 248, 10, 12, 40, 0.8);
    const p = poly(pts);
    let s = '';
    s += `<g transform="translate(2.6 3.2)" opacity="0.45" filter="${d.blur(2.4)}">${F(p, '#000000')}</g>`;
    s += F(p, U.parch);
    s += F(p, d.radial(128, 120, 180, [[0, '#FFF6D8', 0.25], [0.6, '#FFF6D8', 0], [1, '#5E4424', 0.55]]));
    let inner = '';
    for (let k = 0; k < 7; k++) inner += F(blob(r() * W, r() * H, 14 + r() * 26, 10 + r() * 20, 70 + k, 9, 0.5), k % 2 ? '#8A6A3A' : '#B8A070', 0, `opacity="${f(0.12 + r() * 0.14)}"`);
    inner += L(ell(70, 190, 22, 20), 2.6, U.coffee, 'opacity="0.3"');
    inner += F(blob(190, 60, 7, 5, 3), U.blood, 0, 'opacity="0.35"');
    for (let k = 0; k < 9; k++) inner += dot(186 + r() * 30, 50 + r() * 26, 0.6 + r() * 1.6, U.blood, 0.35);
    // fold creases
    inner += L('M8,128Q128,124 248,130', 1.4, '#7A5E34', 'opacity="0.45"') + L('M8,130.4Q128,126.4 248,132.4', 1.2, '#FFF6D8', 'opacity="0.35"');
    inner += L('M128,10Q124,128 130,248', 1.4, '#7A5E34', 'opacity="0.4"') + L('M130.4,10Q126.4,128 132.4,248', 1.2, '#FFF6D8', 'opacity="0.3"');
    inner += speckle(d, p, [0, 0, W, H], 300, ['#6A5434', '#3B2E1C', '#E8D8A8'], 6, 0.3, 1, 0.35);
    // scorched edge
    inner += L(p, 10, '#5E4424', `opacity="0.35" filter="${d.blur(2.6)}"`);
    s += d.clip(p, inner);
    s += L(p, 1.3, '#4A3420');
    return s;
  });
}

function button(key: string, top: string, bot: string, rim: string, dark: string, seed: number): ArtAsset {
  const W = 160;
  const H = 48;
  return asset(key, W, H, 0, 0, (d) => {
    // slanted sticker: an uneven quad (top edge rises to the right), slant kept inside the 24-unit side slices
    const q: Pt[] = [
      [7, 6.5],
      [154, 3],
      [150.5, 42],
      [10.5, 44.5],
    ];
    const p = roundPoly(q, 5);
    let s = '';
    s += `<g transform="translate(1.4 2.4)" opacity="0.45" filter="${d.blur(1.2)}">${F(p, '#000000')}</g>`;
    s += F(p, d.linear(0, 3, 0, 45, [[0, top], [1, bot]]));
    let inner = '';
    // sheen band (upper left) + bottom shade
    inner += F('M0,0H160V18Q80,26 0,22Z', '#FFFFFF', 0, 'opacity="0.1"');
    inner += F('M0,36Q80,32 160,34V48H0Z', '#000000', 0, 'opacity="0.18"');
    inner += speckle(d, p, [0, 0, W, H], 140, [dark, '#3B2E1C', rim], seed, 0.3, 0.9, 0.35);
    inner += F(blob(132, 34, 12, 6, seed + 1), dark, 0, 'opacity="0.25"');
    inner += F(blob(28, 14, 7, 4, seed + 2), dark, 0, 'opacity="0.18"');
    inner += L('M40,38l18,-2M96,10l14,1M120,38l6,-3', 0.6, '#FFFFFF', 'opacity="0.2"');
    // bevel: light rim inside, dark lip at the bottom
    inner += L(p, 4.4, rim, 'opacity="0.85"');
    inner += L('M12,42.6L148,40.3', 2, dark, 'opacity="0.6"');
    s += d.clip(p, inner);
    s += L(p, 1.6, INK);
    return s;
  });
}

function texBrick(): ArtAsset {
  const W = 512;
  const H = 256;
  return asset('tex_brick', W, H, 0, 0, (d) => {
    const r = rnd(21);
    let s = F(`M0,0H${W}V${H}H0Z`, '#1E1714');
    const BW = 64;
    const BH = 24;
    const M = 3;
    const cols = ['#5A2A1E', '#4E241A', '#63301F', '#47201A', '#552A22', '#4A2A20'];
    for (let row = 0; row * BH < H; row++) {
      const off = row % 2 ? -BW / 2 : 0;
      for (let x = off; x < W; x += BW) {
        const bx = x + M / 2;
        const by = row * BH + M / 2;
        const bw = BW - M;
        const bh = BH - M;
        const chip = r() < 0.12;
        const pth = chip ? poly([[bx, by], [bx + bw - 7, by], [bx + bw, by + 6], [bx + bw, by + bh], [bx, by + bh]]) : rrect(bx, by, bw, bh, 1.4);
        s += F(pth, cols[Math.floor(r() * cols.length)]);
        s += L(`M${f(bx + 1)},${f(by + 1)}H${f(bx + bw - 2)}`, 1, '#8A4A34', 'opacity="0.5"');
        s += L(`M${f(bx + 1)},${f(by + bh - 0.6)}H${f(bx + bw - 1)}`, 1.2, '#140E0C', 'opacity="0.6"');
        if (r() < 0.3) s += F(blob(bx + r() * bw, by + r() * bh, 6 + r() * 8, 3 + r() * 4, row * 31 + x), '#000000', 0, 'opacity="0.25"');
        if (r() < 0.08) s += crack(bx + 10 + r() * 40, by + 2, 1.3, 14, row + x, 0.7, '#120C0A', 0);
      }
    }
    s += speckle(d, `M0,0H${W}V${H}H0Z`, [0, 0, W, H], 900, ['#8A4A34', '#120C0A', '#6A4A3A'], 3, 0.3, 1, 0.45);
    // soot / grime drips
    const soot = d.blur(5);
    for (let k = 0; k < 8; k++) {
      const x = r() * W;
      s += F(`M${f(x - 10)},0Q${f(x)},${f(50 + r() * 90)} ${f(x + 10)},0Z`, '#000000', 0, `opacity="0.2" filter="${soot}"`);
    }
    // spot light from above (warm) and dark vignette
    s += F(`M0,0H${W}V${H}H0Z`, d.radial(W / 2, H * 0.32, W * 0.42, [[0, '#F2C88A', 0.22], [0.6, '#F2C88A', 0.05], [1, '#F2C88A', 0]]));
    s += F(`M0,0H${W}V${H}H0Z`, d.radial(W / 2, H * 0.4, W * 0.62, [[0.35, '#000000', 0], [1, '#000000', 0.75]]));
    return s;
  });
}

function texCork(): ArtAsset {
  const W = 256;
  const H = 256;
  return asset('tex_cork', W, H, 0, 0, (d) => {
    const r = rnd(31);
    let s = F(`M0,0H${W}V${H}H0Z`, '#9A7646');
    let t = '';
    // granules, wrapped so the tile repeats seamlessly on both axes
    const cols = ['#7A5A30', '#B8915A', '#5E4424', '#C9A26A', '#8A6A3A'];
    for (let k = 0; k < 1400; k++) {
      const x = r() * W;
      const y = r() * H;
      const rad = 0.5 + r() * 1.8;
      const c = cols[k % cols.length];
      const o = 0.35 + r() * 0.5;
      for (const dx of [-W, 0, W])
        for (const dy of [-H, 0, H]) {
          const cx = x + dx;
          const cy = y + dy;
          if (cx < -3 || cx > W + 3 || cy < -3 || cy > H + 3) continue;
          t += dot(cx, cy, rad, c, o);
        }
    }
    // pin holes
    for (let k = 0; k < 14; k++) t += dot(r() * (W - 8) + 4, r() * (H - 8) + 4, 0.8, '#2A1C0C', 0.8);
    s += t;
    void d;
    return op(s, 1);
  });
}

// ================================================================= exports
export const UI3_ICON_KEYS: string[] = [
  'ui_shop',
  'ui_menu',
  'ui_crew',
  'ui_raid',
  'ui_goals',
  'ui_pets',
  'ui_zombiepedia',
  'ui_storage',
  'ui_edit',
  'ui_fridge',
  'ui_settings',
  'ui_cash',
  'ui_sauce',
  'ui_xp',
  'ui_star',
  'ui_tab_featured',
  'ui_tab_decor',
  'ui_tab_kitchen',
  'ui_tab_furniture',
  'ui_tab_walls',
  'ui_tab_special',
  'ui_tab_storage',
  'ui_rotate',
  'ui_move',
  'ui_sell',
  'ui_check',
  'ui_cancel',
  'ui_expand',
  'ui_sound_on',
  'ui_sound_off',
  'ui_open',
  'ui_closed',
];

export const UI3_TEX_KEYS: string[] = ['tex_awning', 'tex_chalk', 'tex_paper', 'tex_parchment', 'btn_olive', 'btn_red', 'tex_brick', 'tex_cork'];

/** CSS nine-slice / tiling hints for the panel art (in image units). */
export const UI3_META = {
  /** border-image-slice for tex_chalk (uniform wood frame). */
  chalkSlice: 24,
  /** border-image-slice for btn_olive / btn_red: top/bottom, left/right. */
  btnSlice: [16, 24] as [number, number],
  /** tex_awning repeats on x; the flat body is 0..40, scallops reach ~58. */
  awningBody: 40,
};

export function buildUi3(): ArtAsset[] {
  return [
    iShop(),
    iMenu(),
    iCrew(),
    iRaid(),
    iGoals(),
    iPets(),
    iPedia(),
    iStorage(),
    iEdit(),
    iFridge(),
    iSettings(),
    iCash(),
    iSauce(),
    iXp(),
    iStar(),
    iTabFeatured(),
    iTabDecor(),
    iTabKitchen(),
    iTabFurniture(),
    iTabWalls(),
    iTabSpecial(),
    iTabStorage(),
    iRotate(),
    iMove(),
    iSell(),
    iCheck(),
    iCancel(),
    iExpand(),
    iSoundOn(),
    iSoundOff(),
    icon('ui_open', (d) => sign(d, true)),
    icon('ui_closed', (d) => sign(d, false)),
    texAwning(),
    texChalk(),
    texPaper(),
    texParchment(),
    button('btn_olive', U.olive, U.oliveD, '#9DB86A', '#2E4508', 41),
    button('btn_red', '#9A2E2B', U.maroon, '#C9827A', '#3A0812', 43),
    texBrick(),
    texCork(),
  ];
}
