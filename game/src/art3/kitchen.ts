/**
 * Kitchen v3: stoves (+ cooking overlays), counters, sinks, bins, fridges and the toxic keg.
 *
 * Every station is a 1x1 floor object (objAsset: OBJ_W wide, anchor = tile centre) drawn FACING 'sw'
 * (doors, knobs and the cook's side toward screen lower-left; the cook stands on the sw tile). The scene
 * mirrors a sprite with kit.mirrored() for 'se'.
 *
 * OVERLAYS (fx_steam_1..3, grill_flames, fryer_bubbles, pot_burnt) use anchor (0.5, 1): place them at
 * (tileCenterX, tileCenterY - KITCHEN_META.stoveTopZ[stoveKey]); everything they draw sits above that point.
 * Mirror them together with the stove (fryer_bubbles matches the fryer's wells).
 */
import type { ArtAsset } from '../art/types';
import type { Doc } from '../art/svg';
import { P, capsule, ell, f, hull, poly, rrect } from '../art/svg';
import { eyeball, finger } from './dishes';
import type { Pt } from '../art/svg';
import { F, INK, Iso, L, LW, PAL, asset, blob, crack, dot, objAsset, rnd, speckle } from './kit';
import {
  BONE, CAST, CAST_HI, bone, CHROME, CHROME_D, CHROME_HI, DEEP, ENAMEL, RUST, RUST_D, STEEL, TOXIC, TOXIC_D, box, cyl, disc, dk, faces, fly,
  handprint, hazard, hFor, lt, onFront, onSide, pp, ringI, roach, rust, rustDrip, scratches, seg, shadow, shadowDisc, smear,
  streaks, tbox, tone,
} from './p1kit';
import type { Box, Tone } from './p1kit';

// ================================================================ shared bits
const OFFW: [number, number, number, number] = [0, 0, 104, 200];

/** A flame tongue standing at (x, y) (its base), height h, half-width w. */
function tongue(x: number, y: number, h: number, w: number, lean = 0): string {
  return `M${f(x - w)},${f(y)}C${f(x - w * 1.1)},${f(y - h * 0.45)} ${f(x - w * 0.2 + lean * 0.5)},${f(y - h * 0.6)} ${f(x + lean)},${f(y - h)}C${f(x + w * 0.5 + lean * 0.4)},${f(y - h * 0.55)} ${f(x + w * 1.1)},${f(y - h * 0.4)} ${f(x + w)},${f(y)}Z`;
}
function flame(x: number, y: number, h: number, w: number, lean = 0, blue = false): string {
  const outer = blue ? '#4E7FA6' : '#C2552A';
  const mid = blue ? '#86B3CF' : '#DE8A32';
  const inner = blue ? '#D8E8EE' : '#EBC452';
  return F(tongue(x, y, h, w, lean), outer, 0.55) + F(tongue(x, y, h * 0.7, w * 0.62, lean * 0.7), mid) + F(tongue(x, y, h * 0.38, w * 0.32, lean * 0.4), inner);
}

/** Gas burner (cast grate) or electric coil lying on the cooktop at (i, j, z). */
function burner(t: Iso, i: number, j: number, z: number, r: number, kind: 'grate' | 'coil', dirty = 0): string {
  const pan = disc(t, i, j, z, r * 1.08);
  let s = F(pan.d, kind === 'coil' ? '#9EA19B' : '#3A3730', 0.6);
  if (kind === 'coil') {
    s += F(disc(t, i, j, z, r * 0.95).d, '#6E716B');
    for (const k of [0.92, 0.66, 0.4]) {
      const e = disc(t, i, j, z + 0.6, r * k);
      s += L(e.d, 2.1, INK) + L(e.d, 1.3, '#3A3833') + L(ell(e.cx - 0.2, e.cy - 0.35, e.rx, e.ry), 0.4, '#8E8A80', 'opacity="0.8"');
    }
    s += L(`M${pp(t.p(i + r * 0.92, j, z + 0.6))}L${pp(t.p(i + r * 1.2, j, z + 0.6))}`, 1.4, '#2E2C28');
  } else {
    const head = disc(t, i, j, z + 0.8, r * 0.34);
    s += L(ell(pan.cx, pan.cy, pan.rx * 0.8, pan.ry * 0.8), 0.5, '#5A564C');
    s += F(head.d, CAST, 0.6) + L(ell(head.cx, head.cy - 0.3, head.rx * 0.6, head.ry * 0.6), 0.4, CAST_HI);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const p1 = t.p(i + Math.cos(a) * r * 0.36, j + Math.sin(a) * r * 0.36, z + 2);
      const p2 = t.p(i + Math.cos(a) * r * 1.02, j + Math.sin(a) * r * 1.02, z + 2);
      s += L(`M${pp(p1)}L${pp(p2)}`, 2, INK) + L(`M${pp(p1)}L${pp(p2)}`, 1.1, '#3C3934') + L(`M${f(p1[0])},${f(p1[1] - 0.4)}L${f(p2[0])},${f(p2[1] - 0.4)}`, 0.35, '#7A766A');
    }
    s += L(ell(pan.cx, pan.cy - 1.6, pan.rx * 0.98, pan.ry * 0.98), 1.9, INK) + L(ell(pan.cx, pan.cy - 1.6, pan.rx * 0.98, pan.ry * 0.98), 1, '#3C3934');
  }
  if (dirty > 0) s += F(blob(pan.cx + 2, pan.cy + 1, pan.rx * 1.05, pan.ry * 1.1, 5 + Math.round(i * 10)), PAL.grimeD, 0, `opacity="${f(0.25 * dirty)}"`);
  return s;
}

/** Knob on a vertical front-facing panel (screen space). */
function knob(x: number, y: number, col: string, r = 2.3, rot = 0): string {
  return (
    F(ell(x + 0.5, y + 0.6, r, r * 1.05), DEEP, 0, 'opacity="0.5"') +
    F(ell(x, y, r, r * 1.05), col, 0.6) +
    F(ell(x - 0.5, y - 0.5, r * 0.45, r * 0.4), '#FFFFFF', 0, 'opacity="0.35"') +
    L(`M${f(x)},${f(y)}l${f(Math.cos(rot) * r * 0.9)},${f(Math.sin(rot) * r * 0.9)}`, 0.6, INK)
  );
}

/** A cooking pot standing on (i, j, z). */
function pot(d: Doc, t: Iso, i: number, j: number, z: number, r: number, h: number, col: Tone, opts: { dent?: boolean; goo?: string; burnt?: boolean } = {}): string {
  const c = cyl(d, t, i, j, r, z, z + h, col, 1);
  let s = '';
  // handles
  const lh = t.p(i - r * 1.15, j + r * 0.2, z + h - 2.5);
  const rh = t.p(i + r * 0.2, j - r * 1.15, z + h - 2.5);
  s += F(rrect(lh[0] - 3.2, lh[1] - 1, 4, 2, 1), col.side, 0.6) + F(rrect(rh[0] - 0.8, rh[1] - 1, 4, 2, 1), col.side, 0.6);
  s += c.svg;
  const top = c.top;
  s += F(ell(top.cx, top.cy + 0.3, top.rx * 0.86, top.ry * 0.8), opts.goo ?? '#2A241A', 0.5);
  if (opts.goo) {
    s += F(blob(top.cx - 1, top.cy, top.rx * 0.4, top.ry * 0.3, 3), lt(opts.goo, 0.25), 0, 'opacity="0.8"');
    s += dot(top.cx + 2, top.cy - 0.6, 0.8, lt(opts.goo, 0.4)) + dot(top.cx - 3, top.cy + 0.8, 0.6, lt(opts.goo, 0.4));
    // a dribble over the rim
    s += F(`M${f(top.cx - 2)},${f(top.cy + top.ry - 0.5)}q0.2,4 1,6q0.8,1.4 1.4,-0.4q0.2,-3 0.6,-5.6z`, opts.goo, 0.4);
  }
  if (opts.dent) {
    const [x, y] = t.p(i + r * 0.35, j + r * 0.75, z + h * 0.45);
    s += F(blob(x, y, 3, 2.6, 17, 6, 0.4), DEEP, 0, 'opacity="0.35"') + L(`M${f(x - 2.6)},${f(y - 1.2)}Q${f(x)},${f(y + 2.6)} ${f(x + 2.8)},${f(y - 0.8)}`, 0.6, '#FFFFFF', 'opacity="0.6"');
  }
  if (opts.burnt) s += d.clip(c.body, F(`M0,${f(top.cy + 2)}H104V200H0Z`, '#141210', 0, 'opacity="0.55"'));
  return s;
}

// ================================================================ stoves
interface StoveOpt {
  body: Tone;
  cook: Tone;
  guard: Tone;
  door: string;
  knob: string;
  burner: 'grate' | 'coil';
  feet?: boolean;
  dirty?: boolean;
}
const ST: Box = [-0.44, 0.44, -0.4, 0.44, 3, 34];

/** Shared stove carcass: kick/feet, body, oven door, cooktop slab, back guard. Returns layers so stoves can decorate. */
function stoveCarcass(d: Doc, t: Iso, o: StoveOpt): { base: string; top: string; guard: string } {
  const [i0, i1, j0, j1, , z1] = ST;
  let base = shadow(d, t, -0.48, 0.48, -0.46, 0.5, 0.32);
  if (o.feet) for (const [i, j] of [[i0 + 0.05, j1 - 0.05], [i1 - 0.05, j1 - 0.05], [i1 - 0.05, j0 + 0.05]] as [number, number][]) base += box(d, t, [i - 0.025, i + 0.025, j - 0.025, j + 0.025, 0, 3.5], tone(CHROME_D), { sw: 0.7, grad: 0 });
  else base += box(d, t, [i0 + 0.03, i1 - 0.03, j0, j1 - 0.04, 0, 3], tone('#2C2924'), { sw: 0.9, grad: 0 });
  base += box(d, t, ST, o.body);
  // oven door in the front face frame (width 42.2, height 31)
  const W = (i1 - i0) * 48;
  let door = F(rrect(2.6, 5, W - 5.2, 19.5, 1.2), o.door, 0.8);
  door += F(rrect(8, 9, W - 16, 10, 1), d.linear(0, 9, 0, 19, [[0, '#15130F'], [1, '#3A342A']]), 0.7);
  door += L(`M10,${f(10.5)}L16,17.5M14,10.5L19,15`, 0.8, '#FFFFFF', 'opacity="0.18"');
  // handle bar on two stand-offs
  door += F(rrect(5.5, 1.4, 2, 3.4, 0.6), CHROME_D, 0.5) + F(rrect(W - 7.5, 1.4, 2, 3.4, 0.6), CHROME_D, 0.5);
  door += F(rrect(4.5, 2.2, W - 9, 2.2, 1.1), CHROME, 0.7) + L(`M6,2.8H${f(W - 6)}`, 0.5, CHROME_HI);
  // broiler drawer
  door += F(rrect(2.6, 25.6, W - 5.2, 4.2, 0.8), dk(o.door, 0.05), 0.7) + L(`M${f(W / 2 - 4)},27.5H${f(W / 2 + 4)}`, 1, CHROME_D);
  base += onFront(t, i0, j1, z1, door);
  // cooktop slab
  const top = box(d, t, [-0.45, 0.45, -0.42, 0.45, 34, 36.5], o.cook, { sw: 1, grad: 0 });
  // back guard with knobs + a little timer window
  const G: Box = [-0.45, 0.45, -0.45, -0.33, 36.5, 52];
  let guard = box(d, t, G, o.guard);
  const GW = 0.9 * 48;
  let gk = '';
  gk += knob(5.5, 7.5, o.knob, 2.3, -1) + knob(12.5, 7.5, o.knob, 2.3, 0.6);
  gk += knob(GW - 12.5, 7.5, o.knob, 2.3, 2) + knob(GW - 5.5, 7.5, o.knob, 2.3, -2.2);
  gk += F(rrect(GW / 2 - 4.5, 3.6, 9, 6.6, 1), '#26231E', 0.6) + L(`M${f(GW / 2 - 2.5)},7.6l2,-2l2,2`, 0.6, '#D9A441') + dot(GW / 2, 6.9, 0.5, '#D9A441');
  guard += onFront(t, -0.45, -0.33, 52, gk);
  return { base, top, guard };
}

function stove(key: string, o: StoveOpt, deco: (d: Doc, t: Iso, layers: { base: string; top: string; guard: string }) => string, h = hFor(56)): ArtAsset {
  return objAsset(key, h, (d, t) => deco(d, t, stoveCarcass(d, t, o)));
}

function stoveDirty(): ArtAsset {
  const body = tone(ENAMEL, 0.1, 0.32, 0.04);
  return stove('stove_dirty', { body, cook: tone('#CFC9B6', 0.05, 0.35), guard: body, door: dk(ENAMEL, 0.05), knob: '#2E2B26', burner: 'grate', dirty: true }, (d, t, ly) => {
    const [i0, i1, , j1, , z1] = ST;
    const fc = faces(t, [i0, i1, ST[2], j1], [i0, i1, ST[2], j1], ST[4], z1);
    let s = ly.base;
    // grime band, rust and enamel chips on the body
    let g = '';
    const fl = t.p(i0, j1, 3);
    const fr = t.p(i1, j1, 3);
    const sr = t.p(i1, ST[2], 3);
    g += smear(fl[0] + 6, fl[1] - 3, 9, 4, 11, PAL.grimeD, 0.45) + smear(fr[0] - 4, fr[1] - 4, 10, 5, 12, PAL.grimeD, 0.4) + smear(sr[0] - 10, sr[1] - 5, 12, 5, 13, PAL.grimeD, 0.45);
    g += rust(fl[0] + 3, fl[1] - 4, 3.2, 21) + rust(fr[0] + 4, fr[1] - 8, 2.8, 22) + rust(sr[0] - 3, sr[1] - 5, 3.5, 23);
    const tl = t.p(i1, j1, z1);
    g += rustDrip(tl[0] + 5, tl[1] - 1, 12) + rustDrip(tl[0] + 14, tl[1] - 6, 8, 0.9) + rustDrip(tl[0] - 18, tl[1] + -10, 9, 0.9);
    const r = rnd(5);
    for (let k = 0; k < 9; k++) {
      const x = fl[0] + 4 + r() * 70;
      const y = fl[1] - 40 + r() * 30;
      g += F(blob(x, y, 0.8 + r(), 0.6 + r() * 0.6, 60 + k, 6, 0.6), '#2E3236', 0, 'opacity="0.8"');
    }
    g += scratches(fl[0], fl[1] - 34, 80, 26, 14, 9, '#5E5232', 0.5, 5);
    s += d.clip(fc.front, g) + d.clip(fc.side, g);
    // something charred in the oven window
    s += onFront(t, i0, j1, z1, F(blob(20, 16.5, 6, 2, 7), '#4A2A18', 0.4) + L('M17,15.5L26,14.2', 1.4, BONE) + dot(16.6, 15.6, 1.1, BONE) + dot(26.4, 14, 1.1, BONE));
    // a roach on the side panel
    const rp = t.p(i1, 0.05, 15);
    s += roach(rp[0], rp[1], -60, 0.9);
    s += ly.top;
    // cooktop crud + burnt rings
    const top = t.qd(-0.45, 0.45, -0.42, 0.45, 36.5);
    let c = '';
    c += smear(...t.p(-0.05, 0.36, 36.5), 12, 3, 31, '#4A3A22', 0.5) + smear(...t.p(0.3, -0.1, 36.5), 6, 3, 32, '#6A4A22', 0.45);
    c += F(blob(...t.p(-0.3, 0.38, 36.5), 4, 1.6, 33), '#7A5A2A', 0.4);
    s += d.clip(top, c);
    s += ly.guard;
    // missing knob: replace the third one with a bare stem
    s += onFront(t, -0.45, -0.33, 52, F(ell(0.9 * 48 - 12.5, 7.5, 2.5, 2.6), ENAMEL) + F(rrect(0.9 * 48 - 13.2, 6.6, 1.4, 1.8, 0.3), CHROME_D, 0.4));
    s += d.clip(faces(t, [-0.45, 0.45, -0.45, -0.33], [-0.45, 0.45, -0.45, -0.33], 36.5, 52).front, smear(...t.p(0.1, -0.33, 41), 14, 3.5, 34, PAL.grimeD, 0.4) + rust(...t.p(0.4, -0.33, 50), 2, 35));
    // burners: back-right, front-left, front-right(flickering) and back-left (under the pot)
    s += burner(t, -0.2, -0.14, 36.5, 0.15, 'grate', 1) + burner(t, 0.2, -0.14, 36.5, 0.15, 'grate', 1);
    s += burner(t, -0.2, 0.24, 36.5, 0.15, 'grate', 1) + burner(t, 0.2, 0.24, 36.5, 0.15, 'grate', 1);
    // flickering burner: a few weak blue flames, one licking orange
    const fp = disc(t, 0.2, 0.24, 37.3, 0.06);
    s += flame(fp.cx - 2.2, fp.cy + 0.6, 3.2, 0.9, -0.4, true) + flame(fp.cx + 1.6, fp.cy + 0.8, 2.4, 0.8, 0.3, true) + flame(fp.cx + 0.2, fp.cy - 0.8, 4.4, 1.1, 0.6);
    // the dented pot with green-brown sludge
    s += pot(d, t, -0.2, -0.14, 38.5, 0.16, 12, tone('#9A9C96', 0.15, 0.32), { dent: true, goo: '#6E7A2E' });
    s += fly(...(t.p(-0.2, -0.14, 60) as [number, number]), 0.9);
    return s;
  });
}

