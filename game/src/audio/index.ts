// Zombs BBQ audio: sampled sounds (public/audio/*.ogg, generated to match the original's sound bed,
// see docs/20-audio.md) with the Web Audio synth recipes as the fallback for anything not loaded yet
// or missing (e.g. the single-file build opened without its audio/ folder).
//
//   import { audio } from './audio';
//   pointer handler:  audio.unlock();            // first touch; safe to call on every tap
//   audio.play('coin', { pitch: 1.1, pan: -0.3 });
//   audio.loop('stove:s3', 'cookGrill');         // keyed loops (ambience, cooking); audio.stopLoop(key)
//   audio.setDucked(true);                       // modal open: beds down, music a touch down
//   audio.music.play('joint');                   // remembered and started once unlocked
//
// Importing this module never touches `window` / `AudioContext`, so it is safe in Node tests.

import { MUSIC_SAMPLES, SFX_SAMPLES } from './manifest';
import { barSeconds, getSong, MUSIC_TRACKS, TrackPlayer, type MusicTrack } from './music';
import { SampleBank } from './samples';
import { LOOP_NAMES, SFX, SFX_NAMES, type LoopName, type SfxName } from './sfx';
import { mulberry32, type Voice } from './synth';

export { SFX_NAMES, MUSIC_TRACKS, LOOP_NAMES };
export type { SfxName, MusicTrack, LoopName };

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
/** Loops at once (ambience + cooking): the soundscape planner keeps within this. */
export const MAX_LOOPS = 3;
const DEFAULTS: AudioSettings = { sfx: 0.8, music: 0.55, muted: false };
const CROSSFADE = 1.2;
const LOOKAHEAD = 0.15;
const TIMER_MS = 25;
const LOOP_FADE = 0.45;
const DUCK_BEDS = 0.25;
const DUCK_MUSIC = 0.7;
/** How long music waits for its sample before the synth song steps in. */
const MUSIC_SAMPLE_GRACE_MS = 2500;
/** Samples fetched first on unlock: what the player hears in the first minute. */
const PRELOAD_FIRST: SfxName[] = [
  'tap', 'open', 'close', 'ambience', 'coin', 'tip', 'cashRegister', 'sizzle', 'cookStove', 'ding', 'plate',
  'chomp', 'chew', 'scream', 'groan', 'mutter', 'doorOpen', 'doorClose', 'page', 'purchase',
];

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

/** Sample files behind a trigger name (variants), or none. */
export function sampleFiles(name: SfxName): readonly string[] {
  return SFX_SAMPLES[name]?.files ?? [];
}

/** Sample file behind a music track, or none. */
export function musicFile(track: MusicTrack): string | undefined {
  return MUSIC_SAMPLES[track];
}

interface ActiveVoice {
  name: SfxName;
  end: number;
  gain: GainNode;
  tail: AudioNode;
  src?: AudioBufferSourceNode;
}

interface LiveLoop {
  name: LoopName;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

/** What the engine drives for music: the synth sequencer or a looping sample. */
interface Player {
  stopAt: number;
  readonly needsPump: boolean;
  start(t: number, fadeIn: number): void;
  fadeOut(t: number, dur: number): void;
  pump(until: number, now?: number): void;
  dispose(): void;
}

class SamplePlayer implements Player {
  stopAt = Infinity;
  readonly needsPump = false;
  private readonly out: GainNode;
  private readonly src: AudioBufferSourceNode;
  constructor(ctx: BaseAudioContext, buf: AudioBuffer, dest: AudioNode) {
    this.out = ctx.createGain();
    this.out.connect(dest);
    this.src = ctx.createBufferSource();
    this.src.buffer = buf;
    this.src.loop = true;
    this.src.connect(this.out);
  }
  start(t: number, fadeIn: number): void {
    const gn = this.out.gain;
    if (fadeIn > 0) {
      gn.value = 0;
      gn.setValueAtTime(0, t);
      gn.linearRampToValueAtTime(1, t + fadeIn);
    } else gn.setValueAtTime(1, t);
    this.src.start(t);
  }
  fadeOut(t: number, dur: number): void {
    const gn = this.out.gain;
    const holdable = gn as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
    if (holdable.cancelAndHoldAtTime) holdable.cancelAndHoldAtTime(t);
    else {
      gn.cancelScheduledValues(t);
      gn.setValueAtTime(gn.value, t);
    }
    gn.linearRampToValueAtTime(0, t + dur);
    this.stopAt = Math.min(this.stopAt, t + dur);
    try {
      this.src.stop(t + dur + 0.05);
    } catch {
      /* never started */
    }
  }
  pump(): void {
    /* nothing to schedule: the buffer loops by itself */
  }
  dispose(): void {
    try {
      this.src.stop();
    } catch {
      /* already stopped */
    }
    this.src.disconnect();
    this.out.disconnect();
  }
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
  /** Set false (before unlock) to ignore the sample files and run on synth only. */
  static useSamples = true;

