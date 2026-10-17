import { describe, expect, it } from 'vitest';
import {
  DISHES,
  DISH_BY_ID,
  FROZEN_BURN_MULT,
  TUNING,
  VARIANTS,
  VARIANT_DISHES,
  COUNTER_VARIANT_CHANCE,
  baseDishId,
  canStudy,
  createInitialState,
  dishAvailable,
  finishRaid,
  makeWorker,
  plateDish,
  retreat,
  sendAll,
  serveFromFridge,
  startCooking,
  startRaid,
  studyFromFridge,
  tick,
  variantId,
  withLearnedVariants,
  type Customer,
  type GameState,
  type RaidState,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.5) => {
  for (let t = 0; t < sec; t += dt) tick(s, dt);
};

/** A café past the tutorial's quick first dish. */
function joint(seed = 4): GameState {
  const s = createInitialState(seed);
  s.cash = 100000;
  s.stats.cooked = { sliders: 1 };
  s.tut = 99;
  return s;
}

describe('rare dish variants: the numbers', () => {
  it('six variants of every dish, ~1.5x on one stat, same art', () => {
    expect(VARIANTS.map((v) => v.id)).toEqual(['bulk', 'quick', 'spicy', 'fancy', 'frozen', 'fresh']);
    expect(VARIANT_DISHES).toHaveLength(DISHES.length * 6);
    expect(DISHES.every((d) => !d.variant)).toBe(true); // menus and level unlocks are unchanged
    const base = DISH_BY_ID.gumbo;
    const v = (id: string) => DISH_BY_ID[variantId('gumbo', id as never)];
    expect(v('bulk').servings).toBe(Math.round(base.servings * 1.5));
    expect(v('quick').cookSec).toBe(Math.round(base.cookSec / 1.5));
    expect(v('spicy').price).toBe(Math.round(base.price * 1.5));
    expect(v('fancy').xp).toBe(Math.round(base.xp * 1.5));
    expect(v('frozen').burnMult).toBe(FROZEN_BURN_MULT);
    expect(v('fresh').rateWeight).toBe(1.5);
    for (const d of VARIANT_DISHES) {
      expect(d.icon).toBe(DISH_BY_ID[d.base!].icon);
      expect(d.cost).toBe(DISH_BY_ID[d.base!].cost);
      expect(d.source).toBe('raid');
      expect(d.name.endsWith(DISH_BY_ID[d.base!].name)).toBe(true);
      expect(baseDishId(d.id)).toBe(d.base);
    }
    expect(DISH_BY_ID.spicy_sliders.name).toBe('Spicy Mystery Sliders');
    expect(baseDishId('sliders')).toBe('sliders');
  });
});

