/**
 * Raids: send your zombies (and pets) to attack a rival joint, like the original.
 *
 * Flow: pick a rival on the map → choose the squad → they line up on the sidewalk → Send one or
 * Send All → zombies bash the gate, the rival staff swarm, customers get eaten (cash you keep even
 * if you lose), tap the counter to steal a dish, and the Head Chef comes out once the room is mostly
 * cleared. Beat the Head Chef to win. A zombie's Energy is its health; KO'd zombies reanimate later.
 *
 * Pure and deterministic (own RNG): the scene renders it, tests drive it.
 */
import { DISH_BY_ID, TUNING } from './data';
import type { GameState } from './state';
import { addXp, releaseJob } from './sim';
import { refreshDaily } from './progress';
import type { Pt } from './grid';

export type RivalId = 'chuck' | 'hank' | 'vera' | 'crunch' | 'snob';

export interface RivalDef {
  id: RivalId;
  name: string;
  chef: string;
  level: number;
  staff: { count: number; hp: number; dmg: number };
  boss: { hp: number; dmg: number };
  dogs: number;
  zappers: number;
  gateHp: number;
  customers: number;
  cashPerCustomer: number;
  dishes: string[];
  signature: string;
  reward: { cash: number; xp: number; sauceChance: number };
  taunt: string;
}

export const RIVALS: RivalDef[] = [
  { id: 'chuck', name: "Chuck Wagon's Chow Hall", chef: 'Chef Chuck', level: 2, staff: { count: 3, hp: 32, dmg: 3 }, boss: { hp: 230, dmg: 9 }, dogs: 0, zappers: 0, gateHp: 60, customers: 3, cashPerCustomer: 15, dishes: ['hotdog', 'chili'], signature: 'chili', reward: { cash: 250, xp: 60, sauceChance: 0.25 }, taunt: 'Git along, little zombie!' },
  { id: 'hank', name: "Big Hank's Burger Barn", chef: 'Big Hank', level: 4, staff: { count: 4, hp: 48, dmg: 4 }, boss: { hp: 420, dmg: 13 }, dogs: 1, zappers: 0, gateHp: 100, customers: 4, cashPerCustomer: 25, dishes: ['burger', 'smash'], signature: 'smash', reward: { cash: 600, xp: 120, sauceChance: 0.3 }, taunt: 'You want fries with that beatdown?' },
  { id: 'vera', name: "Vegan Vera's Salad Fortress", chef: 'Vegan Vera', level: 6, staff: { count: 5, hp: 62, dmg: 5 }, boss: { hp: 640, dmg: 16 }, dogs: 1, zappers: 1, gateHp: 150, customers: 4, cashPerCustomer: 35, dishes: ['wings', 'salad'], signature: 'salad', reward: { cash: 1200, xp: 220, sauceChance: 0.35 }, taunt: 'Brains are NOT plant-based!' },
  { id: 'crunch', name: "Colonel Crunch's Chicken Shack", chef: 'Colonel Crunch', level: 8, staff: { count: 6, hp: 70, dmg: 5 }, boss: { hp: 800, dmg: 16 }, dogs: 2, zappers: 1, gateHp: 200, customers: 5, cashPerCustomer: 50, dishes: ['rings', 'chicken'], signature: 'chicken', reward: { cash: 2400, xp: 380, sauceChance: 0.4 }, taunt: 'My secret recipe stays SECRET!' },
  { id: 'snob', name: 'Le Snob Bistro', chef: 'Chef Le Snob', level: 10, staff: { count: 6, hp: 90, dmg: 6 }, boss: { hp: 1150, dmg: 20 }, dogs: 2, zappers: 2, gateHp: 260, customers: 5, cashPerCustomer: 80, dishes: ['ribs', 'foie'], signature: 'foie', reward: { cash: 5000, xp: 650, sauceChance: 0.5 }, taunt: 'Zut alors! No shirt, no shoes, no SERVICE!' },
];
export const RIVAL_BY_ID: Record<string, RivalDef> = Object.fromEntries(RIVALS.map((r) => [r.id, r]));

export const RAID_TIME = 120;
export const RIVAL_COOLDOWN = 5 * 60;
export const ARENA_N = 6;
export const GATE_X = 2; // gate on the front-left edge, between (2,5) and (2,6)
export const LINE_Y = 8; // sidewalk where the horde lines up
export const HEADSTONE_COST = 300;
export const SUMMON_COST = 5; // Brain Sauce

