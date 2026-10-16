import {
  CUSTOMERS,
  CUSTOMER_BY_ID,
  DISHES,
  DISH_BY_ID,
  LEVEL_CAP,
  TUNING,
  VARIANT_DISHES,
  attackThreshold,
  crewCapForLevel,
  firstName,
  perk,
  rechargeMult,
  type DishDef,
  spawnWeight,
  walkSpeed,
  xpToNext,
  zombieLevel,
} from './data';
import { DIR_STEP, FLOOR_BY_ID, ITEM_BY_ID, WALL_BY_ID, type ItemDef } from './catalog';
import { DOOR_X, findPath, isInside, key, reachable, restSpots, streetEnds, walkable, type Pt, type Room } from './grid';
import { makeWorker, maxEnergy, type Customer, type Furniture, type GameState, type Mover, type Stove, type Worker, type WorkerState } from './state';
import { updateProgress } from './progress';
import { stealingRivals } from './rivals';

// ---------- helpers ----------

/** How fast a crew member walks: their Speed stat, and zombies shuffle a bit slower than YOU. */
export function workerSpeed(w: Worker): number {
  return walkSpeed(w.stats.speed) * (w.kind === 'zombie' ? TUNING.zombieWalkMult : 1);
}

export function rand(s: GameState): number {
  // mulberry32, state kept in the save so runs are reproducible
  let t = (s.rng = (s.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const room = (s: GameState): Room => ({ w: s.roomW, h: s.roomH });
export const itemOf = (f: Furniture): ItemDef => ITEM_BY_ID[f.item];
export const furnById = (s: GameState, id: string) => s.furniture.find((f) => f.id === id);
export const furnAt = (s: GameState, x: number, y: number) => s.furniture.find((f) => f.x === x && f.y === y);
export const zombies = (s: GameState) => s.workers.filter((w) => w.kind === 'zombie');
export const atWork = (w: Worker) => w.state !== 'raiding' && w.state !== 'down';

export function blockedTiles(s: GameState): Set<string> {
  const b = new Set<string>();
  for (const f of s.furniture) b.add(key(f.x, f.y));
  return b;
}

const N4: Pt[] = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

/** Floor tiles the crew can actually walk to (from the door); cached per layout. */
let reachCache: { sig: string; set: Set<string> } | null = null;
function reachableFloor(s: GameState, blocked: Set<string>): Set<string> {
  const sig = `${s.roomW}x${s.roomH}|${[...blocked].join(';')}`;
  if (reachCache?.sig !== sig) reachCache = { sig, set: reachable({ x: DOOR_X, y: 0 }, blocked, room(s)) };
  return reachCache.set;
}

/** The tile a worker stands on to use an item: its front if it can be reached, else any reachable
 * neighbour (never a boxed-in pocket the crew can't get to). */
export function useTile(s: GameState, f: Furniture, blocked = blockedTiles(s)): Pt | null {
  const reach = reachableFloor(s, blocked);
  const st = f.dir ? DIR_STEP[f.dir] : { x: 0, y: 1 };
  const cands = [{ x: f.x + st.x, y: f.y + st.y }, ...N4.map((d) => ({ x: f.x + d.x, y: f.y + d.y }))];
  const r = room(s);
  for (const c of cands) if (isInside(c.x, c.y, r) && reach.has(key(c.x, c.y))) return c;
  return null;
}

/** The table a chair faces, if there is one right in front of it. */
export function chairTable(s: GameState, chair: Furniture): Furniture | undefined {
  if (itemOf(chair).kind !== 'chair' || !chair.dir) return undefined;
  const st = DIR_STEP[chair.dir];
  const t = furnAt(s, chair.x + st.x, chair.y + st.y);
  return t && itemOf(t).kind === 'table' ? t : undefined;
}

/** Chairs that face a table: the seats customers can use. */
export function validSeats(s: GameState): Furniture[] {
  return s.furniture.filter((f) => chairTable(s, f));
}

/** A free floor tile next to a table, where a server stands (not the chair). */
export function tableAccess(s: GameState, table: Furniture, blocked = blockedTiles(s)): Pt | null {
  const reach = reachableFloor(s, blocked);
  for (const d of N4) {
    const c = { x: table.x + d.x, y: table.y + d.y };
    if (isInside(c.x, c.y, room(s)) && reach.has(key(c.x, c.y))) return c;
  }
  return null;
}

export function setPath(s: GameState, m: Mover, goal: Pt, speed: number): boolean {
  const p = findPath({ x: m.x, y: m.y }, goal, blockedTiles(s), room(s));
  if (!p) return false;
  m.path = p;
  m.speed = speed;
  return true;
}

/** Advance along the path; returns true when the path is finished. */
export function move(m: Mover, dt: number): boolean {
  let budget = m.speed * dt;
  while (m.path.length && budget > 0) {
    const t = m.path[0];
    const dx = t.x - m.x;
    const dy = t.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.001) {
      const sdx = dx - dy; // screen-space horizontal direction in iso
      if (Math.abs(sdx) > 0.01) m.facing = sdx > 0 ? 1 : -1;
      m.back = dx + dy < -0.01; // moving up the screen = walking away from the camera
    }
    if (d <= budget) {
      m.x = t.x;
      m.y = t.y;
      budget -= d;
      m.path.shift();
    } else {
      m.x += (dx / d) * budget;
      m.y += (dy / d) * budget;
      budget = 0;
    }
  }
  return m.path.length === 0;
}

export function faceTowards(m: Mover, x: number, y: number) {
  const sdx = x - m.x - (y - m.y);
  if (Math.abs(sdx) > 0.01) m.facing = sdx > 0 ? 1 : -1;
  m.back = x - m.x + (y - m.y) < -0.01;
}

/** Tell the player (once in a while, not every frame) that someone can't find a way somewhere. */
function cantReach(s: GameState, w: Worker, what: string) {
  if (s.now - (w.cantReachAt ?? -Infinity) < 8) return;
  w.cantReachAt = s.now;
  s.events.push({ t: 'cantReach', workerId: w.id, what });
}

/** Walk a worker somewhere; if there's no way through, say so (see cantReach) and return false. */
function goTo(s: GameState, w: Worker, goal: Pt, speed: number, what: string): boolean {
  if (setPath(s, w, goal, speed)) return true;
  cantReach(s, w, what);
  return false;
}

// ---------- energy: hangry, hungry, asleep ----------

/** Low enough on energy that their patience runs out (they'll go for a customer). */
export function isHangry(w: Worker): boolean {
  return w.kind === 'zombie' && w.energy <= maxEnergy(w) * attackThreshold(w.stats.patience);
}

/** Not still digesting their last snack (one bite a minute at most). */
export const canBite = (s: GameState, w: Worker) => s.now >= (w.nextBiteAt ?? -Infinity);

/** Seconds until a zombie may bite again. */
export const biteCooldownLeft = (s: GameState, w: Worker) => Math.max(0, (w.nextBiteAt ?? 0) - s.now);

/** The nearest seated customer a zombie could get to (for a snack). */
function nearestPrey(s: GameState, w: Worker): Customer | undefined {
  return s.customers
    .filter((c) => c.state === 'waiting' || c.state === 'eating')
    .sort((a, b) => Math.abs(a.x - w.x) + Math.abs(a.y - w.y) - (Math.abs(b.x - w.x) + Math.abs(b.y - w.y)))[0];
}

/** The hangry warning: drop everything (a cook's dish pauses), slump and moan, then go for a customer. */
function goHungry(s: GameState, w: Worker) {
  releaseJob(s, w);
  w.state = 'hungry';
  w.hungryEnd = s.now + TUNING.hungrySec;
  s.events.push({ t: 'hungry', workerId: w.id });
}

/** Set off after a customer (the hangry lunge, or the player's Eat! order). */
function huntCustomer(s: GameState, w: Worker, prey: Customer): boolean {
  const table = prey.tableId ? furnById(s, prey.tableId) : undefined;
  const at = table ? tableAccess(s, table) : null;
  w.targetId = prey.id;
  w.state = 'hunting';
  w.hungryEnd = undefined;
  if (goTo(s, w, at ?? { x: Math.round(prey.x), y: Math.round(prey.y) }, workerSpeed(w) * 1.3, 'that customer')) return true;
  w.state = 'idle';
  w.targetId = undefined;
  w.path = [];
  return false;
}

/** Worked down to nothing: they pass out face-down right where they are (whatever they held is put back). */
function fallAsleep(s: GameState, w: Worker) {
  releaseJob(s, w);
  w.state = 'asleep';
  w.energy = 0;
  s.events.push({ t: 'asleep', workerId: w.id });
}

/** States where a zombie burns energy on a job (and so can run dry and pass out). */
const WORKING: ReadonlySet<WorkerState> = new Set<WorkerState>(['toStove', 'cooking', 'toPickup', 'carryDish', 'toCounter', 'carrying', 'toPlate', 'carryPlate']);

// ---------- rating ----------

/** Star-item bonus (the original's RatingBonus): placed items, wall hangings, finishes; grime counts against. */
export function ratingBonus(s: GameState): number {
  let b = 0;
  for (const f of s.furniture) b += itemOf(f).rating;
  for (const w of s.wallItems) b += ITEM_BY_ID[w.item]?.rating ?? 0;
  for (const side of ['l', 'r'] as const) for (const w of s.walls[side]) b += WALL_BY_ID[w]?.rating ?? 0;
  for (const f of Object.values(s.floors)) b += FLOOR_BY_ID[f]?.rating ?? 0;
  return Math.round(b * 1000) / 1000;
}

/** How much faster the rating rises (and slower it falls) thanks to star items. */
export function ratingMult(s: GameState): number {
  return Math.max(0.3, Math.min(4, 1 + TUNING.ratingDecorK * ratingBonus(s)));
}

/** Stars in half steps, 0..5. */
export function stars(s: GameState): number {
  return Math.max(0, Math.min(5, Math.floor(s.rating * 10 + 1e-9) / 2));
}

/** Purple bonus stars still running (0..3); they all drop when the timer runs out. */
export function purpleStars(s: GameState): number {
  return s.purple && s.now < s.purple.until ? s.purple.stars : 0;
}

/** Stars as customers see them: normal stars plus half a star per purple star (who shows up, how rare). */
export function customerStars(s: GameState): number {
  return stars(s) + TUNING.purpleStarValue * purpleStars(s);
}

/** Seconds between customer arrivals: 18 s at zero stars down to 4.5 s at five, faster with purple stars. */
export function arrivalGap(s: GameState): number {
  const gap = TUNING.arrivalSlowSec - (TUNING.arrivalSlowSec - TUNING.arrivalFastSec) * s.rating;
  return gap / (1 + TUNING.purpleArrivalBoost * purpleStars(s));
}

/** Feed one customer verdict (1 = happy, 0 = unhappy) into the popularity rating. */
export function addRating(s: GameState, outcome: 0 | 1, weight = 1) {
  const m = ratingMult(s);
  const rate = Math.min(1, TUNING.ratingRate * (outcome > s.rating ? m : 1 / m));
  // a weight of 3 is three verdicts in a row; fractional weights count for part of one
  s.rating += (outcome - s.rating) * (1 - Math.pow(1 - rate, weight));
  s.rating = Math.max(0, Math.min(1, s.rating));
}

export function addXp(s: GameState, amount: number) {
  if (s.level >= LEVEL_CAP || amount <= 0) return;
  s.xp += amount;
  while (s.level < LEVEL_CAP && s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    s.crewCap = Math.max(s.crewCap, crewCapForLevel(s.level));
    s.events.push({ t: 'levelup', level: s.level });
  }
  if (s.level >= LEVEL_CAP) s.xp = 0;
}

/** Zombie XP from serving and raiding; a level-up refills energy (original). */
export function addZombieXp(s: GameState, w: Worker, amount: number) {
  if (w.kind !== 'zombie') return;
  const before = zombieLevel(w.xp);
  w.xp += amount;
  const after = zombieLevel(w.xp);
  if (after > before) {
    w.energy = maxEnergy(w);
    s.events.push({ t: 'zombieLevel', workerId: w.id, level: after });
  }
}

export function dishAvailable(s: GameState, dishId: string): boolean {
  const d = DISH_BY_ID[dishId];
  if (!d) return false;
  return d.source === 'raid' ? s.recipes.includes(dishId) : d.level <= s.level;
}

/** A dish followed by the rare variants of it the player has learned (for menus and pickers). */
export function withLearnedVariants(s: GameState, list: DishDef[] = DISHES): DishDef[] {
  return list.flatMap((d) => [d, ...VARIANT_DISHES.filter((v) => v.base === d.id && s.recipes.includes(v.id))]);
}

/** Which dishes a stove can cook: its own cookbook (every stove can do the house menu). */
export function stoveCooks(st: Stove, dishStation: string): boolean {
  return dishStation === 'stove' || dishStation === st.kind;
}

const stoveFurn = (s: GameState, st: Stove) => furnById(s, st.furnitureId)!;
const stoveSpeed = (s: GameState, st: Stove) => itemOf(stoveFurn(s, st)).speed ?? 1;

// ---------- player actions (validate and return an error string or null) ----------

export function startCooking(s: GameState, workerId: string, stoveId: string, dishId?: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!w || !st) return 'Nope.';
  if (!atWork(w)) return `${w.name} is ${w.state === 'down' ? 'still reanimating' : 'out on a raid'}.`;
  if (w.state === 'cooking' && w.stoveId === stoveId) return null;
  if (w.state === 'asleep') return `${w.name} passed out. Tap them to wake them up, or refill with Brain Sauce.`;
  if (w.state === 'hungry' || w.state === 'hunting' || w.state === 'feasting') return `${w.name} is HANGRY! Rest them or refill with Brain Sauce first.`;
  if (w.kind === 'zombie' && w.energy <= 0) return `${w.name} is running on empty. Let them nap or refill with Brain Sauce.`;
  if (w.kind === 'zombie' && w.state === 'resting' && w.energy < maxEnergy(w) * 0.3) return `${w.name} is too tired. Let them nap or refill with Brain Sauce.`;
  const f = stoveFurn(s, st);
  const at = useTile(s, f);
  if (!at) return 'Nobody can reach that stove!';
  if (!findPath({ x: w.x, y: w.y }, at, blockedTiles(s), room(s))) {
    cantReach(s, w, `the ${st.kind}`);
    return `${w.name} can't get to that ${st.kind}! Move some furniture to clear a path.`;
  }
  if (st.status === 'paused' || (st.status === 'cooking' && !st.cookId)) {
    // resume a paused dish: no extra cost
    releaseJob(s, w);
    st.status = 'reserved';
    st.cookId = w.id;
    w.stoveId = st.id;
    w.pendingDish = undefined;
    w.state = 'toStove';
    setPath(s, w, at, workerSpeed(w));
    return null;
  }
  if (st.status !== 'empty') return 'That stove is busy.';
  const dish = dishId ? DISH_BY_ID[dishId] : undefined;
  if (!dish) return 'Pick a dish.';
  if (!stoveCooks(st, dish.station)) return `${dish.name} needs a ${dish.station}.`;
  if (!dishAvailable(s, dish.id)) return dish.source === 'raid' ? 'Steal this recipe in a raid first!' : `Unlocks at level ${dish.level}.`;
  if (s.cash < dish.cost) return 'Not enough cash!';
  releaseJob(s, w);
  s.cash -= dish.cost;
  st.status = 'reserved';
  st.cookId = w.id;
  st.dish = dish.id;
  // the very first dish of a new café cooks quickly so the tutorial keeps moving
  const firstOne = !Object.keys(s.stats.cooked).length && !s.stoves.some((x) => x !== st && x.dish);
  st.total = (firstOne ? 15 : dish.cookSec) / stoveSpeed(s, st);
  st.left = st.total;
  w.stoveId = st.id;
  w.pendingDish = dish.id;
  w.state = 'toStove';
  if (!setPath(s, w, at, workerSpeed(w))) w.path = [];
  return null;
}

/**
 * Tap a finished dish: someone carries it to a serving counter (the selected worker, or the nearest
 * free one). Tapping burnt food scrapes it off.
 */
export function plateDish(s: GameState, stoveId: string, workerId?: string): string | null {
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!st) return 'Nope.';
  if (st.status === 'burnt') {
    st.status = 'empty';
    st.dish = undefined;
    st.left = st.total = st.burnAt = undefined;
    return null;
  }
  if (st.status !== 'done' || !st.dish) return null;
  if (!s.counter.length) return 'You need a serving counter!';
  if (st.carrierId && s.workers.find((w) => w.id === st.carrierId)?.job?.kind === 'dish') return null; // already on it
  const f = stoveFurn(s, st);
  const at = useTile(s, f);
  if (!at) return 'Nobody can reach that stove!';
  let w = workerId ? s.workers.find((x) => x.id === workerId && atWork(x)) : undefined;
  if (!w) {
    const free = s.workers.filter((x) => atWork(x) && (x.state === 'idle' || x.state === 'daydream'));
    free.sort((a, b) => Math.abs(a.x - f.x) + Math.abs(a.y - f.y) - (Math.abs(b.x - f.x) + Math.abs(b.y - f.y)));
    w = free[0] ?? s.workers.find((x) => x.kind === 'you' && atWork(x));
  }
  if (!w) return 'Nobody is free to carry it!';
  if (!findPath({ x: w.x, y: w.y }, at, blockedTiles(s), room(s))) {
    cantReach(s, w, `the ${st.kind}`);
    return `${w.name} can't get to that ${st.kind}! Move some furniture to clear a path.`;
  }
  // (pulling a cook off their stove pauses that dish)
  releaseJob(s, w);
  w.job = { kind: 'dish', stoveId: st.id };
  w.state = 'toPickup';
  st.carrierId = w.id;
  setPath(s, w, at, workerSpeed(w));
  return null;
}

