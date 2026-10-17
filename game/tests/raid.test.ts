import { describe, expect, it } from 'vitest';
import {
  BOSS_MINION_STATS,
  COUNTER_VARIANT_ODDS,
  CUSTOMER_CASH,
  DISHES,
  DISH_BY_ID,
  DOOR_X,
  ENEMY_RATING_MODIFIER,
  HEADSTONE_SAUCE,
  HP_BUFF,
  ITEM_BY_ID,
  KILL_HEALTH_BOOST,
  NEGLECT_SEC,
  PETS,
  PET_BY_TYPE,
  RAID_TIME,
  REVIVE_ENERGY,
  RIVALS,
  RIVAL_BY_ID,
  RIVAL_CLOSED_SEC,
  ROAD,
  STAFF_HP,
  STR_BUFF,
  TOMBSTONE_RECHARGE_SAUCE,
  TOMBSTONE_UPGRADE_SAUCE,
  TOMBSTONE_USES,
  TOMBSTONE_USES_L2,
  TUNING,
  XP_PER_EAT,
  ZOMBIE_KILL_XP,
  REWARD_INCOME_HOURS,
  bossMultiplier,
  hourlyIncome,
  raidPunch,
  raidReward,
  raidSpeed,
  raidThreat,
  swingSec,
  addFurniture,
  bossHere,
  buyHeadstone,
  chefSpot,
  createInitialState,
  crewCapForLevel,
  finishRaid,
  inKitchen,
  makeWorker,
  markWarned,
  order,
  petArt,
  raidCandidates,
  raidStack,
  rechargeTombstone,
  reopenRival,
  retreat,
  rivalClosedSec,
  rivalCurve,
  rivalLevel,
  rivalName,
  rivalReady,
  rivalStats,
  rollCounterDish,
  sendAll,
  sendOne,
  startCooking,
  startRaid,
  startingDiners,
  stars,
  stealDish,
  stealingRivals,
  stepRaid,
  tick,
  tombstoneMax,
  tombstoneUses,
  unwarnedThieves,
  upgradeTombstone,
  useHeadstone,
  useSummon,
  useTombstone,
  type GameState,
  type RaidEvent,
  type RaidState,
  type RaidUnit,
  type RivalId,
} from '../src/sim';
import { PET_IDS, buildPet } from '../src/art3/chars/pets';

function withCrew(types: string[], seed = 5, level = 12): GameState {
  const s = createInitialState(seed);
  s.level = level;
  for (const t of types) s.workers.push(makeWorker(s, 'zombie', t, { x: 4, y: 4 }));
  return s;
}
const crewIds = (s: GameState) => s.workers.filter((w) => w.kind === 'zombie').map((w) => w.id);
function play(r: RaidState, maxSec = 320) {
  for (let t = 0; t < maxSec && r.phase === 'fight'; t += 0.05) stepRaid(r, 0.05);
}
const beat = (s: GameState, ...ids: string[]) => ids.forEach((id) => (s.rivals[id] = { stars: 1, wins: 1, nextAt: 0 }));
const beatBefore = (s: GameState, id: RivalId) => beat(s, ...ROAD.slice(0, ROAD.findIndex((r) => r.id === id)).map((p) => p.id));
const raid = (s: GameState, id: RivalId = 'chuck') => startRaid(s, id, crewIds(s)) as RaidState;
const squad = (r: RaidState) => r.units.filter((u) => u.side === 'z');
const staffOf = (r: RaidState) => r.units.filter((u) => u.kind === 'staff');
const chefOf = (r: RaidState) => r.units.find((u) => u.kind === 'boss')!;
/** Put a squad unit on a tile inside, ready to fight, the raid live. */
function placeInside(r: RaidState, u: RaidUnit, x: number, y: number) {
  Object.assign(u, { state: 'idle', x, y, path: [], busyUntil: 0, order: u.order ?? { kind: 'attack' } });
  r.aggro = true;
}
/** Freeze everyone but the listed units (they stand still, out of the way). */
function freezeAllBut(r: RaidState, ...keep: RaidUnit[]) {
  for (const u of r.units) if (!keep.includes(u)) u.busyUntil = 1e9;
}

describe('the rival joint is a real café', () => {
  it('kitchen behind dividers and a counter, diners at single tables, waiters on the floor, the chef at the stove', () => {
    const s = withCrew(['construction'], 5, 2);
    const r = raid(s);
    const kinds = (k: string) => r.furniture.filter((f) => ITEM_BY_ID[f.item].kind === k);
    expect(kinds('stove').length).toBeGreaterThanOrEqual(2);
    expect(kinds('counter')).toHaveLength(1);
    expect(kinds('divider').length).toBeGreaterThanOrEqual(3);
    expect(kinds('table')).toHaveLength(4);
    expect(kinds('chair')).toHaveLength(4);
    // like the original, only some chairs start taken (2 diners at a level-2 café), each sitting on a chair
    const diners = r.units.filter((u) => u.kind === 'customer');
    expect(diners).toHaveLength(startingDiners(2));
    for (const d of diners) expect(kinds('chair').some((c) => c.x === d.x && c.y === d.y)).toBe(true);
    expect(staffOf(r)).toHaveLength(1); // NUM_SERVERS[2] = 1
    const chef = chefOf(r);
    expect(inKitchen(r, chef)).toBe(true);
    expect([chef.x, chef.y]).toEqual([chefSpot(r).x, chefSpot(r).y]);
    // the door is clear and your squad waits single file on the sidewalk outside
    expect(r.furniture.some((f) => f.x === DOOR_X && (f.y === 0 || f.y === 1))).toBe(false);
    expect(squad(r).every((u) => u.state === 'queued' && u.y === -1 && u.x >= r.room.w)).toBe(true);
  });

  it('every theme furnishes its joint from real shop items, with room for its diners', () => {
    for (const rv of RIVALS) {
      const s = withCrew(['boxer'], 5, Math.max(rv.level, 12));
      beatBefore(s, rv.id);
      if (rv.id === 'boss') s.now = 100;
      const r = raid(s, rv.id);
      expect(typeof r, rv.id).toBe('object');
      for (const f of r.furniture) expect(ITEM_BY_ID[f.item], `${rv.id}: ${f.item}`).toBeTruthy();
      for (const w of r.wallItems) expect(ITEM_BY_ID[w.item]?.kind, `${rv.id}: ${w.item}`).toBe('wall');
      const chairs = r.furniture.filter((f) => ITEM_BY_ID[f.item].kind === 'chair').length;
      expect(chairs).toBeGreaterThan(r.stats.diners);
      expect(r.units.filter((u) => u.kind === 'customer')).toHaveLength(r.stats.diners);
    }
  });
});

describe('raid setup', () => {
  it('the map opens at level 2, joints need their level, and squads need someone', () => {
    const s = withCrew(['construction']);
    s.level = 1;
    expect(rivalReady(s, 'chuck')).toMatch(/level 2/);
    s.level = 3;
    beat(s, 'chuck');
    expect(rivalReady(s, 'hank')).toMatch(/level 4/);
    s.rivals = {};
    s.level = 12;
    expect(rivalReady(s, 'chuck')).toBeNull();
    expect(rivalReady(s, 'hank')).toMatch(/previous/);
    expect(startRaid(s, 'chuck', [])).toMatch(/at least one/);
  });

  it('like the original, the chef (YOU) stays home: only zombies can be picked for the squad', () => {
    const s = withCrew(['construction']);
    const you = s.workers.find((w) => w.kind === 'you')!;
    expect(raidCandidates(s).map((w) => w.kind)).toEqual(['zombie']);
    expect(startRaid(s, 'chuck', [you.id])).toMatch(/at least one/);
    const r = startRaid(s, 'chuck', [you.id, ...crewIds(s)]) as RaidState;
    expect(squad(r).map((u) => u.kind)).toEqual(['zombie']);
    expect(you.state).not.toBe('raiding');
  });

  it('a zombie can leave the stove for a raid; the dish waits, paused, until a cook comes back', () => {
    const s = withCrew(['construction']);
    const z = s.workers.find((w) => w.kind === 'zombie')!;
    const stove = s.stoves[0];
    expect(startCooking(s, z.id, stove.id, 'sliders')).toBeNull();
    for (let i = 0; i < 200 && z.state !== 'cooking'; i++) tick(s, 0.1);
    expect(z.state).toBe('cooking');
    expect(startRaid(s, 'chuck', [z.id])).toBeTypeOf('object');
    expect(z.state).toBe('raiding');
    const left = stove.left;
    for (let i = 0; i < 300; i++) tick(s, 0.1);
    expect(stove.status).toBe('paused'); // like the original: no cook at the stove, no cooking
    expect(stove.left).toBe(left);
  });
});

