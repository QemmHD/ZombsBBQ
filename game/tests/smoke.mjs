// End-to-end smoke test: serve the production build, open it as an iPhone in landscape and play
// through every feature with real taps (tutorial, infection, crew care, every menu, shop + decorating,
// expansion, themes, raids). Saves screenshots and fails on any console error or broken step.
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
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
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
const log = {};
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const check = (ok, msg) => {
  if (!ok) errors.push(`STEP FAILED: ${msg}`);
};
let shotN = 0;
const shot = (name) => page.screenshot({ path: join(out, `${String(++shotN).padStart(2, '0')}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const ff = (sec) =>
  page.evaluate((n) => {
    for (let i = 0; i < n; i++) window.zbbq.ctl.update(0.1);
  }, Math.round(sec * 10));
const tapSel = async (sel, name) => {
  const l = page.locator(sel).first();
  if (!(await l.count())) return check(false, `missing ${name ?? sel}`);
  await l.tap();
  await wait(300);
};
const modalOpen = () => page.evaluate(() => window.zbbq.hud.modalOpen);
const closeModal = async () => {
  if (await modalOpen()) await tapSel('.modal .x', 'modal close');
};

await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
await wait(1500);
check(await page.evaluate(() => document.getElementById('boot')?.classList.contains('done')), 'boot screen hides');
await shot('start');

// screen position of a world point (CSS px)
const screenOf = (wx, wy, scene = 'joint') =>
  page.evaluate(
    ([x, y, sc]) => {
      const cam = window.zbbq.game.scene.getScene(sc).cameras.main;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      return { x: ((x - cam.worldView.x) * cam.zoom) / dpr, y: ((y - cam.worldView.y) * cam.zoom) / dpr };
    },
    [wx, wy, scene],
  );
const isoW = (x, y) => ({ x: (x - y) * 48, y: (x + y) * 24 });
const tapWorld = async (wx, wy, scene) => {
  const p = await screenOf(wx, wy, scene);
  await page.touchscreen.tap(p.x, p.y);
  await wait(250);
};
const tapActor = async (id) => {
  const pos = await page.evaluate((id) => {
    const a = window.zbbq.game.scene.getScene('joint').actors.get(id);
    return a ? { x: a.holder.x, y: a.holder.y - 30 } : null;
  }, id);
  check(!!pos, `actor ${id} on screen`);
  if (pos) await tapWorld(pos.x, pos.y);
};

// ---------- 1. tutorial: YOU cooks a hot dog ----------
const youId = await page.evaluate(() => window.zbbq.ctl.state.workers[0].id);
await tapActor(youId);
check((await page.evaluate(() => window.zbbq.ctl.selection?.kind)) === 'worker', 'tap YOU selects YOU');
const grill = await page.evaluate(() => {
  const f = window.zbbq.ctl.state.furniture.find((f) => f.item === 'grill');
  return { x: f.x, y: f.y };
});
const gp = isoW(grill.x, grill.y);
await tapWorld(gp.x, gp.y - 10);
await shot('dish-picker');
await tapSel('[data-dish="hotdog"]', 'hot dog button');
await wait(2500);
await shot('cooking');
log.afterPick = await page.evaluate(() => window.zbbq.ctl.state.stoves[0].status);
check(['cooking', 'reserved', 'pending'].includes(log.afterPick), 'grill starts cooking');
await ff(30);
await tapWorld(gp.x, gp.y - 10); // plate it
await ff(40);
await wait(800);
await shot('serving');

// ---------- 2. infect a customer ----------
const custId = await page.evaluate(() => window.zbbq.ctl.state.customers.find((c) => c.state === 'waiting' || c.state === 'eating')?.id);
check(!!custId, 'a customer is seated');
if (custId) await tapActor(custId);
await shot('infect-card');
await tapSel('[data-a="infect"]', 'INFECT button');
await wait(400);
await ff(6); // headless GL renders slowly: advance the infection animation in game time
await page.waitForFunction(() => window.zbbq.ctl.state.workers.some((w) => w.kind === 'zombie'), null, { timeout: 30000 }).catch(() => {});
await wait(600);
await shot('first-zombie');
const zid = await page.evaluate(() => window.zbbq.ctl.state.workers.find((w) => w.kind === 'zombie')?.id);
check(!!zid, 'infection via taps');

// ---------- 3. zombie cooks, goes hangry, rests ----------
if (zid) {
  await ff(6);
  await tapActor(zid);
  await tapWorld(gp.x, gp.y - 10);
  await tapSel('[data-dish="hotdog"]', 'zombie dish');
  await ff(2);
  await wait(500);
  await shot('zombie-cooking');
  await page.evaluate((id) => {
    for (let i = 0; i < 300; i++) window.zbbq.ctl.update(0.1);
    const w = window.zbbq.ctl.state.workers.find((w) => w.id === id);
    w.energy = 1;
    w.nextDaydream = Infinity;
    for (let i = 0; i < 60 && !window.zbbq.ctl.state.stats.bites; i++) window.zbbq.ctl.update(0.1);
  }, zid);
  await wait(600);
  await shot('hangry');
  await page.evaluate((id) => window.zbbq.ctl.tapWorker(id), zid);
  await wait(300);
  await tapSel('[data-a="rest"]', 'Rest button');
  await ff(12);
  await wait(600);
  await shot('resting');
  log.zombie = await page.evaluate((id) => window.zbbq.ctl.state.workers.find((w) => w.id === id)?.state, zid);
  check(['resting', 'toRest'].includes(log.zombie), `zombie rests (got ${log.zombie})`);
  await page.evaluate(() => window.zbbq.ctl.select(null));
}

// ---------- 4. grow the joint (cheat ahead) and visit every menu ----------
await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  s.cash += 60000;
  s.sauce += 80;
  // level up through the real path so unlock events fire, then drain the level-up modals
  while (s.level < 7) sim.addXp(s, sim.xpToNext(s.level));
  s.tut = 99;
  // a few more zombies for the crew + raids
  for (const type of ['teen', 'construction', 'cop', 'nurse']) {
    if (s.workers.filter((w) => w.kind === 'zombie').length >= s.crewCap) break;
    s.workers.push(sim.makeWorker(s, 'zombie', type, { x: 6, y: 2 }));
  }
  s.fridge.push({ dish: 'chili', servings: 6 });
});
await ff(1);
await wait(500);
check(await modalOpen(), 'level-up popup shows');
await shot('levelup');
while (await modalOpen()) await closeModal();

const panels = [
  ['book', 'cookbook'],
  ['crew', 'crew'],
  ['goals', 'goals'],
  ['fridge', 'fridge'],
  ['pedia', 'zombiepedia'],
  ['gear', 'settings'],
  ['rating', 'rating'],
];
for (const [k, name] of panels) {
  await tapSel(`[data-k="${k}"]`, name);
  check(await modalOpen(), `${name} opens`);
  await shot(name);
  if (name === 'fridge') {
    await tapSel('[data-a="study"]', 'study chili');
    log.recipes = await page.evaluate(() => window.zbbq.ctl.state.recipes.slice());
    check(log.recipes.includes('chili'), 'studying teaches chili');
  }
  if (name === 'goals') {
    const claim = page.locator('[data-a="claim"]');
    if (await claim.count()) await claim.first().tap();
  }
  await closeModal();
}

// ---------- 4b. OPEN/CLOSED sign, counter card, stove finish/cancel ----------
await tapSel('[data-k="sign"]', 'closed sign');
check(await page.evaluate(() => window.zbbq.ctl.state.closed === true), 'sign closes the joint');
await ff(2);
await wait(600);
await shot('closed');
await tapSel('[data-k="sign"]', 'open sign');
check(await page.evaluate(() => !window.zbbq.ctl.state.closed), 'sign reopens the joint');
const ctr = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  s.counter[0].dish = 'hotdog';
  s.counter[0].servings = 5;
  const f = s.furniture.find((f) => f.item === 'counter');
  return { x: f.x, y: f.y };
});
let cw = isoW(ctr.x, ctr.y);
await tapWorld(cw.x, cw.y - 12);
check((await page.evaluate(() => window.zbbq.ctl.selection?.kind)) === 'counter', 'tapping the counter opens its card');
await shot('counter-card');
await tapSel('[data-a="discard"]', 'bin it');
check(await page.evaluate(() => window.zbbq.ctl.state.counter[0].servings === 0), 'discard empties the slot');
await page.evaluate(() => window.zbbq.ctl.select(null));
// cook something, then finish it with Brain Sauce from the stove card
await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  const g = s.stoves.find((x) => x.kind === 'grill');
  if (g.status !== 'empty') sim.plateDish(s, g.id);
  if (g.status !== 'empty') sim.cancelCooking(s, g.id);
  const you = s.workers.find((w) => w.kind === 'you');
  Object.assign(you, { state: 'idle', path: [] });
  sim.startCooking(s, you.id, g.id, 'burger');
  for (let i = 0; i < 300 && g.status !== 'cooking'; i++) ctl.update(0.1);
});
await tapWorld(gp.x, gp.y - 10);
await shot('stove-cooking-card');
await tapSel('[data-a="finish"]', 'finish now');
check(await page.evaluate(() => window.zbbq.ctl.state.stoves.find((x) => x.kind === 'grill').status === 'done'), 'finish now completes the dish');
await page.evaluate(() => window.zbbq.ctl.select(null));

// ---------- 5. shop: every tab, buy + place a table ----------
await tapSel('[data-k="shop"]', 'shop');
for (const tab of ['featured', 'decor', 'kitchen', 'furniture', 'walls', 'special', 'storage']) {
  await tapSel(`.tab[data-id="${tab}"]`, `shop tab ${tab}`);
  await shot(`shop-${tab}`);
}
await tapSel('.tab[data-id="furniture"]');
const before = await page.evaluate(() => window.zbbq.ctl.state.furniture.length);
await tapSel('[data-a="buy"][data-id="table_diner"]', 'buy diner table');
check((await page.evaluate(() => window.zbbq.ctl.mode)) === 'edit', 'buying enters decorate mode');
// find a free valid spot and drag the ghost there
await page.evaluate(() => {
  const { ctl } = window.zbbq;
  for (let y = 1; y < ctl.state.roomN - 1; y++)
    for (let x = 1; x < ctl.state.roomN - 1; x++) {
      ctl.movePlacement(x, y);
      if (!ctl.placementProblem()) return;
    }
});
await wait(300);
await shot('placing');
await tapSel('.eb-btn[data-a="ok"]', 'confirm place');
const after = await page.evaluate(() => window.zbbq.ctl.state.furniture.length);
check(after === before + 1, 'table placed');

// select it, rotate, move it, store it, re-place from storage
const tbl = await page.evaluate(() => window.zbbq.ctl.state.furniture.at(-1));
const tp = isoW(tbl.x, tbl.y);
await tapWorld(tp.x, tp.y);
log.editSel = await page.evaluate(() => JSON.stringify(window.zbbq.ctl.editSel));
check(!!(await page.evaluate(() => window.zbbq.ctl.editSel)), 'tap furniture in decorate mode selects it');
await shot('edit-selected');
await tapSel('.eb-btn[data-a="store"]', 'store');
check((await page.evaluate(() => window.zbbq.ctl.state.storage.table_diner)) === 1, 'stored');
await tapSel('.eb-btn[data-a="storage"]', 'storage');
await tapSel('[data-a="place"][data-id="table_diner"]', 'place from storage');
await page.evaluate(() => {
  const { ctl } = window.zbbq;
  for (let y = 1; y < ctl.state.roomN - 1; y++)
    for (let x = 1; x < ctl.state.roomN - 1; x++) {
      ctl.movePlacement(x, y);
      if (!ctl.placementProblem()) return;
    }
});
await tapSel('.eb-btn[data-a="ok"]', 'confirm place from storage');
check(!(await page.evaluate(() => window.zbbq.ctl.state.storage.table_diner)), 'storage emptied');

// a wall hanging
await tapSel('.eb-btn[data-a="shop"]', 'shop from editbar');
await tapSel('.tab[data-id="walls"]');
const wallItem = await page.evaluate(() => {
  const { sim, ctl } = window.zbbq;
  return sim.ITEMS.find((i) => i.kind === 'wall' && !sim.buyCheck(ctl.state, i.id))?.id;
});
if (wallItem) {
  await tapSel(`[data-a="buy"][data-id="${wallItem}"]`, 'buy wall item');
  await page.evaluate(() => {
    const { ctl } = window.zbbq;
    for (const wall of ['l', 'r'])
      for (let i = 0; i < ctl.state.roomN; i++) {
        ctl.moveWallPlacement(wall, i);
        if (!ctl.placementProblem()) return;
      }
  });
  await shot('wall-placing');
  await tapSel('.eb-btn[data-a="ok"]', 'confirm wall item');
  check(await page.evaluate((id) => window.zbbq.ctl.state.walls.some((w) => w.item === id), wallItem), 'wall item hung');
}

// expansion (two-tap) + theme
await tapSel('.eb-btn[data-a="shop"]');
await tapSel('.tab[data-id="special"]');
await tapSel('[data-a="expand"]', 'expand (arm)');
await tapSel('[data-a="expand"]', 'expand (confirm)');
log.roomN = await page.evaluate(() => window.zbbq.ctl.state.roomN);
check(log.roomN > 8, 'expanded the joint');
await tapSel('.tab[data-id="walls"]');
await tapSel('[data-a="theme"][data-id="roadhouse"]', 'buy roadhouse theme');
log.theme = await page.evaluate(() => window.zbbq.ctl.state.theme);
check(log.theme === 'roadhouse', 'theme applied');
await closeModal();
await wait(800);
await shot('edit-mode');
await tapSel('.eb-btn[data-a="done"]', 'done decorating');
check((await page.evaluate(() => window.zbbq.ctl.mode)) === 'play', 'back to play');
await ff(20);
await wait(600);
await shot('expanded-roadhouse');

// ---------- 6. raid: map → rival → squad → fight → result ----------
await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  for (const w of s.workers) if (w.kind === 'zombie') (w.energy = w.stats.energy), (w.state = 'idle'), (w.path = []);
  s.xp = window.zbbq.sim.xpToNext(s.level) - 5; // the raid win will level us up mid-raid
});
const lvBefore = await page.evaluate(() => window.zbbq.ctl.state.level);
await tapSel('[data-k="map"]', 'raid map');
await wait(400);
await shot('map');
await tapSel('[data-a="rival"][data-id="chuck"]', 'Chuck pin');
await shot('rival-card');
await tapSel('[data-a="go"]', 'go to squad');
await shot('squad');
await tapSel('[data-a="start"]', 'start raid');
check((await page.evaluate(() => window.zbbq.ctl.mode)) === 'raid', 'raid started');
await page.waitForFunction(() => window.zbbq.game.scene.getScene('raid')?.ready, null, { timeout: 30000 }).catch(() => check(false, 'raid scene loads'));
await wait(800);
await shot('raid-start');
await tapSel('[data-a="sendall"]', 'send all');
await ff(4);
await wait(500);
await shot('raid-fight');
// tap a counter dish in the raid scene to steal it once the crew is close
await ff(20);
const stolen = await page.evaluate(() => {
  const r = window.zbbq.ctl.raid;
  if (!r) return 'no raid';
  const i = r.counter.findIndex((c) => c.servings > 0);
  return i >= 0 ? window.zbbq.sim.stealDish(r, i) ?? 'ok' : 'empty';
});
log.steal = stolen;
await ff(8);
await wait(500);
await shot('raid-steal');
await page.waitForFunction(() => window.zbbq.ctl.raidResult || window.zbbq.ctl.raid?.phase !== 'fight', null, { timeout: 5000 }).catch(() => {});
for (let i = 0; i < 20; i++) {
  const done = await page.evaluate(() => !!window.zbbq.ctl.raidResult || document.querySelector('[data-a="home"]'));
  if (done) break;
  await ff(10);
}
await wait(1200);
log.result = await page.evaluate(() => window.zbbq.ctl.raidResult && { result: window.zbbq.ctl.raidResult.result, cash: window.zbbq.ctl.raidResult.cash });
await shot('raid-result');
check(await page.evaluate(() => !!document.querySelector('[data-a="home"]')), 'raid results card stays up even when the win levels you up');
await tapSel('[data-a="home"]', 'home after raid');
await wait(800);
check((await page.evaluate(() => window.zbbq.ctl.mode)) === 'play', 'home after raid');
check((await page.evaluate(() => window.zbbq.ctl.state.level)) > lvBefore, 'raid XP levelled up');
check(await modalOpen(), 'queued level-up popup shows once home');
await shot('levelup-after-raid');
while (await modalOpen()) await closeModal();
await shot('home-after-raid');

// ---------- 7. reload: save/load keeps everything ----------
await page.evaluate(() => window.zbbq.ctl.save());
const snap = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  return { cash: Math.floor(s.cash), roomN: s.roomN, theme: s.theme, n: s.furniture.length, crew: s.workers.length };
});
await page.reload();
await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
const snap2 = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  return { cash: Math.floor(s.cash), roomN: s.roomN, theme: s.theme, n: s.furniture.length, crew: s.workers.length };
});
check(snap.roomN === snap2.roomN && snap.theme === snap2.theme && snap.n === snap2.n && snap.crew === snap2.crew, `save round-trip ${JSON.stringify(snap)} vs ${JSON.stringify(snap2)}`);
await wait(1000);
while (await modalOpen()) await closeModal();
await shot('reloaded');

// texture memory: iPhones get unhappy well before ~300 MB of GPU textures
log.textures = await page.evaluate(() => {
  let px = 0, n = 0;
  for (const [k, t] of Object.entries(window.zbbq.game.textures.list)) {
    if (k.startsWith('__')) continue;
    for (const src of t.source) px += src.width * src.height;
    n++;
  }
  return { count: n, mb: Math.round((px * 4) / 1048576) };
});
check(log.textures.mb < 250, `texture memory ${log.textures.mb} MB`);
// ---------- 8. move furniture with a real finger drag ----------
await tapSel('[data-k="edit"]', 'decorate');
const pt = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  const f = s.furniture.find((f) => f.item === 'table_diner');
  return { id: f.id, x: f.x, y: f.y };
});
let wp = isoW(pt.x, pt.y);
await tapWorld(wp.x, wp.y);
await tapSel('.eb-btn[data-a="move"]', 'move');
// drag it one tile toward the front by finding a free tile next to it
const dest = await page.evaluate((pt) => {
  const { ctl } = window.zbbq;
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [2, 0], [0, 2], [1, 1], [-1, 1], [1, -1]]) {
    ctl.movePlacement(pt.x + dx, pt.y + dy);
    if (!ctl.placementProblem()) {
      ctl.movePlacement(pt.x, pt.y);
      return { x: pt.x + dx, y: pt.y + dy };
    }
  }
  ctl.movePlacement(pt.x, pt.y);
  return null;
}, pt);
check(!!dest, 'a free tile to move the table to');
if (dest) {
  const a = await screenOf(wp.x, wp.y);
  const bw = isoW(dest.x, dest.y);
  const b = await screenOf(bw.x, bw.y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
    await wait(60);
  }
  await page.mouse.up();
  await wait(300);
  log.dragPlacing = await page.evaluate(() => window.zbbq.ctl.placing && { x: window.zbbq.ctl.placing.x, y: window.zbbq.ctl.placing.y });
  await shot('drag-move');
  await tapSel('.eb-btn[data-a="ok"]', 'confirm move');
  const moved = await page.evaluate((id) => {
    const f = window.zbbq.ctl.state.furniture.find((f) => f.id === id);
    return { x: f.x, y: f.y };
  }, pt.id);
  check(moved.x === dest.x && moved.y === dest.y, `drag moved the table to ${dest.x},${dest.y} (got ${moved.x},${moved.y})`);
}
if (await page.locator('.eb-btn[data-a="desel"]').count()) await tapSel('.eb-btn[data-a="desel"]');
await tapSel('.eb-btn[data-a="done"]', 'done decorating');

// ---------- 9. come back two hours later ----------
await page.evaluate(() => {
  window.zbbq.ctl.save();
  const k = 'zombsbbq.save.v1';
  const f = JSON.parse(localStorage.getItem(k));
  f.savedAt -= 2 * 3600 * 1000;
  localStorage.setItem(k, JSON.stringify(f));
  window.zbbq.ctl.save = () => {}; // don't let the unload save overwrite the doctored file
});
await page.reload();
await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
await wait(1000);
log.offline = await page.evaluate(() => document.querySelector('.modal h2')?.textContent);
check(/Welcome back/.test(log.offline ?? ''), 'welcome-back popup after time away');
await shot('welcome-back');
while (await modalOpen()) await closeModal();

log.final = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  return { level: s.level, cash: Math.floor(s.cash), crew: s.workers.map((w) => `${w.type}:${w.state}`), stars: window.zbbq.sim.stars(s) };
});
console.log(JSON.stringify({ ...log, errors }, null, 1));
await browser.close();
server.close();
if (errors.length) process.exit(1);
