/** The tutorial's screen side: Gus's lines, the arrow's target, the door step and the icon column. */
import { describe, expect, it } from 'vitest';
import { DOOR_LINE, doorStep, targetKey, tutorialIcons, tutorialKey, tutorialLine, tutorialTarget } from '../src/game/tutorial';
import { TUTORIAL, createInitialState, makeWorker, setClosed } from '../src/sim';

describe('tutorial overlay', () => {
  it('points at YOU, then the stove once YOU is picked, then the cookbook', () => {
    const s = createInitialState(3);
    const you = s.workers[0];
    expect(tutorialLine(s)).toBe(TUTORIAL[0]);
    expect(tutorialTarget(s, null)).toEqual({ t: 'worker', id: you.id });
    expect(tutorialTarget(s, { kind: 'worker', id: you.id })).toEqual({ t: 'stove', id: s.stoves[0].id });
    expect(tutorialTarget(s, { kind: 'dishPicker', stoveId: s.stoves[0].id })).toEqual({ t: 'dom', sel: '[data-dish]' });
  });

  it('a closed joint needs the door opened before customers', () => {
    const s = createInitialState(3);
    setClosed(s, true);
    s.tut = 2;
    expect(doorStep(s)).toBe(false);
    s.tut = 3;
    expect(doorStep(s)).toBe(true);
    expect(tutorialLine(s)).toBe(DOOR_LINE);
    expect(tutorialTarget(s, null)).toEqual({ t: 'door' });
    // a new dialog key, so Gus's bar comes up (and freezes the café) for it
    expect(tutorialKey(s)).toBe('3:door');
    setClosed(s, false);
    expect(tutorialKey(s)).toBe('3');
  });

  it('infect: a seated customer, then the INFECT button', () => {
    const s = createInitialState(3);
    s.tut = 4;
    s.customers.push({ id: 'c1', type: 'joe', state: 'waiting', x: 3, y: 3, path: [], speed: 0, facing: 1, waitLeft: 30, eatEnd: 0 });
    expect(tutorialTarget(s, null)).toEqual({ t: 'customer', id: 'c1' });
    expect(tutorialTarget(s, { kind: 'customer', id: 'c1' })).toEqual({ t: 'dom', sel: '[data-a="infect"]' });
  });

  it('first zombie: tap them, then the stove; then REST; then the shop', () => {
    const s = createInitialState(3);
    const z = makeWorker(s, 'zombie', 'teen', { x: 3, y: 2 });
    s.workers.push(z);
    s.tut = 5;
    expect(tutorialTarget(s, null)).toEqual({ t: 'worker', id: z.id });
    expect(tutorialTarget(s, { kind: 'worker', id: z.id })).toEqual({ t: 'stove', id: s.stoves[0].id });
    s.tut = 6;
    expect(tutorialTarget(s, { kind: 'worker', id: z.id })).toEqual({ t: 'dom', sel: '[data-a="rest"]' });
    s.tut = 7;
    expect(targetKey(tutorialTarget(s, null))).toBe('dom:[data-k="shop"]');
    s.tut = TUTORIAL.length;
    expect(tutorialTarget(s, null)).toBeNull();
    expect(tutorialKey(s)).toBeNull();
  });

  it('the icon column fills in as the tutorial goes', () => {
    const s = createInitialState(3);
    expect([...tutorialIcons(s)]).toEqual(['sign']);
    s.tut = 1;
    expect(tutorialIcons(s).has('book')).toBe(true);
    expect(tutorialIcons(s).has('shop')).toBe(false);
    s.tut = 7;
    expect(tutorialIcons(s).has('shop')).toBe(true);
    s.tut = TUTORIAL.length;
    expect(tutorialIcons(s).size).toBe(10);
  });
});
