#!/usr/bin/env node
/*
 * The x-height ratio of a typeface: the number `font-size-adjust` wants, so every fallback draws at the same
 * visual size as the real font (no jump when the web font arrives, no small glyph where the font lacks one).
 *   node x-height.mjs "Geist"                    a Google Fonts family
 *   node x-height.mjs "Acme Sans" ./acme.woff2   a local font file
 *   node x-height.mjs "Segoe UI" --system        a font installed on this machine
 * Prints the ratio, the same for the fallbacks installed on this machine, and the line to paste.
 * Needs playwright-core (or playwright) and Chrome, the same as antheo-review's check-page.mjs.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const family = args.find((a) => !a.startsWith('--') && !/\.(woff2?|ttf|otf)$/i.test(a));
const file = args.find((a) => /\.(woff2?|ttf|otf)$/i.test(a));
const system = args.includes('--system');
if (!family) {
  console.log('usage: node x-height.mjs "Family" [font-file.woff2] [--system]');
  process.exit(1);
}

const require = createRequire(pathToFileURL(resolve('package.json')).href);
let chromium;
for (const name of ['playwright-core', 'playwright']) {
  try { const m = await import(pathToFileURL(require.resolve(name)).href); chromium = m.chromium ?? m.default.chromium; break; } catch { /* try the next */ }
}
if (!chromium) { console.log('playwright-core is not installed in this project: npm i -D playwright-core'); process.exit(1); }

const face = file
  ? `<style>@font-face { font-family: "${family}"; src: url(data:font/woff2;base64,${readFileSync(resolve(file)).toString('base64')}); }</style>`
  : system ? '' : `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap" rel="stylesheet">`;

const browser = await launchBrowser(chromium);
try {
  const page = await browser.newPage();
  await page.setContent(`<!doctype html>${face}<body></body>`, { waitUntil: 'networkidle' });
  const out = await page.evaluate(async ({ family, system }) => {
    if (!system) await document.fonts.load(`100px "${family}"`);
    await document.fonts.ready;
    // 1ex is the font's own x-height; at 1000px the box height is the ratio × 1000
    const ratio = (stack) => {
      const el = document.createElement('div');
      el.style.cssText = `font: 1000px ${stack}; height: 1ex; width: 1ex; position: absolute; font-size-adjust: none;`;
      document.body.append(el);
      const h = el.getBoundingClientRect().height;
      el.remove();
      return +(h / 1000).toFixed(3);
    };
    // a missing family silently draws in the default font, so test it against two different defaults
    const width = (stack) => {
      const el = document.createElement('span');
      el.style.cssText = `font: 100px ${stack}; position: absolute; white-space: nowrap;`;
      el.textContent = 'mmmmmmmmmmlli10Wg';
      document.body.append(el);
      const w = el.getBoundingClientRect().width;
      el.remove();
      return w;
    };
    const here = (name) => width(`"${name}", serif`) !== width('serif') || width(`"${name}", monospace`) !== width('monospace');
    const fallbacks = {};
    for (const f of ['Segoe UI', 'SF Pro Text', 'Helvetica Neue', 'Arial', 'Roboto', 'Consolas', 'Menlo']) if (here(f)) fallbacks[f] = ratio(`"${f}"`);
    fallbacks['system-ui'] = ratio('system-ui');
    return { loaded: here(family), value: ratio(`"${family}"`), fallbacks };
  }, { family, system });
  if (!out.loaded) throw new Error(`"${family}" did not load, so nothing was measured. Check the name, or pass the font file.`);
  console.log(`${family}: x-height ${out.value} of the font size`);
  for (const [name, v] of Object.entries(out.fallbacks)) {
    const pct = Math.round((out.value / v - 1) * 100);
    console.log(`  ${name.padEnd(16)} ${v}   ${pct === 0 ? 'already matches' : `drawn ${Math.abs(pct)}% ${pct > 0 ? 'larger' : 'smaller'} to match`}`);
  }
  console.log(`\nhtml { font-size-adjust: ${out.value}; }`);
} catch (e) {
  console.log(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}

// Chrome, then Edge, then Playwright's own Chromium; one clear line if none is installed. (The same function is in every
// Antheo tool that opens a browser; tests/self-test.mjs keeps the copies identical.)
async function launchBrowser(chromium) {
  for (const options of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { return await chromium.launch(options); } catch { /* try the next one */ }
  }
  console.error('No browser found. Install Chrome or Edge, or run: npx playwright install chromium');
  process.exit(2);
}
