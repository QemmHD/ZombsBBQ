/**
 * The lot every café sits on (yours and the rivals'): a corner at a crossroads. Sidewalks and two-lane
 * roads run behind BOTH back walls (north-east and north-west), grass and street junk beyond, and the
 * room opens toward the camera onto the front lawn. Shared by the café scene and the raid scene.
 */
import Phaser from 'phaser';
import { HW, TILE_H, TILE_W, WALL_H } from '../art3/kit';
import { DISH_BY_ID, DOOR_X, ITEM_BY_ID, dishAvailable, isInside, isRoad, isSidewalk, isoToWorld, key, type Dir, type GameState } from '../sim';
import { TEX_S, hasProp, propMeta, texScale } from './assets';

export const iso = (x: number, y: number) => isoToWorld(x, y, TILE_W, TILE_H);

/**
 * Draw order. Everything in the room and on the lawn sorts by tile diagonal (x + y). Anything behind
 * the back walls (the sidewalks, the roads and whoever is out there) sits in its own band beneath
 * the walls, so the walls hide it the way a real building would.
 */
export const GROUND = -1e6;
export const BEHIND = -6e5;
export const WALLS = -5e5;
export const depthOf = (x: number, y: number) => (x + y) * 10;
export const behindWalls = (x: number, y: number) => y < -0.3 || x < -0.3;
export const moverDepth = (x: number, y: number, add: number) => (behindWalls(x, y) ? BEHIND : 0) + depthOf(x, y) + add;

