// Laver app-ikoner (PNG) ud fra logoet i Figma. Kør: node scripts/make-icons.mjs
import { createRequire } from 'node:module';
// Bruger den Playwright, der allerede er installeret på maskinen.
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync } from 'node:fs';

// Fuld flade uden runde hjørner: iPhone og Android runder selv hjørnerne af.
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="100%" height="100%">
<rect width="72" height="72" fill="#171717"/>${inner}</svg>`;
const logo = `<circle cx="27" cy="36" r="12" fill="none" stroke="#21F1A8" stroke-width="6"/>
<circle cx="45" cy="36" r="12" fill="none" stroke="white" stroke-width="6"/>`;
// Maskable: logoet skaleres ned, så det ligger inden for den sikre zone (80 %).
const maskable = `<g transform="translate(36 36) scale(0.8) translate(-36 -36)">${logo}</g>`;

const targets = [
  ['public/apple-touch-icon.png', 180, logo],
  ['public/icon-192.png', 192, logo],
  ['public/icon-512.png', 512, logo],
  ['public/icon-maskable-512.png', 512, maskable],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, inner] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg(inner)}</body></html>`);
  writeFileSync(file, await page.screenshot({ type: 'png' }));
  console.log('Lavet', file);
}
await browser.close();