export type UnitKind = 'zombie' | 'you' | 'pet' | 'summon' | 'staff' | 'boss' | 'dog' | 'zapper' | 'gate' | 'customer';
export type UnitState = 'queued' | 'walk' | 'idle' | 'eat' | 'steal' | 'flee' | 'down' | 'gone' | 'hidden';

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
  range: number;
  speed: number;
  cd: number;
  cdMax: number;
  state: UnitState;
  target?: string;
  path: Pt[];
  repathAt: number;
  facing: 1 | -1;
  back?: boolean;
  /** time of the last attack / hit (for animation) */
  attackAt: number;
  hitAt: number;
  busyUntil: number;
  stealSlot?: number;
}

export type RaidEvent =
  | { t: 'hit'; unit: string; by: string; dmg: number; x: number; y: number }
  | { t: 'ko'; unit: string; x: number; y: number }
  | { t: 'eat'; unit: string; customer: string; cash: number; x: number; y: number }
  | { t: 'steal'; unit: string; dish: string; x: number; y: number }
  | { t: 'gate'; x: number; y: number }
  | { t: 'boss'; x: number; y: number }
  | { t: 'zap'; from: string; to: string }
  | { t: 'heal'; unit: string }
  | { t: 'summon'; unit: string }
  | { t: 'rage' }
  | { t: 'end'; result: 'won' | 'lost' | 'retreat' };

export interface RaidState {
  rival: RivalId;
  t: number;
  rng: number;
  units: RaidUnit[];
  phase: 'fight' | 'won' | 'lost' | 'retreat';
  aggro: boolean;
  bossOut: boolean;
  gateBroken: boolean;
  focus?: string;
  redUntil: number;
  cashEaten: number;
  stolen: string[];
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

// ---------- availability ----------

export function rivalUnlocked(s: GameState, id: RivalId): boolean {
  const i = RIVALS.findIndex((r) => r.id === id);
  return i === 0 || (s.rivals[RIVALS[i - 1].id]?.wins ?? 0) > 0;
}

export const MAP_LEVEL = 2;

export function rivalReady(s: GameState, id: RivalId): string | null {
  if (s.level < MAP_LEVEL) return `The raid map opens at level ${MAP_LEVEL}.`;
  if (!rivalUnlocked(s, id)) return 'Beat the previous joint on the road first.';
  const def = RIVAL_BY_ID[id];
  if (s.level < def.level) return `${def.name} is a level ${def.level} joint. Level up first!`;
  const p = s.rivals[id];
  if (p && s.now < p.nextAt) return `They're still rebuilding. Back in ${Math.ceil((p.nextAt - s.now) / 60)} min.`;
  return null;
}

/** Workers that can go raiding: zombies and YOU who aren't cooking, KO'd or already out. */
export function raidCandidates(s: GameState) {
  return s.workers.filter((w) => w.state !== 'cooking' && w.state !== 'toStove' && w.state !== 'down' && w.state !== 'raiding');
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
    range: 0.9,
    cd: 0,
    cdMax: 1,
    state: 'idle',
    path: [],
    repathAt: 0,
    facing: 1,
    attackAt: -9,
    hitAt: -9,
    busyUntil: 0,
    ...u,
  } as RaidUnit;
  r.units.push(full);
  return full;
}

