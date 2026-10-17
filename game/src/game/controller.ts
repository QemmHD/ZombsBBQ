import {
  BACKUP_EVERY_MS,
  BACKUP_SLOTS,
  DISH_BY_ID,
  ITEM_BY_ID,
  SAVE_KEY,
  TUNING,
  backupKey,
  buyAndPlace,
  buyWall,
  canPlace,
  catchUpReport,
  cookAt,
  deserialize,
  nextBackupSlot,
  orderEat,
  restTired,
  saveSummary,
  finishRaid,
  moveFurniture,
  moveWall,
  placeFromStorage,
  placeWallFromStorage,
  plateDish,
  serialize,
  startCooking,
  startRaid,
  stepRaid,
  tick,
  wake,
  wallSlotFree,
  dirsFor,
  onLawn,
  paintFloor,
  paintWall,
  setClosed,
  FLOOR_BY_ID,
  WALL_BY_ID,
  DOOR_X,
  dishAvailable,
  stoveCooks,
  isInside,
  type AwayReport,
  type Dir,
  type GameEvent,
  type GameState,
  type RaidResult,
  type RaidState,
  type RivalId,
} from '../sim';
import { sfx } from './sfx';

export type Selection =
  | { kind: 'worker'; id: string }
  | { kind: 'customer'; id: string }
  | { kind: 'stove'; id: string }
  | { kind: 'furniture'; id: string }
  | { kind: 'counter'; id: string }
  /** an empty stove was tapped: pick a dish (workerId: the cook picked first, else the nearest free one goes) */
  | { kind: 'dishPicker'; workerId?: string; stoveId: string }
  /** the Eat! order: the zombie is picked, now tap a customer */
  | { kind: 'eatPick'; workerId: string }
  | null;

export type Mode = 'play' | 'edit' | 'raid';

/** Something the camera should frame: a world point (scene units), or a thing in the café. */
export type FocusTarget = { x: number; y: number; zoom?: number } | { thing: import('./tutorial').TutTarget; zoom?: number } | { tile: { x: number; y: number } };

export interface Placement {
  itemId: string;
  source: 'buy' | 'storage' | 'move';
  /** furniture or wall-item being moved */
  id?: string;
  x: number;
  y: number;
  dir?: Dir;
  wall?: { wall: 'l' | 'r'; index: number };
}

export type EditSel = { kind: 'furn'; id: string } | { kind: 'wall'; id: string } | null;

/** Decorate-mode paint brush: tap wall segments or floor tiles to buy that finish for them. */
export interface Painting {
  kind: 'wall' | 'floor';
  finish: string;
}

type Listener = (ev: GameEvent) => void;

function storageGet(key = SAVE_KEY): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
/** Write and read back: false if the browser wouldn't keep it (storage full, private mode…). */
function storageSet(key: string, v: string): boolean {
  try {
    localStorage.setItem(key, v);
    return localStorage.getItem(key) === v;
  } catch {
    return false;
  }
}

/** A save that wouldn't load, waiting for the player to pick a backup or start fresh. */
export interface LoadProblem {
  backups: { slot: number; savedAt: number; level: number; cash: number; crew: number }[];
}

/** Glue between the sim, the Phaser scenes and the DOM HUD. */
export class Controller {
  state: GameState;
  mode: Mode = 'play';
  selection: Selection = null;
  placing: Placement | null = null;
  editSel: EditSel = null;
  painting: Painting | null = null;
  raid: RaidState | null = null;
  raidResult: RaidResult | null = null;
  /** the zombie picked in a raid (tap a zombie, then a target or ATTACK) */
  raidSel: string | null = null;
  offlineReport: AwayReport | null = null;
  /** the save couldn't be read: autosave is off until the player picks a backup or starts fresh */
  loadProblem: LoadProblem | null = null;
  private saveBlocked = false;
  private saveWarned = false;
  private lastBackupAt = 0;
  private frameErrorShown = false;
  private listeners: Listener[] = [];
  private selListeners: (() => void)[] = [];
  private modeListeners: ((m: Mode) => void)[] = [];
  private toastListeners: ((t: string) => void)[] = [];
  private saveTimer = 0;
  private hiddenAt = 0;
  private raidAcc = 0;
  /** reasons the café's clock is stopped (the tutorial bar is up…); empty = running */
  private holds = new Set<string>();
  private focusListeners: ((t: FocusTarget) => void)[] = [];
  /** the last dish cooked on each stove (the stove's ORDER button cooks it again) */
  lastDish = new Map<string, string>();