describe('rare dish variants: raids, the fridge, the stove', () => {
  /** Swipe everything off a rival's counter, then retreat: what comes home? */
  function raidHome(seed: number): { s: GameState; counter: string[]; dishes: string[] } {
    const s = createInitialState(seed);
    s.level = 12;
    s.workers.push(makeWorker(s, 'zombie', 'boxer', { x: 4, y: 4 }));
    const r = startRaid(
      s,
      'chuck',
      s.workers.filter((w) => w.kind === 'zombie').map((w) => w.id),
    ) as RaidState;
    const counter = r.counter.map((c) => c.dish);
    for (const c of r.counter) {
      r.stolen.push(c.dish);
      r.haul.push({ dish: c.dish, servings: c.servings });
      c.servings = 0;
    }
    sendAll(r); // someone has to go in for it to count as a raid
    retreat(r);
    return { s, counter, dishes: finishRaid(s, r).dishes };
  }

  it('the rival counter holds a rare variant about 40% of the time, and a swiped one comes home as it was', () => {
    expect(raidHome(42).dishes).toEqual(raidHome(42).dishes);
    let variants = 0;
    let total = 0;
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const { s, counter, dishes } = raidHome(seed);
      expect(dishes).toEqual(counter);
      for (const d of dishes) {
        total++;
        const v = DISH_BY_ID[d].variant;
        if (v) {
          variants++;
          kinds.add(v);
        }
      }
      // whatever came home is in the fridge
      expect(s.fridge.map((f) => f.dish)).toEqual(dishes);
    }
    expect(variants / total).toBeGreaterThan(COUNTER_VARIANT_CHANCE - 0.08);
    expect(variants / total).toBeLessThan(COUNTER_VARIANT_CHANCE + 0.08);
    expect(kinds.size).toBe(6);
    void baseDishId;
  });

  it('UNLOCK in the fridge learns the variant; then it cooks from the stove', () => {
    const s = joint();
    const id = 'spicy_sliders';
    expect(dishAvailable(s, id)).toBe(false);
    expect(startCooking(s, s.workers[0].id, s.stoves[0].id, id)).toMatch(/raid/);
    s.fridge.push({ dish: id, servings: 6 }, { dish: id, servings: 6 });
    expect(canStudy(s, id)).toBe(true);
    const studied = s.stats.studied;
    expect(studyFromFridge(s, 0)).toBeNull();
    expect(s.recipes).toContain(id);
    expect(s.stats.studied).toBe(studied + 1);
    expect(canStudy(s, id)).toBe(false);
    expect(studyFromFridge(s, 0)).toMatch(/Already/);
    // the spare one can still be served
    expect(serveFromFridge(s, 0)).toBeNull();
    expect(s.counter.some((c) => c.dish === id && c.servings === 6)).toBe(true);
    // the dish picker and cookbook list it right under the plain dish
    const menu = withLearnedVariants(s).map((d) => d.id);
    expect(menu.indexOf(id)).toBe(menu.indexOf('sliders') + 1);
    expect(menu.filter((d) => DISH_BY_ID[d].variant)).toEqual([id]);
    expect(startCooking(s, s.workers[0].id, s.stoves[0].id, id)).toBeNull();
    expect(s.stoves[0].dish).toBe(id);
  });

  function cook(id: string, seed = 4) {
    const s = joint(seed);
    s.recipes.push(id);
    s.level = 3;
    expect(startCooking(s, s.workers[0].id, s.stoves[0].id, id)).toBeNull();
    const total = s.stoves[0].total!;
    run(s, total + 10);
    return { s, st: s.stoves[0], total };
  }

  it('Quick cooks faster, Fancy gives more XP, Frozen burns later', () => {
    const plain = cook('gumbo');
    const quick = cook('quick_gumbo');
    expect(quick.total).toBeCloseTo(plain.total / 1.5, 0);
    const xpOf = (id: string) => {
      const s = joint();
      s.level = 3;
      s.chefRank = 10; // keep chef-rank milestone bonuses out of the count
      s.recipes.push(id);
      startCooking(s, s.workers[0].id, s.stoves[0].id, id);
      run(s, s.stoves[0].total! + 10);
      // what the dish pays when it reaches the counter
      return s.stoves[0].xp!;
    };
    expect(xpOf('fancy_gumbo')).toBe(Math.round(DISH_BY_ID.gumbo.xp * 1.5));
    expect(xpOf('gumbo')).toBe(DISH_BY_ID.gumbo.xp);
    const frozen = cook('frozen_gumbo');
    expect(plain.st.status).toBe('done');
    expect(frozen.st.status).toBe('done');
    const plainWait = plain.st.burnAt! - plain.s.now;
    const frozenWait = frozen.st.burnAt! - frozen.s.now;
    expect(frozenWait / plainWait).toBeCloseTo(FROZEN_BURN_MULT, 1);
  });

  it('Bulk plates 1.5x the servings onto the counter', () => {
    const plated = (id: string) => {
      const s = joint();
      s.closed = true; // nobody eats it before we count
      s.recipes.push(id);
      startCooking(s, s.workers[0].id, s.stoves[0].id, id);
      run(s, s.stoves[0].total! + 5);
      expect(plateDish(s, s.stoves[0].id)).toBeNull();
      run(s, 30);
      return s.counter.reduce((a, c) => a + (c.dish === id ? c.servings : 0), 0);
    };
    expect(plated('sliders')).toBe(DISH_BY_ID.sliders.servings);
    expect(plated('bulk_sliders')).toBe(Math.round(DISH_BY_ID.sliders.servings * 1.5));
  });

  /** One diner finishing a plate of `dish`: what they pay and how much the rating moves. */
  function diner(dish: string) {
    const s = joint();
    s.closed = true;
    s.rating = 0.3;
    const c: Customer = { id: 'cX', type: 'joe', state: 'eating', x: 3, y: 2, path: [], speed: 0, facing: 1, waitLeft: 60, eatEnd: s.now + 0.2, dish };
    s.customers.push(c);
    const cash = s.cash;
    tick(s, 0.5);
    const coin = s.events.find((e) => e.t === 'coin');
    return { paid: s.cash - cash, amount: coin && coin.t === 'coin' ? coin.amount : 0, rise: s.rating - 0.3 };
  }

  it('Spicy diners pay 1.5x; Fresh diners lift the rating 1.5x', () => {
    expect(diner('spicy_gumbo').amount).toBe(Math.round(DISH_BY_ID.gumbo.price * 1.5));
    expect(diner('gumbo').amount).toBe(DISH_BY_ID.gumbo.price);
    const plain = diner('gumbo').rise;
    const fresh = diner('fresh_gumbo').rise;
    expect(plain).toBeGreaterThan(0);
    expect(fresh).toBeGreaterThan(plain * 1.4);
    expect(fresh).toBeLessThan(plain * 1.6);
    expect(plain).toBeCloseTo(TUNING.ratingServe, 4);
  });
});
