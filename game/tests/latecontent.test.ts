/**
 * The late game (levels 10-40): new dishes and stations, the late crowd, shop items, the Magic Fridge,
 * chef ranks, Very variants, the Frequent Fryer, stove upgrades and table sets.
 */
import { describe, expect, it } from 'vitest';
import {
  CHEF_RANKS,
  CUSTOMERS,
  DISHES,
  DISH_BY_ID,
  FRYER_RARE_CHANCE,
  FRYER_REWARDS,
  ITEMS,
  ITEM_BY_ID,
  LEVEL_CAP,
  STATIONS,
  STOVE_TIERS,
  VERY_DISHES,
  VERY_MASTERY,
  buyAndPlace,
  chefRank,
  createInitialState,
  fryerCooked,
  furnAt,
  knownRecipes,
  nextDay,
  startCooking,
  stoveTierCost,
  tick,
  updateChefRank,
  updateMagicFridge,
  upgradeStove,
  variantId,
  veryOf,
  withLearnedVariants,
  xpToNext,
  type GameState,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.5) => {
  for (let t = 0; t < sec; t += dt) tick(s, dt);
};
function joint(seed = 4): GameState {
  const s = createInitialState(seed);
  s.cash = 1e7;
  s.sauce = 500;
  s.stats.cooked = { sliders: 1 };
  s.tut = 99;
  s.chefRank = 10;
  return s;
}

describe('late-game content', () => {
  it('a new dish unlocks at every level from 10 to 40', () => {
    for (let lv = 10; lv <= LEVEL_CAP; lv++) expect(DISHES.some((d) => d.source === 'level' && d.level === lv), `level ${lv}`).toBe(true);
  });

  it('every station has a cookbook and a stove in the shop that cooks it', () => {
    for (const st of STATIONS) {
      expect(DISHES.some((d) => d.station === st.kind), st.kind).toBe(true);
      expect(ITEMS.some((i) => i.kind === 'stove' && i.station === st.kind && !i.starter), st.kind).toBe(true);
    }
    // stations unlock before (or with) the first dish they cook
    for (const st of STATIONS.filter((x) => x.kind !== 'stove')) {
      const shop = Math.min(...ITEMS.filter((i) => i.station === st.kind).map((i) => i.level));
      const first = Math.min(...DISHES.filter((d) => d.station === st.kind && d.source === 'level').map((d) => d.level));
      expect(shop, st.kind).toBeLessThanOrEqual(first);
    }
  });

  it('the dish ladder: thin margins, and the first dish is not the best forever', () => {
    const perHour = (id: string) => {
      const d = DISH_BY_ID[id];
      return (d.servings * d.price - d.cost) / (d.cookSec / 3600);
    };
    for (const d of DISHES) {
      expect(d.cost, d.id).toBeLessThan(d.servings * d.price);
      expect(d.cost / (d.servings * d.price), d.id).toBeGreaterThan(0.1);
    }
    const best = (lv: number) => Math.max(...DISHES.filter((d) => d.source === 'level' && d.level <= lv && d.cookSec <= 3600).map((d) => perHour(d.id)));
    expect(best(10)).toBeGreaterThan(best(1) * 1.5);
    expect(best(30)).toBeGreaterThan(best(10));
    expect(DISH_BY_ID.sliders.xp).toBe(1);
  });

  it('the XP curve: +10% a level past 10, and a few easy early levels', () => {
    expect([3, 4, 5].map(xpToNext)).toEqual([50, 80, 120]);
    expect(xpToNext(11)).toBe(Math.round(950 * 1.1));
    expect(xpToNext(39)).toBe(Math.round(950 * Math.pow(1.1, 29)));
  });

  it('the late crowd: 8 customers between levels 16 and 40, rarer ones need stars', () => {
    const late = CUSTOMERS.filter((c) => c.minLevel >= 16);
    expect(late.length).toBeGreaterThanOrEqual(6);
    expect(late.length).toBeLessThanOrEqual(8);
    for (const c of late) {
      expect(c.minLevel).toBeLessThanOrEqual(40);
      expect(c.minStars, c.id).toBeGreaterThanOrEqual(2.5);
      expect(c.gag.length, c.id).toBeGreaterThan(5);
      expect(c.zombieName.length).toBeGreaterThan(3);
      expect((c.infect.cash ?? 0) + (c.infect.sauce ?? 0), c.id).toBeGreaterThan(0);
    }
    expect(late.some((c) => c.tier === 'legendary')).toBe(true);
  });

  it('new shop items arrive every few levels through 40', () => {
    for (let lv = 10; lv <= 40; lv++) expect(ITEMS.some((i) => !i.starter && i.level >= lv - 3 && i.level <= lv), `around level ${lv}`).toBe(true);
    for (const kind of ['table', 'chair', 'decor', 'wall', 'moneymaker'] as const) expect(ITEMS.some((i) => i.kind === kind && i.level >= 16), kind).toBe(true);
  });
});

