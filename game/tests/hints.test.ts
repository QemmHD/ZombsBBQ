import { describe, expect, it } from 'vitest';
import {
  CLOSED_NAG,
  CUSTOMER_BY_ID,
  HINTS,
  HINT_GAP,
  HINT_STALE,
  NAME_MAX,
  TUNING,
  TUTORIAL,
  addToCounter,
  badges,
  buyAndPlace,
  canPlace,
  createInitialState,
  deserialize,
  guideItems,
  guideStep,
  hintEvent,
  hintState,
  hintTick,
  jointName,
  markSeen,
  nextHint,
  renameJoint,
  serialize,
  setClosed,
  showHint,
  startCooking,
  tick,
  upcomingAlerts,
  validSeats,
  type GameEvent,
  type GameState,
} from '../src/sim';

const run = (s: GameState, sec: number, dt = 0.25, onEvent?: (e: GameEvent) => void) => {
  for (let t = 0; t < sec; t += dt) {
    tick(s, dt);
    if (onEvent) for (const e of s.events) onEvent(e);
    s.events.length = 0;
  }
};
const you = (s: GameState) => s.workers.find((w) => w.kind === 'you')!;

/** A joint past the tutorial whose guided purchase is already done (three seats). */
function veteran(seed = 5): GameState {
  const s = createInitialState(seed);
  s.tut = TUTORIAL.length;
  s.cash = 50;
  hintState(s).guide = 2;
  return s;
}

/** Find a free spot for a table with a chair in front of it (facing it). */
function tableSpot(s: GameState, table: string, chair: string) {
  for (let y = 1; y < s.roomH - 1; y++)
    for (let x = 1; x < s.roomW - 1; x++) if (!canPlace(s, table, x, y) && !canPlace(s, chair, x, y + 1, 'ne')) return { x, y };
  throw new Error('no room');
}

describe('new sim events', () => {
  it('outOfFood fires when the last serving leaves the counter', () => {
    const s = createInitialState(3);
    s.tut = 99;
    addToCounter(s, 'sliders', 1);
    const evs: string[] = [];
    run(s, 120, 0.25, (e) => evs.push(e.t));
    expect(evs).toContain('outOfFood');
    expect(evs.filter((t) => t === 'outOfFood')).toHaveLength(1);
  });

  it('burnSoon fires with a quarter of the burn window left, then the dish burns', () => {
    const s = createInitialState(4);
    s.tut = 99;
    s.closed = true; // keep customers out of it
    expect(startCooking(s, you(s).id, s.stoves[0].id, 'sliders')).toBeNull();
    let doneAt = -1;
    let warnAt = -1;
    let burntAt = -1;
    run(s, 900, 0.25, (e) => {
      if (e.t === 'dishDone') doneAt = s.now;
      if (e.t === 'burnSoon') warnAt = s.now;
      if (e.t === 'burnt') burntAt = s.now;
    });
    expect(doneAt).toBeGreaterThan(0);
    const window = Math.max(TUNING.burnMinSec, 120);
    expect(warnAt - doneAt).toBeCloseTo(window * 0.75, 0);
    expect(burntAt - doneAt).toBeCloseTo(window, 0);
    expect(s.stoves[0].burnWarn).toBeUndefined();
  });

  it('plating in time never raises burnSoon', () => {
    const s = createInitialState(4);
    s.tut = 99;
    s.closed = true;
    startCooking(s, you(s).id, s.stoves[0].id, 'sliders');
    const evs: string[] = [];
    run(s, 200, 0.25, (e) => evs.push(e.t));
    expect(s.stoves[0].status).toBe('done');
    s.stoves[0].status = 'empty'; // scraped / carried off
    run(s, 400, 0.25, (e) => evs.push(e.t));
    expect(evs).not.toContain('burnSoon');
  });

  it('rare customers announce themselves on arrival', () => {
    const s = createInitialState(9);
    s.tut = 99;
    s.level = 15;
    s.rating = 1;
    addToCounter(s, 'sliders', 500);
    const rare: { id: string; tier: string }[] = [];
    run(s, 1200, 0.5, (e) => {
      if (e.t === 'rareArrival') rare.push({ id: e.customerId, tier: e.tier });
      if (e.t === 'rareArrival') {
        const c = s.customers.find((x) => x.id === e.customerId);
        expect(c).toBeTruthy();
        expect(CUSTOMER_BY_ID[c!.type].tier).toBe(e.tier);
      }
    });
    expect(rare.length).toBeGreaterThan(0);
    for (const r of rare) expect(['rare', 'epic', 'legendary']).toContain(r.tier);
  });

  it('the tutorial’s first diner eats in 10 s; everyone after that takes the usual 30 s', () => {
    const s = createInitialState(6);
    s.tut = 3;
    addToCounter(s, 'sliders', 10);
    const meals: number[] = [];
    const seen = new Set<string>();
    for (let t = 0; t < 400 && meals.length < 2; t += 0.25) {
      tick(s, 0.25);
      s.events.length = 0;
      for (const c of s.customers)
        if (c.state === 'eating' && !seen.has(c.id)) {
          seen.add(c.id);
          meals.push(c.eatEnd - s.now);
        }
    }
    expect(meals[0]).toBeCloseTo(TUNING.tutorialEatSec, 0);
    expect(TUNING.tutorialEatSec).toBe(10);
    expect(meals[1]).toBeCloseTo(TUNING.eatSec, 0);
  });
});

