/**
 * The rival joints down the road (the raid map), like the original's enemy cafés:
 * - they unlock one after another as you beat them, the later ones at higher levels;
 * - their level follows yours (doc 10 §2.7): diners, waiters, the Head Chef and the payout all come
 *   from the original's per-level curves, so an old joint stays worth raiding;
 * - a beaten joint CLOSES, and later reopens under new management, a couple of levels tougher;
 * - a rival you leave alone too long starts stealing your customers (and dents your rating);
 * - from level 5 a special boss café (a food truck from hell) turns up now and then.
 */
import { walkSpeed } from './data';
import type { GameState } from './state';

export type RivalId = 'chuck' | 'hank' | 'vera' | 'crunch' | 'snob' | 'sushi' | 'taco' | 'lab' | 'clown' | 'boss';

/** How a rival joint is furnished (catalog item ids and finish ids from the player's own shop). */
export interface RivalKit {
  stove: string;
  /** the station on the middle burner slot (grill, smoker, fryer…) */
  special: string;
  fridge: string;
  counter: string;
  divider: string;
  /** floor pieces for the corners */
  decor: string[];
  /** the hanging on the north-east wall */
  art: string;
}

export interface RivalDef {
  id: RivalId;
  name: string;
  /** names it reopens under, after you wreck it */
  reopenNames: string[];
  chef: string;
  /** the player level this joint opens at (also the lowest level it ever runs at) */
  level: number;
  /** once you outgrow it, its level sits this far from yours (early joints lag, late ones lead) */
  offset: number;
  room: { w: number; h: number };
  /** the café's look */
  wall: string;
  floor: string;
  table: string;
  chair: string;
  kit: RivalKit;
  /** the fewest tables it sets out (more if its level seats more diners) */
  tables: number;
  /** the chef's secret: taught by the first win (then 35%). Joints without one hand over a secret recipe you don't know */
  signature?: string;
  /** chance the Head Chef drops Brain Sauce */
  sauceChance: number;
  taunt: string;
  /** what the Head Chef says when you beat them */
  defeat: string;
  /** …and when they send your crew packing */
  victory: string;
}

const KIT_PLAIN: RivalKit = { stove: 'stove_plain', special: 'stove_plain', fridge: 'fridge_plain', counter: 'counter_steel', divider: 'divider_plain', decor: ['plant_potted'], art: 'clock' };

