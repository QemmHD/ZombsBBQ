/**
 * Every character "look": outfit, hair, hats, props and face settings, for the 20 customers
 * (each also used for its `_z` zombie form), the player ("you") and Gus.
 * Authoring frame and rig contract: see chars.ts.
 */
import { Doc, OUT, OW, S, P, G, capsule, ell, f, hl, rrect } from './svg';
import type { Pt, Tone } from './svg';
import {
  ZSK, GOO, GOO_D, GOLD, WHITE, cel, darker, fold, rip, stain, drool, stitches, txt, star, plaid, flowers, zz,
} from './charkit';
import {
  HAIR_CAP, apron, apronBack, backHair, backHairD, hardHat, hardHatBack, shirtBack, shirtFolds, strays, suitBack, suitV, torsoD, waist,
} from './charbase';
import type { Look, HandItem, Expr } from './charbase';

type L = Look;

// ------------------------------------------------------------------ shared bits
const STAIN_G = '#5E9A2A';
const NAVY: Tone = ['#2F4C8F', '#23396B'];
const NAVY_P: Tone = ['#22335F', '#17244A'];
const BLACK_SHOE: Tone = ['#2A2A32', '#14141A'];

/** Union of circles (fluffy fur / curls): all outlines first, then all fills, then shading. */
function fluff(d: Doc, pts: [number, number, number][], t: Tone, sw = OW * 0.85): string {
  let s = pts.map(([x, y, r]) => P(ell(x, y, r), 'none', sw)).join('');
  s += pts.map(([x, y, r]) => P(ell(x, y, r), t[0])).join('');
  s += pts.map(([x, y, r]) => P(ell(x + r * 0.28, y + r * 0.3, r * 0.62), t[1], 0, OUT, 'opacity="0.55"')).join('');
  s += pts.map(([x, y, r]) => hl(x - r * 0.35, y - r * 0.4, r * 0.32, r * 0.18, -30, 0.55)).join('');
  void d;
  return s;
}

/** A row of points along a polyline every `step` units. */
function along(pts: Pt[], step: number, r: number, jit = 0.3): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const L = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r * (1 + ((out.length * 37) % 7) / 7 * jit - jit / 2)]);
    }
  }
  const last = pts[pts.length - 1];
  out.push([last[0], last[1], r]);
  return out;
}

function heart(cx: number, cy: number, s: number): string {
  return (
    `M${f(cx)},${f(cy + 2.6 * s)}C${f(cx - 3.6 * s)},${f(cy)} ${f(cx - 3 * s)},${f(cy - 2.8 * s)} ${f(cx - 1.2 * s)},${f(cy - 2.6 * s)}` +
    `C${f(cx - 0.4 * s)},${f(cy - 2.5 * s)} ${f(cx)},${f(cy - 1.8 * s)} ${f(cx)},${f(cy - 1.2 * s)}` +
    `C${f(cx)},${f(cy - 1.8 * s)} ${f(cx + 0.4 * s)},${f(cy - 2.5 * s)} ${f(cx + 1.2 * s)},${f(cy - 2.6 * s)}` +
    `C${f(cx + 3 * s)},${f(cy - 2.8 * s)} ${f(cx + 3.6 * s)},${f(cy)} ${f(cx)},${f(cy + 2.6 * s)}Z`
  );
}

/** Rotate a group around a point. */
function rot(inner: string, a: number, c: Pt): string {
  return G(inner, `rotate(${f(a)} ${f(c[0])} ${f(c[1])})`);
}

/** Small brain (cheerleader zombie pom-pom). */
function brain(d: Doc, x: number, y: number, r: number): string {
  const lobes: [number, number, number][] = [
    [x - r * 0.45, y - r * 0.35, r * 0.55], [x + r * 0.15, y - r * 0.5, r * 0.55], [x + r * 0.6, y - r * 0.1, r * 0.5],
    [x + r * 0.35, y + r * 0.4, r * 0.5], [x - r * 0.3, y + r * 0.4, r * 0.52], [x - r * 0.65, y + r * 0.05, r * 0.45],
  ];
  let s = fluff(d, lobes, ['#F7A6BC', '#D9708E'], OW * 0.8);
  s += S(`M${f(x - r * 0.6)},${f(y - r * 0.1)}q${f(r * 0.3)},${f(-r * 0.3)} ${f(r * 0.5)},0t${f(r * 0.5)},0M${f(x - r * 0.2)},${f(y + r * 0.35)}q${f(r * 0.3)},${f(-r * 0.25)} ${f(r * 0.6)},${f(-r * 0.05)}M${f(x + r * 0.05)},${f(y - r * 0.85)}q${f(-r * 0.15)},${f(r * 0.3)} ${f(r * 0.05)},${f(r * 0.6)}`, 0.8, '#B5506E');
  s += P(ell(x + r * 0.5, y + r * 0.7, r * 0.22, r * 0.3), GOO, 0.7);
  return s;
}

/** Spiky pom-pom. */
function pompom(x: number, y: number, r: number, cols: string[], torn = false): string {
  let s = '';
  const n = torn ? 11 : 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (torn ? 0.3 : 0);
    const rr = r * (torn && i % 3 === 0 ? 0.7 : 1) * (i % 2 ? 0.92 : 1);
    const tipx = x + Math.cos(a) * rr;
    const tipy = y + Math.sin(a) * rr;
    const b1x = x + Math.cos(a - 0.22) * r * 0.35;
    const b1y = y + Math.sin(a - 0.22) * r * 0.35;
    const b2x = x + Math.cos(a + 0.22) * r * 0.35;
    const b2y = y + Math.sin(a + 0.22) * r * 0.35;
    s += P(`M${f(b1x)},${f(b1y)}L${f(tipx)},${f(tipy)}L${f(b2x)},${f(b2y)}Z`, cols[i % cols.length], 0.9);
  }
  s += P(ell(x, y, r * 0.42), cols[0], 0.9) + hl(x - r * 0.3, y - r * 0.35, r * 0.25, r * 0.12, -30, 0.7);
  return s;
}

// ------------------------------------------------------------------ hand items
const donut: HandItem = (d, z, _b, [x, y]) => {
  const cx = x + 1.6;
  const cy = y + 3.6;
  let s = cel(d, ell(cx, cy, 4.4, 3.4), ['#D9A15A', '#B37A3A'], { sw: 1.2, hi: 0.5 });
  const icing = `M${f(cx - 3.8)},${f(cy - 0.6)}C${f(cx - 3.6)},${f(cy - 3.6)} ${f(cx + 3.6)},${f(cy - 3.6)} ${f(cx + 3.8)},${f(cy - 0.6)}C${f(cx + 3)},${f(cy + 1.2)} ${f(cx + 2.4)},${f(cy - 0.2)} ${f(cx + 1.4)},${f(cy + 1)}C${f(cx)},${f(cy + 0.4)} ${f(cx - 1.6)},${f(cy + 1.4)} ${f(cx - 3.8)},${f(cy - 0.6)}Z`;
  s += P(icing, z ? '#B8F07A' : '#FF8FB8', 0.9);
  s += P(ell(cx, cy - 0.6, 1.3, 0.8), '#7A4524', 0.8);
  s += S(`M${f(cx - 2.4)},${f(cy - 1.6)}l0.6,-0.4M${f(cx + 1.6)},${f(cy - 2)}l0.6,0.3M${f(cx - 0.4)},${f(cy - 2.4)}l0.5,0.4M${f(cx + 2.6)},${f(cy - 0.6)}l0.3,0.5`, 0.6, '#FFFFFF');
  if (z) s += P(`M${f(cx + 2.6)},${f(cy + 3.6)}a1.3,1.3 0 0 1 1.6,-2a1.3,1.3 0 0 1 0.8,-2.4L${f(cx + 5)},${f(cy + 3)}Z`, '#FFF4DC', 0) + S(`M${f(cx + 2.6)},${f(cy + 3.4)}a1.3,1.3 0 0 1 1.6,-2a1.3,1.3 0 0 1 0.8,-2.4`, 0.9);
  return s;
};

const briefcase: HandItem = (d, z, _b, [x, y]) => {
  const body = (o: number) => {
    let s = S(`M${f(x - 2.4)},${f(y + 1.6)}V${f(y - 0.6)}Q${f(x)},${f(y - 2.6)} ${f(x + 2.4)},${f(y - 0.6)}V${f(y + 1.6)}`, 1.3);
    const c = rrect(x - 7, y + 1.4 + o, 14, 9.6, 1.6);
    s += cel(d, c, ['#8A5530', '#6B3D20'], { hi: 0.7 });
    s += S(`M${f(x - 7)},${f(y + 4.6 + o)}H${f(x + 7)}`, 0.9);
    s += P(rrect(x - 1.4, y + 3.6 + o, 2.8, 2, 0.4), '#FFC83D', 0.8);
    s += P(rrect(x - 5.8, y + 1 + o, 1.6, 1.6, 0.3), '#FFC83D', 0.6) + P(rrect(x + 4.2, y + 1 + o, 1.6, 1.6, 0.3), '#FFC83D', 0.6);
    return s;
  };
  if (!z) return body(0);
  // zombie: authored for the arms-forward pose, so it hangs down there; it has popped open and ribs stick out
  let s = body(0);
  s += P(`M${f(x - 7)},${f(y + 4.6)}L${f(x - 8.6)},${f(y - 1)}L${f(x + 5.6)},${f(y - 2.8)}L${f(x + 7)},${f(y + 4.6)}Z`, '#6B3D20', 1.1);
  s += cel(d, capsule([x - 4, y + 3], [x - 7.6, y - 4.6], 1.8, 1.6), ['#FFF4DC', '#D8C8A8'], { sw: 1, hi: 0 }) + P(ell(x - 7.8, y - 5.2, 1.3), '#FFF4DC', 1);
  s += cel(d, capsule([x + 2, y + 3], [x + 4, y - 5.6], 1.8, 1.6), ['#FFF4DC', '#D8C8A8'], { sw: 1, hi: 0 }) + P(ell(x + 4.2, y - 6.2, 1.3), '#FFF4DC', 1);
  s += P(`M${f(x - 5)},${f(y + 2.4)}C${f(x - 4)},${f(y - 1.4)} ${f(x + 3)},${f(y - 2.6)} ${f(x + 4.6)},${f(y + 1.6)}Z`, '#A8432A', 1);
  s += drool(x + 6.6, y + 10.8, 3.6, 1.4);
  return rot(s, 70, [x, y]);
};

const axeHeld: HandItem = (d, _z, _b, [x, y]) => {
  const top: Pt = [x + 5.6, y - 33];
  let s = cel(d, capsule([x - 0.6, y + 4.4], top, 2.4, 2.2), ['#B57A44', '#8A5530'], { sw: 1.2, hi: 0.5 });
  s += S(`M${f(x + 1.4)},${f(y - 10)}l0.8,-4M${f(x + 3)},${f(y - 22)}l0.6,-3`, 0.6, '#7A4524');
  const hx = top[0] - 0.4;
  const hy = top[1] + 3;
  const blade = `M${f(hx - 2)},${f(hy - 2.4)}L${f(hx + 4)},${f(hy - 3.6)}C${f(hx + 8)},${f(hy - 6)} ${f(hx + 10)},${f(hy - 2)} ${f(hx + 9.6)},${f(hy + 1.6)}C${f(hx + 10)},${f(hy + 5)} ${f(hx + 8)},${f(hy + 8)} ${f(hx + 4)},${f(hy + 5.8)}L${f(hx - 2)},${f(hy + 3.2)}Z`;
  s += cel(d, blade, ['#C9D2DC', '#8E99A6'], { hi: 0.8 });
  s += S(`M${f(hx + 8.6)},${f(hy - 2.4)}Q${f(hx + 9.6)},${f(hy + 1.4)} ${f(hx + 8.4)},${f(hy + 4.4)}`, 1, '#FFFFFF');
  s += P(rrect(hx - 3, hy - 3, 3.2, 6.6, 0.8), '#5A6470', 1);
  return s;
};

const caneUnder: HandItem = (d, _z, _b, [x, y]) => {
  const sx = x + 0.6;
  let s = cel(d, capsule([sx, y - 1], [sx - 0.6, y + 24.6], 2.2, 2), ['#9A5E30', '#6E3E1C'], { sw: 1.1, hi: 0.5 });
  s += P(rrect(sx - 1.8, y + 22.6, 3, 2.6, 0.8), '#3A2A22', 1);
  s += S(`M${f(sx - 0.2)},${f(y + 6)}l0.6,2.4M${f(sx - 0.4)},${f(y + 14)}l0.5,2.2`, 0.6, '#6E3E1C');
  // the crook
  s += S(`M${f(sx)},${f(y - 0.6)}C${f(sx)},${f(y - 6.6)} ${f(sx + 7.6)},${f(y - 6.6)} ${f(sx + 7)},${f(y - 1.6)}`, 3.8);
  s += S(`M${f(sx)},${f(y - 0.6)}C${f(sx)},${f(y - 6.6)} ${f(sx + 7.6)},${f(y - 6.6)} ${f(sx + 7)},${f(y - 1.6)}`, 1.8, '#9A5E30');
  s += S(`M${f(sx + 1.4)},${f(y - 4.6)}q2.2,-1.4 4,0`, 0.6, '#C98B55');
  return s;
};

const foamFinger: HandItem = (d, z, _b, [x, y]) => {
  const col: Tone = ['#FFC83D', '#D9971A'];
  let s = '';
  if (!z) {
    const fing = `M${f(x - 1.6)},${f(y - 3)}L${f(x - 1.8)},${f(y - 15.4)}C${f(x - 1.8)},${f(y - 17.6)} ${f(x + 1.8)},${f(y - 17.6)} ${f(x + 1.8)},${f(y - 15.4)}L${f(x + 2)},${f(y - 3)}Z`;
    s += cel(d, fing, col, { sw: 1.4, hi: 0.6 });
    const palm = `M${f(x - 4.8)},${f(y - 4.4)}C${f(x - 5.4)},${f(y + 2)} ${f(x - 3.6)},${f(y + 4.4)} ${f(x)},${f(y + 4.4)}C${f(x + 3.8)},${f(y + 4.4)} ${f(x + 5.2)},${f(y + 2)} ${f(x + 4.8)},${f(y - 4.4)}C${f(x + 3)},${f(y - 5.6)} ${f(x - 3)},${f(y - 5.6)} ${f(x - 4.8)},${f(y - 4.4)}Z`;
    s += cel(d, palm, col, { sw: 1.4, hi: 0.6 });
    s += S(`M${f(x - 3.2)},${f(y - 4.4)}v2.4M${f(x + 3.2)},${f(y - 4.4)}v2.4`, 0.8, col[1]);
    s += txt(x, y + 2.4, 4, '#1', '#5A2A88');
    return s;
  }
  // zombie: the finger flops down along the arm (it points forward in the arms-out pose)
  const fing = `M${f(x - 2)},${f(y + 3)}C${f(x - 2.4)},${f(y + 8)} ${f(x - 1)},${f(y + 12)} ${f(x + 1.6)},${f(y + 14)}C${f(x + 3.6)},${f(y + 14.6)} ${f(x + 4)},${f(y + 12.6)} ${f(x + 2.6)},${f(y + 11)}C${f(x + 1.6)},${f(y + 9)} ${f(x + 2)},${f(y + 6)} ${f(x + 2.2)},${f(y + 3)}Z`;
  s += cel(d, fing, col, { sw: 1.4, hi: 0.5 });
  const palm = `M${f(x - 4.8)},${f(y - 4.4)}C${f(x - 5.4)},${f(y + 2)} ${f(x - 3.6)},${f(y + 4.4)} ${f(x)},${f(y + 4.4)}C${f(x + 3.8)},${f(y + 4.4)} ${f(x + 5.2)},${f(y + 2)} ${f(x + 4.8)},${f(y - 4.4)}C${f(x + 3)},${f(y - 5.6)} ${f(x - 3)},${f(y - 5.6)} ${f(x - 4.8)},${f(y - 4.4)}Z`;
  s += cel(d, palm, col, { sw: 1.4, hi: 0.6 });
  s += txt(x, y + 1.6, 4, '#1', '#5A2A88', 'middle', `transform="rotate(180 ${f(x)} ${f(y)})"`);
  s += P(`M${f(x - 2.6)},${f(y - 1)}l1.6,-1.2l1,1.4l1.4,-1.6l1,1.8l-1.6,1.4l-1.2,-0.8l-1.4,0.8Z`, ZSK[1], 0.6);
  s += stain(x + 2.2, y + 9.6, 0.5, STAIN_G, 0.8) + drool(x + 2, y + 14.2, 2.8, 1.2);
  return s;
};

const pomL: HandItem = (d, z, _b, [x, y]) => (z ? brain(d, x + 0.4, y + 1.4, 5.6) : pompom(x, y + 1, 6.4, ['#FFC83D', '#FFFFFF', '#2F6FD6']));
const pomR: HandItem = (_d, z, _b, [x, y]) => pompom(x, y + 1, 6.4, z ? ['#E0B23A', '#E8E2D0', '#2F6FD6'] : ['#FFC83D', '#FFFFFF', '#2F6FD6'], z);

function notepad(d: Doc, x: number, y: number, z: boolean): string {
  const pad = rrect(x - 5.4, y - 6.8, 10.8, 13.4, 1);
  let s = cel(d, pad, ['#FFFDF4', '#E2DCCA'], { sw: 1.2, hi: 0 });
  for (let i = 0; i < 5; i++) s += P(ell(x - 4 + i * 2, y - 6.8, 0.6, 0.9), 'none', 0.7);
  if (!z) {
    s += S(`M${f(x - 3.6)},${f(y - 3.6)}h6M${f(x - 3.6)},${f(y - 1.6)}h7M${f(x - 3.6)},${f(y + 0.4)}h4.4`, 0.55, '#9AA0A8');
    s += txt(x + 1.6, y + 5, 3.4, '1/5', '#D7263E');
    s += S(`M${f(x - 3.8)},${f(y + 2.4)}q1.4,1.2 3,0`, 0.6, '#D7263E');
  } else {
    s += txt(x, y - 1.6, 2.6, 'BRAINS', '#D7263E');
    s += txt(x - 1.2, y + 3.6, 3.6, '5/5', '#3A8A3A');
    s += P(star(x + 3.4, y + 2.4, 1.5), '#FFC83D', 0.6);
    s += stain(x + 3.6, y + 5.4, 0.5, STAIN_G, 0.85);
  }
  return s;
}

const critPadUnder: HandItem = (d, z, _b, [x, y]) => {
  if (!z) return notepad(d, x + 6.6, y - 1.6, false);
  // zombie: held out in the hand, pre-rotated so it reads upright when the arm reaches forward
  return rot(notepad(d, x + 1, y + 7.4, true), 64, [x, y]);
};

const pen: HandItem = (_d, _z, _b, [x, y]) => rot(P(rrect(x - 0.8, y - 7, 1.6, 9, 0.6), '#2B2B33', 0.9) + P(rrect(x - 0.8, y - 7, 1.6, 2, 0.4), '#FFC83D', 0.7), 18, [x, y]);

const selfieUnder: HandItem = (d, z, _b, [x, y]) => {
  const L = z ? 30 : 42;
  const a = z ? 58 : 12; // degrees clockwise from straight up
  const r = (a * Math.PI) / 180;
  const top: Pt = [x + Math.sin(r) * L, y - Math.cos(r) * L];
  let s = S(`M${f(x)},${f(y + 2)}L${f(top[0])},${f(top[1])}`, 2.6) + S(`M${f(x)},${f(y + 2)}L${f(top[0])},${f(top[1])}`, 1.2, '#9AA0A8');
  let head = '';
  const [px, py] = top;
  const ringR = 6.2;
  head += `<circle cx="${f(px)}" cy="${f(py - 4.6)}" r="${f(ringR + 2.4)}" fill="#FFF3B0" opacity="${z ? 0.25 : 0.45}"/>`;
  head += P(ell(px, py - 4.6, ringR), 'none', 3.6) + P(ell(px, py - 4.6, ringR), 'none', 2.2, z ? '#E8E2C0' : '#FFFBEA');
  if (z) head += S(`M${f(px - ringR * 0.7)},${f(py - 4.6 - ringR * 0.7)}A${f(ringR)},${f(ringR)} 0 0 1 ${f(px + ringR * 0.2)},${f(py - 4.6 - ringR)}`, 2.2, '#7A7460');
  head += cel(d, rrect(px - 2.6, py - 9.4, 5.2, 9.6, 1.2), ['#FF7FB0', '#D9578A'], { sw: 1.2, hi: 0.5 });
  head += P(ell(px - 0.9, py - 7.8, 0.9), '#2B2B33', 0.6) + P(ell(px + 1, py - 7.8, 0.5), '#FFFFFF', 0.4);
  head += P(heart(px, py - 3.6, 0.55), '#FFFFFF', 0);
  if (z) head += P(ell(px + 1.4, py - 1.4, 0.8), '#FF3B3B', 0.6) + S(`M${f(px - 2.4)},${f(py - 5)}l2,1.4l-0.6,1.6l2.8,1.8`, 0.6, '#FFFFFF');
  s += rot(head, a, [px, py]);
  return s;
};