function stovePlain(): ArtAsset {
  const cream = '#E2DAB9';
  const body = tone(cream, 0.08, 0.3, 0.04);
  return stove('stove_plain', { body, cook: tone('#3A3833', 0.1, 0.3), guard: body, door: dk(cream, 0.05), knob: '#E9E4D2', burner: 'coil' }, (d, t, ly) => {
    const [i0, i1, j0, j1, z0, z1] = ST;
    const fc = faces(t, [i0, i1, j0, j1], [i0, i1, j0, j1], z0, z1);
    let s = ly.base;
    const fl = t.p(i0, j1, 3);
    s += d.clip(fc.front, smear(fl[0] + 22, fl[1] + 4, 20, 4, 3, PAL.grime, 0.3) + scratches(fl[0], fl[1] - 30, 46, 24, 6, 3, '#8A7A50', 0.4));
    s += d.clip(fc.side, smear(...t.p(i1, 0, 5), 16, 4, 5, PAL.grime, 0.3));
    // chrome trim strip under the cooktop
    s += L(seg(t, [i0, j1, z1 - 1.2], [i1, j1, z1 - 1.2]) + seg(t, [i1, j1, z1 - 1.2], [i1, j0, z1 - 1.2]), 1.1, CHROME);
    s += ly.top + ly.guard;
    for (const [i, j] of [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.24], [0.2, 0.24]] as [number, number][]) s += burner(t, i, j, 36.5, 0.15, 'coil');
    // a kettle on the back-right coil
    s += pot(d, t, 0.2, -0.14, 37.2, 0.12, 8, tone('#7A2A26', 0.15, 0.35));
    const kp = t.p(0.2, -0.14, 45.2);
    s += F(rrect(kp[0] - 4, kp[1] - 4.5, 8, 2.4, 1.2), '#2E2B26', 0.6);
    return s;
  });
}

function stoveSteel(): ArtAsset {
  return stove('stove_steel', { body: STEEL, cook: tone('#55575A', 0.1, 0.35), guard: STEEL, door: '#9C9F99', knob: '#2E2B26', burner: 'grate', feet: true }, (d, t, ly) => {
    const [i0, i1, j0, j1, z0, z1] = ST;
    const fc = faces(t, [i0, i1, j0, j1], [i0, i1, j0, j1], z0, z1);
    let s = ly.base;
    const fl = t.p(i0, j1, z1);
    s += streaks(d, fc.front, fl[0], fl[1] - 2, 46, 60, 26, 4, 0, 0.4) + streaks(d, fc.side, fl[0] + 40, fl[1] - 30, 46, 60, 22, 5, 0, 0.35);
    s += d.clip(fc.front, smear(...t.p(0.1, j1, 6), 14, 3, 9, '#5A4A2A', 0.3));
    s += ly.top + ly.guard;
    // salamander shelf up top with a towel
    s += box(d, t, [-0.45, 0.45, -0.46, -0.24, 58, 60.5], STEEL, { sw: 0.9, grad: 0 });
    for (const i of [-0.4, 0.4]) s += box(d, t, [i - 0.02, i + 0.02, -0.44, -0.4, 52, 58], tone(CHROME_D), { sw: 0.6, grad: 0 });
    const tw = t.p(0.15, -0.24, 60);
    s += F(`M${f(tw[0] - 6)},${f(tw[1] - 4)}L${f(tw[0] + 6)},${f(tw[1] - 1)}L${f(tw[0] + 5)},${f(tw[1] + 8)}L${f(tw[0] - 5)},${f(tw[1] + 6)}Z`, '#D8D2BE', 0.6) + L(`M${f(tw[0] - 5)},${f(tw[1] + 3)}L${f(tw[0] + 5)},${f(tw[1] + 5)}`, 0.8, '#7A2A22', 'opacity="0.7"');
    for (const [i, j] of [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.24], [0.2, 0.24]] as [number, number][]) s += burner(t, i, j, 36.5, 0.155, 'grate');
    s += pot(d, t, -0.2, 0.24, 38.5, 0.14, 7, STEEL);
    return s;
  });
}

function stoveSuper(): ArtAsset {
  const red = '#6A1F22';
  const body = tone(red, 0.12, 0.38, 0.02);
  return stove('stove_super', { body, cook: tone('#2E2C2A', 0.1, 0.3), guard: tone('#3A3634', 0.1, 0.35), door: dk(red, 0.08), knob: CHROME, burner: 'grate' }, (d, t, ly) => {
    const [i0, i1, j0, j1, z0, z1] = ST;
    const fc = faces(t, [i0, i1, j0, j1], [i0, i1, j0, j1], z0, z1);
    let s = '';
    // side exhaust pipes (behind the body first so the near halves read)
    s += ly.base;
    // flame decal sweeping across the door + side
    let fl = '';
    for (let k = 0; k < 5; k++) {
      const y = 10 + k * 3.2;
      fl += F(`M-2,${f(y)}C8,${f(y - 3)} 14,${f(y + 2)} ${f(22 + k * 3)},${f(y - 4 - k)}C${f(16 + k * 2)},${f(y + 1)} 10,${f(y + 3)} -2,${f(y + 3)}Z`, k % 2 ? '#D9A441' : '#C8652A', 0.5);
    }
    s += d.clip(fc.front, onFront(t, i0, j1, z1, fl));
    s += onFront(t, i0, j1, z1, F(rrect(8, 9, 26.2, 10, 1), d.linear(0, 9, 0, 19, [[0, '#15130F'], [1, '#3A2A22']]), 0.7) + L('M10,10.5L16,17.5', 0.8, '#FFFFFF', 'opacity="0.2"'));
    s += d.clip(fc.side, streaks(d, fc.side, ...t.p(i1, j1, z1), 40, 34, 10, 7, 0, 0.25));
    // chrome bumper strip
    s += L(seg(t, [i0, j1, 5], [i1, j1, 5]) + seg(t, [i1, j1, 5], [i1, j0, 5]), 2.4, INK) + L(seg(t, [i0, j1, 5], [i1, j1, 5]) + seg(t, [i1, j1, 5], [i1, j0, 5]), 1.5, CHROME) + L(seg(t, [i0, j1, 5.4], [i1, j1, 5.4]), 0.5, CHROME_HI);
    // side pipes along the right flank with flared tips at the front
    for (const [z, k] of [[11, 0], [17, 1]] as [number, number][]) {
      const a = t.p(0.49, j0 + 0.04, z);
      const b = t.p(0.49, j1 - 0.02, z);
      s += L(`M${pp(a)}L${pp(b)}`, 3.6, INK) + L(`M${pp(a)}L${pp(b)}`, 2.4, CHROME) + L(`M${f(a[0])},${f(a[1] - 0.6)}L${f(b[0])},${f(b[1] - 0.6)}`, 0.6, CHROME_HI);
      s += F(ell(b[0] - 0.3, b[1], 1.6, 2.2), '#1E1C1A', 0.6) + dot(b[0] - 0.4, b[1] - 0.3, 0.6, '#5A3A22');
      void k;
    }
    s += ly.top;
    s += ly.guard;
    // supercharger scoop on the guard + twin chrome stacks
    s += box(d, t, [-0.14, 0.14, -0.44, -0.3, 52, 57], tone(CHROME_D, 0.25, 0.3), { sw: 0.9, grad: 0 });
    s += box(d, t, [-0.11, 0.11, -0.43, -0.32, 57, 63], tone('#8E8A84', 0.2, 0.3), { sw: 0.9 });
    for (let k = 0; k < 4; k++) s += L(seg(t, [-0.09 + k * 0.06, -0.32, 58], [-0.09 + k * 0.06, -0.32, 62]), 0.6, INK);
    s += F(t.qd(-0.08, 0.08, -0.41, -0.34, 63), '#1A1814', 0.6);
    for (const i of [-0.36, 0.36]) {
      const c = cyl(d, t, i, -0.39, 0.04, 52, 74, tone(CHROME, 0.2, 0.4), 0.9);
      s += c.svg + F(ell(c.top.cx, c.top.cy - 0.5, c.top.rx * 1.5, c.top.ry * 1.5), CHROME, 0.8) + F(ell(c.top.cx, c.top.cy - 0.5, c.top.rx * 1.05, c.top.ry), '#1A1814');
      s += F(blob(c.top.cx, c.top.cy - 4, 3, 2.4, 70 + Math.round(i * 10)), '#3A3634', 0, 'opacity="0.35"');
    }
    for (const [i, j] of [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.24], [0.2, 0.24]] as [number, number][]) s += burner(t, i, j, 36.5, 0.15, 'grate');
    // little flame decal on the guard side
    return s;
  }, hFor(78));
}

// ---------------------------------------------------------------- grill (kettle on a cart)
function grill(): ArtAsset {
  return objAsset('grill', hFor(44), (d, t) => {
    let s = shadowDisc(d, t, 0, 0.02, 0.44, 0.3);
    const leg = tone('#3A3833', 0.1, 0.3);
    // cart legs + bottom shelf with a charcoal sack
    for (const [i, j] of [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28]] as [number, number][]) s += box(d, t, [i - 0.025, i + 0.025, j - 0.025, j + 0.025, 0, 24], leg, { sw: 0.8, grad: 0.1, hi: false });
    s += box(d, t, [-0.32, 0.32, -0.3, 0.3, 6, 7.4], tone('#4A4842', 0.1, 0.3), { sw: 0.8, grad: 0 });
    let mesh = '';
    for (let k = 1; k < 6; k++) mesh += L(seg(t, [-0.32 + k * 0.107, -0.3, 7.4], [-0.32 + k * 0.107, 0.3, 7.4]), 0.4, '#25231F');
    s += mesh;
    s += tbox(d, t, [-0.2, 0.08, -0.12, 0.18], [-0.18, 0.06, -0.1, 0.16], 7.4, 19, tone('#A6976A', 0.1, 0.3), { sw: 0.8 });
    s += F(t.qd(-0.18, 0.06, -0.1, 0.16, 19), '#2A2622', 0.5);
    s += onFront(t, -0.2, 0.18, 17, L('M3,4l8,1M2,7l10,0.5', 0.6, '#5A4E30') + F(blob(8, 9, 4, 2, 4), '#2A2622', 0, 'opacity="0.4"'));
    // ash catcher pan
    s += F(disc(t, 0, 0, 17, 0.14).d, '#5E5C56', 0.7);
    s += box(d, t, [0.3 - 0.025, 0.3 + 0.025, 0.28 - 0.025, 0.28 + 0.025, 0, 24], leg, { sw: 0.8, grad: 0.1, hi: false });
    // wheels on the left pair
    for (const j of [-0.28, 0.28]) {
      const w = t.p(-0.33, j, 3.4);
      s += F(ell(w[0], w[1], 2.4, 3.4), '#26241F', 0.7) + dot(w[0], w[1], 0.8, CHROME_D);
    }
    // the kettle bowl
    const R = 0.36;
    const rim = disc(t, 0, 0, 36, R);
    const deep = 15;
    const bowl = `M${f(rim.cx - rim.rx)},${f(rim.cy)}A${f(rim.rx)},${f(rim.ry + deep)} 0 0 0 ${f(rim.cx + rim.rx)},${f(rim.cy)}A${f(rim.rx)},${f(rim.ry)} 0 0 0 ${f(rim.cx - rim.rx)},${f(rim.cy)}Z`;
    s += F(bowl, d.linear(rim.cx - rim.rx, 0, rim.cx + rim.rx, 0, [[0, '#4A4740'], [0.3, '#5E5A52'], [0.65, '#2E2C28'], [1, '#1E1C19']]), LW);
    s += d.clip(bowl, F(`M${f(rim.cx - 20)},${f(rim.cy + 2)}Q${f(rim.cx - 16)},${f(rim.cy + 14)} ${f(rim.cx - 6)},${f(rim.cy + 19)}`, 'none', 0) + L(`M${f(rim.cx - 19)},${f(rim.cy + 3)}Q${f(rim.cx - 15)},${f(rim.cy + 13)} ${f(rim.cx - 5)},${f(rim.cy + 18)}`, 1.6, '#8A867A', 'opacity="0.55"'));
    s += d.clip(bowl, F(blob(rim.cx + 10, rim.cy + rim.ry + deep - 3, 8, 3, 8), RUST, 0, 'opacity="0.55"') + F(blob(rim.cx - 2, rim.cy + 8, 14, 3, 9), '#8E8C84', 0, 'opacity="0.18"'));
    // vent + handles on the bowl
    s += F(ell(rim.cx + 4, rim.cy + rim.ry + deep - 5, 3, 1.2), '#1A1814', 0.5);
    s += F(rrect(rim.cx - rim.rx - 4, rim.cy + 3, 5, 2.6, 1.2), '#5E3E22', 0.6) + F(rrect(rim.cx + rim.rx - 1, rim.cy + 3, 5, 2.6, 1.2), '#4A3018', 0.6);
    // inside: coals, then the grate
    s += F(rim.d, '#1E1A16', LW);
    const inner = ell(rim.cx, rim.cy + 0.8, rim.rx * 0.92, rim.ry * 0.86);
    const r = rnd(3);
    let coals = '';
    for (let k = 0; k < 16; k++) coals += F(blob(rim.cx + (r() - 0.5) * rim.rx * 1.6, rim.cy + (r() - 0.5) * rim.ry * 1.4 + 1, 2.6, 1.6, 80 + k), k % 3 ? '#3A322A' : '#B2502A', 0.3);
    coals += F(ell(rim.cx, rim.cy + 1, rim.rx * 0.6, rim.ry * 0.5), '#D07A34', 0, `opacity="0.25" filter="${d.blur(2)}"`);
    s += d.clip(inner, coals);
    let grate = '';
    for (let k = -4; k <= 4; k++) {
      const jj = k * 0.075;
      grate += L(seg(t, [-0.4, jj, 35], [0.4, jj, 35]), 1.1, '#1A1814') + L(seg(t, [-0.4, jj, 35.5], [0.4, jj, 35.5]), 0.45, '#9A968A');
    }
    s += d.clip(inner, grate);
    s += L(ell(rim.cx, rim.cy, rim.rx, rim.ry), 1.6, INK) + L(ell(rim.cx, rim.cy - 0.4, rim.rx - 0.8, rim.ry - 0.6), 0.6, '#77736A');
    // lid hanging on the right side
    const lp: Pt = [rim.cx + rim.rx + 4.5, rim.cy + 12];
    s += F(ell(lp[0], lp[1], 5.2, 13.5), d.linear(lp[0] - 5, 0, lp[0] + 5, 0, [[0, '#4A4740'], [1, '#1E1C19']]), LW) + F(ell(lp[0] - 1.6, lp[1], 2.2, 11), '#2E2C28', 0.5);
    s += F(rrect(lp[0] + 3, lp[1] - 3, 2.6, 6, 1.2), '#5E3E22', 0.6);
    s += F(blob(lp[0], lp[1] + 5, 2.4, 3, 12), RUST, 0, 'opacity="0.6"');
    return s;
  });
}

