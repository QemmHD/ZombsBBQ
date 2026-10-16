import { describe, expect, it } from 'vitest';
import { buildChar, buildProps, CHAR_IDS, TILE_H, TILE_W, WALL_H } from '../src/art';
import type { ArtAsset, CharPart } from '../src/art';

function checkSvg(key: string, svg: string, w: number, h: number): void {
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
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  // every referenced id is defined in the same document
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, `${key} defines #${m[1]}`).toContain(`id="${m[1]}"`);
}

describe('characters', () => {
  const required = [
    'accountant', 'yoga', 'teen', 'politician', 'construction', 'nurse', 'cop', 'ceo',
    'accountant_z', 'yoga_z', 'teen_z', 'politician_z', 'construction_z', 'nurse_z', 'cop_z', 'ceo_z',
    'you', 'gus',
  ];

  it('exports every required id exactly once', () => {
    expect([...CHAR_IDS].sort()).toEqual([...required].sort());
  });

  it.each(CHAR_IDS)('%s has six well-formed parts', (id) => {
    const c = buildChar(id);
    expect(c.id).toBe(id);
    expect(Number.isFinite(c.height) && c.height > 60 && c.height < 110).toBe(true);
    const names = c.parts.map((p) => p.key.replace(`char_${id}_`, ''));
    expect([...names].sort()).toEqual(['armL', 'armR', 'head', 'legL', 'legR', 'torso']);
    for (const p of c.parts) {
      checkSvg(p.key, p.svg, p.w, p.h);
      for (const v of [p.px, p.py, p.x, p.y]) expect(Number.isFinite(v)).toBe(true);
      // pivot inside the part's own image
      expect(p.px).toBeGreaterThanOrEqual(0);
      expect(p.px).toBeLessThanOrEqual(p.w);
      expect(p.py).toBeGreaterThanOrEqual(0);
      expect(p.py).toBeLessThanOrEqual(p.h);
      // above the feet
      expect(p.y).toBeLessThan(0);
    }
  });

  it('uses unique part keys across all characters', () => {
    const keys: string[] = [];
    for (const id of CHAR_IDS) for (const p of buildChar(id).parts) keys.push(p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('places joints consistently (hips below shoulders below neck)', () => {
    const c = buildChar('nurse');
    const by = (n: string): CharPart => c.parts.find((p) => p.key.endsWith('_' + n))!;
    expect(by('legL').y).toBeGreaterThan(by('torso').y - 10);
    expect(by('armL').y).toBeLessThan(by('legL').y);
    expect(by('head').y).toBeLessThan(by('armL').y);
    expect(by('armL').x).toBeLessThan(0);
    expect(by('armR').x).toBeGreaterThan(0);
  });
});

describe('props', () => {
  const props = buildProps();
  const by = new Map(props.map((p) => [p.key, p] as [string, ArtAsset]));
  const required = [
    'floor_a', 'floor_b', 'grass', 'sidewalk', 'road', 'road_line',
    'wall_l', 'wall_r', 'wall_r_door', 'wall_l_window', 'wall_l_sign', 'wall_r_menu',
    'table', 'bench_l', 'bench_r', 'counter', 'grill', 'grill_fire', 'smoker', 'fridge', 'plant', 'barrel_keg',
    'tombstone', 'neon_post', 'tree',
    'dish_hotdog', 'dish_burger', 'dish_wings', 'dish_ribs', 'dish_pork', 'dish_brisket', 'dish_snack', 'dish_burnt',
    'fx_coin', 'fx_happy', 'fx_angry', 'fx_zzz', 'fx_brain_thought', 'fx_alert', 'fx_sweat', 'fx_drool', 'fx_hangry',
    'fx_smoke', 'fx_spark',
  ];

  it('has unique keys and every required key', () => {
    expect(by.size).toBe(props.length);
    for (const k of required) expect(by.has(k), k).toBe(true);
  });

  it.each(props.map((p) => [p.key, p] as [string, ArtAsset]))('%s is a well-formed SVG asset', (_k, a) => {
    checkSvg(a.key, a.svg, a.w, a.h);
    expect(a.ox).toBeGreaterThanOrEqual(0);
    expect(a.ox).toBeLessThanOrEqual(1);
    expect(a.oy).toBeGreaterThanOrEqual(0);
    expect(a.oy).toBeLessThanOrEqual(1);
  });

  it('floor tiles are exactly one tile, centred', () => {
    for (const k of ['floor_a', 'floor_b', 'grass', 'sidewalk', 'road', 'road_line']) {
      const a = by.get(k)!;
      expect([a.w, a.h, a.ox, a.oy]).toEqual([TILE_W, TILE_H, 0.5, 0.5]);
    }
  });

  it('walls are half a tile wide and WALL_H + TILE_H/2 tall, anchored bottom-center', () => {
    for (const k of ['wall_l', 'wall_r', 'wall_r_door', 'wall_l_window', 'wall_l_sign', 'wall_r_menu']) {
      const a = by.get(k)!;
      expect([a.w, a.h, a.ox, a.oy]).toEqual([TILE_W / 2, WALL_H + TILE_H / 2, 0.5, 1]);
    }
  });

  it('1x1 floor objects have their tile center TILE_H/2 + margin above the bottom', () => {
    for (const k of ['table', 'bench_l', 'bench_r', 'counter', 'grill', 'smoker', 'fridge', 'plant', 'barrel_keg', 'tombstone']) {
      const a = by.get(k)!;
      expect(a.w).toBe(TILE_W + 8);
      expect(a.ox).toBe(0.5);
      expect(a.h - a.oy * a.h).toBeCloseTo(TILE_H / 2 + 4, 0);
    }
  });
});
