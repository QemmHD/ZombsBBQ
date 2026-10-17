/**
 * The café, drawn from the sim (v3 lot): a corner lot at a crossroads. Sidewalks and two-lane roads
 * run behind BOTH back walls (north-east and north-west), with grass and street junk beyond; the room
 * opens toward the camera onto the front lawn. Reads sim state; never owns game rules.
 */
import Phaser from 'phaser';
import { HH, HW, TILE_H, TILE_W, WALL_H } from '../art3/kit';
import { FURN_META, chairFamilyOf } from '../art3/furniture';
import { KITCHEN_META } from '../art3/kitchen';
import { BUBBLE_SLOT, BUBBLE_H } from '../art3/fx';
import {
  DISH_BY_ID,
  DOOR_X,
  ITEM_BY_ID,
  chairTable,
  isInside,
  itemOf,
  maxEnergy,
  onLawn,
  payoutState,
  layoutVersion,
  worldToIso,
  type Customer,
  type Furniture,
  type GameEvent,
  type GameState,
  type Pet,
  type Worker,
  TUNING,
} from '../sim';
import type { Controller, FocusTarget } from '../game/controller';
import { targetKey, tutorialTarget, type TutTarget } from '../game/tutorial';
import { sfx } from '../game/sfx';
import { haptic } from '../game/haptics';
import { TEX_S, charArt, charLoaded, ensureProps, hasProp, loadChar, loadProps, propMeta, propsReady, texScale } from './assets';
import { GROUND, charIdFor, depthOf, dishIcons, drawLot, floorKeys, furnArt, iso, moverDepth, nearDoor, scenery, surfaceKeys, wallAnchor, wallKey } from './lot';
import type { FrontDoor } from './lot';
import { Puppet } from './puppet';
import { FloatTexts, type FloatOpts } from './floattext';
import { FONT_DISPLAY, fontsReady } from '../fonts';

export { iso, furnArt, wallKey, floorKeys, wallAnchor, charIdFor } from './lot';

/** Height of the HUD's bottom command strip, CSS px (keep in step with .strip in style.css). */
export const STRIP_PX = 70;

interface Actor {
  puppet: Puppet | null;
  charId: string;
  loading: boolean;
  bar?: Phaser.GameObjects.Graphics;
  barQ: number;
  tag?: Phaser.GameObjects.Text;
  carry?: Phaser.GameObjects.Image;
  bubble?: Phaser.GameObjects.Image;
  bubbleDish?: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  /** the selection marker: a pulsing ring on the ground under their feet */
  sel?: Phaser.GameObjects.Ellipse;
  faceUntil: number;
  face?: string;
  holder: Phaser.GameObjects.Container;
  /** was carrying a plate to a table last frame (to play the serve lean when it's set down) */
  wasServing?: boolean;
  serveAt?: number;
}

interface StoveFx {
  fx: Phaser.GameObjects.Image;
  dish: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Graphics;
  topY: number;
  x: number;
  depth: number;
  smokeT: number;
}

export class JointScene extends Phaser.Scene {
  ctl!: Controller;
  ready = false;
  private actors = new Map<string, Actor>();
  /** eaten customers: the body lies there while the zombie feasts, then a bone pile (original: 10 s, then a 3 s fade) */
  private remains: { body: Phaser.GameObjects.Container | null; bones: Phaser.GameObjects.Image; t0: number }[] = [];
  private bonesN = 0;
  private staticLayer: Phaser.GameObjects.GameObject[] = [];
  private furnViews = new Map<string, Phaser.GameObjects.Image[]>();
  private wallViews = new Map<string, Phaser.GameObjects.Image>();
  private stoveFx = new Map<string, StoveFx>();
  /** per counter: up to 3 dishes side by side, each a stack of 1–4 plates, and a servings pill */
  private counterFx = new Map<string, { dishes: Phaser.GameObjects.Image[][]; empty: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }>();
  private cashBadges = new Map<string, Phaser.GameObjects.Image>();
  private tablePlates = new Map<string, Phaser.GameObjects.Image>();
  private door?: FrontDoor;
  private grid?: Phaser.GameObjects.Graphics;
  private ghost: Phaser.GameObjects.Image[] = [];
  private layoutSig = -1;
  /** ids seen this frame (reused, not reallocated every frame) */
  private alive = new Set<string>();
  private footG?: Phaser.GameObjects.Graphics;
  private panKey = '';
  private sizeSig = '';
  private loadingSig = '';
  private userZoom = 1;
  private drag: {
    x: number;
    y: number;
    sx: number;
    sy: number;
    moved: boolean;
    placing: boolean;
  } | null = null;
  private pinch: { d: number; z: number } | null = null;
  private t = 0;
  private doorWasNear = false;
  /** next time (scene seconds) a seated diner may chew / an idle zombie may mutter, per actor id */
  private readonly nextChatter = new Map<string, number>();
  private floats?: FloatTexts;
  /** the tutorial's bouncing red arrow (world targets; the HUD draws its own over buttons) */
  private arrow?: Phaser.GameObjects.Graphics;
  private tutKey = '';
  /** valid tiles for the piece being placed (recomputed when the placement changes) */
  private okTiles: { x: number; y: number }[] = [];
  private okTilesKey = '';

  constructor() {
    super('joint');
  }

  init(data: { ctl: Controller }) {
    this.ctl = data.ctl;
  }

  create() {
    this.cameras.main.setBackgroundColor('#4f5a2c');
    const bar = document.getElementById('boot-progress');
    const s = this.ctl.state;
    // canvas labels don't redraw when a web font arrives, so the fonts are part of loading
    void Promise.all([loadProps(this, (f) => bar && (bar.style.width = `${Math.round(f * 90)}%`)), fontsReady])
      .then(() => ensureProps(this, this.neededKeys(s)))
      .then(() => Promise.all(['you', 'gus', ...s.workers.map(charIdFor)].map((id) => loadChar(this, id))))
      .then(() => {
        this.ready = true;
        document.getElementById('boot')?.classList.add('done');
        this.setupCamera(true);
        this.setupInput();
        this.ctl.onEvent((e) => this.fx(e));
        this.ctl.onFocus((t) => this.focusOn(t));
        this.ctl.onSelection(() => this.keepSelectionInView());
        this.ctl.onMode(() => this.onModeChange());
        this.scale.on('resize', () => this.applyZoom(true));
        this.game.events.emit('joint-ready');
      });
  }

  // ---------- static world (rebuilt when the layout changes) ----------

  /** Every prop key the current layout needs (furniture is rasterized lazily, as it's placed). */
  private neededKeys(s: GameState): Set<string> {
    const k = new Set<string>();
    for (const f of s.furniture) {
      const a = furnArt(f.item, f.dir);
      k.add(a.key);
      if (a.back) k.add(a.back);
    }
    for (const w of s.wallItems) k.add(`${ITEM_BY_ID[w.item].art}_${w.wall}`);
    for (const [sk, , , flip] of scenery(s.roomW, s.roomH)) k.add(flip && hasProp(`${sk}_se`) ? `${sk}_se` : sk);
    // the walls and floors it's painted with, and the dishes it can show
    for (const sk of surfaceKeys({ w: s.roomW, h: s.roomH, wallKey: (side, i) => wallKey(s, side, i), floorKeys: (x, y) => floorKeys(s, x, y) })) k.add(sk);
    for (const d of dishIcons(s)) k.add(d);
    for (const st of ['fx_steam_1', 'fx_steam_2', 'fx_steam_3', 'grill_flames', 'fryer_bubbles', 'pot_burnt']) k.add(st);
    return k;
  }

  private img(key: string, x: number, y: number, flip = false) {
    const m = propMeta(key);
    const i = this.add.image(x, y, this.textures.exists(key) ? key : '__MISSING').setScale(1 / texScale(key));
    if (m) i.setOrigin(flip ? 1 - m.ox : m.ox, m.oy);
    if (flip) i.setFlipX(true);
    return i;
  }

