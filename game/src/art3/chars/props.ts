/**
 * Hand props, drawn inside the arm parts (they swing with the arm). Each is a HandItem: `under` is
 * painted before the fist (shafts passing behind the fingers), `over` after it. h = fist centre.
 */
import type { Ctx } from './rig';
import type { HandItem } from './body';
import {
  INK, f, ellD, fill, line, outl, circ, inside, shade, speck, grime, stain, rnd, mix, dk, lt, limb, jag, tone,
  BLOOD, SLIME, SLIME_L, C,
} from './paint';
import type { Tone, Pt } from './paint';

const R = (h: Pt, dx: number, dy: number) => `${f(h[0] + dx)},${f(h[1] + dy)}`;

/** Clipboard held at the side, board hanging below the fist. */
export function clipboard(paper = '#D8D2BC'): HandItem {
  return {
    fist: true,
    box: [-7, -5, 8, 15],
    under: (c, h) => {
      const b = `M${R(h, -5.6, -3)}L${R(h, 5.8, -3)}L${R(h, 6.2, 13)}L${R(h, -5.2, 13)}Z`;
      let s = shade(c.d, b, tone('#8A6A44'), { lw: 1, inner: speck([h[0] - 6, h[1] - 3, h[0] + 7, h[1] + 14], 10, ['#5A4428'], c.seed, 0.2, 0.5, 0.6) });
      if (c.back) return s;
      const p = `M${R(h, -4.4, -1)}L${R(h, 4.8, -1)}L${R(h, 5, 11.8)}L${R(h, -4.2, 11.8)}Z`;
      s += outl(p, paper, 0.5);
      let dd = '';
      for (let i = 0; i < 6; i++) dd += `M${R(h, -3.2, 2 + i * 1.6)}L${R(h, 3.6 - (i % 3), 2 + i * 1.6)}`;
      s += line(dd, 0.35, '#6A6A70');
      s += line(`M${R(h, -3, 9.6)}l1,1l2.4,-2.4`, 0.5, '#7A2A22');
      if (c.z) s += stain(h[0] + 1.6, h[1] + 7, 1.6, BLOOD, c.seed + 2, 0.75) + circ(h[0] - 2, h[1] + 4, 0.6, SLIME, 0.8);
      s += outl(`M${R(h, -2.4, -3.6)}h5.2v2.4h-5.2Z`, '#9A9A96', 0.5);
      return s;
    },
  };
}

export function calculator(): HandItem {
  return {
    fist: true,
    box: [-3, -3, 8, 11],
    over: (c, h) => {
      const b = `M${R(h, -1.4, -1.6)}L${R(h, 6.6, -1.6)}L${R(h, 6.6, 9)}L${R(h, -1.4, 9)}Z`;
      let s = shade(c.d, b, tone('#4A4A44'), { lw: 0.9 });
      if (!c.back) {
        s += outl(`M${R(h, 0, -0.4)}h5.2v2.6h-5.2Z`, '#8A9A6A', 0.4);
        let k = '';
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k += `M${R(h, 0.6 + i * 1.7, 3.4 + j * 1.7)}h0.9v0.9h-0.9Z`;
        s += fill(k, '#B8B2A0');
      }
      return s;
    },
  };
}

export function notepad(): HandItem {
  return {
    fist: true,
    box: [-2, -7.5, 8.5, 5.5],
    over: (c, h) => {
      const b = `M${R(h, -0.6, -6)}L${R(h, 7, -5.4)}L${R(h, 6.6, 4)}L${R(h, -1, 3.4)}Z`;
      let s = shade(c.d, b, tone('#D8CC98'), { lw: 0.9 });
      if (!c.back) {
        s += line(`M${R(h, 0.6, -3.4)}l5,0.4M${R(h, 0.4, -1.6)}l5,0.4M${R(h, 0.4, 0.2)}l3.4,0.3`, 0.4, '#5A5A70');
        s += line(`M${R(h, 0.4, -5.6)}l6.2,0.5`, 1, '#7A2A22');
        if (c.z) s += stain(h[0] + 3, h[1] - 1, 1.4, BLOOD, c.seed + 5, 0.8);
      }
      return s;
    },
  };
}

