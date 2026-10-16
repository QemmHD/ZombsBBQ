/**
 * The café shell: back walls, floors, the door, windows, grime and critters.
 *
 * WALLS are drawn per tile edge, (HW + 2) x (WALL_H + HH + 6) with anchor (0.5, 1) at the bottom-centre:
 *   wall_r_* sits on a back-row tile's upper-RIGHT edge (the north-east wall). Place it at
 *     (tileCenterX + TILE_W / 4, tileCenterY), origin (0.5, 1).
 *   wall_l_* sits on a back-column tile's upper-LEFT edge (the north-west wall). Place it at
 *     (tileCenterX - TILE_W / 4, tileCenterY), origin (0.5, 1).
 * Overlays (door_*, window_*, wall hangings) use exactly the same box and anchor.
 *
 * Wall finishes: dirty (the starting café: stained cream plaster, every segment slightly different via
 *   _1.._4), plaster (clean cream), brick, wood (stained planks), tile (diner subway tile), stone (crypt).
 * FLOORS are ground-tile sized (anchor .5/.5): floor_<finish>_a / _b (two variants for a little variety):
 *   dirty, tile, checker, wood, stone. Decals (same box): stain_1..4, floorcrack_1..2.
 * CRITTERS: rat (24x14, anchor .5/.9), roach (10x8, anchor .5/.8) — the scene scurries them around.
 */
import type { ArtAsset } from '../art/types';
import type { Doc } from '../art/svg';
import { f, poly } from '../art/svg';
import type { Pt } from '../art/svg';
import { F, HH, HW, INK, Iso, L, LW, PAL, TILE_H, TILE_W, WALL_H, asset, blob, crack, dot, op, rnd, speckle } from './kit';

// ---------------------------------------------------------------- wall frames
const WW = HW + 2;
const WH = WALL_H + HH + 6;
/** Wall face corners in image space for each side. u: 0..1 along the wall (left→right on screen), v: 0..1 up. */
type Side = 'l' | 'r';
function wp(side: Side, u: number, v: number): Pt {
  // bottom edge: l rises left→right, r falls left→right
  const x = 1 + u * HW;
  const yBottom = side === 'l' ? WH - u * HH : WH - HH + u * HH;
  return [x, yBottom - v * WALL_H];
}
function wquad(side: Side, u0: number, u1: number, v0: number, v1: number): string {
  return poly([wp(side, u0, v0), wp(side, u1, v0), wp(side, u1, v1), wp(side, u0, v1)]);
}
const FACE = (s: Side) => wquad(s, 0, 1, 0, 1);
const BOXW: [number, number, number, number] = [0, 0, WW, WH];

function wallAsset(key: string, body: (d: Doc) => string): ArtAsset {
  return asset(key, WW, WH, 0.5, 1, body);
}

/** Wall top cap + outline so the wall reads as a solid slab. */
function cap(side: Side, col: string): string {
  const top = poly([wp(side, 0, 1), wp(side, 1, 1), [wp(side, 1, 1)[0], wp(side, 1, 1)[1] - 4], [wp(side, 0, 1)[0], wp(side, 0, 1)[1] - 4]]);
  return F(top, col, 0) + L(`M${wp(side, 0, 1).map(f).join(',')}L${wp(side, 1, 1).map(f).join(',')}`, 0.6, INK, 'opacity="0.55"');
}

/** Light: the left (NW) wall faces the light, the right (NE) wall is a shade darker. */
function shadeFor(side: Side, d: Doc): string {
  const a = wp(side, 0, 0);
  const b = wp(side, 0, 1);
  return F(FACE(side), d.linear(a[0], a[1], b[0], b[1], [[0, '#000', side === 'r' ? 0.22 : 0.14], [0.35, '#000', side === 'r' ? 0.1 : 0.04], [1, '#fff', 0.06]]));
}

function baseboard(side: Side, col: string, colD: string): string {
  return F(wquad(side, 0, 1, 0, 0.055), col) + L(`M${wp(side, 0, 0.055).map(f).join(',')}L${wp(side, 1, 0.055).map(f).join(',')}`, 0.8, colD);
}