const photoCard: HandItem = (d, z, _b, [x, y]) => {
  const card = (cx: number, cy: number) => {
    let s = cel(d, rrect(cx - 4.8, cy - 6, 9.6, 12, 0.6), ['#FFFFFF', '#E2E4E8'], { sw: 1.1, hi: 0 });
    s += P(rrect(cx - 3.8, cy - 5, 7.6, 7.6, 0.4), '#3A3A48', 0);
    s += P(ell(cx, cy - 2, 2, 2.3), '#F2D27A', 0) + P(`M${f(cx - 3.2)},${f(cy + 2.6)}Q${f(cx)},${f(cy - 1)} ${f(cx + 3.2)},${f(cy + 2.6)}Z`, '#D7263E', 0);
    s += P(star(cx + 2.4, cy - 3.6, 1.1), '#FFC83D', 0);
    s += S(`M${f(cx - 3.4)},${f(cy + 4.2)}c1,-1.6 1.6,0.8 2.4,-0.6c0.8,-1.4 1.4,1 2.4,-0.4c0.6,-0.8 1.2,0 1.8,-0.2`, 0.8, z ? '#5FCB2A' : '#2B2B33');
    if (z) s += drool(cx - 0.6, cy + 5.6, 2.8, 1.1) + stain(cx + 3, cy - 4.6, 0.5, STAIN_G, 0.7);
    return s;
  };
  if (!z) return card(x + 4.4, y + 3);
  return rot(card(x + 1, y + 6.6), 62, [x, y]);
};

// ------------------------------------------------------------------ back-of-head helpers
function bunBack(d: Doc, t: Tone, x: number, y: number, r: number): string {
  return cel(d, ell(x, y, r, r * 0.9), t, { off: [-0.8, -0.8] }) + S(`M${f(x - r * 0.6)},${f(y - 0.4)}q${f(r * 0.6)},${f(-r * 0.6)} ${f(r * 1.2)},0`, 0.8, t[1]);
}

// ------------------------------------------------------------------ LOOKS
export const LOOKS: Record<string, L> = {};

// ======================================================= accountant
LOOKS.accountant = {
  skin: ['#F2C29B', '#D9996B'],
  hair: ['#6B4428', '#4A2E1A'],
  height: 78,
  pants: ['#5E6573', '#454B57'],
  shoe: ['#6B3F22', '#4A2A14'],
  sleeve: 'short',
  sleeveCol: ['#DCE9F7', '#AFC4DC'],
  torso: (d, z) => {
    const td = torsoD(z);
    let s = cel(d, td, ['#DCE9F7', '#AFC4DC']);
    if (!z) s += waist(d, td, ['#5E6573', '#454B57'], '#3A2A22', '#D9A520');
    s += shirtFolds('#AFC4DC');
    s += S('M0.5,-38.6V-21', 0.8, '#AFC4DC') + `<circle cx="1.6" cy="-33" r="0.55" fill="#8FA6C2"/><circle cx="1.6" cy="-27.4" r="0.55" fill="#8FA6C2"/>`;
    s += P('M-4.6,-44.8L0.4,-41.2L-0.8,-38.6L-5.4,-41.8Z', '#FFFFFF', 1) + P('M5.6,-44.8L0.6,-41.2L1.8,-38.6L6.4,-41.8Z', '#FFFFFF', 1);
    const tie =
      P('M-0.9,-41.8L2,-41.8L1.6,-39.4L-0.5,-39.4Z', '#8E1B2E', 1) + P('M-0.5,-39.4L1.6,-39.4L2.6,-25.6L0.5,-23.2L-1.6,-25.6Z', '#8E1B2E', 1) +
      S('M-0.2,-36L1.2,-36.6M-0.4,-31L1.4,-31.6M-0.6,-27.6L1.6,-28.2', 0.7, '#C9506A');
    if (z) {
      // the gag: his tie is stuck in his own calculator
      s += rot(tie, 16, [0.5, -41]);
      const calc = rrect(-9.4, -26.6, 7.2, 9.2, 1.2);
      s += cel(d, calc, ['#4A505A', '#30343B'], { sw: 1.2, hi: 0.6 });
      s += P(rrect(-8.4, -25.6, 5.2, 2.6, 0.4), '#B8E2A0', 0.7) + txt(-5.8, -23.5, 2, 'ERR', '#2E5A2A');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) s += P(rrect(-8.4 + c * 1.8, -21.8 + r * 1.9, 1.3, 1.3, 0.3), c === 2 && r === 1 ? '#FF8A1F' : '#C9CED6', 0.4);
    } else s += tie;
    s += P(rrect(-7.6, -37.6, 1, 3, 0.4), '#D7262E', 0.7) + (z ? '' : P(rrect(-6.1, -37.2, 1, 2.6, 0.4), '#2F6FD6', 0.7));
    s += P(rrect(-8.4, -35.4, 4.4, 4.4, 0.6), '#FFFFFF', 0.9);
    if (z) s += rip(d, 6, -27, 1) + rip(d, 6.4, -36, 0.7) + stain(4.6, -33, 0.8, '#7CC24A');
    return s;
  },
  torsoBack: (d, z) => shirtBack(d, z, ['#DCE9F7', '#AFC4DC'], { collar: '#FFFFFF', waist: z ? undefined : ['#5E6573', '#454B57'], belt: '#3A2A22', yoke: true }),
  hairFront: (d, z) => {
    const cap =
      'M-16.6,-55C-17.6,-71 -7,-77 2,-76.6C12,-76.4 18.8,-70.6 18.2,-60.6C16,-63.2 13,-64.8 9,-65.2' +
      'C4,-65.6 -2,-64.6 -5.4,-67.2C-8.2,-63.6 -11.8,-60.2 -13.4,-55.6Z';
    let s = cel(d, cap, ['#6B4428', '#4A2E1A'], { off: [-1, -1] });
    s += S('M-5.4,-67.2Q-4,-71.6 -2.4,-75M2,-66Q6,-70 10,-72', 1, '#4A2E1A') + hl(4, -72.4, 4, 1.2, -8, 0.35);
    if (z) s += strays('#4A2E1A');
    return s;
  },
  hairBack: (d, z) => backHair(d, ['#6B4428', '#4A2E1A']) + (z ? strays('#4A2E1A') : '') + S('M11.6,-59.4L16.4,-58.6', 1.1),
  face: 'nervous',
  zface: 'droopy',
  glasses: 'square',
};

// ======================================================= yoga
LOOKS.yoga = {
  skin: ['#E0A878', '#BF8455'],
  hair: ['#E8B84A', '#C08E2A'],
  brow: '#A8772A',
  height: 78,
  pants: ['#7B4FC4', '#5A3698'],
  shoe: ['#FF7FB0', '#D9578A'],
  shoeTrim: '#FFFFFF',
  leg: 'leggings',
  legStripe: '#FF7FB0',
  sleeve: 'none',
  sleeveCol: ['#E0A878', '#BF8455'],
  wristband: '#FF5FA2',
  lashes: true,
  torso: (d, z) => {
    const sk = z ? ZSK : (['#E0A878', '#BF8455'] as Tone);
    const td = torsoD(false);
    let s = cel(d, td, sk, { hi: 0.7 });
    let tank = 'M-10.2,-43.4L-6.2,-43.6C-5.2,-38.2 6.2,-38.2 7.2,-43.6L10.8,-43.4C11.2,-36 11.4,-28 11.4,-21.4';
    tank += z ? zz([11.4, -21.4], [-11.4, -21.4], 4, -1.6) : 'L-11.4,-21.4';
    tank += 'C-11.4,-28 -11,-36 -10.2,-43.4Z';
    s += d.clip(td, cel(d, tank, ['#2EC4B6', '#1E978C'], { sw: OW * 0.8 }));
    s += S('M-9.4,-31.6Q0.5,-29.6 10.6,-31.6', 0.9, '#1E978C') + fold('M-6,-27q2,-1 4,0M3,-25.6q2,-1 4.4,-0.2', '#1E978C', 0.8);
    s += P(`M-1.6,-36.4c-1,-1.8 1.4,-2.6 2.1,-1c0.7,-1.6 3.1,-0.8 2.1,1l-2.1,2.2Z`, '#FFFFFF', 0, OUT, 'opacity="0.8"');
    s += d.clip(td, P('M-14,-21H14V-12H-14Z', '#7B4FC4') + P('M3,-21H14V-12H3Z', '#5A3698') + S('M-14,-18.6H14', 1.2, '#FF7FB0'));
    s += S('M-11.4,-21H11.4', 1.1) + S(td, OW);
    if (z) s += rip(d, 4.4, -35.6, 0.8) + stain(-5, -26, 0.7, STAIN_G, 0.6);
    return s;
  },
  torsoBack: (d, z) => {
    const sk = z ? ZSK : (['#E0A878', '#BF8455'] as Tone);
    const td = torsoD(false);
    let s = cel(d, td, sk, { hi: 0.7 });
    s += fold('M-4,-40q1,3 0.6,6M5.6,-40q-1,3 -0.6,6', darker(sk[1]), 0.8);
    let rb = 'M-6.6,-44.6L-3.6,-44.6L0.5,-35.6L4.6,-44.6L7.6,-44.6L3.2,-32.4C7,-31 10.6,-29.6 11.2,-27.6L11.4,-21.4';
    rb += z ? zz([11.4, -21.4], [-11.4, -21.4], 4, -1.6) : 'L-11.4,-21.4';
    rb += 'L-10.2,-27.6C-9.6,-29.6 -6,-31 -2.2,-32.4Z';
    s += d.clip(td, cel(d, rb, ['#2EC4B6', '#1E978C'], { sw: OW * 0.8 }));
    s += d.clip(td, P('M-14,-21H14V-12H-14Z', '#7B4FC4') + P('M3,-21H14V-12H3Z', '#5A3698') + S('M-14,-18.6H14', 1.2, '#FF7FB0'));
    s += S('M-11.4,-21H11.4', 1.1) + S(td, OW);
    if (z) s += rip(d, -5, -26, 0.7) + stitches(-6, -40, -2, -37, 2);
    return s;
  },
  back: (d, z) => {
    const pony = z
      ? 'M-8,-72C-16,-80 -27,-74 -27,-64L-29.4,-58.6L-25.6,-59.6L-26.4,-53.6L-23,-56.4L-20,-50.4C-22,-56 -21.4,-62 -16,-66Z'
      : 'M-8,-72C-16,-80 -27,-74 -27,-64C-27,-58 -24,-53 -20,-50.4C-22,-56 -21.4,-62 -16,-66Z';
    return cel(d, pony, ['#E8B84A', '#C08E2A'], { off: [-1, -1] }) + S('M-23,-66Q-21,-60 -20.6,-55M-18,-70Q-23,-68 -24,-62', 0.9, '#C08E2A');
  },
  hairFront: (d, z) => {
    let s = cel(d, HAIR_CAP, ['#E8B84A', '#C08E2A'], { off: [-1, -1] });
    s += S('M-10,-73Q-4,-75.6 2,-75.4M6,-74Q10,-72 13,-68', 0.9, '#C08E2A');
    s += cel(d, 'M-16.4,-61.4C-9,-69 10,-70.2 18.2,-64C18.4,-62.6 18.6,-61.4 18.6,-60C10,-66 -8,-65 -16.2,-57.6Z', ['#FF5FA2', '#D93C82'], { sw: 1.3, off: [-0.6, -0.6], hi: 0.5 });
    s += cel(d, ell(-15.6, -61, 2.2, 2.6), ['#FF5FA2', '#D93C82'], { sw: 1.2, hi: 0.4 });
    if (z) s += strays('#C08E2A');
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(0, -77), ['#E8B84A', '#C08E2A'], { off: [-1, -1] });
    s += S('M-12,-58Q-6,-68 1,-70M9,-56Q10,-64 3,-70', 0.9, '#C08E2A');
    s += cel(d, 'M-17.2,-62.4C-10,-67.4 10,-68.4 18.4,-63.6L18.6,-60C10,-64.6 -9,-64 -16.8,-59Z', ['#FF5FA2', '#D93C82'], { sw: 1.3, off: [-0.6, -0.6], hi: 0.5 });
    // scrunchie + ponytail hanging down the back
    const pony = z
      ? 'M-1.6,-66C-4.6,-60 -5,-52 -3.4,-44.6L-1.6,-47.4L-0.6,-43.6L1.2,-46.8L2.6,-44C4.6,-50 4.6,-59 2.6,-66Z'
      : 'M-1.6,-66C-4.6,-60 -5,-52 -2.6,-43.6C-0.8,-42.4 1.4,-42.4 3,-43.6C4.8,-50 4.6,-59 2.6,-66Z';
    s += cel(d, pony, ['#E8B84A', '#C08E2A'], { off: [-0.8, -0.8] }) + S('M0.6,-62Q-1.6,-54 0,-46', 0.8, '#C08E2A');
    s += cel(d, rrect(-2.8, -68.6, 6.6, 3.4, 1.6), ['#FF5FA2', '#D93C82'], { sw: 1.2, hi: 0.4 });
    if (z) s += strays('#C08E2A');
    return s;
  },
  face: 'calm',
  zface: 'lazy',
};

// ======================================================= teen
LOOKS.teen = {
  skin: ['#9C6440', '#7A4A2C'],
  hair: ['#2E2420', '#1A1412'],
  height: 80,
  pants: ['#3D5F9E', '#2B4675'],
  shoe: ['#F4F4F4', '#C9CED6'],
  shoeTrim: '#E2453C',
  sleeve: 'long',
  sleeveCol: ['#E2453C', '#B32E28'],
  cuff: '#B32E28',
  torso: (d, z) => {
    const td = torsoD(z, 11, 12);
    let s = cel(d, 'M-8.8,-41.6C-10.6,-48.8 -4,-50.8 0.5,-50.8C5,-50.8 11.6,-48.8 9.8,-41.6Z', ['#C93A31', '#9E2822'], { hi: 0.6 });
    s += cel(d, td, ['#E2453C', '#B32E28']);
    if (!z) s += d.clip(td, P('M-14,-19.6H14V-12H-14Z', '#B32E28') + S('M-14,-19.6H14', 1) + S('M-8,-19.4V-16M-4,-19.4V-16M0,-19.4V-16M4,-19.4V-16M8,-19.4V-16', 0.6, '#8E1F1A'));
    s += cel(d, 'M-6.6,-28.4L7.6,-28.4L9.2,-20.6L-8.2,-20.6Z', ['#E2453C', '#C2342C'], { sw: 1.1, off: [-0.5, -0.5], hi: 0.5 });
    s += S('M-4,-27.8V-21M5,-27.8V-21', 0.7, '#9E2822') + shirtFolds('#B32E28', 11);
    s += S('M-2.4,-43.4L-3,-35.4M3.4,-43.4L4,-36.2', 0.9, '#FFFFFF') + P(ell(-3, -35, 0.9), '#FFFFFF', 0.6) + P(ell(4, -35.8, 0.9), '#FFFFFF', 0.6);
    s += P('M5.6,-35.4L7.8,-38.6L7.4,-36.6L9,-36.8L6.8,-33.4L7.2,-35.4Z', '#FFD23D', 0.7);
    // phone peeking out of the pocket, earbud wire
    s += cel(d, rrect(-3.6, -30.6, 3.4, 5, 0.8), ['#2B2B33', '#16161C'], { sw: 0.9, hi: 0 }) + P(rrect(-3, -30, 2.2, 1.6, 0.3), '#7FD3FF', 0);
    s += S('M-1.9,-30.6C-2.6,-36 -6,-38 -7.6,-44.6', 0.6, '#FFFFFF');
    if (z) s += rip(d, -5.8, -36, 0.9) + rip(d, 6.6, -24.6, 0.7) + stain(-2, -24.4, 0.6, STAIN_G, 0.7);
    return s;
  },
  torsoBack: (d, z) => {
    const td = torsoD(z, 11, 12);
    let s = cel(d, td, ['#E2453C', '#B32E28']);
    if (!z) s += d.clip(td, P('M-14,-19.6H14V-12H-14Z', '#B32E28') + S('M-14,-19.6H14', 1));
    s += fold('M-8,-30q3,1.4 6,0.4M3,-27q3,1.2 6,0', '#B32E28', 0.8);
    // the hood hangs down the back
    const hood = 'M-8.6,-45.6C-10.4,-38.6 -7,-31 0.5,-30.4C8,-31 11.4,-38.6 9.6,-45.6C5,-43.4 -4,-43.4 -8.6,-45.6Z';
    s += cel(d, hood, ['#E2453C', '#B32E28'], { hi: 0.6 }) + S('M-6,-41.6C-5,-36 6,-36 7,-41.6', 0.9, '#9E2822');
    s += P(rrect(-5.4, -24, 11.8, 2.6, 0.8), '#FFFFFF', 0.8) + txt(0.5, -21.8, 2.4, 'SK8', '#E2453C');
    if (z) s += rip(d, 6, -26, 0.8) + rip(d, -6, -27, 0.7);
    return s;
  },
  hairFront: (d, z) => {
    const mop =
      'M-16.8,-54.6C-19.4,-64 -16,-72 -10,-74.8L-11.4,-79L-5.4,-76.4L-4.4,-81.4L0.8,-77.2L4.8,-81.2L7.2,-76.6' +
      'L12.6,-78.4L12.6,-74C17.6,-71.6 20,-66 19,-60.6C17,-62.8 14.6,-63.6 12.4,-63.2C11,-60.6 7.6,-59.4 4.6,-60.4' +
      'C5.6,-62 5.6,-63.6 5,-64.6C0.6,-63.6 -4,-63.6 -7.6,-65.2C-9.6,-61.6 -12.2,-58.6 -13.6,-55.2Z';
    let s = cel(d, mop, ['#2E2420', '#1A1412'], { off: [-1, -1], hiCol: '#5A4A44' });
    s += S('M-2,-66Q2,-70 6,-68M8,-64Q11,-67 14,-66', 0.8, '#5A4A44') + hl(3, -72, 3.8, 1, -12, 0.25);
    if (z) s += S('M-6,-80Q-8,-84 -6,-85.6', 1.1, '#1A1412');
    return s;
  },
  hairBack: (d, z) => {
    const mop =
      'M-16.6,-52C-19,-62 -16,-71 -10,-74.6L-11.4,-79L-5.4,-76.4L-4.4,-81.4L0.8,-77.2L4.8,-81.2L7.2,-76.6L12.6,-78.4L12.6,-74' +
      'C17.6,-71.6 20,-66 18.6,-60.6L16.2,-60.4C14,-59.6 12.6,-57 12.4,-54.6L10,-50.6L7.6,-52.4L5,-49L2.4,-51.6L-0.6,-48.4L-3,-51.4L-6,-48.6L-8,-51.6L-11.6,-49.4L-12.6,-52.6Z';
    let s = cel(d, mop, ['#2E2420', '#1A1412'], { off: [-1, -1], hiCol: '#5A4A44' });
    s += S('M-8,-58Q-6,-66 0,-70M4,-56Q6,-64 2,-70', 0.8, '#5A4A44');
    if (z) s += S('M-6,-80Q-8,-84 -6,-85.6', 1.1, '#1A1412');
    return s;
  },
  face: 'bored',
  zface: 'bigeye',
  earbuds: true,
  noBlush: true,
};

// ======================================================= politician
LOOKS.politician = {
  skin: ['#F5CDB0', '#DDA88A'],
  hair: ['#D9A441', '#A8772A'],
  height: 80,
  pants: ['#26355E', '#1A2546'],
  shoe: BLACK_SHOE,
  sleeve: 'long',
  sleeveCol: ['#26355E', '#1A2546'],
  cuff: '#FFFFFF',
  torso: (d, z) => {
    let s = suitV(d, ['#26355E', '#1A2546'], ['#D7262E', '#A51B22'], z);
    const pin = P(rrect(-7.2, -39.6, 3.4, 2.4, 0.3), '#FFFFFF', 0.6) + P('M-7.2,-38.8H-3.8M-7.2,-37.9H-3.8', 'none', 0.5, '#D7262E') + P(rrect(-7.2, -39.6, 1.4, 1.2, 0.2), '#2F4C8F');
    s += z ? rot(pin, 28, [-5.5, -38.4]) : pin;
    // pocket square
    s += P('M4.6,-36.4L5.4,-38.4L6.4,-36.8L7.4,-38.6L8.2,-36.4Z', '#FFFFFF', 0.7) + S('M4,-36.2H8.8', 1);
    if (z) s += rip(d, 6.4, -24.6, 0.9) + rip(d, -6.4, -27.6, 0.7) + stain(-3, -21, 0.6, STAIN_G, 0.7);
    return s;
  },
  torsoBack: (d, z) => suitBack(d, ['#26355E', '#1A2546'], z),
  hairFront: (d, z) => {
    const swoop =
      'M-16.8,-55.4C-18.8,-70 -10,-79.4 1.4,-79.6C12,-80 21.4,-75 19.6,-64C17.6,-67.8 12.6,-69.6 6.6,-68.4' +
      'C1.6,-67.4 -4,-67.8 -7.4,-65.4C-10.8,-63 -12.6,-58.4 -13.6,-55.6Z';
    let s = cel(d, swoop, ['#D9A441', '#A8772A'], { off: [-1, -1] });
    s += S('M-10,-72Q-2,-78 10,-75.6M-12,-66.6Q-4,-74.4 8,-71.6', 0.9, '#A8772A');
    s += hl(6, -76.4, 5, 1.3, -6, 0.75) + hl(-6, -73.6, 2.4, 0.8, -30, 0.6);
    if (z) s += strays('#A8772A');
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(0, -79.6), ['#D9A441', '#A8772A'], { off: [-1, -1] });
    s += S('M-12,-60Q-6,-72 6,-74M-2,-52Q2,-62 12,-66M14,-62Q12,-70 4,-77', 0.9, '#A8772A') + hl(2, -75, 5, 1.3, -6, 0.6);
    if (z) s += strays('#A8772A');
    return s;
  },
  face: 'grin',
  zface: 'smile',
};

