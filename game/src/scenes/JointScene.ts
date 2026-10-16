import Phaser from 'phaser';
import { PROP_META, TILE_H, TILE_W, WALL_H } from '../art';
import {
  DISH_BY_ID,
  DOOR_X,
  ITEM_BY_ID,
  LOT_MIN,
  groundAt,
  isoToWorld,
  itemOf,
  lotMax,
  payoutReady,
  seatTable,
  worldToIso,
  type Customer,
  type Furniture,
  type GameEvent,
  type GameState,
  type Pet,
  type Worker,
} from '../sim';
import type { Controller } from '../game/controller';
import { sfx } from '../game/sfx';
import { TEX_S, charArt, charLoaded, hasProp, loadChar, loadProps, propMeta } from './assets';
import { Puppet } from './puppet';

export const iso = (x: number, y: number) => isoToWorld(x, y, TILE_W, TILE_H);
const depthOf = (x: number, y: number) => (x + y) * 10;
const META = PROP_META as unknown as Record<string, unknown> & {
  seatZ: number;
  tableTopZ: number;
  counterTopZ: number;
  grillTopZ: number;
  bench_l: { dx: number; dy: number };
  bench_r: { dx: number; dy: number };
  seat?: Record<string, { dx: number; dy: number }>;
  tableTop?: Record<string, number>;
  fryerTopZ?: number;
  keepWarmZ?: number;
};

export const charIdFor = (w: { kind: string; type: string }) => (w.kind === 'you' ? 'you' : `${w.type}_z`);

/** Art key for a placed piece of furniture. */
export function furnKey(item: string, dir?: string): string {
  const def = ITEM_BY_ID[item];
  if (!def) return 'plant';
  if (def.kind === 'seat') {
    if (def.art === 'bench') return dir === 'nw' ? 'bench_r' : 'bench_l';
    return `${def.art}_${dir ?? def.dirs?.[0] ?? 'se'}`;
  }
  return def.art;
}

export function themeKeys(theme: string) {
  if (theme === 'shack') return { a: 'floor_a', b: 'floor_b', l: 'wall_l', r: 'wall_r', door: 'wall_r_door' };
  return { a: `floor_${theme}_a`, b: `floor_${theme}_b`, l: `wall_l_${theme}`, r: `wall_r_${theme}`, door: `wall_r_door_${theme}` };
}

interface Actor {
  puppet: Puppet | null;
  charId: string;
  loading: boolean;
  bar?: Phaser.GameObjects.Graphics;
  barQ: number;
  tag?: Phaser.GameObjects.Text;
  carry?: Phaser.GameObjects.Image;
  bubble?: Phaser.GameObjects.Image;
  faceUntil: number;
  face?: string;
  holder: Phaser.GameObjects.Container;
}

export class JointScene extends Phaser.Scene {
  ctl!: Controller;
  ready = false;
  private actors = new Map<string, Actor>();
  private closedSign?: Phaser.GameObjects.Image;
  private staticLayer: Phaser.GameObjects.GameObject[] = [];
  private furnViews = new Map<string, Phaser.GameObjects.Image>();
  private wallViews = new Map<string, Phaser.GameObjects.Image>();
  private overlays: Phaser.GameObjects.GameObject[] = [];
  private stoveFx = new Map<string, { fire?: Phaser.GameObjects.Image; dish: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Graphics; badge: Phaser.GameObjects.Image; lamp?: Phaser.GameObjects.Image }>();
  private counterFx = new Map<string, { dish: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }>();
  private cashBags = new Map<string, Phaser.GameObjects.Image>();
  private tableDishes = new Map<string, Phaser.GameObjects.Image>();
  private grid?: Phaser.GameObjects.Graphics;
  private ghost?: Phaser.GameObjects.Image;
  private layoutSig = '';
  private userZoom = 1;
  private drag: { x: number; y: number; sx: number; sy: number; moved: boolean; placing: boolean } | null = null;
  private pinch: { d: number; z: number } | null = null;
  private t = 0;
  private smokeT = 0;
  private lastN = 0;

  constructor() {
    super('joint');
  }

  init(data: { ctl: Controller }) {
    this.ctl = data.ctl;
  }

  create() {
    this.cameras.main.setBackgroundColor('#7cb342');
    const bar = document.getElementById('boot-progress');
    void loadProps(this, (f) => bar && (bar.style.width = `${Math.round(f * 100)}%`))
      .then(() => Promise.all(['you', 'gus', ...this.ctl.state.workers.map(charIdFor)].map((id) => loadChar(this, id))))
      .then(() => {
        this.ready = true;
        document.getElementById('boot')?.classList.add('done');
        this.setupCamera(true);
        this.setupInput();
        this.ctl.onEvent((e) => this.fx(e));
        this.ctl.onMode(() => this.onModeChange());
        this.scale.on('resize', () => this.applyZoom(true));
        this.game.events.emit('joint-ready');
      });
  }

  // ---------- static world (rebuilt when the layout changes) ----------

  private sig(s: GameState): string {
    return [
      s.roomN,
      s.theme,
      s.furniture.map((f) => `${f.id}${f.x},${f.y}${f.dir ?? ''}${f.keepWarm ? 'k' : ''}`).join(';'),
      s.walls.map((w) => `${w.id}${w.wall}${w.index}`).join(';'),
    ].join('|');
  }

