/**
 * Furniture v3: tables, chairs and low dividers (all 1x1 objAsset frames, anchor = tile centre).
 *
 * TABLES are symmetric (no facing). Put the dish at tile centre + FURN_META.plateOffset[key].
 *
 * CHAIRS come as two drawings per family + mirrors:
 *   chair_<f>_sw       faces +j (screen lower-left): backrest on the far side. Draw the sitter AFTER it.
 *   chair_<f>_ne       faces -j (screen upper-right): the full chair, backrest on the near side.
 *   chair_<f>_ne_back  only that near backrest + its uprights, pixel-identical to the same strokes in _ne.
 *                      Draw order: chair_<f>_ne, then the sitter, then chair_<f>_ne_back.
 *   'se' = kit.mirrored(chair_<f>_sw), 'nw' = kit.mirrored(chair_<f>_ne) (+ mirrored _ne_back).
 * A chair faces its table: table on (x, y) → chair_sw on (x, y - 1), chair_ne on (x, y + 1),
 *   chair_se on (x - 1, y), chair_nw on (x + 1, y)   [x = i / gx, y = j / gy].
 * The sitter's root goes at chair tile centre + FURN_META.seatOffset[dir] (seat centre on the floor),
 * raised by FURN_META.seatZ[family].
 *
 * DIVIDERS: a ~64-tall partition in the plane i = 0 running the full tile along j; mirror for the other axis.
 */
import type { ArtAsset } from '../art/types';
import type { Doc } from '../art/svg';
import { capsule, ell, f, poly, rrect } from '../art/svg';
import type { Pt } from '../art/svg';
import { F, INK, Iso, L, LW, PAL, blob, crack, dot, objAsset, rnd, speckle } from './kit';
import {
  BONE, BONE_D, CHROME, CHROME_D, CHROME_HI, DEEP, bone, box, cyl, disc, dk, faces, fly, hFor, lt, mix, onFront, onSide, pp, post,
  prism, rust, scratches, seg, shadow, shadowDisc, streaks, tone, RUST,
} from './p1kit';
import type { Tone } from './p1kit';

// ================================================================ tints
/** The six stock tints (as in the original's tint set), muted toward a warm grey when painted. */
export const TINTS = {
  white: '#F3F3F3',
  cream: '#F6EB76',
  sage: '#7BB550',
  slate: '#2C6985',
  oxblood: '#691122',
  charcoal: '#555555',
} as const;
export type TintName = keyof typeof TINTS;
export const TINT_NAMES = Object.keys(TINTS) as TintName[];
export const CHAIR_FAMILIES = ['plain', 'diner', 'wood', 'barrel', 'bone', 'tire', 'cleaver', 'electric'] as const;
export type ChairFamily = (typeof CHAIR_FAMILIES)[number];

function paint(name: TintName): { tn: Tone; base: string; scuff: string; chip: string } {
  const raw = TINTS[name];
  const base = mix(raw, '#8E8A76', name === 'white' ? 0.18 : name === 'charcoal' ? 0.12 : 0.3);
  const dark = name === 'charcoal' || name === 'oxblood' || name === 'slate';
  return {
    tn: tone(base, dark ? 0.16 : 0.1, dark ? 0.32 : 0.28, 0.06),
    base,
    scuff: dark ? lt(base, 0.35) : dk(base, 0.3),
    chip: '#8E6436',
  };
}

const OFF: [number, number, number, number] = [0, 0, 104, 160];

// ================================================================ tables
const TOP_Z = 30;

function tablePlain(name: TintName): ArtAsset {
  const p = paint(name);
  return objAsset(`table_plain_${name}`, hFor(34), (d, t) => {
    let s = shadow(d, t, -0.46, 0.46, -0.46, 0.46, 0.3);
    const legT = tone(dk(p.base, 0.04), 0.1, 0.3);
    for (const [i, j] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]] as [number, number][]) s += post(d, t, i, j, 0.07, 0, 26, legT, 1);
    s += box(d, t, [-0.38, 0.38, -0.38, 0.38, 21, 26.5], p.tn, { sw: 1, grad: 0.1 });
    s += box(d, t, [-0.44, 0.44, -0.44, 0.44, 26.5, TOP_Z], p.tn, { sw: LW, grad: 0 });
    const top = t.qd(-0.44, 0.44, -0.44, 0.44, TOP_Z);
    const r = rnd(name.length * 7 + 3);
    let tex = F(top, d.linear(...t.p(-0.44, -0.44, TOP_Z), ...t.p(0.44, 0.44, TOP_Z), [[0, '#FFFFFF', 0.1], [1, DEEP, 0.12]]));
    // brushed paint strokes along i, knife scratches, a ring stain, a burn, chips showing wood
    for (let k = 0; k < 9; k++) {
      const j = -0.4 + r() * 0.8;
      const i0 = -0.42 + r() * 0.4;
      tex += L(seg(t, [i0, j, TOP_Z], [i0 + 0.2 + r() * 0.4, j, TOP_Z]), 0.4, k % 2 ? lt(p.base, 0.25) : dk(p.base, 0.15), 'opacity="0.6"');
    }
    tex += scratches(...t.p(-0.3, -0.1, TOP_Z), 50, 26, 10, name.length * 3, p.scuff, 0.55, 5);
    tex += L(ell(...t.p(0.18, -0.12, TOP_Z), 5.4, 3.3), 0.8, '#6A4A22', 'opacity="0.4"');
    tex += F(blob(...t.p(-0.22, 0.2, TOP_Z), 1.6, 1, 4), '#2A2016', 0, 'opacity="0.6"');
    tex += speckle(d, top, OFF, 12, [dk(p.base, 0.2), lt(p.base, 0.3)], 5 + name.length, 0.3, 0.6, 0.5);
    // dried food smear + a ketchup drip running off the near edge
    tex += F(blob(...t.p(-0.05, 0.22, TOP_Z), 7, 2.6, 13 + name.length, 8, 0.6), '#6A4A22', 0, 'opacity="0.28"');
    tex += F(blob(...t.p(0.26, 0.36, TOP_Z), 2.6, 1.3, 21), '#7A2A22', 0, 'opacity="0.7"');
    s += d.clip(top, tex);
    {
      const [x, y] = t.p(0.27, 0.44, TOP_Z - 0.5);
      s += F(`M${f(x - 1)},${f(y - 1)}q0,3 0.8,4.4q0.9,0.6 1.1,-0.6q-0.1,-2.4 0.4,-3.8z`, '#7A2A22', 0.35);
      // gum stuck under the edge
      s += F(blob(...t.p(-0.3, 0.44, 25.6), 1.5, 1, 4), '#B98A8A', 0.4);
    }
    // edge chips
    for (const [i, j] of [[-0.1, 0.44], [0.44, -0.2], [0.3, 0.44]] as [number, number][]) {
      const [x, y] = t.p(i, j, TOP_Z - 1);
      s += F(blob(x, y, 1.5, 1, Math.round(i * 100 + 50)), p.chip, 0.35);
    }
    return s;
  });
}

function tableDiner(): ArtAsset {
  return objAsset('table_diner', hFor(40), (d, t) => {
    let s = shadowDisc(d, t, 0, 0, 0.4, 0.3);
    const base = cyl(d, t, 0, 0, 0.2, 0, 2, tone(CHROME, 0.15, 0.4), 1);
    s += base.svg + L(ell(base.top.cx - 2, base.top.cy - 0.6, base.top.rx * 0.6, base.top.ry * 0.5), 0.6, CHROME_HI, 'opacity="0.8"');
    const ped = cyl(d, t, 0, 0, 0.045, 2, 26, tone(CHROME, 0.2, 0.42), 1);
    s += ped.svg + L(`M${f(ped.top.cx - 1.4)},${f(ped.top.cy + 2)}V${f(base.top.cy - 2)}`, 0.6, CHROME_HI);
    s += box(d, t, [-0.12, 0.12, -0.12, 0.12, 24, 26.4], tone(CHROME_D, 0.2, 0.3), { sw: 0.8, grad: 0 });
    // the top: chrome-banded edge, red speckled formica
    s += box(d, t, [-0.43, 0.43, -0.43, 0.43, 26.4, TOP_Z], { top: '#CC1111', front: '#C3C7C5', side: '#8C9290' }, { sw: LW, grad: 0 });
    const ec = faces(t, [-0.43, 0.43, -0.43, 0.43], [-0.43, 0.43, -0.43, 0.43], 26.4, TOP_Z);
    s += L(seg(t, [-0.43, 0.43, 28.4], [0.43, 0.43, 28.4]) + seg(t, [0.43, 0.43, 28.4], [0.43, -0.43, 28.4]), 0.5, '#5E6462');
    s += d.clip(ec.front, L(seg(t, [-0.43, 0.43, 29.6], [0.43, 0.43, 29.6]), 0.6, CHROME_HI));
    const top = t.qd(-0.43, 0.43, -0.43, 0.43, TOP_Z);
    // saturated diner red with a light fleck, grime as two soft patches rather than noise
    let tex = speckle(d, top, OFF, 40, ['#AA0E0E', '#E24A3A', '#F0D8CC', '#771111'], 12, 0.3, 0.75, 0.8);
    tex += F(blob(...t.p(0.14, -0.1, TOP_Z), 9, 4.4, 17, 8, 0.5), DEEP, 0, 'opacity="0.16"') + F(blob(...t.p(-0.22, 0.24, TOP_Z), 6, 3.2, 18, 8, 0.5), DEEP, 0, 'opacity="0.2"');
    tex += F(top, d.linear(...t.p(-0.43, -0.43, TOP_Z), ...t.p(0.43, 0.43, TOP_Z), [[0, '#FFFFFF', 0.12], [0.5, '#FFFFFF', 0], [1, DEEP, 0.15]]));
    tex += L(seg(t, [-0.35, 0.3, TOP_Z], [0.25, -0.35, TOP_Z]), 2.4, '#FFFFFF', 'opacity="0.1"');
    tex += scratches(...t.p(-0.3, 0, TOP_Z), 48, 24, 8, 3, '#E8D8C0', 0.4, 4);
    tex += L(ell(...t.p(0.22, 0.1, TOP_Z), 5, 3), 0.7, '#3A1410', 'opacity="0.5"');
    s += d.clip(top, tex);
    // napkin dispenser on the far corner + gum stuck to the edge
    s += box(d, t, [-0.36, -0.22, -0.36, -0.28, TOP_Z, 37], tone(CHROME, 0.15, 0.4), { sw: 0.8 });
    s += F(t.qd(-0.34, -0.24, -0.35, -0.29, 37.3), '#ECE6D4', 0.5);
    const g = t.p(0.43, 0.15, 27.5);
    s += F(blob(g[0], g[1], 1.6, 1.1, 9), '#B98A8A', 0.4) + F(blob(...t.p(-0.2, 0.43, 27.2), 1.4, 1, 10), '#8EA08A', 0.4);
    return s;
  });
}

