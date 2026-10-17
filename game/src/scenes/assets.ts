/**
 * Art registry + texture loading. SVG art is rasterized into Phaser textures on demand:
 * the lot and the in-world FX up front, the walls and floors the layout uses, furniture the first
 * time it is placed, characters the first time they're needed. Only what is on screen sits in
 * iPhone memory:
 *   - the art itself (the SVG strings) is generated lazily, per group (see artreg.ts);
 *   - once a texture is on the GPU its decoded <img> is dropped (WebGL keeps the pixels; after a
 *     context loss we rasterize the SVG again, see `restoreTextures`);
 *   - textures are owned by whoever asked for them (a scene, or the decorating mode). When an owner
 *     goes (the raid ends, decorating is done) its textures are freed unless something still shows
 *     them; characters and unowned art that nobody has shown for a minute are freed too (`sweepTextures`).
 *     Everything frees cleanly, so the next request rasterizes it again.
 * Images are created directly (not via the Phaser loader) so it works under strict content-security
 * policies (embedded pages, app shells).
 */
import type Phaser from 'phaser';
import type { ArtAsset, CharArt, CharPart } from '../art/types';
import { buildChar3 } from '../art3/chars';
import { buildRaidChar3 } from '../art3/chars/raidcast';
import { buildPet } from '../art3/chars/pets';
import { ArtRegistry } from './artreg';

const DPR = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
/** Rasterization scale: textures are drawn bigger than world units so zoomed-in Retina stays crisp. */
export const TEX_S = Math.min(3, Math.max(2, DPR * 1.1));
/** Big flat surfaces (ground, walls, floors) never need more than 2x: they're soft painted textures. */
export const TEX_S_LOW = Math.min(TEX_S, 2);
/** Characters and unowned art that haven't been on screen this long are freed. */
export const IDLE_EVICT_MS = 60_000;

export const svgData = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const reg = new ArtRegistry();
const chars = new Map<string, CharArt | null>();

function safe<T>(f: () => T, fallback: T): T {
  try {
    return f();
  } catch (e) {
    console.warn('art build failed', e);
    return fallback;
  }
}

/** World art (v3, then the few older icons still in use). */
export function propMeta(key: string): ArtAsset | undefined {
  return reg.world3(key)?.a;
}

export function hasProp(key: string) {
  return !!reg.world3(key);
}

/** DOM art: HUD icons first, then world art. */
const anyArt = (key: string) => reg.any(key)?.a;

export function hasArt(key: string): boolean {
  return !!anyArt(key);
}

/** Every asset in the registry (tests, art review). */
export function allArt(): ArtAsset[] {
  reg.buildAll();
  return reg.groups.flatMap((g) => reg.group(g.name));
}

/** The rasterization scale of a prop texture. */
export function texScale(key: string): number {
  const t = texs.get(key);
  if (t) return t.scale;
  const e = reg.world3(key);
  return e?.group.lowRes?.(key) ? TEX_S_LOW : TEX_S;
}

/** A character's art: v3 joint rigs, then the v3 raid cast, then the pets. */
export function charArt(id: string): CharArt | null {
  if (!chars.has(id)) {
    let a: CharArt | null = safe(() => buildChar3(id), null);
    if (!a || !a.parts?.length) a = safe(() => buildRaidChar3(id), null);
    if (!a || !a.parts?.length) a = safe(() => buildPet(id), null);
    // nobody by that name: null (callers fall back, e.g. a waitress to her waiter)
    chars.set(id, a && a.parts?.length ? a : null);
  }
  return chars.get(id) ?? null;
}

// ---------------------------------------------------------------- URLs for the DOM

/**
 * `blob:` URLs keep HUD markup tiny (a 15–54 KB data URL in every card re-render costs string building
 * and parsing). Some hosts' content-security policy blocks blob: images, so they are only used once a
 * test image has loaded; until then (or if it never does) art is served as data URLs.
 */
let blobOk = false;
const urlCache = new Map<string, string>();

function probeBlob() {
  if (typeof window === 'undefined' || typeof Blob === 'undefined' || !URL.createObjectURL) return;
  try {
    const u = URL.createObjectURL(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      blobOk = true;
      URL.revokeObjectURL(u);
      // from now on hand out blob: URLs (the data URLs handed out so far stay valid)
      urlCache.clear();
    };
    img.onerror = () => URL.revokeObjectURL(u);
    img.src = u;
  } catch {
    /* data URLs it is */
  }
}
probeBlob();

