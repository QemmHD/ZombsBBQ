/**
 * Soak test: a monkey player mashes every action at random for hours of game time while we check
 * invariants that must always hold. Any crash, NaN, duplicate, leak or stuck state fails the test.
 */
declare const process: { env: Record<string, string | undefined> };
import { describe, expect, it } from 'vitest';
import {
  DISHES,
  ITEMS,
  RIVALS,
  WALL_FINISHES,
  FLOOR_FINISHES,
  DIR_STEP,
  dirsFor,
  maxEnergy,
  onLawn,
  paintFloor,
  paintWall,
  buyAndPlace,
  buyKeepWarm,
  buyWall,
  claimGoal,
  activeGoals,
  collectPayout,
  createInitialState,
  deserialize,
  expand,
  finishRaid,
  focusTarget,
  infect,
  moveFurniture,
  plateDish,
  refill,
  rest,
  rotateFurniture,
  sellFurniture,
  sendAll,
  serialize,
  serveFromFridge,
  startCooking,
  startRaid,
  stealDish,
  stepRaid,
  storeFurniture,
  studyFromFridge,
  tick,
  validSeats,
  wake,
  isInside,
  key,
  reachable,
  DOOR_X,
  itemOf,
  type GameState,
  type RaidState,
} from '../src/sim';

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function checkInvariants(s: GameState, where: string) {
  const fail = (m: string) => {
    throw new Error(`${where}: ${m}`);
  };
  const r = { w: s.roomW, h: s.roomH };
  for (const n of [s.cash, s.sauce, s.xp, s.level, s.rating, s.now]) if (!Number.isFinite(n)) fail('non-finite number');
  if (s.sauce < 0) fail(`negative sauce ${s.sauce}`);
  if (s.cash < -1e-6) fail(`negative cash ${s.cash}`);
  if (s.rating < 0 || s.rating > 1) fail(`rating out of range ${s.rating}`);
  if (s.walls.l.length !== s.roomH || s.walls.r.length !== s.roomW) fail('wall segments out of sync with room size');
  const ids = new Set<string>();
  for (const x of [...s.furniture, ...s.wallItems, ...s.customers, ...s.workers, ...s.pets, ...s.stoves, ...s.counter]) {
    if (ids.has(x.id)) fail(`duplicate id ${x.id}`);
    ids.add(x.id);
  }
  const tiles = new Set<string>();
  for (const f of s.furniture) {
    const k = key(f.x, f.y);
    if (tiles.has(k)) fail(`two items on ${k}`);
    tiles.add(k);
    const d = itemOf(f);
    if (d.outdoor ? !onLawn(f.x, f.y, r) : !isInside(f.x, f.y, r)) fail(`${f.item} in the wrong place at ${k}`);
    if (f.dirty && d.kind !== 'table') fail('dirty plate on a non-table');
    if (d.payout && ((f.bank ?? 0) < 0 || (f.bank ?? 0) > d.payout.max + 1e-6)) fail('money-maker bank out of range');
  }
  if (tiles.has(key(DOOR_X, 0))) fail('door blocked');
  const wallSlots = new Set(s.wallItems.map((w) => `${w.wall}${w.index}`));
  if (wallSlots.size !== s.wallItems.length) fail('two wall items in one slot');
  for (const c of s.counter) {
    if (c.servings < 0) fail(`negative servings ${c.servings}`);
    if (!s.furniture.some((f) => f.id === c.furnitureId)) fail('orphan counter slot');
  }
  for (const st of s.stoves) {
    if (!s.furniture.some((f) => f.id === st.furnitureId)) fail('orphan stove');
    if ((st.status === 'cooking' || st.status === 'paused') && !Number.isFinite(st.left)) fail('cooking without a timer');
    if ((st.status === 'cooking' || st.status === 'done' || st.status === 'reserved' || st.status === 'paused') && !st.dish) fail(`stove ${st.status} without dish`);
    if (st.status === 'cooking' && !s.workers.some((w) => w.id === st.cookId && w.state === 'cooking')) fail('cooking with nobody at the stove');
  }
  for (const w of s.workers) {
    if (!Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(w.energy)) fail(`bad worker ${w.id}`);
    if (w.energy < -1e-6 || w.energy > maxEnergy(w) + 1e-6) fail(`energy out of range ${w.energy}`);
    if (w.state === 'cooking' && !s.stoves.some((st) => st.id === w.stoveId)) fail('cooking at a missing stove');
    if (w.job?.kind === 'serve' && !s.counter.some((c) => c.id === (w.job as { slotId: string }).slotId) && w.state === 'toCounter') fail('job at a missing counter');
  }
  const tables = new Map<string, number>();
  for (const c of s.customers) {
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) fail(`bad customer ${c.id}`);
    if (c.tableId && (c.state === 'waiting' || c.state === 'eating')) tables.set(c.tableId, (tables.get(c.tableId) ?? 0) + 1);
  }
  for (const [t, n] of tables) if (n > 1) fail(`${n} customers at table ${t}`);
  if (s.customers.length > 60) fail(`customer leak (${s.customers.length})`);
  // every stove front, counter, sink and seat stays reachable from the door
  const blocked = new Set(s.furniture.filter((f) => !itemOf(f).outdoor).map((f) => key(f.x, f.y)));
  const reach = reachable({ x: DOOR_X, y: 0 }, blocked, r);
  const near = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(key(x + dx, y + dy)));
  for (const f of s.furniture) {
    const k = itemOf(f).kind;
    if ((k === 'counter' || k === 'sink') && !near(f.x, f.y)) fail(`${f.item} unreachable`);
    if (k === 'stove') {
      const st = DIR_STEP[f.dir ?? 'sw'];
      if (!reach.has(key(f.x + st.x, f.y + st.y))) fail(`${f.item} front unreachable`);
    }
  }
  for (const seat of validSeats(s)) if (!near(seat.x, seat.y)) fail('seat unreachable');
}

