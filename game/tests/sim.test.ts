import { describe, expect, it } from 'vitest';
import {
  DISH_BY_ID,
  addZombieXp,
  DOOR_X,
  TUNING,
  addFurniture,
  attackThreshold,
  cancelCooking,
  crewCapForLevel,
  createInitialState,
  deserialize,
  discardCounter,
  edgeBlocked,
  findPath,
  finishCost,
  finishNow,
  infect,
  makeWorker,
  maxEnergy,
  migrate,
  plateDish,
  refill,
  rest,
  serialize,
  setClosed,
  startCooking,
  stars,
  tick,
  walkable,
  zombies,
  type GameState,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.25) => {
  for (let t = 0; t < sec; t += dt) tick(s, dt);
};
const you = (s: GameState) => s.workers.find((w) => w.kind === 'you')!;
const stove = (s: GameState) => s.stoves[0];
const servings = (s: GameState) => s.counter.reduce((a, c) => a + (c.dish ? c.servings : 0), 0);
const stock = (s: GameState, dish = 'sliders', n = 200) => {
  s.counter[0].dish = dish;
  s.counter[0].servings = n;
};
const room = (s: GameState) => ({ w: s.roomW, h: s.roomH });

describe('the corner lot', () => {
  it('starts as the original did: a grimy 7x6 room with a dirty stove, sink, fridge and two one-seat tables', () => {
    const s = createInitialState(1);
    expect([s.roomW, s.roomH]).toEqual([7, 6]);
    expect(s.furniture.map((f) => f.item)).toEqual(expect.arrayContaining(['stove_dirty', 'sink_dirty', 'fridge_dirty', 'counter_plain', 'plant_dead']));
    expect(s.crewCap).toBe(1);
    expect(stars(s)).toBe(1.5);
  });

  it('walls block everything except the door; customers walk the sidewalks, never the road', () => {
    const r = { w: 7, h: 6 };
    expect(edgeBlocked(DOOR_X, 0, DOOR_X, -1, r)).toBe(false);
    expect(edgeBlocked(DOOR_X - 1, 0, DOOR_X - 1, -1, r)).toBe(true);
    expect(edgeBlocked(0, 3, -1, 3, r)).toBe(true);
    expect(edgeBlocked(6, 3, 7, 3, r)).toBe(true); // the front is closed too
    expect(walkable(10, -1, r)).toBe(true); // north-east sidewalk
    expect(walkable(-1, 9, r)).toBe(true); // north-west sidewalk
    expect(walkable(3, -2, r)).toBe(false); // road
    expect(walkable(9, 3, r)).toBe(false); // lawn
    const p = findPath({ x: 12, y: -1 }, { x: 2, y: 2 }, new Set(), r)!;
    expect(p.some((pt) => pt.x === DOOR_X && pt.y === 0)).toBe(true);
    // round the corner from the other street
    expect(findPath({ x: -1, y: 11 }, { x: 2, y: 2 }, new Set(), r)).not.toBeNull();
  });

  it('the crew starts at one zombie and grows like the original (1, 2, 3, 3, 4, 4 … 10 at 17, 14 at 56)', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 15, 16].map(crewCapForLevel)).toEqual([1, 2, 3, 3, 4, 4, 5, 5, 9, 9]);
    expect(crewCapForLevel(17)).toBe(10);
    expect(crewCapForLevel(20)).toBe(10);
    expect(crewCapForLevel(27)).toBe(11);
    expect(crewCapForLevel(36)).toBe(12);
    expect(crewCapForLevel(46)).toBe(13);
    expect(crewCapForLevel(56)).toBe(14);
  });
});

