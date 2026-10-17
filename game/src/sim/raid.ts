/**
 * Raids (v3), played like the original: a rival joint is a real café on its own street corner.
 *
 * - Your squad lines up single file on the sidewalk outside. Like the original, only zombies go:
 *   the chef (YOU) stays home and minds the joint.
 * - Tap a zombie, then ATTACK to send it on a rampage, or tap a target for it: a person, or the
 *   counter to swipe a dish. ATTACK ALL sends everyone.
 * - Zombies walk to the door at their own speed and go in.
 * - The moment the fight starts, the diners scream and run for the door; catch one and it's lunch
 *   (cash you keep even if you lose). The waiters swarm your zombies.
 * - The Head Chef stays behind the counter in the kitchen, and fights anyone who comes in, until most
 *   of the staff are down. Then the chef storms out. Beat the chef to win.
 * - Knocked-out waiters are lunch too: a zombie feasts on the body for cash, like a diner.
 * - Tap a tombstone you own for a 5-second glow buff (x2 strength, or +100 HP), one at a time; the
 *   revive tombstone stands your KO'd zombies back up. A Health Stone heals everyone +100 on top.
 * - Win and you take whatever food is still on their counter. Each eaten diner is worth +2 XP.
 * - There's no clock, as in the original; after five minutes the squad gives up and goes home.
 * - Wave the white flag to retreat. KO'd zombies reanimate back home later.
 *
 * Rivals scale with your level (rivals.ts): staff, chef and payout follow the original's curves.
 * A zombie's Energy is its health. Pure and deterministic (own RNG): the scene renders it, tests drive it.
 */
import { DISHES, DISH_BY_ID, TUNING, VARIANTS, variantId, walkSpeed } from './data';
import { ITEM_BY_ID, type Dir } from './catalog';
import { DOOR_X, STREET_RUN, findPath, isInside, key, type Pt, type Room } from './grid';
import { maxEnergy, type Furniture, type GameState, type Worker } from './state';
import { addXp, addZombieXp, arrivalGap, dishAvailable, outsideSpot, releaseJob, validSeats } from './sim';
import { RIVAL_BY_ID, rivalClosedSec, rivalCurve, rivalGen, rivalLevel, rivalReady, rivalStats, type RivalId, type RivalStats } from './rivals';

export * from './rivals';

/** No clock, like the original: a generous five minutes, then the squad gives up and comes home (a retreat). */
export const RAID_TIME = 300;
export const SUMMON_COST = 5; // Brain Sauce
export const BUFF_SEC = 5;
/** Tombstones (original): x2 strength, or +100 HP spread over the 5 s glow. */
/**
 * Tombstone glows. The original's x2 strength / +100 HP made every stone an I-win button (a design
 * audit of 21 squads x 6 rivals: five heals lifted every borderline fight to 94–100%), so ours are
 * gentler: x1.5 strength, about +30 HP over the glow, and each stone works once per raid.
 */
export const STR_BUFF = 1.5;
export const HP_BUFF = 30;
export const TOMBSTONE_USES = 5;
/** A level-2 tombstone holds seven uses a day (original). */
export const TOMBSTONE_USES_L2 = 7;
export const TOMBSTONE_RECHARGE = 24 * 3600;
/** Refill a spent tombstone now instead of waiting the day out (original: 2 toxin). */
export const TOMBSTONE_RECHARGE_SAUCE = 2;
export const TOMBSTONE_UPGRADE_SAUCE = 15;
/** A revived zombie gets back up with this share of its health. */
export const REVIVE_HP = 0.5;
/** The Health Stone: +60 HP to every zombie and pet in the raid over 3 s, alongside any tombstone glow. One per raid. */
export const HEADSTONE_SAUCE = 3;
export const HEADSTONE_HEAL = 60;
export const HEADSTONE_SEC = 3;
/** Counter food (original Cafe::getNewRandomFoodStack): stacks a quarter of normal size… */
export const RAID_FOOD_COUNT_MULTIPLIER = 0.25;
/** …of a dish rolled at your level -3, -2, -1, 0, +1 against these cumulative odds (%)… */
export const RECIPE_LEVEL_ODDS = [15, 35, 65, 95, 100];
/** …a rare variant 40% of the time (the original's 10-way roll is 60% plain), now and then a raid-only recipe. */
export const COUNTER_VARIANT_CHANCE = 0.4;
export const RARE_RECIPE_CHANCE = 0.02;
/** Player XP for every diner (or waiter) eaten, kept win or lose (original). */
export const XP_PER_EAT = 2;
/** A knocked-out waiter feeds you this many times a diner's cash. */
export const BODY_CASH_MULT = 2;

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
  /** your zombies: the customer type it was (for its raid ability, see ABILITIES) */
  ztype?: string;
  /** swings landed (Sumo slams every third, Cop stuns every fourth) */
  swings?: number;
}