// ---- finishes
function plaster(side: Side, d: Doc, seed: number, dirty: boolean): string {
  const r = rnd(seed);
  let s = F(FACE(side), PAL.plaster);
  // mottled plaster
  let m = '';
  for (let k = 0; k < 14; k++) {
    const [x, y] = wp(side, r(), 0.1 + r() * 0.85);
    const rr = 5 + r() * 9;
    m += F(blob(x, y, rr * (1.1 + r() * 0.5), rr, seed * 11 + k), k % 3 ? PAL.plasterD : PAL.plasterHi, 0, `opacity="${f(0.12 + r() * 0.14)}"`);
  }
  s += d.clip(FACE(side), m);
  s += speckle(d, FACE(side), BOXW, 90, ['#C9BA5C', '#F7F0B8', '#B8AA55'], seed * 3, 0.3, 0.7, 0.6);
  if (dirty) {
    // a grimy band up from the floor where mops never reached
    const a = wp(side, 0, 0);
    const b = wp(side, 0, 0.25);
    s += d.clip(FACE(side), F(FACE(side), d.linear(a[0], a[1], b[0], b[1], [[0, PAL.grimeD, 0.55], [1, PAL.grimeD, 0]])));
  }
  s += shadeFor(side, d);
  s += baseboard(side, dirty ? '#7A6A3E' : '#8C7B4A', '#4E4226');
  return s;
}

function brick(side: Side, d: Doc, seed: number): string {
  const r = rnd(seed);
  let s = F(FACE(side), PAL.mortar);
  let b = '';
  const rows = 22;
  for (let row = 0; row < rows; row++) {
    const v0 = 0.06 + (row / rows) * 0.94;
    const v1 = v0 + 0.94 / rows - 0.008;
    const off = row % 2 ? 0.125 : 0;
    for (let u = -off; u < 1; u += 0.25) {
      const u0 = Math.max(0, u + 0.008);
      const u1 = Math.min(1, u + 0.25 - 0.008);
      if (u1 <= u0) continue;
      const tone = [PAL.brick, '#8C4226', '#A5552F', PAL.brickD, '#94492B'][Math.floor(r() * 5)];
      b += F(wquad(side, u0, u1, v0, v1), tone);
      b += L(`M${wp(side, u0, v1).map(f).join(',')}L${wp(side, u1, v1).map(f).join(',')}`, 0.5, '#C47A52', 'opacity="0.5"');
    }
  }
  s += d.clip(FACE(side), b);
  s += speckle(d, FACE(side), BOXW, 70, ['#5E2A16', '#B8714A'], seed * 5, 0.3, 0.6, 0.6);
  s += shadeFor(side, d);
  s += baseboard(side, '#5A3A22', '#2E1C10');
  return s;
}

function wood(side: Side, d: Doc, seed: number): string {
  const r = rnd(seed);
  let s = F(FACE(side), PAL.wood);
  let p = '';
  const planks = 6;
  for (let k = 0; k < planks; k++) {
    const u0 = k / planks;
    const u1 = (k + 1) / planks;
    const tone = [PAL.wood, '#7F5730', '#996B3B', '#84592F'][k % 4];
    p += F(wquad(side, u0, u1, 0, 1), tone);
    p += L(`M${wp(side, u1, 0).map(f).join(',')}L${wp(side, u1, 1).map(f).join(',')}`, 0.9, PAL.woodD);
    // grain
    for (let g = 0; g < 5; g++) {
      const uu = u0 + 0.15 / planks + r() * 0.7 / planks;
      const v0 = r() * 0.8;
      p += L(`M${wp(side, uu, v0).map(f).join(',')}L${wp(side, uu + (r() - 0.5) * 0.02, v0 + 0.15 + r() * 0.2).map(f).join(',')}`, 0.45, g % 2 ? '#5C3B1E' : '#B08452', 'opacity="0.7"');
    }
    // nails
    for (const v of [0.12, 0.5, 0.88]) {
      const [x, y] = wp(side, (u0 + u1) / 2, v);
      p += dot(x, y, 0.7, '#3A2A1A');
    }
  }
  s += d.clip(FACE(side), p);
  s += shadeFor(side, d);
  s += baseboard(side, '#4A2F18', '#24160A');
  return s;
}

