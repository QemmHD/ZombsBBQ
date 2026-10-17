/**
 * The shop catalog (v3). Like the original, every buildable item fills exactly one tile; tables seat
 * one customer at a time with a separate chair beside them; walls and floors are bought one segment /
 * tile at a time; star items speed up the rating instead of setting it. Prices follow the original's
 * ladder (see docs/08-original-deep-dive.md); names and art are our own.
 */
import type { StationKind } from './data';

/** Facings. Most items have two (front toward screen lower-left 'sw' or lower-right 'se'); chairs have four. */
export type Dir = 'se' | 'sw' | 'ne' | 'nw';
/** Unit step in the direction an item faces (a chair faces its table; a stove's cook stands there). */
export const DIR_STEP: Record<Dir, { x: number; y: number }> = {
  se: { x: 1, y: 0 },
  nw: { x: -1, y: 0 },
  sw: { x: 0, y: 1 },
  ne: { x: 0, y: -1 },
};
export const DIR4: Dir[] = ['sw', 'se', 'ne', 'nw'];
export const DIR2: Dir[] = ['sw', 'se'];

export type StoreTab = 'featured' | 'decor' | 'kitchen' | 'furniture' | 'walls' | 'special';
export type ItemKind =
  | 'stove'
  | 'counter'
  | 'sink'
  | 'fridge'
  | 'table'
  | 'chair'
  | 'divider'
  | 'decor'
  | 'moneymaker'
  | 'keg'
  | 'pethouse'
  | 'tombstone'
  | 'wall';

export interface ItemDef {
  id: string;
  name: string;
  tab: StoreTab;
  kind: ItemKind;
  level: number;
  cash?: number;
  sauce?: number;
  /** star bonus: the rating rises faster and falls slower (original "RatingBonus"); negative for grime */
  rating: number;
  /** XP for buying it */
  xp: number;
  /** art key (floor items are drawn facing sw and mirrored for se; chairs add _ne art) */
  art: string;
  facing: 'none' | 'two' | 'four';
  /** placed outside on the front lawn (tombstones, pet houses) */
  outdoor?: boolean;
  station?: StationKind;
  /** stoves: cook-speed multiplier */
  speed?: number;
  /** money-makers: cash per hour, up to a maximum (original) */
  payout?: { perHour: number; max: number };
  pet?: 'pug' | 'rotweiler';
  /** tombstones: which raid boost (a 5 s glow, or the revive tombstone's instant get-up) */
  boost?: 'str' | 'hp' | 'revive';
  max?: number;
  /** only comes with the starting café (not sold) */
  starter?: boolean;
  /** the Magic Fridge: one free dish you know lands in the Fridge every day */
  dailyDish?: boolean;
  /** table sets: this chair is placed facing the table, free, in the same purchase */
  withChair?: string;
  blurb: string;
}

const I = (d: Omit<ItemDef, 'rating' | 'xp' | 'facing'> & Partial<Pick<ItemDef, 'rating' | 'xp' | 'facing'>>): ItemDef => ({
  rating: 0,
  xp: Math.max(0, Math.round((d.cash ?? 0) / 65 + (d.sauce ?? 0) * 40)),
  facing: 'two',
  ...d,
});

export const TINTS = [
  { id: 'white', name: 'White' },
  { id: 'cream', name: 'Cream' },
  { id: 'sage', name: 'Sage' },
  { id: 'slate', name: 'Slate' },
  { id: 'oxblood', name: 'Oxblood' },
  { id: 'charcoal', name: 'Charcoal' },
] as const;

