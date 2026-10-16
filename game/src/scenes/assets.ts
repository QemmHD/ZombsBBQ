/**
 * Art registry + texture loading. SVG art is rasterized into Phaser textures on demand:
 * props up front, characters the first time they're needed (so ~1,000 sprites don't sit in
 * iPhone memory at once). Images are created directly (not via the Phaser loader) so it works
 * under strict content-security policies (embedded pages, app shells).
 */
import type Phaser from 'phaser';
import { buildChar, buildProps, type ArtAsset, type CharArt, type CharPart } from '../art';
import { buildRaidChar } from '../art/raidchars';
import { buildRaidProps } from '../art/raidprops';
import { buildUiIcons } from '../art/ui';

/** Rasterization scale: textures are drawn bigger than world units so zoomed-in Retina stays crisp. */
export const TEX_S = Math.min(3.5, Math.max(2, (window.devicePixelRatio || 1) * 1.2));

export const svgData = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const props = new Map<string, ArtAsset>();
const raidProps = new Map<string, ArtAsset>();
const ui = new Map<string, ArtAsset>();
const chars = new Map<string, CharArt | null>();

function safe<T>(f: () => T, fallback: T): T {
  try {
    return f();
  } catch (e) {
    console.warn('art build failed', e);
    return fallback;
  }
}

export function initArt() {
  if (props.size) return;
  for (const a of safe(buildProps, [])) props.set(a.key, a);
  for (const a of safe(buildRaidProps, [])) raidProps.set(a.key, a);
  for (const a of safe(buildUiIcons, [])) ui.set(a.key, a);
}

export function propMeta(key: string): ArtAsset | undefined {
  return props.get(key) ?? raidProps.get(key);
}

export function hasProp(key: string) {
  return props.has(key) || raidProps.has(key);
}

/** A character's art (joint characters and raid characters share one namespace). */
export function charArt(id: string): CharArt | null {
  if (!chars.has(id)) {
    let a: CharArt | null = safe(() => buildChar(id as never), null);
    if (!a || !a.parts?.length) a = safe(() => buildRaidChar(id), null);
    chars.set(id, a && a.parts?.length ? a : null);
  }
  return chars.get(id) ?? null;
}

const urlCache = new Map<string, string>();
/** Data URL for DOM use (HUD icons, portraits, dish icons, map). */
export function artUrl(key: string): string {
  let u = urlCache.get(key);
  if (u) return u;
  const a = ui.get(key) ?? props.get(key) ?? raidProps.get(key);
  u = a ? svgData(a.svg) : '';
  urlCache.set(key, u);
  return u;
}

/** Portrait = the character's head part (or a face variant). */
export function headUrl(charId: string, face?: string): string {
  const k = `head:${charId}:${face ?? ''}`;
  let u = urlCache.get(k);
  if (u !== undefined) return u;
  const art = charArt(charId);
  const part = (face && art?.faces?.[face as keyof NonNullable<CharArt['faces']>]) || art?.parts.find((p) => p.key.endsWith('_head'));
  u = part ? svgData(part.svg) : '';
  urlCache.set(k, u);
  return u;
}

function sized(svg: string, w: number, h: number): string {
  return svg.replace(/<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 width="${(w * TEX_S).toFixed(1)}" height="${(h * TEX_S).toFixed(1)}"`);
}

const pending = new Map<string, Promise<void>>();

function addTexture(scene: Phaser.Scene, key: string, svg: string, w: number, h: number): Promise<void> {
  if (scene.textures.exists(key)) return Promise.resolve();
  const p0 = pending.get(key);
  if (p0) return p0;
  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (!scene.textures.exists(key)) scene.textures.addImage(key, img);
      pending.delete(key);
      resolve();
    };
    img.onerror = () => {
      pending.delete(key);
      resolve();
    };
    img.src = svgData(sized(svg, w, h));
  });
  pending.set(key, p);
  return p;
}

/** Rasterize every joint prop (tiles, walls, furniture, dishes, fx). */
export function loadProps(scene: Phaser.Scene, onProgress?: (f: number) => void): Promise<void> {
  initArt();
  const list = [...props.values()];
  let done = 0;
  return Promise.all(
    list.map((a) =>
      addTexture(scene, a.key, a.svg, a.w, a.h).then(() => {
        done++;
        onProgress?.(done / list.length);
      }),
    ),
  ).then(() => undefined);
}

export function loadRaidProps(scene: Phaser.Scene): Promise<void> {
  initArt();
  return Promise.all([...raidProps.values()].filter((a) => !a.key.startsWith('map_')).map((a) => addTexture(scene, a.key, a.svg, a.w, a.h))).then(() => undefined);
}

const charLoads = new Map<string, Promise<boolean>>();
/** Rasterize a character's parts, back parts and faces. Resolves false if there's no art. */
export function loadChar(scene: Phaser.Scene, id: string): Promise<boolean> {
  let p = charLoads.get(id);
  if (p) return p;
  const art = charArt(id);
  if (!art) return Promise.resolve(false);
  const parts: CharPart[] = [...art.parts, ...(art.backParts ?? []), ...Object.values(art.faces ?? {}).filter((x): x is CharPart => !!x)];
  p = Promise.all(parts.map((pt) => addTexture(scene, pt.key, pt.svg, pt.w, pt.h))).then(() => true);
  charLoads.set(id, p);
  return p;
}

export function charLoaded(scene: Phaser.Scene, id: string): boolean {
  const art = charArt(id);
  return !!art && art.parts.every((p) => scene.textures.exists(p.key));
}
