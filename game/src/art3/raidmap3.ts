/**
 * Raid road-trip map, art v3: a stained, folded paper road map of a ruined small town (Dregs County),
 * the building pins that stand on it, two pin overlays, and the shopfront signs hung on a rival café's wall.
 *
 * KEYS
 *   map_bg            1600 x 900, anchor (0, 0). Our café's lot is on the LEFT; the rival lots are strung
 *                     along a winding road to the RIGHT, the boss lot last. Nothing busy is drawn in the pin
 *                     boxes (x ± 80, y - 172 .. y + 16 around each MAP3_LAYOUT point) so pins and labels sit clean.
 *   map_home, map_joint_<chuck|hank|vera|crunch|snob|sushi|taco|lab|clown|boss>
 *                     150 x 130, anchor (0.5, 1): the bottom-centre point stands on the MAP3_LAYOUT spot.
 *   map_closed        150 x 130, anchor (0.5, 1): boards + "CLOSED · NEW MANAGEMENT SOON", placed over a pin.
 *   map_steal         48 x 48, anchor (0.5, 1): "this rival is stealing your customers" badge.
 *   rsign_<chuck|hank|vera|crunch|snob|sushi|taco|lab|clown|boss>
 *                     100 x 124 shopfront sign for the north-east ('r') wall, see RSIGN_META below.
 */
import type { ArtAsset } from '../art/types';
import type { Doc, Pt } from '../art/svg';
import { ell, f, pline, poly } from '../art/svg';
import { F, INK, Iso, L, asset, blob, crack, dot, rnd, speckle } from './kit';
import { K, bite, box, boxShade, cyl, dk, extrudeStack, fly, grain, grp, lettering, lt, masked, mix, mtx, rust, rustDrip, scratches, seFace, swFace, textD } from './p2kit';

export const MAP3_W = 1600;
export const MAP3_H = 900;
export type Map3Spot = 'home' | 'chuck' | 'hank' | 'vera' | 'crunch' | 'snob' | 'sushi' | 'taco' | 'lab' | 'clown' | 'boss';

/**
 * Bottom-centre point of each pin, in map_bg pixels. Labels go above the pin (pin is 130 tall). The road
 * zig-zags between two rows so all nine joints, home and the boss lot fit with room for labels.
 */
export const MAP3_LAYOUT: Readonly<Record<Map3Spot, { x: number; y: number }>> = {
  home: { x: 120, y: 690 },
  chuck: { x: 255, y: 450 },
  hank: { x: 390, y: 700 },
  vera: { x: 525, y: 450 },
  crunch: { x: 660, y: 700 },
  snob: { x: 795, y: 450 },
  sushi: { x: 930, y: 700 },
  taco: { x: 1065, y: 450 },
  lab: { x: 1200, y: 700 },
  clown: { x: 1335, y: 450 },
  boss: { x: 1470, y: 700 },
};
const ORDER: Map3Spot[] = ['home', 'chuck', 'hank', 'vera', 'crunch', 'snob', 'sushi', 'taco', 'lab', 'clown', 'boss'];

/**
 * Rival shopfront signs (rsign_<id>) lie in the plane of the north-east ('r') wall and span TWO wall
 * segments: `run` px to the right and `drop` px down along the wall. Frame 100 x 124.
 * ANCHOR (ox, oy) = (4/100, 58/124): the bottom-left corner of the sign's span, on the wall plane, i.e. the
 * left end of its lower edge. To mount: put the anchor on the wall point at the sign's bottom height z on the
 * left edge of the first of the two segments. With r-wall segment i anchored (bottom-centre) at
 * (i*48 + 24, i*30), the wall base of segment i starts at (i*48, i*30 - 30), so a sign over segments i, i+1
 * with its lower edge at height z goes at (i*48, i*30 - 30 - z). The board is about 44-48 tall and stands
 * ~3 px off the wall on brackets; ornaments (flames, bulbs, leaves) may poke a little above.
 */
export const RSIGN_META = { run: 96, drop: 60 } as const;

const fp = (p: Pt) => `${f(p[0])},${f(p[1])}`;
const rect = (x0: number, y0: number, x1: number, y1: number) => `M${f(x0)},${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;

// ============================================================================ geometry helpers
/** Smooth curve through control points (chord-scaled Catmull-Rom), sampled about every 5 px. */
function spline(ctl: Pt[]): Pt[] {
  const m = ctl.length;
  const tan = ctl.map((_, i) => {
    const a = ctl[Math.max(0, i - 1)];
    const b = ctl[Math.min(m - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l] as Pt;
  });
  const out: Pt[] = [];
  for (let i = 0; i < m - 1; i++) {
    const p0 = ctl[i];
    const p1 = ctl[i + 1];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const c1: Pt = [p0[0] + (tan[i][0] * len) / 3, p0[1] + (tan[i][1] * len) / 3];
    const c2: Pt = [p1[0] - (tan[i + 1][0] * len) / 3, p1[1] - (tan[i + 1][1] * len) / 3];
    const n = Math.max(3, Math.ceil(len / 5));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
      ]);
    }
  }
  out.push(ctl[m - 1]);
  return out;
}
function distTo(p: Pt, line: Pt[]): number {
  let best = Infinity;
  for (let k = 0; k < line.length - 1; k++) {
    const [ax, ay] = line[k];
    const [bx, by] = line[k + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2));
    best = Math.min(best, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy));
  }
  return best;
}
function nearestIdx(p: Pt, line: Pt[]): number {
  let bi = 0;
  let bd = Infinity;
  line.forEach((q, i) => {
    const dd = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (dd < bd) {
      bd = dd;
      bi = i;
    }
  });
  return bi;
}
function inPin(x: number, y: number, pad = 0): boolean {
  for (const k of ORDER) {
    const p = MAP3_LAYOUT[k];
    if (Math.abs(x - p.x) < 80 + pad && y > p.y - 172 - pad && y < p.y + 16 + pad) return true;
  }
  return false;
}

function roadCtl(): Pt[] {
  const pts: Pt[] = [
    [-40, 772],
    [42, 718],
  ];
  for (const k of ORDER) {
    const { x, y } = MAP3_LAYOUT[k];
    pts.push([x - 60, y + 40], [x, y + 36], [x + 60, y + 40]);
  }
  pts.push([1582, 772], [1650, 800]);
  return pts;
}
const CREEK: Pt[] = [
  [705, -12],
  [690, 90],
  [712, 200],
  [698, 330],
  [714, 470],
  [704, 600],
  [720, 720],
  [700, 820],
  [712, 912],
];
const STREETS: Pt[][] = [
  [
    [-12, 238],
    [300, 228],
    [700, 236],
    [1100, 230],
    [1612, 238],
  ],
  [
    [560, -12],
    [562, 232],
  ],
  [
    [880, -12],
    [878, 232],
  ],
  [
    [1145, 232],
    [1148, 420],
    [1150, 610],
  ],
  [
    [140, 236],
    [146, 300],
  ],
  [
    [1488, 236],
    [1486, 410],
  ],
];

// ============================================================================ small map pieces
const BURN = ['#8E3A1E', '#BE6A2C', '#D9A64A'];
function tongue(x: number, y: number, w: number, h: number, lean: number): string {
  return `M${f(x - w / 2)},${f(y)}C${f(x - w / 2)},${f(y - h * 0.45)} ${f(x + lean - w * 0.15)},${f(y - h * 0.6)} ${f(x + lean)},${f(y - h)}C${f(x + lean * 0.4 + w * 0.2)},${f(y - h * 0.55)} ${f(x + w / 2)},${f(y - h * 0.35)} ${f(x + w / 2)},${f(y)}Z`;
}
/** A fire: soft glow, ink-edged outer tongues, hotter core. */
function fire(d: Doc, x: number, y: number, sc: number, seed: number): string {
  const r = rnd(seed);
  let s = F(ell(x, y - 4 * sc, 16 * sc, 11 * sc), d.radial(x, y - 4 * sc, 16 * sc, [[0, '#D08A3A', 0.5], [1, '#D08A3A', 0]]));
  const n = 4;
  const tg: [number, number, number][] = [];
  for (let k = 0; k < n; k++) tg.push([(k - (n - 1) / 2) * 3.6 * sc + (r() - 0.5) * 2 * sc, (8 + r() * 8) * sc * (1 - Math.abs(k - (n - 1) / 2) * 0.2), (r() - 0.3) * 3 * sc]);
  for (const [ox, h, le] of tg) s += F(tongue(x + ox, y, 5 * sc, h, le), BURN[0], 0.8);
  for (const [ox, h, le] of tg) s += F(tongue(x + ox, y, 3.4 * sc, h * 0.72, le * 0.8), BURN[1]);
  for (const [ox, h, le] of tg) s += F(tongue(x + ox, y + 0.2, 1.8 * sc, h * 0.42, le * 0.5), BURN[2]);
  for (let k = 0; k < 4; k++) s += dot(x + (r() - 0.5) * 14 * sc, y - (12 + r() * 10) * sc, 0.5 * sc, '#D9A64A', 0.8);
  return s;
}
/** Soft rising smoke plume drifting right (for the late layer). */
function smoke(blurUrl: string, x: number, y: number, sc: number, seed: number, dark = true, n = 7): string {
  const r = rnd(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const q = k / (n - 1);
    const cx = x + q * q * 30 * sc + (r() - 0.5) * 4 * sc;
    const cy = y - k * 8.5 * sc;
    const rr = (3.4 + k * 1.9) * sc;
    s += F(blob(cx, cy, rr * 1.15, rr, seed * 13 + k, 7, 0.3), mix(dark ? '#2A2724' : '#56534C', '#8C887E', q), 0, `opacity="${f(0.82 - q * 0.5)}"`);
  }
  return `<g filter="${blurUrl}">${s}</g>`;
}
/** Leafless, crooked tree standing on (x, y). */
function deadTree(x: number, y: number, sc: number, seed: number, crow = false): string {
  const r = rnd(seed);
  let s = F(ell(x + 6 * sc, y + 0.5, 8 * sc, 2.2 * sc), '#2A2014', 0, 'opacity="0.28"');
  const h = (20 + r() * 10) * sc;
  const lean = (r() - 0.5) * 5 * sc;
  const tx = x + lean;
  const ty = y - h;
  s += F(`M${f(x - 1.9 * sc)},${f(y)}Q${f(x - 0.6 * sc + lean * 0.5)},${f(y - h * 0.5)} ${f(tx - 0.4 * sc)},${f(ty)}L${f(tx + 0.5 * sc)},${f(ty)}Q${f(x + 0.9 * sc + lean * 0.5)},${f(y - h * 0.5)} ${f(x + 1.9 * sc)},${f(y)}Z`, '#4A3E30', 0.8);
  let br = '';
  const nb = 4 + Math.floor(r() * 3);
  let cp: Pt = [tx, ty];
  for (let k = 0; k < nb; k++) {
    const q = 0.38 + r() * 0.58;
    const bx = x + lean * q;
    const by = y - h * q;
    const side = k % 2 ? 1 : -1;
    const len = (5 + r() * 7) * sc * (1.15 - q * 0.4);
    const ex = bx + side * len;
    const ey = by - len * (0.4 + r() * 0.6);
    br += `M${f(bx)},${f(by)}Q${f((bx + ex) / 2)},${f(by - len * 0.12)} ${f(ex)},${f(ey)}`;
    br += `M${f((bx + ex) / 2 + side * len * 0.1)},${f((by + ey) / 2 - 0.5)}l${f(side * 2.2 * sc)},${f(-3 * sc)}`;
    if (k === 1) cp = [ex, ey];
  }
  s += L(br, 2.1 * sc, INK) + L(br, 1.0 * sc, '#5A4C3A');
  if (crow) s += F(`M${f(cp[0] - 2.4)},${f(cp[1] - 1.6)}q2,-2.6 4.6,-0.6l1.6,-0.6l-0.8,1.4q-1.4,1.8 -5.4,-0.2Z`, '#1A1814', 0.4);
  return s;
}
/** Small house (oblique). Ridge along i unless flat. */
interface HouseO {
  w?: number;
  dp?: number;
  h?: number;
  wall?: string;
  roof?: string;
  flat?: boolean;
  ruin?: boolean;
  fire?: number;
  smoke?: number;
  seed: number;
}
function house(d: Doc, x: number, y: number, o: HouseO, late: string[], blurUrl: string): string {
  const t = new Iso(x, y);
  const r = rnd(o.seed);
  const w = o.w ?? 0.4;
  const dp = o.dp ?? 0.3;
  const h = o.h ?? 14;
  const a = w / 2;
  const b = dp / 2;
  const wall = o.wall ?? '#A99C78';
  const roof = o.roof ?? '#6A5A48';
  let s = F(t.qd(-a, a + 0.12, -b, b + 0.16), '#2A2014', 0, 'opacity="0.3"');
  const bx = box(t, -a, a, -b, b, 0, h, lt(wall, 0.1), wall, dk(wall, 0.3), 1.1);
  s += bx.fills + boxShade(d, t, bx, -a, a, b, 0, h, 0.4);
  const lw = w * 48;
  const rw = dp * 48;
  let win = '';
  const nw = Math.max(1, Math.floor(lw / 10));
  for (let k = 0; k < nw; k++) {
    const wx = ((k + 0.5) * lw) / nw - 2;
    if (k === nw - 1 && nw > 1) {
      win += F(rect(wx, -7, wx + 3.6, 0), '#2A1E14', 0.6);
      continue;
    }
    const boarded = r() < 0.35;
    win += F(rect(wx, -h * 0.74, wx + 3.6, -h * 0.74 + 4.4), boarded ? '#8A6A3A' : '#24221E', 0.6);
    if (boarded) win += L(`M${f(wx - 0.4)},${f(-h * 0.74 + 0.6)}l4.4,3.4`, 0.6, INK);
    if (o.ruin || o.fire) win += F(`M${f(wx - 0.6)},${f(-h * 0.74)}q2.4,-5 4.8,0Z`, '#1C1814', 0, 'opacity="0.55"');
  }
  s += grp(win, swFace(t, -a, b, 0));
  let rwin = '';
  const nr = Math.max(1, Math.floor(rw / 10));
  for (let k = 0; k < nr; k++) rwin += F(rect(((k + 0.5) * rw) / nr - 1.6, -h * 0.74, ((k + 0.5) * rw) / nr + 1.6, -h * 0.74 + 4), '#1E1C18', 0.5);
  s += grp(rwin, seFace(t, a, b, 0));
  s += d.clip(bx.left, F(blob(t.p(-a * 0.2, b, h * 0.4)[0], t.p(-a * 0.2, b, h * 0.4)[1], 5, 3, o.seed), '#5E5232', 0, 'opacity="0.35"'));
  s += bx.lines;
  if (!o.flat) {
    const rh = h * 0.62;
    const oh = 0.035;
    const z = h;
    const back = poly([t.p(-a - oh, -b - oh, z), t.p(a + oh, -b - oh, z), t.p(a + oh, 0, z + rh), t.p(-a - oh, 0, z + rh)]);
    const gab = poly([t.p(a, b, z), t.p(a, -b, z), t.p(a, 0, z + rh)]);
    const front = poly([t.p(-a - oh, b + oh, z), t.p(a + oh, b + oh, z), t.p(a + oh, 0, z + rh), t.p(-a - oh, 0, z + rh)]);
    s += F(back, dk(roof, 0.25), 1.1) + F(gab, dk(wall, 0.34), 1.1) + F(front, roof, 0);
    let sh = '';
    for (let k = 1; k < 4; k++) sh += pline([t.p(-a - oh, (b + oh) * (1 - k / 4), z + (rh * k) / 4), t.p(a + oh, (b + oh) * (1 - k / 4), z + (rh * k) / 4)]);
    s += L(sh, 0.5, dk(roof, 0.4), 'opacity="0.8"');
    if (o.ruin || o.fire) {
      const [hx, hy] = t.p(-a * 0.15, b * 0.45, z + rh * 0.5);
      const hole = blob(hx, hy, lw * 0.28, 4, o.seed + 3, 8, 0.5);
      s += d.clip(front, F(hole, '#16120C') + L(`M${f(hx - lw * 0.3)},${f(hy - 1)}l${f(lw * 0.6)},${f(lw * 0.35)}M${f(hx - lw * 0.1)},${f(hy - 4)}l${f(lw * 0.3)},${f(lw * 0.2)}`, 0.8, '#3A2A1A'));
      s += d.clip(front, F(blob(hx + 2, hy, lw * 0.45, 7, o.seed + 4), '#1A1612', 0, 'opacity="0.4"'));
    }
    s += L(front, 1.1) + L(pline([t.p(-a - oh, 0, z + rh), t.p(a + oh, 0, z + rh)]), 0.6, lt(roof, 0.3));
    if (o.fire) {
      const [fx, fy] = t.p(-a * 0.15, b * 0.3, z + rh * 0.6);
      s += fire(d, fx, fy, o.fire, o.seed + 9);
      late.push(smoke(blurUrl, fx + 1, fy - 12 * o.fire, o.fire * 1.1, o.seed + 11));
    } else if (o.smoke) {
      const [fx, fy] = t.p(0, 0, z + rh);
      late.push(smoke(blurUrl, fx, fy - 4, o.smoke, o.seed + 11, false, 5));
    }
  } else {
    s += F(t.qd(-a + 0.04, -a + 0.14, -b + 0.04, -b + 0.12, h), dk(wall, 0.45), 0.6);
    if (o.fire) {
      const [fx, fy] = t.p(0, 0, h);
      s += fire(d, fx, fy, o.fire, o.seed + 9);
      late.push(smoke(blurUrl, fx + 1, fy - 12 * o.fire, o.fire * 1.15, o.seed + 11));
    }
  }
  return s;
}
/** Abandoned car (oblique), lying along i or j. */
function car(x: number, y: number, col: string, along: 'i' | 'j', seed: number, o: { burnt?: boolean; flip?: boolean; police?: boolean } = {}): string {
  const t = new Iso(x, y);
  const r = rnd(seed);
  const [li, lj] = along === 'i' ? [0.2, 0.085] : [0.085, 0.2];
  const c = o.burnt ? '#3C3631' : col;
  let s = F(t.qd(-li, li + 0.06, -lj, lj + 0.07), '#1E160E', 0, 'opacity="0.32"');
  const wheels = [t.p(-li * 0.6, lj, 1.6), t.p(li * 0.6, lj, 1.6), t.p(li, -lj * 0.5, 1.6), t.p(li, lj * 0.5, 1.6)];
  if (along === 'j') wheels.splice(0, 4, t.p(li, -lj * 0.6, 1.6), t.p(li, lj * 0.6, 1.6), t.p(-li * 0.5, lj, 1.6), t.p(li * 0.5, lj, 1.6));
  if (o.flip) {
    const body = box(t, -li, li, -lj, lj, 0, 5, dk(c, 0.15), c, dk(c, 0.32), 0.9);
    s += body.fills + body.lines;
    for (const [i, j] of along === 'i' ? [[-0.6, -0.7], [0.6, -0.7], [-0.6, 0.7], [0.6, 0.7]] : [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]]) {
      const [wx, wy] = t.p(i * li, j * lj, 5.6);
      s += F(ell(wx, wy, 2.4, 1.5), '#1E1C18', 0.6);
    }
    s += L(`M${fp(t.p(-li * 0.4, 0, 5))}l3,-0.6`, 0.6, '#5A4C3A');
    return s;
  }
  for (const [wx, wy] of wheels) s += F(ell(wx, wy, 1.9, 1.6), '#1A1814', 0.5);
  const body = box(t, -li, li, -lj, lj, 1.6, 6, lt(c, 0.1), c, dk(c, 0.32), 0.9);
  s += body.fills + body.lines;
  const cab = along === 'i' ? box(t, -li * 0.55, li * 0.35, -lj * 0.85, lj * 0.85, 6, 10, lt(c, 0.18), o.burnt ? '#1E1C1A' : '#3E4A4C', o.burnt ? '#141210' : '#2C3436', 0.8) : box(t, -li * 0.85, li * 0.85, -lj * 0.55, lj * 0.35, 6, 10, lt(c, 0.18), o.burnt ? '#1E1C1A' : '#3E4A4C', o.burnt ? '#141210' : '#2C3436', 0.8);
  s += cab.fills + cab.lines;
  if (o.police) {
    const [px, py] = t.p(0, 0, 10.6);
    s += F(rect(px - 3, py - 1.2, px + 3, py + 0.4), '#2A2826', 0.4) + dot(px - 1.6, py - 0.4, 0.9, '#8E2A22') + dot(px + 1.6, py - 0.4, 0.9, '#2C5A75');
  }
  if (o.burnt) for (let k = 0; k < 3; k++) s += dot(x + (r() - 0.5) * 16, y - 3 - r() * 4, 0.9 + r(), '#7A4020', 0.7);
  else s += dot(x + (r() - 0.5) * 12, y - 3.5, 1.1, '#7A4020', 0.7) + L(`M${fp(t.p(li * 0.1, lj, 4))}l2,-1.5`, 0.4, '#E0DCCF', 'opacity="0.6"');
  return s;
}
function zed(x: number, y: number, seed: number, dir = 1): string {
  const r = rnd(seed);
  const shirt = ['#55553F', '#3A3833', '#691122', '#2C6985', '#A89C74'][Math.floor(r() * 5)];
  let s = F(ell(x + 1.5, y, 3.6, 1.2), '#1A140C', 0, 'opacity="0.35"');
  s += L(`M${f(x - 1)},${f(y)}l0.5,-4.6M${f(x + 1.3)},${f(y)}l-0.5,-4.6`, 1.5, INK) + L(`M${f(x - 1)},${f(y)}l0.5,-4.6M${f(x + 1.3)},${f(y)}l-0.5,-4.6`, 0.7, '#3A3833');
  s += F(`M${f(x - 2)},${f(y - 4.3)}l${f(dir * 0.8)},-5.8h3.4l${f(-dir * 0.2)},5.8Z`, shirt, 0.6);
  const arm = `M${f(x + dir * 0.6)},${f(y - 8.6)}l${f(dir * 4.6)},-0.4`;
  s += L(arm, 1.6, INK) + L(arm, 0.8, '#88BB44');
  s += F(ell(x + dir * 1.2, y - 11.8, 2.1, 2.2), '#88BB44', 0.6) + dot(x + dir * 2, y - 12.2, 0.45, '#DECC54');
  return s;
}
function stone(x: number, y: number, kind: number, tilt = 0): string {
  let s = F(ell(x + 2, y + 0.4, 3.6, 1.2), '#1A140C', 0, 'opacity="0.3"');
  let g = '';
  if (kind === 0) g = F(`M-2.6,0V-5A2.6,2.6 0 0 1 2.6,-5V0Z`, '#8E8C80', 0.7) + F('M0.6,0V-7.5A2.6,2.6 0 0 1 2.6,-5V0Z', '#6E6C62') + L('M-2.6,0V-5A2.6,2.6 0 0 1 2.6,-5V0Z', 0.7);
  else if (kind === 1) g = F('M-0.8,0V-5.4H-2.6V-6.8H-0.8V-8.6H0.8V-6.8H2.6V-5.4H0.8V0Z', '#9A968A', 0.7);
  else g = F('M-3,0V-4.2Q0,-6.2 3,-4.2V0Z', '#7E7C72', 0.7) + L('M-1.6,-3h3.2', 0.4, INK);
  s += grp(g, `translate(${f(x)} ${f(y)}) rotate(${f(tilt)})`);
  return s;
}
/** A row of iron pickets between two iso points. */
function picketFence(t: Iso, a: [number, number], b: [number, number], h: number, step = 0.08): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / step));
  let p = '';
  for (let k = 0; k <= n; k++) {
    const i = a[0] + ((b[0] - a[0]) * k) / n;
    const j = a[1] + ((b[1] - a[1]) * k) / n;
    if (k % 7 === 3) continue; // missing pickets
    const lean = k % 5 === 1 ? 1.2 : 0;
    const [x0, y0] = t.p(i, j, 0);
    p += `M${f(x0)},${f(y0)}l${f(lean)},${f(-h)}`;
  }
  const rail = (z: number) => pline([t.p(a[0], a[1], z), t.p(b[0], b[1], z)]);
  return L(p + rail(h * 0.3) + rail(h * 0.85), 1.6, INK) + L(p + rail(h * 0.3) + rail(h * 0.85), 0.6, '#5A5650');
}
/** Chain-link fence run with posts and barbed coil. */
function chainFence(d: Doc, t: Iso, a: [number, number], b: [number, number], h: number, seed: number): string {
  const band = poly([t.p(a[0], a[1], 0), t.p(b[0], b[1], 0), t.p(b[0], b[1], h), t.p(a[0], a[1], h)]);
  const xs = [t.p(a[0], a[1], 0)[0], t.p(b[0], b[1], 0)[0]];
  const ys = [t.p(a[0], a[1], h)[1], t.p(b[0], b[1], 0)[1], t.p(a[0], a[1], 0)[1], t.p(b[0], b[1], h)[1]];
  const x0 = Math.min(...xs) - 30;
  const x1 = Math.max(...xs) + 30;
  const y0 = Math.min(...ys) - 30;
  const y1 = Math.max(...ys) + 30;
  let mesh = '';
  for (let x = x0; x < x1; x += 3) mesh += `M${f(x)},${f(y0)}l${f(y1 - y0)},${f(y1 - y0)}M${f(x)},${f(y0)}l${f(-(y1 - y0))},${f(y1 - y0)}`;
  let s = F(band, '#6E6C62', 0, 'opacity="0.12"') + d.clip(band, L(mesh, 0.35, '#3E3C36', 'opacity="0.55"'));
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / 0.32));
  let posts = '';
  let coil = '';
  for (let k = 0; k <= n; k++) {
    const i = a[0] + ((b[0] - a[0]) * k) / n;
    const j = a[1] + ((b[1] - a[1]) * k) / n;
    posts += pline([t.p(i, j, 0), t.p(i, j, h + 2)]);
  }
  const m = Math.round(len / 0.06);
  for (let k = 0; k < m; k++) {
    const [cx, cy] = t.p(a[0] + ((b[0] - a[0]) * (k + 0.5)) / m, a[1] + ((b[1] - a[1]) * (k + 0.5)) / m, h + 2.4);
    coil += ell(cx, cy, 1.7, 1.5);
  }
  s += L(pline([t.p(a[0], a[1], h), t.p(b[0], b[1], h)]), 0.8, '#3E3C36');
  s += L(posts, 1.8, INK) + L(posts, 0.8, '#77756C') + L(coil, 0.45, '#2E2C28');
  void seed;
  return s;
}
function bodyBag(x: number, y: number, rot: number): string {
  return grp(F('M-6,-1.6Q-6.6,0 -6,1.6H5Q6.8,0 5,-1.6Z', '#3E4232', 0.6) + L('M-5,0H4.6', 0.35, '#7A7E66') + dot(-4.6, 0, 0.5, '#A8A890'), `translate(${f(x)} ${f(y)}) rotate(${f(rot)})`);
}
function tent(t: Iso, i: number, j: number, col: string): string {
  const a = 0.17;
  const b = 0.12;
  const hz = 11;
  const back = poly([t.p(i - a, j - b, 0), t.p(i + a, j - b, 0), t.p(i + a, j, hz), t.p(i - a, j, hz)]);
  const end = poly([t.p(i + a, j + b, 0), t.p(i + a, j - b, 0), t.p(i + a, j, hz)]);
  const front = poly([t.p(i - a, j + b, 0), t.p(i + a, j + b, 0), t.p(i + a, j, hz), t.p(i - a, j, hz)]);
  const door = poly([t.p(i + a, j + b * 0.4, 0), t.p(i + a, j - b * 0.4, 0), t.p(i + a, j, hz * 0.6)]);
  return F(back, dk(col, 0.3), 0.9) + F(end, dk(col, 0.22), 0.9) + F(door, '#1A1A14', 0.5) + F(front, col, 0.9) + L(pline([t.p(i - a, j, hz), t.p(i + a, j, hz)]), 0.5, lt(col, 0.3));
}
function biohazard(x: number, y: number, r: number, col: string): string {
  let s = '';
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
    s += `<circle cx="${f(x + Math.cos(a) * r * 0.45)}" cy="${f(y + Math.sin(a) * r * 0.45)}" r="${f(r * 0.42)}" fill="none" stroke="${col}" stroke-width="${f(r * 0.22)}"/>`;
  }
  return s + dot(x, y, r * 0.18, col);
}
function coffeeRing(x: number, y: number, rr: number, seed: number): string {
  const r = rnd(seed);
  let s = F(ell(x, y, rr, rr * 0.97), '#6E4E2A', 0, 'opacity="0.1"');
  s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="none" stroke="#5E3E1E" stroke-width="4" opacity="0.32"/>`;
  for (let k = 0; k < 5; k++) {
    const a0 = r() * Math.PI * 2;
    const a1 = a0 + 0.6 + r() * 1.6;
    const rk = rr + (r() - 0.5) * 2;
    s += L(`M${f(x + Math.cos(a0) * rk)},${f(y + Math.sin(a0) * rk)}A${f(rk)},${f(rk)} 0 0 1 ${f(x + Math.cos(a1) * rk)},${f(y + Math.sin(a1) * rk)}`, 1.3, '#4E3218', 'opacity="0.6"');
  }
  s += F(blob(x + rr * 0.7, y + rr * 0.75, 4, 3, seed), '#5E3E1E', 0, 'opacity="0.18"');
  return s;
}
function thumbprint(x: number, y: number, rot: number, seed: number): string {
  const r = rnd(seed);
  let s = F(blob(0, 0, 12, 15, seed, 9, 0.2), '#6E1E18', 0, 'opacity="0.22"');
  for (let k = 0; k < 9; k++) {
    const rx = 1.6 + k * 1.25;
    const ry = 2.2 + k * 1.55;
    s += `<ellipse cx="${f((r() - 0.5) * 0.6)}" cy="${f(k * 0.18)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="#6A1A14" stroke-width="0.9" stroke-dasharray="${f(3 + r() * 9)} ${f(1 + r() * 2.4)}" opacity="0.75"/>`;
  }
  s += F(blob(4, 14, 5, 3, seed + 2), '#6E1E18', 0, 'opacity="0.35"');
  let out = grp(s, `translate(${f(x)} ${f(y)}) rotate(${f(rot)})`);
  for (let k = 0; k < 7; k++) out += dot(x + 14 + r() * 20, y - 8 + r() * 22, 0.6 + r() * 1.6, '#6E1E18', 0.55);
  out += F(`M${f(x + 9)},${f(y + 12)}q1.4,6 0.4,11q-1.6,-1 -1.6,-5Z`, '#6E1E18', 0, 'opacity="0.4"');
  return out;
}

