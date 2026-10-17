/**
 * Floor decor (1x1, OBJ_W wide, anchor = tile centre; directional items face sw, the scene mirrors them for se).
 * Items that carry lettering also ship a `<key>_se` copy whose text still reads after mirroring:
 * tombstone_deco_1_se. Everything else mirrors cleanly.
 */
import type { ArtAsset } from '../art/types';
import type { Doc } from '../art/svg';
import { capsule, ell, f, poly } from '../art/svg';
import type { Pt } from '../art/svg';
import { F, INK, Iso, L, LW, blob, crack, dot, objAsset, rnd, speckle } from './kit';
import {
  K,
  bite,
  box,
  boxShade,
  cap,
  celH,
  cyl,
  cylBody,
  dk,
  extrudeStack,
  eyeball,
  finger,
  fly,
  glow,
  grain,
  grp,
  lt,
  masked,
  objPair,
  rust,
  scratches,
  shadow,
  sheen,
  swFace,
  tape,
  textD,
  unflip,
} from './p2kit';

const SKIN_Z = '#77AA55';
const SKIN_ZS = '#557733';
const EYE_Z = '#CCCC44';

// ---------------------------------------------------------------- shared bits
function leafD(x: number, y: number, len: number, w: number, a: number, bend = 0): string {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const nx = -sa;
  const ny = ca;
  const tx = x + ca * len + nx * bend;
  const ty = y + sa * len + ny * bend;
  const mx = x + ca * len * 0.5 + nx * bend * 0.6;
  const my = y + sa * len * 0.5 + ny * bend * 0.6;
  return `M${f(x)},${f(y)}Q${f(mx + nx * w)},${f(my + ny * w)} ${f(tx)},${f(ty)}Q${f(mx - nx * w)},${f(my - ny * w)} ${f(x)},${f(y)}Z`;
}
function leaf(x: number, y: number, len: number, w: number, a: number, col: string, bend = 0, sw = 0.7): string {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return F(leafD(x, y, len, w, a, bend), col, sw) + L(`M${f(x)},${f(y)}L${f(x + ca * len * 0.8 + -sa * bend * 0.7)},${f(y + sa * len * 0.8 + ca * bend * 0.7)}`, 0.4, lt(col, 0.3), 'opacity="0.7"');
}

/** Flower pot with rim and soil. Returns svg; (X, Y) the floor centre. */
function pot(d: Doc, t: Iso, rb: number, rt: number, h: number, base: string, shade: string, rim: string, seed: number, cracked: boolean): string {
  const X = t.cx;
  const Y = t.cy;
  let s = shadow(d, t, 0, 0, (rt / 68) * 1.25, (rt / 68) * 1.25);
  const body = cylBody(X, Y, rb, rt - 1, 0, h - 4);
  s += F(body, celH(d, X - rt, X + rt, base, shade));
  s += speckle(d, body, [X - rt, Y - h, rt * 2, h + 6], 26, [dk(base, 0.2), lt(base, 0.2)], seed, 0.3, 0.7, 0.7);
  // grime band at the foot + a drip stain
  s += d.clip(body, F(body, d.linear(0, Y - h, 0, Y + 4, [[0, '#000', 0], [0.6, '#000', 0], [1, '#2A1E10', 0.5]])));
  s += d.clip(body, F(blob(X - rt * 0.35, Y - h * 0.45, 2.2, h * 0.32, seed + 4), dk(base, 0.35), 0, 'opacity="0.35"'));
  s += L(body, LW);
  if (cracked) {
    s += d.clip(body, crack(X + rt * 0.15, Y - h + 4, Math.PI / 2 + 0.25, h * 0.85, seed + 9, 0.8, '#24160C', 1));
  }
  const rimB = cylBody(X, Y, rt, rt, h - 4.5, h);
  s += F(rimB, celH(d, X - rt, X + rt, rim, dk(rim, 0.28))) + L(rimB, 0.9);
  s += F(cap(X, Y, rt, h), lt(rim, 0.1), 0.9);
  const soil = cap(X, Y, rt - 1.8, h - 0.6);
  s += F(soil, '#3A2A1A', 0.6) + speckle(d, soil, [X - rt, Y - h - rt, rt * 2, rt * 2], 18, ['#5A4430', '#22180E'], seed + 2, 0.3, 0.7, 0.9);
  if (cracked) {
    // a chip knocked out of the rim
    const [cx, cy] = [X + rt * 0.55, Y - h + rt * K * 0.75];
    s += F(poly([[cx - 2.4, cy - 0.6], [cx + 1.6, cy - 1.2], [cx + 0.6, cy + 2.8]]), dk(rim, 0.45), 0.6);
  }
  return s;
}

function moundAt(d: Doc, t: Iso, rx: number, ry: number, seed: number): string {
  const X = t.cx;
  const Y = t.cy + 2;
  const r = rnd(seed);
  let s = shadow(d, t, 0, 0.04, rx / 60, ry / 38, 0.3);
  const m = blob(X, Y, rx, ry, seed, 9, 0.25);
  s += F(m, d.radial(X - rx * 0.3, Y - ry * 0.6, rx * 1.3, [[0, '#6E5638'], [1, '#43321E']]), 0.9);
  s += speckle(d, m, [X - rx, Y - ry, rx * 2, ry * 2], 40, ['#2E2214', '#8A7050', '#5A4630'], seed + 1, 0.3, 0.8, 0.9);
  // weeds round the edge
  let w = '';
  for (let k = 0; k < 9; k++) {
    const a = r() * Math.PI * 2;
    const x = X + Math.cos(a) * rx * 0.9;
    const y = Y + Math.sin(a) * ry * 0.9;
    const hh = 2 + r() * 3;
    w += L(`M${f(x - 1)},${f(y)}l${f(-0.6)},${f(-hh)}M${f(x)},${f(y)}l${f(0.3)},${f(-hh - 1)}M${f(x + 1)},${f(y)}l${f(0.9)},${f(-hh * 0.8)}`, 0.6, k % 2 ? '#4A6615' : '#6B8A2C');
  }
  return s + w;
}

// ---------------------------------------------------------------- plants
function plantDead(): ArtAsset {
  return objAsset('plant_dead', 96, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = '';
    // fallen leaves on the floor first
    s += leaf(X - 22, Y + 6, 7, 2.6, 0.4, '#8A6E3A', 1) + leaf(X + 15, Y + 9, 6, 2.2, 2.6, '#6E5A2A', -1) + leaf(X - 8, Y + 13, 5, 2, -0.3, '#9A7444', 0.5);
    s += pot(d, t, 9.5, 12.5, 21, '#94432A', '#6A2A18', '#A6553A', 11, true);
    const top = Y - 21;
    const stems: [number, number, number, number, number, number][] = [
      // base x, ctrl x, ctrl y, tip x, tip y, droop leaf angle
      [-3, -10, -24, -15, -4, 1.9],
      [-1, -4, -30, 6, -26, 0.9],
      [1, 6, -26, 15, -2, 1.3],
      [2, 9, -18, 18, 6, 1.6],
      [0, -2, -22, -7, 8, 1.8],
    ];
    let back = '';
    let front = '';
    stems.forEach(([bx, cx, cy, tx, ty, la], k) => {
      const p = `M${f(X + bx)},${f(top)}Q${f(X + cx)},${f(top + cy)} ${f(X + tx)},${f(top + ty)}`;
      const g = L(p, 2.1, INK) + L(p, 1.1, k % 2 ? '#6B5A2E' : '#5A4A24');
      // shrivelled leaves hanging off each stem
      const lv = leaf(X + tx, top + ty, 7, 2.2, la, ['#8C7A3E', '#6E5C2A', '#9A7444', '#7A6A34', '#857038'][k], 1.4);
      const mid = leaf(X + (bx + cx) / 2 + 1, top + cy * 0.6, 6, 2, la - 0.6, '#6E5C2A', -1);
      if (k === 1 || k === 4) back += g + lv + mid;
      else front += g + lv + mid;
    });
    s += back + front;
    s += fly(X + 10, Y - 50, 1.1);
    return s;
  });
}

function plantPotted(): ArtAsset {
  return objAsset('plant_potted', 116, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = pot(d, t, 10, 13.5, 24, '#B9AE8A', '#8A8062', '#CCC2A0', 21, false);
    // a brown drip running down the glaze
    s += F(`M${f(X - 7)},${f(Y - 20)}q-0.6,6 0.2,11q0.8,1.6 1.5,0q0.4,-5 0.3,-11Z`, '#6E5A34', 0, 'opacity="0.55"');
    const r = rnd(5);
    const top = Y - 24;
    const leaves: [number, number, number][] = [];
    for (let k = 0; k < 13; k++) {
      const a = -Math.PI / 2 + (k / 12 - 0.5) * 2.5 + (r() - 0.5) * 0.25;
      leaves.push([a, 22 + r() * 22 * (1 - Math.abs(a + Math.PI / 2) * 0.45), r()]);
    }
    // back (upright) leaves first, outer (drooping) leaves last
    leaves.sort((p, q) => Math.abs(p[0] + Math.PI / 2) - Math.abs(q[0] + Math.PI / 2));
    leaves.forEach(([a, len, rr], k) => {
      const bx = X + Math.cos(a) * 2;
      const by = top + 1;
      const col = ['#4A6622', '#5E7A2E', '#3F5A1E', '#6A8436', '#526E26'][k % 5];
      const bend = (a > -Math.PI / 2 ? 1 : -1) * (2 + rr * 4);
      let g = F(leafD(bx, by, len, 3.6, a, bend), col, 0.8);
      // yellowed, crispy tips
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      g += d.clip(leafD(bx, by, len, 3.6, a, bend), F(ell(bx + ca * len - sa * bend * 0.6, by + sa * len + ca * bend * 0.6, 4, 4), '#9A8A44', 0, 'opacity="0.8"'));
      g += L(`M${f(bx)},${f(by)}Q${f(bx + ca * len * 0.5 - sa * bend * 0.5)},${f(by + sa * len * 0.5 + ca * bend * 0.5)} ${f(bx + ca * len * 0.85 - sa * bend * 0.7)},${f(by + sa * len * 0.85 + ca * bend * 0.7)}`, 0.45, lt(col, 0.35), 'opacity="0.8"');
      if (k === 7) {
        // somebody took a bite out of this one
        const bxp = bx + ca * len * 0.55 - sa * bend * 0.55 + 2.5;
        const byp = by + sa * len * 0.55 + ca * bend * 0.55;
        const bb = bite(d, bxp, byp, 4.2, 0.2, 104, 116);
        g = masked(g, bb.mask) + bb.ink(leafD(bx, by, len, 3.6, a, bend));
      }
      s += g;
    });
    s += fly(X - 16, Y - 58, 1);
    return s;
  });
}

function plantTree(): ArtAsset {
  return objAsset('plant_tree', 172, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.36, 0.36);
    // plank planter box with iron corner straps
    const b = box(t, -0.27, 0.27, -0.27, 0.27, 0, 24, '#6E4828', '#8A5E34', '#64421F');
    s += b.fills;
    s += grain(d, b.left, [X - 30, Y - 30, 34, 40], 14, 3, '#4E321A', '#A97A48') + grain(d, b.right, [X, Y - 30, 30, 40], 10, 4, '#3E2612', '#8E6436');
    for (const z of [8, 16]) s += t.line([-0.27, 0.27, z], [0.27, 0.27, z], 0.6, '#3E2612') + t.line([0.27, 0.27, z], [0.27, -0.27, z], 0.6, '#2E1C0C');
    s += boxShade(d, t, b, -0.27, 0.27, 0.27, 0, 24);
    s += F(t.qd(-0.23, 0.23, -0.23, 0.23, 24), '#3A2A1A');
    s += t.line([0.27, 0.27, 0], [0.27, 0.27, 24], 2.2, '#3A3530');
    s += b.lines;
    s += speckle(d, t.qd(-0.23, 0.23, -0.23, 0.23, 24), [X - 30, Y - 50, 60, 30], 20, ['#5A4430', '#22180E'], 6, 0.3, 0.7);
    const top = Y - 24;
    // trunk: two twisted stems
    const trunk = `M${f(X - 4)},${f(top + 1)}C${f(X - 6)},${f(top - 20)} ${f(X + 4)},${f(top - 30)} ${f(X - 2)},${f(top - 52)}L${f(X + 2)},${f(top - 52)}C${f(X + 8)},${f(top - 30)} ${f(X - 1)},${f(top - 18)} ${f(X + 4)},${f(top + 1)}Z`;
    const br = `M${f(X)},${f(top - 30)}Q${f(X + 10)},${f(top - 40)} ${f(X + 16)},${f(top - 58)}M${f(X - 1)},${f(top - 38)}Q${f(X - 12)},${f(top - 46)} ${f(X - 18)},${f(top - 58)}M${f(X)},${f(top - 50)}L${f(X - 2)},${f(top - 74)}`;
    const leafy = (cx: number, cy: number, rx: number, ry: number, seed: number, tone: number) => {
      const cols = [['#33461A', '#26350F'], ['#46601F', '#33461A'], ['#5A7428', '#46601F'], ['#6B8432', '#55702A']][tone];
      const p = blob(cx, cy, rx, ry, seed, 9, 0.4);
      let o = F(p, cols[1], 0.9);
      o += d.clip(p, F(blob(cx - rx * 0.25, cy - ry * 0.3, rx * 0.8, ry * 0.7, seed + 1, 8, 0.35), cols[0]));
      // individual leaf flicks round the edge
      const r = rnd(seed);
      for (let k = 0; k < 12; k++) {
        const a = r() * Math.PI * 2;
        const x = cx + Math.cos(a) * rx * (0.55 + r() * 0.4);
        const y = cy + Math.sin(a) * ry * (0.55 + r() * 0.4);
        o += F(leafD(x, y, 4.5, 1.6, a + (r() - 0.5), 0.5), k % 4 === 0 ? '#8A7A3A' : lt(cols[0], 0.18), 0.4);
      }
      return o;
    };
    s += leafy(X + 2, top - 66, 22, 15, 31, 0);
    s += L(br, 3.4, INK) + L(br, 2.2, '#5E4428');
    s += F(trunk, celH(d, X - 6, X + 6, '#6E5232', '#4A3420'), 0.9);
    s += grain(d, trunk, [X - 6, top - 52, 12, 52], 8, 9, '#3A2814', '#8E6E48', true);
    s += leafy(X - 17, top - 58, 15, 11, 41, 1) + leafy(X + 17, top - 60, 15, 11, 51, 1);
    s += leafy(X - 4, top - 80, 16, 11, 61, 2) + leafy(X + 8, top - 50, 12, 8, 71, 2) + leafy(X - 12, top - 44, 10, 7, 81, 3);
    // fallen leaves
    s += leaf(X - 26, Y + 10, 6, 2.2, 0.4, '#8A7A3A', 1) + leaf(X + 22, Y + 12, 5, 2, 2.4, '#6E5C2A');
    return s;
  });
}

