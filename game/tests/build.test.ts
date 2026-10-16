import { describe, expect, it } from 'vitest';
import {
  DOOR_X,
  buyAndPlace,
  buyKeepWarm,
  buyTheme,
  buyWall,
  canPlace,
  createInitialState,
  decorPoints,
  expand,
  furnAt,
  moveFurniture,
  moveWall,
  nextExpansion,
  placeFromStorage,
  rotateFurniture,
  sellFurniture,
  startCooking,
  stars,
  storeFurniture,
  storeWall,
  tick,
  validSeats,
  type GameState,
} from '../src/sim';

const rich = (seed = 3): GameState => {
  const s = createInitialState(seed);
  s.cash = 100000;
  s.sauce = 100;
  s.level = 12;
  return s;
};
const run = (s: GameState, sec: number) => {
  for (let t = 0; t < sec; t += 0.25) tick(s, 0.25);
};

describe('shop placement rules', () => {
  it('buys and places decor, which raises decor points', () => {
    const s = rich();
    const d0 = decorPoints(s);
    expect(buyAndPlace(s, 'cactus', 6, 6)).toBeNull();
    expect(decorPoints(s)).toBe(d0 + 5);
    expect(s.stats.purchases).toBe(1);
  });

  it('enforces level, money and max-count limits', () => {
    const s = createInitialState(1);
    expect(buyAndPlace(s, 'slime_fountain', 6, 6)).toMatch(/level 10/);
    s.cash = 10;
    expect(buyAndPlace(s, 'plant', 6, 6)).toMatch(/cash/);
    const r = rich();
    expect(buyAndPlace(r, 'fridge', 6, 6)).toMatch(/only have 1/);
  });

  it('never lets you block the door, stack items, or leave the room', () => {
    const s = rich();
    expect(canPlace(s, 'plant', DOOR_X, 0)).toMatch(/door/);
    expect(canPlace(s, 'plant', 2, 0)).toMatch(/already/); // the grill
    expect(canPlace(s, 'plant', 8, 3)).toMatch(/inside/);
  });

  it('refuses layouts that wall off a counter or trap a seat', () => {
    const s = rich();
    // counters are at (0,2..4); the middle one is only reachable via (1,3), which the bench at (2,3)
    // already hems in from the right. Plants at (1,2) and (1,4) would seal it.
    expect(buyAndPlace(s, 'plant', 1, 2)).toBeNull();
    expect(canPlace(s, 'plant', 1, 4)).toMatch(/wall off/);
    expect(canPlace(s, 'plant', 1, 3)).toMatch(/wall off/);
    // and you can't trap a seat: bench (4,3) is reachable only from (4,2), (4,4) and (5,3)
    expect(buyAndPlace(s, 'plant', 4, 2)).toBeNull();
    expect(buyAndPlace(s, 'plant', 4, 4)).toBeNull();
    expect(canPlace(s, 'plant', 5, 3)).toMatch(/trap/);
  });

  it('chairs only become seats when they face a table that takes seats on that side', () => {
    const s = rich();
    const before = validSeats(s).length;
    expect(buyAndPlace(s, 'table_diner', 6, 6)).toBeNull();
    expect(buyAndPlace(s, 'chair_wood', 5, 6, 'se')).toBeNull(); // faces +x → the table
    expect(buyAndPlace(s, 'chair_wood', 6, 7, 'ne')).toBeNull(); // faces -y → the table
    expect(buyAndPlace(s, 'chair_wood', 7, 6, 'se')).toBeNull(); // faces away → not a seat
    expect(validSeats(s).length).toBe(before + 2);
    // picnic tables only take benches on their long sides (x)
    expect(buyAndPlace(s, 'chair_wood', 3, 2, 'sw')).toBeNull(); // north of (3,3) facing it
    expect(validSeats(s).length).toBe(before + 2);
    // rotating fixes the backwards chair
    const chair = furnAt(s, 7, 6)!;
    rotateFurniture(s, chair.id); // se → sw
    rotateFurniture(s, chair.id); // sw → nw
    expect(chair.dir).toBe('nw');
    expect(validSeats(s).length).toBe(before + 3);
  });

  it('customers actually sit at newly placed tables', () => {
    const s = rich(11);
    s.counter[0].dish = 'hotdog';
    s.counter[0].servings = 400;
    s.ratingPts = 100;
    for (const [x, y] of [
      [6, 6],
      [6, 1],
    ]) {
      buyAndPlace(s, 'table_diner', x, y);
      buyAndPlace(s, 'chair_diner', x - 1, y, 'se');
      buyAndPlace(s, 'chair_diner', x + 1, y, 'nw');
    }
    const newSeats = new Set(validSeats(s).filter((f) => f.item === 'chair_diner').map((f) => f.id));
    let used = false;
    for (let i = 0; i < 2400 && !used; i++) {
      tick(s, 0.25);
      used = s.customers.some((c) => c.seatId && newSeats.has(c.seatId) && (c.state === 'waiting' || c.state === 'eating'));
    }
    expect(used).toBe(true);
  });

  it('moves, stores, places from storage and sells (half price back)', () => {
    const s = rich();
    buyAndPlace(s, 'lamp_post', 6, 6);
    const f = furnAt(s, 6, 6)!;
    expect(moveFurniture(s, f.id, 6, 7)).toBeNull();
    expect(furnAt(s, 6, 7)?.id).toBe(f.id);
    expect(storeFurniture(s, f.id)).toBeNull();
    expect(s.storage.lamp_post).toBe(1);
    expect(placeFromStorage(s, 'lamp_post', 7, 7)).toBeNull();
    expect(s.storage.lamp_post).toBeUndefined();
    const cash = s.cash;
    expect(sellFurniture(s, furnAt(s, 7, 7)!.id)).toBeNull();
    expect(s.cash).toBe(cash + 75);
  });

  it('protects busy furniture and the essentials', () => {
    const s = rich();
    const you = s.workers[0];
    const grill = s.stoves[0];
    startCooking(s, you.id, grill.id, 'hotdog');
    run(s, 5);
    const gf = s.furniture.find((f) => f.id === grill.furnitureId)!;
    expect(storeFurniture(s, gf.id)).toMatch(/cooking|stove/);
    const fridge = s.furniture.find((f) => f.item === 'fridge')!;
    expect(sellFurniture(s, fridge.id)).toMatch(/Fridge/);
    s.counter[0].servings = 5;
    s.counter[0].dish = 'hotdog';
    expect(storeFurniture(s, s.counter[0].furnitureId)).toMatch(/Serve/);
  });
});