// ---------------------------------------------------------------- smoker (offset barrel)
function smoker(): ArtAsset {
  return objAsset('smoker', hFor(90), (d, t) => {
    let s = shadow(d, t, -0.48, 0.48, -0.3, 0.3, 0.3);
    const steel = tone('#3E3B35', 0.12, 0.3);
    const legs: [number, number][] = [[-0.38, -0.16], [0.12, -0.16], [-0.38, 0.16], [0.12, 0.16]];
    for (const [i, j] of legs.slice(0, 2)) s += box(d, t, [i - 0.025, i + 0.025, j - 0.025, j + 0.025, 0, 30], steel, { sw: 0.8, hi: false });
    // lower shelf with split firewood
    s += box(d, t, [-0.4, 0.14, -0.18, 0.18, 7, 8.4], tone('#4A4842', 0.1, 0.3), { sw: 0.8, grad: 0 });
    const r = rnd(9);
    for (let k = 0; k < 5; k++) {
      const jj = -0.12 + (k % 3) * 0.1;
      const zz = 9.5 + Math.floor(k / 3) * 3.4;
      const a = t.p(-0.34, jj, zz);
      const b = t.p(0.06, jj, zz);
      s += L(`M${pp(a)}L${pp(b)}`, 4.4, INK) + L(`M${pp(a)}L${pp(b)}`, 3.2, k % 2 ? '#7A5A36' : '#8E6A40') + L(`M${f(a[0] + 2)},${f(a[1] + 0.2)}L${f(b[0] - 3)},${f(b[1] - 0.5)}`, 0.4, '#4E321A');
      s += F(ell(b[0] + 0.3, b[1], 1.9, 2), '#C9A877', 0.5) + dot(b[0] + 0.3, b[1], 0.5, '#8E6A40');
      void r;
    }
    for (const [i, j] of legs.slice(2)) s += box(d, t, [i - 0.025, i + 0.025, j - 0.025, j + 0.025, 0, 30], steel, { sw: 0.8, hi: false });
    // chimney (behind the barrel body)
    const ch = cyl(d, t, -0.34, -0.06, 0.055, 48, 86, tone('#3A3731', 0.12, 0.35), 1);
    s += ch.svg + F(ell(ch.top.cx, ch.top.cy - 1, ch.top.rx * 1.7, ch.top.ry * 1.3), '#2E2B26', 0.8) + F(ell(ch.top.cx, ch.top.cy - 2.4, ch.top.rx * 1.3, ch.top.ry * 0.9), '#45423B', 0.6);
    s += d.clip(ch.body, F(`M0,0H104V${f(ch.top.cy + 10)}H0Z`, '#141210', 0, 'opacity="0.45"') + F(blob(ch.top.cx + 1, ch.top.cy + 20, 2, 5, 3), RUST, 0, 'opacity="0.6"'));
    // barrel chamber lying along i
    const ia = -0.46;
    const ib = 0.18;
    const cj = 0;
    const cz = 43;
    const rj = 0.25;
    const rz = 13.5;
    const ringA = ringI(t, ia, cj, cz, rj, rz);
    const ringB = ringI(t, ib, cj, cz, rj, rz);
    const bodyD = poly(hull([...ringA, ...ringB]));
    const top = t.p(0, 0, cz + rz);
    const bot = t.p(0, 0, cz - rz);
    s += F(bodyD, d.linear(0, top[1] - 12, 0, bot[1] + 12, [[0, '#6A665C'], [0.35, '#4A463E'], [1, '#22201C']]));
    let tex = '';
    tex += F(blob(...t.p(-0.3, 0.24, cz - 5), 7, 4, 4), RUST, 0, 'opacity="0.55"') + F(blob(...t.p(0.05, 0.22, cz - 10), 5, 3, 5), RUST_D, 0, 'opacity="0.5"');
    tex += F(blob(...t.p(-0.15, 0.1, cz + 10), 14, 4, 6), '#5A6A7A', 0, 'opacity="0.18"'); // heat tint
    tex += streaks(d, bodyD, top[0] - 34, top[1] - 4, 64, 40, 18, 11, 0.15, 0.25);
    s += d.clip(bodyD, tex);
    s += F(bodyD, 'none', LW);
    // lid between angles a0 (front, low) and a1 (near the top)
    const a0 = -0.2;
    const a1 = 1.35;
    const lid: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const a = a0 + ((a1 - a0) * k) / 8;
      lid.push(t.p(ia + 0.05, cj + Math.cos(a) * rj, cz + Math.sin(a) * rz));
    }
    for (let k = 8; k >= 0; k--) {
      const a = a0 + ((a1 - a0) * k) / 8;
      lid.push(t.p(ib - 0.03, cj + Math.cos(a) * rj, cz + Math.sin(a) * rz));
    }
    s += F(poly(lid), '#4E4A42', 0.8, 'fill-opacity="0.55"');
    s += L(`M${pp(lid[0])}L${pp(lid[lid.length - 1])}`, 0.5, '#8A867A', 'opacity="0.6"');
    // grease weeping from the lid seam
    const sp = t.p(-0.2, cj + Math.cos(a0) * rj, cz + Math.sin(a0) * rz);
    s += F(`M${f(sp[0] - 1)},${f(sp[1])}q0,5 1,7q1,1 1.4,-0.6q0,-4 0.4,-6.4z`, '#2A1E10', 0.4) + F(`M${f(sp[0] + 9)},${f(sp[1] + 4)}q0,4 1,5q1,1 1.2,-0.6q0,-3 0.4,-4.4z`, '#2A1E10', 0.4);
    // wooden handle on stand-offs
    const ha = 0.45;
    const h1 = t.p(-0.36, cj + Math.cos(ha) * (rj + 0.07), cz + Math.sin(ha) * (rz + 3.5));
    const h2 = t.p(0.08, cj + Math.cos(ha) * (rj + 0.07), cz + Math.sin(ha) * (rz + 3.5));
    const b1 = t.p(-0.33, cj + Math.cos(ha) * rj, cz + Math.sin(ha) * rz);
    const b2 = t.p(0.05, cj + Math.cos(ha) * rj, cz + Math.sin(ha) * rz);
    s += L(`M${pp(b1)}L${f(h1[0] + 1.5)},${f(h1[1])}M${pp(b2)}L${f(h2[0] - 1.5)},${f(h2[1])}`, 1, CHROME_D);
    s += L(`M${pp(h1)}L${pp(h2)}`, 3.6, INK) + L(`M${pp(h1)}L${pp(h2)}`, 2.5, '#8E6A40') + L(`M${f(h1[0])},${f(h1[1] - 0.5)}L${f(h2[0])},${f(h2[1] - 0.5)}`, 0.5, '#C9A877');
    // thermometer
    const th = t.p(-0.12, cj + Math.cos(0.9) * rj, cz + Math.sin(0.9) * rz);
    s += F(ell(th[0], th[1], 2.6, 2.6), '#D8D2BE', 0.7) + L(`M${f(th[0])},${f(th[1])}l1.6,-1.2`, 0.6, '#7A2A22') + L(ell(th[0], th[1], 2, 2), 0.3, '#5A564C');
    // visible end cap
    s += F(poly(ringB), '#38352F', 0.9);
    // firebox on the near end
    s += box(d, t, [0.17, 0.46, -0.19, 0.19, 22, 47], tone('#3A3731', 0.1, 0.3));
    const fb = faces(t, [0.17, 0.46, -0.19, 0.19], [0.17, 0.46, -0.19, 0.19], 22, 47);
    s += d.clip(fb.front, F(blob(...t.p(0.3, 0.19, 30), 8, 5, 7), RUST, 0, 'opacity="0.55"') + F(blob(...t.p(0.25, 0.19, 44), 10, 3, 8), '#141210', 0, 'opacity="0.5"'));
    s += d.clip(fb.side, F(blob(...t.p(0.46, 0, 26), 8, 4, 9), RUST_D, 0, 'opacity="0.5"'));
    let door = F(rrect(2, 3.5, 10, 17, 0.8), '#2E2B26', 0.7);
    door += F(ell(7, 9, 3, 3), '#45423B', 0.5);
    for (let k = 0; k < 4; k++) door += L(`M${f(7)},${f(9)}l${f(Math.cos(k * 0.8) * 2.6)},${f(Math.sin(k * 0.8) * 2.6)}`, 0.5, INK);
    door += L('M5,16.5c-1,-1 1,-2 0,-3s1,-2 0,-3', 0.7, CHROME) + L('M12,12H15', 1.4, CHROME_D);
    s += onFront(t, 0.17, 0.19, 47, door);
    for (const [i, j] of [[0.42, -0.15], [0.42, 0.15]] as [number, number][]) s += box(d, t, [i - 0.025, i + 0.025, j - 0.025, j + 0.025, 0, 22], steel, { sw: 0.8, hi: false });
    return s;
  });
}

// ---------------------------------------------------------------- fryer
/** Fryer wells (i0, i1) pairs and depth range; shared with fryer_bubbles. */
const WELLS: [number, number][] = [
  [-0.37, -0.04],
  [0.04, 0.37],
];
const WJ: [number, number] = [-0.33, 0.03];
const FRY_TOP = 36;
const OIL_Z = 33;

function fryer(): ArtAsset {
  return objAsset('fryer', hFor(56), (d, t) => {
    let s = shadow(d, t, -0.48, 0.48, -0.46, 0.5, 0.3);
    // oil puddle on the floor in front
    s += F(blob(...t.p(0.1, 0.46, 0), 16, 4, 3), '#8E6A1E', 0, 'opacity="0.45"') + F(blob(...t.p(0.05, 0.46, 0), 8, 2, 4), '#C9A44A', 0, 'opacity="0.35"');
    for (const [i, j] of [[-0.38, 0.36], [0.38, 0.36], [0.38, -0.36]] as [number, number][]) s += box(d, t, [i - 0.025, i + 0.025, j - 0.025, j + 0.025, 0, 4], tone(CHROME_D), { sw: 0.7, grad: 0 });
    const B: Box = [-0.42, 0.42, -0.4, 0.4, 4, 34];
    s += box(d, t, B, STEEL);
    const fc = faces(t, [B[0], B[1], B[2], B[3]], [B[0], B[1], B[2], B[3]], B[4], B[5]);
    const fl = t.p(B[0], B[3], 34);
    s += streaks(d, fc.front, fl[0], fl[1], 42, 56, 22, 13, 0, 0.4) + streaks(d, fc.side, fl[0] + 40, fl[1] - 26, 42, 56, 20, 14, 0, 0.35);
    // door with louvres + a warning sticker
    let door = F(rrect(3, 4, 34.5, 22, 1), '#979A94', 0.8);
    for (let k = 0; k < 4; k++) door += F(rrect(9, 17 + k * 2.1, 22, 0.9, 0.4), '#2E2C28');
    door += F('M8,13L11.5,7L15,13Z', '#D9A441', 0.6) + L('M11.5,9V11.2', 0.7, INK) + dot(11.5, 12.1, 0.35, INK);
    door += F(rrect(18, 7.5, 14, 2, 1), CHROME, 0.6);
    s += onFront(t, B[0], B[3], 34, door);
    // grease drips over the front lip
    let dr = '';
    for (const [x, len] of [[6, 7], [17, 11], [29, 5], [36, 9]] as [number, number][]) dr += F(`M${f(x - 1.4)},0q0.2,${f(len)} 1.4,${f(len + 1)}q1.2,-1 1.4,${f(-len - 1)}z`, '#9A7424', 0.4, 'opacity="0.85"');
    s += d.clip(fc.front, onFront(t, B[0], B[3], 34, dr));
    // top slab
    const top = box(d, t, [-0.43, 0.43, -0.42, 0.42, 34, FRY_TOP], STEEL, { sw: 1, grad: 0 });
    s += top;
    // back flue / control panel
    s += box(d, t, [-0.43, 0.43, -0.45, -0.36, FRY_TOP, 54], STEEL);
    const gf = faces(t, [-0.43, 0.43, -0.45, -0.36], [-0.43, 0.43, -0.45, -0.36], FRY_TOP, 54);
    s += streaks(d, gf.front, ...t.p(-0.43, -0.36, 54), 42, 20, 10, 15, 0, 0.35);
    s += onFront(t, -0.43, -0.36, 54, knob(7, 8, '#2E2B26', 2.8, -0.8) + knob(34.5, 8, '#2E2B26', 2.8, 0.4) + dot(14, 7, 1.1, '#B83A22') + dot(13.7, 6.7, 0.4, '#F0A080') + F(rrect(18, 5, 8, 5, 0.8), '#26231E', 0.5) + L('M19.5,8.5h5', 0.6, '#D9A441'));
    s += F(blob(...t.p(0, -0.36, 51), 14, 3, 21), '#141210', 0, 'opacity="0.3"');
    // the two wells: inner walls, oil, baskets
    for (const [w0, w1] of WELLS) {
      const hole = t.qd(w0, w1, WJ[0], WJ[1], FRY_TOP);
      let inn = F(hole, '#5E605A');
      inn += F(poly([t.p(w0, WJ[0], FRY_TOP), t.p(w1, WJ[0], FRY_TOP), t.p(w1, WJ[0], OIL_Z - 3), t.p(w0, WJ[0], OIL_Z - 3)]), '#8A8D86');
      const oil = t.qd(w0, w1, WJ[0], WJ[1], OIL_Z);
      const o0 = t.p(w0, WJ[0], OIL_Z);
      const o1 = t.p(w1, WJ[1], OIL_Z);
      inn += F(oil, d.linear(o0[0], o0[1], o1[0], o1[1], [[0, '#6A4C14'], [0.5, '#9A7424'], [1, '#B08A34']]));
      inn += L(seg(t, [w0 + 0.05, WJ[0] + 0.1, OIL_Z], [w1 - 0.1, WJ[0] + 0.05, OIL_Z]), 0.8, '#E8C870', 'opacity="0.5"');
      // basket: wire rim + mesh sunk in the oil
      const bq = t.qd(w0 + 0.03, w1 - 0.03, WJ[0] + 0.03, WJ[1] - 0.02, OIL_Z + 1.2);
      let mesh = '';
      for (let k = 1; k < 5; k++) mesh += L(seg(t, [w0 + 0.03 + (k * (w1 - w0 - 0.06)) / 5, WJ[0] + 0.03, OIL_Z + 1], [w0 + 0.03 + (k * (w1 - w0 - 0.06)) / 5, WJ[1] - 0.02, OIL_Z + 1]), 0.35, '#3A3833', 'opacity="0.7"');
      inn += mesh + L(bq, 0.9, '#C9CCCB') + L(bq, 0.35, INK, 'opacity="0.6"');
      s += d.clip(hole, inn);
      s += F(hole, 'none', 0.8);
      // basket handle sticking out to the front and resting up on a hook
      const hm = (w0 + w1) / 2;
      const p1 = t.p(hm, WJ[1] - 0.02, OIL_Z + 1.2);
      const p2 = t.p(hm, 0.3, 40);
      const p3 = t.p(hm, 0.44, 41);
      s += L(`M${pp(p1)}L${pp(p2)}`, 1.9, INK) + L(`M${pp(p1)}L${pp(p2)}`, 1.1, CHROME);
      s += L(`M${pp(p2)}L${pp(p3)}`, 3.6, INK) + L(`M${pp(p2)}L${pp(p3)}`, 2.5, '#2A2724') + L(`M${f(p2[0])},${f(p2[1] - 0.6)}L${f(p3[0])},${f(p3[1] - 0.6)}`, 0.4, '#6A665C');
    }
    s += F(blob(...t.p(0.25, 0.25, FRY_TOP), 6, 2.4, 77), '#9A7424', 0, 'opacity="0.5"');
    return s;
  });
}

// ---------------------------------------------------------------- overlays
function steam(n: number): ArtAsset {
  const W = 44;
  const H = 62;
  return asset(`fx_steam_${n}`, W, H, 0.5, 1, () => {
    const r = rnd(n * 13);
    let s = '';
    const puffs = 5;
    for (let k = 0; k < puffs; k++) {
      const p = (k + (n - 1) / 3) / puffs; // 0..1 up the column, frames shift the puffs upward
      const y = H - 6 - p * (H - 18);
      const x = W / 2 + Math.sin(p * 5 + n) * 5 + (r() - 0.5) * 3;
      const rr = 3.5 + p * 6;
      const o = 0.75 - p * 0.5;
      s += P(blob(x, y, rr * 1.2, rr, n * 10 + k, 7, 0.4), '#ECEAE0', 0.5, '#8A877C', `opacity="${f(o)}"`);
      s += F(blob(x - rr * 0.3, y - rr * 0.25, rr * 0.5, rr * 0.35, n * 10 + k + 50), '#FFFFFF', 0, `opacity="${f(o * 0.7)}"`);
    }
    return s;
  });
}

function grillFlames(): ArtAsset {
  const W = 64;
  const H = 46;
  return asset('grill_flames', W, H, 0.5, 1, (d) => {
    const r = rnd(8);
    // warm glow hugging the grate, then ragged tongues back-to-front (back ones sit higher and smaller)
    let s = F(ell(W / 2, H - 6, 22, 7), '#E07A2E', 0, `opacity="0.45" filter="${d.blur(2.2)}"`);
    const tongues: [number, number, number, number, number][] = [];
    for (let k = 0; k < 13; k++) {
      const u = (k / 12) * 2 - 1; // -1..1 across the grate
      const row = k % 3; // 0 back, 2 front
      const span = Math.sqrt(1 - u * u * 0.85);
      const x = W / 2 + u * 20 + (r() - 0.5) * 3;
      const y = H - 2 - (2 - row) * 3.4 * span - (1 - span) * 3;
      const hgt = (9 + r() * 12 + (u > -0.3 && u < 0.4 ? 8 : 0)) * (0.75 + row * 0.15) * span;
      tongues.push([y, x, hgt, 2.4 + r() * 2, (r() - 0.5) * 7]);
    }
    tongues.sort((p, q) => p[0] - q[0]);
    for (const [y, x, hgt, w, lean] of tongues) s += flame(x, y, hgt, w, lean);
    for (let k = 0; k < 7; k++) s += dot(W / 2 + (r() - 0.5) * 40, 3 + r() * 14, 0.4 + r() * 0.5, k % 2 ? '#EBC452' : '#DE8A32', 0.85);
    return s;
  });
}

function fryerBubbles(): ArtAsset {
  const W = 84;
  const H = 30;
  return asset('fryer_bubbles', W, H, 0.5, 1, () => {
    // anchor = tile centre at the oil surface; same projection as the fryer
    const t = new Iso(W / 2, H);
    const r = rnd(21);
    let s = '';
    for (const [w0, w1] of WELLS) {
      for (let k = 0; k < 14; k++) {
        const i = w0 + 0.04 + r() * (w1 - w0 - 0.08);
        const j = WJ[0] + 0.04 + r() * (WJ[1] - WJ[0] - 0.08);
        if (i + j > -0.04) continue;
        const [x, y] = t.p(i, j, 0.6);
        const rr = 0.6 + r() * 1.3;
        s += P(ell(x, y, rr * 1.2, rr * 0.8), '#E8C870', 0.35, '#6A4C14') + dot(x - rr * 0.4, y - rr * 0.3, rr * 0.3, '#FFF6D0');
      }
      // a popping bubble spitting oil
      const [x, y] = t.p((w0 + w1) / 2 - 0.08, WJ[0] + 0.08, 1);
      s += L(ell(x, y - 1, 2.4, 1.4), 0.5, '#E8C870') + dot(x - 3, y - 7, 0.7, '#C9A44A') + dot(x + 2, y - 9, 0.5, '#C9A44A') + dot(x + 4, y - 5, 0.6, '#C9A44A');
    }
    return s;
  });
}

