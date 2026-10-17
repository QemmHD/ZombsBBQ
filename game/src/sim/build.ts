/**
 * Shop, decorating and expansions (v3). Every action validates first and returns an error string
 * (shown to the player as-is) or null on success. Like the original: every item fills one tile, walls
 * and floors are painted one segment / tile at a time, the layout must leave clear paths to every
 * stove, counter, sink, table and chair (or staff freeze), and outdoor items live on the front lawn.
 */
import { TUNING } from './data';
import { DIR2, DIR4, DIR_STEP, EXPANSIONS, FLOOR_BY_ID, ITEM_BY_ID, STOVE_TIERS, WALL_BY_ID, type Dir, type ItemDef } from './catalog';
import { DOOR_X, isInside, key, onLawn, reachable, type Pt } from './grid';
import { addFurniture, type Furniture, type GameState } from './state';
import { addXp, furnById, itemOf, releaseJob, room } from './sim';

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

function bought(s: GameState, def: ItemDef) {
  s.stats.purchases++;
  if (def.kind === 'decor' || def.kind === 'wall') s.stats.decor = (s.stats.decor ?? 0) + 1;
  addXp(s, def.xp);
}

export function ownedCount(s: GameState, itemId: string): number {
  return s.furniture.filter((f) => f.item === itemId).length + s.wallItems.filter((w) => w.item === itemId).length + (s.storage[itemId] ?? 0);
}

/** Can the player buy this right now (ignoring where it goes)? */
export function buyCheck(s: GameState, itemId: string): string | null {
  const def = ITEM_BY_ID[itemId];
  if (!def) return 'Unknown item.';
  if (def.starter) return 'Only comes with the old café. Buy the nicer version!';
  if (def.level > s.level) return `Unlocks at level ${def.level}.`;
  if (def.max && ownedCount(s, itemId) >= def.max) return `You can only have ${def.max}.`;
  return afford(s, def);
}

/** The facings an item can take. */
export function dirsFor(def: ItemDef): Dir[] {
  return def.facing === 'four' ? DIR4 : def.facing === 'two' ? DIR2 : [];
}

// ---------- floor placement ----------

/**
 * Validates putting `itemId` at (x, y). `movingId` is the furniture being moved (its old tile counts
 * as free). Keeps the café workable: the door clear, and everything reachable.
 */
export function canPlace(s: GameState, itemId: string, x: number, y: number, dir?: Dir, movingId?: string): string | null {
  const def = ITEM_BY_ID[itemId];
  if (!def) return 'Unknown item.';
  if (def.kind === 'wall') return 'That goes on a wall.';
  const r = room(s);
  if (def.outdoor) {
    if (!onLawn(x, y, r)) return 'This one goes outside, on the front lawn.';
  } else {
    if (!isInside(x, y, r)) return 'Keep it inside the café.';
    if (x === DOOR_X && y === 0) return 'Don’t block the door!';
  }
  const occupant = s.furniture.find((f) => f.x === x && f.y === y && f.id !== movingId);
  if (occupant) return 'Something is already there.';
  const dirs = dirsFor(def);
  if (dirs.length && dir && !dirs.includes(dir)) return 'Turn it to face a way that works.';
  if (dirs.length && !dir) dir = dirs[0];
  if (def.outdoor) return null;
  const sim = s.furniture.filter((f) => f.id !== movingId).map((f) => ({ ...f }));
  sim.push({ id: movingId ?? '__new', item: itemId, x, y, dir });
  return layoutProblem(s, sim);
}

