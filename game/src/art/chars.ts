/**
 * Cutout-puppet characters (front 3/4 view facing down-right, plus a back 3/4 view walking away;
 * the game mirrors both for the other two directions).
 *
 * Root (0,0) is the point between the feet; y is negative upward. Standard height is ~78 world units
 * (82 with a hat), 2.5-head chibi with a ~32-tall head. Every part is its own SVG with a pivot:
 *   legL / legR  pivot at the hip         (±legX, -19.5)          legX = 4.6 (sumo 7.4, champ 5.6)
 *   torso        pivot at bottom-center   (0, -16)
 *   armL / armR  pivot at the shoulder    (±shX, -40.6 - lift)    shX = 11 (bulky types wider)
 *   head         pivot at the neck        (0.5, -44 - lift)       lift = 0 (sumo 5, champ 3)
 * Grandma is the standard rig uniformly scaled by 0.9 about the root, so all her pivots are ×0.9.
 * Exact values per character are always in the returned CharPart (x, y, px, py): read them, don't assume.
 *
 * "L" = screen-left, "R" = screen-right, in both views.
 * Front view (`parts`), draw order: armR, legR, legL, torso, head, armL  (L is the near side).
 * Back view (`backParts`), draw order: armL, legL, legR, torso, armR, head  (R is the near side; the far
 * arm passes behind the torso, the near arm stays behind the head so reaching zombie arms tuck under it).
 * Faces (`faces`): expression heads with exactly the head's key-frame (w, h, px, py, x, y).
 * Keys: `char_<id>_<part>`, `char_<id>_back_<part>`, `char_<id>_face_<name>` (the last `_` segment
 * is always the part / face name).
 *
 * Hand props are drawn inside the arm images (they swing with the arm): cane, axe, selfie stick,
 * pom-poms, foam finger, notepad, briefcase, donut, autograph photo. Zombie versions are authored so
 * they read well in the scene's "arms forward" pose (arm rotation ≈ -70°).
 * Joints are round caps centred on each pivot, tucked under the neighbouring part, so rotating
 * a limb ±25° never opens a gap. Sitting = hide both legs (the torso hem reads as a seated lap).
 */
import type { CharArt, CharPart, FaceName, PartName } from './types';
import { CUSTOMER_IDS, HUMAN_FACES, ZOMBIE_FACES } from './manifest';
import { Doc, OUT, OW, S, P, G, capsule, ell, f, headD, hl, rrect, tornCapsule } from './svg';
import type { Pt, Tone } from './svg';
import {
  ZSK, ZHI, ZDEEP, PATCH, GOO, MOUTH, TOOTH, TONGUE, BLUSH,
  cel, darker, lighter, rip, drool, droolString, stitches, tooth, heye, heyeLid, popEye, zeye,
  spiralEye, xEye, happyEye, sleepEye, sweat, crumbs, bubble, worm, fold,
} from './charkit';
import { DEF_RIG, HIP_Y, NECK, SH_Y, TORSO_PIV, HCX, HCY, HRX, HRY, neck } from './charbase';
import type { Box, Expr, Look, Rig } from './charbase';
import { LOOKS } from './charlooks';

export const HUMAN_IDS = CUSTOMER_IDS;
export type HumanId = (typeof HUMAN_IDS)[number];
export type ZombieId = `${HumanId}_z`;
export type CharId = HumanId | ZombieId | 'you' | 'gus';

export const CHAR_IDS: CharId[] = [...HUMAN_IDS, ...HUMAN_IDS.map((h) => `${h}_z` as ZombieId), 'you', 'gus'];

/** Part names in the order buildChar() returns them (back to front). */
export const PART_ORDER: PartName[] = ['armR', 'legR', 'legL', 'torso', 'head', 'armL'];
/** backParts order (back to front). */
export const BACK_PART_ORDER: PartName[] = ['armL', 'legL', 'legR', 'torso', 'armR', 'head'];

// ------------------------------------------------------------------ face
const EL: Pt = [-3.6, -57.2];
const ER: Pt = [6.8, -56.8];

function lashes(): string {
  return S('M-5.2,-59.4l-1.5,-1.2M-4,-59.9l-0.8,-1.5M8.2,-58.9l1.4,-1M7.3,-59.3l0.8,-1.4', 0.8);
}

function humanFace(d: Doc, look: Look, e: Expr): string {
  const sk = look.skin;
  const brow = look.brow ?? look.hair[1];
  const lid = sk[1];
  const nose = S('M2.6,-55.2Q5.2,-54.4 3.4,-52.2', 1.1, darker(sk[1]));
  let s = '';
  const blush = (op = 0.35, big = 1) =>
    look.noBlush && op < 0.5
      ? ''
      : P(ell(-9.4, -51.4, 2.6 * big, 1.5 * big), BLUSH, 0, OUT, `opacity="${op}"`) + P(ell(12.6, -51, 1.8 * big, 1.2 * big), BLUSH, 0, OUT, `opacity="${op}"`);
  if (look.beard && e !== 'scream') s += P('M-12.6,-52C-11,-45 -5,-42.4 2,-42.6C9,-42.6 15.6,-46 17,-53C14,-50 11.4,-49.4 9,-50.4C6,-47.6 -1,-47.4 -3.4,-50.4C-6.4,-49.4 -10,-49.8 -12.6,-52Z', look.beard[0], 1.2) + S('M-8,-47.4l0.6,1.4M-4,-46l0.4,1.4M8,-46.2l-0.3,1.4M12,-48l-0.6,1.2', 0.7, look.beard[1]);
  if (look.beard && e === 'scream') s += P('M-12.6,-52C-11,-44 -5,-41 2,-41.2C9,-41.2 15.6,-45 17,-53C14,-50 12,-49 10,-49L9,-44C6,-42.6 -1,-42.6 -2,-44L-3.4,-49C-6.4,-49.4 -10,-49.8 -12.6,-52Z', look.beard[0], 1.2);
  if (look.faceUnder) s += look.faceUnder(d, false, e);
  if (e === 'scream') {
    // eyes squeezed shut, tears flying, mouth wide open
    s += S('M-7.2,-60.4L-2,-57.4L-7,-54.6', 1.8) + S('M10.4,-59.8L5.4,-57L10,-54.4', 1.8);
    s += sweat(-9.8, -58.4, 0.8, -70) + sweat(13, -57.8, 0.7, 70);
    s += S('M-8,-62.6Q-4.8,-65.6 -1.6,-62.2M4.6,-62Q7.8,-65 10.8,-62.4', 1.5, brow);
    s += nose;
    const m = 'M-2.2,-51.8C-2.2,-54.2 10.2,-54.6 10.4,-51.8C10.8,-45.4 7.8,-42.4 4,-42.4C0.2,-42.4 -2.6,-45.4 -2.2,-51.8Z';
    s += P(m, MOUTH, 1.3) + d.clip(m, P('M-3,-55H12V-51.2H-3Z', TOOTH) + S('M-3,-51.2H12', 0.6, '#C9C2B4') + P(ell(4.2, -42.8, 3.8, 2.2), TONGUE) + P(ell(4, -50.4, 0.8, 1.1), '#8E3A40'));
    if (look.lips) s += S(m, 1, look.lips);
    s += blush(0.3);
  } else if (e === 'happy') {
    s += happyEye(EL[0], EL[1] + 0.2, 2.6) + happyEye(ER[0], ER[1] + 0.2, 2.3);
    if (look.lashes) s += S('M-6.2,-56.6l-1.2,-0.6M9.1,-56.3l1.2,-0.6', 0.8);
    s += S('M-6.6,-62.6Q-4,-64.6 -1.2,-62.8M4.6,-62.4Q7,-64.2 9.4,-62.4', 1.3, brow);
    s += nose;
    const m = 'M-2.2,-51.4C1.6,-50.2 8.4,-50.4 11,-52.2C10.6,-45.4 6.2,-43.6 3.6,-43.8C0.6,-44 -1.8,-47 -2.2,-51.4Z';
    s += P(m, MOUTH, 1.2) + d.clip(m, P('M-3,-52.6H12V-49.6H-3Z', TOOTH) + S('M-3,-49.6H12', 0.6, '#C9C2B4') + P(ell(4.4, -44.4, 3.6, 2), TONGUE));
    if (look.lips) s += S(m, 1, look.lips);
    s += blush(0.55, 1.15);
    s += crumbs([[11.6, -48.2], [12.6, -50.6], [-3.2, -48.6], [0.8, -44.2], [7.6, -43.6]]);
    s += P(ell(10.8, -45.8, 1.4, 0.9), '#A8432A', 0, OUT, 'opacity="0.7"');
  } else if (e === 'shock') {
    s += popEye(-3.9, -57.8, 3.1, 3.8, 0.3, 0.3, 1.05) + popEye(7.1, -57.3, 2.7, 3.4, 0.2, 0.3, 0.95);
    s += S('M-7.2,-64.8Q-4.2,-66.4 -1,-65M4.6,-64.6Q7.4,-66.4 10.2,-64.8', 1.5, brow);
    s += nose;
    const m = ell(4.2, -47.4, 2.1, 2.8);
    s += P(m, MOUTH, 1.2) + d.clip(m, P(ell(4.6, -45.4, 1.8, 1), TONGUE));
    if (look.lips) s += S(m, 1, look.lips);
    s += blush(0.2);
  } else {
    s += moodFace(d, look, lid, brow);
    s += nose.replace('M2.6', 'M2.6');
    s += moodMouth(d, look);
    if (look.face !== 'calm' && look.face !== 'sweet' && look.lashes) s += lashes();
    s += blush(look.face === 'whistle' ? 0.5 : 0.35, look.face === 'whistle' ? 1.2 : 1);
  }
  if (look.mustache) {
    const mo = e === 'scream' ? 'translate(0 -1.2)' : e === 'happy' ? 'rotate(-4 4 -51)' : '';
    const mu = d.tone('M-2.2,-50.6C-0.6,-53.6 2.6,-53.2 3.8,-51.4C5.2,-53.2 8.8,-53.6 10,-50.6C7.4,-49.4 5,-49.6 3.8,-50.4C2.4,-49.4 0,-49.4 -2.2,-50.6Z', look.mustache, 1.1, [-0.4, -0.4]);
    s += mo ? G(mu, mo) : mu;
  }
  if (look.pale) s += S('M-5.8,-53.6Q-3.6,-52.6 -1.6,-53.6M5.2,-53.4Q6.8,-52.6 8.4,-53.4', 0.7, '#C4A8A8', 'opacity="0.8"');
  return s;
}

