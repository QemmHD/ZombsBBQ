// End-to-end smoke test: serve the production build, open it as an iPhone in landscape and play
// through every feature with real taps (tutorial, cooking, plating, infection, crew care, every menu,
// shop + decorating, painting walls/floors, expansion, raids, save/reload, time away). Saves screenshots
// and fails on any console error or broken step.
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
// a busy machine renders SwiftShader frames slowly: give screenshots and waits room
page.setDefaultTimeout(120000);
const errors = [];
const log = {};
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const check = (ok, msg) => {
  if (!ok) errors.push(`STEP FAILED: ${msg}`);
};
let shotN = 0;
// CSS-pixel screenshots by default (3x PNGs are slow to read back and encode under SwiftShader);
// SMOKE_HIRES=1 for full device-resolution shots when reviewing art
const shotScale = process.env.SMOKE_HIRES ? 'device' : 'css';
const shot = (name) => page.screenshot({ path: join(out, `${String(++shotN).padStart(2, '0')}-${name}.png`), scale: shotScale });
const wait = (ms) => page.waitForTimeout(ms);
const ff = (sec) =>
  page.evaluate((n) => {
    for (let i = 0; i < n; i++) window.zbbq.ctl.update(0.1);
  }, Math.round(sec * 10));
const tapSel = async (sel, name) => {
  const l = page.locator(sel).first();
  if (!(await l.count())) return check(false, `missing ${name ?? sel}`);
  // a popup that came up on its own (a level-up when a dish reaches the counter, a hint) would swallow
  // the tap: close it first, as a player would
  for (let i = 0; i < 3 && (await modalOpen()) && !(await l.evaluate((el) => !!el.closest('.modal-root'))); i++) await closeModal();
  await l.tap();
  await wait(300);
};
const modalOpen = () => page.evaluate(() => window.zbbq.hud.modalOpen);
const closeModal = async () => {
  if (await modalOpen()) await tapSel('.modal .x', 'modal close');
};

await page.goto(`http://localhost:${port}/index.html?debug`);
await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
check(!!(await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 5000 }).catch(() => null)), 'boot screen hides');
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
const isoW = (x, y) => ({ x: (x - y) * 48, y: (x + y) * 30 });
const tapWorld = async (wx, wy, scene) => {
  await wait(300); // let a sliding card or bar settle before checking what covers the spot
  let p = await screenOf(wx, wy, scene);
  // and let a camera glide (the tutorial pans to each step) finish, or the finger lands off target
  for (let i = 0; i < 15; i++) {
    await wait(200);
    const q = await screenOf(wx, wy, scene);
    const still = Math.hypot(q.x - p.x, q.y - p.y) < 1;
    p = q;
    if (still) break;
  }
  // the room is framed taller than the screen: pan first (as a player would) if the spot sits under the awning,
  // the bottom bars or an open card; the pan lands the spot left of centre, clear of the right-hand card
  const covered = async () => page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.tagName !== 'CANVAS', [p.x, p.y]);
  if ((await covered()) || p.y < 70 || p.y > 290) {
    await page.evaluate(
      ([x, y, sc]) => {
        const cam = window.zbbq.game.scene.getScene(sc).cameras.main;
        const u = Math.min(3, window.devicePixelRatio || 1) / cam.zoom;
        cam.centerOn(x + 122 * u, y);
      },
      [wx, wy, scene ?? 'joint'],
    );
    await wait(150);
    p = await screenOf(wx, wy, scene);
    check(!(await covered()), `world tap at ${Math.round(p.x)},${Math.round(p.y)} is clear of the HUD`);
  }
  await page.touchscreen.tap(p.x, p.y);
  await wait(250);
};
const tapActor = async (id) => {
  const pos = await page.evaluate((id) => {
    // tap the middle of the body, the way a player would
    const a = window.zbbq.game.scene.getScene('joint').actors.get(id);
    if (!a) return null;
    const b = a.puppet?.root.getBounds();
    return b ? { x: a.holder.x, y: b.centerY } : { x: a.holder.x, y: a.holder.y - 50 };
  }, id);
  check(!!pos, `actor ${id} on screen`);
  if (pos) await tapWorld(pos.x, pos.y);
};

