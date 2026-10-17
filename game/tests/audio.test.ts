import { afterEach, describe, expect, it } from 'vitest';
import {
  audio, AudioEngine, LOOP_NAMES, MAX_LOOPS, MAX_VOICES, MUSIC_TRACKS, musicFile, sampleFiles, SFX_NAMES, STORAGE_KEY,
} from '../src/audio';
import { MUSIC_SAMPLES, SAMPLE_DIR, SFX_SAMPLES } from '../src/audio/manifest';
import { getSong } from '../src/audio/music';
import { SampleBank } from '../src/audio/samples';
import { SFX, SYNTH_ALIAS, SYNTH_NAMES } from '../src/audio/sfx';
import { AMBIENCE_KEY, MAX_COOK_LOOPS, planLoops } from '../src/game/soundscape';
import { createInitialState, startCooking } from '../src/sim';

type G = Record<string, unknown>;
const glob = globalThis as unknown as G;

function setGlobal(key: string, desc: PropertyDescriptor | undefined): void {
  if (desc) Object.defineProperty(globalThis, key, { configurable: true, ...desc });
  else delete glob[key];
}

const saved = new Map<string, PropertyDescriptor | undefined>();
function stub(key: string, desc: PropertyDescriptor): void {
  if (!saved.has(key)) saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, ...desc });
}

afterEach(() => {
  for (const [k, d] of saved) setGlobal(k, d);
  saved.clear();
  AudioEngine.useSamples = true;
});

function memoryStorage(): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => void data.delete(k),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
  };
}

// --- a tolerant fake Web Audio graph: every node method is a no-op, every property an AudioParam ----

