/**
 * The pets: the Zombie Pug and the Rot-weiler, on the four-legged rig. Moved here from the retired v2
 * raid cast (src/art/raidcastpets.ts) with the few painting helpers they need; still the v2 drawings
 * until they're redrawn in the v3 style.
 *
 * Quad rig (front 3/4, facing down-right like the bipeds; root (0,0) on the ground under the body):
 *   parts (back to front): legBR, legFR, body, tail, legBL, legFL, head
 *   B = back (hind) legs, F = front legs; R = far side (drawn first, a little up-right and shaded),
 *   L = near side. Legs pivot at the hip / shoulder (top of the leg, tucked under the body), the head
 *   at the neck, the tail at its base, the body at its center.
 *   faces: replacement heads placed exactly like 'head'.
 */
import type { CharArt, CharPart, FaceName, QuadPartName } from '../../art/types';
import { Doc, OUT, OW, P, S, capsule, ell, f, headD, hl, rrect } from '../../art/svg';
import type { Pt, Tone } from '../../art/svg';

const ZSK: Tone = ['#8DC63F', '#5E9A2A'];
const GOO = '#B8F07A';
const SCLERA = '#FFE14D';
const MOUTH = '#5A1E22';
const TOOTH = '#FFF6D8';
const TONGUE = '#E06A86';
const EYE1: Pt = [-4.6, 1.3];
const EYE2: Pt = [5.8, 1.7];

type Box = [x0: number, y0: number, x1: number, y1: number];
type Expr = 'normal' | 'scream' | 'shock' | 'happy' | 'dazed' | 'chomp' | 'sleep';

// ------------------------------------------------------------------ painting helpers (from the v2 raid kit)
/** Round a box outward to whole units so part sizes stay tidy. */
function roundBox(b: Box): Box {
  return [Math.floor(b[0]), Math.floor(b[1]), Math.ceil(b[2]), Math.ceil(b[3])];
}

function part(key: string, box: Box, pivot: Pt, body: (d: Doc) => string): CharPart {
  const d = new Doc(key);
  const inner = body(d);
  const [x0, y0, x1, y1] = roundBox(box);
  const w = x1 - x0;
  const h = y1 - y0;
  return {
    key,
    svg: d.build(w, h, inner, -x0, -y0),
    w,
    h,
    px: pivot[0] - x0,
    py: pivot[1] - y0,
    x: pivot[0],
    y: pivot[1],
  };
}

function darker(hex: string, k = 0.82): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function drool(x: number, y: number, L = 4.4, w = 1.7, sw = 0.9, col = GOO): string {
  const d =
    `M${f(x - w * 0.45)},${f(y)}C${f(x - w * 0.5)},${f(y + L * 0.5)} ${f(x - w)},${f(y + L * 0.7)} ${f(x - w * 0.8)},${f(y + L)}` +
    `C${f(x - w * 0.5)},${f(y + L * 1.25)} ${f(x + w * 0.5)},${f(y + L * 1.25)} ${f(x + w * 0.8)},${f(y + L)}` +
    `C${f(x + w)},${f(y + L * 0.7)} ${f(x + w * 0.5)},${f(y + L * 0.5)} ${f(x + w * 0.45)},${f(y)}Z`;
  return P(d, col, sw) + hl(x - w * 0.3, y + L * 0.95, w * 0.22, w * 0.3, 0, 0.9);
}

function stitches(x1: number, y1: number, x2: number, y2: number, k = 2, cl = 1.3, sw = 0.9): string {
  let s = S(`M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`, sw);
  const L = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / L;
  const ny = (x2 - x1) / L;
  for (let i = 0; i < k; i++) {
    const t = (i + 1) / (k + 1);
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    s += S(`M${f(px - nx * cl)},${f(py - ny * cl)}L${f(px + nx * cl)},${f(py + ny * cl)}`, sw);
  }
  return s;
}

function tooth(x: number, y: number, w = 2, h = 2, down = true, sw = 0.8, col = TOOTH): string {
  const d = down
    ? `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w - 0.3)},${f(y + h)}Q${f(x + w / 2)},${f(y + h + 0.6)} ${f(x + 0.3)},${f(y + h)}Z`
    : `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w - 0.4)},${f(y - h)}Q${f(x + w / 2)},${f(y - h - 0.6)} ${f(x + 0.4)},${f(y - h)}Z`;
  return P(d, col, sw);
}

/** Cartoon dizzy spiral. */
function spiral(cx: number, cy: number, r: number, sw: number, turns = 2.2, col = OUT): string {
  const pts: Pt[] = [];
  const n = Math.round(turns * 18);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const rr = r * t;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return S('M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L'), sw, col);
}

/** Zombie eye: yellow sclera, tiny pupil, droopy lid clipped to the eye. */
function zeye(d: Doc, cx: number, cy: number, r: number, lid: number, tilt: number, pdx = 0, pdy = 0.6, lidcol = ZSK[1], u = 1): string {
  const e = ell(cx, cy, r);
  const y0 = cy - r + 2 * r * lid;
  const pr = r * 0.3;
  return (
    P(e, SCLERA) +
    `<circle cx="${f(cx + pdx)}" cy="${f(cy + pdy)}" r="${f(pr)}" fill="${OUT}"/>` +
    `<circle cx="${f(cx + pdx - pr * 0.4)}" cy="${f(cy + pdy - pr * 0.45)}" r="${f(Math.max(0.4, pr * 0.32))}" fill="#FFFFFF"/>` +
    d.clip(e, P(`M${f(cx - r - 1)},${f(cy - r - 1)}H${f(cx + r + 1)}V${f(y0 - tilt)}L${f(cx - r - 1)},${f(y0 + tilt)}Z`, lidcol, 1.1 * u)) +
    S(e, 1.2 * u)
  );
}

