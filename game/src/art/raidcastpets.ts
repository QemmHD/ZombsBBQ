/**
 * Raid monsters and dogs: the Big Foot-Long summon and the Werewoof pet (bipeds), plus the
 * four-legged rig used by the rival guard dog, the Zombie Pug and the Rot-weiler.
 *
 * Quad rig (front 3/4, facing down-right like the bipeds; root (0,0) on the ground under the body):
 *   parts (back to front): legBR, legFR, body, tail, legBL, legFL, head
 *   B = back (hind) legs, F = front legs; R = far side (drawn first, a little up-right and shaded),
 *   L = near side. Legs pivot at the hip / shoulder (top of the leg, tucked under the body), the head
 *   at the neck, the tail at its base, the body at its center.
 *   faces: replacement heads placed exactly like 'head'.
 */
import type { CharArt, CharPart, FaceName, QuadPartName } from './types';
import { Doc, OUT, OW, P, S, G, capsule, ell, f, headD, hl, rrect, tornCapsule, zigzag } from './svg';
import type { Pt, Tone } from './svg';
import {
  MOUTH,
  MUSTARD,
  PATCH,
  SCLERA,
  TONGUE,
  TOOTH,
  ZDEEP,
  ZSK,
  bodyD,
  buildBiped,
  darker,
  drool,
  part,
  rip,
  spiral,
  stitches,
  tooth,
  zombieEyes,
} from './raidcastkit';
import type { Biped, Box, Expr, Rig } from './raidcastkit';

const ZFACES: (FaceName & Expr)[] = ['chomp', 'sleep', 'dazed'];

/** Ragged fur outline along a path's points (zigzag tufts). */
function furTufts(pts: Pt[], depth: number): string {
  let out = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const z = zigzag(pts[i], pts[i + 1], 2, depth);
    out += z.map(([x, y], k) => `${i === 0 && k === 0 ? 'M' : 'L'}${f(x)},${f(y)}`).join('');
  }
  return out;
}

// ================================================================== WEREWOOF (biped ~84)
const WF: Tone = ['#8A7C70', '#62564C'];
const WF_LIGHT = '#B3A596';
const RIG_WOOF: Rig = {
  hip: [-5.2, -21],
  ankleY: -5,
  legW: 8.4,
  sh: [-12.6, -44.6],
  hand: [-15.8, -27.6],
  armW: 8.4,
  handR: 4.6,
  neck: [0.6, -48],
  torso: [0, -17.6],
  hc: [1.6, -62],
  hk: 1,
};

function woofLeg(d: Doc, side: -1 | 1, back: boolean): string {
  const lx = side * 5.2;
  const hip: Pt = [lx, -21];
  let s = '';
  // furry shin
  s += d.tone(capsule([lx, -14], [lx + side * 0.4, -5], 6.4, 6), WF, OW * 0.9);
  s += P(`M${f(lx - 3.2)},-10l-1.6,1.4l1.6,0.6M${f(lx + 3.2)},-8l1.6,1.2l-1.6,0.8`, WF[1], 0.8);
  // torn shorts
  s += d.tone(tornCapsule(hip, [lx + side * 0.2, -11.6], 9.4, 9.8, 3, 1.8), ['#5B6FB8', '#43529A'], OW);
  if (!back && side === -1) s += P(rrect(lx - 3, -17.6, 3.6, 3.2, 0.6), '#E8A04A', 0.7) + S(`M${f(lx - 2.6)},-16.4l2.8,0.4`, 0.5);
  // big clawed paw (toes point right)
  const x0 = lx + 0.6;
  const paw = back
    ? `M${f(x0 - 5)},0.4L${f(x0 + 4.6)},0.4C${f(x0 + 5)},-3 ${f(x0 + 3)},-6.4 ${f(x0)},-6.4C${f(x0 - 3)},-6.4 ${f(x0 - 5.4)},-3.6 ${f(x0 - 5)},0.4Z`
    : `M${f(x0 - 4.6)},0.4L${f(x0 + 8.4)},0.4C${f(x0 + 9.6)},-1.8 ${f(x0 + 7.6)},-4.6 ${f(x0 + 4)},-5.2C${f(x0 + 2)},-6.8 ${f(x0 - 2.6)},-6.6 ${f(x0 - 4.4)},-4C${f(x0 - 5.4)},-2.6 ${f(x0 - 5.2)},-0.8 ${f(x0 - 4.6)},0.4Z`;
  s += d.tone(paw, WF, OW, [-0.6, -0.6]);
  if (back) {
    s += P(ell(x0 - 0.4, -1, 2.6, 1.2), ZSK[1], 0.8);
  } else {
    s += S(`M${f(x0 + 3)},-0.2V-2.6M${f(x0 + 5.6)},-0.2V-2.2`, 0.9, WF[1]);
    for (const dx of [2, 4.6, 7.6]) s += P(`M${f(x0 + dx)},-0.2L${f(x0 + dx + 2.2)},0.6L${f(x0 + dx + 0.4)},1.2Z`, '#FFF6D8', 0.7);
  }
  return s;
}