// ======================================================= construction
LOOKS.construction = {
  skin: ['#7A4A2E', '#5A3420'],
  hair: ['#2B211C', '#1A1412'],
  height: 82,
  pants: ['#4E6E9E', '#3A5480'],
  shoe: ['#A8693A', '#7A4524'],
  boots: true,
  sleeve: 'short',
  sleeveCol: ['#3D7DD8', '#2B5DA8'],
  torso: (d, z) => {
    const td = torsoD(z, 10.8, 11.8);
    let s = cel(d, td, ['#FF7A1A', '#D9561A']);
    s += d.clip(td, P('M-3.8,-45L0.5,-33.6L4.8,-45Z', '#3D7DD8', 1.1));
    s += S('M0.5,-33.6V-16', 1.1);
    const refl = '#F4F7A0';
    s += d.clip(td, P('M-14,-28.4H-0.6V-25.4H-14Z', refl, 0.9) + P('M1.6,-28.4H14V-25.4H1.6Z', refl, 0.9));
    s += d.clip(td, P('M-7.4,-45L-5.2,-45L-5.2,-28.4L-7.4,-28.4Z', refl, 0.9) + P('M6.2,-45L8.4,-45L8.4,-28.4L6.2,-28.4Z', refl, 0.9));
    s += P(rrect(-8.6, -22.6, 4, 3.4, 0.6), '#D9561A', 0.9);
    s += fold('M-9,-34q2,1 3.6,0M9.6,-33q-2,1 -3.4,0', '#D9561A', 0.9);
    // tape measure + pencil
    s += cel(d, rrect(4.4, -23.2, 4.8, 4.4, 1.4), ['#FFD23D', '#E0A21A'], { sw: 1, hi: 0.4 }) + P(ell(6.8, -21, 1, 1), '#2B2B33', 0.6);
    s += P('M-3.4,-38.8L-1.8,-44.6L-1,-44.4L-2.4,-38.6Z', '#FFD23D', 0.7);
    s += S(td, OW);
    if (z) s += rip(d, 4, -30, 0.9) + rip(d, -4.6, -34, 0.7) + stain(5, -38, 0.6, STAIN_G, 0.7);
    return s;
  },
  torsoBack: (d, z) => {
    const td = torsoD(z, 10.8, 11.8);
    let s = cel(d, td, ['#FF7A1A', '#D9561A']);
    s += P('M-4.6,-45.2Q0.5,-46.6 5.6,-45.2L5.2,-43Q0.5,-44 -4.2,-43Z', '#3D7DD8', 1);
    const refl = '#F4F7A0';
    s += d.clip(td, P('M-14,-30.4H14V-27.4H-14Z', refl, 0.9) + P('M-14,-24.4H14V-21.4H-14Z', refl, 0.9));
    s += d.clip(td, P('M-9,-45L-6.6,-45L5,-30.6L2.6,-30.6Z', refl, 0.9) + P('M8,-45L10.4,-45L-1.6,-30.6L-4,-30.6Z', refl, 0.9));
    s += fold('M0.5,-30V-17', '#D9561A', 0.8);
    s += S(td, OW);
    if (z) s += rip(d, -5, -26, 0.9) + rip(d, 6, -36, 0.7);
    return s;
  },
  hairFront: (d, z) =>
    d.tone('M-16.4,-55.4C-17,-60 -15.8,-63 -13.4,-64.6L-10.6,-63.4C-12.2,-61 -12.8,-58 -12.8,-55.6Z', ['#2B211C', '#1A1412'], 1.4, [-0.5, -0.5]) + hardHat(d, ['#FFC23D', '#E09A10'], z),
  hairBack: (d, z) => cel(d, backHairD(3, -70), ['#2B211C', '#1A1412'], { off: [-1, -1], hi: 0.8 }) + hardHatBack(d, ['#FFC23D', '#E09A10'], z),
  face: 'smile',
  zface: 'underbite',
  beard: ['#2B211C', '#1A1412'],
  noBlush: true,
};

// ======================================================= nurse
LOOKS.nurse = {
  skin: ['#F7D9B8', '#DDB08A'],
  hair: ['#C0562B', '#8F3B1C'],
  height: 82,
  pants: ['#FFFFFF', '#D5D8DC'],
  shoe: ['#FFFFFF', '#CDD3DA'],
  leg: 'stockings',
  sleeve: 'puff',
  sleeveCol: ['#F7A8C0', '#D97A98'],
  lashes: true,
  lips: '#D9577A',
  torso: (d, z) => {
    const bot = -11.6;
    let dress = 'M-10.6,-40.8C-10.6,-43.6 -8,-44.8 -4.8,-44.8L5.8,-44.8C9,-44.8 11.6,-43.6 11.6,-40.8L11.6,-33' + `L13.8,${f(bot + 2)}`;
    dress += z ? zz([13.8, bot], [-12.8, bot], 6, -2) : `C13.8,${f(bot)} 13,${f(bot)} 12,${f(bot)}L-11,${f(bot)}C-12,${f(bot)} -12.8,${f(bot)} -12.8,${f(bot + 2)}`;
    dress += 'L-10.6,-33Z';
    let s = cel(d, dress, ['#F7A8C0', '#D97A98']);
    s += S('M-10.6,-33.2C-4,-34.6 5,-34.6 11.6,-33.2', 1.2);
    s += fold('M-9,-28q0.6,6 -1.6,14M10,-26q1,6 2.2,12', '#D97A98', 0.9);
    s += cel(d, 'M-6,-32.8C-3,-33.6 4,-33.6 7,-32.8L8.6,-14C3,-12.8 -2,-12.8 -7.6,-14Z', ['#FFFFFF', '#E1E4E8'], { sw: 1.1, off: [-0.6, -0.6], hi: 0 });
    s += P(rrect(-0.2, -27, 1.6, 6, 0.3), '#E2343B') + P(rrect(-2.4, -24.8, 6, 1.6, 0.3), '#E2343B');
    s += P('M-3.6,-44.8L0.5,-41.6L5,-44.8L3,-45.6L0.5,-43.8L-2,-45.6Z', '#FFFFFF', 1);
    s += P(ell(-5.6, -39, 0.75), '#FFFFFF', 0.6) + P(ell(-5.6, -36.4, 0.75), '#FFFFFF', 0.6);
    // stethoscope
    const st = z
      ? S('M-3.6,-44.2C-5.6,-40 -6,-36 -4.6,-31.6M5,-44.2C7,-40 8.6,-34 7.4,-26', 1.4, '#5A6470') + P(ell(7.4, -25, 1.7), '#C9D2DC', 1) + drool(7.4, -23.6, 2.6, 1)
      : S('M-3.6,-44.2C-5.6,-40 -6,-36 -4.6,-31.6M5,-44.2C7,-40 7.4,-36 6,-32', 1.4, '#5A6470') + S('M-4.6,-31.6Q0.5,-28 6,-32', 1.2, '#5A6470') + P(ell(0.8, -29.6, 1.7), '#C9D2DC', 1) + hl(0.3, -30.1, 0.6, 0.3, 0, 0.9);
    s += st;
    if (z) s += rip(d, 7.6, -38, 0.8) + rip(d, -8.6, -17, 0.8) + stain(3.4, -18, 0.8, '#7CC24A');
    return s;
  },
  torsoBack: (d, z) => {
    const bot = -11.6;
    let dress = 'M-11.6,-40.8C-11.6,-43.6 -9,-44.8 -5.8,-44.8L6.8,-44.8C10,-44.8 12.6,-43.6 12.6,-40.8L12.6,-33' + `L14.2,${f(bot + 2)}`;
    dress += z ? zz([14.2, bot], [-13.2, bot], 6, -2) : `C14.2,${f(bot)} 13.4,${f(bot)} 12.4,${f(bot)}L-11.4,${f(bot)}C-12.4,${f(bot)} -13.2,${f(bot)} -13.2,${f(bot + 2)}`;
    dress += 'L-11.6,-33Z';
    let s = cel(d, dress, ['#F7A8C0', '#D97A98']);
    s += S('M0.5,-44.6V-30', 1, '#D97A98') + P(rrect(-0.4, -45, 1.8, 2.6, 0.5), '#C9D2DC', 0.7);
    s += S('M-11.6,-33.2C-4,-34.6 5,-34.6 12.6,-33.2', 1.2);
    s += S('M-11.4,-30.6H12.4', 1.6, '#FFFFFF') + S('M-11.4,-31.4H12.4M-11.4,-29.8H12.4', 0.5, '#C9C2B4');
    const loop = 'M0.5,-30.4C-2.6,-34 -6.4,-33.4 -6,-30.6C-5.6,-28 -2.4,-28.6 0.5,-30.4ZM0.5,-30.4C3.6,-34 7.4,-33.4 7,-30.6C6.6,-28 3.4,-28.6 0.5,-30.4Z';
    s += d.tone('M-0.4,-30L-3.4,-22.4L-1,-23L0.6,-29.6ZM1.4,-30L4.6,-22.8L2.2,-23.2L0.6,-29.6Z', WHITE, 1, [-0.4, -0.4]) + d.tone(loop, WHITE, 1, [-0.4, -0.4]) + P(ell(0.5, -30.4, 1.4, 1.3), '#EDE6D6', 1);
    s += fold('M-9,-26q0.6,6 -1.6,12M10,-24q1,6 2.2,10', '#D97A98', 0.9);
    if (z) s += rip(d, -6, -38, 0.8) + rip(d, 8, -19, 0.8) + stain(-4, -18, 0.7, '#7CC24A');
    return s;
  },
  back: (d) => cel(d, ell(-12.6, -70.6, 5.4, 4.8), ['#C0562B', '#8F3B1C'], { off: [-0.8, -0.8] }) + S('M-15,-71q2,-2 5,-1', 0.8, '#8F3B1C'),
  hairFront: (d, z) => {
    const cap =
      'M-16.6,-55C-17.8,-71 -7,-77 2,-76.6C12,-76.4 19,-70.4 18.4,-59.4C16,-62.4 13.4,-63.4 11.2,-63.4' +
      'C9,-66.6 4,-67.4 0.4,-66.6C-4,-65.6 -8,-62.4 -10.6,-58.6C-11.8,-56.8 -12.6,-55.8 -13.4,-55.2Z';
    let s = cel(d, cap, ['#C0562B', '#8F3B1C'], { off: [-1, -1] });
    s += S('M-8,-72Q0,-75.6 8,-73M10,-66Q14,-66 16,-62', 0.9, '#8F3B1C') + hl(6, -73.4, 3.4, 1, -10, 0.35);
    const nc = 'M-11.4,-69.6L-9.2,-79.6L13,-79.6L15.2,-69.6Q2,-72.6 -11.4,-69.6Z';
    const capG = cel(d, nc, ['#FFFFFF', '#DDE2E8'], { off: [-0.8, -0.8], hi: 0 }) + P(rrect(1.1, -78.4, 1.8, 6, 0.3), '#E2343B') + P(rrect(-0.9, -76.4, 5.8, 1.8, 0.3), '#E2343B');
    if (z) s += S('M-14,-66Q-18,-68 -18.4,-64.6M16,-63.6Q19.4,-64.4 19.6,-61', 1.1, '#8F3B1C');
    s += z ? rot(capG, -10, [2, -72]) : capG;
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(-1, -77), ['#C0562B', '#8F3B1C'], { off: [-1, -1] });
    s += S('M-10,-58Q-8,-66 -2,-72M8,-56Q10,-64 6,-72', 0.9, '#8F3B1C');
    s += bunBack(d, ['#C0562B', '#8F3B1C'], 0.4, -57.6, 5.4) + S('M-3,-59.6q3,-2 6.6,0.4M-2.4,-56q3,1.4 6,-0.2', 0.8, '#8F3B1C');
    const nc = 'M-12.4,-69.6L-10.2,-79.6L12,-79.6L14.2,-69.6Q1,-72.6 -12.4,-69.6Z';
    const capG = cel(d, nc, ['#FFFFFF', '#DDE2E8'], { off: [-0.8, -0.8], hi: 0 }) + S('M-11,-73.6Q1,-76 13,-73.6', 0.8, '#C9CED6');
    if (z) s += S('M-14,-66Q-18,-68 -18.4,-64.6', 1.1, '#8F3B1C');
    s += z ? rot(capG, -10, [1, -72]) : capG;
    return s;
  },
  face: 'smile',
  zface: 'stitched',
};

// ======================================================= cop
LOOKS.cop = {
  skin: ['#B97A4E', '#935A33'],
  hair: ['#2B211C', '#1A1412'],
  height: 82,
  pants: NAVY_P,
  shoe: BLACK_SHOE,
  sleeve: 'long',
  sleeveCol: NAVY,
  cuff: '#23396B',
  itemL: donut,
  torso: (d, z) => {
    const td = torsoD(z);
    let s = cel(d, td, NAVY);
    s += waist(d, td, NAVY_P, '#1C1919', '#FFC83D');
    s += P('M-4.6,-44.8L0.4,-41.2L-0.8,-38.6L-5.4,-41.8Z', '#3D5FA8', 1) + P('M5.6,-44.8L0.6,-41.2L1.8,-38.6L6.4,-41.8Z', '#3D5FA8', 1);
    s += P('M-0.8,-41.4L1.8,-41.4L2.2,-33L0.5,-31.4L-1.2,-33Z', '#1C2A4D', 1);
    s += S('M0.5,-31V-22', 0.8, '#1C2A4D') + shirtFolds('#23396B');
    s += P('M3,-37.4H8.4V-35.2L5.7,-34.4L3,-35.2Z', '#3D5FA8', 0.9);
    const badge = P('M-8.4,-38.6L-5.8,-39.8L-3.2,-38.6L-3.6,-35.2L-5.8,-33.2L-8,-35.2Z', '#FFC83D', 1) + P(star(-5.8, -36.6, 1.3), '#D9971A');
    s += z ? rot(badge, 24, [-5.8, -36.6]) : badge;
    s += P(rrect(6.4, -22.6, 3.8, 4.6, 0.8), '#3A2A22', 0.9);
    // handcuffs
    s += P(ell(-7.4, -18.8, 1.6, 1.6), 'none', 1.6) + P(ell(-7.4, -18.8, 1.6, 1.6), 'none', 0.8, '#C9D2DC') + P(ell(-4.6, -17.6, 1.6, 1.6), 'none', 1.6) + P(ell(-4.6, -17.6, 1.6, 1.6), 'none', 0.8, '#C9D2DC');
    if (z) s += rip(d, 5.6, -28.6, 0.9) + rip(d, -6.6, -25.6, 0.7) + P(ell(3, -33, 1.2, 0.8), '#FF8FB8', 0.6);
    return s;
  },
  torsoBack: (d, z) => {
    let s = shirtBack(d, z, NAVY, { collar: '#3D5FA8', waist: NAVY_P, belt: '#1C1919', yoke: true });
    s += txt(0.5, -33.4, 3.8, 'POLICE', '#FFC83D', 'middle', 'letter-spacing="0.2"');
    return s;
  },
  hairFront: (d, z) => {
    let s = d.tone('M-16.4,-55.4C-17,-60 -15.8,-63 -13.4,-64.6L-10.6,-63.4C-12.2,-61 -12.8,-58 -12.8,-55.6Z', ['#2B211C', '#1A1412'], 1.4, [-0.5, -0.5]);
    const crown = 'M-14.4,-64.4L-17.2,-74.6Q2,-82.6 21,-74L18.6,-64Z';
    let cap = cel(d, crown, NAVY, { off: [-1.2, -1] });
    cap += S('M-14.6,-66.2Q2,-69.4 18.8,-65.8', 1.1, '#1C2A4D');
    cap += cel(d, 'M-15.2,-64.6Q3,-67.6 21,-62.6L19.8,-59.8Q3,-64.4 -14.8,-61.8Z', ['#1C1919', '#0C0A0A'], { sw: 1.2, hi: 0.5 });
    cap += P('M3,-77.2L5.2,-76L5,-72.6L3,-71.2L1,-72.6L0.8,-76Z', '#FFC83D', 1) + P(ell(3, -74.4, 0.8), '#D9971A');
    s += z ? rot(cap, -8, [2, -66]) : cap;
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(-6, -68), ['#2B211C', '#1A1412'], { off: [-1, -1], hi: 0.8 });
    const crown = 'M-16.4,-64.4L-18.2,-74.6Q1,-82.6 20,-74L17.6,-64Z';
    let cap = cel(d, crown, NAVY, { off: [-1.2, -1] }) + S('M-15.6,-66.2Q1,-69.4 17.8,-65.8', 1.2, '#1C2A4D') + P('M-16.6,-64.6Q1,-67.4 18,-64.6L17.4,-62.4Q1,-65 -16,-62.4Z', '#1C2A4D', 1);
    cap += P('M19,-62.6L24.6,-61.4L23.2,-59.4L18.4,-60.6Z', '#1C1919', 1);
    s += z ? rot(cap, -8, [1, -66]) : cap;
    return s;
  },
  face: 'stern',
  zface: 'lazy',
  mustache: ['#3A2A20', '#24180F'],
  noBlush: true,
};

// ======================================================= ceo
LOOKS.ceo = {
  skin: ['#EAC09A', '#CC9A70'],
  hair: ['#B8BDC6', '#8B919C'],
  height: 78,
  pants: ['#3B3E46', '#26282E'],
  shoe: ['#1E1E24', '#0C0C10'],
  sleeve: 'long',
  sleeveCol: ['#3B3E46', '#26282E'],
  cuff: '#FFFFFF',
  watch: true,
  itemR: briefcase,
  boxR: [-2, -48, 27, -10],
  torso: (d, z) => {
    let s = suitV(d, ['#3B3E46', '#26282E'], ['#E3A72F', '#B8821A'], z);
    s += S('M3.8,-35H8.6', 1) + P('M4.4,-35L5,-37.4L5.8,-36.2L6.6,-37.8L7.4,-36.2L8,-37.4L8.2,-35Z', z ? '#D9D2C4' : '#FFFFFF', 0.8);
    // pinstripes
    s += d.clip(torsoD(z), S('M-8,-44V-16M-5,-44V-16M6,-44V-16M9,-44V-16', 0.35, '#6A6E78'));
    if (z) s += rip(d, -6.4, -24.4, 0.9) + rip(d, 6, -29, 0.7) + stain(-6, -37, 0.6, '#7CC24A', 0.8);
    return s;
  },
  torsoBack: (d, z) => suitBack(d, ['#3B3E46', '#26282E'], z) + d.clip(torsoD(z), S('M-8,-42V-16M-5,-42V-16M6,-42V-16M9,-42V-16', 0.35, '#6A6E78')),
  hairFront: (d, z) => {
    const slick =
      'M-16.8,-55.4C-18.4,-70 -10,-78 1.6,-78C12,-78.2 20.2,-73 18.8,-63C16.6,-65.6 12,-67 7,-66.6' +
      'C2,-66.2 -3.2,-66.6 -7.4,-64.4C-10.4,-62.6 -12.4,-58.6 -13.4,-55.6Z';
    let s = cel(d, slick, ['#B8BDC6', '#8B919C'], { off: [-1, -1] });
    s += S('M16,-68Q4,-72 -10,-70.6M17.4,-71.8Q6,-76 -6,-74.6M12,-66.8Q2,-69 -9,-66.6', 0.9, '#8B919C');
    s += hl(5, -75.4, 4.6, 1.1, -4, 0.7);
    if (z) s += strays('#8B919C');
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(0, -78), ['#B8BDC6', '#8B919C'], { off: [-1, -1] });
    s += S('M-14,-58Q-4,-66 14,-64M-12,-64Q0,-72 16,-68M-6,-52Q2,-58 12,-58', 0.9, '#8B919C') + hl(0, -74, 5, 1.2, -4, 0.6);
    if (z) s += strays('#8B919C');
    return s;
  },
  face: 'smug',
  zface: 'worm',
  noBlush: true,
};