/** Zombie face kit (local frame) used by the monster summons: chomp / sleep / dazed / normal. */
function zombieEyes(d: Doc, u: number, expr: Expr, lidcol: string, e1: Pt = EYE1, e2: Pt = EYE2, r1 = 4.2, r2 = 3.5): string {
  if (expr === 'sleep') {
    return (
      S(`M${f(e1[0] - r1)},${f(e1[1])}Q${f(e1[0])},${f(e1[1] + r1 * 0.7)} ${f(e1[0] + r1)},${f(e1[1])}`, 1.5 * u) +
      S(`M${f(e2[0] - r2)},${f(e2[1])}Q${f(e2[0])},${f(e2[1] + r2 * 0.7)} ${f(e2[0] + r2)},${f(e2[1])}`, 1.5 * u)
    );
  }
  if (expr === 'dazed') {
    return P(ell(e1[0], e1[1], r1, r1), SCLERA, 1.2 * u) + spiral(e1[0], e1[1], r1 * 0.8, 0.9 * u, 2.2) +
      P(ell(e2[0], e2[1], r2, r2), SCLERA, 1.2 * u) + spiral(e2[0], e2[1], r2 * 0.8, 0.9 * u, 2);
  }
  if (expr === 'chomp') {
    return zeye(d, e1[0], e1[1], r1 * 1.08, 0.12, -0.8, 0.8, -0.2, lidcol, u) + zeye(d, e2[0], e2[1], r2 * 1.08, 0.1, 0.8, 0.4, -0.2, lidcol, u);
  }
  return zeye(d, e1[0], e1[1], r1, 0.42, -0.7, 0.6, 0.8, lidcol, u) + zeye(d, e2[0], e2[1], r2, 0.3, 0.8, 0.4, 0.6, lidcol, u);
}

// ================================================================== QUADS
interface QuadSpec {
  height: number;
  hips: Record<'BL' | 'BR' | 'FL' | 'FR', Pt>;
  legBox: (w: 'BL' | 'BR' | 'FL' | 'FR') => Box;
  leg: (d: Doc, w: 'BL' | 'BR' | 'FL' | 'FR') => string;
  body: (d: Doc) => string;
  bodyPivot: Pt;
  bodyBox: Box;
  tail: (d: Doc) => string;
  tailPivot: Pt;
  tailBox: Box;
  head: (d: Doc, e: Expr) => string;
  neck: Pt;
  headBox: Box;
  faces: (FaceName & Expr)[];
}

function quad(id: string, Q: QuadSpec): CharArt {
  const k = (p: QuadPartName | string) => `char_${id}_${p}`;
  const leg = (w: 'BL' | 'BR' | 'FL' | 'FR'): CharPart => part(k(`leg${w}`), Q.legBox(w), Q.hips[w], (d) => Q.leg(d, w));
  const faces: Partial<Record<FaceName, CharPart>> = {};
  for (const n of Q.faces) faces[n] = part(k(`face_${n}`), Q.headBox, Q.neck, (d) => Q.head(d, n));
  return {
    id,
    rig: 'quad',
    parts: [
      leg('BR'),
      leg('FR'),
      part(k('body'), Q.bodyBox, Q.bodyPivot, Q.body),
      part(k('tail'), Q.tailBox, Q.tailPivot, Q.tail),
      leg('BL'),
      leg('FL'),
      part(k('head'), Q.headBox, Q.neck, (d) => Q.head(d, 'normal')),
    ],
    faces,
    height: Q.height,
  };
}

/** Generic stubby dog leg from the hip down to a paw on the ground; far legs get a shade. */
function dogLeg(d: Doc, hip: Pt, len: number, w: number, fur: Tone, far: boolean, sock?: Tone, bow = 0): string {
  const foot: Pt = [hip[0] + 0.8 + bow, hip[1] + len - w * 0.42];
  const shapes: string[] = [];
  let s = '';
  const L = bow ? `M${f(hip[0] - w / 2)},${f(hip[1])}Q${f(hip[0] - w / 2 + bow * 2)},${f((hip[1] + foot[1]) / 2)} ${f(foot[0] - w * 0.46)},${f(foot[1])}L${f(foot[0] + w * 0.46)},${f(foot[1])}Q${f(hip[0] + w / 2 + bow * 2)},${f((hip[1] + foot[1]) / 2)} ${f(hip[0] + w / 2)},${f(hip[1])}A${f(w / 2)},${f(w / 2)} 0 0 0 ${f(hip[0] - w / 2)},${f(hip[1])}Z` : capsule(hip, foot, w, w * 0.9);
  s += d.tone(L, fur, OW * 0.9);
  shapes.push(L);
  if (sock) s += d.clip(L, P(`M${f(hip[0] - 8)},${f(hip[1] + len * 0.55)}H${f(hip[0] + 8)}V${f(hip[1] + len + 2)}H${f(hip[0] - 8)}Z`, sock[0])) + S(L, OW * 0.9);
  const paw = ell(foot[0] + w * 0.28, foot[1] + w * 0.02, w * 0.72, w * 0.44);
  s += d.tone(paw, sock ?? fur, OW * 0.85, [-0.4, -0.4]);
  s += S(`M${f(foot[0] + w * 0.36)},${f(foot[1] + w * 0.4)}v${f(-w * 0.3)}M${f(foot[0] + w * 0.7)},${f(foot[1] + w * 0.36)}v${f(-w * 0.28)}`, 0.7, darker((sock ?? fur)[1], 0.75));
  shapes.push(paw);
  if (far) s += shapes.map((p) => P(p, OUT, 0, OUT, 'opacity="0.16"')).join('');
  return s;
}

function quadLegBox(hip: Pt, len: number, w: number, bow = 0): Box {
  return [hip[0] - w / 2 - 3 + Math.min(0, bow), hip[1] - w / 2 - 3, hip[0] + w * 1.2 + 4 + Math.max(0, bow), hip[1] + len + 3];
}

// ---------------------------------------------------------------- Zombie Pug
const PUG: Tone = ['#D2C28A', '#AE9C60'];
const PUG_MASK: Tone = ['#4A3F3A', '#2E2622'];