// ============================================================================ map_bg
function buildMapBg(): ArtAsset {
  return asset('map_bg', MAP3_W, MAP3_H, 0, 0, (d) => {
    const R = rnd(77);
    const late: string[] = [];
    const SB = d.blur(1.3);
    let s = '';

    // ---- the table under the map (shows at the torn corner and the edges)
    s += F(rect(0, 0, MAP3_W, MAP3_H), '#2A2016');
    let tg = '';
    for (let k = 0; k < 40; k++) {
      const y = k * 23 + R() * 10;
      tg += `M0,${f(y)}C400,${f(y + 8 - R() * 16)} 1000,${f(y - 8 + R() * 16)} 1600,${f(y + R() * 6)}`;
    }
    s += L(tg, 1.4, '#3A2C1E', 'opacity="0.8"') + L(tg, 0.5, '#16100A', 'opacity="0.6"');

    // ---- paper outline: wobbly edges, a torn-off top-right corner
    const pr = rnd(11);
    const paperPts: Pt[] = [];
    for (let x = 6; x <= 1400; x += 40) paperPts.push([x, 6 + (pr() - 0.5) * 3]);
    const tearA: Pt = [1418, 6];
    const tearB: Pt = [1594, 168];
    const tear: Pt[] = [];
    const nt = 34;
    for (let k = 0; k <= nt; k++) {
      const q = k / nt;
      const bulge = Math.sin(q * Math.PI) * 26;
      const jag = (pr() - 0.5) * 8 + (k % 2 ? 3 : -2);
      tear.push([tearA[0] + (tearB[0] - tearA[0]) * q - bulge * 0.62 + jag * 0.7, tearA[1] + (tearB[1] - tearA[1]) * q + bulge * 0.78 + jag * 0.7]);
    }
    paperPts.push(...tear);
    for (let y = 200; y <= 894; y += 40) paperPts.push([1594 + (pr() - 0.5) * 3, y]);
    for (let x = 1594; x >= 6; x -= 40) paperPts.push([x, 894 + (pr() - 0.5) * 3]);
    for (let y = 860; y > 6; y -= 40) paperPts.push([6 + (pr() - 0.5) * 3, y]);
    const paper = poly(paperPts);
    s += `<g filter="${d.blur(5)}" opacity="0.7" transform="translate(5 7)">${F(paper, '#0A0604')}</g>`;
    s += F(paper, d.radial(760, 430, 980, [[0, '#CBBD93'], [0.65, '#C0AF84'], [1, '#9C8A5E']]));

    let m = ''; // everything printed / drawn on the paper (clipped to it)
    // paper texture
    m += speckle(d, paper, [0, 0, 1600, 900], 1500, ['#8C7A52', '#E0D4B0', '#6E5E3E'], 5, 0.4, 1.3, 0.45);
    for (let k = 0; k < 26; k++) m += F(blob(R() * 1600, R() * 900, 10 + R() * 40, 8 + R() * 30, 300 + k), '#8E7444', 0, `opacity="${f(0.05 + R() * 0.07)}"`);

    // ---- fields and woods (faded print)
    const field = (pts: Pt[], col: string, rows: number, seed: number) => {
      const p = poly(pts);
      let x = F(p, col, 0, 'opacity="0.55"');
      let rl = '';
      const [ax, ay] = pts[0];
      const [bx, by] = pts[1];
      const [cx, cy] = pts[3];
      for (let k = 1; k < rows; k++) {
        const q = k / rows;
        rl += `M${f(ax + (cx - ax) * q)},${f(ay + (cy - ay) * q)}l${f(bx - ax)},${f(by - ay)}`;
      }
      x += d.clip(p, L(rl, 0.8, dk(col, 0.35), 'opacity="0.45"'));
      x += L(p, 0.8, '#5A4E30', 'opacity="0.45" stroke-dasharray="3 3"');
      void seed;
      return x;
    };
    m += field([[40, 262], [250, 280], [240, 470], [30, 455]], '#8C8C58', 14, 1);
    m += field([[470, 770], [690, 760], [690, 890], [470, 890]], '#8A8650', 10, 2);
    m += field([[1130, 790], [1370, 780], [1370, 890], [1130, 890]], '#7E7E4C', 9, 3);
    m += field([[330, 560], [480, 520], [520, 760], [300, 770]], '#868A56', 12, 4);
    for (const [x, y, rx, ry, sd] of [
      [940, 820, 120, 60, 1],
      [80, 560, 70, 70, 2],
      [1560, 330, 60, 150, 3],
      [1000, 520, 70, 40, 4],
      [400, 320, 50, 40, 5],
    ] as [number, number, number, number, number][])
      m += F(blob(x, y, rx, ry, 40 + sd, 9, 0.3), '#6E7046', 0, 'opacity="0.35"');

    // ---- creek
    const creek = spline(CREEK);
    const cp = pline(creek);
    m += L(cp, 19, '#4E5A48', 'opacity="0.9"') + L(cp, 14, '#6A7662') + L(cp, 5, '#7E8C72', 'opacity="0.5" stroke-dasharray="14 22"') + L(cp, 1.4, INK, 'opacity="0.35" stroke-dasharray="2 9"');
    // ---- town streets
    const streets = STREETS.map((p) => spline(p));
    for (const st of streets) m += L(pline(st), 17, '#4A463E');
    for (const st of streets) m += L(pline(st), 13.5, '#827E74');
    // ---- dirt lots + driveways under the pins
    for (const k of ORDER) {
      const { x, y } = MAP3_LAYOUT[k];
      const col = k === 'boss' ? '#4A3E32' : '#8C7651';
      m += F(blob(x, y - 30, 86, 46, 60 + x, 11, 0.16), dk(col, 0.25), 0, 'opacity="0.6"');
      m += F(blob(x, y - 30, 80, 42, 61 + x, 11, 0.14), col);
      m += F(blob(x + 6, y + 16, 24, 16, 62 + x), col);
      m += speckle(d, blob(x, y - 30, 80, 42, 61 + x, 11, 0.14), [x - 90, y - 80, 180, 100], 90, [dk(col, 0.35), lt(col, 0.15)], x, 0.5, 1.4, 0.6);
      if (k === 'boss') {
        m += F(blob(x, y - 26, 70, 34, 7, 9, 0.4), '#1E1812', 0, 'opacity="0.6"');
        for (let q = 0; q < 14; q++) m += dot(x + (R() - 0.5) * 140, y - 26 + (R() - 0.5) * 60, 0.8 + R(), '#C8622A', 0.7);
      }
    }
    // ---- the main road (the route)
    const road = spline(roadCtl());
    const rp = pline(road);
    m += L(rp, 30, '#3E3A33') + L(rp, 25, '#77736A');
    // asphalt texture, cracks, potholes along the road
    const rr = rnd(91);
    let rt = '';
    for (let k = 0; k < road.length - 1; k++) {
      const [x, y] = road[k];
      const [x2, y2] = road[k + 1];
      const l = Math.hypot(x2 - x, y2 - y) || 1;
      const nx = -(y2 - y) / l;
      const ny = (x2 - x) / l;
      for (let q = 0; q < 2; q++) {
        const o = (rr() - 0.5) * 22;
        rt += dot(x + nx * o, y + ny * o, 0.4 + rr() * 0.6, rr() < 0.5 ? '#5E5A52' : '#9A968A', 0.7);
      }
      if (k % 9 === 4) rt += crack(x + nx * (rr() - 0.5) * 16, y + ny * (rr() - 0.5) * 16, Math.atan2(ny, nx) + (rr() - 0.5), 9 + rr() * 8, 500 + k, 0.6, '#2A2620', 1);
      if (k % 37 === 11 && !inPin(x, y, -10)) rt += F(blob(x + nx * 5, y + ny * 5, 4 + rr() * 3, 2.6, 600 + k), '#3A362E', 0.5);
    }
    m += rt;
    m += L(rp, 1.6, '#B29A4C', 'stroke-dasharray="9 10" opacity="0.75"');
    for (const st of streets) {
      for (let k = 6; k < st.length; k += 11) m += crack(st[k][0], st[k][1], R() * 6, 7, 700 + k, 0.5, '#2A2620', 0);
    }
    // bridges where the creek meets the main road and the cross street
    const bridge = (line: Pt[], wide: number) => {
      let bi = 0;
      let bd = Infinity;
      line.forEach((p, i) => {
        const dd = distTo(p, creek);
        if (dd < bd) {
          bd = dd;
          bi = i;
        }
      });
      const a = line[Math.max(0, bi - 5)];
      const b = line[Math.min(line.length - 1, bi + 5)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ux = (b[0] - a[0]) / l;
      const uy = (b[1] - a[1]) / l;
      const [cx, cy] = line[bi];
      let x = '';
      for (const sgn of [-1, 1]) {
        const ox = -uy * wide * sgn;
        const oy = ux * wide * sgn;
        const p0: Pt = [cx + ox - ux * 16, cy + oy - uy * 16];
        const p1: Pt = [cx + ox + ux * 16, cy + oy + uy * 16];
        x += L(pline([p0, p1]), 3.4, INK) + L(pline([p0, p1]), 1.8, '#8E6436');
        for (let q = 0; q <= 3; q++) x += dot(p0[0] + ux * q * 10.6, p0[1] + uy * q * 10.6, 1.6, '#4A3420') ;
      }
      return x;
    };
    m += bridge(road, 15) + bridge(streets[0], 9);

    // ---- town blocks, farm, landmarks
    let o = '';
    const H = (x: number, y: number, ho: HouseO) => house(d, x, y, ho, late, SB);
    // farm (top-left)
    o += H(150, 330, { w: 0.5, dp: 0.34, h: 15, wall: '#B6AA86', roof: '#6E4A34', seed: 1, smoke: 0.8 });
    o += H(90, 380, { w: 0.3, dp: 0.42, h: 18, wall: '#7A3A2A', roof: '#4A4640', seed: 2, ruin: true });
    // silo
    o += cyl(d, 222, 380, 9, 9, 0, 34, '#9E9A88', '#787468', '#8A867A', 1.1).s + L(`M213,354h18M213,366h18`, 0.5, '#5A5850') + rustDrip(219, 352, 14);
    o += F(`M213,346Q222,334 231,346Z`, '#7E7A6C', 1.1);
    // scarecrow (a zed tied up)
    o += L('M60,450v-16M53,440h14', 1.6, '#5A4C3A') + zed(60, 447, 5);
    // water tower
    {
      const x = 420;
      const y = 215;
      let w = F(ell(x + 8, y + 2, 34, 9), '#1A140C', 0, 'opacity="0.25"');
      const legs = `M${x - 24},${y}L${x - 18},${y - 60}M${x + 24},${y}L${x + 18},${y - 60}M${x - 8},${y + 6}L${x - 6},${y - 58}M${x + 8},${y + 6}L${x + 6},${y - 58}`;
      const brace = `M${x - 23},${y - 8}L${x + 22},${y - 34}M${x + 23},${y - 8}L${x - 22},${y - 34}M${x - 21},${y - 34}L${x + 20},${y - 56}M${x + 21},${y - 34}L${x - 20},${y - 56}`;
      w += L(legs, 3.2, INK) + L(legs, 1.8, '#5E5A50') + L(brace, 0.8, '#3A3832');
      const tank = cyl(d, x, y - 60, 27, 27, 0, 34, '#8E8A76', '#68645A', '#7A7668', 1.25);
      w += tank.s;
      w += lettering('DREGS', x - 2, y - 74, 9, '#D2C8A8', 1.5, { anchor: 'middle', jitter: 0.1, seed: 4 }, 0.5);
      w += rust(d, tank.body, [[x - 14, y - 84, 4], [x + 16, y - 68, 5]], 7);
      // bullet holes leaking toxic green
      for (const [hx, hy, ln] of [[x - 18, y - 70, 18], [x + 10, y - 82, 26]] as [number, number, number][]) w += dot(hx, hy, 1.2, '#16120C') + F(`M${hx - 0.8},${hy}q-0.6,${ln * 0.6} 0.6,${ln}q1.2,${-ln * 0.4} 0.6,${-ln}Z`, '#7FB236', 0.4);
      w += F(blob(x + 4, y + 5, 14, 4, 9), '#7FB236', 0.5, 'opacity="0.8"');
      w += F(`M${x - 30},${y - 94}L${x},${y - 112}L${x + 30},${y - 94}Z`, '#5E5246', 1.25) + F(`M${x},${y - 112}L${x + 30},${y - 94}L${x + 6},${y - 92}Z`, '#463C32');
      w += L(`M${x - 28},${y - 60}Q${x},${y - 52} ${x + 28},${y - 60}`, 1.4, INK) + L(`M${x + 14},${y - 60}V${y - 96}M${x + 18},${y - 60}V${y - 96}`, 0.6, '#3A3832');
      o += w;
    }
    // town north of the cross street
    const town: [number, number, HouseO][] = [
      [505, 110, { seed: 10, wall: '#A89E80', roof: '#5E5246' }],
      [500, 190, { seed: 11, wall: '#9A8E70', roof: '#6E4A34', ruin: true }],
      [605, 80, { seed: 12, wall: '#B2A684', roof: '#4E4A44' }],
      [665, 104, { seed: 13, w: 0.32, wall: '#8E8A78', roof: '#6A3A2E' }],
      [610, 168, { seed: 14, w: 0.5, h: 16, wall: '#A69A7A', roof: '#585248', fire: 1.1 }],
      [666, 196, { seed: 15, w: 0.3, dp: 0.24, wall: '#B8AC88', roof: '#4E4A44' }],
      [760, 84, { seed: 16, w: 0.46, flat: true, h: 18, wall: '#9A9278', ruin: true }],
      [828, 70, { seed: 17, w: 0.34, wall: '#AEA282', roof: '#6E4A34' }],
      [762, 176, { seed: 18, w: 0.36, wall: '#968C70', roof: '#4A4640' }],
      [834, 168, { seed: 19, w: 0.5, h: 20, flat: true, wall: '#8E8670', fire: 1.4 }],
      [928, 110, { seed: 20, w: 0.3, wall: '#A69C7E', roof: '#5E5246' }],
      [930, 196, { seed: 21, w: 0.28, wall: '#9A8E70', roof: '#6A3A2E', ruin: true }],
      // pockets between the joints
      [585, 330, { seed: 22, w: 0.5, h: 16, wall: '#9E9476', roof: '#4E4A44', fire: 1.2 }],
      [530, 420, { seed: 23, w: 0.34, wall: '#AEA282', roof: '#6E4A34' }],
      [650, 430, { seed: 24, w: 0.3, wall: '#8E8670', roof: '#5E5246', ruin: true }],
      [970, 320, { seed: 25, w: 0.42, h: 15, wall: '#A69A7A', roof: '#585248', fire: 1.0 }],
      [1070, 300, { seed: 26, w: 0.34, wall: '#B2A684', roof: '#6A3A2E' }],
      [1040, 420, { seed: 27, w: 0.4, flat: true, h: 16, wall: '#8E8A78', ruin: true }],
      [1380, 300, { seed: 28, w: 0.36, wall: '#A89E80', roof: '#4E4A44', smoke: 0.7 }],
      [1330, 186, { seed: 29, w: 0.44, wall: '#9A8E70', roof: '#5E5246', ruin: true }],
      [560, 845, { seed: 30, w: 0.42, wall: '#A69C7E', roof: '#6E4A34', fire: 1.2 }],
      [1220, 850, { seed: 31, w: 0.4, wall: '#4A443C', roof: '#2E2A26', ruin: true, smoke: 1 }],
      [880, 860, { seed: 32, w: 0.3, wall: '#B2A684', roof: '#585248' }],
    ];
    // church with a steeple (pocket between chuck and vera)
    for (const [x, y, ho] of town) if (!inPin(x, y, 6)) o += H(x, y, ho);
    {
      const t = new Iso(632, 382);
      const st = box(t, -0.07, 0.07, -0.07, 0.07, 0, 34, '#B0A688', '#B0A688', '#857C62', 1.1);
      o += st.fills + st.lines + F(poly([t.p(-0.08, 0.08, 34), t.p(0.08, 0.08, 34), t.p(0, 0, 50)]), '#4E4A44', 1) + F(poly([t.p(0.08, 0.08, 34), t.p(0.08, -0.08, 34), t.p(0, 0, 50)]), '#3A3632', 1);
      const [cx, cy] = t.p(0, 0, 50);
      o += grp(L('M0,0v-7M-2.4,-4.6h4.8', 2.4, INK) + L('M0,0v-7M-2.4,-4.6h4.8', 1, '#8A867A'), `translate(${f(cx)} ${f(cy)}) rotate(28)`);
      o += grp(F(rect(-1.6, -9, 1.6, -4), '#1E1C18', 0.5), swFace(t, -0.07, 0.07, 18));
    }
    // gas station (right)
    {
      const t = new Iso(1452, 425);
      o += H(1468, 372, { seed: 40, w: 0.46, dp: 0.3, flat: true, h: 16, wall: '#A8A08A', fire: 1.3 });
      const posts = [t.p(-0.4, -0.22), t.p(0.4, -0.22), t.p(-0.4, 0.22), t.p(0.4, 0.22)];
      for (const [px, py] of posts.slice(0, 2)) o += L(`M${f(px)},${f(py)}v-20`, 2.6, INK) + L(`M${f(px)},${f(py)}v-20`, 1.2, '#8A867A');
      for (const pi of [-0.16, 0.16]) {
        const pb = box(t, pi - 0.05, pi + 0.05, -0.04, 0.04, 0, 10, '#8E2A22', '#7A2A22', '#5A1E18', 0.9);
        o += pb.fills + pb.lines;
      }
      // a pump knocked over
      o += grp(F(rect(-2.6, -9, 2.6, 0), '#7A2A22', 0.8) + F(rect(-1.6, -7.6, 1.6, -5), '#C8C0A6', 0.4), `translate(${fp(t.p(0.5, 0.36))}) rotate(78)`);
      for (const [px, py] of posts.slice(2)) o += L(`M${f(px)},${f(py)}v-20`, 2.6, INK) + L(`M${f(px)},${f(py)}v-20`, 1.2, '#8A867A');
      const can = box(t, -0.46, 0.46, -0.28, 0.28, 20, 24, '#B8B0A0', '#C8C0A6', '#9A9282', 1.1);
      o += can.fills + can.lines;
      o += grp(L('M2,-0.8H43', 1.6, '#7A2A22') + lettering('GAS', 40, -0.6, 3, '#2A2620', 0.7, { anchor: 'end' }, 0), swFace(t, -0.46, 0.28, 20));
    }
    // cemetery (in the bend under vera)
    {
      const t = new Iso(842, 642);
      const A = 0.8;
      const B = 0.55;
      o += F(t.qd(-A, A, -B, B), '#7C7A56', 0.9) + speckle(d, t.qd(-A, A, -B, B), [760, 580, 170, 120], 120, ['#5E5E3E', '#9A9870'], 8, 0.4, 1.1, 0.7);
      o += picketFence(t, [-A, -B], [A, -B], 8) + picketFence(t, [-A, -B], [-A, B], 8);
      // mausoleum
      const mz = box(t, -0.62, -0.32, -0.45, -0.2, 0, 16, '#9A968A', '#8E8A7E', '#6E6A60', 1.1);
      o += mz.fills + mz.lines + F(poly([t.p(-0.64, -0.18, 16), t.p(-0.3, -0.18, 16), t.p(-0.3, -0.325, 23), t.p(-0.64, -0.325, 23)]), '#7E7A70', 1) + grp(F(rect(5, -10, 10, 0), '#1A1814', 0.6), swFace(t, -0.62, -0.2, 0));
      o += deadTree(t.p(0.55, -0.35)[0], t.p(0.55, -0.35)[1], 1.1, 33, true);
      const gr = rnd(34);
      for (let gi = -0.6; gi <= 0.62; gi += 0.24)
        for (let gj = -0.38; gj <= 0.42; gj += 0.26) {
          if (gi < -0.25 && gj < -0.1) continue;
          if (gi > 0.4 && gj < -0.2) continue;
          const [x, y] = t.p(gi + (gr() - 0.5) * 0.05, gj);
          const open = gr() < 0.28;
          if (open) {
            o += F(t.qd(gi - 0.05, gi + 0.05, gj + 0.02, gj + 0.16), '#1E1812', 0.6) + F(blob(x + 7, y + 3, 4, 2, Math.round(gi * 100 + gj * 10)), '#5E4A30', 0.5);
          }
          o += stone(x, y, Math.floor(gr() * 3), (gr() - 0.5) * 18);
        }
      // a hand clawing out of a grave
      const [hx, hy] = t.p(0.32, 0.36);
      o += F(blob(hx, hy, 5, 2, 4), '#5E4A30', 0.5) + L(`M${hx},${hy}l1,-6M${hx + 1},${hy - 6}l-1.6,-2.4M${hx + 1},${hy - 6}l0.2,-3M${hx + 1},${hy - 6}l1.8,-2.2`, 2.2, INK) + L(`M${hx},${hy}l1,-6M${hx + 1},${hy - 6}l-1.6,-2.4M${hx + 1},${hy - 6}l0.2,-3M${hx + 1},${hy - 6}l1.8,-2.2`, 1, '#88BB44');
      o += picketFence(t, [-A, B], [A, B], 8) + picketFence(t, [A, -B], [A, B], 8);
    }
    // quarantine zone (top right of town)
    {
      const t = new Iso(1100, 128);
      const A = 1.55;
      const B = 0.95;
      o += F(t.qd(-A, A, -B, B), '#8E8A70', 1) + speckle(d, t.qd(-A, A, -B, B), [970, 50, 260, 160], 160, ['#6E6A52', '#A8A488'], 9, 0.4, 1.2, 0.7);
      o += L(pline([t.p(-1.2, 0.6), t.p(0.4, 0.2), t.p(1.4, 0.7)]), 3, '#6E6A52', 'opacity="0.5" stroke-dasharray="2 2"');
      o += chainFence(d, t, [-A, -B], [A, -B], 16, 1) + chainFence(d, t, [-A, -B], [-A, B], 16, 2);
      o += tent(t, -1.0, -0.5, '#5E6240') + tent(t, -0.35, -0.6, '#585C3C') + tent(t, 0.35, -0.55, '#5E6240') + tent(t, 1.05, -0.45, '#545838');
      for (let k = 0; k < 6; k++) {
        const [bx, by] = t.p(-1.1 + k * 0.3, 0.25);
        o += bodyBag(bx, by, 32);
      }
      // floodlight + burn barrel
      const [lx, ly] = t.p(1.3, 0.2);
      o += L(`M${lx},${ly}v-30`, 2.4, INK) + L(`M${lx},${ly}v-30`, 1, '#77756C') + F(rect(lx - 4, ly - 34, lx + 4, ly - 29), '#3A3832', 0.8) + F(rect(lx - 3, ly - 30, lx + 3, ly - 29), '#D8D2A8', 0);
      const [bx, by] = t.p(-0.2, 0.55);
      o += cyl(d, bx, by, 4, 4, 0, 8, '#5A5A48', '#3E3E30', '#2A2620', 1).s + fire(d, bx, by - 8, 0.5, 3);
      late.push(smoke(SB, bx, by - 16, 0.6, 5, true, 5));
      // biohazard sign on a post
      const [sx, sy] = t.p(-1.62, 1.0);
      o += L(`M${sx},${sy}v-14`, 2, INK) + F(rect(sx - 6, sy - 26, sx + 6, sy - 14), '#C2A23A', 1) + biohazard(sx, sy - 20, 4.4, '#16120C');
      // front fences + the banner, with a hole torn in the fence
      o += chainFence(d, t, [-A, B], [-0.2, B], 16, 3) + chainFence(d, t, [0.1, B], [A, B], 16, 4) + chainFence(d, t, [A, -B], [A, B], 16, 5);
      const [hx, hy] = t.p(-0.05, B);
      o += L(`M${hx - 7},${hy - 2}l-3,6M${hx + 6},${hy}l4,5`, 1, '#3E3C36') + F(blob(hx + 2, hy + 10, 8, 3, 8), '#6E1E18', 0, 'opacity="0.5"');
      o += L(`M${hx},${hy + 4}q8,14 26,22`, 2.4, '#6E1E18', 'opacity="0.35"');
      const ban = rect(20, -15.5, 132, -2);
      o += grp(
        F(ban, '#CFC7AE', 1.1) + d.clip(ban, F(blob(110, -6, 14, 7, 3), '#8E7A54', 0, 'opacity="0.35"') + F(blob(30, -12, 6, 4, 4), '#6E1E18', 0, 'opacity="0.4"')) +
          lettering('QUARANTINE', 76, -4.6, 9, '#6E1A16', 1.6, { anchor: 'middle', gap: 0.32 }, 0) +
          L('M20,-15.5l-3,-2M132,-15.5l3,-2M20,-2l-3,2M132,-2l3,2', 0.8, '#5A5650'),
        swFace(t, -A, B, 0),
      );
    }
    // dead trees
    const trees: [number, number, number, boolean?][] = [
      [52, 196, 1.1, true], [262, 186, 1], [36, 300, 0.9], [262, 455, 1.2], [44, 545, 1.1], [60, 640, 1.2, true], [278, 525, 0.9],
      [455, 268, 1], [690, 470, 1.1], [512, 345, 0.9], [960, 470, 1.2, true], [1110, 470, 1], [1185, 300, 0.9],
      [1560, 268, 1.2], [1575, 410, 1.1], [1410, 470, 0.9, true], [1365, 545, 1],
      [760, 800, 1.1], [800, 848, 1], [985, 795, 1.2, true], [1020, 860, 1], [960, 880, 0.9], [1080, 860, 1.1], [690, 880, 0.9],
      [330, 860, 1], [455, 800, 1.1], [1600 - 70, 880, 1], [290, 120, 1.1],
    ];
    for (const [x, y, sc, cw] of trees) if (!inPin(x, y, 2)) o += deadTree(x, y, sc, Math.round(x + y), !!cw);
    // crashed school bus (pocket under chuck)
    {
      const t = new Iso(395, 640);
      o += F(t.qd(-0.1, 0.18, -0.46, 0.52), '#1A140C', 0, 'opacity="0.3"');
      const bus = box(t, -0.11, 0.11, -0.46, 0.46, 1.5, 15, '#A8902E', '#9E8630', '#7A6624', 1.1);
      o += bus.fills + boxShade(d, t, bus, -0.11, 0.11, 0.46, 1.5, 15, 0.35) + bus.lines;
      let wins = '';
      for (let k = 0; k < 7; k++) wins += F(rect(3 + k * 6, -12, 7.4 + k * 6, -8), k === 2 ? '#88BB44' : '#2A2C28', 0.5);
      o += grp(wins + L('M0,-5H44', 0.8, INK), seFace(t, 0.11, 0.46, 1.5));
      o += F(blob(t.p(0, 0.5, 8)[0], t.p(0, 0.5, 8)[1], 5, 4, 3), '#3A3428', 0.6);
      o += zed(360, 668, 41, 1) + zed(430, 690, 42, -1);
    }
    // overturned tanker leaking toxin (pocket under snob)
    {
      const t = new Iso(1250, 640);
      o += F(blob(1262, 662, 46, 14, 9, 9, 0.3), '#6E9A2A', 0.8, 'opacity="0.75"') + F(blob(1256, 660, 30, 8, 10, 9, 0.3), '#8FC23A', 0, 'opacity="0.5"');
      o += extrudeStack(t, ell(0, -8.5, 8.5, 8.5), -0.12, 0.42, 0, 0.84, '#A8A69A', '#8A887C');
      o += L(ell(0, -8.5, 8.5, 8.5), 1.1, INK, `transform="${swFace(t, -0.12, 0.42, 0)}"`);
      o += biohazard(t.p(0.12, 0, 22)[0], t.p(0.12, 0, 22)[1], 3.2, '#2A2620');
      const cab = box(t, -0.1, 0.12, 0.46, 0.66, 0, 12, '#5E6A70', '#56626A', '#3E484E', 1.1);
      o += cab.fills + cab.lines + grp(F(rect(3, -10, 9, -5), '#2A2C2A', 0.6) + L('M4,-9l4,3', 0.5, '#C8D0D0'), swFace(t, -0.1, 0.66, 0));
      o += car(1300, 600, '#5A5E56', 'j', 77, { flip: true });
    }
    // police roadblock (under crunch)
    {
      o += car(1010, 812, '#2E3236', 'i', 81, { police: true }) + car(1076, 826, '#2E3236', 'j', 82, { police: true });
      for (let k = 0; k < 6; k++) o += F(blob(1000 + k * 9, 846 + (k % 2) * 2, 5, 3, 90 + k), '#A89C74', 0.7);
      o += zed(1050, 860, 83, -1);
    }
    // cars on the road and roadsides
    const carSpots: [number, string, 'i' | 'j', { burnt?: boolean; flip?: boolean }][] = [
      [0.05, '#5A6A66', 'i', {}],
      [0.15, '#7A3A2A', 'j', { burnt: true }],
      [0.29, '#8A8670', 'i', {}],
      [0.41, '#4E5A62', 'j', { flip: true }],
      [0.53, '#6E4A34', 'i', { burnt: true }],
      [0.66, '#5E6A44', 'j', {}],
      [0.79, '#8E8A76', 'i', { burnt: true }],
      [0.97, '#3E3A36', 'j', { burnt: true }],
    ];
    for (const [q, col, al, co] of carSpots) {
      let k = Math.floor(q * (road.length - 1));
      while (inPin(road[k][0], road[k][1], 10) && k < road.length - 2) k++;
      const [x, y] = road[k];
      o += car(x + (R() - 0.5) * 8, y + 4, col, al, 200 + k, co);
      if (co.burnt) late.push(smoke(SB, x, y - 10, 0.6, 210 + k, true, 5));
    }
    o += car(1556, 846, '#3E3A36', 'i', 301, { burnt: true }) + car(118, 790, '#6A6E5A', 'j', 302, {}) + car(280, 300, '#7A6A4A', 'i', 303, { flip: true });
    late.push(smoke(SB, 1556, 830, 0.8, 304));
    // shamblers
    const zs: [number, number, number][] = [
      [300, 440, 1], [250, 600, -1], [470, 470, 1], [710, 560, -1], [760, 420, 1], [940, 560, 1], [1165, 540, -1], [1120, 250, 1],
      [1400, 600, -1], [1560, 600, -1], [640, 260, 1], [205, 760, 1], [1300, 760, -1], [870, 770, 1],
    ];
    zs.forEach(([x, y, dir], k) => {
      if (!inPin(x, y, 4)) o += zed(x, y, 500 + k, dir);
    });
    m += o;

    // ---- printed map furniture: title cartouche, compass, legend
    {
      const cx0 = 34;
      const cy0 = 30;
      const cw = 268;
      const chh = 106;
      const c = rect(cx0, cy0, cx0 + cw, cy0 + chh);
      m += F(c, '#D2C59C', 1.3) + L(rect(cx0 + 4, cy0 + 4, cx0 + cw - 4, cy0 + chh - 4), 0.8, '#4A3E26');
      m += d.clip(c, F(blob(cx0 + 200, cy0 + 70, 60, 30, 4), '#8E7444', 0, 'opacity="0.18"'));
      m += lettering('DREGS COUNTY', cx0 + cw / 2, cy0 + 34, 18, '#2A2218', 2.4, { anchor: 'middle', gap: 0.32 }, 0);
      m += L(`M${cx0 + 30},${cy0 + 44}H${cx0 + cw - 30}`, 0.8, '#4A3E26');
      m += lettering('ROAD MAP', cx0 + cw / 2, cy0 + 60, 10, '#3A3020', 1.4, { anchor: 'middle', gap: 0.5 }, 0);
      m += lettering('POP. 12,410', cx0 + 76, cy0 + 88, 10, '#3A3020', 1.4, { anchor: 'middle' }, 0);
      m += L(`M${cx0 + 32},${cy0 + 83}l90,-4`, 2.6, '#9A2620', 'opacity="0.85"');
      m += lettering('0', cx0 + 140, cy0 + 92, 15, '#9A2620', 2.4, { jitter: 0.25, seed: 9 }, 0);
      // rubber stamp
      const stamp = rect(-46, -11, 46, 11);
      m += grp(L(stamp, 2, '#7A1E1A') + lettering('EVACUATED', 0, 5, 11, '#7A1E1A', 1.8, { anchor: 'middle', gap: 0.2 }, 0), `translate(${cx0 + 214} ${cy0 + 84}) rotate(-9)`, 'opacity="0.62"');
    }
    {
      const x = 62;
      const y = 820;
      let c = F(ell(x, y, 30, 30), '#D2C59C', 1) + L(ell(x, y, 25, 25), 0.6, '#4A3E26');
      const star = (a: number, len: number, w: number, c1: string, c2: string) => {
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const tip: Pt = [x + ca * len, y + sa * len];
        const l: Pt = [x - sa * w, y + ca * w];
        const r2: Pt = [x + sa * w, y - ca * w];
        return F(poly([[x, y], tip, l]), c1, 0.8) + F(poly([[x, y], tip, r2]), c2, 0.8);
      };
      for (let k = 0; k < 4; k++) c += star(-Math.PI / 2 + (k * Math.PI) / 2 + Math.PI / 4, 15, 3, '#8E7E5A', '#4A3E26');
      for (let k = 0; k < 4; k++) c += star(-Math.PI / 2 + (k * Math.PI) / 2, 26, 4.5, '#C8B88E', '#2A2218');
      c += lettering('N', x, y - 31, 9, '#2A2218', 1.6, { anchor: 'middle' }, 0);
      m += c;
      const lx = 108;
      const ly = 770;
      const lw = 162;
      const lh = 104;
      m += F(rect(lx, ly, lx + lw, ly + lh), '#D2C59C', 1.1) + L(rect(lx + 3, ly + 3, lx + lw - 3, ly + lh - 3), 0.6, '#4A3E26');
      m += lettering('LEGEND', lx + lw / 2, ly + 17, 9, '#2A2218', 1.5, { anchor: 'middle', gap: 0.45 }, 0);
      m += L(`M${lx + 12},${ly + 34}h26`, 3, '#9A2620', 'stroke-dasharray="6 4"') + lettering('OUR ROUTE', lx + 48, ly + 38, 7, '#2A2218', 1.1, {}, 0);
      m += F(rect(lx + 18, ly + 46, lx + 30, ly + 56), '#8C7651', 0.8) + F(`M${lx + 16},${ly + 47}l8,-6 8,6Z`, '#6A3A2E', 0.8) + lettering('RIVAL JOINT', lx + 48, ly + 56, 7, '#2A2218', 1.1, {}, 0);
      m += zed(lx + 24, ly + 79, 7, 1) + lettering('LOCALS', lx + 48, ly + 75, 7, '#2A2218', 1.1, {}, 0);
      m += F(rect(lx + 48, ly + 86, lx + 78, ly + 90), '#2A2218', 0.6) + F(rect(lx + 78, ly + 86, lx + 108, ly + 90), '#D2C59C', 0.6) + lettering('1 MILE', lx + 116, ly + 92, 6, '#2A2218', 1, {}, 0);
    }

    // ---- printed labels: creek, streets, route shields
    {
      const ink = '#3A3020';
      m += grp(lettering('MILL CREEK', 0, 0, 7, '#34402E', 1.1, { anchor: 'middle', gap: 0.5 }, 0), 'translate(728 330) rotate(86)');
      m += grp(lettering('MILL CREEK', 0, 0, 7, '#34402E', 1.1, { anchor: 'middle', gap: 0.5 }, 0), 'translate(738 800) rotate(84)');
      m += lettering('MAIN ST', 330, 220, 6.5, ink, 1.1, { anchor: 'middle', gap: 0.5 }, 0);
      m += lettering('MAIN ST', 1290, 222, 6.5, ink, 1.1, { anchor: 'middle', gap: 0.5 }, 0);
      m += grp(lettering('ELM', 0, 0, 6.5, ink, 1.1, { anchor: 'middle', gap: 0.5 }, 0), 'translate(1164 330) rotate(90)');
      const shield = (x: number, y: number) =>
        F(`M${x - 7},${y - 8}H${x + 7}V${y}Q${x + 7},${y + 6} ${x},${y + 9}Q${x - 7},${y + 6} ${x - 7},${y}Z`, '#D8CCA4', 1.1) + L(`M${x - 5},${y - 6}H${x + 5}V${y}Q${x + 5},${y + 4.4} ${x},${y + 6.6}Q${x - 5},${y + 4.4} ${x - 5},${y}Z`, 0.5, ink) + lettering('9', x, y + 3, 8, ink, 1.4, { anchor: 'middle' }, 0);
      m += shield(66, 682) + shield(1578, 730) + shield(940, 640);
      // cigarette burn through the paper
      m += F(blob(312, 782, 13, 10, 7, 11, 0.3), d.radial(312, 782, 14, [[0, '#3A2414', 0.9], [0.7, '#6E4A26', 0.5], [1, '#6E4A26', 0]]));
      m += F(blob(312, 782, 6, 4.6, 8, 11, 0.45), '#2A2016', 0.9) + L(blob(312, 782, 7, 5.6, 8, 11, 0.45), 0.8, '#1A1008', 'opacity="0.7"');
      for (let k = 0; k < 5; k++) m += F(blob(80 + R() * 1440, 40 + R() * 820, 18 + R() * 20, 12 + R() * 14, 1200 + k), '#5E6A4A', 0, 'opacity="0.08"');
    }

    // ---- red marker: the route from our joint to the boss, notes, a ring round the boss
    {
      const i0 = nearestIdx([MAP3_LAYOUT.home.x, MAP3_LAYOUT.home.y + 36], road);
      const i1 = nearestIdx([MAP3_LAYOUT.boss.x, MAP3_LAYOUT.boss.y + 36], road);
      const mr = rnd(5);
      const route = road.slice(i0, i1 + 1).map(([x, y], k) => [x + Math.sin(k * 0.21) * 1.6 + (mr() - 0.5) * 0.6, y + 2 + Math.cos(k * 0.17) * 1.6] as Pt);
      const pr2 = pline(route);
      m += L(pr2, 6, '#9A2620', 'opacity="0.14" stroke-dasharray="12 7"') + L(pr2, 3.4, '#9A2620', 'opacity="0.88" stroke-dasharray="12 7"');
      for (const q of [0.12, 0.3, 0.47, 0.64, 0.82]) {
        const k = Math.floor(q * (route.length - 1));
        const a = route[k];
        const b = route[k + 3];
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        if (inPin(a[0], a[1], -6)) continue;
        m += grp(L('M-5,-5L1,0L-5,5', 2.8, '#9A2620', 'opacity="0.9"'), `translate(${f(a[0])} ${f(a[1])}) rotate(${f((ang * 180) / Math.PI)})`);
      }
      const { x, y } = MAP3_LAYOUT.boss;
      let ring = '';
      for (let k = 0; k <= 64; k++) {
        const a = (k / 50) * Math.PI * 2 + 0.5;
        const rr2 = 1 + Math.sin(k * 0.7) * 0.03;
        ring += (k ? 'L' : 'M') + `${f(x + Math.cos(a) * 94 * rr2)},${f(y - 18 + Math.sin(a) * 44 * rr2 + k * 0.1)}`;
      }
      m += L(ring, 2.8, '#9A2620', 'opacity="0.85"');
      m += lettering("DON'T", 1300, 76, 11, '#9A2620', 2, { jitter: 0.2, seed: 3 }, 0) + lettering('GO IN', 1300, 94, 11, '#9A2620', 2, { jitter: 0.2, seed: 4 }, 0);
      m += L('M1294,82q-22,4 -40,14l6,-1M1254,96l3,-6', 2, '#9A2620');
      m += lettering('NO GAS', 1505, 486, 10, '#9A2620', 1.9, { jitter: 0.2, seed: 5, anchor: 'middle' }, 0);
      m += L('M1490,472q-8,-14 -14,-28M1476,444l-1,6M1476,444l5,4', 1.8, '#9A2620');
      m += lettering('?!', 1580, 652, 12, '#9A2620', 2.2, { jitter: 0.2, seed: 6, anchor: 'end' }, 0);
    }

    // ---- stains on top: coffee, blood, grease
    m += coffeeRing(640, 128, 52, 1) + coffeeRing(1398, 836, 40, 2) + coffeeRing(1180, 240, 30, 3);
    m += grp(thumbprint(0, 0, 24, 4), 'translate(392 812) scale(1.5)');
    m += F(blob(1520, 520, 20, 14, 5), '#7A6440', 0, 'opacity="0.16"') + F(blob(260, 880, 30, 10, 6), '#7A6440', 0, 'opacity="0.16"');
    for (let k = 0; k < 8; k++) m += dot(1010 + R() * 60, 520 + R() * 40, 0.8 + R() * 1.8, '#6E1E18', 0.45);
    // sooty fingerprints along the edges where the map gets held, and a bored doodle in the margin
    for (const [x, y, rot, sd] of [[1520, 880, -30, 1], [1556, 820, -50, 2], [40, 480, 70, 3], [760, 18, 10, 4]] as [number, number, number, number][]) {
      let fpr = F(blob(0, 0, 9, 12, sd, 9, 0.2), '#2A2218', 0, 'opacity="0.16"');
      for (let k = 0; k < 6; k++) fpr += `<ellipse cx="0" cy="${f(k * 0.3)}" rx="${f(1.6 + k * 1.3)}" ry="${f(2.2 + k * 1.7)}" fill="none" stroke="#2A2218" stroke-width="0.8" stroke-dasharray="${f(4 + k * 2)} 1.6" opacity="0.28"/>`;
      m += grp(fpr, `translate(${x} ${y}) rotate(${rot})`);
    }
    m += L('M1430,880q-6,-14 6,-18q12,-2 12,10q0,8 -6,10l0,4h-8l0,-4Z', 1.1, '#2A3A5A', 'opacity="0.55"') + dot(1435, 868, 1.6, '#2A3A5A', 0.55) + dot(1443, 868, 1.6, '#2A3A5A', 0.55) + L('M1436,876h6', 0.8, '#2A3A5A', 'opacity="0.55"');

    // ---- fold creases (4 x 2 panels): panel shading, worn ridges, crease lines
    let fold = '';
    const cols = [0, 400, 800, 1200, 1600];
    for (let k = 0; k < 4; k++) {
      const g = d.linear(cols[k], 0, cols[k + 1], 0, k % 2 ? [[0, '#000000', 0.09], [0.4, '#000000', 0], [1, '#FFFFFF', 0.06]] : [[0, '#FFFFFF', 0.07], [0.6, '#000000', 0], [1, '#000000', 0.1]]);
      fold += F(rect(cols[k], 0, cols[k + 1], 900), g);
    }
    fold += F(rect(0, 0, 1600, 450), d.linear(0, 0, 0, 450, [[0, '#FFFFFF', 0.04], [1, '#000000', 0.07]]));
    fold += F(rect(0, 450, 1600, 900), d.linear(0, 450, 0, 900, [[0, '#FFFFFF', 0.05], [1, '#000000', 0.05]]));
    let crease = '';
    let ridge = '';
    for (const x of [400, 800, 1200]) {
      crease += `M${x},0C${x + 2},300 ${x - 2},600 ${x + 1},900`;
      ridge += `M${x + 1.6},0C${x + 3.6},300 ${x - 0.4},600 ${x + 2.6},900`;
    }
    crease += 'M0,450C500,452 1100,447 1600,451';
    ridge += 'M0,451.8C500,453.8 1100,448.8 1600,452.8';
    fold += L(crease, 1.6, '#4A3C22', 'opacity="0.38"') + L(ridge, 1.4, '#EFE6C8', 'opacity="0.45"');
    for (let k = 0; k < 40; k++) {
      const vx = k < 30;
      const x = vx ? [400, 800, 1200][k % 3] : R() * 1600;
      const y = vx ? R() * 900 : 450;
      fold += F(blob(x + 1, y, vx ? 3 : 14, vx ? 14 : 3, 900 + k), '#E6DCBC', 0, 'opacity="0.22"');
    }
    for (const x of [400, 800, 1200]) fold += F(blob(x, 450, 9, 7, x), '#E8DEC0', 0, 'opacity="0.4"');
    m += fold;
    // small wrinkles
    for (let k = 0; k < 18; k++) {
      const x = R() * 1600;
      const y = R() * 900;
      const a = R() * 6;
      m += L(`M${f(x)},${f(y)}l${f(Math.cos(a) * 18)},${f(Math.sin(a) * 18)}`, 0.8, '#E6DCBC', 'opacity="0.35"') + L(`M${f(x + 1)},${f(y + 1)}l${f(Math.cos(a) * 18)},${f(Math.sin(a) * 18)}`, 0.6, '#5A4A2E', 'opacity="0.18"');
    }

    s += d.clip(paper, m + late.join(''));
    // edge grime + torn fibres
    s += d.clip(paper, `<g filter="${d.blur(8)}">${L(paper, 46, '#5E4A26', 'opacity="0.3"')}</g>` + L(paper, 10, '#6E5A34', 'opacity="0.22"'));
    s += L(pline(tear), 3.2, '#E2D8BA') + L(pline(tear.map(([x, y]) => [x + 1.4, y - 1.6] as Pt)), 0.7, '#A8966C', 'opacity="0.8"');
    s += L(paper, 0.9, '#5A4A2E', 'opacity="0.6"');
    return s;
  });
}

// ============================================================================ pins (150 x 130, anchor bottom-centre)
const PIN_W = 150;
const PIN_H = 130;
const PLW = 1.3;
function pin(key: string, body: (d: Doc, t: Iso) => string): ArtAsset {
  return asset(key, PIN_W, PIN_H, 0.5, 1, (d) => body(d, new Iso(PIN_W / 2, PIN_H - 40)));
}
function pinLot(d: Doc, col: string, seed: number): string {
  const c = blob(75, 94, 64, 33, seed, 11, 0.14);
  let s = `<g filter="${d.blur(2.2)}" opacity="0.5">${F(blob(80, 98, 62, 31, seed + 1, 10, 0.16), '#140F08')}</g>`;
  s += F(c, d.radial(64, 86, 74, [[0, lt(col, 0.1)], [0.65, col], [1, dk(col, 0.3)]]));
  s += speckle(d, c, [10, 58, 130, 72], 110, [dk(col, 0.38), lt(col, 0.18), '#3A2E1C'], seed, 0.35, 1.0, 0.75);
  s += d.clip(c, L('M14,100q30,10 58,24M30,92q34,12 64,30', 0.8, dk(col, 0.3), 'opacity="0.6" stroke-dasharray="2 1.4"'));
  s += L(c, 0.9, INK, 'opacity="0.6"');
  return s;
}
/** Cartoon smoke puffs (outlined) rising from (x, y), drifting by dx per puff. */
function puffs(x: number, y: number, n: number, sc: number, dx: number, dark: boolean, seed: number): string {
  let s = '';
  const cols = dark ? ['#2E2A26', '#3E3A35', '#55514A', '#6E6A62', '#8A867C'] : ['#8A867A', '#9C988C', '#AEAA9C', '#BDB9AC', '#C8C4B6'];
  for (let k = 0; k < n; k++) {
    const r = (3 + k * 1.5) * sc;
    const cx = x + dx * k * (1 + k * 0.15);
    const cy = y - k * 7.2 * sc - k * k * 0.5 * sc;
    const p = blob(cx, cy, r * 1.1, r, seed + k, 7, 0.3);
    s += F(p, cols[Math.min(k, 4)], 0.8, `opacity="${f(1 - k * 0.12)}"`) + F(blob(cx - r * 0.25, cy - r * 0.3, r * 0.5, r * 0.35, seed + k + 9), '#FFFFFF', 0, 'opacity="0.12"');
  }
  return s;
}
/** Vertical planks + grime on a face frame of width w and height h. */
function planks(d: Doc, w: number, h: number, step: number, col: string, seed: number): string {
  let p = '';
  for (let x = step; x < w - 0.5; x += step) p += `M${f(x)},0V${f(-h)}`;
  return L(p, 0.5, dk(col, 0.45), 'opacity="0.7"') + grain(d, rect(0, -h, w, 0), [0, -h, w, h], Math.round(w / 3), seed, dk(col, 0.35), lt(col, 0.2), true);
}

function pinHome(): ArtAsset {
  return pin('map_home', (d, t) => {
    let s = pinLot(d, '#7E6A48', 3);
    const i0 = -0.4;
    const i1 = 0.3;
    const j0 = -0.3;
    const j1 = 0.26;
    const Hh = 28;
    // trash bags at the back left
    s += F(blob(40, 76, 7, 5, 2), '#22221E', 0.9) + F(blob(48, 79, 6, 4.5, 3), '#2E2E28', 0.9) + fly(42, 66, 0.8) + fly(51, 70, 0.7);
    const bx = box(t, i0, i1, j0, j1, 0, Hh, '#B5A880', '#BFB38A', '#8F845E', PLW);
    s += bx.fills + boxShade(d, t, bx, i0, i1, j1, 0, Hh, 0.45);
    const wl = (i1 - i0) * 48;
    const wr = (j1 - j0) * 48;
    let cl = '';
    for (let z = 4; z < Hh; z += 4.5) cl += `M0,${f(-z)}H${f(wl)}`;
    let cr = '';
    for (let z = 4; z < Hh; z += 4.5) cr += `M0,${f(-z)}H${f(wr)}`;
    let lf = L(cl, 0.5, '#6E6444', 'opacity="0.7"');
    lf += F(rect(4, -17, 12, 0), '#4A3220', 0.9) + L('M8,-17V0', 0.4, '#2A1A10') + dot(10.6, -8.5, 0.7, '#B59A50');
    lf += F('M7,-11.5l1,-2.6 0.8,2.4 0.9,-2.6 0.6,2.8q0.6,1.8 -1.6,2.2q-2.4,-0.2 -1.7,-2.2Z', '#7FB236', 0, 'opacity="0.85"');
    lf += F(rect(17, -21, 28, -12), '#4C5444', 0.9) + L('M22.5,-21V-12M17,-16.5H28', 0.6, '#8A7E5A') + L('M15,-19L30,-13', 2.4, INK) + L('M15,-19L30,-13', 1.4, '#8E6436');
    lf += F(blob(24, -4, 5, 3, 7), '#5E5232', 0, 'opacity="0.4"') + F(blob(2, -24, 3, 5, 8), '#7A2A22', 0, 'opacity="0.3"');
    s += d.clip(bx.left, grp(lf, swFace(t, i0, j1, 0)));
    let rf = L(cr, 0.5, '#4E4630', 'opacity="0.7"') + F(rect(8, -20, 16, -14), '#3A3A32', 0.7) + L('M9,-19h6M9,-17h6M9,-15h6', 0.4, '#77705A');
    rf += F(blob(18, -6, 6, 4, 9), '#3E3420', 0, 'opacity="0.35"') + rustDrip(12, -14, 8);
    s += d.clip(bx.right, grp(rf, seFace(t, i1, j1, 0)));
    s += bx.lines;
    // roof: back slope, chimney, gable, front slope (corrugated rusty tin)
    const rh = 15;
    const oh = 0.05;
    const z = Hh;
    s += F(poly([t.p(i0 - oh, j0 - oh, z), t.p(i1, j0 - oh, z), t.p(i1, -0.02, z + rh), t.p(i0 - oh, -0.02, z + rh)]), '#5A3A26', PLW);
    const ch = box(t, 0.14, 0.24, -0.22, -0.12, z, z + 28, '#7A4A34', '#8A5238', '#643826', PLW);
    s += ch.fills + L(`M${fp(t.p(0.14, -0.12, z + 22))}L${fp(t.p(0.24, -0.12, z + 22))}L${fp(t.p(0.24, -0.22, z + 22))}`, 0.6, '#4A2A1A') + ch.lines + F(t.qd(0.16, 0.22, -0.2, -0.14, z + 28), '#16120C');
    s += F(poly([t.p(i1, j1, z), t.p(i1, j0, z), t.p(i1, -0.02, z + rh)]), '#857A56', PLW);
    const front = poly([t.p(i0 - oh, j1 + oh, z), t.p(i1 + oh, j1 + oh, z), t.p(i1 + oh, -0.02, z + rh), t.p(i0 - oh, -0.02, z + rh)]);
    s += F(front, d.linear(...t.p(i0, 0, z + rh), ...t.p(i1, j1, z), [[0, '#8E5E3C'], [1, '#6E4428']]));
    let cor = '';
    for (let i = i0; i <= i1 + 0.01; i += 0.05) cor += pline([t.p(i, j1 + oh, z), t.p(i, -0.02, z + rh)]);
    s += d.clip(front, L(cor, 0.6, '#4A2C1A', 'opacity="0.7"') + rust(d, front, [[t.p(-0.2, 0.15, z + 6)[0], t.p(-0.2, 0.15, z + 6)[1], 4], [t.p(0.2, 0.1, z + 8)[0], t.p(0.2, 0.1, z + 8)[1], 3]], 4));
    // a curled-up corner of tin
    s += F(poly([t.p(i1 + oh, j1 + oh, z), t.p(i1 - 0.12, j1 + oh, z), t.p(i1 - 0.02, j1 + 0.02, z + 6)]), '#A87A54', 0.9);
    s += L(front, PLW);
    // ZOMBS BBQ board on the ridge
    const sb = rect(0, -17, 32, 0);
    s += grp(
      L('M5,0V6M27,0V6', 2.2, INK) + L('M5,0V6M27,0V6', 1, '#6A4524') + F(sb, '#2C2822', PLW) + L(rect(1.6, -15.4, 30.4, -1.6), 0.5, '#6A5A40') +
        `<g filter="${d.blur(1.2)}" opacity="0.7">${L(textD('ZOMBS', 16, -9, 6, { anchor: 'middle' }), 2.2, '#8FC23A')}</g>` +
        lettering('ZOMBS', 16, -9, 6, '#A6D84A', 1.1, { anchor: 'middle' }, 0.4) +
        lettering('BBQ', 16, -2.6, 4.6, '#D2B25A', 0.9, { anchor: 'middle' }, 0.4) + F(blob(28, -14, 2, 1.4, 3), '#7A2A22', 0, 'opacity="0.6"'),
      swFace(t, -0.34, 0.0, z + rh - 3),
    );
    // smoke from the chimney
    const [sx, sy] = t.p(0.19, -0.17, z + 28);
    s += puffs(sx, sy - 3, 4, 0.8, 3.2, false, 11);
    // barrel smoker out front-right
    const [ox, oy] = t.p(0.5, 0.18);
    s += cyl(d, ox, oy, 6, 6, 0, 12, '#3A3833', '#26241F', '#2E2C28', PLW).s + F(ell(ox, oy - 3, 4, 1.4), '#C8622A', 0, 'opacity="0.7"') + L(`M${f(ox + 3)},${f(oy - 12)}v-6`, 1.8, INK) + puffs(ox + 3, oy - 20, 3, 0.55, 2, false, 15);
    s += F(blob(t.p(-0.1, 0.45)[0], t.p(-0.1, 0.45)[1], 5, 2, 4), '#6E9A2A', 0.6, 'opacity="0.8"');
    return s;
  });
}

function pinChuck(): ArtAsset {
  return pin('map_joint_chuck', (d, t) => {
    let s = pinLot(d, '#86704A', 5);
    const i0 = -0.42;
    const i1 = 0.34;
    const j0 = -0.3;
    const j1 = 0.22;
    const Hh = 22;
    const W = '#8A6036';
    const bx = box(t, i0, i1, j0, j1, 0, Hh, '#7A5A36', W, '#62431F', PLW);
    const wr = (j1 - j0) * 48;
    s += bx.fills + boxShade(d, t, bx, i0, i1, j1, 0, Hh, 0.4) + d.clip(bx.right, grp(planks(d, wr, Hh, 3.6, '#62431F', 3), seFace(t, i1, j1, 0))) + bx.lines;
    // canvas chuckwagon roof
    const wl = (i1 - i0) * 48;
    const arch = `M-1,0C-1,-17 ${f(wl + 1)},-17 ${f(wl + 1)},0Z`;
    s += extrudeStack(t, arch, i0, j1, Hh, j1 - j0, '#CFC6A6', '#A89E7E');
    for (const jj of [0.06, -0.1, -0.24]) s += grp(L(`M${f(wl / 2)},-12.75C${f(wl * 0.8)},-12.75 ${f(wl + 1)},-8 ${f(wl + 1)},0`, 0.8, '#6E664E'), swFace(t, i0, jj, Hh));
    s += grp(F(rect(wl * 0.7, -9, wl * 0.9, -5), '#B8A884', 0.5) + F(blob(wl * 0.6, -6, 4, 2, 3), '#7A6A44', 0, 'opacity="0.5"'), swFace(t, i0, -0.12, Hh));
    // wagon wheel leaning on the right wall
    {
      const cx = 12;
      const cy = -9.5;
      let wh = `<circle cx="${cx}" cy="${cy}" r="8.6" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="8.6" fill="none" stroke="#6A4524" stroke-width="2.2"/>`;
      let sp = '';
      for (let k = 0; k < 8; k++) sp += `M${cx},${cy}l${f(Math.cos((k * Math.PI) / 4) * 7.6)},${f(Math.sin((k * Math.PI) / 4) * 7.6)}`;
      wh += L(sp, 1.6, INK) + L(sp, 0.8, '#8A6036') + dot(cx, cy, 2, '#3A2A1A') + `<circle cx="${cx}" cy="${cy}" r="8.6" fill="none" stroke="#7A7A70" stroke-width="0.5"/>`;
      s += grp(wh, seFace(t, i1 + 0.012, j1 - 0.02, 0));
    }
    // false front
    const ff = `M-3,0V-36H3V-41H9V-45H${f(wl - 9)}V-41H${f(wl - 3)}V-36H${f(wl + 3)}V0Z`;
    s += extrudeStack(t, ff, i0, j1 + 0.035, 0, 0.035, '#94683A', '#5E401F');
    let fc = '';
    let pl = '';
    for (let y = -5.5; y > -45; y -= 5.5) pl += `M-3,${f(y)}H${f(wl + 3)}`;
    fc += L(pl, 0.5, '#5A3C1C', 'opacity="0.8"') + grain(d, ff, [-3, -45, wl + 6, 45], 26, 6, '#5A3C1C', '#B08452');
    fc += lettering('CHOW', wl / 2, -27.5, 7.5, '#DCD2B2', 1.4, { anchor: 'middle', jitter: 0.12, seed: 3 }, 0.6);
    fc += F(rect(wl / 2 - 6, -15, wl / 2 + 6, 0), '#1E1810', 0.8);
    fc += F(rect(wl / 2 - 5.5, -11.5, wl / 2 - 0.4, -4.5), '#A87A48', 0.6) + F(rect(wl / 2 + 0.4, -11.5, wl / 2 + 5.5, -4.5), '#A87A48', 0.6);
    fc += F(rect(0, -13, 6, -6), '#2A2620', 0.6) + F(rect(wl - 6, -13, wl, -6), '#2A2620', 0.6) + L(`M-0.6,-6.5h7M${f(wl - 6.6)},-6.5h7`, 1, '#5A3C1C');
    fc += F(blob(wl - 4, -20, 2, 1.5, 4), '#16120C') + F(blob(6, -30, 1.4, 1.4, 5), '#16120C');
    // cow skull on top
    fc += F(`M${f(wl / 2 - 3)},-46q3,-3 6,0l-1,4q-2,1.6 -4,0Z`, '#D8D0B8', 0.7) + L(`M${f(wl / 2 - 3)},-45.5q-4,-1 -5,-4M${f(wl / 2 + 3)},-45.5q4,-1 5,-4`, 1.8, INK) + L(`M${f(wl / 2 - 3)},-45.5q-4,-1 -5,-4M${f(wl / 2 + 3)},-45.5q4,-1 5,-4`, 0.9, '#D8D0B8') + dot(wl / 2 - 1.2, -44.6, 0.6, INK) + dot(wl / 2 + 1.2, -44.6, 0.6, INK);
    s += grp(d.clip(ff, fc), swFace(t, i0, j1 + 0.035, 0));
    // porch awning + posts
    const aw = poly([t.p(i0 - 0.03, j1 + 0.04, 22), t.p(i1 + 0.03, j1 + 0.04, 22), t.p(i1 + 0.03, j1 + 0.17, 18.5), t.p(i0 - 0.03, j1 + 0.17, 18.5)]);
    for (const pi of [i0 + 0.01, i1 - 0.01]) s += L(pline([t.p(pi, j1 + 0.155, 0), t.p(pi, j1 + 0.155, 19)]), 3, INK) + L(pline([t.p(pi, j1 + 0.155, 0), t.p(pi, j1 + 0.155, 19)]), 1.6, '#7A5430');
    s += F(aw, '#7A5430', PLW);
    let awl = '';
    for (let i = i0; i < i1; i += 0.07) awl += pline([t.p(i, j1 + 0.04, 22), t.p(i, j1 + 0.17, 18.5)]);
    s += d.clip(aw, L(awl, 0.5, '#4A3018'));
    // barrel + spittoon
    const [bx2, by2] = t.p(-0.52, 0.38);
    s += cyl(d, bx2, by2, 5, 5.4, 0, 10, '#7A5430', '#5A3A1E', '#6A4828', PLW).s + L(`M${f(bx2 - 5.2)},${f(by2 - 3)}h10.4M${f(bx2 - 5.3)},${f(by2 - 7.5)}h10.6`, 0.8, '#3A3A32');
    s += fly(bx2 + 2, by2 - 16, 0.8);
    return s;
  });
}

function burger(d: Doc, cx: number, base: number, sc = 1): string {
  const X = (v: number) => cx + v * sc;
  const Y = (v: number) => base + v * sc;
  let s = '';
  // supports
  s += L(`M${f(X(-8))},${f(Y(0))}l0,7M${f(X(8))},${f(Y(0))}l0,5`, 2.6, INK) + L(`M${f(X(-8))},${f(Y(0))}l0,7M${f(X(8))},${f(Y(0))}l0,5`, 1.2, '#5E5A50');
  const bot = `M${f(X(-19))},${f(Y(-8))}Q${f(X(-20))},${f(Y(0))} ${f(X(-13))},${f(Y(0))}H${f(X(13))}Q${f(X(20))},${f(Y(0))} ${f(X(19))},${f(Y(-8))}Z`;
  s += F(bot, d.linear(X(-20), 0, X(20), 0, [[0, '#B8884C'], [0.55, '#A87A42'], [0.62, '#8A5E30'], [1, '#7A5228']]), PLW);
  const pat = `M${f(X(-23))},${f(Y(-15))}Q${f(X(-25))},${f(Y(-11))} ${f(X(-22))},${f(Y(-7))}H${f(X(22))}Q${f(X(25))},${f(Y(-11))} ${f(X(23))},${f(Y(-15))}Z`;
  s += F(pat, '#4E3220', PLW) + speckle(d, pat, [X(-24), Y(-16), 48 * sc, 10 * sc], 26, ['#2A1A10', '#6E4A30'], 4, 0.4, 0.9, 0.9);
  s += F(`M${f(X(-21))},${f(Y(-15))}l3,5 2,-5 6,7 3,-7 8,4 4,-4 5,6 3,-6Z`, '#B8963A', 0.8);
  s += F(`M${f(X(-23))},${f(Y(-15))}q2,-3 5,-1q3,-3 6,0q3,-3 6,0q3,-3 6,0q3,-3 6,0q3,-3 6,0q3,-3 6,0l1,1Z`, '#6A8030', 0.8);
  const dome = `M${f(X(-22))},${f(Y(-16))}C${f(X(-22))},${f(Y(-37))} ${f(X(22))},${f(Y(-37))} ${f(X(22))},${f(Y(-16))}Z`;
  const bt = bite(d, X(16), Y(-30), 8 * sc, 2.5, 0, 0);
  s += F(dome, '#2A2018');
  let dm = F(dome, d.linear(X(-20), Y(-34), X(18), Y(-14), [[0, '#C8965A'], [0.5, '#AE7E44'], [0.56, '#946634'], [1, '#7E5428']]), 0);
  const r = rnd(8);
  for (let k = 0; k < 9; k++) {
    const sx = X(-14 + r() * 24);
    const sy = Y(-31 + r() * 10);
    dm += `<ellipse cx="${f(sx)}" cy="${f(sy)}" rx="${f(1.1 * sc)}" ry="${f(0.6 * sc)}" fill="#E0D4B2" transform="rotate(${f(r() * 60 - 30)} ${f(sx)} ${f(sy)})"/>`;
  }
  dm += F(blob(X(-8), Y(-29), 6 * sc, 3 * sc, 5), '#FFFFFF', 0, 'opacity="0.15"') + crack(X(-4), Y(-18), -1.6, 9 * sc, 7, 0.6) + F(blob(X(5), Y(-21), 4, 2.4, 6), '#5E3E1E', 0, 'opacity="0.4"');
  dm += L(dome, PLW);
  s += masked(dm, bt.mask) + bt.ink(dome);
  return s;
}

function pinHank(): ArtAsset {
  return pin('map_joint_hank', (d, t) => {
    let s = pinLot(d, '#8A7450', 7);
    const a = 0.36;
    const j0 = -0.28;
    const j1 = 0.28;
    const Hh = 22;
    // hay bale at the back right
    s += F(blob(t.p(0.48, -0.22)[0], t.p(0.48, -0.22)[1] - 3, 7, 4.5, 3), '#A89452', PLW) + L(`M${f(t.p(0.48, -0.22)[0] - 4)},${f(t.p(0.48, -0.22)[1] - 3)}h8`, 0.5, '#6E5E2E');
    const bx = box(t, -a, a, j0, j1, 0, Hh, '#6A2E22', '#7A3424', '#58241A', PLW);
    s += bx.fills + boxShade(d, t, bx, -a, a, j1, 0, Hh, 0.35);
    s += d.clip(bx.right, grp(planks(d, (j1 - j0) * 48, Hh, 3, '#58241A', 9) + F(rect(10, -14, 18, -8), '#24160F', 0.7), seFace(t, a, j1, 0)));
    s += bx.lines;
    const prof: [number, number][] = [
      [-a - 0.04, Hh - 1],
      [-a * 0.58, Hh + 11],
      [0, Hh + 17],
      [a * 0.58, Hh + 11],
      [a + 0.04, Hh - 1],
    ];
    const rc = ['#6A665C', '#5E5A50', '#45413A', '#3A3631'];
    for (let k = 0; k < 4; k++) {
      const [ia, za] = prof[k];
      const [ib, zb] = prof[k + 1];
      const q = poly([t.p(ia, j0 - 0.04, za), t.p(ib, j0 - 0.04, zb), t.p(ib, j1 + 0.01, zb), t.p(ia, j1 + 0.01, za)]);
      let sh = '';
      for (let u = 0.25; u < 1; u += 0.25) sh += pline([t.p(ia + (ib - ia) * u, j0 - 0.04, za + (zb - za) * u), t.p(ia + (ib - ia) * u, j1 + 0.01, za + (zb - za) * u)]);
      s += F(q, rc[k], PLW) + L(sh, 0.5, dk(rc[k], 0.35));
    }
    s += rust(d, poly([t.p(0, j0, Hh + 17), t.p(a, j0, Hh), t.p(a, j1, Hh), t.p(0, j1, Hh + 17)]), [[t.p(0.2, 0, Hh + 10)[0], t.p(0.2, 0, Hh + 10)[1], 3]], 2);
    // front gable wall
    const gw: [number, number][] = [
      [-a, 0],
      [a, 0],
      [a, Hh],
      [a * 0.58, Hh + 10.4],
      [0, Hh + 16],
      [-a * 0.58, Hh + 10.4],
      [-a, Hh],
    ];
    const gp = poly(gw.map(([i, z]) => t.p(i, j1, z)));
    s += F(gp, '#7E3626');
    const w = 2 * a * 48;
    let gf = planks(d, w, Hh + 16, 3, '#7E3626', 11);
    gf += F(rect(9, -15, w - 9, 0), '#6A2C20', 0.9);
    const trim = `M9,-15H${f(w - 9)}V0H9ZM9,-15L${f(w - 9)},0M${f(w - 9)},-15L9,0M${f(w / 2)},-15V0`;
    gf += L(trim, 2.2, INK) + L(trim, 1.2, '#C9C1A6');
    gf += F(rect(w / 2 - 3.6, -28, w / 2 + 3.6, -21), '#24160F', 0.8) + L(`M${f(w / 2 - 3)},-21.5l2,-2 1.6,2 2,-2.4`, 0.8, '#A89452');
    gf += F(blob(6, -6, 4, 6, 3), '#3A1A12', 0, 'opacity="0.35"') + scratches(d, rect(0, -Hh, w, 0), [0, -Hh, w, Hh], 14, '#C9A890', 4);
    s += d.clip(gp, grp(gf, swFace(t, -a, j1, 0)));
    const gl = pline(gw.slice(2).concat([gw[0]]).map(([i, z]) => t.p(i, j1, z)));
    s += L(gp, PLW) + L(pline(gw.slice(2).map(([i, z]) => t.p(i, j1, z + 0.6))), 1, '#C9C1A6');
    void gl;
    // giant fibreglass burger on the ridge, with a vulture on top
    const [bxx, byy] = t.p(0, 0, Hh + 17);
    s += burger(d, bxx, byy + 1, 0.95);
    s += fly(bxx - 12, byy - 38, 0.9) + fly(bxx + 4, byy - 42, 0.8) + fly(bxx + 15, byy - 33, 0.7);
    return s;
  });
}

function cabbage(d: Doc, x: number, y: number, r: number, seed: number): string {
  const rr = rnd(seed);
  let s = F(ell(x, y, r * 1.05, r * 0.82), '#5E7438', PLW);
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI + (k / 5) * Math.PI;
    const lx = x + Math.cos(a) * r * 0.55;
    const ly = y + Math.sin(a) * r * 0.45 - r * 0.1;
    s += F(blob(lx, ly, r * 0.6, r * 0.48, seed + k, 7, 0.25), k % 2 ? '#86A052' : '#9AB264', 0.8);
    s += L(`M${f(lx)},${f(ly + r * 0.35)}q${f((rr() - 0.5) * 2)},${f(-r * 0.3)} 0,${f(-r * 0.6)}`, 0.5, '#C8D09A');
  }
  s += F(blob(x, y - r * 0.25, r * 0.45, r * 0.36, seed + 9), '#B2C47E', 0.8) + F(blob(x + r * 0.4, y + r * 0.1, r * 0.2, r * 0.14, seed + 10), '#6E5A2E', 0, 'opacity="0.6"');
  s += d.clip(ell(x, y, r * 1.05, r * 0.82), F(`M${f(x)},${f(y - r)}H${f(x + r * 1.2)}V${f(y + r)}H${f(x + r * 0.3)}Z`, '#000000', 0, 'opacity="0.14"'));
  return s;
}
function turret(d: Doc, x: number, y: number, seed: number): string {
  let s = F(ell(x + 4, y + 1, 12, 5), '#140F08', 0, 'opacity="0.3"');
  const c = cyl(d, x, y, 9, 8.4, 0, 30, '#8E8A76', '#66625A', '#7A7668', PLW);
  s += c.s;
  let bl = '';
  for (let z = 6; z < 30; z += 6) bl += `M${f(x - 8.6)},${f(y - z)}Q${f(x)},${f(y - z + 5)} ${f(x + 8.6)},${f(y - z)}`;
  for (let k = 0; k < 4; k++) bl += `M${f(x - 6 + k * 4 + (k % 2) * 2)},${f(y - 6 - (k % 2) * 6)}v-6`;
  s += d.clip(c.body, L(bl, 0.5, '#4E4A42'));
  s += F(blob(x - 4, y - 8, 3, 6, seed), '#55702E', 0, 'opacity="0.6"');
  // merlons
  for (let k = 0; k < 4; k++) {
    const mx = x - 7 + k * 4.6;
    s += F(rect(mx, y - 34.5 + Math.abs(k - 1.5) * 0.8, mx + 2.8, y - 29.5 + Math.abs(k - 1.5) * 1.3), k > 1 ? '#6E6A5E' : '#9A9682', 0.8);
  }
  s += cabbage(d, x, y - 36, 10, seed + 3);
  return s;
}