  private rebuild() {
    const s = this.ctl.state;
    // furniture art loads on first use: draw once it's ready (and redraw if something new appeared)
    const need = this.neededKeys(s);
    if (!propsReady(this, need)) {
      const sig = [...need].join(',');
      if (this.loadingSig !== sig) {
        this.loadingSig = sig;
        void ensureProps(this, need).then(() => (this.layoutSig = -1));
      }
    }
    for (const o of this.staticLayer) o.destroy();
    this.staticLayer = [];
    this.furnViews.clear();
    this.wallViews.clear();
    for (const fx of this.stoveFx.values()) [fx.fx, fx.dish, fx.badge, fx.ring].forEach((o) => o.destroy());
    this.stoveFx.clear();
    for (const c of this.counterFx.values()) [...c.dishes.flat(), c.empty, c.text].forEach((o) => o.destroy());
    this.counterFx.clear();
    for (const b of this.cashBadges.values()) b.destroy();
    this.cashBadges.clear();
    for (const p of this.tablePlates.values()) p.destroy();
    this.tablePlates.clear();
    this.door = undefined;
    const W = s.roomW;
    const H = s.roomH;
    const put = (k: string, x: number, y: number, depth: number, flip = false) => {
      if (!hasProp(k)) return undefined;
      const i = this.img(k, x, y, flip).setDepth(depth);
      this.staticLayer.push(i);
      return i;
    };
    const lot = drawLot(this, {
      w: W,
      h: H,
      wallKey: (side, i) => wallKey(s, side, i),
      floorKeys: (x, y) => floorKeys(s, x, y),
      wallItems: s.wallItems.map((w) => ({
        id: w.id,
        key: `${ITEM_BY_ID[w.item].art}_${w.wall}`,
        wall: w.wall,
        index: w.index,
      })),
      closed: s.closed,
      doorSign: true,
      scenery: scenery(W, H),
    });
    this.staticLayer.push(...lot.objects);
    this.wallViews = lot.walls;
    this.door = lot.door;
    // furniture (and chair backrests, drawn over whoever sits there)
    for (const f of s.furniture) {
      const p = iso(f.x, f.y);
      const a = furnArt(f.item, f.dir);
      const d = depthOf(f.x, f.y);
      const views = [put(a.key, p.x, p.y, d + 2, a.flip)];
      if (a.back) views.push(put(a.back, p.x, p.y, d + 6, a.flip));
      this.furnViews.set(
        f.id,
        views.filter((v): v is Phaser.GameObjects.Image => !!v),
      );
    }
    for (const st of s.stoves) {
      const f = s.furniture.find((x) => x.id === st.furnitureId);
      if (!f) continue;
      const p = iso(f.x, f.y);
      const d = depthOf(f.x, f.y);
      const art = ITEM_BY_ID[f.item].art;
      const topY = p.y - (KITCHEN_META.stoveTopZ[art] ?? 36);
      const flip = f.dir === 'se';
      const over = KITCHEN_META.stationFx[st.kind] ?? 'fx_steam_1';
      const fx = this.img(over, p.x, topY, flip)
        .setDepth(d + 3)
        .setVisible(false);
      const dish = this.img('dish_sliders', p.x, topY - 40)
        .setDepth(d + 8)
        .setVisible(false);
      const badge = this.img('fx_full', p.x + 18, topY - 46)
        .setDepth(d + 9)
        .setVisible(false);
      const ring = this.add.graphics().setDepth(d + 8);
      this.stoveFx.set(st.id, {
        fx,
        dish,
        badge,
        ring,
        topY,
        x: p.x,
        depth: d,
        smokeT: 0,
      });
    }
    for (const f of s.furniture) {
      if (itemOf(f).kind !== 'counter') continue;
      const p = iso(f.x, f.y);
      const d = depthOf(f.x, f.y);
      const top = p.y - (KITCHEN_META.counterTopZ[ITEM_BY_ID[f.item].art] ?? 36);
      // three spots along the top; each dish is a little stack of plates, taller the more servings
      const dishes = [0, 1, 2].map((i) =>
        [0, 1, 2, 3].map((k) =>
          this.img('dish_sliders', p.x - 9 + i * 9, top - 1 - i * 4.5 - k * 3.2)
            .setDepth(d + 3 + i * 0.1 + k * 0.01)
            .setVisible(false),
        ),
      );
      // nothing to serve: a bare plate, so the counter still reads as the counter
      const empty = this.img(this.textures.exists('plate_clean') ? 'plate_clean' : 'plate_dirty', p.x, top - 2)
        .setDepth(d + 3)
        .setAlpha(0.85)
        .setVisible(false);
      const text = this.add
        .text(p.x + 26, top - 20, '', {
          fontFamily: FONT_DISPLAY,
          fontSize: '13px',
          color: '#2A2418',
          backgroundColor: '#E8DFC4',
          padding: { x: 4, y: 1 },
        })
        .setResolution(Math.max(TEX_S, this.cameras.main.zoom))
        .setOrigin(0.5)
        .setDepth(d + 4);
      this.counterFx.set(f.id, { dishes, empty, text });
    }
    const ss = `${W}x${H}`;
    if (ss !== this.sizeSig) {
      this.sizeSig = ss;
      this.setupCamera(true);
    }
    this.drawGrid();
  }

  // ---------- camera & input ----------

  private setupCamera(recenter: boolean) {
    this.applyZoom(recenter);
  }

  /** CSS px hidden under the awning at the top of the screen (its scalloped hem is see-through). */
  private awningPx() {
    const b = document.querySelector('.awning')?.getBoundingClientRect().bottom;
    return Math.max(36, Math.min(100, (b ?? 58) - 12));
  }

  /** World y of the top of the back corner, plus room for whatever pops up over a tall fridge. */
  private wallTop() {
    return iso(-0.5, -0.5).y - WALL_H - 8;
  }

  /**
   * Camera bounds: the lot around the café, except that the top edge stops where the back walls'
   * top would slide under the awning.
   */
  private setBounds() {
    const s = this.ctl.state;
    const cam = this.cameras.main;
    const u = (window.devicePixelRatio || 1) / cam.zoom;
    const left = iso(-6, s.roomH + 5).x;
    const right = iso(s.roomW + 5, -6).x;
    const bottom = iso(s.roomW + 5, s.roomH + 5).y;
    const top = Math.min(this.wallTop() - (this.awningPx() + 6) * u, bottom - cam.height / cam.zoom);
    // a little room below, so the front row can be scrolled clear of the command strip
    const below = (STRIP_PX * (window.devicePixelRatio || 1)) / cam.zoom;
    cam.setBounds(left, top, right - left, bottom - top + below);
  }

  /**
   * Close in, like the original: the room's floor spans the screen and you pan around the lot. A
   * floor tile is kept between 10% and 16% of the screen width (the original's tutorial framing put a
   * tile at ~17% and a character at ~1/3 of the screen height), so big rooms stay a pan, not a speck.
   */
  private baseZoom() {
    const dpr = window.devicePixelRatio || 1;
    const s = this.ctl.state;
    const cssW = this.scale.width / dpr;
    const cssH = this.scale.height / dpr;
    const floorW = (s.roomW + s.roomH) * HW;
    const fill = Math.max(cssW / floorW, (cssH - 60) / ((s.roomW + s.roomH) * HH + WALL_H * 0.5));
    return Phaser.Math.Clamp(fill, (cssW * 0.1) / TILE_W, (cssW * 0.16) / TILE_W);
  }

  // ---------- camera moves: the tutorial's pans, and keeping a selection clear of the strip ----------

  /** World point of something in the café (its body, not its feet), or null if it isn't drawn. */
  private thingPoint(t: TutTarget): { x: number; y: number; top: number } | null {
    const s = this.ctl.state;
    if (t.t === 'worker' || t.t === 'customer') {
      const a = this.actors.get(t.id);
      if (!a?.holder.visible) return null;
      const h = a.puppet?.height ?? 100;
      return { x: a.holder.x, y: a.holder.y - h * 0.45, top: a.holder.y - h - 6 };
    }
    if (t.t === 'stove' || t.t === 'furniture') {
      const fid = t.t === 'stove' ? s.stoves.find((x) => x.id === t.id)?.furnitureId : t.id;
      const f = s.furniture.find((x) => x.id === fid);
      if (!f) return null;
      const p = iso(f.x, f.y);
      const it = ITEM_BY_ID[f.item];
      const lift = it.kind === "stove" ? (KITCHEN_META.stoveTopZ[it.art] ?? 36) + 12 : it.kind === "counter" ? (KITCHEN_META.counterTopZ[it.art] ?? 36) + 14 : 56;
      return { x: p.x, y: p.y - 30, top: p.y - lift };
    }
    if (t.t === 'door') {
      const a = wallAnchor('r', DOOR_X);
      return { x: a.x, y: a.y - WALL_H * 0.4, top: a.y - WALL_H * 0.78 };
    }
    return null;
  }

