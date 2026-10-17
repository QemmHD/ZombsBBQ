/**
 * Raids, rebuilt to play like the original (spec: docs/21c-rebuild-raids.md; rules: doc 16 §B–D).
 *
 * - Your squad lines up single file on the sidewalk outside. Only zombies (and pets) go: the chef (YOU)
 *   stays home and minds the joint.
 * - Tap a zombie, then a target (a person, or the counter to swipe a dish), or ATTACK. ATTACK ALL sends
 *   everyone. Zombies walk to the door at their own speed.
 * - Until a zombie steps inside, the rival joint runs as a café: waiters carry plates to the diners.
 *   The moment the first one is in, the raid is LIVE: diners scream and run, and every waiter picks the
 *   nearest zombie inside and keeps after it until it drops or leaves.
 * - The Head Chef stays at the stove until every waiter is down, then comes out. Hit the chef early and
 *   it turns on you (anyone who's hit fights back). Beat the chef to win.
 * - The original's numbers: movement 2 + 0.2·Speed (zombies 1.2× slower), a swing every
 *   1000 / (2 + 0.2·Speed) ms for damage = Attack, and every hit knocks the victim a tile back, so the
 *   attacker has to step in again. Energy is health.
 * - Each customer killed: +20 cash and +2 XP, kept win or lose; the zombie gets +2 XP a kill.
 * - Tombstones: ×2 damage for 5 s, or +100 energy over 5 s; 5 uses a day (12 at level 2), once per
 *   stone per raid. The revival stone stands the fallen back up with 100 energy, once a day.
 * - Pets fight too, with the original pet table's HP, stats and critical hits.
 * - There's no clock, as in the original; after five minutes the squad gives up and goes home.
 * - Wave the white flag to retreat. KO'd zombies reanimate back home an hour later.
 *
 * Pure and deterministic (own RNG): the scene renders it, tests drive it.
 */
import { DISHES, DISH_BY_ID, TUNING, variantId, type VariantId } from './data';
import { ITEM_BY_ID, type Dir } from './catalog';
import { DOOR_X, STREET_RUN, findPath, isInside, key, type Pt, type Room } from './grid';
import { maxEnergy, type Furniture, type GameState, type Worker } from './state';
import { addXp, addZombieXp, arrivalGap, dishAvailable, outsideSpot, releaseJob, validSeats } from './sim';
import { RIVAL_BY_ID, rivalClosedSec, rivalCurve, rivalGen, rivalLevel, rivalReady, rivalStats, type RivalId, type RivalStats } from './rivals';
import { PET_BY_TYPE, petArt, type PetType } from './petdata';

export * from './rivals';

// ---------- the original's numbers ----------

/** Original movement: the speed multiplier is 2 + 0.2·Speed (CharacterData::getSpeedMultiplier). */
export const speedMult = (speed: number) => 2 + 0.2 * speed;
/** Tiles a second per point of multiplier: ~94 px a tile at 5.8 / 0.365 ms per px (doc 10 §3.1: Speed 4 walks 1.87 tiles/s). */
export const TILES_PER_MULT = 0.669;
/** Zombies move 1.2× slower than the living (original ZOMBIE_SLOWDOWN_MULTIPLIER). */
export const ZOMBIE_SLOWDOWN = 1.2;
/** Running (panicking diners) takes 0.6× the time per step. */
export const RUN_FACTOR = 0.6;
/**
 * Raid walking speed in tiles/s for a Speed stat (1–10): (2 + 0.2·Speed) × 0.669, ÷1.2 for zombies.
 * Defined here so the raid doesn't depend on the café's own movement code.
 */
export function raidSpeed(speed: number, zombie = false): number {
  return (speedMult(speed) * TILES_PER_MULT) / (zombie ? ZOMBIE_SLOWDOWN : 1);
}
/** The swing timer, seconds: 1000 / (2 + 0.2·Speed) ms (AttackTask_MAX_ATTACK_TIME / speed multiplier). */
export const swingSec = (speed: number) => 1 / speedMult(speed);
/** A knocked-back victim slides its one tile in this long, and can't act until it lands. */
export const KNOCKBACK_SEC = 0.15;
/** Close enough to swing at: the next tile over, diagonals included (withinAttackRange). */
export const REACH = 1.5;

/** No clock, like the original: a generous five minutes, then the squad gives up and comes home (a retreat). */
export const RAID_TIME = 300;
export const SUMMON_COST = 5; // Brain Sauce
/** Tombstones (original): a 5 s power-up for the whole squad. */
export const BUFF_SEC = 5;
/** Strength stone: ×2 damage while it glows (tombstone_POWER_STRENGTH). */
export const STR_BUFF = 2;
/** Health stone: +100 energy spread over the 5 s glow (POWER_HEALTH), capped at max. */
export const HP_BUFF = 100;
/** Uses a day: 5, or 12 once the stone is upgraded (iOS help). Each stone works once per raid (doc 13). */
export const TOMBSTONE_USES = 5;
export const TOMBSTONE_USES_L2 = 12;
/** The revival stone: once a day, everyone who's down gets back up with 100 energy (original Golden stone). */
export const REVIVE_USES = 1;
export const REVIVE_ENERGY = 100;
export const TOMBSTONE_RECHARGE = 24 * 3600;
/** Refill a spent tombstone now instead of waiting the day out (original: 2 toxin). */
export const TOMBSTONE_RECHARGE_SAUCE = 2;
export const TOMBSTONE_UPGRADE_SAUCE = 15;
/** The Health Stone (ours): +60 HP to every zombie and pet in the raid over 3 s, alongside any tombstone glow. One per raid. */
export const HEADSTONE_SAUCE = 3;
export const HEADSTONE_HEAL = 60;
export const HEADSTONE_SEC = 3;
/** Counter food (original Cafe::getNewRandomFoodStack): stacks a quarter of normal size… */
export const RAID_FOOD_COUNT_MULTIPLIER = 0.25;
/** …of a dish rolled at your level -3, -2, -1, 0, +1 against these cumulative odds (%)… */
export const RECIPE_LEVEL_ODDS = [15, 35, 65, 95, 100];
/** …with the original's ten-way variant roll (cumulative %; null = plain), and now and then a raid-only recipe. */
export const COUNTER_VARIANT_ODDS: [VariantId | null, number][] = [
  [null, 60],
  ['spicy', 68],
  ['very_spicy', 72],
  ['fancy', 77],
  ['very_fancy', 79],
  ['bulk', 84],
  ['fresh', 86],
  ['frozen', 91],
  ['quick', 96],
  ['very_quick', 100],
];
export const RARE_RECIPE_CHANCE = 0.02;
/** Café XP for every customer killed, kept win or lose (original CUSTOMER_XP). */
export const XP_PER_EAT = 2;
/** XP for the zombie that made a kill. */
export const ZOMBIE_KILL_XP = 2;
/** Energy a zombie gets back from eating a kill (original KILL_HEALTH_BOOST). */
export const KILL_HEALTH_BOOST = 5;
/**
 * Diners' HP. Deviation: the original's are ordinary ~100-energy customers, but ours panic and run (at
 * the 1.67× running pace), so a 100-HP diner could never be caught; 20 is a few swings.
 */