function woofTorso(d: Doc, back: boolean): string {
  const td = bodyD(12, 13, -50.6, -16.4, 1.4);
  let s = '';
  // bushy tail behind the body
  const tail = back
    ? 'M-1,-24C-8,-24 -14,-21 -18,-14C-20.4,-10 -17.6,-7.4 -15.6,-9.8C-15.4,-6.4 -11.6,-6.4 -11.6,-10C-9.6,-7.8 -6.6,-9.6 -7.4,-12.6C-5.6,-16 -2,-19 2,-21Z'
    : 'M-9,-24C-15,-26 -21,-31 -23.6,-37C-25,-40 -22.4,-42 -20.6,-39.6C-21.4,-43 -17.8,-44.6 -16.4,-41C-15.6,-44 -12,-43.6 -12.6,-40C-10.4,-36 -7,-32 -4,-30Z';
  if (!back) s += d.tone(tail, WF, OW, [-0.8, -0.8]) + S('M-20,-38Q-15,-32 -9,-28', 0.8, WF[1]);
  s += d.tone(rrect(-4.6, -53, 10.4, 9, 3), [WF[1], WF[1]], OW * 0.8);
  s += d.tone(td, WF);
  if (back) {
    s += S('M-8,-44l-2,2M-2,-40l-2,2.4M6,-42l2,2.2M3,-32l-1.8,2.2', 1, WF[1]);
    s += rip(d, 6, -30, 1.1) + stitches(-8, -36, -3, -30, 2);
    s += d.clip(td, P('M-20,-24H20V-10H-20Z', '#5B6FB8') + S('M0.6,-22V-10', 0.9));
    s += S(td, OW);
    s += d.tone(tail, WF, OW, [-0.8, -0.8]) + S('M-14,-12Q-9,-18 -2,-21', 0.8, WF[1]);
  } else {
    // shaggy chest fluff + green zombie belly patch with stitches
    s += d.clip(td, P('M-7,-50 ' + furTufts([[-7, -46], [-4, -34], [5, -33], [8, -46]], 1.8).slice(1) + 'L8,-52L-7,-52Z', WF_LIGHT));
    s += d.tone('M-6,-31C-6,-34 6,-34 7,-31L7.6,-24C3,-22.6 -3,-22.6 -6.4,-24Z', ZSK, 1.1, [-0.4, -0.4]);
    s += stitches(-4.6, -29.6, 5.6, -28, 3, 1.1, 0.8);
    s += d.clip(td, P('M-20,-24H20V-10H-20Z', '#5B6FB8') + S('M-20,-24H20', 1) + P(rrect(5, -22, 3.4, 3, 0.6), '#43529A', 0.7));
    s += S(td, OW);
    s += rip(d, -8.6, -38, 0.9, [WF_LIGHT, WF[1]]);
  }
  // red collar with a bone tag
  s += P(rrect(-6.6, -50.4, 14.4, 3.6, 1.6), '#D7262E', 1.1);
  for (const x of [-4, 0.6, 5.2]) s += `<circle cx="${x}" cy="-48.6" r="0.6" fill="#E6EBF0"/>`;
  if (!back) {
    s += S('M1.4,-46.8V-45', 0.8) + G(P('M-3.4,-1C-4.6,-2.6 -2.4,-3.4 -1.8,-1.8H1.8C2.4,-3.4 4.6,-2.6 3.4,-1C4.6,0.6 2.4,1.4 1.8,0H-1.8C-2.4,1.4 -4.6,0.6 -3.4,-1Z', '#FFF6D8', 0.8), 'translate(1.4 -43.2)');
  }
  return s;
}