/** Returns a problem with this furniture layout, or null if everything is reachable. */
export function layoutProblem(s: GameState, furniture: Furniture[]): string | null {
  const r = room(s);
  const inside = furniture.filter((f) => !ITEM_BY_ID[f.item].outdoor);
  const blocked = new Set(inside.map((f) => key(f.x, f.y)));
  const reach = reachable({ x: DOOR_X, y: 0 }, blocked, r);
  const free = (p: Pt) => isInside(p.x, p.y, r) && reach.has(key(p.x, p.y));
  const nextToReach = (f: Pt) =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => free({ x: f.x + dx, y: f.y + dy }));
  for (const f of inside) {
    const d = ITEM_BY_ID[f.item];
    if (d.kind === 'stove') {
      // the cook stands right in front of the stove
      const st = DIR_STEP[f.dir ?? 'sw'];
      if (!free({ x: f.x + st.x, y: f.y + st.y })) return `The cook needs room in front of the ${d.name}.`;
    }
    if ((d.kind === 'counter' || d.kind === 'sink' || d.kind === 'fridge') && !nextToReach(f)) return `That would wall off the ${d.name}.`;
    if (d.kind === 'chair' && !nextToReach(f)) return 'That would trap a chair. Customers need a way in!';
    if (d.kind === 'table') {
      const hasChair = inside.some((c) => ITEM_BY_ID[c.item].kind === 'chair' && c.dir && c.x + DIR_STEP[c.dir].x === f.x && c.y + DIR_STEP[c.dir].y === f.y);
      if (hasChair && !nextToReach(f)) return 'Servers can’t reach that table!';
    }
  }
  return null;
}

export function buyAndPlace(s: GameState, itemId: string, x: number, y: number, dir?: Dir): string | null {
  const def = ITEM_BY_ID[itemId];
  const err = buyCheck(s, itemId) ?? canPlace(s, itemId, x, y, dir);
  if (err) return err;
  pay(s, def);
  addFurniture(s, itemId, x, y, dir ?? dirsFor(def)[0]);
  bought(s, def);
  if (def.withChair) placeSetChair(s, def.withChair, x, y);
  return null;
}

/** A table set's chair goes on the first free side, facing the table (or into storage if none fits). */
function placeSetChair(s: GameState, chair: string, x: number, y: number) {
  for (const d of DIR4) {
    const cx = x - DIR_STEP[d].x;
    const cy = y - DIR_STEP[d].y;
    if (!canPlace(s, chair, cx, cy, d)) {
      addFurniture(s, chair, cx, cy, d);
      return;
    }
  }
  s.storage[chair] = (s.storage[chair] ?? 0) + 1;
}

/** Cost of the next stove upgrade tier, or null at the top tier. */
export function stoveTierCost(s: GameState, stoveId: string): number | null {
  const st = s.stoves.find((x) => x.id === stoveId);
  const f = st && furnById(s, st.furnitureId);
  return f ? (STOVE_TIERS[f.tier ?? 0] ?? null) : null;
}

/** Buy the next upgrade tier for a stove (any station). */
export function upgradeStove(s: GameState, stoveId: string): string | null {
  const st = s.stoves.find((x) => x.id === stoveId);
  const f = st && furnById(s, st.furnitureId);
  if (!f) return 'Nope.';
  const cost = STOVE_TIERS[f.tier ?? 0];
  if (cost === undefined) return 'Fully upgraded!';
  if (s.cash < cost) return 'Not enough cash!';
  s.cash -= cost;
  f.tier = (f.tier ?? 0) + 1;
  s.stats.purchases++;
  return null;
}

export function placeFromStorage(s: GameState, itemId: string, x: number, y: number, dir?: Dir): string | null {
  if (!s.storage[itemId]) return 'None in storage.';
  const err = canPlace(s, itemId, x, y, dir);
  if (err) return err;
  if (--s.storage[itemId] <= 0) delete s.storage[itemId];
  addFurniture(s, itemId, x, y, dir ?? dirsFor(ITEM_BY_ID[itemId])[0]);
  return null;
}

function busyReason(s: GameState, f: Furniture): string | null {
  const def = itemOf(f);
  if (def.kind === 'stove') {
    const st = s.stoves.find((x) => x.furnitureId === f.id);
    if (st && st.status !== 'empty') return 'Finish (or clear) what’s cooking first.';
  }
  if (def.kind === 'chair' && s.customers.some((c) => c.seatId === f.id)) return 'Someone’s sitting there!';
  if (def.kind === 'table' && s.customers.some((c) => c.tableId === f.id)) return 'A customer is eating there!';
  if (def.kind === 'table' && s.workers.some((w) => w.job?.kind === 'plate' && w.job.tableId === f.id)) return 'Someone’s clearing that table.';
  if (def.kind === 'counter' && s.workers.some((w) => w.job?.kind === 'serve' && s.counter.find((c) => c.id === (w.job as { slotId: string }).slotId)?.furnitureId === f.id))
    return 'A zombie is grabbing food from it.';
  return null;
}