// ---------- 1. tutorial: YOU cooks at the grimy stove ----------
const youId = await page.evaluate(() => window.zbbq.ctl.state.workers[0].id);
await tapActor(youId);
check((await page.evaluate(() => window.zbbq.ctl.selection?.kind)) === 'worker', 'tap YOU selects YOU');
const stove = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  const f = s.furniture.find((f) => f.id === s.stoves[0].furnitureId);
  return { x: f.x, y: f.y };
});
const sp = isoW(stove.x, stove.y);
await tapWorld(sp.x, sp.y - 20);
await shot('dish-picker');
await tapSel('[data-dish="sliders"]', 'sliders button');
await wait(1500);
await ff(4);
await shot('cooking');
log.afterPick = await page.evaluate(() => window.zbbq.ctl.state.stoves[0].status);
check(['cooking', 'reserved'].includes(log.afterPick), `stove starts cooking (got ${log.afterPick})`);
await ff(25); // the very first dish is quick
check((await page.evaluate(() => window.zbbq.ctl.state.stoves[0].status)) === 'done', 'first dish finishes');
await shot('dish-done');
// original: pick a cook, then touch the stove, to carry the food to the counter
await tapActor(youId);
await tapWorld(sp.x, sp.y - 20);
await ff(20);
check(await page.evaluate(() => window.zbbq.ctl.state.counter.some((c) => c.dish && c.servings > 0)), 'food reaches the counter');
// a new game starts CLOSED (original): flip the sign to open up (tapping the door itself is checked in 4b)
check(await page.evaluate(() => window.zbbq.ctl.state.closed === true), 'a new game starts closed');
await tapSel('[data-k="sign"]', 'open sign');
check(await page.evaluate(() => !window.zbbq.ctl.state.closed), 'the sign opens up');
await ff(40);
await wait(800);
await shot('serving');

// ---------- 2. infect a customer ----------
// (one table: the first diner may already have eaten and gone; wait for the next to sit down)
for (let i = 0; i < 120 && !(await page.evaluate(() => window.zbbq.ctl.state.customers.some((c) => c.state === 'waiting' || c.state === 'eating'))); i++) await ff(1);
await wait(800);
const custId = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  // a diner who won't get up and leave while the card is open (the tutorial's first meal is only 10 s)
  const c = s.customers.find((c) => c.state === 'waiting') ?? s.customers.find((c) => c.state === 'eating');
  if (c?.state === 'eating') c.eatEnd = Math.max(c.eatEnd, s.now + 30);
  return c?.id;
});
check(!!custId, 'a customer is seated');
if (custId) await tapActor(custId);
await shot('infect-card');
await tapSel('[data-a="infect"]', 'INFECT button');
await wait(400);
await ff(6);
await page.waitForFunction(() => window.zbbq.ctl.state.workers.some((w) => w.kind === 'zombie'), null, { timeout: 30000 }).catch(() => {});
await wait(600);
await shot('first-zombie');
const zid = await page.evaluate(() => window.zbbq.ctl.state.workers.find((w) => w.kind === 'zombie')?.id);
check(!!zid, 'infection via taps');

