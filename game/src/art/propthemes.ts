/**
 * Theme floors and walls: roadhouse (dark stained planks, log-cabin walls with lanterns), diner
 * (black/white checker, teal & pink walls with a chrome stripe) and graveyard (mossy flagstones, crypt
 * stone walls with ivy and cobwebs). Same geometry and anchors as the shack keys in props.ts:
 * floor_<t>_a/_b are 96x48 diamonds (anchor .5/.5); wall_l_<t>, wall_r_<t>, wall_r_door_<t> are 48x144
 * (anchor .5/1) drawn in the WallF local frame (u 0..48 across, v 0..120 down).
 */
import type { ArtAsset } from './types';
import { WALL_H } from './types';
import { Doc, OUT, PW, P, S, ell, f, hl, poly, rrect } from './svg';
import type { Pt } from './svg';
import { DIAMOND, Iso, R, T, WallF, circle, rivet, rnd, tile, wallAsset } from './propkit';
import type { Side } from './propkit';

const FACE = R(0, 0, 48, WALL_H);

// ------------------------------------------------------------------ floors
function roadPlanks(t: Iso, seed: number, seams: number[], tones: string[]): string {
  const R0 = rnd(seed);
  let s = '';
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const j0 = -0.5 + r / rows;
    const j1 = j0 + 1 / rows;
    const jm = (j0 + j1) / 2;
    s += P(poly([t.p(-0.5, j0), t.p(0.5, j0), t.p(0.5, j1), t.p(-0.5, j1)]), tones[r]);
    // grain streaks
    for (let k = 0; k < 3; k++) {
      const jj = j0 + 0.05 + R0() * 0.15;
      const i0 = -0.5 + R0() * 0.6;
      s += t.line([i0, jj, 0], [i0 + 0.2 + R0() * 0.3, jj, 0], 0.55, k % 2 ? '#86552F' : '#4A2915', 'opacity="0.8"');
    }
    // lit top edge of each plank
    s += t.line([-0.5, j0 + 0.025, 0], [0.5, j0 + 0.025, 0], 0.7, '#8E5C34', 'opacity="0.7"');
    // butt seam + nail heads either side
    const sm = seams[r];
    s += t.line([sm, j0, 0], [sm, j1, 0], 1.1, '#2E1A0E');
    for (const di of [-0.045, 0.045]) {
      for (const dj of [-0.06, 0.06]) {
        const [x, y] = t.p(sm + di, jm + dj);
        s += rivet(x, y, 0.75, '#2A1A10', '#A88A66');
      }
    }
    s += t.line([-0.5, j1, 0], [0.5, j1, 0], 1.2, '#2E1A0E');
  }
  return s;
}

/** A knot in a plank (screen ellipse turned along the i axis). */
function knot(t: Iso, i: number, j: number): string {
  const [x, y] = t.p(i, j);
  return (
    `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3.4" ry="1.5" fill="#3E2213" transform="rotate(26.57 ${f(x)} ${f(y)})"/>` +
    `<ellipse cx="${f(x)}" cy="${f(y)}" rx="5" ry="2.4" fill="none" stroke="#86552F" stroke-width="0.6" transform="rotate(26.57 ${f(x)} ${f(y)})"/>`
  );
}

function checker(t: Iso, n: number, dark: string, light: string, phase = 0): string {
  let s = '';
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      const i0 = -0.5 + a / n;
      const j0 = -0.5 + b / n;
      s += P(poly(t.quad(i0, i0 + 1 / n, j0, j0 + 1 / n)), (a + b + phase) % 2 ? light : dark);
    }
  return s;
}