function tableWood(): ArtAsset {
  return objAsset('table_wood', hFor(36), (d, t) => {
    let s = shadow(d, t, -0.46, 0.46, -0.46, 0.46, 0.3);
    const legT = tone(PAL.woodD, 0.12, 0.3);
    for (const [i, j] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34]] as [number, number][]) s += post(d, t, i, j, 0.09, 0, 27, legT, 1);
    // stretchers
    s += box(d, t, [-0.32, 0.32, 0.31, 0.37, 7, 10], legT, { sw: 0.8, grad: 0 });
    s += box(d, t, [0.31, 0.37, -0.32, 0.32, 7, 10], legT, { sw: 0.8, grad: 0 });
    s += post(d, t, 0.34, 0.34, 0.09, 0, 27, legT, 1);
    // planks along i with gaps, slightly uneven
    const r = rnd(17);
    const n = 4;
    for (let k = 0; k < n; k++) {
      const j0 = -0.45 + k * 0.225 + 0.006;
      const j1 = j0 + 0.213;
      const z1 = 31 + (k === 2 ? 0.6 : 0) - (k === 0 ? 0.4 : 0);
      const col = ['#8E6436', '#7F5730', '#996B3B', '#84592F'][k];
      s += box(d, t, [-0.45, 0.45, j0, j1, 26.5, z1], tone(col, 0.1, 0.32), { sw: 1, grad: 0 });
      const top = t.qd(-0.45, 0.45, j0, j1, z1);
      let gr = '';
      for (let g = 0; g < 5; g++) {
        const jj = j0 + 0.03 + r() * (j1 - j0 - 0.06);
        const i0 = -0.45 + r() * 0.5;
        gr += L(`M${pp(t.p(i0, jj, z1))}Q${pp(t.p(i0 + 0.15, jj + 0.02, z1))} ${pp(t.p(i0 + 0.3 + r() * 0.3, jj, z1))}`, 0.45, g % 2 ? '#4E321A' : '#C08C58', 'opacity="0.75"');
      }
      if (k === 1) gr += F(ell(...t.p(0.15, (j0 + j1) / 2, z1), 2.2, 1.3), '#5A3A1E', 0.4) + L(ell(...t.p(0.15, (j0 + j1) / 2, z1), 3.4, 2), 0.4, '#5A3A1E', 'opacity="0.6"');
      for (const i of [-0.38, 0.38]) gr += dot(...t.p(i, (j0 + j1) / 2, z1), 0.6, '#2A2016');
      s += d.clip(top, gr);
    }
    // an axe gouge + tally marks carved by bored staff
    s += F(`M${pp(t.p(-0.25, -0.05, 31))}l7,-1.8l-6.2,3z`, '#3A2412', 0.4) + L(`M${pp(t.p(-0.25, -0.05, 31))}l7,-1.8`, 0.4, '#D0A070');
    for (let k = 0; k < 4; k++) s += L(`M${pp(t.p(0.15 + k * 0.03, 0.25, 31.6))}l1.2,-2.2`, 0.5, '#3A2412');
    s += L(`M${pp(t.p(0.13, 0.27, 31.6))}l6,-3`, 0.5, '#3A2412');
    return s;
  });
}

/** Barrel body (vertical) with staves + hoops. */
function barrel(d: Doc, t: Iso, r: number, z0: number, z1: number, wood = '#7A5230', cj = 0): { svg: string; top: ReturnType<typeof disc> } {
  const c = cyl(d, t, 0, cj, r, z0, z1, tone(wood, 0.12, 0.38));
  let s = c.svg;
  let st = '';
  for (let k = -3; k <= 3; k++) {
    const x = c.top.cx + (k / 3.6) * c.top.rx;
    const sag = Math.sqrt(1 - (k / 3.6) ** 2) * c.top.ry;
    st += L(`M${f(x)},${f(c.top.cy + sag)}L${f(x)},${f(c.top.cy + sag + (z1 - z0))}`, 0.5, '#3A2412', 'opacity="0.6"');
  }
  st += speckle(d, c.body, OFF, 30, ['#4E321A', '#A07448'], 7, 0.3, 0.6, 0.6);
  s += d.clip(c.body, st);
  for (const z of [z0 + (z1 - z0) * 0.2, z0 + (z1 - z0) * 0.78]) {
    const e = disc(t, 0, cj, z, r * 1.01);
    const arc = `M${f(e.cx - e.rx)},${f(e.cy)}A${f(e.rx)},${f(e.ry)} 0 0 0 ${f(e.cx + e.rx)},${f(e.cy)}`;
    s += L(arc, 2.8, INK) + L(arc, 1.8, '#4A4640') + L(arc, 0.5, '#8E8A80', 'transform="translate(0 -0.8)"');
    s += dot(e.cx - e.rx * 0.5, e.cy + e.ry * 0.86, 0.5, '#2A2622') + dot(e.cx + e.rx * 0.4, e.cy + e.ry * 0.9, 0.5, '#2A2622');
  }
  s += F(c.body, 'none', LW);
  return { svg: s, top: c.top };
}

function tableBarrel(): ArtAsset {
  return objAsset('table_barrel', hFor(36), (d, t) => {
    let s = shadowDisc(d, t, 0, 0, 0.42, 0.3);
    const b = barrel(d, t, 0.27, 0, 26.5);
    s += b.svg;
    // round plank top overhanging the barrel
    const tp = cyl(d, t, 0, 0, 0.42, 26.5, TOP_Z, tone('#8E6436', 0.12, 0.35), LW);
    s += tp.svg;
    let gr = '';
    for (let k = -3; k <= 3; k++) gr += L(seg(t, [-0.5, k * 0.12 + 0.06, TOP_Z], [0.5, k * 0.12 + 0.06, TOP_Z]), 0.6, '#4E321A', 'opacity="0.8"');
    const r = rnd(5);
    for (let k = 0; k < 10; k++) {
      const j = -0.4 + r() * 0.8;
      const i0 = -0.4 + r() * 0.4;
      gr += L(seg(t, [i0, j, TOP_Z], [i0 + 0.25, j, TOP_Z]), 0.4, k % 2 ? '#C08C58' : '#5A3A1E', 'opacity="0.7"');
    }
    gr += L(ell(...t.p(-0.15, 0.12, TOP_Z), 5, 3), 0.7, '#4A2E14', 'opacity="0.5"') + F(blob(...t.p(0.18, -0.18, TOP_Z), 4, 2, 3), '#5A2A1A', 0, 'opacity="0.35"');
    // a bullet hole
    gr += F(ell(...t.p(0.25, 0.12, TOP_Z), 1.2, 0.8), '#1A120A') + L(ell(...t.p(0.25, 0.12, TOP_Z), 2, 1.3), 0.4, '#C08C58', 'opacity="0.7"');
    s += d.clip(tp.top.d, gr);
    s += L(ell(tp.top.cx, tp.top.cy + 0.3, tp.top.rx - 1, tp.top.ry - 0.7), 0.5, '#C08C58', 'opacity="0.5"');
    return s;
  });
}