function pinVera(): ArtAsset {
  return pin('map_joint_vera', (d, t) => {
    let s = pinLot(d, '#7E7448', 13);
    const i0 = -0.34;
    const i1 = 0.3;
    const j0 = -0.26;
    const j1 = 0.22;
    const Hh = 20;
    s += turret(d, ...t.p(0.4, -0.34), 5);
    const bx = box(t, i0, i1, j0, j1, 0, Hh, '#9AAA8E', '#93A28A', '#6E7C66', PLW);
    s += bx.fills;
    // plants seen through grimy glass + mullions
    const glass = (w: number, seed: number) => {
      let g = '';
      const r = rnd(seed);
      for (let k = 0; k < 5; k++) g += F(blob(r() * w, -4 - r() * 10, 4 + r() * 4, 3 + r() * 4, seed + k), k % 2 ? '#4E6A2E' : '#3E5A26', 0, 'opacity="0.55"');
      let mu = '';
      for (let x = 5; x < w; x += 5.5) mu += `M${f(x)},0V${-Hh}`;
      mu += `M0,-10H${f(w)}`;
      g += L(mu, 0.9, '#C6CAB4', 'opacity="0.85"') + F(rect(0, -4, w, 0), '#5E5232', 0, 'opacity="0.45"');
      g += F(rect(w * 0.4, -18, w * 0.4 + 5, -11), '#1A1E16', 0.4) + crack(w * 0.7, -15, 2.2, 7, seed, 0.5, '#E8ECDC');
      return g;
    };
    s += d.clip(bx.left, grp(glass((i1 - i0) * 48, 3), swFace(t, i0, j1, 0))) + d.clip(bx.right, grp(glass((j1 - j0) * 48, 9), seFace(t, i1, j1, 0)));
    s += boxShade(d, t, bx, i0, i1, j1, 0, Hh, 0.3) + bx.lines;
    // glass gable roof
    const rh = 12;
    s += F(poly([t.p(i0 - 0.03, j0 - 0.03, Hh), t.p(i1 + 0.03, j0 - 0.03, Hh), t.p(i1 + 0.03, -0.02, Hh + rh), t.p(i0 - 0.03, -0.02, Hh + rh)]), '#6E7C66', PLW);
    s += F(poly([t.p(i1, j1, Hh), t.p(i1, j0, Hh), t.p(i1, -0.02, Hh + rh)]), '#7E8C74', PLW);
    const fr2 = poly([t.p(i0 - 0.03, j1 + 0.03, Hh), t.p(i1 + 0.03, j1 + 0.03, Hh), t.p(i1 + 0.03, -0.02, Hh + rh), t.p(i0 - 0.03, -0.02, Hh + rh)]);
    let rl = '';
    for (let i = i0; i <= i1; i += 0.08) rl += pline([t.p(i, j1 + 0.03, Hh), t.p(i, -0.02, Hh + rh)]);
    s += F(fr2, '#A6B49A') + d.clip(fr2, L(rl, 0.8, '#D2D6C2') + F(blob(...t.p(-0.1, 0.1, Hh + 5), 9, 4, 5), '#6E7A4A', 0, 'opacity="0.4"')) + L(fr2, PLW);
    // gate with a carrot portcullis
    const gw = (i1 - i0) * 48;
    let gt = F(`M${f(gw / 2 - 6)},0V-9Q${f(gw / 2)},-15 ${f(gw / 2 + 6)},-9V0Z`, '#2A2A20', PLW);
    for (let k = 0; k < 4; k++) gt += F(`M${f(gw / 2 - 4.5 + k * 3)},-1l1,-10 1,10Z`, '#B0662E', 0.5);
    gt += L(`M${f(gw / 2 - 6)},-5H${f(gw / 2 + 6)}`, 0.8, '#5A4A2A');
    s += grp(gt, swFace(t, i0, j1 + 0.005, 0));
    s += turret(d, ...t.p(-0.44, 0.3), 9);
    // pennant on the left turret
    const [px, py] = t.p(-0.44, 0.3, 50);
    s += L(`M${f(px)},${f(py + 4)}v-14`, 1.4, INK) + F(`M${f(px)},${f(py - 10)}l12,3 -12,4Z`, '#55702E', 0.8) + F(`M${f(px + 3)},${f(py - 7.6)}q3,-2 5,1q-3,1.6 -5,-1Z`, '#C8D09A');
    // sharpened-carrot stakes along the front, one with a skull
    for (let k = 0; k < 6; k++) {
      const [cx, cy] = t.p(-0.3 + k * 0.12, 0.42);
      s += F(`M${f(cx - 1.8)},${f(cy)}L${f(cx)},${f(cy - 12)}L${f(cx + 1.8)},${f(cy)}Z`, '#B0662E', 0.8) + L(`M${f(cx - 1)},${f(cy - 4)}h1.6M${f(cx - 0.6)},${f(cy - 7)}h1`, 0.4, '#6E3A1A') + L(`M${f(cx)},${f(cy)}l-2,2M${f(cx)},${f(cy)}l2,2`, 0.9, '#55702E');
      if (k === 4) s += F(ell(cx, cy - 12, 3, 3.2), '#D8D0B8', 0.7) + dot(cx - 1.1, cy - 12.2, 0.8, INK) + dot(cx + 1.1, cy - 12.2, 0.8, INK) + L(`M${f(cx - 1)},${f(cy - 10)}h2`, 0.4, INK);
    }
    return s;
  });
}