export function startRaid(s: GameState, rivalId: RivalId, workerIds: string[], petIds: string[] = []): RaidState | string {
  const def = RIVAL_BY_ID[rivalId];
  if (!def) return 'Unknown joint.';
  const notReady = rivalReady(s, rivalId);
  if (notReady) return notReady;
  const candidates = new Set(raidCandidates(s).map((w) => w.id));
  const squad = workerIds.filter((id) => candidates.has(id));
  if (!squad.length) return 'Pick at least one zombie for the squad.';
  refreshDaily(s);
  const r: RaidState = {
    rival: rivalId,
    t: 0,
    rng: (s.rng ^ 0x9e3779b9) >>> 0 || 7,
    units: [],
    phase: 'fight',
    aggro: false,
    bossOut: false,
    gateBroken: false,
    redUntil: -1,
    cashEaten: 0,
    stolen: [],
    counter: def.dishes.map((d, i) => ({ x: 0, y: 2 + i, dish: d, servings: 1 })),
    events: [],
    nextId: 1,
  };
  // your horde, lined up on the sidewalk
  squad.forEach((id, i) => {
    const w = s.workers.find((x) => x.id === id)!;
    releaseJob(s, w);
    w.state = 'raiding';
    const isYou = w.kind === 'you';
    unit(r, {
      side: 'z',
      kind: isYou ? 'you' : 'zombie',
      ref: w.id,
      art: isYou ? 'you' : `${w.type}_z`,
      name: w.name,
      x: -1 + i * 0.9,
      y: LINE_Y,
      hp: Math.max(1, w.energy),
      maxHp: w.stats.energy,
      dmg: 3 + w.stats.power * 1.6,
      speed: 0.9 + w.stats.speed * 0.12,
      cdMax: 0.9,
      state: 'queued',
    });
  });
  petIds.forEach((id, i) => {
    const p = s.pets.find((x) => x.id === id);
    if (!p || p.state === 'raiding') return;
    p.state = 'raiding';
    const rot = p.type === 'rotweiler';
    unit(r, { side: 'z', kind: 'pet', ref: p.id, art: rot ? 'pet_rotweiler' : 'pet_pug', name: rot ? 'Rot-weiler' : 'Zombie Pug', x: -2 - i, y: LINE_Y + 0.6, hp: rot ? 90 : 45, dmg: rot ? 9 : 4, speed: rot ? 2.6 : 2.2, cdMax: 0.7, state: 'queued' });
  });
  // the rival joint
  unit(r, { side: 'r', kind: 'gate', art: 'gate_r', name: 'Gate', x: GATE_X, y: ARENA_N - 0.5, hp: def.gateHp, dmg: 0, speed: 0 });
  const tables: Pt[] = [
    { x: 2, y: 2 },
    { x: 4, y: 2 },
    { x: 2, y: 4 },
    { x: 4, y: 4 },
    { x: 3, y: 1 },
  ];
  for (let i = 0; i < def.customers; i++) {
    const t = tables[i % tables.length];
    unit(r, { side: 'c', kind: 'customer', art: ['accountant', 'teen', 'yoga', 'politician', 'nurse'][i % 5], name: 'Customer', x: t.x + 0.45, y: t.y, hp: 10, dmg: 0, speed: 2.4 });
  }
  for (let i = 0; i < def.staff.count; i++)
    unit(r, { side: 'r', kind: 'staff', art: `staff_${rivalId}`, name: 'Waiter', x: 1 + (i % 4), y: 1 + Math.floor(i / 4) * 2 + 0.5, hp: def.staff.hp, dmg: def.staff.dmg, speed: 1.6, cdMax: 1.1 });
  for (let i = 0; i < def.dogs; i++) unit(r, { side: 'r', kind: 'dog', art: 'guard_dog', name: 'Guard Dog', x: 1 + i * 3, y: ARENA_N - 1, hp: 40 + def.level * 5, dmg: 3 + def.level * 0.4, speed: 2.5, cdMax: 0.8 });
  const zapSpots = [
    { x: ARENA_N - 1, y: ARENA_N - 1 },
    { x: 0, y: ARENA_N - 1 },
  ];
  for (let i = 0; i < def.zappers; i++)
    unit(r, { side: 'r', kind: 'zapper', art: 'bug_zapper', name: 'Bug Zapper', ...zapSpots[i], hp: 100 + def.level * 12, dmg: 4 + def.level * 0.45, speed: 0, range: 2.8, cdMax: 1.6 });
  unit(r, { side: 'r', kind: 'boss', art: `boss_${rivalId}`, name: def.chef, x: 1, y: 0.3, hp: def.boss.hp, dmg: def.boss.dmg, speed: 1.3, cdMax: 1.2, range: 1.0, state: 'hidden' });
  return r;
}

// ---------- player commands ----------

export function sendOne(r: RaidState, unitId?: string): string | null {
  const u = unitId ? r.units.find((x) => x.id === unitId && x.state === 'queued') : r.units.find((x) => x.side === 'z' && x.state === 'queued');
  if (!u) return 'Everyone is already in!';
  u.state = 'walk';
  return null;
}

