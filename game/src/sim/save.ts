import { TUNING } from './data';
import { catchUp } from './sim';
import { agePurple } from './todo';
import { createInitialState, migrate, type GameState } from './state';

export const SAVE_KEY = 'zombsbbq.save.v1';

export interface SaveFile {
  savedAt: number; // wall-clock ms
  state: GameState;
}

export function serialize(s: GameState, nowMs: number): string {
  const file: SaveFile = { savedAt: nowMs, state: { ...s, events: [] } };
  return JSON.stringify(file);
}

/**
 * Restore a save and fast-forward the joint by the real time that passed while the app was closed.
 * Returns a fresh game if the save is missing or from an incompatible version.
 */
export function deserialize(raw: string | null, nowMs: number): { state: GameState; offlineSec: number; offlineCash: number } {
  if (!raw) return { state: createInitialState(Math.floor(nowMs) % 2147483647), offlineSec: 0, offlineCash: 0 };
  try {
    const file = JSON.parse(raw) as SaveFile;
    const state = migrate(file?.state);
    if (!state) throw new Error('version');
    state.events = [];
    const offlineSec = Math.max(0, (nowMs - file.savedAt) / 1000);
    const offlineCash = offlineSec > 5 ? catchUp(state, offlineSec) : 0;
    // the purple-star timer runs on real time, beyond the offline simulation cap
    if (offlineSec > 5) agePurple(state, offlineSec - Math.min(offlineSec, TUNING.offlineCapSec));
    return { state, offlineSec, offlineCash };
  } catch {
    return { state: createInitialState(Math.floor(nowMs) % 2147483647), offlineSec: 0, offlineCash: 0 };
  }
}
