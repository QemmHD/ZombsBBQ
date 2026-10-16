/**
 * Furniture that seats on all four sides (table_diner, table_barrel, table_coffin), chairs in four facing
 * directions (chair_<family>_<dir>) and the extra kitchen stations (fryer, fryer_bubbles, counter_chrome,
 * keep_warm). All 1x1 floor objects use floorProp (anchor = tile center).
 *
 * Chairs: `chair_<f>_se` faces +i (screen down-right) and sits on the tile up-left of its table, so its
 * backrest is on its -i (up-left) side. Every chair is shifted a quarter tile toward the table it faces;
 * the seat center is tileCenter + PROP_META.seat[dir], seat top at PROP_META.seatZ. For _ne/_nw the backrest
 * is nearer the camera than the sitter: draw the sitter BEFORE (under) those chairs so the backrest covers
 * their lower back; for _se/_sw draw the sitter after the chair.
 */
import type { ArtAsset } from './types';
import type { Dir } from './manifest';
import { OUT, PW, P, S, ell, f, hl, poly, rrect } from './svg';
import type { Pt } from './svg';
import type { V3 } from './propkit';
import {
  CHROME, CHROME_D, CHROME_HI, COUNTER_Z, FRYER_Z, GOLD, Iso, SEAT_Z, TABLE_BARREL_Z, TABLE_COFFIN_Z, TABLE_DINER_Z, T, WOOD, WOOD_D,
  WOOD_M, ZSKIN, asset, circle, faceMap, floorProp, rivet,
} from './propkit';