function woofHead(d: Doc, u: number, back: boolean, e: Expr): string {
  const ear = (x: number, tip: Pt, torn: boolean) => {
    const base = `M${f(x - 5)},-9L${f(tip[0])},${f(tip[1])}L${f(x + 5)},-10.6Z`;
    let s = d.tone(base, WF, OW * u, [-0.6, -0.6]);
    if (!back) s += P(`M${f(x - 2.6)},-10.4L${f(tip[0] + 0.4)},${f(tip[1] + 5)}L${f(x + 2.6)},-11.2Z`, ZSK[0], 0.8 * u);
    if (torn) s += stitches(tip[0] - 3, tip[1] + 7, tip[0] + 2, tip[1] + 6, 2, 1, 0.8 * u);
    return s;
  };
  const droop = e === 'sleep' || e === 'dazed';
  let s = '';
  s += ear(-8, droop ? [-18, -20] : [-12, -26.6], false);
  s += ear(8, droop ? [17, -21] : [12.6, -25.4], true);
  // shaggy head
  const head = 'M-15.4,4' + furTufts([[-15.4, 4], [-12.6, 12.4], [-4, 15.6]], -1.8).slice(1 + 0) + 'C2,16 8,15 12,12C16.4,8 17,0 15.8,-5C14,-12.6 7,-16 0.6,-16C-8,-16 -15.4,-11 -16.4,-2Z';
  s += d.shaded(head, WF[0], WF[1], OW * u, [-1.6, -1.6]);
  if (back) {
    s += S('M-6,-12q-1,4 0,8M2,-14q-1,5 0,9M9,-12q0,4 -1,7', 1 * u, WF[1]);
    s += stitches(-10, -2, -3, 4, 2, 1.2, 0.9 * u);
    return s;
  }
  s += hl(-7, -10, 2.6, 1.2, -35, 0.4);
  s += stitches(-11, -7, -5.4, -11.6, 2, 1.2, 0.9 * u);
  // eyes + furry brows
  s += zombieEyes(d, u, e, WF[1], [-4.6, -2.6], [5.4, -3.4], 4.1, 3.3);
  if (e !== 'sleep') s += P('M-9.4,-8.6L-1.4,-6.8L-2,-5.4L-8.6,-6.6Z', WF[1], 0.9 * u) + P('M2,-7.2L9.2,-9.4L9.4,-7.8L2.6,-5.8Z', WF[1], 0.9 * u);
  // muzzle (green zombie skin) + nose
  const open = e === 'chomp';
  const muzzle = open
    ? 'M-2,0C4,-2.6 15,-3.6 21.4,-1.2C24,0 23.4,3.2 21,3.6C15,4.6 6,4.6 -1,4.2Z'
    : 'M-2,0C4,-2.4 15,-2.2 21,1.4C23.6,3 23,7.6 20,8.6C14,10.6 4,10.4 -1.4,8Z';
  if (open) {
    // wide-open jaws: dark mouth, lower jaw dropped, fangs everywhere
    s += P('M-1,3C6,3 16,3.4 21,3.4C22,9 18,16 9,17C3,17.4 -2,13 -1,3Z', MOUTH, 1.2 * u);
    s += P(ell(9, 13.6, 6, 2.6), TONGUE);
    s += d.tone('M-1.6,12C2,16.6 10,19.2 17,16.6C19.6,15.6 20,18.4 17.6,19.6C10,22.6 0,20.6 -3.4,14Z', ZSK, OW * u, [-0.4, -0.4]);
    for (const x of [3, 7, 11, 15]) s += tooth(x, 3.6, 2.2, 3, true, 0.8 * u);
    for (const x of [5, 9.6, 14]) s += tooth(x, 16.8, 2, 2.6, false, 0.8 * u);
  }
  s += d.tone(muzzle, ZSK, OW * u, [-0.8, -0.8]);
  s += d.tone(open ? ell(21.4, -0.8, 2.8, 2.2) : ell(21.2, 2.4, 2.8, 2.3), ['#3A3330', '#1E1A18'], 1 * u, [-0.4, -0.4]) + hl(20.4, open ? -1.6 : 1.6, 0.9, 0.5, -20, 0.8);
  if (!open) {
    s += S('M4,7.6Q10,9.4 18,6.6', 1.2 * u);
    s += tooth(7.4, 7.9, 2, 2.6, true, 0.8 * u) + tooth(14.4, 7.4, 1.8, 2.4, true, 0.8 * u);
    if (e === 'sleep') s += drool(6, 8.8, 4.4, 1.7, 0.9 * u);
    else s += d.tone('M10,8C10,12.6 12,15.4 14.4,15C16.4,14.6 16.2,11.6 15,7.6Z', [TONGUE, '#C24E6C'], 1 * u, [-0.3, -0.3]) + S('M12.6,9.4L13.2,13', 0.6 * u, '#B23C5A');
    if (e === 'dazed') s += drool(16.4, 9, 3.6, 1.4, 0.9 * u);
  } else {
    s += drool(19, 4.2, 4, 1.5, 0.9 * u);
  }
  // cheek fluff
  s += P('M-15,2L-19,4.6L-15.2,6L-18.4,9.4L-13.6,9.6Z', WF[0], 1 * u);
  return s;
}

export function buildWerewoof(id: string): CharArt {
  const B: Biped = {
    rig: RIG_WOOF,
    height: 90,
    leg: { pants: ['#5B6FB8', '#43529A'], shoe: WF },
    legPaint: woofLeg,
    legBox: (side) => [side * 5.2 - 9, -28, side * 5.2 + 13, 3],
    arm: {
      skin: WF,
      sleeve: WF,
      kind: 'none',
      claws: '#FFF6D8',
      extra: (_d, side) => P(`M${f(side * 14.6 - 2)},-37l${f(-side * 3)},1.6l${f(side * 3)},1.2M${f(side * 14.6 - 1)},-41l${f(-side * 2.6)},1.4l${f(side * 2.6)},1`, WF[1], 0.9),
    },
    torso: woofTorso,
    torsoBox: [-28, -56, 19, -4],
    head: woofHead,
    headBox: [-23, -29, 27, 24],
    faces: ZFACES,
  };
  return buildBiped(id, B);
}

