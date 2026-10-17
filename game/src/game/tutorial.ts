/**
 * The tutorial's screen side, worked out from the sim state (pure, no DOM or Phaser): what Gus says
 * on the chalkboard bar, which thing the bouncing red arrow points at, and which HUD icons are out yet.
 *
 * Like the original (doc 19 §1): every step opens Gus's bar once and the simulation is frozen until
 * OK; then the arrow bounces over the thing to touch and the camera pans to it. The steps themselves
 * (when the tutorial moves on) are the sim's `TUTORIAL` / `updateTutorial`.
 */
import { TUTORIAL, zombies, type GameState } from '../sim';
import type { Selection } from './controller';

export type TutTarget =
  | { t: 'worker'; id: string }
  | { t: 'customer'; id: string }
  | { t: 'stove'; id: string }
  | { t: 'furniture'; id: string }
  | { t: 'door' }
  /** a HUD element, by CSS selector */
  | { t: 'dom'; sel: string };

export const tutorialActive = (s: GameState) => s.tut < TUTORIAL.length;

/** Customers are needed from this step on (serve, infect): a closed café has to open first. */
const NEEDS_CUSTOMERS = [3, 4];

/** The café is closed and the tutorial needs diners: the door is the thing to tap. */
export const doorStep = (s: GameState) => tutorialActive(s) && !!s.closed && NEEDS_CUSTOMERS.includes(s.tut);

export const DOOR_LINE = 'We’re still CLOSED, Boss. Tap the front door to open up and let the hungry in.';

/** What Gus says for the current step (null after the tutorial). */
export function tutorialLine(s: GameState): string | null {
  if (!tutorialActive(s)) return null;
  return doorStep(s) ? DOOR_LINE : TUTORIAL[s.tut];
}

/** Identifies one dialog: a new key = a new bar that freezes the sim until OK. */
export function tutorialKey(s: GameState): string | null {
  if (!tutorialActive(s)) return null;
  return `${s.tut}${doorStep(s) ? ':door' : ''}`;
}

/** What the red arrow bounces over right now (null = nothing to point at). */
export function tutorialTarget(s: GameState, sel: Selection, picking = false): TutTarget | null {
  if (!tutorialActive(s)) return null;
  if (doorStep(s)) return { t: 'door' };
  const you = s.workers.find((w) => w.kind === 'you');
  const stove = s.stoves[0];
  const zombie = zombies(s)[0];
  const seated = s.customers.find((c) => c.state === 'waiting' || c.state === 'eating') ?? s.customers.find((c) => c.state === 'entering');
  const selWorker = sel?.kind === 'worker' ? s.workers.find((w) => w.id === sel.id) : undefined;
  switch (s.tut) {
    case 0:
      if (picking || sel?.kind === 'dishPicker') return { t: 'dom', sel: '[data-dish]' };
      if (selWorker && stove) return { t: 'stove', id: stove.id };
      return you ? { t: 'worker', id: you.id } : null;
    case 1:
      return stove ? { t: 'stove', id: stove.id } : null;
    case 2: {
      const done = s.stoves.find((x) => x.status === 'done');
      return done ? { t: 'stove', id: done.id } : null;
    }
    case 3:
      return null;
    case 4:
      if (sel?.kind === 'customer') return { t: 'dom', sel: '[data-a="infect"]' };
      return seated ? { t: 'customer', id: seated.id } : null;
    case 5:
      if (selWorker?.kind === 'zombie' && stove) return { t: 'stove', id: stove.id };
      return zombie ? { t: 'worker', id: zombie.id } : null;
    case 6:
      if (selWorker?.kind === 'zombie') return { t: 'dom', sel: '[data-a="rest"]' };
      return zombie ? { t: 'worker', id: zombie.id } : null;
    case 7:
      return { t: 'dom', sel: '[data-k="shop"]' };
  }
  return null;
}

/** A stable string for a target (the camera pans once per new target). */
export function targetKey(t: TutTarget | null): string {
  if (!t) return '';
  return t.t === 'dom' ? `dom:${t.sel}` : t.t === 'door' ? 'door' : `${t.t}:${t.id}`;
}

/**
 * HUD icons appear as the tutorial reaches them (original: shop bag → cookbook → crew → map, each
 * with a red marker the first time). After the tutorial everything is out.
 */
export function tutorialIcons(s: GameState): Set<string> {
  const all = ['shop', 'goals', 'map', 'book', 'crew', 'edit', 'locker', 'sign', 'fridge', 'pedia'];
  if (!tutorialActive(s)) return new Set(all);
  const out = new Set<string>(['sign']);
  if (s.tut >= 1) out.add('book');
  if (s.tut >= 5 || zombies(s).length) out.add('crew');
  if (s.tut >= 7) for (const k of ['shop', 'edit']) out.add(k);
  return out;
}