// ------------------------------------------------------------------ tables
function tables(): ArtAsset[] {
  const out: ArtAsset[] = [];

  // --- round chrome-and-red diner table on a pedestal
  out.push(
    floorProp('table_diner', TABLE_DINER_Z + 22, (d, t) => {
      const Z = TABLE_DINER_Z;
      let s = t.rshadow(0.4, 0.15);
      s += t.cyl(d, 0, 0, 0.21, 0, 2.6, CHROME, '#E6EAEE', 1.6);
      s += P(t.circ(0, 0, 2.6, 0.12), '#C9CED6', 0.8);
      s += t.cyl(d, 0, 0, 0.05, 2.6, Z - 5, CHROME, null, 1.4);
      const [cx, cy] = t.p(0, 0, 8);
      s += S(`M${f(cx - 1.4)},${f(cy - 8)}V${f(cy + 4)}`, 0.9, CHROME_HI);
      s += t.cyl(d, 0, 0, 0.12, Z - 7, Z - 4, CHROME, null, 1.2);
      // top: chrome ribbed edge + red formica with boomerangs
      s += t.cyl(d, 0, 0, 0.42, Z - 4, Z, ['#D5DAE0', '#8E959E'], null, PW);
      s += t.band(0, 0, 0.42, Z - 1.4, 0.7, CHROME_D) + t.band(0, 0, 0.42, Z - 2.8, 0.7, CHROME_HI);
      const top = t.circ(0, 0, Z, 0.42);
      s += P(top, '#E2343B', PW);
      const [tx, ty] = t.p(0, 0, Z);
      s += d.clip(top, P(ell(tx + 4, ty + 3, 30, 15), '#C92A33') + P(ell(tx - 2, ty - 1, 25, 12), '#E2343B'));
      const boomer = (x: number, y: number, a: number, c: string) =>
        `<path d="M${f(x - 3)},${f(y)}q3,-2.4 6,0q-3,-1 -6,0z" fill="none" stroke="${c}" stroke-width="1" transform="rotate(${a} ${f(x)} ${f(y)})"/>`;
      s += boomer(tx - 14, ty - 2, -10, '#FF8A8E') + boomer(tx + 12, ty - 5, 20, '#FFD23D') + boomer(tx + 4, ty + 7, -25, '#FF8A8E') + boomer(tx - 6, ty + 6, 15, '#7FD3FF');
      s += circle(tx - 8, ty - 7, 0.6, '#FFD23D') + circle(tx + 18, ty + 2, 0.6, '#7FD3FF') + circle(tx - 18, ty + 4, 0.6, '#FFD23D');
      s += hl(tx - 13, ty - 5, 7, 1.8, -12, 0.5);
      return s;
    }),
  );

  // --- whiskey barrel with a round plank top
  out.push(
    floorProp('table_barrel', TABLE_BARREL_Z + 22, (d, t) => {
      const Z = TABLE_BARREL_Z;
      let s = t.rshadow(0.36, 0.18);
      const body = t.cylBody(0, 0, 0.25, 0, Z - 3, 1.6);
      s += d.shaded(body, '#A8693A', '#74421F', PW, [-5, 0]);
      const [bx, by] = t.p(0, 0, 0);
      let staves = '';
      for (const k of [-12, -6, 0, 6, 12]) staves += S(`M${f(bx + k * 1.12)},${f(by - Z)}Q${f(bx + k * 1.3)},${f(by - Z / 2)} ${f(bx + k * 1.12)},${f(by + 12)}`, 0.8, '#5A3418');
      s += d.clip(body, staves);
      for (const z of [3.5, 8, Z - 13, Z - 8]) {
        s += d.clip(body, t.band(0, 0, 0.26, z, 2.4, '#3E3E46') + t.band(0, 0, 0.26, z + 1.1, 0.6, '#8E959E'));
      }
      for (const k of [-10, 4, 13]) s += rivet(bx + k, by - 8 + Math.abs(k) * 0.15 + 3, 0.6);
      // stenciled XXX + a bullet hole
      s += T(bx + 2, by - 13, 6.4, '#3E2414', 'XXX', 'opacity="0.75" letter-spacing="0.4"');
      s += circle(bx - 10, by - 15, 1, '#2A1A10') + S(`M${f(bx - 11.6)},${f(by - 15)}l-1,-0.8M${f(bx - 10)},${f(by - 13.4)}l0.4,1`, 0.4, '#2A1A10');
      // plank top
      s += t.cyl(d, 0, 0, 0.4, Z - 3, Z, ['#A8693A', '#7A4524'], null, PW);
      const top = t.circ(0, 0, Z, 0.4);
      s += P(top, WOOD, PW);
      let planks = '';
      for (const j of [-0.2, 0, 0.2]) planks += t.line([-0.6, j, Z], [0.6, j, Z], 1, WOOD_D);
      planks += t.line([-0.6, -0.1, Z], [0.6, -0.1, Z], 0.5, '#E2AE78', 'opacity="0.6"') + t.line([-0.4, 0.28, Z], [0.1, 0.28, Z], 0.5, '#E2AE78', 'opacity="0.6"');
      planks += t.line([-0.35, 0.1, Z], [-0.1, 0.1, Z], 0.5, '#8A5530') + t.line([0.05, -0.3, Z], [0.3, -0.3, Z], 0.5, '#8A5530');
      s += d.clip(top, planks);
      s += S(top, PW);
      for (const [i, j] of [[-0.28, -0.1], [0.28, -0.1], [-0.28, 0.1], [0.28, 0.1], [0, -0.3], [0, 0.3]] as Pt[]) {
        const [x, y] = t.p(i, j, Z);
        s += rivet(x, y, 0.55, '#3E2414', '#C98B55');
      }
      // ring stains from a hundred mugs
      const [rx, ry] = t.p(0.12, 0.16, Z);
      s += S(ell(rx, ry, 4, 2), 0.6, '#7A4524', 'opacity="0.5"') + S(ell(rx + 3, ry - 1, 4, 2), 0.5, '#7A4524', 'opacity="0.35"');
      return s;
    }),
  );

  // --- coffin on two sawhorse trestles (a hand sneaks out for a bite)
  out.push(
    floorProp('table_coffin', TABLE_COFFIN_Z + 22, (d, t) => {
      const Z = TABLE_COFFIN_Z;
      let s = t.shadow(-0.28, 0.28, -0.48, 0.48, 0.16);
      const trestle = (j: number) => {
        let r = t.post([-0.24, j - 0.05, 0], [-0.1, j - 0.02, Z - 10], 2.6, WOOD_M) + t.post([0.24, j - 0.05, 0], [0.1, j - 0.02, Z - 10], 2.6, WOOD_D);
        r += t.post([-0.24, j + 0.05, 0], [-0.1, j + 0.02, Z - 10], 2.6, WOOD_M) + t.post([0.24, j + 0.05, 0], [0.1, j + 0.02, Z - 10], 2.6, WOOD_D);
        r += t.box(-0.3, 0.3, j - 0.04, j + 0.04, Z - 12, Z - 9, WOOD, WOOD_M, WOOD_D, 1.6);
        return r;
      };
      s += trestle(-0.3) + trestle(0.3);
      const hex: [number, number][] = [[-0.15, -0.47], [0.15, -0.47], [0.26, -0.2], [0.15, 0.47], [-0.15, 0.47], [-0.26, -0.2]];
      const grow = (k: number) => hex.map(([i, j]) => [i * k, j * k] as [number, number]);
      s += t.prism(hex, Z - 9, Z - 2.6, '#5A2E20', '#6B3A2A', '#4A2418');
      // brass handles on the visible sides
      for (const j of [-0.05, 0.25]) {
        const ii = j < -0.2 ? 0.26 : 0.26 - ((j + 0.2) / 0.67) * 0.11;
        s += t.line([ii + 0.01, j - 0.07, Z - 6.2], [ii + 0.01, j + 0.07, Z - 6.2], 2.6) + t.line([ii + 0.01, j - 0.07, Z - 6.2], [ii + 0.01, j + 0.07, Z - 6.2], 1.2, GOLD[0]);
      }
      s += t.line([-0.08, 0.47, Z - 5.8], [0.08, 0.47, Z - 5.8], 2.6) + t.line([-0.08, 0.47, Z - 5.8], [0.08, 0.47, Z - 5.8], 1.2, GOLD[0]);
      // lid
      s += t.prism(grow(1.06), Z - 2.6, Z, '#7A4530', '#6B3A2A', '#552C1E');
      s += S(t.flat(grow(0.84), Z), 0.9, '#9A5A3C');
      s += t.line([-0.2, -0.34, Z], [0.06, 0.38, Z], 0.6, '#A86A48', 'opacity="0.6"');
      // brass plaque at the head end
      const [px, py] = t.p(0, -0.36, Z);
      s += `<g transform="matrix(1 -0.5 1 0.5 ${f(px)} ${f(py)})">${P(rrect(-3.2, -1.6, 6.4, 3.2, 0.8), GOLD[0], 0.6)}</g>`;
      s += T(px, py + 1, 2.6, '#7A4F12', 'RIP');
      // a zombie hand sneaking out of the lid gap with a fork
      const [hx, hy] = t.p(0.21, 0.22, Z - 2.4);
      s += S(`M${f(hx + 6)},${f(hy - 12)}L${f(hx + 3.4)},${f(hy - 2)}`, 2.6) + S(`M${f(hx + 6)},${f(hy - 12)}L${f(hx + 3.4)},${f(hy - 2)}`, 1.2, '#D5DAE0');
      s += S(`M${f(hx + 4.6)},${f(hy - 15.6)}l1,3.4M${f(hx + 6.2)},${f(hy - 16)}l0.4,3.6M${f(hx + 7.8)},${f(hy - 15.6)}l-0.4,3.4`, 0.8, CHROME_D);
      s += d.shaded(`M${f(hx - 2)},${f(hy + 1)}C${f(hx - 3)},${f(hy - 3)} ${f(hx)},${f(hy - 6)} ${f(hx + 3)},${f(hy - 5)}C${f(hx + 6)},${f(hy - 5)} ${f(hx + 7)},${f(hy - 1)} ${f(hx + 5)},${f(hy + 1)}Z`, ZSKIN[0], ZSKIN[1], 1.1, [-0.6, -0.6]);
      s += S(`M${f(hx + 1)},${f(hy - 4.6)}l-1,-2.4M${f(hx - 0.6)},${f(hy - 3)}l-2,-1.6`, 2, OUT) + S(`M${f(hx + 1)},${f(hy - 4.6)}l-1,-2.4M${f(hx - 0.6)},${f(hy - 3)}l-2,-1.6`, 1, ZSKIN[0]);
      return s;
    }),
  );
  return out;
}