// ======================================================= traffic cop
const TC_SKIN: Tone = ['#8A5A3C', '#6B4029'];
const HIVIS: Tone = ['#D7F23A', '#A9C21E'];
function tcCapFront(d: Doc, z: boolean): string {
  const crown = 'M-14.4,-64.4L-17.2,-74.6Q2,-82.6 21,-74L18.6,-64Z';
  let cap = cel(d, crown, NAVY, { off: [-1.2, -1] });
  cap += cel(d, 'M-17.2,-74.6Q2,-82.6 21,-74L19.8,-69.4Q2,-75.4 -16,-70Z', ['#FFFFFF', '#D5DAE0'], { sw: OW, off: [-0.8, -0.8], hi: 0 });
  cap += S('M-14.6,-66.2Q2,-69.4 18.8,-65.8', 1.1, '#1C2A4D');
  cap += cel(d, 'M-15.2,-64.6Q3,-67.6 21,-62.6L19.8,-59.8Q3,-64.4 -14.8,-61.8Z', ['#1C1919', '#0C0A0A'], { sw: 1.2, hi: 0.5 });
  cap += P(star(3, -68.2, 2.2), '#FFC83D', 0.9);
  cap += S('M-14.8,-66.4Q2,-70.6 19.4,-66.4', 0.9, '#FFC83D', 'stroke-dasharray="1.2 1"');
  return z ? rot(cap, -9, [2, -66]) : cap;
}
function whistle(z: boolean, e: Expr): string {
  if (e === 'scream' || e === 'shock' || e === 'happy' || e === 'chomp') {
    // knocked out of the mouth: dangling on its cord
    return S('M-2,-44.4Q2,-40 8,-42.6', 0.8, '#FFC83D') + G(P(rrect(6.4, -45.4, 5.6, 3, 1.2), '#C9D2DC', 1) + P(ell(11.4, -43.9, 1.4), '#C9D2DC', 1) + P(ell(11.4, -43.9, 0.5), OUT), 'rotate(18 9 -44)');
  }
  const y = e === 'dazed' ? -46.2 : -49.6;
  const r = e === 'dazed' ? 28 : -8;
  let s = S(`M4,${f(y + 1.4)}Q6,-44 1,-43.4`, 0.8, '#FFC83D');
  s += G(
    P(rrect(2.4, y - 1.4, 7, 3.2, 1.4), '#C9D2DC', 1.1) + P(ell(9.4, y + 0.2, 1.9), '#C9D2DC', 1.1) + P(ell(9.4, y + 0.2, 0.7), OUT) + hl(4.6, y - 0.6, 1.6, 0.4, 0, 0.8) +
      (z ? P(ell(6.2, y + 2, 1, 0.7), GOO, 0.6) : ''),
    `rotate(${r} 3 ${f(y)})`,
  );
  return s;
}
LOOKS.trafficcop = {
  skin: TC_SKIN,
  hair: ['#2B2124', '#16101A'],
  height: 82,
  pants: NAVY_P,
  legStripe: '#D7F23A',
  shoe: BLACK_SHOE,
  boots: true,
  sleeve: 'long',
  sleeveCol: NAVY,
  glove: ['#FFFFFF', '#D5DAE0'],
  lashes: true,
  torso: (d, z) => {
    const td = torsoD(z);
    let s = cel(d, td, NAVY);
    s += waist(d, td, NAVY_P, '#1C1919', '#FFC83D');
    s += P('M-4.6,-44.8L0.4,-41.2L-0.8,-38.6L-5.4,-41.8Z', '#3D5FA8', 1) + P('M5.6,-44.8L0.6,-41.2L1.8,-38.6L6.4,-41.8Z', '#3D5FA8', 1);
    s += P('M-0.8,-41.4L1.8,-41.4L2,-37L0.5,-36L-1,-37Z', '#1C2A4D', 1);
    let vest = 'M-10.4,-41C-10.6,-43.6 -8.6,-44.8 -6.4,-44.8L-3.8,-44.8L0.5,-35L4.8,-44.8L7.4,-44.8C9.6,-44.8 11.6,-43.6 11.4,-41L11.8,-22.4';
    vest += z ? zz([11.8, -22.4], [-11, -22.4], 4, -1.8) : 'L-11,-22.4';
    vest += 'Z';
    s += d.clip(td, cel(d, vest, HIVIS, { hi: 0.8 }));
    const sil = (y: number) => P(`M-14,${f(y)}H14V${f(y + 2.4)}H-14Z`, '#E6EEF2', 0.8) + S(`M-14,${f(y + 1.2)}H14`, 0.4, '#AEB8C0');
    s += d.clip(vest, sil(-31) + sil(-26.4) + P('M-8.4,-46V-31H-6.4V-46Z', '#E6EEF2', 0.8) + P('M7.4,-46V-31H9.4V-46Z', '#E6EEF2', 0.8));
    s += S('M0.5,-35V-22.4', 1) + S(vest, OW * 0.9);
    // radio
    s += cel(d, rrect(4, -40, 3, 4.6, 0.6), ['#2B2B33', '#16161C'], { sw: 0.9, hi: 0 }) + S('M6.2,-40V-42.6', 0.8);
    if (z) s += rip(d, -5.6, -27.6, 0.8) + rip(d, 7, -36, 0.7) + stain(4.6, -24.6, 0.7, STAIN_G, 0.8);
    return s;
  },
  torsoBack: (d, z) => {
    const td = torsoD(z);
    let s = cel(d, td, NAVY);
    s += d.clip(td, P('M-20,-20.2H20V-10H-20Z', NAVY_P[0]) + S('M-20,-20.2H20', 1));
    let vest = 'M-10.4,-41C-10.6,-43.6 -8.6,-44.8 -6.4,-44.8L7.4,-44.8C9.6,-44.8 11.6,-43.6 11.4,-41L11.8,-22.4';
    vest += z ? zz([11.8, -22.4], [-11, -22.4], 4, -1.8) : 'L-11,-22.4';
    vest += 'Z';
    s += d.clip(td, cel(d, vest, HIVIS, { hi: 0.8 }));
    s += P('M-4.4,-45.4Q0.5,-46.8 5.4,-45.4L5,-43.4Q0.5,-44.6 -4,-43.4Z', '#3D5FA8', 1);
    s += d.clip(vest, P('M-14,-25.6H14V-23.4H-14Z', '#E6EEF2', 0.8) + P('M-8.4,-46L4.2,-25.6H6.6L-6,-46Z', '#E6EEF2', 0.8) + P('M9.4,-46L-3.2,-25.6H-5.6L7,-46Z', '#E6EEF2', 0.8));
    s += P(rrect(-6.6, -36.2, 14.2, 4.6, 0.8), '#1C2A4D', 0.8) + txt(0.5, -32.6, 3.2, 'TRAFFIC', '#D7F23A');
    s += S(vest, OW * 0.9);
    if (z) s += rip(d, 5, -27, 0.8) + rip(d, -6, -39, 0.6);
    return s;
  },
  back: (d) => bunBack(d, ['#2B2124', '#16101A'], -13.6, -61.4, 5.2),
  hairFront: (d, z) =>
    cel(d, 'M-16.6,-55C-17.4,-61 -15.4,-64.6 -12.4,-66L-9,-65.4C-11.6,-62.6 -12.6,-59 -12.8,-55.4Z', ['#2B2124', '#16101A'], { sw: 1.4, off: [-0.5, -0.5], hi: 0 }) +
    S('M-6,-64.8Q-2,-66 2,-64.4', 1.1, '#2B2124') + tcCapFront(d, z),
  hairBack: (d, z) => {
    let s = cel(d, backHairD(-5, -70), ['#2B2124', '#16101A'], { off: [-1, -1], hi: 0.8 });
    s += bunBack(d, ['#2B2124', '#16101A'], 0.4, -58, 4.8) + S('M-2.4,-58.6q2.6,-1.6 5.6,0', 0.8, '#5A4A54');
    const crown = 'M-16.4,-64.4L-18.2,-74.6Q1,-82.6 20,-74L17.6,-64Z';
    let cap = cel(d, crown, NAVY, { off: [-1.2, -1] }) + cel(d, 'M-18.2,-74.6Q1,-82.6 20,-74L18.8,-69.4Q1,-75.4 -17,-70Z', ['#FFFFFF', '#D5DAE0'], { off: [-0.8, -0.8], hi: 0 });
    cap += P('M-16.6,-64.6Q1,-67.4 18,-64.6L17.4,-62.4Q1,-65 -16,-62.4Z', '#1C2A4D', 1) + P('M19,-62.6L24.6,-61.4L23.2,-59.4L18.4,-60.6Z', '#1C1919', 1);
    s += z ? rot(cap, -9, [1, -66]) : cap;
    return s;
  },
  face: 'whistle',
  zface: 'droopy',
  lips: '#B04A5A',
  faceOver: (_d, z, e) => whistle(z, e),
};

// ======================================================= benchwarmer
const BW_SKIN: Tone = ['#F5C9A6', '#DBA27A'];
const JERSEY: Tone = ['#7B3FB0', '#5A2A88'];
function bwCap(d: Doc, z: boolean, back: boolean): string {
  const col: Tone = ['#FFC83D', '#D9971A'];
  const crown = back
    ? 'M-16.4,-62C-17.4,-74 -9,-80 1,-80C11,-80 19,-74 18.2,-62Q1,-66.6 -16.4,-62Z'
    : 'M-15.8,-62C-17,-74 -8,-80 2,-80C12,-80 19.6,-74 18.8,-62Q2,-66 -15.8,-62Z';
  let s = '';
  if (!back) s += cel(d, 'M-15,-64C-20,-65 -26.6,-64 -28.4,-61C-25.4,-59.4 -19.6,-59.6 -14.4,-60.6Z', ['#7B3FB0', '#5A2A88'], { sw: OW, off: [-0.6, -0.6], hi: 0.5 });
  s += cel(d, crown, col, { off: [-1.2, -1] });
  s += S(back ? 'M1,-80Q0,-72 1,-63.6M-8,-78Q-11,-72 -11,-63' : 'M2,-80Q1,-72 2,-64M-7,-78Q-10,-72 -10,-63M11,-78Q14,-72 14,-63.6', 0.8, col[1]);
  s += P(ell(back ? 1 : 2, -80, 1.6, 0.8), '#7B3FB0', 0.9);
  if (!back) {
    // the strap opening at the front, with a tuft of hair poking through
    s += P('M3.4,-62.6Q7.6,-68.4 11.8,-62.8Z', '#C9692E', 1) + S('M5,-64.4l1,-1.6M7.6,-65.4l0.4,-1.8M10,-64.4l-0.6,-1.6', 0.7, '#9A4A1C');
    s += S('M3,-62.6H12.2', 1.2, '#5A2A88');
    s += txt(-6, -68.6, 4.2, 'Z', '#7B3FB0');
  } else {
    // seen from behind the bill points at us
    s += cel(d, 'M-15.6,-64.4C-20,-62 -22,-57 -19.4,-55.4C-15,-57.6 -10,-60 -7,-61.6Z', ['#7B3FB0', '#5A2A88'], { off: [-0.6, -0.6], hi: 0.5 });
    s += txt(4, -68.6, 4.6, 'Z', '#7B3FB0');
  }
  if (z) s += rip(d, back ? -6 : 8, -74, 0.7);
  return s;
}
LOOKS.benchwarmer = {
  skin: BW_SKIN,
  hair: ['#C9692E', '#9A4A1C'],
  height: 80,
  rig: { shX: 11.8 },
  pants: ['#9AA0A8', '#767C86'],
  shoe: ['#FFFFFF', '#C9CED6'],
  shoeTrim: '#7B3FB0',
  sleeve: 'short',
  sleeveCol: JERSEY,
  cuff: '#FFC83D',
  itemL: foamFinger,
  boxL: [-22, -48, -4, -6],
  torso: (d, z) => {
    const td = 'M-12,-41C-12,-43.6 -9.6,-44.8 -6.6,-44.8L7.6,-44.8C10.6,-44.8 13,-43.6 13,-41C14.6,-35 15,-27 13.4,-20C12.8,-17.2 11,-16 8,-16L-7,-16C-10,-16 -11.8,-17.2 -12.4,-20C-14,-27 -13.6,-35 -12,-41Z';
    const sk = z ? ZSK : BW_SKIN;
    let s = cel(d, td, sk, { hi: 0.6 });
    s += P(ell(1.4, -21.6, 0.8, 1), darker(sk[1]), 0.6);
    s += d.clip(td, P('M-20,-19.6H20V-10H-20Z', '#9AA0A8') + P('M3,-19.6H20V-10H3Z', '#767C86') + S('M-20,-19.6H20', 1.1) + S('M-0.4,-19.4l-1,3.2M2.4,-19.4l1,3', 0.7, '#FFFFFF'));
    let jer = 'M-12,-41C-12,-43.6 -9.6,-44.8 -6.6,-44.8L7.6,-44.8C10.6,-44.8 13,-43.6 13,-41C14.4,-35.6 14.8,-29 14.2,-23.6';
    jer += z ? zz([14.2, -23.6], [-13.2, -23.6], 5, -1.6) : 'Q0.5,-27.8 -13.2,-23.6';
    jer += 'C-13.8,-29 -13.6,-35.6 -12,-41Z';
    s += cel(d, jer, JERSEY);
    s += d.clip(jer, P('M-14,-46V-20H-11.4V-46Z', '#FFC83D') + P('M12.4,-46V-20H15V-46Z', '#FFC83D'));
    s += S(jer, OW);
    s += P('M-4.4,-44.8L0.5,-37.8L5.4,-44.8', 'none', 2.6) + P('M-4.4,-44.8L0.5,-37.8L5.4,-44.8', 'none', 1.4, '#FFC83D');
    s += txt(1, -26.4, 9.4, z ? '0' : '00', '#FFC83D', 'middle', `stroke="${OUT}" stroke-width="0.9" paint-order="stroke"`);
    if (z) s += txt(6.2, -27.6, 6, '0', '#FFC83D', 'middle', `stroke="${OUT}" stroke-width="0.8" paint-order="stroke" transform="rotate(30 6.2 -30)"`);
    s += fold('M-10,-34q2.4,1.4 4.4,0.4M11,-33q-2.6,1.6 -4.6,0.6', '#5A2A88', 0.9);
    if (z) s += rip(d, -6.4, -36, 0.8) + stain(5.6, -36, 0.8, '#D94A2A', 0.8) + stain(-2, -31, 0.5, STAIN_G, 0.8);
    else s += stain(7, -37.6, 0.5, '#E8B020', 0.9);
    return s;
  },
  torsoBack: (d, z) => {
    const td = 'M-12,-41C-12,-43.6 -9.6,-44.8 -6.6,-44.8L7.6,-44.8C10.6,-44.8 13,-43.6 13,-41C14.6,-35 15,-27 13.4,-20C12.8,-17.2 11,-16 8,-16L-7,-16C-10,-16 -11.8,-17.2 -12.4,-20C-14,-27 -13.6,-35 -12,-41Z';
    const sk = z ? ZSK : BW_SKIN;
    let s = cel(d, td, sk, { hi: 0.6 });
    s += d.clip(td, P('M-20,-19.6H20V-10H-20Z', '#9AA0A8') + P('M3,-19.6H20V-10H3Z', '#767C86') + S('M-20,-19.6H20', 1.1));
    s += S('M0.5,-19.4V-16.6', 0.9);
    let jer = 'M-12,-41C-12,-43.6 -9.6,-44.8 -6.6,-44.8L7.6,-44.8C10.6,-44.8 13,-43.6 13,-41C14.4,-35.6 14.8,-29 14.2,-22.6';
    jer += z ? zz([14.2, -22.6], [-13.2, -22.6], 5, -1.6) : 'Q0.5,-20.8 -13.2,-22.6';
    jer += 'C-13.8,-29 -13.6,-35.6 -12,-41Z';
    s += cel(d, jer, JERSEY);
    s += P('M-4.4,-45.4Q0.5,-46.8 5.4,-45.4', 'none', 2.6) + P('M-4.4,-45.4Q0.5,-46.8 5.4,-45.4', 'none', 1.3, '#FFC83D');
    s += txt(0.5, -38.2, 3.6, 'BENCH', '#FFFFFF', 'middle', `stroke="${OUT}" stroke-width="0.6" paint-order="stroke"`);
    s += txt(0.5, -24.2, 11, '00', '#FFC83D', 'middle', `stroke="${OUT}" stroke-width="0.9" paint-order="stroke"`);
    if (z) s += rip(d, -6, -30, 0.8) + rip(d, 7, -26, 0.7);
    return s;
  },
  faceUnder: (_d, _z, _e) =>
    P('M-12.6,-53.6L-6.4,-55.4L-6,-53.8L-12.2,-52Z', '#7B3FB0', 0.6, OUT, 'opacity="0.95"') + P('M-12.2,-51.6L-6,-53.4L-5.6,-51.8L-11.8,-50Z', '#FFC83D', 0.6) +
    P('M11.2,-54.8L15.8,-55.4L15.8,-53.8L11.4,-53.2Z', '#7B3FB0', 0.6) + P('M11.4,-52.8L15.8,-53.4L15.6,-51.8L11.6,-51.2Z', '#FFC83D', 0.6),
  hairFront: (d, z) =>
    cel(d, 'M-16.6,-55C-17.4,-60.4 -16,-63.4 -13.6,-64.6L-11.2,-63.2L-10.8,-60.2L-12.6,-58.6L-12.8,-55.4Z', ['#C9692E', '#9A4A1C'], { sw: 1.4, off: [-0.5, -0.5], hi: 0 }) + bwCap(d, z, false),
  hairBack: (d, z) => cel(d, backHairD(-3.4, -68), ['#C9692E', '#9A4A1C'], { off: [-1, -1], hi: 0.8 }) + bwCap(d, z, true),
  face: 'excited',
  zface: 'derp',
};