  /** Ease the camera (0.5 s) so a point sits in the middle of the free screen, between awning and strip. */
  focusOn(t: FocusTarget) {
    const p = 'thing' in t ? this.thingPoint(t.thing) : 'tile' in t ? { x: iso(t.tile.x, t.tile.y).x, y: iso(t.tile.x, t.tile.y).y - 30 } : t;
    if (!p) return;
    const cam = this.cameras.main;
    const dpr = window.devicePixelRatio || 1;
    const u = dpr / cam.zoom;
    // the free band's middle is a little above the screen's middle (the awning is shorter than the strip)
    const off = ((STRIP_PX - this.awningPx()) / 2) * u;
    cam.pan(p.x, p.y + off, 500, 'Cubic.easeOut', true);
  }

  /** A selection that lands under the command strip (or the awning) is scrolled into the clear. */
  private keepSelectionInView() {
    const sel = this.ctl.selection;
    if (!sel || this.ctl.mode !== 'play') return;
    const thing: TutTarget | null =
      sel.kind === 'worker' ? { t: 'worker', id: sel.id } : sel.kind === 'customer' ? { t: 'customer', id: sel.id } : sel.kind === 'stove' ? { t: 'stove', id: sel.id } : sel.kind === 'counter' || sel.kind === 'furniture' ? { t: 'furniture', id: sel.id } : null;
    const p = thing && this.thingPoint(thing);
    if (!p) return;
    const cam = this.cameras.main;
    const dpr = window.devicePixelRatio || 1;
    const sy = ((p.y - cam.worldView.y) * cam.zoom) / dpr;
    const sx = ((p.x - cam.worldView.x) * cam.zoom) / dpr;
    const h = cam.height / dpr;
    const w = cam.width / dpr;
    if (sy > h - STRIP_PX - 24 || sy < this.awningPx() + 20 || sx < 40 || sx > w - 40) this.focusOn({ x: p.x, y: p.y });
  }

  /** Per frame: the tutorial's arrow over its world target, and a pan whenever the target changes. */
  private updateTutorial() {
    const s = this.ctl.state;
    const t = this.ctl.mode === 'play' ? tutorialTarget(s, this.ctl.selection) : null;
    const key = targetKey(t);
    if (key !== this.tutKey) {
      this.tutKey = key;
      if (t && t.t !== 'dom') this.focusOn({ thing: t });
    }
    if (!this.arrow) this.arrow = this.add.graphics().setDepth(2e6);
    const g = this.arrow;
    const p = t && t.t !== 'dom' ? this.thingPoint(t) : null;
    if (!p) {
      g.setVisible(false);
      return;
    }
    // a fat red arrow pointing down at it, bobbing (drawn once, moved every frame)
    if (!g.getData('drawn')) {
      g.setData('drawn', true);
      const pts = [
        [-8, -46],
        [8, -46],
        [8, -20],
        [20, -20],
        [0, 0],
        [-20, -20],
        [-8, -20],
      ].map(([x, y]) => new Phaser.Math.Vector2(x, y));
      g.fillStyle(0x16120c, 0.35).fillPoints(pts.map((v) => new Phaser.Math.Vector2(v.x + 3, v.y + 4)), true);
      g.fillStyle(0xdf1e00, 1).fillPoints(pts, true);
      g.fillStyle(0xff6a4a, 1).fillRect(-5, -43, 4, 20);
      g.lineStyle(3, 0x16120c, 1).strokePoints(pts, true, true);
    }
    const bob = Math.abs(Math.sin(this.t * 5)) * 12;
    g.setVisible(true).setPosition(p.x, p.top - bob);
  }

  private applyZoom(recenter = false) {
    const dpr = window.devicePixelRatio || 1;
    const z = this.baseZoom() * this.userZoom;
    const cam = this.cameras.main;
    const keep = recenter ? null : { x: cam.midPoint.x, y: cam.midPoint.y };
    cam.setZoom(z * dpr);
    this.setBounds();
    if (keep) cam.centerOn(keep.x, keep.y);
    else {
      // the room's middle, nudged down the screen so the top of the back corner clears the awning
      const s = this.ctl.state;
      const c = iso((s.roomW - 1) / 2, (s.roomH - 1) / 2);
      const u = dpr / cam.zoom;
      const clear = this.wallTop() - (this.awningPx() + 6) * u + cam.height / cam.zoom / 2;
      cam.centerOn(c.x, Math.min(c.y - WALL_H * 0.32, clear));
    }
  }

