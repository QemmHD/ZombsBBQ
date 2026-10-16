import { describe, expect, it } from 'vitest';
import {
  RIVALS,
  createInitialState,
  finishRaid,
  focusTarget,
  makeWorker,
  retreat,
  rivalReady,
  sendAll,
  startRaid,
  stealDish,
  stepRaid,
  tick,
  useGreen,
  useHeadstone,
  useRed,
  useSummon,
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
function play(r: RaidState, maxSec = 130) {
  for (let t = 0; t < maxSec && r.phase === 'fight'; t += 0.05) stepRaid(r, 0.05);
}

describe('raid setup', () => {
  it('the map opens at level 2, joints need their level, and squads need someone', () => {
    const s = withCrew(['construction']);
    s.level = 1;
    expect(rivalReady(s, 'chuck')).toMatch(/level 2/);
    s.level = 3;
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: 0 };
    expect(rivalReady(s, 'hank')).toMatch(/level 4/);
    s.rivals = {};
    s.level = 12;
    expect(rivalReady(s, 'chuck')).toBeNull();
    expect(rivalReady(s, 'hank')).toMatch(/previous/);
    expect(startRaid(s, 'chuck', [])).toMatch(/at least one/);
  });

  it('raiders leave the joint while out', () => {
    const s = withCrew(['construction', 'teen']);
    const r = startRaid(s, 'chuck', crewIds(s));
    expect(typeof r).toBe('object');
    expect(s.workers.filter((w) => w.state === 'raiding')).toHaveLength(2);
    tick(s, 1); // the joint keeps running without them
    expect(s.workers.filter((w) => w.state === 'raiding')).toHaveLength(2);
  });
});

describe('the fight', () => {
  it('three starter zombies can beat Chuck Wagon; first win always drops the signature recipe', () => {
    const s = withCrew(['construction', 'accountant', 'teen']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    sendAll(r);
    play(r);
    expect(r.phase).toBe('won');
    expect(r.gateBroken).toBe(true);
    expect(r.bossOut).toBe(true);
    const res = finishRaid(s, r);
    expect(res.result).toBe('won');
    expect(res.recipeDrop).toBe('chili');
    expect(s.fridge.some((f) => f.dish === 'chili')).toBe(true);
    expect(s.rivals.chuck.wins).toBe(1);
    expect(res.stars).toBeGreaterThanOrEqual(1);
    expect(rivalReady(s, 'hank')).toBeNull();
    expect(rivalReady(s, 'chuck')).toMatch(/rebuilding/);
    expect(s.workers.every((w) => w.state !== 'raiding')).toBe(true);
  });

  it('a lone tired zombie loses to Big Hank, gets KO’d and reanimates later; eaten-customer cash is kept', () => {
    const s = withCrew(['teen']);
    s.rivals.chuck = { stars: 1, wins: 1, nextAt: 0 };
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
    for (let i = 0; i < 16 * 60; i++) tick(s, 1);
    expect(z.state).not.toBe('down');
  });

  it('tapping the counter sends a zombie to steal a dish, kept even on retreat', () => {
    const s = withCrew(['construction', 'cop', 'nurse']);
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    sendAll(r);
    for (let t = 0; t < 60 && !r.gateBroken; t += 0.05) stepRaid(r, 0.05);
    expect(r.gateBroken).toBe(true);
    expect(stealDish(r, 0)).toBeNull();
    for (let t = 0; t < 30 && !r.stolen.length && r.phase === 'fight'; t += 0.05) stepRaid(r, 0.05);
    expect(r.stolen).toContain('hotdog');
    retreat(r);
    const res = finishRaid(s, r);
    expect(res.result).toBe('retreat');
    expect(s.fridge.some((f) => f.dish === 'hotdog')).toBe(true);
  });

  it('focus targeting, grave markers, headstones and the Big Foot-Long summon all work and are limited', () => {
    const s = withCrew(['construction', 'boxer']);
    s.inventory.summon = 1;
    s.inventory.headstone = 1;
    const r = startRaid(s, 'chuck', crewIds(s)) as RaidState;
    sendAll(r);
    const staff = r.units.find((u) => u.kind === 'staff')!;
    focusTarget(r, staff.id);
    expect(r.focus).toBe(staff.id);
    expect(useRed(s, r)).toBeNull();
    expect(useRed(s, r)).toMatch(/Already/);
    expect(useGreen(s, r)).toBeNull();
    expect(s.graves.green).toBe(4);
    expect(useHeadstone(s, r)).toBeNull();
    expect(useHeadstone(s, r)).toMatch(/No Healing/);
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
    for (const rv of RIVALS) {
      const s = withCrew(crews[rv.id], 11);
      for (const prev of RIVALS.slice(0, RIVALS.indexOf(rv))) s.rivals[prev.id] = { stars: 1, wins: 1, nextAt: 0 };
      const r = startRaid(s, rv.id, crewIds(s)) as RaidState;
      sendAll(r);
      play(r);
      expect(`${rv.id}:${r.phase}`).toBe(`${rv.id}:won`);
      const weak = withCrew(['yoga'], 11);
      weak.level = 12;
      for (const prev of RIVALS.slice(0, RIVALS.indexOf(rv))) weak.rivals[prev.id] = { stars: 1, wins: 1, nextAt: 0 };
      const r2 = startRaid(weak, rv.id, crewIds(weak)) as RaidState;
      sendAll(r2);
      play(r2);
      expect(`${rv.id}:${r2.phase}`).toBe(`${rv.id}:lost`);
    }
  });
});