export function sendAll(r: RaidState): string | null {
  const q = r.units.filter((x) => x.side === 'z' && x.state === 'queued');
  if (!q.length) return 'Everyone is already in!';
  for (const u of q) u.state = 'walk';
  return null;
}

/** Tap an enemy (or a customer, or the gate) and the whole horde piles on it. */
export function focusTarget(r: RaidState, unitId: string): string | null {
  const u = r.units.find((x) => x.id === unitId);
  if (!u || u.side === 'z' || u.hp <= 0 || u.state === 'hidden' || u.state === 'gone') return null;
  r.focus = u.id;
  return null;
}

/** Tap the counter: the nearest free zombie runs over and swipes a dish. */
export function stealDish(r: RaidState, slot: number): string | null {
  const c = r.counter[slot];
  if (!c || c.servings <= 0) return 'Already swiped!';
  if (!r.gateBroken) return 'Break through the gate first!';
  const busy = new Set(r.units.filter((u) => u.stealSlot === slot).map((u) => u.id));
  if (busy.size) return 'Someone’s already on it.';
  const z = r.units
    .filter((u) => u.side === 'z' && (u.kind === 'zombie' || u.kind === 'you') && (u.state === 'walk' || u.state === 'idle') && u.hp > 0)
    .sort((a, b) => dist(a, c) - dist(b, c))[0];
  if (!z) return 'Send in a zombie first!';
  z.stealSlot = slot;
  z.state = 'walk';
  z.path = [];
  z.repathAt = 0;
  return null;
}

export function useGreen(s: GameState, r: RaidState): string | null {
  refreshDaily(s);
  if (s.graves.green <= 0) return 'No green grave markers left today.';
  s.graves.green--;
  for (const u of r.units) if (u.side === 'z' && u.hp > 0) {
    u.maxHp = Math.round(u.maxHp * 1.5);
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.5);
    r.events.push({ t: 'heal', unit: u.id });
  }
  return null;
}

export function useRed(s: GameState, r: RaidState): string | null {
  refreshDaily(s);
  if (s.graves.red <= 0) return 'No red grave markers left today.';
  if (r.t < r.redUntil) return 'Already raging!';
  s.graves.red--;
  r.redUntil = r.t + 15;
  r.events.push({ t: 'rage' });
  return null;
}

export function useHeadstone(s: GameState, r: RaidState): string | null {
  if (s.inventory.headstone <= 0) return 'No Healing Headstones. Buy them before the raid.';
  s.inventory.headstone--;
  for (const u of r.units) if (u.side === 'z' && u.state !== 'down' && u.state !== 'gone') {
    u.hp = Math.min(u.maxHp, u.hp + 100);
    r.events.push({ t: 'heal', unit: u.id });
  }
  return null;
}

export function useSummon(s: GameState, r: RaidState): string | null {
  if (s.inventory.summon <= 0) return 'No Summon Stones. Buy one before the raid.';
  if (r.units.filter((u) => u.kind === 'summon' && u.hp > 0).length >= 3) return 'Three Big Foot-Longs is the legal limit.';
  s.inventory.summon--;
  const u = unit(r, { side: 'z', kind: 'summon', art: 'bigfoot', name: 'Big Foot-Long', x: GATE_X, y: LINE_Y - 0.5, hp: 420, dmg: 22, speed: 1.2, cdMax: 1.3, range: 1.1, state: 'walk' });
  r.events.push({ t: 'summon', unit: u.id });
  return null;
}

export function retreat(r: RaidState) {
  if (r.phase !== 'fight') return;
  r.phase = 'retreat';
  r.events.push({ t: 'end', result: 'retreat' });
}

// ---------- simulation ----------

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const alive = (u: RaidUnit) => u.hp > 0 && u.state !== 'down' && u.state !== 'gone' && u.state !== 'hidden';
const inside = (p: Pt) => p.x > -0.5 && p.y > -0.5 && p.x < ARENA_N - 0.5 && p.y < ARENA_N - 0.5;

