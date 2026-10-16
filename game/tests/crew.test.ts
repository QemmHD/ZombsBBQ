/**
 * Crew rules from the gap audit (docs/11): energy matters for cooks (hangry warning, one bite a minute,
 * passing out at 0), the Eat! order, perks, refills, names, customer pacing, closing up, firing,
 * time away past the offline cap, the away report, save backups and the fridge.
 */
import { describe, expect, it } from 'vitest';
import {
  BACKUP_SLOTS,
  CUSTOMERS,
  CUSTOMER_BY_ID,
  DOOR_X,
  PERK_IDS,
  TUNING,
  addFurniture,
  binFridge,
  catchUpReport,
  cookAnywhere,
  cookAt,
  createInitialState,
  deserialize,
  fireZombie,
  freeCook,
  fridgeFull,
  infect,
  makeWorker,
  maxEnergy,
  nextBackupSlot,
  orderEat,
  perk,
  refill,
  rest,
  rivalClosed,
  saveSummary,
  serialize,
  setClosed,
  startCooking,
  tick,
  wake,
  zombies,
  type GameEvent,
  type GameState,
  type Worker,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.25) => {
  for (let t = 0; t < sec; t += dt) tick(s, dt);
};
const stove = (s: GameState) => s.stoves[0];
const stock = (s: GameState, dish = 'sliders', n = 200) => {
  s.counter[0].dish = dish;
  s.counter[0].servings = n;
};
/** Run until a customer is seated (waiting or eating). */
const seatSomeone = (s: GameState) => {
  for (let i = 0; i < 2000 && !s.customers.some((c) => c.state === 'waiting' || c.state === 'eating'); i++) tick(s, 0.25);
  return s.customers.find((c) => c.state === 'waiting' || c.state === 'eating')!;
};
const withZombie = (type = 'joe', seed = 5) => {
  const s = createInitialState(seed);
  s.tut = 99;
  s.stats.cooked.sliders = 1; // past the quick first dish
  const z = makeWorker(s, 'zombie', type, { x: 3, y: 1 });
  z.nextDaydream = Infinity;
  s.workers.push(z);
  return { s, z };
};
/** Tick, collecting events. */
const collect = (s: GameState, sec: number, until?: (e: GameEvent[]) => boolean) => {
  const evs: GameEvent[] = [];
  for (let t = 0; t < sec; t += 0.25) {
    s.events.length = 0;
    tick(s, 0.25);
    evs.push(...s.events);
    if (until?.(evs)) break;
  }
  return evs;
};
const cookUntilAtStove = (s: GameState, w: Worker) => {
  expect(startCooking(s, w.id, stove(s).id, 'hobodog')).toBeNull();
  for (let i = 0; i < 400 && w.state !== 'cooking'; i++) tick(s, 0.1);
  expect(w.state).toBe('cooking');
};

