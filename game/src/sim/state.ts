import { CUSTOMER_BY_ID, DISH_BY_ID, TUNING, YOU_STATS, crewCapForLevel, zombieLevel, type StationKind, type ZombieStats } from './data';
import { ITEM_BY_ID, START_SIZE, type Dir } from './catalog';
import { DOOR_X, type Pt } from './grid';

export interface Furniture {
  id: string;
  /** catalog item id (see catalog.ts) */
  item: string;
  x: number;
  y: number;
  /** facing: chairs face their table; stoves/counters/sinks face where the worker stands */
  dir?: Dir;
  /** tables: a dirty plate is waiting to be cleared (nobody can sit here until it is) */
  dirty?: boolean;
  /** money-makers: cash collected so far (up to the item's max) */
  bank?: number;
  /** stoves: heat-lamp upgrade widens the burn window */
  keepWarm?: boolean;
  /** raid tombstones: uses left today, refilled 24 h after the first use */
  uses?: number;
  usesResetAt?: number;
}

export interface WallItem {
  id: string;
  item: string;
  wall: 'l' | 'r';
  index: number;
}

export interface Mover {
  x: number;
  y: number;
  path: Pt[];
  speed: number;
  /** +1 = facing screen-right, -1 = facing screen-left */
  facing: 1 | -1;
  /** true while facing away from the camera (up the screen) → back view */
  back?: boolean;
}

export type CustomerState = 'entering' | 'waiting' | 'eating' | 'leaving' | 'turnedAway' | 'fleeing' | 'infecting';

export interface Customer extends Mover {
  id: string;
  type: string;
  /** a first name (older saves: none) */
  name?: string;
  state: CustomerState;
  /** walking in: 'door' = heading for the doorway, 'look' = stopped there looking round until doorUntil */
  stage?: 'door' | 'look';
  doorUntil?: number;
  /** just served: holding the plate (no eating yet) until this time */
  holdUntil?: number;
  seatId?: string;
  tableId?: string;
  waitLeft: number;
  eatEnd: number;
  serverId?: string;
  dish?: string;
  mood?: 'happy' | 'angry';
  infectEnd?: number;
}

export type WorkerState =
  | 'idle'
  | 'toStove'
  | 'cooking'
  | 'toPickup'
  | 'carryDish'
  | 'toCounter'
  | 'carrying'
  | 'toPlate'
  | 'carryPlate'
  | 'hunting'
  | 'feasting'
  | 'toRest'
  | 'resting'
  | 'daydream'
  /** hangry warning: slumped and moaning for a few seconds before going for a customer (Rest cancels) */
  | 'hungry'
  /** worked down to 0 energy: passed out face-down where they stood (tap to wake) */
  | 'asleep'
  | 'raiding'
  | 'down';

export type WorkerJob =
  | { kind: 'serve'; slotId: string; dish: string; customerId: string }
  | { kind: 'plate'; tableId: string }
  | { kind: 'dish'; stoveId: string; dish?: string; servings?: number };

export interface Worker extends Mover {
  id: string;
  kind: 'you' | 'zombie';
  /** customer type id for zombies, 'you' for the player */
  type: string;
  name: string;
  stats: ZombieStats;
  energy: number;
  /** zombie XP from serving and raiding; levels add max energy */
  xp: number;
  state: WorkerState;
  stoveId?: string;
  pendingDish?: string;
  job?: WorkerJob;
  targetId?: string;
  restSpot?: Pt;
  /** a feasting zombie gets back up at this time */
  feastEnd?: number;
  daydreamEnd?: number;
  nextDaydream: number;
  /** raid KO: back on their feet at this sim time */
  downUntil?: number;
  /** hangry warning: goes for a customer at this time */
  hungryEnd?: number;
  /** no bites before this time (one bite a minute at most) */
  nextBiteAt?: number;
  /** last time a "can't reach" was reported for them (so it isn't repeated every frame) */
  cantReachAt?: number;
}

/** A fired zombie shambling off down the street (drawn until they're out of sight). */
export interface Departing extends Mover {
  id: string;
  type: string;
}

export type StoveStatus = 'empty' | 'reserved' | 'cooking' | 'paused' | 'done' | 'burnt';

