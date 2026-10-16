/**
 * Extra dishes (32x24 plates, anchor at the plate center like the originals in props.ts) and FX icons
 * (~24x24, anchor bottom-center 0.5/1).
 */
import type { ArtAsset } from './types';
import { Doc, OUT, P, S, capsule, ell, f, hl, poly, rrect, zigzag } from './svg';
import { GOO, GOO_D, T, asset, blobs, circle, dish, fly } from './propkit';

function flame(x: number, y: number, s: number): string {
  return (
    `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">` +
    P('M0,0C-3,0 -3.6,-3 -2.2,-5C-1.8,-3.8 -1,-3.6 -0.6,-4C-1.2,-6.4 0,-8.6 1.6,-10C1.4,-8 2.4,-7 3,-6.4C3.8,-4.6 3.4,0 0,0Z', '#FF8A1F', 0.9) +
    P('M0.2,-0.8C-1.4,-0.8 -1.6,-2.4 -0.8,-3.4C-0.4,-2.8 0.2,-2.8 0.4,-3.2C0.4,-4.4 1,-5.2 1.6,-5.6C1.8,-4.4 2.4,-3.6 2.4,-2.8C2.4,-1.6 1.6,-0.8 0.2,-0.8Z', '#FFE14D') +
    `</g>`
  );
}

function ring(d: Doc, x: number, y: number, rx: number, ry: number, rot = 0): string {
  const path = ell(x, y, rx, ry) + ell(x, y + 0.3, rx * 0.5, ry * 0.42);
  return (
    `<g transform="rotate(${rot} ${f(x)} ${f(y)})">` +
    P(ell(x, y, rx, ry), '#B0702A', 1.1) +
    `<path d="${path}" fill-rule="evenodd" fill="#E8A64A"/>` +
    d.clip(ell(x, y, rx, ry), P(ell(x + 1, y + 1.4, rx, ry), '#C8822F', 0, OUT, 'opacity="0.6"')) +
    `<path d="${path}" fill-rule="evenodd" fill="none" stroke="${OUT}" stroke-width="1.1"/>` +
    S(ell(x, y, rx * 0.76, ry * 0.72), 0.7, '#FFD27A', 'stroke-dasharray="1 1.4"') +
    `</g>`
  );
}

function brainBlob(d: Doc, x: number, y: number, s: number, base: string, shadow: string, line: string): string {
  return (
    `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">` +
    d.shaded('M-4.6,0.4C-5.6,-2 -3.4,-4 -1.6,-3.4C-0.6,-5 2.6,-4.8 3.4,-3C5.2,-2.8 5.8,-0.6 4.6,0.6C5,2.4 3,3.4 1.6,2.8C0.6,3.8 -1.8,3.6 -2.4,2.6C-4,2.8 -5.2,1.6 -4.6,0.4Z', base, shadow, 1.1, [-0.6, -0.6]) +
    S('M-3,0.2q1.4,-1 2.6,0t2.4,-0.4M-0.6,-3q0.2,1.4 1.4,1.6M-2,1.8q1.2,0.4 2.2,-0.4', 0.6, line) +
    `</g>`
  );
}

