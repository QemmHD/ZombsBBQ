import { describe, expect, it } from 'vitest';
import {
  CUSTOMERS,
  activeGoals,
  buyAndPlace,
  claimGoal,
  collectPayout,
  createInitialState,
  deserialize,
  furnAt,
  payoutState,
  serialize,
  serveFromFridge,
  spawnWeight,
  startCooking,
  studyFromFridge,
  tick,
  dishAvailable,
  type GameState,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.5) => {
  for (let t = 0; t < sec; t += dt) tick(s, dt);
};

describe('goals (the clipboard)', () => {
  it('shows three at a time, in order, and pays out once each', () => {
    const s = createInitialState(2);
    expect(activeGoals(s).map((g) => g.id)).toEqual(['cook1', 'serve10', 'infect1']);
    expect(claimGoal(s, 'cook1')).toMatch(/Not done/);
    startCooking(s, s.workers[0].id, s.stoves[0].id, 'sliders');
    run(s, 40);
    const cash = s.cash;
    expect(claimGoal(s, 'cook1')).toBeNull();
    expect(s.cash).toBe(cash + 50);
    expect(claimGoal(s, 'cook1')).toMatch(/Already/);
    expect(activeGoals(s)[0].id).toBe('serve10');
    expect(claimGoal(s, 'zombies2')).toMatch(/earlier goals/);
  });
});

describe('the fridge', () => {
  it('serves leftovers to the counter and studies stolen dishes into the cookbook', () => {
    const s = createInitialState(2);
    s.fridge.push({ dish: 'chili', servings: 12 }, { dish: 'hobodog', servings: 6 });
    expect(dishAvailable(s, 'chili')).toBe(false);
    expect(studyFromFridge(s, 1)).toMatch(/already know/);
    expect(studyFromFridge(s, 0)).toBeNull();
    expect(dishAvailable(s, 'chili')).toBe(true);
    expect(s.fridge).toHaveLength(1);
    expect(serveFromFridge(s, 0)).toBeNull();
    expect(s.counter.some((c) => c.dish === 'hobodog' && c.servings === 6)).toBe(true);
  });
});

describe('money-makers and pets', () => {
  it('money-makers earn cash per hour up to a cap, and pay out when tapped', () => {
    const s = createInitialState(2);
    s.cash = 100000;
    expect(buyAndPlace(s, 'vending', 6, 5)).toBeNull();
    const f = furnAt(s, 6, 5)!;
    expect(payoutState(s, f.id)).toBe('none');
    expect(collectPayout(s, f.id)).toBe(0);
    run(s, 3600, 2);
    expect(payoutState(s, f.id)).toBe('cash');
    const cash = s.cash;
    expect(collectPayout(s, f.id)).toBe(25); // $25/hour
    expect(s.cash).toBe(cash + 25);
    run(s, 11 * 3600, 5);
    expect(payoutState(s, f.id)).toBe('full'); // capped at $250
    expect(collectPayout(s, f.id)).toBe(250);
  });

  it('a pug house adopts a pug that sniffs out coins', () => {
    const s = createInitialState(4);
    s.cash = 10000;
    s.level = 5;
    expect(buyAndPlace(s, 'pethouse_pug', 8, 2)).toBeNull(); // pet houses go on the lawn
    run(s, 1);
    expect(s.pets).toHaveLength(1);
    let found = 0;
    for (let i = 0; i < 1200; i++) {
      tick(s, 0.5);
      for (const e of s.events.splice(0)) if (e.t === 'petFind') found += e.amount;
    }
    expect(found).toBeGreaterThan(0);
  });
});

describe('customers and the Zombiepedia', () => {
  it('rare customers get more common as your stars climb past their requirement', () => {
    const critic = CUSTOMERS.find((c) => c.id === 'critic')!;
    expect(spawnWeight(critic, 5)).toBeGreaterThan(spawnWeight(critic, 3.5) * 2);
  });

  it('records who you have met and infected', () => {
    const s = createInitialState(9);
    s.counter[0].dish = 'sliders';
    s.counter[0].servings = 100;
    run(s, 60);
    expect(Object.keys(s.seen).length).toBeGreaterThan(0);
  });
});

describe('saves', () => {
  it('round-trips the full state', () => {
    const s = createInitialState(9);
    s.fridge.push({ dish: 'smash', servings: 10 });
    s.wallItems.push({ id: 'wlX', item: 'clock', wall: 'r', index: 3 });
    s.floors['2,2'] = 'checker';
    const back = deserialize(serialize(s, 1000), 1000).state;
    expect(back.fridge).toEqual(s.fridge);
    expect(back.wallItems).toEqual(s.wallItems);
    expect(back.floors).toEqual(s.floors);
    expect(back.furniture).toEqual(s.furniture);
  });
});
