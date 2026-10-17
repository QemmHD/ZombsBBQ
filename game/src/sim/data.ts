/**
 * Game content tables (v3). Numbers follow the original game's own data tables (see
 * docs/08-original-deep-dive.md): customer stats on its 1–10 scales with ~100 energy, dishes on its
 * real-time ladder (2 min … a day) with thin margins, a crew that starts at one zombie, burn time =
 * cook time, and a slow energy economy. Names and dishes are our own.
 */

/** Which cookbook a dish belongs to; 'stove' dishes cook on any stove, the rest need that station. */
export type StationKind = 'stove' | 'grill' | 'smoker' | 'fryer' | 'cauldron' | 'kiln' | 'pit' | 'tomb';

/** Every cookbook, in menu order: the station that cooks it and the cookbook's name. */
export const STATIONS: { kind: StationKind; name: string; book: string }[] = [
  { kind: 'stove', name: 'Stove', book: 'the house menu' },
  { kind: 'grill', name: 'BBQ Grill', book: 'Backyard Basics' },
  { kind: 'smoker', name: 'Smoker', book: 'Smokehouse' },
  { kind: 'fryer', name: 'Deep Fryer', book: 'Fry Shack' },
  { kind: 'cauldron', name: "Witch's Cauldron", book: 'Mad Sauces' },
  { kind: 'kiln', name: 'Brick Kiln', book: 'Wood-Fired Rot' },
  { kind: 'pit', name: 'Pit Oven', book: 'Feast of the Dead' },
  { kind: 'tomb', name: 'Tomb Smoker', book: 'Graveyard Grill' },
];

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
  D('sliders', 'Mystery Sliders', 'stove', 'level', 1, 2 * M, 10, 8, 4, 1, "Three tiny burgers. Don't count the eyes."),
  D('hobodog', 'Hobo Hot Dog', 'stove', 'level', 1, 5 * M, 20, 18, 4, 4, 'Found it. Grilled it. Band-aid optional.'),
  D('gumbo', 'Gutter Gumbo', 'stove', 'level', 2, 15 * M, 55, 45, 5, 7, 'Fished fresh from the storm drain.'),
  D('tacos', 'Toe-tally Tacos', 'stove', 'level', 3, 60 * M, 340, 150, 9, 20, 'Ten little piggies, extra crunchy.'),
  D('lasagut', 'Leftover Lasagut', 'stove', 'level', 3, 8 * H, 740, 425, 7, 57, 'Layers of pasta. Layers of… other things.'),
  D('broth', 'Bone Broth Bucket', 'stove', 'level', 4, 90 * M, 280, 185, 6, 27, 'Simmered from 206 locally sourced bones.'),
  D('meatloaf', 'Meatloaf of the Dead', 'stove', 'level', 5, 30 * M, 150, 85, 7, 15, 'It twitches. That means it’s fresh.'),
  D('goulash', 'Ghoul-ash', 'stove', 'level', 6, 24 * H, 1850, 735, 10, 130, 'Grandma’s recipe. Grandma’s in it.'),
  // the grill cookbook
  D('burger', 'Brain Burger', 'grill', 'level', 2, 20 * M, 75, 60, 5, 8, 'Medium-rare. Medium-brain.'),
  D('wings', "Finger-Lickin' Wings", 'grill', 'level', 5, 40 * M, 180, 105, 7, 18, 'Count your fingers after.'),
  D('kebab', 'Ke-blob Kebab', 'grill', 'level', 7, 2 * H, 470, 210, 9, 41, 'Meat on a stick. Stick also meat.'),
  D('smash', 'Smash Burger', 'grill', 'raid', 1, 45 * M, 230, 115, 8, 23, 'Big Hank smashed. You stole.'),
  D('chili', 'Chili Con Carnage', 'grill', 'raid', 1, 3 * H, 720, 260, 11, 57, "Chuck Wagon's secret. Now yours."),
  D('salad', 'Kale-ing Spree Salad', 'grill', 'raid', 1, 6 * H, 1350, 365, 15, 93, 'Vegan Vera wept.'),
  // the smoker cookbook
  D('pork', 'Pulled Pork(ish)', 'smoker', 'level', 4, 2 * H, 600, 200, 12, 60, "Don't ask what the 'ish' is."),
  D('ribs', 'Rib Rack of Doom', 'smoker', 'level', 6, 5 * H, 750, 335, 9, 59, 'Fall-off-the-bone. Bone not included.'),
  D('brisket', '24-Hour Brisket', 'smoker', 'level', 8, 12 * H, 2400, 600, 16, 107, 'Takes 12 hours. The name is aspirational.'),
  D('foie', 'Foie Gross', 'smoker', 'raid', 1, 14 * H, 2250, 560, 16, 142, 'Très gross. Très délicieux.'),
  // the fryer cookbook
  D('rings', 'Onion Rings of Fire', 'fryer', 'level', 6, 15 * M, 80, 45, 7, 10, 'They bite back.'),
  D('nuggets', 'Brain Nuggets', 'fryer', 'level', 7, 45 * M, 260, 115, 9, 23, 'Smart food.'),
  D('fries', 'Finger Fries', 'fryer', 'level', 9, 150 * M, 700, 235, 12, 52, 'Hand-cut. Literally.'),
  D('chicken', 'Crunchy Coop Bucket', 'fryer', 'raid', 1, 4 * H, 980, 300, 13, 71, "The Colonel's 11 secret spleens."),
  // ---- the late game: a new dish at every level from 10 to 40 (long timers, thin margins, lots of XP)
  D('chowder', 'Calamity Chowder', 'stove', 'level', 10, 45 * M, 340, 115, 12, 29, 'Clams, corn and one unclaimed sock.'),
  D('corndog', 'Corn-Dead Dog', 'grill', 'level', 10, 90 * M, 600, 185, 13, 43, 'Dipped, fried, impaled. Like its last owner.'),
  D('eyesoup', 'Eyeball Soup', 'cauldron', 'level', 11, 30 * M, 260, 85, 12, 23, "It's looking at you. Eat it anyway."),
  D('stew', "Witch's Brew Stew", 'cauldron', 'level', 12, 3 * H, 980, 260, 15, 68, 'Double, double, gristle and bubble.'),
  D('links', 'Smoky Finger Links', 'smoker', 'level', 12, 90 * M, 650, 185, 14, 48, 'Ten links. Ten little knuckles.'),
  D('tbone', 'Tombstone T-Bone', 'grill', 'level', 13, 150 * M, 880, 235, 15, 65, 'Rare. Like, still-mooing rare.'),
  D('donuts', 'Glazed Eyeball Donuts', 'fryer', 'level', 14, 60 * M, 560, 150, 15, 43, 'The sprinkles are probably sprinkles.'),
  D('pizza', 'Pepper-groany Pizza', 'kiln', 'level', 15, 40 * M, 390, 105, 15, 34, 'Extra cheese. Extra eyes.'),
  D('calzone', 'Cal-zombie', 'kiln', 'level', 15, 2 * H, 840, 210, 16, 64, 'A pizza that ate another pizza.'),
  D('jerky', 'Jerky of the Living Dead', 'smoker', 'level', 16, 6 * H, 1750, 365, 19, 117, 'Chewy and tough. Like Uncle Ned.'),
  D('knots', 'Gut-Knot Garlic Rolls', 'kiln', 'level', 17, 75 * M, 720, 170, 17, 56, 'Twisted, like the chef.'),
  D('meatballs', 'Meatballs of Unknown Origin', 'stove', 'level', 18, 4 * H, 1500, 300, 20, 104, 'Please stop asking where the eyes went.'),
  D('brats', 'Brain-wurst Brats', 'grill', 'level', 19, 3 * H, 1350, 260, 21, 93, 'Snappy casing. Smart filling.'),
  D('swamp', 'Swamp Slop Soup', 'cauldron', 'level', 20, 6 * H, 2100, 365, 23, 137, 'Locally foraged from the bog behind the bus stop.'),
  D('hog', 'Whole Hog of Horror', 'pit', 'level', 21, 12 * H, 3400, 520, 26, 201, 'Apple in mouth. Hog in denial.'),
  D('deepdish', 'Deep-Grave Dish Pizza', 'kiln', 'level', 22, 5 * H, 2100, 335, 25, 135, 'Six feet deep, like a good grave.'),
  D('fishchips', 'Fish & Chipped Teeth', 'fryer', 'level', 23, 2 * H, 1250, 210, 24, 88, 'Mind the dentures.'),
  D('turducken', 'Turducken-stein', 'pit', 'level', 24, 16 * H, 4650, 600, 31, 258, 'A turkey in a duck in a chicken, stitched up in a lab.'),
  D('burntends', 'Burnt Ends of the Earth', 'smoker', 'level', 25, 8 * H, 3200, 425, 30, 188, 'The apocalypse, cubed.'),
  D('fondue', 'Finger Fondue', 'cauldron', 'level', 26, 2 * H, 1450, 210, 28, 97, 'Double-dipping is mandatory.'),
  D('coffinribs', 'Coffin Ribs', 'tomb', 'level', 27, 10 * H, 4050, 475, 34, 224, 'Slow-smoked in a pine box.'),
  D('beans', 'Grave-Baked Beans', 'tomb', 'level', 28, 4 * H, 2500, 300, 33, 146, 'Buried six feet under. Dug up for you.'),
  D('stromboli', 'Strom-bowel-i', 'kiln', 'level', 29, 7 * H, 3550, 395, 36, 198, 'Rolled, stuffed, regretted.'),
  D('mammoth', 'Mammoth Drumstick', 'pit', 'level', 30, 20 * H, 7050, 670, 42, 344, 'Thawed out of a glacier. Mostly.'),
  D('tomahawk', 'Tomahawk Chop-Chop', 'grill', 'level', 31, 6 * H, 3650, 365, 40, 194, 'A steak with a handle and a grudge.'),
  D('mummywrap', 'Mummy Wraps', 'tomb', 'level', 32, 5 * H, 3450, 335, 41, 182, 'The bandages are edible. Probably.'),
  D('potpie', 'Pot Pie of Peril', 'stove', 'level', 33, 9 * H, 5050, 450, 45, 250, 'Something under the crust is knocking.'),
  D('tempura', 'Toe-mpura', 'fryer', 'level', 34, 3 * H, 2800, 260, 43, 148, 'Ten little piggies, flash-fried.'),
  D('hash', 'Headstone Hash', 'tomb', 'level', 35, 8 * H, 5200, 425, 49, 247, "Engraved with the last cook's initials."),
  D('elixir', 'Undying Elixir Stew', 'cauldron', 'level', 36, 14 * H, 7700, 560, 55, 335, 'Sip it and live forever. Sort of.'),
  D('kraken', 'Kraken on a Spit', 'pit', 'level', 37, 18 * H, 9350, 635, 59, 389, "It's still waving. Wave back."),
  D('pizzaface', 'The Pizza Face', 'kiln', 'level', 38, 10 * H, 7000, 475, 59, 297, 'A pizza with a face. It has opinions.'),
  D('damned', 'Brisket of the Damned', 'tomb', 'level', 39, 24 * H, 12300, 735, 67, 470, 'Smoked for a day. Damned for eternity.'),
  D('apocalypse', 'Apocalypse Platter', 'pit', 'level', 40, 24 * H, 12850, 735, 70, 480, 'Everything, on one plate. Run.'),
  // secret recipes for the new stations (raid-only)
  D('toadstew', 'Toad-ally Stew', 'cauldron', 'raid', 1, 4 * H, 1350, 300, 18, 95, 'Ribbit. Gulp. Ribbit.'),
  D('ratpizza', 'Sewer Rat Pizza', 'kiln', 'raid', 1, 3 * H, 1350, 260, 21, 95, 'Hand-tossed by an actual rat.'),
  D('luau', 'Luau Lizard', 'pit', 'raid', 1, 14 * H, 4500, 560, 32, 259, 'Pit-roasted with a tiny grass skirt.'),
  D('tenders', 'Tombstone Tenders', 'tomb', 'raid', 1, 6 * H, 3550, 365, 39, 205, 'Rest in pieces.'),
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
export type VariantId = 'bulk' | 'quick' | 'spicy' | 'fancy' | 'frozen' | 'fresh' | VeryId;
/**
 * "Very" tiers (x2 instead of x1.5) of the three numbers players chase: Very Spicy (price), Very Fancy (XP)
 * and Very Quick (cook time). They never drop from raids: master the plain variant (cook it
 * VERY_MASTERY times) or get lucky on the Frequent Fryer streak. Ids are `very_spicy_${dish}`.
 */