export const DINER_HP = 20;
/** A clawed diner freezes this long (so a zombie that catches one can finish the job). */
export const GRAB_SEC = 0.6;
/** Panicking diners loop the run clip this many times (original CUSTOMER_PANIC_LOOPS) before making for the door. */
export const CUSTOMER_PANIC_LOOPS = 10;
const RUN_CLIP_SEC = 0.667;

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
  /** damage per swing (the Attack stat) */
  dmg: number;
  /** tiles per second */
  speed: number;
  /** the swing timer, counting down while in reach */
  cd: number;
  /** seconds between swings */
  cdMax: number;
  state: UnitState;
  order?: Order;
  /** who this unit is after (kept until it drops or leaves the café) */
  target?: string;
  /** the target the swing timer was set for (reset whenever the unit steps into reach again) */
  engaged?: string;
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
  /** customers eaten */
  eats: number;
  /** anyone knocked out or eaten (zombie XP) */
  kills: number;
  /** your zombies: the customer type it was (for its raid ability, see ABILITIES) */
  ztype?: string;
  /** swings landed (Sumo slams every third, Cop cuffs every fourth) */
  swings?: number;
  /** pets: critical hits (chance, ×damage) */
  crit?: { chance: number; mult: number };
  /** being knocked back to this tile */
  push?: Pt;
  /** panicking diners run around inside until then, then make for the door */
  panicUntil?: number;
  /** a waiter's café job before the raid goes live: fetch a plate, take it to a diner, go back */
  task?: { kind: 'fetch' | 'deliver' | 'home'; goal: Pt; diner?: string };
}

/**
 * Per-type raid abilities (doc 13 #9, trimmed to fit the original's rules):
 *   sumo        every 3rd swing is a belly-slam: everyone round the target takes half a hit and is knocked back
 *   boxer       one-two: every swing lands a second jab at half strength
 *   cop         every 4th swing cuffs the target: stunned 1.5 s
 *   cheerleader zombies within 2.5 tiles of her hit 15% harder (her too; doesn't stack)
 * (The Champ's taunt is gone: the original's waiters always go for the nearest zombie inside.)
 */
export const ABILITIES: Record<string, string> = {
  sumo: 'Belly-slam: knocks back everyone round the target',
  boxer: 'One-two: every swing lands a second jab',
  cop: 'Cuffs: every 4th hit stuns the target for 1.5 s',
  cheerleader: 'Pep: zombies near her hit 15% harder',
};
export const BOXER_JAB = 0.5;
export const SUMO_EVERY = 3;
export const COP_EVERY = 4;
export const COP_STUN = 1.5;
export const CHEER_BONUS = 0.15;
export const CHEER_RANGE = 2.5;

export interface RaidFurniture {
  id: string;
  item: string;
  x: number;
  y: number;
  dir?: Dir;
}

export type RaidEvent =
  | { t: 'hit'; unit: string; by: string; dmg: number; x: number; y: number; crit?: boolean }
  | { t: 'ko'; unit: string; x: number; y: number }
  | {
      t: 'eat';
      unit: string;
      /** the customer that got eaten */
      customer: string;
      cash: number;
      x: number;
      y: number;
    }
  | { t: 'steal'; unit: string; dish: string; x: number; y: number }
  | { t: 'scream'; unit: string; x: number; y: number }
  | { t: 'arrive'; unit: string; x: number; y: number }
  | { t: 'escape'; unit: string }
  | { t: 'enter'; unit: string }
  | { t: 'live' }
  | { t: 'boss'; x: number; y: number }
  | { t: 'buff'; kind: 'str' | 'hp' }
  | { t: 'revive'; unit: string; x: number; y: number }
  | { t: 'stone' }
  | { t: 'ability'; unit: string; kind: 'slam' | 'jab' | 'stun' | 'crit'; x: number; y: number }
  | { t: 'summon'; unit: string }
  | { t: 'end'; result: 'won' | 'lost' | 'retreat' };

export interface RaidState {
  rival: RivalId;
  name: string;
  gen: number;
  /** the rival's level for this visit (follows yours, see rivals.ts) */
  level: number;
  stats: RivalStats;
  t: number;
  rng: number;
  room: Room;
  furniture: RaidFurniture[];
  wallItems: { item: string; wall: 'l' | 'r'; index: number }[];
  units: RaidUnit[];
  phase: 'fight' | 'won' | 'lost' | 'retreat';
  /** LIVE: a zombie has stepped inside (the waiters fight, the diners panic) */
  aggro: boolean;
  /** when it went live */
  liveAt?: number;
  /** every waiter is down: the Head Chef has come out of the kitchen */
  bossOut: boolean;
  buff?: { kind: 'str' | 'hp'; until: number };
  /** a Health Stone mending everyone */
  heal?: { until: number };
  /** tombstones (furniture ids) and the Health Stone ('headstone') already used this raid: once each */
  used: string[];
  /** legacy "everyone pile on this" target (focusTarget) */
  focus?: string;
  /** cash from customers killed (+20 each) */
  cashEaten: number;
  /** customers killed (+2 XP each) */
  eaten: number;
  stolen: string[];
  /** what was swiped off the counter, stack by stack */
  haul: { dish: string; servings: number }[];
  /** dishes on the rival's serving counter (all on one counter tile, stacked) */
  counter: { x: number; y: number; dish: string; servings: number }[];
  events: RaidEvent[];
  nextId: number;
  /** when the next walk-in diner may turn up (original: every 5–20 s, 33–50% chance) */
  nextDinerAt?: number;
  /** before it goes live: when a waiter next carries a plate out */
  nextServeAt?: number;
  /** damage your side has dealt to the staff and chef (a lost raid's consolation XP scales with it) */
  dealt: number;
  /** the scene is still loading: the fight waits (the clock doesn't run) until it's drawn */
  hold?: boolean;
}

export interface RaidResult {
  result: 'won' | 'lost' | 'retreat';
  cash: number;
  xp: number;
  sauce: number;
  dishes: string[];
  /** servings per dish in `dishes` (same order) */
  servings: number[];
  recipeDrop?: string;
  stars: number;
  kos: string[];
  /** customers killed */
  eaten: number;
}

/**
 * Any zombie who's conscious and home can go. A cook just walks off (and their dish pauses until
 * someone returns). Like the original, the chef (YOU) stays home and minds the joint.
 */
