/**
 * Art registry + texture loading. SVG art is rasterized into Phaser textures on demand:
 * the lot (ground, walls, floors) and in-world FX up front, furniture the first time it is placed,
 * characters the first time they're needed. Only what is on screen sits in iPhone memory.
 * Images are created directly (not via the Phaser loader) so it works under strict content-security
 * policies (embedded pages, app shells).
 *
 * Art v3 (src/art3) is the café's look. The v2 sets (src/art) stay registered underneath as a fallback
 * for anything v3 hasn't redrawn yet (the raid arenas, some characters).
 */
import type Phaser from "phaser";
import {
  CHAR_IDS,
  buildChar,
  buildProps,
  type ArtAsset,
  type CharArt,
  type CharPart,
} from "../art";
import { buildRaidChar } from "../art/raidchars";
import { buildRaidProps } from "../art/raidprops";
import { buildUiIcons } from "../art/ui";
import { buildGround } from "../art3/ground";
import { buildRoom } from "../art3/room";
import { buildKitchen } from "../art3/kitchen";
import { buildFurniture } from "../art3/furniture";
import { buildDecor } from "../art3/decor";
import { buildWallItems } from "../art3/wallitems";
import { buildSpecial } from "../art3/special";
import { buildOutdoor } from "../art3/outdoor";
import { buildDishes } from "../art3/dishes";
import { buildFx } from "../art3/fx";
import { buildUi3 } from "../art3/ui3";
import { buildChar3 } from "../art3/chars";

/** Rasterization scale: textures are drawn bigger than world units so zoomed-in Retina stays crisp. */
export const TEX_S = Math.min(
  3,
  Math.max(2, (window.devicePixelRatio || 1) * 1.1),
);

export const svgData = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Joint art (v3). */
const props = new Map<string, ArtAsset>();
/** Older art kept for the raid arenas until they are redrawn. */
const legacy = new Map<string, ArtAsset>();
const ui = new Map<string, ArtAsset>();
const chars = new Map<string, CharArt | null>();

/** Always rasterized at boot: the lot itself and the small in-world FX. */
const EAGER =
  /^(grass|sidewalk|road|kerb|lane|drain|manhole|oil|puddle|crack_road|wall_|door_|floor_|stain_|floorcrack_|rat$|roach$|fx_|face_|bubble_|plate_|grill_flames|fryer_bubbles|pot_burnt)/;

function safe<T>(f: () => T, fallback: T): T {
  try {
    return f();
  } catch (e) {
    console.warn("art build failed", e);
    return fallback;
  }
}

export function initArt() {
  if (props.size) return;
  for (const build of [
    buildGround,
    buildRoom,
    buildKitchen,
    buildFurniture,
    buildDecor,
    buildWallItems,
    buildSpecial,
    buildOutdoor,
    buildDishes,
    buildFx,
  ])
    for (const a of safe(build, [])) props.set(a.key, a);
  for (const a of [...safe(buildProps, []), ...safe(buildRaidProps, [])])
    if (!props.has(a.key)) legacy.set(a.key, a);
  for (const a of safe(buildUiIcons, [])) ui.set(a.key, a);
  for (const a of safe(buildUi3, [])) ui.set(a.key, a); // v3 icons win
}

export function propMeta(key: string): ArtAsset | undefined {
  return props.get(key) ?? legacy.get(key);
}

export function hasProp(key: string) {
  return props.has(key) || legacy.has(key);
}

/** A character's art: v3 joint rigs first, then the older sets (raid cast, not-yet-redrawn folks). */
export function charArt(id: string): CharArt | null {
  if (!chars.has(id)) {
    let a: CharArt | null = safe(() => buildChar3(id), null);
    if (
      (!a || !a.parts?.length) &&
      (CHAR_IDS as readonly string[]).includes(id)
    )
      a = safe(() => buildChar(id as never), null);
    if (!a || !a.parts?.length) {
      try {
        a = buildRaidChar(id);
      } catch {
        a = null; // nobody by that name (callers fall back, e.g. a waitress to her waiter)
      }
    }
    chars.set(id, a && a.parts?.length ? a : null);
  }
  return chars.get(id) ?? null;
}

const urlCache = new Map<string, string>();
const anyArt = (key: string) =>
  ui.get(key) ?? props.get(key) ?? legacy.get(key);

/** Data URL for DOM use (HUD icons, portraits, dish icons, map). */
export function artUrl(key: string): string {
  let u = urlCache.get(key);
  if (u) return u;
  const a = anyArt(key);
  u = a ? svgData(a.svg) : "";
  urlCache.set(key, u);
  return u;
}

/** Data URL for a texture that CSS stretches to any box (backgrounds, nine-slice borders). */
export function artUrlStretch(key: string): string {
  const k = `stretch:${key}`;
  let u = urlCache.get(k);
  if (u) return u;
  const a = anyArt(key);
  u = a
    ? svgData(a.svg.replace(/^<svg /, '<svg preserveAspectRatio="none" '))
    : "";
  urlCache.set(k, u);
  return u;
}

export function hasArt(key: string): boolean {
  return !!anyArt(key);
}