function cactus(): ArtAsset {
  return objAsset('cactus', 124, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = pot(d, t, 9, 11.5, 17, '#9A4A2E', '#6E301A', '#AA5A3C', 33, false);
    const g = '#5E7E3A';
    const gd = '#3F5A26';
    const top = Y - 15;
    // arms (stroke-built): left goes out then up, right shorter and taped
    const armL = `M${f(X - 4)},${f(top - 30)}Q${f(X - 17)},${f(top - 30)} ${f(X - 16)},${f(top - 44)}L${f(X - 16)},${f(top - 50)}`;
    const armR = `M${f(X + 4)},${f(top - 20)}Q${f(X + 15)},${f(top - 20)} ${f(X + 14)},${f(top - 31)}L${f(X + 14)},${f(top - 36)}`;
    const arm = (p: string) => L(p, 9.6, INK) + L(p, 8, gd) + grp(L(p, 4.6, g), 'translate(-1.4 -0.4)');
    s += arm(armL) + arm(armR);
    const stem = `M${f(X - 7)},${f(top)}L${f(X - 7)},${f(top - 52)}Q${f(X - 7)},${f(top - 61)} ${f(X)},${f(top - 61)}Q${f(X + 7)},${f(top - 61)} ${f(X + 7)},${f(top - 52)}L${f(X + 7)},${f(top)}Z`;
    s += F(stem, celH(d, X - 7, X + 7, g, gd, 0.6), LW);
    for (const dx of [-3.6, 0, 3.6]) s += d.clip(stem, L(`M${f(X + dx)},${f(top)}L${f(X + dx * 0.9)},${f(top - 58)}`, 0.5, dx > 0 ? '#2E4419' : '#7E9A4E', 'opacity="0.8"'));
    // spines
    const r = rnd(7);
    let sp = '';
    for (let k = 0; k < 40; k++) {
      const x = X + (r() - 0.5) * 13;
      const y = top - 2 - r() * 56;
      sp += L(`M${f(x)},${f(y)}l${f((r() - 0.5) * 2.4)},${f(-0.8 - r())}`, 0.35, '#E3DAB0');
    }
    for (let k = 0; k < 16; k++) {
      const left = k % 2 === 0;
      const y = top - 22 - r() * 26;
      const x = left ? X - 16 + (r() - 0.5) * 6 : X + 14 + (r() - 0.5) * 5;
      if (!left && y < top - 36) continue;
      sp += L(`M${f(x)},${f(y)}l${f((r() - 0.5) * 2.4)},${f(-0.8 - r())}`, 0.35, '#E3DAB0');
    }
    s += sp;
    // duct tape round the right arm, a sad flower on top of the left
    s += tape([X + 9.5, top - 25], [X + 18.5, top - 27], 3, '#8E8C84');
    s += F(blob(X - 16, top - 53, 3, 2.2, 8), '#A8707A', 0.6) + dot(X - 16, top - 53, 1, '#D9B04A');
    // a severed finger skewered on the crown, blood running down
    s += F(`M${f(X + 1)},${f(top - 59)}q-0.8,10 0.4,16q0.8,1 1.4,-0.4q0.2,-7 -0.2,-15.6Z`, '#7A2A22', 0, 'opacity="0.8"');
    s += finger(X - 1, top - 59, -2.3, 10, 3.6);
    s += fly(X + 10, top - 70, 1);
    return s;
  });
}

// ---------------------------------------------------------------- tombstones (indoor deco)
const STONE = '#8E8C82';
const STONE_D = '#66645C';

/** Extrude a flat shape drawn in a face frame backwards along -j to give it thickness. */
function extrude(d: Doc, t: Iso, shape: string, i0: number, jf: number, z: number, th: number, face: string, side: string, steps = 6): string {
  void d;
  void steps;
  return extrudeStack(t, shape, i0, jf, z, th, face, side);
}

function stoneTex(d: Doc, shape: string, w: number, h: number, seed: number): string {
  const r = rnd(seed);
  let s = speckle(d, shape, [0, -h, w, h], 60, ['#6A685E', '#B2B0A4', '#5A5850', '#A4A296'], seed, 0.3, 0.8, 0.8);
  let m = '';
  for (let k = 0; k < 4; k++) m += F(blob(r() * w, -r() * h * 0.3, 4 + r() * 4, 2 + r() * 3, seed + k), k % 2 ? '#4F6A22' : '#6B7A2C', 0, 'opacity="0.7"');
  for (let k = 0; k < 6; k++) m += dot(r() * w, -h * 0.4 - r() * h * 0.5, 0.8 + r() * 1.2, '#B8B48E', 0.6); // lichen
  s += d.clip(shape, m + F(shape, d.linear(0, -h, w, 0, [[0, '#FFF', 0.12], [0.5, '#FFF', 0], [1, '#000', 0.25]])));
  return s;
}

function tombDeco1(): ArtAsset[] {
  return objPair('tombstone_deco_1', 104, (d, t, mir) => {
    let s = moundAt(d, t, 30, 14, 3);
    const W = 30;
    const H = 46;
    const shape = `M0,0L0,-34A15,13 0 0 1 30,-34L30,0Z`;
    s += extrude(d, t, shape, -0.31, 0.06, 0, 0.12, STONE, STONE_D);
    let face = stoneTex(d, shape, W, H, 5);
    face += d.clip(shape, crack(22, -40, 1.9, 22, 4, 0.7, '#2E2C26', 1));
    // carved lettering: dark cut + a lit lower lip
    const txt = textD('RIP', 15, -22, 9, { anchor: 'middle', gap: 0.5 });
    const dates = textD('1958-2026', 15, -13, 3.2, { anchor: 'middle', gap: 0.3 });
    let carve = L(txt, 1.9, '#3A3832') + grp(L(txt, 0.6, '#C2C0B4', 'opacity="0.8"'), 'translate(0.5 0.6)');
    carve += L(dates, 0.8, '#3A3832');
    face += unflip(carve, mir, 15);
    face += L(shape, LW);
    s += grp(face, swFace(t, -0.31, 0.06, 0));
    // grave candle, burned down
    const [cx, cy] = t.p(0.2, 0.3, 0);
    s += F(`M${f(cx - 2)},${f(cy)}v-5h4v5Z`, '#D6CDB0', 0.7) + F(blob(cx, cy - 7, 1, 1.8, 2), '#E8B040', 0.4) + dot(cx, cy - 6.6, 0.5, '#FFF2C0');
    return s;
  });
}

function tombDeco2(): ArtAsset {
  return objAsset('tombstone_deco_2', 112, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = moundAt(d, t, 30, 14, 7);
    const pl = box(t, -0.2, 0.2, -0.12, 0.16, 0, 7, '#9A988E', STONE, STONE_D);
    s += pl.fills + speckle(d, pl.sil, [X - 30, Y - 30, 60, 40], 30, ['#6A685E', '#B2B0A4'], 9) + pl.lines;
    const cross = 'M10,0L10,-36L1,-36L1,-44L10,-44L10,-56L18,-56L18,-44L27,-44L27,-36L18,-36L18,0Z';
    let c = extrude(d, t, cross, -0.29, 0.06, 7, 0.1, STONE, STONE_D);
    let face = stoneTex(d, cross, 28, 56, 13);
    // chipped arm end + a crack
    face += F('M27,-44L27,-40L24.5,-42Z', STONE_D, 0.6);
    face += d.clip(cross, crack(14, -30, 1.5, 24, 6, 0.6, '#2E2C26', 1));
    // a rag tied round the crossing
    face += F('M9,-41L19,-42L19,-37L9,-36Z', '#691122', 0.7) + F('M17,-38l3,9l-3,-2l-2,3Z', '#5A0E1C', 0.6);
    face += L(cross, LW);
    c += grp(face, swFace(t, -0.29, 0.06, 7));
    // lean the whole cross a little
    const [bx, by] = t.p(0, 0.06, 7);
    s += grp(c, `rotate(-5 ${f(bx)} ${f(by)})`);
    s += fly(X + 18, Y - 64, 1);
    return s;
  });
}

function tombDeco3(): ArtAsset {
  return objAsset('tombstone_deco_3', 96, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = moundAt(d, t, 32, 15, 11);
    // the snapped-off top lies behind, propped against the stump
    const topPiece = 'M0,0L0,-12A13,10 0 0 1 26,-12L26,0L20,-3L14,1L8,-2Z';
    s += grp(extrude(d, t, topPiece, -0.2, -0.18, 0, 0.08, '#86847A', STONE_D, 4) + grp(L(topPiece, LW), swFace(t, -0.2, -0.18, 0)), `rotate(14 ${f(X)} ${f(Y - 4)})`);
    const slab = 'M0,0L0,-30L5,-27L9,-33L15,-28L20,-31L26,-26L28,-29L28,0Z';
    s += extrude(d, t, slab, -0.3, 0.05, 0, 0.12, STONE, STONE_D);
    let face = stoneTex(d, slab, 28, 32, 17);
    // carved skull
    const sk = 'M9,-20C9,-26 19,-26 19,-20C19,-17 17.5,-16 17,-14L11,-14C10.5,-16 9,-17 9,-20Z';
    face += F(sk, '#77756C', 0.8) + F(ell(12, -20, 1.6, 1.8), '#2E2C26') + F(ell(16, -20, 1.6, 1.8), '#2E2C26') + L('M12,-14v1.6M14,-14v1.8M16,-14v1.6', 0.6, '#2E2C26');
    face += L(slab, LW);
    s += grp(face, swFace(t, -0.3, 0.05, 0));
    // a zombie hand clawing up out of the dirt in front
    const [hx, hy] = t.p(0.18, 0.3, 0);
    s += F(blob(hx, hy, 7, 2.6, 3), '#3A2A1A', 0.6);
    s += F(capsule([hx, hy], [hx - 1, hy - 9], 4.6, 4), SKIN_Z, 0.9) + F(`M${f(hx - 3.6)},${f(hy - 1)}l1.6,-4l2,2l1.6,-3l1.6,4Z`, '#55553F', 0.7);
    s += F(blob(hx - 1, hy - 11, 3.4, 2.8, 5), SKIN_Z, 0.8);
    const fingers: [number, number][] = [
      [-4.2, -16],
      [-2, -18],
      [0.4, -17.5],
      [2.6, -15],
    ];
    for (const [fx, fy] of fingers) s += F(capsule([hx - 1 + fx * 0.4, hy - 12], [hx + fx, hy + fy], 1.6, 1.2), SKIN_Z, 0.7);
    s += F(capsule([hx + 1.2, hy - 10], [hx + 5, hy - 12.5], 1.6, 1.2), SKIN_ZS, 0.7);
    s += L(`M${f(hx - 2)},${f(hy - 6)}l2,0.6M${f(hx - 2)},${f(hy - 4)}l2,0.6`, 0.4, INK); // stitches
    return s;
  });
}