function moodFace(d: Doc, look: Look, lid: string, brow: string): string {
  let s = '';
  switch (look.face) {
    case 'calm':
      s += S('M-5.8,-57.2Q-3.6,-59.6 -1.4,-57.2M5,-56.8Q7,-59 9,-56.8', 1.4);
      if (look.lashes) s += S('M-6,-57.6l-1,-0.6M9.2,-57.2l1,-0.6', 0.8);
      s += S('M-6.4,-62Q-4,-63.6 -1.4,-62.2M4.6,-61.6Q7,-63 9.2,-61.6', 1.2, brow);
      break;
    case 'sweet':
      s += happyEye(EL[0], EL[1] + 0.4, 2.2, 1.8, 1.4) + happyEye(ER[0], ER[1] + 0.4, 2, 1.8, 1.4);
      s += S('M-6.6,-62.4Q-4,-63.8 -1.4,-62.4M4.6,-62Q7,-63.4 9.2,-62', 1.3, brow);
      break;
    case 'bored':
      s += heyeLid(d, EL[0], EL[1], 1.9, 2.6, lid, 0.5) + heyeLid(d, ER[0], ER[1], 1.7, 2.4, lid, 0.5);
      s += S('M-6.4,-61.2Q-4,-61.8 -1.4,-61.2M4.6,-60.8Q7,-61.4 9.2,-60.8', 1.2, brow);
      break;
    case 'smug':
      s += heyeLid(d, EL[0], EL[1], 1.9, 2.6, lid, 0.42) + heyeLid(d, ER[0], ER[1], 1.7, 2.4, lid, 0.3);
      s += S('M-6.6,-61.2Q-4,-62.2 -1.2,-61.2M4.4,-62.4Q7,-64 9.4,-62.2', 1.3, brow);
      break;
    case 'snooty':
      s += heyeLid(d, EL[0], EL[1], 1.9, 2.6, lid, 0.5, 0.2) + heyeLid(d, ER[0], ER[1], 1.7, 2.4, lid, 0.36, -0.2);
      s += S('M-6.8,-61.4Q-4,-62 -1.2,-61.2', 1.4, brow) + S('M4.2,-62.6Q6.6,-66.2 9.8,-63.2', 1.4, brow);
      break;
    case 'glam':
      s += heyeLid(d, EL[0], EL[1], 2, 2.7, lid, 0.38, 0.3) + heyeLid(d, ER[0], ER[1], 1.8, 2.5, lid, 0.38, 0.3);
      s += S('M-6.8,-62.4Q-3.6,-64.8 -0.8,-62.6M4.4,-62.6Q7.4,-64.6 9.8,-62.4', 1, brow);
      break;
    case 'excited':
      s += heye(EL[0], EL[1] - 0.2, 2.2, 3) + heye(ER[0], ER[1] - 0.2, 2, 2.8);
      s += S('M-6.8,-63.4Q-4,-65.4 -1.2,-63.4M4.4,-63Q7,-65 9.6,-62.8', 1.3, brow);
      break;
    case 'tough':
      s += heyeLid(d, EL[0], EL[1], 1.9, 2.6, lid, 0.3, -0.4) + heyeLid(d, ER[0], ER[1], 1.7, 2.4, lid, 0.3, 0.4);
      s += S('M-7,-62.4L-1.2,-60.6M4.4,-60.6L9.8,-62.6', 1.7, brow);
      break;
    case 'cocky':
      s += heyeLid(d, EL[0], EL[1], 1.9, 2.6, lid, 0.34) + heyeLid(d, ER[0], ER[1], 1.7, 2.4, lid, 0.2);
      s += S('M-7,-61.6L-1.2,-60.6', 1.8, brow) + S('M4.4,-62.6Q7,-65.2 9.8,-63.4', 1.8, brow);
      break;
    case 'whistle':
      s += heye(EL[0], EL[1] - 0.4, 2, 2.8) + heye(ER[0], ER[1] - 0.4, 1.8, 2.6);
      s += S('M-6.8,-61.8L-1.4,-61.4M4.6,-61.2L9.6,-62.4', 1.5, brow);
      break;
    default:
      s += heye(EL[0], EL[1], 1.9, 2.6) + heye(ER[0], ER[1], 1.7, 2.4);
      if (look.face === 'stern') s += S('M-6.6,-61.6L-1.2,-60.4M4.6,-60.2L9.4,-61.2', 1.6, brow);
      else if (look.face === 'nervous') s += S('M-6.6,-61.2Q-4.6,-63.2 -1.4,-62.6M4.6,-62.4Q7.2,-63 9.2,-61.2', 1.3, brow);
      else s += S('M-6.4,-62Q-4,-63.6 -1.4,-62.2M4.6,-61.6Q7,-63 9.2,-61.6', 1.3, brow);
  }
  return s;
}

