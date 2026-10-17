import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_BY_ID,
  DISH_BY_ID,
  addZombieXp,
  burnLimit,
  burnWindow,
  feastLength,
  isRestless,
  newGame,
  releaseJob,
  shownRating,
  swingInterval,
  workerSpeed,
  type GameEvent,
  DOOR_X,
  TUNING,
  addFurniture,
  attackThreshold,
  cancelCooking,
  crewCapForLevel,
  createInitialState,
  deserialize,
  discardCounter,
  edgeBlocked,
  findPath,
  finishCost,
  finishNow,
  infect,
  makeWorker,
  maxEnergy,
  migrate,
  plateDish,
  refill,
  rest,
  serialize,
  setClosed,
  startCooking,
  stars,
  tick,
  walkable,
  zombies,
  type GameState,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.25) => {
  for (let t = 0; t < sec; t += dt) tick(s, dt);
};
const you = (s: GameState) => s.workers.find((w) => w.kind === 'you')!;
const stove = (s: GameState) => s.stoves[0];
const servings = (s: GameState) => s.counter.reduce((a, c) => a + (c.dish ? c.servings : 0), 0);
const stock = (s: GameState, dish = 'sliders', n = 200) => {
  s.counter[0].dish = dish;
  s.counter[0].servings = n;
};
const room = (s: GameState) => ({ w: s.roomW, h: s.roomH });

describe('the corner lot', () => {
  it('starts as the original did: $5,000, a grimy 7x6 room with one stove, sink, fridge, counter, one table and one chair', () => {
    const s = createInitialState(1);
    expect([s.roomW, s.roomH]).toEqual([7, 6]);
    expect(s.cash).toBe(5000);
    expect(s.sauce).toBe(5);
    expect(s.furniture.map((f) => f.item).sort()).toEqual(['chair_plain_white', 'counter_plain', 'fridge_dirty', 'plant_dead', 'sink_dirty', 'stove_dirty', 'table_plain_white'].sort());
    // the kitchen is on the back-left wall
    for (const id of ['stove_dirty', 'sink_dirty', 'fridge_dirty', 'counter_plain']) expect(s.furniture.find((f) => f.item === id)!.x).toBe(0);
    expect(s.crewCap).toBe(1);
    // YOU starts in the front doorway (right wall)
    expect([you(s).x, you(s).y]).toEqual([DOOR_X, 0]);
    // 0.3 popularity less the grime ≈ the original's 0.185
    expect(shownRating(s)).toBeCloseTo(0.185, 1);
    expect(stars(s)).toBe(0.5);
  });

  it('a new game starts with the sign on CLOSED (original)', () => {
    const fresh = deserialize(null, 1000).state;
    expect(fresh.closed).toBe(true);
    expect(newGame(3).closed).toBe(true);
    expect(createInitialState(3).closed).toBeFalsy();
  });

  it('walls block everything except the door; customers walk the sidewalks, never the road', () => {
    const r = { w: 7, h: 6 };
    expect(edgeBlocked(DOOR_X, 0, DOOR_X, -1, r)).toBe(false);
    expect(edgeBlocked(DOOR_X - 1, 0, DOOR_X - 1, -1, r)).toBe(true);
    expect(edgeBlocked(0, 3, -1, 3, r)).toBe(true);
    expect(edgeBlocked(6, 3, 7, 3, r)).toBe(true); // the front is closed too
    expect(walkable(10, -1, r)).toBe(true); // north-east sidewalk
    expect(walkable(-1, 9, r)).toBe(true); // north-west sidewalk
    expect(walkable(3, -2, r)).toBe(false); // road
    expect(walkable(9, 3, r)).toBe(false); // lawn
    const p = findPath({ x: 12, y: -1 }, { x: 2, y: 2 }, new Set(), r)!;
    expect(p.some((pt) => pt.x === DOOR_X && pt.y === 0)).toBe(true);
    // round the corner from the other street
    expect(findPath({ x: -1, y: 11 }, { x: 2, y: 2 }, new Set(), r)).not.toBeNull();
  });

  it('the crew starts at one zombie and grows like the original (1, 2, 3, 3, 4, 4 … 10 at 17, 14 at 56)', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 15, 16].map(crewCapForLevel)).toEqual([1, 2, 3, 3, 4, 4, 5, 5, 9, 9]);
    expect(crewCapForLevel(17)).toBe(10);
    expect(crewCapForLevel(20)).toBe(10);
    expect(crewCapForLevel(27)).toBe(11);
    expect(crewCapForLevel(36)).toBe(12);
    expect(crewCapForLevel(46)).toBe(13);
    expect(crewCapForLevel(56)).toBe(14);
  });
});