export const RIVALS: RivalDef[] = [
  {
    id: 'chuck',
    name: "Chuck Wagon's Chow Hall",
    reopenNames: ["Chuck's Grill & Chill", "Chuck's Last Stand", 'Chuck Wagon Reloaded'],
    chef: 'Chef Chuck',
    level: 2,
    offset: -4,
    room: { w: 9, h: 8 },
    wall: 'wood',
    floor: 'wood',
    table: 'table_wood',
    chair: 'chair_wood',
    kit: { ...KIT_PLAIN, divider: 'divider_wood', decor: ['plant_potted', 'hay_bale'], art: 'skull_longhorn' },
    tables: 4,
    signature: 'chili',
    sauceChance: 0.25,
    taunt: 'Git along, little zombie!',
    defeat: 'Dagnabbit, that was my good leg.',
    victory: 'Yee-haw! Back to the bone yard with ya!',
  },
  {
    id: 'hank',
    name: "Big Hank's Burger Barn",
    reopenNames: ["Hank's Burger Bunker", 'Big Hank Strikes Back', "Hank's Patty Palace"],
    chef: 'Big Hank',
    level: 4,
    offset: -3,
    room: { w: 9, h: 8 },
    wall: 'tile',
    floor: 'checker',
    table: 'table_diner',
    chair: 'chair_diner',
    kit: { ...KIT_PLAIN, stove: 'stove_steel', special: 'grill', decor: ['plant_potted', 'barrel_stack'], art: 'clock' },
    tables: 4,
    signature: 'smash',
    sauceChance: 0.3,
    taunt: 'You want fries with that beatdown?',
    defeat: "I'll be back… with fries.",
    victory: 'Order up: one zombie, flattened!',
  },
  {
    id: 'vera',
    name: "Vegan Vera's Salad Fortress",
    reopenNames: ["Vera's Kale Keep", 'Vegan Vera: The Sprouting', 'Fortress of Lettuce'],
    chef: 'Vegan Vera',
    level: 6,
    offset: -2,
    room: { w: 9, h: 8 },
    wall: 'plaster',
    floor: 'stone',
    table: 'table_barrel',
    chair: 'chair_barrel',
    kit: { ...KIT_PLAIN, decor: ['plant_tree', 'plant_potted'], art: 'clock' },
    tables: 6,
    signature: 'salad',
    sauceChance: 0.35,
    taunt: 'Brains are NOT plant-based!',
    defeat: 'This beatdown is NOT plant-based!',
    victory: 'Composted. Next!',
  },
  {
    id: 'crunch',
    name: "Colonel Crunch's Chicken Shack",
    reopenNames: ['Crunch Time Chicken', "The Colonel's Revenge", 'Cluck Shack II'],
    chef: 'Colonel Crunch',
    level: 8,
    offset: -2,
    room: { w: 9, h: 8 },
    wall: 'brick',
    floor: 'tile',
    table: 'table_plain_oxblood',
    chair: 'chair_plain_oxblood',
    kit: { ...KIT_PLAIN, stove: 'stove_steel', special: 'fryer', divider: 'divider_brick', decor: ['plant_potted', 'pumpkin_pile'], art: 'clock' },
    tables: 6,
    signature: 'chicken',
    sauceChance: 0.4,
    taunt: 'My secret recipe stays SECRET!',
    defeat: 'Eleven herbs and spices… and one black eye.',
    victory: 'Extra crispy, just like you!',
  },
  {
    id: 'snob',
    name: 'Le Snob Bistro',
    reopenNames: ['Le Snob Deux', 'Chez Snob', 'Le Snob: Nouvelle Cuisine'],
    chef: 'Chef Le Snob',
    level: 10,
    offset: -1,
    room: { w: 9, h: 8 },
    wall: 'stone',
    floor: 'checker',
    table: 'table_plain_charcoal',
    chair: 'chair_plain_charcoal',
    kit: { ...KIT_PLAIN, stove: 'stove_super', special: 'smoker', fridge: 'fridge_steel', counter: 'counter_bar', decor: ['plant_potted', 'plant_tree'], art: 'painting_zombie' },
    tables: 8,
    signature: 'foie',
    sauceChance: 0.5,
    taunt: 'Zut alors! No shirt, no shoes, no SERVICE!',
    defeat: "Ze health inspector will 'ear of zis!",
    victory: 'Non, non, NON. Get out of my bistro!',
  },
  // ----- past Le Snob, the road goes on -----
  {
    id: 'sushi',
    name: "Sensei Sashimi's Sushi Slab",
    reopenNames: ['Sushi Slab: Second Cut', 'Raw Deal Sushi', "Sensei's Revenge Roll"],
    chef: 'Sensei Sashimi',
    level: 13,
    offset: -1,
    room: { w: 9, h: 8 },
    wall: 'wood',
    floor: 'stone',
    table: 'table_plain_slate',
    chair: 'chair_plain_slate',
    kit: { stove: 'stove_steel', special: 'grill', fridge: 'fridge_steel', counter: 'counter_bar', divider: 'divider_wood', decor: ['aquarium', 'plant_tree'], art: 'menu_board' },
    tables: 7,
    sauceChance: 0.5,
    taunt: 'Fresh fish. Fresher fists!',
    defeat: 'I have been… filleted.',
    victory: 'Sliced, diced, and served raw!',
  },
  {
    id: 'taco',
    name: "Salsa Sal's Taco Truck Stop",
    reopenNames: ["Sal's Taco Truck Stop II", 'Taco Tuesday Forever', 'Salsa Sal Rides Again'],
    chef: 'Salsa Sal',
    level: 16,
    offset: 0,
    room: { w: 9, h: 8 },
    wall: 'brick',
    floor: 'tile',
    table: 'table_plain_cream',
    chair: 'chair_plain_cream',
    kit: { stove: 'stove_plain', special: 'grill', fridge: 'fridge_plain', counter: 'counter_plain', divider: 'divider_brick', decor: ['cactus', 'barrel_stack'], art: 'skull_longhorn' },
    tables: 7,
    sauceChance: 0.55,
    taunt: 'You want it spicy? You GOT it spicy!',
    defeat: 'Ay, my salsa! My beautiful salsa!',
    victory: 'Too hot for ya? Thought so!',
  },
  {
    id: 'lab',
    name: "Dr. Gristle's Lab-oratory Diner",
    reopenNames: ['Lab Diner: Experiment Two', "Dr. Gristle's Clone Kitchen", 'The Re-Animated Diner'],
    chef: 'Dr. Gristle',
    level: 20,
    offset: 0,
    room: { w: 9, h: 8 },
    wall: 'stone',
    floor: 'checker',
    table: 'table_plain_sage',
    chair: 'chair_plain_sage',
    kit: { stove: 'stove_super', special: 'smoker', fridge: 'fridge_steel', counter: 'counter_steel', divider: 'divider_plain', decor: ['cauldron', 'skeleton_statue'], art: 'poster_bmovie' },
    tables: 8,
    sauceChance: 0.6,
    taunt: 'Your brain will make a LOVELY specimen!',
    defeat: 'My experiment… has failed. Noted.',
    victory: 'Fascinating! Another specimen for the jar!',
  },
  {
    id: 'clown',
    name: 'Funhouse Pizza Pit',
    reopenNames: ['Funhouse Pizza Pit: Encore', 'Big Top Pizza', 'Last Laugh Pizza'],
    chef: 'Giggles the Pizza Clown',
    level: 25,
    offset: 1,
    room: { w: 9, h: 8 },
    wall: 'plaster',
    floor: 'checker',
    table: 'table_plain_white',
    chair: 'chair_plain_white',
    kit: { stove: 'stove_super', special: 'smoker', fridge: 'fridge_plain', counter: 'counter_plain', divider: 'divider_plain', decor: ['gnome_zombie', 'flamingo_zombie'], art: 'tv_wall' },
    tables: 8,
    sauceChance: 0.65,
    taunt: 'Honk honk! Time to slice you up!',
    defeat: 'Honk… honk… *squeak*.',
    victory: "The joke's on YOU! Honk honk!",
  },
  {
    id: 'boss',
    name: "Chef Inferno's Food Truck",
    reopenNames: [],
    chef: 'Chef Inferno',
    level: 5,
    offset: 0,
    room: { w: 9, h: 8 },
    wall: 'brick',
    floor: 'tile',
    table: 'table_coffin',
    chair: 'chair_bone',
    kit: { stove: 'stove_super', special: 'smoker', fridge: 'fridge_steel', counter: 'counter_steel', divider: 'divider_brick', decor: ['plant_potted', 'coffin_upright'], art: 'clock' },
    tables: 4,
    sauceChance: 1,
    taunt: 'Welcome to HELL’S kitchen, meat.',
    defeat: 'Hot take: I lost.',
    victory: 'Well done. Extra well done!',
  },
];
export const RIVAL_BY_ID: Record<string, RivalDef> = Object.fromEntries(RIVALS.map((r) => [r.id, r]));
/** The road of regular joints, in unlock order (the boss café is separate). */
export const ROAD = RIVALS.filter((r) => r.id !== 'boss');