function moodMouth(d: Doc, look: Look): string {
  let s = '';
  const lipsOn = (m: string) => (look.lips ? S(m, 1, look.lips) : '');
  switch (look.face) {
    case 'grin': {
      const m = 'M-2.4,-50.8C1.6,-49.8 7.8,-49.8 10.6,-51.8C9.8,-45.6 0.4,-44.8 -2.4,-50.8Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P('M-3,-51.6H11V-48.8H-3Z', '#FFFFFF') + P(ell(4, -45.4, 3, 1.5), TONGUE));
      s += S('M1.4,-50.2V-48.8M4,-50V-48.8M6.8,-50.2V-48.8', 0.6, '#C9C2B4');
      s += S('M-2.6,-51.8q-0.8,-0.2 -1.2,0.6M10.8,-52.6q0.9,-0.1 1.2,0.8', 0.9);
      break;
    }
    case 'excited': {
      const m = 'M-1.6,-51C1.6,-50 7.6,-50.2 10.2,-51.8C9.8,-45.6 6,-44.2 3.8,-44.4C1,-44.6 -1.4,-47 -1.6,-51Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P('M-3,-52.4H12V-49.6H-3Z', TOOTH) + P(ell(4.4, -44.8, 3.2, 1.8), TONGUE)) + lipsOn(m);
      break;
    }
    case 'smug':
    case 'snooty':
      s += look.face === 'smug' ? S('M0,-48.8Q3.6,-47.6 7.8,-50.4', 1.3) + S('M7.2,-51.2Q8.4,-50.6 8.4,-49.4', 1) : S('M1.4,-47.6Q4,-49.2 7,-48', 1.3) + S('M6.6,-48.6q0.9,0.3 1,1.2', 0.9);
      break;
    case 'stern':
      s += S('M0.8,-47.4Q4,-48.2 7.2,-47.4', 1.4);
      break;
    case 'bored':
      s += S('M1.6,-48.2Q4,-48.8 6.4,-48', 1.2);
      break;
    case 'nervous':
      s += P('M0.6,-49.6C2.4,-49 5,-49 6.8,-49.8C6.2,-46.6 1.8,-46.4 0.6,-49.6Z', MOUTH, 1.1) + P('M1.6,-49.3H6V-48.5H1.8Z', TOOTH);
      s += sweat(-12.4, -63.6, 0.75, -15);
      break;
    case 'tough': {
      const m = 'M0,-49.4C2.6,-48.6 6.4,-48.8 9,-50.6C8.4,-47 3,-46.4 0,-49.4Z';
      s += P(m, MOUTH, 1.1) + d.clip(m, P('M-1,-50.6H10V-48.2H-1Z', '#5FB7FF') + S('M3,-49V-48M5.6,-49.4V-48.2', 0.5, '#2E7FC2'));
      break;
    }
    case 'cocky': {
      const m = 'M-1.6,-50.4C2,-49.4 7.4,-49.6 10.4,-51.6C9.6,-46.4 1,-45.6 -1.6,-50.4Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P('M-3,-51.6H12V-48.4H-3Z', '#FFFFFF') + S('M2,-50.4V-48.6M4.6,-50.2V-48.6M7.2,-50.6V-48.8', 0.6, '#C9C2B4'));
      break;
    }
    case 'pout': {
      s += P('M1.4,-49.6C2.4,-51.4 5,-51.2 5.8,-50.2C6.8,-50.8 8.4,-50 7.6,-48.6C8,-47 6,-46.2 4.6,-47C3.4,-46.4 1,-47 1.4,-49.6Z', look.lips ?? '#E8607E', 1.1);
      s += S('M2.4,-48.8Q4.6,-48.2 7,-48.8', 0.6, '#9E2E4C') + hl(3.6, -49.9, 0.8, 0.35, -10, 0.8);
      break;
    }
    case 'glam': {
      const m = 'M0,-49.6C2.4,-48.8 6,-48.8 8.6,-50.4C8,-46.2 1.6,-45.8 0,-49.6Z';
      s += P(m, MOUTH, 1) + d.clip(m, P('M-1,-50.6H10V-48.6H-1Z', TOOTH)) + S(m, 1.4, look.lips ?? '#D7263E') + hl(4.2, -46.8, 1.4, 0.4, 0, 0.6);
      break;
    }
    case 'whistle':
      s += P(ell(3.4, -48.4, 1.4, 1.2), MOUTH, 1);
      break;
    case 'calm':
    case 'sweet':
      s += S('M0.6,-49.2Q3.8,-46.4 7.4,-49.4', 1.3) + (look.lips ? S('M1.4,-49.4Q3.8,-47.4 6.6,-49.6', 0.6, look.lips) : '');
      break;
    default: {
      const m = 'M-0.8,-50C1.6,-49.4 5.4,-49.4 7.8,-50.6C7.2,-46.2 1.2,-45.6 -0.8,-50Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P(ell(3.6, -45.8, 2.8, 1.5), TONGUE) + P('M-1,-50.8H9V-49.4H-1Z', TOOTH)) + lipsOn(m);
    }
  }
  return s;
}

/** Zombie mouth library (open, crooked, droopy). */
function zMouth(d: Doc, kind: string, lips?: string): string {
  let s = '';
  const lip = (m: string) => (lips ? S(m, 1.1, lips, 'opacity="0.85"') : '');
  switch (kind) {
    case 'smile': {
      const m = 'M-3.2,-51.6C1,-49.8 8.6,-50 12.2,-52.8C11.2,-46 6,-44.2 3,-44.6C0,-45 -2.6,-47.4 -3.2,-51.6Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P('M-4,-53H13V-49.2H-4Z', TOOTH) + S('M0,-51V-49.2M2.6,-50.8V-49.2M7.6,-51V-49.2M10,-51.6V-49.4', 0.6, '#B9B09A') + P('M4.4,-51H6V-49.2H4.4Z', MOUTH) + P(ell(4, -44.6, 3.6, 1.7), TONGUE));
      s += S('M-3.4,-51.8q-1,0 -1.2,1M12.4,-53q1,0 1.2,1', 0.9);
      s += drool(9.6, -47.4, 4.6, 1.6);
      break;
    }
    case 'underbite': {
      const m = 'M-2.2,-50.4C1.6,-51.4 7,-51.6 10.6,-52.4C11.4,-48.4 8.6,-45.4 4,-45.2C0.6,-45.2 -1.8,-47.2 -2.2,-50.4Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P(ell(4.4, -45.4, 3.4, 1.4), TONGUE));
      s += tooth(0.2, -46.6, 2, 3.4, false) + tooth(7.6, -47.2, 2, 3.8, false) + tooth(4, -51.2, 1.6, 1.4);
      s += drool(10.2, -49.6, 4.2, 1.5);
      break;
    }
    case 'stitched': {
      s += S('M-1.6,-49.2C1.6,-48.4 6,-48.6 9.6,-50.2', 1.4);
      s += S('M0,-50.6L0.6,-47.6M2.4,-50.2L2.8,-47.2M4.8,-50.2L5,-47.2M7.2,-50.8L7.4,-47.8', 0.8);
      s += tooth(8.4, -50, 1.6, 2);
      s += drool(9.6, -49, 4.4, 1.5);
      break;
    }
    case 'gap': {
      const m = 'M-1.6,-50.8C1.8,-50 7.6,-50.2 10,-51.8C9.4,-46.6 4.8,-45 2.4,-45.6C0.2,-46.2 -1.4,-48.2 -1.6,-50.8Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P('M-3,-52.4H12V-49H-3Z', TOOTH) + P('M3.2,-51.2H5.6V-48.8H3.2Z', MOUTH) + S('M1,-51V-49M7.6,-51.2V-49.2', 0.6, '#B9B09A') + P(ell(4.2, -45.6, 3, 1.5), TONGUE));
      s += P('M3.4,-49.4C3.2,-47.6 3.8,-46.6 4.6,-46.6C5.4,-46.6 5.8,-47.6 5.4,-49.4Z', TONGUE, 0.9);
      s += drool(0, -48.2, 4.4, 1.6);
      break;
    }
    case 'toothless': {
      const m = 'M0,-50.2C2,-51 6,-51 8,-50.6C8,-47 5.8,-45.4 4,-45.4C2,-45.4 0,-47 0,-50.2Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P('M-1,-51.4H9V-49.6H-1Z', '#C96A7A') + P(ell(4, -45.6, 2.6, 1.3), TONGUE)) + lip(m);
      s += tooth(5, -50.2, 1.7, 2.2);
      s += drool(1, -47.6, 4.6, 1.5);
      break;
    }
    case 'derp': {
      const m = 'M-1.8,-50.6C1.6,-51.4 6.6,-51.6 9.6,-52.2C9.2,-47.6 5.4,-45.8 2.6,-46.2C0.4,-46.6 -1.4,-48.4 -1.8,-50.6Z';
      s += P(m, MOUTH, 1.2) + lip(m);
      s += tooth(1, -50.8, 1.9, 2) + tooth(5.8, -51.4, 1.8, 2);
      s += P('M3.6,-47.6C3,-44.6 4.8,-42 7.4,-42.4C9.6,-42.8 9.6,-45.4 8.6,-47.6Z', TONGUE, 1) + S('M6.2,-46.6L6.6,-43.6', 0.6, '#B04A64');
      s += drool(-0.8, -48.4, 4.6, 1.6);
      break;
    }
    case 'smirk': {
      const m = 'M0,-49.4C3,-49.8 7,-50.6 9.6,-52.6C9.4,-48 6,-46.2 3.4,-46.6C1.6,-46.8 0.4,-48 0,-49.4Z';
      s += P(m, MOUTH, 1.2) + d.clip(m, P(ell(5.2, -46.4, 2.8, 1.4), TONGUE)) + lip(m);
      s += tooth(6.6, -51, 1.8, 2.1);
      s += drool(1.6, -48, 4.2, 1.5);
      break;
    }
    case 'small': {
      const m = 'M-0.4,-50.2C2.4,-50.6 6.4,-50.8 8.4,-51.4C8,-48.2 5,-46.8 2.8,-47.2C1,-47.6 -0.2,-48.6 -0.4,-50.2Z';
      s += P(m, MOUTH, 1.1) + d.clip(m, P(ell(4.6, -45.8, 3, 1.6), TONGUE)) + lip(m);
      s += tooth(3.2, -50.8, 2, 2.2);
      s += P('M4.4,-47.6C4.2,-45 5.4,-43.8 6.8,-44.2C8,-44.6 8,-46.4 7.4,-48Z', TONGUE, 1);
      s += drool(1.2, -48, 4, 1.5);
      break;
    }
    default: {
      // 'open': the classic crooked groan
      const m = 'M-1.6,-50.4C1.6,-51.2 6.4,-51.2 9,-52.2C8.4,-47.6 4.6,-45.6 2,-46.2C0,-46.8 -1.2,-48.4 -1.6,-50.4Z';
      s += P(m, MOUTH, 1.1) + d.clip(m, P(ell(4.6, -45.8, 3, 1.6), TONGUE)) + lip(m);
      s += tooth(0.6, -50.8, 2, 2.2) + tooth(5.4, -51.4, 1.8, 2);
      s += drool(0, -48, 4.6, 1.7);
    }
  }
  return s;
}