/** Flagstone set: each stone is a polygon in (i, j); drawn cel-shaded with moss. */
function flagstones(d: Doc, t: Iso, stones: [number, number][][], seed: number): string {
  const R0 = rnd(seed);
  const tones: [string, string][] = [
    ['#9EA3A8', '#7C8287'],
    ['#8E9499', '#6E747A'],
    ['#A7A69C', '#848276'],
    ['#959CA0', '#737A7F'],
  ];
  let s = P(DIAMOND, '#3F4A32');
  // soil speckles + grass in the gaps
  for (let k = 0; k < 16; k++) {
    const [x, y] = t.p(R0() - 0.5, R0() - 0.5);
    s += circle(x, y, 0.6 + R0() * 0.8, k % 2 ? '#56693E' : '#2F3826');
  }
  stones.forEach((st, k) => {
    const ci = st.reduce((a, q) => a + q[0], 0) / st.length;
    const cj = st.reduce((a, q) => a + q[1], 0) / st.length;
    const shrink = st.map(([i, j]) => t.p(ci + (i - ci) * 0.9, cj + (j - cj) * 0.9));
    const path = poly(shrink);
    const tn = tones[k % tones.length];
    s += d.shaded(path, tn[0], tn[1], 1.1, [-1.4, -1.6]);
    // pits and a crack
    const [px, py] = t.p(ci + (R0() - 0.5) * 0.12, cj + (R0() - 0.5) * 0.12);
    s += circle(px, py, 0.7, tn[1]) + circle(px + 4, py + 1.4, 0.5, tn[1]);
    if (k % 2 === 0) {
      const [ax, ay] = t.p(ci - 0.08, cj + 0.02);
      s += S(`M${f(ax)},${f(ay)}l3,1.2l1.6,-1l3,1.6l1.4,-0.6`, 0.6, '#5A6065');
    }
    // moss creeping over one edge
    const e = k % st.length;
    const a = shrink[e];
    const b = shrink[(e + 1) % shrink.length];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    s += d.clip(path, P(ell(mx, my, 6 + R0() * 4, 2.6 + R0() * 1.4), '#6E9A3E', 0, OUT, 'opacity="0.9"') + P(ell(mx - 1.4, my - 0.6, 3, 1.2), '#8DBB52', 0, OUT, 'opacity="0.8"'));
  });
  // tufts of grass between stones
  for (let k = 0; k < 4; k++) {
    const [x, y] = t.p((R0() - 0.5) * 0.85, (R0() - 0.5) * 0.85);
    s += S(`M${f(x - 2)},${f(y)}l0.6,-2.6l0.8,2.4l0.8,-3.2l0.8,3l1,-2.2`, 0.8, '#7AB548');
  }
  return s + S(DIAMOND, 1.1, '#2C3424', 'opacity="0.8"');
}

