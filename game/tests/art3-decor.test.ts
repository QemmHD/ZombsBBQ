import { describe, expect, it } from 'vitest';
import type { ArtAsset } from '../src/art/types';
import { buildDecor } from '../src/art3/decor';
import { buildOutdoor } from '../src/art3/outdoor';
import { buildSpecial } from '../src/art3/special';
import { buildWallItems } from '../src/art3/wallitems';
import { OBJ_W, WALL_IMG_H, WALL_IMG_W } from '../src/art3/kit';

/** P2 contract keys (docs/09-art-v3-contract.md §3). */
const DECOR = [
  'plant_dead',
  'plant_potted',
  'plant_tree',
  'cactus',
  'tombstone_deco_1',
  'tombstone_deco_2',
  'tombstone_deco_3',
  'gnome_zombie',
  'flamingo_zombie',
  'skeleton_statue',
  'barrel_stack',
  'hay_bale',
  'pumpkin_pile',
  'coffin_upright',
  'slime_fountain',
  'lamp_floor',
  'aquarium',
  'cauldron',
  'pig_spit',
  'brain_jar',
  'chainsaw_stump',
  'trophy_spatula',
  'mummy_case',
  'hog_skeleton',
  'grill_shrine',
];
const WALL = ['sign_neon', 'clock', 'bottle_shelf', 'license_plates', 'antlers', 'dartboard', 'wall_guitar', 'poster_bmovie', 'poster_wanted', 'neon_pig', 'skull_longhorn', 'menu_board', 'tv_wall', 'painting_zombie', 'grade_card', 'cleaver_rack', 'jackalope', 'neon_brain', 'gold_record'];
const SPECIAL = ['vending', 'atm', 'jukebox', 'arcade', 'slot_machine', 'pinball', 'phonebooth', 'comic_rack', 'foosball', 'gumball_eyes', 'claw_machine', 'fortune_teller', 'photo_booth', 'mech_bull'];
const OUTDOOR = ['tombstone_str', 'tombstone_hp', 'tombstone_revive', 'pethouse_pug', 'pethouse_kennel', 'street_lamp', 'hydrant', 'mailbox', 'bus_bench', 'bus_bench_home', 'newsbox', 'street_trash', 'dead_tree', 'bush_1', 'bush_2', 'traffic_cone', 'car_wreck', 'sign_pole'];

const modules: [string, ArtAsset[], string[]][] = [
  ['decor', buildDecor(), DECOR],
  ['wallitems', buildWallItems(), WALL.flatMap((k) => [`${k}_l`, `${k}_r`])],
  ['special', buildSpecial(), SPECIAL],
  ['outdoor', buildOutdoor(), OUTDOOR],
];
const all = modules.flatMap(([, a]) => a);
const by = new Map(all.map((a) => [a.key, a]));