export const ITEMS: ItemDef[] = [
  // ----- kitchen: stoves, counters, sinks, fridges -----
  I({ id: 'stove_dirty', name: 'Grimy Stove', tab: 'kitchen', kind: 'stove', level: 1, cash: 50, rating: -0.01, xp: 0, art: 'stove_dirty', station: 'stove', speed: 1, starter: true, blurb: 'One burner works. Mostly.' }),
  I({ id: 'stove_plain', name: 'Plain Stove', tab: 'kitchen', kind: 'stove', level: 1, cash: 500, art: 'stove_plain', station: 'stove', speed: 1, blurb: 'Cooks the house menu. Every joint needs two.' }),
  I({ id: 'stove_steel', name: 'Stainless Stove', tab: 'kitchen', kind: 'stove', level: 5, cash: 25000, rating: 0.02, art: 'stove_steel', station: 'stove', speed: 1.1, blurb: '10% faster. 100% shinier.' }),
  I({ id: 'stove_super', name: 'Souped-Up Stove', tab: 'kitchen', kind: 'stove', level: 7, sauce: 10, rating: 0.01, art: 'stove_super', station: 'stove', speed: 1.2, blurb: 'Hot-rod pipes. 20% faster.' }),
  I({ id: 'grill', name: 'Rusty BBQ Grill', tab: 'kitchen', kind: 'stove', level: 2, cash: 1200, art: 'grill', station: 'grill', speed: 1, blurb: 'Unlocks the Grill cookbook: burgers, wings, kebabs.' }),
  I({ id: 'smoker', name: 'Barrel Smoker', tab: 'kitchen', kind: 'stove', level: 4, cash: 3000, art: 'smoker', station: 'smoker', speed: 1, blurb: 'Unlocks the Smoker cookbook. Low and slow.' }),
  I({ id: 'fryer', name: 'Deep Fryer', tab: 'kitchen', kind: 'stove', level: 6, cash: 5000, art: 'fryer', station: 'fryer', speed: 1, blurb: 'Unlocks the Fryer cookbook. If it moves, fry it.' }),
  I({ id: 'counter_plain', name: 'Serving Counter', tab: 'kitchen', kind: 'counter', level: 1, cash: 500, art: 'counter_plain', blurb: 'Plate food here. Dishes stack: one counter holds them all.' }),
  I({ id: 'counter_steel', name: 'Stainless Counter', tab: 'kitchen', kind: 'counter', level: 5, cash: 15000, rating: 0.01, art: 'counter_steel', blurb: 'Same job, more sparkle.' }),
  I({ id: 'counter_bar', name: 'Bar Counter', tab: 'kitchen', kind: 'counter', level: 8, cash: 2000, rating: 0.01, art: 'counter_bar', blurb: 'Dark wood. Sticky in all the right places.' }),
  I({ id: 'sink_dirty', name: 'Grimy Sink', tab: 'kitchen', kind: 'sink', level: 1, cash: 50, rating: -0.01, xp: 0, art: 'sink_dirty', starter: true, blurb: 'Servers dump dirty plates here.' }),
  I({ id: 'sink_plain', name: 'Plain Sink', tab: 'kitchen', kind: 'sink', level: 1, cash: 500, art: 'sink_plain', blurb: 'Servers clear dirty plates to the nearest sink.' }),
  I({ id: 'sink_steel', name: 'Stainless Sink', tab: 'kitchen', kind: 'sink', level: 5, cash: 25000, rating: 0.02, art: 'sink_steel', blurb: 'Sparkling. Suspiciously so.' }),
  I({ id: 'trash_red', name: 'Red Trash Can', tab: 'kitchen', kind: 'sink', level: 1, cash: 1500, art: 'trash_red', blurb: 'Plates go in. Questions do not come out.' }),
  I({ id: 'trash_green', name: 'Wheelie Bin', tab: 'kitchen', kind: 'sink', level: 10, cash: 3000, art: 'trash_green', blurb: 'Big enough for a body. Hypothetically.' }),
  I({ id: 'fridge_dirty', name: 'Grimy Fridge', tab: 'kitchen', kind: 'fridge', level: 1, cash: 50, rating: -0.01, xp: 0, art: 'fridge_dirty', starter: true, blurb: 'Stolen food goes here. "DON\'T EAT STAFF."' }),
  I({ id: 'fridge_plain', name: 'Plain Fridge', tab: 'kitchen', kind: 'fridge', level: 1, cash: 500, art: 'fridge_plain', blurb: 'Holds raid loot and gifts.' }),
  I({ id: 'fridge_steel', name: 'Stainless Fridge', tab: 'kitchen', kind: 'fridge', level: 5, cash: 25000, rating: 0.02, art: 'fridge_steel', blurb: 'Hums a little tune.' }),
  // late-game stations: each one opens its own cookbook
  I({ id: 'witch_cauldron', name: "Witch's Cauldron", tab: 'kitchen', kind: 'stove', level: 11, cash: 8000, art: 'witch_cauldron', station: 'cauldron', speed: 1, blurb: 'Unlocks Mad Sauces: soups, stews, anything that bubbles back.' }),
  I({ id: 'kiln', name: 'Brick Pizza Kiln', tab: 'kitchen', kind: 'stove', level: 15, cash: 20000, rating: 0.01, art: 'kiln', station: 'kiln', speed: 1, blurb: 'Unlocks the Wood-Fired Rot cookbook. Pizza, the Italian way. Ish.' }),
  I({ id: 'pit_oven', name: 'Pit Oven', tab: 'kitchen', kind: 'stove', level: 21, cash: 45000, rating: 0.01, art: 'pit_oven', station: 'pit', speed: 1, blurb: 'Unlocks Feast of the Dead: whole beasts, roasted underground.' }),
  I({ id: 'tomb_smoker', name: 'Tomb Smoker', tab: 'kitchen', kind: 'stove', level: 27, cash: 120000, rating: 0.02, art: 'tomb_smoker', station: 'tomb', speed: 1, blurb: 'Unlocks the Graveyard Grill. Smoke comes out green. Do not inhale.' }),
  I({ id: 'fridge_magic', name: 'Magic Fridge', tab: 'kitchen', kind: 'fridge', level: 10, sauce: 30, rating: 0.02, art: 'fridge_magic', max: 1, dailyDish: true, blurb: 'Hums with dark magic: a free dish you know turns up in the Fridge every day.' }),
  I({ id: 'keg_toxic', name: 'Toxic Barrel', tab: 'special', kind: 'keg', level: 1, sauce: 15, art: 'keg_toxic', blurb: 'Resting zombies recover faster. Stacks!' }),
  // ----- furniture: one-seat tables + separate chairs (the original's rule) -----
  ...TINTS.map((t, i) =>
    I({ id: `table_plain_${t.id}`, name: `Plain Table (${t.name})`, tab: 'furniture', kind: 'table', level: 1 + Math.floor(i / 2), cash: 150 + Math.floor(i / 2) * 50, art: `table_plain_${t.id}`, facing: 'none', blurb: 'Seats one customer, with a chair beside it.' }),
  ),
  ...TINTS.map((t, i) =>
    I({ id: `chair_plain_${t.id}`, name: `Plain Chair (${t.name})`, tab: 'furniture', kind: 'chair', level: 1 + Math.floor(i / 2), cash: 75 + Math.floor(i / 2) * 25, art: `chair_plain_${t.id}`, facing: 'four', blurb: 'Put it next to a table, facing it.' }),
  ),
  I({ id: 'table_diner', name: 'Diner Table', tab: 'furniture', kind: 'table', level: 3, cash: 350, art: 'table_diner', facing: 'none', blurb: 'Chrome edge. Speckled top. Gum underneath.' }),
  I({ id: 'chair_diner', name: 'Diner Chair', tab: 'furniture', kind: 'chair', level: 3, cash: 150, art: 'chair_diner', facing: 'four', blurb: 'Red vinyl. Wipe-clean, thank goodness.' }),
  I({ id: 'table_wood', name: 'Rustic Table', tab: 'furniture', kind: 'table', level: 6, cash: 1000, art: 'table_wood', facing: 'none', blurb: 'Hand-hewn planks. Splinters free.' }),
  I({ id: 'chair_wood', name: 'Ladder-back Chair', tab: 'furniture', kind: 'chair', level: 6, cash: 500, art: 'chair_wood', facing: 'four', blurb: 'Country charm, undead clientele.' }),
  I({ id: 'table_barrel', name: 'Barrel Table', tab: 'furniture', kind: 'table', level: 9, cash: 1400, art: 'table_barrel', facing: 'none', blurb: 'Roadhouse classic.' }),
  I({ id: 'chair_barrel', name: 'Barrel Stool', tab: 'furniture', kind: 'chair', level: 9, cash: 600, art: 'chair_barrel', facing: 'four', blurb: 'Sit on it. Do not open it.' }),
  I({ id: 'table_coffin', name: 'Coffin Table', tab: 'furniture', kind: 'table', level: 12, sauce: 2, rating: 0.01, art: 'table_coffin', facing: 'none', blurb: 'Occupant optional.' }),
  I({ id: 'chair_bone', name: 'Bone Throne', tab: 'furniture', kind: 'chair', level: 12, sauce: 2, rating: 0.01, art: 'chair_bone', facing: 'four', blurb: 'Ergonomic, if you are a skeleton.' }),
  I({ id: 'table_set', name: 'Diner Table Set', tab: 'furniture', kind: 'table', level: 3, cash: 450, art: 'table_diner', facing: 'none', withChair: 'chair_diner', blurb: 'A diner table AND its chair, placed together. Saves you a trip.' }),
  I({ id: 'table_drum', name: 'Oil-Drum Table', tab: 'furniture', kind: 'table', level: 17, cash: 2500, art: 'table_drum', facing: 'none', blurb: 'Junkyard chic. Smells faintly of diesel.' }),
  I({ id: 'chair_tire', name: 'Tire Stool', tab: 'furniture', kind: 'chair', level: 17, cash: 1100, art: 'chair_tire', facing: 'four', blurb: 'Bald tyre, milk-crate seat. Bounces.' }),
  I({ id: 'table_butcher', name: 'Butcher Block', tab: 'furniture', kind: 'table', level: 25, cash: 6000, rating: 0.01, art: 'table_butcher', facing: 'none', blurb: 'A thousand chops deep. Do not ask about the stains.' }),
  I({ id: 'chair_cleaver', name: 'Cleaver-back Chair', tab: 'furniture', kind: 'chair', level: 25, cash: 2500, rating: 0.01, art: 'chair_cleaver', facing: 'four', blurb: 'Sit up straight. Or else.' }),
  I({ id: 'table_morgue', name: 'Morgue Slab', tab: 'furniture', kind: 'table', level: 34, sauce: 5, rating: 0.02, art: 'table_morgue', facing: 'none', blurb: 'Stainless steel, toe tag included.' }),
  I({ id: 'chair_electric', name: 'Electric Chair', tab: 'furniture', kind: 'chair', level: 34, sauce: 5, rating: 0.02, art: 'chair_electric', facing: 'four', blurb: 'The house special. Wired for flavour.' }),
  I({ id: 'divider_plain', name: 'Plain Divider', tab: 'furniture', kind: 'divider', level: 4, cash: 200, art: 'divider_plain', blurb: 'Wall off the kitchen. Nobody wants to see that.' }),
  I({ id: 'divider_brick', name: 'Brick Half-wall', tab: 'furniture', kind: 'divider', level: 7, cash: 500, art: 'divider_brick', blurb: 'Sturdy. Mostly.' }),
  I({ id: 'divider_wood', name: 'Wood Divider', tab: 'furniture', kind: 'divider', level: 9, cash: 750, art: 'divider_wood', blurb: 'Saloon-style.' }),
  // ----- floor decor -----
  I({ id: 'plant_dead', name: 'Dead Plant', tab: 'decor', kind: 'decor', level: 1, cash: 5, rating: -0.01, xp: 0, art: 'plant_dead', starter: true, blurb: 'It died of embarrassment.' }),
  I({ id: 'plant_potted', name: 'Potted Plant', tab: 'decor', kind: 'decor', level: 1, cash: 100, art: 'plant_potted', blurb: 'The only living thing in here.' }),
  I({ id: 'lamp_floor', name: 'Standing Lamp', tab: 'decor', kind: 'decor', level: 2, cash: 300, art: 'lamp_floor', blurb: 'Flickers ominously.' }),
  I({ id: 'gnome_zombie', name: 'Zombie Gnome', tab: 'decor', kind: 'decor', level: 3, cash: 600, art: 'gnome_zombie', blurb: 'Guards the brains.' }),
  I({ id: 'plant_tree', name: 'Potted Tree', tab: 'decor', kind: 'decor', level: 4, cash: 500, art: 'plant_tree', blurb: 'Mostly alive.' }),
  I({ id: 'flamingo_zombie', name: 'Zombie Flamingo', tab: 'decor', kind: 'decor', level: 4, cash: 900, art: 'flamingo_zombie', blurb: 'Pink. Ish.' }),
  I({ id: 'hay_bale', name: 'Hay Bale', tab: 'decor', kind: 'decor', level: 5, cash: 400, art: 'hay_bale', blurb: 'Something lives in it.' }),
  I({ id: 'barrel_stack', name: 'Barrel Stack', tab: 'decor', kind: 'decor', level: 5, cash: 700, art: 'barrel_stack', blurb: 'Contents: classified.' }),
  I({ id: 'tombstone_deco_1', name: 'Tombstone', tab: 'decor', kind: 'decor', level: 5, cash: 1500, rating: 0.02, art: 'tombstone_deco_1', blurb: 'Here lies Gary. Gary works here now.' }),
  I({ id: 'tombstone_deco_2', name: 'Fancy Tombstone', tab: 'decor', kind: 'decor', level: 5, sauce: 10, rating: 0.04, art: 'tombstone_deco_2', blurb: 'Star item: rating climbs faster.' }),
  I({ id: 'tombstone_deco_3', name: 'Mausoleum Gate', tab: 'decor', kind: 'decor', level: 5, sauce: 15, rating: 0.06, art: 'tombstone_deco_3', blurb: 'Star item: rating climbs much faster.' }),
  I({ id: 'cactus', name: 'Cactus', tab: 'decor', kind: 'decor', level: 6, cash: 800, art: 'cactus', blurb: 'Hug at your own risk.' }),
  I({ id: 'pumpkin_pile', name: 'Pumpkin Pile', tab: 'decor', kind: 'decor', level: 6, cash: 1200, art: 'pumpkin_pile', blurb: 'One of them blinked.' }),
  I({ id: 'skeleton_statue', name: 'Skeleton Grill-Master', tab: 'decor', kind: 'decor', level: 7, cash: 4000, rating: 0.01, art: 'skeleton_statue', blurb: 'Employee of the month, every month.' }),
  I({ id: 'coffin_upright', name: 'Peek-a-Boo Coffin', tab: 'decor', kind: 'decor', level: 8, sauce: 5, rating: 0.02, art: 'coffin_upright', blurb: 'Knock knock.' }),
  I({ id: 'aquarium', name: 'Murky Aquarium', tab: 'decor', kind: 'decor', level: 9, cash: 8000, rating: 0.01, art: 'aquarium', blurb: 'One fish. Zero pulse.' }),
  I({ id: 'cauldron', name: 'Bubbling Cauldron', tab: 'decor', kind: 'decor', level: 10, cash: 6000, rating: 0.01, art: 'cauldron', blurb: 'Soup of the day. Every day.' }),
  I({ id: 'pig_spit', name: 'Pig on a Spit', tab: 'decor', kind: 'decor', level: 18, cash: 12000, rating: 0.01, art: 'pig_spit', blurb: 'Turning slowly. Forever. It blinks sometimes.' }),
  I({ id: 'brain_jar', name: 'Brain in a Jar', tab: 'decor', kind: 'decor', level: 21, cash: 25000, rating: 0.02, art: 'brain_jar', blurb: 'Still thinking about lunch.' }),
  I({ id: 'chainsaw_stump', name: 'Chainsaw Stump', tab: 'decor', kind: 'decor', level: 24, cash: 18000, rating: 0.01, art: 'chainsaw_stump', blurb: 'Somebody was carving the roast. Somebody got carried away.' }),
  I({ id: 'trophy_spatula', name: 'Golden Spatula', tab: 'decor', kind: 'decor', level: 27, sauce: 12, rating: 0.04, art: 'trophy_spatula', blurb: 'Star item. First place, Rib-Off ’87. The other cooks were eaten.' }),
  I({ id: 'mummy_case', name: 'Mummy Case', tab: 'decor', kind: 'decor', level: 31, cash: 90000, rating: 0.04, art: 'mummy_case', blurb: 'Star item. Imported. Occupied.' }),
  I({ id: 'hog_skeleton', name: 'Hog Skeleton', tab: 'decor', kind: 'decor', level: 36, sauce: 25, rating: 0.07, art: 'hog_skeleton', blurb: 'Star item. Picked clean by the crew in four minutes flat.' }),
  I({ id: 'grill_shrine', name: 'Shrine of the Eternal Grill', tab: 'decor', kind: 'decor', level: 40, cash: 400000, rating: 0.12, art: 'grill_shrine', blurb: 'Star item. Never goes out. Nobody knows who lit it.' }),
  I({ id: 'slime_fountain', name: 'Slime Fountain', tab: 'decor', kind: 'decor', level: 19, cash: 50000, rating: 0.03, art: 'slime_fountain', blurb: 'Make a wish. Lose a hand.' }),
  // ----- wall items (hung on a wall segment) -----
  I({ id: 'window_boarded', name: 'Boarded Window', tab: 'walls', kind: 'wall', level: 1, cash: 50, xp: 1, art: 'window_boarded', starter: true, blurb: 'Keeps the living out.' }),
  I({ id: 'window_small', name: 'Small Window', tab: 'walls', kind: 'wall', level: 1, cash: 200, art: 'window_small', blurb: 'A view of the apocalypse.' }),
  I({ id: 'menu_board', name: 'Menu Chalkboard', tab: 'walls', kind: 'wall', level: 1, cash: 250, art: 'menu_board', blurb: 'Today: brains. Tomorrow: brains.' }),
  I({ id: 'poster_wanted', name: '"Wanted: Brains" Poster', tab: 'walls', kind: 'wall', level: 2, cash: 400, art: 'poster_wanted', blurb: 'Reward: more brains.' }),
  I({ id: 'clock', name: 'Cracked Clock', tab: 'walls', kind: 'wall', level: 3, cash: 1500, rating: 0.01, art: 'clock', blurb: 'Always lunchtime.' }),
  I({ id: 'license_plates', name: 'License Plates', tab: 'walls', kind: 'wall', level: 4, cash: 800, art: 'license_plates', blurb: 'From cars that stopped by. Permanently.' }),
  I({ id: 'antlers', name: 'Antlers', tab: 'walls', kind: 'wall', level: 5, cash: 1200, art: 'antlers', blurb: 'The deer lost.' }),
  I({ id: 'sign_neon', name: 'ZOMBS BBQ Neon', tab: 'walls', kind: 'wall', level: 5, cash: 20000, rating: 0.02, art: 'sign_neon', blurb: 'Star item. Buzzes like a fly.' }),
  I({ id: 'bottle_shelf', name: 'Bottle Shelf', tab: 'walls', kind: 'wall', level: 6, cash: 2500, rating: 0.01, art: 'bottle_shelf', blurb: 'Hot sauce, cold sauce, brain sauce.' }),
  I({ id: 'poster_bmovie', name: 'B-Movie Poster', tab: 'walls', kind: 'wall', level: 7, cash: 1500, art: 'poster_bmovie', blurb: '"ATTACK OF THE 50 FT ENTRÉE"' }),
  I({ id: 'wall_guitar', name: 'Wall Guitar', tab: 'walls', kind: 'wall', level: 8, cash: 1800, art: 'wall_guitar', blurb: 'Signed by a dead rock star. Literally.' }),
  I({ id: 'neon_pig', name: 'Neon Pig', tab: 'walls', kind: 'wall', level: 11, sauce: 8, rating: 0.03, art: 'neon_pig', blurb: 'Star item. Oink.' }),
  I({ id: 'skull_longhorn', name: 'Longhorn Skull', tab: 'walls', kind: 'wall', level: 14, cash: 1500, art: 'skull_longhorn', blurb: 'Yee-haw. Forever.' }),
  I({ id: 'dartboard', name: 'Dartboard', tab: 'walls', kind: 'wall', level: 15, cash: 2000, art: 'dartboard', blurb: 'Mind the eyeballs.' }),
  I({ id: 'tv_wall', name: 'Old Wall TV', tab: 'walls', kind: 'wall', level: 1, cash: 16000, rating: 0.02, art: 'tv_wall', blurb: 'Star item. All static, all day.' }),
  I({ id: 'painting_zombie', name: 'Portrait of a Zombie', tab: 'walls', kind: 'wall', level: 20, cash: 250000, rating: 0.12, art: 'painting_zombie', blurb: 'A masterpiece. The eyes follow you. Slowly.' }),
  I({ id: 'grade_card', name: 'Health Grade "F"', tab: 'walls', kind: 'wall', level: 16, cash: 3000, art: 'grade_card', blurb: 'Framed with pride.' }),
  I({ id: 'cleaver_rack', name: 'Cleaver Rack', tab: 'walls', kind: 'wall', level: 20, cash: 9000, rating: 0.01, art: 'cleaver_rack', blurb: 'One for each day of the week. Sunday’s is missing.' }),
  I({ id: 'jackalope', name: 'Zombie Jackalope', tab: 'walls', kind: 'wall', level: 26, cash: 30000, rating: 0.02, art: 'jackalope', blurb: 'Mounted. Still twitching.' }),
  I({ id: 'neon_brain', name: 'Neon Brain', tab: 'walls', kind: 'wall', level: 29, sauce: 15, rating: 0.05, art: 'neon_brain', blurb: 'Star item. It hums at the frequency of hunger.' }),
  I({ id: 'gold_record', name: 'Platinum Brisket', tab: 'walls', kind: 'wall', level: 35, cash: 150000, rating: 0.06, art: 'gold_record', blurb: 'Star item. One million briskets sold. Zero survivors.' }),
  // ----- money-makers (cash per hour up to a cap; tap to collect, like the original) -----
  I({ id: 'vending', name: 'Snack Machine', tab: 'special', kind: 'moneymaker', level: 1, cash: 2500, art: 'vending', payout: { perHour: 25, max: 250 }, blurb: 'Earns $25/hour, holds up to $250.' }),
  I({ id: 'arcade', name: 'Zombie Panic Arcade', tab: 'special', kind: 'moneymaker', level: 1, cash: 8000, art: 'arcade', payout: { perHour: 80, max: 800 }, blurb: 'Earns $80/hour, holds up to $800.' }),
  I({ id: 'atm', name: 'Haunted ATM', tab: 'special', kind: 'moneymaker', level: 1, sauce: 30, art: 'atm', payout: { perHour: 200, max: 2000 }, blurb: 'Earns $200/hour, holds up to $2,000.' }),
  I({ id: 'jukebox', name: 'Graveyard Jukebox', tab: 'special', kind: 'moneymaker', level: 5, cash: 6000, art: 'jukebox', payout: { perHour: 60, max: 600 }, blurb: 'Earns $60/hour, holds up to $600.' }),
  I({ id: 'comic_rack', name: 'Comic Rack', tab: 'special', kind: 'moneymaker', level: 6, cash: 3000, art: 'comic_rack', payout: { perHour: 30, max: 300 }, blurb: 'Earns $30/hour, holds up to $300.' }),
  I({ id: 'phonebooth', name: 'Phone Booth', tab: 'special', kind: 'moneymaker', level: 9, sauce: 20, art: 'phonebooth', payout: { perHour: 80, max: 800 }, blurb: 'Earns $80/hour, holds up to $800.' }),
  I({ id: 'slot_machine', name: 'One-Armed Bandit', tab: 'special', kind: 'moneymaker', level: 12, cash: 18000, art: 'slot_machine', payout: { perHour: 180, max: 1800 }, blurb: 'Earns $180/hour. The arm is real.' }),
  I({ id: 'pinball', name: 'Pinball', tab: 'special', kind: 'moneymaker', level: 13, sauce: 25, art: 'pinball', payout: { perHour: 100, max: 1000 }, blurb: 'Earns $100/hour, holds up to $1,000.' }),
  I({ id: 'foosball', name: 'Foosball Table', tab: 'special', kind: 'moneymaker', level: 15, cash: 10000, art: 'foosball', payout: { perHour: 100, max: 1000 }, blurb: 'Earns $100/hour, holds up to $1,000.' }),
  I({ id: 'gumball_eyes', name: 'Eyeball Gumballs', tab: 'special', kind: 'moneymaker', level: 18, cash: 24000, art: 'gumball_eyes', payout: { perHour: 250, max: 2500 }, blurb: 'Earns $250/hour. Chewy. Blinky.' }),
  I({ id: 'claw_machine', name: 'Claw Machine', tab: 'special', kind: 'moneymaker', level: 22, cash: 36000, art: 'claw_machine', payout: { perHour: 375, max: 3750 }, blurb: 'Earns $375/hour. Win a hand! (It is a real hand.)' }),
  I({ id: 'fortune_teller', name: 'Madame Rot-ini', tab: 'special', kind: 'moneymaker', level: 26, sauce: 40, art: 'fortune_teller', payout: { perHour: 400, max: 4000 }, blurb: 'Earns $400/hour. Your future: brains.' }),
  I({ id: 'photo_booth', name: 'Photo Booth', tab: 'special', kind: 'moneymaker', level: 32, cash: 72000, art: 'photo_booth', payout: { perHour: 750, max: 7500 }, blurb: 'Earns $750/hour. Say “BRAINS!”' }),
  I({ id: 'mech_bull', name: 'Mechanical Bull', tab: 'special', kind: 'moneymaker', level: 37, sauce: 60, art: 'mech_bull', payout: { perHour: 900, max: 9000 }, blurb: 'Earns $900/hour. Eight seconds. Nobody has lasted eight seconds.' }),
  // ----- outdoor: pets and raid tombstones live on the front lawn -----
  I({ id: 'pethouse_pug', name: 'Pug House', tab: 'special', kind: 'pethouse', level: 4, cash: 1000, art: 'pethouse_pug', pet: 'pug', outdoor: true, max: 1, blurb: 'Adopt a Zombie Pug. It sniffs out loose change.' }),
  I({ id: 'pethouse_kennel', name: 'Spiked Kennel', tab: 'special', kind: 'pethouse', level: 8, sauce: 10, art: 'pethouse_kennel', pet: 'rotweiler', outdoor: true, max: 1, blurb: 'Adopt a Rot-weiler. It fights in raids.' }),
  I({ id: 'tombstone_str', name: 'Strength Tombstone', tab: 'special', kind: 'tombstone', level: 5, sauce: 25, art: 'tombstone_str', outdoor: true, boost: 'str', blurb: 'Raid boost: tap it mid-raid and your horde hits twice as hard for 5 s. 5 uses a day.' }),
  I({ id: 'tombstone_hp', name: 'Health Tombstone', tab: 'special', kind: 'tombstone', level: 5, sauce: 25, art: 'tombstone_hp', outdoor: true, boost: 'hp', blurb: 'Raid boost: tap it mid-raid and your horde heals +100 over 5 s. 5 uses a day.' }),
  I({ id: 'tombstone_revive', name: 'Revival Tombstone', tab: 'special', kind: 'tombstone', level: 8, sauce: 40, art: 'tombstone_revive', outdoor: true, boost: 'revive', blurb: 'Raid boost: tap it mid-raid and every knocked-out zombie gets back up. 5 uses a day.' }),
];

