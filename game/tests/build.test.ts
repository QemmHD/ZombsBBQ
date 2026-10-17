import { describe, expect, it } from 'vitest';
import {
  DOOR_X,
  EXPANSIONS,
  ITEMS,
  ITEM_BY_ID,
  buyAndPlace,
  buyCheck,
  buyWall,
  canPlace,
  createInitialState,
  expand,
  grimeCount,
  moveFurniture,
  nextExpansion,
  paintAll,
  paintFloor,
  paintWall,
  placeFromStorage,
  ratingBonus,
  TUNING,
  decorBonus,
  shownRating,
  rotateFurniture,
  sellFurniture,
  sellValue,
  storeFurniture,
  validSeats,
  wallSlotFree,
  type GameState,
} from '../src/sim';

const rich = (seed = 1) => {
  const s = createInitialState(seed);
  s.cash = 1_000_000;
  s.sauce = 500;
  s.level = 20;
  return s;
};
const at = (s: GameState, item: string) => s.furniture.find((f) => f.item === item)!;

describe('the catalog matches the original rules', () => {
  it('every item fills one tile; tables seat one with a separate chair; chairs turn four ways', () => {
    for (const d of ITEMS) expect(['none', 'two', 'four']).toContain(d.facing);
    expect(ITEMS.filter((d) => d.kind === 'chair').every((d) => d.facing === 'four')).toBe(true);
    expect(ITEMS.filter((d) => d.kind === 'table').every((d) => d.facing === 'none')).toBe(true);
    expect(ITEMS.filter((d) => d.kind === 'table').length).toBeGreaterThanOrEqual(10); // 6 plain tints + 4 styles
  });

  it('expansions follow the original ladder: 8x7 for $3,500 up to 15x14', () => {
    expect(EXPANSIONS[0]).toMatchObject({ w: 8, h: 7, cash: 3500 });
    expect(EXPANSIONS.at(-1)).toMatchObject({ w: 15, h: 14 });
  });

  it('the starter junk cannot be bought, and sells for $25', () => {
    const s = rich();
    expect(buyCheck(s, 'stove_dirty')).toMatch(/old café/);
    expect(sellValue(ITEM_BY_ID.sink_dirty).cash).toBe(25);
  });
});

describe('placing furniture', () => {
  it('a table plus a chair facing it makes a seat; chairs facing away do not', () => {
    const s = rich();
    const seats0 = validSeats(s).length;
    expect(buyAndPlace(s, 'table_plain_sage', 3, 1)).toBeNull();
    expect(buyAndPlace(s, 'chair_plain_sage', 3, 2, 'ne')).toBeNull(); // faces -y, toward the table
    expect(validSeats(s).length).toBe(seats0 + 1);
    const chair = s.furniture.at(-1)!;
    expect(rotateFurniture(s, chair.id)).toBeNull(); // now facing away
    expect(validSeats(s).length).toBe(seats0);
  });

  it('keeps the door clear and the café workable', () => {
    const s = rich();
    expect(canPlace(s, 'plant_potted', DOOR_X, 0)).toMatch(/door/);
    expect(canPlace(s, 'plant_potted', 9, 9)).toMatch(/inside/);
    // the stove's front stays free (the cook stands behind it when there's room, else in front)
    expect(canPlace(s, 'plant_potted', 1, 2)).toMatch(/cook needs room/);
    // nothing can wall off the sink (at 0,5 on the back-left wall)
    expect(canPlace(s, 'plant_potted', 0, 4)).toBeNull();
    s.furniture.push({ id: 'blk1', item: 'plant_potted', x: 0, y: 4 });
    expect(canPlace(s, 'plant_potted', 1, 5)).toMatch(/sink/i);
  });

  it('outdoor items only go on the front lawn', () => {
    const s = rich();
    expect(canPlace(s, 'tombstone_str', 3, 3)).toMatch(/lawn/);
    expect(canPlace(s, 'tombstone_str', 8, 2)).toBeNull();
    expect(buyAndPlace(s, 'pethouse_pug', 2, 7)).toBeNull();
  });

  it('move, store, place back, sell; buying gives XP', () => {
    const s = rich();
    const xp0 = s.xp + s.level * 1e6;
    expect(buyAndPlace(s, 'plant_tree', 6, 2)).toBeNull();
    expect(s.xp + s.level * 1e6).toBeGreaterThan(xp0);
    const tree = at(s, 'plant_tree');
    expect(moveFurniture(s, tree.id, 6, 3)).toBeNull();
    expect([tree.x, tree.y]).toEqual([6, 3]);
    expect(storeFurniture(s, tree.id)).toBeNull();
    expect(s.storage.plant_tree).toBe(1);
    expect(placeFromStorage(s, 'plant_tree', 6, 2)).toBeNull();
    const cash = s.cash;
    expect(sellFurniture(s, at(s, 'plant_tree').id)).toBeNull();
    expect(s.cash).toBe(cash + 250);
  });

  it('you always keep at least one stove and one counter', () => {
    const s = rich();
    expect(sellFurniture(s, at(s, 'stove_dirty').id)).toMatch(/stove/);
    expect(sellFurniture(s, at(s, 'counter_plain').id)).toMatch(/counter/);
  });
});

