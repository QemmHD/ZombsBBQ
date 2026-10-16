/**
 * Raid cast (art v3, rig v2): the rival joints' waiters, waitresses and Head Chefs, the Big Foot-Long
 * summon and the Werewoof pet, built with the joint cast's toolkit (rig / paint / head / hair / body /
 * wear / props) and the same build pipeline (`buildLook3`), so they match it part for part.
 *
 * Ids (bipeds, C1 part contract, see index.ts):
 *   staff_<r>, staff_<r>_b   waiter / waitress of rival <r>          faces angry, shock, scream, dazed
 *   boss_<r>                 the Head Chef (≈1.25× scale)            faces angry, shock, scream, dazed
 *   bigfoot                  Big Foot-Long, hot-dog sasquatch zombie (≈1.5×)   faces chomp, sleep, dazed
 *   werewoof                 werewolf zombie pet                     faces chomp, sleep, dazed
 *   <r> = chuck | hank | vera | crunch | snob | boss (Chef Inferno's food truck)
 * Every waiter and chef holds a weapon in the near forearm (armL2), pointing forward-down at rest, so
 * the human punch (cock back, then jab 98° forward) brings it round in a chop.
 * Chefs scowl even at rest (a heavy-lidded glare instead of the joint cast's bored stare), and every
 * human gets a knocked-out `dazed` head (spiral eye, tongue out, a lump and circling stars).
 */
import type { CharArt, FaceName } from '../../art/types';
import type { Body, BodyKind, Ctx, Expr, FaceSpec, Look, Paint } from './rig';
import { BODIES, elbowAt, kneeAt } from './rig';
import { face, geo, eyeH, eyeZ, eyeShut, eyeSpiral, brows, nose, mouthH, wrinkles, stubble, hairMass, EYE_N, EYE_F } from './head';
import type { BrowPose } from './head';
import { shirtTorso, jacketTorso, armPaint, legPaint, torsoD, edgeX, neck, hand, wristAt, HAND_S } from './body';
import type { ArmSet, HandItem, LegSet } from './body';
import * as H from './hair';
import type { HairSet, HatPaint } from './hair';
import * as W from './wear';
import { HAIR, seq, seqE } from './cast';
import { buildLook3 } from './index';
import type { FacePaint } from './index';
import {
  INK, f, ellD, fill, line, outl, circ, inside, shade, speck, hatch, grime, fold, stain, drip, rnd, mix, dk, lt, jag, smooth,
  limb, tube, toothP, tone, spot, fly, poly, blob,
  SKIN, SKIN_TAN, SKIN_DARK, SKIN_PALE, ZSKINS, SCLERA, TEETH, TEETH_D, MOUTH, TONGUE, BLOOD, BLOOD_D, SLIME, SLIME_L, GREASE, C,
} from './paint';
import type { Tone, Pt } from './paint';

type Box = [number, number, number, number];

export const RAID3_RIVALS = ['chuck', 'hank', 'vera', 'crunch', 'snob', 'boss'] as const;
export type Raid3Rival = (typeof RAID3_RIVALS)[number];
export const RAID3_STAFF_IDS: string[] = RAID3_RIVALS.flatMap((r) => [`staff_${r}`, `staff_${r}_b`]);
export const RAID3_CHEF_IDS: string[] = RAID3_RIVALS.map((r) => `boss_${r}`);
export const RAID3_BEAST_IDS: string[] = ['bigfoot', 'werewoof'];
export const RAID3_IDS: string[] = [...RAID3_STAFF_IDS, ...RAID3_CHEF_IDS, ...RAID3_BEAST_IDS];
/** Rival humans: aggro glare, hit, panic, knocked out. */
export const RIVAL_FACES3: FaceName[] = ['angry', 'shock', 'scream', 'dazed'];
/** Raid monsters (zombie side). */
export const BEAST_FACES3: FaceName[] = ['chomp', 'sleep', 'dazed'];

// ================================================================== palette
const TIN = tone('#9C9E96', '#72746C');
const IRON = tone('#3A3836', '#232120');
const WOOD = tone('#9A7A50', '#74583A');
const DWOOD = tone('#5E4028', '#40291A');
const STEEL = tone('#A8ACA6', '#7A7E78');
const CREAM = tone('#D2CAB2', '#AAA28A');
const KETCHUP = '#8A2A1E';
const MUSTARD = '#B8962E';

// ================================================================== faces
interface Menace {
  lid: number;
  tilt: number;
  pr?: number;
  look?: Pt;
  brow?: BrowPose;
  flare?: boolean;
}

/** Neutral chef glare: heavy tilted lids, brows down, the look's own closed mouth. */
function menaceFace(c: Ctx, m: Menace): string {
  const fc = c.L.face;
  const g = geo(fc.shape, undefined);
  const es = (fc.eyeS ?? 1) * 1.16;
  const [nx, ny] = EYE_N;
  const [fx, fy] = EYE_F;
  let s = eyeH(c, nx, ny + 0.3, 4.3 * es, 4.9 * es, { lid: m.lid, tilt: -m.tilt, low: 0.1, bags: 2, look: m.look ?? [0.9, 0.3], pr: m.pr, lash: fc.lash, shadow: fc.shadow });
  s += eyeH(c, fx, fy + 0.3, 3.3 * es, 4.6 * es, { lid: m.lid, tilt: m.tilt * 0.9, low: 0.1, bags: 1, look: m.look ? [m.look[0] * 0.8, m.look[1]] : [0.7, 0.3], pr: m.pr ? m.pr * 0.9 : undefined, lash: fc.lash, shadow: fc.shadow });
  s += brows(c, m.brow ?? 'down') + nose(c, fc.nose, m.flare) + mouthH(c, fc.mouth, g) + wrinkles(c, fc.wrinkles ?? 1, 'angry');
  if (fc.stubble) s = stubble(c, g) + s;
  return s;
}

/** A small muted cartoon star (dazed). */
function dazeStar(x: number, y: number, r: number, rot = 0): string {
  const pts: Pt[] = [];
  for (let k = 0; k < 10; k++) {
    const a = ((k * 36 + rot - 90) * Math.PI) / 180;
    const rr = k % 2 ? r * 0.45 : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return outl(poly(pts), '#C8AE4A', 0.55) + circ(x - r * 0.2, y - r * 0.25, r * 0.18, '#E8DA9A', 0.8);
}

function koStars(): string {
  return line('M-24,-99C-14,-108 16,-110 30,-100', 0.5, '#8A7A3A', 'opacity="0.6" stroke-dasharray="1.2 1.6"') + dazeStar(-21, -101, 3.2, 10) + dazeStar(6, -108.6, 2.6, -14) + dazeStar(28, -101.6, 2.9, 22);
}

/** Human KO face: one spiral eye, one droopy lid, slack crooked mouth with the tongue out, a lump, stars. */
function dazedH(c: Ctx): string {
  const fc = c.L.face;
  const { d, sk } = c;
  const g = geo(fc.shape, 'dazed');
  const [nx, ny] = EYE_N;
  const [fx, fy] = EYE_F;
  let s = fill(ellD(nx + 0.2, ny - 0.4, 6.4, 6.6), spot(d, sk.d, 0.45));
  const er = 5;
  s += outl(ellD(nx, ny, er, er * 1.08), SCLERA, 0.8);
  let sp = `M${f(nx)},${f(ny)}`;
  for (let i = 1; i <= 26; i++) {
    const t = i / 26;
    const a = t * 2.3 * Math.PI * 2;
    sp += `L${f(nx + Math.cos(a) * t * (er - 0.7))},${f(ny + Math.sin(a) * t * (er - 0.7))}`;
  }
  s += line(sp, 0.65, '#2A2420');
  s += line(`M${f(nx - er * 0.85)},${f(ny + er * 0.8)}Q${f(nx)},${f(ny + er * 1.5)} ${f(nx + er * 0.9)},${f(ny + er * 0.7)}`, 0.55, sk.d, 'opacity="0.85"');
  s += eyeH(c, fx, fy + 0.6, 3.8, 4.8, { lid: 0.62, tilt: 0.8, low: 0.1, bags: 2, look: [-0.4, -1.2], pr: 1 });
  s += brows(c, 'worry');
  s += nose(c, fc.nose);
  const mp = 'M5,-61C8,-61.8 12.8,-62.6 16.6,-63.4C16.6,-60.4 13.6,-58.6 10.6,-58.6C7.6,-58.6 5.4,-59.4 5,-61Z';
  let mi = fill(mp, MOUTH);
  for (let i = 0; i < 4; i++) if (i !== 1) mi += toothP(8 + i * 2.1, -63 + i * -0.2, 2, 1.8, true, i === 3 ? '#B8AA78' : TEETH);
  s += inside(d, mp, mi) + line(mp, 1.05);
  s += `<path d="M11.6,-59.6C11.4,-56 12.4,-52.4 15.2,-52.4C17.8,-52.4 18,-55.4 16.6,-59.6Z" fill="${TONGUE}" stroke="${INK}" stroke-width="0.8"/>` + line('M14.2,-58.6v4.2', 0.5, dk(TONGUE, 0.7));
  s += line('M10.2,-66.6C8.4,-65 7.6,-63.4 7.4,-61.8', 0.55, sk.d, 'opacity="0.75"');
  // a fresh lump on the brow
  const lump = 'M-3.6,-88.6C-3.4,-92.6 2.4,-93.4 3.6,-89.6C4.2,-87.4 2.4,-86 0,-86.2C-2.2,-86.4 -3.6,-87.2 -3.6,-88.6Z';
  s += shade(d, lump, { b: mix(sk.b, '#9A6A5A', 0.35), s: mix(sk.s, '#7A4A3A', 0.35), d: sk.d }, { lw: 0.8, off: [-0.6, -0.6] });
  s += fill(ellD(-0.8, -90.2, 1.2, 0.6), lt(sk.b, 0.5), 'opacity="0.7"');
  s += wrinkles(c, fc.wrinkles ?? 1, 'dazed') + koStars();
  if (fc.stubble) s = stubble(c, g) + s;
  return s;
}

/** Face painter for the rival humans: KO head, the chef glare at rest, the joint faces otherwise. */
function rivalFace(m?: Menace): FacePaint {
  return (c, e) => {
    if (e === 'dazed') return dazedH(c);
    if (!e && m) return menaceFace(c, m);
    return face(c, e);
  };
}

// ================================================================== weapons
/**
 * A hand prop authored lying along +x from the grip (0,0), rotated `ang` degrees (clockwise =
 * forward-down) about the fist and scaled by `sc`. `extra` adds a box (relative to the fist, after
 * scaling) for paint that does not rotate with the prop (flames rising straight up).
 */
function weapon(ang: number, ext: Box, under: (c: Ctx) => string, o: { over?: (c: Ctx) => string; extra?: Box; sc?: number } = {}): HandItem {
  const sc = o.sc ?? 1;
  const a = (ang * Math.PI) / 180;
  const co = Math.cos(a);
  const si = Math.sin(a);
  const pts: Pt[] = [[ext[0], ext[1]], [ext[2], ext[1]], [ext[2], ext[3]], [ext[0], ext[3]]].map(([x, y]) => [(x * co - y * si) * sc, (x * si + y * co) * sc]);
  let box: Box = [Math.min(...pts.map((p) => p[0])) - 1.4, Math.min(...pts.map((p) => p[1])) - 1.4, Math.max(...pts.map((p) => p[0])) + 1.4, Math.max(...pts.map((p) => p[1])) + 1.4];
  if (o.extra) box = [Math.min(box[0], o.extra[0]), Math.min(box[1], o.extra[1]), Math.max(box[2], o.extra[2]), Math.max(box[3], o.extra[3])];
  const wrap = (p: (c: Ctx) => string) => (c: Ctx, h: Pt) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${f(ang)}) scale(${f(sc)})">${p(c)}</g>`;
  return { fist: true, box, under: wrap(under), over: o.over ? wrap(o.over) : undefined };
}

/** Big dented tin chili ladle. */
function ladle(ang: number, sc: number): HandItem {
  return weapon(ang, [-5, -2.5, 28, 8], (c) => {
    const d = c.d;
    let s = shade(d, limb([-4, 0], [17, 0.6], 2.4, 1.8), TIN, { lw: 0.9, inner: line('M-2,-0.4L15,0.2', 0.45, lt(TIN.b, 0.4), 'opacity="0.7"') });
    const bowl = 'M15.2,0.4C15,6.6 18,8 21.4,8C24.8,8 27.6,6.6 27.6,0.4Z';
    s += shade(d, bowl, TIN, { lw: 1, inner: grime([15, 0, 28, 8], 3, '#5A4A2A', c.seed + 3, 1.6, 0.4) + fill(ellD(18.6, 3.6, 1.2, 2), lt(TIN.b, 0.45), 'opacity="0.6"') });
    s += outl(ellD(21.4, 0.4, 6.2, 1.5), '#6A3A1E', 0.9) + fill(ellD(20.6, 0.1, 3, 0.6), '#8A4A26', 'opacity="0.8"');
    s += line('M17,3.2l1.4,0.8', 0.6, INK, 'opacity="0.6"') + stain(26, 4, 1.1, '#6A3A1E', c.seed + 5, 0.85, 1) + drip(25.6, 6.6, 3, 1.1, '#6A3A1E', 0.85);
    return s;
  }, { sc });
}

/** Rolling pin, optionally studded with bent nails. */
function rollingPin(ang: number, sc: number, nails = false): HandItem {
  return weapon(ang, [-6, -5, 28, 5], (c) => {
    const d = c.d;
    let s = shade(d, limb([-5, 0], [3, 0], 2.6, 2.6), WOOD, { lw: 0.9 });
    s += shade(d, limb([20, 0], [27, 0], 2.6, 2.6), WOOD, { lw: 0.9 });
    const body = 'M2.4,-3.2L21,-3.2Q22,0 21,3.2L2.4,3.2Q1.4,0 2.4,-3.2Z';
    let inner = line('M3,-1.6Q12,-2.4 20.6,-1.4M3.4,1.2Q11,0.6 20.4,1.8', 0.45, WOOD.d, 'opacity="0.8"') + fill('M2,-3.4H22V-1.6H2Z', lt(WOOD.b, 0.35), 'opacity="0.55"');
    inner += grime([2, -3, 21, 3], 4, '#3A2A1A', c.seed + 7, 1.6, 0.35) + stain(13, 1.4, 1.2, '#D8D0B8', c.seed + 9, 0.6, 1);
    s += shade(d, body, WOOD, { lw: 1, inner });
    if (nails) {
      for (const [x, up, bend] of [[6, -1, 1], [10.4, 1, -1], [14, -1, -1], [17.6, 1, 1]] as [number, number, number][]) {
        const dd = `M${f(x)},${f(up * 3)}l${f(bend * 0.8)},${f(up * 3)}l${f(bend * 1.2)},${f(up * 0.6)}`;
        s += line(dd, 1.3) + line(dd, 0.6, '#8A8478');
      }
      s += stain(9, -1, 1, BLOOD, c.seed + 2, 0.7, 1);
    }
    return s;
  }, { sc });
}

/** Greasy diner spatula (flipper). */
function flipper(ang: number, sc: number): HandItem {
  return weapon(ang, [-5, -5, 26, 5], (c) => {
    const d = c.d;
    let s = shade(d, limb([-4.6, 0], [10, 0], 3, 2.6), IRON, { lw: 0.9, inner: circ(1, 0, 0.5, '#8A8A84') + circ(6, 0, 0.5, '#8A8A84') });
    s += shade(d, 'M9.6,-0.9L15.6,-1.2L15.6,1.2L9.6,0.9Z', STEEL, { lw: 0.8, k: 0 });
    const blade = 'M15,-4.4L24.4,-4.8Q25.4,0 24.4,4.8L15,4.4Z';
    let inner = line('M17,-2.6H23.6M17,0H23.6M17,2.6H23.6', 0.9, '#4A4A46') + grime([15, -5, 25, 5], 5, '#4A3A1E', c.seed + 3, 1.6, 0.45);
    inner += fill('M15,-4.4L24.4,-4.8L24.4,-3.4L15,-3.2Z', lt(STEEL.b, 0.4), 'opacity="0.6"');
    s += shade(d, blade, STEEL, { lw: 1, inner });
    s += drip(20, 4.4, 3.6, 1.1, GREASE, 0.85) + drip(23, 4.6, 2.4, 0.9, GREASE, 0.8);
    return s;
  }, { sc });
}

/** Tall wooden pepper mill, swung like a cosh. */
function pepperMill(ang: number, sc: number): HandItem {
  return weapon(ang, [-4.5, -4.6, 25.5, 4.6], (c) => {
    const d = c.d;
    const col = DWOOD;
    const body = 'M-3.6,-3.4L1.6,-3.4C4,-3.4 5,-2.2 8,-2.2C12,-2.2 14,-3.6 18,-3.8L19,-3.8L19,3.8L18,3.8C14,3.6 12,2.2 8,2.2C5,2.2 4,3.4 1.6,3.4L-3.6,3.4Q-4.4,0 -3.6,-3.4Z';
    const inner = fill('M-4,-3.6H20V-2H-4Z', lt(col.b, 0.35), 'opacity="0.6"') + line('M1.6,-3.4V3.4M17.6,-3.8V3.8', 0.6, col.d) + speck([-4, -4, 20, 4], 14, [col.d, lt(col.b, 0.3)], c.seed + 3, 0.2, 0.5, 0.5);
    let s = shade(d, body, col, { lw: 1, inner });
    s += shade(d, 'M19,-2.6C21.6,-3 22.4,-1.6 22.4,0C22.4,1.6 21.6,3 19,2.6Z', col, { lw: 0.9 });
    s += shade(d, ellD(23.6, 0, 1.6, 1.4), C.chrome, { lw: 0.8, k: 0 });
    return s;
  }, { sc });
}