/** Stove upgrades (any station): each tier cooks 10% faster and widens the burn window 15%. */
export const STOVE_TIERS = [2000, 6000, 15000, 35000, 70000];
export const STOVE_TIER_SPEED = 0.1;
export const STOVE_TIER_BURN = 0.15;

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** Wall finishes, bought per wall segment. 'dirty' is the starting grime. */
export interface FinishDef {
  id: string;
  name: string;
  level: number;
  cash: number;
  rating: number;
  art: string;
}
export const WALL_FINISHES: FinishDef[] = [
  { id: 'dirty', name: 'Grimy Plaster', level: 0, cash: 0, rating: -0.002, art: 'dirty' },
  { id: 'plaster', name: 'Fresh Plaster', level: 1, cash: 30, rating: 0, art: 'plaster' },
  { id: 'tile', name: 'Diner Tile', level: 6, cash: 250, rating: 0, art: 'tile' },
  { id: 'brick', name: 'Brick', level: 7, cash: 250, rating: 0, art: 'brick' },
  { id: 'wood', name: 'Wood Panelling', level: 12, cash: 500, rating: 0, art: 'wood' },
  { id: 'stone', name: 'Crypt Stone', level: 15, cash: 600, rating: 0, art: 'stone' },
];
/** Floor finishes, bought per tile. 'dirty' tiles come with the café; stains and loose tiles count against you. */
export const FLOOR_FINISHES: FinishDef[] = [
  { id: 'dirty', name: 'Old Tile', level: 0, cash: 0, rating: 0, art: 'dirty' },
  { id: 'stain', name: 'Stained Tile', level: 0, cash: 0, rating: -0.01, art: 'dirty' },
  { id: 'loose', name: 'Loose Tile', level: 0, cash: 0, rating: -0.01, art: 'dirty' },
  { id: 'tile', name: 'Clean Tile', level: 1, cash: 10, rating: 0, art: 'tile' },
  { id: 'checker', name: 'Checkered Tile', level: 4, cash: 40, rating: 0, art: 'checker' },
  { id: 'wood', name: 'Hardwood', level: 6, cash: 125, rating: 0, art: 'wood' },
  { id: 'stone', name: 'Flagstone', level: 13, cash: 200, rating: 0, art: 'stone' },
];
export const WALL_BY_ID: Record<string, FinishDef> = Object.fromEntries(WALL_FINISHES.map((f) => [f.id, f]));
export const FLOOR_BY_ID: Record<string, FinishDef> = Object.fromEntries(FLOOR_FINISHES.map((f) => [f.id, f]));

