/**
 * Wall items. Same frame as wall segments: WALL_IMG_W x WALL_IMG_H, anchor (0.5, 1), placed exactly like a
 * wall_<side>_* segment (tile centre ± TILE_W / 4). `<key>_l` hangs on the north-west wall, `<key>_r` on the
 * north-east wall. Everything is authored on the 'l' side and mirrored; pieces with lettering are re-drawn
 * with the text counter-flipped so it reads on both walls.
 */
import type { ArtAsset } from '../art/types';
import type { Doc } from '../art/svg';
import { capsule, ell, f, poly } from '../art/svg';
import { F, INK, L, LW, blob, crack, dot, mirrored, rnd, speckle, wallAsset } from './kit';
import { bite, dk, eyeball, finger, fly, glow, grain, grp, lettering, lt, masked, neon, rust, rustDrip, sheen, slab, textD, textW, tape, unflip, wallM, wallShadow, wp3, wq } from './p2kit';

const EYE_Z = '#DECC54';
const SKIN_Z = '#88BB44';
const SKIN_ZS = '#427E40';

/** l + r pair. `sym` items are a plain mirror; others are redrawn with mir = true and then mirrored. */
function pair(key: string, draw: (d: Doc, mir: boolean) => string, sym = false): ArtAsset[] {
  const l = wallAsset(`${key}_l`, (d) => draw(d, false));
  const r = sym ? mirrored(l, `${key}_r`) : mirrored(wallAsset(`${key}_r`, (d) => draw(d, true)), `${key}_r`);
  return [l, r];
}
/** Local flat frame at depth n (x along the wall, y = -height). */
const W = (inner: string, n = 0) => grp(inner, wallM(n));
const rect = (x0: number, y0: number, x1: number, y1: number) => `M${f(x0)},${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;
/** A thick wall disc (clock, dartboard): back rim stacked out to the face. */
function disc(cx: number, z: number, r: number, n0: number, n1: number, rim: string, steps = 5): string {
  let s = W(F(ell(cx, -z, r, r), dk(rim, 0.3), LW), n0);
  for (let k = 1; k < steps; k++) s += W(F(ell(cx, -z, r, r), dk(rim, 0.15)), n0 + ((n1 - n0) * k) / steps);
  return s;
}

// ---------------------------------------------------------------- sign_neon
function neonWord(d: Doc, str: string, x: number, y: number, h: number, col: string, core: string, off: number[], o = {}): string {
  const opts = { gap: 0.42, ...o };
  const w = textW(str, h, opts);
  const gw = (h / 6) * 4;
  const step = (w - gw) / Math.max(1, str.length - 1);
  let s = '';
  [...str].forEach((ch, k) => {
    s += neon(d, textD(ch, x - w / 2 + k * step, y, h), col, core, 1.3, !off.includes(k));
  });
  return s;
}
function signNeon(d: Doc, mir: boolean): string {
  let s = '';
  const b = slab(d, 3, 44, 116, 164, 3, '#2A2824', '#1A1814', '#3A3732');
  s += b.s;
  let face = speckle(d, rect(3, -164, 44, -116), [3, -164, 42, 48], 40, ['#3E3A34', '#16130F'], 3, 0.3, 0.7);
  face += rust(d, rect(3, -164, 44, -116), [[5, -118, 2.6], [43, -160, 2], [30, -117, 1.6]], 5) + rustDrip(40, -116, 8, 1.4);
  face += dot(5.4, -161.6, 0.9, '#6E6A60') + dot(42.6, -161.6, 0.9, '#6E6A60') + dot(5.4, -118.6, 0.9, '#6E6A60') + dot(42.6, -118.6, 0.9, '#6E6A60');
  s += W(d.clip(rect(3, -164, 44, -116), face), 3) + W(L(rect(3, -164, 44, -116), LW), 3);
  // tubes (stand slightly proud of the board)
  let tubes = neonWord(d, 'ZOMBS', 21, -147, 9.4, '#9BE04A', '#EEFFD0', [3], { gap: 0.3 });
  tubes += neonWord(d, 'BBQ', 18, -123, 12, '#F0703A', '#FFE6C8', [], { gap: 0.4 });
  // a little flame tube beside BBQ
  tubes += neon(d, 'M34,-123C30.6,-126 33,-131 35,-135C35,-131 38.6,-129 37,-125.4C37,-123 35.6,-122.4 34,-123Z', '#F0B03A', '#FFF0C8', 1);
  s += W(unflip(tubes, mir, 21), 4);
  // transformer box + cable dangling to the floor
  s += W(F(rect(30, -116, 40, -110), '#3A3732', 0.9) + dot(32, -113, 0.6, '#9BE04A'), 3);
  s += L(`M${wp3(35, 110, 3).map(f).join(',')}Q${wp3(36, 70, 5).map(f).join(',')} ${wp3(38, 10, 4).map(f).join(',')}`, 1.2, INK);
  return s;
}

// ---------------------------------------------------------------- clock
function clock(d: Doc): string {
  const cx = 24;
  const z = 132;
  const r = 15;
  let s = wallShadow(d, poly(Array.from({ length: 16 }, (_, k) => wp3(cx + Math.cos((k / 16) * 6.283) * r, z + Math.sin((k / 16) * 6.283) * r, 0))), 4);
  s += disc(cx, z, r, 0, 4, '#4A3A28');
  let face = F(ell(cx, -z, r, r), '#5A4630', LW);
  face += F(ell(cx, -z, r - 2.4, r - 2.4), d.radial(cx - 4, -z - 4, r * 1.3, [[0, '#E2D8B8'], [0.75, '#C9BC92'], [1, '#9A8A5E']]), 0.8);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const r0 = k % 3 === 0 ? r - 6.5 : r - 5;
    face += L(`M${f(cx + Math.cos(a) * r0)},${f(-z + Math.sin(a) * r0)}L${f(cx + Math.cos(a) * (r - 3.4))},${f(-z + Math.sin(a) * (r - 3.4))}`, k % 3 === 0 ? 1.1 : 0.5, '#2A2418');
  }
  // stains on the dial
  face += d.clip(ell(cx, -z, r - 2.4, r - 2.4), F(blob(cx + 5, -z + 6, 4, 3, 5), '#8A6A3A', 0, 'opacity="0.4"') + F(blob(cx - 6, -z - 4, 2, 1.6, 6), '#7A2A22', 0, 'opacity="0.35"'));
  // bone hands: a long finger bone and a stubby knuckle
  face += F(capsule([cx, -z], [cx + 7.6, -z - 7], 1.6, 1.1), '#D6CDAE', 0.6) + F(ell(cx + 8, -z - 7.4, 1.3, 1.1), '#D6CDAE', 0.5);
  face += F(capsule([cx, -z], [cx - 4.6, -z + 3.4], 2.2, 1.6), '#C2B894', 0.6) + F(ell(cx - 5, -z + 3.8, 1.6, 1.3), '#C2B894', 0.5);
  face += dot(cx, -z, 1.4, '#3A3020');
  // cracked glass
  face += d.clip(ell(cx, -z, r - 2.4, r - 2.4), crack(cx - 8, -z - 9, 0.9, 22, 3, 0.5, '#3A3020', 2) + L(`M${f(cx - 9)},${f(-z - 2)}L${f(cx - 2)},${f(-z - 11)}`, 2, '#FFFFFF', 'opacity="0.35"'));
  // a roach crossing the 3
  face += F(ell(cx + 9, -z + 2, 1.4, 0.9), '#4A2A16', 0.4) + L(`M${f(cx + 8)},${f(-z + 1)}l-1,-1M${f(cx + 8)},${f(-z + 3)}l-1,1M${f(cx + 10)},${f(-z + 1)}l1,-1.4`, 0.3, INK);
  s += W(face, 4);
  // the nail + wire it hangs from
  s += L(`M${wp3(cx - 6, z + 10, 4).map(f).join(',')}L${wp3(cx, z + 20, 0).map(f).join(',')}L${wp3(cx + 6, z + 10, 4).map(f).join(',')}`, 0.5, '#3A3020') + dot(...wp3(cx, z + 20, 0), 0.9, '#2A2620');
  return s;
}

// ---------------------------------------------------------------- bottle_shelf
function shelf(d: Doc, x0: number, x1: number, z: number, n: number): string {
  let s = wallShadow(d, poly([wp3(x0, z - 3, 0), wp3(x1, z - 3, 0), wp3(x1, z - 3, n), wp3(x0, z - 3, n)]), n * 0.6);
  // brackets
  for (const x of [x0 + 5, x1 - 6]) s += F(poly([wp3(x, z - 3, 0), wp3(x, z - 3, n - 2), wp3(x, z - 13, 0)]), '#3A3530', 0.8);
  const top = poly([wp3(x0, z, 0), wp3(x1, z, 0), wp3(x1, z, n), wp3(x0, z, n)]);
  s += F(top, '#9A6E40', 0.9) + grain(d, top, [x0, wp3(x0, z, 0)[1] - 30, x1 - x0 + n, 40], 8, z, '#5C3B1E', '#B8895A');
  s += F(poly([wp3(x0, z - 3, 0), wp3(x0, z - 3, n), wp3(x0, z, n), wp3(x0, z, 0)]), '#5A3A1E', 0.8);
  s += F(wq(x0, x1, z - 3, z, n), '#7A5230', 0.9);
  return s;
}
function bottle(x: number, y: number, h: number, w: number, glass: string, label: string | null, cork = '#8E6A3E'): string {
  const nk = w * 0.32;
  const sh = y - h * 0.62;
  const p = `M${f(x - w / 2)},${f(y)}L${f(x - w / 2)},${f(sh)}Q${f(x - w / 2)},${f(sh - h * 0.12)} ${f(x - nk)},${f(sh - h * 0.16)}L${f(x - nk)},${f(y - h)}L${f(x + nk)},${f(y - h)}L${f(x + nk)},${f(sh - h * 0.16)}Q${f(x + w / 2)},${f(sh - h * 0.12)} ${f(x + w / 2)},${f(sh)}L${f(x + w / 2)},${f(y)}Z`;
  let s = F(p, glass, 0.8);
  s += F(`M${f(x + w * 0.1)},${f(y)}L${f(x + w / 2)},${f(y)}L${f(x + w / 2)},${f(sh)}L${f(x + w * 0.1)},${f(sh)}Z`, '#000', 0, 'opacity="0.25"');
  s += L(`M${f(x - w * 0.28)},${f(y - 1.4)}L${f(x - w * 0.28)},${f(sh - 1)}`, 0.7, '#FFFFFF', 'opacity="0.45"');
  if (label) s += F(rect(x - w / 2 + 0.4, y - h * 0.42, x + w / 2 - 0.4, y - h * 0.18), label, 0.4) + L(`M${f(x - w * 0.3)},${f(y - h * 0.32)}h${f(w * 0.5)}`, 0.4, '#3A3020', 'opacity="0.6"');
  s += F(rect(x - nk - 0.2, y - h - 1.6, x + nk + 0.2, y - h), cork, 0.5);
  return s;
}
function bottleShelf(d: Doc): string {
  let s = '';
  s += shelf(d, 3, 39, 98, 8.5) + shelf(d, 3, 39, 128, 8.5);
  // bottles on the lower shelf (screen space, sitting mid-depth)
  const on = (x: number, z: number) => wp3(x * 0.86, z, 4.2);
  const lower: [number, number, number, string, string | null][] = [
    [8, 16, 5, '#3E5A2A', '#C9BC92'],
    [15, 13, 4.4, '#5A3A1A', '#B04A3A'],
    [22, 18, 4.6, '#2E4A3A', null],
    [37, 12, 5, '#6E5A2A', '#D9D0B0'],
  ];
  for (const [x, h, w, g, lb] of lower) {
    const [bx, by] = on(x, 98);
    s += bottle(bx, by, h, w, g, lb);
  }
  // a pickling jar: green brine, one eyeball, one finger
  const [jx, jy] = on(30, 98);
  const jar = rect(jx - 4.4, jy - 12, jx + 4.4, jy);
  s += F(jar, '#6E9A4A', 0.8) + d.clip(jar, eyeball(jx - 1, jy - 7, 2.4, '#3A5A6A', 0.3, 0) + finger(jx + 1, jy - 1.6, -1.2, 6, 2.2) + F(rect(jx - 5, jy - 12, jx + 5, jy - 10), '#A8C88A', 0, 'opacity="0.6"'));
  s += L(`M${f(jx - 3)},${f(jy - 2)}V${f(jy - 10)}`, 0.7, '#FFFFFF', 'opacity="0.4"') + F(rect(jx - 4.8, jy - 14, jx + 4.8, jy - 12), '#6E6A60', 0.7);
  // upper shelf: a skull candle, a toxic-green bottle, two empties lying down
  const upper: [number, number, number, string, string | null][] = [
    [7, 18, 4.4, '#3E3A2A', '#C9BC92'],
    [13, 15, 5, '#7EAE30', '#2A2620'],
    [34, 17, 4.6, '#5A2A1A', '#C9BC92'],
  ];
  for (const [x, h, w, g, lb] of upper) {
    const [bx, by] = on(x, 128);
    s += bottle(bx, by, h, w, g, lb);
  }
  const [gx, gy] = on(13, 128);
  s += glow(d, F(rect(gx - 2.5, gy - 9, gx + 2.5, gy - 1), '#A6E040'), 1.6, 0.35);
  const [kx, ky] = on(23, 128);
  s += F(`M${f(kx - 4)},${f(ky - 2)}C${f(kx - 4.6)},${f(ky - 10)} ${f(kx + 4.6)},${f(ky - 10)} ${f(kx + 4)},${f(ky - 2)}L${f(kx + 2.4)},${f(ky)}L${f(kx - 2.4)},${f(ky)}Z`, '#C9BEA0', 0.8);
  s += F(ell(kx - 1.6, ky - 5, 1, 1.2), '#2A2418') + F(ell(kx + 1.6, ky - 5, 1, 1.2), '#2A2418');
  s += F(rect(kx - 0.6, ky - 13, kx + 0.6, ky - 8), '#D9D0B0', 0.4) + F(blob(kx, ky - 14.6, 0.8, 1.4, 3), '#E8B040') + F(`M${f(kx + 2)},${f(ky - 8)}q0.6,3 0,5`, '#D9D0B0', 0.4);
  const [lx, ly] = on(40, 128);
  s += F(capsule([lx - 5, ly - 2.2], [lx + 4, ly - 4], 4.2, 3.6), '#3E5A2A', 0.7) + L(`M${f(lx - 4)},${f(ly - 3.4)}L${f(lx + 2)},${f(ly - 4.6)}`, 0.5, '#FFFFFF', 'opacity="0.4"');
  // cobweb in the upper-left corner between shelf and wall
  s += L(`M${wp3(3, 152).map(f).join(',')}L${wp3(10, 140, 3).map(f).join(',')}M${wp3(3, 152).map(f).join(',')}L${wp3(4, 136, 2).map(f).join(',')}M${wp3(3, 152).map(f).join(',')}L${wp3(12, 150, 1).map(f).join(',')}`, 0.35, '#E8E4D8', 'opacity="0.75"');
  s += L(`M${wp3(3.6, 145, 1).map(f).join(',')}Q${wp3(6, 146, 1.4).map(f).join(',')} ${wp3(8, 148, 1).map(f).join(',')}M${wp3(4, 141, 1.6).map(f).join(',')}Q${wp3(7, 142, 2.2).map(f).join(',')} ${wp3(9.4, 145, 2).map(f).join(',')}`, 0.35, '#E8E4D8', 'opacity="0.7"');
  return s;
}

// ---------------------------------------------------------------- license_plates
function licensePlates(d: Doc, mir: boolean): string {
  let s = '';
  const plates: [number, number, string, string, string, number][] = [
    // x, z (bottom-left), plate colour, ink colour, text, tilt (deg)
    [3, 128, '#D6CDA8', '#2C4A6A', 'BRAINZ', -3],
    [25, 130, '#C9A83A', '#22201C', 'R0T 666', 4],
    [4, 112, '#8E9A7A', '#E8E2CC', 'UNDEAD', 2],
    [26, 111, '#DAD6C8', '#7A2A22', 'ZMB-01', -4],
    [14, 95, '#6E4A3A', '#D9D0B0', 'EAT ME', -2],
  ];
  plates.forEach(([x, z, col, ink, txt, tilt], k) => {
    const w = 20;
    const h = 11;
    const p = rect(x, -z - h, x + w, -z);
    const cx = x + w / 2;
    s += W(grp(F(p, '#1A140C'), 'translate(1.2 1.6)'), 0.4);
    let o = F(p, col, LW) + F(rect(x + 1.2, -z - h + 1.2, x + w - 1.2, -z - 1.2), 'none', 0) + L(rect(x + 1.2, -z - h + 1.2, x + w - 1.2, -z - 1.2), 0.4, dk(col, 0.35));
    o += F(rect(x + 2, -z - h + 1.6, x + w - 2, -z - h + 2.6), ink, 0, 'opacity="0.55"');
    o += unflip(L(textD(txt, cx, -z - 2.6, 4.2, { anchor: 'middle', wide: 0.78, gap: 0.3 }), 0.95, ink), mir, cx);
    o += rust(d, p, [[x + (k % 2 ? w - 3 : 3), -z - 2, 2.2], [x + w * 0.6, -z - h + 2, 1.4]], 9 + k);
    o += d.clip(p, F(blob(x + 4 + k * 3, -z - 5, 6, 2, k), '#2A1E10', 0, 'opacity="0.12"'));
    o += dot(x + 2, -z - h / 2, 0.8, '#3A3530') + dot(x + w - 2, -z - h / 2, 0.8, '#3A3530');
    // a dog-eared corner on some
    if (k % 2 === 0) o += F(`M${f(x + w)},${f(-z - h)}l-3.4,0l3.4,3.4Z`, dk(col, 0.4), 0.6);
    s += W(grp(o, `rotate(${tilt} ${f(cx)} ${f(-z - h / 2)})`), 1);
  });
  return s;
}

// ---------------------------------------------------------------- antlers
function antlers(d: Doc): string {
  const cx = 23;
  let s = '';
  const shield = `M${cx - 8},-122L${cx + 8},-122L${cx + 8},-110Q${cx + 8},-102 ${cx},-98Q${cx - 8},-102 ${cx - 8},-110Z`;
  s += W(grp(F(shield, '#1A140C'), 'translate(1.6 2)'), 0) + W(F(shield, '#4A2E18'), 1.5) + W(F(shield, '#4A2E18'), 2.4);
  let face = F(shield, '#6E4828', LW) + grain(d, shield, [cx - 8, -122, 16, 24], 8, 3, '#3A2412', '#9A7044', true);
  face += L(`M${cx - 6},-120L${cx + 6},-120L${cx + 6},-110Q${cx + 6},-104 ${cx},-100.6Q${cx - 6},-104 ${cx - 6},-110Z`, 0.5, '#B08452', 'opacity="0.6"');
  // skull cap where the antlers meet
  face += F(ell(cx, -118, 5, 3.6), '#C9BC96', 0.9) + F(ell(cx, -119, 3.6, 2), '#7A5A3A', 0, 'opacity="0.4"');
  s += W(face, 3);
  const bone = '#CDBF98';
  const tine = (p: string) => L(p, 3.4, INK) + L(p, 2, bone) + L(p, 0.6, '#EDE4C8', 'opacity="0.7"');
  // left beam with three tines; right beam snapped and taped
  let a = tine(`M${cx - 3},-120C${cx - 12},-124 ${cx - 18},-134 ${cx - 16},-152`);
  a += tine(`M${cx - 12},-127C${cx - 18},-130 ${cx - 20},-134 ${cx - 21},-140`);
  a += tine(`M${cx - 16},-138C${cx - 13},-144 ${cx - 11},-148 ${cx - 9},-156`);
  a += tine(`M${cx - 17},-146C${cx - 21},-150 ${cx - 22},-154 ${cx - 21},-160`);
  a += tine(`M${cx + 3},-120C${cx + 12},-124 ${cx + 16},-132 ${cx + 15},-144`);
  a += tine(`M${cx + 11},-127C${cx + 17},-130 ${cx + 19},-134 ${cx + 20},-139`);
  a += L(`M${cx + 15},-144l1.4,-1.2l-0.4,1.8l1.6,-0.2`, 0.6, INK); // the snapped end
  a += grp(tape([cx + 12, -138], [cx + 18, -137], 2.6), '');
  // a dead rat hung by its tail from the left tine
  const rx = cx - 21;
  a += L(`M${rx},-140Q${rx - 1},-134 ${rx},-130`, 0.7, '#B08A86');
  a += F(`M${rx - 2.4},-130C${rx - 3},-126 ${rx - 2},-121 ${rx},-120C${rx + 2},-121 ${rx + 3},-126 ${rx + 2.4},-130Z`, '#6E6660', 0.8);
  a += F(ell(rx - 1.8, -122, 1, 1), '#857B76', 0.5) + L(`M${rx - 0.4},-120.2l0,1.6`, 0.6, INK) + L(`M${rx - 1},-124l1.6,0`, 0.4, INK);
  s += W(a, 4);
  return s;
}

// ---------------------------------------------------------------- dartboard
function dartboard(d: Doc): string {
  const cx = 22;
  const z = 128;
  const r = 15;
  let s = wallShadow(d, poly(Array.from({ length: 16 }, (_, k) => wp3(cx + Math.cos((k / 16) * 6.283) * r, z + Math.sin((k / 16) * 6.283) * r, 0))), 4);
  s += disc(cx, z, r, 0, 3, '#2A2620');
  let b = F(ell(cx, -z, r, r), '#22201C', LW);
  const seg = (r0: number, r1: number, a0: number, a1: number) =>
    `M${f(cx + Math.cos(a0) * r0)},${f(-z + Math.sin(a0) * r0)}L${f(cx + Math.cos(a0) * r1)},${f(-z + Math.sin(a0) * r1)}A${f(r1)},${f(r1)} 0 0 1 ${f(cx + Math.cos(a1) * r1)},${f(-z + Math.sin(a1) * r1)}L${f(cx + Math.cos(a1) * r0)},${f(-z + Math.sin(a1) * r0)}A${f(r0)},${f(r0)} 0 0 0 ${f(cx + Math.cos(a0) * r0)},${f(-z + Math.sin(a0) * r0)}Z`;
  for (let k = 0; k < 20; k++) {
    const a0 = ((k - 0.5) / 20) * Math.PI * 2;
    const a1 = ((k + 0.5) / 20) * Math.PI * 2;
    const even = k % 2 === 0;
    b += F(seg(1.6, 11.6, a0, a1), even ? '#26231E' : '#CFC4A0');
    b += F(seg(11.6, 12.6, a0, a1), even ? '#7A2A22' : '#4F6A3A');
    b += F(seg(6.6, 7.6, a0, a1), even ? '#7A2A22' : '#4F6A3A');
  }
  b += F(ell(cx, -z, 1.6, 1.6), '#4F6A3A') + F(ell(cx, -z, 0.8, 0.8), '#7A2A22');
  b += L(ell(cx, -z, 12.6, 12.6), 0.4, '#8A8678') + L(ell(cx, -z, 7.6, 7.6), 0.3, '#8A8678');
  // number ring ticks (no digits: they'd read backwards on one wall)
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    b += dot(cx + Math.cos(a) * 13.8, -z + Math.sin(a) * 13.8, 0.45, '#BDB59A');
  }
  b += d.clip(ell(cx, -z, r, r), F(blob(cx + 4, -z + 5, 6, 4, 3), '#3A2A1A', 0, 'opacity="0.3"') + speckle(d, ell(cx, -z, 12, 12), [cx - 12, -z - 12, 24, 24], 30, ['#6E6A5A', '#141210'], 4, 0.3, 0.6));
  s += W(b, 3);
  // darts: shaft pokes out toward the room, flights at the end
  const dart = (x: number, zz: number, col: string) => {
    const a = wp3(x, zz, 3);
    const e = wp3(x - 3, zz + 2.4, 12);
    return L(`M${f(a[0])},${f(a[1])}L${f(e[0])},${f(e[1])}`, 1.6, INK) + L(`M${f(a[0])},${f(a[1])}L${f(e[0])},${f(e[1])}`, 0.8, '#9A9A90') + F(poly([[e[0] - 0.4, e[1] - 0.4], [e[0] + 3.4, e[1] - 3.4], [e[0] + 2, e[1] + 0.6]]), col, 0.6) + F(poly([[e[0], e[1]], [e[0] + 1.6, e[1] + 3.6], [e[0] + 2.8, e[1] + 0.4]]), dk(col, 0.3), 0.6);
  };
  // the third dart pins a severed finger to the bull
  s += finger(...wp3(cx + 1, z - 1, 3.4), 2.4, 7, 2.6);
  s += dart(cx + 1, z - 1, '#7A2A22') + dart(cx - 7, z + 6, '#4F6A3A') + dart(cx + 9, z - 7, '#2C6985');
  return s;
}

// ---------------------------------------------------------------- wall_guitar
function wallGuitar(d: Doc): string {
  let g = '';
  // body (double cut-away), tilted; drawn around (0, 0) then placed
  const body = 'M-11,6C-14,-2 -12,-10 -6,-11C-4,-13 -6,-17 -9,-19C-9,-22 -5,-22 -2,-18C1,-16 4,-16 6,-18C9,-22 13,-21 12,-17C9,-15 8,-12 10,-9C15,-6 15,4 10,8C5,13 -6,13 -11,6Z';
  const shadowG = grp(F(body, '#1A140C'), 'translate(1.8 2.4)');
  let b = F(body, d.radial(-1, -2, 16, [[0, '#8A3A2A'], [0.6, '#691122'], [1, '#2A0A0E']]), LW);
  b += F('M-8,4C-10,-2 -6,-6 -2,-5L2,-3C4,2 2,8 -4,9Z', '#D6CDB0', 0.6);
  b += F('M-3,-6h7v3h-7Z', '#2A2620', 0.5) + F('M-3,2h7v3h-7Z', '#2A2620', 0.5) + F('M-1,8h4v2h-4Z', '#8E8A80', 0.5);
  for (const [x, y] of [[7, 2], [8, 5], [9, -1]]) b += F(ell(x, y, 1, 1), '#C9C3A6', 0.4);
  b += F('M5,-10l3,-0.6l0.6,2.6l-3,0.6Z', '#C9A83A', 0.4) + F(ell(-6, -7, 1.6, 1.6), '#DAD6C8', 0.4) + F(ell(-6.4, -7.4, 0.5, 0.5), INK);
  // a bite out of the lower bout
  const bb = bite(d, 0, 0, 4.6, 2.3, 50, 212);
  const neck = 'M-1.4,-6L1.6,-6L2.2,-44L-1.8,-44Z';
  let n = F(neck, '#3A2414', 0.9);
  for (let k = 0; k < 9; k++) n += L(`M${f(-1.6)},${f(-9 - k * 3.8)}L${f(1.8)},${f(-9 - k * 3.8)}`, 0.4, '#B8B0A0');
  n += dot(0.2, -16, 0.4, '#DAD6C8') + dot(0.2, -24, 0.4, '#DAD6C8') + dot(0.2, -31, 0.4, '#DAD6C8');
  const head = 'M-2.6,-44L2.8,-44L4,-55L-1,-58L-3,-52Z';
  n += F(head, '#2A1A10', 0.9);
  for (let k = 0; k < 3; k++) n += F(ell(-3.6, -47 - k * 3, 1, 0.8), '#B8B0A0', 0.4) + F(ell(4.4, -47 - k * 3, 1, 0.8), '#B8B0A0', 0.4);
  // strings: five intact, one snapped and curling
  let st = '';
  for (let k = 0; k < 5; k++) st += L(`M${f(-1 + k * 0.6)},${f(6)}L${f(-1 + k * 0.6)},${f(-44)}`, 0.25, '#E8E4D8', 'opacity="0.8"');
  st += L('M2,-44Q6,-38 4,-34Q1,-30 5,-27', 0.3, '#E8E4D8');
  g += masked(b, bb.mask) + bb.ink(body) + n + st;
  // place: guitar centred x 24, body centre z 96, rotated a little
  const placed = grp(g, 'translate(24 -96) rotate(-10)');
  let s = W(grp(shadowG, 'translate(24 -96) rotate(-10)'), 0) + W(placed, 4);
  // the wall hook under the headstock
  s += L(`M${wp3(15, 147, 0).map(f).join(',')}L${wp3(15, 146, 5).map(f).join(',')}`, 1.6, INK) + L(`M${wp3(15, 147, 0).map(f).join(',')}L${wp3(15, 146, 5).map(f).join(',')}`, 0.8, '#8E8A80');
  return s;
}

// ---------------------------------------------------------------- posters
function paper(d: Doc, p: string, col: string, seed: number): string {
  return F(p, col, LW) + speckle(d, p, [0, -170, 50, 120], 50, [dk(col, 0.2), lt(col, 0.15)], seed, 0.3, 0.7) + d.clip(p, F(blob(14, -100, 10, 6, seed), '#6E5A34', 0, 'opacity="0.18"') + F(blob(36, -132, 7, 5, seed + 1), '#6E5A34', 0, 'opacity="0.15"'));
}
function posterBmovie(d: Doc, mir: boolean): string {
  const p = 'M5,-150L43,-152L44,-88L33,-87L30,-90L27,-86L6,-86Z';
  let s = W(grp(F(p, '#1A140C'), 'translate(1 1.4)'), 0) + W(F(p, '#2A2620'), 0.3);
  let o = F(p, '#1E2A2A', LW);
  const art = d.linear(0, -152, 0, -86, [[0, '#0E1414'], [0.5, '#2A4440'], [1, '#6E3A1E']]);
  o += F(p, art);
  // a huge zombie head looming over a drive-in
  o += d.clip(p, F('M8,-110C6,-138 42,-142 40,-110C40,-102 36,-100 34,-96L14,-96C12,-100 8,-102 8,-110Z', '#55704A', 0.9) + F('M14,-118l6,-2l-1,4Z', EYE_Z) + F('M28,-120l6,2l-6,2Z', EYE_Z) + glow(d, F('M14,-118l6,-2l-1,4ZM28,-120l6,2l-6,2Z', EYE_Z), 1.4, 0.8) + F('M16,-104h16l-2,4h-12Z', '#1A0A0A', 0.6) + L('M18,-104v3M21,-104v4M25,-104v4M28,-104v3', 0.6, '#D9D0B0') + L('M24,-136q2,6 -2,10', 0.5, '#2A3A20') + F('M6,-92h38v8h-38Z', '#1A140C'));
  for (let k = 0; k < 5; k++) o += d.clip(p, F(rect(8 + k * 7, -95, 11 + k * 7, -91), '#3A2A1A', 0.4));
  // title: small "NIGHT OF THE", big dripping "RIBS"
  let tt = lettering('NIGHT OF THE', 24, -142, 3.4, '#D9D0B0', 0.7, { anchor: 'middle', gap: 0.3, wide: 0.9 }, 0.5);
  tt += lettering('RIBS', 24, -125, 11, '#C0402E', 2, { anchor: 'middle', gap: 0.35 }, 0.8);
  tt += F('M14,-124q0.6,4 0,6q-1,-1 -0.6,-6ZM25,-124q0.8,5 0.2,8q-1.2,-2 -0.8,-8ZM33,-124q0.6,3 0,4.6q-1,-1 -0.6,-4.6Z', '#C0402E');
  tt += L(textD('NOW SHOWING', 24, -88.6, 2.4, { anchor: 'middle', gap: 0.3 }), 0.5, '#C9BC92');
  o += unflip(tt, mir, 24);
  // tape at the corners, a tear and a curl at the bottom-right
  o += F('M3,-153l6,1l-0.4,3l-6,-1Z', '#C9C3A6', 0.4, 'opacity="0.85"') + F('M39,-154l6,-0.4l0.2,3l-6,0.4Z', '#C9C3A6', 0.4, 'opacity="0.85"');
  o += F('M33,-87L30,-90L27,-86L31,-86Z', '#E2D8B8', 0.6);
  o += d.clip(p, F(blob(10, -140, 4, 3, 7), '#C9BC92', 0, 'opacity="0.2"') + L('M5,-120l38,-2', 0.4, '#000', 'opacity="0.35"'));
  s += W(o, 0.6);
  return s;
}
function posterWanted(d: Doc, mir: boolean): string {
  const p = 'M6,-148L42,-149L43,-96L40,-93L36,-96L31,-92L26,-95L20,-91L14,-95L8,-92L5,-95Z';
  let s = W(grp(F(p, '#1A140C'), 'translate(1 1.4)'), 0);
  let o = paper(d, p, '#C9B88A', 12);
  o += d.clip(p, F(p, d.radial(24, -122, 34, [[0, '#000', 0], [0.7, '#5A4422', 0.1], [1, '#5A4422', 0.5]])));
  let tt = lettering('WANTED', 24, -138, 6.4, '#2A2014', 1.3, { anchor: 'middle', gap: 0.25, wide: 0.86 }, 0);
  tt += L(`M10,-135.6H38`, 0.5, '#2A2014');
  tt += lettering('BRAINS', 24, -104, 5.4, '#6A1A14', 1.2, { anchor: 'middle', gap: 0.25, wide: 0.86 }, 0);
  tt += L(textD('$500 REWARD', 24, -98, 2.6, { anchor: 'middle', gap: 0.3 }), 0.55, '#2A2014');
  o += unflip(tt, mir, 24);
  // the mugshot: a brain in a box
  o += F(rect(13, -132, 35, -110), '#B8A678', 0.7);
  const brain = 'M16,-118C14,-124 18,-129 22,-128C24,-131 29,-130 30,-127C34,-127 35,-121 32,-119C33,-115 28,-113 25,-115C22,-112 17,-114 16,-118Z';
  o += F(brain, '#B88A88', 0.8) + L('M19,-126q2,2 0,4q-2,2 1,4M24,-129q-1,3 1,5q2,3 -1,6M28,-127q2,3 -1,4q-2,2 1,4', 0.5, '#7A4A4A') + L('M23,-115q0,3 -1,5', 1.2, '#9A6A6A');
  // nailed up with a kitchen knife
  o += F('M23,-151l2,0l0,4l-2,0Z', '#3A2A1A', 0.6) + F('M23.4,-147L24.6,-147L24.4,-142L23.6,-142Z', '#A8A8A0', 0.5);
  o += d.clip(p, F(blob(36, -104, 4, 6, 8), '#7A2A22', 0, 'opacity="0.35"'));
  s += W(o, 0.6);
  return s;
}

// ---------------------------------------------------------------- neon_pig
function neonPig(d: Doc): string {
  let s = '';
  // two rusty mounting rails behind the tubes
  for (const z of [124, 146]) {
    const rl = rect(4, -z - 2, 44, -z + 1);
    s += W(grp(F(rl, '#1A140C'), 'translate(1 1.6)'), 0) + W(F(rl, '#3A3732', 0.8) + rust(d, rl, [[8, -z, 1.4], [38, -z, 1.2]], z) + dot(6, -z - 0.5, 0.5, '#8E8A80') + dot(42, -z - 0.5, 0.5, '#8E8A80'), 1.4);
  }
  // pig outline: body, snout, ear, curly tail, legs; X-eye and stitches across the belly
  const body = 'M8,-136C7,-154 33,-158 39,-146C42.6,-146 45,-143.4 44.4,-139.6C44.4,-136 42.6,-134.4 39.6,-134.6C37,-126 31,-122 22,-122C13,-122 8.4,-127 8,-136Z';
  let tubes = neon(d, body, '#F08AA0', '#FFE6EC', 1.6);
  tubes += neon(d, 'M33,-152L35.6,-158.6L38.4,-149', '#F08AA0', '#FFE6EC', 1.4);
  tubes += neon(d, 'M8,-137C3.6,-137 2.6,-142 5,-143.4C7.4,-144.6 7.6,-139.6 4.6,-138.6', '#F08AA0', '#FFE6EC', 1.2);
  tubes += neon(d, 'M14,-123.4L14,-117M21,-122L21,-116M30,-122.6L30,-116.6M36,-125.4L37,-119.4', '#F08AA0', '#FFE6EC', 1.2, false);
  tubes += neon(d, 'M33,-147l3.6,3.6M36.6,-147l-3.6,3.6', '#9BE04A', '#EEFFD0', 1.1);
  tubes += neon(d, 'M42,-141.6v0.1M42,-137.6v0.1', '#F08AA0', '#FFE6EC', 1.1);
  tubes += neon(d, 'M15,-133l2.6,3.6M19.6,-134l2.6,3.6M24.2,-134.4l2.6,3.6M28.8,-134l2.4,3.4M14,-131.4L31,-132.6', '#9BE04A', '#EEFFD0', 0.8);
  s += W(tubes, 3.4);
  // tube clips
  for (const [x, y] of [[10, -128], [26, -153], [42, -136]] as [number, number][]) s += W(F(rect(x - 0.9, y - 0.9, x + 0.9, y + 0.9), '#8E8A80', 0.4), 3);
  return s;
}

// ---------------------------------------------------------------- skull_longhorn
function skullLonghorn(d: Doc): string {
  const cx = 21;
  const z = 128;
  let s = '';
  const horn = 'M0,0C-5,1 -10,1 -14,-1C-16,-2 -17,-4 -16.6,-7C-15.4,-5 -14.2,-4.4 -12,-4.4C-8,-4.6 -4,-4.8 1,-3.6Z';
  const skull = `M${cx - 6},${-z - 6}C${cx - 8},${-z + 4} ${cx - 4},${-z + 12} ${cx - 2.6},${-z + 20}C${cx - 2},${-z + 23} ${cx + 2},${-z + 23} ${cx + 2.6},${-z + 20}C${cx + 4},${-z + 12} ${cx + 8},${-z + 4} ${cx + 6},${-z - 6}C${cx + 3},${-z - 9} ${cx - 3},${-z - 9} ${cx - 6},${-z - 6}Z`;
  s += W(grp(F(skull, '#1A140C') + grp(F(horn, '#1A140C'), `translate(${cx - 5} ${-z - 4})`) + grp(F(horn, '#1A140C'), `translate(${cx + 5} ${-z - 4}) scale(-1 1)`), 'translate(1.6 2.4)'), 0);
  // rope from the nail
  s += L(`M${wp3(cx, z + 18, 0).map(f).join(',')}L${wp3(cx - 4, z + 4, 5).map(f).join(',')}M${wp3(cx, z + 18, 0).map(f).join(',')}L${wp3(cx + 4, z + 4, 5).map(f).join(',')}`, 0.8, '#8A7A50') + dot(...wp3(cx, z + 18, 0), 1, '#2A2620');
  const hornCol = '#CFC4A0';
  let h = grp(F(horn, d.linear(-17, 0, 0, 0, [[0, '#4A3A28'], [0.3, '#8E7E5E'], [1, hornCol]]), LW), `translate(${cx - 5} ${-z - 4})`);
  h += grp(F(horn, d.linear(-17, 0, 0, 0, [[0, '#3A2E20'], [0.3, '#7A6A4E'], [1, '#B2A684']]), LW), `translate(${cx + 5} ${-z - 4}) scale(-1 1)`);
  h += grp(L('M-4,-1.8Q-7,-2 -10,-0.6M-5.4,-3.4Q-8,-3.4 -11,-1.4', 0.4, '#6E5E44'), `translate(${cx - 5} ${-z - 4})`);
  s += W(h, 4);
  let k = F(skull, d.linear(cx - 8, 0, cx + 8, 0, [[0, '#E2D8B8'], [0.55, '#D2C6A2'], [0.65, '#B2A684'], [1, '#9A8E6E']]), LW);
  k += F(`M${cx - 5.6},${-z - 1}C${cx - 6},${-z + 3} ${cx - 2},${-z + 4} ${cx - 1.6},${-z + 1}C${cx - 2},${-z - 2} ${cx - 4},${-z - 3} ${cx - 5.6},${-z - 1}Z`, '#2A2014', 0.6);
  k += F(`M${cx + 5.6},${-z - 1}C${cx + 6},${-z + 3} ${cx + 2},${-z + 4} ${cx + 1.6},${-z + 1}C${cx + 2},${-z - 2} ${cx + 4},${-z - 3} ${cx + 5.6},${-z - 1}Z`, '#2A2014', 0.6);
  k += F(`M${cx - 1.6},${-z + 15}l1,4h1.2l1,-4Z`, '#2A2014', 0.5);
  k += d.clip(skull, crack(cx - 1, -z - 7, 1.3, 14, 4, 0.5, '#5A4A30', 1) + dot(cx + 3.4, -z + 8, 0.9, '#2A2014') + F(blob(cx - 3, -z + 10, 2, 3, 5), '#8A6A3A', 0, 'opacity="0.3"'));
  k += L(`M${cx - 5},${-z - 6}Q${cx},${-z - 8.4} ${cx + 5},${-z - 6}`, 0.5, '#F2EAD0', 'opacity="0.8"');
  s += W(k, 5);
  s += fly(...wp3(cx + 12, z + 12, 5), 0.9);
  return s;
}

// ---------------------------------------------------------------- menu_board
function menuBoard(d: Doc, mir: boolean): string {
  const fr = slab(d, 3, 42, 74, 146, 2.4, '#6E4828', '#4A2E18', '#8A5E34');
  let s = fr.s;
  const outer = rect(3, -146, 42, -74);
  const inner = rect(6, -143, 39, -78);
  let o = grain(d, outer, [3, -146, 42, 72], 20, 5, '#3A2412', '#9A7044');
  o += F(inner, '#2E3430', 0.8) + d.clip(inner, F(blob(18, -100, 12, 8, 3), '#5A625A', 0, 'opacity="0.35"') + F(blob(32, -130, 9, 5, 4), '#5A625A', 0, 'opacity="0.3"') + speckle(d, inner, [6, -143, 36, 65], 30, ['#6E766E', '#1E2420'], 6, 0.3, 0.6));
  const ch = '#E2E0D2';
  const chalk = (str: string, x: number, y: number, h: number, anchor: 'start' | 'middle' | 'end', seed: number, col = ch) => L(textD(str, x, y, h, { anchor, jitter: 0.5, seed, gap: 0.3, wide: 0.85 }), 0.7, col, 'opacity="0.92"');
  let tt = chalk('SPECIALS', 22.5, -134, 4.4, 'middle', 1);
  tt += L('M9,-131.4Q22,-133 36,-131', 0.5, ch, 'opacity="0.8"');
  const items: [string, string][] = [
    ['BRAINS', '5'],
    ['FINGERS', '3'],
    ['RIBS', '8'],
    ['GUTS', '2'],
  ];
  items.forEach(([n, p], k) => {
    const y = -123 + k * 8;
    tt += chalk(n, 9, y, 3.4, 'start', 10 + k) + chalk('$' + p, 37, y, 3.4, 'end', 20 + k, '#E8D07A');
  });
  tt += chalk('NO REFUNDS', 22.5, -83, 2.6, 'middle', 33, '#C98A8A');
  // a doodled zombie face in the corner
  tt += L('M31,-96c0,-4 6,-4 6,0c0,3 -1,4 -3,4c-2,0 -3,-1 -3,-4ZM32.4,-96.4l1,0.4M34.8,-96.6l1,0.4M32.6,-93.4l3,0', 0.5, '#9BE04A', 'opacity="0.8"');
  o += unflip(tt, mir, 22.5);
  o += L(outer, LW) + L(inner, 0.8);
  // chalk tray + stub
  s += W(o, 2.4);
  s += F(poly([wp3(5, 74, 2.4), wp3(40, 74, 2.4), wp3(40, 74, 5.6), wp3(5, 74, 5.6)]), '#5A3A1E', 0.8);
  s += F(poly([wp3(14, 74.6, 3.6), wp3(19, 74.6, 3.6), wp3(19, 74.6, 4.8), wp3(14, 74.6, 4.8)]), '#E2E0D2', 0.4);
  return s;
}

// ---------------------------------------------------------------- tv_wall
function tvWall(d: Doc): string {
  const x0 = 3;
  const x1 = 27;
  const z0 = 120;
  const z1 = 142;
  const nb = 5;
  const nf = 19;
  let s = '';
  // wall plate + bracket arm
  s += W(F(rect(12, -118, 20, -108), '#3A3732', 0.8) + dot(13.4, -116.6, 0.5, '#8E8A80') + dot(18.6, -109.4, 0.5, '#8E8A80'), 0.6);
  s += L(`M${wp3(16, 113, 1).map(f).join(',')}L${wp3(15, 118, 11).map(f).join(',')}`, 3, INK) + L(`M${wp3(16, 113, 1).map(f).join(',')}L${wp3(15, 118, 11).map(f).join(',')}`, 1.8, '#55524C');
  s += wallShadow(d, wq(x0, x1, z0, z1, 0), 8);
  // the CRT: a tapering back box, then the cabinet front
  const back = poly([wp3(x0 + 4, z0 + 3, nb), wp3(x0 + 4, z1 - 3, nb), wp3(x0, z1, nf - 6), wp3(x1, z1, nf - 6), wp3(x1, z0, nf - 6), wp3(x0, z0, nf - 6)]);
  s += F(back, '#3A3832', LW);
  s += F(poly([wp3(x0 + 4, z1 - 3, nb), wp3(x1 - 4, z1 - 3, nb), wp3(x1, z1, nf - 6), wp3(x0, z1, nf - 6)]), '#4A4740', 0.8);
  // cabinet: left side, top, front
  const left = poly([wp3(x0, z0, nf - 6), wp3(x0, z0, nf), wp3(x0, z1, nf), wp3(x0, z1, nf - 6)]);
  const top = poly([wp3(x0, z1, nf - 6), wp3(x1, z1, nf - 6), wp3(x1, z1, nf), wp3(x0, z1, nf)]);
  s += F(left, '#5E4630', 0.9) + F(top, '#7A5E40', 0.9) + grain(d, top, [0, 0, 60, 212], 8, 3, '#4A3420', '#9A7A54');
  const front = wq(x0, x1, z0, z1, nf);
  s += F(front, '#6A5038', LW);
  // screen with static and a faint glow
  const scr = 'M3,-138Q3,-140 5,-140H17Q19,-140 19,-138V-125Q19,-123 17,-123H5Q3,-123 3,-125Z';
  let sc = F(scr, '#6E7A78', 0.9);
  const r = rnd(4);
  let st = '';
  for (let k = 0; k < 140; k++) {
    const x = 3 + r() * 16;
    const y = -140 + r() * 17;
    st += `<rect x="${f(x)}" y="${f(y)}" width="${f(0.5 + r() * 1.2)}" height="0.5" fill="${['#D6DCD8', '#3A403E', '#A8B0AC', '#1E2422'][k % 4]}"/>`;
  }
  for (let k = 0; k < 9; k++) st += L(`M3,${f(-139 + k * 2)}H19`, 0.3, '#000', 'opacity="0.3"');
  st += F(rect(3, -133, 19, -131.6), '#E2E8E4', 0, 'opacity="0.4"');
  sc += d.clip(scr, st + F(scr, d.radial(9, -134, 12, [[0, '#FFF', 0.18], [1, '#000', 0.35]])));
  sc += L('M5,-138.6Q8,-139.4 10,-136', 0.8, '#FFFFFF', 'opacity="0.5"');
  // knobs + speaker grille
  sc += F(ell(21.6, -136, 1.2, 1.2), '#2A2620', 0.5) + F(ell(21.6, -131.6, 1.2, 1.2), '#2A2620', 0.5);
  for (let k = 0; k < 3; k++) sc += L(`M20.4,${-128 + k * 1.4}H22.8`, 0.4, '#2A2620');
  s += W(grp(sc, `translate(${x0} 0)`), nf);
  s += glow(d, W(grp(F(scr, '#C9D6D2'), `translate(${x0} 0)`), nf), 3, 0.25);
  // rabbit ears, one with a foil ball
  const a0 = wp3(x0 + 15, z1, nf - 3);
  s += L(`M${f(a0[0])},${f(a0[1])}l-7,-14M${f(a0[0])},${f(a0[1])}l5,-15`, 0.9, '#4A4740') + F(ell(a0[0] - 7, a0[1] - 14.6, 1.8, 1.6), '#B8BCB8', 0.5);
  s += F(ell(a0[0], a0[1], 2, 1.2), '#2A2620', 0.6);
  s += L(`M${f(a0[0] + 5)},${f(a0[1] - 15)}l0.8,-0.6`, 0.6, '#4A4740');
  // the cable drooping down the wall
  s += L(`M${wp3(x0 + 4, z0 + 2, nb).map(f).join(',')}Q${wp3(x0 + 6, 60, 2).map(f).join(',')} ${wp3(x0 + 3, 0, 1).map(f).join(',')}`, 1, INK);
  return s;
}

// ---------------------------------------------------------------- painting_zombie
function paintingZombie(d: Doc): string {
  const fr = slab(d, 4, 44, 84, 148, 3, '#A88A3A', '#6E5620', '#C9A84A');
  let s = fr.s;
  const outer = rect(4, -148, 44, -84);
  const inner = rect(8.4, -143.6, 39.6, -88.4);
  let o = F(outer, d.linear(4, -148, 44, -84, [[0, '#C9A84A'], [0.5, '#9A7A30'], [1, '#6E5620']]), LW);
  // carved frame corners
  for (const [x, y] of [[6, -146], [42, -146], [6, -86], [42, -86]] as [number, number][]) o += F(ell(x, y, 2, 2), '#D8BE6A', 0.5) + dot(x, y, 0.7, '#6E5620');
  o += L(rect(6, -146, 42, -86), 0.5, '#5A4618') + L(rect(7.2, -144.8, 40.8, -87.2), 0.4, '#E2CC80', 'opacity="0.6"');
  // canvas: dark umber, vignetted
  o += F(inner, d.radial(22, -122, 26, [[0, '#5A4632'], [0.7, '#2E2218'], [1, '#160F0A']]), 0.7);
  let p = '';
  // shoulders + coat, ruffled cravat, a medal
  p += F('M9,-88C10,-100 15,-104 24,-104C33,-104 38,-100 39,-88Z', '#2C3A4A', 0.6) + F('M18,-104L24,-96L30,-104L28,-88L20,-88Z', '#DAD6C8', 0.5);
  p += L('M20,-100q2,2 4,0q2,2 4,0M20,-96q2,2 4,0q2,2 4,0', 0.4, '#8E8A80') + F(ell(24, -93, 1.4, 1.4), '#7A2A22', 0.4) + F('M30,-97l2,0l-1,3Z', '#C9A84A', 0.4);
  // the head: long green face, white wig curls, monocle, one ear missing
  p += F('M15,-121C14,-134 17,-140 24,-140C31,-140 34,-134 33,-121C32,-114 29,-106 24,-105C19,-106 16,-114 15,-121Z', SKIN_Z, 0.7);
  p += F('M27,-136C30,-130 32,-122 31,-114C33,-120 34,-130 31,-136Z', SKIN_ZS, 0);
  for (const [x, y] of [[14, -132], [13.4, -126], [14.4, -120], [34, -132], [34.6, -126]] as [number, number][]) p += F(ell(x, y, 2.4, 2.6), '#D8D2C0', 0.5);
  p += F('M16,-136C16,-144 32,-144 32,-136C29,-139 19,-139 16,-136Z', '#D8D2C0', 0.5);
  p += F(ell(20.4, -127, 2, 1.4), EYE_Z, 0.4) + F(ell(27.6, -127, 2, 1.4), EYE_Z, 0.4);
  p += L('M17.6,-129.6l5,0.6M25,-129l5,-0.4', 0.6, INK) + L('M19,-125.4q1.4,1 3,0M26,-125.4q1.4,1 3,0', 0.4, '#2E5A2A');
  p += F(ell(27.6, -127, 3, 3), 'none', 0) + L(ell(27.6, -127, 3, 3), 0.7, '#C9A84A') + L('M30.6,-127q2,6 1,12', 0.3, '#C9A84A');
  p += L('M22,-120q2,2 4,0', 0.6, INK) + L('M20,-113q4,2 8,-0.6', 0.7, INK) + L('M21,-113v1.4M24.4,-112.4v1.4M26.6,-113v1.2', 0.4, '#D9D0B0');
  p += L('M17,-117l3,1M17.4,-115.4l1,-1.6M18.6,-116l1,-1.6', 0.4, INK);
  p += F(ell(33.4, -122, 1.2, 2), '#7A2A22', 0.4);
  o += d.clip(inner, p + F(inner, d.radial(24, -116, 30, [[0, '#000', 0], [0.7, '#000', 0.1], [1, '#000', 0.55]])));
  // craquelure + a slash through the canvas
  o += d.clip(inner, crack(10, -98, -0.4, 18, 5, 0.35, '#120C08', 1) + L('M34,-142L38,-130', 0.9, '#120C08') + L('M34.4,-142L38.4,-130', 0.4, '#C9B88A', 'opacity="0.5"'));
  // tiny brass plaque (blank, tarnished)
  o += F(rect(19, -86.4, 29, -84.4), '#B8A050', 0.4);
  o += d.clip(outer, sheen(d, outer, 4, -148, 40, 64, 2, 0.12, 5));
  s += W(o, 3);
  // cobweb in the top-left corner
  s += L(`M${wp3(4, 148, 3).map(f).join(',')}L${wp3(11, 140, 3).map(f).join(',')}M${wp3(4, 148, 3).map(f).join(',')}L${wp3(5, 138, 3).map(f).join(',')}M${wp3(5, 143, 3).map(f).join(',')}Q${wp3(7, 143, 3).map(f).join(',')} ${wp3(8, 144, 3).map(f).join(',')}`, 0.35, '#E8E4D8', 'opacity="0.8"');
  return s;
}

export function buildWallItems(): ArtAsset[] {
  return [
    ...pair('sign_neon', signNeon),
    ...pair('clock', clock, true),
    ...pair('bottle_shelf', bottleShelf, true),
    ...pair('license_plates', licensePlates),
    ...pair('antlers', antlers, true),
    ...pair('dartboard', dartboard, true),
    ...pair('wall_guitar', wallGuitar, true),
    ...pair('poster_bmovie', posterBmovie),
    ...pair('poster_wanted', posterWanted),
    ...pair('neon_pig', neonPig, true),
    ...pair('skull_longhorn', skullLonghorn, true),
    ...pair('menu_board', menuBoard),
    ...pair('tv_wall', tvWall, true),
    ...pair('painting_zombie', paintingZombie, true),
  ];
}
