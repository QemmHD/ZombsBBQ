import { describe, expect, it } from 'vitest';
import type { ArtAsset } from '../src/art/types';
import { DISH3_IDS, DISH_H, DISH_W, buildDishes } from '../src/art3/dishes';
import { BUBBLE_H, BUBBLE_W, FX3_KEYS, FX_H, FX_W, buildFx } from '../src/art3/fx';

const dishes = buildDishes();
const fx = buildFx();
const all = [...dishes, ...fx];
const by = new Map(all.map((a) => [a.key, a] as [string, ArtAsset]));

const DISH_KEYS = [...DISH3_IDS.map((id) => `dish_${id}`), 'plate_dirty', 'plate_stack'];
const FX_KEYS = [
  'fx_cash', 'fx_full', 'bubble_think', 'face_happy', 'face_angry', 'face_sleep',
  'fx_skull', 'fx_sweat', 'fx_heart', 'fx_hit', 'fx_lock', 'fx_star', 'fx_stink', 'fx_daydream',
];
const CONTRACT_DISH_IDS = [
  'sliders', 'hobodog', 'gumbo', 'tacos', 'lasagut', 'broth', 'meatloaf', 'goulash',
  'burger', 'wings', 'kebab', 'smash', 'chili', 'salad',
  'pork', 'ribs', 'brisket', 'foie',
  'rings', 'nuggets', 'fries', 'chicken',
];

function checkSvg(a: ArtAsset): void {
  const { key, svg, w, h } = a;
  expect(Number.isFinite(w) && w > 0, `${key} width`).toBe(true);
  expect(Number.isFinite(h) && h > 0, `${key} height`).toBe(true);
  expect(svg.startsWith('<svg'), `${key} starts with <svg`).toBe(true);
  expect(svg.trimEnd().endsWith('</svg>'), `${key} ends with </svg>`).toBe(true);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  const vb = /viewBox="([^"]+)"/.exec(svg);
  expect(vb, `${key} has a viewBox`).not.toBeNull();
  const [x, y, vw, vh] = vb![1].split(/[\s,]+/).map(Number);
  expect([x, y]).toEqual([0, 0]);
  expect(vw).toBeCloseTo(w, 5);
  expect(vh).toBeCloseTo(h, 5);
  expect(/width="([^"]+)"/.exec(svg)![1]).toBe(String(w));
  expect(/height="([^"]+)"/.exec(svg)![1]).toBe(String(h));
  expect(svg).not.toMatch(/NaN|undefined|Infinity|null/);
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) expect(stack.pop(), `${key} closes <${m[2]}>`).toBe(m[2]);
    else stack.push(m[2]);
  }
  expect(stack, `${key} leaves no tag open`).toEqual([]);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, `${key} defines #${m[1]}`).toContain(`id="${m[1]}"`);
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} unique ids`).toBe(ids.length);
  for (const v of [a.ox, a.oy]) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
}

describe('art3 dishes + fx coverage', () => {
  it('lists exactly the contract dish ids', () => {
    expect([...DISH3_IDS]).toEqual(CONTRACT_DISH_IDS);
    expect([...FX3_KEYS].sort()).toEqual([...FX_KEYS].sort());
  });

  it('provides every key exactly once and nothing else', () => {
    const keys = all.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...dishes.map((a) => a.key)].sort()).toEqual([...DISH_KEYS].sort());
    expect([...fx.map((a) => a.key)].sort()).toEqual([...FX_KEYS].sort());
  });

  it('keeps ids unique across all documents (assets may be inlined together)', () => {
    const seen = new Map<string, string>();
    for (const a of all)
      for (const m of a.svg.matchAll(/ id="([^"]+)"/g)) {
        expect(seen.get(m[1]), `${m[1]} in ${a.key} also in ${seen.get(m[1])}`).toBeUndefined();
        seen.set(m[1], a.key);
      }
  });

  it.each(all.map((a) => [a.key, a] as [string, ArtAsset]))('%s is a well-formed SVG asset', (_k, a) => checkSvg(a));
});

describe('art3 dishes + fx geometry', () => {
  it('dishes and plate_dirty are 36 x 26 anchored at the plate centre (0.5, 0.62)', () => {
    for (const k of [...CONTRACT_DISH_IDS.map((id) => `dish_${id}`), 'plate_dirty']) {
      const a = by.get(k)!;
      expect([a.w, a.h, a.ox, a.oy], k).toEqual([DISH_W, DISH_H, 0.5, 0.62]);
    }
    expect([DISH_W, DISH_H]).toEqual([36, 26]);
  });

  it('plate_stack is a dish-width stack anchored on its bottom plate', () => {
    const a = by.get('plate_stack')!;
    expect(a.w).toBe(36);
    expect(a.h).toBeGreaterThan(26);
    expect(a.ox).toBe(0.5);
  });

  it('fx float from their bottom-centre; bubbles are 34 x 30', () => {
    for (const k of FX_KEYS) {
      const a = by.get(k)!;
      expect([a.ox, a.oy], k).toEqual([0.5, 1]);
      if (k === 'bubble_think' || k === 'fx_daydream') expect([a.w, a.h], k).toEqual([BUBBLE_W, BUBBLE_H]);
      else expect([a.w, a.h], k).toEqual([FX_W, FX_H]);
    }
    expect([FX_W, FX_H, BUBBLE_W, BUBBLE_H]).toEqual([26, 26, 34, 30]);
  });

  it('is deterministic', () => {
    expect(buildDishes().map((a) => a.svg)).toEqual(dishes.map((a) => a.svg));
    expect(buildFx().map((a) => a.svg)).toEqual(fx.map((a) => a.svg));
  });
});