function dishes(): ArtAsset[] {
  const out: ArtAsset[] = [];
  // onion rings of fire
  out.push(
    dish('dish_rings', (d) =>
      ring(d, 10.6, 13.4, 6.6, 3.6, -8) + ring(d, 21, 13.6, 6.4, 3.4, 10) + ring(d, 15.6, 8.6, 6.8, 4.2, -18) +
      flame(13.2, 9.4, 0.62) + flame(17.8, 8.6, 0.5) + flame(24.6, 12.6, 0.42) + flame(7.4, 12.6, 0.4) +
      circle(27, 6, 0.6, '#FFC23D') + circle(5, 7.4, 0.5, '#FF8A1F'),
    ),
  );
  // deep-fried brain nuggets + slime dip
  out.push(
    dish('dish_nuggets', (d) =>
      P(ell(23.6, 14.8, 4.4, 2), '#E8E2D6', 0.9) + P('M19.2,14.8V16.4Q23.6,18.8 28,16.4V14.8Z', '#E8E2D6', 0.9) + P(ell(23.6, 14.8, 3.6, 1.5), GOO) + hl(22.4, 14.4, 1.2, 0.4, 0, 0.7) +
      brainBlob(d, 9.4, 13.6, 1, '#D9973A', '#A8662A', '#8A4E1A') + brainBlob(d, 15.4, 15, 0.95, '#E0A44A', '#B0702A', '#8A4E1A') +
      brainBlob(d, 12.4, 8.6, 0.95, '#E0A44A', '#B0702A', '#8A4E1A') + brainBlob(d, 18.6, 9.6, 0.85, '#D9973A', '#A8662A', '#8A4E1A') +
      circle(7, 17, 0.5, '#E0A44A') + circle(20.4, 17.4, 0.4, '#E0A44A'),
    ),
  );
  // chili con carnage (an eyeball looks back at you)
  out.push(
    dish('dish_chili', (d) => {
      let s = P('M5.6,10.4Q6.4,17.6 16,17.6Q25.6,17.6 26.4,10.4Z', '#C62F2F', 1.2);
      s += d.clip('M5.6,10.4Q6.4,17.6 16,17.6Q25.6,17.6 26.4,10.4Z', P(ell(22, 15, 9, 6), '#9E1F28')) + S('M7.2,13.4Q16,16.4 24.8,13.4', 0.8, '#FFF4DC');
      s += P(ell(16, 10.4, 10.6, 3.6), '#E2343B', 1.2) + P(ell(16, 10.6, 9.2, 2.8), '#8A2A14');
      s += P(ell(14, 10, 1.4, 0.8), '#5A1A0A') + P(ell(18.4, 11.2, 1.2, 0.7), '#5A1A0A') + P(ell(10.6, 10.8, 1.1, 0.6), '#B8541E');
      s += S('M12,9.4l2,0.6M19.4,9.4l1.6,0.8M15.6,11.6l2,-0.4M9.6,9.8l1.2,0.6', 0.7, '#FFD23D');
      s += P(ell(20.6, 9.4, 2.4, 1.8), '#FFFFFF', 0.8) + circle(21.4, 9.2, 1, '#5DB548') + circle(21.6, 9.1, 0.45, OUT) + S('M18.6,9.8q0.6,0.4 0.6,1.2', 0.4, '#E2343B');
      s += S('M12,6.6q-1.4,-1.6 0,-3t0,-2.6M17,6q-1.4,-1.6 0,-3', 0.8, '#FFFFFF', 'opacity="0.75"');
      return s;
    }),
  );
  // smash burger: lacy crispy patty, melty cheese, flag
  out.push(
    dish('dish_smash', (d) => {
      let s = P('M7.4,14.6Q7.4,17.2 16,17.2Q24.6,17.2 24.6,14.6Z', '#E09A3D', 1.1);
      const lace = poly(zigzag([4.6, 13], [27.4, 13], 9, 1.2).concat(zigzag([27.4, 11], [4.6, 11], 9, 1.2)));
      s += P(lace, '#6B3418', 0.9) + S('M6,12h20', 0.6, '#9A5A24');
      s += P('M7,10.8H25L23.6,13.6L21.4,11.6L19.6,14.4L17.4,11.6L15.4,14L13.4,11.6L11,13.8L9,11.6Z', '#FFC83D', 0.8);
      s += d.shaded('M8.4,10.8Q8.4,3.6 16,3.6Q23.6,3.6 23.6,10.8Z', '#E8A64A', '#C2802A', 1.2, [-0.8, -0.8]);
      s += S('M12,6.4h1.1M15.6,5.2h1.1M19.4,6.8h1.1M13.6,8.6h1.1M18,8.8h1.1', 0.9, '#FFF4DC') + hl(12.4, 5.4, 2.2, 0.8, -12, 0.45);
      s += S('M17,4.6V1.2', 1.6) + S('M17,4.6V1.2', 0.7, '#E9C28E') + P('M17.2,1.2l4.6,1.1l-4.6,1.3z', '#39E07A', 0.6);
      return s;
    }),
  );
  // kale salad (nobody ordered it; a worm did)
  out.push(
    dish('dish_salad', (d) => {
      let s = blobs(d, [[9, 12.6, 3.6], [13, 9.6, 4], [18, 9, 4.2], [22.6, 11.6, 3.8], [15.6, 13.4, 3.8], [11, 14.6, 2.8], [20.6, 14.4, 3]], '#4E9A3A', '#2F6B24', 1.1, [-0.8, -0.8]);
      s += S('M10,11q1.4,-1 2.6,0t2.4,0M16,8q1.4,-1 2.6,0t2.4,0M18.6,12.6q1.4,-1 2.6,0M12,13.6q1.6,-0.8 3,0', 0.7, '#7CC860');
      s += P(ell(12.4, 11.4, 1.8), '#E2343B', 0.8) + hl(11.8, 10.8, 0.6, 0.4, 0, 0.8) + P(ell(21, 10.4, 1.6), '#E2343B', 0.8) + hl(20.5, 9.9, 0.5, 0.35, 0, 0.8);
      s += P(rrect(15.4, 11.2, 2.8, 2.4, 0.6), '#E8C07A', 0.6);
      s += S('M23.6,14.6q1.4,-2.6 3,-1.4q1.2,1 0,2.4', 2.2, OUT) + S('M23.6,14.6q1.4,-2.6 3,-1.4q1.2,1 0,2.4', 1.2, '#F7A8C0') + circle(26.2, 12.8, 0.35, OUT);
      return s;
    }),
  );
  // fried chicken bucket
  out.push(
    dish('dish_chicken', (d) => {
      let s = '';
      const stick = (x1: number, y1: number, x2: number, y2: number) =>
        P(capsule([x1, y1], [x2, y2], 1.6), '#FFF4DC', 0.7) + P(ell(x2, y2, 1.4), '#FFF4DC', 0.7) + d.shaded(ell(x1, y1, 3.4, 2.8), '#D9842A', '#A85A1A', 1, [-0.5, -0.5]);
      s += stick(12.6, 6.4, 10.6, 2.4) + stick(19, 5.8, 21.6, 2) + stick(15.8, 5, 16, 1.8);
      const bucket = 'M8.6,6.4H23.4L21.6,17H10.4Z';
      s += P(bucket, '#FFFFFF', 1.2);
      s += d.clip(bucket, P('M10,6H12.4L12.6,18H10.6Z', '#E2343B') + P('M14.6,6H17.2L17.2,18H14.8Z', '#E2343B') + P('M19.6,6H22L21,18H19Z', '#E2343B'));
      s += P(ell(16, 11.6, 3.2), '#FFF4DC', 0.8) + T(16, 13.2, 4.4, '#5DB548', 'Z');
      s += P(rrect(8, 5.6, 16, 2, 0.8), '#F4F1EA', 1);
      s += circle(7, 16.6, 0.6, '#D9842A') + circle(25, 17, 0.5, '#D9842A');
      return s;
    }),
  );
  // fancy foie gross: a lonely puck, a drizzle, a fly that also has standards
  out.push(
    dish('dish_foie', (d) => {
      let s = S('M6,15.4l2,-2l2,2.4l2,-2.4l2,2.4l2,-2.4l2,2.4l2,-2.4l2,2.4l2,-2.2', 0.9, '#5A1A3A');
      s += circle(8, 12.4, 0.7, '#7CC24A') + circle(24.6, 12.6, 0.6, '#7CC24A') + circle(22.4, 16.6, 0.5, '#7CC24A');
      s += P('M11,11.4V8Q16,6.4 21,8V11.4Q16,13.4 11,11.4Z', '#B79A8A', 1.1);
      s += d.clip('M11,11.4V8Q16,6.4 21,8V11.4Q16,13.4 11,11.4Z', P(ell(20, 11, 3, 4), '#9C7E70'));
      s += P(ell(16, 8, 5, 1.6), '#D4B0A0', 1) + P(ell(15, 7.8, 2.4, 0.7), '#A8C870', 0, OUT, 'opacity="0.8"');
      s += S('M16,7.6l-1.6,-3.4M16,7.6l1,-3.6M16,7.6l2.6,-2.6', 0.7, '#3E8A35') + circle(14.4, 4.2, 0.9, '#5DB548') + circle(17, 4, 0.9, '#5DB548') + circle(18.6, 5, 0.8, '#7CC24A');
      s += P('M19,8.4l1,-0.4l0.4,0.8l-1,0.4z', '#FFD23D');
      s += fly(25, 5, 0.75) + S('M22,6.6q-1,1 0.4,1.6', 0.4, OUT, 'stroke-dasharray="0.6 0.8" opacity="0.6"');
      return s;
    }),
  );
  return out;
}

