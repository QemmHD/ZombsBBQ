/**
 * Floor decor, 1x1 floor objects (anchor = tile center, footprint diamond centred on it):
 * cactus, hay_bale, lamp_post (tall), gnome_zombie, flamingo_zombie, skeleton_statue, pumpkin_pile,
 * coffin_upright, slime_fountain, barrel_stack.
 */
import type { ArtAsset } from './types';
import { Doc, OUT, PW, P, S, capsule, ell, f, hl, hull, poly, rrect, zigzag } from './svg';
import type { Pt } from './svg';
import { BONE, GOO, GOO_D, T, WOOD, WOOD_D, WOOD_M, ZSKIN, ZSKIN_HI, blobs, circle, floorProp, rivet, rnd } from './propkit';

/** Zombie eye pair: yellow with tiny pupils, one droopy lid. */
function zEyes(x: number, y: number, gap: number, r = 1.8): string {
  let s = '';
  for (const [k, ex] of [[0, x - gap / 2], [1, x + gap / 2]] as [number, number][]) {
    s += P(ell(ex, y, r, r * 1.05), '#FFE14D', 0.7) + circle(ex + 0.3, y + 0.2, r * 0.32, OUT);
    if (k === 1) s += P(`M${f(ex - r - 0.3)},${f(y - 0.2)}A${f(r + 0.3)},${f(r + 0.3)} 0 0 1 ${f(ex + r + 0.3)},${f(y - 0.2)}Z`, ZSKIN[1], 0.7);
  }
  return s;
}

/** Terracotta pot like the plant's. Returns [svg, rimY]. */
function pot(d: Doc, cx: number, cy: number, rt = 12, hgt = 16): [string, number] {
  const top = cy - hgt;
  const path = `M${f(cx - rt)},${f(top)}L${f(cx - rt + 2.6)},${f(cy - 2)}Q${f(cx)},${f(cy + 3)} ${f(cx + rt - 2.6)},${f(cy - 2)}L${f(cx + rt)},${f(top)}Z`;
  let s = d.shaded(path, '#D9733F', '#B0532A', PW, [-2.4, 0]);
  s += S(`M${f(cx - rt + 1.2)},${f(top + 7)}Q${f(cx)},${f(top + 10)} ${f(cx + rt - 1.2)},${f(top + 7)}`, 0.8, '#B0532A');
  s += P(ell(cx, top, rt + 1.6, 4.6), '#E08A52', PW) + P(ell(cx, top + 0.4, rt - 1.2, 3), '#4A2E1C');
  return [s, top];
}

