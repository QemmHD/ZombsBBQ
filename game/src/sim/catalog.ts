import type { StationKind } from './data';

export type Dir = 'se' | 'sw' | 'ne' | 'nw';
/** Unit step in the direction a seat faces (toward its table). */
export const DIR_STEP: Record<Dir, { x: number; y: number }> = {
  se: { x: 1, y: 0 },
  nw: { x: -1, y: 0 },
  sw: { x: 0, y: 1 },
  ne: { x: 0, y: -1 },
};
export const DIR_ORDER: Dir[] = ['se', 'sw', 'nw', 'ne'];

export type StoreTab = 'featured' | 'decor' | 'kitchen' | 'furniture' | 'walls' | 'special';
export type ItemKind = 'table' | 'seat' | 'counter' | 'stove' | 'fridge' | 'decor' | 'wall' | 'moneymaker' | 'keg' | 'pethouse';

export interface ItemDef {
  id: string;
  name: string;
  tab: StoreTab;
  kind: ItemKind;
  level: number;
  cash?: number;
  sauce?: number;
  decor: number;
  /** art key; seats use `${art}_${dir}`; wall hangings use `${art}_l` / `${art}_r` */
  art: string;
  /** seats: which facing directions exist */
  dirs?: Dir[];
  /** tables: which sides take seats (default all four) */
  seatSides?: Dir[];
  station?: StationKind;
  payout?: { cash: number; everySec: number };
  pet?: 'pug' | 'rotweiler';
  max?: number;
  blurb: string;
}

const ALL: Dir[] = ['se', 'sw', 'ne', 'nw'];

