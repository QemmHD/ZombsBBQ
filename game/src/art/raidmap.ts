/**
 * The raid road-trip map: a hand-drawn map of a ruined, zombie-overrun America (map_bg, 1600 x 900,
 * anchor 0,0) and the building icons placed on it (map_home, map_joint_<rival>, 160 x 140, anchor 0.5,1).
 *
 * MAP_LAYOUT gives each building's anchor (bottom-center) in map_bg pixels, in unlock order
 * home → chuck → hank → vera → crunch → snob. The highway passes just below every anchor
 * (≈ 30 px lower), so put the level/name label under the building, on the road.
 * Nothing in map_bg is drawn in the building boxes (anchor.x ± 85, anchor.y - 150 .. anchor.y + 12).
 */
import type { ArtAsset } from './types';
import { RIVAL_IDS } from './manifest';
import type { RivalId } from './manifest';
import { Doc, OUT, P, S, ell, f, hl, poly, rrect } from './svg';
import type { Pt } from './svg';
import { Iso, at, blobs, rnd, sampleOpen, smoothClosed, smoothOpen, txt, wobble } from './raidkit';

export const MAP_W = 1600;
export const MAP_H = 900;

export const MAP_LAYOUT: Readonly<Record<'home' | RivalId, { x: number; y: number }>> = {
  home: { x: 175, y: 715 },
  chuck: { x: 470, y: 545 },
  hank: { x: 740, y: 735 },
  vera: { x: 975, y: 450 },
  crunch: { x: 1230, y: 690 },
  snob: { x: 1435, y: 395 },
};

const ROAD_DY = 30;

/** Highway control points (smooth curve through them). */
function roadPts(): Pt[] {
  const L = MAP_LAYOUT;
  const r = (k: keyof typeof MAP_LAYOUT, dx = 0): Pt => [L[k].x + dx, L[k].y + ROAD_DY];
  return [
    [-60, 830],
    [40, 790],
    r('home'),
    [320, 665],
    r('chuck'),
    [600, 640],
    r('hank'),
    [870, 650],
    r('vera'),
    [1100, 570],
    r('crunch'),
    [1345, 590],
    r('snob'),
    [1540, 380],
    [1660, 330],
  ];
}

const RIVER: Pt[] = [
  [540, -30],
  [585, 120],
  [545, 290],
  [640, 470],
  [615, 640],
  [655, 790],
  [610, 940],
];

function distToPolyline(p: Pt, line: Pt[]): number {
  let best = Infinity;
  for (let k = 0; k < line.length - 1; k++) {
    const [ax, ay] = line[k];
    const [bx, by] = line[k + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const L2 = dx * dx + dy * dy || 1;
    let t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy));
    if (d < best) best = d;
  }
  return best;
}

// ------------------------------------------------------------------ small map doodads (ground point at x, y)
const pine = (d: Doc, x: number, y: number, s = 1, dead = false): string => {
  const c = dead ? ['#6E7A4A', '#55603A'] : ['#3F8A3A', '#2C6A2C'];
  return (
    at(
      x,
      y,
      P('M-2,0h4v-6h-4z', '#6A4122', 1.4) +
        d.shaded('M0,-34L10,-14H5L12,-4H-12L-5,-14H-10Z', c[0], c[1], 1.8, [-1.4, -1]) +
        S('M-4,-18l3,-2M2,-9l4,-2', 1, '#7CC24A', 'opacity="0.6"'),
      s,
    )
  );
};
const roundTree = (d: Doc, x: number, y: number, s = 1, hue = 0): string => {
  const cols = [['#5FAE45', '#3F8A3A'], ['#7CC24A', '#4E9A3C'], ['#E0A23A', '#B4761E']][hue];
  return at(x, y, P('M-2.4,0h4.8l-0.6,-12h-3.6z', '#7A4524', 1.4) + blobs(d, [[-6, -16, 7], [5, -17, 7.4], [0, -24, 8]], cols[0], cols[1], 1.4, [-1.4, -1.4]), s);
};
const deadTree = (x: number, y: number, s = 1): string =>
  at(x, y, S('M0,0V-22M0,-12l-8,-8M0,-16l7,-9M-8,-20l-2,-5M7,-25l4,-2', 5, OUT) + S('M0,0V-22M0,-12l-8,-8M0,-16l7,-9M-8,-20l-2,-5M7,-25l4,-2', 2.6, '#7A5A44'), s);
const cactus = (d: Doc, x: number, y: number, s = 1): string =>
  at(
    x,
    y,
    d.shaded('M-3.4,0V-24a3.4,3.4 0 0 1 6.8,0V0Z', '#5FAE45', '#3F8A3A', 1.6, [-1, 0]) +
      d.shaded('M-3.4,-10H-8V-18a2.4,2.4 0 0 1 4.8,0V-14H-3.4Z', '#5FAE45', '#3F8A3A', 1.4, [-0.8, 0]) +
      d.shaded('M3.4,-13H8V-21a2.4,2.4 0 0 0 -4.8,0V-17H3.4Z', '#5FAE45', '#3F8A3A', 1.4, [-0.8, 0]) +
      S('M0,-22v18', 0.6, '#2C6A2C'),
    s,
  );
const wheat = (x: number, y: number, s = 1): string =>
  at(x, y, S('M0,0l-3,-12M0,0l0,-14M0,0l3,-12', 2.6, '#9C7A1E') + S('M0,0l-3,-12M0,0l0,-14M0,0l3,-12', 1.2, '#F2CF5B') + P(ell(-3, -13, 1.4, 2.4), '#F2CF5B', 0.8) + P(ell(0, -15, 1.4, 2.6), '#F2CF5B', 0.8) + P(ell(3, -13, 1.4, 2.4), '#F2CF5B', 0.8), s);
const tomb = (d: Doc, x: number, y: number, s = 1, cross = false): string =>
  at(
    x,
    y,
    P(ell(0, 0, 8, 2.4), '#6A4122', 0, OUT, 'opacity="0.5"') +
      (cross
        ? P('M-1.8,0V-10H-6V-13.6H-1.8V-18H1.8V-13.6H6V-10H1.8V0Z', '#B5BBC4', 1.4)
        : d.shaded('M-6,0V-10A6,6 0 0 1 6,-10V0Z', '#B5BBC4', '#8A909A', 1.4, [-1, -1]) + S('M-3,-9h6M-3,-6h6', 0.8, '#7D838C')),
    s,
  );
const skull = (x: number, y: number, s = 1): string =>
  at(
    x,
    y,
    S('M-7,-1L7,-7M-7,-7L7,-1', 3.6, OUT) + S('M-7,-1L7,-7M-7,-7L7,-1', 1.8, '#FFF4DC') +
      P('M-5,-8C-5,-15 5,-15 5,-8C5,-5 3,-5 3,-3H-3C-3,-5 -5,-5 -5,-8Z', '#FFF4DC', 1.3) +
      P(ell(-2, -8.6, 1.4, 1.6), OUT) + P(ell(2, -8.6, 1.4, 1.6), OUT),
    s,
  );
const zHand = (x: number, y: number, s = 1): string =>
  at(
    x,
    y,
    P(ell(0, 0, 6, 2), '#6A4122', 0, OUT, 'opacity="0.6"') +
      P('M-2.4,0V-8L-5,-12.4L-3.6,-13.4L-1.6,-10.4V-15H0.2V-10.6L1.2,-16H3V-10L4.6,-14.4H6.2L4,-7L2.6,0Z', '#8DC63F', 1.3) +
      S('M-1,-4h2', 0.7, '#5E9A2A'),
    s,
  );
const bush = (d: Doc, x: number, y: number, s = 1): string => at(x, y, blobs(d, [[-5, -4, 5], [4, -4, 5.4], [0, -7, 5]], '#6DB33E', '#4E8A2E', 1.3, [-1, -1]), s);
const rock = (d: Doc, x: number, y: number, s = 1): string => at(x, y, d.shaded('M-9,0L-7,-6L-2,-9L5,-8L9,-3L8,0Z', '#B9A58A', '#8F7C62', 1.4, [-1, -1]), s);

