/**
 * The bone pile a zombie leaves after eating someone (the original drops one on the floor where the
 * victim fell; it lies there 10 s, then fades out over 3 s). Drawn flat on the floor in the isometric
 * view: a gnawed skull, a picked-clean ribcage, a couple of long bones and some scraps of the victim's
 * clothes in a smear of gore.
 *
 * FRAME: BONES_W x BONES_H, anchor (0.5, 0.7) = the tile point where the victim went down.
 * Variants `bones_pile_0..2` shuffle the bits so a busy floor doesn't repeat.
 */
import type { ArtAsset } from '../art/types';
import type { Pt } from '../art/svg';
import { capsule, ell, f } from '../art/svg';
import { F, INK, L, asset, blob, dot, rnd } from './kit';

export const BONES_W = 72;
export const BONES_H = 40;
export const BONES_KEYS = ['bones_pile_0', 'bones_pile_1', 'bones_pile_2'] as const;

const BONE = '#D9CFAF';
const BONE_S = '#ACA07C';
const BONE_D = '#7A6E52';
// goo, not gore (docs/03): the puddle under a skeleton is green zombie goo, and the bone ends are a
// dried maroon-brown, never a bright red
const GORE = '#45661A';
const GORE_L = '#6E9A2A';
const MARROW = '#5C2A22';

/** A long bone (femur / arm bone) lying on the floor: a shaft with knobbly ends, shaded underneath. */
function longBone(a: Pt, b: Pt, w: number, chewed: boolean): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  let s = F(capsule(a, b, w, w * 0.9), BONE, 0.8);
  // shadow along the lower edge
  s += L(`M${f(a[0] + nx * w * 0.35)},${f(a[1] + ny * w * 0.35)}L${f(b[0] + nx * w * 0.35)},${f(b[1] + ny * w * 0.35)}`, w * 0.45, BONE_S, 'stroke-linecap="round" opacity="0.8"');
  // knuckle ends: two lumps each
  for (const [p, k] of [[a, 1], [b, -1]] as [Pt, number][]) {
    const ux = (dx / len) * k;
    const uy = (dy / len) * k;
    s += F(ell(p[0] + nx * w * 0.55 - ux * 0.6, p[1] + ny * w * 0.55 - uy * 0.6, w * 0.78, w * 0.7), BONE, 0.8);
    s += F(ell(p[0] - nx * w * 0.55 - ux * 0.6, p[1] - ny * w * 0.55 - uy * 0.6, w * 0.78, w * 0.7), BONE, 0.8);
  }
  if (chewed) {
    // tooth marks and a red-raw end
    const m: Pt = [a[0] + dx * 0.55, a[1] + dy * 0.55];
    s += L(`M${f(m[0] - nx * w * 0.5)},${f(m[1] - ny * w * 0.5)}l${f(dx / len)},${f(dy / len)}M${f(m[0] - nx * w * 0.5 + (dx / len) * 2.2)},${f(m[1] - ny * w * 0.5 + (dy / len) * 2.2)}l${f(dx / len)},${f(dy / len)}`, 0.6, BONE_D);
    s += dot(b[0], b[1], w * 0.42, MARROW, 0.85);
  }
  return s;
}

/** A gnawed skull lying tipped on its side, jaw hanging open. */
function skull(cx: number, cy: number, sc: number, flip: number): string {
  const X = (x: number) => cx + x * sc * flip;
  const Y = (y: number) => cy + y * sc;
  const cran = `M${f(X(-6.5))},${f(Y(1))}C${f(X(-8.4))},${f(Y(-4))} ${f(X(-5))},${f(Y(-9))} ${f(X(0.5))},${f(Y(-9))}C${f(X(6))},${f(Y(-9))} ${f(X(8.6))},${f(Y(-5))} ${f(X(7.6))},${f(Y(-0.6))}L${f(X(7))},${f(Y(2.6))}L${f(X(2))},${f(Y(3.6))}L${f(X(-3))},${f(Y(3.4))}Z`;
  let s = F(cran, BONE, 0.9);
  // shading on the lower side and a crack
  s += F(`M${f(X(-6))},${f(Y(0))}C${f(X(-2))},${f(Y(2.2))} ${f(X(4))},${f(Y(1.6))} ${f(X(7.4))},${f(Y(-0.6))}L${f(X(7))},${f(Y(2.6))}L${f(X(2))},${f(Y(3.6))}L${f(X(-3))},${f(Y(3.4))}Z`, BONE_S, 0, 'opacity="0.9"');
  s += L(`M${f(X(-1))},${f(Y(-8.6))}l${f(1.2 * flip * sc)},${f(2.4 * sc)}l${f(-1 * flip * sc)},${f(1.6 * sc)}l${f(1.4 * flip * sc)},${f(2 * sc)}`, 0.55, BONE_D);
  // eye sockets and nose hole
  s += F(ell(X(2.4), Y(-3.4), 1.9 * sc, 1.7 * sc), '#2A2116', 0.5) + F(ell(X(6), Y(-3.2), 1.3 * sc, 1.6 * sc), '#2A2116', 0.5);
  s += F(`M${f(X(4.6))},${f(Y(-0.4))}l${f(0.8 * flip * sc)},${f(1.8 * sc)}l${f(-1.4 * flip * sc)},0Z`, '#2A2116');
  // upper teeth
  for (let k = 0; k < 4; k++) s += F(`M${f(X(1.6 + k * 1.4))},${f(Y(2.4))}h${f(1.1 * flip * sc)}v${f(1.4 * sc)}h${f(-1.1 * flip * sc)}Z`, '#E8E0C4', 0.35);
  // the jaw, knocked askew
  s += F(`M${f(X(-0.4))},${f(Y(4.2))}Q${f(X(4))},${f(Y(7.6))} ${f(X(8.6))},${f(Y(4.6))}L${f(X(8))},${f(Y(3.4))}Q${f(X(4.2))},${f(Y(5.4))} ${f(X(0.4))},${f(Y(3.2))}Z`, BONE, 0.8);
  for (let k = 0; k < 3; k++) s += F(`M${f(X(2.4 + k * 1.6))},${f(Y(4.6))}h${f(1.1 * flip * sc)}v${f(-1.2 * sc)}h${f(-1.1 * flip * sc)}Z`, '#E8E0C4', 0.3);
  return s;
}