/** Who'd cook at this stove if nobody was picked: the nearest crew member who's free and has the energy. */
export function freeCook(s: GameState, stoveId: string): Worker | undefined {
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!st) return undefined;
  const f = stoveFurn(s, st);
  const at = useTile(s, f);
  if (!at) return undefined;
  const blocked = blockedTiles(s);
  return s.workers
    .filter((w) => atWork(w) && (w.state === 'idle' || w.state === 'daydream') && !w.job && !(w.kind === 'zombie' && (w.energy <= 0 || isHangry(w))))
    .map((w) => ({ w, d: Math.abs(w.x - at.x) + Math.abs(w.y - at.y) + (w.kind === 'you' ? 0.5 : 0) }))
    .sort((a, b) => a.d - b.d)
    .find(({ w }) => findPath({ x: w.x, y: w.y }, at, blocked, room(s)))?.w;
}

/** Tap an empty stove, pick a dish: the nearest free cook goes (or the one the player picked). */
export function cookAt(s: GameState, stoveId: string, dishId: string, workerId?: string): string | null {
  const w = workerId ? s.workers.find((x) => x.id === workerId) : freeCook(s, stoveId);
  if (!w) return 'Nobody’s free to cook. Wake someone up, or tap a cook first.';
  return startCooking(s, w.id, stoveId, dishId);
}