/** Wine bottle held by the neck. */
function wineBottle(ang: number, sc: number): HandItem {
  const glass = tone('#3E4A30', '#2A3420');
  return weapon(ang, [-5.5, -4.8, 27, 4.8], (c) => {
    const d = c.d;
    const p = 'M-4,-1.2L5,-1.3C7,-1.3 8,-4 11,-4.2L25,-4.2Q26.6,0 25,4.2L11,4.2C8,4 7,1.3 5,1.3L-4,1.2Z';
    let inner = fill('M-5,-1.4H6L12,-4.4H26V-2.6H12L6,-0.6H-5Z', lt(glass.b, 0.35), 'opacity="0.5"');
    inner += outl('M14,-4.4H21.4V4.4H14Z', '#C8BC94', 0.5) + line('M15.4,-1.6h4.4M15.4,0h3.6M15.4,1.6h4.4', 0.5, '#6D1727') + grime([14, -4, 21, 4], 2, '#6A5A3A', c.seed + 2, 1.6, 0.4);
    inner += fill('M23,-4.4H26.4V4.4H23Z', '#2A1418', 'opacity="0.45"');
    let s = shade(d, p, glass, { lw: 1, inner });
    s += outl('M-5,-1.6H-1.6V1.6H-5Z', '#6D1727', 0.7);
    s += drip(16.4, 4.2, 2.4, 1, '#4A1A20', 0.8);
    return s;
  }, { sc });
}

/** Battered serving tray held by its rim, slapped like a shield. */
function tray(ang: number, sc: number, col: Tone = TIN, ring = '#7A5A3A'): HandItem {
  return weapon(ang, [-1.4, -13, 25.4, 13], (c) => {
    const d = c.d;
    const disc = 'M1.2,0C1.2,-7 6,-12.2 13,-12.2C20,-12.2 24.8,-7 24.8,0C24.8,7 20,12.2 13,12.2C6,12.2 1.2,7 1.2,0Z';
    let inner = line(ellD(13, 0, 9.6, 9.6), 0.6, col.d) + fill(ellD(9, -4, 5, 3.4), lt(col.b, 0.35), 'opacity="0.45"');
    inner += line(ellD(15, 2.4, 3.6, 3.4), 0.9, ring, 'opacity="0.55"') + line(ellD(9, 5, 2.6, 2.4), 0.7, ring, 'opacity="0.4"');
    inner += line('M18,-6q2,1 1.2,3M6,6q1.6,0.4 2.4,2', 0.6, col.d) + grime([1, -12, 25, 12], 5, '#4A3A22', c.seed + 3, 2.4, 0.3) + speck([1, -12, 25, 12], 18, [col.d, lt(col.b, 0.4)], c.seed + 5, 0.2, 0.5, 0.5);
    let s = shade(d, disc, col, { lw: 1.1, inner });
    s += line('M19.6,-9.6q-2.4,2 -1.6,4', 0.8) + fill(ellD(19.2, -7.6, 1.4, 2), col.d, 'opacity="0.6"');
    return s;
  }, { sc });
}

/** Deep-fryer basket with a few blackened fries. */
function fryBasket(ang: number, sc: number): HandItem {
  return weapon(ang, [-5.5, -9, 26.5, 6], (c) => {
    const d = c.d;
    let s = shade(d, limb([-5, 0], [3, 0], 3.2, 3), tone('#5A2A22'), { lw: 0.9, inner: line('M-3,-1.6v3.2M-1,-1.6v3.2M1,-1.6v3.2', 0.4, '#3A1A14') });
    s += line('M3,0L10.6,-0.6', 2.2) + line('M3,0L10.6,-0.6', 1, '#9A9C96');
    const bask = 'M10,-5L26,-5L25.4,5.2L10.6,5.2Z';
    let mesh = '';
    for (let x = 11; x < 26; x += 1.8) mesh += `M${f(x)},-5V5.2`;
    for (let y = -4; y < 5.2; y += 1.8) mesh += `M10,${f(y)}H26`;
    for (let i = 0; i < 6; i++) s += outl(`M${f(11.6 + i * 2.3)},-4.6l${f(0.4 + (i % 2))},${f(-3 - (i % 3))}l1.5,0.3l-0.4,3Z`, i % 3 ? '#A07A3A' : '#6A4A22', 0.5);
    s += fill(bask, '#3A3428', 'opacity="0.55"');
    s += inside(d, bask, line(mesh, 0.45, '#8A8C86')) + line(bask, 1) + line('M10,-5H26', 1.3, '#9A9C96');
    s += drip(14, 5.2, 3, 1, GREASE, 0.85) + drip(22, 5.2, 2, 0.9, GREASE, 0.8);
    return s;
  }, { sc });
}

/** Cast-iron frying pan with a burnt egg welded in. */
function fryingPan(ang: number, sc: number): HandItem {
  return weapon(ang, [-6, -12.5, 39, 12.5], (c) => {
    const d = c.d;
    let s = shade(d, limb([-5, 0], [14, 0], 3.6, 3.2), IRON, { lw: 1, inner: line('M-3,-0.6H12', 0.5, '#6A6864', 'opacity="0.7"') + fill(ellD(-2.6, 0, 1.1, 0.8), '#151311') });
    const pan = 'M14,0C14,-7.4 19,-12 26,-12C33,-12 38,-7.4 38,0C38,7.4 33,12 26,12C19,12 14,7.4 14,0Z';
    s += shade(d, pan, IRON, { lw: 1.2, inner: fill(ellD(22, -6, 6, 3), lt(IRON.b, 0.25), 'opacity="0.6"') });
    const well = ellD(26.4, 0.4, 9.4, 9.6);
    let wi = fill(well, '#2A2826') + fill(ellD(28, 3, 8, 6), '#1A1816', 'opacity="0.8"');
    wi += fill(blob(25, -1, 4.8, 4, c.seed + 2), '#C8BC94') + fill(ellD(26.2, -0.4, 1.9, 1.7), '#8A6A26') + line(blob(25, -1, 4.8, 4, c.seed + 2), 0.5, '#5A4A2A');
    wi += grime([16, -9, 36, 9], 5, GREASE, c.seed + 6, 2, 0.45);
    s += inside(d, well, wi) + line(well, 0.8);
    s += drip(19, 9.4, 3, 1.2, GREASE, 0.8);
    return s;
  }, { sc });
}

/** Meat tenderiser mallet the size of a cinder block. */
function tenderiser(ang: number, sc: number): HandItem {
  return weapon(ang, [-6, -11.5, 33, 11.5], (c) => {
    const d = c.d;
    let s = shade(d, limb([-5.4, 0], [23, 0], 3.8, 3.4), WOOD, { lw: 1, inner: line('M-4,-0.6Q8,-1.4 21,-0.4', 0.45, WOOD.d) + grime([-5, -2, 23, 2], 3, '#3A2A1A', c.seed, 1.4, 0.4) });
    s += fill(ellD(-3.6, 0, 1, 0.9), '#2A1A10');
    s += shade(d, 'M21,-9L32,-9L32,9L21,9Z', STEEL, { lw: 1.2, inner: fill('M21,-9H32V-6H21Z', lt(STEEL.b, 0.4), 'opacity="0.55"') + grime([21, -9, 32, 9], 4, '#4A3A2A', c.seed + 2, 2, 0.4) });
    let teeth = '';
    for (let i = 0; i < 5; i++) {
      const x = 21.4 + i * 2.1;
      teeth += `<path d="M${f(x)},-9L${f(x + 1.05)},-11L${f(x + 2.1)},-9Z" fill="${STEEL.s}" stroke="${INK}" stroke-width="0.5"/>`;
      teeth += `<path d="M${f(x)},9L${f(x + 1.05)},11L${f(x + 2.1)},9Z" fill="${STEEL.s}" stroke="${INK}" stroke-width="0.5"/>`;
    }
    s += teeth + stain(28, 9.6, 1.6, BLOOD, c.seed + 4, 0.85, 2) + drip(27, 10, 3, 1.2, BLOOD_D, 0.75) + stain(23.4, -9.6, 1.1, '#7A3A2A', c.seed + 6, 0.8, 1);
    return s;
  }, { sc });
}

/** A gigantic zucchini, nailed through like a medieval club. */
function zucchiniClub(ang: number, sc: number): HandItem {
  const Z = tone('#5A7038', '#3E5226');
  return weapon(ang, [-7.5, -11, 39, 11], (c) => {
    const d = c.d;
    const p = smooth([[-5, 0], [-2, -3.2], [8, -4.4], [20, -5.8], [31, -6.2], [37, -3.6], [38.4, 0.4], [36, 4.6], [28, 6.2], [17, 5.4], [7, 4.2], [-2, 3]]);
    let inner = '';
    for (const y of [-3.2, -0.6, 2.4]) inner += line(`M-2,${f(y * 0.7)}Q16,${f(y * 1.2)} 36,${f(y * 0.8)}`, 1.1, '#9AAA6A', 'opacity="0.5"');
    inner += speck([-4, -6, 38, 6], 40, ['#C8CC9A', Z.d], c.seed + 3, 0.2, 0.55, 0.6) + grime([10, -6, 38, 6], 4, '#3A3A1E', c.seed + 5, 2.4, 0.35);
    let s = shade(d, p, Z, { lw: 1.2, inner });
    s += shade(d, 'M-5,0L-7,-1.4L-6.6,1.6Z', tone('#7A6A3A'), { lw: 0.7, k: 0 });
    for (const [x, y, dx, dy] of [[14, -5.2, -1, -4], [22, -6, 1, -4.4], [30, -5.6, 1.6, -3.6], [26, 6, 0.6, 4], [34, 3.6, 3.4, 2.4], [18, 5.4, -1, 4]] as [number, number, number, number][]) {
      s += line(`M${f(x)},${f(y)}l${f(dx)},${f(dy)}`, 1.5) + line(`M${f(x)},${f(y)}l${f(dx)},${f(dy)}`, 0.7, '#8A6A4A') + circ(x + dx, y + dy, 0.5, '#6A4A2A');
    }
    s += stain(33, 1, 1.4, BLOOD, c.seed + 7, 0.7, 1);
    return s;
  }, { sc });
}

/** A fried drumstick the size of a leg, swung by its bone. */
function drumstickClub(ang: number, sc: number): HandItem {
  const CR = tone('#A06A30', '#7A4A1E');
  return weapon(ang, [-9.5, -10, 35, 10], (c) => {
    const d = c.d;
    const bone = tone('#D6CCAA', '#AEA282');
    let s = shade(d, 'M-6.8,-3.4C-9.4,-4.6 -10.2,-1.6 -8.2,-0.4C-10.2,0.8 -9.4,4 -6.8,2.8L4,1.6L4,-1.8Z', bone, { lw: 0.9 });
    s += shade(d, limb([-6, -0.2], [7, -0.1], 3.2, 3.6), bone, { lw: 0.9, k: 0 });
    const meat = smooth([[5, 0], [8, -5], [16, -8.6], [26, -9], [33, -5.6], [34.6, 0.4], [32, 6.4], [23, 8.8], [13, 7.4], [7, 4.4]]);
    let inner = speck([4, -10, 35, 10], 70, ['#C8944A', '#5A3414', '#D8B068'], c.seed + 3, 0.3, 0.9, 0.75);
    inner += fill('M4,-10H36V-5H4Z', lt(CR.b, 0.25), 'opacity="0.45"') + grime([4, -9, 35, 9], 5, '#4A2A10', c.seed + 5, 2.4, 0.4);
    s += shade(d, meat, CR, { lw: 1.2, inner });
    s += outl('M27,-8.2Q25.6,-5 28.4,-3.4Q31,-2.6 33.2,-5Z', '#B88A7A', 0.7) + line('M28,-6.4l1.4,1.2M29.6,-6.8l1,1.4', 0.4, '#7A4A3A');
    s += drip(14, 7.4, 3, 1.2, GREASE, 0.8);
    return s;
  }, { sc });
}

/** Heavy butcher's cleaver with a rivetted handle. */
function cleaver(ang: number, sc: number): HandItem {
  return weapon(ang, [-6, -6.4, 29, 12.4], (c) => {
    const d = c.d;
    let s = shade(d, 'M-5.6,-2L8,-2.4L8,2.4L-5.6,2Q-6.6,0 -5.6,-2Z', DWOOD, { lw: 1, inner: circ(-2, 0, 0.6, '#B8B4A8') + circ(2, 0, 0.6, '#B8B4A8') + circ(5.6, 0, 0.6, '#B8B4A8') });
    const blade = 'M7.4,-5.4L27.6,-5.6Q28.8,3 27.4,11.6L9,11.2Q7.4,4 7.4,-5.4Z';
    let inner = fill('M7,-6H29V-3.2H7Z', lt(STEEL.b, 0.45), 'opacity="0.6"') + line('M9,-2.6L26.6,-2.8', 0.5, '#6A6E68', 'opacity="0.8"');
    inner += line('M27.4,-4L28,10.6', 1.4, '#D0D4CC', 'opacity="0.7"') + grime([8, -5, 28, 11], 5, '#4A3A2A', c.seed + 3, 2.2, 0.35);
    inner += stain(22, 6, 2.2, BLOOD, c.seed + 5, 0.75, 2) + drip(24, 9, 3, 1.2, BLOOD_D, 0.7);
    s += shade(d, blade, STEEL, { lw: 1.2, inner });
    s += outl(ellD(24.4, -1.6, 1.5, 1.4), '#3A3836', 0.7);
    s += line('M14,11.2l0.6,-1.4l0.8,1.4M19.6,11.4l0.6,-1.2l0.6,1.2', 0.6);
    return s;
  }, { sc });
}

/** A stale baguette, hard as a baseball bat, crust split and floury. */
function baguette(ang: number, sc: number): HandItem {
  const B = tone('#B0844A', '#86602E');
  return weapon(ang, [-7, -5.5, 40, 5.5], (c) => {
    const d = c.d;
    const p = smooth([[-6, 0], [-4.6, -3], [6, -3.8], [20, -4.4], [33, -4.2], [38.6, -2.2], [39.4, 0.8], [36.6, 3.6], [24, 4.2], [10, 4], [-2, 3.4], [-5.6, 2.2]]);
    let inner = fill('M-6,-4.4H40V-2H-6Z', lt(B.b, 0.3), 'opacity="0.55"') + speck([-6, -4, 40, 4], 40, ['#E0D2B0', B.d], c.seed + 11, 0.2, 0.5, 0.6);
    inner += grime([-4, -4, 38, 4], 4, '#5A3A1A', c.seed + 12, 2, 0.3);
    let s = shade(d, p, B, { lw: 1.1, inner });
    // the diagonal scores, split open to pale crumb
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 7;
      const sc2 = `M${f(x)},-2.4C${f(x + 2)},-3.6 ${f(x + 4.6)},-3.2 ${f(x + 5.6)},-1.6C${f(x + 4)},-0.6 ${f(x + 1.6)},-0.8 ${f(x)},-2.4Z`;
      s += outl(sc2, '#D8C49A', 0.6);
    }
    s += fill(ellD(30, 2, 2.4, 1), '#E8E0CC', 'opacity="0.6"') + line('M33,3.2l1.6,-0.4', 0.5, B.d);
    return s;
  }, { sc });
}

/** A carrot pulled up with its leafy top, swung like a club. */
function carrot(ang: number, sc: number): HandItem {
  const O = tone('#A8602A', '#7E441C');
  return weapon(ang, [-11, -6, 30, 6], (c) => {
    const d = c.d;
    let s = '';
    for (const [dx, dy, r] of [[-8, -3.6, -0.5], [-9.4, 0, 0], [-8, 3.4, 0.5]] as [number, number, number][]) {
      s += shade(d, limb([-2, 0], [dx, dy + r * 2], 2.2, 1.2), tone('#5A6A34', '#3E4A22'), { lw: 0.7, k: 0 });
    }
    const p = 'M-3,-3.6C6,-4.6 16,-3.4 29,-0.6C29.6,0 29.6,0.4 29,0.8C16,3.6 6,4.6 -3,3.6C-4.4,2 -4.4,-2 -3,-3.6Z';
    let inner = line('M3,-3.6l0.6,2M9,-3.6l0.4,1.8M15,-2.8l0.4,1.4M6,3.8l0.4,-1.6M12,3.4l0.4,-1.4M19,2l0.3,-1.2', 0.5, O.d);
    inner += fill('M-4,-4H30V-2.2H-4Z', lt(O.b, 0.3), 'opacity="0.5"') + grime([-3, -3, 28, 3], 4, '#4A3A1A', c.seed + 21, 1.8, 0.4);
    s += shade(d, p, O, { lw: 1, inner });
    s += stain(20, 0.4, 1, BLOOD, c.seed + 23, 0.6, 1);
    return s;
  }, { sc });
}

/** A glass diner coffee pot (half full, scalding), held by the handle. */
function coffeePot(ang: number, sc: number): HandItem {
  return weapon(ang, [-2.5, -6.5, 19, 15], (c) => {
    const d = c.d;
    let s = line('M-1,-1.6Q-1.6,4 1,8', 2.2) + line('M-1,-1.6Q-1.6,4 1,8', 1.2, '#2A2622');
    const pot = 'M3,-4.6L12,-4.6L12.6,-1C17,1.6 18.6,6 17.6,10C16.6,13.6 12.6,14.6 8,14.6C3.4,14.6 0,13.4 -0.4,10C-1,6 1,2 3.6,-0.6Z';
    s += fill(pot, '#B8C4BC', 'opacity="0.45"');
    s += inside(d, pot, fill('M-4,4H20V16H-4Z', '#3A2216', 'opacity="0.92"') + fill('M-4,4H20V5.4H-4Z', '#6A4A2A') + fill(ellD(4, 0, 1.4, 3.4), '#E8ECE4', 'opacity="0.55"'));
    s += line(pot, 1);
    s += shade(d, 'M2.4,-6.4L12.8,-6.4L12.6,-3.6L2.8,-3.6Z', tone('#3A3A3A'), { lw: 0.9, k: 0 });
    s += line('M13,-5.6l2.6,0.6', 1.2) + circ(7.6, -7.2, 1, '#2A2A2A');
    s += line('M6,-10q-1.6,-2 0,-4M10,-10q1.6,-2 0,-4', 0.6, '#A8A8A0', 'opacity="0.6"');
    return s;
  }, { sc });
}