function potBurnt(): ArtAsset {
  const W = 44;
  const H = 76;
  return asset('pot_burnt', W, H, 0.5, 1, (d) => {
    const t = new Iso(W / 2, H);
    let s = '';
    // smoke column first (behind the pot)
    const r = rnd(4);
    for (let k = 4; k >= 0; k--) {
      const y = H - 22 - k * 8;
      const x = W / 2 + Math.sin(k * 1.3) * 5;
      const rr = 4 + k * 1.6;
      s += F(blob(x, y, rr * 1.2, rr, 30 + k, 7, 0.45), k > 2 ? '#5A5650' : '#3A3632', 0.5, `opacity="${f(0.85 - k * 0.12)}"`);
      void r;
    }
    const c = pot(d, t, -0.13, -0.13, 0, 0.17, 12, tone('#3A3632', 0.12, 0.3), { goo: '#1A1612', burnt: true });
    s += c;
    // crusty black overflow + embers
    const tp = t.p(-0.13, -0.13, 12);
    s += F(blob(tp[0] - 5, tp[1] + 6, 3, 5, 9), '#141210', 0.5) + F(blob(tp[0] + 6, tp[1] + 5, 2.4, 4, 10), '#141210', 0.5);
    s += dot(tp[0] - 2, tp[1] - 0.6, 0.8, '#D07A34') + dot(tp[0] + 3, tp[1] + 0.4, 0.6, '#EBC452');
    return s;
  });
}

// ================================================================ counters + sinks
interface CabOpt {
  body: Tone;
  top: Tone;
  edge: Tone;
  kick: string;
  topZ: number;
  slab?: number;
}
const CB: Box = [-0.48, 0.48, -0.46, 0.46, 3, 34];
const CT: [number, number, number, number] = [-0.5, 0.5, -0.48, 0.5];

function cabinet(d: Doc, t: Iso, o: CabOpt, front: string): { base: string; top: string; topD: string } {
  let base = shadow(d, t, -0.5, 0.5, -0.48, 0.52, 0.3);
  base += box(d, t, [CB[0] + 0.02, CB[1] - 0.02, CB[2], CB[3] - 0.04, 0, 3], tone(o.kick), { sw: 0.9, grad: 0 });
  base += box(d, t, CB, o.body);
  base += onFront(t, CB[0], CB[3], CB[5], front);
  const slab = o.slab ?? 2.4;
  let top = box(d, t, [CT[0], CT[1], CT[2], CT[3], o.topZ - slab, o.topZ], { top: o.top.top, front: o.edge.front, side: o.edge.side }, { sw: 1.1, grad: 0 });
  top += L(seg(t, [CT[0], CT[3], o.topZ - slab * 0.4], [CT[1], CT[3], o.topZ - slab * 0.4]), 0.45, '#FFFFFF', 'opacity="0.45"');
  return { base, top, topD: t.qd(CT[0], CT[1], CT[2], CT[3], o.topZ) };
}

function doors2(col: string, handle: string, extra = ''): string {
  const W = (CB[1] - CB[0]) * 48;
  let s = '';
  s += F(rrect(2.2, 2.2, W / 2 - 3, 26, 0.8), col, 0.7) + F(rrect(W / 2 + 0.8, 2.2, W / 2 - 3, 26, 0.8), col, 0.7);
  s += L(`M4,3.6H${f(W / 2 - 2.4)}M${f(W / 2 + 2.2)},3.6H${f(W - 3.6)}`, 0.5, '#FFFFFF', 'opacity="0.35"');
  s += F(rrect(W / 2 - 3.6, 5, 1.4, 5, 0.6), handle, 0.5) + F(rrect(W / 2 + 2.2, 5, 1.4, 5, 0.6), handle, 0.5);
  return s + extra;
}

function counterPlain(): ArtAsset {
  return objAsset('counter_plain', hFor(40), (d, t) => {
    const body = tone('#7E7C58', 0.12, 0.32);
    // one handle snapped off: just its two screw holes left
    const front = doors2('#8A8862', CHROME) + F(rrect(26.4, 4.4, 2.2, 6.2, 0.6), '#8A8862') + dot(27.5, 5.4, 0.45, '#2A2622') + dot(27.5, 9.4, 0.45, '#2A2622');
    const c = cabinet(d, t, { body, top: tone('#6688AA', 0.04), edge: tone(CHROME, 0.1, 0.38), kick: '#2E2B26', topZ: 36 }, front);
    let s = c.base;
    const fc = faces(t, [CB[0], CB[1], CB[2], CB[3]], [CB[0], CB[1], CB[2], CB[3]], 3, 34);
    const fl = t.p(CB[0], CB[3], 3);
    s += d.clip(fc.front, smear(fl[0] + 10, fl[1] - 2, 12, 4, 3, PAL.grimeD, 0.45) + scratches(fl[0], fl[1] - 30, 46, 30, 12, 5, '#3A3622', 0.5, 4) + F(blob(fl[0] + 30, fl[1] + 10, 5, 3, 6), '#2A2622', 0, 'opacity="0.4"'));
    s += d.clip(fc.side, smear(...t.p(CB[1], 0, 6), 18, 5, 7, PAL.grimeD, 0.4) + scratches(...t.p(CB[1], 0.4, 30), 40, 24, 8, 8, '#3A3622', 0.4, 4));
    s += c.top;
    // laminate: boomerang flecks, scuffs, a cigarette burn, coffee rings
    // blue laminate (the original's counter top #6688AA): a few flecks, then two soft painted grime patches instead of noise
    let lam = speckle(d, c.topD, OFFW, 40, ['#4E6A88', '#8AAAC4', '#5A7A99', '#A87A5A'], 9, 0.3, 0.7, 0.7);
    lam += F(blob(...t.p(0.12, -0.08, 36), 10, 4.6, 14, 8, 0.5), PAL.grimeD, 0, 'opacity="0.18"') + F(blob(...t.p(-0.24, 0.26, 36), 6.5, 3.4, 15, 8, 0.5), PAL.grimeD, 0, 'opacity="0.22"');
    const r = rnd(12);
    for (let k = 0; k < 9; k++) {
      const [x, y] = t.p(-0.4 + r() * 0.8, -0.4 + r() * 0.8, 36);
      lam += L(`M${f(x)},${f(y)}q1.5,-1.4 3,0`, 0.45, k % 2 ? '#7A8A6A' : '#A87A5A', 'opacity="0.7"');
    }
    lam += L(ell(...t.p(0.15, -0.2, 36), 5, 3), 0.8, '#6A4A22', 'opacity="0.45"') + L(ell(...t.p(0.22, -0.16, 36), 5, 3), 0.5, '#6A4A22', 'opacity="0.35"');
    lam += F(blob(...t.p(-0.2, 0.25, 36), 2, 1.2, 7), '#2A2016', 0, 'opacity="0.8"') + F(blob(...t.p(-0.2, 0.25, 36), 3.4, 2, 8), '#6A4A22', 0, 'opacity="0.35"');
    lam += scratches(...t.p(-0.4, 0.3, 36), 50, 20, 8, 15, '#FFFFFF', 0.5, 5);
    s += d.clip(c.topD, lam);
    // duct tape on the door corner
    s += onFront(t, CB[0], CB[3], 34, F('M1,20L8,26L6.6,28L-0.4,22Z', '#9A9C96', 0.5) + L('M2,21.5L7,25.6', 0.3, '#5A5C56'));
    return s;
  });
}

function counterSteel(): ArtAsset {
  return objAsset('counter_steel', hFor(40), (d, t) => {
    let s = shadow(d, t, -0.5, 0.5, -0.48, 0.52, 0.28);
    // open-frame steel prep table: legs, an undershelf with stacked pans, the top
    const legT = tone(CHROME_D, 0.25, 0.3);
    s += box(d, t, [-0.48 + 0.02, -0.48 + 0.06, -0.46 + 0.02, -0.46 + 0.06, 0, 34], legT, { sw: 0.8, hi: false });
    s += box(d, t, [0.48 - 0.06, 0.48 - 0.02, -0.46 + 0.02, -0.46 + 0.06, 0, 34], legT, { sw: 0.8, hi: false });
    s += box(d, t, [-0.48 + 0.02, -0.48 + 0.06, 0.46 - 0.06, 0.46 - 0.02, 0, 34], legT, { sw: 0.8, hi: false });
    s += box(d, t, [-0.46, 0.46, -0.44, 0.44, 8, 10], STEEL, { sw: 0.9, grad: 0 });
    // stacked hotel pans + a box of mystery meat on the shelf
    for (let k = 0; k < 3; k++) s += box(d, t, [-0.36, 0.0, -0.3, 0.28, 10 + k * 3, 12.6 + k * 3], tone('#A8ABA4', 0.12, 0.3), { sw: 0.6, grad: 0 });
    s += box(d, t, [0.06, 0.38, -0.3, 0.1, 10, 20], tone('#A08E62', 0.1, 0.3), { sw: 0.8 });
    s += onFront(t, 0.06, 0.1, 20, L('M3,4h9M3,6.4h6', 0.6, '#5A4E30') + F(rrect(4, 1.5, 6, 1.4, 0.3), '#7A2A22') );
    s += box(d, t, [0.48 - 0.06, 0.48 - 0.02, 0.46 - 0.06, 0.46 - 0.02, 0, 34], legT, { sw: 0.8, hi: false });
    s += box(d, t, [-0.5, 0.5, -0.48, 0.5, 32, 36], STEEL, { sw: 1.1, grad: 0 });
    const topD = t.qd(-0.5, 0.5, -0.48, 0.5, 36);
    s += streaks(d, topD, ...t.p(-0.5, -0.48, 36), 96, 60, 30, 31, 0.6, 0.3);
    s += d.clip(topD, L(seg(t, [-0.3, 0.1, 36], [0.2, 0.0, 36]), 0.5, '#4A4C48', 'opacity="0.5"') + F(blob(...t.p(0.25, 0.2, 36), 6, 2.4, 9), '#7A2A22', 0, 'opacity="0.35"'));
    // a cleaver left on the top
    const c1 = t.p(-0.25, 0.2, 36.4);
    s += F(`M${f(c1[0])},${f(c1[1])}l10,-6l4,4.6l-10,5z`, '#9EA19B', 0.7) + L(`M${f(c1[0] + 1)},${f(c1[1] + 0.6)}l10,-5.6`, 0.5, CHROME_HI) + F(`M${f(c1[0] + 13)},${f(c1[1] - 3)}l6,-3l1.2,1.6l-6,3.2z`, '#3A2A1A', 0.6);
    return s;
  });
}

function counterBar(): ArtAsset {
  return objAsset('counter_bar', hFor(42), (d, t) => {
    const wood = '#4A2E1C';
    const body = tone(wood, 0.12, 0.35);
    let planks = '';
    const W = (CB[1] - CB[0]) * 48;
    for (let k = 1; k < 6; k++) planks += L(`M${f((k * W) / 6)},0V31`, 0.6, '#24160C');
    planks += F(rrect(2, 3, W - 4, 3, 0.6), dk(wood, 0.15)) + F(rrect(2, 25, W - 4, 3, 0.6), dk(wood, 0.15));
    const r = rnd(4);
    for (let k = 0; k < 14; k++) {
      const x = 2 + r() * (W - 4);
      const y = 6 + r() * 18;
      planks += L(`M${f(x)},${f(y)}q0.6,3 0,6`, 0.4, k % 2 ? '#6E4A2E' : '#2E1C10', 'opacity="0.7"');
    }
    const c = cabinet(d, t, { body, top: tone('#3E2516', 0.12), edge: tone('#3A2214', 0.1, 0.35), kick: '#1E140C', topZ: 38, slab: 4.5 }, planks);
    let s = c.base;
    const fc = faces(t, [CB[0], CB[1], CB[2], CB[3]], [CB[0], CB[1], CB[2], CB[3]], 3, 34);
    s += d.clip(fc.side, (() => {
      let g = '';
      for (let k = 0; k < 10; k++) {
        const a = t.p(CB[1], -0.44 + k * 0.1, 3);
        g += L(`M${f(a[0])},${f(a[1])}l0,-31`, 0.5, '#24160C', 'opacity="0.6"');
      }
      return g;
    })());
    s += d.clip(fc.front, smear(...t.p(0, CB[3], 4), 20, 4, 3, '#1A0E06', 0.5) + scratches(...t.p(-0.4, CB[3], 20), 50, 10, 6, 7, '#9A6A44', 0.5, 4));
    // brass foot rail on brackets
    for (const i of [-0.38, 0.38]) s += L(seg(t, [i, 0.46, 7], [i, 0.53, 6]), 1.4, '#6A5222');
    s += L(seg(t, [-0.48, 0.53, 6], [0.48, 0.53, 6]), 3, INK) + L(seg(t, [-0.48, 0.53, 6], [0.48, 0.53, 6]), 2, '#B08A3A') + L(seg(t, [-0.48, 0.53, 6.5], [0.48, 0.53, 6.5]), 0.5, '#F0D68A');
    s += c.top;
    // glossy dark top: grain, gloss streak, ring stains, carved initials
    let tp = '';
    for (let k = 0; k < 7; k++) {
      const j = -0.44 + k * 0.14;
      tp += L(seg(t, [-0.5, j, 38], [0.5, j + 0.02, 38]), 0.45, '#2A180C', 'opacity="0.6"');
    }
    tp += L(seg(t, [-0.42, 0.2, 38], [0.3, -0.38, 38]), 2.4, '#FFFFFF', 'opacity="0.1"');
    tp += L(ell(...t.p(0.2, 0.1, 38), 4.6, 2.8), 0.7, '#7A5A3A', 'opacity="0.6"') + L(ell(...t.p(-0.25, -0.2, 38), 4.6, 2.8), 0.6, '#7A5A3A', 'opacity="0.5"');
    tp += L(`M${pp(t.p(-0.1, 0.3, 38))}l2,-1.2l-1,2l2.4,-1.4`, 0.5, '#B08A5A', 'opacity="0.7"');
    s += d.clip(c.topD, tp);
    return s;
  });
}

// ---- sinks
interface SinkOpt {
  cab: CabOpt;
  front: string;
  basin: string;
  key: string;
  dirty?: boolean;
  steel?: boolean;
}
const BI: [number, number, number, number] = [-0.3, 0.3, -0.26, 0.24];