/**
 * Per-type raid abilities, so a premium squad beats a horde of Average Joes:
 *   sumo        every 3rd swing is a belly-slam: everyone around the target takes half a hit and is knocked down 1.2 s
 *   boxer       one-two: every swing lands a second jab for 70%
 *   cop         every 4th swing cuffs the target: stunned 2 s
 *   cheerleader +15% damage for every zombie within 2.5 tiles (her too; doesn't stack)
 *   champ       taunt: waiters and the chef within 3 tiles go for the Champ first
 */
export const ABILITIES: Record<string, string> = {
  sumo: 'Belly-slam: knocks down everyone around the target',
  boxer: 'One-two: every swing lands twice',
  cop: 'Cuffs: every 4th hit stuns the target for 2 s',
  cheerleader: 'Pep: zombies near her hit 15% harder',
  champ: 'Taunt: nearby staff go for the Champ first',
};
export const BOXER_JAB = 1;
/** A zombie's raid swing by Power (1–10): weighted toward Power so a few strong zombies outclass a horde of weak ones. */
export const zombieRaidDmg = (power: number) => 2 + 1.7 * power;
export const SUMO_EVERY = 3;
export const SUMO_KNOCKDOWN = 1.2;
export const COP_EVERY = 4;
export const COP_STUN = 2;
export const CHEER_BONUS = 0.15;
export const CHEER_RANGE = 2.5;
export const TAUNT_RANGE = 3;

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
      /** the diner, or the knocked-out waiter (body), that got eaten */
      customer: string;
      cash: number;
      x: number;
      y: number;
      body?: boolean;
    }
  | { t: 'steal'; unit: string; dish: string; x: number; y: number }
  | { t: 'scream'; unit: string; x: number; y: number }
  | { t: 'arrive'; unit: string; x: number; y: number }
  | { t: 'escape'; unit: string }
  | { t: 'enter'; unit: string }
  | { t: 'boss'; x: number; y: number }
  | { t: 'buff'; kind: 'str' | 'hp' }
  | { t: 'revive'; unit: string; x: number; y: number }
  | { t: 'stone' }
  | { t: 'ability'; unit: string; kind: 'slam' | 'jab' | 'stun' | 'taunt'; x: number; y: number }
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
  aggro: boolean;
  bossOut: boolean;
  buff?: { kind: 'str' | 'hp'; until: number };
  /** a Health Stone mending everyone */
  heal?: { until: number };
  /** tombstones (furniture ids) and the Health Stone ('headstone') already used this raid: once each */
  used: string[];
  /** legacy "everyone pile on this" target (also used by tests) */
  focus?: string;
  cashEaten: number;
  /** diners and waiters eaten (+2 XP each) */
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
  /** diners and waiters eaten */
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

const DINER_ART = ['accountant', 'teen', 'yoga', 'politician', 'nurse', 'joe', 'jane', 'senior', 'hipster', 'ceo'];
/** Original NUM_CUSTOMERS by café level: 2 diners at levels 1–2, 3 at 3–5, 4 at 6–11, 5 at 12–17… */
export function startingDiners(level: number): number {
  return rivalCurve(level).customers;
}