// ------------------------------------------------------------------ chairs
const FWD: Record<Dir, [number, number]> = { se: [1, 0], nw: [-1, 0], sw: [0, 1], ne: [0, -1] };

type Family = 'diner' | 'wood' | 'bone';

function boneLeg(t: Iso, a: V3, b: V3, w = 2.4): string {
  const pa = t.p(...a);
  const pb = t.p(...b);
  let s = t.post(a, b, w, '#F2EBD7');
  for (const [x, y] of [pa, pb]) s += P(ell(x - 1.2, y, 1.5), '#F2EBD7', 0.8) + P(ell(x + 1.2, y, 1.5), '#E6DCC2', 0.8);
  return s;
}

function skull(cx: number, cy: number, front: boolean, sc = 1): string {
  let s = `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(sc)})">`;
  s += P('M-5,-1C-5.4,-6.4 -2.6,-8.6 0,-8.6C2.6,-8.6 5.4,-6.4 5,-1C4.8,1 3.6,1.6 3,2.6V4.4H-3V2.6C-3.6,1.6 -4.8,1 -5,-1Z', '#F2EBD7', 1.1);
  s += P('M2,-7.6C4,-6.6 4.8,-4 4.4,-1.4C4,0.2 3,1 2.6,2V4H3V2.6C3.6,1.6 4.8,1 5,-1C5.4,-5 3.8,-7.4 2,-7.6Z', '#C9BC9A');
  if (front) {
    s += P(ell(-2, -2.6, 1.5, 1.7), '#2B1B17') + P(ell(2, -2.6, 1.5, 1.7), '#2B1B17');
    s += circle(-1.6, -2.8, 0.45, '#FFE14D') + circle(2.4, -2.8, 0.45, '#FFE14D');
    s += P('M0,-0.6L-0.8,0.8H0.8Z', '#2B1B17');
    s += S('M-1.8,2.6V4.2M0,2.6V4.4M1.8,2.6V4.2', 0.5);
  } else {
    s += S('M-1,-8.4l1,2.4l-1.6,1.6l1,2', 0.6, '#A89A78');
  }
  return s + '</g>';
}