export function raidCandidates(s: GameState): Worker[] {
  return s.workers.filter((w) => w.kind === 'zombie' && w.state !== 'down' && w.state !== 'raiding');
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
    cdMax: swingSec(4),
    state: 'idle',
    path: [],
    repathAt: 0,
    facing: -1,
    attackAt: -9,
    hitAt: -9,
    busyUntil: 0,
    eats: 0,
    kills: 0,
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
/** The Head Chef's spot: in front of the first stove. */
export const chefSpot = (_r: RaidState): Pt => ({ x: KITCHEN_X, y: 1 });

const DINER_ART = ['accountant', 'teen', 'yoga', 'politician', 'nurse', 'joe', 'jane', 'senior', 'hipster', 'ceo'];
/** Original NUM_CUSTOMERS by café level: 2 diners at levels 1–2, 3 at 3–5, 4 at 6–11, 5 at 12–17… */
export function startingDiners(level: number): number {
  return rivalCurve(level).customers;
}
/** A diner's walking speed: an average customer (Speed 4). */
const DINER_WALK = raidSpeed(4);
const DINER_RUN = DINER_WALK / RUN_FACTOR;

function seatDiner(r: RaidState, c: RaidFurniture, i: number) {
  if (r.units.some((u) => u.seatId === c.id && alive(u))) return;
  unit(r, {
    side: 'c',
    kind: 'customer',
    art: DINER_ART[(i * 3 + r.gen) % DINER_ART.length],
    name: 'Diner',
    x: c.x,
    y: c.y,
    hp: DINER_HP,
    dmg: 0,
    speed: DINER_WALK,
    seatId: c.id,
    home: { x: c.x, y: c.y },
    back: true,
    facing: 1,
  });
}

/** Original: during a raid another diner may wander in every 5–20 s (a 33–50% chance each roll, more
 * at tougher cafés), pausing at the door for about a second first. They head for a free chair; if the
 * zombies are already inside, they scream and run once they're through the door. */
function trickleDiners(r: RaidState) {
  if (r.nextDinerAt === undefined || r.t < r.nextDinerAt) return;
  r.nextDinerAt = r.t + 5 + rnd(r) * 15 + (rnd(r) * 2 - 1);
  const chance = 0.33 + 0.17 * Math.min(1, r.level / 20);
  if (rnd(r) >= chance) return;
  const taken = new Set(r.units.filter((u) => u.kind === 'customer' && alive(u) && u.seatId).map((u) => u.seatId));
  const free = r.furniture.filter((f) => ITEM_BY_ID[f.item]?.kind === 'chair' && !taken.has(f.id));
  if (!free.length) return;
  const c = free[Math.floor(rnd(r) * free.length)];
  const d = unit(r, {
    side: 'c',
    kind: 'customer',
    art: DINER_ART[Math.floor(rnd(r) * DINER_ART.length)],
    name: 'Diner',
    x: DOOR_X,
    y: -1,
    hp: DINER_HP,
    dmg: 0,
    speed: DINER_WALK,
    seatId: c.id,
    home: { x: c.x, y: c.y },
    state: 'walk',
    facing: 1,
    back: true,
    busyUntil: r.t + 1 + (rnd(r) * 1.6 - 0.8),
  });
  r.events.push({ t: 'arrive', unit: d.id, x: d.x, y: d.y });
}

/** A walk-in diner heading for their chair (chairs are furniture, so path to it with it unblocked). */
function walkToSeat(r: RaidState, c: RaidUnit, dt: number) {
  const seat = r.furniture.find((f) => f.id === c.seatId);
  if (!seat) return;
  if (!c.path.length) {
    if (Math.round(c.x) === seat.x && Math.round(c.y) === seat.y) {
      c.x = seat.x;
      c.y = seat.y;
      c.state = 'idle';
      return;
    }
    const blocked = blockedTiles(r);
    blocked.delete(key(seat.x, seat.y));
    const p = findPath({ x: Math.round(c.x), y: Math.round(c.y) }, { x: seat.x, y: seat.y }, blocked, r.room);
    if (!p) return;
    c.path = p.length ? p : [{ x: seat.x, y: seat.y }];
  }
  walk(c, dt);
}

/** Lay out a rival joint: kitchen behind dividers, diners at tables. */
function buildCafe(r: RaidState) {
  const def = RIVAL_BY_ID[r.rival];
  const kit = def.kit;
  const { w: W, h: H } = r.room;
  let n = 1;
  const add = (item: string, x: number, y: number, dir?: Dir) => r.furniture.push({ id: `rf${n++}`, item, x, y, dir });
  // the kitchen along the north-west wall: fridge, stoves (the theme's special station in the middle), sink
  add(kit.fridge, 0, 0, 'se');
  for (let y = 1; y < H - 1; y += 2) add(y === 3 ? kit.special : kit.stove, 0, y, 'se');
  add('sink_steel', 0, H - 1, 'se');
  // the divider line, with the serving counter and a gap for the chef
  const ct = counterTile(r);
  const gap = kitchenGap(r);
  for (let y = 0; y < H; y++) {
    if (y === ct.y) add(kit.counter, ct.x, ct.y, 'se');
    else if (y !== gap.y) add(kit.divider, 2, y);
  }
  // the dining room: one diner per table, chair in front of it. Aisles run along the divider line
  // (x = 3, so the counter and the kitchen gap stay open) and between the tables (x = 5, 7)
  const spots: Pt[] = [];
  for (let y = 2; y + 1 <= H - 1; y += 2) for (let x = 4; x <= W - 1; x += 2) spots.push({ x, y });
  spots.slice(0, r.stats.tables).forEach((p) => {
    add(def.table, p.x, p.y);
    add(def.chair, p.x, p.y + 1, 'ne');
  });
  // a couple of theme pieces along the door wall, clear of the door
  const corners: Pt[] = [
    { x: W - 1, y: 0 },
    { x: DOOR_X + 2, y: 0 },
  ];
  kit.decor.slice(0, corners.length).forEach((d, i) => add(d, corners[i].x, corners[i].y));
  // walls: the shop sign over the door is drawn by the scene; a couple of hangings inside
  r.wallItems.push({ item: 'menu_board', wall: 'l', index: Math.min(H - 1, 2) }, { item: kit.art === 'menu_board' ? 'clock' : kit.art, wall: 'r', index: 1 });
}

function blockedTiles(r: RaidState): Set<string> {
  return new Set(r.furniture.map((f) => key(f.x, f.y)));
}

// ---------- what a raid is worth, and how hard it looks ----------

/** A win pays at least this many hours of what the joint is earning right now (so old joints stay worth it). */
export const REWARD_INCOME_HOURS = 2;
/** Share of the joint's theoretical takings it really earns (dishes run out, diners grumble, cooks nap). */
const INCOME_UTILISATION = 0.4;

/**
 * Roughly what the joint takes in an hour at the moment: diners through the door (the arrival rate,
 * capped by the seats at 30 s a meal) times the best price on the menu, at a realistic utilisation.
 */
export function hourlyIncome(s: GameState): number {
  const diners = Math.min(3600 / arrivalGap(s), Math.max(1, validSeats(s).length) * (3600 / TUNING.eatSec));
  const price = Math.max(1, ...DISHES.filter((d) => dishAvailable(s, d.id)).map((d) => d.price));
  return Math.round(diners * price * INCOME_UTILISATION);
}

/**
 * The win payout: the rival's listed reward, or ~2 h of your current income if that's more. The floor
 * is for joints you've outgrown (Chuck paying $250 when you hold $75k): it ramps in from 4 levels past
 * the joint's opening level to the full 2 h at 8, so the early road keeps its own pacing.
 */
export function raidReward(s: GameState, st: RivalStats, id?: RivalId): { cash: number; xp: number } {
  const past = id ? s.level - RIVAL_BY_ID[id].level : Infinity;
  const hours = REWARD_INCOME_HOURS * Math.max(0, Math.min(1, (past - 4) / 4));
  return { cash: Math.max(st.reward.cash, Math.round(hours * hourlyIncome(s))), xp: st.reward.xp };
}

/**
 * Hits a second a fighter really lands: every hit knocks the target a tile back, so each swing costs a
 * one-tile step in plus the swing timer.
 */
export function hitRate(swingSpeed: number, tilesPerSec: number): number {
  return 1 / (swingSec(swingSpeed) + 1 / Math.max(0.1, tilesPerSec));
}

/** How hard a zombie hits per swing, abilities folded in (Boxers jab, Sumos slam, Cheerleaders pep). */
export function raidPunch(type: string, power: number): number {
  return power * (type === 'boxer' ? 1 + BOXER_JAB : type === 'sumo' ? 1.3 : type === 'cop' ? 1.2 : type === 'cheerleader' ? 1.15 : 1);
}

export type Threat = 'Easy' | 'Even' | 'Deadly';
/**
 * The rival card's threat meter (doc 13 #9): a quick play-out of the fight with pooled numbers. The
 * squad's damage a second (Attack × hits a second, abilities folded in) chews through the waiters and
 * then the chef, while the waiters (and then the chef) wear the squad's energy down. Easy wins with
 * over a third of the squad's energy to spare, Even is close either way, Deadly loses.
 */
export function raidThreat(s: GameState, id: RivalId, workerIds: string[], petIds: string[] = []): { punch: number; hp: number; margin: number; label: Threat } {
  const st = rivalStats(id, rivalLevel(s, id), rivalGen(s, id));
  const ids = new Set(workerIds);
  const squad = s.workers.filter((w) => ids.has(w.id) && w.kind === 'zombie');
  const pets = s.pets.filter((p) => petIds.includes(p.id)).map((p) => PET_BY_TYPE[p.type] ?? PET_BY_TYPE.rotweiler);
  let punch = squad.reduce((a, w) => a + raidPunch(w.type, w.stats.power) * hitRate(w.stats.speed, raidSpeed(w.stats.speed, true)), 0);
  punch += pets.reduce((a, p) => a + p.atk * (1 + p.critChance * (p.critMult - 1)) * hitRate(p.aspd, raidSpeed(p.move)), 0);
  const health = squad.reduce((a, w) => a + Math.max(0, w.energy), 0) + pets.reduce((a, p) => a + p.hp, 0);
  const crew = st.minions ?? Array.from({ length: st.staff.count }, () => st.staff);
  const staffHp = crew.reduce((a, m) => a + m.hp, 0);
  const staffDps = crew.reduce((a, m) => a + m.dmg * hitRate(m.spd, raidSpeed(m.spd)), 0);
  const chefDps = st.chef.dmg * hitRate(st.chef.spd, raidSpeed(st.chef.spd));
  let h = health;
  let sh = staffHp;
  let ch = st.chef.hp;
  const dt = 0.25;
  // knockback scatters a mobbed target, so only about this many raiders really land blows on one foe
  const PER_TARGET = 3;
  const n = squad.length + pets.length;
  for (let t = 0; t < 900 && h > 0 && ch > 0; t += dt) {
    const up = n * (h / Math.max(1, health));
    const foes = sh > 0 ? Math.max(1, Math.ceil(crew.length * (sh / Math.max(1, staffHp)))) : 1;
    const out = (punch / Math.max(1, n)) * Math.min(up, PER_TARGET * foes) * dt;
    if (sh > 0) {
      h -= staffDps * (sh / Math.max(1, staffHp)) * dt;
      sh -= out;
    } else {
      h -= chefDps * dt;
      ch -= out;
    }
  }
  const margin = ch <= 0 ? Math.max(0, h) / Math.max(1, health) : -(Math.max(0, sh) + Math.max(0, ch)) / Math.max(1, staffHp + st.chef.hp);
  return { punch: Math.round(punch * 10) / 10, hp: staffHp + st.chef.hp, margin, label: margin >= THREAT_EASY ? 'Easy' : margin >= THREAT_EVEN ? 'Even' : 'Deadly' };
}
/** Threat bands on the play-out's margin (energy left on a win, minus the rival's HP left on a loss). */
export const THREAT_EASY = 0.35;
export const THREAT_EVEN = -0.15;

/** A raid-sized stack of one dish (the original's RAID_FOOD_COUNT_MULTIPLIER). */
export function raidStack(dish: string): number {
  return Math.max(1, Math.round((DISH_BY_ID[dish]?.servings ?? 4) * RAID_FOOD_COUNT_MULTIPLIER));
}

/** The original's ten-way variant roll for counter food: 60% plain, then Spicy 8%, Very Spicy 4%… */
export function rollVariant(r: RaidState): VariantId | null {
  const roll = rnd(r) * 100;
  return (COUNTER_VARIANT_ODDS.find(([, c]) => roll < c) ?? COUNTER_VARIANT_ODDS[0])[0];
}

/**
 * What's sitting on a rival's counter (original Cafe::getNewRandomFoodStack): one of YOUR recipes,
 * rolled at your level -3..+1 ([15, 35, 65, 95, 100]; a level you have no dish at falls back to the
 * nearest one below), with the original's ten-way variant odds, and 2% of the time a raid-only recipe.
 */
export function rollCounterDish(s: GameState, r: RaidState): string {
  if (rnd(r) < RARE_RECIPE_CHANCE) {
    const rare = DISHES.filter((d) => d.source === 'raid');
    return rare[Math.floor(rnd(r) * rare.length)].id;
  }
  const roll = rnd(r) * 100;
  const step = RECIPE_LEVEL_ODDS.findIndex((c) => roll < c);
  const mine = DISHES.filter((d) => d.source === 'level' && dishAvailable(s, d.id));
  const lowest = Math.min(...mine.map((d) => d.level));
  let lv = Math.max(lowest, s.level - 3 + step);
  let pool = mine.filter((d) => d.level === lv);
  while (!pool.length && lv > lowest) {
    lv--;
    pool = mine.filter((d) => d.level === lv);
  }
  // at your own level, the secret recipes you've learned are fair game too
  if (step === 3) pool = pool.concat(DISHES.filter((d) => d.source === 'raid' && s.recipes.includes(d.id)));
  if (!pool.length) pool = mine.length ? mine : DISHES.filter((d) => d.source === 'level' && d.level === 1);
  const dish = pool[Math.floor(rnd(r) * pool.length)].id;
  const v = rollVariant(r);
  return v ? variantId(dish, v) : dish;
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
  const level = rivalLevel(s, rivalId);
  const st = rivalStats(rivalId, level, gen);
  const r: RaidState = {
    rival: rivalId,
    name: def.name,
    gen,
    level,
    stats: st,
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
    eaten: 0,
    dealt: 0,
    used: [],
    stolen: [],
    haul: [],
    counter: [],
    events: [],
    nextId: 1,
  };
  buildCafe(r);
  // the food on the counter: two stacks (three at a level-10+ joint), rolled from your own recipes
  const ct = counterTile(r);
  const stacks = level >= 10 ? 3 : 2;
  for (let i = 0; i < stacks; i++) {
    const dish = rollCounterDish(s, r);
    r.counter.push({ x: ct.x, y: ct.y, dish, servings: raidStack(dish) });
  }
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
    unit(r, {
      side: 'z',
      kind: 'zombie',
      ref: w.id,
      art: `${w.type}_z`,
      ztype: w.type,
      name: w.name,
      x: W + 0.4 + slot++ * sp,
      y: -1,
      hp: Math.max(1, w.energy),
      maxHp: maxEnergy(w),
      dmg: w.stats.power,
      speed: raidSpeed(w.stats.speed, true),
      cdMax: swingSec(w.stats.speed),
      state: 'queued',
    });
  }
  for (const id of petIds) {
    const p = s.pets.find((x) => x.id === id);
    if (!p || p.state === 'raiding') continue;
    p.state = 'raiding';
    const pd = PET_BY_TYPE[p.type as PetType] ?? PET_BY_TYPE.rotweiler;
    unit(r, {
      side: 'z',
      kind: 'pet',
      ref: p.id,
      art: petArt(pd.type),
      name: pd.name,
      x: W + 0.4 + slot++ * sp,
      y: -1,
      hp: pd.hp,
      dmg: pd.atk,
      speed: raidSpeed(pd.move),
      cdMax: swingSec(pd.aspd),
      crit: { chance: pd.critChance, mult: pd.critMult },
      state: 'queued',
    });
  }
  // the diners, each on their chair facing their table. Like the original, only some chairs start
  // taken (its per-level customer count); more walk in off the street during the raid
  const chairs = r.furniture.filter((f) => ITEM_BY_ID[f.item]?.kind === 'chair');
  const seated = Math.min(chairs.length, st.diners);
  for (let k = 0; k < seated; k++) {
    const i = Math.floor((k * chairs.length) / seated); // spread round the room
    seatDiner(r, chairs[i], i);
  }
  r.nextDinerAt = 5 + rnd(r) * 15;
  r.nextServeAt = 1 + rnd(r) * 3;
  // the waiters (NUM_SERVERS for the level; the boss café's minions), on their posts in the aisles
  const posts: Pt[] = [];
  for (const x of [3, 5, 7]) for (let y = 1; y < r.room.h; y++) if (x < W && !blockedTiles(r).has(key(x, y))) posts.push({ x, y });
  const pick = posts.filter((_, i) => i % 2 === 0).concat(posts.filter((_, i) => i % 2 === 1));
  for (let i = 0; i < st.staff.count; i++) {
    const p = pick[i % pick.length];
    const m = st.minions?.[i] ?? st.staff;
    unit(r, {
      side: 'r',
      kind: 'staff',
      art: i % 2 ? `staff_${rivalId}_b` : `staff_${rivalId}`,
      name: rivalId === 'boss' ? 'Minion' : i % 2 ? 'Waitress' : 'Waiter',
      x: p.x,
      y: p.y,
      home: p,
      hp: m.hp,
      dmg: m.dmg,
      speed: raidSpeed(m.spd),
      cdMax: swingSec(m.spd),
    });
  }
  // the Head Chef, at the stove (as in the original)
  const chef = chefSpot(r);
  unit(r, {
    side: 'r',
    kind: 'boss',
    art: `boss_${rivalId}`,
    name: def.chef,
    x: chef.x,
    y: chef.y,
    home: chef,
    hp: st.chef.hp,
    dmg: st.chef.dmg,
    speed: raidSpeed(st.chef.spd),
    cdMax: swingSec(st.chef.spd),
    facing: 1,
  });
  return r;
}