function zombieFace(d: Doc, look: Look, e: Expr): string {
  const brow = look.brow ?? look.hair[1];
  let s = '';
  // skin details shared by every zombie
  s += P(ell(-9.6, -50.6, 2.4, 1.6), PATCH) + P(ell(12.4, -65, 2, 1.4), PATCH);
  s += `<circle cx="-11.4" cy="-55.4" r="0.5" fill="${ZDEEP}"/><circle cx="-9.8" cy="-54" r="0.4" fill="${ZDEEP}"/><circle cx="13.6" cy="-53" r="0.45" fill="${ZDEEP}"/>`;
  if (look.faceUnder) s += look.faceUnder(d, true, e);
  if (look.beard && e !== 'chomp') s += P('M-12.6,-52C-11,-45 -5,-42.4 2,-42.6C9,-42.6 15.6,-46 17,-53C14,-49.6 11.6,-48.6 10,-49L8.6,-45.6L7,-47.2C5,-45 0,-45 -2,-47.4L-3.4,-45.6L-4.4,-49.4C-7,-49 -10,-49.8 -12.6,-52Z', look.beard[0], 1.2);
  if (look.beard && e === 'chomp') s += P('M-12.6,-52C-11,-44 -6,-40 2,-40C10,-40 15.6,-44 17,-53C14,-50 13,-48 12,-47L9,-42C6,-41 -2,-41 -4,-42.4L-6,-48C-8,-49 -10,-50 -12.6,-52Z', look.beard[0], 1.2);
  const nose = S('M2.4,-55Q4.6,-54.4 3.4,-52.4', 1, ZDEEP);
  if (e === 'chomp') {
    s += zeye(d, -4, -58, 4.9, 0, 0, 1.2, -0.6) + zeye(d, 7.4, -57.6, 4, 0, 0, -1, 0.9);
    s += S('M-9.4,-64.8L-0.8,-62.2M3.6,-62L11.6,-64.4', 2, brow);
    s += nose;
    const m = 'M-5,-53C-1,-54.8 9,-55.2 12.6,-53.4C13,-46.6 8.6,-41.6 3.6,-41.4C-1.4,-41.4 -5.4,-46.6 -5,-53Z';
    let teeth = '';
    for (let i = 0; i < 6; i++) {
      const x = -3.6 + i * 2.6;
      teeth += P(`M${f(x)},-55L${f(x + 2.4)},-55L${f(x + 1.2)},${f(-51.6 + (i % 2) * 0.6)}Z`, TOOTH, 0.7);
      if (i < 5) teeth += P(`M${f(x + 1)},-40.6L${f(x + 3.2)},-40.6L${f(x + 2.1)},${f(-43.8 - (i % 2) * 0.6)}Z`, TOOTH, 0.7);
    }
    s += P(m, MOUTH, 1.3) + d.clip(m, P(ell(3.8, -43, 4.6, 2.2), TONGUE) + P(ell(3.8, -49, 3, 2.2), '#3A1012') + teeth) + S(m, 1.3);
    if (look.lips) s += S(m, 1, look.lips, 'opacity="0.8"');
    s += drool(-4.6, -48.6, 5, 1.7) + drool(12.2, -49, 3.6, 1.4);
    s += P(ell(-8.2, -45.6, 0.8), GOO, 0.6) + P(ell(15.6, -46.8, 0.7), GOO, 0.6);
  } else if (e === 'sleep') {
    s += P(ell(-3.8, -57.2, 4.2, 3.6), ZSK[1]) + P(ell(7, -56.8, 3.4, 3), ZSK[1]);
    s += sleepEye(-3.8, -57.4, 3.8, false, 1.4) + sleepEye(7, -57, 3.1, false, 1.4);
    s += S('M-6.6,-54.2Q-4,-53 -1.4,-54.2', 0.7, ZDEEP);
    s += S('M-8.4,-61.8Q-4,-62.6 -0.4,-61.4M4.4,-60.6Q7.6,-61.2 10.6,-60.4', 1.3, brow);
    s += nose;
    const m = 'M0.4,-49.6C2.2,-50.6 5.4,-50.6 6.6,-49.4C6.6,-47.4 5,-46.2 3.4,-46.4C1.8,-46.6 0.4,-47.6 0.4,-49.6Z';
    s += P(m, MOUTH, 1.1) + d.clip(m, P(ell(3.6, -46.4, 2, 1), TONGUE));
    if (look.lips) s += S(m, 1, look.lips, 'opacity="0.8"');
    s += droolString(1, -47, 10, 1.6);
    s += bubble(7.6, -51.8, 3.2, '#DDF6FF');
  } else if (e === 'dazed') {
    s += spiralEye(-3.8, -57.4, 4.4) + P(ell(7.2, -56.8, 3.6), '#FFE14D', 1.2) + xEye(7.2, -56.8, 2);
    s += S('M-8.4,-62.4Q-4,-65.4 -0.4,-62.4M4.4,-63.2Q7.6,-61 10.6,-62.8', 1.4, brow);
    s += nose;
    const m = 'M-1.4,-49.2C1.6,-48.2 6.4,-49 9,-51C8.4,-47.6 5.6,-46 3,-46.2C0.8,-46.4 -1,-47.4 -1.4,-49.2Z';
    s += P(m, MOUTH, 1.1);
    if (look.lips) s += S(m, 1, look.lips, 'opacity="0.8"');
    s += P('M1.2,-47.2C0.2,-44.2 0.8,-40.2 3.4,-40C6,-39.8 6.6,-42.4 5.8,-46.8Z', TONGUE, 1.1) + S('M3.4,-46L3.6,-41.6', 0.6, '#B04A64');
    s += tooth(5.6, -49.6, 1.7, 1.8);
  } else {
    switch (look.zface) {
      case 'grumpy':
        s += zeye(d, -3.8, -57.2, 4.2, 0.48, -1.4, 0.6, 0.8) + zeye(d, 7, -56.6, 3.4, 0.42, 1.2, 0.4, 0.6);
        s += S('M-9.4,-63.2L-0.6,-60.6M3.6,-60.6L11,-62.8', 2, brow);
        s += P('M-0.8,-47.2C1.8,-50.2 6.8,-50.4 9.2,-47.4C6.6,-46.6 1.8,-46.4 -0.8,-47.2Z', MOUTH, 1.1);
        s += tooth(1.6, -47, 1.8, 1.8, false) + tooth(5.6, -47, 1.7, 1.6, false);
        for (const [x, y] of [[-1.4, -44.6], [1.6, -44], [4.6, -44.2], [7.6, -45], [-3.6, -46]] as Pt[]) s += `<circle cx="${f(x)}" cy="${f(y)}" r="0.45" fill="${ZDEEP}"/>`;
        s += drool(-0.2, -47.2, 4.6, 1.7);
        break;
      case 'lazy':
        s += zeye(d, -3.8, -57.4, 4.2, 0.3, 0.7, 0.8, 0.6) + zeye(d, 7, -56.8, 3.7, 0.56, -0.9, 0.2, 0.9);
        s += S('M-8.4,-62.6Q-4,-64.6 -0.4,-63.2M4.4,-60.4Q7.6,-61.4 10.6,-60.6', 1.4, brow);
        s += zMouth(d, look.lips ? 'smirk' : 'open', look.lips);
        break;
      case 'bigeye':
        s += zeye(d, -4, -57.6, 5.1, 0.34, -0.4, 1.4, 0.4) + zeye(d, 7.4, -56.6, 3, 0.2, 0.6, -0.8, 0.8);
        s += S('M-9.4,-64.4Q-4,-66 0.4,-63.6M4.8,-61.6Q7.6,-63.4 10.4,-62', 1.4, brow);
        s += zMouth(d, 'small', look.lips);
        break;
      case 'smile':
        s += zeye(d, -3.8, -57.6, 4.3, 0.4, -0.8, 0.8, 0.8) + zeye(d, 7, -57, 3.6, 0.36, 0.8, 0.2, 0.8);
        s += S('M-8.4,-63.6Q-4,-65.6 -0.4,-63.2M4.4,-62.4Q7.6,-64.4 10.6,-62.2', 1.4, brow);
        s += zMouth(d, 'smile');
        break;
      case 'underbite':
        s += zeye(d, -3.8, -57.4, 4.2, 0.44, 0.9, 0.6, 0.8) + zeye(d, 7.2, -56.8, 3.8, 0.5, -0.6, 0.4, 0.8);
        s += S('M-9,-62.6L-0.4,-61.2M4,-61.2L11,-62.2', 1.8, brow);
        s += zMouth(d, 'underbite');
        break;
      case 'stitched':
        s += zeye(d, -3.8, -57.4, 4.4, 0.38, -0.6, 1, 0.6) + zeye(d, 7, -56.8, 3.4, 0.24, 0.6, 0, 0.8);
        s += S('M-8.4,-63.6Q-4,-65 -0.4,-62.8M4.4,-61.6Q7.6,-63.2 10.6,-61.6', 1.4, brow);
        s += zMouth(d, 'stitched');
        break;
      case 'worm':
        s += zeye(d, -3.8, -57.4, 4.4, 0.42, -0.7, 0.6, 0.8) + zeye(d, 7, -56.8, 3.5, 0.3, 0.8, 0.4, 0.6);
        s += S('M-8.4,-63.4Q-4,-64.8 -0.4,-62.6M4.4,-61.8Q7.6,-63.4 10.6,-61.4', 1.4, brow);
        s += zMouth(d, 'open');
        s += worm(10.6, -66.6, 0.9, 1);
        break;
      case 'derp':
        s += zeye(d, -3.8, -57.4, 4.6, 0.18, 0.4, 1.8, 0.4) + zeye(d, 7.2, -57, 4, 0.12, -0.3, -1.6, 0.6);
        s += S('M-8.8,-64.4Q-4,-66.4 -0.2,-63.6M4.2,-63.4Q7.6,-65.4 11,-63', 1.4, brow);
        s += zMouth(d, 'derp', look.lips);
        break;
      case 'wink':
        s += zeye(d, -4, -57.6, 4.9, 0.12, 0, 0.8, 0.2);
        s += P(ell(-5.6, -59.4, 0.9, 0.9), '#FFFFFF') + `<path d="M-2.6,-56.2l0.5,1.1l1.2,0.1l-0.9,0.8l0.3,1.2l-1.1,-0.6l-1.1,0.6l0.3,-1.2l-0.9,-0.8l1.2,-0.1Z" fill="#FFFFFF"/>`;
        s += S('M3.6,-56.4Q7,-59.2 10.4,-56.2', 1.5) + S('M4.4,-57.6l-0.8,-1.2M9.6,-57.6l0.9,-1.1', 0.8);
        s += S('M-9.2,-64Q-4.4,-66.6 0,-64M4,-61.8Q7.4,-63 10.6,-61.2', 1.4, brow);
        s += zMouth(d, 'smirk', look.lips);
        break;
      case 'oneye':
        s += P(ell(-3.8, -57.2, 4.2, 3.6), ZSK[1], 1.1) + S('M-7.8,-57.4Q-3.8,-55.2 0.2,-57.4', 1.2);
        s += stitches(-7, -55.4, 0.2, -59.4, 3, 1.4, 0.9) + S('M-7.4,-60L-0.6,-54.4', 0.9);
        s += zeye(d, 7.2, -57, 4.4, 0.26, -0.5, -0.2, 0.6);
        s += S('M-8.4,-61.8Q-4,-62.2 -0.4,-61.4', 1.4, brow) + S('M3.2,-63.6Q7.6,-67.2 11.6,-63.6', 1.5, brow);
        s += zMouth(d, 'smirk');
        break;
      case 'gap':
        s += zeye(d, -3.8, -57.4, 4.3, 0.46, -0.9, 0.8, 0.8) + zeye(d, 7.2, -56.8, 3.6, 0.36, 0.7, 0.2, 0.6);
        s += S('M-8.8,-62.8L-0.6,-61.4M4.2,-61.4L10.8,-62.4', 1.8, brow);
        s += zMouth(d, 'gap');
        break;
      case 'toothless':
        s += zeye(d, -3.8, -57.4, 3.9, 0.5, -0.5, 0.4, 0.8) + zeye(d, 7, -56.8, 3.3, 0.36, 0.5, 0.2, 0.8);
        s += S('M-7.6,-62.8Q-4,-64 -0.4,-62.6M4.4,-61.6Q7.2,-62.6 10,-61.4', 1.3, brow);
        s += zMouth(d, 'toothless', look.lips);
        break;
      case 'shades':
        s += zeye(d, -3.8, -57.4, 4.2, 0.3, 0.4, 0.6, 0.6) + zeye(d, 7.2, -57, 3.8, 0.2, -0.3, 0.2, 0.6);
        s += zMouth(d, 'smile');
        break;
      default:
        s += zeye(d, -3.8, -57.4, 4.4, 0.42, -0.7, 0.6, 0.8) + zeye(d, 7, -56.8, 3.5, 0.3, 0.8, 0.4, 0.6);
        s += S('M-8.4,-63.4Q-4,-64.8 -0.4,-62.6M4.4,-61.8Q7.6,-63.4 10.6,-61.4', 1.4, brow);
        s += zMouth(d, 'open', look.lips);
    }
    s += nose;
  }
  if (look.mustache) {
    const mu = d.tone('M-2.6,-51.4C-1,-54.2 2.4,-53.8 3.8,-52.2C5.2,-54 8.8,-54.4 10,-51.6C10.6,-49.4 9.6,-48.4 9.2,-49.6C7.8,-50.8 5.4,-50.8 3.8,-51C2.2,-50.4 -0.8,-50.4 -2,-49.2C-2.8,-49.6 -3,-50.4 -2.6,-51.4Z', look.mustache, 1.1, [-0.4, -0.4]);
    s += e === 'chomp' ? G(mu, 'translate(0 -2.4)') : mu;
  }
  if (look.zface !== 'oneye') s += stitches(-11.6, -63.4, -6.2, -66.8, 2);
  else s += stitches(10.4, -49, 14.2, -52.6, 2);
  return s;
}