describe('movement and blows: the original’s numbers (doc 21c §2–3)', () => {
  it('speed is 2 + 0.2·Speed (×0.669 tiles/s), zombies 1.2× slower; every raider uses it', () => {
    expect(raidSpeed(4)).toBeCloseTo(1.87, 2); // doc 10 §3.1: an average customer
    expect(raidSpeed(1)).toBeCloseTo(1.47, 2);
    expect(raidSpeed(10)).toBeCloseTo(2.68, 2);
    expect(raidSpeed(4) / raidSpeed(4, true)).toBeCloseTo(1.2, 6);
    const s = withCrew(['teen', 'construction'], 5, 12);
    const r = raid(s);
    for (const u of squad(r)) {
      const w = s.workers.find((x) => x.id === u.ref)!;
      expect(u.speed).toBeCloseTo(raidSpeed(w.stats.speed, true), 6);
    }
    const c = rivalCurve(r.level);
    for (const w of staffOf(r)) expect(w.speed).toBeCloseTo(raidSpeed(c.serverSpd), 6);
    expect(chefOf(r).speed).toBeCloseTo(raidSpeed(c.chefSpd), 6);
    // the teen (Speed 7) outpaces the hardhat (Speed 3)
    const [teen, hardhat] = squad(r);
    expect(teen.speed).toBeGreaterThan(hardhat.speed);
  });

  it('a swing every 1000 / (2 + 0.2·Speed) ms, the first one a full interval after stepping into reach', () => {
    expect(swingSec(1)).toBeCloseTo(0.4545, 3);
    expect(swingSec(10)).toBeCloseTo(0.25, 6);
    const s = withCrew(['construction']);
    const r = raid(s);
    const z = squad(r)[0];
    const w = staffOf(r)[0];
    expect(z.cdMax).toBeCloseTo(swingSec(3), 6); // the hardhat's Speed 3
    expect(w.cdMax).toBeCloseTo(swingSec(rivalCurve(r.level).serverSpd), 6);
    freezeAllBut(r, z);
    w.hp = w.maxHp = 1e6;
    placeInside(r, z, w.x + 1, w.y);
    z.order = { kind: 'target', id: w.id };
    let first = -1;
    for (let t = 0; t < 2 && first < 0; t += 0.01) {
      stepRaid(r, 0.01);
      if (r.events.some((e) => e.t === 'hit' && e.by === z.id)) first = r.t;
    }
    expect(first).toBeGreaterThan(z.cdMax - 0.03);
    expect(first).toBeLessThan(z.cdMax + 0.03);
  });

  it('damage = the Attack stat, no pace factor, no noise; waiters hit for the level’s server strength', () => {
    const s = withCrew(['construction']); // Power 9
    const r = raid(s);
    const z = squad(r)[0];
    const w = staffOf(r)[0];
    freezeAllBut(r, z, w);
    w.maxHp = w.hp = 1e6;
    placeInside(r, z, w.x + 1, w.y);
    z.order = { kind: 'target', id: w.id };
    for (let i = 0; i < 100; i++) stepRaid(r, 0.05);
    const ours = r.events.filter((e) => e.t === 'hit' && e.by === z.id);
    expect(ours.length).toBeGreaterThan(3);
    for (const e of ours) expect(e.t === 'hit' && e.dmg).toBe(9);
    const theirs = r.events.filter((e) => e.t === 'hit' && e.by === w.id);
    expect(theirs.length).toBeGreaterThan(0);
    for (const e of theirs) expect(e.t === 'hit' && e.dmg).toBe(rivalCurve(r.level).serverStr);
  });

  it('every hit knocks the victim one tile away from the attacker, never into furniture or out of the café', () => {
    const s = withCrew(['construction']);
    const r = raid(s);
    const z = squad(r)[0];
    const w = staffOf(r)[0];
    freezeAllBut(r, z);
    w.maxHp = w.hp = 1e6;
    // waiter at (5,1), zombie to its right at (6,1): pushed one tile left to (4,1), if that's free
    Object.assign(w, { x: 5, y: 1, path: [] });
    placeInside(r, z, 6, 1);
    z.order = { kind: 'target', id: w.id };
    expect(r.furniture.some((f) => f.x === 4 && f.y === 1)).toBe(false);
    for (let t = 0; t < 1 && !r.events.some((e) => e.t === 'hit'); t += 0.01) stepRaid(r, 0.01);
    expect(w.push).toEqual({ x: 4, y: 1 });
    for (let i = 0; i < 20; i++) stepRaid(r, 0.01);
    expect([w.x, w.y]).toEqual([4, 1]);
    // the zombie steps in after it (it's out of reach now), and swings again
    expect(Math.hypot(z.x - w.x, z.y - w.y)).toBeGreaterThan(1.5);
    let closest = 9;
    for (let i = 0; i < 100; i++) {
      stepRaid(r, 0.01);
      closest = Math.min(closest, Math.hypot(z.x - w.x, z.y - w.y));
    }
    expect(closest).toBeLessThan(1.5);
    expect(r.events.filter((e) => e.t === 'hit' && e.by === z.id).length).toBeGreaterThanOrEqual(2);
    // against furniture: no push
    const table = r.furniture.find((f) => ITEM_BY_ID[f.item].kind === 'table')!;
    Object.assign(w, { x: table.x, y: table.y - 1, path: [], push: undefined });
    placeInside(r, z, table.x, table.y - 2);
    const hits = r.events.filter((e) => e.t === 'hit').length;
    for (let t = 0; t < 1 && r.events.filter((e) => e.t === 'hit').length === hits; t += 0.01) stepRaid(r, 0.01);
    expect(w.push).toBeUndefined();
    // against the outer wall (y = 0, the door wall): no push out of the café
    Object.assign(w, { x: 6, y: 0, path: [], push: undefined });
    placeInside(r, z, 6, 1);
    const hits2 = r.events.filter((e) => e.t === 'hit').length;
    for (let t = 0; t < 1 && r.events.filter((e) => e.t === 'hit').length === hits2; t += 0.01) stepRaid(r, 0.01);
    expect(w.push).toBeUndefined();
  });
});