describe('Gus’s one-shot hints', () => {
  it('stay quiet during the tutorial', () => {
    const s = createInitialState(1);
    hintEvent(s, { t: 'bite', x: 0, y: 0, workerId: 'w', customerId: 'c' });
    expect(hintState(s).pending).toHaveLength(0);
    expect(nextHint(s)).toBeNull();
  });

  it('an event hint shows once, ever', () => {
    const s = veteran();
    hintEvent(s, { t: 'outOfFood' });
    expect(nextHint(s)).toBe('outOfFood');
    showHint(s, 'outOfFood');
    expect(hintState(s).seen).toContain('outOfFood');
    s.now += 1000;
    hintEvent(s, { t: 'outOfFood' });
    expect(nextHint(s)).not.toBe('outOfFood');
  });

  it('never two within HINT_GAP seconds, and never while blocked (a menu is open)', () => {
    const s = veteran();
    hintEvent(s, { t: 'burnSoon', stoveId: 's1' });
    hintEvent(s, { t: 'daydream', workerId: 'w1' });
    expect(nextHint(s, true)).toBeNull();
    expect(nextHint(s)).toBe('burnSoon');
    showHint(s, 'burnSoon');
    s.now += HINT_GAP - 1;
    expect(nextHint(s)).toBeNull();
    s.now += 1;
    hintEvent(s, { t: 'daydream', workerId: 'w1' }); // still queued, no duplicate
    expect(hintState(s).pending.filter((p) => p.id === 'daydream')).toHaveLength(1);
  });

  it('stale event hints are dropped unseen, so they can come back later', () => {
    const s = veteran();
    hintEvent(s, { t: 'bite', x: 0, y: 0, workerId: 'w', customerId: 'c' });
    s.now += HINT_STALE + 1;
    expect(nextHint(s)).not.toBe('firstBite');
    expect(hintState(s).seen).not.toContain('firstBite');
    hintEvent(s, { t: 'bite', x: 0, y: 0, workerId: 'w', customerId: 'c' });
    expect(nextHint(s)).toBe('firstBite');
  });

  it('"time to open" after the sign has been flipped a while', () => {
    const s = veteran();
    setClosed(s, true);
    hintTick(s);
    expect(nextHint(s)).not.toBe('closed');
    s.now += CLOSED_NAG + 1;
    hintTick(s);
    expect(nextHint(s)).toBe('closed');
    setClosed(s, false);
    hintTick(s);
    expect(nextHint(s)).not.toBe('closed');
  });

  it('state hints: the map at level 2, low energy, another stove, expanding', () => {
    const s = veteran();
    s.level = 2;
    expect(nextHint(s)).toBe('map');
    showHint(s, 'map');
    s.now += HINT_GAP;
    s.workers.push({ ...you(s), id: 'z1', kind: 'zombie', type: 'joe', energy: 50, state: 'idle' });
    expect(nextHint(s)).toBe('lowEnergy');
    showHint(s, 'lowEnergy');
    s.now += HINT_GAP;
    s.cash = 600;
    expect(nextHint(s)).toBe('buyStove');
    showHint(s, 'buyStove');
    s.now += HINT_GAP;
    s.cash = 4000;
    expect(nextHint(s)).toBe('expand');
  });

  it('a customer turned away at the door, an idle stove, a free crew slot', () => {
    const s = veteran();
    s.customers.push({ id: 'c1', type: 'joe', state: 'turnedAway', x: 3, y: 0, path: [], speed: 1, facing: 1, waitLeft: 60, eatEnd: 0 });
    expect(nextHint(s)).toBe('noSeat');
    showHint(s, 'noSeat');
    s.customers[0].state = 'waiting';
    s.now += HINT_GAP;
    s.level = 2;
    s.crewCap = 2;
    hintState(s).seen.push('map');
    expect(nextHint(s)).toBe('crewSlot');
    showHint(s, 'crewSlot');
    hintTick(s); // the grimy stove sits empty…
    s.now += 31;
    hintTick(s);
    expect(nextHint(s)).toBe('idleStove');
  });

  it('every hint has a line from Gus', () => {
    for (const t of Object.values(HINTS)) expect(t.length).toBeGreaterThan(20);
  });

  it('hints and the joint name survive a save round-trip', () => {
    const s = veteran();
    showHint(s, 'map');
    renameJoint(s, 'Grill of the Dead');
    const back = deserialize(serialize(s, 5000), 5000).state;
    expect(back.hints!.seen).toEqual(['map']);
    expect(jointName(back)).toBe('Grill of the Dead');
  });
});

