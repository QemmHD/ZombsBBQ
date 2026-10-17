// Sample bank: fetches + decodes the OGG files under public/audio/ on demand, a few at a time.
// Everything is best-effort: a missing or undecodable file simply stays 'failed' and the engine keeps
// using the synth recipe for that sound. Nothing here runs until the engine has an AudioContext.

import { SAMPLE_DIR } from './manifest';

export type SampleStatus = 'idle' | 'loading' | 'ready' | 'failed';

type Fetch = (url: string) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer> }>;

/** Where the audio files live, relative to the page (Vite's base, './' in the build). */
export function sampleBase(): string {
  let base = './';
  try {
    const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
    if (env && typeof env.BASE_URL === 'string' && env.BASE_URL) base = env.BASE_URL;
  } catch {
    /* no import.meta.env (tests) */
  }
  if (!base.endsWith('/')) base += '/';
  return base + SAMPLE_DIR;
}

export class SampleBank {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly state = new Map<string, SampleStatus>();
  private readonly queue: string[] = [];
  private readonly waiters = new Map<string, Array<(b: AudioBuffer | null) => void>>();
  private inflight = 0;
  /** Called after every finished load (ready or failed) so the engine can start what was waiting. */
  onLoad: ((file: string, ok: boolean) => void) | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly base = sampleBase(),
    private readonly concurrency = 4,
    private readonly fetcher: Fetch | null = typeof fetch === 'function' ? (u) => fetch(u) : null,
  ) {}

  status(file: string): SampleStatus {
    return this.state.get(file) ?? 'idle';
  }

  get(file: string): AudioBuffer | undefined {
    return this.buffers.get(file);
  }

  /** Queue files for loading in this order (already queued / loaded ones are skipped). */
  preload(files: readonly string[]): void {
    for (const f of files) {
      if (this.state.has(f)) continue;
      this.state.set(f, 'loading');
      this.queue.push(f);
    }
    this.pump();
  }

  /** Load one file ahead of the queue; resolves with the buffer or null. */
  load(file: string): Promise<AudioBuffer | null> {
    const st = this.status(file);
    if (st === 'ready') return Promise.resolve(this.buffers.get(file) ?? null);
    if (st === 'failed') return Promise.resolve(null);
    return new Promise((resolve) => {
      const w = this.waiters.get(file);
      if (w) w.push(resolve);
      else this.waiters.set(file, [resolve]);
      if (st === 'idle') {
        this.state.set(file, 'loading');
        this.queue.unshift(file);
      } else {
        const i = this.queue.indexOf(file);
        if (i > 0) {
          this.queue.splice(i, 1);
          this.queue.unshift(file);
        }
      }
      this.pump();
    });
  }

  private pump(): void {
    while (this.inflight < this.concurrency && this.queue.length) {
      const file = this.queue.shift()!;
      this.inflight++;
      this.fetchDecode(file).then(
        (buf) => this.finish(file, buf),
        () => this.finish(file, null),
      );
    }
  }

  private finish(file: string, buf: AudioBuffer | null): void {
    this.inflight--;
    if (buf) {
      this.buffers.set(file, buf);
      this.state.set(file, 'ready');
    } else this.state.set(file, 'failed');
    const ws = this.waiters.get(file);
    this.waiters.delete(file);
    if (ws) for (const w of ws) w(buf);
    try {
      this.onLoad?.(file, !!buf);
    } catch {
      /* listener problems never break loading */
    }
    this.pump();
  }

  private async fetchDecode(file: string): Promise<AudioBuffer | null> {
    if (!this.fetcher) return null;
    const res = await this.fetcher(this.base + file);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    return decode(this.ctx, bytes);
  }
}

/** decodeAudioData in both its promise and (old Safari) callback forms. */
function decode(ctx: BaseAudioContext, bytes: ArrayBuffer): Promise<AudioBuffer | null> {
  return new Promise((resolve) => {
    try {
      const r = ctx.decodeAudioData(bytes, (b) => resolve(b), () => resolve(null));
      if (r && typeof (r as Promise<AudioBuffer>).then === 'function') {
        (r as Promise<AudioBuffer>).then((b) => resolve(b), () => resolve(null));
      }
    } catch {
      resolve(null);
    }
  });
}