function subwayTile(side: Side, d: Doc): string {
  let s = F(FACE(side), '#E9E6DA');
  let t = '';
  const rows = 26;
  for (let row = 0; row < rows; row++) {
    const v = row / rows;
    t += L(`M${wp(side, 0, v).map(f).join(',')}L${wp(side, 1, v).map(f).join(',')}`, 0.45, '#A9A597');
    const off = row % 2 ? 0.0833 : 0;
    for (let u = off; u < 1; u += 0.1667) t += L(`M${wp(side, u, v).map(f).join(',')}L${wp(side, u, v + 1 / rows).map(f).join(',')}`, 0.45, '#A9A597');
  }
  s += d.clip(FACE(side), t);
  // teal wainscot band with a chrome rail
  s += F(wquad(side, 0, 1, 0, 0.36), '#2F6F78');
  s += F(wquad(side, 0, 1, 0.36, 0.385), '#C9CFD3') + L(`M${wp(side, 0, 0.385).map(f).join(',')}L${wp(side, 1, 0.385).map(f).join(',')}`, 0.5, '#7C858A');
  s += shadeFor(side, d);
  s += baseboard(side, '#1F4E55', '#0F2A2E');
  return s;
}

function stone(side: Side, d: Doc, seed: number): string {
  const r = rnd(seed);
  let s = F(FACE(side), '#7C7A72');
  let b = '';
  const rows = 9;
  for (let row = 0; row < rows; row++) {
    const v0 = row / rows;
    const v1 = (row + 1) / rows - 0.01;
    let u = row % 2 ? -0.18 : 0;
    while (u < 1) {
      const w = 0.28 + r() * 0.16;
      const u0 = Math.max(0, u + 0.01);
      const u1 = Math.min(1, u + w - 0.01);
      if (u1 > u0) b += F(wquad(side, u0, u1, v0, v1), ['#8A877E', '#75736B', '#96938A', '#6C6A62'][Math.floor(r() * 4)], 0.5);
      u += w;
    }
  }
  s += d.clip(FACE(side), b);
  // moss creeping up from the bottom
  let moss = '';
  for (let k = 0; k < 5; k++) {
    const [x, y] = wp(side, r(), r() * 0.2);
    moss += F(blob(x, y, 6 + r() * 6, 4 + r() * 6, seed + k), '#4F6A22', 0, 'opacity="0.6"');
  }
  s += d.clip(FACE(side), moss);
  s += shadeFor(side, d);
  return s;
}

// ---- grime for the dirty starting café (each variant gets a different mess)
function grime(side: Side, d: Doc, variant: number): string {
  const r = rnd(variant * 101 + (side === 'l' ? 7 : 13));
  let s = '';
  if (variant === 1) {
    // green slime oozing from the top
    const [x, y] = wp(side, 0.45, 0.96);
    let drips = F(blob(x, y + 4, 9, 5, 3), PAL.slime, 0.6);
    for (let k = 0; k < 4; k++) {
      const dx = (k - 1.5) * 4 + r() * 2;
      const len = 14 + r() * 40;
      drips += F(`M${f(x + dx - 1.4)},${f(y + 4)}L${f(x + dx - 1)},${f(y + 4 + len)}Q${f(x + dx)},${f(y + 7 + len)} ${f(x + dx + 1)},${f(y + 4 + len)}L${f(x + dx + 1.4)},${f(y + 4)}Z`, PAL.slime, 0.5);
      drips += dot(x + dx, y + 6 + len, 1.6, PAL.slime) + dot(x + dx - 0.4, y + 5 + len, 0.5, '#B6D86A');
    }
    s += drips + L(`M${f(x - 6)},${f(y + 2)}Q${f(x)},${f(y)} ${f(x + 6)},${f(y + 3)}`, 0.7, '#B6D86A', 'opacity="0.8"');
  } else if (variant === 2) {
    // a jagged crack running down from the corner
    const [x, y] = wp(side, 0.7, 0.9);
    s += crack(x, y, Math.PI / 2 + (side === 'l' ? 0.15 : -0.15), 90, variant * 9, 0.9, '#2A2416', 2);
    s += crack(x + 2, y + 30, Math.PI / 2, 40, variant * 9 + 3, 0.6, '#2A2416', 1);
  } else if (variant === 3) {
    // three claw gouges
    for (let k = 0; k < 3; k++) {
      const [x, y] = wp(side, 0.25 + k * 0.12, 0.62 - k * 0.03);
      const g = `M${f(x)},${f(y)}Q${f(x + 6)},${f(y + 10)} ${f(x + 10)},${f(y + 22)}Q${f(x + 4)},${f(y + 12)} ${f(x)},${f(y)}Z`;
      s += F(g, '#5E5124', 0.6) + L(`M${f(x + 1)},${f(y + 2)}Q${f(x + 6)},${f(y + 11)} ${f(x + 9)},${f(y + 20)}`, 0.5, '#FFF6C0', 'opacity="0.6"');
    }
  } else {
    // a dried smear at the base + spatter
    const [x, y] = wp(side, 0.5, 0.12);
    s += F(blob(x, y, 14, 9, 77), PAL.blood, 0, 'opacity="0.55"');
    s += F(blob(x - 4, y + 8, 18, 5, 78), PAL.grime, 0, 'opacity="0.5"');
    for (let k = 0; k < 9; k++) s += dot(x + (r() - 0.5) * 34, y - 10 - r() * 30, 0.5 + r() * 1.1, PAL.blood, 0.6);
    // a hand print
    s += F(blob(x + 9, y - 26, 3.2, 3.6, 79), PAL.blood, 0, 'opacity="0.45"');
    for (let k = 0; k < 4; k++) s += F(blob(x + 6 + k * 2, y - 33 - (k % 2), 0.8, 2.6, 80 + k), PAL.blood, 0, 'opacity="0.45"');
  }
  return d.clip(FACE(side), s);
}

