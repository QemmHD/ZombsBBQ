/**
 * Raid cast: rival Head Chef bosses, rival waiters, the Big Foot-Long summon, the Werewoof pet,
 * and the four-legged dogs (guard dog, Zombie Pug, Rot-weiler).
 *
 * Bipeds use the same cutout rig as chars.ts (root = between the feet, y up negative):
 *   parts      armR, legR, legL, torso, head, armL   (front 3/4, facing down-right; L = near side)
 *   backParts  armL, legL, legR, torso, head, armR   (back 3/4, facing up-right; R = near side)
 *   faces      expression heads placed exactly like 'head'
 * Bosses (~92 tall body) scale the rig by ~1.18 and are chunkier; every boss and waiter holds a
 * signature weapon in armL (rest angle ~35-40 deg forward-down so an attack swing of armL -110 deg
 * raises it overhead). Quads: see raidcastpets.ts for the rig.
 */
import type { CharArt, FaceName } from './types';
import { RAID_CHAR_IDS } from './manifest';
import { Doc, OUT, OW, P, S, G, ell, f, hl, rrect, zigzag } from './svg';
import type { Pt, Tone } from './svg';
import {
  GOLD,
  RIG_STD,
  STEEL,
  WHITE,
  bodyD,
  buildBiped,
  darker,
  gingham,
  humanFace,
  neckArt,
  OS,
  skull,
  stain,
  star,
  stripes,
  wpnBaguette,
  wpnCarrot,
  wpnDrumstick,
  wpnMallet,
  wpnRollingPin,
  wpnSpatula,
  wpnTray,
} from './raidcastkit';
import type { Biped, Box, Expr, FaceStyle, Rig } from './raidcastkit';
import { buildBigfoot, buildWerewoof, buildQuad } from './raidcastpets';

export { RAID_CHAR_IDS };

const HUMAN: (FaceName & Expr)[] = ['scream', 'shock', 'happy', 'dazed'];

// ------------------------------------------------------------------ rigs
/** Boss rig: the joint rig scaled ~1.18, with a chunkier body. */
const RIG_BOSS: Rig = {
  hip: [-5.6, -23],
  ankleY: -5.4,
  legW: 8.8,
  sh: [-14, -48.4],
  hand: [-17.4, -30.6],
  armW: 9,
  handR: 4.7,
  neck: [0.6, -52.4],
  torso: [0, -19],
  hc: [1.2, -69.6],
  hk: 1.16,
};
const RIG_HANK: Rig = { ...RIG_BOSS, hip: [-6.2, -23], legW: 9.8, sh: [-15.4, -48.2], hand: [-19.6, -31], armW: 10.6, handR: 5.3 };
const RIG_SNOB: Rig = { ...RIG_BOSS, hip: [-5, -23.4], legW: 7.6, sh: [-12.6, -48.8], hand: [-15.4, -31.2], armW: 8, handR: 4.4 };

const TOP = -54.6; // boss shoulder line
const BOT = -19; // boss torso hem
const BOSS_TORSO_BOX: Box = [-25, -62, 25, -10];
const STAFF_TORSO_BOX: Box = [-19, -53, 19, -6];

/** Hats jump off the head when the wearer is hit or shocked. */
const popHat = (e: Expr, s: string, rot = -6): string =>
  e === 'scream' || e === 'shock' ? G(s, `translate(0 ${e === 'shock' ? -6 : -4}) rotate(${rot} 1 -10)`) : e === 'dazed' ? G(s, 'rotate(9 1 -10) translate(1 1.4)') : s;

/** Back-of-head short hair (local frame). */
function hairBack(d: Doc, u: number, t: Tone, top = -16.4, nape = 9.4, rx = 16.6): string {
  const p =
    `M${f(-rx)},${f(0)}C${f(-rx - 0.6)},${f(top * 0.7)} ${f(-rx * 0.6)},${f(top)} 0.6,${f(top)}C${f(rx * 0.6)},${f(top)} ${f(rx + 0.4)},${f(top * 0.7)} ${f(rx - 1.4)},0` +
    `C${f(rx - 2.4)},${f(nape * 0.6)} ${f(rx * 0.5)},${f(nape)} 0.6,${f(nape + 0.6)}C${f(-rx * 0.5)},${f(nape)} ${f(-rx + 0.6)},${f(nape * 0.6)} ${f(-rx)},0Z`;
  return d.tone(p, t, OW * u, [-1, -1]) + S(`M-4,${f(top + 3)}Q-1,${f(top * 0.3)} -2.6,${f(nape - 2)}M5,${f(top + 3)}Q7,${f(top * 0.3)} 5.6,${f(nape - 2.6)}`, 0.9 * u, t[1]);
}

/** Ear drawn on the screen-right side for back views (after the hair). */
function backEar(d: Doc, u: number, sk: Tone, x = 15.9): string {
  return d.tone(ell(x, 2.3, 3, 3.9), sk, OW * 0.9 * u, [0.5, -0.5]) + S(`M${f(x - 0.4)},0.4q1.4,1.4 0,3`, 0.9 * u, darker(sk[1]));
}

// ------------------------------------------------------------------ shared torso bits
function beltArt(d: Doc, td: string, y: number, belt: string, buckle?: string, big = false): string {
  let s = d.clip(td, P(`M-30,${f(y - 1.6)}H30V${f(y + 1.6)}H-30Z`, belt) + S(`M-30,${f(y - 1.6)}H30M-30,${f(y + 1.6)}H30`, 0.9));
  if (buckle) s += big ? P(ell(0.8, y, 3.6, 2.6), buckle, 1) + P(ell(0.8, y, 1.8, 1.1), darker(buckle, 0.8), 0) : P(rrect(-0.8, y - 2, 3.2, 4, 0.6), buckle, 0.9);
  return s;
}

/** Apron bow seen from behind. */
function bowBack(d: Doc, x: number, y: number, col: Tone, s = 1): string {
  const loop = (dir: number) =>
    `M${f(x)},${f(y)}C${f(x + dir * 3 * s)},${f(y - 4 * s)} ${f(x + dir * 7 * s)},${f(y - 3 * s)} ${f(x + dir * 6.4 * s)},${f(y)}C${f(x + dir * 7 * s)},${f(y + 3 * s)} ${f(x + dir * 3 * s)},${f(y + 3.4 * s)} ${f(x)},${f(y)}Z`;
  const tail = (dir: number) => `M${f(x)},${f(y)}L${f(x + dir * 2.6 * s)},${f(y + 8 * s)}L${f(x + dir * 4.4 * s)},${f(y + 7 * s)}Z`;
  return d.tone(tail(-1), col, 1.1, [-0.3, -0.3]) + d.tone(tail(1), col, 1.1, [-0.3, -0.3]) + d.tone(loop(-1), col, 1.1, [-0.3, -0.3]) + d.tone(loop(1), col, 1.1, [-0.3, -0.3]) + P(ell(x, y, 1.6 * s, 1.4 * s), col[1], 1);
}

function flower(cx: number, cy: number, r: number, petal: string, mid: string, u: number): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * (Math.PI / 180);
    s += P(ell(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.5, r * 0.5), petal, 0.8 * u);
  }
  return s + P(ell(cx, cy, r * 0.42, r * 0.42), mid, 0.8 * u);
}

// ================================================================== CHUCK (cowboy chef)
const CH_SK: Tone = ['#F2BE94', '#D49468'];
const CH_HAT: Tone = ['#C98B4A', '#9A6230'];
const CH_HAIR: Tone = ['#A89A8C', '#7E7064'];
const CH_STACHE: Tone = ['#B8AA9C', '#857668'];
const CH_SHIRT: Tone = ['#D9483B', '#AE3329'];
const CH_VEST: Tone = ['#7A4A2A', '#5A341C'];
const CH_BANDANA: Tone = ['#3D7DD8', '#2B5DA8'];

function chuckHat(d: Doc, u: number, back: boolean, scale = 1, hat: Tone = CH_HAT, band = true): string {
  const crown =
    'M-12.6,-9C-13.6,-17 -12,-25.6 -7.4,-29.4C-4.6,-27.4 -1.6,-26.8 1.4,-28.6C4.4,-26.8 7.4,-27.4 10,-29.8C14.6,-26 16.4,-17 15.4,-9Z';
  let s = d.tone(crown, hat, OW * u, [-1.4, -1.2]);
  if (band) {
    // a hatband made of bacon
    s += d.clip(crown, P('M-20,-15.4H22V-10H-20Z', '#C2453A') + S('M-20,-12.8q2.4,-1.6 4.8,0t4.8,0t4.8,0t4.8,0t4.8,0t4.8,0t4.8,0t4.8,0t4.8,0', 1.1 * u, '#F6C9A8')) + S(crown, OW * u);
    s += S('M-14,-15.4H17', 0.9 * u);
  } else {
    s += d.clip(crown, P('M-20,-14.4H22V-11H-20Z', darker(hat[1], 0.7))) + S(crown, OW * u);
  }
  s += S(back ? 'M1.4,-28.2Q0.6,-21 1.4,-15.6' : 'M1.4,-28.2Q2.2,-21 1.2,-15.6', 1.1 * u, darker(hat[1], 0.85));
  s += hl(-8.6, -21, 1.2, 4, 10, 0.4);
  const brim =
    'M-27.4,-11.6C-29.6,-16.6 -25.4,-18.4 -22.6,-14.6C-15,-8.6 17,-8.4 24.6,-14.8C27.4,-18.6 32,-16.4 29.4,-11.4C25.4,-3.4 -23.4,-3.2 -27.4,-11.6Z';
  s += d.tone(brim, hat, OW * u, [-0.8, -1.4]);
  s += S('M-23.6,-12.4C-14,-6.8 16,-6.6 25.6,-12.6', 0.9 * u, darker(hat[1], 0.85));
  return scale === 1 ? s : G(s, `translate(1 -9) scale(${f(scale)}) translate(-1 9)`);
}