// ================================================================== BIG FOOT-LONG (biped ~130)
const BF: Tone = ['#9A5A3A', '#6E3E26'];
const BF_LIGHT = '#B97650';
const BUN: Tone = ['#E0973E', '#B4672A'];
const BUN_IN = '#F8DFA8';
const RIG_BIG: Rig = {
  hip: [-10.4, -32],
  ankleY: -9,
  legW: 15,
  sh: [-25.4, -75],
  hand: [-32.4, -41],
  armW: 13.4,
  handR: 8.2,
  neck: [1, -82],
  torso: [0, -28],
  hc: [2, -97],
  hk: 1.3,
};

function mustardZig(pts: Pt[], w: number): string {
  const d = 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L');
  return S(d, w + 2.4, OUT) + S(d, w, MUSTARD[0]) + S(d, w * 0.3, '#FFF0A8', 'opacity="0.8"');
}

function relish(pts: Pt[], u = 1): string {
  return pts.map(([x, y], i) => P(rrect(x - 1, y - 0.7, 2 + (i % 2) * 0.6, 1.4, 0.5), '#5CB848', 0.6 * u)).join('');
}

function bigLeg(d: Doc, side: -1 | 1, back: boolean): string {
  const lx = side * 10.4;
  let s = '';
  s += d.tone(capsule([lx, -32], [lx + side * 0.4, -11], 15, 14), BF, OW);
  s += P(`M${f(lx - 7.4)},-14l-2.4,2.2l2.6,0.8M${f(lx + 7.4)},-16l2.4,2l-2.4,1M${f(lx - 7.6)},-24l-2.2,1.8l2.4,0.6`, BF[1], 0.9);
  // THE big foot: furry top, green zombie sole and toes
  const x0 = lx + 1;
  if (back) {
    const foot = `M${f(x0 - 9.4)},0.6L${f(x0 + 13)},0.6C${f(x0 + 14)},-6 ${f(x0 + 8)},-12.4 ${f(x0 + 1)},-12.4C${f(x0 - 6)},-12.4 ${f(x0 - 10.4)},-6 ${f(x0 - 9.4)},0.6Z`;
    s += d.tone(foot, BF, OW, [0.8, -1]);
    s += d.clip(foot, P(`M${f(x0 - 12)},-4.6H${f(x0 + 16)}V3H${f(x0 - 12)}Z`, ZSK[0]) + P(`M${f(x0 - 12)},-1.6H${f(x0 + 16)}V3H${f(x0 - 12)}Z`, ZSK[1]));
    s += S(foot, OW) + S(`M${f(x0 - 9)},-4.6H${f(x0 + 13)}`, 1);
    s += d.tone(ell(x0 + 12.6, -3, 2.6, 2.4), ZSK, OW * 0.8, [-0.3, -0.3]);
    s += P(`M${f(x0 - 9.6)},-9l-2.6,0.4l2.2,1.8M${f(x0 + 8)},-10.6l2.8,-1.6l-0.6,3`, BF[1], 0.9);
    return s;
  }
  const foot = `M${f(x0 - 9.4)},0.6L${f(x0 + 22)},0.6C${f(x0 + 24)},0.6 ${f(x0 + 24.6)},-5 ${f(x0 + 20)},-7.4C${f(x0 + 14)},-10.6 ${f(x0 + 8)},-12.6 ${f(x0 + 2)},-13C${f(x0 - 5)},-13.4 ${f(x0 - 10.4)},-7.4 ${f(x0 - 9.4)},0.6Z`;
  s += d.tone(foot, BF, OW, [-1, -1]);
  s += d.clip(foot, P(`M${f(x0 - 12)},-3.6H${f(x0 + 30)}V3H${f(x0 - 12)}Z`, ZSK[0]) + P(`M${f(x0 - 12)},-1H${f(x0 + 30)}V3H${f(x0 - 12)}Z`, ZSK[1]));
  s += S(foot, OW) + S(`M${f(x0 - 9)},-3.6H${f(x0 + 18)}`, 1);
  // toes fan around the front of the foot (far toes first)
  const toes: [number, number, number][] = [[16.4, -8.4, 3], [20.4, -6.4, 3.4], [23.6, -3, 3.8]];
  for (const [dx, dy, r] of toes) s += d.tone(ell(x0 + dx, dy, r, r * 0.9), ZSK, OW * 0.85, [-0.5, -0.5]);
  s += P(`M${f(x0 + 25.4)},-5.6C${f(x0 + 26.6)},-4.6 ${f(x0 + 26.6)},-3 ${f(x0 + 25.8)},-2.2Z`, '#F2EBC0', 0.7);
  s += P(`M${f(x0 - 9.8)},-8.6l-2.6,0.6l2.2,1.6M${f(x0 + 2)},-13.4l0.6,-2.6l1.6,2.4M${f(x0 + 8)},-12.2l1.4,-2.2l1,2.6`, BF[1], 0.9);
  return s;
}