// ---------- 3. zombie cooks, goes hangry, rests outside ----------
if (zid) {
  await ff(6);
  await page.evaluate(() => {
    const { ctl, sim } = window.zbbq;
    const st = ctl.state.stoves[0];
    if (st.status === 'done' || st.status === 'burnt') sim.plateDish(ctl.state, st.id);
    for (let i = 0; i < 100 && st.status !== 'empty'; i++) ctl.update(0.1);
  });
  await tapActor(zid);
  await tapWorld(sp.x, sp.y - 20);
  await tapSel('[data-dish="sliders"]', 'zombie dish');
  await ff(6);
  await wait(500);
  await shot('zombie-cooking');
  log.zombieCook = await page.evaluate((id) => window.zbbq.ctl.state.workers.find((w) => w.id === id)?.state, zid);
  check(['cooking', 'toStove'].includes(log.zombieCook), `zombie goes to cook (got ${log.zombieCook})`);
  await page.evaluate((id) => {
    const w = window.zbbq.ctl.state.workers.find((w) => w.id === id);
    // the cook stands at the stove until the dish is done (2 min), then is free to be sent off to rest
    for (let i = 0; i < 2000 && (w.state === 'cooking' || w.state === 'toStove'); i++) window.zbbq.ctl.update(0.1);
    w.energy = 1;
    w.nextDaydream = Infinity;
    for (let i = 0; i < 80 && !window.zbbq.ctl.state.stats.bites; i++) window.zbbq.ctl.update(0.1);
  }, zid);
  await wait(600);
  await shot('hangry');
  await page.evaluate((id) => window.zbbq.ctl.tapWorker(id), zid);
  await wait(300);
  // the first dish of the day queues the Frequent Fryer streak popup, which opens over the card here
  if (await modalOpen()) {
    log.fryer = await page.evaluate(() => document.querySelector('.modal h2')?.textContent);
    await shot('fryer');
    while (await modalOpen()) await closeModal();
  }
  await tapSel('[data-a="rest"]', 'Rest button');
  await ff(15);
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
  s.cash += 80000;
  s.sauce += 80;
  // level up through the real path so unlock events fire
  while (s.level < 7) sim.addXp(s, sim.xpToNext(s.level));
  s.tut = 99;
  for (const type of ['teen', 'construction', 'cop', 'nurse']) {
    if (s.workers.filter((w) => w.kind === 'zombie').length >= s.crewCap) break;
    s.workers.push(sim.makeWorker(s, 'zombie', type, { x: 5, y: 2 }));
  }
  s.fridge.push({ dish: 'chili', servings: 6 });
});
await ff(1);
await wait(500);
check(await modalOpen(), 'level-up popup shows');
await shot('levelup');
while (await modalOpen()) await closeModal();

// ---------- Frequent Fryer: the first dish of the day keeps the cooking streak ----------
const fryerFresh = await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  if (ctl.state.fryer) return false;
  sim.fryerCooked(ctl.state);
  return true;
});
if (fryerFresh) {
  await ff(0.5);
  await wait(500);
  log.fryer = await page.evaluate(() => document.querySelector('.modal h2')?.textContent);
  await shot('fryer');
}
while (await modalOpen()) await closeModal();
check(log.fryer === 'Frequent Fryer', `Frequent Fryer popup shows (got ${log.fryer})`);

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

