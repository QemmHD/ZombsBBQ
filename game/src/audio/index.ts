// Zombs BBQ audio: every sound is synthesized at runtime with the Web Audio API (no files).
//
//   import { audio } from './audio';
//   pointer handler:  audio.unlock();            // first touch; safe to call on every tap
//   audio.play('coin', { pitch: 1.1, pan: -0.3 });
//   audio.music.play('joint');                   // remembered and started once unlocked
//
// Importing this module never touches `window` / `AudioContext`, so it is safe in Node tests.

import { barSeconds, getSong, MUSIC_TRACKS, TrackPlayer, type MusicTrack } from './music';
import { SFX, SFX_NAMES, type SfxName } from './sfx';
import { mulberry32, type Voice } from './synth';

export { SFX_NAMES, MUSIC_TRACKS };
export type { SfxName, MusicTrack };

export interface PlayOpts {
  /** 0..1+ multiplier on top of the SFX volume */
  volume?: number;
  /** pitch multiplier, 1 = as designed (also picks a zombie's groan voice) */
  pitch?: number;
  /** -1 (left) .. 1 (right) */
  pan?: number;
}

export interface AudioSettings {
  sfx: number;
  music: number;
  muted: boolean;
}

export const STORAGE_KEY = 'zombsbbq.audio';
export const MAX_VOICES = 12;
const DEFAULTS: AudioSettings = { sfx: 0.8, music: 0.55, muted: false };
const CROSSFADE = 1.2;
const LOOKAHEAD = 0.15;
const TIMER_MS = 25;

type ACCtor = new (opts?: AudioContextOptions) => AudioContext;
type OACCtor = new (channels: number, length: number, sampleRate: number) => OfflineAudioContext;

function g(): Record<string, unknown> {
  return globalThis as unknown as Record<string, unknown>;
}

function audioCtor(): ACCtor | undefined {
  try {
    return (g().AudioContext ?? g().webkitAudioContext) as ACCtor | undefined;
  } catch {
    return undefined;
  }
}

function storage(): Storage | null {
  try {
    return (g().localStorage as Storage | undefined) ?? null;
  } catch {
    return null;
  }
}

function doc(): Document | null {
  try {
    return typeof document !== 'undefined' ? document : null;
  } catch {
    return null;
  }
}