/** A pencil held in the other hand (critic). */
export function pencil(): HandItem {
  return {
    fist: true,
    box: [-2, -5.5, 4, 10],
    under: (_c, h) => outl(`M${R(h, -1, -4)}L${R(h, 0.6, -4.4)}L${R(h, 2.6, 7)}L${R(h, 1.8, 8.6)}L${R(h, 1, 7.2)}Z`, '#B8963E', 0.6) + fill(`M${R(h, 1.8, 8.6)}L${R(h, 2.3, 7.4)}L${R(h, 1.2, 7.6)}Z`, INK),
  };
}

export function donut(): HandItem {
  return {
    fist: true,
    box: [-2, -4.5, 9, 6.5],
    over: (c, h) => {
      const o = ellD(h[0] + 3.4, h[1] + 1, 4.4, 4);
      let s = shade(c.d, o, tone('#B08A4E'), { lw: 0.9 });
      s += fill(`M${R(h, -0.6, 0.4)}C${R(h, -0.4, -3)} ${R(h, 7, -3.4)} ${R(h, 7.6, 0.4)}C${R(h, 7, 2)} ${R(h, 5, 1)} ${R(h, 3.6, 2.4)}C${R(h, 2, 1.2)} ${R(h, 0.4, 2.2)} ${R(h, -0.6, 0.4)}Z`, '#A0606A');
      s += outl(ellD(h[0] + 3.4, h[1] + 1, 1.3, 1.1), '#5A3A20', 0.6);
      s += line(`M${R(h, 1, -1.4)}l0.8,0.3M${R(h, 4.6, -2)}l0.6,0.6M${R(h, 6, 0)}l0.8,-0.2`, 0.5, '#D8CC98');
      // a bite missing
      s += fill(`M${R(h, 6.6, -2.6)}a1.4,1.4 0 0,0 1.6,2.6a1.2,1.2 0 0,0 0.2,-2.6Z`, '#F0EADC', 'opacity="0"');
      if (c.z) s += fill(ellD(h[0] + 5, h[1] - 1, 1.6, 1.2), SLIME_L, 'opacity="0.8"');
      return s;
    },
  };
}

export function briefcase(): HandItem {
  return {
    fist: true,
    box: [-8.5, -3, 9.5, 13],
    under: (c, h) => {
      const b = `M${R(h, -6, 2.4)}L${R(h, 7, 2.4)}C${R(h, 8, 2.4)} ${R(h, 8, 3.4)} ${R(h, 8, 4)}L${R(h, 8, 11.6)}L${R(h, -7, 11.6)}L${R(h, -7, 4)}C${R(h, -7, 3)} ${R(h, -6.6, 2.4)} ${R(h, -6, 2.4)}Z`;
      let s = line(`M${R(h, -2.4, 2.6)}L${R(h, -2.4, -0.6)}Q${R(h, 0.5, -2.4)} ${R(h, 3.4, -0.6)}L${R(h, 3.4, 2.6)}`, 1.6) + line(`M${R(h, -2.4, 2.6)}L${R(h, -2.4, -0.6)}Q${R(h, 0.5, -2.4)} ${R(h, 3.4, -0.6)}L${R(h, 3.4, 2.6)}`, 0.8, '#4A3020');
      s += shade(c.d, b, tone('#5A3A24'), { lw: 1, inner: line(`M${R(h, -7, 5.6)}H${f(h[0] + 8)}`, 0.5, '#3A2414') + speck([h[0] - 7, h[1] + 2, h[0] + 8, h[1] + 12], 12, ['#3A2414', '#7A5A3A'], c.seed, 0.2, 0.5, 0.6) });
      s += outl(`M${R(h, -0.4, 4.6)}h2v2h-2Z`, '#A88A3A', 0.4);
      if (c.z) s += stain(h[0] - 3, h[1] + 8, 1.6, BLOOD, c.seed + 3, 0.7);
      return s;
    },
  };
}

