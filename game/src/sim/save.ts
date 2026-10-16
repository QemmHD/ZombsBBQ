import { catchUpReport, type AwayReport } from './sim';
import { createInitialState, migrate, type GameState } from './state';

export const SAVE_KEY = 'zombsbbq.save.v1';

/** Rotating backup copies of the save (written now and then, verified, used if the main save breaks). */
export const BACKUP_SLOTS = 3;
export const backupKey = (i: number) => `${SAVE_KEY}.backup${i}`;
/** How often a backup slot is refreshed (wall-clock ms). */
export const BACKUP_EVERY_MS = 3 * 60 * 1000;

export interface SaveFile {
  savedAt: number; // wall-clock ms
  state: GameState;
}

export interface Loaded {
  state: GameState;
  offlineSec: number;
  offlineCash: number;
  /** what happened while you were away (null when you weren't gone long) */
  report: AwayReport | null;
  /** there was a save, but it couldn't be read: nothing should overwrite it until the player decides */
  failed?: boolean;
}

export function serialize(s: GameState, nowMs: number): string {
  const file: SaveFile = { savedAt: nowMs, state: { ...s, events: [] } };
  return JSON.stringify(file);
}

/** Read a save file without touching it: null if it's missing or broken. */
export function parseSave(raw: string | null): SaveFile | null {
  if (!raw) return null;
  try {
    const file = JSON.parse(raw) as SaveFile;
    if (!file || typeof file !== 'object' || !file.state || typeof file.state !== 'object') return null;
    return file;
  } catch {
    return null;
  }
}

/** A one-line summary of a save (for the "Load backup" list); null if it can't be loaded. */
export function saveSummary(raw: string | null): { savedAt: number; level: number; cash: number; crew: number } | null {
  const file = parseSave(raw);
  if (!file) return null;
  const st = migrate(structuredClone(file.state));
  if (!st) return null;
  return { savedAt: file.savedAt, level: st.level, cash: Math.floor(st.cash), crew: st.workers.filter((w) => w.kind === 'zombie').length };
}

/** Which backup slot to write next: an empty one, else the oldest. */
export function nextBackupSlot(raws: (string | null)[]): number {
  let best = 0;
  let oldest = Infinity;
  for (let i = 0; i < BACKUP_SLOTS; i++) {
    const f = parseSave(raws[i] ?? null);
    if (!f) return i;
    if (f.savedAt < oldest) {
      oldest = f.savedAt;
      best = i;
    }
  }
  return best;
}

/**
 * Restore a save and fast-forward the joint by the real time that passed while the app was closed.
 * Returns a fresh game if there's no save; if there is one but it won't load, also a fresh game, flagged
 * `failed` (so the caller can offer a backup instead of overwriting it).
 */
export function deserialize(raw: string | null, nowMs: number): Loaded {
  const fresh = (failed?: boolean): Loaded => ({ state: createInitialState(Math.floor(nowMs) % 2147483647), offlineSec: 0, offlineCash: 0, report: null, ...(failed ? { failed } : {}) });
  if (!raw) return fresh();
  try {
    const file = JSON.parse(raw) as SaveFile;
    const state = migrate(file?.state);
    if (!state) throw new Error('version');
    state.events = [];
    const offlineSec = Math.max(0, (nowMs - file.savedAt) / 1000);
    // (time beyond the offline cap still counts for real-time timers: see skipTime)
    const report = offlineSec > 5 ? catchUpReport(state, offlineSec) : null;
    return { state, offlineSec, offlineCash: report?.cash ?? 0, report };
  } catch {
    return fresh(true);
  }
}