  private img(key: string, x: number, y: number) {
    const m = propMeta(key);
    const i = this.add.image(x, y, hasProp(key) ? key : '__MISSING').setScale(1 / TEX_S);
    if (m) i.setOrigin(m.ox, m.oy);
    return i;
  }

  private rebuild() {
    const s = this.ctl.state;
    for (const o of this.staticLayer) o.destroy();
    for (const o of this.overlays) o.destroy();
    this.staticLayer = [];
    this.overlays = [];
    this.furnViews.clear();
    this.wallViews.clear();
    this.stoveFx.clear();
    this.counterFx.clear();
    for (const b of this.cashBags.values()) b.destroy();
    this.cashBags.clear();
    for (const d of this.tableDishes.values()) d.destroy();
    this.tableDishes.clear();
    const n = s.roomN;
    const th = themeKeys(s.theme);
    // ground
    for (let y = LOT_MIN; y <= lotMax(n); y++)
      for (let x = LOT_MIN; x <= lotMax(n); x++) {
        const g = groundAt(x, y, n);
        const key = g === 'floor' ? ((x + y) % 2 === 0 ? th.a : th.b) : g;
        const p = iso(x, y);
        this.staticLayer.push(this.img(key, p.x, p.y).setDepth(-100000 + depthOf(x, y)));
      }
    // walls (shack gets its baked sign/window/menu where nothing else hangs)
    const hung = new Set(s.walls.map((w) => `${w.wall}${w.index}`));
    for (let gx = 0; gx < n; gx++) {
      const c = iso(gx, 0);
      let key = gx === DOOR_X ? th.door : th.r;
      if (s.theme === 'shack' && gx === 1 && !hung.has('r1')) key = 'wall_r_menu';
      this.staticLayer.push(this.img(key, c.x + TILE_W / 4, c.y).setDepth(depthOf(gx, 0) - 6));
    }
    for (let gy = 0; gy < n; gy++) {
      const c = iso(0, gy);
      let key = th.l;
      if (s.theme === 'shack' && gy === 1 && !hung.has('l1')) key = 'wall_l_sign';
      if (s.theme === 'shack' && gy === 5 && !hung.has('l5')) key = 'wall_l_window';
      this.staticLayer.push(this.img(key, c.x - TILE_W / 4, c.y).setDepth(depthOf(0, gy) - 6));
    }
    for (const w of s.walls) {
      const def = ITEM_BY_ID[w.item];
      const c = w.wall === 'l' ? iso(0, w.index) : iso(w.index, 0);
      const i = this.img(`${def.art}_${w.wall}`, c.x + (w.wall === 'l' ? -TILE_W / 4 : TILE_W / 4), c.y).setDepth(depthOf(w.wall === 'l' ? 0 : w.index, w.wall === 'l' ? w.index : 0) - 5);
      this.wallViews.set(w.id, i);
      this.staticLayer.push(i);
    }
    // scenery outside, placed relative to the room size
    const deco: [string, number, number][] = [
      ['tree', -2, 2],
      ['tree', -2, 6],
      ['tree', 2, n + 2],
      ['tree', n + 2, -1],
      ['tombstone', n + 2, 4],
      ['tombstone', n + 1, n + 1],
      ['neon_post', n + 1, -1],
    ];
    for (const [k, x, y] of deco) {
      const p = iso(x, y);
      this.staticLayer.push(this.img(k, p.x, p.y).setDepth(depthOf(x, y) + 2));
    }
    // furniture + overlays
    for (const f of s.furniture) {
      const p = iso(f.x, f.y);
      const i = this.img(furnKey(f.item, f.dir), p.x, p.y).setDepth(depthOf(f.x, f.y) + 1);
      this.furnViews.set(f.id, i);
      this.staticLayer.push(i);
    }
    for (const st of s.stoves) {
      const f = s.furniture.find((x) => x.id === st.furnitureId)!;
      const p = iso(f.x, f.y);
      const d = depthOf(f.x, f.y);
      const topZ = st.kind === 'fryer' ? META.fryerTopZ ?? 26 : META.grillTopZ;
      const fire = st.kind === 'grill' ? this.img('grill_fire', p.x, p.y - topZ) : st.kind === 'fryer' ? this.img('fryer_bubbles', p.x, p.y - topZ) : undefined;
      fire?.setDepth(d + 2).setVisible(false);
      const lamp = f.keepWarm ? this.img('keep_warm', p.x, p.y - (META.keepWarmZ ?? 30)).setDepth(d + 3) : undefined;
      const dish = this.img('dish_hotdog', p.x, p.y - 44).setDepth(d + 4).setVisible(false);
      const badge = this.img('fx_alert', p.x + 16, p.y - 58).setDepth(d + 5).setVisible(false);
      const ring = this.add.graphics().setDepth(d + 5);
      this.stoveFx.set(st.id, { fire, dish, ring, badge, lamp });
      this.overlays.push(...[fire, lamp, dish, badge, ring].filter((x): x is Phaser.GameObjects.Image => !!x));
    }
    for (const slot of s.counter) {
      const f = s.furniture.find((x) => x.id === slot.furnitureId)!;
      const p = iso(f.x, f.y);
      const d = depthOf(f.x, f.y);
      const dish = this.img('dish_hotdog', p.x, p.y - META.counterTopZ).setDepth(d + 2).setVisible(false);
      const text = this.add
        .text(p.x + 16, p.y - META.counterTopZ - 14, '', { fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#fff', backgroundColor: '#8e1b2e', padding: { x: 3, y: 1 } })
        .setResolution(TEX_S)
        .setOrigin(0.5)
        .setDepth(d + 3);
      this.counterFx.set(slot.id, { dish, text });
      this.overlays.push(dish, text);
    }
    if (n !== this.lastN) {
      this.lastN = n;
      this.setupCamera(true);
    }
    this.drawGrid();
  }

  // ---------- camera & input ----------

  private setupCamera(recenter: boolean) {
    const n = this.ctl.state.roomN;
    const cam = this.cameras.main;
    const tl = iso(LOT_MIN, lotMax(n));
    const br = iso(lotMax(n), LOT_MIN);
    const top = iso(LOT_MIN, LOT_MIN);
    const bottom = iso(lotMax(n), lotMax(n));
    cam.setBounds(tl.x, top.y - WALL_H, br.x - tl.x, bottom.y - top.y + WALL_H);
    this.applyZoom(recenter);
  }

  private baseZoom() {
    const dpr = window.devicePixelRatio || 1;
    const n = this.ctl.state.roomN;
    const cssW = this.scale.width / dpr;
    const cssH = this.scale.height / dpr;
    return Math.min((cssW - 2 * 76) / (n * TILE_W), (cssH - 58) / (n * TILE_H + WALL_H)) * 1.06;
  }

  private applyZoom(recenter = false) {
    const dpr = window.devicePixelRatio || 1;
    const z = this.baseZoom() * this.userZoom;
    const cam = this.cameras.main;
    const keep = recenter ? null : { x: cam.midPoint.x, y: cam.midPoint.y };
    cam.setZoom(z * dpr);
    if (keep) cam.centerOn(keep.x, keep.y);
    else {
      const n = this.ctl.state.roomN;
      const c = iso(n / 2 - 0.5, n / 2 - 0.5);
      cam.centerOn(c.x, c.y - WALL_H / 2 - 26 / z);
    }
  }

  private setupInput() {
    this.input.addPointer(1);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.ctl.mode === 'raid') return;
      const pts = this.activePointers();
      if (pts.length >= 2) {
        this.pinch = { d: Phaser.Math.Distance.Between(pts[0].x, pts[0].y, pts[1].x, pts[1].y), z: this.userZoom };
        this.drag = null;
        return;
      }
      const cam = this.cameras.main;
      // in edit mode, dragging the thing you're placing moves it instead of the camera
      const pl = this.ctl.placing;
      let placing = false;
      if (pl && !pl.wall) {
        const t = worldToIso(p.worldX, p.worldY + 10, TILE_W, TILE_H);
        placing = Math.abs(t.x - pl.x) < 1.2 && Math.abs(t.y - pl.y) < 1.2;
      }
      this.drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY, moved: false, placing };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const pts = this.activePointers();
      if (this.pinch && pts.length >= 2) {
        const d = Phaser.Math.Distance.Between(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        this.userZoom = Phaser.Math.Clamp((this.pinch.z * d) / this.pinch.d, 0.6, 2.4);
        this.applyZoom();
        return;
      }
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.x;
      const dy = p.y - this.drag.y;
      if (Math.hypot(dx, dy) > 12) this.drag.moved = true;
      if (!this.drag.moved) return;
      if (this.drag.placing) {
        const t = worldToIso(p.worldX, p.worldY + 10, TILE_W, TILE_H);
        this.ctl.movePlacement(Math.round(t.x), Math.round(t.y));
      } else {
        const cam = this.cameras.main;
        cam.setScroll(this.drag.sx - dx / cam.zoom, this.drag.sy - dy / cam.zoom);
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pinch) {
        if (this.activePointers().length < 2) this.pinch = null;
        this.drag = null;
        return;
      }
      if (this.drag && !this.drag.moved) this.ctl.mode === 'edit' ? this.editTap(p.worldX, p.worldY) : this.tap(p.worldX, p.worldY);
      this.drag = null;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.userZoom = Phaser.Math.Clamp(this.userZoom * (dy > 0 ? 0.9 : 1.1), 0.6, 2.4);
      this.applyZoom();
    });
  }

  private activePointers() {
    return [this.input.pointer1, this.input.pointer2].filter((p) => p && p.isDown);
  }

  /** Which wall slot (if any) a world point is on. */
  private wallAt(wx: number, wy: number): { wall: 'l' | 'r'; index: number } | null {
    const n = this.ctl.state.roomN;
    for (let i = 0; i < n; i++) {
      const cl = iso(0, i);
      // left wall face: bottom edge from (cl.x - W/2, cl.y) to (cl.x, cl.y - H/2), height WALL_H
      if (wx >= cl.x - TILE_W / 2 && wx <= cl.x) {
        const f = (wx - (cl.x - TILE_W / 2)) / (TILE_W / 2);
        const bottom = cl.y - f * (TILE_H / 2);
        if (wy <= bottom && wy >= bottom - WALL_H) return { wall: 'l', index: i };
      }
      const cr = iso(i, 0);
      if (wx >= cr.x && wx <= cr.x + TILE_W / 2) {
        const f = (wx - cr.x) / (TILE_W / 2);
        const bottom = cr.y - TILE_H / 2 + f * (TILE_H / 2);
        if (wy <= bottom && wy >= bottom - WALL_H) return { wall: 'r', index: i };
      }
    }
    return null;
  }

  private furnitureAt(wx: number, wy: number): Furniture | undefined {
    const s = this.ctl.state;
    for (const off of [0, 22, 44]) {
      const t = worldToIso(wx, wy + off, TILE_W, TILE_H);
      const f = s.furniture.find((x) => x.x === Math.round(t.x) && x.y === Math.round(t.y));
      if (f) return f;
    }
    return undefined;
  }

  private editTap(wx: number, wy: number) {
    const pl = this.ctl.placing;
    if (pl) {
      if (pl.wall) {
        const w = this.wallAt(wx, wy);
        if (w) this.ctl.moveWallPlacement(w.wall, w.index);
      } else {
        const t = worldToIso(wx, wy + 10, TILE_W, TILE_H);
        this.ctl.movePlacement(Math.round(t.x), Math.round(t.y));
      }
      return;
    }
    const f = this.furnitureAt(wx, wy);
    if (f) return this.ctl.selectEdit({ kind: 'furn', id: f.id });
    const w = this.wallAt(wx, wy);
    const hung = w && this.ctl.state.walls.find((x) => x.wall === w.wall && x.index === w.index);
    if (hung) return this.ctl.selectEdit({ kind: 'wall', id: hung.id });
    this.ctl.selectEdit(null);
  }

  private tap(wx: number, wy: number) {
    const s = this.ctl.state;
    if (this.ctl.selection?.kind === 'worker') {
      const f = this.furnitureAt(wx, wy);
      const st = f && s.stoves.find((x) => x.furnitureId === f.id);
      if (st) return this.ctl.tapStove(st.id);
    }
    // money-maker bags are big, friendly targets
    for (const [fid, bag] of this.cashBags) {
      if (bag.visible && Math.abs(wx - bag.x) < 18 && wy < bag.y + 6 && wy > bag.y - 30) return this.game.events.emit('collect', fid);
    }
    // characters: whoever's body is closest to the finger wins (front-most only breaks ties), so a
    // zombie half-hidden behind a customer is still easy to grab
    let best: { id: string; kind: 'w' | 'c' | 'p'; score: number } | null = null;
    const consider = (id: string, kind: 'w' | 'c' | 'p') => {
      const a = this.actors.get(id);
      if (!a?.puppet || !a.holder.visible) return;
      const lying = Math.abs(a.puppet.body.rotation) > 0.5;
      const hw = lying ? 40 : 22;
      const top = lying ? 30 : a.puppet.height + 8;
      if (Math.abs(wx - a.holder.x) < hw && wy < a.holder.y + 8 && wy > a.holder.y - top) {
        const cy = a.holder.y - (lying ? 10 : a.puppet.height * 0.45);
        const score = (wx - a.holder.x) ** 2 + ((wy - cy) * 0.7) ** 2 - a.holder.depth * 1e-6;
        if (!best || score < best.score) best = { id, kind, score };
      }
    };
    for (const w of s.workers) if (w.state !== 'raiding') consider(w.id, 'w');
    for (const c of s.customers) if (c.state !== 'leaving' && c.state !== 'fleeing' && c.state !== 'infecting') consider(c.id, 'c');
    for (const p of s.pets) consider(p.id, 'p');
    if (best) {
      const b = best as { id: string; kind: 'w' | 'c' | 'p' };
      if (b.kind === 'w') return this.ctl.tapWorker(b.id);
      if (b.kind === 'c') return this.ctl.tapCustomer(b.id);
      sfx(s.pets.find((p) => p.id === b.id)?.type === 'pug' ? 'pugSnort' : 'dogBark');
      return this.ctl.info(s.pets.find((p) => p.id === b.id)?.type === 'pug' ? 'The Zombie Pug snorts. It smells money.' : 'The Rot-weiler wags. Something falls off.');
    }
    const f = this.furnitureAt(wx, wy);
    if (f) {
      const st = s.stoves.find((x) => x.furnitureId === f.id);
      if (st) return this.ctl.tapStove(st.id);
      const k = itemOf(f).kind;
      if (k === 'counter') return this.ctl.select({ kind: 'counter', id: f.id });
      if (k === 'fridge') return this.game.events.emit('open-fridge');
      if (k === 'moneymaker' && payoutReady(s, f.id)) return this.game.events.emit('collect', f.id);
      if (k === 'moneymaker' || k === 'keg' || k === 'pethouse') return this.ctl.select({ kind: 'furniture', id: f.id });
    }
    this.ctl.tapNothing();
  }

  private onModeChange() {
    this.drawGrid();
    if (this.ctl.mode !== 'edit') this.ghost?.setVisible(false);
  }

  private drawGrid() {
    if (!this.grid) this.grid = this.add.graphics().setDepth(-50000);
    const g = this.grid;
    g.clear();
    if (this.ctl.mode !== 'edit') return;
    const n = this.ctl.state.roomN;
    g.lineStyle(1.5, 0xffffff, 0.35);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const c = iso(x, y);
        g.beginPath();
        g.moveTo(c.x, c.y - TILE_H / 2);
        g.lineTo(c.x + TILE_W / 2, c.y);
        g.lineTo(c.x, c.y + TILE_H / 2);
        g.lineTo(c.x - TILE_W / 2, c.y);
        g.closePath();
        g.strokePath();
      }
  }

  private updateEdit() {
    const pl = this.ctl.placing;
    const sel = this.ctl.editSel;
    for (const [id, v] of this.furnViews) v.setAlpha(pl?.source === 'move' && pl.id === id ? 0.25 : 1).setTint(sel?.kind === 'furn' && sel.id === id ? 0xfff2a0 : 0xffffff);
    for (const [id, v] of this.wallViews) v.setAlpha(pl?.source === 'move' && pl.id === id ? 0.25 : 1).setTint(sel?.kind === 'wall' && sel.id === id ? 0xfff2a0 : 0xffffff);
    if (!pl || this.ctl.mode !== 'edit') {
      this.ghost?.setVisible(false);
      return;
    }
    const def = ITEM_BY_ID[pl.itemId];
    let key: string;
    let x: number;
    let y: number;
    let depth: number;
    if (pl.wall) {
      key = `${def.art}_${pl.wall.wall}`;
      const c = pl.wall.wall === 'l' ? iso(0, pl.wall.index) : iso(pl.wall.index, 0);
      x = c.x + (pl.wall.wall === 'l' ? -TILE_W / 4 : TILE_W / 4);
      y = c.y;
      depth = 90000;
    } else {
      key = furnKey(pl.itemId, pl.dir);
      const c = iso(pl.x, pl.y);
      x = c.x;
      y = c.y;
      depth = 90000;
    }
    if (!this.ghost) this.ghost = this.img(key, x, y);
    const m = propMeta(key);
    this.ghost.setTexture(hasProp(key) ? key : '__MISSING').setPosition(x, y).setDepth(depth).setVisible(true);
    if (m) this.ghost.setOrigin(m.ox, m.oy);
    const ok = !this.ctl.placementProblem();
    this.ghost.setTint(ok ? 0xa8ff9c : 0xff8080).setAlpha(0.6 + Math.sin(this.t * 6) * 0.15);
  }

  // ---------- characters ----------

  private actor(id: string, charId: string): Actor | null {
    let a = this.actors.get(id);
    if (a && a.charId !== charId) {
      a.holder.destroy();
      this.actors.delete(id);
      a = undefined;
    }
    if (!a) {
      const holder = this.add.container(0, 0);
      a = { puppet: null, charId, loading: false, barQ: -1, faceUntil: 0, holder };
      this.actors.set(id, a);
    }
    if (!a.puppet) {
      const ca = charLoaded(this, charId) ? charArt(charId) : null;
      if (ca) {
        a.puppet = new Puppet(this, ca);
        a.holder.addAt(a.puppet.root, 0);
      } else if (!a.loading) {
        a.loading = true;
        void loadChar(this, charId).then(() => a && (a.loading = false));
      }
    }
    return a;
  }

  private bubble(a: Actor, key: string | null, y: number, x = 4) {
    if (!key) {
      a.bubble?.setVisible(false);
      return;
    }
    if (!a.bubble) {
      a.bubble = this.img(key, x, y);
      a.holder.add(a.bubble);
    }
    a.bubble.setTexture(key).setVisible(true).setPosition(x, y + Math.sin(this.t * 3) * 2);
  }

  private energyBar(a: Actor, f: number, y: number) {
    const q = Math.round(f * 40);
    if (!a.bar) {
      a.bar = this.add.graphics();
      a.holder.add(a.bar);
    }
    a.bar.y = y;
    if (q === a.barQ) return;
    a.barQ = q;
    const g = a.bar;
    g.clear();
    g.fillStyle(0x2b1b17, 1).fillRoundedRect(-15, 0, 30, 6, 3);
    g.fillStyle(f > 0.5 ? 0x6fcf3a : f > 0.25 ? 0xffc83d : 0xe2403a, 1).fillRoundedRect(-14, 1, Math.max(2, 28 * f), 4, 2);
  }

  private syncWorker(w: Worker, dt: number) {
    const a = this.actor(w.id, charIdFor(w));
    if (!a) return;
    const raiding = w.state === 'raiding';
    a.holder.setVisible(!raiding);
    if (raiding) return;
    const p = iso(w.x, w.y);
    a.holder.setPosition(p.x, p.y).setDepth(depthOf(w.x, w.y) + 5);
    const pup = a.puppet;
    if (!pup) return;
    const zombie = w.kind === 'zombie';
    const moving = w.path.length > 0;
    pup.setFacing(w.facing, !!w.back && moving);
    let pose: Parameters<Puppet['pose']>[0] = 'idle';
    if ((w.state === 'resting' || w.state === 'down') && !moving) pose = 'lie';
    else if (moving) pose = w.state === 'hunting' ? 'run' : 'walk';
    else if (w.state === 'cooking') pose = 'cook';
    pup.pose(pose, dt, { zombie: zombie && w.state !== 'cooking', speed: w.state === 'hunting' ? 1.3 : 1 });
    const face = this.t < a.faceUntil ? a.face : w.state === 'resting' ? 'sleep' : w.state === 'down' ? 'dazed' : w.state === 'hunting' ? 'chomp' : undefined;
    pup.setFace(face as never);
    // carried dish
    if (w.state === 'carrying' && w.job) {
      if (!a.carry) {
        a.carry = this.img(DISH_BY_ID[w.job.dish].icon, 14, -pup.height * 0.62);
        a.holder.add(a.carry);
      }
      a.carry.setTexture(DISH_BY_ID[w.job.dish].icon).setVisible(true).setX(14 * w.facing);
    } else a.carry?.setVisible(false);
    let b: string | null = null;
    if (w.state === 'resting') b = 'fx_zzz';
    else if (w.state === 'down') b = 'fx_ko';
    else if (w.state === 'daydream') b = 'fx_brain_thought';
    else if (w.state === 'hunting') b = 'fx_hangry';
    const lying = pose === 'lie';
    this.bubble(a, b && hasProp(b) ? b : b === 'fx_ko' ? 'fx_zzz' : b, lying ? -30 : -pup.height - 14, lying ? 18 : 4);
    this.energyBar(a, w.energy / w.stats.energy, lying ? -26 : -pup.height - 2);
    if (w.kind === 'you' && !a.tag) {
      a.tag = this.add
        .text(0, 0, 'YOU', { fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#fff4dc', backgroundColor: '#2b1b17', padding: { x: 4, y: 1 } })
        .setResolution(TEX_S)
        .setOrigin(0.5, 1);
      a.holder.add(a.tag);
    }
    if (a.tag) a.tag.y = lying ? -34 : -pup.height - 5;
    const sel = this.ctl.selection;
    const selected = (sel?.kind === 'worker' && sel.id === w.id) || (sel?.kind === 'dishPicker' && sel.workerId === w.id);
    if (selected) pup.setTint(0xfff2a0);
    else pup.clearTint();
  }

  private seatPos(c: Customer): { x: number; y: number } | null {
    const s = this.ctl.state;
    const seat = s.furniture.find((f) => f.id === c.seatId);
    if (!seat) return null;
    const p = iso(seat.x, seat.y);
    const off = seat.item === 'bench' ? (seat.dir === 'nw' ? META.bench_r : META.bench_l) : META.seat?.[seat.dir ?? 'se'] ?? (seat.dir === 'nw' ? META.bench_r : META.bench_l);
    return { x: p.x + off.dx, y: p.y + off.dy - META.seatZ + 16 };
  }

  private syncCustomer(c: Customer, dt: number) {
    const a = this.actor(c.id, c.type);
    if (!a) return;
    const seated = (c.state === 'waiting' || c.state === 'eating') && c.path.length === 0;
    const p = (seated && this.seatPos(c)) || iso(c.x, c.y);
    // sitters go in front of the chair, except chairs whose backrest faces the camera (ne / nw)
    const seatDir = seated ? this.ctl.state.furniture.find((f) => f.id === c.seatId)?.dir : undefined;
    const behind = seated && (seatDir === 'ne' || seatDir === 'nw') && this.ctl.state.furniture.find((f) => f.id === c.seatId)?.item !== 'bench';
    a.holder.setPosition(p.x, p.y).setDepth(depthOf(c.x, c.y) + (seated ? (behind ? 0 : 3) : 5));
    const pup = a.puppet;
    // the dish in front of an eating customer
    const plate = this.tableDishes.get(c.id);
    if (c.state === 'eating' && c.dish) {
      const seat = this.ctl.state.furniture.find((f) => f.id === c.seatId);
      const table = seat && seatTable(this.ctl.state, seat);
      if (table && !plate) {
        const tp = iso(table.x, table.y);
        const top = META.tableTop?.[furnKey(table.item)] ?? META.tableTopZ;
        const toward = iso(seat.x, seat.y);
        const d = this.img(DISH_BY_ID[c.dish].icon, tp.x + (toward.x - tp.x) * 0.25, tp.y + (toward.y - tp.y) * 0.25 - top).setDepth(depthOf(table.x, table.y) + 2);
        this.tableDishes.set(c.id, d);
      }
    } else if (plate) {
      plate.destroy();
      this.tableDishes.delete(c.id);
    }
    if (!pup) return;
    pup.setFacing(c.facing, !!c.back && c.path.length > 0);
    const pose = c.state === 'infecting' ? 'shiver' : c.state === 'fleeing' ? 'run' : c.path.length ? 'walk' : c.state === 'eating' ? 'eat' : seated ? 'sit' : 'idle';
    pup.pose(pose, dt, { speed: c.state === 'fleeing' ? 1.6 : 1 });
    const face = c.state === 'fleeing' ? 'scream' : c.state === 'infecting' ? 'shock' : c.state === 'eating' ? 'happy' : c.mood === 'angry' ? 'shock' : undefined;
    pup.setFace(face as never);
    let b: string | null = null;
    if (c.state === 'fleeing') b = 'fx_alert';
    else if (c.state === 'waiting' && c.waitLeft < 15) b = 'fx_sweat';
    this.bubble(a, b, -pup.height - 8);
    const sel = this.ctl.selection;
    if (c.state === 'infecting') pup.setTint(Math.sin(this.t * 30) > 0 ? 0x9be36b : 0xffffff);
    else if (sel?.kind === 'customer' && sel.id === c.id) pup.setTint(0xfff2a0);
    else pup.clearTint();
  }

  private syncPet(p: Pet, dt: number) {
    const a = this.actor(p.id, p.type === 'pug' ? 'pet_pug' : 'pet_rotweiler');
    if (!a) return;
    a.holder.setVisible(p.state !== 'raiding');
    const w = iso(p.x, p.y);
    a.holder.setPosition(w.x, w.y).setDepth(depthOf(p.x, p.y) + 4);
    if (!a.puppet) return;
    a.puppet.setFacing(p.facing);
    a.puppet.pose(p.path.length ? 'walk' : 'idle', dt);
    this.bubble(a, p.state === 'sniff' ? 'fx_spark' : null, -a.puppet.height - 4);
  }

  // ---------- per-frame ----------

  update(_time: number, deltaMs: number) {
    if (!this.ready) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.t += dt;
    this.ctl.update(dt);
    const s = this.ctl.state;
    const sig = this.sig(s);
    if (sig !== this.layoutSig) {
      this.layoutSig = sig;
      this.rebuild();
    }
    // the CLOSED sign swings on the front door while the joint is shut
    if (s.closed && !this.closedSign && this.textures.exists('ui_closed')) {
      this.closedSign = this.add.image(0, 0, 'ui_closed').setScale(0.42 / TEX_S).setOrigin(0.5, 0.1);
    }
    if (this.closedSign) {
      const c = iso(DOOR_X, 0);
      this.closedSign
        .setVisible(!!s.closed)
        .setPosition(c.x + TILE_W / 4, c.y - WALL_H * 0.62)
        .setDepth(depthOf(DOOR_X, 0) - 4)
        .setRotation(Math.sin(this.t * 2.2) * 0.06);
    }
    const alive = new Set<string>();
    for (const w of s.workers) {
      alive.add(w.id);
      this.syncWorker(w, dt);
    }
    for (const c of s.customers) {
      alive.add(c.id);
      this.syncCustomer(c, dt);
    }
    for (const p of s.pets) {
      alive.add(p.id);
      this.syncPet(p, dt);
    }
    for (const [id, a] of this.actors)
      if (!alive.has(id)) {
        a.holder.destroy();
        this.actors.delete(id);
        const plate = this.tableDishes.get(id);
        plate?.destroy();
        this.tableDishes.delete(id);
      }
    this.updateStations(dt);
    this.updateEdit();
  }

  private updateStations(dt: number) {
    const s = this.ctl.state;
    for (const st of s.stoves) {
      const fx = this.stoveFx.get(st.id);
      if (!fx) continue;
      const cooking = st.status === 'cooking';
      fx.fire?.setVisible(cooking).setScale((1 / TEX_S) * (0.9 + Math.sin(this.t * 14) * 0.12));
      const done = st.status === 'done' || st.status === 'burnt';
      fx.dish.setVisible(done);
      fx.badge.setVisible(done);
      if (done) {
        fx.dish.setTexture(st.status === 'burnt' ? 'dish_burnt' : DISH_BY_ID[st.dish!].icon);
        fx.dish.y = fx.badge.y + 14 - Math.abs(Math.sin(this.t * 4)) * 4;
        // the burn warning: the badge pulses faster as the dish gets close to burning
        if (st.status === 'done' && st.burnAt) {
          const left = st.burnAt - s.now;
          fx.badge.setScale((1 / TEX_S) * (1 + (left < 20 ? Math.abs(Math.sin(this.t * 10)) * 0.4 : 0)));
        }
      }
      fx.ring.clear();
      const f = s.furniture.find((x) => x.id === st.furnitureId);
      if (!f) continue;
      const p = iso(f.x, f.y);
      if (cooking && st.dish) {
        const d = DISH_BY_ID[st.dish];
        const pct = 1 - ((st.doneAt ?? 0) - s.now) / d.cookSec;
        fx.ring.fillStyle(0x2b1b17, 0.85).fillCircle(p.x, p.y - 64, 9);
        fx.ring.lineStyle(3, 0xffc83d, 1).beginPath().arc(p.x, p.y - 64, 6.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Phaser.Math.Clamp(pct, 0, 1)).strokePath();
      }
      if ((cooking || st.status === 'burnt') && (this.smokeT += dt) > 0.45) {
        this.smokeT = 0;
        const smoker = st.kind === 'smoker';
        const puff = this.img('fx_smoke', p.x + (smoker ? 10 : 0), p.y - (smoker ? 72 : 36)).setDepth(depthOf(f.x, f.y) + 6).setAlpha(st.status === 'burnt' ? 1 : 0.8);
        if (st.status === 'burnt') puff.setTint(0x444444);
        this.tweens.add({ targets: puff, y: puff.y - 40, x: puff.x + 12, alpha: 0, scale: (1 / TEX_S) * 1.8, duration: 1800, onComplete: () => puff.destroy() });
      }
    }
    for (const slot of s.counter) {
      const fx = this.counterFx.get(slot.id);
      if (!fx) continue;
      const has = !!slot.dish && slot.servings > 0;
      fx.dish.setVisible(has);
      fx.text.setVisible(has);
      if (has) {
        fx.dish.setTexture(DISH_BY_ID[slot.dish!].icon);
        fx.text.setText(String(slot.servings));
      }
    }
    for (const f of s.furniture) {
      if (itemOf(f).kind !== 'moneymaker') continue;
      let bag = this.cashBags.get(f.id);
      const ready = payoutReady(s, f.id);
      if (!bag && ready) {
        const p = iso(f.x, f.y);
        bag = this.img('fx_cashbag', p.x, p.y - 70).setDepth(depthOf(f.x, f.y) + 8);
        this.cashBags.set(f.id, bag);
      }
      if (bag) {
        bag.setVisible(ready);
        const p = iso(f.x, f.y);
        bag.y = p.y - 70 - Math.abs(Math.sin(this.t * 3)) * 6;
      }
    }
  }

  // ---------- juice ----------

  floatText(x: number, y: number, text: string, color: string, size = 13) {
    const t = this.add
      .text(x, y, text, { fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#2b1b17', strokeThickness: 3 })
      .setResolution(TEX_S)
      .setOrigin(0.5)
      .setDepth(100000)
      .setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, delay: 500, duration: 900, onComplete: () => t.destroy() });
  }

  private popIcon(x: number, y: number, key: string) {
    if (!hasProp(key)) return;
    const i = this.img(key, x, y).setDepth(100000).setScale(0);
    this.tweens.add({ targets: i, scale: 1 / TEX_S, duration: 220, ease: 'Back.Out' });
    this.tweens.add({ targets: i, y: y - 26, alpha: 0, delay: 700, duration: 700, onComplete: () => i.destroy() });
  }

  private fx(e: GameEvent) {
    if (!this.ready) return;
    const s = this.ctl.state;
    switch (e.t) {
      case 'coin': {
        const p = iso(e.x, e.y);
        this.popIcon(p.x - 10, p.y - 70, 'fx_coin');
        this.floatText(p.x + 8, p.y - 70, `+$${e.amount + e.tip}`, '#ffc83d');
        sfx('coin', { volume: 0.6 });
        break;
      }
      case 'face': {
        const p = iso(e.x, e.y);
        this.popIcon(p.x, p.y - 92, e.happy ? 'fx_happy' : 'fx_angry');
        break;
      }
      case 'xp': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 80, `+${e.amount} XP`, '#8fe0ff');
        break;
      }
      case 'bite': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 60, 'CHOMP!', '#ff5a4a', 18);
        this.popIcon(p.x, p.y - 40, 'fx_goo_splat');
        this.cameras.main.shake(180, 0.004);
        const a = this.actors.get(e.workerId);
        if (a) {
          a.face = 'chomp';
          a.faceUntil = this.t + 0.8;
        }
        sfx('chomp');
        setTimeout(() => sfx('scream', { pitch: 0.9 + Math.random() * 0.3 }), 150);
        navigator.vibrate?.(60);
        break;
      }
      case 'infected': {
        const w = s.workers.find((x) => x.id === e.workerId);
        if (!w) break;
        const p = iso(w.x, w.y);
        this.floatText(p.x, p.y - 90, 'INFECTED!', '#9be36b', 16);
        this.popIcon(p.x, p.y - 30, 'fx_goo_splat');
        sfx('infect');
        const a = this.actors.get(w.id);
        if (a) {
          a.holder.setScale(0.6, 1.3);
          this.tweens.add({ targets: a.holder, scaleX: 1, scaleY: 1, duration: 450, ease: 'Elastic.Out' });
          a.face = 'chomp';
          a.faceUntil = this.t + 1.2;
        }
        break;
      }
      case 'cookStart':
        sfx('sizzle', { volume: 0.7 });
        break;
      case 'dishDone': {
        const st = s.stoves.find((x) => x.id === e.stoveId);
        const f = st && s.furniture.find((x) => x.id === st.furnitureId);
        sfx('ding');
        if (f) {
          const p = iso(f.x, f.y);
          for (let i = 0; i < 6; i++) {
            const sp = this.img('fx_spark', p.x, p.y - 40).setDepth(100000);
            this.tweens.add({ targets: sp, x: p.x + Math.cos(i) * 30, y: p.y - 40 + Math.sin(i * 2) * 24, alpha: 0, duration: 650, onComplete: () => sp.destroy() });
          }
        }
        break;
      }
      case 'burnt':
        sfx('burn');
        break;
      case 'payout': {
        const f = s.furniture.find((x) => x.id === e.furnitureId);
        if (f) {
          const p = iso(f.x, f.y);
          this.floatText(p.x, p.y - 80, `+$${e.amount}`, '#ffc83d', 16);
        }
        sfx('cashRegister');
        break;
      }
      case 'petFind': {
        const pet = s.pets.find((x) => x.id === e.petId);
        if (pet) {
          const p = iso(pet.x, pet.y);
          this.popIcon(p.x, p.y - 40, 'fx_coin');
          this.floatText(p.x, p.y - 50, `+$${e.amount}`, '#ffc83d');
        }
        sfx('pugSnort');
        break;
      }
      case 'daydream':
        sfx('daydream', { volume: 0.5 });
        break;
      case 'levelup':
        this.cameras.main.flash(250, 255, 240, 160);
        sfx('levelUp');
        break;
      default:
        break;
    }
  }
}
