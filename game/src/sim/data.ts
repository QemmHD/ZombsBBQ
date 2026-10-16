/**
 * Game content tables. Timers are tuned for phone play sessions (seconds → hours as you level);
 * every number here is meant to be balanced via tests/economy.test.ts, not by guesswork.
 */

export type StationKind = 'grill' | 'smoker' | 'fryer';

export interface DishDef {
  id: string;
  name: string;
  station: StationKind;
  /** level unlock, or 'raid' for recipes you can only get by stealing and studying them */
  source: 'level' | 'raid';
  level: number;
  cost: number;
  cookSec: number;
  servings: number;
  price: number; // per serving
  xp: number; // awarded when the dish finishes cooking
  icon: string; // art key
  blurb: string;
}

export const DISHES: DishDef[] = [
  { id: 'hotdog', name: 'Charred Hot Dog', station: 'grill', source: 'level', level: 1, cost: 10, cookSec: 20, servings: 6, price: 4, xp: 3, icon: 'dish_hotdog', blurb: 'Mostly hot. Mostly dog.' },
  { id: 'burger', name: 'Brain Burger', station: 'grill', source: 'level', level: 2, cost: 40, cookSec: 60, servings: 12, price: 6, xp: 8, icon: 'dish_burger', blurb: 'Medium-rare. Medium-brain.' },
  { id: 'wings', name: "Finger-Lickin' Wings", station: 'grill', source: 'level', level: 3, cost: 90, cookSec: 180, servings: 18, price: 8, xp: 16, icon: 'dish_wings', blurb: 'Count your fingers after.' },
  { id: 'pork', name: 'Pulled Pork(ish)', station: 'smoker', source: 'level', level: 4, cost: 200, cookSec: 600, servings: 30, price: 11, xp: 35, icon: 'dish_pork', blurb: "Don't ask what the 'ish' is." },
  { id: 'rings', name: 'Onion Rings of Fire', station: 'fryer', source: 'level', level: 6, cost: 260, cookSec: 420, servings: 32, price: 12, xp: 40, icon: 'dish_rings', blurb: 'Hurts going in. Hurts going out.' },
  { id: 'ribs', name: 'Rib Rack of Doom', station: 'smoker', source: 'level', level: 6, cost: 650, cookSec: 1800, servings: 50, price: 20, xp: 90, icon: 'dish_ribs', blurb: 'Fall-off-the-bone. Bone not included.' },
  { id: 'nuggets', name: 'Deep-Fried Brain Nuggets', station: 'fryer', source: 'level', level: 8, cost: 900, cookSec: 2400, servings: 60, price: 22, xp: 120, icon: 'dish_nuggets', blurb: 'Smart food.' },
  { id: 'brisket', name: '24-Hour Brisket', station: 'smoker', source: 'level', level: 9, cost: 2400, cookSec: 7200, servings: 110, price: 36, xp: 320, icon: 'dish_brisket', blurb: 'Takes 2 hours. The name is aspirational.' },
  // stolen in raids, then studied from the Fridge
  { id: 'chili', name: 'Chili Con Carnage', station: 'grill', source: 'raid', level: 1, cost: 120, cookSec: 240, servings: 24, price: 10, xp: 30, icon: 'dish_chili', blurb: "Chuck Wagon's secret. Now yours." },
  { id: 'smash', name: 'Smash Burger', station: 'grill', source: 'raid', level: 1, cost: 300, cookSec: 600, servings: 36, price: 15, xp: 60, icon: 'dish_smash', blurb: 'Big Hank smashed. You stole.' },
  { id: 'salad', name: "Kale-ing Spree Salad", station: 'grill', source: 'raid', level: 1, cost: 500, cookSec: 900, servings: 44, price: 19, xp: 85, icon: 'dish_salad', blurb: 'Vegan Vera wept.' },
  { id: 'chicken', name: 'Crunchy Coop Bucket', station: 'fryer', source: 'raid', level: 1, cost: 1100, cookSec: 2400, servings: 70, price: 27, xp: 170, icon: 'dish_chicken', blurb: "The Colonel's 11 secret spleens." },
  { id: 'foie', name: 'Foie Gross', station: 'smoker', source: 'raid', level: 1, cost: 3000, cookSec: 5400, servings: 120, price: 45, xp: 420, icon: 'dish_foie', blurb: 'Très gross. Très délicieux.' },
];