const clamp01 = (v: unknown, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d;

interface ActiveVoice {
  name: SfxName;
  end: number;
  gain: GainNode;
  tail: AudioNode;
}

export class MusicController {
  /** Track the game wants playing (kept even while locked/muted). */
  current: MusicTrack | null = null;
  constructor(private readonly engine: AudioEngine) {}
  play(track: MusicTrack): void {
    if (!MUSIC_TRACKS.includes(track)) return;
    if (this.current === track && this.engine.musicRunning(track)) return;
    this.current = track;
    this.engine.syncMusic();
  }
  stop(): void {
    this.current = null;
    this.engine.syncMusic();
  }
}

export class AudioEngine {
  readonly music: MusicController;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private settings: AudioSettings;
  private voices: ActiveVoice[] = [];
  private lastPlay = new Map<SfxName, number>();
  private isUnlocked = false;
  private resuming = false;
  private listening = false;
  private player: TrackPlayer | null = null;
  private playerTrack: MusicTrack | null = null;
  private fading: TrackPlayer[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly storageKey = STORAGE_KEY) {
    this.music = new MusicController(this);
    this.settings = this.load();
  }

  // --- settings --------------------------------------------------------------------------

  get muted(): boolean {
    return this.settings.muted;
  }
  get sfxVolume(): number {
    return this.settings.sfx;
  }
  get musicVolume(): number {
    return this.settings.music;
  }
  get unlocked(): boolean {
    return this.isUnlocked;
  }
  /** Context state ('none' before unlock). */
  get state(): string {
    return this.ctx ? this.ctx.state : 'none';
  }
  get voiceCount(): number {
    return this.voices.length;
  }

  setSfxVolume(v: number): void {
    this.settings.sfx = clamp01(v, this.settings.sfx);
    this.save();
    if (this.ctx && this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.settings.sfx, this.ctx.currentTime, 0.02);
  }

  setMusicVolume(v: number): void {
    this.settings.music = clamp01(v, this.settings.music);
    this.save();
    if (this.ctx && this.musicBus) this.musicBus.gain.setTargetAtTime(this.settings.music, this.ctx.currentTime, 0.05);
  }

  setMuted(m: boolean): void {
    this.settings.muted = !!m;
    this.save();
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (m) {
      this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
      // suspend once faded so a muted game costs no audio CPU / battery
      setTimeout(() => {
        if (this.settings.muted && this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
      }, 120);
    } else {
      this.master.gain.setTargetAtTime(1, ctx.currentTime, 0.015);
      this.resume();
    }
    this.syncMusic();
  }

  private load(): AudioSettings {
    const s = { ...DEFAULTS };
    try {
      const raw = storage()?.getItem(this.storageKey);
      if (raw) {
        const o = JSON.parse(raw) as Partial<AudioSettings>;
        s.sfx = clamp01(o.sfx, s.sfx);
        s.music = clamp01(o.music, s.music);
        s.muted = typeof o.muted === 'boolean' ? o.muted : s.muted;
      }
    } catch {
      /* storage blocked or corrupt: defaults */
    }
    return s;
  }

  private save(): void {
    try {
      storage()?.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch {
      /* private mode / quota: settings just won't persist */
    }
  }

  // --- context lifecycle -----------------------------------------------------------------

  /**
   * Create/resume the AudioContext. Call from inside a user-gesture handler (touchend / click /
   * pointerup / keydown): iOS only lets resume() start audio there. Safe to call repeatedly;
   * after the first call it also keeps listening for gestures so an iOS "interrupted" context
   * (phone call, Siri, lock screen) comes back on the next tap.
   */
  unlock(): void {
    const Ctor = audioCtor();
    if (!Ctor) return;
    if (!this.ctx) {
      try {
        this.ctx = new Ctor({ latencyHint: 'interactive' });
      } catch {
        try {
          this.ctx = new Ctor();
        } catch {
          return;
        }
      }
      this.buildGraph(this.ctx);
      this.listen();
      try {
        // iOS 16.4+: mix with the user's own music and honour the ringer switch
        const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
        if (session) session.type = 'ambient';
      } catch {
        /* not supported */
      }
    }
    this.isUnlocked = true;
    if (this.settings.muted) {
      // stay silent and idle; setMuted(false) (normally a tap) resumes it
      if (this.master) this.master.gain.value = 0;
      if (this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
      return;
    }
    this.resume();
    this.syncMusic();
  }

  private buildGraph(ctx: AudioContext): void {
    this.master = ctx.createGain();
    this.master.gain.value = this.settings.muted ? 0 : 1;
    // safety limiter so stacked voices squash instead of clipping
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -4;
    lim.knee.value = 4;
    lim.ratio.value = 16;
    lim.attack.value = 0.002;
    lim.release.value = 0.12;
    this.master.connect(lim).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.settings.sfx;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.settings.music;
    this.musicBus.connect(this.master);
  }

  private wantRunning(): boolean {
    const d = doc();
    return this.isUnlocked && !this.settings.muted && !(d && d.visibilityState === 'hidden');
  }

  private resume(): void {
    const ctx = this.ctx;
    if (!ctx || !this.wantRunning() || ctx.state === 'running' || ctx.state === 'closed') return;
    // older iOS needs a source started inside the gesture as well as resume()
    try {
      const b = ctx.createBuffer(1, 1, ctx.sampleRate);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    } catch {
      /* ignore */
    }
    this.resuming = true;
    ctx.resume().then(
      () => { this.resuming = false; },
      () => { this.resuming = false; },
    );
  }

  private listen(): void {
    if (this.listening) return;
    const d = doc();
    if (!d || !this.ctx) return;
    this.listening = true;
    const ctx = this.ctx;
    const onGesture = (): void => {
      if (ctx.state !== 'running') this.resume();
    };
    for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) d.addEventListener(ev, onGesture, { capture: true, passive: true });
    d.addEventListener('visibilitychange', () => {
      if (d.visibilityState === 'hidden') {
        if (ctx.state === 'running') ctx.suspend().catch(() => {});
      } else this.resume();
    });
    try {
      window.addEventListener('pageshow', () => this.resume());
      window.addEventListener('focus', () => this.resume());
    } catch {
      /* no window */
    }
    // iOS Safari reports 'interrupted' (calls, Siri, other apps); try to come back when allowed
    ctx.addEventListener('statechange', () => {
      if (ctx.state !== 'running' && this.wantRunning()) this.resume();
    });
  }

  // --- sfx -------------------------------------------------------------------------------

  /** Play a sound effect. No-op before unlock(), while muted, or for unknown names. */
  play(name: SfxName, opts?: PlayOpts): void {
    const ctx = this.ctx;
    if (!ctx || !this.isUnlocked || this.settings.muted || !this.sfxBus) return;
    if (ctx.state !== 'running' && !this.resuming) return;
    const def = SFX[name];
    if (!def) return;
    const now = ctx.currentTime;
    this.voices = this.voices.filter((v) => v.end > now);
    const last = this.lastPlay.get(name);
    if (last !== undefined && now - last < (def.gap ?? 0.03) && now >= last) return;
    let same = 0;
    for (const v of this.voices) if (v.name === name) same++;
    if (same >= (def.max ?? 3)) return;
    while (this.voices.length >= MAX_VOICES) {
      // steal the oldest voice with a quick fade
      const old = this.voices.shift()!;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setTargetAtTime(0, now, 0.01);
      setTimeout(() => old.tail.disconnect(), 120);
    }
    this.lastPlay.set(name, now);
    const vol = Math.max(0, opts?.volume ?? 1) * def.gain;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    let tail: AudioNode = gain;
    if (opts?.pan && typeof ctx.createStereoPanner === 'function') {
      const pn = ctx.createStereoPanner();
      pn.pan.value = Math.max(-1, Math.min(1, opts.pan));
      gain.connect(pn);
      tail = pn;
    }
    tail.connect(this.sfxBus);
    const pitch = opts?.pitch ?? (def.vary ? 1 + (Math.random() * 2 - 1) * def.vary : 1);
    const t = now + 0.005;
    try {
      def.build({ ctx, out: gain, t, p: Math.max(0.25, Math.min(4, pitch)), rnd: Math.random });
    } catch {
      tail.disconnect();
      return;
    }
    const end = t + def.dur + 0.05;
    this.voices.push({ name, end, gain, tail });
    setTimeout(() => tail.disconnect(), (end - now) * 1000 + 250);
  }

  // --- music -----------------------------------------------------------------------------

  /** @internal */
  musicRunning(track: MusicTrack): boolean {
    return this.playerTrack === track && this.player !== null;
  }

  /** @internal Reconcile the sequencer with music.current / mute / unlock state. */
  syncMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.isUnlocked || !this.musicBus) return;
    const want = this.settings.muted ? null : this.music.current;
    if (want === this.playerTrack && (want === null || this.player)) return;
    const now = ctx.currentTime;
    const hadPrev = !!this.player;
    if (this.player) {
      this.player.fadeOut(now, CROSSFADE);
      this.fading.push(this.player);
    }
    this.player = null;
    this.playerTrack = want;
    if (want) {
      this.player = new TrackPlayer(ctx, getSong(want), this.musicBus);
      this.player.start(now + 0.06, hadPrev ? CROSSFADE : 0.4);
    }
    this.ensureTimer();
  }

  private ensureTimer(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.pumpMusic(), TIMER_MS);
    this.pumpMusic();
  }

  private pumpMusic(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.player) this.player.pump(now + LOOKAHEAD, now);
    this.fading = this.fading.filter((p) => {
      if (now > p.stopAt + 0.5) {
        p.dispose();
        return false;
      }
      p.pump(now + LOOKAHEAD, now);
      return true;
    });
    if (!this.player && this.fading.length === 0 && this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/** The game's audio singleton. */
export const audio = new AudioEngine();

// --- offline rendering (test harness / tooling) -------------------------------------------

function offlineCtx(channels: number, seconds: number, sampleRate: number): OfflineAudioContext {
  const Ctor = (g().OfflineAudioContext ?? g().webkitOfflineAudioContext) as OACCtor | undefined;
  if (!Ctor) throw new Error('OfflineAudioContext unavailable');
  return new Ctor(channels, Math.ceil(seconds * sampleRate), sampleRate);
}

/** Seconds a sound lasts. */
export function sfxDuration(name: SfxName): number {
  return SFX[name].dur;
}

/** Render one SFX (at full SFX volume, with its loudness trim) into an AudioBuffer. */
export function renderSfxOffline(
  name: SfxName, sampleRate = 44100, opts: { pitch?: number; seed?: number } = {},
): Promise<AudioBuffer> {
  const def = SFX[name];
  const ctx = offlineCtx(2, def.dur + 0.05, sampleRate);
  const out = ctx.createGain();
  out.gain.value = def.gain;
  out.connect(ctx.destination);
  const v: Voice = { ctx, out, t: 0, p: opts.pitch ?? 1, rnd: mulberry32(opts.seed ?? 1234) };
  def.build(v);
  return ctx.startRendering();
}

/** Render `bars` bars of a music track (at full music volume) into an AudioBuffer. */
export function renderMusicOffline(track: MusicTrack, bars = 8, sampleRate = 44100): Promise<AudioBuffer> {
  const song = getSong(track);
  const len = bars * barSeconds(song);
  const ctx = offlineCtx(2, len + 0.6, sampleRate);
  const p = new TrackPlayer(ctx, song, ctx.destination);
  p.start(0, 0);
  p.pump(len - 1e-6);
  return ctx.startRendering();
}