function wallSet(out: ArtAsset[], finish: string, painter: (side: Side, d: Doc, seed: number) => string, capCol: string) {
  for (const side of ['l', 'r'] as Side[]) {
    out.push(wallAsset(`wall_${side}_${finish}`, (d) => painter(side, d, side === 'l' ? 3 : 5) + cap(side, capCol)));
  }
}

// ---------------------------------------------------------------- door + window overlays
function door(side: Side, open: boolean) {
  return (d: Doc) => {
    const u0 = 0.18;
    const u1 = 0.86;
    const v1 = 0.56;
    // frame
    let s = F(wquad(side, u0 - 0.06, u1 + 0.06, 0, v1 + 0.035), '#5A4128', LW);
    const hole = wquad(side, u0, u1, 0, v1);
    if (open) {
      s += F(hole, '#1A1712');
      // a glimpse of the sidewalk light at the bottom
      s += d.clip(hole, F(wquad(side, u0, u1, 0, 0.08), '#57564F', 0, 'opacity="0.8"'));
      // the door swung against the outside: just its edge visible
      s += F(wquad(side, u0, u0 + 0.07, 0, v1), '#6E5434', LW);
    } else {
      s += F(hole, '#7B5D3A', LW);
      // panels + a little window
      s += F(wquad(side, u0 + 0.1, u1 - 0.1, 0.08, 0.24), '#6B4F30', 0.6);
      s += F(wquad(side, u0 + 0.12, u1 - 0.12, 0.33, 0.49), '#3E4A4C', 0.7);
      s += d.clip(wquad(side, u0 + 0.12, u1 - 0.12, 0.33, 0.49), L(`M${wp(side, u0 + 0.14, 0.36).map(f).join(',')}L${wp(side, u0 + 0.3, 0.47).map(f).join(',')}`, 1.4, '#9DB3B6', 'opacity="0.6"'));
      // brass knob + kick plate scuffs
      const [kx, ky] = wp(side, side === 'r' ? u1 - 0.09 : u0 + 0.09, 0.27);
      s += dot(kx, ky, 1.4, '#B08A3A') + dot(kx - 0.4, ky - 0.4, 0.5, '#F0D68A');
      s += d.clip(hole, F(blob(...wp(side, (u0 + u1) / 2, 0.03), 12, 4, 31), PAL.grimeD, 0, 'opacity="0.45"'));
    }
    return s;
  };
}