/** The cookbook's Cook button: the nearest free cook at the nearest empty stove that can make it. */
export function cookAnywhere(s: GameState, dishId: string): string | null {
  const dish = DISH_BY_ID[dishId];
  if (!dish) return 'Pick a dish.';
  if (!dishAvailable(s, dishId)) return dish.source === 'raid' ? 'Steal this recipe in a raid first!' : `Unlocks at level ${dish.level}.`;
  if (s.cash < dish.cost) return 'Not enough cash!';
  const able = s.stoves.filter((st) => stoveCooks(st, dish.station));
  if (!able.length) return `${dish.name} needs a ${dish.station}. Get one in the Shop!`;
  const empty = able.filter((st) => st.status === 'empty');
  if (!empty.length) return `Every ${dish.station === 'stove' ? 'stove' : dish.station} is busy.`;
  let best: { st: Stove; w: Worker; d: number } | null = null;
  for (const st of empty) {
    const w = freeCook(s, st.id);
    const f = stoveFurn(s, st);
    if (!w) continue;
    const d = Math.abs(w.x - f.x) + Math.abs(w.y - f.y);
    if (!best || d < best.d) best = { st, w, d };
  }
  if (!best) return 'Nobody’s free to cook right now.';
  return startCooking(s, best.w.id, best.st.id, dishId);
}

/** The Eat! command: send a zombie to snack on a customer (+energy, but the rest of the room panics). */
export function orderEat(s: GameState, workerId: string, customerId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  const c = s.customers.find((x) => x.id === customerId);
  if (!w || w.kind !== 'zombie') return 'Only zombies eat customers. Mostly.';
  if (!atWork(w)) return `${w.name} is ${w.state === 'down' ? 'still reanimating' : 'out on a raid'}.`;
  if (w.state === 'asleep') return `${w.name} passed out. Wake them up first.`;
  if (w.state === 'feasting') return `${w.name} is still chewing.`;
  if (!canBite(s, w)) return `${w.name} is still digesting. Ready in ${Math.ceil(biteCooldownLeft(s, w))}s.`;
  if (!c || !(c.state === 'waiting' || c.state === 'eating')) return 'Pick a seated customer.';
  releaseJob(s, w);
  if (!huntCustomer(s, w, c)) return `${w.name} can't get to them! Clear a path.`;
  return null;
}

/** Brain Sauce to finish a dish right now: 1 per started 2 minutes still to go. */
export function finishCost(s: GameState, stoveId: string): number {
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!st || !(st.status === 'cooking' || st.status === 'paused')) return 0;
  return Math.max(1, Math.ceil((st.left ?? 0) / 120));
}

export function finishNow(s: GameState, stoveId: string): string | null {
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!st || !(st.status === 'cooking' || st.status === 'paused')) return 'Nothing cooking there.';
  const cost = finishCost(s, stoveId);
  if (s.sauce < cost) return `Needs ${cost} Brain Sauce.`;
  s.sauce -= cost;
  st.left = 0;
  finishStove(s, st);
  return null;
}

/** Scrap a dish mid-cook: half the ingredients money comes back. */
export function cancelCooking(s: GameState, stoveId: string): string | null {
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!st || !(st.status === 'cooking' || st.status === 'paused' || st.status === 'reserved') || !st.dish) return 'Nothing cooking there.';
  s.cash += Math.floor(DISH_BY_ID[st.dish].cost * TUNING.sellBack);
  const cook = s.workers.find((w) => w.id === st.cookId);
  if (cook && (cook.state === 'cooking' || cook.state === 'toStove')) {
    cook.state = 'idle';
    cook.stoveId = undefined;
    cook.pendingDish = undefined;
    cook.path = [];
  }
  st.status = 'empty';
  st.dish = st.cookId = undefined;
  st.left = st.total = st.burnAt = undefined;
  return null;
}

/** Bin whatever is left in a counter slot (stale food, or to make room for a better dish). */
export function discardCounter(s: GameState, slotId: string): string | null {
  const slot = s.counter.find((c) => c.id === slotId);
  if (!slot?.dish || slot.servings <= 0) return 'That spot is already empty.';
  slot.dish = undefined;
  slot.servings = 0;
  return null;
}

/**
 * Flip the door sign. Closing up sends the whole zombie crew out to nap on the sidewalk (original: they
 * line up outside and snooze; any dish on the go pauses), and they stay out until you open again.
 */
export function setClosed(s: GameState, closed: boolean) {
  s.closed = closed;
  for (const w of s.workers) {
    if (w.kind !== 'zombie' || !atWork(w)) continue;
    if (closed && w.state !== 'resting' && w.state !== 'toRest' && w.state !== 'feasting') rest(s, w.id);
    if (!closed && (w.state === 'resting' || w.state === 'toRest') && w.energy >= maxEnergy(w) * 0.3) wake(s, w.id);
  }
}

/** Put servings on a counter: dishes stack, so one counter can hold every dish (original). */
export function addToCounter(s: GameState, dishId: string, servings: number, counterFurnId?: string): string | null {
  const counters = s.furniture.filter((f) => itemOf(f).kind === 'counter');
  if (!counters.length) return 'You need a serving counter!';
  const target = counterFurnId ?? counters[0].id;
  const slot =
    s.counter.find((c) => c.furnitureId === target && c.dish === dishId && c.servings > 0) ??
    s.counter.find((c) => c.dish === dishId && c.servings > 0) ??
    s.counter.find((c) => c.furnitureId === target && (!c.dish || c.servings <= 0));
  if (slot) {
    slot.dish = dishId;
    slot.servings += servings;
  } else s.counter.push({ id: `k${s.nextId++}`, furnitureId: target, dish: dishId, servings });
  return null;
}