describe('cooking (the cook must stay at the stove; food burns after waiting as long as it cooked)', () => {
  it('YOU cooks, it finishes, and someone carries it to the counter', () => {
    const s = createInitialState(7);
    s.spawnCooldown = 1e9; // no customers eating it before we count
    const cash = s.cash;
    expect(startCooking(s, you(s).id, stove(s).id, 'sliders')).toBeNull();
    expect(s.cash).toBe(cash - DISH_BY_ID.sliders.cost);
    run(s, 30); // the very first dish is a quick one
    expect(stove(s).status).toBe('done');
    expect(s.xp).toBeGreaterThan(0);
    expect(plateDish(s, stove(s).id)).toBeNull();
    run(s, 15);
    expect(stove(s).status).toBe('empty');
    expect(servings(s)).toBe(12);
  });

  it('pauses when the cook walks away, and resumes when someone comes back', () => {
    const s = createInitialState(7);
    s.stats.cooked.sliders = 1; // not the tutorial dish
    startCooking(s, you(s).id, stove(s).id, 'sliders');
    run(s, 10);
    expect(stove(s).status).toBe('cooking');
    const left = stove(s).left!;
    rest(s, you(s).id);
    run(s, 30);
    expect(stove(s).status).toBe('paused');
    expect(stove(s).left).toBeCloseTo(left, 0);
    expect(startCooking(s, you(s).id, stove(s).id)).toBeNull(); // resume, no extra cost
    run(s, 150);
    expect(stove(s).status).toBe('done');
  });

  it('a finished dish burns once it has waited as long as it took to cook', () => {
    const s = createInitialState(7);
    s.stats.cooked.gumbo = 1;
    s.level = 2;
    startCooking(s, you(s).id, stove(s).id, 'gumbo');
    run(s, 15 * 60 + 20, 1);
    expect(stove(s).status).toBe('done');
    run(s, 14 * 60, 1);
    expect(stove(s).status).toBe('done');
    run(s, 70, 1);
    expect(stove(s).status).toBe('burnt');
    plateDish(s, stove(s).id); // scrapes the burnt lump
    expect(stove(s).status).toBe('empty');
  });

  it('needs the right cookbook: grill dishes need a grill, raid recipes need studying', () => {
    const s = createInitialState(7);
    s.level = 9;
    expect(startCooking(s, you(s).id, stove(s).id, 'burger')).toMatch(/grill/);
    expect(startCooking(s, you(s).id, stove(s).id, 'chili')).toMatch(/grill|raid/);
    s.level = 1;
    expect(startCooking(s, you(s).id, stove(s).id, 'gumbo')).toMatch(/level 2/);
  });

  it('dishes stack on one counter instead of needing a counter each', () => {
    const s = createInitialState(7);
    stock(s, 'sliders', 10);
    s.counter.push({ id: 'kx', furnitureId: s.counter[0].furnitureId, dish: 'hobodog', servings: 5 });
    expect(servings(s)).toBe(15);
  });
});

describe('customers, serving and cleaning up', () => {
  it('customers walk in off the sidewalk, sit at a one-seat table, get served, pay and leave a dirty plate', () => {
    const s = createInitialState(11);
    stock(s);
    const cash = s.cash;
    let sawDirty = false;
    for (let t = 0; t < 120; t += 0.25) {
      tick(s, 0.25);
      if (s.furniture.some((f) => f.dirty)) sawDirty = true;
    }
    expect(s.stats.served).toBeGreaterThan(2);
    expect(s.cash).toBeGreaterThan(cash);
    expect(sawDirty).toBe(true);
    expect(s.stats.cleared).toBeGreaterThan(0); // somebody carried plates to the sink
  });

  it('never seats two customers at one table', () => {
    const s = createInitialState(11);
    stock(s);
    for (let t = 0; t < 200; t += 0.25) {
      tick(s, 0.25);
      const tables = s.customers.filter((c) => c.tableId).map((c) => c.tableId);
      expect(new Set(tables).size).toBe(tables.length);
    }
  });

  it('with no sink, plates pile up and customers find no clean table', () => {
    const s = createInitialState(11);
    s.furniture = s.furniture.filter((f) => f.item !== 'sink_dirty');
    stock(s);
    run(s, 200);
    expect(s.furniture.filter((f) => f.dirty).length).toBe(2);
    expect(s.stats.cleared).toBe(0);
    expect(s.stats.angry).toBeGreaterThan(0);
  });

  it('with no food, customers eventually leave unhappy and the rating drops', () => {
    const s = createInitialState(11);
    const r0 = s.rating;
    run(s, 200);
    expect(s.stats.angry).toBeGreaterThan(0);
    expect(s.rating).toBeLessThan(r0);
  });
});