describe('the guided first table and chair', () => {
  it('starts after the tutorial, once a table and chair are affordable, and blocks other hints', () => {
    const s = createInitialState(2);
    s.tut = TUTORIAL.length;
    s.cash = 100;
    hintTick(s);
    expect(hintState(s).guide).toBe(0);
    expect(guideStep(s)).toBeNull(); // can't afford it yet
    s.cash = 1000;
    expect(guideStep(s)).toBe('table');
    hintEvent(s, { t: 'outOfFood' });
    expect(nextHint(s)).toBeNull();
    const { table, chair } = guideItems(s);
    expect(table!.cash).toBeLessThanOrEqual(150);
    expect(chair!.cash).toBeLessThanOrEqual(75);
    const at = tableSpot(s, table!.id, chair!.id);
    expect(buyAndPlace(s, table!.id, at.x, at.y)).toBeNull();
    hintTick(s);
    expect(guideStep(s)).toBe('chair');
    expect(buyAndPlace(s, chair!.id, at.x, at.y + 1, 'ne')).toBeNull();
    hintTick(s);
    expect(validSeats(s)).toHaveLength(3);
    expect(guideStep(s)).toBeNull();
    expect(hintState(s).guide).toBe(2);
    expect(nextHint(s)).toBe('outOfFood');
  });

  it('a joint that already has more seats skips it', () => {
    const s = createInitialState(2);
    s.cash = 2000;
    const { table, chair } = guideItems(s);
    const at = tableSpot(s, table!.id, chair!.id);
    buyAndPlace(s, table!.id, at.x, at.y);
    buyAndPlace(s, chair!.id, at.x, at.y + 1, 'ne');
    s.tut = TUTORIAL.length;
    hintTick(s);
    expect(guideStep(s)).toBeNull();
  });
});

