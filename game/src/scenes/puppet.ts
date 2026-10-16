/**
 * Cutout-puppet animation (the original's Flash-style look, done with live part rotation).
 * One Puppet = one character: front + back views, expression faces, biped or four-legged rig.
 */
import Phaser from 'phaser';
import type { CharArt, FaceName } from '../art';
import { TEX_S } from './assets';

export type Pose = 'idle' | 'walk' | 'run' | 'cook' | 'eat' | 'feast' | 'sit' | 'shiver' | 'lie' | 'attack' | 'punch' | 'hit' | 'serve' | 'cheer' | 'dance';

interface View {
  box: Phaser.GameObjects.Container;
  parts: Record<string, Phaser.GameObjects.Image>;
  base: Record<string, { x: number; y: number }>;
}


export class Puppet {
  readonly root: Phaser.GameObjects.Container;
  /** rotates/flips as a whole (lying down, facing) */
  readonly body: Phaser.GameObjects.Container;
  readonly height: number;
  readonly rig: 'biped' | 'quad';
  /** how far the hips sit above the feet (so a sitter's hips can be put on the seat) */
  readonly hipY: number;
  private front: View;
  private back: View | null;
  private headKey?: string;
  private faces: Partial<Record<FaceName, string>> = {};
  private face?: FaceName;
  private phase = Math.random() * 10;
  private showingBack = false;

  constructor(
    scene: Phaser.Scene,
    readonly art: CharArt,
  ) {
    this.rig = art.rig ?? 'biped';
    this.height = art.height;
    this.root = scene.add.container(0, 0);
    this.body = scene.add.container(0, 0);
    this.root.add(this.body);
    this.front = this.makeView(scene, art.parts);
    this.back = art.backParts?.length ? this.makeView(scene, art.backParts) : null;
    if (this.back) this.back.box.setVisible(false);
    this.headKey = art.parts.find((p) => p.key.endsWith('_head'))?.key;
    const leg = art.parts.find((p) => p.key.endsWith('_legL'));
    this.hipY = leg ? -leg.y : 20;
    for (const [k, v] of Object.entries(art.faces ?? {})) if (v) this.faces[k as FaceName] = v.key;
  }

  private makeView(scene: Phaser.Scene, parts: CharArt['parts']): View {
    const box = scene.add.container(0, 0);
    this.body.add(box);
    const v: View = { box, parts: {}, base: {} };
    for (const p of parts) {
      const name = p.key.split('_').pop()!;
      const img = scene.add
        .image(p.x, p.y, p.key)
        .setScale(1 / TEX_S)
        .setOrigin(p.px / p.w, p.py / p.h);
      box.add(img);
      v.parts[name] = img;
      v.base[name] = { x: p.x, y: p.y };
    }
    return v;
  }

  setFacing(facing: 1 | -1, back = false) {
    this.body.scaleX = facing;
    const wantBack = back && !!this.back;
    if (wantBack !== this.showingBack) {
      this.showingBack = wantBack;
      this.front.box.setVisible(!wantBack);
      this.back?.box.setVisible(wantBack);
    }
  }

  /** Swap the head for an expression (scream, chomp, sleep…); undefined = normal face. */
  setFace(face?: FaceName) {
    if (face === this.face) return;
    this.face = face;
    const head = this.front.parts.head;
    if (!head || !this.headKey) return;
    const key = (face && this.faces[face]) || this.headKey;
    if (head.scene.textures.exists(key)) head.setTexture(key);
  }

  setTint(color: number) {
    for (const v of [this.front, this.back]) if (v) for (const p of Object.values(v.parts)) p.setTint(color);
  }

  clearTint() {
    for (const v of [this.front, this.back]) if (v) for (const p of Object.values(v.parts)) p.clearTint();
  }

  destroy() {
    this.root.destroy();
  }