function tableCoffin(): ArtAsset {
  return objAsset('table_coffin', hFor(36), (d, t) => {
    let s = shadow(d, t, -0.48, 0.48, -0.36, 0.36, 0.3);
    const wood = tone('#7E6446', 0.12, 0.32);
    // two trestles (sawhorses) under the coffin
    const tre = (c: number) => {
      let o = '';
      for (const j of [-0.3, 0.3]) {
        const top = t.p(c, j, 18);
        for (const di of [-0.09, 0.09]) {
          const ft = t.p(c + di, j + (j > 0 ? 0.04 : -0.04), 0);
          o += L(`M${pp(top)}L${pp(ft)}`, 2.6, INK) + L(`M${pp(top)}L${pp(ft)}`, 1.6, '#8E7452');
        }
      }
      o += box(d, t, [c - 0.04, c + 0.04, -0.34, 0.34, 16, 20], wood, { sw: 0.9, grad: 0 });
      return o;
    };
    s += tre(-0.27) + tre(0.27);
    // the coffin: a hexagonal prism with a raised lid panel
    const C: [number, number][] = [
      [-0.47, -0.13],
      [-0.2, -0.29],
      [0.47, -0.17],
      [0.47, 0.17],
      [-0.2, 0.29],
      [-0.47, 0.13],
    ];
    const coffin = tone('#4E3020', 0.12, 0.35);
    const pr = prism(d, t, C, 20, 29, coffin);
    s += pr.svg;
    // brass handles along the visible long side + the foot end
    for (const i of [-0.08, 0.22]) {
      const jj = 0.29 - ((i + 0.2) / 0.67) * 0.12;
      const [x, y] = t.p(i, jj + 0.01, 24.5);
      s += F(rrect(x - 3.5, y - 1, 7, 2.2, 1), '#B08A3A', 0.6, `transform="rotate(32 ${f(x)} ${f(y)})"`);
    }
    const ft = t.p(0.47, 0, 24.5);
    s += F(rrect(ft[0] - 3, ft[1] - 1, 6, 2, 1), '#8A6A2A', 0.6, `transform="rotate(-32 ${f(ft[0])} ${f(ft[1])})"`);
    // lid: thin raised panel + seam
    const inset: [number, number][] = C.map(([i, j]) => [i * 0.94, j * 0.84]);
    const lid = prism(d, t, inset, 29, 31, tone('#5E3A26', 0.14, 0.32), 0.8);
    s += lid.svg;
    let lt2 = '';
    const r = rnd(8);
    for (let k = 0; k < 6; k++) {
      const j = -0.2 + k * 0.08;
      const i0 = -0.42 + r() * 0.2;
      lt2 += L(seg(t, [i0, j, 31], [i0 + 0.4 + r() * 0.3, j, 31]), 0.45, k % 2 ? '#8A5E3E' : '#2E1A0E', 'opacity="0.7"');
    }
    // a small cross at the head end, scratched initials, dust
    lt2 += L(seg(t, [-0.38, 0, 31], [-0.24, 0, 31]) + seg(t, [-0.33, -0.05, 31], [-0.33, 0.05, 31]), 1.4, '#B08A3A');
    lt2 += F(blob(...t.p(0.2, 0.05, 31), 10, 3, 9), '#A89C74', 0, 'opacity="0.2"');
    s += d.clip(lid.top, lt2);
    // a grey-green finger poking out of the lid seam on the near side
    const fp = t.p(0.05, 0.255, 29.6);
    const knuckle: Pt = [fp[0] - 3.4, fp[1] + 4.6];
    const tip: Pt = [fp[0] - 7.4, fp[1] + 5.6];
    s += F(capsule(fp, knuckle, 3.2, 2.9), '#88BB44', 0.7) + F(capsule(knuckle, tip, 2.9, 2.5), '#88BB44', 0.7) + F(ell(tip[0] + 0.9, tip[1] - 0.6, 1.2, 0.8), '#C9C4A0', 0.4) + L(`M${f(knuckle[0] - 0.4)},${f(knuckle[1] - 1.2)}l0.6,1.2`, 0.45, '#427E40') + L(`M${f(fp[0] - 0.4)},${f(fp[1] + 1.8)}L${f(knuckle[0])},${f(knuckle[1] + 0.8)}`, 0.5, '#427E40', 'opacity="0.7"');
    s += fly(fp[0] + 6, fp[1] - 7, 0.8);
    return s;
  });
}

// ================================================================ chairs
/** Seat footprint for a chair facing sw (+j); ne flips j. */
const SI = 0.22;
const SJ0 = -0.11;
const SJ1 = 0.33;
const LEG_W = 0.045;
const LI = SI - 0.025;
const LJB = SJ0 + 0.025; // back-leg j
const LJF = SJ1 - 0.025; // front-leg j
const BACK_Z = 46;
/** Seat centre j for a chair facing sw. */
const SEAT_CJ = (SJ0 + SJ1) / 2;

interface ChairStyle {
  seatZ: number;
  /** Floor legs at (i, j) — the legs that do not carry the backrest. */
  leg: (d: Doc, t: Iso, i: number, j: number) => string;
  /** The seat over footprint [i0,i1,j0,j1]. */
  seat: (d: Doc, t: Iso, j0: number, j1: number, o: number) => string;
  /** Backrest + its two uprights (full height, from the floor), in the plane j = jb (o = +1 sw, -1 ne). */
  back: (d: Doc, t: Iso, jb: number, o: number) => string;
  shadow?: (d: Doc, t: Iso) => string;
}

function chairSet(fam: string, st: ChairStyle, h = hFor(52, 0.4)): ArtAsset[] {
  const sw = objAsset(`chair_${fam}_sw`, h, (d, t) => {
    let s = st.shadow ? st.shadow(d, t) : shadow(d, t, -0.27, 0.27, -0.2, 0.34, 0.28);
    s += st.back(d, t, LJB, 1);
    s += st.leg(d, t, -LI, LJF) + st.leg(d, t, LI, LJF);
    s += st.seat(d, t, SJ0, SJ1, 1);
    return s;
  });
  const ne = objAsset(`chair_${fam}_ne`, h, (d, t) => {
    let s = st.shadow ? st.shadow(d, t) : shadow(d, t, -0.27, 0.27, -0.34, 0.2, 0.28);
    s += st.leg(d, t, -LI, -LJF) + st.leg(d, t, LI, -LJF);
    s += st.seat(d, t, -SJ1, -SJ0, -1);
    s += st.back(d, t, -LJB, -1);
    return s;
  });
  const back = objAsset(`chair_${fam}_ne_back`, h, (d, t) => st.back(d, t, -LJB, -1));
  return [sw, ne, back];
}

/** Two square uprights from the floor at (±LI, jb) up to z. */
function uprights(d: Doc, t: Iso, jb: number, z: number, tn: Tone, w = LEG_W): string {
  return post(d, t, -LI, jb, w, 0, z, tn, 0.9) + post(d, t, LI, jb, w, 0, z, tn, 0.9);
}

/** A thin rail in the plane j = jb between the uprights. */
function rail(d: Doc, t: Iso, jb: number, z0: number, z1: number, tn: Tone, th = 0.035, ext = SI): string {
  return box(d, t, [-ext, ext, jb - th / 2, jb + th / 2, z0, z1], tn, { sw: 0.9, inner: 0.45, grad: 0 });
}

function plainChair(name: TintName): ChairStyle {
  const p = paint(name);
  const legT = tone(dk(p.base, 0.03), 0.1, 0.3);
  return {
    seatZ: 18,
    leg: (d, t, i, j) => post(d, t, i, j, LEG_W, 0, 15, legT),
    seat: (d, t, j0, j1, o) => {
      let s = box(d, t, [-SI, SI, j0, j1, 15, 18], p.tn, { sw: 1.1, grad: 0 });
      const top = t.qd(-SI, SI, j0, j1, 18);
      let tex = F(top, d.linear(...t.p(-SI, j0, 18), ...t.p(SI, j1, 18), [[0, '#FFFFFF', 0.1], [1, DEEP, 0.12]]));
      tex += scratches(...t.p(-0.15, (j0 + j1) / 2 - 0.1, 18), 22, 10, 5, name.length + o, p.scuff, 0.5, 3);
      tex += F(blob(...t.p(0.05, (j0 + j1) / 2, 18), 4, 2, 7 + o), PAL.grimeD, 0, 'opacity="0.15"');
      s += d.clip(top, tex);
      const [x, y] = t.p(SI, j1 - 0.1, 16.5);
      s += F(blob(x, y, 1.2, 0.9, 3), p.chip, 0.3);
      return s;
    },
    back: (d, t, jb, o) => {
      let s = uprights(d, t, jb, BACK_Z + 1, legT);
      s += rail(d, t, jb, 27, 30, p.tn) + rail(d, t, jb, 38, BACK_Z, p.tn, 0.04, SI + 0.01);
      // scuffed paint on the top rail
      const [x, y] = t.p(-0.08, jb + 0.02, 43);
      s += F(blob(x, y, 2, 1, 9 + o), p.scuff, 0, 'opacity="0.35"');
      return s;
    },
  };
}

