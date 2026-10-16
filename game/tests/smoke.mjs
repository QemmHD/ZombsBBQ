// Smoke test: serve the production build, open it as an iPhone in landscape, play the opening
// of the tutorial through real taps, and save screenshots + fail on any console error.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const dist = resolve('dist');
const out = resolve(process.env.SHOTS ?? 'test-results');
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html')));
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
    res.end(await readFile(p));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.zbbq?.game?.scene?.isActive('joint'), null, { timeout: 20000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: join(out, '01-start.png') });

// screen position of a world point (CSS px)
const screenOf = (wx, wy) =>
  page.evaluate(([x, y]) => {
    const cam = window.zbbq.game.scene.getScene('joint').cameras.main;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    return { x: ((x - cam.worldView.x) * cam.zoom) / dpr, y: ((y - cam.worldView.y) * cam.zoom) / dpr };
  }, [wx, wy]);
const isoW = (x, y) => ({ x: (x - y) * 48, y: (x + y) * 24 });
const tapWorld = async (wx, wy) => {
  const p = await screenOf(wx, wy);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(250);
};

// Tutorial: tap YOU, then the grill, pick the hot dog.
const you = await page.evaluate(() => {
  const w = window.zbbq.ctl.state.workers[0];
  return { x: w.x, y: w.y };
});
let p = isoW(you.x, you.y);
await tapWorld(p.x, p.y - 35);
const grill = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  const f = s.furniture.find((f) => f.kind === 'grill');
  return { x: f.x, y: f.y };
});
p = isoW(grill.x, grill.y);
await tapWorld(p.x, p.y - 10);
await page.screenshot({ path: join(out, '02-dish-picker.png') });
const dishBtn = page.locator('[data-dish="hotdog"]');
if (await dishBtn.count()) await dishBtn.first().tap();
await page.waitForTimeout(3000);
await page.screenshot({ path: join(out, '03-cooking.png') });
const st1 = await page.evaluate(() => window.zbbq.ctl.state.stoves[0].status);

// fast-forward the sim (as if time passed) and plate the food
await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  for (let i = 0; i < 300; i++) window.zbbq.ctl.update(0.1);
  return s.stoves[0].status;
});
await tapWorld(p.x, p.y - 10);
await page.evaluate(() => {
  for (let i = 0; i < 400; i++) window.zbbq.ctl.update(0.1);
});
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, '04-serving.png') });
const summary = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  return { cash: s.cash, served: s.stats.served, tut: s.tut, customers: s.customers.length, stove: s.stoves[0].status };
});
console.log(JSON.stringify({ afterPick: st1, ...summary, errors }, null, 1));
await browser.close();
server.close();
if (errors.length) process.exit(1);
