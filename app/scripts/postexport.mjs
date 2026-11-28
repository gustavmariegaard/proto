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

// Startskærm: bliver stående, til appen melder klar (window.__ciircleReady), og fader så ud. Højst 10 sek.
const splash = `<div id="ciircle-splash" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#fafaf9;z-index:9999">
<svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-label="ciircle"><rect width="72" height="72" rx="20" fill="#171717"/><circle cx="27" cy="36" r="12" stroke="#21F1A8" stroke-width="6"/><circle cx="45" cy="36" r="12" stroke="white" stroke-width="6"/></svg></div>
<script>(function(){var done=false;function hide(){if(done)return;done=true;var s=document.getElementById('ciircle-splash');if(!s)return;s.style.transition='opacity .25s ease';s.style.opacity='0';setTimeout(function(){s.remove();},260);}window.__ciircleReady=hide;setTimeout(hide,10000);})();</script>`;

// iPhone læser disse, før appens kode starter (når appen åbnes fra hjemmeskærmen),
// så de skal stå direkte i HTML'en. Uden dem bliver statuslinjen øverst sort.
const appleHead = [
  `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
  `<meta name="apple-mobile-web-app-title" content="ciircle">`,
  `<meta name="theme-color" content="#fafaf9">`,
  `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#fafaf9">`,
  // Appen er lys: uden dette bliver toppen sort, når telefonen er i mørk tilstand
  `<meta name="color-scheme" content="light only">`,
  `<link rel="manifest" href="${base}manifest.webmanifest">`,
  `<link rel="apple-touch-icon" href="${base}apple-touch-icon.png">`,
  `<style>:root{color-scheme:light only}html,body{background-color:#fafaf9}</style>`,
].join('');
html = html.replace(/<meta name="theme-color"[^>]*>/g, '');
html = html.replace('</head>', `${appleHead}${preload}</head>`);
html = html.replace(/<body([^>]*)>/, `<body$1>${splash}`);
fs.writeFileSync(htmlPath, html);
console.log(`postexport: ${fonts.length} skrifttyper forudindlæses, startskærm tilføjet`);