// ---------- player commands ----------

const fighter = (u: RaidUnit) => u.side === 'z' && u.hp > 0 && u.state !== 'down' && u.state !== 'gone';
/** Only real zombies eat (and carry food); pets and the summon just fight. */
const eater = (u: RaidUnit) => u.kind === 'zombie' || u.kind === 'you';

/** Give one of your zombies an order (from the line-up, or already inside): tap it, then a target. */
export function order(r: RaidState, unitId: string, o: Order): string | null {
  const u = r.units.find((x) => x.id === unitId);
  if (!u || !fighter(u)) return 'They’re out of the fight.';
  if (o.kind === 'steal') {
    const c = r.counter[o.slot];
    if (!c || c.servings <= 0) return 'Already swiped!';
    if (!eater(u)) return 'Only zombies can carry food.';
  }
  if (o.kind === 'target') {
    const t = r.units.find((x) => x.id === o.id);
    if (!t || t.side === 'z' || !alive(t)) return 'Pick someone still standing.';
    if (t.kind === 'customer' && !eater(u)) return 'Pets go for the staff. Send a zombie after the diners!';
  }
  u.order = o;
  u.target = o.kind === 'target' ? o.id : undefined;
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

/** Point everyone who's in at one target (not on the tap path any more; kept for scripted play). */
export function focusTarget(r: RaidState, unitId: string): string | null {
  const t = r.units.find((x) => x.id === unitId);
  if (!t || t.side === 'z' || !alive(t)) return null;
  r.focus = t.id;
  for (const u of r.units) if (fighter(u) && u.state !== 'queued' && u.order?.kind !== 'steal' && (t.kind !== 'customer' || eater(u))) (u.order = { kind: 'target', id: t.id }), (u.target = t.id);
  return null;
}

/** Tap the counter with nobody picked: the nearest zombie (in or in line) goes for the food. */
export function stealDish(r: RaidState, slot: number): string | null {
  const c = r.counter[slot];
  if (!c || c.servings <= 0) return 'Already swiped!';
  if (r.units.some((u) => u.order?.kind === 'steal' && u.order.slot === slot && fighter(u))) return 'Someone’s already on it.';
  const spot = stealSpot(r);
  const z = r.units.filter((u) => fighter(u) && eater(u) && u.state !== 'eat').sort((a, b) => dist(a, spot) - dist(b, spot))[0];
  if (!z) return 'Send in a zombie first!';
  return order(r, z.id, { kind: 'steal', slot });
}

// ---------- tombstones and stones ----------

/** How many uses a tombstone holds a day: 5, or 12 once upgraded; the revival stone 1. */
export function tombstoneMax(f: Furniture): number {
  if (ITEM_BY_ID[f.item]?.boost === 'revive') return REVIVE_USES;
  return (f.lvl ?? 1) >= 2 ? TOMBSTONE_USES_L2 : TOMBSTONE_USES;
}

/** Uses left today (a spent tombstone refills 24 h after it ran dry). */
export function tombstoneUses(s: GameState, f: Furniture): number {
  if ((f.usesResetAt ?? 0) && s.now >= (f.usesResetAt ?? 0)) {
    f.uses = tombstoneMax(f);
    f.usesResetAt = undefined;
  }
  return Math.min(f.uses ?? tombstoneMax(f), tombstoneMax(f));
}

function tombstoneOf(s: GameState, furnitureId: string) {
  const f = s.furniture.find((x) => x.id === furnitureId);
  const def = f && ITEM_BY_ID[f.item];
  return f && def?.kind === 'tombstone' && def.boost ? { f, boost: def.boost } : null;
}

function spendUse(s: GameState, f: Furniture) {
  f.uses = tombstoneUses(s, f) - 1;
  if (f.uses <= 0) f.usesResetAt = s.now + TOMBSTONE_RECHARGE;
}

/**
 * Tap a tombstone you own: the whole squad glows with its blessing for 5 seconds (×2 damage, or +100
 * energy over the glow), one glow at a time, each stone once per raid. The revival stone instead
 * stands every KO'd zombie and pet back up on the spot with 100 energy.
 */
export function useTombstone(s: GameState, r: RaidState, furnitureId: string): string | null {
  const t = tombstoneOf(s, furnitureId);
  if (!t) return 'That’s not a tombstone.';
  if (r.phase !== 'fight') return null;
  if (r.used.includes(t.f.id)) return 'Each tombstone works once per raid.';
  const left = tombstoneUses(s, t.f);
  if (left <= 0) return `Recharging: back in ${Math.ceil(((t.f.usesResetAt ?? 0) - s.now) / 3600)} h, or recharge it for ${TOMBSTONE_RECHARGE_SAUCE} sauce.`;
  if (t.boost === 'revive') {
    const downed = r.units.filter((u) => u.side === 'z' && u.kind !== 'summon' && u.state === 'down');
    if (!downed.length) return 'Nobody’s down. Save it for when they are!';
    spendUse(s, t.f);
    r.used.push(t.f.id);
    for (const u of downed) {
      u.hp = Math.min(u.maxHp, REVIVE_ENERGY);
      u.state = 'idle';
      u.path = [];
      u.target = undefined;
      u.order = { kind: 'attack' };
      u.busyUntil = r.t + 0.8; // getting back up
      r.events.push({ t: 'revive', unit: u.id, x: u.x, y: u.y });
    }
    return null;
  }
  if (r.buff && r.t < r.buff.until) return 'One blessing at a time!';
  spendUse(s, t.f);
  r.used.push(t.f.id);
  r.buff = { kind: t.boost, until: r.t + BUFF_SEC };
  r.events.push({ t: 'buff', kind: t.boost });
  return null;
}

/** "Recharge · 2 sauce": refill a tombstone's uses now instead of waiting out the day. */
export function rechargeTombstone(s: GameState, furnitureId: string): string | null {
  const t = tombstoneOf(s, furnitureId);
  if (!t) return 'That’s not a tombstone.';
  if (tombstoneUses(s, t.f) >= tombstoneMax(t.f)) return 'Already fully charged.';
  if (s.sauce < TOMBSTONE_RECHARGE_SAUCE) return 'Not enough Brain Sauce!';
  s.sauce -= TOMBSTONE_RECHARGE_SAUCE;
  t.f.uses = tombstoneMax(t.f);
  t.f.usesResetAt = undefined;
  return null;
}

/** Level-2 tombstone: twelve uses a day instead of five (the seven extra are ready straight away). */
export function upgradeTombstone(s: GameState, furnitureId: string): string | null {
  const t = tombstoneOf(s, furnitureId);
  if (!t) return 'That’s not a tombstone.';
  if (t.boost === 'revive') return 'The revival stone has no level 2.';
  if ((t.f.lvl ?? 1) >= 2) return 'Already level 2.';
  if (s.sauce < TOMBSTONE_UPGRADE_SAUCE) return 'Not enough Brain Sauce!';
  s.sauce -= TOMBSTONE_UPGRADE_SAUCE;
  const left = tombstoneUses(s, t.f);
  t.f.lvl = 2;
  t.f.uses = left + (TOMBSTONE_USES_L2 - TOMBSTONE_USES);
  t.f.usesResetAt = undefined;
  return null;
}

/** Health Stone (ours): +60 HP to every zombie and pet in the fight over 3 s. Works alongside a tombstone glow. */
export function useHeadstone(s: GameState, r: RaidState): string | null {
  if (r.phase !== 'fight') return null;
  if (s.inventory.headstone <= 0) return `No Health Stones. Buy one before the raid (${HEADSTONE_SAUCE} sauce).`;
  if (r.used.includes('headstone')) return 'One Health Stone per raid.';
  if (!r.units.some((u) => fighter(u) && u.state !== 'queued')) return 'Send someone in first!';
  s.inventory.headstone--;
  r.used.push('headstone');
  r.heal = { until: r.t + HEADSTONE_SEC };
  r.events.push({ t: 'stone' });
  return null;
}

export function buyHeadstone(s: GameState): string | null {
  if (s.sauce < HEADSTONE_SAUCE) return 'Not enough Brain Sauce!';
  s.sauce -= HEADSTONE_SAUCE;
  s.inventory.headstone++;
  return null;
}

/** Summon Stone (ours, like the original's Yeti stone): a Big Foot-Long joins the squad, up to three at once. */
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
    hp: 600,
    dmg: 12,
    speed: raidSpeed(3, true),
    cdMax: swingSec(3),
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
function besideTile(r: RaidState, u: RaidUnit, t: Pt): Pt | null {
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

/** A random free floor tile inside (for wandering waiters and panicking diners). */
function randomInside(r: RaidState): Pt | null {
  const blocked = blockedTiles(r);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rnd(r) * r.room.w);
    const y = Math.floor(rnd(r) * r.room.h);
    if (!blocked.has(key(x, y))) return { x, y };
  }
  return null;
}

