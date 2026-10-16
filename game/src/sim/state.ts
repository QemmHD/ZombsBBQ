import { CUSTOMER_BY_ID, TUNING, YOU_STATS, type StationKind, type ZombieStats } from './data';
import { ITEM_BY_ID, type Dir, type ThemeId } from './catalog';
import { DOOR_X, type Pt } from './grid';

export interface Furniture {
  id: string;
  /** catalog item id (see catalog.ts) */
  item: string;
  x: number;
  y: number;
  /** seats: the direction the sitter faces (toward the table) */
  dir?: Dir;
  /** money-makers: when the next payout is ready */
  payoutAt?: number;
  /** stoves: heat-lamp upgrade widens the burn window */
  keepWarm?: boolean;
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
  /** true while moving away from the camera (up the screen) → back view */
  back?: boolean;
}

export type CustomerState = 'entering' | 'waiting' | 'eating' | 'leaving' | 'turnedAway' | 'fleeing' | 'infecting';

export interface Customer extends Mover {
  id: string;
  type: string;
  state: CustomerState;
  seatId?: string;
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
  | 'toCounter'
  | 'carrying'
  | 'hunting'
  | 'toRest'
  | 'resting'
  | 'daydream'
  | 'raiding'
  | 'down';

export interface Worker extends Mover {
  id: string;
  kind: 'you' | 'zombie';
  /** customer type id for zombies, 'you' for the player */
  type: string;
  name: string;
  stats: ZombieStats;
  energy: number;
  state: WorkerState;
  stoveId?: string;
  pendingDish?: string;
  job?: { slotId: string; dish: string; customerId: string };
  targetId?: string;
  restSpot?: Pt;
  daydreamEnd?: number;
  nextDaydream: number;
  /** raid KO: back on their feet at this sim time */
  downUntil?: number;
}

export type StoveStatus = 'empty' | 'reserved' | 'cooking' | 'done' | 'burnt';

export interface Stove {
  id: string;
  furnitureId: string;
  kind: StationKind;
  status: StoveStatus;
  dish?: string;
  doneAt?: number;
  burnAt?: number;
  cookId?: string;
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
}

export interface FridgeItem {
  dish: string;
  servings: number;
}

export interface RivalProgress {
  stars: number;
  wins: number;
  nextAt: number;
}

export type GameEvent =
  | { t: 'coin'; x: number; y: number; amount: number; tip: number }
  | { t: 'face'; x: number; y: number; happy: boolean }
  | { t: 'xp'; x: number; y: number; amount: number }
  | { t: 'bite'; x: number; y: number; workerId: string; customerId: string }
  | { t: 'infected'; workerId: string }
  | { t: 'levelup'; level: number }
  | { t: 'dishDone'; stoveId: string }
  | { t: 'burnt'; stoveId: string }
  | { t: 'cookStart'; stoveId: string }
  | { t: 'payout'; furnitureId: string; amount: number }
  | { t: 'petFind'; petId: string; amount: number }
  | { t: 'goal'; goalId: string }
  | { t: 'daydream'; workerId: string }
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
  ratingPts: number;
  roomN: number;
  theme: ThemeId;
  ownedThemes: ThemeId[];
  furniture: Furniture[];
  walls: WallItem[];
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
  graves: { day: string; green: number; red: number };
  inventory: { headstone: number; summon: number };
  spawnCooldown: number;
  /** last few customer types, to keep the crowd varied */
  recentTypes: string[];
  tut: number;
  tutTimer: number;
  freeInfects: number;
  stats: {
    served: number;
    earned: number;
    bites: number;
    infected: number;
    infectedRare: number;
    happy: number;
    angry: number;
    cooked: Record<string, number>;
    purchases: number;
    raidsWon: number;
    studied: number;
  };
  events: GameEvent[];
}

export const SAVE_VERSION = 2;

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
    state: 'idle',
    x: at.x,
    y: at.y,
    path: [],
    speed: 0,
    facing: 1,
    nextDaydream: s.now + TUNING.daydreamBaseSec * stats.focus,
  };
}