describe('the fight (doc 21c §1)', () => {
  it('before anyone is inside the joint runs as a café: waiters carry plates to the diners', () => {
    const s = withCrew(['construction', 'teen']);
    const r = raid(s);
    let delivered = false;
    for (let t = 0; t < 30; t += 0.05) {
      stepRaid(r, 0.05);
      if (staffOf(r).some((w) => w.task?.kind === 'home')) delivered = true;
    }
    expect(delivered).toBe(true);
    expect(r.aggro).toBe(false);
    expect(squad(r).every((u) => u.state === 'queued')).toBe(true);
    expect(r.units.filter((u) => u.kind === 'customer').every((c) => c.state === 'idle' || c.state === 'walk')).toBe(true);
  });

  it('it goes live the moment the first zombie steps inside: diners scream, waiters drop their plates', () => {
    const s = withCrew(['construction', 'teen']);
    const r = raid(s);
    expect(sendOne(r)).toBeNull();
    const z = squad(r).find((u) => u.state !== 'queued')!;
    let wasInsideBeforeLive = false;
    for (let t = 0; t < 20 && !r.aggro; t += 0.05) {
      stepRaid(r, 0.05);
      if (!r.aggro && Math.round(z.y) >= 0 && Math.round(z.x) >= 0 && Math.round(z.x) < r.room.w) wasInsideBeforeLive = true;
    }
    expect(wasInsideBeforeLive).toBe(false);
    expect(r.aggro).toBe(true);
    expect(r.liveAt).toBeGreaterThan(0);
    expect(r.events.some((e) => e.t === 'live')).toBe(true);
    expect(r.events.some((e) => e.t === 'scream')).toBe(true);
    expect(staffOf(r).every((w) => !w.task)).toBe(true);
    // the one still in line hasn't moved
    expect(squad(r).filter((u) => u.state === 'queued')).toHaveLength(1);
  });

  it('waiters lock on to the nearest zombie inside and keep it; they drop it when it leaves the café', () => {
    const s = withCrew(['construction', 'construction']);
    const r = raid(s);
    const [a, b] = squad(r);
    const w = staffOf(r)[0];
    Object.assign(w, { x: 5, y: 1, path: [] });
    placeInside(r, a, 5, 3); // 2 tiles away
    placeInside(r, b, 7, 6); // further
    a.busyUntil = b.busyUntil = 1e9; // standing still
    chefOf(r).busyUntil = 1e9;
    stepRaid(r, 0.05);
    expect(w.target).toBe(a.id);
    // B wanders right up to the waiter: it stays on A (locked)
    Object.assign(b, { x: w.x + 1, y: w.y });
    for (let i = 0; i < 5; i++) stepRaid(r, 0.05);
    expect(w.target).toBe(a.id);
    // A walks out of the door: dropped, and the waiter turns to B
    Object.assign(a, { x: DOOR_X, y: -1 });
    stepRaid(r, 0.05);
    expect(w.target).toBe(b.id);
  });

  it('the Head Chef stays at the stove until every waiter is down, then comes out', () => {
    const s = withCrew(['construction', 'accountant', 'teen'], 5, 5);
    const r = raid(s);
    expect(r.level).toBe(2);
    sendAll(r);
    let leftStoveEarly = false;
    for (let t = 0; t < 300 && r.phase === 'fight'; t += 0.05) {
      stepRaid(r, 0.05);
      const chef = chefOf(r);
      const staffUp = staffOf(r).some((u) => u.hp > 0);
      expect(r.bossOut).toBe(!staffUp && r.aggro);
      if (staffUp && !chef.target && Math.hypot(chef.x - chefSpot(r).x, chef.y - chefSpot(r).y) > 0.3) leftStoveEarly = true;
    }
    expect(leftStoveEarly).toBe(false);
    expect(r.phase).toBe('won');
    expect(r.events.some((e) => e.t === 'boss')).toBe(true);
    const res = finishRaid(s, r);
    expect(res.result).toBe('won');
    expect(res.recipeDrop).toBe('chili');
    expect(s.fridge.some((f) => f.dish === 'chili')).toBe(true);
    expect(s.rivals.chuck.wins).toBe(1);
    expect(res.stars).toBeGreaterThanOrEqual(1);
    expect(rivalReady(s, 'hank')).toBeNull();
    expect(rivalReady(s, 'chuck')).toMatch(/Boarded up/);
    expect(s.workers.every((w) => w.state !== 'raiding')).toBe(true);
  });

  it('…but hit the chef early and it fights back (anyone who is hit turns on the attacker)', () => {
    const s = withCrew(['boxer']);
    const r = raid(s);
    const z = squad(r)[0];
    const chef = chefOf(r);
    expect(staffOf(r).some((w) => w.hp > 0)).toBe(true);
    freezeAllBut(r, z, chef);
    placeInside(r, z, chef.x + 1, chef.y);
    expect(order(r, z.id, { kind: 'target', id: chef.id })).toBeNull();
    for (let t = 0; t < 2 && !chef.target; t += 0.05) stepRaid(r, 0.05);
    expect(chef.target).toBe(z.id);
    expect(r.bossOut).toBe(false);
    for (let i = 0; i < 40; i++) stepRaid(r, 0.05);
    expect(r.events.some((e) => e.t === 'hit' && e.by === chef.id && e.unit === z.id)).toBe(true);
  });

  it('a rampaging zombie goes for the nearest diner or waiter inside, never the chef while a waiter stands', () => {
    const s = withCrew(['boxer']);
    const r = raid(s);
    const z = squad(r)[0];
    const chef = chefOf(r);
    freezeAllBut(r, z);
    placeInside(r, z, chef.x + 2, chef.y + 2); // right by the kitchen
    for (let i = 0; i < 20; i++) stepRaid(r, 0.05);
    expect(z.target).toBeTruthy();
    expect(z.target).not.toBe(chef.id);
    const t = r.units.find((u) => u.id === z.target)!;
    expect(['staff', 'customer']).toContain(t.kind);
  });

  it('a rampaging zombie that is hit turns on its attacker; one you gave a target keeps to its orders', () => {
    const s = withCrew(['boxer', 'boxer']);
    const r = raid(s);
    const [a, b] = squad(r);
    const [w] = staffOf(r);
    const diner = r.units.find((u) => u.kind === 'customer')!;
    for (const u of r.units) if (u !== a && u !== b && u !== w) u.busyUntil = 1e9;
    w.maxHp = w.hp = 1e6;
    placeInside(r, a, w.x + 1, w.y);
    a.target = diner.id; // on a rampage, heading for a diner across the room
    placeInside(r, b, w.x - 1, w.y);
    order(r, b.id, { kind: 'target', id: diner.id });
    a.busyUntil = b.busyUntil = 1e9;
    w.target = a.id;
    for (let i = 0; i < 20; i++) stepRaid(r, 0.05);
    expect(a.target).toBe(w.id);
    w.target = b.id;
    w.engaged = undefined;
    for (let i = 0; i < 20; i++) stepRaid(r, 0.05);
    expect(b.target).toBe(diner.id);
  });

  it('more diners wander in off the street during the raid (every 5-20 s), and head for a free chair', () => {
    const s = withCrew(['construction']);
    const r = raid(s);
    const before = r.units.filter((u) => u.kind === 'customer').length;
    // nobody goes in: a quiet café keeps filling up
    for (let i = 0; i < 120 / 0.05; i++) stepRaid(r, 0.05);
    const diners = r.units.filter((u) => u.kind === 'customer');
    expect(diners.length).toBeGreaterThan(before);
    expect(r.events.some((e) => e.t === 'arrive')).toBe(true);
    const seats = diners.map((d) => d.seatId);
    expect(new Set(seats).size).toBe(seats.length);
    const settled = diners.filter((d) => d.state === 'idle');
    for (const d of settled) {
      const c = r.furniture.find((f) => f.id === d.seatId)!;
      expect([d.x, d.y]).toEqual([c.x, c.y]);
    }
    expect(settled.length).toBeGreaterThan(before);
  });

  it('each customer killed: +20 cash and +2 XP (kept win or lose), +5 energy to the eater, +2 XP to the zombie', () => {
    const s = withCrew(['construction', 'accountant', 'teen', 'cop']);
    const r = raid(s);
    sendAll(r);
    const log: RaidEvent[] = [];
    for (let t = 0; t < 320 && r.phase === 'fight'; t += 0.05) {
      stepRaid(r, 0.05);
      log.push(...r.events.splice(0));
    }
    const eats = log.filter((e) => e.t === 'eat');
    const escaped = log.filter((e) => e.t === 'escape').length;
    const diners = r.units.filter((u) => u.kind === 'customer');
    // everyone who was there or walked in is either eaten or gone
    expect(eats.length + escaped).toBe(diners.filter((d) => d.state === 'gone').length);
    for (const e of eats) expect(e.t === 'eat' && e.cash).toBe(CUSTOMER_CASH);
    expect(CUSTOMER_CASH).toBe(20);
    expect(r.cashEaten).toBe(20 * eats.length);
    expect(r.eaten).toBe(eats.length);
    // a kill on the spot: +5 energy to the eater
    const s2 = withCrew(['construction']);
    const r2 = raid(s2);
    const z = squad(r2)[0];
    const d = r2.units.find((u) => u.kind === 'customer')!;
    freezeAllBut(r2, z);
    placeInside(r2, z, d.x + 1, d.y);
    z.hp = 50;
    d.hp = 1;
    expect(order(r2, z.id, { kind: 'target', id: d.id })).toBeNull();
    for (let t = 0; t < 3 && d.state !== 'gone'; t += 0.05) stepRaid(r2, 0.05);
    expect(d.state).toBe('gone');
    expect(z.hp).toBe(50 + KILL_HEALTH_BOOST);
    expect(r2.cashEaten).toBe(20);
    retreat(r2);
    const w = s2.workers.find((x) => x.id === z.ref)!;
    const xp0 = w.xp;
    const cash0 = s2.cash;
    const res = finishRaid(s2, r2);
    expect(res.cash).toBe(20);
    expect(s2.cash).toBe(cash0 + 20);
    expect(res.xp).toBe(XP_PER_EAT + Math.round(r2.stats.reward.xp * 0.15 * Math.min(1, r2.dealt / (r2.stats.staff.count * r2.stats.staff.hp + r2.stats.chef.hp))));
    expect(w.xp - xp0).toBe(ZOMBIE_KILL_XP);
  });

  it('diners panic: scream, run round the room, then out of the door', () => {
    const s = withCrew(['construction']);
    const r = raid(s);
    const z = squad(r)[0];
    z.busyUntil = 1e9;
    for (const w of [...staffOf(r), chefOf(r)]) w.busyUntil = 1e9;
    placeInside(r, z, 3, 6);
    stepRaid(r, 0.05); // (aggro set by hand: the diners get going on the next step)
    const diners = r.units.filter((u) => u.kind === 'customer');
    for (let t = 0; t < 3; t += 0.05) stepRaid(r, 0.05);
    expect(diners.every((d) => d.state === 'flee' || d.state === 'scream')).toBe(true);
    for (let t = 0; t < 40; t += 0.05) stepRaid(r, 0.05);
    expect(diners.every((d) => d.state === 'gone')).toBe(true);
    expect(r.events.filter((e) => e.t === 'escape').length).toBeGreaterThanOrEqual(diners.length);
  });

  it('a lone tired zombie loses, gets KO’d and reanimates an hour later (the later versions’ 1 h, not 8 h)', () => {
    expect(TUNING.reanimateSec).toBe(3600);
    const s = withCrew(['teen']);
    beat(s, 'chuck');
    const z = s.workers.find((w) => w.kind === 'zombie')!;
    z.energy = 40;
    const r = raid(s, 'hank');
    sendAll(r);
    play(r);
    expect(r.phase).toBe('lost');
    const cash = s.cash;
    const res = finishRaid(s, r);
    expect(res.result).toBe('lost');
    expect(z.state).toBe('down');
    expect(s.cash).toBe(cash + res.cash);
    for (let i = 0; i < 30 * 60; i++) tick(s, 1);
    expect(z.state).toBe('down');
    for (let i = 0; i < 31 * 60; i++) tick(s, 1);
    expect(z.state).not.toBe('down');
  });

  it('tap a zombie, then the counter: it swipes a quarter-size stack in 2 s, kept even on retreat', () => {
    const s = withCrew(['construction', 'cop', 'nurse']);
    const r = raid(s);
    const dish = r.counter[0].dish;
    expect(r.counter[0].servings).toBe(raidStack(dish));
    const thief = squad(r)[0];
    // (the waiters busy elsewhere: a thief they catch gets knocked about and never reaches the counter)
    for (const u of [...staffOf(r), chefOf(r)]) u.busyUntil = 1e9;
    expect(order(r, thief.id, { kind: 'steal', slot: 0 })).toBeNull();
    for (let t = 0; t < 40 && !r.stolen.length && r.phase === 'fight'; t += 0.05) stepRaid(r, 0.05);
    expect(r.stolen).toEqual([dish]);
    expect(thief.busyUntil - r.t).toBeGreaterThan(1.9);
    expect(stealDish(r, 0)).toMatch(/Already/);
    retreat(r);
    const res = finishRaid(s, r);
    expect(res.result).toBe('retreat');
    expect(res.dishes).toEqual([dish]);
    expect(s.fridge).toEqual([{ dish, servings: raidStack(dish) }]);
  });

  it('the command flow: tap a zombie (in line or inside), then a target; it goes for that one', () => {
    const s = withCrew(['boxer', 'boxer']);
    const r = raid(s);
    const z = squad(r)[0];
    const waiter = staffOf(r)[0];
    expect(order(r, z.id, { kind: 'target', id: waiter.id })).toBeNull();
    expect(z.state).toBe('walk'); // out of the line-up
    expect(squad(r)[1].state).toBe('queued'); // the other one waits
    for (let t = 0; t < 30 && waiter.hitAt < 0; t += 0.05) stepRaid(r, 0.05);
    expect(r.events.find((e) => e.t === 'hit' && e.by === z.id)).toMatchObject({ unit: waiter.id });
    // nonsense targets are refused
    expect(order(r, z.id, { kind: 'target', id: squad(r)[1].id })).toMatch(/still standing/);
  });

  it('there is no raid clock: after five minutes of standoff the squad gives up and comes home (a retreat)', () => {
    expect(RAID_TIME).toBe(300);
    const s = withCrew(['boxer']);
    const r = raid(s);
    for (let t = 0; t < 299; t += 0.5) stepRaid(r, 0.5);
    expect(r.phase).toBe('fight');
    for (let t = 0; t < 2; t += 0.5) stepRaid(r, 0.5);
    expect(r.phase).toBe('retreat');
    expect(finishRaid(s, r).result).toBe('retreat');
  });

  it('is deterministic for the same starting state', () => {
    const go = () => {
      const s = withCrew(['construction', 'accountant', 'teen'], 77, 5);
      const r = raid(s);
      sendAll(r);
      play(r);
      return `${r.phase}:${r.t.toFixed(2)}:${r.cashEaten}:${r.counter.map((c) => c.dish)}`;
    };
    expect(go()).toBe(go());
  });

  it('every joint on the road (and the boss café) is beatable by a full crew for its level, and not by a token one', () => {
    const strong = ['boxer', 'lumberjack', 'construction', 'cop', 'benchwarmer', 'nurse', 'sumo', 'champ'];
    for (const rv of [...ROAD, RIVAL_BY_ID.boss]) {
      const lvl = rv.id === 'boss' ? 13 : rv.level + 3;
      const crew = Array.from({ length: crewCapForLevel(lvl) }, (_, i) => strong[i % strong.length]);
      const s = withCrew(crew, 11, lvl);
      beatBefore(s, rv.id);
      if (rv.id === 'boss') s.now = 100;
      const r = raid(s, rv.id);
      sendAll(r);
      play(r);
      expect(`${rv.id}:${r.phase}`).toBe(`${rv.id}:won`);
      if (rv.id === 'chuck') continue; // a level-2 joint's one weak waiter is fair game for anyone
      const weak = withCrew(['yoga'], 11, lvl);
      beatBefore(weak, rv.id);
      if (rv.id === 'boss') weak.now = 100;
      const r2 = raid(weak, rv.id);
      sendAll(r2);
      play(r2);
      expect(`${rv.id}:${r2.phase}`).toBe(`${rv.id}:lost`);
    }
  });
});