function pugHead(d: Doc, e: Expr): string {
  const cx = 11.6;
  const cy = -21.4;
  let s = '';
  // ears
  s += d.tone(`M${cx - 9},${cy - 6}C${cx - 13},${cy - 9} ${cx - 12},${cy - 2} ${cx - 10},${cy - 1}Z`, PUG_MASK, OW * 0.9, [-0.3, -0.3]);
  s += d.tone(`M${cx + 3},${cy - 9.4}C${cx + 6},${cy - 13} ${cx + 10},${cy - 10} ${cx + 8.6},${cy - 6}Z`, PUG_MASK, OW * 0.9, [-0.3, -0.3]);
  s += d.shaded(headD(cx, cy, 10.6, 9.4, 1.15), PUG[0], PUG[1], OW, [-1.4, -1.2]);
  s += hl(cx - 5, cy - 6, 2, 1, -30, 0.5);
  // forehead wrinkles + stitches across the crown
  s += S(`M${cx - 1},${cy - 4}q2,-1.4 4,0M${cx},${cy - 2}q1.6,-1 3.4,0`, 0.8, PUG[1]);
  s += stitches(cx - 6, cy - 7.4, cx + 2, cy - 9.2, 3, 1, 0.8);
  // black muzzle mask
  const mask = ell(cx + 4, cy + 3.6, 6.4, 4.8);
  s += d.tone(mask, PUG_MASK, OW * 0.9, [-0.6, -0.6]);
  s += S(`M${cx + 0.6},${cy + 1}q3.4,-1.4 7,0`, 0.7, '#6A5A52');
  // eyes: one big, one small (zombie yellow)
  const E1: Pt = [cx - 3.6, cy - 1.4];
  const E2: Pt = [cx + 6.4, cy - 2.8];
  if (e === 'dazed') {
    s += P(ell(E1[0], E1[1], 4.6, 4.6), SCLERA, 1.1) + spiral(E1[0], E1[1], 3.8, 0.9, 2.3);
    s += P(ell(E2[0], E2[1], 2.6, 2.6), SCLERA, 1) + spiral(E2[0], E2[1], 2, 0.8, 1.8);
  } else if (e === 'happy') {
    s += S(`M${f(E1[0] - 3.6)},${f(E1[1] + 0.6)}Q${f(E1[0])},${f(E1[1] - 3.4)} ${f(E1[0] + 3.6)},${f(E1[1] + 0.6)}`, 1.6);
    s += S(`M${f(E2[0] - 2)},${f(E2[1] + 0.4)}Q${f(E2[0])},${f(E2[1] - 2)} ${f(E2[0] + 2)},${f(E2[1] + 0.4)}`, 1.4);
    s += P(ell(cx - 6.4, cy + 4.4, 2, 1.2), '#F06A7A', 0, OUT, 'opacity="0.5"');
  } else {
    const wide = e === 'chomp';
    s += P(ell(E1[0], E1[1], 4.6, 4.6), SCLERA, 1.2);
    s += `<circle cx="${f(E1[0] + 1)}" cy="${f(E1[1] + 0.4)}" r="${wide ? 1.1 : 1.5}" fill="${OUT}"/><circle cx="${f(E1[0] + 0.5)}" cy="${f(E1[1] - 0.3)}" r="0.5" fill="#FFF"/>`;
    s += P(ell(E2[0], E2[1], 2.6, 2.6), SCLERA, 1.1) + `<circle cx="${f(E2[0] + 0.5)}" cy="${f(E2[1] + 0.3)}" r="0.8" fill="${OUT}"/>`;
    if (!wide) s += d.clip(ell(E2[0], E2[1], 2.6, 2.6), P(`M${f(E2[0] - 3)},${f(E2[1] - 3)}H${f(E2[0] + 3)}V${f(E2[1] - 0.6)}H${f(E2[0] - 3)}Z`, PUG[1], 0.9));
  }
  // nose
  s += P(ell(cx + 5.6, cy + 1.6, 2, 1.3), '#1E1A18', 0.9) + hl(cx + 5, cy + 1.2, 0.6, 0.3, 0, 0.8);
  // mouth / tongue
  if (e === 'chomp') {
    const m = `M${cx},${cy + 4.6}C${cx + 3},${cy + 3.6} ${cx + 8},${cy + 3.6} ${cx + 10},${cy + 4.6}C${cx + 10},${cy + 10} ${cx + 7},${cy + 12} ${cx + 4.6},${cy + 12}C${cx + 2},${cy + 12} ${cx - 0.4},${cy + 9} ${cx},${cy + 4.6}Z`;
    s += P(m, MOUTH, 1.1) + d.clip(m, P(ell(cx + 5, cy + 12, 3.4, 1.8), TONGUE));
    s += tooth(cx + 1.6, cy + 10.4, 1.4, 1.8, false, 0.7) + tooth(cx + 6.4, cy + 10.6, 1.4, 1.8, false, 0.7) + tooth(cx + 3.6, cy + 4.6, 1.4, 1.6, true, 0.7);
  } else {
    s += S(`M${cx + 1},${cy + 4.8}Q${cx + 3.4},${cy + 6.2} ${cx + 5.4},${cy + 4.4}Q${cx + 7.4},${cy + 6.2} ${cx + 9.4},${cy + 4.6}`, 1);
    // the tongue: always out, a little too long
    s += d.tone(`M${cx + 3.4},${cy + 5.4}C${cx + 3},${cy + 10} ${cx + 4.6},${cy + 12.4} ${cx + 6.4},${cy + 12}C${cx + 8},${cy + 11.6} ${cx + 8},${cy + 8} ${cx + 7.4},${cy + 5.2}Z`, [TONGUE, '#C24E6C'], 1, [-0.3, -0.3]);
    s += S(`M${cx + 5.4},${cy + 6.8}L${cx + 5.8},${cy + 10}`, 0.6, '#B23C5A');
    if (e !== 'happy') s += drool(cx + 2.6, cy + 5.6, 3.4, 1.3, 0.8);
  }
  return s;
}

