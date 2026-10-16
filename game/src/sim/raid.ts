/**
 * Raids (v3), played like the original: a rival joint is a real café on its own street corner.
 *
 * - Your squad lines up single file on the sidewalk outside.
 * - Tap a zombie, then ATTACK to send it on a rampage, or tap a target for it: a person, or the
 *   counter to swipe a dish. ATTACK ALL sends everyone.
 * - Zombies walk to the door at their own speed and go in.
 * - The moment the fight starts, the diners scream and run for the door; catch one and it's lunch
 *   (cash you keep even if you lose). The waiters swarm your zombies.
 * - The Head Chef stays behind the counter in the kitchen, and fights anyone who comes in, until most
 *   of the staff are down. Then the chef storms out. Beat the chef to win.
 * - Tap a tombstone you own for a 5-second glow buff (one at a time).
 * - Wave the white flag to retreat. KO'd zombies reanimate back home later.
 *
 * A zombie's Energy is its health. Pure and deterministic (own RNG): the scene renders it, tests drive it.
 */
import { DISHES, DISH_BY_ID, TUNING, walkSpeed } from './data';
import { ITEM_BY_ID, type Dir } from './catalog';
import { DOOR_X, STREET_RUN, findPath, isInside, key, type Pt, type Room } from './grid';
import { maxEnergy, type GameState, type Worker } from './state';
import { addXp, addZombieXp, outsideSpot, releaseJob } from './sim';
import { GEN_STEP, RIVAL_BY_ID, rivalClosedSec, rivalGen, rivalReady, type RivalId } from './rivals';

export * from './rivals';

export const RAID_TIME = 180;
export const SUMMON_COST = 5; // Brain Sauce
export const BUFF_SEC = 5;
export const TOMBSTONE_USES = 5;
export const TOMBSTONE_RECHARGE = 24 * 3600;

export type UnitKind = 'zombie' | 'you' | 'pet' | 'summon' | 'staff' | 'boss' | 'customer';
export type UnitState = 'queued' | 'walk' | 'idle' | 'attack' | 'eat' | 'steal' | 'scream' | 'flee' | 'grabbed' | 'down' | 'gone';

/** What a zombie was told to do. */
export type Order = { kind: 'attack' } | { kind: 'target'; id: string } | { kind: 'steal'; slot: number };

export interface RaidUnit {
  id: string;
  side: 'z' | 'r' | 'c';
  kind: UnitKind;
  /** worker / pet id for your side */
  ref?: string;
  /** art id (character id) */
  art: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  cd: number;
  cdMax: number;
  state: UnitState;
  order?: Order;
  target?: string;
  /** where this unit stands guard / sits (staff post, the chef's spot, a diner's chair) */
  home?: Pt;
  seatId?: string;
  path: Pt[];
  repathAt: number;
  facing: 1 | -1;
  back?: boolean;
  /** time of the last attack / hit (for animation) */
  attackAt: number;
  hitAt: number;
  busyUntil: number;
  /** diners eaten, for zombie XP */
  eats: number;
}

export interface RaidFurniture {
  id: string;
  item: string;
  x: number;
  y: number;
  dir?: Dir;
}

export type RaidEvent =
  | { t: 'hit'; unit: string; by: string; dmg: number; x: number; y: number }
  | { t: 'ko'; unit: string; x: number; y: number }
  | {
      t: 'eat';
      unit: string;
      customer: string;
      cash: number;
      x: number;
      y: number;
    }
  | { t: 'steal'; unit: string; dish: string; x: number; y: number }
  | { t: 'scream'; unit: string; x: number; y: number }
  | { t: 'escape'; unit: string }
  | { t: 'enter'; unit: string }
  | { t: 'boss'; x: number; y: number }
  | { t: 'buff'; kind: 'str' | 'hp' }
  | { t: 'summon'; unit: string }
  | { t: 'end'; result: 'won' | 'lost' | 'retreat' };

export interface RaidState {
  rival: RivalId;
  name: string;
  gen: number;
  t: number;
  rng: number;
  room: Room;
  furniture: RaidFurniture[];
  wallItems: { item: string; wall: 'l' | 'r'; index: number }[];
  units: RaidUnit[];
  phase: 'fight' | 'won' | 'lost' | 'retreat';
  aggro: boolean;
  bossOut: boolean;
  buff?: { kind: 'str' | 'hp'; until: number };
  /** legacy "everyone pile on this" target (also used by tests) */
  focus?: string;
  cashEaten: number;
  stolen: string[];
  /** dishes on the rival's serving counter (all on one counter tile, stacked) */
  counter: { x: number; y: number; dish: string; servings: number }[];
  events: RaidEvent[];
  nextId: number;
}