export const MAP_LEVEL = 2;
/** A wrecked joint stays boarded up this long, then reopens under new management. */
export const RIVAL_CLOSED_SEC = 4 * 3600;
/** Original: a wrecked joint reopens after 4 h, then 8, 12 and 18 h for later managements. */
export function rivalClosedSec(gen: number): number {
  return [4, 8, 12, 18][Math.min(3, Math.max(0, gen))] * 3600;
}
/** Skip the wait: reopen a boarded-up joint right now for this much Brain Sauce. */
export const REOPEN_SAUCE = 2;
/** Leave an open rival alone this long and it starts poaching your customers. */
export const NEGLECT_SEC = 8 * 3600;
/** Original ENEMY_RATING_MODIFIER: an unattended rival costs you 0.1 of popularity (half a star). */
export const ENEMY_RATING_MODIFIER = 0.1;
/**
 * Each new management is 15% tougher (and richer) than the original owners, up to five reopenings
 * (x1.75). Uncapped, a few reopenings closed the road for good.
 */
export const GEN_STEP = 0.15;
export const GEN_CAP = 5;
export const genMult = (gen: number) => 1 + GEN_STEP * Math.min(Math.max(0, gen), GEN_CAP);
/** The original's per-level arrays run to level 83. */
export const RIVAL_LEVEL_CAP = 83;
/** The boss café: from level 5 it parks nearby for 3 hours out of every 10. */
export const BOSS_LEVEL = 5;
const BOSS_PERIOD = 10 * 3600;
const BOSS_OPEN = 3 * 3600;