function fx(): ArtAsset[] {
  const out: ArtAsset[] = [];
  out.push(
    asset('fx_cashbag', 26, 28, 0.5, 1, (d) => {
      let s = P('M15,5.4l4,-4.4l2.4,2l-4.6,4z', '#7CC860', 0.8) + S('M16.6,3.6l2,1.6', 0.5, '#3E8A35');
      s += d.shaded('M8.6,9C3,13 1.8,20 4.4,23.6C6.4,26.4 19.6,26.4 21.6,23.6C24.2,20 23,13 17.4,9Z', '#D9B27A', '#B08A50', 1.6, [-1.4, -1.2]);
      s += P('M8,8.6Q6.6,4.6 9.6,4.4Q11,2.4 13,4Q15,2.4 16.4,4.4Q19.4,4.6 18,8.6Z', '#D9B27A', 1.4);
      s += P(rrect(7.4, 7.8, 11.2, 2.8, 1.2), '#8A5530', 1.1);
      s += T(13, 22.4, 11, '#2E8B3A', '$', `stroke="${OUT}" stroke-width="0.9" paint-order="stroke"`);
      s += S('M5.6,15.6q-1,3 0,5M19,24l1,-1.6', 0.8, '#B08A50') + hl(7.6, 14.4, 1.4, 2.4, 20, 0.5);
      return s;
    }),
  );
  out.push(
    asset('fx_goo_splat', 28, 22, 0.5, 1, (d) => {
      let s = blobs(d, [[14, 12, 6], [8.4, 12.6, 3.8], [19.8, 11, 4.2], [13.6, 6.8, 3.6], [10.6, 16.4, 3], [18.4, 16, 3.4], [4.6, 9.6, 1.8], [23.6, 15.4, 2]], GOO, GOO_D, 1.4, [-1, -1]);
      s += P(ell(14, 12, 4.6, 3.2), '#7CF0A8') + hl(11.6, 10.4, 1.6, 0.8, -20, 0.8);
      s += P(ell(3, 4.6, 1.6, 1.2), GOO, 0.8) + P(ell(25, 5, 1.3, 1), GOO, 0.8) + P(ell(24.4, 19.6, 1.4, 1.1), GOO, 0.8) + P(ell(4, 19.4, 1, 0.8), GOO, 0.8);
      s += P('M14,19.4q-1.4,1.4 0,2.2q1.4,-0.6 0,-2.2z', GOO, 0.7);
      return s;
    }),
  );
  out.push(
    asset('fx_heart', 24, 22, 0.5, 1, (d) => {
      let s = d.shaded('M12,20.6C6,16 1.8,12.4 1.8,7.6C1.8,4.2 4.4,1.8 7.2,1.8C9.4,1.8 11,3 12,4.8C13,3 14.6,1.8 16.8,1.8C19.6,1.8 22.2,4.2 22.2,7.6C22.2,12.4 18,16 12,20.6Z', '#FF4A6A', '#D92A4A', 1.6, [-1.2, -1.2]);
      s += hl(6.6, 6, 2.4, 1.2, -35, 0.8);
      s += S('M14.6,5.6l3,6.4', 0.8, '#8E1B2E') + S('M15,7.4l1.6,-0.8M15.8,9.2l1.6,-0.8M16.6,11l1.6,-0.8', 0.6, '#8E1B2E');
      return s;
    }),
  );
  out.push(
    asset('fx_lock', 22, 26, 0.5, 1, (d) => {
      let s = S('M6.4,12V8.4a4.6,4.6 0 0 1 9.2,0V12', 4.6, OUT) + S('M6.4,12V8.4a4.6,4.6 0 0 1 9.2,0V12', 2.6, '#B9C0C8') + S('M7.4,11V8.6a3.6,3.6 0 0 1 3,-3.4', 0.8, '#F7F9FB');
      s += d.shaded(rrect(2.4, 11, 17.2, 13.6, 2.6), '#FFC83D', '#D9971A', 1.6, [-1.2, -1.2]);
      s += P(ell(11, 16.2, 2), OUT) + P('M10,17h2l0.6,4h-3.2z', OUT);
      s += hl(5.6, 13.6, 1.6, 0.7, 0, 0.8, '#FFF0A8');
      return s;
    }),
  );
  return out;
}

export function extraDishes(): ArtAsset[] {
  return dishes();
}

export function extraFx(): ArtAsset[] {
  return fx();
}