/** Smartphone held up in the near hand (teen). */
export function phone(): HandItem {
  return {
    fist: true,
    box: [-1, -8.5, 6.5, 3.5],
    over: (c, h) => {
      const b = `M${R(h, 0.4, -7)}L${R(h, 5, -6.4)}L${R(h, 4.6, 2.4)}L${R(h, 0, 1.8)}Z`;
      let s = shade(c.d, b, tone('#2A2A2E'), { lw: 0.9 });
      if (!c.back) s += fill(`M${R(h, 1, -6)}L${R(h, 4.2, -5.6)}L${R(h, 3.9, 0.8)}L${R(h, 0.7, 0.4)}Z`, c.z ? '#5A6A4A' : '#7A9AA0', 'opacity="0.9"') + line(`M${R(h, 1.6, -4)}l2,1.6M${R(h, 1.4, -2)}l1.4,1.2`, 0.4, '#D8E0E0', 'opacity="0.6"');
      if (c.z) s += line(`M${R(h, 1.2, -5)}l2.6,3.4l-1,1.4`, 0.4, '#E0E0D8');
      return s;
    },
  };
}

/** Selfie stick with a phone on top (influencer). */
export function selfieStick(): HandItem {
  return {
    fist: true,
    box: [-1, -30.5, 8.5, 4.5],
    under: (c, h) => {
      let s = line(`M${R(h, 0.4, 3)}L${R(h, 3.6, -22)}`, 1.6) + line(`M${R(h, 0.4, 3)}L${R(h, 3.6, -22)}`, 0.8, '#8A8A86');
      const p = `M${R(h, 0.4, -29)}L${R(h, 7, -28)}L${R(h, 6.6, -20)}L${R(h, 0, -21)}Z`;
      s += shade(c.d, p, tone('#2A2A2E'), { lw: 0.9 });
      if (!c.back) s += fill(`M${R(h, 1.2, -28)}L${R(h, 6.2, -27.2)}L${R(h, 5.8, -21.6)}L${R(h, 0.8, -22.2)}Z`, c.z ? '#5A6A4A' : '#9A8AA0');
      if (c.z) s += line(`M${R(h, 1.4, -27)}l3.6,4.4`, 0.45, '#E0E0D8');
      return s;
    },
  };
}

/** Foam #1 finger (benchwarmer). */
export function foamFinger(col: Tone): HandItem {
  return {
    fist: true,
    box: [-5, -20.5, 7, 5.5],
    over: (c, h) => {
      const p = `M${R(h, -3.4, 4)}L${R(h, -3.6, -4)}C${R(h, -3.6, -6)} ${R(h, -1.6, -6.4)} ${R(h, -0.6, -6)}L${R(h, -0.4, -17)}C${R(h, -0.4, -19)} ${R(h, 2.6, -19)} ${R(h, 2.6, -17)}L${R(h, 2.8, -6.4)}C${R(h, 4.6, -6.6)} ${R(h, 6, -5)} ${R(h, 5.6, -2.6)}L${R(h, 5.2, 4)}Z`;
      let s = shade(c.d, p, col, { lw: 1, inner: grime([h[0] - 4, h[1] - 19, h[0] + 6, h[1] + 4], 3, '#3A3020', c.seed + 2, 2, 0.3) });
      if (!c.back) s += `<text x="${f(h[0] + 0.9)}" y="${f(h[1] + 1.8)}" font-size="4.4" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="${lt(col.b, 0.6)}" stroke="${INK}" stroke-width="0.3">#1</text>`;
      if (c.z) s += rip(h[0] + 1, h[1] - 10, 1.2, 1.6, c);
      return s;
    },
  };
}
function rip(x: number, y: number, rx: number, ry: number, c: Ctx): string {
  return fill(jag(x, y, rx, ry, c.seed + 3), c.sk.b) + line(jag(x, y, rx, ry, c.seed + 3), 0.5);
}

