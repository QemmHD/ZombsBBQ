// Low-level Web Audio building blocks shared by the SFX recipes and the music sequencer.
// Nothing here touches `window`; every function takes the context it should build on, so the same
// code renders live (AudioContext) and offline (OfflineAudioContext) for the test harness.

export type Ctx = BaseAudioContext;

/** Everything a recipe needs to build one sound. Times in recipes are offsets from `t`. */
export interface Voice {
  ctx: Ctx;
  /** Per-voice output (trim / volume / pan live downstream of it). */
  out: AudioNode;
  /** Absolute start time on ctx's clock. */
  t: number;
  /** Pitch multiplier (1 = as designed). */
  p: number;
  /** Random source: Math.random live, seeded offline so renders are reproducible. */
  rnd: () => number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

const EPS = 0.0001;

// ---------------------------------------------------------------------------------------------
// Per-context caches (buffers are created once and reused by every voice)

export interface KS {
  buf: AudioBuffer;
  /** playbackRate that corrects the integer delay-line length to the exact pitch. */
  rate: number;
}

interface CtxCache {
  noise?: AudioBuffer;
  crackle?: AudioBuffer;
  ks: Map<string, KS>;
  waves: Map<string, PeriodicWave>;
}

const caches = new WeakMap<Ctx, CtxCache>();

function cache(ctx: Ctx): CtxCache {
  let c = caches.get(ctx);
  if (!c) {
    c = { ks: new Map(), waves: new Map() };
    caches.set(ctx, c);
  }
  return c;
}

/** 1.5 s of white noise, looped with random start offsets so it never sounds like a loop. */
export function noiseBuffer(ctx: Ctx): AudioBuffer {
  const c = cache(ctx);
  if (!c.noise) {
    const len = Math.floor(ctx.sampleRate * 1.5);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    const r = mulberry32(7);
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
    c.noise = b;
  }
  return c.noise;
}

/** Grease-pan noise: soft hiss with random spitting pops (sizzle, burn, zap sparks). */
export function crackleBuffer(ctx: Ctx): AudioBuffer {
  const c = cache(ctx);
  if (!c.crackle) {
    const len = Math.floor(ctx.sampleRate * 1.5);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    const r = mulberry32(99);
    const popRate = 260 / ctx.sampleRate; // pops per sample
    const popDecay = Math.pow(0.001, 1 / (0.004 * ctx.sampleRate));
    let pop = 0;
    for (let i = 0; i < len; i++) {
      if (r() < popRate) pop = (0.5 + r() * 0.5) * (r() < 0.5 ? -1 : 1);
      d[i] = (r() * 2 - 1) * (0.22 + Math.abs(pop) * 0.9);
      pop *= popDecay;
    }
    c.crackle = b;
  }
  return c.crackle;
}

/**
 * Karplus-Strong plucked string, rendered once into a 22.05 kHz mono buffer and cached. Notes share
 * a buffer per whole-tone (odd notes replay the even note below, a semitone faster), which halves
 * memory with no audible change. Returned `rate` must be applied as playbackRate: it carries that
 * shift and the correction for the integer delay-line length.
 */
export function ksPluck(ctx: Ctx, midi: number, dur: number, bright: number): KS {
  const c = cache(ctx);
  const base = Math.floor(midi / 2) * 2;
  const key = `${base}|${dur}|${bright}`;
  const hit = c.ks.get(key);
  if (hit) return { buf: hit.buf, rate: (hit.rate * mtof(midi)) / mtof(base) };
  const ks = ksBuild(ctx, base, dur, bright);
  c.ks.set(key, ks);
  return { buf: ks.buf, rate: (ks.rate * mtof(midi)) / mtof(base) };
}

function ksBuild(ctx: Ctx, midi: number, dur: number, bright: number): KS {
  const sr = 22050;
  const freq = mtof(midi);
  const N = Math.max(2, Math.round(sr / freq - 0.5));
  const actual = sr / (N + 0.5);
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const r = mulberry32(midi * 131 + Math.round(bright * 100));
  let lp = 0;
  let mean = 0;
  for (let i = 0; i < N && i < len; i++) {
    lp += bright * (r() * 2 - 1 - lp);
    d[i] = lp;
    mean += lp;
  }
  mean /= N;
  for (let i = 0; i < N && i < len; i++) d[i] -= mean;
  // per-period loss so the note has decayed ~60 dB by `dur`
  const g = Math.pow(0.001, 1 / (dur * actual)) * 0.5;
  for (let i = N; i < len; i++) d[i] = g * (d[i - N] + (i - N - 1 >= 0 ? d[i - N - 1] : 0));
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  const norm = peak > 0 ? 0.8 / peak : 1;
  const fade = Math.min(len, 256);
  for (let i = 0; i < len; i++) {
    d[i] *= norm;
    if (i >= len - fade) d[i] *= (len - i) / fade;
  }
  return { buf, rate: freq / actual };
}

/** A few-harmonic wave (theremin-ish), cached per context. */
export function softWave(ctx: Ctx, harmonics: number[]): PeriodicWave {
  const c = cache(ctx);
  const key = harmonics.join(',');
  let w = c.waves.get(key);
  if (!w) {
    const real = new Float32Array(harmonics.length + 1);
    const imag = new Float32Array(harmonics.length + 1);
    harmonics.forEach((h, i) => (imag[i + 1] = h));
    w = ctx.createPeriodicWave(real, imag);
    c.waves.set(key, w);
  }
  return w;
}

const curves = new Map<number, Float32Array<ArrayBuffer>>();

/** tanh soft-clipper; curve arrays are shared between all contexts. */
export function shaper(ctx: Ctx, amount: number): WaveShaperNode {
  let curve = curves.get(amount);
  if (!curve) {
    const n = 1024;
    curve = new Float32Array(n);
    const norm = Math.tanh(amount);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(amount * x) / norm;
    }
    curves.set(amount, curve);
  }
  const ws = ctx.createWaveShaper();
  ws.curve = curve;
  return ws;
}