export interface Stove {
  id: string;
  furnitureId: string;
  kind: StationKind;
  status: StoveStatus;
  dish?: string;
  /** cook seconds still to go (counts down only while the cook is at the stove) */
  left?: number;
  /** total cook seconds (for progress rings) */
  total?: number;
  burnAt?: number;
  cookId?: string;
  /** worker on the way to carry the finished dish to a counter */
  carrierId?: string;
}

export interface CounterSlot {
  id: string;
  furnitureId: string;
  dish?: string;
  servings: number;
}

export interface Pet extends Mover {
  id: string;
  type: 'pug' | 'rotweiler';
  homeId: string;
  nextAction: number;
  state: 'roam' | 'sniff' | 'raiding';
  /** the Zombie Pug's next find (sim time) */
  nextFind?: number;
}

export interface FridgeItem {
  dish: string;
  servings: number;
}

export interface RivalProgress {
  stars: number;
  wins: number;
  /** boarded up until (after a win), or a short regroup after a loss */
  nextAt: number;
  /** how many times it has reopened under new management (tougher, richer) */
  gen?: number;
  /** when you last raided it (rivals left alone too long poach your customers) */
  lastRaid?: number;
}

/** One job on Gus's to-do list. Progress = the matching counter's growth since the list was drawn. */
export type TodoKind = 'serve' | 'cook' | 'clear' | 'earn' | 'raid' | 'infect' | 'decor';

export interface TodoTask {
  kind: TodoKind;
  target: number;
  /** the counter's value when the list was drawn */
  base: number;
  /** cook tasks: which dish (its variants count too) */
  dish?: string;
  /** ticked off by bribing the reviewer */
  bribed?: boolean;
}

export interface TodoList {
  /** how many lists were finished before this one (also seeds the next draw) */
  n: number;
  tasks: TodoTask[];
}

export type GameEvent =
  | { t: 'coin'; x: number; y: number; amount: number; tip: number }
  | { t: 'face'; x: number; y: number; happy: boolean }
  | { t: 'xp'; x: number; y: number; amount: number }
  | { t: 'bite'; x: number; y: number; workerId: string; customerId: string }
  | { t: 'panic' }
  /** a customer eaten where they stood (the scene drops the body, then a pile of bones) */
  | { t: 'eaten'; x: number; y: number; workerId: string; customerId: string; type: string }
  | { t: 'infected'; workerId: string }
  | { t: 'levelup'; level: number }
  | { t: 'zombieLevel'; workerId: string; level: number }
  | { t: 'dishDone'; stoveId: string }
  | { t: 'plated'; stoveId: string }
  | { t: 'burnt'; stoveId: string }
  | { t: 'cookStart'; stoveId: string }
  | { t: 'cleared'; tableId: string }
  | { t: 'payout'; furnitureId: string; amount: number }
  | { t: 'petFind'; petId: string; amount: number }
  | { t: 'goal'; goalId: string }
  | { t: 'purple'; stars: number; gained: boolean }
  | { t: 'daydream'; workerId: string }
  /** a zombie went hangry: the warning slump before it bites */
  | { t: 'hungry'; workerId: string }
  /** worked down to nothing: passed out face-down */
  | { t: 'asleep'; workerId: string }
  /** back on their feet after a nap, passing out or a knock-out */
  | { t: 'woke'; workerId: string; from: 'asleep' | 'resting' | 'down' }
  /** somebody can't find a way to where they need to be */
  | { t: 'cantReach'; workerId: string; what: string }
  | { t: 'toast'; text: string };

