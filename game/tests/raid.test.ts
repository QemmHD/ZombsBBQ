import { describe, expect, it } from 'vitest';
import {
  BODY_CASH_MULT,
  CHEF_HP_SCALE,
  COUNTER_VARIANT_CHANCE,
  DISHES,
  DISH_BY_ID,
  DOOR_X,
  ENEMY_RATING_MODIFIER,
  HEADSTONE_SAUCE,
  ITEM_BY_ID,
  NEGLECT_SEC,
  RAID_TIME,
  RIVALS,
  RIVAL_BY_ID,
  RIVAL_CLOSED_SEC,
  ROAD,
  STR_BUFF,
  TOMBSTONE_RECHARGE_SAUCE,
  TOMBSTONE_UPGRADE_SAUCE,
  XP_PER_EAT,
  REWARD_INCOME_HOURS,
  hourlyIncome,
  raidPunch,
  raidReward,
  raidThreat,
  zombieRaidDmg,
  addFurniture,
  bossHere,
  buyHeadstone,
  createInitialState,
  crewCapForLevel,
  feastOn,
  finishRaid,
  focusTarget,
  inKitchen,
  isBody,
  makeWorker,
  markWarned,
  order,
  raidCandidates,
  raidStack,
  rechargeTombstone,
  reopenRival,
  retreat,
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
  decorBonus,
  stealDish,
  stealingRivals,
  stepRaid,
  tick,
  tombstoneUses,
  unwarnedThieves,
  upgradeTombstone,
  useHeadstone,
  useSummon,
  useTombstone,
  type GameState,
  type RaidEvent,
  type RaidState,
  type RivalId,
} from '../src/sim';

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
/** Knock one waiter out cold right next to a zombie that's already inside. */
function koWaiterNextTo(r: RaidState) {
  const z = r.units.find((u) => u.side === 'z')!;
  const w = r.units.find((u) => u.kind === 'staff')!;
  z.state = 'idle';
  z.x = w.x + 1;
  z.y = w.y;
  w.hp = 0;
  w.state = 'down';
  w.busyUntil = 0;
  r.aggro = true;
  return { z, w };
}