function glassesSvg(kind: 'square' | 'round', z: boolean, e: Expr): string {
  const lens = 'fill-opacity="0.32"';
  let s =
    kind === 'round'
      ? P(ell(-3.6, -57.2, 4.4, 4.2), '#CFEFFF', 1.2, OUT, lens) + P(ell(7, -56.8, 3.7, 3.9), '#CFEFFF', 1.2, OUT, lens) + S('M0.8,-57.6Q2,-58.8 3.3,-57.6', 1.1)
      : P(rrect(-7.6, -60.4, 8, 6.4, 2.2), '#CFEFFF', 1.2, OUT, lens) + P(rrect(3.6, -59.8, 6.8, 6, 2), '#CFEFFF', 1.2, OUT, lens) + S('M0.4,-57.6Q2,-58.8 3.6,-57.6', 1.1);
  s += S(kind === 'round' ? 'M-8,-57.8L-14.2,-58.8' : 'M-7.6,-58.2L-14.2,-58.8', 1.1);
  s += hl(-5.4, -59, 1.4, 0.5, -30, 0.8) + hl(5.4, -58.4, 1.2, 0.5, -30, 0.8);
  if (z) s += S('M-6.6,-59.6L-4.4,-57.4L-5.6,-56L-3.4,-54.6M-4.4,-57.4L-2.2,-58.2', 0.6, '#FFFFFF');
  const tr = [z ? 'rotate(5 1 -57)' : '', e === 'scream' || e === 'shock' ? 'translate(0 -2.2)' : e === 'dazed' ? 'rotate(-12 1 -57) translate(0 2)' : ''].filter(Boolean).join(' ');
  return tr ? G(s, tr) : s;
}

// ------------------------------------------------------------------ parts
interface Xf {
  s: number;
  dy: number;
}