function chuckStache(d: Doc, u: number): string {
  const body =
    'M3.4,5.6C0.4,3.6 -4.8,4.6 -7.4,7C-4.6,9 0.6,8.8 3.4,7.8C6.2,8.8 11.2,9 13.6,6.8C11,4.4 6.4,3.6 3.4,5.6Z';
  let s = OS('M-7,7C-10.2,7.4 -11.2,3.8 -9,2.8C-7.6,2.2 -6.8,3.6 -7.8,4.2', 1.9 * u, CH_STACHE[0], 1.1 * u);
  s += OS('M13.2,6.8C16.2,7 17.2,3.4 15,2.6C13.6,2 12.8,3.4 13.8,4', 1.9 * u, CH_STACHE[0], 1.1 * u);
  s += d.tone(body, CH_STACHE, 1.2 * u, [-0.4, -0.5]);
  s += S('M0,5.6Q-2.6,5.6 -4.6,6.8M7,5.6Q9.6,5.4 11.4,6.6', 0.6 * u, CH_STACHE[1]);
  return s;
}

const CHUCK_FACE: FaceStyle = {
  skin: CH_SK,
  brow: '#8E8278',
  browW: 2,
  mood: 'grin',
  nose: 'bulb',
  noseCol: ['#F0907E', '#CF6656'],
  mouthDy: 1.4,
  dazed: 'spiral',
  blush: true,
};

function headChuck(d: Doc, u: number, back: boolean, e: Expr): string {
  let s = '';
  if (back) {
    s += skull(d, u, CH_SK, true, 1.15, 16.5, 15.5, false);
    s += hairBack(d, u, CH_HAIR, -14, 11.6, 16.4);
    s += backEar(d, u, CH_SK);
    // the bandana knot peeks out at the nape
    s += d.tone('M-3,12.6L5,12.6L3.4,18.4L1,16.4L-1.6,18.6Z', CH_BANDANA, 1.1 * u, [-0.3, -0.3]);
    return s + chuckHat(d, u, true);
  }
  s += skull(d, u, CH_SK, false, 1.15);
  s += d.tone('M-16.6,-6.4C-17.2,-2 -16.6,2.6 -15.2,5.6L-12.6,5.2L-12.2,-6.4Z', CH_HAIR, 1.2 * u, [-0.4, -0.4]);
  s += humanFace(d, u, e, CHUCK_FACE);
  s += chuckStache(d, u);
  s += P('M-1.2,15.2q2,1.4 3.6,0.2', 'none', 0.9 * u, darker(CH_SK[1]));
  return s + popHat(e, chuckHat(d, u, false));
}

function torsoChuck(d: Doc, back: boolean): string {
  const td = bodyD(14.6, 16.8, TOP, BOT, 1.4);
  let s = neckArt(d, RIG_BOSS, CH_SK, 9.4, 8);
  s += d.tone(td, CH_SHIRT);
  s += d.clip(td, gingham(-24, -60, 24, -12, 2.2, '#FFFFFF', 0.3)) + S(td, OW);
  if (back) {
    s += d.clip(td, d.tone('M-22,-60H22V-28H-22Z', CH_VEST, OW * 0.9));
    s += S('M-14.4,-46Q0.6,-49 15.6,-46', 0.8, '#E8C79A', 'stroke-dasharray="1.4 1.2"');
    s += d.clip(td, P('M-24,-27H24V-12H-24Z', '#4E6E9E') + P('M5,-27H24V-12H5Z', '#3A5480') + S('M0.6,-24V-12', 0.9));
    s += beltArt(d, td, -27.4, '#3A2618');
    s += bowBack(d, 0.6, -26.4, WHITE, 1);
    s += S(td, OW);
    return s;
  }
  // bandana
  s += d.tone('M-6.8,-55.2L8,-55.2L1.6,-44.4Z', CH_BANDANA, OW * 0.8, [-0.4, -0.4]);
  s += `<circle cx="-1.6" cy="-51.6" r="0.7" fill="#FFFFFF"/><circle cx="3.2" cy="-50.4" r="0.7" fill="#FFFFFF"/><circle cx="1.2" cy="-47.4" r="0.6" fill="#FFFFFF"/>`;
  // leather vest with fringe
  const vl = 'M-15.4,-50.6C-15,-54 -12.6,-55.6 -9.4,-55.6L-6,-55.6L-2.2,-40L-4,-27.6L-18.6,-27.6C-18,-36 -16,-45 -15.4,-50.6Z';
  const vr = 'M15.6,-50.6C15.2,-54 13,-55.6 9.8,-55.6L7,-55.6L3.4,-40L5,-27.6L19.6,-27.6C19,-36 16.6,-45 15.6,-50.6Z';
  s += d.clip(td, d.tone(vl, CH_VEST, OW * 0.9) + d.tone(vr, CH_VEST, OW * 0.9));
  s += S('M-6.6,-54L-3.4,-40.4L-5,-29M7.6,-54L4.6,-40.4L6.2,-29', 0.7, '#E8C79A', 'stroke-dasharray="1.4 1.2"');
  // sheriff-style CHEF star
  s += P(star(-9.4, -42.6, 3.6, 1.7), GOLD[0], 1) + `<circle cx="-9.4" cy="-42.6" r="0.9" fill="${GOLD[1]}"/>`;
  s += S(td, OW);
  s += beltArt(d, td, -28, '#3A2618');
  // half apron (over the thighs) with BBQ sauce stains
  const ap = 'M-15.4,-26.6L15.8,-26.6L17,-13C11,-11.8 -9.6,-11.8 -16.4,-13Z';
  s += d.tone(ap, WHITE, OW * 0.85, [-1, -1]);
  s += stain(-7, -19, 1.1, '#A8432A') + stain(8, -16.6, 0.7, '#A8432A', 0.7) + stain(3.4, -23, 0.5, '#8A5A2A', 0.6);
  // the big steer-horn buckle sits over the apron string
  s += P(ell(0.8, -28, 4, 2.8), GOLD[0], 1.1) + S('M-1.8,-28.4Q0.8,-26.6 3.4,-28.4M-2.6,-29.4L-4,-30.6M4.2,-29.4L5.6,-30.6', 0.8, GOLD[1] === '#D9971A' ? '#8A5A14' : OUT);
  return s;
}

function chuckBoss(): Biped {
  return {
    rig: RIG_BOSS,
    height: 106,
    leg: { pants: ['#4E6E9E', '#3A5480'], shoe: ['#8A4E26', '#62341A'], shoeKind: 'boot', spur: true },
    legK: 1.15,
    arm: { skin: CH_SK, sleeve: CH_SHIRT, kind: 'rolled' },
    weapon: wpnSpatula(),
    torso: torsoChuck,
    torsoBox: BOSS_TORSO_BOX,
    head: headChuck,
    headBox: [-31, -44, 34, 20],
    faces: HUMAN,
  };
}

// ================================================================== BIG HANK (burger flipper)
const HK_SK: Tone = ['#EAA67C', '#C7805A'];
const HK_HAIR: Tone = ['#4A3A32', '#2E2420'];

function hankCap(d: Doc, u: number, back: boolean): string {
  const cap = 'M-15,-7.8L-13,-19.4Q1.4,-25.4 17,-19.8L17.6,-7.8Q1.4,-11.4 -15,-7.8Z';
  let s = d.tone(cap, WHITE, OW * u, [-1, -1]);
  s += d.clip(cap, P('M-20,-12.4Q1.4,-15.6 22,-12.2V-4H-20Z', '#D7262E')) + S(cap, OW * u);
  s += S('M-13,-19.4Q1.4,-21.6 17,-19.8', 1 * u, '#BFB7A6');
  if (!back) {
    // tiny burger logo
    s += P('M6.6,-16.4C6.6,-19 11.6,-19 11.6,-16.4Z', '#E8A04A', 0.7 * u) + P(rrect(6.4, -16.4, 5.4, 1, 0.4), '#7A3E1C', 0.5 * u) + P('M6.6,-15.4H11.6L11.2,-14.2H7Z', '#E8A04A', 0.6 * u);
  }
  return s;
}

const HANK_FACE: FaceStyle = { skin: HK_SK, brow: '#3A2A22', browW: 1.6, mood: 'scowl', unibrow: true, nose: 'wide', teeth: 'gold', dazed: 'spiral' };

function headHank(d: Doc, u: number, back: boolean, e: Expr): string {
  let s = '';
  if (back) {
    s += skull(d, u, HK_SK, true, 1.32, 17, 15.5, false);
    s += hairBack(d, u, HK_HAIR, -15.4, 3.6, 16.8);
    s += backEar(d, u, HK_SK, 16.4);
    // beefy neck rolls
    s += S('M-9,12.4Q0.6,15 10,12.2M-7,15.2Q0.6,17.4 8,15', 1.1 * u, darker(HK_SK[1]));
    return s + hankCap(d, u, true);
  }
  s += skull(d, u, HK_SK, false, 1.32, 17, 15.5);
  // stubble
  s += P('M-15.4,4C-13.4,13 -6,16.8 1,16.8C9,16.8 15.6,12.6 16.8,4C12,9 6,8.6 1,7.4C-5,8.6 -11,8.4 -15.4,4Z', '#6F5A55', 0, OUT, 'opacity="0.2"');
  s += d.tone('M-16.8,-3C-17.2,-8 -15,-12 -11.6,-13L-11,-6C-12.6,-5 -13.6,-2 -13.8,1Z', HK_HAIR, 1.2 * u, [-0.4, -0.4]);
  s += humanFace(d, u, e, HANK_FACE);
  if (e === 'normal') s += OS('M8.6,10.6L15.4,8.2', 0.9 * u, '#E8C891', 0.9 * u);
  // a sticking plaster on the forehead
  s += G(P(rrect(-3, -1.4, 6, 2.8, 1), '#F2C9A0', 0.9 * u) + S('M-0.6,-1V1M0.6,-1V1', 0.5 * u, '#C99A70'), 'translate(11.6 -6.4) rotate(-20)');
  return s + popHat(e, hankCap(d, u, false), 8);
}

