import { describe, expect, it } from 'vitest';
import { MAP_KEYS, RAID_PROP_KEYS, RIVAL_IDS, UI_KEYS } from '../src/art/manifest';
import { buildRaidProps, MAP_LAYOUT, RAID_META } from '../src/art/raidprops';
import { buildUiIcons } from '../src/art/ui';
import type { ArtAsset } from '../src/art/types';

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
  expect(svg, key).not.toMatch(/NaN|undefined|Infinity/);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, `${key} defines #${m[1]}`).toContain(`id="${m[1]}"`);
  // ids are unique inside the document
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} unique ids`).toBe(ids.length);
  // tags nest properly (cheap XML well-formedness check) and no stray '&' / '<' in text
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
    if (m[1]) expect(stack.pop(), `${key} closes </${m[2]}>`).toBe(m[2]);
    else if (!m[3]) stack.push(m[2]);
  }
  expect(stack, `${key} all tags closed`).toEqual([]);
  expect(svg, `${key} escapes &`).not.toMatch(/&(?!(amp|lt|gt|quot|apos|#\d+);)/);
  expect(a.ox).toBeGreaterThanOrEqual(0);
  expect(a.ox).toBeLessThanOrEqual(1);
  expect(a.oy).toBeGreaterThanOrEqual(0);
  expect(a.oy).toBeLessThanOrEqual(1);
}

const near = (v: number, target: number, tol: number) => Math.abs(v - target) <= tol;

describe('raid props + map', () => {
  const assets = buildRaidProps();
  const by = new Map(assets.map((a) => [a.key, a] as [string, ArtAsset]));

  it('provides every RAID_PROP_KEYS and MAP_KEYS key exactly once, and nothing else', () => {
    const keys = assets.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...RAID_PROP_KEYS, ...MAP_KEYS].sort());
  });

  it.each(assets.map((a) => a.key))('%s is a well-formed SVG', (k) => checkSvg(by.get(k)!));

  it('has spec sizes and anchors', () => {
    for (const r of RIVAL_IDS) {
      for (const s of ['a', 'b']) {
        const t = by.get(`raid_floor_${r}_${s}`)!;
        expect([t.w, t.h, t.ox, t.oy]).toEqual([96, 48, 0.5, 0.5]);
      }
      for (const s of ['l', 'r']) {
        const wl = by.get(`raid_wall_${s}_${r}`)!;
        expect([wl.w, wl.h, wl.ox, wl.oy]).toEqual([48, 144, 0.5, 1]);
      }
      const sign = by.get(`raid_sign_${r}`)!;
      expect(near(sign.w, 120, 8), `raid_sign_${r} ~120 wide`).toBe(true);
      expect(sign.ox).toBe(0.5);
      expect(sign.oy).toBeGreaterThan(0.6);
    }
    for (const k of ['fence_l', 'fence_r', 'gate_r']) {
      const a = by.get(k)!;
      expect(a.w).toBe(48);
      expect(near(a.h, 90, 6)).toBe(true);
      expect([a.ox, a.oy]).toEqual([0.5, 1]);
    }
    const bolt = by.get('zapper_bolt')!;
    expect([bolt.w, bolt.h, bolt.ox, bolt.oy]).toEqual([16, 90, 0.5, 1]);
    for (const k of ['bug_zapper', 'chuck_wagon']) {
      const a = by.get(k)!;
      expect(a.ox).toBe(0.5);
      // the tile center sits above the bottom of the image by about half a tile
      expect(a.h * (1 - a.oy)).toBeGreaterThan(20);
    }
    expect(by.get('bug_zapper')!.h * by.get('bug_zapper')!.oy).toBeGreaterThan(RAID_META.zapperCoilZ);
    const fxSize: Record<string, number> = {
      fx_hit: 36, fx_ko: 32, fx_heal: 20, fx_flag: 28, fx_recipe: 30, fx_grave_green: 28, fx_grave_red: 28, fx_headstone: 30, fx_summon: 30,
    };
    for (const [k, w] of Object.entries(fxSize)) expect(by.get(k)!.w, k).toBe(w);
    expect(by.get('fx_ko')!.h).toBe(14);
    const bg = by.get('map_bg')!;
    expect([bg.w, bg.h, bg.ox, bg.oy]).toEqual([1600, 900, 0, 0]);
    for (const k of MAP_KEYS.filter((m) => m !== 'map_bg')) {
      const a = by.get(k)!;
      expect([a.w, a.h, a.ox, a.oy], k).toEqual([160, 140, 0.5, 1]);
    }
  });

  it('MAP_LAYOUT places home and every rival inside the map, in unlock order along the road', () => {
    const ids = ['home', ...RIVAL_IDS] as const;
    expect(Object.keys(MAP_LAYOUT).sort()).toEqual([...ids].sort());
    let lastX = -Infinity;
    for (const id of ids) {
      const { x, y } = MAP_LAYOUT[id];
      // the whole 160 x 140 icon (anchor bottom-center) stays inside 1600 x 900
      expect(x - 80, id).toBeGreaterThanOrEqual(0);
      expect(x + 80, id).toBeLessThanOrEqual(1600);
      expect(y - 140, id).toBeGreaterThanOrEqual(0);
      expect(y, id).toBeLessThanOrEqual(900);
      expect(x, `${id} is further along the road`).toBeGreaterThan(lastX);
      lastX = x;
    }
  });
});

describe('UI icons', () => {
  const icons = buildUiIcons();

  it('provides every UI_KEYS key exactly once, and nothing else', () => {
    const keys = icons.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...UI_KEYS].sort());
  });

  it.each(icons.map((a) => a.key))('%s is a 64x64 centred, well-formed SVG', (k) => {
    const a = icons.find((i) => i.key === k)!;
    checkSvg(a);
    expect([a.w, a.h, a.ox, a.oy]).toEqual([64, 64, 0.5, 0.5]);
    expect(a.svg).toContain('#2B1B17');
  });
});