// ---------- 4b. OPEN/CLOSED: the sign button and the door itself, counter card, stove card ----------
await tapSel('[data-k="sign"]', 'closed sign');
check(await page.evaluate(() => window.zbbq.ctl.state.closed === true), 'sign closes the joint');
await ff(2);
await wait(600);
await shot('closed');
// tap the door (on the north-east wall) to open up again
const door = await page.evaluate(() => ({ x: (window.zbbq.sim.DOOR_X + 0.5) * 48, y: (window.zbbq.sim.DOOR_X - 0.5) * 30 - 70 }));
await tapWorld(door.x, door.y);
check(await page.evaluate(() => !window.zbbq.ctl.state.closed), 'tapping the door reopens the joint');
const ctr = await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  sim.addToCounter(s, 'sliders', 5);
  const f = s.furniture.find((f) => f.item === 'counter_plain');
  return { x: f.x, y: f.y };
});
const cw = isoW(ctr.x, ctr.y);
await tapWorld(cw.x, cw.y - 20);
check((await page.evaluate(() => window.zbbq.ctl.selection?.kind)) === 'counter', 'tapping the counter opens its card');
await shot('counter-card');
const binned = await page.evaluate(() => window.zbbq.ctl.state.counter.reduce((a, c) => a + (c.dish ? c.servings : 0), 0));
await tapSel('[data-a="discard"]', 'bin it');
check((await page.evaluate(() => window.zbbq.ctl.state.counter.reduce((a, c) => a + (c.dish ? c.servings : 0), 0))) < binned, 'discard empties a slot');
await page.evaluate(() => window.zbbq.ctl.select(null));
// cook something, then finish it with Brain Sauce from the stove card
await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  const g = s.stoves[0];
  // clear the stove: a done dish is carried to the counter by a worker (not instant), so tick until it's gone
  if (g.status === 'cooking' || g.status === 'paused' || g.status === 'reserved') sim.cancelCooking(s, g.id);
  for (let i = 0; i < 600 && g.status !== 'empty'; i++) {
    if (g.status === 'done' || g.status === 'burnt') sim.plateDish(s, g.id);
    ctl.update(0.1);
  }
  const you = s.workers.find((w) => w.kind === 'you');
  sim.releaseJob(s, you);
  Object.assign(you, { state: 'idle', path: [] });
  sim.startCooking(s, you.id, g.id, 'hobodog');
  for (let i = 0; i < 300 && g.status !== 'cooking'; i++) ctl.update(0.1);
});
await tapWorld(sp.x, sp.y - 20);
await shot('stove-cooking-card');
await tapSel('[data-a="finish"]', 'finish now');
check(await page.evaluate(() => window.zbbq.ctl.state.stoves[0].status === 'done'), 'finish now completes the dish');
await page.evaluate(() => window.zbbq.ctl.select(null));

// ---------- 5. shop: every tab, buy + place a table and a chair facing it ----------
await tapSel('[data-k="shop"]', 'shop');
for (const tab of ['featured', 'decor', 'kitchen', 'furniture', 'walls', 'special', 'storage']) {
  await tapSel(`.tab[data-id="${tab}"]`, `shop tab ${tab}`);
  await shot(`shop-${tab}`);
}
await tapSel('.tab[data-id="furniture"]');
const seats0 = await page.evaluate(() => window.zbbq.sim.validSeats(window.zbbq.ctl.state).length);
await tapSel('[data-a="buy"][data-id="table_diner"]', 'buy diner table');
check((await page.evaluate(() => window.zbbq.ctl.mode)) === 'edit', 'buying enters decorate mode');
// a free spot with room for a chair in front of it (sw of the table)
const tableAt = await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  for (let y = 1; y < s.roomH - 1; y++)
    for (let x = 1; x < s.roomW - 1; x++) {
      if (sim.canPlace(s, 'table_diner', x, y) || sim.canPlace(s, 'chair_diner', x, y + 1, 'ne')) continue;
      ctl.movePlacement(x, y);
      return { x, y };
    }
  return null;
});
check(!!tableAt, 'a spot for a table and chair');
await wait(300);
await shot('placing');
await tapSel('.eb-btn[data-a="ok"]', 'confirm place');
await tapSel('.eb-btn[data-a="shop"]', 'shop from editbar');
await tapSel('.tab[data-id="furniture"]');
await tapSel('[data-a="buy"][data-id="chair_diner"]', 'buy diner chair');
await page.evaluate((t) => window.zbbq.ctl.movePlacement(t.x, t.y + 1), tableAt);
// rotate until it faces the table
for (let i = 0; i < 4; i++) {
  if ((await page.evaluate(() => window.zbbq.ctl.placing?.dir)) === 'ne') break;
  await tapSel('.eb-btn[data-a="rot"]', 'rotate chair');
}
await shot('chair-placing');
await tapSel('.eb-btn[data-a="ok"]', 'confirm chair');
check((await page.evaluate(() => window.zbbq.sim.validSeats(window.zbbq.ctl.state).length)) === seats0 + 1, 'table + chair make a new seat');