describe('rivals scale with you (doc 10 §2.7 curves, as-is)', () => {
  it('the curves are the original’s, plateauing after ~26', () => {
    expect(rivalCurve(1)).toMatchObject({ customers: 2, servers: 1, serverStr: 1, serverSpd: 3, chefHp: 80, chefStr: 1, chefSpd: 3, cash: 10, xp: 2 });
    expect(rivalCurve(15)).toMatchObject({ customers: 5, servers: 4, serverStr: 4, serverSpd: 6, chefHp: 470, chefStr: 7, chefSpd: 1 });
    expect(rivalCurve(30)).toMatchObject({ customers: 7, servers: 7, chefHp: 750, chefStr: 8, chefSpd: 8, cash: 300, xp: 60 });
    expect(rivalCurve(35)).toMatchObject({ customers: 8, servers: 8, chefHp: 755 });
    expect(rivalCurve(50)).toMatchObject({ customers: 9, servers: 9 });
    expect(rivalCurve(83)).toMatchObject({ customers: 9, servers: 9, chefHp: 770, cash: 830, xp: 166 });
    expect(rivalCurve(200).chefHp).toBe(770);
  });

  it('a raid uses them straight: waiters 90 HP hitting for the server strength, the chef’s HP / strength / speed', () => {
    expect(STAFF_HP).toBe(90);
    expect(rivalStats('chuck', 2)).toMatchObject({ diners: 2, dinerCash: 20, staff: { count: 1, hp: 90, dmg: 1, spd: 3 }, chef: { hp: 100, dmg: 2, spd: 3 }, reward: { cash: 250, xp: 60 } });
    expect(rivalStats('snob', 12)).toMatchObject({ staff: { count: 4, hp: 90, dmg: 4, spd: 5 }, chef: { hp: 390, dmg: 5, spd: 5 } });
    expect(rivalStats('chuck', 20).reward.cash).toBe(2 * rivalStats('chuck', 10).reward.cash);
    const s = withCrew(['boxer'], 5, 20);
    const r = raid(s);
    expect(r.level).toBe(16);
    const c = rivalCurve(16);
    expect(staffOf(r)).toHaveLength(c.servers);
    for (const w of staffOf(r)) expect([w.maxHp, w.dmg]).toEqual([90, c.serverStr]);
    expect([chefOf(r).maxHp, chefOf(r).dmg]).toEqual([c.chefHp, c.chefStr]);
  });

  it('the boss café: four minions and the chef, ×BOSS_MULTIPLIER (1.0 at level 5, +0.1 a level)', () => {
    expect(bossMultiplier(5)).toBe(1);
    expect(bossMultiplier(15)).toBeCloseTo(2, 6);
    const st = rivalStats('boss', 15);
    expect(st.minions!.map((m) => m.hp)).toEqual(BOSS_MINION_STATS.map((m) => m.hp * 2));
    expect(st.chef.hp).toBe(rivalCurve(15).chefHp * 2);
    expect(st.chef.dmg).toBe(10); // strength stays on the 1–10 scale
    const s = withCrew(['boxer'], 5, 15);
    s.now = 100;
    const r = raid(s, 'boss');
    expect(staffOf(r).map((u) => u.maxHp)).toEqual(st.minions!.map((m) => m.hp));
  });

  it('a joint runs at its road level until you outgrow it, then follows you', () => {
    const s = withCrew([], 5, 2);
    expect(rivalLevel(s, 'chuck')).toBe(2);
    s.level = 6;
    expect(rivalLevel(s, 'chuck')).toBe(2);
    s.level = 20;
    expect(rivalLevel(s, 'chuck')).toBe(16);
    expect(rivalLevel(s, 'clown')).toBe(25);
    s.level = 30;
    expect(rivalLevel(s, 'clown')).toBe(31);
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: 0, gen: 1 };
    expect(rivalLevel(s, 'chuck')).toBe(26);
  });

  it('the road goes on past Le Snob: four more themes, each unlocking later, after the one before', () => {
    expect(ROAD.map((r) => r.id)).toEqual(['chuck', 'hank', 'vera', 'crunch', 'snob', 'sushi', 'taco', 'lab', 'clown']);
    const levels = ROAD.map((r) => r.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    const s = withCrew(['boxer'], 5, 30);
    expect(rivalReady(s, 'sushi')).toMatch(/previous/);
    beatBefore(s, 'sushi');
    expect(rivalReady(s, 'sushi')).toBeNull();
    s.level = 12;
    expect(rivalReady(s, 'sushi')).toMatch(/level 13/);
  });
});