export const DISH_BY_ID: Record<string, DishDef> = Object.fromEntries(DISHES.map((d) => [d.id, d]));

/** Zombie stats use the original game's six stats (1..10 scale except energy). */
export interface ZombieStats {
  energy: number; // max energy (= health in raids)
  speed: number;
  power: number;
  tips: number;
  focus: number;
  patience: number;
}

export type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface CustomerDef {
  id: string;
  name: string;
  zombieName: string;
  tier: Tier;
  minLevel: number;
  minStars: number;
  weight: number;
  spend: number; // price multiplier
  infect: { cash?: number; sauce?: number };
  stats: ZombieStats;
  gag: string;
}

const C = (
  id: string,
  name: string,
  zombieName: string,
  tier: Tier,
  minLevel: number,
  minStars: number,
  weight: number,
  spend: number,
  infect: { cash?: number; sauce?: number },
  s: [number, number, number, number, number, number],
  gag: string,
): CustomerDef => ({
  id,
  name,
  zombieName,
  tier,
  minLevel,
  minStars,
  weight,
  spend,
  infect,
  stats: { energy: s[0], speed: s[1], power: s[2], tips: s[3], focus: s[4], patience: s[5] },
  gag,
});

// stats: [energy, speed, power, tips, focus, patience]
export const CUSTOMERS: CustomerDef[] = [
  C('accountant', 'Accountant', 'Zombie Accountant', 'common', 1, 0, 10, 1.0, { cash: 0 }, [100, 4, 3, 4, 6, 5], 'Still itemizes the brains.'),
  C('yoga', 'Yoga Instructor', 'Zombie Yogi', 'common', 1, 0, 10, 1.0, { cash: 0 }, [100, 5, 2, 3, 9, 7], 'Namaste... hungry.'),
  C('teen', 'Teenager', 'Zombie Teen', 'common', 1, 0, 9, 0.9, { cash: 50 }, [100, 7, 3, 2, 3, 2], 'Was a zombie before it was cool.'),
  C('politician', 'Politician', 'Zombie Politician', 'common', 2, 1, 6, 1.2, { cash: 100 }, [100, 4, 3, 8, 5, 4], 'Promises brains for every voter.'),
  C('construction', 'Construction Worker', 'Hardhat Zombie', 'common', 2, 1, 7, 1.0, { cash: 250 }, [120, 5, 7, 3, 5, 5], 'Naps face-down on tables.'),
  C('nurse', 'Nurse', 'Nurse Zombie', 'common', 3, 1.5, 5, 1.1, { cash: 600 }, [110, 6, 3, 5, 6, 9], 'Takes your pulse, then your lunch.'),
  C('cop', 'Cop', 'Officer Rot', 'uncommon', 4, 2, 4, 1.2, { sauce: 1 }, [100, 5, 4, 3, 6, 6], 'Arrests customers who don’t tip.'),
  C('ceo', 'CEO', 'Zombie CEO', 'uncommon', 5, 2, 3, 1.6, { cash: 2500 }, [100, 3, 3, 10, 7, 4], 'Outsourced his own brain.'),
  C('trafficcop', 'Traffic Cop', 'Zombie Traffic Cop', 'uncommon', 6, 2.5, 3, 1.2, { sauce: 2 }, [100, 8, 4, 4, 5, 5], 'Whistles at slow eaters.'),
  C('benchwarmer', 'Benchwarmer', 'Zombie Benchwarmer', 'rare', 7, 3, 2, 1.1, { cash: 5000 }, [160, 3, 6, 4, 4, 8], 'Finally got off the bench. Shambling.'),
  C('lumberjack', 'Lumberjack', 'Lumberjacked', 'rare', 7, 3, 2, 1.3, { cash: 5000 }, [130, 5, 8, 4, 5, 6], 'Axe stuck in his own hat.'),
  C('cheerleader', 'Cheerleader', 'Fear-leader', 'rare', 7, 3, 2, 1.3, { cash: 6000 }, [100, 8, 4, 7, 4, 4], 'Gimme a B! Gimme an R-A-I-N-S!'),
  C('critic', 'Food Critic', 'Food Crypt-ic', 'rare', 8, 3.5, 2, 2.0, { sauce: 5 }, [100, 5, 3, 9, 8, 5], 'Notepad reads: BRAINS 5/5.'),
  C('boxer', 'Boxer', 'Zombie Boxer', 'rare', 8, 3, 2, 1.2, { sauce: 15 }, [150, 6, 10, 3, 6, 4], 'Floats like a butterfly. Rots like a bee.'),
  C('grandma', 'Grandma', 'Grave Granny', 'rare', 9, 3.5, 2, 1.5, { cash: 15000 }, [110, 2, 5, 10, 9, 10], 'Knits scarves of goo.'),
  C('moviestar', 'Movie Star', 'Zombie Movie Star', 'rare', 10, 4, 1.5, 1.6, { sauce: 10 }, [110, 9, 3, 8, 6, 6], 'Signs autographs in slime.'),
  C('sumo', 'Sumo Wrestler', 'Zombie Sumo', 'epic', 11, 4, 1.2, 1.4, { sauce: 30 }, [220, 3, 10, 4, 7, 7], 'One belly-bump, three waiters down.'),
  C('influencer', 'Influencer', 'Zombie Influencer', 'epic', 12, 4, 1.2, 1.5, { sauce: 20 }, [100, 7, 3, 9, 3, 3], '#BrainFood. 0 followers alive.'),
  C('celebrity', 'Celebrity', 'Zombie Celebrity', 'epic', 13, 4.5, 1, 2.2, { sauce: 40 }, [120, 7, 4, 10, 5, 5], 'Velvet rope included.'),
  C('champ', 'The Champ', 'Zombie Champ', 'legendary', 15, 4.5, 0.6, 1.8, { sauce: 80 }, [250, 8, 10, 6, 8, 8], 'Undefeated. Also undead.'),
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
  burnGraceSec: 15,
  keepWarmFactor: 1.5,
  ratingStart: 34,
  /** service rating is a rolling average of recent customers' moods (100 = all happy) */
  ratingRate: 0.025,
  /** a bite counts as this many angry customers */
  ratingAttackWeight: 3,
  reanimateSec: 15 * 60, // raid KO: original went from 8 h to 1 h; shorter for phone sessions
  sellBack: 0.5,
};

/** Patience 1 attacks at ~20% energy, patience 10 holds out until ~2% (original game). */
export function attackThreshold(patience: number): number {
  return Math.max(0.02, 0.2 - (patience - 1) * 0.02);
}

export function walkSpeed(speedStat: number): number {
  return TUNING.baseWalkSpeed + speedStat * TUNING.walkSpeedPerStat;
}

export const LEVEL_CAP = 30;

export function xpToNext(level: number): number {
  return Math.round(40 * Math.pow(level, 1.5));
}

export function crewCapForLevel(level: number): number {
  return Math.min(13, TUNING.startCrewCap + Math.floor((level - 1) / 3));
}

/** Rare customers get more common the further your stars exceed their requirement (original behavior). */
/** Decor points needed for each half-star step from 1★ to 5★ (wall hangings and themes count too). */
export const DECOR_STARS = [0, 30, 60, 100, 150, 210, 280, 360, 450];

export function spawnWeight(def: CustomerDef, stars: number): number {
  const over = Math.max(0, stars - def.minStars);
  const boost = def.tier === 'common' ? 1 : 1 + over * 2;
  return def.weight * boost;
}