const VINYL = '#DD3322'; // diner-chair red (the original's #DD3322 / #771111)
function dinerChair(): ChairStyle {
  const tube = (a: Pt, b: Pt) => L(`M${pp(a)}L${pp(b)}`, 2.6, INK) + L(`M${pp(a)}L${pp(b)}`, 1.6, CHROME) + L(`M${f(a[0] - 0.4)},${f(a[1])}L${f(b[0] - 0.4)},${f(b[1])}`, 0.45, CHROME_HI);
  return {
    seatZ: 20,
    leg: (_d, t, i, j) => tube(t.p(i, j, 15), t.p(i * 1.08, j + (j > 0 ? 0.02 : -0.02), 0)) + F(ell(...t.p(i * 1.08, j + (j > 0 ? 0.02 : -0.02), 0), 1.4, 0.8), '#2A2622'),
    seat: (d, t, j0, j1, o) => {
      let s = box(d, t, [-SI + 0.01, SI - 0.01, j0 + 0.01, j1 - 0.01, 14, 16], tone(CHROME_D, 0.2, 0.3), { sw: 0.8, grad: 0 });
      s += box(d, t, [-SI, SI, j0, j1, 16, 20], tone(VINYL, 0.12, 0.35), { sw: 1.1, grad: 0.12 });
      const top = t.qd(-SI, SI, j0, j1, 20);
      // puffy cushion highlight + piping + a duct-taped tear
      let tex = F(top, d.radial(...t.p(-0.06, (j0 + j1) / 2 - 0.05, 20), 16, [[0, '#FFFFFF', 0.22], [1, '#FFFFFF', 0]]));
      tex += L(t.qd(-SI + 0.03, SI - 0.03, j0 + 0.03, j1 - 0.03, 20), 0.5, '#771111', 'opacity="0.7"');
      if (o > 0) {
        const [x, y] = t.p(0.06, j1 - 0.14, 20);
        tex += F(`M${f(x - 5)},${f(y - 1)}l9,2.6l-0.8,2.4l-9,-2.6z`, '#9A9C96', 0.4) + L(`M${f(x - 4)},${f(y + 0.4)}l7.6,2.2`, 0.3, '#6A6C66');
      } else {
        const [x, y] = t.p(-0.05, (j0 + j1) / 2, 20);
        tex += L(`M${f(x - 3)},${f(y)}l2,-1l1.5,1.2l2,-1`, 0.6, '#3A0E0A');
      }
      s += d.clip(top, tex);
      s += L(seg(t, [-SI, j1, 19.3], [SI, j1, 19.3]), 0.5, '#FFFFFF', 'opacity="0.45"');
      return s;
    },
    back: (d, t, jb, o) => {
      let s = '';
      for (const i of [-LI, LI]) s += tube(t.p(i, jb, 46), t.p(i * 1.08, jb + (jb > 0 ? 0.03 : -0.03), 0)) + F(ell(...t.p(i * 1.08, jb + (jb > 0 ? 0.03 : -0.03), 0), 1.4, 0.8), '#2A2622');
      // padded backrest panel on the uprights
      s += box(d, t, [-SI - 0.01, SI + 0.01, jb - 0.03, jb + 0.03, 29, 46], tone(VINYL, 0.12, 0.35), { sw: 1.1, grad: 0.1 });
      const fc = faces(t, [-SI - 0.01, SI + 0.01, jb - 0.03, jb + 0.03], [-SI - 0.01, SI + 0.01, jb - 0.03, jb + 0.03], 29, 46);
      let tex = '';
      if (o > 0) {
        // the cushioned face: tufting buttons + a soft highlight
        tex += onFront(t, -SI - 0.01, jb + 0.03, 46, F(rrect(2, 2, 18.5, 13, 3), '#FFFFFF', 0, 'opacity="0.12"') + L('M3,8.5H19.5', 0.5, '#5A1A16', 'opacity="0.6"') + dot(11, 5, 0.6, '#4A120E') + dot(11, 12, 0.6, '#4A120E'));
      } else {
        // the back of the panel: a chrome plate with rivets and a cigarette burn
        tex += onFront(t, -SI - 0.01, jb + 0.03, 46, F(rrect(3, 3, 15.5, 11, 1.6), '#A9ACA6', 0.5) + dot(4.4, 4.4, 0.5, '#5E6462') + dot(16.6, 4.4, 0.5, '#5E6462') + dot(4.4, 12.6, 0.5, '#5E6462') + dot(16.6, 12.6, 0.5, '#5E6462') + F(blob(12, 9, 1.4, 1, 3), '#3A2A1A', 0, 'opacity="0.7"'));
      }
      s += d.clip(fc.front, tex);
      s += L(seg(t, [-SI - 0.01, jb + 0.03, 45.4], [SI + 0.01, jb + 0.03, 45.4]), 0.5, '#FFFFFF', 'opacity="0.45"');
      return s;
    },
  };
}

function woodChair(): ChairStyle {
  const w = tone('#86603A', 0.12, 0.32);
  const wD = tone('#6E4A2A', 0.1, 0.3);
  return {
    seatZ: 18,
    leg: (d, t, i, j) => post(d, t, i, j, 0.05, 0, 15, wD),
    seat: (d, t, j0, j1, o) => {
      // front stretcher between the front legs
      const jf = o > 0 ? LJF : -LJF;
      let s = box(d, t, [-LI, LI, jf - 0.015, jf + 0.015, 5, 7], wD, { sw: 0.7, grad: 0, top: false });
      s += box(d, t, [-SI, SI, j0, j1, 14, 18], tone('#7A5634', 0.12, 0.32), { sw: 1.1, grad: 0 });
      // woven rush seat
      const top = t.qd(-SI + 0.02, SI - 0.02, j0 + 0.02, j1 - 0.02, 18);
      let tex = F(top, '#A88E5A');
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        tex += L(seg(t, [-SI + 0.02 + u * (2 * SI - 0.04), j0 + 0.02, 18], [0, (j0 + j1) / 2, 18]), 0.55, '#6E5A30', 'opacity="0.85"');
        tex += L(seg(t, [-SI + 0.02 + u * (2 * SI - 0.04), j1 - 0.02, 18], [0, (j0 + j1) / 2, 18]), 0.55, '#6E5A30', 'opacity="0.85"');
      }
      tex += L(seg(t, [-SI, j0, 18], [SI, j1, 18]) + seg(t, [SI, j0, 18], [-SI, j1, 18]), 0.7, '#4E3E1E');
      tex += F(blob(...t.p(0.05, (j0 + j1) / 2 + 0.05, 18), 4, 2, 5 + o), '#3A2A12', 0, 'opacity="0.25"');
      s += d.clip(top, tex) + L(top, 0.6, INK);
      return s;
    },
    back: (d, t, jb, o) => {
      let s = uprights(d, t, jb, 48, w, 0.05);
      // finials
      for (const i of [-LI, LI]) {
        const [x, y] = t.p(i, jb, 48);
        s += F(ell(x, y - 1, 1.9, 1.7), '#9A7046', 0.7) + dot(x - 0.5, y - 1.5, 0.5, '#C9A070');
      }
      // three ladder slats (slightly bowed)
      for (const z of [27, 34, 41]) s += rail(d, t, jb, z, z + 3.6, w, 0.03, LI);
      if (o > 0) s += L(seg(t, [-0.1, jb + 0.016, 36], [0.05, jb + 0.016, 36.4]), 0.4, '#3A2412', 'opacity="0.7"');
      return s;
    },
  };
}

function barrelChair(): ChairStyle {
  const R = 0.22;
  const wood = '#7A5230';
  const band = (d: Doc, t: Iso, o: number, z0: number, z1: number) => {
    const c = o > 0 ? -Math.PI / 2 : Math.PI / 2;
    const span = o > 0 ? 1.12 : 0.92;
    const cj = o * SEAT_CJ;
    const n = 14;
    const pts: Pt[] = [];
    for (let k = 0; k <= n; k++) {
      const a = c - span + (2 * span * k) / n;
      pts.push(t.p(Math.cos(a) * R, cj + Math.sin(a) * R, z1));
    }
    const top = pts.slice();
    for (let k = n; k >= 0; k--) {
      const a = c - span + (2 * span * k) / n;
      pts.push(t.p(Math.cos(a) * R, cj + Math.sin(a) * R, z0));
    }
    const shape = poly(pts);
    let s = F(shape, o > 0 ? '#5E3E22' : '#82583A', 0);
    let st = '';
    for (let k = 1; k < 6; k++) {
      const a = c - span + (2 * span * k) / 6;
      st += L(`M${pp(t.p(Math.cos(a) * R, cj + Math.sin(a) * R, z0))}L${pp(t.p(Math.cos(a) * R, cj + Math.sin(a) * R, z1))}`, 0.5, '#2E1C0E', 'opacity="0.7"');
    }
    if (o < 0) {
      // the hoop continues round the outside
      const hp: Pt[] = [];
      for (let k = 0; k <= n; k++) {
        const a = c - span + (2 * span * k) / n;
        hp.push(t.p(Math.cos(a) * R * 1.01, cj + Math.sin(a) * R * 1.01, z1 - 5));
      }
      st += L('M' + hp.map(pp).join('L'), 2.4, INK) + L('M' + hp.map(pp).join('L'), 1.5, '#4A4640');
      st += F(shape, d.linear(t.p(-R, 0, 0)[0], 0, t.p(R, 0, 0)[0] + 10, 0, [[0, '#FFFFFF', 0.08], [1, DEEP, 0.3]]));
    } else {
      st += F(shape, d.linear(0, top[n][1] - 20, 0, top[n][1] + 20, [[0, DEEP, 0.05], [1, DEEP, 0.35]]));
    }
    s += d.clip(shape, st);
    s += F(shape, 'none', 1.1);
    // rim
    s += L('M' + top.map(pp).join('L'), 1.4, '#9A7046') + L('M' + top.map((q) => `${f(q[0])},${f(q[1] - 0.6)}`).join('L'), 0.6, INK);
    return s;
  };
  return {
    seatZ: 18,
    shadow: (d, t) => shadowDisc(d, t, 0, 0, 0.3, 0.28),
    leg: () => '',
    seat: (d, t, _j0, _j1, o) => {
      const b = barrel(d, t, R, 0, 18, wood, o * SEAT_CJ);
      let s = b.svg;
      // seat lid planks
      let tp = F(b.top.d, '#9A7046');
      for (let k = -2; k <= 2; k++) tp += L(seg(t, [-0.3, o * SEAT_CJ + k * 0.09, 18], [0.3, o * SEAT_CJ + k * 0.09, 18]), 0.5, '#4E321A');
      tp += F(blob(b.top.cx + 2, b.top.cy, 5, 2, 4 + o), '#3A2412', 0, 'opacity="0.25"');
      s += d.clip(b.top.d, tp) + F(b.top.d, 'none', 1.1);
      return s;
    },
    back: (d, t, _jb, o) => band(d, t, o, 17, 38),
  };
}

