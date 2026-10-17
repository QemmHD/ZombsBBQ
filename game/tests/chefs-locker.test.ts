import { describe, expect, it } from 'vitest';
import {
  CHEFS,
  CHEF_BY_ID,
  LOCKER,
  YOU_STATS,
  buyHooks,
  chefOf,
  chefStats,
  createInitialState,
  crewCapForLevel,
  lockerOf,
  makeWorker,
  setChef,
  storeInLocker,
  takeFromLocker,
  tick,
  zombies,
  deserialize,
  serialize,
} from '../src/sim';

describe('chef avatars', () => {
  it('has 9 chefs with the four stats', () => {
    expect(CHEFS).toHaveLength(9);
    for (const c of CHEFS) {
      for (const k of ['tips', 'speed', 'power', 'energy'] as const) expect(c[k]).toBeGreaterThan(0);
      expect(c.id === 'you' || c.id.startsWith('chef_')).toBe(true);
    }
    expect(new Set(CHEFS.map((c) => c.id)).size).toBe(9);
  });

  it('the default chef is YOU as before', () => {
    const s = createInitialState(1);
    expect(chefOf(s).id).toBe('you');
    expect(chefStats('you')).toEqual(YOU_STATS);
  });

  it('keeps every chef roughly level (a look, not a pay wall)', () => {
    const score = (c: (typeof CHEFS)[number]) => c.tips + c.speed + c.power + c.energy / 20;
    const base = score(CHEFS[0]);
    for (const c of CHEFS) expect(Math.abs(score(c) - base)).toBeLessThanOrEqual(2);
  });

  it('switching chefs swaps stats and keeps the energy fraction', () => {
    const s = createInitialState(1);
    const you = s.workers.find((w) => w.kind === 'you')!;
    you.energy = you.stats.energy / 2;
    expect(setChef(s, 'chef_butcher')).toBeNull();
    expect(you.type).toBe('chef_butcher');
    expect(you.stats.power).toBe(CHEF_BY_ID.chef_butcher.power);
    expect(you.energy).toBeCloseTo(CHEF_BY_ID.chef_butcher.energy / 2, 0);
    expect(chefOf(s).id).toBe('chef_butcher');
    expect(setChef(s, 'nope')).toMatch(/No such/);
    // still plays
    for (let i = 0; i < 200; i++) tick(s, 0.1);
    // and survives a save
    const back = deserialize(serialize(s, Date.now()), Date.now()).state;
    expect(chefOf(back).id).toBe('chef_butcher');
  });
});

describe('meat locker', () => {
  const withZombie = () => {
    const s = createInitialState(2);
    s.level = 3;
    s.crewCap = crewCapForLevel(3);
    const z = makeWorker(s, 'zombie', 'teen', { x: 3, y: 2 });
    s.workers.push(z);
    return { s, z };
  };

  it('starts with 5 hooks', () => {
    expect(lockerOf(createInitialState(1)).hooks).toBe(LOCKER.startHooks);
  });

  it('hangs a zombie up and frees the crew slot, then brings it back', () => {
    const { s, z } = withZombie();
    z.xp = 77;
    expect(storeInLocker(s, z.id)).toBeNull();
    expect(zombies(s)).toHaveLength(0);
    expect(lockerOf(s).zombies[0].xp).toBe(77);
    for (let i = 0; i < 50; i++) tick(s, 0.1);
    expect(takeFromLocker(s, 0)).toBeNull();
    expect(zombies(s)).toHaveLength(1);
    expect(lockerOf(s).zombies).toHaveLength(0);
  });

  it('needs a free crew slot to take one out', () => {
    const { s, z } = withZombie();
    storeInLocker(s, z.id);
    while (zombies(s).length < s.crewCap) s.workers.push(makeWorker(s, 'zombie', 'teen', { x: 4, y: 2 }));
    expect(takeFromLocker(s, 0)).toMatch(/full/);
  });

  it('never hangs up YOU, and fills up', () => {
    const { s } = withZombie();
    expect(storeInLocker(s, s.workers[0].id)).toMatch(/Only zombies/);
    lockerOf(s).hooks = 0;
    expect(storeInLocker(s, s.workers[1].id)).toMatch(/hook/);
  });

  it('5 toxin buys 5 hooks, up to 50', () => {
    const s = createInitialState(1);
    s.sauce = 1000;
    expect(buyHooks(s)).toBeNull();
    expect(lockerOf(s).hooks).toBe(10);
    while (lockerOf(s).hooks < LOCKER.maxHooks) expect(buyHooks(s)).toBeNull();
    expect(buyHooks(s)).toMatch(/big/);
    s.sauce = 0;
    lockerOf(s).hooks = 10;
    expect(buyHooks(s)).toMatch(/Brain Sauce/);
  });
});
