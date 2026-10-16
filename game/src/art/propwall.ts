/**
 * Wall hangings: `<key>_l` (back-left wall) and `<key>_r` (back-right wall). Same 48x144 box and anchor
 * (0.5, 1) as a wall segment, so they are placed exactly like one (tileCenter ∓ 24, tileCenterY) and drawn
 * after it. Art is authored once in the WallF local frame (u 0..48 across, v 0..120 down, n = out of the
 * wall) and sheared onto each wall; round 3D bits (bottles, darts) are drawn upright at their wall point.
 * Everything stays inside u 4..44 and v 30..106 so it sits flush on the face with a small inset and clears
 * the roadhouse lantern above it. Transparent elsewhere.
 */
import type { ArtAsset } from './types';
import { WALL_HANGINGS } from './manifest';
import { Doc, OUT, P, S, ell, f, hl, rrect } from './svg';
import { BONE, FONT_CHALK, FONT_SERIF, GOO, R, T, TO, WallF, WOOD, WOOD_D, WOOD_M, circle, rivet, wallAsset } from './propkit';
import type { Side } from './propkit';

type Body = (d: Doc, W: WallF) => string;

/** Upright bottle standing on a shelf; (x, y) is the base center in image space. */
function bottle(d: Doc, x: number, y: number, kind: number): string {
  let s = P(ell(x + 0.6, y, 3.6, 1.2), OUT, 0, OUT, 'opacity="0.25"');
  if (kind === 0) {
    // tall green wine bottle with a cream label
    const b = `M${f(x - 3)},${f(y)}V${f(y - 11)}Q${f(x - 3)},${f(y - 14)} ${f(x - 1.2)},${f(y - 15)}V${f(y - 20)}H${f(x + 1.2)}V${f(y - 15)}Q${f(x + 3)},${f(y - 14)} ${f(x + 3)},${f(y - 11)}V${f(y)}Z`;
    s += d.shaded(b, '#3E9A45', '#26682C', 1.1, [-1.4, 0]) + P(R(x - 3, y - 9, 6, 5), '#FFF4DC', 0.6) + S(`M${f(x - 2)},${f(y - 7.4)}h3.4`, 0.5, '#B3263A') + P(R(x - 1.3, y - 21.4, 2.6, 2), '#C98B55', 0.6) + hl(x - 1.6, y - 12, 0.6, 2.4, 0, 0.6);
  } else if (kind === 1) {
    // squat brown beer bottle
    const b = `M${f(x - 2.6)},${f(y)}V${f(y - 7.6)}Q${f(x - 2.6)},${f(y - 10)} ${f(x - 1)},${f(y - 11)}V${f(y - 14)}H${f(x + 1)}V${f(y - 11)}Q${f(x + 2.6)},${f(y - 10)} ${f(x + 2.6)},${f(y - 7.6)}V${f(y)}Z`;
    s += d.shaded(b, '#9A5A24', '#6A3A14', 1.1, [-1.2, 0]) + P(ell(x, y - 4, 2.6, 1.8), '#FFD23D', 0.5) + P(R(x - 1.4, y - 15, 2.8, 1.4), '#D7262E', 0.5) + hl(x - 1.4, y - 7, 0.5, 2, 0, 0.6);
  } else if (kind === 2) {
    // pickling jar with a floating eyeball
    s += P(rrect(x - 4, y - 10, 8, 10, 2), '#CFEFE0', 1.1, OUT, 'fill-opacity="0.85"');
    s += P(rrect(x - 3.4, y - 7, 6.8, 6.4, 1.6), '#A8E07A', 0, OUT, 'opacity="0.55"');
    s += P(ell(x + 0.4, y - 4, 2.2), '#FFFFFF', 0.6) + circle(x + 1.1, y - 4, 1, '#3A9AE0') + circle(x + 1.2, y - 4, 0.45, OUT) + S(`M${f(x - 1.6)},${f(y - 3)}q-0.8,0.6 -1.2,0.2`, 0.4, '#E2343B');
    s += P(R(x - 4.4, y - 12.4, 8.8, 2.6), '#8E959E', 0.9) + hl(x - 2.4, y - 7, 0.6, 2, 0, 0.7);
  } else if (kind === 3) {
    // round potion flask, bubbling purple
    s += d.shaded(`M${f(x - 1.2)},${f(y - 8.4)}V${f(y - 12)}H${f(x + 1.2)}V${f(y - 8.4)}A4.6,4.6 0 1 1 ${f(x - 1.2)},${f(y - 8.4)}Z`, '#B05AE0', '#7A2FAA', 1.1, [-1.4, -1]);
    s += P(R(x - 1.6, y - 13.6, 3.2, 1.8), '#C98B55', 0.6) + circle(x - 1.4, y - 4.6, 0.7, '#E4C2FF') + circle(x + 1, y - 2.6, 0.5, '#E4C2FF') + circle(x + 0.4, y - 15.6, 0.6, '#E4C2FF') + circle(x - 0.6, y - 17.6, 0.45, '#E4C2FF');
  } else {
    // XXX moonshine jug
    s += d.shaded(`M${f(x - 4)},${f(y)}Q${f(x - 4.6)},${f(y - 7)} ${f(x - 2)},${f(y - 9)}H${f(x + 2)}Q${f(x + 4.6)},${f(y - 7)} ${f(x + 4)},${f(y)}Z`, '#EBDDBE', '#C9B58A', 1.1, [-1.2, 0]);
    s += P(`M${f(x - 2)},${f(y - 9)}Q${f(x - 1.6)},${f(y - 11)} ${f(x - 1)},${f(y - 12)}H${f(x + 1)}Q${f(x + 1.6)},${f(y - 11)} ${f(x + 2)},${f(y - 9)}Z`, '#7A4524', 0.9);
    s += S(`M${f(x + 2)},${f(y - 9)}q3,0.4 2.6,3.6`, 1, OUT) + T(x, y - 3, 3.2, '#2B1B17', 'XXX');
  }
  return s;
}