function r3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function part(key: string, box: Box, pivot: Pt, xf: Xf, body: (d: Doc) => string): CharPart {
  const d = new Doc(key);
  const inner = body(d);
  const { s, dy } = xf;
  const X0 = Math.floor(s * box[0] * 2) / 2;
  const Y0 = Math.floor(s * (box[1] + dy) * 2) / 2;
  const X1 = Math.ceil(s * box[2] * 2) / 2;
  const Y1 = Math.ceil(s * (box[3] + dy) * 2) / 2;
  const w = X1 - X0;
  const h = Y1 - Y0;
  const pvx = s * pivot[0];
  const pvy = s * (pivot[1] + dy);
  const content = s !== 1 || dy !== 0 ? G(inner, `scale(${f(s)}) translate(0 ${f(dy)})`) : inner;
  return { key, svg: d.build(w, h, content, -X0, -Y0), w, h, px: r3(pvx - X0), py: r3(pvy - Y0), x: r3(pvx), y: r3(pvy) };
}

function shoeFront(d: Doc, look: Look, x0: number): string {
  let s = '';
  if (look.barefoot) {
    const foot = `M${f(x0 - 4.8)},0.4L${f(x0 + 5.6)},0.4C${f(x0 + 6.6)},-1.6 ${f(x0 + 4.4)},-4.2 ${f(x0 + 1)},-4.4C${f(x0 - 2.6)},-4.6 ${f(x0 - 5.4)},-2.6 ${f(x0 - 4.8)},0.4Z`;
    const sk = look.skin;
    s += d.tone(foot, sk, OW, [-0.6, -0.6]);
    s += S(`M${f(x0 + 2.6)},-0.2v-1.4M${f(x0 + 4.2)},-0.2v-1.2`, 0.7, darker(sk[1]));
    return s;
  }
  const h = look.boots ? 6.4 : 4.8;
  if (look.heels) {
    const sh = `M${f(x0 - 3.6)},-0.6L${f(x0 - 3.2)},-4.4C${f(x0 - 1)},-5 ${f(x0 + 2)},-3.6 ${f(x0 + 6.2)},-0.6C${f(x0 + 6.6)},0.6 ${f(x0 + 5)},0.6 ${f(x0 + 3)},0.4L${f(x0 - 1)},-0.8L${f(x0 - 2.4)},0.6L${f(x0 - 3.6)},0.6Z`;
    s += cel(d, sh, look.shoe, { off: [-0.6, -0.6], hi: 0.6 });
    s += hl(x0 + 2.6, -2.2, 1.2, 0.4, 25, 0.6);
    return s;
  }
  const shoe =
    `M${f(x0 - 4.6)},0.4L${f(x0 + 5.8)},0.4C${f(x0 + 6.2)},${f(-h * 0.55)} ${f(x0 + 3.2)},${f(-h)} ${f(x0 + 0.4)},${f(-h)}` +
    `C${f(x0 - 2.8)},${f(-h)} ${f(x0 - 5)},${f(-h * 0.6)} ${f(x0 - 4.6)},0.4Z`;
  s += cel(d, shoe, look.shoe, { off: [-0.8, -0.8], hi: 0.7 });
  s += d.clip(shoe, P(`M${f(x0 - 6)},-1.2H${f(x0 + 7)}V1H${f(x0 - 6)}Z`, look.shoeTrim ?? darker(look.shoe[1], 0.75)));
  s += S(shoe, OW);
  if (look.boots) s += S(`M${f(x0 - 4.4)},${f(-h + 1.6)}L${f(x0 + 2.4)},${f(-h + 1.6)}`, 0.9) + S(`M${f(x0 + 0.2)},${f(-h + 2.6)}l1.6,0.4M${f(x0 + 0.6)},${f(-h + 3.8)}l1.6,0.4`, 0.6, darker(look.shoe[1]));
  else s += S(`M${f(x0 - 0.2)},${f(-h + 1.2)}l1.8,0.8M${f(x0 + 0.6)},${f(-h + 0.4)}l1.6,0.9`, 0.6, darker(look.shoe[1], 0.7));
  s += hl(x0 + 2.4, -h + 1.4, 1.4, 0.55, -10, 0.5);
  return s;
}

function shoeBack(d: Doc, look: Look, x0: number): string {
  if (look.barefoot) {
    const heel = `M${f(x0 - 4)},0.4L${f(x0 + 4.6)},0.4C${f(x0 + 5.2)},-1.4 ${f(x0 + 3.6)},-4 ${f(x0 + 0.4)},-4C${f(x0 - 3)},-4 ${f(x0 - 4.8)},-2 ${f(x0 - 4)},0.4Z`;
    return d.tone(heel, look.skin, OW, [-0.6, -0.6]) + P(ell(x0 - 0.4, -0.6, 2.6, 0.8), '#E9A6A0', 0, OUT, 'opacity="0.6"');
  }
  const h = look.boots ? 6.4 : 4.6;
  if (look.heels) {
    return cel(d, `M${f(x0 - 3)},-0.6L${f(x0 - 3)},-4.2C${f(x0 - 1)},-5 ${f(x0 + 2)},-4.6 ${f(x0 + 3.6)},-3.4L${f(x0 + 3.2)},-0.6L${f(x0 + 0.8)},-0.6L${f(x0 + 0.6)},1.2L${f(x0 - 1)},1.2L${f(x0 - 1.2)},-0.6Z`, look.shoe, { off: [-0.6, -0.6], hi: 0.5 });
  }
  const shoe = `M${f(x0 - 4.4)},0.4L${f(x0 + 4.8)},0.4C${f(x0 + 5.4)},${f(-h * 0.5)} ${f(x0 + 3.4)},${f(-h)} ${f(x0 + 0.4)},${f(-h)}C${f(x0 - 2.6)},${f(-h)} ${f(x0 - 4.8)},${f(-h * 0.6)} ${f(x0 - 4.4)},0.4Z`;
  let s = cel(d, shoe, look.shoe, { off: [-0.8, -0.8], hi: 0.7 });
  s += d.clip(shoe, P(`M${f(x0 - 6)},-1.4H${f(x0 + 7)}V1H${f(x0 - 6)}Z`, look.shoeTrim ?? darker(look.shoe[1], 0.75)));
  s += S(`M${f(x0 - 1.4)},${f(-h + 0.6)}Q${f(x0 - 1.6)},-2.4 ${f(x0 - 1)},-1.4`, 0.8, darker(look.shoe[1]));
  s += S(shoe, OW);
  return s;
}

function legPart(key: string, look: Look, z: boolean, side: -1 | 1, back: boolean, rig: Rig): CharPart {
  const lx = side * rig.legX;
  const hip: Pt = [lx, HIP_Y];
  const ankle: Pt = [lx + side * 0.2, -4.4];
  const lw = rig.legW;
  const box: Box = [lx - 8 - (lw - 6.8), -27, lx + 10 + (lw - 6.8), 3];
  return part(key, box, hip, { s: rig.scale, dy: 0 }, (d) => {
    const sk = z ? ZSK : look.skin;
    let s = '';
    const kind = look.leg ?? 'pants';
    const legT: Tone = look.pants;
    if (kind === 'shorts' || kind === 'bare') {
      s += cel(d, capsule(hip, ankle, lw - 0.6, lw - 1.4), sk, { hi: 0.7 });
      if (look.muscles) s += fold(`M${f(lx - 1.6)},-9.6q1.6,-1 3.2,0`, darker(sk[1]), 0.8);
      if (look.sock) s += d.clip(capsule(hip, ankle, lw - 0.6, lw - 1.4), P(`M${f(lx - 6)},-8.6H${f(lx + 6)}V0H${f(lx - 6)}Z`, look.sock[0]) + S(`M${f(lx - 6)},-7.4H${f(lx + 6)}M${f(lx - 6)},-6.2H${f(lx + 6)}`, 0.7, look.sock[1])) + S(capsule(hip, ankle, lw - 0.6, lw - 1.4), OW);
      if (kind === 'shorts') {
        const sh = z ? tornCapsule([lx, HIP_Y - 1], [lx + side * 0.6, -11.6], lw + 1.6, lw + 2, 3, 1.4) : capsule([lx, HIP_Y - 1], [lx + side * 0.6, -11.6], lw + 1.6, lw + 2.2);
        s += cel(d, sh, legT, { hi: 0.8 });
        if (look.legStripe) s += d.clip(sh, P(`M${f(lx + side * 2.2 - 0.8)},-24V-8h1.6V-24Z`, look.legStripe)) + S(sh, OW);
      }
      if (z) s += rip(d, lx - 0.4, -7.6, 0.6);
    } else if (z && kind === 'pants') {
      s += cel(d, capsule([lx, -10], [ankle[0], -3], 4.6, 4.4), sk, { sw: OW * 0.85, hi: 0.6 });
      const tp = tornCapsule(hip, [lx + side * 0.1, -7.6], lw, lw - 0.2, 3, 1.6);
      s += cel(d, tp, legT);
      s += fold(`M${f(lx - 2)},-13.4q2,0.8 3.8,-0.2`, legT[1], 0.8);
    } else {
      const cap = capsule(hip, ankle, lw, lw - 0.6);
      const t: Tone = kind === 'stockings' ? look.pants : legT;
      s += cel(d, cap, t, { hi: kind === 'stockings' ? 0.5 : 0.9 });
      if (kind === 'leggings' && look.legStripe) s += S(`M${f(lx + 2.2)},-20L${f(lx + 2.2)},-6`, 1.1, look.legStripe);
      if (kind === 'pants') {
        s += fold(`M${f(lx - 2)},-12.4q2,0.9 3.8,-0.2M${f(lx - 1.4)},-7.6q1.4,0.6 2.8,0`, legT[1], 0.8);
        if (look.legStripe) s += d.clip(cap, P(`M${f(lx + side * 2.6 - 0.7)},-24V0h1.4V-24Z`, look.legStripe)) + S(cap, OW);
      }
      if (look.kneepad) s += cel(d, rrect(lx - 3.8, -13.4, 7.6, 5, 2), [look.kneepad, darker(look.kneepad)], { sw: 1.2, hi: 0.5 });
      if (z) s += rip(d, lx - 0.4, -11.6, 0.75);
    }
    const x0 = back ? lx - side * 0.2 : lx + 0.8;
    s += back ? shoeBack(d, look, x0) : shoeFront(d, look, x0);
    return s;
  });
}

