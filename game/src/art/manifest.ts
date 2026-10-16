/**
 * Every sprite key the finished game needs, grouped by the module that must provide it.
 * tests/art-manifest.test.ts fails if any key is missing, so art and code can't drift apart.
 *
 * Directional keys: `<prefix>_<dir>` where dir is the way the sitter/object FACES:
 *   se = toward +x (screen down-right)   nw = toward -x (screen up-left)
 *   sw = toward +y (screen down-left)    ne = toward -y (screen up-right)
 * Wall hangings: `<key>_l` (on the back-left wall, face runs top-right → bottom-left) and `<key>_r`.
 */

export const DIRS = ['se', 'sw', 'ne', 'nw'] as const;
export type Dir = (typeof DIRS)[number];

// ---------- characters (src/art/chars.ts → buildChar) ----------
export const CUSTOMER_IDS = [
  'accountant',
  'yoga',
  'teen',
  'politician',
  'construction',
  'nurse',
  'cop',
  'ceo',
  'trafficcop',
  'benchwarmer',
  'lumberjack',
  'cheerleader',
  'critic',
  'boxer',
  'grandma',
  'moviestar',
  'sumo',
  'influencer',
  'celebrity',
  'champ',
] as const;
export type CustomerArtId = (typeof CUSTOMER_IDS)[number];

/** All biped ids buildChar must support: humans, their `_z` zombie forms, the player and Gus. */
export const JOINT_CHAR_IDS: string[] = [...CUSTOMER_IDS, ...CUSTOMER_IDS.map((c) => `${c}_z`), 'you', 'gus'];

/** Faces each joint character must provide. */
export const HUMAN_FACES = ['scream', 'happy', 'shock'] as const;
export const ZOMBIE_FACES = ['chomp', 'sleep', 'dazed'] as const;

// ---------- raid characters (src/art/raidchars.ts → buildRaidChar) ----------
export const RIVAL_IDS = ['chuck', 'hank', 'vera', 'crunch', 'snob'] as const;
export type RivalId = (typeof RIVAL_IDS)[number];
export const RAID_CHAR_IDS: string[] = [
  ...RIVAL_IDS.map((r) => `boss_${r}`), // head chefs (raid bosses), bipeds ~92 tall
  ...RIVAL_IDS.map((r) => `staff_${r}`), // rival waiters, bipeds ~78 tall
  'bigfoot', // "Big Foot-Long" summon: giant hot-dog sasquatch zombie, biped ~130 tall
  'werewoof', // werewolf zombie pet that fights in raids, biped ~84 tall
  'guard_dog', // rival guard dog, quad
  'pet_pug', // Zombie Pug pet, quad
  'pet_rotweiler', // Rot-weiler pet, quad
];

// ---------- joint props (src/art/props.ts → buildProps) ----------
export const THEMES = ['shack', 'roadhouse', 'diner', 'graveyard'] as const;
export type ThemeId = (typeof THEMES)[number];

const dirKeys = (prefix: string) => DIRS.map((d) => `${prefix}_${d}`);
const wallKeys = (k: string) => [`${k}_l`, `${k}_r`];

export const WALL_HANGINGS = [
  'wall_bottles',
  'wall_license',
  'wall_antlers',
  'wall_clock',
  'wall_guitar',
  'wall_dartboard',
  'wall_poster',
  'wall_neon_pig',
  'wall_skull',
  'wall_specials',
] as const;