export function infectCost(s: GameState, c: Customer): { cash: number; sauce: number } {
  if (s.freeInfects > 0) return { cash: 0, sauce: 0 };
  const def = CUSTOMER_BY_ID[c.type];
  return { cash: def.infect.cash ?? 0, sauce: def.infect.sauce ?? 0 };
}

export function infect(s: GameState, customerId: string): string | null {
  const c = s.customers.find((x) => x.id === customerId);
  if (!c || !['entering', 'waiting', 'eating'].includes(c.state)) return 'Too late, they left!';
  if (zombies(s).length >= s.crewCap) return `Crew is full (${s.crewCap}/${s.crewCap}). Level up for more slots!`;
  const cost = infectCost(s, c);
  if (s.cash < cost.cash) return 'Not enough cash!';
  if (s.sauce < cost.sauce) return 'Not enough Brain Sauce!';
  s.cash -= cost.cash;
  s.sauce -= cost.sauce;
  if (s.freeInfects > 0) s.freeInfects--;
  dropServer(s, c);
  c.state = 'infecting';
  c.path = [];
  c.infectEnd = s.now + 1.6;
  return null;
}

/** A free sidewalk spot outside, nearest the door: where tired (and KO'd) zombies lie down. */
export function outsideSpot(s: GameState, w: Worker): Pt {
  const taken = new Set(s.workers.filter((o) => o.restSpot && o !== w).map((o) => key(o.restSpot!.x, o.restSpot!.y)));
  for (const p of restSpots(room(s))) if (!taken.has(key(p.x, p.y))) return p;
  return { x: DOOR_X + 1, y: -1 };
}

export function rest(s: GameState, workerId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return 'Nope.';
  if (!atWork(w)) return `${w.name} is ${w.state === 'down' ? 'still reanimating' : 'out on a raid'}.`;
  if (w.state === 'resting' || w.state === 'toRest') return null;
  // (a cook's dish pauses, a hangry zombie calms down, a sleeper gets up and shuffles out)
  releaseJob(s, w);
  w.restSpot = outsideSpot(s, w);
  w.state = 'toRest';
  if (!goTo(s, w, w.restSpot, workerSpeed(w), 'the sidewalk')) w.path = [];
  return null;
}

/** Back to work: wakes a napper, a daydreamer or a zombie who passed out (they walk back inside on their own). */
export function wake(s: GameState, workerId: string) {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return;
  if (w.state === 'resting' || w.state === 'toRest' || w.state === 'daydream' || w.state === 'asleep') {
    if (w.state === 'asleep' || w.state === 'resting') s.events.push({ t: 'woke', workerId: w.id, from: w.state });
    w.state = 'idle';
    w.restSpot = undefined;
    w.path = [];
    w.nextDaydream = s.now + daydreamInterval(s, w);
  }
}

/** Let a zombie go to make room for a better one. They lurch off into the sunset. */
export function fireZombie(s: GameState, workerId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return 'Nope.';
  if (w.kind === 'you') return "You can't fire yourself, Boss.";
  if (w.state === 'raiding') return `${w.name} is out on a raid.`;
  releaseJob(s, w);
  s.workers = s.workers.filter((x) => x.id !== workerId);
  // off down the street, out through the door
  const d = { id: w.id, type: w.type, x: w.x, y: w.y, path: [] as Pt[], speed: 0, facing: w.facing, back: w.back };
  if (setPath(s, d, streetEnd(s), workerSpeed(w) * 0.8)) (s.departing ??= []).push(d);
  return null;
}

function updateDeparting(s: GameState, dt: number) {
  if (!s.departing?.length) return;
  for (const d of s.departing) if (move(d, dt)) d.x = GONE;
  s.departing = s.departing.filter((d) => d.x !== GONE);
}

export function refill(s: GameState, workerId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return 'Nope.';
  if (w.state === 'raiding') return `${w.name} is out on a raid.`;
  if (s.sauce < 1) return 'Not enough Brain Sauce!';
  if (w.state !== 'down' && w.energy >= maxEnergy(w) * TUNING.refillBelow) return `${w.name} still has plenty of energy. Brain Sauce works below ${Math.round(TUNING.refillBelow * 100)}%.`;
  s.sauce -= 1;
  w.energy = maxEnergy(w);
  if (w.state === 'down') {
    w.state = 'idle';
    w.downUntil = undefined;
    w.restSpot = undefined;
    s.events.push({ t: 'woke', workerId: w.id, from: 'down' });
  }
  if (w.state === 'hungry') {
    w.state = 'idle';
    w.hungryEnd = undefined;
  }
  if (w.state === 'resting' || w.state === 'toRest' || w.state === 'asleep') wake(s, w.id);
  return null;
}

// ---------- simulation ----------

function daydreamInterval(s: GameState, w: Worker): number {
  return TUNING.daydreamBaseSec * w.stats.focus * (0.5 + rand(s));
}

/** Drop whatever a worker was doing, cleanly: no food lost, no stove left reserved. */
export function releaseJob(s: GameState, w: Worker) {
  const job = w.job;
  if (job?.kind === 'serve') {
    // the serving goes back on the counter it came from
    const slot = s.counter.find((c) => c.id === job.slotId);
    if (slot && (slot.dish === job.dish || !slot.dish || slot.servings <= 0)) {
      slot.dish = job.dish;
      slot.servings += 1;
    } else addToCounter(s, job.dish, 1);
    const c = s.customers.find((x) => x.id === job.customerId);
    if (c && c.serverId === w.id) c.serverId = undefined;
  } else if (job?.kind === 'dish') {
    const st = s.stoves.find((x) => x.id === job.stoveId);
    if (job.dish) addToCounter(s, job.dish, job.servings ?? 0); // already picked up: put it on a counter
    if (st && st.carrierId === w.id) st.carrierId = undefined;
  }
  // plate jobs simply leave the plate on the table (it's still dirty)
  w.job = undefined;
  if ((w.state === 'cooking' || w.state === 'toStove') && w.stoveId) {
    const st = s.stoves.find((x) => x.id === w.stoveId);
    if (st && st.cookId === w.id) {
      if (st.status === 'reserved' && w.pendingDish) {
        // never got there: refund and free the stove
        st.status = 'empty';
        s.cash += DISH_BY_ID[w.pendingDish].cost;
        st.dish = undefined;
        st.left = st.total = undefined;
      } else if (st.status === 'cooking' || st.status === 'reserved') st.status = 'paused';
      st.cookId = undefined;
    }
    w.stoveId = undefined;
    w.pendingDish = undefined;
  }
  w.targetId = undefined;
  w.restSpot = undefined;
  w.hungryEnd = undefined;
  w.path = [];
  w.state = 'idle';
}

/** How fast a customer walks: their own Speed stat (original). */
const customerSpeed = (c: Customer) => walkSpeed(CUSTOMER_BY_ID[c.type]?.stats.speed ?? 4);

function dropServer(s: GameState, c: Customer) {
  if (!c.serverId) return;
  const w = s.workers.find((x) => x.id === c.serverId);
  if (w && w.job?.kind === 'serve' && w.job.customerId === c.id) releaseJob(s, w);
  c.serverId = undefined;
}

function streetEnd(s: GameState): Pt {
  const ends = streetEnds(room(s));
  return ends[Math.floor(rand(s) * ends.length)];
}

function leave(s: GameState, c: Customer, mood: 'happy' | 'angry', fast = false, rate = true, weight = 1) {
  dropServer(s, c);
  // a customer who ate leaves a dirty plate behind
  if (c.tableId && (c.state === 'eating' || mood === 'happy')) {
    const t = furnById(s, c.tableId);
    if (t) t.dirty = true;
  }
  c.mood = mood;
  c.state = fast ? 'fleeing' : 'leaving';
  c.seatId = undefined;
  c.tableId = undefined;
  if (mood === 'happy') {
    if (rate) addRating(s, 1, weight);
    s.stats.happy++;
  } else {
    if (rate) addRating(s, 0, weight);
    s.stats.angry++;
  }
  s.events.push({ t: 'face', x: c.x, y: c.y, happy: mood === 'happy' });
  c.stage = undefined;
  c.holdUntil = undefined;
  setPath(s, c, streetEnd(s), fast ? Math.max(TUNING.fleeSpeed, customerSpeed(c) * 1.67) : customerSpeed(c));
}

