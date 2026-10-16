// Bundle the Vite build into one self-contained HTML file (for sharing a playable link / artifact).
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dist = 'dist';
let html = await readFile(join(dist, 'index.html'), 'utf8');
for (const m of [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g)]) {
  const css = await readFile(join(dist, m[1]), 'utf8');
  html = html.replace(m[0], () => `<style>${css}</style>`);
}
for (const m of [...html.matchAll(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g)]) {
  const js = (await readFile(join(dist, m[1]), 'utf8')).replace(/<\/script/gi, '<\\/script');
  html = html.replace(m[0], () => '');
  html = html.replace('</body>', () => `<script type="module">${js}</script>\n</body>`);
}
await writeFile(join(dist, 'zombs-bbq.html'), html);
console.log(`dist/zombs-bbq.html ${(html.length / 1024).toFixed(0)} KB`);
