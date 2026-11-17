#!/usr/bin/env node
/*
 * Antheo beside: put what you built next to the reference it came from, at the same height, so the difference can be
 * seen and measured instead of remembered. One sheet: the reference on the left, the build on the right, and a row of
 * 3× close-ups of both centres underneath, where icon sizes, rims and gloss show.
 *
 *   node beside.mjs http://localhost:5173/ --clip ".radio" --ref refs/radio.jpg
 *   node beside.mjs ./page.html --clip ".card" --ref refs/card.png --dark --act "click:.card button" --wait 600
 *
 * Options: --clip <selector> (the element to compare) · --ref <image> (png, jpg, webp) · --width 1280 · --dark ·
 *   --scale 2 (device pixels) · --act "click:<sel>" | "hover:<sel>" | "key:<Key>" | "wait:<ms>" (repeatable, in order)
 *   · --wait 800 (ms before the shot) · --out <file> · --region x,y,w,h (only this part of the reference, in its own
 *   pixels: one card of a screenshot of three) · --ground corners|none|<css colour> (the background to leave out of the
 *   colour check: by default the colour at the reference's corners; none keeps every colour) · --zoom x,y (where
 *   the 3× close-ups look, as fractions of the width and height: 0.5,0.5 is the middle, 0.5,0.85 the lower part,
 *   where a dial or a row of buttons sits).
 * Without --out it writes .antheo/evidence/beside-<reference name>-<time>.png, which is where the gate looks when it
 * is armed with --ref: two of these, made at least a minute apart, show the build was compared, changed and compared
 * again. Beside each sheet goes a .json record of what was compared: the page, the element, the reference and its
 * region, the viewport, the theme and the time.
 *
 * It prints both sizes, so ratios can be checked by hand (an icon to its button, a figure to its card), and the main
 * colours of each, naming any colour of the reference the build has no near match for (ΔE in OKLab over 10). Exit 0 with the
 * sheet written; 2 for bad arguments or no browser; 4 when the page, the element or the reference can't be read.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { basename, dirname, extname, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--clip', '--ref', '--width', '--scale', '--act', '--wait', '--out', '--region', '--ground', '--zoom'];
const target = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? undefined : argv[i + 1]; };
const all = (n) => argv.flatMap((a, i) => (a === `--${n}` && argv[i + 1] ? [argv[i + 1]] : []));
if (!target || !flag('clip') || !flag('ref')) {
  console.error('usage: node beside.mjs <url or html file> --clip <selector> --ref <image> [--width 1280] [--dark] [--scale 2] [--act "click:<sel>"]... [--wait 800] [--out file.png]');
  process.exit(2);
}
const refPath = resolve(flag('ref'));
if (!existsSync(refPath)) { console.error(`No reference image at ${refPath}`); process.exit(4); }
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }[extname(refPath).toLowerCase()];
if (!mime) { console.error('The reference must be a png, jpg, webp or gif'); process.exit(2); }
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = resolve(flag('out') ?? `.antheo/evidence/beside-${basename(refPath, extname(refPath))}-${stamp}.png`);
const [, filePart, tail = ''] = /^https?:|^file:/.test(target) ? [null, target] : target.match(/^([^?#]*)(.*)$/);
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(filePart)).href + tail;

async function loadChromium() {
  const require = createRequire(pathToFileURL(resolve('package.json')).href);
  for (const name of ['playwright', 'playwright-core', '@playwright/test']) {
    try { const mod = await import(pathToFileURL(require.resolve(name)).href); const c = mod.chromium ?? mod.default?.chromium; if (c) return c; } catch {}
  }
  for (const name of ['playwright', 'playwright-core']) {
    try { const mod = await import(name); const c = mod.chromium ?? mod.default?.chromium; if (c) return c; } catch {}
  }
  console.error('Playwright is not installed in this project. Run: npm i -D playwright-core (it uses your Chrome or Edge; with neither, also run: npx playwright install chromium)');
  process.exit(2);
}

const chromium = await loadChromium();
const browser = await launchBrowser(chromium);
let code = 0;
try {
  const page = await browser.newPage({ viewport: { width: Number(flag('width') ?? 1280), height: 900 }, deviceScaleFactor: Number(flag('scale') ?? 2), colorScheme: argv.includes('--dark') ? 'dark' : 'light' });
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (res && res.status() >= 400) throw new Error(`HTTP ${res.status()}`);
  } catch (e) { console.error(`Could not open ${url}: ${String(e.message).split('\n')[0]}`); code = 4; }
  if (!code) {
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    for (const act of all('act')) {
      const [kind, ...rest] = act.split(':'); const arg = rest.join(':');
      if (kind === 'click') await page.locator(arg).first().click().catch(() => {});
      else if (kind === 'hover') await page.locator(arg).first().hover().catch(() => {});
      else if (kind === 'key') await page.keyboard.press(arg).catch(() => {});
      else if (kind === 'wait') await page.waitForTimeout(Number(arg) || 0);
    }
    const el = page.locator(flag('clip')).first();
    await el.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (!(await el.count())) { console.error(`No element matches --clip "${flag('clip')}"`); code = 4; }
    else {
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(Number(flag('wait') ?? 800));
      const box = await el.boundingBox();
      const shot = await el.screenshot();
      let refUrl = `data:${mime};base64,${readFileSync(refPath).toString('base64')}`;
      // only the part of the reference that was asked for: crop it in a scratch page before comparing
      const region = flag('region')?.split(',').map(Number);
      if (region) {
        if (region.length !== 4 || region.some((n) => !Number.isFinite(n) || n < 0) || !region[2] || !region[3]) { console.error('--region takes x,y,w,h in the reference\'s pixels'); process.exit(2); }
        const scratch = await browser.newPage();
        refUrl = await scratch.evaluate(async ({ src, r }) => {
          const img = new Image(); img.src = src; await img.decode();
          const c = document.createElement('canvas'); c.width = r[2]; c.height = r[3];
          c.getContext('2d').drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
          return c.toDataURL('image/png');
        }, { src: refUrl, r: region });
        await scratch.close();
      }
      const buildUrl = `data:image/png;base64,${shot.toString('base64')}`;
      const zoom = (flag('zoom') ?? '0.5,0.5').split(',').map(Number);
      if (zoom.length !== 2 || zoom.some((n) => !Number.isFinite(n) || n < 0 || n > 1)) { console.error('--zoom takes x,y as fractions from 0 to 1, like 0.5,0.85'); process.exit(2); }
      const at = `${zoom[0] * 100}% ${zoom[1] * 100}%`, where = flag('zoom') ? `around ${zoom[0]}, ${zoom[1]}` : 'middle';
      const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
      // both at the same height on top; underneath, the middle third of each at 3×, where the details are
      await sheet.setContent(`<body style="margin:0;padding:16px;background:#7a7a7a;font:13px/1.4 system-ui,sans-serif;color:#fff">
        <div style="display:flex;gap:16px;align-items:flex-start">
          <figure style="margin:0"><img id="r" src="${refUrl}" style="display:block;height:520px"><figcaption>reference: ${basename(refPath)}</figcaption></figure>
          <figure style="margin:0"><img id="b" src="${buildUrl}" style="display:block;height:520px"><figcaption>build: ${flag('clip').replace(/</g, '&lt;')} (${Math.round(box.width)}×${Math.round(box.height)} CSS px)</figcaption></figure>
        </div>
        <div style="display:flex;gap:16px;margin-top:16px">
          <figure style="margin:0"><div id="rz" style="width:560px;height:360px;overflow:hidden;background:url(${refUrl}) ${at}/300% no-repeat"></div><figcaption>reference, ${where} at 3×</figcaption></figure>
          <figure style="margin:0"><div id="bz" style="width:560px;height:360px;overflow:hidden;background:url(${buildUrl}) ${at}/300% no-repeat"></div><figcaption>build, ${where} at 3×</figcaption></figure>
        </div></body>`);
      const ok = await sheet.evaluate(() => Promise.all([...document.images].map((i) => i.decode().then(() => true, () => false))).then((r) => r.every(Boolean)));
      if (!ok) { console.error('The reference image could not be read'); code = 4; }
      else {
        const sizes = await sheet.evaluate(() => [...document.images].map((i) => `${i.naturalWidth}×${i.naturalHeight}`));
        const palette = await sheet.evaluate(paletteCheck, flag('ground') ?? 'corners');
        mkdirSync(dirname(OUT), { recursive: true });
        await sheet.screenshot({ path: OUT, fullPage: true });
        writeFileSync(OUT.replace(/\.png$/i, '') + '.json', JSON.stringify({
          tool: 'beside', page: url, clip: flag('clip'), reference: refPath, region: region ?? null, ground: flag('ground') ?? 'corners',
          zoom: flag('zoom') ?? null,
          viewport: `${flag('width') ?? 1280}×900`, theme: argv.includes('--dark') ? 'dark' : 'light', actions: all('act'),
          at: new Date().toISOString(), missingColours: palette.missing,
        }, null, 2));
        console.log(`Beside: ${OUT}`);
        console.log(`  reference ${sizes[0]} px · build ${sizes[1]} px (at ${flag('scale') ?? 2}×)`);
        console.log(`  reference colours: ${palette.ref.map((c) => `${c.hex} ${c.share}%`).join(', ')}`);
        console.log(`  build colours:     ${palette.build.map((c) => `${c.hex} ${c.share}%`).join(', ')}`);
        if (palette.missing.length) console.log(`  missing from the build (nearest is far, ΔE over 10): ${palette.missing.map((c) => `${c.hex} (${c.share}% of the reference, nearest ${c.nearest}, ΔE ${c.de})`).join('; ')}`);
        else console.log('  every main colour of the reference has a near match in the build (ΔE 10 or less)');
        console.log('  Open it. Name what is missing (light, a detail, a proportion, how it moves), fix that, and compare again.');
      }
    }
  }
} finally {
  await browser.close();
}
process.exit(code);

/* Runs in the sheet: the main colours of each image (quantised, the eight that cover the most area, each over 3%), and
   for every main colour of the reference, how far the nearest build colour is, as ΔE in OKLab (×100). A large gap on a
   colour that covers a lot of the reference is a sign the build lost it: a ground, a body colour, an accent. The
   ground it was shot on is left out of both: by default the colour at the image's corners (which can remove a real
   colour that touches a corner: give --region or --ground then), none to keep every colour, or a CSS colour. */
