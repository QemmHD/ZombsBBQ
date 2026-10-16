/** Thin wrapper over the procedural audio engine so game code never crashes on audio problems. */
import { audio, type SfxName } from '../audio';

export function sfx(name: SfxName, opts?: { volume?: number; pitch?: number; pan?: number }) {
  try {
    audio.play(name, opts);
  } catch {
    /* audio is a nice-to-have */
  }
}

export function music(track: 'joint' | 'raid' | 'map' | null) {
  try {
    if (track) audio.music.play(track);
    else audio.music.stop();
  } catch {
    /* ignore */
  }
}

export function unlockAudio() {
  try {
    audio.unlock();
  } catch {
    /* ignore */
  }
}

export { audio };