function torsoHank(d: Doc, back: boolean): string {
  const td = bodyD(16.6, 18, TOP, BOT, 1.6);
  let s = neckArt(d, RIG_HANK, HK_SK, 11.6, 8);
  s += d.tone(td, WHITE);
  if (back) {
    // sweaty tee, apron neck strap + big bow
    s += P(ell(0.6, -46, 5, 3.4), '#C9D6E0', 0, OUT, 'opacity="0.55"');
    s += S('M-5,-55.4Q0.6,-50 6,-55.4', 2, '#D9561A');
    s += d.clip(td, P('M-24,-25.4H24V-12H-24Z', '#4A4F57') + S('M0.6,-24V-12', 0.9));
    s += d.clip(td, P('M-24,-28.6H24V-25.4H-24Z', '#E8862A') + S('M-24,-28.6H24M-24,-25.4H24', 0.9));
    s += bowBack(d, 0.6, -27, ['#FFB21F', '#E0861A'], 1.1);
    s += S(td, OW);
    return s;
  }
  // tee collar
  s += P('M-5.4,-55.4Q0.6,-50.6 6.6,-55.4', 'none', 1.2);
  // the burger apron: bun, lettuce, cheese, patty, tomato, bun
  const ap = 'M-11.4,-49.6C-11.4,-52.6 12.6,-52.6 12.6,-49.6L16.6,-14C9,-11.6 -8,-11.6 -15.4,-14Z';
  s += S('M-10.6,-50.4L-5.6,-56M11.8,-50.4L6.8,-56', 1.6, '#D9561A');
  const layers =
    P('M-20,-56H22V-41.6Q1,-39.4 -20,-41.6Z', '#E8A04A') +
    [[-6, -48], [-1, -50], [4, -47.4], [8.6, -49.6], [-3, -45], [2.6, -44]].map(([x, y]) => P(ell(x, y, 0.9, 0.55), '#FFF6D8')).join('') +
    P(zigzag([-20, -40], [22, -40], 9, 2.2).map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)},${f(y)}`).join('') + 'L22,-37L-20,-37Z', '#6FC23A') +
    P('M-20,-38H22V-34.6H-20Z', '#FFC83D') +
    P('M-6,-34.8L-3,-31.4L0,-34.8ZM6,-34.8L8.4,-32L10.6,-34.8Z', '#FFC83D') +
    P('M-20,-34.6H22V-26.6Q1,-24.6 -20,-26.6Z', '#7A3E1C') +
    S('M-12,-31.2l2,-1M-4,-29.6l2.4,-0.6M6,-31l2,0.6M12,-29l1.6,-1.2', 0.8, '#5A2A12') +
    P('M-20,-26.4Q1,-24.4 22,-26.4V-22.6Q1,-21 -20,-22.6Z', '#E2453C') +
    P('M-20,-22.6Q1,-21 22,-22.6V-10H-20Z', '#E8A04A');
  s += d.clip(ap, layers) + P(ap, 'none', OW * 0.85) + d.clip(ap, P('M5,-56H22V-10H5Z', OUT, 0, OUT, 'opacity="0.1"'));
  s += hl(-4, -49, 4, 1, -6, 0.5);
  s += S(td, OW);
  return s;
}

function hankBoss(): Biped {
  const tattoo = (_d: Doc, side: -1 | 1, back: boolean) => {
    if (side !== -1 || back) return '';
    // heart-with-a-burger tattoo on the near forearm
    const x = -18.4;
    const y = -38.4;
    return P(`M${f(x)},${f(y + 2.4)}C${f(x - 3)},${f(y)} ${f(x - 2.6)},${f(y - 2.6)} ${f(x)},${f(y - 1.2)}C${f(x + 2.6)},${f(y - 2.6)} ${f(x + 3)},${f(y)} ${f(x)},${f(y + 2.4)}Z`, '#D7262E', 0.7, '#2E4A7A') +
      S(`M${f(x - 1.4)},${f(y - 0.4)}H${f(x + 1.4)}`, 0.7, '#E8A04A');
  };
  return {
    rig: RIG_HANK,
    height: 97,
    leg: {
      pants: ['#4A4F57', '#34383E'],
      shoe: ['#2A2A32', '#14141A'],
      shoeKind: 'clog',
      pattern: () => gingham(-20, -30, 20, 2, 1.6, '#FFFFFF', 0.18),
    },
    legK: 1.18,
    arm: { skin: HK_SK, sleeve: WHITE, kind: 'short', extra: tattoo },
    weapon: wpnMallet(),
    torso: torsoHank,
    torsoBox: BOSS_TORSO_BOX,
    head: headHank,
    headBox: [-22, -38, 24, 21],
    faces: HUMAN,
  };
}

// ================================================================== VEGAN VERA (salad fortress)
const VE_SK: Tone = ['#B87A52', '#94593A'];
const VE_HAIR: Tone = ['#8A3E22', '#62290F'];
const VE_PAINT = '#3FA83A';

function veraCrown(u: number, back: boolean): string {
  const pts: Pt[] = back
    ? [[-16, -6], [-12, -11.4], [-5, -14.6], [2, -15.4], [9, -14], [14.4, -10.4], [17, -5]]
    : [[-16.4, -5.6], [-12.4, -11.2], [-6, -14.6], [1.4, -15.6], [8.6, -14.2], [14.4, -10.4], [17.4, -5]];
  let s = S('M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L'), 1.6 * u, '#3F8A2E');
  for (let i = 0; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [x2, y2] = pts[i + 1];
    const mx = (x + x2) / 2;
    const my = (y + y2) / 2;
    s += P(`M${f(mx - 2.4)},${f(my)}Q${f(mx)},${f(my - 2.6)} ${f(mx + 2.4)},${f(my)}Q${f(mx)},${f(my + 1.4)} ${f(mx - 2.4)},${f(my)}Z`, '#5CC24A', 0.7 * u);
  }
  pts.forEach(([x, y], i) => {
    s += i % 3 === 1 ? flower(x, y, 3.6, '#FF7FB0', '#FFE14D', u) : i % 3 === 2 ? flower(x, y, 3.2, '#FFB21F', '#E05A1A', u) : flower(x, y, 3.8, '#FFFFFF', '#FFC83D', u);
  });
  return s;
}

function veraBraid(d: Doc, u: number): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += d.tone(ell(-14.6 - (i % 2) * 0.6, 7 + i * 3.6, 2.8, 2.3), VE_HAIR, 1 * u, [-0.4, -0.4]);
  s += P(rrect(-17.4, 24.4, 5.4, 1.8, 0.8), '#FF7FB0', 0.8 * u);
  s += P('M-16.6,26.2L-17.6,29.4L-14.6,28.4L-12.6,29.6L-13.2,26.2Z', VE_HAIR[0], 0.8 * u);
  return s;
}

const VERA_FACE: FaceStyle = { skin: VE_SK, brow: '#4A2414', browW: 1.7, mood: 'fierce', dazed: 'spiral' };

function headVera(d: Doc, u: number, back: boolean, e: Expr): string {
  const mane =
    'M-15.4,-9C-22.4,-4 -22.6,8 -20.6,14C-21.6,19 -18.4,23.6 -13.6,23C-9.6,24.6 -6,21.6 -5.4,18.4L8.6,18.4C9.6,22.4 15,24 18.6,21.4C22,18.6 21.4,12.4 19.6,8.6C22.2,0 20.6,-10.4 14.6,-14.6Z';
  let s = '';
  if (back) {
    s += skull(d, u, VE_SK, true, 1.1, 16.5, 15.5, false);
    s += d.tone(
      'M-17.6,2C-19,-11 -9,-17.6 1,-17.6C11,-17.6 20,-11 18.6,2C20.6,8 21.6,14 19.4,20.6C17,25.6 11,25 8.6,22C5,25.4 -3,25.4 -6.4,22C-10,25.4 -17.4,25 -19.6,20C-21.6,14 -20,7 -17.6,2Z',
      VE_HAIR,
      OW * u,
      [-1, -1],
    );
    s += S('M-11,-8Q-14,6 -12,20M-3,-12Q-5,4 -2.6,20M6,-12Q8,4 6,19M13,-8Q16,6 14,18', 0.9 * u, VE_HAIR[1]);
    return s + veraCrown(u, true);
  }
  s += d.tone(mane, VE_HAIR, OW * u, [-1, -1]);
  s += skull(d, u, VE_SK, false, 1.1);
  // kale war paint (fierce!)
  s += G(P(rrect(-2.6, -0.7, 5.2, 1.4, 0.6), VE_PAINT, 0.6 * u) + P(rrect(-2.2, 1.6, 4.4, 1.4, 0.6), VE_PAINT, 0.6 * u), 'translate(-10.4 6.6) rotate(-8)');
  s += G(P(rrect(-1.8, -0.7, 3.6, 1.3, 0.6), VE_PAINT, 0.6 * u) + P(rrect(-1.6, 1.4, 3.2, 1.3, 0.6), VE_PAINT, 0.6 * u), 'translate(12 6.6) rotate(10)');
  s += humanFace(d, u, e, VERA_FACE);
  // center-parted hair cap
  s += d.tone(
    'M-16.8,4C-18.4,-10 -9,-17.6 1,-17.6C11,-17.8 18.8,-11 17.8,1C16,-4 13.4,-8 9,-9.6C6,-8.2 3,-8.8 1.2,-11.6C-1,-8.6 -5,-7.6 -9,-8.6C-12,-6 -13.8,-1 -14,4Z',
    VE_HAIR,
    OW * u,
    [-1, -1],
  );
  s += S('M-8,-14Q-3,-15.6 1,-12.6M4,-14.6Q9,-14 12,-11', 0.9 * u, VE_HAIR[1]);
  s += veraBraid(d, u);
  // peace sign earring
  s += S('M-16.6,6.6V8.4', 0.7 * u, GOLD[1]) + P(ell(-16.6, 10.6, 2.1, 2.1), 'none', 0.8 * u, GOLD[0]) + S('M-16.6,8.6V12.6M-16.6,10.8L-18,12M-16.6,10.8L-15.2,12', 0.6 * u, GOLD[0]);
  return s + (e === 'scream' || e === 'shock' ? G(veraCrown(u, false), 'translate(0 -4) rotate(-5 1 -10)') : veraCrown(u, false));
}

function torsoVera(d: Doc, back: boolean): string {
  const td = bodyD(13.8, 15.4, TOP, BOT, 0.6);
  let s = neckArt(d, RIG_BOSS, VE_SK, 8.6, 8);
  // tie-dye shirt
  s += d.tone(td, ['#9B5FD6', '#7642AE']);
  const swirl = [
    [12, '#FF7FB0'],
    [9, '#FFE14D'],
    [6, '#4FD0C0'],
    [3, '#9B5FD6'],
  ] as [number, string][];
  s += d.clip(td, swirl.map(([r, c]) => P(ell(-4, -40, r * 1.4, r), c, 0, OUT, 'opacity="0.75"')).join('') + swirl.map(([r, c]) => P(ell(12, -24, r * 1.2, r * 0.9), c, 0, OUT, 'opacity="0.6"')).join(''));
  s += d.clip(td, P('M4,-60H24V-12H4Z', OUT, 0, OUT, 'opacity="0.12"')) + S(td, OW);
  if (back) {
    s += S('M-9.6,-54.6L9.6,-31M10.8,-54.6L-8.4,-31', 1.8, '#3F8A2E');
    s += d.clip(td, P('M-24,-24H24V-12H-24Z', '#7B4FC4') + S('M0.6,-22V-12', 0.9));
    s += bowBack(d, 0.6, -29, ['#5CB848', '#3F8A2E'], 1.1);
    return s + S(td, OW);
  }
  // bead necklace with a peace pendant
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = -6 + 13.2 * t;
    const y = -54 + Math.sin(t * Math.PI) * 6.4;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="1" fill="${['#FF7FB0', '#FFE14D', '#4FD0C0'][i % 3]}" stroke="${OUT}" stroke-width="0.6"/>`;
  }
  // green apron with a leaf
  const ap = 'M-9.4,-46.6C-9.4,-49 10.6,-49 10.6,-46.6L15.6,-13.4C8,-11.4 -6,-11.4 -14.4,-13.4Z';
  s += S('M-8.6,-47.6L-4.6,-55M9.8,-47.6L5.8,-55', 1.5, '#3F8A2E');
  s += d.tone(ap, ['#5CB848', '#3F8A2E'], OW * 0.85, [-1, -1]);
  s += S('M-11,-35Q0.6,-36.6 12.6,-35', 1, '#3F8A2E');
  s += P(rrect(-6, -32.4, 13.2, 7.4, 1.6), 'none', 0.9, '#2F7A22');
  s += G(P('M0,-4C3,-4 5,-1 4,3C1,3.6 -2.4,1 0,-4Z', '#B8F07A', 0.9) + S('M0.6,-2.4Q2,0.4 3.6,2.6', 0.7, '#2F7A22'), 'translate(-1 -43) rotate(10)');
  s += stain(8, -19, 0.7, '#E2453C', 0.6) + stain(-6.4, -17, 0.6, '#FF8A1F', 0.7);
  return s;
}

