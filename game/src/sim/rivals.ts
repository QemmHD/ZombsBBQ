/**
 * The rival joints down the road (the raid map), like the original's enemy cafés:
 * - they unlock one after another as you beat them;
 * - a beaten joint CLOSES, and later reopens under new management, a little tougher and richer;
 * - a rival you leave alone too long starts stealing your customers;
 * - from level 5 a special boss café (a food truck from hell) turns up now and then.
 */
import type { GameState } from './state';

export type RivalId = 'chuck' | 'hank' | 'vera' | 'crunch' | 'snob' | 'boss';

export interface RivalDef {
  id: RivalId;
  name: string;
  /** names it reopens under, after you wreck it */
  reopenNames: string[];
  chef: string;
  level: number;
  room: { w: number; h: number };
  /** the café's look */
  wall: string;
  floor: string;
  table: string;
  chair: string;
  staff: { count: number; hp: number; dmg: number };
  boss: { hp: number; dmg: number };
  tables: number;
  cashPerCustomer: number;
  dishes: string[];
  signature: string;
  reward: { cash: number; xp: number; sauceChance: number };
  taunt: string;
}

export const RIVALS: RivalDef[] = [
  {
    id: 'chuck',
    name: "Chuck Wagon's Chow Hall",
    reopenNames: ["Chuck's Grill & Chill", "Chuck's Last Stand", 'Chuck Wagon Reloaded'],
    chef: 'Chef Chuck',
    level: 2,
    room: { w: 7, h: 6 },
    wall: 'wood',
    floor: 'wood',
    table: 'table_wood',
    chair: 'chair_wood',
    staff: { count: 2, hp: 55, dmg: 3 },
    boss: { hp: 240, dmg: 8 },
    tables: 4,
    cashPerCustomer: 20,
    dishes: ['sliders', 'chili'],
    signature: 'chili',
    reward: { cash: 250, xp: 60, sauceChance: 0.25 },
    taunt: 'Git along, little zombie!',
  },
  {
    id: 'hank',
    name: "Big Hank's Burger Barn",
    reopenNames: ["Hank's Burger Bunker", 'Big Hank Strikes Back', "Hank's Patty Palace"],
    chef: 'Big Hank',
    level: 4,
    room: { w: 7, h: 6 },
    wall: 'tile',
    floor: 'checker',
    table: 'table_diner',
    chair: 'chair_diner',
    staff: { count: 3, hp: 80, dmg: 4 },
    boss: { hp: 420, dmg: 12 },
    tables: 4,
    cashPerCustomer: 25,
    dishes: ['burger', 'smash'],
    signature: 'smash',
    reward: { cash: 600, xp: 120, sauceChance: 0.3 },
    taunt: 'You want fries with that beatdown?',
  },
  {
    id: 'vera',
    name: "Vegan Vera's Salad Fortress",
    reopenNames: ["Vera's Kale Keep", 'Vegan Vera: The Sprouting', 'Fortress of Lettuce'],
    chef: 'Vegan Vera',
    level: 6,
    room: { w: 9, h: 8 },
    wall: 'plaster',
    floor: 'stone',
    table: 'table_barrel',
    chair: 'chair_barrel',
    staff: { count: 4, hp: 100, dmg: 5 },
    boss: { hp: 640, dmg: 15 },
    tables: 6,
    cashPerCustomer: 35,
    dishes: ['wings', 'salad'],
    signature: 'salad',
    reward: { cash: 1200, xp: 220, sauceChance: 0.35 },
    taunt: 'Brains are NOT plant-based!',
  },
  {
    id: 'crunch',
    name: "Colonel Crunch's Chicken Shack",
    reopenNames: ['Crunch Time Chicken', "The Colonel's Revenge", 'Cluck Shack II'],
    chef: 'Colonel Crunch',
    level: 8,
    room: { w: 9, h: 8 },
    wall: 'brick',
    floor: 'tile',
    table: 'table_plain_oxblood',
    chair: 'chair_plain_oxblood',
    staff: { count: 5, hp: 115, dmg: 5 },
    boss: { hp: 820, dmg: 16 },
    tables: 6,
    cashPerCustomer: 50,
    dishes: ['rings', 'chicken'],
    signature: 'chicken',
    reward: { cash: 2400, xp: 380, sauceChance: 0.4 },
    taunt: 'My secret recipe stays SECRET!',
  },
  {
    id: 'snob',
    name: 'Le Snob Bistro',
    reopenNames: ['Le Snob Deux', 'Chez Snob', 'Le Snob: Nouvelle Cuisine'],
    chef: 'Chef Le Snob',
    level: 10,
    room: { w: 10, h: 9 },
    wall: 'stone',
    floor: 'checker',
    table: 'table_plain_charcoal',
    chair: 'chair_plain_charcoal',
    staff: { count: 6, hp: 140, dmg: 6 },
    boss: { hp: 1150, dmg: 20 },
    tables: 8,
    cashPerCustomer: 80,
    dishes: ['ribs', 'foie'],
    signature: 'foie',
    reward: { cash: 5000, xp: 650, sauceChance: 0.5 },
    taunt: 'Zut alors! No shirt, no shoes, no SERVICE!',
  },
  {
    id: 'boss',
    name: "Chef Inferno's Food Truck",
    reopenNames: [],
    chef: 'Chef Inferno',
    level: 5,
    room: { w: 7, h: 6 },
    wall: 'brick',
    floor: 'tile',
    table: 'table_coffin',
    chair: 'chair_bone',
    staff: { count: 4, hp: 125, dmg: 6 },
    boss: { hp: 1300, dmg: 22 },
    tables: 4,
    cashPerCustomer: 40,
    dishes: ['kebab', 'brisket'],
    signature: 'foie',
    reward: { cash: 3000, xp: 500, sauceChance: 1 },
    taunt: 'Welcome to HELL’S kitchen, meat.',
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
/** Leave an open rival alone this long and it starts poaching your customers. */
export const NEGLECT_SEC = 8 * 3600;
/** Each new management is this much tougher (and richer). */
export const GEN_STEP = 0.2;
/** The boss café: from level 5 it parks nearby for 3 hours out of every 10. */
export const BOSS_LEVEL = 5;
const BOSS_PERIOD = 10 * 3600;
const BOSS_OPEN = 3 * 3600;

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

/** Rivals poaching your customers: open, raided before, and left alone for too long. */
export function stealingRivals(s: GameState): RivalId[] {
  return ROAD.filter((r) => {
    const p = s.rivals[r.id];
    return !!p && p.lastRaid !== undefined && s.now >= p.nextAt && s.now - p.lastRaid > NEGLECT_SEC;
  }).map((r) => r.id);
}