// ---------------------------------------------------------------- lawn ornaments gone bad
function gnome(): ArtAsset {
  return objAsset('gnome_zombie', 88, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.2, 0.2);
    s += F(cylBody(X, Y, 11, 11, 0, 3), celH(d, X - 11, X + 11, '#5E6E34', '#46521F')) + L(cylBody(X, Y, 11, 11, 0, 3), 0.9) + F(cap(X, Y, 11, 3), '#6E7E3E', 0.9);
    const b = Y - 3;
    // boots
    s += F(ell(X - 4.5, b - 1.4, 3.6, 2), '#3E2A1A', 0.8) + F(ell(X + 3.5, b - 0.8, 3.4, 1.9), '#3E2A1A', 0.8);
    // coat
    const coat = `M${f(X - 8)},${f(b - 2)}C${f(X - 11)},${f(b - 10)} ${f(X - 8)},${f(b - 18)} ${f(X)},${f(b - 19)}C${f(X + 8)},${f(b - 18)} ${f(X + 10)},${f(b - 10)} ${f(X + 8)},${f(b - 2)}Z`;
    s += F(coat, celH(d, X - 10, X + 10, '#4E6273', '#33434F'), LW);
    s += d.clip(coat, F(`M${f(X - 12)},${f(b - 9)}h24v3h-24Z`, '#4A3420') + F(`M${f(X - 2)},${f(b - 9.4)}h4v3.8h-4Z`, '#B09A4A', 0.5));
    // paint chips showing white plaster
    s += d.clip(coat, F(blob(X + 5, b - 14, 2, 1.4, 4), '#D6D0BC', 0.4) + F(blob(X - 6, b - 5, 1.4, 1, 5), '#D6D0BC', 0.4));
    // stump of the right arm: broken plaster + a rusty wire
    s += F(ell(X + 8.5, b - 14, 2.4, 2.8), '#4E6273', 0.8) + F(ell(X + 9.2, b - 14, 1.4, 1.9), '#D6D0BC', 0.5) + L(`M${f(X + 9.5)},${f(b - 14)}q3,-1 2,-4`, 0.6, '#7A4020');
    // left arm holding a gnawed bone
    s += F(capsule([X - 7, b - 15], [X - 11, b - 8], 4, 3.6), '#4E6273', 0.8);
    s += F(capsule([X - 15, b - 5], [X - 9, b - 12], 1.8), '#D6CDAE', 0.6) + F(ell(X - 15.5, b - 4.5, 1.6, 1.4), '#D6CDAE', 0.6) + F(ell(X - 8.5, b - 12.5, 1.6, 1.4), '#D6CDAE', 0.6);
    s += F(ell(X - 11, b - 8, 2.2, 2), SKIN_Z, 0.7);
    // beard, dirty and matted
    const beard = `M${f(X - 6)},${f(b - 19)}C${f(X - 7)},${f(b - 13)} ${f(X - 3)},${f(b - 8)} ${f(X)},${f(b - 7)}C${f(X + 3)},${f(b - 9)} ${f(X + 6)},${f(b - 13)} ${f(X + 5)},${f(b - 19)}Z`;
    s += F(beard, celH(d, X - 6, X + 6, '#CFC8B0', '#9E977E'), 0.9) + d.clip(beard, L(`M${f(X - 3)},${f(b - 17)}l0.5,6M${f(X)},${f(b - 17)}l0,8M${f(X + 3)},${f(b - 17)}l-0.4,6`, 0.4, '#8E8670') + F(blob(X + 1, b - 11, 2, 1.4, 6), '#6E7A3A', 0, 'opacity="0.6"'));
    // face: green, pupil-less yellow eyes, big nose
    const face = ell(X - 0.5, b - 21.5, 5.6, 4.6);
    s += F(face, celH(d, X - 6, X + 5, SKIN_Z, SKIN_ZS), 0.9);
    s += F(ell(X - 2.8, b - 22.5, 1.4, 1), EYE_Z, 0.5) + F(ell(X + 1.6, b - 22, 1.3, 0.8), EYE_Z, 0.5);
    s += L(`M${f(X - 4.4)},${f(b - 23.8)}l2.6,0.6M${f(X + 0.4)},${f(b - 23.2)}l2.2,-0.4`, 0.6, INK);
    s += F(ell(X - 0.5, b - 20, 1.9, 1.6), '#6E9A3A', 0.6);
    s += L(`M${f(X + 3.4)},${f(b - 24)}l1,1.4M${f(X + 4)},${f(b - 23.4)}l-0.8,0.6`, 0.4, INK); // stitches
    // pointy hat, tip bent, chipped
    const hat = `M${f(X - 6.6)},${f(b - 24)}C${f(X - 5)},${f(b - 34)} ${f(X - 1)},${f(b - 42)} ${f(X + 5)},${f(b - 41)}C${f(X + 2)},${f(b - 38)} ${f(X + 4)},${f(b - 30)} ${f(X + 5.4)},${f(b - 24)}Z`;
    s += F(hat, celH(d, X - 6, X + 6, '#8A2A22', '#5E1A14'), LW);
    s += d.clip(hat, F(blob(X + 2, b - 30, 1.6, 2.4, 9), '#D6D0BC', 0.4));
    s += L(`M${f(X - 6.6)},${f(b - 24)}Q${f(X)},${f(b - 26)} ${f(X + 5.4)},${f(b - 24)}`, 0.9, '#3E0E0A');
    return s;
  });
}

function flamingo(): ArtAsset {
  return objAsset('flamingo_zombie', 104, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    const pink = '#B27A7C';
    const pinkD = '#84525A';
    let s = shadow(d, t, 0, 0, 0.16, 0.1, 0.25);
    // wire legs, one bent
    s += L(`M${f(X - 2)},${f(Y)}L${f(X - 1)},${f(Y - 32)}`, 1.6, INK) + L(`M${f(X - 2)},${f(Y)}L${f(X - 1)},${f(Y - 32)}`, 0.8, '#6E6A62');
    s += L(`M${f(X + 3)},${f(Y + 2)}L${f(X + 4)},${f(Y - 18)}L${f(X + 1)},${f(Y - 31)}`, 1.6, INK) + L(`M${f(X + 3)},${f(Y + 2)}L${f(X + 4)},${f(Y - 18)}L${f(X + 1)},${f(Y - 31)}`, 0.8, '#6E6A62');
    s += F(ell(X - 2, Y, 1.4, 0.8), '#2A2620') + F(ell(X + 3, Y + 2, 1.4, 0.8), '#2A2620');
    // body + tail
    const body = `M${f(X - 11)},${f(Y - 40)}C${f(X - 10)},${f(Y - 47)} ${f(X + 6)},${f(Y - 46)} ${f(X + 12)},${f(Y - 43)}L${f(X + 19)},${f(Y - 44)}L${f(X + 14)},${f(Y - 38)}C${f(X + 10)},${f(Y - 30)} ${f(X - 8)},${f(Y - 30)} ${f(X - 11)},${f(Y - 40)}Z`;
    s += F(body, celH(d, X - 11, X + 18, pink, pinkD, 0.62), LW);
    // a rotted-through patch showing ribs
    const hole = blob(X + 3, Y - 37, 5.6, 3.6, 3, 8, 0.4);
    s += d.clip(body, F(hole, '#4A1E1C', 0.8) + L(`M${f(X - 1)},${f(Y - 39)}q1,3 0,5M${f(X + 2)},${f(Y - 40)}q1,3.4 0,6M${f(X + 5)},${f(Y - 40)}q1,3 0,5.4M${f(X + 8)},${f(Y - 39)}q0.8,2.4 0,4`, 1, '#D6CDAE'));
    s += L(`M${f(X - 6)},${f(Y - 41)}Q${f(X + 2)},${f(Y - 44)} ${f(X + 10)},${f(Y - 41)}`, 0.6, pinkD); // wing line
    // peeling paint flecks
    s += d.clip(body, dot(X - 6, Y - 37, 1, '#D6D0BC', 0.8) + dot(X + 12, Y - 41, 0.8, '#D6D0BC', 0.8));
    // S-neck + head + bent beak
    const neck = `M${f(X - 9)},${f(Y - 42)}C${f(X - 14)},${f(Y - 48)} ${f(X - 2)},${f(Y - 52)} ${f(X - 6)},${f(Y - 60)}C${f(X - 8)},${f(Y - 64)} ${f(X - 10)},${f(Y - 64)} ${f(X - 9)},${f(Y - 66)}`;
    s += L(neck, 4.6, INK) + L(neck, 3, pink) + grp(L(neck, 1, lt(pink, 0.3), 'opacity="0.8"'), 'translate(-0.6 0)');
    s += F(ell(X - 8, Y - 67, 3.6, 3), pink, 0.9);
    const beak = `M${f(X - 11)},${f(Y - 68)}L${f(X - 16)},${f(Y - 66.5)}Q${f(X - 17)},${f(Y - 63)} ${f(X - 15)},${f(Y - 61)}L${f(X - 13.6)},${f(Y - 64)}L${f(X - 11)},${f(Y - 65.5)}Z`;
    s += F(beak, '#D6CDB0', 0.8) + d.clip(beak, F(`M${f(X - 18)},${f(Y - 66)}h6v8h-6Z`, '#2A2620'));
    s += F(ell(X - 8.4, Y - 67.8, 1, 0.8), EYE_Z, 0.4);
    s += F(capsule([X - 6, Y - 64], [X - 4.6, Y - 59], 0.8), '#5A0E1C'); // drool of something dark
    s += fly(X + 15, Y - 52, 0.9);
    return s;
  });
}

function skeletonStatue(): ArtAsset {
  return objAsset('skeleton_statue', 148, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.3, 0.3);
    const pl = box(t, -0.22, 0.22, -0.22, 0.22, 0, 16, '#9C9A90', '#86847A', '#66645C');
    s += pl.fills + speckle(d, pl.sil, [X - 34, Y - 50, 68, 70], 50, ['#6A685E', '#B2B0A4', '#55534C'], 21);
    s += t.line([-0.22, 0.22, 3], [0.22, 0.22, 3], 0.6, '#55534C') + t.line([0.22, 0.22, 3], [0.22, -0.22, 3], 0.6, '#45433C');
    s += boxShade(d, t, pl, -0.22, 0.22, 0.22, 0, 16) + pl.lines;
    s += d.clip(pl.left, crack(X - 14, Y - 8, 0.4, 12, 5, 0.6, '#2E2C26', 0));
    const bone = '#D6CDAE';
    const boneD = '#A99F7E';
    const ox = X;
    const oy = Y - 16;
    const P = (x: number, y: number): Pt => [ox + x, oy + y];
    const B = (a: Pt, b: Pt, w: number, col = bone) => F(capsule(a, b, w, w * 0.85), col, 0.8) + dot(a[0], a[1], w * 0.62, col) + dot(b[0], b[1], w * 0.55, col);
    const knob = (p: Pt, r: number) => F(ell(p[0], p[1], r, r), bone, 0.7);
    // legs
    s += F(ell(ox - 5, oy - 0.6, 3.2, 1.4), boneD, 0.7) + F(ell(ox + 4.5, oy - 0.2, 3.2, 1.4), boneD, 0.7);
    s += B(P(-4, -1.5), P(-3.4, -18), 2.2, boneD) + B(P(4, -1.2), P(3.6, -18), 2.2);
    s += knob(P(-3.4, -18.5), 1.8) + knob(P(3.6, -18.5), 1.8);
    s += B(P(-3.4, -19), P(-3, -35), 2.8, boneD) + B(P(3.6, -19), P(3.2, -35), 2.8);
    // pelvis
    s += F(`M${f(ox - 8)},${f(oy - 41)}C${f(ox - 9)},${f(oy - 36)} ${f(ox - 5)},${f(oy - 33)} ${f(ox)},${f(oy - 35)}C${f(ox + 5)},${f(oy - 33)} ${f(ox + 9)},${f(oy - 36)} ${f(ox + 8)},${f(oy - 41)}C${f(ox + 4)},${f(oy - 39)} ${f(ox - 4)},${f(oy - 39)} ${f(ox - 8)},${f(oy - 41)}Z`, bone, 0.8);
    s += F(ell(ox - 3.6, oy - 37.4, 1.4, 1.2), '#5E5642') + F(ell(ox + 3.6, oy - 37.4, 1.4, 1.2), '#5E5642');
    // spine
    for (let k = 0; k < 6; k++) s += F(ell(ox, oy - 41 - k * 3.4, 1.6, 1.4), k % 2 ? boneD : bone, 0.6);
    // ribcage
    const cage = `M${f(ox - 8)},${f(oy - 60)}C${f(ox - 10)},${f(oy - 54)} ${f(ox - 9)},${f(oy - 48)} ${f(ox - 5)},${f(oy - 46)}L${f(ox + 5)},${f(oy - 46)}C${f(ox + 9)},${f(oy - 48)} ${f(ox + 10)},${f(oy - 54)} ${f(ox + 8)},${f(oy - 60)}Z`;
    s += F(cage, '#2A241A', 0, 'opacity="0.55"');
    for (let k = 0; k < 5; k++) {
      const y = oy - 59 + k * 2.8;
      const w = 8 - Math.abs(k - 1.5) * 0.9;
      s += L(`M${f(ox)},${f(y)}C${f(ox - w)},${f(y - 1)} ${f(ox - w - 1)},${f(y + 3)} ${f(ox - w + 2)},${f(y + 4)}M${f(ox)},${f(y)}C${f(ox + w)},${f(y - 1)} ${f(ox + w + 1)},${f(y + 3)} ${f(ox + w - 2)},${f(y + 4)}`, 2.2, INK) + L(`M${f(ox)},${f(y)}C${f(ox - w)},${f(y - 1)} ${f(ox - w - 1)},${f(y + 3)} ${f(ox - w + 2)},${f(y + 4)}`, 1.2, bone) + L(`M${f(ox)},${f(y)}C${f(ox + w)},${f(y - 1)} ${f(ox + w + 1)},${f(y + 3)} ${f(ox + w - 2)},${f(y + 4)}`, 1.2, boneD);
    }
    s += F(capsule(P(0, -61), P(0, -49), 2.2, 1.6), bone, 0.7);
    // collarbones
    s += B(P(-8, -61), P(8, -61.5), 1.6);
    // right arm (screen right) hand on hip
    s += B(P(8.6, -60.5), P(11, -47), 2.2, boneD) + B(P(11, -47), P(7, -39), 1.9, boneD) + F(ell(ox + 6.4, oy - 38.4, 2.2, 1.6), boneD, 0.6);
    // left arm raised in a stiff wave
    s += B(P(-8.6, -60.5), P(-15, -70), 2.2) + B(P(-15, -70), P(-14, -82), 1.9);
    s += F(ell(ox - 14, oy - 84.5, 2.4, 2.8), bone, 0.6);
    for (const a of [-2.2, -1.8, -1.4, -1.0]) s += L(`M${f(ox - 14)},${f(oy - 86)}l${f(Math.cos(a) * 4)},${f(Math.sin(a) * 4)}`, 1.6, INK) + L(`M${f(ox - 14)},${f(oy - 86)}l${f(Math.cos(a) * 4)},${f(Math.sin(a) * 4)}`, 0.8, bone);
    // skull with a jaw, a few hairs, a tilted bowler hat
    const skull = `M${f(ox - 6.5)},${f(oy - 70)}C${f(ox - 7.5)},${f(oy - 80)} ${f(ox + 7.5)},${f(oy - 80)} ${f(ox + 6.5)},${f(oy - 70)}C${f(ox + 6)},${f(oy - 67)} ${f(ox + 4)},${f(oy - 66)} ${f(ox + 3.6)},${f(oy - 64.5)}L${f(ox - 3.6)},${f(oy - 64.5)}C${f(ox - 4)},${f(oy - 66)} ${f(ox - 6)},${f(oy - 67)} ${f(ox - 6.5)},${f(oy - 70)}Z`;
    s += F(`M${f(ox - 4)},${f(oy - 65)}L${f(ox + 4)},${f(oy - 65)}L${f(ox + 3)},${f(oy - 61.5)}L${f(ox - 3)},${f(oy - 61.5)}Z`, boneD, 0.7) + L(`M${f(ox - 2)},${f(oy - 65)}v2.4M${f(ox)},${f(oy - 65)}v2.6M${f(ox + 2)},${f(oy - 65)}v2.4`, 0.4, INK);
    s += F(skull, celH(d, ox - 7, ox + 7, bone, boneD, 0.62), 0.9);
    s += F(ell(ox - 2.8, oy - 71, 2, 2.2), '#2A241A') + F(ell(ox + 2.8, oy - 71, 2, 2.2), '#2A241A') + F(`M${f(ox)},${f(oy - 69)}l-1,2.4h2Z`, '#2A241A');
    s += L(`M${f(ox - 3)},${f(oy - 65.4)}v1.4M${f(ox - 1)},${f(oy - 65.4)}v1.6M${f(ox + 1)},${f(oy - 65.4)}v1.6M${f(ox + 3)},${f(oy - 65.4)}v1.4`, 0.4, INK);
    const hat = `M${f(ox - 8)},${f(oy - 76)}L${f(ox + 8)},${f(oy - 79)}L${f(ox + 6)},${f(oy - 80)}C${f(ox + 6)},${f(oy - 87)} ${f(ox - 5)},${f(oy - 86)} ${f(ox - 5)},${f(oy - 78.5)}Z`;
    s += F(hat, celH(d, ox - 8, ox + 8, '#3A3833', '#22201C'), 0.9) + L(`M${f(ox - 5)},${f(oy - 79)}L${f(ox + 6)},${f(oy - 81)}`, 1, '#691122');
    s += fly(ox + 13, oy - 74, 1);
    return s;
  });
}