function chair(fam: Family, dir: Dir): ArtAsset {
  const key = `chair_${fam}_${dir}`;
  return floorProp(key, Math.ceil(SEAT_Z + 34), (_d, t) => {
    const Z = SEAT_Z;
    const [fi, fj] = FWD[dir];
    const ci = fi * 0.25;
    const cj = fj * 0.25;
    const a = 0.15;
    const th = 0.05;
    const far = dir === 'se' || dir === 'sw';
    const alongI = fi !== 0; // backrest is a plane of constant i
    // backrest slab ranges
    const bi: [number, number] = alongI ? (fi > 0 ? [ci - a, ci - a + th] : [ci + a - th, ci + a]) : [ci - a, ci + a];
    const bj: [number, number] = alongI ? [cj - a, cj + a] : fj > 0 ? [cj - a, cj - a + th] : [cj + a - th, cj + a];
    // the two posts of the backrest (at the back corners)
    const bp: [number, number][] = alongI
      ? [
          [(bi[0] + bi[1]) / 2, cj - a + 0.025],
          [(bi[0] + bi[1]) / 2, cj + a - 0.025],
        ]
      : [
          [ci - a + 0.025, (bj[0] + bj[1]) / 2],
          [ci + a - 0.025, (bj[0] + bj[1]) / 2],
        ];
    bp.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
    const corners: [number, number][] = [
      [ci - a + 0.025, cj - a + 0.025],
      [ci + a - 0.025, cj - a + 0.025],
      [ci - a + 0.025, cj + a - 0.025],
      [ci + a - 0.025, cj + a - 0.025],
    ].sort((p, q) => p[0] + p[1] - (q[0] + q[1])) as [number, number][];
    /** Map (s 0..1 along the backrest, z) onto its camera-facing face. */
    const faceOf = (z0: number) => {
      const fa: Pt = alongI ? t.p(bi[1], bj[0], z0) : t.p(bi[0], bj[1], z0);
      const fb: Pt = alongI ? t.p(bi[1], bj[1], z0) : t.p(bi[1], bj[1], z0);
      return faceMap(fa, fb, z0);
    };
    const quadOn = (fm: (s: number, z: number) => Pt, s0: number, s1: number, z0: number, z1: number) => poly([fm(s0, z0), fm(s1, z0), fm(s1, z1), fm(s0, z1)]);

    let s = t.shadow(ci - a - 0.02, ci + a + 0.02, cj - a - 0.02, cj + a + 0.02, 0.15);
    let legs = '';
    let seat = '';
    let back = '';

    if (fam === 'diner') {
      for (const [i, j] of corners) legs += t.post2([i, j, 0], [i * 0.96, j * 0.96, Z - 3], 2, CHROME[0], CHROME_HI);
      legs += t.line([corners[0][0], corners[0][1], 5], [corners[3][0], corners[3][1], 5], 0.9, CHROME_D, 'opacity="0.5"');
      seat += t.box(ci - a, ci + a, cj - a, cj + a, Z - 4.4, Z - 2.6, CHROME[0], '#C9CED6', CHROME[1], 1.4);
      seat += t.box(ci - a + 0.01, ci + a - 0.01, cj - a + 0.01, cj + a - 0.01, Z - 2.6, Z, '#F0565C', '#E2343B', '#B3263A', 1.4);
      const [sx, sy] = t.p(ci, cj, Z);
      seat += S(poly(t.quad(ci - a + 0.04, ci + a - 0.04, cj - a + 0.04, cj + a - 0.04, Z)), 0.6, '#B3263A') + circle(sx, sy, 0.8, '#8E1B2E') + hl(sx - 4, sy - 1.4, 3, 0.8, -20, 0.55);
      for (const [i, j] of bp) back += t.post2([i, j, Z - 2], [i, j, Z + 19], 2, CHROME[0], CHROME_HI);
      back += t.box(bi[0], bi[1], bj[0] - (alongI ? -0.005 : 0), bj[1], Z + 8, Z + 20, '#F0565C', '#E2343B', '#B3263A', 1.4);
      const fm = faceOf(Z + 8);
      if (far) {
        back += S(quadOn(fm, 0.15, 0.85, Z + 10, Z + 18), 0.6, '#8E1B2E') + circle(...fm(0.5, Z + 14), 0.8, '#8E1B2E');
        const [hx, hy] = fm(0.3, Z + 17);
        back += hl(hx, hy, 2.6, 0.7, alongI ? 26 : -26, 0.6);
      } else {
        back += P(quadOn(fm, 0.08, 0.92, Z + 9.5, Z + 18.5), '#C9CED6', 0.8) + rivet(...fm(0.2, Z + 14), 0.6) + rivet(...fm(0.8, Z + 14), 0.6);
      }
    } else if (fam === 'wood') {
      for (const [i, j] of corners) legs += t.post2([i, j, 0], [i, j, Z - 3], 2.6, WOOD_M, '#C98B55');
      legs += t.line([corners[0][0], corners[0][1], 5], [corners[1][0], corners[1][1], 5], 1.6, WOOD_D) + t.line([corners[2][0], corners[2][1], 5], [corners[3][0], corners[3][1], 5], 1.6, WOOD_D);
      seat += t.box(ci - a, ci + a, cj - a, cj + a, Z - 3.4, Z, WOOD, WOOD_M, WOOD_D, 1.6);
      // plank seams + a knot
      if (alongI) for (const j of [cj - 0.05, cj + 0.05]) seat += t.line([ci - a, j, Z], [ci + a, j, Z], 0.7, WOOD_M);
      else for (const i of [ci - 0.05, ci + 0.05]) seat += t.line([i, cj - a, Z], [i, cj + a, Z], 0.7, WOOD_M);
      const [kx, ky] = t.p(ci + 0.04, cj - 0.06, Z);
      seat += P(ell(kx, ky, 1.4, 0.7), WOOD_M);
      for (const [i, j] of bp) {
        back += t.post2([i, j, Z - 2], [i, j, Z + 24], 2.6, WOOD_M, '#C98B55');
        const [x, y] = t.p(i, j, Z + 25.4);
        back += P(ell(x, y, 2, 1.8), WOOD, 1);
      }
      back += t.box(bi[0], bi[1], bj[0], bj[1], Z + 18, Z + 23, WOOD, WOOD_M, WOOD_D, 1.4);
      back += t.box(bi[0], bi[1], bj[0], bj[1], Z + 9, Z + 12.4, WOOD, WOOD_M, WOOD_D, 1.4);
      const fm = faceOf(Z + 18);
      back += S(`M${f(fm(0.2, Z + 20.4)[0])},${f(fm(0.2, Z + 20.4)[1])}L${f(fm(0.7, Z + 20.4)[0])},${f(fm(0.7, Z + 20.4)[1])}`, 0.6, '#E2AE78');
      if (!far) back += rivet(...fm(0.12, Z + 20.5), 0.55, '#3E2414', '#C98B55') + rivet(...fm(0.88, Z + 20.5), 0.55, '#3E2414', '#C98B55');
    } else {
      for (const [i, j] of corners) legs += boneLeg(t, [i, j, 0.8], [i, j, Z - 3.4], 2.2);
      seat += t.box(ci - a, ci + a, cj - a, cj + a, Z - 3.6, Z - 1.6, '#E6DCC2', '#E6DCC2', '#C9BC9A', 1.4);
      seat += t.box(ci - a + 0.015, ci + a - 0.015, cj - a + 0.015, cj + a - 0.015, Z - 1.6, Z, '#7A3A8C', '#6B2F7A', '#4E1F5C', 1.3);
      const [sx, sy] = t.p(ci, cj, Z);
      seat += hl(sx - 3, sy - 1, 3, 0.8, -20, 0.35) + circle(sx + 2, sy + 0.6, 0.6, '#B98ACB');
      // cobweb strand between legs
      const [w1x, w1y] = t.p(corners[1][0], corners[1][1], 6);
      const [w2x, w2y] = t.p(corners[3][0], corners[3][1], 9);
      legs += S(`M${f(w1x)},${f(w1y)}Q${f((w1x + w2x) / 2)},${f((w1y + w2y) / 2 + 3)} ${f(w2x)},${f(w2y)}`, 0.4, '#FFFFFF', 'opacity="0.8"');
      for (const [i, j] of bp) back += boneLeg(t, [i, j, Z - 1], [i, j, Z + 19], 2.2);
      const [ra, rb] = bp;
      back += boneLeg(t, [ra[0], ra[1], Z + 10], [rb[0], rb[1], Z + 10], 1.9);
      back += boneLeg(t, [ra[0], ra[1], Z + 4], [rb[0], rb[1], Z + 4], 1.6);
      const mid = t.p((ra[0] + rb[0]) / 2, (ra[1] + rb[1]) / 2, Z + 21);
      back += boneLeg(t, [ra[0], ra[1], Z + 18], [rb[0], rb[1], Z + 18], 2);
      back += skull(mid[0], mid[1] + 1.4, far, 1.05);
    }
    s += legs;
    if (far) s += back + seat;
    else s += seat + back;
    return s;
  });
}