function pinCrunch(): ArtAsset {
  return pin('map_joint_crunch', (d, t) => {
    let s = pinLot(d, '#8A7650', 17);
    const i0 = -0.36;
    const i1 = 0.32;
    const j0 = -0.28;
    const j1 = 0.24;
    const Hh = 22;
    const bx = box(t, i0, i1, j0, j1, 0, Hh, '#5E584C', '#9A8862', '#706244', PLW);
    s += bx.fills + boxShade(d, t, bx, i0, i1, j1, 0, Hh, 0.4);
    const wl = (i1 - i0) * 48;
    const wr = (j1 - j0) * 48;
    let lf = planks(d, wl, Hh, 3.4, '#9A8862', 4);
    lf += F(rect(5, -16, 21, -8), '#2A1A10', 0.8) + F(rect(6, -15, 20, -9), '#8E4A1E', 0, 'opacity="0.6"') + F(`M3.6,-16.4L22.4,-16.4L24,-21L2,-21Z`, '#7A2026', 0.8) + L('M8,-21L6.4,-16.4M13,-21V-16.4M18,-21L19.6,-16.4', 2.4, '#CDC3A8');
    lf += F(rect(25, -15, 30.5, 0), '#3A2A1A', 0.8) + F(blob(12, -4, 6, 3, 5), '#5E4A20', 0, 'opacity="0.5"');
    s += d.clip(bx.left, grp(lf, swFace(t, i0, j1, 0)));
    s += d.clip(bx.right, grp(planks(d, wr, Hh, 3.4, '#706244', 6) + rustDrip(8, -18, 10) + F(rect(12, -18, 20, -12), '#3A3832', 0.6), seFace(t, i1, j1, 0)));
    s += bx.lines + F(t.qd(i0 + 0.04, i0 + 0.14, j0 + 0.05, j0 + 0.13, Hh), '#3A3630', 0.6);
    // the giant bucket on the roof
    const X = t.p(-0.02, -0.02)[0];
    const Y = t.p(-0.02, -0.02)[1];
    const z0 = Hh;
    const z1 = Hh + 28;
    const rb = 13;
    const rtp = 17.5;
    // drumsticks + a zombie hand sticking out (behind the rim front)
    const ds = (x: number, y: number, a: number, zombie = false) => {
      const ex = x + Math.cos(a) * 12;
      const ey = y + Math.sin(a) * 12;
      if (zombie) return L(`M${f(x)},${f(y)}L${f(ex)},${f(ey)}`, 4.8, INK) + L(`M${f(x)},${f(y)}L${f(ex)},${f(ey)}`, 3, '#88BB44') + L(`M${f(ex)},${f(ey)}l-1.6,-3.6M${f(ex)},${f(ey)}l0.4,-4.2M${f(ex)},${f(ey)}l2.4,-3.4M${f(ex)},${f(ey)}l3,-0.6`, 2.4, INK) + L(`M${f(ex)},${f(ey)}l-1.6,-3.6M${f(ex)},${f(ey)}l0.4,-4.2M${f(ex)},${f(ey)}l2.4,-3.4M${f(ex)},${f(ey)}l3,-0.6`, 1.2, '#88BB44');
      return L(`M${f(x)},${f(y)}L${f(ex)},${f(ey)}`, 3, INK) + L(`M${f(x)},${f(y)}L${f(ex)},${f(ey)}`, 1.6, '#D8D0B8') + F(blob(ex, ey, 4.4, 3.4, Math.round(a * 10)), '#A8743A', PLW);
    };
    const top = Y - z1;
    s += ds(X - 8, top + 1, -2.0) + ds(X + 2, top, -1.4, true) + ds(X + 9, top + 1, -0.9) + ds(X - 2, top + 1, -1.75);
    const c = cyl(d, X, Y, rb, rtp, z0, z1, '#CDC3A8', '#A39A82', '#2A1E14', PLW);
    let st = '';
    const n = 10;
    for (let k = 0; k < n; k += 2) {
      const a0 = Math.PI - (k / n) * Math.PI;
      const a1 = Math.PI - ((k + 1) / n) * Math.PI;
      st += poly([
        [X + Math.cos(a0) * rtp, Y - z1],
        [X + Math.cos(a1) * rtp, Y - z1],
        [X + Math.cos(a1) * rb, Y - z0 + 4],
        [X + Math.cos(a0) * rb, Y - z0 + 4],
      ]);
    }
    s += F(c.body, '#CDC3A8') + d.clip(c.body, F(st, '#76222A') + F(c.body, d.linear(X - rtp, 0, X + rtp, 0, [[0, '#FFFFFF', 0.1], [0.55, '#000000', 0], [0.7, '#000000', 0.25], [1, '#000000', 0.35]])) + F(blob(X + 4, Y - z0 - 8, 5, 3, 2), '#5E4A20', 0, 'opacity="0.45"') + L(`M${f(X - 15)},${f(Y - z1 + 5)}Q${f(X)},${f(Y - z1 + 10)} ${f(X + 15)},${f(Y - z1 + 5)}`, 3.2, '#D8D0BA')) + L(c.body, PLW);
    // front rim over the drumstick bases
    s += L(`M${f(X - rtp)},${f(Y - z1)}A${f(rtp)},${f(rtp * K)} 0 0 0 ${f(X + rtp)},${f(Y - z1)}`, 3.6, INK) + L(`M${f(X - rtp)},${f(Y - z1)}A${f(rtp)},${f(rtp * K)} 0 0 0 ${f(X + rtp)},${f(Y - z1)}`, 2, '#D8D0BA');
    // rooster weathervane
    const vy = top - 12;
    s += L(`M${f(X + 4)},${f(top + 2)}V${f(vy - 14)}`, 2, INK) + L(`M${f(X + 4)},${f(top + 2)}V${f(vy - 14)}`, 0.9, '#6E5A40');
    s += L(`M${f(X - 4)},${f(vy)}H${f(X + 12)}M${f(X + 4)},${f(vy - 3)}V${f(vy + 3)}`, 1.6, INK) + L(`M${f(X + 12)},${f(vy)}l-2,-1.4M${f(X + 12)},${f(vy)}l-2,1.4`, 1.2, INK);
    const rx = X + 4;
    const ry = vy - 11;
    s += F(`M${f(rx - 6)},${f(ry - 2)}q-3,-5 1,-7q1,3 3,4q2,-6 6,-5l1.6,-2 0.6,2.4 1.8,0.6 -2,1.2q0,4 -3,6q-2,2 -5,1.4Z`, '#3E3226', 0.8) + F(`M${f(rx + 4.4)},${f(ry - 9.8)}l0.8,-1.6 1,1.2 0.8,-1.4 0.4,2Z`, '#7A2A22', 0.5) + L(`M${f(rx)},${f(ry + 1.4)}v3`, 1, INK);
    // feathers and a bone on the lot
    const r = rnd(4);
    for (let k = 0; k < 6; k++) {
      const fx = 30 + r() * 90;
      const fy = 100 + r() * 16;
      s += F(`M${f(fx)},${f(fy)}q2,-2 4,-1q-1,2 -4,1Z`, '#D8D0B8', 0.4);
    }
    s += L('M108,108l7,-2', 2.4, INK) + L('M108,108l7,-2', 1.2, '#D8D0B8') + fly(112, 100, 0.8);
    return s;
  });
}