  readonly music: MusicController;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private bedBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private settings: AudioSettings;
  private voices: ActiveVoice[] = [];
  private lastPlay = new Map<SfxName, number>();
  private isUnlocked = false;
  private resuming = false;
  private listening = false;
  private ducked = false;
  private bank: SampleBank | null = null;
  private player: Player | null = null;
  private playerTrack: MusicTrack | null = null;
  private playerKind: 'sample' | 'synth' | null = null;
  private musicGrace: ReturnType<typeof setTimeout> | null = null;
  private fading: Player[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly wantLoops = new Map<string, { name: LoopName; volume: number }>();
  private readonly liveLoops = new Map<string, LiveLoop>();
  private last: 'sample' | 'synth' | null = null;

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
  /** Loop keys the game asked for (live or waiting for their sample). */
  get loopKeys(): string[] {
    return [...this.wantLoops.keys()];
  }
  get isDucked(): boolean {
    return this.ducked;
  }
  /** What the most recent play() used (diagnostics / tests). */
  get lastSource(): 'sample' | 'synth' | null {
    return this.last;
  }
  /** 'sample' | 'synth' | null: what is making the music right now. */
  get musicSource(): 'sample' | 'synth' | null {
    return this.player ? this.playerKind : null;
  }

  setSfxVolume(v: number): void {
    this.settings.sfx = clamp01(v, this.settings.sfx);
    this.save();
    if (this.ctx && this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.settings.sfx, this.ctx.currentTime, 0.02);
  }

  setMusicVolume(v: number): void {
    this.settings.music = clamp01(v, this.settings.music);
    this.save();
    this.applyMusicGain(0.05);
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

  /** Modal open / closed: beds (ambience, cooking) drop to a murmur and music steps back a little. */
  setDucked(d: boolean): void {
    if (this.ducked === !!d) return;
    this.ducked = !!d;
    const ctx = this.ctx;
    if (!ctx || !this.bedBus) return;
    this.bedBus.gain.setTargetAtTime(this.ducked ? DUCK_BEDS : 1, ctx.currentTime, 0.15);
    this.applyMusicGain(0.2);
  }

  private applyMusicGain(tc: number): void {
    if (!this.ctx || !this.musicBus) return;
    this.musicBus.gain.setTargetAtTime(this.settings.music * (this.ducked ? DUCK_MUSIC : 1), this.ctx.currentTime, tc);
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
      this.startBank(this.ctx);
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
    this.syncLoops();
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
    this.bedBus = ctx.createGain();
    this.bedBus.gain.value = this.ducked ? DUCK_BEDS : 1;
    this.bedBus.connect(this.sfxBus);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.settings.music * (this.ducked ? DUCK_MUSIC : 1);
    this.musicBus.connect(this.master);
  }

  private startBank(ctx: AudioContext): void {
    if (!AudioEngine.useSamples) return;
    try {
      const bank = new SampleBank(ctx);
      this.bank = bank;
      bank.onLoad = (file) => {
        this.syncLoops();
        if (Object.values(MUSIC_SAMPLES).includes(file)) this.syncMusic();
      };
      const first: string[] = [];
      for (const n of PRELOAD_FIRST) first.push(...sampleFiles(n));
      const cur = this.music.current ? musicFile(this.music.current) : undefined;
      if (cur) first.push(cur);
      const rest: string[] = [];
      for (const n of SFX_NAMES) rest.push(...sampleFiles(n));
      bank.preload([...first, ...rest]);
    } catch {
      this.bank = null;
    }
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

  /** A decoded sample for the name (a random variant when several are loaded), or undefined. */
  private sample(name: SfxName): AudioBuffer | undefined {
    const bank = this.bank;
    if (!bank) return undefined;
    const files = sampleFiles(name);
    if (!files.length) return undefined;
    const ready = files.filter((f) => bank.status(f) === 'ready');
    if (!ready.length) return undefined;
    return bank.get(ready[Math.floor(Math.random() * ready.length)]);
  }

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
      setTimeout(() => {
        try {
          old.src?.stop();
        } catch {
          /* done */
        }
        old.tail.disconnect();
      }, 120);
    }
    this.lastPlay.set(name, now);
    const buf = this.sample(name);
    const vol = Math.max(0, opts?.volume ?? 1) * (buf ? SFX_SAMPLES[name].gain : def.gain);
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
    const pitch = Math.max(0.25, Math.min(4, opts?.pitch ?? (def.vary ? 1 + (Math.random() * 2 - 1) * def.vary : 1)));
    const t = now + 0.005;
    let end: number;
    let src: AudioBufferSourceNode | undefined;
    try {
      if (buf) {
        src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = pitch;
        src.connect(gain);
        src.start(t);
        end = t + buf.duration / pitch + 0.05;
      } else {
        def.build({ ctx, out: gain, t, p: pitch, rnd: Math.random });
        end = t + def.dur + 0.05;
      }
    } catch {
      tail.disconnect();
      return;
    }
    this.last = buf ? 'sample' : 'synth';
    this.voices.push({ name, end, gain, tail, src });
    setTimeout(() => tail.disconnect(), (end - now) * 1000 + 250);
  }

  // --- loops (ambience, cooking) ---------------------------------------------------------

  /**
   * Keep a sampled loop running under `key` (e.g. 'room' or 'stove:s3'). Idempotent; starts as soon
   * as the sample is loaded. Loops are sample-only: without the file there is simply no bed.
   */
  loop(key: string, name: LoopName, volume = 1): void {
    if (!LOOP_NAMES.includes(name)) return;
    const cur = this.wantLoops.get(key);
    if (cur && cur.name === name && cur.volume === volume) return;
    this.wantLoops.set(key, { name, volume });
    this.syncLoops();
  }

  stopLoop(key: string): void {
    if (!this.wantLoops.delete(key)) return;
    this.syncLoops();
  }

  stopLoops(): void {
    if (!this.wantLoops.size) return;
    this.wantLoops.clear();
    this.syncLoops();
  }

  private syncLoops(): void {
    const ctx = this.ctx;
    if (!ctx || !this.isUnlocked || !this.bedBus) return;
    const now = ctx.currentTime;
    for (const [key, live] of this.liveLoops) {
      const want = this.wantLoops.get(key);
      if (want && want.name === live.name) {
        live.gain.gain.setTargetAtTime(want.volume * SFX_SAMPLES[live.name].gain, now, 0.1);
        continue;
      }
      this.liveLoops.delete(key);
      live.gain.gain.cancelScheduledValues(now);
      live.gain.gain.setTargetAtTime(0, now, LOOP_FADE / 3);
      try {
        live.src.stop(now + LOOP_FADE + 0.1);
      } catch {
        /* never started */
      }
      setTimeout(() => live.gain.disconnect(), (LOOP_FADE + 0.3) * 1000);
    }
    for (const [key, want] of this.wantLoops) {
      if (this.liveLoops.has(key) || this.liveLoops.size >= MAX_LOOPS) continue;
      const buf = this.sample(want.name);
      if (!buf) continue;
      try {
        const gain = ctx.createGain();
        const target = want.volume * SFX_SAMPLES[want.name].gain;
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(target, now + LOOP_FADE);
        gain.connect(this.bedBus);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(gain);
        // start somewhere inside the loop so two stoves never phase in lockstep
        src.start(now, Math.random() * Math.max(0, buf.duration - 0.5));
        this.liveLoops.set(key, { name: want.name, src, gain });
      } catch {
        /* no loop then */
      }
    }
  }

  // --- music -----------------------------------------------------------------------------

  /** @internal */
  musicRunning(track: MusicTrack): boolean {
    return this.playerTrack === track && this.player !== null;
  }

  /** @internal Reconcile the player with music.current / mute / unlock / sample state. */
  syncMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.isUnlocked || !this.musicBus) return;
    const want = this.settings.muted ? null : this.music.current;
    let kind: 'sample' | 'synth' | 'loading' | null = null;
    let buf: AudioBuffer | undefined;
    if (want) {
      const file = this.bank ? musicFile(want) : undefined;
      const st = file && this.bank ? this.bank.status(file) : 'failed';
      if (st === 'ready' && file) {
        buf = this.bank!.get(file);
        kind = buf ? 'sample' : 'synth';
      } else if (st === 'failed') kind = 'synth';
      else {
        kind = 'loading';
        if (file) void this.bank!.load(file);
      }
    }
    if (kind === 'loading') {
      // keep whatever is playing (the old track, or this track's synth) until the sample lands, but
      // never sit in silence for long: the synth song steps in after a short grace period
      if (this.playerTrack === want && this.player) return;
      if (this.musicGrace === null) {
        this.musicGrace = setTimeout(() => {
          this.musicGrace = null;
          if (this.music.current === want && !(this.playerTrack === want && this.player)) this.startMusic(want!, null);
        }, MUSIC_SAMPLE_GRACE_MS);
      }
      return;
    }
    if (this.musicGrace !== null) {
      clearTimeout(this.musicGrace);
      this.musicGrace = null;
    }
    if (want === this.playerTrack && (want === null || (this.player && this.playerKind === kind))) return;
    if (!want) {
      this.retirePlayer(ctx.currentTime);
      this.playerTrack = null;
      this.playerKind = null;
      this.ensureTimer();
      return;
    }
    this.startMusic(want, buf ?? null);
  }

