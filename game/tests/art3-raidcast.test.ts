import { describe, expect, it } from 'vitest';
import { PART_ORDER3, BACK_PART_ORDER3, buildChar3 } from '../src/art3/chars';
import {
  buildRaidChar3,
  RAID3_IDS,
  RAID3_RIVALS,
  RAID3_STAFF_IDS,
  RAID3_CHEF_IDS,
  RIVAL_FACES3,
  BEAST_FACES3,
} from '../src/art3/chars/raidcast';
import { RIVALS } from '../src/sim/rivals';
import type { CharArt, CharPart } from '../src/art/types';

const lastSeg = (k: string) => k.split('_').pop()!;
const built = new Map<string, CharArt>(RAID3_IDS.map((id) => [id, buildRaidChar3(id)!]));
const isBeast = (id: string) => id === 'bigfoot' || id === 'werewoof';

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
  const opens = (svg.match(/<(?!\/)[a-zA-Z][^>]*[^/]>/g) ?? []).length;
  const closes = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
  expect(opens, `${key} balanced tags`).toBe(closes);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, `${key} defines #${m[1]}`).toContain(`id="${m[1]}"`);
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} unique ids`).toBe(ids.length);
  for (const v of [p.px, p.py, p.x, p.y]) expect(Number.isFinite(v), `${key} pivot finite`).toBe(true);
  expect(p.px).toBeGreaterThanOrEqual(0);
  expect(p.px).toBeLessThanOrEqual(w);
  expect(p.py).toBeGreaterThanOrEqual(0);
  expect(p.py).toBeLessThanOrEqual(h);
}

describe('art v3 raid cast', () => {
  it('covers a waiter, a waitress and a Head Chef for every rival in the sim, plus the monsters', () => {
    expect([...RAID3_RIVALS].sort()).toEqual(RIVALS.map((r) => r.id).sort());
    for (const r of RAID3_RIVALS) for (const id of [`staff_${r}`, `staff_${r}_b`, `boss_${r}`]) expect(RAID3_IDS).toContain(id);
    expect(RAID3_IDS).toContain('bigfoot');
    expect(RAID3_IDS).toContain('werewoof');
    expect(new Set(RAID3_IDS).size).toBe(RAID3_IDS.length);
    expect(RAID3_IDS.length).toBe(32);
  });

  it('returns null for ids it does not cover (quads, the joint cast)', () => {
    expect(buildRaidChar3('nobody')).toBeNull();
    expect(buildRaidChar3('pet_pug')).toBeNull();
    expect(buildRaidChar3('joe')).toBeNull();
    // and the joint cast builder still ignores raid ids
    expect(buildChar3('staff_chuck')).toBeNull();
  });

  it.each(RAID3_IDS)('%s builds a full two-segment biped (front, back)', (id) => {
    const c = built.get(id)!;
    expect(c).toBeTruthy();
    expect(c.id).toBe(id);
    expect(c.rig ?? 'biped').toBe('biped');
    expect(c.parts.map((p) => lastSeg(p.key))).toEqual(PART_ORDER3);
    for (const p of c.parts) expect(p.key).toBe(`char_${id}_${lastSeg(p.key)}`);
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
    const by = (n: string) => c.parts.find((p) => lastSeg(p.key) === n)!;
    for (const [up, lo] of [['armL', 'armL2'], ['armR', 'armR2'], ['legL', 'legL2'], ['legR', 'legR2']]) {
      const u = by(up);
      const l = by(lo);
      expect(l.y, `${id} ${lo} below ${up}`).toBeGreaterThan(u.y + 6);
      expect(Math.abs(l.x - u.x)).toBeLessThan(6);
    }
    expect(by('legL').y).toBeGreaterThan(by('armL').y);
    expect(by('head').y).toBeLessThan(by('armL').y);
    expect(by('armL').x).toBeLessThan(0);
    expect(by('armR').x).toBeGreaterThan(0);
  });

  it.each(RAID3_IDS)('%s has its expression faces placed exactly like the head', (id) => {
    const c = built.get(id)!;
    const head = c.parts.find((p) => lastSeg(p.key) === 'head')!;
    const want = isBeast(id) ? BEAST_FACES3 : RIVAL_FACES3;
    expect(Object.keys(c.faces ?? {}).sort()).toEqual([...want].sort());
    for (const name of want) {
      const fp = c.faces![name]!;
      expect(fp.key).toBe(`char_${id}_face_${name}`);
      checkSvg(fp);
      expect([fp.w, fp.h, fp.px, fp.py, fp.x, fp.y]).toEqual([head.w, head.h, head.px, head.py, head.x, head.y]);
      expect(fp.svg).not.toBe(head.svg);
    }
  });

  it('rival humans get angry/shock/scream/dazed; the monsters chomp/sleep/dazed', () => {
    expect([...RIVAL_FACES3].sort()).toEqual(['angry', 'dazed', 'scream', 'shock']);
    expect([...BEAST_FACES3].sort()).toEqual(['chomp', 'dazed', 'sleep']);
  });

  it('arms every waiter and chef with a weapon in the near forearm', () => {
    for (const id of [...RAID3_STAFF_IDS, ...RAID3_CHEF_IDS]) {
      const c = built.get(id)!;
      const near = c.parts.find((p) => lastSeg(p.key) === 'armL2')!;
      const far = c.parts.find((p) => lastSeg(p.key) === 'armR2')!;
      // the prop widens the forearm part well past a bare hand
      expect(near.w * near.h, id).toBeGreaterThan(far.w * far.h * 1.4);
    }
  });

  it('gives sensible heights: waiters like the joint cast, chefs a head taller (~1.1x), Big Foot-Long ~1.3x', () => {
    const h = (id: string) => built.get(id)!.height;
    const joe = buildChar3('joe')!.height;
    for (const id of RAID3_STAFF_IDS) {
      expect(h(id), id).toBeGreaterThan(joe * 0.9);
      expect(h(id), id).toBeLessThan(joe * 1.3);
    }
    for (const r of RAID3_RIVALS) {
      expect(h(`boss_${r}`), r).toBeGreaterThan(h(`staff_${r}`));
      expect(h(`boss_${r}`), r).toBeGreaterThan(joe * 1.02);
      expect(h(`boss_${r}`), r).toBeLessThan(joe * 1.55); // tall toques count
    }
    expect(h('bigfoot')).toBeGreaterThan(joe * 1.2);
    expect(h('bigfoot')).toBeLessThan(joe * 1.6);
    for (const r of RAID3_RIVALS) expect(h('bigfoot')).toBeGreaterThan(h(`staff_${r}`));
    expect(h('werewoof')).toBeGreaterThan(joe * 0.75);
    expect(h('werewoof')).toBeLessThan(joe * 1.2);
    // chefs are built bigger, not just taller hats
    const shoulder = (id: string) => built.get(id)!.parts.find((p) => p.key.endsWith('_armR'))!.x;
    for (const r of RAID3_RIVALS) expect(shoulder(`boss_${r}`), r).toBeGreaterThan(shoulder(`staff_${r}`));
  });

  it('gives the waiter and waitress of each rival distinct looks', () => {
    for (const r of RAID3_RIVALS) {
      const a = built.get(`staff_${r}`)!;
      const b = built.get(`staff_${r}_b`)!;
      expect(a.parts.find((p) => p.key.endsWith('_head'))!.svg).not.toBe(b.parts.find((p) => p.key.endsWith('_head'))!.svg.replace(`staff_${r}_b`, `staff_${r}`));
      expect(a.parts.find((p) => p.key.endsWith('_torso'))!.w).not.toBe(0);
    }
  });

  it('uses unique keys across every character, view and face', () => {
    const keys: string[] = [];
    for (const c of built.values()) keys.push(...c.parts.map((p) => p.key), ...c.backParts!.map((p) => p.key), ...Object.values(c.faces ?? {}).map((p) => p!.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('builds deterministically', () => {
    expect(buildRaidChar3('boss_chuck')!.parts[9].svg).toBe(built.get('boss_chuck')!.parts[9].svg);
    expect(buildRaidChar3('bigfoot')!.faces!.chomp!.svg).toBe(built.get('bigfoot')!.faces!.chomp!.svg);
    expect(buildRaidChar3('staff_snob_b')!.faces!.dazed!.svg).toBe(built.get('staff_snob_b')!.faces!.dazed!.svg);
  });
});
