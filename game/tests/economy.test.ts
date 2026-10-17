/**
 * Pacing check: a sensible bot plays like an engaged player (checks in every few seconds, cooks the
 * best dish it can afford, rests tired zombies, infects customers, decorates, expands, raids) and
 * we assert the game hits the progression beats (docs/08-original-deep-dive.md: the original's expansion ladder,
 * crew cap and long-timer dishes, paced for an engaged afternoon).
 */
declare const process: { env: Record<string, string | undefined> };
import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_BY_ID,
  DISHES,
  RIVALS,
  ITEMS,
  activeGoals,
  buyAndPlace,
  buyWall,
  canPlace,
  claimGoal,
  collectPayout,
  createInitialState,
  dishAvailable,
  expand,
  finishRaid,
  infect,
  infectCost,
  nextExpansion,
  plateDish,
  rest,
  fireZombie,
  DIR4,
  DIR_STEP,
  DISH_BY_ID,
  ITEM_BY_ID,
  key,
  maxEnergy,
  paintFloor,
  stoveCooks,
  rivalReady,
  rivalLevel,
  rivalStats,
  sendAll,
  startCooking,
  startRaid,
  stars,
  stepRaid,
  studyFromFridge,
  tick,
  validSeats,
  zombies,
  buyCheck,
  type GameState,
  type Dir,
  type RaidState,
} from '../src/sim';

const RAID_CREW = [3, 4, 5, 6, 7];
const power = (type: string) => {
  const st = CUSTOMER_BY_ID[type]?.stats;
  return st ? st.power * 2 + st.energy / 25 + st.speed * 0.5 : 0;
};

/** The next joint on the road, if it can be raided now and the crew is big enough to try.
 * Like a real player, the bot gives up waiting after a while and goes back to cooking for a bit. */
const musterTimes = new WeakMap<GameState, { since: number; pauseUntil: number }>();
function musterFor(s: GameState) {
  const m = musterTimes.get(s) ?? { since: -1, pauseUntil: 0 };
  musterTimes.set(s, m);
  const rv = RIVALS.find((x) => !(s.rivals[x.id]?.wins));
  const want = rv && !rivalReady(s, rv.id) && zombies(s).length >= RAID_CREW[RIVALS.indexOf(rv)] && s.now >= m.pauseUntil;
  if (!want) {
    m.since = -1;
    return null;
  }
  if (m.since < 0) m.since = s.now;
  if (s.now - m.since > 600) {
    m.pauseUntil = s.now + 1800;
    m.since = -1;
    return null;
  }
  return rv;
}

const BEST_TINT = (s: GameState, kind: 'table' | 'chair') =>
  ITEMS.filter((i) => i.kind === kind && !buyCheck(s, i.id)).sort((a, b) => (a.cash ?? 1e9) - (b.cash ?? 1e9))[0];

function tryBuy(s: GameState, id: string, dir?: Dir): boolean {
  if (buyCheck(s, id)) return false;
  for (let y = 0; y < s.roomH; y++) for (let x = 0; x < s.roomW; x++) if (!canPlace(s, id, x, y, dir)) return buyAndPlace(s, id, x, y, dir) === null;
  return false;
}

/** A table plus a chair facing it, wherever both fit (one customer per table, like the original).
 * Like a player eyeballing the floor, the bot tries each spot on a scratch copy first. */
function buySeat(s: GameState): boolean {
  const t = BEST_TINT(s, 'table');
  const c = BEST_TINT(s, 'chair');
  if (!t || !c || (t.cash ?? 0) + (c.cash ?? 0) > s.cash - 300) return false;
  for (let y = 0; y < s.roomH; y++)
    for (let x = 0; x < s.roomW; x++)
      for (const d of DIR4) {
        const cx = x - DIR_STEP[d].x;
        const cy = y - DIR_STEP[d].y;
        if (canPlace(s, t.id, x, y) || canPlace(s, c.id, cx, cy, d)) continue;
        const trial = structuredClone(s);
        if (buyAndPlace(trial, t.id, x, y) !== null || buyAndPlace(trial, c.id, cx, cy, d) !== null) continue;
        buyAndPlace(s, t.id, x, y);
        buyAndPlace(s, c.id, cx, cy, d);
        return true;
      }
  return false;
}

