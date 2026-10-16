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
  private front: View;
  private back: View | null;
  private headKey?: string;
  private faces: Partial<Record<FaceName, string>> = {};
  private face?: FaceName;
  private phase = Math.random() * 10;
  private showingBack = false;

  constructor(scene: Phaser.Scene, readonly art: CharArt) {
    this.rig = art.rig ?? 'biped';
    this.height = art.height;
    this.root = scene.add.container(0, 0);
    this.body = scene.add.container(0, 0);
    this.root.add(this.body);
    this.front = this.makeView(scene, art.parts);
    this.back = art.backParts?.length ? this.makeView(scene, art.backParts) : null;
    if (this.back) this.back.box.setVisible(false);
    this.headKey = art.parts.find((p) => p.key.endsWith('_head'))?.key;
    for (const [k, v] of Object.entries(art.faces ?? {})) if (v) this.faces[k as FaceName] = v.key;
  }

  private makeView(scene: Phaser.Scene, parts: CharArt['parts']): View {
    const box = scene.add.container(0, 0);
    this.body.add(box);
    const v: View = { box, parts: {}, base: {} };
    for (const p of parts) {
      const name = p.key.split('_').pop()!;
      const img = scene.add.image(p.x, p.y, p.key).setScale(1 / TEX_S).setOrigin(p.px / p.w, p.py / p.h);
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
   * Pose the parts for this frame.
   * @param attackT seconds since the last attack (for the strike swing)
   */
  pose(pose: Pose, dt: number, opts: { zombie?: boolean; speed?: number; attackT?: number } = {}) {
    const zombie = !!opts.zombie;
    const speed = opts.speed ?? 1;
    const rate = pose === 'walk' ? 9 * speed : pose === 'run' ? 15 * speed : pose === 'cook' ? 10 : pose === 'dance' ? 8 : pose === 'shiver' ? 30 : 2.4;
    this.phase += dt * rate;
    const view = this.showingBack && this.back ? this.back : this.front;
    if (this.rig === 'quad') return this.poseQuad(view, pose);
    const P = view.parts;
    const B = view.base;
    for (const k of Object.keys(P)) {
      P[k].x = B[k].x;
      P[k].y = B[k].y;
      P[k].rotation = 0;
    }
    const s = Math.sin(this.phase);
    const moving = pose === 'walk' || pose === 'run';
    const legSwing = pose === 'run' ? 0.8 : pose === 'walk' ? 0.55 : pose === 'dance' ? 0.35 : 0;
    if (P.legL) P.legL.rotation = s * legSwing;
    if (P.legR) P.legR.rotation = -s * legSwing * (zombie && pose === 'walk' ? 0.35 : 1); // zombies drag one foot
    const seated = pose === 'sit' || pose === 'eat';
    if (P.legL) P.legL.visible = !seated;
    if (P.legR) P.legR.visible = !seated;
    let armL = 0;
    let armR = 0;
    switch (pose) {
      case 'attack': {
        const a = Math.min(1, (opts.attackT ?? 1) / 0.32);
        armL = a < 1 ? -2.1 + easeOut(a) * 2.4 : -0.2 + Math.sin(this.phase) * 0.1;
        armR = zombie ? -1.1 : -0.4;
        if (P.legL) P.legL.rotation = 0.25;
        if (P.legR) P.legR.rotation = -0.2;
        break;
      }
      case 'cook':
        armL = -0.9 + Math.sin(this.phase) * 0.45;
        armR = -0.6 + Math.cos(this.phase * 1.3) * 0.3;
        break;
      case 'eat':
        armL = -1 + Math.max(0, s) * 0.6;
        break;
      case 'cheer':
        armL = -2.6 + Math.sin(this.phase * 3) * 0.3;
        armR = -2.6 - Math.sin(this.phase * 3) * 0.3;
        break;
      case 'dance':
        armL = -1.6 + Math.sin(this.phase) * 0.9;
        armR = -1.6 - Math.sin(this.phase) * 0.9;
        break;
      case 'run':
        armL = zombie ? -1.3 + s * 0.2 : -2.4 + s * 0.4; // humans flail their arms up and run
        armR = zombie ? -1.2 - s * 0.2 : -2.4 - s * 0.4;
        break;
      default:
        if (zombie && pose !== 'lie' && pose !== 'sit') {
          armL = -1.25 + s * 0.12;
          armR = -1.15 - s * 0.12;
        } else if (pose === 'walk') {
          armL = -s * 0.5;
          armR = s * 0.5;
        } else {
          armL = s * 0.05;
          armR = -s * 0.05;
        }
    }
    if (P.armL) P.armL.rotation = armL;
    if (P.armR) P.armR.rotation = armR;
    const bob = moving ? -Math.abs(Math.sin(this.phase)) * (pose === 'run' ? 3.2 : 2.2) : pose === 'dance' ? -Math.abs(s) * 4 : Math.sin(this.phase) * 0.6;
    for (const k of ['torso', 'armL', 'armR', 'head']) if (P[k]) P[k].y = B[k].y + bob;
    if (P.head) {
      if (pose === 'eat') P.head.y += Math.max(0, s) * 2.5;
      P.head.rotation = zombie ? 0.16 + Math.sin(this.phase * 0.7) * 0.08 : pose === 'eat' ? Math.max(0, s) * 0.12 : pose === 'run' ? -0.15 : Math.sin(this.phase * 0.5) * 0.03;
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
