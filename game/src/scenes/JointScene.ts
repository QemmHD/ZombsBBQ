import Phaser from 'phaser';
import { CHAR_IDS, PROP_META, TILE_H, TILE_W, WALL_H, buildChar, buildProps, type CharArt } from '../art';
import {
  DOOR_X,
  LOT_MAX,
  LOT_MIN,
  ROOM_N,
  DISH_BY_ID,
  groundAt,
  isoToWorld,
  worldToIso,
  type Customer,
  type GameEvent,
  type Worker,
} from '../sim';
import type { Controller } from '../game/controller';
import { charIdFor } from '../ui/hud';

const iso = (x: number, y: number) => isoToWorld(x, y, TILE_W, TILE_H);
const depthOf = (x: number, y: number) => (x + y) * 10;

/** Rasterization scale: textures are drawn bigger than world units so zoomed-in Retina stays crisp. */
const TEX_S = Math.min(4, Math.max(2, (window.devicePixelRatio || 1) * 1.5));
const svgData = (svg: string) => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

interface CharView {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Container;
  parts: Record<string, Phaser.GameObjects.Image>;
  base: Record<string, { x: number; y: number }>;
  charId: string;
  height: number;
  phase: number;
  bar?: Phaser.GameObjects.Graphics;
  tag?: Phaser.GameObjects.Text;
  carry: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Image;
  lastBar: number;
}

export class JointScene extends Phaser.Scene {
  private ctl!: Controller;
  private chars = new Map<string, CharView>();
  private charArt = new Map<string, CharArt>();
  private furnViews = new Map<string, Phaser.GameObjects.Image>();
  private stoveFx = new Map<string, { fire?: Phaser.GameObjects.Image; dish: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Graphics; badge: Phaser.GameObjects.Image }>();
  private counterFx = new Map<string, { dish: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }>();
  private userZoom = 1;
  private drag: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
  private pinch: { d: number; z: number } | null = null;
  private t = 0;
  private smokeT = 0;

  constructor() {
    super('joint');
  }

  init(data: { ctl: Controller }) {
    this.ctl = data.ctl;
  }

