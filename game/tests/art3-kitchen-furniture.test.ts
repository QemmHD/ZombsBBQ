import { describe, expect, it } from 'vitest';
import type { ArtAsset } from '../src/art/types';
import { HH, OBJ_W, mirrored } from '../src/art3/kit';
import { KITCHEN_KEYS, KITCHEN_META, buildKitchen } from '../src/art3/kitchen';
import { CHAIR_FAMILIES, FURN_KEYS, FURN_META, TINTS, TINT_NAMES, buildFurniture, chairFamilyOf } from '../src/art3/furniture';

const kitchen = buildKitchen();
const furniture = buildFurniture();
const all = [...kitchen, ...furniture];
const by = new Map(all.map((a) => [a.key, a] as [string, ArtAsset]));

const TINT_LIST = ['white', 'cream', 'sage', 'slate', 'oxblood', 'charcoal'];
const CONTRACT_KITCHEN = [
  'stove_dirty', 'stove_plain', 'stove_steel', 'stove_super', 'grill', 'smoker', 'fryer',
  'fx_steam_1', 'fx_steam_2', 'fx_steam_3', 'grill_flames', 'fryer_bubbles', 'pot_burnt',
  'counter_plain', 'counter_steel', 'counter_bar',
  'sink_dirty', 'sink_plain', 'sink_steel', 'trash_red', 'trash_green',
  'fridge_dirty', 'fridge_plain', 'fridge_steel', 'keg_toxic',
];
const TABLES = [...TINT_LIST.map((t) => `table_plain_${t}`), 'table_diner', 'table_wood', 'table_barrel', 'table_coffin'];
const CHAIR_BASES = [...TINT_LIST.map((t) => `chair_plain_${t}`), 'chair_diner', 'chair_wood', 'chair_barrel', 'chair_bone'];
const CONTRACT_FURN = [
  ...TABLES,
  ...CHAIR_BASES.flatMap((c) => [`${c}_sw`, `${c}_ne`, `${c}_ne_back`]),
  'divider_plain', 'divider_brick', 'divider_wood',
];
const OVERLAYS = ['fx_steam_1', 'fx_steam_2', 'fx_steam_3', 'grill_flames', 'fryer_bubbles', 'pot_burnt'];

