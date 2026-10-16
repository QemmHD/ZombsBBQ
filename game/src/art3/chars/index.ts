/**
 * C1 — joint characters (art v3). Cut-out puppet rigs in the original's grimy adult-cartoon tone.
 *
 * Contract (same as src/art/types.ts CharArt):
 *   parts      front 3/4 view facing screen-right, back→front order: armR, legR, legL, torso, head, armL
 *              (L = screen-left = the near side; armL is drawn over everything)
 *   backParts  back 3/4 view walking away to the upper-right, order: armL, legL, legR, torso, armR, head
 *              (R is the near side); same names and pivots as `parts`. The scene mirrors both views.
 *   faces      expression heads with exactly the head's frame (w, h, px, py, x, y):
 *              humans + you: scream, happy, shock, angry, eat · zombies + gus: chomp, sleep, dazed
 *   keys       char_<id>_<part>, char_<id>_back_<part>, char_<id>_face_<name>
 * Root (0,0) = between the feet, y up negative. Pivots: legs at the hips, arms at the shoulders,
 * torso at its bottom centre, head at the neck. Exact values are in each CharPart.
 */
import type { CharArt, CharPart, FaceName, PartName } from '../../art/types';
import { CUSTOMER_IDS } from '../../art/manifest';
import type { Ctx, Expr, Look } from './rig';
import { NECK_STD, part } from './rig';
import { skullFront, skullBack, earFront, earBack, face } from './head';
import { LOOKS } from './cast';
import { handAt } from './body';
import { ZSKINS } from './paint';

export const CHAR3_BASE_IDS = [...CUSTOMER_IDS, 'joe', 'jane', 'senior', 'hipster'] as const;
export const CHAR3_IDS: string[] = [...CHAR3_BASE_IDS, ...CHAR3_BASE_IDS.map((b) => `${b}_z`), 'you', 'gus'];

export const PART_ORDER3: PartName[] = ['armR', 'legR', 'legL', 'torso', 'head', 'armL'];
export const BACK_PART_ORDER3: PartName[] = ['armL', 'legL', 'legR', 'torso', 'armR', 'head'];
export const HUMAN_FACES3: FaceName[] = ['scream', 'happy', 'shock', 'angry', 'eat'];
export const ZOMBIE_FACES3: FaceName[] = ['chomp', 'sleep', 'dazed'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 9973;
}

function headFront(c: Ctx, e: Expr): string {
  const L = c.L;
  let s = L.hairBehind ? L.hairBehind(c) : '';
  s += skullFront(c, L.face.shape, e);
  if (L.faceUnder) s += L.faceUnder(c, e);
  s += face(c, e);
  if (L.facialHair) s += L.facialHair(c, e);
  if (L.hairFront) s += L.hairFront(c, e);
  if (!L.earHidden) s += earFront(c);
  if (L.faceOver) s += L.faceOver(c, e);
  return s;
}

function headBack(c: Ctx): string {
  const L = c.L;
  let s = L.hairBackBehind ? L.hairBackBehind(c) : '';
  s += skullBack(c, L.face.shape);
  if (L.hairBack) s += L.hairBack(c);
  if (!L.earHidden) s += earBack(c);
  if (L.headBackOver) s += L.headBackOver(c);
  return s;
}

/** Build one joint character rig, or null for an unknown id. */
export function buildChar3(id: string): CharArt | null {
  if (!CHAR3_IDS.includes(id)) return null;
  const isZ = id.endsWith('_z') || id === 'gus';
  const base = id.endsWith('_z') ? id.slice(0, -2) : id;
  const L: Look | undefined = LOOKS[base];
  if (!L) return null;
  const b = L.body;
  const seed = hash(base);
  const sk = isZ ? L.zskin ?? ZSKINS[seed % ZSKINS.length] : L.skin;
  const k = (p: string) => `char_${id}_${p}`;
  const ctx = (d: Ctx['d'], back: boolean, side: -1 | 1, near: boolean): Ctx => ({ d, z: isZ, back, b, L, sk, seed, side, near });

  const leg = (key: string, side: -1 | 1, back: boolean) => {
    const box = L.legBox ?? [-8, -6, 13, -b.hipY + 3];
    return part(key, box, [0, 0], b.s, [side * b.hipX, b.hipY], (d) => L.leg(ctx(d, back, side, back ? side > 0 : side < 0)));
  };
  const arm = (key: string, side: -1 | 1, back: boolean) => {
    let box: [number, number, number, number] = L.armBox ? L.armBox(side) : [-9, -6, 10, b.armLen + 9];
    const ib = L.arm.items?.[side < 0 ? 'L' : 'R']?.box;
    if (ib) {
      const h = handAt(b.armLen, side);
      box = [Math.min(box[0], h[0] + ib[0] - 1), Math.min(box[1], h[1] + ib[1] - 1), Math.max(box[2], h[0] + ib[2] + 1), Math.max(box[3], h[1] + ib[3] + 1)];
    }
    return part(key, box, [0, 0], b.s, [side * b.shX, b.shY], (d) => L.arm(ctx(d, back, side, back ? side > 0 : side < 0)));
  };
  const torso = (key: string, back: boolean) => {
    const box = L.torsoBox ?? [-b.wBot - 6, b.tTop - 9, b.wBot + b.belly + 6, b.tBot + 4];
    return part(key, box, [0, b.hipY + 2], b.s, [0, 0], (d) => L.torso(ctx(d, back, 1, true)));
  };
  const hbox = L.headBox ?? ([-32, -118, 36, -37] as [number, number, number, number]);
  const ht: [number, number] = [b.hunch, b.neckY - NECK_STD[1]];
  const head = (key: string, e: Expr) => part(key, hbox, NECK_STD, b.s, ht, (d) => headFront(ctx(d, false, 1, true), e));
  const headB = (key: string) => part(key, hbox, NECK_STD, b.s, ht, (d) => headBack(ctx(d, true, 1, true)));

  const parts: CharPart[] = [arm(k('armR'), 1, false), leg(k('legR'), 1, false), leg(k('legL'), -1, false), torso(k('torso'), false), head(k('head'), undefined), arm(k('armL'), -1, false)];
  const backParts: CharPart[] = [arm(k('back_armL'), -1, true), leg(k('back_legL'), -1, true), leg(k('back_legR'), 1, true), torso(k('back_torso'), true), arm(k('back_armR'), 1, true), headB(k('back_head'))];
  const faces: Partial<Record<FaceName, CharPart>> = {};
  for (const fn of isZ ? ZOMBIE_FACES3 : HUMAN_FACES3) faces[fn] = head(k(`face_${fn}`), fn as Expr);
  return { id, rig: 'biped', parts, backParts, faces, height: Math.round(L.height * b.s) };
}