/** A two-pronged barbecue fork. */
function bbqFork(ang: number, sc: number): HandItem {
  return weapon(ang, [-6, -4, 32, 4], (c) => {
    const d = c.d;
    let s = shade(d, limb([-5.4, 0], [9, 0], 3.6, 3.2), tone('#4A2A1E'), { lw: 1, inner: line('M-3,-1.2l0,2.4M0,-1.2l0,2.4M3,-1.2l0,2.4', 0.4, '#2A1410') });
    s += line('M8.6,0H20', 2.2) + line('M8.6,0H20', 1.1, '#8A8C86');
    const prongs = 'M19.4,-2.4C24,-2.6 27,-2.2 31,-1.6M19.4,2.4C24,2.6 27,2.2 31,1.6M19.4,-2.4V2.4';
    s += line(prongs, 2) + line(prongs, 0.9, '#9A9C96');
    s += stain(28, -1.6, 0.9, BLOOD, c.seed + 4, 0.85, 1) + circ(31.2, -1.6, 0.4, BLOOD_D) + circ(31.2, 1.6, 0.4, BLOOD_D);
    return s;
  }, { sc });
}

/** A squeeze bottle of hellfire hot sauce. */
function hotSauce(ang: number, sc: number): HandItem {
  const R = tone('#7A2218', '#561812');
  return weapon(ang, [-6, -5, 26, 5], (c) => {
    const d = c.d;
    const p = 'M-5,-4.2L13,-4.2C15,-4.2 16,-2.6 17,-1.6L22,-1L22,1L17,1.6C16,2.6 15,4.2 13,4.2L-5,4.2Q-6,0 -5,-4.2Z';
    let inner = fill('M-6,-4.6H18V-2.6H-6Z', lt(R.b, 0.35), 'opacity="0.55"');
    inner += outl('M0,-4.4H10V4.4H0Z', '#C8BC94', 0.5) + fill('M3,3.2C2,1 4,0 3.6,-2C5.6,-0.6 6.6,1 6,3.2Z', '#A0441E');
    inner += grime([-5, -4, 16, 4], 3, '#2A1A10', c.seed + 3, 1.6, 0.4);
    let s = shade(d, p, R, { lw: 1, inner });
    s += line('M22,0h3.2', 1.4) + line('M22,0h3.2', 0.6, '#C8C2B0');
    s += drip(24.6, 0.6, 3, 1, '#9A2A18', 0.9);
    return s;
  }, { sc });
}

/** Muted fire tongues rising from (x, y); h tall, w wide. */
function flames(x: number, y: number, w: number, h: number, seed: number, o = 0.95): string {
  const r = rnd(seed);
  let s = '';
  const n = 4;
  for (let layer = 0; layer < 3; layer++) {
    const col = ['#7A2A1A', '#A04A22', '#B8803A'][layer];
    const k = 1 - layer * 0.28;
    let dd = `M${f(x - (w / 2) * k)},${f(y)}`;
    for (let i = 0; i < n; i++) {
      const x0 = x - (w / 2) * k + (w * k * i) / n;
      const x1 = x0 + (w * k) / n;
      const tip = y - h * k * (0.55 + r() * 0.45);
      dd += `Q${f(x0 - 0.6)},${f((y + tip) / 2)} ${f(x0 + (x1 - x0) * 0.35)},${f(tip)}Q${f(x1 + 0.4)},${f(y - h * k * 0.3)} ${f(x1)},${f(y - h * k * 0.08)}`;
    }
    dd += `Q${f(x)},${f(y + 2 * k)} ${f(x - (w / 2) * k)},${f(y)}Z`;
    s += layer === 0 ? outl(dd, col, 0.7, `opacity="${f(o)}"`) : fill(dd, col, `opacity="${f(o)}"`);
  }
  return s;
}

/** Scorched oversize spatula with a grease fire burning on the blade. */
function flamingSpatula(ang: number, sc: number): HandItem {
  const a = (ang * Math.PI) / 180;
  const bx = 24.5 * Math.cos(a) * sc;
  const by = 24.5 * Math.sin(a) * sc;
  return weapon(
    ang,
    [-6, -7, 32, 7],
    (c) => {
      const d = c.d;
      const CH = tone('#4A4440', '#2C2826');
      let s = shade(d, limb([-5.4, 0], [15, 0], 3.6, 3), DWOOD, { lw: 1, inner: line('M-3,-0.6l3,0.2M2,-0.4l4,0.2', 0.5, '#2A1A10') + fill('M8,-2H15V2H8Z', '#1A1410', 'opacity="0.55"') });
      s += shade(d, 'M14.4,-1.2L18.6,-1.6L18.6,1.6L14.4,1.2Z', CH, { lw: 0.8, k: 0 });
      const blade = 'M18,-6.4L31,-7Q32.4,0 31,7L18,6.4Z';
      let inner = line('M20.4,-3.6H29.6M20.4,0H29.6M20.4,3.6H29.6', 1.1, '#1A1614') + grime([18, -7, 32, 7], 6, '#1A1410', c.seed + 3, 2.2, 0.6);
      inner += fill(ellD(27, -3, 3, 2), '#7A3A1A', 'opacity="0.45"');
      s += shade(d, blade, CH, { lw: 1.2, inner });
      return s;
    },
    {
      // flames rise straight up whatever the swing at rest: counter-rotated about the blade
      over: (c) => `<g transform="rotate(${f(-ang)} 24.5 0)">${flames(24.5, -4, 14, 16, c.seed + 9)}${line('M22,-22q-2,-3 0.6,-6q2.4,-3 0,-6', 0.9, '#6A6660', 'opacity="0.5"')}</g>`,
      extra: [bx - 9 * sc, by - 36 * sc, bx + 9 * sc, by + 2 * sc],
      sc,
    },
  );
}

// ================================================================== hats
/** Ten-gallon cowboy hat (k scales it about the head band). */
function tenGallon(col: Tone, band: string, k = 1): HatPaint {
  const brim = 'M-35,-99C-31,-92 -20,-85.4 3,-85C26,-85 37,-91 41,-99C35,-96 30,-100.4 22,-101.4C10,-103 -6,-103 -16,-101.4C-24,-100.4 -30,-97 -35,-99Z';
  const crown = 'M-16,-95C-17.4,-104 -16,-116 -11.6,-124C-7.6,-128 -2,-126 2,-122.6C6,-126 13,-128.6 17,-124C21,-116 21.4,-104 20.4,-95C14,-91.6 -10,-91.6 -16,-95Z';
  const paint = (c: Ctx, back: boolean): string => {
    const d = c.d;
    let s = shade(d, brim, col, { lw: 1.2, inner: fill('M-40,-90H44V-84H-40Z', col.d, 'opacity="0.35"') + grime([-34, -104, 40, -84], 6, '#3A2A16', c.seed + 21, 2.6, 0.35) + speck([-34, -104, 40, -84], 30, [col.d, lt(col.b, 0.25)], c.seed + 22, 0.2, 0.5, 0.5) });
    s += line('M-33,-97.6C-26,-95 -14,-94.6 0,-95M28,-95.4C33,-95.6 36,-96.4 39,-98', 0.5, col.d, 'opacity="0.8"');
    let ci = fold('M2,-122.6Q2.6,-110 2,-96M-9,-120Q-11,-108 -10,-96M13,-121Q14,-108 13.4,-96', col.s, 0.7);
    ci += fill('M-20,-110H24V-92H-20Z', col.s, 'opacity="0.25"') + grime([-18, -128, 22, -92], 5, '#3A2A16', c.seed + 23, 3, 0.35) + speck([-18, -128, 22, -92], 30, [col.d, lt(col.b, 0.2)], c.seed + 24, 0.2, 0.5, 0.5);
    ci += stain(10, -112, 1.8, '#3A2A16', c.seed + 25, 0.45, 0) + fill(ellD(-8, -118, 3, 4), lt(col.b, 0.3), 'opacity="0.4"');
    s += shade(d, crown, col, { lw: 1.2, inner: ci });
    s += shade(d, 'M-16.4,-99.6C-10,-96.2 14,-96.2 20.6,-99.6L20.6,-95.2C14,-91.8 -10,-91.8 -16.2,-95.2Z', tone(band), { lw: 0.9, inner: stain(0, -96, 2.6, '#1A1410', c.seed + 26, 0.4, 0) });
    if (!back) s += outl(ellD(9, -95.8, 2, 1.8), '#9A9488', 0.6) + circ(8.6, -96.3, 0.6, '#D0CCC0');
    s += outl(ellD(-10.6, -114, 1.2, 1.1), '#1A1410', 0.5) + line('M-11.8,-115.4l-0.8,-0.8M-9.4,-112.8l0.8,0.6', 0.5);
    return k === 1 ? s : `<g transform="translate(2 -94) scale(${f(k)}) translate(-2 94)">${s}</g>`;
  };
  return { front: (c) => paint(c, false), back: (c) => paint(c, true) };
}

/** A very tall pleated toque (Le Snob). */
function tallToque(): HatPaint {
  const Wt = tone('#D8D2BE', '#AEA690');
  const top = (x0: number) =>
    `M${f(-16 + x0)},-92L${f(-17.6 + x0)},-124C${f(-25 + x0)},-126 ${f(-27 + x0)},-136 ${f(-20 + x0)},-140C${f(-16 + x0)},-148 ${f(-3 + x0)},-149 ${f(3 + x0)},-143C${f(9 + x0)},-149 ${f(23 + x0)},-147 ${f(24 + x0)},-138C${f(30 + x0)},-132 ${f(27 + x0)},-124 ${f(21 + x0)},-123L${f(20 + x0)},-92Z`;
  const paint = (c: Ctx, back: boolean): string => {
    const x0 = back ? -1 : 0;
    let inner = fold(`M${f(-10 + x0)},-124Q${f(-9 + x0)},-108 ${f(-9 + x0)},-93M${f(-2 + x0)},-126Q${f(-1 + x0)},-108 ${f(-1 + x0)},-93M${f(6 + x0)},-126Q${f(7 + x0)},-108 ${f(7 + x0)},-93M${f(14 + x0)},-124Q${f(15 + x0)},-108 ${f(14 + x0)},-93`, Wt.s, 0.7);
    inner += fold(`M${f(-16 + x0)},-131Q${f(-6 + x0)},-127 ${f(4 + x0)},-132Q${f(14 + x0)},-127 ${f(22 + x0)},-132`, Wt.s, 0.6);
    inner += grime([-22, -148, 28, -90], 6, '#7A6236', c.seed + 2, 3, 0.25) + stain(12 + x0, -112, 1.6, BLOOD, c.seed + 4, 0.5, 1) + speck([-22, -148, 28, -90], 20, [Wt.s], c.seed + 3, 0.2, 0.5, 0.4);
    let s = shade(c.d, top(x0), Wt, { inner });
    s += shade(c.d, `M${f(-18 + x0)},-93C${f(-10 + x0)},-96 ${f(12 + x0)},-96.6 ${f(21 + x0)},-93.6L${f(21.4 + x0)},-86.6C${f(12 + x0)},-89.6 ${f(-10 + x0)},-89.2 ${f(-18.4 + x0)},-85.6Z`, Wt, { lw: 1.1, inner: line(`M${f(-18 + x0)},-89.6Q${f(2 + x0)},-93 ${f(21 + x0)},-90`, 0.45, Wt.s) });
    return s;
  };
  return { front: (c) => paint(c, false), back: (c) => paint(c, true) };
}

/** Folded paper soda-jerk cap with a printed stripe (Hank's). */
function paperHat(stripe: string): HatPaint {
  const P = tone('#D6D0BA', '#ACA48C');
  return {
    front: (c) => {
      const cap = 'M-19,-91.6C-12,-95.4 10,-97 22,-93.4L19.6,-104.4C14,-108.4 -6,-109 -15,-103.6Z';
      let s = shade(c.d, cap, P, { lw: 1.1, inner: fill('M-24,-99H26V-96.6H-24Z', stripe, 'opacity="0.9"') + line('M-17,-102.4Q2,-106.4 20,-101.6', 0.5, P.s) + grime([-19, -109, 22, -91], 4, GREASE, c.seed + 31, 2.6, 0.45) });
      s += line('M-19,-91.6C-12,-95.4 10,-97 22,-93.4', 1.2) + line('M-15,-103.6Q2,-110.4 19.6,-104.4', 0.6, P.d);
      s += outl(ellD(6, -101.4, 3.2, 2), '#A8402E', 0.5) + line('M4.4,-101.4h3.2', 0.5, '#E0D8C0');
      s += stain(-9, -97, 1.4, KETCHUP, c.seed + 33, 0.7, 1);
      return s;
    },
    back: (c) => {
      const cap = 'M-21,-92.6C-12,-96 10,-96.8 21,-93L18.6,-104C12,-108.4 -8,-109 -17,-103.8Z';
      return shade(c.d, cap, P, { lw: 1.1, inner: fill('M-24,-99.6H26V-97.2H-24Z', stripe, 'opacity="0.9"') + grime([-19, -109, 22, -91], 4, GREASE, c.seed + 31, 2.6, 0.45) }) + line('M-17,-103.8Q0,-110.6 18.6,-104', 0.6, P.d);
    },
  };
}

/** Paper cap with a floppy red rubber chicken comb and a little beak (Crunch's). */
function combHat(): HatPaint {
  const P = tone('#D6D0BA', '#ACA48C');
  const R = tone('#8E2A24', '#661A16');
  const comb = (x0: number) =>
    `M${f(-10 + x0)},-101C${f(-14 + x0)},-106 ${f(-11 + x0)},-111 ${f(-6.4 + x0)},-108.6C${f(-6 + x0)},-115 ${f(1 + x0)},-116 ${f(2.4 + x0)},-110.6C${f(5 + x0)},-116 ${f(12 + x0)},-114 ${f(10.4 + x0)},-108C${f(15 + x0)},-108.6 ${f(16 + x0)},-103 ${f(12.6 + x0)},-101Z`;
  return {
    front: (c) => {
      let s = shade(c.d, comb(0), R, { lw: 1.1, inner: speck([-14, -116, 16, -100], 14, [R.d, lt(R.b, 0.25)], c.seed + 41, 0.3, 0.6, 0.6) + line('M-4,-103l-1,-4M3,-103v-5M9,-103l1,-4', 0.5, R.d) });
      const cap = 'M-19.6,-90.6C-12,-94 10,-95.4 22.4,-92.4L21,-101.6C12,-104.6 -6,-105 -16.6,-101.2Z';
      s += shade(c.d, cap, P, { lw: 1.1, inner: fill('M-24,-97.4H26V-95.4H-24Z', R.b) + grime([-19, -105, 22, -90], 4, GREASE, c.seed + 42, 2.6, 0.45) });
      s += shade(c.d, 'M21,-99.6L26.6,-97.4L21.6,-95.2Z', tone('#B0882E'), { lw: 0.8, k: 0 });
      return s;
    },
    back: (c) => {
      let s = shade(c.d, comb(-2), R, { lw: 1.1 });
      s += shade(c.d, 'M-21,-91.6C-12,-95 10,-95.4 21,-92.4L19.6,-101.6C12,-104.6 -8,-105 -18,-101.2Z', P, { lw: 1.1, inner: fill('M-24,-97.8H26V-95.8H-24Z', R.b) + grime([-19, -105, 22, -90], 4, GREASE, c.seed + 42, 2.6, 0.45) });
      return s;
    },
  };
}

/** Hairnet stretched over whatever hair is underneath (mesh clipped to a dome). */
function hairnet(top = -102, back = false): (c: Ctx) => string {
  return (c) => {
    const dome = back
      ? `M-21,-78C-23,-92 -13,${f(top)} 1,${f(top)}C14,${f(top)} 22.6,-94 21.6,-80C12,-82.4 -12,-82 -21,-78Z`
      : `M-20.6,-79C-22,-93 -12,${f(top)} 2,${f(top)}C14,${f(top)} 22,-95 21.4,-87.6C14,-89.4 -4,-88.6 -9,-84.6C-13,-81.6 -17,-79.6 -20.6,-79Z`;
    let mesh = '';
    for (let k = -40; k < 40; k += 2.6) mesh += `M${f(k)},-70L${f(k + 30)},${f(top - 4)}M${f(k)},${f(top - 4)}L${f(k + 30)},-70`;
    let s = inside(c.d, dome, line(mesh, 0.35, '#2A2420', 'opacity="0.55"') + fill(dome, '#4A4436', 'opacity="0.12"'));
    s += line(back ? 'M-21,-78C-12,-82 12,-82.4 21.6,-80' : 'M21.4,-87.6C14,-89.4 -4,-88.6 -9,-84.6C-13,-81.6 -17,-79.6 -20.6,-79', 1.1, '#3A3428');
    return s;
  };
}

/** Do-rag bandana with a muted flame print, knotted at the back, smouldering (Chef Inferno). */
function flameBandana(): HatPaint {
  const B = tone('#4E1A16', '#34100E');
  const print = (c: Ctx, y: number) => {
    let s = '';
    for (let i = 0; i < 6; i++) s += flames(-18 + i * 7.6, y, 7, 7 + (i % 3) * 2.4, c.seed + i * 7, 0.85);
    return s;
  };
  const smoke = (x: number) =>
    line(`M${f(x)},-104q-3,-4 0,-8q3,-4 0,-8q-2.6,-3 -0.4,-6.4`, 1.6, '#6A6660', 'opacity="0.35"') + line(`M${f(x + 7)},-103q3,-3.6 0.4,-7q-2.6,-3.6 0.4,-7`, 1.2, '#6A6660', 'opacity="0.3"');
  return {
    front: (c) => {
      const cap = 'M-20.6,-79C-23,-95 -12,-104.6 2,-104.6C15,-104.6 23.4,-96 22.6,-86C14,-90.6 -6,-90 -12,-85.6C-15,-83 -18,-80.6 -20.6,-79Z';
      let s = shade(c.d, 'M-20,-84C-26,-82 -29,-78 -29,-73L-25.4,-72.4C-25.4,-76 -23,-79.6 -19.4,-80.6ZM-20,-82C-24,-77 -24.6,-71 -23,-66L-19.6,-66.8C-20.4,-71 -19.6,-76 -18,-80Z', B, { lw: 0.9 });
      s += shade(c.d, cap, B, { inner: print(c, -85) + grime([-22, -105, 24, -80], 5, '#1A0C0A', c.seed + 51, 2.6, 0.45) + speck([-22, -105, 24, -80], 30, ['#1A0C0A', '#7A3A2A'], c.seed + 52, 0.2, 0.5, 0.5) });
      s += line('M22.6,-86C14,-90.6 -6,-90 -12,-85.6', 1.2) + outl(ellD(-20, -82.6, 2.4, 2.2), B.s, 0.9);
      s += outl(ellD(8, -99, 1.4, 1), '#1A0C0A', 0.5) + line(ellD(8, -99, 2, 1.6), 0.5, '#B8803A', 'opacity="0.6"');
      return s + smoke(-4);
    },
    back: (c) => {
      const cap = 'M-21.6,-78C-23.6,-94 -13,-104.6 1,-104.6C14,-104.6 22.6,-96 21.6,-80C14,-83 -12,-82.4 -21.6,-78Z';
      let s = shade(c.d, cap, B, { inner: print(c, -80) + grime([-22, -105, 24, -78], 5, '#1A0C0A', c.seed + 51, 2.6, 0.45) });
      s += shade(c.d, 'M-2,-82C-6,-78 -7,-72 -5.4,-66L-2,-66.6C-3,-71 -2.6,-76 0.4,-80ZM0,-82C2,-77 4,-73 7,-70L9.4,-72.4C6.6,-75 4.6,-78 2.6,-82Z', B, { lw: 0.9 }) + outl(ellD(-0.6, -81.4, 2.6, 2.2), B.s, 0.9);
      return s + smoke(-2);
    },
  };
}