export type VeryId = 'very_spicy' | 'very_fancy' | 'very_quick';

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
  { id: 'fresh', name: 'Fresh', effect: 'happy diners boost the rating 1.5x; slow to burn' },
];

export const VERY_MULT = 2;
/** cook a learned Spicy / Fancy / Quick dish this many times to master its Very tier */
export const VERY_MASTERY = 10;
export const VERY_VARIANTS: VariantDef[] = [
  { id: 'very_spicy', name: 'Very Spicy', effect: 'x2 cash per serving' },
  { id: 'very_fancy', name: 'Very Fancy', effect: 'x2 XP' },
  { id: 'very_quick', name: 'Very Quick', effect: 'cooks 2x faster' },
];
/** The plain variant each Very tier is mastered from. */
export const VERY_FROM: Record<VeryId, VariantId> = { very_spicy: 'spicy', very_fancy: 'fancy', very_quick: 'quick' };

export const VARIANT_BY_ID: Record<VariantId, VariantDef> = Object.fromEntries([...VARIANTS, ...VERY_VARIANTS].map((v) => [v.id, v])) as Record<VariantId, VariantDef>;

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

function makeVery(d: DishDef, v: VariantDef): DishDef {
  const m = VERY_MULT;
  return {
    ...d,
    id: variantId(d.id, v.id),
    name: `${v.name} ${d.name}`,
    source: 'raid',
    variant: v.id,
    base: d.id,
    cookSec: v.id === 'very_quick' ? Math.round(d.cookSec / m) : d.cookSec,
    price: v.id === 'very_spicy' ? Math.max(d.price + 2, Math.round(d.price * m)) : d.price,
    xp: v.id === 'very_fancy' ? Math.max(d.xp + 2, Math.round(d.xp * m)) : d.xp,
  };
}

