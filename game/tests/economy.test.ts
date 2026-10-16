/**
 * Pacing check: a sensible bot plays like an engaged player (checks in every few seconds, cooks the
 * best dish it can afford, rests tired zombies, infects customers, decorates, expands, raids) and
 * we assert the game hits the design's progression beats (docs/02-game-design.md §4.2).
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
  decorStars,
  serviceStars,
  rivalReady,
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

function bot(s: GameState) {
  // a player getting ready to raid stops handing out new cooking jobs so the crew can gather
  const mustering = !!musterFor(s);
  for (const st of s.stoves) if (st.status === 'done' || st.status === 'burnt') plateDish(s, st.id);
  for (const g of activeGoals(s)) if (g.done) claimGoal(s, g.id);
  for (const f of s.furniture) collectPayout(s, f.id);
  for (let i = s.fridge.length - 1; i >= 0; i--) studyFromFridge(s, i);
  // rest anyone running low
  for (const w of s.workers) if ((w.state === 'idle' || w.state === 'daydream') && w.energy < w.stats.energy * 0.3) rest(s, w.id);
  // cook to demand: don't pile up more food than the dining room can eat before it burns
  const onCounter = s.counter.reduce((a, c) => a + (c.dish ? c.servings : 0), 0);
  const inOven = s.stoves.reduce((a, st) => a + (st.dish ? DISHES.find((d) => d.id === st.dish)!.servings : 0), 0);
  const freeSlots = s.counter.filter((c) => !c.dish || c.servings <= 0).length;
  for (const st of s.stoves) {
    if (st.status !== 'empty') continue;
    if (onCounter + inOven > 12 + validSeats(s).length * 4 || freeSlots === 0) break;
    const cook = s.workers.find((w) => (!mustering || w.kind === 'you') && (w.state === 'idle' || w.state === 'daydream') && w.energy > w.stats.energy * 0.45);
    if (!cook) break;
    const dish = DISHES.filter((d) => d.station === st.kind && dishAvailable(s, d.id) && d.cost <= s.cash * 0.6)
      .sort((a, b) => (b.servings * b.price - b.cost) / b.cookSec - (a.servings * a.price - a.cost) / a.cookSec)[0];
    if (dish) startCooking(s, cook.id, st.id, dish.id);
  }
  // upgrade the crew: when full, let the weakest go if a much better customer is in
  if (zombies(s).length >= s.crewCap) {
    const best = s.customers.filter((x) => x.state === 'waiting' || x.state === 'eating').sort((a, b) => power(b.type) - power(a.type))[0];
    const worst = zombies(s).filter((w) => w.state !== 'cooking' && w.state !== 'raiding' && w.state !== 'down').sort((a, b) => power(a.type) - power(b.type))[0];
    if (best && worst && power(best.type) >= power(worst.type) + 3 && infectCost(s, best).cash <= s.cash * 0.5 && infectCost(s, best).sauce <= Math.max(0, s.sauce - 3)) fireZombie(s, worst.id);
  }
  // grow the crew
  if (zombies(s).length < s.crewCap) {
    const c = s.customers
      .filter((x) => x.state === 'waiting' || x.state === 'eating')
      .sort((a, b) => CUSTOMER_BY_ID[b.type].stats.power - CUSTOMER_BY_ID[a.type].stats.power)[0];
    if (c) {
      const cost = infectCost(s, c);
      if (cost.cash <= s.cash * 0.5 && cost.sauce <= Math.max(0, s.sauce - 3)) infect(s, c.id);
    }
  }
  // spend: stations, expansions, seats, money-makers, decor
  const spare = s.cash - 300;
  const tryBuy = (id: string, dir?: 'se' | 'nw') => {
    if (buyCheck(s, id)) return false;
    for (let y = 0; y < s.roomN; y++)
      for (let x = 0; x < s.roomN; x++) if (!canPlace(s, id, x, y, dir)) return buyAndPlace(s, id, x, y, dir) === null;
    return false;
  };
  if (spare > 600 && s.level >= 4 && !s.stoves.some((x) => x.kind === 'smoker')) tryBuy('smoker');
  if (spare > 900 && s.level >= 6 && !s.stoves.some((x) => x.kind === 'fryer')) tryBuy('fryer');
  const e = nextExpansion(s);
  if (e && e.level <= s.level && (e.cash ?? 0) < spare && (e.sauce ?? 0) <= s.sauce - 5) expand(s);
  const seats = validSeats(s).length;
  if (spare > 400 && seats < 1 + stars(s) * 2 + 2) {
    // table with two benches, in a free 3x1 strip
    for (let y = 1; y < s.roomN - 1; y++)
      for (let x = 1; x < s.roomN - 1; x++) {
        if (canPlace(s, 'table_picnic', x, y) || canPlace(s, 'bench', x - 1, y, 'se') || canPlace(s, 'bench', x + 1, y, 'nw')) continue;
        if (buyAndPlace(s, 'table_picnic', x, y) !== null) continue;
        if (buyAndPlace(s, 'bench', x - 1, y, 'se') || buyAndPlace(s, 'bench', x + 1, y, 'nw')) continue;
        return;
      }
  }
  // save up for the next expansion unless decor is what's capping the stars
  if (e && e.level <= s.level && (e.cash ?? 0) > spare && decorStars(s) > serviceStars(s) - 0.5) return;
  for (const mm of ['vending', 'atm', 'jukebox', 'arcade']) if (spare > 2500 && tryBuy(mm)) return;
  if (spare > 200) {
    const decor = ITEMS.filter((i) => (i.kind === 'decor' || i.kind === 'wall') && !buyCheck(s, i.id) && (i.cash ?? 1e9) < spare * 0.3).sort((a, b) => b.decor / (b.cash ?? 1) - a.decor / (a.cash ?? 1))[0];
    if (decor?.kind === 'wall') {
      for (let i = 0; i < s.roomN; i++) if (buyWall(s, decor.id, i % 2 ? 'l' : 'r', i) === null) break;
    } else if (decor) tryBuy(decor.id);
  }
}

function raidIfReady(s: GameState): RaidState | null {
  for (const rv of RIVALS) {
    if (rivalReady(s, rv.id)) continue;
    if ((s.rivals[rv.id]?.wins ?? 0) > 0 && rv !== RIVALS.find((x) => !(s.rivals[x.id]?.wins))) continue;
    const healthy = s.workers.filter((w) => w.kind === 'zombie' && w.energy > w.stats.energy * 0.6 && (w.state === 'idle' || w.state === 'resting' || w.state === 'daydream'));
    if (healthy.length < RAID_CREW[RIVALS.indexOf(rv)]) return null;
    // a sensible player sizes up the joint first: total punch vs. the Head Chef
    const punch = healthy.reduce((a, w) => a + (3 + w.stats.power * 1.6) * (w.energy / 50), 0);
    if (punch < rv.boss.hp / 9) return null;
    const r = startRaid(s, rv.id, healthy.map((w) => w.id), s.pets.map((p) => p.id));
    if (typeof r === 'string') return null;
    sendAll(r);
    return r;
  }
  return null;
}

function playFor(hours: number, seed: number) {
  const s = createInitialState(seed);
  const marks: Record<string, { level: number; cash: number; stars: number; crew: number; room: number; beaten: number }> = {};
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
        if (process.env.ECON_REPORT) console.log('MARK', m, 'rating', s.ratingPts.toFixed(0), 'happy', s.stats.happy, 'angry', s.stats.angry, 'bites', s.stats.bites, 'seats', validSeats(s).length, 'workers', s.workers.map((w) => `${w.type}:${w.state}:${Math.round(w.energy)}`).join(' '));
        marks[`${m}m`] = { level: s.level, cash: Math.round(s.cash), stars: stars(s), crew: zombies(s).length, room: s.roomN, beaten: Object.values(s.rivals).filter((x) => x.wins > 0).length };
      }
  }
  return { s, marks };
}

describe('economy pacing (engaged player)', () => {
  it('hits the progression beats', () => {
    const { s, marks } = playFor(6, 21);
    if (process.env.ECON_REPORT) console.log('ECON', JSON.stringify(marks), JSON.stringify({ goals: s.goalsDone.length, recipes: s.recipes, rivals: s.rivals }));
    expect(marks['10m'].level).toBeGreaterThanOrEqual(2);
    expect(marks['10m'].crew).toBeGreaterThanOrEqual(1);
    expect(marks['30m'].level).toBeGreaterThanOrEqual(3);
    expect(marks['60m'].beaten).toBeGreaterThanOrEqual(1);
    expect(marks['60m'].stars).toBeGreaterThanOrEqual(2);
    expect(marks['120m'].level).toBeGreaterThanOrEqual(5);
    expect(marks['360m'].level).toBeGreaterThanOrEqual(8);
    expect(marks['360m'].beaten).toBeGreaterThanOrEqual(3);
    // and not so fast that it's over in an afternoon
    expect(marks['360m'].level).toBeLessThanOrEqual(16);
    expect(marks['120m'].beaten).toBeLessThanOrEqual(4);
  }, 300_000);
});
