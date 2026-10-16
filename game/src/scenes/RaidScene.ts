/**
 * Renders a raid (src/sim/raid.ts) on top of the joint. The joint scene keeps ticking the sim
 * underneath (your other zombies keep working); this scene only draws and takes taps.
 */
import Phaser from 'phaser';
import { RAID_META, TILE_H, TILE_W, WALL_H } from '../art';
import { ARENA_N, GATE_Y, LINE_X, RIVAL_BY_ID, focusTarget, isoToWorld, sendOne, stealDish, worldToIso, type RaidEvent, type RaidUnit } from '../sim';
import type { Controller } from '../game/controller';
import { sfx } from '../game/sfx';
import { TEX_S, charArt, charLoaded, hasProp, loadChar, loadRaidProps, propMeta } from './assets';
import { Puppet } from './puppet';

const iso = (x: number, y: number) => isoToWorld(x, y, TILE_W, TILE_H);
const depthOf = (x: number, y: number) => (x + y) * 10;
const LOT_LO = -3;
const LOT_HI = ARENA_N + 4;

interface UnitView {
  holder: Phaser.GameObjects.Container;
  puppet: Puppet | null;
  img?: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  barQ: number;
  alert?: Phaser.GameObjects.Image;
  koT: number;
}

export class RaidScene extends Phaser.Scene {
  private ctl!: Controller;
  private views = new Map<string, UnitView>();
  private counterDishes: Phaser.GameObjects.Image[] = [];
  private gateImg?: Phaser.GameObjects.Image;
  private ready = false;
  private t = 0;
  private seenEvents = 0;
  private drag: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;

  constructor() {
    super('raid');
  }

  init(data: { ctl: Controller }) {
    this.ctl = data.ctl;
    this.ready = false;
    this.views.clear();
    this.counterDishes = [];
    this.seenEvents = 0;
  }

