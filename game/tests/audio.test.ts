import { afterEach, describe, expect, it } from 'vitest';
import { audio, AudioEngine, MAX_VOICES, MUSIC_TRACKS, SFX_NAMES, STORAGE_KEY } from '../src/audio';
import { getSong } from '../src/audio/music';
import { SFX } from '../src/audio/sfx';

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
    expect(() => e.music.play('joint')).not.toThrow();
    expect(() => e.music.stop()).not.toThrow();
  });

  it('play() and music.play() before unlock() never create an AudioContext', () => {
    let constructed = 0;
    class FakeCtx {
      constructor() {
        constructed++;
      }
    }
    stub('AudioContext', { value: FakeCtx, writable: true });
    const e = new AudioEngine('test.prelock');
    for (const n of SFX_NAMES) e.play(n, { volume: 1, pitch: 1.2, pan: -0.5 });
    e.music.play('raid');
    expect(constructed).toBe(0);
    expect(e.voiceCount).toBe(0);
    expect(e.state).toBe('none');
    // the requested track is remembered for when audio unlocks
    expect(e.music.current).toBe('raid');
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
  const required = [
    'tap', 'open', 'close', 'coin', 'cashRegister', 'sizzle', 'ding', 'plate', 'burn', 'chomp', 'scream',
    'groan', 'infect', 'levelUp', 'daydream', 'snore', 'error', 'place', 'rotate', 'sell', 'purchase',
    'expand', 'hit', 'whack', 'zap', 'ko', 'heal', 'summon', 'raidWin', 'raidLose', 'flag', 'dogBark',
    'pugSnort', 'stomp',
  ];

  it('SfxName list covers every required sound exactly once', () => {
    expect([...SFX_NAMES].sort()).toEqual([...required].sort());
    expect(new Set(SFX_NAMES).size).toBe(SFX_NAMES.length);
  });

  it('every sound has a recipe with sane length and trim', () => {
    for (const n of SFX_NAMES) {
      const d = SFX[n];
      expect(typeof d.build, n).toBe('function');
      expect(d.dur, n).toBeGreaterThan(0);
      expect(d.dur, n).toBeLessThanOrEqual(2.5);
      expect(d.gain, n).toBeGreaterThan(0);
      expect(d.gain, n).toBeLessThan(2);
    }
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
