/**
 * The Controller's save handling, with a fake browser: killing the app mid-raid, coming back to the app
 * after a long time in the background, a corrupt save (kept, never overwritten, backups offered), and
 * the rotating backups.
 */
import { beforeEach, describe, expect, it } from 'vitest';

const store = new Map<string, string>();
const docL: Record<string, (() => void)[]> = {};
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
g.document = { hidden: false, addEventListener: (t: string, f: () => void) => (docL[t] ??= []).push(f) };
g.window = { addEventListener() {} };

const load = async () => {
  const { Controller } = await import('../src/game/controller');
  const S = await import('../src/sim');
  return { Controller, S };
};

beforeEach(() => {
  store.clear();
  for (const k of Object.keys(docL)) delete docL[k];
});

describe('Controller saves', () => {
  it('an app killed mid-raid comes back with the squad home, not stuck raiding', async () => {
    const { Controller, S } = await load();
    const ctl = new Controller();
    ctl.state.level = 3;
    ctl.state.crewCap = S.crewCapForLevel(3);
    // YOU stays home (like the original's chef); send a zombie
    const z = S.makeWorker(ctl.state, 'zombie', 'joe', { x: 3, y: 2 });
    ctl.state.workers.push(z);
    expect(ctl.beginRaid('chuck', [z.id], [])).toBeNull();
    for (let i = 0; i < 100; i++) ctl.update(0.1);
    // killed (no pagehide on iOS), relaunched
    const ctl2 = new Controller();
    for (let i = 0; i < 600; i++) ctl2.update(0.1);
    const z2 = ctl2.state.workers.find((w) => w.id === z.id)!;
    expect(z2.state).not.toBe('raiding');
  });

  it('back from 20 h in the background: real-time timers count it all, same as a cold start', async () => {
    const { Controller, S } = await load();
    const ctl = new Controller();
    const s = ctl.state;
    s.purple = { stars: 1, until: s.now + 10 * 3600 };
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: s.now + 18 * 3600 };
    const real = Date.now;
    const t0 = real();
    try {
      (g.document as { hidden: boolean }).hidden = true;
      docL.visibilitychange.forEach((f) => f());
      Date.now = () => t0 + 20 * 3600 * 1000;
      (g.document as { hidden: boolean }).hidden = false;
      docL.visibilitychange.forEach((f) => f());
    } finally {
      Date.now = real;
    }
    expect(S.purpleStars(ctl.state)).toBe(0);
    expect(S.rivalClosed(ctl.state, 'chuck')).toBe(false);
    expect(ctl.offlineReport?.sec).toBeCloseTo(20 * 3600, -2);
  });

  it('a corrupt save is kept, never overwritten, and backups are offered', async () => {
    const { Controller, S } = await load();
    // a good game, saved with a backup
    const a = new Controller();
    a.state.cash = 9999;
    a.state.level = 4;
    a.save();
    expect(store.get(S.backupKey(0))).toBeTruthy();
    // then the main save gets mangled
    store.set(S.SAVE_KEY, '{"savedAt":1,"state":{"version":3,"workers":null}}');
    const b = new Controller();
    expect(b.loadProblem?.backups.map((x) => x.level)).toEqual([4]);
    for (let i = 0; i < 80; i++) b.update(0.1); // autosave ticks…
    b.save();
    expect(store.get(S.SAVE_KEY)).toContain('"workers":null'); // …but nothing overwrote it
    expect([...store.keys()].some((k) => k.startsWith(`${S.SAVE_KEY}.corrupt.`))).toBe(true);
    expect(b.loadBackup(0)).toBeNull();
    expect(b.state.cash).toBe(9999);
    expect(b.loadProblem).toBeNull();
    expect(JSON.parse(store.get(S.SAVE_KEY)!).state.cash).toBe(9999);
  });

  it('starting fresh after a corrupt save turns autosave back on', async () => {
    const { Controller, S } = await load();
    store.set(S.SAVE_KEY, 'garbage');
    const c = new Controller();
    expect(c.loadProblem).not.toBeNull();
    c.startFresh();
    expect(JSON.parse(store.get(S.SAVE_KEY)!).state.level).toBe(1);
  });

  it('a save the browser refuses is reported once', async () => {
    const { Controller } = await load();
    const ctl = new Controller();
    const msgs: string[] = [];
    ctl.onToast((t) => msgs.push(t));
    const ls = g.localStorage as { setItem: (k: string, v: string) => void };
    const set = ls.setItem;
    ls.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    try {
      ctl.save();
      ctl.save();
    } finally {
      ls.setItem = set;
    }
    expect(msgs.filter((m) => /can’t be saved/.test(m))).toHaveLength(1);
  });

  it('a frame that throws does not stop the game', async () => {
    const { Controller } = await load();
    const ctl = new Controller();
    const now = ctl.state.now;
    const bad = ctl.state.stoves[0];
    (ctl.state.stoves as unknown[])[0] = null; // something rotten in the state
    ctl.update(0.1);
    ctl.state.stoves[0] = bad;
    ctl.update(0.1);
    expect(ctl.state.now).toBeGreaterThan(now);
  });
});

describe('Controller: the rebuilt controls', () => {
  it('a brand-new joint starts closed with YOU one step in from the front door', async () => {
    const { Controller, S } = await load();
    const ctl = new Controller();
    const you = ctl.state.workers.find((w) => w.kind === 'you')!;
    expect(ctl.state.closed).toBe(true);
    expect([you.x, you.y]).toEqual([S.DOOR_X, 1]);
  });

  it('a hold (the tutorial bar) freezes the café clock until it is lifted', async () => {
    const { Controller } = await load();
    const ctl = new Controller();
    ctl.hold('tutorial', true);
    const t = ctl.state.now;
    for (let i = 0; i < 10; i++) ctl.update(0.1);
    expect(ctl.frozen).toBe(true);
    expect(ctl.state.now).toBe(t);
    ctl.hold('tutorial', false);
    ctl.update(0.1);
    expect(ctl.state.now).toBeGreaterThan(t);
  });

  it('ORDER repeats the last dish cooked on a stove', async () => {
    const { Controller } = await load();
    const ctl = new Controller();
    const st = ctl.state.stoves[0];
    expect(ctl.reorderDish(st.id)).toBeNull();
    ctl.select({ kind: 'dishPicker', stoveId: st.id });
    ctl.chooseDish('sliders');
    expect(ctl.reorderDish(st.id)).toBe('sliders');
  });

  it('placing lists every tile the piece could go on, and only valid ones', async () => {
    const { Controller, S } = await load();
    const ctl = new Controller();
    ctl.state.cash = 10000;
    ctl.state.level = 5;
    ctl.beginPlace('table_diner', 'buy');
    const ok = ctl.placeableTiles();
    expect(ok.length).toBeGreaterThan(3);
    for (const t of ok) expect(S.canPlace(ctl.state, 'table_diner', t.x, t.y, ctl.placing!.dir)).toBeNull();
    expect(ok.some((t) => t.x === ctl.state.furniture[0].x && t.y === ctl.state.furniture[0].y)).toBe(false);
  });
});