/** Deterministic per-tile noise for ground variation and scenery. */
export const h = (x: number, y: number, k: number) => Math.abs((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) % 1000;

/** The art for a worker: YOU wears the chosen chef avatar (`chef_*`, else the default look), zombies their type's zombie form. */
export const charIdFor = (w: { kind: string; type: string }) => (w.kind === 'you' ? (w.type.startsWith('chef_') ? w.type : 'you') : `${w.type}_z`);

/** Art for a placed item: sw drawings mirror for se; chairs have ne drawings (+ a backrest overlay). */
export function furnArt(item: string, dir?: Dir): { key: string; flip: boolean; back?: string } {
  const def = ITEM_BY_ID[item];
  if (!def) return { key: 'plant_dead', flip: false };
  const base = def.art;
  if (def.kind === 'chair') {
    const d = dir ?? 'sw';
    if (d === 'sw' || d === 'se') return { key: `${base}_sw`, flip: d === 'se' };
    return { key: `${base}_ne`, flip: d === 'nw', back: `${base}_ne_back` };
  }
  if (dir === 'se') return hasProp(`${base}_se`) ? { key: `${base}_se`, flip: false } : { key: base, flip: true };
  return { key: base, flip: false };
}

export function wallKey(s: GameState, side: 'l' | 'r', i: number): string {
  const f = s.walls[side][i] ?? 'dirty';
  return f === 'dirty' ? `wall_${side}_dirty_${1 + (h(side === 'l' ? 0 : i, side === 'l' ? i : 0, 6 + (side === 'l' ? 1 : 0)) % 4)}` : `wall_${side}_${f}`;
}

export function floorKeys(s: GameState, x: number, y: number): string[] {
  const f = s.floors[key(x, y)] ?? 'dirty';
  const ab = (x + y) % 2 ? 'a' : 'b';
  // the dirty tile comes in four chip patterns, picked from the tile's world position
  const v = h(x, y, 11) % 4;
  const dirty = `floor_dirty_${ab}${v ? v + 1 : ''}`;
  if (f === 'stain') return [dirty, `stain_${1 + (h(x, y, 4) % 4)}`];
  if (f === 'loose') return [dirty, `floorcrack_${1 + (h(x, y, 4) % 2)}`];
  if (f === 'dirty') {
    // and the odd bit of extra muck: a smear or some crumbs
    const g = h(x, y, 12) % 9;
    return g === 0 ? [dirty, 'floor_grime_smear'] : g === 1 ? [dirty, 'floor_grime_crumbs'] : [dirty];
  }
  return [`floor_${f}_${ab}`];
}

/** Where a wall-segment image (and anything hung on it) is anchored: bottom centre of the segment. */
export function wallAnchor(side: 'l' | 'r', i: number) {
  const c = side === 'l' ? iso(0, i) : iso(i, 0);
  return { x: c.x + (side === 'l' ? -HW / 2 : HW / 2), y: c.y };
}

/**
 * Each rival's lot gets a few props in its theme on the front lawn: [key, along, out, side], where
 * side 'r' is the lawn off the right-hand (north-east) end of the room at (w + out, along) and 'l'
 * the lawn in front of the left-hand wall at (along, h + out). Kept clear of the HUD gutters.
 */
const RIVAL_STREET: Record<string, [string, number, number, 'l' | 'r'][]> = {
  chuck: [
    ['hay_bale', 3, 1, 'r'],
    ['barrel_stack', 5, 2, 'r'],
    ['hay_bale', 2, 1, 'l'],
  ],
  snob: [
    ['plant_potted', 2, 1, 'r'],
    ['lamp_floor', 4, 1, 'r'],
    ['plant_tree', 2, 1, 'l'],
  ],
  crunch: [
    ['traffic_cone', 3, 1, 'r'],
    ['street_trash', 5, 1, 'r'],
    ['barrel_stack', 2, 1, 'l'],
  ],
  vera: [
    ['plant_tree', 3, 1, 'r'],
    ['cactus', 5, 2, 'r'],
    ['plant_potted', 2, 1, 'l'],
  ],
  hank: [
    ['tombstone_deco_1', 3, 1, 'r'],
    ['dead_tree', 5, 2, 'r'],
    ['tombstone_deco_2', 2, 1, 'l'],
  ],
};

/**
 * Street furniture and scenery around the lot, laid out relative to the room size. `rival` is the
 * rival's id when drawing their lot (or true for a generic rival), false for your own joint.
 */
export function scenery(w: number, hgt: number, rival: boolean | string = false): [string, number, number, boolean?][] {
  const themed = typeof rival === 'string' ? (RIVAL_STREET[rival] ?? []).map(([k, along, out, side]): [string, number, number] => (side === 'r' ? [k, w + out, along] : [k, along, hgt + out])) : [];
  const out: [string, number, number, boolean?][] = [
    // far sidewalk across the north-east road (your own bench advertises something else)
    ['street_lamp', 1, -4],
    [rival ? 'bus_bench' : 'bus_bench_home', DOOR_X, -4],
    ['newsbox', DOOR_X + 1, -4],
    ['street_trash', DOOR_X - 2, -4],
    ['street_lamp', w + 2, -4],
    ['hydrant', w + 4, -4],
    // far sidewalk across the north-west road
    ['street_lamp', -4, 1, true],
    ['mailbox', -4, 3, true],
    ['street_lamp', -4, hgt + 2, true],
    ['hydrant', -4, hgt + 4, true],
    // the corner and the blocks across the street
    ['traffic_cone', -2, -2],
    ['traffic_cone', -3, -2],
    ['car_wreck', -7, -6],
    ['dead_tree', -6, -8],
    ['bush_1', -5, -6],
    ['dead_tree', 2, -6],
    ['bush_2', 5, -5],
    ['bush_1', w + 1, -6],
    ['dead_tree', w + 4, -7],
    ['dead_tree', -6, 3],
    ['bush_2', -5, 6],
    ['bush_1', -6, hgt + 3],
    // the pole sign on the corner of the lot (yours only), one tile further out than before so it
    // isn't cut in half under the right-hand HUD column; and the far end of the front lawn
    ...(rival ? [] : ([['sign_pole', w + 5, 0]] as [string, number, number][])),
    ...themed,
    ['bush_2', w + 5, 3],
    ['dead_tree', w + 5, hgt + 4],
    ['bush_1', 2, hgt + 5],
    ['bush_2', -1, hgt + 6],
  ];
  return out;
}

export interface LotOpts {
  w: number;
  h: number;
  wallKey: (side: 'l' | 'r', i: number) => string;
  floorKeys: (x: number, y: number) => string[];
  wallItems: { id: string; key: string; wall: 'l' | 'r'; index: number }[];
  closed?: boolean;
  /** hang the OPEN / CLOSED board on the door (your café) */
  doorSign?: boolean;
  /** street furniture to dress the lot with */
  scenery: [string, number, number, boolean?][];
  /** extra rings of ground beyond the usual lot (for closer cameras) */
  margin?: number;
}

/** The tile range the ground covers (inclusive). */
export function lotGround(w: number, h: number, margin = 0) {
  return { x0: -9 - margin, y0: -9 - margin, x1: w + 7 + margin, y1: h + 7 + margin };
}

export interface LotViews {
  objects: Phaser.GameObjects.GameObject[];
  walls: Map<string, Phaser.GameObjects.Image>;
  door?: FrontDoor;
  doorSign?: Phaser.GameObjects.Image;
}

/** The wall and floor textures a lot needs (they're rasterized as the layout asks, not all up front). */
export function surfaceKeys(o: Pick<LotOpts, 'w' | 'h' | 'wallKey' | 'floorKeys'>): Set<string> {
  const out = new Set<string>();
  for (let x = 0; x < o.w; x++) {
    const base = o.wallKey('r', x);
    out.add(base);
    if (x === DOOR_X) out.add(`${base}_door`);
  }
  for (let y = 0; y < o.h; y++) out.add(o.wallKey('l', y));
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (isInside(x, y, { w: o.w, h: o.h }) && !isRoad(x, y) && !isSidewalk(x, y)) for (const k of o.floorKeys(x, y)) out.add(k);
  return out;
}

/** Dish icons the café can show: what it can cook, plus whatever's on the counters and in the fridge. */
export function dishIcons(s: GameState): Set<string> {
  const out = new Set<string>();
  for (const d of Object.values(DISH_BY_ID)) if (dishAvailable(s, d.id)) out.add(d.icon);
  for (const c of s.counter) if (c.dish && DISH_BY_ID[c.dish]) out.add(DISH_BY_ID[c.dish].icon);
  for (const f of s.fridge) if (DISH_BY_ID[f.dish]) out.add(DISH_BY_ID[f.dish].icon);
  return out;
}

/** A prop image at world (x, y), anchored the way its art says; `flip` mirrors sw art to se. */
export function propImage(scene: Phaser.Scene, k: string, x: number, y: number, flip = false) {
  const m = propMeta(k);
  const i = scene.add.image(x, y, scene.textures.exists(k) ? k : '__MISSING').setScale(1 / texScale(k));
  if (m) i.setOrigin(flip ? 1 - m.ox : m.ox, m.oy);
  if (flip) i.setFlipX(true);
  return i;
}

/** Draw the ground, the two back walls (with door and hangings), the scenery and the floor's edges. */
export function drawLot(scene: Phaser.Scene, o: LotOpts): LotViews {
  const out: LotViews = { objects: [], walls: new Map() };
  const W = o.w;
  const H = o.h;
  const put = (k: string, x: number, y: number, depth: number, flip = false) => {
    if (!hasProp(k)) return undefined;
    const i = propImage(scene, k, x, y, flip).setDepth(depth);
    out.objects.push(i);
    return i;
  };
  // ground: roads and sidewalks behind both back walls, the floor, grass everywhere else
  const gr = lotGround(W, H, o.margin);
  for (let y = gr.y0; y <= gr.y1; y++)
    for (let x = gr.x0; x <= gr.x1; x++) {
      const p = iso(x, y);
      const base = GROUND + depthOf(x, y) * 4;
      if (isRoad(x, y)) {
        put(`road_${1 + (h(x, y, 1) % 3)}`, p.x, p.y, base);
        if (y === -2 && x !== -2 && x !== -3) put('lane_ne', p.x, p.y, base + 1);
        if (x === -2 && y !== -2 && y !== -3) put('lane_nw', p.x, p.y, base + 1);
        const r = h(x, y, 2);
        if (r < 40) put(`oil_${1 + (r % 2)}`, p.x, p.y, base + 1);
        else if (r < 55) put('manhole', p.x, p.y, base + 1);
        else if (r < 70) put('crack_road', p.x, p.y, base + 1);
        else if (r < 80) put('puddle', p.x, p.y, base + 1);
        if (y === -2 && r % 9 === 0 && x > 0) put('drain_ne', p.x, p.y, base + 1);
        if (x === -2 && r % 9 === 0 && y > 0) put('drain_nw', p.x, p.y, base + 1);
      } else if (isSidewalk(x, y)) {
        // four slab variants, mirrored at random: about one slab in four has a crack
        put(`sidewalk_${1 + (h(x, y, 3) % 4)}`, p.x, p.y, base, h(x, y, 8) % 2 === 0);
        if (isRoad(x, y - 1)) put('kerb_ne', p.x, p.y, base + 2);
        if (isRoad(x - 1, y)) put('kerb_nw', p.x, p.y, base + 2);
        if (isRoad(x + 1, y)) put('kerb_se', p.x, p.y, base + 2);
        if (isRoad(x, y + 1)) put('kerb_sw', p.x, p.y, base + 2);
      } else if (isInside(x, y, { w: W, h: H })) {
        const [floor, decal] = o.floorKeys(x, y);
        put(floor, p.x, p.y, base);
        if (decal) put(decal, p.x, p.y, base + 1);
      } else put(`grass_${1 + (h(x, y, 5) % 6)}`, p.x, p.y, base, h(x, y, 9) % 2 === 0);
    }
  // the two back walls, one segment per tile, each with its own finish
  for (let x = 0; x < W; x++) {
    const a = wallAnchor('r', x);
    const base = o.wallKey('r', x);
    // the door section is a real opening: you can see the sidewalk (and who's coming) through it
    const key = x === DOOR_X && hasProp(`${base}_door`) ? `${base}_door` : base;
    const v = put(key, a.x, a.y, WALLS + x * 10);
    if (v) out.walls.set(`r${x}`, v);
    if (x === DOOR_X) {
      put('door_frame_r', a.x, a.y, WALLS + x * 10 + 1);
      const shut = put('door_leaf_r_closed', a.x, a.y, WALLS + x * 10 + 2);
      // swung open, the leaf stands in the room beside the doorway, so it sorts with the room
      const open = put('door_leaf_r_open', a.x, a.y, depthOf(DOOR_X, 0) + 1);
      // the OPEN / CLOSED board hangs on the door (tap the door to flip it)
      const sk = o.closed ? 'ui_closed' : 'ui_open';
      let sign: Phaser.GameObjects.Image | undefined;
      if (o.doorSign && scene.textures.exists(sk)) {
        sign = scene.add
          .image(a.x + 1, a.y - 14 - WALL_H * 0.47, sk)
          .setScale(0.4 / TEX_S)
          .setOrigin(0.5, 0.1)
          .setDepth(WALLS + 999);
        out.objects.push(sign);
      }
      out.doorSign = sign;
      if (shut && open) out.door = new FrontDoor(scene, shut, open, sign);
    }
  }
  for (let y = 0; y < H; y++) {
    const a = wallAnchor('l', y);
    const v = put(o.wallKey('l', y), a.x, a.y, WALLS + y * 10);
    if (v) out.walls.set(`l${y}`, v);
  }
  for (const w of o.wallItems) {
    const a = wallAnchor(w.wall, w.index);
    const v = put(w.key, a.x, a.y, WALLS + w.index * 10 + 2);
    if (v) out.walls.set(w.id, v);
  }
  // street furniture and scenery
  for (const [k, x, y, flip] of o.scenery) {
    const p = iso(x, y);
    // things with lettering ship a readable se copy; plain ones just mirror
    const se = flip && hasProp(`${k}_se`);
    put(se ? `${k}_se` : k, p.x, p.y, (behindWalls(x, y) ? BEHIND : 0) + depthOf(x, y) + 2, !!flip && !se);
  }
  // the slab the café stands on: a dark concrete lip along the two open (front) edges of the floor
  const lip = scene.add.graphics().setDepth(GROUND + depthOf(W, H) * 4 + 5);
  const A = iso(W - 0.5, -0.5);
  const B = iso(W - 0.5, H - 0.5);
  const C = iso(-0.5, H - 0.5);
  const T = 5;
  lip.fillStyle(0x6f6a5c, 1).fillPoints([new Phaser.Math.Vector2(A.x, A.y), new Phaser.Math.Vector2(B.x, B.y), new Phaser.Math.Vector2(B.x, B.y + T), new Phaser.Math.Vector2(A.x, A.y + T)], true);
  lip.fillStyle(0x58544a, 1).fillPoints([new Phaser.Math.Vector2(B.x, B.y), new Phaser.Math.Vector2(C.x, C.y), new Phaser.Math.Vector2(C.x, C.y + T), new Phaser.Math.Vector2(B.x, B.y + T)], true);
  lip
    .lineStyle(1, 0x16120c, 0.9)
    .beginPath()
    .moveTo(A.x, A.y + T)
    .lineTo(B.x, B.y + T)
    .lineTo(C.x, C.y + T)
    .strokePath();
  lip.lineStyle(1, 0x16120c, 0.6).beginPath().moveTo(A.x, A.y).lineTo(B.x, B.y).lineTo(C.x, C.y).strokePath();
  out.objects.push(lip);
  // contact shadow where the floor meets the back walls
  const ao = scene.add.graphics().setDepth(GROUND + 9e4 - 1);
  const P0 = iso(-0.5, H - 0.5);
  const P1 = iso(-0.5, -0.5);
  const P2 = iso(W - 0.5, -0.5);
  for (let k = 0; k < 4; k++) {
    ao.lineStyle(4 - k, 0x16120c, 0.07 + k * 0.03);
    ao.beginPath()
      .moveTo(P0.x + (4 - k) * 0.8, P0.y + (4 - k) * 0.5)
      .lineTo(P1.x, P1.y + (4 - k) * 1.0)
      .lineTo(P2.x - (4 - k) * 0.8, P2.y + (4 - k) * 0.5)
      .strokePath();
  }
  out.objects.push(ao);
  return out;
}

/** Is someone standing in (or right outside) the doorway? */
export const nearDoor = (m: { x: number; y: number }) => Math.abs(m.x - DOOR_X) < 0.75 && m.y > -1.35 && m.y < 0.85;

/**
 * The front door: shut in its frame with the OPEN / CLOSED board on it, it swings open into the room
 * whenever someone comes through (from either side) and falls shut again behind them.
 */
export class FrontDoor {
  private isOpen = false;
  private hold = 0;
  constructor(
    private scene: Phaser.Scene,
    private shut: Phaser.GameObjects.Image,
    private open: Phaser.GameObjects.Image,
    private sign?: Phaser.GameObjects.Image,
  ) {
    open.setAlpha(0);
  }

  /** Call every frame with everyone who might be walking through (or whether anyone is in the doorway). */
  update(dt: number, t: number, movers: { x: number; y: number }[] | boolean, closed: boolean) {
    const near = typeof movers === 'boolean' ? movers : movers.some(nearDoor);
    this.hold = near ? 0.5 : Math.max(0, this.hold - dt);
    const want = near || this.hold > 0;
    if (want !== this.isOpen) {
      this.isOpen = want;
      this.scene.tweens.killTweensOf([this.shut, this.open]);
      this.scene.tweens.add({ targets: this.shut, alpha: want ? 0 : 1, duration: want ? 110 : 160 });
      this.scene.tweens.add({ targets: this.open, alpha: want ? 1 : 0, duration: want ? 110 : 160 });
      if (this.sign) this.scene.tweens.add({ targets: this.sign, alpha: want ? 0 : 1, duration: 100 });
    }
    // the board sways on its nail
    this.sign?.setRotation(Math.sin(t * 2.2) * (closed ? 0.07 : 0.03));
  }

  setSign(key: string) {
    if (this.sign && this.sign.texture.key !== key && this.scene.textures.exists(key)) this.sign.setTexture(key);
  }
}