  create() {
    const r = this.ctl.raid!;
    this.cameras.main.setBackgroundColor('#7cb342');
    const ids = new Set(r.units.filter((u) => u.kind !== 'gate' && u.kind !== 'zapper').map((u) => u.art));
    void Promise.all([loadRaidProps(this), ...[...ids].map((id) => loadChar(this, id))]).then(() => {
      this.buildArena();
      this.fitCamera();
      this.setupInput();
      this.ready = true;
      this.game.events.emit('raid-ready');
    });
    this.scale.on('resize', this.fitCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this));
  }

  private img(key: string, x: number, y: number) {
    const m = propMeta(key);
    const i = this.add.image(x, y, hasProp(key) ? key : '__MISSING').setScale(1 / TEX_S);
    if (m) i.setOrigin(m.ox, m.oy);
    return i;
  }

  private buildArena() {
    const r = this.ctl.raid!;
    const rid = r.rival;
    const N = ARENA_N;
    for (let y = LOT_LO; y <= LOT_HI; y++)
      for (let x = LOT_LO; x <= LOT_HI; x++) {
        const inside = x >= 0 && y >= 0 && x < N && y < N;
        let key = 'grass';
        if (inside) key = `raid_floor_${rid}_${(x + y) % 2 === 0 ? 'a' : 'b'}`;
        else if (x === LINE_X) key = 'sidewalk';
        else if (x === LINE_X + 1) key = 'road_line';
        else if (x > LINE_X + 1) key = 'road';
        const p = iso(x, y);
        this.img(key, p.x, p.y).setDepth(-100000 + depthOf(x, y));
      }
    for (let i = 0; i < N; i++) {
      const cr = iso(i, 0);
      this.img(`raid_wall_r_${rid}`, cr.x + TILE_W / 4, cr.y).setDepth(depthOf(i, 0) - 6);
      const cl = iso(0, i);
      this.img(`raid_wall_l_${rid}`, cl.x - TILE_W / 4, cl.y).setDepth(depthOf(0, i) - 6);
      // front fences (see raidprops.ts placement notes)
      const fl = iso(i, N - 1);
      this.img('fence_l', fl.x - TILE_W / 4, fl.y + TILE_H / 2).setDepth(depthOf(i, N - 1) + 9);
      const fr = iso(N - 1, i);
      const key = i === GATE_Y ? 'gate_r' : 'fence_r';
      const fimg = this.img(key, fr.x + TILE_W / 4, fr.y + TILE_H / 2).setDepth(depthOf(N - 1, i) + 9);
      if (i === GATE_Y) this.gateImg = fimg;
    }
    // inside: counter with the dishes you can swipe, tables
    r.counter.forEach((c, i) => {
      const p = iso(c.x, c.y);
      this.img('counter', p.x, p.y).setDepth(depthOf(c.x, c.y) + 1);
      this.counterDishes[i] = this.img(r.counter[i].dish ? `dish_${dishArt(c.dish)}` : 'dish_burger', p.x, p.y - 34).setDepth(depthOf(c.x, c.y) + 2);
    });
    for (const [x, y] of [
      [2, 2],
      [4, 2],
      [2, 4],
      [4, 4],
    ]) {
      const p = iso(x, y);
      this.img('table_diner', p.x, p.y).setDepth(depthOf(x, y) + 1);
    }
    const sign = iso(N + 1, -1);
    this.img(`raid_sign_${rid}`, sign.x, sign.y).setDepth(depthOf(N + 1, -1) + 2);
    if (rid === 'chuck') {
      const w = iso(N + 1, N + 1);
      this.img('chuck_wagon', w.x, w.y).setDepth(depthOf(N + 1, N + 1) + 2);
    }
    for (const [k, x, y] of [
      ['tree', -2, 2],
      ['tree', 2, N + 2],
      ['tombstone', -1, N],
    ] as const) {
      const p = iso(x, y);
      this.img(k, p.x, p.y).setDepth(depthOf(x, y) + 2);
    }
  }

  private fitCamera() {
    const cam = this.cameras.main;
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.scale.width / dpr;
    const cssH = this.scale.height / dpr;
    const w = (ARENA_N + 4) * TILE_W;
    const h = (ARENA_N + 4) * TILE_H + WALL_H;
    const z = Math.min((cssW - 150) / w, (cssH - 70) / h) * 1.15;
    cam.setZoom(z * dpr);
    const c = iso(ARENA_N / 2 + 0.8, ARENA_N / 2 - 0.2);
    cam.centerOn(c.x, c.y - 20);
  }

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main;
      this.drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY, moved: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
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
      if (this.drag && !this.drag.moved) this.tap(p.worldX, p.worldY);
      this.drag = null;
    });
  }

  private tap(wx: number, wy: number) {
    const r = this.ctl.raid;
    if (!r || r.phase !== 'fight') return;
    // units: front-most hit wins
    let best: { u: RaidUnit; depth: number } | null = null;
    for (const u of r.units) {
      const v = this.views.get(u.id);
      if (!v || !v.holder.visible || u.hp <= 0) continue;
      const h = v.puppet?.height ?? 60;
      if (Math.abs(wx - v.holder.x) < 24 && wy < v.holder.y + 8 && wy > v.holder.y - h - 8) {
        if (!best || v.holder.depth > best.depth) best = { u, depth: v.holder.depth };
      }
    }
    if (best) {
      const u = best.u;
      if (u.side === 'z') {
        if (u.state === 'queued') {
          sendOne(r, u.id);
          sfx('groan', { pitch: 0.8 + Math.random() * 0.4 });
        }
        return;
      }
      focusTarget(r, u.id);
      sfx('tap');
      this.ctl.info(u.side === 'c' ? 'Dinner time!' : `Everybody on the ${u.name}!`);
      return;
    }
    // the counter: steal a dish
    const t = worldToIso(wx, wy + 20, TILE_W, TILE_H);
    const slot = r.counter.findIndex((c) => Math.round(t.x) === c.x && Math.round(t.y) === c.y);
    if (slot >= 0) {
      const err = stealDish(r, slot);
      if (err) this.ctl.toast(err, false);
      else {
        sfx('tap');
        this.ctl.info('Swipe that dish!');
      }
    }
  }

  private view(u: RaidUnit): UnitView {
    let v = this.views.get(u.id);
    if (v) return v;
    const holder = this.add.container(0, 0);
    const bar = this.add.graphics();
    v = { holder, puppet: null, bar, barQ: -1, koT: -1 };
    if (u.kind === 'zapper' || u.kind === 'gate') {
      if (u.kind === 'zapper') {
        v.img = this.img('bug_zapper', 0, 0);
        holder.add(v.img);
      }
    } else if (charLoaded(this, u.art)) {
      const a = charArt(u.art);
      if (a) {
        v.puppet = new Puppet(this, a);
        holder.add(v.puppet.root);
        if (u.kind === 'summon') holder.setScale(1.15);
      }
    }
    holder.add(bar);
    if (u.side === 'z') {
      v.alert = this.img('fx_alert', 12, -90);
      holder.add(v.alert);
    }
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
    g.fillStyle(0x2b1b17, 1).fillRoundedRect(-16, 0, 32, 6, 3);
    g.fillStyle(u.side === 'z' ? 0xe2403a : 0x6fcf3a, 1).fillRoundedRect(-15, 1, Math.max(1, 30 * f), 4, 2);
  }

  update(_time: number, deltaMs: number) {
    if (!this.ready || !this.ctl.raid) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.t += dt;
    const r = this.ctl.raid;
    for (const u of r.units) {
      if (u.kind === 'gate') {
        this.gateImg?.setAlpha(u.hp > 0 ? 1 : 0).setTint(r.t - u.hitAt < 0.12 ? 0xff9090 : 0xffffff);
        continue;
      }
      const v = this.view(u);
      const p = iso(u.x, u.y);
      const gone = u.state === 'gone' || u.state === 'hidden';
      v.holder.setVisible(!gone).setPosition(p.x, p.y).setDepth(depthOf(u.x, u.y) + 5);
      if (gone) continue;
      if (!v.puppet && u.kind !== 'zapper' && charLoaded(this, u.art)) {
        const a = charArt(u.art);
        if (a) {
          v.puppet = new Puppet(this, a);
          v.holder.addAt(v.puppet.root, 0);
        }
      }
      const down = u.hp <= 0;
      const top = v.puppet ? -v.puppet.height * (u.kind === 'summon' ? 1.15 : 1) - 8 : -(RAID_META.zapperCoilZ + 12);
      this.drawBar(v, u, down ? -30 : top);
      v.alert?.setVisible(u.state === 'queued').setY(top - 14 + Math.sin(this.t * 4) * 2);
      if (v.puppet) {
        v.puppet.setFacing(u.facing, !!u.back && u.state === 'walk');
        const zombie = u.side === 'z' && (u.kind === 'zombie' || u.kind === 'summon');
        const attackT = r.t - u.attackAt;
        const moving = u.state === 'walk' || u.state === 'flee';
        let pose: Parameters<Puppet['pose']>[0] = 'idle';
        if (down) pose = 'lie';
        else if (u.state === 'flee') pose = 'run';
        else if (u.state === 'eat' || u.state === 'steal') pose = 'eat';
        else if (attackT < 0.5) pose = 'attack';
        else if (moving && r.t - u.attackAt > 0.6) pose = 'walk';
        if (u.side === 'c' && u.state === 'idle') pose = 'sit';
        v.puppet.pose(pose, dt, { zombie, attackT, speed: u.speed / 1.5 });
        const face = down ? 'dazed' : u.state === 'flee' ? 'scream' : u.state === 'eat' ? 'chomp' : zombie && attackT < 0.5 ? 'chomp' : u.side === 'r' && r.t - u.hitAt < 0.4 ? 'scream' : u.kind === 'boss' && !down ? 'happy' : undefined;
        v.puppet.setFace(face as never);
        if (r.t - u.hitAt < 0.12) v.puppet.setTint(0xff9090);
        else if (u.side === 'z' && r.t < r.redUntil) v.puppet.setTint(0xff6a6a);
        else if (r.focus === u.id) v.puppet.setTint(0xfff2a0);
        else v.puppet.clearTint();
      } else if (v.img) v.img.setTint(r.t - u.hitAt < 0.12 ? 0xff9090 : 0xffffff).setAlpha(down ? 0.4 : 1);
    }
    r.counter.forEach((c, i) => this.counterDishes[i]?.setVisible(c.servings > 0));
    // play new events
    while (this.seenEvents < r.events.length) this.fx(r.events[this.seenEvents++]);
    if (r.events.length < this.seenEvents) this.seenEvents = r.events.length;
  }

  private floatText(x: number, y: number, text: string, color: string, size = 13) {
    const t = this.add
      .text(x, y, text, { fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#2b1b17', strokeThickness: 3 })
      .setResolution(TEX_S)
      .setOrigin(0.5)
      .setDepth(100000)
      .setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, delay: 400, duration: 700, onComplete: () => t.destroy() });
  }

  private pop(key: string, x: number, y: number, ms = 500) {
    if (!hasProp(key)) return;
    const i = this.img(key, x, y).setDepth(100001).setScale(0);
    this.tweens.add({ targets: i, scale: 1 / TEX_S, duration: 120, ease: 'Back.Out' });
    this.tweens.add({ targets: i, alpha: 0, delay: ms, duration: 250, onComplete: () => i.destroy() });
  }

  private fx(e: RaidEvent) {
    const r = this.ctl.raid!;
    const unitOf = (id: string) => r.units.find((u) => u.id === id);
    switch (e.t) {
      case 'hit': {
        const p = iso(e.x, e.y);
        const u = unitOf(e.unit);
        this.floatText(p.x + (Math.random() - 0.5) * 16, p.y - 70, `-${e.dmg}`, u?.side === 'z' ? '#ff5a4a' : '#ffffff', 12);
        if (Math.random() < 0.35) this.pop('fx_hit', p.x, p.y - 50, 180);
        const by = unitOf(e.by);
        if (by?.kind !== 'zapper') sfx(by?.kind === 'boss' ? 'whack' : 'hit', { volume: 0.5 });
        break;
      }
      case 'ko': {
        const p = iso(e.x, e.y);
        this.pop('fx_ko', p.x, p.y - 34, 1500);
        sfx('ko', { volume: 0.6 });
        const u = unitOf(e.unit);
        if (u?.kind === 'boss') this.cameras.main.shake(400, 0.01);
        break;
      }
      case 'zap': {
        const from = unitOf(e.from);
        const to = unitOf(e.to);
        if (from && to) {
          const a = iso(from.x, from.y);
          const b = iso(to.x, to.y);
          const top = { x: a.x, y: a.y - RAID_META.zapperCoilZ };
          const bolt = this.img('zapper_bolt', b.x, b.y - 30).setDepth(100000);
          const d = Phaser.Math.Distance.Between(top.x, top.y, b.x, b.y - 30);
          bolt.setRotation(Math.atan2(top.y - (b.y - 30), top.x - b.x) - Math.PI / 2 + Math.PI);
          bolt.setScale(1 / TEX_S, ((d / 90) * 1) / TEX_S);
          this.tweens.add({ targets: bolt, alpha: 0, duration: 220, onComplete: () => bolt.destroy() });
        }
        sfx('zap', { volume: 0.6 });
        break;
      }
      case 'eat': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 60, `CHOMP! +$${e.cash}`, '#ffc83d', 14);
        this.pop('fx_coin', p.x, p.y - 40);
        sfx('chomp');
        setTimeout(() => sfx('scream', { pitch: 1 + Math.random() * 0.3 }), 120);
        break;
      }
      case 'steal': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 70, 'SWIPED!', '#9be36b', 15);
        this.pop('fx_recipe', p.x, p.y - 50, 900);
        sfx('cashRegister', { volume: 0.6 });
        break;
      }
      case 'gate': {
        const p = iso(e.x, e.y);
        this.floatText(p.x, p.y - 60, 'CRASH!', '#ffffff', 20);
        this.cameras.main.shake(300, 0.008);
        sfx('stomp');
        break;
      }
      case 'boss': {
        const p = iso(e.x, e.y);
        const def = RIVAL_BY_ID[r.rival];
        this.floatText(p.x, p.y - 100, `${def.chef.toUpperCase()}!`, '#ff5a4a', 20);
        this.ctl.info(`“${def.taunt}”`);
        this.cameras.main.shake(350, 0.006);
        sfx('summon', { volume: 0.5 });
        break;
      }
      case 'heal':
        sfx('heal', { volume: 0.5 });
        break;
      case 'summon': {
        const u = unitOf(e.unit);
        if (u) {
          const p = iso(u.x, u.y);
          this.floatText(p.x, p.y - 140, 'BIG FOOT-LONG!', '#ffc83d', 18);
        }
        this.cameras.main.shake(500, 0.01);
        sfx('summon');
        break;
      }
      case 'rage':
        this.cameras.main.flash(200, 255, 80, 80);
        sfx('stomp');
        break;
      case 'end':
        sfx(e.result === 'won' ? 'raidWin' : e.result === 'lost' ? 'raidLose' : 'flag');
        this.game.events.emit('raid-ended');
        break;
    }
  }
}

function dishArt(id: string): string {
  const map: Record<string, string> = { hotdog: 'hotdog', burger: 'burger', wings: 'wings', pork: 'pork', ribs: 'ribs', brisket: 'brisket', rings: 'rings', nuggets: 'nuggets', chili: 'chili', smash: 'smash', salad: 'salad', chicken: 'chicken', foie: 'foie' };
  return map[id] ?? 'burger';
}
