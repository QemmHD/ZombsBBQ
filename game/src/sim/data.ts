/**
 * Game content tables (v3). Numbers follow the original game's own data tables (see
 * docs/08-original-deep-dive.md): customer stats on its 1–10 scales with ~100 energy, dishes on its
 * real-time ladder (2 min … a day) with thin margins, a crew that starts at one zombie, burn time =
 * cook time, and a slow energy economy. Names and dishes are our own.
 */

/** Which cookbook a dish belongs to; 'stove' dishes cook on any stove, the rest need that station. */
export type StationKind = 'stove' | 'grill' | 'smoker' | 'fryer';

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
  /** rare variants only: which variant, of which base dish (see VARIANTS below) */
  variant?: VariantId;
  base?: string;
  /** rare variants only: Frozen waits this many times longer before it burns */
  burnMult?: number;
  /** rare variants only: Fresh makes each happy diner count this many times toward the rating */
  rateWeight?: number;
}

const M = 60;
const H = 3600;
const D = (id: string, name: string, station: StationKind, source: 'level' | 'raid', level: number, cookSec: number, cost: number, servings: number, price: number, xp: number, blurb: string): DishDef => ({
  id,
  name,
  station,
  source,
  level,
  cost,
  cookSec,
  servings,
  price,
  xp,
  icon: `dish_${id}`,
  blurb,
});

export const DISHES: DishDef[] = [
  // the house cookbook: cooks on any stove
  D('sliders', 'Mystery Sliders', 'stove', 'level', 1, 2 * M, 10, 12, 5, 2, "Three tiny burgers. Don't count the eyes."),
  D('hobodog', 'Hobo Hot Dog', 'stove', 'level', 1, 5 * M, 30, 20, 6, 4, 'Found it. Grilled it. Band-aid optional.'),
  D('gumbo', 'Gutter Gumbo', 'stove', 'level', 2, 15 * M, 100, 45, 7, 8, 'Fished fresh from the storm drain.'),
  D('tacos', 'Toe-tally Tacos', 'stove', 'level', 3, 60 * M, 250, 150, 7, 15, 'Ten little piggies, extra crunchy.'),
  D('lasagut', 'Leftover Lasagut', 'stove', 'level', 3, 8 * H, 500, 300, 9, 65, 'Layers of pasta. Layers of… other things.'),
  D('broth', 'Bone Broth Bucket', 'stove', 'level', 4, 90 * M, 250, 120, 8, 20, 'Simmered from 206 locally sourced bones.'),
  D('meatloaf', 'Meatloaf of the Dead', 'stove', 'level', 5, 30 * M, 200, 80, 8, 12, 'It twitches. That means it’s fresh.'),
  D('goulash', 'Ghoul-ash', 'stove', 'level', 6, 24 * H, 1200, 650, 12, 95, 'Grandma’s recipe. Grandma’s in it.'),
  // the grill cookbook
  D('burger', 'Brain Burger', 'grill', 'level', 2, 20 * M, 150, 70, 9, 12, 'Medium-rare. Medium-brain.'),
  D('wings', "Finger-Lickin' Wings", 'grill', 'level', 5, 40 * M, 220, 100, 9, 15, 'Count your fingers after.'),
  D('kebab', 'Ke-blob Kebab', 'grill', 'level', 7, 2 * H, 400, 150, 11, 30, 'Meat on a stick. Stick also meat.'),
  D('smash', 'Smash Burger', 'grill', 'raid', 1, 45 * M, 250, 100, 11, 25, 'Big Hank smashed. You stole.'),
  D('chili', 'Chili Con Carnage', 'grill', 'raid', 1, 3 * H, 400, 200, 11, 65, "Chuck Wagon's secret. Now yours."),
  D('salad', 'Kale-ing Spree Salad', 'grill', 'raid', 1, 6 * H, 600, 320, 12, 100, 'Vegan Vera wept.'),
  // the smoker cookbook
  D('pork', 'Pulled Pork(ish)', 'smoker', 'level', 4, 2 * H, 350, 160, 11, 50, "Don't ask what the 'ish' is."),
  D('ribs', 'Rib Rack of Doom', 'smoker', 'level', 6, 5 * H, 500, 260, 12, 45, 'Fall-off-the-bone. Bone not included.'),
  D('brisket', '24-Hour Brisket', 'smoker', 'level', 8, 12 * H, 700, 420, 14, 60, 'Takes 12 hours. The name is aspirational.'),
  D('foie', 'Foie Gross', 'smoker', 'raid', 1, 14 * H, 800, 420, 16, 80, 'Très gross. Très délicieux.'),
  // the fryer cookbook
  D('rings', 'Onion Rings of Fire', 'fryer', 'level', 6, 15 * M, 100, 50, 8, 6, 'They bite back.'),
  D('nuggets', 'Brain Nuggets', 'fryer', 'level', 7, 45 * M, 250, 110, 10, 14, 'Smart food.'),
  D('fries', 'Finger Fries', 'fryer', 'level', 9, 150 * M, 300, 190, 10, 40, 'Hand-cut. Literally.'),
  D('chicken', 'Crunchy Coop Bucket', 'fryer', 'raid', 1, 4 * H, 450, 240, 12, 40, "The Colonel's 11 secret spleens."),
];