// select the table, store it, re-place it from storage
const tbl = await page.evaluate(() => window.zbbq.ctl.state.furniture.find((f) => f.item === 'table_diner'));
const tp = isoW(tbl.x, tbl.y);
await tapWorld(tp.x, tp.y - 10);
check(!!(await page.evaluate(() => window.zbbq.ctl.editSel)), 'tap furniture in decorate mode selects it');
await shot('edit-selected');
await tapSel('.eb-btn[data-a="store"]', 'store');
check((await page.evaluate(() => window.zbbq.ctl.state.storage.table_diner)) === 1, 'stored');
await tapSel('.eb-btn[data-a="storage"]', 'storage');
await tapSel('[data-a="place"][data-id="table_diner"]', 'place from storage');
await page.evaluate((t) => window.zbbq.ctl.movePlacement(t.x, t.y), tableAt);
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
      for (let i = 0; i < 8; i++) {
        ctl.moveWallPlacement(wall, i);
        if (!ctl.placementProblem()) return;
      }
  });
  await shot('wall-placing');
  await tapSel('.eb-btn[data-a="ok"]', 'confirm wall item');
  check(await page.evaluate((id) => window.zbbq.ctl.state.wallItems.some((w) => w.item === id), wallItem), 'wall item hung');
}

// paint: lay clean tile on a stained floor tile by tapping it, then paper a wall section
await tapSel('.eb-btn[data-a="shop"]');
await tapSel('.tab[data-id="walls"]');
await tapSel('[data-a="paint"][data-id="floor:tile"]', 'pick floor tile');
check((await page.evaluate(() => window.zbbq.ctl.painting?.kind)) === 'floor', 'floor brush picked');
const stain = await page.evaluate(() => {
  const s = window.zbbq.ctl.state;
  const k = Object.keys(s.floors).find((k) => s.floors[k] === 'stain');
  return k ? k.split(',').map(Number) : null;
});
if (stain) {
  const fp = isoW(stain[0], stain[1]);
  await tapWorld(fp.x, fp.y);
  check(await page.evaluate((k) => window.zbbq.ctl.state.floors[k] === 'tile', `${stain[0]},${stain[1]}`), 'tapping a stained tile re-tiles it');
}
await shot('painting-floor');
await tapSel('.eb-btn[data-a="paintdone"]', 'done painting');
await tapSel('.eb-btn[data-a="shop"]');
await tapSel('.tab[data-id="walls"]');
await tapSel('[data-a="paint"][data-id="wall:plaster"]', 'pick plaster');
await tapSel('.eb-btn[data-a="paintall"]', 'paper every wall');
check(await page.evaluate(() => window.zbbq.ctl.state.walls.r.every((f) => f === 'plaster')), 'walls papered');
await tapSel('.eb-btn[data-a="paintdone"]', 'done papering');

// expansion (two taps)
await tapSel('.eb-btn[data-a="shop"]');
await tapSel('.tab[data-id="special"]');
await tapSel('[data-a="expand"]', 'expand (arm)');
await tapSel('[data-a="expand"]', 'expand (confirm)');
log.room = await page.evaluate(() => [window.zbbq.ctl.state.roomW, window.zbbq.ctl.state.roomH]);
check(log.room[0] === 8 && log.room[1] === 7, `expanded to 8x7 (got ${log.room})`);
await closeModal();
await wait(800);
await shot('edit-mode');
await tapSel('.eb-btn[data-a="done"]', 'done decorating');
check((await page.evaluate(() => window.zbbq.ctl.mode)) === 'play', 'back to play');
await ff(20);
await wait(600);
await shot('expanded');

