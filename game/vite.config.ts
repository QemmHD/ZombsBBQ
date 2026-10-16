import { defineConfig, type Plugin } from 'vite';

/**
 * Phaser 4.2.1's multi-texture shader picks the texture with an exact float compare on an interpolated
 * varying (`outTexDatum == float(INDEX)`). When interpolation lands on 2.9999998 instead of 3, that
 * triangle samples nothing and half a sprite vanishes (seen on rotated heads). Compare with a ±0.5
 * window instead, like Phaser 3 did.
 */
function phaserTexIdFix(): Plugin {
  return {
    name: 'phaser-texid-fix',
    enforce: 'pre',
    transform(code, id) {
      if (!/phaser[\\/]dist[\\/]phaser\.esm(\.min)?\.js(\?.*)?$/.test(id)) return null;
      const out = code.replace('outTexDatum == 0.0)', 'outTexDatum < 0.5)').replace('outTexDatum == float(INDEX))', 'abs(outTexDatum - float(INDEX)) < 0.5)');
      if (out === code) this.warn('phaser-texid-fix: shader pattern not found (Phaser updated?)');
      return { code: out, map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [phaserTexIdFix()],
  // pre-bundled deps skip plugin transforms in dev, so let Vite serve Phaser's single-file ESM build directly
  optimizeDeps: { exclude: ['phaser'] },
  define: {
    __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