function floors(): ArtAsset[] {
  const out: ArtAsset[] = [];
  // ---- roadhouse: dark stained planks
  out.push(
    tile('floor_roadhouse_a', (_d, t) => {
      let s = roadPlanks(t, 5, [0.2, -0.24, 0.34, -0.06], ['#6E4126', '#5E361F', '#774A2B', '#633A22']);
      s += knot(t, -0.3, -0.18) + knot(t, 0.28, 0.36);
      return s + S(DIAMOND, 1.6, '#2E1A0E');
    }),
  );
  out.push(
    tile('floor_roadhouse_b', (_d, t) => {
      let s = roadPlanks(t, 9, [-0.3, 0.12, -0.14, 0.3], ['#633A22', '#774A2B', '#5E361F', '#6E4126']);
      s += knot(t, 0.05, -0.4);
      // a faint boot-heel scuff
      const [sx, sy] = t.p(0.2, -0.05);
      s += S(`M${f(sx - 6)},${f(sy + 1)}q6,-3.4 12,0`, 1.4, '#3A2112', 'opacity="0.55"');
      return s + S(DIAMOND, 1.6, '#2E1A0E');
    }),
  );
  // ---- diner: black & white checker (2x2 per tile so a/b both tile seamlessly)
  const diner = (d: Doc, t: Iso, extra: string) => {
    let s = checker(t, 2, '#26262E', '#F6F2EA');
    // grout + glossy floor wax streak
    s += t.line([0, -0.5, 0], [0, 0.5, 0], 0.7, '#8C8C96') + t.line([-0.5, 0, 0], [0.5, 0, 0], 0.7, '#8C8C96');
    s += d.clip(DIAMOND, P('M30,0L44,0L20,48L6,48Z', '#FFFFFF', 0, OUT, 'opacity="0.09"') + P('M50,0L55,0L31,48L26,48Z', '#FFFFFF', 0, OUT, 'opacity="0.08"'));
    // inner bevel on the white tiles
    for (const [a, b] of [[-0.5, 0], [0, -0.5]] as Pt[]) s += S(poly(t.quad(a + 0.03, a + 0.47, b + 0.03, b + 0.47)), 0.6, '#FFFFFF', 'opacity="0.9"');
    return s + extra + S(DIAMOND, 1.4, '#3A3A44');
  };
  out.push(tile('floor_diner_a', (d, t) => diner(d, t, hl(t.p(-0.25, 0.25)[0], t.p(-0.25, 0.25)[1], 5, 1.2, -26, 0.25))));
  out.push(
    tile('floor_diner_b', (d, t) => {
      const [sx, sy] = t.p(0.24, -0.22);
      return diner(d, t, S(`M${f(sx - 5)},${f(sy + 1)}q5,-2.6 10,0`, 1.2, '#8C8C96', 'opacity="0.35"'));
    }),
  );
  // ---- graveyard: mossy flagstones
  out.push(
    tile('floor_graveyard_a', (d, t) =>
      flagstones(
        d,
        t,
        [
          [[-0.5, -0.5], [0.06, -0.5], [0.02, 0.04], [-0.5, -0.04]],
          [[0.06, -0.5], [0.5, -0.5], [0.5, 0.1], [0.02, 0.04]],
          [[-0.5, -0.04], [0.02, 0.04], [-0.06, 0.5], [-0.5, 0.5]],
          [[0.02, 0.04], [0.5, 0.1], [0.5, 0.5], [-0.06, 0.5]],
        ],
        13,
      ),
    ),
  );
  out.push(
    tile('floor_graveyard_b', (d, t) => {
      let s = flagstones(
        d,
        t,
        [
          [[-0.5, -0.5], [0.5, -0.5], [0.5, -0.12], [-0.08, -0.06], [-0.5, -0.1]],
          [[-0.5, -0.1], [-0.08, -0.06], [-0.02, 0.5], [-0.5, 0.5]],
          [[-0.08, -0.06], [0.5, -0.12], [0.5, 0.5], [-0.02, 0.5]],
        ],
        29,
      );
      return s;
    }),
  );
  return out;
}

// ------------------------------------------------------------------ walls
/** Theme wall: `skin` paints the whole face in local coords (u, v); `deco3d` draws in screen coords. */
function themeWall(key: string, side: Side, skin: (d: Doc, W: WallF) => string, deco3d: (d: Doc, W: WallF) => string = () => '', shade = 0.12): ArtAsset {
  return wallAsset(key, side, (d, W) => {
    let s = W.flat(d.clip(FACE, skin(d, W)));
    if (side === 'l') s += W.flat(P(FACE, OUT, 0, OUT, `opacity="${shade}"`));
    s += deco3d(d, W);
    s += W.flat(S('M0,0H48', PW * 1.4) + S(`M0,${WALL_H}H48`, PW));
    return s;
  });
}

// ---- roadhouse: stacked logs with cream chinking
function logs(seed: number): string {
  const R0 = rnd(seed);
  let s = P(FACE, '#D2BC90');
  const top = 9;
  const lh = 12.8;
  for (let k = 0; k < 8; k++) {
    const v0 = top + k * lh;
    const tone = k % 2 ? '#8E5A32' : '#865330';
    s += P(rrect(-6, v0 + 0.9, 60, lh - 1.8, 5.4), tone, 1.1, '#3A2112');
    s += P(`M-6,${f(v0 + lh - 5)}H54V${f(v0 + lh - 1.6)}H-6Z`, '#6B4024', 0, OUT, 'opacity="0.75"');
    s += S(`M-6,${f(v0 + 2.8)}H54`, 1.2, '#B07A48', 'opacity="0.8"');
    for (let g = 0; g < 3; g++) {
      const u = R0() * 44;
      const vv = v0 + 4.2 + R0() * 4;
      s += S(`M${f(u)},${f(vv)}h${f(6 + R0() * 10)}`, 0.55, '#5A361E', 'opacity="0.85"');
    }
    if (R0() < 0.35) {
      const u = 6 + R0() * 36;
      const vv = v0 + lh / 2;
      s += P(ell(u, vv, 2, 1.6), '#5A361E') + S(ell(u, vv, 3.2, 2.6), 0.5, '#5A361E');
    }
    // chinking speckle
    s += S(`M${f(R0() * 40)},${f(v0 + lh - 0.4)}h3`, 0.6, '#F0E2C0');
  }
  // top beam + bottom sill
  s += P(`M0,0H48V${top}H0Z`, '#4A2C18') + S(`M0,2.4H48`, 1, '#6B4024') + S(`M0,${top}H48`, 1.4);
  s += P(`M0,${WALL_H - 8}H48V${WALL_H}H0Z`, '#3E2414') + S(`M0,${WALL_H - 8}H48`, 1.4) + S(`M0,${WALL_H - 5.6}H48`, 0.6, '#6B4024');
  return s;
}

