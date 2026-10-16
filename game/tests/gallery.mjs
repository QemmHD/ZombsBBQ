// Art QA gallery: builds a decked-out late-game joint and screenshots it in every theme, then visits
// every rival's arena mid-fight. Run after `npm run build`: `node tests/gallery.mjs` (SHOTS=dir).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const dist = resolve('dist');
const out = resolve(process.env.SHOTS ?? 'test-results/gallery');
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
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
const wait = (ms) => page.waitForTimeout(ms);
const ff = (sec) => page.evaluate((n) => { for (let i = 0; i < n; i++) window.zbbq.ctl.update(0.1); }, Math.round(sec * 10));

const problems = await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  const errs = [];
  s.tut = 99;
  s.cash = 1e6;
  s.sauce = 500;
  while (s.level < 12) sim.addXp(s, sim.xpToNext(s.level));
  s.events.length = 0;
  while (sim.nextExpansion(s)) {
    const e = sim.expand(s);
    if (e) { errs.push(`expand: ${e}`); break; }
  }
  const place = (id, x, y, dir) => {
    const e = sim.buyAndPlace(s, id, x, y, dir);
    if (e) errs.push(`${id}@${x},${y}${dir ?? ''}: ${e}`);
  };
  place('smoker', 3, 0);
  place('fryer', 8, 0);
  place('counter_chrome', 0, 5);
  // a diner booth, a coffin table, a barrel table
  place('table_diner', 9, 4);
  place('chair_diner', 8, 4, 'se');
  place('chair_diner', 10, 4, 'nw');
  place('chair_diner', 9, 3, 'sw');
  place('chair_diner', 9, 5, 'ne');
  place('table_coffin', 9, 8);
  place('chair_bone', 8, 8, 'se');
  place('chair_bone', 10, 8, 'nw');
  place('chair_bone', 9, 9, 'ne');
  place('table_barrel', 6, 9);
  place('chair_wood', 5, 9, 'se');
  place('chair_wood', 7, 9, 'nw');
  place('chair_wood', 6, 10, 'ne');
  // money-makers, pets and decor around the edges
  place('vending', 0, 9);
  place('atm', 0, 10);
  place('barrel_keg', 0, 8);
  place('jukebox', 1, 11);
  place('arcade', 3, 11);
  place('pethouse_pug', 11, 1);
  place('pethouse_kennel', 11, 11);
  const decor = ['flamingo_zombie', 'gnome_zombie', 'pumpkin_pile', 'skeleton_statue', 'coffin_upright', 'slime_fountain', 'lamp_post', 'hay_bale', 'barrel_stack', 'cactus', 'tombstone'];
  [[11, 3], [11, 5], [11, 7], [11, 9], [5, 11], [8, 11], [10, 11], [9, 11], [11, 10], [11, 4], [11, 6]].forEach(([x, y], i) => place(decor[i], x, y));
  // every wall slot gets something
  const hangings = sim.ITEMS.filter((i) => i.kind === 'wall').map((i) => i.id);
  let h = 0;
  for (const wall of ['l', 'r'])
    for (let i = 0; i < s.roomN; i++) if (!sim.wallSlotFree(s, wall, i)) sim.buyWall(s, hangings[h++ % hangings.length], wall, i);
  // a big crew with rares
  for (const type of ['construction', 'cop', 'nurse', 'boxer', 'lumberjack', 'sumo', 'champ', 'moviestar', 'grandma', 'celebrity'])
    if (s.workers.length <= s.crewCap) s.workers.push(sim.makeWorker(s, 'zombie', type, { x: 6, y: 6 }));
  for (const c of s.counter) { c.dish = 'ribs'; c.servings = 60; }
  s.ratingPts = 1e9;
  return errs;
});
await ff(40);
await wait(1500);
for (const theme of ['shack', 'roadhouse', 'diner', 'graveyard']) {
  await page.evaluate((t) => {
    const { ctl, sim } = window.zbbq;
    const e = sim.buyTheme(ctl.state, t);
    if (e && !e.includes('already')) console.warn(e);
  }, theme);
  await ff(8);
  await wait(1500);
  await page.evaluate(() => window.zbbq.hud.closeModal());
  await page.screenshot({ path: join(out, `joint-${theme}.png`) });
}
// zoomed-in look at the crowd
await page.evaluate(() => {
  const cam = window.zbbq.game.scene.getScene('joint').cameras.main;
  cam.setZoom(cam.zoom * 2.2);
});
await wait(800);
await page.screenshot({ path: join(out, 'joint-zoom.png') });
await page.evaluate(() => {
  const cam = window.zbbq.game.scene.getScene('joint').cameras.main;
  cam.setZoom(cam.zoom / 2.2);
});

for (const rival of ['chuck', 'hank', 'vera', 'crunch', 'snob']) {
  const err = await page.evaluate((id) => {
    const { ctl, sim } = window.zbbq;
    const s = ctl.state;
    for (const r of sim.RIVALS) if (r.id !== id) s.rivals[r.id] = { stars: 1, wins: 1, nextAt: 0 };
    s.rivals[id] = { stars: 0, wins: 0, nextAt: 0 };
    for (const w of s.workers) if (w.kind === 'zombie') Object.assign(w, { state: 'idle', energy: w.stats.energy, path: [] });
    const crew = s.workers.filter((w) => w.kind === 'zombie').slice(0, 8).map((w) => w.id);
    return ctl.beginRaid(id, crew, s.pets.map((p) => p.id));
  }, rival);
  if (err) { errors.push(`${rival}: ${err}`); continue; }
  await page.waitForFunction(() => window.zbbq.game.scene.getScene('raid')?.ready, null, { timeout: 30000 });
  await wait(1000);
  await page.screenshot({ path: join(out, `raid-${rival}-0.png`) });
  await page.evaluate(() => window.zbbq.sim.sendAll(window.zbbq.ctl.raid));
  await ff(9);
  await wait(3000);
  await page.screenshot({ path: join(out, `raid-${rival}-1.png`) });
  await ff(16);
  await wait(3000);
  await page.screenshot({ path: join(out, `raid-${rival}-2.png`) });
  await page.evaluate(() => window.zbbq.sim.retreat(window.zbbq.ctl.raid));
  await page.waitForFunction(() => !!document.querySelector('[data-a="home"]'), null, { timeout: 10000 }).catch(() => errors.push(`${rival}: no result card`));
  await page.locator('[data-a="home"]').first().tap();
  await wait(500);
}
console.log(JSON.stringify({ problems, errors }, null, 1));
await browser.close();
server.close();
if (errors.length) process.exit(1);