/** The raid goes LIVE: the first zombie is through the door. Diners scream; waiters drop their plates. */
function goLive(r: RaidState) {
  if (r.aggro) return;
  r.aggro = true;
  r.liveAt = r.t;
  r.events.push({ t: 'live' });
  for (const c of r.units) {
    if (c.kind === 'staff') {
      c.task = undefined;
      c.path = [];
    }
    // seated diners (walk-ins still outside scream once they come through the door)
    if (c.kind === 'customer' && alive(c) && indoors(r, c) && c.state !== 'walk') {
      c.state = 'scream';
      c.busyUntil = r.t + 0.6 + rnd(r) * 0.8;
      r.events.push({ t: 'scream', unit: c.id, x: c.x, y: c.y });
    }
  }
}

/** A customer is killed: +20 cash and +2 XP (kept win or lose); a zombie eats it for +5 energy. */
function killCustomer(r: RaidState, z: RaidUnit, c: RaidUnit) {
  const cash = r.stats.dinerCash;
  c.hp = 0;
  c.state = 'gone';
  c.path = [];
  z.kills++;
  z.eats++;
  r.eaten++;
  r.cashEaten += cash;
  if (eater(z)) {
    z.state = 'eat';
    z.path = [];
    z.busyUntil = r.t + 1.4;
    z.hp = Math.min(z.maxHp, z.hp + KILL_HEALTH_BOOST);
  }
  r.events.push({ t: 'eat', unit: z.id, customer: c.id, cash, x: c.x, y: c.y });
}