/** Wall lantern: iron bracket + hanging glass lantern with a flame, glowing on the logs. */
function lantern(d: Doc, W: WallF, u: number, v: number): string {
  const glow = d.radial(u, v + 12, 22, [[0, '#FFC23D', 0.55], [0.6, '#FF8A1F', 0.12], [1, '#FF8A1F', 0]]);
  let s = W.flat(P(ell(u, v + 12, 22, 18), glow));
  s += W.flat(P(rrect(u - 2.2, v - 3, 4.4, 7, 1), '#2A2626', 1) + rivet(u, v - 0.4, 0.7));
  const [ax, ay] = W.p(u, v, 0);
  const [bx, by] = W.p(u, v - 1, 7);
  s += S(`M${f(ax)},${f(ay)}L${f(bx)},${f(by)}`, 3, OUT) + S(`M${f(ax)},${f(ay)}L${f(bx)},${f(by)}`, 1.4, '#3A3535');
  // hook + lantern body below the arm tip
  const x = bx;
  const y = by + 2;
  s += S(`M${f(x)},${f(y - 2)}v2.4`, 1, OUT);
  s += P(`M${f(x - 3.4)},${f(y + 3)}L${f(x)},${f(y)}L${f(x + 3.4)},${f(y + 3)}Z`, '#2A2626', 1);
  s += P(rrect(x - 3.6, y + 3, 7.2, 9.6, 1.6), '#FFE08A', 1.1);
  s += P(`M${f(x)},${f(y + 5)}q-2,3 0,5.4q2,-2.4 0,-5.4z`, '#FF8A1F') + P(`M${f(x)},${f(y + 7.4)}q-0.9,1.6 0,3q0.9,-1.4 0,-3z`, '#FFF7C8');
  s += S(`M${f(x - 3.6)},${f(y + 7.8)}h7.2M${f(x)},${f(y + 3)}v9.6`, 0.6, '#2A2626', 'opacity="0.6"');
  s += P(rrect(x - 4.2, y + 12, 8.4, 2.2, 0.8), '#2A2626', 1);
  return s;
}

// ---- diner: teal upper, chrome stripe, pink tiled wainscot, checker baseboard
function dinerSkin(): string {
  let s = P(FACE, '#3FB8AF');
  // faint vertical paint sheen + atomic starbursts
  s += P('M6,8H12V64H6Z', '#5ACAC1', 0, OUT, 'opacity="0.5"') + P('M30,8H33V64H30Z', '#5ACAC1', 0, OUT, 'opacity="0.4"');
  const star = (x: number, y: number, r: number) =>
    P(`M${f(x)},${f(y - r)}L${f(x + r * 0.22)},${f(y - r * 0.22)}L${f(x + r)},${f(y)}L${f(x + r * 0.22)},${f(y + r * 0.22)}L${f(x)},${f(y + r)}L${f(x - r * 0.22)},${f(y + r * 0.22)}L${f(x - r)},${f(y)}L${f(x - r * 0.22)},${f(y - r * 0.22)}Z`, '#BFF3EE');
  s += star(12, 20, 3.4) + star(38, 44, 2.6) + star(22, 54, 1.6) + circle(30, 26, 0.9, '#BFF3EE') + circle(6, 46, 0.7, '#BFF3EE');
  // top trim
  s += P('M0,0H48V7H0Z', '#F6F2EA') + S('M0,4.6H48', 1, '#E2343B') + S('M0,7H48', 1.2);
  // pink tiles
  s += P('M0,70H48V110H0Z', '#F49AC1');
  for (let v = 70; v < 110; v += 8) s += S(`M0,${v}H48`, 0.7, '#D4729E');
  for (let u = 0; u <= 48; u += 8) s += S(`M${u},70V110`, 0.7, '#D4729E');
  for (let v = 70; v < 110; v += 8) for (let u = 0; u < 48; u += 8) s += S(`M${u + 1.4},${v + 2.2}h3`, 0.6, '#FFD0E4', 'opacity="0.9"');
  // chrome stripe
  s += P('M0,62H48V71H0Z', '#C9CED6') + P('M0,62H48V64.4H0Z', '#F7F9FB') + P('M0,68.6H48V71H0Z', '#8E959E');
  s += P('M8,62L12,62L9,71L5,71Z', '#FFFFFF', 0, OUT, 'opacity="0.7"') + P('M30,62L32,62L29,71L27,71Z', '#FFFFFF', 0, OUT, 'opacity="0.6"');
  s += S('M0,62H48M0,71H48', 1, OUT);
  // checker baseboard
  s += P(`M0,110H48V${WALL_H}H0Z`, '#F6F2EA');
  for (let u = 0; u < 48; u += 5) s += P(R(u, (u / 5) % 2 ? 110 : 115, 5, 5), '#26262E');
  s += S('M0,110H48', 1.2);
  return s;
}