export function axe(): HandItem {
  return {
    fist: true,
    box: [-2.5, -27, 14, 7],
    under: (c, h) => {
      let s = shade(c.d, `M${R(h, -1, 5)}L${R(h, 0.4, 5.4)}L${R(h, 4.4, -21)}L${R(h, 3, -21.4)}Z`, tone('#8A6236'), { lw: 0.9, inner: line(`M${R(h, 0, 2)}L${R(h, 3.4, -18)}`, 0.4, '#5A3A1E') });
      const blade = `M${R(h, 2.6, -20)}C${R(h, 6, -22)} ${R(h, 10, -24)} ${R(h, 12, -25)}C${R(h, 12.6, -21)} ${R(h, 12, -16)} ${R(h, 10.6, -13)}C${R(h, 8, -14.6)} ${R(h, 5, -15.4)} ${R(h, 3.4, -15.6)}Z`;
      s += shade(c.d, blade, C.chrome, { lw: 1, inner: fill(`M${R(h, 9, -24)}L${R(h, 12.4, -25)}L${R(h, 11, -13)}L${R(h, 9.6, -14)}Z`, '#D0D4CC', 'opacity="0.7"') + speck([h[0] + 2, h[1] - 26, h[0] + 13, h[1] - 12], 10, ['#6A4A2A'], c.seed, 0.3, 0.7, 0.7) });
      if (c.z) s += stain(h[0] + 9, h[1] - 19, 1.8, BLOOD, c.seed + 4, 0.85) + fill(`M${R(h, 10.4, -14)}l0.6,3l0.6,-2.6Z`, BLOOD);
      return s;
    },
  };
}

export function pompom(col: Tone): HandItem {
  return {
    fist: true,
    box: [-8.5, -7.5, 8.5, 9.5],
    over: (c, h) => {
      const r = rnd(c.seed + (c.side > 0 ? 3 : 7));
      let s = '';
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + r() * 0.3;
        const L = 5.4 + r() * 1.6;
        s += line(`M${R(h, 0, 1)}L${R(h, Math.cos(a) * L, 1 + Math.sin(a) * L)}`, 1.6, INK) ;
      }
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + r() * 0.3;
        const L = 5 + r() * 1.4;
        s += line(`M${R(h, 0, 1)}L${R(h, Math.cos(a) * L, 1 + Math.sin(a) * L)}`, 1, k % 2 ? col.b : col.s);
      }
      if (c.z) s += circ(h[0] + 2, h[1] + 2, 1.4, BLOOD, 0.7);
      return s;
    },
  };
}

export function cane(): HandItem {
  return {
    fist: true,
    box: [-5, -5, 5, 24],
    under: (_c, h) => {
      const d = `M${R(h, -3.6, 0)}C${R(h, -3.6, -4.4)} ${R(h, 3.6, -4.4)} ${R(h, 3.4, 0)}L${R(h, 3, 22)}`;
      return line(d, 2.4) + line(d, 1.3, '#7A5434') + line(`M${R(h, 2.4, 20)}h1.4`, 2, '#2A2420');
    },
  };
}

export function cocktail(): HandItem {
  return {
    fist: true,
    box: [-3.5, -13.5, 7.5, 1],
    over: (c, h) => {
      let s = fill(`M${R(h, -2, -10)}L${R(h, 6, -10)}L${R(h, 2, -5.4)}Z`, c.z ? '#6A8A3A' : '#B8B070', 'opacity="0.75"') + line(`M${R(h, -2, -10)}L${R(h, 6, -10)}L${R(h, 2, -5.4)}Z`, 0.7);
      s += line(`M${R(h, 2, -5.4)}V${f(h[1] - 1)}`, 0.8) + line(`M${R(h, 3.6, -11.6)}l-1,3`, 0.5) + outl(ellD(h[0] + 3.4, h[1] - 11.2, 1, 1), '#6A7A2A', 0.4);
      return s;
    },
  };
}

export function stopSign(): HandItem {
  return {
    fist: true,
    box: [-6, -27, 10, 5.5],
    under: (c, h) => {
      let s = line(`M${R(h, 0.6, 4)}L${R(h, 1.6, -14)}`, 1.8) + line(`M${R(h, 0.6, 4)}L${R(h, 1.6, -14)}`, 0.9, '#8A8A86');
      const pts: string[] = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
        pts.push(`${f(h[0] + 1.8 + Math.cos(a) * 6.4)},${f(h[1] - 19 + Math.sin(a) * 6.4)}`);
      }
      const o = 'M' + pts.join('L') + 'Z';
      s += shade(c.d, o, tone('#8A2A26'), { lw: 1, inner: grime([h[0] - 6, h[1] - 26, h[0] + 9, h[1] - 12], 3, '#3A2010', c.seed, 2, 0.3) });
      if (!c.back) s += `<text x="${f(h[0] + 1.8)}" y="${f(h[1] - 17.6)}" font-size="3.6" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#D8D2BC">STOP</text>`;
      return s;
    },
  };
}