// ---------- 6. raid: map → rival → squad → line-up → orders → fight → result ----------
await page.evaluate(() => {
  const { ctl, sim } = window.zbbq;
  const s = ctl.state;
  for (const w of s.workers) if (w.kind === 'zombie') (w.energy = sim.maxEnergy(w)), (w.state = 'idle'), (w.path = []);
  sim.buyAndPlace(s, 'tombstone_str', s.roomW + 1, 2);
  for (let i = 0; i < 5; i++) ctl.update(0.1); // let any level-up from the purchase land first
  s.xp = sim.xpToNext(s.level) - 5; // the raid win will level us up mid-raid
});
await ff(1);
await wait(400);
while (await modalOpen()) await closeModal();
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
await shot('raid-lineup');
check(await page.evaluate(() => window.zbbq.ctl.raid.units.filter((u) => u.side === 'z').every((u) => u.state === 'queued')), 'squad waits in line');
// tap a zombie in the tray, then ATTACK
await tapSel('.tray-u', 'pick a zombie');
check(!!(await page.evaluate(() => window.zbbq.ctl.raidSel)), 'tapping a zombie picks it');
await tapSel('[data-a="attack"]', 'ATTACK');
check(await page.evaluate(() => window.zbbq.ctl.raid.units.some((u) => u.side === 'z' && u.state !== 'queued')), 'ATTACK sends the picked zombie in');
await ff(6);
await wait(500);
await shot('raid-first-in');
await tapSel('[data-a="stone"]', 'tombstone buff');
check(await page.evaluate(() => window.zbbq.ctl.raid.buff?.kind === 'str'), 'tombstone glows');
await tapSel('[data-a="sendall"]', 'ATTACK ALL');
await ff(4);
await wait(500);
await shot('raid-fight');
log.steal = await page.evaluate(() => {
  const r = window.zbbq.ctl.raid;
  const i = r.counter.findIndex((c) => c.servings > 0);
  return i >= 0 ? window.zbbq.sim.stealDish(r, i) ?? 'ok' : 'empty';
});
await ff(10);
await wait(500);
await shot('raid-brawl');
for (let i = 0; i < 30; i++) {
  const done = await page.evaluate(() => !!window.zbbq.ctl.raidResult || !!document.querySelector('[data-a="home"]'));
  if (done) break;
  await ff(10);
  await wait(100);
}
await wait(1600);
log.result = await page.evaluate(() => window.zbbq.ctl.raidResult && { result: window.zbbq.ctl.raidResult.result, cash: window.zbbq.ctl.raidResult.cash });
await shot('raid-result');
check(log.result?.result === 'won', `raid won (got ${JSON.stringify(log.result)})`);
check(await page.evaluate(() => !!document.querySelector('[data-a="home"]')), 'raid results card stays up even when the win levels you up');
await tapSel('[data-a="home"]', 'home after raid');
await wait(800);
check((await page.evaluate(() => window.zbbq.ctl.mode)) === 'play', 'home after raid');
check((await page.evaluate(() => window.zbbq.ctl.state.level)) > lvBefore, 'raid XP levelled up');
check(await modalOpen(), 'queued level-up popup shows once home');
while (await modalOpen()) await closeModal();
await shot('home-after-raid');
// the rival's café, sign and cast are freed once the raid is over (the joint's own art stays)
check(
  !!(await page
    .waitForFunction(() => !Object.keys(window.zbbq.game.textures.list).some((k) => /^rsign_|^char_(boss|staff)_/.test(k)), null, { timeout: 15000 })
    .catch(() => null)),
  'raid-only textures freed after the raid',
);

// ---------- 7. reload: save/load keeps everything ----------
await page.evaluate(() => window.zbbq.ctl.save());
const snapOf = () =>
  page.evaluate(() => {
    const s = window.zbbq.ctl.state;
    return { room: `${s.roomW}x${s.roomH}`, n: s.furniture.length, walls: s.walls.r.join(), crew: s.workers.length, hung: s.wallItems.length };
  });