  /**
   * Rasterize every SVG into a texture at TEX_S scale. Images are created directly (not through the
   * Phaser loader) so it works under strict content-security policies (embedded pages, app shells).
   */
  private loadArt(): Promise<void> {
    const jobs: Promise<void>[] = [];
    const add = (key: string, svg: string, w: number, h: number) => {
      const sized = svg.replace(/<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 width="${w * TEX_S}" height="${h * TEX_S}"`);
      jobs.push(
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (!this.textures.exists(key)) this.textures.addImage(key, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = svgData(sized);
        }),
      );
    };
    for (const a of buildProps()) {
      add(a.key, a.svg, a.w, a.h);
      this.propMeta.set(a.key, a);
    }
    for (const id of CHAR_IDS) {
      const art = buildChar(id);
      this.charArt.set(id, art);
      for (const p of art.parts) add(p.key, p.svg, p.w, p.h);
    }
    return Promise.all(jobs).then(() => undefined);
  }
  private propMeta = new Map<string, { w: number; h: number; ox: number; oy: number }>();
  private ready = false;

  private img(key: string, x: number, y: number) {
    const m = this.propMeta.get(key);
    const i = this.add.image(x, y, key).setScale(1 / TEX_S);
    if (m) i.setOrigin(m.ox, m.oy);
    return i;
  }

  create() {
    this.cameras.main.setBackgroundColor('#7cb342');
    void this.loadArt().then(() => this.build());
  }

  private build() {
    this.buildGround();
    this.buildWalls();
    this.buildFurniture();
    this.setupCamera();
    this.setupInput();
    this.ctl.onEvent((e) => this.fx(e));
    this.scale.on('resize', () => this.applyZoom(true));
    this.ready = true;
  }

  // ---------- static world ----------

  private buildGround() {
    for (let y = LOT_MIN; y <= LOT_MAX; y++)
      for (let x = LOT_MIN; x <= LOT_MAX; x++) {
        const g = groundAt(x, y);
        const key = g === 'floor' ? ((x + y) % 2 === 0 ? 'floor_a' : 'floor_b') : g;
        const p = iso(x, y);
        this.img(key, p.x, p.y).setDepth(-100000 + depthOf(x, y));
      }
    // scenery: trees, graves and the roadside sign, like the concept art
    const deco: [string, number, number][] = [
      ['tree', -2, 2],
      ['tree', -2, 6],
      ['tree', 2, ROOM_N + 2],
      ['tree', ROOM_N + 2, -1],
      ['tombstone', ROOM_N + 2, 4],
      ['tombstone', ROOM_N + 1, ROOM_N + 1],
      ['neon_post', ROOM_N + 1, -1],
    ];
    for (const [k, x, y] of deco) {
      const p = iso(x, y);
      this.img(k, p.x, p.y).setDepth(depthOf(x, y) + 2);
    }
  }

  /** Walls (art contract): wall_r sits on each tile's upper-right edge along gy = 0, wall_l on the upper-left edge along gx = 0. */
  private buildWalls() {
    for (let gx = 0; gx < ROOM_N; gx++) {
      const c = iso(gx, 0);
      const key = gx === DOOR_X ? 'wall_r_door' : gx === 1 ? 'wall_r_menu' : 'wall_r';
      this.img(key, c.x + TILE_W / 4, c.y).setDepth(depthOf(gx, 0) - 6);
    }
    for (let gy = 0; gy < ROOM_N; gy++) {
      const c = iso(0, gy);
      const key = gy === 1 ? 'wall_l_sign' : gy === 5 ? 'wall_l_window' : 'wall_l';
      this.img(key, c.x - TILE_W / 4, c.y).setDepth(depthOf(0, gy) - 6);
    }
  }

  private buildFurniture() {
    for (const v of this.furnViews.values()) v.destroy();
    this.furnViews.clear();
    const s = this.ctl.state;
    for (const f of s.furniture) {
      let key: string = f.kind;
      if (f.kind === 'bench') key = f.side === -1 ? 'bench_l' : 'bench_r';
      if (f.kind === 'keg') key = 'barrel_keg';
      const p = iso(f.x, f.y);
      const i = this.img(key, p.x, p.y).setDepth(depthOf(f.x, f.y) + 1);
      if (f.locked) i.setTint(0x8a8a8a);
      this.furnViews.set(f.id, i);
    }
    for (const st of s.stoves) {
      const f = s.furniture.find((x) => x.id === st.furnitureId)!;
      const p = iso(f.x, f.y);
      const fire = st.kind === 'grill' ? this.img('grill_fire', p.x, p.y - PROP_META.grillTopZ).setDepth(depthOf(f.x, f.y) + 2).setVisible(false) : undefined;
      const dish = this.img('dish_hotdog', p.x, p.y - 44).setDepth(depthOf(f.x, f.y) + 4).setVisible(false);
      const badge = this.img('fx_alert', p.x + 16, p.y - 56).setDepth(depthOf(f.x, f.y) + 5).setVisible(false);
      const ring = this.add.graphics().setDepth(depthOf(f.x, f.y) + 5);
      this.stoveFx.set(st.id, { fire, dish, ring, badge });
    }
    for (const slot of s.counter) {
      const f = s.furniture.find((x) => x.id === slot.furnitureId)!;
      const p = iso(f.x, f.y);
      const dish = this.img('dish_hotdog', p.x, p.y - PROP_META.counterTopZ).setDepth(depthOf(f.x, f.y) + 2).setVisible(false);
      const text = this.add
        .text(p.x + 16, p.y - PROP_META.counterTopZ - 14, '', { fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#fff', backgroundColor: '#8e1b2e', padding: { x: 3, y: 1 } })
        .setResolution(TEX_S)
        .setOrigin(0.5)
        .setDepth(depthOf(f.x, f.y) + 3);
      this.counterFx.set(slot.id, { dish, text });
    }
  }

  // ---------- camera & input ----------

  private setupCamera() {
    const cam = this.cameras.main;
    const tl = iso(LOT_MIN, LOT_MAX);
    const br = iso(LOT_MAX, LOT_MIN);
    const top = iso(LOT_MIN, LOT_MIN);
    const bottom = iso(LOT_MAX, LOT_MAX);
    cam.setBounds(tl.x, top.y - WALL_H, br.x - tl.x, bottom.y - top.y + WALL_H);
    this.applyZoom(true);
  }

  /** CSS-pixel zoom that fits the whole room (walls included) between the awning and the side buttons. */
  private baseZoom() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.scale.width / dpr;
    const cssH = this.scale.height / dpr;
    const availW = cssW - 2 * 76;
    const availH = cssH - 58;
    const roomW = ROOM_N * TILE_W;
    const roomH = ROOM_N * TILE_H + WALL_H;
    return Math.min(availW / roomW, availH / roomH) * 1.06;
  }

  private applyZoom(recenter = false) {
    const dpr = window.devicePixelRatio || 1;
    const z = this.baseZoom() * this.userZoom;
    const cam = this.cameras.main;
    const keep = recenter ? null : { x: cam.midPoint.x, y: cam.midPoint.y };
    cam.setZoom(z * dpr);
    if (keep) cam.centerOn(keep.x, keep.y);
    else {
      // room center, nudged down so the back walls clear the awning
      const c = iso(ROOM_N / 2 - 0.5, ROOM_N / 2 - 0.5);
      cam.centerOn(c.x, c.y - WALL_H / 2 - 26 / z);
    }
  }

  private setupInput() {
    this.input.addPointer(1);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const pts = this.activePointers();
      if (pts.length >= 2) {
        this.pinch = { d: Phaser.Math.Distance.Between(pts[0].x, pts[0].y, pts[1].x, pts[1].y), z: this.userZoom };
        this.drag = null;
        return;
      }
      const cam = this.cameras.main;
      this.drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY, moved: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const pts = this.activePointers();
      if (this.pinch && pts.length >= 2) {
        const d = Phaser.Math.Distance.Between(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        this.userZoom = Phaser.Math.Clamp((this.pinch.z * d) / this.pinch.d, 0.6, 2.2);
        this.applyZoom();
        return;
      }
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.x;
      const dy = p.y - this.drag.y;
      if (Math.hypot(dx, dy) > 12) this.drag.moved = true;
      if (this.drag.moved) {
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
      if (this.drag && !this.drag.moved) this.tap(p.worldX, p.worldY);
      this.drag = null;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.userZoom = Phaser.Math.Clamp(this.userZoom * (dy > 0 ? 0.9 : 1.1), 0.6, 2.2);
      this.applyZoom();
    });
  }

  private activePointers() {
    return [this.input.pointer1, this.input.pointer2].filter((p) => p && p.isDown);
  }

  private stoveAt(wx: number, wy: number) {
    const s = this.ctl.state;
    for (const off of [0, 22, 44]) {
      const t = worldToIso(wx, wy + off, TILE_W, TILE_H);
      const f = s.furniture.find((x) => x.x === Math.round(t.x) && x.y === Math.round(t.y));
      const st = f && s.stoves.find((x) => x.furnitureId === f.id);
      if (st) return st;
    }
    return undefined;
  }

  private tap(wx: number, wy: number) {
    const s = this.ctl.state;
    // with a cook selected, a tap on a stove means "cook here", even if someone stands in front of it
    if (this.ctl.selection?.kind === 'worker') {
      const st = this.stoveAt(wx, wy);
      if (st) return this.ctl.tapStove(st.id);
    }
    // characters first (front-most wins)
    let best: { id: string; kind: 'w' | 'c'; depth: number } | null = null;
    const consider = (id: string, kind: 'w' | 'c') => {
      const v = this.chars.get(id);
      if (!v || !v.root.visible) return;
      const lying = Math.abs(v.body.rotation) > 0.5;
      const hw = lying ? 40 : 22;
      const top = lying ? 30 : v.height + 8;
      if (Math.abs(wx - v.root.x) < hw && wy < v.root.y + 8 && wy > v.root.y - top) {
        if (!best || v.root.depth > best.depth) best = { id, kind, depth: v.root.depth };
      }
    };
    for (const w of s.workers) consider(w.id, 'w');
    for (const c of s.customers) if (c.state !== 'leaving' && c.state !== 'fleeing' && c.state !== 'infecting') consider(c.id, 'c');
    if (best) {
      const b = best as { id: string; kind: 'w' | 'c' };
      return b.kind === 'w' ? this.ctl.tapWorker(b.id) : this.ctl.tapCustomer(b.id);
    }
    // then furniture: check the tile under the finger and the one just below (tall objects)
    for (const off of [0, 22, 44]) {
      const t = worldToIso(wx, wy + off, TILE_W, TILE_H);
      const tx = Math.round(t.x);
      const ty = Math.round(t.y);
      const f = s.furniture.find((x) => x.x === tx && x.y === ty);
      if (!f) continue;
      const st = s.stoves.find((x) => x.furnitureId === f.id);
      if (st) return this.ctl.tapStove(st.id);
      if (f.kind === 'counter') {
        const total = s.counter.reduce((a, c) => a + (c.dish ? c.servings : 0), 0);
        this.ctl.toast(total ? `${total} servings on the counter.` : 'The counter is empty! Cook something.');
        return;
      }
      if (f.kind === 'fridge') return this.ctl.toast('The Fridge fills up with loot once raids open. 🧊');
    }
    this.ctl.tapNothing();
  }

  // ---------- characters ----------

  private makeChar(id: string, charId: string): CharView {
    const art = this.charArt.get(charId) ?? this.charArt.get('accountant')!;
    const root = this.add.container(0, 0);
    const body = this.add.container(0, 0);
    root.add(body);
    const parts: Record<string, Phaser.GameObjects.Image> = {};
    const base: Record<string, { x: number; y: number }> = {};
    for (const p of art.parts) {
      const name = p.key.split('_').pop()!;
      const i = this.add.image(p.x, p.y, p.key).setScale(1 / TEX_S).setOrigin(p.px / p.w, p.py / p.h);
      body.add(i);
      parts[name] = i;
      base[name] = { x: p.x, y: p.y };
    }
    const carry = this.img('dish_hotdog', 14, -art.height * 0.55).setVisible(false);
    body.add(carry);
    const bubble = this.img('fx_zzz', 6, -art.height - 6).setVisible(false);
    root.add(bubble);
    const v: CharView = { root, body, parts, base, charId, height: art.height, phase: Math.random() * 10, carry, bubble, lastBar: -1 };
    this.chars.set(id, v);
    return v;
  }

  private ensureChar(id: string, charId: string): CharView {
    let v = this.chars.get(id);
    if (v && v.charId !== charId) {
      v.root.destroy();
      this.chars.delete(id);
      v = undefined;
    }
    return v ?? this.makeChar(id, charId);
  }

  private animateParts(v: CharView, mode: 'walk' | 'idle' | 'cook' | 'eat' | 'sit' | 'shiver', zombie: boolean, dt: number, speed = 1) {
    const P = v.parts;
    v.phase += dt * (mode === 'walk' ? 9 * speed : mode === 'cook' ? 10 : 2.4);
    const s = Math.sin(v.phase);
    const reset = (k: string) => P[k] && (P[k].x = v.base[k].x) && (P[k].y = v.base[k].y);
    for (const k of Object.keys(P)) reset(k);
    const legSwing = mode === 'walk' ? 0.55 : 0;
    if (P.legL) P.legL.rotation = s * legSwing;
    if (P.legR) P.legR.rotation = -s * legSwing * (zombie ? 0.35 : 1); // zombies drag one foot
    if (P.legL) P.legL.visible = P.legR.visible = mode !== 'sit' && mode !== 'eat';
    let armL = 0;
    let armR = 0;
    if (zombie && mode !== 'cook' && mode !== 'eat') {
      armL = -1.25 + s * 0.12;
      armR = -1.15 - s * 0.12;
    } else if (mode === 'walk') {
      armL = -s * 0.5;
      armR = s * 0.5;
    } else if (mode === 'cook') {
      armL = -0.9 + Math.sin(v.phase) * 0.45;
      armR = -0.6 + Math.cos(v.phase * 1.3) * 0.3;
    } else if (mode === 'eat') {
      armL = -1 + Math.max(0, s) * 0.6;
    } else {
      armL = s * 0.05;
      armR = -s * 0.05;
    }
    if (P.armL) P.armL.rotation = armL;
    if (P.armR) P.armR.rotation = armR;
    const bob = mode === 'walk' ? -Math.abs(Math.sin(v.phase)) * 2.2 : Math.sin(v.phase) * 0.6;
    if (P.torso) P.torso.y = v.base.torso.y + bob;
    if (P.head) {
      P.head.y = v.base.head.y + bob + (mode === 'eat' ? Math.max(0, s) * 2.5 : 0);
      P.head.rotation = zombie ? 0.16 + Math.sin(v.phase * 0.7) * 0.08 : mode === 'eat' ? Math.max(0, s) * 0.12 : Math.sin(v.phase * 0.5) * 0.03;
    }
    for (const k of ['armL', 'armR'] as const) if (P[k]) P[k].y = v.base[k].y + bob;
    v.body.x = mode === 'shiver' ? (Math.random() - 0.5) * 3 : 0;
    v.body.rotation = zombie && mode === 'walk' ? Math.sin(v.phase * 0.5) * 0.06 : 0;
  }

  private drawBar(v: CharView, f: number) {
    const q = Math.round(f * 40);
    if (q === v.lastBar) return;
    v.lastBar = q;
    if (!v.bar) {
      v.bar = this.add.graphics();
      v.root.add(v.bar);
    }
    const g = v.bar;
    g.clear();
    const y = -v.height - 2;
    g.fillStyle(0x2b1b17, 1).fillRoundedRect(-15, y, 30, 6, 3);
    g.fillStyle(f > 0.5 ? 0x6fcf3a : f > 0.25 ? 0xffc83d : 0xe2403a, 1).fillRoundedRect(-14, y + 1, Math.max(2, 28 * f), 4, 2);
  }

  private syncWorker(w: Worker, dt: number) {
    const v = this.ensureChar(w.id, charIdFor(w));
    const p = iso(w.x, w.y);
    v.root.setPosition(p.x, p.y).setDepth(depthOf(w.x, w.y) + 5);
    v.root.scaleX = 1;
    v.body.scaleX = w.facing;
    const zombie = w.kind === 'zombie';
    const moving = w.path.length > 0;
    v.carry.setVisible(w.state === 'carrying');
    if (w.state === 'carrying' && w.job) v.carry.setTexture(DISH_BY_ID[w.job.dish].icon);
    if (w.state === 'resting' && !moving) {
      v.body.rotation = -1.45;
      v.body.y = -6;
      this.animateParts(v, 'idle', zombie, dt * 0.3);
      v.body.rotation = -1.45;
    } else {
      v.body.y = 0;
      this.animateParts(v, moving ? 'walk' : w.state === 'cooking' ? 'cook' : 'idle', zombie && w.state !== 'cooking', dt, w.state === 'hunting' ? 1.5 : 1);
    }
    // bubbles: Zzz, daydream, hangry
    let bubble: string | null = null;
    if (w.state === 'resting') bubble = 'fx_zzz';
    else if (w.state === 'daydream') bubble = 'fx_brain_thought';
    else if (w.state === 'hunting') bubble = 'fx_hangry';
    v.bubble.setVisible(!!bubble);
    if (bubble) {
      v.bubble.setTexture(bubble);
      v.bubble.y = (w.state === 'resting' ? -30 : -v.height - 14) + Math.sin(this.t * 3) * 2;
      v.bubble.x = w.state === 'resting' ? 18 : 4;
    }
    this.drawBar(v, w.energy / w.stats.energy);
    if (w.kind === 'you' && !v.tag) {
      v.tag = this.add
        .text(0, -v.height - 14, 'YOU', { fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#fff4dc', backgroundColor: '#2b1b17', padding: { x: 4, y: 1 } })
        .setResolution(TEX_S)
        .setOrigin(0.5, 1);
      v.root.add(v.tag);
    }
    if (v.tag) v.tag.y = w.state === 'resting' ? -36 : -v.height - 6;
    const sel = this.ctl.selection;
    const selected = sel?.kind === 'worker' && sel.id === w.id || (sel?.kind === 'dishPicker' && sel.workerId === w.id);
    for (const part of Object.values(v.parts)) part.setTint(selected ? 0xfff2a0 : 0xffffff);
  }

  private syncCustomer(c: Customer, dt: number) {
    const v = this.ensureChar(c.id, c.type);
    const p = iso(c.x, c.y);
    const seated = (c.state === 'waiting' || c.state === 'eating') && c.path.length === 0;
    if (seated) {
      const seat = this.ctl.state.furniture.find((f) => f.id === c.seatId);
      const off = seat?.side === 1 ? PROP_META.bench_r : PROP_META.bench_l;
      p.x += off.dx;
      p.y += off.dy - PROP_META.seatZ + 16;
    }
    v.root.setPosition(p.x, p.y).setDepth(depthOf(c.x, c.y) + (seated ? 3 : 5));
    v.body.scaleX = c.facing;
    v.body.rotation = 0;
    v.body.y = 0;
    const mode = c.state === 'infecting' ? 'shiver' : c.path.length ? 'walk' : c.state === 'eating' ? 'eat' : seated ? 'sit' : 'idle';
    this.animateParts(v, mode, false, dt, c.state === 'fleeing' ? 2.2 : 1);
    v.carry.setVisible(false);
    let bubble: string | null = null;
    if (c.state === 'fleeing') bubble = 'fx_alert';
    else if (c.state === 'waiting' && c.waitLeft < 15) bubble = 'fx_sweat';
    v.bubble.setVisible(!!bubble);
    if (bubble) {
      v.bubble.setTexture(bubble);
      v.bubble.y = -v.height - 8;
    }
    const sel = this.ctl.selection;
    const selected = sel?.kind === 'customer' && sel.id === c.id;
    const flash = c.state === 'infecting' ? (Math.sin(this.t * 30) > 0 ? 0x9be36b : 0xffffff) : selected ? 0xfff2a0 : 0xffffff;
    for (const part of Object.values(v.parts)) part.setTint(flash);
  }

  // ---------- per-frame ----------

  update(_time: number, deltaMs: number) {
    if (!this.ready) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.t += dt;
    this.ctl.update(dt);
    const s = this.ctl.state;
    if (this.furnViews.size !== s.furniture.length || [...this.furnViews.keys()].some((id) => !s.furniture.find((f) => f.id === id))) this.rebuildFurniture();
    for (const f of s.furniture) this.furnViews.get(f.id)?.setTint(f.locked ? 0x8a8a8a : 0xffffff);

    const alive = new Set<string>();
    for (const w of s.workers) {
      alive.add(w.id);
      this.syncWorker(w, dt);
    }
    for (const c of s.customers) {
      alive.add(c.id);
      this.syncCustomer(c, dt);
    }
    for (const [id, v] of this.chars)
      if (!alive.has(id)) {
        v.root.destroy();
        this.chars.delete(id);
      }

    for (const st of s.stoves) {
      const fx = this.stoveFx.get(st.id);
      if (!fx) continue;
      const cooking = st.status === 'cooking';
      fx.fire?.setVisible(cooking).setScale((1 / TEX_S) * (0.9 + Math.sin(this.t * 14) * 0.12));
      fx.dish.setVisible(st.status === 'done' || st.status === 'burnt');
      fx.badge.setVisible(st.status === 'done' || st.status === 'burnt');
      if (st.status === 'done' || st.status === 'burnt') {
        fx.dish.setTexture(st.status === 'burnt' ? 'dish_burnt' : DISH_BY_ID[st.dish!].icon);
        fx.dish.y = fx.badge.y + 14 + Math.abs(Math.sin(this.t * 4)) * -4;
      }
      fx.ring.clear();
      if (cooking && st.dish) {
        const d = DISH_BY_ID[st.dish];
        const pct = 1 - ((st.doneAt ?? 0) - s.now) / d.cookSec;
        const f = s.furniture.find((x) => x.id === st.furnitureId)!;
        const p = iso(f.x, f.y);
        fx.ring.fillStyle(0x2b1b17, 0.85).fillCircle(p.x, p.y - 62, 9);
        fx.ring.lineStyle(3, 0xffc83d, 1).beginPath().arc(p.x, p.y - 62, 6.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Phaser.Math.Clamp(pct, 0, 1)).strokePath();
      }
      if ((cooking || st.status === 'burnt') && (this.smokeT += dt) > 0.45) {
        this.smokeT = 0;
        const f = s.furniture.find((x) => x.id === st.furnitureId)!;
        const p = iso(f.x, f.y);
        const puff = this.img('fx_smoke', p.x + (st.kind === 'smoker' ? 10 : 0), p.y - (st.kind === 'smoker' ? 70 : 34)).setDepth(depthOf(f.x, f.y) + 6).setAlpha(0.8);
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
  }

  private rebuildFurniture() {
    for (const fx of this.stoveFx.values()) {
      fx.fire?.destroy();
      fx.dish.destroy();
      fx.ring.destroy();
      fx.badge.destroy();
    }
    for (const fx of this.counterFx.values()) {
      fx.dish.destroy();
      fx.text.destroy();
    }
    this.stoveFx.clear();
    this.counterFx.clear();
    this.buildFurniture();
  }

  // ---------- juice ----------

  private floatText(x: number, y: number, text: string, color: string, size = 13) {
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
    const i = this.img(key, x, y).setDepth(100000).setScale(0);
    this.tweens.add({ targets: i, scale: 1 / TEX_S, duration: 220, ease: 'Back.Out' });
    this.tweens.add({ targets: i, y: y - 26, alpha: 0, delay: 700, duration: 700, onComplete: () => i.destroy() });
  }

  private fx(e: GameEvent) {
    switch (e.t) {
      case 'coin': {
        const p = iso(e.x, e.y);
        this.popIcon(p.x - 10, p.y - 70, 'fx_coin');
        this.floatText(p.x + 8, p.y - 70, `+$${e.amount + e.tip}`, '#ffc83d');
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
        this.cameras.main.shake(180, 0.004);
        navigator.vibrate?.(60);
        break;
      }
      case 'infected': {
        const w = this.ctl.state.workers.find((x) => x.id === e.workerId);
        if (w) {
          const p = iso(w.x, w.y);
          this.floatText(p.x, p.y - 90, 'INFECTED!', '#9be36b', 16);
          const v = this.chars.get(w.id);
          if (v) {
            v.root.setScale(0.6, 1.3);
            this.tweens.add({ targets: v.root, scaleX: 1, scaleY: 1, duration: 450, ease: 'Elastic.Out' });
          }
        }
        break;
      }
      case 'dishDone': {
        const st = this.ctl.state.stoves.find((x) => x.id === e.stoveId);
        const f = st && this.ctl.state.furniture.find((x) => x.id === st.furnitureId);
        if (f) {
          const p = iso(f.x, f.y);
          for (let i = 0; i < 6; i++) {
            const sp = this.img('fx_spark', p.x, p.y - 40).setDepth(100000);
            this.tweens.add({ targets: sp, x: p.x + Math.cos(i) * 30, y: p.y - 40 + Math.sin(i * 2) * 24, alpha: 0, duration: 650, onComplete: () => sp.destroy() });
          }
        }
        break;
      }
      case 'levelup':
        this.cameras.main.flash(250, 255, 240, 160);
        break;
      default:
        break;
    }
  }
}