function buildPug(id: string): CharArt {
  const hips = { BL: [-9, -10.4] as Pt, BR: [-6.4, -12] as Pt, FL: [5.4, -10.4] as Pt, FR: [8.2, -12] as Pt };
  return quad(id, {
    height: 34,
    hips,
    legBox: (w) => quadLegBox(hips[w], w.endsWith('R') ? 12 : 10.4, 5.4),
    leg: (d, w) => dogLeg(d, hips[w], w.endsWith('R') ? 12 : 10.4, 5.4, PUG, w.endsWith('R')),
    body: (d) => {
      const b = ell(-1.6, -14.4, 12.6, 9);
      let s = d.tone(b, PUG, OW, [-1.4, -1.4]);
      // stitched-on green patch + rolls
      s += d.clip(b, d.tone('M-8,-20C-4,-23 2,-22 3,-18C4,-14 -2,-11 -6,-13C-10,-14 -11,-18 -8,-20Z', ZSK, 1.1, [-0.4, -0.4]));
      s += stitches(-8.6, -19.6, 2.6, -17.6, 3, 1, 0.8);
      s += S('M-10,-8.6q3,1.6 6,0M0,-9q3,1.4 6,0', 0.8, PUG[1]);
      s += hl(-7, -20, 3, 1.2, -10, 0.45);
      return s;
    },
    bodyPivot: [-1.6, -14.4],
    bodyBox: [-17, -27, 14, -2],
    tail: (d) => {
      const c = 'M-12.6,-19.6C-17,-21 -19.6,-25.6 -16.6,-28.4C-14,-30.6 -10.6,-28 -12.6,-25.6';
      return S(c, 5.4, OUT) + S(c, 3.2, PUG[0]) + d.tone(ell(-12.6, -25.4, 0.1, 0.1), PUG, 0);
    },
    tailPivot: [-12.6, -19.6],
    tailBox: [-22, -33, -8, -15],
    head: pugHead,
    neck: [6, -16],
    headBox: [-4, -36, 26, -6],
    faces: ['chomp', 'dazed', 'happy'],
  });
}

// ---------------------------------------------------------------- Rot-weiler
const ROT: Tone = ['#3E3839', '#262122'];
const TAN: Tone = ['#C8844A', '#9A5E2A'];

function rotHead(d: Doc, e: Expr): string {
  const cx = 16.6;
  const cy = -35.4;
  let s = '';
  // folded ears
  s += d.tone(`M${cx - 9},${cy - 6}L${cx - 13.4},${cy + 1}L${cx - 6.4},${cy - 1.4}Z`, ROT, OW * 0.9, [-0.3, -0.3]);
  s += d.tone(`M${cx + 2},${cy - 9}L${cx + 9.4},${cy - 9.4}L${cx + 7},${cy - 4}Z`, ROT, OW * 0.9, [-0.3, -0.3]);
  s += d.shaded(headD(cx, cy, 10.4, 9.4, 1.1), ROT[0], ROT[1], OW, [-1.4, -1.2]);
  s += hl(cx - 5, cy - 6, 2.2, 1, -30, 0.25);
  // tan eyebrow dots + cheeks
  s += P(ell(cx - 3.6, cy - 5.6, 1.6, 1.1), TAN[0], 0.7) + P(ell(cx + 5.4, cy - 6.4, 1.4, 1), TAN[0], 0.7);
  // bandage wrapped across the head
  s += d.clip(headD(cx, cy, 10.4, 9.4, 1.1), P(`M${cx - 12},${cy - 4}L${cx + 4},${cy - 12}L${cx + 6},${cy - 8.6}L${cx - 10},${cy - 0.4}Z`, '#F4EEE0', 1) + S(`M${cx - 6},${cy - 5.4}l1.4,2M${cx - 2},${cy - 7.4}l1.4,2M${cx + 2},${cy - 9.4}l1.4,2`, 0.6, '#C9C2B4'));
  s += S(headD(cx, cy, 10.4, 9.4, 1.1), OW);
  // muzzle
  const open = e === 'chomp';
  const muz = open ? `M${cx},${cy - 1}C${cx + 6},${cy - 3} ${cx + 13},${cy - 3} ${cx + 15},${cy}C${cx + 16},${cy + 2.6} ${cx + 13},${cy + 3} ${cx + 8},${cy + 3}C${cx + 4},${cy + 3} ${cx},${cy + 3} ${cx},${cy - 1}Z` : `M${cx - 0.4},${cy - 1}C${cx + 6},${cy - 3} ${cx + 13},${cy - 2} ${cx + 15},${cy + 1.6}C${cx + 16.4},${cy + 4.4} ${cx + 14},${cy + 7.4} ${cx + 9},${cy + 7.6}C${cx + 4},${cy + 7.8} ${cx - 0.6},${cy + 6} ${cx - 0.4},${cy - 1}Z`;
  if (open) {
    s += P(`M${cx},${cy + 2}C${cx + 6},${cy + 2.4} ${cx + 12},${cy + 2.4} ${cx + 15},${cy + 2.6}C${cx + 15},${cy + 9} ${cx + 10},${cy + 13} ${cx + 5},${cy + 12.4}C${cx + 1},${cy + 12} ${cx - 1},${cy + 8} ${cx},${cy + 2}Z`, MOUTH, 1.1);
    s += P(ell(cx + 7, cy + 10.4, 4, 1.8), TONGUE);
    s += d.tone(`M${cx - 0.6},${cy + 9}C${cx + 3},${cy + 13} ${cx + 9},${cy + 14.4} ${cx + 13.6},${cy + 12}C${cx + 15},${cy + 11.4} ${cx + 15.6},${cy + 13.4} ${cx + 14},${cy + 14.4}C${cx + 9},${cy + 17} ${cx + 2},${cy + 15.6} ${cx - 1.6},${cy + 11}Z`, TAN, OW * 0.9, [-0.3, -0.3]);
    for (const x of [2, 5.6, 9.2, 12.4]) s += tooth(cx + x, cy + 2.6, 2, 2.6, true, 0.7);
    for (const x of [4, 8, 11.6]) s += tooth(cx + x, cy + 12.8, 1.8, 2.2, false, 0.7);
  }
  s += d.tone(muz, TAN, OW * 0.9, [-0.6, -0.6]);
  s += P(ell(cx + 14.2, open ? cy - 0.6 : cy + 1.4, 2.2, 1.6), '#1E1A18', 0.9) + hl(cx + 13.6, open ? cy - 1 : cy + 1, 0.7, 0.4, 0, 0.8);
  if (!open) {
    s += S(`M${cx + 4},${cy + 5}Q${cx + 9},${cy + 6.4} ${cx + 13.4},${cy + 4.4}`, 1);
    s += tooth(cx + 6, cy + 5.4, 1.8, 2.4, true, 0.7);
    if (e === 'happy') s += d.tone(`M${cx + 7.6},${cy + 5.6}C${cx + 7.4},${cy + 10} ${cx + 9},${cy + 12} ${cx + 10.6},${cy + 11.6}C${cx + 12},${cy + 11.2} ${cx + 12},${cy + 8} ${cx + 11.4},${cy + 5.2}Z`, [TONGUE, '#C24E6C'], 1, [-0.3, -0.3]);
    else if (e === 'dazed') s += d.tone(`M${cx + 8},${cy + 5.6}C${cx + 7.6},${cy + 11} ${cx + 9},${cy + 14} ${cx + 11},${cy + 13.6}C${cx + 12.6},${cy + 13.2} ${cx + 12.6},${cy + 9} ${cx + 11.8},${cy + 5}Z`, [TONGUE, '#C24E6C'], 1, [-0.3, -0.3]);
    else s += drool(cx + 10.6, cy + 5.6, 3.6, 1.4, 0.8);
  } else {
    s += drool(cx + 14, cy + 3, 3.6, 1.4, 0.8);
  }
  // eyes
  const E1: Pt = [cx - 3.4, cy - 2.2];
  const E2: Pt = [cx + 5, cy - 3];
  if (e === 'dazed') s += P(ell(E1[0], E1[1], 3, 3), SCLERA, 1) + spiral(E1[0], E1[1], 2.4, 0.8, 2) + P(ell(E2[0], E2[1], 2.5, 2.5), SCLERA, 1) + spiral(E2[0], E2[1], 2, 0.8, 1.8);
  else if (e === 'happy') s += S(`M${f(E1[0] - 2.6)},${f(E1[1] + 0.6)}Q${f(E1[0])},${f(E1[1] - 2.6)} ${f(E1[0] + 2.6)},${f(E1[1] + 0.6)}M${f(E2[0] - 2)},${f(E2[1] + 0.6)}Q${f(E2[0])},${f(E2[1] - 2)} ${f(E2[0] + 2)},${f(E2[1] + 0.6)}`, 1.4, '#FFE14D');
  else s += zombieEyes(d, 1, e, ROT[1], E1, E2, 3.5, 2.9);
  // stitches on the cheek
  s += stitches(cx - 8, cy + 2, cx - 4, cy + 6.4, 2, 1, 0.8);
  return s;
}