function boardedWindow(side: Side) {
  return (d: Doc) => {
    const q = wquad(side, 0.14, 0.86, 0.42, 0.74);
    let s = F(wquad(side, 0.1, 0.9, 0.39, 0.77), '#6B6A62', LW); // sill + frame
    s += F(q, '#20221F');
    // broken glass shards in the corners
    s += d.clip(q, F(poly([wp(side, 0.14, 0.74), wp(side, 0.3, 0.74), wp(side, 0.14, 0.62)]), '#7F9699', 0.4) + F(poly([wp(side, 0.86, 0.42), wp(side, 0.7, 0.42), wp(side, 0.86, 0.5)]), '#7F9699', 0.4));
    // three crooked planks nailed across
    const planks: [number, number, number][] = [
      [0.47, 0.03, 0.62],
      [0.58, -0.04, 0.7],
      [0.68, 0.05, 0.55],
    ];
    for (const [v, tilt] of planks) {
      const a = wp(side, 0.08, v - tilt);
      const b = wp(side, 0.92, v + tilt);
      const n = 4.2;
      const pl = poly([
        [a[0], a[1] - n],
        [b[0], b[1] - n],
        [b[0], b[1] + n],
        [a[0], a[1] + n],
      ]);
      s += F(pl, '#8E6A3E', 0.8) + L(`M${f(a[0] + 2)},${f(a[1] - 1)}L${f(b[0] - 2)},${f(b[1] - 1)}`, 0.5, '#5C4022', 'opacity="0.7"');
      s += dot(a[0] + 3, a[1], 0.7, '#2A2016') + dot(b[0] - 3, b[1], 0.7, '#2A2016');
    }
    return s;
  };
}

function smallWindow(side: Side) {
  return (d: Doc) => {
    const q = wquad(side, 0.18, 0.82, 0.45, 0.74);
    let s = F(wquad(side, 0.14, 0.86, 0.42, 0.77), '#E3DCC0', LW);
    s += F(q, d.linear(...wp(side, 0.2, 0.74), ...wp(side, 0.8, 0.45), [[0, '#9CB7BC'], [1, '#5E7A80']]) as string);
    s += L(`M${wp(side, 0.5, 0.45).map(f).join(',')}L${wp(side, 0.5, 0.74).map(f).join(',')}`, 1, '#E3DCC0');
    s += L(`M${wp(side, 0.18, 0.595).map(f).join(',')}L${wp(side, 0.82, 0.595).map(f).join(',')}`, 1, '#E3DCC0');
    s += d.clip(q, L(`M${wp(side, 0.22, 0.5).map(f).join(',')}L${wp(side, 0.4, 0.7).map(f).join(',')}`, 2, '#FFFFFF', 'opacity="0.35"'));
    return s;
  };
}

// ---------------------------------------------------------------- floors
const FW = TILE_W + 2;
const FH = TILE_H + 2;
const ft = new Iso(FW / 2, FH / 2);
const FDIA = ft.qd(-0.512, 0.512, -0.512, 0.512);
const FBOX: [number, number, number, number] = [0, 0, FW, FH];
function floorAsset(key: string, body: (d: Doc) => string): ArtAsset {
  return asset(key, FW, FH, 0.5, 0.5, body);
}

function tiles2x2(d: Doc, seed: number, a: string, b: string, grout: string, chips: boolean): string {
  const r = rnd(seed);
  let s = F(FDIA, grout);
  const g = 0.02;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      const q = ft.qd(-0.5 + i * 0.5 + g, -0.5 + (i + 1) * 0.5 - g, -0.5 + j * 0.5 + g, -0.5 + (j + 1) * 0.5 - g);
      const tone = (i + j) % 2 ? a : b;
      s += F(q, tone);
      // tiny highlight on the upper edges of each tile
      s += L(poly(ft.quad(-0.5 + i * 0.5 + g, -0.5 + (i + 1) * 0.5 - g, -0.5 + j * 0.5 + g, -0.5 + j * 0.5 + g + 0.001)).replace('Z', ''), 0.5, '#F2F2EE', 'opacity="0.7"');
      if (chips && r() > 0.6) {
        const [x, y] = ft.p(-0.5 + i * 0.5 + 0.1 + r() * 0.3, -0.5 + j * 0.5 + 0.1 + r() * 0.3);
        s += crack(x, y, r() * 6, 7 + r() * 6, seed * 13 + i * 2 + j, 0.45, '#6E6E68', 0);
      }
    }
  s += speckle(d, FDIA, FBOX, 40, ['#B8B8B2', '#E4E4DF'], seed * 3, 0.3, 0.6, 0.7);
  return s;
}

