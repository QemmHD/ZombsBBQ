import { describe, expect, it } from 'vitest';
import {
  PURPLE,
  TUNING,
  addToCounter,
  arrivalGap,
  bribeTodo,
  criticReview,
  paintFloor,
  skipTodo,
  buyAndPlace,
  cookedCount,
  createInitialState,
  customerStars,
  deserialize,
  drawTodo,
  purpleLeft,
  purpleStars,
  serialize,
  stars,
  tick,
  todoDone,
  todoProgress,
  todoText,
  type GameEvent,
  type GameState,
} from '../src/sim';

const H = 3600;

function at(level: number, seed = 7): GameState {
  const s = createInitialState(seed);
  s.level = level;
  s.crewCap = 10;
  tick(s, 0.1);
  return s;
}

/** Push every counter the list watches far past its target. */
function doEverything(s: GameState) {
  s.stats.served += 1000;
  s.stats.cleared += 1000;
  s.stats.earned += 1e6;
  s.stats.raidsWon += 50;
  s.stats.infected += 50;
  s.stats.decor += 50;
  s.stats.spent += 1e6;
  for (const t of s.todo!.tasks) if (t.dish) s.stats.cooked[t.dish] = (s.stats.cooked[t.dish] ?? 0) + 50;
}

describe('Gus’s to-do list', () => {
  it('is locked before level 6', () => {
    const s = at(5);
    expect(s.todo).toBeUndefined();
    expect(bribeTodo(s, 0)).toMatch(/level 6/);
    expect(purpleStars(s)).toBe(0);
  });

  it('draws four distinct, deterministic jobs at level 6', () => {
    const a = at(6);
    const b = at(6);
    expect(a.todo!.tasks).toHaveLength(PURPLE.tasks);
    expect(new Set(a.todo!.tasks.map((t) => t.kind)).size).toBe(PURPLE.tasks);
    expect(a.todo).toEqual(b.todo);
    for (const t of a.todo!.tasks) {
      expect(t.target).toBeGreaterThanOrEqual(1);
      expect(todoText(t)).not.toMatch(/undefined/);
      expect(todoDone(a, t)).toBe(false);
    }
    // the draw never touches the café's own random stream
    const c = createInitialState(7);
    c.level = 6;
    c.crewCap = 10;
    const rng = c.rng;
    drawTodo(c, 0);
    expect(c.rng).toBe(rng);
  });

  it('scales the counts with level and draws from what the player can do', () => {
    const lo = at(6);
    const hi = at(26);
    const target = (s: GameState, kind: string) => {
      for (let n = 0; n < 40; n++) {
        const t = drawTodo(s, n).tasks.find((x) => x.kind === kind);
        if (t) return t.target;
      }
      throw new Error(`no ${kind} task drawn`);
    };
    for (const k of ['serve', 'clear', 'earn', 'raid', 'decor', 'spend']) expect(target(hi, k)).toBeGreaterThan(target(lo, k));
    expect(target(lo, 'serve')).toBe(60); // original: serve 10 x level
    expect(target(lo, 'spend')).toBe(600); // original: spend $100 x level
    // a full crew is never asked to infect anyone; cook jobs are dishes it can actually make
    const full = at(6);
    full.crewCap = 0;
    for (let n = 0; n < 40; n++) {
      const list = drawTodo(full, n);
      expect(list.tasks.some((t) => t.kind === 'infect')).toBe(false);
      for (const t of list.tasks) if (t.kind === 'cook') expect(['sliders', 'hobodog', 'gumbo', 'tacos', 'broth', 'meatloaf']).toContain(t.dish);
    }
  });

  it('counts progress from when the list was drawn', () => {
    const s = at(6);
    s.stats.served = 500; // history before the list doesn't count…
    const fresh = drawTodo(s, 3);
    s.todo = { ...fresh, tasks: [{ kind: 'serve', target: 22, base: 500 }, ...fresh.tasks.filter((t) => t.kind !== 'serve').slice(0, 3)] };
    const serve = s.todo.tasks[0];
    expect(todoProgress(s, serve)).toBe(0);
    s.stats.served += 5;
    expect(todoProgress(s, serve)).toBe(5);
    s.stats.served += 100;
    expect(todoProgress(s, serve)).toBe(22);
    expect(todoDone(s, serve)).toBe(true);
    // cook jobs count the dish's rare variants too
    s.stats.cooked = { sliders: 1, spicy_sliders: 2, frozen_sliders: 1, gumbo: 4 };
    expect(cookedCount(s, 'sliders')).toBe(4);
  });

  it('buying a decoration ticks off a decor job', () => {
    const s = at(6);
    s.cash = 1e6;
    const decor0 = s.stats.decor;
    expect(buyAndPlace(s, 'plant_potted', 6, 5)).toBeNull();
    expect(s.stats.decor).toBe(decor0 + 1);
  });

  it('finishing the list pays a purple star (48 h) and draws a new list', () => {
    const s = at(6);
    const first = s.todo!;
    doEverything(s);
    s.events.length = 0;
    tick(s, 0.1);
    expect(purpleStars(s)).toBe(1);
    expect(purpleLeft(s)).toBeCloseTo(48 * H, 0);
    expect(s.events.some((e: GameEvent) => e.t === 'purple' && e.gained && e.stars === 1)).toBe(true);
    expect(s.todo!.n).toBe(first.n + 1);
    expect(s.todo!.tasks.every((t) => !todoDone(s, t))).toBe(true);
  });

  it('stars stack to three: 48 h, +36 h, +24 h, then top-ups are capped; then they all drop', () => {
    const s = at(6);
    const finishList = () => {
      doEverything(s);
      tick(s, 0.1);
    };
    finishList();
    const t1 = s.purple!.until;
    finishList();
    expect(purpleStars(s)).toBe(2);
    expect(s.purple!.until).toBeCloseTo(t1 + 36 * H, 3);
    finishList();
    expect(purpleStars(s)).toBe(3);
    expect(s.purple!.until).toBeCloseTo(t1 + 60 * H, 3);
    finishList();
    expect(purpleStars(s)).toBe(PURPLE.max);
    expect(purpleLeft(s)).toBeLessThanOrEqual(PURPLE.capHours * H + 1e-6);
    // the timer runs out: every purple star drops at once
    s.now = s.purple!.until - 0.05;
    s.events.length = 0;
    tick(s, 0.1);
    expect(purpleStars(s)).toBe(0);
    expect(s.purple).toBeUndefined();
    expect(s.events.some((e) => e.t === 'purple' && !e.gained)).toBe(true);
  });

  it('bribing the reviewer ticks off a job for 2 Brain Sauce each', () => {
    const s = at(6);
    s.sauce = 7;
    expect(bribeTodo(s, 9)).toMatch(/Nothing/);
    expect(bribeTodo(s, 0)).toBeNull();
    expect(s.sauce).toBe(7 - PURPLE.bribeSauce);
    expect(todoDone(s, s.todo!.tasks[0])).toBe(true);
    expect(bribeTodo(s, 0)).toMatch(/Already/);
    expect(bribeTodo(s, 1)).toBeNull();
    expect(bribeTodo(s, 2)).toBeNull();
    expect(s.sauce).toBe(1);
    expect(bribeTodo(s, 3)).toMatch(/Brain Sauce/);
    expect(purpleStars(s)).toBe(0);
    s.sauce = 2;
    expect(bribeTodo(s, 3)).toBeNull(); // the last one completes the list on the spot
    expect(purpleStars(s)).toBe(1);
    expect(s.todo!.n).toBe(1);
  });

  it('survives a save round-trip; old saves without it still load', () => {
    const s = at(6);
    s.sauce = 10;
    bribeTodo(s, 1);
    doEverything(s);
    tick(s, 0.1);
    bribeTodo(s, 2);
    const raw = serialize(s, 1_000_000);
    const back = deserialize(raw, 1_000_000).state;
    expect(back.todo).toEqual(s.todo);
    expect(back.purple).toEqual(s.purple);
    expect(purpleStars(back)).toBe(1);
    // an older v3 save: no list, no purple stars, no decor counter
    const old = JSON.parse(serialize(createInitialState(3), 1000));
    delete old.state.todo;
    delete old.state.purple;
    delete old.state.stats.decor;
    old.state.level = 7;
    const loaded = deserialize(JSON.stringify(old), 1000).state;
    expect(loaded.stats.decor).toBe(0);
    tick(loaded, 0.1);
    expect(loaded.todo!.tasks).toHaveLength(4);
  });

  it('the purple timer keeps running past the 8 h offline cap', () => {
    const s = at(6);
    doEverything(s);
    tick(s, 0.1); // one star, 48 h
    const saved = serialize(s, 0);
    const day = deserialize(saved, 24 * H * 1000).state;
    expect(purpleStars(day)).toBe(1);
    expect(purpleLeft(day)).toBeCloseTo(24 * H, -1);
    const gone = deserialize(saved, 49 * H * 1000).state;
    expect(purpleStars(gone)).toBe(0);
  });
});