function boneChair(): ChairStyle {
  return {
    seatZ: 18,
    leg: (_d, t, i, j) => bone(t.p(i, j, 15), t.p(i * 1.06, j * 1.04, 1.2), 2.6),
    seat: (d, t, j0, j1, o) => {
      // bone frame + a stitched, stained hide seat
      let s = '';
      const fr = (a: [number, number, number], b: [number, number, number]) => bone(t.p(...a), t.p(...b), 2.2);
      s += fr([-SI, j0, 15.5], [-SI, j1, 15.5]);
      const pts4: Pt[] = [t.p(-SI, j0, 16.8), t.p(SI, j0, 16.8), t.p(SI, j1, 16.8), t.p(-SI, j1, 16.8)];
      const sag: Pt = t.p(0, (j0 + j1) / 2, 15.8);
      const hideD = `M${pp(pts4[0])}Q${pp(t.p(0, j0, 17.6))} ${pp(pts4[1])}Q${pp(t.p(SI, (j0 + j1) / 2, 17.4))} ${pp(pts4[2])}Q${pp(t.p(0, j1, 15.8))} ${pp(pts4[3])}Q${pp(t.p(-SI, (j0 + j1) / 2, 17.4))} ${pp(pts4[0])}Z`;
      s += F(hideD, '#8C7452', 1);
      let tex = F(hideD, d.radial(sag[0], sag[1], 18, [[0, DEEP, 0.3], [1, DEEP, 0]]));
      tex += F(blob(sag[0] + 3, sag[1] - 1, 4, 2, 5 + o), '#5A2A1A', 0, 'opacity="0.4"');
      tex += speckle(d, hideD, OFF, 20, ['#5E4A30', '#B09A70'], 8 + o, 0.3, 0.6, 0.7);
      s += d.clip(hideD, tex);
      // stitches along the near edges
      for (let k = 0; k < 7; k++) {
        const u = -SI + 0.03 + (k * (2 * SI - 0.06)) / 6;
        const [x, y] = t.p(u, j1 - 0.02, 16.4);
        s += L(`M${f(x - 0.8)},${f(y - 0.8)}l1.6,1.6`, 0.45, '#2A1E10');
      }
      s += fr([SI, j0, 15.5], [SI, j1, 15.5]) + fr([-SI, j1, 15.5], [SI, j1, 15.5]);
      return s;
    },
    back: (_d, t, jb, o) => {
      let s = '';
      // two long bones up from the floor
      for (const i of [-LI, LI]) s += bone(t.p(i * 1.06, jb, 1), t.p(i * 1.1, jb, 47), 2.8);
      // ribs curving between them
      for (const z of [26, 32, 38]) {
        const a = t.p(-LI, jb, z);
        const b = t.p(LI, jb, z);
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (o > 0 ? 2.6 : -1.4)];
        const rib = `M${pp(a)}Q${pp(mid)} ${pp(b)}`;
        s += L(rib, 2.6, INK) + L(rib, 1.7, z === 32 ? BONE_D : BONE) + L(rib, 0.4, '#FFFFFF', 'opacity="0.4" transform="translate(-0.3 -0.4)"');
      }
      // the skull crowning the back
      const [x, y] = t.p(0, jb, 47);
      const sk = `M${f(x - 5)},${f(y - 2)}C${f(x - 5.4)},${f(y - 10)} ${f(x + 5.4)},${f(y - 10)} ${f(x + 5)},${f(y - 2)}C${f(x + 5)},${f(y + 1)} ${f(x + 3)},${f(y + 1.5)} ${f(x + 2.6)},${f(y + 3.6)}L${f(x - 2.6)},${f(y + 3.6)}C${f(x - 3)},${f(y + 1.5)} ${f(x - 5)},${f(y + 1)} ${f(x - 5)},${f(y - 2)}Z`;
      s += F(sk, BONE, 0.9);
      s += F(`M${f(x + 1)},${f(y - 8.4)}C${f(x + 4.6)},${f(y - 7)} ${f(x + 5.2)},${f(y - 3)} ${f(x + 5)},${f(y - 1)}C${f(x + 4)},${f(y - 3)} ${f(x + 3)},${f(y - 6)} ${f(x + 1)},${f(y - 8.4)}Z`, BONE_D, 0, 'opacity="0.8"');
      if (o > 0) {
        s += F(ell(x - 2, y - 2, 1.6, 1.8), '#1E1810') + F(ell(x + 2, y - 2, 1.6, 1.8), '#1E1810') + F(`M${f(x)},${f(y + 0.2)}l-0.7,1.4h1.4z`, '#1E1810');
        for (let k = -2; k <= 2; k++) s += L(`M${f(x + k * 0.9)},${f(y + 2.2)}v1.4`, 0.4, INK);
        s += dot(x - 2.3, y - 2.4, 0.45, '#DECC54');
      } else {
        s += crack(x - 1, y - 7.5, 1.4, 6, 5, 0.45, '#5A4E30', 1);
      }
      return s;
    },
  };
}

// ================================================================ dividers
const DV_H = 64;
function divider(key: string, body: (d: Doc, t: Iso) => string): ArtAsset {
  return objAsset(key, hFor(DV_H + 6, 0.56), (d, t) => shadow(d, t, -0.1, 0.12, -0.5, 0.5, 0.28) + body(d, t));
}

function dividerPlain(): ArtAsset {
  return divider('divider_plain', (d, t) => {
    const paintC = '#9AA07A';
    const postT = tone('#5E6448', 0.12, 0.3);
    let s = box(d, t, [-0.04, 0.04, -0.46, 0.46, 0, 60], tone(paintC, 0.12, 0.26));
    const fc = faces(t, [-0.04, 0.04, -0.46, 0.46], [-0.04, 0.04, -0.46, 0.46], 0, 60);
    // framed panel moulding, peeling paint, a stapled flyer, a gum wad
    const W = 0.92 * 48;
    let side = F(rrect(3, 5, W - 6, 22, 0.8), 'none', 0.7, 'stroke-opacity="0.6"') + F(rrect(3, 31, W - 6, 24, 0.8), 'none', 0.7, 'stroke-opacity="0.6"');
    side += L(`M4,6H${f(W - 4)}M4,32H${f(W - 4)}`, 0.5, '#FFFFFF', 'opacity="0.35"');
    side += F(blob(12, 44, 5, 3, 6), '#8E6436', 0.4) + F(blob(30, 20, 3, 2, 7), '#8E6436', 0.4);
    side += `<g transform="rotate(4 26 40)">` + F(rrect(20, 33, 11, 14, 0.3), '#D8D2BC', 0.5) + F(ell(25.5, 38, 3, 3.2), '#7A2A22') + L('M22,43h7M22,45h5', 0.6, '#3A3630') + L('M21,34h2M28,34h2', 0.7, CHROME_D) + '</g>';
    side += F(blob(36, 12, 1.4, 1.1, 8), '#C99AA0', 0.4);
    side += F(rrect(0, 50, W, 10, 0), d.linear(0, 60, 0, 48, [[0, PAL.grimeD, 0.6], [1, PAL.grimeD, 0]]));
    s += d.clip(fc.side, onSide(t, 0.04, 0.46, 60, side));
    // end posts with caps
    for (const j of [-0.46, 0.46]) {
      s += box(d, t, [-0.06, 0.06, j - 0.05, j + 0.05, 0, 64], postT);
      s += box(d, t, [-0.075, 0.075, j - 0.065, j + 0.065, 64, 66.5], tone('#4E5438', 0.15, 0.3), { sw: 0.9, grad: 0 });
    }
    s += box(d, t, [-0.05, 0.05, -0.42, 0.42, 60, 62], postT, { sw: 0.9, grad: 0 });
    return s;
  });
}