// ======================================================= lumberjack
const LJ_SKIN: Tone = ['#E8B08A', '#C98A62'];
const FLANNEL: Tone = ['#D23A2E', '#A82620'];
const BEANIE: Tone = ['#2E7D4F', '#1F5C38'];
const BEARD: Tone = ['#7A4A2A', '#5A3218'];
function ljPlaid(d: Doc, clipD: string): string {
  return plaid(d, clipD, -16, -50, 18, -10, '#5E0E0A', '#F59A80', 4.6);
}
function bigBeard(d: Doc, z: boolean, e: Expr): string {
  const open = e === 'scream' || e === 'chomp';
  const bd = open
    ? 'M-14,-58C-15,-48 -10,-38.6 -2,-37C2,-35.4 8,-35.6 12,-38C17,-41 19,-49 18,-57.4C16,-53 14,-51.6 11,-52L10,-43C7,-41.4 0,-41.4 -2.6,-43L-3.4,-51C-7,-51.2 -11,-53 -14,-58Z'
    : 'M-14,-58C-15,-48 -10,-38.6 -2,-37C2,-35.4 8,-35.6 12,-38C17,-41 19,-49 18,-57.4C16,-53 14,-51.6 11,-52C8,-49.6 0,-49.4 -3.4,-51C-7,-51.2 -11,-53 -14,-58Z';
  let s = cel(d, bd, BEARD, { off: [-1, -1], hiCol: '#A0704A' });
  s += S('M-10,-46q1,3 3,4M-4,-41.6q1,1.6 2.6,2M6,-40q1.4,-0.4 2.6,-2M13,-44q1,-2 1.4,-4M-12,-52q0,2 1,3.6', 0.8, BEARD[1]);
  if (z) s += drool(4, -36.6, 4, 1.5) + P(ell(-6, -44, 1.6, 1), GOO, 0.6) + stain(10, -43, 0.5, '#7CC24A', 0.8);
  // mustache sits over the mouth
  const mo = e === 'scream' ? 'translate(0 -1.4)' : '';
  const mu = cel(d, 'M-3.6,-51.2C-2,-54.6 2.4,-54.4 3.8,-52.4C5.4,-54.4 10,-54.8 11.4,-51.4C9,-49.2 5.6,-49.6 3.8,-50.8C2,-49.4 -1.4,-49.2 -3.6,-51.2Z', BEARD, { sw: 1.1, off: [-0.4, -0.4], hi: 0.4, hiCol: '#A0704A' });
  s += mo ? G(mu, mo) : mu;
  return s;
}
function beanie(d: Doc, z: boolean, back: boolean): string {
  const dx = back ? -1 : 0;
  let s = cel(d, `M${f(-16 + dx)},-60C${f(-17 + dx)},-74 ${f(-8 + dx)},-82 ${f(2 + dx)},-82C${f(12 + dx)},-82 ${f(20 + dx)},-74 ${f(19 + dx)},-60Z`, BEANIE, { off: [-1.2, -1] });
  s += S(`M${f(2 + dx)},-82V-66M${f(-6 + dx)},-80Q${f(-10 + dx)},-74 ${f(-10 + dx)},-66M${f(10 + dx)},-80Q${f(14 + dx)},-74 ${f(14 + dx)},-66`, 0.7, BEANIE[1]);
  const band = `M${f(-17.6 + dx)},-66.4Q${f(2 + dx)},-71 ${f(20.4 + dx)},-66L${f(20 + dx)},-59.2Q${f(2 + dx)},-63.6 ${f(-17.2 + dx)},-59.8Z`;
  s += cel(d, band, ['#368F5C', '#1F5C38'], { sw: OW, hi: 0.5 });
  let ribs = '';
  for (let x = -15; x <= 18; x += 2.2) ribs += `M${f(x + dx)},-68L${f(x + dx)},-59`;
  s += d.clip(band, S(ribs, 0.6, '#1F5C38'));
  if (!back) s += P(rrect(10, -66.4, 5, 3.6, 0.6), '#C98B55', 0.8) + S('M11,-64.6h3', 0.5, '#7A4524');
  if (z) s += rip(d, back ? 8 : -8, -75, 0.6);
  return s;
}
function axeInHat(d: Doc): string {
  let s = cel(d, capsule([8, -79], [24.4, -96.4], 2.8, 2.4), ['#B57A44', '#8A5530'], { sw: 1.2, hi: 0.5 });
  s += S('M14,-86l1.6,-1.6M18,-90.6l1.4,-1.4', 0.6, '#7A4524');
  // the blade is buried in the beanie (and the skull below it)
  const blade = 'M2.6,-84.6L9.6,-79.6C10,-76 7.6,-72.6 4.6,-72.2L0.6,-76.4C-1.4,-78.6 0,-82.6 2.6,-84.6Z';
  s += cel(d, blade, ['#C9D2DC', '#8E99A6'], { hi: 0.7 });
  s += S('M1.4,-77.6C2.6,-76 3.6,-74.6 4.4,-73.6', 1.4, '#1F5C38');
  s += P(rrect(6.6, -83.2, 3.6, 4.6, 0.8), '#5A6470', 1, OUT, 'transform="rotate(38 8.4 -81)"');
  s += drool(5.2, -72, 3.4, 1.3) + P(ell(-1, -73.6, 1.2, 0.8), GOO, 0.6);
  s += S('M-2,-74.4l-1.6,-1M-1.2,-72.4l-2,0.2', 0.8);
  return s;
}
LOOKS.lumberjack = {
  skin: LJ_SKIN,
  hair: ['#7A4A2A', '#5A3218'],
  height: 82,
  rig: { shX: 11.6 },
  pants: ['#3D5F9E', '#2B4675'],
  shoe: ['#8A5530', '#6B3D20'],
  boots: true,
  sleeve: 'long',
  sleeveCol: FLANNEL,
  cuff: '#A82620',
  itemR: (d, z, b, h) => (z ? '' : axeHeld(d, z, b, h)),
  boxR: [1, -64, 31, -15],
  headBox: [-30, -102, 34, -29],
  torso: (d, z) => {
    const td = torsoD(z, 11.2, 12);
    let s = cel(d, td, FLANNEL) + ljPlaid(d, td);
    if (!z) s += waist(d, td, ['#3D5F9E', '#2B4675'], '#5A3A22', '#C9A040', 12);
    s += P('M-4.6,-44.8L0.4,-41L-1.2,-38.4L-6,-41.8Z', '#A82620', 1) + P('M5.6,-44.8L0.6,-41L2.2,-38.4L7,-41.8Z', '#A82620', 1);
    s += S('M0.5,-40V-21', 0.9) + [-36, -31, -26].map((y) => `<circle cx="1.6" cy="${y}" r="0.6" fill="#F4E6C8" stroke="${OUT}" stroke-width="0.4"/>`).join('');
    s += P('M-8.6,-37.8H-3.8V-35.2L-6.2,-34.4L-8.6,-35.2Z', '#A82620', 0.9);
    // suspenders
    const sus = (x1: number, x2: number) => cel(d, `M${f(x1 - 1.2)},-44.8L${f(x1 + 1.2)},-44.8L${f(x2 + 1.2)},-21L${f(x2 - 1.2)},-21Z`, ['#3A2A22', '#22180F'], { sw: 1, hi: 0 });
    s += d.clip(td, sus(-6.6, -5.6) + sus(7.6, 6.8));
    s += P(rrect(-7.2, -25, 2.6, 2.6, 0.4), '#C9A040', 0.7) + P(rrect(5.6, -25, 2.6, 2.6, 0.4), '#C9A040', 0.7);
    s += S(td, OW);
    if (z) s += rip(d, 5, -30, 1) + rip(d, -4.4, -24, 0.8) + stain(-2, -33, 0.7, STAIN_G, 0.7);
    return s;
  },
  torsoBack: (d, z) => {
    const td = torsoD(z, 11.2, 12);
    let s = cel(d, td, FLANNEL) + ljPlaid(d, td);
    s += d.clip(td, P('M-20,-20.2H20V-10H-20Z', '#3D5F9E') + P('M2,-20.2H20V-10H2Z', '#2B4675') + S('M-20,-20.2H20', 1.1) + P('M-20,-21.6H20V-18.8H-20Z', '#5A3A22') + S('M-20,-21.6H20M-20,-18.8H20', 0.9));
    s += P('M-4.6,-45.2Q0.5,-46.8 5.6,-45.2L5.2,-43Q0.5,-44.2 -4.2,-43Z', '#A82620', 1);
    const sus = 'M-7.8,-44.8L-5.4,-44.8L1.6,-32L8.6,-21.6L6.2,-21.6L0.4,-30.6L-5.2,-21.6L-7.6,-21.6L-0.8,-32Z';
    const sus2 = 'M6.6,-44.8L9,-44.8L1.6,-32L-0.8,-32Z';
    s += d.clip(td, cel(d, sus, ['#3A2A22', '#22180F'], { sw: 1, hi: 0 }) + cel(d, sus2, ['#3A2A22', '#22180F'], { sw: 1, hi: 0 }));
    s += cel(d, 'M-1.6,-34.6L2.8,-34.6L3.6,-30.4L0.5,-29L-2.6,-30.4Z', ['#8A5530', '#6B3D20'], { sw: 1, hi: 0 });
    s += S(td, OW);
    if (z) s += rip(d, -6, -26, 0.9) + rip(d, 6, -38, 0.7);
    return s;
  },
  hairFront: (d, z) => {
    let s = cel(d, 'M-16.6,-55C-17.4,-60.4 -16,-63.4 -13.6,-64.6L-11.2,-63.2L-10.8,-60.2L-12.6,-58.6L-12.8,-55.4Z', BEARD, { sw: 1.4, off: [-0.5, -0.5], hi: 0 });
    s += beanie(d, z, false);
    if (z) s += axeInHat(d);
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(-1, -68), BEARD, { off: [-1, -1], hi: 0.8 });
    // beard sticks out on the side
    s += cel(d, 'M12,-50C14,-46 16,-44 19,-45C20,-48 19.6,-52 18.4,-55C16.6,-52 14.4,-50.6 12,-50Z', BEARD, { off: [-0.6, -0.6], hi: 0 });
    s += beanie(d, z, true);
    if (z) s += G(axeInHat(d), 'translate(-2 0)');
    return s;
  },
  faceUnder: (d, z, e) => bigBeard(d, z, e),
  face: 'smile',
  zface: 'bigeye',
  noBlush: false,
};

// ======================================================= cheerleader
const CH_SKIN: Tone = ['#F5D0B5', '#DDA88A'];
const CH_BLUE: Tone = ['#2F6FD6', '#2257B0'];
function chSkirt(d: Doc, z: boolean, back: boolean): string {
  let sk = 'M-11.2,-25.6L12,-25.6L14.8,-13.4';
  sk += z ? zz([14.8, -12.4], [-14, -12.4], 6, -1.8) : 'C14.8,-12.2 14,-12 13,-12L-12.2,-12C-13.2,-12 -14,-12.2 -14,-13.4';
  sk += 'Z';
  let s = cel(d, sk, CH_BLUE, { hi: 0.6 });
  s += d.clip(sk, P('M-20,-16.4H20V-14.6H-20Z', '#FFFFFF'));
  let pl = '';
  for (const x of back ? [-8, -3.6, 0.6, 4.8, 9] : [-7.6, -3.2, 1, 5.2, 9.4]) pl += `M${f(x)},-25L${f(x * 1.18)},-12.4`;
  s += d.clip(sk, S(pl, 0.8, '#1A4590'));
  s += S(sk, OW) + S('M-11.2,-25.4H12', 1.6, '#FFFFFF') + S('M-11.2,-25.4H12', 0.5, '#C9CED6');
  return s;
}
LOOKS.cheerleader = {
  skin: CH_SKIN,
  hair: ['#2E2420', '#1A1412'],
  height: 80,
  pants: CH_SKIN,
  leg: 'bare',
  sock: ['#FFFFFF', '#C9CED6'],
  shoe: ['#FFFFFF', '#C9CED6'],
  shoeTrim: '#2F6FD6',
  sleeve: 'none',
  sleeveCol: CH_SKIN,
  lashes: true,
  lips: '#E8607E',
  itemL: pomL,
  itemR: pomR,
  boxL: [-22.5, -48, -1, -15],
  boxR: [1, -48, 22.5, -15],
  torso: (d, z) => {
    const sk = z ? ZSK : CH_SKIN;
    let s = cel(d, torsoD(false, 10.4, 10.8, -44, -22), sk, { hi: 0.6 });
    let top = 'M-10.2,-41.4C-10.4,-43.6 -8.6,-44.6 -5.8,-44.6C-3,-42.6 4,-42.6 6.8,-44.6C9.6,-44.6 11.4,-43.6 11.2,-41.4L11.6,-25';
    top += z ? zz([11.6, -25], [-10.8, -25], 4, -1.6) : 'L-10.8,-25';
    top += 'Z';
    s += cel(d, top, CH_BLUE);
    s += d.clip(top, P('M-10,-44.6L0.5,-36L11,-44.6L11,-41.4L0.5,-32.6L-10,-41.4Z', '#FFFFFF', 0.8) + S('M-10,-42.8L0.5,-34.2L11,-42.8', 0.6, '#2F6FD6'));
    s += txt(0.8, -26.6, 7.4, 'B', '#FFFFFF', 'middle', `stroke="${OUT}" stroke-width="0.8" paint-order="stroke"`);
    s += fold('M-9.6,-33q2,1 3.4,0.2M10.6,-32q-2,1 -3.4,0.2', '#2257B0', 0.8);
    s += chSkirt(d, z, false);
    if (z) s += rip(d, 6.4, -38.4, 0.7) + stain(-6, -30, 0.6, STAIN_G, 0.8) + rip(d, -7, -16, 0.7);
    return s;
  },
  torsoBack: (d, z) => {
    const sk = z ? ZSK : CH_SKIN;
    let s = cel(d, torsoD(false, 10.4, 10.8, -44, -22), sk, { hi: 0.6 });
    let top = 'M-10.2,-41.4C-10.4,-43.6 -8.6,-44.8 -5.8,-44.8L6.8,-44.8C9.6,-44.8 11.4,-43.6 11.2,-41.4L11.6,-25';
    top += z ? zz([11.6, -25], [-10.8, -25], 4, -1.6) : 'L-10.8,-25';
    top += 'Z';
    s += cel(d, top, CH_BLUE);
    s += d.clip(top, P('M-14,-32.6H14V-30.4H-14Z', '#FFFFFF', 0.8) + P('M-14,-29.4H14V-28.6H-14Z', '#FFFFFF', 0));
    s += txt(0.5, -35.4, 5.6, '1', '#FFFFFF', 'middle', `stroke="${OUT}" stroke-width="0.7" paint-order="stroke"`);
    s += chSkirt(d, z, true);
    if (z) s += rip(d, -5, -38, 0.7) + rip(d, 7, -18, 0.7);
    return s;
  },
  back: (d, z) => {
    const pony = z
      ? 'M-4,-76C-12,-86 -26,-84 -27,-72C-28,-64 -26,-58 -22,-52L-24.6,-54.4L-23.6,-50L-20.6,-52.6L-18.6,-48.6C-21,-56 -21,-66 -14,-72Z'
      : 'M-4,-76C-12,-86 -26,-84 -27,-72C-28,-64 -25,-56 -19,-50C-22,-58 -21,-66 -14,-72Z';
    return cel(d, pony, ['#2E2420', '#1A1412'], { off: [-1, -1], hiCol: '#5A4A44' }) + S('M-22,-74Q-25,-66 -22,-58M-14,-80Q-20,-80 -23,-74', 0.8, '#5A4A44');
  },
  hairFront: (d, z) => {
    const cap = 'M-16.6,-55C-17.8,-71 -7,-77.4 2,-77C12,-76.8 19,-70.4 18.4,-59.4C16.6,-63 13,-66.6 8,-67C2.6,-67.4 -3,-64.6 -6.6,-62.2C-10,-60 -12.6,-57.8 -13.4,-55.2Z';
    let s = cel(d, cap, ['#2E2420', '#1A1412'], { off: [-1, -1], hiCol: '#5A4A44' });
    s += S('M-6,-62.6Q2,-70 12,-70M0,-74Q8,-74 14,-68', 0.9, '#5A4A44') + hl(6, -73, 3.6, 1, -10, 0.3);
    // big red bow at the ponytail
    const bow = cel(d, 'M-6,-76.6C-10,-82 -15,-80 -13.6,-76C-12.6,-73 -9,-74 -6,-76.6Z', ['#E2343B', '#B32028'], { sw: 1.2, hi: 0.5 }) + cel(d, 'M-6,-76.6C-1,-81 3,-78 1.4,-74.6C0,-72 -3.6,-74 -6,-76.6Z', ['#E2343B', '#B32028'], { sw: 1.2, hi: 0.5 }) + P(ell(-6, -76.4, 1.6), '#E2343B', 1.1);
    s += z ? rot(bow, -24, [-6, -76]) : bow;
    if (z) s += strays('#1A1412');
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(-1, -77), ['#2E2420', '#1A1412'], { off: [-1, -1], hiCol: '#5A4A44' });
    s += S('M-10,-58Q-6,-70 0,-74M8,-56Q10,-66 4,-74', 0.8, '#5A4A44');
    // high ponytail falls down behind the head
    const pony = z
      ? 'M-2,-78C4,-82 12,-78 10,-70C9,-64 8,-58 9,-50L6.6,-52.4L5.6,-48.4L3.6,-52L1.6,-49.6C3,-56 3,-64 0,-70Z'
      : 'M-2,-78C4,-82 12,-78 10,-70C9,-64 8,-58 9,-50C6,-50 3,-52 2,-56C2,-62 2,-66 0,-70Z';
    s += cel(d, pony, ['#2E2420', '#1A1412'], { off: [-0.8, -0.8], hiCol: '#5A4A44' }) + S('M6,-72Q5,-62 6,-54', 0.8, '#5A4A44');
    const bow = cel(d, 'M0,-78C-4,-84 -9,-82 -7.6,-78C-6.6,-75 -3,-76 0,-78Z', ['#E2343B', '#B32028'], { sw: 1.2, hi: 0.5 }) + cel(d, 'M0,-78C5,-83 9,-80 7.4,-76.4C6,-74 2.4,-76 0,-78Z', ['#E2343B', '#B32028'], { sw: 1.2, hi: 0.5 }) + P(ell(0, -78, 1.6), '#E2343B', 1.1);
    s += z ? rot(bow, -24, [0, -78]) : bow;
    if (z) s += strays('#1A1412');
    return s;
  },
  faceUnder: (_d, _z, e) => (e ? '' : P(star(13.2, -53.8, 1.6), '#2F6FD6', 0.6)),
  face: 'excited',
  zface: 'wink',
};

// ======================================================= food critic
const CR_SKIN: Tone = ['#7A4A2E', '#5A3420'];
const TRENCH: Tone = ['#C8A06A', '#A07A48'];
const BERET: Tone = ['#8E1B2E', '#6B1222'];
function beret(d: Doc, back: boolean, z: boolean): string {
  const dx = back ? -1.6 : 0;
  const b = `M${f(-16 + dx)},-66C${f(-20 + dx)},-72 ${f(-12 + dx)},-80 ${f(2 + dx)},-80.4C${f(14 + dx)},-80.6 ${f(23 + dx)},-76 ${f(22 + dx)},-70C${f(21 + dx)},-66 ${f(14 + dx)},-65.4 ${f(2 + dx)},-65.6C${f(-6 + dx)},-65.6 ${f(-12 + dx)},-64 ${f(-16 + dx)},-66Z`;
  let s = cel(d, b, BERET, { off: [-1.2, -1.2] });
  s += S(`M${f(-14 + dx)},-67.6Q${f(2 + dx)},-66 ${f(20 + dx)},-68.6`, 0.8, BERET[1]) + hl(4 + dx, -76.6, 6, 1.4, -6, 0.35);
  s += P(`M${f(1 + dx)},-80.2L${f(1.6 + dx)},-83.4L${f(3.2 + dx)},-83L${f(3.2 + dx)},-80.2Z`, BERET[1], 1);
  if (z) s += rip(d, 12 + dx, -72, 0.6);
  return s;
}
LOOKS.critic = {
  skin: CR_SKIN,
  hair: ['#1E1816', '#0E0A0A'],
  height: 82,
  pants: ['#3A3A44', '#26262E'],
  shoe: ['#1E1E24', '#0C0C10'],
  sleeve: 'long',
  sleeveCol: TRENCH,
  cuff: '#A07A48',
  bentL: true,
  underL: critPadUnder,
  itemR: pen,
  boxL: [-29, -48, 9, -12],
  torso: (d, z) => {
    const td = torsoD(z, 11, 12.6, -44, -12);
    let s = P('M-4.4,-46.6Q0.5,-48.6 5.4,-46.6L5.4,-43L-4.4,-43Z', '#2B2B33', 1);
    s += cel(d, td, TRENCH);
    s += P('M-4.6,-44.8L0.5,-32L5.6,-44.8Z', '#2B2B33', 1.1) + S('M-2.6,-42.6Q0.5,-41 3.6,-42.6', 0.6, '#4A4A56');
    s += d.clip(td, cel(d, 'M-5,-45L0.5,-32L-1.6,-31.4L-8.8,-38L-5.6,-40.2L-9.2,-43Z', ['#B88E58', '#94703E'], { sw: 1.1, hi: 0.5 }) + cel(d, 'M6,-45L0.5,-32L2.6,-31.4L9.8,-38L6.6,-40.2L10.2,-43Z', ['#B88E58', '#94703E'], { sw: 1.1, hi: 0.5 }));
    for (const [x, y] of [[-3.6, -29], [4.6, -29], [-3.6, -25.4], [4.6, -25.4]] as Pt[]) s += `<circle cx="${x}" cy="${y}" r="0.8" fill="#5A3A22" stroke="${OUT}" stroke-width="0.5"/>`;
    s += d.clip(td, cel(d, 'M-16,-22.6H18V-19.4H-16Z', ['#B08550', '#8A6234'], { sw: 1, hi: 0 }));
    s += P(rrect(-1.4, -23.2, 3.8, 4.4, 0.6), 'none', 1, '#5A3A22') + S('M2.4,-20.6L4.6,-14.6M3.4,-20.6L6,-15.4', 1.6, '#8A6234') + S('M2.4,-20.6L4.6,-14.6', 0.5);
    s += S('M0.5,-19.4V-12', 1) + P('M-9.6,-17.6L-5,-17.6L-5.4,-15.8L-9.4,-15.8Z', '#A07A48', 0.8) + P('M6,-17.6L10.6,-17.6L10.8,-15.8L6.4,-15.8Z', '#A07A48', 0.8);
    s += fold('M-9,-35q2,1 3.4,0M10,-34q-2,1 -3.4,0M-6,-15q1,1.6 0.4,3M7,-15q-1,1.6 -0.4,3', '#94703E', 0.8);
    if (z) s += rip(d, 6, -28, 0.9) + rip(d, -7, -14, 0.8) + stain(-6, -27, 0.7, STAIN_G, 0.7) + stain(8, -16, 0.5, '#A8432A', 0.7);
    return s;
  },
  torsoBack: (d, z) => {
    const td = torsoD(z, 11, 12.6, -44, -12);
    let s = cel(d, td, TRENCH);
    s += P('M-4.4,-46.4Q0.5,-48 5.4,-46.4L5.2,-44.6Q0.5,-45.8 -4.2,-44.6Z', '#2B2B33', 1);
    s += P('M-5,-45.2Q0.5,-46.4 6,-45.2L5.6,-42.8Q0.5,-43.8 -4.6,-42.8Z', '#B88E58', 1);
    s += d.clip(td, cel(d, 'M-14,-43H15V-36C10,-34 -9,-34 -14,-36Z', ['#B88E58', '#94703E'], { sw: 1, hi: 0.4 }));
    s += d.clip(td, cel(d, 'M-16,-24.6H18V-21.4H-16Z', ['#B08550', '#8A6234'], { sw: 1, hi: 0 }));
    s += P(rrect(-8.6, -25.4, 2.2, 4.8, 0.5), 'none', 0.8, '#8A6234') + P(rrect(7.4, -25.4, 2.2, 4.8, 0.5), 'none', 0.8, '#8A6234');
    s += S('M0.5,-34V-18', 0.8, '#94703E') + S('M0.5,-18V-12', 1.1) + S('M0.5,-18L3,-12', 0.8, '#94703E');
    if (z) s += rip(d, -6, -28, 0.9) + rip(d, 7, -16, 0.7);
    return s;
  },
  hairFront: (d, z) => {
    let s = cel(d, 'M-16.6,-55C-17.4,-61 -16,-64.4 -13,-66L-9.6,-65.4C-11.8,-62.6 -12.6,-59 -12.8,-55.4Z', ['#1E1816', '#0E0A0A'], { sw: 1.4, off: [-0.5, -0.5], hi: 0 });
    const b = beret(d, false, z);
    s += z ? rot(b, 10, [2, -70]) : rot(b, -4, [2, -70]);
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(-6, -68), ['#1E1816', '#0E0A0A'], { off: [-1, -1], hi: 0.8 });
    const b = beret(d, true, z);
    s += z ? rot(b, 10, [1, -70]) : rot(b, -4, [1, -70]);
    return s;
  },
  faceOver: (_d, z, e) => {
    if (e === 'scream' || e === 'chomp') return '';
    const mu = z ? 'M-1,-51.6Q2,-53.4 4,-51.8Q6,-53.6 9,-52.2L9,-51.4Q6,-52.4 4,-51.2Q2,-52.6 -1,-50.8Z' : 'M-0.6,-51.2Q2,-52.8 4,-51.4Q6,-53 8.8,-51.8L8.8,-51Q6,-52 4,-50.8Q2,-52.2 -0.6,-50.4Z';
    return P(mu, '#1E1816', 0.6) + P('M2.6,-44.6Q4.2,-42.6 5.6,-44.6Z', '#1E1816', 0.7);
  },
  face: 'snooty',
  zface: 'oneye',
  noBlush: true,
};