function car(d: Doc, x: number, y: number, col: [string, string], rot = 0, s = 1, flip = false, smoke = false): string {
  let c = '';
  c += d.shaded('M-16,-4V-10L-10,-11L-6,-17H6L11,-11L16,-10V-4Z', col[0], col[1], 1.6, [-1, -1]);
  c += P('M-4.6,-15.6H-0.6V-11.4H-8Z', '#BFE6FF', 1) + P('M0.8,-15.6H5L8.6,-11.4H0.8Z', '#BFE6FF', 1);
  c += S('M-5,-14l2,2', 0.7, '#FFFFFF');
  c += S('M2,-15l-4,4', 0.8, OUT);
  c += P(ell(-9, -4, 3.6), '#3A3A44', 1.4) + P(ell(9, -4, 3.6), '#3A3A44', 1.4) + P(ell(-9, -4, 1.2), '#B5BBC4') + P(ell(9, -4, 1.2), '#B5BBC4');
  c += P(ell(15, -8.6, 1.2, 1), '#FFE14D', 0.6);
  let g = `<g transform="rotate(${rot})${flip ? ' scale(-1 1)' : ''}">${c}</g>`;
  if (smoke) g = blobs(d, [[2, -22, 5], [6, -30, 6.4], [3, -39, 7.4]], '#8A8F98', '#6B707A', 1.2, [-1, -1]) + g;
  return at(x, y, P(ell(0, 1, 16, 3), OUT, 0, OUT, 'opacity="0.18"') + g, s);
}

function bus(d: Doc, x: number, y: number, s = 1): string {
  // school bus on its side, rusted
  let b = P(ell(0, 1, 30, 4), OUT, 0, OUT, 'opacity="0.2"');
  b += d.shaded('M-28,0V-16H26Q30,-16 30,-12V0Z', '#F2B624', '#C98E12', 1.6, [-1, -1]);
  for (let k = 0; k < 6; k++) b += P(rrect(-25 + k * 8, -13.6, 6, 5, 1), '#3A3A44', 0.9);
  b += P(ell(-18, -16, 3.4, 1.4), '#3A3A44', 1.2) + P(ell(18, -16, 3.4, 1.4), '#3A3A44', 1.2);
  b += S('M-26,-5H28', 1, '#2B1B17') + P(ell(6, -3, 4, 1.6), '#B4561E', 0, OUT, 'opacity="0.6"');
  b += zHand(-6, -16, 0.8);
  return at(x, y, b, s);
}

function mesa(d: Doc, x: number, y: number, s = 1): string {
  return at(
    x,
    y,
    d.shaded('M-34,0L-26,-26H-20L-18,-34H16L20,-24H26L36,0Z', '#D9844A', '#B4612E', 1.8, [-2, -1]) +
      S('M-24,-18H22M-30,-9H31', 1, '#B4612E') + P('M-18,-34H16L14,-30H-16Z', '#E8A06A'),
    s,
  );
}

function mountain(d: Doc, x: number, y: number, s = 1, snow = true): string {
  let m = d.shaded('M-46,0L-6,-58L4,-48L10,-56L46,0Z', '#8C93A6', '#6B7186', 2, [-3, 0]);
  if (snow) m += P('M-14,-46L-6,-58L4,-48L10,-56L19,-42L12,-38L8,-44L2,-38L-4,-46L-9,-40Z', '#FFFFFF', 1.4);
  m += S('M-6,-58L-14,-30M10,-56L18,-30', 1, '#5A6075', 'opacity="0.6"');
  return at(x, y, m, s);
}

function windmill(d: Doc, x: number, y: number, s = 1): string {
  let w = S('M-8,0L-2,-40M8,0L2,-40M-6,-12h12M-4,-26h8', 3.4, OUT) + S('M-8,0L-2,-40M8,0L2,-40M-6,-12h12M-4,-26h8', 1.8, '#8A909A');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    w += P(`M0,-44L${f(Math.cos(a) * 15)},${f(-44 + Math.sin(a) * 15)}L${f(Math.cos(a + 0.3) * 15)},${f(-44 + Math.sin(a + 0.3) * 15)}Z`, k === 3 ? 'none' : '#E8ECF0', 1);
  }
  w += P(ell(0, -44, 2.4), '#B3263A', 1) + P('M3,-46l10,-2l-2,5z', '#B3263A', 1);
  void d;
  return at(x, y, w, s);
}

function waterTower(d: Doc, x: number, y: number, s = 1): string {
  let w = S('M-10,0L-7,-30M10,0L7,-30M-8,-10L8,-20M8,-10L-8,-20', 3.2, OUT) + S('M-10,0L-7,-30M10,0L7,-30M-8,-10L8,-20M8,-10L-8,-20', 1.6, '#8A909A');
  w += d.shaded('M-14,-30V-46Q0,-56 14,-46V-30Q0,-26 -14,-30Z', '#9AC1D9', '#6E97B2', 1.8, [-1.4, -1]);
  w += txt(0, -35, 'BRAINS', 7, '#2F7A3A', { extra: 'textLength="22" lengthAdjust="spacingAndGlyphs" transform="rotate(-6 0 -37)"' });
  w += P('M4,-29c0,3 1,6 0,8c-1,-2 -1,-5 0,-8z', '#8DC63F', 0.8);
  return at(x, y, w, s);
}

function silo(d: Doc, x: number, y: number, s = 1): string {
  return at(x, y, d.shaded('M-9,0V-34A9,7 0 0 1 9,-34V0Z', '#C9D2DC', '#9AA1AB', 1.6, [-1.4, 0]) + S('M-9,-24h18M-9,-12h18', 0.9, '#8A909A') + P('M-9,-34A9,7 0 0 1 9,-34Z', '#B3263A', 1.4), s);
}

function ruinTower(d: Doc, x: number, y: number, h: number, wd: number, s = 1, seed = 1): string {
  const R = rnd(seed);
  const top: Pt[] = [];
  const n = 5;
  for (let k = 0; k <= n; k++) top.push([-wd / 2 + (wd * k) / n, -h + R() * 14 * (k % 2 ? 1 : 0.4)]);
  const d0 = poly([[-wd / 2, 0], ...top, [wd / 2, 0]]);
  let t = d.shaded(d0, '#8C8FA0', '#666A7A', 1.6, [-1.4, 0]);
  let win = '';
  for (let yy = -h + 18; yy < -6; yy += 9) for (let xx = -wd / 2 + 4; xx < wd / 2 - 4; xx += 7) win += R() > 0.3 ? `M${f(xx)},${f(yy)}h4v5h-4z` : '';
  t += d.clip(d0, P(win, '#3A3A44') + P(win.split('z').filter((_, k) => k % 5 === 0).join('z') + (win ? 'z' : ''), '#FFC83D', 0, OUT, 'opacity="0.8"'));
  t += S('M' + f(-wd / 4) + ',' + f(-h + 10) + 'l4,10l-3,8l5,9', 1.2, '#3A3A44');
  return at(x, y, t, s);
}

function smokePlume(d: Doc, x: number, y: number, s = 1, dark = true): string {
  const c: [string, string] = dark ? ['#7A7F8A', '#5A5F6A'] : ['#E8ECF0', '#C9CFD8'];
  return `<g opacity="0.85">${at(x, y, blobs(d, [[0, -6, 6], [4, -16, 8], [-2, -28, 10], [6, -40, 12]], c[0], c[1], 1.2, [-1.4, -1.4]), s)}</g>`;
}

function billboard(d: Doc, x: number, y: number, l1: string, l2: string, bg: string, fg: string, s = 1, tilt = 0): string {
  let b = S('M-18,0V-26M18,0V-26', 3.6, OUT) + S('M-18,0V-26M18,0V-26', 2, '#8A5A30');
  b += `<g transform="rotate(${tilt} 0 -36)">` + d.shaded(rrect(-32, -50, 64, 26, 2), bg, bg, 1.8, [0, 0]) + txt(0, -39, l1, 9, fg, { extra: 'textLength="54" lengthAdjust="spacingAndGlyphs"' }) + txt(0, -28.6, l2, 8, OUT, { extra: 'textLength="44" lengthAdjust="spacingAndGlyphs"' }) + '</g>';
  return at(x, y, b, s);
}

function shield(x: number, y: number, label: string, s = 1): string {
  return at(
    x,
    y,
    S('M0,0V-14', 3, OUT) + S('M0,0V-14', 1.6, '#8A909A') + P('M-10,-32H10V-22C10,-16 4,-14 0,-12C-4,-14 -10,-16 -10,-22Z', '#FFFFFF', 1.6) + P('M-8,-30H8V-26H-8Z', '#2F4C8F') + txt(0, -15.6, label, 9, OUT, { extra: 'textLength="14" lengthAdjust="spacingAndGlyphs"' }),
    s,
  );
}

function zombieWalker(x: number, y: number, s = 1, seed = 1): string {
  const R = rnd(seed);
  const shirt = ['#B3263A', '#2F4C8F', '#E0A23A', '#7A4F9A'][Math.floor(R() * 4)];
  return at(
    x,
    y,
    P(ell(0, 0, 5, 1.6), OUT, 0, OUT, 'opacity="0.25"') +
      S('M-1.6,0L-1,-6M1.6,0L1,-6', 2.8, OUT) + S('M-1.6,0L-1,-6M1.6,0L1,-6', 1.4, '#3A3A44') +
      P(rrect(-3, -12, 6, 7, 1.6), shirt, 1.1) +
      S('M1,-10.4h7', 3, OUT) + S('M1,-10.4h7', 1.6, '#8DC63F') +
      P(ell(0.6, -15, 3.6, 3.4), '#8DC63F', 1.1) + P(ell(2, -15.4, 0.8), '#FFE14D'),
    s,
  );
}