export interface GameState {
  version: number;
  now: number;
  rng: number;
  nextId: number;
  cash: number;
  sauce: number;
  xp: number;
  level: number;
  crewCap: number;
  /** popularity 0..1 (shown as 0..5 stars) */
  rating: number;
  roomW: number;
  roomH: number;
  /** wall finish per segment: l = north-west wall (index = gy), r = north-east wall (index = gx) */
  walls: { l: string[]; r: string[] };
  /** floor finish per tile ('x,y' → finish id); missing = 'dirty' */
  floors: Record<string, string>;
  wallItems: WallItem[];
  furniture: Furniture[];
  storage: Record<string, number>;
  stoves: Stove[];
  counter: CounterSlot[];
  customers: Customer[];
  workers: Worker[];
  pets: Pet[];
  fridge: FridgeItem[];
  recipes: string[];
  seen: Record<string, 'met' | 'infected'>;
  goalsDone: string[];
  rivals: Record<string, RivalProgress>;
  inventory: { headstone: number; summon: number };
  spawnCooldown: number;
  /** the Zombie Pug's takings today: { day: floor(now / 1 day), cash } */
  pugDay?: { day: number; cash: number };
  /** the "union break": while you're away, tired zombies nap instead of biting (Settings; default on) */
  unionBreak?: boolean;
  /** fired zombies on their way out */
  departing?: Departing[];
  /** last few customer types, to keep the crowd varied */
  recentTypes: string[];
  tut: number;
  tutTimer: number;
  freeInfects: number;
  /** the door sign: closed cafés get no customers and slowly lose rating */
  closed?: boolean;
  /** Gus's to-do list (from level 6): finish every task for a purple bonus star */
  todo?: TodoList;
  /** purple bonus stars (max 3) and the sim time they all drop */
  purple?: { stars: number; until: number };
  stats: {
    served: number;
    earned: number;
    bites: number;
    infected: number;
    infectedRare: number;
    happy: number;
    angry: number;
    /** dishes left on the stove until they burnt */
    burnt: number;
    cleared: number;
    floorsFixed: number;
    cooked: Record<string, number>;
    purchases: number;
    raidsWon: number;
    studied: number;
    /** decorations bought (decor items and wall hangings) */
    decor: number;
  };
  events: GameEvent[];
}

export const SAVE_VERSION = 3;

export function maxEnergy(w: Worker): number {
  if (w.kind !== 'zombie') return w.stats.energy;
  return Math.round(w.stats.energy * (1 + TUNING.zombieLevelEnergy * (zombieLevel(w.xp) - 1)));
}

export function makeWorker(s: GameState, kind: 'you' | 'zombie', type: string, at: Pt): Worker {
  const def = kind === 'zombie' ? CUSTOMER_BY_ID[type] : undefined;
  const stats = def ? { ...def.stats } : { ...YOU_STATS };
  return {
    id: `w${s.nextId++}`,
    kind,
    type,
    name: def ? def.zombieName : 'YOU',
    stats,
    energy: stats.energy,
    xp: 0,
    state: 'idle',
    x: at.x,
    y: at.y,
    path: [],
    speed: 0,
    facing: 1,
    nextDaydream: s.now + TUNING.daydreamBaseSec * stats.focus,
  };
}

/** Adds a furniture piece and any stove / counter record it needs. */
export function addFurniture(s: GameState, item: string, x: number, y: number, dir?: Dir): Furniture {
  const def = ITEM_BY_ID[item];
  const f: Furniture = { id: `f${s.nextId++}`, item, x, y };
  if (def.facing !== 'none') f.dir = dir ?? 'sw';
  if (def.kind === 'moneymaker') f.bank = 0;
  if (def.kind === 'tombstone') f.uses = 5;
  s.furniture.push(f);
  if (def.kind === 'stove') s.stoves.push({ id: `s${s.nextId++}`, furnitureId: f.id, kind: def.station!, status: 'empty' });
  if (def.kind === 'counter') s.counter.push({ id: `k${s.nextId++}`, furnitureId: f.id, servings: 0 });
  return f;
}

export function freshStats(): GameState['stats'] {
  return { served: 0, earned: 0, bites: 0, infected: 0, infectedRare: 0, happy: 0, angry: 0, burnt: 0, cleared: 0, floorsFixed: 0, cooked: {}, purchases: 0, raidsWon: 0, studied: 0, decor: 0 };
}

