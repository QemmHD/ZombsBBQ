/**
 * Renders a raid (src/sim/raid.ts): the rival joint is drawn exactly like a player café, on its own
 * street corner, with your squad lined up on the sidewalk outside. The joint scene keeps ticking the
 * sim underneath (your other zombies keep working); this scene only draws and takes taps.
 *
 * Controls, like the original: tap one of your zombies to pick it, then tap a target (a person, or the
 * counter to swipe food), or press ATTACK. Tap a target with nobody picked and everyone who's in
 * piles on it.
 */
import Phaser from 'phaser';
import { HW, TILE_H, TILE_W, WALL_H } from '../art3/kit';
import { FURN_META, chairFamilyOf } from '../art3/furniture';
import { KITCHEN_META } from '../art3/kitchen';
import { DISH_BY_ID, DOOR_X, ITEM_BY_ID, RIVAL_BY_ID, feastOn, focusTarget, isBody, order, stealDish, worldToIso, type RaidEvent, type RaidState, type RaidUnit } from '../sim';
import type { Controller } from '../game/controller';
import { sfx } from '../game/sfx';
import { TEX_S, charArt, charLoaded, ensureProps, hasProp, loadChar, loadProps } from './assets';
import { FrontDoor, WALLS, depthOf, drawLot, furnArt, iso, lotGround, moverDepth, propImage, scenery, wallAnchor } from './lot';
import { Puppet } from './puppet';
import { FloatTexts, type FloatOpts } from './floattext';

interface UnitView {
  holder: Phaser.GameObjects.Container;
  puppet: Puppet | null;
  charId: string;
  bar: Phaser.GameObjects.Graphics;
  barQ: number;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  bubble?: Phaser.GameObjects.Image;
}

/** Most floating texts alive at once. */
const FLOAT_POOL = 24;
/** Extra rings of ground around a rival's lot, so the closer camera never sees past the grass. */
const RAID_MARGIN = 3;

/** Waitresses (`staff_x_b`) fall back to their waiter's art if they haven't been drawn. */
function artFor(id: string): string {
  if (charArt(id)) return id;
  const base = id.replace(/_b$/, '');
  return charArt(base) ? base : id;
}

export class RaidScene extends Phaser.Scene {
  private ctl!: Controller;
  private views = new Map<string, UnitView>();
  private counterDishes: Phaser.GameObjects.Image[] = [];
  private ready = false;
  private t = 0;
  /** diners just eaten: when, so the body stays down under the feasting zombie for a moment */
  private eatenAt = new Map<string, number>();
  /** bone piles left where diners were eaten (original: 10 s, then a 3 s fade) */
  private bones: { img: Phaser.GameObjects.Image; t0: number }[] = [];
  private seenEvents = 0;
  private drag: {
    x: number;
    y: number;
    sx: number;
    sy: number;
    moved: boolean;
  } | null = null;
  private baseZoom = 1;
  private lastUserPan = -99;
  private lastHitText = new Map<string, number>();
  private lastPow = -9;
  private door?: FrontDoor;
  private floats?: FloatTexts;

  constructor() {
    super('raid');
  }

  init(data: { ctl: Controller }) {
    this.ctl = data.ctl;
    this.ready = false;
    this.views.clear();
    this.counterDishes = [];
    this.seenEvents = 0;
    this.floats = undefined;
  }