/** A ribcage lying on its back: spine down the middle, curved ribs, a couple snapped off. */
function ribs(cx: number, cy: number, sc: number, seed: number): string {
  const r = rnd(seed);
  let s = '';
  // spine
  for (let k = 0; k < 6; k++) s += F(ell(cx - 7 * sc + k * 2.8 * sc, cy + k * 0.6 * sc, 1.5 * sc, 1.2 * sc), k % 2 ? BONE_S : BONE, 0.55);
  // ribs: arcs either side of the spine (foreshortened in the iso view)
  for (let k = 0; k < 5; k++) {
    const x = cx - 5.6 * sc + k * 2.8 * sc;
    const y = cy + k * 0.6 * sc;
    const broken = r() < 0.25;
    const up = 4.2 * sc * (1 - k * 0.08);
    const dn = 3.4 * sc * (1 - k * 0.08);
    s += L(`M${f(x)},${f(y - 0.6 * sc)}q${f(-2.6 * sc)},${f(-up * 0.4)} ${f(-1.2 * sc)},${f(-up)}`, 1.6 * sc, INK, 'stroke-linecap="round"');
    s += L(`M${f(x)},${f(y - 0.6 * sc)}q${f(-2.6 * sc)},${f(-up * 0.4)} ${f(-1.2 * sc)},${f(-up)}`, 0.9 * sc, BONE, 'stroke-linecap="round"');
    if (!broken) {
      s += L(`M${f(x)},${f(y + 0.6 * sc)}q${f(-2.4 * sc)},${f(dn * 0.5)} ${f(-0.6 * sc)},${f(dn)}`, 1.6 * sc, INK, 'stroke-linecap="round"');
      s += L(`M${f(x)},${f(y + 0.6 * sc)}q${f(-2.4 * sc)},${f(dn * 0.5)} ${f(-0.6 * sc)},${f(dn)}`, 0.9 * sc, BONE_S, 'stroke-linecap="round"');
    } else s += dot(x - 1.2 * sc, y + 1.4 * sc, 0.7 * sc, MARROW);
  }
  return s;
}

function pile(variant: number): ArtAsset {
  const key = BONES_KEYS[variant];
  return asset(key, BONES_W, BONES_H, 0.5, 0.7, () => {
    const cx = BONES_W / 2;
    const cy = BONES_H * 0.7;
    const r = rnd(41 + variant * 17);
    let s = '';
    // the gore smear the meal left on the floor, flattened by the iso view
    s += F(blob(cx, cy - 1, 27, 9, 3 + variant, 9, 0.45), GORE, 0, 'opacity="0.55"');
    s += F(blob(cx - 4, cy - 2, 16, 5.5, 9 + variant, 7, 0.4), GORE_L, 0, 'opacity="0.45"');
    for (let k = 0; k < 7; k++) s += dot(cx - 30 + r() * 60, cy - 8 + r() * 14, 0.6 + r() * 1.3, k % 2 ? GORE : GORE_L, 0.7);
    // scraps of the victim's clothes
    const cloth = ['#5E6A78', '#7A6A52', '#6E4A4A'][variant];
    s += F(`M${f(cx + 6)},${f(cy - 7)}l9,-2.4l3.6,3.6l-2.4,4.4l-8.6,1.2l-3,-2.6Z`, cloth, 0.8);
    s += L(`M${f(cx + 8)},${f(cy - 5.4)}l6,-1.2`, 0.5, '#2E2A24', 'opacity="0.6"');
    // long bones, crossed
    const flip = variant === 1 ? -1 : 1;
    s += longBone([cx - 22 * flip, cy + 2], [cx + 2 * flip, cy - 5], 3.4, true);
    s += longBone([cx - 4 * flip, cy + 5], [cx + 20 * flip, cy - 1], 3, variant !== 2);
    // the ribcage and the skull on top
    s += ribs(cx + (variant === 2 ? -10 : 4) * flip, cy - 6, 1, 7 + variant);
    s += skull(cx + (variant === 1 ? 14 : -13) * (variant === 2 ? -1 : 1), cy - 7, 1.15, variant === 1 ? -1 : 1);
    // a little finger bone or two and a fly
    s += F(capsule([cx + 15 * flip, cy + 5], [cx + 18.5 * flip, cy + 4], 0.9, 0.8), BONE, 0.5);
    s += F(capsule([cx - 25 * flip, cy - 4], [cx - 22 * flip, cy - 5.6], 0.9, 0.8), BONE, 0.5);
    s += F(ell(cx + 2, cy - 15, 1.3, 0.9), '#1E1C18') + F(ell(cx + 1.2, cy - 16, 1.1, 0.6), '#C9D4D8', 0.3, 'opacity="0.8"');
    return s;
  });
}

export function buildBones(): ArtAsset[] {
  return BONES_KEYS.map((_, i) => pile(i));
}