export interface RaidResult {
  result: 'won' | 'lost' | 'retreat';
  cash: number;
  xp: number;
  sauce: number;
  dishes: string[];
  recipeDrop?: string;
  stars: number;
  kos: string[];
}

/** Anyone conscious and home can go. A cook just walks off (and their dish pauses until someone returns). */
export function raidCandidates(s: GameState): Worker[] {
  return s.workers.filter((w) => w.state !== 'down' && w.state !== 'raiding');
}

// ---------- setup ----------

function rnd(r: RaidState): number {
  let t = (r.rng = (r.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function unit(r: RaidState, u: Partial<RaidUnit> & Pick<RaidUnit, 'side' | 'kind' | 'art' | 'name' | 'x' | 'y' | 'hp' | 'dmg' | 'speed'>): RaidUnit {
  const full: RaidUnit = {
    id: `u${r.nextId++}`,
    maxHp: u.hp,
    cd: 0,
    cdMax: 1,
    state: 'idle',
    path: [],
    repathAt: 0,
    facing: -1,
    attackAt: -9,
    hitAt: -9,
    busyUntil: 0,
    eats: 0,
    ...u,
  } as RaidUnit;
  r.units.push(full);
  return full;
}

/** The kitchen: the two columns along the north-west wall, behind the dividers and the counter. */
export const KITCHEN_X = 1;
export const inKitchen = (r: RaidState, p: Pt) => Math.round(p.x) <= KITCHEN_X && isInside(Math.round(p.x), Math.round(p.y), r.room);
/** Where the counter sits (in the divider line), and where you stand to grab from it. */
export const counterTile = (_r: RaidState): Pt => ({ x: 2, y: 2 });
export const stealSpot = (_r: RaidState): Pt => ({ x: 3, y: 2 });
/** The gap in the divider line the chef comes out through. */
export const kitchenGap = (r: RaidState): Pt => ({ x: 2, y: r.room.h - 2 });

/** Lay out a rival joint the way the original's were: kitchen behind dividers, diners at tables. */
function buildCafe(r: RaidState) {
  const def = RIVAL_BY_ID[r.rival];
  const { w: W, h: H } = r.room;
  let n = 1;
  const add = (item: string, x: number, y: number, dir?: Dir) => r.furniture.push({ id: `rf${n++}`, item, x, y, dir });
  const stove = r.rival === 'chuck' || r.rival === 'vera' ? 'stove_plain' : r.rival === 'hank' || r.rival === 'crunch' ? 'stove_steel' : 'stove_super';
  // the kitchen along the north-west wall
  add(r.rival === 'snob' || r.rival === 'boss' ? 'fridge_steel' : 'fridge_plain', 0, 0, 'se');
  for (let y = 1; y < H - 1; y += 2) add(y === 3 && r.rival !== 'chuck' ? (r.rival === 'hank' ? 'grill' : r.rival === 'crunch' ? 'fryer' : r.rival === 'boss' ? 'smoker' : stove) : stove, 0, y, 'se');
  add('sink_steel', 0, H - 1, 'se');
  // the divider line, with the serving counter and a gap for the chef
  const ct = counterTile(r);
  const gap = kitchenGap(r);
  const divider = r.rival === 'chuck' ? 'divider_wood' : r.rival === 'crunch' || r.rival === 'boss' ? 'divider_brick' : 'divider_plain';
  for (let y = 0; y < H; y++) {
    if (y === ct.y) add(r.rival === 'snob' ? 'counter_bar' : 'counter_steel', ct.x, ct.y, 'se');
    else if (y !== gap.y) add(divider, 2, y);
  }
  // the dining room: one diner per table, chair in front of it. Aisles run along the divider line
  // (x = 3, so the counter and the kitchen gap stay open) and between the tables (x = 5, 7)
  const spots: Pt[] = [];
  for (let y = 2; y + 1 <= H - 1; y += 2) for (let x = 4; x <= W - 1; x += 2) spots.push({ x, y });
  spots.slice(0, def.tables).forEach((p) => {
    add(def.table, p.x, p.y);
    add(def.chair, p.x, p.y + 1, 'ne');
  });
  add(r.rival === 'vera' ? 'plant_tree' : 'plant_potted', W - 1, 0);
  // walls: the shop sign over the door is drawn by the scene; a couple of hangings inside
  r.wallItems.push(
    { item: 'menu_board', wall: 'l', index: Math.min(H - 1, 2) },
    {
      item: r.rival === 'chuck' ? 'skull_longhorn' : r.rival === 'snob' ? 'painting_zombie' : 'clock',
      wall: 'r',
      index: 1,
    },
  );
}

function blockedTiles(r: RaidState): Set<string> {
  return new Set(r.furniture.map((f) => key(f.x, f.y)));
}

export function startRaid(s: GameState, rivalId: RivalId, workerIds: string[], petIds: string[] = []): RaidState | string {
  const def = RIVAL_BY_ID[rivalId];
  if (!def) return 'Unknown joint.';
  const notReady = rivalReady(s, rivalId);
  if (notReady) return notReady;
  const candidates = new Set(raidCandidates(s).map((w) => w.id));
  const squad = workerIds.filter((id) => candidates.has(id));
  if (!squad.length) return 'Pick at least one zombie for the squad.';
  const gen = rivalGen(s, rivalId);
  const tough = 1 + gen * GEN_STEP;
  const r: RaidState = {
    rival: rivalId,
    name: def.name,
    gen,
    t: 0,
    rng: (s.rng ^ 0x9e3779b9) >>> 0 || 7,
    room: { ...def.room },
    furniture: [],
    wallItems: [],
    units: [],
    phase: 'fight',
    aggro: false,
    bossOut: false,
    cashEaten: 0,
    stolen: [],
    counter: [],
    events: [],
    nextId: 1,
  };
  buildCafe(r);
  const ct = counterTile(r);
  r.counter = def.dishes.map((d) => ({
    x: ct.x,
    y: ct.y,
    dish: d,
    servings: 1,
  }));
  const W = r.room.w;
  // your squad, single file on the sidewalk past the end of their wall
  const n = squad.length + petIds.length;
  const sp = Math.min(0.8, (STREET_RUN - 0.6) / Math.max(1, n));
  let slot = 0;
  for (const id of squad) {
    const w = s.workers.find((x) => x.id === id)!;
    releaseJob(s, w);
    w.state = 'raiding';
    w.path = [];
    const isYou = w.kind === 'you';
    unit(r, {
      side: 'z',
      kind: isYou ? 'you' : 'zombie',
      ref: w.id,
      art: isYou ? 'you' : `${w.type}_z`,
      name: w.name,
      x: W + 0.4 + slot++ * sp,
      y: -1,
      hp: Math.max(1, w.energy),
      maxHp: maxEnergy(w),
      dmg: 3 + w.stats.power * 1.6,
      speed: walkSpeed(w.stats.speed) * 1.15,
      cdMax: 0.9,
      state: 'queued',
    });
  }
  for (const id of petIds) {
    const p = s.pets.find((x) => x.id === id);
    if (!p || p.state === 'raiding') continue;
    p.state = 'raiding';
    const rot = p.type === 'rotweiler';
    unit(r, {
      side: 'z',
      kind: 'pet',
      ref: p.id,
      art: rot ? 'pet_rotweiler' : 'pet_pug',
      name: rot ? 'Rot-weiler' : 'Zombie Pug',
      x: W + 0.4 + slot++ * sp,
      y: -1,
      hp: rot ? 90 : 45,
      dmg: rot ? 9 : 4,
      speed: rot ? 2.4 : 2.0,
      cdMax: 0.7,
      state: 'queued',
    });
  }
  // the diners, each on their chair facing their table
  const diners = ['accountant', 'teen', 'yoga', 'politician', 'nurse', 'joe', 'jane', 'senior', 'hipster', 'ceo'];
  r.furniture
    .filter((f) => ITEM_BY_ID[f.item]?.kind === 'chair')
    .forEach((c, i) => {
      unit(r, {
        side: 'c',
        kind: 'customer',
        art: diners[(i * 3 + gen) % diners.length],
        name: 'Diner',
        x: c.x,
        y: c.y,
        hp: 2,
        dmg: 0,
        speed: 1.7,
        seatId: c.id,
        home: { x: c.x, y: c.y },
        back: true,
        facing: 1,
      });
    });
  // the waiters, on their posts in the aisles
  const posts: Pt[] = [];
  for (const x of [3, 5, 7]) for (let y = 1; y < r.room.h; y++) if (x < W && !blockedTiles(r).has(key(x, y))) posts.push({ x, y });
  const pick = posts.filter((_, i) => i % 2 === 0).concat(posts.filter((_, i) => i % 2 === 1));
  for (let i = 0; i < def.staff.count; i++) {
    const p = pick[i % pick.length];
    unit(r, {
      side: 'r',
      kind: 'staff',
      art: i % 2 ? `staff_${rivalId}_b` : `staff_${rivalId}`,
      name: i % 2 ? 'Waitress' : 'Waiter',
      x: p.x,
      y: p.y,
      home: p,
      hp: Math.round(def.staff.hp * tough),
      dmg: def.staff.dmg * tough,
      speed: 1.5,
      cdMax: 1.1,
    });
  }
  // the Head Chef, at the first stove (as in the original, where the chef starts at the stove)
  const chef = { x: KITCHEN_X, y: 1 };
  unit(r, {
    side: 'r',
    kind: 'boss',
    art: `boss_${rivalId}`,
    name: def.chef,
    x: chef.x,
    y: chef.y,
    home: chef,
    hp: Math.round(def.boss.hp * tough),
    dmg: def.boss.dmg * tough,
    speed: 1.3,
    cdMax: 1.2,
    facing: 1,
  });
  return r;
}

// ---------- player commands ----------

const fighter = (u: RaidUnit) => u.side === 'z' && u.hp > 0 && u.state !== 'down' && u.state !== 'gone';

/** Give one of your zombies an order (from the line-up, or already inside). */
export function order(r: RaidState, unitId: string, o: Order): string | null {
  const u = r.units.find((x) => x.id === unitId);
  if (!u || !fighter(u)) return 'They’re out of the fight.';
  if (o.kind === 'steal') {
    const c = r.counter[o.slot];
    if (!c || c.servings <= 0) return 'Already swiped!';
    if (u.kind === 'pet' || u.kind === 'summon') return 'Only zombies can carry food.';
  }
  if (o.kind === 'target') {
    const t = r.units.find((x) => x.id === o.id);
    if (!t || t.side === 'z' || t.hp <= 0 || t.state === 'gone' || t.state === 'down') return 'Pick someone still standing.';
  }
  u.order = o;
  if (u.state === 'queued') {
    u.state = 'walk';
    r.events.push({ t: 'enter', unit: u.id });
  }
  u.path = [];
  u.repathAt = 0;
  return null;
}

/** Send the next zombie in line (or a given one) on a rampage. */
export function sendOne(r: RaidState, unitId?: string): string | null {
  const u = unitId ? r.units.find((x) => x.id === unitId && x.state === 'queued') : r.units.find((x) => x.side === 'z' && x.state === 'queued');
  if (!u) return 'Everyone is already in!';
  return order(r, u.id, { kind: 'attack' });
}

/** ATTACK ALL: everyone still in line charges in. */
export function sendAll(r: RaidState): string | null {
  const q = r.units.filter((x) => x.side === 'z' && x.state === 'queued');
  if (!q.length) return 'Everyone is already in!';
  for (const u of q) order(r, u.id, { kind: 'attack' });
  return null;
}

/** Point everyone who's in at one target. */
export function focusTarget(r: RaidState, unitId: string): string | null {
  const t = r.units.find((x) => x.id === unitId);
  if (!t || t.side === 'z' || t.hp <= 0 || t.state === 'gone' || t.state === 'down') return null;
  r.focus = t.id;
  for (const u of r.units) if (fighter(u) && u.state !== 'queued' && u.order?.kind !== 'steal') u.order = { kind: 'target', id: t.id };
  return null;
}

/** Tap the counter with nobody picked: the nearest zombie (in or in line) goes for the food. */
export function stealDish(r: RaidState, slot: number): string | null {
  const c = r.counter[slot];
  if (!c || c.servings <= 0) return 'Already swiped!';
  if (r.units.some((u) => u.order?.kind === 'steal' && u.order.slot === slot && fighter(u))) return 'Someone’s already on it.';
  const spot = stealSpot(r);
  const z = r.units.filter((u) => fighter(u) && (u.kind === 'zombie' || u.kind === 'you') && u.state !== 'eat').sort((a, b) => dist(a, spot) - dist(b, spot))[0];
  if (!z) return 'Send in a zombie first!';
  return order(r, z.id, { kind: 'steal', slot });
}

/** Tap a tombstone you own: every zombie glows with its blessing for 5 seconds. */
export function useTombstone(s: GameState, r: RaidState, furnitureId: string): string | null {
  const f = s.furniture.find((x) => x.id === furnitureId);
  const def = f && ITEM_BY_ID[f.item];
  if (!f || !def?.boost) return 'That’s not a tombstone.';
  if (r.buff && r.t < r.buff.until) return 'One blessing at a time!';
  if ((f.usesResetAt ?? 0) && s.now >= (f.usesResetAt ?? 0)) {
    f.uses = TOMBSTONE_USES;
    f.usesResetAt = undefined;
  }
  if ((f.uses ?? 0) <= 0) return `Recharging: back in ${Math.ceil(((f.usesResetAt ?? 0) - s.now) / 3600)} h.`;
  f.uses = (f.uses ?? 0) - 1;
  if (f.uses <= 0) f.usesResetAt = s.now + TOMBSTONE_RECHARGE;
  r.buff = { kind: def.boost, until: r.t + BUFF_SEC };
  r.events.push({ t: 'buff', kind: def.boost });
  return null;
}

export function useSummon(s: GameState, r: RaidState): string | null {
  if (s.inventory.summon <= 0) return 'No Summon Stones. Buy one before the raid.';
  if (r.units.filter((u) => u.kind === 'summon' && u.hp > 0).length >= 3) return 'Three Big Foot-Longs is the legal limit.';
  s.inventory.summon--;
  const u = unit(r, {
    side: 'z',
    kind: 'summon',
    art: 'bigfoot',
    name: 'Big Foot-Long',
    x: DOOR_X + 1,
    y: -1,
    hp: 420,
    dmg: 22,
    speed: 1.3,
    cdMax: 1.3,
    state: 'walk',
    order: { kind: 'attack' },
  });
  r.events.push({ t: 'summon', unit: u.id });
  return null;
}

export function buySummon(s: GameState): string | null {
  if (s.level < 5) return 'Summon Stones unlock at level 5.';
  if (s.sauce < SUMMON_COST) return 'Not enough Brain Sauce!';
  s.sauce -= SUMMON_COST;
  s.inventory.summon++;
  return null;
}

/** Wave the white flag. */
export function retreat(r: RaidState) {
  if (r.phase !== 'fight') return;
  r.phase = 'retreat';
  r.events.push({ t: 'end', result: 'retreat' });
}

// ---------- simulation ----------

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const alive = (u: RaidUnit) => u.hp > 0 && u.state !== 'down' && u.state !== 'gone';
const indoors = (r: RaidState, p: Pt) => isInside(Math.round(p.x), Math.round(p.y), r.room);
/** Close enough to swing at (next tile over, diagonals included). */
const REACH = 1.5;

/** Global combat pace: every blow does this share of its listed damage, so brawls last ~40–90 s. */
export const COMBAT_PACE = 0.3;

function face(u: RaidUnit, dx: number, dy: number) {
  const sdx = dx - dy;
  if (Math.abs(sdx) > 0.02) u.facing = sdx > 0 ? 1 : -1;
  u.back = dx + dy < -0.02;
}

/** Walk the current path. Returns true when there's nowhere left to go. */
function walk(u: RaidUnit, dt: number): boolean {
  let left = u.speed * dt;
  while (left > 0 && u.path.length) {
    const n = u.path[0];
    const dx = n.x - u.x;
    const dy = n.y - u.y;
    const d = Math.hypot(dx, dy);
    face(u, dx, dy);
    if (d <= left) {
      u.x = n.x;
      u.y = n.y;
      u.path.shift();
      left -= d;
    } else {
      u.x += (dx / d) * left;
      u.y += (dy / d) * left;
      left = 0;
    }
  }
  return u.path.length === 0;
}

/** Plot a path to a goal tile (allowed to end on furniture, e.g. a chair). */
function goTo(r: RaidState, u: RaidUnit, goal: Pt): boolean {
  const p = findPath({ x: Math.round(u.x), y: Math.round(u.y) }, goal, blockedTiles(r), r.room);
  if (!p) return false;
  // already on the goal tile: still step onto its centre
  u.path = p.length ? p : [{ x: goal.x, y: goal.y }];
  return true;
}

/** A free floor tile next to the target, spreading attackers around it instead of stacking them. */
function besideTile(r: RaidState, u: RaidUnit, t: RaidUnit): Pt | null {
  const blocked = blockedTiles(r);
  const tx = Math.round(t.x);
  const ty = Math.round(t.y);
  const taken = new Map<string, number>();
  for (const o of r.units) {
    if (o === u || !alive(o)) continue;
    const g = o.path.at(-1) ?? { x: Math.round(o.x), y: Math.round(o.y) };
    const k = key(g.x, g.y);
    taken.set(k, (taken.get(k) ?? 0) + 1);
  }
  let best: Pt | null = null;
  let bestScore = Infinity;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const x = tx + dx;
    const y = ty + dy;
    if (blocked.has(key(x, y))) continue;
    if (!isInside(x, y, r.room) && !(y === -1 && x >= -1)) continue;
    const score = Math.abs(x - u.x) + Math.abs(y - u.y) + (taken.get(key(x, y)) ?? 0) * 2.5 + (dx && dy ? 0.4 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }
  return best;
}

function damage(r: RaidState, from: RaidUnit, to: RaidUnit) {
  const str = from.side === 'z' && r.buff?.kind === 'str' && r.t < r.buff.until ? 1.6 : 1;
  from.attackAt = r.t;
  to.hitAt = r.t;
  if (to.kind === 'customer') {
    // scratch, then eat: the first swipe grabs them, the second is lunch
    to.hp -= 1;
    r.events.push({
      t: 'hit',
      unit: to.id,
      by: from.id,
      dmg: 1,
      x: to.x,
      y: to.y,
    });
    if (to.hp > 0) {
      to.state = 'grabbed';
      to.busyUntil = r.t + 0.9;
      to.path = [];
      return;
    }
    const def = RIVAL_BY_ID[r.rival];
    const cash = Math.round(def.cashPerCustomer * (1 + r.gen * GEN_STEP));
    to.state = 'gone';
    from.state = 'eat';
    from.busyUntil = r.t + 1.4;
    from.hp = Math.min(from.maxHp, from.hp + 5); // original: +5 per kill
    from.eats++;
    r.cashEaten += cash;
    r.events.push({
      t: 'eat',
      unit: from.id,
      customer: to.id,
      cash,
      x: to.x,
      y: to.y,
    });
    return;
  }
  const dmg = Math.round(from.dmg * str * COMBAT_PACE * (0.85 + rnd(r) * 0.3) * 10) / 10;
  to.hp -= dmg;
  r.events.push({ t: 'hit', unit: to.id, by: from.id, dmg, x: to.x, y: to.y });
  aggro(r);
  if (to.hp <= 0) {
    to.hp = 0;
    to.state = 'down';
    to.path = [];
    to.busyUntil = r.t + 1.2;
    r.events.push({ t: 'ko', unit: to.id, x: to.x, y: to.y });
    if (r.focus === to.id) r.focus = undefined;
  }
}

/** Close in on a target and swing when in reach. */
function fight(r: RaidState, u: RaidUnit, t: RaidUnit, dt: number) {
  u.target = t.id;
  if (dist(u, t) <= REACH) {
    u.path = [];
    face(u, t.x - u.x, t.y - u.y);
    u.state = 'attack';
    u.cd -= dt;
    if (u.cd <= 0) {
      u.cd = u.cdMax;
      damage(r, u, t);
    }
    return;
  }
  u.state = 'walk';
  if (r.t >= u.repathAt || !u.path.length) {
    u.repathAt = r.t + 0.45;
    const spot = besideTile(r, u, t);
    if (spot) goTo(r, u, spot);
  }
  walk(u, dt);
}

/** The fight starts: diners panic, staff come at you. */
function aggro(r: RaidState) {
  if (r.aggro) return;
  r.aggro = true;
  for (const c of r.units)
    if (c.kind === 'customer' && alive(c)) {
      c.state = 'scream';
      c.busyUntil = r.t + 0.6 + rnd(r) * 0.8;
      r.events.push({ t: 'scream', unit: c.id, x: c.x, y: c.y });
    }
}

function nearest<T extends Pt>(p: Pt, list: T[]): T | undefined {
  let best: T | undefined;
  let bd = Infinity;
  for (const o of list) {
    const d = dist(p, o);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

function updateHorde(r: RaidState, u: RaidUnit, dt: number) {
  if (u.state === 'queued' || !alive(u) || r.t < u.busyUntil) return;
  if (u.state === 'eat' || u.state === 'steal') u.state = 'walk';
  // walking in through the door sets things off
  if (!r.aggro && indoors(r, u)) aggro(r);
  const o = u.order ?? { kind: 'attack' };
  // 1) grab food off the counter
  if (o.kind === 'steal') {
    const c = r.counter[o.slot];
    if (!c || c.servings <= 0) u.order = { kind: 'attack' };
    else {
      const spot = stealSpot(r);
      if (dist(u, spot) > 0.15) {
        if (r.t >= u.repathAt || !u.path.length) {
          u.repathAt = r.t + 1;
          goTo(r, u, spot);
        }
        u.state = 'walk';
        walk(u, dt);
        return;
      }
      face(u, c.x - u.x, c.y - u.y);
      c.servings = 0;
      r.stolen.push(c.dish);
      u.busyUntil = r.t + 2; // original: swiping a dish takes 2 s
      u.state = 'steal';
      u.order = { kind: 'attack' };
      r.events.push({ t: 'steal', unit: u.id, dish: c.dish, x: u.x, y: u.y });
      return;
    }
  }
  // 2) a specific target
  if (o.kind === 'target') {
    const t = r.units.find((x) => x.id === o.id && alive(x));
    if (t) return fight(r, u, t, dt);
    u.order = { kind: 'attack' };
  }
  // 3) rampage: diners first (zombies can't resist), else the nearest waiter, else the chef
  const chef = r.units.find((x) => x.kind === 'boss')!;
  const diners = r.units.filter((x) => x.kind === 'customer' && alive(x) && (indoors(r, x) || dist(u, x) < 4));
  const staff = r.units.filter((x) => x.kind === 'staff' && alive(x));
  const pet = u.kind === 'pet' || u.kind === 'summon';
  const d = pet ? undefined : nearest(u, diners);
  const e = nearest(u, staff);
  if (d && (!e || dist(u, d) < dist(u, e) + 1.5)) return fight(r, u, d, dt);
  if (e) return fight(r, u, e, dt);
  if (alive(chef)) return fight(r, u, chef, dt);
  if (d) return fight(r, u, d, dt);
}

function updateStaff(r: RaidState, u: RaidUnit, dt: number) {
  if (!alive(u) || r.t < u.busyUntil) return;
  const horde = r.units.filter((o) => fighter(o) && o.state !== 'queued' && o.y > -0.6);
  if (!r.aggro) return;
  // waiters stay in their own café; anyone who comes in gets swarmed
  const t = nearest(
    u,
    horde.filter((h) => indoors(r, h)),
  );
  if (t) return fight(r, u, t, dt);
  u.state = 'idle';
  if (u.home && dist(u, u.home) > 0.2) {
    if (!u.path.length) goTo(r, u, u.home);
    walk(u, dt);
  }
}

function updateChef(r: RaidState, u: RaidUnit, dt: number) {
  if (!alive(u) || r.t < u.busyUntil) return;
  const horde = r.units.filter((o) => fighter(o) && o.state !== 'queued' && indoors(r, o));
  if (!r.bossOut) {
    // the chef guards the kitchen: anyone who wanders back here gets the cleaver
    const t = nearest(
      u,
      horde.filter((h) => inKitchen(r, h)),
    );
    if (t) return fight(r, u, t, dt);
    u.state = 'idle';
    if (u.home && dist(u, u.home) > 0.2) {
      if (!u.path.length) goTo(r, u, u.home);
      walk(u, dt);
    } else face(u, 1, 0);
    return;
  }
  const t = nearest(u, horde);
  if (t) fight(r, u, t, dt);
}

function updateDiner(r: RaidState, c: RaidUnit, dt: number) {
  if (!alive(c) || !r.aggro || r.t < c.busyUntil) return;
  // screaming and running for the door, then off down the street
  const exit = { x: -1, y: r.room.h + STREET_RUN };
  if (c.state !== 'flee') {
    c.state = 'flee';
    c.path = [];
  }
  if (!c.path.length) {
    if (dist(c, exit) < 0.3) {
      c.state = 'gone';
      r.events.push({ t: 'escape', unit: c.id });
      return;
    }
    goTo(r, c, exit);
  }
  walk(c, dt);
}

export function stepRaid(r: RaidState, dt: number) {
  if (r.phase !== 'fight') return;
  r.t += dt;
  // the Head Chef storms out once most of the waiters are down (or the brawl drags on)
  const chef = r.units.find((u) => u.kind === 'boss')!;
  if (!r.bossOut && r.aggro) {
    const staff = r.units.filter((u) => u.kind === 'staff');
    const down = staff.filter((u) => u.hp <= 0).length;
    if (down >= Math.ceil(staff.length * 0.6) || r.t > 100) {
      r.bossOut = true;
      r.events.push({ t: 'boss', x: chef.x, y: chef.y });
    }
  }
  // the health tombstone mends everyone while it glows
  if (r.buff?.kind === 'hp' && r.t < r.buff.until) for (const u of r.units) if (fighter(u) && u.state !== 'queued') u.hp = Math.min(u.maxHp, u.hp + 6 * dt);
  for (const u of r.units) {
    if (u.side === 'z') updateHorde(r, u, dt);
    else if (u.kind === 'staff') updateStaff(r, u, dt);
    else if (u.kind === 'boss') updateChef(r, u, dt);
    else updateDiner(r, u, dt);
  }
  if (chef.hp <= 0) {
    r.phase = 'won';
    r.events.push({ t: 'end', result: 'won' });
  } else if (r.units.filter((u) => u.side === 'z').every((u) => u.hp <= 0)) {
    r.phase = 'lost';
    r.events.push({ t: 'end', result: 'lost' });
  } else if (r.t >= RAID_TIME) {
    r.phase = 'lost';
    r.events.push({ t: 'end', result: 'lost' });
  }
  if (r.events.length > 300) r.events.splice(0, r.events.length - 300);
}

// ---------- wrap-up ----------

/** Apply the raid's outcome to the joint: cash, loot to the Fridge, KOs, XP, rival progress. */
export function finishRaid(s: GameState, r: RaidState): RaidResult {
  if (r.phase === 'fight') retreat(r);
  const def = RIVAL_BY_ID[r.rival];
  const won = r.phase === 'won';
  const out: RaidResult = {
    result: r.phase as RaidResult['result'],
    cash: r.cashEaten,
    xp: 0,
    sauce: 0,
    dishes: [...r.stolen],
    stars: 0,
    kos: [],
  };
  // your squad comes home (or gets dumped on the sidewalk, out cold)
  for (const u of r.units) {
    if (u.side !== 'z') continue;
    if (u.kind === 'pet') {
      const p = s.pets.find((x) => x.id === u.ref);
      if (p) p.state = 'roam';
      continue;
    }
    if (u.kind === 'summon') continue;
    const w = s.workers.find((x) => x.id === u.ref);
    if (!w) continue;
    w.x = DOOR_X;
    w.y = -1;
    w.path = [];
    if (u.state === 'queued') {
      w.state = 'idle';
      continue;
    }
    if (w.kind === 'zombie') addZombieXp(s, w, 2 * u.eats + (u.hp > 0 ? 3 : 1));
    if (u.hp <= 0) {
      w.energy = 0;
      w.state = 'down';
      w.downUntil = s.now + TUNING.reanimateSec;
      const spot = outsideSpot(s, w);
      w.x = spot.x;
      w.y = spot.y;
      w.restSpot = spot;
      out.kos.push(w.name);
    } else {
      w.energy = Math.min(maxEnergy(w), Math.round(u.hp));
      w.state = 'idle';
    }
  }
  const prog = s.rivals[r.rival] ?? { stars: 0, wins: 0, nextAt: 0 };
  prog.lastRaid = s.now;
  const mult = 1 + r.gen * GEN_STEP;
  if (won) {
    const horde = r.units.filter((u) => u.side === 'z' && u.state !== 'queued' && (u.kind === 'zombie' || u.kind === 'you'));
    const standing = horde.filter((u) => u.hp > 0).length;
    out.stars = 1 + (standing >= Math.ceil(horde.length / 2) ? 1 : 0) + (r.t <= 75 ? 1 : 0);
    out.cash += Math.round(def.reward.cash * mult);
    out.xp = Math.round(def.reward.xp * mult);
    // the chef sometimes drops Brain Sauce (the boss café always does)
    if (r.rival === 'boss') out.sauce = 3 + (rnd(r) < 0.5 ? 2 : 0);
    else if (rnd(r) < Math.min(0.95, def.reward.sauceChance * (r.t < 75 ? 1.3 : 1))) out.sauce = 1 + (rnd(r) < 0.3 ? 1 : 0);
    // a recipe: the signature the first time (then 35%); the boss café hands over a secret you don't know
    if (r.rival === 'boss') {
      const secret = DISHES.filter((d) => d.source === 'raid' && !s.recipes.includes(d.id));
      if (secret.length) out.recipeDrop = secret[Math.floor(rnd(r) * secret.length)].id;
    } else if (!s.recipes.includes(def.signature) && (prog.wins === 0 || rnd(r) < 0.35)) out.recipeDrop = def.signature;
    if (out.recipeDrop && !out.dishes.includes(out.recipeDrop)) out.dishes.push(out.recipeDrop);
    prog.wins++;
    prog.stars = Math.max(prog.stars, out.stars);
    // wrecked: boarded up, then new management (a bit tougher, a bit richer)
    prog.nextAt = s.now + rivalClosedSec(prog.gen ?? 0);
    prog.gen = (prog.gen ?? 0) + (r.rival === 'boss' ? 0 : 1);
    s.stats.raidsWon++;
  } else {
    prog.nextAt = s.now + 60;
    out.xp = Math.round(def.reward.xp * 0.15);
  }
  s.rivals[r.rival] = prog;
  s.cash += out.cash;
  s.stats.earned += out.cash;
  s.sauce += out.sauce;
  if (out.xp) addXp(s, out.xp);
  for (const d of out.dishes)
    s.fridge.push({
      dish: d,
      servings: Math.max(6, Math.round(DISH_BY_ID[d].servings / 2)),
    });
  if (s.fridge.length > 12) s.fridge.splice(0, s.fridge.length - 12);
  return out;
}