/** Tables with a chair facing them that are clean and not taken (one customer per table). */
function freeSeats(s: GameState): { seat: Furniture; table: Furniture }[] {
  const taken = new Set(s.customers.filter((c) => c.tableId).map((c) => c.tableId));
  const out: { seat: Furniture; table: Furniture }[] = [];
  const seen = new Set<string>();
  for (const seat of s.furniture) {
    const table = chairTable(s, seat);
    if (!table || table.dirty || taken.has(table.id) || seen.has(table.id)) continue;
    seen.add(table.id);
    out.push({ seat, table });
  }
  return out;
}

function spawnCustomers(s: GameState, dt: number) {
  if (s.closed) return;
  s.spawnCooldown -= dt;
  if (s.spawnCooldown > 0) return;
  const st = stars(s);
  // purple bonus stars: one more diner at a time each, and they count as half a star for who turns up
  const purple = purpleStars(s);
  const cst = customerStars(s);
  // the original: more stars, more customers (roughly one per half-star, plus one); a few more than
  // the joint can seat still show up and leave grumbling, which is the nudge to buy more tables
  const target = Math.min(1 + Math.round(st * 2) + purple, validSeats(s).length + 1);
  if (!validSeats(s).length) return;
  const present = s.customers.filter((c) => ['entering', 'waiting', 'eating', 'turnedAway'].includes(c.state)).length;
  // rivals you've left alone too long are poaching your customers
  s.spawnCooldown = arrivalGap(s) * (0.75 + rand(s) * 0.5) * (1 + 0.25 * stealingRivals(s).length);
  if (present >= target) return;
  const pool = CUSTOMERS.filter((d) => d.minLevel <= s.level && d.minStars <= cst);
  // gentle anti-streak: recently seen types are less likely, so the crowd stays varied
  const recent = s.recentTypes;
  const w = (id: string, base: number) => base * (recent.includes(id) ? 0.25 : 1);
  let r = rand(s) * pool.reduce((a, d) => a + w(d.id, spawnWeight(d, cst)), 0);
  const def = pool.find((d) => (r -= w(d.id, spawnWeight(d, cst))) < 0) ?? pool[0];
  recent.push(def.id);
  if (recent.length > 2) recent.shift();
  if (!s.seen[def.id]) s.seen[def.id] = 'met';
  const at = streetEnd(s);
  const seats = freeSeats(s).filter(({ seat }) => findPath(at, { x: seat.x, y: seat.y }, blockedTiles(s), room(s)));
  // with every table taken or dirty most passers-by just walk on; now and then one peeks in and grumbles
  if (!seats.length && rand(s) > 0.3) return;
  const n = s.nextId++;
  const c: Customer = {
    id: `c${n}`,
    type: def.id,
    // a first name, seeded from the café's seed stream without drawing from it
    name: firstName(def.id, Math.imul(n ^ s.rng, 0x9e3779b1) ^ (s.rng >>> 13)),
    state: 'entering',
    x: at.x,
    y: at.y,
    path: [],
    speed: 0,
    facing: 1,
    waitLeft: TUNING.customerWaitSec,
    eatEnd: 0,
  };
  s.customers.push(c);
  if (!seats.length) {
    // no clean table: walk in, look around, leave unhappy (like the original)
    c.state = 'turnedAway';
    setPath(s, c, { x: DOOR_X, y: 1 }, customerSpeed(c));
    return;
  }
  const pick = seats[Math.floor(rand(s) * seats.length)];
  c.seatId = pick.seat.id;
  c.tableId = pick.table.id;
  // in through the door first, where they stop for a look round (original: 1 s ± 0.8 s)
  const door = { x: DOOR_X, y: 0 };
  if (!blockedTiles(s).has(key(door.x, door.y)) && setPath(s, c, door, customerSpeed(c))) c.stage = 'door';
  else setPath(s, c, { x: pick.seat.x, y: pick.seat.y }, customerSpeed(c));
}

function updateCustomer(s: GameState, c: Customer, dt: number) {
  switch (c.state) {
    case 'entering': {
      const seat = c.seatId ? furnById(s, c.seatId) : undefined;
      const table = seat ? chairTable(s, seat) : undefined;
      if (!seat || !table || table.id !== c.tableId) {
        // their seat got moved or sold out from under them
        leave(s, c, 'angry');
        break;
      }
      if (c.stage === 'look') {
        if (s.now < (c.doorUntil ?? 0)) break;
        c.stage = undefined;
        c.doorUntil = undefined;
        if (!setPath(s, c, { x: seat.x, y: seat.y }, customerSpeed(c))) {
          leave(s, c, 'angry');
          break;
        }
      }
      if (move(c, dt)) {
        if (c.stage === 'door') {
          // just inside the door: a look round for a table
          c.stage = 'look';
          c.doorUntil = s.now + TUNING.doorPauseSec + (rand(s) * 2 - 1) * TUNING.doorPauseJitter;
          faceTowards(c, seat.x, seat.y);
          break;
        }
        c.state = 'waiting';
        faceTowards(c, table.x, table.y);
      }
      break;
    }
    case 'turnedAway':
      // a peek through the door hurts the rating less than a customer left waiting
      if (move(c, dt)) leave(s, c, 'angry', false, true, 0.35);
      break;
    case 'waiting':
      if (!c.serverId) c.waitLeft -= dt;
      if (c.waitLeft <= 0) leave(s, c, 'angry');
      break;
    case 'eating':
      if (s.now >= c.eatEnd) {
        const def = CUSTOMER_BY_ID[c.type];
        const dish = DISH_BY_ID[c.dish!];
        const server = s.workers.find((w) => w.id === c.serverId);
        const amount = Math.max(1, Math.round(dish.price * def.spend));
        // purple bonus stars: the buzz makes diners tip more
        // tips: the server's Tips stat (and their type's tip perk)
        const tipRaw = server ? amount * server.stats.tips * TUNING.tipPerStat * perk(server.type, 'tips') * (1 + TUNING.purpleTipBoost * purpleStars(s)) : 0;
        const tip = Math.floor(tipRaw) + (rand(s) < tipRaw % 1 ? 1 : 0);
        s.cash += amount + tip;
        s.stats.earned += amount + tip;
        s.stats.served++;
        s.events.push({ t: 'coin', x: c.x, y: c.y, amount, tip });
        c.serverId = undefined;
        // a Fresh variant leaves diners extra happy: their verdict counts for more
        leave(s, c, 'happy', false, true, dish.rateWeight ?? 1);
      }
      break;
    case 'leaving':
    case 'fleeing':
      if (move(c, dt)) markGone(c);
      break;
    case 'infecting':
      if (s.now >= (c.infectEnd ?? 0)) {
        const w = makeWorker(s, 'zombie', c.type, { x: Math.round(c.x), y: Math.round(c.y) });
        w.facing = c.facing;
        // they wake up starving (original), and keep their name
        w.energy = Math.min(w.energy, TUNING.infectEnergy);
        if (c.name) w.name = `Zombie ${c.name}`;
        s.workers.push(w);
        s.stats.infected++;
        const tier = CUSTOMER_BY_ID[c.type].tier;
        if (tier !== 'common' && tier !== 'uncommon') s.stats.infectedRare++;
        s.seen[c.type] = 'infected';
        s.events.push({ t: 'infected', workerId: w.id });
        // the new zombie steps off the chair onto the floor
        const r = room(s);
        if (!isInside(w.x, w.y, r) || blockedTiles(s).has(key(w.x, w.y))) {
          const seat = c.seatId ? furnById(s, c.seatId) : undefined;
          const spot = seat ? tableAccess(s, seat) : null;
          if (spot) w.path = [spot];
          w.speed = workerSpeed(w);
        }
        c.tableId = undefined;
        markGone(c);
      }
      break;
  }
}

const GONE = -9999;
function markGone(c: Customer) {
  c.x = GONE;
}

