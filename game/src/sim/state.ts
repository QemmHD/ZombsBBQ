import { CUSTOMER_BY_ID, TUNING, YOU_STATS, type StationKind, type ZombieStats } from './data';
import { DOOR_X, type Pt } from './grid';

export type FurnitureKind = 'table' | 'bench' | 'counter' | 'grill' | 'smoker' | 'fridge' | 'plant' | 'keg';

export interface Furniture {
  id: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  /** bench: which table it belongs to */
  tableId?: string;
  /** bench: side of the table along x (-1 = bench at table.x - 1, drawn behind; +1 = at table.x + 1, in front) */
  side?: -1 | 1;
  locked?: boolean;
}

export interface Mover {
  x: number;
  y: number;
  path: Pt[];
  speed: number;
  /** +1 = facing screen-right, -1 = facing screen-left */
  facing: 1 | -1;
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
  | 'daydream';

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

export type GameEvent =
  | { t: 'coin'; x: number; y: number; amount: number; tip: number }
  | { t: 'face'; x: number; y: number; happy: boolean }
  | { t: 'xp'; x: number; y: number; amount: number }
  | { t: 'bite'; x: number; y: number; workerId: string; customerId: string }
  | { t: 'infected'; workerId: string }
  | { t: 'levelup'; level: number }
  | { t: 'dishDone'; stoveId: string }
  | { t: 'burnt'; stoveId: string }
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
  furniture: Furniture[];
  stoves: Stove[];
  counter: CounterSlot[];
  customers: Customer[];
  workers: Worker[];
  spawnCooldown: number;
  /** last few customer types, to keep the crowd varied */
  recentTypes?: string[];
  tut: number;
  tutTimer: number;
  freeInfects: number;
  stats: { served: number; earned: number; bites: number; infected: number; happy: number; angry: number };
  events: GameEvent[];
}

export const SAVE_VERSION = 1;

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
    furniture: [],
    stoves: [],
    counter: [],
    customers: [],
    workers: [],
    spawnCooldown: 4,
    tut: 0,
    tutTimer: 0,
    freeInfects: 1,
    stats: { served: 0, earned: 0, bites: 0, infected: 0, happy: 0, angry: 0 },
    events: [],
  };
  const add = (f: Omit<Furniture, 'id'>): Furniture => {
    const item = { ...f, id: `f${s.nextId++}` } as Furniture;
    s.furniture.push(item);
    return item;
  };
  // Kitchen along the back-right wall, counter along the back-left wall.
  const grill = add({ kind: 'grill', x: 2, y: 0 });
  const smoker = add({ kind: 'smoker', x: 3, y: 0, locked: true });
  s.stoves.push({ id: `s${s.nextId++}`, furnitureId: grill.id, kind: 'grill', status: 'empty' });
  s.stoves.push({ id: `s${s.nextId++}`, furnitureId: smoker.id, kind: 'smoker', status: 'empty' });
  for (const y of [2, 3, 4]) {
    const c = add({ kind: 'counter', x: 0, y });
    s.counter.push({ id: `c${s.nextId++}`, furnitureId: c.id, servings: 0 });
  }
  add({ kind: 'fridge', x: 0, y: 6 });
  add({ kind: 'plant', x: 0, y: 7 });
  add({ kind: 'plant', x: 7, y: 0 });
  // Picnic tables, each with a bench on either side (one seat per bench).
  for (const [tx, ty] of [
    [3, 3],
    [6, 4],
    [3, 6],
  ]) {
    const t = add({ kind: 'table', x: tx, y: ty });
    add({ kind: 'bench', x: tx - 1, y: ty, tableId: t.id, side: -1 });
    add({ kind: 'bench', x: tx + 1, y: ty, tableId: t.id, side: 1 });
  }
  s.workers.push(makeWorker(s, 'you', 'you', { x: DOOR_X - 1, y: 2 }));
  return s;
}