function eiffel(x: number, y: number, h: number): string {
  const w = h * 0.26;
  const legs = `M${f(x - w)},${f(y)}Q${f(x - w * 0.3)},${f(y - h * 0.5)} ${f(x - 0.8)},${f(y - h)}M${f(x + w)},${f(y)}Q${f(x + w * 0.3)},${f(y - h * 0.5)} ${f(x + 0.8)},${f(y - h)}`;
  const ws = (q: number) => w * (1 - q) * (1 - q * 0.3) + 0.8 * q;
  let lat = '';
  const qs = [0, 0.18, 0.4, 0.62, 0.85];
  for (let k = 0; k < qs.length - 1; k++) {
    const qa = qs[k];
    const qb = qs[k + 1];
    lat += `M${f(x - ws(qa))},${f(y - h * qa)}L${f(x + ws(qb))},${f(y - h * qb)}M${f(x + ws(qa))},${f(y - h * qa)}L${f(x - ws(qb))},${f(y - h * qb)}`;
  }
  const plat = `M${f(x - ws(0.18) - 1)},${f(y - h * 0.18)}H${f(x + ws(0.18) + 1)}M${f(x - ws(0.4) - 1)},${f(y - h * 0.4)}H${f(x + ws(0.4) + 1)}`;
  const arch = `M${f(x - w * 0.7)},${f(y)}Q${f(x)},${f(y - h * 0.16)} ${f(x + w * 0.7)},${f(y)}`;
  let s = L(legs + plat + arch, 2.4, INK) + L(legs + plat + arch, 1.1, '#7A6440') + L(lat, 0.45, '#3A2E1E');
  s += L(`M${f(x)},${f(y - h)}v-5`, 1.4, INK) + dot(x, y - h - 5.5, 1.2, '#B83A2A') + `<circle cx="${f(x)}" cy="${f(y - h - 5.5)}" r="3" fill="#B83A2A" opacity="0.2"/>`;
  return s;
}