function sink(o: SinkOpt): ArtAsset {
  return objAsset(o.key, hFor(56), (d, t) => {
    const c = cabinet(d, t, o.cab, o.front);
    let s = c.base;
    const fc = faces(t, [CB[0], CB[1], CB[2], CB[3]], [CB[0], CB[1], CB[2], CB[3]], 3, 34);
    if (o.steel) {
      const fl = t.p(CB[0], CB[3], 34);
      s += streaks(d, fc.front, fl[0], fl[1], 46, 60, 24, 3, 0, 0.35) + streaks(d, fc.side, fl[0] + 44, fl[1] - 28, 46, 60, 18, 4, 0, 0.3);
    }
    if (o.dirty) {
      const fl = t.p(CB[0], CB[3], 3);
      s += d.clip(fc.front, smear(fl[0] + 14, fl[1] - 3, 14, 5, 2, PAL.grimeD, 0.5) + rust(fl[0] + 36, fl[1] + 18, 2.6, 3) + scratches(fl[0], fl[1] - 30, 46, 26, 10, 3, '#5E5232', 0.5, 4));
      s += d.clip(fc.side, smear(...t.p(CB[1], 0, 5), 18, 5, 4, PAL.grimeD, 0.5) + rust(...t.p(CB[1], -0.2, 8), 3, 5));
      // a slow leak under the cabinet
      s += F(blob(...t.p(0.1, 0.5, 0), 10, 3, 6), '#7A8A7A', 0, 'opacity="0.4"');
    }
    s += c.top;
    const Z = o.cab.topZ;
    const BZ = Z - 10;
    const hole = t.qd(BI[0], BI[1], BI[2], BI[3], Z);
    let inn = F(hole, dk(o.basin, 0.15));
    // far inner walls (i0 wall faces +i: shade; j0 wall faces +j: lit) and the floor of the basin
    inn += F(poly([t.p(BI[0], BI[2], Z), t.p(BI[0], BI[3], Z), t.p(BI[0], BI[3], BZ), t.p(BI[0], BI[2], BZ)]), dk(o.basin, 0.3));
    inn += F(poly([t.p(BI[0], BI[2], Z), t.p(BI[1], BI[2], Z), t.p(BI[1], BI[2], BZ), t.p(BI[0], BI[2], BZ)]), dk(o.basin, 0.08));
    inn += F(t.qd(BI[0], BI[1], BI[2], BI[3], BZ), dk(o.basin, 0.2));
    inn += F(disc(t, 0.02, 0, BZ, 0.035).d, '#2A2622', 0.4);
    if (o.steel) inn += streaks(d, hole, ...t.p(BI[0], BI[2], Z), 60, 30, 14, 6, 0.2, 0.35);
    if (o.dirty) {
      // grey water with scum and a floating thing
      const wz = BZ + 4;
      inn += F(t.qd(BI[0], BI[1], BI[2], BI[3], wz), '#6E7462', 0, 'opacity="0.9"');
      inn += F(blob(...t.p(-0.05, 0.0, wz), 12, 3.5, 3), '#8E9A6A', 0, 'opacity="0.55"') + F(blob(...t.p(0.15, 0.1, wz), 5, 2, 4), '#A8A27A', 0, 'opacity="0.6"');
      inn += dot(...t.p(-0.15, 0.1, wz), 0.8, '#C9C4A8') + dot(...t.p(0.02, 0.15, wz), 0.6, '#C9C4A8');
      inn += F(blob(...t.p(-0.25, -0.2, Z - 2), 5, 3, 7), RUST, 0, 'opacity="0.55"');
    }
    s += d.clip(hole, inn);
    s += F(hole, 'none', 0.9) + L(seg(t, [BI[0], BI[3], Z - 0.4], [BI[1], BI[3], Z - 0.4]) + seg(t, [BI[1], BI[3], Z - 0.4], [BI[1], BI[2], Z - 0.4]), 0.5, '#FFFFFF', 'opacity="0.4"');
    if (o.dirty) {
      // dirty plates piled up past the rim (clipped so the near rim hides their bottoms)
      const near = [t.p(BI[0], BI[3], Z), t.p(BI[1], BI[3], Z), t.p(BI[1], BI[2], Z)];
      const clipD = poly([[0, near[0][1]], near[0], near[1], near[2], [104, near[2][1]], [104, 0], [0, 0]]);
      let pl = '';
      const plates: [number, number, number, number, number][] = [
        [-0.08, -0.12, 30, -14, 0],
        [0.05, -0.08, 31.5, -8, 1],
        [-0.02, 0.0, 33, 12, 2],
        [0.12, -0.02, 34.5, 22, 3],
      ];
      for (const [i, j, z, rot, k] of plates) {
        const [x, y] = t.p(i, j, z);
        pl += `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})">` + F(ell(x, y + 0.9, 9, 5), '#B5AE96', 0.7) + F(ell(x, y, 9, 5), '#E2DDCB', 0.7) + L(ell(x, y, 6.2, 3.3), 0.4, '#A39C84') + F(blob(x + 1, y, 3.4, 1.8, 40 + k), ['#6A4A22', '#7A2A22', '#6E7A2E', '#5A3A1A'][k], 0, 'opacity="0.75"') + '</g>';
      }
      // fork jutting out
      const fk = t.p(0.2, -0.15, 34);
      pl += L(`M${pp(fk)}l5,-9`, 1.4, INK) + L(`M${pp(fk)}l5,-9`, 0.7, CHROME) + L(`M${f(fk[0] + 4.4)},${f(fk[1] - 9)}l0.4,-3M${f(fk[0] + 5.4)},${f(fk[1] - 8.6)}l0.6,-3`, 0.5, CHROME_D);
      s += d.clip(clipD, pl);
    }
    // the tap at the back: base, two handles, gooseneck spout
    const tb = t.p(0, -0.39, Z);
    s += F(ell(tb[0], tb[1], 4, 2), dk(CHROME, 0.2), 0.6);
    for (const di of [-0.14, 0.14]) {
      const hp = t.p(di, -0.39, Z);
      s += F(rrect(hp[0] - 1, hp[1] - 4, 2, 4, 0.6), CHROME_D, 0.5) + F(ell(hp[0], hp[1] - 4.4, 2.2, 1.2), o.dirty ? '#8A4A3A' : CHROME, 0.5);
    }
    const sp = t.p(0, -0.16, Z + 9);
    const spout = `M${f(tb[0])},${f(tb[1])}V${f(tb[1] - 14)}Q${f(tb[0])},${f(tb[1] - 19)} ${f((tb[0] + sp[0]) / 2)},${f(tb[1] - 18.5)}Q${f(sp[0])},${f(tb[1] - 18)} ${f(sp[0])},${f(sp[1])}`;
    s += L(spout, 3.2, INK) + L(spout, 2, CHROME) + L(spout, 0.5, CHROME_HI, 'transform="translate(-0.5 -0.3)"');
    if (o.dirty) {
      s += F(blob(tb[0] + 1, tb[1] + 3, 5, 2, 8), RUST, 0, 'opacity="0.55"');
      // drip drip
      s += F(`M${f(sp[0])},${f(sp[1] + 1.5)}q-1,2 0,2.6q1,-0.6 0,-2.6z`, '#B9D0D4', 0.4) + F(`M${f(sp[0])},${f(sp[1] + 6)}q-1.2,2.2 0,3q1.2,-0.8 0,-3z`, '#B9D0D4', 0.4);
      s += L(ell(sp[0], sp[1] + 12, 2, 0.8), 0.4, '#B9D0D4');
      s += roach(...t.p(0.33, 0.1, Z), 140, 0.85);
      s += fly(...(t.p(-0.1, -0.1, Z + 26) as [number, number]), 0.85);
    }
    return s;
  });
}

// ---- bins
function bin(key: string, col: string): ArtAsset {
  return objAsset(key, hFor(56), (d, t) => {
    const tn = tone(col, 0.12, 0.32);
    let s = shadow(d, t, -0.34, 0.34, -0.32, 0.36, 0.3);
    // wheels at the back
    const wr = t.p(0.29, -0.2, 4);
    s += F(ell(wr[0], wr[1], 3.6, 4.4), '#1E1C19', 0.8) + F(ell(wr[0] - 0.6, wr[1], 1.2, 1.6), '#5A5650', 0.4);
    const lo: [number, number, number, number] = [-0.25, 0.25, -0.22, 0.27];
    const hi: [number, number, number, number] = [-0.29, 0.29, -0.27, 0.31];
    s += tbox(d, t, lo, hi, 2, 46, tn);
    const fc = faces(t, lo, hi, 2, 46);
    // ribs + grime + scratches + painted number
    let g = '';
    const fl = t.p(-0.25, 0.27, 2);
    g += smear(fl[0] + 10, fl[1] - 3, 14, 6, 3, '#1E1A10', 0.4) + smear(...t.p(0.27, 0, 6), 14, 6, 4, '#1E1A10', 0.4);
    g += scratches(fl[0], fl[1] - 38, 56, 34, 14, 4, '#FFFFFF', 0.35, 5);
    g += F(blob(...t.p(0.0, 0.29, 30), 3, 9, 5, 7, 0.6), '#6E7A2E', 0, 'opacity="0.55"');
    s += d.clip(fc.front, g) + d.clip(fc.side, g);
    s += onFront(t, -0.29, 0.31, 46, `<text x="8" y="20" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="8" fill="#E9E4D2" opacity="0.8">13</text>` + L('M4,30h20', 0.6, dk(col, 0.4)) + L('M4,33h20', 0.6, dk(col, 0.4)));
    s += onSide(t, 0.29, 0.31, 46, L('M4,4v30M28,4v26', 0.6, dk(col, 0.4)));
    // lid: slightly lifted at the front with garbage poking out
    const L0: Box = [-0.31, 0.31, -0.33, 0.33, 46, 49];
    // garbage under the lid gap (drawn first so the lid overlaps)
    const gp = t.p(-0.05, 0.31, 47);
    s += F(`M${f(gp[0] - 6)},${f(gp[1] - 1)}l-6,6l2,1.5l6,-5z`, BONE, 0.6) + F(ell(gp[0] - 12.5, gp[1] + 6, 1.8, 1.4), BONE, 0.5);
    // fish skeleton tail
    const fp = t.p(0.18, 0.31, 47);
    s += L(`M${pp(fp)}l4,7`, 0.9, BONE) + F(`M${f(fp[0] + 4)},${f(fp[1] + 7)}l-2.4,3.4l5,-0.6z`, BONE, 0.5);
    for (let k = 1; k < 4; k++) s += L(`M${f(fp[0] + k)},${f(fp[1] + k * 1.75)}l2,-0.6M${f(fp[0] + k)},${f(fp[1] + k * 1.75)}l-1.8,0.8`, 0.5, BONE);
    s += box(d, t, L0, tone(dk(col, 0.06), 0.1, 0.35), { sw: 1.1, grad: 0 });
    s += L(seg(t, [-0.2, 0.33, 47.5], [0.2, 0.33, 47.5]), 1.6, dk(col, 0.4));
    // back handle bar
    s += L(seg(t, [-0.24, -0.35, 52], [0.24, -0.35, 52]), 3, INK) + L(seg(t, [-0.24, -0.35, 52], [0.24, -0.35, 52]), 1.8, dk(col, 0.2));
    // slime dribble from the lid
    const sl = t.p(0.05, 0.33, 46);
    s += F(`M${f(sl[0] - 1.5)},${f(sl[1])}q0,7 1.2,9q1.4,0.6 1.6,-1.2q0,-4 0.4,-7.8z`, PAL.slime, 0.4) + dot(sl[0] + 0.2, sl[1] + 10.4, 1, PAL.slime);
    s += fly(...(t.p(0.1, 0.1, 62) as [number, number]), 0.9) + fly(...(t.p(-0.22, 0.2, 58) as [number, number]), 0.75);
    return s;
  });
}

// ================================================================ fridges
const FB: Box = [-0.42, 0.42, -0.36, 0.42, 4, 84];

function fridge(key: string, body: Tone, deco: (d: Doc, t: Iso, fc: ReturnType<typeof faces>) => { front: string; after: string }): ArtAsset {
  return objAsset(key, hFor(86, 0.42), (d, t) => {
    let s = shadow(d, t, -0.46, 0.46, -0.4, 0.48, 0.32);
    s += box(d, t, [FB[0] + 0.03, FB[1] - 0.03, FB[2], FB[3] - 0.03, 0, 4], tone('#26231E'), { sw: 0.9, grad: 0 });
    s += box(d, t, FB, body, { grad: 0.18 });
    const fc = faces(t, [FB[0], FB[1], FB[2], FB[3]], [FB[0], FB[1], FB[2], FB[3]], FB[4], FB[5]);
    const dd = deco(d, t, fc);
    s += dd.front + dd.after;
    return s;
  });
}

const FW = (FB[1] - FB[0]) * 48; // front face width in its frame (40.3)

function fridgeDoors(col: string, handle: string): string {
  let s = '';
  s += F(rrect(1.6, 2, FW - 3.2, 23, 1.6), col, 0.8);
  s += F(rrect(1.6, 27, FW - 3.2, 51, 1.6), col, 0.8);
  s += L(`M3,3.4H${f(FW - 3)}M3,28.4H${f(FW - 3)}`, 0.6, '#FFFFFF', 'opacity="0.4"');
  s += L(`M3,25.6H${f(FW - 3)}`, 0.8, DEEP, 'opacity="0.5"');
  // handles: chunky vertical bars on the left edge
  for (const [y0, y1] of [[12, 23], [29.5, 46]] as [number, number][]) {
    s += F(rrect(4.2, y0, 2.4, y1 - y0, 1.2), handle, 0.7) + L(`M5,${f(y0 + 1.4)}V${f(y1 - 1.4)}`, 0.5, '#FFFFFF', 'opacity="0.6"');
  }
  return s;
}

function fridgeDirty(): ArtAsset {
  return fridge('fridge_dirty', tone(ENAMEL, 0.08, 0.32, 0.03), (d, t, fc) => {
    let front = onFront(t, FB[0], FB[3], FB[5], fridgeDoors(dk(ENAMEL, 0.03), CHROME_D));
    let g = '';
    const fl = t.p(FB[0], FB[3], 4);
    const sr = t.p(FB[1], FB[2], 4);
    const r = rnd(31);
    // grime gradient from the floor + smears, rust blooms, chipped enamel
    g += F(fc.front, d.linear(0, fl[1], 0, fl[1] - 40, [[0, PAL.grimeD, 0.55], [1, PAL.grimeD, 0]])) + F(fc.side, d.linear(0, sr[1], 0, sr[1] - 40, [[0, PAL.grimeD, 0.55], [1, PAL.grimeD, 0]]));
    g += rust(fl[0] + 4, fl[1] - 5, 3.6, 41) + rust(fl[0] + 34, fl[1] + 13, 3, 42) + rust(sr[0] - 4, sr[1] - 6, 4, 43) + rust(fl[0] + 6, fl[1] - 52, 2.2, 44);
    g += rustDrip(fl[0] + 8, fl[1] - 48, 10) + rustDrip(sr[0] - 12, sr[1] - 60, 14, 1);
    for (let k = 0; k < 10; k++) g += F(blob(fl[0] + 2 + r() * 74, fl[1] - 80 + r() * 70, 0.7 + r() * 0.8, 0.6 + r() * 0.5, 90 + k, 6, 0.6), '#2E3236', 0, 'opacity="0.75"');
    g += scratches(fl[0], fl[1] - 70, 80, 60, 16, 33, '#5E5232', 0.5, 5);
    g += smear(...t.p(0.1, FB[3], 70), 10, 6, 45, '#6A5A2A', 0.3);
    front += d.clip(fc.front, g);
    let side = d.clip(fc.side, g);
    // a dent in the side panel
    const dp = t.p(FB[1], 0.05, 40);
    side += F(blob(dp[0], dp[1], 5, 7, 47), DEEP, 0, 'opacity="0.25"') + L(`M${f(dp[0] - 4)},${f(dp[1] - 5)}Q${f(dp[0] + 2)},${f(dp[1] - 1)} ${f(dp[0] - 2)},${f(dp[1] + 6)}`, 0.7, '#FFFFFF', 'opacity="0.55"') + crack(dp[0] + 1, dp[1] - 1, 1.2, 6, 48, 0.4, '#5A5040', 0);
    // the note, a slime handprint, a skull magnet
    let fx = '';
    fx += `<g transform="rotate(-5 26 44)">` + F(rrect(13.5, 35, 21, 14.5, 0.4), '#E6DA9A', 0.6) + F('M13.5,46L16,49.5H13.5Z', '#C9BC7A', 0) + F(rrect(15, 33.6, 5, 2.6, 0.3), '#D8D4C0', 0.3, 'opacity="0.85" transform="rotate(-12 17 35)"') + F(rrect(28, 33.6, 5, 2.6, 0.3), '#D8D4C0', 0.3, 'opacity="0.85" transform="rotate(10 30 35)"');
    fx += `<text x="24" y="40.6" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="3.6" fill="#2A2416">DON'T EAT</text>`;
    fx += `<text x="24" y="45.2" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="4.2" fill="#7A2A22">STAFF</text>`;
    fx += L('M17,46.8q3,-1 6,0t6,0', 0.5, '#7A2A22') + F(blob(31, 38, 1.4, 1, 49), '#6A4A22', 0, 'opacity="0.5"') + '</g>';
    fx += handprint(26, 13, 0.95);
    fx += F(ell(11, 52, 2.4, 2.6), '#D6CDAE', 0.6) + dot(10.1, 51.8, 0.6, INK) + dot(11.9, 51.8, 0.6, INK) + L('M10.2,53.6h1.6', 0.4, INK);
    fx += F(rrect(30, 60, 5, 4, 0.6), '#5A7A2A', 0.5) + F(rrect(31, 61, 3, 1.2, 0.3), '#E6DA9A');
    front += onFront(t, FB[0], FB[3], FB[5], fx);
    // top: dust, an old pizza box
    let after = side;
    after += box(d, t, [-0.32, 0.18, -0.28, 0.22, 84, 86.5], tone('#B39A6A', 0.1, 0.3), { sw: 0.8, grad: 0 });
    after += F(blob(...t.p(-0.05, -0.05, 86.5), 8, 3, 50), '#8A3A22', 0, 'opacity="0.35"');
    after += fly(...(t.p(-0.15, 0.42, 72) as [number, number]), 0.9);
    after += roach(...t.p(0.42, 0.25, 18), -80, 0.85);
    return { front, after };
  });
}

function fridgePlain(): ArtAsset {
  const cream = '#E4DDC4';
  return fridge('fridge_plain', tone(cream, 0.08, 0.3, 0.03), (d, t, fc) => {
    let front = onFront(t, FB[0], FB[3], FB[5], fridgeDoors(dk(cream, 0.03), CHROME) + F(rrect(FW / 2 - 6, 30.5, 12, 3, 1.4), CHROME, 0.5) + L(`M${f(FW / 2 - 4)},32H${f(FW / 2 + 4)}`, 0.5, '#7F8584'));
    const fl = t.p(FB[0], FB[3], 4);
    front += d.clip(fc.front, smear(fl[0] + 18, fl[1] + 6, 20, 5, 3, PAL.grime, 0.3) + scratches(fl[0], fl[1] - 70, 40, 60, 6, 9, '#8A7A50', 0.35, 4));
    const after = d.clip(fc.side, smear(...t.p(FB[1], 0, 8), 16, 5, 4, PAL.grime, 0.3)) + onFront(t, FB[0], FB[3], FB[5], F(rrect(26, 8, 6, 4.4, 0.4), '#E6DA9A', 0.4, 'transform="rotate(6 29 10)"') + L('M27,10h4M27,11.4h3', 0.4, '#5A5040'));
    return { front, after };
  });
}

function fridgeSteel(): ArtAsset {
  return fridge('fridge_steel', STEEL, (d, t, fc) => {
    let fr = '';
    const half = FW / 2;
    fr += F(rrect(1.4, 2, half - 2, 76, 1.2), '#A9ACA6', 0.8) + F(rrect(half + 0.6, 2, half - 2, 76, 1.2), '#A9ACA6', 0.8);
    // dispenser recess on the left door
    fr += F(rrect(5, 18, 11, 17, 1), '#2A2A28', 0.7) + F(rrect(9, 21, 3, 7, 0.6), '#5A5C58', 0.5) + F(rrect(6.5, 31.5, 8, 2, 0.6), '#4A4C48') + dot(8, 20, 0.6, '#6AA0B0');
    for (const x of [half - 3.4, half + 1]) fr += F(rrect(x, 12, 2.4, 44, 1.2), CHROME, 0.7) + L(`M${f(x + 0.8)},13.4V54.6`, 0.5, CHROME_HI);
    const fl = t.p(FB[0], FB[3], FB[5]);
    let front = onFront(t, FB[0], FB[3], FB[5], fr);
    front += streaks(d, fc.front, fl[0], fl[1], 42, 120, 34, 5, 0, 0.45) + streaks(d, fc.side, fl[0] + 40, fl[1] - 30, 42, 120, 28, 6, 0, 0.4);
    front += d.clip(fc.front, F(blob(...t.p(-0.1, FB[3], 44), 3, 2.4, 9), '#7A8A6A', 0, 'opacity="0.35"') + scratches(fl[0], fl[1] + 40, 40, 40, 6, 7, '#3A3A34', 0.4, 4));
    return { front, after: '' };
  });
}