describe('YOU are Patient Zero: infecting customers builds the crew', () => {
  const seated = (s: GameState) => {
    for (let i = 0; i < 600; i++) {
      tick(s, 0.25);
      const c = s.customers.find((c) => c.state === 'waiting' || c.state === 'eating');
      if (c) return c;
    }
    return undefined;
  };

  it('first infection is free, and the crew cap (one at the start) holds', () => {
    const s = createInitialState(3);
    stock(s);
    const target = seated(s)!;
    const cash = s.cash;
    expect(infect(s, target.id)).toBeNull();
    expect(s.cash).toBe(cash);
    run(s, 2);
    expect(zombies(s)).toHaveLength(1);
    expect(zombies(s)[0].type).toBe(target.type);
    const next = seated(s)!;
    expect(infect(s, next.id)).toMatch(/Crew is full/);
  });
});

describe('energy, patience, biting, resting outside, levels', () => {
  const withZombie = () => {
    const s = createInitialState(5);
    stock(s, 'sliders', 400);
    const z = makeWorker(s, 'zombie', 'teen', { x: 3, y: 1 });
    s.workers.push(z);
    return { s, z };
  };

  it('patience threshold matches the original (P1 ≈ 20%, P10 ≈ 2%)', () => {
    expect(attackThreshold(1)).toBeCloseTo(0.2);
    expect(attackThreshold(10)).toBeCloseTo(0.02);
  });

  it('a starving zombie bites a customer and everyone runs out screaming without paying', () => {
    const { s, z } = withZombie();
    z.energy = 1;
    z.nextDaydream = Infinity;
    let before = s.rating;
    for (let i = 0; i < 800 && s.stats.bites === 0; i++) {
      before = s.rating;
      tick(s, 0.25);
    }
    expect(s.stats.bites).toBe(1);
    expect(s.rating).toBeLessThan(before);
    expect(z.energy).toBeGreaterThan(maxEnergy(z) * TUNING.biteEnergyFrac * 0.9);
    expect(s.customers.filter((c) => c.state === 'waiting' || c.state === 'eating')).toHaveLength(0);
  });

  it('the zombie eats its victim on the spot (feast) and leaves a bone pile behind, then gets back up', () => {
    const { s, z } = withZombie();
    z.energy = 1;
    z.nextDaydream = Infinity;
    let eaten: { t: string; customerId?: string; x?: number; y?: number } | undefined;
    for (let i = 0; i < 800 && !eaten; i++) {
      s.events.length = 0;
      tick(s, 0.25);
      eaten = s.events.find((e) => e.t === 'eaten') as typeof eaten;
    }
    expect(eaten).toBeDefined();
    expect(z.state).toBe('feasting');
    // the victim is gone (no fleeing, no paying): only bones are left, which the scene draws
    tick(s, 0.1);
    expect(s.customers.some((c) => c.id === eaten!.customerId)).toBe(false);
    // the feast lasts a few seconds, then it's back to work
    for (let i = 0; i < (TUNING.feastSec + 0.5) / 0.25; i++) tick(s, 0.25);
    expect(z.state).not.toBe('feasting');
  });

  it('resting zombies walk out the door and nap on the sidewalk, then come back in', () => {
    const { s, z } = withZombie();
    z.energy = 30;
    z.nextDaydream = Infinity;
    expect(rest(s, z.id)).toBeNull();
    run(s, 20);
    expect(z.state).toBe('resting');
    expect(z.y).toBe(-1); // outside on the sidewalk
    const e = z.energy;
    run(s, 30);
    expect(z.energy).toBeGreaterThan(e);
    const sauce = s.sauce;
    expect(refill(s, z.id)).toBeNull();
    expect(z.energy).toBe(maxEnergy(z));
    expect(s.sauce).toBe(sauce - 1);
    run(s, 20);
    expect(z.y).toBeGreaterThanOrEqual(0); // walked back inside
  });

  it('zombies level up from serving and gain max energy', () => {
    const { s, z } = withZombie();
    const e0 = maxEnergy(z);
    addZombieXp(s, z, 20);
    expect(maxEnergy(z)).toBeGreaterThan(e0);
  });

  it('zombies daydream and snap out of it', () => {
    const { s, z } = withZombie();
    z.nextDaydream = s.now;
    s.counter.forEach((c) => (c.servings = 0));
    run(s, 1);
    expect(z.state).toBe('daydream');
    run(s, TUNING.daydreamMaxSec + 1);
    expect(z.state).not.toBe('daydream');
  });
});

