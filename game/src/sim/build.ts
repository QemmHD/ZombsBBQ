/**
 * Shop, decorating and expansions. Every action validates first and returns an error string
 * (shown to the player as-is) or null on success.
 */
import { TUNING } from './data';
import { DIR_ORDER, DIR_STEP, EXPANSIONS, ITEM_BY_ID, THEME_BY_ID, type Dir, type ItemDef, type ThemeId } from './catalog';
import { DOOR_X, isInside, key, reachable, type Pt } from './grid';
import { addFurniture, type Furniture, type GameState } from './state';
import { furnById, itemOf, releaseJob } from './sim';

const KEEP_WARM_COST = 300;

export function priceText(def: { cash?: number; sauce?: number }): string {
  if (def.sauce) return `🧪${def.sauce}`;
  return `$${(def.cash ?? 0).toLocaleString('en-US')}`;
}

function afford(s: GameState, def: { cash?: number; sauce?: number }): string | null {
  if ((def.cash ?? 0) > s.cash) return 'Not enough cash!';
  if ((def.sauce ?? 0) > s.sauce) return 'Not enough Brain Sauce!';
  return null;
}

function pay(s: GameState, def: { cash?: number; sauce?: number }) {
  s.cash -= def.cash ?? 0;
  s.sauce -= def.sauce ?? 0;
}

export function ownedCount(s: GameState, itemId: string): number {
  return s.furniture.filter((f) => f.item === itemId).length + s.walls.filter((w) => w.item === itemId).length + (s.storage[itemId] ?? 0);
}

/** Can the player buy this right now (ignoring where it goes)? */
export function buyCheck(s: GameState, itemId: string): string | null {
  const def = ITEM_BY_ID[itemId];
  if (!def) return 'Unknown item.';
  if (def.level > s.level) return `Unlocks at level ${def.level}.`;
  if (def.max && ownedCount(s, itemId) >= def.max) return `You can only have ${def.max}.`;
  return afford(s, def);
}

// ---------- floor placement ----------

/**
 * Validates putting `itemId` at (x, y). `movingId` is the furniture being moved (its old tile counts
 * as free). Keeps the joint workable: the door clear, and every stove, counter and seat reachable.
 */
export function canPlace(s: GameState, itemId: string, x: number, y: number, dir?: Dir, movingId?: string): string | null {
  const def = ITEM_BY_ID[itemId];
  if (!def || def.kind === 'wall') return 'That goes on a wall.';
  if (!isInside(x, y, s.roomN)) return 'Keep it inside the joint.';
  if (x === DOOR_X && y === 0) return 'Don’t block the door!';
  const occupant = s.furniture.find((f) => f.x === x && f.y === y && f.id !== movingId);
  if (occupant) return 'Something is already there.';
  if (def.kind === 'seat' && (!dir || !def.dirs?.includes(dir))) return 'That way doesn’t work for this seat.';
  const sim = s.furniture.filter((f) => f.id !== movingId).map((f) => ({ ...f }));
  sim.push({ id: movingId ?? '__new', item: itemId, x, y, dir });
  return layoutProblem(s, sim);
}

/** Returns a problem with this furniture layout, or null if everything is reachable. */
export function layoutProblem(s: GameState, furniture: Furniture[]): string | null {
  const blocked = new Set(furniture.map((f) => key(f.x, f.y)));
  const reach = reachable({ x: DOOR_X, y: 0 }, blocked, s.roomN);
  const nextToReach = (f: Pt) =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => {
      const nx = f.x + dx;
      const ny = f.y + dy;
      return isInside(nx, ny, s.roomN) && reach.has(key(nx, ny));
    });
  for (const f of furniture) {
    const k = ITEM_BY_ID[f.item].kind;
    if ((k === 'stove' || k === 'counter') && !nextToReach(f)) return `That would wall off the ${ITEM_BY_ID[f.item].name}.`;
    if (k === 'seat' && !nextToReach(f)) return 'That would trap a seat. Customers need a way in!';
  }
  // zombies need a way out to the front lawn to nap
  let lawn = false;
  for (let i = 0; i < s.roomN && !lawn; i++) lawn = reach.has(key(s.roomN, i)) || reach.has(key(i, s.roomN));
  if (!lawn) return 'Leave a path to the front lawn so zombies can nap.';
  return null;
}

export function buyAndPlace(s: GameState, itemId: string, x: number, y: number, dir?: Dir): string | null {
  const err = buyCheck(s, itemId) ?? canPlace(s, itemId, x, y, dir);
  if (err) return err;
  pay(s, ITEM_BY_ID[itemId]);
  addFurniture(s, itemId, x, y, dir);
  s.stats.purchases++;
  return null;
}

