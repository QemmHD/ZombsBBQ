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
    const you = ctl.state.workers[0].id;
    expect(ctl.beginRaid('chuck', [you], [])).toBeNull();
    for (let i = 0; i < 100; i++) ctl.update(0.1);
    // killed (no pagehide on iOS), relaunched
    const ctl2 = new Controller();
    for (let i = 0; i < 600; i++) ctl2.update(0.1);
    expect(ctl2.state.workers[0].state).not.toBe('raiding');
    expect(S.startCooking(ctl2.state, you, ctl2.state.stoves[0].id, 'sliders')).toBeNull();
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