// ---------------------------------------------------------------------------------------------
// Envelopes and nodes

/**
 * Shape a gain param. `rel < 0` = percussive (attack then exponential decay that ends at `end`);
 * otherwise attack, hold at `vol`, and a linear release of `rel` seconds ending at `end`.
 */
export function env(p: AudioParam, t0: number, end: number, vol: number, a: number, rel: number): void {
  const at = Math.min(a, (end - t0) * 0.5);
  // the param's plain value applies before the first event; sources started at sub-sample times
  // can emit a frame before t0, so it must already be silent (else a one-sample click)
  p.value = 0;
  p.setValueAtTime(0, t0);
  p.linearRampToValueAtTime(vol, t0 + at);
  if (rel < 0) {
    p.exponentialRampToValueAtTime(EPS, end);
    p.setValueAtTime(0, end);
  } else {
    p.setValueAtTime(vol, Math.max(t0 + at, end - rel));
    p.linearRampToValueAtTime(0, end);
  }
}

/** Piecewise-linear automation, points are [offsetFromVoiceStart, value]. */
export function linPts(p: AudioParam, t: number, pts: [number, number][]): void {
  p.value = pts[0][1];
  p.setValueAtTime(pts[0][1], t + pts[0][0]);
  for (let i = 1; i < pts.length; i++) p.linearRampToValueAtTime(pts[i][1], t + pts[i][0]);
}

/** Piecewise-exponential automation (frequencies), points are [offset, value>0]. */
export function expPts(p: AudioParam, t: number, pts: [number, number][], mul = 1): void {
  p.value = pts[0][1] * mul;
  p.setValueAtTime(pts[0][1] * mul, t + pts[0][0]);
  for (let i = 1; i < pts.length; i++) p.exponentialRampToValueAtTime(Math.max(1, pts[i][1] * mul), t + pts[i][0]);
}

/** Gain node shaped by linear points (relative to v.t), connected to dest. */
export function gainEnv(v: Voice, dest: AudioNode, pts: [number, number][]): GainNode {
  const g = v.ctx.createGain();
  linPts(g.gain, v.t, pts);
  g.connect(dest);
  return g;
}

export function filt(ctx: Ctx, type: BiquadFilterType, f: number, q = 0.7, dest?: AudioNode): BiquadFilterNode {
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  if (dest) fl.connect(dest);
  return fl;
}

/** LFO into a param (cents into detune, Hz into frequency, linear into gain). */
export function lfo(
  ctx: Ctx, param: AudioParam, t0: number, end: number, rate: number, depth: number,
  delay = 0, type: OscillatorType = 'sine',
): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = rate;
  const g = ctx.createGain();
  if (delay > 0) {
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(depth, t0 + delay);
  } else g.gain.value = depth;
  o.connect(g).connect(param);
  o.start(t0);
  o.stop(end + 0.02);
}