// ---------- the original's per-level curves (doc 10 §2.7) ----------

/** One row of the original's rival tables, on its own scales (str/spd 1–10, chef HP ~80–770). */
export interface RivalCurve {
  customers: number;
  servers: number;
  serverStr: number;
  serverSpd: number;
  chefHp: number;
  chefStr: number;
  chefSpd: number;
  cash: number;
  xp: number;
}

// levels 1–30, column by column
const C_CUSTOMERS = [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7];
const C_SERVERS = [1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 7, 7, 7, 7, 7];
const C_SERVER_STR = [1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 7, 7, 7, 7, 7];
const C_SERVER_SPD = [3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8];
const C_CHEF_HP = [80, 100, 130, 160, 190, 210, 250, 270, 300, 330, 360, 390, 410, 440, 470, 500, 520, 540, 560, 580, 600, 630, 660, 690, 720, 750, 750, 750, 750, 750];
const C_CHEF_STR = [1, 2, 2, 3, 4, 3, 4, 5, 3, 3, 3, 5, 6, 6, 7, 8, 9, 5, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8];
const C_CHEF_SPD = [3, 3, 4, 4, 4, 5, 5, 5, 7, 8, 9, 5, 5, 6, 1, 1, 1, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8];
// past 30 the arrays plateau; these are the sampled rows (level, customers, servers, chef HP)
const LATE: [number, number, number, number][] = [
  [30, 7, 7, 750],
  [35, 8, 8, 755],
  [40, 8, 8, 755],
  [50, 9, 9, 755],
  [60, 9, 9, 760],
  [70, 9, 9, 760],
  [83, 9, 9, 770],
];

/** The original's rival stats at a level (1–83). */
export function rivalCurve(level: number): RivalCurve {
  const L = Math.max(1, Math.min(RIVAL_LEVEL_CAP, Math.round(level)));
  const base = { cash: 10 * L, xp: 2 * L };
  if (L <= 30) {
    const i = L - 1;
    return { ...base, customers: C_CUSTOMERS[i], servers: C_SERVERS[i], serverStr: C_SERVER_STR[i], serverSpd: C_SERVER_SPD[i], chefHp: C_CHEF_HP[i], chefStr: C_CHEF_STR[i], chefSpd: C_CHEF_SPD[i] };
  }
  // the plateau: step customers/servers at the sampled rows, interpolate the chef's HP
  let k = 0;
  while (k < LATE.length - 2 && L >= LATE[k + 1][0]) k++;
  const [l0, c0, s0, h0] = LATE[k];
  const [l1, , , h1] = LATE[k + 1];
  const q = Math.min(1, (L - l0) / (l1 - l0));
  return { ...base, customers: L >= l1 ? LATE[k + 1][1] : c0, servers: L >= l1 ? LATE[k + 1][2] : s0, serverStr: 7, serverSpd: 8, chefHp: Math.round(h0 + (h1 - h0) * q), chefStr: 8, chefSpd: 8 };
}