describe('cooking (the cook must stay at the stove; only unattended time burns food)', () => {
  it('COOK charges and puts the pot on at once; YOU walks over and stands behind the stove', () => {
    const s = createInitialState(7);
    s.spawnCooldown = 1e9;
    const cash = s.cash;
    expect(startCooking(s, you(s).id, stove(s).id, 'sliders')).toBeNull();
    // money and pot at once, before the cook gets there (original)
    expect(s.cash).toBe(cash - DISH_BY_ID.sliders.cost);
    expect(stove(s).status).toBe('cooking');
    expect(you(s).state).toBe('toStove');
    const left = stove(s).left!;
    tick(s, 0.25);
    expect(stove(s).left).toBe(left); // no progress until they're standing there
    for (let i = 0; i < 200 && you(s).state !== 'cooking'; i++) tick(s, 0.1);
    expect(you(s).state).toBe('cooking');
    // behind the stove (the side further from the camera), not in front of it
    const f = s.furniture.find((x) => x.id === stove(s).furnitureId)!;
    expect(you(s).x + you(s).y).toBeLessThan(f.x + f.y);
  });

  it('done shows on the stove; a cook carries the one plate to the counter, and the XP comes there', () => {
    const s = createInitialState(7);
    s.spawnCooldown = 1e9; // no customers eating it before we count
    expect(startCooking(s, you(s).id, stove(s).id, 'sliders')).toBeNull();
    run(s, 30); // the very first dish is a quick one
    expect(stove(s).status).toBe('done');
    expect(s.xp).toBe(0); // not yet: XP is paid at the counter
    expect(plateDish(s, stove(s).id, you(s).id)).toBeNull();
    let xpAt: { x: number; y: number } | undefined;
    for (let t = 0; t < 20; t += 0.25) {
      s.events.length = 0;
      tick(s, 0.25);
      const e = s.events.find((x) => x.t === 'xp');
      if (e && e.t === 'xp') xpAt = e;
    }
    expect(stove(s).status).toBe('empty');
    expect(servings(s)).toBe(DISH_BY_ID.sliders.servings);
    expect(s.xp).toBe(DISH_BY_ID.sliders.xp);
    const counter = s.furniture.find((f) => f.item === 'counter_plain')!;
    expect(xpAt).toMatchObject({ x: counter.x, y: counter.y });
  });

  it('pauses when the cook walks away, and resumes when someone comes back', () => {
    const s = createInitialState(7);
    s.stats.cooked.sliders = 1; // not the tutorial dish
    startCooking(s, you(s).id, stove(s).id, 'sliders');
    run(s, 10);
    expect(stove(s).status).toBe('cooking');
    const left = stove(s).left!;
    rest(s, you(s).id);
    run(s, 30);
    expect(stove(s).status).toBe('paused');
    expect(stove(s).left).toBeCloseTo(left, 0);
    expect(startCooking(s, you(s).id, stove(s).id)).toBeNull(); // resume, no extra cost
    run(s, 150);
    expect(stove(s).status).toBe('done');
  });

  it('burn window (original): a dish can sit unattended max(cook, 10 min) before it burns (Fresh: max(2 x cook, 10 min))', () => {
    const s = createInitialState(7);
    s.stats.cooked.gumbo = 1;
    s.level = 2;
    s.closed = true;
    startCooking(s, you(s).id, stove(s).id, 'gumbo');
    run(s, 15 * 60 + 20, 1);
    expect(stove(s).status).toBe('done');
    expect(burnWindow(s, stove(s))).toBe(15 * 60);
    const walk = stove(s).unattended!; // the walk over counted (a cook on the way had the 120 s grace)
    expect(walk).toBeGreaterThan(0);
    run(s, 15 * 60 - walk - 5, 1);
    expect(stove(s).status).toBe('done');
    run(s, 10, 1);
    expect(stove(s).status).toBe('burnt');
    plateDish(s, stove(s).id); // scrapes the burnt lump
    expect(stove(s).status).toBe('empty');
    // short dishes still get 10 minutes; Fresh triples the burn time
    s.stoves[0].dish = 'sliders';
    expect(burnWindow(s, s.stoves[0])).toBe(10 * 60);
    s.stoves[0].dish = 'gumbo';
    const plain = burnWindow(s, s.stoves[0]);
    s.stoves[0].dish = 'fresh_gumbo';
    expect(burnWindow(s, s.stoves[0])).toBe(2 * 15 * 60);
    expect(plain).toBe(15 * 60);
  });

  it('only unattended time burns: a dish left half-cooked can burn too, and a cook on the way adds 120 s', () => {
    const s = createInitialState(7);
    s.stats.cooked.sliders = 1;
    s.closed = true;
    startCooking(s, you(s).id, stove(s).id, 'sliders');
    for (let i = 0; i < 200 && you(s).state !== 'cooking'; i++) tick(s, 0.1);
    run(s, 30, 1);
    const u = stove(s).unattended!;
    run(s, 30, 1);
    expect(stove(s).unattended).toBe(u); // attended: no burn time piles up
    rest(s, you(s).id); // walks off: it pauses and the clock runs
    run(s, 10 * 60 + 5, 1);
    expect(stove(s).status).toBe('burnt');
    // while a cook is attached the limit is 120 s longer
    const t = createInitialState(7);
    t.stats.cooked.sliders = 1;
    startCooking(t, you(t).id, t.stoves[0].id, 'sliders');
    expect(burnLimit(t, t.stoves[0])).toBe(burnWindow(t, t.stoves[0]) + TUNING.burnGraceSec);
  });

  it('needs the right cookbook: grill dishes need a grill, raid recipes need studying', () => {
    const s = createInitialState(7);
    s.level = 9;
    expect(startCooking(s, you(s).id, stove(s).id, 'burger')).toMatch(/grill/);
    expect(startCooking(s, you(s).id, stove(s).id, 'chili')).toMatch(/grill|raid/);
    s.level = 1;
    expect(startCooking(s, you(s).id, stove(s).id, 'gumbo')).toMatch(/level 2/);
  });

  it('dishes stack on one counter instead of needing a counter each', () => {
    const s = createInitialState(7);
    stock(s, 'sliders', 10);
    s.counter.push({ id: 'kx', furnitureId: s.counter[0].furnitureId, dish: 'hobodog', servings: 5 });
    expect(servings(s)).toBe(15);
  });
});

