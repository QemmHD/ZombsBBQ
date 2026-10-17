// App icons for the home screen / PWA install: a grimy zombie-BBQ logo drawn as SVG (v3 style: muted,
// dirty, warm-black ink, yellow pupil-less zombie eyes, small neon-green accents), rasterized at build
// into public/icons/ (generated, not committed) with the web app manifest next to the page.
//   node tools/icons.mjs [outDir=public]        writes icons/ + manifest.webmanifest (Vite copies them into dist)
//   node tools/icons.mjs --svg file.svg          just the SVG (for art review)
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const INK = '#16120C';
const f = (v) => (Math.round(v * 10) / 10).toString();

// deterministic noise so every build draws the same grime
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function grime(n, x0, y0, w, h, col, op) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * w;
    const y = y0 + rnd() * h;
    const r = 1.5 + rnd() * 5;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * (0.7 + rnd()))}" ry="${f(r)}" fill="${col}" opacity="${f(op * (0.4 + rnd() * 0.6))}"/>`;
  }
  return s;
}

/** The logo art in a 512 box (everything important inside the central 80% circle, for maskable icons). */
function art() {
  seed = 7;
  let s = '';
  // ----- grill flames licking up behind the head
  const flame = (cx, h, w, c1, c2) =>
    `<path d="M${f(cx - w)},470C${f(cx - w)},${f(470 - h * 0.45)} ${f(cx - w * 0.2)},${f(470 - h * 0.55)} ${f(cx)},${f(470 - h)}C${f(cx + w * 0.15)},${f(470 - h * 0.6)} ${f(cx + w)},${f(470 - h * 0.5)} ${f(cx + w)},470Z" fill="${c1}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>` +
    `<path d="M${f(cx - w * 0.5)},470C${f(cx - w * 0.5)},${f(470 - h * 0.3)} ${f(cx - w * 0.1)},${f(470 - h * 0.35)} ${f(cx)},${f(470 - h * 0.62)}C${f(cx + w * 0.1)},${f(470 - h * 0.38)} ${f(cx + w * 0.5)},${f(470 - h * 0.3)} ${f(cx + w * 0.5)},470Z" fill="${c2}"/>`;
  s += flame(130, 150, 46, '#C4521E', '#E9B23C') + flame(382, 165, 48, '#C4521E', '#E9B23C') + flame(205, 120, 38, '#B0471B', '#DFA035') + flame(310, 128, 40, '#B0471B', '#DFA035');
  // ----- the grill grate (sooty steel)
  s += `<path d="M70,405H442L420,470H92Z" fill="#2B2824" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`;
  for (const y of [420, 440, 458]) s += `<path d="M${f(80 + (y - 405) * 0.35)},${y}H${f(432 - (y - 405) * 0.35)}" stroke="#6E6A62" stroke-width="5" stroke-linecap="round"/>`;
  for (let x = 110; x <= 400; x += 48) s += `<path d="M${x},408V466" stroke="#4A4640" stroke-width="5"/>`;
  s += `<path d="M78,408H434" stroke="#8C877C" stroke-width="3" opacity="0.7"/>`;
  // ----- the head: lumpy, lopsided, mixed greens
  const head =
    'M150,250C138,190 160,140 210,128C238,110 290,112 318,128C366,140 392,186 382,240C392,268 386,312 366,340C350,372 312,392 262,394C210,396 168,380 150,350C130,322 140,282 150,250Z';
  s += `<defs><radialGradient id="hd" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#9BC955"/><stop offset="0.55" stop-color="#88BB44"/><stop offset="1" stop-color="#55AA66"/></radialGradient>` +
    `<clipPath id="hc"><path d="${head}"/></clipPath></defs>`;
  s += `<path d="${head}" fill="url(#hd)"/>`;
  // cel shadow on the right and underside, plus rot patches and grime
  s += `<g clip-path="url(#hc)"><path d="M300,120C380,150 400,250 372,330C350,380 300,400 230,398C320,370 352,300 340,220C334,170 318,140 300,120Z" fill="#427E40" opacity="0.85"/>` +
    `<path d="M150,330C190,372 250,384 330,372L330,410H140Z" fill="#427E40" opacity="0.6"/>` +
    `<ellipse cx="190" cy="170" rx="26" ry="16" fill="#55AA66" opacity="0.8"/><ellipse cx="350" cy="300" rx="18" ry="26" fill="#254424" opacity="0.35"/>` +
    grime(70, 140, 120, 250, 280, '#254424', 0.35) +
    `</g>`;
  s += `<path d="${head}" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>`;
  // ears
  s += `<path d="M152,268C126,262 122,300 150,306" fill="#6FA24A" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`;
  s += `<path d="M380,252C406,246 410,282 382,292" fill="#4F8A44" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`;
  // forehead stitches
  s += `<path d="M196,190C230,176 268,178 300,186" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  for (const [x, y] of [[208, 185], [232, 179], [256, 178], [280, 181]]) s += `<path d="M${x - 3},${y - 10}L${x + 3},${y + 10}" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;
  // eyes: mismatched, yellow, no pupils, heavy sardonic lids
  const eye = (id, cx, cy, rx, ry, lid) => {
    const e = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`;
    const lidLine = `M${cx - rx - 4},${cy - ry * 0.05 + lid}C${cx - rx * 0.4},${cy - ry * 0.35 + lid} ${cx + rx * 0.4},${cy - ry * 0.4 + lid} ${cx + rx + 4},${cy - ry * 0.25 + lid}`;
    return (
      `<clipPath id="${id}">${e}/></clipPath>` +
      `${e} fill="#DECC54"/>` +
      `<ellipse cx="${cx - rx * 0.35}" cy="${cy + ry * 0.3}" rx="${rx * 0.22}" ry="${ry * 0.14}" fill="#F2E8A0" opacity="0.8"/>` +
      `<g clip-path="url(#${id})"><path d="${lidLine}L${cx + rx + 4},${cy - ry - 6}L${cx - rx - 4},${cy - ry - 6}Z" fill="#5E8F3E"/></g>` +
      `<path d="${lidLine}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
      `${e} fill="none" stroke="${INK}" stroke-width="7"/>`
    );
  };
  s += eye('eyeL', 212, 248, 40, 36, 2) + eye('eyeR', 312, 240, 29, 26, 6);
  // bags under the eyes
  s += `<path d="M180,292C198,302 226,302 244,292M292,272C304,280 320,280 334,272" fill="none" stroke="#2F5A2E" stroke-width="4" stroke-linecap="round"/>`;
  // nose holes
  s += `<path d="M256,282l-7,14M272,282l3,14" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  // ----- the chef's toque, stained and slumped to one side
  s += `<path d="M178,150C150,120 160,70 204,74C214,40 266,30 290,60C326,40 372,70 356,112C376,126 368,156 346,160C300,140 230,138 178,150Z" fill="#DAD6C8" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>`;
  s += `<path d="M178,150C230,136 300,138 346,160L340,182C296,164 232,162 184,172Z" fill="#C9C3B0" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`;
  s += `<path d="M236,82C244,104 250,120 252,140M296,74C300,98 304,118 302,140" fill="none" stroke="#A8A08A" stroke-width="4" stroke-linecap="round"/>`;
  s += `<ellipse cx="318" cy="104" rx="16" ry="10" fill="#8C6A3A" opacity="0.55"/><ellipse cx="214" cy="118" rx="9" ry="6" fill="#6B2E14" opacity="0.5"/>`;
  // ----- the grin, clamped on a sauced rib
  s += `<path d="M190,330C220,352 300,352 338,322C340,346 312,372 266,374C222,376 196,358 190,330Z" fill="#3A1410" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`;
  // the rib: bone knobs either side, glazed meat in the middle
  s += `<g transform="rotate(-9 262 338)">`;
  s += `<path d="M118,326C104,316 104,348 118,342C112,354 132,360 136,344L150,340L146,326Z" fill="#E6DCC2" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  s += `<path d="M406,324C420,314 422,346 408,340C414,352 394,358 390,342L376,338L380,324Z" fill="#E6DCC2" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  s += `<rect x="142" y="314" width="240" height="42" rx="18" fill="#7A3518" stroke="${INK}" stroke-width="8"/>`;
  s += `<path d="M156,326C200,318 260,322 366,320" stroke="#A8542A" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  for (const x of [176, 214, 252, 290, 328]) s += `<path d="M${x},318l10,34" stroke="#4A1A0C" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path d="M168,350c4,10 10,12 12,22" stroke="#5A2210" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  s += `</g>`;
  // crooked upper teeth biting down into the rib
  for (const [x, y, w, h] of [[206, 318, 14, 16], [224, 316, 15, 19], [246, 315, 13, 14], [266, 314, 16, 20], [290, 312, 13, 15], [308, 309, 14, 18]])
    s += `<path d="M${x},${y - 6}H${x + w}L${x + w - 2},${y + h - 6}Q${x + w / 2},${y + h - 1} ${x + 2},${y + h - 6}Z" fill="#D8CFA8" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  // neon-green drool off the corner of the mouth
  s += `<path d="M334,330C342,346 346,366 340,382C336,394 324,392 326,380C328,366 330,350 334,330Z" fill="#9BE22E" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  s += `<ellipse cx="331" cy="378" rx="3" ry="5" fill="#E4FFB0"/>`;
  return s;
}

/** The full icon: a grimy oxblood tile with the logo, scaled about the centre (0.8 for maskable). */
export function iconSvg(size = 512, scale = 1) {
  seed = 99;
  const bgGrime = grime(160, 0, 0, 512, 512, '#16120C', 0.3) + grime(40, 0, 0, 512, 512, '#8A2A36', 0.25);
  const drips = [60, 140, 420, 470]
    .map((x, i) => `<path d="M${x - 10},0V${30 + i * 9}C${x - 10},${46 + i * 9} ${x + 10},${46 + i * 9} ${x + 10},${30 + i * 9}V0Z" fill="#2E060D" opacity="0.6"/>`)
    .join('');
  const o = 256 * (1 - scale);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">` +
    `<defs><radialGradient id="bg" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="#7A1A28"/><stop offset="0.7" stop-color="#4E0E18"/><stop offset="1" stop-color="#2E060D"/></radialGradient></defs>` +
    `<rect width="512" height="512" fill="url(#bg)"/>${bgGrime}${drips}` +
    `<g transform="translate(${f(o)} ${f(o)}) scale(${scale})">${art()}</g>` +
    `</svg>`
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--svg') {
    await writeFile(args[1] ?? 'icon.svg', iconSvg(512, 1));
    return;
  }
  const out = args[0] ?? 'public';
  const { Resvg } = await import('@resvg/resvg-js');
  await mkdir(join(out, 'icons'), { recursive: true });
  const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } }).render().asPng();
  const files = [
    ['icon-192.png', 192, 1],
    ['icon-512.png', 512, 1],
    ['icon-maskable-512.png', 512, 0.8],
    ['apple-touch-icon.png', 180, 0.92],
  ];
  for (const [name, size, scale] of files) await writeFile(join(out, 'icons', name), png(iconSvg(512, scale), size));
  await writeFile(join(out, 'icons', 'icon.svg'), iconSvg(512, 1));
  const manifest = {
    name: 'Zombs BBQ',
    short_name: 'Zombs BBQ',
    description: 'Run a grimy zombie barbecue joint: hire the undead, feed the living, raid the rivals.',
    start_url: './',
    scope: './',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#2E060D',
    theme_color: '#5C0F1D',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
  await writeFile(join(out, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log(`${out}/icons: ${files.map((x) => x[0]).join(', ')} + manifest.webmanifest`);
}

// run as a script (not when imported); pathToFileURL keeps this true on Windows paths too
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