describe('the Magic Fridge', () => {
  it('costs 30 Brain Sauce, adds a little rating, and conjures one known dish a day', () => {
    const def = ITEM_BY_ID.fridge_magic;
    expect(def.sauce).toBe(30);
    expect(def.rating).toBeGreaterThan(0);
    const s = joint();
    s.level = 12;
    updateMagicFridge(s, '2026-1-1');
    expect(s.fridge).toHaveLength(0); // no Magic Fridge yet
    expect(buyAndPlace(s, 'fridge_magic', 5, 1, 'sw')).toBeNull();
    expect(buyAndPlace(s, 'fridge_magic', 5, 3, 'sw')).toMatch(/only have 1/);
    updateMagicFridge(s, '2026-1-1');
    updateMagicFridge(s, '2026-1-1');
    expect(s.fridge).toHaveLength(1);
    const d = DISH_BY_ID[s.fridge[0].dish];
    expect(d.level).toBeLessThanOrEqual(12);
    expect(d.source).toBe('level');
    updateMagicFridge(s, '2026-1-2');
    expect(s.fridge).toHaveLength(2);
    expect(s.events.some((e) => e.t === 'toast' && /Magic Fridge/.test(e.text))).toBe(true);
  });
});

describe('chef ranks (recipe-collection milestones)', () => {
  it('ten ranks, one every 5 recipes, each paying its XP bonus once', () => {
    expect(CHEF_RANKS.map((r) => r.at)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    expect(new Set(CHEF_RANKS.map((r) => r.title)).size).toBe(10);
    const s = createInitialState(3);
    expect(chefRank(s).rank).toBe(0);
    s.level = 10;
    const known = knownRecipes(s).length;
    expect(known).toBe(DISHES.filter((d) => d.source === 'level' && d.level <= 10).length);
    const want = CHEF_RANKS.filter((r) => r.at <= known);
    const xp0 = s.xp;
    const lv0 = s.level;
    updateChefRank(s);
    expect(s.chefRank).toBe(want.length);
    expect(s.level > lv0 || s.xp - xp0 === want.reduce((a, r) => a + r.xp, 0)).toBe(true);
    const after = s.xp;
    updateChefRank(s);
    expect(s.xp).toBe(after);
    // learned variants count as recipes too
    s.recipes.push(variantId('sliders', 'spicy'));
    expect(knownRecipes(s).length).toBe(known + 1);
  });
});

describe('Very variants', () => {
  it('Very Spicy, Very Fancy and Very Quick push one stat x2', () => {
    const b = DISH_BY_ID.ribs;
    expect(DISH_BY_ID.very_spicy_ribs.price).toBe(b.price * 2);
    expect(DISH_BY_ID.very_fancy_ribs.xp).toBe(b.xp * 2);
    expect(DISH_BY_ID.very_quick_ribs.cookSec).toBe(Math.round(b.cookSec / 2));
    expect(DISH_BY_ID.very_quick_ribs.name).toBe('Very Quick Rib Rack of Doom');
    expect(VERY_DISHES).toHaveLength(DISHES.length * 3);
    expect(veryOf('spicy_ribs')).toBe('very_spicy_ribs');
    expect(veryOf('bulk_ribs')).toBeNull();
    expect(veryOf('ribs')).toBeNull();
  });

  it('cooking a learned Spicy dish enough times masters its Very tier', () => {
    const s = joint();
    s.closed = true;
    s.recipes.push('spicy_sliders');
    s.stats.cooked.spicy_sliders = VERY_MASTERY - 1;
    expect(withLearnedVariants(s).some((d) => d.id === 'very_spicy_sliders')).toBe(false);
    expect(startCooking(s, s.workers[0].id, s.stoves[0].id, 'spicy_sliders')).toBeNull();
    run(s, 200);
    expect(s.recipes).toContain('very_spicy_sliders');
    const menu = withLearnedVariants(s).map((d) => d.id);
    expect(menu.indexOf('very_spicy_sliders')).toBeGreaterThan(menu.indexOf('sliders'));
  });
});

describe('the Frequent Fryer', () => {
  it('the first dish of each day keeps the streak, paying out up the ladder', () => {
    expect(FRYER_REWARDS).toHaveLength(10);
    expect(FRYER_REWARDS[0].cash).toBe(25);
    expect(FRYER_REWARDS[1].cash).toBe(50);
    expect(nextDay('2026-1-31')).toBe('2026-2-1');
    const s = joint(11);
    s.level = 5;
    const cash = s.cash;
    fryerCooked(s, '2026-3-1');
    expect(s.fryer).toEqual({ day: '2026-3-1', streak: 1, best: 1 });
    expect(s.cash).toBe(cash + 25);
    fryerCooked(s, '2026-3-1'); // same day: nothing
    expect(s.cash).toBe(cash + 25);
    fryerCooked(s, '2026-3-2');
    expect(s.cash).toBe(cash + 75);
    const fridge = s.fridge.length;
    fryerCooked(s, '2026-3-3'); // day 3: a free meal
    expect(s.fryer!.streak).toBe(3);
    expect(s.fridge.length).toBeGreaterThan(fridge);
    const sauce = s.sauce;
    fryerCooked(s, '2026-3-4');
    expect(s.sauce).toBe(sauce + 1);
    fryerCooked(s, '2026-3-6'); // missed a day: back to 1
    expect(s.fryer).toEqual({ day: '2026-3-6', streak: 1, best: 4 });
    const ev = s.events.filter((e) => e.t === 'fryer');
    expect(ev.map((e) => (e.t === 'fryer' ? e.streak : 0))).toEqual([1, 2, 3, 4, 1]);
  });

  it('waits for the tutorial, and sometimes hands over a rare recipe (~5%)', () => {
    const fresh = createInitialState(2);
    fryerCooked(fresh, '2026-3-1');
    expect(fresh.fryer).toBeUndefined();
    let rare = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = joint(seed);
      fryerCooked(s, '2026-3-1');
      const e = s.events.find((x) => x.t === 'fryer');
      if (e && e.t === 'fryer' && e.rare) {
        rare++;
        expect(DISH_BY_ID[e.rare].source).toBe('raid');
        expect(s.fridge.some((f) => f.dish === e.rare)).toBe(true);
      }
    }
    expect(rare / 400).toBeGreaterThan(FRYER_RARE_CHANCE * 0.4);
    expect(rare / 400).toBeLessThan(FRYER_RARE_CHANCE * 2);
  });
});

