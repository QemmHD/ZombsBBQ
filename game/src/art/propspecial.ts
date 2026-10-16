/**
 * Special items (1x1 floor objects, anchor = tile center): money-makers atm, vending ("BRAIN-ADE"),
 * jukebox, arcade ("ZOMBIE PANIC") and the pet houses pethouse_pug / pethouse_kennel.
 * Machines face +i (their front is the screen lower-right face), like the fridge, so they read well
 * standing against the back-left wall; flip the sprite for the back-right wall.
 */
import type { ArtAsset } from './types';
import { OUT, PW, P, S, ell, f, hl, hull, poly, rrect } from './svg';
import type { Pt } from './svg';
import { CHROME, CHROME_HI, FONT, GOO, GOO_D, R, T, TO, WOOD, WOOD_D, WOOD_M, ZSKIN, circle, floorProp, frontI, frontJ, onFace, rivet } from './propkit';

/** Green zombie handprint (local coords). */
function handprint(x: number, y: number, sc = 1, rot = 0, o = 0.75): string {
  return (
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(sc)})" opacity="${o}">` +
    P(ell(0, 0, 2.6, 3), '#7CC24A') +
    S('M-2.2,-2.4l-0.8,-3.4M-0.7,-3l-0.3,-3.8M0.9,-3l0.3,-3.6M2.3,-2.2l1,-3M2.6,0.4l2.6,-1.4', 1.3, '#7CC24A') +
    `</g>`
  );
}

