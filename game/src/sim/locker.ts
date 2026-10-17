/**
 * The Meat Locker: spare zombies hang on hooks, off the crew count, until you want them back.
 *
 * Original (doc 16 §H): 5 hooks to start, 5 toxin buys 5 more, 50 at most; taking one back out
 * needs a free crew slot. A hung zombie keeps its level and energy and does nothing.
 */
import { DOOR_X } from './grid';
import { atWork, releaseJob, zombies } from './sim';
import type { GameState, Worker } from './state';

export const LOCKER = { startHooks: 5, addHooks: 5, addSauce: 5, maxHooks: 50 } as const;

export interface Locker {
  hooks: number;
  zombies: Worker[];
}

declare module './state' {
  interface GameState {
    /** the Meat Locker (made on first use) */
    locker?: Locker;
  }
}

export function lockerOf(s: GameState): Locker {
  if (!s.locker) s.locker = { hooks: LOCKER.startHooks, zombies: [] };
  return s.locker;
}

/** Can this zombie be hung up right now? null = yes, else why not. */
export function lockerProblem(s: GameState, workerId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return 'Nope.';
  if (w.kind !== 'zombie') return 'Only zombies go on the hooks, Boss.';
  if (!atWork(w)) return `${w.name} is ${w.state === 'down' ? 'still reanimating' : 'out on a raid'}.`;
  if (w.state === 'feasting') return `${w.name} is busy eating. Give it a second.`;
  const l = lockerOf(s);
  if (l.zombies.length >= l.hooks) return `Every hook is taken (${l.hooks}/${l.hooks}). Buy more hooks.`;
  return null;
}

/** Hang a zombie in the locker: off the crew, frees a crew slot. */
export function storeInLocker(s: GameState, workerId: string): string | null {
  const err = lockerProblem(s, workerId);
  if (err) return err;
  const w = s.workers.find((x) => x.id === workerId)!;
  releaseJob(s, w);
  s.workers = s.workers.filter((x) => x !== w);
  w.state = 'idle';
  w.path = [];
  w.job = undefined;
  w.stoveId = undefined;
  w.pendingDish = undefined;
  w.targetId = undefined;
  w.restSpot = undefined;
  w.hungryEnd = undefined;
  lockerOf(s).zombies.push(w);
  return null;
}

/** Take a zombie off its hook: needs a free crew slot; they walk in through the door. */
export function takeFromLocker(s: GameState, index: number): string | null {
  const l = lockerOf(s);
  const w = l.zombies[index];
  if (!w) return 'Nothing on that hook.';
  if (zombies(s).length >= s.crewCap) return `The crew is full (${s.crewCap}/${s.crewCap}). Hang someone else up first.`;
  l.zombies.splice(index, 1);
  w.x = DOOR_X;
  w.y = 0;
  w.path = [];
  w.state = 'idle';
  w.nextDaydream = s.now + 60;
  s.workers.push(w);
  return null;
}

/** 5 toxin: 5 more hooks (up to 50). */
export function buyHooks(s: GameState): string | null {
  const l = lockerOf(s);
  if (l.hooks >= LOCKER.maxHooks) return `The locker is as big as it gets (${LOCKER.maxHooks} hooks).`;
  if (s.sauce < LOCKER.addSauce) return `Needs ${LOCKER.addSauce} Brain Sauce.`;
  s.sauce -= LOCKER.addSauce;
  l.hooks = Math.min(LOCKER.maxHooks, l.hooks + LOCKER.addHooks);
  return null;
}
