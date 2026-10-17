/**
 * The static art registry, built lazily: each art group (ground, room, kitchen, dishes, the raid mapâ€¦)
 * is generated the first time one of its keys is looked up, not all at boot.
 *
 * Every group names the key prefixes it draws (`keys`), so a lookup only builds the groups that could
 * hold that key. `tests/art-registry.test.ts` checks that each group's keys really match its pattern.
 * A key that matches no pattern at all (new content with a new prefix) still resolves: the non-strict
 * groups are all built as a fallback. `strict` groups (the big raid map) are only built for their own keys.
 *
 * No DOM or Phaser here, so it's unit-testable.
 */
import type { ArtAsset } from '../art/types';
import { buildGround } from '../art3/ground';
import { buildRoom } from '../art3/room';
import { buildKitchen } from '../art3/kitchen';
import { buildFurniture } from '../art3/furniture';
import { buildDecor } from '../art3/decor';
import { buildWallItems } from '../art3/wallitems';
import { buildSpecial } from '../art3/special';
import { buildOutdoor } from '../art3/outdoor';
import { buildDishes } from '../art3/dishes';
import { buildFx } from '../art3/fx';
import { buildBones } from '../art3/bones';
import { buildUi3 } from '../art3/ui3';
import { buildRaidMap3 } from '../art3/raidmap3';
import { buildLegacyIcons } from '../art3/legacyicons';

export interface ArtGroup {
  name: string;
  build: () => ArtAsset[];
  /** matches every key this group draws */
  keys: RegExp;
  /** only built when a key matches `keys` (never as part of the fallback) */
  strict?: boolean;
  /** HUD icons: looked up before the world art (same key, different drawing) */
  ui?: boolean;
  /** big flat surfaces (ground, walls, floors) rasterize at a lower scale on 3x screens */
  lowRes?: (key: string) => boolean;
}

export const ART_GROUPS: ArtGroup[] = [
  // older icons not yet redrawn: first, so any v3 drawing of the same key wins
  { name: 'legacy', build: buildLegacyIcons, keys: /^(keep_warm$|fx_)/ },
  { name: 'ground', build: buildGround, keys: /^(grass|sidewalk|road|kerb|lane|drain|manhole|oil|puddle|crack)/, lowRes: () => true },
  { name: 'room', build: buildRoom, keys: /^(wall_|door_|window_|floor_|stain_|floorcrack_|rat$|roach$)/, lowRes: (k) => !/^(rat|roach)$/.test(k) },
  { name: 'kitchen', build: buildKitchen, keys: /^(stove_|grill|smoker|fryer|witch_cauldron|kiln|pit_oven|tomb_smoker|fx_|pot_|counter_|sink_|trash_|fridge_|keg_)/ },
  { name: 'furniture', build: buildFurniture, keys: /^(table_|chair_|divider_)/ },
  { name: 'decor', build: buildDecor, keys: /^(plant_|cactus|tombstone_|gnome_|flamingo_|skeleton_|barrel_|hay_|pumpkin_|coffin_|slime_|lamp_|aquarium|cauldron|pig_spit|brain_jar|chainsaw_stump|trophy_spatula|mummy_case|hog_skeleton|grill_shrine)/ },
  { name: 'wallitems', build: buildWallItems, keys: /^(sign_|clock_|bottle_|license_|antlers_|dartboard_|wall_|poster_|neon_|skull_|menu_|tv_|painting_|grade_card_|cleaver_rack_|jackalope_|gold_record_)/ },
  { name: 'special', build: buildSpecial, keys: /^(vending|atm|jukebox|arcade|slot_|pinball|phonebooth|comic_|foosball|gumball_eyes|claw_machine|fortune_teller|photo_booth|mech_bull)/ },
  { name: 'outdoor', build: buildOutdoor, keys: /^(tombstone_|pethouse_|street_|hydrant|mailbox|bus_|newsbox|dead_|bush_|traffic_|car_|sign_)/ },
  { name: 'dishes', build: buildDishes, keys: /^(dish_|plate_)/ },
  { name: 'fx', build: buildFx, keys: /^(fx_|bubble_|face_)/ },
  { name: 'bones', build: buildBones, keys: /^bones_/ },
  { name: 'raidmap', build: buildRaidMap3, keys: /^(map_|rsign_)/, strict: true },
  { name: 'ui', build: buildUi3, keys: /^(ui_|tex_|btn_)/, ui: true },
];