/** A URL for this SVG, cached under `cacheKey` for the life of the page. */
function svgUrl(cacheKey: string, svg: () => string | undefined): string {
  let u = urlCache.get(cacheKey);
  if (u !== undefined) return u;
  const s = svg();
  u = !s ? '' : blobOk ? URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })) : svgData(s);
  urlCache.set(cacheKey, u);
  return u;
}

/** URL for DOM use (HUD icons, portraits, dish icons, map). */
export function artUrl(key: string): string {
  return svgUrl(key, () => anyArt(key)?.svg);
}

/** URL for a texture that CSS stretches to any box (backgrounds, nine-slice borders). */
export function artUrlStretch(key: string): string {
  return svgUrl(`stretch:${key}`, () => anyArt(key)?.svg.replace(/^<svg /, '<svg preserveAspectRatio="none" '));
}

const rasters = new Map<string, Promise<string>>();
const rasterDone = new Map<string, string>();
/**
 * Big, effect-heavy art (the raid map) as a flat JPEG, drawn once in the background:
 * redrawing a huge SVG with blurs on every menu open stutters on phones.
 */
export function rasterUrl(key: string, scale = 1): Promise<string> {
  let p = rasters.get(key);
  if (p) return p;
  const a = anyArt(key);
  if (!a) return Promise.resolve('');
  p = loadImage(a.svg).then(
    (img) =>
      new Promise<string>((resolve) => {
        if (!img) return resolve('');
        const c = document.createElement('canvas');
        c.width = Math.round(a.w * scale);
        c.height = Math.round(a.h * scale);
        const g = c.getContext('2d');
        if (!g) return resolve('');
        g.drawImage(img, 0, 0, c.width, c.height);
        // toBlob encodes off the main thread; data URL only where blob: images are blocked
        if (blobOk && c.toBlob) c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : c.toDataURL('image/jpeg', 0.86)), 'image/jpeg', 0.86);
        else resolve(c.toDataURL('image/jpeg', 0.86));
      }),
  );
  rasters.set(key, p);
  return p;
}

/** The flat JPEG version if it's ready, else the SVG (and start flattening it for next time). */
export function rasterOrSvg(key: string, scale = 1.25): string {
  const done = rasterDone.get(key);
  if (done) return done;
  prewarmRaster(key, scale);
  return artUrl(key);
}

export function prewarmRaster(key: string, scale = 1) {
  void rasterUrl(key, scale).then((u) => {
    if (!u) return;
    rasterDone.set(key, u);
    // flattened: the SVG (800 KB for the raid map) isn't needed any more
    forgetSvg(key);
  });
}

function forgetSvg(key: string) {
  reg.forget(key);
  for (const k of [key, `stretch:${key}`]) {
    const u = urlCache.get(k);
    if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
    urlCache.delete(k);
  }
}