function veraBoss(): Biped {
  const beads = (_d: Doc, side: -1 | 1) => {
    const x = side * 17.4 - side * 0.3;
    return `<rect x="${f(x - 3.4)}" y="-35.2" width="6.8" height="1.8" rx="0.9" fill="#FFE14D" stroke="${OUT}" stroke-width="0.7"/><rect x="${f(x - 3.2)}" y="-33.2" width="6.4" height="1.6" rx="0.8" fill="#FF7FB0" stroke="${OUT}" stroke-width="0.7"/>`;
  };
  return {
    rig: RIG_BOSS,
    height: 93,
    leg: {
      pants: ['#7B4FC4', '#5A3698'],
      shoe: ['#A8693A', '#7A4524'],
      shoeKind: 'sandal',
      skin: VE_SK,
      bell: true,
      pattern: (_d, _ld, side) =>
        P(rrect(side * 5.6 - 3, -16, 4.4, 4.4, 0.8), '#FFB21F', 0.8) + S(`M${f(side * 5.6 - 2.4)},-15.4l3,0.4M${f(side * 5.6 - 2.4)},-13.4l3,0.2`, 0.5, OUT) + P(ell(side * 5.6 + 2.4, -8, 1.6, 1.6), '#FF7FB0', 0.6),
    },
    legK: 1.12,
    arm: { skin: VE_SK, sleeve: ['#9B5FD6', '#7642AE'], kind: 'short', extra: beads },
    weapon: wpnCarrot(),
    torso: torsoVera,
    torsoBox: BOSS_TORSO_BOX,
    head: headVera,
    headBox: [-25, -32, 25, 31],
    faces: HUMAN,
  };
}

// ================================================================== COLONEL CRUNCH (rooster-feathered)
const CR_SK: Tone = ['#F4C9A0', '#D9A274'];
const CR_COMB: Tone = ['#E8322C', '#B51F1C'];
const CR_HAIR: Tone = ['#E0662E', '#B0461C'];
const CR_SUIT: Tone = ['#FFFDF6', '#DCD6C8'];

const COMB =
  'M-10,-10.6C-14,-16 -12.6,-22.6 -7.6,-22C-8.6,-28 -2.8,-31.8 0.6,-27C2,-32.6 9.4,-32.2 9.2,-26C13.4,-28.8 18,-24 14.8,-19C17.8,-17 17.4,-12 14,-10.4C5,-13.4 -3,-13.4 -10,-10.6Z';

const CRUNCH_FACE: FaceStyle = { skin: CR_SK, brow: '#C04A1C', browW: 2, mood: 'smug', nose: 'pointy', noseCol: ['#F4B48A', '#D98E60'], dazed: 'spiral' };

function headCrunch(d: Doc, u: number, back: boolean, e: Expr): string {
  const comb = (sh = 0) => {
    const c = d.tone(COMB, CR_COMB, OW * u, [-1, -1]) + S('M-5,-19Q-4,-22.6 -2.6,-23.6M3,-20Q4.6,-24 6.6,-25M9,-17Q11.6,-20 13,-20.6', 0.9 * u, CR_COMB[1]) + hl(-6, -22, 1.4, 0.9, -30, 0.6);
    return sh ? G(c, `translate(0 ${f(sh)}) rotate(-4 1 -12)`) : c;
  };
  let s = '';
  if (back) {
    s += comb();
    s += skull(d, u, CR_SK, true, 1.15, 16.5, 15.5, false);
    s += d.tone('M-16.8,2C-18,-11 -9,-17.4 1,-17.4C11,-17.4 19,-11 17.4,2C16,7 12,8.6 8,10.4C9,12.6 7.6,15 5.4,16C4,14 3,12.4 0.6,12C-2,12.4 -3,14 -4.4,16C-6.6,15 -8,12.6 -7,10.4C-11,8.6 -15,7 -16.8,2Z', CR_HAIR, OW * u, [-1, -1]);
    s += S('M-8,-12Q-6,-2 -4.4,8M2,-14Q1,-2 0.6,9M10,-12Q8,-2 5.6,8', 0.9 * u, CR_HAIR[1]);
    return s + backEar(d, u, CR_SK);
  }
  s += comb(e === 'scream' || e === 'shock' ? -3.4 : 0);
  s += skull(d, u, CR_SK, false, 1.15);
  s += d.tone('M-16.4,2C-17.4,-10 -9,-17.4 1,-17.2C11,-17.2 18,-12 17.4,-1.4C15,-5.6 11,-7.2 6.6,-7.2C2,-7 -3.6,-6.6 -7.6,-8.4C-10,-5.4 -11.6,-2 -12.4,1.6Z', CR_HAIR, OW * u, [-1, -1]);
  s += S('M-6,-14.6Q2,-17 10,-13.6M-10,-10Q-2,-14 6,-11', 0.9 * u, CR_HAIR[1]);
  s += humanFace(d, u, e, CRUNCH_FACE);
  // feathery goatee + little wattle-red tip
  s += d.tone('M-0.6,13.4C0.4,16.4 1.4,19.4 2.4,22.6C3.2,19.8 4.2,20.6 4.6,23.8C5.6,21 7,20.6 7.8,22.4C8.6,18.6 8.8,15.6 8.8,12.8C6,14.2 1.8,14.4 -0.6,13.4Z', CR_HAIR, 1.1 * u, [-0.4, -0.4]);
  s += S('M2.6,15.4L3.2,19M5.4,15.6L5.6,19.4', 0.6 * u, CR_HAIR[1]);
  return s;
}

function tailFeathers(d: Doc, x: number, y: number, flip = 1): string {
  const fth = (rot: number, L: number, t: Tone) =>
    G(d.tone(`M0,0C${f(-L * 0.3)},-4 ${f(-L * 0.8)},-4.4 ${f(-L)},-1.4C${f(-L * 0.8)},1.6 ${f(-L * 0.3)},2.4 0,0Z`, t, 1.2, [-0.4, -0.4]) + S(`M0,0L${f(-L * 0.9)},-1.2`, 0.6, darker(t[1], 0.8)), `translate(${f(x)} ${f(y)}) scale(${flip} 1) rotate(${rot})`);
  return fth(-58, 15, ['#2E7A5E', '#1E5240']) + fth(-30, 16, ['#E8862A', '#B85E1A']) + fth(-8, 14, ['#2E7A5E', '#1E5240']) + fth(14, 11, ['#E8322C', '#B51F1C']);
}