describe('walls, floors and grime', () => {
  it('walls and floors are bought one segment / tile at a time; grime counts against the rating', () => {
    const s = rich();
    const b0 = ratingBonus(s);
    expect(b0).toBeLessThan(0); // stains, loose tiles, grimy kit and dirty walls
    expect(grimeCount(s)).toBe(5);
    expect(paintFloor(s, 1, 5, 'tile')).toBeNull(); // a stained tile
    expect(grimeCount(s)).toBe(4);
    expect(s.stats.floorsFixed).toBe(1);
    expect(ratingBonus(s)).toBeGreaterThan(b0);
    expect(paintWall(s, 'l', 0, 'brick')).toBeNull();
    expect(s.walls.l[0]).toBe('brick');
    const cash = s.cash;
    const { done } = paintAll(s, 'floors', 'checker');
    expect(done).toBe(42);
    expect(s.cash).toBe(cash - 42 * 40);
    expect(grimeCount(s)).toBe(0);
  });

  it('star items add to the rating customers see, up to +0.20 (original furniture bonus)', () => {
    const s = rich();
    const r0 = shownRating(s);
    expect(buyWall(s, 'neon_pig', 'r', 1)).toBeNull();
    expect(shownRating(s)).toBeGreaterThan(r0);
    expect(shownRating(s) - s.rating).toBeCloseTo(decorBonus(s), 9);
    // however much decor, it's worth at most +0.20
    for (let i = 0; i < 40; i++) s.furniture.push({ id: `gold${i}`, item: 'gold_record', x: -50 - i, y: -50 });
    expect(decorBonus(s)).toBe(TUNING.ratingDecorMax);
  });

  it('wall items need a free slot, and never go on the door', () => {
    const s = rich();
    expect(wallSlotFree(s, 'r', DOOR_X)).toMatch(/door/);
    expect(wallSlotFree(s, 'l', 3)).toMatch(/already/); // the boarded window
    expect(wallSlotFree(s, 'l', 9)).toMatch(/Off/);
  });
});

describe('expansions', () => {
  it('grow the room toward the front lawn, extending the walls', () => {
    const s = rich();
    expect(nextExpansion(s)).toMatchObject({ w: 8, h: 7 });
    expect(expand(s)).toBeNull();
    expect([s.roomW, s.roomH]).toEqual([8, 7]);
    expect(s.walls.r).toHaveLength(8);
    expect(s.walls.l).toHaveLength(7);
    while (nextExpansion(s)) expect(expand(s)).toBeNull();
    expect([s.roomW, s.roomH]).toEqual([15, 14]);
    expect(expand(s)).toMatch(/big/);
  });
});