// ================================================================== hair
/** Thick rope dreadlocks under a knitted band (Vera's waitress). */
function dreads(t: Tone, bandCol: Tone): HairSet {
  const rope = (c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, i: number) => {
    const p = limb([x0, y0], [x1, y1], w, w * 0.8);
    let inner = '';
    for (let k = 1; k < 7; k++) {
      const t0 = k / 7;
      const x = x0 + (x1 - x0) * t0;
      const y = y0 + (y1 - y0) * t0;
      inner += line(`M${f(x - w / 2)},${f(y - 0.6)}q${f(w / 2)},1.2 ${f(w)},0`, 0.45, t.d, 'opacity="0.85"');
    }
    let s = shade(c.d, p, t, { lw: 1, inner, off: [-0.6, -0.6] });
    if (i % 3 === 1) s += outl(ellD(x0 + (x1 - x0) * 0.62, y0 + (y1 - y0) * 0.62, w * 0.62, 1.2), '#9A7A4A', 0.5);
    return s;
  };
  const band = (c: Ctx, back: boolean) =>
    shade(c.d, back ? 'M-22,-88C-12,-92.6 10,-93 21.6,-89.6L21.6,-84C10,-87.6 -12,-87 -22,-82.6Z' : 'M-19.6,-90.4C-12,-94 10,-95 22.6,-91.4L22.8,-86C10,-89.8 -12,-89.2 -19.8,-85Z', bandCol, {
      lw: 1,
      inner: line(back ? 'M-22,-87H22' : 'M-20,-88.6Q2,-92.4 22.6,-89', 0.9, '#7A6A3A', 'opacity="0.7"') + line(back ? 'M-22,-85H22' : 'M-20,-86.6Q2,-90.4 22.6,-87', 0.9, '#4E6A5A', 'opacity="0.6"'),
    });
  return {
    hairBehind: (c) => {
      let s = '';
      const R: [number, number, number, number, number][] = [[-16, -86, -24, -50, 4.6], [-10, -90, -18, -46, 4.8], [-4, -92, -12, -48, 4.6], [-18, -78, -26, -56, 4.2]];
      R.forEach((r, i) => (s += rope(c, r[0], r[1], r[2], r[3], r[4], i)));
      return s;
    },
    hairFront: (c) => {
      const cap = 'M-7,-69C-6.4,-78 -3,-86 4,-87.6C10,-89 16,-89 21.4,-87C19,-97 10,-101.6 1,-101.6C-12,-101.6 -20.6,-93 -21.6,-80C-22,-72 -20,-66 -17,-62Z';
      let s = shade(c.d, cap, t, { off: [-1.6, -1.6], inner: line('M-2,-99Q-8,-92 -12,-80M6,-100Q2,-94 -2,-87M-12,-96Q-18,-88 -18,-72', 0.6, t.d) + speck([-22, -102, 22, -62], 30, [t.d, lt(t.b, 0.2)], c.seed + 5, 0.2, 0.5, 0.5) });
      s += rope(c, -9, -74, -11, -50, 4.2, 1) + rope(c, -14, -72, -17, -52, 4, 2);
      return s + band(c, false);
    },
    hairBack: (c) => {
      const cap = 'M-18,-62C-8,-64 4,-64 10.6,-63C10.8,-70 11,-76 13.6,-80C17,-84 20,-86 20.6,-89C17,-98 8,-101 1,-101C-11,-101 -20,-93 -20.6,-80C-21,-72 -20,-66 -18,-62Z';
      let s = shade(c.d, cap, t, { off: [-1.6, -1.6], inner: speck([-22, -102, 22, -62], 30, [t.d], c.seed + 5, 0.2, 0.5, 0.5) });
      const R: [number, number, number, number, number][] = [[-16, -84, -20, -48, 4.6], [-9, -86, -11, -46, 4.8], [-2, -86, -3, -47, 4.6], [5, -84, 6, -49, 4.4], [10, -80, 12, -54, 4]];
      R.forEach((r, i) => (s += rope(c, r[0], r[1], r[2], r[3], r[4], i)));
      return s + band(c, true);
    },
  };
}

/** A curly kale leaf. */
function kale(c: Ctx, x: number, y: number, rot: number, sc = 1, seed = 1): string {
  const K = tone('#3E5A36', '#2A4024');
  const p = jag(0, 0, 4.6, 2.8, c.seed + seed, 11, 0.32);
  let s = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(sc)})">`;
  s += shade(c.d, p, K, { lw: 0.8, off: [-0.5, -0.5], inner: speck([-5, -3, 5, 3], 8, ['#5A7A4A'], c.seed + seed, 0.3, 0.6, 0.7) });
  s += line('M-4.6,0.4Q0,-0.4 4.2,0.2', 0.5, '#8AA070') + line('M-6.6,0.8L-4.4,0.4', 0.9, '#5A7A4A');
  return s + '</g>';
}

/** Frizzy wild hair with kale stuck in it and a pencil through the bun (Vegan Vera). */
function kaleHair(t: Tone): HairSet {
  const base = H.perm(t);
  return {
    hairBehind: base.hairBehind,
    hairBackBehind: base.hairBackBehind,
    hairFront: (c, e) => (base.hairFront ? base.hairFront(c, e) : '') + kale(c, -12, -104, -40, 1.2, 3) + kale(c, 10, -108, 15, 1.1, 5) + kale(c, -22, -90, -100, 1, 7) + line('M18,-100.4l3.4,-4', 1.2, '#7A6A3A'),
    hairBack: (c) => (base.hairBack ? base.hairBack(c) : '') + kale(c, -6, -106, -20, 1.2, 3) + kale(c, 12, -100, 30, 1, 9),
  };
}

/** A towering bottle-blonde beehive under a hairnet (Hank's waitress). */
function beehive(t: Tone): HairSet {
  const hive = 'M-7,-69C-6,-78 -3,-86 4,-88C11,-90 17,-90 21.6,-88C24,-96 22,-106 16,-113C10,-120 -4,-121 -12,-114C-20,-107 -22,-94 -21.6,-82C-21.4,-74 -20,-67 -17,-62Z';
  const hiveB = 'M-18,-62C-8,-64 4,-64 10.6,-63C11,-70 12,-76 14.6,-80C20,-88 23,-100 18,-111C12,-121 -6,-122 -14,-113C-21,-105 -22.6,-90 -21.6,-78C-21,-70 -20,-66 -18,-62Z';
  return {
    hairFront: (c) => hairMass(c, hive, t, 'M-4,-118Q-14,-104 -16,-80M6,-118Q2,-104 -2,-88M14,-112Q16,-100 18,-90') + line('M-12,-112Q-2,-104 14,-110M-16,-102Q0,-94 18,-100M-18,-90Q-6,-86 6,-88', 0.6, t.d) + hairnet(-121)(c) + line('M16,-104l6,-6', 1.6) + line('M16,-104l6,-6', 0.9, '#B8963E'),
    hairBack: (c) => hairMass(c, hiveB, t, 'M-4,-118Q-14,-104 -16,-70M6,-118Q8,-100 6,-66M14,-112Q18,-96 12,-70') + line('M-16,-108Q0,-100 16,-108M-18,-96Q0,-88 18,-96', 0.6, t.d) + hairnet(-122, true)(c),
  };
}

// ================================================================== garments
/** Open-front vest (leather / denim) over a shirt, with conchos. */
function openVest(col: Tone, o: { conchos?: boolean; open?: number } = {}): Paint {
  return (c) => {
    const { d, b, back, seed } = c;
    const td = torsoD(b, { flare: 0.6, drop: 1 });
    const x0 = b.hunch;
    let inner = speck([-18, b.tTop, 20, b.tBot + 2], 34, [col.d, lt(col.b, 0.2)], seed + 61, 0.2, 0.5, 0.5) + grime([-16, b.tTop, 18, b.tBot], 5, '#2A1E12', seed + 62, 2.8, 0.3);
    inner += hatch([-16, b.tTop, 18, b.tBot], 30, lt(col.b, 0.3), seed + 63, 1.6, 0.3, 0.35, 0.45);
    inner += fold(`M${f(-b.wTop + 1)},${f(b.shY + 7)}q2.4,1.6 4,1M${f(b.wBot - 2)},${f(b.tBot - 10)}q-2.6,1.4 -5.6,0.8`, col.s, 0.7);
    if (back) return shade(d, td, col, { inner: inner + line(`M-1.6,${f(b.tTop + 3)}V${f(b.tBot)}`, 0.6, col.d) + line(`M${f(-b.wBot + 2)},${f(b.tBot - 6)}H${f(b.wBot - 1)}`, 0.5, col.d, 'stroke-dasharray="1 1"') });
    const op = o.open ?? 4.6;
    const hole = `M${f(-op + x0)},${f(b.tTop - 4)}L${f(2.4 + x0)},${f(b.tBot + 4)}L${f(4.6 + x0)},${f(b.tBot + 4)}L${f(op + 5.4 + x0)},${f(b.tTop - 4)}Z`;
    const id = d.id('m');
    d.def(`<clipPath id="${id}"><path clip-rule="evenodd" d="M-40,-130H40V20H-40Z${hole}"/></clipPath>`);
    let s = `<g clip-path="url(#${id})">${shade(d, td, col, { inner })}</g>`;
    const tx = (xa: number, xb: number, y: number) => xa + ((xb - xa) * (y - b.tTop + 4)) / (b.tBot - b.tTop + 8);
    s += line(`M${f(tx(-op + x0, 2.4 + x0, b.tTop - 0.4))},${f(b.tTop - 0.4)}L${f(tx(-op + x0, 2.4 + x0, b.tBot + 0.6))},${f(b.tBot + 0.6)}M${f(tx(op + 5.4 + x0, 4.6 + x0, b.tTop - 0.4))},${f(b.tTop - 0.4)}L${f(tx(op + 5.4 + x0, 4.6 + x0, b.tBot + 0.6))},${f(b.tBot + 0.6)}`, 1);
    if (o.conchos) {
      for (let i = 0; i < 3; i++) {
        const y = b.shY + 6 + i * 8;
        const x = tx(-op + x0, 2.4 + x0, y) - 2;
        s += outl(ellD(x, y, 1.2, 1.1), '#9A9488', 0.5) + circ(x - 0.3, y - 0.3, 0.35, '#D0CCC0');
      }
    }
    return s;
  };
}

/** Bistro waistcoat: buttoned to the sternum, satin back, a watch chain. */
function waistcoat(col: Tone): Paint {
  return (c) => {
    const { d, b, back, seed } = c;
    const td = torsoD(b, { flare: 0.4, drop: 0.6 });
    const x0 = b.hunch;
    let inner = speck([-18, b.tTop, 20, b.tBot + 2], 26, [col.d, lt(col.b, 0.18)], seed + 71, 0.2, 0.45, 0.45) + grime([-16, b.tTop, 18, b.tBot], 3, '#1A1612', seed + 72, 2.4, 0.3);
    inner += fold(`M${f(-b.wBot + 2.4)},${f(b.tBot - 9)}q3,-1.4 6,-0.6M${f(b.wBot - 2)},${f(b.tBot - 11)}q-2.6,1.4 -5.6,0.8`, col.s, 0.6);
    if (back) return shade(d, td, tone(mix(col.b, '#6A6458', 0.3)), { inner: inner + line(`M-8,${f(b.tBot - 8)}H5`, 1.6, col.d) + outl(`M-2.6,${f(b.tBot - 9.4)}h2.4v2.8h-2.4Z`, '#8A8478', 0.4) });
    const vy = b.shY + 11;
    const hole = `M${f(-4.6 + x0)},${f(b.tTop - 4)}L${f(2.6 + x0)},${f(vy)}L${f(3.6 + x0)},${f(vy)}L${f(9.4 + x0)},${f(b.tTop - 4)}Z`;
    const id = d.id('m');
    d.def(`<clipPath id="${id}"><path clip-rule="evenodd" d="M-40,-130H40V20H-40Z${hole}"/></clipPath>`);
    let s = `<g clip-path="url(#${id})">${shade(d, td, col, { inner })}</g>`;
    s += line(`M${f(-3.6 + x0)},${f(b.tTop)}L${f(3 + x0)},${f(vy)}L${f(8.6 + x0)},${f(b.tTop)}`, 0.9);
    for (let i = 0; i < 4; i++) s += circ(3.6 + x0, vy + 2 + i * 3.6, 0.65, '#8A8478') + line(ellD(3.6 + x0, vy + 2 + i * 3.6, 0.65, 0.65), 0.3);
    s += line(`M${f(3.6 + x0)},${f(vy + 5.6)}Q${f(7 + x0)},${f(vy + 10)} ${f(10 + x0)},${f(b.tBot - 10.6)}`, 0.6, '#A8904A');
    return s;
  };
}

/** Bow tie at the collar (front only). */
function bowTie(col: Tone): Paint {
  return (c) => {
    if (c.back) return '';
    const { d, b } = c;
    const x = 3.4 + b.hunch;
    const y = b.tTop + 1.6;
    let s = shade(d, `M${f(x)},${f(y)}L${f(x - 4.4)},${f(y - 2.6)}L${f(x - 4.8)},${f(y + 2.6)}Z`, col, { lw: 0.8, k: 0 });
    s += shade(d, `M${f(x)},${f(y)}L${f(x + 4)},${f(y - 2.4)}L${f(x + 4.2)},${f(y + 2.4)}Z`, col, { lw: 0.8, k: 0 });
    return s + outl(ellD(x, y, 1.2, 1.3), col.s, 0.6);
  };
}

/** Bootlace string tie with a silver slide (Colonel Crunch). */
function stringTie(): Paint {
  return (c) => {
    if (c.back) return '';
    const x = 3.4 + c.b.hunch;
    const y = c.b.tTop + 1.6;
    let s = line(`M${f(x - 3)},${f(y - 1)}Q${f(x)},${f(y + 2.4)} ${f(x + 3.4)},${f(y - 1)}`, 1.1);
    s += line(`M${f(x - 0.4)},${f(y + 2)}Q${f(x - 1.6)},${f(y + 9)} ${f(x - 1)},${f(y + 15)}M${f(x + 0.6)},${f(y + 2)}Q${f(x + 2)},${f(y + 9)} ${f(x + 1.6)},${f(y + 14)}`, 0.9);
    s += outl(`M${f(x - 2.2)},${f(y + 1)}h4.6l-0.8,3.4h-3Z`, '#A8A49A', 0.5) + circ(x - 1, y + 15.4, 0.6, '#A8A49A') + circ(x + 1.6, y + 14.4, 0.6, '#A8A49A');
    return s;
  };
}

/** A string of yellowed pearls. */
function pearls(): Paint {
  return (c) => {
    const { b, back } = c;
    const x0 = b.hunch;
    let s = '';
    const n = back ? 9 : 13;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = back ? -5 + 12 * t + x0 : -4.6 + 13 * t + x0;
      const y = back ? b.tTop + 0.6 - Math.sin(t * Math.PI) * 1.2 : b.tTop + 0.6 + Math.sin(t * Math.PI) * 5.4;
      s += circ(x, y, 0.85, '#D8D0B4') + line(ellD(x, y, 0.85, 0.85), 0.3) + circ(x - 0.25, y - 0.3, 0.25, '#F0ECDC', 0.9);
    }
    return s;
  };
}

