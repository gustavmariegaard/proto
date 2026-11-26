// Efterbehandling af web-udgaven (kør efter `expo export --platform web`):
// 1) Skrifttyperne hentes samtidig med appens kode (preload) i stedet for bagefter.
// 2) En startskærm med ciircle-ikonet vises med det samme, mens appen starter.
// Brug: node scripts/postexport.mjs <output-mappe>
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('Angiv output-mappen');
const htmlPath = path.join(out, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Find stien, appens scripts ligger under (fx /proto/app/), ud fra index.html
const base = (html.match(/src="([^"]*?)_expo\//) || [])[1] ?? '/';

// De skrifttyper, appen faktisk bruger (se src/app/_layout.tsx)
const used = ['BricolageGrotesque_700Bold', 'Figtree_400Regular', 'Figtree_500Medium', 'Figtree_600SemiBold', 'Figtree_700Bold'];
const fonts = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.ttf') && used.some((u) => f.name.startsWith(u + '.'))) fonts.push(path.relative(out, p).split(path.sep).join('/'));
  }
})(path.join(out, 'assets'));
const preload = fonts.map((f) => `<link rel="preload" href="${base}${f}" as="font" type="font/ttf" crossorigin>`).join('');

// Startskærm: forsvinder af sig selv, når appen tegner i #root
const splash = `<div id="ciircle-splash" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#fafaf9;z-index:0">
<svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-label="ciircle"><rect width="72" height="72" rx="20" fill="#171717"/><circle cx="27" cy="36" r="12" stroke="#21F1A8" stroke-width="6"/><circle cx="45" cy="36" r="12" stroke="white" stroke-width="6"/></svg></div>
<script>new MutationObserver(function(m,o){var r=document.getElementById('root');if(r&&r.children.length){var s=document.getElementById('ciircle-splash');if(s)s.remove();o.disconnect();}}).observe(document.documentElement,{childList:true,subtree:true});</script>`;

html = html.replace('</head>', `${preload}</head>`);
html = html.replace(/<body([^>]*)>/, `<body$1>${splash}`);
fs.writeFileSync(htmlPath, html);
console.log(`postexport: ${fonts.length} skrifttyper forudindlæses, startskærm tilføjet`);