describe('stove upgrades and table sets', () => {
  it('five tiers, each cooking 10% faster and waiting 15% longer before burning', () => {
    expect(STOVE_TIERS).toEqual([2000, 6000, 15000, 35000, 70000]);
    const total = (tier: number) => {
      const s = joint();
      s.closed = true;
      for (let k = 0; k < tier; k++) expect(upgradeStove(s, s.stoves[0].id)).toBeNull();
      expect(startCooking(s, s.workers[0].id, s.stoves[0].id, 'hobodog')).toBeNull();
      run(s, 5);
      return s.stoves[0].total!;
    };
    expect(total(2)).toBeCloseTo(total(0) / 1.2, 3);
    const s = joint();
    const cash = s.cash;
    for (const c of STOVE_TIERS) {
      expect(stoveTierCost(s, s.stoves[0].id)).toBe(c);
      expect(upgradeStove(s, s.stoves[0].id)).toBeNull();
    }
    expect(s.cash).toBe(cash - STOVE_TIERS.reduce((a, b) => a + b, 0));
    expect(stoveTierCost(s, s.stoves[0].id)).toBeNull();
    expect(upgradeStove(s, s.stoves[0].id)).toMatch(/Fully/);
  });

  it('a table set places its chair facing the table', () => {
    const s = joint();
    s.level = 5;
    expect(buyAndPlace(s, 'table_set', 4, 4)).toBeNull();
    const chair = s.furniture.find((f) => f.item === 'chair_diner');
    expect(chair).toBeDefined();
    const step = { sw: [0, 1], se: [1, 0], ne: [0, -1], nw: [-1, 0] }[chair!.dir!]!;
    expect(furnAt(s, chair!.x + step[0], chair!.y + step[1])?.item).toBe('table_set');
  });
});