/** The starting café, as the original handed it over: a grimy 7x6 room with the bare essentials. */
export function createInitialState(seed = 1234): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    now: 0,
    rng: seed >>> 0 || 1,
    nextId: 1,
    cash: TUNING.startCash,
    sauce: TUNING.startSauce,
    xp: 0,
    level: 1,
    crewCap: crewCapForLevel(1),
    rating: TUNING.ratingStart,
    roomW: START_SIZE.w,
    roomH: START_SIZE.h,
    walls: { l: Array(START_SIZE.h).fill('dirty'), r: Array(START_SIZE.w).fill('dirty') },
    floors: {},
    wallItems: [],
    furniture: [],
    storage: {},
    stoves: [],
    counter: [],
    customers: [],
    workers: [],
    pets: [],
    fridge: [],
    recipes: [],
    seen: {},
    goalsDone: [],
    rivals: {},
    inventory: { headstone: 1, summon: 0 },
    spawnCooldown: 6,
    recentTypes: [],
    tut: 0,
    tutTimer: 0,
    freeInfects: 1,
    stats: freshStats(),
    events: [],
  };
  // grime: stained and loose tiles that count against the rating until you replace them
  for (const [x, y, f] of [
    [1, 4, 'stain'],
    [4, 3, 'stain'],
    [5, 1, 'stain'],
    [2, 5, 'loose'],
    [6, 4, 'loose'],
  ] as [number, number, string][])
    s.floors[`${x},${y}`] = f;
  // kitchen against the walls: stove (cook stands in front), counter, sink, fridge
  addFurniture(s, 'stove_dirty', 2, 0, 'sw');
  addFurniture(s, 'fridge_dirty', 0, 0, 'sw');
  addFurniture(s, 'counter_plain', 0, 2, 'se');
  addFurniture(s, 'sink_dirty', 0, 4, 'se');
  // two one-seat tables, each with its chair
  addFurniture(s, 'table_plain_white', 3, 3);
  addFurniture(s, 'chair_plain_white', 2, 3, 'se');
  addFurniture(s, 'table_plain_cream', 5, 4);
  addFurniture(s, 'chair_plain_cream', 5, 3, 'sw');
  addFurniture(s, 'plant_dead', 6, 0);
  s.wallItems.push({ id: `wl${s.nextId++}`, item: 'window_boarded', wall: 'l', index: 3 });
  s.workers.push(makeWorker(s, 'you', 'you', { x: DOOR_X - 1, y: 1 }));
  return s;
}

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** The bones a v3 save must have to be playable (anything less is treated as corrupt, not loaded). */
function validShape(st: GameState): boolean {
  if (![st.now, st.cash, st.sauce, st.xp, st.level, st.rng, st.nextId, st.roomW, st.roomH, st.rating].every(isNum)) return false;
  if (![st.workers, st.furniture, st.customers, st.stoves, st.counter].every(Array.isArray)) return false;
  if (!st.walls || !Array.isArray(st.walls.l) || !Array.isArray(st.walls.r)) return false;
  if (!st.workers.every((w) => w && typeof w.id === 'string' && isNum(w.x) && isNum(w.y) && isNum(w.energy) && typeof w.state === 'string' && w.stats)) return false;
  if (!st.workers.some((w) => w.kind === 'you')) return false;
  if (!st.furniture.every((f) => f && typeof f.id === 'string' && typeof f.item === 'string' && isNum(f.x) && isNum(f.y))) return false;
  return st.customers.every((c) => c && typeof c.id === 'string' && isNum(c.x) && isNum(c.y));
}

/**
 * Anyone still marked "out on a raid" (a save written mid-raid, or the app killed during one) comes
 * home: back on the sidewalk by the door, ready to work. Nothing else ever clears that state.
 */
export function repairRaiders(st: GameState) {
  for (const w of st.workers ?? []) {
    if (w.state !== 'raiding') continue;
    w.state = 'idle';
    w.x = DOOR_X;
    w.y = -1;
    w.path = [];
    w.job = undefined;
    w.restSpot = undefined;
  }
  for (const p of st.pets ?? []) if (p.state === 'raiding') p.state = 'roam';
}

/**
 * Dishes, items or customer types a content update renamed or removed: cleared out of stoves, counters,
 * the fridge, the crew's hands and the dining room, so one stale id can't break the whole save.
 */