describe('energy matters for cooks', () => {
  it('a cook who gets hangry leaves the stove (the dish pauses), slumps for 5 s, then bites', () => {
    const { s, z } = withZombie();
    seatSomeone(s);
    s.customers.forEach((c) => (c.waitLeft = 9999));
    cookUntilAtStove(s, z);
    // just above the patience line: a few seconds of cooking tips them over
    z.energy = maxEnergy(z) * 0.12 + 0.05;
    const evs = collect(s, 10, (e) => e.some((x) => x.t === 'hungry'));
    expect(evs.some((e) => e.t === 'hungry')).toBe(true);
    expect(z.state).toBe('hungry');
    expect(stove(s).status).toBe('paused');
    // the warning lasts TUNING.hungrySec, then they go for it
    run(s, TUNING.hungrySec - 0.5);
    expect(z.state).toBe('hungry');
    run(s, 1);
    expect(z.state).toBe('hunting');
    const bite = collect(s, 30, (e) => e.some((x) => x.t === 'eaten'));
    expect(bite.some((e) => e.t === 'eaten')).toBe(true);
    expect(s.stats.bites).toBe(1);
  });

  it('Rest cancels the hangry warning', () => {
    const { s, z } = withZombie();
    seatSomeone(s);
    z.energy = 1;
    collect(s, 5, () => z.state === 'hungry');
    expect(z.state).toBe('hungry');
    expect(rest(s, z.id)).toBeNull();
    expect(z.state).toBe('toRest');
    run(s, 20);
    expect(s.stats.bites).toBe(0);
  });

  it('at most one bite a minute per zombie', () => {
    const { s, z } = withZombie('teen');
    stock(s, 'sliders', 400);
    seatSomeone(s);
    z.energy = 1;
    collect(s, 60, (e) => e.some((x) => x.t === 'eaten'));
    expect(s.stats.bites).toBe(1);
    // still starving after the snack: no second bite until the minute is up
    const t0 = s.now;
    z.energy = 1;
    let second = -1;
    for (let i = 0; i < 1200 && second < 0; i++) {
      s.events.length = 0;
      tick(s, 0.25);
      z.energy = Math.min(z.energy, 1);
      if (s.events.some((e) => e.t === 'eaten')) second = s.now;
    }
    expect(second).toBeGreaterThan(t0 + TUNING.biteCooldownSec - 4);
  });

  it('a zombie worked down to 0 passes out face-down: the dish pauses, a tap wakes them', () => {
    const { s, z } = withZombie();
    s.closed = true; // nobody to snack on: they just run dry
    cookUntilAtStove(s, z);
    z.energy = 0.02;
    const evs = collect(s, 3, (e) => e.some((x) => x.t === 'asleep'));
    expect(evs.some((e) => e.t === 'asleep')).toBe(true);
    expect(z.state).toBe('asleep');
    expect(stove(s).status).toBe('paused');
    expect(startCooking(s, z.id, stove(s).id)).toMatch(/passed out/);
    wake(s, z.id);
    expect(z.state).toBe('idle');
  });

  it('left alone, a passed-out zombie slowly recovers and gets up on its own', () => {
    const { s, z } = withZombie();
    s.closed = true;
    cookUntilAtStove(s, z);
    z.energy = 0.01;
    run(s, 1);
    expect(z.state).toBe('asleep');
    const e0 = z.energy;
    run(s, 60);
    expect(z.energy).toBeGreaterThan(e0);
    run(s, 3600);
    expect(z.state).not.toBe('asleep');
    expect(z.energy).toBeGreaterThanOrEqual(maxEnergy(z) * TUNING.asleepWakeAt - 1);
  });

  it('Eat!: tap a customer and the zombie walks over and eats them (+energy), once a minute', () => {
    const { s, z } = withZombie();
    const c = seatSomeone(s);
    z.energy = 50;
    expect(orderEat(s, z.id, c.id)).toBeNull();
    expect(z.state).toBe('hunting');
    const evs = collect(s, 30, (e) => e.some((x) => x.t === 'eaten'));
    const eaten = evs.find((e) => e.t === 'eaten');
    expect(eaten && eaten.t === 'eaten' && eaten.customerId).toBe(c.id);
    expect(z.energy).toBeCloseTo(50 + TUNING.biteEnergyGain, 0);
    run(s, TUNING.feastSec + 1);
    const next = seatSomeone(s);
    expect(orderEat(s, z.id, next.id)).toMatch(/digesting/);
    expect(orderEat(s, s.workers[0].id, next.id)).toMatch(/Only zombies/);
  });
});

describe('refills, new zombies, names', () => {
  it('Brain Sauce refills only work below 80% energy', () => {
    const { s, z } = withZombie();
    z.energy = maxEnergy(z) * 0.85;
    expect(refill(s, z.id)).toMatch(/80%/);
    z.energy = maxEnergy(z) * 0.7;
    expect(refill(s, z.id)).toBeNull();
    expect(z.energy).toBe(maxEnergy(z));
  });

  it('a freshly infected zombie starts at 20 energy and keeps the customer’s first name', () => {
    const s = createInitialState(3);
    const c = seatSomeone(s);
    expect(c.name).toBeTruthy();
    expect(infect(s, c.id)).toBeNull();
    run(s, 2);
    const z = zombies(s)[0];
    expect(z.energy).toBe(TUNING.infectEnergy);
    expect(z.name).toBe(`Zombie ${c.name}`);
  });

  it('customer names are seeded: the same café draws the same names', () => {
    const names = (seed: number) => {
      const s = createInitialState(seed);
      run(s, 300);
      return s.stats.happy + s.customers.length > 0 ? s.customers.map((c) => c.name).join(',') : '';
    };
    expect(names(42)).toBe(names(42));
  });
});