function decor(): ArtAsset[] {
  const out: ArtAsset[] = [];

  // ---- saguaro in a pot, wearing a tiny cowboy hat and a mustache
  out.push(
    floorProp('cactus', 92, (d, t) => {
      const [cx, cy] = t.p(0, 0);
      let s = P(ell(cx + 2, cy, 18, 7), OUT, 0, OUT, 'opacity="0.18"');
      const [ps, top] = pot(d, cx, cy);
      const g: [string, string] = ['#5DAF4A', '#3E8A35'];
      const armL = `M${f(cx - 4)},${f(top - 18)}H${f(cx - 11)}Q${f(cx - 16)},${f(top - 18)} ${f(cx - 16)},${f(top - 24)}V${f(top - 36)}a3.6,3.6 0 0 1 7.2,0V${f(top - 26)}H${f(cx - 4)}Z`;
      const armR = `M${f(cx + 4)},${f(top - 28)}H${f(cx + 10)}Q${f(cx + 15)},${f(top - 28)} ${f(cx + 15)},${f(top - 34)}V${f(top - 46)}a3.6,3.6 0 0 0 -7.2,0V${f(top - 36)}H${f(cx + 4)}Z`;
      const trunk = capsule([cx, top + 1], [cx, top - 56], 15, 14);
      s += ps;
      s += d.shaded(armL, g[0], g[1], PW, [-1.4, -1]) + d.shaded(armR, g[0], g[1], PW, [-1.4, -1]);
      s += d.shaded(trunk, g[0], g[1], PW, [-2.4, 0]);
      s += d.clip(trunk, S(`M${f(cx - 3.2)},${f(top - 60)}V${f(top)}M${f(cx + 1.6)},${f(top - 60)}V${f(top)}`, 0.8, '#7CC860'));
      // spines
      const R0 = rnd(5);
      for (let k = 0; k < 14; k++) {
        const x = cx + (R0() - 0.5) * 12;
        const y = top - 4 - R0() * 48;
        s += S(`M${f(x)},${f(y)}l-1.2,-0.8M${f(x)},${f(y)}l1.2,-0.8`, 0.45, '#F4F1E6');
      }
      // face: eyes + handlebar mustache
      s += circle(cx - 3, top - 40, 1.1, OUT) + circle(cx + 3, top - 40, 1.1, OUT) + circle(cx - 2.6, top - 40.4, 0.35, '#FFFFFF') + circle(cx + 3.4, top - 40.4, 0.35, '#FFFFFF');
      s += P(`M${f(cx)},${f(top - 36.4)}c-2,-1.6 -5,-1 -6,1.6c-0.4,1 -1.6,1 -2,0c0.6,2 3,2.6 4.6,1.4c1.2,-0.8 2.4,-1.6 3.4,-1.6c1,0 2.2,0.8 3.4,1.6c1.6,1.2 4,0.6 4.6,-1.4c-0.4,1 -1.6,1 -2,0c-1,-2.6 -4,-3.2 -6,-1.6z`, '#3E2414', 0.6);
      s += S(`M${f(cx - 1.6)},${f(top - 33)}q1.6,1 3.2,0`, 0.7, OUT);
      // pink flower on the right arm + tiny cowboy hat
      for (let q = 0; q < 5; q++) {
        const a = (q / 5) * Math.PI * 2;
        s += P(ell(cx + 11.4 + Math.cos(a) * 1.8, top - 48 + Math.sin(a) * 1.6, 1.4), '#FF6FA8', 0.5);
      }
      s += circle(cx + 11.4, top - 48, 0.9, '#FFD23D');
      s += `<g transform="rotate(-10 ${f(cx)} ${f(top - 60)})">${P(ell(cx, top - 58, 11, 2.8), '#8A5530', 1.2)}${P(`M${f(cx - 6)},${f(top - 58.6)}Q${f(cx - 6.4)},${f(top - 67)} ${f(cx)},${f(top - 66.4)}Q${f(cx + 6.4)},${f(top - 67)} ${f(cx + 6)},${f(top - 58.6)}Z`, '#A8693A', 1.2)}${S(`M${f(cx - 6)},${f(top - 60.6)}h12`, 1.4, '#3E2414')}${S(`M${f(cx - 1)},${f(top - 66)}q1,1.6 2,0`, 0.7, '#7A4524')}</g>`;
      return s;
    }),
  );

  // ---- hay bale with a pitchfork stuck in it
  out.push(
    floorProp('hay_bale', 72, (d, t) => {
      const Z = 24;
      let s = t.shadow(-0.4, 0.4, -0.26, 0.26, 0.18);
      s += t.box(-0.36, 0.36, -0.22, 0.22, 0, Z, '#EDCB66', '#D9AF45', '#BF9230');
      const R0 = rnd(17);
      const faceL = poly([t.p(-0.36, 0.22, 0), t.p(0.36, 0.22, 0), t.p(0.36, 0.22, Z), t.p(-0.36, 0.22, Z)]);
      const faceR = poly([t.p(0.36, -0.22, 0), t.p(0.36, 0.22, 0), t.p(0.36, 0.22, Z), t.p(0.36, -0.22, Z)]);
      const top = poly(t.quad(-0.36, 0.36, -0.22, 0.22, Z));
      let st = '';
      for (let k = 0; k < 40; k++) {
        const [x, y] = t.p(-0.36 + R0() * 0.72, 0.22, R0() * Z);
        st += S(`M${f(x)},${f(y)}l${f(3 + R0() * 3)},${f(1 + R0() * 2)}`, 0.6, k % 3 ? '#B88A2A' : '#F7DE8A');
      }
      s += d.clip(faceL, st);
      st = '';
      for (let k = 0; k < 26; k++) {
        const [x, y] = t.p(0.36, -0.22 + R0() * 0.44, R0() * Z);
        st += S(`M${f(x)},${f(y)}l${f(-2 - R0() * 2)},${f(1 + R0())}`, 0.6, k % 3 ? '#9E7420' : '#E0BA55');
      }
      s += d.clip(faceR, st);
      st = '';
      for (let k = 0; k < 34; k++) {
        const [x, y] = t.p(-0.36 + R0() * 0.72, -0.22 + R0() * 0.44, Z);
        st += S(`M${f(x)},${f(y)}l${f(3 + R0() * 3)},${f(1.5 + R0())}`, 0.6, k % 3 ? '#D9AF45' : '#FFF0A8');
      }
      s += d.clip(top, st);
      // twine
      for (const i of [-0.16, 0.16]) {
        s += t.line([i, -0.22, Z], [i, 0.22, Z], 1.2, '#7A4524') + t.line([i, 0.22, Z], [i, 0.22, 0], 1.2, '#7A4524');
      }
      // loose straws
      for (const [i, j, z, dx, dy] of [[-0.36, 0.1, 18, -4, -2], [0.36, 0.22, 6, 3, 3], [0.1, 0.22, 2, -2, 4], [0.36, -0.1, 22, 4, -3]] as number[][]) {
        const [x, y] = t.p(i, j, z);
        s += S(`M${f(x)},${f(y)}l${f(dx)},${f(dy)}`, 0.8, '#C99A30');
      }
      // pitchfork
      const [ax, ay] = t.p(0.02, -0.04, Z);
      s += S(`M${f(ax - 3)},${f(ay + 1)}l-1.4,2.6M${f(ax)},${f(ay + 1.4)}v3M${f(ax + 3)},${f(ay + 1)}l1.4,2.6`, 1, '#8E959E');
      s += S(`M${f(ax - 3.4)},${f(ay)}h6.8`, 1.6, OUT) + S(`M${f(ax - 3.4)},${f(ay)}h6.8`, 0.8, '#B9C0C8');
      s += S(`M${f(ax)},${f(ay)}L${f(ax + 9)},${f(ay - 44)}`, 3.6, OUT) + S(`M${f(ax)},${f(ay)}L${f(ax + 9)},${f(ay - 44)}`, 1.8, WOOD_M);
      return s;
    }),
  );

  // ---- tall street lamp with a "LOST: BRAIN" flyer
  out.push(
    floorProp('lamp_post', 162, (d, t) => {
      const [cx, cy] = t.p(0, 0);
      const glow = d.radial(cx, cy - 128, 40, [[0, '#FFE6A0', 0.6], [0.5, '#FFC23D', 0.18], [1, '#FFC23D', 0]]);
      let s = P(ell(cx, cy - 126, 40, 32), glow);
      s += P(ell(cx, cy + 1, 12, 5), OUT, 0, OUT, 'opacity="0.2"');
      s += t.cyl(d, 0, 0, 0.13, 0, 5, ['#3A4545', '#222A2A'], '#4A5656', PW);
      s += t.cyl(d, 0, 0, 0.08, 5, 12, ['#3A4545', '#222A2A'], '#4A5656', 1.6);
      s += d.shaded(`M${f(cx - 2.4)},${f(cy - 12)}V${f(cy - 112)}H${f(cx + 2.4)}V${f(cy - 12)}Z`, '#3A4545', '#222A2A', PW, [-1.2, 0]);
      for (const z of [40, 100]) s += P(rrect(cx - 4, cy - z, 8, 3, 1), '#3A4545', 1.2);
      // ladder bar + curly brackets
      s += S(`M${f(cx - 10)},${f(cy - 106)}H${f(cx + 10)}`, 3.4) + S(`M${f(cx - 10)},${f(cy - 106)}H${f(cx + 10)}`, 1.6, '#3A4545');
      s += S(`M${f(cx - 2)},${f(cy - 100)}q-8,0 -8,-6M${f(cx + 2)},${f(cy - 100)}q8,0 8,-6`, 1.4, '#3A4545');
      // lantern head
      const gx = cx;
      const gy = cy - 128;
      s += P(`M${f(gx - 7)},${f(gy + 12)}L${f(gx - 9.4)},${f(gy - 6)}H${f(gx + 9.4)}L${f(gx + 7)},${f(gy + 12)}Z`, '#FFF0B8', PW);
      s += P(`M${f(gx - 7)},${f(gy + 12)}L${f(gx - 9.4)},${f(gy - 6)}H${f(gx - 4)}L${f(gx - 3)},${f(gy + 12)}Z`, '#FFFFFF', 0, OUT, 'opacity="0.6"');
      s += S(`M${f(gx)},${f(gy - 6)}V${f(gy + 12)}`, 1, '#3A4545');
      s += P(ell(gx, gy + 4, 2.6, 4), '#FFC23D') + P(ell(gx, gy + 5, 1.2, 2), '#FFFFFF');
      s += P(rrect(gx - 8.4, gy + 11, 16.8, 3.6, 1), '#3A4545', 1.4);
      s += P(`M${f(gx - 12)},${f(gy - 5)}L${f(gx)},${f(gy - 15)}L${f(gx + 12)},${f(gy - 5)}Z`, '#3A4545', PW);
      s += P(ell(gx, gy - 16.6, 2, 2), '#3A4545', 1.2);
      s += S(`M${f(gx - 8)},${f(gy - 7)}L${f(gx)},${f(gy - 13)}`, 0.8, '#5E6E6E');
      // flyer on the pole
      const fy = cy - 58;
      s += `<g transform="rotate(4 ${f(cx)} ${f(fy)})">${P(rrect(cx - 6.6, fy - 8, 13.2, 15, 0.6), '#FFFDF4', 0.9)}${T(cx, fy - 4.2, 2.8, '#D7262E', 'LOST:')}${T(cx, fy - 0.8, 2.6, OUT, 'BRAIN')}${S(`M${f(cx - 2.6)},${f(fy + 2.6)}c-0.8,-1.4 0.6,-2.6 1.6,-1.8c0.6,-1 2.6,-1 2.8,0.2c1.2,-0.2 1.8,1 1,1.8`, 0.5, '#E07A9A')}${S(`M${f(cx - 5)},${f(fy + 5)}v2M${f(cx - 2.4)},${f(fy + 5)}v2M${f(cx + 0.2)},${f(fy + 5)}v2M${f(cx + 2.8)},${f(fy + 5)}v2`, 0.4, '#8E959E')}</g>`;
      s += rivet(cx, fy - 7, 0.6, '#8E959E', '#FFFFFF');
      return s;
    }),
  );

  // ---- zombie garden gnome hugging a brain
  out.push(
    floorProp('gnome_zombie', 64, (d, t) => {
      const [cx, cy] = t.p(0, 0);
      let s = P(ell(cx, cy, 15, 6.4), '#5DB548', PW) + P(ell(cx - 2, cy - 1, 11, 4), '#7CC24A');
      s += S(`M${f(cx - 12)},${f(cy + 1)}l1,-3l1,3M${f(cx + 10)},${f(cy + 2)}l1,-3l1,2.6`, 0.9, '#3E8A35');
      // boots
      s += P(ell(cx - 4.6, cy - 1.4, 3.6, 2), '#5A3418', 1.1) + P(ell(cx + 4.6, cy - 1.4, 3.6, 2), '#5A3418', 1.1);
      // coat
      const coat = `M${f(cx - 9)},${f(cy - 2)}Q${f(cx - 9)},${f(cy - 20)} ${f(cx)},${f(cy - 22)}Q${f(cx + 9)},${f(cy - 20)} ${f(cx + 9)},${f(cy - 2)}Z`;
      s += d.shaded(coat, '#3F7FD0', '#2A5A9E', PW, [-1.6, -1]);
      s += P(rrect(cx - 8.6, cy - 9, 17.2, 2.8, 0.8), '#3E2414', 0.8) + P(rrect(cx - 1.6, cy - 9.4, 3.2, 3.6, 0.6), '#FFC83D', 0.6);
      s += P(`M${f(cx + 2)},${f(cy - 4)}l2,1.6l-2,1z`, '#7FB8F0');
      // beard (tattered)
      const beard = poly([[cx - 7, cy - 22], [cx + 7, cy - 22], ...zigzag([cx + 6, cy - 14], [cx - 6, cy - 14], 4, 2.2)]);
      s += d.shaded(beard, '#F4F1EA', '#C9CED6', 1.2, [-1, -1]);
      // face
      const face = ell(cx, cy - 26.4, 7.4, 6.8);
      s += d.shaded(face, ZSKIN[0], ZSKIN[1], PW, [-1.2, -1]);
      s += zEyes(cx, cy - 27, 6, 1.6);
      s += P(ell(cx + 0.4, cy - 23.6, 2.8, 2.2), '#A8C870', 1) + hl(cx - 0.6, cy - 24.4, 0.8, 0.5, 0, 0.7);
      s += S(`M${f(cx - 6.4)},${f(cy - 24)}l2.6,1.6M${f(cx - 5.8)},${f(cy - 22.4)}l1,-1.6`, 0.6, OUT);
      // brain in its arms
      s += d.shaded(`M${f(cx - 6)},${f(cy - 12)}c-1.4,-3.4 2,-5.6 4,-4.4c1.2,-2 5.4,-1.6 6,0.6c2.6,-0.4 4,2.6 2.4,4.2c0.6,2.6 -2.6,3.6 -4,2.4c-1.4,1.6 -4.6,1.4 -5,-0.2c-2,0.2 -3.8,-0.8 -3.4,-2.6z`, '#F7A8C0', '#D97A98', 1.1, [-0.6, -0.6]);
      s += S(`M${f(cx - 3)},${f(cy - 12)}q1.6,-1 3,0t3,-0.4M${f(cx - 1)},${f(cy - 15)}q0.4,1.4 1.8,1.6`, 0.6, '#B8566F');
      s += P(ell(cx - 7, cy - 11, 2.4, 2), ZSKIN[0], 1) + P(ell(cx + 7.6, cy - 11.4, 2.4, 2), ZSKIN[0], 1);
      // hat: tall red cone, bent tip with a patch
      const hat = `M${f(cx - 8.6)},${f(cy - 31)}Q${f(cx - 5)},${f(cy - 47)} ${f(cx + 1)},${f(cy - 53)}Q${f(cx + 7)},${f(cy - 55)} ${f(cx + 9)},${f(cy - 49)}Q${f(cx + 5)},${f(cy - 49)} ${f(cx + 4)},${f(cy - 45)}Q${f(cx + 7)},${f(cy - 37)} ${f(cx + 8.6)},${f(cy - 31)}Z`;
      s += d.shaded(hat, '#E2343B', '#B3263A', PW, [-1.6, -0.6]);
      s += P(rrect(cx - 3, cy - 41, 4.6, 4, 0.6), '#FFC83D', 0.6) + S(`M${f(cx - 2.4)},${f(cy - 40)}l1,1M${f(cx + 0.8)},${f(cy - 40)}l-1,1`, 0.4);
      s += P(ell(cx, cy - 31.6, 9.4, 2.4), '#C92A33', 1.2);
      return s;
    }),
  );

  // ---- rotten lawn flamingo
  out.push(
    floorProp('flamingo_zombie', 76, (d, t) => {
      const [cx, cy] = t.p(0, 0);
      let s = P(ell(cx, cy, 12, 4.6), OUT, 0, OUT, 'opacity="0.18"');
      s += S(`M${f(cx - 2)},${f(cy)}L${f(cx - 1)},${f(cy - 20)}L${f(cx - 3)},${f(cy - 30)}M${f(cx + 3)},${f(cy)}L${f(cx + 2)},${f(cy - 30)}`, 1.4, OUT);
      s += S(`M${f(cx - 3)},${f(cy - 20)}l-4,-2`, 1.4, OUT);
      s += P(ell(cx - 0.6, cy + 0.4, 3, 1), '#4A2E1C') + P(ell(cx + 3, cy + 0.4, 2.4, 0.8), '#4A2E1C');
      const body = `M${f(cx - 12)},${f(cy - 36)}C${f(cx - 14)},${f(cy - 44)} ${f(cx - 2)},${f(cy - 46)} ${f(cx + 6)},${f(cy - 42)}C${f(cx + 11)},${f(cy - 40)} ${f(cx + 11)},${f(cy - 32)} ${f(cx + 4)},${f(cy - 29)}C${f(cx - 2)},${f(cy - 27)} ${f(cx - 10)},${f(cy - 29)} ${f(cx - 12)},${f(cy - 36)}Z`;
      s += d.shaded(body, '#F78FB3', '#D9648C', PW, [-1.4, -1.6]);
      s += P(`M${f(cx - 12)},${f(cy - 36)}l-5,-3l2,4l-3,1l5,1z`, '#F78FB3', 1.2);
      s += S(`M${f(cx - 6)},${f(cy - 37)}q4,-3 9,-1M${f(cx - 4)},${f(cy - 33)}q4,-2 8,0`, 0.8, '#D9648C');
      // rotten patch with stitches
      s += d.clip(body, P(ell(cx + 4, cy - 33, 5, 3.4), ZSKIN[0]) + S(`M${f(cx + 1)},${f(cy - 35)}l6,3`, 0.7, OUT) + S(`M${f(cx + 2)},${f(cy - 36)}l-0.6,1.6M${f(cx + 4)},${f(cy - 35)}l-0.6,1.6M${f(cx + 6)},${f(cy - 34)}l-0.6,1.6`, 0.5, OUT));
      // neck
      const neck = `M${f(cx + 6)},${f(cy - 41)}C${f(cx + 14)},${f(cy - 50)} ${f(cx + 2)},${f(cy - 56)} ${f(cx + 4)},${f(cy - 64)}C${f(cx + 5)},${f(cy - 68)} ${f(cx + 9)},${f(cy - 69)} ${f(cx + 11)},${f(cy - 67)}`;
      s += S(neck, 5.6, OUT) + S(neck, 3.4, '#F78FB3');
      s += P(rrect(cx + 5, cy - 54, 6, 3, 0.8), '#FFF4DC', 0.7, OUT, `transform="rotate(-30 ${f(cx + 8)} ${f(cy - 52)})"`);
      // head + beak
      s += d.shaded(ell(cx + 9, cy - 66, 4.4, 4), '#F78FB3', '#D9648C', 1.4, [-0.8, -0.8]);
      s += P(`M${f(cx + 12)},${f(cy - 68)}Q${f(cx + 19)},${f(cy - 68)} ${f(cx + 18)},${f(cy - 61)}Q${f(cx + 16)},${f(cy - 64)} ${f(cx + 12)},${f(cy - 64)}Z`, '#FFF4DC', 1.1);
      s += P(`M${f(cx + 16.4)},${f(cy - 66)}Q${f(cx + 18.6)},${f(cy - 65)} ${f(cx + 18)},${f(cy - 61)}Q${f(cx + 16.6)},${f(cy - 63)} ${f(cx + 15.2)},${f(cy - 63.6)}Z`, OUT);
      s += S(`M${f(cx + 6.4)},${f(cy - 68.4)}l2.4,2.4M${f(cx + 8.8)},${f(cy - 68.4)}l-2.4,2.4`, 0.9, OUT);
      // goo drip from the beak
      s += P(`M${f(cx + 17.6)},${f(cy - 61)}q-1.4,4 0,5q1.4,-1 0,-5z`, GOO, 0.7);
      return s;
    }),
  );

  // ---- skeleton statue on a plinth: chef hat, apron, BBQ fork with a sausage
  out.push(
    floorProp('skeleton_statue', 112, (d, t) => {
      const PZ = 14;
      let s = t.shadow(-0.3, 0.3, -0.3, 0.3, 0.18);
      s += t.box(-0.28, 0.28, -0.28, 0.28, 0, PZ, '#A4AAB0', '#8A9097', '#6C7279');
      s += t.box(-0.3, 0.3, -0.3, 0.3, PZ - 3, PZ, '#B9BFC4', '#9AA0A7', '#7E848B', 1.6);
      const [bx, by] = t.p(0.3, 0.06, 6);
      s += `<g transform="matrix(1 -0.5 0 1 ${f(bx - 9)} ${f(by + 2.4)})">${P(rrect(0, -3, 14, 5, 0.8), '#C9A04A', 0.7)}${T(7, 0.6, 2.6, '#5A3A10', 'CHEF BONES')}</g>`;
      const [sx, sy] = t.p(0, 0, PZ);
      const bone = (a: Pt, b: Pt, w: number) => S(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, w + 1.8) + S(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, w, BONE[0]);
      // legs
      s += bone([sx - 3.4, sy - 30], [sx - 4.4, sy - 16], 2.2) + bone([sx - 4.4, sy - 16], [sx - 4, sy - 2], 2) + bone([sx + 3.4, sy - 30], [sx + 5, sy - 16], 2.2) + bone([sx + 5, sy - 16], [sx + 4.4, sy - 2], 2);
      s += P(ell(sx - 5, sy - 1.4, 3.2, 1.6), BONE[0], 1) + P(ell(sx + 5.4, sy - 1.4, 3.2, 1.6), BONE[0], 1);
      s += P(ell(sx - 4.4, sy - 16, 1.6), BONE[0], 0.8) + P(ell(sx + 5, sy - 16, 1.6), BONE[0], 0.8);
      // pelvis + spine + ribs
      s += P(`M${f(sx - 6)},${f(sy - 33)}Q${f(sx)},${f(sy - 36)} ${f(sx + 6)},${f(sy - 33)}L${f(sx + 4)},${f(sy - 28)}Q${f(sx)},${f(sy - 30)} ${f(sx - 4)},${f(sy - 28)}Z`, BONE[0], 1.2);
      s += S(`M${f(sx)},${f(sy - 34)}V${f(sy - 56)}`, 3.4) + S(`M${f(sx)},${f(sy - 34)}V${f(sy - 56)}`, 1.8, BONE[0]);
      for (let k = 0; k < 3; k++) {
        const y = sy - 52 + k * 4;
        const w = 7 - k * 0.8;
        s += S(`M${f(sx)},${f(y)}q${f(-w)},0 ${f(-w)},3M${f(sx)},${f(y)}q${f(w)},0 ${f(w)},3`, 2.8) + S(`M${f(sx)},${f(y)}q${f(-w)},0 ${f(-w)},3M${f(sx)},${f(y)}q${f(w)},0 ${f(w)},3`, 1.3, BONE[0]);
      }
      // apron
      s += P(`M${f(sx - 5)},${f(sy - 44)}H${f(sx + 5)}L${f(sx + 7)},${f(sy - 24)}Q${f(sx)},${f(sy - 22)} ${f(sx - 7)},${f(sy - 24)}Z`, '#F4F1EA', 1.2);
      s += P(rrect(sx - 3, sy - 33, 6, 4, 0.8), '#E2343B', 0.7) + P(`M${f(sx)},${f(sy - 38.6)}c-1,-1.6 -3,-0.4 -1.4,1.2l1.4,1.4l1.4,-1.4c1.6,-1.6 -0.4,-2.8 -1.4,-1.2z`, '#E2343B');
      s += S(`M${f(sx - 5)},${f(sy - 44)}L${f(sx - 3)},${f(sy - 52)}M${f(sx + 5)},${f(sy - 44)}L${f(sx + 3)},${f(sy - 52)}`, 0.7, OUT);
      // left arm on hip, right arm raising the fork
      s += bone([sx - 6, sy - 53], [sx - 11, sy - 42], 1.8) + bone([sx - 11, sy - 42], [sx - 6, sy - 33], 1.6) + P(ell(sx - 6, sy - 33, 1.8), BONE[0], 0.8);
      s += bone([sx + 6, sy - 53], [sx + 12, sy - 62], 1.8) + bone([sx + 12, sy - 62], [sx + 14, sy - 74], 1.6);
      // BBQ fork held up, a sausage skewered on the prongs
      const fa: Pt = [sx + 12.6, sy - 66];
      const fb: Pt = [sx + 17.6, sy - 90];
      s += S(`M${f(fa[0])},${f(fa[1])}L${f(fb[0])},${f(fb[1])}`, 2.6) + S(`M${f(fa[0])},${f(fa[1])}L${f(fb[0])},${f(fb[1])}`, 1.2, '#C9CED6');
      s += S(`M${f(fb[0])},${f(fb[1])}l-2.2,-5.6M${f(fb[0])},${f(fb[1])}l1.8,-5.8`, 1.8) + S(`M${f(fb[0])},${f(fb[1])}l-2.2,-5.6M${f(fb[0])},${f(fb[1])}l1.8,-5.8`, 0.8, '#E6EAEE');
      s += P(rrect(fb[0] - 6, fb[1] - 6.6, 12, 4.2, 2), '#C2502E', 1.1, OUT, `transform="rotate(-12 ${f(fb[0])} ${f(fb[1] - 4.5)})"`) + S(`M${f(fb[0] - 3)},${f(fb[1] - 5.6)}h4`, 0.6, '#E87A50');
      s += P(rrect(fa[0] - 1.6, fa[1] - 1, 3.2, 9, 1.2), WOOD_M, 0.9, OUT, `transform="rotate(12 ${f(fa[0])} ${f(fa[1])})"`);
      s += P(ell(sx + 14, sy - 74.6, 2), BONE[0], 0.9);
      // skull: grinning, winking, with a toque
      const hy = sy - 63;
      s += P(`M${f(sx - 6)},${f(hy)}C${f(sx - 6.4)},${f(hy - 8)} ${f(sx + 6.4)},${f(hy - 8)} ${f(sx + 6)},${f(hy)}C${f(sx + 6)},${f(hy + 3)} ${f(sx + 4)},${f(hy + 3.4)} ${f(sx + 3.6)},${f(hy + 5.6)}H${f(sx - 3.6)}C${f(sx - 4)},${f(hy + 3.4)} ${f(sx - 6)},${f(hy + 3)} ${f(sx - 6)},${f(hy)}Z`, BONE[0], 1.4);
      s += P(ell(sx - 2.4, hy - 0.6, 1.7, 1.9), OUT) + S(`M${f(sx + 1)},${f(hy - 0.6)}q1.6,-1.4 3,0`, 1, OUT) + P(`M${f(sx)},${f(hy + 1.4)}l-0.8,1.4h1.6z`, OUT);
      s += S(`M${f(sx - 3)},${f(hy + 4)}h6M${f(sx - 1.4)},${f(hy + 3.2)}v1.8M${f(sx + 0.4)},${f(hy + 3.2)}v1.8M${f(sx + 2)},${f(hy + 3.2)}v1.8`, 0.6);
      s += blobs(d, [[sx - 4, hy - 10, 3.8], [sx + 0.4, hy - 12.4, 4.4], [sx + 4.4, hy - 10, 3.6]], '#FFFFFF', '#DDE2E8', 1.2, [-1, -1]);
      s += P(rrect(sx - 6, hy - 8.4, 12, 3.4, 1), '#FFFFFF', 1.2);
      return s;
    }),
  );

  // ---- jack-o'-lantern pile (one went zombie)
  out.push(
    floorProp('pumpkin_pile', 58, (d, t) => {
      const [cx, cy] = t.p(0, 0);
      const glow = d.radial(cx, cy - 14, 30, [[0, '#FFB23D', 0.45], [1, '#FF8A1F', 0]]);
      let s = P(ell(cx, cy - 12, 32, 22), glow) + P(ell(cx, cy, 24, 8), OUT, 0, OUT, 'opacity="0.18"');
      s += S(`M${f(cx - 22)},${f(cy + 2)}q6,-6 12,-2q4,3 9,-1`, 1.4, '#3E8A35') + P(ell(cx - 18, cy - 1, 3, 1.6), '#4E9A3A', 0.7);
      const pk = (x: number, y: number, rx: number, ry: number, tone: [string, string], face: number) => {
        let r = '';
        r += d.shaded(ell(x - rx * 0.42, y, rx * 0.62, ry), tone[0], tone[1], 1.6, [-1, -1]);
        r += d.shaded(ell(x + rx * 0.42, y, rx * 0.62, ry), tone[0], tone[1], 1.6, [-1, -1]);
        r += d.shaded(ell(x, y, rx * 0.6, ry * 1.04), tone[0], tone[1], 1.6, [-1, -1]);
        r += S(`M${f(x - 2)},${f(y - ry + 1)}q-3,-3 -1.6,-5`, 2.8) + S(`M${f(x - 2)},${f(y - ry + 1)}q-3,-3 -1.6,-5`, 1.4, '#5A8A30');
        const lit = '#FFD23D';
        if (face === 0) {
          r += P(`M${f(x - rx * 0.5)},${f(y - 2)}l2.4,-3.6l2.4,3.6z`, lit, 0.7) + P(`M${f(x + rx * 0.5 - 4.8)},${f(y - 2)}l2.4,-3.6l2.4,3.6z`, lit, 0.7);
          r += P(`M${f(x - rx * 0.5)},${f(y + 2)}Q${f(x)},${f(y + 7)} ${f(x + rx * 0.5)},${f(y + 2)}l-2,1.6l-1.6,-1.4l-1.8,1.6l-1.6,-1.4l-1.8,1.6z`, lit, 0.7);
        } else if (face === 1) {
          r += P(ell(x - 3.4, y - 2, 1.8, 2.2), lit, 0.7) + P(ell(x + 3.4, y - 2, 1.8, 2.2), lit, 0.7);
          r += P(`M${f(x - 4)},${f(y + 3)}h8l-1.6,2.4h-4.8z`, lit, 0.7) + S(`M${f(x - 1.4)},${f(y + 3)}v2.2M${f(x + 1.4)},${f(y + 3)}v2.2`, 0.7);
        } else {
          r += zEyes(x, y - 2.4, 6.4, 2) + S(`M${f(x - 4)},${f(y + 3)}q4,3 8,0`, 1) + S(`M${f(x - 7)},${f(y - 6)}l3,1.4M${f(x - 6.4)},${f(y - 4.6)}l0.6,-1.6`, 0.6);
          r += P(`M${f(x + 3)},${f(y + 4.4)}q-0.8,3 0.4,3.6q1,-0.8 0,-3.6z`, GOO, 0.6);
        }
        return r;
      };
      s += pk(cx - 11, cy - 9, 15, 9, ['#FF8A1F', '#D9611B'], 0);
      s += pk(cx + 12, cy - 7, 13, 8, ['#8DC63F', '#5E9A2A'], 2);
      s += pk(cx + 1, cy - 24, 12, 7.6, ['#FF9A2F', '#D9701B'], 1);
      return s;
    }),
  );

  // ---- upright coffin, lid swung open, a zombie peeking out
  out.push(
    floorProp('coffin_upright', 96, (d, t) => {
      const [cx, cy] = t.p(0, 0);
      let s = P(ell(cx, cy + 1, 22, 8), '#5A3A22', PW) + P(ell(cx - 2, cy, 16, 5), '#7A4F2E');
      s += S(`M${f(cx - 14)},${f(cy - 1)}l2,-1M${f(cx + 10)},${f(cy + 2)}l2,-1`, 0.8, '#3E2414');
      const H = 84;
      const hex = (x: number, y: number, w: number) =>
        poly([[x - w * 0.55, y], [x + w * 0.55, y], [x + w, y - H * 0.72], [x + w * 0.62, y - H], [x - w * 0.62, y - H], [x - w, y - H * 0.72]]);
      // box sides (depth to the back-right) then the satin interior
      s += P(hex(cx + 4, cy - 3, 14), '#3E1E14', PW);
      s += P(hex(cx, cy - 1, 14), '#6B3A2A', PW);
      const inner = hex(cx, cy - 4, 11);
      s += P(inner, '#5B2A6E', 1.2);
      let satin = '';
      for (let r = 0; r < 6; r++) for (let c = -1; c <= 1; c++) satin += circle(cx + c * 5 + (r % 2) * 2.5 - 1, cy - 12 - r * 11, 0.8, '#7A3A8C') + S(`M${f(cx + c * 5 + (r % 2) * 2.5 - 1)},${f(cy - 12 - r * 11)}l2,3`, 0.5, '#7A3A8C');
      s += d.clip(inner, satin);
      // the zombie: half a face around the right edge + fingers on the rim
      s += d.clip(inner, d.shaded(ell(cx + 6, cy - 62, 9, 10), ZSKIN[0], ZSKIN[1], PW, [-1.4, -1]) + P(ell(cx + 3.4, cy - 64, 2.4, 2.6), '#FFE14D', 0.8) + circle(cx + 4.2, cy - 63.6, 0.8, OUT) + P(`M${f(cx + 0.6)},${f(cy - 66.6)}h5.6`, 'none', 1) + S(`M${f(cx + 1)},${f(cy - 56)}q3,1.6 6,0`, 1) + P(`M${f(cx + 2)},${f(cy - 71)}q2,-4 6,-2q-2,-0.4 -2,1.6z`, '#3E2414', 0.8));
      s += P(`M${f(cx + 2.4)},${f(cy - 55)}q-0.6,3 0.6,3.6q1,-1 -0.6,-3.6z`, GOO, 0.5);
      for (let k = 0; k < 3; k++) s += P(rrect(cx + 8.6 + k * 0.2, cy - 50 + k * 3.2, 4.6, 2.6, 1.2), ZSKIN[0], 1);
      s += hl(cx + 3, cy - 66.6, 1, 0.5, 0, 0.8, ZSKIN_HI);
      // lid swung open to the left (seen nearly edge-on)
      const lid = poly([[cx - 8, cy - 1], [cx - 18, cy - 4], [cx - 24, cy - 3 - H * 0.72], [cx - 20, cy - 2 - H], [cx - 9, cy - 1 - H], [cx - 14, cy - 1 - H * 0.72]]);
      s += d.shaded(lid, '#7A4530', '#552C1E', PW, [-1.4, 0]);
      s += S(`M${f(cx - 17)},${f(cy - 46)}l0,-16M${f(cx - 20.4)},${f(cy - 56)}l6.4,1.6`, 1.8, '#FFC83D');
      s += rivet(cx - 8.6, cy - 16, 0.8, '#7A4F12', '#FFE48A') + rivet(cx - 9.6, cy - 70, 0.8, '#7A4F12', '#FFE48A');
      return s;
    }),
  );

  // ---- bubbling slime fountain
  out.push(
    floorProp('slime_fountain', 86, (d, t) => {
      const [cx, cy] = t.p(0, 0);
      const glow = d.radial(cx, cy - 20, 40, [[0, GOO, 0.4], [1, GOO, 0]]);
      let s = P(ell(cx, cy - 18, 44, 30), glow);
      s += t.rshadow(0.42, 0.18);
      s += t.cyl(d, 0, 0, 0.4, 0, 12, ['#A4AAB0', '#7C8287'], '#B9BFC4', PW);
      for (const k of [-20, -8, 4, 16]) s += S(`M${f(cx + k)},${f(cy + 9.6 - Math.abs(k) * 0.18)}v-10`, 0.7, '#7C8287');
      const pool = t.circ(0, 0, 11, 0.34);
      const [px, py] = t.p(0, 0, 11);
      s += P(pool, GOO_D, 1.2) + d.clip(pool, P(ell(px - 2, py - 1.6, 26, 10), GOO) + S(`M${f(px - 18)},${f(py + 2)}q6,-3 12,0t12,0`, 0.8, '#B8FFD0'));
      for (const [x, y, r] of [[-10, 2, 1.8], [12, -2, 1.4], [6, 4, 1.1], [-16, -3, 1.2]]) s += P(ell(px + x, py + y, r * 1.3, r), '#7CF0A8', 0.6, GOO_D) + circle(px + x - 0.4, py + y - 0.4, r * 0.35, '#FFFFFF');
      // pedestal + upper bowl
      s += t.cyl(d, 0, 0, 0.07, 11, 32, ['#A4AAB0', '#7C8287'], null, 1.6);
      s += P(t.circ(0, 0, 32, 0.2), '#7C8287', 1.4);
      const [ux0, uy0] = t.p(0, 0, 37.4);
      s += S(`M${f(ux0)},${f(uy0 - 2)}V${f(uy0 - 10)}`, 4, OUT) + S(`M${f(ux0)},${f(uy0 - 2)}V${f(uy0 - 10)}`, 2.2, '#A4AAB0');
      s += t.cyl(d, 0, 0, 0.2, 32, 38, ['#B9BFC4', '#8A9097'], '#C4C9CE', PW, -0.6);
      const [ux, uy] = t.p(0, 0, 37.4);
      s += P(ell(ux, uy, 11, 5), GOO, 1);
      // overflow drips + streams down into the pool
      s += P(`M${f(ux - 12)},${f(uy + 1)}q-1,8 0,22q1.6,-1 1.2,-10q0,-8 0.8,-12z`, GOO, 1) + P(`M${f(ux + 9)},${f(uy + 4)}q-0.6,10 0.6,18q1.4,-1 1,-8q0,-6 0.4,-10z`, GOO, 1);
      // skull spout spitting slime
      const sy = uy - 10;
      s += P(`M${f(ux - 5)},${f(sy)}C${f(ux - 5.4)},${f(sy - 9)} ${f(ux + 5.4)},${f(sy - 9)} ${f(ux + 5)},${f(sy)}C${f(ux + 5)},${f(sy + 3)} ${f(ux + 3)},${f(sy + 3)} ${f(ux + 3)},${f(sy + 5)}H${f(ux - 3)}C${f(ux - 3)},${f(sy + 3)} ${f(ux - 5)},${f(sy + 3)} ${f(ux - 5)},${f(sy)}Z`, '#B9BFC4', 1.3);
      s += P(ell(ux - 2, sy - 1, 1.5, 1.6), GOO_D) + P(ell(ux + 2, sy - 1, 1.5, 1.6), GOO_D) + circle(ux - 2, sy - 1, 0.6, '#B8FFD0') + circle(ux + 2, sy - 1, 0.6, '#B8FFD0');
      s += S(`M${f(ux)},${f(sy + 4)}q8,-10 14,2`, 3.6, OUT) + S(`M${f(ux)},${f(sy + 4)}q8,-10 14,2`, 2, GOO);
      s += S(`M${f(ux)},${f(sy + 4)}q-7,-9 -12,1`, 3.2, OUT) + S(`M${f(ux)},${f(sy + 4)}q-7,-9 -12,1`, 1.8, GOO);
      s += circle(ux + 6, sy - 8, 1, GOO, `stroke="${OUT}" stroke-width="0.6"`) + circle(ux - 8, sy - 6, 0.8, GOO, `stroke="${OUT}" stroke-width="0.6"`) + circle(ux + 2, sy - 12, 0.7, GOO, `stroke="${OUT}" stroke-width="0.5"`);
      return s;
    }),
  );

  // ---- three barrels stacked on their sides
  out.push(
    floorProp('barrel_stack', 66, (d, t) => {
      let s = t.shadow(-0.42, 0.42, -0.42, 0.42, 0.18);
      const rj = 0.19;
      const rz = rj * 54;
      const N = 32;
      const ring = (i: number, jc: number, zc: number, sc = 1): Pt[] =>
        Array.from({ length: N }, (_, k) => {
          const a = (k / N) * Math.PI * 2;
          return t.p(i, jc + rj * sc * Math.cos(a), zc + rz * sc * Math.sin(a));
        });
      const barrel = (jc: number, zc: number, mark: number) => {
        const i0 = -0.34;
        const i1 = 0.32;
        const body = poly(hull([...ring(i0, jc, zc), ...ring(i1, jc, zc), ...ring((i0 + i1) / 2, jc, zc, 1.1)]));
        let r = d.shaded(body, '#A8693A', '#74421F', PW, [-2, -2.4]);
        let st = '';
        for (const k of [-0.6, -0.2, 0.2, 0.6]) st += S(poly([t.p(i0, jc + rj * k, zc + rz), t.p(i1, jc + rj * k, zc + rz)]).replace('Z', ''), 0.7, '#5A3418');
        r += d.clip(body, st);
        for (const i of [i0 + 0.1, i1 - 0.1]) r += d.clip(body, S(poly(ring(i, jc, zc, 1.1)), 2.4, '#3E3E46') + S(poly(ring(i + 0.012, jc, zc, 1.1)), 0.6, '#8E959E'));
        // end cap
        const cap = poly(ring(i1, jc, zc));
        r += P(cap, '#C98B55', PW);
        const [ex, ey] = t.p(i1, jc, zc);
        r += d.clip(cap, S(`M${f(ex - 12)},${f(ey - 4)}l20,10M${f(ex - 12)},${f(ey + 2)}l20,10M${f(ex - 12)},${f(ey - 10)}l20,10`, 0.7, '#8A5530'));
        r += S(poly(ring(i1, jc, zc, 0.8)), 0.7, '#8A5530');
        if (mark === 0) r += `<g transform="matrix(1 -0.5 0 1 ${f(ex)} ${f(ey)})">${T(0, 2.2, 6, '#3E2414', 'XXX', 'opacity="0.8"')}</g>`;
        if (mark === 1) {
          r += `<g transform="matrix(1 -0.5 0 1 ${f(ex)} ${f(ey)})">${P('M-3.6,-1C-3.8,-5 3.8,-5 3.6,-1C3.6,1 2.4,1.2 2.2,2.6H-2.2C-2.4,1.2 -3.6,1 -3.6,-1Z', '#F2EBD7', 0.8)}${circle(-1.4, -1.4, 0.9, OUT)}${circle(1.4, -1.4, 0.9, OUT)}</g>`;
        }
        if (mark === 2) {
          r += P(rrect(ex - 1, ey + 2, 4, 2.4, 0.8), '#D9A520', 0.9) + P(`M${f(ex + 2)},${f(ey + 4.4)}q-1.2,3 0,4q1.2,-1 0,-4z`, GOO, 0.7);
        }
        return r;
      };
      // chocks
      s += t.box(-0.06, 0.06, -0.42, 0.42, 0, 3, WOOD, WOOD_M, WOOD_D, 1.4);
      s += barrel(-0.2, rz + 1, 0) + barrel(0.2, rz + 1, 1) + barrel(0, rz * 2.7 + 1, 2);
      return s;
    }),
  );
  return out;
}

export function decorProps(): ArtAsset[] {
  return decor();
}