function safe<T>(f: () => T, fallback: T): T {
  try {
    return f();
  } catch (e) {
    console.warn('art build failed', e);
    return fallback;
  }
}

export interface ArtEntry {
  a: ArtAsset;
  group: ArtGroup;
}

export class ArtRegistry {
  /** world art (first group to draw a key wins, in ART_GROUPS order) */
  private world = new Map<string, ArtEntry>();
  /** HUD art (ui groups), which wins over world art for DOM use */
  private ui = new Map<string, ArtEntry>();
  private built = new Set<ArtGroup>();
  private fellBack = false;
  private forgotten = new Set<string>();

  constructor(readonly groups: ArtGroup[] = ART_GROUPS) {}

  /** Names of the groups built so far (for tests and boot diagnostics). */
  builtGroups(): string[] {
    return this.groups.filter((g) => this.built.has(g)).map((g) => g.name);
  }

  private buildGroup(g: ArtGroup) {
    if (this.built.has(g)) return;
    this.built.add(g);
    const into = g.ui ? this.ui : this.world;
    const rank = this.groups.indexOf(g);
    // when two groups draw the same key, the later one in the table wins (whatever order they're built in)
    for (const a of safe(g.build, [])) {
      if (this.forgotten.has(a.key)) continue;
      const had = into.get(a.key);
      if (!had || this.groups.indexOf(had.group) <= rank) into.set(a.key, { a, group: g });
    }
  }

  /** Build whatever groups could hold this key. */
  private resolve(key: string) {
    let matched = false;
    for (const g of this.groups) {
      if (!g.keys.test(key)) continue;
      matched = true;
      this.buildGroup(g);
    }
    if (!matched && !this.fellBack) {
      // unknown prefix: build every non-strict group once
      this.fellBack = true;
      for (const g of this.groups) if (!g.strict) this.buildGroup(g);
    }
  }

  private lookup(map: Map<string, ArtEntry>, key: string): ArtEntry | undefined {
    let e = map.get(key);
    if (!e) {
      this.resolve(key);
      e = map.get(key);
    }
    return e;
  }

  /** World art for the scenes. */
  world3(key: string): ArtEntry | undefined {
    return this.lookup(this.world, key);
  }

  /** DOM art: HUD icons first, then world art. */
  any(key: string): ArtEntry | undefined {
    return this.lookup(this.ui, key) ?? this.world.get(key);
  }

  /** Every asset of the groups whose names are given (built if needed). */
  group(name: string): ArtAsset[] {
    const g = this.groups.find((x) => x.name === name);
    if (!g) return [];
    this.buildGroup(g);
    const into = g.ui ? this.ui : this.world;
    return [...into.values()].filter((e) => e.group === g).map((e) => e.a);
  }

  /** Forget a group's art (it rebuilds on the next lookup). */
  drop(name: string) {
    const g = this.groups.find((x) => x.name === name);
    if (!g || !this.built.has(g)) return;
    this.built.delete(g);
    const into = g.ui ? this.ui : this.world;
    for (const [k, e] of into) if (e.group === g) into.delete(k);
  }

  /** Forget one key's art for good (e.g. a huge SVG once it's been flattened to a JPEG). */
  forget(key: string) {
    this.forgotten.add(key);
    this.world.delete(key);
    this.ui.delete(key);
  }

  buildAll() {
    for (const g of this.groups) this.buildGroup(g);
  }
}