describe('customers, serving and cleaning up', () => {
  it('customers walk in off the sidewalk, sit at a one-seat table, get served, pay and leave a dirty plate', () => {
    const s = createInitialState(11);
    stock(s);
    const cash = s.cash;
    let sawDirty = false;
    for (let t = 0; t < 240; t += 0.25) {
      tick(s, 0.25);
      if (s.furniture.some((f) => f.dirty)) sawDirty = true;
    }
    expect(s.stats.served).toBeGreaterThan(2);
    expect(s.cash).toBeGreaterThan(cash);
    expect(sawDirty).toBe(true);
    expect(s.stats.cleared).toBeGreaterThan(0); // somebody carried plates to the sink
  });

  it('never seats two customers at one table', () => {
    const s = createInitialState(11);
    stock(s);
    for (let t = 0; t < 200; t += 0.25) {
      tick(s, 0.25);
      const tables = s.customers.filter((c) => c.tableId).map((c) => c.tableId);
      expect(new Set(tables).size).toBe(tables.length);
    }
  });

  it('with no sink, plates pile up and customers find no clean table', () => {
    const s = createInitialState(11);
    s.furniture = s.furniture.filter((f) => f.item !== 'sink_dirty');
    stock(s);
    run(s, 200);
    expect(s.furniture.filter((f) => f.dirty).length).toBe(1); // the one table
    expect(s.stats.cleared).toBe(0);
    expect(s.stats.angry).toBeGreaterThan(0);
  });

  it('with no food, customers eventually leave unhappy and the rating drops', () => {
    const s = createInitialState(11);
    const r0 = s.rating;
    run(s, 200);
    expect(s.stats.angry).toBeGreaterThan(0);
    expect(s.rating).toBeLessThan(r0);
  });
});

