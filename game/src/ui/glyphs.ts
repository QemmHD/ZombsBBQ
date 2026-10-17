/**
 * Little white glyphs with an ink outline for the command strip's sticker buttons (our own simple
 * drawings: one per verb). 24×24 viewBox, drawn as inline SVG so they scale with the button.
 */
const G: Record<string, string> = {
  serve: '<ellipse cx="12" cy="15" rx="9" ry="3.4"/><path d="M5 14.6c0-4 3.2-7 7-7s7 3 7 7z"/><circle cx="12" cy="6.2" r="1.4"/>',
  infect: '<circle cx="12" cy="12" r="2.6"/><path d="M12 3.2a5 5 0 0 1 2.8 9.1M12 3.2a5 5 0 0 0-2.8 9.1M4.4 16.4a5 5 0 0 1 4.8-7.8M4.4 16.4a5 5 0 0 0 7.6 1.2M19.6 16.4a5 5 0 0 0-4.8-7.8M19.6 16.4a5 5 0 0 1-7.6 1.2" fill="none" stroke-width="2.6"/>',
  rest: '<path d="M4 7h6l-6 7h6M13 4h5l-5 6h5M15 14h4l-4 5h4" fill="none" stroke-width="2.4"/>',
  energize: '<path d="M13.5 2L5 13.5h6L9.5 22 19 9.5h-6.2z"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 10.5v7" stroke-width="3" fill="none" class="cut"/><circle cx="12" cy="6.8" r="1.7" class="cut"/>',
  upgrade: '<path d="M12 3l8 8h-5v9H9v-9H4z"/>',
  destroy: '<path d="M12 3c-4.6 0-8 3.2-8 7.4 0 2.4 1.2 4 3 5V19h10v-3.6c1.8-1 3-2.6 3-5C20 6.2 16.6 3 12 3z"/><circle cx="8.8" cy="10.6" r="2" class="cut"/><circle cx="15.2" cy="10.6" r="2" class="cut"/><path d="M10 19v2M14 19v2" stroke-width="2" fill="none"/>',
  recipes: '<path d="M4 4.5c3-1 5.6-.8 8 1 2.4-1.8 5-2 8-1V19c-3-1-5.6-.8-8 1-2.4-1.8-5-2-8-1z"/><path d="M12 5.5V20" fill="none" stroke-width="1.6" class="cut-line"/>',
  photo: '<path d="M3 8h4l1.6-2.6h6.8L17 8h4v11H3z"/><circle cx="12" cy="13.4" r="3.6" class="cut"/>',
  attack: '<path d="M6 21l2-7-3-5 1-6 2 4 1-5 2 5 2-5 1 5 2-4 1 6-3 5 2 7z"/>',
  revive: '<path d="M12 20.5S3.5 15 3.5 9A4.4 4.4 0 0 1 12 6.6 4.4 4.4 0 0 1 20.5 9c0 6-8.5 11.5-8.5 11.5z"/>',
  discard: '<path d="M5 7h14l-1.4 13.5H6.4z"/><path d="M3.5 5.5h17M9.5 5V3h5v2" fill="none" stroke-width="2.2"/>',
  salvage: '<path d="M4 20l8.5-8.5M14.5 3.2a4.6 4.6 0 0 0 5.6 6.4l-3 3-6.2-6.2z"/><path d="M4 20l8.5-8.5" fill="none" stroke-width="3.4"/>',
  transform: '<path d="M4 6c2.6-1.6 5.4-2.2 8-2.2s5.4.6 8 2.2c0 6.4-2.4 11.6-8 14.2C6.4 17.6 4 12.4 4 6z"/><circle cx="9" cy="10" r="1.6" class="cut"/><circle cx="15" cy="10" r="1.6" class="cut"/><path d="M9 14.6c1.8 1.4 4.2 1.4 6 0" fill="none" stroke-width="1.6" class="cut-line"/>',
  locker: '<path d="M12 2.5v5" fill="none" stroke-width="2.4"/><path d="M12 7.5c3 0 4.4 2 4.4 4.4 0 3.4-2.6 5.4-5.6 5.4S6 15.4 6 13.8" fill="none" stroke-width="3"/><path d="M5 12.4l1-3.4 2.6 2.4z"/>',
  work: '<path d="M14.6 3.4l6 6-2.4 2.4-1.8-1.8L7 19.4 4.6 17 14 7.6l-1.8-1.8z"/>',
  finish: '<circle cx="12" cy="13" r="8.5"/><path d="M12 8.5V13l3 2.4" fill="none" stroke-width="2.2" class="cut-line"/><path d="M9.5 2.5h5" fill="none" stroke-width="2.4"/>',
  cook: '<path d="M4 10h16v3.5a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 10h20M8 7c0-1.6 1.6-1.6 1.6-3.2M12 7c0-1.6 1.6-1.6 1.6-3.2M16 7c0-1.6 1.6-1.6 1.6-3.2" fill="none" stroke-width="1.8"/>',
  order: '<path d="M5 3h14v18l-2.4-1.6L14.4 21 12 19.4 9.6 21l-2.2-1.6L5 21z"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" fill="none" stroke-width="1.8" class="cut-line"/>',
  collect: '<circle cx="12" cy="12" r="9"/><path d="M14.8 8.6c-.6-1-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.6 5.8 4.6 0 1.4-1.3 2.3-3 2.3-1.3 0-2.4-.5-3-1.5M12 5.4v13.2" fill="none" stroke-width="1.8" class="cut-line"/>',
  close: '<path d="M5 5l14 14M19 5L5 19" fill="none" stroke-width="3.6"/>',
};

/** Inline SVG for a strip glyph ('' if unknown). */
export function glyph(name: string): string {
  const g = G[name];
  return g ? `<svg class="gl" viewBox="0 0 24 24" aria-hidden="true">${g}</svg>` : '';
}