const snap = await snapOf();
await page.reload();
await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
const snap2 = await snapOf();
check(JSON.stringify(snap) === JSON.stringify(snap2), `save round-trip ${JSON.stringify(snap)} vs ${JSON.stringify(snap2)}`);
await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 10000 }).catch(() => null);
while (await modalOpen()) await closeModal();
await shot('reloaded');

// WebGL context loss (iOS drops it when backgrounded under memory pressure): every texture comes back
const before = await page.screenshot({ scale: 'css' });
const lost = await page.evaluate(async () => {
  const gl = window.zbbq.game.renderer.gl;
  const ext = gl?.getExtension('WEBGL_lose_context');
  if (!ext) return false;
  ext.loseContext();
  await new Promise((r) => setTimeout(r, 300));
  ext.restoreContext();
  return true;
});
if (lost) {
  await page.waitForFunction(() => !window.zbbq.game.renderer.contextLost && window.zbbq.textures.stats().restoring === 0, null, { timeout: 60000 }).catch(() => check(false, 'textures restored after context loss'));
  await wait(500);
  const after = await page.screenshot({ scale: 'css' });
  // blank (lost) textures would leave a nearly flat frame that compresses to a fraction of the size
  check(after.length > before.length * 0.75, `scene redrawn after context loss (${after.length} vs ${before.length} bytes)`);
  await shot('context-restored');
}

// texture memory: iPhones get unhappy well before ~300 MB of GPU textures
log.textures = await page.evaluate(() => {
  let px = 0;
  let n = 0;
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
  const f = window.zbbq.ctl.state.furniture.find((f) => f.item === 'plant_dead') ?? window.zbbq.ctl.state.furniture.find((f) => f.item === 'table_diner');
  return { id: f.id, x: f.x, y: f.y };
});
const wp = isoW(pt.x, pt.y);
await tapWorld(wp.x, wp.y - 10);
await tapSel('.eb-btn[data-a="move"]', 'move');
const dest = await page.evaluate((pt) => {
  const { ctl } = window.zbbq;
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, 2], [-1, 1], [1, 1], [-2, 0]]) {
    ctl.movePlacement(pt.x + dx, pt.y + dy);
    if (!ctl.placementProblem()) {
      ctl.movePlacement(pt.x, pt.y);
      return { x: pt.x + dx, y: pt.y + dy };
    }
  }
  ctl.movePlacement(pt.x, pt.y);
  return null;
}, pt);
check(!!dest, 'a free tile to move it to');
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
  await shot('drag-move');
  await tapSel('.eb-btn[data-a="ok"]', 'confirm move');
  const moved = await page.evaluate((id) => {
    const f = window.zbbq.ctl.state.furniture.find((f) => f.id === id);
    return { x: f.x, y: f.y };
  }, pt.id);
  check(moved.x === dest.x && moved.y === dest.y, `drag moved it to ${dest.x},${dest.y} (got ${moved.x},${moved.y})`);
}
if (await page.locator('.eb-btn[data-a="desel"]').count()) await tapSel('.eb-btn[data-a="desel"]');
await tapSel('.eb-btn[data-a="done"]', 'done decorating');

// ---------- 9. come back two hours later ----------
await page.evaluate(() => {
  window.zbbq.ctl.save();
  const k = window.zbbq.sim.SAVE_KEY;
  const f = JSON.parse(localStorage.getItem(k));
  f.savedAt -= 2 * 3600 * 1000;
  localStorage.setItem(k, JSON.stringify(f));
  window.zbbq.ctl.save = () => {}; // don't let the unload save overwrite the doctored file
});
await page.reload();
await page.waitForFunction(() => window.zbbq?.game?.scene?.getScene('joint')?.ready, null, { timeout: 60000 });
await page.waitForFunction(() => /Welcome back/.test(document.querySelector('.modal h2')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => null);
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