const autoCrops = new Map<string, [number, number, number, number]>();
/** Measure the painted bounds of some art (async, once) so thumbnails can be cropped to it. */
export function measureCrops(keys: string[], pad = 3) {
  for (const key of keys) {
    const a = anyArt(key);
    if (!a || autoCrops.has(key)) continue;
    const img = new Image();
    img.onload = () => {
      const S = 2;
      const c = document.createElement("canvas");
      c.width = a.w * S;
      c.height = a.h * S;
      const g = c.getContext("2d", { willReadFrequently: true });
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
        by = y0 / S - pad,
        bw = (x1 - x0) / S + pad * 2,
        bh = (y1 - y0) / S + pad * 2;
      const side = Math.max(bw, bh);
      bx -= (side - bw) / 2;
      by -= (side - bh) / 2;
      autoCrops.set(
        key,
        [bx, by, side, side].map((v) => Math.round(v * 10) / 10) as [
          number,
          number,
          number,
          number,
        ],
      );
    };
    img.src = svgData(a.svg);
  }
}

/** Art cropped to its painted bounds when measured, else the whole canvas. */
export function artUrlFit(key: string): string {
  const c = autoCrops.get(key);
  return c ? artUrlCrop(key, ...c) : artUrl(key);
}

/** Same art cropped to a box (wall hangings live in a tall wall-sized canvas, too small as shop thumbnails). */
export function artUrlCrop(
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const k = `crop:${key}:${x},${y},${w},${h}`;
  let u = urlCache.get(k);
  if (u) return u;
  const a = anyArt(key);
  u = a
    ? svgData(
        a.svg.replace(
          /width="[^"]*" height="[^"]*" viewBox="[^"]*"/,
          `width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"`,
        ),
      )
    : "";
  urlCache.set(k, u);
  return u;
}

/** Portrait = the character's head part (or a face variant). */
export function headUrl(charId: string, face?: string): string {
  const k = `head:${charId}:${face ?? ""}`;
  let u = urlCache.get(k);
  if (u !== undefined) return u;
  const art = charArt(charId);
  const part =
    (face && art?.faces?.[face as keyof NonNullable<CharArt["faces"]>]) ||
    art?.parts.find((p) => p.key.endsWith("_head"));
  u = part ? svgData(part.svg) : "";
  urlCache.set(k, u);
  return u;
}

function sized(svg: string, w: number, h: number): string {
  return svg.replace(
    /<svg([^>]*?) width="[^"]*" height="[^"]*"/,
    `<svg$1 width="${(w * TEX_S).toFixed(1)}" height="${(h * TEX_S).toFixed(1)}"`,
  );
}

const pending = new Map<string, Promise<void>>();

function addTexture(
  scene: Phaser.Scene,
  key: string,
  svg: string,
  w: number,
  h: number,
): Promise<void> {
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
      console.warn("texture failed", key);
      pending.delete(key);
      resolve();
    };
    img.src = svgData(sized(svg, w, h));
  });
  pending.set(key, p);
  return p;
}

/** Rasterize the lot and the in-world FX (furniture comes later, as it is placed). */
export function loadProps(
  scene: Phaser.Scene,
  onProgress?: (f: number) => void,
): Promise<void> {
  initArt();
  // the door's OPEN/CLOSED board reuses the HUD art
  const list = [
    ...[...props.values()].filter((a) => EAGER.test(a.key)),
    ...["ui_closed", "ui_open"].map((k) => ui.get(k)!).filter(Boolean),
  ];
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

/** Rasterize these prop keys if they aren't yet. Resolves once all are ready. */
export function ensureProps(
  scene: Phaser.Scene,
  keys: Iterable<string>,
): Promise<void> {
  const out: Promise<void>[] = [];
  for (const k of keys) {
    if (scene.textures.exists(k)) continue;
    const a = props.get(k) ?? legacy.get(k) ?? ui.get(k);
    if (a) out.push(addTexture(scene, a.key, a.svg, a.w, a.h));
  }
  return Promise.all(out).then(() => undefined);
}

export function propsReady(
  scene: Phaser.Scene,
  keys: Iterable<string>,
): boolean {
  for (const k of keys)
    if (!scene.textures.exists(k) && hasProp(k)) return false;
  return true;
}

export function loadRaidProps(scene: Phaser.Scene): Promise<void> {
  initArt();
  return Promise.all(
    [...legacy.values()]
      .filter((a) => !a.key.startsWith("map_"))
      .map((a) => addTexture(scene, a.key, a.svg, a.w, a.h)),
  ).then(() => undefined);
}

const charLoads = new Map<string, Promise<boolean>>();
/** Rasterize a character's parts, back parts and faces. Resolves false if there's no art. */
export function loadChar(scene: Phaser.Scene, id: string): Promise<boolean> {
  let p = charLoads.get(id);
  if (p) return p;
  const art = charArt(id);
  if (!art) return Promise.resolve(false);
  const parts: CharPart[] = [
    ...art.parts,
    ...(art.backParts ?? []),
    ...Object.values(art.faces ?? {}).filter((x): x is CharPart => !!x),
  ];
  p = Promise.all(
    parts.map((pt) => addTexture(scene, pt.key, pt.svg, pt.w, pt.h)),
  ).then(() => true);
  charLoads.set(id, p);
  return p;
}

export function charLoaded(scene: Phaser.Scene, id: string): boolean {
  const art = charArt(id);
  return !!art && art.parts.every((p) => scene.textures.exists(p.key));
}