function torsoCrunch(d: Doc, back: boolean): string {
  const td = bodyD(14.6, 17.6, TOP, BOT, 2.2);
  let s = '';
  if (!back) s += tailFeathers(d, -14, -24);
  s += neckArt(d, RIG_BOSS, CR_SK, 9, 8);
  s += d.tone(td, CR_SUIT);
  if (back) {
    s += S('M0.6,-54V-30M0.6,-27L-1,-19.4', 1, '#BDB6A6') + S('M-13,-50Q0.6,-47 14,-50', 0.9, '#BDB6A6');
    s += S(td, OW);
    s += epaulette(d, -13.4, -53, true) + epaulette(d, 14.6, -53, true);
    // the tail feathers burst out of the back vent
    s += tailFeathers(d, -2, -24, 1);
    s += S('M-5,-24.4Q0.6,-20.6 6.2,-24.4', 1.2);
    return s;
  }
  // shirt V + string tie with an egg clasp
  s += P('M-4.8,-55.4L0.6,-41L6,-55.4Z', '#FFFFFF', 1.1);
  s += OS('M0.6,-51.6C-1.4,-46 -2,-40 -2.6,-35M0.6,-51.6C2.2,-46 3.2,-40 4,-35.4', 0.9, '#D7262E', 0.6);
  s += P(ell(0.6, -50.8, 2.2, 2.8), '#FFF6D8', 1) + P(ell(0.6, -50.2, 1, 1.1), '#FFC23D', 0);
  s += P('M-2.6,-35L-3.4,-32.6L-1.8,-33ZM4,-35.4L4.8,-33L3.2,-33.4Z', GOLD[0], 0.7);
  // lapels
  s += d.clip(td, P('M-5.2,-56L0.6,-40.6L-1.4,-40L-9,-49L-6,-50.6L-9,-54Z', CR_SUIT[1], 1.1));
  s += d.clip(td, P('M6.4,-56L0.6,-40.6L2.6,-40L10.2,-49L7.2,-50.6L10.2,-54Z', CR_SUIT[1], 1.1));
  // nugget medals
  s += S('M-11.6,-46.4L-10.4,-42.6M-8,-46.4L-8.4,-42.4', 1.4, '#3D7DD8');
  s += d.tone('M-13.4,-41.6C-13.8,-43.6 -11,-44 -10,-42.8C-9,-44 -6.2,-43.2 -6.8,-41C-6,-39 -8.4,-37.4 -10,-38.4C-11.8,-37.4 -14,-39.4 -13.4,-41.6Z', ['#E8A04A', '#B8742A'], 1, [-0.3, -0.3]);
  s += P(ell(-11, -41.4, 0.6, 0.4), '#F6C77A') + P(ell(-8.6, -40.4, 0.6, 0.4), '#F6C77A');
  // buttons + belly strain lines
  s += `<circle cx="0.6" cy="-30" r="0.9" fill="${GOLD[0]}" stroke="${OUT}" stroke-width="0.6"/><circle cx="0.6" cy="-25" r="0.9" fill="${GOLD[0]}" stroke="${OUT}" stroke-width="0.6"/>`;
  s += S('M-2.4,-30.8l-1.6,-0.8M3.6,-30.8l1.6,-0.8M-2.4,-25.8l-1.6,-0.6M3.6,-25.8l1.6,-0.6', 0.6, '#BDB6A6');
  s += S('M0.6,-22V-19.4', 0.9);
  s += S(td, OW);
  s += epaulette(d, -13.4, -53, false) + epaulette(d, 14.6, -53, false);
  return s;
}

function epaulette(d: Doc, x: number, y: number, back: boolean): string {
  let s = '';
  for (let i = -2; i <= 2; i++) s += S(`M${f(x + i * 1.5)},${f(y + 1.6)}V${f(y + 5.2)}`, 1, GOLD[1]);
  s += d.tone(ell(x, y + 0.8, 4.8, 2.2), GOLD, 1.1, [-0.3, -0.3]);
  if (!back) s += hl(x - 1.4, y + 0.2, 1.4, 0.5, 0, 0.7);
  return s;
}

function crunchBoss(): Biped {
  return {
    rig: RIG_BOSS,
    height: 107,
    leg: { pants: CR_SUIT, shoe: ['#FFB21F', '#E0861A'], shoeKind: 'claw' },
    legK: 1.1,
    arm: { skin: CR_SK, sleeve: CR_SUIT, kind: 'long', cuff: '#E8322C' },
    weapon: wpnDrumstick(),
    torso: torsoCrunch,
    torsoBox: [-34, -62, 25, -10],
    head: headCrunch,
    headBox: [-22, -40, 22, 27],
    faces: HUMAN,
  };
}

// ================================================================== LE SNOB (bistro)
const SN_SK: Tone = ['#F7DECB', '#DDB59C'];
const SN_HAIR: Tone = ['#2E2628', '#171214'];

function toque(d: Doc, u: number, back: boolean, small = 1): string {
  const band = 'M-12.4,-9.6L-13.4,-27L16.4,-27L15.2,-9.6Q1.4,-12.4 -12.4,-9.6Z';
  const puff =
    'M-14.6,-25.6C-21.4,-27 -21.6,-37.6 -14.6,-38.4C-15,-45.6 -5,-48 -0.4,-42.8C3,-48.8 13,-47.4 13.8,-40.4C21.4,-41.4 23,-30.4 17.2,-26.4C10,-28.8 -7.6,-28.8 -14.6,-25.6Z';
  let s = d.tone(band, ['#FFFFFF', '#D9DDE3'], OW * u, [-1.2, -1]);
  s += S('M-7,-11.4L-7.6,-27M-1,-11.8L-1.2,-27.6M5,-11.8L5.2,-27.6M11,-11L11.6,-27', 0.9 * u, '#C3C9D2');
  s += d.tone(puff, ['#FFFFFF', '#D9DDE3'], OW * u, [-1.6, -1.2]);
  s += S('M-11,-31Q-9,-36 -7,-38M2,-31Q3,-37 1.4,-42M9,-31Q12,-35 12.4,-38.6', 0.9 * u, '#C3C9D2');
  // tricolour cockade pinned on the front of the band
  if (!back) s += P(ell(11.4, -17, 2.6, 2.6), '#2E4C9E', 0.9 * u) + P(ell(11.4, -17, 1.7, 1.7), '#FFFFFF', 0) + P(ell(11.4, -17, 0.9, 0.9), '#D7262E', 0);
  return small === 1 ? s : G(s, `translate(1 -10) scale(${f(small)}) translate(-1 10)`);
}

const SNOB_FACE: FaceStyle = { skin: SN_SK, brow: '#2E2628', browW: 1.2, mood: 'haughty', nose: 'pointy', dazed: 'spiral', mouthDy: 1.4 };

function monocle(e: Expr, u: number): string {
  if (e === 'shock' || e === 'scream') {
    // popped out, dangling on its chain
    return S('M-8.4,-0.6C-11,6 -10.6,12 -8.6,15', 0.7 * u, GOLD[1]) + P(ell(-8.4, 17.6, 2.8, 2.8), '#CFEFFF', 1.1 * u, GOLD[1], 'fill-opacity="0.45"');
  }
  const [x, y] = [-4.6, 1.3];
  return P(ell(x, y, 4, 4), '#CFEFFF', 1.3 * u, GOLD[1], 'fill-opacity="0.35"') + S(`M${f(x - 3.4)},${f(y + 2.2)}C-10.4,9 -10,14 -6.4,17.6`, 0.7 * u, GOLD[1]) + hl(x - 1.4, y - 1.4, 1.1, 0.5, -30, 0.85);
}

function headSnob(d: Doc, u: number, back: boolean, e: Expr): string {
  let s = '';
  if (back) {
    s += skull(d, u, SN_SK, true, 0.98, 15.8, 16, false);
    s += hairBack(d, u, SN_HAIR, -14, 6, 15.6);
    s += backEar(d, u, SN_SK, 15.2);
    s += d.tone('M-6,13.4L7,13.4L5,17.6L0.6,15.6L-4,17.6Z', ['#2E4C9E', '#1E3478'], 1.1 * u, [-0.3, -0.3]);
    return s + toque(d, u, true);
  }
  s += skull(d, u, SN_SK, false, 0.98, 15.8, 16);
  s += d.tone('M-16.6,-2.6C-17,-6 -15.8,-9 -13.4,-10.6L-5.6,-10.6C-9,-8.8 -11.4,-6.4 -12.6,-3C-13.8,-1.8 -15.6,-1.6 -16.6,-2.6Z', SN_HAIR, 1 * u, [-0.3, -0.3]);
  // nose in the air: the whole face tips up
  let face = humanFace(d, u, e, SNOB_FACE);
  face += OS('M-1.4,8.4Q-0.6,9.6 1,9.2Q4,8 7.4,8.8Q9,9.2 10,7.6', 0.6 * u, SN_HAIR[0], 0.45 * u);
  face += monocle(e, u);
  s += G(face, e === 'normal' ? 'rotate(-9 2 4) translate(0 -0.6)' : 'rotate(-3 2 4)');
  return s + popHat(e, toque(d, u, false), 6);
}

