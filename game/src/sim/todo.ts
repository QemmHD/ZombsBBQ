/**
 * Gus's to-do list and the purple bonus stars (original: from level 6, 4 objectives, max 3 purple
 * stars lasting 48 h / +36 h / +24 h, and a reviewer you can bribe with 2 toxin per objective).
 *
 * The list is four short jobs drawn from the player's state (what they can cook, whether the crew has
 * room, …) with counts that grow with level. Each job measures a stat counter's growth since the list
 * was drawn, so nothing has to be wired into the rest of the sim. The draw uses its own little hash,
 * not the game's RNG, so it never disturbs the café's random stream. Finishing every job awards a purple
 * star and draws a fresh list. See TUNING.purple* for what the stars do (more customers, better tips).
 */
import { DISHES, DISH_BY_ID, PURPLE, baseDishId } from './data';
import type { GameState, TodoKind, TodoList, TodoTask } from './state';
import { dishAvailable, purpleStars, stoveCooks, zombies } from './sim';

const H = 3600;

/** A dish's cook count, its rare variants included. */
export function cookedCount(s: GameState, dish: string): number {
  let n = 0;
  for (const [id, c] of Object.entries(s.stats.cooked)) if (baseDishId(id) === dish) n += c;
  return n;
}

function counter(s: GameState, t: TodoTask): number {
  switch (t.kind) {
    case 'serve':
      return s.stats.served;
    case 'cook':
      return cookedCount(s, t.dish ?? '');
    case 'clear':
      return s.stats.cleared;
    case 'earn':
      return s.stats.earned;
    case 'raid':
      return s.stats.raidsWon;
    case 'infect':
      return s.stats.infected;
    case 'decor':
      return s.stats.decor ?? 0;
  }
}

/** How far along a task is (0..target). */
export function todoProgress(s: GameState, t: TodoTask): number {
  if (t.bribed) return t.target;
  return Math.max(0, Math.min(t.target, Math.floor(counter(s, t) - t.base)));
}

export const todoDone = (s: GameState, t: TodoTask) => todoProgress(s, t) >= t.target;

export function todoText(t: TodoTask): string {
  const n = t.target;
  switch (t.kind) {
    case 'serve':
      return `Serve ${n} customers`;
    case 'cook':
      return `Cook ${DISH_BY_ID[t.dish ?? '']?.name ?? 'a dish'}${n > 1 ? ` ×${n}` : ''}`;
    case 'clear':
      return `Clear ${n} dirty plates`;
    case 'earn':
      return `Earn $${n.toLocaleString('en-US')}`;
    case 'raid':
      return n > 1 ? `Win ${n} raids` : 'Win a raid';
    case 'infect':
      return n > 1 ? `Infect ${n} customers` : 'Infect a customer';
    case 'decor':
      return n > 1 ? `Buy ${n} decorations` : 'Buy a decoration';
  }
}

/** A tiny deterministic generator for the draw (mulberry32 on a hash of the player's state). */
function drawRng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    let t = (a = (a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dishes worth asking for: known, cookable on a station the joint owns, done within two hours. */
function cookCandidates(s: GameState) {
  return DISHES.filter((d) => d.cookSec <= 2 * H && dishAvailable(s, d.id) && s.stoves.some((st) => stoveCooks(st, d.station)));
}

/** Draw a fresh list of PURPLE.tasks distinct jobs, sized for the player's level. */
export function drawTodo(s: GameState, n: number): TodoList {
  const r = drawRng(Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(s.level, 0x85ebca6b) ^ s.stats.served);
  const L = Math.max(PURPLE.level, s.level);
  const kinds: TodoKind[] = ['serve', 'cook', 'clear', 'earn', 'raid', 'decor'];
  if (zombies(s).length < s.crewCap) kinds.push('infect');
  const dishes = cookCandidates(s);
  if (!dishes.length) kinds.splice(kinds.indexOf('cook'), 1);
  // shuffle, keep the first few
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const tasks = kinds.slice(0, PURPLE.tasks).map((kind): TodoTask => {
    const t: TodoTask = { kind, target: 1, base: 0 };
    switch (kind) {
      case 'serve':
        t.target = 10 + 2 * L; // 22 at level 6, 50 at 20
        break;
      case 'cook': {
        const d = dishes[Math.floor(r() * dishes.length)];
        t.dish = d.id;
        // quick dishes a couple of times, longer ones once; a bit more as you level
        t.target = (d.cookSec <= 15 * 60 ? 2 : 1) + Math.floor((L - PURPLE.level) / 10);
        break;
      }
      case 'clear':
        t.target = 8 + L; // 14 at level 6
        break;
      case 'earn':
        t.target = Math.round((60 * L + 200) / 50) * 50; // $550 at level 6, $1,400 at 20
        break;
      case 'raid':
        t.target = 1 + Math.floor((L - PURPLE.level) / 10);
        break;
      case 'infect':
        t.target = 1;
        break;
      case 'decor':
        t.target = 1 + Math.floor((L - PURPLE.level) / 8);
        break;
    }
    t.base = counter(s, t);
    return t;
  });
  return { n, tasks };
}

/** Add one purple star: 48 h for the first, +36 h, +24 h; with three up, top up 24 h (capped). */
export function awardPurple(s: GameState) {
  const have = purpleStars(s);
  if (!have) s.purple = { stars: 1, until: s.now + PURPLE.hours[0] * H };
  else if (have < PURPLE.max) s.purple = { stars: have + 1, until: s.purple!.until + PURPLE.hours[have] * H };
  else s.purple!.until = Math.min(s.now + PURPLE.capHours * H, s.purple!.until + PURPLE.refillHours * H);
  s.events.push({ t: 'purple', stars: s.purple!.stars, gained: true });
}

/** Seconds until the purple stars drop (0 if none). */
export function purpleLeft(s: GameState): number {
  return purpleStars(s) ? s.purple!.until - s.now : 0;
}

function completeIfDone(s: GameState) {
  const list = s.todo;
  if (!list || !list.tasks.every((t) => todoDone(s, t))) return;
  awardPurple(s);
  s.todo = drawTodo(s, list.n + 1);
}

/** Bribe the reviewer: tick off an unfinished task for PURPLE.bribeSauce Brain Sauce. */
export function bribeTodo(s: GameState, index: number): string | null {
  if (s.level < PURPLE.level) return `Gus's to-do list opens at level ${PURPLE.level}.`;
  const t = s.todo?.tasks[index];
  if (!t) return 'Nothing there.';
  if (todoDone(s, t)) return 'Already done!';
  if (s.sauce < PURPLE.bribeSauce) return `Needs ${PURPLE.bribeSauce} Brain Sauce.`;
  s.sauce -= PURPLE.bribeSauce;
  t.bribed = true;
  completeIfDone(s);
  return null;
}

/** Per tick: expire old purple stars, draw the first list at level 6, pay out a finished list. */
export function updateTodo(s: GameState) {
  if (s.purple && s.now >= s.purple.until) {
    s.purple = undefined;
    s.events.push({ t: 'purple', stars: 0, gained: false });
  }
  if (s.level < PURPLE.level) return;
  if (!s.todo) s.todo = drawTodo(s, 0);
  completeIfDone(s);
}

/**
 * Offline catch-up only simulates up to TUNING.offlineCapSec; the purple timer is real time, so the
 * rest of the absence still counts down here (and can drop the stars).
 */
export function agePurple(s: GameState, extraSec: number) {
  if (!s.purple || extraSec <= 0) return;
  s.purple.until -= extraSec;
  if (s.now >= s.purple.until) s.purple = undefined;
}
