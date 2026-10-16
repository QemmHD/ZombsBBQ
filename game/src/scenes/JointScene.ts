/**
 * The café, drawn from the sim (v3 lot): a corner lot at a crossroads. Sidewalks and two-lane roads
 * run behind BOTH back walls (north-east and north-west), with grass and street junk beyond; the room
 * opens toward the camera onto the front lawn. Reads sim state; never owns game rules.
 */
import Phaser from "phaser";
import { HH, HW, TILE_H, TILE_W, WALL_H } from "../art3/kit";
import { FURN_META, chairFamilyOf } from "../art3/furniture";
import { KITCHEN_META } from "../art3/kitchen";
import { BUBBLE_SLOT, BUBBLE_H } from "../art3/fx";
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
  worldToIso,
  type Customer,
  type Furniture,
  type GameEvent,
  type GameState,
  type Pet,
  type Worker,
} from "../sim";
import type { Controller } from "../game/controller";
import { sfx } from "../game/sfx";
import {
  TEX_S,
  charArt,
  charLoaded,
  ensureProps,
  hasProp,
  loadChar,
  loadProps,
  propMeta,
  propsReady,
} from "./assets";
import {
  GROUND,
  charIdFor,
  depthOf,
  drawLot,
  floorKeys,
  furnArt,
  iso,
  moverDepth,
  scenery,
  wallAnchor,
  wallKey,
} from "./lot";
import { Puppet } from "./puppet";