// ---- graveyard: crypt stone blocks (period-48 rows so segments tile), moss, ivy, cobwebs
function cryptSkin(_d: Doc, seed: number): string {
  const R0 = rnd(seed);
  let s = P(FACE, '#4A4F56');
  const tones: [string, string, string][] = [
    ['#8A9097', '#A4AAB0', '#6C7279'],
    ['#7F858C', '#99A0A6', '#62686F'],
    ['#949A9F', '#AEB3B8', '#757B81'],
    ['#868C8A', '#A0A6A2', '#686E6C'],
  ];
  const top = 8;
  const rh = 13;
  for (let k = 0; k < 8; k++) {
    const v0 = top + k * rh;
    const cuts: number[] = [];
    let u = R0() * 14;
    while (u < 48) {
      cuts.push(u);
      u += 14 + R0() * 9;
    }
    if (48 - cuts[cuts.length - 1] + cuts[0] < 8) cuts.pop();
    for (let c = 0; c < cuts.length; c++) {
      const a = cuts[c];
      const b = c + 1 < cuts.length ? cuts[c + 1] : cuts[0] + 48;
      const tn = tones[Math.floor(R0() * tones.length)];
      for (const sh of b > 48 ? [0, -48] : [0]) {
        const x = a + sh + 0.8;
        const w = b - a - 1.6;
        s += P(rrect(x, v0 + 0.8, w, rh - 1.6, 1.8), tn[0]);
        s += P(rrect(x, v0 + 0.8, w, 2.2, 1), tn[1]);
        s += P(`M${f(x)},${f(v0 + rh - 3.4)}H${f(x + w)}V${f(v0 + rh - 0.8)}H${f(x)}Z`, tn[2]);
        s += S(rrect(x, v0 + 0.8, w, rh - 1.6, 1.8), 0.6, '#3A3E44');
      }
      if (R0() < 0.3) {
        const cu = a + 3 + R0() * 6;
        s += S(`M${f(cu)},${f(v0 + 2)}l1.4,3l-1,2.4l1.6,3`, 0.6, '#4A4F56');
      }
      if (R0() < 0.4) s += circle(a + 4 + R0() * 8, v0 + 4 + R0() * 5, 0.6, '#5A5F66');
    }
  }
  // stone coping + plinth
  s += P(`M0,0H48V${top}H0Z`, '#A4AAB0') + S('M0,2H48', 0.8, '#C4C9CE') + S(`M0,${top}H48`, 1.3) + S('M14,0v8M37,0v8', 0.8, '#6C7279');
  s += P(`M0,${WALL_H - 8}H48V${WALL_H}H0Z`, '#3C4046') + S(`M0,${WALL_H - 8}H48`, 1.3);
  // moss climbing from the floor and seeping from joints
  const moss = 'M0,120V104Q4,98 8,103Q11,96 16,102Q20,99 22,104Q27,95 31,103Q36,100 38,105Q43,97 48,103V120Z';
  s += P(moss, '#5E8A34') + S(moss.replace('Z', ''), 0.8, '#3E6224') + S('M3,104q3,-3 5,0M18,103q3,-2 5,0M33,104q3,-3 6,0', 0.9, '#8DBB52');
  for (const [u, v] of [[12, 34], [40, 60], [26, 86], [6, 73]] as Pt[]) s += P(ell(u, v, 3.4, 1.2), '#6E9A3E', 0, OUT, 'opacity="0.85"');
  return s;
}