function dropUnknownContent(st: GameState) {
  const ok = (d?: string) => !d || !!DISH_BY_ID[d];
  const gone = new Set(st.furniture.filter((f) => !ITEM_BY_ID[f.item]).map((f) => f.id));
  st.furniture = st.furniture.filter((f) => !gone.has(f.id));
  st.stoves = st.stoves.filter((x) => !gone.has(x.furnitureId) && st.furniture.some((f) => f.id === x.furnitureId));
  st.counter = st.counter.filter((x) => !gone.has(x.furnitureId));
  for (const x of st.stoves)
    if (!ok(x.dish)) {
      x.status = 'empty';
      x.dish = x.cookId = x.carrierId = undefined;
      x.left = x.total = x.burnAt = undefined;
    }
  for (const c of st.counter)
    if (!ok(c.dish)) {
      c.dish = undefined;
      c.servings = 0;
    }
  st.fridge = st.fridge.filter((f) => f && DISH_BY_ID[f.dish]);
  st.customers = st.customers.filter((c) => CUSTOMER_BY_ID[c.type] && ok(c.dish) && !(c.seatId && gone.has(c.seatId)) && !(c.tableId && gone.has(c.tableId)));
  for (const w of st.workers) {
    const j = w.job;
    const bad =
      (j?.kind === 'serve' && (!ok(j.dish) || !st.customers.some((c) => c.id === j.customerId))) ||
      (j?.kind === 'dish' && (!ok(j.dish) || !st.stoves.some((x) => x.id === j.stoveId))) ||
      (j?.kind === 'plate' && !st.furniture.some((f) => f.id === j.tableId)) ||
      !ok(w.pendingDish) ||
      (w.stoveId && !st.stoves.some((x) => x.id === w.stoveId));
    if (!bad) continue;
    w.job = undefined;
    w.pendingDish = undefined;
    w.stoveId = undefined;
    w.targetId = undefined;
    if (w.state !== 'raiding' && w.state !== 'down' && w.state !== 'resting') {
      w.state = 'idle';
      w.path = [];
    }
  }
  for (const c of st.customers) if (c.serverId && !st.workers.some((w) => w.id === c.serverId)) c.serverId = undefined;
}

/** Upgrade older saves in place. Returns null if the save can't be migrated. */
export function migrate(raw: unknown): GameState | null {
  const st = raw as (GameState & { version?: number }) | null;
  if (!st || typeof st !== 'object') return null;
  if (st.version === SAVE_VERSION) {
    if (!validShape(st)) return null;
    for (const k of ['pets', 'wallItems', 'fridge', 'recipes', 'goalsDone', 'recentTypes'] as const) if (!Array.isArray(st[k])) (st as unknown as Record<string, unknown>)[k] = [];
    for (const k of ['seen', 'rivals', 'storage', 'floors'] as const) if (!st[k] || typeof st[k] !== 'object') (st as unknown as Record<string, unknown>)[k] = {};
    repairRaiders(st);
    dropUnknownContent(st);
    // newer stat counters (e.g. decor) start at zero on older v3 saves
    st.stats = { ...freshStats(), ...(st.stats ?? {}) };
    // the never-used daily grave counters of earlier builds
    delete (st as { graves?: unknown }).graves;
    st.crewCap = Math.max(st.crewCap ?? 1, crewCapForLevel(st.level ?? 1));
    if (st.recipes) st.recipes = st.recipes.filter((r) => DISH_BY_ID[r]);
    return st;
  }
  if (st.version !== 2) return null;
  // v2 → v3: the café itself was rebuilt (one-seat tables, sinks, per-tile floors, a corner lot), so
  // start a fresh grimy café but keep the player's progress: level, money, recipes, crew, collections.
  const v2 = st as unknown as {
    level: number;
    xp: number;
    cash: number;
    sauce: number;
    recipes?: string[];
    seen?: GameState['seen'];
    goalsDone?: string[];
    rivals?: GameState['rivals'];
    fridge?: FridgeItem[];
    workers?: { kind: string; type: string }[];
    stats?: Partial<GameState['stats']>;
  };
  const s = createInitialState(st.rng || 1);
  s.level = Math.max(1, Math.min(40, v2.level | 0));
  s.xp = Math.max(0, v2.xp | 0);
  s.crewCap = crewCapForLevel(s.level);
  s.cash = Math.max(s.cash, Math.min(v2.cash | 0, 50000));
  s.sauce = Math.max(s.sauce, v2.sauce | 0);
  s.recipes = (v2.recipes ?? []).filter((r) => DISH_BY_ID[r]);
  s.seen = Object.fromEntries(Object.entries(v2.seen ?? {}).filter(([id]) => CUSTOMER_BY_ID[id]));
  s.rivals = v2.rivals ?? {};
  s.fridge = (v2.fridge ?? []).filter((f) => DISH_BY_ID[f.dish]);
  s.stats = { ...freshStats(), ...(v2.stats ?? {}), cooked: {} } as GameState['stats'];
  const crew = (v2.workers ?? []).filter((w) => w.kind === 'zombie' && CUSTOMER_BY_ID[w.type]).slice(0, s.crewCap);
  crew.forEach((w, i) => s.workers.push(makeWorker(s, 'zombie', w.type, { x: 1 + (i % 5), y: 1 + Math.floor(i / 5) })));
  return s;
}