function compass(d: Doc, x: number, y: number, s = 1): string {
  let c = P(ell(0, 0, 50), '#FFF4DC', 2.4) + S(ell(0, 0, 44), 1, '#B9A88C') + S(ell(0, 0, 40), 0.8, '#B9A88C', 'stroke-dasharray="3 3"');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const r = k % 2 ? 26 : 40;
    const w = k % 2 ? 6 : 9;
    const tip: Pt = [Math.cos(a) * r, Math.sin(a) * r];
    const l: Pt = [Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w];
    const rr: Pt = [Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w];
    const dark = k === 0 ? '#B3263A' : k % 2 ? '#8A5A30' : '#2B1B17';
    c += P(poly([[0, 0], l, tip]), k === 0 ? '#E2343B' : k % 2 ? '#C98B55' : '#FFF4DC', 1.4) + P(poly([[0, 0], tip, rr]), dark, 1.4);
  }
  c += P(ell(0, 0, 5), '#FFC83D', 1.4);
  c += txt(0, -50, 'N', 16, '#B3263A', { sw: 3.4, stroke: '#FFF4DC' });
  c += txt(52, 5, 'E', 11, OUT, { sw: 3, stroke: '#FFF4DC' }) + txt(-52, 5, 'W', 11, OUT, { sw: 3, stroke: '#FFF4DC' }) + txt(0, 58, 'S', 11, OUT, { sw: 3, stroke: '#FFF4DC' });
  // a zombie hand gripping the rim for laughs
  c += `<g transform="translate(34 40) rotate(-35)">` + P('M-3,6V-2L-5,-6L-3.6,-7L-1.6,-4V-9H0.2V-4.6L1.2,-10H3V-4L4.6,-8.4H6.2L4,-1L3,6Z', '#8DC63F', 1.3) + '</g>';
  void d;
  return at(x, y, c, s);
}

function youAreHere(d: Doc, x: number, y: number): string {
  let s = S('M0,0V-62', 5.4, OUT) + S('M0,0V-62', 3.2, '#8A5A30');
  s += P(ell(0, 0, 10, 3), OUT, 0, OUT, 'opacity="0.25"');
  // arrow board pointing down-left at the home joint
  s += `<g transform="rotate(24 0 -64)">` + d.shaded('M-56,-64L-40,-84H44V-44H-40Z', '#E2343B', '#B3263A', 2.4, [-1.6, -1.6]) + txt(4, -68, 'YOU ARE', 13, '#FFF4DC', { sw: 3, extra: 'textLength="64" lengthAdjust="spacingAndGlyphs"' }) + txt(4, -50, 'HERE!', 15, '#FFE14D', { sw: 3, extra: 'textLength="56" lengthAdjust="spacingAndGlyphs"' }) + '</g>';
  s += P(ell(0, -63, 2.4), '#B5BBC4', 1);
  return at(x, y, s);
}

// ------------------------------------------------------------------ map background
interface Zone {
  name: string;
  c: Pt;
  rx: number;
  ry: number;
  fill: string;
  edge: string;
  seed: number;
}

const ZONES: Zone[] = [
  { name: 'prairie', c: [420, 400], rx: 330, ry: 260, fill: '#DCCB78', edge: '#C2AE5A', seed: 3 },
  { name: 'desert', c: [770, 800], rx: 270, ry: 210, fill: '#EBC88A', edge: '#D2A866', seed: 5 },
  { name: 'forest', c: [990, 300], rx: 270, ry: 250, fill: '#6FAA54', edge: '#4E8A3C', seed: 7 },
  { name: 'farm', c: [1240, 770], rx: 250, ry: 190, fill: '#A9C661', edge: '#8AA84A', seed: 9 },
  { name: 'city', c: [1480, 310], rx: 230, ry: 270, fill: '#B3B1A8', edge: '#94928A', seed: 11 },
  { name: 'home', c: [150, 740], rx: 230, ry: 200, fill: '#8CC85A', edge: '#6FAE45', seed: 13 },
];

function inEll(p: Pt, z: Zone, k = 1): boolean {
  const dx = (p[0] - z.c[0]) / (z.rx * k);
  const dy = (p[1] - z.c[1]) / (z.ry * k);
  return dx * dx + dy * dy < 1;
}