describe('loot (doc 21c §6.4)', () => {
  it('the counter is rolled from YOUR recipes, at your level -3..+1 (a level you don’t have falls back below)', () => {
    const levelOf = (id: string) => DISH_BY_ID[DISH_BY_ID[id].base ?? id].level;
    const s = withCrew(['boxer'], 5, 6);
    const r = raid(s);
    const seen: Record<number, number> = {};
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const id = rollCounterDish(s, r);
      const base = DISH_BY_ID[DISH_BY_ID[id].base ?? id];
      if (base.source === 'raid') continue; // the rare raid-only recipe
      seen[levelOf(id)] = (seen[levelOf(id)] ?? 0) + 1;
    }
    const levels = Object.keys(seen).map(Number);
    expect(Math.max(...levels)).toBeLessThanOrEqual(6); // never a dish you couldn't cook yourself
    expect(levels).toContain(3);
    // [15, 35, 65, 95, 100]: your own level ~30%, plus the +1 roll falling back to it (~5%)
    expect(seen[6] / N).toBeGreaterThan(0.28);
    s.level = 30;
    for (let i = 0; i < 200; i++) expect(DISH_BY_ID[rollCounterDish(s, r)]).toBeTruthy();
    for (const d of DISHES) expect(raidStack(d.id)).toBe(Math.max(1, Math.round(d.servings / 4)));
  });

  it('variants come with the original’s ten-way odds: 60% plain, Spicy 8, Very Spicy 4, Fancy 5…', () => {
    const s = withCrew(['boxer'], 5, 8);
    const r = raid(s);
    const N = 6000;
    const count: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const v = DISH_BY_ID[rollCounterDish(s, r)].variant ?? 'plain';
      count[v] = (count[v] ?? 0) + 1;
    }
    let prev = 0;
    for (const [v, cum] of COUNTER_VARIANT_ODDS) {
      const want = (cum - prev) / 100;
      prev = cum;
      expect((count[v ?? 'plain'] ?? 0) / N, v ?? 'plain').toBeGreaterThan(want - 0.025);
      expect((count[v ?? 'plain'] ?? 0) / N, v ?? 'plain').toBeLessThan(want + 0.025);
    }
  });

  it('win and you take whatever is still on their counter', () => {
    const s = withCrew(['construction', 'accountant', 'teen'], 5, 5);
    const r = raid(s);
    const counter = r.counter.map((c) => ({ dish: c.dish, servings: c.servings }));
    sendAll(r);
    play(r);
    expect(r.phase).toBe('won');
    const res = finishRaid(s, r);
    for (const c of counter) {
      const i = res.dishes.indexOf(c.dish);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(res.servings[i]).toBe(c.servings);
      expect(s.fridge).toContainEqual(c);
    }
  });

  it('a knocked-out waiter just lies there (no cash for staff, as in the original)', () => {
    const s = withCrew(['construction']);
    const r = raid(s);
    const z = squad(r)[0];
    const w = staffOf(r)[0];
    freezeAllBut(r, z);
    placeInside(r, z, w.x + 1, w.y);
    w.hp = 1;
    order(r, z.id, { kind: 'target', id: w.id });
    for (let t = 0; t < 2 && w.state !== 'down'; t += 0.05) stepRaid(r, 0.05);
    expect(w.state).toBe('down');
    expect(z.kills).toBe(1);
    for (let i = 0; i < 40; i++) stepRaid(r, 0.05);
    expect(w.state).toBe('down');
    expect(r.cashEaten).toBe(0);
  });

  it('a theme without a signature dish hands over a secret recipe you don’t know yet', () => {
    const s = withCrew(Array(10).fill('boxer'), 5, 20);
    beatBefore(s, 'sushi');
    const r = raid(s, 'sushi');
    chefOf(r).hp = 0;
    stepRaid(r, 0.05);
    const res = finishRaid(s, r);
    expect(DISH_BY_ID[res.recipeDrop!].source).toBe('raid');
    expect(s.recipes).not.toContain(res.recipeDrop);
    expect(res.dishes).toContain(res.recipeDrop);
  });
});