const autoCrops = new Map<string, [number, number, number, number]>();
/** Measure the painted bounds of some art (async, once) so thumbnails can be cropped to it. */
export function measureCrops(keys: string[], pad = 3) {
  for (const key of keys) {
    const a = anyArt(key);
    if (!a || autoCrops.has(key)) continue;
    void loadImage(a.svg).then((img) => {
      if (!img) return;
      const S = 2;
      const c = document.createElement('canvas');
      c.width = a.w * S;
      c.height = a.h * S;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (!g) return;
      g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width,
        y0 = c.height,
        x1 = -1,
        y1 = -1;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if (d[(y * c.width + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      if (x1 < 0) return;
      // square-ish box around the painted area
      let bx = x0 / S - pad,
        by = y0 / S - pad;
      const bw = (x1 - x0) / S + pad * 2,
        bh = (y1 - y0) / S + pad * 2;
      const side = Math.max(bw, bh);
      bx -= (side - bw) / 2;
      by -= (side - bh) / 2;
      autoCrops.set(key, [bx, by, side, side].map((v) => Math.round(v * 10) / 10) as [number, number, number, number]);
    });
  }
}

/** Art cropped to its painted bounds when measured, else the whole canvas. */
export function artUrlFit(key: string): string {
  const c = autoCrops.get(key);
  return c ? artUrlCrop(key, ...c) : artUrl(key);
}

/** Same art cropped to a box (wall hangings live in a tall wall-sized canvas, too small as shop thumbnails). */
export function artUrlCrop(key: string, x: number, y: number, w: number, h: number): string {
  return svgUrl(`crop:${key}:${x},${y},${w},${h}`, () => anyArt(key)?.svg.replace(/width="[^"]*" height="[^"]*" viewBox="[^"]*"/, `width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"`));
}

/** Portrait = the character's head part (or a face variant). */
export function headUrl(charId: string, face?: string): string {
  return svgUrl(`head:${charId}:${face ?? ''}`, () => {
    const art = charArt(charId);
    const part = (face && art?.faces?.[face as keyof NonNullable<CharArt['faces']>]) || art?.parts.find((p) => p.key.endsWith('_head'));
    return part?.svg;
  });
}

// ---------------------------------------------------------------- textures

/** Decode an SVG into an <img> (null if it fails). */
function loadImage(svg: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = blobOk ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })) : svgData(svg);
    const done = (ok: boolean) => {
      if (blobOk && url.startsWith('blob:')) URL.revokeObjectURL(url);
      resolve(ok ? img : null);
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

function sized(svg: string, w: number, h: number, scale: number): string {
  return svg.replace(/<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 width="${(w * scale).toFixed(1)}" height="${(h * scale).toFixed(1)}"`);
}

interface Tex {
  /** who asked for it: scene instances ('joint#1', 'raid#3') or modes ('edit') */
  owners: Set<string>;
  /** the character whose part this is */
  char?: string;
  scale: number;
  /** what to rasterize (kept by reference; the strings live in the art registry anyway) */
  src: { svg: string; w: number; h: number };
  loaded: boolean;
  /** last time a game object was seen showing it (performance.now()) */
  seen: number;
}
const texs = new Map<string, Tex>();
const pending = new Map<string, Promise<void>>();
const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

const sceneIds = new WeakMap<Phaser.Scene, string>();
let sceneSeq = 0;
/** Owner id of a scene instance (each raid is a fresh RaidScene, so each gets its own id). */
function ownerOf(scene: Phaser.Scene): string {
  let id = sceneIds.get(scene);
  if (!id) sceneIds.set(scene, (id = `${scene.sys.settings.key}#${++sceneSeq}`));
  return id;
}

/** Once a texture is on the GPU, let go of its <img> (WebGL keeps the pixels). */
function dropSource(game: Phaser.Game, t: Phaser.Textures.Texture) {
  // the canvas renderer draws from the image every frame: keep it there
  if (!(game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl) return;
  for (const src of t.source as unknown as { image: unknown; source: unknown; glTexture: { pixels: unknown } | null }[]) {
    if (!src.glTexture) continue;
    src.glTexture.pixels = null;
    src.image = null;
    src.source = null;
  }
}

function addTexture(scene: Phaser.Scene, key: string, src: { svg: string; w: number; h: number }, scale: number, char?: string, owner = ownerOf(scene)): Promise<void> {
  let t = texs.get(key);
  if (!t) texs.set(key, (t = { owners: new Set(), char, scale, src, loaded: false, seen: now() }));
  t.owners.add(owner);
  if (scene.textures.exists(key)) {
    t.loaded = true;
    return Promise.resolve();
  }
  const p0 = pending.get(key);
  if (p0) return p0;
  const tm = scene.textures;
  const game = scene.game;
  const rec = t;
  const p = loadImage(sized(src.svg, src.w, src.h, scale)).then((img) => {
    pending.delete(key);
    if (texs.get(key) !== rec) return; // freed while it was loading
    if (!img) {
      console.warn('texture failed', key);
      return;
    }
    if (!tm.exists(key)) {
      const tex = tm.addImage(key, img);
      if (tex) dropSource(game, tex);
    }
    rec.loaded = true;
    rec.seen = now();
  });
  pending.set(key, p);
  return p;
}

function propTexture(scene: Phaser.Scene, key: string, owner?: string): Promise<void> | null {
  const e = reg.world3(key) ?? reg.any(key);
  if (!e) return null;
  return addTexture(scene, key, e.a, e.group.lowRes?.(key) ? TEX_S_LOW : TEX_S, undefined, owner);
}

/** Always rasterized up front: the lot itself and the small in-world FX (walls and floors come from the layout). */
const EAGER = /^(grass|sidewalk|road|kerb|lane|drain|manhole|oil|puddle|crack_road|door_|rat$|roach$|fx_|face_|bubble_|plate_|bones_|grill_flames|fryer_bubbles|pot_burnt)/;
const EAGER_GROUPS = ['ground', 'room', 'kitchen', 'fx', 'dishes', 'bones', 'legacy'];

/** Rasterize the lot and the in-world FX (furniture, walls and floors come later, as the layout needs them). */
export function loadProps(scene: Phaser.Scene, onProgress?: (f: number) => void): Promise<void> {
  const keys = new Set<string>();
  for (const g of EAGER_GROUPS) for (const a of reg.group(g)) if (EAGER.test(a.key)) keys.add(a.key);
  // the door's OPEN/CLOSED board reuses the HUD art
  keys.add('ui_closed');
  keys.add('ui_open');
  const list = [...keys].map((k) => propTexture(scene, k)).filter((p): p is Promise<void> => !!p);
  let done = 0;
  return Promise.all(
    list.map((p) =>
      p.then(() => {
        done++;
        onProgress?.(done / list.length);
      }),
    ),
  ).then(() => undefined);
}

/** Rasterize these prop keys if they aren't yet. Resolves once all are ready. */
export function ensureProps(scene: Phaser.Scene, keys: Iterable<string>): Promise<void> {
  const out: Promise<void>[] = [];
  for (const k of keys) {
    const p = propTexture(scene, k);
    if (p) out.push(p);
  }
  return Promise.all(out).then(() => undefined);
}

export function propsReady(scene: Phaser.Scene, keys: Iterable<string>): boolean {
  for (const k of keys) if (!scene.textures.exists(k) && hasProp(k)) return false;
  return true;
}

/** Every wall and floor finish (decorating previews them all). */
export function finishKeys(): string[] {
  return reg.group('room').map((a) => a.key).filter((k) => /^(wall_[lr]_|floor_|stain_|floorcrack_)/.test(k));
}

/**
 * Rasterize these for a mode rather than a scene (e.g. every finish while decorating): `owner` keeps
 * them until `releaseOwner(owner)`.
 */
export function ensurePropsFor(scene: Phaser.Scene, owner: string, keys: Iterable<string>): Promise<void> {
  const out: Promise<void>[] = [];
  for (const k of keys) {
    const p = propTexture(scene, k, owner);
    if (p) out.push(p);
  }
  return Promise.all(out).then(() => undefined);
}

const charLoads = new Map<string, Promise<boolean>>();
/** characters whose every texture has finished (or failed) rasterizing */
const charsReady = new Set<string>();
const charParts = (art: CharArt): CharPart[] => [...art.parts, ...(art.backParts ?? []), ...Object.values(art.faces ?? {}).filter((x): x is CharPart => !!x)];

/** Rasterize a character's parts, back parts and faces. Resolves false if there's no art. */
export function loadChar(scene: Phaser.Scene, id: string): Promise<boolean> {
  const art = charArt(id);
  if (!art) return Promise.resolve(false);
  const parts = charParts(art);
  let p = charLoads.get(id);
  if (p) {
    // already loading (or loaded) for someone else: this scene owns it too
    const owner = ownerOf(scene);
    for (const pt of parts) texs.get(pt.key)?.owners.add(owner);
    return p;
  }
  p = Promise.all(parts.map((pt) => addTexture(scene, pt.key, pt, TEX_S, id))).then(() => {
    if (charLoads.get(id) === p) charsReady.add(id);
    return true;
  });
  charLoads.set(id, p);
  return p;
}

export function charLoaded(scene: Phaser.Scene, id: string): boolean {
  const art = charArt(id);
  if (!art) return false;
  if (charsReady.has(id)) return true;
  // every view: a puppet built while its back view or faces are still rasterizing would show the
  // missing-texture placeholder the moment it turns away or pulls a face
  return charParts(art).every((p) => scene.textures.exists(p.key));
}

// ---------------------------------------------------------------- freeing textures

/** Stamp every texture a live game object shows (containers included). */
function markShown(game: Phaser.Game, t: number) {
  const visit = (list: Phaser.GameObjects.GameObject[]) => {
    for (const o of list) {
      const key = (o as { texture?: { key: string } }).texture?.key;
      if (key) {
        const r = texs.get(key);
        if (r) r.seen = t;
      }
      const kids = (o as { list?: Phaser.GameObjects.GameObject[] }).list;
      if (kids) visit(kids);
    }
  };
  for (const sc of game.scene.getScenes(false)) if (sc.children) visit(sc.children.list);
}

function removeTexture(game: Phaser.Game, key: string) {
  texs.delete(key);
  pending.delete(key);
  if (game.textures.exists(key)) game.textures.remove(key);
}

function freeChar(game: Phaser.Game, id: string) {
  for (const [k, t] of [...texs]) if (t.char === id) removeTexture(game, k);
  charLoads.delete(id);
  charsReady.delete(id);
  chars.delete(id); // its SVG strings too: rebuilt (a few ms) if they come back
}

/** Owners that are scenes no longer running. */
function deadOwners(game: Phaser.Game): Set<string> {
  const live = new Set<string>();
  for (const sc of game.scene.getScenes(false)) {
    const id = sceneIds.get(sc);
    if (id) live.add(id);
  }
  const dead = new Set<string>();
  for (const t of texs.values()) for (const o of t.owners) if (o.includes('#') && !live.has(o)) dead.add(o);
  return dead;
}

export interface SweepStats {
  textures: number;
  freed: number;
}

/**
 * Free what nobody needs:
 *  - textures whose only owners have gone (`release`, plus scenes that ended) and that nothing shows now;
 *  - characters, and unowned art, that nothing has shown for `idleMs`.
 * Anything still loading is left alone.
 */
export function sweepTextures(game: Phaser.Game, opts: { release?: string[]; idleMs?: number } = {}): SweepStats {
  const t = now();
  const idleMs = opts.idleMs ?? IDLE_EVICT_MS;
  markShown(game, t);
  const gone = deadOwners(game);
  for (const o of opts.release ?? []) gone.add(o);
  // textures whose last owner just went
  const orphaned = new Set<Tex>();
  const byChar = new Map<string, Tex[]>();
  for (const r of texs.values()) {
    if (gone.size && r.owners.size) {
      for (const o of gone) r.owners.delete(o);
      if (!r.owners.size) orphaned.add(r);
    }
    if (r.char) {
      let l = byChar.get(r.char);
      if (!l) byChar.set(r.char, (l = []));
      l.push(r);
    }
  }
  let freed = 0;
  // characters (all of a character's parts go together): as soon as the scenes that wanted them are
  // gone, else after a minute off screen
  for (const [id, parts] of byChar) {
    if (!charsReady.has(id)) continue; // still loading
    let seen = 0;
    for (const p of parts) seen = Math.max(seen, p.seen);
    if (seen === t) continue; // on screen
    const justOrphaned = parts.some((p) => orphaned.has(p)) && parts.every((p) => !p.owners.size);
    if (justOrphaned || t - seen > idleMs) {
      freed += parts.length;
      freeChar(game, id);
    }
  }
  // other art: kept while owned or shown; freed when its owner goes, or after a minute unowned off screen
  for (const [k, r] of [...texs]) {
    if (r.char || !r.loaded || r.owners.size || r.seen === t) continue;
    if (orphaned.has(r) || t - r.seen > idleMs) {
      removeTexture(game, k);
      freed++;
    }
  }
  return { textures: texs.size, freed };
}

/** An owner (a mode like 'edit') is done with its textures: free whatever isn't on screen. */
export function releaseOwner(game: Phaser.Game, owner: string): SweepStats {
  return sweepTextures(game, { release: [owner] });
}

/**
 * After a WebGL context loss the GPU copies are gone, and we dropped the <img>s: rasterize every
 * texture we own again and upload it into the same Phaser texture (game objects keep their frames).
 */
let restoring = 0;
export function restoreTextures(game: Phaser.Game) {
  for (const [key, r] of texs) {
    if (!r.loaded) continue;
    restoring++;
    void loadImage(sized(r.src.svg, r.src.w, r.src.h, r.scale)).then((img) => {
      restoring--;
      if (!img || texs.get(key) !== r || !game.textures.exists(key)) return;
      const src = game.textures.get(key).source[0] as unknown as {
        glTexture: {
          update: (...a: unknown[]) => void;
          pixels: unknown;
          width: number;
          height: number;
          flipY: boolean;
          wrapS: number;
          wrapT: number;
          minFilter: number;
          magFilter: number;
          format: number;
        } | null;
      };
      const w = src.glTexture;
      if (!w) return;
      w.update(img, w.width, w.height, w.flipY, w.wrapS, w.wrapT, w.minFilter, w.magFilter, w.format);
      w.pixels = null;
    });
  }
}

/** Keep textures in check: sweep every few seconds, and re-rasterize after a WebGL context loss. */
export function manageTextures(game: Phaser.Game, everyMs = 10_000) {
  setInterval(() => {
    try {
      sweepTextures(game);
    } catch (e) {
      console.warn('texture sweep failed', e);
    }
  }, everyMs);
  const r = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if (r.gl) r.on('restorewebgl', () => restoreTextures(game));
}

/** For diagnostics (smoke tests, the memory probe). */
export function textureStats() {
  let px = 0;
  let n = 0;
  for (const r of texs.values()) {
    if (!r.loaded) continue;
    n++;
    px += Math.round(r.src.w * r.scale) * Math.round(r.src.h * r.scale);
  }
  return { textures: n, mb: +((px * 4) / 1048576).toFixed(1), chars: charsReady.size, groups: reg.builtGroups(), restoring, blobUrls: blobOk };
}