// ---------------------------------------------------------------- props
function barrel(d: Doc, X: number, Y: number, r: number, h: number, z0: number, col: string, colD: string, seed: number, metal = false): string {
  const yb = Y - z0;
  const yt = Y - z0 - h;
  const bulge = metal ? 1.02 : 1.12;
  const body = `M${f(X - r)},${f(yt)}Q${f(X - r * bulge * 1.04)},${f((yt + yb) / 2)} ${f(X - r)},${f(yb)}A${f(r)},${f(r * K)} 0 0 0 ${f(X + r)},${f(yb)}Q${f(X + r * bulge * 1.04)},${f((yt + yb) / 2)} ${f(X + r)},${f(yt)}A${f(r)},${f(r * K)} 0 0 1 ${f(X - r)},${f(yt)}Z`;
  let s = F(body, celH(d, X - r * bulge, X + r * bulge, col, colD, 0.6));
  if (!metal) {
    let st = '';
    for (const u of [-0.72, -0.4, -0.08, 0.26, 0.6]) st += L(`M${f(X + u * r)},${f(yt + r * K * Math.sqrt(1 - u * u))}Q${f(X + u * r * bulge * 1.04)},${f((yt + yb) / 2 + r * K)} ${f(X + u * r)},${f(yb + r * K * Math.sqrt(1 - u * u))}`, 0.5, dk(colD, 0.3), 'opacity="0.8"');
    s += d.clip(body, st + grain(d, body, [X - r, yt, r * 2, h + r], 12, seed, dk(colD, 0.4), lt(col, 0.2), true));
  } else {
    s += d.clip(body, L(`M${f(X - r * 1.1)},${f(yt + h * 0.33 + r * K)}A${f(r)},${f(r * K)} 0 0 0 ${f(X + r * 1.1)},${f(yt + h * 0.33 + r * K)}M${f(X - r * 1.1)},${f(yt + h * 0.66 + r * K)}A${f(r)},${f(r * K)} 0 0 0 ${f(X + r * 1.1)},${f(yt + h * 0.66 + r * K)}`, 1.3, dk(colD, 0.2)));
    s += rust(d, body, [[X + r * 0.4, yb - 4, 3], [X - r * 0.5, yt + 8, 2]], seed);
    s += sheen(d, body, X - r, yt, r * 2, h + r, 2, 0.2, seed);
  }
  s += L(body, LW);
  if (!metal) {
    for (const v of [0.2, 0.8]) {
      const y = yt + h * v;
      const rr = r * (v === 0.2 || v === 0.8 ? 1.06 : 1.1);
      s += L(`M${f(X - rr)},${f(y)}A${f(rr)},${f(rr * K)} 0 0 0 ${f(X + rr)},${f(y)}`, 2.2, INK) + L(`M${f(X - rr)},${f(y)}A${f(rr)},${f(rr * K)} 0 0 0 ${f(X + rr)},${f(y)}`, 1.2, '#4A4640');
      s += dot(X - rr * 0.5, y + rr * K * 0.86, 0.5, '#9A8A6A');
    }
  }
  const lid = ell(X, yt, r, r * K);
  s += F(lid, metal ? '#5E6248' : lt(col, 0.12), 0.9);
  if (!metal) for (const u of [-0.45, 0, 0.45]) s += d.clip(lid, L(`M${f(X + u * r - r)},${f(yt - r * K)}L${f(X + u * r + r * 0.4)},${f(yt + r * K)}`, 0.5, dk(colD, 0.3)));
  else s += F(ell(X - r * 0.6, yt, r * 0.42, r * 0.42 * K), 'none', 0.7) + dot(X + r * 0.4, yt, 1.2, '#2A2A22');
  return s;
}

function barrelStack(): ArtAsset {
  return objAsset('barrel_stack', 118, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.42, 0.42);
    const [ax, ay] = t.p(-0.17, 0.17);
    const [bx, by] = t.p(0.17, -0.17);
    s += barrel(d, bx, by - 4, 13.5, 30, 0, '#55573F', '#3C3E2C', 4, true);
    // stencilled skull on the metal drum
    s += F(ell(bx + 2, by - 22, 3.4, 3), 'none', 0) + opq(F(ell(bx + 1, by - 21, 3.2, 2.8), '#C9C3A6') + F(`M${f(bx - 1)},${f(by - 19)}h4v2.2h-4Z`, '#C9C3A6') + F(ell(bx - 0.2, by - 21.2, 0.9, 1), '#3C3E2C') + F(ell(bx + 2.2, by - 21.2, 0.9, 1), '#3C3E2C'), 0.85);
    s += barrel(d, ax, ay, 13.5, 30, 0, '#7E5530', '#5A3A1E', 8);
    s += barrel(d, X, Y - 2, 13.5, 30, 30, '#86603A', '#5E3E20', 12);
    // green ooze leaking from the top barrel's bung, down two barrels
    const [gx, gy] = [X + 3, Y - 62];
    s += F(blob(gx, gy, 3.4, 1.8, 3), '#6E9A2A', 0.6);
    s += F(`M${f(gx + 1)},${f(gy + 6)}q-0.6,8 0,16q0.4,8 0.2,12q0.8,2 1.6,0q0,-6 0.4,-12q0.4,-8 0,-16Z`, '#6E9A2A', 0.6) + dot(gx + 1.9, gy + 34.6, 1.4, '#6E9A2A') + L(`M${f(gx + 1.6)},${f(gy + 8)}v12`, 0.5, '#B6D86A', 'opacity="0.8"');
    s += F(`M${f(gx - 1)},${f(gy + 1)}q2,2.6 2,5.4h2q0,-3 -1,-5.4Z`, '#6E9A2A', 0.5);
    s += F(blob(ax + 18, ay + 6, 6, 2.2, 6), '#6E9A2A', 0, 'opacity="0.7"');
    s += fly(X - 12, Y - 72, 1);
    return s;
  });
}
function opq(inner: string, o: number): string {
  return `<g opacity="${f(o)}">${inner}</g>`;
}

function hayBale(): ArtAsset {
  return objAsset('hay_bale', 124, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.45, 0.3);
    // loose straw on the floor
    const r = rnd(19);
    for (let k = 0; k < 14; k++) {
      const [x, y] = t.p(-0.5 + r() * 1, 0.2 + r() * 0.3);
      s += L(`M${f(x)},${f(y)}l${f((r() - 0.5) * 7)},${f((r() - 0.5) * 2)}`, 0.6, k % 2 ? '#B59A52' : '#8E7636');
    }
    // the pitchfork handle behind (drawn before the bale), tines buried in the top
    const fa = t.p(0.06, -0.06, 26);
    s += L(`M${f(fa[0])},${f(fa[1])}L${f(fa[0] + 22)},${f(fa[1] - 58)}`, 3.2, INK) + L(`M${f(fa[0])},${f(fa[1])}L${f(fa[0] + 22)},${f(fa[1] - 58)}`, 2, '#8E6A3E') + L(`M${f(fa[0] - 0.4)},${f(fa[1] - 1)}L${f(fa[0] + 21.4)},${f(fa[1] - 58)}`, 0.6, '#B08452');
    const b = box(t, -0.37, 0.37, -0.21, 0.21, 0, 26, '#C2A65A', '#AE924A', '#86702F');
    s += b.fills;
    const straw = (clip: string, n: number, seed: number, cols: string[], vertical: boolean) => {
      const q = rnd(seed);
      let o = '';
      for (let k = 0; k < n; k++) {
        const x = X - 50 + q() * 100;
        const y = Y - 60 + q() * 70;
        const a = vertical ? -Math.PI / 2 + (q() - 0.5) * 1 : (q() - 0.5) * 1.2;
        const l = 3 + q() * 6;
        o += L(`M${f(x)},${f(y)}l${f(Math.cos(a) * l)},${f(Math.sin(a) * l)}`, 0.5, cols[k % cols.length], 'opacity="0.85"');
      }
      return d.clip(clip, o);
    };
    s += straw(b.top, 120, 3, ['#DCC37A', '#9A8040', '#B8994A'], false) + straw(b.left, 110, 4, ['#CDB46A', '#86702F', '#9E8440'], false) + straw(b.right, 70, 5, ['#9A8040', '#6A5624'], false);
    s += boxShade(d, t, b, -0.37, 0.37, 0.21, 0, 26, 0.3);
    // twine
    for (const i of [-0.17, 0.17]) s += t.line([i, 0.21, 0], [i, 0.21, 26], 0.9, '#5A4A2A') + t.line([i, 0.21, 26], [i, -0.21, 26], 0.9, '#5A4A2A');
    // straw sticking out of the edges
    for (let k = 0; k < 10; k++) {
      const [x, y] = t.p(-0.37 + r() * 0.74, 0.21, 26);
      s += L(`M${f(x)},${f(y)}l${f((r() - 0.5) * 4)},${f(-2 - r() * 3)}`, 0.5, '#C2A65A');
    }
    s += b.lines;
    // fork tines poking out of the hay top
    for (const k of [-1, 0, 1]) s += L(`M${f(fa[0] + k * 2.4)},${f(fa[1] + 0.6)}l${f(-0.8)},${f(-3.4)}`, 0.9, '#5A5A54');
    // a rat tail hanging out of the bale's side
    const [rx, ry] = t.p(-0.15, 0.21, 9);
    s += L(`M${f(rx)},${f(ry)}q-3,3 -2,7q1,3 -2,5`, 1.4, INK) + L(`M${f(rx)},${f(ry)}q-3,3 -2,7q1,3 -2,5`, 0.8, '#B08A86');
    return s;
  });
}

function pumpkin(d: Doc, X: number, Y: number, rx: number, ry: number, col: string, colD: string, seed: number): { s: string; body: string } {
  const body = blob(X, Y, rx, ry, seed, 10, 0.1);
  let s = F(body, celH(d, X - rx, X + rx, col, colD, 0.6), LW);
  let ribs = '';
  for (const u of [-0.62, -0.25, 0.18, 0.55]) ribs += L(`M${f(X + u * rx * 0.3)},${f(Y - ry * 0.9)}Q${f(X + u * rx * 1.25)},${f(Y)} ${f(X + u * rx * 0.3)},${f(Y + ry * 0.95)}`, 0.6, dk(colD, 0.25), 'opacity="0.85"');
  s += d.clip(body, ribs + speckle(d, body, [X - rx, Y - ry, rx * 2, ry * 2], 20, [dk(col, 0.2), lt(col, 0.2)], seed, 0.3, 0.6));
  s += F(capsule([X, Y - ry + 1], [X + 1.4, Y - ry - 4], 2.6, 1.8), '#5E5432', 0.8);
  return { s, body };
}

