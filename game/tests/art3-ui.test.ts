import { describe, expect, it } from 'vitest';
import { UI_KEYS } from '../src/art/manifest';
import { UI3_ICON_KEYS, UI3_TEX_KEYS, buildUi3 } from '../src/art3/ui3';

const assets = buildUi3();
const byKey = new Map(assets.map((a) => [a.key, a]));

function checkSvg(key: string, svg: string, w: number, h: number): void {
  expect(svg.startsWith('<svg'), `${key} starts with <svg`).toBe(true);
  expect(svg.trimEnd().endsWith('</svg>'), `${key} ends with </svg>`).toBe(true);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  const vb = /viewBox="([^"]+)"/.exec(svg);
  expect(vb, `${key} has a viewBox`).not.toBeNull();
  const [x, y, vw, vh] = vb![1].split(/[\s,]+/).map(Number);
  expect([x, y]).toEqual([0, 0]);
  expect(vw).toBeCloseTo(w, 5);
  expect(vh).toBeCloseTo(h, 5);
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  // balanced tags (cheap well-formedness check)
  const open = (svg.match(/<[a-zA-Z][^>]*[^/]>/g) ?? []).length + (svg.match(/<[a-zA-Z]>/g) ?? []).length;
  const close = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
  expect(open, `${key} open/close tags balance`).toBe(close);
  // ids unique and every reference resolves inside the document
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size, `${key} ids unique`).toBe(ids.length);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids, `${key} defines #${m[1]}`).toContain(m[1]);
}

describe('art3 ui', () => {
  it('covers every v2 UI key plus the panel textures', () => {
    for (const k of UI_KEYS) expect(byKey.has(k), k).toBe(true);
    for (const k of [...UI3_ICON_KEYS, ...UI3_TEX_KEYS]) expect(byKey.has(k), k).toBe(true);
    for (const k of ['tex_awning', 'tex_chalk', 'tex_paper', 'tex_parchment', 'btn_olive', 'btn_red', 'tex_brick']) expect(byKey.has(k), k).toBe(true);
  });

  it('has unique keys', () => {
    expect(new Set(assets.map((a) => a.key)).size).toBe(assets.length);
  });

  it.each(assets.map((a) => [a.key, a] as const))('%s is a well-formed SVG', (key, a) => {
    checkSvg(key, a.svg, a.w, a.h);
    if (key.startsWith('ui_')) {
      expect([a.w, a.h, a.ox, a.oy]).toEqual([64, 64, 0.5, 0.5]);
    } else {
      expect([a.ox, a.oy]).toEqual([0, 0]);
    }
  });

  it('keeps ids unique across all documents (safe to inline together)', () => {
    const seen = new Map<string, string>();
    for (const a of assets)
      for (const m of a.svg.matchAll(/\sid="([^"]+)"/g)) {
        expect(seen.get(m[1]), `${m[1]} in ${a.key} and ${seen.get(m[1])}`).toBeUndefined();
        seen.set(m[1], a.key);
      }
  });

  it('uses the documented texture sizes', () => {
    const size = (k: string) => [byKey.get(k)!.w, byKey.get(k)!.h];
    expect(size('tex_awning')).toEqual([512, 64]);
    expect(size('tex_chalk')).toEqual([256, 160]);
    expect(size('btn_olive')).toEqual([160, 48]);
    expect(size('btn_red')).toEqual([160, 48]);
  });
});