/** Move a counter's food to another counter before it goes away (dishes stack, nothing is lost). */
function rehomeCounterFood(s: GameState, f: Furniture) {
  const other = s.furniture.find((o) => o.id !== f.id && itemOf(o).kind === 'counter');
  if (!other) return;
  for (const slot of s.counter) if (slot.furnitureId === f.id) slot.furnitureId = other.id;
}

export function moveFurniture(s: GameState, id: string, x: number, y: number, dir?: Dir): string | null {
  const f = furnById(s, id);
  if (!f) return 'Nope.';
  const busy = busyReason(s, f);
  if (busy) return busy;
  const err = canPlace(s, f.item, x, y, dir ?? f.dir, id);
  if (err) return err;
  // anyone heading to this piece needs a fresh plan
  for (const w of s.workers) if (w.path.length && (w.state === 'toCounter' || w.state === 'toPlate' || w.state === 'carryPlate' || w.state === 'carryDish')) releaseJob(s, w);
  f.x = x;
  f.y = y;
  if (dir) f.dir = dir;
  return null;
}

export function rotateFurniture(s: GameState, id: string): string | null {
  const f = furnById(s, id);
  if (!f) return 'Nope.';
  const d = itemOf(f);
  const dirs = dirsFor(d);
  if (dirs.length < 2) return 'This one only goes one way.';
  const busy = busyReason(s, f);
  if (busy) return busy;
  const next = dirs[(dirs.indexOf(f.dir ?? dirs[0]) + 1) % dirs.length];
  const err = canPlace(s, f.item, f.x, f.y, next, f.id);
  if (err) return err;
  f.dir = next;
  return null;
}

function removable(s: GameState, f: Furniture): string | null {
  const d = itemOf(f);
  if (d.kind === 'stove' && s.furniture.filter((o) => itemOf(o).kind === 'stove').length <= 1) return 'You need at least one stove!';
  if (d.kind === 'counter' && s.furniture.filter((o) => itemOf(o).kind === 'counter').length <= 1) return 'You need at least one counter!';
  return busyReason(s, f);
}