describe('purple stars boost the joint', () => {
  it('more frequent arrivals and rarer customers', () => {
    const s = at(6);
    s.rating = 0.6;
    const gap0 = arrivalGap(s);
    const st0 = customerStars(s);
    expect(st0).toBe(stars(s));
    s.purple = { stars: 3, until: s.now + 48 * H };
    expect(arrivalGap(s)).toBeCloseTo(gap0 / (1 + 3 * TUNING.purpleArrivalBoost), 6);
    expect(customerStars(s)).toBe(st0 + 1.5);
  });

  it('a joint with three purple stars serves more customers and earns bigger tips', () => {
    const run = (purple: number) => {
      const s = createInitialState(11);
      s.level = 6;
      s.rating = 0.5;
      s.tut = 99;
      if (purple) s.purple = { stars: purple, until: 1e9 };
      addToCounter(s, 'sliders', 5000);
      let tips = 0;
      let paid = 0;
      for (let t = 0; t < 40 * 60; t += 0.5) {
        tick(s, 0.5);
        for (const e of s.events) if (e.t === 'coin') (tips += e.tip), (paid += e.amount);
        s.events.length = 0;
        s.workers[0].energy = 100;
      }
      return { served: s.stats.served, tipRate: tips / Math.max(1, paid) };
    };
    const plain = run(0);
    const boosted = run(3);
    expect(boosted.served).toBeGreaterThan(plain.served);
    expect(boosted.tipRate).toBeGreaterThan(plain.tipRate);
  });
});