function bigTorso(d: Doc, back: boolean): string {
  const top = -84;
  const bot = -27;
  let s = '';
  const td = bodyD(20.6, 22.4, top, bot, 2.4);
  if (back) {
    // from behind the costume is all bun: two toasted halves meeting at a seam
    s += d.tone(rrect(-8, -88, 18, 10, 4), [BF[1], BF[1]], OW * 0.8);
    const shell = 'M-30,-34C-34,-50 -34,-80 -28,-100C-25,-109 -15,-112 -9,-104C-5,-108 6,-108 10,-104C16,-112 26,-109 29,-100C35,-80 35,-50 31,-34C27,-25 -26,-25 -30,-34Z';
    s += d.tone(shell, BUN, OW, [-1.8, -1.6]);
    s += S('M0.6,-104C-0.6,-80 -0.6,-50 0.6,-28', 1.2, BUN[1]);
    s += hl(-20, -80, 2, 12, 4, 0.35) + hl(17, -84, 1.6, 10, -4, 0.3);
    s += mustardZig([[-31, -62], [-24, -56], [-16, -64], [-8, -56], [0, -64], [8, -56], [16, -64], [24, -56], [31, -62]], 3);
    s += relish([[-18, -70], [12, -72], [-6, -46], [20, -44]]);
    return s;
  }
  s += d.tone(rrect(-8, -88, 18, 10, 4), [BF[1], BF[1]], OW * 0.8);
  s += d.tone(td, BF);
  // the "frank": shaggy chest, zombie belly patch, ragged fur hem
  s += d.clip(td, P('M-10,-82 ' + furTufts([[-10, -76], [-8, -58], [10, -58], [12, -76]], 2.2).slice(1) + 'L12,-90L-10,-90Z', BF_LIGHT));
  s += S('M-4,-70l-1.6,2M5,-66l1.6,2', 0.9, BF[1]);
  s += d.tone('M-7,-47C-7,-50.6 8,-50.6 8.6,-47L9.2,-38C3.4,-35.8 -2.6,-35.8 -7.6,-38Z', ZSK, 1.2, [-0.5, -0.5]);
  s += stitches(-5.4, -45, 7, -43.4, 3, 1.2, 0.9) + `<circle cx="1" cy="-40" r="0.9" fill="${ZDEEP}"/>`;
  s += P(furTufts([[-12, -30], [13, -30]], 2.6) + 'L13,-26L-12,-26Z', BF[1], 0);
  // hot dog bun costume: two halves wrapped around him (soft cream inside, toasted crust outside)
  const lobeL = 'M-8.6,-26C-21,-24 -32,-31 -33,-48C-34,-70 -32,-96 -23,-108C-19,-113.6 -11.4,-112.6 -9.6,-105C-7,-90 -5.6,-60 -8.6,-26Z';
  const lobeR = 'M8.6,-26C18,-24 27,-31 28,-48C29,-70 27,-96 20,-107C17,-112.6 11,-111.6 9.8,-104.6C7.4,-90 6,-60 8.6,-26Z';
  s += d.tone(lobeL, BUN, OW, [-1.6, -1.4]);
  s += d.clip(lobeL, P('M-14.4,-112C-15.6,-90 -16.4,-60 -13.6,-24L0,-24V-112Z', BUN_IN) + S('M-14.4,-112C-15.6,-90 -16.4,-60 -13.6,-24', 1, '#D9A860')) + S(lobeL, OW);
  s += hl(-28.6, -74, 1.4, 12, 2, 0.4);
  s += d.tone(lobeR, BUN, OW, [-1.2, -1.4]);
  s += d.clip(lobeR, P('M12.6,-112C13.6,-90 14.2,-60 12,-24L0,-24V-112Z', BUN_IN) + S('M12.6,-112C13.6,-90 14.2,-60 12,-24', 1, '#D9A860')) + S(lobeR, OW);
  // the mustard squiggle across bun and belly, with drips and relish
  s += mustardZig([[-33, -64], [-26, -57], [-18, -65], [-10, -57], [-2, -65], [6, -57], [14, -65], [22, -57], [28, -62]], 3);
  s += d.tone('M-25.6,-57.4C-26,-53 -25,-49.4 -23.6,-49.4C-22.2,-49.4 -21.6,-53 -22.2,-56Z', MUSTARD, 1, [-0.3, -0.3]);
  s += d.tone('M5,-57C4.8,-52 5.8,-48.4 7,-48.4C8.2,-48.4 8.8,-52 8,-56Z', MUSTARD, 1, [-0.3, -0.3]);
  s += relish([[-20, -80], [18, -82], [-2, -52], [20, -44], [-24, -40], [-4, -76]]);
  return s;
}

