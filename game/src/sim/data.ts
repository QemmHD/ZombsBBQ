/**
 * Game content tables. Numbers are prototype tuning (short timers so playtests move fast);
 * the long real-time values from docs/02-game-design.md come back once the loop is proven.
 */

export type StationKind = 'grill' | 'smoker';

export interface DishDef {
  id: string;
  name: string;
  station: StationKind;
  level: number;
  cost: number;
  cookSec: number;
  servings: number;
  price: number; // per serving
  xp: number; // awarded when the dish finishes cooking
  icon: string; // art key
}

export const DISHES: DishDef[] = [
  { id: 'hotdog', name: 'Charred Hot Dog', station: 'grill', level: 1, cost: 10, cookSec: 20, servings: 6, price: 4, xp: 3, icon: 'dish_hotdog' },
  { id: 'burger', name: 'Brain Burger', station: 'grill', level: 2, cost: 40, cookSec: 60, servings: 12, price: 6, xp: 8, icon: 'dish_burger' },
  { id: 'wings', name: "Finger-Lickin' Wings", station: 'grill', level: 3, cost: 90, cookSec: 180, servings: 18, price: 8, xp: 16, icon: 'dish_wings' },
  { id: 'pork', name: 'Pulled Pork(ish)', station: 'smoker', level: 4, cost: 200, cookSec: 600, servings: 30, price: 11, xp: 35, icon: 'dish_pork' },
  { id: 'ribs', name: 'Rib Rack of Doom', station: 'smoker', level: 6, cost: 650, cookSec: 1800, servings: 50, price: 20, xp: 90, icon: 'dish_ribs' },
  { id: 'brisket', name: '24-Hour Brisket', station: 'smoker', level: 9, cost: 2400, cookSec: 7200, servings: 110, price: 36, xp: 320, icon: 'dish_brisket' },
];

export const DISH_BY_ID: Record<string, DishDef> = Object.fromEntries(DISHES.map((d) => [d.id, d]));

/** Zombie stats use the original game's six stats (1..10 scale except energy). */
export interface ZombieStats {
  energy: number; // max energy
  speed: number;
  power: number;
  tips: number;
  focus: number;
  patience: number;
}

export interface CustomerDef {
  id: string;
  name: string;
  zombieName: string;
  minLevel: number;
  minStars: number;
  weight: number;
  spend: number; // price multiplier
  infect: { cash?: number; sauce?: number };
  stats: ZombieStats;
}

export const CUSTOMERS: CustomerDef[] = [
  { id: 'accountant', name: 'Accountant', zombieName: 'Zombie Accountant', minLevel: 1, minStars: 0, weight: 10, spend: 1.0, infect: { cash: 0 }, stats: { energy: 100, speed: 4, power: 3, tips: 4, focus: 6, patience: 5 } },
  { id: 'yoga', name: 'Yoga Instructor', zombieName: 'Zombie Yogi', minLevel: 1, minStars: 0, weight: 10, spend: 1.0, infect: { cash: 0 }, stats: { energy: 100, speed: 5, power: 2, tips: 3, focus: 9, patience: 7 } },
  { id: 'teen', name: 'Teenager', zombieName: 'Zombie Teen', minLevel: 1, minStars: 0, weight: 9, spend: 0.9, infect: { cash: 50 }, stats: { energy: 100, speed: 7, power: 3, tips: 2, focus: 3, patience: 2 } },
  { id: 'politician', name: 'Politician', zombieName: 'Zombie Politician', minLevel: 2, minStars: 1, weight: 6, spend: 1.2, infect: { cash: 100 }, stats: { energy: 100, speed: 4, power: 3, tips: 8, focus: 5, patience: 4 } },
  { id: 'construction', name: 'Construction Worker', zombieName: 'Hardhat Zombie', minLevel: 2, minStars: 1, weight: 7, spend: 1.0, infect: { cash: 250 }, stats: { energy: 120, speed: 5, power: 7, tips: 3, focus: 5, patience: 5 } },
  { id: 'nurse', name: 'Nurse', zombieName: 'Nurse Zombie', minLevel: 3, minStars: 1.5, weight: 5, spend: 1.1, infect: { cash: 600 }, stats: { energy: 110, speed: 6, power: 3, tips: 5, focus: 6, patience: 9 } },
  { id: 'cop', name: 'Cop', zombieName: 'Officer Rot', minLevel: 4, minStars: 2, weight: 4, spend: 1.2, infect: { sauce: 1 }, stats: { energy: 100, speed: 5, power: 4, tips: 3, focus: 6, patience: 6 } },
  { id: 'ceo', name: 'CEO', zombieName: 'Zombie CEO', minLevel: 5, minStars: 2, weight: 3, spend: 1.6, infect: { cash: 2500 }, stats: { energy: 100, speed: 3, power: 3, tips: 10, focus: 7, patience: 4 } },
];

export const CUSTOMER_BY_ID: Record<string, CustomerDef> = Object.fromEntries(CUSTOMERS.map((c) => [c.id, c]));

export const YOU_STATS: ZombieStats = { energy: 100, speed: 6, power: 2, tips: 4, focus: 10, patience: 10 };

/** Tuning knobs, gathered in one place for balancing. */
export const TUNING = {
  startCash: 150,
  startSauce: 5, // the original also started you with 5 Toxin vials
  startCrewCap: 4,
  customerWaitSec: 50,
  eatSec: 7,
  fleeSpeed: 3.2,
  baseWalkSpeed: 1.3, // tiles/sec at speed 0
  walkSpeedPerStat: 0.13,
  energyPerServe: 3,
  energyCookPerSec: 1 / 20, // original: cooks burn 1 energy / 20 s
  restRegenPerSec: 1 / 5,
  kegMultiplier: 2, // original Toxin Barrel doubled recharge
  biteEnergyGain: 35,
  daydreamBaseSec: 100, // original: focus 1 ~ every 100 s
  daydreamMaxSec: 25,
  offlineCapSec: 8 * 3600,
  burnFactor: 1, // dish burns after waiting cookSec * burnFactor once done (original: 2x total)
  ratingStart: 34,
  ratingHappy: 3,
  ratingAngry: -6,
  ratingAttack: -9,
};

/** Patience 1 attacks at ~20% energy, patience 10 holds out until ~2% (original game). */
export function attackThreshold(patience: number): number {
  return Math.max(0.02, 0.2 - (patience - 1) * 0.02);
}

export function walkSpeed(speedStat: number): number {
  return TUNING.baseWalkSpeed + speedStat * TUNING.walkSpeedPerStat;
}

export function xpToNext(level: number): number {
  return Math.round(40 * Math.pow(level, 1.5));
}

export function crewCapForLevel(level: number): number {
  return Math.min(13, TUNING.startCrewCap + Math.floor((level - 1) / 3));
}