describe('to-do list: skip, spend, a week cap and the critic', () => {
  it('Skip swaps one unfinished task for a different job, free, once per list', () => {
    const s = at(6);
    const sauce = s.sauce;
    const cash = s.cash;
    const before = s.todo!.tasks.map((t) => t.kind);
    expect(skipTodo(s, 9)).toMatch(/Nothing/);
    expect(skipTodo(s, 1)).toBeNull();
    const after = s.todo!.tasks.map((t) => t.kind);
    expect(after[1]).not.toBe(before[1]);
    expect(new Set(after).size).toBe(PURPLE.tasks); // still four distinct jobs
    expect(after.filter((_, i) => i !== 1)).toEqual(before.filter((_, i) => i !== 1));
    expect(todoDone(s, s.todo!.tasks[1])).toBe(false);
    expect([s.sauce, s.cash]).toEqual([sauce, cash]);
    expect(skipTodo(s, 2)).toMatch(/one skip/i);
    // a fresh list gets a fresh skip
    doEverything(s);
    tick(s, 0.1);
    expect(s.todo!.skipped).toBeFalsy();
    expect(skipTodo(s, 0)).toBeNull();
  });

  it('finished tasks and locked lists cannot be skipped', () => {
    const lo = at(5);
    expect(skipTodo(lo, 0)).toMatch(/level 6/);
    const s = at(6);
    s.sauce = 10;
    bribeTodo(s, 0);
    expect(skipTodo(s, 0)).toMatch(/Already/);
  });

  it('a spend task counts cash spent on the café itself', () => {
    const s = at(6);
    s.cash = 1e6;
    s.todo = { n: 0, tasks: [{ kind: 'spend', target: 600, base: s.stats.spent }, ...s.todo!.tasks.filter((t) => t.kind !== 'spend').slice(0, 3)] };
    const t = s.todo.tasks[0];
    expect(todoText(t)).toBe('Spend $600 on your café');
    expect(buyAndPlace(s, 'plant_potted', 6, 5)).toBeNull();
    const spent1 = todoProgress(s, t);
    expect(spent1).toBeGreaterThan(0);
    expect(paintFloor(s, 1, 1, 'tile')).toBeNull();
    expect(todoProgress(s, t)).toBeGreaterThan(spent1);
  });

  it('purple stars top out a week away (168 h)', () => {
    expect(PURPLE.capHours).toBe(168);
    const s = at(6);
    for (let i = 0; i < 12; i++) {
      doEverything(s);
      tick(s, 0.1);
    }
    expect(purpleStars(s)).toBe(3);
    expect(purpleLeft(s)).toBeGreaterThan(108 * H);
    expect(purpleLeft(s)).toBeLessThanOrEqual(168 * H + 1e-6);
  });

  it('a newspaper review comes with every purple star, deterministic and about this joint', () => {
    const s = at(6);
    s.name = 'Rib Crypt';
    s.stats.cooked = { gumbo: 9, sliders: 2 };
    doEverything(s);
    tick(s, 0.1);
    const r = criticReview(s);
    expect(r.stars).toBe(1);
    expect(r.paper.length).toBeGreaterThan(3);
    expect(r.critic.length).toBeGreaterThan(3);
    expect(`${r.headline} ${r.body}`).toMatch(/Rib Crypt/);
    expect(r.body).toMatch(/Gutter Gumbo/);
    expect(r.verdict).toBeTruthy();
    expect(criticReview(s)).toEqual(r);
    // no name yet: the critic uses the default
    s.name = undefined;
    expect(criticReview(s).body).toMatch(/Zombs BBQ/);
    for (const v of Object.values(r)) expect(String(v)).not.toMatch(/undefined|NaN/);
  });
});
