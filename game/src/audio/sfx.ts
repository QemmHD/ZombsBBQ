// Every sound effect in the game, as a tiny synth recipe. No samples: oscillators, filtered
// noise, Karplus-Strong plucks and formant filters, built fresh per play (Web Audio source nodes
// are one-shot) on top of cached buffers. Tone: Saturday-morning cartoon, gross-cute.

import {
  crackleBuffer, expPts, filt, formantBank, gainEnv, ksPluck, lfo, linPts, mtof, noiseHit,
  shaper, sweep, tone, type Voice,
} from './synth';

export const SFX_NAMES = [
  'tap', 'open', 'close', 'coin', 'cashRegister', 'sizzle', 'ding', 'plate', 'burn', 'chomp',
  'scream', 'groan', 'infect', 'levelUp', 'daydream', 'snore', 'error', 'place', 'rotate', 'sell',
  'purchase', 'expand', 'hit', 'whack', 'zap', 'ko', 'heal', 'summon', 'raidWin', 'raidLose',
  'flag', 'dogBark', 'pugSnort', 'stomp',
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

export interface SfxDef {
  /** Length of the sound in seconds (voice is freed after this). */
  dur: number;
  /** Loudness trim so sounds sit together (UI soft, impacts and fanfares loud). */
  gain: number;
  /** Minimum seconds between two plays of this sound (default 0.03). */
  gap?: number;
  /** Max simultaneous voices of this sound (default 3). */
  max?: number;
  /** Random pitch spread (± fraction) applied when the caller gives no pitch. */
  vary?: number;
  build(v: Voice): void;
}

// --- shared mini-instruments ---------------------------------------------------------------

/** Struck bell / metal: inharmonic sine partials, higher ones die faster. */
function bell(v: Voice, f: number, at: number, dur: number, vol: number,
  ratios = [1, 2.76, 5.4, 8.93], vols = [1, 0.45, 0.22, 0.08], dest?: AudioNode): void {
  const nyq = v.ctx.sampleRate * 0.45;
  ratios.forEach((r, i) => {
    if (f * r * v.p < nyq) tone(v, { f: f * r, at, dur: dur / (1 + i * 0.7), a: 0.002, vol: vol * vols[i], dest });
  });
}

/** Brassy note: detuned saws through a lowpass that blats open then settles. */
function brass(v: Voice, f: number, at: number, dur: number, vol: number, vib = false): void {
  const { ctx } = v;
  const t0 = v.t + at;
  const end = t0 + dur;
  const fl = filt(ctx, 'lowpass', 400, 2.5);
  fl.frequency.setValueAtTime(450, t0);
  fl.frequency.exponentialRampToValueAtTime(3400, t0 + 0.035);
  fl.frequency.exponentialRampToValueAtTime(1500, t0 + Math.min(dur, 0.25));
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  g.gain.setValueAtTime(vol * 0.85, end - 0.06);
  g.gain.linearRampToValueAtTime(0, end);
  fl.connect(g).connect(v.out);
  for (const det of [-7, 7]) {
    tone(v, {
      type: 'sawtooth', f, at, dur, a: 0.001, vol: 1, hold: true, rel: 0.001, dest: fl, detune: det,
      vib: vib ? [5.5, 18, 0.15] : undefined,
    });
  }
}

/** Two-note "bling" (B5 -> E6), square through a lowpass. */
function coinNotes(v: Voice, at: number, lo: number, hi: number, vol: number): void {
  const fl = filt(v.ctx, 'lowpass', 4200, 0.7, v.out);
  tone(v, { type: 'square', f: lo, at, dur: 0.07, a: 0.002, vol, hold: true, rel: 0.01, dest: fl });
  tone(v, { type: 'square', f: hi, at: at + 0.065, dur: 0.2, a: 0.002, vol, dest: fl });
  tone(v, { f: hi * 2, at: at + 0.065, dur: 0.12, vol: vol * 0.3 });
}

/** Karplus-Strong pluck at a voice offset. */
function pluck(v: Voice, midi: number, at: number, vol: number, len = 0.9, bright = 0.55): void {
  const ks = ksPluck(v.ctx, midi, len, bright);
  const src = v.ctx.createBufferSource();
  src.buffer = ks.buf;
  src.playbackRate.value = ks.rate * v.p;
  const g = v.ctx.createGain();
  g.gain.value = vol;
  src.connect(g).connect(v.out);
  src.start(v.t + at);
}

/** Wet resonant lowpass sweep for squelches. */
function squelchFilter(v: Voice, at: number, pts: [number, number][], q: number): BiquadFilterNode {
  const fl = filt(v.ctx, 'lowpass', pts[0][1], q, v.out);
  expPts(fl.frequency, v.t + at, pts);
  return fl;
}

// --- the sounds ------------------------------------------------------------------------------

export const SFX: Record<SfxName, SfxDef> = {
  // soft wooden "tik" for any button
  tap: {
    dur: 0.06, gain: 0.52, gap: 0.03, max: 3,
    build(v) {
      tone(v, { f: 1500, f2: 800, dur: 0.045, a: 0.002, vol: 0.5 });
      noiseHit(v, { dur: 0.012, vol: 0.3, type: 'bandpass', f: 4500, q: 1.2 });
    },
  },

  // bubbly "bwoop!" upward
  open: {
    dur: 0.16, gain: 0.49,
    build(v) {
      tone(v, { f: 330, f2: 880, glide: 0.08, dur: 0.11, a: 0.006, vol: 0.55 });
      tone(v, { type: 'triangle', f: 660, f2: 1760, glide: 0.07, dur: 0.08, a: 0.004, vol: 0.12 });
      tone(v, { f: 1320, at: 0.075, dur: 0.07, a: 0.003, vol: 0.22 });
    },
  },

  // "pip-boop" downward
  close: {
    dur: 0.14, gain: 0.44,
    build(v) {
      tone(v, { f: 1100, dur: 0.035, a: 0.002, vol: 0.2 });
      tone(v, { f: 820, f2: 300, at: 0.02, dur: 0.11, a: 0.005, vol: 0.55 });
    },
  },

  coin: {
    dur: 0.28, gain: 0.36, gap: 0.045, max: 4, vary: 0.025,
    build(v) {
      coinNotes(v, 0, 988, 1319, 0.2);
    },
  },

  // lever clack, drawer slam, "CHING!"
  cashRegister: {
    dur: 0.9, gain: 0.72, gap: 0.08,
    build(v) {
      noiseHit(v, { dur: 0.035, vol: 0.8, type: 'bandpass', f: 2200, q: 2.5 });
      tone(v, { type: 'triangle', f: 260, f2: 120, dur: 0.06, vol: 0.35 });
      noiseHit(v, { at: 0.04, dur: 0.1, vol: 0.3, type: 'bandpass', f: 900, f2: 2400, q: 3 });
      noiseHit(v, { at: 0.13, dur: 0.04, vol: 0.5, type: 'bandpass', f: 1500, q: 2 });
      tone(v, { f: 150, f2: 80, at: 0.13, dur: 0.08, vol: 0.5 });
      bell(v, 2093, 0.15, 0.72, 0.2);
      bell(v, 2637, 0.17, 0.65, 0.17);
    },
  },

  // meat hits the grill: a splash of "TSSS" then crackly grease
  sizzle: {
    dur: 1.0, gain: 0.3, gap: 0.12, max: 2,
    build(v) {
      const hp = filt(v.ctx, 'highpass', 1800, 0.7);
      const pk = filt(v.ctx, 'peaking', 5500, 1, v.out);
      pk.gain.value = 6;
      hp.connect(pk);
      noiseHit(v, { buf: crackleBuffer(v.ctx), dur: 1.0, a: 0.03, vol: 0.9, hold: true, rel: 0.45, dest: hp });
      noiseHit(v, { dur: 1.0, a: 0.12, vol: 0.16, hold: true, rel: 0.5, type: 'bandpass', f: 4000, q: 0.6 });
      noiseHit(v, { dur: 0.25, vol: 0.35, type: 'highpass', f: 3000, f2: 6500 });
    },
  },

  // counter service bell
  ding: {
    dur: 1.0, gain: 0.42, gap: 0.1,
    build(v) {
      noiseHit(v, { dur: 0.008, vol: 0.25, type: 'highpass', f: 6000 });
      bell(v, 1568, 0, 0.95, 0.3, [1, 2, 2.76, 5.4], [1, 0.3, 0.3, 0.08]);
      tone(v, { f: 1568 * 1.004, dur: 0.9, vol: 0.12 });
    },
  },

  // ceramic clack that settles: clack...clk.tk
  plate: {
    dur: 0.28, gain: 0.99,
    build(v) {
      tone(v, { f: 240, f2: 120, dur: 0.07, vol: 0.45 });
      noiseHit(v, { dur: 0.025, vol: 0.9, type: 'bandpass', f: 3200, q: 3 });
      [2400, 3650, 5100].forEach((f, i) => tone(v, { f, dur: 0.2 - i * 0.04, a: 0.001, vol: 0.1 }));
      noiseHit(v, { at: 0.06, dur: 0.02, vol: 0.45, type: 'bandpass', f: 3500, q: 4 });
      tone(v, { f: 2600, at: 0.06, dur: 0.08, vol: 0.05 });
      noiseHit(v, { at: 0.1, dur: 0.015, vol: 0.25, type: 'bandpass', f: 3800, q: 4 });
    },
  },

  // fizz + "pfft", then a sad deflating whistle
  burn: {
    dur: 1.0, gain: 0.5, gap: 0.2,
    build(v) {
      noiseHit(v, { buf: crackleBuffer(v.ctx), dur: 0.5, vol: 0.8, type: 'highpass', f: 2500 });
      noiseHit(v, { dur: 0.18, vol: 0.45, type: 'bandpass', f: 900, f2: 400, q: 1.2 });
      const w = {
        at: 0.22, f: 1050, f2: 480, glideAt: 0.12, glide: 0.5, dur: 0.72, a: 0.03, hold: true, rel: 0.12,
        vib: [6, 45] as [number, number],
      };
      tone(v, { ...w, vol: 0.3 });
      tone(v, { ...w, f: 2100, f2: 960, vol: 0.035 });
    },
  },

  // zombie bite: crunchy crackle, wet squelch, a little chew
  chomp: {
    dur: 0.46, gain: 1.21, gap: 0.06, vary: 0.06,
    build(v) {
      const r = v.rnd;
      tone(v, { f: 190, f2: 60, dur: 0.1, vol: 0.7 });
      for (let i = 0; i < 7; i++) {
        noiseHit(v, { at: i * 0.013 + r() * 0.008, dur: 0.018 + r() * 0.02, vol: 0.5 + r() * 0.35, type: 'bandpass', f: 1100 + r() * 2600, q: 1.6 });
      }
      const sq = squelchFilter(v, 0.06, [[0, 1800], [0.22, 220]], 14);
      tone(v, { type: 'sawtooth', at: 0.06, f: 150, f2: 85, dur: 0.22, a: 0.01, vol: 0.3, dest: sq });
      noiseHit(v, { at: 0.06, dur: 0.18, a: 0.01, vol: 0.35, dest: sq });
      for (let i = 0; i < 3; i++) {
        noiseHit(v, { at: 0.3 + i * 0.022 + r() * 0.01, dur: 0.02, vol: 0.32, type: 'bandpass', f: 1500 + r() * 2000, q: 1.6 });
      }
      const sq2 = squelchFilter(v, 0.32, [[0, 1300], [0.12, 250]], 12);
      tone(v, { type: 'sawtooth', at: 0.32, f: 130, f2: 90, dur: 0.12, a: 0.01, vol: 0.2, dest: sq2 });
    },
  },

  // cartoon falsetto "EEEK!" with nervous vibrato
  scream: {
    dur: 0.6, gain: 0.49, gap: 0.12, max: 2, vary: 0.08,
    build(v) {
      const { ctx } = v;
      const out = gainEnv(v, v.out, [[0, 0], [0.03, 0.22], [0.42, 0.2], [0.56, 0]]);
      const lp = filt(ctx, 'lowpass', 4200, 0.7, out);
      const ee = filt(ctx, 'peaking', 2800, 2, lp);
      ee.gain.value = 10;
      const contour: [number, number][] = [[0, 700], [0.08, 1250], [0.38, 1180], [0.56, 880]];
      sweep(v, 'sawtooth', contour, ee, 0.56, 0, [10, 70, 0.05]);
      const pure = gainEnv(v, out, [[0, 0.9], [0.56, 0.9]]);
      sweep(v, 'sine', contour, pure, 0.56, 0, [10, 70, 0.05]);
      noiseHit(v, { dur: 0.5, vol: 0.05, type: 'bandpass', f: 3500, q: 2, hold: true, rel: 0.1 });
    },
  },

  // "brrraaaiiinnzz": formant-filtered sawtooth, vowel sweep r -> aa -> ai -> n -> z
  groan: {
    dur: 1.2, gain: 0.87, gap: 0.15, max: 3, vary: 0.12,
    build(v) {
      const { ctx } = v;
      const f0 = 92;
      const out = gainEnv(v, v.out, [[0, 0], [0.08, 0.9], [0.85, 0.8], [1.15, 0]]);
      const fs = Math.sqrt(v.p); // formants move a little with the zombie's pitch
      const bank = formantBank(ctx, out, [[320, 7, 2.4], [900, 9, 1.5], [2300, 11, 0.8]]);
      expPts(bank.filters[0].frequency, v.t, [[0, 320], [0.22, 720], [0.62, 720], [0.78, 420], [0.95, 280]], fs);
      expPts(bank.filters[1].frequency, v.t, [[0, 850], [0.22, 1150], [0.62, 1150], [0.78, 1900], [0.95, 1500]], fs);
      expPts(bank.filters[2].frequency, v.t, [[0, 2300], [0.4, 2500], [0.78, 2600], [1.1, 2500]], fs);
      const body = filt(ctx, 'lowpass', 600, 0.7);
      const bodyG = ctx.createGain();
      bodyG.gain.value = 0.25;
      body.connect(bodyG).connect(out);
      // growl: amplitude flutter, strongest on the "brr"
      const growl = ctx.createGain();
      growl.gain.value = 0.7;
      const gl = ctx.createOscillator();
      gl.frequency.value = 31;
      const gd = ctx.createGain();
      linPts(gd.gain, v.t, [[0, 0.45], [0.25, 0.15], [1.1, 0.2]]);
      gl.connect(gd).connect(growl.gain);
      gl.start(v.t);
      gl.stop(v.t + 1.2);
      growl.connect(bank.input);
      growl.connect(body);
      const contour: [number, number][] = [[0, f0 * 0.85], [0.3, f0 * 1.12], [0.7, f0], [1.1, f0 * 0.78]];
      sweep(v, 'sawtooth', contour, growl, 1.15, 0, [5, 20, 0.3]);
      sweep(v, 'sawtooth', contour, growl, 1.15, 14);
      noiseHit(v, { at: 0.92, dur: 0.22, vol: 0.05, type: 'highpass', f: 3500 });
    },
  },

  // goo squelch + bubbles, magical shimmer, spooky minor-second sting
  infect: {
    dur: 1.2, gain: 0.83, gap: 0.2,
    build(v) {
      const { ctx } = v;
      const goo = filt(ctx, 'lowpass', 300, 16, v.out);
      expPts(goo.frequency, v.t, [[0, 300], [0.08, 1600], [0.26, 200]]);
      const gooG = gainEnv(v, goo, [[0, 0], [0.01, 0.35], [0.25, 0.3], [0.3, 0]]);
      sweep(v, 'sawtooth', [[0, 110], [0.28, 70]], gooG, 0.3);
      noiseHit(v, { dur: 0.28, vol: 0.3, dest: goo });
      for (const at of [0.04, 0.11, 0.19]) tone(v, { at, f: 300, f2: 1000, dur: 0.045, vol: 0.22 });
      [76, 80, 83, 87, 88, 92, 95, 99].forEach((m, i) =>
        tone(v, { type: 'triangle', at: 0.12 + i * 0.045, f: mtof(m), dur: 0.4, a: 0.003, vol: 0.085 }));
      noiseHit(v, { at: 0.12, dur: 0.7, a: 0.2, vol: 0.06, type: 'highpass', f: 7000, hold: true, rel: 0.3 });
      const st = filt(ctx, 'lowpass', 2500, 1, v.out);
      expPts(st.frequency, v.t, [[0.45, 2500], [1.15, 450]]);
      for (const m of [47, 48, 53]) {
        tone(v, { type: 'sawtooth', at: 0.45, f: mtof(m), dur: 0.7, a: 0.01, vol: 0.1, dest: st, vib: [5.5, 20] });
      }
      tone(v, { at: 0.45, f: 82, f2: 55, dur: 0.3, vol: 0.45 });
    },
  },

  // "ta-ta-ta-TAAA!"
  levelUp: {
    dur: 1.0, gain: 1.05, gap: 0.3,
    build(v) {
      for (let i = 0; i < 3; i++) brass(v, mtof(67), i * 0.11, 0.095, 0.16);
      brass(v, mtof(72), 0.33, 0.62, 0.16, true);
      brass(v, mtof(76), 0.33, 0.62, 0.11);
      brass(v, mtof(79), 0.33, 0.62, 0.11);
      tone(v, { type: 'triangle', at: 0.33, f: mtof(48), dur: 0.6, vol: 0.3 });
      noiseHit(v, { at: 0.33, dur: 0.55, vol: 0.12, type: 'highpass', f: 6500 });
    },
  },

  // dreamy harp glissando with a wobbly pad
  daydream: {
    dur: 1.2, gain: 1.45, gap: 0.3,
    build(v) {
      [72, 74, 76, 79, 81, 84, 86, 88, 91].forEach((m, i) => {
        pluck(v, m, i * 0.055, 0.14, 0.7, 0.45);
        tone(v, { at: i * 0.055, f: mtof(m), dur: 0.65, a: 0.004, vol: 0.06, vib: [4.5, 12] });
      });
      tone(v, { at: 0.45, f: mtof(84), dur: 0.72, a: 0.2, vol: 0.06, hold: true, rel: 0.3, vib: [3, 35] });
      tone(v, { at: 0.45, f: mtof(79), dur: 0.72, a: 0.2, vol: 0.05, hold: true, rel: 0.3, vib: [3.3, 35] });
    },
  },

  // "hhhnnngk-shhhwheee"
  snore: {
    dur: 1.2, gain: 0.58, gap: 0.5, max: 2, vary: 0.08,
    build(v) {
      const { ctx } = v;
      const inG = gainEnv(v, v.out, [[0, 0], [0.15, 0.6], [0.55, 0.65], [0.62, 0]]);
      const bp = filt(ctx, 'bandpass', 450, 3, inG);
      expPts(bp.frequency, v.t, [[0, 450], [0.6, 1000]]);
      noiseHit(v, { dur: 0.62, vol: 1, hold: true, rel: 0.05, dest: bp });
      const rattle = ctx.createGain();
      rattle.gain.value = 0.5;
      lfo(ctx, rattle.gain, v.t, v.t + 0.62, 26, 0.5, 0, 'square');
      const rl = filt(ctx, 'lowpass', 700, 1, rattle);
      rattle.connect(gainEnv(v, v.out, [[0, 0], [0.2, 0.3], [0.55, 0.35], [0.62, 0]]));
      sweep(v, 'sawtooth', [[0, 48], [0.6, 56]], rl, 0.62);
      tone(v, { at: 0.7, f: 700, f2: 1500, glide: 0.3, dur: 0.45, a: 0.04, vol: 0.2, hold: true, rel: 0.1, vib: [7, 20] });
      noiseHit(v, { at: 0.68, dur: 0.45, vol: 0.08, type: 'bandpass', f: 2500, q: 1, hold: true, rel: 0.15 });
    },
  },

  // game-show "EHH-ehhh"
  error: {
    dur: 0.4, gain: 0.71, gap: 0.12, max: 1,
    build(v) {
      const fl = filt(v.ctx, 'lowpass', 1400, 1, v.out);
      tone(v, { type: 'sawtooth', f: 150, dur: 0.13, vol: 0.25, hold: true, rel: 0.02, dest: fl });
      tone(v, { type: 'square', f: 157, dur: 0.13, vol: 0.12, hold: true, rel: 0.02, dest: fl });
      tone(v, { type: 'sawtooth', at: 0.18, f: 150, f2: 110, dur: 0.2, vol: 0.25, hold: true, rel: 0.04, dest: fl });
      tone(v, { type: 'square', at: 0.18, f: 157, f2: 116, dur: 0.2, vol: 0.12, hold: true, rel: 0.04, dest: fl });
    },
  },

  // squishy "plorp" + thud when decor lands
  place: {
    dur: 0.22, gain: 0.83, gap: 0.04, vary: 0.05,
    build(v) {
      tone(v, { f: 170, f2: 55, dur: 0.14, vol: 0.75 });
      tone(v, { f: 380, f2: 1150, glide: 0.04, dur: 0.045, a: 0.002, vol: 0.3 });
      const sq = squelchFilter(v, 0.01, [[0, 2600], [0.12, 280]], 9);
      noiseHit(v, { at: 0.01, dur: 0.13, vol: 0.5, dest: sq });
    },
  },

  // ratchet "tk-tk"
  rotate: {
    dur: 0.07, gain: 1.34, gap: 0.04,
    build(v) {
      noiseHit(v, { dur: 0.012, vol: 0.7, type: 'bandpass', f: 3600, q: 4 });
      noiseHit(v, { at: 0.045, dur: 0.012, vol: 0.55, type: 'bandpass', f: 2800, q: 4 });
      tone(v, { f: 2200, dur: 0.02, vol: 0.12 });
      tone(v, { at: 0.045, f: 1800, dur: 0.02, vol: 0.1 });
    },
  },

  // reverse coin: sucked-in swell then E6 -> B5
  sell: {
    dur: 0.3, gain: 0.36, gap: 0.05,
    build(v) {
      noiseHit(v, { dur: 0.07, a: 0.065, vol: 0.25, type: 'highpass', f: 3500 });
      coinNotes(v, 0.065, 1319, 988, 0.2);
      tone(v, { at: 0.13, f: 1976, f2: 988, dur: 0.15, vol: 0.05 });
    },
  },

  // register clack + coin + little bell
  purchase: {
    dur: 0.65, gain: 0.57, gap: 0.06,
    build(v) {
      noiseHit(v, { dur: 0.03, vol: 0.7, type: 'bandpass', f: 2200, q: 2.5 });
      tone(v, { type: 'triangle', f: 240, f2: 120, dur: 0.05, vol: 0.3 });
      noiseHit(v, { at: 0.04, dur: 0.035, vol: 0.45, type: 'bandpass', f: 1500, q: 2 });
      tone(v, { at: 0.04, f: 140, f2: 80, dur: 0.07, vol: 0.45 });
      coinNotes(v, 0.09, 988, 1319, 0.2);
      bell(v, 2637, 0.16, 0.45, 0.12);
    },
  },

  // hammer-and-ratchet construction rattle, then "ta-DAA!"
  expand: {
    dur: 1.22, gain: 0.9, gap: 0.3,
    build(v) {
      const r = v.rnd;
      for (let i = 0; i < 8; i++) {
        const at = i * 0.065 + r() * 0.01;
        const f = 180 + r() * 120;
        noiseHit(v, { at, dur: 0.03, vol: 0.45, type: 'bandpass', f: 700 + r() * 900, q: 3 });
        tone(v, { type: 'triangle', at, f, f2: f * 0.6, dur: 0.05, vol: 0.3 });
      }
      for (let i = 0; i < 10; i++) noiseHit(v, { at: 0.02 + i * 0.045, dur: 0.006, vol: 0.25, type: 'bandpass', f: 4000, q: 6 });
      brass(v, mtof(67), 0.58, 0.12, 0.14);
      brass(v, mtof(72), 0.72, 0.48, 0.13, true);
      brass(v, mtof(76), 0.72, 0.48, 0.1);
      brass(v, mtof(79), 0.72, 0.48, 0.1);
      noiseHit(v, { at: 0.72, dur: 0.45, vol: 0.1, type: 'highpass', f: 6500 });
    },
  },

  // cartoon "POW"
  hit: {
    dur: 0.2, gain: 1.08, gap: 0.03, max: 4, vary: 0.08,
    build(v) {
      tone(v, { f: 150, f2: 45, dur: 0.16, vol: 0.55 });
      noiseHit(v, { dur: 0.07, vol: 1, type: 'bandpass', f: 1400, f2: 600, q: 0.8 });
      tone(v, { type: 'triangle', f: 420, f2: 140, dur: 0.09, vol: 0.45 });
    },
  },

  // frying pan "BOINNNG" with a cartoon wobble
  whack: {
    dur: 0.8, gain: 0.86, gap: 0.05, vary: 0.05,
    build(v) {
      noiseHit(v, { dur: 0.025, vol: 0.6, type: 'bandpass', f: 2600, q: 1.5 });
      tone(v, { f: 120, f2: 50, dur: 0.12, vol: 0.5 });
      const parts: [number, number, number][] = [[1, 0.32, 0.75], [2.41, 0.2, 0.55], [4.12, 0.14, 0.4], [6.33, 0.08, 0.28]];
      for (const [ratio, vol, dur] of parts) {
        tone(v, { f: 330 * ratio, f2: 330 * ratio * 0.97, dur, a: 0.001, vol, vib: [7, 22] });
      }
    },
  },

  // bug zapper "BZZZT": distorted buzzing mains hum chopped by sparks
  zap: {
    dur: 0.5, gain: 0.82, gap: 0.06, max: 3,
    build(v) {
      const { ctx } = v;
      const r = v.rnd;
      const out = gainEnv(v, v.out, [[0, 0], [0.008, 0.3], [0.38, 0.28], [0.48, 0]]);
      const bp = filt(ctx, 'bandpass', 1600, 0.8, out);
      const sh = shaper(ctx, 8);
      sh.connect(bp);
      const chop = ctx.createGain();
      chop.connect(sh);
      for (let k = 0; k < 24; k++) chop.gain.setValueAtTime(r() < 0.75 ? 1 : 0.15, v.t + k * 0.02);
      const jit = new Float32Array(24);
      for (let k = 0; k < jit.length; k++) jit[k] = (50 + r() * 25) * v.p;
      for (const [type, mul] of [['sawtooth', 1], ['square', 2.02]] as [OscillatorType, number][]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueCurveAtTime(jit.map((x) => x * mul), v.t, 0.48);
        o.connect(chop);
        o.start(v.t);
        o.stop(v.t + 0.5);
      }
      noiseHit(v, { buf: crackleBuffer(ctx), dur: 0.45, vol: 0.5, type: 'highpass', f: 3000, hold: true, rel: 0.08 });
      noiseHit(v, { at: 0.4, dur: 0.08, vol: 0.25, type: 'bandpass', f: 1200 });
    },
  },

  // falling slide whistle, then little birds circling the head
  ko: {
    dur: 1.25, gain: 0.59, gap: 0.2,
    build(v) {
      tone(v, { f: 1900, f2: 380, glide: 0.65, dur: 0.7, a: 0.02, vol: 0.28, hold: true, rel: 0.05, vib: [6, 30] });
      noiseHit(v, { dur: 0.7, vol: 0.04, type: 'bandpass', f: 2000, q: 1, hold: true });
      [0.78, 0.95, 1.1].forEach((at, i) => {
        const s = 1 + (i % 2) * 0.08;
        tone(v, { at, f: 3000 * s, f2: 4300 * s, dur: 0.05, vol: 0.12 });
        tone(v, { at: at + 0.065, f: 3300 * s, f2: 4600 * s, dur: 0.045, vol: 0.1 });
      });
    },
  },

  // rising sparkle
  heal: {
    dur: 0.65, gain: 1.19, gap: 0.1,
    build(v) {
      [84, 88, 91, 96, 100, 103, 108].forEach((m, i) =>
        tone(v, { type: 'triangle', at: i * 0.04, f: mtof(m), dur: 0.3, a: 0.003, vol: 0.09 }));
      tone(v, { f: 520, f2: 1040, dur: 0.5, a: 0.15, vol: 0.08, hold: true, rel: 0.2 });
      noiseHit(v, { dur: 0.6, a: 0.25, vol: 0.05, type: 'highpass', f: 7500 });
    },
  },

  // monster roar + gong
  summon: {
    dur: 2.45, gain: 0.78, gap: 0.5, max: 1,
    build(v) {
      const { ctx } = v;
      const out = gainEnv(v, v.out, [[0, 0], [0.18, 0.38], [0.9, 0.45], [1.4, 0]]);
      const bank = formantBank(ctx, out, [[600, 5, 1.6], [1000, 6, 1.0], [2400, 8, 0.4]]);
      expPts(bank.filters[0].frequency, v.t, [[0, 600], [1.4, 450]]);
      expPts(bank.filters[1].frequency, v.t, [[0, 1000], [1.4, 760]]);
      const body = filt(ctx, 'lowpass', 400, 0.7, out);
      const sh = shaper(ctx, 3);
      sh.connect(bank.input);
      sh.connect(body);
      const pre = ctx.createGain();
      pre.gain.value = 0.5;
      pre.connect(sh);
      const contour: [number, number][] = [[0, 48], [0.3, 72], [0.9, 64], [1.4, 42]];
      sweep(v, 'sawtooth', contour, pre, 1.4, 0, [4, 30]);
      sweep(v, 'sawtooth', contour, pre, 1.4, 21);
      sweep(v, 'sawtooth', contour.map(([t, f]) => [t, f * 1.5] as [number, number]), pre, 1.4, -9);
      const growl = ctx.createGain();
      growl.gain.value = 0.5;
      lfo(ctx, growl.gain, v.t, v.t + 1.4, 33, 0.5);
      growl.connect(out);
      noiseHit(v, { dur: 1.4, vol: 0.5, type: 'lowpass', f: 900, hold: true, rel: 0.4, dest: growl });
      // gong
      noiseHit(v, { at: 1.0, dur: 0.08, vol: 0.5, type: 'lowpass', f: 1500 });
      const ratios = [1, 1.52, 2.15, 2.78, 3.6, 5.1];
      const vols = [0.36, 0.25, 0.2, 0.14, 0.1, 0.06];
      ratios.forEach((r, i) => {
        tone(v, { at: 1.0, f: 96 * r, dur: 1.45 - i * 0.15, a: 0.005, vol: vols[i] });
        if (i < 2) tone(v, { at: 1.0, f: 96 * r * 1.006, dur: 1.4, a: 0.005, vol: vols[i] * 0.5 });
      });
    },
  },

  // chiptune-surf victory jingle
  raidWin: {
    dur: 1.4, gain: 0.99, gap: 1, max: 1,
    build(v) {
      const ld = filt(v.ctx, 'lowpass', 3800, 0.7, v.out);
      const mel: [number, number, number][] = [[72, 0, 0.1], [76, 0.1, 0.1], [79, 0.2, 0.1], [84, 0.3, 0.16], [79, 0.5, 0.1], [84, 0.6, 0.72]];
      mel.forEach(([m, at, dur], i) => tone(v, {
        type: 'square', f: mtof(m), at, dur, a: 0.004, vol: 0.13, hold: true, rel: i === mel.length - 1 ? 0.25 : 0.03,
        dest: ld, vib: i === mel.length - 1 ? [6, 20, 0.15] : undefined,
      }));
      tone(v, { type: 'square', f: mtof(76), at: 0.6, dur: 0.72, vol: 0.06, hold: true, rel: 0.25, dest: ld });
      tone(v, { type: 'square', f: mtof(79), at: 0.6, dur: 0.72, vol: 0.05, hold: true, rel: 0.25, dest: ld });
      for (const [m, at, dur] of [[48, 0, 0.28], [43, 0.3, 0.28], [48, 0.6, 0.72]]) {
        tone(v, { type: 'triangle', f: mtof(m), at, dur, vol: 0.32, hold: true, rel: 0.1 });
      }
      for (const at of [0, 0.3, 0.6]) tone(v, { at, f: 120, f2: 50, dur: 0.1, vol: 0.5 });
      noiseHit(v, { at: 0.6, dur: 0.6, vol: 0.1, type: 'highpass', f: 6000 });
    },
  },

  // sad trombone: wah, wah, wah, waaaaah
  raidLose: {
    dur: 2.45, gain: 1.05, gap: 1, max: 1,
    build(v) {
      const { ctx } = v;
      const notes: [number, number, number][] = [[62, 0, 0.42], [61, 0.46, 0.42], [60, 0.92, 0.42], [59, 1.38, 1.02]];
      notes.forEach(([m, at, dur], i) => {
        const last = i === notes.length - 1;
        const f = mtof(m);
        const fl = filt(ctx, 'lowpass', 350, 6);
        linPts(fl.frequency, v.t + at, [[0, 350], [0.07, 1300], [dur - 0.08, 700]]);
        if (last) lfo(ctx, fl.frequency, v.t + at, v.t + at + dur, 5, 450, 0.25);
        const g = gainEnv(v, v.out, [[at, 0], [at + 0.03, 0.2], [at + dur - 0.06, 0.17], [at + dur, 0]]);
        fl.connect(g);
        const contour: [number, number][] = last
          ? [[at, f * 0.96], [at + 0.06, f], [at + dur - 0.3, f], [at + dur, f * 0.93]]
          : [[at, f * 0.96], [at + 0.06, f]];
        for (const det of [-6, 6]) {
          sweep(v, 'sawtooth', contour, fl, at + dur, det, last ? [5, 35, 0.2] : undefined);
        }
      });
    },
  },

  // referee whistle "FWEEEET" (pea trill via FM)
  flag: {
    dur: 0.36, gain: 0.59, gap: 0.1, max: 1,
    build(v) {
      const { ctx } = v;
      const out = gainEnv(v, v.out, [[0, 0], [0.015, 0.22], [0.3, 0.2], [0.34, 0]]);
      const o = ctx.createOscillator();
      expPts(o.frequency, v.t, [[0, 2600], [0.04, 2850]], v.p);
      lfo(ctx, o.frequency, v.t, v.t + 0.34, 38, 220);
      o.connect(out);
      o.start(v.t);
      o.stop(v.t + 0.36);
      noiseHit(v, { dur: 0.34, vol: 0.25, type: 'bandpass', f: 2850, q: 4, hold: true, rel: 0.04 });
    },
  },

  // "ARF! ARF!"
  dogBark: {
    dur: 0.36, gain: 0.82, gap: 0.1, max: 2, vary: 0.05,
    build(v) {
      const { ctx } = v;
      const bark = (at: number, f0: number, f1: number): void => {
        const out = gainEnv(v, v.out, [[0, 0], [at, 0], [at + 0.006, 0.8], [at + 0.06, 0.5], [at + 0.13, 0]]);
        const bank = formantBank(ctx, out, [[700, 4, 1.6], [1300, 6, 1.0], [2500, 8, 0.4]]);
        sweep(v, 'sawtooth', [[at, f0], [at + 0.03, f0 * 1.1], [at + 0.13, f1]], bank.input, at + 0.13);
        noiseHit(v, { at, dur: 0.07, vol: 0.2, type: 'bandpass', f: 1500, q: 1 });
      };
      bark(0, 380, 230);
      bark(0.2, 420, 250);
    },
  },

  // pug "snrrk-snrk"
  pugSnort: {
    dur: 0.36, gain: 1.82, gap: 0.1, max: 2, vary: 0.06,
    build(v) {
      const { ctx } = v;
      const snort = (at: number, dur: number, s: number): void => {
        const out = gainEnv(v, v.out, [[0, 0], [at, 0], [at + dur * 0.6, 0.9], [at + dur, 0]]);
        const am = ctx.createGain();
        am.gain.value = 0.5;
        lfo(ctx, am.gain, v.t + at, v.t + at + dur, 34, 0.5, 0, 'square');
        am.connect(out);
        noiseHit(v, { at, dur, vol: 1, type: 'bandpass', f: 700 * s, q: 2.5, hold: true, rel: 0.02, dest: am });
        const lp = filt(ctx, 'lowpass', 500, 1);
        const lg = ctx.createGain();
        lg.gain.value = 0.4;
        lp.connect(lg).connect(am);
        sweep(v, 'sawtooth', [[at, 85 * s], [at + dur, 95 * s]], lp, at + dur);
      };
      snort(0, 0.16, 1);
      snort(0.21, 0.12, 1.15);
    },
  },

  // heavy foot "THOOM" + debris
  stomp: {
    dur: 0.38, gain: 1.43, gap: 0.05, max: 3, vary: 0.05,
    build(v) {
      const r = v.rnd;
      tone(v, { f: 85, f2: 30, dur: 0.32, vol: 0.6 });
      noiseHit(v, { dur: 0.16, vol: 0.8, type: 'lowpass', f: 600 });
      noiseHit(v, { dur: 0.06, vol: 0.4, type: 'bandpass', f: 900, q: 1 });
      tone(v, { type: 'triangle', f: 160, f2: 60, dur: 0.1, vol: 0.45 });
      for (let i = 0; i < 5; i++) {
        noiseHit(v, { at: 0.04 + r() * 0.16, dur: 0.01, vol: 0.08 + r() * 0.08, type: 'bandpass', f: 1800 + r() * 2500, q: 3 });
      }
    },
  },
};
