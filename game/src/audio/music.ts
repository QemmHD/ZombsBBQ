// Music: three tiny procedural songs played by a lookahead sequencer.
// Songs are pre-expanded into per-tick event lists once; the sequencer only walks the list and
// spawns short-lived source nodes ahead of the AudioContext clock. Shared per-track nodes (bus,
// spring-ish echo) are created once per track start and reused by every note.

import { ksPluck, mtof, noiseBuffer, softWave } from './synth';

export const MUSIC_TRACKS = ['joint', 'raid', 'map'] as const;
export type MusicTrack = (typeof MUSIC_TRACKS)[number];

type Inst =
  | 'bass' | 'lead' | 'trem' | 'chank' | 'uke' | 'kick' | 'brush' | 'snare' | 'hat' | 'ohat'
  | 'crash' | 'tom' | 'rim' | 'shaker' | 'glide';

interface Glide {
  kind: 'theremin' | 'whistle';
  /** [tick offset, midi | null (rest)] */
  pts: [number, number | null][];
  len: number;
}

interface Ev {
  i: Inst;
  m: number;
  v: number;
  /** length in ticks */
  d: number;
  g?: Glide;
  /** chord notes (chank / uke) */
  c?: number[];
}

export interface Song {
  bpm: number;
  /** ticks per beat (3 = triplet/shuffle grid, 4 = straight 16ths) */
  tpb: number;
  bars: number;
  steps: Ev[][];
  /** echo time (s) and feedback for the spring-ish slapback */
  echo: number;
  fb: number;
  wet: number;
  /** overall trim so the three songs sit at similar loudness */
  level: number;
  mix: Partial<Record<Inst, number>>;
}