  constructor() {
    const raw = storageGet();
    const loaded = deserialize(raw, Date.now());
    this.state = loaded.state;
    if (loaded.failed && raw) {
      // keep the unreadable save, never write over it, and let the player choose what to do
      storageSet(`${SAVE_KEY}.corrupt.${Date.now()}`, raw);
      this.saveBlocked = true;
      this.loadProblem = { backups: this.backupList() };
    }
    // a brand-new joint starts like the original's: sign on CLOSED, the chef waiting by the front door
    if (!raw) this.freshStart();
    if (loaded.catchUpFailed) setTimeout(() => this.info('Welcome back! (The time you were away couldn’t be counted this once.)'), 1500);
    if (loaded.report && loaded.offlineSec > 60) this.offlineReport = loaded.report;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.hiddenAt = Date.now();
        this.save();
      } else if (this.hiddenAt) {
        const sec = (Date.now() - this.hiddenAt) / 1000;
        this.hiddenAt = 0;
        if (sec > 2 && this.mode !== 'raid') this.resume(sec);
      }
    });
    window.addEventListener('pagehide', () => this.save());
    // a crash anywhere: keep what we have (a save that can't be written just isn't)
    window.addEventListener('error', () => this.safeSave());
    window.addEventListener('unhandledrejection', () => this.safeSave());
  }

  /** Back from the background: the same fast-forward (and timers) as a cold start. */
  resume(sec: number) {
    try {
      const r = catchUpReport(this.state, sec);
      if (sec > 60) {
        this.offlineReport = r;
        this.emitSel();
      }
    } catch (e) {
      console.warn('catch-up failed', e);
    }
  }

  private safeSave() {
    try {
      this.save();
    } catch {
      /* nothing more we can do */
    }
  }

  /** The backups that can be loaded, newest first. */
  backupList(): LoadProblem['backups'] {
    const out: LoadProblem['backups'] = [];
    for (let i = 0; i < BACKUP_SLOTS; i++) {
      const sum = saveSummary(storageGet(backupKey(i)));
      if (sum) out.push({ slot: i, ...sum });
    }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  }

  /** Load a backup slot over the broken save (from the "Load backup" card). */
  loadBackup(slot: number): string | null {
    const got = deserialize(storageGet(backupKey(slot)), Date.now());
    if (got.failed) return 'That backup won’t load either.';
    this.replaceState(got.state);
    if (got.report && got.offlineSec > 60) this.offlineReport = got.report;
    return null;
  }

  /** Give up on the broken save and start a new joint (the broken one stays stored as .corrupt). */
  startFresh() {
    this.replaceState(deserialize(null, Date.now()).state);
    this.freshStart();
  }

  /** First launch: closed sign, YOU standing just inside the front door. */
  private freshStart() {
    const s = this.state;
    setClosed(s, true);
    const you = s.workers.find((w) => w.kind === 'you');
    // one step in from the doorway (standing in it would hold the door open)
    if (you && isInside(DOOR_X, 1, { w: s.roomW, h: s.roomH }) && !s.furniture.some((f) => f.x === DOOR_X && f.y === 1)) {
      you.x = DOOR_X;
      you.y = 1;
      you.path = [];
      you.facing = -1;
    }
  }

  // ----- the café's clock (the tutorial freezes it, like the original's dialogs) -----
  get frozen() {
    return this.holds.size > 0;
  }
  hold(reason: string, on: boolean) {
    if (on) this.holds.add(reason);
    else this.holds.delete(reason);
  }

  // ----- camera requests (the tutorial, a selection under the command strip) -----
  onFocus(l: (t: FocusTarget) => void) {
    this.focusListeners.push(l);
  }
  focus(t: FocusTarget) {
    for (const l of this.focusListeners) l(t);
  }

  private replaceState(st: GameState) {
    this.state = st;
    this.loadProblem = null;
    this.saveBlocked = false;
    this.raid = null;
    this.setMode('play');
    this.select(null);
    this.save();
  }

  // ----- subscriptions -----
  onEvent(l: Listener) {
    this.listeners.push(l);
  }
  onSelection(l: () => void) {
    this.selListeners.push(l);
  }
  onMode(l: (m: Mode) => void) {
    this.modeListeners.push(l);
  }
  onToast(l: (t: string) => void) {
    this.toastListeners.push(l);
  }
  toast(t: string | null, error = true) {
    if (!t) return;
    if (error) sfx('error');
    for (const l of this.toastListeners) l(t);
  }
  info(t: string) {
    for (const l of this.toastListeners) l(t);
  }
  emitSel() {
    for (const l of this.selListeners) l();
  }
  select(sel: Selection) {
    this.selection = sel;
    this.emitSel();
  }
  setMode(m: Mode) {
    if (m === this.mode) return;
    this.mode = m;
    this.selection = null;
    this.placing = null;
    this.editSel = null;
    this.painting = null;
    for (const l of this.modeListeners) l(m);
    this.emitSel();
  }

  // ----- loop -----
  update(dtSec: number) {
    try {
      this.step(dtSec);
    } catch (e) {
      // one bad frame must not freeze the game for good: report it once and keep going
      if (!this.frameErrorShown) {
        this.frameErrorShown = true;
        console.warn('frame error', e);
        this.safeSave();
      }
    }
  }

  private step(dtSec: number) {
    if (!this.frozen || this.mode === 'raid') tick(this.state, Math.min(dtSec, 0.1));
    if (this.raid && this.raid.phase === 'fight') {
      // fixed-step raid for determinism
      this.raidAcc += Math.min(dtSec, 0.1);
      while (this.raidAcc >= 0.05) {
        stepRaid(this.raid, 0.05);
        this.raidAcc -= 0.05;
      }
    }
    const evs = this.state.events.splice(0);
    for (const e of evs) for (const l of this.listeners) l(e);
    this.saveTimer += dtSec;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      this.save();
    }
  }

  save() {
    if (this.raid) return; // never save mid-raid: raiders would be stuck "out"
    if (this.saveBlocked) return; // the old save is broken: don't touch it until the player decides
    const now = Date.now();
    const data = serialize(this.state, now);
    const ok = storageSet(SAVE_KEY, data);
    if (!ok && !this.saveWarned) {
      this.saveWarned = true;
      this.info('Heads up: your progress can’t be saved on this device right now (storage full or private browsing).');
    }
    // a rotating backup every few minutes, verified like the main save
    if (ok && now - this.lastBackupAt >= BACKUP_EVERY_MS) {
      const slots = [...Array(BACKUP_SLOTS)].map((_, i) => storageGet(backupKey(i)));
      if (storageSet(backupKey(nextBackupSlot(slots)), data)) this.lastBackupAt = now;
    }
  }

  /** The "union break" toggle in Settings (on unless turned off). */
  setUnionBreak(on: boolean) {
    this.state.unionBreak = on;
    this.save();
  }

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.replaceState(deserialize(null, Date.now()).state);
    this.freshStart();
  }

  // ----- play-mode taps -----
  tapWorker(id: string) {
    const w = this.state.workers.find((x) => x.id === id);
    if (!w) return;
    sfx(w.kind === 'zombie' ? 'groan' : 'tap', { pitch: 0.8 + Math.random() * 0.5 });
    if (w.state === 'daydream') {
      wake(this.state, id);
      this.info(`${w.name} snaps out of it!`);
    }
    if (w.state === 'asleep') {
      wake(this.state, id);
      this.info(`${w.name} jolts awake. Still running on empty: rest or refill them!`);
    }
    this.select({ kind: 'worker', id });
  }

  tapCustomer(id: string) {
    const sel = this.selection;
    if (sel?.kind === 'eatPick') {
      // the Eat! order: this one's lunch
      const err = orderEat(this.state, sel.workerId, id);
      if (err) this.toast(err);
      else {
        sfx('groan', { pitch: 0.7 });
        this.info('Dinner time!');
      }
      this.select(null);
      return;
    }
    sfx('tap');
    this.select({ kind: 'customer', id });
  }

  /** The Eat! button: pick the zombie, then tap a customer. */
  beginEat(workerId: string) {
    sfx('open');
    this.select({ kind: 'eatPick', workerId });
  }

  /** Crew list: everyone under half energy goes out for a nap. */
  restAllTired(): number {
    const n = restTired(this.state);
    if (n) sfx('snore', { volume: 0.6 });
    this.info(n ? `${n} tired zombie${n > 1 ? 's' : ''} shuffle${n > 1 ? '' : 's'} out for a nap.` : 'Nobody’s tired right now.');
    this.emitSel();
    return n;
  }

  tapStove(stoveId: string) {
    const st = this.state.stoves.find((x) => x.id === stoveId);
    if (!st) return;
    if (st.status === 'done' || st.status === 'burnt') {
      const wasBurnt = st.status === 'burnt';
      const err = plateDish(this.state, stoveId);
      if (err) this.toast(err);
      else {
        sfx(wasBurnt ? 'sell' : 'plate');
        if (wasBurnt) this.info('Scraped off the charcoal. Money down the drain!');
      }
      this.select(null);
      return;
    }
    if (st.status === 'paused') {
      const sel = this.selection;
      if (sel?.kind === 'worker') {
        const err = startCooking(this.state, sel.id, stoveId);
        if (err) this.toast(err);
        else {
          sfx('purchase');
          this.info('Back on the stove!');
        }
        this.select(null);
      } else {
        this.toast('Nobody’s at this stove, so it stopped cooking. Tap a cook, then the stove.', false);
        this.select({ kind: 'stove', id: stoveId });
      }
      return;
    }
    if (st.status === 'cooking' || st.status === 'reserved') {
      sfx('tap');
      this.select({ kind: 'stove', id: stoveId });
      return;
    }
    // an empty stove: pick a dish (the selected cook goes, or else the nearest free one)
    const sel = this.selection;
    sfx('open');
    this.select({ kind: 'dishPicker', workerId: sel?.kind === 'worker' ? sel.id : undefined, stoveId });
  }

  chooseDish(dishId: string) {
    const sel = this.selection;
    if (sel?.kind !== 'dishPicker') return;
    const err = cookAt(this.state, sel.stoveId, dishId, sel.workerId);
    if (err) this.toast(err);
    else {
      this.lastDish.set(sel.stoveId, dishId);
      sfx('purchase');
      this.info(`Cooking ${DISH_BY_ID[dishId].name}!`);
    }
    this.select(err ? sel : null);
  }

  /** The dish ORDER would cook on this stove (the last one cooked here, if it can still be made). */
  reorderDish(stoveId: string): string | null {
    const st = this.state.stoves.find((x) => x.id === stoveId);
    const id = this.lastDish.get(stoveId);
    if (!st || !id || !DISH_BY_ID[id] || !stoveCooks(st, DISH_BY_ID[id].station) || !dishAvailable(this.state, id)) return null;
    return id;
  }

  /** ORDER on an empty stove: cook the last dish again (the nearest free cook goes). */
  orderAgain(stoveId: string) {
    const id = this.reorderDish(stoveId);
    if (!id) return this.toast('Nothing to repeat yet. Tap COOK and pick a dish.', false);
    const sel = this.selection;
    const err = cookAt(this.state, stoveId, id, sel?.kind === 'worker' ? sel.id : undefined);
    if (err) return this.toast(err);
    sfx('purchase');
    this.info(`Cooking ${DISH_BY_ID[id].name} again!`);
    this.select(null);
  }

  tapNothing() {
    if (this.selection) this.select(null);
  }

  /** The front door (or the sign button): open or close the café. */
  toggleClosed() {
    setClosed(this.state, !this.state.closed);
    sfx(this.state.closed ? 'close' : 'open');
    this.info(this.state.closed ? 'CLOSED. No new customers come in. The rating slowly sags while you’re shut.' : 'OPEN for business! Bring on the brains.');
    this.emitSel();
  }

  // ----- decorating -----
  enterEdit() {
    this.setMode('edit');
    sfx('open');
  }

  exitEdit() {
    this.setMode('play');
  }

  /** Start placing an item from the shop or storage (enters edit mode). */
  beginPlace(itemId: string, source: 'buy' | 'storage') {
    const def = ITEM_BY_ID[itemId];
    if (this.mode !== 'edit') this.setMode('edit');
    const s = this.state;
    this.painting = null;
    if (def.kind === 'wall') {
      const slot = this.firstFreeWall();
      if (!slot) return this.toast('No free wall space left!');
      this.placing = { itemId, source, x: 0, y: 0, wall: slot };
    } else {
      const dir = dirsFor(def)[0];
      const spot = this.firstFreeTile(itemId, dir) ?? { x: Math.floor(s.roomW / 2), y: Math.floor(s.roomH / 2) };
      this.placing = { itemId, source, x: spot.x, y: spot.y, dir };
      // bring the ghost into view, above the purchase panel
      this.focus({ tile: spot });
    }
    this.editSel = null;
    this.emitSel();
  }

  /** Pick a finish to paint with (walls or floor), from the shop. */
  beginPaint(kind: 'wall' | 'floor', finish: string) {
    if (this.mode !== 'edit') this.setMode('edit');
    this.placing = null;
    this.editSel = null;
    this.painting = { kind, finish };
    this.emitSel();
  }

  endPaint() {
    this.painting = null;
    this.emitSel();
  }

  /** Paint one wall segment ('l'/'r', index) or floor tile (x, y) with the current finish. */
  paintAt(a: 'l' | 'r' | number, b: number) {
    const p = this.painting;
    if (!p) return;
    const err = typeof a === 'number' ? paintFloor(this.state, a, b, p.finish) : paintWall(this.state, a, b, p.finish);
    if (err) {
      if (!/already/i.test(err)) this.toast(err);
      return;
    }
    sfx('place');
    this.emitSel();
  }

  paintName(): string {
    const p = this.painting;
    if (!p) return '';
    return (p.kind === 'wall' ? WALL_BY_ID : FLOOR_BY_ID)[p.finish]?.name ?? p.finish;
  }

  beginMove() {
    const sel = this.editSel;
    if (!sel) return;
    if (sel.kind === 'wall') {
      const w = this.state.wallItems.find((x) => x.id === sel.id);
      if (w) this.placing = { itemId: w.item, source: 'move', id: w.id, x: 0, y: 0, wall: { wall: w.wall, index: w.index } };
    } else {
      const f = this.state.furniture.find((x) => x.id === sel.id);
      if (f) this.placing = { itemId: f.item, source: 'move', id: f.id, x: f.x, y: f.y, dir: f.dir };
    }
    this.emitSel();
  }

  private firstFreeTile(itemId: string, dir?: Dir) {
    const s = this.state;
    const r = { w: s.roomW, h: s.roomH };
    const outdoor = ITEM_BY_ID[itemId].outdoor;
    // spiral out from the middle of the room (or of the front lawn, for outdoor things)
    const cx = outdoor ? s.roomW + 1 : Math.floor(s.roomW / 2);
    const cy = outdoor ? Math.floor(s.roomH / 2) : Math.floor(s.roomH / 2);
    const maxR = Math.max(s.roomW, s.roomH) + 4;
    for (let rad = 0; rad < maxR; rad++)
      for (let y = cy - rad; y <= cy + rad; y++)
        for (let x = cx - rad; x <= cx + rad; x++) {
          if (outdoor && !onLawn(x, y, r)) continue;
          if (!canPlace(s, itemId, x, y, dir)) return { x, y };
        }
    return null;
  }

  private firstFreeWall(): { wall: 'l' | 'r'; index: number } | null {
    const s = this.state;
    for (let i = 0; i < Math.max(s.roomW, s.roomH); i++)
      for (const wall of ['r', 'l'] as const) if (!wallSlotFree(s, wall, i)) return { wall, index: i };
    return null;
  }

  movePlacement(x: number, y: number) {
    if (!this.placing || this.placing.wall) return;
    if (x === this.placing.x && y === this.placing.y) return;
    this.placing.x = x;
    this.placing.y = y;
    this.emitSel();
  }

  moveWallPlacement(wall: 'l' | 'r', index: number) {
    if (!this.placing?.wall) return;
    if (this.placing.wall.wall === wall && this.placing.wall.index === index) return;
    this.placing.wall = { wall, index };
    this.emitSel();
  }

  rotatePlacement() {
    const p = this.placing;
    if (!p || p.wall) return;
    const dirs = dirsFor(ITEM_BY_ID[p.itemId]);
    if (dirs.length < 2) return this.toast('This one only goes one way.', false);
    p.dir = dirs[(dirs.indexOf(p.dir ?? dirs[0]) + 1) % dirs.length];
    sfx('rotate');
    this.emitSel();
  }

  /** Every floor tile the piece being placed could go on (the original's glowing green boxes). */
  placeableTiles(): { x: number; y: number }[] {
    const p = this.placing;
    if (!p || p.wall) return [];
    const s = this.state;
    const out: { x: number; y: number }[] = [];
    const outdoor = ITEM_BY_ID[p.itemId]?.outdoor;
    const x0 = outdoor ? -1 : 0;
    const x1 = outdoor ? s.roomW + 4 : s.roomW;
    const y1 = outdoor ? s.roomH + 4 : s.roomH;
    for (let y = x0; y < y1; y++)
      for (let x = x0; x < x1; x++) if (!canPlace(s, p.itemId, x, y, p.dir, p.source === 'move' ? p.id : undefined)) out.push({ x, y });
    return out;
  }

  /** Why the current placement can't be confirmed (null = good to go). */
  placementProblem(): string | null {
    const p = this.placing;
    if (!p) return null;
    const s = this.state;
    if (p.wall) return wallSlotFree(s, p.wall.wall, p.wall.index, p.source === 'move' ? p.id : undefined);
    return canPlace(s, p.itemId, p.x, p.y, p.dir, p.source === 'move' ? p.id : undefined);
  }

  confirmPlacement() {
    const p = this.placing;
    if (!p) return;
    const s = this.state;
    let err: string | null;
    if (p.wall) {
      err =
        p.source === 'buy'
          ? buyWall(s, p.itemId, p.wall.wall, p.wall.index)
          : p.source === 'storage'
            ? placeWallFromStorage(s, p.itemId, p.wall.wall, p.wall.index)
            : moveWall(s, p.id!, p.wall.wall, p.wall.index);
    } else {
      err =
        p.source === 'buy'
          ? buyAndPlace(s, p.itemId, p.x, p.y, p.dir)
          : p.source === 'storage'
            ? placeFromStorage(s, p.itemId, p.x, p.y, p.dir)
            : moveFurniture(s, p.id!, p.x, p.y, p.dir);
    }
    if (err) return this.toast(err);
    sfx(p.source === 'buy' ? 'purchase' : 'place');
    // buying pays its XP at once, with a float over the new piece (the original's "+2 XP")
    const xp = ITEM_BY_ID[p.itemId]?.xp ?? 0;
    if (p.source === 'buy' && xp > 0) s.events.push({ t: 'xp', x: p.wall ? (p.wall.wall === 'r' ? p.wall.index : 0) : p.x, y: p.wall ? (p.wall.wall === 'l' ? p.wall.index : 0) : p.y, amount: xp });
    this.placing = null;
    this.emitSel();
  }

  cancelPlacement() {
    this.placing = null;
    this.emitSel();
  }

  selectEdit(sel: EditSel) {
    this.editSel = sel;
    if (sel) sfx('tap');
    this.emitSel();
  }

  // ----- raids -----
  beginRaid(rivalId: RivalId, workerIds: string[], petIds: string[]): string | null {
    // save first: a save written after the squad has left would strand them "out on a raid"
    this.save();
    const r = startRaid(this.state, rivalId, workerIds, petIds);
    if (typeof r === 'string') return r;
    if (this.state.fridge.length >= TUNING.fridgeMax) this.info(`The fridge is full (${TUNING.fridgeMax}/${TUNING.fridgeMax}): stolen food will push out the oldest dishes. Bin or serve some first!`);
    r.hold = true; // the raid scene lifts this once its art has loaded
    this.raid = r;
    this.raidResult = null;
    this.raidSel = null;
    this.raidAcc = 0;
    this.setMode('raid');
    return null;
  }

  selectRaider(id: string | null) {
    this.raidSel = id;
    this.emitSel();
  }

  endRaid(): RaidResult | null {
    if (!this.raid) return null;
    const before = this.state.fridge.length;
    const res = finishRaid(this.state, this.raid);
    this.raidResult = res;
    // the fridge only holds so much: say what didn't fit
    const lost = before + res.dishes.length - this.state.fridge.length;
    if (lost > 0) this.info(`The fridge was full: ${lost} dish${lost > 1 ? 'es' : ''} got pushed out. Bin or serve food to make room.`);
    return res;
  }

  leaveRaid() {
    this.raid = null;
    this.raidSel = null;
    this.raidResult = null;
    this.setMode('play');
    this.save();
  }
}
