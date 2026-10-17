/**
 * Floating labels ("+$12", "-4", "BACK UP!") shared by the joint and the raid.
 *
 * - Pooled: a fixed set of Text objects is reused, so a brawl never allocates a texture per label.
 * - Crisp: drawn at the camera's device-pixel scale, in the HUD's display face, at a fixed on-screen
 *   size (16 CSS px minimum) however far the camera is zoomed.
 * - Tidy: each anchor (a unit, a customer, a tile) gets its own stacking slots, so live labels stack
 *   upwards instead of printing over each other; chatter is throttled per anchor; damage on one
 *   anchor merges into a single ticking number.
 */
import Phaser from 'phaser';
import { FONT_DISPLAY } from '../fonts';

export interface FloatOpts {
  /** who/what the label belongs to: stacking slots, throttling and merging are per anchor */
  anchor?: string;
  /** on-screen size in CSS px (clamped to at least 16) */
  size?: number;
  /** a prop texture drawn just left of the text (e.g. fx_cash next to "+12") */
  icon?: string;
  /** skip the per-anchor throttle (money, level-ups: never drop those) */
  force?: boolean;
  /** merge into this anchor's live label of the same kind, adding `value` (damage numbers) */
  merge?: string;
  value?: number;
  /** how long it hangs before drifting off, ms */
  hold?: number;
}

interface Label {
  box: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Image;
  anchor: string;
  slot: number;
  kind: string;
  value: number;
  live: boolean;
  born: number;
  color: string;
}

/** Seconds between two labels on the same anchor (unless forced or merged). */
export const FLOAT_THROTTLE = 0.6;
const MIN_PX = 16;

export class FloatTexts {
  private pool: Label[] = [];
  private lastAt = new Map<string, number>();
  private seq = 0;

  constructor(
    private scene: Phaser.Scene,
    private max = 24,
  ) {}

  private get now() {
    return this.scene.time.now / 1000;
  }

  /** world units per CSS px at the current zoom */
  private unit() {
    const dpr = window.devicePixelRatio || 1;
    return dpr / Math.max(0.01, this.scene.cameras.main.zoom);
  }

  private grab(): Label {
    let l = this.pool.find((p) => !p.live);
    if (l) return l;
    if (this.pool.length < this.max) {
      const text = this.scene.add.text(0, 0, '', { fontFamily: FONT_DISPLAY, color: '#fff', stroke: '#16120C', strokeThickness: 2 }).setOrigin(0, 0.5);
      const icon = this.scene.add.image(0, 0, '__MISSING').setVisible(false);
      const box = this.scene.add.container(0, 0, [icon, text]).setDepth(1e6).setVisible(false);
      l = { box, text, icon, anchor: '', slot: 0, kind: '', value: 0, live: false, born: 0, color: '' };
      this.pool.push(l);
      return l;
    }
    // every label busy: recycle the oldest
    l = this.pool.reduce((a, b) => (a.born <= b.born ? a : b));
    this.scene.tweens.killTweensOf(l.box);
    return l;
  }

  /** Lay the icon and text out side by side, centred on the box. */
  private layout(l: Label, px: number) {
    const u = this.unit();
    const t = l.text;
    const fs = px * u;
    const res = Math.max(1, this.scene.cameras.main.zoom);
    if (Math.abs(t.style.resolution - res) > 0.05) t.setResolution(res);
    t.setFontSize(fs).setStroke('#16120C', Math.max(2, px * 0.16) * u);
    let iw = 0;
    if (l.icon.visible) {
      const h = fs * 1.35;
      l.icon.setScale(h / Math.max(1, l.icon.height));
      iw = l.icon.displayWidth;
    }
    const gap = iw ? fs * 0.12 : 0;
    const total = iw + gap + t.width;
    l.icon.setPosition(-total / 2 + iw / 2, 0);
    t.setPosition(-total / 2 + iw + gap, 0);
  }

  private life(l: Label, y: number, hold: number) {
    const u = this.unit();
    const box = l.box;
    this.scene.tweens.killTweensOf(box);
    box.setAlpha(1);
    this.scene.tweens.add({ targets: box, scale: { from: 0.55, to: 1 }, duration: 170, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: box,
      y: y - 26 * u,
      alpha: 0,
      delay: hold,
      duration: 650,
      ease: 'Quad.In',
      onComplete: () => {
        l.live = false;
        box.setVisible(false);
      },
    });
  }

  /** Show a label. Returns false when it was throttled away. */
  show(x: number, y: number, text: string, color: string, o: FloatOpts = {}): boolean {
    const now = this.now;
    const anchor = o.anchor ?? `@${Math.round(x / 24)},${Math.round(y / 24)}`;
    const px = Math.max(MIN_PX, o.size ?? MIN_PX);
    const hold = o.hold ?? 450;
    if (o.merge) {
      const m = this.pool.find((p) => p.live && p.anchor === anchor && p.kind === o.merge && now - p.born < 1.2);
      if (m) {
        m.value += o.value ?? 0;
        m.text.setText(text.replace('{n}', String(Math.round(m.value))));
        this.layout(m, px);
        m.born = now;
        this.life(m, m.box.y + 0, hold);
        return true;
      }
    }
    if (!o.force && !o.merge && now - (this.lastAt.get(anchor) ?? -9) < FLOAT_THROTTLE) return false;
    this.lastAt.set(anchor, now);
    if (this.lastAt.size > 400) this.lastAt.clear();
    const l = this.grab();
    // the lowest free stacking slot on this anchor
    const used = new Set(this.pool.filter((p) => p.live && p !== l && p.anchor === anchor).map((p) => p.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    l.anchor = anchor;
    l.slot = slot;
    l.kind = o.merge ?? '';
    l.value = o.value ?? 0;
    l.live = true;
    l.born = now + this.seq++ * 1e-6;
    l.color = color;
    l.text.setColor(color).setText(o.merge ? text.replace('{n}', String(Math.round(l.value))) : text);
    if (o.icon && this.scene.textures.exists(o.icon)) l.icon.setTexture(o.icon).setVisible(true);
    else l.icon.setVisible(false);
    this.layout(l, px);
    const u = this.unit();
    const ly = y - slot * (px + 4) * u;
    l.box.setPosition(x, ly).setVisible(true).setScale(1);
    this.life(l, ly, hold);
    return true;
  }
}