describe('stove, counter and door controls', () => {
  const cooking = () => {
    const s = createInitialState(3);
    s.stats.cooked.sliders = 1;
    expect(startCooking(s, you(s).id, stove(s).id, 'hobodog')).toBeNull();
    for (let i = 0; i < 200 && stove(s).status !== 'cooking'; i++) tick(s, 0.1);
    expect(stove(s).status).toBe('cooking');
    return s;
  };

  it('Brain Sauce finishes a dish instantly, priced by the time left', () => {
    const s = cooking();
    s.sauce = 0;
    expect(finishNow(s, stove(s).id)).toMatch(/Brain Sauce/);
    s.sauce = 5;
    const cost = finishCost(s, stove(s).id);
    expect(cost).toBe(3);
    expect(finishNow(s, stove(s).id)).toBeNull();
    expect(stove(s).status).toBe('done');
    expect(s.sauce).toBe(5 - cost);
  });

  it('cancelling refunds half the ingredients and frees the cook', () => {
    const s = cooking();
    const cash = s.cash;
    expect(cancelCooking(s, stove(s).id)).toBeNull();
    expect(s.cash).toBe(cash + Math.floor(30 * TUNING.sellBack));
    expect(stove(s).status).toBe('empty');
    expect(you(s).state).toBe('idle');
  });

  it('discarding empties a counter slot', () => {
    const s = createInitialState(3);
    stock(s, 'sliders', 4);
    expect(discardCounter(s, s.counter[0].id)).toBeNull();
    expect(s.counter[0].servings).toBe(0);
    expect(discardCounter(s, s.counter[0].id)).not.toBeNull();
  });

  it('a closed café gets no customers, cash items stop, and the rating slowly sags', () => {
    const s = createInitialState(3);
    const vm = addFurniture(s, 'vending', 6, 5, 'sw');
    s.customers = [];
    setClosed(s, true);
    const r0 = s.rating;
    run(s, 600, 1);
    expect(s.customers).toHaveLength(0);
    expect(vm.bank ?? 0).toBe(0);
    expect(s.rating).toBeLessThan(r0);
    setClosed(s, false);
    run(s, 90);
    expect(s.customers.length).toBeGreaterThan(0);
    expect(vm.bank ?? 0).toBeGreaterThan(0);
  });
});

describe('saving and offline progress', () => {
  it('round-trips and keeps earning while you are away (capped at 8h)', () => {
    const s = createInitialState(9);
    stock(s, 'sliders', 300);
    const raw = serialize(s, 1_000_000);
    const back = deserialize(raw, 1_000_000 + 30 * 60 * 1000);
    expect(back.offlineSec).toBeCloseTo(1800);
    expect(back.state.stats.served).toBeGreaterThan(5);
    expect(back.offlineCash).toBeGreaterThan(0);
  });

  it('upgrades an old (v2) save, keeping level, money, recipes and crew', () => {
    const v2 = { version: 2, rng: 5, level: 6, xp: 40, cash: 1234, sauce: 9, recipes: ['chili', 'hotdog'], seen: { teen: 'infected' }, workers: [{ kind: 'you', type: 'you' }, { kind: 'zombie', type: 'teen' }, { kind: 'zombie', type: 'cop' }], stats: { served: 50 } };
    const s = migrate(v2)!;
    expect(s.version).toBe(3);
    expect(s.level).toBe(6);
    expect(s.cash).toBe(1234);
    expect(s.recipes).toEqual(['chili']);
    expect(zombies(s).map((z) => z.type)).toEqual(['teen', 'cop']);
    expect(room(s)).toEqual({ w: 7, h: 6 });
  });

  it('starts fresh on garbage', () => {
    expect(deserialize('{nope', 0).state.level).toBe(1);
  });
});