function pinSnob(): ArtAsset {
  return pin('map_joint_snob', (d, t) => {
    // cobbled lot
    const c = blob(75, 94, 64, 33, 19, 11, 0.12);
    let s = `<g filter="${d.blur(2.2)}" opacity="0.5">${F(blob(80, 98, 62, 31, 20, 10, 0.16), '#140F08')}</g>` + F(c, '#8A867A');
    let cb = '';
    const r = rnd(21);
    for (let k = 0; k < 120; k++) cb += F(ell(14 + r() * 122, 62 + r() * 64, 2.2, 1.3), k % 3 ? '#9C988C' : '#76726A', 0.35);
    s += d.clip(c, cb + F(blob(100, 110, 14, 5, 3), '#5E5232', 0, 'opacity="0.4"')) + L(c, 0.9, INK, 'opacity="0.6"');
    const a0 = -0.36;
    const a1 = 0.34;
    const j0 = -0.27;
    const j1 = 0.25;
    const Hh = 26;
    const bx = box(t, a0, a1, j0, j1, 0, Hh, '#B2A886', '#C2B794', '#988E6E', PLW);
    s += bx.fills + boxShade(d, t, bx, a0, a1, j1, 0, Hh, 0.35);
    const wl = (a1 - a0) * 48;
    const wr = (j1 - j0) * 48;
    const stoneLines = (w: number) => {
      let p = '';
      for (let z = 4; z < Hh; z += 4) {
        p += `M0,${-z}H${f(w)}`;
        for (let x = (z / 4) % 2 ? 3 : 6; x < w; x += 6) p += `M${f(x)},${-z}v4`;
      }
      return L(p, 0.4, '#7E7458', 'opacity="0.7"');
    };
    let lf = stoneLines(wl);
    for (const wx of [3, 13.5, 24]) lf += F(rect(wx, -17, wx + 6, -3), '#2A2C2A', 0.8) + L(`M${f(wx + 3)},-17V-3`, 0.5, '#8A8676') + L(`M${f(wx + 1)},-15l2,3`, 0.6, '#FFFFFF', 'opacity="0.35"');
    lf += F(rect(24, -17, 30, 0), '#3A2A1E', 0.8) + dot(29, -8, 0.6, '#C9A64A');
    for (const wx of [3, 13.5]) lf += F(rect(wx - 0.6, -3.4, wx + 6.6, -1), '#6A4524', 0.5) + L(`M${f(wx + 1)},-3.4l-0.6,-2M${f(wx + 3)},-3.4l0.4,-2.4M${f(wx + 5)},-3.4l0.8,-1.6`, 0.6, '#5A4A2A');
    lf += F(blob(10, -22, 6, 2.4, 4), '#5E5232', 0, 'opacity="0.35"');
    s += d.clip(bx.left, grp(lf, swFace(t, a0, j1, 0)));
    let rf = stoneLines(wr);
    rf += F(rect(9, -18, 15, -6), '#2A2C2A', 0.8) + rustDrip(14, -22, 12);
    s += d.clip(bx.right, grp(rf, seFace(t, a1, j1, 0))) + bx.lines;
    // mansard roof
    const oh = 0.03;
    const ins = 0.1;
    const z0 = Hh;
    const z1 = Hh + 13;
    const fL = poly([t.p(a0 - oh, j1 + oh, z0), t.p(a1 + oh, j1 + oh, z0), t.p(a1 - ins, j1 - ins, z1), t.p(a0 + ins, j1 - ins, z1)]);
    const fR = poly([t.p(a1 + oh, j1 + oh, z0), t.p(a1 + oh, j0 - oh, z0), t.p(a1 - ins, j0 + ins, z1), t.p(a1 - ins, j1 - ins, z1)]);
    const top = t.qd(a0 + ins, a1 - ins, j0 + ins, j1 - ins, z1);
    s += F(top, '#6A7078', PLW) + F(fR, '#434A52', PLW) + F(fL, '#5A626A', 0);
    let sc = '';
    for (let q = 0.25; q < 1; q += 0.25) sc += pline([t.p(a0 - oh + (ins + oh) * q, j1 + oh - (ins + oh) * q, z0 + (z1 - z0) * q), t.p(a1 + oh - (ins + oh) * q, j1 + oh - (ins + oh) * q, z0 + (z1 - z0) * q)]);
    s += d.clip(fL, L(sc, 0.5, '#3A4048') + F(blob(...t.p(0.2, 0.2, z0 + 4), 6, 2, 3), '#C8C4B4', 0, 'opacity="0.7"'));
    s += L(fL, PLW);
    // dormer
    const [dx, dy] = t.p(-0.1, j1 - 0.02, z0 + 7);
    s += F(`M${f(dx - 4)},${f(dy + 3)}V${f(dy - 3)}Q${f(dx)},${f(dy - 8)} ${f(dx + 4)},${f(dy - 1)}V${f(dy + 5)}Z`, '#B2A886', 0.9) + F(ell(dx, dy - 1, 2, 2.2), '#2A2C2A', 0.5);
    // tiny Eiffel antenna on the roof
    const [ex, ey] = t.p(0.05, -0.04, z1);
    s += L(`M${f(ex)},${f(ey - 20)}L${fp(t.p(a0 + ins, j1 - ins, z1))}M${f(ex)},${f(ey - 20)}L${fp(t.p(a1 - ins, j0 + ins, z1))}`, 0.4, '#2A2620', 'opacity="0.7"');
    s += eiffel(ex, ey, 30);
    // striped awning over the windows
    const aw = (u0: number, u1: number) => poly([t.p(u0, j1 + 0.005, 19), t.p(u1, j1 + 0.005, 19), t.p(u1, j1 + 0.15, 13), t.p(u0, j1 + 0.15, 13)]);
    const ai0 = a0 + 0.03;
    const ai1 = a1 - 0.17;
    const ns = 8;
    for (let k = 0; k < ns; k++) {
      const u0 = ai0 + ((ai1 - ai0) * k) / ns;
      const u1 = ai0 + ((ai1 - ai0) * (k + 1)) / ns;
      s += F(aw(u0, u1), k % 2 ? '#CFC4A6' : '#6E2630');
    }
    s += L(aw(ai0, ai1), PLW);
    const vw = (ai1 - ai0) * 48;
    let val = '';
    for (let k = 0; k < ns; k++) val += F(`M${f((k * vw) / ns)},0A${f(vw / ns / 2)},${f(vw / ns / 2)} 0 0 0 ${f(((k + 1) * vw) / ns)},0Z`, k % 2 ? '#B8AC8E' : '#5A1E26', 0.6);
    val += F(blob(vw * 0.6, 1, 4, 2, 6), '#3A2A1A', 0, 'opacity="0.4"');
    s += grp(val, swFace(t, ai0, j1 + 0.15, 13));
    // tiny bistro table + a rat with a baguette
    const [tx, ty] = t.p(0.24, 0.48);
    s += L(`M${f(tx)},${f(ty)}v-8`, 1.8, INK) + F(ell(tx, ty - 8, 5, 2.2), '#C8C4B4', 0.8) + F(ell(tx - 1, ty - 9.6, 1.4, 0.9), '#6E2630', 0.4);
    s += F(`M${f(tx - 18)},${f(ty + 4)}q3,-3 7,-1l2,-1 -0.4,2q-1,2 -8,0.6Z`, '#5E5A52', 0.6) + L(`M${f(tx - 18)},${f(ty + 4)}q-4,1 -6,-1`, 0.6, INK) + L(`M${f(tx - 6)},${f(ty + 1)}l8,-3`, 2.6, INK) + L(`M${f(tx - 6)},${f(ty + 1)}l8,-3`, 1.4, '#C8964E');
    return s;
  });
}

