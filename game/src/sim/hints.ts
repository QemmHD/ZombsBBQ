/**
 * Onboarding that lives in the save: Gus's one-shot hints, the guided first table-and-chair purchase,
 * and what the HUD's bouncing "!" badges point at.
 *
 * The original had a tutorial arrow plus a table of contextual tips (out of food, about to burn, an
 * attack, a daydreamer, no seat, a free crew slot, an idle stove, buy another stove, you can expand, the
 * map intro, time to open). Each tip shows once, ever. Here the HUD feeds sim events in (hintEvent),
 * ticks the timers (hintTick), asks which hint is due (nextHint) and marks it shown (showHint). Hints wait
 * for the tutorial and the guided purchase to finish, never come closer than HINT_GAP seconds apart, and
 * the HUD passes `blocked` while a menu is open. Event hints that can't be shown within HINT_STALE seconds
 * are dropped unseen, so they come back the next time it happens.
 */
import { DISHES, VARIANT_DISHES } from './data';
import { ITEMS, type ItemDef } from './catalog';
import { nextExpansion } from './build';
import { MAP_LEVEL, bossHere, stealingRivals } from './rivals';
import { maxEnergy, type Furniture, type GameEvent, type GameState } from './state';
import { TUTORIAL, atWork, chairTable, dishAvailable, itemOf, validSeats, zombies } from './sim';

export type HintId = 'outOfFood' | 'burnSoon' | 'firstBite' | 'daydream' | 'noSeat' | 'crewSlot' | 'idleStove' | 'buyStove' | 'expand' | 'map' | 'closed' | 'lowEnergy';

export interface HintState {
  /** one-shot hints already shown */
  seen: HintId[];
  /** sim time the last hint went up */
  lastAt?: number;
  /** event-triggered hints waiting for a quiet moment */
  pending: { id: HintId; at: number }[];
  /** when the sign was flipped to CLOSED (for "time to open") */
  closedAt?: number;
  /** since when a stove has been sitting empty (for "idle stove") */
  idleAt?: number;
  /** the guided first purchase: 0 = buy a table, 1 = a chair facing it, 2 = done */
  guide?: number;
  /** HUD badges: what the player had seen when they last opened each menu */
  seenShop?: number;
  seenBook?: number;
  seenPedia?: number;
  seenCrew?: number;
}

/** Seconds between two hints, at least. */
export const HINT_GAP = 20;
/** Event hints that can't be shown within this many seconds are dropped (unseen). */
export const HINT_STALE = 30;
/** Closed this long before Gus nags you to open up. */
export const CLOSED_NAG = 45;
/** A stove sitting empty this long (while open) before the idle-stove hint. */
export const IDLE_NAG = 30;
/** The low-energy hint fires when a working zombie drops under this much of its energy. */
export const LOW_ENERGY = 0.6;

/** Gus's lines. He's dead, he's tired, he's still the best chef you've got. */
export const HINTS: Record<HintId, string> = {
  outOfFood: 'The counter’s bare, Boss. Customers can’t eat promises. Get something on a stove.',
  burnSoon: 'Smell that? Food’s about to turn into briquettes. Tap the stove and get it to the counter.',
  firstBite: 'So that was a customer. WAS. Tired zombies get bitey. Rest them before the bar goes red.',
  daydream: 'One of ours is staring at a wall thinking about brains. Tap ’em to snap ’em out of it.',
  noSeat: 'Somebody walked in, saw no free seat and walked right out. More tables, more money.',
  crewSlot: 'There’s a free spot on the crew. Tap a customer and INFECT. The union dues are very reasonable.',
  idleStove: 'A cold stove makes no money. Tap a cook, then the stove, and get something sizzling.',
  buyStove: 'One stove? That’s a hot plate with ambitions. SHOP → Kitchen has another. Two cooks, twice the grub.',
  expand: 'You can afford more elbow room. SHOP → Special → Expand. Bigger joint, more seats, more snacks.',
  map: 'The raid map’s open. Chuck’s Chow Hall is down the road with a full counter and a weak door. Tap RAID.',
  closed: 'We’re CLOSED, Boss. The rating sags while the sign’s flipped. Tap the sign when you’re ready.',
  lowEnergy: 'Somebody’s running on fumes. Under 60% energy, think about a REST before they get peckish.',
};