// ================================================================ toxic keg
function kegToxic(): ArtAsset {
  return objAsset('keg_toxic', hFor(58, 0.3), (d, t) => {
    // glowing puddle first
    let s = F(blob(...t.p(0.08, 0.22, 0), 30, 12, 5, 9, 0.35), TOXIC_D, 0.7, 'opacity="0.85"');
    s += F(blob(...t.p(0.1, 0.24, 0), 24, 9, 6, 8, 0.3), TOXIC, 0, 'opacity="0.75"');
    s += F(blob(...t.p(0.1, 0.22, 0), 12, 4, 7), '#D8F27A', 0, `opacity="0.6" filter="${d.blur(1.2)}"`);
    s += dot(...t.p(0.3, 0.3, 0), 1.2, '#D8F27A', 0.8) + dot(...t.p(-0.12, 0.4, 0), 0.9, '#D8F27A', 0.8);
    s += shadowDisc(d, t, 0, 0, 0.28, 0.28);
    const drum = '#56703A';
    const c = cyl(d, t, 0, 0, 0.27, 0, 52, tone(drum, 0.12, 0.38));
    s += c.svg;
    const top = c.top;
    // rolling hoops
    for (const z of [17, 35]) {
      const e = disc(t, 0, 0, z, 0.27);
      const arc = `M${f(e.cx - e.rx)},${f(e.cy)}A${f(e.rx)},${f(e.ry)} 0 0 0 ${f(e.cx + e.rx)},${f(e.cy)}`;
      s += L(arc, 2.8, INK) + L(arc, 1.7, dk(drum, 0.25)) + L(arc, 0.5, lt(drum, 0.3), 'transform="translate(0 -0.9)"');
    }
    // rust, chips, a dent
    let g = F(blob(top.cx + 12, top.cy + 42, 3.5, 5, 3, 8, 0.6), RUST, 0, 'opacity="0.5"') + F(blob(top.cx - 12, top.cy + 52, 7, 4, 4), RUST_D, 0, 'opacity="0.55"');
    g += rustDrip(top.cx + 13, top.cy + 8, 14) + scratches(top.cx - 18, top.cy + 6, 36, 40, 12, 6, '#C9D2A0', 0.4, 4);
    g += F(blob(top.cx + 9, top.cy + 24, 3.4, 4.4, 5), DEEP, 0, 'opacity="0.3"') + L(`M${f(top.cx + 6.6)},${f(top.cy + 21)}q3,3 1,7`, 0.6, '#FFFFFF', 'opacity="0.45"');
    s += d.clip(c.body, g);
    // the warning label
    s += `<g transform="translate(${f(top.cx - 3)} ${f(top.cy + 27)}) scale(0.82 1)">` + hazard(6, '#1E1C19', '#C9B03A') + '</g>';
    // lid: rim ring + bungs, one popped and leaking
    s += L(ell(top.cx, top.cy, top.rx * 0.88, top.ry * 0.86), 0.6, dk(drum, 0.3));
    s += F(ell(top.cx - 6, top.cy - 2, 2.4, 1.4), '#3A3A30', 0.5);
    const bx = top.cx + 5;
    const by = top.cy + 2;
    s += F(ell(bx, by, 2.6, 1.5), '#1E1C19', 0.5);
    // ooze welling up and running over the rim and down the front
    const ooze = `M${f(bx - 3)},${f(by - 1)}C${f(bx - 4)},${f(by + 3)} ${f(bx - 2)},${f(by + 6)} ${f(bx - 3)},${f(by + 9)}C${f(bx - 3.6)},${f(by + 16)} ${f(bx - 1)},${f(by + 22)} ${f(bx)},${f(by + 26)}C${f(bx + 1)},${f(by + 22)} ${f(bx + 0.8)},${f(by + 14)} ${f(bx + 1.4)},${f(by + 9)}C${f(bx + 2.6)},${f(by + 12)} ${f(bx + 3)},${f(by + 16)} ${f(bx + 4)},${f(by + 17)}C${f(bx + 5)},${f(by + 14)} ${f(bx + 4)},${f(by + 6)} ${f(bx + 3.6)},${f(by + 1)}Z`;
    s += F(ooze, TOXIC, 0.6) + L(`M${f(bx - 1.6)},${f(by + 2)}C${f(bx - 1.4)},${f(by + 8)} ${f(bx - 1.2)},${f(by + 14)} ${f(bx - 0.2)},${f(by + 20)}`, 0.6, '#E6FA9A', 'opacity="0.8"');
    s += F(ell(bx, by - 0.4, 3, 1.7), TOXIC, 0.5) + dot(bx - 1, by - 0.9, 0.7, '#E6FA9A');
    // a long drip falling to the puddle
    const dp = t.p(-0.12, 0.25, 0);
    s += F(`M${f(top.cx - 11)},${f(top.cy + 3)}q-1,10 0,20q0.6,4 1.2,0q0.8,-10 0.4,-19z`, TOXIC, 0.5) + F(ell(dp[0] + 3, dp[1] - 10, 1.2, 1.7), TOXIC, 0.4);
    return s;
  });
}

// ================================================================ late-game stations
/** Courses of bricks filling a w x h face frame (x right, y down). */
function brickFace(w: number, h: number, seed: number, cols: string[], rowH = 4.6, len = 9): string {
  const r = rnd(seed);
  let s = F(`M0,0H${f(w)}V${f(h)}H0Z`, '#5E5040');
  const rows = Math.ceil(h / rowH);
  for (let row = 0; row < rows; row++) {
    const y0 = row * rowH + 0.35;
    const off = row % 2 ? -len / 2 : 0;
    for (let x = off; x < w; x += len) {
      const x0 = Math.max(0, x + 0.35);
      const x1 = Math.min(w, x + len - 0.35);
      if (x1 - x0 < 0.8) continue;
      s += F(rrect(x0, y0, x1 - x0, rowH - 0.7, 0.4), cols[Math.floor(r() * cols.length)]) + L(`M${f(x0 + 0.4)},${f(y0 + 0.4)}H${f(x1 - 0.4)}`, 0.35, '#D08A62', 'opacity="0.45"');
    }
  }
  return s;
}
const BRICKS = ['#8E4A2E', '#7E3E26', '#9A5634', '#6E3420', '#86462A'];

/** Ember bed: glowing blobs + a blurred glow, inside a clip. */
function embers(d: Doc, cx: number, cy: number, rx: number, ry: number, seed: number, n = 14): string {
  const r = rnd(seed);
  let s = F(ell(cx, cy, rx, ry), '#2A1A10');
  s += F(ell(cx, cy, rx * 0.8, ry * 0.7), '#D0602A', 0, `opacity="0.55" filter="${d.blur(2)}"`);
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2;
    const m = Math.sqrt(r()) * 0.85;
    s += F(blob(cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m, 2.2 + r() * 1.4, 1.3 + r(), seed * 7 + k, 6, 0.4), ['#3A2418', '#B2502A', '#E08A3A', '#4A2C1C'][k % 4], 0.3);
  }
  s += dot(cx - rx * 0.2, cy, 0.8, '#FFE0A0') + dot(cx + rx * 0.3, cy + ry * 0.2, 0.6, '#FFD080');
  return s;
}

// ---------------------------------------------------------------- witch's cauldron (Mad Sauces)
const CAUL_TOP = 46;
function witchCauldron(): ArtAsset {
  return objAsset('witch_cauldron', hFor(60), (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadowDisc(d, t, 0, 0.02, 0.46, 0.3);
    // hearth: a ring of rough stones round a wood fire
    const ring = cyl(d, t, 0, 0, 0.43, 0, 13, tone('#77706A', 0.12, 0.32));
    s += ring.svg;
    const r = rnd(41);
    let st = '';
    for (let row = 0; row < 3; row++)
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.02 + (k + (row % 2) * 0.5) / 8.6);
        const x = X + Math.cos(a) * ring.top.rx * 1.02;
        const y = Y + Math.sin(a) * ring.top.ry - 2 - row * 4.2;
        st += F(blob(x, y, 4.4 + r() * 1.2, 2.1 + r() * 0.4, 400 + row * 9 + k, 7, 0.35), ['#8A847A', '#6E6860', '#9A948A', '#5E5A52'][(k + row) % 4], 0.5);
      }
    s += d.clip(ring.body, st);
    s += F(ring.body, 'none', LW);
    // fire opening at the front with logs and flames licking out
    const mouth = `M${f(X - 9)},${f(Y + ring.top.ry - 1)}C${f(X - 9)},${f(Y + ring.top.ry - 12)} ${f(X + 9)},${f(Y + ring.top.ry - 12)} ${f(X + 9)},${f(Y + ring.top.ry - 1)}Z`;
    s += F(mouth, '#1A120C', 0.8) + d.clip(mouth, embers(d, X, Y + ring.top.ry - 3, 9, 4, 42, 9) + flame(X - 3, Y + ring.top.ry - 2, 8, 2.2, -1) + flame(X + 3, Y + ring.top.ry - 2, 6, 2, 1));
    s += F(capsule([X - 13, Y + ring.top.ry + 1], [X + 4, Y + ring.top.ry - 1], 3.2, 3), '#5A3E24', 0.7) + F(ell(X - 13, Y + ring.top.ry + 1, 1.5, 1.6), '#B08A5A', 0.5);
    s += F(ring.top.d, '#3A2E26', 0.8);
    s += F(ell(X, Y - 13, ring.top.rx * 0.8, ring.top.ry * 0.7), '#E07A2A', 0, `opacity="0.5" filter="${d.blur(2.4)}"`);
    // the cauldron: a fat iron belly on three stubby feet
    const top = disc(t, 0, 0, CAUL_TOP, 0.34);
    const belly = `M${f(X - top.rx)},${f(top.cy)}C${f(X - top.rx - 9)},${f(Y - 34)} ${f(X - top.rx - 4)},${f(Y - 12)} ${f(X)},${f(Y - 11)}C${f(X + top.rx + 4)},${f(Y - 12)} ${f(X + top.rx + 9)},${f(Y - 34)} ${f(X + top.rx)},${f(top.cy)}Z`;
    for (const [fx, fy] of [[-14, -14], [14, -14], [0, -10]] as [number, number][]) s += F(capsule([X + fx, Y + fy - 4], [X + fx * 1.15, Y + fy + 1], 3.2, 2.4), '#22201C', 0.8);
    s += F(belly, d.linear(X - top.rx - 8, 0, X + top.rx + 8, 0, [[0, '#4A4740'], [0.3, '#5E5A52'], [0.62, '#2E2C28'], [1, '#1A1816']]));
    let tex = F(belly, d.linear(0, Y - 30, 0, Y - 11, [[0, '#E07A2A', 0], [1, '#E07A2A', 0.3]]));
    tex += F(blob(X + 13, Y - 22, 4, 3, 43), RUST, 0, 'opacity="0.5"') + F(blob(X - 16, Y - 30, 3, 2, 44), RUST_D, 0, 'opacity="0.45"');
    // iron band with rivets
    tex += L(`M${f(X - top.rx - 5)},${f(Y - 31)}Q${f(X)},${f(Y - 21)} ${f(X + top.rx + 5)},${f(Y - 31)}`, 2.6, INK) + L(`M${f(X - top.rx - 5)},${f(Y - 31)}Q${f(X)},${f(Y - 21)} ${f(X + top.rx + 5)},${f(Y - 31)}`, 1.6, '#3E3A34');
    for (let k = -3; k <= 3; k++) tex += dot(X + k * 7.4, Y - 26.2 - Math.abs(k) * 0.9 + (Math.abs(k) > 2 ? -1 : 0), 0.7, '#8E8A80');
    // sauce dribbling down the outside
    tex += F(`M${f(X - 6)},${f(top.cy + top.ry - 1)}q-1,7 0,12q1,2 2,0q0.6,-6 1.4,-11.4Z`, '#6A2416', 0.5) + F(`M${f(X + 9)},${f(top.cy + top.ry - 2)}q0,4 0.8,6q1,1 1.4,-0.6q0,-3 0.2,-5Z`, '#6A2416', 0.5);
    s += d.clip(belly, tex) + L(belly, LW);
    // handles
    s += L(`M${f(X - top.rx - 3)},${f(top.cy + 3)}q-6,1 -5,7`, 3, INK) + L(`M${f(X - top.rx - 3)},${f(top.cy + 3)}q-6,1 -5,7`, 1.6, '#55524C');
    s += L(`M${f(X + top.rx + 3)},${f(top.cy + 3)}q6,1 5,7`, 3, INK) + L(`M${f(X + top.rx + 3)},${f(top.cy + 3)}q6,1 5,7`, 1.6, '#3A3833');
    // thick rim, then the bubbling sauce (overlay bubbles sit on this surface)
    s += F(ell(X, top.cy, top.rx + 2.2, top.ry + 1.4), '#4E4B44', LW);
    const surf = ell(X, top.cy + 0.6, top.rx - 0.6, top.ry - 0.6);
    s += F(surf, d.radial(X - 5, top.cy - 2, top.rx * 1.1, [[0, '#B0542C'], [0.55, '#7A2E1A'], [1, '#3E140C']]), 0.8);
    s += d.clip(surf, F(blob(X + 6, top.cy + 2, 6, 2, 45), '#5E7A2A', 0, 'opacity="0.55"') + L(`M${f(X - 12)},${f(top.cy)}q5,-2 10,0t10,-1`, 0.6, '#E0A060', 'opacity="0.5"'));
    s += eyeball(d, X + 3, top.cy - 1.4, 2.6, [-0.4, 0.3], '#4F6A3A', 46);
    // a finger poking up, and the big stirring paddle
    s += finger(d, [X - 8, top.cy + 1.6], [X - 10, top.cy - 6], 2.2);
    s += L(`M${f(X + 10)},${f(top.cy + 1)}L${f(X + 24)},${f(top.cy - 30)}`, 4.2, INK) + L(`M${f(X + 10)},${f(top.cy + 1)}L${f(X + 24)},${f(top.cy - 30)}`, 2.8, '#8E6A40') + L(`M${f(X + 11)},${f(top.cy - 1)}L${f(X + 23)},${f(top.cy - 28)}`, 0.6, '#C9A877');
    // a tiny witch's hat left on the hearth, a skull wedged in the stones
    const [hx, hy] = t.p(0.38, 0.18, 13);
    s += F(`M${f(hx - 7)},${f(hy)}Q${f(hx)},${f(hy + 3)} ${f(hx + 7)},${f(hy)}Q${f(hx)},${f(hy - 2.6)} ${f(hx - 7)},${f(hy)}Z`, '#2E2834', 0.8) + F(`M${f(hx - 3.6)},${f(hy - 0.6)}L${f(hx + 1)},${f(hy - 13)}Q${f(hx + 4)},${f(hy - 15)} ${f(hx + 6)},${f(hy - 12)}Q${f(hx + 2.6)},${f(hy - 11)} ${f(hx + 3.6)},${f(hy - 0.8)}Z`, '#3A3242', 0.8) + L(`M${f(hx - 3)},${f(hy - 2.4)}Q${f(hx)},${f(hy - 1.4)} ${f(hx + 3.4)},${f(hy - 2.6)}`, 1, '#7A5A2A');
    const [kx, ky] = t.p(-0.36, 0.22, 9);
    s += F(`M${f(kx - 3.6)},${f(ky)}C${f(kx - 4)},${f(ky - 6)} ${f(kx + 4)},${f(ky - 6)} ${f(kx + 3.6)},${f(ky)}L${f(kx + 2)},${f(ky + 2.6)}H${f(kx - 2)}Z`, BONE, 0.7) + F(ell(kx - 1.4, ky - 1.4, 1.1, 1.3), '#1E1810') + F(ell(kx + 1.4, ky - 1.4, 1.1, 1.3), '#1E1810');
    return s;
  });
}

function cauldronBubbles(): ArtAsset {
  const W = 56;
  const H = 46;
  return asset('fx_cauldron_bubbles', W, H, 0.5, 1, (d) => {
    const r = rnd(47);
    let s = '';
    // purple-green fumes curling up
    for (let k = 0; k < 4; k++) {
      const y = H - 10 - k * 8;
      const x = W / 2 + Math.sin(k * 1.7) * 6;
      s += F(blob(x, y, 5 + k * 1.6, 3.6 + k, 470 + k, 7, 0.45), k % 2 ? '#7E8A5A' : '#8A7A92', 0, `opacity="${f(0.55 - k * 0.1)}" filter="${d.blur(1.2)}"`);
    }
    // bubbles on the far half of the surface
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + r() * Math.PI;
      const x = W / 2 + Math.cos(a) * 15 * r();
      const y = H - 1 + Math.sin(a) * 8 * r();
      const rr = 1 + r() * 1.8;
      s += P(ell(x, y, rr * 1.15, rr * 0.85), '#A4462A', 0.4, '#3E140C') + dot(x - rr * 0.35, y - rr * 0.3, rr * 0.3, '#F0B080');
    }
    // one big bubble bursting into a splash
    s += L(ell(W / 2 - 5, H - 4, 3.4, 2), 0.6, '#C0603A') + dot(W / 2 - 9, H - 12, 0.9, '#8A2E1A') + dot(W / 2 - 2, H - 14, 0.7, '#8A2E1A') + dot(W / 2 + 1, H - 9, 0.6, '#8A2E1A');
    return s;
  });
}

