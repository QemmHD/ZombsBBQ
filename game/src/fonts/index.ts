/**
 * Bundled fonts (SIL OFL 1.1, see LICENSES.md): Lilita One for chunky display text (HUD numbers,
 * titles, floating combat text) and Nunito for body copy. The woff2 files are inlined by Vite
 * (assetsInlineLimit), so the single-file build carries them and nothing hits the network.
 * iOS has neither Arial Black nor Trebuchet, so without these the game falls back to system fonts.
 */
import lilita from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2';
import nunito600 from '@fontsource/nunito/files/nunito-latin-600-normal.woff2';
import nunito700 from '@fontsource/nunito/files/nunito-latin-700-normal.woff2';
import nunito800 from '@fontsource/nunito/files/nunito-latin-800-normal.woff2';
import nunito900 from '@fontsource/nunito/files/nunito-latin-900-normal.woff2';

/** The display face, as a CSS / canvas font-family list. */
export const FONT_DISPLAY = '"Lilita One", "Arial Black", system-ui, sans-serif';
/** The body face. */
export const FONT_BODY = 'Nunito, "Trebuchet MS", system-ui, sans-serif';

const faces: [string, string, string][] = [
  ['Lilita One', lilita, '400'],
  ['Nunito', nunito600, '600'],
  ['Nunito', nunito700, '700'],
  ['Nunito', nunito800, '800'],
  ['Nunito', nunito900, '900'],
];

/**
 * Resolves once every face is decoded (or failed: text then just uses the fallback). Canvas text
 * (Phaser) doesn't re-render when a font arrives, so scenes wait on this before drawing labels.
 */
export const fontsReady: Promise<void> =
  typeof FontFace === 'undefined' || typeof document === 'undefined'
    ? Promise.resolve()
    : Promise.all(
        faces.map(([family, url, weight]) => {
          const f = new FontFace(family, `url(${url}) format('woff2')`, { weight, display: 'block' });
          document.fonts.add(f);
          return f.load().catch(() => undefined);
        }),
      ).then(() => undefined);