/** Adds a furniture piece and any stove / counter-slot record it needs. */
export function addFurniture(s: GameState, item: string, x: number, y: number, dir?: Dir): Furniture {
  const def = ITEM_BY_ID[item];
  const f: Furniture = { id: `f${s.nextId++}`, item, x, y };
  if (dir) f.dir = dir;
  if (def.kind === 'moneymaker' && def.payout) f.payoutAt = s.now + def.payout.everySec;
  s.furniture.push(f);
  if (def.kind === 'stove') s.stoves.push({ id: `s${s.nextId++}`, furnitureId: f.id, kind: def.station!, status: 'empty' });
  if (def.kind === 'counter') s.counter.push({ id: `k${s.nextId++}`, furnitureId: f.id, servings: 0 });
  return f;
}

export function freshStats(): GameState['stats'] {
  return { served: 0, earned: 0, bites: 0, infected: 0, infectedRare: 0, happy: 0, angry: 0, cooked: {}, purchases: 0, raidsWon: 0, studied: 0 };
}

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
    crewCap: TUNING.startCrewCap,
    ratingPts: TUNING.ratingStart,
    roomN: 8,
    theme: 'shack',
    ownedThemes: ['shack'],
    furniture: [],
    walls: [],
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
    graves: { day: '', green: 5, red: 5 },
    inventory: { headstone: 1, summon: 0 },
    spawnCooldown: 4,
    recentTypes: [],
    tut: 0,
    tutTimer: 0,
    freeInfects: 1,
    stats: freshStats(),
    events: [],
  };
  // Kitchen along the back-right wall, counter along the back-left wall.
  addFurniture(s, 'grill', 2, 0);
  for (const y of [2, 3, 4]) addFurniture(s, 'counter', 0, y);
  addFurniture(s, 'fridge', 0, 6);
  addFurniture(s, 'plant', 0, 7);
  addFurniture(s, 'plant', 7, 0);
  // Picnic tables, each with a bench on either long side (one seat per bench).
  for (const [tx, ty] of [
    [3, 3],
    [6, 4],
    [3, 6],
  ]) {
    addFurniture(s, 'table_picnic', tx, ty);
    addFurniture(s, 'bench', tx - 1, ty, 'se');
    addFurniture(s, 'bench', tx + 1, ty, 'nw');
  }
  s.walls.push({ id: `wl${s.nextId++}`, item: 'wall_bottles', wall: 'l', index: 3 });
  s.workers.push(makeWorker(s, 'you', 'you', { x: DOOR_X - 1, y: 2 }));
  return s;
}

/** Upgrade older saves in place. Returns null if the save can't be migrated. */
export function migrate(raw: unknown): GameState | null {
  const st = raw as (GameState & { version?: number }) | null;
  if (!st || typeof st !== 'object') return null;
  if (st.version === SAVE_VERSION) return st;
  if (st.version !== 1) return null;
  // v1 → v2: furniture kinds became catalog items; new progression fields.
  const fresh = createInitialState(1);
  type V1Furniture = { id: string; kind: string; x: number; y: number; side?: number };
  const v1 = st as unknown as Omit<GameState, 'furniture'> & { furniture: V1Furniture[] };
  const kindToItem: Record<string, string> = { table: 'table_picnic', bench: 'bench', counter: 'counter', grill: 'grill', smoker: 'smoker', fridge: 'fridge', plant: 'plant', keg: 'barrel_keg' };
  const furniture: Furniture[] = v1.furniture
    .filter((f: V1Furniture) => !(f.kind === 'smoker' && v1.level < 4))
    .map((f: V1Furniture) => {
      const out: Furniture = { id: f.id, item: kindToItem[f.kind] ?? 'plant', x: f.x, y: f.y };
      if (f.kind === 'bench') out.dir = f.side === -1 ? 'se' : 'nw';
      return out;
    });
  const furnIds = new Set(furniture.map((f) => f.id));
  const out: GameState = {
    ...fresh,
    ...v1,
    version: SAVE_VERSION,
    furniture,
    stoves: v1.stoves.filter((x) => furnIds.has(x.furnitureId)).map((x) => ({ ...x, kind: x.kind ?? 'grill' })),
    roomN: 8,
    theme: 'shack',
    ownedThemes: ['shack'],
    walls: fresh.walls,
    storage: {},
    pets: [],
    fridge: [],
    recipes: [],
    seen: {},
    goalsDone: [],
    rivals: {},
    graves: fresh.graves,
    inventory: fresh.inventory,
    recentTypes: [],
    stats: { ...freshStats(), ...v1.stats, cooked: {} },
    events: [],
  };
  out.nextId = Math.max(out.nextId, fresh.nextId) + 1;
  return out;
}