/**
 * Rare dish variants (the original's Bulk / Quick / Spicy / Fancy / Frozen / Fresh). A variant is a
 * known dish with one stat pushed about 1.5x. They only come from raids: a dish swiped off a rival's
 * counter sometimes comes home as a variant (VARIANT_DROP_CHANCE), lands in the Fridge, and UNLOCK
 * there learns it for good, after which it cooks from the stove's dish picker like any other recipe.
 *   Bulk    servings x1.5          Quick  cook time /1.5 (x0.67)
 *   Spicy   price/serving x1.5     Fancy  XP x1.5
 *   Frozen  burn window x3 (it waits three times as long before it burns)
 *   Fresh   each happy diner counts as 1.5 verdicts toward the star rating
 * Ingredient cost is the same as the plain dish. Ids are `${variant}_${dish}`, e.g. 'spicy_sliders'.
 */
export type VariantId = 'bulk' | 'quick' | 'spicy' | 'fancy' | 'frozen' | 'fresh';

export interface VariantDef {
  id: VariantId;
  name: string;
  /** what it does, for the dish picker and the fridge */
  effect: string;
}

export const VARIANT_MULT = 1.5;
export const FROZEN_BURN_MULT = 3;
/** chance that each dish stolen in a raid comes home as a rare variant */
export const VARIANT_DROP_CHANCE = 0.3;

export const VARIANTS: VariantDef[] = [
  { id: 'bulk', name: 'Bulk', effect: '+50% servings' },
  { id: 'quick', name: 'Quick', effect: 'cooks 1.5x faster' },
  { id: 'spicy', name: 'Spicy', effect: '+50% cash per serving' },
  { id: 'fancy', name: 'Fancy', effect: '+50% XP' },
  { id: 'frozen', name: 'Frozen', effect: 'takes 3x longer to burn' },
  { id: 'fresh', name: 'Fresh', effect: 'happy diners boost the rating 1.5x' },
];

export const VARIANT_BY_ID: Record<VariantId, VariantDef> = Object.fromEntries(VARIANTS.map((v) => [v.id, v])) as Record<VariantId, VariantDef>;

export const variantId = (dish: string, v: VariantId) => `${v}_${dish}`;