function bot(s: GameState) {
  // a player getting ready to raid stops handing out new cooking jobs so the crew can gather
  const mustering = !!musterFor(s);
  for (const st of s.stoves) if (st.status === 'done' || st.status === 'burnt') plateDish(s, st.id);
  for (const g of activeGoals(s)) if (g.done) claimGoal(s, g.id);
  for (const f of s.furniture) collectPayout(s, f.id);
  for (let i = s.fridge.length - 1; i >= 0; i--) studyFromFridge(s, i);
  // rest anyone running low
  for (const w of s.workers) if ((w.state === 'idle' || w.state === 'daydream') && w.energy < maxEnergy(w) * 0.3) rest(s, w.id);
  // cook to demand: don't pile up more food than the dining room can eat before it burns
  const onCounter = s.counter.reduce((a, c) => a + (c.dish ? c.servings : 0), 0);
  const inOven = s.stoves.reduce((a, st) => a + (st.dish ? DISH_BY_ID[st.dish].servings : 0), 0);
  const seats = validSeats(s).length;
  // an engaged player prefers dishes that finish while they're still playing (≤ 1 h)
  for (const st of s.stoves) {
    if (st.status === 'paused') {
      const cook = s.workers.find((w) => (w.state === 'idle' || w.state === 'daydream') && w.energy > maxEnergy(w) * 0.45);
      if (cook) startCooking(s, cook.id, st.id);
      continue;
    }
    if (st.status !== 'empty') continue;
    if (onCounter + inOven > 40 + seats * 25) break;
    const cook = s.workers.find((w) => (!mustering || w.kind === 'you') && (w.state === 'idle' || w.state === 'daydream') && w.energy > maxEnergy(w) * 0.45);
    if (!cook) break;
    const dish = DISHES.filter((d) => stoveCooks(st, d.station) && dishAvailable(s, d.id) && d.cost <= s.cash * 0.6 && d.cookSec <= 3600)
      .sort((a, b) => (b.servings * b.price - b.cost) / b.cookSec - (a.servings * a.price - a.cost) / a.cookSec)[0];
    if (dish) startCooking(s, cook.id, st.id, dish.id);
  }
  // upgrade the crew: when full, let the weakest go if a much better customer is in
  if (zombies(s).length >= s.crewCap) {
    const best = s.customers.filter((x) => x.state === 'waiting' || x.state === 'eating').sort((a, b) => power(b.type) - power(a.type))[0];
    const worst = zombies(s).filter((w) => w.state !== 'cooking' && w.state !== 'raiding' && w.state !== 'down' && !w.job).sort((a, b) => power(a.type) - power(b.type))[0];
    if (best && worst && power(best.type) >= power(worst.type) + 3 && infectCost(s, best).cash <= s.cash * 0.5 && infectCost(s, best).sauce <= Math.max(0, s.sauce - 3)) fireZombie(s, worst.id);
  }
  // grow the crew
  if (zombies(s).length < s.crewCap) {
    const c = s.customers.filter((x) => x.state === 'waiting' || x.state === 'eating').sort((a, b) => power(b.type) - power(a.type))[0];
    if (c) {
      const cost = infectCost(s, c);
      if (cost.cash <= s.cash * 0.5 && cost.sauce <= Math.max(0, s.sauce - 3)) infect(s, c.id);
    }
  }
  // spend: fix the grime, then seats, stations, the expansion, and star items
  const spare = s.cash - 300;
  if (spare > 100) {
    for (let y = 0; y < s.roomH; y++)
      for (let x = 0; x < s.roomW; x++) {
        const f = s.floors[key(x, y)];
        if ((f === 'stain' || f === 'loose') && s.cash > 400) paintFloor(s, x, y, 'tile');
      }
  }
  if (seats < 2 + stars(s) * 2 && seats < (s.roomW * s.roomH) / 5 && buySeat(s)) return;
  // the next station / the first expansion are worth saving for
  const want = (kind: string, lvl: number) => s.level >= lvl && !s.stoves.some((x) => x.kind === kind);
  const short = (id: string) => (ITEM_BY_ID[id].cash ?? 0) > s.cash; // saving up for it
  const e = nextExpansion(s);
  if (want('grill', 2) && !tryBuy(s, 'grill') && short('grill')) return;
  if (s.stoves.filter((x) => x.kind === 'stove').length < 2 && !tryBuy(s, 'stove_plain') && short('stove_plain')) return;
  if (e && s.roomW === 7) {
    if ((e.cash ?? 0) > spare) return;
    expand(s);
  }
  if (want('smoker', 4) && !tryBuy(s, 'smoker') && short('smoker')) return;
  if (want('fryer', 6) && !tryBuy(s, 'fryer') && short('fryer')) return;
  if (e && e.level <= s.level && (e.cash ?? 0) < spare && (e.sauce ?? 0) <= s.sauce - 5) expand(s);
  // save up for the next expansion once the joint is decent (a little decor on the side)
  if (e && (e.cash ?? 0) > spare && stars(s) >= 2 && spare < (e.cash ?? 0) * 0.1 + 500) return;
  for (const mm of ['vending']) if (spare > 20000 && tryBuy(s, mm)) return;
  if (spare > 200) {
    const decor = ITEMS.filter((i) => (i.kind === 'decor' || i.kind === 'wall') && i.rating > 0 && !buyCheck(s, i.id) && (i.cash ?? 1e9) < spare * 0.3).sort((a, b) => b.rating / (b.cash ?? 1) - a.rating / (a.cash ?? 1))[0];
    if (decor?.kind === 'wall') {
      for (let i = 0; i < Math.max(s.roomW, s.roomH); i++) if (buyWall(s, decor.id, i % 2 ? 'l' : 'r', i >> 1) === null) break;
    } else if (decor) tryBuy(s, decor.id);
  }
}