  create() {
    const r = this.ctl.raid!;
    this.cameras.main.setBackgroundColor('#4f5a2c');
    const keys = new Set<string>([`rsign_${r.rival}`]);
    for (const f of r.furniture) {
      const a = furnArt(f.item, f.dir);
      keys.add(a.key);
      if (a.back) keys.add(a.back);
    }
    for (const w of r.wallItems) keys.add(`${ITEM_BY_ID[w.item].art}_${w.wall}`);
    for (const c of r.counter) keys.add(DISH_BY_ID[c.dish].icon);
    for (const [k, , , flip] of scenery(r.room.w, r.room.h, r.rival)) keys.add(flip && hasProp(`${k}_se`) ? `${k}_se` : k);
    const chars = new Set(r.units.map((u) => artFor(u.art)));
    let dead = false;
    void Promise.all([loadProps(this).then(() => ensureProps(this, keys)), ...[...chars].map((id) => loadChar(this, id))]).then(() => {
      // retreated and went home (or the scene was torn down) while the art was still loading
      if (dead || this.ctl.raid !== r || !this.sys?.isActive()) return;
      this.buildCafe();
      this.fitCamera();
      this.setupInput();
      this.ready = true;
      r.hold = false; // the fight (and its clock) starts once there's something to see
      this.game.events.emit('raid-ready');
    });
    // main.ts removes this scene (DESTROY only, no SHUTDOWN), so unhook on both or rotations pile up listeners
    this.scale.on('resize', this.fitCamera, this);
    const unhook = () => {
      dead = true;
      this.scale.off('resize', this.fitCamera, this);
    };
    this.events.once('shutdown', unhook);
    this.events.once('destroy', unhook);
  }

  // ---------- the rival café ----------

  private buildCafe() {
    const r = this.ctl.raid!;
    const def = RIVAL_BY_ID[r.rival];
    const W = r.room.w;
    const H = r.room.h;
    this.door = drawLot(this, {
      w: W,
      h: H,
      wallKey: (side) => `wall_${side}_${def.wall}`,
      floorKeys: (x, y) => [`floor_${def.floor}_${(x + y) % 2 ? 'a' : 'b'}`],
      wallItems: r.wallItems.map((w, i) => ({
        id: `w${i}`,
        key: `${ITEM_BY_ID[w.item].art}_${w.wall}`,
        wall: w.wall,
        index: w.index,
      })),
      scenery: scenery(W, H, r.rival),
      margin: RAID_MARGIN,
    }).door;
    // the shop sign, bolted over the door
    const sign = `rsign_${r.rival}`;
    if (hasProp(sign)) {
      // spans the door's wall section and the next one, its lower edge just above the door frame
      const a = wallAnchor('r', DOOR_X);
      // above both wall sections it spans (the next section would otherwise cut the lettering in half)
      propImage(this, sign, a.x - HW / 2, a.y - 30 - 118).setDepth(WALLS + (DOOR_X + 1) * 10 + 6);
    }
    for (const f of r.furniture) {
      const p = iso(f.x, f.y);
      const a = furnArt(f.item, f.dir);
      const d = depthOf(f.x, f.y);
      propImage(this, a.key, p.x, p.y, a.flip).setDepth(d + 2);
      if (a.back) propImage(this, a.back, p.x, p.y, a.flip).setDepth(d + 6);
      // a pot on every burner: the kitchen's working
      if (ITEM_BY_ID[f.item].kind === 'stove' && this.textures.exists('fx_steam_1')) {
        const top = p.y - (KITCHEN_META.stoveTopZ[ITEM_BY_ID[f.item].art] ?? 36);
        const steam = propImage(this, 'fx_steam_1', p.x, top, a.flip)
          .setDepth(d + 3)
          .setAlpha(0.8);
        this.tweens.add({
          targets: steam,
          alpha: 0.35,
          yoyo: true,
          repeat: -1,
          duration: 900 + Math.random() * 400,
        });
      }
    }
    // the food on the counter, stacked
    const ct = r.counter[0];
    if (ct) {
      const f = r.furniture.find((x) => x.x === ct.x && x.y === ct.y)!;
      const p = iso(ct.x, ct.y);
      const top = p.y - (KITCHEN_META.counterTopZ[ITEM_BY_ID[f.item].art] ?? 36);
      r.counter.forEach((c, i) => this.counterDishes.push(propImage(this, DISH_BY_ID[c.dish].icon, p.x - 6 + i * 12, top - 2 - i * 5).setDepth(depthOf(ct.x, ct.y) + 3 + i * 0.1)));
    }
  }

