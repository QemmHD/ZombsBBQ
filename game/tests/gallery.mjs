// Art QA gallery: builds a decked-out late-game joint full of seated customers and screenshots it (wide and
// zoomed), then visits every rival's café mid-fight. Run after `npm run build`: `node tests/gallery.mjs` (SHOTS=dir).
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
// a busy machine renders SwiftShader frames slowly: give screenshots and waits room
page.setDefaultTimeout(120000);
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${server.address().port}/index.html?debug`);
await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
const wait = (ms) => page.waitForTimeout(ms);
const ff = (sec) => page.evaluate((n) => { for (let i = 0; i < n; i++) window.zbbq.ctl.update(0.1); }, Math.round(sec * 10));

const problems = await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  const errs = [];
  s.tut = 99;
  s.cash = 1e7;
  s.sauce = 500;
  while (s.level < 12) sim.addXp(s, sim.xpToNext(s.level));
  s.events.length = 0;
  for (let i = 0; i < 3 && sim.nextExpansion(s); i++) {
    const e = sim.expand(s);
    if (e) { errs.push(`expand: ${e}`); break; }
  }
  const place = (id, x, y, dir) => {
    const e = sim.buyAndPlace(s, id, x, y, dir);
    if (e) errs.push(`${id}@${x},${y}${dir ?? ''}: ${e}`);
  };
  // kitchen along the back wall, as in the original
  place('grill', 2, 0, 'se');
  place('smoker', 0, 3, 'se');
  place('counter_steel', 0, 5, 'se');
  place('counter_steel', 0, 6, 'se');
  // single-seat tables, a chair on each free side (the original's 1x1 table + chairs)
  const sets = [['table_diner', 'chair_diner', 4, 4], ['table_wood', 'chair_wood', 7, 4], ['table_barrel', 'chair_barrel', 4, 7], ['table_coffin', 'chair_bone', 7, 7]];
  for (const [t, c, x, y] of sets) {
    place(t, x, y);
    place(c, x - 1, y, 'se');
    place(c, x + 1, y, 'nw');
    place(c, x, y - 1, 'sw');
    place(c, x, y + 1, 'ne');
  }
  // a big crew
  for (const type of ['construction', 'cop', 'nurse', 'boxer', 'lumberjack', 'sumo', 'champ', 'moviestar', 'grandma', 'celebrity'])
    if (s.workers.length <= s.crewCap) s.workers.push(sim.makeWorker(s, 'zombie', type, { x: 5, y: 2 }));
  for (const c of s.counter) { c.dish = 'ribs'; c.servings = 60; }
  s.ratingPts = 1e9;
  return errs;
});
// let customers arrive, sit, order and eat
await ff(90);
await wait(2500);
await page.evaluate(() => window.zbbq.hud.closeModal?.());
await page.screenshot({ path: join(out, 'joint.png') });
// zoomed-in look at the crowd
const zoomShot = async (name, k) => {
  await page.evaluate((z) => {
    const cam = window.zbbq.game.scene.getScene('joint').cameras.main;
    cam.setZoom(cam.zoom * z);
  }, k);
  await wait(800);
  await page.screenshot({ path: join(out, name) });
  await page.evaluate((z) => {
    const cam = window.zbbq.game.scene.getScene('joint').cameras.main;
    cam.setZoom(cam.zoom / z);
  }, k);
};
await zoomShot('joint-zoom.png', 2.2);
await ff(20);
await wait(1500);
await zoomShot('joint-zoom2.png', 2.2);

// every raid pet, from its house on the lawn (they take turns coming along, four a raid)
const petErrs = await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  const errs = [];
  let i = 0;
  for (const p of sim.PETS) {
    let placed = false;
    for (; i < 60 && !placed; i++) placed = !sim.buyAndPlace(s, p.house, s.roomW + 1 + (i % 3), 4 + Math.floor(i / 3));
    if (!placed) errs.push(`pet house ${p.house}: no room`);
  }
  for (let k = 0; k < 5; k++) ctl.update(0.1);
  return errs;
});
problems.push(...petErrs);
const RAIDS = ['chuck', 'hank', 'vera', 'crunch', 'snob', 'sushi', 'taco', 'lab', 'clown', 'boss'];
for (const [ri, rival] of RAIDS.entries()) {
  const err = await page.evaluate(([id, ri]) => {
    const { ctl, sim } = window.zbbq;
    const s = ctl.state;
    for (const r of sim.RIVALS) if (r.id !== id) s.rivals[r.id] = { stars: 1, wins: 1, nextAt: 0 };
    s.rivals[id] = { stars: 0, wins: 0, nextAt: 0 };
    // late joints open at higher levels
    if (s.level < sim.RIVAL_BY_ID[id].level) s.level = sim.RIVAL_BY_ID[id].level;
    // the boss café keeps its own hours: visit while it's parked
    if (id === 'boss' && !sim.bossHere(s)) s.now = Math.ceil(s.now / 36000) * 36000 + 60;
    for (const w of s.workers) if (w.kind === 'zombie') Object.assign(w, { state: 'idle', energy: w.stats.energy, path: [] });
    const crew = s.workers.filter((w) => w.kind === 'zombie').slice(0, 8).map((w) => w.id);
    const pets = s.pets.map((p) => p.id);
    const four = [0, 1, 2, 3].map((k) => pets[(ri * 4 + k) % pets.length]).filter((p, k, a) => p && a.indexOf(p) === k);
    return ctl.beginRaid(id, crew, four);
  }, [rival, ri]);
  if (err) { errors.push(`${rival}: ${err}`); continue; }
  await page.waitForFunction(() => window.zbbq.game.scene.getScene('raid')?.ready, null, { timeout: 30000 });
  await wait(1000);
  await page.screenshot({ path: join(out, `raid-${rival}-0.png`) });
  await page.evaluate(() => window.zbbq.sim.sendAll(window.zbbq.ctl.raid));
  await ff(5);
  await wait(3000);
  await page.screenshot({ path: join(out, `raid-${rival}-1.png`) });
  await ff(5);
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