describe('YOU are Patient Zero: infecting customers builds the crew', () => {
  const seated = (s: GameState) => {
    for (let i = 0; i < 600; i++) {
      tick(s, 0.25);
      const c = s.customers.find((c) => c.state === 'waiting' || c.state === 'eating');
      if (c) return c;
    }
    return undefined;
  };

  it('first infection is free, and the crew cap (one at the start) holds', () => {
    const s = createInitialState(3);
    stock(s);
    const target = seated(s)!;
    const cash = s.cash;
    expect(infect(s, target.id)).toBeNull();
    expect(s.cash).toBe(cash);
    run(s, 15);
    expect(zombies(s)).toHaveLength(1);
    expect(zombies(s)[0].type).toBe(target.type);
    const next = seated(s)!;
    expect(infect(s, next.id)).toMatch(/Crew is full/);
  });

  it('INFECT: the customer runs for the door, the nearest crew member chases, and the catch swaps them on the spot', () => {
    const s = createInitialState(3);
    stock(s);
    const c = seated(s)!;
    const name = c.name;
    expect(infect(s, c.id)).toBeNull();
    expect(c.state).toBe('infecting');
    expect(c.tableId).toBeUndefined(); // up out of the chair at once
    expect(you(s).state).toBe('chasing');
    expect(you(s).targetId).toBe(c.id);
    tick(s, 0.25);
    expect(c.path.length).toBeGreaterThan(0); // running…
    expect(c.speed).toBeGreaterThan(workerSpeed(you(s)) * 1.3); // …at a run
    let at = 0;
    for (let i = 0; i < 200 && !zombies(s).length; i++) {
      tick(s, 0.1);
      at = s.now;
    }
    const z = zombies(s)[0];
    expect(z).toBeDefined();
    expect(z.name).toBe(name); // same name, same clothes (type)
    expect(z.type).toBe(c.type);
    expect(z.energy).toBe(TUNING.infectEnergy);
    expect(z.state).toBe('idle');
    expect(you(s).state).toBe('idle');
    tick(s, 0.05);
    expect(s.customers.some((x) => x.id === c.id)).toBe(false);
    expect(at).toBeGreaterThan(0);
  });

  it('the chase takes a few seconds across the room, and next to nothing when the chaser is adjacent', () => {
    const chase = (adjacent: boolean) => {
      const s = createInitialState(3);
      stock(s);
      const c = seated(s)!;
      s.customers.forEach((x) => (x.waitLeft = 9999));
      const w = you(s);
      releaseJob(s, w);
      const seat = nextToSeat(s, c);
      if (adjacent) Object.assign(w, { x: seat.x, y: seat.y, path: [] });
      else Object.assign(w, { x: 6, y: 5, path: [] });
      const t0 = s.now;
      infect(s, c.id);
      for (let i = 0; i < 400 && !zombies(s).length; i++) tick(s, 0.05);
      return s.now - t0;
    };
    const far = chase(false);
    const near = chase(true);
    expect(near).toBeLessThan(0.5);
    expect(far).toBeGreaterThan(1.5);
    expect(far).toBeLessThan(TUNING.chaseMaxSec + 3);
  });

  it('the nearest free crew member gives chase: an idle zombie rather than YOU busy at the stove', () => {
    const s = createInitialState(3);
    s.crewCap = 3;
    stock(s);
    startCooking(s, you(s).id, stove(s).id, 'sliders');
    const c = seated(s)!;
    const z = makeWorker(s, 'zombie', 'joe', nextToSeat(s, c));
    z.nextDaydream = Infinity;
    s.workers.push(z);
    expect(infect(s, c.id)).toBeNull();
    expect(z.state).toBe('chasing');
    expect(you(s).state).not.toBe('chasing');
  });
});