function removeFurniture(s: GameState, f: Furniture) {
  if (itemOf(f).kind === 'counter') rehomeCounterFood(s, f);
  s.furniture = s.furniture.filter((o) => o.id !== f.id);
  s.stoves = s.stoves.filter((x) => x.furnitureId !== f.id);
  s.counter = s.counter.filter((x) => x.furnitureId !== f.id);
  if (itemOf(f).kind === 'pethouse') s.pets = s.pets.filter((p) => p.homeId !== f.id);
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
  // the junk the café came with fetches $25, like the original
  if (d.starter) return { cash: 25, sauce: 0 };
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

export const wallLength = (s: GameState, wall: 'l' | 'r') => (wall === 'l' ? s.roomH : s.roomW);

export function wallSlotFree(s: GameState, wall: 'l' | 'r', index: number, movingId?: string): string | null {
  if (index < 0 || index >= wallLength(s, wall)) return 'Off the wall!';
  if (wall === 'r' && index === DOOR_X) return 'That’s the door.';
  if (s.wallItems.some((w) => w.wall === wall && w.index === index && w.id !== movingId)) return 'Something is already hanging there.';
  return null;
}

export function buyWall(s: GameState, itemId: string, wall: 'l' | 'r', index: number): string | null {
  const d = ITEM_BY_ID[itemId];
  if (!d || d.kind !== 'wall') return 'That doesn’t go on a wall.';
  const err = buyCheck(s, itemId) ?? wallSlotFree(s, wall, index);
  if (err) return err;
  pay(s, d);
  s.wallItems.push({ id: `wl${s.nextId++}`, item: itemId, wall, index });
  bought(s, d);
  return null;
}

export function placeWallFromStorage(s: GameState, itemId: string, wall: 'l' | 'r', index: number): string | null {
  if (!s.storage[itemId]) return 'None in storage.';
  const err = wallSlotFree(s, wall, index);
  if (err) return err;
  if (--s.storage[itemId] <= 0) delete s.storage[itemId];
  s.wallItems.push({ id: `wl${s.nextId++}`, item: itemId, wall, index });
  return null;
}

export function moveWall(s: GameState, id: string, wall: 'l' | 'r', index: number): string | null {
  const w = s.wallItems.find((x) => x.id === id);
  if (!w) return 'Nope.';
  const err = wallSlotFree(s, wall, index, id);
  if (err) return err;
  w.wall = wall;
  w.index = index;
  return null;
}

export function storeWall(s: GameState, id: string): string | null {
  const w = s.wallItems.find((x) => x.id === id);
  if (!w) return 'Nope.';
  s.wallItems = s.wallItems.filter((x) => x.id !== id);
  s.storage[w.item] = (s.storage[w.item] ?? 0) + 1;
  return null;
}

export function sellWall(s: GameState, id: string): string | null {
  const w = s.wallItems.find((x) => x.id === id);
  if (!w) return 'Nope.';
  s.wallItems = s.wallItems.filter((x) => x.id !== id);
  const v = sellValue(ITEM_BY_ID[w.item]);
  s.cash += v.cash;
  s.sauce += v.sauce;
  return null;
}

// ---------- walls and floors, one segment / tile at a time ----------

export function paintWall(s: GameState, wall: 'l' | 'r', index: number, finishId: string): string | null {
  const fin = WALL_BY_ID[finishId];
  if (!fin || !fin.cash) return 'Unknown wall.';
  if (index < 0 || index >= wallLength(s, wall)) return 'Off the wall!';
  if (fin.level > s.level) return `Unlocks at level ${fin.level}.`;
  if (s.walls[wall][index] === finishId) return 'It already looks like that.';
  if (s.cash < fin.cash) return 'Not enough cash!';
  s.cash -= fin.cash;
  s.walls[wall][index] = finishId;
  s.stats.purchases++;
  return null;
}

export function paintFloor(s: GameState, x: number, y: number, finishId: string): string | null {
  const fin = FLOOR_BY_ID[finishId];
  if (!fin || !fin.cash) return 'Unknown floor.';
  if (!isInside(x, y, room(s))) return 'Inside the café only.';
  if (fin.level > s.level) return `Unlocks at level ${fin.level}.`;
  const cur = s.floors[key(x, y)] ?? 'dirty';
  if (cur === finishId) return 'It already looks like that.';
  if (s.cash < fin.cash) return 'Not enough cash!';
  s.cash -= fin.cash;
  if (cur === 'stain' || cur === 'loose') s.stats.floorsFixed++;
  s.floors[key(x, y)] = finishId;
  s.stats.purchases++;
  return null;
}

/** Paint every wall segment / floor tile that isn't already this finish (as far as the money goes). */
export function paintAll(s: GameState, what: 'walls' | 'floors', finishId: string): { done: number; err: string | null } {
  let done = 0;
  let err: string | null = null;
  if (what === 'walls') {
    for (const side of ['l', 'r'] as const)
      for (let i = 0; i < wallLength(s, side); i++) {
        if (s.walls[side][i] === finishId) continue;
        err = paintWall(s, side, i, finishId);
        if (err) return { done, err };
        done++;
      }
  } else {
    for (let y = 0; y < s.roomH; y++)
      for (let x = 0; x < s.roomW; x++) {
        if ((s.floors[key(x, y)] ?? 'dirty') === finishId) continue;
        err = paintFloor(s, x, y, finishId);
        if (err) return { done, err };
        done++;
      }
  }
  return { done, err };
}

/** Grime left on the floor (stains + loose tiles). */
export function grimeCount(s: GameState): number {
  return Object.values(s.floors).filter((f) => f === 'stain' || f === 'loose').length;
}

// ---------- expansions and upgrades ----------

export function nextExpansion(s: GameState) {
  return EXPANSIONS.find((e) => e.w > s.roomW || e.h > s.roomH);
}

export function expand(s: GameState): string | null {
  const e = nextExpansion(s);
  if (!e) return 'The café is as big as it gets!';
  if (e.level > s.level) return `Next expansion unlocks at level ${e.level}.`;
  const err = afford(s, e);
  if (err) return err;
  pay(s, e);
  // new wall segments match the most common finish you've already got
  const common = (arr: string[]) => {
    const n: Record<string, number> = {};
    for (const a of arr) n[a] = (n[a] ?? 0) + 1;
    return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'plaster';
  };
  const fin = common([...s.walls.l, ...s.walls.r]);
  while (s.walls.r.length < e.w) s.walls.r.push(fin);
  while (s.walls.l.length < e.h) s.walls.l.push(fin);
  s.roomW = e.w;
  s.roomH = e.h;
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