/** One swing lands: damage = Attack (×2 strength stone, Cheerleader pep, a pet's crit), then abilities. */
function swing(r: RaidState, from: RaidUnit, to: RaidUnit) {
  from.attackAt = r.t;
  from.swings = (from.swings ?? 0) + 1;
  let dmg = from.dmg;
  if (from.side === 'z') {
    if (r.buff?.kind === 'str' && r.t < r.buff.until) dmg *= STR_BUFF;
    if (r.units.some((c) => c.ztype === 'cheerleader' && fighter(c) && c.state !== 'queued' && dist(c, from) <= CHEER_RANGE)) dmg *= 1 + CHEER_BONUS;
  }
  let crit = false;
  if (from.crit && rnd(r) < from.crit.chance) {
    dmg *= from.crit.mult;
    crit = true;
    r.events.push({ t: 'ability', unit: from.id, kind: 'crit', x: to.x, y: to.y });
  }
  dmg = Math.round(dmg * 10) / 10;
  hurt(r, from, to, dmg, true, crit);
  if (from.side !== 'z' || !from.ztype || to.kind === 'customer') return;
  // per-type raid abilities (see ABILITIES)
  if (from.ztype === 'boxer' && alive(to)) {
    hurt(r, from, to, Math.round(dmg * BOXER_JAB * 10) / 10, false);
    r.events.push({ t: 'ability', unit: from.id, kind: 'jab', x: to.x, y: to.y });
  }
  if (from.ztype === 'sumo' && from.swings % SUMO_EVERY === 0) {
    r.events.push({ t: 'ability', unit: from.id, kind: 'slam', x: to.x, y: to.y });
    for (const o of r.units) if (o !== to && o.side === 'r' && alive(o) && dist(o, to) <= 1.6) hurt(r, from, o, Math.round(dmg * 0.5 * 10) / 10, true);
  }
  if (from.ztype === 'cop' && from.swings % COP_EVERY === 0 && alive(to)) {
    to.busyUntil = Math.max(to.busyUntil, r.t + COP_STUN);
    to.path = [];
    r.events.push({ t: 'ability', unit: from.id, kind: 'stun', x: to.x, y: to.y });
  }
}

/** A blow lands: lose energy; a customer is grabbed (or killed); anyone else is knocked a tile back and turns on the attacker, or goes down. */
function hurt(r: RaidState, from: RaidUnit, to: RaidUnit, dmg: number, knock: boolean, crit = false) {
  if (!alive(to)) return;
  if (from.side === 'z' && to.kind !== 'customer') r.dealt += Math.min(dmg, to.hp);
  to.hp -= dmg;
  to.hitAt = r.t;
  r.events.push({ t: 'hit', unit: to.id, by: from.id, dmg, x: to.x, y: to.y, crit: crit || undefined });
  if (to.kind === 'customer') {
    if (to.hp <= 0) return killCustomer(r, from, to);
    to.state = 'grabbed';
    to.busyUntil = r.t + GRAB_SEC;
    to.path = [];
    return;
  }
  if (to.hp <= 0) {
    to.hp = 0;
    to.state = 'down';
    to.path = [];
    to.push = undefined;
    to.target = undefined;
    to.busyUntil = r.t + 1.2;
    from.kills++;
    r.events.push({ t: 'ko', unit: to.id, x: to.x, y: to.y });
    if (r.focus === to.id) r.focus = undefined;
    return;
  }
  if (knock) knockback(r, from, to);
  fightBack(r, to, from);
}

/** Every hit knocks the victim one tile away from the attacker, if that tile is inside and clear (original tookDamage). */
function knockback(r: RaidState, from: RaidUnit, to: RaidUnit) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  const sx = d < 0.05 ? from.facing : Math.round(dx / d);
  const sy = d < 0.05 ? 0 : Math.round(dy / d);
  const tx = Math.round(to.x) + sx;
  const ty = Math.round(to.y) + sy;
  if (!isInside(tx, ty, r.room) || blockedTiles(r).has(key(tx, ty))) return;
  to.push = { x: tx, y: ty };
  to.path = [];
}

/** Being knocked back: slide to the tile; nothing else happens until it lands. */
function slide(u: RaidUnit, dt: number): boolean {
  const p = u.push;
  if (!p) return false;
  const dx = p.x - u.x;
  const dy = p.y - u.y;
  const d = Math.hypot(dx, dy);
  const step = dt / KNOCKBACK_SEC;
  if (d <= step) {
    u.x = p.x;
    u.y = p.y;
    u.push = undefined;
  } else {
    u.x += (dx / d) * step;
    u.y += (dy / d) * step;
  }
  return true;
}

/**
 * Hit someone and they turn on you, unless they're already fighting someone in reach (original
 * tookDamage). Your zombies only do it on a rampage: a zombie you gave a target or sent for the food
 * keeps to its orders.
 */
