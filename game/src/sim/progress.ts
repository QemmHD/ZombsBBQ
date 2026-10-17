import { DISH_BY_ID, TUNING } from './data';
import { GOALS, type GoalDef } from './catalog';
import { DOOR_X, isInside, key } from './grid';
import { grimeCount } from './build';
import type { GameState, Pet } from './state';
import { addToCounter, addXp, blockedTiles, chairTable, furnById, itemOf, move, rand, room, setPath, stars, zombies } from './sim';
import { updateTodo } from './todo';

// ---------- goals (the clipboard) ----------

export function goalComplete(s: GameState, id: string): boolean {
  const z = zombies(s).length;
  const st = stars(s);
  const wins = s.stats.raidsWon;
  switch (id) {
    case 'cook1':
      return Object.keys(s.stats.cooked).length > 0;
    case 'serve10':
      return s.stats.served >= 10;
    case 'infect1':
      return s.stats.infected >= 1;
    case 'clean5':
      return s.stats.cleared >= 5;
    case 'seats3':
      return new Set(s.furniture.map((f) => chairTable(s, f)?.id).filter(Boolean)).size >= 3;
    case 'floor1':
      return s.stats.floorsFixed >= 1;
    case 'wall1':
      return s.wallItems.length >= 2;
    case 'level3':
      return s.level >= 3;
    case 'zombies2':
      return z >= 2;
    case 'grill':
      return s.furniture.some((f) => f.item === 'grill');
    case 'raid1':
      return wins >= 1;
    case 'study1':
      return s.stats.studied >= 1;
    case 'stars2':
      return st >= 2;
    case 'cleanfloor':
      return grimeCount(s) === 0;
    case 'expand1':
      return s.roomW > 7;
    case 'smoker':
      return (s.stats.cooked.pork ?? 0) > 0;
    case 'zombies4':
      return z >= 4;
    case 'money1':
      return s.furniture.some((f) => itemOf(f).kind === 'moneymaker');
    case 'raid3':
      return wins >= 3;
    case 'pet1':
      return s.pets.length > 0;
    case 'stars3':
      return st >= 3;
    case 'rare1':
      return s.stats.infectedRare >= 1;
    case 'fryer':
      return (s.stats.cooked.rings ?? 0) > 0;
    case 'zombies7':
      return z >= 7;
    case 'stars4':
      return st >= 4;
    case 'raid10':
      return wins >= 10;
    case 'stars5':
      return st >= 5;
  }
  return false;
}

/** The next three unclaimed goals, in order. */
export function activeGoals(s: GameState): (GoalDef & { done: boolean })[] {
  return GOALS.filter((g) => !s.goalsDone.includes(g.id))
    .slice(0, 3)
    .map((g) => ({ ...g, done: goalComplete(s, g.id) }));
}

export function claimGoal(s: GameState, id: string): string | null {
  const g = GOALS.find((x) => x.id === id);
  if (!g || s.goalsDone.includes(id)) return 'Already claimed.';
  if (!activeGoals(s).some((x) => x.id === id)) return 'Finish the earlier goals first.';
  if (!goalComplete(s, id)) return 'Not done yet!';
  s.goalsDone.push(id);
  s.cash += g.reward.cash ?? 0;
  s.sauce += g.reward.sauce ?? 0;
  if (g.reward.xp) addXp(s, g.reward.xp);
  return null;
}

// ---------- the fridge ----------

/** The fridge only holds so much: past this, new loot pushes out the oldest dish. */
export const fridgeFull = (s: GameState) => s.fridge.length >= TUNING.fridgeMax;

/** Throw a fridge dish out (to make room for raid loot). */
export function binFridge(s: GameState, index: number): string | null {
  if (!s.fridge[index]) return 'Nothing there.';
  s.fridge.splice(index, 1);
  return null;
}

export function serveFromFridge(s: GameState, index: number): string | null {
  const it = s.fridge[index];
  if (!it) return 'Nothing there.';
  const err = addToCounter(s, it.dish, it.servings);
  if (err) return err;
  s.fridge.splice(index, 1);
  return null;
}

/** Can this fridge item be studied (a secret recipe or a rare variant you don't know yet)? */
export function canStudy(s: GameState, dish: string): boolean {
  const d = DISH_BY_ID[dish];
  return !!d && d.source === 'raid' && !s.recipes.includes(d.id);
}