describe('tombstones (doc 21c §5)', () => {
  it('strength: ×2 damage for 5 s for the whole squad', () => {
    expect(STR_BUFF).toBe(2);
    const dealt = (buff: boolean) => {
      const s = withCrew(['construction']);
      const red = addFurniture(s, 'tombstone_str', 8, 2);
      const r = raid(s);
      const z = squad(r)[0];
      const w = staffOf(r)[0];
      freezeAllBut(r, z);
      w.hp = w.maxHp = 1e6;
      placeInside(r, z, w.x + 1, w.y);
      z.order = { kind: 'target', id: w.id };
      if (buff) expect(useTombstone(s, r, red.id)).toBeNull();
      for (let i = 0; i < 40; i++) stepRaid(r, 0.05);
      return r.events.filter((e) => e.t === 'hit' && e.by === z.id).map((e) => (e.t === 'hit' ? e.dmg : 0));
    };
    expect(dealt(false).every((d) => d === 9)).toBe(true);
    expect(dealt(true).every((d) => d === 18)).toBe(true);
  });

  it('health: +100 energy spread over the 5 s (+20/s), capped at max, for zombies and pets alike', () => {
    expect(HP_BUFF).toBe(100);
    const s = withCrew(['sumo']);
    const green = addFurniture(s, 'tombstone_hp', 8, 3);
    const r = raid(s);
    const z = squad(r)[0];
    z.state = 'idle';
    z.maxHp = 500;
    z.hp = 100;
    z.busyUntil = 1e9;
    expect(useTombstone(s, r, green.id)).toBeNull();
    for (let i = 0; i < 20; i++) stepRaid(r, 0.05);
    expect(z.hp).toBeCloseTo(120, 0); // one second in
    for (let i = 0; i < 100; i++) stepRaid(r, 0.05);
    expect(z.hp).toBeCloseTo(200, 0);
  });

  it('one glow at a time, each stone once per raid, five uses a day (twelve at level 2), then a day to recharge', () => {
    const s = withCrew(['construction', 'boxer']);
    const red = addFurniture(s, 'tombstone_str', 8, 2);
    const green = addFurniture(s, 'tombstone_hp', 8, 3);
    expect(tombstoneMax(red)).toBe(TOMBSTONE_USES);
    const r = raid(s);
    sendAll(r);
    expect(useTombstone(s, r, red.id)).toBeNull();
    expect(useTombstone(s, r, green.id)).toMatch(/One blessing/);
    for (let i = 0; i < 110; i++) stepRaid(r, 0.05);
    expect(useTombstone(s, r, green.id)).toBeNull();
    expect(red.uses).toBe(4);
    for (let i = 0; i < 110; i++) stepRaid(r, 0.05);
    expect(useTombstone(s, r, red.id)).toMatch(/once per raid/);
    expect(red.uses).toBe(4);
    red.uses = 1;
    retreat(r);
    finishRaid(s, r);
    s.now += 61;
    for (const w of s.workers) Object.assign(w, { state: 'idle', energy: 100 });
    const r2 = raid(s);
    sendAll(r2);
    expect(useTombstone(s, r2, red.id)).toBeNull();
    const r3 = raid(withCrew(['boxer']));
    expect(useTombstone(s, r3, red.id)).toMatch(/Recharging/);
    s.now += 24 * 3600;
    expect(useTombstone(s, r3, red.id)).toBeNull();
  });

  it('"Recharge · 2 sauce" refills a spent tombstone; level 2 holds twelve uses', () => {
    expect(TOMBSTONE_USES_L2).toBe(12);
    const s = withCrew(['boxer']);
    const red = addFurniture(s, 'tombstone_str', 8, 2);
    s.sauce = 20;
    expect(rechargeTombstone(s, red.id)).toMatch(/fully charged/);
    red.uses = 0;
    red.usesResetAt = s.now + 3600;
    expect(tombstoneUses(s, red)).toBe(0);
    expect(rechargeTombstone(s, red.id)).toBeNull();
    expect(s.sauce).toBe(20 - TOMBSTONE_RECHARGE_SAUCE);
    expect(tombstoneUses(s, red)).toBe(5);
    s.sauce = TOMBSTONE_UPGRADE_SAUCE - 1;
    expect(upgradeTombstone(s, red.id)).toMatch(/Not enough/);
    s.sauce = TOMBSTONE_UPGRADE_SAUCE;
    expect(upgradeTombstone(s, red.id)).toBeNull();
    expect(red.lvl).toBe(2);
    expect(tombstoneUses(s, red)).toBe(12);
    expect(upgradeTombstone(s, red.id)).toMatch(/Already/);
    red.uses = 0;
    red.usesResetAt = s.now + 10;
    s.now += 11;
    expect(tombstoneUses(s, red)).toBe(12);
  });

  it('the revival stone stands every KO’d zombie back up with 100 energy, once a day, no level 2', () => {
    const s = withCrew(['boxer', 'champ']);
    const stone = addFurniture(s, 'tombstone_revive', 8, 2);
    expect(tombstoneMax(stone)).toBe(1);
    const r = raid(s);
    sendAll(r);
    expect(useTombstone(s, r, stone.id)).toMatch(/Nobody/);
    expect(tombstoneUses(s, stone)).toBe(1); // a wasted tap costs nothing
    const [a, b] = squad(r);
    b.hp = 0;
    b.state = 'down';
    expect(useTombstone(s, r, stone.id)).toBeNull();
    expect(b.state).not.toBe('down');
    expect(b.hp).toBe(Math.min(b.maxHp, REVIVE_ENERGY));
    expect(a.hp).toBe(a.maxHp);
    expect(r.events.some((e) => e.t === 'revive' && e.unit === b.id)).toBe(true);
    expect(tombstoneUses(s, stone)).toBe(0);
    s.sauce = 99;
    expect(upgradeTombstone(s, stone.id)).toMatch(/no level 2/);
    retreat(r);
    finishRaid(s, r);
    expect(s.workers.find((w) => w.id === b.ref)!.state).toBe('idle');
  });

  it('the Health Stone (ours) heals the whole squad +60 mid-raid (once per raid), and you can buy more; Big Foot-Long is limited', () => {
    const s = withCrew(['boxer', 'cop']);
    expect(s.inventory.headstone).toBe(1);
    const r = raid(s);
    expect(useHeadstone(s, r)).toMatch(/Send someone/);
    sendAll(r);
    stepRaid(r, 0.05);
    for (const u of squad(r)) Object.assign(u, { maxHp: 400, hp: 50, busyUntil: 1e9 });
    expect(useHeadstone(s, r)).toBeNull();
    expect(useHeadstone(s, r)).toMatch(/No Health Stones/);
    for (let i = 0; i < 80; i++) stepRaid(r, 0.05);
    for (const u of squad(r)) expect(u.hp).toBeCloseTo(110, 0);
    s.sauce = HEADSTONE_SAUCE;
    expect(buyHeadstone(s)).toBeNull();
    expect(useHeadstone(s, r)).toMatch(/One Health Stone per raid/);
    s.inventory.summon = 1;
    expect(useSummon(s, r)).toBeNull();
    expect(r.units.some((u) => u.kind === 'summon')).toBe(true);
    expect(useSummon(s, r)).toMatch(/No Summon/);
  });
});