export function coffeeCup(): HandItem {
  return {
    fist: true,
    box: [-3.5, -10, 8, 4.5],
    over: (c, h) => {
      const cup = `M${R(h, -1.6, -7)}L${R(h, 6.4, -7)}L${R(h, 5.6, 3)}L${R(h, -0.8, 3)}Z`;
      let s = shade(c.d, cup, tone('#C8BCA0'), { lw: 0.9 });
      s += fill(`M${R(h, -1.2, -3)}L${R(h, 6, -3)}L${R(h, 5.7, 0.4)}L${R(h, -0.9, 0.4)}Z`, '#6A4A30') + outl(`M${R(h, -2.2, -8.6)}h9.2v1.8h-9.2Z`, '#3A3430', 0.6);
      if (c.z) s += stain(h[0] + 2, h[1] - 5, 1.2, SLIME, c.seed + 2, 0.8);
      return s;
    },
  };
}

export function yogaMat(col: Tone): HandItem {
  return {
    fist: true,
    box: [-7, -16, 6, 18],
    under: (c, h) => {
      const m = limb([h[0] - 3, h[1] - 12], [h[0] + 1.6, h[1] + 14], 6, 6);
      let s = shade(c.d, m, col, { lw: 1, inner: line(`M${R(h, -2.6, -8)}L${R(h, 1.6, 12)}`, 0.5, col.d) });
      s += outl(ellD(h[0] - 3, h[1] - 12, 3, 2.2), col.s, 0.8) + line(`M${R(h, -4.4, -12)}a1.4,1 0 1,1 2.8,0`, 0.5, col.d);
      return s;
    },
  };
}

export function purse(col: Tone): HandItem {
  return {
    fist: true,
    box: [-8, -4, 9, 14.5],
    under: (c, h) => {
      let s = line(`M${R(h, -3, 6)}Q${R(h, 0, -3)} ${R(h, 4, 6)}`, 1.6) + line(`M${R(h, -3, 6)}Q${R(h, 0, -3)} ${R(h, 4, 6)}`, 0.8, col.s);
      s += shade(c.d, `M${R(h, -5.6, 5)}L${R(h, 6.6, 5)}L${R(h, 7.6, 13)}L${R(h, -6.4, 13)}Z`, col, { lw: 1, inner: line(`M${R(h, -5.6, 7.4)}L${R(h, 6.8, 7.4)}`, 0.5, col.d) + grime([h[0] - 6, h[1] + 5, h[0] + 8, h[1] + 13], 2, '#3A3020', c.seed, 2, 0.3) });
      s += outl(ellD(h[0] + 0.6, h[1] + 7.4, 0.9, 0.9), '#A88A3A', 0.4);
      return s;
    },
  };
}

export function microphone(): HandItem {
  return {
    fist: true,
    box: [-2, -14.5, 5.5, 1],
    over: (c, h) => {
      let s = shade(c.d, `M${R(h, -0.6, -1)}L${R(h, 2.6, -1.4)}L${R(h, 3.2, -9)}L${R(h, 0.4, -8.6)}Z`, tone('#3A3A3A'), { lw: 0.8 });
      s += shade(c.d, ellD(h[0] + 1.8, h[1] - 10.8, 2.6, 2.6), C.chrome, { lw: 0.9, inner: line(`M${R(h, -0.8, -10.8)}h5.2M${R(h, 1.8, -13.4)}v5.2`, 0.35, '#5A5A5A') });
      return s;
    },
  };
}