function torsoSnob(d: Doc, back: boolean): string {
  const td = bodyD(12.6, 13.6, TOP, BOT, 0);
  let s = neckArt(d, RIG_SNOB, SN_SK, 7.6, 8);
  s += d.tone(td, ['#FFFFFF', '#D9DDE3']);
  if (back) {
    s += S('M0.6,-53V-20', 1, '#C3C9D2') + S('M-10,-49Q0.6,-46 11,-49', 0.9, '#C3C9D2');
    s += d.clip(td, P('M-24,-24H24V-12H-24Z', '#2A2A32') + gingham(-24, -24, 24, -12, 1.6, '#FFFFFF', 0.35));
    return s + S(td, OW);
  }
  // double-breasted chef jacket
  s += d.clip(td, P('M2,-56L16,-56L16,-12L4,-12Z', '#EEF1F4', 1));
  s += S('M2,-55.6V-12', 1.1);
  for (const y of [-46, -38.6, -31.2]) s += `<circle cx="-2.4" cy="${y}" r="1" fill="#D9DDE3" stroke="${OUT}" stroke-width="0.7"/><circle cx="8.6" cy="${y}" r="1" fill="#D9DDE3" stroke="${OUT}" stroke-width="0.7"/>`;
  // tricolour neckerchief
  s += d.tone('M-6.4,-55.6L8,-55.6L4.6,-49.6L-3.2,-49.6Z', ['#FFFFFF', '#D9DDE3'], 1.1, [-0.3, -0.3]);
  s += P('M-6.4,-55.6L-2,-55.6L-0.8,-49.6L-3.2,-49.6Z', '#2E4C9E') + P('M3.6,-55.6L8,-55.6L4.6,-49.6L2.4,-49.6Z', '#D7262E');
  s += P('M-6.4,-55.6L8,-55.6L4.6,-49.6L-3.2,-49.6Z', 'none', 1.1);
  // a rose in the breast pocket
  s += S('M-8.6,-44.6L-9.6,-40.6', 0.9, '#3F8A2E') + P(ell(-8.6, -45.6, 1.8, 1.6), '#D7262E', 0.8) + S('M-9.2,-45.8q0.6,-0.8 1.2,0', 0.5, '#8E1B2E');
  s += S('M-12,-40.4H-6', 1, '#C3C9D2');
  // checked trousers peek under the hem
  s += d.clip(td, P('M-24,-22H24V-12H-24Z', '#2A2A32') + gingham(-24, -22, 24, -12, 1.6, '#FFFFFF', 0.35) + S('M-24,-22H24', 1));
  return s + S(td, OW);
}

function snobBoss(): Biped {
  return {
    rig: RIG_SNOB,
    height: 125,
    leg: {
      pants: ['#2A2A32', '#16161C'],
      shoe: ['#1E1E24', '#0C0C10'],
      shoeKind: 'pointy',
      pattern: () => gingham(-20, -30, 20, 2, 1.6, '#FFFFFF', 0.35),
    },
    legK: 1.05,
    arm: { skin: SN_SK, sleeve: ['#FFFFFF', '#D9DDE3'], kind: 'long', cuff: '#2E4C9E' },
    weapon: wpnBaguette(),
    torso: torsoSnob,
    torsoBox: BOSS_TORSO_BOX,
    head: headSnob,
    headBox: [-22, -58, 30, 23],
    faces: HUMAN,
  };
}

// ================================================================== RIVAL WAITERS (78 tall)
const STD = RIG_STD;
const STOP = -44;
const SBOT = -16;
const staffTD = (ws = 10.6, wb = 11.6) => bodyD(ws, wb, STOP, SBOT, 0);

function staffWaist(d: Doc, td: string, pants: Tone, belt?: string, buckle?: string): string {
  let s = d.clip(td, P('M-16,-20.4H16V-10H-16Z', pants[0]) + P('M3,-20.4H16V-10H3Z', pants[1]));
  s += S('M-11.8,-20.4H11.8', 1.1);
  if (belt) s += beltArt(d, td, -20.6, belt, buckle);
  return s;
}

// ---- Chuck Wagon staff: cowboy vest
const SC_SK: Tone = ['#F5CFAE', '#DDA886'];
const SC_HAIR: Tone = ['#F0C14B', '#C99A2A'];
function headStaffChuck(d: Doc, u: number, back: boolean, e: Expr): string {
  const hat = chuckHat(d, u, back, 0.78, ['#E8C77A', '#C49A48'], false);
  if (back) {
    return skull(d, u, SC_SK, true, 1.12, 16.5, 15.5, false) + hairBack(d, u, SC_HAIR, -14, 10, 16.6) + backEar(d, u, SC_SK) + hat;
  }
  let s = skull(d, u, SC_SK, false, 1.12);
  s += humanFace(d, u, e, { skin: SC_SK, brow: '#C99A2A', mood: 'goofy', freckles: true, teeth: 'buck', blush: true, dazed: 'x' });
  s += d.tone('M-16.6,4C-18,-6 -14,-11 -8,-12L-6,-7.6L-9,-8.6L-10.6,-4.4L-12.6,-6L-13.6,2Z', SC_HAIR, 1.2 * u, [-0.4, -0.4]);
  s += d.tone('M7,-9L10.4,-5.6L11.4,-8.6L14.4,-5.2L15.4,-8.6L17.4,-4.2C17.6,-7 16,-10 13,-11Z', SC_HAIR, 1.1 * u, [-0.4, -0.4]);
  // a piece of straw to chew on
  if (e === 'normal') s += OS('M7.6,10.4L14,13.4', 0.7 * u, '#F0D27A', 0.8 * u);
  return s + popHat(e, hat);
}
function torsoStaffChuck(d: Doc, back: boolean): string {
  const td = staffTD();
  let s = neckArt(d, STD, SC_SK);
  s += d.tone(td, WHITE);
  s += staffWaist(d, td, ['#4E6E9E', '#3A5480'], '#5A341C', back ? undefined : GOLD[0]);
  if (back) {
    s += d.clip(td, d.tone('M-16,-48H16V-23H-16Z', CH_VEST, OW * 0.9)) + S('M-10,-39Q0.5,-41 11,-39', 0.7, '#E8C79A', 'stroke-dasharray="1.2 1"');
    s += d.tone('M-3,-46L4,-46L2.6,-41.4L0.5,-43L-1.6,-41.4Z', ['#D7262E', '#A51B22'], 1, [-0.3, -0.3]);
    return s + S(td, OW);
  }
  const vl = 'M-11.4,-41C-11,-44 -9,-45 -6.4,-45L-4.6,-45L-1.8,-33L-2.6,-23L-12.4,-23Z';
  const vr = 'M12.2,-41C11.8,-44 10,-45 7.4,-45L5.6,-45L2.8,-33L3.6,-23L13.4,-23Z';
  s += d.clip(td, d.tone(vl, CH_VEST, OW * 0.85) + d.tone(vr, CH_VEST, OW * 0.85));
  // fringe
  for (let i = 0; i < 4; i++) s += S(`M${f(-11 + i * 2.4)},-23V-20.4M${f(5 + i * 2.4)},-23V-20.4`, 0.9, CH_VEST[1]);
  s += d.tone('M-4.6,-45.4L5.6,-45.4L0.5,-38.4Z', ['#D7262E', '#A51B22'], 1, [-0.3, -0.3]);
  s += `<circle cx="-1" cy="-43.4" r="0.5" fill="#FFFFFF"/><circle cx="2" cy="-42.4" r="0.5" fill="#FFFFFF"/>`;
  return s + S(td, OW);
}

// ---- Burger Barn staff: burger cap
const SH_SK: Tone = ['#E0A878', '#BF8455'];
function burgerCap(d: Doc, u: number, back: boolean): string {
  const dome = 'M-14.8,-6.6C-15.6,-16 -8,-19.6 1.4,-19.6C10.6,-19.6 17.4,-15.6 16.6,-6.4Z';
  let s = '';
  if (!back) s += d.tone('M10,-8.6C16,-9.8 22.6,-9 25,-6.4C23,-4.6 16,-4.8 10.4,-5.4Z', ['#B32E28', '#8E1F1A'], OW * u, [-0.4, -0.4]);
  s += d.tone(dome, ['#E2453C', '#B32E28'], OW * u, [-1.2, -1]);
  s += S('M1.4,-19.4V-7.2', 0.9 * u, '#B32E28');
  if (back) {
    s += P(rrect(-4, -10.6, 10.8, 3.6, 1.6), '#F4F4F4', 1 * u) + S('M-2,-8.8H5', 0.7 * u, '#9AA6B4');
  } else {
    // burger logo
    s += P('M3,-12.6C3,-16.4 11,-16.4 11,-12.6Z', '#E8A04A', 0.8 * u) + P(rrect(2.8, -12.6, 8.4, 1.4, 0.5), '#7A3E1C', 0.6 * u) + P(rrect(2.8, -11.2, 8.4, 1, 0.4), '#6FC23A', 0.5 * u) + P('M3,-10.2H11L10.4,-8.6H3.6Z', '#E8A04A', 0.6 * u);
    s += `<circle cx="1.4" cy="-19.6" r="1.2" fill="#B32E28" stroke="${OUT}" stroke-width="${f(0.8 * u)}"/>`;
  }
  return s;
}
function headStaffHank(d: Doc, u: number, back: boolean, e: Expr): string {
  const hair: Tone = ['#5A3420', '#3E2214'];
  if (back) return skull(d, u, SH_SK, true, 1.12, 16.5, 15.5, false) + hairBack(d, u, hair, -12, 9, 16.4) + backEar(d, u, SH_SK) + burgerCap(d, u, true);
  let s = skull(d, u, SH_SK, false, 1.12);
  s += d.tone('M-16.6,2C-17.4,-3 -16.4,-6 -14,-7.4L-11.6,-6.4C-12.6,-3.6 -12.8,-1 -12.8,2Z', hair, 1.2 * u, [-0.4, -0.4]);
  s += humanFace(d, u, e, { skin: SH_SK, brow: '#3E2214', mood: 'bored', teeth: 'braces', dazed: 'x' });
  // a pimple, because teenager
  s += `<circle cx="-9.6" cy="6.6" r="0.9" fill="#E8706A"/><circle cx="-9.9" cy="6.3" r="0.3" fill="#FFFFFF"/>`;
  return s + popHat(e, burgerCap(d, u, false), -10);
}
function torsoStaffHank(d: Doc, back: boolean): string {
  const td = staffTD();
  let s = neckArt(d, STD, SH_SK);
  s += d.tone(td, ['#FFFFFF', '#DCD3C0']) + d.clip(td, stripes(-16, -50, 16, -10, 1.8, '#E2453C', true)) + S(td, OW);
  if (back) {
    s += d.clip(td, P('M-16,-20.4H16V-10H-16Z', '#2A2A32')) + S('M-12,-20.4H12', 1);
    s += bowBack(d, 0.5, -22.4, ['#FFC83D', '#E09A10'], 0.9);
    return s + S(td, OW);
  }
  s += P('M-4.4,-44.8L0.5,-41L5.4,-44.8L3,-45.8L0.5,-43.6L-2,-45.8Z', '#FFFFFF', 1);
  const ap = 'M-8,-36.4C-8,-38 9,-38 9,-36.4L11.6,-12.4C5,-11 -4,-11 -10.6,-12.4Z';
  s += S('M-7.4,-37L-3.6,-44.6M8.4,-37L4.6,-44.6', 1.2, '#E09A10');
  s += d.tone(ap, ['#FFC83D', '#E09A10'], OW * 0.8, [-0.8, -0.8]);
  s += P(rrect(-5.6, -34.6, 6, 3.4, 0.8), '#FFFFFF', 0.8) + S('M-4.4,-33H-0.8', 0.7, '#9AA6B4');
  s += stain(4.6, -24, 0.7, '#E2453C', 0.7) + stain(-2.6, -19, 0.6, '#FFD21F', 0.9);
  return s;
}

