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
  payoutReady,
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
    startCooking(s, s.workers[0].id, s.stoves[0].id, 'hotdog');
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
    s.fridge.push({ dish: 'chili', servings: 12 }, { dish: 'hotdog', servings: 6 });
    expect(dishAvailable(s, 'chili')).toBe(false);
    expect(studyFromFridge(s, 1)).toMatch(/already know/);
    expect(studyFromFridge(s, 0)).toBeNull();
    expect(dishAvailable(s, 'chili')).toBe(true);
    expect(s.fridge).toHaveLength(1);
    expect(serveFromFridge(s, 0)).toBeNull();
    expect(s.counter.some((c) => c.dish === 'hotdog' && c.servings === 6)).toBe(true);
  });
});

describe('money-makers and pets', () => {
  it('money-makers pay out on a timer when tapped', () => {
    const s = createInitialState(2);
    s.cash = 10000;
    s.level = 5;
    expect(buyAndPlace(s, 'vending', 6, 6)).toBeNull();
    const f = furnAt(s, 6, 6)!;
    expect(payoutReady(s, f.id)).toBe(false);
    expect(collectPayout(s, f.id)).toBe(0);
    run(s, 1201, 1);
    expect(payoutReady(s, f.id)).toBe(true);
    const cash = s.cash;
    expect(collectPayout(s, f.id)).toBe(60);
    expect(s.cash).toBe(cash + 60);
    expect(payoutReady(s, f.id)).toBe(false);
  });

  it('a pug house adopts a pug that sniffs out coins', () => {
    const s = createInitialState(4);
    s.cash = 10000;
    s.level = 5;
    expect(buyAndPlace(s, 'pethouse_pug', 6, 6)).toBeNull();
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
    s.counter[0].dish = 'hotdog';
    s.counter[0].servings = 100;
    run(s, 60);
    expect(Object.keys(s.seen).length).toBeGreaterThan(0);
  });
});

describe('saves', () => {
  it('migrates a version-1 save from the first prototype', () => {
    const v1 = {
      version: 1,
      now: 100,
      rng: 5,
      nextId: 40,
      cash: 999,
      sauce: 3,
      xp: 10,
      level: 2,
      crewCap: 4,
      ratingPts: 50,
      furniture: [
        { id: 'f1', kind: 'grill', x: 2, y: 0 },
        { id: 'f2', kind: 'smoker', x: 3, y: 0, locked: true },
        { id: 'f3', kind: 'counter', x: 0, y: 2 },
        { id: 'f9', kind: 'table', x: 3, y: 3 },
        { id: 'f10', kind: 'bench', x: 2, y: 3, tableId: 'f9', side: -1 },
        { id: 'f11', kind: 'bench', x: 4, y: 3, tableId: 'f9', side: 1 },
      ],
      stoves: [
        { id: 's2', furnitureId: 'f1', kind: 'grill', status: 'empty' },
        { id: 's3', furnitureId: 'f2', kind: 'smoker', status: 'empty' },
      ],
      counter: [{ id: 'c4', furnitureId: 'f3', servings: 0 }],
      customers: [],
      workers: [],
      spawnCooldown: 3,
      tut: 7,
      tutTimer: 0,
      freeInfects: 0,
      stats: { served: 5, earned: 50, bites: 0, infected: 0, happy: 5, angry: 0 },
      events: [],
    };
    const { state } = deserialize(JSON.stringify({ savedAt: 0, state: v1 }), 0);
    expect(state.version).toBe(2);
    expect(state.cash).toBe(999);
    expect(state.furniture.some((f) => f.item === 'smoker')).toBe(false); // was locked at level 2
    expect(state.stoves).toHaveLength(1);
    expect(state.furniture.find((f) => f.id === 'f10')!.dir).toBe('se');
    run(state, 5);
  });

  it('round-trips the full v2 state', () => {
    const s = createInitialState(9);
    s.fridge.push({ dish: 'smash', servings: 10 });
    s.walls.push({ id: 'wlX', item: 'wall_clock', wall: 'r', index: 3 });
    const back = deserialize(serialize(s, 1000), 1000).state;
    expect(back.fridge).toEqual(s.fridge);
    expect(back.walls).toEqual(s.walls);
    expect(back.furniture).toEqual(s.furniture);
  });
});