function bigHead(d: Doc, u: number, back: boolean, e: Expr): string {
  let s = '';
  // shaggy skull with a pointy crest
  const skullD =
    'M-16.6,2C-17.6,-8 -14,-14 -8,-16.4L-4,-22L-1,-17.6L2.6,-23.6L5.6,-17.4L10,-20.6L11,-15C16,-12 18.4,-6 17.6,1.6' +
    furTufts([[17.6, 1.6], [14, 12], [2, 17]], 1.6).replace(/^M/, 'L') +
    furTufts([[2, 17], [-12, 13], [-16.6, 2]], 1.6).replace(/^M/, 'L') +
    'Z';
  s += d.shaded(skullD, BF[0], BF[1], OW * u, [-1.4, -1.4]);
  if (back) {
    s += S('M-8,-10q-1,5 0,10M2,-14q-1,6 0,12M10,-9q0,5 -1,9', 1 * u, BF[1]);
    s += mustardZig([[-14, -12], [-9, -17], [-4, -11], [1, -18], [6, -11], [11, -16], [15, -10]], 2.6 * u);
    return s;
  }
  // green zombie face
  const faceD = 'M-11.4,-6C-11.4,-10.4 -4,-11.4 1.6,-9C7,-11.4 15.4,-10.4 15.4,-5C17,2 15.4,10.4 9.4,13.4C4,15.8 -2,15.8 -6,13.4C-11.4,10.4 -12.8,2 -11.4,-6Z';
  s += d.tone(faceD, ZSK, OW * 0.9 * u, [-0.8, -0.8]);
  s += P(ell(-8, 6, 2.2, 1.4), PATCH);
  // heavy furry brow
  s += P('M-12.4,-8.6C-7,-12.8 -1,-10.6 1.6,-8C5,-11.6 12.6,-12.8 16.6,-7.6L15.6,-4C11.6,-7 6,-6.6 1.6,-4.4C-2,-7 -7.4,-7.6 -11.6,-4.6Z', BF[1], 1 * u);
  s += zombieEyes(d, u, e, ZSK[1], [-4.4, -0.8], [7.4, -1.2], 3.9, 3.3);
  // big ape nose
  s += d.tone('M-1,3.6C-1,0.6 1,-1 2.6,-0.8C4.4,-1 6.4,0.6 6.4,3.6C5.4,5 0,5 -1,3.6Z', [ZSK[1], ZDEEP], 1 * u, [-0.3, -0.3]);
  s += `<circle cx="1.2" cy="3.2" r="0.7" fill="${ZDEEP}"/><circle cx="4.4" cy="3.2" r="0.7" fill="${ZDEEP}"/>`;
  if (e === 'chomp') {
    const m = 'M-7,6C-2,5 9,4.8 13,6C14,12.4 10,18 3,18.2C-4,18.2 -8,12.4 -7,6Z';
    s += P(m, MOUTH, 1.2 * u) + d.clip(m, P(ell(3, 17.4, 6, 3), TONGUE));
    for (const x of [-5, -1.4, 2.4, 6.2, 9.6]) s += tooth(x, 5.8, 2.6, 3, true, 0.8 * u);
    for (const x of [-2, 3, 7.6]) s += tooth(x, 16.6, 2.4, 2.6, false, 0.8 * u);
    s += drool(-5.6, 12.4, 4.6, 1.8, 0.9 * u);
  } else if (e === 'sleep') {
    s += P(ell(3.4, 9.8, 3, 2.4), MOUTH, 1.2 * u) + drool(5.4, 11, 5.6, 1.9, 0.9 * u);
    s += S('M-9,8.4q1.4,1 3,0.4', 0.8 * u, ZDEEP);
  } else {
    // huge gap-toothed goofy grin
    const m = 'M-7.4,6.8C-2,8.4 8,8.4 13.4,5.8C12.6,13 7,15.4 2.6,15.4C-2,15.4 -6.4,13 -7.4,6.8Z';
    s += P(m, MOUTH, 1.2 * u) + d.clip(m, P('M-9,4H15V10H-9Z', TOOTH) + S('M-3.6,6V10M1,6.6V10.2M7.6,6.4V10', 0.7 * u) + P(rrect(3, 6.4, 2.6, 4, 0.4), MOUTH) + P(ell(3, 15.4, 5, 2.6), TONGUE));
    if (e === 'dazed') s += d.tone('M4,11.4C3.6,15.4 5,19 7,18.8C9,18.6 9.2,15.4 8.6,11.4Z', [TONGUE, '#C24E6C'], 1 * u, [-0.3, -0.3]);
    else s += drool(10.6, 9.8, 4.4, 1.6, 0.9 * u);
  }
  s += stitches(9.6, -9.6, 14.2, -4.4, 2, 1.1, 0.8 * u);
  // mustard "hairdo" + a drip down the forehead
  s += mustardZig([[-14, -12], [-9, -17], [-4, -11], [1, -18], [6, -11], [11, -16], [15, -10]], 2.6 * u);
  s += d.tone('M-4.6,-11.2C-5,-8.6 -4.4,-6.6 -3.4,-6.6C-2.4,-6.6 -2,-8.6 -2.6,-10.6Z', MUSTARD, 0.9 * u, [-0.3, -0.3]);
  s += relish([[-12, -19], [9, -21.6], [16.6, -8]], u);
  return s;
}

