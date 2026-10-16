import { describe, expect, it } from 'vitest';
import {
  DOOR_X,
  TUNING,
  attackThreshold,
  cancelCooking,
  discardCounter,
  finishCost,
  finishNow,
  makeWorker,
  setClosed,
  createInitialState,
  deserialize,
  edgeBlocked,
  findPath,
  infect,
  plateDish,
  refill,
  rest,
  serialize,
  startCooking,
  tick,
  zombies,
  type GameState,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.25) => {
  for (let t = 0; t < sec; t += dt) tick(s, dt);
};
const you = (s: GameState) => s.workers.find((w) => w.kind === 'you')!;
const grill = (s: GameState) => s.stoves.find((x) => x.kind === 'grill')!;

describe('grid', () => {
  it('only lets you through the back wall at the door', () => {
    expect(edgeBlocked(DOOR_X, 0, DOOR_X, -1, 8)).toBe(false);
    expect(edgeBlocked(DOOR_X - 1, 0, DOOR_X - 1, -1, 8)).toBe(true);
    expect(edgeBlocked(0, 3, -1, 3, 8)).toBe(true);
    const p = findPath({ x: 1, y: -2 }, { x: 1, y: 1 }, new Set(), 8)!;
    expect(p).not.toBeNull();
    expect(p.some((pt) => pt.x === DOOR_X && pt.y === 0)).toBe(true);
  });
});

describe('cooking (tap cook, then stove; burns if left too long)', () => {
  it('YOU cooks a hot dog, it finishes, gets plated to the counter', () => {
    const s = createInitialState(7);
    const cash = s.cash;
    expect(startCooking(s, you(s).id, grill(s).id, 'hotdog')).toBeNull();
    expect(s.cash).toBe(cash - 10);
    run(s, 40);
    expect(grill(s).status).toBe('done');
    expect(s.level >= 1 && s.xp + s.level > 1).toBe(true);
    expect(plateDish(s, grill(s).id)).toBeNull();
    expect(s.counter.reduce((a, c) => a + c.servings, 0)).toBeGreaterThan(0);
  });

  it('a finished dish burns once it sits around too long, and the money is lost', () => {
    const s = createInitialState(7);
    startCooking(s, you(s).id, grill(s).id, 'hotdog');
    run(s, 30);
    expect(grill(s).status).toBe('done');
    run(s, 40);
    expect(grill(s).status).toBe('burnt');
    plateDish(s, grill(s).id); // clears the burnt lump
    expect(grill(s).status).toBe('empty');
  });

  it('refuses the wrong station, dishes above your level and unstudied raid recipes', () => {
    const s = createInitialState(7);
    expect(startCooking(s, you(s).id, grill(s).id, 'pork')).toMatch(/smoker/);
    expect(startCooking(s, you(s).id, grill(s).id, 'wings')).toMatch(/level 3/);
    expect(startCooking(s, you(s).id, grill(s).id, 'chili')).toMatch(/raid/);
  });
});

describe('customers and serving', () => {
  it('customers arrive, get served from the counter, pay and leave happy', () => {
    const s = createInitialState(11);
    s.counter[0].dish = 'hotdog';
    s.counter[0].servings = 20;
    const cash = s.cash;
    run(s, 120);
    expect(s.stats.served).toBeGreaterThan(2);
    expect(s.cash).toBeGreaterThan(cash);
    expect(s.stats.happy).toBeGreaterThan(0);
  });

  it('with no food, customers eventually leave angry and the rating drops', () => {
    const s = createInitialState(11);
    const r0 = s.ratingPts;
    run(s, 150);
    expect(s.stats.angry).toBeGreaterThan(0);
    expect(s.ratingPts).toBeLessThan(r0);
  });
});

describe('YOU are Patient Zero: infecting customers builds the crew', () => {
  it('first infection is free and turns the customer into a zombie worker', () => {
    const s = createInitialState(3);
    s.counter[0].dish = 'hotdog';
    s.counter[0].servings = 50;
    let target;
    for (let i = 0; i < 400 && !target; i++) {
      tick(s, 0.25);
      target = s.customers.find((c) => c.state === 'waiting' || c.state === 'eating');
    }
    expect(target).toBeTruthy();
    const cash = s.cash;
    expect(infect(s, target!.id)).toBeNull();
    expect(s.cash).toBe(cash); // tutorial infection is free
    run(s, 2);
    expect(zombies(s)).toHaveLength(1);
    expect(zombies(s)[0].type).toBe(target!.type);
    expect(s.freeInfects).toBe(0);
  });

  it('respects the crew cap', () => {
    const s = createInitialState(3);
    s.crewCap = 0;
    s.counter[0].dish = 'hotdog';
    s.counter[0].servings = 50;
    let target;
    for (let i = 0; i < 400 && !target; i++) {
      tick(s, 0.25);
      target = s.customers.find((c) => c.state === 'waiting');
    }
    expect(infect(s, target!.id)).toMatch(/Crew is full/);
  });
});