function dividerBrick(): ArtAsset {
  return divider('divider_brick', (d, t) => {
    let s = box(d, t, [-0.06, 0.06, -0.5, 0.5, 0, 60], { top: PAL.mortar, front: PAL.brick, side: '#80402A' });
    const fc = faces(t, [-0.06, 0.06, -0.5, 0.5], [-0.06, 0.06, -0.5, 0.5], 0, 60);
    const r = rnd(4);
    const W = 48;
    let b = F(rrect(0, 0, W, 60, 0), '#8E8270');
    const rows = 11;
    for (let row = 0; row < rows; row++) {
      const y0 = row * (60 / rows) + 0.4;
      const hgt = 60 / rows - 0.8;
      const off = row % 2 ? -4 : 0;
      for (let x = off; x < W; x += 8) {
        const x0 = Math.max(0, x + 0.4);
        const x1 = Math.min(W, x + 7.6);
        if (row === 2 && x === 24) continue; // a missing brick
        const col = [PAL.brick, '#8C4226', '#A5552F', PAL.brickD, '#94492B'][Math.floor(r() * 5)];
        b += F(rrect(x0, y0, x1 - x0, hgt, 0.4), col) + L(`M${f(x0 + 0.4)},${f(y0 + 0.4)}H${f(x1 - 0.4)}`, 0.4, '#C47A52', 'opacity="0.55"');
      }
    }
    b += F(rrect(24.4, 2 * (60 / rows) + 0.4, 7.2, 60 / rows - 0.8, 0.3), '#2A1E14');
    b += F(rrect(0, 44, W, 16, 0), d.linear(0, 60, 0, 44, [[0, PAL.grimeD, 0.6], [1, PAL.grimeD, 0]]));
    // spray-painted tag
    b += L('M10,30c2,-6 5,4 7,-2s4,3 6,-1', 1.4, '#6E9A2A', 'opacity="0.8"') + L('M27,27l3,6l2,-6', 1.2, '#6E9A2A', 'opacity="0.8"');
    s += d.clip(fc.side, onSide(t, 0.06, 0.5, 60, b));
    // end face bricks
    let e = '';
    for (let row = 0; row < rows; row++) e += L(`M0,${f(row * (60 / rows))}H6`, 0.5, '#8E8270');
    s += d.clip(fc.front, onFront(t, -0.06, 0.5, 60, e));
    // capstone
    s += box(d, t, [-0.09, 0.09, -0.5, 0.5, 60, 64], tone('#A8A294', 0.12, 0.3), { sw: 1.1, grad: 0 });
    const cap = t.qd(-0.09, 0.09, -0.5, 0.5, 64);
    s += d.clip(cap, speckle(d, cap, OFF, 30, ['#7A766A', '#C9C4B4'], 3, 0.3, 0.6, 0.7));
    s += crack(...t.p(0.09, 0.1, 63), 2.2, 8, 9, 0.5, '#5A564C', 0);
    return s;
  });
}

function dividerWood(): ArtAsset {
  return divider('divider_wood', (d, t) => {
    let s = '';
    const r = rnd(12);
    const n = 9;
    const bw = 1 / n;
    // vertical boards with ragged tops (far to near)
    for (let k = 0; k < n; k++) {
      const j0 = -0.5 + k * bw + 0.008;
      const j1 = j0 + bw - 0.016;
      const z = 56 + r() * 7;
      const col = ['#7A5230', '#6E4A2A', '#86603A', '#73502E'][k % 4];
      s += box(d, t, [-0.03, 0.03, j0, j1, 0, z], tone(col, 0.12, 0.3), { sw: 0.9, inner: 0.4, grad: 0.15 });
      const fc = faces(t, [-0.03, 0.03, j0, j1], [-0.03, 0.03, j0, j1], 0, z);
      let g = '';
      for (let q = 0; q < 3; q++) {
        const u = 1 + r() * 3.4;
        g += L(`M${f(u)},${f(2 + r() * 10)}q0.6,12 0,${f(18 + r() * 20)}`, 0.4, q % 2 ? '#4E321A' : '#A07448', 'opacity="0.7"');
      }
      if (k === 4) g += F(ell(2.7, 22, 1.8, 2.4), '#1E140C', 0.4) + F(ell(2.7, 22, 1.1, 1.1), '#DECC54') + dot(2.7, 22, 0.35, INK);
      s += d.clip(fc.side, onSide(t, 0.03, j1, z, g));
      // pointy top cut
      const tp = t.p(0.03, (j0 + j1) / 2, z + 2.5);
      const a = t.p(0.03, j1, z);
      const b = t.p(0.03, j0, z);
      s += F(`M${pp(a)}L${pp(tp)}L${pp(b)}Z`, col, 0.8);
    }
    // two rails on the visible side + nails
    for (const z of [14, 46]) {
      s += box(d, t, [0.03, 0.08, -0.5, 0.5, z, z + 4.5], tone('#5E3E22', 0.12, 0.3), { sw: 0.9, grad: 0 });
      for (let k = 0; k < n; k++) s += dot(...t.p(0.08, -0.5 + (k + 0.5) * bw, z + 2.2), 0.45, '#1E140C');
    }
    s += rust(...t.p(0.08, 0.3, 16), 1.2, 4);
    s += F(blob(...t.p(0.03, -0.2, 3), 12, 3, 5), PAL.slime, 0, 'opacity="0.35"');
    return s;
  });
}

// ================================================================ late-game sets
function tableDrum(): ArtAsset {
  return objAsset('table_drum', hFor(36), (d, t) => {
    let s = shadowDisc(d, t, 0, 0, 0.42, 0.3);
    // a rusty blue oil drum with rolling hoops
    const c = cyl(d, t, 0, 0, 0.28, 0, 27, tone('#3E5A6E', 0.14, 0.38));
    s += c.svg;
    let tex = speckle(d, c.body, OFF, 40, ['#22323E', '#7A9AAA'], 21, 0.3, 0.7, 0.6);
    tex += F(blob(c.top.cx + 8, c.top.cy + 20, 4, 6, 22), RUST, 0, 'opacity="0.7"') + F(blob(c.top.cx - 10, c.top.cy + 26, 5, 3, 23), RUST, 0, 'opacity="0.6"');
    tex += F(blob(c.top.cx - 4, c.top.cy + 14, 3, 2.4, 24), '#C9B03A', 0, 'opacity="0.5"'); // half a hazard sticker
    s += d.clip(c.body, tex);
    for (const z of [9, 18]) {
      const e = disc(t, 0, 0, z, 0.285);
      const arc = `M${f(e.cx - e.rx)},${f(e.cy)}A${f(e.rx)},${f(e.ry)} 0 0 0 ${f(e.cx + e.rx)},${f(e.cy)}`;
      s += L(arc, 2.6, INK) + L(arc, 1.5, '#5A7A8E');
    }
    s += F(c.body, 'none', LW);
    // a square of scrap plywood on top, one corner snapped
    s += box(d, t, [-0.42, 0.42, -0.42, 0.42, 27, 29], tone('#A88E62', 0.1, 0.32), { sw: 1, grad: 0 });
    s += box(d, t, [-0.43, 0.43, -0.43, 0.43, 29, TOP_Z], tone('#B89A6A', 0.08, 0.3), { sw: LW, grad: 0 });
    const top = t.qd(-0.43, 0.43, -0.43, 0.43, TOP_Z);
    let ply = '';
    for (let k = 0; k < 7; k++) ply += L(seg(t, [-0.43, -0.4 + k * 0.13, TOP_Z], [0.43, -0.36 + k * 0.13, TOP_Z]), 0.4, '#8A6E44', 'opacity="0.6"');
    ply += L(ell(...t.p(0.1, -0.15, TOP_Z), 5.4, 3.3), 0.9, '#3A3A3A', 'opacity="0.4"') + F(blob(...t.p(-0.2, 0.2, TOP_Z), 6, 3, 25), '#3A2A1A', 0, 'opacity="0.3"');
    ply += speckle(d, top, OFF, 30, ['#6A5232', '#D8C090'], 26, 0.3, 0.6, 0.7);
    s += d.clip(top, ply);
    s += F(`M${pp(t.p(0.43, 0.25, TOP_Z))}L${pp(t.p(0.43, 0.43, TOP_Z))}L${pp(t.p(0.28, 0.43, TOP_Z))}Z`, '#6A5232', 0.5);
    return s;
  });
}