function checkSvg(a: ArtAsset): void {
  const { key, svg, w, h } = a;
  expect(Number.isFinite(w) && w > 0, `${key} width`).toBe(true);
  expect(Number.isFinite(h) && h > 0, `${key} height`).toBe(true);
  expect(svg.startsWith('<svg'), `${key} starts with <svg`).toBe(true);
  expect(svg.endsWith('</svg>'), `${key} ends with </svg>`).toBe(true);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  const vb = /viewBox="([^"]+)"/.exec(svg);
  expect(vb, `${key} has a viewBox`).not.toBeNull();
  const [x, y, vw, vh] = vb![1].split(/[\s,]+/).map(Number);
  expect([x, y]).toEqual([0, 0]);
  expect(vw).toBeCloseTo(w, 5);
  expect(vh).toBeCloseTo(h, 5);
  expect(Number(/width="([^"]+)"/.exec(svg)![1])).toBeCloseTo(w, 5);
  expect(Number(/height="([^"]+)"/.exec(svg)![1])).toBeCloseTo(h, 5);
  expect(svg, `${key} has no bad numbers`).not.toMatch(/NaN|undefined|Infinity|null/);
  // balanced tags
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) expect(stack.pop(), `${key} closes <${m[2]}>`).toBe(m[2]);
    else stack.push(m[2]);
  }
  expect(stack, `${key} leaves no tag open`).toEqual([]);
  // every url(#id) is defined; ids unique within the document
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, `${key} defines #${m[1]}`).toContain(`id="${m[1]}"`);
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} unique ids`).toBe(ids.length);
  for (const v of [a.ox, a.oy]) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
}

describe('art3 kitchen + furniture coverage', () => {
  it('provides every contract key exactly once', () => {
    const keys = all.map((a) => a.key);
    for (const k of [...CONTRACT_KITCHEN, ...CONTRACT_FURN]) expect(keys.filter((x) => x === k).length, k).toBe(1);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('exported key lists match what the builders produce', () => {
    expect([...KITCHEN_KEYS].sort()).toEqual(kitchen.map((a) => a.key).sort());
    expect([...FURN_KEYS].sort()).toEqual(furniture.map((a) => a.key).sort());
    expect([...KITCHEN_KEYS].sort()).toEqual([...CONTRACT_KITCHEN].sort());
    expect([...FURN_KEYS].sort()).toEqual([...CONTRACT_FURN].sort());
  });

  it('uses the six stock tints', () => {
    expect(TINT_NAMES).toEqual(TINT_LIST);
    expect(TINTS).toEqual({ white: '#F3F3F3', cream: '#F6EB76', sage: '#7BB550', slate: '#2C6985', oxblood: '#691122', charcoal: '#555555' });
  });

  it.each(all.map((a) => [a.key, a] as [string, ArtAsset]))('%s is a well-formed SVG asset', (_k, a) => checkSvg(a));

  it('mirrored copies stay well-formed with unique ids', () => {
    for (const k of ['stove_dirty', 'chair_bone_ne', 'chair_diner_ne_back', 'divider_brick', 'fryer_bubbles']) checkSvg(mirrored(by.get(k)!, `m_${k}`));
  });
});

describe('art3 kitchen + furniture geometry', () => {
  it('floor objects use the 1x1 object frame anchored at the tile centre', () => {
    for (const a of all) {
      if (OVERLAYS.includes(a.key)) continue;
      expect(a.w, a.key).toBe(OBJ_W);
      expect(a.ox, a.key).toBe(0.5);
      // anchor = h - HH - OBJ_M (kit.objAsset)
      expect(a.h - a.oy * a.h, a.key).toBeCloseTo(HH + 4, 5);
    }
  });

  it('overlays anchor at their bottom centre', () => {
    for (const k of OVERLAYS) {
      const a = by.get(k)!;
      expect([a.ox, a.oy], k).toEqual([0.5, 1]);
    }
  });

  it('_ne_back holds a subset of the _ne drawing', () => {
    for (const c of CHAIR_BASES) {
      const ne = by.get(`${c}_ne`)!.svg;
      const back = by.get(`${c}_ne_back`)!.svg;
      expect(back.length, c).toBeLessThan(ne.length);
      expect(back.length, c).toBeGreaterThan(200);
    }
  });
});

describe('art3 META', () => {
  it('covers every stove, counter and sink', () => {
    for (const k of ['stove_dirty', 'stove_plain', 'stove_steel', 'stove_super', 'grill', 'smoker', 'fryer']) {
      expect(KITCHEN_META.stoveTopZ[k], k).toBeGreaterThan(25);
      expect(KITCHEN_META.stoveTopZ[k], k).toBeLessThan(60);
    }
    for (const k of ['counter_plain', 'counter_steel', 'counter_bar']) expect(KITCHEN_META.counterTopZ[k], k).toBeGreaterThanOrEqual(34);
    for (const k of ['sink_dirty', 'sink_plain', 'sink_steel']) expect(KITCHEN_META.sinkTopZ[k], k).toBeGreaterThanOrEqual(34);
  });

  it('covers every table', () => {
    for (const k of TABLES) {
      expect(FURN_META.tableTopZ[k], k).toBeGreaterThanOrEqual(28);
      expect(FURN_META.tableTopZ[k], k).toBeLessThanOrEqual(34);
      const p = FURN_META.plateOffset[k];
      expect(p, k).toBeDefined();
      expect(Number.isFinite(p.dx) && Number.isFinite(p.dy), k).toBe(true);
    }
    expect(Object.keys(FURN_META.tableTopZ).sort()).toEqual([...TABLES].sort());
  });

  it('covers every chair family', () => {
    expect([...CHAIR_FAMILIES].sort()).toEqual(['barrel', 'bone', 'diner', 'plain', 'wood']);
    for (const c of CHAIR_BASES) {
      const fam = chairFamilyOf(`${c}_sw`);
      expect(fam, c).not.toBeNull();
      expect(FURN_META.seatZ[fam!], c).toBeGreaterThan(12);
      expect(FURN_META.seatZ[fam!], c).toBeLessThan(24);
    }
    for (const dir of ['sw', 'ne', 'se', 'nw'] as const) {
      const o = FURN_META.seatOffset[dir];
      expect(Number.isFinite(o.dx) && Number.isFinite(o.dy), dir).toBe(true);
    }
    // sw seats lean toward the table on the lower-left, ne toward the upper-right; mirrors flip dx
    expect(FURN_META.seatOffset.sw.dx).toBeLessThan(0);
    expect(FURN_META.seatOffset.ne.dy).toBeLessThan(0);
    expect(FURN_META.seatOffset.se.dx).toBeCloseTo(-FURN_META.seatOffset.sw.dx, 5);
    expect(FURN_META.seatOffset.nw.dx).toBeCloseTo(-FURN_META.seatOffset.ne.dx, 5);
  });
});