/** The Very tiers of every dish (x2 on one stat). */
export const VERY_DISHES: DishDef[] = DISHES.flatMap((d) => VERY_VARIANTS.map((v) => makeVery(d, v)));

/** Plain dishes and their variants: icons, names and stats for any dish id the sim can hold. */
export const DISH_BY_ID: Record<string, DishDef> = Object.fromEntries([...DISHES, ...VARIANT_DISHES, ...VERY_DISHES].map((d) => [d.id, d]));

/** The Very tier a learned plain variant masters into ('spicy_ribs' → 'very_spicy_ribs'), if it has one. */
export function veryOf(dishId: string): string | null {
  const d = DISH_BY_ID[dishId];
  const very = d?.variant && (Object.keys(VERY_FROM) as VeryId[]).find((k) => VERY_FROM[k] === d.variant);
  return very ? variantId(d.base!, very) : null;
}

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
  C('champ', 'The Champ', 'Zombie Champ', 'legendary', 15, 4.5, 0.6, 1.8, { sauce: 60 }, [250, 8, 10, 6, 6, 8, 8], 'Undefeated. Also undead.'),
  // ---- the late crowd (levels 16-40): rarer every few levels, and they want the stars to match
  C('trucker', 'Trucker', 'Long-Haul Corpse', 'uncommon', 16, 2.5, 3, 1.3, { cash: 9000 }, [180, 3, 6, 3, 4, 8, 7], 'Hour nine thousand of his shift. Still hasn’t stopped for a nap.'),
  C('biker', 'Biker', 'Road-Kill Rider', 'rare', 18, 3, 2.5, 1.3, { sauce: 12 }, [160, 6, 9, 2, 4, 5, 3], 'Rides with the pack. Eats the pack.'),
  C('firefighter', 'Firefighter', 'Smokey the Zombie', 'rare', 20, 3, 2.5, 1.4, { cash: 22000 }, [190, 6, 8, 4, 6, 7, 8], 'Puts out grill fires. Then eats the griller.'),
  C('bride', 'Bride', 'Bride-zilla', 'rare', 23, 3.5, 2, 2.0, { cash: 30000 }, [110, 5, 3, 10, 4, 4, 6], 'Said “till death do us part.” Death disagreed.'),
  C('headbanger', 'Headbanger', 'Head-Banged', 'epic', 26, 4, 1.5, 1.4, { sauce: 25 }, [130, 9, 6, 3, 8, 2, 3], 'Banged his head until it came off. Put it back on. Kept going.'),
  C('surgeon', 'Surgeon', 'Dr. Scalpel', 'epic', 29, 4, 1.2, 1.9, { sauce: 35 }, [120, 7, 4, 7, 5, 10, 9], 'Steady hands. Takes a kidney home in a doggy bag.'),
  C('tycoon', 'Oil Tycoon', 'Crude Baron', 'epic', 33, 4.5, 1, 2.6, { sauce: 50 }, [110, 3, 3, 10, 3, 6, 7], 'Tips in gold teeth. Some of them are his.'),
  C('pitmaster', 'Pitmaster', 'The Smoke Lord', 'legendary', 38, 4.5, 0.5, 2.0, { sauce: 100 }, [260, 7, 9, 8, 7, 9, 9], 'Forty years at the pit. The pit won.'),
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
  trucker: { perks: { regen: 1.2 } },
  biker: { perks: { cook: 1.15 } },
  firefighter: { perks: { cook: 1.2, regen: 1.15 } },
  bride: { fem: true, perks: { tips: 1.35 } },
  headbanger: { perks: { cook: 1.25, regen: 1.2 } },
  surgeon: { perks: { cook: 1.2, xp: 1.25 } },
  tycoon: { perks: { tips: 1.5, xp: 1.1 } },
  pitmaster: { perks: { cook: 1.3, tips: 1.2, regen: 1.2, xp: 1.3 } },
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