export function placeFromStorage(s: GameState, itemId: string, x: number, y: number, dir?: Dir): string | null {
  if (!s.storage[itemId]) return 'None in storage.';
  const err = canPlace(s, itemId, x, y, dir);
  if (err) return err;
  if (--s.storage[itemId] <= 0) delete s.storage[itemId];
  addFurniture(s, itemId, x, y, dir);
  return null;
}

function busyReason(s: GameState, f: Furniture): string | null {
  const def = itemOf(f);
  if (def.kind === 'stove') {
    const st = s.stoves.find((x) => x.furnitureId === f.id);
    if (st && st.status !== 'empty') return 'Finish (or clear) what’s cooking first.';
  }
  if (def.kind === 'seat' && s.customers.some((c) => c.seatId === f.id)) return 'Someone’s sitting there!';
  if (def.kind === 'table') {
    const seatIds = s.furniture.filter((o) => o.dir && o.x + DIR_STEP[o.dir].x === f.x && o.y + DIR_STEP[o.dir].y === f.y).map((o) => o.id);
    if (s.customers.some((c) => c.seatId && seatIds.includes(c.seatId))) return 'Customers are eating there!';
  }
  if (def.kind === 'counter') {
    const slot = s.counter.find((c) => c.furnitureId === f.id);
    if (slot && slot.servings > 0) return 'Serve that food first.';
    if (s.workers.some((w) => w.job?.slotId === slot?.id)) return 'A zombie is grabbing food from it.';
  }
  return null;
}

export function moveFurniture(s: GameState, id: string, x: number, y: number, dir?: Dir): string | null {
  const f = furnById(s, id);
  if (!f) return 'Nope.';
  const busy = itemOf(f).kind === 'counter' ? null : busyReason(s, f);
  if (busy) return busy;
  const err = canPlace(s, f.item, x, y, dir ?? f.dir, id);
  if (err) return err;
  // anyone heading to this piece needs a fresh plan
  for (const w of s.workers) if (w.job && s.counter.find((c) => c.id === w.job!.slotId)?.furnitureId === id) releaseJob(s, w);
  f.x = x;
  f.y = y;
  if (dir) f.dir = dir;
  return null;
}

export function rotateFurniture(s: GameState, id: string): string | null {
  const f = furnById(s, id);
  if (!f) return 'Nope.';
  const d = itemOf(f);
  if (d.kind !== 'seat' || !d.dirs || d.dirs.length < 2) return 'This one only goes one way.';
  const busy = busyReason(s, f);
  if (busy) return busy;
  const order = DIR_ORDER.filter((x) => d.dirs!.includes(x));
  f.dir = order[(order.indexOf(f.dir ?? order[0]) + 1) % order.length];
  return null;
}

function removable(s: GameState, f: Furniture): string | null {
  const d = itemOf(f);
  if (d.kind === 'fridge') return 'The Fridge stays. It knows too much.';
  if (d.kind === 'stove' && s.furniture.filter((o) => itemOf(o).kind === 'stove').length <= 1) return 'You need at least one stove!';
  if (d.kind === 'counter' && s.furniture.filter((o) => itemOf(o).kind === 'counter').length <= 1) return 'You need at least one counter!';
  return busyReason(s, f);
}

function removeFurniture(s: GameState, f: Furniture) {
  s.furniture = s.furniture.filter((o) => o.id !== f.id);
  s.stoves = s.stoves.filter((x) => x.furnitureId !== f.id);
  s.counter = s.counter.filter((x) => x.furnitureId !== f.id);
  for (const c of s.customers) if (c.seatId === f.id) c.seatId = undefined;
}

export function storeFurniture(s: GameState, id: string): string | null {
  const f = furnById(s, id);
  if (!f) return 'Nope.';
  const err = removable(s, f);
  if (err) return err;
  removeFurniture(s, f);
  s.storage[f.item] = (s.storage[f.item] ?? 0) + 1;
  return null;
}

export function sellValue(d: ItemDef): { cash: number; sauce: number } {
  return { cash: Math.floor((d.cash ?? 0) * TUNING.sellBack), sauce: Math.floor((d.sauce ?? 0) * TUNING.sellBack) };
}

export function sellFurniture(s: GameState, id: string): string | null {
  const f = furnById(s, id);
  if (!f) return 'Nope.';
  const err = removable(s, f);
  if (err) return err;
  removeFurniture(s, f);
  const v = sellValue(itemOf(f));
  s.cash += v.cash;
  s.sauce += v.sauce;
  return null;
}