function buildRot(id: string): CharArt {
  const hips = { BL: [-17, -21] as Pt, BR: [-13, -23.4] as Pt, FL: [6.4, -21] as Pt, FR: [10.4, -23.4] as Pt };
  return quad(id, {
    height: 46,
    hips,
    legBox: (w) => quadLegBox(hips[w], w.endsWith('R') ? 23.4 : 21, 6.6),
    leg: (d, w) => {
      let s = dogLeg(d, hips[w], w.endsWith('R') ? 23.4 : 21, 6.6, ROT, w.endsWith('R'), TAN);
      if (w === 'FL') {
        // bandaged front leg
        const [x, y] = hips[w];
        s += P(rrect(x - 4, y + 6, 8.4, 4.4, 1.2), '#F4EEE0', 1) + S(`M${x - 3.4},${y + 7.8}l7,0.6M${x - 3.4},${y + 9.4}l7,-0.4`, 0.6, '#C9C2B4');
      }
      return s;
    },
    body: (d) => {
      const b = 'M-24,-28C-25,-34 -18,-37 -10,-36.4C-2,-36 6,-37.4 12,-34.6C17,-32 17,-24 13,-20C8,-15.6 -2,-15 -12,-15.6C-20,-16 -24,-21 -24,-28Z';
      let s = d.tone(b, ROT, OW, [-1.4, -1.4]);
      // cartoon ribs peeking through a green patch (goo, not gore)
      const patch = 'M-15,-31C-11,-34 -3,-34 0,-30C2,-26 -1,-21 -6,-20.6C-11,-20.4 -16.6,-23 -16.6,-27Z';
      s += d.tone(patch, ['#7FA86A', '#5E8A4C'], 1.1, [-0.4, -0.4]);
      s += d.clip(patch, [-12, -8.4, -4.8].map((x) => P(`M${x - 1.2},-33Q${x + 1.6},-27 ${x - 1},-19.6L${x + 1},-19.6Q${x + 3.6},-27 ${x + 1},-33Z`, '#FFF6D8', 0.8)).join(''));
      s += S(patch, 1.1);
      // bandage around the belly
      s += d.clip(b, P('M4,-38L9,-38L5,-14L0,-14Z', '#F4EEE0', 1) + S('M4.4,-33l4,0.6M3.6,-28l4,0.6M2.8,-23l4,0.6', 0.6, '#C9C2B4'));
      s += S(b, OW);
      // tan chest + studded collar
      s += d.tone('M10,-33C14,-34 17,-30 16,-25C14,-22 10,-23 9,-26Z', TAN, 1.1, [-0.4, -0.4]);
      s += d.tone('M6.4,-37.6C9,-40 15,-39 17,-35.6L15.6,-32.6C13,-35 10,-35.4 7.6,-34Z', ['#D7262E', '#A51B22'], 1.1, [-0.3, -0.3]);
      for (const [x, y] of [[8.6, -36.6], [11.4, -37.4], [14.2, -36.4]] as Pt[]) s += P(`M${x - 1},${y + 0.6}L${x},${y - 1.4}L${x + 1},${y + 0.6}Z`, '#E6EBF0', 0.6);
      s += stitches(-20, -30, -18, -22, 2, 1, 0.8);
      s += hl(-14, -34, 4, 1.2, -6, 0.25);
      return s;
    },
    bodyPivot: [-4, -26],
    bodyBox: [-28, -42, 20, -11],
    tail: (d) => {
      const t = capsule([-22.6, -31], [-26, -36.6], 4, 3.4);
      return d.tone(t, ROT, OW * 0.9) + P(rrect(-27.4, -38.8, 4.2, 2.6, 0.8), '#F4EEE0', 0.8);
    },
    tailPivot: [-22.6, -31],
    tailBox: [-31, -42, -18, -26],
    head: rotHead,
    neck: [9, -31],
    headBox: [1, -49, 35, -17],
    faces: ['chomp', 'dazed', 'happy'],
  });
}