function boxingGlove(d: Doc, c: Pt, side: number, col: Tone, z: boolean, back: boolean): string {
  const [x, y] = c;
  let s = cel(d, rrect(x - 3.2, y - 6.2, 6.4, 3.6, 1.2), ['#FFFFFF', '#D5D8DC'], { sw: 1.1, hi: 0 });
  const g = `M${f(x - 4.6)},${f(y - 2)}C${f(x - 5.6)},${f(y + 3)} ${f(x - 3)},${f(y + 6.2)} ${f(x + 0.4)},${f(y + 6.2)}C${f(x + 4.4)},${f(y + 6.2)} ${f(x + 5.6)},${f(y + 2.6)} ${f(x + 4.8)},${f(y - 1.6)}C${f(x + 4.2)},${f(y - 4)} ${f(x - 3.8)},${f(y - 4.4)} ${f(x - 4.6)},${f(y - 2)}Z`;
  s += cel(d, g, col, { off: [-1, -1], hi: 1 });
  if (!back) s += S(`M${f(x - side * 2.6)},${f(y - 1.4)}Q${f(x - side * 1)},${f(y + 2.6)} ${f(x + side * 1.6)},${f(y + 1.4)}`, 0.9, col[1]);
  s += hl(x - 1.6, y - 0.6, 1.6, 0.8, -30, 0.7);
  s += S(`M${f(x - 1)},${f(y - 5.6)}l1.6,1M${f(x + 0.6)},${f(y - 5.6)}l-1.6,1`, 0.6, '#C9C2B4');
  if (z) s += P(ell(x + 1.8, y + 3.6, 1.6, 1.2), GOO, 0.7) + S(`M${f(x - 3)},${f(y + 1)}l1.4,1.4`, 0.8);
  return s;
}

function armPart(key: string, look: Look, z: boolean, side: -1 | 1, back: boolean, rig: Rig): CharPart {
  const near = back ? side === 1 : side === -1;
  const sx = side * rig.shX;
  const aw = rig.armW;
  const sh: Pt = [sx, SH_Y];
  const bent = side === -1 && !!look.bentL && !z;
  const elbowB: Pt = [sx - 1.8, -31.6];
  const wrist: Pt = bent ? [sx + 4.2, -31.4] : [sx + side * 2.3, -28];
  const hand: Pt = bent ? [sx + 6.8, -31.2] : [sx + side * 2.6, -25.2];
  const def: Box = [sx - 9 * aw - (look.boxing ? 2 : 0), -48, sx + 9 * aw + (look.boxing ? 2 : 0), look.boxing ? -16 : -17];
  const box = (side === -1 ? look.boxL : look.boxR) ?? def;
  return part(key, box, sh, { s: rig.scale, dy: -rig.lift }, (d) => {
    const sk = z ? ZSK : look.skin;
    const shapes: string[] = [];
    let s = '';
    const sc = look.sleeveCol;
    const under = side === -1 ? look.underL : look.underR;
    const item = side === -1 ? look.itemL : look.itemR;
    if (look.sleeve === 'long' && bent) {
      const up = capsule(sh, elbowB, 7.4 * aw, 6.8 * aw);
      const fo = capsule(elbowB, wrist, 6.8 * aw, 6.2 * aw);
      s += cel(d, up, sc) + cel(d, fo, sc);
      s += fold(`M${f(elbowB[0] + 1)},${f(elbowB[1] - 2.4)}q1.4,1.4 0.6,3`, sc[1], 0.8);
      if (look.cuff) s += d.clip(fo, P(`M${f(wrist[0] - 1.4)},-40H${f(wrist[0] + 6)}V-20H${f(wrist[0] - 1.4)}Z`, look.cuff)) + S(fo, OW);
      shapes.push(up, fo);
    } else if (look.sleeve === 'long') {
      const d0 = z ? tornCapsule(sh, [wrist[0], wrist[1] + 0.6], 7.4 * aw, 6.4 * aw, 3, 1.4) : capsule(sh, wrist, 7.4 * aw, 6.4 * aw);
      if (z) {
        const fa = capsule([sx + side * 1.8, -32], wrist, 4.8 * aw, 4.6 * aw);
        s += cel(d, fa, sk, { hi: 0.6 });
        shapes.push(fa);
      }
      s += cel(d, d0, sc);
      shapes.push(d0);
      s += fold(`M${f(sx - 1.6)},-34.4q1.6,1 3.2,0.2`, sc[1], 0.8);
      if (look.cuff && !z) s += d.clip(d0, P(`M${f(sx - 8)},${f(wrist[1] - 1.6)}H${f(sx + 8)}V${f(wrist[1] + 6)}H${f(sx - 8)}Z`, look.cuff)) + S(d0, OW);
    } else if (look.sleeve === 'short' || look.sleeve === 'puff') {
      const fa = capsule(sh, wrist, 5.2 * aw, 4.8 * aw);
      s += cel(d, fa, sk, { hi: 0.6 });
      shapes.push(fa);
      if (look.longGlove) {
        const lg = capsule([sx + side * 1.2, -33.4], wrist, 5.2, 5);
        s += cel(d, lg, look.longGlove, { hi: 0.6 });
      }
      const elbow: Pt = [sx + side * 1.1, -34.2];
      const sl =
        look.sleeve === 'puff'
          ? ell(sx + side * 0.4, SH_Y + 1.6, 4.6, 4.4)
          : z
            ? tornCapsule(sh, elbow, 7.8 * aw, 7.2 * aw, 3, 1.3)
            : capsule(sh, elbow, 7.8 * aw, 7.2 * aw);
      s += cel(d, sl, sc);
      shapes.push(sl);
      if (look.sleeve === 'short') s += fold(`M${f(sx - 2)},-37.6q2,1 4,0`, sc[1], 0.8);
      if (look.sleeve === 'short' && look.cuff) s += d.clip(sl, P(`M${f(sx - 8)},-36.2H${f(sx + 8)}V-28H${f(sx - 8)}Z`, look.cuff)) + S(sl, OW);
      if (look.bandage && near) {
        s += G(
          P(rrect(-3.4, -2.8, 6.8, 5.6, 1.4), '#FFFFFF', 1.1) + S('M-3.2,-0.8L3.2,-2M-3.2,1.4L3.2,0.2', 0.7, '#C9C2B4') +
            P(ell(0.8, 0.2, 0.9), '#E06A6A', 0, OUT, 'opacity="0.5"') + S('M3,1.6l1.6,1.6', 1, '#FFFFFF'),
          `translate(${f(sx + side * 1.8)} -31.4) rotate(${f(-side * 10)})`,
        );
      }
    } else if (look.sleeve === 'bulk') {
      // muscular bare arm: fat bicep, forearm
      const up = capsule(sh, [sx + side * 1.4, -33], 8.6 * aw, 7 * aw);
      const fa = capsule([sx + side * 1.4, -33], wrist, 6.8 * aw, 5.6 * aw);
      s += cel(d, fa, sk, { hi: 0.7 });
      s += cel(d, up, sk, { hi: 0.9 });
      s += fold(`M${f(sx - side * 2.6)},-35.4q${f(side * 2.6)},1.6 ${f(side * 5)},0`, darker(sk[1]), 0.9);
      s += hl(sx - 1.4, -38.4, 1.6, 0.8, -40, 0.4);
      shapes.push(fa, up);
    } else {
      const ar = capsule(sh, wrist, 5.4 * aw, 4.8 * aw);
      s += cel(d, ar, sk, { hi: 0.7 });
      shapes.push(ar);
      if (look.longGlove) {
        const lg = capsule([sx + side * 1.2, -33.4], wrist, 5.4, 5);
        s += cel(d, lg, look.longGlove, { hi: 0.6 });
        if (z) s += rip(d, sx + side * 1.6, -31, 0.55);
      }
      if (look.muscles) s += fold(`M${f(sx - 1.8)},-35q1.8,1.2 3.6,0`, darker(sk[1]), 0.8);
    }
    if (look.wristband) s += cel(d, rrect(wrist[0] - 2.9 * aw, wrist[1] - 1.2, 5.8 * aw, 2.8, 0.8), [look.wristband, darker(look.wristband)], { sw: 0.9, hi: 0.5 });
    if (look.watch && near && !back) s += P(rrect(wrist[0] - 2.8, wrist[1] - 0.6, 5.6, 2.2, 0.6), '#FFC83D', 0.9);
    if (under) s += under(d, z, back, hand);
    if (look.boxing) {
      s += boxingGlove(d, hand, side, look.boxing, z, back);
    } else {
      const gl: Tone = look.glove ?? (look.longGlove && !z ? look.longGlove : sk);
      const hd = ell(hand[0], hand[1], 3.9 * Math.max(1, aw * 0.92), 3.7 * Math.max(1, aw * 0.92));
      const thumb = bent ? ell(hand[0] - 0.6, hand[1] - 3, 1.4, 1.6) : ell(hand[0] - side * 2.6, hand[1] - 1.5, 1.6, 1.4);
      s += cel(d, thumb, gl, { sw: OW * 0.75, off: [-0.4, -0.4], hi: 0 });
      s += cel(d, hd, gl, { off: [-0.7, -0.7], hi: 0.6 });
      if (!back) s += S(`M${f(hand[0] - 0.6)},${f(hand[1] + 0.8)}l0.3,1.8M${f(hand[0] + 1)},${f(hand[1] + 0.6)}l0.4,1.8`, 0.8, darker(gl[1]));
      else s += S(`M${f(hand[0] - 1.6)},${f(hand[1] - 1.2)}q1.6,-0.8 3.2,0`, 0.7, darker(gl[1]));
      if (look.glove && z) s += P(ell(hand[0] + side * 0.8, hand[1] + 2.6, 1.4, 1.1), ZSK[0], 0.8) + S(`M${f(hand[0] - 1.6)},${f(hand[1] + 1.6)}l1,0.8l1,-0.6l1,0.8`, 0.7);
      shapes.push(hd, thumb);
    }
    if (item) s += item(d, z, back, hand);
    if (!near) s += shapes.map((p) => P(p, OUT, 0, OUT, 'opacity="0.13"')).join('');
    return s;
  });
}