/** Walk toward a point; the fence only lets you through the gate once it's broken. */
function stepToward(r: RaidState, u: RaidUnit, goal: Pt, dt: number) {
  let target = goal;
  const uIn = inside(u);
  const gIn = inside(goal);
  if (uIn !== gIn) {
    // route via the gate: outside point → gate → inside point
    const outsideGate = { x: GATE_X, y: ARENA_N + 0.2 };
    const insideGate = { x: GATE_X, y: ARENA_N - 1 };
    // once lined up with the gateway, walk straight through (a wide corridor so jostling can't stall it)
    const inCorridor = Math.abs(u.x - GATE_X) < 0.7 && u.y > ARENA_N - 1.2 && u.y < ARENA_N + 0.9;
    if (uIn) target = inCorridor ? outsideGate : insideGate;
    else target = inCorridor && r.gateBroken ? insideGate : outsideGate;
  }
  const d = dist(u, target);
  if (d < 0.01) return;
  const step = Math.min(d, u.speed * dt);
  const dx = (target.x - u.x) / d;
  const dy = (target.y - u.y) / d;
  u.x += dx * step;
  u.y += dy * step;
  const sdx = dx - dy;
  if (Math.abs(sdx) > 0.05) u.facing = sdx > 0 ? 1 : -1;
  u.back = dx + dy < -0.05;
  if (!r.gateBroken && !uIn && u.y > ARENA_N - 0.5 && u.y < ARENA_N + 0.15) u.y = ARENA_N + 0.15; // the fence
}