export { iso, furnArt, wallKey, floorKeys, wallAnchor, charIdFor } from "./lot";

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
  faceUntil: number;
  face?: string;
  holder: Phaser.GameObjects.Container;
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
  private staticLayer: Phaser.GameObjects.GameObject[] = [];
  private furnViews = new Map<string, Phaser.GameObjects.Image[]>();
  private wallViews = new Map<string, Phaser.GameObjects.Image>();
  private stoveFx = new Map<string, StoveFx>();
  private counterFx = new Map<
    string,
    { dishes: Phaser.GameObjects.Image[]; text: Phaser.GameObjects.Text }
  >();
  private cashBadges = new Map<string, Phaser.GameObjects.Image>();
  private tablePlates = new Map<string, Phaser.GameObjects.Image>();
  private door?: Phaser.GameObjects.Image;
  private doorSign?: Phaser.GameObjects.Image;
  private grid?: Phaser.GameObjects.Graphics;
  private ghost: Phaser.GameObjects.Image[] = [];
  private layoutSig = "";
  private sizeSig = "";
  private loadingSig = "";
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

  constructor() {
    super("joint");
  }

  init(data: { ctl: Controller }) {
    this.ctl = data.ctl;
  }

  create() {
    this.cameras.main.setBackgroundColor("#4f5a2c");
    const bar = document.getElementById("boot-progress");
    const s = this.ctl.state;
    void loadProps(
      this,
      (f) => bar && (bar.style.width = `${Math.round(f * 90)}%`),
    )
      .then(() => ensureProps(this, this.neededKeys(s)))
      .then(() =>
        Promise.all(
          ["you", "gus", ...s.workers.map(charIdFor)].map((id) =>
            loadChar(this, id),
          ),
        ),
      )
      .then(() => {
        this.ready = true;
        document.getElementById("boot")?.classList.add("done");
        this.setupCamera(true);
        this.setupInput();
        this.ctl.onEvent((e) => this.fx(e));
        this.ctl.onMode(() => this.onModeChange());
        this.scale.on("resize", () => this.applyZoom(true));
        this.game.events.emit("joint-ready");
      });
  }

  // ---------- static world (rebuilt when the layout changes) ----------

  private sig(s: GameState): string {
    return [
      s.roomW,
      s.roomH,
      s.walls.l.join(","),
      s.walls.r.join(","),
      Object.entries(s.floors)
        .map(([k, v]) => `${k}${v}`)
        .join(";"),
      s.furniture
        .map(
          (f) => `${f.id}${f.x},${f.y}${f.dir ?? ""}${f.keepWarm ? "k" : ""}`,
        )
        .join(";"),
      s.wallItems.map((w) => `${w.id}${w.wall}${w.index}`).join(";"),
    ].join("|");
  }

  /** Every prop key the current layout needs (furniture is rasterized lazily, as it's placed). */
  private neededKeys(s: GameState): Set<string> {
    const k = new Set<string>();
    for (const f of s.furniture) {
      const a = furnArt(f.item, f.dir);
      k.add(a.key);
      if (a.back) k.add(a.back);
    }
    for (const w of s.wallItems) k.add(`${ITEM_BY_ID[w.item].art}_${w.wall}`);
    for (const [sk] of scenery(s.roomW, s.roomH)) k.add(sk);
    for (const d of Object.values(DISH_BY_ID)) k.add(d.icon);
    for (const st of [
      "fx_steam_1",
      "fx_steam_2",
      "fx_steam_3",
      "grill_flames",
      "fryer_bubbles",
      "pot_burnt",
    ])
      k.add(st);
    return k;
  }

  private img(key: string, x: number, y: number, flip = false) {
    const m = propMeta(key);
    const i = this.add
      .image(x, y, this.textures.exists(key) ? key : "__MISSING")
      .setScale(1 / TEX_S);
    if (m) i.setOrigin(flip ? 1 - m.ox : m.ox, m.oy);
    if (flip) i.setFlipX(true);
    return i;
  }

  private rebuild() {
    const s = this.ctl.state;
    // furniture art loads on first use: draw once it's ready (and redraw if something new appeared)
    const need = this.neededKeys(s);
    if (!propsReady(this, need)) {
      const sig = [...need].join(",");
      if (this.loadingSig !== sig) {
        this.loadingSig = sig;
        void ensureProps(this, need).then(() => (this.layoutSig = ""));
      }
    }
    for (const o of this.staticLayer) o.destroy();
    this.staticLayer = [];
    this.furnViews.clear();
    this.wallViews.clear();
    for (const fx of this.stoveFx.values())
      [fx.fx, fx.dish, fx.badge, fx.ring].forEach((o) => o.destroy());
    this.stoveFx.clear();
    for (const c of this.counterFx.values())
      [...c.dishes, c.text].forEach((o) => o.destroy());
    this.counterFx.clear();
    for (const b of this.cashBadges.values()) b.destroy();
    this.cashBadges.clear();
    for (const p of this.tablePlates.values()) p.destroy();
    this.tablePlates.clear();
    this.door = undefined;
    this.doorSign = undefined;
    const W = s.roomW;
    const H = s.roomH;
    const put = (
      k: string,
      x: number,
      y: number,
      depth: number,
      flip = false,
    ) => {
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
    this.doorSign = lot.doorSign;
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
      const flip = f.dir === "se";
      const over =
        st.kind === "grill"
          ? "grill_flames"
          : st.kind === "fryer"
            ? "fryer_bubbles"
            : "fx_steam_1";
      const fx = this.img(over, p.x, topY, flip)
        .setDepth(d + 3)
        .setVisible(false);
      const dish = this.img("dish_sliders", p.x, topY - 40)
        .setDepth(d + 8)
        .setVisible(false);
      const badge = this.img("fx_full", p.x + 18, topY - 46)
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
      if (itemOf(f).kind !== "counter") continue;
      const p = iso(f.x, f.y);
      const d = depthOf(f.x, f.y);
      const top =
        p.y - (KITCHEN_META.counterTopZ[ITEM_BY_ID[f.item].art] ?? 36);
      const dishes = [0, 1, 2].map((i) =>
        this.img("dish_sliders", p.x - 8 + i * 8, top - 2 - i * 4)
          .setDepth(d + 3 + i * 0.1)
          .setVisible(false),
      );
      const text = this.add
        .text(p.x + 24, top - 18, "", {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "10px",
          color: "#F2E7C4",
          backgroundColor: "#3B1A14",
          padding: { x: 3, y: 1 },
        })
        .setResolution(TEX_S)
        .setOrigin(0.5)
        .setDepth(d + 4);
      this.counterFx.set(f.id, { dishes, text });
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
    const s = this.ctl.state;
    const cam = this.cameras.main;
    const left = iso(-6, s.roomH + 5).x;
    const right = iso(s.roomW + 5, -6).x;
    const top = iso(-6, -6).y - WALL_H;
    const bottom = iso(s.roomW + 5, s.roomH + 5).y;
    cam.setBounds(left, top, right - left, bottom - top);
    this.applyZoom(recenter);
  }

  /** Close in, like the original: the room fills the screen and you pan around the lot. */
  private baseZoom() {
    const dpr = window.devicePixelRatio || 1;
    const s = this.ctl.state;
    const cssW = this.scale.width / dpr;
    const cssH = this.scale.height / dpr;
    const roomW = (s.roomW + s.roomH) * HW;
    const roomH = (s.roomW + s.roomH) * HH + WALL_H;
    return Math.min((cssW * 0.92) / roomW, (cssH * 1.3) / roomH);
  }

  private applyZoom(recenter = false) {
    const dpr = window.devicePixelRatio || 1;
    const z = this.baseZoom() * this.userZoom;
    const cam = this.cameras.main;
    const keep = recenter ? null : { x: cam.midPoint.x, y: cam.midPoint.y };
    cam.setZoom(z * dpr);
    if (keep) cam.centerOn(keep.x, keep.y);
    else {
      const s = this.ctl.state;
      const c = iso((s.roomW - 1) / 2, (s.roomH - 1) / 2);
      cam.centerOn(c.x, c.y - WALL_H * 0.32);
    }
  }

  private setupInput() {
    this.input.addPointer(1);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.ctl.mode === "raid") return;
      const pts = this.activePointers();
      if (pts.length >= 2) {
        this.pinch = {
          d: Phaser.Math.Distance.Between(
            pts[0].x,
            pts[0].y,
            pts[1].x,
            pts[1].y,
          ),
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
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      const pts = this.activePointers();
      if (this.pinch && pts.length >= 2) {
        const d = Phaser.Math.Distance.Between(
          pts[0].x,
          pts[0].y,
          pts[1].x,
          pts[1].y,
        );
        this.userZoom = Phaser.Math.Clamp(
          (this.pinch.z * d) / this.pinch.d,
          0.55,
          2.2,
        );
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
        cam.setScroll(
          this.drag.sx - dx / cam.zoom,
          this.drag.sy - dy / cam.zoom,
        );
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.pinch) {
        if (this.activePointers().length < 2) this.pinch = null;
        this.drag = null;
        return;
      }
      if (this.drag && !this.drag.moved)
        this.ctl.mode === "edit"
          ? this.editTap(p.worldX, p.worldY)
          : this.tap(p.worldX, p.worldY);
      this.drag = null;
    });
    this.input.on(
      "wheel",
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        this.userZoom = Phaser.Math.Clamp(
          this.userZoom * (dy > 0 ? 0.9 : 1.1),
          0.55,
          2.2,
        );
        this.applyZoom();
      },
    );
  }

  private activePointers() {
    return [this.input.pointer1, this.input.pointer2].filter(
      (p) => p && p.isDown,
    );
  }

  /** The tile under a finger (nudged a little up the screen, where a fingertip actually lands). */
  private tileAt(wx: number, wy: number) {
    return worldToIso(wx, wy + 8, TILE_W, TILE_H);
  }

  /** Which back-wall segment (if any) a world point is on. */
  private wallAt(
    wx: number,
    wy: number,
  ): { wall: "l" | "r"; index: number } | null {
    const s = this.ctl.state;
    for (let i = 0; i < Math.max(s.roomW, s.roomH); i++) {
      if (i < s.roomH) {
        const cl = iso(0, i);
        if (wx >= cl.x - HW && wx <= cl.x) {
          const f = (wx - (cl.x - HW)) / HW;
          const bottom = cl.y - f * HH;
          if (wy <= bottom && wy >= bottom - WALL_H)
            return { wall: "l", index: i };
        }
      }
      if (i < s.roomW) {
        const cr = iso(i, 0);
        if (wx >= cr.x && wx <= cr.x + HW) {
          const f = (wx - cr.x) / HW;
          const bottom = cr.y - HH + f * HH;
          if (wy <= bottom && wy >= bottom - WALL_H)
            return { wall: "r", index: i };
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
      const f = s.furniture.find(
        (x) => x.x === Math.round(t.x) && x.y === Math.round(t.y),
      );
      if (f) return f;
    }
    return undefined;
  }

  private editTap(wx: number, wy: number) {
    const ctl = this.ctl;
    if (ctl.painting) {
      const w = this.wallAt(wx, wy);
      if (ctl.painting.kind === "wall" && w)
        return ctl.paintAt(w.wall, w.index);
      const t = this.tileAt(wx, wy);
      if (
        ctl.painting.kind === "floor" &&
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
    if (f) return ctl.selectEdit({ kind: "furn", id: f.id });
    const w = this.wallAt(wx, wy);
    const hung =
      w &&
      ctl.state.wallItems.find((x) => x.wall === w.wall && x.index === w.index);
    if (hung) return ctl.selectEdit({ kind: "wall", id: hung.id });
    ctl.selectEdit(null);
  }

  private tap(wx: number, wy: number) {
    const s = this.ctl.state;
    if (this.ctl.selection?.kind === "worker") {
      const f = this.furnitureAt(wx, wy);
      const st = f && s.stoves.find((x) => x.furnitureId === f.id);
      if (st) return this.ctl.tapStove(st.id);
    }
    // money-maker badges are big, friendly targets
    for (const [fid, b] of this.cashBadges) {
      if (b.visible && Math.abs(wx - b.x) < 18 && wy < b.y + 6 && wy > b.y - 30)
        return this.game.events.emit("collect", fid);
    }
    // characters: whoever's body is closest to the finger wins (front-most only breaks ties), so a
    // zombie half-hidden behind a customer is still easy to grab
    let best: { id: string; kind: "w" | "c" | "p"; score: number } | null =
      null;
    const consider = (id: string, kind: "w" | "c" | "p") => {
      const a = this.actors.get(id);
      if (!a?.puppet || !a.holder.visible) return;
      const lying = Math.abs(a.puppet.body.rotation) > 0.5;
      const hw = lying ? 44 : 24;
      const top = lying ? 34 : a.puppet.height + 8;
      if (
        Math.abs(wx - a.holder.x) < hw &&
        wy < a.holder.y + 8 &&
        wy > a.holder.y - top
      ) {
        const cy = a.holder.y - (lying ? 12 : a.puppet.height * 0.45);
        const score =
          (wx - a.holder.x) ** 2 +
          ((wy - cy) * 0.7) ** 2 -
          a.holder.depth * 1e-6;
        if (!best || score < best.score) best = { id, kind, score };
      }
    };
    for (const w of s.workers) if (w.state !== "raiding") consider(w.id, "w");
    for (const c of s.customers)
      if (
        c.state !== "leaving" &&
        c.state !== "fleeing" &&
        c.state !== "infecting" &&
        c.state !== "turnedAway"
      )
        consider(c.id, "c");
    for (const p of s.pets) consider(p.id, "p");
    if (best) {
      const b = best as { id: string; kind: "w" | "c" | "p" };
      if (b.kind === "w") return this.ctl.tapWorker(b.id);
      if (b.kind === "c") return this.ctl.tapCustomer(b.id);
      sfx(
        s.pets.find((p) => p.id === b.id)?.type === "pug"
          ? "pugSnort"
          : "dogBark",
      );
      return this.ctl.info(
        s.pets.find((p) => p.id === b.id)?.type === "pug"
          ? "The Zombie Pug snorts. It smells money."
          : "The Rot-weiler wags. Something falls off.",
      );
    }
    const f = this.furnitureAt(wx, wy);
    if (f) {
      const st = s.stoves.find((x) => x.furnitureId === f.id);
      if (st) return this.ctl.tapStove(st.id);
      const k = itemOf(f).kind;
      if (k === "counter")
        return this.ctl.select({ kind: "counter", id: f.id });
      if (k === "fridge") return this.game.events.emit("open-fridge");
      if (k === "moneymaker" && payoutState(s, f.id) !== "none")
        return this.game.events.emit("collect", f.id);
      if (k === "table" && f.dirty)
        return this.ctl.info(
          "A dirty plate. Your crew clears it to the sink when they’re free.",
        );
      if (
        k === "moneymaker" ||
        k === "keg" ||
        k === "pethouse" ||
        k === "tombstone" ||
        k === "table" ||
        k === "sink"
      )
        return this.ctl.select({ kind: "furniture", id: f.id });
    }
    // the front door: tap it to open or close the café (like the original)
    const w = this.wallAt(wx, wy);
    if (w && w.wall === "r" && w.index === DOOR_X)
      return this.ctl.toggleClosed();
    this.ctl.tapNothing();
  }

  private onModeChange() {
    this.drawGrid();
    if (this.ctl.mode !== "edit")
      for (const g of this.ghost) g.setVisible(false);
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
    if (this.ctl.mode !== "edit") return;
    const s = this.ctl.state;
    g.lineStyle(1.2, 0xf2e7c4, 0.35);
    for (let y = 0; y < s.roomH; y++)
      for (let x = 0; x < s.roomW; x++) this.diamond(g, x, y);
    // the front lawn takes tombstones and pet houses
    const pl = this.ctl.placing;
    if (pl && !pl.wall && ITEM_BY_ID[pl.itemId]?.outdoor) {
      g.lineStyle(1.2, 0xc8e08a, 0.45);
      for (let y = 0; y <= s.roomH + 3; y++)
        for (let x = 0; x <= s.roomW + 3; x++)
          if (onLawn(x, y, { w: s.roomW, h: s.roomH })) this.diamond(g, x, y);
    }
  }

  private updateEdit() {
    const ctl = this.ctl;
    const pl = ctl.placing;
    const sel = ctl.editSel;
    for (const [id, vs] of this.furnViews)
      for (const v of vs)
        v.setAlpha(pl?.source === "move" && pl.id === id ? 0.25 : 1).setTint(
          sel?.kind === "furn" && sel.id === id ? 0xfff2a0 : 0xffffff,
        );
    for (const [id, v] of this.wallViews) {
      const moving = pl?.source === "move" && pl.id === id;
      const painting =
        ctl.painting &&
        ctl.mode === "edit" &&
        id.length <= 3 &&
        id[0] === (ctl.painting.kind === "wall" ? id[0] : "#");
      v.setAlpha(moving ? 0.25 : 1).setTint(
        sel?.kind === "wall" && sel.id === id
          ? 0xfff2a0
          : painting
            ? 0xf4f0d8
            : 0xffffff,
      );
    }
    if (!pl || ctl.mode !== "edit") {
      for (const g of this.ghost) g.setVisible(false);
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
      if (!g) g = this.ghost[i] = this.add.image(0, 0, "__MISSING");
      const m = propMeta(p.key);
      if (this.textures.exists(p.key)) g.setTexture(p.key);
      g.setScale(1 / TEX_S)
        .setFlipX(p.flip)
        .setOrigin(m ? (p.flip ? 1 - m.ox : m.ox) : 0.5, m?.oy ?? 1)
        .setPosition(p.x, p.y)
        .setDepth(9e5 + i)
        .setVisible(true)
        .setTint(ok ? 0xb8ff9c : 0xff8a80)
        .setAlpha(0.62 + Math.sin(this.t * 6) * 0.14);
    });
    for (let i = parts.length; i < this.ghost.length; i++)
      this.ghost[i].setVisible(false);
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
  private bubble(
    a: Actor,
    key: string | null,
    y: number,
    x = 6,
    dish?: string,
  ) {
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
      .setTexture(this.textures.exists(key) ? key : "__MISSING")
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
    g.fillStyle(
      f > 0.5 ? 0x7a9a32 : f > 0.25 ? 0xc9a63a : 0xa3342a,
      1,
    ).fillRect(-14, 1, Math.max(1.5, 28 * f), 3);
  }

  private syncWorker(w: Worker, dt: number) {
    const a = this.actor(w.id, charIdFor(w));
    if (!a) return;
    const raiding = w.state === "raiding";
    a.holder.setVisible(!raiding);
    if (raiding) return;
    const p = iso(w.x, w.y);
    a.holder.setPosition(p.x, p.y).setDepth(moverDepth(w.x, w.y, 4));
    const pup = a.puppet;
    if (!pup) return;
    const zombie = w.kind === "zombie";
    const moving = w.path.length > 0;
    pup.setFacing(w.facing, !!w.back);
    let pose: Parameters<Puppet["pose"]>[0] = "idle";
    if ((w.state === "resting" || w.state === "down") && !moving) pose = "lie";
    else if (moving) pose = w.state === "hunting" ? "run" : "walk";
    else if (w.state === "cooking") pose = "cook";
    pup.pose(pose, dt, {
      zombie: zombie && w.state !== "cooking",
      speed: w.state === "hunting" ? 1.3 : 1,
    });
    const face =
      this.t < a.faceUntil
        ? a.face
        : w.state === "resting"
          ? "sleep"
          : w.state === "down"
            ? "dazed"
            : w.state === "hunting"
              ? "chomp"
              : undefined;
    pup.setFace(face as never);
    a.shadow.setVisible(pose !== "lie").setScale(1);
    // what they're carrying: a plate of food to a table, a pot from the stove, or dirty plates
    let carry: string | null = null;
    if (w.state === "carrying" && w.job?.kind === "serve")
      carry = DISH_BY_ID[w.job.dish]?.icon ?? null;
    else if (w.state === "carryDish" && w.job?.kind === "dish" && w.job.dish)
      carry = DISH_BY_ID[w.job.dish]?.icon ?? null;
    else if (w.state === "carryPlate") carry = "plate_stack";
    if (carry && this.textures.exists(carry)) {
      if (!a.carry) {
        a.carry = this.img(carry, 0, 0);
        a.holder.add(a.carry);
      }
      // held out in front at waist height; behind the body when walking away from the camera
      a.carry
        .setTexture(carry)
        .setVisible(true)
        .setPosition(
          16 * w.facing,
          -pup.height * 0.5 + Math.sin(this.t * 9) * 0.8,
        );
      a.holder.bringToTop(a.carry);
      if (w.back) a.holder.sendToBack(a.carry);
    } else a.carry?.setVisible(false);
    let b: string | null = null;
    if (w.state === "resting") b = "face_sleep";
    else if (w.state === "down") b = "fx_skull";
    else if (w.state === "daydream") b = "fx_daydream";
    else if (w.state === "hunting") b = "face_angry";
    const lying = pose === "lie";
    this.bubble(a, b, lying ? -30 : -pup.height - 14, lying ? 22 : 6);
    this.energyBar(a, w.energy / maxEnergy(w), lying ? -24 : -pup.height - 4);
    if (w.kind === "you" && !a.tag) {
      a.tag = this.add
        .text(0, 0, "YOU", {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "9px",
          color: "#F2E7C4",
          backgroundColor: "#3B1A14",
          padding: { x: 4, y: 1 },
        })
        .setResolution(TEX_S)
        .setOrigin(0.5, 1);
      a.holder.add(a.tag);
    }
    if (a.tag) a.tag.y = lying ? -32 : -pup.height - 7;
    const sel = this.ctl.selection;
    const selected =
      (sel?.kind === "worker" && sel.id === w.id) ||
      (sel?.kind === "dishPicker" && sel.workerId === w.id);
    if (selected) pup.setTint(0xfff2a0);
    else pup.clearTint();
  }

  /** Seat position for a customer on their chair, and which way they face. */
  private seatPose(
    c: Customer,
  ): { x: number; y: number; facing: 1 | -1; back: boolean } | null {
    const s = this.ctl.state;
    const seat = s.furniture.find((f) => f.id === c.seatId);
    if (!seat) return null;
    const p = iso(seat.x, seat.y);
    const dir = seat.dir ?? "sw";
    const off = FURN_META.seatOffset[dir];
    const fam = chairFamilyOf(furnArt(seat.item, dir).key) ?? "plain";
    const z = FURN_META.seatZ[fam] ?? 18;
    // hips on the seat: the puppet's root (its feet) goes hip-height below the seat
    const hip = this.actors.get(c.id)?.puppet?.hipY ?? 20;
    return {
      x: p.x + off.dx,
      y: p.y + off.dy - z + hip,
      facing: dir === "se" || dir === "ne" ? 1 : -1,
      back: dir === "ne" || dir === "nw",
    };
  }

  private syncCustomer(c: Customer, dt: number) {
    const a = this.actor(c.id, c.type);
    if (!a) return;
    const s = this.ctl.state;
    const seated =
      (c.state === "waiting" || c.state === "eating") && c.path.length === 0;
    const sp = seated ? this.seatPose(c) : null;
    const p = sp ?? iso(c.x, c.y);
    // a sitter sorts just above their own chair: under the table when facing the camera, and under the
    // chair's backrest when sitting with their back to us
    a.holder
      .setPosition(p.x, p.y)
      .setDepth(seated ? depthOf(c.x, c.y) + 4 : moverDepth(c.x, c.y, 4));
    a.shadow.setVisible(!seated);
    // the food in front of a diner
    const plate = this.tablePlates.get(c.id);
    if (c.state === "eating" && c.dish) {
      const seat = s.furniture.find((f) => f.id === c.seatId);
      const table = seat && chairTable(s, seat);
      if (table && !plate) {
        const tp = iso(table.x, table.y);
        const off = FURN_META.plateOffset[ITEM_BY_ID[table.item].art] ?? {
          dx: 0,
          dy: -30,
        };
        const toward = iso(seat.x, seat.y);
        const d = this.img(
          DISH_BY_ID[c.dish].icon,
          tp.x + off.dx + (toward.x - tp.x) * 0.16,
          tp.y + off.dy + (toward.y - tp.y) * 0.16,
        ).setDepth(depthOf(table.x, table.y) + 3);
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
    const pose =
      c.state === "infecting"
        ? "shiver"
        : c.state === "fleeing"
          ? "run"
          : c.path.length
            ? "walk"
            : c.state === "eating"
              ? "eat"
              : seated
                ? "sit"
                : "idle";
    pup.pose(pose, dt, { speed: c.state === "fleeing" ? 1.6 : 1, seated });
    const face =
      c.state === "fleeing"
        ? "scream"
        : c.state === "infecting"
          ? "shock"
          : c.state === "eating"
            ? "eat"
            : c.mood === "angry" || c.state === "turnedAway"
              ? "angry"
              : c.mood === "happy"
                ? "happy"
                : undefined;
    pup.setFace(face as never);
    let b: string | null = null;
    let dish: string | undefined;
    if (c.state === "fleeing") b = "fx_full";
    else if (c.state === "waiting" && seated) {
      if (c.waitLeft < 20) b = "fx_sweat";
      else {
        b = "bubble_think";
        const slot = s.counter.find((x) => x.dish && x.servings > 0);
        dish = DISH_BY_ID[slot?.dish ?? "sliders"].icon;
      }
    }
    this.bubble(a, b, -pup.height - 6, 8, dish);
    const sel = this.ctl.selection;
    if (c.state === "infecting")
      pup.setTint(Math.sin(this.t * 30) > 0 ? 0x9be36b : 0xffffff);
    else if (sel?.kind === "customer" && sel.id === c.id) pup.setTint(0xfff2a0);
    else pup.clearTint();
  }

  private syncPet(p: Pet, dt: number) {
    const a = this.actor(p.id, p.type === "pug" ? "pet_pug" : "pet_rotweiler");
    if (!a) return;
    a.holder.setVisible(p.state !== "raiding");
    const w = iso(p.x, p.y);
    a.holder.setPosition(w.x, w.y).setDepth(moverDepth(p.x, p.y, 3));
    if (!a.puppet) return;
    a.puppet.setFacing(p.facing);
    a.puppet.pose(p.path.length ? "walk" : "idle", dt);
    this.bubble(
      a,
      p.state === "sniff" ? "fx_cash" : null,
      -a.puppet.height - 4,
    );
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
    // the door swings shut (and the board flips) when the café closes
    const doorKey = s.closed ? "door_r_closed" : "door_r_open";
    if (
      this.door &&
      this.door.texture.key !== doorKey &&
      this.textures.exists(doorKey)
    )
      this.door.setTexture(doorKey);
    const signKey = s.closed ? "ui_closed" : "ui_open";
    if (
      this.doorSign &&
      this.doorSign.texture.key !== signKey &&
      this.textures.exists(signKey)
    )
      this.doorSign.setTexture(signKey);
    this.doorSign?.setRotation(
      Math.sin(this.t * 2.2) * (s.closed ? 0.07 : 0.03),
    );
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
        this.tablePlates.get(id)?.destroy();
        this.tablePlates.delete(id);
      }
    this.updateStations(dt);
    this.updateEdit();
  }

  private updateStations(dt: number) {
    const s = this.ctl.state;
    for (const st of s.stoves) {
      const fx = this.stoveFx.get(st.id);
      if (!fx) continue;
      const cooking = st.status === "cooking";
      const burnt = st.status === "burnt";
      // flames / bubbles / steam while cooking; a charred pot when it burns
      if (st.kind === "stove" || st.kind === "smoker") {
        const k = burnt
          ? "pot_burnt"
          : `fx_steam_${1 + (Math.floor(this.t * 5) % 3)}`;
        if (this.textures.exists(k) && fx.fx.texture.key !== k)
          fx.fx.setTexture(k);
        fx.fx
          .setVisible(cooking || burnt)
          .setY(fx.topY - (st.kind === "smoker" && !burnt ? 22 : 0));
      } else {
        fx.fx
          .setVisible(cooking)
          .setScale(
            (1 / TEX_S) * (1 + Math.sin(this.t * 13) * 0.06),
            1 / TEX_S,
          );
      }
      const done = st.status === "done" || burnt;
      fx.dish.setVisible(st.status === "done");
      fx.badge.setVisible(done);
      if (done) {
        if (st.status === "done") {
          const k = DISH_BY_ID[st.dish!].icon;
          if (fx.dish.texture.key !== k && this.textures.exists(k))
            fx.dish.setTexture(k);
          fx.dish.y = fx.topY - 42 - Math.abs(Math.sin(this.t * 4)) * 4;
        }
        // the burn warning: the "!" pulses faster as the dish gets close to burning
        const left = (st.burnAt ?? Infinity) - s.now;
        fx.badge.setScale(
          (1 / TEX_S) *
            (1 +
              (burnt || left < 30
                ? Math.abs(Math.sin(this.t * 10)) * 0.35
                : 0)),
        );
        if (burnt) fx.badge.setTint(0x888888);
        else fx.badge.clearTint();
      }
      fx.ring.clear();
      if ((cooking || st.status === "paused") && st.dish && st.total) {
        const pct = Phaser.Math.Clamp(1 - (st.left ?? 0) / st.total, 0, 1);
        const y = fx.topY - 50;
        fx.ring.fillStyle(0x16120c, 0.85).fillCircle(fx.x, y, 9);
        fx.ring
          .lineStyle(3, st.status === "paused" ? 0x8a857a : 0xc9a63a, 1)
          .beginPath()
          .arc(fx.x, y, 6.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
          .strokePath();
        if (st.status === "paused") {
          // paused: nobody at the stove (the original's cooks had to stay put)
          fx.ring
            .fillStyle(0xf2e7c4, 1)
            .fillRect(fx.x - 3, y - 3.5, 2, 7)
            .fillRect(fx.x + 1, y - 3.5, 2, 7);
        }
      }
      if (burnt && (fx.smokeT += dt) > 0.5) {
        fx.smokeT = 0;
        const k = "fx_steam_2";
        if (this.textures.exists(k)) {
          const puff = this.img(
            k,
            fx.x + (Math.random() - 0.5) * 10,
            fx.topY - 8,
          )
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
    // counters: up to three dishes stacked on top, and the servings left
    for (const [fid, c] of this.counterFx) {
      const slots = s.counter.filter(
        (x) => x.furnitureId === fid && x.dish && x.servings > 0,
      );
      const total = slots.reduce((a, x) => a + x.servings, 0);
      c.dishes.forEach((d, i) => {
        const slot = slots[i];
        d.setVisible(!!slot);
        if (slot) {
          const k = DISH_BY_ID[slot.dish!].icon;
          if (d.texture.key !== k && this.textures.exists(k)) d.setTexture(k);
        }
      });
      c.text.setVisible(total > 0);
      if (total > 0) c.text.setText(`×${total}`);
    }
    // money-makers: "$" when there's cash in them, "!" when they're full and have stopped earning
    for (const f of s.furniture) {
      if (itemOf(f).kind !== "moneymaker") continue;
      const state = payoutState(s, f.id);
      let b = this.cashBadges.get(f.id);
      if (!b && state !== "none") {
        const p = iso(f.x, f.y);
        b = this.img("fx_cash", p.x, p.y - 96).setDepth(depthOf(f.x, f.y) + 9);
        this.cashBadges.set(f.id, b);
      }
      if (b) {
        b.setVisible(state !== "none");
        const k = state === "full" ? "fx_full" : "fx_cash";
        if (b.texture.key !== k && this.textures.exists(k)) b.setTexture(k);
        b.y = iso(f.x, f.y).y - 96 - Math.abs(Math.sin(this.t * 3)) * 6;
      }
    }
    // dirty plates left on tables
    for (const f of s.furniture) {
      if (itemOf(f).kind !== "table") continue;
      const id = `dirty:${f.id}`;
      const v = this.tablePlates.get(id);
      if (f.dirty && !v && this.textures.exists("plate_dirty")) {
        const tp = iso(f.x, f.y);
        const off = FURN_META.plateOffset[ITEM_BY_ID[f.item].art] ?? {
          dx: 0,
          dy: -30,
        };
        this.tablePlates.set(
          id,
          this.img("plate_dirty", tp.x + off.dx, tp.y + off.dy).setDepth(
            depthOf(f.x, f.y) + 3,
          ),
        );
      } else if (!f.dirty && v) {
        v.destroy();
        this.tablePlates.delete(id);
      }
    }
  }

  // ---------- juice ----------

  floatText(x: number, y: number, text: string, color: string, size = 12) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: `${size}px`,
        color,
        stroke: "#16120C",
        strokeThickness: 3,
      })
      .setResolution(TEX_S)
      .setOrigin(0.5)
      .setDepth(1e6)
      .setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: "Back.Out" });
    this.tweens.add({
      targets: t,
      y: y - 34,
      alpha: 0,
      delay: 500,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  private popIcon(x: number, y: number, key: string) {
    if (!this.textures.exists(key)) return;
    const i = this.img(key, x, y).setDepth(1e6).setScale(0);
    this.tweens.add({
      targets: i,
      scale: 1 / TEX_S,
      duration: 220,
      ease: "Back.Out",
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
      case "coin": {
        const p = iso(e.x, e.y);
        this.popIcon(p.x - 10, p.y - 90, "fx_cash");
        this.floatText(p.x + 10, p.y - 92, `+$${e.amount + e.tip}`, "#D9C25A");
        sfx("coin", { volume: 0.6 });
        break;
      }
      case "face": {
        const p = iso(e.x, e.y);
        this.popIcon(p.x, p.y - 112, e.happy ? "face_happy" : "face_angry");
        break;
      }
      case "xp": {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 100, `+${e.amount} XP`, "#9CC4C8");
        break;
      }
      case "bite": {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 80, "CHOMP!", "#C0392B", 18);
        this.popIcon(p.x, p.y - 50, "fx_hit");
        this.cameras.main.shake(180, 0.004);
        const a = this.actors.get(e.workerId);
        if (a) {
          a.face = "chomp";
          a.faceUntil = this.t + 0.8;
        }
        sfx("chomp");
        setTimeout(
          () => sfx("scream", { pitch: 0.9 + Math.random() * 0.3 }),
          150,
        );
        navigator.vibrate?.(60);
        break;
      }
      case "infected": {
        const w = s.workers.find((x) => x.id === e.workerId);
        if (!w) break;
        const p = iso(w.x, w.y);
        this.floatText(p.x, p.y - 110, "INFECTED!", "#9BD62E", 16);
        this.popIcon(p.x, p.y - 40, "fx_stink");
        sfx("infect");
        const a = this.actors.get(w.id);
        if (a) {
          a.holder.setScale(0.6, 1.3);
          this.tweens.add({
            targets: a.holder,
            scaleX: 1,
            scaleY: 1,
            duration: 450,
            ease: "Elastic.Out",
          });
          a.face = "chomp";
          a.faceUntil = this.t + 1.2;
        }
        break;
      }
      case "cookStart":
        sfx("sizzle", { volume: 0.7 });
        break;
      case "dishDone": {
        sfx("ding");
        const fx = this.stoveFx.get(e.stoveId);
        if (fx) this.popIcon(fx.x, fx.topY - 30, "fx_star");
        break;
      }
      case "burnt":
        sfx("burn");
        break;
      case "payout": {
        const f = s.furniture.find((x) => x.id === e.furnitureId);
        if (f) {
          const p = iso(f.x, f.y);
          this.floatText(p.x, p.y - 100, `+$${e.amount}`, "#D9C25A", 16);
        }
        sfx("cashRegister");
        break;
      }
      case "petFind": {
        const pet = s.pets.find((x) => x.id === e.petId);
        if (pet) {
          const p = iso(pet.x, pet.y);
          this.popIcon(p.x, p.y - 40, "fx_cash");
          this.floatText(p.x, p.y - 50, `+$${e.amount}`, "#D9C25A");
        }
        sfx("pugSnort");
        break;
      }
      case "daydream":
        sfx("daydream", { volume: 0.5 });
        break;
      case "levelup":
        this.cameras.main.flash(250, 230, 210, 140);
        sfx("levelUp");
        break;
      default:
        break;
    }
  }
}