// ---- Salad Fortress staff: hipster with green apron
const SV_SK: Tone = ['#EAC09A', '#CC9A70'];
const SV_HAIR: Tone = ['#6B4428', '#4A2E1A'];
function headStaffVera(d: Doc, u: number, back: boolean, e: Expr): string {
  const bun = d.tone(ell(-2, -18.6, 5.4, 4.6), SV_HAIR, OW * u, [-0.8, -0.8]) + P(rrect(-4.6, -15.4, 5.6, 1.8, 0.8), '#5CB848', 0.8 * u);
  if (back) return bun + skull(d, u, SV_SK, true, 1.12, 16.5, 15.5, false) + hairBack(d, u, SV_HAIR, -15, 8, 16.4) + backEar(d, u, SV_SK) + P(rrect(-4.6, -15.4, 5.6, 1.8, 0.8), '#5CB848', 0.8 * u);
  let s = bun + skull(d, u, SV_SK, false, 1.12);
  s += humanFace(d, u, e, { skin: SV_SK, brow: '#4A2E1A', mood: 'smile', dazed: 'x' });
  // beard + mustache framing the mouth (drawn over the face, mouth peeks through)
  s += P('M-13.6,6.5C-12,13.5 -6,16.6 1,16.4C8,16.4 14.6,12.5 16,5.5C13,8.6 10.6,9.4 8.4,8.4C8,13.6 -1,14.6 -2.6,8.6C-6,9.4 -11,8.8 -13.6,6.5Z', SV_HAIR[0], 1.2 * u);
  s += S('M-6,12q1,1.6 2.6,1.4M10,12q-0.6,1.4 -2,1.6', 0.7 * u, SV_HAIR[1]);
  s += d.tone('M-2.2,8.6C-0.6,5.4 2.6,5.8 3.4,7.2C4.6,5.6 8.4,5.4 9.4,8.4C7,8 5,8.2 3.4,8.8C2,8.2 0,8 -2.2,8.6Z', SV_HAIR, 1 * u, [-0.3, -0.3]);
  s += d.tone('M-16.6,2C-18,-10 -9,-16 1.4,-16C11,-16 18.6,-11 17.6,0C16,-4 12,-7.6 6,-7.6C1,-7.6 -5,-7 -8.6,-8.4C-11,-5 -12.6,-1 -13.4,2Z', SV_HAIR, OW * u, [-1, -1]);
  // round glasses
  s += P(ell(-4.6, 1.4, 3.6, 3.6), '#CFEFFF', 1.1 * u, OUT, 'fill-opacity="0.3"') + P(ell(6, 1.8, 3.2, 3.2), '#CFEFFF', 1.1 * u, OUT, 'fill-opacity="0.3"') + S('M-1,1.2Q0.8,0 2.8,1.4M-8.2,1.2L-15,0.4', 1 * u);
  return s;
}
function torsoStaffVera(d: Doc, back: boolean): string {
  const td = staffTD();
  let s = neckArt(d, STD, SV_SK);
  s += d.tone(td, ['#F4E6C8', '#D8C59E']) + d.clip(td, stripes(-16, -50, 16, -10, 1.6, '#E8A04A')) + S(td, OW);
  s += staffWaist(d, td, ['#7FA6D6', '#5A80B2']);
  if (back) {
    s += S('M-7,-44L6,-27M8,-44L-5,-27', 1.4, '#3F8A2E');
    s += bowBack(d, 0.5, -24.6, ['#5CB848', '#3F8A2E'], 0.9);
    return s + S(td, OW);
  }
  const ap = 'M-8,-38C-8,-40 9,-40 9,-38L12,-11.4C5,-10 -4,-10 -11,-11.4Z';
  s += S('M-7.4,-38.6L-3.6,-45M8.4,-38.6L4.6,-45', 1.2, '#3F8A2E');
  s += d.tone(ap, ['#5CB848', '#3F8A2E'], OW * 0.8, [-0.8, -0.8]);
  s += G(P('M0,-3.4C2.6,-3.4 4.2,-0.8 3.4,2.6C0.8,3 -2,0.8 0,-3.4Z', '#B8F07A', 0.8) + S('M0.6,-2Q1.8,0.4 3,2.2', 0.6, '#2F7A22'), 'translate(-0.6 -30) rotate(10)');
  s += P(rrect(-6, -22, 12, 5, 1.2), 'none', 0.8, '#2F7A22');
  return s;
}

// ---- Chicken Shack staff: paper hat
const SR_SK: Tone = ['#9C6440', '#7A4A2C'];
const SR_HAIR: Tone = ['#2E2420', '#1A1412'];
function paperHat(d: Doc, u: number, back: boolean): string {
  const hat = 'M-14.6,-7.6L-11,-19.6Q1.4,-23.4 15,-19.8L17.4,-7.4Q1.4,-11 -14.6,-7.6Z';
  let s = d.tone(hat, ['#FFFFFF', '#DCD6C8'], OW * u, [-1, -1]);
  s += d.clip(hat, stripes(-20, -30, 22, 0, 2.6, '#E2453C', true)) + S(hat, OW * u);
  s += d.clip(hat, P('M-20,-11.2Q1.4,-14 22,-11V-4H-20Z', '#E2453C')) + S(hat, OW * u);
  if (!back) {
    // little chicken mascot badge (a chick, not a person)
    s += P(ell(3, -14.8, 3.8, 3.4), '#FFE14D', 0.9 * u) + P('M6.4,-15.2L8.6,-14.4L6.4,-13.6Z', '#FF8A1F', 0.6 * u) + `<circle cx="4.4" cy="-15.8" r="0.6" fill="${OUT}"/>` + P('M1.6,-18L2.6,-19.8L3.6,-18.2Z', '#E2453C', 0.5 * u);
  }
  return s;
}
function headStaffCrunch(d: Doc, u: number, back: boolean, e: Expr): string {
  const tail = (x: number, dir: number) =>
    d.tone(`M${f(x)},-2C${f(x + dir * 6)},-4 ${f(x + dir * 9.4)},2 ${f(x + dir * 8)},9C${f(x + dir * 7)},13 ${f(x + dir * 4)},14 ${f(x + dir * 3)},11C${f(x + dir * 5)},7 ${f(x + dir * 4)},2 ${f(x)},2Z`, SR_HAIR, OW * 0.9 * u, [-0.6, -0.6]) +
    P(ell(x + dir * 1.6, 0, 2, 2), '#FF7FB0', 0.8 * u);
  let s = tail(-15, -1) + (back ? '' : tail(16, 1));
  if (back) return s + skull(d, u, SR_SK, true, 1.1, 16.5, 15.5, false) + hairBack(d, u, SR_HAIR, -14, 6, 16.4) + tail(16, 1) + backEar(d, u, SR_SK, 15.4) + paperHat(d, u, true);
  s += skull(d, u, SR_SK, false, 1.1);
  s += humanFace(d, u, e, { skin: SR_SK, brow: '#1A1412', mood: 'nervous', dazed: 'x', blush: true });
  if (e === 'normal') s += hl(14.2, -4.2, 0.8, 1.3, 0, 0.9, '#8FD3FF');
  s += d.tone('M-16.6,3C-17.6,-8 -12,-12 -5,-12L-4,-6.6C-8,-7.6 -11.6,-4 -13.4,3Z', SR_HAIR, 1.2 * u, [-0.4, -0.4]);
  s += d.tone('M3,-11.6C9,-12 16,-9 17.4,-1C15,-5 12,-6.6 6.6,-7.6Z', SR_HAIR, 1.2 * u, [-0.4, -0.4]);
  return s + popHat(e, paperHat(d, u, false), 8);
}
function torsoStaffCrunch(d: Doc, back: boolean): string {
  const td = staffTD();
  let s = neckArt(d, STD, SR_SK);
  s += d.tone(td, ['#FFD23D', '#E0A21A']);
  s += staffWaist(d, td, ['#6B4A2F', '#4E3520'], '#2A1C14', back ? undefined : GOLD[0]);
  if (back) {
    s += P('M-6,-45.6L7,-45.6L6,-42L-5,-42Z', '#E2453C', 1);
    return s + S(td, OW);
  }
  s += P('M-5.4,-45.4L0.5,-41L-1.6,-37.6L-7,-42.2Z', '#E2453C', 1) + P('M6.4,-45.4L0.5,-41L2.6,-37.6L8,-42.2Z', '#E2453C', 1);
  s += S('M0.5,-41V-33.6', 1) + `<circle cx="0.5" cy="-38.6" r="0.6" fill="${OUT}"/><circle cx="0.5" cy="-35.6" r="0.6" fill="${OUT}"/>`;
  // name tag
  s += P(rrect(3.6, -37.6, 6, 3.4, 0.8), '#FFFFFF', 0.8) + S('M4.8,-35.8H8.4', 0.7, '#E2453C');
  s += stain(-5.6, -28, 0.7, '#B8742A', 0.6);
  return s + S(td, OW);
}