// --- notation helpers ------------------------------------------------------------------------

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function note(s: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error(`bad note ${s}`);
  return (Number(m[3]) + 1) * 12 + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** "0:E4 2:G4 9:." -> [[0, 64], [2, 67], [9, null]] */
function riff(s: string): [number, number | null][] {
  return s.split(/\s+/).filter(Boolean).map((tok) => {
    const [t, n] = tok.split(':');
    return [Number(t), n === '.' ? null : note(n)];
  });
}

class Builder {
  readonly steps: Ev[][];
  constructor(readonly bars: number, readonly tpbar: number) {
    this.steps = Array.from({ length: bars * tpbar }, () => []);
  }
  put(bar: number, tick: number, ev: Ev): void {
    this.steps[(bar * this.tpbar + tick) % this.steps.length].push(ev);
  }
  /** monophonic riff string for one bar; each note lasts until the next one */
  line(bar: number, inst: Inst, s: string, v: number, maxLen = 6): void {
    const pts = riff(s);
    pts.forEach(([t, m], k) => {
      if (m === null) return;
      const next = k + 1 < pts.length ? pts[k + 1][0] : this.tpbar;
      this.put(bar, t, { i: inst, m, v, d: Math.min(maxLen, next - t) });
    });
  }
}

// --- songs -----------------------------------------------------------------------------------

/** The joint: mid-tempo swampy shuffle in E. 12-bar blues + 4-bar stop-time theremin break. */
function buildJoint(): Song {
  const TB = 12;
  const b = new Builder(16, TB);
  const E = 40, A = 45, B = 47;
  const prog = [E, E, E, E, A, A, E, E, B, A, E, B, E, E, E, E];
  for (let bar = 0; bar < 16; bar++) {
    const r = prog[bar];
    const next = prog[(bar + 1) % 16];
    const brk = bar >= 12;
    if (!brk) {
      const walk = bar % 2 === 0 ? [0, 4, 7, 9] : [10, 9, 7, 4];
      walk.forEach((s, k) => b.put(bar, k * 3, { i: 'bass', m: r + s, v: k === 0 ? 0.9 : 0.72, d: 3 }));
      if (next !== r || bar === 11) b.put(bar, 11, { i: 'bass', m: next - 1, v: 0.5, d: 1 });
      // brushed kit: kick 1 & 3, swish on 2 & 4, ride on the shuffle
      b.put(bar, 0, { i: 'kick', m: 0, v: 0.8, d: 1 });
      b.put(bar, 6, { i: 'kick', m: 0, v: 0.6, d: 1 });
      if (bar % 2) b.put(bar, 8, { i: 'kick', m: 0, v: 0.3, d: 1 });
      b.put(bar, 3, { i: 'brush', m: 0, v: 0.55, d: 2 });
      b.put(bar, 9, { i: 'brush', m: 0, v: 0.55, d: 2 });
      for (const t of [0, 2, 3, 5, 6, 8, 9, 11]) b.put(bar, t, { i: 'hat', m: 0, v: t % 3 === 0 ? 0.24 : 0.14, d: 1 });
      // muted guitar "chank" on the backbeat
      const chord = [r + 12, r + 19, r + 22];
      b.put(bar, 3, { i: 'chank', m: r, v: 0.5, d: 1, c: chord });
      b.put(bar, 9, { i: 'chank', m: r, v: 0.45, d: 1, c: chord });
    } else {
      // stop-time break: one hit per bar, the theremin sings over it
      b.put(bar, 0, { i: 'bass', m: E, v: 0.9, d: 6 });
      b.put(bar, 0, { i: 'kick', m: 0, v: 0.8, d: 1 });
      b.put(bar, 0, { i: 'brush', m: 0, v: 0.6, d: 2 });
      b.put(bar, 0, { i: 'chank', m: E, v: 0.6, d: 2, c: [52, 59, 62, 68] });
      for (const t of [3, 6, 9]) b.put(bar, t, { i: 'hat', m: 0, v: 0.12, d: 1 });
      if (bar === 15) {
        // walk-up pickup back into the top
        b.put(bar, 6, { i: 'bass', m: 35, v: 0.7, d: 3 });
        b.put(bar, 9, { i: 'bass', m: 38, v: 0.7, d: 2 });
        b.put(bar, 11, { i: 'bass', m: 39, v: 0.6, d: 1 });
        for (const [t, v] of [[6, 0.3], [8, 0.4], [9, 0.5], [11, 0.65]]) b.put(bar, t, { i: 'brush', m: 0, v, d: 1 });
      }
    }
  }
  const lead: Record<number, string> = {
    0: '0:E4 2:G4 3:A4 5:Bb4 6:B4 9:D5 11:E5',
    1: '3:D5 5:B4 6:A4 8:G4 9:E4',
    2: '0:E5 2:E5 3:D5 6:B4 9:G4 11:A4',
    3: '0:G4 9:G4 11:G#4',
    4: '0:A4 2:C5 3:D5 5:Eb5 6:E5 9:G5 11:A5',
    5: '3:G5 5:E5 6:D5 8:C5 9:A4',
    6: '0:E4 2:G4 3:A4 5:Bb4 6:B4 9:D5 11:E5',
    7: '0:E5 3:D5 5:B4 6:G4 9:E4',
    8: '0:B4 3:D#5 6:F#5 9:A5',
    9: '0:G5 3:E5 6:C#5 9:A4',
    10: '0:E5 3:D5 5:B4 6:G4 9:E4',
    11: '0:F#5 3:D#5 6:B4 9:A4 11:F#4',
    15: '6:E4 8:G4 9:A4 11:B4',
  };
  for (const [bar, s] of Object.entries(lead)) b.line(Number(bar), 'lead', s, 0.7);
  // theremin: a ghostly swoop in bar 3, and the solo over the break
  b.put(2, 6, { i: 'glide', m: 0, v: 0.45, d: 18, g: { kind: 'theremin', len: 18, pts: riff('0:B3 9:E5 15:D5 18:.') } });
  b.put(12, 0, {
    i: 'glide', m: 0, v: 0.8, d: 36,
    g: { kind: 'theremin', len: 36, pts: riff('0:E5 6:G5 12:Bb5 18:B5 24:A5 27:G5 30:E5 33:.') },
  });
  return {
    bpm: 100, tpb: 3, bars: 16, steps: b.steps, echo: 0.105, fb: 0.32, wet: 0.35, level: 1.1,
    mix: { bass: 0.42, lead: 0.36, chank: 0.13, kick: 0.36, brush: 0.17, hat: 0.07, glide: 0.11 },
  };
}

/** Raid: faster, tenser surf-rock in E phrygian dominant with tremolo-picked lead and tom fills. */
function buildRaid(): Song {
  const TB = 16;
  const b = new Builder(16, TB);
  const E = 40, F = 41, G = 43, A = 45;
  const prog = [E, E, F, F, E, E, G, F, A, A, G, F, E, E, F, E];
  const melody = [
    'E4 F4 G#4 A4', 'B4 C5 B4 A4', 'A4 G#4 F4 E4', 'F4 - - .',
    'E5 F5 G#5 A5', 'B5 C6 B5 A5', 'G5 B5 D6 B5', 'A5 G#5 F5 .',
    'C5 B4 A4 G#4', 'A4 - - -', 'B4 D5 B4 G4', 'A4 C5 A4 .',
    'G#4 B4 E5 -', 'E5 D5 C5 B4', 'C5 B4 A4 G#4', 'E4 - . .',
  ];
  const tremV = [0.9, 0.55, 0.75, 0.55];
  for (let bar = 0; bar < 16; bar++) {
    const r = prog[bar];
    const fill = bar % 4 === 3;
    const big = bar === 15;
    // driving 8th-note bass
    [0, 0, 12, 0, 0, 7, 12, 7].forEach((s, k) => {
      if (fill && k >= 6) return;
      b.put(bar, k * 2, { i: 'bass', m: r + s, v: k % 2 ? 0.7 : 0.9, d: 2 });
    });
    // drums
    if (bar % 8 === 0) b.put(bar, 0, { i: 'crash', m: 0, v: 0.7, d: 8 });
    for (const t of [0, 6, 8]) b.put(bar, t, { i: 'kick', m: 0, v: 0.9, d: 1 });
    if (bar % 2) b.put(bar, 10, { i: 'kick', m: 0, v: 0.7, d: 1 });
    b.put(bar, 4, { i: 'snare', m: 0, v: 0.8, d: 1 });
    const hatEnd = fill ? 12 : 16;
    for (let t = 0; t < hatEnd; t += 2) b.put(bar, t, { i: t === 14 ? 'ohat' : 'hat', m: 0, v: t % 4 ? 0.2 : 0.3, d: 1 });
    if (big) {
      for (const t of [8, 9, 10, 11]) b.put(bar, t, { i: 'snare', m: 0, v: 0.4 + (t - 8) * 0.12, d: 1 });
    } else if (!fill) b.put(bar, 12, { i: 'snare', m: 0, v: 0.8, d: 1 });
    if (fill) [52, 48, 45, 41].forEach((m, k) => b.put(bar, 12 + k, { i: 'tom', m, v: 0.8, d: 1 }));
    // tremolo-picked lead: one pitch per beat, four picks per beat
    const toks = melody[bar].split(' ');
    let cur: number | null = null;
    toks.forEach((tok, beat) => {
      if (tok === '.') cur = null;
      else if (tok !== '-') cur = note(tok);
      if (cur === null) return;
      for (let k = 0; k < 4; k++) b.put(bar, beat * 4 + k, { i: 'trem', m: cur, v: tremV[k], d: 1 });
    });
  }
  // eerie theremin wail over the second half
  b.put(8, 0, {
    i: 'glide', m: 0, v: 0.7, d: 64,
    g: { kind: 'theremin', len: 64, pts: riff('0:E5 16:F5 30:E5 40:G#5 48:A5 58:.') },
  });
  return {
    bpm: 156, tpb: 4, bars: 16, steps: b.steps, echo: 0.096, fb: 0.28, wet: 0.3, level: 1.05,
    mix: { bass: 0.42, trem: 0.21, kick: 0.42, snare: 0.3, hat: 0.07, ohat: 0.07, crash: 0.09, tom: 0.4, glide: 0.07 },
  };
}

/** World map: chill whistled travel tune in G over G-Em-C-D with ukulele strums. */
function buildMap(): Song {
  const TB = 12;
  const b = new Builder(16, TB);
  const roots = [43, 40, 36, 38];
  const triads = [[67, 71, 74], [64, 67, 71], [60, 64, 67], [62, 66, 69]];
  for (let bar = 0; bar < 16; bar++) {
    const k = bar % 4;
    const r = roots[k];
    b.put(bar, 0, { i: 'bass', m: r, v: 0.9, d: 6 });
    b.put(bar, 6, { i: 'bass', m: r + 7, v: 0.7, d: 5 });
    if (k === 3) b.put(bar, 11, { i: 'bass', m: r + 4, v: 0.5, d: 1 });
    b.put(bar, 3, { i: 'uke', m: 0, v: 0.8, d: 3, c: triads[k] });
    b.put(bar, 9, { i: 'uke', m: 0, v: 0.7, d: 3, c: triads[k] });
    if (bar % 2) b.put(bar, 11, { i: 'uke', m: 0, v: 0.4, d: 1, c: triads[k] });
    b.put(bar, 0, { i: 'kick', m: 0, v: 0.6, d: 1 });
    b.put(bar, 6, { i: 'kick', m: 0, v: 0.45, d: 1 });
    b.put(bar, 3, { i: 'rim', m: 0, v: 0.6, d: 1 });
    b.put(bar, 9, { i: 'rim', m: 0, v: 0.6, d: 1 });
    for (const t of [0, 2, 3, 5, 6, 8, 9, 11]) b.put(bar, t, { i: 'shaker', m: 0, v: t % 3 === 0 ? 0.5 : 0.8, d: 1 });
  }
  const tune = [
    '0:D6 3:B5 6:G5 9:A5 11:B5', '0:B5 3:A5 6:G5 9:E5',
    '0:E5 3:G5 6:C6 9:B5 11:A5', '0:A5 9:F#5 11:G5',
    '0:G5 3:B5 6:D6 9:E6 11:D6', '0:B5 6:G5 9:B5',
    '0:A5 3:G5 6:E5 9:G5', '0:F#5 3:A5 9:.',
  ];
  const second = [...tune.slice(0, 6), '0:C6 3:B5 6:A5 9:F#5', '0:G5 9:.'];
  const all = [...tune, ...second];
  for (let bar = 0; bar < 16; bar += 2) {
    const pts = [...riff(all[bar]), ...riff(all[bar + 1]).map(([t, m]) => [t + TB, m] as [number, number | null])];
    if (pts[pts.length - 1][1] !== null) pts.push([2 * TB - 1, null]);
    b.put(bar, 0, { i: 'glide', m: 0, v: 1, d: 2 * TB, g: { kind: 'whistle', len: 2 * TB, pts } });
  }
  return {
    bpm: 92, tpb: 3, bars: 16, steps: b.steps, echo: 60 / 92 * 0.75, fb: 0.25, wet: 0.25, level: 0.9,
    mix: { bass: 0.45, uke: 0.15, kick: 0.4, rim: 0.12, shaker: 0.035, glide: 0.13 },
  };
}

const songCache = new Map<MusicTrack, Song>();
export function getSong(track: MusicTrack): Song {
  let s = songCache.get(track);
  if (!s) {
    s = track === 'joint' ? buildJoint() : track === 'raid' ? buildRaid() : buildMap();
    songCache.set(track, s);
  }
  return s;
}

export function barSeconds(song: Song): number {
  return (60 / song.bpm) * 4;
}

// --- player ----------------------------------------------------------------------------------

/** Schedules one song onto a context. Live: pumped by a timer. Offline: pumped once. */
export class TrackPlayer {
  readonly out: GainNode;
  private readonly dry: GainNode;
  private readonly send: GainNode;
  private readonly fx: AudioNode[];
  readonly tickDur: number;
  private tick = 0;
  private nextTime = 0;
  stopAt = Infinity;
  /** the engine's timer has to keep calling pump() */
  readonly needsPump = true;
  private seed = 1;

  constructor(readonly ctx: BaseAudioContext, readonly song: Song, dest: AudioNode) {
    this.tickDur = 60 / song.bpm / song.tpb;
    this.out = ctx.createGain();
    this.out.connect(dest);
    this.dry = ctx.createGain();
    this.dry.gain.value = song.level;
    this.dry.connect(this.out);
    // spring-ish slapback: delay with a darkening feedback loop
    this.send = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = song.echo;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    const fb = ctx.createGain();
    fb.gain.value = song.fb;
    const wet = ctx.createGain();
    wet.gain.value = song.wet * song.level;
    this.send.connect(delay);
    delay.connect(tone);
    tone.connect(fb);
    fb.connect(delay);
    tone.connect(wet);
    wet.connect(this.out);
    this.fx = [this.send, delay, tone, fb, wet, this.dry];
  }

  start(t: number, fadeIn: number): void {
    this.nextTime = t;
    const g = this.out.gain;
    if (fadeIn > 0) {
      g.value = 0;
      g.setValueAtTime(0, t);
      g.linearRampToValueAtTime(1, t + fadeIn);
    } else g.setValueAtTime(1, t);
  }

  fadeOut(t: number, dur: number): void {
    const g = this.out.gain;
    const holdable = g as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
    if (holdable.cancelAndHoldAtTime) holdable.cancelAndHoldAtTime(t);
    else {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
    }
    g.linearRampToValueAtTime(0, t + dur);
    this.stopAt = Math.min(this.stopAt, t + dur);
  }

  /** Schedule every tick that starts before `until`. `now` lets a starved timer skip ahead. */
  pump(until: number, now = -Infinity): void {
    const total = this.song.steps.length;
    if (this.nextTime < now - 0.05) {
      const behind = Math.ceil((now + 0.02 - this.nextTime) / this.tickDur);
      this.tick = (this.tick + behind) % total;
      this.nextTime += behind * this.tickDur;
    }
    while (this.nextTime < until && this.nextTime < this.stopAt) {
      for (const ev of this.song.steps[this.tick]) this.playEv(ev, this.nextTime);
      this.tick = (this.tick + 1) % total;
      this.nextTime += this.tickDur;
    }
  }

  dispose(): void {
    this.out.disconnect();
    for (const n of this.fx) n.disconnect();
  }

  private rnd(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  // --- instruments ---------------------------------------------------------------------------

  private playEv(ev: Ev, t: number): void {
    const vol = ev.v * (this.song.mix[ev.i] ?? 0.3);
    const len = ev.d * this.tickDur;
    switch (ev.i) {
      case 'bass': return this.pluck(ev.m, t, vol, len + 0.05, 0.9, 0.28, false);
      case 'lead': return this.pluck(ev.m, t, vol, len + 0.15, 0.85, 0.85, true, 0.988);
      case 'trem': return this.pluck(ev.m, t, vol, 0.14, 0.5, 0.8, true);
      case 'chank': (ev.c ?? []).forEach((m, k) => this.pluck(m, t + k * 0.008, vol, Math.min(len, 0.11), 0.4, 0.5, false)); return;
      case 'uke': (ev.c ?? []).forEach((m, k) => this.pluck(m, t + k * 0.014, vol, len + 0.2, 0.7, 0.6, true)); return;
      case 'kick': return this.kick(t, vol);
      case 'brush': return this.noise(t, vol, 'bandpass', 3200, 0.7, 0.02, 0.2);
      case 'snare': this.drumTone(t, vol * 0.6, 190, 150, 0.08); return this.noise(t, vol, 'bandpass', 1900, 0.8, 0.001, 0.15);
      case 'hat': return this.noise(t, vol, 'highpass', 7000, 0.7, 0.001, 0.04);
      case 'ohat': return this.noise(t, vol, 'highpass', 6500, 0.7, 0.001, 0.22);
      case 'crash': return this.noise(t, vol, 'highpass', 4500, 0.5, 0.002, 1.1);
      case 'tom': this.drumTone(t, vol, mtof(ev.m), mtof(ev.m) * 0.6, 0.28); return this.noise(t, vol * 0.3, 'lowpass', 900, 0.7, 0.001, 0.05);
      case 'rim': this.drumTone(t, vol * 0.5, 1700, 1600, 0.02); return this.noise(t, vol, 'bandpass', 2100, 4, 0.001, 0.03);
      case 'shaker': return this.noise(t, vol, 'highpass', 6000, 0.7, 0.018, 0.07);
      case 'glide': if (ev.g) this.glide(ev.g, t, vol); return;
    }
  }

  private pluck(midi: number, t: number, vol: number, len: number, bufLen: number, bright: number, echo: boolean, scoop = 1): void {
    const { ctx } = this;
    const ks = ksPluck(ctx, midi, bufLen, bright);
    const src = ctx.createBufferSource();
    src.buffer = ks.buf;
    if (scoop !== 1) {
      // surf twang: pick lands a hair flat and bends up into pitch
      src.playbackRate.setValueAtTime(ks.rate * scoop, t);
      src.playbackRate.linearRampToValueAtTime(ks.rate, t + 0.04);
    } else src.playbackRate.value = ks.rate;
    const g = ctx.createGain();
    const stop = Math.min(t + len, t + bufLen - 0.01);
    g.gain.value = vol;
    g.gain.setValueAtTime(vol, t);
    g.gain.setTargetAtTime(0, stop, 0.025);
    src.connect(g).connect(this.dry);
    if (echo) g.connect(this.send);
    src.start(t);
    src.stop(stop + 0.15);
  }

  private kick(t: number, vol: number): void {
    this.drumTone(t, vol, 115, 42, 0.22);
  }

  private drumTone(t: number, vol: number, f0: number, f1: number, dur: number): void {
    const { ctx } = this;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    const g = ctx.createGain();
    g.gain.value = vol;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.dry);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(t: number, vol: number, type: BiquadFilterType, f: number, q: number, a: number, dur: number): void {
    const { ctx } = this;
    const buf = noiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    src.connect(fl).connect(g).connect(this.dry);
    src.start(t, this.rnd() * (buf.duration - dur - a - 0.05));
    src.stop(t + a + dur + 0.02);
  }

  /** Continuous portamento voice: theremin (slow glides, wide vibrato) or whistle. */
  private glide(g: Glide, t0: number, vol: number): void {
    const { ctx } = this;
    const th = g.kind === 'theremin';
    const end = t0 + g.len * this.tickDur;
    const osc = ctx.createOscillator();
    if (th) osc.setPeriodicWave(softWave(ctx, [1, 0.28, 0.12, 0.05]));
    const amp = ctx.createGain();
    amp.gain.value = 0;
    amp.gain.setValueAtTime(0, t0);
    const glideT = th ? 0.2 : 0.035;
    let prevF = 0;
    for (const [tick, m] of g.pts) {
      const t = t0 + tick * this.tickDur;
      if (m === null) {
        amp.gain.setTargetAtTime(0, t, 0.03);
        prevF = 0;
        continue;
      }
      const f = mtof(m);
      if (!prevF) {
        osc.frequency.setValueAtTime(f, t);
        amp.gain.setTargetAtTime(vol, t, th ? 0.08 : 0.015);
      } else {
        osc.frequency.setValueAtTime(prevF, t);
        osc.frequency.exponentialRampToValueAtTime(f, t + glideT);
        if (!th) {
          amp.gain.setTargetAtTime(vol * 0.55, t, 0.008);
          amp.gain.setTargetAtTime(vol, t + 0.025, 0.02);
        }
      }
      prevF = f;
    }
    amp.gain.setTargetAtTime(0, end - 0.1, 0.03);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = th ? 6.2 : 5.2;
    const depth = ctx.createGain();
    depth.gain.value = 0;
    depth.gain.setValueAtTime(0, t0);
    depth.gain.linearRampToValueAtTime(th ? 38 : 14, t0 + 0.4);
    lfo.connect(depth).connect(osc.detune);
    osc.connect(amp);
    amp.connect(this.dry);
    amp.connect(this.send);
    if (!th) {
      // a little breath in the whistle
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx);
      n.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600;
      const ng = ctx.createGain();
      ng.gain.value = 0.05;
      n.connect(bp).connect(ng).connect(amp);
      n.start(t0);
      n.stop(end + 0.2);
    }
    for (const o of [osc, lfo]) {
      o.start(t0);
      o.stop(end + 0.2);
    }
  }
}