function pumpkinPile(): ArtAsset {
  return objAsset('pumpkin_pile', 96, (d, t) => {
    let s = shadow(d, t, 0, 0.05, 0.42, 0.34);
    const [ax, ay] = t.p(0.1, -0.14);
    const big = pumpkin(d, ax, ay - 13, 18, 13.5, '#B0662C', '#82451C', 3);
    s += big.s;
    // a leaf + curly vine on the big one
    s += F(leafD(ax + 2, ay - 26, 9, 3.4, -0.3, -1), '#55553F', 0.7);
    // rotting pumpkin front-right: caved-in, mouldy
    const [cx, cy] = t.p(0.27, 0.2);
    const rot = pumpkin(d, cx, cy - 8, 11, 8.5, '#9A6A30', '#6E4A20', 7);
    s += rot.s;
    s += d.clip(rot.body, F(blob(cx + 4, cy - 10, 6, 4.4, 4), '#4E3A1C', 0.6) + F(blob(cx + 4.6, cy - 9.6, 3.6, 2.4, 5), '#2E2212') + dot(cx + 1, cy - 13, 1.2, '#C9D0A8', 0.9) + dot(cx + 8, cy - 6, 1, '#9AB06A', 0.9) + dot(cx + 3, cy - 5, 0.8, '#C9D0A8', 0.9));
    s += F(blob(cx + 7, cy + 2, 5, 1.6, 6), '#5A4220', 0, 'opacity="0.6"');
    // carved jack-o'-lantern front-left with a faint candle glow
    const [bx, by] = t.p(-0.24, 0.18);
    const jack = pumpkin(d, bx, by - 9, 12, 9, '#B8702E', '#86481E', 11);
    s += jack.s;
    const eyes = `M${f(bx - 6)},${f(by - 11)}l2.6,-3.4l1.6,3.6ZM${f(bx + 0.6)},${f(by - 11.4)}l2.8,-3.2l1.4,3.8Z`;
    const mouth = `M${f(bx - 7)},${f(by - 7)}l2,2l1.4,-1.6l1.8,2.2l1.6,-2l1.8,2.2l1.6,-2.4l1.8,1.6l-1.4,2.6l-9,0.4Z`;
    s += glow(d, F(eyes + mouth, '#E0A040'), 1.4, 0.7) + F(eyes + mouth, '#4A240C', 0.7) + d.clip(eyes + mouth, F(blob(bx - 1, by - 8, 6, 3, 2), '#C9822E', 0, 'opacity="0.8"'));
    s += fly(cx + 12, cy - 22, 0.9) + fly(cx - 2, cy - 26, 0.8, false);
    return s;
  });
}

function coffinUpright(): ArtAsset {
  return objAsset('coffin_upright', 150, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, -0.02, 0.36, 0.24);
    const hex = 'M5,0L25,0L30,-64L24,-98L6,-98L0,-64Z';
    const wood = '#5A3A22';
    const woodD = '#3A2414';
    const i0 = -0.31;
    const jf = 0.12;
    // box body with depth, then the dark lined interior, then the lid swung ajar to the left
    s += extrude(d, t, hex, i0, jf, 0, 0.22, wood, woodD, 8);
    let face = F(hex, '#2A1A10');
    const inner = 'M7.5,-3L22.5,-3L26.6,-64L21.6,-95L8.4,-95L3.4,-64Z';
    face += F(inner, '#4A1218', 0.8) + d.clip(inner, F('M14,-100h20v104h-20Z', '#16100C') + L('M18,-90L20,-10', 0.5, '#6A2028', 'opacity="0.7"'));
    // two yellow eyes in the gap
    face += glow(d, F(ell(22, -76, 1.5, 1), EYE_Z) + F(ell(25, -75.5, 1.4, 0.9), EYE_Z), 1.2, 0.9) + F(ell(22, -76, 1.2, 0.8), EYE_Z) + F(ell(25, -75.5, 1.1, 0.7), EYE_Z);
    face += L(hex, LW);
    s += grp(face, swFace(t, i0, jf, 0));
    // lid, slid left and pulled outward
    let lid = F(hex, celH(d, 0, 30, '#6A4428', '#4A2E18', 0.7), LW);
    lid += grain(d, hex, [0, -98, 30, 98], 22, 7, '#3A2414', '#8A6040', true);
    lid += F('M13,-82h4v10h7v4h-7v22h-4v-22h-7v-4h7Z', '#4A2E18', 0.8) + L('M13.6,-81.4v9.4h-7', 0.5, '#8A6040');
    lid += F(hex, d.linear(0, -98, 0, 0, [[0, '#FFF', 0.06], [0.7, '#000', 0], [1, '#000', 0.35]]));
    lid += d.clip(hex, scratches(d, hex, [0, -98, 30, 98], 18, '#A07850', 3, 0.7));
    lid += F(ell(6, -44, 1.6, 2.6), '#8A7034', 0.6) + F(ell(6, -24, 1.6, 2.6), '#8A7034', 0.6);
    // cobweb in the top corner
    lid += L('M6,-98L11,-90M6,-98L8,-88M6,-98L13,-95M7.6,-94Q9,-93.6 10,-95M8.6,-91Q10.6,-91 12,-93.6', 0.35, '#E8E4D8', 'opacity="0.8"');
    s += grp(lid, `${swFace(t, i0 - 0.09, jf + 0.04, 2)}`);
    // green fingers curling round the lid's edge from inside
    const [fx, fy] = t.p(i0 + 0.46, jf + 0.04, 52);
    for (let k = 0; k < 4; k++) s += F(capsule([fx + 3, fy + k * 3.2 - 3], [fx - 2.4, fy + k * 3.2 - 2], 2.2, 1.8), k % 2 ? SKIN_Z : '#7AAE3E', 0.7) + F(ell(fx - 2.4, fy + k * 3.2 - 2, 0.7, 0.6), '#C9C48A');
    s += fly(X + 26, Y - 92, 1);
    return s;
  });
}

function slimeFountain(): ArtAsset {
  return objAsset('slime_fountain', 118, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.42, 0.42);
    const stone = '#8A887E';
    const stoneD = '#5E5C54';
    // basin
    const bas = cyl(d, X, Y, 28, 29, 0, 15, stone, stoneD, '#A2A096');
    s += bas.s;
    let blocks = '';
    for (let k = 0; k < 7; k++) {
      const x = X - 28 + k * 9 + (k % 2) * 2;
      blocks += L(`M${f(x)},${f(Y - 15 + 2)}L${f(x)},${f(Y + 14)}`, 0.6, '#45433C');
    }
    blocks += L(`M${f(X - 30)},${f(Y - 7)}A28,${f(28 * K)} 0 0 0 ${f(X + 30)},${f(Y - 7)}`, 0.6, '#45433C');
    s += d.clip(bas.body, blocks + speckle(d, bas.body, [X - 30, Y - 20, 60, 40], 50, ['#5A5850', '#B2B0A4'], 7));
    // pool of glowing slime
    const pool = cap(X, Y, 24.5, 14);
    s += F(pool, d.radial(X - 6, Y - 18, 26, [[0, '#9ACB3E'], [0.7, '#6E9A2A'], [1, '#45661A']]), 0.9);
    s += glow(d, F(cap(X, Y, 20, 14), '#A6E040'), 3, 0.45);
    s += L(cap(X - 4, Y - 1, 8, 14), 0.5, '#C9EE7A', 'opacity="0.6"') + L(cap(X + 6, Y + 1, 5, 14), 0.5, '#C9EE7A', 'opacity="0.5"');
    // pedestal + upper bowl
    s += cyl(d, X, Y, 5, 4, 14, 38, stone, stoneD, '#A2A096').s;
    const bowl = cylBody(X, Y, 4, 13, 36, 44);
    s += F(bowl, celH(d, X - 13, X + 13, stone, stoneD)) + L(bowl, LW) + F(cap(X, Y, 13, 44), '#A2A096', 0.9);
    s += F(cap(X, Y, 10.5, 43.6), '#7EAE30', 0.6);
    // slime spilling over the bowl rim into the pool
    let drip = '';
    for (const [dx, len] of [[-11, 18], [-5, 22], [3, 26], [10, 16]] as [number, number][]) {
      const y0 = Y - 44 + Math.sqrt(Math.max(0, 1 - (dx / 13) ** 2)) * 13 * K;
      drip += F(`M${f(X + dx - 1.6)},${f(y0)}Q${f(X + dx - 1.4)},${f(y0 + len * 0.6)} ${f(X + dx)},${f(y0 + len)}Q${f(X + dx + 1.4)},${f(y0 + len * 0.6)} ${f(X + dx + 1.6)},${f(y0)}Z`, '#7EAE30', 0.6);
    }
    s += drip;
    // skull topper spewing slime from its mouth
    const sy = Y - 44;
    const skull = `M${f(X - 5.5)},${f(sy - 6)}C${f(X - 6.4)},${f(sy - 15)} ${f(X + 6.4)},${f(sy - 15)} ${f(X + 5.5)},${f(sy - 6)}C${f(X + 5)},${f(sy - 3)} ${f(X + 3.4)},${f(sy - 2.4)} ${f(X + 3)},${f(sy - 1)}L${f(X - 3)},${f(sy - 1)}C${f(X - 3.4)},${f(sy - 2.4)} ${f(X - 5)},${f(sy - 3)} ${f(X - 5.5)},${f(sy - 6)}Z`;
    s += F(skull, celH(d, X - 6, X + 6, '#B2B0A4', '#7E7C72'), 0.9);
    s += F(ell(X - 2.4, sy - 7, 1.6, 1.8), '#24301A') + F(ell(X + 2.4, sy - 7, 1.6, 1.8), '#24301A');
    s += glow(d, dot(X - 2.4, sy - 7, 1.2, '#B6E050') + dot(X + 2.4, sy - 7, 1.2, '#B6E050'), 1, 0.9);
    const spew = `M${f(X - 1.6)},${f(sy - 2)}Q${f(X - 9)},${f(sy - 2)} ${f(X - 14)},${f(sy + 10)}L${f(X - 12)},${f(sy + 10)}Q${f(X - 8)},${f(sy + 1)} ${f(X + 1.6)},${f(sy - 1)}Z`;
    s += glow(d, F(spew, '#A6E040'), 1.4, 0.6) + F(spew, '#8EC236', 0.6) + L(`M${f(X - 3)},${f(sy - 1.6)}Q${f(X - 8)},${f(sy - 1)} ${f(X - 12)},${f(sy + 7)}`, 0.5, '#D6F08A');
    s += F(ell(X - 13, Y - 30, 3, 1.6), '#9ACB3E', 0.5) + L(`M${f(X - 16)},${f(Y - 32)}l-1.4,-1.4M${f(X - 10)},${f(Y - 32.4)}l1.2,-1.6`, 0.5, '#B6E050');
    return s;
  });
}

function lampFloor(): ArtAsset {
  return objAsset('lamp_floor', 140, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.2, 0.2);
    // warm pool of light on the floor
    s += glow(d, F(t.ell(0, 0, 0.42, 0.42), '#E8C870'), 4, 0.22);
    const brass = '#7A6436';
    const brassD = '#4E3E1E';
    s += cyl(d, X, Y, 10, 9, 0, 3, brass, brassD, '#8E7848').s;
    s += F(cap(X, Y, 9, 3), d.radial(X - 3, Y - 4, 9, [[0, '#A88E58'], [1, '#6E5A30']]), 0.9);
    const pole = cylBody(X, Y, 1.5, 1.3, 3, 80);
    s += F(pole, celH(d, X - 1.5, X + 1.5, '#9A8250', brassD)) + L(pole, 0.9);
    s += F(ell(X, Y - 42, 2.6, 2.2), brass, 0.8) + dot(X - 0.8, Y - 42.8, 0.6, '#D8C08A');
    s += rust(d, pole, [[X, Y - 20, 1.2]], 4);
    // bulb glow under the shade
    s += glow(d, F(ell(X, Y - 74, 16, 9), '#FFE09A'), 4, 0.75);
    s += F(ell(X, Y - 74, 3.4, 3.6), '#FFF0C0', 0.6);
    // shade: tapered drum, stained fabric, a torn flap, fringe
    const shade = cylBody(X, Y, 17, 10.5, 72, 94);
    s += F(shade, celH(d, X - 17, X + 17, '#D2C292', '#A28E5E', 0.62));
    s += F(shade, d.linear(0, Y - 94, 0, Y - 66, [[0, '#000', 0], [1, '#FFE6A0', 0.45]]));
    s += d.clip(shade, F(blob(X - 7, Y - 80, 4, 5.6, 3), '#8A6E3A', 0, 'opacity="0.45"') + L(blob(X - 7, Y - 80, 4, 5.6, 3), 0.5, '#6E5428', 'opacity="0.6"') + F(blob(X + 8, Y - 86, 2.4, 3, 4), '#6E5A34', 0, 'opacity="0.35"') + dot(X + 3, Y - 77, 0.9, '#4A3A1E', 0.5));
    for (let k = 0; k < 8; k++) s += d.clip(shade, L(`M${f(X - 17 + k * 4.6)},${f(Y - 94)}L${f(X - 17 + k * 5.4)},${f(Y - 66)}`, 0.4, '#8A7A4E', 'opacity="0.6"'));
    s += L(shade, LW);
    // fringe tassels along the bottom rim
    let fr = '';
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI - (k / 16) * Math.PI;
      const x = X + Math.cos(a) * 17;
      const y = Y - 72 + Math.sin(a) * 17 * K;
      fr += `M${f(x)},${f(y)}l${f((k % 3) * 0.2 - 0.2)},${f(2.6 + (k % 2))}`;
    }
    s += L(fr, 0.6, '#6A3A22');
    // the torn flap hanging down
    s += F(`M${f(X + 7)},${f(Y - 66.6)}l3,0.4l-0.6,6l-3.2,-1.4Z`, '#B8A676', 0.6);
    s += F(cap(X, Y, 10.5, 94), '#3A3020', 0.9) + glow(d, F(cap(X, Y, 6, 94), '#FFE09A'), 1.6, 0.6);
    s += fly(X + 21, Y - 98, 0.9) + fly(X - 22, Y - 92, 0.8, false);
    return s;
  });
}