function fightBack(r: RaidState, to: RaidUnit, from: RaidUnit) {
  if (!alive(from) || to.state === 'queued') return;
  if (to.side === 'z' && to.order && to.order.kind !== 'attack') return;
  if (to.side === 'z' && from.kind === 'customer') return;
  const cur = to.target ? r.units.find((x) => x.id === to.target) : undefined;
  if (cur && alive(cur) && dist(to, cur) <= REACH) return;
  to.target = from.id;
}

/** Close in on a target and swing when in reach: the swing timer starts when it steps into reach. */
function fight(r: RaidState, u: RaidUnit, t: RaidUnit, dt: number) {
  u.target = t.id;
  if (dist(u, t) <= REACH) {
    u.path = [];
    face(u, t.x - u.x, t.y - u.y);
    u.state = 'attack';
    if (u.engaged !== t.id) {
      u.engaged = t.id;
      u.cd = u.cdMax;
    }
    u.cd -= dt;
    if (u.cd <= 0) {
      u.cd += u.cdMax;
      swing(r, u, t);
    }
    return;
  }
  u.engaged = undefined;
  u.state = 'walk';
  if (r.t >= u.repathAt || !u.path.length) {
    u.repathAt = r.t + 0.45;
    const spot = besideTile(r, u, t);
    if (spot) goTo(r, u, spot);
  }
  walk(u, dt);
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

/** The unit's current target, if it's still standing and inside the café (else it's dropped). */
function lockedTarget(r: RaidState, u: RaidUnit): RaidUnit | undefined {
  if (!u.target) return undefined;
  const t = r.units.find((x) => x.id === u.target);
  if (t && alive(t) && indoors(r, t)) return t;
  u.target = undefined;
  u.engaged = undefined;
  return undefined;
}

/** Your squad inside the café (what the staff go for). */
const squadInside = (r: RaidState) => r.units.filter((o) => fighter(o) && o.state !== 'queued' && indoors(r, o));

/**
 * A rampaging zombie's next victim: the nearest diner or waiter inside (pets skip the diners). The chef
 * only once no waiter is standing.
 */
function prey(r: RaidState, u: RaidUnit): RaidUnit | undefined {
  const list = r.units.filter((x) => alive(x) && indoors(r, x) && (x.kind === 'staff' || (x.kind === 'customer' && eater(u))));
  const t = nearest(u, list);
  if (t) return t;
  const chef = r.units.find((x) => x.kind === 'boss' && alive(x));
  return chef && (r.bossOut || !r.units.some((x) => x.kind === 'staff' && alive(x))) ? chef : undefined;
}

function updateSquad(r: RaidState, u: RaidUnit, dt: number) {
  if (u.state === 'queued' || !alive(u) || r.t < u.busyUntil) return;
  if (u.state === 'eat' || u.state === 'steal') u.state = 'walk';
  // walking in through the door sets things off
  if (!r.aggro && indoors(r, u)) goLive(r);
  const o = u.order ?? { kind: 'attack' };
  // 1) grab food off the counter (2 s, original StealFoodTask)
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
      r.stolen.push(c.dish);
      r.haul.push({ dish: c.dish, servings: c.servings });
      c.servings = 0;
      u.busyUntil = r.t + 2;
      u.state = 'steal';
      u.order = { kind: 'attack' };
      r.events.push({ t: 'steal', unit: u.id, dish: c.dish, x: u.x, y: u.y });
      return;
    }
  }
  // 2) the target you tapped, until it drops (it can be outside: a diner on the doorstep)
  if (o.kind === 'target') {
    const t = r.units.find((x) => x.id === o.id && alive(x));
    if (t) return fight(r, u, t, dt);
    u.order = { kind: 'attack' };
    u.target = undefined;
  }
  // 3) rampage: keep after the current victim while it's inside, else the nearest one
  let t = lockedTarget(r, u);
  if (!t) {
    t = prey(r, u);
    u.target = t?.id;
  }
  if (t) return fight(r, u, t, dt);
  u.state = 'idle';
}

/** Before the raid goes live, a waiter now and then carries a plate from the counter to a seated diner. */
function serveSomeone(r: RaidState) {
  if (r.aggro || r.nextServeAt === undefined || r.t < r.nextServeAt) return;
  r.nextServeAt = r.t + 4 + rnd(r) * 6;
  const free = r.units.filter((u) => u.kind === 'staff' && alive(u) && !u.task);
  const diners = r.units.filter((u) => u.kind === 'customer' && alive(u) && u.state === 'idle' && indoors(r, u));
  if (!free.length || !diners.length) return;
  const w = free[Math.floor(rnd(r) * free.length)];
  const d = diners[Math.floor(rnd(r) * diners.length)];
  w.task = { kind: 'fetch', goal: stealSpot(r), diner: d.id };
  w.path = [];
}

function staffWork(r: RaidState, u: RaidUnit, dt: number) {
  const job = u.task;
  if (!job) {
    u.state = 'idle';
    return;
  }
  if (dist(u, job.goal) > 0.15) {
    if (!u.path.length && !goTo(r, u, job.goal)) {
      u.task = undefined;
      return;
    }
    u.state = 'walk';
    walk(u, dt);
    return;
  }
  u.path = [];
  if (job.kind === 'fetch') {
    // pick up the plate, then take it to the diner
    const d = r.units.find((x) => x.id === job.diner && alive(x));
    const spot = d && besideTile(r, u, d);
    u.busyUntil = r.t + 0.6;
    u.task = spot ? { kind: 'deliver', goal: spot, diner: job.diner } : { kind: 'home', goal: u.home ?? job.goal };
  } else if (job.kind === 'deliver') {
    // the hand-off (original ServeTask 0.35 s), then back to the post
    const d = r.units.find((x) => x.id === job.diner);
    if (d) face(u, d.x - u.x, d.y - u.y);
    u.busyUntil = r.t + 0.35;
    u.task = { kind: 'home', goal: u.home ?? job.goal };
  } else {
    u.task = undefined;
    u.state = 'idle';
  }
}

/** Waiters: café work until the raid is live; then each keeps after the nearest zombie inside until it drops or leaves. */
function updateStaff(r: RaidState, u: RaidUnit, dt: number) {
  if (!alive(u) || r.t < u.busyUntil) return;
  if (!r.aggro) return staffWork(r, u, dt);
  let t = lockedTarget(r, u);
  if (!t) {
    t = nearest(u, squadInside(r));
    u.target = t?.id;
  }
  if (t) return fight(r, u, t, dt);
  // nobody in: wander to a random tile inside and wait
  u.state = u.path.length ? 'walk' : 'idle';
  if (!u.path.length && r.t >= u.repathAt) {
    u.repathAt = r.t + 2 + rnd(r) * 2;
    const p = randomInside(r);
    if (p) goTo(r, u, p);
  }
  walk(u, dt);
}

/** The Head Chef: at the stove until every waiter is down (then after the nearest zombie inside), but fights back if hit. */
function updateChef(r: RaidState, u: RaidUnit, dt: number) {
  if (!alive(u) || r.t < u.busyUntil) return;
  let t = lockedTarget(r, u);
  if (!t && r.bossOut) {
    t = nearest(u, squadInside(r));
    u.target = t?.id;
  }
  if (t) return fight(r, u, t, dt);
  u.state = 'idle';
  if (u.home && dist(u, u.home) > 0.2) {
    u.state = 'walk';
    if (!u.path.length) goTo(r, u, u.home);
    walk(u, dt);
  } else face(u, -1, 0); // tending the stove
}

