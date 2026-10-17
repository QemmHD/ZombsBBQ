/**
 * Outdoor items: raid tombstones, pet houses and corner-lot street scenery (post-apocalyptic suburbia).
 * 1x1 items use the floor-object frame (OBJ_W wide, anchor = tile centre, facing sw). Exceptions:
 *   car_wreck — 2x1 lying along i: 152 wide, anchor = centre of its FIRST tile; the footprint covers
 *     tile offsets (0,0) and (1,0) (the second tile is down-right of the anchor).
 *   street_lamp (~190 tall) and sign_pole (~210 tall) are anchored at the base of the pole (tile centre).
 * Items with lettering also ship `<key>_se` (text still reads after mirroring): pethouse_pug, pethouse_kennel,
 * bus_bench, newsbox, street_lamp (missing-person flyer), sign_pole.
 * Tombstones glow: tombstone_str red (fist), tombstone_hp green (heart), tombstone_revive violet (a hand clawing up).
 */
import type { ArtAsset } from '../art/types';
import type { Doc } from '../art/svg';
import { capsule, ell, f, hull, poly } from '../art/svg';
import type { Pt } from '../art/svg';
import { F, INK, Iso, L, LW, asset, blob, crack, dot, objAsset, rnd, speckle } from './kit';
import {
  bite,
  box,
  boxShade,
  cap,
  celH,
  cyl,
  cylBody,
  dk,
  eyeball,
  extrudeStack,
  fly,
  fr,
  glow,
  grain,
  grp,
  lettering,
  lt,
  masked,
  objPair,
  rust,
  rustDrip,
  scratches,
  seFace,
  shadow,
  sheen,
  swFace,
  textD,
  unflip,
} from './p2kit';