function pinBoss(): ArtAsset {
  return pin('map_joint_boss', (d, t) => {
    // scorched lot with embers and a red glow
    const c = blob(75, 94, 66, 34, 23, 11, 0.2);
    let s = `<g filter="${d.blur(2.2)}" opacity="0.55">${F(blob(80, 98, 62, 31, 24, 10, 0.16), '#140F08')}</g>`;
    s += F(c, d.radial(72, 92, 72, [[0, '#4A3426'], [0.6, '#3A2E26'], [1, '#2A221C']]));
    s += d.clip(c, F(ell(70, 96, 48, 20), d.radial(70, 96, 48, [[0, '#B8401E', 0.55], [1, '#B8401E', 0]])) + speckle(d, c, [10, 58, 130, 72], 80, ['#1A1410', '#5E4A3A'], 7, 0.4, 1.1, 0.8));
    const r = rnd(25);
    for (let k = 0; k < 6; k++) s += crack(30 + r() * 90, 90 + r() * 26, r() * 6, 10, 30 + k, 0.8, '#C8622A', 0);
    s += L(c, 0.9, INK, 'opacity="0.6"');
    const i0 = -0.5;
    const i1 = 0.26;
    const j0 = -0.24;
    const j1 = 0.24;
    // far wheels
    for (const wi of [-0.32, 0.4]) s += grp(F(ell(5, -4.6, 4.8, 4.8), '#1A1814', PLW), swFace(t, wi - 0.1, j0 + 0.02, 0));
    // box body
    const bx = box(t, i0, i1, j0, j1, 4, 36, '#7A5038', '#6A3E2A', '#4E2C1E', PLW);
    s += bx.fills + boxShade(d, t, bx, i0, i1, j1, 4, 36, 0.4);
    const wl = (i1 - i0) * 48;
    let lf = '';
    // flame decals licking up the side
    // hot-rod flames streaming back from the front end
    const fl = (y: number, len: number, lean: number) =>
      grp(F(tongue(0, 0, 6.4, len, lean), '#8E2A1E', 0.8) + F(tongue(0, 0, 4.2, len * 0.74, lean * 0.8), '#C0622A') + F(tongue(0, 0, 2, len * 0.45, lean * 0.6), '#C9A040'), `translate(${f(wl + 0.5)} ${f(y)}) rotate(-90)`);
    lf += fl(-15, 22, -2) + fl(-4.5, 30, 2) + fl(-9.5, 36, -1.5);
    lf += d.clip(rect(0, -32, wl, 0), F(blob(16, -10, 4, 3, 3), '#6A3E2A', 0) + F(blob(28, -6, 3, 2, 4), '#6A3E2A', 0));
    // serving window, glowing
    const sw = rect(16, -28, 33, -17);
    lf += F(sw, '#3A1608', 0.9) + F(sw, d.radial(24, -22, 12, [[0, '#E08A3A', 0.9], [1, '#7A2A10', 0.3]])) + L('M20,-28v5l-1,1M27,-28v4', 0.7, INK) + F(`M15,-28L34,-28L35.5,-32.5L13.5,-32.5Z`, '#4E3A2A', 0.8);
    lf += rust(d, rect(0, -32, wl, 0), [[6, -26, 4], [30, -6, 3], [14, -2, 3]], 5) + rustDrip(10, -24, 10) + rustDrip(31, -15, 8);
    s += d.clip(bx.left, grp(lf, swFace(t, i0, j1, 4)));
    let rf = rust(d, rect(0, -32, (j1 - j0) * 48, 0), [[8, -20, 4], [16, -6, 3]], 9) + L('M3,-30V-2', 0.5, '#2A1A10');
    s += d.clip(bx.right, grp(rf, seFace(t, i1, j1, 4))) + bx.lines;
    s += rust(d, bx.top, [[t.p(-0.2, 0, 36)[0], t.p(-0.2, 0, 36)[1], 4]], 13);
    // cab (front, toward +i)
    const cab = box(t, i1, 0.46, j0 + 0.02, j1 - 0.02, 4, 22, '#6E4430', '#6A3E2A', '#4E2C1E', PLW);
    s += cab.fills + cab.lines;
    const hood = box(t, 0.46, 0.6, j0 + 0.04, j1 - 0.04, 4, 15, '#7A4C34', '#6A3E2A', '#4E2C1E', PLW);
    s += hood.fills + hood.lines;
    // windshield with two glowing eyes
    const ws = poly([t.p(0.46, j1 - 0.04, 16), t.p(0.46, j0 + 0.04, 16), t.p(0.46, j0 + 0.04, 21), t.p(0.46, j1 - 0.04, 21)]);
    const [wx, wy] = t.p(0.46, 0, 18.5);
    s += F(ws, '#1E1A18', 0.8) + `<g filter="${d.blur(0.8)}">${dot(wx - 2.4, wy + 1.4, 1.6, '#E04A1E')}${dot(wx + 2.4, wy - 1.6, 1.6, '#E04A1E')}</g>` + dot(wx - 2.4, wy + 1.4, 0.6, '#F0C060') + dot(wx + 2.4, wy - 1.6, 0.6, '#F0C060');
    // grille with spikes + skull ornament
    const [gx, gy] = t.p(0.6, 0, 9);
    s += grp(F(rect(-5, -4, 5, 4), '#2A2622', 0.8) + L('M-3,-4V4M0,-4V4M3,-4V4', 0.6, '#77756C'), `${mtx(1, -K, 0, 1, gx, gy)}`);
    for (const jj of [-0.14, 0, 0.14]) {
      const [sx, sy] = t.p(0.62, jj, 6);
      s += F(`M${f(sx - 1)},${f(sy - 1)}l5,2.4 -5,0.6Z`, '#9A968A', 0.6);
    }
    const [kx, ky] = t.p(0.56, 0, 15);
    s += F(ell(kx, ky - 2.6, 2.4, 2.6), '#D8D0B8', 0.7) + dot(kx - 0.9, ky - 2.8, 0.6, INK) + dot(kx + 0.9, ky - 2.8, 0.6, INK);
    // horns on the cab roof
    const [hx, hy] = t.p(0.36, 0, 22);
    s += L(`M${f(hx - 3)},${f(hy)}q-6,-2 -7,-9M${f(hx + 3)},${f(hy)}q6,-2 7,-9`, 3.6, INK) + L(`M${f(hx - 3)},${f(hy)}q-6,-2 -7,-9M${f(hx + 3)},${f(hy)}q6,-2 7,-9`, 2, '#C8BC9A');
    // near wheels
    for (const wi of [-0.32, 0.4]) {
      const fr = swFace(t, wi - 0.1, j1 + (wi > 0.3 ? -0.02 : 0), 0);
      s += grp(F(ell(5, -4.6, 5, 5), '#1A1814', PLW) + F(ell(5, -4.6, 2.4, 2.4), '#5E3A26', 0.6) + L('M1,-4.6l-2.6,-0.6M9,-4.6l2.6,-0.6', 1, '#9A968A'), fr);
    }
    // chimney stack + black smoke and sparks
    const [cx, cy] = t.p(-0.36, -0.1);
    s += cyl(d, cx, cy, 2.6, 2.6, 36, 46, '#3A3833', '#26241F', '#16120C', PLW).s;
    s += puffs(cx - 1, cy - 49, 4, 0.72, -3.4, true, 31);
    for (let k = 0; k < 6; k++) s += dot(cx - 10 + r() * 22, cy - 50 - r() * 14, 0.7, '#E08A3A', 0.9);
    // hanging chain
    s += L(`M${fp(t.p(0.26, j1, 30))}q-3,6 -1,12`, 1.2, '#5A5650', 'stroke-dasharray="1.2 0.8"');
    return s;
  });
}

// ---------------------------------------------------------------------------- overlays
function closedOverlay(): ArtAsset {
  return asset('map_closed', PIN_W, PIN_H, 0.5, 1, (d) => {
    let s = '';
    const plank = (x0: number, y0: number, x1: number, y1: number, w: number, seed: number) => {
      const a = Math.atan2(y1 - y0, x1 - x0);
      const len = Math.hypot(x1 - x0, y1 - y0);
      const p = `M0,${f(-w / 2)}L${f(len)},${f(-w / 2 + 0.8)}L${f(len - 1)},${f(w / 2)}L0,${f(w / 2)}Z`;
      const body =
        `<g filter="${d.blur(1.2)}" opacity="0.45" transform="translate(2 3)">${F(p, '#140F08')}</g>` +
        F(p, '#9C7448', PLW) + grain(d, p, [0, -w / 2, len, w], 14, seed, '#5A3C1C', '#C09464') + L(`M0,${f(w / 2 - 1)}H${f(len)}`, 0.8, '#6A4524', 'opacity="0.6"') +
        dot(4, 0, 1.2, '#4A4640') + dot(len - 4, 0, 1.2, '#4A4640') + dot(4.3, -0.3, 0.4, '#B8B4A8') + dot(len - 3.7, -0.3, 0.4, '#B8B4A8');
      return grp(body, `translate(${f(x0)} ${f(y0)}) rotate(${f((a * 180) / Math.PI)})`);
    };
    s += plank(22, 46, 128, 98, 11, 1) + plank(24, 100, 126, 42, 11, 2);
    // the sign
    const sg = rect(-50, -24, 50, 24);
    let b = `<g filter="${d.blur(1.4)}" opacity="0.5" transform="translate(2.5 3.5)">${F(sg, '#140F08')}</g>`;
    b += F(sg, '#C9B88E', PLW) + d.clip(sg, F(blob(30, 12, 22, 14, 3), '#8E7444', 0, 'opacity="0.3"') + F(blob(-34, -16, 10, 6, 4), '#8E7444', 0, 'opacity="0.25"') + L('M-50,4H50', 0.5, '#8A7A54', 'opacity="0.6"'));
    b += lettering('CLOSED', 0, -6, 14, '#7A1E1A', 2.6, { anchor: 'middle', jitter: 0.12, seed: 2 }, 0);
    b += L('M-24,-1H-6M6,-1H24', 0.9, '#3A3020') + dot(0, -1, 1.5, '#3A3020');
    b += lettering('NEW MANAGEMENT', 0, 10, 7, '#2A2218', 1.25, { anchor: 'middle', gap: 0.3 }, 0);
    b += lettering('SOON', 0, 20, 7, '#2A2218', 1.25, { anchor: 'middle', gap: 0.4 }, 0);
    // green zombie handprint: the new management
    b += grp(F('M0,0q-3,-1 -3,-5q0,-3 3,-3q3,0 3,3q0,4 -3,5Z', '#7FB236', 0, 'opacity="0.8"') + L('M-2.4,-7l-1.4,-5M-0.6,-8l-0.4,-5.6M1,-8l0.8,-5.4M2.6,-7l1.8,-4M3,-3.4l3.6,-1.6', 1.6, '#7FB236', 'opacity="0.8"'), 'translate(37 18) rotate(18)');
    b += dot(-46, -20, 1.2, '#4A4640') + dot(46, -20, 1.2, '#4A4640') + dot(-46, 20, 1.2, '#4A4640') + dot(46, 20, 1.2, '#4A4640');
    s += grp(b, 'translate(75 74) rotate(-4)');
    return s;
  });
}
function stealBadge(): ArtAsset {
  return asset('map_steal', 48, 48, 0.5, 1, (d) => {
    const c = blob(24, 23, 21, 21, 4, 14, 0.06);
    let s = `<g filter="${d.blur(1)}" opacity="0.5" transform="translate(1 1.6)">${F(c, '#140F08')}</g>`;
    s += F(c, '#8E2A22', PLW) + F(blob(24, 23, 17.4, 17.4, 5, 14, 0.06), '#CFC4A2', 0.8);
    const inner = blob(24, 23, 17.4, 17.4, 5, 14, 0.06);
    let g = F(blob(30, 32, 10, 6, 3), '#8E7444', 0, 'opacity="0.25"');
    // dragged customer: feet trailing left, body leaning back, shocked face
    g += L('M9,33l5,-2M10,37l5,-4', 1.6, '#16120C') + L('M14,31l4,-3M15,33l4,-3', 2.6, INK) + L('M14,31l4,-3M15,33l4,-3', 1.6, '#55553F');
    g += F('M16,30L19,19L27,21L24,32Z', '#2C6985', 0.9) + L('M22,26l-6,3', 2.4, INK) + L('M22,26l-6,3', 1.4, '#2C6985');
    g += F(ell(21, 15.4, 4.6, 4.8), '#B3B294', 0.9) + F(ell(23.4, 16.4, 2, 2.4), '#968E6F', 0) + L(ell(21, 15.4, 4.6, 4.8), 0.9);
    g += dot(19.6, 14.4, 0.8, INK) + dot(22.4, 14.6, 0.8, INK) + F(ell(21.2, 18, 1, 1.3), '#3A1A12', 0.4);
    g += L('M6,24h5M7,28h4M8,20h3', 0.9, '#5A4A2E');
    // sneaky striped arm from the right grabbing the collar
    const arm = 'M47,8L30,19';
    g += L(arm, 7.4, INK) + L(arm, 5.6, '#DAD6C8') + `<path d="${arm}" fill="none" stroke="#2A2824" stroke-width="5.6" stroke-dasharray="2 2"/>`;
    g += F('M31,16q-5,0 -6,4q-1,3 2,4q2,1 5,-1l3,-3Z', '#B3B294', 0.9) + L('M26,21l2,1M26.6,23l2,0', 0.5, INK);
    s += d.clip(inner, g);
    return s;
  });
}