/** A free floor tile beside a seated customer's chair. */
function nextToSeat(s: GameState, c: { x: number; y: number }) {
  const blocked = new Set(s.furniture.map((f) => `${f.x},${f.y}`));
  for (const [dx, dy] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) {
    const x = Math.round(c.x) + dx;
    const y = Math.round(c.y) + dy;
    if (x >= 0 && y >= 0 && x < s.roomW && y < s.roomH && !blocked.has(`${x},${y}`)) return { x, y };
  }
  throw new Error('no free tile by the seat');
}

describe('energy, patience, biting, resting outside, levels', () => {
  const withZombie = () => {
    const s = createInitialState(5);
    stock(s, 'sliders', 400);
    const z = makeWorker(s, 'zombie', 'teen', { x: 3, y: 1 });
    s.workers.push(z);
    // someone in a seat to go for (the bite check needs a customer inside)
    for (let i = 0; i < 800 && !s.customers.some((c) => c.state === 'waiting' || c.state === 'eating'); i++) tick(s, 0.25);
    z.energy = maxEnergy(z);
    return { s, z };
  };

  it('patience (self-control) line matches the original: max x (0.05 + 0.2 x (11 - P)/10)', () => {
    expect(attackThreshold(1)).toBeCloseTo(0.25);
    expect(attackThreshold(10)).toBeCloseTo(0.07);
    expect(attackThreshold(5)).toBeCloseTo(0.17);
  });

  it('the bite check: once a minute, never above the line, and below it more likely the emptier they are', () => {
    const { s, z } = withZombie();
    z.nextDaydream = Infinity;
    z.energy = maxEnergy(z) * attackThreshold(z.stats.patience) + 1;
    z.nextBiteAt = s.now;
    run(s, 70);
    expect(s.events.some((e) => e.t === 'hungry')).toBe(false);
    let n = 0;
    for (let i = 0; i < 400; i++) {
      z.energy = 0.5;
      if (isRestless(s, z)) n++;
    }
    expect(n).toBeGreaterThan(380); // ~99%
    let m = 0;
    for (let i = 0; i < 2000; i++) {
      z.energy = maxEnergy(z) * attackThreshold(z.stats.patience) * 0.999;
      if (isRestless(s, z)) m++;
    }
    expect(m / 2000).toBeLessThan(0.05); // ~2% just under the line
  });

  it('an attack: one swing every 1 s / (2 + 0.2 Speed), damage = Power, a knockback each hit; the first hit panics the room for -0.1', () => {
    const { s, z } = withZombie();
    z.energy = 1;
    z.nextDaydream = Infinity;
    z.nextBiteAt = s.now;
    const evs: GameEvent[] = [];
    let r0 = s.rating;
    for (let i = 0; i < 1600 && !evs.some((e) => e.t === 'bite'); i++) {
      s.events.length = 0;
      r0 = s.rating;
      tick(s, 0.05);
      evs.push(...s.events);
    }
    expect(s.stats.bites).toBe(1);
    expect(z.state).toBe('attacking');
    expect(r0 - s.rating).toBeCloseTo(TUNING.ratingAttack, 2);
    expect(evs.some((e) => e.t === 'panic')).toBe(true);
    const victim = s.customers.find((c) => c.state === 'cowering')!;
    expect(victim).toBeDefined();
    // everyone else runs out screaming, without paying
    expect(s.customers.filter((c) => c.state === 'waiting' || c.state === 'eating')).toHaveLength(0);
    // the swing rhythm and the damage
    const hits: number[] = [];
    for (let i = 0; i < 200 && hits.length < 4; i++) {
      s.events.length = 0;
      tick(s, 0.02);
      for (const e of s.events) if (e.t === 'hit') {
        hits.push(s.now);
        expect(e.damage).toBe(z.stats.power);
      }
    }
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(victim.energy).toBeLessThan(CUSTOMER_BY_ID[victim.type].stats.energy);
    expect(swingInterval(z)).toBeCloseTo(1 / (2 + 0.2 * z.stats.speed), 5);
  });

  it('the kill: the zombie crouches and feasts (+2 energy a chunk) and the body becomes bones; then back to work', () => {
    const { s, z } = withZombie();
    z.energy = 1;
    z.nextDaydream = Infinity;
    z.nextBiteAt = s.now;
    let eaten: GameEvent | undefined;
    for (let i = 0; i < 4000 && !eaten; i++) {
      s.events.length = 0;
      tick(s, 0.05);
      eaten = s.events.find((e) => e.t === 'eaten');
    }
    expect(eaten).toBeDefined();
    expect(z.state).toBe('feasting');
    const e0 = z.energy;
    // the victim is gone (no fleeing, no paying): only bones are left, which the scene draws
    tick(s, 0.05);
    expect(s.customers.some((c) => eaten?.t === 'eaten' && c.id === eaten.customerId)).toBe(false);
    const feast = eaten?.t === 'eaten' ? eaten.feastSec! : 0;
    expect(feast).toBeCloseTo(feastLength(z), 5);
    run(s, feast + 0.5, 0.05);
    expect(z.state).not.toBe('feasting');
    expect(z.energy).toBeCloseTo(e0 + TUNING.fleshChunks * TUNING.fleshEnergy, 0);
  });

  it('resting zombies walk out the door and nap on the sidewalk, then come back in', () => {
    const { s, z } = withZombie();
    z.energy = 30;
    z.nextDaydream = Infinity;
    expect(rest(s, z.id)).toBeNull();
    run(s, 20);
    expect(z.state).toBe('resting');
    expect(z.y).toBe(-1); // outside on the sidewalk
    const e = z.energy;
    run(s, 30);
    expect(z.energy).toBeGreaterThan(e);
    const sauce = s.sauce;
    expect(refill(s, z.id)).toBeNull();
    expect(z.energy).toBe(maxEnergy(z));
    expect(s.sauce).toBe(sauce - 1);
    run(s, 20);
    expect(z.y).toBeGreaterThanOrEqual(0); // walked back inside
  });

  it('zombies level up from serving and gain max energy', () => {
    const { s, z } = withZombie();
    const e0 = maxEnergy(z);
    addZombieXp(s, z, 20);
    expect(maxEnergy(z)).toBeGreaterThan(e0);
  });

  it('zombies daydream and snap out of it', () => {
    const { s, z } = withZombie();
    z.nextDaydream = s.now;
    s.counter.forEach((c) => (c.servings = 0));
    run(s, 1);
    expect(z.state).toBe('daydream');
    run(s, TUNING.daydreamMaxSec + 1);
    expect(z.state).not.toBe('daydream');
  });
});