function specials(): ArtAsset[] {
  const out: ArtAsset[] = [];

  // ---- battered ATM covered in zombie hand prints
  out.push(
    floorProp('atm', 92, (_d, t) => {
      const Z = 66;
      let s = t.shadow(-0.38, 0.38, -0.38, 0.38, 0.2);
      s += t.box(-0.32, 0.32, -0.34, 0.34, 0, 4, '#2B2B33', '#2B2B33', '#1C1C22', 1.6);
      s += t.box(-0.3, 0.3, -0.32, 0.32, 4, Z, '#6E7A86', '#5A6672', '#46515C');
      // lit header on top
      s += t.box(-0.32, 0.32, -0.34, 0.34, Z, Z + 10, '#3F7FD0', '#3A72BC', '#2A5A9E', 1.6);
      s += frontI(t, 0.32, -0.34, 0.34, Z, Z + 10, (w, h) => T(w / 2, h - 2.6, 7.4, '#FFFFFF', 'ATM', 'letter-spacing="1"') + P(R(2, 1.4, w - 4, 1), '#7FB8F0'));
      s += frontJ(t, 0.34, -0.32, 0.32, Z, Z + 10, (w, h) => T(w / 2, h - 2.8, 5, '#BFDFFF', '$$$'));
      // front panel
      s += frontI(t, 0.3, -0.32, 0.32, 4, Z, (w, h) => {
        let p = P(rrect(3, 5, w - 6, 20, 1.6), '#2B2B33', 1.2);
        p += P(R(5.4, 7.4, w - 10.8, 15.2), '#2ED17A') + P(R(5.4, 7.4, w - 10.8, 15.2), '#0F8F4A', 0, OUT, 'opacity="0.25"');
        p += T(w / 2, 13.4, 3.6, '#0B3A1E', 'INSERT') + T(w / 2, 18.4, 4.2, '#0B3A1E', 'BRAIN');
        p += S(`M7,20.6h${f(w - 14)}`, 0.5, '#0B3A1E', 'stroke-dasharray="1 1"');
        // keypad + card slot + cash slot
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) p += P(rrect(6 + c * 4.4, 29 + r * 3.6, 3.4, 2.6, 0.6), r === 2 && c === 2 ? '#39E07A' : '#D5DAE0', 0.5);
        p += P(rrect(w - 12, 29, 8, 2.4, 0.8), '#1C1C22', 0.6) + P(R(w - 11, 29.6, 6, 0.8), '#39E07A');
        p += P(rrect(4, 44, w - 8, 4, 1), '#1C1C22', 0.8);
        p += P('M10,46L22,46L23,52L9,51Z', '#9ED07A', 0.7) + T(16, 50.4, 3.4, '#3E6B2A', '$');
        // dents, scratches, hand prints
        p += S(`M${f(w - 6)},${f(h - 10)}q-3,2 -6,0`, 0.8, '#3A4048') + S('M5,40l5,-2M6,41.4l3,-1.2', 0.6, '#8E9AA6');
        p += handprint(9, 14, 1, -20) + handprint(w - 7, 36, 1.1, 18) + handprint(14, h - 6, 0.9, 6, 0.6);
        return p;
      });
      s += frontJ(t, 0.32, -0.3, 0.3, 4, Z, (w, h) => P(R(3, h - 18, w - 6, 2), '#46515C') + handprint(w * 0.4, h * 0.45, 1.2, -10, 0.7) + S(`M${f(w - 8)},12l4,6l-3,2`, 0.6, '#3A4048'));
      return s;
    }),
  );

  // ---- vending machine: BRAIN-ADE
  out.push(
    floorProp('vending', 102, (_d, t) => {
      const Z = 80;
      let s = t.shadow(-0.38, 0.38, -0.38, 0.38, 0.2);
      s += t.box(-0.32, 0.32, -0.34, 0.34, 0, Z, '#D7262E', '#C62F2F', '#9E1F28');
      s += frontI(t, 0.32, -0.34, 0.34, 0, Z, (w, h) => {
        const gw = w * 0.66;
        let p = P(rrect(2.4, 3, w - 4.8, 13, 1.6), '#2ED17A', 1.1);
        p += TO(w / 2, 11.8, 5, '#FFFFFF', 'BRAIN-ADE', 1.1, GOO_D);
        // glass window with shelves of bottles
        p += P(R(3, 19, gw - 3, h - 34), '#2A3A44', 1.1);
        p += P(R(3, 19, gw - 3, h - 34), '#7FD3FF', 0, OUT, 'opacity="0.18"');
        for (let r = 0; r < 4; r++) {
          const y = 31 + r * 11.2;
          for (let c = 0; c < 3; c++) {
            const x = 7.6 + c * ((gw - 9) / 3);
            const col = r === 1 && c === 1 ? '#FF6FA8' : GOO;
            if (r === 3 && c === 2) continue; // sold out
            p += P(`M${f(x - 2.2)},${f(y)}V${f(y - 5)}Q${f(x - 2.2)},${f(y - 6.4)} ${f(x - 1)},${f(y - 7)}V${f(y - 8.6)}H${f(x + 1)}V${f(y - 7)}Q${f(x + 2.2)},${f(y - 6.4)} ${f(x + 2.2)},${f(y - 5)}V${f(y)}Z`, col, 0.6);
            p += P(R(x - 2.2, y - 4.4, 4.4, 2), '#F7A8C0', 0.3) + P(R(x - 1, y - 9.6, 2, 1.2), '#FFC83D', 0.3);
          }
          p += S(`M3,${f(y + 0.6)}H${f(gw)}`, 0.9, '#8E959E');
          p += S(`M${f(6)},${f(y + 1.6)}c1,1 2,-1 3,0s2,-1 3,0`, 0.5, '#C9CED6');
        }
        // one bottle stuck in the spiral, dangling
        p += P(`M${f(gw - 6.8)},${f(65.8)}l2,-3.6l4,2l-2,3.6z`, GOO, 0.6);
        p += P(`M3,19L${f(gw * 0.45)},19L3,${f(h * 0.5)}Z`, '#FFFFFF', 0, OUT, 'opacity="0.18"');
        // control column
        const cx = gw + (w - gw) / 2;
        p += P(rrect(gw + 1.6, 19, w - gw - 4, 9, 1), '#1C1C22', 0.8) + T(cx, 25.6, 4.4, '#FF4A4A', '0.99', '', 'font-family="Courier New, monospace" font-weight="bold"');
        p += P(rrect(cx - 1, 32, 2, 6, 0.8), '#1C1C22', 0.6);
        for (let k = 0; k < 4; k++) p += P(rrect(gw + 3, 42 + k * 5, w - gw - 7, 3.2, 1), k === 1 ? '#FFC83D' : '#D5DAE0', 0.5);
        p += T(cx, 68, 2.4, '#FFF4DC', 'NO', '', FONT) + T(cx, 71, 1.7, '#FFF4DC', 'REFUNDS', '', FONT);
        // pickup flap
        p += P(rrect(4, h - 12, gw - 4, 8, 1.4), '#1C1C22', 1) + P(rrect(6, h - 10.4, gw - 8, 3, 1), '#3A3A44');
        p += handprint(w - 6, h - 8, 0.9, 14, 0.7);
        return p;
      });
      s += frontJ(t, 0.34, -0.32, 0.32, 0, Z, (w, h) => {
        // side: big brain logo
        let p = P(ell(w / 2, h * 0.38, 9, 7.4), '#F7A8C0', 1);
        p += S(`M${f(w / 2 - 6)},${f(h * 0.38)}q2,-2 4,0t4,0t4,0M${f(w / 2 - 2)},${f(h * 0.38 - 5)}q1,3 3,3`, 0.7, '#B8566F');
        p += T(w / 2, h * 0.62, 5.2, '#FFF4DC', 'DRINK', '', FONT) + T(w / 2, h * 0.62 + 6, 4, '#FFF4DC', 'UP!', '', FONT);
        p += S(`M2,${f(h - 4)}H${f(w - 2)}`, 1.4, '#7A1626');
        return p;
      });
      return s;
    }),
  );

  // ---- glowing jukebox
  out.push(
    floorProp('jukebox', 90, (d, t) => {
      const Z = 42;
      const i0 = -0.24;
      const i1 = 0.24;
      const r = 0.34;
      const glow = d.radial(...t.p(0.2, 0, 40), 40, [[0, '#FFB23D', 0.35], [0.5, '#FF4FA0', 0.12], [1, '#FF4FA0', 0]]);
      let s = P(ell(...t.p(0.2, 0, 38), 40, 32), glow);
      s += t.shadow(-0.3, 0.32, -0.38, 0.38, 0.2);
      s += t.box(i0, i1, -r, r, 0, Z, '#7A3A1A', '#8A4520', '#5E2A12');
      // arched top: hull of the back and front arches
      const N = 18;
      const arch = (i: number): Pt[] => Array.from({ length: N + 1 }, (_, k) => {
        const a = Math.PI - (k / N) * Math.PI;
        return t.p(i, -r * Math.cos(a), Z + 22 * Math.sin(a));
      });
      s += P(poly(hull([...arch(i0), ...arch(i1)])), '#6B3418', PW);
      const front = poly(arch(i1));
      s += P(front, '#8A4520', PW);
      // light tubes on the arch (glow + core)
      const blur = d.blur(1.4);
      const tube = (k: number, col: string) => {
        const pts: Pt[] = Array.from({ length: N + 1 }, (_, q) => {
          const a = Math.PI - (q / N) * Math.PI;
          return t.p(i1 + 0.002, -r * k * Math.cos(a), Z + 22 * k * Math.sin(a));
        });
        const dpath = 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L');
        return `<g filter="${blur}">${S(dpath, 3.6, col)}</g>` + S(dpath, 1.6, col) + S(dpath, 0.5, '#FFFFFF');
      };
      s += tube(0.86, '#FF4FA0') + tube(0.7, '#FFC23D') + tube(0.54, '#39E07A');
      // record window on the arch face
      s += frontI(t, i1, -r, r, Z - 2, Z + 12, (w, h) => {
        let p = P(`M${f(w * 0.28)},${f(h)}V${f(h * 0.45)}A${f(w * 0.22)},${f(h * 0.4)} 0 0 1 ${f(w * 0.72)},${f(h * 0.45)}V${f(h)}Z`, '#2A1846', 0.9);
        p += P(ell(w / 2, h * 0.68, 5, 3.4), '#1C1C22', 0.5) + circle(w / 2, h * 0.68, 1, '#E2343B') + S(ell(w / 2, h * 0.68, 3.4, 2.2), 0.3, '#5A5A63');
        return p;
      });
      // body front: chrome trim, speaker grille, selector buttons, coin slot
      s += frontI(t, i1, -r, r, 0, Z, (w, h) => {
        let p = P(rrect(3, 3, w - 6, 9, 1.4), '#FFF0B8', 1);
        for (let k = 0; k < 7; k++) p += P(rrect(5 + k * ((w - 10) / 7), 5, (w - 10) / 7 - 1, 5, 0.6), k % 2 ? '#FFC23D' : '#FF8A8E', 0.4);
        p += P(rrect(4, 15, w - 8, h - 22, 3), '#3A1A0E', 1.1);
        for (let k = 0; k < 5; k++) p += S(`M7,${f(18 + k * 3.6)}H${f(w - 7)}`, 1.2, '#C9CED6');
        p += P(ell(w / 2, h - 4.4, 2, 1.2), '#C9CED6', 0.6);
        p += P(R(2, 13, w - 4, 1.4), '#C9CED6');
        p += T(w / 2, h - 13, 5.6, '#FFC23D', 'Z', `stroke="${OUT}" stroke-width="0.8" paint-order="stroke"`);
        return p;
      });
      s += t.line([i1, r, 0], [i1, r, Z + 1], 2.4, CHROME[0]) + t.line([i1, -r, 0], [i1, -r, Z + 1], 2.4, CHROME[1]);
      // music notes
      const [nx, ny] = t.p(0.4, -0.3, Z + 30);
      s += P(ell(nx, ny, 2, 1.5), '#FF4FA0', 0.8) + S(`M${f(nx + 1.8)},${f(ny)}v-7l4,-1.4v6`, 1, OUT) + P(ell(nx + 4, ny - 2.4, 1.8, 1.3), '#FF4FA0', 0.8);
      return s;
    }),
  );

  // ---- arcade cabinet: ZOMBIE PANIC
  out.push(
    floorProp('arcade', 104, (d, t) => {
      let s = t.shadow(-0.34, 0.4, -0.32, 0.32, 0.2);
      const J0 = -0.27;
      const J1 = 0.27;
      // side profile in (i, z)
      const prof: [number, number][] = [
        [-0.28, 0], [0.22, 0], [0.22, 34], [0.36, 38], [0.34, 42], [0.16, 44], [0.06, 66], [0.2, 68], [0.2, 80], [-0.28, 80],
      ];
      const q = (a: [number, number], b: [number, number]) => poly([t.p(a[0], J0, a[1]), t.p(b[0], J0, b[1]), t.p(b[0], J1, b[1]), t.p(a[0], J1, a[1])]);
      const cols = ['#2B2B33', '#3A1E5C', '#E2343B', '#4A2A74', '#1C1C22', '#3A1E5C', '#5A3A8C', '#5A3A8C', '#4A2A74'];
      for (let k = 1; k < prof.length - 1; k++) s += P(q(prof[k], prof[k + 1]), cols[k], 1.4);
      // control panel top: joystick + buttons
      const [jx, jy] = t.p(0.28, 0.1, 39.4);
      s += S(`M${f(jx)},${f(jy)}v-6`, 2.4) + S(`M${f(jx)},${f(jy)}v-6`, 1, '#C9CED6') + P(ell(jx, jy - 6.6, 2.4), '#E2343B', 0.9) + hl(jx - 0.8, jy - 7.4, 0.8, 0.5, 0, 0.8);
      for (const [j, c] of [[-0.06, '#FFC23D'], [-0.14, '#39E07A'], [-0.22, '#3F7FD0']] as [number, string][]) {
        const [bx, by] = t.p(0.29, j, 39.6);
        s += P(ell(bx, by, 1.8, 1.1), c, 0.7);
      }
      // the screen (on the sloped face) with the game running
      s += onFace(t.p(0.06, J1, 66), t.p(0.06, J0, 66), t.p(0.16, J1, 44), 30, 24, (() => {
        let p = P(rrect(1.6, 1.6, 26.8, 20.8, 2), '#0B1A12', 0.8);
        p += P(R(4, 14, 22, 6), '#1F4A2A') + S('M4,14H26', 0.6, '#39E07A');
        p += P(R(7, 9, 3, 5), '#8DC63F') + P(R(7.4, 7, 2.2, 2.2), '#8DC63F') + circle(8.6, 8, 0.4, '#FFE14D');
        p += P(R(18, 9.4, 3, 4.6), '#FFC83D') + P(R(18.4, 7.4, 2.2, 2), '#F5C6A5') + S('M16.6,8l-1.4,-1M16.4,10l-1.6,0.2', 0.4, '#FFFFFF');
        p += T(15, 5.6, 3.2, '#FFE14D', 'SCORE 666', '', 'font-family="Courier New, monospace" font-weight="bold"');
        p += P(R(1.6, 1.6, 26.8, 20.8), '#39E07A', 0, OUT, 'opacity="0.12"');
        return p;
      })());
      // marquee
      s += frontI(t, 0.2, J0, J1, 68, 80, (w, h) => {
        let p = P(R(1, 1, w - 2, h - 2), '#1C1C22');
        p += TO(w / 2, 6, 4.6, '#FFE14D', 'ZOMBIE', 0.9, '#B3263A') + TO(w / 2, 10.6, 4.6, '#7CF0A8', 'PANIC', 0.9, '#0F8F4A');
        return p;
      });
      // coin door on the lower front
      s += frontI(t, 0.22, J0, J1, 0, 34, (w, h) => {
        let p = P(rrect(w / 2 - 7, 8, 14, 14, 1.4), '#1C1C22', 1);
        p += P(rrect(w / 2 - 4.4, 10.6, 3, 4.6, 0.6), '#FF3B3B') + P(rrect(w / 2 + 1.4, 10.6, 3, 4.6, 0.6), '#FF3B3B');
        p += T(w / 2, 20, 2.6, '#FFC83D', '25¢');
        p += S(`M3,${h - 3}H${w - 3}`, 1, '#5A3A8C');
        return p;
      });
      // side panel (+j) with flame-and-zombie art, drawn last over the front edges
      const side = poly(prof.map(([i, z]) => t.p(i, J1, z)));
      s += d.shaded(side, '#3A1E5C', '#2A1446', PW, [-1, -1]);
      const flame = poly([t.p(-0.24, J1, 6), t.p(0.18, J1, 6), t.p(0.18, J1, 18), t.p(0.08, J1, 30), t.p(0.04, J1, 22), t.p(-0.04, J1, 34), t.p(-0.1, J1, 24), t.p(-0.16, J1, 30), t.p(-0.24, J1, 16)]);
      s += d.clip(side, P(flame, '#FF8A1F', 1) + P(poly([t.p(-0.18, J1, 6), t.p(0.12, J1, 6), t.p(0.1, J1, 14), t.p(0.02, J1, 20), t.p(-0.08, J1, 14), t.p(-0.16, J1, 18)]), '#FFC23D'));
      const [hx, hy] = t.p(-0.04, J1, 56);
      s += d.clip(side, d.shaded(ell(hx, hy, 7, 7.6), ZSKIN[0], ZSKIN[1], 1.2, [-1, -1]) + P(ell(hx - 2.6, hy - 1, 1.8, 2), '#FFE14D', 0.6) + P(ell(hx + 2.6, hy, 1.8, 2), '#FFE14D', 0.6) + circle(hx - 2.4, hy - 0.8, 0.6, OUT) + circle(hx + 2.8, hy + 0.2, 0.6, OUT) + S(`M${f(hx - 3)},${f(hy + 4)}q3,2 6,0`, 0.8));
      s += t.line([-0.28, J1, 80], [0.2, J1, 80], 1.4, '#7A5AB8');
      return s;
    }),
  );

  // ---- tiny pug doghouse with a bone and a food bowl
  out.push(
    floorProp('pethouse_pug', 62, (d, t) => {
      const Z = 20;
      let s = t.shadow(-0.34, 0.34, -0.34, 0.34, 0.18);
      s += t.box(-0.26, 0.26, -0.26, 0.26, 0, Z, WOOD, '#D69A5E', WOOD_M);
      for (const z of [5, 10, 15]) s += t.line([-0.26, 0.26, z], [0.26, 0.26, z], 0.7, WOOD_M) + t.line([0.26, -0.26, z], [0.26, 0.26, z], 0.7, WOOD_D);
      // gable roof, ridge along i (door on the +i gable)
      const RZ = Z + 16;
      const back = poly([t.p(-0.32, -0.32, Z - 1), t.p(0.32, -0.32, Z - 1), t.p(0.32, 0, RZ), t.p(-0.32, 0, RZ)]);
      s += P(back, '#C62F2F', PW);
      s += frontI(t, 0.26, -0.26, 0.26, 0, Z, (w, h) => {
        let p = P(`M${f(w * 0.25)},${f(h)}V${f(h * 0.45)}A${f(w * 0.25)},${f(w * 0.25)} 0 0 1 ${f(w * 0.75)},${f(h * 0.45)}V${f(h)}Z`, '#2B1B17', 1.1);
        p += P(ell(w * 0.42, h * 0.62, 1.6, 1.2), '#FFE14D') + P(ell(w * 0.58, h * 0.62, 1.6, 1.2), '#FFE14D');
        return p;
      });
      s += P(poly([t.p(0.26, -0.26, Z), t.p(0.26, 0.26, Z), t.p(0.26, 0, RZ - 1)]), '#D69A5E', PW);
      const front = poly([t.p(-0.32, 0.32, Z - 1), t.p(0.32, 0.32, Z - 1), t.p(0.32, 0, RZ), t.p(-0.32, 0, RZ)]);
      s += P(front, '#E2343B', PW);
      let shingles = '';
      for (const k of [0.25, 0.5, 0.75]) {
        const a = t.p(-0.32, 0.32 * (1 - k), Z - 1 + (RZ - Z + 1) * k);
        const b = t.p(0.32, 0.32 * (1 - k), Z - 1 + (RZ - Z + 1) * k);
        shingles += S(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, 0.8, '#9E1F28');
      }
      s += d.clip(front, shingles);
      s += t.line([-0.33, 0, RZ], [0.33, 0, RZ], 2.4) + t.line([-0.33, 0, RZ], [0.33, 0, RZ], 1, '#FF6A6A');
      s += frontI(t, 0.34, -0.16, 0.16, Z + 2, Z + 9, (w, h) => P(rrect(0.6, 0.6, w - 1.2, h - 1.2, 1), '#FFF4DC', 0.8) + T(w / 2, h - 1.8, 4.6, '#7A4524', 'PUG'));
      s += S(`M${f(t.p(0.34, 0, Z + 9)[0])},${f(t.p(0.34, 0, Z + 9)[1])}v-2`, 0.8);
      // bone + bowl in front
      const [bx, by] = t.p(0.42, 0.14, 0);
      s += `<g transform="rotate(-20 ${f(bx)} ${f(by)})">${P(rrect(bx - 4, by - 1, 8, 2, 1), '#F2EBD7', 0.7)}${P(ell(bx - 4, by - 1.2, 1.3), '#F2EBD7', 0.7)}${P(ell(bx - 4, by + 1.2, 1.3), '#F2EBD7', 0.7)}${P(ell(bx + 4, by - 1.2, 1.3), '#F2EBD7', 0.7)}${P(ell(bx + 4, by + 1.2, 1.3), '#F2EBD7', 0.7)}</g>`;
      const [wx, wy] = t.p(0.4, -0.2, 0);
      s += P(`M${f(wx - 5)},${f(wy - 2.4)}L${f(wx - 4)},${f(wy + 0.6)}Q${f(wx)},${f(wy + 2)} ${f(wx + 4)},${f(wy + 0.6)}L${f(wx + 5)},${f(wy - 2.4)}Z`, '#3F7FD0', 1) + P(ell(wx, wy - 2.4, 5, 1.6), '#8A5530', 0.9);
      return s;
    }),
  );

  // ---- spiked kennel (BEWARE), chain and glowing eyes
  out.push(
    floorProp('pethouse_kennel', 72, (d, t) => {
      const Z = 26;
      let s = t.shadow(-0.42, 0.42, -0.42, 0.42, 0.2);
      s += t.box(-0.34, 0.34, -0.34, 0.34, 0, Z, '#5A5F68', '#6E747C', '#4A4F57');
      // stone/iron plates with rivets
      for (const z of [8, 17]) s += t.line([-0.34, 0.34, z], [0.34, 0.34, z], 0.9, '#3A3E44') + t.line([0.34, -0.34, z], [0.34, 0.34, z], 0.9, '#2E3238');
      for (const [i, z] of [[-0.25, 4], [0.05, 4], [-0.25, 21], [0.05, 21]] as Pt[]) s += rivet(...t.p(i, 0.34, z), 0.7);
      const RZ = Z + 18;
      s += P(poly([t.p(-0.4, -0.4, Z - 1), t.p(0.4, -0.4, Z - 1), t.p(0.4, 0, RZ), t.p(-0.4, 0, RZ)]), '#3A2A4A', PW);
      s += frontI(t, 0.34, -0.34, 0.34, 0, Z, (w, h) => {
        let p = P(`M${f(w * 0.24)},${f(h)}V${f(h * 0.42)}A${f(w * 0.26)},${f(w * 0.26)} 0 0 1 ${f(w * 0.76)},${f(h * 0.42)}V${f(h)}Z`, '#120B09', 1.2);
        const blur = d.blur(0.8);
        p += `<g filter="${blur}">${P(ell(w * 0.4, h * 0.6, 2.2, 1.2), '#FF3B3B')}${P(ell(w * 0.6, h * 0.6, 2.2, 1.2), '#FF3B3B')}</g>` + P(ell(w * 0.4, h * 0.6, 1.4, 0.7), '#FFC0C0') + P(ell(w * 0.6, h * 0.6, 1.4, 0.7), '#FFC0C0');
        // teeth peeking from the dark
        p += P(`M${f(w * 0.4)},${f(h * 0.76)}l1,2l1,-2l1,2l1,-2l1,2l1,-2z`, '#F4F1EA');
        return p;
      });
      s += P(poly([t.p(0.34, -0.34, Z), t.p(0.34, 0.34, Z), t.p(0.34, 0, RZ - 1)]), '#4A4F57', PW);
      const front = poly([t.p(-0.4, 0.4, Z - 1), t.p(0.4, 0.4, Z - 1), t.p(0.4, 0, RZ), t.p(-0.4, 0, RZ)]);
      s += P(front, '#4A3A5C', PW);
      s += d.clip(front, t.line([-0.4, 0.2, Z + 8], [0.4, 0.2, Z + 8], 0.8, '#2E2240'));
      // spikes along the ridge and the roof edge
      for (let k = 0; k < 5; k++) {
        const i = -0.32 + k * 0.16;
        const [x, y] = t.p(i, 0, RZ);
        s += P(`M${f(x - 2.4)},${f(y + 0.6)}L${f(x)},${f(y - 7)}L${f(x + 2.4)},${f(y + 0.6)}Z`, CHROME[0], 1) + S(`M${f(x - 0.6)},${f(y - 1)}L${f(x)},${f(y - 5)}`, 0.6, CHROME_HI);
      }
      for (let k = 0; k < 4; k++) {
        const [x, y] = t.p(-0.3 + k * 0.2, 0.4, Z - 1);
        s += P(`M${f(x - 1.6)},${f(y)}L${f(x - 1)},${f(y + 5)}L${f(x + 1.6)},${f(y + 0.4)}Z`, CHROME[1], 0.8);
      }
      s += frontI(t, 0.42, -0.22, 0.22, Z + 1, Z + 9, (w, h) => P(rrect(0.6, 0.6, w - 1.2, h - 1.2, 1), '#FFD23D', 0.8) + T(w / 2, h - 2, 4.6, '#B3263A', 'BEWARE'));
      // chain to a stake + a chewed bone
      const [cx0, cy0] = t.p(0.34, 0.28, 6);
      const [cx1, cy1] = t.p(0.5, 0.42, 0);
      s += S(`M${f(cx0)},${f(cy0)}Q${f(cx1 - 2)},${f(cy0 + 8)} ${f(cx1)},${f(cy1)}`, 2.4, '#8E959E', 'stroke-dasharray="2 1"') + P(ell(cx1, cy1, 1.8, 0.9), '#3A3535', 0.7);
      const [bx, by] = t.p(0.44, -0.24, 0);
      s += P(`M${f(bx - 4)},${f(by - 1)}h8v2h-2.6l-1,-1l-1,1h-3.4z`, '#F2EBD7', 0.7) + P(ell(bx - 4, by - 1.4, 1.3), '#F2EBD7', 0.7) + P(ell(bx + 4, by + 1.2, 1.3), '#F2EBD7', 0.7);
      return s;
    }),
  );
  return out;
}

export function specialProps(): ArtAsset[] {
  return specials();
}

