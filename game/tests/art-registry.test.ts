import { describe, expect, it } from 'vitest';
import { ART_GROUPS, ArtRegistry } from '../src/scenes/artreg';
import { PET_IDS, buildPet } from '../src/art3/chars/pets';
import type { ArtAsset } from '../src/art/types';

const built = new Map<string, ArtAsset[]>(ART_GROUPS.map((g) => [g.name, g.build()]));

describe('the lazy art registry', () => {
  it("every group's keys match the prefixes it declares (so a lookup finds its group)", () => {
    for (const g of ART_GROUPS) {
      const stray = built.get(g.name)!.filter((a) => !g.keys.test(a.key)).map((a) => a.key);
      expect(stray, `${g.name}: add these prefixes to its pattern in src/scenes/artreg.ts`).toEqual([]);
    }
  });

  it('builds only the groups a lookup needs', () => {
    const r = new ArtRegistry();
    expect(r.builtGroups()).toEqual([]);
    expect(r.world3('grass_1')).toBeTruthy();
    expect(r.builtGroups()).toEqual(['ground']);
    expect(r.world3('map_bg')).toBeTruthy();
    expect(r.builtGroups()).toEqual(['ground', 'raidmap']);
  });

  it("an unknown prefix builds everything except the raid map (and finds nothing)", () => {
    const r = new ArtRegistry();
    expect(r.world3('no_such_thing_anywhere')).toBeUndefined();
    expect(r.builtGroups()).not.toContain('raidmap');
    expect(r.builtGroups().length).toBe(ART_GROUPS.length - 1);
  });

  it('resolves the same art as building everything up front (later groups win a shared key)', () => {
    const eager = new Map<string, ArtAsset>();
    const eagerUi = new Map<string, ArtAsset>();
    for (const g of ART_GROUPS) for (const a of built.get(g.name)!) (g.ui ? eagerUi : eager).set(a.key, a);
    // look keys up in a scrambled order so groups get built in a different order than the table
    const keys = [...eager.keys(), ...eagerUi.keys()].sort((a, b) => (a.length * 7919 + a.charCodeAt(0)) % 101 - (b.length * 7919 + b.charCodeAt(0)) % 101);
    const r = new ArtRegistry();
    for (const k of keys) {
      if (eager.has(k)) expect(r.world3(k)?.a.svg, k).toBe(eager.get(k)!.svg);
      expect(r.any(k)?.a.svg, k).toBe((eagerUi.get(k) ?? eager.get(k))!.svg);
    }
  });

  it('forgets a flattened key for good', () => {
    const r = new ArtRegistry();
    expect(r.world3('map_bg')).toBeTruthy();
    r.forget('map_bg');
    expect(r.world3('map_bg')).toBeUndefined();
    expect(r.world3('map_home')).toBeTruthy();
  });

  it('still has the older icons the HUD and raids use', () => {
    const r = new ArtRegistry();
    for (const k of ['keep_warm', 'fx_heal', 'fx_flag', 'fx_headstone', 'fx_summon']) {
      const a = r.any(k)?.a;
      expect(a, k).toBeTruthy();
      expect(a!.svg.startsWith('<svg')).toBe(true);
    }
  });
});

describe('pets (moved from the v2 raid cast)', () => {
  it('are four-legged rigs with faces', () => {
    for (const id of PET_IDS) {
      const a = buildPet(id)!;
      expect(a.rig).toBe('quad');
      expect(a.parts.map((p) => p.key.split('_').pop())).toEqual(['legBR', 'legFR', 'body', 'tail', 'legBL', 'legFL', 'head']);
      expect(Object.keys(a.faces ?? {}).length).toBeGreaterThan(0);
      for (const p of [...a.parts, ...Object.values(a.faces ?? {})]) {
        expect(p!.svg).toMatch(/^<svg[^>]*viewBox/);
        expect(p!.w).toBeGreaterThan(0);
      }
    }
    expect(buildPet('nobody')).toBeNull();
  });
});