// ======================================================= boxer
const BX_SKIN: Tone = ['#C98B5E', '#A86C42'];
const SATIN: Tone = ['#D7263E', '#A81A2E'];
function towel(d: Doc, z: boolean, back: boolean): string {
  const T: Tone = ['#FFFFFF', '#D5D8DC'];
  let s = '';
  if (!back) {
    s += cel(d, 'M-7.6,-46.2Q0.5,-49.4 8.6,-46.2L8.6,-43.4Q0.5,-46.2 -7.6,-43.4Z', T, { sw: 1.2, hi: 0 });
    const l = z ? 'M-8.2,-45L-3.2,-45C-3,-40 -3.8,-35 -4.2,-31L-5.6,-32.6L-6.6,-30.8L-7.8,-32.4L-9.4,-31C-9,-36 -8.6,-40 -8.2,-45Z' : 'M-8.2,-45L-3.2,-45C-3,-40 -3.8,-35 -4.2,-31C-6,-30.2 -7.8,-30.4 -9.4,-31.4C-9,-36 -8.6,-40 -8.2,-45Z';
    s += cel(d, l, T, { sw: 1.2, hi: 0.4 }) + d.clip(l, P('M-12,-35.4H0V-34H-12Z', '#D7263E') + P('M-12,-33.4H0V-32.8H-12Z', '#D7263E') + S('M-6,-44q-1,5 0.4,9', 0.7, '#C9CED6'));
    s += cel(d, 'M5.4,-45L9.4,-45L10.6,-34.6L6.6,-34.6Z', T, { sw: 1.2, hi: 0.4 }) + d.clip('M5.4,-45L9.4,-45L10.6,-34.6L6.6,-34.6Z', P('M0,-37.8H14V-36.6H0Z', '#D7263E'));
    if (z) s += P(ell(-6, -40, 1.2, 0.8), GOO, 0.6);
  } else {
    const t = 'M-9.6,-45.6Q0.5,-48.6 10.6,-45.6L11.6,-36.4Q0.5,-39.4 -10.6,-36.4Z';
    s += cel(d, t, T, { sw: 1.2, hi: 0.4 }) + d.clip(t, P('M-14,-39.6H16V-38.4H-14Z', '#D7263E'));
    s += txt(0.5, -41.2, 3, 'KID KO', '#D7263E');
  }
  return s;
}
LOOKS.boxer = {
  skin: BX_SKIN,
  hair: ['#1E1816', '#0E0A0A'],
  height: 78,
  rig: { shX: 11.6 },
  pants: SATIN,
  leg: 'shorts',
  legStripe: '#FFFFFF',
  shoe: ['#F4F4F4', '#C9CED6'],
  shoeTrim: '#D7263E',
  boots: true,
  sleeve: 'none',
  sleeveCol: BX_SKIN,
  muscles: true,
  boxing: ['#E2343B', '#B32028'],
  torso: (d, z) => {
    const sk = z ? ZSK : BX_SKIN;
    const td = torsoD(false, 11.2, 10.6);
    let s = cel(d, td, sk, { hi: 0.8 });
    const dk = darker(sk[1]);
    s += S('M-8.8,-35.4Q-4.4,-32.6 -0.2,-35.4M1.2,-35.4Q5.6,-32.6 10,-35.6', 1, dk);
    s += S('M0.5,-32.4V-22.6M-3.2,-30.2h2.6M1.6,-30.2h2.6M-3,-26.8h2.6M1.8,-26.8h2.6', 0.8, dk) + P(ell(0.6, -23.8, 0.6, 0.8), dk);
    s += hl(-5.4, -38, 2.4, 1, -10, 0.35) + hl(4.4, -38, 2, 0.8, -10, 0.3);
    const sh = 'M-12,-21.8H13V-16H-12Z';
    s += d.clip(td, cel(d, sh, SATIN, { sw: 1, hi: 0.8 }) + P('M-14,-22H14V-19.8H-14Z', '#FFFFFF') + S('M-14,-19.8H14M-14,-22H14', 0.8) + P('M-14,-19.8H14V-19H-14Z', '#FFC83D'));
    s += S(td, OW);
    if (z) s += stitches(-7, -30, -2, -26, 3) + rip(d, 6, -18.6, 0.7) + stain(5, -28, 0.6, STAIN_G, 0.7);
    s += towel(d, z, false);
    return s;
  },
  torsoBack: (d, z) => {
    const sk = z ? ZSK : BX_SKIN;
    const td = torsoD(false, 11.2, 10.6);
    let s = cel(d, td, sk, { hi: 0.8 });
    const dk = darker(sk[1]);
    s += S('M-7,-34Q-4,-31 -1,-33.6M2,-33.6Q5,-31 8,-34M0.5,-35V-22', 0.9, dk);
    s += d.clip(td, cel(d, 'M-12,-21.8H13V-16H-12Z', SATIN, { sw: 1, hi: 0.8 }) + P('M-14,-22H14V-19.8H-14Z', '#FFFFFF') + S('M-14,-19.8H14M-14,-22H14', 0.8));
    s += S(td, OW);
    if (z) s += stitches(-6, -30, 0, -27, 3) + rip(d, -5, -18.6, 0.7);
    s += towel(d, z, true);
    return s;
  },
  faceUnder: (_d, _z, e) => P(ell(-3.6, -57.2, 3.8, 4), '#7A5ACF', 0, OUT, `opacity="${e === 'chomp' ? 0.3 : 0.45}"`),
  faceOver: (_d, _z, e) =>
    e === 'scream' || e === 'chomp'
      ? ''
      : G(P(rrect(-2.8, -1.1, 5.6, 2.2, 0.8), '#F2D2A0', 0.8) + S('M-0.6,-0.6v1.2M0.6,-0.6v1.2', 0.4, '#C9A070'), 'translate(4.4 -54.2) rotate(-28)'),
  hairFront: (d, z) => {
    const buzz = 'M-16.6,-56C-17.6,-70 -8,-75.6 2,-75.4C12,-75.4 18.6,-70 18.2,-60.6C16,-62.6 12,-64 6,-64.6C0,-65 -6,-64 -10,-62C-12.6,-60.4 -14,-58.6 -14.6,-56Z';
    let s = cel(d, buzz, ['#2B2522', '#16110F'], { off: [-0.8, -0.8], hiCol: '#4A403C' });
    let dots = '';
    for (const [x, y] of [[-8, -70], [-3, -72], [2, -73], [7, -72], [12, -69], [-11, -66], [-5, -68], [4, -69], [10, -66], [15, -64]] as Pt[]) dots += `<circle cx="${x}" cy="${y}" r="0.45" fill="#4A403C"/>`;
    s += d.clip(buzz, dots);
    if (z) s += stitches(4, -72, 10, -68, 2);
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(-3.4, -75.6), ['#2B2522', '#16110F'], { off: [-0.8, -0.8], hiCol: '#4A403C' });
    if (z) s += stitches(-4, -70, 4, -64, 3);
    return s;
  },
  face: 'tough',
  zface: 'gap',
  noBlush: true,
};

// ======================================================= grandma
const GM_SKIN: Tone = ['#F7D9C4', '#DDB49A'];
const SILVER: Tone = ['#DCDFE6', '#A9AEB8'];
const CARDI: Tone = ['#9B7FD0', '#7A5EB0'];
const DRESS: Tone = ['#F7B7C8', '#E08FA6'];
function needles(z: boolean): string {
  let s = S('M-6,-86L8,-74', 1.6) + S('M-6,-86L8,-74', 0.8, '#C9D2DC') + P(ell(-6.4, -86.4, 1.3), '#E2343B', 0.8);
  s += S('M10,-87L-3,-74', 1.6) + S('M10,-87L-3,-74', 0.8, '#C9D2DC') + P(ell(10.4, -87.4, 1.3), '#2F6FD6', 0.8);
  if (z) s += P(rrect(-12, -78, 5, 3, 1.4), '#FF8FB8', 0.9) + S('M-11,-77v1M-9.6,-77v1M-8.2,-77v1', 0.5, '#D9578A');
  return s;
}
function curls(d: Doc, back: boolean, z: boolean): string {
  const dx = back ? -1 : 0;
  const pts: [number, number, number][] = back
    ? [[-15, -56, 3.6], [-15.6, -62, 4], [-12, -68, 4.4], [-5, -72.6, 4.6], [3, -74, 4.6], [10, -72, 4.6], [15.6, -66, 4], [16.4, -60.4, 3.4], [-10, -54, 3.4], [-4, -52.2, 3.4], [2, -52, 3.4], [8, -54, 3.4], [-6, -62, 5], [4, -62, 5], [11, -58, 3.4]]
    : [[-15.4, -56, 3.4], [-16, -62, 3.8], [-12.6, -68, 4.4], [-6, -72.4, 4.6], [2, -74, 4.6], [9.6, -72.4, 4.6], [15.4, -67.4, 4], [17.2, -61.6, 3], [-7.4, -66, 3.4], [-1.4, -67.6, 3.2], [4.4, -67.6, 3.2], [10.4, -66.6, 3]];
  let s = fluff(d, pts.map(([x, y, r]) => [x + dx, y, r] as [number, number, number]), SILVER);
  s += cel(d, ell(2 + dx, -79.4, 6.4, 5.2), SILVER, { off: [-1, -1] }) + S(`M${f(-2 + dx)},-80q4,-3 8,0`, 0.8, SILVER[1]);
  if (z) s += S(`M${f(-8 + dx)},-77q-3,-3 -1,-6M${f(12 + dx)},-76q3,-2 2,-5`, 0.9, SILVER[1]);
  return s;
}
function gooScarf(d: Doc, back: boolean): string {
  const band = back ? 'M-7,-46.2Q0.5,-48.6 8,-46.2L8.4,-42.8Q0.5,-45 -7.4,-42.8Z' : 'M-6.6,-46.6Q0.5,-43 7.6,-46.6L7.8,-43.2Q0.5,-39.4 -6.8,-43.2Z';
  let s = cel(d, band, [GOO, GOO_D], { sw: 1.3, hi: 0.5 });
  const tail = back ? 'M-1.6,-45L3,-45L3.6,-33C3.6,-31 2.6,-30 2.4,-28.4C1.8,-30 1.4,-30.6 0.6,-31.4C0,-30 -0.6,-30.4 -1,-32Z' : 'M-5,-43.8L-1,-43.4L-2.4,-31C-2.6,-29.4 -3.4,-28.6 -3.4,-26.6C-4,-28.4 -4.6,-29 -5.4,-30C-6,-29 -6.6,-29.2 -6.6,-31.2Z';
  s += cel(d, tail, [GOO, GOO_D], { sw: 1.3, hi: 0.6 });
  s += back ? drool(2.6, -29, 3, 1.1) : drool(-3.4, -27, 3.4, 1.2) + drool(5.6, -43, 2.6, 1);
  s += hl(back ? 1 : -3.6, back ? -40 : -38, 0.5, 2.4, 6, 0.6);
  return s;
}
function knitScarf(d: Doc, back: boolean): string {
  const R: Tone = ['#E2343B', '#B32028'];
  const band = back ? 'M-7,-46.2Q0.5,-48.6 8,-46.2L8.4,-42.8Q0.5,-45 -7.4,-42.8Z' : 'M-6.6,-46.6Q0.5,-43 7.6,-46.6L7.8,-43.2Q0.5,-39.4 -6.8,-43.2Z';
  let s = cel(d, band, R, { sw: 1.3, hi: 0.5 });
  const tail = back ? 'M-1.6,-45L3,-45L3.4,-31.6L-1.4,-31.6Z' : 'M-5,-43.8L-1,-43.4L-2.2,-30.4L-6.4,-30.6Z';
  s += cel(d, tail, R, { sw: 1.3, hi: 0.6 });
  let knit = '';
  for (let y = -42; y < -31; y += 2) knit += back ? `M-1,${y}l1.2,1l1.2,-1l1.2,1` : `M-5.6,${f(y + 0.4)}l1.1,1l1.1,-1l1.1,1`;
  s += d.clip(tail, S(knit, 0.5, R[1]));
  const fr = back ? [-1, 0.4, 1.8, 3] : [-6, -4.8, -3.6, -2.4];
  for (const x of fr) s += S(`M${f(x)},${back ? -31.6 : -30.6}l${back ? 0 : -0.2},2.4`, 1, R[1]);
  return s;
}
LOOKS.grandma = {
  skin: GM_SKIN,
  hair: SILVER,
  brow: '#A9AEB8',
  height: 72,
  rig: { scale: 0.9 },
  pants: ['#E8C9A8', '#C9A27E'],
  leg: 'stockings',
  shoe: ['#7A2A3A', '#561A26'],
  sleeve: 'long',
  sleeveCol: CARDI,
  cuff: '#B8A0E0',
  underL: caneUnder,
  boxL: [-22, -48, -2, 3],
  headBox: [-30, -96, 30, -32],
  lips: '#D98A9A',
  lashes: false,
  torso: (d, z) => {
    const bot = -11.6;
    let dress = 'M-10.6,-40.8C-10.6,-43.6 -8,-44.8 -4.8,-44.8L5.8,-44.8C9,-44.8 11.6,-43.6 11.6,-40.8L12,-24' + `L13.8,${f(bot + 2)}`;
    dress += z ? zz([13.8, bot], [-12.8, bot], 6, -2) : `C13.8,${f(bot)} 13,${f(bot)} 12,${f(bot)}L-11,${f(bot)}C-12,${f(bot)} -12.8,${f(bot)} -12.8,${f(bot + 2)}`;
    dress += 'L-11,-24Z';
    let s = cel(d, dress, DRESS);
    s += flowers(d, dress, [[-8, -18], [-3, -14.6], [3, -17.6], [8.6, -14.6], [10.6, -20], [-10, -14], [0, -21]], '#FFFFFF', '#FFC83D');
    s += fold('M-6,-22q-0.6,4 -1.6,9M5,-22q0.6,4 1.8,9', '#E08FA6', 0.9);
    const cl = 'M-10.6,-41C-10.6,-43.6 -8,-44.8 -4.8,-44.8L-2,-44.8L-1.4,-24L-11.6,-22.4Z';
    const cr = 'M3,-44.8L5.8,-44.8C9,-44.8 11.6,-43.6 11.6,-41L12.4,-22.6L2.4,-24Z';
    s += cel(d, cl, CARDI) + cel(d, cr, CARDI);
    s += S('M-11.4,-23.6L-1.4,-25M2.4,-25L12.2,-23.8', 1.4, '#B8A0E0');
    for (const y of [-38, -33, -28]) s += `<circle cx="-2.8" cy="${y}" r="0.75" fill="#FFF4DC" stroke="${OUT}" stroke-width="0.5"/>`;
    s += P(rrect(4.6, -31.6, 5, 4.6, 0.8), CARDI[1], 0.9) + P('M5.6,-31.6C5.2,-34 7,-34.8 7.6,-33.6C8.4,-35.2 10.2,-34 9.2,-31.6Z', '#FFFFFF', 0.8);
    s += z ? gooScarf(d, false) : knitScarf(d, false);
    if (z) s += rip(d, 7.4, -38, 0.7) + rip(d, -8, -30, 0.7) + stain(4, -17, 0.7, STAIN_G, 0.7);
    return s;
  },
  torsoBack: (d, z) => {
    const bot = -11.6;
    let dress = 'M-11,-30L12,-30L13.8,-13.6';
    dress += z ? zz([13.8, bot], [-12.8, bot], 6, -2) : `C13.8,${f(bot)} 13,${f(bot)} 12,${f(bot)}L-11,${f(bot)}C-12,${f(bot)} -12.8,${f(bot)} -12.8,${f(bot + 2)}`;
    dress += 'Z';
    let s = cel(d, dress, DRESS) + flowers(d, dress, [[-8, -18], [-3, -14.6], [3, -17.6], [8.6, -14.6], [10.6, -20], [-10, -14]], '#FFFFFF', '#FFC83D');
    const c = torsoD(z, 10.8, 12.2, -44, -22);
    s += cel(d, c, CARDI) + d.clip(c, P('M-20,-24.6H20V-20H-20Z', '#B8A0E0') + S('M-20,-24.6H20', 0.8));
    s += fold('M0.5,-40V-26M-7,-34q2,1 4,0', CARDI[1], 0.8);
    s += z ? gooScarf(d, true) : knitScarf(d, true);
    if (z) s += rip(d, -6, -32, 0.7) + rip(d, 7, -16, 0.6);
    return s;
  },
  hairFront: (d, z) => curls(d, false, z) + needles(z),
  hairBack: (d, z) => curls(d, true, z) + G(needles(z), 'translate(-1 0)'),
  glasses: 'round',
  face: 'sweet',
  zface: 'toothless',
};

// ======================================================= movie star
const MS_SKIN: Tone = ['#F7D3BE', '#DDAA92'];
const PLAT: Tone = ['#FFF0B8', '#E0C878'];
const GOWN: Tone = ['#D7263E', '#A81A2E'];
function msHair(d: Doc, back: boolean, z: boolean): string {
  const dx = back ? -1 : 0;
  const pts: [number, number, number][] = back
    ? [[-15.4, -54, 4], [-16.4, -61, 4.4], [-13, -68, 4.6], [-6, -73, 4.8], [2, -75, 5], [10, -72.6, 4.8], [15.6, -66.4, 4.2], [-9, -51, 4], [-2, -49.6, 4], [5, -50, 4], [10.6, -53, 3.6], [-6, -60, 6], [4, -61, 6]]
    : [[-15.8, -53.4, 3.6], [-16.6, -60, 4.2], [-13.4, -67, 4.6], [-6.4, -72, 4.8], [2, -74.2, 5], [10, -72.4, 4.6], [16, -66.6, 4.2], [18, -59.4, 3.4]];
  let s = fluff(d, pts.map(([x, y, r]) => [x + dx, y, r] as [number, number, number]), PLAT);
  if (!back) {
    // the iconic front curl
    s += cel(d, 'M-8,-66C-6,-72 4,-73 9,-68C11,-66 10,-63 7.6,-63.2C6.6,-65.6 3,-67 0,-66C-3,-65 -6,-63 -8,-66Z', PLAT, { sw: OW * 0.9, hi: 0.6 });
    s += S('M2.6,-66.6Q4.6,-68 6.4,-66.4Q7,-64.6 5.4,-64.6', 0.8, PLAT[1]);
  }
  s += S(`M${f(-12 + dx)},-68q2,-2 4,0M${f(4 + dx)},-74q2,-2 4,0M${f(12 + dx)},-69q2,-1 3,1`, 0.7, PLAT[1]);
  if (z) s += S(`M${f(-14 + dx)},-74q-3,-2 -2,-6M${f(14 + dx)},-74q3,-1 4,-5`, 0.9, PLAT[1]) + drool(-16 + dx, -50, 3, 1.2);
  return s;
}
LOOKS.moviestar = {
  skin: MS_SKIN,
  hair: PLAT,
  brow: '#B89A50',
  height: 80,
  pants: MS_SKIN,
  leg: 'bare',
  shoe: GOWN,
  heels: true,
  sleeve: 'none',
  sleeveCol: MS_SKIN,
  longGlove: ['#FFFFFF', '#DDE2E8'],
  lashes: true,
  lips: '#D7263E',
  itemL: photoCard,
  boxL: [-29, -48, -1, -10],
  torso: (d, z) => {
    const sk = z ? ZSK : MS_SKIN;
    let s = cel(d, torsoD(false, 10.4, 10.8, -44, -22), sk, { hi: 0.6 });
    let g = 'M-9.6,-37.6C-6,-39.6 -2.4,-41.6 -1,-45.4L2,-45.4C3.4,-41.6 7,-39.6 10.6,-37.6C11.2,-33 11,-29 10.6,-26C11.6,-22 13,-17 14.2,-12.6';
    g += z ? zz([14.2, -12.6], [-13.2, -12.6], 6, -1.8) : 'C14.2,-11.8 13.4,-11.6 12.6,-11.6L-11.6,-11.6C-12.4,-11.6 -13.2,-11.8 -13.2,-12.6';
    g += 'C-12,-17 -10.6,-22 -9.6,-26C-10,-29 -10.2,-33 -9.6,-37.6Z';
    s += cel(d, g, GOWN);
    let sp = '';
    for (const [x, y, r] of [[-5, -33, 1.2], [4.6, -30, 1], [-2, -24, 0.9], [7.6, -20, 1.2], [-8, -16, 1], [2, -15, 1.1], [-6, -27, 0.7], [8, -34, 0.8]] as [number, number, number][]) {
      sp += `<path d="M${f(x)},${f(y - r * 1.6)}L${f(x + r * 0.35)},${f(y - r * 0.35)}L${f(x + r * 1.6)},${f(y)}L${f(x + r * 0.35)},${f(y + r * 0.35)}L${f(x)},${f(y + r * 1.6)}L${f(x - r * 0.35)},${f(y + r * 0.35)}L${f(x - r * 1.6)},${f(y)}L${f(x - r * 0.35)},${f(y - r * 0.35)}Z" fill="#FFE8EC"/>`;
    }
    s += d.clip(g, sp);
    s += fold('M-6,-26q1,-1 3,0M3,-24q2,1 4,0M-4,-20q-1,4 -2.4,7.6M6,-19q1,3 2.6,6', GOWN[1], 0.9);
    s += S('M-9.8,-26.4Q0.5,-24.4 10.8,-26.4', 1, '#A81A2E');
    // pearls
    let pearls = '';
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x = -3.6 + 8.8 * t;
      const y = -44.6 + Math.sin(t * Math.PI) * 3.2;
      pearls += `<circle cx="${f(x)}" cy="${f(y)}" r="0.85" fill="#FFFDF4" stroke="${OUT}" stroke-width="0.4"/>`;
    }
    s += z ? rot(pearls, 8, [0.5, -43]) : pearls;
    if (z) s += rip(d, 6.6, -30, 0.8) + rip(d, -6.4, -19, 0.8) + stain(-3, -35, 0.6, STAIN_G, 0.7);
    return s;
  },
  torsoBack: (d, z) => {
    const sk = z ? ZSK : MS_SKIN;
    let s = cel(d, torsoD(false, 10.4, 10.8, -44, -22), sk, { hi: 0.6 });
    s += S('M-4,-41q1,3 0.6,6M5,-41q-1,3 -0.6,6M0.5,-40V-33', 0.8, darker(sk[1]));
    let g = 'M-10,-32C-6,-30 7,-30 11,-32C11.2,-30 11,-28 10.6,-26C11.6,-22 13,-17 14.2,-12.6';
    g += z ? zz([14.2, -12.6], [-13.2, -12.6], 6, -1.8) : 'C14.2,-11.8 13.4,-11.6 12.6,-11.6L-11.6,-11.6C-12.4,-11.6 -13.2,-11.8 -13.2,-12.6';
    g += 'C-12,-17 -10.6,-22 -9.6,-26C-10,-28 -10.2,-30 -10,-32Z';
    s += cel(d, g, GOWN);
    s += fold('M0.5,-28V-12M-5,-20q-1,4 -2,7.6M6,-19q1,3 2.6,6', GOWN[1], 0.9);
    s += S('M-3.6,-45.4Q0.5,-43.4 4.6,-45.4', 1.6, GOWN[0]) + S('M0.5,-44.4l-2,3M0.5,-44.4l2,3', 1.2, GOWN[0]) + P(ell(0.5, -44.4, 1.2, 1), GOWN[0], 0.8);
    if (z) s += rip(d, -6, -24, 0.8) + rip(d, 8, -16, 0.7);
    return s;
  },
  back: (d) => fluff(d, [[-17.4, -50, 3.6], [-14.6, -47.4, 3.2], [-19, -55, 3.4]], PLAT),
  hairFront: (d, z) => msHair(d, false, z) + P(ell(-14.6, -50.4, 1.4), '#FFFDF4', 0.7),
  hairBack: (d, z) => msHair(d, true, z) + P(ell(18.6, -50.8, 1.4), '#FFFDF4', 0.7),
  faceOver: (_d, z, e) => `<circle cx="${e === 'scream' ? 11.4 : 10.6}" cy="-49.4" r="0.7" fill="${OUT}"/>` + (z && !e ? P('M7.6,-49.6q2,1 3.6,3.2', 'none', 1, '#D7263E', 'opacity="0.7"') : ''),
  face: 'glam',
  zface: 'lazy',
};