export function spatula(): HandItem {
  return {
    fist: true,
    box: [-3, -20.5, 6, 5.5],
    under: (c, h) => {
      let s = shade(c.d, `M${R(h, -0.8, 4)}L${R(h, 0.8, 4.2)}L${R(h, 2.2, -12)}L${R(h, 0.8, -12.2)}Z`, tone('#3A3028'), { lw: 0.8 });
      const b = `M${R(h, -0.6, -11.6)}L${R(h, 4, -12)}L${R(h, 4.6, -19)}L${R(h, -1.8, -18.6)}Z`;
      s += shade(c.d, b, C.chrome, { lw: 0.9, inner: line(`M${R(h, 0.4, -17.6)}l0.4,4.8M${R(h, 2.2, -17.8)}l0.2,4.8`, 0.5, '#5A5A58') + grime([h[0] - 2, h[1] - 20, h[0] + 5, h[1] - 11], 3, '#5A3A1A', c.seed + 2, 1.4, 0.5) });
      if (c.z) s += stain(h[0] + 1.6, h[1] - 16, 1.2, BLOOD, c.seed, 0.8);
      return s;
    },
  };
}

export function hammer(): HandItem {
  return {
    fist: true,
    box: [-3, -22, 9, 6],
    under: (c, h) => {
      let s = shade(c.d, `M${R(h, -0.9, 5)}L${R(h, 0.9, 5.2)}L${R(h, 2.4, -15)}L${R(h, 0.6, -15.2)}Z`, tone('#8A6236'), { lw: 0.85 });
      s += shade(c.d, `M${R(h, -1.6, -14)}L${R(h, 6.6, -13.2)}L${R(h, 6.4, -17.6)}L${R(h, -1.4, -18.6)}Q${R(h, -3.6, -19.4)} ${R(h, -2.4, -16.4)}Z`, tone('#6A6A68'), { lw: 0.9, inner: line(`M${R(h, 5, -17.4)}l0.2,4`, 0.4, '#3A3A38') });
      return s;
    },
  };
}

export function newspaper(): HandItem {
  return {
    fist: true,
    box: [-4, -4, 7, 14],
    under: (c, h) => {
      const p = `M${R(h, -2.6, -2.6)}L${R(h, 3.4, -2.8)}L${R(h, 4.6, 12.4)}L${R(h, -1.6, 12.8)}Z`;
      let s = shade(c.d, p, tone('#C8C2AC'), { lw: 0.9, inner: line(`M${R(h, -1.4, 4)}l5,-0.2M${R(h, -1.2, 6)}l5,-0.2M${R(h, -1, 8)}l5,-0.2M${R(h, -0.8, 10)}l5,-0.2`, 0.4, '#6A6A64') + fill(`M${R(h, -1.6, 0)}L${R(h, 3.6, -0.2)}L${R(h, 3.8, 2.6)}L${R(h, -1.4, 2.8)}Z`, '#4A4A44', 'opacity="0.7"') });
      if (c.z) s += stain(h[0] + 1, h[1] + 8, 1.4, BLOOD, c.seed + 2, 0.7);
      return s;
    },
  };
}

export function syringe(): HandItem {
  return {
    fist: true,
    box: [-3, -4, 18, 5],
    over: (c, h) => {
      const body = `M${R(h, 0, -1.6)}L${R(h, 11, -1.6)}L${R(h, 11, 1.6)}L${R(h, 0, 1.6)}Z`;
      let s = line(`M${R(h, -2, 0)}h2`, 1.6) + outl(`M${R(h, -2.6, -2.2)}h1v4.4h-1Z`, '#A8ACA8', 0.5);
      s += fill(`M${R(h, 3, -1.2)}L${R(h, 10.6, -1.2)}L${R(h, 10.6, 1.2)}L${R(h, 3, 1.2)}Z`, c.z ? SLIME : '#8AAA4A', 'opacity="0.85"');
      s += line(body, 0.8) + fill(body, '#E0E4DC', 'opacity="0.3"');
      s += line(`M${R(h, 4, -1.6)}v1M${R(h, 6, -1.6)}v1M${R(h, 8, -1.6)}v1`, 0.35);
      s += line(`M${R(h, 11, 0)}h5.4`, 0.8) + line(`M${R(h, 11, 0)}h5.4`, 0.4, '#C8CCC8');
      return s;
    },
  };
}

export { BLOOD, SLIME, mix, dk, inside };