function raidIfReady(s: GameState): RaidState | null {
  for (const rv of RIVALS) {
    if (rivalReady(s, rv.id)) continue;
    if ((s.rivals[rv.id]?.wins ?? 0) > 0 && rv !== RIVALS.find((x) => !(s.rivals[x.id]?.wins))) continue;
    // like the original, you can pull zombies off whatever they're doing to go raiding
    const healthy = s.workers.filter((w) => w.kind === 'zombie' && w.energy > maxEnergy(w) * 0.6 && !['down', 'raiding', 'hunting', 'cooking'].includes(w.state));
    if (healthy.length < RAID_CREW[RIVALS.indexOf(rv)]) return null;
    // a sensible player sizes up the joint first: total punch vs. the Head Chef
    const punch = healthy.reduce((a, w) => a + (3 + w.stats.power * 1.6) * (w.energy / 100), 0);
    if (punch < rivalStats(rv.id, rivalLevel(s, rv.id)).chef.hp / 9) return null;
    const r = startRaid(s, rv.id, healthy.map((w) => w.id), s.pets.map((p) => p.id));
    if (typeof r === 'string') return null;
    sendAll(r);
    return r;
  }
  return null;
}

function playFor(hours: number, seed: number) {
  const s = createInitialState(seed);
  const marks: Record<string, { level: number; cash: number; stars: number; crew: number; room: number; seats: number; beaten: number }> = {};
  const checkpoints = [10, 30, 60, 120, 240, 360].filter((m) => m <= hours * 60);
  let raid: RaidState | null = null;
  for (let t = 0; t < hours * 3600; t += 0.5) {
    tick(s, 0.5);
    s.events.length = 0;
    if (raid) {
      for (let k = 0; k < 10; k++) stepRaid(raid, 0.05);
      if (raid.phase !== 'fight') {
        if (process.env.ECON_REPORT) console.log('RAID', Math.round(s.now / 60), raid.rival, raid.phase, raid.t.toFixed(0), raid.units.filter((u) => u.side === 'z').map((u) => `${u.art}:${Math.round(u.maxHp)}`).join(','), 'boss', raid.units.find((u) => u.kind === 'boss')!.hp);
        finishRaid(s, raid);
        raid = null;
      }
    }
    if (Math.round(t * 2) % 10 === 0) bot(s); // a check-in every 5 s
    if (!raid && Math.round(t * 2) % 120 === 0) raid = raidIfReady(s);
    for (const m of checkpoints)
      if (Math.abs(t + 0.5 - m * 60) < 0.25) {
        if (process.env.ECON_REPORT) console.log('MARK', m, 'rating', s.rating.toFixed(3), 'happy', s.stats.happy, 'angry', s.stats.angry, 'bites', s.stats.bites, 'seats', validSeats(s).length, 'workers', s.workers.map((w) => `${w.type}:${w.state}:${Math.round(w.energy)}`).join(' '));
        marks[`${m}m`] = { level: s.level, cash: Math.round(s.cash), stars: stars(s), crew: zombies(s).length, room: s.roomW, seats: validSeats(s).length, beaten: Object.values(s.rivals).filter((x) => x.wins > 0).length };
      }
  }
  return { s, marks };
}

describe('economy pacing (engaged player)', () => {
  it('hits the progression beats', () => {
    const { s, marks } = playFor(6, 21);
    if (process.env.ECON_REPORT) console.log('ECON', JSON.stringify(marks), JSON.stringify({ goals: s.goalsDone.length, recipes: s.recipes, rivals: s.rivals }));
    // the first few minutes: the tutorial levels, the first bite
    expect(marks['10m'].level).toBeGreaterThanOrEqual(2);
    expect(marks['10m'].crew).toBeGreaterThanOrEqual(1);
    expect(marks['30m'].level).toBeGreaterThanOrEqual(3);
    // the retuned dish ladder (first dishes earn less, so the first dish isn't the best forever) buys the 4th seat a bit later
    expect(marks['30m'].seats).toBeGreaterThanOrEqual(3);
    // the original's rating steps (+0.005 a meal, -0.006 a walk-out) and servers who stand by the table
    // for the whole meal make the first hour slow; by two hours the stars are coming, by four they're high
    expect(marks['120m'].stars).toBeGreaterThanOrEqual(1.5);
    expect(marks['240m'].stars).toBeGreaterThanOrEqual(3);
    expect(marks['120m'].level).toBeGreaterThanOrEqual(4);
    // an afternoon of play: the first expansion ($3,500), the first rival beaten, a real crew
    expect(marks['360m'].room).toBeGreaterThanOrEqual(8);
    expect(marks['360m'].beaten).toBeGreaterThanOrEqual(1);
    expect(marks['360m'].crew).toBeGreaterThanOrEqual(3);
    expect(marks['360m'].level).toBeGreaterThanOrEqual(6);
    // and not so fast that it's over in an afternoon (the original's ladder runs to $150k rooms). The
    // original's $5,000 start buys the first ($3,500) expansion early; the second waits
    expect(marks['120m'].room).toBeLessThanOrEqual(8);
    expect(marks['360m'].room).toBeLessThanOrEqual(9);
    expect(marks['360m'].level).toBeLessThanOrEqual(12);
    expect(marks['360m'].beaten).toBeLessThanOrEqual(3);
  }, 300_000);
});
