import { describe, expect, it } from 'vitest';
import {
  DOOR_X,
  ITEM_BY_ID,
  NEGLECT_SEC,
  RIVAL_CLOSED_SEC,
  ROAD,
  addFurniture,
  bossHere,
  createInitialState,
  finishRaid,
  focusTarget,
  inKitchen,
  makeWorker,
  order,
  retreat,
  rivalName,
  rivalReady,
  sendAll,
  sendOne,
  startCooking,
  startRaid,
  stealDish,
  stealingRivals,
  stepRaid,
  tick,
  useSummon,
  useTombstone,
  type GameState,
  type RaidState,
} from '../src/sim';

function withCrew(types: string[], seed = 5): GameState {
  const s = createInitialState(seed);
  s.level = 12;
  for (const t of types) s.workers.push(makeWorker(s, 'zombie', t, { x: 4, y: 4 }));
  return s;
}
const crewIds = (s: GameState) => s.workers.filter((w) => w.kind === 'zombie').map((w) => w.id);
function play(r: RaidState, maxSec = 190) {
  for (let t = 0; t < maxSec && r.phase === 'fight'; t += 0.05) stepRaid(r, 0.05);
}
const beat = (s: GameState, ...ids: string[]) => ids.forEach((id) => (s.rivals[id] = { stars: 1, wins: 1, nextAt: 0 }));