function seatDiner(r: RaidState, c: RaidFurniture, i: number) {
  if (r.units.some((u) => u.seatId === c.id && alive(u))) return;
  unit(r, {
    side: 'c',
    kind: 'customer',
    art: DINER_ART[(i * 3 + r.gen) % DINER_ART.length],
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
    hp: 2,
    dmg: 0,
    speed: 1.7,
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

/** Lay out a rival joint the way the original's were: kitchen behind dividers, diners at tables. */
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

/** How hard a zombie hits per swing, abilities folded in (Boxers jab twice, Sumos slam, Cheerleaders pep). */
export function raidPunch(type: string, power: number): number {
  const base = zombieRaidDmg(power);
  return base * (type === 'boxer' ? 1 + BOXER_JAB : type === 'sumo' ? 1.5 : type === 'cop' ? 1.4 : type === 'cheerleader' ? 1.15 : 1);
}

export type Threat = 'Easy' | 'Even' | 'Deadly';
/**
 * The rival card's threat meter: squad punch (sum of 3 + 1.6 x Power, abilities folded in, times each
 * zombie's energy fraction) against the staff's and chef's HP. Easy wins comfortably, Even is a coin
 * toss that tombstones and good targeting decide, Deadly loses.
 */
export function raidThreat(s: GameState, id: RivalId, workerIds: string[]): { punch: number; hp: number; ratio: number; label: Threat } {
  const st = rivalStats(id, rivalLevel(s, id), rivalGen(s, id));
  const ids = new Set(workerIds);
  const squad = s.workers.filter((w) => ids.has(w.id) && w.kind === 'zombie');
  const punch = squad.reduce((a, w) => a + raidPunch(w.type, w.stats.power) * Math.min(1, w.energy / maxEnergy(w)), 0);
  const health = squad.reduce((a, w) => a + w.energy, 0);
  const hp = st.staff.count * st.staff.hp + st.chef.hp;
  // seconds to chew through their HP, against seconds for them to flatten the squad (the chef joins half-way)
  const toWin = hp / Math.max(1, (punch * COMBAT_PACE) / 0.9);
  const toLose = health / Math.max(0.1, ((st.staff.count * st.staff.dmg) / 1.1 + (st.chef.dmg / 1.2) * 0.5) * COMBAT_PACE);
  const ratio = toWin / Math.max(1, toLose);
  return { punch: Math.round(punch), hp, ratio, label: ratio <= THREAT_EASY ? 'Easy' : ratio <= THREAT_EVEN ? 'Even' : 'Deadly' };
}
export const THREAT_EASY = 0.8;
export const THREAT_EVEN = 1.4;

/** A raid-sized stack of one dish (the original's RAID_FOOD_COUNT_MULTIPLIER). */
export function raidStack(dish: string): number {
  return Math.max(1, Math.round((DISH_BY_ID[dish]?.servings ?? 4) * RAID_FOOD_COUNT_MULTIPLIER));
}

/**
 * What's sitting on a rival's counter (original Cafe::getNewRandomFoodStack): one of your own dishes,
 * rolled at your level -3..+1 ([15, 35, 65, 95, 100]), 40% of the time a rare variant, very rarely a
 * raid-only recipe. A level with no new dish of its own falls back to the nearest one below.
 */
export function rollCounterDish(s: GameState, r: RaidState): string {
  if (rnd(r) < RARE_RECIPE_CHANCE) {
    const rare = DISHES.filter((d) => d.source === 'raid');
    return rare[Math.floor(rnd(r) * rare.length)].id;
  }
  const roll = rnd(r) * 100;
  const step = RECIPE_LEVEL_ODDS.findIndex((c) => roll < c);
  const levelDishes = DISHES.filter((d) => d.source === 'level');
  const lowest = Math.min(...levelDishes.map((d) => d.level));
  let lv = Math.max(lowest, s.level - 3 + step);
  let pool = levelDishes.filter((d) => d.level === lv);
  while (!pool.length && lv > lowest) {
    lv--;
    pool = levelDishes.filter((d) => d.level === lv);
  }
  // at your own level, the secret recipes you've learned are fair game too
  if (step === 3) pool = pool.concat(DISHES.filter((d) => d.source === 'raid' && s.recipes.includes(d.id)));
  const dish = pool[Math.floor(rnd(r) * pool.length)].id;
  return rnd(r) < COUNTER_VARIANT_CHANCE ? variantId(dish, VARIANTS[Math.floor(rnd(r) * VARIANTS.length)].id) : dish;
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
  // the food on the counter: two stacks (three at a level-10+ joint), rolled from your own menu
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
      dmg: zombieRaidDmg(w.stats.power),
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
  // the diners, each on their chair facing their table. Like the original, only some chairs start
  // taken (its per-level customer count); more walk in off the street during the raid
  const chairs = r.furniture.filter((f) => ITEM_BY_ID[f.item]?.kind === 'chair');
  const seated = Math.min(chairs.length, st.diners);
  for (let k = 0; k < seated; k++) {
    const i = Math.floor((k * chairs.length) / seated); // spread round the room
    seatDiner(r, chairs[i], i);
  }
  r.nextDinerAt = 5 + rnd(r) * 15;
  // the waiters (NUM_SERVERS for the level), on their posts in the aisles
  const posts: Pt[] = [];
  for (const x of [3, 5, 7]) for (let y = 1; y < r.room.h; y++) if (x < W && !blockedTiles(r).has(key(x, y))) posts.push({ x, y });
  const pick = posts.filter((_, i) => i % 2 === 0).concat(posts.filter((_, i) => i % 2 === 1));
  for (let i = 0; i < st.staff.count; i++) {
    const p = pick[i % pick.length];
    unit(r, {
      side: 'r',
      kind: 'staff',
      art: i % 2 ? `staff_${rivalId}_b` : `staff_${rivalId}`,
      name: i % 2 ? 'Waitress' : 'Waiter',
      x: p.x,
      y: p.y,
      home: p,
      hp: st.staff.hp,
      dmg: st.staff.dmg,
      speed: st.staff.speed,
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
    hp: st.chef.hp,
    dmg: st.chef.dmg,
    speed: st.chef.speed,
    cdMax: 1.2,
    facing: 1,
  });
  return r;
}

// ---------- player commands ----------

const fighter = (u: RaidUnit) => u.side === 'z' && u.hp > 0 && u.state !== 'down' && u.state !== 'gone';
/** A knocked-out waiter, lying there waiting to be eaten. */
export const isBody = (u: RaidUnit) => u.kind === 'staff' && u.state === 'down';
/** Only real zombies eat (pets and the summon just fight). */
const eater = (u: RaidUnit) => u.kind === 'zombie' || u.kind === 'you';

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
    if (t && isBody(t)) {
      if (!eater(u)) return 'Only zombies eat. Send a zombie!';
    } else if (!t || t.side === 'z' || t.hp <= 0 || t.state === 'gone' || t.state === 'down') return 'Pick someone still standing.';
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

/** Tap a knocked-out waiter with nobody picked: the nearest zombie who's in goes and feasts. */
export function feastOn(r: RaidState, bodyId: string): string | null {
  const b = r.units.find((x) => x.id === bodyId);
  if (!b || !isBody(b)) return 'Nothing left to eat.';
  const z = r.units.filter((u) => fighter(u) && eater(u) && u.state !== 'queued' && u.state !== 'eat').sort((a, c) => dist(a, b) - dist(c, b))[0];
  if (!z) return 'Send in a zombie first!';
  return order(r, z.id, { kind: 'target', id: b.id });
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

/** How many uses a tombstone holds a day: 5, or 7 once upgraded to level 2 (original). */
export function tombstoneMax(f: Furniture): number {
  return (f.lvl ?? 1) >= 2 ? TOMBSTONE_USES_L2 : TOMBSTONE_USES;
}

/** Uses left today (a spent tombstone refills 24 h after it ran dry). */
export function tombstoneUses(s: GameState, f: Furniture): number {
  if ((f.usesResetAt ?? 0) && s.now >= (f.usesResetAt ?? 0)) {
    f.uses = tombstoneMax(f);
    f.usesResetAt = undefined;
  }
  return f.uses ?? tombstoneMax(f);
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
 * Tap a tombstone you own: every zombie glows with its blessing for 5 seconds (x2 strength, or
 * +100 HP over the glow), one glow at a time. The revive tombstone instead stands every KO'd
 * zombie back up on the spot, at half health.
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
      u.hp = Math.max(1, Math.round(u.maxHp * REVIVE_HP));
      u.state = 'idle';
      u.path = [];
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

/** Level-2 tombstone: seven uses a day instead of five (the two extra are ready straight away). */
export function upgradeTombstone(s: GameState, furnitureId: string): string | null {
  const t = tombstoneOf(s, furnitureId);
  if (!t) return 'That’s not a tombstone.';
  if ((t.f.lvl ?? 1) >= 2) return 'Already level 2.';
  if (s.sauce < TOMBSTONE_UPGRADE_SAUCE) return 'Not enough Brain Sauce!';
  s.sauce -= TOMBSTONE_UPGRADE_SAUCE;
  const left = tombstoneUses(s, t.f);
  t.f.lvl = 2;
  t.f.uses = left + (TOMBSTONE_USES_L2 - TOMBSTONE_USES);
  t.f.usesResetAt = undefined;
  return null;
}

/** Health Stone: +100 HP to every zombie and pet in the fight over 3 s. Works alongside a tombstone glow. */
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

/** A zombie eats (a caught diner, or a knocked-out waiter): cash, +5 HP (original), +2 XP at the end. */
function devour(r: RaidState, z: RaidUnit, food: RaidUnit, body: boolean) {
  const cash = body ? r.stats.dinerCash * BODY_CASH_MULT : r.stats.dinerCash;
  food.state = 'gone';
  food.path = [];
  z.state = 'eat';
  z.path = [];
  z.busyUntil = r.t + 1.4;
  z.hp = Math.min(z.maxHp, z.hp + 5); // original: +5 per kill
  z.eats++;
  r.eaten++;
  r.cashEaten += cash;
  r.events.push({ t: 'eat', unit: z.id, customer: food.id, cash, x: food.x, y: food.y, body: body || undefined });
}

function damage(r: RaidState, from: RaidUnit, to: RaidUnit) {
  const str = from.side === 'z' && r.buff?.kind === 'str' && r.t < r.buff.until ? STR_BUFF : 1;
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
    devour(r, from, to, false);
    return;
  }
  const cheer = from.side === 'z' && r.units.some((c) => c.ztype === 'cheerleader' && fighter(c) && c.state !== 'queued' && dist(c, from) <= CHEER_RANGE) ? 1 + CHEER_BONUS : 1;
  const dmg = Math.round(from.dmg * str * cheer * COMBAT_PACE * (0.85 + rnd(r) * 0.3) * 10) / 10;
  hurt(r, from, to, dmg);
  aggro(r);
  if (from.side !== 'z' || !from.ztype) return;
  // per-type raid abilities (see ABILITIES)
  from.swings = (from.swings ?? 0) + 1;
  if (from.ztype === 'boxer' && to.hp > 0) {
    hurt(r, from, to, Math.round(dmg * BOXER_JAB * 10) / 10);
    r.events.push({ t: 'ability', unit: from.id, kind: 'jab', x: to.x, y: to.y });
  }
  if (from.ztype === 'sumo' && from.swings % SUMO_EVERY === 0) {
    r.events.push({ t: 'ability', unit: from.id, kind: 'slam', x: to.x, y: to.y });
    for (const o of r.units) {
      if (o.side !== 'r' || !alive(o) || dist(o, to) > 1.6) continue;
      if (o !== to) hurt(r, from, o, Math.round(dmg * 0.5 * 10) / 10);
      if (alive(o)) {
        o.busyUntil = Math.max(o.busyUntil, r.t + SUMO_KNOCKDOWN);
        o.path = [];
      }
    }
  }
  if (from.ztype === 'cop' && from.swings % COP_EVERY === 0 && alive(to)) {
    to.busyUntil = Math.max(to.busyUntil, r.t + COP_STUN);
    to.path = [];
    r.events.push({ t: 'ability', unit: from.id, kind: 'stun', x: to.x, y: to.y });
  }
}

/** One blow lands: lose HP, maybe go down. */
function hurt(r: RaidState, from: RaidUnit, to: RaidUnit, dmg: number) {
  if (to.hp <= 0) return;
  if (from.side === 'z') r.dealt += Math.min(dmg, to.hp);
  to.hp -= dmg;
  to.hitAt = r.t;
  r.events.push({ t: 'hit', unit: to.id, by: from.id, dmg, x: to.x, y: to.y });
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
  approach(r, u, t, dt);
}

function approach(r: RaidState, u: RaidUnit, t: RaidUnit, dt: number) {
  u.state = 'walk';
  if (r.t >= u.repathAt || !u.path.length) {
    u.repathAt = r.t + 0.45;
    const spot = besideTile(r, u, t);
    if (spot) goTo(r, u, spot);
  }
  walk(u, dt);
}

/** Walk up to a knocked-out waiter and feast on the body (once it has finished falling). */
function feast(r: RaidState, u: RaidUnit, b: RaidUnit, dt: number) {
  u.target = b.id;
  if (dist(u, b) <= REACH) {
    u.path = [];
    face(u, b.x - u.x, b.y - u.y);
    if (r.t < b.busyUntil) {
      u.state = 'idle';
      return;
    }
    devour(r, u, b, true);
    return;
  }
  approach(r, u, b, dt);
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
      r.stolen.push(c.dish);
      r.haul.push({ dish: c.dish, servings: c.servings });
      c.servings = 0;
      u.busyUntil = r.t + 2; // original: swiping a dish takes 2 s
      u.state = 'steal';
      u.order = { kind: 'attack' };
      r.events.push({ t: 'steal', unit: u.id, dish: c.dish, x: u.x, y: u.y });
      return;
    }
  }
  // 2) a specific target (or a body to eat)
  if (o.kind === 'target') {
    const t = r.units.find((x) => x.id === o.id && (alive(x) || isBody(x)));
    if (t && isBody(t)) return feast(r, u, t, dt);
    if (t) return fight(r, u, t, dt);
    u.order = { kind: 'attack' };
  }
  // 3) rampage: food first (zombies can't resist: diners, and waiters lying there), else the nearest
  //    waiter, else the chef
  const chef = r.units.find((x) => x.kind === 'boss')!;
  const pet = !eater(u);
  const diners = pet ? [] : r.units.filter((x) => x.kind === 'customer' && alive(x) && (indoors(r, x) || dist(u, x) < 4));
  const bodies = pet ? [] : r.units.filter(isBody);
  const staff = r.units.filter((x) => x.kind === 'staff' && alive(x));
  const d = nearest(u, [...diners, ...bodies]);
  const e = nearest(u, staff);
  if (d && (!e || dist(u, d) < dist(u, e) + 1.5)) return isBody(d) ? feast(r, u, d, dt) : fight(r, u, d, dt);
  if (e) return fight(r, u, e, dt);
  if (alive(chef)) return fight(r, u, chef, dt);
  if (d) return isBody(d) ? feast(r, u, d, dt) : fight(r, u, d, dt);
}

function updateStaff(r: RaidState, u: RaidUnit, dt: number) {
  if (!alive(u) || r.t < u.busyUntil) return;
  const horde = r.units.filter((o) => fighter(o) && o.state !== 'queued' && o.y > -0.6);
  if (!r.aggro) return;
  // waiters stay in their own café; anyone who comes in gets swarmed (a taunting Champ first)
  const t = taunter(r, u) ?? nearest(
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
  const t = taunter(r, u) ?? nearest(u, horde);
  if (t) fight(r, u, t, dt);
}

/** A Champ inside, within taunting range: the staff can't help going for him. */
function taunter(r: RaidState, u: RaidUnit): RaidUnit | undefined {
  return nearest(
    u,
    r.units.filter((c) => c.ztype === 'champ' && fighter(c) && c.state !== 'queued' && indoors(r, c) && dist(c, u) <= TAUNT_RANGE),
  );
}

function updateDiner(r: RaidState, c: RaidUnit, dt: number) {
  if (!alive(c) || r.t < c.busyUntil) return;
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
  if (r.phase !== 'fight' || r.hold) return;
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
  // the health tombstone mends everyone while it glows (+100 over the 5 s); a Health Stone stacks on top
  const healRate = (r.buff?.kind === 'hp' && r.t < r.buff.until ? HP_BUFF / BUFF_SEC : 0) + (r.heal && r.t < r.heal.until ? HEADSTONE_HEAL / HEADSTONE_SEC : 0);
  if (healRate) for (const u of r.units) if (fighter(u) && u.state !== 'queued') u.hp = Math.min(u.maxHp, u.hp + healRate * dt);
  trickleDiners(r);
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
    cash: r.cashEaten,
    // +2 XP for every diner (or waiter) eaten, win or lose (original)
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
    // wrecked: boarded up, then new management (a bit tougher, a bit richer)
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