export function buildMapBg(): ArtAsset {
  const d = new Doc('map_bg');
  const road = sampleOpen(roadPts(), 30);
  const river = sampleOpen(RIVER, 30);
  const L = MAP_LAYOUT;
  const buildings = Object.values(L);
  const blocked = (p: Pt, pad = 0): boolean => {
    for (const b of buildings) if (p[0] > b.x - 85 - pad && p[0] < b.x + 85 + pad && p[1] > b.y - 150 - pad && p[1] < b.y + 14 + pad) return true;
    return false;
  };
  const clearOf = (p: Pt, roadPad = 34, riverPad = 24) =>
    distToPolyline(p, road) > roadPad && distToPolyline(p, river) > riverPad && !blocked(p) && Math.hypot((p[0] - 1110) / 84, (p[1] - 222) / 46) > 1;

  let s = '';
  // ---- base land + paper texture
  s += P(`M0,0H${MAP_W}V${MAP_H}H0Z`, '#A9C86C');
  const R0 = rnd(99);
  for (let k = 0; k < 260; k++) s += `<circle cx="${f(R0() * MAP_W)}" cy="${f(R0() * MAP_H)}" r="${f(1 + R0() * 2.4)}" fill="${k % 2 ? '#9BBB60' : '#B7D37A'}" opacity="0.7"/>`;
  // ---- zones
  for (const z of ZONES) {
    const pts = wobble(z.c[0], z.c[1], z.rx, z.ry, 16, 0.28, z.seed);
    const dd = smoothClosed(pts);
    s += P(dd, z.fill) + S(dd, 3, z.edge, 'stroke-dasharray="10 7" opacity="0.8"');
  }
  // desert: cracked earth
  {
    const z = ZONES[1];
    const R = rnd(17);
    let cr = '';
    for (let k = 0; k < 70; k++) {
      const p: Pt = [z.c[0] + (R() - 0.5) * z.rx * 1.7, z.c[1] + (R() - 0.5) * z.ry * 1.6];
      if (!inEll(p, z, 0.85) || !clearOf(p, 26, 10)) continue;
      let x = p[0];
      let y = p[1];
      cr += `M${f(x)},${f(y)}`;
      for (let q = 0; q < 3; q++) {
        x += (R() - 0.5) * 22;
        y += (R() - 0.5) * 10;
        cr += `L${f(x)},${f(y)}`;
      }
      cr += `M${f(p[0])},${f(p[1])}l${f((R() - 0.5) * 14)},${f(6 + R() * 6)}`;
    }
    s += S(cr, 1.4, '#B98A4E', 'opacity="0.8"');
  }
  // farm: patchwork fields with crop rows
  {
    const fields: [number, number, number, number, string, number][] = [
      [1060, 790, 110, 60, '#C9D86A', -18],
      [1330, 800, 120, 70, '#E3CF6A', 12],
      [1150, 860, 130, 40, '#8FBF52', 8],
      [1400, 700, 70, 60, '#B9D06A', -10],
    ];
    for (const [x, y, w, h, c, r] of fields) {
      const fd = rrect(-w / 2, -h / 2, w, h, 6);
      let rows = '';
      for (let k = -w / 2 + 6; k < w / 2; k += 9) rows += `M${k},${-h / 2}V${h / 2}`;
      s += `<g transform="translate(${x} ${y}) rotate(${r})">` + P(fd, c, 1.4, '#8AA84A') + d.clip(fd, S(rows, 2, '#7A9A3A', 'opacity="0.55"')) + '</g>';
    }
  }
  // city: asphalt blocks
  {
    const R = rnd(31);
    let blocks = '';
    for (let k = 0; k < 26; k++) {
      const x = 1290 + R() * 300;
      const y = 80 + R() * 420;
      if (!inEll([x, y], ZONES[4], 0.9)) continue;
      blocks += rrect(x, y, 30 + R() * 30, 20 + R() * 16, 3);
    }
    s += P(blocks, '#9E9C94', 0, OUT, 'opacity="0.6"');
  }
  // ---- mountains along the top (behind everything)
  {
    const peaks: [number, number, number, boolean][] = [
      [40, 120, 1.2, true], [120, 100, 1.5, true], [210, 128, 1.1, true], [300, 96, 1.6, true], [400, 120, 1.2, true],
      [690, 110, 1.4, true], [780, 92, 1.7, true], [870, 118, 1.2, true],
    ];
    for (const [x, y, sc, sn] of peaks) s += mountain(d, x, y, sc, sn);
  }
  // ---- river + lake
  {
    const rv = smoothOpen(RIVER);
    s += S(rv, 34, OUT) + S(rv, 29, '#4FA3D9') + S(rv, 14, '#7FC4EE') + S(rv, 2, '#D8F0FF', 'stroke-dasharray="10 26" opacity="0.9"');
    const lake = smoothClosed(wobble(1110, 215, 70, 34, 10, 0.22, 4));
    s += P(lake, '#4FA3D9', 3) + P(smoothClosed(wobble(1104, 210, 52, 22, 10, 0.2, 6)), '#7FC4EE');
    s += S('M1080,206q8,-4 16,0M1118,224q8,-4 16,0', 1.4, '#D8F0FF');
    s += zHand(1128, 210, 1.3);
  }
  // ---- highway
  {
    const rd = smoothOpen(roadPts());
    s += S(rd, 40, OUT) + S(rd, 35, '#55555E') + S(rd, 31, '#4A4A52');
    s += S(rd, 1.4, '#8A8A94', 'transform="translate(0 -13)" opacity="0.5"');
    s += S(rd, 3, '#FFD23D', 'stroke-dasharray="14 12"');
    // potholes + cracks along the road
    const R = rnd(55);
    for (let k = 40; k < road.length - 20; k += 23) {
      const [x, y] = road[k];
      if (R() < 0.5) s += P(ell(x + (R() - 0.5) * 16, y + (R() - 0.5) * 8, 4 + R() * 3, 2 + R()), '#2E2E34', 0.8, '#3A3A44');
      else s += S(`M${f(x - 8)},${f(y - 6)}l5,4l-2,4l6,3`, 1.2, '#2E2E34');
    }
    // bridge where the highway crosses the river
    let best = 0;
    let bd = Infinity;
    for (let k = 0; k < road.length; k++) {
      const dd = distToPolyline(road[k], river);
      if (dd < bd) {
        bd = dd;
        best = k;
      }
    }
    const [bx, by] = road[best];
    const a = road[Math.min(best + 2, road.length - 1)];
    const b = road[Math.max(best - 2, 0)];
    const ang = (Math.atan2(a[1] - b[1], a[0] - b[0]) * 180) / Math.PI;
    let br = P(rrect(-34, -24, 68, 48, 4), '#A8693A', 2.4);
    for (let x = -30; x < 34; x += 7) br += S(`M${x},-22V22`, 1, '#7A4524');
    br += P(rrect(-36, -27, 72, 6, 2), '#8A5A30', 2) + P(rrect(-36, 21, 72, 6, 2), '#8A5A30', 2);
    for (const x of [-34, -12, 12, 34]) br += P(rrect(x - 2.6, -31, 5.2, 8, 1.4), '#6A4122', 1.4) + P(rrect(x - 2.6, 19, 5.2, 8, 1.4), '#6A4122', 1.4);
    br += S('M-30,-4h12M4,6h20', 1.6, '#FFD23D', 'opacity="0.6"');
    // a broken plank
    br += P('M8,-22h7l-2,10h-6z', '#2E2E34', 1);
    s += `<g transform="translate(${f(bx)} ${f(by)}) rotate(${f(ang)})">${br}</g>`;
  }
  // ---- scattered doodads, sorted by y for painter's order
  const items: [number, string][] = [];
  const occupied: Pt[] = [];
  const place = (z: Zone | null, n: number, seed: number, draw: (x: number, y: number, R: () => number) => string, minGap = 26, k = 0.92) => {
    const R = rnd(seed);
    let tries = 0;
    let placed = 0;
    while (placed < n && tries < n * 30) {
      tries++;
      const p: Pt = z ? [z.c[0] + (R() - 0.5) * z.rx * 2, z.c[1] + (R() - 0.5) * z.ry * 2] : [R() * MAP_W, R() * MAP_H];
      if (z && !inEll(p, z, k)) continue;
      if (p[0] < 20 || p[0] > MAP_W - 20 || p[1] < 150 || p[1] > MAP_H - 10) continue;
      if (!clearOf(p)) continue;
      if (occupied.some(([ox, oy]) => Math.hypot(ox - p[0], oy - p[1]) < minGap)) continue;
      occupied.push(p);
      items.push([p[1], draw(p[0], p[1], R)]);
      placed++;
    }
  };
  // reserve hand-placed set pieces first
  const set = (x: number, y: number, svg: string, r = 40) => {
    occupied.push([x, y]);
    if (r > 50) occupied.push([x - r / 2, y], [x + r / 2, y]);
    items.push([y, svg]);
  };
  set(305, 548, youAreHere(d, 305, 548), 60);
  set(1500, 790, '', 70);
  set(1450, 860, '', 40);
  set(60, 560, waterTower(d, 60, 560, 1.4));
  set(340, 300, windmill(d, 340, 300, 1.3));
  set(250, 800, car(d, 250, 800, ['#5FC4C4', '#3A9A9A'], 180, 1.8, false, true));
  set(470, 640, car(d, 470, 640, ['#E2343B', '#B3263A'], -80, 1.7));
  set(905, 835, bus(d, 905, 835, 1.4), 70);
  set(905, 560, car(d, 905, 560, ['#FFC83D', '#D9971A'], 12, 1.7, true, true));
  set(1110, 650, car(d, 1110, 650, ['#2F4C8F', '#1C2F5E'], 170, 1.7));
  set(1345, 475, car(d, 1345, 475, ['#E8ECF0', '#B5BBC4'], -20, 1.7, false, true));
  set(130, 830, billboard(d, 130, 830, 'ZOMBS BBQ', 'EAT HERE!', '#FFF4DC', '#B3263A', 1.3, -3), 60);
  set(640, 790, billboard(d, 640, 790, "BIG HANK'S", '2 MI →', '#FFC83D', '#B3263A', 1.25, 4), 60);
  set(1080, 470, billboard(d, 1080, 470, 'BRAINS', 'NEXT EXIT', '#8DC63F', '#FFF4DC', 1.25, -5), 60);
  set(40, 760, shield(40, 760, 'Z', 1.3));
  set(1010, 690, shield(1010, 690, 'Z', 1.3));
  set(1385, 845, silo(d, 1385, 845, 1.6));
  set(1060, 860, silo(d, 1060, 860, 1.3));
  set(760, 600, mesa(d, 760, 600, 1.3), 60);
  set(520, 840, mesa(d, 520, 840, 1.1), 60);
  // ruined skyline
  const towers: [number, number, number, number][] = [[1300, 200, 70, 26], [1335, 205, 96, 30], [1370, 196, 60, 22], [1530, 200, 104, 30], [1565, 214, 80, 26], [1500, 230, 64, 22], [1555, 520, 60, 24], [1300, 520, 54, 22]];
  towers.forEach(([x, y, h, w], k) => set(x, y, ruinTower(d, x, y, h, w, 1, k + 3), 40));
  set(1342, 110, smokePlume(d, 1342, 110, 1.6));
  set(1540, 100, smokePlume(d, 1540, 100, 1.4));
  // graveyard at home turf
  const gy: [number, number, boolean][] = [[60, 650, false], [90, 640, true], [120, 655, false], [70, 690, true], [40, 680, false], [300, 760, false], [330, 775, true]];
  for (const [x, y, c] of gy) set(x, y, tomb(d, x, y, 1.4, c), 24);
  set(100, 700, zHand(100, 700, 1.4), 20);
  set(35, 620, zHand(35, 620, 1.2), 20);
  // zombie hordes shambling
  const horde = (x: number, y: number, n: number, seed: number) => {
    for (let k = 0; k < n; k++) set(x + k * 13 + (k % 2) * 4, y + (k % 2) * 7, zombieWalker(x + k * 13 + (k % 2) * 4, y + (k % 2) * 7, 1.3, seed + k), 10);
  };
  horde(640, 330, 4, 1);
  horde(1180, 540, 3, 9);
  horde(395, 760, 3, 20);
  horde(1395, 640, 3, 30);
  // random scatter per zone
  place(ZONES[0], 30, 101, (x, y, R) => (R() < 0.75 ? wheat(x, y, 1.3) : R() < 0.5 ? skull(x, y, 1.1) : bush(d, x, y, 1.2)), 24);
  place(ZONES[0], 6, 102, (x, y) => rock(d, x, y, 1.3), 30);
  place(ZONES[1], 18, 103, (x, y, R) => (R() < 0.6 ? cactus(d, x, y, 1.3) : R() < 0.5 ? skull(x, y, 1.2) : rock(d, x, y, 1.2)), 30);
  place(ZONES[2], 70, 104, (x, y, R) => (R() < 0.55 ? pine(d, x, y, 1.2 + R() * 0.4, R() < 0.12) : roundTree(d, x, y, 1.2 + R() * 0.3, R() < 0.15 ? 2 : R() < 0.5 ? 0 : 1)), 22, 0.95);
  place(ZONES[3], 14, 105, (x, y, R) => (R() < 0.5 ? bush(d, x, y, 1.2) : R() < 0.5 ? wheat(x, y, 1.2) : zHand(x, y, 1.2)), 26);
  place(ZONES[4], 10, 106, (x, y, R) => (R() < 0.5 ? deadTree(x, y, 1.2) : rock(d, x, y, 1.1)), 30);
  place(ZONES[5], 16, 107, (x, y, R) => (R() < 0.45 ? roundTree(d, x, y, 1.3, 1) : R() < 0.6 ? bush(d, x, y, 1.2) : tomb(d, x, y, 1.2)), 28);
  place(null, 40, 108, (x, y, R) => (R() < 0.4 ? bush(d, x, y, 1.1) : R() < 0.5 ? deadTree(x, y, 1) : R() < 0.5 ? tomb(d, x, y, 1.1, R() < 0.5) : rock(d, x, y, 1)), 34);
  items.sort((a, b) => a[0] - b[0]);
  s += items.map((it) => it[1]).join('');
  // ---- region labels (hand-lettered)
  const label = (x: number, y: number, t: string, r = 0, size = 20) =>
    `<g transform="rotate(${r} ${x} ${y})">` + txt(x, y, t, size, '#5C3A22', { sw: 4.4, stroke: '#FFF4DC', ls: 2, extra: 'opacity="0.9"' }) + '</g>';
  s += label(150, 470, 'HOME TURF', -6, 18);
  s += label(560, 236, 'BRAINLESS PLAINS', -4);
  s += label(880, 775, 'DRY BONES DESERT', 3, 18);
  s += label(1000, 140, 'GROANING WOODS', 0, 20);
  s += label(1120, 600, 'CLUCKLAND', 4, 16);
  s += label(1470, 560, 'SNOOTSVILLE', -3, 17);
  s += compass(d, 1500, 790, 1);
  // title cartouche (ribbon) top-left
  s += at(
    250,
    48,
    P('M-170,-22H170L156,0L170,22H-170L-156,0Z', '#B3263A', 2.6) + P('M-150,-16H150V16H-150Z', '#FFF4DC', 2) + txt(0, 8, 'ROUTE Z · ROAD TRIP OF THE DEAD', 17, '#B3263A', { extra: 'textLength="280" lengthAdjust="spacingAndGlyphs"' }),
  );
  // ---- hand-drawn border + vignette
  const vg = d.radial(MAP_W / 2, MAP_H / 2, 960, [[0.62, '#2B1B17', 0], [1, '#2B1B17', 0.4]]);
  s += P(`M0,0H${MAP_W}V${MAP_H}H0Z`, vg);
  s += S(`M10,10H${MAP_W - 10}V${MAP_H - 10}H10Z`, 5, '#5C3A22') + S(`M18,18H${MAP_W - 18}V${MAP_H - 18}H18Z`, 1.6, '#5C3A22', 'stroke-dasharray="12 6"');
  return { key: 'map_bg', svg: d.build(MAP_W, MAP_H, s), w: MAP_W, h: MAP_H, ox: 0, oy: 0 };
}

