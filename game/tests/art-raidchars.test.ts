import { describe, expect, it } from 'vitest';
import { RAID_CHAR_IDS, buildRaidChar } from '../src/art/raidchars';
import { RAID_CHAR_IDS as MANIFEST_IDS, RIVAL_IDS } from '../src/art/manifest';
import type { CharArt, CharPart } from '../src/art/types';

const BIPED_ORDER = ['armR', 'legR', 'legL', 'torso', 'head', 'armL'];
const BIPED_BACK_ORDER = ['armL', 'legL', 'legR', 'torso', 'head', 'armR'];
const QUAD_ORDER = ['legBR', 'legFR', 'body', 'tail', 'legBL', 'legFL', 'head'];
const QUADS = ['guard_dog', 'pet_pug', 'pet_rotweiler'];

const cache = new Map<string, CharArt>();
const build = (id: string): CharArt => {
  if (!cache.has(id)) cache.set(id, buildRaidChar(id));
  return cache.get(id)!;
};

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
  expect(svg).toMatch(new RegExp(`width="${w}"`));
  expect(svg).toMatch(new RegExp(`height="${h}"`));
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  // every referenced id is defined in the same document
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, `${key} defines #${m[1]}`).toContain(`id="${m[1]}"`);
  // ids are unique inside the document
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} unique ids`).toBe(ids.length);
  // well-formed nesting: every open tag is closed in order, attributes are quoted
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z:-]+="[^"]*")*)\s*(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (close) expect(stack.pop(), `${key} closes <${name}>`).toBe(name);
    else if (!self) stack.push(name);
  }
  expect(stack, `${key} unclosed tags`).toEqual([]);
  expect(svg.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z:-]+="[^"]*")*)\s*(\/?)>/g, ''), `${key} no stray markup`).not.toMatch(/[<>]/);
}

function checkPart(p: CharPart): void {
  checkSvg(p.key, p.svg, p.w, p.h);
  for (const v of [p.px, p.py, p.x, p.y]) expect(Number.isFinite(v)).toBe(true);
  expect(p.px).toBeGreaterThanOrEqual(0);
  expect(p.px).toBeLessThanOrEqual(p.w);
  expect(p.py).toBeGreaterThanOrEqual(0);
  expect(p.py).toBeLessThanOrEqual(p.h);
  expect(p.y, `${p.key} pivot above the ground`).toBeLessThan(0);
}

const names = (id: string, parts: CharPart[], prefix = `char_${id}_`) => parts.map((p) => p.key.replace(prefix, ''));

describe('raid characters', () => {
  it('re-exports the manifest id list (bosses, staff per rival, summons, pets, guard dog)', () => {
    expect(RAID_CHAR_IDS).toEqual(MANIFEST_IDS);
    for (const r of RIVAL_IDS) {
      expect(RAID_CHAR_IDS).toContain(`boss_${r}`);
      expect(RAID_CHAR_IDS).toContain(`staff_${r}`);
    }
    expect(() => buildRaidChar('nope')).toThrow();
  });

  it.each(RAID_CHAR_IDS)('%s builds with the right rig and well-formed parts', (id) => {
    const c = build(id);
    expect(c.id).toBe(id);
    const quad = QUADS.includes(id);
    expect(c.rig).toBe(quad ? 'quad' : 'biped');
    expect(names(id, c.parts)).toEqual(quad ? QUAD_ORDER : BIPED_ORDER);
    for (const p of c.parts) checkPart(p);
    if (quad) {
      expect(c.backParts).toBeUndefined();
    } else {
      expect(c.backParts).toBeDefined();
      expect(names(id, c.backParts!, `char_${id}_back_`)).toEqual(BIPED_BACK_ORDER);
      // the back view uses exactly the same pivots as the front view
      for (const b of c.backParts!) {
        checkPart(b);
        const f = c.parts.find((p) => p.key === b.key.replace('_back_', '_'))!;
        expect([b.x, b.y]).toEqual([f.x, f.y]);
      }
    }
  });

  it.each(RAID_CHAR_IDS)('%s faces are placed exactly like the head', (id) => {
    const c = build(id);
    const head = c.parts.find((p) => p.key === `char_${id}_head`)!;
    const want = id.startsWith('boss_') || id.startsWith('staff_')
      ? ['scream', 'shock', 'happy', 'dazed']
      : id === 'bigfoot' || id === 'werewoof'
        ? ['chomp', 'sleep', 'dazed']
        : id === 'guard_dog'
          ? ['chomp', 'dazed']
          : ['chomp', 'dazed', 'happy'];
    expect(Object.keys(c.faces ?? {}).sort()).toEqual([...want].sort());
    for (const [n, f] of Object.entries(c.faces!)) {
      expect(f!.key).toBe(`char_${id}_face_${n}`);
      checkPart(f!);
      for (const k of ['x', 'y', 'px', 'py', 'w', 'h'] as const) expect(f![k], `${id} face ${n} ${k}`).toBe(head[k]);
      expect(f!.svg).not.toBe(head.svg);
    }
  });

  it('uses unique keys across every part, back part and face', () => {
    const keys: string[] = [];
    for (const id of RAID_CHAR_IDS) {
      const c = build(id);
      keys.push(...c.parts.map((p) => p.key), ...(c.backParts ?? []).map((p) => p.key), ...Object.values(c.faces ?? {}).map((p) => p!.key));
    }
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^char_[a-z_]+_(back_|face_)?[a-zA-Z]+$/);
  });

  it('keeps the biped rig consistent (hips below shoulders below neck; L = screen-left)', () => {
    for (const id of RAID_CHAR_IDS.filter((i) => !QUADS.includes(i))) {
      const c = build(id);
      const by = (n: string) => c.parts.find((p) => p.key === `char_${id}_${n}`)!;
      expect(by('legL').x).toBeLessThan(0);
      expect(by('legR').x).toBeGreaterThan(0);
      expect(by('armL').x).toBeLessThan(0);
      expect(by('armR').x).toBeGreaterThan(0);
      expect(by('armL').y).toBeLessThan(by('legL').y);
      expect(by('head').y).toBeLessThan(by('armL').y);
      expect(by('torso').y).toBeGreaterThan(by('armL').y);
    }
  });

  it('keeps the quad rig consistent (far legs up-right of near legs, head in front)', () => {
    for (const id of QUADS) {
      const c = build(id);
      const by = (n: string) => c.parts.find((p) => p.key === `char_${id}_${n}`)!;
      expect(by('legBR').x).toBeGreaterThan(by('legBL').x);
      expect(by('legBR').y).toBeLessThan(by('legBL').y);
      expect(by('legFL').x).toBeGreaterThan(by('legBL').x);
      expect(by('head').x).toBeGreaterThan(by('body').x);
      expect(by('tail').x).toBeLessThan(by('body').x);
    }
  });

  it('has sensible heights (real top of each character)', () => {
    const h = (id: string) => build(id).height;
    for (const r of RIVAL_IDS) {
      expect(h(`boss_${r}`)).toBeGreaterThan(88);
      expect(h(`boss_${r}`)).toBeLessThan(130);
      expect(h(`staff_${r}`)).toBeGreaterThan(74);
      expect(h(`staff_${r}`)).toBeLessThan(92);
    }
    expect(h('bigfoot')).toBeGreaterThan(120);
    expect(h('werewoof')).toBeGreaterThan(80);
    expect(h('pet_pug')).toBeLessThan(h('pet_rotweiler'));
    expect(h('guard_dog')).toBeGreaterThan(38);
  });
});