// ======================================================= sumo
const SM_SKIN: Tone = ['#F0C49C', '#D29A70'];
const MAWASHI: Tone = ['#3A3F7A', '#262A55'];
const SUMO_TORSO = 'M-11.6,-48.4C-15.4,-48.4 -17,-46 -17.2,-42.6C-20.8,-38 -23,-31 -22.4,-25C-21.8,-18.6 -17.6,-14.6 -12,-14.6L12,-14.6C17.6,-14.6 21.8,-18.6 22.4,-25C23,-31 20.8,-38 17.2,-42.6C17,-46 15.4,-48.4 11.6,-48.4Z';
LOOKS.sumo = {
  skin: SM_SKIN,
  hair: ['#1E1816', '#0E0A0A'],
  height: 84,
  rig: { shX: 15.4, legX: 7.8, legW: 12, lift: 5, armW: 1.5 },
  pants: SM_SKIN,
  leg: 'bare',
  barefoot: true,
  shoe: SM_SKIN,
  sleeve: 'bulk',
  sleeveCol: SM_SKIN,
  torsoBox: [-25, -59, 25, -2],
  torso: (d, z) => {
    const sk = z ? ZSK : SM_SKIN;
    const dk = darker(sk[1]);
    let s = cel(d, SUMO_TORSO, sk, { off: [-1.6, -1.6], hi: 1.1 });
    // pecs + the belly
    s += S('M-13,-38Q-7,-34.4 -1,-37.6M2,-37.6Q8,-34.4 14,-38', 1.1, dk);
    const belly = 'M-17,-30C-17,-38 -8,-37.4 0.5,-37.4C9,-37.4 18,-38 18,-30C18.4,-23 12,-19.4 0.5,-19.4C-11,-19.4 -17.4,-23 -17,-30Z';
    void belly;
    s += S('M-19,-31Q-12,-36.6 0.5,-36.4Q13,-36.6 20,-31', 0.9, dk, 'opacity="0.7"') + hl(-9, -30, 5, 2.4, -20, 0.4) + hl(-14.6, -40, 1.6, 0.8, -30, 0.5);
    s += P(ell(1, -25.4, 1.2, 1.6), dk, 0.8) + S('M0,-26.4q1,0.6 2,0', 0.6, sk[1]);
    // mawashi: front band + apron panel + sagari cords
    s += d.clip(SUMO_TORSO, cel(d, 'M-24,-21.6C-12,-19.2 13,-19.2 24,-21.6V-12H-24Z', MAWASHI, { sw: 1.2, hi: 0.7 }));
    s += cel(d, 'M-4.4,-20.2L5.4,-20.2L6.4,-13.4L-5.4,-13.4Z', MAWASHI, { sw: 1.2, hi: 0.5 });
    for (let i = 0; i < 7; i++) {
      const x = -8.4 + i * 2.9;
      s += S(`M${f(x)},-19.8L${f(x + (x - 0.5) * 0.06)},${z && i % 2 ? -9.6 : -7.4}`, 1.8) + S(`M${f(x)},-19.8L${f(x + (x - 0.5) * 0.06)},${z && i % 2 ? -9.6 : -7.4}`, 0.8, '#5A5FA0');
    }
    s += S(SUMO_TORSO, OW);
    if (z) {
      // the gag: a stitched-up mega belly
      s += stitches(-12, -28, 12, -32.6, 7, 1.5, 1);
      s += P(ell(10.4, -25, 2.6, 1.8), '#74B134') + rip(d, -13, -24, 0.8) + stain(-4, -35, 0.7, STAIN_G, 0.8);
      s += drool(14, -22, 3, 1.2);
    }
    return s;
  },
  torsoBack: (d, z) => {
    const sk = z ? ZSK : SM_SKIN;
    const dk = darker(sk[1]);
    let s = cel(d, SUMO_TORSO, sk, { off: [-1.6, -1.6], hi: 1.1 });
    s += S('M-10,-42Q-6,-38 -2,-41M3,-41Q7,-38 11,-42M0.5,-44V-24', 1, dk);
    s += fold('M-17,-30q3,1.4 6,0.6M18,-30q-3,1.4 -6,0.6', dk, 0.9);
    s += d.clip(SUMO_TORSO, cel(d, 'M-24,-24C-12,-21.6 13,-21.6 24,-24V-18.4C13,-16.4 -12,-16.4 -24,-18.4Z', MAWASHI, { sw: 1.2, hi: 0.7 }));
    // the strap and the big back knot
    s += d.clip(SUMO_TORSO, cel(d, 'M-1.6,-20L2.6,-20L2.2,-10L-1.2,-10Z', MAWASHI, { sw: 1.1, hi: 0 }));
    s += cel(d, 'M-5,-25.4C-5,-29 6,-29 6,-25.4L5.4,-18.4C3,-17 -2,-17 -4.4,-18.4Z', MAWASHI, { sw: 1.2, hi: 0.6 });
    s += S('M-3,-26q3.6,1.6 7,0M-2.6,-22q3.4,1.4 6.4,0', 0.8, '#5A5FA0');
    s += S('M-6,-15.2Q-3,-13.6 -1.4,-15.4M2.4,-15.4Q4,-13.6 7,-15.2', 0.9, dk);
    s += S(SUMO_TORSO, OW);
    if (z) s += stitches(-14, -36, -6, -32, 3) + rip(d, 12, -34, 0.8);
    return s;
  },
  hairFront: (d, z) => {
    const cap = 'M-16.6,-56C-17.6,-70 -8,-76 2,-75.8C12,-75.8 18.8,-70 18.2,-60.4C16,-62.6 12,-64.4 6,-64.8C0,-65 -6,-64 -10,-62C-12.6,-60.4 -14,-58.6 -14.6,-56Z';
    let s = cel(d, cap, ['#2B2522', '#16110F'], { off: [-0.8, -0.8], hiCol: '#5A4E48' });
    s += S('M-10,-66Q-2,-72 10,-70M-4,-64.6Q4,-68 14,-64', 0.8, '#5A4E48');
    const knot = 'M-3,-75C-5,-83 3,-87.6 9.4,-84.8C13.6,-83 12.6,-78.6 9,-79C6.6,-79.4 4,-78 3,-75.4Z';
    s += cel(d, knot, ['#2B2522', '#16110F'], { off: [-0.8, -0.8], hiCol: '#5A4E48' });
    s += P(rrect(-2.2, -77.4, 4.6, 2.2, 0.6), '#F4F4F4', 0.8);
    if (z) s += S('M8,-84q2,-4 5,-4', 1, '#16110F');
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, backHairD(-1.4, -75.8), ['#2B2522', '#16110F'], { off: [-0.8, -0.8], hiCol: '#5A4E48' });
    s += S('M-12,-58Q-4,-66 0,-74M12,-56Q8,-66 2,-74', 0.8, '#5A4E48');
    s += cel(d, 'M-4,-75C-6,-83 2,-87.6 8.4,-84.8C12.6,-83 11.6,-78.6 8,-79C5.6,-79.4 3,-78 2,-75.4Z', ['#2B2522', '#16110F'], { off: [-0.8, -0.8], hiCol: '#5A4E48' });
    s += P(rrect(-3.2, -77.4, 4.6, 2.2, 0.6), '#F4F4F4', 0.8);
    if (z) s += stitches(-6, -64, 2, -60, 3, 1.3, 0.9, '#B8E26B');
    return s;
  },
  face: 'stern',
  zface: 'underbite',
  noBlush: false,
};

// ======================================================= influencer
const IN_SKIN: Tone = ['#F2C8A8', '#D9A07E'];
const HOODIE: Tone = ['#8E5BD6', '#6A3FB0'];
const PINK: Tone = ['#FF7FB0', '#D9578A'];
LOOKS.influencer = {
  skin: IN_SKIN,
  hair: PINK,
  brow: '#C9467A',
  height: 82,
  pants: ['#2E2840', '#1C1828'],
  shoe: ['#FFFFFF', '#C9CED6'],
  shoeTrim: '#FF7FB0',
  leg: 'leggings',
  sleeve: 'long',
  sleeveCol: HOODIE,
  cuff: '#6A3FB0',
  lashes: true,
  lips: '#E8607E',
  underR: selfieUnder,
  boxR: [1, -82, 52, -15],
  torso: (d, z) => {
    const td = torsoD(z, 11, 12, -44, -15.4);
    let s = cel(d, 'M-8.8,-41.6C-10.6,-48.8 -4,-50.8 0.5,-50.8C5,-50.8 11.6,-48.8 9.8,-41.6Z', ['#7A4CC0', '#5A3498'], { hi: 0.6 });
    s += cel(d, td, HOODIE);
    s += d.clip(td, P('M-20,-19H20V-10H-20Z', '#7A4CC0') + S('M-20,-19H20', 0.9) + S('M-8,-18.8V-15.6M-4,-18.8V-15.6M0,-18.8V-15.6M4,-18.8V-15.6M8,-18.8V-15.6', 0.5, '#5A3498'));
    s += cel(d, 'M-6.6,-28.4L7.6,-28.4L9.2,-20.6L-8.2,-20.6Z', ['#9A66E0', '#7A4CC0'], { sw: 1.1, off: [-0.5, -0.5], hi: 0.5 });
    s += S('M-2.4,-43.4L-3,-36M3.4,-43.4L4,-36.6', 0.9, '#FFFFFF') + P(ell(-3, -35.6, 0.9), '#FFFFFF', 0.6) + P(ell(4, -36.2, 0.9), '#FFFFFF', 0.6);
    const ht = heart(-5.6, -36.4, 1.1);
    s += z ? P(ht, '#FFD23D', 1) + P(ell(-3.6, -37.8, 1.2), HOODIE[0]) + S('M-4.8,-38.6a1.2,1.2 0 0 1 0.6,2.2', 0.9) : P(ht, '#FFD23D', 1);
    s += P(star(6.4, -32, 1.3), '#FFFFFF', 0.6) + shirtFolds('#6A3FB0', 11);
    if (z) s += rip(d, 6, -24.6, 0.8) + rip(d, -7, -30, 0.7) + stain(2, -24, 0.6, STAIN_G, 0.8);
    return s;
  },
  torsoBack: (d, z) => {
    const td = torsoD(z, 11, 12, -44, -15.4);
    let s = cel(d, td, HOODIE);
    s += d.clip(td, P('M-20,-19H20V-10H-20Z', '#7A4CC0') + S('M-20,-19H20', 0.9));
    const hood = 'M-8.6,-45.6C-10.4,-38.6 -7,-30.4 0.5,-29.6C8,-30.4 11.4,-38.6 9.6,-45.6C5,-43.4 -4,-43.4 -8.6,-45.6Z';
    s += cel(d, hood, ['#9A66E0', '#7A4CC0'], { hi: 0.6 }) + S('M-6,-41.6C-5,-35.6 6,-35.6 7,-41.6', 0.9, '#5A3498');
    s += P(heart(0.5, -24.6, 1.3), '#FFD23D', 0.9);
    s += fold('M-8,-28q3,1 5,0.2M4,-27q3,1 5,0', '#6A3FB0', 0.8);
    if (z) s += rip(d, -6, -26, 0.8) + rip(d, 7, -36, 0.6);
    return s;
  },
  back: (d, z) => cel(d, z ? 'M-14,-64C-20,-60 -22,-52 -20,-46L-18,-48.4L-17,-45L-15,-48C-15.4,-52 -14,-56 -11,-60Z' : 'M-14,-64C-20,-60 -22,-52 -19,-45C-16,-47 -15.4,-52 -11,-60Z', PINK, { off: [-0.8, -0.8] }),
  hairFront: (d, z) => {
    const cap = 'M-16.6,-55C-17.8,-71 -7,-77 2,-76.6C12,-76.4 19,-70.4 18.4,-58C16,-62 12,-66 6,-66.4C2,-66.6 -2,-63 -6,-62.4C-9,-62 -11.6,-59 -13.4,-55.2Z';
    let s = cel(d, cap, PINK, { off: [-1, -1] });
    s += S('M-4,-64Q2,-70 10,-70M4,-73Q10,-72 15,-66', 0.9, PINK[1]) + hl(4, -73, 4, 1, -10, 0.45);
    s += cel(d, ell(2, -80.2, 6.2, 5.4), PINK, { off: [-1, -1] }) + S('M-2,-81q4,-3 8,0', 0.8, PINK[1]);
    s += cel(d, rrect(-3.6, -76.6, 11.4, 2.6, 1.2), ['#FFD23D', '#E0A21A'], { sw: 1.1, hi: 0.4 });
    if (z) s += strays(PINK[1]);
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, 'M-16.6,-52C-18,-64 -11,-77 1.4,-77C12,-77 18.8,-70 18.2,-61L16.2,-60.6C14,-60 12.6,-57.4 12.6,-54L14,-46L10,-46.6L6,-45L2,-46.4L-2,-45L-6,-46.6L-10,-45.6L-14,-47L-15,-46Z', PINK, { off: [-1, -1] });
    s += S('M-10,-50Q-8,-62 -2,-72M0,-48Q2,-60 6,-72M8,-48Q12,-58 12,-66', 0.8, PINK[1]);
    s += cel(d, ell(1, -80.2, 6.2, 5.4), PINK, { off: [-1, -1] }) + cel(d, rrect(-4.6, -76.6, 11.4, 2.6, 1.2), ['#FFD23D', '#E0A21A'], { sw: 1.1, hi: 0.4 });
    if (z) s += strays(PINK[1]);
    return s;
  },
  faceOver: (_d, z, e) => (e === 'scream' || e === 'chomp' ? '' : P(heart(-10.6, -51.4, 0.7), z ? '#FF3B6B' : '#FF7FB0', 0.6) + P(star(14.2, -58, 1.1), '#FFD23D', 0.5)),
  face: 'pout',
  zface: 'wink',
};

// ======================================================= celebrity
const CE_SKIN: Tone = ['#D9A47A', '#B47E54'];
const FUR: Tone = ['#FF9BCF', '#E066A6'];
function shades(z: boolean, e: Expr): string {
  const lens = (x: number, y: number, rx: number, ry: number, broken: boolean) =>
    broken
      ? P(ell(x, y, rx, ry), 'none', 1.4, '#D9A520') + S(`M${f(x - rx * 0.4)},${f(y + ry)}l${f(rx * 0.4)},${f(-ry * 0.7)}l${f(rx * 0.3)},${f(ry * 0.5)}`, 0.8, '#2B2B33')
      : P(ell(x, y, rx, ry), '#2B2B44', 1.4, '#D9A520') + `<ellipse cx="${f(x - rx * 0.3)}" cy="${f(y - ry * 0.35)}" rx="${f(rx * 0.45)}" ry="${f(ry * 0.22)}" fill="#8EB8FF" opacity="0.7" transform="rotate(-20 ${f(x)} ${f(y)})"/>`;
  let s = lens(-3.8, -57, 4.6, 3.8, false) + lens(7.2, -56.6, 4, 3.5, z) + S('M0.8,-58.4Q2,-59.6 3.2,-58.4', 1.2, '#D9A520') + S('M-8.4,-57.6L-14.6,-58.6', 1.2, '#D9A520');
  if (z) s += S('M-6,-59.4l3,3.4M-3,-60l1.4,1.6', 0.6, '#FFFFFF');
  if (e === 'dazed') return G(s, 'rotate(24 -12 -58) translate(0 3)');
  if (e && e !== 'sleep') return G(s, 'translate(0 -9.6) scale(1 0.9)');
  return s;
}
LOOKS.celebrity = {
  skin: CE_SKIN,
  hair: ['#2B2433', '#17121C'],
  height: 84,
  rig: { shX: 11.8 },
  pants: ['#2B2B33', '#16161C'],
  shoe: ['#FFFFFF', '#C9CED6'],
  shoeTrim: '#FFC83D',
  sleeve: 'long',
  sleeveCol: FUR,
  cuff: '#FFC0E0',
  headBox: [-30, -98, 31, -32],
  torsoBox: [-19, -54, 19, -6],
  torso: (d, z) => {
    const td = torsoD(z, 12.2, 13.6, -44, -12);
    let s = cel(d, td, FUR, { hi: 0 });
    s += cel(d, 'M-4.6,-45L-2.6,-24L3.6,-24L5.6,-45Z', ['#3A3448', '#24202E'], { sw: 1, hi: 0.5 });
    s += cel(d, 'M-2.6,-45L0.5,-36.6L3.6,-45Z', CE_SKIN, { sw: 0.9, hi: 0 });
    s += P('M-2.6,-45L-0.6,-40.6L-4.4,-39.6Z', '#4A4458', 0.8) + P('M3.6,-45L1.6,-40.6L5.4,-39.6Z', '#4A4458', 0.8);
    // gold chain + medallion
    s += S('M-2.4,-44.6Q0.5,-34.4 3.4,-44.6', 2.2) + S('M-2.4,-44.6Q0.5,-34.4 3.4,-44.6', 1.2, '#FFC83D', 'stroke-dasharray="0.9 0.5"');
    const med = cel(d, ell(0.5, -36.4, 3, 3), GOLD, { sw: 1.1, hi: 0.6 }) + txt(0.5, -34.6, 4.2, '$', '#B8821A');
    s += z ? med + P('M2.6,-38.8a1.2,1.2 0 0 1 1.2,1.6a1.2,1.2 0 0 1 -0.2,1.8L4.4,-35L4.4,-39.4Z', FUR[0], 0) + S('M2.6,-38.8a1.2,1.2 0 0 1 1.2,1.6a1.2,1.2 0 0 1 -0.2,1.8', 0.9) : med;
    // fur trim down the front edges and round the hem
    s += fluff(d, [...along([[-12.6, -42], [-13.4, -28], [-14, -14]], 4.6, 2.4), ...along([[13.6, -42], [14.4, -28], [15, -14]], 4.6, 2.4)], FUR);
    s += fluff(d, [...along([[-9.6, -46.2], [-5.6, -44], [-4.2, -34], [-3.8, -24]], 3.6, 3), ...along([[10.6, -46.2], [6.6, -44], [5.2, -34], [4.8, -24]], 3.6, 3)], FUR);
    s += fluff(d, along([[-13.6, -12.6], [-6, -12], [0, -12.2], [7, -12], [14, -12.6]], 4.4, 2.6), FUR);
    s += fold('M-10,-32q1.6,4 0.6,8M11,-30q-1.6,4 -0.6,8M-11,-20q2,1 4,0', FUR[1], 0.9);
    if (z) s += stain(-8, -28, 1, STAIN_G, 0.7) + stain(9, -20, 0.8, '#7CC24A', 0.8) + rip(d, 8, -34, 0.8) + drool(-9, -14, 3, 1.2);
    return s;
  },
  torsoBack: (d, z) => {
    const td = torsoD(z, 12.2, 13.6, -44, -12);
    let s = cel(d, td, FUR, { hi: 0 });
    s += fold('M-6,-40q2,6 1,12M7,-40q-2,6 -1,12M0.5,-28V-14', FUR[1], 0.9);
    s += txt(0.5, -26, 6.4, 'VIP', '#FFC83D', 'middle', `stroke="${OUT}" stroke-width="0.8" paint-order="stroke"`);
    s += fluff(d, [...along([[-12.6, -42], [-13.4, -28], [-14, -14]], 4.6, 2.4), ...along([[13.6, -42], [14.4, -28], [15, -14]], 4.6, 2.4)], FUR);
    s += fluff(d, along([[-11, -45], [-5, -46.6], [1, -47], [7, -46.6], [12, -45]], 3.4, 3), FUR);
    s += fluff(d, along([[-13.6, -12.6], [-6, -12], [0, -12.2], [7, -12], [14, -12.6]], 4.4, 2.6), FUR);
    if (z) s += stain(-6, -32, 1, STAIN_G, 0.7) + rip(d, 7, -20, 0.8);
    return s;
  },
  hairFront: (d, z) => {
    const pomp =
      'M-16.6,-55C-17.6,-64 -15,-70 -10,-73C-8,-80 -2,-86 6,-88C13,-90 21,-87 24,-82C25.6,-79 24.4,-76 21.6,-75.6C23,-78 21,-80.6 17.6,-80C20,-77 21,-71 19,-64C18,-62 17,-61 16.4,-60.2C15.4,-63.6 13,-66 10,-66.4C9,-70 5,-72.6 1,-71.4C-3,-70 -5,-67 -6,-65C-9,-62.4 -12,-59 -13.4,-55.4Z';
    let s = cel(d, pomp, ['#2B2433', '#17121C'], { off: [-1, -1], hiCol: '#6A7EC0' });
    s += S('M-9,-72Q0,-84 14,-85M-6,-68Q2,-78 15,-79M2,-71Q10,-76 17,-72', 0.9, '#5A6AA8');
    s += hl(6, -84.6, 5, 1.1, -14, 0.6, '#B8CCFF') + hl(-6, -74, 2, 0.7, -50, 0.5, '#B8CCFF');
    if (z) s += S('M14,-86q4,-4 8,-2M2,-88q0,-4 3,-5', 1, '#17121C');
    return s;
  },
  hairBack: (d, z) => {
    let s = cel(d, 'M-16.4,-52C-18,-64 -14,-74 -8,-78C-4,-84 4,-88 12,-87C19,-86 23,-82 22,-77C21,-74 19,-74 18,-73C19.4,-69 19,-64 18.2,-61L16.2,-60.6C14,-60 12.6,-57.4 12.4,-54.8C10.4,-50.6 6,-48.6 1.2,-48.6C-5,-48.6 -11,-49.4 -16.4,-52Z', ['#2B2433', '#17121C'], { off: [-1, -1], hiCol: '#6A7EC0' });
    s += S('M-12,-56Q-6,-70 6,-80M-4,-52Q2,-66 14,-76M6,-50Q12,-60 16,-68', 0.9, '#4A5A90');
    if (z) s += S('M12,-86q4,-4 8,-2', 1, '#17121C');
    return s;
  },
  faceOver: (_d, z, e) => shades(z, e),
  face: 'cocky',
  zface: 'shades',
  noBlush: true,
};