function aquarium(): ArtAsset {
  return objAsset('aquarium', 126, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.5, 0.3);
    // cabinet
    const cb = box(t, -0.42, 0.42, -0.2, 0.2, 0, 30, '#4A3020', '#5E3E26', '#3E2818');
    s += cb.fills + grain(d, cb.left, [X - 50, Y - 40, 60, 50], 14, 6) + grain(d, cb.right, [X + 10, Y - 50, 40, 50], 8, 7, '#2A180C', '#6E4A2E');
    s += grp(F('M4,-6h15v-18h-15Z', 'none', 0.7) + F('M22,-6h15v-18h-15Z', 'none', 0.7) + dot(17, -15, 0.8, '#B09A4A') + dot(24, -15, 0.8, '#B09A4A'), swFace(t, -0.42, 0.2, 0));
    s += boxShade(d, t, cb, -0.42, 0.42, 0.2, 0, 30) + cb.lines;
    // tank: water body, contents drawn on the front pane, glass on top
    const z0 = 30;
    const z1 = 68;
    const zw = 63;
    const tk = box(t, -0.41, 0.41, -0.19, 0.19, z0, z1, '#2E3A2A', '#2E3A2A', '#2E3A2A', 1.4);
    const front = poly([t.p(-0.41, 0.19, z0), t.p(0.41, 0.19, z0), t.p(0.41, 0.19, zw), t.p(-0.41, 0.19, zw)]);
    const side = poly([t.p(0.41, 0.19, z0), t.p(0.41, -0.19, z0), t.p(0.41, -0.19, zw), t.p(0.41, 0.19, zw)]);
    const surf = t.qd(-0.41, 0.41, -0.19, 0.19, zw);
    s += F(tk.sil, '#1E261C');
    const [, ft] = t.p(-0.41, 0.19, zw);
    const [, fb] = t.p(-0.41, 0.19, z0);
    s += F(front, d.linear(0, ft, 0, fb + 30, [[0, '#7E9A5A'], [0.5, '#56704A'], [1, '#2E4228']]));
    s += F(side, d.linear(0, ft - 20, 0, fb + 30, [[0, '#56704A'], [1, '#1E2E1A']]));
    s += F(surf, '#8EA86A', 0, 'opacity="0.9"') + L(surf, 0.6, '#C2D69A', 'opacity="0.6"');
    // contents in the front pane's frame: 0..39 wide, 0..-33 tall
    const W = 0.82 * 48;
    let c = '';
    const r = rnd(9);
    // gravel
    c += F(`M0,0L${f(W)},0L${f(W)},-5Q${f(W * 0.6)},-7 ${f(W * 0.3)},-4.6Q${f(W * 0.15)},-4 0,-5.4Z`, '#6A5E44');
    for (let k = 0; k < 40; k++) c += dot(r() * W, -r() * 5, 0.5 + r() * 0.6, ['#8A7A5A', '#4A4030', '#A09070', '#5E5A3A'][k % 4]);
    // a sunken skull ornament and weeds
    c += F('M6,-4C5,-11 15,-11 14,-4Z', '#B2AC96', 0.6) + F(ell(8.4, -7, 1.2, 1.3), '#2A2A1E') + F(ell(11.6, -7, 1.2, 1.3), '#2A2A1E');
    c += L('M30,-4Q27,-12 31,-18Q34,-24 30,-30M33,-4Q35,-10 32,-16M27,-4Q26,-8 28,-13', 1.2, '#2E4A1A') + L('M30,-4Q27,-12 31,-18', 0.5, '#5E7A2E');
    // the zombie fish: green rotten head, bare spine, ragged tail
    const fx = 17;
    const fy = -19;
    c += F(`M${f(fx - 8)},${f(fy)}C${f(fx - 7)},${f(fy - 5)} ${f(fx)},${f(fy - 5)} ${f(fx + 1)},${f(fy - 2.4)}L${f(fx + 1)},${f(fy + 2.4)}C${f(fx)},${f(fy + 5)} ${f(fx - 7)},${f(fy + 4)} ${f(fx - 8)},${f(fy)}Z`, '#7E9A50', 0.7);
    c += F(ell(fx - 5, fy - 1, 1.6, 1.6), EYE_Z, 0.4) + L(`M${f(fx - 8)},${f(fy + 1)}l2,0`, 0.5, INK);
    c += L(`M${f(fx + 1)},${f(fy)}L${f(fx + 9)},${f(fy)}`, 0.9, '#D6CDAE');
    for (let k = 0; k < 4; k++) c += L(`M${f(fx + 2 + k * 2)},${f(fy - 2.6 + k * 0.3)}L${f(fx + 2.4 + k * 2)},${f(fy + 2.6 - k * 0.3)}`, 0.6, '#D6CDAE');
    c += F(`M${f(fx + 9)},${f(fy)}L${f(fx + 13)},${f(fy - 4)}L${f(fx + 12)},${f(fy - 1)}L${f(fx + 14)},${f(fy + 1)}L${f(fx + 12)},${f(fy + 2)}L${f(fx + 13)},${f(fy + 4)}Z`, '#6E844A', 0.5);
    // bubbles
    for (let k = 0; k < 7; k++) c += F(ell(10 + (k % 2) * 1.4, -9 - k * 3.4, 0.5 + k * 0.1, 0.5 + k * 0.1), 'none', 0) + L(ell(10 + (k % 2) * 1.4, -9 - k * 3.4, 0.5 + k * 0.1, 0.5 + k * 0.1), 0.35, '#D6E8B8');
    // murk + algae smears on the glass
    c += F(`M0,-33h${f(W)}v33h${f(-W)}Z`, d.linear(0, -33, 0, 0, [[0, '#5E7A3A', 0.1], [1, '#2E4222', 0.35]]));
    c += F(blob(5, -24, 5, 6, 3), '#4F6A22', 0, 'opacity="0.45"') + F(blob(W - 4, -12, 4, 7, 4), '#4F6A22', 0, 'opacity="0.4"');
    s += d.clip(front, grp(c, swFace(t, -0.41, 0.19, z0)));
    // glass + frame
    s += sheen(d, front, X - 46, Y - 80, 40, 50, 2, 0.22, 3);
    s += tk.lines;
    s += t.line([0.41, 0.19, z0], [0.41, 0.19, z1], 1.6, '#24241F') + t.line([-0.41, 0.19, z0], [0.41, 0.19, z0], 1.6, '#24241F');
    // lid with a hood light
    const lid = box(t, -0.42, 0.42, -0.2, 0.2, z1, z1 + 3, '#34342E', '#2A2A26', '#1E1E1A');
    s += lid.fills + lid.lines;
    s += F(t.qd(-0.2, 0.2, -0.1, 0.1, z1 + 3.2), '#4A4A42', 0.6);
    return s;
  });
}

function cauldron(): ArtAsset {
  return objAsset('cauldron', 112, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.42, 0.42);
    // fire glow and logs
    s += glow(d, F(t.ell(0, 0, 0.34, 0.3), '#E07A2A'), 3, 0.45);
    s += F(capsule([X - 20, Y + 2], [X + 14, Y - 4], 5, 5), '#4A3420', 0.9) + F(capsule([X - 12, Y - 6], [X + 20, Y + 4], 5, 5), '#5E4428', 0.9);
    s += F(ell(X + 20, Y + 4, 2.4, 2.4), '#8E6E48', 0.6) + F(ell(X - 20, Y + 2, 2.4, 2.4), '#7E5E3A', 0.6);
    s += glow(d, dot(X - 4, Y - 1, 3, '#FFB040') + dot(X + 6, Y, 2.4, '#FF8A2A'), 1.4, 0.9) + dot(X - 4, Y - 1, 1.2, '#FFE0A0') + dot(X + 6, Y, 1, '#FFD080');
    // stubby legs
    for (const [lx, ly] of [[-14, -2], [13, -3], [1, 4]] as [number, number][]) s += F(capsule([X + lx, Y + ly - 10], [X + lx * 1.15, Y + ly], 3.4, 2.4), '#2A2826', 0.8);
    const iron = '#45423C';
    const ironD = '#22201C';
    const pot = `M${f(X - 23)},${f(Y - 38)}C${f(X - 32)},${f(Y - 30)} ${f(X - 26)},${f(Y - 8)} ${f(X)},${f(Y - 7)}C${f(X + 26)},${f(Y - 8)} ${f(X + 32)},${f(Y - 30)} ${f(X + 23)},${f(Y - 38)}Z`;
    s += F(pot, celH(d, X - 28, X + 28, iron, ironD, 0.6));
    s += sheen(d, pot, X - 24, Y - 38, 20, 30, 2, 0.16, 5);
    s += d.clip(pot, F(blob(X + 12, Y - 14, 3, 2, 6), '#5A3A22', 0, 'opacity="0.5"'));
    // fire-lit underside
    s += d.clip(pot, F(pot, d.linear(0, Y - 30, 0, Y - 6, [[0, '#E07A2A', 0], [1, '#E07A2A', 0.45]])));
    // slime overflow running down the side
    s += F(`M${f(X - 12)},${f(Y - 36)}q-1,8 0,14q1,2 2,0q0.4,-6 1.6,-13Z`, '#6E9A2A', 0.6) + dot(X - 11.2, Y - 21, 1.2, '#6E9A2A');
    s += L(pot, LW);
    // handles
    s += L(`M${f(X - 25)},${f(Y - 33)}q-5,1 -4,6`, 2.8, INK) + L(`M${f(X - 25)},${f(Y - 33)}q-5,1 -4,6`, 1.4, '#55524C');
    s += L(`M${f(X + 25)},${f(Y - 33)}q5,1 4,6`, 2.8, INK) + L(`M${f(X + 25)},${f(Y - 33)}q5,1 4,6`, 1.4, '#3A3833');
    // thick rim + bubbling surface
    s += F(cap(X, Y, 24, 38), '#5A5750', LW);
    const surf = cap(X, Y, 20, 37.6);
    s += F(surf, d.radial(X - 4, Y - 40, 22, [[0, '#B6E050'], [0.6, '#7EAE30'], [1, '#45661A']]), 0.8);
    s += glow(d, F(cap(X, Y, 16, 40), '#A6E040'), 3.4, 0.5);
    for (const [bx, by, br] of [[-8, -39, 2.6], [5, -37, 2], [11, -40, 1.4], [-2, -35.6, 1.2]] as [number, number, number][]) s += F(ell(X + bx, Y + by, br, br * 0.8), '#9ACB3E', 0.5) + dot(X + bx - br * 0.3, Y + by - br * 0.3, br * 0.3, '#E2F6A8');
    s += eyeball(X + 2, Y - 40, 2.8, '#4F6A3A', -0.3, 0.2);
    // a bone sticking out
    s += F(capsule([X - 6, Y - 37], [X - 14, Y - 50], 2.2), '#D6CDAE', 0.7) + F(ell(X - 14.6, Y - 51, 1.8, 1.6), '#D6CDAE', 0.6) + F(ell(X - 13, Y - 51.6, 1.6, 1.4), '#D6CDAE', 0.6);
    // steam wisps
    s += glow(d, F(blob(X + 6, Y - 54, 6, 4, 3), '#D6E0C0') + F(blob(X - 2, Y - 64, 5, 3.4, 4), '#D6E0C0'), 1.6, 0.35);
    return s;
  });
}

// ---------------------------------------------------------------- late-game decor
const IRON = '#3A3833';
/** Rotated ellipse (screen space). */
function rotEll(x: number, y: number, rx: number, ry: number, deg: number, fill: string, sw = LW): string {
  return grp(F(ell(0, 0, rx, ry), fill, sw), `translate(${f(x)} ${f(y)}) rotate(${f(deg)})`);
}
/** A bone between two screen points with knobbly ends. */
function boneD(a: Pt, b: Pt, w: number, col = '#D6CDAE'): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = (-(b[1] - a[1]) / len) * w * 0.5;
  const ny = ((b[0] - a[0]) / len) * w * 0.5;
  let s = F(capsule(a, b, w, w), col, 0.8);
  for (const p of [a, b]) s += F(ell(p[0] + nx, p[1] + ny, w * 0.62, w * 0.62), col, 0.7) + F(ell(p[0] - nx, p[1] - ny, w * 0.62, w * 0.62), col, 0.7);
  return s + L(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, w * 0.3, '#A89C78', 'opacity="0.6"');
}