describe('pets in raids (doc 21c §6.5)', () => {
  it('the original’s nine pets (250–1000 HP, crits ×2–×3) plus our Pug, each with art on the four-legged rig', () => {
    const orig = PETS.filter((p) => p.type !== 'pug');
    expect(orig).toHaveLength(9);
    expect(Math.min(...orig.map((p) => p.hp))).toBe(250);
    expect(Math.max(...orig.map((p) => p.hp))).toBe(1000);
    for (const p of orig) {
      expect([0.1, 0.2]).toContain(p.critChance);
      expect([2, 3]).toContain(p.critMult);
      expect(ITEM_BY_ID[p.house]?.pet, p.type).toBe(p.type);
    }
    expect(PET_BY_TYPE.wolf).toMatchObject({ hp: 950, atk: 11, aspd: 8, move: 9, critChance: 0.2, critMult: 3 });
    expect(PETS.filter((p) => p.robot)).toHaveLength(5);
    for (const p of PETS) {
      expect(PET_IDS as readonly string[]).toContain(petArt(p.type));
      const a = buildPet(petArt(p.type))!;
      expect(a.rig).toBe('quad');
      expect(Object.keys(a.faces ?? {})).toEqual(['chomp', 'dazed', 'happy']);
    }
  });

  it('a pet in the squad fights with its table stats, and lands crits', () => {
    const s = withCrew(['boxer']);
    s.pets.push({ id: 'p1', type: 'wolf', homeId: 'x', x: 0, y: 0, path: [], speed: 0, facing: 1, nextAction: 0, state: 'roam' });
    const r = startRaid(s, 'chuck', crewIds(s), ['p1']) as RaidState;
    const pet = r.units.find((u) => u.kind === 'pet')!;
    expect(pet).toMatchObject({ hp: 950, dmg: 11, art: 'pet_wolf', crit: { chance: 0.2, mult: 3 } });
    expect(pet.cdMax).toBeCloseTo(swingSec(8), 6);
    expect(pet.speed).toBeCloseTo(raidSpeed(9), 6); // no zombie slowdown
    expect(s.pets[0].state).toBe('raiding');
    // pets go for the staff, not the diners
    const diner = r.units.find((u) => u.kind === 'customer')!;
    expect(order(r, pet.id, { kind: 'target', id: diner.id })).toMatch(/Pets go for the staff/);
    // crits: always on for the test
    const w = staffOf(r)[0];
    freezeAllBut(r, pet);
    w.hp = w.maxHp = 1e6;
    pet.crit = { chance: 1, mult: 3 };
    placeInside(r, pet, w.x + 1, w.y);
    pet.order = { kind: 'target', id: w.id };
    for (let i = 0; i < 20; i++) stepRaid(r, 0.05);
    const hits = r.events.filter((e) => e.t === 'hit' && e.by === pet.id);
    expect(hits.length).toBeGreaterThan(0);
    for (const e of hits) expect(e.t === 'hit' && e.dmg).toBe(33);
    expect(r.events.some((e) => e.t === 'ability' && e.kind === 'crit')).toBe(true);
    retreat(r);
    finishRaid(s, r);
    expect(s.pets[0].state).toBe('roam');
  });
});

describe('the road changes over time', () => {
  it('reopen timers after a win: 4 / 8 / 12 / 18 h; the boss café’s cooldown 4 h', () => {
    expect([0, 1, 2, 3, 4, 9].map((g) => rivalClosedSec(g) / 3600)).toEqual([4, 8, 12, 18, 18, 18]);
    const s = withCrew(['champ', 'champ', 'champ'], 5, 13);
    s.now = 100;
    const r = raid(s, 'boss');
    chefOf(r).hp = 0;
    stepRaid(r, 0.05);
    finishRaid(s, r);
    expect(s.rivals.boss.nextAt - s.now).toBe(4 * 3600);
    expect(s.rivals.boss.gen ?? 0).toBe(0);
  });

  it('a wrecked joint boards up, then reopens under new management: tougher and richer', () => {
    const s = withCrew(['construction', 'accountant', 'teen', 'cop'], 5, 6);
    const r = raid(s);
    const chefHp = chefOf(r).maxHp;
    sendAll(r);
    play(r);
    finishRaid(s, r);
    expect(rivalReady(s, 'chuck')).toMatch(/Boarded/);
    s.now += RIVAL_CLOSED_SEC + 1;
    for (const w of s.workers) if (w.state === 'down') w.downUntil = 0;
    tick(s, 1);
    expect(rivalReady(s, 'chuck')).toBeNull();
    expect(rivalName(s, 'chuck')).not.toBe(ROAD[0].name);
    const r2 = raid(s);
    expect(r2.level).toBe(r.level);
    expect(chefOf(r2).maxHp).toBeGreaterThan(chefHp);
    expect(r2.stats.reward.cash).toBeGreaterThan(r.stats.reward.cash);
  });

  it('"Reopen now · 2 sauce" opens a boarded-up joint straight away', () => {
    const s = withCrew([]);
    expect(reopenRival(s, 'chuck')).toMatch(/already open/);
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: s.now + 3600, gen: 1 };
    s.sauce = 1;
    expect(reopenRival(s, 'chuck')).toMatch(/Not enough/);
    s.sauce = 5;
    expect(reopenRival(s, 'chuck')).toBeNull();
    expect(s.sauce).toBe(3);
    expect(rivalReady(s, 'chuck')).toBeNull();
    expect(reopenRival(s, 'boss')).toMatch(/own hours/);
  });

  it('a rival you leave alone too long poaches your customers and costs you half a star until you raid it', () => {
    const s = withCrew(['boxer', 'boxer', 'boxer']);
    s.rating = 0.6;
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: 0, lastRaid: 0 };
    s.now = NEGLECT_SEC - 10;
    expect(stealingRivals(s)).toEqual([]);
    expect(stars(s)).toBe(3);
    s.now = NEGLECT_SEC + 10;
    expect(stealingRivals(s)).toEqual(['chuck']);
    expect(stars(s)).toBe(3 - ENEMY_RATING_MODIFIER * 5);
    expect(s.rating).toBe(0.6);
    s.rivals.hank = { stars: 1, wins: 1, nextAt: 0, lastRaid: 0 };
    expect(stars(s)).toBe(2.5);
    delete s.rivals.hank;
    expect(unwarnedThieves(s)).toEqual(['chuck']);
    markWarned(s, 'chuck');
    expect(unwarnedThieves(s)).toEqual([]);
    const r = raid(s);
    sendAll(r);
    retreat(r);
    finishRaid(s, r);
    expect(stealingRivals(s)).toEqual([]);
    expect(stars(s)).toBe(3);
    s.now += NEGLECT_SEC + 61;
    expect(unwarnedThieves(s)).toEqual(['chuck']);
  });

  it('the boss café parks nearby from level 5, for a few hours at a time', () => {
    const s = withCrew([]);
    s.level = 4;
    s.now = 100;
    expect(bossHere(s)).toBe(false);
    s.level = 5;
    expect(bossHere(s)).toBe(true);
    expect(rivalReady(s, 'boss')).toBeNull();
    s.now = 5 * 3600;
    expect(bossHere(s)).toBe(false);
    expect(rivalReady(s, 'boss')).toMatch(/driven off/);
  });
});