/** Double-breasted chef coat, grubby (painted over the neck stub). */
function chefCoat(col: Tone, o: { stains?: number; dark?: boolean; drop?: number; piping?: string } = {}): Paint {
  return (c) => {
    const { d, b, back, seed } = c;
    const td = torsoD(b, { flare: 0.8, drop: o.drop ?? 3 }, seed);
    const x0 = b.hunch;
    let inner = speck([-20, b.tTop, 22, b.tBot + 6], 36, [col.d, lt(col.b, 0.2)], seed + 3, 0.2, 0.5, 0.4);
    inner += grime([-18, b.tTop, 20, b.tBot + 6], 8, o.dark ? '#1A1410' : '#7A6236', seed + 4, 3.4, 0.3);
    inner += fold(`M${f(-b.wTop + 1)},${f(b.shY + 7)}q2.4,1.6 4,1M${f(-b.wBot + 2)},${f(b.tBot - 6)}q3,-1.6 6,-0.4M${f(b.wBot - 3)},${f(b.tBot - 9)}q-3,1.4 -6,0.6`, col.s, 0.7);
    if (!back) {
      inner += line(`M${f(-5 + x0)},${f(b.tTop + 1)}C${f(1 + x0)},${f(b.shY + 4)} ${f(8 + x0)},${f(b.shY + 12)} ${f(9 + x0)},${f(b.tBot + 3)}`, o.piping ? 1.2 : 0.7, o.piping ?? col.d);
      for (let i = 0; i < 4; i++) {
        const y = b.shY + 4 + i * 6.4;
        inner += circ(1.4 + x0 + i * 0.4, y, 0.9, o.dark ? '#5A5450' : '#E8E4D8') + line(ellD(1.4 + x0 + i * 0.4, y, 0.9, 0.9), 0.4);
        inner += circ(11 + x0 + i * 0.2, y + 1, 0.8, o.dark ? '#4A4440' : '#C8C4B8') + line(ellD(11 + x0 + i * 0.2, y + 1, 0.8, 0.8), 0.4);
      }
    } else inner += fold(`M-1.6,${f(b.tTop + 3)}V${f(b.tBot)}`, col.s, 0.6);
    const r = rnd(seed + 8);
    const n = o.stains ?? 4;
    for (let k = 0; k < n; k++) inner += stain(-8 + r() * 18, b.shY + 6 + r() * 22, 1.2 + r() * 1.6, [BLOOD, GREASE, '#7A3A1E', '#5A4A2A'][k % 4], seed + k * 3, 0.6);
    let s = shade(d, td, col, { inner });
    // standing collar
    s += shade(d, back ? `M${f(-5.4 + x0)},${f(b.tTop + 2.6)}L${f(-5 + x0)},${f(b.tTop - 1.4)}Q${f(1 + x0)},${f(b.tTop - 2.6)} ${f(7 + x0)},${f(b.tTop - 1.4)}L${f(7.4 + x0)},${f(b.tTop + 2.6)}Q${f(1 + x0)},${f(b.tTop + 1.4)} ${f(-5.4 + x0)},${f(b.tTop + 2.6)}Z` : `M${f(-4.6 + x0)},${f(b.tTop + 2.4)}L${f(-4.2 + x0)},${f(b.tTop - 1.6)}Q${f(1.4 + x0)},${f(b.tTop - 2.6)} ${f(7 + x0)},${f(b.tTop - 1.6)}L${f(7.4 + x0)},${f(b.tTop + 2.4)}Q${f(1.4 + x0)},${f(b.tTop + 3.6)} ${f(-4.6 + x0)},${f(b.tTop + 2.4)}Z`, col, { lw: 0.9, k: 0.4 });
    return s;
  };
}

/** Waist apron: tied at the waist, hanging to the knees (bistro). */
function waistApron(col: Tone, len = 9): Paint {
  return (c) => {
    const { d, b, back, seed } = c;
    const wy = b.tBot - 7;
    const bot = b.tBot + len;
    const wL = edgeX(b, wy, -1) - 0.6;
    const wR = edgeX(b, wy, 1) + 0.6;
    if (back) {
      let s = inside(d, torsoD(b), fill(`M-30,${f(wy - 1.2)}H30V${f(wy + 1.2)}H-30Z`, col.b) + line(`M-30,${f(wy - 1.2)}H30M-30,${f(wy + 1.2)}H30`, 0.6));
      s += shade(d, `M-1,${f(wy)}l-3,7l1.6,0l2,-6.4ZM0,${f(wy)}l3,6.6l1.4,-0.6l-3.6,-6Z`, col, { lw: 0.7, k: 0 }) + outl(ellD(-0.4, wy, 1.4, 1.1), col.s, 0.7);
      return s;
    }
    const p = `M${f(wL)},${f(wy)}L${f(wR)},${f(wy)}L${f(wR + 1.6)},${f(bot)}Q${f((wL + wR) / 2)},${f(bot + 1.2)} ${f(wL - 1)},${f(bot)}Z`;
    let inner = speck([wL - 2, wy, wR + 2, bot + 2], 20, [col.d, lt(col.b, 0.2)], seed + 3, 0.2, 0.45, 0.4);
    inner += fold(`M${f(wL + 4)},${f(wy + 3)}q0.6,${f(len)} -0.6,${f(len + 4)}M${f(wR - 3)},${f(wy + 3)}q-0.4,${f(len)} 0.6,${f(len + 4)}`, col.s, 0.7);
    inner += stain(wL + 6, wy + 8, 1.4, '#5A1A24', seed + 4, 0.6, 1) + stain(wR - 4, wy + 12, 1.1, GREASE, seed + 5, 0.5, 1);
    let s = shade(d, p, col, { inner, lw: 1.05 });
    s += line(`M${f(wL - 0.6)},${f(wy + 0.6)}H${f(wR + 0.6)}`, 1.6, col.s) + line(`M${f(wL - 0.6)},${f(wy + 0.6)}H${f(wR + 0.6)}`, 0.5);
    return s;
  };
}

/** Wide red-and-white bucket stripes (inside a shirt, as `extra`), with a sneering hen patch. */
function bucketStripes(red: string): (c: Ctx) => string {
  return (c) => {
    const { b, back } = c;
    let s = '';
    for (let x = -22; x < 26; x += 6.4) s += fill(`M${f(x)},${f(b.tTop - 2)}h3.2V${f(b.tBot + 6)}h-3.2Z`, red, 'opacity="0.9"');
    if (!back) {
      const x = -6 + b.hunch;
      const y = b.shY + 7;
      s += outl(ellD(x, y, 3.6, 3.6), '#D8D0B8', 0.6) + fill(`M${f(x - 1.6)},${f(y - 1.6)}q0.6,-2.4 1.6,-0.8q0.8,-2 1.6,0Z`, red) + fill(`M${f(x + 1.4)},${f(y)}l2,0.6l-2,0.6Z`, '#B0882E') + circ(x + 0.4, y - 0.4, 0.45, INK);
    }
    return s;
  };
}

/** Ketchup / mustard / grease splatter on a uniform. */
function splats(n: number, cols: string[] = [KETCHUP, KETCHUP, MUSTARD, GREASE]): Paint {
  return (c) => {
    const r = rnd(c.seed + (c.back ? 300 : 200));
    let s = '';
    for (let k = 0; k < n; k++) {
      const x = -10 + r() * 20;
      const y = c.b.shY + 4 + r() * (c.b.tBot - c.b.shY - 6);
      const col = cols[k % cols.length];
      s += stain(x, y, 1 + r() * 1.5, col, c.seed + k * 17, 0.75, 2);
      if (k % 2 === 0) s += drip(x + 0.3, y + 1, 2 + r() * 2.6, 0.9, col, 0.7);
    }
    return inside(c.d, torsoD(c.b, { drop: 3 }), s);
  };
}

/** A name tag pinned to the chest. */
function nameTag(col: string): Paint {
  return (c) => (c.back ? '' : outl(`M${f(-8 + c.b.hunch)},${f(c.b.shY + 5)}h6v3.2h-6Z`, '#D8D2BC', 0.5) + fill(`M${f(-8 + c.b.hunch)},${f(c.b.shY + 5)}h6v1h-6Z`, col) + line(`M${f(-7 + c.b.hunch)},${f(c.b.shY + 7.4)}h3.6`, 0.45, '#3A3430'));
}

/** Faded flame tattoos licking up the forearm (lower-arm frame: elbow at the origin). */
function flameTattoo(c: Ctx, w: Pt): string {
  const ink = '#4A2A22';
  let s = '';
  for (let i = 0; i < 3; i++) {
    const t = (i + 0.5) / 3;
    const x = w[0] * 0.3 - 1.6 + i * 1.6;
    const y = w[1] * (0.9 - t * 0.5);
    s += `<path d="M${f(x - 1)},${f(y + 3)}Q${f(x - 1.6)},${f(y)} ${f(x)},${f(y - 3.6 - (i % 2) * 1.6)}Q${f(x + 0.2)},${f(y)} ${f(x + 1.2)},${f(y + 3)}Z" fill="#7A3A22" opacity="0.55" stroke="${ink}" stroke-width="0.4"/>`;
  }
  void c;
  return s + line(`M-2,${f(w[1] - 4)}q2,0.6 3.6,0`, 0.4, ink, 'opacity="0.7"');
}

/** Thick dark forearm hair. */
function hairyArm(col: string): (c: Ctx, w: Pt) => string {
  return (c, w) => hatch([Math.min(0, w[0]) - 2.6, -1, Math.max(0, w[0]) + 2.6, w[1] - 1], 26, col, c.seed + c.side * 7, 1.1, 1.3, 0.35, 0.85);
}

/** A faded anchor-and-burger tattoo on the forearm (Big Hank). */
function burgerTattoo(c: Ctx, w: Pt): string {
  if (c.side > 0) return hairyArm('#2A2420')(c, w);
  const x = w[0] * 0.5;
  const y = w[1] * 0.45;
  let s = hairyArm('#2A2420')(c, w);
  s += `<g opacity="0.6">${outl(`M${f(x - 2.4)},${f(y)}q2.4,-3 4.8,0Z`, '#7A5A3A', 0.4)}${fill(`M${f(x - 2.6)},${f(y + 0.4)}h5.2v0.8h-5.2Z`, '#4A6A3A')}${outl(`M${f(x - 2.4)},${f(y + 1.4)}h4.8q0,1.4 -2.4,1.4q-2.4,0 -2.4,-1.4Z`, '#7A5A3A', 0.4)}</g>`;
  return s;
}

/** Bead bracelets on the wrist. */
function beads(cols: string[]): (c: Ctx, w: Pt) => string {
  return (_c, w) => {
    let s = '';
    for (let i = 0; i < 6; i++) s += circ(w[0] - 3 + i * 1.2, w[1] - 1.6 + Math.sin(i) * 0.3, 0.75, cols[i % cols.length]) + line(ellD(w[0] - 3 + i * 1.2, w[1] - 1.6 + Math.sin(i) * 0.3, 0.75, 0.75), 0.25);
    return s;
  };
}

/** A tea towel draped over the far forearm (bistro waiter). */
function towel(c: Ctx, w: Pt): string {
  if (c.side < 0) return '';
  const p = `M${f(-4)},${f(w[1] * 0.25)}L${f(4.4)},${f(w[1] * 0.2)}L${f(5)},${f(w[1] * 0.2 + 11)}L${f(-3.6)},${f(w[1] * 0.25 + 12)}Z`;
  return shade(c.d, p, CREAM, { lw: 0.9, inner: line(`M-4,${f(w[1] * 0.25 + 2)}l8.6,-0.2M-4,${f(w[1] * 0.25 + 3.4)}l8.6,-0.2`, 0.7, '#7A2A2A', 'opacity="0.7"') + grime([-4, w[1] * 0.2, 5, w[1] * 0.2 + 12], 2, GREASE, c.seed + 9, 1.6, 0.4) });
}

/** Wrap a leg so its lower segment gets cowboy spurs at the boot heel. */
function withSpurs(leg: LegSet): LegSet {
  return {
    up: leg.up,
    lo: (c) => {
      const L = -c.b.hipY - c.b.thighL;
      const y = L - 3.4;
      let s = leg.lo(c);
      const sx = c.back ? -c.side * 0.2 : -5.6;
      s += line(c.back ? `M${f(sx - 4)},${f(y - 0.6)}h8` : `M${f(sx + 0.6)},${f(y - 0.4)}h2.6`, 1.1, '#5A4A3A');
      const px = c.back ? sx : sx - 1;
      let star = '';
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        star += `M${f(px)},${f(y + 0.4)}l${f(Math.cos(a) * 2)},${f(Math.sin(a) * 2)}`;
      }
      return s + line(star, 0.9) + line(star, 0.45, '#A8A49A') + circ(px, y + 0.4, 0.6, '#A8A49A');
    },
  };
}

/** Wrap a bare-foot leg with leather sandal straps. */
function withSandals(leg: LegSet): LegSet {
  return {
    up: leg.up,
    lo: (c) => {
      const L = -c.b.hipY - c.b.thighL;
      const x = c.back ? -c.side * 0.2 : 0.6;
      let s = leg.lo(c);
      const k = 1.32;
      const strap = c.back ? `M${f(x - 4.4)},${f(L - 3.6)}h8.8M${f(x - 4)},${f(L - 1)}h8` : `M${f(x - 3.4 * k)},${f(L - 4.4 * k)}L${f(x + 2.6 * k)},${f(L - 2.6 * k)}M${f(x + 3 * k)},${f(L - 3 * k)}L${f(x + 5.6 * k)},${f(L - 1.6 * k)}`;
      s += line(strap, 1.8) + line(strap, 1, '#7A5A34');
      s += line(`M${f(x - 4.4 * k)},${f(L + 0.6)}H${f(x + (c.back ? 4.4 : 8) * k)}`, 1.4, '#4A3420');
      return s;
    },
  };
}

// ================================================================== facial hair
function mouthLift(e: Expr): number {
  return e === 'scream' || e === 'chomp' ? -2 : e === 'shock' ? -1 : 0;
}

/** A huge droopy walrus-handlebar moustache (Chef Chuck). */
function bigStache(t: Tone): (c: Ctx, e: Expr) => string {
  return (c, e) => {
    const y = mouthLift(e);
    const Y = (v: number) => f(v + y);
    const p = `M10.6,${Y(-68)}C14,${Y(-69.4)} 20,${Y(-68.8)} 23.4,${Y(-65.4)}C26.6,${Y(-62)} 27.4,${Y(-56.4)} 26,${Y(-51.6)}C24.2,${Y(-54.6)} 21.6,${Y(-58.4)} 17.4,${Y(-59.6)}C14,${Y(-60.4)} 10,${Y(-60)} 7,${Y(-58.8)}C3.6,${Y(-57.4)} 1,${Y(-55)} -1.2,${Y(-51.8)}C-2.2,${Y(-56.6)} -0.2,${Y(-62.4)} 3.4,${Y(-65.2)}C5.8,${Y(-67.2)} 8.4,${Y(-68)} 10.6,${Y(-68)}Z`;
    const inner = hatch([-2, -70 + y, 27, -51 + y], 90, t.d, c.seed + 81, 1.6, 1.6, 0.4, 0.8) + hatch([-2, -70 + y, 27, -51 + y], 40, lt(t.b, 0.3), c.seed + 82, 1.4, 1.8, 0.35, 0.6);
    return shade(c.d, p, t, { lw: 1.1, inner, off: [-1, -1] }) + fill(ellD(22, -55 + y, 1.4, 0.8), '#7A3A1E', 'opacity="0.6"');
  };
}

/** Waxed, twirled handlebar moustache (Le Snob). */
function twirlStache(t: Tone): (c: Ctx, e: Expr) => string {
  return (_c, e) => {
    const y = mouthLift(e);
    const Y = (v: number) => f(v + y);
    const dd = `M11,${Y(-64.6)}C8,${Y(-62.4)} 3.6,${Y(-62.2)} 1,${Y(-64.6)}C-0.8,${Y(-66.4)} 0,${Y(-69)} 2.2,${Y(-68.6)}C3.6,${Y(-68.4)} 3.6,${Y(-66.6)} 2.4,${Y(-66.4)}` +
      `M11,${Y(-64.6)}C14,${Y(-62.8)} 18.6,${Y(-62.8)} 21.4,${Y(-65)}C23.2,${Y(-66.6)} 22.8,${Y(-69.4)} 20.8,${Y(-69)}C19.6,${Y(-68.8)} 19.8,${Y(-67)} 21,${Y(-67)}`;
    return line(dd, 2.4) + line(dd, 1.3, t.b) + line(`M5,${Y(-63.6)}q3,0.6 5.6,-0.6`, 0.4, t.d);
  };
}

/** Pointed devil goatee with a thin moustache (Chef Inferno). */
function devilGoatee(t: Tone): (c: Ctx, e: Expr) => string {
  return (c, e) => {
    const y = mouthLift(e);
    const j = e === 'scream' ? 4.6 : e === 'shock' ? 2.6 : e === 'dazed' ? 1.6 : 0;
    let s = shade(c.d, `M6.6,${f(-57.6 + j)}C9,${f(-56.4 + j)} 13,${f(-56.4 + j)} 15.4,${f(-57.8 + j)}C15.4,${f(-53 + j)} 13,${f(-48 + j)} 10.4,${f(-43.6 + j)}C9.6,${f(-48 + j)} 7.6,${f(-53 + j)} 6.6,${f(-57.6 + j)}Z`, t, { lw: 1, inner: hatch([6, -58 + j, 16, -43 + j], 30, t.d, c.seed + 91, 1.4, 1.5, 0.35, 0.8) });
    const m = `M4,${f(-63.6 + y)}Q10,${f(-66.6 + y)} 18.4,${f(-64.6 + y)}Q20.6,${f(-63.4 + y)} 21,${f(-60.4 + y)}`;
    return s + line(m, 2) + line(m, 1.1, t.b);
  };
}

/** Soot smudges and a burn scar (scorched skin). */
function soot(c: Ctx): string {
  return grime([-14, -96, 22, -56], 6, '#2A2420', c.seed + 95, 3, 0.35) + fill(blob(15, -86, 4, 2.4, c.seed + 96), '#7A4A3A', 'opacity="0.4"') + line('M12.6,-86q2.4,1 4.6,0', 0.5, '#5A3A2A', 'opacity="0.8"');
}

const sideburnsE = (t: Tone, len = 6) => (c: Ctx, _e: Expr) => W.sideburns(t, len)(c);

// ================================================================== fur (beasts)
/** A limb outline with shaggy fur tufts hanging along both sides; round caps on both pivots. */
function furLimbD(p1: Pt, p2: Pt, w1: number, w2: number, seed: number, n = 4, dep = 1.6): string {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const nx = -uy;
  const ny = ux;
  const r1 = w1 / 2;
  const r2 = w2 / 2;
  const r = rnd(seed);
  const at = (t: number, side: number, extra = 0, along = 0): string => {
    const rr = r1 + (r2 - r1) * t + extra;
    return `${f(x1 + (x2 - x1) * t + nx * rr * side + ux * along)},${f(y1 + (y2 - y1) * t + ny * rr * side + uy * along)}`;
  };
  let d = `M${at(0, 1)}`;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    d += `L${at(t - 0.45 / n, 1, dep * (0.6 + r() * 0.6), (L / n) * 0.45)}L${at(t, 1)}`;
  }
  d += `A${f(r2)},${f(r2)} 0 0 0 ${at(1, -1)}`;
  for (let i = n - 1; i >= 0; i--) {
    const t = i / n;
    d += `L${at(t + 0.55 / n, -1, dep * (0.6 + r() * 0.6), (L / n) * 0.45)}L${at(t, -1)}`;
  }
  d += `A${f(r1)},${f(r1)} 0 0 0 ${at(0, 1)}Z`;
  return d;
}

