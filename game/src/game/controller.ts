import {
  DISH_BY_ID,
  SAVE_KEY,
  deserialize,
  plateDish,
  serialize,
  startCooking,
  tick,
  catchUp,
  wake,
  type GameEvent,
  type GameState,
} from '../sim';

export type Selection =
  | { kind: 'worker'; id: string }
  | { kind: 'customer'; id: string }
  | { kind: 'stove'; id: string }
  | { kind: 'dishPicker'; workerId: string; stoveId: string }
  | null;

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

/** Glue between the sim, the Phaser world and the DOM HUD. */
export class Controller {
  state: GameState;
  selection: Selection = null;
  offlineReport: { sec: number; cash: number } | null = null;
  private listeners: Listener[] = [];
  private selListeners: (() => void)[] = [];
  private toastListeners: ((t: string) => void)[] = [];
  private saveTimer = 0;
  private hiddenAt = 0;

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
        if (sec > 2) {
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

  onEvent(l: Listener) {
    this.listeners.push(l);
  }
  onSelection(l: () => void) {
    this.selListeners.push(l);
  }
  onToast(l: (t: string) => void) {
    this.toastListeners.push(l);
  }
  toast(t: string | null) {
    if (t) for (const l of this.toastListeners) l(t);
  }
  private emitSel() {
    for (const l of this.selListeners) l();
  }
  select(sel: Selection) {
    this.selection = sel;
    this.emitSel();
  }

  update(dtSec: number) {
    tick(this.state, Math.min(dtSec, 0.1));
    const evs = this.state.events.splice(0);
    for (const e of evs) for (const l of this.listeners) l(e);
    this.saveTimer += dtSec;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      this.save();
    }
  }

  save() {
    storageSet(serialize(this.state, Date.now()));
  }

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.state = deserialize(null, Date.now()).state;
    this.select(null);
  }

  // ----- taps from the world -----

  tapWorker(id: string) {
    const w = this.state.workers.find((x) => x.id === id);
    if (!w) return;
    if (w.state === 'daydream') {
      wake(this.state, id);
      this.toast(`${w.name} snaps out of it!`);
    }
    this.select({ kind: 'worker', id });
  }

  tapCustomer(id: string) {
    this.select({ kind: 'customer', id });
  }

  tapStove(stoveId: string) {
    const st = this.state.stoves.find((x) => x.id === stoveId);
    if (!st) return;
    if (st.status === 'done' || st.status === 'burnt') {
      const wasBurnt = st.status === 'burnt';
      const err = plateDish(this.state, stoveId);
      if (err) this.toast(err);
      else if (wasBurnt) this.toast('Scraped off the charcoal. Money down the drain!');
      this.select(null);
      return;
    }
    if (st.status === 'cooking' || st.status === 'reserved') {
      this.select({ kind: 'stove', id: stoveId });
      return;
    }
    const sel = this.selection;
    if (sel?.kind === 'worker') {
      this.select({ kind: 'dishPicker', workerId: sel.id, stoveId });
    } else {
      this.toast(`Tap a cook first (YOU or a zombie), then the ${st.kind}.`);
      this.select({ kind: 'stove', id: stoveId });
    }
  }

  chooseDish(dishId: string) {
    const sel = this.selection;
    if (sel?.kind !== 'dishPicker') return;
    const err = startCooking(this.state, sel.workerId, sel.stoveId, dishId);
    if (err) this.toast(err);
    else this.toast(`Cooking ${DISH_BY_ID[dishId].name}!`);
    this.select(err ? sel : null);
  }

  tapNothing() {
    if (this.selection) this.select(null);
  }
}