function nearestCounterWithFood(s: GameState, w: Worker): { slot: (typeof s.counter)[number]; at: Pt } | null {
  const blocked = blockedTiles(s);
  let best: { slot: (typeof s.counter)[number]; at: Pt } | null = null;
  let bestD = Infinity;
  for (const slot of s.counter) {
    if (!slot.dish || slot.servings <= 0) continue;
    const f = furnById(s, slot.furnitureId);
    if (!f) continue;
    const at = useTile(s, f, blocked);
    if (!at) continue;
    const d = Math.abs(at.x - w.x) + Math.abs(at.y - w.y) - slot.servings * 0.001;
    if (d < bestD) {
      bestD = d;
      best = { slot, at };
    }
  }
  return best;
}

function nearestSink(s: GameState, from: Pt): Pt | null {
  const blocked = blockedTiles(s);
  let best: Pt | null = null;
  let bestD = Infinity;
  for (const f of s.furniture) {
    if (itemOf(f).kind !== 'sink') continue;
    const at = useTile(s, f, blocked);
    if (!at) continue;
    const d = Math.abs(at.x - from.x) + Math.abs(at.y - from.y);
    if (d < bestD) {
      bestD = d;
      best = at;
    }
  }
  return best;
}

function nearestCounterTile(s: GameState, from: Pt): { f: Furniture; at: Pt } | null {
  const blocked = blockedTiles(s);
  let best: { f: Furniture; at: Pt } | null = null;
  let bestD = Infinity;
  for (const f of s.furniture) {
    if (itemOf(f).kind !== 'counter') continue;
    const at = useTile(s, f, blocked);
    if (!at) continue;
    const d = Math.abs(at.x - from.x) + Math.abs(at.y - from.y);
    if (d < bestD) {
      bestD = d;
      best = { f, at };
    }
  }
  return best;
}

/** Waiting customers first, oldest first; then dirty plates. */
function findJob(s: GameState, w: Worker): boolean {
  const speed = workerSpeed(w);
  const waiting = s.customers.filter((c) => c.state === 'waiting' && !c.serverId).sort((a, b) => a.waitLeft - b.waitLeft);
  if (waiting.length) {
    const food = nearestCounterWithFood(s, w);
    if (food) {
      const c = waiting[0];
      food.slot.servings -= 1;
      w.job = { kind: 'serve', slotId: food.slot.id, dish: food.slot.dish!, customerId: c.id };
      if (food.slot.servings <= 0) food.slot.dish = undefined;
      c.serverId = w.id;
      w.state = 'toCounter';
      if (!goTo(s, w, food.at, speed, 'the counter')) releaseJob(s, w);
      return true;
    }
  }
  // clear a dirty plate if nobody else is on it and there's somewhere to dump it
  const claimed = new Set(s.workers.filter((o) => o.job?.kind === 'plate').map((o) => (o.job as { tableId: string }).tableId));
  const dirty = s.furniture.filter((f) => f.dirty && !claimed.has(f.id));
  if (dirty.length && nearestSink(s, w)) {
    dirty.sort((a, b) => Math.abs(a.x - w.x) + Math.abs(a.y - w.y) - (Math.abs(b.x - w.x) + Math.abs(b.y - w.y)));
    for (const t of dirty) {
      const at = tableAccess(s, t);
      if (!at) continue;
      w.job = { kind: 'plate', tableId: t.id };
      w.state = 'toPlate';
      if (setPath(s, w, at, speed)) return true;
      w.job = undefined;
      w.state = 'idle';
    }
  }
  return false;
}

function drain(w: Worker, amount: number) {
  if (w.kind === 'zombie') w.energy = Math.max(0, w.energy - amount);
}

function kegCount(s: GameState): number {
  return s.furniture.filter((f) => itemOf(f).kind === 'keg').length;
}