const MEN = new Set(['joe', 'hipster', 'senior', 'accountant', 'teen', 'politician', 'construction', 'cop', 'ceo', 'trafficcop', 'benchwarmer', 'lumberjack', 'critic', 'boxer', 'sumo', 'celebrity', 'champ', 'trucker', 'biker', 'headbanger', 'tycoon', 'pitmaster']);

/** A seeded first name for a customer of this type (seed: any well-mixed 32-bit number). */
export function firstName(type: string, seed: number): string {
  const fem = CUSTOMER_BY_ID[type]?.fem ?? (MEN.has(type) ? false : undefined);
  const list = fem === true ? FIRST_NAMES.f : fem === false ? FIRST_NAMES.m : FIRST_NAMES.x;
  return list[(seed >>> 0) % list.length];
}

export const YOU_STATS: ZombieStats = { energy: 100, speed: 5, power: 3, tips: 4, recharge: 5, focus: 10, patience: 10 };

/** Tuning knobs, gathered in one place for balancing. */
export const TUNING = {
  startCash: 5000, // original: $5,000 and 5 toxin
  startSauce: 5, // the original also started you with 5 Toxin vials
  /** how long a seated customer waits for food before leaving unhappy */
  customerWaitSec: 60, // original: a minute, then they storm off
  eatSec: 30, // original: half a minute at the table
  /** the tutorial's very first diner eats in 10 s (original: TUTORIAL_CUSTOMER_EAT_TIME) */
  tutorialEatSec: 10,
  fleeSpeed: 3.0,
  /** raids still walk on this older ramp (raid.ts): tiles/sec at speed 0, + per Speed point */
  baseWalkSpeed: 1.4,
  walkSpeedPerStat: 0.125,
  /**
   * In the joint everyone moves like the original: speed multiplier 2 + 0.2 x Speed (doc 16 D), at this many
   * tiles/s per unit. 0.4 matches the play-through: the chef (Speed 5) walks ~1.2 tiles/s and a chase runs
   * ~2 tiles/s (doc 19 §4-5).
   */
  tilesPerSpeedUnit: 0.4,
  /** zombies take 1.2x as long per tile (original ZOMBIE_SLOWDOWN_MULTIPLIER) */
  zombieSlowdown: 1.2,
  /** running (panic, fleeing, fired, the infect chase) takes 0.6x the time per tile (original "hurry") */
  runTimeFactor: 0.6,
  /** zombies shuffle ~20% slower than the living (raids) */
  zombieWalkMult: 0.8,
  /** idle zombies stroll to a nearby tile every this-many seconds (min..max), up to wanderRadius tiles */
  wanderMinSec: 6,
  wanderMaxSec: 14,
  wanderRadius: 3,
  /** the infection chase: the runner is held to this share of the chaser's pace, and gives up cornered
   * after chaseMaxSec, so the catch always happens */
  chaseRunnerPace: 0.95,
  chaseMaxSec: 12,
  /** customers turn up every 18 s at zero stars down to every 4.5 s at five, ±1 s (original) */
  arrivalSlowSec: 18,
  arrivalFastSec: 4.5,
  arrivalJitterSec: 1,
  /** each arrival roll passes this chance (out of 256) at 0 rating … at full rating (original 211-238) */
  visitChance: [211, 238] as [number, number],
  /** sold out (doc 13 #1, ours): with no food anywhere, at most one customer per this many seconds looks in */
  soldOutGapSec: 300,
  energyPerServe: 1.5,
  energyPerClear: 0.6,
  energyCookPerSec: 1 / 20, // original: cooks burn 1 energy / 20 s
  /** …but only while prepping, the first this-many seconds of a dish; after that they just stand and
   * stir (a 5 h dish would otherwise cost 900 energy, and a hangry cook would pause it forever) */
  prepSec: 10 * 60,
  restRegenPerSec: 1 / 16, // ~3.75/min at average recharge (original ~3/min)
  /** each Toxic Barrel adds this much to the rest recharge rate (they stack; original +10%) */
  kegBonus: 0.1,
  /** feast: this many flesh chunks (count not traced in the original), +2 energy each, one every
   * 0.5 s / speed multiplier, after a crouch and before the mouth-wipe (original FeastTask) */
  fleshChunks: 10,
  fleshEnergy: 2,
  fleshChunkSec: 0.5,
  feastCrouchSec: 0.6,
  feastWipeSec: 0.8,
  /** a hangry zombie slumps and moans this long before it goes for a customer (ours: the original's
   * ZOMBIE_ATTACK_WARNING constant has no call site, but the warning lets you Rest them) */
  hungrySec: 5,
  /** each zombie rolls for a bite once every this-many seconds (original ZOMBIE_ATTACK_INTERVAL 60 s) */
  biteCheckSec: 60,
  /** the restless roll's base chance (original ATTACK_PROBABILITY_PER_MINUTE) */
  biteBaseChance: 0.019,
  /** one swing every swingSec / speed multiplier (original MAX_ATTACK_TIME 1000 ms) */
  swingSec: 1,
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
  /** how long a feast lasts at speed multiplier 3 (the scene's fallback; the real length rides on the event) */
  feastSec: 3.1,
  daydreamBaseSec: 100, // original: focus 1 ~ every 100 s
  daydreamMaxSec: 25,
  offlineCapSec: 8 * 3600,
  /**
   * burning (original): only unattended time counts. Burn time = max(burnCookMult x cook, cook + burnMinSec)
   * (3x for Fresh), so a dish can wait max(cook, 10 min) unattended; a cook or carrier on it adds burnGraceSec.
   */
  burnMinSec: 10 * 60,
  burnCookMult: 2,
  freshBurnCookMult: 3,
  burnGraceSec: 120,
  keepWarmFactor: 1.5,
  /** rating: popularity 0..1 (= 0..5 stars). 0.3 less the starting grime ≈ the original's 0.185 */
  ratingStart: 0.3,
  /** original steps: +0.005 per paid customer, -0.006 per unhappy one, -0.1 per attack */
  ratingServe: 0.005,
  ratingUnhappy: 0.006,
  ratingAttack: 0.1,
  /** star items add to the rating, up to this much (grime takes off up to the same) */
  ratingDecorMax: 0.2,
  /** a closed café's rating sags (per second; original 1.852e-8 per ms) */
  closedDriftPerSec: 1.852e-5,
  /** while away the joint runs at a quarter speed (original TIME_SCALE_FACTOR), and one catch-up moves
   * the rating at most this far either way (original MAX_RATING_INCREASE) */
  awayTimeScale: 0.25,
  awayRatingCap: 0.4,
  reanimateSec: 60 * 60, // raid KO (original went from 8 h to 1 h)
  reanimateEnergy: 20, // comes back with 20 energy (original)
  sellBack: 0.5,
  /** zombie levels: XP needed for each level (ours, quicker than the original's); every level multiplies
   * max energy by 1.03 (original ZOMBIE_LEVEL_ENERGY_MULTIPLIER) */
  zombieLevelXp: [0, 20, 50, 100, 170, 260, 380, 530, 720, 950],
  zombieLevelEnergy: 1.03,
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
  /** with all three up, another finished list tops the timer up by 24 h, never past a week away (original) */
  refillHours: 24,
  capHours: 168,
  /** bribe the reviewer: tick off one unfinished task for this much Brain Sauce (original: 2 toxin) */
  bribeSauce: 2,
};