  private setupInput() {
    this.input.addPointer(1);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.ctl.mode === 'raid') return;
      const pts = this.activePointers();
      if (pts.length >= 2) {
        this.pinch = {
          d: Phaser.Math.Distance.Between(pts[0].x, pts[0].y, pts[1].x, pts[1].y),
          z: this.userZoom,
        };
        this.drag = null;
        return;
      }
      const cam = this.cameras.main;
      // in edit mode, dragging the thing you're placing moves it instead of the camera
      const pl = this.ctl.placing;
      let placing = false;
      if (pl && !pl.wall) {
        const t = this.tileAt(p.worldX, p.worldY);
        placing = Math.abs(t.x - pl.x) < 1.3 && Math.abs(t.y - pl.y) < 1.3;
      }
      this.drag = {
        x: p.x,
        y: p.y,
        sx: cam.scrollX,
        sy: cam.scrollY,
        moved: false,
        placing,
      };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const pts = this.activePointers();
      if (this.pinch && pts.length >= 2) {
        const d = Phaser.Math.Distance.Between(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        this.userZoom = Phaser.Math.Clamp((this.pinch.z * d) / this.pinch.d, 0.55, 2.2);
        this.applyZoom();
        return;
      }
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.x;
      const dy = p.y - this.drag.y;
      if (Math.hypot(dx, dy) > 12) this.drag.moved = true;
      if (!this.drag.moved) return;
      if (this.drag.placing) {
        const t = this.tileAt(p.worldX, p.worldY);
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
      this.userZoom = Phaser.Math.Clamp(this.userZoom * (dy > 0 ? 0.9 : 1.1), 0.55, 2.2);
      this.applyZoom();
    });
  }

  private activePointers() {
    return [this.input.pointer1, this.input.pointer2].filter((p) => p && p.isDown);
  }

  /** The tile under a finger (nudged a little up the screen, where a fingertip actually lands). */
  private tileAt(wx: number, wy: number) {
    return worldToIso(wx, wy + 8, TILE_W, TILE_H);
  }

  /** Which back-wall segment (if any) a world point is on. */
  private wallAt(wx: number, wy: number): { wall: 'l' | 'r'; index: number } | null {
    const s = this.ctl.state;
    for (let i = 0; i < Math.max(s.roomW, s.roomH); i++) {
      if (i < s.roomH) {
        const cl = iso(0, i);
        if (wx >= cl.x - HW && wx <= cl.x) {
          const f = (wx - (cl.x - HW)) / HW;
          const bottom = cl.y - f * HH;
          if (wy <= bottom && wy >= bottom - WALL_H) return { wall: 'l', index: i };
        }
      }
      if (i < s.roomW) {
        const cr = iso(i, 0);
        if (wx >= cr.x && wx <= cr.x + HW) {
          const f = (wx - cr.x) / HW;
          const bottom = cr.y - HH + f * HH;
          if (wy <= bottom && wy >= bottom - WALL_H) return { wall: 'r', index: i };
        }
      }
    }
    return null;
  }

  private furnitureAt(wx: number, wy: number): Furniture | undefined {
    const s = this.ctl.state;
    // tall things are tapped on their body, which is drawn up the screen from their tile
    for (const off of [0, 25, 50, 75]) {
      const t = this.tileAt(wx, wy + off);
      const f = s.furniture.find((x) => x.x === Math.round(t.x) && x.y === Math.round(t.y));
      if (f) return f;
    }
    return undefined;
  }

  private editTap(wx: number, wy: number) {
    const ctl = this.ctl;
    if (ctl.painting) {
      const w = this.wallAt(wx, wy);
      if (ctl.painting.kind === 'wall' && w) return ctl.paintAt(w.wall, w.index);
      const t = this.tileAt(wx, wy);
      if (
        ctl.painting.kind === 'floor' &&
        isInside(Math.round(t.x), Math.round(t.y), {
          w: ctl.state.roomW,
          h: ctl.state.roomH,
        })
      )
        return ctl.paintAt(Math.round(t.x), Math.round(t.y));
      return;
    }
    const pl = ctl.placing;
    if (pl) {
      if (pl.wall) {
        const w = this.wallAt(wx, wy);
        if (w) ctl.moveWallPlacement(w.wall, w.index);
      } else {
        const t = this.tileAt(wx, wy);
        ctl.movePlacement(Math.round(t.x), Math.round(t.y));
      }
      return;
    }
    const f = this.furnitureAt(wx, wy);
    if (f) return ctl.selectEdit({ kind: 'furn', id: f.id });
    const w = this.wallAt(wx, wy);
    const hung = w && ctl.state.wallItems.find((x) => x.wall === w.wall && x.index === w.index);
    if (hung) return ctl.selectEdit({ kind: 'wall', id: hung.id });
    ctl.selectEdit(null);
  }

  private tap(wx: number, wy: number) {
    const s = this.ctl.state;
    if (this.ctl.selection?.kind === 'worker') {
      const f = this.furnitureAt(wx, wy);
      const st = f && s.stoves.find((x) => x.furnitureId === f.id);
      if (st) return this.ctl.tapStove(st.id);
    }
    // money-maker badges are big, friendly targets
    for (const [fid, b] of this.cashBadges) {
      if (b.visible && Math.abs(wx - b.x) < 18 && wy < b.y + 6 && wy > b.y - 30) return this.game.events.emit('collect', fid);
    }
    // closed up, the door is what you tap to reopen, even with the crew filing out through it to nap
    if (s.closed) {
      const dw = this.wallAt(wx, wy);
      if (dw && dw.wall === 'r' && dw.index === DOOR_X) return this.ctl.toggleClosed();
    }
    // characters: whoever's body is closest to the finger wins (front-most only breaks ties), so a
    // zombie half-hidden behind a customer is still easy to grab
    let best: { id: string; kind: 'w' | 'c' | 'p'; score: number } | null = null;
    // hit-test against each puppet's drawn bounds (standing, seated or lying), so a seated diner's
    // folded body and a taller standing figure in front of them are judged by what's actually on screen
    const consider = (id: string, kind: 'w' | 'c' | 'p') => {
      const a = this.actors.get(id);
      if (!a?.puppet || !a.holder.visible) return;
      // the part images carry transparent padding, so judge by a body-sized box: a narrow column up the
      // figure from its feet (wide and low when lying), topped where the drawn head ends
      const lying = Math.abs(a.puppet.body.rotation) > 0.5;
      const bb = a.puppet.root.getBounds();
      const cx = lying ? bb.centerX : a.holder.x;
      const hw = lying ? 44 : 22;
      const bottom = lying ? a.holder.y + 6 : bb.bottom - 4;
      const top = lying ? a.holder.y - 34 : Math.max(bb.top + 10, bottom - a.puppet.height - 6);
      const b = new Phaser.Geom.Rectangle(cx - hw, top, hw * 2, bottom - top);
      if (wx < b.left || wx > b.right || wy < b.top || wy > b.bottom) return;
      // distance to the body's centre line, measured relative to its size: being well inside a small
      // seated figure beats grazing the edge of a big one standing in front
      const nx = (wx - b.centerX) / Math.max(12, b.width / 2);
      const ny = (wy - b.centerY) / Math.max(12, b.height / 2);
      const score = nx * nx * 1.6 + ny * ny - a.holder.depth * 1e-7;
      if (!best || score < best.score) best = { id, kind, score };
    };
    for (const w of s.workers) if (w.state !== 'raiding') consider(w.id, 'w');
    for (const c of s.customers) if (c.state !== 'leaving' && c.state !== 'fleeing' && c.state !== 'infecting' && c.state !== 'turnedAway') consider(c.id, 'c');
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
      if (k === 'moneymaker' && payoutState(s, f.id) !== 'none') return this.game.events.emit('collect', f.id);
      if (k === 'table' && f.dirty) return this.ctl.info('A dirty plate. Your crew clears it to the sink when they’re free.');
      if (k === 'moneymaker' || k === 'keg' || k === 'pethouse' || k === 'tombstone' || k === 'table' || k === 'sink') return this.ctl.select({ kind: 'furniture', id: f.id });
    }
    // the front door: tap it to open or close the café (like the original)
    const w = this.wallAt(wx, wy);
    if (w && w.wall === 'r' && w.index === DOOR_X) return this.ctl.toggleClosed();
    this.ctl.tapNothing();
  }

  private onModeChange() {
    this.drawGrid();
    if (this.ctl.mode !== 'edit') for (const g of this.ghost) g.setVisible(false);
  }

  private diamond(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    const c = iso(x, y);
    g.beginPath();
    g.moveTo(c.x, c.y - HH);
    g.lineTo(c.x + HW, c.y);
    g.lineTo(c.x, c.y + HH);
    g.lineTo(c.x - HW, c.y);
    g.closePath();
    g.strokePath();
  }

  private drawGrid() {
    if (!this.grid) this.grid = this.add.graphics().setDepth(GROUND + 9e4);
    const g = this.grid;
    g.clear();
    if (this.ctl.mode !== 'edit') return;
    const s = this.ctl.state;
    g.lineStyle(1.2, 0xf2e7c4, 0.35);
    for (let y = 0; y < s.roomH; y++) for (let x = 0; x < s.roomW; x++) this.diamond(g, x, y);
    // the front lawn takes tombstones and pet houses
    const pl = this.ctl.placing;
    if (pl && !pl.wall && ITEM_BY_ID[pl.itemId]?.outdoor) {
      g.lineStyle(1.2, 0xc8e08a, 0.45);
      for (let y = 0; y <= s.roomH + 3; y++) for (let x = 0; x <= s.roomW + 3; x++) if (onLawn(x, y, { w: s.roomW, h: s.roomH })) this.diamond(g, x, y);
    }
  }

  private updateEdit() {
    const ctl = this.ctl;
    const pl = ctl.placing;
    const sel = ctl.editSel;
    const pulse = 0.5 + Math.sin(this.t * 6) * 0.5;
    // placing: everything else goes see-through (the original's way), the piece being moved more so
    for (const [id, vs] of this.furnViews) for (const v of vs) v.setAlpha(pl?.source === 'move' && pl.id === id ? 0.25 : pl && !pl.wall ? 0.45 : 1);
    for (const [id, v] of this.wallViews) {
      const moving = pl?.source === 'move' && pl.id === id;
      const picked = sel?.kind === 'wall' && sel.id === id;
      const painting = ctl.painting && ctl.mode === 'edit' && id.length <= 3 && id[0] === (ctl.painting.kind === 'wall' ? id[0] : '#');
      v.setAlpha(moving ? 0.25 : picked ? 0.7 + pulse * 0.3 : 1).setTint(painting ? 0xf4f0d8 : 0xffffff);
    }
    // footprint diamonds on the floor: gold under the picked piece, green / red under the one being placed
    if (!this.footG) this.footG = this.add.graphics().setDepth(GROUND + 9e4 + 1);
    const fg = this.footG;
    fg.clear();
    if (ctl.mode === 'edit') {
      const pf = sel?.kind === 'furn' ? ctl.state.furniture.find((f) => f.id === sel.id) : undefined;
      if (pf && !pl) this.footprint(fg, pf.x, pf.y, 0xe5b53c, 0.16 + pulse * 0.14, 0.7 + pulse * 0.3);
      if (pl && !pl.wall) {
        // every tile it could go on glows green (the original's "green boxes")
        const k = `${pl.itemId}|${pl.dir}|${pl.source}|${layoutVersion(ctl.state)}`;
        if (k !== this.okTilesKey) {
          this.okTilesKey = k;
          this.okTiles = ctl.placeableTiles();
        }
        for (const t of this.okTiles) if (t.x !== pl.x || t.y !== pl.y) this.footprint(fg, t.x, t.y, 0x7fc24a, 0.14 + pulse * 0.08, 0.35);
        const ok = !ctl.placementProblem();
        this.footprint(fg, pl.x, pl.y, ok ? 0x7fc24a : 0xd04a3a, 0.32, 1);
      }
    }
    if (!pl || ctl.mode !== 'edit') {
      for (const g of this.ghost) g.setVisible(false);
      this.panKey = '';
      return;
    }
    const def = ITEM_BY_ID[pl.itemId];
    const parts: { key: string; x: number; y: number; flip: boolean }[] = [];
    if (pl.wall) {
      const a = wallAnchor(pl.wall.wall, pl.wall.index);
      parts.push({
        key: `${def.art}_${pl.wall.wall}`,
        x: a.x,
        y: a.y,
        flip: false,
      });
    } else {
      const c = iso(pl.x, pl.y);
      const a = furnArt(pl.itemId, pl.dir);
      parts.push({ key: a.key, x: c.x, y: c.y, flip: a.flip });
      if (a.back) parts.push({ key: a.back, x: c.x, y: c.y, flip: a.flip });
    }
    void ensureProps(
      this,
      parts.map((p) => p.key),
    );
    const ok = !ctl.placementProblem();
    parts.forEach((p, i) => {
      let g = this.ghost[i];
      if (!g) g = this.ghost[i] = this.add.image(0, 0, '__MISSING');
      const m = propMeta(p.key);
      if (this.textures.exists(p.key)) g.setTexture(p.key);
      g.setScale(1 / texScale(p.key))
        .setFlipX(p.flip)
        .setOrigin(m ? (p.flip ? 1 - m.ox : m.ox) : 0.5, m?.oy ?? 1)
        .setPosition(p.x, p.y)
        .setDepth(9e5 + i)
        .setVisible(true)
        .setTint(ok ? 0xd8ffc4 : 0xff9a90)
        .setAlpha(0.72 + Math.sin(this.t * 6) * 0.12);
    });
    for (let i = parts.length; i < this.ghost.length; i++) this.ghost[i].setVisible(false);
    // a wall hanging's ghost can start off-screen: bring it into view once per new spot
    if (pl.wall) {
      const a = wallAnchor(pl.wall.wall, pl.wall.index);
      const k = `${pl.itemId}:${pl.wall.wall}${pl.wall.index}`;
      if (k !== this.panKey) {
        this.panKey = k;
        const v = this.cameras.main.worldView;
        const y = a.y - WALL_H * 0.55;
        if (a.x < v.x + 40 || a.x > v.right - 40 || y < v.y + 60 || y > v.bottom - 40) this.cameras.main.pan(a.x, y, 350, 'Sine.easeInOut');
      }
    }
  }

  private footprint(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number, fill: number, line: number) {
    const c = iso(x, y);
    const pts = [new Phaser.Math.Vector2(c.x, c.y - HH), new Phaser.Math.Vector2(c.x + HW, c.y), new Phaser.Math.Vector2(c.x, c.y + HH), new Phaser.Math.Vector2(c.x - HW, c.y)];
    g.fillStyle(col, fill).fillPoints(pts, true);
    g.lineStyle(2.4, 0x16120c, 0.6 * line).strokePoints(pts, true, true);
    g.lineStyle(1.6, col, line).strokePoints(pts, true, true);
  }

  // ---------- characters ----------

  /** -1..1 stereo position of a tile column: diners chew on the side they sit. */
  private panOf(x: number): number {
    const w = Math.max(1, this.ctl.state.roomW - 1);
    return Math.max(-0.6, Math.min(0.6, ((x / w) * 2 - 1) * 0.6));
  }

  /** Random background chatter for one actor: at most one sound every `min..max` seconds. */
  private chatter(id: string, name: 'chew' | 'mutter', x: number, min: number, max: number, volume: number) {
    const next = this.nextChatter.get(id);
    if (next === undefined) {
      this.nextChatter.set(id, this.t + min + Math.random() * (max - min));
      return;
    }
    if (this.t < next) return;
    this.nextChatter.set(id, this.t + min + Math.random() * (max - min));
    sfx(name, { volume, pan: this.panOf(x), pitch: 0.9 + Math.random() * 0.2 });
  }

  private actor(id: string, charId: string): Actor | null {
    let a = this.actors.get(id);
    if (a && a.charId !== charId) {
      a.holder.destroy();
      this.actors.delete(id);
      a = undefined;
    }
    if (!a) {
      const holder = this.add.container(0, 0);
      const shadow = this.add.ellipse(0, 0, 34, 11, 0x16120c, 0.28);
      holder.add(shadow);
      a = {
        puppet: null,
        charId,
        loading: false,
        barQ: -1,
        faceUntil: 0,
        holder,
        shadow,
      };
      this.actors.set(id, a);
    }
    if (!a.puppet) {
      const ca = charLoaded(this, charId) ? charArt(charId) : null;
      if (ca) {
        a.puppet = new Puppet(this, ca);
        a.holder.addAt(a.puppet.root, 1);
      } else if (!a.loading) {
        a.loading = true;
        void loadChar(this, charId).then(() => a && (a.loading = false));
      }
    }
    return a;
  }

  /** A floating icon over someone's head (optionally a thought bubble with a dish in it). */
  private bubble(a: Actor, key: string | null, y: number, x = 6, dish?: string) {
    if (!key) {
      a.bubble?.setVisible(false);
      a.bubbleDish?.setVisible(false);
      return;
    }
    if (!a.bubble) {
      a.bubble = this.img(key, x, y);
      a.holder.add(a.bubble);
    }
    const bob = Math.sin(this.t * 3 + a.holder.x * 0.01) * 1.5;
    a.bubble
      .setTexture(this.textures.exists(key) ? key : '__MISSING')
      .setVisible(true)
      .setPosition(x, y + bob);
    if (dish && this.textures.exists(dish)) {
      if (!a.bubbleDish) {
        a.bubbleDish = this.img(dish, 0, 0);
        a.holder.add(a.bubbleDish);
      }
      // centre the dish in the cloud's empty middle
      const top = y + bob - BUBBLE_H;
      a.bubbleDish
        .setTexture(dish)
        .setVisible(true)
        .setScale(0.62 / TEX_S)
        .setPosition(x - 17 + BUBBLE_SLOT.x, top + BUBBLE_SLOT.y);
    } else a.bubbleDish?.setVisible(false);
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
    g.fillStyle(0x16120c, 0.9).fillRect(-15, 0, 30, 5);
    g.fillStyle(f > 0.5 ? 0x7a9a32 : f > 0.25 ? 0xc9a63a : 0xa3342a, 1).fillRect(-14, 1, Math.max(1.5, 28 * f), 3);
  }

  private syncWorker(w: Worker, dt: number) {
    const a = this.actor(w.id, charIdFor(w));
    if (!a) return;
    const raiding = w.state === 'raiding';
    a.holder.setVisible(!raiding);
    if (raiding) return;
    const p = iso(w.x, w.y);
    a.holder.setPosition(p.x, p.y).setDepth(moverDepth(w.x, w.y, 4));
    const pup = a.puppet;
    if (!pup) return;
    const zombie = w.kind === 'zombie';
    const moving = w.path.length > 0;
    if (zombie && (w.state === 'idle' || w.state === 'daydream' || w.state === 'cooking')) this.chatter(w.id, 'mutter', w.x, 9, 22, 0.5);
    pup.setFacing(w.facing, !!w.back);
    // a server who just set a plate down leans in over the table for a beat (the original's serve clip)
    const serving = w.state === 'carrying' && w.job?.kind === 'serve';
    if (a.wasServing && !serving) a.serveAt = this.t;
    a.wasServing = serving;
    const serveT = this.t - (a.serveAt ?? -9);
    let pose: Parameters<Puppet['pose']>[0] = 'idle';
    if ((w.state === 'resting' || w.state === 'down') && !moving) pose = 'lie';
    else if (w.state === 'feasting') pose = 'feast';
    else if (serveT < 0.5) pose = 'serve';
    else if (moving) pose = w.state === 'hunting' ? 'run' : 'walk';
    else if (w.state === 'cooking') pose = 'cook';
    pup.pose(pose, dt, {
      zombie: zombie && w.state !== 'cooking' && pose !== 'serve',
      speed: w.state === 'hunting' ? 1.3 : 1,
      carry: pose !== 'serve' && (w.state === 'carrying' || w.state === 'carryDish' || w.state === 'carryPlate'),
      attackT: pose === 'serve' ? serveT : undefined,
    });
    const face = this.t < a.faceUntil ? a.face : w.state === 'resting' ? 'sleep' : w.state === 'down' ? 'dazed' : w.state === 'hunting' || w.state === 'feasting' ? 'chomp' : undefined;
    pup.setFace(face as never);
    a.shadow.setVisible(pose !== 'lie').setScale(1);
    // what they're carrying: a plate of food to a table, a pot from the stove, or dirty plates
    let carry: string | null = null;
    if (w.state === 'carrying' && w.job?.kind === 'serve') carry = DISH_BY_ID[w.job.dish]?.icon ?? null;
    else if (w.state === 'carryDish' && w.job?.kind === 'dish' && w.job.dish) carry = DISH_BY_ID[w.job.dish]?.icon ?? null;
    else if (w.state === 'carryPlate') carry = 'plate_stack';
    if (carry && this.textures.exists(carry)) {
      if (!a.carry) {
        a.carry = this.img(carry, 0, 0);
        a.holder.add(a.carry);
      }
      // held out in front at waist height; behind the body when walking away from the camera
      a.carry
        .setTexture(carry)
        .setVisible(true)
        .setPosition(16 * w.facing, -pup.height * 0.5 + Math.sin(this.t * 9) * 0.8);
      a.holder.bringToTop(a.carry);
      if (w.back) a.holder.sendToBack(a.carry);
    } else a.carry?.setVisible(false);
    let b: string | null = null;
    if (w.state === 'resting') b = 'face_sleep';
    else if (w.state === 'down') b = 'fx_skull';
    else if (w.state === 'daydream') b = 'fx_daydream';
    else if (w.state === 'hunting') b = 'face_angry';
    const lying = pose === 'lie';
    this.bubble(a, b, lying ? -30 : -pup.height - 14, lying ? 22 : 6);
    this.energyBar(a, w.energy / maxEnergy(w), lying ? -24 : -pup.height - 4);
    if (w.kind === 'you' && !a.tag) {
      a.tag = this.add
        .text(0, 0, 'YOU', {
          fontFamily: FONT_DISPLAY,
          fontSize: '11px',
          color: '#F2E7C4',
          backgroundColor: '#3B1A14',
          padding: { x: 4, y: 1 },
        })
        .setResolution(TEX_S)
        .setOrigin(0.5, 1);
      a.holder.add(a.tag);
    }
    if (a.tag) a.tag.y = lying ? -32 : -pup.height - 7;
    const sel = this.ctl.selection;
    const selected = (sel?.kind === 'worker' && sel.id === w.id) || (sel?.kind === 'dishPicker' && sel.workerId === w.id);
    this.selRing(a, selected, pose === 'lie');
  }

  /** A pulsing gold ring on the ground (no tint: the character keeps its colours). */
  private selRing(a: Actor, on: boolean, lying = false) {
    if (!on) {
      a.sel?.setVisible(false);
      return;
    }
    if (!a.sel) {
      a.sel = this.add.ellipse(0, 0, 44, 16, 0xe5b53c, 0.18).setStrokeStyle(2.2, 0xe5b53c, 1);
      a.holder.addAt(a.sel, 0);
    }
    const k = 1 + Math.sin(this.t * 6) * 0.08;
    a.sel
      .setVisible(true)
      .setPosition(lying ? 14 : 0, 0)
      .setScale(k * (lying ? 1.6 : 1), k)
      .setAlpha(0.75 + Math.sin(this.t * 6) * 0.25);
  }

  /** Seat position for a customer on their chair, and which way they face. */
  private seatPose(c: Customer): { x: number; y: number; facing: 1 | -1; back: boolean } | null {
    const s = this.ctl.state;
    const seat = s.furniture.find((f) => f.id === c.seatId);
    if (!seat) return null;
    const p = iso(seat.x, seat.y);
    const dir = seat.dir ?? 'sw';
    const off = FURN_META.seatOffset[dir];
    const fam = chairFamilyOf(furnArt(seat.item, dir).key) ?? 'plain';
    const z = FURN_META.seatZ[fam] ?? 18;
    // hips on the seat: the puppet's root (its feet) goes hip-height below the seat
    const hip = this.actors.get(c.id)?.puppet?.hipY ?? 20;
    return {
      x: p.x + off.dx,
      y: p.y + off.dy - z + hip,
      facing: dir === 'se' || dir === 'ne' ? 1 : -1,
      back: dir === 'ne' || dir === 'nw',
    };
  }

  private syncCustomer(c: Customer, dt: number) {
    const a = this.actor(c.id, c.type);
    if (!a) return;
    const s = this.ctl.state;
    if (c.state === 'eating') this.chatter(c.id, 'chew', c.x, 2.2, 4.5, 0.45);
    const seated = (c.state === 'waiting' || c.state === 'eating') && c.path.length === 0;
    const sp = seated ? this.seatPose(c) : null;
    const p = sp ?? iso(c.x, c.y);
    // a sitter sorts just above their own chair: under the table when facing the camera, and under the
    // chair's backrest when sitting with their back to us
    a.holder.setPosition(p.x, p.y).setDepth(seated ? depthOf(c.x, c.y) + 4 : moverDepth(c.x, c.y, 4));
    a.shadow.setVisible(!seated);
    // the food in front of a diner
    const plate = this.tablePlates.get(c.id);
    if (c.state === 'eating' && c.dish) {
      const seat = s.furniture.find((f) => f.id === c.seatId);
      const table = seat && chairTable(s, seat);
      if (table && !plate) {
        const tp = iso(table.x, table.y);
        const off = FURN_META.plateOffset[ITEM_BY_ID[table.item].art] ?? {
          dx: 0,
          dy: -30,
        };
        const toward = iso(seat.x, seat.y);
        const d = this.img(DISH_BY_ID[c.dish].icon, tp.x + off.dx + (toward.x - tp.x) * 0.16, tp.y + off.dy + (toward.y - tp.y) * 0.16).setDepth(depthOf(table.x, table.y) + 3);
        this.tablePlates.set(c.id, d);
      }
    } else if (plate) {
      plate.destroy();
      this.tablePlates.delete(c.id);
    }
    const pup = a.puppet;
    if (!pup) return;
    if (sp) pup.setFacing(sp.facing, sp.back);
    else pup.setFacing(c.facing, !!c.back && c.path.length > 0);
    const pose = c.state === 'infecting' ? 'shiver' : c.state === 'fleeing' ? 'run' : c.path.length ? 'walk' : c.state === 'eating' ? 'eat' : seated ? 'sit' : 'idle';
    pup.pose(pose, dt, { speed: c.state === 'fleeing' ? 1.6 : 1, seated, impatient: c.state === 'waiting' && c.waitLeft < 25 });
    const face =
      c.state === 'fleeing'
        ? 'scream'
        : c.state === 'infecting'
          ? 'shock'
          : c.state === 'eating'
            ? 'eat'
            : c.mood === 'angry' || c.state === 'turnedAway'
              ? 'angry'
              : c.mood === 'happy'
                ? 'happy'
                : undefined;
    pup.setFace(face as never);
    let b: string | null = null;
    let dish: string | undefined;
    if (c.state === 'fleeing') b = 'fx_full';
    else if (c.state === 'waiting' && seated) {
      if (c.waitLeft < 20) b = 'fx_sweat';
      else {
        b = 'bubble_think';
        const slot = s.counter.find((x) => x.dish && x.servings > 0);
        dish = DISH_BY_ID[slot?.dish ?? 'sliders'].icon;
      }
    }
    this.bubble(a, b, -pup.height - 6, 8, dish);
    const sel = this.ctl.selection;
    if (c.state === 'infecting') pup.setTint(Math.sin(this.t * 30) > 0 ? 0x9be36b : 0xffffff);
    else pup.clearTint();
    this.selRing(a, sel?.kind === 'customer' && sel.id === c.id);
    // a seated diner's ring sits on the chair's floor tile, not up on the seat
    if (a.sel?.visible && sp) a.sel.setPosition(-(sp.x - iso(c.x, c.y).x), -(sp.y - iso(c.x, c.y).y));
  }

  private syncPet(p: Pet, dt: number) {
    const a = this.actor(p.id, p.type === 'pug' ? 'pet_pug' : 'pet_rotweiler');
    if (!a) return;
    a.holder.setVisible(p.state !== 'raiding');
    const w = iso(p.x, p.y);
    a.holder.setPosition(w.x, w.y).setDepth(moverDepth(p.x, p.y, 3));
    if (!a.puppet) return;
    a.puppet.setFacing(p.facing);
    a.puppet.pose(p.path.length ? 'walk' : 'idle', dt);
    this.bubble(a, p.state === 'sniff' ? 'fx_cash' : null, -a.puppet.height - 4);
  }

  // ---------- per-frame ----------

  update(_time: number, deltaMs: number) {
    if (!this.ready) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.t += dt;
    this.ctl.update(dt);
    const s = this.ctl.state;
    // layoutVersion is an allocation-free fingerprint of the room, walls, floors and furniture
    const sig = layoutVersion(s);
    if (sig !== this.layoutSig) {
      this.layoutSig = sig;
      this.rebuild();
    }
    // the front door swings open for whoever comes through, and the board flips when the café closes
    if (this.door) {
      this.door.setSign(s.closed ? 'ui_closed' : 'ui_open');
      let near = false;
      for (const w of s.workers) if (w.state !== 'raiding' && nearDoor(w)) near = true;
      if (!near) for (const c of s.customers) if (c.x > -999 && nearDoor(c)) near = true;
      if (!near) for (const p of s.pets) if (nearDoor(p)) near = true;
      this.door.update(dt, this.t, near, !!s.closed);
      if (near !== this.doorWasNear) {
        this.doorWasNear = near;
        if (this.t > 1.5) sfx(near ? 'doorOpen' : 'doorClose', { volume: 0.6 });
      }
    }
    const alive = this.alive;
    alive.clear();
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
        this.nextChatter.delete(id);
        this.tablePlates.get(id)?.destroy();
        this.tablePlates.delete(id);
      }
    this.updateRemains();
    this.updateStations(dt);
    this.updateEdit();
    this.updateTutorial();
  }

  /** A customer eaten where they stood: their body drops (dazed, flat on the floor) under the feasting
   * zombie, then gives way to a pile of bones that lies there 10 s and fades over 3 s (original). */
  private dropRemains(x: number, y: number, charId: string) {
    const p = iso(x, y);
    // on the floor: under anyone standing on that tile
    const floor = moverDepth(x, y, -2);
    const bones = this.img(`bones_pile_${this.bonesN++ % 3}`, p.x, p.y).setDepth(floor).setAlpha(0);
    bones.setScale(1.3 / TEX_S);
    let body: Phaser.GameObjects.Container | null = null;
    const art = charLoaded(this, charId) ? charArt(charId) : null;
    if (art) {
      const pup = new Puppet(this, art);
      pup.setFacing(Math.random() < 0.5 ? 1 : -1);
      pup.pose('lie', 0);
      pup.setFace('dazed' as never);
      body = this.add.container(p.x, p.y, [pup.root]).setDepth(floor + 1);
    }
    this.remains.push({ body, bones, t0: this.t });
  }

  private updateRemains() {
    const feast = TUNING.feastSec;
    this.remains = this.remains.filter((r) => {
      const age = this.t - r.t0;
      // the body crossfades into bones as the zombie finishes
      const swap = Phaser.Math.Clamp((age - feast + 0.4) / 0.4, 0, 1);
      if (r.body) {
        r.body.setAlpha(1 - swap);
        if (swap >= 1) {
          r.body.destroy();
          r.body = null;
        }
      }
      const fade = age > feast + 10 ? 1 - (age - feast - 10) / 3 : 1;
      r.bones.setAlpha(Math.max(0, Math.min(swap, fade)));
      if (fade <= 0) {
        r.bones.destroy();
        return false;
      }
      return true;
    });
  }

  private updateStations(dt: number) {
    const s = this.ctl.state;
    for (const st of s.stoves) {
      const fx = this.stoveFx.get(st.id);
      if (!fx) continue;
      const cooking = st.status === 'cooking';
      const burnt = st.status === 'burnt';
      // flames / bubbles / steam while cooking; a charred pot when it burns
      if (st.kind === 'stove' || st.kind === 'smoker') {
        const k = burnt ? 'pot_burnt' : `fx_steam_${1 + (Math.floor(this.t * 5) % 3)}`;
        if (this.textures.exists(k) && fx.fx.texture.key !== k) fx.fx.setTexture(k);
        fx.fx.setVisible(cooking || burnt).setY(fx.topY - (st.kind === 'smoker' && !burnt ? 22 : 0));
      } else {
        fx.fx.setVisible(cooking).setScale((1 / TEX_S) * (1 + Math.sin(this.t * 13) * 0.06), 1 / TEX_S);
      }
      const done = st.status === 'done' || burnt;
      fx.dish.setVisible(st.status === 'done');
      fx.badge.setVisible(done);
      if (done) {
        if (st.status === 'done') {
          const k = DISH_BY_ID[st.dish!].icon;
          if (fx.dish.texture.key !== k && this.textures.exists(k)) fx.dish.setTexture(k);
          fx.dish.y = fx.topY - 42 - Math.abs(Math.sin(this.t * 4)) * 4;
        }
        // the burn warning: the "!" pulses faster as the dish gets close to burning
        const left = (st.burnAt ?? Infinity) - s.now;
        fx.badge.setScale((1 / TEX_S) * (1 + (burnt || left < 30 ? Math.abs(Math.sin(this.t * 10)) * 0.35 : 0)));
        if (burnt) fx.badge.setTint(0x888888);
        else fx.badge.clearTint();
      }
      fx.ring.clear();
      // the cook timer: a gold arc filling a cream ring (hidden while this stove's card is open: the
      // card has the same bar, bigger)
      const carded = this.ctl.selection?.kind === 'stove' && this.ctl.selection.id === st.id;
      if ((cooking || st.status === 'paused') && st.dish && st.total && !carded) {
        const pct = Phaser.Math.Clamp(1 - (st.left ?? 0) / st.total, 0, 1);
        const y = fx.topY - 50;
        const R = 7.5;
        const g = fx.ring;
        g.fillStyle(0x16120c, 0.35).fillCircle(fx.x + 0.8, y + 1.2, R + 2.2);
        g.lineStyle(5.4, 0x16120c, 1).strokeCircle(fx.x, y, R);
        g.lineStyle(3.4, 0xe8dfc4, 1).strokeCircle(fx.x, y, R);
        g.lineStyle(3.4, st.status === 'paused' ? 0x8a857a : 0xd9a930, 1)
          .beginPath()
          .arc(fx.x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
          .strokePath();
        if (st.status === 'paused') {
          // paused: nobody at the stove (the original's cooks had to stay put)
          g.fillStyle(0x16120c, 1)
            .fillRect(fx.x - 3, y - 3.5, 2, 7)
            .fillRect(fx.x + 1, y - 3.5, 2, 7);
        }
      }
      if (burnt && (fx.smokeT += dt) > 0.5) {
        fx.smokeT = 0;
        const k = 'fx_steam_2';
        if (this.textures.exists(k)) {
          const puff = this.img(k, fx.x + (Math.random() - 0.5) * 10, fx.topY - 8)
            .setDepth(fx.depth + 7)
            .setTint(0x3a3833)
            .setAlpha(0.9);
          this.tweens.add({
            targets: puff,
            y: puff.y - 44,
            x: puff.x + 10,
            alpha: 0,
            scale: (1 / TEX_S) * 1.7,
            duration: 1800,
            onComplete: () => puff.destroy(),
          });
        }
      }
    }
    // counters: up to three dishes, each a stack of plates (1–4 by servings), and the servings left
    for (const [fid, c] of this.counterFx) {
      const slots = s.counter.filter((x) => x.furnitureId === fid && x.dish && x.servings > 0);
      const total = slots.reduce((a, x) => a + x.servings, 0);
      c.dishes.forEach((stack, i) => {
        const slot = slots[i];
        const n = !slot ? 0 : slot.servings >= 15 ? 4 : slot.servings >= 8 ? 3 : slot.servings >= 4 ? 2 : 1;
        stack.forEach((d, k) => {
          d.setVisible(k < n);
          if (k < n) {
            const key = DISH_BY_ID[slot!.dish!].icon;
            if (d.texture.key !== key && this.textures.exists(key)) d.setTexture(key);
          }
        });
      });
      c.empty.setVisible(total === 0);
      c.text.setVisible(total > 0);
      const label = `×${total}`;
      if (total > 0 && c.text.text !== label) c.text.setText(label);
    }
    // money-makers: "$" when there's cash in them, "!" when they're full and have stopped earning
    for (const f of s.furniture) {
      if (itemOf(f).kind !== 'moneymaker') continue;
      const state = payoutState(s, f.id);
      let b = this.cashBadges.get(f.id);
      if (!b && state !== 'none') {
        const p = iso(f.x, f.y);
        b = this.img('fx_cash', p.x, p.y - 96).setDepth(depthOf(f.x, f.y) + 9);
        this.cashBadges.set(f.id, b);
      }
      if (b) {
        b.setVisible(state !== 'none');
        const k = state === 'full' ? 'fx_full' : 'fx_cash';
        if (b.texture.key !== k && this.textures.exists(k)) b.setTexture(k);
        b.y = iso(f.x, f.y).y - 96 - Math.abs(Math.sin(this.t * 3)) * 6;
      }
    }
    // dirty plates left on tables
    for (const f of s.furniture) {
      if (itemOf(f).kind !== 'table') continue;
      const id = `dirty:${f.id}`;
      const v = this.tablePlates.get(id);
      if (f.dirty && !v && this.textures.exists('plate_dirty')) {
        const tp = iso(f.x, f.y);
        const off = FURN_META.plateOffset[ITEM_BY_ID[f.item].art] ?? {
          dx: 0,
          dy: -30,
        };
        this.tablePlates.set(id, this.img('plate_dirty', tp.x + off.dx, tp.y + off.dy).setDepth(depthOf(f.x, f.y) + 3));
      } else if (!f.dirty && v) {
        v.destroy();
        this.tablePlates.delete(id);
      }
    }
  }

  // ---------- juice ----------

  /** A floating label (pooled, crisp, stacked per anchor: see floattext.ts). */
  floatText(x: number, y: number, text: string, color: string, size = 16, opts: FloatOpts = {}) {
    this.floats ??= new FloatTexts(this, 20);
    this.floats.show(x, y, text, color, { size, ...opts });
  }

  private popIcon(x: number, y: number, key: string) {
    if (!this.textures.exists(key)) return;
    const i = this.img(key, x, y).setDepth(1e6).setScale(0);
    this.tweens.add({
      targets: i,
      scale: 1 / TEX_S,
      duration: 220,
      ease: 'Back.Out',
    });
    this.tweens.add({
      targets: i,
      y: y - 26,
      alpha: 0,
      delay: 700,
      duration: 700,
      onComplete: () => i.destroy(),
    });
  }

  private fx(e: GameEvent) {
    if (!this.ready) return;
    const s = this.ctl.state;
    switch (e.t) {
      case 'coin': {
        const p = iso(e.x, e.y);
        // one popup per customer: the "$" and the amount are a single label
        this.floatText(p.x, p.y - 96, `${e.amount + e.tip}`, '#E3CB5E', 17, { icon: 'fx_cash', force: true, anchor: `c${Math.round(e.x * 2)},${Math.round(e.y * 2)}` });
        // a tip gets the "cha-ching"; a plain bill just the coin
        sfx(e.tip > 0 ? 'tip' : 'coin', { volume: 0.6, pan: this.panOf(e.x) });
        break;
      }
      case 'face': {
        const p = iso(e.x, e.y);
        // a happy diner just pays (the coin label says it all); only a stormy exit gets a face
        if (!e.happy) this.popIcon(p.x, p.y - 112, 'face_angry');
        break;
      }
      case 'xp': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 104, `+${e.amount} XP`, '#A9D3DA', 16, { force: true, anchor: `s${e.x},${e.y}` });
        break;
      }
      case 'eaten': {
        // the victim falls out of their seat, onto the floor at the zombie's feet (not hidden under the
        // table), and that's where the bones end up
        const z = s.workers.find((w) => w.id === e.workerId);
        const k = 0.55;
        this.dropRemains(z ? z.x + (e.x - z.x) * k : e.x, z ? z.y + (e.y - z.y) * k : e.y, e.type);
        sfx('feast', { volume: 0.8, pan: this.panOf(e.x) });
        // the bones land as the body fades out (see updateRemains)
        setTimeout(() => sfx('bones', { volume: 0.7, pan: this.panOf(e.x) }), Math.max(0, TUNING.feastSec - 0.2) * 1000);
        break;
      }
      case 'panic':
        sfx('panic', { volume: 0.7 });
        setTimeout(() => sfx('groupScream'), 180);
        break;
      case 'rareArrival':
        sfx('rareArrival', { volume: 0.8 });
        break;
      case 'hungry': {
        const w = s.workers.find((x) => x.id === e.workerId);
        sfx('hungry', { volume: 0.8, pan: w ? this.panOf(w.x) : 0 });
        break;
      }
      case 'outOfFood':
        sfx('outOfFood', { volume: 0.7 });
        break;
      case 'burnSoon':
        sfx('burnSoon', { volume: 0.6 });
        break;
      case 'woke':
        if (e.from !== 'down') sfx('refresh', { volume: 0.5 });
        break;
      case 'bite': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 112, 'CHOMP!', '#D9513E', 20, { force: true, anchor: e.workerId });
        this.popIcon(p.x, p.y - 50, 'fx_hit');
        this.cameras.main.shake(180, 0.004);
        const a = this.actors.get(e.workerId);
        if (a) {
          a.face = 'chomp';
          a.faceUntil = this.t + 0.8;
        }
        sfx('chomp');
        setTimeout(() => sfx('scream', { pitch: 0.9 + Math.random() * 0.3 }), 150);
        haptic('heavy');
        break;
      }
      case 'infected': {
        const w = s.workers.find((x) => x.id === e.workerId);
        if (!w) break;
        const p = iso(w.x, w.y);
        this.floatText(p.x, p.y - 120, 'INFECTED!', '#9BD62E', 19, { force: true, anchor: w.id });
        this.popIcon(p.x, p.y - 40, 'fx_stink');
        sfx('infect');
        const a = this.actors.get(w.id);
        if (a) {
          a.holder.setScale(0.6, 1.3);
          this.tweens.add({
            targets: a.holder,
            scaleX: 1,
            scaleY: 1,
            duration: 450,
            ease: 'Elastic.Out',
          });
          a.face = 'chomp';
          a.faceUntil = this.t + 1.2;
        }
        break;
      }
      case 'cookStart':
        sfx('sizzle', { volume: 0.7 });
        break;
      case 'dishDone': {
        sfx('ding');
        const fx = this.stoveFx.get(e.stoveId);
        if (fx) this.popIcon(fx.x, fx.topY - 30, 'fx_star');
        break;
      }
      case 'burnt':
        sfx('burn');
        break;
      case 'payout': {
        const f = s.furniture.find((x) => x.id === e.furnitureId);
        if (f) {
          const p = iso(f.x, f.y);
          this.floatText(p.x, p.y - 108, `${e.amount}`, '#E3CB5E', 18, { icon: 'fx_cash', force: true, anchor: f.id });
        }
        sfx('cashRegister');
        break;
      }
      case 'petFind': {
        const pet = s.pets.find((x) => x.id === e.petId);
        if (pet) {
          const p = iso(pet.x, pet.y);
          this.floatText(p.x, p.y - 50, `${e.amount}`, '#E3CB5E', 16, { icon: 'fx_cash', force: true, anchor: pet.id });
        }
        sfx('pugSnort');
        break;
      }
      case 'daydream':
        sfx('daydream', { volume: 0.5 });
        break;
      case 'levelup':
        this.cameras.main.flash(250, 230, 210, 140);
        sfx('levelUp');
        break;
      default:
        break;
    }
  }
}