describe('the rival joint is a real café', () => {
  it('kitchen behind dividers and a counter, diners at single tables, waiters on the floor, the chef in the kitchen', () => {
    const s = withCrew(['construction']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    const kinds = (k: string) => r.furniture.filter((f) => ITEM_BY_ID[f.item].kind === k);
    expect(kinds('stove').length).toBeGreaterThanOrEqual(2);
    expect(kinds('counter')).toHaveLength(1);
    expect(kinds('divider').length).toBeGreaterThanOrEqual(3);
    expect(kinds('table')).toHaveLength(4);
    expect(kinds('chair')).toHaveLength(4);
    // one diner per chair, sitting on it
    const diners = r.units.filter((u) => u.kind === 'customer');
    expect(diners).toHaveLength(4);
    for (const d of diners) expect(kinds('chair').some((c) => c.x === d.x && c.y === d.y)).toBe(true);
    expect(r.units.filter((u) => u.kind === 'staff')).toHaveLength(2);
    const chef = r.units.find((u) => u.kind === 'boss')!;
    expect(inKitchen(r, chef)).toBe(true);
    // the door is clear and your squad waits single file on the sidewalk outside
    expect(r.furniture.some((f) => f.x === DOOR_X && (f.y === 0 || f.y === 1))).toBe(false);
    const squad = r.units.filter((u) => u.side === 'z');
    expect(squad.every((u) => u.state === 'queued' && u.y === -1 && u.x >= r.room.w)).toBe(true);
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

describe('the fight', () => {
  it('zombies wait in line until ordered in; walking through the door sets the diners screaming', () => {
    const s = withCrew(['construction', 'teen']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
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
    const s = withCrew(['construction', 'accountant', 'teen']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    sendAll(r);
    let chefOutWithStaffUp = false;
    for (let t = 0; t < 190 && r.phase === 'fight'; t += 0.05) {
      stepRaid(r, 0.05);
      const chef = r.units.find((u) => u.kind === 'boss')!;
      const staffUp = r.units.filter((u) => u.kind === 'staff' && u.hp > 0).length;
      if (!inKitchen(r, chef) && staffUp === 2 && r.t < 60) chefOutWithStaffUp = true;
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

  it('diners run for the door; the ones you catch are lunch (and cash), the rest escape', () => {
    const s = withCrew(['construction', 'accountant', 'teen', 'cop']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    sendAll(r);
    play(r);
    const eaten = r.events.filter((e) => e.t === 'eat').length;
    const escaped = r.events.filter((e) => e.t === 'escape').length;
    expect(eaten + escaped).toBe(4);
    expect(r.cashEaten).toBe(eaten * 20);
  });

  it('a lone tired zombie loses, gets KO’d and reanimates an hour later; eaten-customer cash is kept', () => {
    const s = withCrew(['teen']);
    beat(s, 'chuck');
    const z = s.workers.find((w) => w.kind === 'zombie')!;
    z.energy = 40;
    const r = startRaid(s, 'hank', [z.id]) as RaidState;
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

  it('tap a zombie, then the counter: it goes and swipes the dish, kept even on retreat', () => {
    const s = withCrew(['construction', 'cop', 'nurse']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    const thief = r.units.find((u) => u.side === 'z')!;
    expect(order(r, thief.id, { kind: 'steal', slot: 0 })).toBeNull();
    for (let t = 0; t < 40 && !r.stolen.length && r.phase === 'fight'; t += 0.05) stepRaid(r, 0.05);
    expect(r.stolen).toContain('sliders');
    expect(stealDish(r, 0)).toMatch(/Already/);
    retreat(r);
    const res = finishRaid(s, r);
    expect(res.result).toBe('retreat');
    expect(s.fridge.some((f) => f.dish === 'sliders')).toBe(true);
  });

  it('tap a zombie, then a target: it goes for that one', () => {
    const s = withCrew(['boxer']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    const z = r.units.find((u) => u.side === 'z')!;
    const waiter = r.units.find((u) => u.kind === 'staff')!;
    expect(order(r, z.id, { kind: 'target', id: waiter.id })).toBeNull();
    for (let t = 0; t < 30 && waiter.hitAt < 0; t += 0.05) stepRaid(r, 0.05);
    expect(waiter.hitAt).toBeGreaterThan(0);
    expect(r.events.find((e) => e.t === 'hit' && e.by === z.id)).toMatchObject({
      unit: waiter.id,
    });
  });

  it('tombstones: a 5-second glow, one at a time, five uses then a day to recharge; Big Foot-Long is limited', () => {
    const s = withCrew(['construction', 'boxer']);
    s.inventory.summon = 1;
    const red = addFurniture(s, 'tombstone_str', 8, 2);
    const green = addFurniture(s, 'tombstone_hp', 8, 3);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    sendAll(r);
    const staff = r.units.find((u) => u.kind === 'staff')!;
    focusTarget(r, staff.id);
    expect(r.focus).toBe(staff.id);
    expect(useTombstone(s, r, red.id)).toBeNull();
    expect(useTombstone(s, r, green.id)).toMatch(/One blessing/);
    for (let i = 0; i < 110; i++) stepRaid(r, 0.05);
    expect(useTombstone(s, r, green.id)).toBeNull();
    expect(red.uses).toBe(4);
    red.uses = 1;
    for (let i = 0; i < 110; i++) stepRaid(r, 0.05);
    expect(useTombstone(s, r, red.id)).toBeNull();
    for (let i = 0; i < 110; i++) stepRaid(r, 0.05);
    expect(useTombstone(s, r, red.id)).toMatch(/Recharging/);
    s.now += 24 * 3600;
    expect(useTombstone(s, r, red.id)).toBeNull();
    expect(useSummon(s, r)).toBeNull();
    expect(r.units.some((u) => u.kind === 'summon')).toBe(true);
    expect(useSummon(s, r)).toMatch(/No Summon/);
  });

  it('is deterministic for the same starting state', () => {
    const go = () => {
      const s = withCrew(['construction', 'accountant', 'teen'], 77);
      const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
      sendAll(r);
      play(r);
      return `${r.phase}:${r.t.toFixed(2)}:${r.cashEaten}`;
    };
    expect(go()).toBe(go());
  });

  it('every joint on the road is beatable by a reasonable crew for its level, and not by a token one', () => {
    const crews: Record<string, string[]> = {
      chuck: ['construction', 'accountant', 'teen'],
      hank: ['construction', 'construction', 'nurse', 'teen'],
      vera: ['construction', 'cop', 'nurse', 'boxer', 'teen'],
      crunch: ['boxer', 'lumberjack', 'construction', 'cop', 'nurse', 'benchwarmer'],
      snob: ['boxer', 'sumo', 'lumberjack', 'champ', 'construction', 'benchwarmer', 'nurse'],
    };
    for (const rv of ROAD) {
      const s = withCrew(crews[rv.id], 11);
      beat(s, ...ROAD.slice(0, ROAD.indexOf(rv)).map((p) => p.id));
      const r = startRaid(s, rv.id, crewIds(s)) as RaidState;
      sendAll(r);
      play(r);
      expect(`${rv.id}:${r.phase}`).toBe(`${rv.id}:won`);
      const weak = withCrew(['yoga'], 11);
      beat(weak, ...ROAD.slice(0, ROAD.indexOf(rv)).map((p) => p.id));
      const r2 = startRaid(weak, rv.id, crewIds(weak)) as RaidState;
      sendAll(r2);
      play(r2);
      expect(`${rv.id}:${r2.phase}`).toBe(`${rv.id}:lost`);
    }
  });
});

describe('the road changes over time', () => {
  it('a wrecked joint boards up, then reopens under new management: tougher and richer', () => {
    const s = withCrew(['construction', 'accountant', 'teen', 'cop']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    const staffHp = r.units.find((u) => u.kind === 'staff')!.maxHp;
    sendAll(r);
    play(r);
    finishRaid(s, r);
    expect(rivalReady(s, 'chuck')).toMatch(/Boarded/);
    s.now += RIVAL_CLOSED_SEC + 1;
    for (const w of s.workers) if (w.state === 'down') w.downUntil = 0;
    tick(s, 1);
    expect(rivalReady(s, 'chuck')).toBeNull();
    expect(rivalName(s, 'chuck')).not.toBe(ROAD[0].name);
    const r2 = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    expect(r2.units.find((u) => u.kind === 'staff')!.maxHp).toBeGreaterThan(staffHp);
  });

  it('a rival you leave alone too long poaches your customers', () => {
    const s = withCrew([]);
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: 0, lastRaid: 0 };
    s.now = NEGLECT_SEC - 10;
    expect(stealingRivals(s)).toEqual([]);
    s.now = NEGLECT_SEC + 10;
    expect(stealingRivals(s)).toEqual(['chuck']);
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
