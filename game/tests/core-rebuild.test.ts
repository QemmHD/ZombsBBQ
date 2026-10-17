/**
 * The core-loop rebuild (docs/21a): movement, serving, tips, rating steps, arrivals, sold out, zombie
 * levels, idle wandering, called-off attacks and the cook who chases. The infection chase, cooking,
 * burning and attacks themselves are in sim.test.ts and crew.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_BY_ID,
  DISH_BY_ID,
  TUNING,
  addFurniture,
  addRating,
  addZombieXp,
  arrivalGap,
  createInitialState,
  customerSpeed,
  fireZombie,
  infect,
  makeWorker,
  maxEnergy,
  orderEat,
  rest,
  shownRating,
  soldOut,
  speedMult,
  startCooking,
  tick,
  tilesPerSec,
  workerSpeed,
  zombieLevel,
  zombies,
  type GameState,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.25) => {
  for (let t = 0; t < sec; t += dt) tick(s, dt);
};
const you = (s: GameState) => s.workers.find((w) => w.kind === 'you')!;
const stock = (s: GameState, dish = 'sliders', n = 200) => {
  s.counter[0].dish = dish;
  s.counter[0].servings = n;
};
const seatSomeone = (s: GameState) => {
  for (let i = 0; i < 4000 && !s.customers.some((c) => c.state === 'waiting' || c.state === 'eating'); i++) tick(s, 0.25);
  return s.customers.find((c) => c.state === 'waiting' || c.state === 'eating')!;
};

describe('movement (original: 2 + 0.2 x Speed; zombies 1.2x slower; running 1/0.6 faster)', () => {
  it('the speed multiplier and the paces it gives', () => {
    expect(speedMult(1)).toBeCloseTo(2.2);
    expect(speedMult(10)).toBeCloseTo(4);
    // the chef (Speed 5) walks ~1.2 tiles/s and runs ~2 (doc 19's play-through)
    expect(tilesPerSec(5)).toBeCloseTo(1.2, 5);
    expect(tilesPerSec(5, { run: true })).toBeCloseTo(2, 5);
    expect(tilesPerSec(4) / tilesPerSec(4, { zombie: true })).toBeCloseTo(1.2, 9);
    expect(tilesPerSec(4, { run: true }) / tilesPerSec(4)).toBeCloseTo(1 / 0.6, 9);
  });

  it('crew and customers move at their own Speed stat; zombies shuffle, the panicked run', () => {
    const s = createInitialState(2);
    const z = makeWorker(s, 'zombie', 'joe', { x: 3, y: 2 });
    expect(workerSpeed(you(s))).toBeCloseTo(tilesPerSec(5), 9);
    expect(workerSpeed(z)).toBeCloseTo(tilesPerSec(4) / 1.2, 9);
    const c = seatSomeone(s);
    expect(customerSpeed(c, true)).toBeCloseTo(tilesPerSec(CUSTOMER_BY_ID[c.type].stats.speed) / 0.6, 9);
  });

  it('a fired zombie runs off down the street', () => {
    const s = createInitialState(2);
    const z = makeWorker(s, 'zombie', 'joe', { x: 3, y: 2 });
    s.workers.push(z);
    expect(fireZombie(s, z.id)).toBeNull();
    expect(s.departing![0].speed).toBeCloseTo(workerSpeed(z, true), 9);
  });

  it('idle zombies wander now and then (YOU stays put), and a job interrupts the stroll', () => {
    const s = createInitialState(2);
    s.closed = true;
    const z = makeWorker(s, 'zombie', 'joe', { x: 3, y: 1 });
    z.nextDaydream = Infinity;
    z.nextBiteAt = Infinity;
    s.workers.push(z);
    const y0 = { x: you(s).x, y: you(s).y };
    const seen = new Set<string>();
    for (let i = 0; i < 240; i++) {
      tick(s, 0.25);
      seen.add(`${Math.round(z.x)},${Math.round(z.y)}`);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect({ x: you(s).x, y: you(s).y }).toEqual(y0);
  });
});

describe('serving and paying', () => {
  it('the server stays standing by the table for the whole meal, then is free again', () => {
    const s = createInitialState(6);
    s.tut = 99;
    stock(s);
    for (let i = 0; i < 4000 && !s.customers.some((c) => c.state === 'eating'); i++) tick(s, 0.1);
    const c = s.customers.find((x) => x.state === 'eating')!;
    const w = s.workers.find((x) => x.id === c.serverId)!;
    expect(w.state).toBe('serving');
    const at = { x: w.x, y: w.y };
    run(s, TUNING.eatSec - 1, 0.25);
    expect(w.state).toBe('serving');
    expect({ x: w.x, y: w.y }).toEqual(at);
    run(s, 4, 0.25);
    expect(s.customers.some((x) => x.id === c.id && x.state === 'eating')).toBe(false);
    expect(w.state).not.toBe('serving');
  });

  it('tip (original): price x 0.2 x Tips/10, rounded by chance, times the server’s tip perk', () => {
    const s = createInitialState(6);
    s.tut = 99;
    stock(s, 'gumbo');
    s.level = 2;
    let paid: { amount: number; tip: number } | undefined;
    for (let i = 0; i < 8000 && !paid; i++) {
      s.events.length = 0;
      tick(s, 0.1);
      const e = s.events.find((x) => x.t === 'coin');
      if (e && e.t === 'coin') paid = e;
    }
    expect(paid).toBeDefined();
    const raw = paid!.amount * 0.2 * (you(s).stats.tips / 10);
    expect(paid!.tip === Math.floor(raw) || paid!.tip === Math.floor(raw) + 1).toBe(true);
    expect(DISH_BY_ID.gumbo.price).toBeGreaterThan(0);
  });
});

describe('rating (original steps)', () => {
  it('+0.005 for a paid meal, -0.006 for an unhappy customer, clamped 0..1', () => {
    const s = createInitialState(1);
    s.rating = 0.5;
    addRating(s, 1);
    expect(s.rating).toBeCloseTo(0.505, 9);
    addRating(s, 0);
    expect(s.rating).toBeCloseTo(0.499, 9);
    s.rating = 0.003;
    addRating(s, 0);
    expect(s.rating).toBe(0);
  });

  it('customers arrive every 18 s at no rating down to 4.5 s at full', () => {
    const s = createInitialState(1);
    s.furniture = s.furniture.filter((f) => f.item !== 'plant_dead');
    s.floors = {};
    s.walls = { l: s.walls.l.map(() => 'plaster'), r: s.walls.r.map(() => 'plaster') };
    s.furniture = s.furniture.filter((f) => !f.item.endsWith('_dirty'));
    s.rating = 0;
    expect(arrivalGap(s)).toBeCloseTo(18 - 13.5 * shownRating(s), 6);
    s.rating = 1;
    expect(arrivalGap(s)).toBeCloseTo(4.5, 6);
  });

  it('sold out (ours, doc 13): with nothing to serve only one customer every 5 minutes looks in', () => {
    const s = createInitialState(3);
    s.rating = 0.8;
    expect(soldOut(s)).toBe(true);
    let arrivals = 0;
    const seen = new Set<string>();
    for (let t = 0; t < 900; t += 0.5) {
      tick(s, 0.5);
      for (const c of s.customers) if (!seen.has(c.id)) {
        seen.add(c.id);
        arrivals++;
      }
    }
    expect(arrivals).toBeLessThanOrEqual(Math.ceil(900 / TUNING.soldOutGapSec) + 1);
    // with food out, they come at the normal rate
    const t = createInitialState(3);
    t.rating = 0.8;
    stock(t);
    expect(soldOut(t)).toBe(false);
  });
});

describe('zombies', () => {
  it('max energy x1.03 per zombie level (original)', () => {
    const s = createInitialState(1);
    const z = makeWorker(s, 'zombie', 'joe', { x: 3, y: 1 });
    expect(maxEnergy(z)).toBe(100);
    addZombieXp(s, z, TUNING.zombieLevelXp[1]);
    expect(zombieLevel(z.xp)).toBe(2);
    expect(maxEnergy(z)).toBe(103);
    addZombieXp(s, z, TUNING.zombieLevelXp[4]);
    expect(maxEnergy(z)).toBe(Math.round(100 * Math.pow(1.03, zombieLevel(z.xp) - 1)));
  });

  it('called off mid-attack (Rest), the victim runs out the door alive', () => {
    const s = createInitialState(5);
    stock(s);
    const z = makeWorker(s, 'zombie', 'boxer', { x: 3, y: 1 });
    z.nextDaydream = Infinity;
    s.workers.push(z);
    const c = seatSomeone(s);
    expect(orderEat(s, z.id, c.id)).toBeNull();
    for (let i = 0; i < 400 && c.state !== 'cowering'; i++) tick(s, 0.05);
    expect(c.state).toBe('cowering');
    rest(s, z.id);
    tick(s, 0.05);
    expect(c.state).toBe('fleeing');
  });

  it('a cook who gives chase goes back to the stove afterwards', () => {
    const s = createInitialState(3);
    s.stats.cooked.sliders = 1;
    stock(s);
    expect(startCooking(s, you(s).id, s.stoves[0].id, 'hobodog')).toBeNull();
    const c = seatSomeone(s);
    expect(you(s).state).toBe('cooking');
    expect(infect(s, c.id)).toBeNull();
    expect(you(s).state).toBe('chasing');
    expect(s.stoves[0].status).toBe('paused');
    for (let i = 0; i < 400 && !zombies(s).length; i++) tick(s, 0.05);
    expect(zombies(s)).toHaveLength(1);
    expect(you(s).state).toBe('toStove');
    expect(s.stoves[0].cookId).toBe(you(s).id);
  });

  it('a second table lets two dine; the starting café has one', () => {
    const s = createInitialState(3);
    expect(s.furniture.filter((f) => f.item.startsWith('table_'))).toHaveLength(1);
    addFurniture(s, 'table_plain_cream', 5, 4);
    addFurniture(s, 'chair_plain_cream', 5, 3, 'sw');
    stock(s);
    let two = false;
    for (let i = 0; i < 4000 && !two; i++) {
      tick(s, 0.25);
      two = s.customers.filter((c) => c.state === 'waiting' || c.state === 'eating').length >= 2;
    }
    expect(two).toBe(true);
  });
});