// ---------------------------------------------------------------- the rest of the raid pets
// Simple variants on the Rot-weiler's frame (sim/petdata.ts): a wolf, a grinning cat, a mummy sphinx and
// five robots. Each is the same quad rig, recoloured and given its own ears / mane / horns / tail and,
// for the robots, plates, rivets and a glowing visor. `k` scales the whole beast.
type EarKind = 'point' | 'cat' | 'round' | 'nemes' | 'horns' | 'mane';
interface BeastLook {
  k: number;
  fur: Tone;
  belly: Tone;
  ears: EarKind;
  tail: 'bushy' | 'thin' | 'tuft' | 'stub' | 'segment';
  robot?: boolean;
  /** cat / panther stripes */
  stripes?: string;
  mane?: Tone;
  /** robots: the visor's glow */
  visor?: string;
  /** the cat's permanent grin */
  grin?: boolean;
  /** bandage wraps (the mummy sphinx) */
  wraps?: boolean;
}

const METAL: Tone = ['#AEB8C2', '#77838F'];
const BEASTS: Record<string, BeastLook> = {
  pet_wolf: { k: 1.12, fur: ['#7E8794', '#59616C'], belly: ['#C9CDD2', '#9EA4AB'], ears: 'point', tail: 'bushy' },
  pet_cat: { k: 0.92, fur: ['#8A5BB0', '#653F86'], belly: ['#E2C9EE', '#BFA0CF'], ears: 'cat', tail: 'thin', stripes: '#4E2E6A', grin: true },
  pet_sphinx: { k: 1.1, fur: ['#D6B26A', '#AE8A45'], belly: ['#EEDDB0', '#CDB985'], ears: 'nemes', tail: 'tuft', wraps: true },
  pet_robohound: { k: 1.02, fur: METAL, belly: ['#D7DDE3', '#A9B2BB'], ears: 'point', tail: 'segment', robot: true, visor: '#FF5A4A' },
  pet_robolion: { k: 1.18, fur: ['#D3A94C', '#A07D2E'], belly: METAL, ears: 'mane', tail: 'tuft', robot: true, mane: ['#B8742C', '#8A5420'], visor: '#FFD34A' },
  pet_robobear: { k: 1.06, fur: ['#8C6A4E', '#664A34'], belly: METAL, ears: 'round', tail: 'stub', robot: true, visor: '#5AD0FF' },
  pet_robobull: { k: 1.14, fur: ['#9E3B32', '#742822'], belly: METAL, ears: 'horns', tail: 'segment', robot: true, visor: '#FFB04A' },
  pet_robopanther: { k: 0.96, fur: ['#3B4250', '#252A34'], belly: METAL, ears: 'cat', tail: 'thin', robot: true, stripes: '#5E6A7C', visor: '#9BFF5A' },
};

function rivets(pts: Pt[], r = 0.9): string {
  return pts.map(([x, y]) => P(ell(x, y, r), '#E6EBF0', 0.6) + P(ell(x - 0.25, y - 0.25, r * 0.35), '#FFFFFF')).join('');
}