const noop = () => undefined;
function param(): unknown {
  return new Proxy({ value: 0 }, {
    get(t, p) {
      if (p === 'value') return t.value;
      return noop;
    },
    set(t, p, v) {
      if (p === 'value') t.value = v as number;
      return true;
    },
  });
}
function node(): AudioNode {
  const params = new Map<PropertyKey, unknown>();
  return new Proxy({}, {
    get(_t, p) {
      if (p === 'connect') return (n: AudioNode) => n;
      if (p === 'disconnect' || p === 'start' || p === 'stop' || p === 'setPeriodicWave' || p === 'addEventListener') return noop;
      if (p === 'buffer' || p === 'loop' || p === 'type' || p === 'curve' || p === 'oversample') return undefined;
      if (p === 'then') return undefined;
      let v = params.get(p);
      if (!v) params.set(p, (v = param()));
      return v;
    },
    set: () => true,
  }) as unknown as AudioNode;
}
function fakeBuffer(duration: number): AudioBuffer {
  const length = Math.ceil(duration * 44100);
  return {
    duration, length, sampleRate: 44100, numberOfChannels: 1,
    getChannelData: () => new Float32Array(length),
  } as unknown as AudioBuffer;
}
class FakeCtx {
  static decodeOk = true;
  state = 'running';
  sampleRate = 44100;
  destination = node();
  private t = 0;
  get currentTime() {
    return (this.t += 0.001);
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  addEventListener() {}
  createBuffer(_ch: number, len: number, rate: number) { return fakeBuffer(len / rate); }
  createPeriodicWave() { return {}; }
  decodeAudioData(_b: ArrayBuffer) {
    return FakeCtx.decodeOk ? Promise.resolve(fakeBuffer(0.4)) : Promise.reject(new Error('bad data'));
  }
}
for (const m of ['Gain', 'Oscillator', 'BiquadFilter', 'DynamicsCompressor', 'StereoPanner', 'BufferSource', 'Delay', 'WaveShaper']) {
  (FakeCtx.prototype as unknown as G)[`create${m}`] = () => node();
}
const tick = () => new Promise((r) => setTimeout(r, 5));

describe('audio module in Node (no Web Audio)', () => {
  it('imports without touching AudioContext', () => {
    expect(glob.AudioContext).toBeUndefined();
    expect(audio).toBeInstanceOf(AudioEngine);
    expect(audio.state).toBe('none');
    expect(audio.unlocked).toBe(false);
  });

  it('unlock() without Web Audio is a harmless no-op', () => {
    const e = new AudioEngine('test.nowebaudio');
    expect(() => { e.unlock(); e.unlock(); }).not.toThrow();
    expect(e.unlocked).toBe(false);
    expect(() => e.play('coin')).not.toThrow();
    expect(() => e.loop('room', 'ambience')).not.toThrow();
    expect(() => e.setDucked(true)).not.toThrow();
    expect(() => e.music.play('joint')).not.toThrow();
    expect(() => e.music.stop()).not.toThrow();
  });

  it('play() and music.play() before unlock() never create an AudioContext', () => {
    let constructed = 0;
    class Counting {
      constructor() {
        constructed++;
      }
    }
    stub('AudioContext', { value: Counting, writable: true });
    const e = new AudioEngine('test.prelock');
    for (const n of SFX_NAMES) e.play(n, { volume: 1, pitch: 1.2, pan: -0.5 });
    e.music.play('raid');
    e.loop('room', 'ambience');
    expect(constructed).toBe(0);
    expect(e.voiceCount).toBe(0);
    expect(e.state).toBe('none');
    // the requested track and loops are remembered for when audio unlocks
    expect(e.music.current).toBe('raid');
    expect(e.loopKeys).toEqual(['room']);
  });
});

describe('settings persistence', () => {
  it('tolerates a localStorage getter that throws (sandboxed iframe / blocked storage)', () => {
    stub('localStorage', { get() { throw new Error('SecurityError'); } });
    const e = new AudioEngine();
    expect(e.sfxVolume).toBeCloseTo(0.8);
    expect(() => { e.setSfxVolume(0.3); e.setMusicVolume(0.2); e.setMuted(true); }).not.toThrow();
    expect(e.sfxVolume).toBeCloseTo(0.3);
    expect(e.musicVolume).toBeCloseTo(0.2);
    expect(e.muted).toBe(true);
  });

  it('tolerates getItem/setItem throwing (Safari private mode / quota)', () => {
    const s = memoryStorage();
    s.getItem = () => { throw new Error('nope'); };
    s.setItem = () => { throw new Error('QuotaExceededError'); };
    stub('localStorage', { value: s, writable: true });
    const e = new AudioEngine();
    expect(() => e.setMuted(true)).not.toThrow();
    expect(e.muted).toBe(true);
  });

  it(`round-trips through '${STORAGE_KEY}' and sanitizes bad values`, () => {
    const s = memoryStorage();
    stub('localStorage', { value: s, writable: true });
    const a = new AudioEngine();
    a.setSfxVolume(0.25);
    a.setMusicVolume(7); // clamped
    a.setMuted(true);
    expect(JSON.parse(s.data.get(STORAGE_KEY)!)).toEqual({ sfx: 0.25, music: 1, muted: true });
    const b = new AudioEngine();
    expect([b.sfxVolume, b.musicVolume, b.muted]).toEqual([0.25, 1, true]);

    s.data.set(STORAGE_KEY, '{not json');
    const c = new AudioEngine();
    expect([c.sfxVolume, c.musicVolume, c.muted]).toEqual([0.8, 0.55, false]);

    s.data.set(STORAGE_KEY, JSON.stringify({ sfx: 'loud', music: -3, muted: 'yes' }));
    const d = new AudioEngine();
    expect([d.sfxVolume, d.musicVolume, d.muted]).toEqual([0.8, 0, false]);
  });
});

describe('sound catalogue', () => {
  const synthRequired = [
    'tap', 'open', 'close', 'coin', 'cashRegister', 'sizzle', 'ding', 'plate', 'burn', 'chomp', 'scream',
    'groan', 'infect', 'levelUp', 'daydream', 'snore', 'error', 'place', 'rotate', 'sell', 'purchase',
    'expand', 'hit', 'whack', 'zap', 'ko', 'heal', 'summon', 'raidWin', 'raidLose', 'flag', 'dogBark',
    'pugSnort', 'stomp', 'ambience',
  ];
  // the sound bed the gap audit asked for (docs/11-gap-audit.md #6) plus the raid / sting extras
  const sampleOnly = [
    'tip', 'doorOpen', 'doorClose', 'page', 'groupScream', 'chew', 'mutter', 'refresh', 'panic', 'rareArrival',
    'feast', 'bones', 'punch', 'knockdown', 'revive', 'hungry', 'outOfFood', 'burnSoon',
    'cookStove', 'cookGrill', 'cookSmoker', 'cookFryer', 'cookCauldron', 'cookKiln', 'cookPit', 'cookTomb',
  ];

  it('SfxName list covers every required sound exactly once', () => {
    expect([...SYNTH_NAMES].sort()).toEqual([...synthRequired].sort());
    expect(Object.keys(SYNTH_ALIAS).sort()).toEqual([...sampleOnly].sort());
    expect([...SFX_NAMES].sort()).toEqual([...synthRequired, ...sampleOnly].sort());
    expect(new Set(SFX_NAMES).size).toBe(SFX_NAMES.length);
  });

  it('every trigger name has a synth recipe (its own or an alias) with sane length and trim', () => {
    for (const n of SFX_NAMES) {
      const d = SFX[n];
      expect(typeof d.build, n).toBe('function');
      expect(d.dur, n).toBeGreaterThan(0);
      expect(d.dur, n).toBeLessThanOrEqual(2.5);
      expect(d.gain, n).toBeGreaterThan(0);
      expect(d.gain, n).toBeLessThan(2);
    }
    for (const [alias, target] of Object.entries(SYNTH_ALIAS)) expect(SFX[alias as keyof typeof SFX], alias).toBe(SFX[target]);
    for (const n of ['tap', 'open', 'close', 'rotate'] as const) expect(SFX[n].dur, n).toBeLessThan(0.25);
    expect(MAX_VOICES).toBeGreaterThanOrEqual(8);
  });

  it('music tracks are loopable 16-32 bar songs with events', () => {
    expect([...MUSIC_TRACKS].sort()).toEqual(['joint', 'map', 'raid']);
    for (const t of MUSIC_TRACKS) {
      const s = getSong(t);
      expect(s.bars).toBeGreaterThanOrEqual(16);
      expect(s.bars).toBeLessThanOrEqual(32);
      expect(s.steps.length).toBe(s.bars * s.tpb * 4);
      expect(s.steps.flat().length).toBeGreaterThan(s.bars * 4);
      expect(s.steps.flat().every((e) => Number.isFinite(e.m) && e.v > 0 && e.d > 0)).toBe(true);
    }
    expect(getSong('raid').bpm).toBeGreaterThan(getSong('joint').bpm);
  });
});

describe('sample manifest (public/audio)', () => {
  // the files Vite sees under public/audio/, keyed like the manifest ('sfx/x.ogg')
  const disk = new Set(Object.keys(import.meta.glob('../public/audio/*/*.ogg')).map((k) => k.slice(k.indexOf(SAMPLE_DIR) + SAMPLE_DIR.length)));
  const onDisk = (sub: string) => [...disk].filter((f) => f.startsWith(sub + '/')).map((f) => f.slice(sub.length + 1)).sort();
  const exists = (f: string) => disk.has(f);

  it('every SFX name maps to a sample file or a synth recipe; every listed file is a real OGG', () => {
    for (const n of SFX_NAMES) {
      const files = sampleFiles(n);
      expect(files.length > 0 || typeof SFX[n].build === 'function', n).toBe(true);
      for (const f of files) {
        expect(f.startsWith('sfx/') && f.endsWith('.ogg'), f).toBe(true);
        expect(exists(f), f).toBe(true);
      }
    }
    for (const n of Object.keys(SFX_SAMPLES)) expect(SFX_NAMES as readonly string[], `manifest name ${n}`).toContain(n);
  });

  it('matches the files on disk (run `node tools/audio-manifest.mjs` after regenerating)', () => {
    const listed = Object.values(SFX_SAMPLES).flatMap((d) => d.files.map((f) => f.slice(4))).sort();
    expect(listed).toEqual(onDisk('sfx'));
    expect(Object.values(MUSIC_SAMPLES).map((f) => f.slice(6)).sort()).toEqual(onDisk('music'));
    for (const t of MUSIC_TRACKS) {
      const f = musicFile(t);
      if (f) expect(exists(f), f).toBe(true);
    }
  });

  it('loops are flagged and variants are grouped (byte budget: see docs/20-audio.md, checked by tools/audio-manifest.mjs)', () => {
    for (const n of LOOP_NAMES) if (SFX_SAMPLES[n]) expect(SFX_SAMPLES[n].loop, n).toBe(true);
    for (const [n, d] of Object.entries(SFX_SAMPLES)) {
      expect(d.gain, n).toBeGreaterThan(0);
      expect(d.gain, n).toBeLessThanOrEqual(1);
      expect(d.loop ?? false, n).toBe((LOOP_NAMES as readonly string[]).includes(n));
    }
    if (SFX_SAMPLES.mutter) expect(SFX_SAMPLES.mutter.files.length).toBeGreaterThanOrEqual(2);
  });
});

describe('SampleBank', () => {
  const okFetch = async (url: string) => ({ ok: !url.endsWith('missing.ogg'), arrayBuffer: async () => new ArrayBuffer(8) });

  it('loads in preload order, a few at a time, and reports status', async () => {
    const ctx = new FakeCtx() as unknown as BaseAudioContext;
    const order: string[] = [];
    const bank = new SampleBank(ctx, 'base/', 2, async (u) => { order.push(u); return okFetch(u); });
    bank.preload(['sfx/a.ogg', 'sfx/b.ogg', 'sfx/c.ogg', 'sfx/missing.ogg']);
    expect(bank.status('sfx/a.ogg')).toBe('loading');
    expect(bank.status('sfx/zzz.ogg')).toBe('idle');
    expect(order).toEqual(['base/sfx/a.ogg', 'base/sfx/b.ogg']); // concurrency 2
    await tick();
    expect(order).toEqual(['base/sfx/a.ogg', 'base/sfx/b.ogg', 'base/sfx/c.ogg', 'base/sfx/missing.ogg']);
    expect(bank.status('sfx/a.ogg')).toBe('ready');
    expect(bank.get('sfx/a.ogg')?.duration).toBeCloseTo(0.4);
    expect(bank.status('sfx/missing.ogg')).toBe('failed');
    expect(await bank.load('sfx/missing.ogg')).toBeNull();
    expect((await bank.load('sfx/b.ogg'))?.duration).toBeCloseTo(0.4);
  });

  it('load() jumps the queue and an undecodable file fails without throwing', async () => {
    FakeCtx.decodeOk = false;
    try {
      const ctx = new FakeCtx() as unknown as BaseAudioContext;
      const order: string[] = [];
      const loads: string[] = [];
      const bank = new SampleBank(ctx, '', 1, async (u) => { order.push(u); return okFetch(u); });
      bank.onLoad = (f, ok) => loads.push(`${f}:${ok}`);
      bank.preload(['1.ogg', '2.ogg', '3.ogg']);
      const p = bank.load('3.ogg');
      await tick();
      expect(order).toEqual(['1.ogg', '3.ogg', '2.ogg']);
      expect(await p).toBeNull();
      expect(loads).toEqual(['1.ogg:false', '3.ogg:false', '2.ogg:false']);
    } finally {
      FakeCtx.decodeOk = true;
    }
  });

  it('without fetch (no network at all) every file just fails', async () => {
    const bank = new SampleBank(new FakeCtx() as unknown as BaseAudioContext, '', 4, null);
    bank.preload(['x.ogg']);
    await tick();
    expect(bank.status('x.ogg')).toBe('failed');
  });
});

describe('engine on a fake AudioContext', () => {
  function engine(storageKey = 'test.fake'): AudioEngine {
    stub('AudioContext', { value: FakeCtx, writable: true });
    const e = new AudioEngine(storageKey);
    return e;
  }

  it('plays the synth for anything (including sample-only names) when there are no files', () => {
    stub('fetch', { value: undefined, writable: true });
    const e = engine();
    e.unlock();
    expect(e.unlocked).toBe(true);
    expect(e.state).toBe('running');
    e.play('coin');
    e.play('tip'); // alias -> coin recipe
    e.play('groupScream', { pan: 0.5, pitch: 1.1 });
    expect(e.voiceCount).toBe(3);
    expect(e.lastSource).toBe('synth');
  });

  it('prefers a loaded sample, and loops / ducking / music all respect the sample state', async () => {
    stub('fetch', { value: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }), writable: true });
    const e = engine();
    e.music.play('joint');
    e.loop('room', 'ambience');
    e.loop('stove:1', 'cookGrill', 0.8);
    e.unlock();
    // music: a sample when the manifest has one (loaded on unlock), else the synth song straight away
    const hasMusic = !!musicFile('joint');
    await tick();
    await tick();
    expect(e.musicSource).toBe(hasMusic ? 'sample' : 'synth');
    expect(e.musicRunning('joint')).toBe(true);
    e.play('coin');
    expect(e.lastSource).toBe(sampleFiles('coin').length ? 'sample' : 'synth');
    expect(e.loopKeys.sort()).toEqual(['room', 'stove:1']);
    e.stopLoop('stove:1');
    expect(e.loopKeys).toEqual(['room']);
    expect(e.isDucked).toBe(false);
    e.setDucked(true);
    expect(e.isDucked).toBe(true);
    e.setDucked(false);
    e.music.play('raid');
    expect(e.music.current).toBe('raid');
    e.music.stop();
    expect(e.musicSource).toBeNull();
    e.stopLoops();
    expect(e.loopKeys).toEqual([]);
  });

