/**
 * Chef avatars: who YOU look like, and the four stats that come with the look.
 *
 * The original let you pick one of 9 starting chefs on a choose-chef screen, changeable any time,
 * each card showing Tip Rating, Attack Speed, Attack Strength and Energy (doc 16 §J, doc 17 §2.3:
 * the starting chef row is Energy 90 · Speed 5 · Strength 4 · Tips 3).
 *
 * Ours: the default chef keeps YOU's own stats (YOU_STATS); the other eight trade a point or two between the stats
 * around the same total, so the pick is a look with a small flavour, never a pay wall (a deliberate
 * difference: the original's 9 starters were identical and the stronger chefs cost cash or toxin).
 *
 * The choice lives on YOU's worker: `type` is the avatar id ('you' is the default look) and the four
 * stats are YOU's own `tips`, `speed`, `power` and `energy`, so every rule that already reads a
 * worker's stats (tips when serving, walk and swing speed, bite/raid damage, max energy) picks the
 * avatar up with no special cases.
 */
import { YOU_STATS } from './data';
import type { GameState, Worker } from './state';

export interface ChefDef {
  id: string;
  name: string;
  blurb: string;
  /** Tip Rating: how much diners tip when this chef serves */
  tips: number;
  /** Attack Speed: swings (and walks) faster */
  speed: number;
  /** Attack Strength: damage per hit */
  power: number;
  /** Energy: max energy (= health in a fight) */
  energy: number;
}

const D = (id: string, name: string, tips: number, speed: number, power: number, energy: number, blurb: string): ChefDef => ({ id, name, tips, speed, power, energy, blurb });

/** The 9 chefs on the picker, in order. 'you' is the default look (Patient Zero). */
export const CHEFS: ChefDef[] = [
  // the default look keeps YOU's own numbers, whatever the sim tunes them to
  D('you', 'Patient Zero', YOU_STATS.tips, YOU_STATS.speed, YOU_STATS.power, YOU_STATS.energy, 'The original. Bitten once, still flipping.'),
  D('chef_pitboss', 'Big Smoke', 2, 4, 6, 100, 'Built like a smoker. Hits like one too.'),
  D('chef_hash', 'Hash Slinger', 4, 6, 3, 80, 'Diner lifer. Fast hands, faster mouth.'),
  D('chef_grill', 'Grill Sergeant', 2, 5, 5, 95, 'Runs the kitchen like a boot camp.'),
  D('chef_saucy', 'Saucy Sue', 5, 5, 3, 80, 'Regulars tip big just to hear her laugh.'),
  D('chef_fry', 'Fry Cook Fritz', 3, 6, 4, 80, 'Smells permanently of the fryer.'),
  D('chef_butcher', 'The Butcher', 2, 3, 7, 95, 'Doesn’t say much. Doesn’t need to.'),
  D('chef_lunchlady', 'Lunch Lady Lou', 4, 4, 3, 100, 'Seen worse than zombies. Served them too.'),
  D('chef_rookie', 'The Rookie', 3, 7, 3, 80, 'First week on the job. All hustle.'),
];

export const CHEF_BY_ID: Record<string, ChefDef> = Object.fromEntries(CHEFS.map((c) => [c.id, c]));
export const CHEF_IDS = CHEFS.map((c) => c.id);

/** YOU, the player's worker. */
export const youOf = (s: GameState): Worker | undefined => s.workers.find((w) => w.kind === 'you');

/** The avatar YOU wears now ('you' for older saves). */
export function chefOf(s: GameState): ChefDef {
  return CHEF_BY_ID[youOf(s)?.type ?? 'you'] ?? CHEFS[0];
}

/** A worker's stats under this avatar (the rest of YOU's stats stay the default ones). */
export function chefStats(id: string): Worker['stats'] {
  const c = CHEF_BY_ID[id] ?? CHEFS[0];
  return { ...YOU_STATS, tips: c.tips, speed: c.speed, power: c.power, energy: c.energy };
}

/**
 * Change chef (any time, free). Energy keeps the same fraction of the new maximum, so swapping
 * looks is never a free refill.
 */
export function setChef(s: GameState, id: string): string | null {
  const c = CHEF_BY_ID[id];
  if (!c) return 'No such chef.';
  const w = youOf(s);
  if (!w) return 'Nobody to dress up.';
  if (w.state === 'raiding') return 'You’re out on a raid. Change when you’re back.';
  const frac = w.stats.energy > 0 ? Math.max(0, Math.min(1, w.energy / w.stats.energy)) : 1;
  w.type = c.id;
  w.stats = chefStats(c.id);
  w.energy = Math.round(frac * w.stats.energy * 10) / 10;
  return null;
}