export const ITEMS: ItemDef[] = [
  // ----- furniture -----
  { id: 'table_picnic', name: 'Picnic Table', tab: 'furniture', kind: 'table', level: 1, cash: 60, decor: 3, art: 'table', seatSides: ['se', 'nw'], blurb: 'Seats two on benches. Splinters free.' },
  { id: 'bench', name: 'Picnic Bench', tab: 'furniture', kind: 'seat', level: 1, cash: 25, decor: 1, art: 'bench', dirs: ['se', 'nw'], blurb: 'Goes on the long side of a picnic table.' },
  { id: 'chair_wood', name: 'Wooden Chair', tab: 'furniture', kind: 'seat', level: 2, cash: 40, decor: 2, art: 'chair_wood', dirs: ALL, blurb: 'Rotate it to face a table.' },
  { id: 'table_diner', name: 'Chrome Diner Table', tab: 'furniture', kind: 'table', level: 3, cash: 150, decor: 5, art: 'table_diner', blurb: 'Seats four. Shiny enough to see your rot.' },
  { id: 'chair_diner', name: 'Diner Chair', tab: 'furniture', kind: 'seat', level: 3, cash: 60, decor: 2, art: 'chair_diner', dirs: ALL, blurb: 'Red vinyl. Wipe-clean, thank goodness.' },
  { id: 'table_barrel', name: 'Barrel Table', tab: 'furniture', kind: 'table', level: 5, cash: 220, decor: 6, art: 'table_barrel', blurb: 'Roadhouse classic. Seats four.' },
  { id: 'table_coffin', name: 'Coffin Table', tab: 'furniture', kind: 'table', level: 8, cash: 500, decor: 9, art: 'table_coffin', blurb: 'Seats four. Occupant optional.' },
  { id: 'chair_bone', name: 'Bone Chair', tab: 'furniture', kind: 'seat', level: 8, cash: 180, decor: 4, art: 'chair_bone', dirs: ALL, blurb: 'Ergonomic, if you are a skeleton.' },
  // ----- kitchen -----
  { id: 'grill', name: 'Rusty Grill', tab: 'kitchen', kind: 'stove', level: 1, cash: 150, decor: 1, art: 'grill', station: 'grill', blurb: 'Hot dogs, burgers, wings.' },
  { id: 'smoker', name: 'Barrel Smoker', tab: 'kitchen', kind: 'stove', level: 4, cash: 600, decor: 2, art: 'smoker', station: 'smoker', blurb: 'Low and slow. Big money.' },
  { id: 'fryer', name: 'Deep Fryer', tab: 'kitchen', kind: 'stove', level: 6, cash: 900, decor: 2, art: 'fryer', station: 'fryer', blurb: 'If it moves, fry it.' },
  { id: 'counter', name: 'Serving Counter', tab: 'kitchen', kind: 'counter', level: 1, cash: 80, decor: 1, art: 'counter', blurb: 'Holds one stack of dishes.' },
  { id: 'counter_chrome', name: 'Chrome Counter', tab: 'kitchen', kind: 'counter', level: 5, cash: 250, decor: 3, art: 'counter_chrome', blurb: 'Same job, more sparkle.' },
  { id: 'fridge', name: 'The Fridge', tab: 'kitchen', kind: 'fridge', level: 1, cash: 200, decor: 2, art: 'fridge', max: 1, blurb: 'Stolen dishes go here.' },
  // ----- floor decor -----
  { id: 'plant', name: 'Potted Plant', tab: 'decor', kind: 'decor', level: 1, cash: 40, decor: 4, art: 'plant', blurb: 'The only living thing in here.' },
  { id: 'tombstone', name: 'Tombstone', tab: 'decor', kind: 'decor', level: 2, cash: 60, decor: 4, art: 'tombstone', blurb: 'Here lies Gary. Gary works here now.' },
  { id: 'cactus', name: 'Cactus', tab: 'decor', kind: 'decor', level: 2, cash: 70, decor: 5, art: 'cactus', blurb: 'Hug at your own risk.' },
  { id: 'flamingo_zombie', name: 'Zombie Flamingo', tab: 'decor', kind: 'decor', level: 3, cash: 120, decor: 6, art: 'flamingo_zombie', blurb: 'Pink, plastic, peckish.' },
  { id: 'hay_bale', name: 'Hay Bale', tab: 'decor', kind: 'decor', level: 3, cash: 90, decor: 5, art: 'hay_bale', blurb: 'Roadhouse vibes. Itchy.' },
  { id: 'barrel_stack', name: 'Barrel Stack', tab: 'decor', kind: 'decor', level: 4, cash: 110, decor: 6, art: 'barrel_stack', blurb: 'Contents: sauce. Probably.' },
  { id: 'lamp_post', name: 'Lamp Post', tab: 'decor', kind: 'decor', level: 4, cash: 150, decor: 7, art: 'lamp_post', blurb: 'Moody lighting for moody customers.' },
  { id: 'gnome_zombie', name: 'Zombie Gnome', tab: 'decor', kind: 'decor', level: 5, cash: 200, decor: 8, art: 'gnome_zombie', blurb: 'Guards the garden. Eats the garden.' },
  { id: 'pumpkin_pile', name: 'Pumpkin Pile', tab: 'decor', kind: 'decor', level: 6, cash: 250, decor: 9, art: 'pumpkin_pile', blurb: 'Spooky season is every season.' },
  { id: 'skeleton_statue', name: 'Skeleton Grill-Master', tab: 'decor', kind: 'decor', level: 7, cash: 400, decor: 12, art: 'skeleton_statue', blurb: 'Employee of the Month, 1987.' },
  { id: 'coffin_upright', name: 'Peek-a-Boo Coffin', tab: 'decor', kind: 'decor', level: 8, cash: 500, decor: 14, art: 'coffin_upright', blurb: 'Someone in there is watching.' },
  { id: 'slime_fountain', name: 'Slime Fountain', tab: 'decor', kind: 'decor', level: 10, sauce: 8, decor: 20, art: 'slime_fountain', blurb: 'Make a wish. Lose a coin. Gain a rash.' },
  // ----- wall hangings -----
  { id: 'wall_bottles', name: 'Bottle Shelf', tab: 'walls', kind: 'wall', level: 1, cash: 50, decor: 3, art: 'wall_bottles', blurb: 'An old-school classic. Rating without the floor space.' },
  { id: 'wall_specials', name: 'Specials Board', tab: 'walls', kind: 'wall', level: 2, cash: 90, decor: 4, art: 'wall_specials', blurb: "Today's special: brains." },
  { id: 'wall_license', name: 'License Plates', tab: 'walls', kind: 'wall', level: 2, cash: 80, decor: 4, art: 'wall_license', blurb: 'From all 50 states of decay.' },
  { id: 'wall_clock', name: 'Bone Clock', tab: 'walls', kind: 'wall', level: 2, cash: 100, decor: 4, art: 'wall_clock', blurb: 'Always says dinner time.' },
  { id: 'wall_antlers', name: 'Antlers', tab: 'walls', kind: 'wall', level: 3, cash: 120, decor: 5, art: 'wall_antlers', blurb: 'The deer took it personally.' },
  { id: 'wall_dartboard', name: 'Dartboard', tab: 'walls', kind: 'wall', level: 3, cash: 150, decor: 5, art: 'wall_dartboard', blurb: 'Zombies have bad aim. Duck.' },
  { id: 'wall_guitar', name: 'Wall Guitar', tab: 'walls', kind: 'wall', level: 4, cash: 180, decor: 6, art: 'wall_guitar', blurb: 'Signed by a dead rock star. Literally.' },
  { id: 'wall_poster', name: 'B-Movie Poster', tab: 'walls', kind: 'wall', level: 5, cash: 220, decor: 7, art: 'wall_poster', blurb: 'ATTACK OF THE 50 FT GRANDMA.' },
  { id: 'wall_neon_pig', name: 'Neon Pig', tab: 'walls', kind: 'wall', level: 6, cash: 400, decor: 10, art: 'wall_neon_pig', blurb: 'Buzzes. Flickers. Judges.' },
  { id: 'wall_skull', name: 'Longhorn Skull', tab: 'walls', kind: 'wall', level: 7, cash: 300, decor: 8, art: 'wall_skull', blurb: 'Texas certified.' },
  // ----- special -----
  { id: 'vending', name: 'Brain-ade Machine', tab: 'special', kind: 'moneymaker', level: 3, cash: 800, decor: 3, art: 'vending', payout: { cash: 60, everySec: 1200 }, blurb: 'Pays $60 every 20 min. Tap to collect.' },
  { id: 'atm', name: 'Haunted ATM', tab: 'special', kind: 'moneymaker', level: 4, cash: 1500, decor: 3, art: 'atm', payout: { cash: 120, everySec: 1800 }, blurb: 'Pays $120 every 30 min. Fees: one soul.' },
  { id: 'barrel_keg', name: 'Brain Sauce Keg', tab: 'special', kind: 'keg', level: 5, cash: 1200, decor: 3, art: 'barrel_keg', max: 1, blurb: 'Zombies nap twice as fast. (The original Toxin Barrel.)' },
  { id: 'pethouse_pug', name: 'Pug House', tab: 'special', kind: 'pethouse', level: 5, cash: 1000, decor: 4, art: 'pethouse_pug', pet: 'pug', max: 1, blurb: 'Adopts a Zombie Pug. It sniffs out coins.' },
  { id: 'jukebox', name: 'Graveyard Jukebox', tab: 'special', kind: 'moneymaker', level: 6, cash: 2000, decor: 8, art: 'jukebox', payout: { cash: 200, everySec: 2700 }, blurb: 'Pays $200 every 45 min. Only plays Thriller.' },
  { id: 'pethouse_kennel', name: 'Spiked Kennel', tab: 'special', kind: 'pethouse', level: 7, sauce: 10, decor: 5, art: 'pethouse_kennel', pet: 'rotweiler', max: 1, blurb: 'Adopts a Rot-weiler. Fast, fierce raid buddy.' },
  { id: 'arcade', name: 'Zombie Panic Arcade', tab: 'special', kind: 'moneymaker', level: 8, cash: 3500, decor: 10, art: 'arcade', payout: { cash: 400, everySec: 3600 }, blurb: 'Pays $400 every hour. High score: BRAINS.' },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export type ThemeId = 'shack' | 'roadhouse' | 'diner' | 'graveyard';
export interface ThemeDef {
  id: ThemeId;
  name: string;
  level: number;
  cash?: number;
  sauce?: number;
  decor: number;
  blurb: string;
}
export const THEMES: ThemeDef[] = [
  { id: 'shack', name: 'Burnt Shack', level: 1, cash: 0, decor: 0, blurb: 'Where it all began. Smells like it, too.' },
  { id: 'roadhouse', name: 'Texas Roadhouse', level: 4, cash: 1500, decor: 10, blurb: 'Log walls, dark planks, lanterns.' },
  { id: 'diner', name: "50s Diner", level: 6, cash: 2500, decor: 14, blurb: 'Checkerboard floors and chrome.' },
  { id: 'graveyard', name: 'Graveyard Garden', level: 9, sauce: 15, decor: 18, blurb: 'Crypt walls, mossy stones. Cozy!' },
];
export const THEME_BY_ID: Record<string, ThemeDef> = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/** Room sizes, in tiles. The last expansions need Brain Sauce, like the original. */
export const EXPANSIONS: { size: number; level: number; cash?: number; sauce?: number }[] = [
  { size: 9, level: 3, cash: 2000 },
  { size: 10, level: 5, cash: 6000 },
  { size: 11, level: 8, cash: 15000 },
  { size: 12, level: 10, sauce: 20 },
];

export interface GoalDef {
  id: string;
  text: string;
  reward: { cash?: number; sauce?: number; xp?: number };
}
/** Story goals, shown three at a time in order (the clipboard button). Checked in progress.ts. */
export const GOALS: GoalDef[] = [
  { id: 'cook1', text: 'Cook your first dish', reward: { cash: 50, xp: 10 } },
  { id: 'serve10', text: 'Serve 10 customers', reward: { cash: 80, xp: 15 } },
  { id: 'infect1', text: 'Infect your first customer', reward: { sauce: 1, xp: 15 } },
  { id: 'buydecor', text: 'Buy something from the Shop', reward: { cash: 100, xp: 15 } },
  { id: 'zombies2', text: 'Have 2 zombies on the crew', reward: { cash: 120, xp: 20 } },
  { id: 'wall1', text: 'Hang something on a wall', reward: { cash: 100, xp: 20 } },
  { id: 'level3', text: 'Reach level 3', reward: { sauce: 1, xp: 0 } },
  { id: 'raid1', text: "Raid Chuck Wagon's Chow Hall", reward: { cash: 200, xp: 40 } },
  { id: 'study1', text: 'Study a stolen dish from the Fridge', reward: { sauce: 2, xp: 30 } },
  { id: 'stars2', text: 'Reach a 2-star rating', reward: { cash: 200, xp: 30 } },
  { id: 'expand1', text: 'Expand the joint', reward: { cash: 300, xp: 40 } },
  { id: 'smoker', text: 'Smoke some Pulled Pork(ish)', reward: { cash: 250, xp: 40 } },
  { id: 'money1', text: 'Buy a money-maker (Special tab)', reward: { sauce: 2, xp: 40 } },
  { id: 'zombies4', text: 'Have 4 zombies on the crew', reward: { cash: 400, xp: 50 } },
  { id: 'raid2', text: "Beat Big Hank's Burger Barn", reward: { sauce: 3, xp: 60 } },
  { id: 'theme1', text: 'Redecorate with a new theme', reward: { cash: 500, xp: 60 } },
  { id: 'pet1', text: 'Adopt a pet', reward: { sauce: 2, xp: 60 } },
  { id: 'stars3', text: 'Reach a 3-star rating', reward: { cash: 800, xp: 80 } },
  { id: 'rare1', text: 'Infect a rare customer', reward: { sauce: 3, xp: 80 } },
  { id: 'raid3', text: "Beat Vegan Vera's Salad Fortress", reward: { sauce: 4, xp: 100 } },
  { id: 'fryer', text: 'Fry up some Onion Rings of Fire', reward: { cash: 900, xp: 100 } },
  { id: 'zombies7', text: 'Have 7 zombies on the crew', reward: { sauce: 5, xp: 120 } },
  { id: 'raid4', text: "Beat Colonel Crunch's Chicken Shack", reward: { sauce: 5, xp: 150 } },
  { id: 'stars4', text: 'Reach a 4-star rating', reward: { sauce: 6, xp: 200 } },
  { id: 'raid5', text: 'Beat Le Snob Bistro', reward: { sauce: 10, xp: 300 } },
  { id: 'stars5', text: 'Reach a 5-star rating', reward: { sauce: 15, xp: 500 } },
];