// ---------------------------------------------------------------- brick pizza kiln (Wood-Fired Rot)
const KILN_TOP = 70;
function kiln(): ArtAsset {
  return objAsset('kiln', hFor(90), (d, t) => {
    const X = t.cx;
    let s = shadow(d, t, -0.48, 0.48, -0.48, 0.5, 0.3);
    // brick plinth with a log store under an arch
    const B: Box = [-0.44, 0.44, -0.44, 0.44, 0, 30];
    s += box(d, t, B, tone('#86462A', 0.12, 0.34));
    const fc = faces(t, [B[0], B[1], B[2], B[3]], [B[0], B[1], B[2], B[3]], 0, 30);
    const FWd = 0.88 * 48;
    let fr = brickFace(FWd, 30, 51, BRICKS);
    const arch = `M8,30V18C8,8 ${f(FWd - 8)},8 ${f(FWd - 8)},18V30Z`;
    fr += F(arch, '#1E1610', 0.8);
    for (let k = 0; k < 7; k++) {
      const x = 11 + (k % 4) * 6.4 + (k > 3 ? 3 : 0);
      const y = 27 - Math.floor(k / 4) * 5;
      fr += F(ell(x, y, 3, 2.6), k % 2 ? '#8E6A40' : '#7A5A36', 0.6) + F(ell(x, y, 1.6, 1.4), '#C9A877', 0.3) + dot(x, y, 0.4, '#6A4A2A');
    }
    fr += L(`M7,18C7,6.6 ${f(FWd - 7)},6.6 ${f(FWd - 7)},18`, 2, '#B0603A') + L(`M7,18C7,6.6 ${f(FWd - 7)},6.6 ${f(FWd - 7)},18`, 0.5, INK);
    fr += F(`M0,22H${f(FWd)}V30H0Z`, d.linear(0, 30, 0, 20, [[0, PAL.grimeD, 0.6], [1, PAL.grimeD, 0]]));
    s += d.clip(fc.front, onFront(t, B[0], B[3], 30, fr));
    s += d.clip(fc.side, onSide(t, B[1], B[3], 30, brickFace(FWd, 30, 52, BRICKS.map((c) => dk(c, 0.22))) + F(`M0,22H${f(FWd)}V30H0Z`, d.linear(0, 30, 0, 20, [[0, PAL.grimeD, 0.6], [1, PAL.grimeD, 0]]))));
    s += F(fc.sil, 'none', LW);
    // hearth slab
    s += box(d, t, [-0.47, 0.47, -0.47, 0.47, 30, 33], tone('#A8A294', 0.12, 0.3), { sw: 1.1, grad: 0 });
    // the dome
    const base = disc(t, 0, -0.02, 33, 0.4);
    const DH = 36;
    const dome = `M${f(base.cx - base.rx)},${f(base.cy)}C${f(base.cx - base.rx)},${f(base.cy - DH * 0.9)} ${f(base.cx - base.rx * 0.45)},${f(base.cy - DH * 1.25)} ${f(base.cx)},${f(base.cy - DH * 1.25)}C${f(base.cx + base.rx * 0.45)},${f(base.cy - DH * 1.25)} ${f(base.cx + base.rx)},${f(base.cy - DH * 0.9)} ${f(base.cx + base.rx)},${f(base.cy)}A${f(base.rx)},${f(base.ry)} 0 0 1 ${f(base.cx - base.rx)},${f(base.cy)}Z`;
    s += F(dome, d.radial(base.cx - 10, base.cy - DH, base.rx * 1.6, [[0, '#B88A6A'], [0.55, '#9A6A4A'], [1, '#5E3A26']]));
    let dt = '';
    for (let k = 1; k < 7; k++) {
      const yy = base.cy - k * 5.6;
      const w = base.rx * Math.sqrt(Math.max(0, 1 - Math.pow((k * 5.6) / (DH * 1.05), 2)));
      dt += L(`M${f(base.cx - w)},${f(yy)}Q${f(base.cx)},${f(yy + base.ry * (w / base.rx) * 0.9)} ${f(base.cx + w)},${f(yy)}`, 0.5, '#5E3A26', 'opacity="0.7"');
    }
    dt += speckle(d, dome, [base.cx - base.rx, base.cy - DH * 1.3, base.rx * 2, DH * 1.6], 40, ['#5E3A26', '#D0A07A'], 53, 0.3, 0.7, 0.6);
    dt += F(blob(base.cx + 6, base.cy - DH * 0.95, 14, 6, 54), '#141210', 0, 'opacity="0.35"'); // soot
    dt += F(blob(base.cx + base.rx * 0.6, base.cy - 8, 6, 9, 55), '#2A2016', 0, 'opacity="0.3"');
    s += d.clip(dome, dt) + L(dome, LW);
    // the mouth: a brick-edged arch on the sw face, a dark oven with a pizza inside
    let m = '';
    const MW = 17;
    const mouth = `M0,13V6C0,-1.6 ${f(MW)},-1.6 ${f(MW)},6V13Z`;
    m += F(mouth, '#120C08', 0.9);
    m += d.clip(mouth, F(ell(MW / 2, 11, 7, 3), '#E07A2A', 0, `opacity="0.6" filter="${d.blur(1.6)}"`) + F(ell(MW / 2, 11.4, 5.6, 1.6), '#C8963E', 0.4) + dot(MW / 2 - 2, 11.2, 0.7, '#7A2A22') + dot(MW / 2 + 1.6, 11.6, 0.7, '#7A2A22') + dot(MW / 2, 11, 0.5, '#E6DCC0'));
    m += L(`M-1.6,13V6C-1.6,-3.6 ${f(MW + 1.6)},-3.6 ${f(MW + 1.6)},6V13`, 2.8, INK) + L(`M-1.6,13V6C-1.6,-3.6 ${f(MW + 1.6)},-3.6 ${f(MW + 1.6)},6V13`, 1.8, '#9A5634');
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k / 6) * Math.PI;
      m += L(`M${f(MW / 2 + Math.cos(a) * 8.6)},${f(6 + Math.sin(a) * 8.6)}l${f(Math.cos(a) * 1.8)},${f(Math.sin(a) * 1.8)}`, 0.5, INK);
    }
    s += onFront(t, -0.18, 0.37, 48, m);
    // stovepipe chimney at the back with a rain cap
    const ch = cyl(d, t, 0.06, -0.16, 0.06, 60, KILN_TOP + 14, tone('#4A4640', 0.12, 0.35), 1);
    s += ch.svg + d.clip(ch.body, F(blob(ch.top.cx + 1, ch.top.cy + 10, 2, 4, 56), RUST, 0, 'opacity="0.6"'));
    s += F(`M${f(ch.top.cx - 6)},${f(ch.top.cy - 2)}L${f(ch.top.cx)},${f(ch.top.cy - 6)}L${f(ch.top.cx + 6)},${f(ch.top.cy - 2)}Z`, '#3A3631', 0.8);
    // a pizza peel leaning on the plinth, a rat on the hearth
    const [px, py] = t.p(0.46, 0.2, 2);
    s += L(`M${f(px)},${f(py)}L${f(px + 7)},${f(py - 34)}`, 2.6, INK) + L(`M${f(px)},${f(py)}L${f(px + 7)},${f(py - 34)}`, 1.6, '#9A7046');
    s += F(`M${f(px + 4)},${f(py - 28)}C${f(px)},${f(py - 34)} ${f(px + 4)},${f(py - 48)} ${f(px + 11)},${f(py - 46)}C${f(px + 17)},${f(py - 44)} ${f(px + 14)},${f(py - 31)} ${f(px + 9)},${f(py - 27)}Z`, '#B08A5A', 0.9) + F(blob(px + 9, py - 38, 3, 2, 57), '#2A2016', 0, 'opacity="0.4"');
    const [rx, ry] = t.p(-0.3, 0.42, 33);
    s += F(ell(rx, ry - 2, 3.6, 2.2), '#5E5650', 0.6) + F(ell(rx - 3.4, ry - 3, 1.8, 1.4), '#6E6660', 0.5) + dot(rx - 4.2, ry - 3.4, 0.4, INK) + L(`M${f(rx + 3.4)},${f(ry - 2)}q3,1 4,-2`, 0.6, '#B08A86');
    void X;
    return s;
  });
}

function kilnFire(): ArtAsset {
  const W = 56;
  const H = 52;
  return asset('fx_kiln_fire', W, H, 0.5, 1, (d) => {
    // flames and sparks out of the chimney (which stands 0.22 tile right of centre, ~16 units above this anchor)
    const cx = W / 2 + 10.6;
    const cy = H - 15;
    const r = rnd(58);
    let s = F(ell(cx, cy - 2, 6, 4), '#E07A2E', 0, `opacity="0.5" filter="${d.blur(2)}"`);
    s += flame(cx - 2, cy, 11, 2.4, -2) + flame(cx + 1.6, cy, 14, 2.6, 1.5) + flame(cx, cy, 8, 1.8, 0);
    for (let k = 0; k < 8; k++) s += dot(cx + (r() - 0.5) * 16, cy - 14 - r() * 20, 0.4 + r() * 0.5, k % 2 ? '#EBC452' : '#DE8A32', 0.9);
    s += F(blob(cx + 4, cy - 30, 6, 4, 59), '#5A5650', 0, `opacity="0.4" filter="${d.blur(1.2)}"`);
    return s;
  });
}

// ---------------------------------------------------------------- pit oven (Feast of the Dead)
const PIT_TOP = 14;
function pitOven(): ArtAsset {
  return objAsset('pit_oven', hFor(44), (d, t) => {
    const X = t.cx;
    let s = shadowDisc(d, t, 0, 0, 0.5, 0.3);
    // dirt mound
    s += F(t.ell(0, 0, 0.5, 0.48, 0), '#5E4A30', 0.8) + F(t.ell(0, 0, 0.44, 0.42, 4), '#6E5636', 0);
    s += speckle(d, t.ell(0, 0, 0.5, 0.48, 0), [X - 50, t.cy - 30, 100, 60], 40, ['#4A3820', '#8A7048'], 61, 0.3, 0.7, 0.8);
    // the pit: a stone ring round glowing coals and a leaf-wrapped beast on the grate
    const pit = disc(t, 0, 0, PIT_TOP - 4, 0.3);
    s += F(pit.d, '#1E140C', 0.8) + d.clip(pit.d, embers(d, pit.cx, pit.cy + 1, pit.rx * 0.9, pit.ry * 0.8, 62, 18));
    // corrugated tin lid propped up at the back
    const lid = [t.p(-0.36, -0.3, PIT_TOP), t.p(0.36, -0.3, PIT_TOP), t.p(0.36, -0.5, PIT_TOP + 26), t.p(-0.36, -0.5, PIT_TOP + 26)];
    const lidD = poly(lid);
    s += F(lidD, d.linear(lid[0][0], 0, lid[1][0], 0, [[0, '#8A8C86'], [0.5, '#6E706A'], [1, '#4E504A']]), LW);
    let cor = '';
    for (let k = 1; k < 9; k++) {
      const u = -0.36 + k * 0.08;
      cor += L(seg(t, [u, -0.3, PIT_TOP], [u, -0.5, PIT_TOP + 26]), 0.6, '#3A3C38', 'opacity="0.7"');
    }
    cor += F(blob(...t.p(0.1, -0.4, PIT_TOP + 14), 6, 4, 63), RUST, 0, 'opacity="0.6"') + F(blob(...t.p(-0.2, -0.45, PIT_TOP + 20), 4, 3, 64), RUST_D, 0, 'opacity="0.5"');
    s += d.clip(lidD, cor) + F(lidD, 'none', LW);
    s += L(seg(t, [0.32, -0.3, PIT_TOP], [0.3, -0.42, PIT_TOP + 18]), 1.6, INK) + L(seg(t, [0.32, -0.3, PIT_TOP], [0.3, -0.42, PIT_TOP + 18]), 0.9, '#8E6A40');
    // grate
    let gr = '';
    for (let k = -3; k <= 3; k++) gr += L(seg(t, [-0.26, k * 0.07, PIT_TOP - 2], [0.26, k * 0.07, PIT_TOP - 2]), 1, '#1A1814') + L(seg(t, [-0.26, k * 0.07, PIT_TOP - 1.6], [0.26, k * 0.07, PIT_TOP - 1.6]), 0.4, '#8A867A');
    s += d.clip(pit.d, gr);
    // the parcel: banana-leaf bundle tied with twine, a trotter sticking out
    const [bx, by] = t.p(0.02, 0.02, PIT_TOP + 2);
    const parcel = `M${f(bx - 16)},${f(by + 1)}C${f(bx - 17)},${f(by - 9)} ${f(bx + 15)},${f(by - 11)} ${f(bx + 16)},${f(by - 1)}C${f(bx + 15)},${f(by + 6)} ${f(bx - 15)},${f(by + 8)} ${f(bx - 16)},${f(by + 1)}Z`;
    s += F(parcel, d.linear(bx - 16, by - 8, bx + 10, by + 6, [[0, '#7A8A3A'], [1, '#3E4E1E']]), LW);
    s += d.clip(parcel, L(`M${f(bx - 12)},${f(by - 6)}L${f(bx - 4)},${f(by + 6)}M${f(bx - 2)},${f(by - 8)}L${f(bx + 6)},${f(by + 5)}M${f(bx + 8)},${f(by - 7)}L${f(bx + 14)},${f(by + 2)}`, 0.5, '#2E3A14') + F(blob(bx + 4, by - 2, 8, 3, 65), '#2A2016', 0, 'opacity="0.4"'));
    s += L(`M${f(bx - 5)},${f(by - 8)}Q${f(bx - 7)},${f(by)} ${f(bx - 4)},${f(by + 6)}M${f(bx + 6)},${f(by - 8)}Q${f(bx + 4)},${f(by)} ${f(bx + 7)},${f(by + 5)}`, 0.9, '#C9B080');
    s += F(capsule([bx + 14, by - 2], [bx + 22, by - 7], 3, 2.4), '#C8A08A', 0.7) + F(`M${f(bx + 21)},${f(by - 9.4)}l3,0.6l-0.6,3l-3,-0.4Z`, '#3A2A22', 0.5);
    // stones round the rim
    const r = rnd(66);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + 0.1;
      if (Math.sin(a) < -0.5 && k % 2) continue;
      const [x, y] = t.p(Math.cos(a) * 0.36, Math.sin(a) * 0.36, PIT_TOP - 4);
      s += F(blob(x, y - 2, 5 + r() * 1.5, 3 + r(), 670 + k, 7, 0.35), ['#8A847A', '#6E6860', '#9A948A'][k % 3], 0.7);
    }
    // a shovel stuck in the dirt
    const [sx, sy] = t.p(0.46, -0.12, 2);
    s += L(`M${f(sx)},${f(sy)}L${f(sx + 3)},${f(sy - 34)}`, 2.6, INK) + L(`M${f(sx)},${f(sy)}L${f(sx + 3)},${f(sy - 34)}`, 1.6, '#8E6A40');
    s += F(`M${f(sx - 4)},${f(sy - 34)}h${f(14)}v3h-14Z`, '#3A3631', 0.6);
    s += F(`M${f(sx - 3.6)},${f(sy + 2)}L${f(sx + 4)},${f(sy + 2)}L${f(sx + 3)},${f(sy - 8)}L${f(sx - 3)},${f(sy - 8)}Z`, '#7A7C76', 0.8);
    return s;
  });
}

function pitEmbers(): ArtAsset {
  const W = 64;
  const H = 48;
  return asset('fx_pit_embers', W, H, 0.5, 1, (d) => {
    const r = rnd(68);
    let s = F(ell(W / 2, H - 4, 22, 6), '#E07A2E', 0, `opacity="0.35" filter="${d.blur(2.4)}"`);
    // heat shimmer + smoke wisps + rising sparks
    for (let k = 0; k < 4; k++) s += L(`M${f(W / 2 - 16 + k * 10)},${f(H - 6)}q-3,-6 0,-12t0,-12`, 0.8, '#E8D0A0', `opacity="${f(0.35 - k * 0.05)}"`);
    s += F(blob(W / 2 - 4, H - 30, 9, 5, 69), '#6A665E', 0, `opacity="0.4" filter="${d.blur(1.4)}"`) + F(blob(W / 2 + 6, H - 40, 7, 4, 70), '#7A766E', 0, `opacity="0.3" filter="${d.blur(1.4)}"`);
    for (let k = 0; k < 12; k++) s += dot(W / 2 + (r() - 0.5) * 40, H - 6 - r() * 36, 0.4 + r() * 0.6, k % 3 ? '#EBC452' : '#DE6A2A', 0.95);
    return s;
  });
}

