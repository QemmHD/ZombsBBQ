import { describe, expect, it } from 'vitest';
import {
  buildChar3,
  CHAR3_BASE_IDS,
  CHAR3_IDS,
  PART_ORDER3,
  BACK_PART_ORDER3,
  HUMAN_FACES3,
  ZOMBIE_FACES3,
} from '../src/art3/chars';
import { CUSTOMER_IDS } from '../src/art/manifest';
import type { CharArt, CharPart } from '../src/art/types';

const isZombie = (id: string) => id.endsWith('_z') || id === 'gus';
const lastSeg = (k: string) => k.split('_').pop()!;
const built = new Map<string, CharArt>(CHAR3_IDS.map((id) => [id, buildChar3(id)!]));

function checkSvg(p: CharPart): void {
  const { key, svg, w, h } = p;
  expect(Number.isFinite(w) && w > 0, `${key} w`).toBe(true);
  expect(Number.isFinite(h) && h > 0, `${key} h`).toBe(true);
  expect(svg.startsWith('<svg'), `${key} starts with <svg`).toBe(true);
  expect(svg.endsWith('</svg>'), `${key} ends with </svg>`).toBe(true);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  const vb = /viewBox="([^"]+)"/.exec(svg);
  expect(vb, `${key} viewBox`).not.toBeNull();
  const [x, y, vw, vh] = vb![1].split(/[\s,]+/).map(Number);
  expect([x, y]).toEqual([0, 0]);
  expect(vw).toBeCloseTo(w, 5);
  expect(vh).toBeCloseTo(h, 5);
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  // balanced tags: every opened element is closed
  const opens = (svg.match(/<(?!\/)[a-zA-Z][^>]*[^/]>/g) ?? []).length;
  const closes = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
  expect(opens, `${key} balanced tags`).toBe(closes);
  // every referenced id is defined, and ids are unique within the document
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, `${key} defines #${m[1]}`).toContain(`id="${m[1]}"`);
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} unique ids`).toBe(ids.length);
  for (const v of [p.px, p.py, p.x, p.y]) expect(Number.isFinite(v), `${key} pivot finite`).toBe(true);
  expect(p.px).toBeGreaterThanOrEqual(0);
  expect(p.px).toBeLessThanOrEqual(w);
  expect(p.py).toBeGreaterThanOrEqual(0);
  expect(p.py).toBeLessThanOrEqual(h);
}

describe('art v3 joint characters (C1)', () => {
  it('lists the 20 customers + 4 walk-ins, each with a zombie form, plus you and gus', () => {
    expect([...CHAR3_BASE_IDS]).toEqual([...CUSTOMER_IDS, 'joe', 'jane', 'senior', 'hipster']);
    expect(CHAR3_IDS.length).toBe(50);
    expect(new Set(CHAR3_IDS).size).toBe(50);
    for (const b of CHAR3_BASE_IDS) {
      expect(CHAR3_IDS).toContain(b);
      expect(CHAR3_IDS).toContain(`${b}_z`);
    }
    expect(CHAR3_IDS).toContain('you');
    expect(CHAR3_IDS).toContain('gus');
  });

  it('returns null for unknown ids', () => {
    expect(buildChar3('nobody')).toBeNull();
    expect(buildChar3('you_z')).toBeNull();
  });

  it.each(CHAR3_IDS)('%s builds a full biped (front, back)', (id) => {
    const c = built.get(id)!;
    expect(c).toBeTruthy();
    expect(c.id).toBe(id);
    expect(c.rig ?? 'biped').toBe('biped');
    expect(c.height).toBeGreaterThan(70);
    expect(c.height).toBeLessThan(135);
    expect(c.parts.map((p) => lastSeg(p.key))).toEqual(PART_ORDER3);
    for (const p of c.parts) expect(p.key).toBe(`char_${id}_${lastSeg(p.key)}`);
    expect(c.backParts).toBeDefined();
    expect(c.backParts!.map((p) => lastSeg(p.key))).toEqual(BACK_PART_ORDER3);
    for (const b of c.backParts!) {
      const name = lastSeg(b.key);
      expect(b.key).toBe(`char_${id}_back_${name}`);
      const f = c.parts.find((p) => lastSeg(p.key) === name)!;
      expect(b.x).toBeCloseTo(f.x, 6);
      expect(b.y).toBeCloseTo(f.y, 6);
    }
    for (const p of [...c.parts, ...c.backParts!]) {
      checkSvg(p);
      expect(p.y).toBeLessThan(0);
    }
  });

  it.each(CHAR3_IDS)('%s has its expression faces placed exactly like the head', (id) => {
    const c = built.get(id)!;
    const head = c.parts.find((p) => lastSeg(p.key) === 'head')!;
    const want = isZombie(id) ? ZOMBIE_FACES3 : HUMAN_FACES3;
    expect(Object.keys(c.faces ?? {}).sort()).toEqual([...want].sort());
    for (const name of want) {
      const fp = c.faces![name]!;
      expect(fp.key).toBe(`char_${id}_face_${name}`);
      checkSvg(fp);
      expect([fp.w, fp.h, fp.px, fp.py, fp.x, fp.y]).toEqual([head.w, head.h, head.px, head.py, head.x, head.y]);
      expect(fp.svg).not.toBe(head.svg);
    }
  });

  it('humans have scream/happy/shock/angry/eat; zombies and gus have chomp/sleep/dazed', () => {
    expect([...HUMAN_FACES3].sort()).toEqual(['angry', 'eat', 'happy', 'scream', 'shock']);
    expect([...ZOMBIE_FACES3].sort()).toEqual(['chomp', 'dazed', 'sleep']);
    expect(Object.keys(built.get('you')!.faces!).sort()).toEqual([...HUMAN_FACES3].sort());
    expect(Object.keys(built.get('gus')!.faces!).sort()).toEqual([...ZOMBIE_FACES3].sort());
  });

  it('uses unique keys across every character, view and face', () => {
    const keys: string[] = [];
    for (const c of built.values()) {
      keys.push(...c.parts.map((p) => p.key), ...c.backParts!.map((p) => p.key), ...Object.values(c.faces ?? {}).map((p) => p!.key));
    }
    expect(new Set(keys).size).toBe(keys.length);
    const humans = CHAR3_IDS.filter((i) => !isZombie(i)).length;
    expect(keys.length).toBe(CHAR3_IDS.length * 12 + humans * HUMAN_FACES3.length + (CHAR3_IDS.length - humans) * ZOMBIE_FACES3.length);
  });

  it('keeps the rig proportions (hips below shoulders below neck, L on the left, big heads)', () => {
    for (const c of built.values()) {
      const by = (n: string): CharPart => c.parts.find((p) => lastSeg(p.key) === n)!;
      expect(by('legL').y).toBeGreaterThan(by('armL').y);
      expect(by('head').y).toBeLessThan(by('armL').y);
      expect(by('armL').x).toBeLessThan(0);
      expect(by('armR').x).toBeGreaterThan(0);
      expect(by('legL').x).toBeLessThan(by('legR').x);
      // neck at roughly 52-58% of the height: the head is ~45% of the figure
      const neckFrac = -by('head').y / c.height;
      expect(neckFrac, c.id).toBeGreaterThan(0.4);
      expect(neckFrac, c.id).toBeLessThan(0.62);
    }
  });

  it('gives the odd body types their sizes', () => {
    const h = (id: string) => built.get(id)!.height;
    expect(h('grandma')).toBeLessThan(h('accountant'));
    expect(h('teen')).toBeLessThan(h('accountant'));
    expect(h('sumo')).toBeGreaterThan(h('accountant'));
    const shoulder = (id: string) => built.get(id)!.parts.find((p) => p.key.endsWith('_armR'))!.x;
    expect(shoulder('sumo')).toBeGreaterThan(shoulder('accountant'));
    expect(shoulder('champ')).toBeGreaterThan(shoulder('accountant'));
    expect(shoulder('boxer')).toBeGreaterThan(shoulder('accountant'));
  });

  it('builds deterministically', () => {
    expect(buildChar3('critic_z')!.parts[3].svg).toBe(built.get('critic_z')!.parts[3].svg);
    expect(buildChar3('gus')!.faces!.chomp!.svg).toBe(built.get('gus')!.faces!.chomp!.svg);
  });
});