export function buildBigfoot(id: string): CharArt {
  const B: Biped = {
    rig: RIG_BIG,
    height: 129,
    leg: { pants: BF, shoe: BF },
    legPaint: bigLeg,
    legBox: (side) => [side * 10.4 - 15, -43, side * 10.4 + 31, 3],
    arm: {
      skin: ZSK,
      sleeve: BF,
      kind: 'long',
      claws: '#F2EBC0',
      extra: (_d, side) =>
        P(`M${f(side * 25.4 + side * 6)},-62l${f(side * 4)},1.6l${f(-side * 3.4)},1.4M${f(side * 25.4 + side * 6.8)},-53l${f(side * 3.6)},1.6l${f(-side * 3)},1.2M${f(side * 25.4 - side * 4.6)},-58l${f(-side * 3.4)},1.4l${f(side * 3)},1.2`, BF[1], 1),
    },
    torso: bigTorso,
    torsoBox: [-38, -117, 38, -20],
    head: bigHead,
    headBox: [-21, -27, 22, 22],
    faces: ZFACES,
  };
  return buildBiped(id, B);
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

// ---------------------------------------------------------------- Guard dog (rival bulldog)
const BULL: Tone = ['#F4EBDD', '#D6C6AE'];
const BULL_PATCH: Tone = ['#C0803E', '#94582A'];

function bullHead(d: Doc, e: Expr): string {
  const cx = 16.4;
  const cy = -29.6;
  let s = '';
  // rose ears
  s += d.tone(`M${cx - 10},${cy - 6}C${cx - 15},${cy - 9} ${cx - 15},${cy - 2} ${cx - 11.4},${cy - 0.6}Z`, BULL_PATCH, OW * 0.9, [-0.3, -0.3]);
  s += d.tone(`M${cx + 5},${cy - 10}C${cx + 9},${cy - 14.6} ${cx + 13},${cy - 10} ${cx + 10.4},${cy - 6.6}Z`, BULL_PATCH, OW * 0.9, [-0.3, -0.3]);
  const hd = `M${cx - 12.4},${cy - 1}C${cx - 13},${cy - 9} ${cx - 6},${cy - 12.4} ${cx + 1},${cy - 12.4}C${cx + 9},${cy - 12.4} ${cx + 14.6},${cy - 8} ${cx + 14},${cy}C${cx + 14},${cy + 7} ${cx + 9},${cy + 11.4} ${cx + 1},${cy + 11.4}C${cx - 7},${cy + 11.4} ${cx - 12.4},${cy + 6} ${cx - 12.4},${cy - 1}Z`;
  s += d.shaded(hd, BULL[0], BULL[1], OW, [-1.4, -1.2]);
  // brown patch over the far eye
  s += d.clip(hd, P(ell(cx + 8, cy - 5, 6, 5.4), BULL_PATCH[0]));
  s += S(hd, OW);
  s += S(`M${cx - 3},${cy - 9}q2,-1 4,0M${cx - 2},${cy - 7}q2,-1 3.6,0`, 0.8, BULL[1]);
  // eyes (angry, normal human-side dog)
  const E1: Pt = [cx - 4.4, cy - 3.4];
  const E2: Pt = [cx + 6.6, cy - 4];
  if (e === 'dazed') {
    s += P(ell(E1[0], E1[1], 2.8, 2.8), '#FFFFFF', 1) + spiral(E1[0], E1[1], 2.2, 0.8, 2) + P(ell(E2[0], E2[1], 2.4, 2.4), '#FFFFFF', 1) + spiral(E2[0], E2[1], 1.9, 0.8, 1.8);
  } else {
    s += P(ell(E1[0], E1[1], 2.4, 2.4), '#FFFFFF', 1) + `<circle cx="${f(E1[0] + 0.6)}" cy="${f(E1[1] + 0.3)}" r="1.2" fill="${OUT}"/>`;
    s += P(ell(E2[0], E2[1], 2.1, 2.1), '#FFFFFF', 1) + `<circle cx="${f(E2[0] + 0.4)}" cy="${f(E2[1] + 0.3)}" r="1.1" fill="${OUT}"/>`;
    s += S(`M${f(E1[0] - 3)},${f(E1[1] - 3.6)}L${f(E1[0] + 2.6)},${f(E1[1] - 1.6)}M${f(E2[0] - 2)},${f(E2[1] - 1.8)}L${f(E2[0] + 3)},${f(E2[1] - 3.6)}`, 1.6);
  }
  // squashed nose + jowls + underbite
  s += P(ell(cx + 4.4, cy + 1.4, 3, 2), '#2B2422', 1) + hl(cx + 3.6, cy + 0.8, 0.9, 0.5, 0, 0.8);
  if (e === 'chomp') {
    const m = `M${cx - 4},${cy + 4}C${cx},${cy + 3} ${cx + 9},${cy + 3} ${cx + 12},${cy + 4.4}C${cx + 12},${cy + 12} ${cx + 8},${cy + 15} ${cx + 3.6},${cy + 15}C${cx - 1},${cy + 15} ${cx - 4.6},${cy + 11} ${cx - 4},${cy + 4}Z`;
    s += P(m, MOUTH, 1.2) + d.clip(m, P(ell(cx + 4, cy + 15, 5, 2.6), TONGUE));
    for (const x of [-2, 2, 6, 9.6]) s += tooth(cx + x, cy + 4, 2, 2.4, true, 0.7);
    s += tooth(cx - 1.4, cy + 13.4, 2.2, 3.4, false, 0.8) + tooth(cx + 8, cy + 13.4, 2.2, 3.4, false, 0.8);
  } else {
    s += d.tone(`M${cx - 6},${cy + 4}C${cx - 6},${cy + 9} ${cx},${cy + 11} ${cx + 4},${cy + 11}C${cx + 9},${cy + 11} ${cx + 12.6},${cy + 8} ${cx + 12.6},${cy + 4}C${cx + 9},${cy + 6.4} ${cx},${cy + 6.4} ${cx - 6},${cy + 4}Z`, BULL, 1.1, [-0.4, -0.4]);
    s += S(`M${cx - 5},${cy + 4.6}Q${cx + 3.6},${cy + 7.4} ${cx + 12},${cy + 4.6}`, 1.1);
    s += tooth(cx - 2, cy + 5.6, 2, 3, false, 0.8) + tooth(cx + 7.6, cy + 5.8, 2, 3, false, 0.8);
    if (e === 'dazed') s += d.tone(`M${cx + 2},${cy + 6}C${cx + 1.6},${cy + 10.6} ${cx + 3},${cy + 13} ${cx + 5},${cy + 12.6}C${cx + 6.6},${cy + 12.2} ${cx + 6.6},${cy + 9} ${cx + 6},${cy + 6}Z`, [TONGUE, '#C24E6C'], 1, [-0.3, -0.3]);
  }
  return s;
}

function buildBulldog(id: string): CharArt {
  const hips = { BL: [-18, -14] as Pt, BR: [-14, -16.4] as Pt, FL: [5, -14.4] as Pt, FR: [9.4, -16.6] as Pt };
  const lenOf = (w: string) => (w.endsWith('R') ? 16.4 : 14);
  const bow = (w: string) => (w.startsWith('F') ? -1.6 : 0);
  return quad(id, {
    height: 44,
    hips,
    legBox: (w) => quadLegBox(hips[w], lenOf(w), 7.6, bow(w)),
    leg: (d, w) => dogLeg(d, hips[w], lenOf(w), 7.6, BULL, w.endsWith('R'), undefined, bow(w)),
    body: (d) => {
      const b = 'M-25,-21C-26,-28 -20,-31 -12,-31C-4,-31 4,-34 11,-32C17,-30 18,-22 15,-17C11,-12 2,-11 -8,-11.4C-18,-11.6 -24.4,-15 -25,-21Z';
      let s = d.tone(b, BULL, OW, [-1.4, -1.4]);
      s += d.clip(b, P(ell(-12, -28, 8, 5), BULL_PATCH[0]) + P(ell(-12, -26, 8, 4), BULL_PATCH[1], 0, OUT, 'opacity="0.3"'));
      s += S(b, OW);
      s += S('M6,-22q3,1.6 6,0M5,-19q3,1.4 6,0', 0.8, BULL[1]);
      // spiked collar
      s += d.tone('M4,-33.6C7,-36.6 14,-36 17,-31.6L15.4,-28.6C12.4,-32 8,-32.6 5.4,-30.4Z', ['#2E2A2C', '#161416'], 1.1, [-0.3, -0.3]);
      for (const [x, y, r] of [[6.4, -34.8, -40], [9.6, -36, -10], [13, -35.4, 20], [15.8, -33, 50]] as [number, number, number][]) {
        s += G(P('M-1.3,0.4L0,-3L1.3,0.4Z', '#E6EBF0', 0.7), `translate(${x} ${y}) rotate(${r})`);
      }
      s += P(ell(11, -30.4, 1.6, 1.8), '#FFC83D', 0.8);
      return s;
    },
    bodyPivot: [-5, -21],
    bodyBox: [-29, -41, 22, -7],
    tail: (d) => {
      const t = 'M-24,-24C-27.6,-25 -29,-28.6 -26.6,-30.4C-24.6,-31.6 -23,-29 -24.6,-27.8';
      return S(t, 4.6, OUT) + S(t, 2.6, BULL[0]) + d.tone(ell(-24, -24, 0.1, 0.1), BULL, 0);
    },
    tailPivot: [-24, -24],
    tailBox: [-32, -35, -20, -20],
    head: bullHead,
    neck: [9, -26],
    headBox: [-1, -47, 34, -13],
    faces: ['chomp', 'dazed'],
  });
}

export function buildQuad(id: string): CharArt {
  if (id === 'pet_pug') return buildPug(id);
  if (id === 'pet_rotweiler') return buildRot(id);
  if (id === 'guard_dog') return buildBulldog(id);
  throw new Error(`Unknown quad id: ${id}`);
}