function nearest(u: RaidUnit, list: RaidUnit[]) {
  let best: RaidUnit | undefined;
  let bd = Infinity;
  for (const o of list) {
    const d = dist(u, o);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

function damage(r: RaidState, from: RaidUnit, to: RaidUnit) {
  const rage = from.side === 'z' && r.t < r.redUntil ? 1.6 : 1;
  const dmg = Math.round(from.dmg * rage * (0.85 + rnd(r) * 0.3));
  to.hp -= dmg;
  to.hitAt = r.t;
  from.attackAt = r.t;
  r.events.push({ t: 'hit', unit: to.id, by: from.id, dmg, x: to.x, y: to.y });
  if (to.side === 'r' && to.kind !== 'gate') r.aggro = true;
  if (to.hp <= 0) {
    to.hp = 0;
    to.state = 'down';
    to.busyUntil = r.t + 1.2;
    r.events.push({ t: 'ko', unit: to.id, x: to.x, y: to.y });
    if (to.kind === 'gate') {
      r.gateBroken = true;
      r.aggro = true;
      r.events.push({ t: 'gate', x: to.x, y: to.y });
    }
    if (r.focus === to.id) r.focus = undefined;
  }
}

function fight(r: RaidState, u: RaidUnit, target: RaidUnit, dt: number) {
  u.target = target.id;
  const range = u.range + (target.kind === 'gate' ? 0.4 : 0) + (target.kind === 'boss' || u.kind === 'boss' ? 0.2 : 0);
  if (dist(u, target) > range) {
    stepToward(r, u, target, dt);
    return;
  }
  const sdx = target.x - u.x - (target.y - u.y);
  if (Math.abs(sdx) > 0.05) u.facing = sdx > 0 ? 1 : -1;
  u.cd -= dt;
  if (u.cd <= 0) {
    u.cd = u.cdMax;
    damage(r, u, target);
  }
}

function updateHorde(r: RaidState, u: RaidUnit, dt: number) {
  if (u.state === 'queued' || !alive(u)) return;
  if (r.t < u.busyUntil) return;
  if (u.state === 'eat' || u.state === 'steal') u.state = 'walk';
  const enemies = r.units.filter((o) => o.side === 'r' && alive(o) && o.kind !== 'gate');
  const gate = r.units.find((o) => o.kind === 'gate' && alive(o));
  // 1) steal task
  if (u.stealSlot !== undefined) {
    const c = r.counter[u.stealSlot];
    if (!c || c.servings <= 0) u.stealSlot = undefined;
    else {
      const spot = { x: c.x + 0.9, y: c.y };
      if (dist(u, spot) > 0.3) return stepToward(r, u, spot, dt);
      c.servings = 0;
      r.stolen.push(c.dish);
      u.busyUntil = r.t + 1.5;
      u.state = 'steal';
      r.events.push({ t: 'steal', unit: u.id, dish: c.dish, x: u.x, y: u.y });
      u.stealSlot = undefined;
      return;
    }
  }
  // 2) the player's focus target
  const focus = r.focus ? r.units.find((o) => o.id === r.focus && alive(o)) : undefined;
  if (focus && (focus.side === 'r' || focus.side === 'c')) {
    if (focus.side === 'c') return eat(r, u, focus, dt);
    if (inside(focus) && !r.gateBroken && gate) return fight(r, u, gate, dt);
    return fight(r, u, focus, dt);
  }
  // 3) outside the fence: anything in the yard that's on us, else the gate
  if (!inside(u) && gate) {
    const close = enemies.filter((e) => !inside(e) || dist(u, e) < 1.2);
    const t = nearest(u, close);
    if (t && dist(u, t) < 2) return fight(r, u, t, dt);
    return fight(r, u, gate, dt);
  }
  // 4) inside: nearest enemy, but zombies can't resist a nearby customer
  const prey = r.units.filter((o) => o.side === 'c' && alive(o));
  const e = nearest(u, enemies);
  const p = u.kind === 'zombie' || u.kind === 'pet' ? nearest(u, prey) : undefined;
  if (p && (!e || dist(u, p) + 0.8 < dist(u, e))) return eat(r, u, p, dt);
  if (e) return fight(r, u, e, dt);
  if (p) return eat(r, u, p, dt);
}

function eat(r: RaidState, u: RaidUnit, c: RaidUnit, dt: number) {
  if (dist(u, c) > 0.8) return stepToward(r, u, c, dt);
  const def = RIVAL_BY_ID[r.rival];
  c.hp = 0;
  c.state = 'gone';
  u.state = 'eat';
  u.busyUntil = r.t + 1.4;
  u.hp = Math.min(u.maxHp, u.hp + 10);
  r.cashEaten += def.cashPerCustomer;
  r.aggro = true;
  r.events.push({ t: 'eat', unit: u.id, customer: c.id, cash: def.cashPerCustomer, x: c.x, y: c.y });
}

function updateRival(r: RaidState, u: RaidUnit, dt: number) {
  if (!alive(u) || r.t < u.busyUntil) return;
  const horde = r.units.filter((o) => o.side === 'z' && alive(o) && o.state !== 'queued');
  if (u.kind === 'gate') return;
  if (u.kind === 'zapper') {
    u.cd -= dt;
    const t = nearest(u, horde.filter((h) => dist(u, h) <= u.range));
    if (t && u.cd <= 0) {
      u.cd = u.cdMax;
      r.events.push({ t: 'zap', from: u.id, to: t.id });
      damage(r, u, t);
    }
    return;
  }
  if (u.kind === 'dog') {
    // guard dogs patrol the yard and charge anything near the fence
    const t = nearest(u, horde.filter((h) => dist(u, h) < 3.5 && (r.gateBroken || inside(h) || h.y < ARENA_N + 1.5)));
    if (t && (inside(t) || r.gateBroken)) return fight(r, u, t, dt);
    return;
  }
  if (!r.aggro) return; // staff and boss mind their business until the fight starts
  const t = nearest(u, horde.filter((h) => inside(h) || r.gateBroken));
  if (t) fight(r, u, t, dt);
}

function updateCustomer(r: RaidState, c: RaidUnit, dt: number) {
  if (!alive(c) || !r.aggro) return;
  // panic! run for the back corner and escape
  c.state = 'flee';
  const exit = { x: -0.4, y: -0.4 };
  stepToward(r, c, exit, dt);
  if (dist(c, exit) < 0.3) c.state = 'gone';
}

/** Units on the same side gently push apart so the horde doesn't stack on one tile. */
function separate(r: RaidState) {
  const list = r.units.filter((u) => alive(u) && u.speed > 0 && u.state !== 'queued');
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const d = dist(a, b);
      if (d > 0.001 && d < 0.45) {
        const push = (0.45 - d) * 0.5;
        const dx = ((a.x - b.x) / d) * push;
        const dy = ((a.y - b.y) / d) * push;
        a.x += dx;
        a.y += dy;
        b.x -= dx;
        b.y -= dy;
      }
    }
}

export function stepRaid(r: RaidState, dt: number) {
  if (r.phase !== 'fight') return;
  r.t += dt;
  for (const u of r.units) if (u.state === 'down' && u.side !== 'z' && r.t > u.busyUntil) u.state = 'gone';
  // the Head Chef storms out once most of the staff are down (or the fight drags on)
  const boss = r.units.find((u) => u.kind === 'boss')!;
  if (!r.bossOut && r.aggro) {
    const staff = r.units.filter((u) => u.kind === 'staff');
    const down = staff.filter((u) => u.hp <= 0).length;
    if (down >= Math.ceil(staff.length * 0.6) || r.t > 60) {
      r.bossOut = true;
      boss.state = 'idle';
      r.events.push({ t: 'boss', x: boss.x, y: boss.y });
    }
  }
  for (const u of r.units) {
    if (u.side === 'z') updateHorde(r, u, dt);
    else if (u.side === 'r') updateRival(r, u, dt);
    else updateCustomer(r, u, dt);
  }
  separate(r);
  if (boss.hp <= 0) {
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
  const out: RaidResult = { result: r.phase as RaidResult['result'], cash: r.cashEaten, xp: 0, sauce: 0, dishes: [...r.stolen], stars: 0, kos: [] };
  // your horde comes home
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
    w.x = 5;
    w.y = 1;
    w.path = [];
    if (u.state === 'queued') {
      w.state = 'idle';
      continue;
    }
    if (u.hp <= 0) {
      w.energy = 0;
      w.state = 'down';
      w.downUntil = s.now + TUNING.reanimateSec;
      out.kos.push(w.name);
    } else {
      w.energy = Math.min(w.stats.energy, Math.round(u.hp));
      w.state = 'idle';
    }
  }
  if (won) {
    const prog = s.rivals[r.rival] ?? { stars: 0, wins: 0, nextAt: 0 };
    const horde = r.units.filter((u) => u.side === 'z' && u.state !== 'queued' && (u.kind === 'zombie' || u.kind === 'you'));
    const standing = horde.filter((u) => u.hp > 0).length;
    out.stars = 1 + (standing >= Math.ceil(horde.length / 2) ? 1 : 0) + (r.t <= 60 ? 1 : 0);
    out.cash += def.reward.cash;
    out.xp = def.reward.xp;
    // the Head Chef sometimes drops Brain Sauce: better odds for a quick, crowded takedown
    const boss = r.units.find((u) => u.kind === 'boss')!;
    const ganged = r.units.filter((u) => u.side === 'z' && u.target === boss.id && u.hp > 0).length;
    const chance = def.reward.sauceChance * (r.t < 60 ? 1.3 : 1) * (1 + Math.min(1, ganged / 3) * 0.5);
    if (rnd(r) < Math.min(0.95, chance)) out.sauce = 1 + (rnd(r) < 0.3 ? 1 : 0);
    // the signature recipe: guaranteed the first time, then a 35% chance
    if (!s.recipes.includes(def.signature) && (prog.wins === 0 || rnd(r) < 0.35)) out.recipeDrop = def.signature;
    if (out.recipeDrop && !out.dishes.includes(out.recipeDrop)) out.dishes.push(out.recipeDrop);
    prog.wins++;
    prog.stars = Math.max(prog.stars, out.stars);
    prog.nextAt = s.now + RIVAL_COOLDOWN;
    s.rivals[r.rival] = prog;
    s.stats.raidsWon++;
  } else {
    const prog = s.rivals[r.rival] ?? { stars: 0, wins: 0, nextAt: 0 };
    prog.nextAt = s.now + 60;
    s.rivals[r.rival] = prog;
    out.xp = Math.round(def.reward.xp * 0.15);
  }
  s.cash += out.cash;
  s.stats.earned += out.cash;
  s.sauce += out.sauce;
  if (out.xp) addXp(s, out.xp);
  for (const d of out.dishes) s.fridge.push({ dish: d, servings: Math.max(6, Math.round(DISH_BY_ID[d].servings / 2)) });
  if (s.fridge.length > 12) s.fridge.splice(0, s.fridge.length - 12);
  return out;
}

export function buyHeadstone(s: GameState): string | null {
  if (s.cash < HEADSTONE_COST) return 'Not enough cash!';
  s.cash -= HEADSTONE_COST;
  s.inventory.headstone++;
  return null;
}

export function buySummon(s: GameState): string | null {
  if (s.level < 5) return 'Summon Stones unlock at level 5.';
  if (s.sauce < SUMMON_COST) return 'Not enough Brain Sauce!';
  s.sauce -= SUMMON_COST;
  s.inventory.summon++;
  return null;
}