export const PROP_KEYS: string[] = [
  // existing
  'floor_a',
  'floor_b',
  'grass',
  'sidewalk',
  'road',
  'road_line',
  'wall_l',
  'wall_r',
  'wall_r_door',
  'wall_l_window',
  'wall_l_sign',
  'wall_r_menu',
  'table',
  'bench_l',
  'bench_r',
  'counter',
  'grill',
  'grill_fire',
  'smoker',
  'fridge',
  'plant',
  'barrel_keg',
  'tombstone',
  'neon_post',
  'tree',
  // themes: floors + walls (shack uses the existing keys above)
  ...THEMES.filter((t) => t !== 'shack').flatMap((t) => [`floor_${t}_a`, `floor_${t}_b`, `wall_l_${t}`, `wall_r_${t}`, `wall_r_door_${t}`]),
  // furniture (tables seat on all 4 sides unless noted; chairs in 4 facing directions)
  'table_diner',
  ...dirKeys('chair_diner'),
  'table_barrel',
  ...dirKeys('chair_wood'),
  'table_coffin',
  ...dirKeys('chair_bone'),
  // kitchen
  'fryer',
  'fryer_bubbles',
  'counter_chrome',
  'keep_warm', // heat lamp that sits on a stove when upgraded
  // floor decor
  'cactus',
  'hay_bale',
  'lamp_post',
  'gnome_zombie',
  'flamingo_zombie',
  'skeleton_statue',
  'pumpkin_pile',
  'coffin_upright',
  'slime_fountain',
  'barrel_stack',
  // wall hangings
  ...WALL_HANGINGS.flatMap(wallKeys),
  // special
  'atm',
  'vending',
  'jukebox',
  'arcade',
  'pethouse_pug',
  'pethouse_kennel',
  // dishes (plates, 32x24, anchor at plate center)
  'dish_hotdog',
  'dish_burger',
  'dish_wings',
  'dish_ribs',
  'dish_pork',
  'dish_brisket',
  'dish_snack',
  'dish_burnt',
  'dish_rings',
  'dish_nuggets',
  'dish_chili',
  'dish_smash',
  'dish_salad',
  'dish_chicken',
  'dish_foie',
  // fx
  'fx_coin',
  'fx_happy',
  'fx_angry',
  'fx_zzz',
  'fx_brain_thought',
  'fx_alert',
  'fx_sweat',
  'fx_drool',
  'fx_hangry',
  'fx_smoke',
  'fx_spark',
  'fx_cashbag',
  'fx_goo_splat',
  'fx_heart',
  'fx_lock',
];

// ---------- raid props (src/art/raidprops.ts → buildRaidProps) ----------
export const RAID_PROP_KEYS: string[] = [
  ...RIVAL_IDS.flatMap((r) => [`raid_floor_${r}_a`, `raid_floor_${r}_b`, `raid_wall_l_${r}`, `raid_wall_r_${r}`, `raid_sign_${r}`]),
  'fence_l', // spiked wooden fence along a front-left edge of a tile
  'fence_r',
  'gate_r', // fence gate (front-right edge), with padlock
  'bug_zapper', // defense turret, 1x1
  'zapper_bolt', // purple lightning bolt sprite (vertical, stretched at runtime)
  'chuck_wagon', // covered wagon decor 1x1 (big, overhangs)
  'fx_hit', // POW burst
  'fx_ko', // dizzy stars ring
  'fx_heal', // green plus
  'fx_flag', // white truce flag
  'fx_recipe', // recipe card
  'fx_grave_green', // grave marker icons (raid items)
  'fx_grave_red',
  'fx_headstone',
  'fx_summon',
];

// ---------- UI icons (src/art/ui.ts → buildUiIcons), 64x64, anchor 0.5 ----------
export const UI_KEYS: string[] = [
  'ui_shop',
  'ui_menu',
  'ui_crew',
  'ui_raid',
  'ui_goals',
  'ui_pets',
  'ui_zombiepedia',
  'ui_storage',
  'ui_edit',
  'ui_fridge',
  'ui_settings',
  'ui_cash',
  'ui_sauce',
  'ui_xp',
  'ui_star',
  'ui_tab_featured',
  'ui_tab_decor',
  'ui_tab_kitchen',
  'ui_tab_furniture',
  'ui_tab_walls',
  'ui_tab_special',
  'ui_tab_storage',
  'ui_rotate',
  'ui_move',
  'ui_sell',
  'ui_check',
  'ui_cancel',
  'ui_expand',
  'ui_sound_on',
  'ui_sound_off',
  'ui_open',
  'ui_closed',
];

/** The raid map background (1600x900, anchor 0,0) and building icons placed on it (~160x140, anchor 0.5,1). */
export const MAP_KEYS: string[] = ['map_bg', ...RIVAL_IDS.map((r) => `map_joint_${r}`), 'map_home'];