describe('stove, counter and door controls', () => {
  const cooking = (dish = 'hobodog', level = 1) => {
    const s = createInitialState(3);
    s.level = level;
    s.stats.cooked.sliders = 1;
    expect(startCooking(s, you(s).id, stove(s).id, dish)).toBeNull();
    for (let i = 0; i < 200 && you(s).state !== 'cooking'; i++) tick(s, 0.1);
    run(s, 5);
    expect(stove(s).status).toBe('cooking');
    return s;
  };

  it('Brain Sauce finishes a dish instantly (original price: max(1, (XP x 10 + price x servings) / 500 x share left))', () => {
    const s = cooking('tacos', 3);
    s.sauce = 0;
    expect(finishNow(s, stove(s).id)).toMatch(/Brain Sauce/);
    s.sauce = 5;
    const d = DISH_BY_ID.tacos;
    const st = stove(s);
    const cost = finishCost(s, st.id);
    expect(cost).toBe(Math.max(1, Math.floor(((d.xp * 10 + d.price * d.servings) / 500) * (st.left! / st.total!))));
    expect(cost).toBe(3);
    expect(finishNow(s, st.id)).toBeNull();
    expect(st.status).toBe('done');
    expect(s.sauce).toBe(5 - cost);
    // a cheap dish is never less than 1
    const h = cooking('hobodog');
    expect(finishCost(h, stove(h).id)).toBe(1);
  });

  it('cancelling refunds half the ingredients and frees the cook', () => {
    const s = cooking();
    const cash = s.cash;
    expect(cancelCooking(s, stove(s).id)).toBeNull();
    expect(s.cash).toBe(cash + Math.floor(DISH_BY_ID.hobodog.cost * TUNING.sellBack));
    expect(stove(s).status).toBe('empty');
    expect(you(s).state).toBe('idle');
  });

  it('discarding empties a counter slot', () => {
    const s = createInitialState(3);
    stock(s, 'sliders', 4);
    expect(discardCounter(s, s.counter[0].id)).toBeNull();
    expect(s.counter[0].servings).toBe(0);
    expect(discardCounter(s, s.counter[0].id)).not.toBeNull();
  });

  it('a closed café gets no customers, cash items stop, and the rating slowly sags', () => {
    const s = createInitialState(3);
    const vm = addFurniture(s, 'vending', 6, 5, 'sw');
    s.customers = [];
    setClosed(s, true);
    const r0 = s.rating;
    run(s, 600, 1);
    expect(s.customers).toHaveLength(0);
    expect(vm.bank ?? 0).toBe(0);
    expect(s.rating).toBeLessThan(r0);
    setClosed(s, false);
    run(s, 90);
    expect(s.customers.length).toBeGreaterThan(0);
    expect(vm.bank ?? 0).toBeGreaterThan(0);
  });
});