function furInner(box: Box, T: Tone, seed: number, n = 30): string {
  return hatch(box, n, T.d, seed, 1.8, 1.45, 0.45, 0.75) + hatch(box, Math.round(n * 0.6), lt(T.b, 0.25), seed + 1, 1.4, 1.5, 0.4, 0.6);
}

function dimFar(c: Ctx, sil: string[]): string {
  return c.near ? '' : `<g opacity="0.16">${sil.map((p) => fill(p, INK)).join('')}</g>`;
}

/** Furry arms with clawed zombie hands; an optional torn shirt sleeve on the upper arm. */
function furArm(T: Tone, o: { bulk?: number; sleeve?: Tone; claws?: string } = {}): ArmSet {
  const up: Paint = (c) => {
    const A = c.b.armW * (o.bulk ?? 1);
    const E = elbowAt(c.b, c.side);
    const p = furLimbD([0, 0], E, A * 0.95, A * 0.86, c.seed + c.side * 3, 3, 1.4);
    let s = shade(c.d, p, T, { off: [-1, -1], inner: furInner([-A, -A, A, E[1] + A], T, c.seed + 11 + c.side) });
    const sil = [p];
    if (o.sleeve) {
      const sl = tube([0, 0], [E[0] * 0.45, E[1] * 0.45], A + 0.6, A + 1.2, 2, c.seed + c.side * 5);
      s += shade(c.d, sl, o.sleeve, { inner: W.plaid([-A, -A, A, E[1]], dk(o.sleeve.b, 0.55), lt(o.sleeve.b, 0.35), 3.2) });
      sil.push(sl);
    }
    if (c.z) s += stain(-A * 0.1, E[1] * 0.6, 1.2, BLOOD, c.seed + 41 + c.side, 0.6, 1);
    return s + dimFar(c, sil);
  };
  const lo: Paint = (c) => {
    const A = c.b.armW * (o.bulk ?? 1);
    const Wp = wristAt(c.b, c.side);
    const p = furLimbD([0, 0], Wp, A * 0.86, A * 0.7, c.seed + c.side * 7, 3, 1.5);
    let s = shade(c.d, p, T, { off: [-0.9, -0.9], inner: furInner([-A, -A, A, Wp[1] + 2], T, c.seed + 21 + c.side, 22) });
    // the hand (zombie skin) with hooked claws
    let hs = hand(c, Wp);
    const [x, y] = Wp;
    const cl = o.claws ?? '#2A2418';
    for (const [dx, dy] of [[-2.2, 7.4], [-0.5, 8.3], [1.1, 7.9]] as Pt[]) hs += `<path d="M${f(x + dx - 0.7)},${f(y + dy - 0.4)}Q${f(x + dx)},${f(y + dy + 2.2)} ${f(x + dx + 1.1)},${f(y + dy + 2.4)}Q${f(x + dx + 0.4)},${f(y + dy + 0.8)} ${f(x + dx + 0.7)},${f(y + dy - 0.4)}Z" fill="${cl}" stroke="${INK}" stroke-width="0.35"/>`;
    s += `<g transform="translate(${f(x)} ${f(y)}) scale(${HAND_S}) translate(${f(-x)} ${f(-y)})">${hs}</g>`;
    // a fur cuff over the wrist
    s += shade(c.d, jag(x, y - 0.6, A * 0.5, 2.2, c.seed + 31 + c.side, 7, 0.3), T, { lw: 0.8, k: 0 });
    return s + dimFar(c, [p, ellD(x, y + 5, 3 * HAND_S, 4.4 * HAND_S)]);
  };
  return { up, lo, items: {} };
}

/** Furry legs ending in a giant bare zombie foot (Big Foot-Long) or a clawed paw (Werewoof). */
function furLeg(T: Tone, o: { foot: 'big' | 'paw'; shorts?: Tone }): LegSet {
  const up: Paint = (c) => {
    const K = kneeAt(c.b, c.side);
    const Wd = c.b.legW;
    const p = furLimbD([0, 0], K, Wd, Wd * 0.94, c.seed + c.side * 13, 3, 1.4);
    let s = shade(c.d, p, T, { off: [-1, -1], inner: furInner([-Wd, -Wd, Wd, K[1] + Wd], T, c.seed + 51 + c.side) });
    const sil = [p];
    if (o.shorts) {
      const sh = tube([0, 0], [K[0] * 0.7, K[1] * 0.7], Wd + 1.4, Wd + 2, 2, c.seed + c.side * 9);
      s += shade(c.d, sh, o.shorts, { inner: speck([-Wd, -Wd, Wd, K[1]], 12, [o.shorts.d, lt(o.shorts.b, 0.2)], c.seed + 7, 0.25, 0.5, 0.4) + fold(`M${f(-Wd * 0.4)},${f(K[1] * 0.4)}q${f(Wd * 0.4)},1 ${f(Wd * 0.8)},0`, o.shorts.s, 0.7) });
      sil.push(sh);
    }
    return s + dimFar(c, sil);
  };
  const lo: Paint = (c) => {
    const L = -c.b.hipY - c.b.thighL;
    const Wd = c.b.legW;
    const big = o.foot === 'big';
    const p = furLimbD([0, 0], [0, L - 4], Wd * 0.94, Wd * 0.8, c.seed + c.side * 17, 3, 1.5);
    let s = shade(c.d, p, T, { off: [-0.9, -0.9], inner: furInner([-Wd, -Wd, Wd, L], T, c.seed + 61 + c.side, 22) });
    const sk = c.sk;
    const k = big ? 1.55 : 1.15;
    const P = (px: number, py: number) => `${f(px * k + (c.back ? 0 : 0.6))},${f(L + py * k)}`;
    let foot = '';
    if (!c.back) {
      const fp = `M${P(-5, 0.3)}L${P(9.4, 0.3)}C${P(11.6, 0.3)} ${P(12, -2.4)} ${P(10.2, -3.4)}C${P(7.4, -4.4)} ${P(4.6, -4.8)} ${P(2.6, -6)}L${P(-3.6, -6.2)}C${P(-5.6, -4.6)} ${P(-6, -1.8)} ${P(-5, 0.3)}Z`;
      foot += shade(c.d, fp, sk, { lw: 1.1, off: [-0.7, -0.7], inner: fill(`M-40,${f(L - 0.8 * k)}H40V${f(L + 4)}H-40Z`, sk.d, 'opacity="0.45"') + grime([-8, L - 6 * k, 14 * k, L], 3, '#3A3018', c.seed + 71, 1.6, 0.4) });
      // toes and black nails
      for (let i = 0; i < 4; i++) {
        const tx = 10.4 - i * 1.9;
        const ty = -1.4 - i * 0.5;
        foot += line(`M${P(tx - 0.6, ty - 1.6)}q0.6,1.2 0.2,2.6`, 0.5, sk.d);
        if (big) foot += fill(ellD(+P(tx + 0.6, ty).split(',')[0], +P(tx + 0.6, ty).split(',')[1], 0.9, 0.6), '#2A2418');
        else foot += `<path d="M${P(tx + 0.4, ty - 0.6)}l${f(2.2 * k * 0.6)},${f(1 * k * 0.6)}l${f(-1.8 * k * 0.6)},${f(0.8 * k * 0.6)}Z" fill="#2A2418" stroke="${INK}" stroke-width="0.3"/>`;
      }
      if (c.z) foot += stain(+P(2, -2).split(',')[0], +P(2, -2).split(',')[1], 1.2, SLIME, c.seed + 72, 0.6, 1);
    } else {
      const hp = `M${P(-5, 0.3)}L${P(5, 0.3)}C${P(6.4, -1.2)} ${P(5.6, -5)} ${P(3.6, -6)}L${P(-3.6, -6.2)}C${P(-5.4, -5)} ${P(-6, -1.8)} ${P(-5, 0.3)}Z`;
      foot += shade(c.d, hp, sk, { lw: 1.1, off: [-0.6, -0.6], inner: fill(`M-40,${f(L - 1.2 * k)}H40V${f(L + 4)}H-40Z`, sk.d, 'opacity="0.5"') });
    }
    s += foot;
    // fur spilling over the top of the foot
    s += shade(c.d, jag(c.back ? 0 : 1.2, L - 5.6 * k, Wd * 0.6, 2.6, c.seed + 81 + c.side, 8, 0.35), T, { lw: 0.9, k: 0 });
    return s + dimFar(c, [p]);
  };
  return { up, lo };
}

// ================================================================== Big Foot-Long
const BF_FUR = tone('#6E4E36', '#4E3624', '#2E2016');
const BF_SKIN = tone('#7E8A62', '#5E6A48', '#3E4830');
const BUN = tone('#B08048', '#86602E');

/** Sasquatch torso as the sausage in a giant hot-dog bun, with a mustard zigzag and relish. */
const bigfootTorso: Paint = (c) => {
  const { d, b, back, seed } = c;
  const td = torsoD(b, { drop: 1 });
  // fur neck stub
  let s = shade(d, `M${f(-5 + b.hunch)},${f(b.neckY - 6)}H${f(7 + b.hunch)}V${f(b.tTop + 5)}H${f(-5 + b.hunch)}Z`, BF_FUR, { lw: 1, k: 0 });
  s += shade(d, td, BF_FUR, { inner: furInner([-24, b.tTop, 30, b.tBot + 2], BF_FUR, seed + 3, 70) + fill(ellD(4, b.shY + 14, 8, 10), mix(BF_FUR.b, '#8A3A2A', 0.25), 'opacity="0.45"') });
  // bun halves along both sides
  const half = (x1: number, y1: number, x2: number, y2: number, w1: number, w2: number, sd: number) => {
    const p = limb([x1, y1], [x2, y2], w1, w2);
    let inner = fill(ellD(x1 - sd * 1.4, (y1 + y2) / 2, w1 * 0.3, Math.abs(y2 - y1) * 0.45), lt(BUN.b, 0.3), 'opacity="0.55"');
    inner += line(`M${f(x1 + sd * w1 * 0.36)},${f(y1)}L${f(x2 + sd * w2 * 0.36)},${f(y2)}`, 2.4, '#D8C69A', 'opacity="0.85"');
    inner += speck([Math.min(x1, x2) - w1, y1 - w1, Math.max(x1, x2) + w1, y2 + w2], 22, [BUN.d, '#E0C890'], seed + 5 + sd, 0.25, 0.6, 0.55);
    inner += grime([Math.min(x1, x2) - w1, y1, Math.max(x1, x2) + w1, y2], 3, '#4A3018', seed + 7 + sd, 2.4, 0.35);
    return shade(d, p, BUN, { lw: 1.2, inner });
  };
  const bel = b.belly;
  if (!back) {
    s += half(-b.wTop - 1.4, b.shY + 1, -b.wBot - 1.6, b.tBot - 2.6, 8.4, 9.6, 1);
    // mustard zigzag and relish down the fur "sausage"
    const pts: Pt[] = [];
    for (let i = 0; i <= 7; i++) pts.push([2 + b.hunch + (i % 2 ? 4.6 : -3.4) + i * 0.6, b.tTop + 5 + i * ((b.tBot - b.tTop - 10) / 7)]);
    const z = 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L');
    s += line(z, 3.8) + line(z, 2.6, MUSTARD) + line(z, 0.8, '#D8C070', 'opacity="0.8"');
    const rr = rnd(seed + 9);
    for (let i = 0; i < 9; i++) s += outl(`M${f(-4 + rr() * 14)},${f(b.shY + 6 + rr() * 22)}h${f(1.6 + rr())}v1.1h${f(-1.6 - rr())}Z`, '#4E6A34', 0.35);
    s += half(b.wTop + 1.6 + bel * 0.3, b.shY + 1.4, b.wBot + bel + 1.4, b.tBot - 2.6, 8, 9.2, -1);
    s += drip(5, b.tBot - 6, 4, 1.4, MUSTARD, 0.85);
  } else {
    s += half(b.wTop + 1, b.shY + 1, b.wBot + 1.4, b.tBot - 2.6, 8.4, 9.6, -1);
    s += half(-b.wTop - 1.4, b.shY + 1, -b.wBot - 1.6, b.tBot - 2.6, 8.4, 9.6, 1);
    s += line(`M-6,${f(b.shY + 10)}q4,3 10,-1`, 2.2, MUSTARD, 'opacity="0.7"');
  }
  // zombie: slime, a rip of rotten skin, flies
  s += inside(d, td, stain(-2, b.tBot - 10, 2.4, SLIME, seed + 13, 0.55) + stain(8, b.shY + 8, 1.6, BLOOD, seed + 14, 0.5));
  s += fly(back ? 10 : -16, b.shY + 2, 1.1, seed + 3) + fly(back ? -14 : 18, b.tBot - 4, 1, seed + 4);
  return s;
};

/** Shaggy fur hood around the face (front) / over the whole head (back). */
const bigfootHair: HairSet = {
  hairBehind: (c) => shade(c.d, jag(-2, -78, 29, 30, c.seed + 91, 18, 0.13), BF_FUR, { lw: 1.1, inner: furInner([-32, -110, 30, -46], BF_FUR, c.seed + 92, 50) }),
  hairFront: (c) => {
    const outer = jag(0, -80, 27.6, 29.6, c.seed + 93, 22, 0.12);
    const hole = jag(10.6, -68, 14.6, 17.6, c.seed + 94, 18, 0.07);
    const id = c.d.id('m');
    c.d.def(`<clipPath id="${id}"><path clip-rule="evenodd" d="M-60,-140H60V0H-60Z${hole}"/></clipPath>`);
    let s = `<g clip-path="url(#${id})">${shade(c.d, outer, BF_FUR, { lw: 1.15, inner: furInner([-30, -112, 30, -48], BF_FUR, c.seed + 95, 70) })}</g>`;
    s += line(hole, 0.9, BF_FUR.d) + line(hole, 0.5, INK, 'opacity="0.7"');
    // heavy fur brow
    s += shade(c.d, jag(8, -86.4, 14, 2.8, c.seed + 96, 10, 0.3), BF_FUR, { lw: 0.9, k: 0 });
    return s;
  },
  hairBack: (c) => shade(c.d, jag(0, -79, 27, 29, c.seed + 97, 22, 0.12), BF_FUR, { lw: 1.15, inner: furInner([-30, -112, 30, -48], BF_FUR, c.seed + 98, 70) + stain(6, -88, 2, SLIME, c.seed + 99, 0.4, 1) }),
};

// ================================================================== Werewoof
const WW_FUR = tone('#76705E', '#56503F', '#36322A');
const WW_MUZ = tone('#A49C84', '#7E765E');

function wolfEar(c: Ctx, x: number, y: number, rot: number, s = 1): string {
  const p = 'M-5,2C-5,-5 -2,-12 1,-16C3,-11 5.6,-5 5.4,2Z';
  let o = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">`;
  o += shade(c.d, p, WW_FUR, { lw: 1.1, inner: fill('M-2.4,1C-2.6,-4 -0.6,-9 1,-12C2.4,-8 3.4,-4 3.2,1Z', '#6A4A44', 'opacity="0.75"') + hatch([-5, -16, 6, 2], 10, WW_FUR.d, c.seed + 3, 1.6, 1.6, 0.4, 0.7) });
  o += line('M3.4,-9l1.6,1.6l-1,1', 0.6) + '</g>';
  return o;
}

const werewoofHair: HairSet = {
  hairBehind: (c) =>
    shade(c.d, jag(-6, -76, 22, 26, c.seed + 101, 16, 0.18), WW_FUR, { lw: 1.1, inner: furInner([-30, -104, 18, -48], WW_FUR, c.seed + 102, 40) }) + wolfEar(c, 12, -96, 18, 0.95),
  hairFront: (c) => {
    // the near ear, a mane tuft over the crown and a cheek ruff
    let s = wolfEar(c, -4, -98, -14, 1.05);
    s += shade(c.d, 'M-21,-82C-22,-92 -14,-101 -4,-102C-8,-97 -9,-93 -8,-89C-12,-90 -14,-88 -15,-84C-17,-85 -19,-84 -21,-82Z', WW_FUR, { lw: 1, inner: furInner([-22, -102, -4, -82], WW_FUR, c.seed + 103, 14) });
    s += shade(c.d, jag(-13, -62, 7, 9, c.seed + 104, 9, 0.3), WW_FUR, { lw: 1, inner: furInner([-20, -72, -6, -52], WW_FUR, c.seed + 105, 14) });
    // an old stitched scar across the brow (zombie)
    s += line('M-6,-90l9,4', 0.8, '#5A3A34') + line('M-4,-90.6l-0.6,1.6M-1,-89.2l-0.6,1.6M2,-87.8l-0.6,1.6', 0.5);
    return s;
  },
  hairBack: (c) => shade(c.d, jag(-1, -78, 24, 28, c.seed + 106, 18, 0.16), WW_FUR, { lw: 1.1, inner: furInner([-26, -106, 24, -50], WW_FUR, c.seed + 107, 50) }) + wolfEar(c, -10, -98, -12, 1) + wolfEar(c, 10, -98, 12, 1),
};