  private fitCamera() {
    const r = this.ctl?.raid;
    const cam = this.cameras?.main;
    if (!r || !cam || !this.sys?.isActive()) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.scale.width / dpr;
    const cssH = this.scale.height / dpr;
    // the same scale as your own joint (characters about a sixth of the screen tall), not a far-off
    // overview: the action cam leans in further once the fight starts, and you can pan around
    const w = (r.room.w + r.room.h) * HW;
    const h = (r.room.w + r.room.h) * (TILE_H / 2) + WALL_H;
    const z = Math.min((cssW * 0.92) / w, (cssH * 1.3) / h) * 0.9;
    this.baseZoom = z * dpr;
    cam.setZoom(this.baseZoom);
    // keep the view on painted ground: the largest rectangle inside the ground's diamond
    const g = lotGround(r.room.w, r.room.h, RAID_MARGIN);
    const L = iso(g.x0, g.y1).x;
    const R = iso(g.x1, g.y0).x;
    const T = iso(g.x0, g.y0).y;
    const B = iso(g.x1, g.y1).y;
    const cx = (L + R) / 2;
    const cy = (T + B) / 2;
    const hw = (R - L) / 4;
    const hh = (B - T) / 4;
    cam.setBounds(cx - hw, cy - hh - WALL_H * 0.5, hw * 2, hh * 2 + WALL_H * 0.5);
    const c = iso(r.room.w / 2 + 0.6, r.room.h / 2 - 1.2);
    cam.centerOn(c.x, c.y - 30);
  }