const EVENT_HINT: Partial<Record<GameEvent['t'], HintId>> = { outOfFood: 'outOfFood', burnSoon: 'burnSoon', bite: 'firstBite', daydream: 'daydream' };

/** State-driven hints, most urgent first. */
const STATE_ORDER: HintId[] = ['noSeat', 'closed', 'lowEnergy', 'crewSlot', 'idleStove', 'buyStove', 'expand', 'map'];

export const tutorialDone = (s: GameState) => s.tut >= TUTORIAL.length;

/** Recipes the cookbook shows as cookable (level dishes, stolen recipes, learned variants). */
export function recipeCount(s: GameState): number {
  return DISHES.filter((d) => dishAvailable(s, d.id)).length + VARIANT_DISHES.filter((v) => s.recipes.includes(v.id)).length;
}

/** Zombiepedia progress: one point for meeting a type, another for infecting one. */
export function pediaCount(s: GameState): number {
  return Object.values(s.seen).reduce((a, v) => a + (v === 'infected' ? 2 : 1), 0);
}

/** The save's hint record, created on first use (badges start from what the player has now). */
export function hintState(s: GameState): HintState {
  if (!s.hints) s.hints = { seen: [], pending: [], seenShop: s.level, seenBook: recipeCount(s), seenPedia: pediaCount(s), seenCrew: s.crewCap };
  return s.hints;
}

/** Feed a sim event in: some of them queue a one-shot hint. */
export function hintEvent(s: GameState, e: GameEvent) {
  const id = EVENT_HINT[e.t];
  if (!id || !tutorialDone(s)) return;
  const h = hintState(s);
  if (h.seen.includes(id) || h.pending.some((p) => p.id === id)) return;
  h.pending.push({ id, at: s.now });
}

/** Per HUD refresh: the timers some hints wait on, and the guided purchase. */
export function hintTick(s: GameState) {
  const h = hintState(s);
  if (s.closed) h.closedAt ??= s.now;
  else h.closedAt = undefined;
  if (!s.closed && s.stoves.some((st) => st.status === 'empty')) h.idleAt ??= s.now;
  else h.idleAt = undefined;
  updateGuide(s);
}

const cheapest = (s: GameState, kind: ItemDef['kind']) =>
  ITEMS.filter((i) => i.kind === kind && !i.starter && !i.sauce && i.level <= s.level).sort((a, b) => (a.cash ?? 0) - (b.cash ?? 0))[0] as ItemDef | undefined;

/** Is this state-driven hint's situation happening right now? */
export function hintApplies(s: GameState, id: HintId): boolean {
  const h = hintState(s);
  switch (id) {
    case 'noSeat':
      return s.customers.some((c) => c.state === 'turnedAway');
    case 'closed':
      return !!s.closed && h.closedAt !== undefined && s.now - h.closedAt >= CLOSED_NAG;
    case 'lowEnergy':
      return zombies(s).some((w) => atWork(w) && w.state !== 'resting' && w.state !== 'toRest' && w.energy < maxEnergy(w) * LOW_ENERGY);
    case 'crewSlot':
      return s.level >= 2 && zombies(s).length < s.crewCap && s.customers.some((c) => c.state === 'waiting' || c.state === 'eating');
    case 'idleStove':
      return h.idleAt !== undefined && s.now - h.idleAt >= IDLE_NAG;
    case 'buyStove': {
      const stove = cheapest(s, 'stove');
      return s.level >= 2 && s.stoves.length === 1 && !!stove && s.cash >= (stove.cash ?? 0);
    }
    case 'expand': {
      const e = nextExpansion(s);
      return !!e && e.level <= s.level && s.cash >= (e.cash ?? 0) && s.sauce >= (e.sauce ?? 0);
    }
    case 'map':
      return s.level >= MAP_LEVEL && s.stats.raidsWon === 0;
    default:
      return false;
  }
}

/**
 * Which hint to show now, if any. `blocked` is the HUD saying "not now" (a menu is open, decorating,
 * raiding). Nothing shows during the tutorial or the guided purchase, or within HINT_GAP of the last one.
 */
export function nextHint(s: GameState, blocked = false): HintId | null {
  const h = hintState(s);
  h.pending = h.pending.filter((p) => s.now - p.at <= HINT_STALE && !h.seen.includes(p.id));
  if (blocked || !tutorialDone(s) || guideActive(s)) return null;
  if (h.lastAt !== undefined && s.now - h.lastAt < HINT_GAP) return null;
  if (h.pending.length) return h.pending[0].id;
  return STATE_ORDER.find((id) => !h.seen.includes(id) && hintApplies(s, id)) ?? null;
}

