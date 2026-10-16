import {
  CUSTOMERS,
  CUSTOMER_BY_ID,
  DISH_BY_ID,
  TUNING,
  attackThreshold,
  crewCapForLevel,
  walkSpeed,
  xpToNext,
} from './data';
import { DOOR_X, ROOM_N, findPath, key, type Pt } from './grid';
import { makeWorker, type Customer, type Furniture, type GameState, type Mover, type Stove, type Worker } from './state';

// ---------- helpers ----------

export function rand(s: GameState): number {
  // mulberry32, state kept in the save so runs are reproducible
  let t = (s.rng = (s.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const furnById = (s: GameState, id: string) => s.furniture.find((f) => f.id === id);

export function blockedTiles(s: GameState): Set<string> {
  const b = new Set<string>();
  for (const f of s.furniture) b.add(key(f.x, f.y));
  return b;
}

function isFree(x: number, y: number, blocked: Set<string>): boolean {
  return !blocked.has(key(x, y)) && x >= -4 && y >= -4;
}

/** Tile a worker stands on to use a piece of furniture. */
export function accessTile(s: GameState, f: Furniture): Pt {
  const blocked = blockedTiles(s);
  const cands =
    f.kind === 'counter'
      ? [{ x: f.x + 1, y: f.y }]
      : [
          { x: f.x, y: f.y + 1 },
          { x: f.x + 1, y: f.y },
          { x: f.x - 1, y: f.y },
          { x: f.x, y: f.y - 1 },
        ];
  return cands.find((c) => isFree(c.x, c.y, blocked) && c.x >= 0 && c.y >= 0 && c.x < ROOM_N && c.y < ROOM_N) ?? cands[0];
}

function seatNeighbor(s: GameState, seat: Furniture): Pt {
  const blocked = blockedTiles(s);
  const cands = [
    { x: seat.x - 1, y: seat.y },
    { x: seat.x + 1, y: seat.y },
    { x: seat.x, y: seat.y + seat.side! },
  ];
  return cands.find((c) => isFree(c.x, c.y, blocked)) ?? cands[0];
}

function setPath(s: GameState, m: Mover, goal: Pt, speed: number): boolean {
  const p = findPath({ x: m.x, y: m.y }, goal, blockedTiles(s));
  if (!p) return false;
  // snap to tile so paths stay on the grid
  m.path = p;
  m.speed = speed;
  return true;
}

/** Advance along the path; returns true when the path is finished. */
function move(m: Mover, dt: number): boolean {
  let budget = m.speed * dt;
  while (m.path.length && budget > 0) {
    const t = m.path[0];
    const dx = t.x - m.x;
    const dy = t.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.001) {
      const sdx = dx - dy; // screen-space horizontal direction in iso
      if (Math.abs(sdx) > 0.01) m.facing = sdx > 0 ? 1 : -1;
    }
    if (d <= budget) {
      m.x = t.x;
      m.y = t.y;
      budget -= d;
      m.path.shift();
    } else {
      m.x += (dx / d) * budget;
      m.y += (dy / d) * budget;
      budget = 0;
    }
  }
  return m.path.length === 0;
}

function faceTowards(m: Mover, x: number, y: number) {
  const sdx = x - m.x - (y - m.y);
  if (Math.abs(sdx) > 0.01) m.facing = sdx > 0 ? 1 : -1;
}

export function stars(s: GameState): number {
  const service = 0.5 + (s.ratingPts / 100) * 4.5;
  const decor = 1 + decorPoints(s) / 20;
  return Math.max(0.5, Math.floor(Math.min(service, decor, 5) * 2) / 2);
}

export function decorPoints(s: GameState): number {
  const pts: Record<string, number> = { table: 3, bench: 1, counter: 1, fridge: 2, plant: 4, keg: 3, grill: 1, smoker: 2 };
  return s.furniture.reduce((a, f) => a + (f.locked ? 0 : pts[f.kind] ?? 0), 0);
}

function addRating(s: GameState, d: number) {
  s.ratingPts = Math.max(0, Math.min(100, s.ratingPts + d));
}

export function addXp(s: GameState, amount: number) {
  s.xp += amount;
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    s.crewCap = Math.max(s.crewCap, crewCapForLevel(s.level));
    for (const f of s.furniture) if (f.kind === 'smoker' && s.level >= 4) f.locked = false;
    s.events.push({ t: 'levelup', level: s.level });
  }
}

const spawnPoint = (s: GameState): Pt => ({ x: rand(s) < 0.5 ? DOOR_X + 4 : DOOR_X - 4, y: -2 });

export const zombies = (s: GameState) => s.workers.filter((w) => w.kind === 'zombie');

// ---------- player actions (all validate and return an error string or null) ----------

export function startCooking(s: GameState, workerId: string, stoveId: string, dishId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  const st = s.stoves.find((x) => x.id === stoveId);
  const dish = DISH_BY_ID[dishId];
  if (!w || !st || !dish) return 'Nope.';
  const f = furnById(s, st.furnitureId)!;
  if (f.locked) return `The ${st.kind} unlocks at level 4.`;
  if (st.status !== 'empty') return 'That station is busy.';
  if (dish.station !== st.kind) return `${dish.name} needs the ${dish.station}.`;
  if (dish.level > s.level) return `Unlocks at level ${dish.level}.`;
  if (s.cash < dish.cost) return 'Not enough cash!';
  if (w.state === 'cooking') return `${w.name} is already cooking.`;
  if (w.state === 'resting' && w.energy < w.stats.energy * 0.5) return `${w.name} is too tired.`;
  releaseJob(s, w);
  s.cash -= dish.cost;
  st.status = 'reserved';
  st.cookId = w.id;
  st.dish = dish.id;
  w.stoveId = st.id;
  w.pendingDish = dish.id;
  w.state = 'toStove';
  if (!setPath(s, w, accessTile(s, f), walkSpeed(w.stats.speed))) w.path = [];
  return null;
}

export function plateDish(s: GameState, stoveId: string): string | null {
  const st = s.stoves.find((x) => x.id === stoveId);
  if (!st) return 'Nope.';
  if (st.status === 'burnt') {
    st.status = 'empty';
    st.dish = undefined;
    return null;
  }
  if (st.status !== 'done' || !st.dish) return null;
  const dish = DISH_BY_ID[st.dish];
  const slot = s.counter.find((c) => c.dish === dish.id) ?? s.counter.find((c) => !c.dish || c.servings <= 0);
  if (!slot) return 'The counter is full!';
  slot.dish = dish.id;
  slot.servings += dish.servings;
  st.status = 'empty';
  st.dish = undefined;
  st.doneAt = st.burnAt = undefined;
  return null;
}

export function infectCost(s: GameState, c: Customer): { cash: number; sauce: number } {
  if (s.freeInfects > 0) return { cash: 0, sauce: 0 };
  const def = CUSTOMER_BY_ID[c.type];
  return { cash: def.infect.cash ?? 0, sauce: def.infect.sauce ?? 0 };
}

export function infect(s: GameState, customerId: string): string | null {
  const c = s.customers.find((x) => x.id === customerId);
  if (!c || !['entering', 'waiting', 'eating'].includes(c.state)) return 'Too late, they left!';
  if (zombies(s).length >= s.crewCap) return `Crew is full (${s.crewCap}/${s.crewCap}). Level up for more!`;
  const cost = infectCost(s, c);
  if (s.cash < cost.cash) return 'Not enough cash!';
  if (s.sauce < cost.sauce) return 'Not enough Brain Sauce!';
  s.cash -= cost.cash;
  s.sauce -= cost.sauce;
  if (s.freeInfects > 0) s.freeInfects--;
  dropServer(s, c);
  c.state = 'infecting';
  c.path = [];
  c.infectEnd = s.now + 1.6;
  return null;
}

export function rest(s: GameState, workerId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return 'Nope.';
  if (w.state === 'cooking') return `${w.name} is busy cooking.`;
  releaseJob(s, w);
  // sprawl out on the front lawn, like the original
  const taken = new Set(s.workers.filter((o) => o.restSpot && o !== w).map((o) => key(o.restSpot!.x, o.restSpot!.y)));
  let spot: Pt = { x: ROOM_N, y: 1 };
  for (let i = 0; i < 16; i++) {
    const cand = i < 8 ? { x: ROOM_N + (i % 2), y: 1 + Math.floor(i / 2) * 2 } : { x: 1 + (i - 8), y: ROOM_N + 1 };
    if (!taken.has(key(cand.x, cand.y))) {
      spot = cand;
      break;
    }
  }
  w.restSpot = spot;
  w.state = 'toRest';
  setPath(s, w, spot, walkSpeed(w.stats.speed));
  return null;
}

export function wake(s: GameState, workerId: string) {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return;
  if (w.state === 'resting' || w.state === 'toRest' || w.state === 'daydream') {
    w.state = 'idle';
    w.restSpot = undefined;
    w.path = [];
    w.nextDaydream = s.now + daydreamInterval(s, w);
  }
}

export function refill(s: GameState, workerId: string): string | null {
  const w = s.workers.find((x) => x.id === workerId);
  if (!w) return 'Nope.';
  if (s.sauce < 1) return 'Not enough Brain Sauce!';
  if (w.energy >= w.stats.energy) return `${w.name} is already full of beans. And brains.`;
  s.sauce -= 1;
  w.energy = w.stats.energy;
  if (w.state === 'resting' || w.state === 'toRest') wake(s, w.id);
  return null;
}

// ---------- simulation ----------

function daydreamInterval(s: GameState, w: Worker): number {
  return TUNING.daydreamBaseSec * w.stats.focus * (0.5 + rand(s));
}

function releaseJob(s: GameState, w: Worker) {
  if (w.job) {
    const slot = s.counter.find((c) => c.id === w.job!.slotId);
    if (slot && (slot.dish === w.job.dish || !slot.dish || slot.servings <= 0)) {
      slot.dish = w.job.dish;
      slot.servings += 1;
    }
    const c = s.customers.find((x) => x.id === w.job!.customerId);
    if (c && c.serverId === w.id) c.serverId = undefined;
    w.job = undefined;
  }
  if (w.state === 'toStove' && w.stoveId) {
    const st = s.stoves.find((x) => x.id === w.stoveId);
    if (st && st.status === 'reserved') {
      st.status = 'empty';
      if (st.dish) s.cash += DISH_BY_ID[st.dish].cost;
      st.dish = undefined;
    }
    w.stoveId = undefined;
  }
  w.targetId = undefined;
  w.restSpot = undefined;
  w.path = [];
  w.state = 'idle';
}

function dropServer(s: GameState, c: Customer) {
  if (!c.serverId) return;
  const w = s.workers.find((x) => x.id === c.serverId);
  if (w && w.job?.customerId === c.id) releaseJob(s, w);
  c.serverId = undefined;
}

function leave(s: GameState, c: Customer, mood: 'happy' | 'angry', fast = false) {
  dropServer(s, c);
  c.mood = mood;
  c.state = fast ? 'fleeing' : 'leaving';
  c.seatId = undefined;
  if (mood === 'happy') {
    addRating(s, TUNING.ratingHappy);
    s.stats.happy++;
  } else {
    addRating(s, fast ? 0 : TUNING.ratingAngry);
    s.stats.angry++;
  }
  s.events.push({ t: 'face', x: c.x, y: c.y, happy: mood === 'happy' });
  setPath(s, c, spawnPoint(s), fast ? TUNING.fleeSpeed : walkSpeed(4));
}

function freeSeats(s: GameState): Furniture[] {
  const taken = new Set(s.customers.filter((c) => c.seatId).map((c) => c.seatId));
  return s.furniture.filter((f) => f.kind === 'bench' && !taken.has(f.id));
}

function spawnCustomers(s: GameState, dt: number) {
  s.spawnCooldown -= dt;
  if (s.spawnCooldown > 0) return;
  // the original: roughly 1 customer inside per half-star of rating, +1
  const target = 1 + Math.round(stars(s) * 2);
  const present = s.customers.filter((c) => ['entering', 'waiting', 'eating'].includes(c.state)).length;
  s.spawnCooldown = 3 + rand(s) * 5;
  if (present >= target) return;
  const st = stars(s);
  const pool = CUSTOMERS.filter((d) => d.minLevel <= s.level && d.minStars <= st);
  let r = rand(s) * pool.reduce((a, d) => a + d.weight, 0);
  const def = pool.find((d) => (r -= d.weight) < 0) ?? pool[0];
  const at = spawnPoint(s);
  const c: Customer = {
    id: `c${s.nextId++}`,
    type: def.id,
    state: 'entering',
    x: at.x,
    y: at.y,
    path: [],
    speed: 0,
    facing: 1,
    waitLeft: TUNING.customerWaitSec,
    eatEnd: 0,
  };
  s.customers.push(c);
  const seats = freeSeats(s);
  if (!seats.length) {
    // arriving to a full house: walk in, look around, leave unhappy (like the original)
    c.state = 'turnedAway';
    setPath(s, c, { x: DOOR_X, y: 1 }, walkSpeed(4));
    return;
  }
  const seat = seats[Math.floor(rand(s) * seats.length)];
  c.seatId = seat.id;
  setPath(s, c, { x: seat.x, y: seat.y }, walkSpeed(4));
}

function updateCustomer(s: GameState, c: Customer, dt: number) {
  switch (c.state) {
    case 'entering': {
      if (move(c, dt)) {
        c.state = 'waiting';
        const seat = furnById(s, c.seatId!);
        if (seat) faceTowards(c, seat.x, seat.y - seat.side!);
      }
      break;
    }
    case 'turnedAway':
      if (move(c, dt)) leave(s, c, 'angry');
      break;
    case 'waiting':
      if (!c.serverId) c.waitLeft -= dt;
      if (c.waitLeft <= 0) leave(s, c, 'angry');
      break;
    case 'eating':
      if (s.now >= c.eatEnd) {
        const def = CUSTOMER_BY_ID[c.type];
        const dish = DISH_BY_ID[c.dish!];
        const server = s.workers.find((w) => w.id === c.serverId);
        const amount = Math.round(dish.price * def.spend);
        const tip = server ? Math.round((amount * server.stats.tips) / 50 + (rand(s) < server.stats.tips / 20 ? 1 : 0)) : 0;
        s.cash += amount + tip;
        s.stats.earned += amount + tip;
        s.stats.served++;
        s.events.push({ t: 'coin', x: c.x, y: c.y, amount, tip });
        addXp(s, 1);
        c.serverId = undefined;
        leave(s, c, 'happy');
      }
      break;
    case 'leaving':
    case 'fleeing':
      if (move(c, dt)) markGone(c);
      break;
    case 'infecting':
      if (s.now >= (c.infectEnd ?? 0)) {
        const w = makeWorker(s, 'zombie', c.type, { x: Math.round(c.x), y: Math.round(c.y) });
        w.facing = c.facing;
        s.workers.push(w);
        s.stats.infected++;
        s.events.push({ t: 'infected', workerId: w.id });
        markGone(c);
      }
      break;
  }
}

const GONE = -9999;
function markGone(c: Customer) {
  c.x = GONE;
}

function findServeJob(s: GameState, w: Worker): { slotId: string; customer: Customer } | null {
  const slot = [...s.counter].filter((c) => c.dish && c.servings > 0).sort((a, b) => b.servings - a.servings)[0];
  if (!slot) return null;
  let best: Customer | null = null;
  let bestD = Infinity;
  for (const c of s.customers) {
    if (c.state !== 'waiting' || c.serverId) continue;
    const d = Math.abs(c.x - w.x) + Math.abs(c.y - w.y) - (TUNING.customerWaitSec - c.waitLeft) * 0.2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best ? { slotId: slot.id, customer: best } : null;
}

function updateWorker(s: GameState, w: Worker, dt: number) {
  const max = w.stats.energy;
  switch (w.state) {
    case 'idle': {
      if (w.kind === 'zombie' && w.energy <= max * attackThreshold(w.stats.patience)) {
        // HANGRY: go bite the nearest customer
        const prey = s.customers
          .filter((c) => c.state === 'waiting' || c.state === 'eating')
          .sort((a, b) => Math.abs(a.x - w.x) + Math.abs(a.y - w.y) - (Math.abs(b.x - w.x) + Math.abs(b.y - w.y)))[0];
        if (prey) {
          const seat = prey.seatId ? furnById(s, prey.seatId) : undefined;
          w.targetId = prey.id;
          w.state = 'hunting';
          setPath(s, w, seat ? seatNeighbor(s, seat) : { x: Math.round(prey.x), y: Math.round(prey.y) }, walkSpeed(w.stats.speed) * 1.3);
          break;
        }
      }
      if (w.kind === 'zombie' && s.now >= w.nextDaydream) {
        w.state = 'daydream';
        w.daydreamEnd = s.now + TUNING.daydreamMaxSec * (0.5 + rand(s) * 0.5);
        break;
      }
      const job = findServeJob(s, w);
      if (job) {
        const slot = s.counter.find((c) => c.id === job.slotId)!;
        slot.servings -= 1;
        w.job = { slotId: slot.id, dish: slot.dish!, customerId: job.customer.id };
        if (slot.servings <= 0) slot.dish = undefined;
        job.customer.serverId = w.id;
        w.state = 'toCounter';
        setPath(s, w, accessTile(s, furnById(s, slot.furnitureId)!), walkSpeed(w.stats.speed));
      }
      break;
    }
    case 'toStove': {
      if (move(w, dt)) {
        const st = s.stoves.find((x) => x.id === w.stoveId);
        if (!st || !w.pendingDish) {
          w.state = 'idle';
          break;
        }
        const dish = DISH_BY_ID[w.pendingDish];
        const f = furnById(s, st.furnitureId)!;
        faceTowards(w, f.x, f.y);
        st.status = 'cooking';
        st.doneAt = s.now + dish.cookSec;
        w.state = 'cooking';
        w.pendingDish = undefined;
      }
      break;
    }
    case 'cooking': {
      w.energy = Math.max(0, w.energy - TUNING.energyCookPerSec * dt);
      const st = s.stoves.find((x) => x.id === w.stoveId);
      if (!st || st.status !== 'cooking') {
        w.state = 'idle';
        w.stoveId = undefined;
      }
      break;
    }
    case 'toCounter': {
      const c = s.customers.find((x) => x.id === w.job?.customerId);
      if (!c || c.state !== 'waiting') {
        releaseJob(s, w);
        break;
      }
      if (move(w, dt)) {
        const seat = furnById(s, c.seatId!);
        w.state = 'carrying';
        setPath(s, w, seat ? seatNeighbor(s, seat) : { x: Math.round(c.x), y: Math.round(c.y) }, walkSpeed(w.stats.speed));
      }
      break;
    }
    case 'carrying': {
      const c = s.customers.find((x) => x.id === w.job?.customerId);
      if (!c || c.state !== 'waiting') {
        releaseJob(s, w);
        break;
      }
      if (move(w, dt)) {
        faceTowards(w, c.x, c.y);
        c.state = 'eating';
        c.dish = w.job!.dish;
        c.eatEnd = s.now + TUNING.eatSec;
        w.job = undefined;
        w.energy = Math.max(0, w.energy - TUNING.energyPerServe);
        w.state = 'idle';
      }
      break;
    }
    case 'hunting': {
      const c = s.customers.find((x) => x.id === w.targetId);
      if (!c || !(c.state === 'waiting' || c.state === 'eating')) {
        w.state = 'idle';
        w.targetId = undefined;
        break;
      }
      if (move(w, dt)) {
        faceTowards(w, c.x, c.y);
        s.events.push({ t: 'bite', x: c.x, y: c.y, workerId: w.id, customerId: c.id });
        s.stats.bites++;
        addRating(s, TUNING.ratingAttack);
        w.energy = Math.min(max, w.energy + TUNING.biteEnergyGain);
        w.state = 'idle';
        w.targetId = undefined;
        leave(s, c, 'angry', true);
      }
      break;
    }
    case 'toRest':
      if (move(w, dt)) w.state = 'resting';
      break;
    case 'resting': {
      const keg = s.furniture.some((f) => f.kind === 'keg') ? TUNING.kegMultiplier : 1;
      w.energy = Math.min(max, w.energy + TUNING.restRegenPerSec * keg * dt);
      if (w.energy >= max) wake(s, w.id);
      break;
    }
    case 'daydream':
      if (s.now >= (w.daydreamEnd ?? 0)) wake(s, w.id);
      break;
  }
}

function updateStove(s: GameState, st: Stove) {
  if (st.status === 'cooking' && s.now >= (st.doneAt ?? Infinity)) {
    const dish = DISH_BY_ID[st.dish!];
    st.status = 'done';
    st.burnAt = s.now + dish.cookSec * TUNING.burnFactor + 15;
    addXp(s, dish.xp);
    const f = furnById(s, st.furnitureId)!;
    s.events.push({ t: 'xp', x: f.x, y: f.y, amount: dish.xp });
    s.events.push({ t: 'dishDone', stoveId: st.id });
    const cook = s.workers.find((w) => w.id === st.cookId);
    if (cook && cook.state === 'cooking') {
      cook.state = 'idle';
      cook.stoveId = undefined;
    }
  } else if (st.status === 'done' && s.now >= (st.burnAt ?? Infinity)) {
    st.status = 'burnt';
    s.events.push({ t: 'burnt', stoveId: st.id });
  }
}

export const TUTORIAL = [
  'Tap YOU, then tap the Grill to start cooking.',
  'Your food is cooking… you can tap the grill to see the timer.',
  'Done! Tap the food on the grill to move it to the serving counter.',
  'Customers eat from the counter. Whoever is free serves them.',
  "Now give a customer a little nibble: tap one, then INFECT. (This one's on the house!)",
  'Your first zombie! Tap them, then tap the Grill to make them cook.',
  'Watch the Energy bars. Tired zombies bite customers! Tap a zombie → REST.',
];

function updateTutorial(s: GameState, dt: number) {
  const anyStove = (st: string) => s.stoves.some((x) => x.status === st);
  switch (s.tut) {
    case 0:
      if (anyStove('reserved') || anyStove('cooking')) s.tut = 1;
      break;
    case 1:
      if (anyStove('done')) s.tut = 2;
      break;
    case 2:
      if (s.counter.some((c) => c.servings > 0)) s.tut = 3;
      break;
    case 3:
      if (s.stats.served > 0) s.tut = 4;
      break;
    case 4:
      if (zombies(s).length > 0) s.tut = 5;
      break;
    case 5:
      if (s.stoves.some((st) => st.cookId && s.workers.find((w) => w.id === st.cookId)?.kind === 'zombie' && st.status !== 'empty'))
        s.tut = 6;
      break;
    case 6:
      s.tutTimer += dt;
      if (s.tutTimer > 45 || s.workers.some((w) => w.state === 'resting' || w.state === 'toRest')) s.tut = 7;
      break;
  }
}

export function tick(s: GameState, dt: number) {
  s.now += dt;
  for (const st of s.stoves) updateStove(s, st);
  spawnCustomers(s, dt);
  for (const c of s.customers) updateCustomer(s, c, dt);
  s.customers = s.customers.filter((c) => c.x !== GONE);
  for (const w of s.workers) updateWorker(s, w, dt);
  updateTutorial(s, dt);
  if (s.events.length > 200) s.events.splice(0, s.events.length - 200);
}

/** Offline catch-up: fast-forward in coarse steps, capped like the design says. */
export function catchUp(s: GameState, seconds: number): number {
  const total = Math.min(Math.max(0, seconds), TUNING.offlineCapSec);
  const step = 1;
  let left = total;
  const cash0 = s.cash;
  while (left > 0) {
    const d = Math.min(step, left);
    tick(s, d);
    left -= d;
  }
  s.events.length = 0;
  return s.cash - cash0;
}