  /** Action cam: once zombies are in, drift toward the brawl and zoom in so the fight reads on a phone. */
  private followAction(dt: number) {
    const r = this.ctl.raid!;
    if (this.drag?.moved || this.t - this.lastUserPan < 4) return;
    const active = r.units.filter((u) => u.side === 'z' && u.hp > 0 && u.state !== 'queued' && u.state !== 'gone');
    const cam = this.cameras.main;
    let tz = this.baseZoom;
    let tx: number;
    let ty: number;
    if (active.length && r.phase === 'fight') {
      let sx = 0;
      let sy = 0;
      for (const u of active) {
        const p = iso(u.x, u.y);
        sx += p.x;
        sy += p.y;
      }
      tx = sx / active.length;
      ty = sy / active.length - 50;
      tz = this.baseZoom * 1.4;
    } else {
      const c = iso(r.room.w / 2 + 0.6, r.room.h / 2 - 1.2);
      tx = c.x;
      ty = c.y - 30;
    }
    const k = 1 - Math.exp(-dt * 2);
    cam.setZoom(cam.zoom + (tz - cam.zoom) * k);
    cam.centerOn(cam.midPoint.x + (tx - cam.midPoint.x) * k, cam.midPoint.y + (ty - cam.midPoint.y) * k);
  }

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main;
      this.drag = {
        x: p.x,
        y: p.y,
        sx: cam.scrollX,
        sy: cam.scrollY,
        moved: false,
      };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.x;
      const dy = p.y - this.drag.y;
      if (Math.hypot(dx, dy) > 12) this.drag.moved = true;
      if (this.drag.moved) {
        this.lastUserPan = this.t;
        const cam = this.cameras.main;
        cam.setScroll(this.drag.sx - dx / cam.zoom, this.drag.sy - dy / cam.zoom);
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.drag && !this.drag.moved) this.tap(p.worldX, p.worldY);
      this.drag = null;
    });
  }

  private tap(wx: number, wy: number) {
    const r = this.ctl.raid;
    if (!r || r.phase !== 'fight') return;
    // whoever's body is closest to the finger
    let best: { u: RaidUnit; score: number } | null = null;
    for (const u of r.units) {
      const v = this.views.get(u.id);
      if (!v || !v.holder.visible || u.hp <= 0 || u.state === 'gone' || u.state === 'down') continue;
      const h = (v.puppet?.height ?? 90) * v.holder.scaleY;
      if (Math.abs(wx - v.holder.x) < 26 && wy < v.holder.y + 10 && wy > v.holder.y - h - 8) {
        const score = (wx - v.holder.x) ** 2 + ((wy - (v.holder.y - h * 0.45)) * 0.7) ** 2;
        if (!best || score < best.score) best = { u, score };
      }
    }
    const sel = this.ctl.raidSel;
    if (best) {
      const u = best.u;
      if (u.side === 'z') {
        this.ctl.selectRaider(sel === u.id ? null : u.id);
        sfx('groan', { pitch: 0.8 + Math.random() * 0.4 });
        return;
      }
      if (sel) {
        const err = order(r, sel, { kind: 'target', id: u.id });
        if (err) this.ctl.toast(err, false);
        else {
          sfx('tap');
          this.ctl.info(u.side === 'c' ? 'Lunch!' : `Get the ${u.name}!`);
        }
        this.ctl.selectRaider(null);
        return;
      }
      focusTarget(r, u.id);
      sfx('tap');
      this.ctl.info(u.side === 'c' ? 'Dinner time!' : `Everybody on the ${u.name}!`);
      return;
    }
    // a knocked-out waiter lying there: lunch (the picked zombie, or the nearest one)
    const body = r.units.find((u) => {
      const v = this.views.get(u.id);
      return isBody(u) && v && Math.abs(wx - v.holder.x) < 30 && Math.abs(wy - (v.holder.y - 12)) < 22;
    });
    if (body) {
      const err = sel ? order(r, sel, { kind: 'target', id: body.id }) : feastOn(r, body.id);
      if (err) this.ctl.toast(err, false);
      else {
        sfx('tap');
        this.ctl.info('Waiter for lunch!');
      }
      this.ctl.selectRaider(null);
      return;
    }
    // the counter: swipe the food
    for (const off of [0, 20, 40]) {
      const t = worldToIso(wx, wy + off, TILE_W, TILE_H);
      if (!r.counter.some((c) => Math.round(t.x) === c.x && Math.round(t.y) === c.y)) continue;
      const slot = r.counter.findIndex((c) => c.servings > 0);
      if (slot < 0) return this.ctl.toast('Nothing left to steal!', false);
      const err = sel ? order(r, sel, { kind: 'steal', slot }) : stealDish(r, slot);
      if (err) this.ctl.toast(err, false);
      else {
        sfx('tap');
        this.ctl.info('Swipe that dish!');
      }
      this.ctl.selectRaider(null);
      return;
    }
  }

  // ---------- units ----------

  private view(u: RaidUnit): UnitView {
    let v = this.views.get(u.id);
    if (v) return v;
    const holder = this.add.container(0, 0);
    const shadow = this.add.ellipse(0, 0, 34, 11, 0x16120c, 0.28);
    const ring = this.add.ellipse(0, 0, 46, 16).setStrokeStyle(2, 0xd9b44a, 1).setVisible(false);
    const bar = this.add.graphics();
    holder.add([ring, shadow, bar]);
    v = {
      holder,
      puppet: null,
      charId: artFor(u.art),
      bar,
      barQ: -1,
      shadow,
      ring,
    };
    if (u.kind === 'summon') holder.setScale(1.15);
    this.views.set(u.id, v);
    return v;
  }

  private drawBar(v: UnitView, u: RaidUnit, top: number) {
    const f = Math.max(0, u.hp / u.maxHp);
    const q = Math.round(f * 30);
    v.bar.y = top;
    if (q === v.barQ) return;
    v.barQ = q;
    const g = v.bar;
    g.clear();
    if (u.side === 'c') return;
    g.fillStyle(0x16120c, 0.9).fillRect(-16, 0, 32, 5);
    g.fillStyle(u.side === 'z' ? 0x7a9a32 : 0xa3342a, 1).fillRect(-15, 1, Math.max(1, 30 * f), 3);
  }

  /** A diner still on their chair: sat on the seat, facing the table (backs to us on ne chairs). */
  private seatPose(r: RaidState, u: RaidUnit) {
    if (!u.seatId) return null;
    const seat = r.furniture.find((f) => f.id === u.seatId);
    if (!seat || Math.abs(u.x - seat.x) > 0.05 || Math.abs(u.y - seat.y) > 0.05) return null;
    const p = iso(seat.x, seat.y);
    const dir = seat.dir ?? 'sw';
    const off = FURN_META.seatOffset[dir];
    const fam = chairFamilyOf(furnArt(seat.item, dir).key) ?? 'plain';
    const hip = this.views.get(u.id)?.puppet?.hipY ?? 20;
    return {
      x: p.x + off.dx,
      y: p.y + off.dy - (FURN_META.seatZ[fam] ?? 18) + hip,
      facing: (dir === 'se' || dir === 'ne' ? 1 : -1) as 1 | -1,
      back: dir === 'ne' || dir === 'nw',
      depth: depthOf(seat.x, seat.y) + 4,
    };
  }

  update(_time: number, deltaMs: number) {
    if (!this.ready || !this.ctl.raid) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.t += dt;
    const r = this.ctl.raid;
    this.followAction(dt);
    // bone piles: fade in as the body goes, lie there 10 s, fade out over 3 s
    this.bones = this.bones.filter((b) => {
      const age = this.t - b.t0;
      const a = age < 1.8 ? Phaser.Math.Clamp((age - 1.4) / 0.4, 0, 1) : age < 11.8 ? 1 : 1 - (age - 11.8) / 3;
      b.img.setAlpha(Math.max(0, a));
      if (a <= 0 && age > 2) {
        b.img.destroy();
        return false;
      }
      return true;
    });
    this.door?.update(
      dt,
      this.t,
      r.units.filter((u) => u.state !== 'gone' && u.state !== 'queued' && u.hp > 0),
      false,
    );
    const buff = r.buff && r.t < r.buff.until ? r.buff.kind : null;
    for (const u of r.units) {
      const v = this.view(u);
      // an eaten diner drops and lies there while the zombie feasts, then fades away
      const eatenFor = this.t - (this.eatenAt.get(u.id) ?? -99);
      const corpse = u.state === 'gone' && eatenFor < 1.8;
      const gone = u.state === 'gone' && !corpse;
      v.holder.setVisible(!gone).setAlpha(corpse ? Math.min(1, (1.8 - eatenFor) / 0.4) : 1);
      if (gone) continue;
      // seated only when actually on the chair (a walk-in who screams in the doorway is standing)
      const onChair = !!u.home && Math.abs(u.x - u.home.x) < 0.05 && Math.abs(u.y - u.home.y) < 0.05;
      const seat = (u.state === 'idle' || u.state === 'scream') && u.kind === 'customer' && onChair ? this.seatPose(r, u) : null;
      const p = seat ?? iso(u.x, u.y);
      v.holder.setPosition(p.x, p.y).setDepth(seat ? seat.depth : moverDepth(u.x, u.y, 4));
      if (!v.puppet && charLoaded(this, v.charId)) {
        const a = charArt(v.charId);
        if (a) {
          v.puppet = new Puppet(this, a);
          v.holder.addAt(v.puppet.root, 2);
        }
      }
      const down = u.hp <= 0 || u.state === 'down' || corpse;
      const top = -(v.puppet?.height ?? 90) - 8;
      this.drawBar(v, u, down ? -30 : top);
      v.shadow.setVisible(!seat && !down);
      v.ring
        .setVisible(this.ctl.raidSel === u.id || (u.state === 'queued' && !this.ctl.raidSel && u === r.units.find((x) => x.side === 'z' && x.state === 'queued')))
        .setAlpha(this.ctl.raidSel === u.id ? 1 : 0.35 + Math.abs(Math.sin(this.t * 3)) * 0.4);
      if (!v.puppet) continue;
      if (seat) v.puppet.setFacing(seat.facing, seat.back);
      else v.puppet.setFacing(u.facing, !!u.back && (u.state === 'walk' || u.state === 'flee'));
      const zombie = u.side === 'z' && (u.kind === 'zombie' || u.kind === 'summon');
      const attackT = r.t - u.attackAt;
      let pose: Parameters<Puppet['pose']>[0] = 'idle';
      if (down) pose = 'lie';
      else if (seat) pose = 'sit';
      else if (u.state === 'flee') pose = 'run';
      else if (u.state === 'grabbed') pose = 'shiver';
      else if (u.state === 'eat') pose = 'feast'; // original: bent over the body, chewing
      else if (u.state === 'steal') pose = 'eat';
      else if (attackT < 0.5) pose = zombie ? 'attack' : 'punch';
      else if (r.t - u.hitAt < 0.3) pose = 'hit';
      else if (u.state === 'walk' && u.path.length) pose = 'walk';
      v.puppet.pose(pose, dt, {
        zombie,
        attackT,
        speed: u.speed / 1.5,
        seated: !!seat,
      });
      const face = down
        ? 'dazed'
        : u.state === 'flee' || u.state === 'scream' || u.state === 'grabbed'
          ? 'scream'
          : u.state === 'eat'
            ? 'chomp'
            : zombie && attackT < 0.5
              ? 'chomp'
              : u.side === 'r' && r.t - u.hitAt < 0.4
                ? 'shock'
                : u.side === 'r' && r.aggro
                  ? 'angry'
                  : undefined;
      v.puppet.setFace(face as never);
      // a hit: a 60 ms white flash, a squash and a little knockback (not a salmon-pink paint job)
      const hitT = r.t - u.hitAt;
      v.puppet.flash(hitT < 0.06 && !down);
      const k = hitT < 0.16 && !down ? 1 - hitT / 0.16 : 0;
      v.puppet.root.setScale(1 + k * 0.07, 1 - k * 0.07).setX(-u.facing * 2 * k);
      if (hitT >= 0.06 || down) {
        if (u.side === 'z' && buff) v.puppet.setTint(Math.sin(this.t * 14) > 0 ? (buff === 'str' ? 0xff7a6a : 0x9be36b) : 0xffffff);
        else v.puppet.clearTint();
      }
      // the focus target: a red ring on the ground, not a yellow wash
      if (r.focus === u.id && !down) v.ring.setVisible(true).setStrokeStyle(2.2, 0xd04a3a, 1).setAlpha(0.6 + Math.abs(Math.sin(this.t * 5)) * 0.4);
      else if (v.ring.strokeColor !== 0xd9b44a) v.ring.setStrokeStyle(2, 0xd9b44a, 1);
    }
    r.counter.forEach((c, i) => this.counterDishes[i]?.setVisible(c.servings > 0));
    // play new events
    while (this.seenEvents < r.events.length) this.fx(r.events[this.seenEvents++]);
    if (r.events.length < this.seenEvents) this.seenEvents = r.events.length;
  }

  // ---------- juice ----------

  /** Floating combat text (pooled, crisp, throttled and stacked per unit: see floattext.ts). */
  private floatText(x: number, y: number, text: string, color: string, size = 16, opts: FloatOpts = {}) {
    this.floats ??= new FloatTexts(this, FLOAT_POOL);
    return this.floats.show(x, y, text, color, { size, ...opts });
  }

  /** A claw swipe: three tapered gouges, drawn once into a texture (the old "SCRATCH!" text). */
  private scratchTexture() {
    const key = 'fx_scratch_spark';
    if (this.textures.exists(key)) return key;
    const S = TEX_S;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const claw = (ox: number, w: number) => {
      // a tapered sliver from top-right to bottom-left
      const pts = [
        [ox + 20, 2],
        [ox + 20 + w, 4],
        [ox + 2, 30],
        [ox - 1, 29],
      ].map(([x, y]) => new Phaser.Math.Vector2(x * S, y * S));
      g.fillStyle(0x16120c, 1).fillPoints(pts, true);
      const inner = [
        [ox + 20, 4],
        [ox + 20 + w * 0.5, 5],
        [ox + 2.5, 28],
        [ox + 0.5, 27.5],
      ].map(([x, y]) => new Phaser.Math.Vector2(x * S, y * S));
      g.fillStyle(0xf2e7c4, 1).fillPoints(inner, true);
    };
    claw(2, 3.4);
    claw(9, 4.2);
    claw(16, 3.4);
    g.generateTexture(key, 40 * S, 32 * S);
    g.destroy();
    return key;
  }

  /** A quick slash where a diner gets clawed. */
  private scratch(x: number, y: number) {
    const key = this.scratchTexture();
    const i = this.add
      .image(x + (Math.random() - 0.5) * 14, y, key)
      .setDepth(1e6 + 1)
      .setScale(0)
      .setRotation((Math.random() - 0.5) * 0.6);
    this.tweens.add({ targets: i, scale: 0.8 / TEX_S, duration: 90, ease: 'Back.Out' });
    this.tweens.add({ targets: i, alpha: 0, delay: 220, duration: 220, onComplete: () => i.destroy() });
  }

  private pop(key: string, x: number, y: number, ms = 500) {
    if (!this.textures.exists(key)) return;
    const i = propImage(this, key, x, y)
      .setDepth(1e6 + 1)
      .setScale(0);
    this.tweens.add({
      targets: i,
      scale: 1 / TEX_S,
      duration: 120,
      ease: 'Back.Out',
    });
    this.tweens.add({
      targets: i,
      alpha: 0,
      delay: ms,
      duration: 250,
      onComplete: () => i.destroy(),
    });
  }

  private fx(e: RaidEvent) {
    const r = this.ctl.raid!;
    const unitOf = (id: string) => r.units.find((u) => u.id === id);
    switch (e.t) {
      case 'hit': {
        const p = iso(e.x, e.y);
        const u = unitOf(e.unit);
        if (u?.kind === 'customer') {
          if (this.t - (this.lastHitText.get(e.unit) ?? -9) > 0.25) {
            this.lastHitText.set(e.unit, this.t);
            this.scratch(p.x, p.y - 62);
          }
          sfx('hit', { volume: 0.4 });
          break;
        }
        // one ticking damage number per unit, not a pile of them
        this.floatText(p.x, p.y - 112, '-{n}', u?.side === 'z' ? '#E8705A' : '#F2E7C4', 16, { anchor: e.unit, merge: 'dmg', value: Math.max(1, e.dmg) });
        if (this.t - this.lastPow > 0.3 && Math.random() < 0.5 && (this.lastPow = this.t)) this.pop('fx_hit', p.x, p.y - 60, 180);
        const by = unitOf(e.by);
        sfx(by?.kind === 'boss' ? 'whack' : 'hit', { volume: 0.5 });
        break;
      }
      case 'ko': {
        const p = iso(e.x, e.y);
        this.pop('fx_skull', p.x, p.y - 40, 1500);
        sfx('ko', { volume: 0.6 });
        if (unitOf(e.unit)?.kind === 'boss') this.cameras.main.shake(400, 0.01);
        break;
      }
      case 'scream': {
        const p = iso(e.x, e.y);
        // screams are chatter: one per diner at most, and only while it's quiet around them
        if (Math.random() < 0.5) this.floatText(p.x, p.y - 112, Math.random() < 0.5 ? 'AAAH!' : 'ZOMBIES!', '#F2E7C4', 16, { anchor: e.unit });
        if (Math.random() < 0.5) sfx('scream', { pitch: 0.9 + Math.random() * 0.5, volume: 0.6 });
        break;
      }
      case 'eat': {
        this.eatenAt.set(e.customer, this.t);
        const bp = iso(e.x, e.y);
        this.bones.push({ img: propImage(this, `bones_pile_${this.bones.length % 3}`, bp.x, bp.y).setDepth(moverDepth(e.x, e.y, -2)).setAlpha(0).setScale(1.3 / TEX_S), t0: this.t });
        const p = iso(e.x, e.y);
        // the text rides above the head and the cash pops beside the body, so they don't print over each other
        this.floatText(p.x, p.y - 118, e.body ? 'FEAST!' : 'CHOMP!', '#E06A55', 18, { anchor: e.customer, force: true });
        this.floatText(p.x, p.y - 118, `${e.cash}`, '#E3CB5E', 17, { anchor: e.customer, force: true, icon: 'fx_cash' });
        sfx('chomp');
        setTimeout(() => sfx('scream', { pitch: 1 + Math.random() * 0.3 }), 120);
        break;
      }
      case 'escape':
        break;
      case 'arrive': {
        // a walk-in at the door: a little "+1 diner" over the doorway
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 112, '+1 DINER', '#F2E7C4', 16, { anchor: 'door' });
        sfx('tap', { volume: 0.3, pitch: 1.3 });
        break;
      }
      case 'revive': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 112, 'BACK UP!', '#9BE36B', 18, { anchor: e.unit, force: true });
        this.pop('fx_heal', p.x, p.y - 50, 700);
        sfx('heal');
        break;
      }
      case 'stone':
        this.cameras.main.flash(260, 120, 220, 90);
        this.ctl.info('Health Stone: everybody mends!');
        sfx('heal');
        break;
      case 'ability': {
        const p = iso(e.x, e.y);
        const label = e.kind === 'slam' ? 'BELLY SLAM!' : e.kind === 'stun' ? 'CUFFED!' : e.kind === 'jab' ? 'ONE-TWO!' : 'HEY! OVER HERE!';
        if (e.kind !== 'jab' || Math.random() < 0.35) this.floatText(p.x, p.y - 112, label, '#E8B04A', 17, { anchor: e.unit });
        if (e.kind === 'slam') {
          this.cameras.main.shake(220, 0.006);
          sfx('stomp', { volume: 0.7 });
        } else if (e.kind === 'stun') sfx('zap', { volume: 0.5 });
        break;
      }
      case 'enter':
        sfx('groan', { pitch: 0.7 + Math.random() * 0.4, volume: 0.6 });
        break;
      case 'steal': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 112, 'SWIPED!', '#9BD62E', 18, { anchor: e.unit, force: true });
        this.pop(DISH_BY_ID[e.dish].icon, p.x, p.y - 70, 900);
        sfx('cashRegister', { volume: 0.6 });
        break;
      }
      case 'boss': {
        const p = iso(e.x, e.y);
        const def = RIVAL_BY_ID[r.rival];
        this.floatText(p.x, p.y - 130, `${def.chef.toUpperCase()}!`, '#E06A55', 22, { anchor: 'boss', force: true });
        this.ctl.info(`“${def.taunt}”`);
        this.cameras.main.shake(350, 0.006);
        sfx('summon', { volume: 0.5 });
        break;
      }
      case 'buff':
        this.cameras.main.flash(220, e.kind === 'str' ? 200 : 120, e.kind === 'str' ? 70 : 200, 60);
        sfx(e.kind === 'str' ? 'stomp' : 'heal');
        break;
      case 'summon': {
        const u = unitOf(e.unit);
        if (u) {
          const p = iso(u.x, u.y);
          this.floatText(p.x, p.y - 150, 'BIG FOOT-LONG!', '#D9C25A', 22, { anchor: u.id, force: true });
        }
        this.cameras.main.shake(500, 0.01);
        sfx('summon');
        break;
      }
      case 'end':
        sfx(e.result === 'won' ? 'raidWin' : e.result === 'lost' ? 'raidLose' : 'flag');
        this.game.events.emit('raid-ended');
        break;
    }
  }
}