describe('perks', () => {
  it('most common customers have none; rarer types have better ones', () => {
    const score = (id: string) => PERK_IDS.reduce((a, k) => a + (perk(id, k) - 1), 0);
    const commons = CUSTOMERS.filter((c) => c.tier === 'common');
    expect(commons.filter((c) => score(c.id) > 0).length).toBeLessThan(commons.length / 2);
    expect(score('champ')).toBeGreaterThan(score('celebrity'));
    expect(score('celebrity')).toBeGreaterThan(score('politician'));
    expect(perk('you', 'cook')).toBe(1);
  });

  it('a fast cook finishes sooner; an XP cook earns more XP', () => {
    const time = (type: string) => {
      const { s, z } = withZombie(type);
      s.closed = true;
      cookUntilAtStove(s, z);
      z.energy = 1e6;
      let t = 0;
      const evs: GameEvent[] = [];
      while (stove(s).status === 'cooking' && t < 2000) {
        s.events.length = 0;
        tick(s, 0.5);
        evs.push(...s.events);
        z.energy = maxEnergy(z);
        t += 0.5;
      }
      const xp = evs.find((e) => e.t === 'xp');
      return { t, xp: xp && xp.t === 'xp' ? xp.amount : 0 };
    };
    const plain = time('joe');
    const granny = time('grandma');
    expect(granny.t).toBeLessThan(plain.t * 0.85);
    expect(granny.xp).toBeGreaterThan(plain.xp);
  });

  it('a nap goes faster with the regen perk', () => {
    const regen = (type: string) => {
      const { s, z } = withZombie(type);
      z.stats.recharge = 5;
      z.energy = 10;
      rest(s, z.id);
      run(s, 15);
      const e = z.energy;
      run(s, 60);
      return z.energy - e;
    };
    expect(regen('nurse')).toBeGreaterThan(regen('joe') * 1.15);
  });
});

describe('cooking from the stove or the cookbook', () => {
  it('tap an empty stove, pick a dish: the nearest free cook goes', () => {
    const { s, z } = withZombie();
    z.energy = maxEnergy(z);
    z.x = 2;
    z.y = 1; // right next to the stove
    expect(freeCook(s, stove(s).id)?.id).toBe(z.id);
    expect(cookAt(s, stove(s).id, 'sliders')).toBeNull();
    expect(stove(s).cookId).toBe(z.id);
  });

  it('a hangry or passed-out zombie is never picked', () => {
    const { s, z } = withZombie();
    z.energy = 1;
    expect(freeCook(s, stove(s).id)?.kind).toBe('you');
  });

  it('the cookbook’s Cook button finds a stove and a cook', () => {
    const s = createInitialState(4);
    s.tut = 99;
    expect(cookAnywhere(s, 'sliders')).toBeNull();
    expect(stove(s).status).toBe('reserved');
    expect(cookAnywhere(s, 'sliders')).toMatch(/busy/);
    expect(cookAnywhere(s, 'burger')).toMatch(/Unlocks|grill/);
  });
});

describe('customer pacing', () => {
  it('customers stop in the doorway for a look round, then walk to their seat at their own speed', () => {
    const s = createInitialState(8);
    let looked = false;
    for (let i = 0; i < 2000 && !s.customers.some((c) => c.state === 'waiting'); i++) {
      tick(s, 0.1);
      const c = s.customers.find((x) => x.stage === 'look');
      if (c) {
        looked = true;
        expect([Math.round(c.x), Math.round(c.y)]).toEqual([DOOR_X, 0]);
        expect(c.doorUntil! - s.now).toBeLessThanOrEqual(TUNING.doorPauseSec + TUNING.doorPauseJitter + 0.01);
      }
    }
    expect(looked).toBe(true);
    const c = s.customers.find((x) => x.state === 'waiting')!;
    expect(c.speed).toBeCloseTo(1.4 + CUSTOMER_BY_ID[c.type].stats.speed * TUNING.walkSpeedPerStat, 5);
  });

  it('a served diner holds the plate for 2 s before eating', () => {
    const s = createInitialState(8);
    stock(s);
    for (let i = 0; i < 4000 && !s.customers.some((c) => c.state === 'eating'); i++) tick(s, 0.1);
    const c = s.customers.find((x) => x.state === 'eating')!;
    expect(c.holdUntil! - s.now).toBeGreaterThan(TUNING.holdFoodSec - 0.3);
    expect(c.eatEnd - c.holdUntil!).toBeCloseTo(TUNING.eatSec, 5);
  });
});

