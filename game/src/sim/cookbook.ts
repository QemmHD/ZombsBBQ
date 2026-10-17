/**
 * The cookbook as a collection: chef ranks for recipes known (with XP bonuses), mastering Very variants,
 * and the Magic Fridge's free dish of the day. Pure rules, deterministic apart from the calendar day
 * (passed in, defaulting to the device's local date like the raid tombstones).
 */
import { DISHES, DISH_BY_ID, VERY_MASTERY, veryOf } from './data';
import type { GameState } from './state';
import { addXp, dishAvailable, itemOf, rand } from './sim';
import { today } from './progress';

// ---------- chef ranks (recipe-collection milestones) ----------

export interface ChefRank {
  /** recipes known to earn it */
  at: number;
  title: string;
  /** one-off XP bonus when it is reached */
  xp: number;
}

/** Ten ranks, one every 5 recipes known. Rank 0 (fewer than 5) is the Microwave Corpse. */
export const CHEF_RANKS: ChefRank[] = [
  { at: 5, title: 'Fry Cook Fodder', xp: 20 },
  { at: 10, title: 'Grease Trap Apprentice', xp: 50 },
  { at: 15, title: 'Line Cook of the Dead', xp: 100 },
  { at: 20, title: 'Sous-Chef Shambler', xp: 200 },
  { at: 25, title: 'Grill Sergeant', xp: 400 },
  { at: 30, title: 'Saucier of Sorrows', xp: 800 },
  { at: 35, title: 'Pit Boss Poltergeist', xp: 1500 },
  { at: 40, title: 'Head Chef Necromancer', xp: 3000 },
  { at: 45, title: 'Brisket Lich', xp: 5000 },
  { at: 50, title: 'Grand Gourmand of Gore', xp: 8000 },
];
export const ROOKIE_TITLE = 'Microwave Corpse';

/** Every recipe the player can cook: plain dishes unlocked by level or studied, plus learned variants. */
export function knownRecipes(s: GameState): string[] {
  const plain = DISHES.filter((d) => dishAvailable(s, d.id)).map((d) => d.id);
  return [...plain, ...s.recipes.filter((id) => DISH_BY_ID[id]?.variant)];
}

/** Rank number (0..10) for a recipe count. */
export function rankFor(known: number): number {
  let r = 0;
  for (const c of CHEF_RANKS) if (known >= c.at) r++;
  return r;
}

export function chefRank(s: GameState): { rank: number; title: string; known: number; next: ChefRank | null } {
  const known = knownRecipes(s).length;
  const rank = rankFor(known);
  return { rank, title: rank ? CHEF_RANKS[rank - 1].title : ROOKIE_TITLE, known, next: CHEF_RANKS[rank] ?? null };
}

let rankSig = '';
/** Pay the XP bonus for every newly reached chef rank (once each, saved in s.chefRank). */
export function updateChefRank(s: GameState) {
  // known recipes = level dishes + s.recipes, so this signature decides the outcome (cache the no-ops)
  const sig = `${s.level}|${s.recipes.length}|${s.chefRank ?? 0}`;
  if (sig === rankSig) return;
  const { rank } = chefRank(s);
  const had = s.chefRank ?? 0;
  if (rank <= had) {
    rankSig = sig;
    return;
  }
  s.chefRank = rank;
  let xp = 0;
  for (let r = had; r < rank; r++) xp += CHEF_RANKS[r].xp;
  s.events.push({ t: 'toast', text: `Chef rank up: ${CHEF_RANKS[rank - 1].title}! +${xp} XP` });
  addXp(s, xp);
}

// ---------- Very variants: master the plain variant ----------

/** After a dish finishes: cooking a learned Spicy/Fancy/Quick dish VERY_MASTERY times teaches its Very tier. */
export function masterVariant(s: GameState, dishId: string) {
  const very = veryOf(dishId);
  if (!very || !s.recipes.includes(dishId) || s.recipes.includes(very)) return;
  if ((s.stats.cooked[dishId] ?? 0) < VERY_MASTERY) return;
  s.recipes.push(very);
  s.events.push({ t: 'toast', text: `Mastered! You can now cook ${DISH_BY_ID[very].name}.` });
}

// ---------- free food (the Magic Fridge, Frequent Fryer meals) ----------

export const FRIDGE_MAX = 12;

/** A random plain dish the player knows goes in the Fridge (half a batch, like stolen food). */
export function freeMeal(s: GameState): string | null {
  if (s.fridge.length >= FRIDGE_MAX) return null;
  const known = DISHES.filter((d) => dishAvailable(s, d.id));
  if (!known.length) return null;
  const d = known[Math.floor(rand(s) * known.length)];
  s.fridge.push({ dish: d.id, servings: Math.max(6, Math.round(d.servings / 2)) });
  return d.id;
}

/** A rare recipe you don't have yet (a secret, a variant or a Very tier of something you know), to study in the Fridge. */
export function freeRareRecipe(s: GameState): string | null {
  if (s.fridge.length >= FRIDGE_MAX) return null;
  const known = new Set(DISHES.filter((d) => dishAvailable(s, d.id)).map((d) => d.id));
  const pool = Object.values(DISH_BY_ID)
    .filter((d) => d.source === 'raid' && !s.recipes.includes(d.id) && (!d.base || known.has(d.base)))
    .map((d) => d.id);
  if (!pool.length) return null;
  const id = pool[Math.floor(rand(s) * pool.length)];
  s.fridge.push({ dish: id, servings: Math.max(6, Math.round(DISH_BY_ID[id].servings / 2)) });
  return id;
}

/** The Magic Fridge: once per calendar day, a free dish you know lands in the Fridge. */
export function updateMagicFridge(s: GameState, day = today()) {
  if (s.magicDay === day || !s.furniture.some((f) => itemOf(f).dailyDish)) return;
  s.magicDay = day;
  const got = freeMeal(s);
  s.events.push({ t: 'toast', text: got ? `The Magic Fridge conjured ${DISH_BY_ID[got].name}! Check the Fridge.` : 'The Magic Fridge hums sadly: the Fridge is full.' });
}

/** Per-tick upkeep (called from the progress update). */
export function updateCookbook(s: GameState) {
  updateChefRank(s);
  updateMagicFridge(s);
}
