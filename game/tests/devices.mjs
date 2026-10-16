// HUD fit check: renders the key screens on several iPhone landscape sizes (with notch/Dynamic Island
// safe-area insets simulated) and reports any HUD element that overlaps another or leaves the screen.
// Run after `npm run build`: `node tests/devices.mjs` (SHOTS=dir).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const DEVICES = [
  { name: 'iphone15promax', w: 932, h: 430, l: 59, r: 59, b: 21 },
  { name: 'iphone15', w: 852, h: 393, l: 59, r: 59, b: 21 },
  { name: 'iphone13mini', w: 812, h: 375, l: 50, r: 50, b: 21 },
  { name: 'iphoneSE', w: 667, h: 375, l: 0, r: 0, b: 0 },
];
const dist = resolve('dist');
const out = resolve(process.env.SHOTS ?? 'test-results/devices');
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  try {
    const p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html')));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const problems = [];
const errors = [];

// visible HUD boxes that must not collide (pairs inside the same group are allowed to touch)
const overlapCheck = () =>
  window.__overlaps?.() ??
  (() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.05 ? r : null;
    };
    const sel = ['.awning', '.side.left', '.side.right', '.hint:not(.hidden)', '.card:not(.hidden)', '.editbar', '.rh-top', '.rh-tray', '.sendall', '.rh-items', '.rh-loot'];
    const boxes = [];
    for (const s of sel) for (const el of document.querySelectorAll(s)) {
      const r = vis(el);
      if (r) boxes.push({ s, r });
    }
    const out = [];
    const W = innerWidth, H = innerHeight;
    for (const b of boxes) {
      if (b.r.left < -1 || b.r.top < -1 || b.r.right > W + 1 || b.r.bottom > H + 1) out.push(`${b.s} off-screen (${Math.round(b.r.left)},${Math.round(b.r.top)},${Math.round(b.r.right)},${Math.round(b.r.bottom)})`);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r, c = boxes[j].r;
        const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left);
        const oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        // the side columns tuck a few px under the awning's scalloped hem by design
        const tuck = boxes[i].s === '.awning' && boxes[j].s.startsWith('.side') && oy <= 6;
        if (ox > 2 && oy > 2 && !tuck) out.push(`${boxes[i].s} overlaps ${boxes[j].s} by ${Math.round(ox)}x${Math.round(oy)}`);
      }
    // modal must fit
    const m = document.querySelector('.modal');
    if (m) {
      const r = m.getBoundingClientRect();
      if (r.top < 0 || r.bottom > H + 1 || r.left < 0 || r.right > W + 1) out.push(`modal off-screen (${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)} of ${W}x${H})`);
    }
    return out;
  })();

for (const d of DEVICES) {
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript((ins) => {
    // Chromium has no notch: fake the safe-area insets the way iOS Safari reports them in landscape
    const st = document.createElement('style');
    st.textContent = `:root{--safe-l:max(10px,${ins.l}px)!important;--safe-r:max(10px,${ins.r}px)!important;--safe-b:max(6px,${ins.b}px)!important}`;
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
  }, d);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${d.name}: ${e}`));
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
  // let the start-up background work (the raid map is pre-rasterized after the joint loads) settle
  await page.waitForTimeout(6000);
  const snap = async (label) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, `${d.name}-${label}.png`), timeout: 120000 });
    for (const p of await page.evaluate(overlapCheck)) problems.push(`${d.name} ${label}: ${p}`);
  };
  await snap('joint');
  // a worker card + Gus hint together (the tightest bottom row)
  await page.evaluate(() => window.zbbq.ctl.tapWorker(window.zbbq.ctl.state.workers[0].id));
  await page.waitForTimeout(700);
  await snap("card");
  await page.evaluate(() => window.zbbq.ctl.select(null));
  // late game numbers make the awning widest
  await page.evaluate(() => {
    const { ctl, sim } = window.zbbq;
    const s = ctl.state;
    s.cash = 9876543;
    s.sauce = 1234;
    s.tut = 99;
    while (s.level < 12) sim.addXp(s, sim.xpToNext(s.level));
    s.events.length = 0;
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.zbbq.hud.closeModal());
  await snap('rich');
  await page.locator('[data-k="shop"]').tap();
  await snap('shop');
  await page.evaluate(() => window.zbbq.hud.closeModal());
  await page.evaluate(() => window.zbbq.ctl.enterEdit());
  await snap('edit');
  await page.evaluate(() => window.zbbq.ctl.beginPlace('table_diner', 'buy'));
  await snap('placing');
  await page.evaluate(() => {
    window.zbbq.ctl.cancelPlacement();
    window.zbbq.ctl.exitEdit();
  });
  await page.locator('[data-k="map"]').tap();
  await snap('map');
  await page.evaluate(() => window.zbbq.hud.closeModal());
  await page.evaluate(() => {
    const { ctl, sim } = window.zbbq;
    const s = ctl.state;
    for (const type of ['construction', 'cop', 'nurse', 'boxer', 'teen', 'yoga']) if (s.workers.length <= s.crewCap) s.workers.push(sim.makeWorker(s, 'zombie', type, { x: 6, y: 6 }));
    ctl.beginRaid('chuck', s.workers.filter((w) => w.kind === 'zombie').map((w) => w.id), []);
  });
  await page.waitForFunction(() => window.zbbq.game.scene.getScene('raid')?.ready, null, { timeout: 30000 });
  await snap('raid');
  await ctx.close();
}
console.log(JSON.stringify({ problems, errors }, null, 1));
await browser.close();
server.close();
if (errors.length || problems.length) process.exit(1);