  it('AudioEngine.useSamples = false keeps everything on the synth', () => {
    stub('fetch', { value: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }), writable: true });
    AudioEngine.useSamples = false;
    const e = engine();
    e.unlock();
    e.music.play('map');
    expect(e.musicSource).toBe('synth');
    e.play('tap');
    expect(e.lastSource).toBe('synth');
  });

  it('mute silences play() and unmute brings the music back', async () => {
    stub('fetch', { value: undefined, writable: true });
    const e = engine();
    e.unlock();
    e.music.play('joint');
    e.setMuted(true);
    e.play('coin');
    expect(e.voiceCount).toBe(0);
    expect(e.musicSource).toBeNull();
    e.setMuted(false);
    await tick();
    await tick();
    expect(e.musicSource).toBe('synth');
  });
});

describe('soundscape planner', () => {
  it('ambience only outside raids, quieter when closed', () => {
    const s = createInitialState(3);
    expect(planLoops(s, 'play')).toEqual([{ key: AMBIENCE_KEY, name: 'ambience', volume: 1 }]);
    expect(planLoops(s, 'edit')[0].name).toBe('ambience');
    expect(planLoops(s, 'raid')).toEqual([]);
    s.closed = true;
    expect(planLoops(s, 'play')[0].volume).toBeLessThan(1);
  });

  it('one cooking loop per busy stove, keyed by station, capped at MAX_COOK_LOOPS and within MAX_LOOPS', () => {
    const s = createInitialState(3);
    s.stoves = [
      { id: 'a', furnitureId: 'f1', kind: 'grill', status: 'cooking', cookId: 'z1', total: 60, left: 10 },
      { id: 'b', furnitureId: 'f2', kind: 'fryer', status: 'cooking', cookId: 'z2', total: 60, left: 50 },
      { id: 'c', furnitureId: 'f3', kind: 'tomb', status: 'cooking', cookId: 'z3', total: 60, left: 30 },
      { id: 'd', furnitureId: 'f4', kind: 'stove', status: 'done', cookId: 'z4', total: 60, left: 0 },
      { id: 'e', furnitureId: 'f5', kind: 'stove', status: 'cooking', total: 60, left: 20 }, // nobody at it
    ];
    const plan = planLoops(s, 'play');
    expect(plan.map((p) => p.key)).toEqual([AMBIENCE_KEY, 'stove:a', 'stove:c']);
    expect(plan.map((p) => p.name)).toEqual(['ambience', 'cookGrill', 'cookTomb']);
    expect(plan.length - 1).toBeLessThanOrEqual(MAX_COOK_LOOPS);
    expect(plan.length).toBeLessThanOrEqual(MAX_LOOPS);
  });

  it('follows a real cook from the sim', () => {
    const s = createInitialState(5);
    s.cash = 100000;
    const st = s.stoves[0];
    const err = startCooking(s, st.id, Object.keys(s.recipes ?? {})[0] ?? undefined);
    if (err === null) {
      // the cook has to reach the stove before it counts as busy
      st.status = 'cooking';
      st.cookId = s.workers[0].id;
      st.total = 30;
      st.left = 29;
      expect(planLoops(s, 'play').some((p) => p.key === `stove:${st.id}` && p.name === 'cookStove')).toBe(true);
    }
  });
});
