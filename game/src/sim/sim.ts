import {
  CUSTOMERS,
  CUSTOMER_BY_ID,
  DISHES,
  DISH_BY_ID,
  LEVEL_CAP,
  TUNING,
  VARIANT_DISHES,
  VERY_DISHES,
  attackThreshold,
  crewCapForLevel,
  firstName,
  perk,
  rechargeMult,
  type DishDef,
  spawnWeight,
  speedMult,
  tilesPerSec,
  xpToNext,
  zombieLevel,
} from './data';
import { DIR_STEP, FLOOR_BY_ID, ITEM_BY_ID, STOVE_TIER_BURN, STOVE_TIER_SPEED, WALL_BY_ID, type ItemDef } from './catalog';
import { DOOR_X, findPath, isInside, key, reachable, restSpots, streetEnds, walkable, type Pt, type Room } from './grid';
import { makeWorker, maxEnergy, type Customer, type Furniture, type GameState, type Mover, type Stove, type Worker, type WorkerState } from './state';
import { fryerCooked, updateProgress } from './progress';
import { masterVariant } from './cookbook';
import { rivalRatingPenalty, stealingRivals } from './rivals';

// ---------- helpers ----------

/** How fast a crew member walks (or runs): the original's 2 + 0.2 x Speed, zombies 1.2x slower. */
export function workerSpeed(w: Worker, run = false): number {
  return tilesPerSec(w.stats.speed, { zombie: w.kind === 'zombie', run });
}