function checker(d: Doc, phase: number): string {
  let s = '';
  const n = 2;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const q = ft.qd(-0.512 + i * 0.512, -0.512 + (i + 1) * 0.512, -0.512 + j * 0.512, -0.512 + (j + 1) * 0.512);
      s += F(q, (i + j + phase) % 2 ? '#E2DFD3' : '#2C2B2A');
    }
  s += speckle(d, FDIA, FBOX, 30, ['#8E8C84', '#555451'], 5 + phase, 0.3, 0.6, 0.5);
  return s;
}

function planks(d: Doc, seed: number): string {
  const r = rnd(seed);
  let s = F(FDIA, '#5E3E22');
  const rows = 4;
  for (let k = 0; k < rows; k++) {
    const j0 = -0.512 + (k * 1.024) / rows;
    const j1 = j0 + 1.024 / rows - 0.012;
    s += F(ft.qd(-0.512, 0.512, j0, j1), ['#7A5230', '#6E4828', '#835936', '#734C2B'][(k + seed) % 4]);
    for (let g = 0; g < 4; g++) {
      const jj = j0 + 0.03 + r() * (j1 - j0 - 0.06);
      const i0 = -0.5 + r() * 0.6;
      s += ft.line([i0, jj], [i0 + 0.15 + r() * 0.3, jj], 0.45, g % 2 ? '#4E321A' : '#9A6C42', 'opacity="0.7"');
    }
    const seam = -0.4 + r() * 0.8;
    s += ft.line([seam, j0], [seam, j1], 0.8, '#3A2412');
  }
  return s;
}

function flagstone(d: Doc, seed: number): string {
  const r = rnd(seed);
  let s = F(FDIA, '#4E4C45');
  const cells: [number, number, number, number][] = [
    [-0.5, 0.02, -0.5, -0.05],
    [0.02, 0.5, -0.5, 0.1],
    [-0.5, -0.1, -0.05, 0.5],
    [-0.1, 0.5, 0.1, 0.5],
  ];
  for (const [i0, i1, j0, j1] of cells) s += F(ft.qd(i0 + 0.02, i1 - 0.02, j0 + 0.02, j1 - 0.02), ['#76746B', '#6A685F', '#807E74', '#706E65'][Math.floor(r() * 4)], 0.5);
  s += speckle(d, FDIA, FBOX, 50, ['#5A5850', '#9A988D', '#4F6A22'], seed * 7, 0.3, 0.7, 0.6);
  return s;
}

function stain(n: number) {
  return (d: Doc) => {
    const r = rnd(n * 37);
    const cx = FW / 2 + (r() - 0.5) * 20;
    const cy = FH / 2 + (r() - 0.5) * 10;
    const col = [PAL.grime, '#7A5A5A', '#6E7A3A', '#5A4A3A'][n - 1];
    let s = F(blob(cx, cy, 16 + r() * 8, 7 + r() * 3, n * 3), col, 0, 'opacity="0.42"');
    s += F(blob(cx + 4, cy + 1, 7, 3, n * 3 + 1), col, 0, 'opacity="0.35"');
    for (let k = 0; k < 6; k++) s += dot(cx + (r() - 0.5) * 40, cy + (r() - 0.5) * 18, 0.6 + r(), col, 0.45);
    return d.clip(FDIA, s);
  };
}

// ---------------------------------------------------------------- critters
function rat(): ArtAsset {
  return asset('rat', 26, 15, 0.5, 0.9, () => {
    let s = F(blob(13, 13.5, 9, 1.6, 2), '#000', 0, 'opacity="0.2"');
    s += L('M4,10.5Q-1,9 1.5,5', 1.1, '#9C7E78'); // tail
    s += F('M4,10C4,6 8,4 12,4.5C16,4.8 19,6.5 21,8.6L24,9.5L21,11.2C19,12.5 15,13 11,12.8C7,12.6 4,12 4,10Z', '#6E6660', 0.9);
    s += L('M9,6.2C11,5.2 15,5.3 17.5,6.6', 0.6, '#8E8780');
    s += F(blob(15.5, 5.6, 2.2, 2.2, 3), '#857B76', 0.7) + F(blob(15.5, 5.8, 1.1, 1.1, 4), '#C99A98'); // ear
    s += dot(20, 8.6, 0.8, INK) + dot(24.2, 9.6, 0.8, '#C99A98');
    s += L('M23,9L26,7.6M23,9.6L26,10.2', 0.3, '#3A3430');
    s += L('M8,12.6L7.5,14M14,12.9L14.4,14.2', 0.8, '#4A4440');
    return s;
  });
}