function pigSpit(): ArtAsset {
  return objAsset('pig_spit', 108, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.46, 0.3);
    // a ring of stones round glowing embers
    s += glow(d, F(t.ell(0, 0, 0.3, 0.2), '#E07A2A'), 3, 0.5);
    s += F(t.ell(0, 0, 0.26, 0.17), '#2A1A10', 0.8);
    const r = rnd(81);
    for (let k = 0; k < 9; k++) s += dot(X + (r() - 0.5) * 30, Y + (r() - 0.5) * 9, 1 + r() * 1.2, k % 2 ? '#E08A3A' : '#B2502A', 0.95);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const [x, y] = t.p(Math.cos(a) * 0.32, Math.sin(a) * 0.22, 0);
      s += F(blob(x, y - 1.5, 4, 2.6, 820 + k, 7, 0.35), k % 2 ? '#8A847A' : '#6E6860', 0.6);
    }
    // the far Y-post
    const post = (i: number) => {
      const b = t.p(i, 0, 0);
      const top = t.p(i, 0, 36);
      return L(`M${f(b[0])},${f(b[1])}L${f(top[0])},${f(top[1])}`, 3.6, INK) + L(`M${f(b[0])},${f(b[1])}L${f(top[0])},${f(top[1])}`, 2.4, IRON) + L(`M${f(top[0] - 4)},${f(top[1] - 5)}L${f(top[0])},${f(top[1])}L${f(top[0] + 4)},${f(top[1] - 5)}`, 2.6, INK) + L(`M${f(top[0] - 4)},${f(top[1] - 5)}L${f(top[0])},${f(top[1])}L${f(top[0] + 4)},${f(top[1] - 5)}`, 1.6, IRON);
    };
    s += post(-0.42);
    // the spit and the pig roasting on it (lying along i: 32 degrees on screen)
    const a = t.p(-0.46, 0, 34);
    const b = t.p(0.5, 0, 34);
    s += L(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, 2.2, INK) + L(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, 1.2, '#8E8A80');
    const [px, py] = t.p(0.02, 0, 36);
    s += rotEll(px, py, 22, 11, 32, '#B0663A');
    s += grp(F(ell(-4, -4, 16, 5), '#D08A50', 0) + F(ell(4, 4, 18, 5), '#7A3A1C', 0, 'opacity="0.6"') + L('M-12,-6q8,4 0,10M-2,-9q8,4 0,14M8,-9q8,4 0,14', 0.6, '#5A2A12', 'opacity="0.6"'), `translate(${f(px)} ${f(py)}) rotate(32)`);
    s += rotEll(px, py, 22, 11, 32, 'none');
    // the head (screen-left, far end) with one eye that blinks open, the curly tail at the other
    const [hx, hy] = t.p(-0.3, 0, 38);
    s += F(ell(hx, hy, 8, 7), '#B0663A', LW) + F(ell(hx - 5, hy + 2, 3.6, 2.8), '#C07A50', 0.8) + dot(hx - 6, hy + 1.6, 0.6, INK) + dot(hx - 4.2, hy + 2.4, 0.6, INK);
    s += F(`M${f(hx + 1)},${f(hy - 6)}l4,-5l1,6Z`, '#9A5430', 0.7) + F(ell(hx - 3, hy + 5.6, 2.4, 2.2), '#8A2A22', 0.7);
    s += F(ell(hx - 1, hy - 2, 1.8, 1.4), '#E8E2CC', 0.5) + dot(hx - 0.6, hy - 1.8, 0.8, EYE_Z) + L(`M${f(hx + 2)},${f(hy - 3)}l1.6,1`, 0.5, INK);
    const [tx, ty] = t.p(0.32, 0, 34);
    s += L(`M${f(tx)},${f(ty)}q5,-2 4,-6q-2,-2 -3,1`, 1.6, INK) + L(`M${f(tx)},${f(ty)}q5,-2 4,-6q-2,-2 -3,1`, 0.9, '#B0663A');
    s += post(0.42);
    // the crank handle
    s += L(`M${f(b[0])},${f(b[1])}l0,7l4,0`, 2.4, INK) + L(`M${f(b[0])},${f(b[1])}l0,7l4,0`, 1.2, '#8E6A40');
    s += fly(X + 6, Y - 62, 1);
    return s;
  });
}

function brainJar(): ArtAsset {
  return objAsset('brain_jar', 124, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.36, 0.28);
    // a little wooden lab stand
    const b = box(t, -0.26, 0.26, -0.26, 0.26, 0, 22, '#8E6436', '#7A5230', '#5A3A20');
    s += b.fills + grain(d, b.left, [X - 30, Y - 30, 40, 30], 10, 83) + boxShade(d, t, b, -0.26, 0.26, 0.26, 0, 22) + b.lines;
    // the jar: green fluid, a brain, bubbles, then the glass
    const jar = cyl(d, X, Y - 2, 15, 15, 24, 62, '#9AB86A', '#5E7A3A', '#B8D08A');
    s += F(jar.body, d.linear(X - 15, 0, X + 15, 0, [[0, '#7AA040'], [0.6, '#5E8A2A'], [1, '#3E5A1A']]));
    s += glow(d, F(ell(X, Y - 44, 10, 8), '#B6E050'), 3, 0.5);
    s += F(blob(X, Y - 42, 10, 8, 84, 11, 0.2), '#C48C88', 0.8);
    s += L(`M${f(X - 1)},${f(Y - 50)}q2,6 -1,14`, 0.8, '#6E3A3C');
    const r = rnd(85);
    for (let k = 0; k < 9; k++) {
      const x = X - 7 + r() * 14;
      const y = Y - 30 - r() * 20;
      s += L(`M${f(x)},${f(y)}q${f(2 + r())},${f(-2)} ${f(4)},0`, 0.6, '#6E383C');
    }
    // the brainstem dangling, an eyeball tethered to it
    s += L(`M${f(X + 2)},${f(Y - 35)}q2,4 0,8`, 1.6, '#B07A78') + eyeball(X + 2, Y - 26, 2.6, '#4E6A86', -0.2, 0.3);
    for (let k = 0; k < 6; k++) s += F(ell(X - 9 + r() * 18, Y - 30 - r() * 26, 0.8, 0.8), 'none', 0.4);
    s += F(jar.body, d.linear(X - 15, 0, X + 15, 0, [[0, '#FFFFFF', 0.25], [0.25, '#FFFFFF', 0.05], [0.8, '#000', 0.1], [1, '#000', 0.25]])) + sheen(d, jar.body, X - 12, Y - 64, 10, 40, 2, 0.35, 86);
    s += L(jar.body, LW) + F(jar.top, '#B8D08A', 0.8, 'opacity="0.6"');
    // brass lid with two electrodes and a frayed cable to the stand
    s += cyl(d, X, Y - 2, 16, 16, 62, 66, '#A8822A', '#6E5418', '#C8A04A').s;
    for (const dx of [-6, 6]) s += L(`M${f(X + dx)},${f(Y - 68)}v-6`, 2.2, INK) + L(`M${f(X + dx)},${f(Y - 68)}v-6`, 1.2, '#9A9C94') + dot(X + dx, Y - 75, 1.2, '#B8963E');
    s += L(`M${f(X + 6)},${f(Y - 75)}C${f(X + 22)},${f(Y - 80)} ${f(X + 26)},${f(Y - 40)} ${f(X + 18)},${f(Y - 20)}`, 1.2, '#2A2826');
    s += glow(d, L(`M${f(X - 6)},${f(Y - 76)}l-2,-4l3,1l-1,-4`, 0.8, '#E6E07A'), 1, 0.9);
    return s;
  });
}

function chainsawStump(): ArtAsset {
  return objAsset('chainsaw_stump', 96, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.44, 0.34);
    // roots splaying out, then the stump
    for (const a of [0.3, 1.9, 3.3, 4.6]) {
      const [x, y] = t.p(Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0);
      s += F(capsule([X, Y - 4], [x, y], 7, 3), '#5A4028', 0.8);
    }
    const st = cyl(d, X, Y, 22, 20, 0, 24, '#6A4A2E', '#45301C', '#C8A876');
    s += st.s;
    let bark = '';
    for (let k = 0; k < 14; k++) bark += L(`M${f(X - 21 + k * 3.2)},${f(Y - 22 + (k % 3))}q-1,10 0.4,${f(18 + (k % 4) * 2)}`, 0.6, '#2E1E10', 'opacity="0.7"');
    s += d.clip(st.body, bark);
    // growth rings and a cut groove
    for (const k of [0.3, 0.55, 0.8]) s += L(ell(X, Y - 24, 20 * k, 20 * k * K), 0.5, '#8E6A40');
    s += F(`M${f(X - 12)},${f(Y - 26)}L${f(X + 6)},${f(Y - 18)}L${f(X + 7)},${f(Y - 21)}Z`, '#2A1A0E', 0.5);
    // the chainsaw, bar buried in the stump
    s += F(`M${f(X - 12)},${f(Y - 26)}L${f(X - 30)},${f(Y - 35)}C${f(X - 34)},${f(Y - 37)} ${f(X - 35)},${f(Y - 33)} ${f(X - 31)},${f(Y - 31)}L${f(X - 9)},${f(Y - 21)}Z`, '#5A5C58', 0.9);
    for (let k = 0; k < 7; k++) s += L(`M${f(X - 13 - k * 2.6)},${f(Y - 26.6 - k * 1.3)}l-0.6,-1.2`, 0.8, '#C8CAC4');
    const body = `M${f(X - 4)},${f(Y - 34)}L${f(X + 14)},${f(Y - 28)}L${f(X + 16)},${f(Y - 16)}L${f(X - 4)},${f(Y - 22)}Z`;
    s += F(body, celH(d, X - 4, X + 16, '#C8652A', '#8A3E14'), LW);
    s += F(`M${f(X + 2)},${f(Y - 33)}C${f(X + 2)},${f(Y - 42)} ${f(X + 12)},${f(Y - 40)} ${f(X + 12)},${f(Y - 30)}`, 'none', 0) + L(`M${f(X + 2)},${f(Y - 33)}C${f(X + 2)},${f(Y - 42)} ${f(X + 12)},${f(Y - 40)} ${f(X + 12)},${f(Y - 30)}`, 3, INK) + L(`M${f(X + 2)},${f(Y - 33)}C${f(X + 2)},${f(Y - 42)} ${f(X + 12)},${f(Y - 40)} ${f(X + 12)},${f(Y - 30)}`, 1.8, '#2A2826');
    s += L(`M${f(X + 3)},${f(Y - 26)}l8,2.6M${f(X + 3)},${f(Y - 24)}l8,2.6`, 0.6, '#5A2A0A');
    // the starter cord flopping out, sawdust and a severed glove
    s += L(`M${f(X + 15)},${f(Y - 22)}q8,2 6,12`, 0.7, '#D8D2BC') + F(ell(X + 21, Y - 9, 1.6, 1), '#2A2826', 0.4);
    const r = rnd(87);
    for (let k = 0; k < 14; k++) s += dot(X - 26 + r() * 52, Y + 2 + r() * 9, 0.6, '#D8B880', 0.9);
    s += F(blob(X - 22, Y + 6, 5, 3, 88), '#8E6A3A', 0.6) + finger(X - 18, Y + 7, 0.5, 5, 2.2, '#B3B294');
    return s;
  });
}

function trophySpatula(): ArtAsset {
  return objAsset('trophy_spatula', 150, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.32, 0.26);
    const b = box(t, -0.22, 0.22, -0.22, 0.22, 0, 20, '#3A2A1E', '#4E3424', '#2E1E14');
    s += b.fills + grain(d, b.left, [X - 30, Y - 30, 40, 30], 8, 89, '#2A1A0E', '#7A5434') + b.lines;
    // brass plaque on the plinth
    s += grp(F('M4,-15h14v8h-14Z', '#B8963E', 0.6) + L('M6,-12.6h10M6,-10h7', 0.5, '#6E5418'), swFace(t, -0.22, 0.22, 0));
    // the cup on a stem
    const gold = '#C8A040';
    const goldD = '#7A5A18';
    s += cyl(d, X, Y - 2, 7, 5, 20, 24, gold, goldD, '#E0C060').s;
    s += F(`M${f(X - 2)},${f(Y - 26)}h4v12h-4Z`, celH(d, X - 2, X + 2, gold, goldD), 0.8);
    const cup = `M${f(X - 14)},${f(Y - 54)}C${f(X - 14)},${f(Y - 34)} ${f(X - 6)},${f(Y - 30)} ${f(X)},${f(Y - 30)}C${f(X + 6)},${f(Y - 30)} ${f(X + 14)},${f(Y - 34)} ${f(X + 14)},${f(Y - 54)}Z`;
    s += F(cup, celH(d, X - 14, X + 14, gold, goldD), LW) + sheen(d, cup, X - 12, Y - 54, 10, 22, 2, 0.4, 90);
    s += L(`M${f(X - 14)},${f(Y - 48)}q-8,0 -6,8q2,4 7,2`, 2.4, INK) + L(`M${f(X - 14)},${f(Y - 48)}q-8,0 -6,8q2,4 7,2`, 1.4, gold);
    s += L(`M${f(X + 14)},${f(Y - 48)}q8,0 6,8q-2,4 -7,2`, 2.4, INK) + L(`M${f(X + 14)},${f(Y - 48)}q8,0 6,8q-2,4 -7,2`, 1.4, goldD);
    s += F(ell(X, Y - 54, 14, 14 * K), '#5A4010', LW);
    // the golden spatula planted in the cup, crusted with something
    s += L(`M${f(X + 2)},${f(Y - 54)}L${f(X + 8)},${f(Y - 82)}`, 3.6, INK) + L(`M${f(X + 2)},${f(Y - 54)}L${f(X + 8)},${f(Y - 82)}`, 2.4, gold);
    const blade = `M${f(X + 2)},${f(Y - 80)}L${f(X + 15)},${f(Y - 78)}L${f(X + 18)},${f(Y - 98)}L${f(X + 4)},${f(Y - 101)}Z`;
    s += F(blade, celH(d, X + 2, X + 18, '#E0C060', '#9A7A22'), LW);
    for (let k = 0; k < 3; k++) s += L(`M${f(X + 7 + k * 3.4)},${f(Y - 83)}l1.2,-12`, 0.8, '#6E5418');
    s += F(blob(X + 12, Y - 90, 3, 2, 91), '#5A2A14', 0, 'opacity="0.7"');
    s += glow(d, dot(X - 6, Y - 48, 2, '#FFF0B0') + dot(X + 9, Y - 96, 1.6, '#FFF0B0'), 1.2, 0.8);
    return s;
  });
}

