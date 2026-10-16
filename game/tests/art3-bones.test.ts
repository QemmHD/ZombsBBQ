import { describe, expect, it } from 'vitest';
import { BONES_H, BONES_KEYS, BONES_W, buildBones } from '../src/art3/bones';

describe('bone piles (left where a customer was eaten)', () => {
  const piles = buildBones();
  it('builds every variant in the shared frame, anchored on the floor point', () => {
    expect(piles.map((a) => a.key)).toEqual([...BONES_KEYS]);
    for (const a of piles) {
      expect([a.w, a.h]).toEqual([BONES_W, BONES_H]);
      expect([a.ox, a.oy]).toEqual([0.5, 0.7]);
      expect(a.svg.startsWith('<svg')).toBe(true);
      expect(a.svg.length).toBeLessThan(60_000);
    }
  });
  it('the variants differ and are deterministic', () => {
    expect(new Set(piles.map((a) => a.svg)).size).toBe(3);
    expect(buildBones().map((a) => a.svg)).toEqual(piles.map((a) => a.svg));
  });
});