function beastHead(L: BeastLook) {
  return (d: Doc, e: Expr): string => {
    const cx = 16.6;
    const cy = -35.4;
    const head = headD(cx, cy, 10.4, 9.4, 1.1);
    let s = '';
    // behind the head: mane, the sphinx's headdress, or ears
    if (L.ears === 'mane') {
      const pts: string[] = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const rr = i % 2 ? 11 : 15.5;
        pts.push(`${f(cx - 1 + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr * 0.92)}`);
      }
      s += d.tone(`M${pts.join('L')}Z`, L.mane!, OW * 0.9, [-0.8, -0.8]);
    } else if (L.ears === 'nemes') {
      const cloth = `M${cx - 12},${cy - 4}C${cx - 10},${cy - 15} ${cx + 8},${cy - 16} ${cx + 11},${cy - 5}L${cx + 13},${cy + 11}L${cx + 7},${cy + 8}L${cx - 9},${cy + 8}L${cx - 14},${cy + 12}Z`;
      s += d.tone(cloth, ['#E8C24A', '#B99128'], OW, [-0.8, -0.8]);
      s += d.clip(cloth, [-8, -3, 2, 7].map((x) => P(`M${cx + x},${cy - 18}h2.4v32h-2.4Z`, '#2F5AA8')).join(''));
      s += S(cloth, OW);
    } else if (L.ears === 'point' || L.ears === 'cat') {
      const tall = L.ears === 'cat' ? 9 : 11;
      s += d.tone(`M${cx - 9},${cy - 4}L${cx - 9.6},${cy - 4 - tall}L${cx - 3},${cy - 8}Z`, L.fur, OW * 0.9, [-0.3, -0.3]);
      s += d.tone(`M${cx + 1},${cy - 8.6}L${cx + 6.6},${cy - 7 - tall}L${cx + 7.6},${cy - 4}Z`, L.fur, OW * 0.9, [-0.3, -0.3]);
      s += P(`M${cx + 2.6},${cy - 8.4}L${cx + 6},${cy - 4 - tall * 0.8}L${cx + 6.4},${cy - 5}Z`, L.belly[0], 0.6);
    } else if (L.ears === 'round') {
      s += d.tone(ell(cx - 7.4, cy - 8, 3.6), L.fur, OW * 0.9) + d.tone(ell(cx + 5, cy - 9.4, 3.4), L.fur, OW * 0.9);
      s += P(ell(cx + 5, cy - 9.4, 1.6), L.belly[0], 0.6);
    } else if (L.ears === 'horns') {
      s += d.tone(`M${cx - 8},${cy - 5}C${cx - 15},${cy - 7} ${cx - 17},${cy - 13} ${cx - 14},${cy - 18}C${cx - 13},${cy - 12} ${cx - 10},${cy - 10} ${cx - 5},${cy - 8.6}Z`, ['#F1E6C8', '#C9B98E'], OW * 0.9, [-0.3, -0.3]);
      s += d.tone(`M${cx + 4},${cy - 8.6}C${cx + 10},${cy - 11} ${cx + 13},${cy - 15} ${cx + 12},${cy - 20}C${cx + 15},${cy - 15} ${cx + 15},${cy - 9} ${cx + 8},${cy - 5}Z`, ['#F1E6C8', '#C9B98E'], OW * 0.9, [-0.3, -0.3]);
    }
    s += d.shaded(head, L.fur[0], L.fur[1], OW, [-1.4, -1.2]);
    s += hl(cx - 5, cy - 6, 2.2, 1, -30, L.robot ? 0.5 : 0.3);
    if (L.stripes) s += d.clip(head, S(`M${cx - 3},${cy - 10}l1.4,4.4M${cx + 1},${cy - 10.6}l0.6,4.6M${cx - 8},${cy - 6}l3,2.4`, 1.6, L.stripes)) + S(head, OW);
    if (L.wraps) s += d.clip(head, S(`M${cx - 12},${cy - 1}L${cx + 10},${cy - 7}M${cx - 12},${cy + 3}L${cx + 10},${cy - 3}`, 2.2, '#F4EEE0') + S(`M${cx - 12},${cy - 1}L${cx + 10},${cy - 7}`, 0.5, '#C9C2B4')) + S(head, OW);
    if (L.robot) {
      s += d.clip(head, S(`M${cx - 11},${cy + 1}Q${cx},${cy - 2} ${cx + 11},${cy + 2}`, 0.8, darker(L.fur[1], 0.7)));
      s += rivets([
        [cx - 6.4, cy - 6.6],
        [cx + 0.6, cy - 8.4],
      ]);
    }
    // muzzle and mouth
    const open = e === 'chomp' || L.grin;
    const muz = ell(cx + 8.6, cy + 3.4, L.ears === 'cat' ? 5.6 : 7, L.ears === 'cat' ? 4 : 4.8);
    s += d.tone(muz, L.robot ? METAL : L.belly, OW * 0.9, [-0.6, -0.6]);
    if (open) {
      const w = L.grin ? 9 : 7;
      const m = `M${cx + 8.6 - w},${cy + 4}Q${cx + 8.6},${cy + (L.grin ? 7 : 6)} ${cx + 8.6 + w * 0.8},${cy + 2.4}Q${cx + 9},${cy + 13} ${cx + 8.6 - w},${cy + 4}Z`;
      s += P(m, MOUTH, 1.1);
      for (let i = 0; i < (L.grin ? 6 : 4); i++) s += tooth(cx + 8.6 - w + 1 + i * 2.6, cy + 4.6 - i * 0.25, 1.8, 2.2, true, 0.6, L.robot ? '#E6EBF0' : TOOTH);
      if (e === 'chomp') s += P(ell(cx + 8, cy + 9.4, 3, 1.4), TONGUE);
    } else {
      s += S(`M${cx + 4},${cy + 5}Q${cx + 9},${cy + 6.6} ${cx + 13.4},${cy + 4.4}`, 1);
      if (e === 'happy') s += d.tone(`M${cx + 7.6},${cy + 5.6}C${cx + 7.4},${cy + 10} ${cx + 9},${cy + 12} ${cx + 10.6},${cy + 11.6}C${cx + 12},${cy + 11.2} ${cx + 12},${cy + 8} ${cx + 11.4},${cy + 5.2}Z`, [TONGUE, '#C24E6C'], 1, [-0.3, -0.3]);
      else if (!L.robot) s += drool(cx + 10.6, cy + 5.6, 3.6, 1.4, 0.8);
    }
    s += P(ell(cx + 14.2, cy + 1.4, 2, 1.5), L.robot ? '#3A3F46' : '#1E1A18', 0.9) + hl(cx + 13.6, cy + 1, 0.7, 0.4, 0, 0.8);
    if (L.ears === 'cat') s += S(`M${cx + 12},${cy + 3.6}l7,-1.4M${cx + 12},${cy + 5}l7,1M${cx + 4},${cy + 4}l-6,-1`, 0.6, '#EDE6F2');
    // eyes: a glowing visor for the robots, the zombie eyes for the rest
    const E1: Pt = [cx - 3.4, cy - 2.2];
    const E2: Pt = [cx + 5, cy - 3];
    if (L.robot && e !== 'dazed') {
      const v = `M${E1[0] - 4.6},${E1[1] - 2.4}L${E2[0] + 3.8},${E2[1] - 2.8}L${E2[0] + 3.6},${E2[1] + 2.6}L${E1[0] - 4.4},${E1[1] + 3}Z`;
      s += P(v, '#1C2026', 1.1);
      const glow = e === 'happy' ? `M${E1[0] - 2.4},${E1[1] + 0.8}q2.4,-2.6 4.8,0M${E2[0] - 2},${E2[1] + 0.6}q2,-2.4 4,0` : `M${E1[0] - 3.4},${E1[1] + 0.2}L${E2[0] + 2.8},${E2[1] - 0.2}`;
      s += S(glow, e === 'happy' ? 1.4 : 2.2, L.visor ?? '#FF5A4A') + S(glow, 0.7, '#FFFFFF', 'opacity="0.7"');
    } else if (e === 'happy') {
      s += S(`M${f(E1[0] - 2.6)},${f(E1[1] + 0.6)}Q${f(E1[0])},${f(E1[1] - 2.6)} ${f(E1[0] + 2.6)},${f(E1[1] + 0.6)}M${f(E2[0] - 2)},${f(E2[1] + 0.6)}Q${f(E2[0])},${f(E2[1] - 2)} ${f(E2[0] + 2)},${f(E2[1] + 0.6)}`, 1.4, '#FFE14D');
    } else s += zombieEyes(d, 1, e, L.fur[1], E1, E2, 3.5, 2.9);
    if (!L.robot) s += stitches(cx - 8, cy + 2, cx - 4, cy + 6.4, 2, 1, 0.8);
    return s;
  };
}