function tableButcher(): ArtAsset {
  return objAsset('table_butcher', hFor(40), (d, t) => {
    let s = shadow(d, t, -0.46, 0.46, -0.46, 0.46, 0.32);
    const legT = tone('#6E4A2A', 0.12, 0.32);
    for (const [i, j] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]] as [number, number][]) s += post(d, t, i, j, 0.12, 0, 22, legT, 1);
    s += box(d, t, [-0.36, 0.36, -0.36, 0.36, 4, 7], legT, { sw: 0.8, grad: 0 }); // bottom shelf
    // the thick end-grain block
    s += box(d, t, [-0.44, 0.44, -0.44, 0.44, 22, TOP_Z + 1], tone('#9A7246', 0.12, 0.32));
    const fc = faces(t, [-0.44, 0.44, -0.44, 0.44], [-0.44, 0.44, -0.44, 0.44], 22, TOP_Z + 1);
    let side = '';
    for (let k = 0; k < 9; k++) side += L(`M${f(k * 4.7)},0V9`, 0.5, '#5A3A1E', 'opacity="0.7"');
    s += d.clip(fc.front, onFront(t, -0.44, 0.44, TOP_Z + 1, side)) + d.clip(fc.side, onSide(t, 0.44, 0.44, TOP_Z + 1, side));
    const top = t.qd(-0.44, 0.44, -0.44, 0.44, TOP_Z + 1);
    let tx = F(top, '#B08A58');
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
      const i0 = -0.44 + a * (0.88 / 6);
      const j0 = -0.44 + b * (0.88 / 6);
      tx += F(t.qd(i0 + 0.005, i0 + 0.142, j0 + 0.005, j0 + 0.142, TOP_Z + 1), (a + b) % 2 ? '#A07A48' : '#B89260', 0);
    }
    // a worn hollow in the middle, knife scores, old blood
    tx += F(blob(...t.p(0, 0, TOP_Z + 1), 18, 9, 31), '#5A3A1E', 0, 'opacity="0.25"');
    tx += scratches(...t.p(-0.3, 0, TOP_Z + 1), 60, 30, 18, 32, '#3A2410', 0.6, 5);
    tx += F(blob(...t.p(0.2, 0.15, TOP_Z + 1), 6, 3, 33), '#6A1A14', 0, 'opacity="0.55"') + F(blob(...t.p(-0.25, -0.2, TOP_Z + 1), 4, 2, 34), '#6A1A14', 0, 'opacity="0.4"');
    s += d.clip(top, tx) + F(top, 'none', LW);
    // a cleaver bitten into the far corner
    const [cx, cy] = t.p(-0.3, -0.3, TOP_Z + 1);
    s += F(`M${f(cx - 8)},${f(cy - 1)}L${f(cx + 4)},${f(cy + 2)}L${f(cx + 5)},${f(cy - 9)}L${f(cx - 7)},${f(cy - 12)}Z`, '#A8ACA8', 0.8) + dot(cx - 4, cy - 8, 0.9, '#2A2622');
    s += L(`M${f(cx + 5)},${f(cy - 5)}L${f(cx + 13)},${f(cy - 4)}`, 2.6, INK) + L(`M${f(cx + 5)},${f(cy - 5)}L${f(cx + 13)},${f(cy - 4)}`, 1.6, '#4A2E18');
    // blood drip down the front edge
    s += onFront(t, -0.44, 0.44, TOP_Z + 1, F('M28,0q0,5 1,7q1,1 1.4,-0.6q0,-4 0.4,-6.4Z', '#6A1A14', 0.4));
    return s;
  });
}

function tableMorgue(): ArtAsset {
  return objAsset('table_morgue', hFor(40), (d, t) => {
    let s = shadow(d, t, -0.46, 0.46, -0.46, 0.46, 0.3);
    // a steel pedestal and a drain bucket
    s += cyl(d, t, 0, 0, 0.24, 0, 3, tone(CHROME_D, 0.2, 0.4), 1).svg;
    s += cyl(d, t, 0, 0, 0.1, 3, 25, tone(CHROME, 0.2, 0.42), 1).svg;
    // the slab: steel tray with a raised lip and a drain hole
    s += box(d, t, [-0.45, 0.45, -0.45, 0.45, 25, TOP_Z], { top: '#B8BCB8', front: '#A2A6A2', side: '#7A7E7A' }, { sw: LW, grad: 0 });
    const top = t.qd(-0.45, 0.45, -0.45, 0.45, TOP_Z);
    let tx = F(t.qd(-0.4, 0.4, -0.4, 0.4, TOP_Z), '#9EA29E', 0.5);
    tx += streaks(d, top, ...t.p(-0.45, -0.45, TOP_Z), 90, 50, 18, 41, 0.4, 0.3);
    tx += L(seg(t, [-0.4, 0, TOP_Z], [0.4, 0, TOP_Z]), 0.6, '#6A6E6A') + F(ell(...t.p(0.32, 0, TOP_Z), 1.6, 1), '#2A2826', 0.4);
    tx += F(blob(...t.p(0.25, 0.05, TOP_Z), 5, 2, 42), '#6A1A14', 0, 'opacity="0.35"');
    s += d.clip(top, tx);
    // the toe tag dangling off the near corner on its string
    const [tx0, ty0] = t.p(0.45, 0.42, TOP_Z - 1);
    s += L(`M${f(tx0)},${f(ty0)}q1,4 -1,7`, 0.5, '#8A8270');
    s += `<g transform="rotate(12 ${f(tx0 - 1)} ${f(ty0 + 9)})">${F(`M${f(tx0 - 3.6)},${f(ty0 + 7)}h6l1.4,2.4l-1.4,2.4h-6Z`, '#D8CC98', 0.5)}${L(`M${f(tx0 - 2.6)},${f(ty0 + 9)}h4M${f(tx0 - 2.6)},${f(ty0 + 10.4)}h3`, 0.35, '#5A5040')}${dot(tx0 + 2.4, ty0 + 9.4, 0.4, '#5A5040')}</g>`;
    return s;
  });
}

function tireChair(): ChairStyle {
  const rub = '#2A2826';
  const tire = (d: Doc, t: Iso, cj: number, z0: number, z1: number) => {
    const c = cyl(d, t, 0, cj, 0.23, z0, z1, tone(rub, 0.12, 0.3), 1);
    let s = c.svg + d.clip(c.body, L(`M0,${f(c.top.cy + (z1 - z0) / 2 + c.top.ry)}H200`, 0.5, '#4A4846', 'opacity="0.8"'));
    for (let k = -4; k <= 4; k++) s += L(`M${f(c.top.cx + (k / 4.6) * c.top.rx)},${f(c.top.cy + Math.sqrt(1 - (k / 4.6) ** 2) * c.top.ry + 1)}v${f(z1 - z0 - 2)}`, 0.5, '#4A4846');
    s += F(ell(c.top.cx, c.top.cy, c.top.rx * 0.55, c.top.ry * 0.55), '#141210', 0.6);
    return { s, top: c.top };
  };
  return {
    seatZ: 18,
    shadow: (d, t) => shadowDisc(d, t, 0, 0, 0.3, 0.28),
    leg: () => '',
    seat: (d, t, _j0, _j1, o) => {
      let s = tire(d, t, o * SEAT_CJ, 0, 8).s;
      const up = tire(d, t, o * SEAT_CJ, 8, 15);
      s += up.s;
      // a milk-crate seat on top
      s += box(d, t, [-0.2, 0.2, o * SEAT_CJ - 0.2, o * SEAT_CJ + 0.2, 15, 18], tone('#5E7A3A', 0.14, 0.32), { sw: 1, grad: 0 });
      const tp = t.qd(-0.2, 0.2, o * SEAT_CJ - 0.2, o * SEAT_CJ + 0.2, 18);
      let g = '';
      for (let k = 1; k < 5; k++) g += L(seg(t, [-0.2 + k * 0.08, o * SEAT_CJ - 0.2, 18], [-0.2 + k * 0.08, o * SEAT_CJ + 0.2, 18]), 0.7, '#2E3E1E') + L(seg(t, [-0.2, o * SEAT_CJ - 0.2 + k * 0.08, 18], [0.2, o * SEAT_CJ - 0.2 + k * 0.08, 18]), 0.7, '#2E3E1E');
      s += d.clip(tp, g);
      return s;
    },
    back: (_d, t, jb, o) => {
      // a bald tyre standing on edge behind the seat, chained on
      const c = t.p(0, jb, 28);
      const ring = (rx: number, ry: number) => `M${f(c[0] - rx)},${f(c[1])}a${f(rx)},${f(ry)} 0 1 0 ${f(rx * 2)},0a${f(rx)},${f(ry)} 0 1 0 ${f(-rx * 2)},0Z`;
      const outer = ring(12, 13);
      const inner = ring(6.4, 7);
      let s = `<path d="${outer}${inner}" fill="${o > 0 ? '#22201E' : '#2E2C2A'}" fill-rule="evenodd" stroke="${INK}" stroke-width="${LW}"/>`;
      s += L(ring(9.2, 10), 0.5, '#4A4846');
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        s += L(`M${f(c[0] + Math.cos(a) * 9.6)},${f(c[1] + Math.sin(a) * 10.4)}l${f(Math.cos(a) * 2)},${f(Math.sin(a) * 2.2)}`, 0.6, '#4A4846');
      }
      s += L(`M${f(c[0] - 5)},${f(c[1] + 11)}l2,6M${f(c[0] + 5)},${f(c[1] + 11)}l-2,6`, 1.6, '#7F8584');
      return s;
    },
  };
}

