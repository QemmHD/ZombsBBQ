import {
  CUSTOMERS,
  CUSTOMER_BY_ID,
  DISH_BY_ID,
  LEVEL_CAP,
  TUNING,
  attackThreshold,
  crewCapForLevel,
  rechargeMult,
  spawnWeight,
  walkSpeed,
  xpToNext,
  zombieLevel,
} from './data';
import { DIR_STEP, FLOOR_BY_ID, ITEM_BY_ID, WALL_BY_ID, type ItemDef } from './catalog';
import { DOOR_X, findPath, isInside, key, reachable, restSpots, streetEnds, walkable, type Pt, type Room } from './grid';
import { makeWorker, maxEnergy, type Customer, type Furniture, type GameState, type Mover, type Stove, type Worker } from './state';
import { updateProgress } from './progress';
import { stealingRivals } from './rivals';

// ---------- helpers ----------

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
  if (w.kind === 'zombie' && w.state === 'resting' && w.energy < maxEnergy(w) * 0.3) return `${w.name} is too tired. Let them nap or refill with Brain Sauce.`;
  const f = stoveFurn(s, st);
  const at = useTile(s, f);
  if (!at) return 'Nobody can reach that stove!';
  if (st.status === 'paused' || (st.status === 'cooking' && !st.cookId)) {
    // resume a paused dish: no extra cost
    releaseJob(s, w);
    st.status = 'reserved';
    st.cookId = w.id;
    w.stoveId = st.id;
    w.pendingDish = undefined;
    w.state = 'toStove';
    setPath(s, w, at, walkSpeed(w.stats.speed));
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
  if (!setPath(s, w, at, walkSpeed(w.stats.speed))) w.path = [];
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
  if (w.state === 'cooking') {
    // pulling a cook off their stove pauses that dish
    releaseJob(s, w);
  } else releaseJob(s, w);
  w.job = { kind: 'dish', stoveId: st.id };
  w.state = 'toPickup';
  st.carrierId = w.id;
  setPath(s, w, at, walkSpeed(w.stats.speed));
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

/** Flip the door sign. Closing sends idle zombies outside for a nap (original: they line up and snooze). */
export function setClosed(s: GameState, closed: boolean) {
  s.closed = closed;
  if (closed) for (const w of s.workers) if (w.kind === 'zombie' && (w.state === 'idle' || w.state === 'daydream') && w.energy < maxEnergy(w)) rest(s, w.id);
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
  releaseJob(s, w);
  w.restSpot = outsideSpot(s, w);
  w.state = 'toRest';
  setPath(s, w, w.restSpot, walkSpeed(w.stats.speed));
  return null;
}

/** Back to work: wakes a napper or daydreamer (they walk back inside on their own). */
export function wake(s: GameState, workerId: string) {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return;
  if (w.state === 'resting' || w.state === 'toRest' || w.state === 'daydream') {
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
  return null;
}

export function refill(s: GameState, workerId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return 'Nope.';
  if (w.state === 'raiding') return `${w.name} is out on a raid.`;
  if (s.sauce < 1) return 'Not enough Brain Sauce!';
  if (w.state !== 'down' && w.energy >= maxEnergy(w)) return `${w.name} is already full of beans. And brains.`;
  s.sauce -= 1;
  w.energy = maxEnergy(w);
  if (w.state === 'down') {
    w.state = 'idle';
    w.downUntil = undefined;
    w.restSpot = undefined;
  }
  if (w.state === 'resting' || w.state === 'toRest') wake(s, w.id);
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
  w.path = [];
  w.state = 'idle';
}

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
    if (rate) addRating(s, 1);
    s.stats.happy++;
  } else {
    if (rate) addRating(s, 0, weight);
    s.stats.angry++;
  }
  s.events.push({ t: 'face', x: c.x, y: c.y, happy: mood === 'happy' });
  setPath(s, c, streetEnd(s), fast ? TUNING.fleeSpeed : walkSpeed(4));
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
  // the original: more stars, more customers (roughly one per half-star, plus one); a few more than
  // the joint can seat still show up and leave grumbling, which is the nudge to buy more tables
  const target = Math.min(1 + Math.round(st * 2), validSeats(s).length + 1);
  if (!validSeats(s).length) return;
  const present = s.customers.filter((c) => ['entering', 'waiting', 'eating', 'turnedAway'].includes(c.state)).length;
  // rivals you've left alone too long are poaching your customers
  s.spawnCooldown = (5 + rand(s) * 6) * (1 + 0.25 * stealingRivals(s).length);
  if (present >= target) return;
  const pool = CUSTOMERS.filter((d) => d.minLevel <= s.level && d.minStars <= st);
  // gentle anti-streak: recently seen types are less likely, so the crowd stays varied
  const recent = s.recentTypes;
  const w = (id: string, base: number) => base * (recent.includes(id) ? 0.25 : 1);
  let r = rand(s) * pool.reduce((a, d) => a + w(d.id, spawnWeight(d, st)), 0);
  const def = pool.find((d) => (r -= w(d.id, spawnWeight(d, st))) < 0) ?? pool[0];
  recent.push(def.id);
  if (recent.length > 2) recent.shift();
  if (!s.seen[def.id]) s.seen[def.id] = 'met';
  const at = streetEnd(s);
  const seats = freeSeats(s).filter(({ seat }) => findPath(at, { x: seat.x, y: seat.y }, blockedTiles(s), room(s)));
  // with every table taken or dirty most passers-by just walk on; now and then one peeks in and grumbles
  if (!seats.length && rand(s) > 0.3) return;
  const c: Customer = {
    id: `c${s.nextId++}`,
    type: def.id,
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
    setPath(s, c, { x: DOOR_X, y: 1 }, walkSpeed(4));
    return;
  }
  const pick = seats[Math.floor(rand(s) * seats.length)];
  c.seatId = pick.seat.id;
  c.tableId = pick.table.id;
  setPath(s, c, { x: pick.seat.x, y: pick.seat.y }, walkSpeed(4));
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
      if (move(c, dt)) {
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
        const tipRaw = server ? amount * server.stats.tips * 0.04 : 0;
        const tip = Math.floor(tipRaw) + (rand(s) < tipRaw % 1 ? 1 : 0);
        s.cash += amount + tip;
        s.stats.earned += amount + tip;
        s.stats.served++;
        s.events.push({ t: 'coin', x: c.x, y: c.y, amount, tip });
        c.serverId = undefined;
        leave(s, c, 'happy');
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
          w.speed = walkSpeed(w.stats.speed);
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
  const speed = walkSpeed(w.stats.speed);
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
      if (!setPath(s, w, food.at, speed)) releaseJob(s, w);
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
  const speed = walkSpeed(w.stats.speed);
  const r = room(s);
  switch (w.state) {
    case 'idle': {
      if (w.path.length) {
        move(w, dt); // finishing a walk (e.g. back in from a nap)
        break;
      }
      if (!isInside(Math.round(w.x), Math.round(w.y), r)) {
        // outside (after a nap or a raid): head back in through the door
        if (!setPath(s, w, { x: DOOR_X, y: 1 }, speed)) w.path = [];
        break;
      }
      if (w.kind === 'zombie' && w.energy <= max * attackThreshold(w.stats.patience)) {
        // HANGRY: go bite the nearest customer
        const prey = s.customers
          .filter((c) => c.state === 'waiting' || c.state === 'eating')
          .sort((a, b) => Math.abs(a.x - w.x) + Math.abs(a.y - w.y) - (Math.abs(b.x - w.x) + Math.abs(b.y - w.y)))[0];
        if (prey) {
          const table = prey.tableId ? furnById(s, prey.tableId) : undefined;
          const at = table ? tableAccess(s, table) : null;
          w.targetId = prey.id;
          w.state = 'hunting';
          setPath(s, w, at ?? { x: Math.round(prey.x), y: Math.round(prey.y) }, speed * 1.3);
          break;
        }
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
      drain(w, TUNING.energyCookPerSec * dt);
      const st = s.stoves.find((x) => x.id === w.stoveId);
      if (!st || st.status !== 'cooking' || st.cookId !== w.id) {
        w.state = 'idle';
        w.stoveId = undefined;
      }
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
        if (!counter || !setPath(s, w, counter.at, speed)) w.path = [];
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
        if (!at || !setPath(s, w, at, speed)) releaseJob(s, w);
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
        c.eatEnd = s.now + TUNING.eatSec;
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
        w.state = 'idle';
        w.targetId = undefined;
        leave(s, c, 'angry', true, false);
        // everyone else panics and runs out screaming without paying (original)
        s.events.push({ t: 'panic' });
        for (const o of s.customers) if (o !== c && (o.state === 'waiting' || o.state === 'eating' || o.state === 'entering')) leave(s, o, 'angry', true, false);
      }
      break;
    }
    case 'toRest':
      if (move(w, dt)) w.state = 'resting';
      break;
    case 'resting': {
      if (w.kind === 'zombie') {
        const rate = TUNING.restRegenPerSec * rechargeMult(w.stats.recharge) * (1 + kegCount(s) * TUNING.kegBonus);
        w.energy = Math.min(max, w.energy + rate * dt);
      } else w.energy = max;
      if (w.energy >= max) wake(s, w.id);
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
  const wait = Math.max(TUNING.burnMinSec, dish.cookSec) * (f.keepWarm ? TUNING.keepWarmFactor : 1);
  st.burnAt = s.now + wait;
  addXp(s, dish.xp);
  s.stats.cooked[dish.id] = (s.stats.cooked[dish.id] ?? 0) + 1;
  s.events.push({ t: 'xp', x: f.x, y: f.y, amount: dish.xp });
  s.events.push({ t: 'dishDone', stoveId: st.id });
  const cook = s.workers.find((w) => w.id === st.cookId);
  if (cook && cook.state === 'cooking') {
    cook.state = 'idle';
    cook.stoveId = undefined;
  }
  st.cookId = undefined;
}

function updateStove(s: GameState, st: Stove, dt: number) {
  if (st.status === 'cooking') {
    // a dish only cooks while its cook stands at the stove (original); otherwise it pauses
    const cook = s.workers.find((w) => w.id === st.cookId);
    if (!cook || cook.state !== 'cooking' || cook.stoveId !== st.id) {
      st.status = 'paused';
      st.cookId = undefined;
      return;
    }
    st.left = Math.max(0, (st.left ?? 0) - dt);
    if (st.left <= 0) finishStove(s, st);
  } else if (st.status === 'done' && s.now >= (st.burnAt ?? Infinity) && !st.carrierId) {
    st.status = 'burnt';
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
  updateMoneyMakers(s, dt);
  if (s.closed) s.rating = Math.max(0, s.rating - TUNING.closedDriftPerSec * dt);
  updateProgress(s, dt);
  updateTutorial(s, dt);
  if (s.events.length > 200) s.events.splice(0, s.events.length - 200);
}

/** Offline catch-up: fast-forward in coarse steps, capped like the design says. */
export function catchUp(s: GameState, seconds: number): number {
  const total = Math.min(Math.max(0, seconds), TUNING.offlineCapSec);
  let left = total;
  const cash0 = s.cash;
  while (left > 0) {
    const d = Math.min(1, left);
    tick(s, d);
    left -= d;
  }
  s.events.length = 0;
  return s.cash - cash0;
}

export { walkable };