const H: Record<(typeof WALL_HANGINGS)[number], Body> = {
  // ---- shelf of bottles (a nod to the original's bottle shelves)
  wall_bottles: (d, W) => {
    let s = '';
    for (const v of [58, 86]) {
      // brackets + plank
      for (const u of [12, 36]) s += W.flat(P(`M${u - 1.4},${v + 3}H${u + 1.4}V${v + 9}L${u - 1.4},${v + 3.6}Z`, '#3A3535', 0.8));
      s += W.box(7, 41, v, v + 3, 0, 6.5, WOOD_M, WOOD, WOOD_D, 1.4);
      const [gx, gy] = W.p(16, v + 1.6, 6.5);
      s += S(`M${f(gx - 6)},${f(gy)}h9`, 0.5, '#E2AE78');
    }
    const kinds = [[0, 1, 2, 4], [3, 0, 1, 2]];
    [58, 86].forEach((v, r) => {
      kinds[r].forEach((k, n) => {
        const [x, y] = W.p(11.4 + n * 8.4 + (r ? 1.4 : 0), v, 3.6);
        s += bottle(d, x, y, k);
      });
    });
    // a cobwebbed corner on the lower shelf
    const [cx, cy] = W.p(40.4, 86, 6.5);
    s += S(`M${f(cx)},${f(cy - 9)}L${f(cx - 6)},${f(cy - 1)}M${f(cx)},${f(cy - 9)}V${f(cy)}M${f(cx)},${f(cy - 5)}q-2,1 -3.4,2.8`, 0.4, '#FFFFFF', 'opacity="0.85"');
    return s;
  },

  // ---- license plates nailed up crooked
  wall_license: (_d, W) => {
    const plates: [number, number, number, string, string, string][] = [
      [5, 40, -5, '#FFD23D', '#2B1B17', 'ZMB 666'],
      [25, 38, 4, '#F4F1EA', '#2B5FB3', 'BRAINS'],
      [6, 58, 3, '#3E8A35', '#F4F1EA', 'GRR-8'],
      [25, 60, -6, '#B3263A', '#FFF4DC', 'UNDEAD'],
      [15, 78, 2, '#7FD3FF', '#2B1B17', 'BBQ 4U'],
    ];
    let inner = '';
    for (const [u, v, a, bg, fg, txt] of plates) {
      let p = P(rrect(u, v, 18, 10, 1.6), bg, 1.2) + S(rrect(u + 1, v + 1, 16, 8, 1), 0.5, fg, 'opacity="0.6"');
      p += circle(u + 3, v + 2, 0.6, '#4A4A52') + circle(u + 15, v + 2, 0.6, '#4A4A52');
      p += T(u + 9, v + 7.6, 4.2, fg, txt);
      p += circle(u + 14, v + 8, 1.2, '#B5651D', 'opacity="0.6"') + circle(u + 3, v + 8.4, 0.8, '#B5651D', 'opacity="0.5"');
      inner += `<g transform="rotate(${a} ${u + 9} ${v + 5})">${p}</g>`;
    }
    let s = W.shadow(plates.map(([u, v, a]) => `<g transform="rotate(${a} ${u + 9} ${v + 5})"><path d="${rrect(u, v, 18, 10, 1.6)}"/></g>`).join(''));
    s += W.flat(inner, 1);
    return s;
  },

  // ---- antlers on a shield plaque (somebody hung a sock on them)
  wall_antlers: (_d, W) => {
    const shield = 'M16,58H32V70Q32,78 24,81Q16,78 16,70Z';
    let s = W.shadow(`<path d="${shield}"/>`);
    s += W.flat(P(shield, '#7A4524', 1.4) + P('M18,60H30V69.6Q30,76 24,78.6Q18,76 18,69.6Z', '#A8693A') + S('M20,64h8M19.6,70h8.6', 0.6, '#7A4524') + rivet(24, 61.4, 0.7), 0);
    // antlers (flat at n=3): main beams with tines
    const beam = (sx: number) => {
      const m = (u: number) => 24 + (u - 24) * sx;
      return (
        `M${m(22)},${59}C${m(16)},${54} ${m(8)},${52} ${m(6)},${42}` +
        `M${m(14)},${53.6}Q${m(10)},${48} ${m(12)},${41}` +
        `M${m(9.6)},${49.4}Q${m(4)},${48} ${m(3)},${44}` +
        `M${m(7.6)},${45.6}Q${m(8)},${38} ${m(10)},${36}`
      );
    };
    const both = beam(1) + beam(-1);
    let a = S(both, 4.8, OUT) + S(both, 2.6, '#EAD9AE') + S(both, 0.9, '#FFF6E0', 'transform="translate(-0.5 -0.4)"');
    a += P(ell(21.4, 59.6, 2.6, 2), '#5A3418', 1) + P(ell(26.6, 59.6, 2.6, 2), '#5A3418', 1);
    s += W.flat(`<g opacity="0.25" transform="translate(1.6 2.6)">${S(both, 4.8, OUT)}</g>`, 0);
    s += W.flat(a, 3);
    // red striped sock hanging off the right tine
    s += W.flat(P('M37.4,37.4L39.4,37V46Q42.6,47 42.4,49Q41,50.4 37.6,48.6Z', '#F4F1EA', 1) + S('M37.6,40.4l1.8,-0.3M37.6,43.2l1.8,-0.3', 1.1, '#D7262E') + P('M37,37.4L40,36.8V38.6L37.2,39Z', '#D7262E', 0.8), 3);
    return s;
  },

  // ---- clock with bones for hands (running 13 minutes late, forever)
  wall_clock: (_d, W) => {
    const cx = 24;
    const cy = 64;
    let s = W.shadow(`<circle cx="${cx}" cy="${cy}" r="15"/>`);
    s += W.flat(P(ell(cx, cy, 15), '#4A2C18', 1.4), 0);
    let face = P(ell(cx, cy, 15), '#7A4524', 1.4) + P(ell(cx, cy, 12.4), '#FFF4DC', 1.1);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const r0 = k % 3 === 0 ? 9 : 10.2;
      face += S(`M${f(cx + Math.sin(a) * r0)},${f(cy - Math.cos(a) * r0)}L${f(cx + Math.sin(a) * 11.4)},${f(cy - Math.cos(a) * 11.4)}`, k % 3 === 0 ? 1.2 : 0.7, '#5A3418');
    }
    // tiny skull at twelve
    face += P('M22,54.4a2,2 0 0 1 4,0v1.2h-4z', '#F2EBD7', 0.5) + circle(23.2, 54.6, 0.45, OUT) + circle(24.8, 54.6, 0.45, OUT);
    face += T(cx, cy + 7.4, 2.4, '#B3263A', 'LATE AGAIN', '', FONT_SERIF);
    const boneHand = (len: number, ang: number, w: number) => {
      const ex = cx + Math.sin(ang) * len;
      const ey = cy - Math.cos(ang) * len;
      const nx = Math.cos(ang) * w * 0.7;
      const ny = Math.sin(ang) * w * 0.7;
      const bx = cx + Math.sin(ang) * 2;
      const by = cy - Math.cos(ang) * 2;
      return (
        S(`M${f(bx)},${f(by)}L${f(ex)},${f(ey)}`, w + 1.6, OUT) +
        P(ell(ex + nx, ey + ny, w * 0.85), BONE[0], 0.7) + P(ell(ex - nx, ey - ny, w * 0.85), BONE[0], 0.7) +
        S(`M${f(bx)},${f(by)}L${f(ex)},${f(ey)}`, w, BONE[0])
      );
    };
    face += boneHand(9.4, (2.3 / 12) * Math.PI * 2, 1.5) + boneHand(6, (8.4 / 12) * Math.PI * 2, 1.9);
    face += P(ell(cx, cy, 1.4), '#5A3418', 0.6);
    // cracked glass glint
    face += S('M30,56l-2.4,3l1.4,1.2l-2,2.6', 0.5, '#FFFFFF') + `<path d="M16,58A10,10 0 0 1 22,53" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>`;
    s += W.flat(face, 3);
    return s;
  },

  // ---- acoustic guitar on a hook (with a bite out of it)
  wall_guitar: (_d, W) => {
    const body = 'M24,64C17,64 14.4,67.4 15.6,72C16.4,75 14,77 13.6,82C13,90 18,96 24,96C30,96 35,90 34.4,82C34,77 31.6,75 32.4,72C33.6,67.4 31,64 24,64Z';
    const bite = 'M34.6,84a2.2,2.2 0 0 0 -2,3a2.2,2.2 0 0 0 0.4,3.6a2.2,2.2 0 0 0 1.8,1Z';
    let s = W.shadow(`<path d="${body}"/><path d="M22.6,34H25.4V66H22.6Z"/>`);
    let g = P('M22.4,40H25.6V68H22.4Z', '#5A3418', 1.2);
    for (let k = 0; k < 5; k++) g += S(`M22.4,${44 + k * 4.6}h3.2`, 0.6, '#C9CED6');
    g += P('M21.4,30.6H26.6L27,40H21Z', '#3E2414', 1.2);
    for (const v of [32.6, 35.4, 38.2]) g += circle(20.4, v, 0.9, '#C9CED6', `stroke="${OUT}" stroke-width="0.5"`) + circle(27.6, v, 0.9, '#C9CED6', `stroke="${OUT}" stroke-width="0.5"`);
    g += P(body, '#E08A3A', 1.5);
    g += P('M24,67C19,67 17.6,69.4 18.4,72.4C19,75 17,77.4 16.8,82C16.6,88.6 20,93 24,93C28,93 31.4,88.6 31.2,82C31,77.4 29,75 29.6,72.4C30.4,69.4 29,67 24,67Z', '#F2B35A');
    g += P(ell(24, 77, 3.8), '#3E2414', 1) + S(ell(24, 77, 5), 0.6, '#7A3A1A');
    g += P(rrect(19.6, 86, 8.8, 2.2, 0.8), '#3E2414', 0.8);
    g += S('M23,40V87M24,40V87M25,40V87', 0.3, '#F4F1EA');
    g += P(bite, '#E2E5E8', 0) + S(bite.replace('Z', ''), 1.2);
    s += W.flat(g, 3);
    s += W.flat(S('M24,30.6V28', 1.6, '#3A3535') + rivet(24, 27.6, 0.9), 0);
    return s;
  },

  // ---- dartboard (one dart missed. by a lot.)
  wall_dartboard: (_d, W) => {
    const cx = 24;
    const cy = 62;
    let s = W.shadow(`<circle cx="${cx}" cy="${cy}" r="16"/>`);
    s += W.flat(P(ell(cx, cy, 16), '#2B2B33', 1.4), 0);
    let b = P(ell(cx, cy, 16), '#2B2B33', 1.4);
    for (let k = 0; k < 20; k++) {
      const a0 = ((k - 0.5) / 20) * Math.PI * 2;
      const a1 = ((k + 0.5) / 20) * Math.PI * 2;
      const wedge = (r0: number, r1: number, col: string) =>
        P(`M${f(cx + Math.sin(a0) * r0)},${f(cy - Math.cos(a0) * r0)}L${f(cx + Math.sin(a0) * r1)},${f(cy - Math.cos(a0) * r1)}A${r1},${r1} 0 0 1 ${f(cx + Math.sin(a1) * r1)},${f(cy - Math.cos(a1) * r1)}L${f(cx + Math.sin(a1) * r0)},${f(cy - Math.cos(a1) * r0)}A${r0},${r0} 0 0 0 ${f(cx + Math.sin(a0) * r0)},${f(cy - Math.cos(a0) * r0)}Z`, col);
      b += wedge(2, 12.6, k % 2 ? '#F4E9CF' : '#2B2B33');
      b += wedge(12.6, 14, k % 2 ? '#3E9A45' : '#D7262E');
      b += wedge(6.4, 7.6, k % 2 ? '#3E9A45' : '#D7262E');
    }
    b += S(ell(cx, cy, 14), 0.5, '#C9CED6') + S(ell(cx, cy, 12.6), 0.4, '#C9CED6');
    b += P(ell(cx, cy, 2), '#3E9A45', 0.4, '#C9CED6') + P(ell(cx, cy, 0.9), '#D7262E');
    s += W.flat(b, 2.4);
    // darts: upright little sprites stuck at points on the board (and one in the wall)
    const dart = (u: number, v: number, col: string) => {
      const [x, y] = W.p(u, v, 2.4);
      const tx = W.side === 'l' ? 5 : -5;
      const ty = 1.2;
      return (
        S(`M${f(x)},${f(y)}l${f(tx)},${f(ty)}`, 2.2, OUT) + S(`M${f(x)},${f(y)}l${f(tx)},${f(ty)}`, 1, '#C9CED6') +
        P(`M${f(x + tx)},${f(y + ty)}l${f(tx * 0.5)},${f(-2.6)}l${f(tx * 0.3)},${f(2)}l${f(-tx * 0.3)},${f(2)}Z`, col, 0.6)
      );
    };
    s += dart(25, 61, '#FFD23D') + dart(19, 66, '#FFD23D') + dart(30, 55, '#FFD23D') + dart(33, 94, '#FFD23D');
    s += W.flat(S('M31,92l1.6,-1.2M32,96l1.4,0.6M30.6,95.6l-1.4,0.8', 0.6, OUT, 'opacity="0.6"'), 0);
    return s;
  },

  // ---- B-movie poster
  wall_poster: (d, W) => {
    const rect = R(9, 34, 30, 68);
    let s = W.shadow(`<path d="${rect}"/>`);
    let p = P(rect, '#2A1846', 1.2);
    p += d.clip(rect, P('M9,34H39V70H9Z', d.linear(0, 34, 0, 82, [[0, '#2A1846'], [1, '#C2506E']])));
    // searchlights
    p += d.clip(rect, P('M13,92L6,50L10,48Z', '#FFF4B0', 0, OUT, 'opacity="0.35"') + P('M35,92L44,54L40,52Z', '#FFF4B0', 0, OUT, 'opacity="0.35"'));
    // the giant grandma: bun with curlers, glasses, angry brows, rolling pin raised
    p += P(ell(24, 54, 8, 4), '#B9C0C8', 0.9) + circle(18.6, 52.4, 1.6, '#F49AC1', `stroke="${OUT}" stroke-width="0.5"`) + circle(24, 50.6, 1.6, '#7FD3FF', `stroke="${OUT}" stroke-width="0.5"`) + circle(29.4, 52.4, 1.6, '#F49AC1', `stroke="${OUT}" stroke-width="0.5"`);
    p += P('M15,82Q15,70 24,70Q33,70 33,82Z', '#8E5AB8', 1) + P('M21,70L24,76L27,70Z', '#F4F1EA', 0.6);
    p += P(ell(24, 62, 7.4, 8), '#F5C6A5', 1);
    p += P(ell(21, 61.4, 2.4, 2), '#FFFFFF', 0.8) + P(ell(27, 61.4, 2.4, 2), '#FFFFFF', 0.8) + S('M23.4,61.4h1.2', 0.7) + circle(21.6, 61.6, 0.8, OUT) + circle(26.4, 61.6, 0.8, OUT);
    p += S('M18.6,58.6l4,1.2M29.4,58.6l-4,1.2', 1, OUT) + P('M20.6,66.4Q24,64.6 27.4,66.4Q24,68.8 20.6,66.4Z', '#7A1626', 0.7) + S('M22,66.2h4', 0.6, '#FFFFFF');
    p += S('M15.6,74L10.4,62', 3.2, OUT) + S('M15.6,74L10.4,62', 2, '#F5C6A5');
    p += `<g transform="rotate(-30 10 60)">${P(rrect(4, 58.4, 12, 3.4, 1.6), '#E2AE78', 0.8)}${P(rrect(2.4, 59.2, 2, 1.8, 0.8), '#A8693A', 0.5)}${P(rrect(15.6, 59.2, 2, 1.8, 0.8), '#A8693A', 0.5)}</g>`;
    // tiny city + fleeing car
    p += d.clip(rect, P('M9,92V86H12V82H15V88H18V80H22V86H26V83H29V88H32V79H35V86H39V92Z', '#1C1430') + S('M16,84h1M19,82h1M19,85h1M33,82h1M33,85h1M36,88h1', 0.8, '#FFE14D'));
    p += P(rrect(26, 88.6, 7, 2.6, 1), '#E2343B', 0.6) + circle(27.6, 91.4, 0.8, OUT) + circle(31.6, 91.4, 0.8, OUT) + S('M24,89.4h-2.4M24.4,90.6h-3', 0.5, '#FFFFFF');
    // titles
    p += T(24, 39.4, 3.6, '#FFF4DC', 'ATTACK OF THE');
    p += TO(24, 48.4, 8, '#FFD23D', '50 FT', 1.4, '#B3263A');
    p += P('M9,92H39V102H9Z', '#1C1430') + TO(24, 99.6, 6.2, '#7CF0A8', 'GRANDMA', 1.2, OUT);
    // tape + torn corner
    p += P('M7.6,33.4l5,-1.6l1,2.6l-5,1.6Z', '#FFF4DC', 0.5, '#C9BC9A', 'opacity="0.9"') + P('M35,31.8l5,1.6l-1,2.6l-5,-1.6Z', '#FFF4DC', 0.5, '#C9BC9A', 'opacity="0.9"');
    p += P('M39,96L33,102H39Z', '#E8D9B0', 0.8);
    s += W.flat(p, 1);
    return s;
  },

  // ---- neon pig sign (the Q is on the fritz)
  wall_neon_pig: (d, W) => {
    const pig =
      'M14,64C14,56 20,52 27,53C31,50 36,52 37,56C40,57 41,61 39,63C40,67 38,70 34,71L33,76M30,71.6L29.6,76M18,70L17.6,76M22,71.4L22,76M14.6,66C12,66 10.6,64 11.4,62.4C12,61 13.6,61.4 13.2,62.8';
    const ear = 'M30,53L32,48.6L34,53.4';
    const snout = 'M38.6,59.6a1.6,2 0 1 1 0.1,0';
    const glow = d.blur(1.8);
    const pink = '#FF4FA0';
    const tubes = (col: string, w: number) => S(pig, w, col) + S(ear, w, col) + S(snout, w * 0.8, col) + circle(34.6, 57, w * 0.5, col);
    let s = W.flat(P(ell(25, 70, 22, 20), d.radial(25, 70, 22, [[0, pink, 0.3], [1, pink, 0]])), 0);
    // backer rail + clips
    s += W.flat(S('M10,50H40', 1.2, '#3A3A44') + S('M14,50v3M36,50v3', 0.8, '#3A3A44'), 0.5);
    let n = `<g filter="${glow}">${tubes(pink, 3.4)}</g>` + tubes('#FFD0E8', 1.2);
    const word = (txt: string, x: number, col: string, dim: boolean) =>
      dim
        ? T(x, 89, 11, 'none', txt, `stroke="#7A3A5A" stroke-width="1.4"`)
        : `<g filter="${glow}">${T(x, 89, 11, 'none', txt, `stroke="${col}" stroke-width="2.6"`)}</g>` + T(x, 89, 11, 'none', txt, `stroke="#FFF6D0" stroke-width="0.9"`);
    n += word('B', 15, '#FFC23D', false) + word('B', 24, '#FFC23D', false) + word('Q', 33.4, '#FFC23D', true);
    n += circle(36.4, 84, 0.8, '#FFF6D0') + S('M37.6,82.6l1.4,-1.2M38.4,84.6l1.6,0.2', 0.5, '#FFF6D0');
    s += W.flat(n, 2);
    return s;
  },

  // ---- longhorn steer skull with a desert flower
  wall_skull: (_d, W) => {
    const head = 'M17,56C17,52 20,51 24,51C28,51 31,52 31,56C31,60 29,62 28.4,66L27.6,76C27.4,78.6 26,79.6 24,79.6C22,79.6 20.6,78.6 20.4,76L19.6,66C19,62 17,60 17,56Z';
    const horns = 'M18,54.6C13,56 8,54 5.6,49C4.6,46.4 3.4,44.6 2.6,44C5.6,44.2 7.6,46.4 9.4,48.4C12,51.4 15,51.6 18,51.4ZM30,54.6C35,56 40,54 42.4,49C43.4,46.4 44.6,44.6 45.4,44C42.4,44.2 40.4,46.4 38.6,48.4C36,51.4 33,51.6 30,51.4Z';
    let s = W.shadow(`<path d="${head}"/><path d="${horns}"/>`);
    let k = P(horns, '#EAD9AE', 1.3) + S('M5.2,46.4l1.6,-0.8M42.8,46.4l-1.6,-0.8', 1.6, '#5A3418') + P('M2.6,44C3.8,44.2 4.6,45 5.4,46.2L6.6,45.6C5.6,44.6 4.4,44 2.6,44Z', '#5A3418') + P('M45.4,44C44.2,44.2 43.4,45 42.6,46.2L41.4,45.6C42.4,44.6 43.6,44 45.4,44Z', '#5A3418');
    k += P(head, BONE[0], 1.4) + P('M28,52.6C30.6,53.4 31,56 30.6,58C29.6,61 28.6,63 28.2,66L27.4,76C27.2,78 26.4,79 25,79.4C26,77.4 26.2,72 26.4,66C26.8,61 28.4,58 28,52.6Z', BONE[1]);
    k += P(ell(21, 58.4, 2.4, 2.8), '#3A2620') + P(ell(27, 58.4, 2.4, 2.8), '#3A2620');
    k += P(ell(22.6, 75.4, 0.9, 1.6), '#3A2620') + P(ell(25.4, 75.4, 0.9, 1.6), '#3A2620');
    k += S('M24,62v6M22.6,66l1.4,-1.4l1.4,1.4', 0.6, BONE[1]);
    // flower tucked by the left horn
    for (let q = 0; q < 5; q++) {
      const a = (q / 5) * Math.PI * 2;
      k += P(ell(14 + Math.cos(a) * 1.8, 51.6 + Math.sin(a) * 1.8, 1.4), '#FF6FA8', 0.5);
    }
    k += circle(14, 51.6, 1, '#FFD23D') + P('M12,53.6q-2,1.6 -3.4,0.4q1.6,-1.6 3.4,-0.4z', '#4E9A3A', 0.5);
    s += W.flat(k, 3);
    s += W.flat(rivet(24, 54, 0.8), 3);
    return s;
  },

  // ---- chalkboard specials
  wall_specials: (_d, W) => {
    const frame = rrect(6, 40, 36, 52, 2);
    let s = W.shadow(`<path d="${frame}"/>`);
    let c = S('M24,33L9,41M24,33L39,41', 0.6, '#3A2620') + P(frame, WOOD, 1.4) + P('M9,43H39V86H9Z', '#2F4A3A', 1);
    c += P('M9,43H22L11,86H9Z', '#FFFFFF', 0, OUT, 'opacity="0.05"');
    c += T(24, 50, 4.6, '#F4F1EA', 'TODAY:', 'opacity="0.95"', FONT_CHALK);
    c += S('M14,52h20', 0.6, '#F4F1EA', 'opacity="0.6"');
    c += T(24, 60, 7, '#FF9EC4', 'BRAINS', 'opacity="0.95"', FONT_CHALK);
    // brain doodle
    c += S('M18,68c-1.6,-2.4 1,-4.4 2.6,-3.2c1,-2 4.4,-1.6 4.8,0.4c2,-0.8 3.6,1.4 2.4,3c1,1.8 -1,3.4 -2.6,2.6c-1,1.4 -3.4,1.2 -4,0c-1.6,0.6 -3.6,-0.8 -3.2,-2.8z', 0.8, '#FF9EC4');
    c += S('M20.6,67.6q1.4,-0.8 2.4,0.2t2.4,-0.4', 0.5, '#FF9EC4');
    c += T(34, 70, 4.6, '#FFD23D', '$4.99', '', FONT_CHALK);
    c += T(24, 79, 3.4, '#F4F1EA', '(still fresh-ish)', 'opacity="0.85"', FONT_CHALK);
    c += S('M30,73l2,2l4,-4', 0.6, GOO);
    // chalk tray + chalk + eraser
    c += P(R(8, 86, 32, 3), WOOD_D, 1) + P(rrect(12, 84.6, 5, 1.6, 0.6), '#F4F1EA', 0.5) + P(rrect(29, 84, 7, 2.4, 0.6), '#5A6FB3', 0.5);
    s += W.flat(c, 1);
    s += W.flat(rivet(24, 32.6, 0.9), 0);
    return s;
  },
};

export function wallHangingProps(): ArtAsset[] {
  const out: ArtAsset[] = [];
  for (const k of WALL_HANGINGS) for (const side of ['l', 'r'] as Side[]) out.push(wallAsset(`${k}_${side}`, side, H[k]));
  return out;
}