describe('walls, themes, expansions, upgrades', () => {
  it('hangs wall decor (not over the door, one per slot) and counts its decor', () => {
    const s = rich();
    const d0 = decorPoints(s);
    expect(buyWall(s, 'wall_neon_pig', 'r', 3)).toBeNull();
    expect(decorPoints(s)).toBe(d0 + 10);
    expect(buyWall(s, 'wall_clock', 'r', DOOR_X)).toMatch(/door/);
    expect(buyWall(s, 'wall_clock', 'r', 3)).toMatch(/already/);
    const w = s.walls.find((x) => x.item === 'wall_neon_pig')!;
    expect(moveWall(s, w.id, 'l', 6)).toBeNull();
    expect(storeWall(s, w.id)).toBeNull();
    expect(s.storage.wall_neon_pig).toBe(1);
  });

  it('expands the room in steps (last one costs Brain Sauce) and new floor is usable', () => {
    const s = rich();
    s.sauce = 50;
    expect(nextExpansion(s)!.size).toBe(9);
    expect(expand(s)).toBeNull();
    expect(s.roomN).toBe(9);
    expect(buyAndPlace(s, 'plant', 8, 8)).toBeNull();
    expand(s);
    expand(s);
    const sauce = s.sauce;
    expect(expand(s)).toBeNull();
    expect(s.sauce).toBe(sauce - 20);
    expect(s.roomN).toBe(12);
    expect(expand(s)).toMatch(/big as it gets/);
  });

  it('buys and switches themes, which boost decor', () => {
    const s = rich();
    const st0 = decorPoints(s);
    expect(buyTheme(s, 'diner')).toBeNull();
    expect(s.theme).toBe('diner');
    expect(decorPoints(s)).toBe(st0 + 14);
    expect(buyTheme(s, 'shack')).toBeNull();
    expect(s.theme).toBe('shack');
    const cash = s.cash;
    expect(buyTheme(s, 'diner')).toBeNull(); // already owned: free switch
    expect(s.cash).toBe(cash);
  });

  it('a heat lamp widens the burn window', () => {
    const a = rich();
    const b = rich();
    buyKeepWarm(b, b.stoves[0].id);
    for (const s of [a, b]) {
      startCooking(s, s.workers[0].id, s.stoves[0].id, 'burger');
      run(s, 70);
    }
    expect(b.stoves[0].burnAt! - a.stoves[0].burnAt!).toBeCloseTo(30, 0);
  });

  it('more decor and good service raise the star rating', () => {
    const s = rich();
    s.ratingPts = 100;
    const st0 = stars(s);
    for (const [x, y] of [
      [7, 7],
      [7, 6],
      [6, 7],
      [5, 7],
    ])
      buyAndPlace(s, 'skeleton_statue', x, y);
    for (let i = 0; i < 6; i++) buyWall(s, 'wall_neon_pig', 'r', [0, 2, 3, 4, 6, 7][i]);
    expect(stars(s)).toBeGreaterThan(st0);
  });
});