function torsoPart(key: string, look: Look, z: boolean, back: boolean, rig: Rig): CharPart {
  const box = look.torsoBox ?? [-17, -53, 17, -8];
  return part(key, box, TORSO_PIV, { s: rig.scale, dy: 0 }, (d) => {
    const sk = z ? ZSK : look.skin;
    return neck(d, sk, rig.lift) + (back ? look.torsoBack(d, z) : look.torso(d, z));
  });
}

function headShape(d: Doc, sk: Tone, z: boolean): string {
  let s = cel(d, headD(HCX, HCY, HRX, HRY, 1.12), sk, { off: [-2, -1.8], hi: 1.1, hiCol: z ? ZHI : lighter(sk[0], 0.35) });
  s += hl(-7.4, -68.6, 2.8, 1.4, -35, z ? 0.5 : 0.55, z ? ZHI : '#FFFFFF');
  return s;
}

function headPart(key: string, look: Look, z: boolean, rig: Rig, e: Expr): CharPart {
  const box = look.headBox ?? [-30, -94, 30, -32];
  return part(key, box, NECK, { s: rig.scale, dy: -rig.lift }, (d) => {
    const sk = z ? ZSK : look.skin;
    let s = look.back ? look.back(d, z) : '';
    s += d.tone(ell(-15.2, -56.2, 3.2, 4), sk, OW * 0.9, [-0.6, -0.6]) + S('M-14.6,-58.2q-1.6,1.4 0,3', 0.9, darker(sk[1]));
    s += headShape(d, sk, z);
    if (look.pale) s += P(headD(HCX, HCY, HRX - 1.2, HRY - 1.2, 1.12), '#C9D6E0', 0, OUT, 'opacity="0.12"');
    s += z ? zombieFace(d, look, e) : humanFace(d, look, e);
    if (look.glasses) s += glassesSvg(look.glasses, z, e);
    s += look.hairFront(d, z, e);
    if (look.faceOver) s += look.faceOver(d, z, e);
    if (!z && e === 'scream') s += sweat(-14.8, -64.4, 1.1, -15) + sweat(16.6, -63.6, 0.9, 20) + sweat(-16.8, -56.4, 0.7, -25);
    if (!z && e === 'shock') s += sweat(16.4, -63.6, 0.9, 20) + S('M-13,-76l-1.6,-2.4M-9,-78.6l-0.8,-2.6M15,-75l1.8,-2', 1, OUT);
    if (look.earbuds) s += P(ell(-15.4, -55.4, 1.5, 1.5), '#FFFFFF', 0.9) + P(rrect(-16.2, -54.6, 1.4, 3.2, 0.6), '#FFFFFF', 0.8);
    // zombies hunch: the head drops forward a little
    return z ? G(s, `translate(0.8 1.6) rotate(6 ${f(NECK[0])} ${f(NECK[1])})`) : s;
  });
}

function headBackPart(key: string, look: Look, z: boolean, rig: Rig): CharPart {
  const box = look.headBox ?? [-30, -94, 30, -32];
  return part(key, box, NECK, { s: rig.scale, dy: -rig.lift }, (d) => {
    const sk = z ? ZSK : look.skin;
    let s = look.backBehind ? look.backBehind(d, z) : '';
    s += headShape(d, sk, z);
    if (z) s += P(ell(-6, -51.4, 3, 1.8), PATCH) + stitches(2, -49.4, 9, -51.2, 3);
    s += d.tone(ell(17.4, -55.6, 3, 3.9), sk, OW * 0.9, [-0.6, -0.6]) + S('M17.6,-57.6q1.6,1.4 0,3', 0.9, darker(sk[1]));
    s += look.hairBack(d, z);
    if (look.earbuds) s += P(ell(18.4, -54.6, 1.5, 1.5), '#FFFFFF', 0.9);
    return z ? G(s, `translate(0.8 1.6) rotate(6 ${f(NECK[0])} ${f(NECK[1])})`) : s;
  });
}

// ------------------------------------------------------------------ public API
export function buildChar(id: CharId): CharArt {
  let base: HumanId | 'you' | 'gus';
  let z: boolean;
  if (id === 'you' || id === 'gus') {
    base = id;
    z = id === 'gus';
  } else if (id.endsWith('_z')) {
    base = id.slice(0, -2) as HumanId;
    z = true;
  } else {
    base = id as HumanId;
    z = false;
  }
  const look = LOOKS[base];
  if (!look) throw new Error(`Unknown character id: ${id}`);
  const rig: Rig = { ...DEF_RIG, ...(look.rig ?? {}) };
  const k = (p: string) => `char_${id}_${p}`;
  const parts: CharPart[] = [
    armPart(k('armR'), look, z, 1, false, rig),
    legPart(k('legR'), look, z, 1, false, rig),
    legPart(k('legL'), look, z, -1, false, rig),
    torsoPart(k('torso'), look, z, false, rig),
    headPart(k('head'), look, z, rig, undefined),
    armPart(k('armL'), look, z, -1, false, rig),
  ];
  const backParts: CharPart[] = [
    armPart(k('back_armL'), look, z, -1, true, rig),
    legPart(k('back_legL'), look, z, -1, true, rig),
    legPart(k('back_legR'), look, z, 1, true, rig),
    torsoPart(k('back_torso'), look, z, true, rig),
    armPart(k('back_armR'), look, z, 1, true, rig),
    headBackPart(k('back_head'), look, z, rig),
  ];
  const faces: Partial<Record<FaceName, CharPart>> = {};
  for (const fn of z ? ZOMBIE_FACES : HUMAN_FACES) faces[fn] = headPart(k(`face_${fn}`), look, z, rig, fn);
  return { id, rig: 'biped', parts, backParts, faces, height: look.height };
}

export type { Look };