function ivy(seed: number, u0: number, len: number): string {
  const R0 = rnd(seed);
  let path = `M${u0},6`;
  let u = u0;
  let v = 6;
  const pts: Pt[] = [];
  while (v < len) {
    const du = (R0() - 0.5) * 10;
    path += `Q${f(u + du * 1.6)},${f(v + 5)} ${f(u + du)},${f(v + 10)}`;
    u += du;
    v += 10;
    pts.push([u, v]);
  }
  let s = S(path, 1.3, '#2F5220');
  const leaf = (x: number, y: number, a: number, c: string) =>
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})">${P('M0,0C-3,-1 -4,-4 -2,-5.4C-1,-6 0,-5 0,-4C0,-5 1,-6 2,-5.4C4,-4 3,-1 0,0Z', c, 0.7, '#22401A')}${S('M0,-0.6V-4', 0.5, '#22401A')}</g>`;
  pts.forEach(([x, y], k) => {
    s += leaf(x - 1, y - 5, -60 + R0() * 20, k % 2 ? '#4E9A3A' : '#5DB548');
    s += leaf(x + 1, y - 1, 50 + R0() * 30, k % 2 ? '#5DB548' : '#3E8A35');
  });
  s += leaf(u, v + 1, 180, '#4E9A3A');
  return s;
}

function cobweb(corner: 'l' | 'r'): string {
  const ux = corner === 'l' ? 0 : 48;
  const sx = corner === 'l' ? 1 : -1;
  const c: Pt = [ux, 8];
  let s = '';
  const L = 15;
  const angs = [0, 22, 45, 68, 90].map((a) => (a * Math.PI) / 180);
  const ends = angs.map((a): Pt => [c[0] + sx * Math.cos(a) * L, c[1] + Math.sin(a) * L]);
  for (const e of ends) s += S(`M${f(c[0])},${f(c[1])}L${f(e[0])},${f(e[1])}`, 0.5, '#F4F4F8');
  for (const r of [0.35, 0.62, 0.9]) {
    let d = '';
    for (let k = 0; k < angs.length; k++) {
      const p: Pt = [c[0] + sx * Math.cos(angs[k]) * L * r, c[1] + Math.sin(angs[k]) * L * r];
      if (k === 0) d += `M${f(p[0])},${f(p[1])}`;
      else {
        const pm = (angs[k] + angs[k - 1]) / 2;
        const q: Pt = [c[0] + sx * Math.cos(pm) * L * r * 0.8, c[1] + Math.sin(pm) * L * r * 0.8];
        d += `Q${f(q[0])},${f(q[1])} ${f(p[0])},${f(p[1])}`;
      }
    }
    s += S(d, 0.45, '#F4F4F8');
  }
  // dangling spider
  const spx = c[0] + sx * 10;
  s += S(`M${f(spx)},${f(c[1] + 6)}V${f(c[1] + 18)}`, 0.35, '#F4F4F8');
  s += S(`M${f(spx - 2.4)},${f(c[1] + 17)}l1,1.6M${f(spx + 2.4)},${f(c[1] + 17)}l-1,1.6M${f(spx - 2.6)},${f(c[1] + 20)}l1.2,-1M${f(spx + 2.6)},${f(c[1] + 20)}l-1.2,-1`, 0.6, '#1C1418');
  s += P(ell(spx, c[1] + 19, 1.5, 1.7), '#1C1418') + circle(spx - 0.5, c[1] + 18.6, 0.35, '#E2343B') + circle(spx + 0.5, c[1] + 18.6, 0.35, '#E2343B');
  return `<g opacity="0.9">${s}</g>`;
}