function buildBeast(id: string, L: BeastLook): CharArt {
  const k = L.k;
  const sp = (p: Pt): Pt => [p[0] * k, p[1] * k];
  const sb = (b: Box): Box => [b[0] * k, b[1] * k, b[2] * k, b[3] * k];
  const g = (s: string) => `<g transform="scale(${k})">${s}</g>`;
  const hips = { BL: [-17, -21] as Pt, BR: [-13, -23.4] as Pt, FL: [6.4, -21] as Pt, FR: [10.4, -23.4] as Pt };
  const len = (w: string) => (w.endsWith('R') ? 23.4 : 21);
  const joint: Tone = L.robot ? [darker(L.fur[0], 0.62), darker(L.fur[1], 0.62)] : L.belly;
  const body = 'M-24,-28C-25,-34 -18,-37 -10,-36.4C-2,-36 6,-37.4 12,-34.6C17,-32 17,-24 13,-20C8,-15.6 -2,-15 -12,-15.6C-20,-16 -24,-21 -24,-28Z';
  const head = beastHead(L);
  return quad(id, {
    height: Math.round(46 * k),
    hips: { BL: sp(hips.BL), BR: sp(hips.BR), FL: sp(hips.FL), FR: sp(hips.FR) },
    legBox: (w) => sb(quadLegBox(hips[w], len(w), 6.6)),
    leg: (d, w) => g(dogLeg(d, hips[w], len(w), 6.6, L.fur, w.endsWith('R'), L.robot || L.ears === 'cat' ? joint : undefined)),
    body: (d) => {
      let s = d.tone(body, L.fur, OW, [-1.4, -1.4]);
      s += d.clip(body, d.tone('M-14,-17C-6,-21 6,-21 14,-19L14,-12L-14,-12Z', L.belly, 1, [-0.4, -0.4]));
      if (L.stripes) s += d.clip(body, S('M-16,-37l3,9M-9,-37.4l2.4,9M-2,-37l2,8.6M5,-37.6l1.6,8', 2, L.stripes));
      if (L.wraps) s += d.clip(body, S('M-24,-30L14,-24M-24,-24L14,-18M-20,-36L12,-30', 2.6, '#F4EEE0') + S('M-24,-30L14,-24', 0.6, '#C9C2B4'));
      if (L.robot) {
        s += d.clip(body, S('M-8,-37V-15M4,-37V-16', 0.8, darker(L.fur[1], 0.7)));
        s += rivets([
          [-18, -31],
          [-12, -33],
          [-3, -33.4],
          [8, -32.6],
        ]);
      } else s += stitches(-20, -30, -18, -22, 2, 1, 0.8);
      s += S(body, OW);
      s += hl(-14, -34, 4, 1.2, -6, L.robot ? 0.5 : 0.25);
      return g(s);
    },
    bodyPivot: sp([-4, -26]),
    bodyBox: sb([-28, -42, 20, -11]),
    tail: (d) => {
      let s: string;
      if (L.tail === 'bushy') s = d.tone('M-22,-31C-28,-34 -34,-36 -36,-42C-31,-40 -27,-41 -25,-37C-23,-35 -21,-34 -21,-31Z', L.fur, OW * 0.9, [-0.4, -0.4]) + P(ell(-35, -41, 2, 1.6), L.belly[0], 0.6);
      else if (L.tail === 'thin' || L.tail === 'tuft') {
        const c = 'M-22.6,-31C-28,-33 -31,-38 -29,-43';
        s = S(c, 4.4, OUT) + S(c, 2.4, L.fur[0]);
        if (L.tail === 'tuft') s += d.tone(ell(-29, -44, 2.6, 2.2), L.mane ?? L.fur, OW * 0.8);
      } else if (L.tail === 'segment') s = [0, 1, 2].map((i) => d.tone(rrect(-26 - i * 3.4, -34.6 - i * 2.6, 4, 3.2, 1), i % 2 ? joint : L.fur, OW * 0.7)).join('');
      else s = d.tone(capsule([-22.6, -31], [-26, -34], 4.4, 3.6), L.fur, OW * 0.9);
      return g(s);
    },
    tailPivot: sp([-22.6, -31]),
    tailBox: sb([-39, -48, -18, -26]),
    head: (d, e) => g(head(d, e)),
    neck: sp([9, -31]),
    headBox: sb([-2, -58, 38, -17]),
    faces: ['chomp', 'dazed', 'happy'],
  });
}

export const PET_IDS = ['pet_pug', 'pet_rotweiler', ...Object.keys(BEASTS)] as const;

/** A pet's art, or null if the id isn't a pet. */
export function buildPet(id: string): CharArt | null {
  if (id === 'pet_pug') return buildPug(id);
  if (id === 'pet_rotweiler') return buildRot(id);
  if (BEASTS[id]) return buildBeast(id, BEASTS[id]);
  return null;
}
