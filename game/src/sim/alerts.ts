/**
 * Check-in alerts: what's going to happen while the app is closed, worked out from the sim state, so
 * the HUD can schedule local notifications when the player leaves (dish done, about to burn, a zombie
 * back from a raid KO, a wrecked rival reopening). Pure: the notifier turns `in` (seconds from now)
 * into wall-clock times.
 */
import { DISH_BY_ID, TUNING } from './data';
import { RIVAL_BY_ID, rivalName, type RivalId } from './rivals';
import type { GameState } from './state';
import { furnById } from './sim';

export type AlertKind = 'dishDone' | 'burnSoon' | 'revived' | 'rivalOpen';

export interface Alert {
  /** stable per thing, so rescheduling replaces rather than duplicates */
  id: string;
  kind: AlertKind;
  /** seconds from now */
  in: number;
  title: string;
  body: string;
}

/** Most alerts worth scheduling at once (iOS caps pending local notifications at 64). */
export const MAX_ALERTS = 12;

/** The burn window of a finished dish (mirrors finishStove: its cook time, at least burnMinSec, heat lamps and frozen variants stretch it). */
function burnWindow(s: GameState, dishId: string, furnitureId: string): number {
  const dish = DISH_BY_ID[dishId];
  const f = furnById(s, furnitureId);
  return Math.max(TUNING.burnMinSec, dish.cookSec) * (f?.keepWarm ? TUNING.keepWarmFactor : 1) * (dish.burnMult ?? 1);
}

/** Everything worth a notification, soonest first. */
export function upcomingAlerts(s: GameState): Alert[] {
  const out: Alert[] = [];
  for (const st of s.stoves) {
    if (!st.dish) continue;
    const name = DISH_BY_ID[st.dish]?.name ?? 'food';
    let warnIn: number | undefined;
    if (st.status === 'cooking') {
      // only a dish with its cook standing at the stove keeps cooking
      const cook = s.workers.find((w) => w.id === st.cookId);
      if (!cook || cook.state !== 'cooking') continue;
      const left = Math.max(0, st.left ?? 0);
      out.push({ id: `done:${st.id}`, kind: 'dishDone', in: left, title: 'Order up!', body: `Your ${name} is done. Get it to the counter before it turns to charcoal.` });
      warnIn = left + burnWindow(s, st.dish, st.furnitureId) * 0.75;
    } else if (st.status === 'done' && st.burnWarn !== undefined) warnIn = st.burnWarn - s.now;
    if (warnIn !== undefined && warnIn > 0)
      out.push({ id: `burn:${st.id}`, kind: 'burnSoon', in: warnIn, title: 'Something smells smoky…', body: `The ${name} is about to burn. You’ve got minutes, Boss.` });
  }
  for (const w of s.workers) {
    if (w.state !== 'down' || w.downUntil === undefined || w.downUntil <= s.now) continue;
    out.push({ id: `up:${w.id}`, kind: 'revived', in: w.downUntil - s.now, title: 'Back from the dead (again)', body: `${w.name} is back on their feet. Mostly. Put ’em to work.` });
  }
  for (const [id, p] of Object.entries(s.rivals)) {
    if (id === 'boss' || !RIVAL_BY_ID[id] || !p.wins || p.nextAt <= s.now) continue;
    out.push({
      id: `rival:${id}`,
      kind: 'rivalOpen',
      in: p.nextAt - s.now,
      title: 'Raid time',
      body: `${rivalName(s, id as RivalId)} just reopened under new management. Full counter, weak door.`,
    });
  }
  return out.sort((a, b) => a.in - b.in).slice(0, MAX_ALERTS);
}