function makeVariant(d: DishDef, v: VariantDef): DishDef {
  const m = VARIANT_MULT;
  return {
    ...d,
    id: variantId(d.id, v.id),
    name: `${v.name} ${d.name}`,
    source: 'raid',
    variant: v.id,
    base: d.id,
    servings: v.id === 'bulk' ? Math.round(d.servings * m) : d.servings,
    cookSec: v.id === 'quick' ? Math.round(d.cookSec / m) : d.cookSec,
    price: v.id === 'spicy' ? Math.max(d.price + 1, Math.round(d.price * m)) : d.price,
    xp: v.id === 'fancy' ? Math.max(d.xp + 1, Math.round(d.xp * m)) : d.xp,
    burnMult: v.id === 'frozen' ? FROZEN_BURN_MULT : undefined,
    rateWeight: v.id === 'fresh' ? m : undefined,
  };
}

/** Every variant of every dish (not in DISHES, so menus and unlock lists stay as they were). */
export const VARIANT_DISHES: DishDef[] = DISHES.flatMap((d) => VARIANTS.map((v) => makeVariant(d, v)));

/** Plain dishes and their variants: icons, names and stats for any dish id the sim can hold. */
export const DISH_BY_ID: Record<string, DishDef> = Object.fromEntries([...DISHES, ...VARIANT_DISHES].map((d) => [d.id, d]));

/** The plain dish a (possibly variant) dish id is made from. */
export const baseDishId = (id: string) => DISH_BY_ID[id]?.base ?? id;

/** The original's stats: Energy (~100), and Speed / Power / Tips / Recharge / Focus / Patience on 1..10. */
export interface ZombieStats {
  energy: number; // max energy (= health in raids)
  speed: number;
  power: number;
  tips: number;
  recharge: number; // how fast they recover while resting
  focus: number; // low = daydreams a lot
  patience: number; // low = bites customers sooner when tired
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
  /** what this type is especially good at once it joins the crew (most have none; rarer types better) */
  perks?: Perks;
  /** picks a first name from the women's list (unset: the mixed list) */
  fem?: boolean;
}

/**
 * Per-type crew perks, as multipliers (1.25 = +25%):
 *   cook   dishes cook faster while they stand at the stove
 *   tips   diners they serve tip more
 *   regen  energy comes back faster while they nap
 *   xp     dishes they cook give more XP
 */
export interface Perks {
  cook?: number;
  tips?: number;
  regen?: number;
  xp?: number;
}

export type PerkId = keyof Perks;
export const PERK_IDS: PerkId[] = ['cook', 'tips', 'regen', 'xp'];
export const PERK_LABEL: Record<PerkId, string> = { cook: 'COOK', tips: 'TIPS', regen: 'REGEN', xp: 'XP' };

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
  s: [number, number, number, number, number, number, number],
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
  stats: { energy: s[0], speed: s[1], power: s[2], tips: s[3], recharge: s[4], focus: s[5], patience: s[6] },
  gag,
});