/** Room sizes (width along the north-east wall x depth along the north-west wall). Original ladder. */
export const START_SIZE = { w: 7, h: 6 };
export const EXPANSIONS: { w: number; h: number; level: number; cash?: number; sauce?: number }[] = [
  { w: 8, h: 7, level: 1, cash: 3500 },
  { w: 9, h: 8, level: 1, cash: 25000 },
  { w: 10, h: 9, level: 1, cash: 75000 },
  { w: 11, h: 10, level: 1, cash: 100000 },
  { w: 12, h: 11, level: 1, cash: 120000 },
  { w: 13, h: 12, level: 1, cash: 150000 },
  { w: 14, h: 13, level: 1, cash: 150000 },
  { w: 15, h: 14, level: 1, cash: 150000 },
];

export interface GoalDef {
  id: string;
  text: string;
  reward: { cash?: number; sauce?: number; xp?: number };
}
/** Story goals, shown three at a time in order (the clipboard button). Checked in progress.ts. */
export const GOALS: GoalDef[] = [
  { id: 'cook1', text: 'Cook your first dish', reward: { cash: 50, xp: 5 } },
  { id: 'serve10', text: 'Serve 10 customers', reward: { cash: 80, xp: 10 } },
  { id: 'infect1', text: 'Infect your first customer', reward: { sauce: 1, xp: 10 } },
  { id: 'clean5', text: 'Clear 5 dirty plates', reward: { cash: 100, xp: 10 } },
  { id: 'seats3', text: 'Have 3 tables with chairs', reward: { cash: 150, xp: 15 } },
  { id: 'floor1', text: 'Replace a stained floor tile', reward: { cash: 60, xp: 10 } },
  { id: 'wall1', text: 'Hang something on a wall', reward: { cash: 100, xp: 15 } },
  { id: 'level3', text: 'Reach level 3', reward: { sauce: 1 } },
  { id: 'zombies2', text: 'Have 2 zombies on the crew', reward: { cash: 200, xp: 20 } },
  { id: 'grill', text: 'Buy a BBQ Grill', reward: { cash: 300, xp: 25 } },
  { id: 'raid1', text: 'Win your first raid', reward: { cash: 200, xp: 40 } },
  { id: 'study1', text: 'Study a stolen dish from the Fridge', reward: { sauce: 2, xp: 30 } },
  { id: 'stars2', text: 'Reach a 2-star rating', reward: { cash: 300, xp: 30 } },
  { id: 'cleanfloor', text: 'Get rid of every stain and loose tile', reward: { cash: 400, xp: 40 } },
  { id: 'expand1', text: 'Expand the café', reward: { cash: 500, xp: 50 } },
  { id: 'smoker', text: 'Smoke some Pulled Pork(ish)', reward: { cash: 400, xp: 40 } },
  { id: 'zombies4', text: 'Have 4 zombies on the crew', reward: { cash: 600, xp: 50 } },
  { id: 'money1', text: 'Buy a money-maker (Special tab)', reward: { sauce: 2, xp: 40 } },
  { id: 'raid3', text: 'Win 3 raids', reward: { sauce: 3, xp: 80 } },
  { id: 'pet1', text: 'Adopt a pet', reward: { sauce: 2, xp: 60 } },
  { id: 'stars3', text: 'Reach a 3-star rating', reward: { cash: 1000, xp: 80 } },
  { id: 'rare1', text: 'Infect a rare customer', reward: { sauce: 3, xp: 80 } },
  { id: 'fryer', text: 'Fry up some Onion Rings of Fire', reward: { cash: 900, xp: 100 } },
  { id: 'zombies7', text: 'Have 7 zombies on the crew', reward: { sauce: 5, xp: 120 } },
  { id: 'stars4', text: 'Reach a 4-star rating', reward: { sauce: 6, xp: 200 } },
  { id: 'raid10', text: 'Win 10 raids', reward: { sauce: 10, xp: 300 } },
  { id: 'stars5', text: 'Reach a 5-star rating', reward: { sauce: 15, xp: 500 } },
];