/** Share of max energy below which a zombie may bite (original isRestless): patience (self-control) 10 → 7%,
 * patience 1 → 25%. */
export function attackThreshold(patience: number): number {
  return 0.05 + (0.2 * (11 - patience)) / 10;
}

/** The original's speed multiplier: 2 + 0.2 x Speed (2.2 … 4.0). Also sets the swing and feast rates. */
export function speedMult(speedStat: number): number {
  return 2 + 0.2 * speedStat;
}

/** Tiles per second in the joint: walking, or running (x1/0.6); zombies take 1.2x as long. */
export function tilesPerSec(speedStat: number, opts: { zombie?: boolean; run?: boolean } = {}): number {
  return (TUNING.tilesPerSpeedUnit * speedMult(speedStat)) / (opts.zombie ? TUNING.zombieSlowdown : 1) / (opts.run ? TUNING.runTimeFactor : 1);
}

/** The older walking ramp, still used by raids (raid.ts). */
export function walkSpeed(speedStat: number): number {
  return TUNING.baseWalkSpeed + speedStat * TUNING.walkSpeedPerStat;
}

/** Rest recharge multiplier from the Recharge stat (5 = 1x; teens recover fast, hardhats slowly). */
export function rechargeMult(recharge: number): number {
  return 0.4 + recharge * 0.12;
}

export const LEVEL_CAP = 40;

const XP_TABLE = [10, 30, 50, 80, 120, 270, 380, 520, 700, 950];
/** XP to the next level: a hand-made ramp to 10, then +10% a level (level 40 in about three months of check-ins). */
export function xpToNext(level: number): number {
  if (level <= XP_TABLE.length) return XP_TABLE[level - 1];
  return Math.round(950 * Math.pow(1.1, level - 10));
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