// stats: [energy, speed, power, tips, recharge, focus, patience]
export const CUSTOMERS: CustomerDef[] = [
  C('joe', 'Average Joe', 'Zombie Joe', 'common', 1, 0, 10, 1.0, {}, [100, 4, 4, 3, 3, 5, 5], 'Just your average, brain-hungry guy.'),
  C('jane', 'Average Jane', 'Zombie Jane', 'common', 1, 0, 10, 1.0, {}, [100, 4, 4, 3, 3, 5, 5], 'Came for lunch. Stayed forever.'),
  C('hipster', 'Hipster', 'Zombie Hipster', 'common', 1, 0, 7, 1.0, {}, [100, 4, 4, 3, 3, 5, 5], 'Ate brains before it was cool.'),
  C('senior', 'Senior', 'Zombie Senior', 'common', 1, 0, 5, 1.1, {}, [70, 1, 2, 6, 3, 2, 10], 'Slow, sweet, tips in butterscotch.'),
  C('accountant', 'Accountant', 'Zombie Accountant', 'common', 1, 0, 6, 1.0, {}, [100, 4, 4, 2, 3, 6, 6], 'Still itemizes the brains.'),
  C('yoga', 'Yoga Instructor', 'Zombie Yogi', 'common', 1, 0, 5, 1.0, {}, [100, 4, 5, 3, 5, 4, 4], 'Namaste… hungry.'),
  C('teen', 'Teenager', 'Zombie Teen', 'common', 1, 0, 6, 0.9, {}, [85, 7, 4, 1, 6, 2, 2], 'Fast. Lazy. Bitey.'),
  C('politician', 'Politician', 'Zombie Politician', 'uncommon', 2, 1, 5, 1.2, { cash: 100 }, [90, 4, 3, 5, 3, 6, 6], 'Promises brains for every voter.'),
  C('construction', 'Construction Worker', 'Hardhat Zombie', 'common', 3, 0, 6, 1.0, { cash: 250 }, [140, 3, 9, 1, 2, 3, 2], 'Strong. Slow to recharge. Bites first.'),
  C('nurse', 'Nurse', 'Nurse Zombie', 'uncommon', 3, 1, 5, 1.1, { cash: 600 }, [110, 6, 3, 5, 4, 6, 9], 'Takes your pulse, then your lunch.'),
  C('cop', 'Cop', 'Officer Rot', 'uncommon', 5, 1, 6, 1.2, { sauce: 1 }, [140, 6, 7, 2, 3, 7, 9], 'Arrests customers who don’t tip.'),
  C('ceo', 'CEO', 'Zombie CEO', 'uncommon', 5, 1.5, 4, 1.6, { cash: 2500 }, [90, 4, 3, 8, 3, 4, 6], 'Outsourced his own brain.'),
  C('trafficcop', 'Traffic Cop', 'Zombie Traffic Cop', 'uncommon', 6, 2, 4, 1.2, { sauce: 2 }, [100, 8, 4, 4, 4, 5, 5], 'Whistles at slow eaters.'),
  C('benchwarmer', 'Benchwarmer', 'Zombie Benchwarmer', 'rare', 7, 2, 3, 1.1, { cash: 5000 }, [160, 7, 7, 1, 9, 1, 1], 'Finally off the bench. Never stops moving.'),
  C('lumberjack', 'Lumberjack', 'Lumberjacked', 'rare', 7, 2, 3, 1.3, { cash: 5000 }, [140, 3, 8, 2, 2, 6, 3], 'Axe stuck in his own hat.'),
  C('cheerleader', 'Cheerleader', 'Fear-leader', 'rare', 7, 2.5, 3, 1.3, { cash: 6000 }, [100, 8, 4, 6, 5, 4, 4], 'Gimme a B! Gimme an R-A-I-N-S!'),
  C('critic', 'Food Critic', 'Food Crypt-ic', 'rare', 8, 3, 2, 2.0, { sauce: 5 }, [100, 4, 3, 9, 3, 8, 5], 'Notepad reads: BRAINS 5/5.'),
  C('boxer', 'Boxer', 'Zombie Boxer', 'rare', 8, 2.5, 3, 1.2, { sauce: 15 }, [150, 6, 10, 2, 5, 6, 4], 'Floats like a butterfly. Rots like a bee.'),
  C('grandma', 'Grandma', 'Grave Granny', 'rare', 9, 3, 2, 1.5, { cash: 15000 }, [100, 2, 4, 9, 3, 3, 10], 'Knits scarves of goo.'),
  C('moviestar', 'Movie Star', 'Zombie Movie Star', 'rare', 10, 3.5, 2, 1.6, { sauce: 10 }, [110, 8, 3, 8, 4, 6, 6], 'Signs autographs in slime.'),
  C('sumo', 'Sumo Wrestler', 'Zombie Sumo', 'epic', 11, 3.5, 1.5, 1.4, { sauce: 30 }, [220, 2, 10, 3, 2, 7, 7], 'One belly-bump, three waiters down.'),
  C('influencer', 'Influencer', 'Zombie Influencer', 'epic', 12, 4, 1.5, 1.5, { sauce: 20 }, [90, 7, 3, 9, 6, 3, 3], '#BrainFood. 0 followers alive.'),
  C('celebrity', 'Celebrity', 'Zombie Celebrity', 'epic', 13, 4, 1, 2.2, { sauce: 40 }, [120, 7, 4, 10, 4, 5, 5], 'Velvet rope included.'),
  C('champ', 'The Champ', 'Zombie Champ', 'legendary', 15, 4.5, 0.6, 1.8, { sauce: 80 }, [250, 8, 10, 6, 6, 8, 8], 'Undefeated. Also undead.'),
];