function monkey(seed: number, hours: number) {
  const r = prng(seed);
  const pick = <T,>(a: T[]): T | undefined => (a.length ? a[Math.floor(r() * a.length)] : undefined);
  const s = createInitialState(seed);
  s.cash = 3000;
  s.sauce = 30;
  let raid: RaidState | null = null;
  const steps = hours * 3600 * 4;
  for (let i = 0; i < steps; i++) {
    tick(s, 0.25);
    s.events.length = 0;
    if (raid) {
      for (let k = 0; k < 5; k++) stepRaid(raid, 0.05);
      if (r() < 0.01) focusTarget(raid, pick(raid.units)!.id);
      if (r() < 0.01) stealDish(raid, 0);
      if (raid.phase !== 'fight' || r() < 0.0005) {
        finishRaid(s, raid);
        raid = null;
      }
    }
    if (i % 8 !== 0) continue; // a "tap" every 2 seconds
    const a = r();
    const w = pick(s.workers);
    if (a < 0.2 && w) startCooking(s, w.id, pick(s.stoves)!.id, pick(DISHES)!.id);
    else if (a < 0.3) for (const st of s.stoves) plateDish(s, st.id, r() < 0.5 ? w?.id : undefined);
    else if (a < 0.36) {
      const c = pick(s.customers);
      if (c) infect(s, c.id);
    } else if (a < 0.4 && w) rest(s, w.id);
    else if (a < 0.42 && w) wake(s, w.id);
    else if (a < 0.44 && w) refill(s, w.id);
    else if (a < 0.52) {
      const it = pick(ITEMS)!;
      const dir = pick(dirsFor(it));
      const W = s.roomW + 4;
      const H = s.roomH + 4;
      if (it.kind === 'wall') buyWall(s, it.id, r() < 0.5 ? 'l' : 'r', Math.floor(r() * s.roomW));
      else buyAndPlace(s, it.id, Math.floor(r() * W), Math.floor(r() * H), dir);
    } else if (a < 0.57) {
      const f = pick(s.furniture);
      if (f) moveFurniture(s, f.id, Math.floor(r() * (s.roomW + 3)), Math.floor(r() * (s.roomH + 3)));
    } else if (a < 0.59) {
      const f = pick(s.furniture);
      if (f) rotateFurniture(s, f.id);
    } else if (a < 0.61) {
      const f = pick(s.furniture);
      if (f) (r() < 0.5 ? storeFurniture : sellFurniture)(s, f.id);
    } else if (a < 0.62) expand(s);
    else if (a < 0.625) paintWall(s, r() < 0.5 ? 'l' : 'r', Math.floor(r() * s.roomW), pick(WALL_FINISHES)!.id);
    else if (a < 0.63) paintFloor(s, Math.floor(r() * s.roomW), Math.floor(r() * s.roomH), pick(FLOOR_FINISHES)!.id);
    else if (a < 0.64) buyKeepWarm(s, pick(s.stoves)!.id);
    else if (a < 0.66) for (const f of s.furniture) collectPayout(s, f.id);
    else if (a < 0.68) for (const g of activeGoals(s)) claimGoal(s, g.id);
    else if (a < 0.7 && s.fridge.length) (r() < 0.5 ? serveFromFridge : studyFromFridge)(s, 0);
    else if (a < 0.705 && !raid) {
      const rv = pick(RIVALS)!;
      const squad = s.workers.filter(() => r() < 0.6).map((x) => x.id);
      const res = startRaid(s, rv.id, squad, s.pets.map((p) => p.id));
      if (typeof res !== 'string') {
        raid = res;
        sendAll(raid);
      }
    } else if (a < 0.72) s.cash += 500; // keep the monkey shopping
    if (i % 400 === 0) checkInvariants(s, `seed ${seed} t=${s.now.toFixed(0)}`);
  }
  if (raid) finishRaid(s, raid);
  checkInvariants(s, `seed ${seed} end`);
  return s;
}

describe('soak: hours of random play never break the joint', () => {
  for (const seed of [1, 2, 3]) {
    it(`monkey run ${seed}`, () => {
      const s = monkey(seed, 2);
      if (process.env.SOAK_REPORT)
        console.log('SOAK', seed, JSON.stringify({ lvl: s.level, room: [s.roomW, s.roomH], furn: s.furniture.length, wallItems: s.wallItems.length, crew: s.workers.length, pets: s.pets.length, fridge: s.fridge.length, recipes: s.recipes, goals: s.goalsDone.length, ...s.stats, cooked: Object.keys(s.stats.cooked).length, rivals: s.rivals }));
      // and the result still saves and loads cleanly
      const back = deserialize(serialize(s, 0), 0).state;
      checkInvariants(back, 'after reload');
      for (let i = 0; i < 400; i++) tick(back, 0.25);
      checkInvariants(back, 'after reload + play');
      expect(back.furniture.length).toBe(s.furniture.length);
    }, 120_000);
  }
});