describe('the rival joint is a real café', () => {
  it('kitchen behind dividers and a counter, diners at single tables, waiters on the floor, the chef in the kitchen', () => {
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
    expect(r.units.filter((u) => u.kind === 'staff')).toHaveLength(1); // NUM_SERVERS[2] = 1
    const chef = r.units.find((u) => u.kind === 'boss')!;
    expect(inKitchen(r, chef)).toBe(true);
    // the door is clear and your squad waits single file on the sidewalk outside
    expect(r.furniture.some((f) => f.x === DOOR_X && (f.y === 0 || f.y === 1))).toBe(false);
    const squad = r.units.filter((u) => u.side === 'z');
    expect(squad.every((u) => u.state === 'queued' && u.y === -1 && u.x >= r.room.w)).toBe(true);
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
    expect(r.units.filter((u) => u.side === 'z').map((u) => u.kind)).toEqual(['zombie']);
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

describe('rivals scale with you (doc 10 §2.7 curves)', () => {
  it('the curves are the original’s, plateauing after ~26', () => {
    expect(rivalCurve(1)).toMatchObject({ customers: 2, servers: 1, serverStr: 1, serverSpd: 3, chefHp: 80, chefStr: 1, chefSpd: 3, cash: 10, xp: 2 });
    expect(rivalCurve(15)).toMatchObject({ customers: 5, servers: 4, serverStr: 4, serverSpd: 6, chefHp: 470, chefStr: 7, chefSpd: 1 });
    expect(rivalCurve(30)).toMatchObject({ customers: 7, servers: 7, chefHp: 750, chefStr: 8, chefSpd: 8, cash: 300, xp: 60 });
    expect(rivalCurve(35)).toMatchObject({ customers: 8, servers: 8, chefHp: 755 });
    expect(rivalCurve(50)).toMatchObject({ customers: 9, servers: 9 });
    expect(rivalCurve(83)).toMatchObject({ customers: 9, servers: 9, chefHp: 770, cash: 830, xp: 166 });
    expect(rivalCurve(200).chefHp).toBe(770);
    // in our units: waiters by strength, the chef's HP scaled, payout per level
    const st = rivalStats('chuck', 2);
    expect(st).toMatchObject({ diners: 2, staff: { count: 1, hp: 55, dmg: 4.6 }, chef: { hp: 100 * CHEF_HP_SCALE }, reward: { cash: 250, xp: 60 } });
    expect(rivalStats('chuck', 20).staff.count).toBe(5);
    expect(rivalStats('chuck', 20).chef.hp).toBeGreaterThan(rivalStats('chuck', 10).chef.hp);
    expect(rivalStats('chuck', 20).reward.cash).toBe(2 * rivalStats('chuck', 10).reward.cash);
  });

  it('a joint runs at its road level until you outgrow it, then follows you', () => {
    const s = withCrew([], 5, 2);
    expect(rivalLevel(s, 'chuck')).toBe(2);
    s.level = 6;
    expect(rivalLevel(s, 'chuck')).toBe(2);
    s.level = 20;
    expect(rivalLevel(s, 'chuck')).toBe(16); // early joints lag you by a few levels…
    expect(rivalLevel(s, 'clown')).toBe(25); // …the last on the road is a level above its opening
    s.level = 30;
    expect(rivalLevel(s, 'clown')).toBe(31);
    // new management doesn't change the level; it's tougher by a capped multiplier instead
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: 0, gen: 1 };
    expect(rivalLevel(s, 'chuck')).toBe(26);
    // and the raid really uses those numbers
    s.rivals = {};
    s.level = 20;
    s.workers.push(makeWorker(s, 'zombie', 'boxer', { x: 4, y: 4 }));
    const r = raid(s);
    expect(r.level).toBe(16);
    expect(r.units.filter((u) => u.kind === 'staff')).toHaveLength(rivalCurve(16).servers);
    expect(r.units.find((u) => u.kind === 'boss')!.maxHp).toBe(rivalStats('chuck', 16).chef.hp);
  });

  it('the road goes on past Le Snob: four more themes, each unlocking later, after the one before', () => {
    expect(ROAD.map((r) => r.id)).toEqual(['chuck', 'hank', 'vera', 'crunch', 'snob', 'sushi', 'taco', 'lab', 'clown']);
    const levels = ROAD.map((r) => r.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(RIVAL_BY_ID.sushi.level).toBeGreaterThan(RIVAL_BY_ID.snob.level);
    const s = withCrew(['boxer'], 5, 30);
    expect(rivalReady(s, 'sushi')).toMatch(/previous/);
    beatBefore(s, 'sushi');
    expect(rivalReady(s, 'sushi')).toBeNull();
    s.level = 12;
    expect(rivalReady(s, 'sushi')).toMatch(/level 13/);
    // each new theme has its own name, chef and taunt
    for (const id of ['sushi', 'taco', 'lab', 'clown'] as const) {
      const d = RIVAL_BY_ID[id];
      expect(d.name && d.chef && d.taunt && d.reopenNames.length).toBeTruthy();
    }
  });
});

describe('the fight', () => {
  it('zombies wait in line until ordered in; walking through the door sets the diners screaming', () => {
    const s = withCrew(['construction', 'teen']);
    const r = raid(s);
    for (let i = 0; i < 40; i++) stepRaid(r, 0.05);
    expect(r.aggro).toBe(false);
    expect(r.units.filter((u) => u.side === 'z').every((u) => u.state === 'queued')).toBe(true);
    expect(sendOne(r)).toBeNull();
    for (let t = 0; t < 20 && !r.aggro; t += 0.05) stepRaid(r, 0.05);
    expect(r.aggro).toBe(true);
    expect(r.events.some((e) => e.t === 'scream')).toBe(true);
    // the one still in line hasn't moved
    expect(r.units.filter((u) => u.side === 'z' && u.state === 'queued')).toHaveLength(1);
  });

  it('three starter zombies can beat Chuck Wagon; the chef only comes out once the waiters are down', () => {
    const s = withCrew(['construction', 'accountant', 'teen'], 5, 5);
    const r = raid(s);
    expect(r.level).toBe(2);
    sendAll(r);
    let chefOutWithStaffUp = false;
    for (let t = 0; t < 190 && r.phase === 'fight'; t += 0.05) {
      stepRaid(r, 0.05);
      const chef = r.units.find((u) => u.kind === 'boss')!;
      const staffUp = r.units.filter((u) => u.kind === 'staff' && u.hp > 0).length;
      if (!inKitchen(r, chef) && staffUp === r.stats.staff.count && r.t < 60) chefOutWithStaffUp = true;
    }
    expect(chefOutWithStaffUp).toBe(false);
    expect(r.phase).toBe('won');
    expect(r.bossOut).toBe(true);
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

  it('more diners wander in off the street during the raid (every 5-20 s), and head for a free chair', () => {
    const s = withCrew(['construction']);
    const r = raid(s);
    const before = r.units.filter((u) => u.kind === 'customer').length;
    // nobody goes in: a quiet café keeps filling up
    for (let i = 0; i < 120 / 0.05; i++) stepRaid(r, 0.05);
    const diners = r.units.filter((u) => u.kind === 'customer');
    expect(diners.length).toBeGreaterThan(before);
    expect(r.events.some((e) => e.t === 'arrive')).toBe(true);
    // walk-ins take free chairs, one each, and sit down
    const seats = diners.map((d) => d.seatId);
    expect(new Set(seats).size).toBe(seats.length);
    const settled = diners.filter((d) => d.state === 'idle');
    for (const d of settled) {
      const c = r.furniture.find((f) => f.id === d.seatId)!;
      expect([d.x, d.y]).toEqual([c.x, c.y]);
    }
    expect(settled.length).toBeGreaterThan(before);
  });

  it('diners run for the door; the ones you catch are lunch (cash at the joint’s level), the rest escape', () => {
    const s = withCrew(['construction', 'accountant', 'teen', 'cop']);
    const r = raid(s);
    sendAll(r);
    // the event log keeps only the last 300, so collect as we go
    const log: RaidEvent[] = [];
    for (let t = 0; t < 320 && r.phase === 'fight'; t += 0.05) {
      stepRaid(r, 0.05);
      log.push(...r.events.splice(0));
    }
    const eats = log.filter((e) => e.t === 'eat');
    const dinerEats = eats.filter((e) => e.t === 'eat' && !e.body);
    const escaped = log.filter((e) => e.t === 'escape').length;
    // everyone who was there or walked in is either lunch or gone
    const diners = r.units.filter((u) => u.kind === 'customer');
    expect(dinerEats.length + escaped).toBe(diners.filter((d) => d.state === 'gone').length);
    expect(diners.length).toBeGreaterThanOrEqual(2);
    for (const e of dinerEats) expect(e.t === 'eat' && e.cash).toBe(r.stats.dinerCash);
    expect(r.cashEaten).toBe(eats.reduce((a, e) => a + (e.t === 'eat' ? e.cash : 0), 0));
    expect(r.eaten).toBe(eats.length);
  });

  it('a lone tired zombie loses, gets KO’d and reanimates an hour later; eaten-customer cash is kept', () => {
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

  it('tap a zombie, then the counter: it swipes a quarter-size stack, kept even on retreat', () => {
    const s = withCrew(['construction', 'cop', 'nurse']);
    const r = raid(s);
    const dish = r.counter[0].dish;
    expect(r.counter[0].servings).toBe(raidStack(dish));
    const thief = r.units.find((u) => u.side === 'z')!;
    expect(order(r, thief.id, { kind: 'steal', slot: 0 })).toBeNull();
    for (let t = 0; t < 40 && !r.stolen.length && r.phase === 'fight'; t += 0.05) stepRaid(r, 0.05);
    expect(r.stolen).toEqual([dish]);
    expect(stealDish(r, 0)).toMatch(/Already/);
    retreat(r);
    const res = finishRaid(s, r);
    expect(res.result).toBe('retreat');
    // a retreat keeps what was swiped, but not the rest of the counter
    expect(res.dishes).toEqual([dish]);
    expect(s.fridge).toEqual([{ dish, servings: raidStack(dish) }]);
  });

  it('tap a zombie, then a target: it goes for that one', () => {
    const s = withCrew(['boxer']);
    const r = raid(s);
    const z = r.units.find((u) => u.side === 'z')!;
    const waiter = r.units.find((u) => u.kind === 'staff')!;
    expect(order(r, z.id, { kind: 'target', id: waiter.id })).toBeNull();
    for (let t = 0; t < 30 && waiter.hitAt < 0; t += 0.05) stepRaid(r, 0.05);
    expect(waiter.hitAt).toBeGreaterThan(0);
    expect(r.events.find((e) => e.t === 'hit' && e.by === z.id)).toMatchObject({
      unit: waiter.id,
    });
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
      // a few levels in, with the crew the cap allows by then
      const lvl = rv.id === 'boss' ? 13 : rv.level + 3;
      const crew = Array.from({ length: crewCapForLevel(lvl) }, (_, i) => strong[i % strong.length]);
      const s = withCrew(crew, 11, lvl);
      beatBefore(s, rv.id);
      if (rv.id === 'boss') s.now = 100;
      const r = raid(s, rv.id);
      sendAll(r);
      play(r);
      expect(`${rv.id}:${r.phase}`).toBe(`${rv.id}:won`);
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

describe('richer loot', () => {
  it('the counter is rolled from your own menu, at your level -3..+1, mostly at or just below it', () => {
    const levelOf = (id: string) => DISH_BY_ID[DISH_BY_ID[id].base ?? id].level;
    const s = withCrew(['boxer'], 5, 6);
    const r = raid(s);
    const seen: Record<number, number> = {};
    let variants = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const id = rollCounterDish(s, r);
      const base = DISH_BY_ID[DISH_BY_ID[id].base ?? id];
      if (DISH_BY_ID[id].variant) variants++;
      if (base.source === 'raid') continue; // the rare raid-only recipe
      seen[levelOf(id)] = (seen[levelOf(id)] ?? 0) + 1;
    }
    expect(Object.keys(seen).map(Number).sort()).toEqual([3, 4, 5, 6, 7]);
    // [15, 35, 65, 95, 100]: level 6 (your own) ~30%, level 7 (one above) ~5%
    expect(seen[6] / N).toBeGreaterThan(0.24);
    expect(seen[7] / N).toBeLessThan(0.09);
    expect(variants / N).toBeGreaterThan(COUNTER_VARIANT_CHANCE - 0.05);
    expect(variants / N).toBeLessThan(COUNTER_VARIANT_CHANCE + 0.05);
    // a level past the last new dish falls back to the nearest one below
    s.level = 30;
    for (let i = 0; i < 200; i++) expect(DISH_BY_ID[rollCounterDish(s, r)]).toBeTruthy();
    // and stacks are a quarter of a normal pot
    for (const d of DISHES) expect(raidStack(d.id)).toBe(Math.max(1, Math.round(d.servings / 4)));
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
    expect(r.counter.every((c) => c.servings === 0)).toBe(true);
  });

  it('a knocked-out waiter is lunch too: a zombie feasts on the body for twice a diner’s cash', () => {
    const s = withCrew(['boxer']);
    const r = raid(s);
    const { z, w } = koWaiterNextTo(r);
    expect(isBody(w)).toBe(true);
    const cash = r.cashEaten;
    stepRaid(r, 0.05);
    expect(w.state).toBe('gone');
    expect(z.state).toBe('eat');
    expect(r.cashEaten - cash).toBe(r.stats.dinerCash * BODY_CASH_MULT);
    expect(r.events.find((e) => e.t === 'eat' && e.customer === w.id)).toMatchObject({ body: true, unit: z.id });
    expect(r.eaten).toBe(1);
  });

  it('tap a body: the nearest zombie goes and eats it; pets can’t', () => {
    const s = withCrew(['boxer']);
    const r = raid(s);
    const { z, w } = koWaiterNextTo(r);
    z.x += 3;
    z.order = { kind: 'attack' };
    r.units.filter((u) => u.kind === 'staff' && u !== w).forEach((u) => (u.state = 'gone'));
    r.units.filter((u) => u.kind === 'customer').forEach((u) => (u.state = 'gone'));
    expect(feastOn(r, w.id)).toBeNull();
    expect(z.order).toEqual({ kind: 'target', id: w.id });
    for (let t = 0; t < 10 && w.state !== 'gone'; t += 0.05) stepRaid(r, 0.05);
    expect(w.state).toBe('gone');
    expect(feastOn(r, w.id)).toMatch(/Nothing/);
    // a pet told to eat gets a polite no
    const pet = r.units.find((u) => u.side === 'z')!;
    pet.kind = 'pet';
    const { w: w2 } = koWaiterNextTo(r);
    expect(order(r, pet.id, { kind: 'target', id: w2.id })).toMatch(/Only zombies/);
  });

  it('+2 XP for every diner or waiter eaten, win or lose', () => {
    const s = withCrew(['boxer']);
    const r = raid(s);
    koWaiterNextTo(r);
    stepRaid(r, 0.05);
    expect(r.eaten).toBe(1);
    retreat(r);
    const res = finishRaid(s, r);
    expect(res.eaten).toBe(1);
    // (no damage dealt, so no consolation XP on top)
    expect(res.xp).toBe(XP_PER_EAT);
  });

  it('a theme without a signature dish hands over a secret recipe you don’t know yet', () => {
    const s = withCrew(Array(10).fill('boxer'), 5, 20);
    beatBefore(s, 'sushi');
    const r = raid(s, 'sushi');
    r.units.find((u) => u.kind === 'boss')!.hp = 0;
    stepRaid(r, 0.05);
    const res = finishRaid(s, r);
    expect(res.recipeDrop).toBeTruthy();
    expect(DISH_BY_ID[res.recipeDrop!].source).toBe('raid');
    expect(s.recipes).not.toContain(res.recipeDrop);
    expect(res.dishes).toContain(res.recipeDrop);
  });
});

describe('tombstones and stones', () => {
  it('a 5-second glow, one at a time, five uses then a day to recharge; Big Foot-Long is limited', () => {
    const s = withCrew(['construction', 'boxer']);
    s.inventory.summon = 1;
    const red = addFurniture(s, 'tombstone_str', 8, 2);
    const green = addFurniture(s, 'tombstone_hp', 8, 3);
    const r = raid(s);
    sendAll(r);
    const staff = r.units.find((u) => u.kind === 'staff')!;
    focusTarget(r, staff.id);
    expect(r.focus).toBe(staff.id);
    expect(useTombstone(s, r, red.id)).toBeNull();
    expect(useTombstone(s, r, green.id)).toMatch(/One blessing/);
    for (let i = 0; i < 110; i++) stepRaid(r, 0.05);
    expect(useTombstone(s, r, green.id)).toBeNull();
    expect(red.uses).toBe(4);
    // each stone works once per raid (spamming them made every fight a walkover)
    for (let i = 0; i < 110; i++) stepRaid(r, 0.05);
    expect(useTombstone(s, r, red.id)).toMatch(/once per raid/);
    expect(red.uses).toBe(4);
    // next raid: the last use of the day, then it needs a day (or sauce) to recharge
    red.uses = 1;
    retreat(r);
    finishRaid(s, r);
    s.now += 61; // the joint regroups for a minute after a retreat
    for (const w of s.workers) Object.assign(w, { state: 'idle', energy: 100 });
    const r2 = raid(s);
    sendAll(r2);
    expect(useTombstone(s, r2, red.id)).toBeNull();
    const r3 = raid(withCrew(['boxer']));
    expect(useTombstone(s, r3, red.id)).toMatch(/Recharging/);
    s.now += 24 * 3600;
    expect(useTombstone(s, r3, red.id)).toBeNull();
    expect(useSummon(s, r)).toBeNull();
    expect(r.units.some((u) => u.kind === 'summon')).toBe(true);
    expect(useSummon(s, r)).toMatch(/No Summon/);
  });

  it('strength: every blow x1.5; health mends about +30 over the glow', () => {
    const swing = (buff: boolean) => {
      const s = withCrew(['boxer']);
      const red = addFurniture(s, 'tombstone_str', 8, 2);
      const r = raid(s);
      const { z } = koWaiterNextTo(r);
      const w = r.units.filter((u) => u.kind === 'staff')[1] ?? r.units.find((u) => u.kind === 'boss')!;
      w.hp = w.maxHp = 1e6;
      z.order = { kind: 'target', id: w.id };
      z.x = w.x + 1;
      z.y = w.y;
      if (buff) useTombstone(s, r, red.id);
      for (let i = 0; i < 40; i++) stepRaid(r, 0.05);
      return r.events.filter((e) => e.t === 'hit' && e.by === z.id && e.unit === w.id).reduce((a, e) => a + (e.t === 'hit' ? e.dmg : 0), 0);
    };
    const plain = swing(false);
    expect(plain).toBeGreaterThan(0);
    expect(swing(true) / plain).toBeGreaterThan(STR_BUFF * 0.85);
    expect(swing(true) / plain).toBeLessThan(STR_BUFF * 1.15);
    expect(STR_BUFF).toBe(1.5);
    // the green one: +30 HP spread over its 5 s
    const s = withCrew(['sumo']);
    const green = addFurniture(s, 'tombstone_hp', 8, 3);
    const r = raid(s);
    const z = r.units.find((u) => u.side === 'z')!;
    z.state = 'idle';
    z.maxHp = 500;
    z.hp = 100;
    z.busyUntil = 1e9; // standing still, out of the fight
    expect(useTombstone(s, r, green.id)).toBeNull();
    for (let i = 0; i < 120; i++) stepRaid(r, 0.05);
    expect(z.hp).toBeCloseTo(130, 0);
  });

  it('"Recharge · 2 sauce" refills a spent tombstone; level 2 holds seven uses', () => {
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
    expect(red.usesResetAt).toBeUndefined();
    s.sauce = TOMBSTONE_UPGRADE_SAUCE - 1;
    expect(upgradeTombstone(s, red.id)).toMatch(/Not enough/);
    s.sauce = TOMBSTONE_UPGRADE_SAUCE;
    expect(upgradeTombstone(s, red.id)).toBeNull();
    expect(red.lvl).toBe(2);
    expect(tombstoneUses(s, red)).toBe(7);
    expect(upgradeTombstone(s, red.id)).toMatch(/Already/);
    // a spent level-2 stone refills to seven the next day
    red.uses = 0;
    red.usesResetAt = s.now + 10;
    s.now += 11;
    expect(tombstoneUses(s, red)).toBe(7);
    s.sauce = 0;
    red.uses = 3;
    expect(rechargeTombstone(s, red.id)).toMatch(/Not enough/);
  });

  it('the revive tombstone stands every KO’d zombie back up mid-raid', () => {
    const s = withCrew(['boxer', 'cop']);
    const stone = addFurniture(s, 'tombstone_revive', 8, 2);
    expect(ITEM_BY_ID.tombstone_revive.boost).toBe('revive');
    const r = raid(s);
    sendAll(r);
    expect(useTombstone(s, r, stone.id)).toMatch(/Nobody/);
    expect(stone.uses).toBe(5); // a wasted tap costs nothing
    const [a, b] = r.units.filter((u) => u.side === 'z');
    a.hp = 0;
    a.state = 'down';
    expect(useTombstone(s, r, stone.id)).toBeNull();
    expect(a.state).not.toBe('down');
    expect(a.hp).toBe(Math.round(a.maxHp / 2));
    expect(b.hp).toBe(b.maxHp); // the one still up is untouched
    expect(r.events.some((e) => e.t === 'revive' && e.unit === a.id)).toBe(true);
    expect(stone.uses).toBe(4);
    // and it still counts as standing at the end
    retreat(r);
    finishRaid(s, r);
    expect(s.workers.find((w) => w.id === a.ref)!.state).toBe('idle');
  });

  it('the Health Stone (inventory.headstone) heals the whole squad +60 mid-raid (once per raid), and you can buy more', () => {
    const s = withCrew(['boxer', 'cop']);
    expect(s.inventory.headstone).toBe(1); // one comes with the joint
    const r = raid(s);
    expect(useHeadstone(s, r)).toMatch(/Send someone/);
    sendAll(r);
    stepRaid(r, 0.05);
    const squad = r.units.filter((u) => u.side === 'z');
    for (const u of squad) {
      u.maxHp = 400;
      u.hp = 50;
      u.busyUntil = 1e9;
    }
    expect(useHeadstone(s, r)).toBeNull();
    expect(s.inventory.headstone).toBe(0);
    expect(useHeadstone(s, r)).toMatch(/No Health Stones/);
    for (let i = 0; i < 80; i++) stepRaid(r, 0.05);
    for (const u of squad) expect(u.hp).toBeCloseTo(110, 0);
    s.sauce = HEADSTONE_SAUCE;
    expect(buyHeadstone(s)).toBeNull();
    expect(s.inventory.headstone).toBe(1);
    expect(useHeadstone(s, r)).toMatch(/One Health Stone per raid/);
    expect(buyHeadstone(s)).toMatch(/Not enough/);
  });
});

describe('the road changes over time', () => {
  it('a wrecked joint boards up, then reopens under new management: tougher and richer', () => {
    const s = withCrew(['construction', 'accountant', 'teen', 'cop'], 5, 6);
    const r = raid(s);
    const chefHp = r.units.find((u) => u.kind === 'boss')!.maxHp;
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
    expect(r2.level).toBe(r.level); // same level, tougher stats (x1.15 per reopening, capped at five)
    expect(r2.units.find((u) => u.kind === 'boss')!.maxHp).toBeGreaterThan(chefHp);
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
    const pop = 0.6 - decorBonus(s); // three stars once the decor (here: grime) is counted in
    s.rating = pop;
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: 0, lastRaid: 0 };
    s.now = NEGLECT_SEC - 10;
    expect(stealingRivals(s)).toEqual([]);
    expect(stars(s)).toBe(3);
    s.now = NEGLECT_SEC + 10;
    expect(stealingRivals(s)).toEqual(['chuck']);
    expect(stars(s)).toBe(3 - ENEMY_RATING_MODIFIER * 5);
    // the stored rating isn't touched: it's a penalty while they're at it
    expect(s.rating).toBe(pop);
    // a second thief doesn't stack it
    s.rivals.hank = { stars: 1, wins: 1, nextAt: 0, lastRaid: 0 };
    expect(stars(s)).toBe(2.5);
    delete s.rivals.hank;
    // the alert comes up once per stretch of neglect
    expect(unwarnedThieves(s)).toEqual(['chuck']);
    markWarned(s, 'chuck');
    expect(unwarnedThieves(s)).toEqual([]);
    // raid them and it's over (and the next stretch of neglect warns again)
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

describe('design audit: balance, odds and rewards', () => {
  it('reopenings are tougher by 1 + 0.15·min(gen, 5), so the road never closes', () => {
    const base = rivalStats('snob', 12, 0);
    expect(rivalStats('snob', 12, 1).chef.hp).toBe(Math.round(base.chef.hp * 1.15));
    expect(rivalStats('snob', 12, 5).staff.hp).toBe(Math.round(base.staff.hp * 1.75));
    expect(rivalStats('snob', 12, 10)).toEqual(rivalStats('snob', 12, 5));
    // a strong crew still beats Le Snob after ten reopenings
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
    expect(raidReward(s, st).xp).toBe(st.reward.xp);
    // a fresh joint still gets the listed reward when that's more
    const fresh = withCrew([], 5, 12); // a small joint: its 2 h of income is less than the listed reward
    fresh.rating = 0;
    const late = rivalStats('clown', 30);
    expect(raidReward(fresh, late).cash).toBe(late.reward.cash);
    // and the win really pays it
    const r = raid(s, 'chuck');
    sendAll(r);
    r.units.find((u) => u.kind === 'boss')!.hp = 0;
    stepRaid(r, 0.05);
    const want = r.cashEaten + raidReward(s, r.stats, 'chuck').cash;
    expect(raidReward(s, st, 'chuck').cash).toBe(raidReward(s, st).cash); // level 30 is well past Chuck
    s.level = 6; // …but just past it, the listed reward stands
    expect(raidReward(s, st, 'chuck').cash).toBe(st.reward.cash);
    s.level = 30;
    expect(finishRaid(s, r).cash).toBe(want);
  });

  it('the threat meter reads Easy / Even / Deadly from punch, HP and their damage', () => {
    const s = withCrew(['construction', 'accountant', 'teen'], 5, 5);
    expect(raidThreat(s, 'chuck', crewIds(s)).label).toBe('Easy');
    const one = withCrew(['yoga'], 5, 16);
    beatBefore(one, 'taco');
    expect(raidThreat(one, 'taco', crewIds(one)).label).toBe('Deadly');
    // tired zombies count for less
    const tired = withCrew(['construction', 'accountant', 'teen'], 5, 5);
    for (const w of tired.workers) w.energy = 10;
    expect(raidThreat(tired, 'chuck', crewIds(tired)).ratio).toBeGreaterThan(raidThreat(s, 'chuck', crewIds(s)).ratio);
    expect(raidPunch('joe', 4)).toBe(zombieRaidDmg(4));
    expect(raidPunch('boxer', 10)).toBe(zombieRaidDmg(10) * 2);
  });

  it('quality beats quantity: 3 Boxers do better than a horde of 7 Joes against a mid rival', () => {
    const rate = (crew: string[]) => {
      let won = 0;
      for (let seed = 1; seed <= 8; seed++) {
        const s = withCrew(crew, seed, 16);
        beatBefore(s, 'sushi');
        const r = raid(s, 'sushi');
        sendAll(r);
        play(r);
        if (r.phase === 'won') won++;
      }
      return won / 8;
    };
    expect(rate(['boxer', 'boxer', 'boxer'])).toBeGreaterThan(rate(Array(7).fill('joe')));
  });

  it('raid abilities: Boxer one-two, Sumo slam, Cop cuffs, Cheerleader pep, Champ taunt', () => {
    const setup = (types: string[]) => {
      const s = withCrew(types);
      const r = raid(s);
      const z = r.units.find((u) => u.side === 'z')!;
      const w = r.units.find((u) => u.kind === 'staff')!;
      w.hp = w.maxHp = 1e6;
      z.state = 'idle';
      z.x = w.x + 1;
      z.y = w.y;
      z.order = { kind: 'target', id: w.id };
      r.aggro = true;
      return { r, z, w };
    };
    const hitsOn = (r: RaidState, id: string) => r.events.filter((e) => e.t === 'hit' && e.unit === id).length;
    // boxer: two hits per swing
    {
      const { r, z, w } = setup(['boxer']);
      for (let i = 0; i < 4; i++) stepRaid(r, 0.05);
      expect(z.swings).toBe(1);
      expect(hitsOn(r, w.id)).toBe(2);
      expect(r.events.some((e) => e.t === 'ability' && e.kind === 'jab')).toBe(true);
    }
    // sumo: every third swing knocks everyone around the target down
    {
      const { r, z, w } = setup(['sumo']);
      for (let t = 0; t < 10 && (z.swings ?? 0) < 3; t += 0.05) stepRaid(r, 0.05);
      expect(r.events.some((e) => e.t === 'ability' && e.kind === 'slam')).toBe(true);
      expect(w.busyUntil).toBeGreaterThan(r.t + 1);
    }
    // cop: every fourth swing stuns 2 s
    {
      const { r, z, w } = setup(['cop']);
      for (let t = 0; t < 10 && (z.swings ?? 0) < 4; t += 0.05) stepRaid(r, 0.05);
      expect(r.events.some((e) => e.t === 'ability' && e.kind === 'stun')).toBe(true);
      expect(w.busyUntil).toBeGreaterThan(r.t + 1.8);
    }
    // cheerleader: +15% to zombies near her
    const dmgWith = (types: string[]) => {
      const { r, z, w } = setup(types);
      const buddy = r.units.filter((u) => u.side === 'z')[1];
      if (buddy) Object.assign(buddy, { x: z.x, y: z.y + 1, state: 'idle', busyUntil: 1e9 });
      for (let i = 0; i < 200; i++) stepRaid(r, 0.05);
      return r.events.filter((e) => e.t === 'hit' && e.unit === w.id && e.by === z.id).reduce((a, e) => a + (e.t === 'hit' ? e.dmg : 0), 0);
    };
    expect(dmgWith(['construction', 'cheerleader']) / dmgWith(['construction', 'joe'])).toBeGreaterThan(1.08);
    // champ: nearby waiters go for him, not the closer zombie
    {
      const s = withCrew(['construction', 'champ']);
      const r = raid(s);
      const [a, champ] = r.units.filter((u) => u.side === 'z');
      const w = r.units.find((u) => u.kind === 'staff')!;
      r.aggro = true;
      Object.assign(a, { state: 'idle', x: w.x + 1, y: w.y, busyUntil: 1e9 });
      Object.assign(champ, { state: 'idle', x: w.x - 2, y: w.y, busyUntil: 1e9 });
      stepRaid(r, 0.05);
      expect(w.target).toBe(champ.id);
    }
  });

  it('every chef has a line for beating you and for being beaten', () => {
    for (const rv of RIVALS) expect(rv.defeat && rv.victory, rv.id).toBeTruthy();
    expect(RIVAL_BY_ID.chuck.defeat).toBe('Dagnabbit, that was my good leg.');
    expect(RIVAL_BY_ID.boss.defeat).toBe('Hot take: I lost.');
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
    // a real fight that's lost still pays a little, by the damage dealt
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
    r.units.find((u) => u.kind === 'boss')!.hp = 0;
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