// ------------------------------------------------------------------ map building icons (160 x 140, anchor 0.5, 1)
const BW = 160;
const BH = 140;

function building(key: string, body: (d: Doc, t: Iso) => string): ArtAsset {
  const d = new Doc(key);
  const t = new Iso(BW / 2, BH - 36, 33, 16.5);
  const pad = P(ell(BW / 2, BH - 14, 70, 13), OUT, 0, OUT, 'opacity="0.22"');
  return { key, svg: d.build(BW, BH, pad + body(d, t)), w: BW, h: BH, ox: 0.5, oy: 1 };
}

interface House {
  i0: number;
  i1: number;
  j0: number;
  j1: number;
  H: number;
  left: string;
  right: string;
}

function walls(t: Iso, h: House, sw = 2): string {
  const p = t.p.bind(t);
  return (
    P(poly([p(h.i0, h.j1, 0), p(h.i1, h.j1, 0), p(h.i1, h.j1, h.H), p(h.i0, h.j1, h.H)]), h.left, sw) +
    P(poly([p(h.i1, h.j0, 0), p(h.i1, h.j1, 0), p(h.i1, h.j1, h.H), p(h.i1, h.j0, h.H)]), h.right, sw)
  );
}

/** Gable roof with the ridge along i: back slope, +i gable triangle, front (+j) slope. profile = [j-fraction, z-above-H] pairs. */
function roof(t: Iso, h: House, profile: [number, number][], col: string, dark: string, gable: string, e = 0.1, sw = 2): string {
  const p = t.p.bind(t);
  const J = (fr: number) => h.j0 + (h.j1 - h.j0) * fr;
  // extend the eaves
  const prof = profile.map(([fr, z], k) => [k === 0 ? J(fr) - e : k === profile.length - 1 ? J(fr) + e : J(fr), z] as Pt);
  let s = '';
  // gable end (wall colour) on the +i face
  s += P(poly(profile.map(([fr, z]) => p(h.i1, J(fr), h.H + z))), gable, sw);
  // slopes, back to front
  for (let k = 0; k < prof.length - 1; k++) {
    const [ja, za] = prof[k];
    const [jb, zb] = prof[k + 1];
    const q = [p(h.i0 - e, ja, h.H + za), p(h.i1 + e, ja, h.H + za), p(h.i1 + e, jb, h.H + zb), p(h.i0 - e, jb, h.H + zb)];
    const front = zb < za;
    s += P(poly(q), front ? col : dark, sw);
  }
  return s;
}

/** Window or door on the +j face: i range, z range. */
function onLeft(t: Iso, j: number, i0: number, i1: number, z0: number, z1: number, fill: string, sw = 1.6): string {
  return P(poly([t.p(i0, j, z0), t.p(i1, j, z0), t.p(i1, j, z1), t.p(i0, j, z1)]), fill, sw);
}
/** Window or door on the +i face: j range, z range. */
function onRight(t: Iso, i: number, j0: number, j1: number, z0: number, z1: number, fill: string, sw = 1.6): string {
  return P(poly([t.p(i, j0, z0), t.p(i, j1, z0), t.p(i, j1, z1), t.p(i, j0, z1)]), fill, sw);
}