  /**
   * Pose the parts for this frame, using the original's decoded clips (docs/10 §1.5) as the reference:
   * timings at 24 fps and the joint angles of walk, idle, sit, eat, carry, operate, attack, run, hit…
   * Limbs are two-segment (thigh + shin, upper arm + forearm) when the art has the lower parts
   * (`legL2`, `armL2`…): the lower part rides on the end of the upper one and adds its own bend. Older
   * one-piece limbs just use the upper angle.
   * Angles: 0 = hanging straight down; negative swings forward (toward the facing side), positive back.
   * @param attackT seconds since the last attack (for the strike swing) or since the plate was set down (serve)
   */
  pose(
    pose: Pose,
    dt: number,
    opts: {
      zombie?: boolean;
      speed?: number;
      attackT?: number;
      seated?: boolean;
      /** holding something out in front (a plate, a pot) */
      carry?: boolean;
      /** a seated customer who's been kept waiting (the original's hungry fidget) */
      impatient?: boolean;
    } = {},
  ) {
    const zombie = !!opts.zombie;
    const speed = opts.speed ?? 1;
    // clip lengths from the original (s): walk 1.625 (two steps; sped up by the walker's speed), run 0.667,
    // idle 1.625, eat 2.42, operate 2.08, attack 1.21, feast 0.83
    const cycle = pose === 'walk' ? 1.625 / (2.2 * speed) : pose === 'run' ? 0.667 / (1.4 * speed) : pose === 'cook' ? 2.08 : pose === 'eat' ? 2.42 : pose === 'attack' || pose === 'punch' ? 1.21 / 1.6 : pose === 'feast' ? 0.83 : pose === 'dance' ? 0.8 : pose === 'shiver' ? 0.2 : 1.625;
    this.phase += (dt * Math.PI * 2) / cycle;
    const view = this.showingBack && this.back ? this.back : this.front;
    if (this.rig === 'quad') return this.poseQuad(view, pose);
    const P = view.parts;
    const B = view.base;
    for (const k of Object.keys(P)) {
      P[k].x = B[k].x;
      P[k].y = B[k].y;
      P[k].rotation = 0;
      P[k].visible = true;
    }
    const D = Math.PI / 180;
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);
    const moving = pose === 'walk' || pose === 'run';
    const seated = pose === 'sit' || (pose === 'eat' && !!opts.seated);
    // joint angles: [upper, bend] per limb (L = the near limb in the front view)
    const J = { legL: [0, 0], legR: [0, 0], armL: [0, 0], armR: [0, 0] } as Record<'legL' | 'legR' | 'armL' | 'armR', [number, number]>;
    let lean = 0; // the upper body bending at the waist (feast, serve, hit)
    let headRot = 0;
    let headDY = 0;
    // ----- legs -----
    if (seated) {
      // original sit: thighs 64° / 84° forward, shins folded back so they hang straight down
      J.legL = [-64 * D, 64 * D];
      J.legR = [-84 * D, 79 * D + (pose === 'eat' ? 0 : Math.sin(this.phase * 0.4) * 0.05)];
    } else if (pose === 'run') {
      // original run: thighs ±40°, knees fold to ~50°
      J.legL = [s * 40 * D, Math.max(0, Math.sin(this.phase - 1.3)) * 48 * D];
      J.legR = [-s * 40 * D, Math.max(0, Math.sin(this.phase + Math.PI - 1.3)) * 52 * D];
    } else if (pose === 'walk') {
      // original walk: thighs ±24° in anti-phase, the swinging knee folds to 55° a quarter-cycle behind;
      // zombies drag one leg (the limp)
      const drag = zombie ? 0.45 : 1;
      J.legL = [s * 24 * D, Math.max(0, Math.sin(this.phase - Math.PI / 2)) * 55 * D];
      J.legR = [-s * 24 * D * drag, Math.max(0, Math.sin(this.phase + Math.PI / 2)) * 55 * D * drag];
    } else if (pose === 'dance') {
      J.legL = [s * 0.35, Math.max(0, s) * 0.5];
      J.legR = [-s * 0.35, Math.max(0, -s) * 0.5];
    } else if (pose === 'attack' || pose === 'punch') {
      J.legL = [-0.22, 0.28]; // braced
      J.legR = [0.18, 0.08];
    } else if (pose === 'feast') {
      J.legL = [-0.15, 0.3];
      J.legR = [0.1, 0.2];
    }
    // ----- arms and head -----
    switch (pose) {
      case 'attack': {
        // zombie claw (original attack): the near arm swings 0→95° forward, the far arm to ~68°, in step
        const a = Math.min(1, (opts.attackT ?? 1) / 0.35);
        const swing = a < 1 ? Math.sin(a * Math.PI) : 0.15 + Math.max(0, s) * 0.1;
        J.armL = [-95 * D * swing, -0.15];
        J.armR = [-68 * D * swing + 12 * D, -24 * D];
        headRot = -0.08 * swing;
        break;
      }
      case 'punch': {
        // a human punching (original attackHuman): cock back 42°, jab 98° forward
        const a = Math.min(1, (opts.attackT ?? 1) / 0.35);
        const up = a < 0.4 ? a / 0.4 : 1 - (a - 0.4) / 0.6;
        J.armL = a < 1 ? (a < 0.4 ? [42 * D * up, -37 * D] : [-98 * D * up, 17 * D]) : [0.15, -0.5];
        J.armR = [0.16, -28 * D];
        break;
      }
      case 'cook':
        // original operate: both forearms stir/chop up to ~100°
        J.armL = [-21 * D - c * 21 * D, -50 * D + c * 49 * D];
        J.armR = [-6 * D + Math.sin(this.phase * 2) * 18 * D, -60 * D - s * 40 * D];
        headRot = -0.04 + Math.sin(this.phase * 0.5) * 0.04;
        break;
      case 'eat': {
        // original eat: fork up to the mouth (upper arm 0→44°, forearm 80→98°) for the first part of the
        // loop, then hold while the head chews and rocks
        const t = (this.phase / (Math.PI * 2)) % 1;
        const lift = t < 0.6 ? Math.sin((t / 0.6) * Math.PI) : 0;
        J.armL = [-44 * D * lift, -80 * D - 18 * D * lift];
        J.armR = [7 * D - Math.max(0, Math.sin(this.phase * 2 + 1)) * 20 * D, -95 * D];
        headRot = (t < 0.6 ? -0.1 * lift : Math.sin(t * 40) * 0.12) as number;
        headDY = Math.abs(Math.sin(t * 20)) * 1.2;
        break;
      }
      case 'feast':
        // original feast: bent over a body, head dipping twice a loop, hand to mouth
        lean = 20 * D;
        J.armL = [-21 * D - Math.max(0, s) * 12 * D, -Math.max(0, Math.sin(this.phase * 2)) * 69 * D];
        J.armR = [28 * D, -40 * D];
        headRot = -Math.abs(Math.sin(this.phase)) * 14 * D;
        break;
      case 'sit':
        // original sit: forearms flat on the table edge (80° / 95°)
        J.armL = [0, -80 * D];
        J.armR = [7 * D, -95 * D];
        headRot = Math.sin(this.phase * 0.6) * 0.03;
        if (opts.impatient) {
          // drumming fingers on the table, glancing round for the waiter
          J.armL = [-6 * D, -80 * D + Math.max(0, Math.sin(this.phase * 9)) * 22 * D];
          headRot = Math.sin(this.phase * 1.3) * 0.12;
        }
        break;
      case 'serve':
        // original serve: lean in 23° and push the plate out
        lean = 23 * D * (opts.attackT !== undefined ? Math.sin(Math.min(1, opts.attackT / 0.5) * Math.PI) : 1);
        J.armL = [-29 * D, -20 * D];
        J.armR = [-17 * D, -38 * D];
        break;
      case 'hit':
        // original hit: the head snaps back 44°, the torso rocks back 9°
        lean = -9 * D;
        headRot = 30 * D;
        J.armL = [-28 * D, 0];
        J.armR = [-6 * D, -40 * D];
        break;
      case 'cheer':
        J.armL = [-170 * D + Math.sin(this.phase * 3) * 0.3, -0.3];
        J.armR = [-113 * D - Math.sin(this.phase * 3) * 0.3, -0.3];
        break;
      case 'dance':
        J.armL = [-1.6 + s * 0.9, -0.6];
        J.armR = [-1.6 - s * 0.9, -0.6];
        break;
      case 'run':
        // original run (a human panicking): hands clamped to the head; zombies lurch arms-out instead
        J.armL = zombie ? [-80 * D + s * 0.15, -0.1] : [4 * D, -10 * D];
        J.armR = zombie ? [-60 * D - s * 0.15, -0.1] : [-113 * D - s * 7 * D, -60 * D];
        headRot = zombie ? 0.1 : 5 * D;
        break;
      case 'shiver':
        // startled / grabbed: arms jerk out, head pops back
        J.armL = [-44 * D, -1.4];
        J.armR = [-20 * D, -1.6];
        headRot = 0.18;
        break;
      case 'lie':
        J.armL = [-0.3, -0.2];
        J.armR = [0.2, 0];
        break;
      default:
        if (zombie) {
          // the zombie shamble (original walk2): arms held straight out, near 72–89°, far 41–70°
          J.armL = [-(80 + s * 8) * D, -0.06];
          J.armR = [-(55 - s * 14) * D, -0.05];
        } else if (pose === 'walk') {
          // original walk: arms ±17° opposite the legs, the far forearm swinging 24–75°
          J.armL = [-s * 17 * D, -(12 + Math.max(0, s) * 13) * D];
          J.armR = [s * 17 * D, -(24 + Math.max(0, -s) * 50) * D];
        } else {
          // original idle: the body is frozen in a slouch (near arm 9° forward, far arm back with the
          // forearm bent 40°); only the head sways
          J.armL = [-9 * D, 0];
          J.armR = [15 * D, -40 * D];
        }
    }
    if (opts.carry) {
      // original carry: both arms locked forward-bent holding the dish (upper 17° / 7°, forearms 44° / 55°)
      J.armL = [-17 * D, -44 * D];
      J.armR = [-7 * D, -55 * D];
    }
    // walking bobs the hips and head (not the torso, in the original, but a tiny ride reads better here)
    const bob = moving ? -Math.abs(Math.sin(this.phase)) * (pose === 'run' ? 1.2 : 2) : pose === 'dance' ? -Math.abs(s) * 4 : 0;
    for (const k of ['torso', 'armL', 'armR', 'head', 'armL2', 'armR2', 'legL', 'legR', 'legL2', 'legR2']) if (P[k]) P[k].y = B[k].y + bob;
    for (const limb of ['legL', 'legR', 'armL', 'armR'] as const) {
      const up = P[limb];
      if (!up) continue;
      const [a, bend] = J[limb];
      up.rotation = a;
      const lo = P[`${limb}2`];
      if (!lo) continue;
      // the knee / elbow is carried round by the upper segment
      const bu = B[limb];
      const bl = B[`${limb}2`];
      const dx = bl.x - bu.x;
      const dy = bl.y - bu.y;
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      lo.x = up.x + dx * cs - dy * sn;
      lo.y = up.y + dx * sn + dy * cs;
      lo.rotation = a + bend;
    }
    if (P.head) {
      // original idle: only the head sways, dipping and nodding toward the face in a slow loop
      if (pose === 'idle' && !zombie) {
        P.head.y += (1 - c) * 0.9;
        P.head.x += (1 - c) * 0.6;
      }
      P.head.y += headDY;
      P.head.rotation = headRot + (zombie && pose !== 'attack' && pose !== 'feast' ? 0.16 + Math.sin(this.phase * 0.7) * 0.06 : 0);
    }
    // bending at the waist: the whole upper body swings round the hips
    if (lean) {
      const hx = 0;
      const hy = -this.hipY;
      const cs = Math.cos(-lean);
      const sn = Math.sin(-lean);
      for (const k of ['torso', 'head', 'armL', 'armR', 'armL2', 'armR2']) {
        const q = P[k];
        if (!q) continue;
        const dx = q.x - hx;
        const dy = q.y - hy;
        q.x = hx + dx * cs - dy * sn;
        q.y = hy + dx * sn + dy * cs;
        q.rotation -= lean;
      }
    }
    // seen from behind, a sitter's legs are tucked under the table, out of sight behind the body
    if (seated && this.showingBack) for (const k of ['legL', 'legR', 'legL2', 'legR2']) if (P[k]) P[k].visible = false;
    if (pose === 'lie') {
      // original death: falls flat on the back
      this.body.rotation = -1.5 * Math.sign(this.body.scaleX || 1);
      this.body.y = -6;
    } else {
      this.body.rotation = zombie && pose === 'walk' ? Math.sin(this.phase * 0.5) * 0.05 : 0;
      this.body.y = 0;
    }
    this.body.x = pose === 'shiver' ? (Math.random() - 0.5) * 2.4 : 0;
  }

  private poseQuad(view: View, pose: Pose) {
    const P = view.parts;
    const B = view.base;
    for (const k of Object.keys(P)) {
      P[k].x = B[k].x;
      P[k].y = B[k].y;
      P[k].rotation = 0;
    }
    const s = Math.sin(this.phase);
    const moving = pose === 'walk' || pose === 'run' || pose === 'attack';
    const swing = moving ? 0.6 : 0;
    // diagonal pairs move together, like a trot
    if (P.legFL) P.legFL.rotation = s * swing;
    if (P.legBR) P.legBR.rotation = s * swing;
    if (P.legFR) P.legFR.rotation = -s * swing;
    if (P.legBL) P.legBL.rotation = -s * swing;
    if (P.tail) P.tail.rotation = Math.sin(this.phase * 2.5) * 0.5;
    const bob = moving ? -Math.abs(s) * 1.6 : Math.sin(this.phase) * 0.4;
    for (const k of ['body', 'head', 'tail']) if (P[k]) P[k].y = B[k].y + bob;
    if (P.head) P.head.rotation = pose === 'attack' ? -0.2 + Math.abs(s) * 0.35 : Math.sin(this.phase * 0.6) * 0.08;
    if (pose === 'lie') {
      this.body.rotation = 0;
      for (const k of ['legFL', 'legFR', 'legBL', 'legBR']) if (P[k]) P[k].rotation = 1.2;
      this.body.y = 4;
    } else {
      this.body.rotation = 0;
      this.body.y = 0;
    }
  }
}