const EYE_Z = '#DECC54';
const SKIN_Z = '#88BB44';
const SKIN_ZS = '#427E40';
const rect = (x0: number, y0: number, x1: number, y1: number) => `M${f(x0)},${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;

/** Weed tufts around a point (screen space). */
function weeds(x: number, y: number, n: number, seed: number, spread = 10): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const px = x + (r() - 0.5) * spread * 2;
    const py = y + (r() - 0.5) * spread * 0.7;
    const h = 2.5 + r() * 4;
    s += L(`M${f(px - 1)},${f(py)}l${f(-1)},${f(-h)}M${f(px)},${f(py)}l${f(0.3)},${f(-h - 1.4)}M${f(px + 1)},${f(py)}l${f(1.2)},${f(-h * 0.8)}`, 0.7, k % 2 ? '#4A6615' : '#7E9A3A');
  }
  return s;
}

/** Extrude a flat face-frame shape back along -j. */
function extrude(t: Iso, shape: string, i0: number, jf: number, z: number, th: number, face: string, side: string, steps = 6): string {
  void steps;
  return extrudeStack(t, shape, i0, jf, z, th, face, side);
}

// ---------------------------------------------------------------- raid tombstones
function mound(d: Doc, t: Iso, rx: number, ry: number, seed: number, tint: string): string {
  const X = t.cx;
  const Y = t.cy + 2;
  let s = shadow(d, t, 0, 0.04, rx / 60, ry / 38, 0.3);
  const m = blob(X, Y, rx, ry, seed, 9, 0.25);
  s += F(m, d.radial(X - rx * 0.3, Y - ry * 0.6, rx * 1.3, [[0, '#6E5638'], [1, '#43321E']]), 0.9);
  s += speckle(d, m, [X - rx, Y - ry, rx * 2, ry * 2], 40, ['#2E2214', '#8A7050', '#5A4630'], seed + 1, 0.3, 0.8, 0.9);
  s += d.clip(m, glow(d, F(blob(X, Y - 2, rx * 0.6, ry * 0.5, seed + 2), tint), 3, 0.35));
  return s + weeds(X, Y, 8, seed, rx * 0.8);
}

function tombStr(): ArtAsset {
  return objAsset('tombstone_str', 116, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    const red = '#E8402A';
    let s = mound(d, t, 32, 14, 21, red);
    // an angular slab with notched shoulders and a pointed top
    const shape = 'M0,0L0,-36L4,-40L4,-46L15,-58L26,-46L26,-40L30,-36L30,0Z';
    const stone = '#8A5E56';
    const stoneD = '#5E3A36';
    s += glow(d, grp(F(shape, red), swFace(t, -0.31, 0.06, 0)), 5, 0.28);
    s += extrude(t, shape, -0.31, 0.06, 0, 0.13, stone, stoneD, 7);
    let o = speckle(d, shape, [0, -58, 30, 58], 60, ['#5A3430', '#B07A70', '#4A2A26'], 3, 0.3, 0.8);
    o += d.clip(shape, F(shape, d.linear(0, -58, 30, 0, [[0, '#FFE0D0', 0.12], [0.5, '#000', 0], [1, '#000', 0.3]])) + F(blob(6, -2, 8, 3, 4), '#4F6A22', 0, 'opacity="0.6"'));
    // glowing cracks: blurred red halo, hot core
    const cr = crack(22, -50, 1.9, 34, 5, 1, red, 2) + crack(5, -30, 0.7, 18, 9, 0.8, red, 1);
    o += d.clip(shape, glow(d, cr, 1.6, 0.9) + cr + crack(22, -50, 1.9, 34, 5, 0.35, '#FFD0A0', 2));
    // fist emblem, carved and lit from inside
    const fist = 'M9,-27C9,-31 10,-33 12,-33L19,-33C21,-33 22,-31 21.6,-29L21,-24C21,-21 19,-19 16,-19L13,-19L13,-15L18,-15L18,-12L11,-12L11,-19C10,-20 9,-22 9,-24Z';
    o += glow(d, F(fist, red), 1.8, 0.85);
    o += F(fist, '#3A1210', 0.9) + F(fist, '#C0402E', 0, 'opacity="0.75"');
    o += L('M12,-33V-28M15,-33V-28M18,-33V-28M9.4,-27.4H13', 0.6, '#3A1210');
    o += L('M10,-31Q12,-32 14,-32', 0.5, '#FFD0A0', 'opacity="0.8"');
    o += L(shape, LW);
    s += grp(o, swFace(t, -0.31, 0.06, 0));
    // embers drifting up
    s += glow(d, dot(X - 14, Y - 66, 1.2, red) + dot(X + 6, Y - 74, 1, red) + dot(X + 16, Y - 60, 0.9, '#F08A3A'), 0.8, 0.9) + dot(X - 14, Y - 66, 0.5, '#FFD0A0') + dot(X + 6, Y - 74, 0.4, '#FFD0A0');
    return s;
  });
}

function tombHp(): ArtAsset {
  return objAsset('tombstone_hp', 110, (d, t) => {
    const grn = '#7EE04A';
    let s = mound(d, t, 32, 14, 31, grn);
    // a broad rounded headstone
    const shape = 'M0,0L0,-34C0,-50 32,-50 32,-34L32,0Z';
    const stone = '#6E7E62';
    const stoneD = '#46543E';
    s += glow(d, grp(F(shape, grn), swFace(t, -0.33, 0.06, 0)), 5, 0.24);
    s += extrude(t, shape, -0.33, 0.06, 0, 0.12, stone, stoneD, 7);
    let o = speckle(d, shape, [0, -50, 32, 50], 60, ['#4A5A40', '#9AAE8A', '#3A4A34'], 7, 0.3, 0.8);
    o += d.clip(shape, F(shape, d.linear(0, -50, 32, 0, [[0, '#F0FFE0', 0.12], [0.5, '#000', 0], [1, '#000', 0.3]])));
    // moss creeping over the top and up from the base
    o += d.clip(shape, F(blob(10, -44, 9, 4, 3), '#4F7A22', 0, 'opacity="0.85"') + F(blob(26, -4, 8, 5, 4), '#4F7A22', 0, 'opacity="0.75"') + F(blob(4, -6, 6, 6, 5), '#5E8A2A', 0, 'opacity="0.7"'));
    // heart emblem, softly pulsing green
    const heart = 'M16,-12C10,-17 7,-21 7,-25C7,-29 10,-31 12.4,-31C14.2,-31 15.4,-30 16,-28.6C16.6,-30 17.8,-31 19.6,-31C22,-31 25,-29 25,-25C25,-21 22,-17 16,-12Z';
    o += glow(d, F(heart, grn), 2.2, 0.85);
    o += F(heart, '#24401A', 0.9) + F(heart, '#6EC23A', 0, 'opacity="0.85"');
    o += L('M10,-26.6Q10.6,-29 13,-29.4', 0.7, '#E2FFC0', 'opacity="0.85"');
    // stitches across the heart
    o += L('M12,-22l8,0M13,-23.6l0,3.2M16,-23.6l0,3.2M19,-23.6l0,3.2', 0.5, '#24401A');
    o += L(shape, LW);
    s += grp(o, swFace(t, -0.33, 0.06, 0));
    // little glowing sprouts in the dirt
    for (const [i, j] of [[0.3, 0.28], [-0.3, 0.3], [0.38, 0.05]] as [number, number][]) {
      const [x, y] = t.p(i, j);
      s += L(`M${f(x)},${f(y)}q-0.6,-3 0.6,-5`, 0.8, '#4F7A22') + glow(d, F(ell(x + 0.6, y - 5.6, 1.6, 1), grn), 0.8, 0.8) + F(ell(x + 0.6, y - 5.6, 1.4, 0.9), '#9BE04A', 0.4);
    }
    return s;
  });
}

function tombRevive(): ArtAsset {
  return objAsset('tombstone_revive', 122, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    const vio = '#B57AE8';
    let s = mound(d, t, 32, 14, 41, vio);
    // a weathered stone cross
    const shape = 'M10,0L10,-34L0,-34L0,-44L10,-44L10,-58L20,-58L20,-44L30,-44L30,-34L20,-34L20,0Z';
    const stone = '#7A7088';
    const stoneD = '#4E465C';
    s += glow(d, grp(F(shape, vio), swFace(t, -0.31, 0.06, 0)), 5, 0.26);
    s += extrude(t, shape, -0.31, 0.06, 0, 0.12, stone, stoneD, 7);
    let o = speckle(d, shape, [0, -58, 30, 58], 60, ['#4A4256', '#A89CB8', '#3A3446'], 9, 0.3, 0.8);
    o += d.clip(shape, F(shape, d.linear(0, -58, 30, 0, [[0, '#F4E8FF', 0.14], [0.5, '#000', 0], [1, '#000', 0.3]])) + F(blob(14, -2, 7, 4, 6), '#4F6A22', 0, 'opacity="0.6"'));
    // a glowing rune ring where the arms cross
    const ring = 'M15,-45.6A6.6,6.6 0 1 1 14.99,-45.6Z';
    o += glow(d, L(ring, 1.4, vio), 1.8, 0.9) + L(ring, 0.9, '#E6CCFF');
    o += crack(16, -56, 1.6, 20, 7, 0.8, vio, 1);
    o += L(shape, LW);
    s += grp(o, swFace(t, -0.31, 0.06, 0));
    // a zombie hand clawing up out of the dirt in front
    const [hx, hy] = t.p(0.22, 0.26);
    const hand = `M${f(hx - 4)},${f(hy)}L${f(hx - 4)},${f(hy - 9)}L${f(hx - 6)},${f(hy - 15)}L${f(hx - 4.4)},${f(hy - 15.6)}L${f(hx - 2.6)},${f(hy - 11)}L${f(hx - 2.2)},${f(hy - 17)}L${f(hx - 0.6)},${f(hy - 17)}L${f(hx)},${f(hy - 11.4)}L${f(hx + 1.2)},${f(hy - 16)}L${f(hx + 2.8)},${f(hy - 15.4)}L${f(hx + 2)},${f(hy - 10)}L${f(hx + 4.6)},${f(hy - 12.6)}L${f(hx + 5.6)},${f(hy - 11.4)}L${f(hx + 2.4)},${f(hy - 6)}L${f(hx + 2.4)},${f(hy)}Z`;
    s += F(hand, SKIN_Z, LW) + F(`M${f(hx + 0.4)},${f(hy - 8)}L${f(hx + 2.4)},${f(hy - 6)}L${f(hx + 2.4)},${f(hy)}L${f(hx + 0.4)},${f(hy)}Z`, SKIN_ZS, 0);
    s += F(blob(hx, hy, 7, 2.6, 5), '#43321E', 0.8);
    // wisps rising
    s += glow(d, dot(X - 12, Y - 70, 1.2, vio) + dot(X + 8, Y - 78, 1, vio) + dot(X + 14, Y - 62, 0.9, '#E6CCFF'), 0.8, 0.9);
    void EYE_Z;
    return s;
  });
}

// ---------------------------------------------------------------- pet houses
interface HouseOpts {
  i0: number;
  i1: number;
  j0: number;
  j1: number;
  wallH: number;
  ridge: number;
  wall: string;
  wallD: string;
  roof: string;
  roofD: string;
  tin: boolean;
}
function doghouse(d: Doc, t: Iso, o: HouseOpts, doorW: number, doorH: number, seed: number): { s: string; front: string; frontFrame: string } {
  const { i0, i1, j0, j1, wallH, ridge } = o;
  let s = '';
  const b = box(t, i0, i1, j0, j1, 0, wallH, o.wall, o.wall, o.wallD);
  s += b.fills;
  // planks
  const W = (i1 - i0) * 48;
  let pl = '';
  for (let k = 1; k < 6; k++) pl += L(`M0,${f(-k * (wallH / 6))}H${f(W)}`, 0.5, dk(o.wall, 0.35));
  s += d.clip(b.left, grp(pl + grain(d, rect(0, -wallH - 30, W, 0), [0, -wallH - 30, W, wallH + 30], 16, seed, dk(o.wall, 0.4), lt(o.wall, 0.15)), swFace(t, i0, j1, 0)));
  const Dp = (j1 - j0) * 48;
  let pr = '';
  for (let k = 1; k < 6; k++) pr += L(`M0,${f(-k * (wallH / 6))}H${f(Dp)}`, 0.5, dk(o.wallD, 0.35));
  s += d.clip(b.right, grp(pr, seFace(t, i1, j1, 0)));
  s += boxShade(d, t, b, i0, i1, j1, 0, wallH, 0.35);
  // gable on the front
  const im = (i0 + i1) / 2;
  const gable = poly([t.p(i0, j1, wallH), t.p(i1, j1, wallH), t.p(im, j1, ridge)]);
  s += F(gable, o.wall, 0.8) + d.clip(gable, grp(pl, swFace(t, i0, j1, wallH)));
  s += b.lines;
  // door hole
  const frontFrame = swFace(t, i0, j1, 0);
  const dx = (W - doorW) / 2;
  const door = `M${f(dx)},0L${f(dx)},${f(-doorH + doorW / 2)}A${f(doorW / 2)},${f(doorW / 2)} 0 0 1 ${f(dx + doorW)},${f(-doorH + doorW / 2)}L${f(dx + doorW)},0Z`;
  s += grp(F(door, '#120E0A', 0.9) + d.clip(door, F(rect(dx, -doorH, dx + doorW, -doorH + 6), '#000', 0, 'opacity="0.4"')) + L(`M${f(dx - 0.6)},0L${f(dx - 0.6)},${f(-doorH + doorW / 2)}`, 0.5, lt(o.wall, 0.3), 'opacity="0.6"'), frontFrame);
  // roof: two planes, overhanging
  const ov = 0.05;
  const lr = poly([t.p(i0 - ov, j1 + ov, wallH - 2), t.p(im, j1 + ov, ridge + 1), t.p(im, j0 - ov, ridge + 1), t.p(i0 - ov, j0 - ov, wallH - 2)]);
  const rr2 = poly([t.p(im, j1 + ov, ridge + 1), t.p(i1 + ov, j1 + ov, wallH - 2), t.p(i1 + ov, j0 - ov, wallH - 2), t.p(im, j0 - ov, ridge + 1)]);
  s += F(lr, o.roof, LW) + F(rr2, o.roofD, LW);
  if (o.tin) {
    let cg = '';
    for (let k = 0; k <= 10; k++) {
      const j = j0 - ov + ((j1 - j0 + 2 * ov) * k) / 10;
      cg += t.line([im, j, ridge + 1], [i1 + ov, j, wallH - 2], 0.5, dk(o.roofD, 0.3)) + t.line([i0 - ov, j, wallH - 2], [im, j, ridge + 1], 0.5, dk(o.roof, 0.3));
    }
    s += d.clip(lr, cg) + d.clip(rr2, cg);
    s += rust(d, rr2, [[t.p(i1, 0, wallH)[0] - 4, t.p(i1, 0, wallH)[1] - 4, 4], [t.p(im + 0.1, j1, ridge)[0], t.p(im + 0.1, j1, ridge)[1] + 2, 3]], seed) + rust(d, lr, [[t.p(i0, j0, wallH)[0] + 8, t.p(i0, j0, wallH)[1], 3]], seed + 1);
  } else {
    let sh = '';
    for (let k = 1; k < 5; k++) {
      const u = k / 5;
      sh += L(poly([t.p(i0 - ov + (im - i0 + ov) * u, j1 + ov, wallH - 2 + (ridge + 3 - wallH) * u), t.p(i0 - ov + (im - i0 + ov) * u, j0 - ov, wallH - 2 + (ridge + 3 - wallH) * u)]).replace('Z', ''), 0.6, dk(o.roof, 0.35));
      sh += L(poly([t.p(im + (i1 + ov - im) * u, j1 + ov, ridge + 1 - (ridge + 3 - wallH) * u), t.p(im + (i1 + ov - im) * u, j0 - ov, ridge + 1 - (ridge + 3 - wallH) * u)]).replace('Z', ''), 0.6, dk(o.roofD, 0.35));
    }
    s += d.clip(lr, sh) + d.clip(rr2, sh);
    // a missing shingle patch
    s += d.clip(rr2, F(blob(t.p(i1, 0, wallH + 6)[0] - 6, t.p(i1, 0, wallH + 6)[1] - 2, 4, 2.4, seed), '#3A2A1A', 0.5));
  }
  s += t.line([im, j1 + ov, ridge + 1], [im, j0 - ov, ridge + 1], 1.4, INK);
  return { s, front: door, frontFrame };
}

function pethousePug(): ArtAsset[] {
  return objPair('pethouse_pug', 112, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.42, 0.42);
    const h = doghouse(d, t, { i0: -0.3, i1: 0.3, j0: -0.3, j1: 0.26, wallH: 26, ridge: 46, wall: '#7E8A80', wallD: '#5A645C', roof: '#7A2A22', roofD: '#5A1E18', tin: false }, 13, 18, 3);
    s += h.s;
    // chew marks on the door frame + a nameplate over the door
    const W = 0.6 * 48;
    let o = L(`M${f(W / 2 - 7.4)},-6l1,-1l-1,-1l1,-1l-1,-1`, 0.6, '#3A3A30');
    o += F(rect(W / 2 - 7, -27, W / 2 + 7, -22), '#C9B88A', 0.6) + dot(W / 2 - 6, -24.5, 0.4, '#3A2A1A') + dot(W / 2 + 6, -24.5, 0.4, '#3A2A1A');
    o += unflip(L(textD('PUG', W / 2, -23, 3.6, { anchor: 'middle', gap: 0.4 }), 0.8, '#5A1E18'), mir, W / 2);
    s += grp(o, h.frontFrame);
    // food bowl with an eyeball and a finger bone, a rubber brain chew toy
    const [bx, by] = t.p(0.28, 0.42);
    s += F(cylBody(bx, by, 6, 7, 0, 4), celH(d, bx - 7, bx + 7, '#8A2A22', '#5A1A14')) + L(cylBody(bx, by, 6, 7, 0, 4), 0.9) + F(cap(bx, by, 7, 4), '#6A1E18', 0.8) + F(cap(bx, by, 5.6, 3.4), '#5A4A2A', 0.5);
    s += eyeball(bx - 1.4, by - 5, 1.6, '#2C6985', 0.4, -0.3) + F(capsule([bx + 1, by - 4.4], [bx + 4, by - 6.4], 1.2), '#D6CDAE', 0.5);
    const [cx, cy] = t.p(-0.36, 0.4);
    s += F(blob(cx, cy - 2, 4, 3, 7), '#C98A92', 0.7) + L(`M${f(cx - 2)},${f(cy - 3)}q1,1.4 0,2.6M${f(cx + 1)},${f(cy - 3.6)}q-1,1.4 0,2.6`, 0.4, '#8A4A52');
    s += fly(X + 26, Y - 30, 0.9);
    return s;
  });
}

function pethouseKennel(): ArtAsset[] {
  return objPair('pethouse_kennel', 128, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.48, 0.48);
    const h = doghouse(d, t, { i0: -0.38, i1: 0.38, j0: -0.36, j1: 0.3, wallH: 34, ridge: 58, wall: '#5E4630', wallD: '#433220', roof: '#7E7A70', roofD: '#5E5A52', tin: true }, 18, 26, 9);
    s += h.s;
    const W = 0.76 * 48;
    // claw gouges by the door + BEWARE sign nailed crooked
    let o = L('M4,-8l3,-10M6,-7l3,-10M8,-7l3,-9', 0.7, '#2A1E12') + L('M4.4,-8.6l3,-10', 0.4, '#B08452', 'opacity="0.6"');
    o += grp(F(rect(W - 13, -30, W - 1, -22), '#C9A83A', 0.7) + unflip(L(textD('BEWARE', W - 7, -24.4, 3, { anchor: 'middle', gap: 0.25, wide: 0.7 }), 0.7, '#22201C'), mir, W - 7), `rotate(-6 ${f(W - 7)} -26)`);
    s += grp(o, h.frontFrame);
    // chain from inside the door to a snapped collar on the ground
    const [ax, ay] = t.p(0, 0.3, 5);
    let ch = '';
    const pts: Pt[] = [];
    for (let k = 0; k <= 7; k++) pts.push([ax - k * 3.2, ay + 6 + Math.sin(k * 0.9) * 1.5 + k * 1.6]);
    pts.forEach(([x, y], k) => (ch += F(ell(x, y, k % 2 ? 1.6 : 1.2, k % 2 ? 0.9 : 1.4), 'none', 0) + L(ell(x, y, k % 2 ? 1.6 : 1.2, k % 2 ? 0.9 : 1.4), 0.7, k % 2 ? '#6E6A62' : '#55524C')));
    s += ch;
    const [lx, ly] = pts[7];
    s += L(`M${f(lx - 2)},${f(ly + 1)}a4,2 0 1 0 -6,-1`, 2, INK) + L(`M${f(lx - 2)},${f(ly + 1)}a4,2 0 1 0 -6,-1`, 1.2, '#7A2A22') + dot(lx - 7, ly + 0.6, 0.7, '#B8B4A8');
    // gnawed bones
    const bone = (x: number, y: number, a: number) => {
      const c = Math.cos(a) * 4;
      const sn = Math.sin(a) * 4;
      return F(capsule([x - c, y - sn], [x + c, y + sn], 1.6), '#D6CDAE', 0.6) + F(ell(x - c, y - sn, 1.3, 1.1), '#D6CDAE', 0.5) + F(ell(x + c, y + sn, 1.3, 1.1), '#D6CDAE', 0.5);
    };
    const [b1x, b1y] = t.p(0.38, 0.44);
    const [b2x, b2y] = t.p(0.44, 0.24);
    s += bone(b1x, b1y, 0.3) + bone(b2x, b2y, -0.8);
    s += fly(X - 30, Y - 40, 1);
    return s;
  });
}

// ---------------------------------------------------------------- street lamp
function streetLamp(): ArtAsset[] {
  return objPair('street_lamp', 244, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.18, 0.18);
    const iron = '#3E4440';
    const ironD = '#262A28';
    // base: stepped cast-iron plinth
    s += cyl(d, X, Y, 8.4, 8, 0, 4, iron, ironD, '#4E5450').s;
    const flare = `M${f(X - 7)},${f(Y - 4)}C${f(X - 6)},${f(Y - 12)} ${f(X - 3.6)},${f(Y - 18)} ${f(X - 3)},${f(Y - 24)}L${f(X + 3)},${f(Y - 24)}C${f(X + 3.6)},${f(Y - 18)} ${f(X + 6)},${f(Y - 12)} ${f(X + 7)},${f(Y - 4)}Z`;
    s += F(flare, celH(d, X - 7, X + 7, iron, ironD), LW);
    s += rust(d, flare, [[X + 3, Y - 8, 2.4], [X - 4, Y - 14, 1.6]], 3) + d.clip(flare, L(`M${f(X - 5.6)},${f(Y - 9)}h11.2`, 0.6, '#16181A'));
    // pole
    const pole = cylBody(X, Y, 2.8, 2, 24, 178);
    s += F(pole, celH(d, X - 2.8, X + 2.8, '#55605A', '#2E3432')) + L(pole, LW);
    s += rustDrip(X + 1, Y - 150, 22, 1.4) + rustDrip(X - 1, Y - 92, 16, 1.2) + d.clip(pole, F(blob(X + 1, Y - 60, 2, 3, 4), '#8A4A22', 0, 'opacity="0.6"'));
    // a dent / bite in the pole and a tape band
    s += d.clip(pole, L(`M${f(X - 2.6)},${f(Y - 72)}l2,1l-2,1`, 0.6, INK));
    // missing-person flyer stapled on, flapping corner
    let fl = F(rect(0, -14, 10, 0), '#DAD6C8', 0.6) + F(rect(2.4, -10.6, 7.6, -5), '#8E8A80', 0.4) + F(ell(5, -8.6, 1.4, 1.6), '#5A564C');
    fl += unflip(L(textD('MISSING', 5, -11.4, 1.8, { anchor: 'middle', gap: 0.2, wide: 0.8 }), 0.4, '#2A2620'), mir, 5);
    fl += L('M2,-3h6M2,-1.6h4', 0.3, '#5A564C') + F('M10,0l-3,0l3,-3Z', '#B8B4A8', 0.4);
    s += grp(fl, swFace(t, -0.12, 0.04, 54));
    // the arm reaching out over the street, and the cobra-head lamp
    const [ax, ay] = t.p(0, 0, 176);
    const [lx, ly] = t.p(0, 0.62, 186);
    const arm = `M${f(ax)},${f(ay)}C${f(ax)},${f(ay - 12)} ${f(lx + 8)},${f(ly - 6)} ${f(lx)},${f(ly)}`;
    s += L(arm, 3.4, INK) + L(arm, 2, '#55605A');
    s += L(`M${f(ax)},${f(ay + 6)}Q${f(ax - 8)},${f(ay - 2)} ${f(ax - 14)},${f(ay - 6)}`, 1.4, INK) + L(`M${f(ax)},${f(ay + 6)}Q${f(ax - 8)},${f(ay - 2)} ${f(ax - 14)},${f(ay - 6)}`, 0.7, '#55605A');
    // light spilling down from the lamp
    s += glow(d, F(`M${f(lx - 6)},${f(ly + 4)}L${f(lx - 26)},${f(ly + 70)}L${f(lx + 22)},${f(ly + 70)}L${f(lx + 6)},${f(ly + 4)}Z`, '#FFE6A0'), 6, 0.16);
    s += glow(d, F(ell(lx, ly + 4, 12, 6), '#FFE6A0'), 3.4, 0.6);
    const head = `M${f(lx - 10)},${f(ly + 2)}C${f(lx - 9)},${f(ly - 5)} ${f(lx + 6)},${f(ly - 7)} ${f(lx + 10)},${f(ly - 1)}C${f(lx + 9)},${f(ly + 3)} ${f(lx - 6)},${f(ly + 5)} ${f(lx - 10)},${f(ly + 2)}Z`;
    s += F(head, celH(d, lx - 10, lx + 10, '#5E6A64', '#343C38'), LW);
    s += F(`M${f(lx - 7)},${f(ly + 2.6)}C${f(lx - 3)},${f(ly + 5.6)} ${f(lx + 5)},${f(ly + 4)} ${f(lx + 8)},${f(ly + 0.6)}C${f(lx + 4)},${f(ly + 2)} ${f(lx - 3)},${f(ly + 3)} ${f(lx - 7)},${f(ly + 2.6)}Z`, '#FFF2C0', 0.6);
    s += sheen(d, head, lx - 10, ly - 6, 20, 10, 1, 0.3, 4);
    // a crow on the arm
    const [cx, cy] = t.p(0, 0.3, 188);
    s += F(`M${f(cx - 4)},${f(cy - 1)}C${f(cx - 3)},${f(cy - 6)} ${f(cx + 3)},${f(cy - 6)} ${f(cx + 4)},${f(cy - 2)}L${f(cx + 7)},${f(cy)}L${f(cx + 3)},${f(cy)}C${f(cx)},${f(cy + 1)} ${f(cx - 3)},${f(cy + 1)} ${f(cx - 4)},${f(cy - 1)}Z`, '#22201C', 0.7);
    s += F(ell(cx - 4.4, cy - 4.6, 2.2, 2), '#22201C', 0.7) + F(`M${f(cx - 6.4)},${f(cy - 5)}l-2.6,1l2.4,0.6Z`, '#4A4640', 0.4) + dot(cx - 5, cy - 5, 0.5, EYE_Z);
    s += L(`M${f(cx - 1)},${f(cy + 1)}v1.6M${f(cx + 1)},${f(cy + 1)}v1.6`, 0.5, INK);
    s += weeds(X, Y + 2, 5, 7, 8);
    return s;
  });
}

// ---------------------------------------------------------------- hydrant
function hydrant(): ArtAsset {
  return objAsset('hydrant', 84, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.16, 0.16);
    // a leak puddle
    const pd = blob(X - 10, Y + 6, 13, 4.4, 3);
    s += F(pd, '#5E6A70', 0, 'opacity="0.55"') + L(pd, 0.5, '#9FB0B6', 'opacity="0.5"');
    const red = '#8E3226';
    const redD = '#5E1E16';
    s += weeds(X - 10, Y - 1, 4, 3, 4);
    s += cyl(d, X, Y, 9, 9, 0, 3, red, redD, '#9A3A2C').s;
    const body = cylBody(X, Y, 6.4, 6, 3, 24);
    s += F(body, celH(d, X - 6.4, X + 6.4, red, redD));
    // peeling: an older yellow coat showing through
    s += d.clip(body, F(blob(X - 2, Y - 14, 2.4, 3.4, 5), '#B8963A', 0.4) + F(blob(X + 3, Y - 8, 1.6, 2, 6), '#B8963A', 0.4));
    s += rust(d, body, [[X + 3, Y - 5, 2.4], [X - 4, Y - 20, 1.6]], 7);
    s += L(body, LW);
    s += F(cylBody(X, Y, 7.4, 7.4, 22, 25), celH(d, X - 7.4, X + 7.4, '#9A3A2C', redD)) + L(cylBody(X, Y, 7.4, 7.4, 22, 25), 0.9) + F(cap(X, Y, 7.4, 25), '#A84232', 0.9);
    const dome = `M${f(X - 6)},${f(Y - 25)}C${f(X - 6)},${f(Y - 32)} ${f(X + 6)},${f(Y - 32)} ${f(X + 6)},${f(Y - 25)}Z`;
    s += F(dome, celH(d, X - 6, X + 6, '#A84232', redD), 0.9);
    s += F(`M${f(X - 1.6)},${f(Y - 30)}h3.2v-3h-3.2Z`, '#6E2418', 0.7);
    // nozzles: front (toward sw) and side (toward se)
    const [nx, ny] = t.p(0, 0.1, 14);
    s += F(capsule([X - 2, ny], [nx - 4, ny + 2.2], 4.6), red, 0.9) + F(ell(nx - 4.6, ny + 2.6, 2.6, 2.6), '#A84232', 0.8) + dot(nx - 4.6, ny + 2.6, 0.9, redD);
    const [sx, sy] = t.p(0.1, 0, 16);
    s += F(capsule([X + 3, sy], [sx + 3, sy + 1.6], 3.6), redD, 0.9) + F(ell(sx + 3.6, sy + 2, 2, 2.2), '#7A2A1E', 0.8);
    // a chain and a dog leash with an empty collar tied on
    s += L(`M${f(nx - 4)},${f(ny + 4)}Q${f(X - 2)},${f(Y - 6)} ${f(X + 2)},${f(Y - 10)}`, 0.8, '#8E8A80', 'stroke-dasharray="1 0.6"');
    s += L(`M${f(X + 4)},${f(Y - 20)}Q${f(X + 12)},${f(Y - 10)} ${f(X + 14)},${f(Y + 4)}`, 1.6, INK) + L(`M${f(X + 4)},${f(Y - 20)}Q${f(X + 12)},${f(Y - 10)} ${f(X + 14)},${f(Y + 4)}`, 0.9, '#2C6985');
    s += L(ell(X + 15, Y + 5, 3, 1.4), 1.8, INK) + L(ell(X + 15, Y + 5, 3, 1.4), 1, '#7A2A22') + dot(X + 17.4, Y + 5.6, 0.7, '#C9A83A');
    return s;
  });
}

// ---------------------------------------------------------------- mailbox
function mailbox(): ArtAsset {
  return objAsset('mailbox', 100, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.14, 0.14);
    s += weeds(X, Y + 2, 6, 5, 7);
    // leaning wooden post
    const post = box(t, -0.04, 0.04, -0.04, 0.04, 0, 32, '#7A5A36', '#6A4A2A', '#4A321C');
    s += grp(post.fills + post.lines + d.clip(post.left, grain(d, post.left, [X - 6, Y - 40, 8, 40], 5, 3, '#3A2412', '#A07A4A', true)), `rotate(4 ${f(X)} ${f(Y)})`);
    // the box: rounded-top tube along j, door facing sw
    const w = 0.24 * 48;
    const i0 = -0.12;
    const jf = 0.2;
    const th = 0.46;
    const shape = `M0,0L0,-6A${f(w / 2)},${f(w / 2)} 0 0 1 ${f(w)},-6L${f(w)},0Z`;
    const z = 32;
    const metal = '#5E6A6E';
    const metalD = '#3A4448';
    let body = extrudeStack(t, shape, i0, jf, z, th, metal, metalD);
    // highlight along the curved top
    body += L(`M${t.p(i0 + 0.07, jf, z + 11.6).map(f).join(',')}L${t.p(i0 + 0.07, jf - th, z + 11.6).map(f).join(',')}`, 1, lt(metalD, 0.35), 'opacity="0.7"');
    // graffiti tag along the side
    body += grp(L('M8,-3q3,-5 5,0q2,4 5,-2q2,-3 4,1', 0.8, '#C9A83A', 'opacity="0.9"'), seFace(t, i0 + 0.24, jf, z));
    // door face
    let door = F(shape, celH(d, 0, w, metal, dk(metal, 0.2), 0.7), LW);
    door += L('M1.4,-1.4L1.4,-6A4.4,4.4 0 0 1 10.1,-6L10.1,-1.4Z', 0.5, dk(metal, 0.4));
    door += F(rect(4.4, -9, 7.2, -7.6), '#B8BAB4', 0.4);
    // a letter jammed in the door, bloody thumbprint
    door += F('M3,-1.4l6.6,-0.6l0.4,-3.4l-6.6,0.6Z', '#DAD6C8', 0.4) + dot(8, -3, 0.7, '#7A2A22', 0.8);
    door += rust(d, shape, [[2, -1, 1.4], [9, -2, 1]], 6);
    body += grp(door, swFace(t, i0, jf, z));
    // red flag up on the far side
    const [fx, fy] = t.p(0.12, -0.1, z + 4);
    body += L(`M${f(fx)},${f(fy)}l0,-12`, 1.6, INK) + L(`M${f(fx)},${f(fy)}l0,-12`, 0.8, '#8E3226') + F(`M${f(fx)},${f(fy - 12)}l5,1.6l0,3.4l-5,-1.4Z`, '#A84232', 0.7);
    // a chunk bitten clean out of the top-front corner
    const [bx, by] = t.p(i0 + 0.15, jf - 0.1, z + 15.5);
    const bt = bite(d, bx, by, 7, 1.3, 104, 100);
    // silhouette for the tooth-mark ink
    const pts: Pt[] = [];
    for (const j of [jf, jf - th])
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI + (k / 8) * Math.PI;
        const lx = w / 2 + Math.cos(a) * (w / 2);
        const lz = 6 - Math.sin(a) * (w / 2);
        pts.push(t.p(i0 + lx / 48, j, z + lz));
        pts.push(t.p(i0 + (k < 4 ? 0 : w / 48), j, z));
      }
    const sil = poly(hull(pts));
    // the dark inside of the box shows through the bite
    s += d.clip(sil, F(ell(bx, by + 2, 6, 5), '#16140F'));
    s += masked(body, bt.mask) + bt.ink(sil);
    return s;
  });
}

// ---------------------------------------------------------------- bus bench
function busBench(): ArtAsset[] {
  return objPair('bus_bench', 108, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.52, 0.24);
    const ends = (i: number) => {
      const b = box(t, i - 0.04, i + 0.04, -0.16, 0.14, 0, 16, '#9A9890', '#8A8880', '#6A6862');
      return b.fills + speckle(d, b.sil, [X - 60, Y - 40, 120, 60], 20, ['#5A5850', '#B2B0A4'], 3, 0.3, 0.6) + b.lines;
    };
    s += ends(0.4);
    // ad panel backrest
    const i0 = -0.46;
    const i1 = 0.46;
    const W = (i1 - i0) * 48;
    const pb = box(t, i0, i1, -0.17, -0.13, 16, 46, '#4A4C46', '#55574F', '#3A3C36');
    s += pb.fills;
    let ad = F(rect(1.4, -28.6, W - 1.4, -1.4), '#C9B88A', 0.7);
    ad += d.clip(rect(1.4, -28.6, W - 1.4, -1.4), F(rect(1.4, -28.6, 16, -1.4), '#6D1727') + F(rect(16, -28.6, W, -1.4), d.linear(16, 0, W, 0, [[0, '#DAD0A8'], [1, '#B8A878']])));
    // a cartoon pig chef on the red end
    ad += F(ell(8.6, -16, 5, 4.6), '#C98A8A', 0.6) + F(ell(10.6, -15, 2, 1.6), '#B87A7A', 0.5) + dot(10, -15, 0.4, INK) + dot(11.2, -15, 0.4, INK) + F(ell(7.4, -17.6, 0.9, 0.7), EYE_Z, 0.3) + F('M5,-20.6C4,-26 13,-26 12,-20.6Z', '#E2DCC6', 0.5);
    ad += unflip(lettering('ZOMBS', 29.6, -18, 5.4, '#6D1727', 1.1, { anchor: 'middle', gap: 0.25, wide: 0.86 }, 0) + lettering('BBQ', 29.6, -10.6, 5, '#3A4A1E', 1.1, { anchor: 'middle', gap: 0.3 }, 0) + L(textD('2 BLOCKS', 28.6, -4, 2.2, { anchor: 'middle', gap: 0.3 }), 0.45, '#2A2014') + L('M37,-5.2l2,1l-2,1', 0.5, '#2A2014'), mir, 29.6);
    // graffiti, gum, a torn strip
    ad += L('M33,-26q3,3 5,0q2,-2 3,1', 0.9, '#2A2620', 'opacity="0.7"') + F('M34,-28.6L40,-28.6L37,-22Z', '#4A4C46', 0.4);
    ad += F(rect(1.4, -28.6, W - 1.4, -1.4), d.linear(0, -29, 0, 0, [[0, '#000', 0], [1, '#3A2A10', 0.3]]));
    s += grp(ad, swFace(t, i0, -0.13, 16));
    s += pb.lines;
    // seat slats
    for (let k = 0; k < 3; k++) {
      const j0 = -0.12 + k * 0.085;
      const sl = box(t, i0, i1, j0, j0 + 0.07, 15, 17.4, '#9A7044', '#7A5230', '#5A3A1E', 0.9);
      s += sl.fills + d.clip(sl.top, grain(d, sl.top, [X - 50, Y - 40, 100, 30], 8, k + 3)) + sl.lines;
    }
    // an abandoned newspaper and one sneaker under the bench
    const [nx, ny] = t.p(-0.2, 0.0, 17.6);
    s += F(`M${f(nx - 6)},${f(ny)}l8,-2.4l6,3l-8,2.4Z`, '#D6D0BC', 0.6) + L(`M${f(nx - 3)},${f(ny)}l6,-1.6M${f(nx - 2)},${f(ny + 1.2)}l5,-1.4`, 0.35, '#5A564C');
    const [sx, sy] = t.p(0.05, 0.2, 0);
    s += F(`M${f(sx - 4)},${f(sy)}C${f(sx - 4)},${f(sy - 3)} ${f(sx)},${f(sy - 4)} ${f(sx + 2)},${f(sy - 3)}L${f(sx + 4)},${f(sy - 1)}L${f(sx + 4)},${f(sy + 0.6)}Z`, '#DAD6C8', 0.7) + L(`M${f(sx - 4)},${f(sy)}h8`, 0.8, '#7A2A22');
    s += ends(-0.4);
    return s;
  });
}

// ---------------------------------------------------------------- newsbox
function newsbox(): ArtAsset[] {
  return objPair('newsbox', 96, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.3, 0.26);
    for (const [i, j] of [[0.16, -0.14], [-0.16, 0.14], [0.16, 0.14]] as [number, number][]) {
      const [x, y] = t.p(i, j);
      s += L(`M${f(x)},${f(y)}l0,-7`, 2.2, INK) + L(`M${f(x)},${f(y)}l0,-7`, 1.2, '#55574F');
    }
    const i0 = -0.2;
    const i1 = 0.2;
    const j1 = 0.17;
    const col = '#2C5A6E';
    const b = box(t, i0, i1, -0.17, j1, 7, 42, lt(col, 0.1), col, dk(col, 0.3));
    s += b.fills;
    s += rust(d, b.right, [[X + 10, Y - 16, 2.4], [X + 16, Y - 40, 2]], 3) + rust(d, b.left, [[X - 14, Y - 8, 2]], 4);
    s += boxShade(d, t, b, i0, i1, j1, 7, 42, 0.4) + scratches(d, b.left, [X - 20, Y - 50, 40, 50], 16, '#FFFFFF', 5, 0.35);
    const W = (i1 - i0) * 48;
    let o = '';
    // window showing today's paper
    const win = rect(2, -31, W - 2, -14);
    o += F(win, '#E2DCC6', 0.8);
    o += unflip(lettering('DEAD', W / 2, -24.6, 3.6, '#22201C', 0.8, { anchor: 'middle', gap: 0.3 }, 0) + lettering('RISE!', W / 2, -19.6, 3.4, '#7A1E1E', 0.8, { anchor: 'middle', gap: 0.3, wide: 0.9 }, 0), mir, W / 2);
    o += L('M3.4,-29.4H15.8', 0.4, '#5A564C') + F(rect(3.4, -17.4, 8, -15), '#8E8A80') + L('M9,-16.8h7M9,-15.4h5', 0.3, '#5A564C');
    o += d.clip(win, L('M3,-30l5,12', 2, '#FFFFFF', 'opacity="0.35"'));
    o += L(win, 0.8);
    // handle + coin box on top, a bite-shaped dent, a sticker
    o += F(rect(5, -12, W - 5, -10), '#9A9C94', 0.6);
    o += F(rect(2, -6, 8, -2), '#C9A83A', 0.4) + L('M3,-4h4', 0.4, '#2A2620');
    s += grp(o, swFace(t, i0, j1, 7));
    const cb = box(t, -0.1, 0.12, -0.1, 0.06, 42, 48, '#8A8C84', '#7A7C74', '#5A5C54');
    s += cb.fills + cb.lines + F(t.qd(-0.02, 0.06, -0.06, 0.02, 48.1), '#141210');
    // one paper pulled half out of the slot, flapping
    const [px, py] = t.p(-0.1, j1, 26);
    s += F(`M${f(px)},${f(py)}l-6,4l1,7l6,-3Z`, '#D6D0BC', 0.6) + L(`M${f(px - 4)},${f(py + 5)}l3,-2`, 0.4, '#5A564C');
    s += b.lines;
    return s;
  });
}

// ---------------------------------------------------------------- toppled trash can
function streetTrash(): ArtAsset {
  return objAsset('street_trash', 76, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0.02, 0.48, 0.3);
    // garbage spilled out of the mouth (toward +i), drawn under the can's mouth
    const [mx, my] = t.p(0.32, 0.05, 0);
    s += F(blob(mx + 6, my + 1, 14, 5, 3), '#4A4234', 0, 'opacity="0.6"');
    s += F(blob(mx + 8, my - 3, 6, 4.6, 4), '#2A2A28', 0.8) + L(`M${f(mx + 6)},${f(my - 7)}l2,-2l1.4,2`, 0.7, INK); // garbage bag
    // fish skeleton
    s += L(`M${f(mx - 2)},${f(my + 4)}l9,1`, 0.8, '#D6CDAE') + L(`M${f(mx)},${f(my + 3)}l0.4,2.4M${f(mx + 2)},${f(my + 3.2)}l0.4,2.4M${f(mx + 4)},${f(my + 3.4)}l0.4,2.4`, 0.5, '#D6CDAE') + F(`M${f(mx + 7)},${f(my + 5)}l3,-2l0,4Z`, '#D6CDAE', 0.4) + F(`M${f(mx - 2)},${f(my + 4)}l-3,-1.4l0,3Z`, '#B8B09A', 0.4);
    // banana peel, can, bone, a finger
    s += F(`M${f(mx + 16)},${f(my + 2)}q-3,-4 -1,-6q1,2 2,2q1,-2 3,-1q-1,2 -1,4Z`, '#B8963A', 0.6);
    s += F(capsule([mx + 18, my - 4], [mx + 22, my - 6], 3), '#8A2A22', 0.6) + F(ell(mx + 22, my - 6, 1.4, 1.4), '#B8BAB4', 0.4);
    s += F(capsule([mx - 8, my + 7], [mx - 2, my + 9], 1.6), '#D6CDAE', 0.5);
    // the can: corrugated galvanised tube along i, lying on its side, dented
    const R = 10.5;
    const frameAt = (i: number) => fr(t, [i, 0.05, R], [0, -1 / 48, 0], [0, 0, -1]);
    const circ = ell(0, 0, R, R);
    const grad = d.linear(0, -R, 0, R, [[0, '#9A9C94'], [0.4, '#7A7C74'], [0.55, '#5A5C56'], [1, '#3A3C38']]);
    const ia = -0.36;
    const ib = 0.24;
    let can = '';
    for (let k = 0; k <= 14; k++) can += grp(F(ell(0, 0, R + 0.7, R + 0.7), INK), frameAt(ia + ((ib - ia) * k) / 14));
    for (let k = 0; k <= 14; k++) can += grp(F(circ, grad), frameAt(ia + ((ib - ia) * k) / 14));
    for (const k of [2, 5, 9, 12]) can += grp(L(`M${-R},0A${R},${R} 0 0 0 ${R},0`, 1.6, '#2E302C', 'opacity="0.8"') + L(`M${-R},-1A${R},${R} 0 0 0 ${R},-1`, 0.6, '#B8BAB4', 'opacity="0.5"'), frameAt(ia + ((ib - ia) * k) / 14));
    can += grp(F(blob(0, 0, 5, 3, 7), '#2E302C', 0, 'opacity="0.5"'), frameAt(ia + (ib - ia) * 0.4)) ;
    s += can;
    s += sheen(d, poly([t.p(ia, 0.05, R * 2), t.p(ib, 0.05, R * 2), t.p(ib, 0.05, R * 1.2), t.p(ia, 0.05, R * 1.2)]), X - 40, Y - 40, 60, 20, 2, 0.2, 3);
    // the open mouth
    s += grp(F(circ, '#8E908A', LW) + F(ell(0, 0, R - 1.6, R - 1.6), '#141210', 0.6) + F(blob(2, 5, 7, 4, 6), '#2A2A28') + rust(d, ell(0, 0, R - 1.6, R - 1.6), [[-6, 6, 2]], 3), frameAt(ib));
    // the lid, rolled away
    const [lx, ly] = t.p(-0.32, 0.4, 0);
    s += F(ell(lx, ly - 1.4, 11, 4.6), '#7E807A', 0.9) + F(ell(lx, ly - 2.6, 10, 4), '#A8AAA4', LW) + F(capsule([lx - 4, ly - 4.4], [lx + 4, ly - 4.4], 2), '#7E807A', 0.7);
    s += rust(d, ell(lx, ly - 2.6, 10, 4), [[lx + 4, ly - 2, 2]], 4);
    s += fly(X + 22, Y - 16, 1) + fly(X + 8, Y - 26, 0.9) + fly(X + 30, Y - 8, 0.8, false);
    return s;
  });
}

// ---------------------------------------------------------------- dead tree
function deadTree(): ArtAsset {
  return objAsset('dead_tree', 184, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.26, 0.2);
    s += F(blob(X, Y + 1, 18, 7, 4), '#4A3A26', 0, 'opacity="0.8"') + weeds(X, Y + 3, 7, 9, 14);
    const bark = '#5E5040';
    const barkD = '#3A3226';
    // roots + trunk
    const trunk = `M${f(X - 9)},${f(Y + 2)}C${f(X - 6)},${f(Y - 2)} ${f(X - 6)},${f(Y - 30)} ${f(X - 4)},${f(Y - 60)}C${f(X - 3)},${f(Y - 76)} ${f(X - 8)},${f(Y - 86)} ${f(X - 6)},${f(Y - 96)}L${f(X - 2)},${f(Y - 96)}C${f(X - 2)},${f(Y - 84)} ${f(X + 3)},${f(Y - 74)} ${f(X + 3)},${f(Y - 60)}C${f(X + 4)},${f(Y - 30)} ${f(X + 5)},${f(Y - 4)} ${f(X + 10)},${f(Y + 3)}C${f(X + 4)},${f(Y + 3)} ${f(X)},${f(Y + 1)} ${f(X - 9)},${f(Y + 2)}Z`;
    const limb = (p: string, w: number) => L(p, w + 1.8, INK) + L(p, w, barkD) + grp(L(p, w * 0.5, bark), 'translate(-0.5 -0.3)');
    // back branches first
    s += limb(`M${f(X + 1)},${f(Y - 70)}C${f(X + 10)},${f(Y - 84)} ${f(X + 20)},${f(Y - 90)} ${f(X + 30)},${f(Y - 112)}`, 3.2);
    s += limb(`M${f(X + 22)},${f(Y - 96)}C${f(X + 28)},${f(Y - 98)} ${f(X + 34)},${f(Y - 96)} ${f(X + 40)},${f(Y - 100)}`, 1.6);
    s += limb(`M${f(X + 27)},${f(Y - 106)}L${f(X + 24)},${f(Y - 124)}`, 1.2);
    s += F(trunk, celH(d, X - 9, X + 10, bark, barkD, 0.55), LW);
    s += grain(d, trunk, [X - 9, Y - 96, 19, 98], 18, 3, '#2A2418', '#8A7A60', true);
    s += d.clip(trunk, F(ell(X - 1, Y - 40, 2.2, 3.4), '#1E1A12', 0.6)); // knot hole
    s += limb(`M${f(X - 3)},${f(Y - 56)}C${f(X - 14)},${f(Y - 64)} ${f(X - 22)},${f(Y - 70)} ${f(X - 30)},${f(Y - 92)}`, 3.4);
    s += limb(`M${f(X - 20)},${f(Y - 70)}C${f(X - 28)},${f(Y - 72)} ${f(X - 36)},${f(Y - 70)} ${f(X - 42)},${f(Y - 76)}`, 1.6);
    s += limb(`M${f(X - 28)},${f(Y - 86)}L${f(X - 22)},${f(Y - 104)}M${f(X - 30)},${f(Y - 92)}L${f(X - 36)},${f(Y - 108)}`, 1.2);
    s += limb(`M${f(X - 4)},${f(Y - 94)}C${f(X - 2)},${f(Y - 110)} ${f(X + 6)},${f(Y - 118)} ${f(X + 4)},${f(Y - 136)}`, 2.2);
    s += limb(`M${f(X - 3)},${f(Y - 108)}L${f(X - 14)},${f(Y - 126)}M${f(X + 4)},${f(Y - 124)}L${f(X + 12)},${f(Y - 134)}`, 1.1);
    // twigs
    s += L(`M${f(X - 42)},${f(Y - 76)}l-4,-3M${f(X - 42)},${f(Y - 76)}l1,-5M${f(X + 40)},${f(Y - 100)}l4,-2M${f(X + 40)},${f(Y - 100)}l1,-5M${f(X - 22)},${f(Y - 104)}l3,-4M${f(X - 36)},${f(Y - 108)}l-3,-3M${f(X + 4)},${f(Y - 136)}l-2,-4M${f(X + 4)},${f(Y - 136)}l3,-3M${f(X - 14)},${f(Y - 126)}l-3,-3`, 0.8, INK);
    // a tattered kite snagged in the top branches
    const kx = X + 14;
    const ky = Y - 130;
    s += F(`M${f(kx)},${f(ky - 8)}L${f(kx + 6)},${f(ky)}L${f(kx)},${f(ky + 9)}L${f(kx - 5)},${f(ky)}Z`, '#8A3A2A', 0.7) + L(`M${f(kx)},${f(ky - 8)}L${f(kx)},${f(ky + 9)}M${f(kx - 5)},${f(ky)}L${f(kx + 6)},${f(ky)}`, 0.4, '#3A1A12');
    s += F(`M${f(kx + 2)},${f(ky + 3)}L${f(kx + 6)},${f(ky)}L${f(kx + 3.6)},${f(ky + 5)}Z`, '#141210');
    s += L(`M${f(kx)},${f(ky + 9)}q3,6 -1,10q-3,4 2,9q2,4 -1,8`, 0.4, '#DAD6C8');
    // a crow on the left limb
    const [cx, cy] = [X - 34, Y - 74];
    s += F(`M${f(cx - 4)},${f(cy - 1)}C${f(cx - 3)},${f(cy - 6)} ${f(cx + 3)},${f(cy - 6)} ${f(cx + 4)},${f(cy - 2)}L${f(cx + 7)},${f(cy)}L${f(cx + 3)},${f(cy)}C${f(cx)},${f(cy + 1)} ${f(cx - 3)},${f(cy + 1)} ${f(cx - 4)},${f(cy - 1)}Z`, '#22201C', 0.7);
    s += F(ell(cx - 4.4, cy - 4.6, 2.2, 2), '#22201C', 0.7) + F(`M${f(cx - 6.4)},${f(cy - 5)}l-2.6,1l2.4,0.6Z`, '#4A4640', 0.4) + dot(cx - 5, cy - 5, 0.5, EYE_Z);
    return s;
  });
}

// ---------------------------------------------------------------- bushes
function bushBlob(d: Doc, cx: number, cy: number, rx: number, ry: number, seed: number, tone: number, dead = false): string {
  const cols = [['#3A4F1A', '#2A3A12'], ['#4A6420', '#3A4F1A'], ['#5E7628', '#4A6420']][tone];
  const p = blob(cx, cy, rx, ry, seed, 11, 0.45);
  let o = F(p, cols[1], 0.9);
  o += d.clip(p, F(blob(cx - rx * 0.25, cy - ry * 0.3, rx * 0.8, ry * 0.7, seed + 1, 9, 0.4), cols[0]));
  const r = rnd(seed);
  for (let k = 0; k < 16; k++) {
    const a = r() * Math.PI * 2;
    const x = cx + Math.cos(a) * rx * (0.5 + r() * 0.45);
    const y = cy + Math.sin(a) * ry * (0.5 + r() * 0.45);
    o += L(`M${f(x)},${f(y)}l${f(Math.cos(a) * 2.4)},${f(Math.sin(a) * 2.4 - 1)}`, 0.8, k % 5 === 0 || dead ? '#7A6A34' : lt(cols[0], 0.2));
  }
  if (dead) o += d.clip(p, F(blob(cx + rx * 0.3, cy, rx * 0.5, ry * 0.5, seed + 3), '#7A6A34', 0, 'opacity="0.75"'));
  return o;
}
function bush1(): ArtAsset {
  return objAsset('bush_1', 80, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.36, 0.3);
    s += bushBlob(d, X + 4, Y - 18, 15, 12, 3, 0) + bushBlob(d, X - 10, Y - 12, 13, 10, 5, 1, true) + bushBlob(d, X + 9, Y - 8, 12, 9, 7, 2) + bushBlob(d, X - 2, Y - 24, 10, 8, 9, 2);
    // a plastic bag snagged in it
    s += F(`M${f(X + 12)},${f(Y - 22)}q4,-3 7,0q1,4 -2,6q-4,1 -5,-6Z`, '#DAD6C8', 0.6, 'opacity="0.9"') + L(`M${f(X + 14)},${f(Y - 20)}q2,1 3,0`, 0.4, '#8E8A80');
    return s;
  });
}
function bush2(): ArtAsset {
  return objAsset('bush_2', 76, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.44, 0.3);
    s += bushBlob(d, X + 12, Y - 12, 16, 10, 13, 0, true) + bushBlob(d, X - 12, Y - 10, 16, 10, 15, 1) + bushBlob(d, X, Y - 18, 18, 11, 17, 1);
    // something inside is watching: two pupil-less yellow eyes in a dark gap
    s += F(blob(X - 1, Y - 18, 7, 3.6, 21), '#141A0C', 0);
    s += glow(d, F(ell(X - 4, Y - 18.4, 1.6, 1), EYE_Z) + F(ell(X + 2, Y - 18, 1.6, 1), EYE_Z), 1.2, 0.9) + F(ell(X - 4, Y - 18.4, 1.3, 0.8), EYE_Z) + F(ell(X + 2, Y - 18, 1.3, 0.8), EYE_Z);
    s += bushBlob(d, X + 2, Y - 9, 14, 7, 19, 2);
    // and a green hand gripping a branch
    s += F(blob(X + 18, Y - 22, 2.6, 2, 3), SKIN_Z, 0.7) + L(`M${f(X + 16.4)},${f(Y - 23)}l0,-2.4M${f(X + 18)},${f(Y - 23.6)}l0,-2.6M${f(X + 19.6)},${f(Y - 23)}l0.4,-2.2`, 1.4, INK) + L(`M${f(X + 16.4)},${f(Y - 23)}l0,-2.4M${f(X + 18)},${f(Y - 23.6)}l0,-2.6M${f(X + 19.6)},${f(Y - 23)}l0.4,-2.2`, 0.8, SKIN_Z) + L(`M${f(X + 16)},${f(Y - 21)}l4,0`, 0.4, SKIN_ZS);
    return s;
  });
}

// ---------------------------------------------------------------- traffic cone
function trafficCone(): ArtAsset {
  return objAsset('traffic_cone', 72, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.22, 0.22);
    const base = box(t, -0.14, 0.14, -0.14, 0.14, 0, 2.4, '#3A2A1E', '#2E2218', '#1E160E');
    s += base.fills + base.lines;
    const org = '#C0622C';
    const orgD = '#86401C';
    const cone = `M${f(X - 8.4)},${f(Y - 2)}L${f(X - 1.6)},${f(Y - 30)}L${f(X + 1.6)},${f(Y - 30)}L${f(X + 8.4)},${f(Y - 2)}A8.4,${f(8.4 * 0.625)} 0 0 1 ${f(X - 8.4)},${f(Y - 2)}Z`;
    s += F(cone, celH(d, X - 8.4, X + 8.4, org, orgD, 0.6));
    // dirty reflective bands
    s += d.clip(cone, F(rect(X - 10, Y - 21, X + 10, Y - 16), '#D6D2C4') + F(rect(X - 10, Y - 12, X + 10, Y - 8.4), '#C9C5B6') + F(rect(X + 2, Y - 22, X + 10, Y - 7), '#000', 0, 'opacity="0.2"'));
    s += d.clip(cone, F(blob(X - 2, Y - 4, 6, 3, 3), '#3A2A1A', 0, 'opacity="0.5"') + speckle(d, cone, [X - 9, Y - 31, 18, 31], 30, ['#4A2A12', '#E08A4A'], 4, 0.3, 0.6));
    s += d.clip(cone, crack(X + 1, Y - 28, 1.7, 10, 5, 0.6, '#3A1A0A', 0));
    s += L(cone, LW) + F(ell(X, Y - 30, 1.6, 1), '#5A2A12', 0.6);
    // tire tread across it
    s += d.clip(cone, L(`M${f(X - 10)},${f(Y - 6)}l20,-3M${f(X - 10)},${f(Y - 4.4)}l20,-3`, 0.6, '#2A2622', 'stroke-dasharray="1.2 0.8"'));
    return s;
  });
}

// ---------------------------------------------------------------- car wreck (2x1 along i)
function carWreck(): ArtAsset {
  const Wd = 152;
  const Hd = 132;
  const cx = 52;
  const cy = Hd - 64;
  return asset('car_wreck', Wd, Hd, cx / Wd, cy / Hd, (d) => {
    const t = new Iso(cx, cy);
    let s = '';
    const ia = -0.38;
    const ib = 1.38;
    const ja = -0.34;
    const jb = 0.34;
    s += `<g filter="${d.blur(2.4)}" opacity="0.38">${F(poly([t.p(ia - 0.04, ja - 0.04), t.p(ib + 0.06, ja - 0.04), t.p(ib + 0.06, jb + 0.06), t.p(ia - 0.04, jb + 0.06)]), '#140F08')}</g>`;
    const paint = '#4E6A66';
    const paintD = '#344A48';
    // far-side wheels peek out under the body
    const wheelAt = (i: number, j: number, flat: number) => {
      const frm = swFace(t, i - 0.13, j, 0);
      const r = 6.4;
      const tyre = `M${f(0.6)},${f(-r + 0.6)}C${f(0.6)},${f(-2 * r)} ${f(2 * r - 0.6)},${f(-2 * r)} ${f(2 * r - 0.6)},${f(-r + 0.6)}C${f(2 * r + flat)},${f(-0.6)} ${f(2 * r)},0 ${f(r)},0C0,0 ${f(-flat)},${f(-0.6)} ${f(0.6)},${f(-r + 0.6)}Z`;
      return grp(F(tyre, '#22201C', LW) + F(ell(r, -r + 0.4, r * 0.5, r * 0.5), '#6E5A44', 0.6) + dot(r, -r + 0.4, 1, '#3A2A1A') + rust(d, ell(r, -r + 0.4, r * 0.5, r * 0.5), [[r - 1, -r + 1, 1.6]], 3) + L(`M${f(r * 0.4)},${f(-0.8)}q${f(r * 0.6)},0.8 ${f(r * 1.2)},0`, 0.5, '#4A4640'), frm);
    };
    s += wheelAt(1.1, ja + 0.04, 2.4);
    // lower body
    const body = box(t, ia, ib, ja, jb, 6, 28, paint, paint, paintD);
    s += body.fills;
    // cabin (greenhouse): slanted windshield toward +i, rear glass toward -i
    const zr = 52;
    const ir0 = 0.22;
    const ir1 = 0.72;
    const iw0 = -0.02;
    const iw1 = 0.98;
    const jc0 = ja + 0.04;
    const jc1 = jb - 0.04;
    const sideWin = poly([t.p(iw0, jc1, 28), t.p(iw1, jc1, 28), t.p(ir1, jc1, zr), t.p(ir0, jc1, zr)]);
    const roof = t.qd(ir0, ir1, jc0, jc1, zr);
    const shield = poly([t.p(ir1, jc1, zr), t.p(iw1, jc1, 28), t.p(iw1, jc0, 28), t.p(ir1, jc0, zr)]);
    // rear glass is hidden behind the cabin side from this view; draw roof + side + windshield
    s += F(sideWin, paint, LW);
    // side windows: one intact (grimy), one gone
    const sw1 = poly([t.p(iw0 + 0.06, jc1, 29.6), t.p(0.47, jc1, 29.6), t.p(0.47, jc1, zr - 2), t.p(ir0 + 0.04, jc1, zr - 2)]);
    const sw2 = poly([t.p(0.53, jc1, 29.6), t.p(iw1 - 0.07, jc1, 29.6), t.p(ir1 - 0.03, jc1, zr - 2), t.p(0.53, jc1, zr - 2)]);
    s += F(sw1, '#7E9294', 0.8) + d.clip(sw1, F(blob(t.p(0.2, jc1, 36)[0], t.p(0.2, jc1, 36)[1], 10, 5, 3), '#5A5A3A', 0, 'opacity="0.5"') + L(`M${t.p(0.1, jc1, 31).map(f).join(',')}l8,-10`, 1.6, '#FFFFFF', 'opacity="0.35"'));
    s += F(sw2, '#141612', 0.8) + d.clip(sw2, F(poly([t.p(0.53, jc1, 29.6), t.p(0.6, jc1, 29.6), t.p(0.56, jc1, 33)]), '#7E9294', 0.4));
    s += F(roof, lt(paint, 0.12), LW);
    // a dent caved into the roof
    s += d.clip(roof, F(blob(t.p(0.45, 0, zr)[0], t.p(0.45, 0, zr)[1], 9, 4, 5), paintD, 0, 'opacity="0.7"') + L(`M${t.p(0.36, -0.1, zr).map(f).join(',')}q6,3 12,0`, 0.6, '#C9D6D2', 'opacity="0.6"'));
    // windshield: smashed outward from the inside — a hole, radial cracks, a green arm hanging out
    s += F(shield, '#7E9294', LW);
    const [hx, hy] = t.p((ir1 + iw1) / 2, 0, (zr + 28) / 2);
    let gl = F(blob(hx, hy, 6, 5, 7, 9, 0.5), '#141612', 0.6);
    for (let k = 0; k < 9; k++) gl += crack(hx, hy, (k / 9) * Math.PI * 2, 12, 20 + k, 0.5, '#DDE8E8', 0);
    gl += L(ell(hx, hy, 9, 7), 0.4, '#DDE8E8', 'opacity="0.7"') + F(blob(hx + 3, hy - 4, 3, 2, 8), '#7A2A22', 0, 'opacity="0.6"');
    s += d.clip(shield, gl);
    s += F(capsule([hx, hy], [hx + 9, hy + 10], 4, 3.4), SKIN_Z, 0.8) + F(capsule([hx - 1, hy - 1], [hx + 2, hy + 2], 4.6, 4.4), '#55553F', 0.7);
    s += F(blob(hx + 10, hy + 12, 2.6, 2.2, 9), SKIN_Z, 0.7) + L(`M${f(hx + 9)},${f(hy + 13)}l-0.6,3M${f(hx + 10.6)},${f(hy + 13.4)}l0,3.2M${f(hx + 12)},${f(hy + 13)}l0.6,2.6`, 1.4, INK) + L(`M${f(hx + 9)},${f(hy + 13)}l-0.6,3M${f(hx + 10.6)},${f(hy + 13.4)}l0,3.2M${f(hx + 12)},${f(hy + 13)}l0.6,2.6`, 0.8, SKIN_Z);
    s += L(`M${f(hx + 4)},${f(hy + 4)}l1.6,-1M${f(hx + 5.6)},${f(hy + 6)}l1.6,-1`, 0.4, SKIN_ZS);
    // glass shards on the hood
    const r = rnd(12);
    for (let k = 0; k < 7; k++) {
      const [gx, gy] = t.p(1.05 + r() * 0.3, -0.2 + r() * 0.4, 28.2);
      s += F(poly([[gx, gy], [gx + 1.6, gy - 0.6], [gx + 0.8, gy + 1]]), '#C9D6D6', 0.3);
    }
    // body details on the long side (local frame along i, 0..84 px, y = -z from 6)
    const L0 = (ib - ia) * 48;
    let side = '';
    const ZH = 22;
    // mismatched primer door, door seams, handles
    side += F(rect(L0 * 0.36, -ZH + 0.4, L0 * 0.56, -0.4), '#8A8A80');
    side += L(`M${f(L0 * 0.36)},${-ZH}V0M${f(L0 * 0.56)},${-ZH}V0M${f(L0 * 0.74)},${-ZH}V0`, 0.6, INK);
    side += F(rect(L0 * 0.5, -14, L0 * 0.54, -12.8), '#2A2620', 0.3) + F(rect(L0 * 0.68, -14, L0 * 0.72, -12.8), '#2A2620', 0.3);
    side += L(`M0,-10H${f(L0)}`, 0.6, lt(paint, 0.25), 'opacity="0.7"');
    side += rust(d, rect(0, -ZH, L0, 0), [[8, -3, 5], [L0 * 0.25, -12, 3], [L0 * 0.86, -4, 5], [L0 * 0.62, -15, 2.4]], 21);
    side += rustDrip(L0 * 0.28, -9, 8) + rustDrip(L0 * 0.9, -2, 6);
    side += L('M20,-8q5,-6 9,0q3,4 7,-3', 1.2, '#C9A83A', 'opacity="0.85"');
    // wheel arches
    side += F(`M${f(L0 * 0.06)},0A8,8 0 0 1 ${f(L0 * 0.06 + 18)},0Z`, '#141210', 0.7) + F(`M${f(L0 * 0.82)},0A8,8 0 0 1 ${f(L0 * 0.82 + 18)},0Z`, '#141210', 0.7);
    s += d.clip(body.left, grp(side, swFace(t, ia, jb, 6)));
    // front: grille + one smashed headlight
    let fr2 = F(rect(4, -14, 28, -6), '#2A2826', 0.7);
    for (let k = 0; k < 6; k++) fr2 += L(`M${f(6 + k * 4)},-13.4V-6.6`, 0.6, '#6E706A');
    fr2 += F(ell(2.6, -10, 2.2, 2.2), '#E8E2C0', 0.6) + F(ell(30, -10, 2.2, 2.2), '#141210', 0.6) + crack(30, -10, 2, 3, 3, 0.3, '#DDE8E8', 0);
    fr2 += F(rect(0, -4, 33, -1), '#8E908A', 0.6);
    s += d.clip(body.right, grp(fr2, seFace(t, ib, jb, 6)));
    s += boxShade(d, t, body, ia, ib, jb, 6, 24, 0.4);
    s += speckle(d, body.sil, [0, 0, Wd, Hd], 120, ['#2A1E14', '#8A4A22', '#C9C5B6'], 7, 0.3, 0.7, 0.6);
    s += body.lines;
    // near-side wheels: both flat
    s += wheelAt(-0.08, jb, 3.2) + wheelAt(1.06, jb, 2.6);
    // weeds growing round the wreck, a hubcap in the grass
    s += weeds(t.p(-0.3, 0.42)[0], t.p(-0.3, 0.42)[1], 6, 3, 10) + weeds(t.p(1.2, 0.42)[0], t.p(1.2, 0.42)[1], 6, 5, 10) + weeds(t.p(1.42, 0)[0], t.p(1.42, 0)[1], 4, 7, 6);
    const [cx2, cy2] = t.p(0.5, 0.48);
    s += F(ell(cx2, cy2, 5, 2.4), '#A8AAA4', 0.7) + F(ell(cx2, cy2 - 0.4, 2.4, 1.1), '#6E706A', 0.5);
    s += fly(t.p(1.2, 0, 50)[0], t.p(1.2, 0, 50)[1], 1);
    return s;
  });
}

// ---------------------------------------------------------------- roadside pole sign
function signPole(): ArtAsset[] {
  return objPair('sign_pole', 278, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.16, 0.16);
    s += F(cap(X, Y, 11, 0), '#9A9890', 0.9) + weeds(X, Y + 2, 7, 11, 12);
    // pole
    const pole = cylBody(X, Y, 4, 3.2, 0, 160);
    s += F(pole, celH(d, X - 4, X + 4, '#7A5A3E', '#4A3220')) + L(pole, LW);
    s += rust(d, pole, [[X, Y - 30, 3], [X + 1, Y - 90, 2.4], [X - 1, Y - 130, 2]], 3) + rustDrip(X + 1.6, Y - 110, 30, 1.4);
    s += d.clip(pole, L(`M${f(X - 4)},${f(Y - 50)}q4,2 8,0M${f(X - 4)},${f(Y - 100)}q4,2 8,0`, 0.6, INK));
    // small arrow board under the main sign: EAT, pointing down at the joint
    const i0 = -0.86;
    const i1 = 0.86;
    const W = (i1 - i0) * 48;
    const az = 116;
    const arrow = 'M0,-12L22,-12L22,-20L34,-6L22,8L22,0L0,0Z';
    let ab = grp(F(arrow, '#2A2420'), 'translate(1 1)') + F(arrow, '#C9A83A', LW);
    ab += unflip(lettering('EAT', 11, -2.4, 7, '#6D1727', 1.4, { anchor: 'middle', gap: 0.3 }, 0), mir, 11);
    ab += rust(d, arrow, [[3, -1, 2], [30, -6, 1.6]], 9);
    for (const [bx, by, on] of [[4, -14, 1], [12, -14, 1], [20, -14, 0], [27, -12, 1], [32, -6, 1], [27, 1, 1]] as [number, number, number][]) ab += on ? glow(d, dot(bx, by, 1.6, '#FFE6A0'), 0.9, 0.8) + dot(bx, by, 0.9, '#FFF6D8') : dot(bx, by, 0.9, '#5A5244');
    s += grp(grp(ab, 'rotate(28 17 -6)'), swFace(t, -0.42, 0.02, az));
    // main sign box
    const z0 = 152;
    const z1 = 206;
    const bx = box(t, i0, i1, -0.08, 0.06, z0, z1, '#4A1A1E', '#6D1727', '#3E0E12');
    s += bx.fills;
    let face = F(rect(3, -z1 + z0 + 3, W - 3, -3), '#C9B88A', 0.9);
    face += d.clip(rect(3, -z1 + z0 + 3, W - 3, -3), F(rect(3, -z1 + z0 + 3, W - 3, -3), d.linear(0, -54, 0, 0, [[0, '#D8C898'], [1, '#A8946A']])) + F(blob(20, -10, 14, 6, 3), '#6E5A34', 0, 'opacity="0.25"') + F(blob(66, -40, 10, 6, 4), '#6E5A34', 0, 'opacity="0.2"'));
    let tt = lettering('ZOMBS', W / 2, -28, 15, '#6D1727', 2.8, { anchor: 'middle', gap: 0.3 }, 0.8);
    tt += lettering('BBQ', W / 2 - 8, -9, 13, '#3A4A1E', 2.6, { anchor: 'middle', gap: 0.35 }, 0.8);
    // a little flame doodle beside BBQ
    tt += F(`M${f(W / 2 + 18)},-9C${f(W / 2 + 13)},-13 ${f(W / 2 + 16)},-19 ${f(W / 2 + 19)},-23C${f(W / 2 + 19)},-18 ${f(W / 2 + 25)},-16 ${f(W / 2 + 23)},-11C${f(W / 2 + 22.6)},-9 ${f(W / 2 + 20)},-8.4 ${f(W / 2 + 18)},-9Z`, '#C0602C', 0.8);
    face += unflip(tt, mir, W / 2);
    // a rust-brown water stain down the right edge
    face += d.clip(rect(3, -51, W - 3, -3), F(blob(W - 9, -30, 4, 14, 7), '#8A6A3A', 0, 'opacity="0.3"'));
    // marquee bulbs round the edge, a few dead
    const r = rnd(5);
    let bulbs = '';
    const bulb = (x: number, y: number) => {
      const dead = r() < 0.18;
      return dead ? dot(x, y, 1.2, '#4A4236') + dot(x - 0.3, y - 0.3, 0.4, '#8A8270') : glow(d, dot(x, y, 2.2, '#FFE09A'), 1.2, 0.7) + dot(x, y, 1.3, '#FFF2C8');
    };
    for (let k = 0; k <= 16; k++) bulbs += bulb(2 + ((W - 4) * k) / 16, -z1 + z0 + 1.6) + bulb(2 + ((W - 4) * k) / 16, -1.6);
    for (let k = 1; k < 5; k++) bulbs += bulb(1.6, -1.6 - ((z1 - z0 - 3.2) * k) / 5) + bulb(W - 1.6, -1.6 - ((z1 - z0 - 3.2) * k) / 5);
    face += bulbs;
    face += rust(d, rect(0, -54, W, 0), [[W - 6, -4, 3], [6, -50, 2.4]], 11) + rustDrip(W - 12, -3, 10) + rustDrip(14, -3, 6);
    s += grp(face, swFace(t, i0, 0.06, z0));
    s += d.clip(bx.right, scratches(d, bx.right, [X, Y - 230, 80, 100], 10, '#FFFFFF', 3, 0.3));
    s += bx.lines;
    // a crow on top
    const [cx, cy] = t.p(0.3, 0, z1);
    s += F(`M${f(cx - 4)},${f(cy - 1)}C${f(cx - 3)},${f(cy - 6)} ${f(cx + 3)},${f(cy - 6)} ${f(cx + 4)},${f(cy - 2)}L${f(cx + 7)},${f(cy)}L${f(cx + 3)},${f(cy)}C${f(cx)},${f(cy + 1)} ${f(cx - 3)},${f(cy + 1)} ${f(cx - 4)},${f(cy - 1)}Z`, '#22201C', 0.7);
    s += F(ell(cx - 4.4, cy - 4.6, 2.2, 2), '#22201C', 0.7) + F(`M${f(cx - 6.4)},${f(cy - 5)}l-2.6,1l2.4,0.6Z`, '#4A4640', 0.4) + dot(cx - 5, cy - 5, 0.5, EYE_Z);
    return s;
  });
}

export function buildOutdoor(): ArtAsset[] {
  return [
    tombStr(),
    tombHp(),
    tombRevive(),
    ...pethousePug(),
    ...pethouseKennel(),
    ...streetLamp(),
    hydrant(),
    mailbox(),
    ...busBench(),
    ...newsbox(),
    streetTrash(),
    deadTree(),
    bush1(),
    bush2(),
    trafficCone(),
    carWreck(),
    ...signPole(),
  ];
}