/** Dark door opening (u 10..38, v top..120) shared by the doors. */
function holeGrad(d: Doc, top: number): string {
  return d.linear(0, top, 0, WALL_H, [[0, '#120B09'], [1, '#3A2620']]);
}

function walls(): ArtAsset[] {
  const out: ArtAsset[] = [];
  // ---------- roadhouse
  for (const side of ['l', 'r'] as Side[]) {
    out.push(themeWall(`wall_${side}_roadhouse`, side, () => logs(side === 'l' ? 3 : 8), (d, W) => lantern(d, W, 24, 13)));
  }
  out.push(
    themeWall('wall_r_door_roadhouse', 'r', (d) => {
      let s = logs(21);
      const hole = 'M10,30H38V120H10Z';
      s += P(hole, holeGrad(d, 30));
      // outside glimpse: dusty ground and daylight at the bottom
      s += P('M10,104H38V120H10Z', '#C9A46A', 0, OUT, 'opacity="0.35"');
      // batwing saloon doors, slightly ajar
      const wing = (u0: number, u1: number, flip: boolean) => {
        const topL = flip ? 56 : 52;
        const topR = flip ? 52 : 56;
        let w = P(`M${u0},${topL}Q${(u0 + u1) / 2},${(topL + topR) / 2 - 5} ${u1},${topR}V92H${u0}Z`, '#B07A48', 1.4);
        for (let u = u0 + 3; u < u1 - 1; u += 3) w += S(`M${u},${Math.max(topL, topR) - 1}V89`, 0.8, '#7A4524');
        w += P(R(u0 + 1, 74, u1 - u0 - 2, 3), '#8E5A32', 0.8) + rivet(u0 + 2.4, 75.5, 0.6) + rivet(u1 - 2.4, 75.5, 0.6);
        return w;
      };
      s += wing(10.5, 22.5, false) + wing(26.5, 37.5, true);
      s += S('M10,58v4M10,84v4M38,58v4M38,84v4', 1.6, '#2A2626');
      // frame posts + header beam
      s += P('M5,30H10V120H5Z', '#6B4024', 1.2) + P('M38,30H43V120H38Z', '#5A361E', 1.2);
      s += P('M3,24H45V30H3Z', '#4A2C18', 1.3) + S('M3,26H45', 0.7, '#6B4024');
      for (const u of [8, 40]) s += rivet(u, 27, 0.8);
      // lucky horseshoe over the door (upside down — luck ran out)
      s += P('M18.6,10a5.4,5.4 0 0 0 10.8,0l-2.6,0a2.8,2.8 0 0 1 -5.6,0Z', '#9AA1AB', 1);
      s += rivet(19.8, 11, 0.5) + rivet(28.2, 11, 0.5) + rivet(24, 15, 0.5);
      return s;
    }),
  );
  // ---------- diner
  for (const side of ['l', 'r'] as Side[]) out.push(themeWall(`wall_${side}_diner`, side, () => dinerSkin()));
  out.push(
    themeWall('wall_r_door_diner', 'r', (d) => {
      let s = dinerSkin();
      // chrome frame
      s += P('M7,24H41V120H7Z', '#C9CED6', 1.4) + S('M8.4,25.4V120', 1, '#F7F9FB');
      const glass = 'M11,28H37V116H11Z';
      s += P(glass, d.linear(0, 28, 0, 116, [[0, '#9EE6FF'], [0.6, '#D9F6FF'], [1, '#B6E8C8']]), 1.2);
      // outside: sidewalk and a lamp post silhouette
      s += d.clip(glass, P('M11,100H37V116H11Z', '#C9C6BE') + P('M28,58H30V100H28Z', '#6B8FA0', 0, OUT, 'opacity="0.5"') + P(ell(29, 56, 3, 2), '#6B8FA0', 0, OUT, 'opacity="0.5"'));
      s += d.clip(glass, P('M13,116L31,28H37L19,116Z', '#FFFFFF', 0, OUT, 'opacity="0.35"') + P('M25,116L37,60V70L29,116Z', '#FFFFFF', 0, OUT, 'opacity="0.3"'));
      // OPEN neon sign hanging in the glass
      const blur = d.blur(1.2);
      s += S('M17,30L19,38M31,30L29,38', 0.5, '#3A3A44');
      s += P(rrect(14, 38, 20, 9, 2), '#2B1B17', 1);
      s += `<g filter="${blur}">${T(24, 45, 6, '#FF4A6A', 'OPEN', 'stroke="#FF4A6A" stroke-width="1.6"')}</g>` + T(24, 45, 6, '#FFE0E8', 'OPEN');
      // push bar + kick plate
      s += P(rrect(12, 72, 24, 3.4, 1.6), '#E6EAEE', 1.1) + S('M13.4,72.8h21', 0.6, '#FFFFFF');
      s += P('M11,106H37V116H11Z', '#B9C0C8', 1) + S('M12,108h24', 0.6, '#F7F9FB') + rivet(13, 111, 0.6) + rivet(35, 111, 0.6);
      s += P(rrect(14, 60, 8, 4, 0.8), '#FFC83D', 0.7) + T(18, 63.2, 2.6, OUT, 'PUSH');
      // little bell above the door
      s += S('M24,13v4', 0.8) + P('M21,21q0,-4.6 3,-4.6q3,0 3,4.6z', '#FFC83D', 0.9) + circle(24, 21.6, 0.9, '#D9971A');
      return s;
    }),
  );
  // ---------- graveyard
  out.push(themeWall('wall_l_graveyard', 'l', (d) => cryptSkin(d, 7) + ivy(4, 34, 40)));
  out.push(themeWall('wall_r_graveyard', 'r', (d) => cryptSkin(d, 17) + cobweb('r')));
  out.push(
    themeWall('wall_r_door_graveyard', 'r', (d) => {
      let s = cryptSkin(d, 31) + ivy(5, 42, 30);
      // arch stones
      const archOuter = 'M5,120V48A19,19 0 0 1 43,48V120Z';
      s += P(archOuter, '#8A9097', 1.3);
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI + (k / 8) * Math.PI;
        s += S(`M${f(24 + Math.cos(a) * 14)},${f(48 + Math.sin(a) * 14)}L${f(24 + Math.cos(a) * 19)},${f(48 + Math.sin(a) * 19)}`, 0.8, '#4A4F56');
      }
      s += S('M5,64H10M5,82H10M5,100H10M38,64H43M38,82H43M38,100H43', 0.8, '#4A4F56');
      const hole = 'M10,120V48A14,14 0 0 1 38,48V120Z';
      s += P(hole, holeGrad(d, 34), 1.3);
      // glowing eyes in the dark
      const blur = d.blur(1);
      s += `<g filter="${blur}">${P(ell(19, 76, 2.6, 1.6), '#FFE14D')}${P(ell(26, 76, 2.6, 1.6), '#FFE14D')}</g>`;
      s += P(ell(19, 76, 1.8, 1.1), '#FFF6B0') + P(ell(26, 76, 1.8, 1.1), '#FFF6B0') + circle(19.4, 76, 0.5, OUT) + circle(26.4, 76, 0.5, OUT);
      // iron gate swung open against the right jamb
      let gate = '';
      for (const u of [32.5, 34.5, 36.5]) gate += S(`M${u},${u === 34.5 ? 50 : 52}V120`, 1.3, '#2A2A30') + P(`M${u - 1},${u === 34.5 ? 51 : 53}l1,-3l1,3z`, '#2A2A30');
      s += gate + S('M32,70H37.5M32,104H37.5', 1.1, '#2A2A30');
      // keystone skull
      s += P('M19.5,27L28.5,27L27,36H21Z', '#A4AAB0', 1.2);
      s += P('M21.6,30.6a2.4,2.2 0 0 1 4.8,0v1.6h-4.8z', '#EDE6D3', 0.6) + circle(23, 30.8, 0.6, OUT) + circle(25, 30.8, 0.6, OUT) + S('M22.4,32.2v1.2M24,32.2v1.2M25.6,32.2v1.2', 0.4);
      // R.I.P. above
      s += T(24, 22.4, 4.4, '#4A4F56', 'R.I.P.');
      return s;
    }),
  );
  return out;
}

export function themeProps(): ArtAsset[] {
  return [...floors(), ...walls()];
}