/**
 * Studying a stolen dish teaches you its recipe (and uses it up), like the original's fridge. The
 * same goes for rare variants (the original's UNLOCK button): once learned, the variant shows up in
 * the dish picker and cookbook as its own entry.
 */
export function studyFromFridge(s: GameState, index: number): string | null {
  const it = s.fridge[index];
  if (!it) return 'Nothing there.';
  const d = DISH_BY_ID[it.dish];
  if (!d) return 'Nothing there.';
  if (d.source !== 'raid') return 'You already know how to make this one. Serve it instead!';
  if (s.recipes.includes(d.id)) return 'Already in your cookbook. Serve it instead!';
  s.recipes.push(d.id);
  s.stats.studied++;
  s.fridge.splice(index, 1);
  return null;
}

// ---------- money-makers ($ per hour up to a cap; tap to empty, like the original) ----------

/** '$' once there's at least a dollar to collect, '!' when it's full and has stopped earning. */
export function payoutState(s: GameState, furnitureId: string): 'none' | 'cash' | 'full' {
  const f = furnById(s, furnitureId);
  const p = f && itemOf(f).payout;
  if (!f || !p) return 'none';
  const bank = f.bank ?? 0;
  if (bank >= p.max) return 'full';
  return bank >= 1 ? 'cash' : 'none';
}

export function payoutReady(s: GameState, furnitureId: string): boolean {
  return payoutState(s, furnitureId) !== 'none';
}

export function collectPayout(s: GameState, furnitureId: string): number {
  const f = furnById(s, furnitureId);
  if (!f || !itemOf(f).payout) return 0;
  const amount = Math.floor(f.bank ?? 0);
  if (amount < 1) return 0;
  f.bank = (f.bank ?? 0) - amount;
  s.cash += amount;
  s.stats.earned += amount;
  s.events.push({ t: 'payout', furnitureId, amount });
  return amount;
}

// ---------- pets ----------

function syncPets(s: GameState) {
  for (const f of s.furniture) {
    const def = itemOf(f);
    if (def.kind !== 'pethouse' || !def.pet) continue;
    if (s.pets.some((p) => p.homeId === f.id)) continue;
    // pets hang around inside the café, wandering in from their house on the lawn
    s.pets.push({ id: `p${s.nextId++}`, type: def.pet, homeId: f.id, x: DOOR_X, y: 1, path: [], speed: 0, facing: 1, nextAction: s.now + 5, state: 'roam' });
  }
  s.pets = s.pets.filter((p) => s.furniture.some((f) => f.id === p.homeId));
}

function updatePet(s: GameState, p: Pet, dt: number) {
  if (p.state === 'raiding') return;
  move(p, dt);
  if (s.now < p.nextAction || p.path.length) return;
  if (p.state === 'sniff') {
    // the Zombie Pug sniffs out loose change, like a furry metal detector: a few dollars every few
    // minutes, nothing while the café is shut, and only so much in a day
    p.state = 'roam';
    p.nextAction = s.now + 2;
    p.nextFind = s.now + TUNING.pugFindSec * (0.75 + rand(s) * 0.5);
    const day = Math.floor(s.now / 86400);
    if (!s.pugDay || s.pugDay.day !== day) s.pugDay = { day, cash: 0 };
    const amount = Math.min(TUNING.pugDailyMax - s.pugDay.cash, TUNING.pugFindMin + Math.floor(rand(s) * (TUNING.pugFindMax - TUNING.pugFindMin + 1)));
    if (s.closed || amount <= 0) return;
    s.pugDay.cash += amount;
    s.cash += amount;
    s.stats.earned += amount;
    s.events.push({ t: 'petFind', petId: p.id, amount });
    return;
  }
  const blocked = blockedTiles(s);
  const r = room(s);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rand(s) * r.w);
    const y = Math.floor(rand(s) * r.h);
    if (blocked.has(key(x, y)) || !isInside(x, y, r)) continue;
    setPath(s, p, { x, y }, p.type === 'pug' ? 1.6 : 2.4);
    break;
  }
  p.nextFind ??= s.now + TUNING.pugFindSec * (0.5 + rand(s) * 0.5);
  if (p.type === 'pug' && s.now >= p.nextFind && !s.closed) {
    p.state = 'sniff';
    p.nextAction = s.now + 3;
  } else p.nextAction = s.now + 4 + rand(s) * 6;
}

export function updateProgress(s: GameState, dt: number) {
  updateTodo(s);
  syncPets(s);
  for (const p of s.pets) updatePet(s, p, dt);
}

