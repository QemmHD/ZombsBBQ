/**
 * Cutout-puppet animation (the original's Flash-style look, done with live part rotation).
 * One Puppet = one character: front + back views, expression faces, biped or four-legged rig.
 */
import Phaser from 'phaser';
import type { CharArt, FaceName } from '../art';
import { TEX_S } from './assets';

export type Pose = 'idle' | 'walk' | 'run' | 'cook' | 'eat' | 'sit' | 'shiver' | 'lie' | 'attack' | 'cheer' | 'dance';

interface View {
  box: Phaser.GameObjects.Container;
  parts: Record<string, Phaser.GameObjects.Image>;
  base: Record<string, { x: number; y: number }>;
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

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
   * Pose the parts for this frame. Limbs are two-segment (thigh + shin, upper arm + forearm) when the
   * art has the lower parts (`legL2`, `armL2`…): the lower part rides on the end of the upper one and
   * adds its own bend, so knees bend to sit and elbows bend to carry, eat and claw. Older one-piece
   * limbs just use the upper angle.
   * Angles: 0 = hanging straight down; negative swings forward (toward the facing side), positive back.
   * @param attackT seconds since the last attack (for the strike swing)
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
    } = {},
  ) {
    const zombie = !!opts.zombie;
    const speed = opts.speed ?? 1;
    const rate = pose === 'walk' ? 9 * speed : pose === 'run' ? 15 * speed : pose === 'cook' ? 10 : pose === 'dance' ? 8 : pose === 'shiver' ? 30 : pose === 'eat' ? 5 : 2.4;
    this.phase += dt * rate;
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
    const s = Math.sin(this.phase);
    const moving = pose === 'walk' || pose === 'run';
    const seated = pose === 'sit' || (pose === 'eat' && !!opts.seated);
    // joint angles: [upper, bend] per limb
    const J = { legL: [0, 0], legR: [0, 0], armL: [0, 0], armR: [0, 0] } as Record<'legL' | 'legR' | 'armL' | 'armR', [number, number]>;
    // ----- legs -----
    if (seated) {
      // thighs straight out in front, shins hanging down off the seat
      J.legL = [-1.45, 1.4];
      J.legR = [-1.35, 1.32 + (pose === 'eat' ? 0 : Math.sin(this.phase * 0.7) * 0.06)]; // a bored little foot jiggle
    } else if (moving) {
      const swing = pose === 'run' ? 0.85 : 0.55;
      const drag = zombie && pose === 'walk' ? 0.35 : 1; // zombies drag one foot
      J.legL = [s * swing, Math.max(0, Math.sin(this.phase - 1.1)) * (pose === 'run' ? 1.1 : 0.7)];
      J.legR = [-s * swing * drag, Math.max(0, Math.sin(this.phase + Math.PI - 1.1)) * (pose === 'run' ? 1.1 : 0.7) * drag];
    } else if (pose === 'dance') {
      J.legL = [s * 0.35, Math.max(0, s) * 0.5];
      J.legR = [-s * 0.35, Math.max(0, -s) * 0.5];
    } else if (pose === 'attack') {
      J.legL = [-0.3, 0.35]; // lunge
      J.legR = [0.25, 0.1];
    } else if (pose === 'cook') {
      J.legL = [0, Math.max(0, Math.sin(this.phase * 0.5)) * 0.08];
    }
    // ----- arms -----
    switch (pose) {
      case 'attack': {
        // claw: wind up high, rake down
        const a = Math.min(1, (opts.attackT ?? 1) / 0.32);
        J.armL = a < 1 ? [-2.3 + easeOut(a) * 2.2, -0.5 + easeOut(a) * 0.4] : [-0.4 + s * 0.1, -0.3];
        J.armR = zombie ? [-1.2, -0.15] : [-0.6, -0.9];
        break;
      }
      case 'cook':
        J.armL = [-0.55 + s * 0.25, -1.0 + Math.cos(this.phase * 1.3) * 0.35]; // stirring
        J.armR = [-0.35, -0.9 + Math.cos(this.phase) * 0.2];
        break;
      case 'eat': {
        // fork to mouth, chew, repeat
        const bite = Math.max(0, s);
        J.armL = [-0.45 - bite * 0.3, -1.25 - bite * 0.55];
        J.armR = [-0.35, -0.8];
        break;
      }
      case 'sit':
        J.armL = [-0.35, -0.55]; // hands on the table
        J.armR = [-0.25, -0.6];
        break;
      case 'cheer':
        J.armL = [-2.6 + Math.sin(this.phase * 3) * 0.3, -0.3];
        J.armR = [-2.6 - Math.sin(this.phase * 3) * 0.3, -0.3];
        break;
      case 'dance':
        J.armL = [-1.6 + s * 0.9, -0.6];
        J.armR = [-1.6 - s * 0.9, -0.6];
        break;
      case 'run':
        // humans flail their arms up and run; zombies lurch with their arms out
        J.armL = zombie ? [-1.3 + s * 0.2, -0.1] : [-2.4 + s * 0.4, -0.5];
        J.armR = zombie ? [-1.2 - s * 0.2, -0.1] : [-2.4 - s * 0.4, -0.5];
        break;
      case 'shiver':
        J.armL = [-0.3, -1.6]; // hands up to the face
        J.armR = [-0.2, -1.7];
        break;
      case 'lie':
        J.armL = [-0.3, -0.2];
        J.armR = [0.2, 0];
        break;
      default:
        if (zombie) {
          // the classic zombie reach, arms straight out, swaying
          J.armL = [-1.25 + s * 0.12, -0.08];
          J.armR = [-1.15 - s * 0.12, -0.05];
        } else if (pose === 'walk') {
          J.armL = [-s * 0.5, -0.25 - Math.max(0, -s) * 0.3];
          J.armR = [s * 0.5, -0.25 - Math.max(0, s) * 0.3];
        } else {
          J.armL = [s * 0.05, -0.12];
          J.armR = [-s * 0.05, -0.1];
        }
    }
    if (opts.carry) {
      // holding a plate out at waist height
      J.armL = [-0.55, -1.05];
      J.armR = [-0.45, -1.1];
    }
    const bob = moving ? -Math.abs(Math.sin(this.phase)) * (pose === 'run' ? 3.2 : 2.2) : pose === 'dance' ? -Math.abs(s) * 4 : seated ? Math.sin(this.phase * 0.5) * 0.3 : Math.sin(this.phase) * 0.6;
    for (const k of ['torso', 'armL', 'armR', 'head', 'armL2', 'armR2']) if (P[k]) P[k].y = B[k].y + bob;
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
      const ux = up.x;
      const uy = up.y;
      const dx = bl.x - bu.x;
      const dy = bl.y - bu.y;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      lo.x = ux + dx * c - dy * sn;
      lo.y = uy + dx * sn + dy * c;
      lo.rotation = a + bend;
    }
    // seen from behind, a sitter's legs are tucked under the table, out of sight behind the body
    if (seated && this.showingBack) for (const k of ['legL', 'legR', 'legL2', 'legR2']) if (P[k]) P[k].visible = false;
    if (P.head) {
      if (pose === 'eat') P.head.y += Math.max(0, s) * 2;
      P.head.rotation = zombie ? 0.16 + Math.sin(this.phase * 0.7) * 0.08 : pose === 'eat' ? Math.max(0, s) * 0.1 : pose === 'run' ? -0.15 : pose === 'shiver' ? -0.1 : Math.sin(this.phase * 0.5) * 0.03;
    }
    if (pose === 'lie') {
      this.body.rotation = -1.45 * Math.sign(this.body.scaleX || 1);
      this.body.y = -6;
    } else {
      this.body.rotation = zombie && pose === 'walk' ? Math.sin(this.phase * 0.5) * 0.06 : pose === 'attack' ? 0.08 : 0;
      this.body.y = 0;
    }
    this.body.x = pose === 'shiver' ? (Math.random() - 0.5) * 3 : 0;
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