export function sellFromStorage(s: GameState, itemId: string): string | null {
  if (!s.storage[itemId]) return 'None in storage.';
  if (--s.storage[itemId] <= 0) delete s.storage[itemId];
  const v = sellValue(ITEM_BY_ID[itemId]);
  s.cash += v.cash;
  s.sauce += v.sauce;
  return null;
}

// ---------- wall hangings ----------

export function wallSlotFree(s: GameState, wall: 'l' | 'r', index: number, movingId?: string): string | null {
  if (index < 0 || index >= s.roomN) return 'Off the wall!';
  if (wall === 'r' && index === DOOR_X) return 'That’s the door.';
  if (s.walls.some((w) => w.wall === wall && w.index === index && w.id !== movingId)) return 'Something is already hanging there.';
  return null;
}

export function buyWall(s: GameState, itemId: string, wall: 'l' | 'r', index: number): string | null {
  const d = ITEM_BY_ID[itemId];
  if (!d || d.kind !== 'wall') return 'That doesn’t go on a wall.';
  const err = buyCheck(s, itemId) ?? wallSlotFree(s, wall, index);
  if (err) return err;
  pay(s, d);
  s.walls.push({ id: `wl${s.nextId++}`, item: itemId, wall, index });
  s.stats.purchases++;
  return null;
}

export function placeWallFromStorage(s: GameState, itemId: string, wall: 'l' | 'r', index: number): string | null {
  if (!s.storage[itemId]) return 'None in storage.';
  const err = wallSlotFree(s, wall, index);
  if (err) return err;
  if (--s.storage[itemId] <= 0) delete s.storage[itemId];
  s.walls.push({ id: `wl${s.nextId++}`, item: itemId, wall, index });
  return null;
}

export function moveWall(s: GameState, id: string, wall: 'l' | 'r', index: number): string | null {
  const w = s.walls.find((x) => x.id === id);
  if (!w) return 'Nope.';
  const err = wallSlotFree(s, wall, index, id);
  if (err) return err;
  w.wall = wall;
  w.index = index;
  return null;
}

export function storeWall(s: GameState, id: string): string | null {
  const w = s.walls.find((x) => x.id === id);
  if (!w) return 'Nope.';
  s.walls = s.walls.filter((x) => x.id !== id);
  s.storage[w.item] = (s.storage[w.item] ?? 0) + 1;
  return null;
}

export function sellWall(s: GameState, id: string): string | null {
  const w = s.walls.find((x) => x.id === id);
  if (!w) return 'Nope.';
  s.walls = s.walls.filter((x) => x.id !== id);
  const v = sellValue(ITEM_BY_ID[w.item]);
  s.cash += v.cash;
  s.sauce += v.sauce;
  return null;
}

// ---------- expansions, themes, upgrades ----------

export function nextExpansion(s: GameState) {
  return EXPANSIONS.find((e) => e.size > s.roomN);
}

export function expand(s: GameState): string | null {
  const e = nextExpansion(s);
  if (!e) return 'The joint is as big as it gets!';
  if (e.level > s.level) return `Next expansion unlocks at level ${e.level}.`;
  const err = afford(s, e);
  if (err) return err;
  pay(s, e);
  s.roomN = e.size;
  return null;
}

export function buyTheme(s: GameState, themeId: ThemeId): string | null {
  const t = THEME_BY_ID[themeId];
  if (!t) return 'Unknown theme.';
  if (s.ownedThemes.includes(themeId)) {
    s.theme = themeId;
    return null;
  }
  if (t.level > s.level) return `Unlocks at level ${t.level}.`;
  const err = afford(s, t);
  if (err) return err;
  pay(s, t);
  s.ownedThemes.push(themeId);
  s.theme = themeId;
  s.stats.purchases++;
  return null;
}

export function keepWarmCost(): number {
  return KEEP_WARM_COST;
}

export function buyKeepWarm(s: GameState, stoveId: string): string | null {
  const st = s.stoves.find((x) => x.id === stoveId);
  const f = st && furnById(s, st.furnitureId);
  if (!f) return 'Nope.';
  if (f.keepWarm) return 'Already has a heat lamp.';
  if (s.level < 3) return 'Unlocks at level 3.';
  if (s.cash < KEEP_WARM_COST) return 'Not enough cash!';
  s.cash -= KEEP_WARM_COST;
  f.keepWarm = true;
  return null;
}