/** Mark a hint shown: it never comes back, and the next one waits HINT_GAP. */
export function showHint(s: GameState, id: HintId) {
  const h = hintState(s);
  if (!h.seen.includes(id)) h.seen.push(id);
  h.pending = h.pending.filter((p) => p.id !== id);
  h.lastAt = s.now;
}

// ---------- the guided first purchase: a table, then a chair facing it ----------

export type GuideStep = 'table' | 'chair';

/** The cheapest table and chair the player can buy (what the guide points at). */
export function guideItems(s: GameState): { table?: ItemDef; chair?: ItemDef } {
  return { table: cheapest(s, 'table'), chair: cheapest(s, 'chair') };
}

/** Tables nobody can sit at yet (no chair facing them). */
function lonelyTables(s: GameState): Furniture[] {
  const seated = new Set(s.furniture.map((f) => chairTable(s, f)?.id).filter(Boolean));
  return s.furniture.filter((f) => itemOf(f).kind === 'table' && !seated.has(f.id));
}

function updateGuide(s: GameState) {
  const h = hintState(s);
  if (h.guide === undefined) {
    if (!tutorialDone(s)) return;
    // only joints still on the two starter seats get walked through it
    h.guide = validSeats(s).length > 2 ? 2 : 0;
  }
  if (h.guide >= 2) return;
  if (validSeats(s).length > 2) h.guide = 2;
  else if (h.guide === 0 && lonelyTables(s).length) h.guide = 1;
}

/** The guided purchase's current step, or null when it's done (or not affordable yet). */
export function guideStep(s: GameState): GuideStep | null {
  const h = s.hints;
  if (!h || h.guide === undefined || h.guide >= 2 || !tutorialDone(s)) return null;
  const { table, chair } = guideItems(s);
  if (!table || !chair) return null;
  const need = (h.guide === 0 ? (table.cash ?? 0) : 0) + (chair.cash ?? 0);
  // Gus waits until you can actually pay for it
  if (s.cash < need) return null;
  return h.guide === 0 ? 'table' : 'chair';
}

export const guideActive = (s: GameState) => guideStep(s) !== null;

export const GUIDE_TEXT: Record<GuideStep, string> = {
  table: 'Two seats is a waiting room, not a joint. Tap SHOP, then Furniture, and buy a table. Leave room for a chair.',
  chair: 'A table with no chair is just a shelf. Buy a chair, turn it to face the table, then tap ✓.',
};

// ---------- HUD "new" badges ----------

export interface Badges {
  shop: boolean;
  book: boolean;
  crew: boolean;
  pedia: boolean;
  map: boolean;
}

/** Which HUD buttons get a bouncing "!" right now. */
export function badges(s: GameState): Badges {
  const h = hintState(s);
  const shopLv = h.seenShop ?? s.level;
  return {
    shop: ITEMS.some((i) => !i.starter && i.level <= s.level && i.level > shopLv),
    book: recipeCount(s) > (h.seenBook ?? 0),
    crew: tutorialDone(s) && zombies(s).length < s.crewCap && s.crewCap > (h.seenCrew ?? 0),
    pedia: pediaCount(s) > (h.seenPedia ?? 0),
    map: s.level >= MAP_LEVEL && (bossHere(s) || stealingRivals(s).length > 0),
  };
}

/** Opening a menu clears its badge. */
export function markSeen(s: GameState, what: 'shop' | 'book' | 'pedia' | 'crew') {
  const h = hintState(s);
  if (what === 'shop') h.seenShop = s.level;
  if (what === 'book') h.seenBook = recipeCount(s);
  if (what === 'pedia') h.seenPedia = pediaCount(s);
  if (what === 'crew') h.seenCrew = s.crewCap;
}

// ---------- the awning ----------

export const NAME_MAX = 22;

/** Rename the joint (tap the awning). Returns an error string, or null. */
export function renameJoint(s: GameState, raw: string): string | null {
  const name = raw.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  if (!name) return 'A joint needs a name. Even a bad one.';
  s.name = name;
  return null;
}

/** What the awning says. */
export const jointName = (s: GameState) => s.name || 'YOUR JOINT';