/** Rival stats in our own units: HP and damage on the zombies' energy scale, speeds in tiles/s, payouts in our economy. */
export interface RivalStats {
  level: number;
  /** diners seated when you arrive */
  diners: number;
  /** cash per diner (and twice that for a knocked-out waiter) */
  dinerCash: number;
  staff: { count: number; hp: number; dmg: number; speed: number };
  chef: { hp: number; dmg: number; speed: number };
  reward: { cash: number; xp: number };
  tables: number;
}

/** Our scale: waiters 55 HP at strength 1 (~the original's weak staff), +20 HP per point. */
export const staffHp = (str: number) => 35 + 20 * str;
export const staffDmg = (str: number) => 3 + 1.6 * str; // the same scale as a zombie of that Power
/** Chef HP: the original's column ×2.6 (our zombies hit harder per swing than its did). */
export const CHEF_HP_SCALE = 2.6;
export const chefDmg = (str: number, level: number) => (3 + 1.6 * str) * 1.4 + 0.3 * level;
/** Win payout per rival level: the original's 10 cash / 2 XP per level, scaled to our economy. */
export const CASH_PER_LEVEL = 125;
export const XP_PER_LEVEL = 30;
/** Boss café: its minions and chef get ×(1 + 0.1 per level past 5) (original BOSS_MULTIPLIER). */
export function bossMultiplier(level: number): number {
  return 1 + 0.1 * Math.max(0, level - BOSS_LEVEL);
}

export function rivalUnlocked(s: GameState, id: RivalId): boolean {
  if (id === 'boss') return s.level >= BOSS_LEVEL;
  const i = ROAD.findIndex((r) => r.id === id);
  return i === 0 || (s.rivals[ROAD[i - 1].id]?.wins ?? 0) > 0;
}

/** Is the boss café parked on the map right now? */
export function bossHere(s: GameState): boolean {
  if (s.level < BOSS_LEVEL) return false;
  return s.now % BOSS_PERIOD < BOSS_OPEN && (s.rivals.boss?.nextAt ?? 0) <= s.now;
}

/** How tough this rival's current management is (0 = the original owners). */
export function rivalGen(s: GameState, id: RivalId): number {
  return s.rivals[id]?.gen ?? 0;
}

/** A rival's level: its road level until you outgrow it, then your level plus its offset. */
export function rivalLevel(s: GameState, id: RivalId): number {
  const def = RIVAL_BY_ID[id];
  return Math.min(RIVAL_LEVEL_CAP, Math.max(def.level, s.level + def.offset));
}

/** Everything a raid needs to know about a rival at a level (and management), in our units. */
export function rivalStats(id: RivalId, level: number, gen = 0): RivalStats {
  const def = RIVAL_BY_ID[id];
  const c = rivalCurve(level);
  const boss = id === 'boss';
  const g = genMult(gen);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  // the boss café: four monster minions, ×BOSS_MULTIPLIER on the 1–10 strength scale (so they top out at 10)
  const sStr = boss ? Math.min(10, Math.round(c.serverStr * bossMultiplier(level))) : c.serverStr;
  return {
    level,
    diners: c.customers,
    dinerCash: Math.round(15 + 2.5 * level),
    staff: {
      count: boss ? 4 : c.servers,
      hp: Math.round(staffHp(sStr) * g),
      dmg: r1(staffDmg(sStr) * g),
      speed: Math.round(walkSpeed(c.serverSpd) * 0.85 * 100) / 100,
    },
    chef: {
      hp: Math.round(c.chefHp * CHEF_HP_SCALE * (boss ? 1.4 : 1) * g),
      dmg: r1(chefDmg(c.chefStr, level) * (boss ? 1.15 : 1) * g),
      speed: Math.round(walkSpeed(c.chefSpd) * 0.75 * 100) / 100,
    },
    reward: { cash: Math.round(c.cash * (CASH_PER_LEVEL / 10) * (boss ? 1.5 : 1) * g), xp: Math.round(c.xp * (XP_PER_LEVEL / 2) * (boss ? 1.5 : 1) * g) },
    tables: Math.min(9, Math.max(def.tables, c.customers + 1)),
  };
}