function checkSvg(a: ArtAsset): void {
  const { key, svg, w, h } = a;
  expect(Number.isFinite(w) && w > 0, `${key} width`).toBe(true);
  expect(Number.isFinite(h) && h > 0, `${key} height`).toBe(true);
  expect(svg.startsWith('<svg'), `${key} starts with <svg`).toBe(true);
  expect(svg.trimEnd().endsWith('</svg>'), `${key} ends with </svg>`).toBe(true);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  const vb = /viewBox="([^"]+)"/.exec(svg);
  expect(vb, `${key} has a viewBox`).not.toBeNull();
  const [x, y, vw, vh] = vb![1].split(/[\s,]+/).map(Number);
  expect([x, y]).toEqual([0, 0]);
  expect(vw).toBeCloseTo(w, 5);
  expect(vh).toBeCloseTo(h, 5);
  expect(Number(/width="([^"]+)"/.exec(svg)![1])).toBeCloseTo(w, 5);
  expect(Number(/height="([^"]+)"/.exec(svg)![1])).toBeCloseTo(h, 5);
  expect(svg).not.toMatch(/NaN|undefined|Infinity|null/);
  // balanced tags (cheap well-formedness check)
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) expect(stack.pop(), `${key} closes <${m[2]}>`).toBe(m[2]);
    else stack.push(m[2]);
  }
  expect(stack, `${key} leaves no tag open`).toEqual([]);
  // every attribute value quoted, no stray '<' inside attributes
  for (const m of svg.matchAll(/<[a-zA-Z]+((?:\s+[a-zA-Z0-9:_-]+="[^"<]*")*)\s*\/?>/g)) expect(m[0].length).toBeGreaterThan(0);
  expect(svg.replace(/<[a-zA-Z]+(?:\s+[a-zA-Z0-9:_-]+="[^"<]*")*\s*\/?>|<\/[a-zA-Z]+>/g, '').trim(), `${key} has no malformed tags`).toBe('');
  // ids unique, every reference resolved in the same document
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} unique ids`).toBe(ids.length);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids, `${key} defines #${m[1]}`).toContain(m[1]);
}

describe('art3 P2 key coverage', () => {
  it.each(modules.map(([n, a, keys]) => [n, a, keys] as [string, ArtAsset[], string[]]))('%s provides every contract key', (_n, assets, keys) => {
    const have = new Set(assets.map((a) => a.key));
    for (const k of keys) expect(have.has(k), k).toBe(true);
  });

  it('keys are unique across all P2 modules', () => {
    const keys = all.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('extra keys are only _se text variants of contract keys', () => {
    const contract = new Set(modules.flatMap(([, , k]) => k));
    for (const a of all) if (!contract.has(a.key)) expect(contract.has(a.key.replace(/_se$/, '')), a.key).toBe(true);
  });
});

describe('art3 P2 SVGs', () => {
  it.each(all.map((a) => [a.key, a] as [string, ArtAsset]))('%s is a well-formed SVG asset', (_k, a) => {
    checkSvg(a);
    for (const v of [a.ox, a.oy]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('art3 P2 frames', () => {
  it('wall items use the wall frame (anchor bottom-centre), both sides', () => {
    for (const k of WALL)
      for (const side of ['l', 'r']) {
        const a = by.get(`${k}_${side}`)!;
        expect([a.w, a.h, a.ox, a.oy], a.key).toEqual([WALL_IMG_W, WALL_IMG_H, 0.5, 1]);
      }
  });

  it('1x1 floor items are OBJ_W wide and anchored on the tile centre', () => {
    for (const a of all) {
      if (a.key.endsWith('_l') || a.key.endsWith('_r') || a.key === 'car_wreck') continue;
      expect(a.w, a.key).toBe(OBJ_W);
      expect(a.ox, a.key).toBe(0.5);
      // tile centre sits HH + OBJ_M above the bottom edge
      expect(a.h - a.oy * a.h, a.key).toBeCloseTo(34, 5);
    }
  });

  it('se text variants match their sw twin and mirror the anchor', () => {
    for (const a of all.filter((x) => x.key.endsWith('_se'))) {
      const sw = by.get(a.key.replace(/_se$/, ''))!;
      expect([a.w, a.h, a.oy], a.key).toEqual([sw.w, sw.h, sw.oy]);
      expect(a.ox).toBeCloseTo(1 - sw.ox, 6);
    }
  });

  it('car_wreck covers two tiles along i, anchored on its first tile', () => {
    const c = by.get('car_wreck')!;
    expect(c.w).toBeGreaterThanOrEqual(144);
    expect(c.ox * c.w).toBeCloseTo(52, 5);
    expect(c.h - c.oy * c.h).toBeGreaterThanOrEqual(60);
  });

  it('tall street pieces have room for their height', () => {
    expect(by.get('street_lamp')!.oy * by.get('street_lamp')!.h).toBeGreaterThanOrEqual(190);
    expect(by.get('sign_pole')!.oy * by.get('sign_pole')!.h).toBeGreaterThanOrEqual(210);
  });
});