describe('design audit notes (doc 13), where they fit the original', () => {
  it('reopenings are tougher by 1 + 0.15·min(gen, 5), so the road never closes', () => {
    const base = rivalStats('snob', 12, 0);
    expect(rivalStats('snob', 12, 1).chef.hp).toBe(Math.round(base.chef.hp * 1.15));
    expect(rivalStats('snob', 12, 5).staff.hp).toBe(Math.round(base.staff.hp * 1.75));
    expect(rivalStats('snob', 12, 10)).toEqual(rivalStats('snob', 12, 5));
    const s = withCrew(Array(6).fill('champ'), 11, 13);
    beatBefore(s, 'snob');
    s.rivals.snob = { stars: 1, wins: 10, nextAt: 0, gen: 10 };
    const r = raid(s, 'snob');
    sendAll(r);
    play(r);
    expect(r.phase).toBe('won');
  });

  it('a win pays at least ~2 hours of your current income', () => {
    const s = withCrew(['boxer'], 5, 30);
    s.rating = 1;
    for (let i = 0; i < 6; i++) {
      addFurniture(s, 'table_plain_white', 2 + (i % 3), 4 + 2 * Math.floor(i / 3));
      addFurniture(s, 'chair_plain_white', 2 + (i % 3), 3 + 2 * Math.floor(i / 3), 'sw');
    }
    const st = rivalStats('chuck', 2);
    expect(hourlyIncome(s)).toBeGreaterThan(st.reward.cash);
    expect(raidReward(s, st).cash).toBe(REWARD_INCOME_HOURS * hourlyIncome(s));
    const fresh = withCrew([], 5, 12);
    fresh.rating = 0;
    const late = rivalStats('clown', 30);
    expect(raidReward(fresh, late).cash).toBe(late.reward.cash);
    s.level = 6;
    expect(raidReward(s, st, 'chuck').cash).toBe(st.reward.cash);
  });

  it('the threat meter reads Easy / Even / Deadly from a quick play-out', () => {
    const s = withCrew(['construction', 'accountant', 'teen'], 5, 5);
    expect(raidThreat(s, 'chuck', crewIds(s)).label).toBe('Easy');
    const one = withCrew(['yoga'], 5, 16);
    beatBefore(one, 'taco');
    expect(raidThreat(one, 'taco', crewIds(one)).label).toBe('Deadly');
    const tired = withCrew(['construction', 'accountant', 'teen'], 5, 5);
    for (const w of tired.workers) w.energy = 10;
    expect(raidThreat(tired, 'chuck', crewIds(tired)).margin).toBeLessThan(raidThreat(s, 'chuck', crewIds(s)).margin);
    // a pet counts
    const withPet = withCrew(['yoga'], 5, 12);
    beatBefore(withPet, 'snob');
    withPet.pets.push({ id: 'p1', type: 'robolion', homeId: 'x', x: 0, y: 0, path: [], speed: 0, facing: 1, nextAction: 0, state: 'roam' });
    expect(raidThreat(withPet, 'snob', crewIds(withPet), ['p1']).margin).toBeGreaterThan(raidThreat(withPet, 'snob', crewIds(withPet)).margin);
    expect(raidPunch('joe', 4)).toBe(4);
    expect(raidPunch('boxer', 10)).toBe(15);
  });

  it('quality beats quantity: 3 Boxers do at least as well as a horde of 7 Joes against a mid rival', () => {
    const rate = (crew: string[]) => {
      let won = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const s = withCrew(crew, seed, 16);
        beatBefore(s, 'sushi');
        const r = raid(s, 'sushi');
        sendAll(r);
        play(r);
        if (r.phase === 'won') won++;
      }
      return won / 6;
    };
    expect(rate(['boxer', 'boxer', 'boxer'])).toBeGreaterThanOrEqual(rate(Array(7).fill('joe')));
  });

  it('raid abilities: Boxer one-two, Sumo slam, Cop cuffs, Cheerleader pep (no Champ taunt)', () => {
    const setup = (types: string[]) => {
      const s = withCrew(types);
      const r = raid(s);
      const z = squad(r)[0];
      const w = staffOf(r)[0];
      for (const u of r.units) if (u.side !== 'z') u.busyUntil = 1e9;
      w.hp = w.maxHp = 1e6;
      placeInside(r, z, w.x + 1, w.y);
      z.order = { kind: 'target', id: w.id };
      return { r, z, w };
    };
    const hitsOn = (r: RaidState, id: string) => r.events.filter((e) => e.t === 'hit' && e.unit === id).length;
    {
      const { r, z, w } = setup(['boxer']);
      for (let t = 0; t < 1 && !(z.swings ?? 0); t += 0.05) stepRaid(r, 0.05);
      expect(z.swings).toBe(1);
      expect(hitsOn(r, w.id)).toBe(2);
      expect(r.events.some((e) => e.t === 'ability' && e.kind === 'jab')).toBe(true);
    }
    {
      const { r, z } = setup(['sumo']);
      for (let t = 0; t < 10 && (z.swings ?? 0) < 3; t += 0.05) stepRaid(r, 0.05);
      expect(r.events.some((e) => e.t === 'ability' && e.kind === 'slam')).toBe(true);
    }
    {
      const { r, z, w } = setup(['cop']);
      for (let t = 0; t < 10 && (z.swings ?? 0) < 4; t += 0.05) stepRaid(r, 0.05);
      expect(r.events.some((e) => e.t === 'ability' && e.kind === 'stun')).toBe(true);
      expect(w.busyUntil).toBeGreaterThan(r.t + 1.3);
    }
    const dmgWith = (types: string[]) => {
      const { r, z, w } = setup(types);
      const buddy = squad(r)[1];
      if (buddy) Object.assign(buddy, { x: z.x, y: z.y + 1, state: 'idle', busyUntil: 1e9 });
      for (let i = 0; i < 100; i++) stepRaid(r, 0.05);
      return r.events.filter((e) => e.t === 'hit' && e.unit === w.id && e.by === z.id).reduce((a, e) => a + (e.t === 'hit' ? e.dmg : 0), 0);
    };
    expect(dmgWith(['construction', 'cheerleader']) / dmgWith(['construction', 'joe'])).toBeGreaterThan(1.08);
    // the Champ gets no taunt: the waiter goes for the nearest zombie
    {
      const s = withCrew(['construction', 'champ']);
      const r = raid(s);
      const [a, champ] = squad(r);
      const w = staffOf(r)[0];
      r.aggro = true;
      Object.assign(a, { state: 'idle', x: w.x + 1, y: w.y, busyUntil: 1e9 });
      Object.assign(champ, { state: 'idle', x: w.x - 2, y: w.y, busyUntil: 1e9 });
      stepRaid(r, 0.05);
      expect(w.target).toBe(a.id);
    }
  });

  it('every chef has a line for beating you and for being beaten', () => {
    for (const rv of RIVALS) expect(rv.defeat && rv.victory, rv.id).toBeTruthy();
  });
});

describe('bug hunt regressions', () => {
  it('instant retreats pay nothing and touch no timers (no XP farm)', () => {
    const s = withCrew(['boxer'], 5, 13);
    beatBefore(s, 'snob');
    const before = [s.level, s.xp, s.cash];
    for (let i = 0; i < 10; i++) {
      const r = raid(s, 'snob');
      retreat(r);
      const res = finishRaid(s, r);
      expect(res.xp).toBe(0);
      expect(res.cash).toBe(0);
    }
    expect([s.level, s.xp, s.cash]).toEqual(before);
    expect(s.rivals.snob).toBeUndefined();
    const r = raid(s, 'snob');
    sendAll(r);
    for (let t = 0; t < 20; t += 0.05) stepRaid(r, 0.05);
    retreat(r);
    const res = finishRaid(s, r);
    const total = r.stats.staff.count * r.stats.staff.hp + r.stats.chef.hp;
    expect(res.xp).toBe(r.eaten * XP_PER_EAT + Math.round(r.stats.reward.xp * 0.15 * Math.min(1, r.dealt / total)));
  });

  it('a win with no zombies (only pets or a summon) is worth one star, not three', () => {
    const s = withCrew(['boxer']);
    s.inventory.summon = 1;
    const r = raid(s);
    expect(useSummon(s, r)).toBeNull();
    chefOf(r).hp = 0;
    stepRaid(r, 0.05);
    expect(r.phase).toBe('won');
    expect(finishRaid(s, r).stars).toBe(1);
  });

  it('a raid on hold (scene still loading) doesn’t run its clock', () => {
    const s = withCrew(['boxer']);
    const r = raid(s);
    r.hold = true;
    sendAll(r);
    for (let i = 0; i < 100; i++) stepRaid(r, 0.05);
    expect(r.t).toBe(0);
    r.hold = false;
    stepRaid(r, 0.05);
    expect(r.t).toBeGreaterThan(0);
  });
});