/** The Werewoof's muzzle face: zombie eyes, a long snout with fangs; chomp / sleep / dazed. */
const wolfFace: FacePaint = (c, e) => {
  const { d } = c;
  const [nx, ny] = EYE_N;
  const [fx, fy] = EYE_F;
  let s = '';
  if (e === 'sleep') s += eyeShut(c, nx, ny, 4.4) + eyeShut(c, fx, fy, 3.4);
  else if (e === 'dazed') s += eyeSpiral(c, nx, ny, 4.6) + eyeZ(c, fx, fy + 0.6, 3.4, 4, { lid: 0.62, tilt: 0.8, low: 0.1 });
  else s += eyeZ(c, nx, ny + 0.4, 4.6, 4.4, { lid: e === 'chomp' ? 0.12 : 0.36, tilt: -0.9 }) + eyeZ(c, fx, fy + 0.4, 3.5, 4, { lid: e === 'chomp' ? 0.12 : 0.38, tilt: 0.9 });
  s += brows(c, e === 'sleep' ? 'worry' : e === 'dazed' ? 'skeptic' : 'down');
  const open = e === 'chomp' ? 9 : e === 'dazed' ? 3 : e === 'sleep' ? 1 : 0;
  // lower jaw (drawn first, behind the upper muzzle), hinged under the eyes
  const jaw = `M3.6,-61.2C12,${f(-60 + open * 0.5)} 21,${f(-60 + open)} 27,${f(-60.4 + open)}C26.6,${f(-56.4 + open)} 21.6,${f(-54 + open * 0.8)} 14,${f(-54 + open * 0.6)}C8.4,-54 4.4,-56.4 3.6,-61.2Z`;
  if (open > 1) {
    const mouthP = `M4,-61.4L28,-61.6L27,${f(-60.4 + open)}C21,${f(-59.4 + open)} 12,${f(-59.6 + open * 0.5)} 4,-60.4Z`;
    let mi = fill(mouthP, MOUTH) + fill(ellD(18, -60 + open * 0.8, 6, 2.2), TONGUE);
    for (let i = 0; i < 6; i++) mi += toothP(9 + i * 3, -61.6, 1.8, 2.2 + (i === 4 ? 1.6 : 0), true, i % 2 ? TEETH : mix(TEETH, TEETH_D, 0.5));
    s += inside(d, mouthP, mi);
  }
  s += shade(d, jaw, WW_MUZ, { lw: 1.05, off: [-0.6, -0.6], inner: fill(`M0,${f(-56.6 + open * 0.6)}H30V-40H0Z`, WW_MUZ.s, 'opacity="0.6"') });
  if (open > 1) for (let i = 0; i < 4; i++) s += toothP(11 + i * 3.6, -60.6 + open * (0.55 + i * 0.12), 1.6, 2 + (i === 3 ? 1.4 : 0), false, TEETH);
  // the upper muzzle, nose and whisker pits
  const muz = 'M-0.4,-73.4C8,-75 20,-72.4 28,-67.8C31.6,-65.8 32,-62 29.4,-60.6C24,-59.6 14,-60 3.6,-61.2C0.6,-63 -1,-68.6 -0.4,-73.4Z';
  s += shade(d, muz, WW_MUZ, { lw: 1.1, off: [-0.8, -0.8], inner: hatch([0, -75, 30, -60], 18, WW_MUZ.s, c.seed + 111, 1.4, 0.3, 0.4, 0.7) + fill('M-2,-76H30V-71C20,-72 8,-73 -2,-72Z', WW_FUR.s, 'opacity="0.55"') });
  s += shade(d, 'M26.6,-68.6C28.6,-70 32,-69.6 32.6,-67C33,-64.8 31,-63.6 28.8,-64C26.8,-64.4 25.6,-67 26.6,-68.6Z', tone('#2A2622', '#161412'), { lw: 0.9, off: [-0.4, -0.4] });
  s += fill(ellD(29.4, -67.8, 1.2, 0.6), '#8A8478', 'opacity="0.8"');
  if (open <= 1) {
    s += line('M5,-61.2C12,-60.4 20,-60.2 28.4,-61', 0.9);
    s += toothP(23.6, -61, 1.6, 3, true) + toothP(12, -60.6, 1.4, 2.4, true);
  }
  s += circ(18, -64.6, 0.45, WW_FUR.d) + circ(20.6, -64, 0.45, WW_FUR.d) + circ(19.2, -62.8, 0.45, WW_FUR.d);
  if (e === 'dazed') s += `<path d="M20,-58C20,-53 21.4,-50 24,-50.4C26.4,-50.8 26,-54 24.6,-58Z" fill="${TONGUE}" stroke="${INK}" stroke-width="0.8"/>` + koStars();
  if (e === 'chomp') s += drip(6, -58, 5, 1.4, SLIME_L) + drip(26, -58, 4, 1.2, SLIME_L);
  if (e === 'sleep') s += `<path d="M14,-60.4Q13.4,-54 14.6,-49L15.4,-49Q14.6,-54 15,-60.4Z" fill="${SLIME_L}" stroke="${INK}" stroke-width="0.35" opacity="0.9"/>`;
  return s;
};

/** Furry chest under a torn-open flannel shirt, with a frayed shorts waistband. */
const werewoofTorso: Paint = (c) => {
  const { d, b, back, seed } = c;
  const td = torsoD(b, { torn: true }, seed);
  const shirt = tone('#6A3A30', '#4E2822');
  let s = shade(d, `M${f(-5 + b.hunch)},${f(b.neckY - 6)}H${f(7 + b.hunch)}V${f(b.tTop + 5)}H${f(-5 + b.hunch)}Z`, WW_FUR, { lw: 1, k: 0 });
  s += shade(d, td, WW_FUR, { inner: furInner([-22, b.tTop, 26, b.tBot + 2], WW_FUR, seed + 3, 60) + fill(ellD(5 + b.hunch, b.shY + 12, 7, 10), WW_MUZ.b, 'opacity="0.55"') });
  const shirtInner = W.plaid([-24, b.tTop - 2, 28, b.tBot + 4], '#2A120E', '#B88A6A', 3.6) + grime([-18, b.tTop, 22, b.tBot], 5, '#1A0C08', seed + 5, 3, 0.35);
  if (back) {
    // the shirt split up the back seam
    const id = d.id('m');
    d.def(`<clipPath id="${id}"><path clip-rule="evenodd" d="M-40,-130H40V20H-40Z${jag(-1, b.shY + 14, 4.6, 12, seed + 7, 8, 0.4)}"/></clipPath>`);
    s += `<g clip-path="url(#${id})">${shade(d, torsoD(b, { torn: true, drop: 1 }, seed + 2), shirt, { inner: shirtInner })}</g>`;
  } else {
    const x0 = b.hunch;
    const hole = `M${f(-3 + x0)},${f(b.tTop - 4)}L${f(-2 + x0)},${f(b.tBot + 4)}L${f(14 + x0)},${f(b.tBot + 4)}L${f(12 + x0)},${f(b.tTop - 4)}Z`;
    const id = d.id('m');
    d.def(`<clipPath id="${id}"><path clip-rule="evenodd" d="M-40,-130H40V20H-40Z${hole}"/></clipPath>`);
    s += `<g clip-path="url(#${id})">${shade(d, torsoD(b, { torn: true, drop: 1 }, seed + 2), shirt, { inner: shirtInner })}</g>`;
    s += line(`M${f(-3 + x0)},${f(b.tTop)}L${f(-2.2 + x0)},${f(b.tBot)}`, 0.9) + stain(4, b.shY + 14, 1.8, BLOOD, seed + 9, 0.6);
  }
  s += W.beltBand(c, tone('#4A5A6A', '#36424E'));
  return s;
};

// ================================================================== looks
interface RDef {
  body: BodyKind;
  bodyMod?: Partial<Body>;
  height: number;
  skin?: Tone;
  zskin?: Tone;
  face: FaceSpec;
  hair: Tone;
  set: HairSet;
  earHidden?: boolean;
  torso: Paint;
  /** how far the torso paint hangs below the seat (aprons, coats, skirts) */
  drop?: number;
  arm: ArmSet;
  leg: LegSet;
  /** extra room ahead of the toe / behind the heel in the shin part (sandals, big feet) */
  foot?: [number, number];
  headBox?: Box;
  faceUnder?: (c: Ctx, e: Expr) => string;
  facialHair?: (c: Ctx, e: Expr) => string;
  faceOver?: (c: Ctx, e: Expr) => string;
  headBackOver?: Paint;
}

function mk(o: RDef): Look {
  const body: Body = { ...BODIES[o.body], ...(o.bodyMod ?? {}) };
  return {
    body,
    height: o.height,
    skin: o.skin ?? SKIN,
    zskin: o.zskin,
    face: o.face,
    hair: o.hair,
    ...o.set,
    earHidden: o.earHidden,
    torso: o.torso,
    torsoBox: [-body.wBot - 9, body.tTop - 8, body.wBot + body.belly + 9, body.tBot + (o.drop ?? 4) + 3],
    arm: o.arm,
    leg: o.leg,
    legBox: o.foot ? [-body.legW * 0.6 - 7 - o.foot[0], -body.legW * 0.6 - 2, body.legW * 0.6 + 14 + o.foot[1], -body.hipY - body.thighL + 6] : undefined,
    headBox: o.headBox,
    faceUnder: o.faceUnder,
    facialHair: o.facialHair,
    faceOver: o.faceOver,
    headBackOver: o.headBackOver,
  };
}

const HAT_BOX: Box = [-40, -132, 46, -37];
const TALL_BOX: Box = [-32, -152, 36, -37];
const SANDALS: [number, number] = [2, 2];

// ---------------------------------------------------------------- Chuck Wagon's Chow Hall
const staff_chuck = mk({
  body: 'std',
  bodyMod: { belly: 1 },
  height: 120,
  skin: SKIN_TAN,
  face: { shape: 'square', lid: 0.5, bags: 1, brow: 'thick', nose: 'broken', mouth: 'grim', stubble: true, wrinkles: 1 },
  hair: HAIR.brown,
  set: H.withHat(H.underHat(HAIR.brown), tenGallon(tone('#8A6E4A', '#66503A'), '#3A2A1E', 0.82)),
  facialHair: sideburnsE(HAIR.brown, 7),
  headBox: HAT_BOX,
  torso: seq(
    shirtTorso({ top: tone('#7E3E32', '#5E2C24'), collar: 'shirt', buttons: true, pants: C.denim, belt: '#4A3424', buckle: '#A89A6A', extra: (c) => W.plaid([-22, c.b.tTop - 2, 26, c.b.tBot - 6.6], '#3A140E', '#C8A08A', 4.2) }),
    openVest(tone('#6A4A30', '#4A321E'), { conchos: true }),
    W.neckerchief(tone('#8A2A22', '#661C16')),
  ),
  arm: armPaint({ sleeve: 'rolled', col: tone('#7E3E32', '#5E2C24'), itemL: ladle(40, 0.95) }),
  leg: withSpurs(legPaint({ kind: 'pants', col: C.denim, shoe: 'boot', shoeCol: tone('#6A4A2E'), cuffs: true })),
});

const staff_chuck_b = mk({
  body: 'slim',
  height: 106,
  face: { shape: 'heart', lid: 0.5, bags: 1, brow: 'arched', browCol: '#6A3A1E', nose: 'small', mouth: 'smirk', lips: '#7A3A34', lash: true, wrinkles: 0 },
  hair: HAIR.ginger,
  set: H.pony(HAIR.ginger, tone('#8A2A22')),
  faceUnder: W.makeup({ freckles: true, blush: '#9A5A4A' }),
  drop: 9,
  torso: seq(
    W.skirt(tone('#4E5E72', '#3A4656'), { hem: 9, flare: 3 }),
    shirtTorso({ top: tone('#C8BC9C'), collar: 'scoop', extra: (c) => W.plaid([-22, c.b.tTop - 2, 26, c.b.tBot + 2], '#7A3A30', '#E0D4B4', 3.4) }),
    W.apron(CREAM, { len: 3, stains: 3 }),
  ),
  arm: armPaint({ sleeve: 'short', col: tone('#C8BC9C'), itemL: tray(35, 0.87) }),
  leg: legPaint({ kind: 'skirtleg', col: C.cream, shoe: 'boot', shoeCol: tone('#7A4A2A') }),
});

const boss_chuck = mk({
  body: 'fat',
  bodyMod: { s: 1.26, belly: 5 },
  height: 122,
  skin: tone('#A88C6C', '#86694E', '#5A4430'),
  face: { shape: 'jowl', lid: 0.5, bags: 2, brow: 'bushy', browCol: '#8A867C', nose: 'bulb', mouth: 'frown', wrinkles: 3, stubble: true },
  hair: HAIR.grey,
  set: H.withHat(H.underHat(HAIR.grey, { shaggy: true }), tenGallon(tone('#5E4A36', '#443426'), '#2A1E14')),
  facialHair: bigStache(HAIR.grey),
  faceUnder: (c) => fill(ellD(20, -70, 3.6, 2.4), '#9A4A3A', 'opacity="0.35"') + fill(ellD(26, -70, 1.6, 1.4), '#9A4A3A', 'opacity="0.3"') + (c.z ? '' : ''),
  headBox: HAT_BOX,
  drop: 8,
  torso: seq(
    shirtTorso({ top: tone('#7A2E28', '#5A201C'), collar: 'tee', buttons: true, pants: tone('#5A4A3A'), belt: '#2A1E14', buckle: '#A89A6A' }),
    W.suspenders('#3A2A1E'),
    W.apron(tone('#C4B898', '#9C9070'), { len: 8, stains: 6 }),
    W.neckerchief(tone('#4E5E72')),
  ),
  arm: armPaint({ sleeve: 'rolled', col: tone('#7A2E28', '#5A201C'), bulk: 1.05, itemL: fryingPan(50, 0.82), extra: hairyArm('#5A5248') }),
  leg: withSpurs(legPaint({ kind: 'pants', col: tone('#5A4A3A'), shoe: 'boot', shoeCol: tone('#4A3424'), cuffs: true })),
});

// ---------------------------------------------------------------- Big Hank's Burger Barn
const staff_hank = mk({
  body: 'teen',
  height: 105,
  skin: SKIN_PALE,
  face: { shape: 'small', lid: 0.6, bags: 2, brow: 'sparse', nose: 'pug', mouth: 'sneer', wrinkles: 0, look: [1, 0.4] },
  hair: HAIR.blond,
  set: H.withHat(H.messy(HAIR.blond, { vol: 1.2 }), paperHat('#8A2E26')),
  faceUnder: W.makeup({ acne: true }),
  drop: 7,
  torso: seq(
    shirtTorso({ top: C.white, collar: 'shirt', pants: C.charcoal, belt: '#1E1C1A', pocket: true }),
    bowTie(tone('#8A2E26', '#661E1A')),
    W.apron(CREAM, { len: 6, stains: 4, pocket: false }),
    splats(4),
    nameTag('#8A2E26'),
  ),
  arm: armPaint({ sleeve: 'short', col: C.white, itemL: flipper(40, 1) }),
  leg: legPaint({ kind: 'pants', col: C.charcoal, shoe: 'sneaker', shoeCol: tone('#B8B2A0'), sole: '#8A8478' }),
});

const staff_hank_b = mk({
  body: 'slim',
  height: 121,
  face: { shape: 'heart', lid: 0.55, bags: 1, brow: 'arched', browCol: '#6A5030', nose: 'small', mouth: 'lips', lips: '#7A2A30', lash: true, shadow: '#5A6A70', wrinkles: 1, look: [1.2, 0.2] },
  hair: HAIR.bleach,
  set: beehive(HAIR.bleach),
  faceUnder: W.makeup({ mole: [17.4, -63.6], blush: '#9A5050' }),
  headBox: [-32, -128, 36, -37],
  drop: 8,
  torso: seq(
    W.skirt(tone('#5E7E78', '#46625E'), { hem: 8, flare: 3, pleats: 5 }),
    shirtTorso({ top: tone('#5E7E78', '#46625E'), collar: 'shirt', buttons: true, pocket: true }),
    W.apron(C.white, { len: 2, stains: 2, pocket: false }),
    nameTag('#5E7E78'),
  ),
  arm: armPaint({ sleeve: 'short', col: tone('#5E7E78', '#46625E'), itemL: coffeePot(0, 0.95) }),
  leg: legPaint({ kind: 'skirtleg', col: C.cream, shoe: 'sneaker', shoeCol: tone('#D0CCC0'), sock: tone('#D8D4C8') }),
});

const boss_hank = mk({
  body: 'muscle',
  bodyMod: { s: 1.28, belly: 4, wBot: 15.6, tBot: -16.4 },
  height: 112,
  skin: tone('#B0A084', '#8E7E64', '#5E5038'),
  face: { shape: 'square', lid: 0.45, bags: 2, brow: 'thick', browCol: '#2A2420', nose: 'broken', mouth: 'grim', stubble: true, wrinkles: 2 },
  hair: HAIR.dark,
  set: H.withHat(H.buzz(HAIR.dark), paperHat('#8A2E26')),
  drop: 8,
  torso: seq(
    W.tankTop(tone('#C8C2AE', '#A09A86'), { scoop: 4, pants: tone('#4A4844'), belt: '#1E1C1A', extra: (c) => (c.back ? '' : hatch([-2 + c.b.hunch, c.b.tTop + 1, 8 + c.b.hunch, c.b.tTop + 5], 20, '#2A2420', c.seed + 4, 1, 1.3, 0.35, 0.8)) }),
    W.apron(tone('#BEB69C', '#968E74'), { len: 8, stains: 6 }),
    splats(5),
  ),
  arm: armPaint({ sleeve: 'none', col: C.white, bulk: 1.08, itemL: tenderiser(50, 0.82), extra: burgerTattoo }),
  leg: legPaint({ kind: 'pants', col: tone('#4A4844'), shoe: 'boot', shoeCol: C.black }),
});

// ---------------------------------------------------------------- Vegan Vera's Salad Fortress
const staff_vera = mk({
  body: 'slim',
  bodyMod: { hipX: 4.6 },
  height: 105,
  face: { shape: 'long', lid: 0.6, bags: 1, brow: 'thick', nose: 'hook', mouth: 'flat', wrinkles: 1, look: [1.2, -0.2] },
  hair: HAIR.mouse,
  set: H.manbun(HAIR.mouse),
  faceUnder: W.fullBeard(HAIR.mouse, 0.5),
  faceOver: W.glasses('round', '#4A5A3A'),
  headBackOver: W.glassesBack('#4A5A3A'),
  drop: 7,
  torso: seq(
    shirtTorso({ top: tone('#7A7A5A', '#5C5C42'), collar: 'v', untucked: true, pants: tone('#8A7A5A', '#6A5C42') }),
    W.apron(tone('#5E7048', '#465436'), { len: 7, stains: 2 }),
  ),
  arm: armPaint({ sleeve: 'rolled', col: tone('#7A7A5A', '#5C5C42'), itemL: carrot(40, 1), extra: beads(['#7A5A3A', '#4E6A5A', '#9A7A4A']) }),
  leg: withSandals(legPaint({ kind: 'pants', col: tone('#8A7A5A', '#6A5C42'), shoe: 'bare', shoeCol: C.khaki, cuffs: true })),
  foot: SANDALS,
});