export function rivalName(s: GameState, id: RivalId): string {
  const def = RIVAL_BY_ID[id];
  const g = rivalGen(s, id);
  return g === 0 || !def.reopenNames.length ? def.name : def.reopenNames[(g - 1) % def.reopenNames.length];
}

export function rivalClosed(s: GameState, id: RivalId): boolean {
  const p = s.rivals[id];
  return !!p && s.now < p.nextAt;
}

export function rivalReady(s: GameState, id: RivalId): string | null {
  if (s.level < MAP_LEVEL) return `The raid map opens at level ${MAP_LEVEL}.`;
  const def = RIVAL_BY_ID[id];
  if (!def) return 'Unknown joint.';
  if (id === 'boss') {
    if (s.level < BOSS_LEVEL) return `The boss café shows up from level ${BOSS_LEVEL}.`;
    if (!bossHere(s)) return 'The food truck has driven off. It comes back every few hours.';
    return null;
  }
  if (!rivalUnlocked(s, id)) return 'Beat the previous joint on the road first.';
  if (s.level < def.level) return `${def.name} is a level ${def.level} joint. Level up first!`;
  const p = s.rivals[id];
  if (p && s.now < p.nextAt) return `Boarded up. New management opens in ${Math.ceil((p.nextAt - s.now) / 60)} min.`;
  return null;
}

/** "Reopen now · 2 sauce": pay the new management to open a boarded-up joint straight away. */
export function reopenRival(s: GameState, id: RivalId): string | null {
  const p = s.rivals[id];
  if (id === 'boss') return 'The food truck keeps its own hours.';
  if (!p || s.now >= p.nextAt) return 'It’s already open.';
  if (s.sauce < REOPEN_SAUCE) return 'Not enough Brain Sauce!';
  s.sauce -= REOPEN_SAUCE;
  p.nextAt = s.now;
  return null;
}

/** Rivals poaching your customers: open, raided before, and left alone for too long. */
export function stealingRivals(s: GameState): RivalId[] {
  return ROAD.filter((r) => {
    const p = s.rivals[r.id];
    return !!p && p.lastRaid !== undefined && s.now >= p.nextAt && s.now - p.lastRaid > NEGLECT_SEC;
  }).map((r) => r.id);
}

/**
 * Popularity lost while rivals poach your customers. The original's ENEMY_RATING_MODIFIER (0.1, half a
 * star), applied once however many are at it, and on top of the stored rating rather than eating into
 * it, so it lifts the moment you raid them.
 */
export function rivalRatingPenalty(s: GameState): number {
  return stealingRivals(s).length ? ENEMY_RATING_MODIFIER : 0;
}

/** Thieves you haven't been warned about yet (for the one-time "stealing your customers" alert). */
export function unwarnedThieves(s: GameState): RivalId[] {
  return stealingRivals(s).filter((id) => !s.rivals[id]?.warned);
}

/** Mark a thief as announced; the warning comes back only after you raid it and neglect it again. */
export function markWarned(s: GameState, id: RivalId) {
  const p = s.rivals[id];
  if (p) p.warned = true;
}