function updateDiner(r: RaidState, c: RaidUnit, dt: number) {
  if (!alive(c) || r.t < c.busyUntil) return;
  if (c.state === 'grabbed') c.state = 'flee';
  if (c.state === 'walk' && c.seatId) {
    // a walk-in: once through the door into a brawl, scream first, then run
    if (r.aggro && indoors(r, c)) {
      c.state = 'scream';
      c.path = [];
      c.busyUntil = r.t + 0.6 + rnd(r) * 0.6;
      r.events.push({ t: 'scream', unit: c.id, x: c.x, y: c.y });
      return;
    }
    walkToSeat(r, c, dt);
    return;
  }
  if (!r.aggro) return;
  // panic: run around inside for ten loops of the run clip, then out the door and off down the street
  if (c.state !== 'flee') {
    c.state = 'flee';
    c.path = [];
    c.speed = DINER_RUN;
    c.panicUntil = r.t + CUSTOMER_PANIC_LOOPS * RUN_CLIP_SEC * (0.5 + rnd(r) * 0.5);
  }
  if (!c.path.length) {
    if (r.t < (c.panicUntil ?? 0)) {
      const p = randomInside(r);
      if (p) goTo(r, c, p);
    } else {
      const exit = { x: -1, y: r.room.h + STREET_RUN };
      if (dist(c, exit) < 0.3) {
        c.state = 'gone';
        r.events.push({ t: 'escape', unit: c.id });
        return;
      }
      goTo(r, c, exit);
    }
  }
  walk(c, dt);
}

export function stepRaid(r: RaidState, dt: number) {
  if (r.phase !== 'fight' || r.hold) return;
  r.t += dt;
  const chef = r.units.find((u) => u.kind === 'boss')!;
  // the health tombstone mends the whole squad while it glows (+100 over the 5 s); a Health Stone stacks on top
  const healRate = (r.buff?.kind === 'hp' && r.t < r.buff.until ? HP_BUFF / BUFF_SEC : 0) + (r.heal && r.t < r.heal.until ? HEADSTONE_HEAL / HEADSTONE_SEC : 0);
  if (healRate) for (const u of r.units) if (fighter(u)) u.hp = Math.min(u.maxHp, u.hp + healRate * dt);
  trickleDiners(r);
  serveSomeone(r);
  for (const u of r.units) {
    if (alive(u) && slide(u, dt)) continue;
    if (u.side === 'z') updateSquad(r, u, dt);
    else if (u.kind === 'staff') updateStaff(r, u, dt);
    else if (u.kind === 'boss') updateChef(r, u, dt);
    else updateDiner(r, u, dt);
  }
  // whoever just stepped through the door sets it off, and the last waiter down brings the chef out
  if (!r.aggro && squadInside(r).length) goLive(r);
  if (!r.bossOut && r.aggro && r.units.filter((u) => u.kind === 'staff').every((u) => u.hp <= 0)) {
    r.bossOut = true;
    r.events.push({ t: 'boss', x: chef.x, y: chef.y });
  }
  if (chef.hp <= 0) {
    r.phase = 'won';
    r.events.push({ t: 'end', result: 'won' });
  } else if (r.units.filter((u) => u.side === 'z').every((u) => u.hp <= 0)) {
    r.phase = 'lost';
    r.events.push({ t: 'end', result: 'lost' });
  } else if (r.t >= RAID_TIME) {
    // no clock as such: after five minutes of standoff the squad gives up and heads home
    r.phase = 'retreat';
    r.events.push({ t: 'end', result: 'retreat' });
  }
  if (r.events.length > 300) r.events.splice(0, r.events.length - 300);
}

// ---------- wrap-up ----------

/** A rival without a signature dish hands over a secret recipe you don't know yet. */
function secretRecipe(s: GameState, r: RaidState): string | undefined {
  const secret = DISHES.filter((d) => d.source === 'raid' && !s.recipes.includes(d.id));
  return secret.length ? secret[Math.floor(rnd(r) * secret.length)].id : undefined;
}

/** Apply the raid's outcome to the joint: cash, loot to the Fridge, KOs, XP, rival progress. */
export function finishRaid(s: GameState, r: RaidState): RaidResult {
  if (r.phase === 'fight') retreat(r);
  const def = RIVAL_BY_ID[r.rival];
  const won = r.phase === 'won';
  const loot = [...r.haul];
  const out: RaidResult = {
    result: r.phase as RaidResult['result'],
    // +20 cash and +2 XP for every customer killed, win or lose (original)
    cash: r.cashEaten,
    xp: r.eaten * XP_PER_EAT,
    sauce: 0,
    dishes: [],
    servings: [],
    stars: 0,
    kos: [],
    eaten: r.eaten,
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
    // +2 XP a kill for the zombie that made it
    if (w.kind === 'zombie' && u.kills) addZombieXp(s, w, ZOMBIE_KILL_XP * u.kills);
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
  // a retreat before anyone set foot past the line-up isn't a raid at all: no XP, no timers touched
  const entered = r.units.some((u) => u.side === 'z' && u.state !== 'queued');
  if (!won && !entered) {
    out.dishes = [];
    out.servings = [];
    return out;
  }
  const prog = s.rivals[r.rival] ?? { stars: 0, wins: 0, nextAt: 0 };
  prog.lastRaid = s.now;
  prog.warned = undefined;
  if (won) {
    // stars: a win, half your zombies still standing, a quick job (a squad of only pets/summons gets the one)
    const horde = r.units.filter((u) => u.side === 'z' && u.state !== 'queued' && (u.kind === 'zombie' || u.kind === 'you'));
    const standing = horde.filter((u) => u.hp > 0).length;
    out.stars = horde.length ? 1 + (standing >= Math.ceil(horde.length / 2) ? 1 : 0) + (r.t <= 75 ? 1 : 0) : 1;
    out.cash += raidReward(s, r.stats, r.rival).cash;
    out.xp += r.stats.reward.xp;
    // the chef sometimes drops Brain Sauce (the boss café always does)
    if (r.rival === 'boss') out.sauce = 3 + (rnd(r) < 0.5 ? 2 : 0);
    else if (rnd(r) < Math.min(0.95, def.sauceChance * (r.t < 75 ? 1.3 : 1))) out.sauce = 1 + (rnd(r) < 0.3 ? 1 : 0);
    // a recipe: the signature the first time (then 35%); the boss café, and joints without a signature
    // dish, hand over a secret you don't know
    if (!def.signature) {
      if (r.rival === 'boss' || prog.wins === 0 || rnd(r) < 0.35) out.recipeDrop = secretRecipe(s, r);
    } else if (!s.recipes.includes(def.signature) && (prog.wins === 0 || rnd(r) < 0.35)) out.recipeDrop = def.signature;
    if (out.recipeDrop) loot.push({ dish: out.recipeDrop, servings: Math.max(6, Math.round(DISH_BY_ID[out.recipeDrop].servings / 2)) });
    // the spoils: whatever is still on their counter comes home with you
    for (const c of r.counter)
      if (c.servings > 0) {
        loot.push({ dish: c.dish, servings: c.servings });
        c.servings = 0;
      }
    prog.wins++;
    prog.stars = Math.max(prog.stars, out.stars);
    // wrecked: boarded up (original reopen timers 4 / 8 / 12 / 18 h), then new management (a bit tougher, a bit richer)
    prog.nextAt = s.now + rivalClosedSec(prog.gen ?? 0);
    prog.gen = (prog.gen ?? 0) + (r.rival === 'boss' ? 0 : 1);
    s.stats.raidsWon++;
  } else {
    prog.nextAt = s.now + 60;
    // a consolation for a real fight: up to 15% of the win XP, by how much of their HP you knocked off
    const total = r.stats.staff.count * r.stats.staff.hp + r.stats.chef.hp;
    out.xp += Math.round(r.stats.reward.xp * 0.15 * Math.min(1, r.dealt / total));
  }
  s.rivals[r.rival] = prog;
  out.dishes = loot.map((l) => l.dish);
  out.servings = loot.map((l) => l.servings);
  s.cash += out.cash;
  s.stats.earned += out.cash;
  s.sauce += out.sauce;
  if (out.xp) addXp(s, out.xp);
  for (const l of loot) s.fridge.push({ dish: l.dish, servings: l.servings });
  if (s.fridge.length > 12) s.fridge.splice(0, s.fridge.length - 12);
  return out;
}