function mummyCase(): ArtAsset {
  return objAsset('mummy_case', 156, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, -0.02, 0.36, 0.24);
    const shape = 'M6,0L26,0L30,-58L28,-84C28,-102 4,-102 4,-84L2,-58Z';
    const i0 = -0.32;
    const jf = 0.12;
    s += extrudeStack(t, shape, i0, jf, 0, 0.22, '#B8963E', '#6E5418');
    let face = F(shape, celH(d, 0, 32, '#C8A048', '#8A6A22', 0.7));
    // painted bands, the death mask (a zombie, naturally), crossed arms
    face += d.clip(shape, F('M0,-58H32V-50H0Z', '#2C6985') + F('M0,-40H32V-34H0Z', '#2C6985') + F('M0,-20H32V-14H0Z', '#2C6985') + L('M0,-54H32M0,-37H32M0,-17H32', 0.6, '#C8A048', 'stroke-dasharray="2 2"'));
    face += F('M8,-86C8,-98 24,-98 24,-86L23,-72C21,-66 11,-66 9,-72Z', SKIN_Z, 0.8);
    face += F('M4,-86C2,-96 10,-100 16,-100C22,-100 30,-96 28,-86L25,-86C24,-94 8,-94 7,-86Z', '#2C6985', 0.7) + L('M6,-88L5,-70M26,-88L27,-70', 2, '#2C6985');
    face += F(ell(12.4, -84, 2, 1.4), EYE_Z, 0.5) + F(ell(19.6, -84, 2, 1.4), EYE_Z, 0.5) + L('M10.6,-86.6l3.6,0.6M21.4,-86.6l-3.6,0.6', 0.7, INK);
    face += L('M12,-74q4,2 8,0', 0.8, INK) + dot(14, -73.6, 0.5, '#E8E2CC') + dot(18, -73.6, 0.5, '#E8E2CC');
    face += L('M7,-62L25,-50M25,-62L7,-50', 2.6, INK) + L('M7,-62L25,-50M25,-62L7,-50', 1.6, '#C8A048');
    face += d.clip(shape, scratches(d, shape, [0, -100, 32, 100], 16, '#5A4010', 92, 0.6) + F(blob(22, -24, 6, 8, 93), '#3A2A10', 0, 'opacity="0.3"'));
    face += L(shape, LW);
    s += grp(face, swFace(t, i0, jf, 0));
    // a bandaged hand poking out of the lid seam, bandage unravelling to the floor
    const [hx, hy] = t.p(i0 + 0.6, jf, 46);
    s += F(capsule([hx - 2, hy], [hx + 6, hy + 2], 4, 3.4), '#D8CCA8', 0.8) + L(`M${f(hx)},${f(hy - 1.6)}l1,3.4M${f(hx + 2.6)},${f(hy - 1.2)}l1,3.4`, 0.5, '#8A7A5A');
    for (let k = 0; k < 3; k++) s += F(capsule([hx + 6, hy + 1 + k * 1.6], [hx + 9, hy + 2 + k * 1.8], 1.4, 1.2), '#D8CCA8', 0.6);
    s += L(`M${f(hx + 2)},${f(hy + 3)}C${f(hx + 6)},${f(hy + 18)} ${f(hx - 4)},${f(hy + 26)} ${f(hx + 4)},${f(hy + 40)}`, 2.6, INK) + L(`M${f(hx + 2)},${f(hy + 3)}C${f(hx + 6)},${f(hy + 18)} ${f(hx - 4)},${f(hy + 26)} ${f(hx + 4)},${f(hy + 40)}`, 1.8, '#D8CCA8');
    s += fly(X - 20, Y - 104, 1);
    return s;
  });
}

function hogSkeleton(): ArtAsset {
  return objAsset('hog_skeleton', 104, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.46, 0.3);
    // a low plank plinth
    const b = box(t, -0.42, 0.42, -0.24, 0.24, 0, 8, '#7A5230', '#6A4528', '#4A2E18');
    s += b.fills + grain(d, b.left, [X - 50, Y - 20, 80, 20], 10, 94) + b.lines;
    const P = (i: number, z: number): Pt => t.p(i, 0, z);
    // far legs, spine, ribs, near legs, skull
    for (const i of [-0.25, 0.25]) s += boneD(P(i + 0.03, 32), t.p(i, -0.1, 8), 2.2, '#C8BE9E');
    const spine: Pt[] = [];
    for (let k = 0; k <= 10; k++) spine.push(P(-0.32 + k * 0.064, 34 + Math.sin((k / 10) * Math.PI) * 5));
    for (let k = 0; k < spine.length; k++) s += F(ell(spine[k][0], spine[k][1], 2.6, 2.2), '#D6CDAE', 0.7) + L(`M${f(spine[k][0])},${f(spine[k][1] - 2)}l0.6,-3`, 1.4, '#D6CDAE');
    for (let k = 2; k < 9; k++) {
      const [x, y] = spine[k];
      const rib = `M${f(x)},${f(y)}C${f(x - 10)},${f(y + 2)} ${f(x - 10)},${f(y + 14)} ${f(x - 2)},${f(y + 16)}`;
      s += L(rib, 2.6, INK) + L(rib, 1.6, k % 2 ? '#D6CDAE' : '#C8BE9E');
    }
    for (const i of [-0.25, 0.25]) s += boneD(P(i, 30), t.p(i - 0.02, 0.1, 8), 2.6);
    // the skull with tusks, an apple still jammed in its jaws
    const [sx, sy] = P(-0.42, 36);
    s += F(`M${f(sx + 8)},${f(sy - 6)}C${f(sx + 4)},${f(sy - 12)} ${f(sx - 8)},${f(sy - 8)} ${f(sx - 12)},${f(sy + 2)}L${f(sx - 10)},${f(sy + 6)}C${f(sx - 2)},${f(sy + 6)} ${f(sx + 6)},${f(sy + 4)} ${f(sx + 8)},${f(sy - 6)}Z`, '#D6CDAE', LW);
    s += F(ell(sx, sy - 3, 2.2, 1.8), '#1E1810') + dot(sx - 0.4, sy - 3.2, 0.6, EYE_Z);
    s += F(ell(sx - 11, sy + 4, 3.6, 3.2), '#8A2A22', 0.8) + L(`M${f(sx - 11)},${f(sy + 1)}l0.6,-2`, 0.6, '#4A3A1E');
    s += L(`M${f(sx - 6)},${f(sy + 5)}q-2,-5 1,-8`, 1.8, INK) + L(`M${f(sx - 6)},${f(sy + 5)}q-2,-5 1,-8`, 1, '#E8E2CC');
    s += L(`M${f(spine[10][0])},${f(spine[10][1])}q6,2 5,-5`, 1.4, '#D6CDAE');
    s += fly(X + 18, Y - 56, 1);
    return s;
  });
}

function grillShrine(): ArtAsset {
  return objAsset('grill_shrine', 166, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.48, 0.42);
    // stepped stone altar
    for (const [r, z0, z1, col] of [[0.46, 0, 8, '#8A887E'], [0.38, 8, 16, '#9A988E'], [0.3, 16, 40, '#7E7C72']] as [number, number, number, string][]) {
      const bx = box(t, -r, r, -r, r, z0, z1, col, '#7A786E', '#5A584E');
      s += bx.fills + boxShade(d, t, bx, -r, r, r, z0, z1, 0.3) + bx.lines;
    }
    s += grp(F('M6,-20C6,-32 22,-32 22,-20Z', '#5A584E', 0.6) + L('M14,-28v-6M11,-31h6', 1, '#C8A040'), swFace(t, -0.3, 0.3, 0));
    s += d.clip(poly([t.p(-0.3, 0.3, 16), t.p(0.3, 0.3, 16), t.p(0.3, 0.3, 40), t.p(-0.3, 0.3, 40)]), F(blob(...t.p(-0.1, 0.3, 22), 10, 6, 95), '#5E7A2A', 0, 'opacity="0.5"'));
    // crossed golden spatulas behind the fire
    for (const sgn of [-1, 1]) {
      const a: Pt = [X + sgn * 16, Y - 40];
      const b: Pt = [X - sgn * 10, Y - 94];
      s += L(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, 3, INK) + L(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, 1.8, '#C8A040');
      s += F(`M${f(b[0] - 5)},${f(b[1] + 2)}L${f(b[0] + 5)},${f(b[1] + 2)}L${f(b[0] + 6)},${f(b[1] - 12)}L${f(b[0] - 6)},${f(b[1] - 12)}Z`, '#D8B850', 0.9);
    }
    const [kx, ky] = t.p(-0.22, -0.22, 40);
    s += F(`M${f(kx - 4)},${f(ky)}C${f(kx - 4.6)},${f(ky - 8)} ${f(kx + 4.6)},${f(ky - 8)} ${f(kx + 4)},${f(ky)}L${f(kx + 2.4)},${f(ky + 2.6)}H${f(kx - 2.4)}Z`, '#D6CDAE', 0.8) + F(ell(kx - 1.6, ky - 2.4, 1.2, 1.4), '#1E1810') + F(ell(kx + 1.6, ky - 2.4, 1.2, 1.4), '#1E1810');
    // the eternal grill: a black kettle bowl full of fire
    const bowl = `M${f(X - 22)},${f(Y - 44)}C${f(X - 22)},${f(Y - 30)} ${f(X + 22)},${f(Y - 30)} ${f(X + 22)},${f(Y - 44)}Z`;
    s += F(bowl, celH(d, X - 22, X + 22, '#3A3833', '#1A1816'), LW);
    s += F(ell(X, Y - 44, 22, 22 * K), '#2A1A10', LW);
    s += glow(d, F(ell(X, Y - 50, 18, 10), '#E07A2A'), 4, 0.7);
    const fl = (x: number, y: number, h: number, w: number, lean: number) => F(`M${f(x - w)},${f(y)}C${f(x - w)},${f(y - h * 0.5)} ${f(x + lean)},${f(y - h * 0.6)} ${f(x + lean)},${f(y - h)}C${f(x + w * 0.6)},${f(y - h * 0.5)} ${f(x + w)},${f(y - h * 0.4)} ${f(x + w)},${f(y)}Z`, '#C2552A', 0.6) + F(`M${f(x - w * 0.5)},${f(y)}C${f(x - w * 0.5)},${f(y - h * 0.4)} ${f(x + lean * 0.5)},${f(y - h * 0.4)} ${f(x + lean * 0.5)},${f(y - h * 0.65)}C${f(x + w * 0.3)},${f(y - h * 0.3)} ${f(x + w * 0.5)},${f(y - h * 0.3)} ${f(x + w * 0.5)},${f(y)}Z`, '#EBC452', 0);
    s += fl(X - 10, Y - 44, 20, 5, -3) + fl(X + 9, Y - 44, 22, 5, 3) + fl(X, Y - 42, 34, 6, 0);
    for (let k = -3; k <= 3; k++) s += L(`M${f(X - 20)},${f(Y - 46 + k * 2.6)}L${f(X + 20)},${f(Y - 46 + k * 2.6)}`, 0.6, '#1A1814', 'opacity="0.7"');
    // candles and skulls round the rim of the altar
    for (const [i, j, h] of [[-0.24, 0.22, 10], [0.22, 0.24, 7], [0.24, -0.2, 9]] as number[][]) {
      const [x, y] = t.p(i, j, 40);
      s += F(`M${f(x - 1.6)},${f(y)}V${f(y - h)}H${f(x + 1.6)}V${f(y)}Z`, '#D8D2BC', 0.6) + F(`M${f(x - 1.6)},${f(y - h)}q0.6,3 0.4,5q-0.4,-2 -0.4,-5Z`, '#D8D2BC', 0.3);
      s += glow(d, F(ell(x, y - h - 2.6, 2.6, 3.4), '#FFB040'), 1.2, 0.7) + F(ell(x, y - h - 2.4, 1, 2), '#EBC452', 0.3);
    }
    return s;
  });
}

// ---------------------------------------------------------------- export
export function buildDecor(): ArtAsset[] {
  return [
    plantDead(),
    plantPotted(),
    plantTree(),
    cactus(),
    ...tombDeco1(),
    tombDeco2(),
    tombDeco3(),
    gnome(),
    flamingo(),
    skeletonStatue(),
    barrelStack(),
    hayBale(),
    pumpkinPile(),
    coffinUpright(),
    slimeFountain(),
    lampFloor(),
    aquarium(),
    cauldron(),
    pigSpit(),
    brainJar(),
    chainsawStump(),
    trophySpatula(),
    mummyCase(),
    hogSkeleton(),
    grillShrine(),
  ];
}