// ---- Le Snob waiter: bistro waistcoat + bowtie
const SS_SK: Tone = ['#F2C29B', '#D9996B'];
function headStaffSnob(d: Doc, u: number, back: boolean, e: Expr): string {
  const hairT = SN_HAIR;
  if (back) return skull(d, u, SS_SK, true, 1.08, 16.5, 15.5, false) + hairBack(d, u, hairT, -16.6, 6, 16.6) + backEar(d, u, SS_SK);
  let s = skull(d, u, SS_SK, false, 1.08);
  s += humanFace(d, u, e, { skin: SS_SK, brow: '#2E2628', mood: 'smug', dazed: 'x' });
  s += OS('M-1,7.6Q1,6.4 3.2,7.4Q5.6,6.4 8,7.4M-1,7.6Q-2.4,7.8 -2.6,6.2M8,7.4Q9.6,7.6 9.6,6', 0.6 * u, hairT[0], 0.45 * u);
  // slicked center part, glossy
  const cap = 'M-16.6,2C-18,-11 -9,-17.6 1,-17.6C11,-17.6 18.8,-11.6 17.8,0C16,-6 11,-9 5,-9.4L2.6,-13.6L0,-9.6C-5,-9.4 -10,-7 -13.2,2Z';
  s += d.tone(cap, hairT, OW * u, [-1, -1]) + hl(-6, -12.6, 3.6, 1, -20, 0.55) + hl(9, -12.6, 3, 0.9, 20, 0.45);
  return s;
}
function torsoStaffSnob(d: Doc, back: boolean): string {
  const td = staffTD();
  let s = neckArt(d, STD, SS_SK);
  s += d.tone(td, ['#FFFFFF', '#DCD6C8']);
  if (back) {
    s += d.clip(td, d.tone('M-16,-41H16V-21H-16Z', ['#3A3A44', '#24242C'], OW * 0.8)) + P(rrect(-4, -27, 9, 2.2, 0.8), '#24242C', 0.8);
    s += d.clip(td, P('M-16,-21H16V-10H-16Z', '#1E1E24'));
    s += bowBack(d, 0.5, -21, WHITE, 0.9);
    return s + S(td, OW);
  }
  // waistcoat
  const wl = 'M-11,-40L-3.6,-44.6L0.5,-30L-0.8,-21L-11.6,-21Z';
  const wr = 'M12,-40L4.6,-44.6L0.5,-30L1.8,-21L12.6,-21Z';
  s += d.clip(td, d.tone(wl, ['#3A3A44', '#24242C'], OW * 0.8) + d.tone(wr, ['#3A3A44', '#24242C'], OW * 0.8));
  for (const y of [-28, -24.4]) s += `<circle cx="2.2" cy="${y}" r="0.7" fill="${GOLD[0]}" stroke="${OUT}" stroke-width="0.5"/>`;
  s += S('M-8.6,-31.4Q-5.6,-29 -4.4,-31', 0.7, GOLD[0]);
  // bowtie
  s += P('M0.5,-42.6L-4.4,-45L-4.4,-40.2Z', '#D7262E', 1) + P('M0.5,-42.6L5.4,-45L5.4,-40.2Z', '#D7262E', 1) + P(ell(0.5, -42.6, 1.3, 1.2), '#A51B22', 0.9);
  s += S(td, OW);
  // long bistro apron (tablier)
  const ap = 'M-12.4,-22L13.4,-22L14.6,-7C8,-6 -7,-6 -13.6,-7Z';
  s += d.tone(ap, WHITE, OW * 0.85, [-0.8, -0.8]) + S('M-12.6,-20.4H13.6', 0.8, '#C9C2B4');
  return s;
}

function staff(
  rival: string,
  o: {
    skin: Tone;
    sleeve: Tone;
    kind: 'long' | 'short' | 'rolled';
    cuff?: string;
    leg: Biped['leg'];
    weapon: Biped['weapon'];
    torso: Biped['torso'];
    head: Biped['head'];
    headBox: Box;
    height: number;
    armR?: Biped['armR'];
  },
): Biped {
  return {
    rig: STD,
    height: o.height,
    leg: o.leg,
    arm: { skin: o.skin, sleeve: o.sleeve, kind: o.kind, cuff: o.cuff },
    armR: o.armR,
    weapon: o.weapon,
    torso: o.torso,
    torsoBox: rival === 'snob' ? [-19, -53, 19, -4] : STAFF_TORSO_BOX,
    head: o.head,
    headBox: o.headBox,
    faces: HUMAN,
  };
}

/** Towel draped over the far arm (bistro waiter). */
const towelArm = (_d: Doc, side: -1 | 1, back: boolean) =>
  side === 1 ? P(back ? 'M9,-36L15.6,-37.4L16.6,-26L13.6,-25L12.4,-28L9.6,-27Z' : 'M9.4,-36L16,-37.6L17,-26.4L14,-25.2L12.8,-28.2L10,-27.2Z', '#FFFFFF', 1.1) + S('M10.4,-33.4L16.2,-34.6', 0.6, '#9AA6B4') : '';

const STAFF: Record<string, () => Biped> = {
  chuck: () =>
    staff('chuck', {
      skin: SC_SK,
      sleeve: WHITE,
      kind: 'rolled',
      leg: { pants: ['#4E6E9E', '#3A5480'], shoe: ['#8A4E26', '#62341A'], shoeKind: 'boot' },
      weapon: wpnRollingPin(),
      torso: torsoStaffChuck,
      head: headStaffChuck,
      headBox: [-26, -38, 29, 18],
      height: 85,
    }),
  hank: () =>
    staff('hank', {
      skin: SH_SK,
      sleeve: ['#FFFFFF', '#DCD3C0'],
      kind: 'short',
      leg: { pants: ['#2A2A32', '#16161C'], shoe: ['#E2453C', '#B32E28'], shoeTrim: '#FFFFFF' },
      weapon: wpnTray(['#E2453C', '#B32E28'], ['#B32E28', '#8E1F1A'], 'soda'),
      torso: torsoStaffHank,
      head: headStaffHank,
      headBox: [-22, -34, 28, 18],
      height: 80,
    }),
  vera: () =>
    staff('vera', {
      skin: SV_SK,
      sleeve: ['#F4E6C8', '#D8C59E'],
      kind: 'long',
      cuff: '#E8A04A',
      leg: { pants: ['#7FA6D6', '#5A80B2'], shoe: ['#A8693A', '#7A4524'], shoeKind: 'sandal', socks: '#F4F4F4', skin: ['#F4F4F4', '#D5D8DC'] },
      weapon: wpnRollingPin(),
      torso: torsoStaffVera,
      head: headStaffVera,
      headBox: [-22, -27, 22, 19],
      height: 83,
    }),
  crunch: () =>
    staff('crunch', {
      skin: SR_SK,
      sleeve: ['#FFD23D', '#E0A21A'],
      kind: 'short',
      leg: { pants: ['#6B4A2F', '#4E3520'], shoe: ['#2A2A32', '#14141A'] },
      weapon: wpnTray(['#F4F4F4', '#C9CED6'], ['#9AA6B4', '#6B7787'], 'nuggets'),
      torso: torsoStaffCrunch,
      head: headStaffCrunch,
      headBox: [-28, -36, 28, 18],
      height: 82,
    }),
  snob: () =>
    staff('snob', {
      skin: SS_SK,
      sleeve: ['#FFFFFF', '#DCD6C8'],
      kind: 'long',
      cuff: '#FFFFFF',
      leg: { pants: ['#1E1E24', '#0C0C10'], shoe: ['#1E1E24', '#0C0C10'], shoeKind: 'pointy' },
      weapon: wpnTray(['#E6EBF0', '#B8C2CE'], STEEL, 'cloche'),
      torso: torsoStaffSnob,
      head: headStaffSnob,
      headBox: [-22, -20, 22, 18],
      height: 78,
      armR: { skin: SS_SK, sleeve: ['#FFFFFF', '#DCD6C8'], kind: 'long', cuff: '#FFFFFF', extra: towelArm },
    }),
};

const BOSSES: Record<string, () => Biped> = {
  chuck: chuckBoss,
  hank: hankBoss,
  vera: veraBoss,
  crunch: crunchBoss,
  snob: snobBoss,
};

// ------------------------------------------------------------------ public API
export function buildRaidChar(id: string): CharArt {
  if (id.startsWith('boss_') && BOSSES[id.slice(5)]) return buildBiped(id, BOSSES[id.slice(5)]());
  if (id.startsWith('staff_') && STAFF[id.slice(6)]) return buildBiped(id, STAFF[id.slice(6)]());
  if (id === 'bigfoot') return buildBigfoot(id);
  if (id === 'werewoof') return buildWerewoof(id);
  if (id === 'guard_dog' || id === 'pet_pug' || id === 'pet_rotweiler') return buildQuad(id);
  throw new Error(`Unknown raid character id: ${id}`);
}

