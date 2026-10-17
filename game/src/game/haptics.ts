/**
 * Haptic feedback. iOS Safari has no `navigator.vibrate`, so on the web this only buzzes on Android;
 * in the App Store build (Capacitor) the native Haptics plugin takes over, found at runtime on
 * `window.Capacitor.Plugins.Haptics` so the web bundle doesn't depend on it.
 */
export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface CapHaptics {
  impact(o: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
  notification(o: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }): Promise<void>;
}

const VIBRATE_MS: Record<HapticKind, number | number[]> = {
  light: 15,
  medium: 35,
  heavy: 60,
  success: [20, 40, 30],
  warning: [40, 60, 40],
  error: [60, 50, 60, 50, 60],
};

let enabled = true;
/** Players can switch buzzing off (a settings toggle, or reduced-motion preferences). */
export function setHaptics(on: boolean) {
  enabled = on;
}

export function haptic(kind: HapticKind = 'light') {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const cap = (window as unknown as { Capacitor?: { Plugins?: { Haptics?: CapHaptics } } }).Capacitor?.Plugins?.Haptics;
    if (cap) {
      const p =
        kind === 'success' || kind === 'warning' || kind === 'error'
          ? cap.notification({ type: kind.toUpperCase() as 'SUCCESS' | 'WARNING' | 'ERROR' })
          : cap.impact({ style: kind.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY' });
      void p.catch(() => undefined);
      return;
    }
    navigator.vibrate?.(VIBRATE_MS[kind]);
  } catch {
    /* no buzz is fine */
  }
}
