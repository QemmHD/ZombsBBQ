/**
 * Money-makers (1x1, OBJ_W wide, anchor = tile centre, facing sw; the player/customer stands on the sw tile).
 * Each is a real machine with one gross joke. Machines with lettering also ship `<key>_se`, a copy for the se
 * facing whose text still reads (use it instead of mirroring): vending, atm, arcade, slot_machine, pinball,
 * phonebooth, comic_rack. jukebox and foosball have no text and mirror cleanly.
 */
import type { ArtAsset } from '../art/types';
import type { Doc } from '../art/svg';
import { capsule, ell, f, poly } from '../art/svg';
import type { Pt } from '../art/svg';
import { F, INK, Iso, L, LW, blob, crack, dot, objAsset, rnd, speckle } from './kit';
import {
  bite,
  box,
  boxShade,
  celH,
  cyl,
  cylBody,
  dk,
  eyeball,
  extrudeStack,
  finger,
  fly,
  fr,
  glow,
  grain,
  grp,
  lettering,
  lt,
  masked,
  objPair,
  rust,
  rustDrip,
  scratches,
  seFace,
  shadow,
  sheen,
  swFace,
  tape,
  textD,
  topFace,
  unflip,
} from './p2kit';

const EYE_Z = '#DECC54';
const SKIN = '#B3B294';
const SKIN_S = '#968E6F';
const SKIN_Z = '#88BB44';
const SKIN_ZS = '#427E40';
const rect = (x0: number, y0: number, x1: number, y1: number) => `M${f(x0)},${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;
const rr = (x0: number, y0: number, x1: number, y1: number, r: number) =>
  `M${f(x0 + r)},${f(y0)}H${f(x1 - r)}Q${f(x1)},${f(y0)} ${f(x1)},${f(y0 + r)}V${f(y1 - r)}Q${f(x1)},${f(y1)} ${f(x1 - r)},${f(y1)}H${f(x0 + r)}Q${f(x0)},${f(y1)} ${f(x0)},${f(y1 - r)}V${f(y0 + r)}Q${f(x0)},${f(y0)} ${f(x0 + r)},${f(y0)}Z`;

/** Grime, scratches and a lit top edge for a machine box. */
function wear(d: Doc, t: Iso, b: ReturnType<typeof box>, i0: number, i1: number, j1: number, z0: number, z1: number, seed: number): string {
  const X = t.cx;
  const Y = t.cy;
  let s = boxShade(d, t, b, i0, i1, j1, z0, z1, 0.4);
  s += speckle(d, b.sil, [X - 50, Y - z1 - 40, 100, z1 + 60], 70, ['#000000', '#FFFFFF'], seed, 0.25, 0.6, 0.18);
  s += scratches(d, b.right, [X - 10, Y - z1 - 20, 60, z1 + 40], 20, '#FFFFFF', seed + 1, 0.25);
  return s;
}

/** A severed human hand, palm down, fingers dangling toward +y. (x, y) = wrist. */
function hand(x: number, y: number, s = 1, skin = SKIN, shade = SKIN_S): string {
  const P = (a: number, b: number): Pt => [x + a * s, y + b * s];
  let o = F(capsule(P(-1, -1), P(0, 2), 4.6 * s, 4.2 * s), shade, 0.8);
  o += F(ell(x - 1.4 * s, y - 2 * s, 2.3 * s, 1.6 * s), '#7A2A22', 0.6) + dot(x - 1.4 * s, y - 2 * s, 0.7 * s, '#E2D6BC');
  o += F(`M${f(P(-3, 1)[0])},${f(P(-3, 1)[1])}C${f(P(-4, 4)[0])},${f(P(-4, 4)[1])} ${f(P(-1, 7)[0])},${f(P(-1, 7)[1])} ${f(P(3, 6)[0])},${f(P(3, 6)[1])}C${f(P(5, 5)[0])},${f(P(5, 5)[1])} ${f(P(5, 2)[0])},${f(P(5, 2)[1])} ${f(P(3, 0)[0])},${f(P(3, 0)[1])}Z`, skin, 0.8);
  const tips: [number, number, number][] = [
    [-2.4, 5.4, 4],
    [-0.6, 6.4, 5],
    [1.4, 6.4, 4.8],
    [3.2, 5.6, 3.6],
  ];
  for (const [a, b, l] of tips) o += F(capsule(P(a, b), P(a - 0.3, b + l), 1.7 * s, 1.4 * s), skin, 0.7) + F(ell(P(a - 0.3, b + l - 0.6)[0], P(a - 0.3, b + l - 0.6)[1], 0.6 * s, 0.5 * s), '#D9D2B8', 0.3);
  o += F(capsule(P(4.4, 2.4), P(6.6, 5), 1.8 * s, 1.5 * s), shade, 0.7);
  return o;
}

// ---------------------------------------------------------------- vending
function vending(): ArtAsset[] {
  return objPair('vending', 148, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    const i0 = -0.35;
    const i1 = 0.35;
    const j1 = 0.22;
    const H = 92;
    let s = shadow(d, t, 0, 0, 0.5, 0.36);
    const b = box(t, i0, i1, -0.22, j1, 0, H, '#7E3634', '#6B2324', '#4A1618');
    s += b.fills;
    // side: a dent, graffiti tag, a rusty foot
    s += d.clip(b.right, grp(F(blob(10, -50, 5, 7, 3), '#3A0E10', 0, 'opacity="0.35"') + L('M4,-40q3,-6 6,-1q2,4 5,-3q2,-4 4,1', 1.1, '#8EAE4A', 'opacity="0.8"') + L('M5,-36l12,-1', 0.6, '#8EAE4A', 'opacity="0.6"'), seFace(t, i1, j1, 0)));
    s += rust(d, b.right, [[X + 30, Y - 4, 3], [X + 40, Y - 30, 2]], 4) + rust(d, b.left, [[X - 30, Y + 4, 2.4]], 5);
    s += wear(d, t, b, i0, i1, j1, 0, H, 7);
    // front face in its own frame: 33.6 wide, y = -z
    const W = (i1 - i0) * 48;
    let o = '';
    // header with lettering
    o += F(rect(1.4, -90, W - 1.4, -81), '#2A1A16', 0.8);
    o += unflip(glow(d, L(textD('SNAX', W / 2, -82.6, 5.4, { anchor: 'middle', gap: 0.4 }), 1.4, '#E8D07A'), 1.2, 0.6) + lettering('SNAX', W / 2, -82.6, 5.4, '#E8D07A', 1, { anchor: 'middle', gap: 0.4 }, 0.5), mir, W / 2);
    // glass window: lit interior, five rows of grim snacks on coils
    const win = rect(2, -78, 23, -33);
    o += F(win, d.linear(0, -78, 0, -33, [[0, '#4A5244'], [1, '#22261E']]), 0.9);
    let rows = '';
    const r = rnd(11);
    const snack = ['#B8963A', '#6E7A3A', '#8A3A2A', '#4A6A7A', '#C9BC92', '#5A4A3A'];
    for (let k = 0; k < 5; k++) {
      const y = -70 + k * 8.4;
      rows += L(`M2,${f(y + 1.2)}H23`, 0.6, '#8E8A80');
      for (let c = 0; c < 5; c++) {
        const x = 3 + c * 4;
        if (k === 2 && c === 3) continue; // an empty slot
        const col = snack[(k * 3 + c) % snack.length];
        rows += F(rect(x, y - 5.6 - r() * 0.8, x + 3.2, y), col, 0.4) + L(`M${f(x + 0.4)},${f(y - 3)}h2.4`, 0.4, lt(col, 0.35));
        rows += L(`M${f(x)},${f(y + 0.4)}l0.8,0.6l0.8,-0.6l0.8,0.6l0.8,-0.6`, 0.3, '#B8B4A8');
      }
    }
    // a rat bar and a jar with an eye floating in it
    rows += F(rect(15, -42.6, 18.2, -36.6), '#6E6660', 0.4) + L('M18.2,-38q1.6,0 1.4,2', 0.4, '#B08A86');
    rows += F(rect(15.2, -55, 18.4, -49), '#7EAE30', 0.4) + eyeball(16.8, -52, 1.2, '#2C6985');
    o += d.clip(win, rows + glow(d, F(rect(2, -78, 23, -74), '#FFF2C0'), 2, 0.4) + F(win, d.linear(0, -78, 0, -33, [[0, '#FFF2C0', 0.08], [1, '#000', 0.25]])));
    // glass: a crack + sheen
    o += d.clip(win, crack(17, -72, 2.2, 16, 4, 0.5, '#E8E4D8', 2) + L('M4,-76L12,-60', 2.4, '#FFFFFF', 'opacity="0.18"') + L('M7,-76L14,-63', 1, '#FFFFFF', 'opacity="0.18"'));
    o += L(win, 0.9);
    // control panel: coin slot, keypad, bill slot, tape
    o += F(rect(24.6, -78, W - 1.8, -33), '#3A2A26', 0.8);
    o += F(rect(26, -75, W - 3.2, -70), '#7EAE30', 0.5) + glow(d, F(rect(26, -75, W - 3.2, -70), '#9BE04A'), 0.8, 0.5);
    for (let k = 0; k < 4; k++) for (let c = 0; c < 2; c++) o += F(rect(26.2 + c * 2.6, -67 + k * 2.6, 28.2 + c * 2.6, -65.2 + k * 2.6), '#B8B4A8', 0.3);
    o += F(rect(27, -54, W - 4, -53), '#111', 0.4) + F(rect(26.6, -48, W - 3.6, -45), '#1A1A16', 0.4) + dot(29.4, -40, 1.1, '#8A2A22');
    o += grp(tape([24, -60], [W - 1, -63], 2.6), '');
    // the pickup flap with a severed hand stuck in it, blood dribbling down
    const flap = rect(3, -29, 22.6, -19);
    o += F(flap, '#141210', 0.9) + F(rect(3, -29, 22.6, -26), '#4A4744', 0.6);
    o += F('M9,-19q-0.6,5 0.2,9q0.6,1.2 1.2,0q0.4,-4 0,-9Z', '#7A2A22', 0, 'opacity="0.8"') + F(blob(10, -18.6, 4, 1.2, 3), '#7A2A22', 0, 'opacity="0.7"');
    o += hand(9, -27.6, 1, SKIN, SKIN_S);
    // kick plate: dents, scuffs, rust
    o += F(rect(1.4, -14, W - 1.4, -2), '#5A1C1E', 0.7) + L('M4,-10l6,0M14,-7l9,0', 0.5, '#2A0A0C') + F(blob(26, -8, 3, 2, 6), '#3A0E10', 0, 'opacity="0.5"');
    o += rustDrip(6, -14, 9) + rustDrip(27, -14, 7);
    s += grp(o, swFace(t, i0, j1, 0));
    s += b.lines;
    s += fly(X - 34, Y - 34, 1) + fly(X - 22, Y - 22, 0.8, false);
    return s;
  });
}

// ---------------------------------------------------------------- atm
function atm(): ArtAsset[] {
  return objPair('atm', 140, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    const i0 = -0.3;
    const i1 = 0.3;
    const j1 = 0.24;
    const H = 82;
    let s = shadow(d, t, 0, 0, 0.44, 0.38);
    const b = box(t, i0, i1, -0.24, j1, 0, H, '#B2AA90', '#A39A80', '#7A725C');
    s += b.fills;
    s += rust(d, b.left, [[X - 28, Y + 6, 3], [X - 6, Y + 14, 2]], 3);
    s += wear(d, t, b, i0, i1, j1, 0, H, 9);
    s += d.clip(b.right, grp(L('M6,-30l4,-14l3,10l4,-12', 1, '#2A2620', 'opacity="0.55"') + F(blob(12, -60, 4, 3, 4), '#7A2A22', 0, 'opacity="0.35"'), seFace(t, i1, j1, 0)));
    const W = (i1 - i0) * 48;
    let o = '';
    // lit header
    o += F(rect(1.6, -80, W - 1.6, -71), '#DAD6C8', 0.8) + glow(d, F(rect(2, -80, W - 2, -71), '#FFF2C0'), 1.6, 0.4);
    o += unflip(lettering('ATM', W / 2, -73, 5.6, '#2C4A6A', 1.3, { anchor: 'middle', gap: 0.4 }, 0), mir, W / 2);
    // recessed screen
    o += F(rect(3, -67, W - 3, -48), '#4A4638', 0.8);
    const scr = rect(5, -65, W - 5, -50);
    o += F(scr, '#16261C', 0.7);
    o += glow(d, F(scr, '#3E7A4A'), 1.6, 0.35);
    o += unflip(L(textD('INSERT', W / 2, -59.5, 3, { anchor: 'middle', gap: 0.3 }), 0.6, '#9BE04A') + L(textD('FINGER', W / 2, -53.5, 3, { anchor: 'middle', gap: 0.3 }), 0.6, '#9BE04A'), mir, W / 2);
    o += d.clip(scr, L('M5,-64.5H22M5,-62H22M5,-58H22M5,-55H22', 0.3, '#000', 'opacity="0.4"') + crack(W - 6, -64, 2.4, 10, 3, 0.4, '#C9D6C8', 1));
    o += grp(tape([W - 8, -68], [W - 1, -62], 2.4), '');
    // keypad ledge
    o += F(rect(4, -45, W - 4, -35), '#5E5848', 0.8);
    for (let k = 0; k < 3; k++) for (let c = 0; c < 4; c++) o += F(rect(6 + c * 4.2, -43.4 + k * 2.8, 9 + c * 4.2, -41.6 + k * 2.8), c === 3 ? ['#8A2A22', '#C9A83A', '#4F6A3A'][k] : '#C9C3A6', 0.3);
    // card slot: somebody's finger jammed in it
    o += F(rect(6, -31, 16, -29), '#141210', 0.6) + glow(d, F(rect(6, -31.4, 16, -30.6), '#9BE04A'), 0.6, 0.6);
    o += finger(11, -30.4, 1.25, 6, 2.4);
    o += F('M11.6,-28q0.2,3 -0.4,5q-0.8,-1 -0.6,-5Z', '#7A2A22', 0, 'opacity="0.8"');
    // cash slot spitting a chewed bill
    o += F(rect(4, -24, W - 4, -21.4), '#141210', 0.6);
    o += F('M8,-22.6L18,-22.6L18.6,-17L15,-18L13,-16L10,-18.4L7.6,-17Z', '#8EA06A', 0.6) + L('M10,-20.6h6', 0.4, '#4F6A3A');
    // pry-bar scars and a kick plate
    o += L('M3,-12l5,-3M4,-9l6,-2.4', 0.6, '#E2DCC6', 'opacity="0.7"') + F(rect(1.4, -6, W - 1.4, -1), '#6E6650', 0.6);
    s += grp(o, swFace(t, i0, j1, 0));
    s += b.lines;
    return s;
  });
}

// ---------------------------------------------------------------- jukebox
function jukebox(): ArtAsset {
  return objAsset('jukebox', 124, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    const i0 = -0.32;
    const jf = 0.2;
    const th = 0.38;
    const Wd = 0.64 * 48;
    let s = shadow(d, t, 0, 0, 0.46, 0.36);
    const shape = `M0,0L0,-48A${f(Wd / 2)},19 0 0 1 ${f(Wd)},-48L${f(Wd)},0Z`;
    // extruded walnut body
    s += extrudeStack(t, shape, i0, jf, 0, th, '#6E4626', '#4E3220');
    let o = F(shape, celH(d, 0, Wd, '#6E4626', '#4A2E18', 0.75));
    o += grain(d, shape, [0, -70, Wd, 70], 20, 4, '#3A2412', '#9A7044', true);
    // arch window with bubble tubes round it
    const arch = `M4,-44A${f(Wd / 2 - 4)},15.6 0 0 1 ${f(Wd - 4)},-44L${f(Wd - 4)},-38L4,-38Z`;
    const tube = `M3,-36L3,-48A${f(Wd / 2 - 3)},16.4 0 0 1 ${f(Wd - 3)},-48L${f(Wd - 3)},-36`;
    o += F(arch, d.linear(0, -62, 0, -38, [[0, '#E8A040'], [1, '#8A4A1A']]), 0.8);
    o += d.clip(arch, L('M8,-38V-62M13,-38V-64M18,-38V-64M23,-38V-62', 0.6, '#5A2A0A', 'opacity="0.6"'));
    o += glow(d, L(tube, 3.4, '#F0A040'), 2.2, 0.7) + L(tube, 2.6, INK) + L(tube, 1.8, '#E8963A') + L(tube, 0.6, '#FFE6B0');
    for (let k = 0; k < 6; k++) o += dot(3, -38 - k * 2, 0.4, '#FFF6D8', 0.9) + dot(Wd - 3, -39 - k * 2.2, 0.4, '#FFF6D8', 0.9);
    // selection window: rows of title cards (scribbles only)
    o += F(rect(5, -35, Wd - 5, -25), '#D8CFA8', 0.8) + glow(d, F(rect(5, -35, Wd - 5, -25), '#FFF0C0'), 1.2, 0.3);
    for (let k = 0; k < 3; k++) for (let c = 0; c < 2; c++) o += L(`M${f(7 + c * 10.8)},${f(-32.6 + k * 3)}h${f(5 + ((k + c) % 3))}`, 0.5, '#5A4A3A');
    o += L(`M${f(Wd / 2)},-35V-25`, 0.5, '#8A7A5A');
    // chrome grille over the speaker cloth
    const gr = rect(4, -22, Wd - 4, -6);
    o += F(gr, '#4A2A22', 0.8) + d.clip(gr, speckle(d, gr, [4, -22, Wd - 8, 16], 40, ['#2A1610', '#6A3A2A'], 3, 0.3, 0.6));
    for (let k = 0; k < 6; k++) o += L(`M${f(6.5 + k * 4.4)},-21V-7`, 1.4, INK) + L(`M${f(6.5 + k * 4.4)},-21V-7`, 0.8, '#C9CBC4');
    // someone's ear, nailed to the grille
    o += F('M20,-17C22.6,-18.6 25,-16 24.2,-13C23.6,-10.6 21.6,-10 20.6,-11.4C21.6,-12.6 21.8,-14.4 20,-14.6Z', SKIN, 0.7) + L('M21.6,-16q1.6,0.4 1.4,2.6', 0.4, SKIN_S) + dot(20.6, -15.6, 0.6, '#8E8A80') + F('M21,-11q0,3 -0.6,4q-0.6,-1 -0.4,-4Z', '#7A2A22', 0, 'opacity="0.8"');
    // chrome trim + coin slot
    o += L(`M1,-3H${f(Wd - 1)}`, 1.2, '#B8BAB4') + F(rect(Wd / 2 - 2, -24, Wd / 2 + 2, -22.8), '#141210', 0.4);
    o += F(shape, d.linear(0, -70, 0, 0, [[0, '#FFF', 0.05], [0.7, '#000', 0], [1, '#000', 0.35]]));
    o += scratches(d, shape, [0, -70, Wd, 70], 16, '#C9A47A', 6, 0.6);
    o += L(shape, LW);
    s += grp(o, swFace(t, i0, jf, 0));
    // a roach on top of the arch
    const [rx, ry] = t.p(0.05, 0, 66);
    s += F(ell(rx, ry, 1.6, 1), '#4A2A16', 0.4) + L(`M${f(rx - 1.4)},${f(ry - 0.6)}l-1.2,-0.8M${f(rx + 1.4)},${f(ry - 0.6)}l1.2,-1`, 0.3, INK);
    s += fly(X + 26, Y - 70, 0.9);
    return s;
  });
}

// ---------------------------------------------------------------- arcade
function arcade(): ArtAsset[] {
  return objPair('arcade', 150, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    const i0 = -0.3;
    const i1 = 0.3;
    const W = (i1 - i0) * 48;
    const body = '#2A2A30';
    const bodyS = '#1C1C20';
    let s = shadow(d, t, 0.02, 0.02, 0.46, 0.44);
    // side profile on the +i face (j, z)
    const prof: [number, number][] = [
      [-0.3, 0],
      [-0.3, 92],
      [0.14, 92],
      [0.14, 79],
      [0.03, 77],
      [0.13, 49],
      [0.3, 45],
      [0.3, 39],
      [0.17, 38],
      [0.17, 0],
    ];
    const side = poly(prof.map(([j, z]) => t.p(i1, j, z)));
    s += F(side, celH(d, X, X + 40, '#3A3A44', '#2A2A32', 0.3), LW);
    // side art: a toxic-green splash + a slimy handprint
    s += d.clip(side, grp(F(blob(16, -60, 12, 16, 3, 9, 0.5), '#55704A', 0, 'opacity="0.85"') + F(blob(10, -22, 8, 6, 4), '#55704A', 0, 'opacity="0.6"') + F(blob(20, -76, 5, 3, 5), '#9BE04A', 0, 'opacity="0.5"'), seFace(t, i1, 0.3, 0)));
    s += d.clip(side, grp(F(blob(28, -54, 3, 3.6, 6), '#9BE04A', 0, 'opacity="0.8"') + L('M26,-57l-2,-4M28,-58l-0.6,-5M30,-57.4l1,-4.6M31,-55l3,-3', 1.2, '#9BE04A', 'opacity="0.8"'), seFace(t, i1, 0.3, 0)));
    s += scratches(d, side, [X, Y - 100, 40, 100], 18, '#8E8A9A', 3, 0.5);
    // top
    s += F(t.qd(i0, i1, -0.3, 0.14, 92), '#3E3E46', LW);
    // marquee front (lit) with the title
    const mFrame = swFace(t, i0, 0.14, 79);
    let m = F(rect(0, -13, W, 0), '#5A1A1E', LW);
    m += glow(d, F(rect(1, -12, W - 1, -1), '#E86A3A'), 2, 0.45);
    m += F(rect(1, -12, W - 1, -1), d.linear(0, -12, 0, 0, [[0, '#8A2A22'], [1, '#4A1014']]), 0.6);
    m += unflip(glow(d, L(textD('ZOMBIE', W / 2, -6.6, 4.4, { anchor: 'middle', gap: 0.3 }) + textD('PANIC', W / 2, -1.6, 3.6, { anchor: 'middle', gap: 0.35 }), 1.6, '#E8E07A'), 1, 0.7) + lettering('ZOMBIE', W / 2, -6.6, 4.4, '#E8E07A', 1, { anchor: 'middle', gap: 0.3 }, 0.5) + lettering('PANIC', W / 2, -1.6, 3.6, '#9BE04A', 0.9, { anchor: 'middle', gap: 0.35 }, 0.5), mir, W / 2);
    // the soffit between marquee and screen
    s += F(poly([t.p(i0, 0.14, 79), t.p(i1, 0.14, 79), t.p(i1, 0.03, 77), t.p(i0, 0.03, 77)]), '#141418', 0.8);
    // slanted screen
    const sl = Math.hypot(0.1 * 48, 28);
    const sFrame = fr(t, [i0, 0.03, 77], [1 / 48, 0, 0], [0, 0.1 / sl, -28 / sl]);
    let sc = F(rect(0, 0, W, sl), bodyS, LW);
    const scr = rr(3, 2.6, W - 3, sl - 3.6, 2);
    sc += F(scr, '#1E3A2E', 0.8) + glow(d, F(scr, '#3E8A5A'), 1.8, 0.4);
    // pixel zombie + pixel brain, scanlines
    const px = (x: number, y: number, c: string) => F(rect(x, y, x + 1.6, y + 1.6), c);
    let pix = '';
    const zomb = ['..GG..', '.GYYG.', '..GG..', '.GGGG.', 'G.GG.G', '..GG..', '.G..G.'];
    zomb.forEach((row, ry) => [...row].forEach((c, rx) => (pix += c === 'G' ? px(6 + rx * 1.6, 9 + ry * 1.6, '#9BE04A') : c === 'Y' ? px(6 + rx * 1.6, 9 + ry * 1.6, EYE_Z) : '')));
    const brain = ['.PP.', 'PPPP', '.PP.'];
    brain.forEach((row, ry) => [...row].forEach((c, rx) => (pix += c === 'P' ? px(19 + rx * 1.6, 15 + ry * 1.6, '#E08A9A') : '')));
    pix += unflip(L(textD('1UP 6660', W / 2, 6.6, 2.2, { anchor: 'middle', gap: 0.3 }), 0.5, '#E8E07A'), mir, W / 2);
    for (let k = 0; k < 14; k++) pix += L(`M3,${f(3 + k * 2)}H${f(W - 3)}`, 0.3, '#000', 'opacity="0.35"');
    pix += F(blob(20, 22, 4, 3.4, 7), '#7A2A22', 0, 'opacity="0.55"') + L('M18,24l-0.6,4M21,24.6l0.4,3.4', 0.8, '#7A2A22', 'opacity="0.5"');
    sc += d.clip(scr, pix) + d.clip(scr, L('M4,4L12,20', 2, '#FFFFFF', 'opacity="0.12"'));
    s += grp(sc, sFrame);
    s += grp(m, mFrame);
    // control panel deck
    const deck = poly([t.p(i0, 0.13, 49), t.p(i1, 0.13, 49), t.p(i1, 0.3, 45), t.p(i0, 0.3, 45)]);
    s += F(deck, '#3A3A44', LW);
    const dFrame = fr(t, [i0, 0.13, 49], [1 / 48, 0, 0], [0, 1 / 48, -4 / 8.16]);
    let dk2 = '';
    // joystick = a finger bone with a knuckle on top; three buttons
    dk2 += F(ell(8, 4, 2.4, 2.4), '#141418', 0.5);
    for (const [bx, c] of [[16, '#8A2A22'], [20.6, '#C9A83A'], [25, '#4F6A3A']] as [number, string][]) dk2 += F(ell(bx, 4.6, 1.6, 1.6), dk(c, 0.3), 0.5) + F(ell(bx - 0.3, 4.2, 1.2, 1.2), c);
    s += grp(dk2, dFrame);
    const [jx, jy] = t.p(i0 + 8 / 48, 0.13 + 4 / 48, 47.6);
    s += F(capsule([jx, jy], [jx - 1, jy - 9], 1.8, 1.5), '#D6CDAE', 0.7) + F(ell(jx - 1, jy - 10, 2, 1.7), '#D6CDAE', 0.7) + L(`M${f(jx - 1.8)},${f(jy - 10.6)}l1.6,0.4`, 0.4, '#A99F7E');
    // panel front edge + lower cabinet with coin door
    const pf = poly([t.p(i0, 0.3, 45), t.p(i1, 0.3, 45), t.p(i1, 0.3, 39), t.p(i0, 0.3, 39)]);
    s += F(pf, '#2A2A32', 0.9) + F(poly([t.p(i0, 0.3, 39), t.p(i1, 0.3, 39), t.p(i1, 0.17, 38), t.p(i0, 0.17, 38)]), '#0E0E10', 0.6);
    let lo = F(rect(0, -38, W, 0), celH(d, 0, W, body, bodyS, 0.8), LW);
    lo += F(rect(8, -32, W - 8, -12), '#3A3A42', 0.8);
    lo += F(rect(10.6, -29, 13.4, -24), '#141210', 0.4) + F(rect(15.4, -29, 18.2, -24), '#141210', 0.4);
    lo += glow(d, F(rect(10.6, -23, 13.4, -21.6), '#F08A3A') + F(rect(15.4, -23, 18.2, -21.6), '#F08A3A'), 1, 0.8) + F(rect(10.6, -23, 13.4, -21.6), '#F0A04A', 0.3) + F(rect(15.4, -23, 18.2, -21.6), '#4A2A16', 0.3);
    lo += L('M2,-6l4,-1M18,-4l7,-1', 0.6, '#55555E') + F(blob(20, -8, 3, 2, 3), '#000', 0, 'opacity="0.3"');
    lo += rust(d, rect(0, -38, W, 0), [[3, -2, 2]], 8);
    s += grp(lo, swFace(t, i0, 0.17, 0));
    // edge highlight on the front-right corner
    s += t.line([i1, 0.17, 0], [i1, 0.17, 38], 0.6, '#55555E');
    s += fly(X - 26, Y - 98, 1);
    return s;
  });
}

// ---------------------------------------------------------------- slot machine
function slotMachine(): ArtAsset[] {
  return objPair('slot_machine', 144, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.4, 0.36);
    const st = box(t, -0.24, 0.24, -0.2, 0.2, 0, 30, '#3A3833', '#4A4740', '#2A2824');
    s += st.fills + boxShade(d, t, st, -0.24, 0.24, 0.2, 0, 30) + st.lines;
    s += grp(F(rect(5, -24, 18, -8), 'none', 0.6) + dot(16, -16, 0.7, '#B09A4A'), swFace(t, -0.24, 0.2, 0));
    const i0 = -0.27;
    const i1 = 0.27;
    const j1 = 0.2;
    const W = (i1 - i0) * 48;
    const b = box(t, i0, i1, -0.22, j1, 30, 76, '#9A2A26', '#7A1E1E', '#521214');
    s += b.fills + wear(d, t, b, i0, i1, j1, 30, 76, 3);
    // chrome header with lettering + a red siren dome
    const hd = box(t, i0 - 0.01, i1 + 0.01, -0.23, j1 + 0.01, 76, 84, '#C9CBC4', '#A8AAA4', '#7E807A');
    s += hd.fills + sheen(d, hd.left, X - 40, Y - 110, 30, 30, 2, 0.4, 5) + hd.lines;
    s += grp(unflip(lettering('JACKPOT', W / 2, -1.6, 4.4, '#7A1E1E', 0.9, { anchor: 'middle', gap: 0.25, wide: 0.9 }, 0), mir, W / 2), swFace(t, i0 - 0.01, j1 + 0.01, 77.4));
    const [sx, sy] = t.p(0, 0, 84);
    s += glow(d, dot(sx, sy - 4, 7, '#E8402A'), 2.4, 0.45);
    s += F(cylBody(sx, sy, 3, 3, 0, 2), '#3A3833', 0.8) + F(`M${f(sx - 3.4)},${f(sy - 2)}C${f(sx - 3.4)},${f(sy - 9)} ${f(sx + 3.4)},${f(sy - 9)} ${f(sx + 3.4)},${f(sy - 2)}Z`, celH(d, sx - 3.4, sx + 3.4, '#E05A3A', '#9A2A1E'), 0.8) + dot(sx - 1.2, sy - 5.6, 0.8, '#FFE0C0');
    // front: reel window with skull / brain / eyeball, pay table, tray
    let o = '';
    o += F(rect(2, -42, W - 2, -26), '#C9CBC4', 0.8);
    const win = rect(3.6, -40.4, W - 3.6, -27.6);
    o += F(win, '#E8E2CC', 0.6);
    const rw = (W - 7.2) / 3;
    const reel = (k: number, sym: string) => {
      const x = 3.6 + rw * k + rw / 2;
      let r = F(rect(3.6 + rw * k, -40.4, 3.6 + rw * (k + 1), -27.6), d.linear(0, -40, 0, -28, [[0, '#9A9484'], [0.3, '#F2EEDC'], [0.7, '#F2EEDC'], [1, '#9A9484']]), 0.4);
      if (sym === 'skull') r += F(`M${f(x - 2.6)},${f(-34)}C${f(x - 3)},${f(-38.6)} ${f(x + 3)},${f(-38.6)} ${f(x + 2.6)},${f(-34)}L${f(x + 1.6)},${f(-31.4)}L${f(x - 1.6)},${f(-31.4)}Z`, '#E2DCC6', 0.5) + dot(x - 1, -34.6, 0.8, INK) + dot(x + 1, -34.6, 0.8, INK);
      if (sym === 'brain') r += F(blob(x, -34, 3.2, 2.4, 4), '#C98A92', 0.5) + L(`M${f(x - 1)},${f(-35.6)}q1,1.6 0,3M${f(x + 1)},${f(-35.8)}q-1,1.6 0,3`, 0.4, '#8A4A52');
      if (sym === 'eye') r += eyeball(x, -34, 2.6, '#4F6A3A', 0, 0);
      return r;
    };
    o += reel(0, 'skull') + reel(1, 'brain') + reel(2, 'eye');
    o += L(`M3.6,-34H${f(W - 3.6)}`, 0.4, '#C0402E', 'opacity="0.8"');
    o += d.clip(win, L('M5,-40l4,10', 1.6, '#FFFFFF', 'opacity="0.3"'));
    // pay table lights
    for (let k = 0; k < 6; k++) o += dot(4 + k * 3.8, -22, 0.9, k % 2 ? '#E8C04A' : '#C9CBC4');
    o += glow(d, F(rect(4, -23, W - 4, -21), '#E8C04A'), 1, 0.4);
    // coin tray: a few coins and a gold tooth
    o += F(rect(3, -12, W - 3, -5), '#B8BAB4', 0.8) + F(rect(4.4, -10.6, W - 4.4, -6.4), '#3A3833', 0.5);
    o += F(ell(9, -7, 1.6, 0.8), '#C9A83A', 0.4) + F(ell(12, -6.6, 1.6, 0.8), '#C9A83A', 0.4) + F('M16,-8.4l1.4,0l0.4,2.2l-0.8,0.6l-0.8,-0.6Z', '#E8C04A', 0.4);
    o += F(rect(8, -18, 18, -16.6), '#141210', 0.4);
    s += grp(o, swFace(t, i0, j1, 30));
    s += b.lines;
    // the lever is somebody's arm, fist on top
    const [hx, hy] = t.p(i1, 0, 56);
    s += F(ell(hx + 1, hy, 3, 4), '#A8AAA4', 0.8) + dot(hx + 0.4, hy - 1, 1, '#E2E4DE');
    const arm = `M${f(hx + 2)},${f(hy)}Q${f(hx + 9)},${f(hy - 6)} ${f(hx + 8)},${f(hy - 22)}`;
    s += L(arm, 4.6, INK) + L(arm, 3, SKIN_Z) + grp(L(arm, 1, '#B6D86A', 'opacity="0.6"'), 'translate(-0.8 0)');
    s += L(`M${f(hx + 7)},${f(hy - 9)}l2,0.6M${f(hx + 7)},${f(hy - 12)}l2,0.4`, 0.5, INK);
    s += F(blob(hx + 8, hy - 25, 3.4, 3.2, 3), SKIN_Z, 0.8) + L(`M${f(hx + 6)},${f(hy - 26.6)}h4M${f(hx + 6)},${f(hy - 24.6)}h4.4`, 0.4, SKIN_ZS);
    s += F(ell(hx + 2, hy, 1.6, 2), '#7A2A22', 0.5);
    return s;
  });
}

// ---------------------------------------------------------------- pinball
function pinball(): ArtAsset[] {
  return objPair('pinball', 136, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.34, 0.5);
    const i0 = -0.22;
    const i1 = 0.22;
    const ja = -0.42;
    const jb = 0.4;
    // bone legs: back pair first
    const leg = (i: number, j: number) => {
      const [x, y] = t.p(i, j, 0);
      return F(capsule([x, y - 30], [x, y - 1], 2.8, 2.4), '#D6CDAE', 0.8) + F(ell(x - 1.2, y - 1, 2, 1.6), '#D6CDAE', 0.6) + F(ell(x + 1.2, y - 1, 2, 1.6), '#C2B894', 0.6) + F(ell(x, y - 31, 2.4, 1.8), '#C2B894', 0.6);
    };
    s += leg(i1 - 0.03, ja + 0.04) + leg(i0 + 0.03, ja + 0.04) + leg(i1 - 0.03, jb - 0.04);
    // backbox at the far end
    const bb = box(t, i0, i1, ja, ja + 0.08, 36, 76, '#3A2A44', '#4A3456', '#2A1E34');
    s += bb.fills + bb.lines;
    const W = (i1 - i0) * 48;
    let art = F(rect(1.2, -36, W - 1.2, -9), '#1A1420', 0.6);
    art += d.clip(rect(1.2, -36, W - 1.2, -9), F('M3,-9C3,-24 8,-30 11,-30C14,-30 19,-24 19,-9Z', '#55704A', 0.6) + F(ell(8.6, -23, 1.3, 0.9), EYE_Z) + F(ell(13.4, -23, 1.3, 0.9), EYE_Z) + L('M8,-17q3,2 6,0', 0.6, INK) + glow(d, F(rect(1, -36, W - 1, -30), '#9A3AE0'), 2, 0.4));
    art += unflip(glow(d, L(textD('TILT', W / 2, -3, 4, { anchor: 'middle', gap: 0.4 }), 1.4, '#E8402A'), 1.2, 0.8) + lettering('TILT', W / 2, -3, 4, '#F06A4A', 0.9, { anchor: 'middle', gap: 0.4 }, 0.4), mir, W / 2);
    s += grp(art, swFace(t, i0, ja + 0.08, 36));
    // cabinet body
    const b = box(t, i0, i1, ja + 0.08, jb, 28, 37, '#3A2A44', '#4A3456', '#2A1E34');
    s += b.fills;
    // playfield under glass (top frame: x along i, y along j)
    const pf = topFace(t, i0 + 0.02, ja + 0.1, 37.2);
    const PW = (i1 - i0 - 0.04) * 48;
    const PL = (jb - ja - 0.12) * 48;
    const field = rect(0, 0, PW, PL);
    let p = F(field, d.linear(0, 0, 0, PL, [[0, '#2A3A5A'], [1, '#1A2234']]), 0.6);
    p += F(ell(PW * 0.3, PL * 0.22, 3, 3), '#C0402E', 0.5) + F(ell(PW * 0.7, PL * 0.26, 3, 3), '#C9A83A', 0.5) + F(ell(PW * 0.5, PL * 0.42, 3, 3), '#4F8A3A', 0.5);
    p += glow(d, F(ell(PW * 0.3, PL * 0.22, 2, 2), '#F07A4A') + F(ell(PW * 0.7, PL * 0.26, 2, 2), '#F0D04A'), 1, 0.7);
    p += L(`M2,${f(PL * 0.6)}L${f(PW * 0.35)},${f(PL * 0.82)}M${f(PW - 2)},${f(PL * 0.6)}L${f(PW * 0.65)},${f(PL * 0.82)}`, 0.8, '#C9CBC4');
    p += F(capsule([PW * 0.35, PL * 0.84], [PW * 0.46, PL * 0.9], 1.8, 1.2), '#E8E2CC', 0.4) + F(capsule([PW * 0.65, PL * 0.84], [PW * 0.54, PL * 0.9], 1.8, 1.2), '#E8E2CC', 0.4);
    p += L(`M${f(PW - 3)},${f(PL * 0.95)}V${f(PL * 0.1)}Q${f(PW - 3)},2 ${f(PW * 0.6)},2`, 0.6, '#C9CBC4');
    for (let k = 0; k < 4; k++) p += dot(PW * 0.2 + k * 3, PL * 0.55, 0.7, ['#E8C04A', '#9BE04A', '#E05A3A', '#E8C04A'][k]);
    s += grp(p, pf);
    // the ball is an eyeball (drawn in screen space so it stays round)
    const [ex, ey] = t.p(0.04, 0.02, 38.4);
    s += eyeball(ex, ey, 2.2, '#4F6A3A', -0.3, 0.3);
    s += d.clip(b.top, L(`M${f(X - 20)},${f(Y - 54)}l26,14`, 3, '#FFFFFF', 'opacity="0.15"'));
    s += wear(d, t, b, i0, i1, jb, 28, 37, 5) + b.lines;
    // front: coin door + plunger
    s += grp(F(rect(4, -7, 10, -2), '#141210', 0.4) + F(rect(12, -7, 18, -2), '#141210', 0.4) + glow(d, F(rect(4.6, -6, 9.4, -5), '#F08A3A'), 0.6, 0.8), swFace(t, i0, jb, 37));
    const [px, py] = t.p(i1 - 0.05, jb, 31);
    s += L(`M${f(px)},${f(py)}l-3,2`, 1.4, '#C9CBC4') + F(ell(px - 3.4, py + 2.2, 1.4, 1.2), '#7A1E1E', 0.5);
    s += leg(i0 + 0.03, jb - 0.04);
    return s;
  });
}

// ---------------------------------------------------------------- phone booth
function phonebooth(): ArtAsset[] {
  return objPair('phonebooth', 180, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    const i0 = -0.3;
    const i1 = 0.3;
    const j0 = -0.3;
    const j1 = 0.3;
    const H = 114;
    const W = (i1 - i0) * 48;
    let s = shadow(d, t, 0, 0, 0.46, 0.46);
    // interior walls seen through the glass
    s += F(poly([t.p(i0, j0, 0), t.p(i1, j0, 0), t.p(i1, j0, H), t.p(i0, j0, H)]), '#4A4E4C');
    s += F(poly([t.p(i0, j0, 0), t.p(i0, j1, 0), t.p(i0, j1, H), t.p(i0, j0, H)]), '#3A3E3C');
    s += F(t.qd(i0, i1, j0, j1, 0), '#55534C');
    // phone on the back wall, receiver dangling, chewed phone book
    let ph = F(rect(10, -78, 19, -60), '#3A3833', 0.8) + F(rect(11.4, -75, 17.6, -66), '#8E8A80', 0.5);
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) ph += dot(12.6 + c * 2, -73.6 + k * 2.6, 0.6, '#2A2826');
    ph += L('M18,-64Q22,-50 15,-44Q11,-40 14,-36', 0.6, INK);
    ph += F(capsule([12, -38], [16, -32], 2.4, 2.4), '#2A2826', 0.6);
    ph += F(rect(9, -54, 20, -50), '#B8963A', 0.6) + F('M17,-50l3,0l0,3l-2,-1Z', '#B8963A', 0.5);
    s += grp(ph, swFace(t, i0, j0, 0));
    // frame: posts + roof
    const post = (i: number, j: number, c: string) => F(poly([t.p(i - 0.025, j, 0), t.p(i + 0.025, j, 0), t.p(i + 0.025, j, H), t.p(i - 0.025, j, H)]), c, 0.8);
    s += post(i1, j0, '#6E7068');
    // glass: front + right, tinted, with frames
    const fg = poly([t.p(i0, j1, 4), t.p(i1, j1, 4), t.p(i1, j1, 96), t.p(i0, j1, 96)]);
    const rg = poly([t.p(i1, j1, 4), t.p(i1, j0, 4), t.p(i1, j0, 96), t.p(i1, j1, 96)]);
    s += F(rg, '#8EA4A8', 0, 'opacity="0.38"') + F(fg, '#9EB4B8', 0, 'opacity="0.3"');
    s += d.clip(fg, L(`M${f(X - 40)},${f(Y - 10)}l30,-70`, 5, '#FFFFFF', 'opacity="0.2"') + L(`M${f(X - 30)},${f(Y + 4)}l26,-62`, 1.6, '#FFFFFF', 'opacity="0.2"'));
    s += d.clip(rg, L(`M${f(X + 10)},${f(Y - 30)}l20,-50`, 4, '#FFFFFF', 'opacity="0.14"'));
    // a bloody handprint dragged down the inside of the front glass, and a shattered lower panel
    let gl = '';
    gl += F(blob(8, -70, 3.4, 4, 3), '#7A2A22', 0, 'opacity="0.7"');
    for (let k = 0; k < 4; k++) gl += F(capsule([6 + k * 1.8, -73], [5.6 + k * 2.2, -79 + (k % 2)], 1.2, 1), '#7A2A22', 0, 'opacity="0.7"');
    gl += F('M6,-68L5,-50L7,-50L9,-66ZM9,-67L9,-46L10.6,-46L11,-66Z', '#7A2A22', 0, 'opacity="0.45"');
    gl += crack(20, -20, -0.8, 14, 4, 0.5, '#E8F0F0', 2) + crack(20, -20, 2.4, 12, 5, 0.5, '#E8F0F0', 1) + crack(20, -20, 0.6, 10, 6, 0.4, '#E8F0F0', 0);
    s += grp(gl, swFace(t, i0, j1, 0));
    // door split + frames
    const frame = '#6E7068';
    const fl = (a: [number, number, number], b: [number, number, number], w: number, c: string) => t.line(a, b, w + 1.2, INK) + t.line(a, b, w, c);
    s += fl([0, j1, 4], [0, j1, 96], 1.6, '#8A8C84');
    s += fl([i0, j1, 50], [i1, j1, 50], 1.4, '#8A8C84') + fl([i1, j1, 50], [i1, j0, 50], 1.4, '#7A7C74');
    s += post(i0, j1, '#8A8C84') + post(i1, j1, frame);
    s += F(poly([t.p(i0, j1, 0), t.p(i1, j1, 0), t.p(i1, j1, 4), t.p(i0, j1, 4)]), '#5E605A', 0.8) + F(poly([t.p(i1, j1, 0), t.p(i1, j0, 0), t.p(i1, j0, 4), t.p(i1, j1, 4)]), '#4A4C46', 0.8);
    // header band with the sign on both visible faces
    const hb = box(t, i0, i1, j0, j1, 96, H, '#2C6985', '#2C6985', '#1E4E64');
    s += hb.fills;
    s += grp(unflip(F(rect(3, -15, W - 3, -3), '#DAD6C8', 0.6) + glow(d, F(rect(3, -15, W - 3, -3), '#FFF6D8'), 1.4, 0.4) + lettering('PHONE', W / 2, -5.4, 6.4, '#2C4A6A', 1.2, { anchor: 'middle', gap: 0.3, wide: 0.9 }, 0), mir, W / 2), swFace(t, i0, j1, 96));
    s += grp(unflip(F(rect(3, -15, W - 3, -3), '#B8B4A8', 0.6) + lettering('PHONE', W / 2, -5.4, 6.4, '#1E3A50', 1.2, { anchor: 'middle', gap: 0.3, wide: 0.9 }, 0), mir, W / 2), seFace(t, i1, j1, 96));
    s += rust(d, hb.right, [[X + 20, Y - 104, 2.4], [X + 36, Y - 122, 2]], 4) + rustDrip(X + 22, Y - 100, 10, 1.2);
    s += hb.lines;
    const roof = box(t, i0 - 0.02, i1 + 0.02, j0 - 0.02, j1 + 0.02, H, H + 4, '#55574F', '#45473F', '#35372F');
    s += roof.fills + roof.lines;
    // outline of the whole booth
    s += L(poly([t.p(i0, j1, 0), t.p(i1, j1, 0), t.p(i1, j0, 0), t.p(i1, j0, H), t.p(i0, j0, H), t.p(i0, j1, H)]), LW);
    s += fly(X - 30, Y - 90, 1);
    return s;
  });
}

// ---------------------------------------------------------------- comic rack
function comicRack(): ArtAsset[] {
  return objPair('comic_rack', 146, (d, t, mir) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.36, 0.36);
    s += cyl(d, X, Y, 15, 15, 0, 3, '#5E605A', '#3E403A', '#6E7068').s;
    s += rust(d, cylBody(X, Y, 15, 15, 0, 3), [[X + 8, Y + 4, 2.2]], 3);
    const pole = cylBody(X, Y, 1.4, 1.4, 3, 92);
    s += F(pole, celH(d, X - 1.4, X + 1.4, '#B8BAB4', '#6E7068')) + L(pole, 0.8);
    const a = 0.22;
    const covers = [
      ['#8A3A2A', '#E8C04A'],
      ['#2C6985', '#DAD6C8'],
      ['#55704A', '#E8E07A'],
      ['#C9A83A', '#7A1E1E'],
      ['#4A3456', '#9BE04A'],
      ['#B8963A', '#2A2826'],
    ];
    const comic = (k: number, wpx: number, hpx: number, chewed: boolean, slime: boolean) => {
      const [bg, fg] = covers[k % covers.length];
      const c = rect(0, -hpx, wpx, 0);
      let o = F(c, bg, 0.6);
      o += F(rect(0.6, -hpx + 0.6, wpx - 0.6, -hpx + 3), fg, 0);
      // tiny cover art: alternating a zombie face, a skull, a fist
      if (k % 3 === 0) o += F(ell(wpx / 2, -hpx * 0.45, 2.4, 2.6), SKIN_Z, 0.4) + dot(wpx / 2 - 0.9, -hpx * 0.48, 0.5, EYE_Z) + dot(wpx / 2 + 0.9, -hpx * 0.48, 0.5, EYE_Z);
      else if (k % 3 === 1) o += F(ell(wpx / 2, -hpx * 0.45, 2.2, 2.2), '#E2DCC6', 0.4) + dot(wpx / 2 - 0.8, -hpx * 0.46, 0.6, INK) + dot(wpx / 2 + 0.8, -hpx * 0.46, 0.6, INK);
      else o += F(rect(wpx / 2 - 2, -hpx * 0.6, wpx / 2 + 2, -hpx * 0.3), fg, 0.4);
      if (slime) o += F(`M1,${f(-hpx)}h${f(wpx - 2)}q0,4 -1,6q-1,-2 -1.6,0q-0.6,4 -1.4,3q-0.6,-2 -1,-5Z`, '#7EAE30', 0.4, 'opacity="0.9"');
      if (chewed) {
        const bt = bite(d, wpx, -hpx, 3, 2.4, 1, 1);
        o = masked(o, bt.mask) + bt.ink(c);
      }
      return o;
    };
    for (let tier = 0; tier < 3; tier++) {
      const z = 20 + tier * 22;
      // wire pockets
      s += F(t.qd(-a, a, -a, a, z - 1), 'none', 0) + L(t.qd(-a, a, -a, a, z), 0.6, '#8E908A');
      let lf = '';
      let rf = '';
      for (let k = 0; k < 2; k++) {
        lf += grp(comic(tier * 2 + k, 9.6, 14, tier === 1 && k === 0, tier === 0 && k === 1), `translate(${f(1 + k * 10.4)} ${f(-1 + k * 0.4)}) rotate(${k ? 3 : -2})`);
        rf += grp(comic(tier * 2 + k + 3, 9.6, 14, false, false), `translate(${f(1 + k * 10.4)} ${f(-1)}) rotate(${k ? -2 : 2})`);
      }
      s += grp(rf, seFace(t, a, a, z)) + grp(lf, swFace(t, -a, a, z));
      s += t.line([-a, a, z + 4], [a, a, z + 4], 0.6, '#B8BAB4') + t.line([a, a, z + 4], [a, -a, z + 4], 0.6, '#8E908A');
    }
    // top sign
    const sw2 = 0.36 * 48;
    s += grp(F(rect(0, -11, sw2, 0), '#7A1E1E', LW) + unflip(lettering('COMICS', sw2 / 2, -3, 4, '#E8D07A', 0.9, { anchor: 'middle', gap: 0.25, wide: 0.8 }, 0), mir, sw2 / 2), swFace(t, -0.18, 0.02, 92));
    s += fly(X + 22, Y - 60, 1);
    return s;
  });
}

// ---------------------------------------------------------------- foosball
function foosball(): ArtAsset {
  return objAsset('foosball', 104, (d, t) => {
    const X = t.cx;
    const Y = t.cy;
    let s = shadow(d, t, 0, 0, 0.5, 0.36);
    const i0 = -0.42;
    const i1 = 0.42;
    const j0 = -0.24;
    const j1 = 0.24;
    const leg = (i: number, j: number) => {
      const [x, y] = t.p(i, j, 0);
      return F(`M${f(x - 1.6)},${f(y - 27)}h3.2v26h-3.2Z`, '#3A2A1A', 0.8) + F(ell(x, y, 2.4, 1.2), '#2A2016', 0.6);
    };
    s += leg(i1 - 0.04, j0 + 0.04) + leg(i0 + 0.04, j0 + 0.04);
    // back rod ends
    const rodsI = [-0.3, -0.1, 0.1, 0.3];
    for (const i of rodsI) s += t.line([i, j0 - 0.1, 34], [i, j0, 34], 1.4, '#9A9C94');
    const b = box(t, i0, i1, j0, j1, 24, 36, '#6E4828', '#5A3A1E', '#3E2614');
    s += b.fills + grain(d, b.left, [X - 50, Y - 40, 60, 30], 12, 3) + grain(d, b.right, [X, Y - 40, 50, 30], 8, 4, '#2A180C', '#6E4A2E');
    s += wear(d, t, b, i0, i1, j1, 24, 36, 6);
    // the pitch: worn green felt, recessed
    const pitch = t.qd(i0 + 0.04, i1 - 0.04, j0 + 0.04, j1 - 0.04, 33);
    s += F(t.qd(i0 + 0.04, i1 - 0.04, j0 + 0.04, j1 - 0.04, 36), '#2E2214');
    s += F(pitch, '#4F6A3A', 0.6) + d.clip(pitch, F(blob(X, Y - 33, 14, 6, 3), '#6E7A4A', 0, 'opacity="0.5"') + F(blob(X - 16, Y - 30, 5, 2, 4), '#7A2A22', 0, 'opacity="0.4"'));
    s += t.line([0, j0 + 0.04, 33.1], [0, j1 - 0.04, 33.1], 0.5, '#C9C3A6') + L(t.ell(0, 0, 0.08, 0.08, 33.1), 0.5, '#C9C3A6');
    for (const i of [i0 + 0.04, i1 - 0.04]) s += F(poly([t.p(i, -0.07, 33), t.p(i, 0.07, 33), t.p(i, 0.07, 36), t.p(i, -0.07, 36)]), '#141210', 0.4);
    // rods with little players (zombies vs humans); one handle is a bone
    rodsI.forEach((i, k) => {
      const team = k % 2 === 0;
      for (const j of [-0.12, 0.04, 0.17]) {
        if (k === 1 && j > 0.1) continue;
        const [x, y] = t.p(i, j, 34);
        s += F(capsule([x, y - 2], [x, y + 3], 2.6, 2), team ? '#55553F' : '#2C6985', 0.5) + F(ell(x, y - 3.4, 1.7, 1.7), team ? SKIN_Z : SKIN, 0.5);
        if (team) s += dot(x - 0.5, y - 3.6, 0.35, EYE_Z) + dot(x + 0.6, y - 3.6, 0.35, EYE_Z);
      }
      s += t.line([i, j0, 34], [i, j1 + 0.12, 34], 1.8, INK) + t.line([i, j0, 34], [i, j1 + 0.12, 34], 1, '#B8BAB4');
      const [hx, hy] = t.p(i, j1 + 0.12, 34);
      if (k === 2) s += F(capsule([hx, hy], [hx - 6, hy + 4], 2.2, 2), '#D6CDAE', 0.6) + F(ell(hx - 6.6, hy + 4.4, 1.6, 1.4), '#D6CDAE', 0.5);
      else s += F(capsule([hx, hy], [hx - 5.6, hy + 3.5], 2.4, 2.4), '#22201C', 0.6);
    });
    // the ball: an eyeball
    const [ex, ey] = t.p(0.02, -0.05, 34);
    s += eyeball(ex, ey, 1.6, '#4F6A3A', 0.2, 0.3);
    s += b.lines;
    s += leg(i0 + 0.04, j1 - 0.04) + leg(i1 - 0.04, j1 - 0.04);
    return s;
  });
}

export function buildSpecial(): ArtAsset[] {
  return [...vending(), ...atm(), jukebox(), ...arcade(), ...slotMachine(), ...pinball(), ...phonebooth(), ...comicRack(), foosball()];
}