function mapHome(): ArtAsset {
  return building('map_home', (d, t) => {
    const h: House = { i0: -0.8, i1: 0.8, j0: -0.65, j1: 0.65, H: 34, left: '#A8693A', right: '#8A5A30' };
    let s = '';
    // green glow around the joint
    s += P(ell(80, 112, 66, 20), d.radial(80, 112, 66, [[0, '#39E07A', 0.5], [1, '#39E07A', 0]]));
    // smoker chimney (behind roof)
    const ch = t.p(-0.3, -0.3, 0);
    s += blobs(d, [[ch[0] - 5, ch[1] - 82, 5.6], [ch[0] + 3, ch[1] - 87, 6], [ch[0] + 11, ch[1] - 90, 6.4]], '#D8FFE6', '#9FE0B8', 1.4, [-1.4, -1.4]);
    s += P(rrect(ch[0] - 5, ch[1] - 82, 10, 40, 2), '#3A3A44', 2) + P(rrect(ch[0] - 7, ch[1] - 84, 14, 5, 1.6), '#2B1B17', 1.4);
    s += walls(t, h);
    // plank lines
    for (let z = 8; z < h.H; z += 7) s += t.line([h.i0, h.j1, z], [h.i1, h.j1, z], 0.9, '#7A4524') + t.line([h.i1, h.j0, z], [h.i1, h.j1, z], 0.9, '#5C3A22');
    // door + window on the +j face
    s += onLeft(t, h.j1, -0.1, 0.25, 0, 24, '#3A2620') + onLeft(t, h.j1, -0.6, -0.3, 12, 26, '#7FD3FF');
    s += onRight(t, h.i1, -0.35, 0.15, 12, 24, '#FFE14D');
    s += roof(t, h, [[0, 0], [0.5, 22], [1, 0]], '#B3263A', '#8E1B2E', '#8A5A30');
    // scalloped maroon awning along the front
    for (let k = 0; k < 6; k++) {
      const i = -0.75 + k * 0.26;
      const a = t.p(i, h.j1 + 0.02, 22);
      const b = t.p(i + 0.26, h.j1 + 0.02, 22);
      s += P(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}l-4,6Q${f((a[0] + b[0]) / 2 - 2)},${f((a[1] + b[1]) / 2 + 12)} ${f(a[0] - 4)},${f(a[1] + 6)}Z`, k % 2 ? '#FFF4DC' : '#B3263A', 1.4);
    }
    // neon ZOMBS BBQ sign on the roof
    const sp = t.p(0.15, 0.1, 54);
    const blurF = d.blur(2);
    s += S(`M${f(sp[0] - 14)},${f(sp[1] + 14)}v-8M${f(sp[0] + 14)},${f(sp[1] + 14)}v-8`, 2, OUT);
    s += P(rrect(sp[0] - 30, sp[1] - 22, 60, 30, 5), '#2B1B17', 2);
    s += `<g filter="${blurF}">` + txt(sp[0], sp[1] - 9, 'ZOMBS', 11, '#39E07A', { extra: 'stroke="#39E07A" stroke-width="2"' }) + '</g>';
    s += txt(sp[0], sp[1] - 9, 'ZOMBS', 11, '#D8FFE6', { extra: 'textLength="44" lengthAdjust="spacingAndGlyphs"' }) + txt(sp[0], sp[1] + 4, 'BBQ', 11, '#FFC83D', { extra: 'textLength="28" lengthAdjust="spacingAndGlyphs"' });
    // grill out front + tombstone
    const g = t.p(1.0, 0.65, 0);
    s += S(`M${f(g[0] - 6)},${f(g[1])}l3,-10M${f(g[0] + 6)},${f(g[1])}l-3,-10`, 2, OUT) + P(`M${f(g[0] - 9)},${f(g[1] - 10)}h18a9,7 0 0 1 -18,0z`, '#2B2F3A', 1.6);
    s += P(`M${f(g[0] - 4)},${f(g[1] - 12)}q2,-6 4,-2q2,-6 4,0z`, '#FF8A1F', 1);
    const tb = t.p(-1.15, 0.55, 0);
    s += P(`M${f(tb[0] - 6)},${f(tb[1])}V${f(tb[1] - 10)}a6,6 0 0 1 12,0V${f(tb[1])}Z`, '#B5BBC4', 1.6) + txt(tb[0], tb[1] - 5, 'RIP', 4.6, '#6B727C');
    return s;
  });
}

function mapChuck(): ArtAsset {
  return building('map_joint_chuck', (d, t) => {
    const h: House = { i0: -0.75, i1: 0.75, j0: -0.6, j1: 0.6, H: 30, left: '#B8322F', right: '#962624' };
    let s = walls(t, h);
    for (let k = 1; k < 10; k++) {
      const i = h.i0 + k * 0.15;
      s += t.line([i, h.j1, 0], [i, h.j1, h.H], 0.8, '#7A1A1A');
    }
    s += roof(t, h, [[0, 0], [0.18, 22], [0.5, 32], [0.82, 22], [1, 0]], '#5C3A22', '#3E2616', '#962624');
    // big barn door with white X on the gable end
    const dz = [0, 26];
    s += onRight(t, h.i1, -0.32, 0.32, dz[0], dz[1], '#B8322F', 2);
    const c = (j: number, z: number) => t.p(h.i1, j, z);
    const a = c(-0.32, 0);
    const b = c(0.32, 26);
    const cc = c(0.32, 0);
    const dd = c(-0.32, 26);
    const X = `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}M${f(cc[0])},${f(cc[1])}L${f(dd[0])},${f(dd[1])}`;
    s += S(X, 4.6, OUT) + S(X, 2.6, '#FFF4DC');
    s += S(poly([a, cc, b, dd]), 3.4, '#FFF4DC') + S(poly([a, cc, b, dd]), 1, OUT);
    // hayloft window
    s += onRight(t, h.i1, -0.14, 0.14, 40, 50, '#F2CF5B');
    // white trim along the eaves
    s += t.line([h.i0, h.j1, h.H], [h.i1, h.j1, h.H], 2.4, '#FFF4DC');
    // weathervane with a horseshoe
    const wv = t.p(0, 0, h.H + 32);
    s += S(`M${f(wv[0])},${f(wv[1])}v-18M${f(wv[0] - 8)},${f(wv[1] - 10)}h16`, 1.6) + S(`M${f(wv[0] - 4)},${f(wv[1] - 18)}c-1,7 9,7 8,0`, 3.2, OUT) + S(`M${f(wv[0] - 4)},${f(wv[1] - 18)}c-1,7 9,7 8,0`, 1.6, '#B8BEC6');
    // hay bales + wagon wheel
    const hb = t.p(0.25, 0.85, 0);
    s += P(rrect(hb[0] - 12, hb[1] - 12, 24, 12, 3), '#F2CF5B', 1.8) + S(`M${f(hb[0] - 8)},${f(hb[1] - 12)}v12M${f(hb[0] + 6)},${f(hb[1] - 12)}v12`, 1, '#C99A2E');
    s += P(rrect(hb[0] - 6, hb[1] - 22, 22, 10, 3), '#F7DA6E', 1.8);
    const ww = t.p(-0.95, 0.95, 0);
    s += P(ell(ww[0], ww[1] - 12, 11), 'none', 3.6, OUT) + P(ell(ww[0], ww[1] - 12, 11), 'none', 2, '#8A5A30');
    for (let k = 0; k < 4; k++) {
      const an = (k / 4) * Math.PI;
      s += S(`M${f(ww[0] + Math.cos(an) * 10)},${f(ww[1] - 12 + Math.sin(an) * 10)}L${f(ww[0] - Math.cos(an) * 10)},${f(ww[1] - 12 - Math.sin(an) * 10)}`, 1.4, '#8A5A30');
    }
    s += P(ell(ww[0], ww[1] - 12, 2.4), '#6B727C', 1);
    // little cactus
    s += P(rrect(t.p(1, -0.6)[0] + 4, t.p(1, -0.6)[1] - 18, 6, 18, 3), '#5FAE45', 1.6);
    void d;
    return s;
  });
}

function mapHank(): ArtAsset {
  return building('map_joint_hank', (d, t) => {
    const h: House = { i0: -0.9, i1: 0.9, j0: -0.55, j1: 0.55, H: 28, left: '#FFF4DC', right: '#E3D5BA' };
    let s = walls(t, h);
    // red stripe + windows
    s += P(poly([t.p(h.i0, h.j1, 2), t.p(h.i1, h.j1, 2), t.p(h.i1, h.j1, 9), t.p(h.i0, h.j1, 9)]), '#D8343F', 1.4);
    s += P(poly([t.p(h.i1, h.j0, 2), t.p(h.i1, h.j1, 2), t.p(h.i1, h.j1, 9), t.p(h.i1, h.j0, 9)]), '#A8222E', 1.4);
    for (let k = 0; k < 4; k++) s += onLeft(t, h.j1, -0.8 + k * 0.32, -0.6 + k * 0.32, 12, 22, '#7FD3FF', 1.4);
    s += onRight(t, h.i1, -0.15, 0.2, 0, 22, '#C9D2DC', 1.6);
    // flat roof with chrome trim
    s += P(poly(t.quad(h.i0 - 0.05, h.i1 + 0.05, h.j0 - 0.05, h.j1 + 0.05, h.H)), '#C9D2DC', 2);
    s += P(poly([t.p(h.i0 - 0.05, h.j1 + 0.05, h.H), t.p(h.i1 + 0.05, h.j1 + 0.05, h.H), t.p(h.i1 + 0.05, h.j1 + 0.05, h.H - 4), t.p(h.i0 - 0.05, h.j1 + 0.05, h.H - 4)]), '#D8343F', 1.6);
    // red & white striped awning
    for (let k = 0; k < 7; k++) {
      const i = -0.88 + k * 0.25;
      s += P(poly([t.p(i, h.j1, 24), t.p(i + 0.25, h.j1, 24), t.p(i + 0.25, h.j1 + 0.22, 17), t.p(i, h.j1 + 0.22, 17)]), k % 2 ? '#FFFFFF' : '#D8343F', 1.2);
    }
    // giant burger on the roof
    const b = t.p(0, 0, h.H);
    const bx = b[0];
    const by = b[1] - 4;
    s += S(`M${f(bx - 14)},${f(by)}v-8M${f(bx + 14)},${f(by)}v-8`, 2.4, OUT);
    s += P(rrect(bx - 30, by - 14, 60, 9, 4), '#F0A64B', 2);
    s += P(`M${f(bx - 32)},${f(by - 14)}l6,5l6,-5l6,5l6,-5l6,5l6,-5l6,5l6,-5l6,5l6,-5V${f(by - 17)}H${f(bx - 32)}Z`, '#FFC83D', 1.4);
    s += P(rrect(bx - 32, by - 25, 64, 10, 5), '#6B3A22', 2);
    s += P(`M${f(bx - 34)},${f(by - 24)}q6,6 12,0q6,6 12,0q6,6 12,0q6,6 12,0q6,6 12,0q6,6 12,0v-4h-72z`, '#7CC24A', 1.4);
    s += d.shaded(`M${f(bx - 31)},${f(by - 28)}C${f(bx - 31)},${f(by - 58)} ${f(bx + 31)},${f(by - 58)} ${f(bx + 31)},${f(by - 28)}Z`, '#F0A64B', '#C77A2A', 2, [-2, -2]);
    for (const [x, y] of [[-14, -42], [0, -48], [12, -40], [-4, -36], [20, -32]] as Pt[]) s += P(ell(bx + x, by + y, 2, 1.1), '#FFF4DC', 0.6);
    s += hl(bx - 16, by - 44, 6, 2.4, -30, 0.6);
    // tiny sign
    s += P(rrect(bx - 26, by + 8, 52, 0.1, 0), 'none');
    // milkshake cup by the door
    const m = t.p(1.25, 0.25, 0);
    s += P(`M${f(m[0] - 6)},${f(m[1] - 22)}h12l-2,22h-8z`, '#FFFFFF', 1.6) + P(`M${f(m[0] - 6)},${f(m[1] - 22)}q6,-10 12,0z`, '#F7A8C0', 1.4) + P(ell(m[0], m[1] - 30, 2.4), '#E2343B', 1) + S(`M${f(m[0] + 2)},${f(m[1] - 26)}l4,-10`, 1.6, '#D8343F');
    return s;
  });
}

function mapVera(): ArtAsset {
  return building('map_joint_vera', (d, t) => {
    const h: House = { i0: -0.7, i1: 0.7, j0: -0.6, j1: 0.6, H: 36, left: '#A9B4A4', right: '#86917F' };
    let s = '';
    const tower = (i: number, j: number, hh: number) => {
      const [x, y] = t.p(i, j, 0);
      let tw = d.shaded(`M${f(x - 11)},${f(y)}V${f(y - hh)}H${f(x + 11)}V${f(y)}Z`, '#B5BFB0', '#8C9788', 2, [-2, 0]);
      tw += S(`M${f(x - 11)},${f(y - hh * 0.5)}h22M${f(x - 11)},${f(y - hh * 0.25)}h22`, 0.9, '#6C7A68');
      tw += P(rrect(x - 3, y - hh * 0.75, 6, 9, 3), '#2B3A28', 1.2);
      // carrot spire
      tw += P(`M${f(x - 13)},${f(y - hh)}H${f(x + 13)}L${f(x)},${f(y - hh - 34)}Z`, '#FF8A1F', 2) + S(`M${f(x - 7)},${f(y - hh - 8)}h6M${f(x + 2)},${f(y - hh - 16)}h5M${f(x - 3)},${f(y - hh - 24)}h4`, 1.2, '#D9461B');
      tw += P(`M${f(x)},${f(y - hh - 33)}c-4,-8 -2,-12 0,-12c2,0 4,4 0,12z`, '#7CC24A', 1.4) + P(`M${f(x)},${f(y - hh - 33)}c-8,-4 -9,-9 -7,-10c3,0 6,4 7,10z`, '#8FD15A', 1.4) + P(`M${f(x)},${f(y - hh - 33)}c8,-4 9,-9 7,-10c-3,0 -6,4 -7,10z`, '#8FD15A', 1.4);
      return tw;
    };
    s += tower(-0.75, -0.75, 30);
    s += walls(t, h);
    // stone courses
    for (let z = 9; z < h.H; z += 9) s += t.line([h.i0, h.j1, z], [h.i1, h.j1, z], 0.9, '#6C7A68') + t.line([h.i1, h.j0, z], [h.i1, h.j1, z], 0.9, '#5E6B5C');
    // crenellations on top
    s += P(poly(t.quad(h.i0, h.i1, h.j0, h.j1, h.H)), '#7CC24A', 2);
    for (let k = 0; k < 5; k++) {
      const i = h.i0 + 0.06 + k * 0.29;
      s += t.box(i, i + 0.16, h.j1 - 0.12, h.j1, h.H, h.H + 8, '#C9D2C4', '#A9B4A4', '#86917F', 1.4);
    }
    for (let k = 0; k < 4; k++) {
      const j = h.j0 + 0.08 + k * 0.3;
      s += t.box(h.i1 - 0.12, h.i1, j, j + 0.16, h.H, h.H + 8, '#C9D2C4', '#A9B4A4', '#86917F', 1.4);
    }
    // gate with lettuce portcullis
    s += onLeft(t, h.j1, -0.18, 0.18, 0, 22, '#3A2620', 2);
    for (const i of [-0.1, 0, 0.1]) s += t.line([i, h.j1, 0], [i, h.j1, 21], 1.2, '#8FD15A');
    // vines
    const v1 = t.p(-0.55, h.j1, 0);
    s += S(`M${f(v1[0])},${f(v1[1])}c6,-8 -4,-16 4,-26c4,-4 0,-8 4,-10`, 3, OUT) + S(`M${f(v1[0])},${f(v1[1])}c6,-8 -4,-16 4,-26c4,-4 0,-8 4,-10`, 1.6, '#3F7A26');
    for (const [dx, dy] of [[2, -8], [-2, -18], [5, -28]] as Pt[]) s += P(ell(v1[0] + dx, v1[1] + dy, 3.4, 2), '#8FD15A', 1);
    s += tower(0.8, 0.8, 38);
    // veggie crates
    const c = t.p(-1.05, 0.75, 0);
    s += P(rrect(c[0] - 10, c[1] - 10, 20, 10, 1.4), '#C9935A', 1.6) + P(ell(c[0] - 4, c[1] - 12, 3.4), '#E2343B', 1) + P(ell(c[0] + 3, c[1] - 12, 3.4), '#7CC24A', 1);
    // flag with a pea pod
    const fl = t.p(0, 0, h.H + 8);
    s += S(`M${f(fl[0])},${f(fl[1])}v-26`, 1.6) + P(`M${f(fl[0])},${f(fl[1] - 26)}l16,4l-16,5z`, '#7CC24A', 1.4);
    return s;
  });
}

function mapCrunch(): ArtAsset {
  return building('map_joint_crunch', (d, t) => {
    const h: House = { i0: -0.75, i1: 0.75, j0: -0.6, j1: 0.6, H: 28, left: '#F2C230', right: '#D9A21E' };
    let s = walls(t, h);
    for (let z = 6; z < h.H; z += 6) s += t.line([h.i0, h.j1, z], [h.i1, h.j1, z], 0.9, '#B4851A') + t.line([h.i1, h.j0, z], [h.i1, h.j1, z], 0.9, '#9C6B1E');
    s += onLeft(t, h.j1, -0.2, 0.2, 0, 20, '#B4561E', 2) + onLeft(t, h.j1, -0.65, -0.35, 10, 22, '#5A3A1E');
    s += onRight(t, h.i1, -0.25, 0.25, 10, 22, '#5A3A1E');
    s += roof(t, h, [[0, 0], [0.5, 26], [1, 0]], '#D9461B', '#B4561E', '#D9A21E');
    // the original rooster mascot statue on the roof ridge
    const r = t.p(0.1, 0, h.H + 24);
    const x = r[0];
    const y = r[1] + 2;
    s += P(`M${f(x - 18)},${f(y - 8)}c-10,-10 -6,-26 2,-24c-2,6 2,10 6,12z`, '#3A3A44', 1.8) + P(`M${f(x - 20)},${f(y - 10)}c-8,-14 0,-22 6,-18`, 'none') + P(`M${f(x - 22)},${f(y - 12)}c-4,-12 4,-20 8,-14`, '#2F7A3A', 1.6);
    s += d.shaded(`M${f(x - 18)},${f(y)}C${f(x - 22)},${f(y - 22)} ${f(x + 4)},${f(y - 26)} ${f(x + 10)},${f(y - 18)}C${f(x + 14)},${f(y - 10)} ${f(x + 8)},${f(y + 2)} ${f(x - 18)},${f(y)}Z`, '#FFFFFF', '#E1D9CC', 1.8, [-1.4, -1.4]);
    s += P(`M${f(x - 10)},${f(y - 10)}c4,-4 12,-4 14,2c-6,2 -12,2 -14,-2z`, '#FFF4DC', 1.2);
    // head + neck
    s += d.shaded(`M${f(x + 2)},${f(y - 18)}C${f(x)},${f(y - 40)} ${f(x + 20)},${f(y - 44)} ${f(x + 20)},${f(y - 28)}C${f(x + 18)},${f(y - 18)} ${f(x + 10)},${f(y - 16)} ${f(x + 2)},${f(y - 18)}Z`, '#FFFFFF', '#E1D9CC', 1.8, [-1, -1]);
    s += P(`M${f(x + 4)},${f(y - 40)}c-2,-8 4,-10 5,-4c1,-7 8,-7 7,0c4,-4 8,0 4,6z`, '#E2343B', 1.6);
    s += P(`M${f(x + 6)},${f(y - 40)}h14l-2,4h-12z`, '#6E7A3A', 1.4);
    s += P(`M${f(x + 19)},${f(y - 32)}l9,2l-9,4z`, '#FFA51F', 1.4) + P(`M${f(x + 18)},${f(y - 26)}c-2,6 4,6 3,0z`, '#E2343B', 1.2);
    s += P(ell(x + 14, y - 33, 2.2, 2.6), '#FFFFFF', 1) + P(ell(x + 14.6, y - 32.6, 1), OUT);
    s += S(`M${f(x - 4)},${f(y)}v6M${f(x + 2)},${f(y)}v6`, 2.4, '#FFA51F');
    // giant egg + feathers
    const e = t.p(1.15, 0.15, 0);
    s += d.shaded(`M${f(e[0] - 9)},${f(e[1] - 8)}C${f(e[0] - 9)},${f(e[1] - 30)} ${f(e[0] + 9)},${f(e[1] - 30)} ${f(e[0] + 9)},${f(e[1] - 8)}C${f(e[0] + 9)},${f(e[1] + 2)} ${f(e[0] - 9)},${f(e[1] + 2)} ${f(e[0] - 9)},${f(e[1] - 8)}Z`, '#FFF4DC', '#E8D5AE', 1.8, [-1, -1]);
    s += S(`M${f(e[0] - 8)},${f(e[1] - 14)}l4,3l3,-4l3,4l3,-3l3,3`, 1.2);
    const fp = t.p(-1.0, 0.9, 0);
    s += `<g transform="rotate(-20 ${f(fp[0])} ${f(fp[1])})">` + P(`M${f(fp[0] - 8)},${f(fp[1] - 6)}q8,-6 16,0q-8,4 -16,0z`, '#FFFFFF', 1.2) + '</g>';
    s += S(`M${f(fp[0] + 12)},${f(fp[1] + 2)}l3,-1M${f(fp[0] + 18)},${f(fp[1] + 4)}l2,-2`, 1.6, '#C99A2E');
    return s;
  });
}

function mapSnob(): ArtAsset {
  return building('map_joint_snob', (_d, t) => {
    const h: House = { i0: -0.65, i1: 0.65, j0: -0.55, j1: 0.55, H: 40, left: '#DCE6F5', right: '#B9C9E4' };
    let s = '';
    // mini iron tower behind
    const et = t.p(-0.9, -0.9, 0);
    const tw = `M${f(et[0] - 14)},${f(et[1])}Q${f(et[0] - 4)},${f(et[1] - 26)} ${f(et[0] - 1.6)},${f(et[1] - 62)}H${f(et[0] + 1.6)}Q${f(et[0] + 4)},${f(et[1] - 26)} ${f(et[0] + 14)},${f(et[1])}`;
    s += S(tw, 4.4, OUT) + S(tw, 2.4, '#6B727C') + S(`M${f(et[0] - 9)},${f(et[1] - 18)}h18M${f(et[0] - 5)},${f(et[1] - 36)}h10`, 3, OUT) + S(`M${f(et[0] - 9)},${f(et[1] - 18)}h18M${f(et[0] - 5)},${f(et[1] - 36)}h10`, 1.6, '#8A909A');
    s += P(`M${f(et[0] - 8)},${f(et[1])}a8,10 0 0 1 16,0z`, '#A9C86C', 1.4) + S(`M${f(et[0])},${f(et[1] - 62)}v-6`, 1.4);
    s += walls(t, h);
    // blue lower storey + gold trim
    s += P(poly([t.p(h.i0, h.j1, 0), t.p(h.i1, h.j1, 0), t.p(h.i1, h.j1, 18), t.p(h.i0, h.j1, 18)]), '#2F4C8F', 2);
    s += P(poly([t.p(h.i1, h.j0, 0), t.p(h.i1, h.j1, 0), t.p(h.i1, h.j1, 18), t.p(h.i1, h.j0, 18)]), '#243C73', 2);
    s += t.line([h.i0, h.j1, 18], [h.i1, h.j1, 18], 2, '#FFC83D') + t.line([h.i1, h.j0, 18], [h.i1, h.j1, 18], 2, '#E3B23C');
    for (let k = 0; k < 3; k++) s += onLeft(t, h.j1, -0.55 + k * 0.4, -0.35 + k * 0.4, 22, 36, '#7FD3FF', 1.4);
    s += onLeft(t, h.j1, -0.15, 0.15, 0, 15, '#FFE14D', 1.6) + onRight(t, h.i1, -0.3, 0.3, 24, 36, '#7FD3FF', 1.4);
    // striped awning
    for (let k = 0; k < 6; k++) {
      const i = -0.63 + k * 0.21;
      s += P(poly([t.p(i, h.j1, 19), t.p(i + 0.21, h.j1, 19), t.p(i + 0.21, h.j1 + 0.24, 12), t.p(i, h.j1 + 0.24, 12)]), k % 2 ? '#FFF4DC' : '#2F5FB8', 1.2);
    }
    // mansard roof with dormers
    const H2 = h.H;
    const inset = 0.2;
    const p = t.p.bind(t);
    s += P(poly([p(h.i0, h.j1, H2), p(h.i1, h.j1, H2), p(h.i1 - inset, h.j1 - inset, H2 + 22), p(h.i0 + inset, h.j1 - inset, H2 + 22)]), '#4A5A78', 2);
    s += P(poly([p(h.i1, h.j0, H2), p(h.i1, h.j1, H2), p(h.i1 - inset, h.j1 - inset, H2 + 22), p(h.i1 - inset, h.j0 + inset, H2 + 22)]), '#36435C', 2);
    s += P(poly(t.quad(h.i0 + inset, h.i1 - inset, h.j0 + inset, h.j1 - inset, H2 + 22)), '#5C6E90', 2);
    s += t.line([h.i0, h.j1, H2], [h.i1, h.j1, H2], 2.4, '#FFC83D') + t.line([h.i1, h.j0, H2], [h.i1, h.j1, H2], 2.4, '#E3B23C');
    for (const i of [-0.3, 0.2]) {
      const a = p(i, h.j1 - 0.08, H2 + 6);
      s += P(`M${f(a[0] - 6)},${f(a[1])}V${f(a[1] - 9)}a6,6 0 0 1 12,0V${f(a[1])}Z`, '#DCE6F5', 1.4) + P(`M${f(a[0] - 3.4)},${f(a[1])}V${f(a[1] - 8)}a3.4,3.4 0 0 1 6.8,0V${f(a[1])}Z`, '#7FD3FF', 1);
    }
    // gold finial + chimney with a wine bottle
    const fin = p(0, 0, H2 + 22);
    s += S(`M${f(fin[0])},${f(fin[1])}v-12`, 2.4, OUT) + P(ell(fin[0], fin[1] - 14, 3.4), '#FFC83D', 1.4);
    const wb = p(0.35, -0.2, H2 + 22);
    s += P(`M${f(wb[0] - 5)},${f(wb[1])}V${f(wb[1] - 18)}q0,-4 3,-6v-6h4v6q3,2 3,6V${f(wb[1])}Z`, '#2F7A3A', 1.6) + P(rrect(wb[0] - 4, wb[1] - 14, 8, 7, 1), '#FFF4DC', 0.8) + P(rrect(wb[0] - 2, wb[1] - 32, 4, 3, 1), '#B3263A', 0.8);
    // planter boxes + baguette
    const bg = p(1.1, 0.35, 0);
    s += `<g transform="rotate(-30 ${f(bg[0])} ${f(bg[1] - 8)})">` + P(rrect(bg[0] - 4, bg[1] - 26, 8, 30, 4), '#E8A24E', 1.6) + S(`M${f(bg[0] - 2)},${f(bg[1] - 18)}l4,-2M${f(bg[0] - 2)},${f(bg[1] - 10)}l4,-2M${f(bg[0] - 2)},${f(bg[1] - 2)}l4,-2`, 1, '#B4761E') + '</g>';
    return s;
  });
}

export function buildMapArt(): ArtAsset[] {
  const joints: Record<RivalId, () => ArtAsset> = { chuck: mapChuck, hank: mapHank, vera: mapVera, crunch: mapCrunch, snob: mapSnob };
  return [buildMapBg(), ...RIVAL_IDS.map((r) => joints[r]()), mapHome()];
}

