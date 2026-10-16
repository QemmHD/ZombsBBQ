import { describe, expect, it } from 'vitest';
import type { ArtAsset } from '../src/art/types';
import { MAP3_H, MAP3_LAYOUT, MAP3_W, RSIGN_META, buildRaidMap3 } from '../src/art3/raidmap3';

const RIVALS = ['chuck', 'hank', 'vera', 'crunch', 'snob', 'boss'];
const KEYS = ['map_bg', 'map_home', ...RIVALS.map((r) => `map_joint_${r}`), 'map_closed', 'map_steal', ...RIVALS.map((r) => `rsign_${r}`)];

const all = buildRaidMap3();
const by = new Map(all.map((a) => [a.key, a]));

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
  expect(Number(/width="([^"]+)"/.exec(svg)![1])).toBeCloseTo(w, 5);
  expect(Number(/height="([^"]+)"/.exec(svg)![1])).toBeCloseTo(h, 5);
  expect(svg).not.toMatch(/NaN|undefined|Infinity|null/);
  // no system fonts: all lettering is stroked paths
  expect(svg).not.toMatch(/<text/);
  // balanced tags (cheap well-formedness check)
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) expect(stack.pop(), `${key} closes <${m[2]}>`).toBe(m[2]);
    else stack.push(m[2]);
  }
  expect(stack, `${key} leaves no tag open`).toEqual([]);
  expect(svg.replace(/<[a-zA-Z]+(?:\s+[a-zA-Z0-9:_-]+="[^"<]*")*\s*\/?>|<\/[a-zA-Z]+>/g, '').trim(), `${key} has no malformed tags`).toBe('');
  // ids unique, every reference resolved in the same document
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} unique ids`).toBe(ids.length);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids, `${key} defines #${m[1]}`).toContain(m[1]);
}

describe('art3 raid map keys', () => {
  it('every key exists exactly once, and nothing else', () => {
    const keys = all.map((a) => a.key);
    for (const k of KEYS) expect(keys.filter((x) => x === k).length, k).toBe(1);
    expect(keys.length).toBe(KEYS.length);
  });
});

describe('art3 raid map SVGs', () => {
  it.each(all.map((a) => [a.key, a] as [string, ArtAsset]))('%s is a well-formed SVG asset', (_k, a) => {
    checkSvg(a);
    for (const v of [a.ox, a.oy]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('art3 raid map frames', () => {
  it('map_bg is the full 1600 x 900 map anchored top-left', () => {
    const a = by.get('map_bg')!;
    expect([a.w, a.h, a.ox, a.oy]).toEqual([MAP3_W, MAP3_H, 0, 0]);
    expect([MAP3_W, MAP3_H]).toEqual([1600, 900]);
  });

  it('pins and the closed overlay are ~150 x 130, anchored bottom-centre', () => {
    for (const k of ['map_home', ...RIVALS.map((r) => `map_joint_${r}`), 'map_closed']) {
      const a = by.get(k)!;
      expect([a.ox, a.oy], k).toEqual([0.5, 1]);
      expect(a.w, k).toBeGreaterThanOrEqual(140);
      expect(a.w, k).toBeLessThanOrEqual(160);
      expect(a.h, k).toBeGreaterThanOrEqual(120);
      expect(a.h, k).toBeLessThanOrEqual(140);
    }
    const s = by.get('map_steal')!;
    expect([s.w, s.h, s.ox, s.oy]).toEqual([48, 48, 0.5, 1]);
  });

  it('wall signs: 100 wide, about 120 tall, anchored at the left end of the lower edge', () => {
    expect(RSIGN_META).toEqual({ run: 96, drop: 60 });
    for (const r of RIVALS) {
      const a = by.get(`rsign_${r}`)!;
      expect(a.w, a.key).toBe(100);
      expect(a.h, a.key).toBeGreaterThanOrEqual(110);
      expect(a.h, a.key).toBeLessThanOrEqual(130);
      // the span (run x drop) plus ~44 of sign height must fit right of / below / above the anchor
      expect(a.w - a.ox * a.w, a.key).toBeGreaterThanOrEqual(RSIGN_META.run);
      expect(a.h - a.oy * a.h, a.key).toBeGreaterThanOrEqual(RSIGN_META.drop);
      expect(a.oy * a.h, a.key).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('MAP3_LAYOUT', () => {
  const spots = Object.entries(MAP3_LAYOUT);
  it('has home, the five rivals and the boss', () => {
    expect(Object.keys(MAP3_LAYOUT).sort()).toEqual(['home', ...RIVALS].sort());
  });

  it('keeps every pin inside the map, 60 px from the edges, with label room above', () => {
    for (const [k, p] of spots) {
      expect(p.x, k).toBeGreaterThanOrEqual(60);
      expect(p.x, k).toBeLessThanOrEqual(MAP3_W - 60);
      expect(p.y, k).toBeLessThanOrEqual(MAP3_H - 60);
      // pin (130 tall) + a label above it stays on the map
      expect(p.y - 130 - 30, k).toBeGreaterThanOrEqual(60);
      // pin image (150 wide) stays on the map
      expect(p.x - 75, k).toBeGreaterThanOrEqual(0);
      expect(p.x + 75, k).toBeLessThanOrEqual(MAP3_W);
    }
  });

  it('pins are at least 140 px apart', () => {
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) {
        const [ka, a] = spots[i];
        const [kb, b] = spots[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${ka}-${kb}`).toBeGreaterThanOrEqual(140);
      }
  });

  it('home is the left-most spot and the boss the right-most', () => {
    const xs = spots.map(([, p]) => p.x);
    expect(MAP3_LAYOUT.home.x).toBe(Math.min(...xs));
    expect(MAP3_LAYOUT.boss.x).toBe(Math.max(...xs));
  });
});