// ------------------------------------------------------------------ kitchen
function kitchen(): ArtAsset[] {
  const out: ArtAsset[] = [];
  const TOPH = FRYER_Z + 3; // housing top (the oil sits 3 lower)

  out.push(
    floorProp('fryer', TOPH + 40, (d, t) => {
      let s = t.shadow(-0.44, 0.44, -0.44, 0.44, 0.18);
      for (const [i, j] of [[-0.32, 0.32], [0.32, -0.32], [0.32, 0.32]] as Pt[]) s += t.post([i, j, 0], [i, j, 4], 3, '#3A3535');
      s += t.box(-0.4, 0.4, -0.4, 0.4, 3, TOPH, '#D5DAE0', '#C2C8CF', '#9AA2AC');
      // +i face (front): door, vents, dial
      const F = faceMap(t.p(0.4, -0.4, 3), t.p(0.4, 0.4, 3), 3);
      const q = (s0: number, s1: number, z0: number, z1: number) => poly([F(s0, z0), F(s1, z0), F(s1, z1), F(s0, z1)]);
      s += P(q(0.08, 0.92, 6, TOPH - 9), '#B9C0C8', 1.1);
      for (let k = 0; k < 5; k++) {
        const z = 9 + k * 2;
        s += S(`M${f(F(0.18, z)[0])},${f(F(0.18, z)[1])}L${f(F(0.45, z)[0])},${f(F(0.45, z)[1])}`, 0.9, '#6E757E');
      }
      s += S(`M${f(F(0.62, 9)[0])},${f(F(0.62, 9)[1])}L${f(F(0.62, 16)[0])},${f(F(0.62, 16)[1])}`, 1.6, '#3A3535');
      // temperature dial: needle pegged at the skull
      const [dx, dy] = F(0.5, TOPH - 5.2);
      s += P(rrect(dx - 14, dy - 2.6, 28, 5.2, 1.4), '#2B2B33', 1);
      s += P(ell(dx - 5, dy, 2.2, 2.2), '#F4F1EA', 0.7) + S(`M${f(dx - 5)},${f(dy)}l1.6,-1.4`, 0.7, '#E2343B');
      s += circle(dx + 1, dy, 1, '#39E07A') + circle(dx + 4, dy, 1, '#FFC83D') + circle(dx + 7, dy, 1.1, '#FF3B3B');
      s += skull(dx + 11, dy + 1.6, true, 0.32);
      // +j face: warning sticker
      const L = faceMap(t.p(-0.4, 0.4, 3), t.p(0.4, 0.4, 3), 3);
      const [wx, wy] = L(0.45, 14);
      s += P(`M${f(wx)},${f(wy - 5)}L${f(wx + 5)},${f(wy + 3.6)}L${f(wx - 5)},${f(wy + 3.6)}Z`, '#FFD23D', 0.9);
      s += P(`M${f(wx - 1)},${f(wy + 2.6)}v-3.4q0,-0.8 0.6,-0.8q0.5,0 0.5,0.8v-1q0,-0.7 0.5,-0.7q0.5,0 0.5,0.7v3.6z`, OUT);
      s += S(`M${f(wx - 3.4)},${f(wy - 0.6)}L${f(wx + 3.4)},${f(wy + 3)}`, 0.8, '#E2343B');
      // backsplash with control knobs
      s += t.box(-0.44, -0.36, -0.4, 0.4, TOPH, TOPH + 14, '#C2C8CF', '#B9C0C8', '#D5DAE0', 1.6);
      for (const j of [-0.25, -0.05]) {
        const [kx, ky] = t.p(-0.36, j, TOPH + 7);
        s += P(ell(kx, ky, 1.8, 1.8), '#2B2B33', 0.8) + S(`M${f(kx)},${f(ky)}l0.8,-1.2`, 0.6, '#F4F1EA');
      }
      const [lx, ly] = t.p(-0.36, 0.2, TOPH + 7);
      s += circle(lx, ly, 1.8, '#FF3B3B') + circle(lx - 0.5, ly - 0.5, 0.6, '#FFC0C0');
      s += P(`M${f(lx)},${f(ly - 6)}l4,-2`, 'none');
      // oil well: dark rim, oil surface sunk 3 below
      const well = poly(t.quad(-0.28, 0.3, -0.3, 0.3, TOPH));
      s += P(well, '#4A4A52', 1.4);
      const oil = poly(t.quad(-0.28, 0.3, -0.3, 0.3, FRYER_Z));
      const [ox, oy] = t.p(0, 0, FRYER_Z);
      s += d.clip(well, P(oil, d.radial(ox, oy, 26, [[0, '#FFE08A'], [0.55, '#F2B33D'], [1, '#C98A1F']])));
      s += d.clip(well, S(`M${f(ox - 16)},${f(oy - 2)}q8,-4 16,0t16,0`, 0.7, '#FFF0B8', 'opacity="0.8"'));
      // two baskets sunk in the oil, handles out the front
      for (const j of [-0.15, 0.15]) {
        const b = t.quad(-0.18, 0.2, j - 0.12, j + 0.12, FRYER_Z + 0.6);
        s += d.clip(well, S(poly(b), 0.9, '#5A5A63') + S(`M${lerp2(b[0], b[3], 0.33)}L${f2(lerp2(b[1], b[2], 0.33))}M${f2(lerp2(b[0], b[3], 0.66))}L${f2(lerp2(b[1], b[2], 0.66))}`, 0.5, '#5A5A63'));
        s += t.line([0.2, j, FRYER_Z + 1], [0.5, j, TOPH + 7], 2.6) + t.line([0.2, j, FRYER_Z + 1], [0.5, j, TOPH + 7], 1.2, '#C9CED6');
        s += t.line([0.42, j, TOPH + 5.4], [0.56, j, TOPH + 8.2], 4) + t.line([0.42, j, TOPH + 5.4], [0.56, j, TOPH + 8.2], 2.4, '#E2343B');
      }
      s += S(well, 1.4);
      return s;
    }),
  );

  out.push(
    asset('fryer_bubbles', 40, 20, 0.5, 1, () => {
      let s = '';
      const B: [number, number, number][] = [
        [12, 15, 2.2], [17, 17.6, 1.6], [22, 14.6, 2.6], [27, 17, 1.8], [30, 13.4, 1.3], [15, 11.6, 1.2], [20, 18.4, 1.1], [25.6, 11.2, 1.4], [9, 17.4, 1.2],
      ];
      for (const [x, y, r] of B) s += P(ell(x, y, r * 1.2, r), '#FFE08A', 0.6, '#B8801A') + circle(x - r * 0.4, y - r * 0.4, r * 0.35, '#FFFFFF');
      // pop splashes + steam
      s += S('M19,9l-1,-2.4M21,8.6l0.2,-2.8M23,9.2l1.2,-2.2', 0.8, '#F2B33D');
      s += circle(17, 5.4, 0.8, '#FFE08A') + circle(25, 5, 0.6, '#FFE08A');
      s += S('M31,9q-2,-2.4 0,-4.6t0,-4.2M10,10q-2,-2 0,-4t0,-3.6', 1, '#FFFFFF', 'opacity="0.7"');
      return s;
    }),
  );

  out.push(
    floorProp('counter_chrome', COUNTER_Z + 26, (_d, t) => {
      const Z = COUNTER_Z;
      let s = t.shadow(-0.5, 0.5, -0.5, 0.5, 0.15);
      s += t.box(-0.44, 0.44, -0.44, 0.44, 0, 4, '#2B2B33', '#2B2B33', '#1C1C22', 1.4);
      s += t.box(-0.44, 0.44, -0.44, 0.44, 4, Z - 4, '#D5DAE0', '#C9CED6', '#9AA2AC');
      // fluted stainless
      for (let k = 1; k < 11; k++) {
        const v = -0.44 + k * 0.08;
        s += t.line([v, 0.44, 5], [v, 0.44, Z - 9], 0.9, k % 2 ? CHROME_HI : '#A8AFB8');
        s += t.line([0.44, v, 5], [0.44, v, Z - 9], 0.9, k % 2 ? '#C9CED6' : '#7E858E');
      }
      // red vinyl band with a chrome bead
      s += t.box(-0.45, 0.45, -0.45, 0.45, Z - 9, Z - 4, '#E2343B', '#E2343B', '#B3263A', 1.4);
      s += t.line([-0.45, 0.45, Z - 6.5], [0.45, 0.45, Z - 6.5], 0.7, '#FF8A8E') + t.line([0.45, 0.45, Z - 6.5], [0.45, -0.45, Z - 6.5], 0.7, '#E2343B');
      // white formica top with chrome edge + boomerangs
      s += t.box(-0.49, 0.49, -0.49, 0.49, Z - 4, Z, '#F6F2EA', CHROME[0], CHROME[1], PW);
      s += t.line([-0.49, 0.49, Z - 2], [0.49, 0.49, Z - 2], 0.7, CHROME_HI) + t.line([0.49, 0.49, Z - 2], [0.49, -0.49, Z - 2], 0.7, '#C9CED6');
      const boomer = (i: number, j: number, a: number, c: string) => {
        const [x, y] = t.p(i, j, Z);
        return `<path d="M${f(x - 3.2)},${f(y)}q3.2,-2.4 6.4,0q-3.2,-1 -6.4,0z" fill="none" stroke="${c}" stroke-width="1" transform="rotate(${a} ${f(x)} ${f(y)})"/>`;
      };
      s += boomer(-0.25, 0.1, -10, '#3FB8AF') + boomer(0.2, -0.22, 20, '#F49AC1') + boomer(0.15, 0.28, -25, '#3FB8AF') + boomer(-0.1, -0.35, 15, '#F49AC1');
      for (const [i, j] of [[0, 0], [-0.3, 0.3], [0.32, 0.05], [-0.05, -0.15]] as Pt[]) {
        const [x, y] = t.p(i, j, Z);
        s += circle(x, y, 0.6, OUT);
      }
      s += t.line([-0.42, -0.3, Z], [-0.42, 0.3, Z], 0.9, '#FFFFFF');
      // service bell on the far corner
      const [bx, by] = t.p(-0.34, -0.34, Z);
      s += P(ell(bx, by, 4.4, 2), '#2B2B33', 0.9) + P(`M${f(bx - 3.6)},${f(by - 0.4)}q0,-5 3.6,-5q3.6,0 3.6,5z`, GOLD[0], 0.9) + S(`M${f(bx)},${f(by - 5.4)}v-1.6`, 1.2) + hl(bx - 1.6, by - 3, 1, 0.6, -30, 0.8);
      return s;
    }),
  );

  out.push(
    asset('keep_warm', 88, 66, 0.5, 1, (d) => {
      const t = new Iso(44, 66);
      const L = t.p(-0.38, 0.32, 0);
      const Rt = t.p(0.32, -0.38, 0);
      const H = 40;
      let s = '';
      // light cone onto the stove top
      const cone = d.linear(0, 66 - H, 0, 66, [[0, '#FF6A2A', 0.42], [1, '#FF3B1F', 0]]);
      s += P(`M${f(L[0] + 6)},${f(L[1] - H + 6)}L${f(Rt[0] - 6)},${f(Rt[1] - H + 6)}L${f(Rt[0] + 2)},66L${f(L[0] - 2)},66Z`, cone);
      // heat squiggles
      for (const x of [-16, -4, 8, 20]) s += S(`M${f(44 + x)},${f(52)}q-2,-3 0,-6t0,-6`, 1, '#FFB23D', 'opacity="0.6"');
      // posts
      for (const p of [L, Rt]) {
        s += P(ell(p[0], p[1], 3.6, 1.6), '#5A5F68', 1);
        s += S(`M${f(p[0])},${f(p[1])}V${f(p[1] - H + 2)}`, 4.4) + S(`M${f(p[0])},${f(p[1])}V${f(p[1] - H + 2)}`, 2.2, CHROME[0]) + S(`M${f(p[0] - 0.6)},${f(p[1] - 2)}V${f(p[1] - H + 4)}`, 0.7, CHROME_HI);
      }
      // hood: a long red heat lamp with glowing bulbs underneath
      const y0 = L[1] - H;
      const hood = `M${f(L[0] - 5)},${f(y0 + 4)}L${f(L[0] - 1)},${f(y0 - 6)}H${f(Rt[0] + 1)}L${f(Rt[0] + 5)},${f(y0 + 4)}Z`;
      s += d.shaded(hood, '#E2343B', '#B3263A', PW, [0, -1.6]);
      s += P(`M${f(L[0] - 1)},${f(y0 - 6)}H${f(Rt[0] + 1)}L${f(Rt[0] - 1)},${f(y0 - 8.4)}H${f(L[0] + 1)}Z`, '#F0565C', 1.4);
      s += S(`M${f(L[0] + 2)},${f(y0 - 3)}H${f(Rt[0] - 2)}`, 0.8, '#FF8A8E');
      const glow = d.blur(1.6);
      s += `<g filter="${glow}">${P(rrect(L[0] - 2, y0 + 3, Rt[0] - L[0] + 4, 4, 2), '#FFB23D')}</g>`;
      for (let k = 0; k < 4; k++) {
        const x = lerp1(L[0] + 4, Rt[0] - 4, k / 3);
        s += P(ell(x, y0 + 5.2, 4, 1.8), '#FFD873', 0.8, '#B3263A') + P(ell(x, y0 + 4.8, 2, 0.8), '#FFF6D0');
      }
      // label + cord
      s += P(rrect(44 - 9, y0 - 3.6, 18, 5, 1.2), '#2B1B17') + T(44, y0, 3.4, '#FFC23D', 'KEEP WARM');
      s += S(`M${f(Rt[0])},${f(Rt[1] - 10)}q5,1 4,5t5,2`, 1, '#2B2B33');
      return s;
    }),
  );
  return out;
}

function lerp1(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}
function lerp2(a: Pt, b: Pt, k: number): string {
  return `${f(a[0] + (b[0] - a[0]) * k)},${f(a[1] + (b[1] - a[1]) * k)}`;
}
const f2 = (s: string) => s;

export function furnitureProps(): ArtAsset[] {
  const out = [...tables()];
  for (const fam of ['diner', 'wood', 'bone'] as Family[]) for (const dir of ['se', 'sw', 'ne', 'nw'] as Dir[]) out.push(chair(fam, dir));
  out.push(...kitchen());
  return out;
}