describe('HUD "new" badges', () => {
  it('start clear, light up for new shop items and recipes, clear when the menu is opened', () => {
    const s = createInitialState(1);
    expect(badges(s)).toEqual({ shop: false, book: false, crew: false, pedia: false, map: false });
    s.level = 2;
    expect(badges(s).shop).toBe(true);
    expect(badges(s).book).toBe(true); // Gutter Gumbo unlocks at 2
    markSeen(s, 'shop');
    markSeen(s, 'book');
    expect(badges(s).shop).toBe(false);
    expect(badges(s).book).toBe(false);
  });

  it('a new Zombiepedia entry, a new crew slot, the boss café', () => {
    const s = createInitialState(1);
    hintState(s);
    s.seen.joe = 'met';
    expect(badges(s).pedia).toBe(true);
    markSeen(s, 'pedia');
    expect(badges(s).pedia).toBe(false);
    s.seen.joe = 'infected';
    expect(badges(s).pedia).toBe(true);
    s.tut = TUTORIAL.length;
    s.crewCap = 2;
    expect(badges(s).crew).toBe(true);
    markSeen(s, 'crew');
    expect(badges(s).crew).toBe(false);
    s.level = 5;
    s.now = 3600; // the food truck parks for 3 h out of every 10
    expect(badges(s).map).toBe(true);
    s.now = 5 * 3600;
    expect(badges(s).map).toBe(false);
  });
});

describe('renaming the joint', () => {
  it('trims, caps the length, strips markup, refuses empty names', () => {
    const s = createInitialState(1);
    expect(jointName(s)).toBe('YOUR JOINT');
    expect(renameJoint(s, '   ')).toMatch(/name/);
    expect(renameJoint(s, '  The   <b>Rotten</b> Rib  ')).toBeNull();
    expect(s.name).toBe('The bRotten/b Rib');
    renameJoint(s, 'x'.repeat(60));
    expect(s.name!.length).toBe(NAME_MAX);
  });
});

describe('check-in alerts (for local notifications)', () => {
  it('a dish cooking: done when its timer ends, about to burn three quarters into the burn window', () => {
    const s = createInitialState(4);
    s.closed = true;
    startCooking(s, you(s).id, s.stoves[0].id, 'hobodog');
    run(s, 10);
    const st = s.stoves[0];
    expect(st.status).toBe('cooking');
    const a = upcomingAlerts(s);
    const done = a.find((x) => x.kind === 'dishDone')!;
    const burn = a.find((x) => x.kind === 'burnSoon')!;
    expect(done.in).toBeCloseTo(st.left!, 3);
    expect(burn.in).toBeCloseTo(st.left! + TUNING.burnMinSec * 0.75, 3);
    expect(done.body).toMatch(/Hobo Hot Dog/);
    expect(a.map((x) => x.in)).toEqual([...a.map((x) => x.in)].sort((p, q) => p - q));
  });

  it('a finished dish only warns about burning; a paused one says nothing', () => {
    const s = createInitialState(4);
    s.closed = true;
    startCooking(s, you(s).id, s.stoves[0].id, 'sliders');
    run(s, 200);
    expect(s.stoves[0].status).toBe('done');
    const a = upcomingAlerts(s);
    expect(a.map((x) => x.kind)).toEqual(['burnSoon']);
    expect(a[0].in).toBeCloseTo(s.stoves[0].burnWarn! - s.now, 3);
    const p = createInitialState(4);
    p.stoves[0] = { ...p.stoves[0], status: 'paused', dish: 'sliders', left: 50, total: 120 };
    expect(upcomingAlerts(p)).toEqual([]);
  });

  it('a knocked-out zombie reviving and a wrecked rival reopening', () => {
    const s = createInitialState(4);
    s.workers.push({ ...you(s), id: 'z9', kind: 'zombie', name: 'Zombie Joe', state: 'down', downUntil: s.now + 1800 });
    s.rivals.chuck = { stars: 2, wins: 1, nextAt: s.now + 3600 };
    s.rivals.hank = { stars: 0, wins: 0, nextAt: s.now + 60 }; // a loss's short regroup: not worth a ping
    const a = upcomingAlerts(s);
    expect(a.map((x) => [x.kind, Math.round(x.in)])).toEqual([
      ['revived', 1800],
      ['rivalOpen', 3600],
    ]);
    expect(a[0].body).toMatch(/Zombie Joe/);
    expect(new Set(a.map((x) => x.id)).size).toBe(a.length);
  });
});
