import { describe, expect, it } from 'vitest';
import {
  ITEMS,
  WALL_FINISHES,
  FLOOR_FINISHES,
  buyAndPlace,
  buyKeepWarm,
  buyWall,
  createInitialState,
  expand,
  layoutVersion,
  moveFurniture,
  moveWall,
  paintFloor,
  paintWall,
  rotateFurniture,
  sellFurniture,
  sellWall,
  storeFurniture,
  type GameState,
} from '../src/sim';

/** The string signature the café scene used to build every frame: the version must track it exactly. */
const oldSig = (s: GameState) =>
  [
    s.roomW,
    s.roomH,
    s.walls.l.join(','),
    s.walls.r.join(','),
    Object.entries(s.floors)
      .map(([k, v]) => `${k}${v}`)
      .join(';'),
    s.furniture.map((f) => `${f.id}${f.x},${f.y}${f.dir ?? ''}${f.keepWarm ? 'k' : ''}`).join(';'),
    s.wallItems.map((w) => `${w.id}${w.wall}${w.index}`).join(';'),
  ].join('|');

const rich = (seed = 1) => {
  const s = createInitialState(seed);
  s.cash = 1e9;
  s.sauce = 1e6;
  s.level = 40;
  return s;
};

describe('layoutVersion', () => {
  it('is stable while nothing changes, and identical for identical layouts', () => {
    const a = rich(3);
    const b = rich(3);
    expect(layoutVersion(a)).toBe(layoutVersion(a));
    expect(layoutVersion(a)).toBe(layoutVersion(b));
    a.cash = 5; // not part of the layout
    a.now += 100;
    expect(layoutVersion(a)).toBe(layoutVersion(b));
  });

  it('changes whenever the drawn layout does (random decorating, 3000 actions)', () => {
    const s = rich(7);
    let seed = 12345;
    const rnd = (n: number) => {
      seed = (seed * 16807) % 2147483647;
      return seed % n;
    };
    const floorItems = ITEMS.filter((i) => i.kind !== 'wall');
    const wallItems = ITEMS.filter((i) => i.kind === 'wall');
    let changes = 0;
    for (let step = 0; step < 3000; step++) {
      const sig0 = oldSig(s);
      const v0 = layoutVersion(s);
      const f = s.furniture[rnd(Math.max(1, s.furniture.length))];
      const w = s.wallItems[rnd(Math.max(1, s.wallItems.length))];
      switch (rnd(11)) {
        case 0:
          buyAndPlace(s, floorItems[rnd(floorItems.length)].id, rnd(s.roomW + 3), rnd(s.roomH + 3), (['sw', 'se', 'ne', 'nw'] as const)[rnd(4)]);
          break;
        case 1:
          if (f) moveFurniture(s, f.id, rnd(s.roomW), rnd(s.roomH));
          break;
        case 2:
          if (f) rotateFurniture(s, f.id);
          break;
        case 3:
          if (f) sellFurniture(s, f.id);
          break;
        case 4:
          if (f) storeFurniture(s, f.id);
          break;
        case 5:
          buyWall(s, wallItems[rnd(wallItems.length)].id, rnd(2) ? 'l' : 'r', rnd(Math.max(s.roomW, s.roomH)));
          break;
        case 6:
          if (w) moveWall(s, w.id, rnd(2) ? 'l' : 'r', rnd(Math.max(s.roomW, s.roomH)));
          break;
        case 7:
          if (w) sellWall(s, w.id);
          break;
        case 8:
          paintWall(s, rnd(2) ? 'l' : 'r', rnd(Math.max(s.roomW, s.roomH)), WALL_FINISHES[rnd(WALL_FINISHES.length)].id);
          break;
        case 9:
          paintFloor(s, rnd(s.roomW), rnd(s.roomH), FLOOR_FINISHES[rnd(FLOOR_FINISHES.length)].id);
          break;
        default:
          if (rnd(40) === 0) expand(s);
          else if (s.stoves[0]) buyKeepWarm(s, s.stoves[rnd(s.stoves.length)].id);
      }
      const changed = oldSig(s) !== sig0;
      if (changed) changes++;
      // any change to what's drawn must give a new version (the reverse can happen: the version also
      // covers which item sits where, which the old signature left out)
      if (changed) expect(layoutVersion(s)).not.toBe(v0);
    }
    expect(changes).toBeGreaterThan(300);
  });
});