function updateWorker(s: GameState, w: Worker, dt: number) {
  const max = maxEnergy(w);
  const speed = workerSpeed(w);
  const r = room(s);
  // worked down to nothing: they pass out face-down on the spot (original: "…fall asleep")
  if (w.kind === 'zombie' && w.energy <= 0 && WORKING.has(w.state)) {
    fallAsleep(s, w);
    return;
  }
  switch (w.state) {
    case 'idle': {
      if (w.path.length) {
        move(w, dt); // finishing a walk (e.g. back in from a nap)
        break;
      }
      if (!isInside(Math.round(w.x), Math.round(w.y), r)) {
        // outside (after a nap or a raid): head back in through the door
        if (!goTo(s, w, { x: DOOR_X, y: 1 }, speed, 'the door')) w.path = [];
        break;
      }
      if (isHangry(w) && canBite(s, w) && nearestPrey(s, w)) {
        // HANGRY: a few seconds' warning (slumped, moaning), then they go for a customer
        goHungry(s, w);
        break;
      }
      if (w.kind === 'zombie' && s.now >= w.nextDaydream) {
        w.state = 'daydream';
        w.daydreamEnd = s.now + TUNING.daydreamMaxSec * (0.5 + rand(s) * 0.5);
        s.events.push({ t: 'daydream', workerId: w.id });
        break;
      }
      findJob(s, w);
      break;
    }
    case 'toStove': {
      if (move(w, dt)) {
        const st = s.stoves.find((x) => x.id === w.stoveId);
        if (!st || st.cookId !== w.id || st.status !== 'reserved') {
          w.state = 'idle';
          w.stoveId = undefined;
          break;
        }
        const f = stoveFurn(s, st);
        faceTowards(w, f.x, f.y);
        st.status = 'cooking';
        w.state = 'cooking';
        w.pendingDish = undefined;
        s.events.push({ t: 'cookStart', stoveId: st.id });
      }
      break;
    }
    case 'cooking': {
      const st = s.stoves.find((x) => x.id === w.stoveId);
      // the prep is the work (the first 10 min of a dish); after that they just stand and stir
      if (st && (st.total ?? 0) - (st.left ?? 0) < TUNING.prepSec) drain(w, TUNING.energyCookPerSec * dt);
      if (!st || st.status !== 'cooking' || st.cookId !== w.id) {
        w.state = 'idle';
        w.stoveId = undefined;
        break;
      }
      // cooks get hangry too: they walk off the job (the dish pauses) to go find a snack
      if (isHangry(w) && w.energy > 0 && canBite(s, w) && nearestPrey(s, w)) goHungry(s, w);
      break;
    }
    case 'toPickup': {
      const job = w.job;
      const st = job?.kind === 'dish' ? s.stoves.find((x) => x.id === job.stoveId) : undefined;
      if (!job || job.kind !== 'dish' || !st || st.status !== 'done' || st.carrierId !== w.id) {
        if (st?.carrierId === w.id) st.carrierId = undefined;
        w.job = undefined;
        w.state = 'idle';
        break;
      }
      if (move(w, dt)) {
        const f = stoveFurn(s, st);
        faceTowards(w, f.x, f.y);
        job.dish = st.dish;
        job.servings = DISH_BY_ID[st.dish!].servings;
        st.status = 'empty';
        st.dish = st.carrierId = undefined;
        st.left = st.total = st.burnAt = undefined;
        s.events.push({ t: 'plated', stoveId: st.id });
        const counter = nearestCounterTile(s, { x: w.x, y: w.y });
        w.state = 'carryDish';
        if (!counter || !goTo(s, w, counter.at, speed, 'the counter')) w.path = [];
        w.targetId = counter?.f.id;
      }
      break;
    }
    case 'carryDish': {
      const job = w.job;
      if (!job || job.kind !== 'dish' || !job.dish) {
        w.state = 'idle';
        break;
      }
      if (move(w, dt)) {
        const counter = w.targetId ? furnById(s, w.targetId) : undefined;
        if (counter) faceTowards(w, counter.x, counter.y);
        addToCounter(s, job.dish, job.servings ?? 0, counter?.id);
        w.job = undefined;
        w.targetId = undefined;
        w.state = 'idle';
      }
      break;
    }
    case 'toCounter': {
      const job = w.job;
      const c = job?.kind === 'serve' ? s.customers.find((x) => x.id === job.customerId) : undefined;
      if (!c || c.state !== 'waiting') {
        releaseJob(s, w);
        break;
      }
      if (move(w, dt)) {
        const table = c.tableId ? furnById(s, c.tableId) : undefined;
        const at = table ? tableAccess(s, table) : null;
        w.state = 'carrying';
        if (!at || !goTo(s, w, at, speed, 'that table')) releaseJob(s, w);
      }
      break;
    }
    case 'carrying': {
      const job = w.job;
      const c = job?.kind === 'serve' ? s.customers.find((x) => x.id === job.customerId) : undefined;
      if (!job || job.kind !== 'serve' || !c || c.state !== 'waiting') {
        releaseJob(s, w);
        break;
      }
      if (move(w, dt)) {
        const table = c.tableId ? furnById(s, c.tableId) : undefined;
        if (table) faceTowards(w, table.x, table.y);
        c.state = 'eating';
        c.dish = job.dish;
        // a moment holding the plate, then they tuck in (original)
        c.holdUntil = s.now + TUNING.holdFoodSec;
        c.eatEnd = c.holdUntil + TUNING.eatSec;
        w.job = undefined;
        drain(w, TUNING.energyPerServe);
        addZombieXp(s, w, 1);
        w.state = 'idle';
      }
      break;
    }
    case 'toPlate': {
      const job = w.job;
      const t = job?.kind === 'plate' ? furnById(s, job.tableId) : undefined;
      if (!t || !t.dirty) {
        w.job = undefined;
        w.state = 'idle';
        break;
      }
      if (move(w, dt)) {
        faceTowards(w, t.x, t.y);
        const sink = nearestSink(s, { x: w.x, y: w.y });
        if (!sink) {
          w.job = undefined;
          w.state = 'idle';
          break;
        }
        t.dirty = false;
        s.events.push({ t: 'cleared', tableId: t.id });
        w.state = 'carryPlate';
        if (!setPath(s, w, sink, speed)) w.path = [];
      }
      break;
    }
    case 'carryPlate': {
      if (move(w, dt)) {
        drain(w, TUNING.energyPerClear);
        s.stats.cleared++;
        w.job = undefined;
        w.state = 'idle';
      }
      break;
    }
    case 'hungry': {
      // the warning: slumped and moaning (Rest or a refill calms them down)
      if (s.now < (w.hungryEnd ?? 0)) break;
      w.hungryEnd = undefined;
      const prey = nearestPrey(s, w);
      if (!prey) {
        w.state = 'idle';
        break;
      }
      if (!huntCustomer(s, w, prey)) w.nextBiteAt = s.now + TUNING.huntRetrySec;
      break;
    }
    case 'asleep': {
      // passed out on the floor: a slow recovery, then they get back up on their own
      const rate = TUNING.restRegenPerSec * rechargeMult(w.stats.recharge) * perk(w.type, 'regen') * TUNING.asleepRegenMult;
      w.energy = Math.min(max, w.energy + rate * dt);
      if (w.energy >= max * TUNING.asleepWakeAt) wake(s, w.id);
      break;
    }
    case 'hunting': {
      const c = s.customers.find((x) => x.id === w.targetId);
      if (!c || !(c.state === 'waiting' || c.state === 'eating')) {
        w.state = 'idle';
        w.targetId = undefined;
        break;
      }
      if (move(w, dt)) {
        faceTowards(w, c.x, c.y);
        s.events.push({ t: 'bite', x: c.x, y: c.y, workerId: w.id, customerId: c.id });
        s.stats.bites++;
        addRating(s, 0, TUNING.ratingAttackWeight);
        w.energy = Math.min(max, w.energy + TUNING.biteEnergyGain);
        w.nextBiteAt = s.now + TUNING.biteCooldownSec;
        w.targetId = undefined;
        // original: the zombie eats them right there (its feast), leaving a pile of bones on the floor
        dropServer(s, c);
        s.events.push({ t: 'eaten', x: c.x, y: c.y, workerId: w.id, customerId: c.id, type: c.type });
        s.stats.angry++;
        c.state = 'leaving';
        c.seatId = undefined;
        c.tableId = undefined;
        c.path = [];
        c.x = GONE;
        w.state = 'feasting';
        w.feastEnd = s.now + TUNING.feastSec;
        // everyone else panics and runs out screaming without paying (original)
        s.events.push({ t: 'panic' });
        for (const o of s.customers) if (o !== c && (o.state === 'waiting' || o.state === 'eating' || o.state === 'entering')) leave(s, o, 'angry', true, false);
      }
      break;
    }
    case 'feasting':
      if (s.now >= (w.feastEnd ?? 0)) {
        w.state = 'idle';
        w.feastEnd = undefined;
      }
      break;
    case 'toRest':
      if (move(w, dt)) w.state = 'resting';
      break;
    case 'resting': {
      if (w.kind === 'zombie') {
        const rate = TUNING.restRegenPerSec * rechargeMult(w.stats.recharge) * perk(w.type, 'regen') * (1 + kegCount(s) * TUNING.kegBonus);
        w.energy = Math.min(max, w.energy + rate * dt);
      } else w.energy = max;
      // closed up: the crew snoozes on the sidewalk until you open again
      if (w.energy >= max && !(s.closed && w.kind === 'zombie')) wake(s, w.id);
      break;
    }
    case 'daydream':
      if (s.now >= (w.daydreamEnd ?? 0)) wake(s, w.id);
      break;
    case 'down':
      if (s.now >= (w.downUntil ?? 0)) {
        w.state = 'idle';
        w.downUntil = undefined;
        w.restSpot = undefined;
        w.energy = Math.max(w.energy, TUNING.reanimateEnergy);
        s.events.push({ t: 'woke', workerId: w.id, from: 'down' });
      }
      break;
    case 'raiding':
      break;
  }
}

/** Mark a dish done: XP, burn timer (= its cook time, original), free the cook. */
function finishStove(s: GameState, st: Stove) {
  const dish = DISH_BY_ID[st.dish!];
  const f = stoveFurn(s, st);
  st.status = 'done';
  st.left = 0;
  // Frozen variants take FROZEN_BURN_MULT times longer to burn
  const wait = Math.max(TUNING.burnMinSec, dish.cookSec) * (f.keepWarm ? TUNING.keepWarmFactor : 1) * (dish.burnMult ?? 1);
  st.burnAt = s.now + wait;
  // a cook with the XP perk (the Critic, Grandma…) makes every dish count for more
  const cook = s.workers.find((w) => w.id === st.cookId);
  const xp = Math.round(dish.xp * (cook ? perk(cook.type, 'xp') : 1));
  addXp(s, xp);
  s.stats.cooked[dish.id] = (s.stats.cooked[dish.id] ?? 0) + 1;
  s.events.push({ t: 'xp', x: f.x, y: f.y, amount: xp });
  s.events.push({ t: 'dishDone', stoveId: st.id });
  if (cook && cook.state === 'cooking') {
    cook.state = 'idle';
    cook.stoveId = undefined;
  }
  st.cookId = undefined;
}

/** True while the offline catch-up runs: stoves then cook on real time, cook or no cook. */
let awayCooking = false;

function updateStove(s: GameState, st: Stove, dt: number) {
  if (awayCooking && (st.status === 'paused' || st.status === 'reserved') && st.dish && st.left !== undefined) {
    // nobody needs to babysit the pots while you're away
    if (st.status === 'reserved') {
      const cook = s.workers.find((w) => w.id === st.cookId);
      if (cook?.state === 'toStove') return; // they're on their way: let them get there
    }
    st.left = Math.max(0, st.left - dt);
    if (st.left <= 0) finishStove(s, st);
    return;
  }
  if (st.status === 'cooking') {
    // a dish only cooks while its cook stands at the stove (original); otherwise it pauses
    const cook = s.workers.find((w) => w.id === st.cookId);
    if (!cook || cook.state !== 'cooking' || cook.stoveId !== st.id) {
      st.status = 'paused';
      st.cookId = undefined;
      return;
    }
    // a fast cook (cook perk) gets through it quicker
    st.left = Math.max(0, (st.left ?? 0) - dt * perk(cook.type, 'cook'));
    if (st.left <= 0) finishStove(s, st);
  } else if (st.status === 'done' && s.now >= (st.burnAt ?? Infinity) && !st.carrierId) {
    st.status = 'burnt';
    s.stats.burnt = (s.stats.burnt ?? 0) + 1;
    s.events.push({ t: 'burnt', stoveId: st.id });
  }
}