function roach(): ArtAsset {
  return asset('roach', 10, 8, 0.5, 0.8, () => {
    let s = F('M2,4.5C2,2.5 4,1.5 6,1.8C8,2.1 9,3.4 9,4.6C9,5.8 7.6,6.6 5.6,6.6C3.6,6.6 2,5.9 2,4.5Z', '#4A2A16', 0.5);
    s += L('M5.4,2L5.6,6.4', 0.35, '#2A160A');
    s += L('M2.5,3.4L0.5,2.6M2.5,5.4L0.6,6.4M8.6,3.6L9.8,1M8.6,5.2L9.9,6.6M4,6.5L3.6,7.8M7,6.5L7.4,7.8', 0.35, INK);
    return s;
  });
}

export function buildRoom(): ArtAsset[] {
  const out: ArtAsset[] = [];
  // the starting café: four differently-dirty plaster segments per side
  for (const side of ['l', 'r'] as Side[])
    for (let v = 1; v <= 4; v++) out.push(wallAsset(`wall_${side}_dirty_${v}`, (d) => plaster(side, d, v * 7 + (side === 'l' ? 1 : 2), true) + grime(side, d, v) + cap(side, '#BFB15A')));
  wallSet(out, 'plaster', (s, d, seed) => plaster(s, d, seed, false), '#D8CC74');
  wallSet(out, 'brick', brick, '#8A7F6A');
  wallSet(out, 'wood', wood, '#4A2F18');
  wallSet(out, 'tile', (s, d) => subwayTile(s, d), '#C9C5B7');
  wallSet(out, 'stone', stone, '#5E5C55');
  for (const side of ['l', 'r'] as Side[]) {
    out.push(wallAsset(`door_${side}_closed`, door(side, false)));
    out.push(wallAsset(`door_${side}_open`, door(side, true)));
    out.push(wallAsset(`window_boarded_${side}`, boardedWindow(side)));
    out.push(wallAsset(`window_small_${side}`, smallWindow(side)));
  }
  // floors
  out.push(floorAsset('floor_dirty_a', (d) => tiles2x2(d, 1, PAL.tile, PAL.tileB, PAL.grout, true)));
  out.push(floorAsset('floor_dirty_b', (d) => tiles2x2(d, 2, PAL.tileB, PAL.tile, PAL.grout, true)));
  out.push(floorAsset('floor_tile_a', (d) => tiles2x2(d, 3, '#D9D9D4', '#E6E6E1', '#9A9A93', false)));
  out.push(floorAsset('floor_tile_b', (d) => tiles2x2(d, 4, '#E6E6E1', '#D9D9D4', '#9A9A93', false)));
  out.push(floorAsset('floor_checker_a', (d) => checker(d, 0)));
  out.push(floorAsset('floor_checker_b', (d) => checker(d, 1)));
  out.push(floorAsset('floor_wood_a', (d) => planks(d, 1)));
  out.push(floorAsset('floor_wood_b', (d) => planks(d, 2)));
  out.push(floorAsset('floor_stone_a', (d) => flagstone(d, 1)));
  out.push(floorAsset('floor_stone_b', (d) => flagstone(d, 2)));
  for (let n = 1; n <= 4; n++) out.push(floorAsset(`stain_${n}`, stain(n)));
  out.push(floorAsset('floorcrack_1', (d) => d.clip(FDIA, crack(FW / 2 - 20, FH / 2 - 4, 0.3, 36, 61, 0.6, '#55554F', 2))));
  out.push(floorAsset('floorcrack_2', (d) => d.clip(FDIA, crack(FW / 2 + 10, FH / 2 - 8, 2.4, 30, 62, 0.6, '#55554F', 1))));
  out.push(rat(), roach());
  void op;
  return out;
}