/** Perks and name lists per type (kept apart from the stat table so new types can be added there as plain rows). */
const EXTRAS: Record<string, Pick<CustomerDef, 'perks' | 'fem'>> = {
  jane: { fem: true },
  yoga: { fem: true, perks: { regen: 1.15 } },
  politician: { perks: { tips: 1.15 } },
  nurse: { fem: true, perks: { regen: 1.25 } },
  ceo: { perks: { tips: 1.3 } },
  trafficcop: { perks: { cook: 1.1 } },
  benchwarmer: { perks: { regen: 1.3 } },
  lumberjack: { perks: { cook: 1.2 } },
  cheerleader: { fem: true, perks: { tips: 1.2, regen: 1.1 } },
  critic: { perks: { xp: 1.25 } },
  boxer: { perks: { regen: 1.15 } },
  grandma: { fem: true, perks: { cook: 1.25, xp: 1.15 } },
  moviestar: { fem: true, perks: { tips: 1.3 } },
  sumo: { perks: { cook: 1.15, regen: 1.2 } },
  influencer: { fem: true, perks: { tips: 1.4 } },
  celebrity: { perks: { tips: 1.4, xp: 1.15 } },
  champ: { perks: { cook: 1.2, tips: 1.2, regen: 1.3, xp: 1.2 } },
};
for (const c of CUSTOMERS) Object.assign(c, EXTRAS[c.id]);

export const CUSTOMER_BY_ID: Record<string, CustomerDef> = Object.fromEntries(CUSTOMERS.map((c) => [c.id, c]));

/** A crew member's perk multiplier (1 when the type has none, and for YOU). */
export function perk(type: string, id: PerkId): number {
  return CUSTOMER_BY_ID[type]?.perks?.[id] ?? 1;
}

/** Our own first names for customers (and the zombies they become). */
export const FIRST_NAMES = {
  m: ['Gary', 'Dale', 'Earl', 'Ron', 'Walt', 'Doug', 'Phil', 'Lyle', 'Marv', 'Stan', 'Otis', 'Vic', 'Lenny', 'Burt', 'Gil', 'Herb', 'Rudy', 'Wes', 'Floyd', 'Mort', 'Clint', 'Duane', 'Hal', 'Irv'],
  f: ['Doris', 'Gail', 'Pam', 'Rita', 'Bev', 'Lorna', 'Midge', 'Fay', 'Trish', 'Wanda', 'Opal', 'Dot', 'Edna', 'Joan', 'Kay', 'Nell', 'Peg', 'Roz', 'Sal', 'Tammy', 'Vi', 'Mavis', 'Lois', 'Bonnie'],
  x: ['Sam', 'Alex', 'Jo', 'Robin', 'Casey', 'Terry', 'Lee', 'Pat', 'Jody', 'Kim', 'Dana', 'Frankie'],
};

const MEN = new Set(['joe', 'hipster', 'senior', 'accountant', 'teen', 'politician', 'construction', 'cop', 'ceo', 'trafficcop', 'benchwarmer', 'lumberjack', 'critic', 'boxer', 'sumo', 'celebrity', 'champ']);

/** A seeded first name for a customer of this type (seed: any well-mixed 32-bit number). */
export function firstName(type: string, seed: number): string {
  const fem = CUSTOMER_BY_ID[type]?.fem ?? (MEN.has(type) ? false : undefined);
  const list = fem === true ? FIRST_NAMES.f : fem === false ? FIRST_NAMES.m : FIRST_NAMES.x;
  return list[(seed >>> 0) % list.length];
}

