/**
 * Art contract between the SVG sprite generators (src/art) and the game scenes.
 *
 * World units: one isometric tile is TILE_W x TILE_H (2:1). A character is ~1.6 tiles tall.
 * Every asset is an SVG string drawn in world units (its viewBox is 0 0 w h); the boot
 * scene rasterizes it at device resolution, so keep coordinates in world units.
 */
export const TILE_W = 96;
export const TILE_H = 48;
export const WALL_H = 120;

/** A single static sprite (furniture, prop, icon, tile). */
export interface ArtAsset {
  key: string;
  svg: string;
  w: number;
  h: number;
  /** Anchor in 0..1 of the image. For floor objects: the point that sits on the tile center. */
  ox: number;
  oy: number;
}

/** Cutout-puppet character: separate parts animated by tweens (bob, arm swing, shamble). */
export type PartName = 'legL' | 'legR' | 'torso' | 'armL' | 'armR' | 'head';

export interface CharPart {
  key: string;
  svg: string;
  w: number;
  h: number;
  /** Pivot (rotation point) in the part's own pixels, e.g. shoulder for arms, hip for legs, neck for head. */
  px: number;
  py: number;
  /** Where the pivot sits relative to the character root (root = point between the feet, y up is negative). */
  x: number;
  y: number;
}

export interface CharArt {
  id: string;
  /** Parts in back-to-front draw order for a character facing down-right (front 3/4 view). */
  parts: CharPart[];
  /** Total height in world units (for name tags / bubbles placement). */
  height: number;
}