function paletteCheck(groundOpt) {
  const named = (() => {
    if (!groundOpt || groundOpt === 'corners' || groundOpt === 'none') return null;
    const c = document.createElement('canvas').getContext('2d'); c.fillStyle = groundOpt; c.fillRect(0, 0, 1, 1);
    const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return { r, g, b };
  })();
  const main = (img, dropGround = true) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = Math.max(1, Math.round(64 * img.naturalHeight / img.naturalWidth));
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data; const bins = new Map(); let n = 0;
    // the ground the thing was shot on (the four corners) is not the thing: leave it out
    const at = (px, py) => { const i = (py * c.width + px) * 4; return { r: d[i], g: d[i + 1], b: d[i + 2] }; };
    const corners = groundOpt === 'none' || !dropGround ? [] : named ? [named] : [at(0, 0), at(c.width - 1, 0), at(0, c.height - 1), at(c.width - 1, c.height - 1)];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const px = { r: d[i], g: d[i + 1], b: d[i + 2] };
      if (corners.some((g) => de(px, g) < 6)) continue;
      n++; const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4); const b = bins.get(k) ?? { r: 0, g: 0, b: 0, n: 0 }; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; b.n++; bins.set(k, b); }
    return [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 8).filter((b) => b.n / n > 0.03).map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, share: Math.round((b.n / n) * 100) }));
  };
  function lab({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const [R, G, B] = [f(r), f(g), f(b)];
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  function de(a, b) { const [x, y] = [lab(a), lab(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100; }
  const [ri, bi] = [...document.images];
  // The build is matched with every colour it has: an element that fills its own box (a card, a tile) carries its
  // body colour into the corners, and dropping that as "ground" reported the reference's card colours as missing.
  const ref = main(ri), build = main(bi), buildAll = main(bi, false);
  const missing = ref.map((c) => { const near = buildAll.reduce((best, b) => (de(c, b) < de(c, best) ? b : best), buildAll[0]); return { c, near, d: near ? de(c, near) : 100 }; })
    .filter((x) => x.d > 10).map((x) => ({ hex: hex(x.c), share: x.c.share, nearest: x.near ? hex(x.near) : 'none', de: Math.round(x.d) }));
  return { ref: ref.map((c) => ({ hex: hex(c), share: c.share })), build: build.map((c) => ({ hex: hex(c), share: c.share })), missing };
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