export const YOU_STATS: ZombieStats = { energy: 100, speed: 5, power: 3, tips: 4, recharge: 5, focus: 10, patience: 10 };

/** Tuning knobs, gathered in one place for balancing. */
export const TUNING = {
  startCash: 300,
  startSauce: 5, // the original also started you with 5 Toxin vials
  /** how long a seated customer waits for food before leaving unhappy */
  customerWaitSec: 60, // original: a minute, then they storm off
  eatSec: 30, // original: half a minute at the table
  fleeSpeed: 3.0,
  baseWalkSpeed: 1.4, // tiles/sec at speed 0 (original: an average person walks ~1.9 tiles/s)
  walkSpeedPerStat: 0.125,
  /** zombies shuffle ~20% slower than the living (original) */
  zombieWalkMult: 0.8,
  /** customers turn up every 18 s at zero stars down to every 4.5 s at five (original) */
  arrivalSlowSec: 18,
  arrivalFastSec: 4.5,
  energyPerServe: 1.5,
  energyPerClear: 0.6,
  energyCookPerSec: 1 / 20, // original: cooks burn 1 energy / 20 s
  /** …but only while prepping, the first this-many seconds of a dish; after that they just stand and
   * stir (a 5 h dish would otherwise cost 900 energy, and a hangry cook would pause it forever) */
  prepSec: 10 * 60,
  restRegenPerSec: 1 / 16, // ~3.75/min at average recharge (original ~3/min)
  /** each Toxic Barrel adds this much to the rest recharge rate (they stack; original +10%) */
  kegBonus: 0.1,
  biteEnergyGain: 20,
  /** a hangry zombie slumps and moans this long before it goes for a customer (original 5 s warning) */
  hungrySec: 5,
  /** at most one bite per zombie this often (original ZOMBIE_ATTACK_INTERVAL 60 s) */
  biteCooldownSec: 60,
  /** a zombie that can't get to its snack tries again after this long */
  huntRetrySec: 10,
  /** a zombie that works itself down to 0 energy passes out face-down; lying there it recovers at this
   * fraction of the nap rate and gets back up on its own at wakeAt of its max energy */
  asleepRegenMult: 0.5,
  asleepWakeAt: 0.5,
  /** freshly infected zombies start out starving (original: 20 energy) */
  infectEnergy: 20,
  /** Brain Sauce refills only work below this share of max energy (original) */
  refillBelow: 0.8,
  /** tip = bill x tips stat x this (Tips 10 ≈ 20% of the bill, original) */
  tipPerStat: 0.02,
  /** customers stop just inside the door to look around (original 1 s ± 0.8 s) */
  doorPauseSec: 1,
  doorPauseJitter: 0.8,
  /** a served diner holds the plate a moment before tucking in (original 2 s) */
  holdFoodSec: 2,
  /** the fridge holds this many stolen dishes */
  fridgeMax: 12,
  /** while you're away (app hidden / offline catch-up) a zombie this close above its bite line takes
   * itself out for a nap instead of snacking on the customers (the "union break"; a Settings toggle) */
  unionBreakMargin: 0.1,
  /** while away, stoves keep cooking on real time for up to this long (customers stop at the 8 h cap) */
  offlineStoveCapSec: 24 * 3600,
  /** the Zombie Pug: one find of $5–15 every ~6 min, never while closed, at most $600 a day */
  pugFindSec: 360,
  pugFindMin: 5,
  pugFindMax: 15,
  pugDailyMax: 600,
  /** a zombie who catches a customer eats them on the spot for this long before getting back to work */
  feastSec: 3,
  daydreamBaseSec: 100, // original: focus 1 ~ every 100 s
  daydreamMaxSec: 25,
  offlineCapSec: 8 * 3600,
  /** a finished dish burns once it has waited as long as it took to cook (original), never sooner than this */
  burnMinSec: 5 * 60,
  keepWarmFactor: 1.5,
  /** rating: popularity 0..1 (= 0..5 stars) drifts toward each customer's verdict */
  ratingStart: 0.3,
  ratingRate: 0.03,
  /** star items: rating rises (1 + bonus*K)x faster and falls that much slower */
  ratingDecorK: 8,
  /** a bite counts as this many angry customers */
  ratingAttackWeight: 3,
  /** a closed café's rating slowly sags (per second) */
  closedDriftPerSec: 0.000003,
  reanimateSec: 60 * 60, // raid KO (original went from 8 h to 1 h)
  reanimateEnergy: 20, // comes back with 20 energy (original)
  sellBack: 0.5,
  /** zombie levels: XP needed for each level; every level adds 5% max energy */
  zombieLevelXp: [0, 20, 50, 100, 170, 260, 380, 530, 720, 950],
  zombieLevelEnergy: 0.05,
  /**
   * purple bonus stars (Gus's to-do list, see PURPLE): each active one makes customers arrive 15%
   * more often and lets one more diner in at a time, adds 15% to tips, and counts as half a star when
   * deciding which (rarer) customers show up. Three purple stars ≈ +45% foot traffic and tips.
   */
  purpleArrivalBoost: 0.15,
  purpleTipBoost: 0.15,
  purpleStarValue: 0.5,
};