/** How fast a customer walks (or runs, panicking): their own Speed stat (original). */
export function customerSpeed(c: Customer, run = false): number {
  return tilesPerSec(CUSTOMER_BY_ID[c.type]?.stats.speed ?? 4, { run });
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
/** Crew slots in use: the zombies, plus customers still turning into one. */
export const crewCount = (s: GameState) => zombies(s).length + s.customers.filter((c) => c.state === 'infecting').length;
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
 * neighbour (never a boxed-in pocket the crew can't get to). A cook stands BEHIND the stove, looking out
 * over it (original): behind, then the side further from the camera, then the other side, then the front. */
export function useTile(s: GameState, f: Furniture, blocked = blockedTiles(s)): Pt | null {
  const reach = reachableFloor(s, blocked);
  const st = f.dir ? DIR_STEP[f.dir] : { x: 0, y: 1 };
  const steps =
    itemOf(f).kind === 'stove'
      ? [{ x: -st.x, y: -st.y }, ...[{ x: st.y, y: st.x }, { x: -st.y, y: -st.x }].sort((a, b) => a.x + a.y - (b.x + b.y)), st]
      : [st, ...N4];
  const cands = steps.map((d) => ({ x: f.x + d.x, y: f.y + d.y }));
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

const tileOf = (m: Pt): Pt => ({ x: Math.round(m.x), y: Math.round(m.y) });

/** The free floor tile on or next to `target` that's closest to `from` (where to stand to reach someone). */
function nextTo(s: GameState, from: Pt, target: Pt, blocked = blockedTiles(s)): Pt | null {
  const r = room(s);
  const reach = reachableFloor(s, blocked);
  const t = tileOf(target);
  let best: Pt | null = null;
  let bestD = Infinity;
  for (const d of [{ x: 0, y: 0 }, ...N4]) {
    const c = { x: t.x + d.x, y: t.y + d.y };
    const k = key(c.x, c.y);
    if (!isInside(c.x, c.y, r) || blocked.has(k) || !reach.has(k)) continue;
    const dd = Math.hypot(c.x - from.x, c.y - from.y);
    if (dd < bestD) {
      bestD = dd;
      best = c;
    }
  }
  return best;
}

/** Follow a moving target (the infect chase, an attack): a fresh path to beside them every 0.3 s. */
function follow(s: GameState, w: Worker, target: Pt, speed: number, dt: number): boolean {
  if (!w.path.length || s.now >= (w.repathAt ?? 0)) {
    w.repathAt = s.now + 0.3;
    const goal = nextTo(s, w, target);
    if (!goal || !setPath(s, w, goal, speed)) return false;
  }
  w.speed = speed;
  move(w, dt);
  return true;
}

/** Within arm's reach: on the same or a neighbouring tile (original withinAttackRange). */
const inReach = (a: Pt, b: Pt) => Math.max(Math.abs(Math.round(a.x) - Math.round(b.x)), Math.abs(Math.round(a.y) - Math.round(b.y))) <= 1 && Math.hypot(a.x - b.x, a.y - b.y) <= 1.5;

// ---------- energy: hangry, hungry, asleep ----------

/** Low enough on energy that they might go for a customer (below their patience line). */
export function isHangry(w: Worker): boolean {
  return w.kind === 'zombie' && w.energy <= maxEnergy(w) * attackThreshold(w.stats.patience);
}

/**
 * The original's isRestless roll: never above the patience line; below it the chance climbs from ~2% to
 * 100% at empty: p + (1 - energy/line) x (1 - p).
 */
export function isRestless(s: GameState, w: Worker): boolean {
  if (w.kind !== 'zombie') return false;
  const line = maxEnergy(w) * attackThreshold(w.stats.patience);
  if (w.energy > line) return false;
  const p = TUNING.biteBaseChance;
  return rand(s) < p + (1 - w.energy / Math.max(1e-9, line)) * (1 - p);
}

/** Not still digesting their last meal (the Eat! order waits a minute after a feast). */
export const canBite = (s: GameState, w: Worker) => s.now >= (w.fullUntil ?? -Infinity);

/** Seconds until a zombie may be told to eat again. */
export const biteCooldownLeft = (s: GameState, w: Worker) => Math.max(0, (w.fullUntil ?? 0) - s.now);

/** States in which a zombie's minute-by-minute bite check doesn't run (original: resting and attacking). */
const NO_BITE_CHECK: ReadonlySet<WorkerState> = new Set<WorkerState>(['resting', 'toRest', 'hungry', 'hunting', 'attacking', 'feasting', 'asleep', 'raiding', 'down']);

/** Customers a zombie can go for: inside, and not already running or someone else's victim. */
const isPrey = (s: GameState, c: Customer) => c.x !== GONE && (c.state === 'waiting' || c.state === 'eating' || c.state === 'entering') && isInside(Math.round(c.x), Math.round(c.y), room(s));

/** The nearest customer inside a zombie could get to (for a snack). */
function nearestPrey(s: GameState, w: Worker): Customer | undefined {
  return s.customers.filter((c) => isPrey(s, c)).sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))[0];
}

/**
 * One bite check a minute per zombie, in every state but resting and attacking (original): below the
 * patience line it may go for the nearest customer (after our 5 s hungry warning).
 */
function biteCheck(s: GameState, w: Worker): boolean {
  if (w.kind !== 'zombie' || NO_BITE_CHECK.has(w.state)) return false;
  w.nextBiteAt ??= s.now + TUNING.biteCheckSec;
  if (s.now < w.nextBiteAt) return false;
  w.nextBiteAt = s.now + TUNING.biteCheckSec;
  if (!isRestless(s, w) || !nearestPrey(s, w)) return false;
  goHungry(s, w);
  return true;
}

/** The hangry warning: drop everything (a cook's dish pauses), slump and moan, then go for a customer. */
function goHungry(s: GameState, w: Worker) {
  releaseJob(s, w);
  w.state = 'hungry';
  w.hungryEnd = s.now + TUNING.hungrySec;
  s.events.push({ t: 'hungry', workerId: w.id });
}

/** Set off after a customer (the hungry lunge, or the player's Eat! order), at a walk (original). */
function huntCustomer(s: GameState, w: Worker, prey: Customer): boolean {
  const at = nextTo(s, w, prey);
  w.hungryEnd = undefined;
  if (!at || !findPath(tileOf(w), at, blockedTiles(s), room(s))) {
    cantReach(s, w, 'that customer');
    w.state = 'idle';
    w.targetId = undefined;
    w.path = [];
    return false;
  }
  w.targetId = prey.id;
  w.state = 'hunting';
  w.struck = false;
  w.repathAt = 0;
  w.path = [];
  return true;
}

/** Seconds between swings: 1 s / speed multiplier (original MAX_ATTACK_TIME). */
export const swingInterval = (w: Worker) => TUNING.swingSec / speedMult(w.stats.speed);

/** How long a feast takes for this zombie: crouch, the flesh chunks (faster zombies chew faster), a mouth-wipe. */
export const feastLength = (w: Worker) => TUNING.feastCrouchSec + (TUNING.fleshChunks * TUNING.fleshChunkSec) / speedMult(w.stats.speed) + TUNING.feastWipeSec;

/** The customer a hunting or attacking zombie is after, while they can still be got at. */
function victimOf(s: GameState, w: Worker): Customer | undefined {
  const c = s.customers.find((x) => x.id === w.targetId);
  if (!c || c.x === GONE) return undefined;
  return c.state === 'cowering' || isPrey(s, c) ? c : undefined;
}

/**
 * A swing lands (original AttackTask + tookDamage): damage = the zombie's Power; the victim is knocked one
 * tile away. The first hit of an attack makes everyone else run out screaming and costs 0.1 rating.
 */
function strike(s: GameState, w: Worker, c: Customer) {
  if (!w.struck) {
    w.struck = true;
    s.stats.bites++;
    s.rating = Math.max(0, s.rating - TUNING.ratingAttack);
    s.events.push({ t: 'bite', x: c.x, y: c.y, workerId: w.id, customerId: c.id });
    s.events.push({ t: 'panic' });
    dropServer(s, c);
    if (c.tableId && c.state === 'eating') {
      const t = furnById(s, c.tableId);
      if (t) t.dirty = true;
    }
    c.seatId = undefined;
    c.tableId = undefined;
    c.stage = undefined;
    c.holdUntil = undefined;
    c.state = 'cowering';
    c.path = [];
    c.energy ??= CUSTOMER_BY_ID[c.type]?.stats.energy ?? 100;
    for (const o of s.customers) if (o !== c && o.x !== GONE && (o.state === 'waiting' || o.state === 'eating' || o.state === 'entering' || o.state === 'turnedAway')) leave(s, o, 'angry', true, false);
  }
  const damage = w.stats.power;
  c.energy = (c.energy ?? CUSTOMER_BY_ID[c.type]?.stats.energy ?? 100) - damage;
  s.events.push({ t: 'hit', x: c.x, y: c.y, workerId: w.id, customerId: c.id, damage });
  knockBack(s, w, c);
  if (c.energy <= 0) devour(s, w, c);
}

/** Each hit pushes the victim one tile away from the zombie, onto free floor inside (original). A victim
 * still on a chair is knocked off it onto the floor. */
function knockBack(s: GameState, w: Worker, c: Customer) {
  const blocked = blockedTiles(s);
  const at = tileOf(c);
  const dx = at.x - Math.round(w.x);
  const dy = at.y - Math.round(w.y);
  const step = Math.abs(dx) >= Math.abs(dy) && dx !== 0 ? { x: Math.sign(dx), y: 0 } : dy !== 0 ? { x: 0, y: Math.sign(dy) } : { x: w.facing, y: 0 };
  const to = { x: at.x + step.x, y: at.y + step.y };
  let goal: Pt | null = isInside(to.x, to.y, room(s)) && !blocked.has(key(to.x, to.y)) ? to : null;
  if (!goal && blocked.has(key(at.x, at.y))) goal = nextTo(s, { x: at.x + step.x * 3, y: at.y + step.y * 3 }, at, blocked);
  if (!goal) return;
  c.path = [goal];
  c.speed = 6;
}

/** The kill: the zombie crouches over the body and eats (original FeastTask): +2 energy per flesh chunk. */
function devour(s: GameState, w: Worker, c: Customer) {
  const feast = feastLength(w);
  const m = speedMult(w.stats.speed);
  s.events.push({ t: 'eaten', x: c.x, y: c.y, workerId: w.id, customerId: c.id, type: c.type, feastSec: feast });
  s.stats.angry++;
  dropServer(s, c);
  c.state = 'leaving';
  c.seatId = undefined;
  c.tableId = undefined;
  c.path = [];
  c.x = GONE;
  w.state = 'feasting';
  w.path = [];
  w.targetId = undefined;
  w.struck = false;
  w.feastEnd = s.now + feast;
  w.feastChunks = TUNING.fleshChunks;
  w.chunkAt = s.now + TUNING.feastCrouchSec + TUNING.fleshChunkSec / m;
  w.fullUntil = s.now + TUNING.biteCheckSec;
  w.nextBiteAt = s.now + TUNING.biteCheckSec;
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

/** Star-item bonus (the original's furniture rating bonus): placed items, wall hangings, finishes; grime counts against. */
export function ratingBonus(s: GameState): number {
  let b = 0;
  for (const f of s.furniture) b += itemOf(f).rating;
  for (const w of s.wallItems) b += ITEM_BY_ID[w.item]?.rating ?? 0;
  for (const side of ['l', 'r'] as const) for (const w of s.walls[side]) b += WALL_BY_ID[w]?.rating ?? 0;
  for (const f of Object.values(s.floors)) b += FLOOR_BY_ID[f]?.rating ?? 0;
  return Math.round(b * 1000) / 1000;
}

/** What star items add to the rating (original: on top of popularity; the best decor is worth +0.20). Grime
 * takes off up to the same (ours). */
export function decorBonus(s: GameState): number {
  return Math.max(-TUNING.ratingDecorMax, Math.min(TUNING.ratingDecorMax, ratingBonus(s)));
}

/** The rating customers go by (the original's modified rating): popularity + decor, less rivals poaching, 0..1. */
export function shownRating(s: GameState): number {
  return Math.max(0, Math.min(1, s.rating + decorBonus(s) - rivalRatingPenalty(s)));
}

/** Stars in half steps, 0..5. */
export function stars(s: GameState): number {
  return Math.max(0, Math.min(5, Math.floor(shownRating(s) * 10 + 1e-9) / 2));
}

/** Purple bonus stars still running (0..3); they all drop when the timer runs out. */
export function purpleStars(s: GameState): number {
  return s.purple && s.now < s.purple.until ? s.purple.stars : 0;
}

/** Stars as customers see them: normal stars plus half a star per purple star (who shows up, how rare). */
export function customerStars(s: GameState): number {
  return stars(s) + TUNING.purpleStarValue * purpleStars(s);
}

/** Seconds between customer arrivals: 18 s at zero rating down to 4.5 s at full (original), faster with purple stars. */
export function arrivalGap(s: GameState): number {
  const gap = TUNING.arrivalSlowSec - (TUNING.arrivalSlowSec - TUNING.arrivalFastSec) * shownRating(s);
  return gap / (1 + TUNING.purpleArrivalBoost * purpleStars(s));
}

/** One customer's verdict (original): +0.005 for a paid meal, -0.006 for an unhappy exit, clamped 0..1. */
export function addRating(s: GameState, outcome: 0 | 1, weight = 1) {
  s.rating += (outcome ? TUNING.ratingServe : -TUNING.ratingUnhappy) * weight;
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
  return list.flatMap((d) => [d, ...[...VARIANT_DISHES, ...VERY_DISHES].filter((v) => v.base === d.id && s.recipes.includes(v.id))]);
}

/** Which dishes a stove can cook: its own cookbook (every stove can do the house menu). */
export function stoveCooks(st: Stove, dishStation: string): boolean {
  return dishStation === 'stove' || dishStation === st.kind;
}

const stoveFurn = (s: GameState, st: Stove) => furnById(s, st.furnitureId)!;
const stoveSpeed = (s: GameState, st: Stove) => (itemOf(stoveFurn(s, st)).speed ?? 1) * (1 + STOVE_TIER_SPEED * (stoveFurn(s, st).tier ?? 0));

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
  if (st.status === 'paused' || ((st.status === 'cooking' || st.status === 'reserved') && !st.cookId)) {
    // resume a paused dish: no extra cost
    releaseJob(s, w);
    st.status = 'cooking';
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
  // original: COOK takes the money and puts the pot on at once; the cook walks over afterwards (it only
  // cooks while they stand there)
  s.cash -= dish.cost;
  st.status = 'cooking';
  st.cookId = w.id;
  st.dish = dish.id;
  st.unattended = 0;
  st.xp = undefined;
  // the very first dish of a new café cooks quickly so the tutorial keeps moving
  const firstOne = !Object.keys(s.stats.cooked).length && !s.stoves.some((x) => x !== st && x.dish);
  st.total = (firstOne ? 15 : dish.cookSec) / stoveSpeed(s, st);
  st.left = st.total;
  w.stoveId = st.id;
  w.pendingDish = undefined;
  w.state = 'toStove';
  if (!setPath(s, w, at, workerSpeed(w))) w.path = [];
  s.events.push({ t: 'cookStart', stoveId: st.id });
  return null;
}

/**
 * A finished dish goes to the counter (original: select a crew member, then touch the stove; the
 * controller asks for that). With no worker given (scripts, tests) the nearest free one goes. Tapping
 * burnt food scrapes it off.
 */
export function plateDish(s: GameState, stoveId: string, workerId?: string): string | null {
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!st) return 'Nope.';
  if (st.status === 'burnt') {
    st.status = 'empty';
    st.dish = undefined;
    st.left = st.total = st.burnAt = st.unattended = st.xp = undefined;
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

/** Brain Sauce to finish a dish right now (original): max(1, (XP x 10 + price x servings) / 500 x the share still to go). */
export function finishCost(s: GameState, stoveId: string): number {
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!st || !(st.status === 'cooking' || st.status === 'paused') || !st.dish) return 0;
  const d = DISH_BY_ID[st.dish];
  const share = st.total ? Math.max(0, st.left ?? 0) / st.total : 1;
  return Math.max(1, Math.floor(((d.xp * 10 + d.price * d.servings) / 500) * share));
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
  // nothing's been cooked yet (the cook never got there): all the money back
  const cost = DISH_BY_ID[st.dish]?.cost ?? 0;
  s.cash += st.left === st.total ? cost : Math.floor(cost * TUNING.sellBack);
  const cook = s.workers.find((w) => w.id === st.cookId);
  if (cook && (cook.state === 'cooking' || cook.state === 'toStove')) {
    cook.state = 'idle';
    cook.stoveId = undefined;
    cook.pendingDish = undefined;
    cook.path = [];
  }
  st.status = 'empty';
  st.dish = st.cookId = undefined;
  st.left = st.total = st.burnAt = st.unattended = st.xp = undefined;
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

/**
 * INFECT (original, as played): no confirm. The customer jumps up and RUNS for the door, arms up, and the
 * nearest free crew member (YOU or an idle zombie) runs after them, arms out. The catch turns them on the
 * spot (see catchCustomer). Crew cap first, then the price.
 */
export function infect(s: GameState, customerId: string): string | null {
  const c = s.customers.find((x) => x.id === customerId);
  if (!c || c.x === GONE || !['entering', 'waiting', 'eating'].includes(c.state)) return 'Too late, they left!';
  if (!isInside(Math.round(c.x), Math.round(c.y), room(s))) return 'Wait till they’re inside!';
  if (crewCount(s) >= s.crewCap) return `Crew is full (${s.crewCap}/${s.crewCap}). Level up for more slots!`;
  const cost = infectCost(s, c);
  if (s.cash < cost.cash) return 'Not enough cash!';
  if (s.sauce < cost.sauce) return 'Not enough Brain Sauce!';
  s.cash -= cost.cash;
  s.sauce -= cost.sauce;
  if (s.freeInfects > 0) s.freeInfects--;
  dropServer(s, c);
  if (c.tableId && c.state === 'eating') {
    // they abandon their meal: the plate's left on the table
    const t = furnById(s, c.tableId);
    if (t) t.dirty = true;
  }
  c.seatId = undefined;
  c.tableId = undefined;
  c.holdUntil = undefined;
  c.doorUntil = undefined;
  c.state = 'infecting';
  c.stage = 'door';
  c.path = [];
  c.infectEnd = undefined;
  c.chaseEnd = s.now + TUNING.chaseMaxSec;
  const w = pickChaser(s, c);
  if (!w || !setChaser(s, c, w)) catchCustomer(s, c, w);
  return null;
}

/** Who gives chase: the nearest free crew member (idle, daydreaming or standing by a table), else YOU. */
function pickChaser(s: GameState, c: Customer): Worker | undefined {
  const free = s.workers.filter((w) => atWork(w) && (w.state === 'idle' || w.state === 'daydream' || w.state === 'serving') && !(w.kind === 'zombie' && w.energy <= 0));
  free.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
  return free[0] ?? s.workers.find((w) => w.kind === 'you' && atWork(w) && w.state !== 'chasing');
}

/** Put a crew member on the chase (a cook drops the pot for now and goes back to it after). */
function setChaser(s: GameState, c: Customer, w: Worker): boolean {
  const goal = nextTo(s, w, c);
  if (!goal || !findPath(tileOf(w), goal, blockedTiles(s), room(s))) return false;
  const stove = w.state === 'cooking' || w.state === 'toStove' ? w.stoveId : undefined;
  releaseJob(s, w);
  w.resumeStoveId = stove;
  w.state = 'chasing';
  w.targetId = c.id;
  w.wandering = false;
  w.repathAt = 0;
  c.chaserId = w.id;
  s.events.push({ t: 'chase', customerId: c.id, workerId: w.id });
  return true;
}

/** Caught (or nobody could get to them): the customer IS a zombie now, right where they stand. No bite,
 * no transform clip (original INSTANT_INFECT): same clothes, same name, 20 energy, idle for a moment. */
function catchCustomer(s: GameState, c: Customer, chaser?: Worker) {
  const blocked = blockedTiles(s);
  const r = room(s);
  const here = tileOf(c);
  const spot = isInside(here.x, here.y, r) && !blocked.has(key(here.x, here.y)) ? here : (nextTo(s, c, c, blocked) ?? { x: DOOR_X, y: 0 });
  const w = makeWorker(s, 'zombie', c.type, spot);
  // exactly where they were standing (then onto the tile's centre)
  w.x = c.x;
  w.y = c.y;
  if (Math.hypot(c.x - spot.x, c.y - spot.y) > 0.01) {
    w.path = [spot];
    w.speed = workerSpeed(w);
  }
  w.facing = c.facing;
  w.back = c.back;
  // they wake up starving (original: 20 energy), and keep their name
  w.energy = Math.min(w.energy, TUNING.infectEnergy);
  if (c.name) w.name = c.name;
  w.wanderAt = s.now + 3 + rand(s) * 3;
  w.nextBiteAt = s.now + TUNING.biteCheckSec;
  s.workers.push(w);
  s.stats.infected++;
  const tier = CUSTOMER_BY_ID[c.type].tier;
  if (tier !== 'common' && tier !== 'uncommon') s.stats.infectedRare++;
  s.seen[c.type] = 'infected';
  s.events.push({ t: 'infected', workerId: w.id, customerId: c.id });
  c.tableId = undefined;
  c.chaserId = undefined;
  c.state = 'leaving';
  markGone(c);
  if (chaser && chaser.state === 'chasing' && chaser.targetId === c.id) {
    chaser.state = 'idle';
    chaser.targetId = undefined;
    chaser.path = [];
    faceTowards(chaser, w.x, w.y);
    resumeCooking(s, chaser);
  }
}

/** A cook who ran off on a chase goes back to the stove they left (if the dish is still waiting for them). */
function resumeCooking(s: GameState, w: Worker) {
  const id = w.resumeStoveId;
  w.resumeStoveId = undefined;
  const st = id ? s.stoves.find((x) => x.id === id) : undefined;
  if (st && st.status === 'paused' && !st.cookId) startCooking(s, w.id, st.id);
}

/** The runner's next stop: the free tile farthest from whoever's chasing them. */
function fleeTile(s: GameState, c: Customer, chaser: Worker): Pt | null {
  const blocked = blockedTiles(s);
  const reach = reachableFloor(s, blocked);
  const r = room(s);
  const here = tileOf(c);
  let best: Pt | null = null;
  let bestD = Math.hypot(here.x - chaser.x, here.y - chaser.y) + 0.5;
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      if (blocked.has(key(x, y)) || !reach.has(key(x, y))) continue;
      const d = Math.hypot(x - chaser.x, y - chaser.y);
      if (d > bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  return best;
}

/** The catch: the chaser has the runner in arm's reach. */
const caught = (w: Worker, c: Customer) => Math.hypot(w.x - c.x, w.y - c.y) <= 1.05;

/** The runner, each tick: for the door first (it won't let them out), then away from the chaser. */
function updateRunner(s: GameState, c: Customer, dt: number) {
  if (c.chaserId === undefined && c.infectEnd !== undefined) {
    // an older save, mid-shiver: just finish turning
    if (s.now >= c.infectEnd) catchCustomer(s, c);
    return;
  }
  let w = s.workers.find((x) => x.id === c.chaserId && x.state === 'chasing' && x.targetId === c.id);
  if (!w) {
    // their chaser was called off: the next nearest picks it up, or the infection just takes
    c.chaserId = undefined;
    const next = pickChaser(s, c);
    if (!next || !setChaser(s, c, next)) return catchCustomer(s, c, next);
    w = next;
  }
  if (caught(w, c)) return catchCustomer(s, c, w);
  if (s.now >= (c.chaseEnd ?? Infinity)) {
    // cornered: they give up and cower
    c.path = [];
    return;
  }
  const pace = Math.min(customerSpeed(c, true), workerSpeed(w, true) * TUNING.chaseRunnerPace);
  if (!c.path.length) {
    const at = tileOf(c);
    if (c.stage === 'door' && !(at.x === DOOR_X && at.y === 0) && setPath(s, c, { x: DOOR_X, y: 0 }, pace)) {
      // heading for the door
    } else {
      c.stage = undefined;
      const t = fleeTile(s, c, w);
      if (t) setPath(s, c, t, pace);
    }
  }
  c.speed = pace;
  move(c, dt);
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
  // fired zombies run off (original)
  if (setPath(s, d, streetEnd(s), workerSpeed(w, true))) (s.departing ??= []).push(d);
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
  // a full belly calls off an attack (the victim runs for it)
  if (w.state === 'hunting' || w.state === 'attacking') releaseJob(s, w);
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
    if (job.dish) deliverDish(s, w, job); // already picked up: put it on a counter
    if (st && st.carrierId === w.id) st.carrierId = undefined;
  }
  // plate jobs simply leave the plate on the table (it's still dirty)
  w.job = undefined;
  if ((w.state === 'cooking' || w.state === 'toStove') && w.stoveId) {
    // walking off the stove pauses the dish (original: it only cooks while somebody stands there)
    const st = s.stoves.find((x) => x.id === w.stoveId);
    if (st && st.cookId === w.id) {
      if (st.status === 'cooking' || st.status === 'reserved') st.status = 'paused';
      st.cookId = undefined;
    }
    w.stoveId = undefined;
    w.pendingDish = undefined;
  }
  // (a chase, an attack or a meal being watched over just stops: the customer works that out)
  w.targetId = undefined;
  w.restSpot = undefined;
  w.hungryEnd = undefined;
  w.struck = false;
  w.wandering = false;
  w.resumeStoveId = undefined;
  w.feastChunks = undefined;
  w.path = [];
  w.state = 'idle';
}

/** A dish reaches the counter: it stacks there, and only now pays its XP (original). */
function deliverDish(s: GameState, w: Worker, job: { dish?: string; servings?: number; xp?: number }, counterId?: string) {
  if (!job.dish) return;
  addToCounter(s, job.dish, job.servings ?? 0, counterId);
  const xp = job.xp ?? DISH_BY_ID[job.dish]?.xp ?? 0;
  addXp(s, xp);
  const at = counterId ? furnById(s, counterId) : undefined;
  s.events.push({ t: 'xp', x: at?.x ?? w.x, y: at?.y ?? w.y, amount: xp });
  job.dish = undefined;
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
  c.chaserId = undefined;
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
  // panicking customers run (original: 0.6x the time per tile)
  setPath(s, c, streetEnd(s), customerSpeed(c, fast));
}

/** Nothing to serve anywhere: no servings on a counter or in anyone's hands, no finished dish on a stove. */
export function soldOut(s: GameState): boolean {
  if (s.counter.some((k) => k.dish && k.servings > 0)) return false;
  if (s.workers.some((w) => w.job?.kind === 'serve' || (w.job?.kind === 'dish' && w.job.dish))) return false;
  return !s.stoves.some((st) => st.status === 'done');
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
  // the original's gap, ±1 s; rivals you've left alone too long are poaching your customers
  s.spawnCooldown = arrivalGap(s) * (1 + 0.25 * stealingRivals(s).length) + (rand(s) * 2 - 1) * TUNING.arrivalJitterSec;
  if (present >= target) return;
  // not everyone who walks by comes in (original: 211-238 in 256, more with a better rating)
  const [v0, v1] = TUNING.visitChance;
  if (rand(s) * 256 >= v0 + (v1 - v0) * shownRating(s)) return;
  // sold out (doc 13 #1, ours): with nothing to serve, only one customer every few minutes even looks in
  if (soldOut(s)) {
    if (s.now - (s.soldOutAt ?? -Infinity) < TUNING.soldOutGapSec) return;
    s.soldOutAt = s.now;
  }
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
  if (def.tier !== 'common' && def.tier !== 'uncommon') s.events.push({ t: 'rareArrival', customerId: c.id, tier: def.tier });
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
  if (c.x === GONE) return; // gone this tick (caught, eaten): dropped at the next sweep
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
      // no clean table: an unhappy customer (original)
      if (move(c, dt)) leave(s, c, 'angry');
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
      updateRunner(s, c, dt);
      break;
    case 'cowering': {
      // a hungry zombie's victim: frozen and screaming, sliding a tile with each hit. If the zombie is
      // called off, they run for it (original)
      const z = s.workers.find((w) => w.targetId === c.id && (w.state === 'hunting' || w.state === 'attacking'));
      if (!z) {
        leave(s, c, 'angry', true, false);
        break;
      }
      move(c, dt);
      break;
    }
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
      if (!s.counter.some((k) => k.dish && k.servings > 0)) s.events.push({ t: 'outOfFood' });
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
  // YOU never tires: any raid knocks wear off once you're home
  if (w.kind === 'you' && w.energy < max && atWork(w)) w.energy = max;
  // worked down to nothing: they pass out face-down on the spot (original: "…fall asleep")
  if (w.kind === 'zombie' && w.energy <= 0 && WORKING.has(w.state)) {
    fallAsleep(s, w);
    return;
  }
  // the minute-by-minute bite check (original): a hungry zombie drops whatever it's doing
  if (atWork(w) && biteCheck(s, w)) return;
  switch (w.state) {
    case 'idle': {
      if (w.path.length) {
        // a stroll gives way to any job that comes up; other walks (back in from a nap) finish first
        if (w.wandering && findJob(s, w)) {
          w.wandering = false;
          break;
        }
        if (move(w, dt)) w.wandering = false;
        break;
      }
      w.wandering = false;
      if (!isInside(Math.round(w.x), Math.round(w.y), r)) {
        // outside (after a nap or a raid): head back in through the door
        if (!goTo(s, w, { x: DOOR_X, y: 1 }, speed, 'the door')) w.path = [];
        break;
      }
      if (w.kind === 'zombie' && s.now >= w.nextDaydream) {
        w.state = 'daydream';
        w.daydreamEnd = s.now + TUNING.daydreamMaxSec * (0.5 + rand(s) * 0.5);
        s.events.push({ t: 'daydream', workerId: w.id });
        break;
      }
      if (findJob(s, w)) break;
      if (w.kind === 'zombie') wander(s, w);
      break;
    }
    case 'toStove': {
      if (move(w, dt)) {
        const st = s.stoves.find((x) => x.id === w.stoveId);
        if (!st || st.cookId !== w.id || !(st.status === 'cooking' || st.status === 'reserved')) {
          w.state = 'idle';
          w.stoveId = undefined;
          break;
        }
        // behind the stove, facing out over it (original operate)
        const f = stoveFurn(s, st);
        faceTowards(w, f.x, f.y);
        st.status = 'cooking';
        w.state = 'cooking';
        w.pendingDish = undefined;
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
        // one plate, carried by hand; the XP comes when it lands on the counter
        job.dish = st.dish;
        job.servings = DISH_BY_ID[st.dish!].servings;
        job.xp = st.xp;
        st.status = 'empty';
        st.dish = st.carrierId = undefined;
        st.left = st.total = st.burnAt = st.unattended = st.xp = undefined;
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
        deliverDish(s, w, job, counter?.id);
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
        // a moment holding the plate, then they tuck in (original). The tutorial's first diner eats
        // quickly so the lesson keeps moving (original: 10 s)
        const first = s.stats.served === 0 && s.tut < TUTORIAL.length && !s.customers.some((o) => o !== c && o.state === 'eating');
        c.holdUntil = s.now + TUNING.holdFoodSec;
        c.eatEnd = c.holdUntil + (first ? TUNING.tutorialEatSec : TUNING.eatSec);
        w.job = undefined;
        drain(w, TUNING.energyPerServe);
        addZombieXp(s, w, 1);
        // the server stays standing by the table for the whole meal (original)
        w.state = 'serving';
        w.targetId = c.id;
      }
      break;
    }
    case 'serving': {
      const c = s.customers.find((x) => x.id === w.targetId);
      if (!c || c.x === GONE || c.state !== 'eating' || c.serverId !== w.id) {
        w.state = 'idle';
        w.targetId = undefined;
        break;
      }
      const table = c.tableId ? furnById(s, c.tableId) : undefined;
      if (table) faceTowards(w, table.x, table.y);
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
        if (!goTo(s, w, sink, speed, 'the sink')) w.path = [];
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
    case 'chasing': {
      // INFECT: after the runner, arms out, at a run; the catch turns them (see updateRunner)
      const c = s.customers.find((x) => x.id === w.targetId && x.state === 'infecting' && x.chaserId === w.id && x.x !== GONE);
      if (!c) {
        w.state = 'idle';
        w.targetId = undefined;
        w.path = [];
        resumeCooking(s, w);
        break;
      }
      if (!follow(s, w, c, workerSpeed(w, true), dt)) w.path = [];
      if (caught(w, c)) catchCustomer(s, c, w);
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
      // after a customer at a walk (original AttackTask chase), then swinging once in reach
      const c = victimOf(s, w);
      if (!c) {
        w.state = 'idle';
        w.targetId = undefined;
        w.struck = false;
        w.path = [];
        break;
      }
      if (inReach(w, c)) {
        w.path = [];
        w.state = 'attacking';
        w.swingAt = s.now + swingInterval(w);
        faceTowards(w, c.x, c.y);
        break;
      }
      if (!follow(s, w, c, speed, dt)) {
        cantReach(s, w, 'that customer');
        w.state = 'idle';
        w.targetId = undefined;
        w.struck = false;
        w.path = [];
      }
      break;
    }
    case 'attacking': {
      const c = victimOf(s, w);
      if (!c) {
        w.state = 'idle';
        w.targetId = undefined;
        w.struck = false;
        break;
      }
      if (!inReach(w, c)) {
        // knocked out of reach: after them again
        w.state = 'hunting';
        w.repathAt = 0;
        break;
      }
      faceTowards(w, c.x, c.y);
      if (s.now < (w.swingAt ?? 0)) break;
      w.swingAt = s.now + swingInterval(w);
      strike(s, w, c);
      break;
    }
    case 'feasting': {
      // crouched over the body: a flesh chunk at a time, +2 energy each (original)
      const m = speedMult(w.stats.speed);
      while ((w.feastChunks ?? 0) > 0 && s.now >= (w.chunkAt ?? Infinity)) {
        w.energy = Math.min(max, w.energy + TUNING.fleshEnergy);
        w.feastChunks = (w.feastChunks ?? 1) - 1;
        w.chunkAt = (w.chunkAt ?? s.now) + TUNING.fleshChunkSec / m;
      }
      if (s.now >= (w.feastEnd ?? 0)) {
        if (w.feastChunks) w.energy = Math.min(max, w.energy + TUNING.fleshEnergy * w.feastChunks);
        w.state = 'idle';
        w.feastEnd = undefined;
        w.feastChunks = undefined;
        w.chunkAt = undefined;
      }
      break;
    }
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
/** Mark a dish done: the green check, the cook is free (the XP waits until it reaches the counter). */
function finishStove(s: GameState, st: Stove) {
  const dish = DISH_BY_ID[st.dish!];
  st.status = 'done';
  st.left = 0;
  // a cook with the XP perk (the Critic, Grandma…) makes every dish count for more
  const cook = s.workers.find((w) => w.id === st.cookId);
  st.xp = Math.round(dish.xp * (cook ? perk(cook.type, 'xp') : 1));
  s.stats.cooked[dish.id] = (s.stats.cooked[dish.id] ?? 0) + 1;
  masterVariant(s, dish.id);
  fryerCooked(s);
  s.events.push({ t: 'dishDone', stoveId: st.id });
  if (cook && cook.state === 'cooking') {
    cook.state = 'idle';
    cook.stoveId = undefined;
  }
  st.cookId = undefined;
  updateBurn(s, st, false);
}

/**
 * How long a dish can sit with nobody cooking it before it burns (original): burn time max(2 x cook,
 * cook + 10 min) (3 x for Fresh) less the cook time. Heat lamps, stove tiers and Frozen stretch it (ours).
 */
export function burnWindow(s: GameState, st: Stove): number {
  const dish = st.dish ? DISH_BY_ID[st.dish] : undefined;
  if (!dish) return Infinity;
  const f = furnById(s, st.furnitureId);
  const m = dish.variant === 'fresh' ? TUNING.freshBurnCookMult : TUNING.burnCookMult;
  const base = Math.max(m * dish.cookSec, dish.cookSec + TUNING.burnMinSec) - dish.cookSec;
  return base * (f?.keepWarm ? TUNING.keepWarmFactor : 1) * (dish.burnMult ?? 1) * (1 + STOVE_TIER_BURN * (f?.tier ?? 0));
}

/** The unattended time a dish can take right now: its burn window, plus 120 s while a cook or carrier is on it. */
export function burnLimit(s: GameState, st: Stove): number {
  return burnWindow(s, st) + (st.cookId || st.carrierId ? TUNING.burnGraceSec : 0);
}

/** Burning: only unattended time counts (original). Keeps burnAt / burnWarn up to date for the HUD and alerts. */
function updateBurn(s: GameState, st: Stove, events = true) {
  if (!st.dish || !(st.status === 'cooking' || st.status === 'paused' || st.status === 'done')) {
    st.burnWarn = st.burnAt = undefined;
    return;
  }
  const limit = burnLimit(s, st);
  const u = st.unattended ?? 0;
  st.burnAt = s.now + Math.max(0, limit - u);
  if (u > limit) {
    st.status = 'burnt';
    s.stats.burnt = (s.stats.burnt ?? 0) + 1;
    st.burnWarn = undefined;
    const cook = s.workers.find((w) => w.id === st.cookId);
    if (cook && cook.stoveId === st.id && (cook.state === 'toStove' || cook.state === 'cooking')) {
      cook.state = 'idle';
      cook.stoveId = undefined;
      cook.path = [];
    }
    st.cookId = undefined;
    if (events) s.events.push({ t: 'burnt', stoveId: st.id });
    return;
  }
  // a finished dish warns with a quarter of its window left
  const warnAt = limit * 0.75;
  if (st.status === 'done' && u < warnAt) st.burnWarn = s.now + (warnAt - u);
  else if (st.status === 'done' && st.burnWarn !== undefined) {
    st.burnWarn = undefined;
    if (events && !st.carrierId) s.events.push({ t: 'burnSoon', stoveId: st.id });
  } else if (st.status !== 'done') st.burnWarn = undefined;
}

/** True while the offline catch-up runs: stoves then cook on real time, cook or no cook. */
let awayCooking = false;

function updateStove(s: GameState, st: Stove, dt: number) {
  if (st.status === 'reserved') st.status = 'cooking'; // older saves: the cook was on the way
  if ((st.status === 'cooking' || st.status === 'paused') && st.dish && st.left !== undefined) {
    // a dish only cooks while its cook stands at the stove (original); otherwise it pauses
    const cook = st.cookId ? s.workers.find((w) => w.id === st.cookId) : undefined;
    const attached = !!cook && cook.stoveId === st.id && (cook.state === 'cooking' || cook.state === 'toStove');
    if (!attached) st.cookId = undefined;
    st.status = attached ? 'cooking' : 'paused';
    const working = attached && cook!.state === 'cooking';
    if (working || awayCooking) {
      // a fast cook (cook perk) gets through it quicker; while you're away nobody needs to babysit the pots
      st.left = Math.max(0, st.left - dt * (working ? perk(cook!.type, 'cook') : 1));
      if (st.left <= 0) return finishStove(s, st);
    } else st.unattended = (st.unattended ?? 0) + dt;
  } else if (st.status === 'done') st.unattended = (st.unattended ?? 0) + dt;
  updateBurn(s, st);
}

export const TUTORIAL = [
  'Tap YOU, then tap the grimy stove and pick something to cook.',
  "It's cooking! A dish only cooks while somebody stands at the stove. Tap the stove to see the timer.",
  "Done! Tap YOU, then the stove: you carry the food to the serving counter. Don't let it burn!",
  "Food's out! Tap the front door to flip the sign to OPEN.",
  'Customers need a table with a chair. Whoever is free serves them and stays by the table while they eat.',
  "Now give a customer a little nibble: tap one, then INFECT. (This one's on the house!)",
  'Your first zombie! Tap them, then the stove, and they cook while you relax.',
  'Watch the Energy bars. Hungry zombies attack customers and everyone runs off screaming! Tap a zombie, then REST: they nap outside.',
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
      if (!s.closed) s.tut = 4;
      break;
    case 4:
      if (s.stats.served > 0) s.tut = 5;
      break;
    case 5:
      if (zombies(s).length > 0) s.tut = 6;
      break;
    case 6:
      if (s.stoves.some((st) => st.cookId && s.workers.find((w) => w.id === st.cookId)?.kind === 'zombie')) s.tut = 7;
      break;
    case 7:
      s.tutTimer += dt;
      if (s.tutTimer > 45 || s.workers.some((w) => w.state === 'resting' || w.state === 'toRest')) {
        s.tut = 8;
        s.tutTimer = 0;
      }
      break;
    case 8:
      s.tutTimer += dt;
      if (s.tutTimer > 25) s.tut = 9;
      break;
  }
}

/** An idle zombie strolls to a nearby free tile now and then (original: they wander on their own). */
function wander(s: GameState, w: Worker) {
  if (w.wanderAt === undefined) {
    w.wanderAt = s.now + TUNING.wanderMinSec + rand(s) * (TUNING.wanderMaxSec - TUNING.wanderMinSec);
    return;
  }
  if (s.now < w.wanderAt) return;
  w.wanderAt = s.now + TUNING.wanderMinSec + rand(s) * (TUNING.wanderMaxSec - TUNING.wanderMinSec);
  const blocked = blockedTiles(s);
  const reach = reachableFloor(s, blocked);
  const r = room(s);
  const here = tileOf(w);
  const spots: Pt[] = [];
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      const d = Math.abs(x - here.x) + Math.abs(y - here.y);
      if (d === 0 || d > TUNING.wanderRadius || blocked.has(key(x, y)) || !reach.has(key(x, y))) continue;
      // not in the doorway, where customers come in
      if (x === DOOR_X && y === 0) continue;
      spots.push({ x, y });
    }
  if (!spots.length) return;
  const to = spots[Math.floor(rand(s) * spots.length)];
  if (setPath(s, w, to, workerSpeed(w))) w.wandering = true;
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
    if (st.status === 'reserved') st.status = 'cooking';
    if (st.status === 'done') {
      // a finished dish sits there unattended the whole time
      st.unattended = (st.unattended ?? 0) + sec;
      continue;
    }
    if (!st.dish || st.left === undefined || !(st.status === 'cooking' || st.status === 'paused')) continue;
    const cook = s.workers.find((w) => w.id === st.cookId);
    const go = Math.max(0, Math.min(stoveSec, st.left));
    const finished = go > 0 && go >= st.left;
    // a cook still standing at an unfinished dish keeps it attended
    const attended = !finished && cook?.state === 'cooking' && cook.stoveId === st.id;
    if (finished) {
      // done partway through: it starts waiting (and maybe burning) from then
      s.now = now0 + st.left;
      if (cook?.state === 'toStove') releaseJob(s, cook);
      st.left = 0;
      finishStove(s, st);
      s.now = now0;
    } else st.left -= go;
    if (!attended) st.unattended = (st.unattended ?? 0) + (sec - go);
  }
  s.now += sec;
  const shift = (t: number | undefined) => (t === undefined ? t : t + sec);
  for (const c of s.customers) {
    c.eatEnd = shift(c.eatEnd)!;
    c.infectEnd = shift(c.infectEnd);
    c.chaseEnd = shift(c.chaseEnd);
    c.doorUntil = shift(c.doorUntil);
    c.holdUntil = shift(c.holdUntil);
  }
  for (const w of s.workers) {
    w.feastEnd = shift(w.feastEnd);
    w.chunkAt = shift(w.chunkAt);
    w.swingAt = shift(w.swingAt);
    w.repathAt = shift(w.repathAt);
    w.wanderAt = shift(w.wanderAt);
    w.nextBiteAt = shift(w.nextBiteAt);
    w.fullUntil = shift(w.fullUntil);
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

/**
 * Offline catch-up (original): while you're away the joint runs at a quarter speed, so up to 8 h away is
 * simulated as up to 2 h of café time, in coarse steps; real-time timers (the stoves, up to a day; KOs,
 * rivals…) count the whole absence (skipTime). One catch-up moves the rating at most ±0.4. Returns what
 * happened.
 */
export function catchUpReport(s: GameState, seconds: number): AwayReport {
  const sec = Math.max(0, seconds);
  const total = Math.min(sec, TUNING.offlineCapSec) * TUNING.awayTimeScale;
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
  s.rating = Math.max(r.rating0 - TUNING.awayRatingCap, Math.min(r.rating0 + TUNING.awayRatingCap, s.rating));
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
