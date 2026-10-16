import { describe, expect, it } from 'vitest';
import { PROP_META, TILE_H, TILE_W, WALL_H, buildProps } from '../src/art';
import type { ArtAsset } from '../src/art';
import { DIRS, PROP_KEYS, THEMES, WALL_HANGINGS } from '../src/art/manifest';

const props = buildProps();
const by = new Map(props.map((p) => [p.key, p] as [string, ArtAsset]));

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
  // balanced tags (cheap well-formedness check) and every referenced id defined in the same document
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
}

describe('prop manifest coverage', () => {
  it('provides every PROP_KEYS key exactly once and nothing else', () => {
    const keys = props.map((p) => p.key);
    for (const k of PROP_KEYS) expect(keys.filter((x) => x === k).length, k).toBe(1);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...PROP_KEYS].sort());
  });

  it.each(props.map((p) => [p.key, p] as [string, ArtAsset]))('%s is a well-formed SVG asset', (_k, a) => {
    checkSvg(a);
    for (const v of [a.ox, a.oy]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('prop geometry', () => {
  const tiles = props.filter((p) => /^(floor_|grass$|sidewalk$|road)/.test(p.key));
  const wallLike = props.filter((p) => p.key.startsWith('wall_'));

  it('has every theme floor and wall', () => {
    for (const t of THEMES.filter((x) => x !== 'shack'))
      for (const k of [`floor_${t}_a`, `floor_${t}_b`, `wall_l_${t}`, `wall_r_${t}`, `wall_r_door_${t}`]) expect(by.has(k), k).toBe(true);
  });

  it('floor tiles are exactly one 96x48 tile anchored at the center', () => {
    expect(tiles.length).toBeGreaterThanOrEqual(12);
    for (const a of tiles) expect([a.key, a.w, a.h, a.ox, a.oy]).toEqual([a.key, TILE_W, TILE_H, 0.5, 0.5]);
  });

  it('walls and wall hangings are 48x144 anchored bottom-center', () => {
    for (const k of WALL_HANGINGS) for (const s of ['l', 'r']) expect(by.has(`${k}_${s}`), `${k}_${s}`).toBe(true);
    expect(wallLike.length).toBe(6 + 3 * 3 + WALL_HANGINGS.length * 2);
    for (const a of wallLike) expect([a.key, a.w, a.h, a.ox, a.oy]).toEqual([a.key, TILE_W / 2, WALL_H + TILE_H / 2, 0.5, 1]);
  });

  it('1x1 floor objects put the tile center TILE_H/2 + 4 above the image bottom', () => {
    const oneByOne = [
      'table_diner', 'table_barrel', 'table_coffin', 'fryer', 'counter_chrome',
      'cactus', 'hay_bale', 'lamp_post', 'gnome_zombie', 'flamingo_zombie', 'skeleton_statue', 'pumpkin_pile',
      'coffin_upright', 'slime_fountain', 'barrel_stack', 'atm', 'vending', 'jukebox', 'arcade', 'pethouse_pug', 'pethouse_kennel',
      ...['diner', 'wood', 'bone'].flatMap((f) => DIRS.map((d) => `chair_${f}_${d}`)),
    ];
    for (const k of oneByOne) {
      const a = by.get(k)!;
      expect(a, k).toBeDefined();
      expect(a.w, k).toBe(TILE_W + 8);
      expect(a.ox, k).toBe(0.5);
      expect(a.h - a.oy * a.h, k).toBeCloseTo(TILE_H / 2 + 4, 0);
    }
  });

  it('dishes are 32x24 plates anchored at the plate center; fx and overlays are bottom-anchored', () => {
    for (const a of props.filter((p) => p.key.startsWith('dish_'))) expect([a.key, a.w, a.h, a.ox, a.oy]).toEqual([a.key, 32, 24, 0.5, 0.625]);
    for (const a of props.filter((p) => p.key.startsWith('fx_') || ['grill_fire', 'fryer_bubbles', 'keep_warm'].includes(p.key))) {
      expect([a.key, a.ox, a.oy]).toEqual([a.key, 0.5, 1]);
      expect(a.w).toBeLessThanOrEqual(96);
    }
  });
});

describe('PROP_META', () => {
  it('keeps the original bench / table / counter / grill numbers', () => {
    expect(PROP_META.seatZ).toBe(15.5);
    expect(PROP_META.tableTopZ).toBe(26);
    expect(PROP_META.counterTopZ).toBe(34);
    expect(PROP_META.grillTopZ).toBe(26);
    expect(PROP_META.bench_l).toEqual({ dx: TILE_W / 8, dy: TILE_H / 8 });
    expect(PROP_META.bench_r).toEqual({ dx: -TILE_W / 8, dy: -TILE_H / 8 });
  });

  it('has a seat offset for every facing direction, a quarter tile toward the table it faces', () => {
    const toward: Record<string, [number, number]> = { se: [1, 0], nw: [-1, 0], sw: [0, 1], ne: [0, -1] };
    for (const d of DIRS) {
      const o = PROP_META.seat[d];
      expect(o, d).toBeDefined();
      const [di, dj] = toward[d];
      // a quarter tile along (i, j) in screen space
      expect(o.dx).toBeCloseTo(((di - dj) * TILE_W) / 8, 5);
      expect(o.dy).toBeCloseTo(((di + dj) * TILE_H) / 8, 5);
    }
    for (const f of ['chair_diner', 'chair_wood', 'chair_bone'] as const) expect(PROP_META.chairSeatZ[f]).toBeGreaterThan(10);
  });

  it('has a table top height for every table and the kitchen overlay heights', () => {
    const tables = PROP_KEYS.filter((k) => k === 'table' || k.startsWith('table_'));
    expect(tables.length).toBe(4);
    const tops = PROP_META.tableTop as Record<string, number>;
    for (const k of tables) expect(tops[k], k).toBeGreaterThan(PROP_META.seatZ);
    expect(tops.table).toBe(PROP_META.tableTopZ);
    expect(PROP_META.fryerTopZ).toBeGreaterThan(10);
    expect(PROP_META.keepWarmZ).toBe(PROP_META.grillTopZ);
    expect((PROP_META.counterTop as Record<string, number>).counter_chrome).toBe(PROP_META.counterTopZ);
  });
});