const staff_vera_b = mk({
  body: 'slim',
  height: 103,
  skin: SKIN_DARK,
  face: { shape: 'heart', lid: 0.55, bags: 1, brow: 'arched', browCol: '#1E1814', nose: 'small', mouth: 'pout', lips: '#4A2226', lash: true, wrinkles: 0 },
  hair: HAIR.black,
  set: dreads(tone('#3A2E24', '#261E16'), tone('#8A6A3A', '#6A4E28')),
  earHidden: true,
  faceOver: (_c) => outl(ellD(13.4, -66.4, 1.1, 1.1), '#A8A49A', 0.5),
  drop: 12,
  torso: seq(
    W.skirt(tone('#6A5038', '#4E3A28'), { hem: 12, flare: 3.6, pattern: (c) => W.florals(c, [-18, c.b.tBot - 7, 20, c.b.tBot + 12], '#9A7A4A', '#5E7048', 14) }),
    W.tankTop(tone('#8A8A5A', '#6A6A42'), { scoop: 6 }),
  ),
  arm: armPaint({ sleeve: 'none', col: tone('#8A8A5A'), itemL: rollingPin(40, 0.95), extra: beads(['#B8963E', '#5E7048', '#8A3A2A']) }),
  leg: withSandals(legPaint({ kind: 'skirtleg', col: C.cream, shoe: 'bare', shoeCol: C.khaki })),
  foot: SANDALS,
});

const boss_vera = mk({
  body: 'slim',
  bodyMod: { s: 1.24, wBot: 12, belly: 0.6 },
  height: 112,
  face: { shape: 'long', lid: 0.62, bags: 2, brow: 'arched', browCol: '#5A4428', nose: 'pointy', mouth: 'sneer', lips: '#6A3A3A', lash: true, shadow: '#5A6A50', wrinkles: 2, look: [1.2, 0.4] },
  hair: tone('#8A6A3E', '#6A4E2A'),
  set: kaleHair(tone('#8A6A3E', '#6A4E2A')),
  faceOver: W.glasses('round', '#3E5A2E'),
  headBackOver: W.glassesBack('#3E5A2E'),
  headBox: [-36, -122, 36, -37],
  drop: 13,
  torso: seq(
    W.skirt(tone('#4E5A3A', '#3A4428'), { hem: 13, flare: 3.4, pleats: 4 }),
    shirtTorso({ top: tone('#6E7A4E', '#525C38'), collar: 'v', untucked: true }),
    W.apron(tone('#C4B894', '#9C906C'), { len: 9, stains: 5 }),
    (c) => (c.back ? '' : outl(`M${f(-6.6 + c.b.hunch)},${f(c.b.shY + 6)}h5v3h-5Z`, '#5E7048', 0.5)),
  ),
  arm: armPaint({ sleeve: 'rolled', col: tone('#6E7A4E', '#525C38'), itemL: zucchiniClub(50, 0.8), extra: beads(['#5E7048', '#9A7A4A']) }),
  leg: withSandals(legPaint({ kind: 'skirtleg', col: C.cream, shoe: 'bare', shoeCol: C.khaki })),
  foot: SANDALS,
});

// ---------------------------------------------------------------- Colonel Crunch's Chicken Shack
const staff_crunch = mk({
  body: 'std',
  bodyMod: { belly: 2.6 },
  height: 114,
  skin: SKIN_TAN,
  face: { shape: 'round', lid: 0.55, bags: 1, brow: 'thick', nose: 'big', mouth: 'gap', stubble: true, wrinkles: 1 },
  hair: HAIR.black,
  set: H.withHat(H.underHat(HAIR.black), combHat()),
  headBox: [-32, -120, 36, -37],
  torso: seq(
    shirtTorso({ top: tone('#D0C8B0', '#A8A08A'), collar: 'polo', pants: tone('#3A3430'), belt: '#1E1C1A', buckle: '#A8A49A', extra: bucketStripes('#8A2A24') }),
    splats(5, [GREASE, GREASE, KETCHUP]),
  ),
  arm: armPaint({ sleeve: 'short', col: tone('#D0C8B0', '#A8A08A'), stripes: '#8A2A24', itemL: fryBasket(35, 0.93) }),
  leg: legPaint({ kind: 'pants', col: tone('#3A3430'), shoe: 'sneaker', shoeCol: tone('#6A2A24'), sole: '#C8C2AE' }),
});

const staff_crunch_b = mk({
  body: 'slim',
  height: 104,
  skin: SKIN_TAN,
  face: { shape: 'heart', lid: 0.5, bags: 1, brow: 'arched', browCol: '#2A2018', nose: 'small', mouth: 'chew', lips: '#7A3A3A', lash: true, wrinkles: 0, look: [1, 0.2] },
  hair: HAIR.black,
  set: H.withHat(H.pony(HAIR.black, tone('#8A2A24')), H.headband(tone('#8A2A24', '#661C18'))),
  drop: 8,
  torso: seq(
    W.skirt(tone('#7A2A24', '#5A1E1A'), { hem: 7, flare: 2.6, pleats: 6 }),
    shirtTorso({ top: tone('#D0C8B0', '#A8A08A'), collar: 'polo', extra: bucketStripes('#8A2A24') }),
    splats(3, [GREASE, KETCHUP]),
  ),
  arm: armPaint({ sleeve: 'short', col: tone('#D0C8B0', '#A8A08A'), stripes: '#8A2A24', itemL: drumstickClub(40, 0.85) }),
  leg: legPaint({ kind: 'skirtleg', col: C.cream, shoe: 'sneaker', shoeCol: tone('#C8C2B0'), sock: tone('#D0CCC0'), stripe: '#8A2A24' }),
});

const boss_crunch = mk({
  body: 'old',
  bodyMod: { s: 1.24, belly: 4.4, wBot: 14, hunch: 1.4 },
  height: 104,
  skin: SKIN_PALE,
  face: { shape: 'jowl', lid: 0.5, bags: 2, brow: 'bushy', browCol: '#D0CCC0', nose: 'bulb', mouth: 'smirk', wrinkles: 3 },
  hair: HAIR.white,
  set: H.slick(HAIR.white, { recede: 3 }),
  facialHair: seqE(W.walrus(HAIR.white), W.goatee(HAIR.white)),
  faceOver: W.glasses('square', '#1E1C1A', '#A8B0A0'),
  headBackOver: W.glassesBack('#1E1C1A'),
  drop: 8,
  torso: seq(
    jacketTorso({ top: C.white, collar: 'shirt', pants: tone('#C8C0A8') }, { col: tone('#D2CCB8', '#AAA48E'), lapels: true, buttons: 2, pockets: true, long: 4 }),
    stringTie(),
    W.apron(tone('#A89E84', '#847A62'), { len: 7, stains: 6, pocket: false }),
  ),
  arm: armPaint({ sleeve: 'long', col: tone('#D2CCB8', '#AAA48E'), cuff: '#E0DCD0', itemL: cleaver(50, 0.82) }),
  leg: legPaint({ kind: 'pants', col: tone('#C8C0A8', '#A09880'), shoe: 'dress', shoeCol: C.black }),
});

// ---------------------------------------------------------------- Le Snob Bistro
const staff_snob = mk({
  body: 'slim',
  bodyMod: { hipX: 4.6 },
  height: 104,
  face: { shape: 'long', lid: 0.62, bags: 1, brow: 'raised', browCol: '#1E1A16', nose: 'long', mouth: 'sneer', wrinkles: 1, look: [1.2, -0.2] },
  hair: HAIR.black,
  set: H.slick(HAIR.black, { pomp: 0.6 }),
  facialHair: W.pencilStache(HAIR.black),
  drop: 12,
  torso: seq(
    shirtTorso({ top: C.white, collar: 'shirt', pants: C.black }),
    waistcoat(tone('#2E2A28', '#1E1A18')),
    bowTie(tone('#2A2622', '#161412')),
    waistApron(tone('#D8D4C6', '#B0AC9E'), 12),
  ),
  arm: armPaint({ sleeve: 'long', col: C.white, itemL: wineBottle(45, 0.95), extra: towel }),
  leg: legPaint({ kind: 'pants', col: C.black, shoe: 'dress', shoeCol: C.black }),
});

const staff_snob_b = mk({
  body: 'slim',
  height: 105,
  skin: SKIN_PALE,
  face: { shape: 'heart', lid: 0.6, bags: 0, brow: 'arched', browCol: '#1E1A16', nose: 'small', mouth: 'lips', lips: '#5A1420', lash: true, shadow: '#4A3A4A', wrinkles: 0, look: [1.4, -0.2] },
  hair: HAIR.black,
  set: H.withHat(H.bob(HAIR.black), H.beret(tone('#5A1E26', '#3E1418'))),
  earHidden: true,
  faceUnder: W.makeup({ mole: [17.4, -63.6] }),
  drop: 7,
  torso: seq(
    W.skirt(tone('#2A2826', '#1A1816'), { hem: 6, flare: 2 }),
    shirtTorso({ top: tone('#2A2826', '#1A1816'), collar: 'scoop' }),
    waistApron(tone('#D8D4C6', '#B0AC9E'), 7),
    pearls(),
  ),
  arm: armPaint({ sleeve: 'long', col: tone('#2A2826', '#1A1816'), itemL: pepperMill(40, 0.95) }),
  leg: legPaint({ kind: 'tights', col: tone('#2A2622', '#1A1816'), shoe: 'heel', shoeCol: C.black }),
});

const boss_snob = mk({
  body: 'std',
  bodyMod: { s: 1.24, belly: 3 },
  height: 136,
  face: { shape: 'long', lid: 0.6, bags: 2, brow: 'raised', browCol: '#2A221A', nose: 'long', mouth: 'sneer', wrinkles: 2, look: [1.2, -0.2] },
  hair: HAIR.dark,
  set: H.withHat(H.underHat(HAIR.dark), tallToque()),
  facialHair: twirlStache(HAIR.dark),
  headBox: TALL_BOX,
  drop: 6,
  torso: seq(neck, chefCoat(tone('#D8D2C0', '#AEA894'), { stains: 4, piping: '#5A1E26' }), W.neckerchief(tone('#5A1E26', '#3E1418'))),
  arm: armPaint({ sleeve: 'long', col: tone('#D8D2C0', '#AEA894'), band: true, itemL: baguette(50, 0.82) }),
  leg: legPaint({ kind: 'pants', col: tone('#5A5650', '#3E3A36'), shoe: 'clog', shoeCol: C.black, stripe: '#3A3632' }),
});

// ---------------------------------------------------------------- Chef Inferno's Food Truck
const staff_boss = mk({
  body: 'stocky',
  height: 104,
  skin: SKIN_PALE,
  face: { shape: 'square', lid: 0.5, bags: 2, brow: 'thick', browCol: '#1E1A16', nose: 'broken', mouth: 'sneer', stubble: true, wrinkles: 1 },
  hair: HAIR.black,
  set: H.withHat(H.underHat(HAIR.black), H.backCap(tone('#2E2A28', '#1E1A18'), '#7A2A1E')),
  faceUnder: (c) => soot(c) + outl(ellD(-17, -66.4, 0.9, 0.9), '#A8A49A', 0.4),
  drop: 7,
  torso: seq(
    shirtTorso({ top: tone('#2E2A28', '#1E1A18'), collar: 'tee', untucked: true, pants: tone('#3E3A32'), extra: (c) => (c.back ? '' : flames(3 + c.b.hunch, c.b.shY + 12, 10, 8, c.seed + 5, 0.75)) }),
    W.apron(tone('#5A2A22', '#3E1C16'), { len: 6, stains: 3 }),
  ),
  arm: armPaint({ sleeve: 'short', col: tone('#2E2A28', '#1E1A18'), itemL: bbqFork(40, 1), extra: flameTattoo }),
  leg: legPaint({ kind: 'pants', col: tone('#3E3A32'), shoe: 'boot', shoeCol: C.black }),
});

const staff_boss_b = mk({
  body: 'slim',
  height: 104,
  skin: SKIN_PALE,
  face: { shape: 'heart', lid: 0.55, bags: 1, brow: 'arched', browCol: '#1E1A16', nose: 'small', mouth: 'sneer', lips: '#3A1A20', lash: true, shadow: '#3A2A30', wrinkles: 0 },
  hair: tone('#7A2E22', '#5A1E16'),
  set: H.spiky(tone('#7A2E22', '#5A1E16'), HAIR.black),
  faceUnder: (c) => soot(c),
  faceOver: (_c) => outl(ellD(9.6, -84.6, 0.8, 0.8), '#A8A49A', 0.4) + outl(ellD(12, -85.4, 0.8, 0.8), '#A8A49A', 0.4),
  drop: 6,
  torso: seq(
    W.tankTop(tone('#2A2622', '#1A1816'), { scoop: 5, pants: tone('#2A2622'), belt: '#4A1E18' }),
    W.apron(tone('#6A2A22', '#4A1C16'), { len: 5, stains: 2, pocket: false }),
  ),
  arm: armPaint({ sleeve: 'none', col: tone('#2A2622'), wristband: '#2A2622', itemL: hotSauce(45, 1), extra: flameTattoo }),
  leg: legPaint({ kind: 'tights', col: tone('#2A2622', '#1A1816'), shoe: 'boot', shoeCol: C.black, stripe: '#6A2A22' }),
});

const boss_boss = mk({
  body: 'muscle',
  bodyMod: { s: 1.3, belly: 2.4 },
  height: 112,
  skin: tone('#A6806A', '#845E4C', '#5A3A2C'),
  face: { shape: 'square', lid: 0.45, bags: 2, brow: 'bushy', browCol: '#1A1614', nose: 'hook', mouth: 'grin', wrinkles: 2 },
  hair: HAIR.black,
  set: H.withHat(H.underHat(HAIR.black), flameBandana()),
  facialHair: devilGoatee(HAIR.black),
  faceUnder: (c) => soot(c),
  drop: 6,
  torso: seq(neck, chefCoat(tone('#3A3430', '#262220'), { dark: true, stains: 3, piping: '#7A2A1E' }), (c) => (c.back ? flames(-1, c.b.tBot - 2, 18, 12, c.seed + 7, 0.7) : flames(-5, c.b.tBot + 2, 12, 9, c.seed + 8, 0.7))),
  arm: armPaint({ sleeve: 'rolled', col: tone('#3A3430', '#262220'), bulk: 1.04, itemL: flamingSpatula(50, 0.82), extra: flameTattoo }),
  leg: legPaint({ kind: 'pants', col: tone('#2A2622', '#1A1816'), shoe: 'boot', shoeCol: C.black, stripe: '#5A1E16' }),
});

// ---------------------------------------------------------------- the monsters
const bigfoot = mk({
  body: 'sumo',
  bodyMod: { s: 1.5, legW: 16, armW: 14, hipY: -19.6, thighL: 9 },
  height: 110,
  zskin: BF_SKIN,
  face: { shape: 'round', lid: 0.4, bags: 2, brow: 'bushy', browCol: '#2E2016', nose: 'pug', mouth: 'grim', zMouth: 'snarl', eyeS: 0.9 },
  hair: BF_FUR,
  set: bigfootHair,
  earHidden: true,
  drop: 3,
  torso: bigfootTorso,
  arm: furArm(BF_FUR, { bulk: 1 }),
  leg: furLeg(BF_FUR, { foot: 'big' }),
  foot: [4, 8],
});

const werewoof = mk({
  body: 'muscle',
  bodyMod: { s: 0.88, hunch: 2.6, neckY: -46.4, tTop: -50 },
  height: 112,
  zskin: WW_FUR,
  face: { shape: 'long', lid: 0.4, bags: 1, brow: 'bushy', browCol: '#2A2620', nose: 'small', mouth: 'grim', zMouth: 'snarl' },
  hair: WW_FUR,
  set: werewoofHair,
  earHidden: true,
  drop: 3,
  torso: werewoofTorso,
  arm: furArm(WW_FUR, { sleeve: tone('#6A3A30', '#4E2822'), claws: '#D0C6A4' }),
  leg: furLeg(WW_FUR, { foot: 'paw', shorts: tone('#4A5A6A', '#36424E') }),
  foot: [2, 2],
});

// ================================================================== registry
interface RaidEntry {
  look: Look;
  z: boolean;
  faces: FaceName[];
  face?: FacePaint;
}

const CHEF_GLARE: Menace = { lid: 0.45, tilt: 1.1, pr: 1.1, brow: 'down', flare: true };
const staff = (look: Look): RaidEntry => ({ look, z: false, faces: RIVAL_FACES3, face: rivalFace() });
const chef = (look: Look): RaidEntry => ({ look, z: false, faces: RIVAL_FACES3, face: rivalFace(CHEF_GLARE) });

const RAID_CAST: Record<string, RaidEntry> = {
  staff_chuck: staff(staff_chuck),
  staff_chuck_b: staff(staff_chuck_b),
  boss_chuck: chef(boss_chuck),
  staff_hank: staff(staff_hank),
  staff_hank_b: staff(staff_hank_b),
  boss_hank: chef(boss_hank),
  staff_vera: staff(staff_vera),
  staff_vera_b: staff(staff_vera_b),
  boss_vera: chef(boss_vera),
  staff_crunch: staff(staff_crunch),
  staff_crunch_b: staff(staff_crunch_b),
  boss_crunch: chef(boss_crunch),
  staff_snob: staff(staff_snob),
  staff_snob_b: staff(staff_snob_b),
  boss_snob: chef(boss_snob),
  staff_boss: staff(staff_boss),
  staff_boss_b: staff(staff_boss_b),
  boss_boss: chef(boss_boss),
  bigfoot: { look: bigfoot, z: true, faces: BEAST_FACES3 },
  werewoof: { look: werewoof, z: true, faces: BEAST_FACES3, face: wolfFace },
};

/** Build one raid character on the v3 rig, or null for an id this cast does not cover. */
export function buildRaidChar3(id: string): CharArt | null {
  const e = RAID_CAST[id];
  if (!e) return null;
  return buildLook3(id, e.look, { z: e.z, seedKey: id, faces: e.faces, face: e.face });
}

export { ZSKINS };
