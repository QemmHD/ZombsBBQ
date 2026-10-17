/**
 * The sound bed: which loops should be running right now, from the sim state alone (pure, tested),
 * and a tiny applier that tells the audio engine. Called from the HUD's 200 ms refresh.
 *
 *  - diner ambience while the joint is on screen (not during a raid);
 *  - one cooking loop per busy stove, keyed to the station kind, at most MAX_COOK_LOOPS at once
 *    (the longest-running ones win so a loop never flickers as stoves come and go);
 *  - everything ducked while a modal is up.
 */
import { audio, type LoopName } from '../audio';
import type { StationKind } from '../sim/data';
import type { GameState } from '../sim/state';

export const MAX_COOK_LOOPS = 2;
export const AMBIENCE_KEY = 'room';

export interface LoopPlan {
  key: string;
  name: LoopName;
  volume: number;
}

const STATION_LOOP: Record<StationKind, LoopName> = {
  stove: 'cookStove', grill: 'cookGrill', smoker: 'cookSmoker', fryer: 'cookFryer',
  cauldron: 'cookCauldron', kiln: 'cookKiln', pit: 'cookPit', tomb: 'cookTomb',
};

export function planLoops(s: GameState, mode: 'play' | 'edit' | 'raid'): LoopPlan[] {
  if (mode === 'raid') return [];
  const out: LoopPlan[] = [{ key: AMBIENCE_KEY, name: 'ambience', volume: s.closed ? 0.5 : 1 }];
  const busy = s.stoves
    .filter((st) => st.status === 'cooking' && st.cookId && st.total)
    // most progress first: a stove that just started never bumps one that's been sizzling for a while
    .sort((a, b) => (b.total! - (b.left ?? 0)) - (a.total! - (a.left ?? 0)) || a.id.localeCompare(b.id))
    .slice(0, MAX_COOK_LOOPS);
  for (const st of busy) out.push({ key: `stove:${st.id}`, name: STATION_LOOP[st.kind] ?? 'cookStove', volume: 1 });
  return out;
}

/** Push the plan into the engine (idempotent; cheap to call every refresh). */
export function applySoundscape(s: GameState, mode: 'play' | 'edit' | 'raid', modalOpen: boolean): void {
  try {
    audio.setDucked(modalOpen);
    const plan = planLoops(s, mode);
    const keep = new Set(plan.map((p) => p.key));
    for (const key of audio.loopKeys) if (!keep.has(key)) audio.stopLoop(key);
    for (const p of plan) audio.loop(p.key, p.name, p.volume);
  } catch {
    /* audio is a nice-to-have */
  }
}
