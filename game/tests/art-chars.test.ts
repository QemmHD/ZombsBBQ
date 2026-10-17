import { describe, expect, it } from 'vitest';
import { buildChar, CHAR_IDS, HUMAN_IDS, BACK_PART_ORDER, PART_ORDER } from '../src/art/chars';
import type { CharId } from '../src/art/chars';
import { V2_CUSTOMER_IDS, HUMAN_FACES, JOINT_CHAR_IDS, ZOMBIE_FACES } from '../src/art/manifest';
import type { CharPart } from '../src/art/types';

const BIPED = ['armL', 'armR', 'head', 'legL', 'legR', 'torso'];
const isZombie = (id: string) => id.endsWith('_z') || id === 'gus';
const built = new Map(JOINT_CHAR_IDS.map((id) => [id, buildChar(id as CharId)]));
const lastSeg = (k: string) => k.split('_').pop()!;

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
  // balanced tags (cheap well-formedness check: every opened element is closed)
  const opens = (svg.match(/<(?!\/)[a-zA-Z][^>]*[^/]>/g) ?? []).length;
  const closes = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
  expect(opens, `${key} balanced tags`).toBe(closes);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, `${key} defines #${m[1]}`).toContain(`id="${m[1]}"`);
  for (const v of [p.px, p.py, p.x, p.y]) expect(Number.isFinite(v), `${key} pivot finite`).toBe(true);
  expect(p.px).toBeGreaterThanOrEqual(0);
  expect(p.px).toBeLessThanOrEqual(w);
  expect(p.py).toBeGreaterThanOrEqual(0);
  expect(p.py).toBeLessThanOrEqual(h);
}

describe('joint characters', () => {
  it('CHAR_IDS covers exactly JOINT_CHAR_IDS', () => {
    expect([...CHAR_IDS].sort()).toEqual([...JOINT_CHAR_IDS].sort());
    expect(new Set(CHAR_IDS).size).toBe(CHAR_IDS.length);
  });

  it('exports all 20 customers as HUMAN_IDS', () => {
    expect([...HUMAN_IDS]).toEqual([...V2_CUSTOMER_IDS]);
    expect(HUMAN_IDS.length).toBe(20);
  });

  it.each(JOINT_CHAR_IDS)('%s builds a full biped (front, back, faces)', (id) => {
    const c = built.get(id)!;
    expect(c.id).toBe(id);
    expect(c.rig ?? 'biped').toBe('biped');
    expect(c.height).toBeGreaterThan(60);
    expect(c.height).toBeLessThan(110);
    // front parts
    expect(c.parts.map((p) => lastSeg(p.key))).toEqual(PART_ORDER);
    expect(c.parts.map((p) => lastSeg(p.key)).sort()).toEqual(BIPED);
    for (const p of c.parts) expect(p.key).toBe(`char_${id}_${lastSeg(p.key)}`);
    // back parts: same names, same pivots
    expect(c.backParts).toBeDefined();
    expect(c.backParts!.map((p) => lastSeg(p.key))).toEqual(BACK_PART_ORDER);
    expect(c.backParts!.map((p) => lastSeg(p.key)).sort()).toEqual(BIPED);
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

  it.each(JOINT_CHAR_IDS)('%s has its expression faces placed exactly like the head', (id) => {
    const c = built.get(id)!;
    const head = c.parts.find((p) => lastSeg(p.key) === 'head')!;
    const want = isZombie(id) ? ZOMBIE_FACES : HUMAN_FACES;
    expect(Object.keys(c.faces ?? {}).sort()).toEqual([...want].sort());
    for (const name of want) {
      const fp = c.faces![name]!;
      expect(fp.key).toBe(`char_${id}_face_${name}`);
      checkSvg(fp);
      expect([fp.w, fp.h, fp.px, fp.py, fp.x, fp.y]).toEqual([head.w, head.h, head.px, head.py, head.x, head.y]);
      expect(fp.svg).not.toBe(head.svg);
    }
  });

  it('uses unique keys across every character, view and face', () => {
    const keys: string[] = [];
    for (const c of built.values()) {
      keys.push(...c.parts.map((p) => p.key), ...c.backParts!.map((p) => p.key), ...Object.values(c.faces ?? {}).map((p) => p!.key));
    }
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(JOINT_CHAR_IDS.length * 15);
  });

  it('keeps the rig proportions (hips below shoulders below neck, L on the left)', () => {
    for (const c of built.values()) {
      const by = (n: string): CharPart => c.parts.find((p) => lastSeg(p.key) === n)!;
      expect(by('legL').y).toBeGreaterThan(by('armL').y);
      expect(by('head').y).toBeLessThan(by('armL').y);
      expect(by('armL').x).toBeLessThan(0);
      expect(by('armR').x).toBeGreaterThan(0);
      expect(by('legL').x).toBeLessThan(by('legR').x);
    }
  });

  it('gives the odd body types their sizes', () => {
    const h = (id: string) => built.get(id)!.height;
    expect(h('grandma')).toBeLessThan(h('accountant'));
    expect(h('sumo')).toBeGreaterThanOrEqual(84);
    const shoulder = (id: string) => built.get(id)!.parts.find((p) => p.key.endsWith('_armR'))!.x;
    expect(shoulder('sumo')).toBeGreaterThan(shoulder('accountant'));
    expect(shoulder('champ')).toBeGreaterThan(shoulder('accountant'));
  });

  it('builds deterministically', () => {
    expect(buildChar('critic_z').parts[3].svg).toBe(built.get('critic_z')!.parts[3].svg);
  });
});