describe('closing up and firing', () => {
  it('closing sends the whole zombie crew out to nap; they stay out until you open', () => {
    const { s, z } = withZombie();
    z.energy = maxEnergy(z);
    cookUntilAtStove(s, z);
    setClosed(s, true);
    expect(z.state).toBe('toRest');
    expect(stove(s).status).toBe('paused');
    run(s, 60);
    expect(z.state).toBe('resting');
    expect(z.y).toBe(-1);
    run(s, 120);
    expect(z.state).toBe('resting');
    setClosed(s, false);
    expect(z.state).toBe('idle');
  });

  it('a fired zombie lurches off down the street instead of vanishing', () => {
    const { s, z } = withZombie();
    expect(fireZombie(s, z.id)).toBeNull();
    expect(zombies(s)).toHaveLength(0);
    expect(s.departing?.map((d) => d.id)).toEqual([z.id]);
    run(s, 60);
    expect(s.departing).toHaveLength(0);
  });

  it("someone who can't get where they're going says so", () => {
    const { s, z } = withZombie();
    // box the zombie in with furniture on every side
    z.x = 4;
    z.y = 4;
    for (const [x, y] of [
      [3, 4],
      [5, 4],
      [4, 3],
      [4, 5],
    ])
      addFurniture(s, 'plant_dead', x, y);
    s.events.length = 0;
    expect(startCooking(s, z.id, stove(s).id, 'sliders')).toMatch(/can't get to/);
    expect(s.events.filter((e) => e.t === 'cantReach' && e.workerId === z.id)).toHaveLength(1);
    // not repeated every frame
    expect(startCooking(s, z.id, stove(s).id, 'sliders')).toMatch(/can't get to/);
    expect(s.events.filter((e) => e.t === 'cantReach')).toHaveLength(1);
    expect(s.cash).toBe(createInitialState(5).cash); // nothing was charged
  });
});

describe('time away', () => {
  const H = 3600;
  it('real-time timers keep counting past the 8 h offline cap', () => {
    const s = createInitialState(9);
    s.level = 6;
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: s.now + 20 * H };
    const z = makeWorker(s, 'zombie', 'joe', { x: -1, y: -1 });
    z.state = 'down';
    z.downUntil = s.now + 12 * H;
    s.workers.push(z);
    const back = deserialize(serialize(s, 0), 24 * H * 1000).state;
    expect(back.now).toBeGreaterThanOrEqual(s.now + 24 * H - 1);
    expect(rivalClosed(back, 'chuck')).toBe(false);
    tick(back, 0.1);
    expect(back.workers.find((w) => w.id === z.id)!.state).not.toBe('down');
  });

  it('the same goes for coming back to the app after it was hidden', () => {
    const s = createInitialState(9);
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: s.now + 20 * H };
    catchUpReport(s, 21 * H);
    expect(rivalClosed(s, 'chuck')).toBe(false);
  });

  it('reports what happened while you were away', () => {
    const s = createInitialState(9);
    stock(s, 'sliders', 300);
    const r = deserialize(serialize(s, 1_000_000), 1_000_000 + 30 * 60 * 1000).report!;
    expect(r.sec).toBeCloseTo(1800);
    expect(r.served).toBeGreaterThan(5);
    expect(r.cash).toBeGreaterThan(0);
    expect(r.rating1).not.toBe(r.rating0);
    expect(r.bitten).toBeGreaterThanOrEqual(0);
    expect(r.burnt).toBeGreaterThanOrEqual(0);
  });
});

describe('save backups', () => {
  it('a broken save is flagged (not silently replaced)', () => {
    expect(deserialize('{nope', 0).failed).toBe(true);
    expect(deserialize(null, 0).failed).toBeUndefined();
    expect(deserialize(JSON.stringify({ savedAt: 0, state: { version: 1 } }), 0).failed).toBe(true);
  });

  it('backups rotate: empty slots first, then the oldest', () => {
    const s = createInitialState(2);
    const at = (ms: number) => serialize(s, ms);
    expect(nextBackupSlot([null, null, null])).toBe(0);
    expect(nextBackupSlot([at(5), null, null])).toBe(1);
    expect(nextBackupSlot([at(5), at(3), at(9)])).toBe(1);
    expect(nextBackupSlot([at(5), at(7), '{broken'])).toBe(2);
    expect(BACKUP_SLOTS).toBe(3);
  });

  it('summarises a save for the backup list', () => {
    const s = createInitialState(2);
    s.level = 4;
    expect(saveSummary(serialize(s, 77))).toMatchObject({ savedAt: 77, level: 4 });
    expect(saveSummary('{nope')).toBeNull();
  });
});

describe('the fridge', () => {
  it('knows when it is full, and dishes can be binned', () => {
    const s = createInitialState(2);
    for (let i = 0; i < TUNING.fridgeMax; i++) s.fridge.push({ dish: 'chili', servings: 6 });
    expect(fridgeFull(s)).toBe(true);
    expect(binFridge(s, 0)).toBeNull();
    expect(fridgeFull(s)).toBe(false);
    expect(binFridge(s, 99)).not.toBeNull();
  });
});