export interface ToneOpts {
  type?: OscillatorType;
  wave?: PeriodicWave;
  f: number;
  /** glide target; glide starts at glideAt and lasts `glide` (defaults: whole note) */
  f2?: number;
  glideAt?: number;
  glide?: number;
  at?: number;
  dur: number;
  a?: number;
  vol: number;
  /** hold envelope with linear release instead of percussive decay */
  hold?: boolean;
  rel?: number;
  dest?: AudioNode;
  /** [rate Hz, depth cents, onset delay s] */
  vib?: [number, number, number?];
  detune?: number;
  /** ignore the voice pitch multiplier */
  fixed?: boolean;
}

export function tone(v: Voice, o: ToneOpts): OscillatorNode {
  const { ctx } = v;
  const t0 = v.t + (o.at ?? 0);
  const end = t0 + o.dur;
  const osc = ctx.createOscillator();
  if (o.wave) osc.setPeriodicWave(o.wave);
  else osc.type = o.type ?? 'sine';
  const pm = o.fixed ? 1 : v.p;
  const f = o.f * pm;
  osc.frequency.setValueAtTime(f, t0);
  if (o.f2 !== undefined) {
    const gs = t0 + (o.glideAt ?? 0);
    const ge = Math.min(end, gs + (o.glide ?? end - gs));
    osc.frequency.setValueAtTime(f, gs);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2 * pm), ge);
  }
  if (o.detune) osc.detune.value = o.detune;
  if (o.vib) lfo(ctx, osc.detune, t0, end, o.vib[0], o.vib[1], o.vib[2] ?? 0);
  const g = ctx.createGain();
  env(g.gain, t0, end, o.vol, o.a ?? 0.005, o.hold ? (o.rel ?? 0.05) : -1);
  osc.connect(g).connect(o.dest ?? v.out);
  osc.start(t0);
  osc.stop(end + 0.02);
  return osc;
}

/** Oscillator following an exponential pitch contour [offset, Hz] (scaled by v.p). */
export function sweep(
  v: Voice, type: OscillatorType, pts: [number, number][], dest: AudioNode, end: number,
  detune = 0, vib?: [number, number, number?],
): OscillatorNode {
  const osc = v.ctx.createOscillator();
  osc.type = type;
  expPts(osc.frequency, v.t, pts, v.p);
  if (detune) osc.detune.value = detune;
  if (vib) lfo(v.ctx, osc.detune, v.t + pts[0][0], v.t + end, vib[0], vib[1], vib[2] ?? 0);
  osc.connect(dest);
  osc.start(v.t + pts[0][0]);
  osc.stop(v.t + end + 0.02);
  return osc;
}

export interface NoiseOpts {
  at?: number;
  dur: number;
  vol: number;
  a?: number;
  hold?: boolean;
  rel?: number;
  type?: BiquadFilterType;
  f?: number;
  f2?: number;
  q?: number;
  dest?: AudioNode;
  buf?: AudioBuffer;
  rate?: number;
}

export function noiseHit(v: Voice, o: NoiseOpts): GainNode {
  const { ctx } = v;
  const t0 = v.t + (o.at ?? 0);
  const end = t0 + o.dur;
  const src = ctx.createBufferSource();
  const buf = o.buf ?? noiseBuffer(ctx);
  src.buffer = buf;
  src.loop = true;
  if (o.rate) src.playbackRate.value = o.rate;
  let node: AudioNode = src;
  if (o.type) {
    const fl = ctx.createBiquadFilter();
    fl.type = o.type;
    fl.frequency.setValueAtTime(o.f ?? 1000, t0);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, end);
    fl.Q.value = o.q ?? 0.7;
    node.connect(fl);
    node = fl;
  }
  const g = ctx.createGain();
  env(g.gain, t0, end, o.vol, o.a ?? 0.002, o.hold ? (o.rel ?? 0.05) : -1);
  node.connect(g).connect(o.dest ?? v.out);
  src.start(t0, v.rnd() * (buf.duration * 0.6));
  src.stop(end + 0.02);
  return g;
}

/** Parallel band-pass formant bank: returns its input and the filters (for vowel automation). */
export function formantBank(
  ctx: Ctx, dest: AudioNode, specs: [number, number, number][],
): { input: GainNode; filters: BiquadFilterNode[] } {
  const input = ctx.createGain();
  const filters = specs.map(([f, q, gain]) => {
    const fl = filt(ctx, 'bandpass', f, q);
    const g = ctx.createGain();
    g.gain.value = gain;
    input.connect(fl).connect(g).connect(dest);
    return fl;
  });
  return { input, filters };
}