// ---------------------------------------------------------------------------- shopfront signs for the r wall
const SG = { W: 100, H: 124, X: 4, Y: 58 };
const sgF = (o: number) => mtx(1, K, 0, 1, SG.X - o, SG.Y + K * o);
const sgPt = (x: number, y: number, o = 0): Pt => [SG.X - o + x, SG.Y + K * o + K * x + y];
interface Part {
  d: string;
  face: string;
  side: string;
}
/** Board parts standing n px off the wall: ink silhouette swept back to the wall, side fill, then the front faces. */
function slabs(parts: Part[], n: number): string {
  const steps = Math.max(4, Math.ceil(n / 0.4));
  let ink = '';
  let side = '';
  for (let k = 0; k <= steps; k++) ink += grp(parts.map((p) => F(p.d, INK, 2.6)).join(''), sgF((n * k) / steps));
  for (let k = 0; k < steps; k++) side += grp(parts.map((p) => F(p.d, k === 0 ? dk(p.side, 0.2) : p.side)).join(''), sgF((n * k) / steps));
  return ink + side + grp(parts.map((p) => F(p.d, p.face)).join(''), sgF(n));
}
/** Iron bracket: plate on the wall at (lx, ly) with an arm out to the board at the same local point. */
function bracket(lx: number, ly: number, n: number, up: boolean): { plate: string; arm: string } {
  const dy = up ? -5 : 5;
  const plate = poly([sgPt(lx - 2.8, ly + dy - 3), sgPt(lx + 2.8, ly + dy - 3), sgPt(lx + 2.8, ly + dy + 3), sgPt(lx - 2.8, ly + dy + 3)]);
  const [b0x, b0y] = sgPt(lx - 1.2, ly + dy - 1);
  const [b1x, b1y] = sgPt(lx + 1.2, ly + dy + 1);
  const armP = pline([sgPt(lx, ly + dy, 0), sgPt(lx, ly + dy, n + 0.5), sgPt(lx, ly - dy * 0.6, n + 0.5)]);
  return {
    plate: F(plate, '#4A4640', 0.8) + dot(b0x, b0y, 0.7, '#9A968A') + dot(b1x, b1y, 0.7, '#9A968A'),
    arm: L(armP, 2.8, INK) + L(armP, 1.3, '#77736A'),
  };
}
function rsign(id: string, n: number, parts: Part[], brackets: [number, number, boolean][], face: (d: Doc) => string, back = ''): ArtAsset {
  return asset(`rsign_${id}`, SG.W, SG.H, SG.X / SG.W, SG.Y / SG.H, (d) => {
    const bs = brackets.map(([x, y, up]) => bracket(x, y, n, up));
    let s = `<g filter="${d.blur(1.6)}" opacity="0.4">${grp(parts.map((p) => F(p.d, '#140F08')).join(''), `translate(2 3) ${sgF(0)}`)}</g>`;
    s += back + bs.map((b) => b.plate).join('');
    s += slabs(parts, n);
    s += grp(face(d), sgF(n));
    s += bs.map((b) => b.arm).join('');
    return s;
  });
}

function rsignChuck(): ArtAsset {
  const r = rnd(3);
  const pl = (y0: number, y1: number): string => {
    const a = 4 + (r() - 0.5) * 2;
    const b = 92 + (r() - 0.5) * 2;
    return `M${f(a)},${f(y0)}L${f(b)},${f(y0 + 0.4)}L${f(b - 0.8)},${f(y1)}L${f(a + 0.6)},${f(y1)}Z`;
  };
  const planksD = [pl(-46, -31.5), pl(-31, -16), pl(-15.5, -1)];
  const cols = ['#8E6436', '#86602F', '#946A3A'];
  return rsign(
    'chuck',
    3.5,
    planksD.map((dd, k) => ({ d: dd, face: cols[k], side: '#5A3C1C' })),
    [
      [16, -46, true],
      [80, -46, true],
    ],
    (d) => {
      let s = '';
      planksD.forEach((dd, k) => {
        s += d.clip(dd, grain(d, dd, [2, -48, 94, 48], 26, 10 + k, '#4E321A', '#B08452') + F(blob(30 + k * 20, -40 + k * 15, 10, 3, k), '#5A3C1C', 0, 'opacity="0.25"') + scratches(d, dd, [2, -48, 94, 48], 10, '#D8C8A0', 20 + k, 0.5));
        s += L(dd, 1.1);
      });
      s += lettering('CHUCK', 48, -26.5, 15, '#DCD2B2', 2.5, { anchor: 'middle', jitter: 0.08, seed: 5 }, 0.9);
      s += lettering('WAGON', 48, -5, 15, '#DCD2B2', 2.5, { anchor: 'middle', jitter: 0.08, seed: 6 }, 0.9);
      // paint chips, nails, bullet hole
      for (let k = 0; k < 7; k++) s += dot(24 + r() * 50, -40 + r() * 36, 0.6 + r() * 0.6, '#86602F');
      for (const [x, y] of [[8, -39], [88, -39], [8, -23], [88, -23], [8, -8], [88, -8]]) s += dot(x, y, 0.8, '#3A3632');
      s += dot(70, -20, 1.2, '#16120C') + L('M70,-20l2,-2M70,-20l-2,1.6', 0.4, '#D8C8A0');
      // rope lashings at both ends + a hanging tail
      const rope = (x: number) => {
        let p = '';
        for (let y = -45; y < -2; y += 2.2) p += `M${f(x - 2)},${f(y)}l4,1.6`;
        return L(`M${f(x)},-47V-1`, 4.4, INK) + L(`M${f(x)},-47V-1`, 3, '#A89064') + L(p, 0.6, '#6E5A34');
      };
      s += rope(11) + rope(85);
      s += L('M85,-1q2,6 -1,10q-1,3 1,5', 2.6, INK) + L('M85,-1q2,6 -1,10q-1,3 1,5', 1.4, '#A89064');
      return s;
    },
  );
}

function rsignHank(): ArtAsset {
  const dome = 'M6,-24C6,-52 90,-52 90,-24Z';
  const lettuce = 'M4,-25.5H92L92,-21Q88,-18 84,-21Q80,-18 76,-21Q72,-18 68,-21Q64,-18 60,-21Q56,-18 52,-21Q48,-18 44,-21Q40,-18 36,-21Q32,-18 28,-21Q24,-18 20,-21Q16,-18 12,-21Q8,-18 4,-21Z';
  const patty = 'M4,-21Q2,-15 4,-8H92Q94,-15 92,-21Z';
  const bun = 'M7,-8Q6,0 13,0H83Q90,0 89,-8Z';
  return rsign(
    'hank',
    3,
    [
      { d: dome, face: '#B07E44', side: '#7E5428' },
      { d: lettuce, face: '#6A8030', side: '#4A5A20' },
      { d: patty, face: '#4E3220', side: '#2E1E12' },
      { d: bun, face: '#A87A42', side: '#7E5428' },
    ],
    [
      [22, -40, true],
      [74, -40, true],
    ],
    (d) => {
      let s = '';
      s += d.clip(dome, F(dome, d.linear(10, -48, 80, -22, [[0, '#C8965A'], [0.6, '#AE7E44'], [1, '#8A5E30']])) + F(blob(30, -42, 14, 4, 3), '#FFFFFF', 0, 'opacity="0.15"') + scratches(d, dome, [6, -50, 84, 28], 16, '#E0C890', 3, 0.6));
      s += L(dome, 1.1) + L(lettuce, 0.9) + L(patty, 1.1) + L(bun, 1.1);
      s += speckle(d, patty, [4, -21, 88, 13], 40, ['#2A1A10', '#6E4A30'], 5, 0.5, 1, 0.9);
      // cheese drips
      s += F('M20,-21l2,5 2,-5M46,-21l1.6,6 1.6,-6M70,-21l2,4 2,-4', '#C9A43A', 0.8);
      // sesame seeds
      const r = rnd(7);
      for (let k = 0; k < 12; k++) {
        const x = 16 + r() * 64;
        const y = -45 + r() * 6;
        if (x > 34 && x < 62 && y > -44) continue;
        s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="1.4" ry="0.7" fill="#E6DAB6" transform="rotate(${f(r() * 50 - 25)} ${f(x)} ${f(y)})"/>`;
      }
      // dead bulbs round the dome
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI + (k / 10) * Math.PI;
        const x = 48 + Math.cos(a) * 44;
        const y = -24 + Math.sin(a) * 24;
        s += dot(x, y, 2.2, INK) + dot(x, y, 1.5, k === 3 || k === 8 ? '#3A3632' : '#B8B4A0') + dot(x - 0.5, y - 0.5, 0.45, '#E8E4D4', 0.8);
        if (k === 3 || k === 8) s += L(`M${f(x - 1)},${f(y - 1)}l1,1.2 1,-1`, 0.4, '#B8B4A0');
      }
      s += lettering('BIG', 48, -28.5, 11, '#E6DAB6', 2.2, { anchor: 'middle' }, 0.9);
      s += lettering("HANK'S", 48, -10.5, 9.6, '#D8AE3E', 2, { anchor: 'middle', gap: 0.32 }, 0.9);
      s += F(blob(80, -4, 5, 2, 4), '#3A2410', 0, 'opacity="0.4"') + crack(14, -30, -1.2, 9, 4, 0.6);
      return s;
    },
  );
}

function leaf(x: number, y: number, a: number, s: number, col: string): string {
  const p = `M0,0Q${f(s * 0.5)},${f(-s * 0.45)} ${f(s)},0Q${f(s * 0.5)},${f(s * 0.45)} 0,0Z`;
  return grp(F(p, col, 0.6) + L(`M0,0L${f(s * 0.85)},0`, 0.35, '#C8D09A'), `translate(${f(x)} ${f(y)}) rotate(${f(a)})`);
}
function rsignVera(): ArtAsset {
  const frame = rect(3, -46, 93, 0);
  const board = rect(7, -42, 89, -4);
  return rsign(
    'vera',
    3,
    [{ d: frame, face: '#6A4A2A', side: '#4A321A' }],
    [
      [18, -46, true],
      [78, -46, true],
    ],
    (d) => {
      let s = d.clip(frame, grain(d, frame, [3, -46, 90, 46], 22, 5, '#3E2A14', '#8E6A42')) + L(frame, 1.1);
      s += F(board, '#2C3A30', 1) + d.clip(board, F(blob(30, -26, 22, 10, 3), '#DCDCCB', 0, 'opacity="0.07"') + F(blob(70, -14, 18, 8, 4), '#DCDCCB', 0, 'opacity="0.06"'));
      const chalk = (str: string, y: number, seed: number) =>
        L(textD(str, 48, y, 14, { anchor: 'middle', jitter: 0.12, seed }), 2.2, '#DCDCCB', 'opacity="0.92"') + L(textD(str, 48.5, y + 0.4, 14, { anchor: 'middle', jitter: 0.12, seed }), 1, '#FFFFFF', 'opacity="0.3"');
      s += chalk('VEGAN', -25.5, 3) + chalk('VERA', -7, 4);
      s += L('M74,-12q3,-3 6,0M76,-14l2,-3', 0.8, '#C8A070', 'opacity="0.7"');
      // leaves and vines round the frame
      const greens = ['#6E8A3A', '#55702E', '#86A052'];
      const r = rnd(9);
      for (let k = 0; k < 14; k++) {
        const x = 3 + r() * 90;
        s += leaf(x, -46 + (r() - 0.5) * 2, -90 + (r() - 0.5) * 120, 5 + r() * 3, greens[k % 3]);
      }
      for (const [x, y] of [[4, -38], [3, -22], [92, -30], [93, -12]] as [number, number][]) s += leaf(x, y, x < 50 ? 160 + r() * 40 : -20 + r() * 40, 5.5, greens[Math.floor(r() * 3)]);
      const vine = 'M5,-1q-3,6 1,10q3,4 0,9M90,-1q4,5 0,9q-3,3 0,7';
      s += L(vine, 2, INK) + L(vine, 1, '#55702E');
      s += leaf(6, 9, 30, 5, '#6E8A3A') + leaf(2, 4, 200, 4.4, '#86A052') + leaf(90, 8, -20, 5, '#55702E') + leaf(92, 14, 160, 4.4, '#6E8A3A');
      // a slug on the frame, slime trail
      s += L('M60,-45.6h10', 1.2, '#C8D0B8', 'opacity="0.5"') + F('M70,-46q4,-2.4 7,0.4l1,-2 0.4,2.2q-3,1.6 -8.4,-0.6Z', '#7A6A3A', 0.6);
      return s;
    },
  );
}

function rsignCrunch(): ArtAsset {
  const bucket = 'M2,-46L94,-46L89,0L7,0Z';
  return rsign(
    'crunch',
    3.5,
    [{ d: bucket, face: '#CDC3A8', side: '#8A826C' }],
    [
      [16, -46, true],
      [80, -46, true],
    ],
    (d) => {
      let st = '';
      const n = 9;
      for (let k = 0; k < n; k += 2) {
        const t0 = k / n;
        const t1 = (k + 1) / n;
        st += poly([
          [2 + 92 * t0, -46],
          [2 + 92 * t1, -46],
          [7 + 82 * t1, 0],
          [7 + 82 * t0, 0],
        ]);
      }
      let s = d.clip(bucket, F(st, '#76222A') + F(bucket, d.linear(0, 0, 96, 0, [[0, '#FFFFFF', 0.1], [0.6, '#000000', 0], [1, '#000000', 0.25]])) + F(blob(30, -8, 10, 4, 3), '#5E4A20', 0, 'opacity="0.35"') + F(blob(78, -30, 6, 8, 4), '#5E4A20', 0, 'opacity="0.3"') + scratches(d, bucket, [2, -46, 92, 46], 18, '#E0D8C0', 5, 0.5));
      s += F(rect(2, -46, 94, -40), '#D8D0BA', 1) + L(bucket, 1.2);
      s += lettering('CLUCK', 48, -24, 13.5, '#D4A63C', 2.4, { anchor: 'middle', gap: 0.34 }, 1.1);
      s += lettering('SHACK', 48, -4.5, 13.5, '#D4A63C', 2.4, { anchor: 'middle', gap: 0.34 }, 1.1);
      // a feather stuck on, a drumstick bone nailed to the corner
      s += F('M84,-36q4,-4 7,-3q-2,4 -7,3Z', '#E0D8C0', 0.5) + L('M84,-36l6,-2', 0.4, INK);
      s += L('M5,-10l9,-6', 3.2, INK) + L('M5,-10l9,-6', 1.8, '#D8D0B8') + dot(4.4, -9.2, 1.6, '#D8D0B8') + dot(14.6, -16.6, 1.6, '#D8D0B8') + dot(9.4, -13, 0.6, '#3A3632');
      return s;
    },
  );
}

function rsignSnob(): ArtAsset {
  const board = 'M3,0V-36Q48,-52 93,-36V0Z';
  const inner = 'M7,-4V-33.6Q48,-47.4 89,-33.6V-4Z';
  return rsign(
    'snob',
    3,
    [{ d: board, face: '#A08236', side: '#6A5420' }],
    [
      [18, -38, true],
      [78, -38, true],
    ],
    (d) => {
      let s = d.clip(board, F(board, d.linear(0, -48, 60, 10, [[0, '#C8A84E'], [0.45, '#A08236'], [0.55, '#7A6028'], [1, '#A08236']])) + scratches(d, board, [3, -48, 90, 48], 20, '#3A2E14', 6, 0.6));
      s += L(board, 1.2) + F(inner, '#1E2A24', 1) + d.clip(inner, F(blob(70, -12, 16, 8, 3), '#3A4A40', 0, 'opacity="0.5"'));
      s += L('M10,-7V-31M86,-7V-31', 0.5, '#C8A84E', 'opacity="0.6"');
      // corner curls
      const curl = 'M10,-8q0,-4 4,-4q3,0 2,3q-1,2 -3,0';
      s += L(curl, 0.9, '#C8A84E') + L(curl, 0.9, '#C8A84E', 'transform="translate(96 0) scale(-1 1)"');
      s += lettering('LE', 48, -28, 8, '#D0AE52', 1.5, { anchor: 'middle', gap: 0.5 }, 0.6);
      s += L('M28,-32h12M56,-32h12', 0.8, '#D0AE52') + dot(26, -32, 0.9, '#D0AE52') + dot(70, -32, 0.9, '#D0AE52');
      s += lettering('SNOB', 48, -7, 16.5, '#D8B65A', 2.6, { anchor: 'middle', gap: 0.3 }, 0.8);
      s += L(textD('SNOB', 47.6, -7.6, 16.5, { anchor: 'middle', gap: 0.3 }), 0.6, '#F0DC9A', 'opacity="0.7"');
      // bird mess on the arch, a chipped gilt corner
      s += F('M60,-45q3,-1 5,1q-1,2 -2.6,1.6l-0.4,5q-1,0.6 -1,-0.6l-0.6,-4.6Q59,-43 60,-45Z', '#D8D4C8', 0.5);
      s += F('M93,-6L93,0L88,0Z', '#5A4A2A', 0.6);
      return s;
    },
  );
}

function rsignBoss(): ArtAsset {
  const plate = 'M3,-44L93,-44L93,-6L88,-2L84,0L3,0Z';
  return rsign(
    'boss',
    3.5,
    [{ d: plate, face: '#5E3826', side: '#3A2216' }],
    [
      [16, -44, true],
      [80, -44, true],
    ],
    (d) => {
      let s = d.clip(plate, F(plate, d.linear(0, -44, 90, 0, [[0, '#6E4430'], [0.5, '#5A3424'], [1, '#3E2418']])) + rust(d, plate, [[12, -36, 6], [76, -10, 7], [40, -4, 4], [60, -38, 4]], 7) + F(ell(48, -18, 40, 16), d.radial(48, -18, 40, [[0, '#16100A', 0.5], [1, '#16100A', 0]])) + scratches(d, plate, [3, -44, 90, 44], 14, '#B08A6A', 8, 0.5));
      s += L(plate, 1.2) + rustDrip(20, -2, 8) + rustDrip(70, -2, 6);
      for (let k = 0; k < 9; k++) {
        const x = 7 + k * 10.2;
        s += dot(x, -40.5, 1.1, '#3A2216') + dot(x - 0.3, -40.8, 0.4, '#B08A6A') + dot(x, -3.5, 1.1, '#3A2216');
      }
      s += dot(30, -30, 1.3, '#16100A') + dot(64, -32, 1.1, '#16100A');
      // flame lettering
      const o = { anchor: 'middle' as const, wide: 0.82, gap: 0.3 };
      const td = textD('INFERNO', 48, -10, 17, o);
      s += `<g filter="${d.blur(2.2)}" opacity="0.75">${L(td, 6, '#D8622A')}</g>`;
      // flame tongues rising off the letter tops
      const r = rnd(11);
      let fl = '';
      let fm = '';
      let fc = '';
      for (let k = 0; k < 13; k++) {
        const x = 16 + k * 5.3 + (r() - 0.5) * 2;
        const h = 9 + r() * 10;
        const le = (r() - 0.4) * 4;
        fl += tongue(x, -24, 5, h, le);
        fm += tongue(x, -23.5, 3.2, h * 0.7, le * 0.8);
        fc += tongue(x, -23, 1.6, h * 0.4, le * 0.6);
      }
      s += F(fl, '#8E2A1E', 0.8) + F(fm, '#C8622A') + F(fc, '#E0B050');
      s += L(td, 5.2, INK) + L(td, 3.4, '#B5481E') + L(td, 2, '#E08A34') + L(td, 0.8, '#F0CC6A');
      // embers
      for (let k = 0; k < 6; k++) s += dot(14 + r() * 70, -46 - r() * 8, 0.7, '#E08A34', 0.9);
      return s;
    },
  );
}

export function buildRaidMap3(): ArtAsset[] {
  return [
    buildMapBg(),
    pinHome(),
    pinChuck(),
    pinHank(),
    pinVera(),
    pinCrunch(),
    pinSnob(),
    pinBoss(),
    closedOverlay(),
    stealBadge(),
    rsignChuck(),
    rsignHank(),
    rsignVera(),
    rsignCrunch(),
    rsignSnob(),
    rsignBoss(),
    // the later joints on the road reuse a neighbour's pin and sign until their own are drawn
    ...(['sushi', 'taco', 'lab', 'clown'] as const).flatMap((id, i) => {
      const pin = [pinHank, pinCrunch, pinSnob, pinChuck][i]();
      const sign = [rsignHank, rsignCrunch, rsignSnob, rsignChuck][i]();
      return [
        { ...pin, key: `map_joint_${id}`, svg: pin.svg.split(pin.key).join(`map_joint_${id}`) },
        { ...sign, key: `rsign_${id}`, svg: sign.svg.split(sign.key).join(`rsign_${id}`) },
      ];
    }),
  ];
}