describe('energy, patience, biting, resting, daydreaming', () => {
  const withZombie = () => {
    const s = createInitialState(5);
    s.counter[0].dish = 'hotdog';
    s.counter[0].servings = 200;
    let target;
    for (let i = 0; i < 400 && !target; i++) {
      tick(s, 0.25);
      target = s.customers.find((c) => c.state === 'waiting' || c.state === 'eating');
    }
    infect(s, target!.id);
    run(s, 2);
    return { s, z: zombies(s)[0] };
  };

  it('patience threshold matches the original (P1 ≈ 20%, P10 ≈ 2%)', () => {
    expect(attackThreshold(1)).toBeCloseTo(0.2);
    expect(attackThreshold(10)).toBeCloseTo(0.02);
  });

  it('a starving zombie bites a customer, who flees; the zombie gets energy back', () => {
    const { s, z } = withZombie();
    z.energy = 1;
    z.nextDaydream = Infinity;
    let before = s.ratingPts;
    for (let i = 0; i < 240 && s.stats.bites === 0; i++) {
      before = s.ratingPts;
      tick(s, 0.25);
    }
    expect(s.stats.bites).toBe(1);
    expect(s.ratingPts).toBeLessThan(before);
    expect(z.energy).toBeGreaterThan(TUNING.biteEnergyGain * 0.9);
    expect(s.customers.some((c) => c.state === 'fleeing')).toBe(true);
  });

  it('resting on the lawn refills energy, and Brain Sauce refills instantly', () => {
    const { s, z } = withZombie();
    z.energy = 10;
    expect(rest(s, z.id)).toBeNull();
    run(s, 20);
    expect(['toRest', 'resting']).toContain(z.state);
    const e = z.energy;
    run(s, 30);
    expect(z.energy).toBeGreaterThan(e);
    const sauce = s.sauce;
    expect(refill(s, z.id)).toBeNull();
    expect(z.energy).toBe(z.stats.energy);
    expect(s.sauce).toBe(sauce - 1);
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

describe('saving and offline progress', () => {
  it('round-trips and keeps earning while you are away (capped at 8h)', () => {
    const s = createInitialState(9);
    s.counter[0].dish = 'hotdog';
    s.counter[0].servings = 300;
    const raw = serialize(s, 1_000_000);
    const back = deserialize(raw, 1_000_000 + 30 * 60 * 1000);
    expect(back.offlineSec).toBeCloseTo(1800);
    expect(back.state.stats.served).toBeGreaterThan(5);
    expect(back.offlineCash).toBeGreaterThan(0);
  });

  it('starts fresh on garbage', () => {
    expect(deserialize('{nope', 0).state.level).toBe(1);
  });
});

describe('stove + counter + sign controls', () => {
  const cookingGrill = () => {
    const s = createInitialState(3);
    s.cash = 500;
    expect(startCooking(s, you(s).id, grill(s).id, 'hotdog')).toBeNull();
    for (let i = 0; i < 200 && grill(s).status !== 'cooking'; i++) tick(s, 0.1);
    expect(grill(s).status).toBe('cooking');
    return s;
  };

  it('Brain Sauce finishes a dish instantly, priced by the time left', () => {
    const s = cookingGrill();
    s.sauce = 0;
    expect(finishNow(s, grill(s).id)).toMatch(/Brain Sauce/);
    s.sauce = 3;
    const cost = finishCost(s, grill(s).id);
    expect(cost).toBe(1);
    expect(finishNow(s, grill(s).id)).toBeNull();
    expect(grill(s).status).toBe('done');
    expect(s.sauce).toBe(3 - cost);
    expect(you(s).state).toBe('idle');
  });

  it('cancelling refunds half the ingredients and frees the cook', () => {
    const s = cookingGrill();
    const cash = s.cash;
    expect(cancelCooking(s, grill(s).id)).toBeNull();
    expect(s.cash).toBe(cash + Math.floor(10 * TUNING.sellBack));
    expect(grill(s).status).toBe('empty');
    expect(you(s).state).toBe('idle');
    expect(cancelCooking(s, grill(s).id)).not.toBeNull();
  });

  it('discarding empties a counter slot', () => {
    const s = createInitialState(3);
    s.counter[0].dish = 'hotdog';
    s.counter[0].servings = 4;
    expect(discardCounter(s, s.counter[0].id)).toBeNull();
    expect(s.counter[0].servings).toBe(0);
    expect(discardCounter(s, s.counter[0].id)).not.toBeNull();
  });

  it('a closed joint gets no new customers, and tired idle zombies go nap', () => {
    const s = createInitialState(3);
    const z = makeWorker(s, 'zombie', 'teen', { x: 4, y: 4 });
    z.energy = 40;
    s.workers.push(z);
    setClosed(s, true);
    expect(['toRest', 'resting']).toContain(z.state);
    s.customers = [];
    run(s, 120);
    expect(s.customers).toHaveLength(0);
    setClosed(s, false);
    run(s, 60);
    expect(s.customers.length).toBeGreaterThan(0);
  });
});