// ---------------------------------------------------------------- tomb smoker (Graveyard Grill)
const TOMB_TOP = 84;
function tombSmoker(): ArtAsset {
  return objAsset('tomb_smoker', hFor(96, 0.5), (d, t) => {
    let s = shadow(d, t, -0.46, 0.46, -0.46, 0.48, 0.32);
    const stone = tone('#8A887E', 0.12, 0.34);
    // the headstone chimney at the back (drawn first: it stands behind the sarcophagus)
    const hs: Box = [-0.44, -0.02, -0.44, -0.32, 30, 76];
    s += box(d, t, hs, stone);
    const hf = faces(t, [hs[0], hs[1], hs[2], hs[3]], [hs[0], hs[1], hs[2], hs[3]], hs[4], hs[5]);
    // rounded top
    const [ax, ay] = t.p(hs[0], hs[3], 76);
    const [bx, by] = t.p(hs[1], hs[3], 76);
    const crown = `M${f(ax)},${f(ay)}C${f(ax)},${f(ay - 14)} ${f(bx)},${f(by - 14)} ${f(bx)},${f(by)}Z`;
    s += F(crown, stone.front, LW);
    const [cx2, cy2] = t.p(hs[1], hs[2], 76);
    s += F(`M${f(bx)},${f(by)}C${f(bx + 0.4)},${f(by - 6)} ${f(cx2 - 1)},${f(cy2 - 6)} ${f(cx2)},${f(cy2)}Z`, stone.side, 0.8);
    let ht = speckle(d, hf.front, [ax - 4, ay - 16, 60, 60], 30, ['#6A685E', '#B0AEA2'], 71, 0.3, 0.7, 0.7);
    ht += F(blob(...t.p(-0.1, hs[3], 40), 8, 4, 72), '#5E7A2A', 0, 'opacity="0.45"');
    s += d.clip(hf.front, ht);
    // carved skull + crossed bones on the stone (no lettering, so it mirrors cleanly)
    const HSW = 0.48 * 48;
    let carve = F(`M${f(HSW / 2 - 4.4)},12C${f(HSW / 2 - 5)},4 ${f(HSW / 2 + 5)},4 ${f(HSW / 2 + 4.4)},12L${f(HSW / 2 + 2.4)},15H${f(HSW / 2 - 2.4)}Z`, '#6E6C62', 0.6);
    carve += F(ell(HSW / 2 - 1.8, 10.4, 1.3, 1.5), '#3A3832') + F(ell(HSW / 2 + 1.8, 10.4, 1.3, 1.5), '#3A3832');
    carve += L(`M${f(HSW / 2 - 7)},18L${f(HSW / 2 + 7)},24M${f(HSW / 2 + 7)},18L${f(HSW / 2 - 7)},24`, 1.4, '#6E6C62') + L(`M${f(HSW / 2 - 7)},18L${f(HSW / 2 + 7)},24M${f(HSW / 2 + 7)},18L${f(HSW / 2 - 7)},24`, 0.5, INK, 'opacity="0.6"');
    s += onFront(t, hs[0], hs[3], 70, carve);
    s += crack(...t.p(-0.1, hs[3], 60), 1.8, 10, 73, 0.5, '#4A4840', 1);
    // iron flue out of the top of the headstone
    const fl = cyl(d, t, -0.23, -0.38, 0.05, 74, TOMB_TOP + 2, tone('#3A3631', 0.12, 0.35), 0.9);
    s += fl.svg + F(ell(fl.top.cx, fl.top.cy, fl.top.rx * 1.5, fl.top.ry * 1.5), '#2A2622', 0.8) + F(ell(fl.top.cx, fl.top.cy, fl.top.rx, fl.top.ry), '#141210');
    // the sarcophagus firebox
    const SB: Box = [-0.44, 0.44, -0.3, 0.44, 0, 32];
    s += box(d, t, SB, stone);
    const sf = faces(t, [SB[0], SB[1], SB[2], SB[3]], [SB[0], SB[1], SB[2], SB[3]], 0, 32);
    const fl0 = t.p(SB[0], SB[3], 0);
    let tex = speckle(d, sf.front, [fl0[0] - 4, fl0[1] - 60, 110, 70], 60, ['#6A685E', '#B0AEA2', '#5E5A50'], 74, 0.3, 0.8, 0.7);
    tex += F(sf.front, d.linear(0, fl0[1], 0, fl0[1] - 26, [[0, PAL.grimeD, 0.55], [1, PAL.grimeD, 0]]));
    tex += F(blob(fl0[0] + 8, fl0[1] - 4, 10, 4, 75), '#5E7A2A', 0, 'opacity="0.5"') + F(blob(...t.p(SB[1], 0.1, 3), 10, 4, 76), '#4E6A22', 0, 'opacity="0.45"');
    s += d.clip(sf.front, tex) + d.clip(sf.side, speckle(d, sf.side, [fl0[0] + 30, fl0[1] - 70, 60, 70], 40, ['#5E5C54', '#9A988E'], 77, 0.3, 0.8, 0.7));
    s += crack(...t.p(SB[1], 0.2, 28), 1.9, 14, 78, 0.55, '#4A4840', 1) + crack(...t.p(-0.2, SB[3], 30), 1.7, 9, 79, 0.5, '#4A4840', 0);
    // coffin-shaped iron door with a glowing grate
    const FWd = (SB[1] - SB[0]) * 48;
    const door = `M${f(FWd / 2 - 6)},4L${f(FWd / 2 + 6)},4L${f(FWd / 2 + 9)},11L${f(FWd / 2 + 6)},27L${f(FWd / 2 - 6)},27L${f(FWd / 2 - 9)},11Z`;
    let dr = F(door, '#2E2B26', 0.9) + L(door, 0.5, '#5A564C', 'transform="translate(0.6 0.6)" opacity="0.6"');
    dr += F(rrect(FWd / 2 - 4, 8, 8, 6, 0.6), '#1A120C', 0.5) + F(rrect(FWd / 2 - 3.4, 9, 6.8, 4, 0.4), '#D0602A', 0, `filter="${d.blur(0.6)}"`);
    for (let k = 0; k < 4; k++) dr += L(`M${f(FWd / 2 - 3.4 + k * 2.2)},8V14`, 0.7, INK);
    dr += L(`M${f(FWd / 2 + 3)},20h4`, 1.6, '#7F8584') + dot(FWd / 2 - 4, 6, 0.5, '#7F8584') + dot(FWd / 2 + 4, 6, 0.5, '#7F8584') + dot(FWd / 2 - 4, 25, 0.5, '#7F8584') + dot(FWd / 2 + 4, 25, 0.5, '#7F8584');
    dr += F(blob(FWd / 2 + 7, 20, 2, 3, 80), RUST, 0, 'opacity="0.6"');
    s += onFront(t, SB[0], SB[3], 32, dr);
    // heavy lid, shoved a little askew, with a green glow leaking out of the gap
    const LB: Box = [-0.47, 0.41, -0.33, 0.47, 32, 38];
    s += F(t.qd(-0.44, 0.44, -0.3, 0.44, 32.4), '#9BD62E', 0, `opacity="0.7" filter="${d.blur(1.6)}"`);
    s += box(d, t, LB, tone('#9A988E', 0.14, 0.34), { sw: LW, grad: 0 });
    const lt0 = t.qd(LB[0], LB[1], LB[2], LB[3], 38);
    s += d.clip(lt0, speckle(d, lt0, [t.cx - 50, t.cy - 70, 100, 60], 40, ['#6A685E', '#C0BEB2'], 81, 0.3, 0.8, 0.7) + F(blob(...t.p(0.1, 0.1, 38), 12, 5, 82), '#2A2016', 0, 'opacity="0.25"'));
    // a skeletal hand reaching out from under the lid
    const [hx, hy] = t.p(0.05, 0.45, 33);
    s += bone(t.p(0.02, 0.46, 33.5), [hx + 1, hy + 9], 1.3) + bone([hx + 1, hy + 9], [hx - 2, hy + 14], 0.9) + bone([hx + 1, hy + 9], [hx + 1.5, hy + 15], 0.9) + bone([hx + 1, hy + 9], [hx + 4, hy + 14], 0.9);
    return s;
  });
}

function tombSmoke(): ArtAsset {
  const W = 60;
  const H = 64;
  return asset('fx_tomb_smoke', W, H, 0.5, 1, (d) => {
    // ghostly green smoke out of the flue (at i -0.23, j -0.38: ~7 px right of and ~18 above the anchor)
    const cx = W / 2 + 7.2;
    const cy = H - 20;
    let s = '';
    for (let k = 4; k >= 0; k--) {
      const y = cy - k * 9;
      const x = cx + Math.sin(k * 1.3) * 4 - k * 2.2;
      const rr = 3.4 + k * 1.8;
      s += P(blob(x, y, rr * 1.25, rr, 840 + k, 7, 0.45), k % 2 ? '#8AB860' : '#A6CC7A', 0.5, '#3E5A26', `opacity="${f(0.85 - k * 0.13)}"`);
    }
    // a little ghost face in the biggest puff
    s += dot(cx - 9.6, cy - 36, 1, '#2A3A1A', 0.8) + dot(cx - 5.6, cy - 36.4, 1, '#2A3A1A', 0.8) + F(ell(cx - 7.6, cy - 32.4, 1.4, 2), '#2A3A1A', 0, 'opacity="0.7"');
    s += F(ell(cx, cy, 4, 2), '#9BD62E', 0, `opacity="0.5" filter="${d.blur(1.4)}"`);
    return s;
  });
}

// ---------------------------------------------------------------- the Magic Fridge
function fridgeMagic(): ArtAsset {
  const body = '#3E3448';
  return fridge('fridge_magic', tone(body, 0.12, 0.34, 0.04), (d, t, fc) => {
    let fr = fridgeDoors(lt(body, 0.06), '#B8963E');
    // glowing runes + a sigil circle across both doors
    const rune = 'M8,8l3,4l-3,4M14,9h4M16,7v6M24,8l2,5l2,-5M31,9l3,3l-3,3M8,34l4,3M10,32v6M20,33a3,3 0 1 0 0.1,0M28,32l3,6l3,-6M10,60h5M12.5,57v6M24,58l4,4M28,58l-4,4';
    fr += `<g filter="${d.blur(1.2)}" opacity="0.8">${L(rune, 1.4, '#9BD62E')}</g>` + L(rune, 0.6, '#E6FA9A');
    fr += L(ell(FW / 2, 46, 8, 8), 0.7, '#B88AD8', 'opacity="0.8"') + L(`M${f(FW / 2)},38L${f(FW / 2 + 6.4)},50.8L${f(FW / 2 - 7.6)},43L${f(FW / 2 + 7.6)},43L${f(FW / 2 - 6.4)},50.8Z`, 0.6, '#B88AD8', 'opacity="0.8"');
    // an eye peeking out of the door gap
    fr += F(ell(FW / 2 + 4, 25.6, 4, 1.3), '#141210') + F(ell(FW / 2 + 4, 25.6, 2.6, 0.9), '#DECC54') + dot(FW / 2 + 4.4, 25.6, 0.5, INK);
    let front = onFront(t, FB[0], FB[3], FB[5], fr);
    const fl = t.p(FB[0], FB[3], 4);
    front += d.clip(fc.front, F(fc.front, d.linear(0, fl[1], 0, fl[1] - 40, [[0, '#9BD62E', 0.25], [1, '#9BD62E', 0]])) + scratches(fl[0], fl[1] - 70, 40, 60, 6, 9, '#8A7A9A', 0.35, 4));
    // chains + padlock across the front
    let ch = '';
    for (let k = 0; k < 9; k++) ch += L(ell(3 + k * 4.4, 30 + k * 0.6, 2.2, 1.3), 1.1, INK) + L(ell(3 + k * 4.4, 30 + k * 0.6, 2.2, 1.3), 0.6, '#9A9C96');
    ch += F(rrect(FW / 2 - 4, 31, 8, 7, 1.2), '#B8963E', 0.7) + L(`M${f(FW / 2 - 2.4)},31v-2.4a2.4,2.4 0 0 1 4.8,0V31`, 1, INK) + dot(FW / 2, 34.6, 0.7, INK);
    front += onFront(t, FB[0], FB[3], FB[5], ch);
    // purple frost dripping from under the door, a candle on top
    let after = d.clip(fc.side, F(fc.side, d.linear(...t.p(FB[1], 0, 84), ...t.p(FB[1], 0, 0), [[0, '#000', 0], [1, '#000', 0.25]])));
    after += onFront(t, FB[0], FB[3], 4, F('M6,0q0,4 1,6q1,1 1.6,-0.6q0,-3 0.4,-5.4ZM26,0q0,3 0.8,4.4q1,1 1.4,-0.6q0,-2 0.2,-3.8Z', '#8A6AAA', 0.4));
    const [cx, cy] = t.p(0.1, -0.05, 84);
    after += F(`M${f(cx - 2)},${f(cy)}V${f(cy - 8)}H${f(cx + 2)}V${f(cy)}Z`, '#D8D2BC', 0.7) + F(`M${f(cx - 2)},${f(cy - 8)}q1,2 0.6,4q-0.6,-1 -0.6,-4Z`, '#D8D2BC', 0.4);
    after += F(ell(cx, cy - 10.4, 1.2, 2.2), '#9BD62E', 0.3) + F(ell(cx, cy - 10, 3, 4), '#9BD62E', 0, `opacity="0.4" filter="${d.blur(1.2)}"`);
    return { front, after };
  });
}

// ================================================================ export
export const KITCHEN_META = {
  /** Cooking-surface height per station: overlays (anchor .5/1) go at (tileCenterX, tileCenterY - stoveTopZ). */
  stoveTopZ: { stove_dirty: 36.5, stove_plain: 36.5, stove_steel: 36.5, stove_super: 36.5, grill: 36, smoker: 56, fryer: OIL_Z, witch_cauldron: CAUL_TOP, kiln: KILN_TOP, pit_oven: PIT_TOP, tomb_smoker: TOMB_TOP } as Record<string, number>,
  counterTopZ: { counter_plain: 36, counter_steel: 36, counter_bar: 38 } as Record<string, number>,
  sinkTopZ: { sink_dirty: 36, sink_plain: 36, sink_steel: 36 } as Record<string, number>,
  /** Overlays and which stations they belong on. */
  overlays: { fx_steam_1: 'any', fx_steam_2: 'any', fx_steam_3: 'any', grill_flames: 'grill', fryer_bubbles: 'fryer', pot_burnt: 'stove', fx_cauldron_bubbles: 'cauldron', fx_kiln_fire: 'kiln', fx_pit_embers: 'pit', fx_tomb_smoke: 'tomb' } as Record<string, string>,
  /** The cooking overlay the scene shows on each station kind while it cooks. */
  stationFx: { stove: 'fx_steam_1', smoker: 'fx_steam_1', grill: 'grill_flames', fryer: 'fryer_bubbles', cauldron: 'fx_cauldron_bubbles', kiln: 'fx_kiln_fire', pit: 'fx_pit_embers', tomb: 'fx_tomb_smoke' } as Record<string, string>,
};

export const KITCHEN_KEYS = [
  'stove_dirty', 'stove_plain', 'stove_steel', 'stove_super', 'grill', 'smoker', 'fryer',
  'fx_steam_1', 'fx_steam_2', 'fx_steam_3', 'grill_flames', 'fryer_bubbles', 'pot_burnt',
  'counter_plain', 'counter_steel', 'counter_bar',
  'sink_dirty', 'sink_plain', 'sink_steel', 'trash_red', 'trash_green',
  'fridge_dirty', 'fridge_plain', 'fridge_steel', 'keg_toxic',
  'witch_cauldron', 'kiln', 'pit_oven', 'tomb_smoker', 'fx_cauldron_bubbles', 'fx_kiln_fire', 'fx_pit_embers', 'fx_tomb_smoke', 'fridge_magic',
] as const;

export function buildKitchen(): ArtAsset[] {
  // sink tops are the original's blue (#6688AA / #7799AA)
  const cabEnamel: CabOpt = { body: tone(ENAMEL, 0.08, 0.32), top: tone('#6688AA', 0.05), edge: tone(CHROME, 0.1, 0.38), kick: '#2E2B26', topZ: 36 };
  const cabCream: CabOpt = { body: tone('#7E8A6A', 0.12, 0.32), top: tone('#7799AA', 0.05), edge: tone(CHROME, 0.1, 0.38), kick: '#2E2B26', topZ: 36 };
  return [
    stoveDirty(), stovePlain(), stoveSteel(), stoveSuper(), grill(), smoker(), fryer(),
    steam(1), steam(2), steam(3), grillFlames(), fryerBubbles(), potBurnt(),
    counterPlain(), counterSteel(), counterBar(),
    sink({ key: 'sink_dirty', cab: cabEnamel, front: doors2(dk(ENAMEL, 0.04), CHROME_D), basin: '#B8B09A', dirty: true }),
    sink({ key: 'sink_plain', cab: cabCream, front: doors2('#8A9474', CHROME), basin: '#D9D6CB' }),
    sink({ key: 'sink_steel', cab: { body: STEEL, top: STEEL, edge: STEEL, kick: '#2E2B26', topZ: 36 }, front: doors2('#A9ACA6', CHROME), basin: '#A4A7A0', steel: true }),
    bin('trash_red', '#8A3A2E'), bin('trash_green', '#4F6A3A'),
    fridgeDirty(), fridgePlain(), fridgeSteel(), kegToxic(),
    witchCauldron(), kiln(), pitOven(), tombSmoker(), cauldronBubbles(), kilnFire(), pitEmbers(), tombSmoke(), fridgeMagic(),
  ];
}