function cleaverChair(): ChairStyle {
  const w = tone('#7A5634', 0.12, 0.32);
  const steel = '#A8ACA8';
  return {
    seatZ: 18,
    leg: (d, t, i, j) => post(d, t, i, j, 0.06, 0, 15, w),
    seat: (d, t, j0, j1, o) => {
      let s = box(d, t, [-SI, SI, j0, j1, 14, 18], tone('#8A6038', 0.12, 0.32), { sw: 1.1, grad: 0 });
      const top = t.qd(-SI, SI, j0, j1, 18);
      s += d.clip(top, scratches(...t.p(-0.15, (j0 + j1) / 2 - 0.1, 18), 22, 10, 6, 50 + o, '#3A2410', 0.5, 3) + F(blob(...t.p(0.05, (j0 + j1) / 2, 18), 3, 1.6, 51 + o), '#6A1A14', 0, 'opacity="0.35"'));
      return s;
    },
    back: (d, t, jb, o) => {
      // the backrest is one huge cleaver: wooden grip as the left upright, the blade as the panel
      let s = post(d, t, -LI, jb, 0.06, 0, 30, w) + post(d, t, LI, jb, 0.06, 0, 30, w);
      const W = (2 * SI + 0.04) * 48;
      let bl = F(`M0,0H${f(W)}V16L${f(W - 3)},20H0Z`, steel, 0.9);
      bl += L(`M1,18.6H${f(W - 3.4)}`, 0.8, '#E8ECE8') + F(ell(W - 5, 4.4, 1.8, 1.8), '#2A2826', 0.4);
      if (o > 0) bl += F(blob(10, 12, 4, 3, 52), '#6A1A14', 0, 'opacity="0.5"');
      bl += L(`M3,3L${f(W - 10)},5`, 0.6, '#FFFFFF', 'opacity="0.5"');
      s += onFront(t, -SI - 0.02, jb, 50, bl);
      // the handle sticking up past the blade
      const a = t.p(-SI - 0.02, jb, 48);
      s += L(`M${pp(a)}l-2,-10`, 4, INK) + L(`M${pp(a)}l-2,-10`, 2.8, '#5A3A1E') + dot(a[0] - 0.6, a[1] - 3, 0.5, '#B8BAB4') + dot(a[0] - 1.4, a[1] - 7, 0.5, '#B8BAB4');
      return s;
    },
  };
}

function electricChair(): ChairStyle {
  const w = tone('#5E4A36', 0.12, 0.34);
  const strap = '#3A2A1E';
  return {
    seatZ: 19,
    leg: (d, t, i, j) => post(d, t, i, j, 0.07, 0, 15, w) + box(d, t, [i - 0.04, i + 0.04, j - 0.02, j + 0.02, 4, 7], tone(strap), { sw: 0.6, grad: 0 }),
    seat: (d, t, j0, j1) => {
      let s = box(d, t, [-SI - 0.03, SI + 0.03, j0, j1, 15, 19], w, { sw: 1.1, grad: 0 });
      const top = t.qd(-SI - 0.03, SI + 0.03, j0, j1, 19);
      s += d.clip(top, F(blob(...t.p(0, (j0 + j1) / 2, 19), 5, 2.4, 61), '#2A1E14', 0, 'opacity="0.4"'));
      // armrests with leather straps and buckles
      for (const i of [-SI - 0.02, SI + 0.02]) {
        s += box(d, t, [i - 0.03, i + 0.03, j0 + 0.04, j1 - 0.02, 19, 28], w, { sw: 0.8, grad: 0 });
        s += box(d, t, [i - 0.045, i + 0.045, (j0 + j1) / 2 - 0.03, (j0 + j1) / 2 + 0.03, 26.5, 29], tone(strap), { sw: 0.6, grad: 0 });
        s += dot(...t.p(i + 0.045, (j0 + j1) / 2, 27.6), 0.6, '#B8963E');
      }
      return s;
    },
    back: (d, t, jb, o) => {
      let s = post(d, t, -LI, jb, 0.07, 0, 52, w) + post(d, t, LI, jb, 0.07, 0, 52, w);
      s += box(d, t, [-SI, SI, jb - 0.02, jb + 0.02, 24, 46], tone('#6E5A42', 0.12, 0.32), { sw: 1, grad: 0 });
      s += box(d, t, [-SI - 0.01, SI + 0.01, jb - 0.03, jb + 0.03, 36, 38.5], tone(strap), { sw: 0.6, grad: 0 });
      // the steel skullcap on its arm, wires snaking down, a warning sign
      const cap = t.p(0, jb + o * 0.06, 58);
      s += L(`M${pp(t.p(LI, jb, 52))}Q${f(cap[0] + 8)},${f(cap[1] - 8)} ${f(cap[0] + 2)},${f(cap[1] - 3)}`, 2.4, INK) + L(`M${pp(t.p(LI, jb, 52))}Q${f(cap[0] + 8)},${f(cap[1] - 8)} ${f(cap[0] + 2)},${f(cap[1] - 3)}`, 1.4, '#7F8584');
      s += F(`M${f(cap[0] - 6)},${f(cap[1])}C${f(cap[0] - 6)},${f(cap[1] - 7)} ${f(cap[0] + 6)},${f(cap[1] - 7)} ${f(cap[0] + 6)},${f(cap[1])}Z`, '#A8ACA8', 0.9) + L(`M${f(cap[0] - 4)},${f(cap[1] - 3)}h8`, 0.5, '#6A6E6A');
      s += L(`M${f(cap[0] + 5)},${f(cap[1] - 4)}C${f(cap[0] + 14)},${f(cap[1] + 4)} ${f(cap[0] + 10)},${f(cap[1] + 30)} ${f(cap[0] + 14)},${f(cap[1] + 50)}`, 1.2, '#2A2826');
      s += `<g opacity="0.85">${L(`M${f(cap[0] - 2)},${f(cap[1] - 9)}l2,-3l-1,2.6l2.4,-3`, 0.7, '#E6E07A')}</g>`;
      if (o > 0) s += onFront(t, -0.1, jb + 0.03, 34, F('M0,0L5,8.6H-5Z', '#C9B03A', 0.5) + L('M0,2.6l-1,2.6h2l-1,2.4', 0.5, INK));
      return s;
    },
  };
}

// ================================================================ meta + export
const SEAT_Z: Record<ChairFamily, number> = { plain: 18, diner: 20, wood: 18, barrel: 18, bone: 17, tire: 18, cleaver: 18, electric: 19 };
const screenOff = (i: number, j: number) => ({ dx: Math.round((i - j) * 48 * 100) / 100, dy: Math.round((i + j) * 30 * 100) / 100 });

const TABLE_TOP: Record<string, number> = {};
for (const n of TINT_NAMES) TABLE_TOP[`table_plain_${n}`] = TOP_Z;
Object.assign(TABLE_TOP, { table_diner: TOP_Z, table_wood: 31, table_barrel: TOP_Z, table_coffin: 31, table_drum: TOP_Z, table_butcher: TOP_Z + 1, table_morgue: TOP_Z });

export const FURN_META = {
  tints: TINTS,
  chairFamilies: CHAIR_FAMILIES,
  /** Height of each table's top above the floor. */
  tableTopZ: TABLE_TOP,
  /** Seat top height per chair family (plain covers every chair_plain_<tint>). */
  seatZ: SEAT_Z,
  /**
   * Seat centre (where the sitter's root goes before lifting by seatZ) relative to the chair tile centre,
   * in screen units, per facing. sw/ne are the drawings; se/nw are their mirrors.
   */
  seatOffset: {
    sw: screenOff(0, SEAT_CJ),
    ne: screenOff(0, -SEAT_CJ),
    se: screenOff(SEAT_CJ, 0),
    nw: screenOff(-SEAT_CJ, 0),
  },
  /** Backrest top height (for sorting / bubbles). */
  backTopZ: { plain: 47, diner: 46, wood: 49, barrel: 38, bone: 55, tire: 41, cleaver: 60, electric: 66 } as Record<ChairFamily, number>,
  /** Plate centre relative to the table tile centre in screen units (the middle of the top). */
  plateOffset: Object.fromEntries(Object.entries(TABLE_TOP).map(([k, z]) => [k, { dx: 0, dy: -z }])) as Record<string, { dx: number; dy: number }>,
  /** Divider height. */
  dividerZ: DV_H,
};

export function chairFamilyOf(key: string): ChairFamily | null {
  const m = /^chair_([a-z]+)_/.exec(key);
  return m && (CHAIR_FAMILIES as readonly string[]).includes(m[1]) ? (m[1] as ChairFamily) : null;
}

export const FURN_KEYS: string[] = [
  ...TINT_NAMES.map((n) => `table_plain_${n}`),
  'table_diner', 'table_wood', 'table_barrel', 'table_coffin', 'table_drum', 'table_butcher', 'table_morgue',
  ...TINT_NAMES.flatMap((n) => ['sw', 'ne', 'ne_back'].map((s) => `chair_plain_${n}_${s}`)),
  ...['diner', 'wood', 'barrel', 'bone', 'tire', 'cleaver', 'electric'].flatMap((fam) => ['sw', 'ne', 'ne_back'].map((s) => `chair_${fam}_${s}`)),
  'divider_plain', 'divider_brick', 'divider_wood',
];

export function buildFurniture(): ArtAsset[] {
  const out: ArtAsset[] = [];
  for (const n of TINT_NAMES) out.push(tablePlain(n));
  out.push(tableDiner(), tableWood(), tableBarrel(), tableCoffin());
  for (const n of TINT_NAMES) out.push(...chairSet(`plain_${n}`, plainChair(n)));
  out.push(...chairSet('diner', dinerChair()));
  out.push(...chairSet('wood', woodChair()));
  out.push(...chairSet('barrel', barrelChair()));
  out.push(...chairSet('bone', boneChair(), hFor(60, 0.4)));
  out.push(tableDrum(), tableButcher(), tableMorgue());
  out.push(...chairSet('tire', tireChair()));
  out.push(...chairSet('cleaver', cleaverChair(), hFor(62, 0.4)));
  out.push(...chairSet('electric', electricChair(), hFor(72, 0.4)));
  out.push(dividerPlain(), dividerBrick(), dividerWood());
  return out;
}