export const TUTORIAL = [
  'Tap YOU, then tap the grimy stove and pick something to cook.',
  "It's cooking! A dish only cooks while somebody stands at the stove. Tap the stove to see the timer.",
  "Done! Tap the stove: whoever's free carries the food to the serving counter. Don't let it burn!",
  'Customers need a table with a chair. Whoever is free serves them, then clears the dirty plate to the sink.',
  "Now give a customer a little nibble: tap one, then INFECT. (This one's on the house!)",
  'Your first zombie! Tap them, then the stove, and they cook while you relax.',
  'Watch the Energy bars. Tired zombies bite customers and everyone runs off screaming! Tap a zombie, then REST: they nap outside.',
  'This dump needs work: stains, loose tiles and grimy appliances drag your rating down. Hit the Shop and fix it up!',
];

function updateTutorial(s: GameState, dt: number) {
  const anyStove = (st: string) => s.stoves.some((x) => x.status === st);
  switch (s.tut) {
    case 0:
      if (anyStove('reserved') || anyStove('cooking')) s.tut = 1;
      break;
    case 1:
      if (anyStove('done')) s.tut = 2;
      break;
    case 2:
      if (s.counter.some((c) => c.servings > 0)) s.tut = 3;
      break;
    case 3:
      if (s.stats.served > 0) s.tut = 4;
      break;
    case 4:
      if (zombies(s).length > 0) s.tut = 5;
      break;
    case 5:
      if (s.stoves.some((st) => st.cookId && s.workers.find((w) => w.id === st.cookId)?.kind === 'zombie')) s.tut = 6;
      break;
    case 6:
      s.tutTimer += dt;
      if (s.tutTimer > 45 || s.workers.some((w) => w.state === 'resting' || w.state === 'toRest')) {
        s.tut = 7;
        s.tutTimer = 0;
      }
      break;
    case 7:
      s.tutTimer += dt;
      if (s.tutTimer > 25) s.tut = 8;
      break;
  }
}

function updateMoneyMakers(s: GameState, dt: number) {
  if (s.closed) return; // cash items stop while the café is closed (original)
  for (const f of s.furniture) {
    const p = itemOf(f).payout;
    if (!p) continue;
    f.bank = Math.min(p.max, (f.bank ?? 0) + (p.perHour / 3600) * dt);
  }
}

export function tick(s: GameState, dt: number) {
  s.now += dt;
  for (const st of s.stoves) updateStove(s, st, dt);
  spawnCustomers(s, dt);
  for (const c of s.customers) updateCustomer(s, c, dt);
  s.customers = s.customers.filter((c) => c.x !== GONE);
  for (const w of s.workers) updateWorker(s, w, dt);
  updateDeparting(s, dt);
  updateMoneyMakers(s, dt);
  if (s.closed) s.rating = Math.max(0, s.rating - TUNING.closedDriftPerSec * dt);
  updateProgress(s, dt);
  updateTutorial(s, dt);
  if (s.events.length > 200) s.events.splice(0, s.events.length - 200);
}

/**
 * Time away beyond what the offline simulation covers. The clock still moves on for everything that
 * runs on real time (rivals reopening, reanimation, tombstone recharges, the boss café's schedule, the
 * purple-star timer), while the café's own in-the-moment beats (a diner mid-meal, a feast, a daydream,
 * a hangry warning) are carried along with it so they don't all go off at once.
 */
export function skipTime(s: GameState, sec: number, stoveSec = 0) {
  if (!(sec > 0)) return;
  // the pots keep cooking on real time (up to a day away in all)
  const now0 = s.now;
  for (const st of s.stoves) {
    if (!st.dish || st.left === undefined || !(st.status === 'cooking' || st.status === 'paused' || st.status === 'reserved')) continue;
    const go = Math.min(stoveSec, st.left);
    if (go <= 0) continue;
    if (go >= st.left) {
      // done partway through: it starts waiting (and maybe burning) from then
      s.now = now0 + st.left;
      if (st.status === 'reserved') {
        const cook = s.workers.find((w) => w.id === st.cookId);
        if (cook) releaseJob(s, cook);
      }
      st.left = 0;
      finishStove(s, st);
      s.now = now0;
    } else st.left -= go;
  }
  s.now += sec;
  const shift = (t: number | undefined) => (t === undefined ? t : t + sec);
  for (const c of s.customers) {
    c.eatEnd = shift(c.eatEnd)!;
    c.infectEnd = shift(c.infectEnd);
    c.doorUntil = shift(c.doorUntil);
    c.holdUntil = shift(c.holdUntil);
  }
  for (const w of s.workers) {
    w.feastEnd = shift(w.feastEnd);
    w.daydreamEnd = shift(w.daydreamEnd);
    w.nextDaydream = shift(w.nextDaydream)!;
    w.hungryEnd = shift(w.hungryEnd);
  }
  for (const p of s.pets) {
    p.nextAction += sec;
    if (p.nextFind !== undefined) p.nextFind += sec;
  }
  // anything that finished long ago has burnt by now
  for (const st of s.stoves) updateStove(s, st, 0);
}

/** Tired enough to nap during a union break (see unionBreak). */
export function tired(w: Worker, margin = TUNING.unionBreakMargin): boolean {
  return w.kind === 'zombie' && w.energy <= maxEnergy(w) * (attackThreshold(w.stats.patience) + margin);
}

/**
 * The union break: while you're away (app in the background, offline catch-up), a zombie close to
 * its bite line walks out for a nap instead of snacking on the customers. On unless turned off in Settings.
 */
export function unionBreak(s: GameState) {
  if (s.unionBreak === false) return;
  for (const w of s.workers) {
    if (!atWork(w) || !tired(w) || !['idle', 'daydream', 'cooking', 'toStove', 'hungry'].includes(w.state)) continue;
    rest(s, w.id);
  }
}

/** The crew list's "Rest all tired" button: everyone under half their energy goes out for a nap. */
export function restTired(s: GameState): number {
  let n = 0;
  for (const w of s.workers) {
    if (w.kind !== 'zombie' || !atWork(w) || w.state === 'resting' || w.state === 'toRest' || w.state === 'feasting') continue;
    if (w.energy >= maxEnergy(w) * 0.5) continue;
    if (!rest(s, w.id)) n++;
  }
  return n;
}

/** What happened while you were away (the welcome-back card). */
export interface AwayReport {
  sec: number;
  cash: number;
  served: number;
  angry: number;
  bitten: number;
  burnt: number;
  /** popularity (0..1) before and after */
  rating0: number;
  rating1: number;
}

/** Offline catch-up: fast-forward in coarse steps, capped like the design says; real-time timers still
 * count the rest of the time away (skipTime). Returns what happened. */
export function catchUpReport(s: GameState, seconds: number): AwayReport {
  const sec = Math.max(0, seconds);
  const total = Math.min(sec, TUNING.offlineCapSec);
  const st0 = { ...s.stats };
  const r: AwayReport = { sec, cash: 0, served: 0, angry: 0, bitten: 0, burnt: 0, rating0: s.rating, rating1: s.rating };
  let left = total;
  const cash0 = s.cash;
  // level-ups earned while away are still announced when you're back; the rest of the chatter isn't
  const kept = s.events.filter((e) => e.t === 'levelup' || e.t === 'zombieLevel');
  // long absences step a little coarser (it all runs before the game shows up)
  const step = total > 3600 ? 5 : 1;
  awayCooking = true;
  try {
    while (left > 0) {
      const d = Math.min(step, left);
      unionBreak(s);
      tick(s, d);
      for (const e of s.events) if (e.t === 'levelup' || e.t === 'zombieLevel') kept.push(e);
      s.events.length = 0;
      left -= d;
    }
    skipTime(s, sec - total, Math.max(0, Math.min(sec, TUNING.offlineStoveCapSec) - total));
  } finally {
    awayCooking = false;
  }
  s.events.length = 0;
  s.events.push(...kept);
  r.cash = s.cash - cash0;
  r.served = s.stats.served - st0.served;
  r.angry = s.stats.angry - st0.angry;
  r.bitten = s.stats.bites - st0.bites;
  r.burnt = (s.stats.burnt ?? 0) - (st0.burnt ?? 0);
  r.rating1 = s.rating;
  return r;
}

/** Offline catch-up; returns the cash made (see catchUpReport). */
export function catchUp(s: GameState, seconds: number): number {
  return catchUpReport(s, seconds).cash;
}

export { walkable };