/** Gus's to-do list and the purple bonus stars it pays (original: from level 6, 4 tasks, max 3 stars). */
export const PURPLE = {
  level: 6,
  tasks: 4,
  max: 3,
  /** the first star lasts 48 h; the second adds 36 h to the timer, the third 24 h (original) */
  hours: [48, 36, 24],
  /** with all three up, another finished list tops the timer up by 24 h, never past 108 h away */
  refillHours: 24,
  capHours: 108,
  /** bribe the reviewer: tick off one unfinished task for this much Brain Sauce (original: 2 toxin) */
  bribeSauce: 2,
};

/** Patience 1 attacks at ~20% energy, patience 10 holds out until ~2% (original game). */
export function attackThreshold(patience: number): number {
  return Math.max(0.02, 0.2 - (patience - 1) * 0.02);
}

export function walkSpeed(speedStat: number): number {
  return TUNING.baseWalkSpeed + speedStat * TUNING.walkSpeedPerStat;
}

/** Rest recharge multiplier from the Recharge stat (5 = 1x; teens recover fast, hardhats slowly). */
export function rechargeMult(recharge: number): number {
  return 0.4 + recharge * 0.12;
}

export const LEVEL_CAP = 40;

const XP_TABLE = [10, 30, 60, 110, 180, 270, 380, 520, 700, 950];
export function xpToNext(level: number): number {
  if (level <= XP_TABLE.length) return XP_TABLE[level - 1];
  return Math.round(950 * Math.pow(1.22, level - 10));
}

/** Crew slots (original): 1, 2, 3, 3, 4, 4 … one more every two levels to 9 at levels 15–16, then 10 from
 * level 17, 11 from 27, 12 from 36, 13 from 46 and 14 from 56. */
export function crewCapForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level <= 16) return Math.floor((level + 3) / 2);
  for (const [lv, cap] of [
    [56, 14],
    [46, 13],
    [36, 12],
    [27, 11],
  ] as const)
    if (level >= lv) return cap;
  return 10;
}

/** Rare customers get more common the further your stars exceed their requirement (original behavior). */
export function spawnWeight(def: CustomerDef, stars: number): number {
  const over = Math.max(0, stars - def.minStars);
  const boost = def.tier === 'common' ? 1 : 1 + over * 2;
  return def.weight * boost;
}

/** Zombie level from its XP (1..10). */
export function zombieLevel(xp: number): number {
  let lv = 1;
  for (let i = 1; i < TUNING.zombieLevelXp.length; i++) if (xp >= TUNING.zombieLevelXp[i]) lv = i + 1;
  return lv;
}
