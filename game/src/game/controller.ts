import {
  DISH_BY_ID,
  ITEM_BY_ID,
  SAVE_KEY,
  buyAndPlace,
  buyWall,
  canPlace,
  catchUp,
  deserialize,
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
  | { kind: 'dishPicker'; workerId: string; stoveId: string }
  | null;

export type Mode = 'play' | 'edit' | 'raid';

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

function storageGet(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}
function storageSet(v: string) {
  try {
    localStorage.setItem(SAVE_KEY, v);
  } catch {
    /* private mode / blocked storage: play on without saving */
  }
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
  offlineReport: { sec: number; cash: number } | null = null;
  private listeners: Listener[] = [];
  private selListeners: (() => void)[] = [];
  private modeListeners: ((m: Mode) => void)[] = [];
  private toastListeners: ((t: string) => void)[] = [];
  private saveTimer = 0;
  private hiddenAt = 0;
  private raidAcc = 0;

  constructor() {
    const loaded = deserialize(storageGet(), Date.now());
    this.state = loaded.state;
    if (loaded.offlineSec > 60) this.offlineReport = { sec: loaded.offlineSec, cash: loaded.offlineCash };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.hiddenAt = Date.now();
        this.save();
      } else if (this.hiddenAt) {
        const sec = (Date.now() - this.hiddenAt) / 1000;
        this.hiddenAt = 0;
        if (sec > 2 && this.mode !== 'raid') {
          const cash = catchUp(this.state, sec);
          if (sec > 60) {
            this.offlineReport = { sec, cash };
            this.emitSel();
          }
        }
      }
    });
    window.addEventListener('pagehide', () => this.save());
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
    tick(this.state, Math.min(dtSec, 0.1));
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
    storageSet(serialize(this.state, Date.now()));
  }

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.state = deserialize(null, Date.now()).state;
    this.raid = null;
    this.setMode('play');
    this.select(null);
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
    this.select({ kind: 'worker', id });
  }

  tapCustomer(id: string) {
    sfx('tap');
    this.select({ kind: 'customer', id });
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
    const sel = this.selection;
    if (sel?.kind === 'worker') {
      sfx('open');
      this.select({ kind: 'dishPicker', workerId: sel.id, stoveId });
    } else {
      this.toast(`Tap a cook first (YOU or a zombie), then the ${st.kind}.`, false);
      this.select({ kind: 'stove', id: stoveId });
    }
  }

  chooseDish(dishId: string) {
    const sel = this.selection;
    if (sel?.kind !== 'dishPicker') return;
    const err = startCooking(this.state, sel.workerId, sel.stoveId, dishId);
    if (err) this.toast(err);
    else {
      sfx('purchase');
      this.info(`Cooking ${DISH_BY_ID[dishId].name}!`);
    }
    this.select(err ? sel : null);
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
    const r = startRaid(this.state, rivalId, workerIds, petIds);
    if (typeof r === 'string') return r;
    this.save();
    this.raid = r;
    this.raidResult = null;
    this.raidAcc = 0;
    this.setMode('raid');
    return null;
  }

  endRaid(): RaidResult | null {
    if (!this.raid) return null;
    const res = finishRaid(this.state, this.raid);
    this.raidResult = res;
    return res;
  }

  leaveRaid() {
    this.raid = null;
    this.raidResult = null;
    this.setMode('play');
    this.save();
  }
}