  private retirePlayer(now: number): void {
    if (this.player) {
      this.player.fadeOut(now, CROSSFADE);
      this.fading.push(this.player);
    }
    this.player = null;
  }

  private startMusic(track: MusicTrack, buf: AudioBuffer | null): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const now = ctx.currentTime;
    const hadPrev = !!this.player;
    this.retirePlayer(now);
    this.playerTrack = track;
    this.playerKind = buf ? 'sample' : 'synth';
    this.player = buf ? new SamplePlayer(ctx, buf, this.musicBus) : new TrackPlayer(ctx, getSong(track), this.musicBus);
    this.player.start(now + 0.06, hadPrev ? CROSSFADE : 0.4);
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
    if (this.player?.needsPump) this.player.pump(now + LOOKAHEAD, now);
    this.fading = this.fading.filter((p) => {
      if (now > p.stopAt + 0.5) {
        p.dispose();
        return false;
      }
      if (p.needsPump) p.pump(now + LOOKAHEAD, now);
      return true;
    });
    if (!this.player?.needsPump && this.fading.length === 0 && this.timer !== null) {
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

/** Seconds a (synth) sound lasts. */
export function sfxDuration(name: SfxName): number {
  return SFX[name].dur;
}

/** Render one synth SFX (at full SFX volume, with its loudness trim) into an AudioBuffer. */
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

/** Render `bars` bars of a synth music track (at full music volume) into an AudioBuffer. */
export function renderMusicOffline(track: MusicTrack, bars = 8, sampleRate = 44100): Promise<AudioBuffer> {
  const song = getSong(track);
  const len = bars * barSeconds(song);
  const ctx = offlineCtx(2, len + 0.6, sampleRate);
  const p = new TrackPlayer(ctx, song, ctx.destination);
  p.start(0, 0);
  p.pump(len - 1e-6);
  return ctx.startRendering();
}