describe('saving and offline progress', () => {
  it('round-trips and keeps earning while you are away (capped at 8h)', () => {
    const s = createInitialState(9);
    stock(s, 'sliders', 300);
    const raw = serialize(s, 1_000_000);
    const back = deserialize(raw, 1_000_000 + 30 * 60 * 1000);
    expect(back.offlineSec).toBeCloseTo(1800);
    expect(back.state.stats.served).toBeGreaterThan(5);
    expect(back.offlineCash).toBeGreaterThan(0);
  });

  it('upgrades an old (v2) save, keeping level, money, recipes and crew', () => {
    const v2 = { version: 2, rng: 5, level: 6, xp: 40, cash: 1234, sauce: 9, recipes: ['chili', 'hotdog'], seen: { teen: 'infected' }, workers: [{ kind: 'you', type: 'you' }, { kind: 'zombie', type: 'teen' }, { kind: 'zombie', type: 'cop' }], stats: { served: 50 } };
    const s = migrate(v2)!;
    expect(s.version).toBe(3);
    expect(s.level).toBe(6);
    expect(s.cash).toBe(Math.max(1234, TUNING.startCash)); // never less than a fresh start
    expect(s.recipes).toEqual(['chili']);
    expect(zombies(s).map((z) => z.type)).toEqual(['teen', 'cop']);
    expect(room(s)).toEqual({ w: 7, h: 6 });
  });

  it('starts fresh on garbage', () => {
    expect(deserialize('{nope', 0).state.level).toBe(1);
  });
});