// ======================================================= the champ
const CP_SKIN: Tone = ['#E8B48C', '#C98E62'];
const MULLET: Tone = ['#F2C14E', '#C9952A'];
const SINGLET: Tone = ['#D7263E', '#A81A2E'];
const CHAMP_TORSO = 'M-11,-47.8C-14,-47.8 -15.6,-46 -15.6,-43.2C-15.4,-36 -13.6,-27 -12.6,-19.4C-12.4,-17 -11,-16 -8.6,-16L9.6,-16C12,-16 13.4,-17 13.6,-19.4C14.6,-27 16.4,-36 16.6,-43.2C16.6,-46 15,-47.8 12,-47.8Z';
function champBelt(d: Doc, z: boolean, back: boolean): string {
  let s = d.clip(CHAMP_TORSO, cel(d, 'M-18,-27.6C-8,-26.2 9,-26.2 19,-27.6V-19.6C9,-18.4 -8,-18.4 -18,-19.6Z', ['#2B2B33', '#16161C'], { sw: 1.2, hi: 0.5 }));
  if (back) {
    for (const x of [-8, -4, 0.5, 5, 9]) s += P(ell(x, -23.2, 0.9), '#FFC83D', 0.6);
    return s;
  }
  s += cel(d, rrect(-13.4, -26, 4.4, 5, 1), GOLD, { sw: 1, hi: 0.4 }) + cel(d, rrect(10, -26, 4.4, 5, 1), GOLD, { sw: 1, hi: 0.4 });
  const plate = 'M-6.6,-26.6C-6.6,-31.6 7.6,-31.6 7.6,-26.6L7.6,-19.6C7.6,-15 -6.6,-15 -6.6,-19.6Z';
  s += cel(d, plate, GOLD, { hi: 1 });
  s += P(ell(0.5, -23, 5, 4.6), 'none', 0.8, '#B8821A') + P(star(0.5, -23.4, 3.4), '#FFF0A8', 0.9) + P(ell(0.5, -23.2, 1.2), '#D7263E', 0.7) + hl(0, -23.6, 0.4, 0.3, 0, 0.9);
  s += txt(0.5, -16.8, 1.9, 'CHAMP', '#8A5A10');
  if (z) s += S('M-4,-29.6L-1,-25L-3,-22L0,-17', 0.9) + P(ell(5.6, -18, 1.4, 1), GOO, 0.7);
  return s;
}
LOOKS.champ = {
  skin: CP_SKIN,
  hair: MULLET,
  brow: '#C9952A',
  height: 84,
  rig: { shX: 14, legX: 5.8, legW: 8.2, lift: 3, armW: 1.28 },
  pants: SINGLET,
  legStripe: '#FFC83D',
  kneepad: '#2B2B33',
  shoe: SINGLET,
  shoeTrim: '#FFFFFF',
  boots: true,
  sleeve: 'bulk',
  sleeveCol: CP_SKIN,
  wristband: '#FFC83D',
  torsoBox: [-20, -56, 21, -8],
  headBox: [-32, -94, 30, -32],
  torso: (d, z) => {
    const sk = z ? ZSK : CP_SKIN;
    const dk = darker(sk[1]);
    let s = cel(d, CHAMP_TORSO, sk, { off: [-1.4, -1.4], hi: 1 });
    s += S('M-12.6,-38.6Q-6,-34.4 0,-38.4M1,-38.4Q7,-34.4 13.6,-38.6', 1.2, dk) + hl(-6.4, -42, 2.8, 1.2, -10, 0.35) + hl(6.6, -42, 2.4, 1, -10, 0.3);
    let sing = 'M-13.4,-28C-13.6,-33 -12,-38 -9.6,-41L-7.2,-47.6L-5,-47.6L-5.4,-40C-2,-35.4 3,-35.4 6.4,-40L6,-47.6L8.2,-47.6L10.6,-41C13,-38 14.6,-33 14.4,-28L13.6,-19.4';
    sing += z ? zz([13.6, -19.4], [-12.6, -19.4], 5, -1.6) : 'L-12.6,-19.4';
    sing += 'Z';
    s += d.clip(CHAMP_TORSO, cel(d, sing, SINGLET, { hi: 0.8 }));
    s += P(star(0.5, -32, 2.2), '#FFC83D', 0.8);
    s += S('M0.5,-35V-28.4M-3.6,-30.6h2.8M1.6,-30.6h2.8', 0.7, '#A81A2E');
    s += champBelt(d, z, false);
    s += d.clip(CHAMP_TORSO, P('M-20,-19.4H22V-10H-20Z', SINGLET[0]) + P('M4,-19.4H22V-10H4Z', SINGLET[1]) + S('M-20,-19.4H22', 1));
    s += S(CHAMP_TORSO, OW);
    if (z) s += stitches(-11, -42, -4, -39, 2) + rip(d, 9, -33, 0.8);
    return s;
  },
  torsoBack: (d, z) => {
    const sk = z ? ZSK : CP_SKIN;
    const dk = darker(sk[1]);
    let s = cel(d, CHAMP_TORSO, sk, { off: [-1.4, -1.4], hi: 1 });
    s += S('M-9,-42Q-5,-37 -1,-40.6M2,-40.6Q6,-37 10,-42M0.5,-44V-30', 1, dk);
    let sing = 'M-13.4,-28C-13.6,-31 -13,-34 -11,-36L-2,-47.6L0.5,-47.6L0.5,-41L3,-47.6L5.4,-47.6L12,-36C14,-34 14.6,-31 14.4,-28L13.6,-19.4';
    sing += z ? zz([13.6, -19.4], [-12.6, -19.4], 5, -1.6) : 'L-12.6,-19.4';
    sing += 'Z';
    s += d.clip(CHAMP_TORSO, cel(d, sing, SINGLET, { hi: 0.8 }));
    s += champBelt(d, z, true);
    s += d.clip(CHAMP_TORSO, P('M-20,-19.4H22V-10H-20Z', SINGLET[0]) + S('M-20,-19.4H22', 1));
    s += S(CHAMP_TORSO, OW);
    if (z) s += rip(d, -7, -32, 0.8);
    return s;
  },
  back: (d, z) => {
    const m = z
      ? 'M-14,-62C-20,-58 -23,-50 -22,-43L-19.6,-45L-18.4,-41.4L-16,-44.6L-14,-42C-14,-48 -12,-54 -9,-58Z'
      : 'M-14,-62C-20,-58 -23,-50 -21,-42C-18,-42.6 -15,-44 -13.4,-47C-12.4,-51 -11,-55 -9,-58Z';
    return cel(d, m, MULLET, { off: [-0.8, -0.8] }) + S('M-18,-56Q-20,-50 -19,-45', 0.8, MULLET[1]);
  },
  hairFront: (d, z) => {
    const top = 'M-16.6,-55C-18,-66 -14,-73 -8,-75.4L-9.6,-79L-4,-77L-2,-81L2,-77.4L6,-80.6L7.6,-76.6L13,-78L12.6,-74C17.6,-71.6 19.6,-66 18.6,-60C16,-63 12,-65 7,-65.4C2,-65.6 -4,-64.4 -7,-63C-10,-61 -12.6,-58.4 -13.4,-55.4Z';
    let s = cel(d, top, MULLET, { off: [-1, -1] }) + S('M-4,-70Q2,-74 8,-72M8,-68Q12,-70 15,-67', 0.9, MULLET[1]);
    const band = 'M-17,-63.6C-8,-69.6 10,-70.6 18.8,-64.4L18.8,-60.6C10,-66.4 -8,-65.6 -16.8,-59.4Z';
    s += cel(d, band, ['#E2343B', '#B32028'], { sw: 1.3, hi: 0.5 });
    s += cel(d, 'M-16.4,-62L-22,-60.6L-21,-56.4L-16.4,-59.6Z', ['#E2343B', '#B32028'], { sw: 1.1, hi: 0 }) + cel(d, 'M-16.4,-61.6L-23.4,-65L-23.6,-61.6L-16.6,-60Z', ['#E2343B', '#B32028'], { sw: 1.1, hi: 0 });
    if (z) s += strays(MULLET[1]);
    return s;
  },
  hairBack: (d, z) => {
    // the mullet in all its glory
    const m = z
      ? 'M-16.6,-56C-18,-68 -11,-77 1.4,-77.4C12,-77.4 18.8,-70 18.2,-61L16.2,-60.6C14,-60 12.6,-57.4 12.6,-53C13,-48 14,-44 15,-41L12,-42.6L10.4,-39.4L8,-42L5,-38.6L2.6,-42L-0.4,-38.8L-2.4,-42.4L-5.6,-39.6L-7,-43L-10.6,-41L-11.4,-45L-15,-44Z'
      : 'M-16.6,-56C-18,-66 -14,-73 -9,-75.4L-10.6,-79L-5,-77L-3,-81L1,-77.4L5,-80.6L6.6,-76.6L12,-78L11.6,-74C16.6,-71.6 18.6,-66 18.2,-61L16.2,-60.6C14,-60 12.6,-57.4 12.6,-53C13,-48 14,-44 15.4,-40.4L12.4,-41.8L10.6,-38.6L8,-41.2L5.4,-37.6L2.8,-41L0,-37.8L-2.6,-41.4L-5.6,-38.6L-7.4,-42L-10.8,-40L-11.6,-44L-15,-43.4C-16.4,-48 -16.6,-52 -16.6,-56Z';
    let s = cel(d, m, MULLET, { off: [-1, -1] });
    s += S('M-10,-46Q-8,-54 -6,-58M-4,-44Q-3,-52 -1,-56M3,-43Q4,-50 6,-56M9,-44Q10,-50 11,-55M-12,-50Q-11,-54 -10,-57', 0.9, MULLET[1]) + hl(-4, -52, 3, 1, -60, 0.4);
    s += cel(d, 'M-17.4,-63.6C-8,-68.6 10,-69.6 19,-64.4L19,-60.6C10,-65.4 -8,-64.6 -17.2,-59.4Z', ['#E2343B', '#B32028'], { sw: 1.3, hi: 0.5 });
    s += cel(d, 'M-17,-61.6L-21.6,-56L-18.6,-54L-15.8,-59.4Z', ['#E2343B', '#B32028'], { sw: 1.1, hi: 0 }) + cel(d, 'M-17,-61.6L-23.6,-58.8L-22.4,-55.6L-16,-59.2Z', ['#E2343B', '#B32028'], { sw: 1.1, hi: 0 });
    if (z) s += strays(MULLET[1]);
    return s;
  },
  faceOver: (d, z, e) => {
    if (e === 'chomp') return '';
    const tr = e === 'scream' ? 'translate(0 -1.6)' : '';
    const mu = cel(d, 'M-4,-51.4C-2,-54.8 2.4,-54.4 3.8,-52.4C5.4,-54.4 10.6,-55 12.4,-51.4C13.2,-49 13.4,-46 12.6,-43.6C11.6,-44.6 11.4,-47 10.4,-48.8C8,-50.2 5.6,-50 3.8,-50.6C2,-49.8 -0.6,-50.2 -2.4,-48.6C-3.2,-47 -3.2,-44.6 -4,-43.4C-4.8,-46 -4.8,-49 -4,-51.4Z', ['#C9952A', '#9A6E18'], { sw: 1.1, off: [-0.4, -0.4], hi: 0.4 });
    return (tr ? G(mu, tr) : mu) + (z ? drool(12.6, -43.4, 2.6, 1) : '');
  },
  face: 'cocky',
  zface: 'grumpy',
  noBlush: true,
};

// ======================================================= you (the player)
LOOKS.you = {
  skin: ['#F4DED0', '#D6B6A4'],
  hair: ['#5A3420', '#3E2214'],
  height: 82,
  pants: ['#2F4C8F', '#22396B'],
  shoe: ['#3A2A22', '#22180F'],
  sleeve: 'short',
  sleeveCol: ['#3D7DD8', '#2B5DA8'],
  bandage: true,
  pale: true,
  torso: (d) => {
    const td = torsoD(false);
    let s = cel(d, td, ['#3D7DD8', '#2B5DA8']);
    s += apron(d, false, false);
    // spatula in the apron pocket
    s += P(rrect(3.4, -32.6, 1.4, 6, 0.4), '#3A2A22', 0.8) + P(rrect(2.4, -35.6, 3.4, 3.4, 0.6), '#C9D2DC', 0.8) + S('M3.4,-34.6V-33M4.6,-34.6V-33', 0.4, '#8E99A6');
    s += stain(-5, -21, 0.5, '#A8432A', 0.5);
    return s;
  },
  torsoBack: (d) => {
    const td = torsoD(false);
    let s = cel(d, td, ['#3D7DD8', '#2B5DA8']);
    s += d.clip(td, P('M-20,-20.2H20V-10H-20Z', '#2F4C8F') + S('M-20,-20.2H20', 1.1));
    s += P('M-4.6,-45.2Q0.5,-46.6 5.6,-45.2L5.2,-43Q0.5,-44 -4.2,-43Z', '#2B5DA8', 1);
    s += fold('M-8,-36q3,1.4 5,0.4M3,-38q3,1.4 6,0', '#2B5DA8', 0.8);
    s += apronBack(d, false);
    return s;
  },
  hairFront: (d, z) =>
    d.tone('M-16.6,-55C-17.4,-60.4 -16,-63.4 -13.6,-64.6L-11.2,-63.2L-10.8,-60.2L-12.6,-58.6L-12.8,-55.4Z', ['#5A3420', '#3E2214'], 1.4, [-0.5, -0.5]) + hardHat(d, ['#FFD23D', '#E0A21A'], z, false),
  hairBack: (d, z) => cel(d, backHairD(3, -70), ['#5A3420', '#3E2214'], { off: [-1, -1], hi: 0.8 }) + hardHatBack(d, ['#FFD23D', '#E0A21A'], z),
  face: 'smile',
  zface: 'droopy',
};

// ======================================================= gus (the zombie pitmaster)
LOOKS.gus = {
  skin: ZSK,
  hair: [OUT, OUT],
  brow: OUT,
  height: 96,
  pants: ['#6B4A2F', '#4E3520'],
  shoe: ['#3A2A22', '#22180F'],
  sleeve: 'short',
  sleeveCol: ['#4A4F57', '#34383E'],
  headBox: [-30, -104, 30, -32],
  torso: (d) => {
    const td = torsoD(true, 11.2, 12);
    let s = cel(d, td, ['#4A4F57', '#34383E']);
    s += apron(d, true, true);
    s += rip(d, -8, -38.4, 0.7);
    // tongs in the apron pocket
    s += S('M5,-27.4L6.6,-36.4M6.4,-27.4L8.6,-36', 1.6) + S('M5,-27.4L6.6,-36.4M6.4,-27.4L8.6,-36', 0.7, '#C9D2DC');
    return s;
  },
  torsoBack: (d) => {
    const td = torsoD(true, 11.2, 12);
    let s = cel(d, td, ['#4A4F57', '#34383E']);
    s += d.clip(td, P('M-20,-20.2H20V-10H-20Z', '#6B4A2F') + S('M-20,-20.2H20', 1.1));
    s += fold('M-8,-36q3,1.4 5,0.4M3,-38q3,1.4 6,0', '#34383E', 0.8);
    s += rip(d, 6, -36, 0.8) + stain(-6, -32, 0.7, '#A8432A', 0.7);
    s += apronBack(d, true);
    return s;
  },
  hairFront: (d) => {
    const hat =
      'M-11.6,-67.4L-12.4,-76.4C-21.6,-77.4 -19.4,-92 -8,-88.4C-5,-97.4 10.6,-97.4 12,-88.8C22,-91.6 24.4,-77.6 14.8,-76.4' +
      'L14.2,-67.4Q1.4,-70.8 -11.6,-67.4Z';
    let s = cel(d, hat, ['#FFFFFF', '#D9DDE3'], { off: [-1.4, -1.2], hi: 0 });
    s += S('M-12.2,-73.6Q1.4,-77 14.6,-73.6', 1.1);
    s += S('M-3,-80Q-2,-85 0.4,-88M6,-80Q7.4,-84 6.6,-88', 0.9, '#B9BFC8');
    s += stain(7.6, -71.2, 0.5, '#A8432A', 0.7) + stain(-6, -84, 0.4, '#7CC24A', 0.6);
    return s;
  },
  hairBack: (d) => {
    const hat =
      'M-12.6,-67.4L-13.4,-76.4C-22.6,-77.4 -20.4,-92 -9,-88.4C-6,-97.4 9.6,-97.4 11,-88.8C21,-91.6 23.4,-77.6 13.8,-76.4' +
      'L13.2,-67.4Q0.4,-70.8 -12.6,-67.4Z';
    let s = stitches(-10, -60, -2, -54, 3) + P(ell(8, -58, 2.6, 1.6), '#74B134');
    s += cel(d, hat, ['#FFFFFF', '#D9DDE3'], { off: [-1.4, -1.2], hi: 0 }) + S('M-13.2,-73.6Q0.4,-77 13.6,-73.6', 1.1) + S('M-4,-80Q-3,-85 -0.6,-88M5,-80Q6.4,-84 5.6,-88', 0.9, '#B9BFC8');
    s += stain(-6, -72, 0.6, '#A8432A', 0.6);
    return s;
  },
  face: 'grumpy',
  zface: 'grumpy',
};

