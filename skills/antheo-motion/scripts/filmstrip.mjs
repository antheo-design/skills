#!/usr/bin/env node
/*
 * Antheo filmstrip: watch a motion, frame by frame, instead of judging it from a still.
 * It slows the page down (CSS animations, transitions and Web Animations through the browser's own playback rate;
 * requestAnimationFrame, performance.now, Date and timers by scaling the page's clock), does one thing to it, takes
 * evenly spaced frames of one element, and lays them out on one sheet with the time under each frame.
 *
 *   node filmstrip.mjs http://localhost:5173/ --clip ".tuner" --click ".preset:nth-child(3)"
 *   node filmstrip.mjs ./page.html --clip ".card" --hover ".card" --frames 10 --duration 300
 *   node filmstrip.mjs <url> --clip ".sheet" --drag ".sheet-handle" --by 0,240 --duration 900
 *   node filmstrip.mjs <url> --clip ".toast" --focus "#save" --key Enter --dark --out save-dark.png
 *   node filmstrip.mjs <url> --clip ".hero" --load            (the motion that plays when the page opens)
 *
 * What to do (one of): --click <sel> · --hover <sel> · --press <sel> (held down; released after the last frame, or
 *   with --hold <ms> after that much of the motion, so the frames after it show the release) ·
 *   --drag <sel> --by dx,dy · --focus <sel> --key <Key> · --load. Without one, it films whatever is already moving.
 * Options: --frames 12 (how many) · --duration 600 (ms of the motion to cover, at normal speed) · --rate 0.1 (how
 *   slow) · --width 1280 --height 800 · --dark · --reduce (prefers-reduced-motion: reduce) · --out filmstrip.png ·
 *   --pad 16 (px around the clip). Without --out, the sheet goes to .antheo/evidence/film-<time>.png when the folder
 *   has an .antheo folder (the gate counts it as evidence), otherwise to ./filmstrip.png.
 *
 * Reading the sheet (antheo-motion, "Watch it"): every frame should look composed on its own. Look for a hard edge
 * sliding through, a flash of the wrong colour, text that jumps or reflows, a box that scales its contents, something
 * that moves before the press is felt, an end that overshoots where it shouldn't or stops dead where it should settle.
 * Film the same thing with --reduce: the story must still be told.
 *
 * Beside the sheet goes a .json record: the page, the element, the action, the timing and whether any frame differs
 * from the first (a film where nothing changed is not evidence; the gate armed with --ref doesn't count it).
 *
 * Limits: the frames are real screenshots taken while the slowed motion runs, so their times are measured, not
 * planned (each is printed). WebGL and video play at their own speed. Exit 0 with the sheet written; 2 for bad
 * arguments or no browser; 4 when the page or the clip can't be found. Closes the browser in a finally block.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--clip', '--click', '--hover', '--press', '--hold', '--drag', '--by', '--focus', '--key', '--frames', '--duration', '--rate', '--width', '--height', '--out', '--pad'];
const target = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? undefined : argv[i + 1]; };
const has = (n) => argv.includes(`--${n}`);
if (!target || !flag('clip')) {
  console.error('usage: node filmstrip.mjs <url or html file> --clip <selector> [--click|--hover|--press <sel> | --drag <sel> --by dx,dy | --focus <sel> --key <Key> | --load] [--frames 12] [--duration 600] [--rate 0.1] [--width 1280] [--height 800] [--dark] [--reduce] [--out filmstrip.png]');
  process.exit(2);
}
const FRAMES = Math.max(2, Math.min(40, Number(flag('frames') ?? 12)));
const DURATION = Math.max(50, Number(flag('duration') ?? 600));
const RATE = Math.max(0.02, Math.min(1, Number(flag('rate') ?? 0.1)));
const WIDTH = Number(flag('width') ?? 1280), HEIGHT = Number(flag('height') ?? 800);
const PAD = Number(flag('pad') ?? 16);
// in a project the gate watches (it has an .antheo folder), the sheet goes with the other evidence
const OUT = resolve(flag('out') ?? (existsSync('.antheo') ? `.antheo/evidence/film-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png` : 'filmstrip.png'));
const [, filePart, tail = ''] = /^https?:|^file:/.test(target) ? [null, target] : target.match(/^([^?#]*)(.*)$/);
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(filePart)).href + tail;
const by = (flag('by') ?? '0,0').split(',').map(Number);
if (has('drag') && (by.length !== 2 || by.some((n) => !Number.isFinite(n)))) { console.error('--by takes dx,dy in px, like --by 240,0'); process.exit(2); }

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

// Runs before the page's scripts: the page's clock runs at `rate`, so JavaScript-driven motion slows with the CSS.
function slowClock(rate) {
  const realNow = performance.now.bind(performance), realDate = Date.now;
  let on = false, base = 0, baseDate = 0, since = 0;
  const now = () => (on ? base + (realNow() - since) * rate : realNow());
  window.__filmSlow = (v) => { base = now(); baseDate = Date.now(); since = realNow(); on = v; };
  performance.now = now;
  Date.now = () => (on ? baseDate + (realNow() - since) * rate : realDate());
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => cb(now()));
  const st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
  window.setTimeout = (fn, ms = 0, ...a) => st(fn, on ? ms / rate : ms, ...a);
  window.setInterval = (fn, ms = 0, ...a) => si(fn, on ? ms / rate : ms, ...a);
}

const chromium = await loadChromium();
const browser = await launchBrowser(chromium);
let code = 0;
try {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1,
    colorScheme: has('dark') ? 'dark' : 'light', reducedMotion: has('reduce') ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  await page.addInitScript(slowClock, RATE);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Animation.enable');
  const slow = async (on) => {
    await cdp.send('Animation.setPlaybackRate', { playbackRate: on ? RATE : 1 });
    await page.evaluate((v) => window.__filmSlow?.(v), on).catch(() => {});
  };

  if (has('load')) await slow(true); // set before the load, so the opening motion is slowed from its first frame
  let response;
  try {
    response = await page.goto(url, { waitUntil: has('load') ? 'commit' : 'networkidle', timeout: 30000 });
  } catch (e) { console.error(`Could not open ${url}: ${e.message.split('\n')[0]}`); code = 4; }
  if (!code && response && response.status() >= 400) { console.error(`${url} answered ${response.status()}`); code = 4; }
  if (!code && has('load')) await slow(true);

  const clip = page.locator(flag('clip')).first();
  // a page that renders with a script (React, Vue) has no element yet at the first byte: wait a little for it
  if (!code) await clip.waitFor({ state: 'attached', timeout: has('load') ? 10000 : 2000 }).catch(() => {});
  if (!code && !(await clip.count().catch(() => 0))) { console.error(`No element matches --clip "${flag('clip')}"`); code = 4; }

  if (!code) {
    if (!has('load')) {
      await clip.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(400); // let anything from the scroll settle at normal speed
    }
    const box0 = await clip.boundingBox();
    const area = (b) => ({
      x: Math.max(0, Math.floor(b.x - PAD)), y: Math.max(0, Math.floor(b.y - PAD)),
      width: Math.min(WIDTH, Math.ceil(b.width + PAD * 2)), height: Math.min(HEIGHT, Math.ceil(b.height + PAD * 2)),
    });
    // the clip stays where the element was at rest, so movement shows against a fixed frame
    const region = area(box0);

    const center = async (sel) => {
      const el = page.locator(sel).first();
      if (!(await el.count())) { console.error(`No element matches "${sel}"`); code = 4; return null; }
      const b = await el.boundingBox();
      return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const realSpan = DURATION / RATE; // how long the slowed motion takes in real time
    let act = async () => {};
    let released = false;
    if (flag('hover')) { const p = await center(flag('hover')); act = async () => p && page.mouse.move(p.x, p.y); }
    else if (flag('click')) { const p = await center(flag('click')); act = async () => { if (p) { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); } }; }
    else if (flag('press')) {
      const p = await center(flag('press')); const hold = Number(flag('hold'));
      act = async () => {
        if (!p) return;
        await page.mouse.move(p.x, p.y); await page.mouse.down();
        // let go part way through, in the motion's own time, so the release is filmed too
        if (hold > 0) { await page.waitForTimeout(Math.min(hold, DURATION) / RATE); await page.mouse.up(); released = true; }
      };
    }
    else if (flag('focus') && flag('key')) { await page.locator(flag('focus')).first().focus().catch(() => { code = 4; }); act = async () => page.keyboard.press(flag('key')); }
    else if (flag('drag')) {
      const p = await center(flag('drag'));
      act = async () => {
        if (!p) return;
        await page.mouse.move(p.x, p.y); await page.mouse.down();
        const steps = 24, start = Date.now();
        for (let i = 1; i <= steps; i++) {
          await page.mouse.move(p.x + (by[0] * i) / steps, p.y + (by[1] * i) / steps);
          const wait = (realSpan * 0.7 * i) / steps - (Date.now() - start); // the drag covers 70% of the strip, the release the rest
          if (wait > 0) await page.waitForTimeout(wait);
        }
        await page.mouse.up();
      };
    }

    if (!code) {
      if (!has('load')) await slow(true);
      const frames = [];
      const start = Date.now();
      const acting = act(); // not awaited: the frames are taken while it happens
      for (let i = 0; i < FRAMES; i++) {
        const due = (realSpan * i) / (FRAMES - 1);
        const wait = due - (Date.now() - start);
        if (wait > 0) await page.waitForTimeout(wait);
        const at = (Date.now() - start) * RATE;
        // a busy page can keep a screenshot from settling: give each frame a few seconds, and skip one that can't be taken
        const png = await page.screenshot({ clip: region, animations: 'allow', timeout: 5000 }).catch(() => null);
        if (png) frames.push({ at, src: `data:image/png;base64,${png.toString('base64')}` });
      }
      await acting.catch(() => {});
      if (flag('press') && !released) await page.mouse.up().catch(() => {});
      await slow(false);
      await page.waitForTimeout(300);
      const last = await page.screenshot({ clip: region, animations: 'allow', timeout: 5000 }).catch(() => null);
      if (last) frames.push({ at: null, src: `data:image/png;base64,${last.toString('base64')}` });
      if (frames.length < 2) { console.error('The page never settled enough to take its frames; film a smaller --clip, or a page with less moving at once.'); code = 4; }

      if (!code) {
      const cols = Math.min(FRAMES + 1, Math.max(2, Math.floor(1600 / (region.width + 12))));
      const sheet = await browser.newPage({ viewport: { width: cols * (region.width + 12) + 12, height: 400 }, deviceScaleFactor: 1 });
      const what = flag('click') ? `click ${flag('click')}` : flag('hover') ? `hover ${flag('hover')}` : flag('press') ? `press ${flag('press')}` : flag('drag') ? `drag ${flag('drag')} by ${by.join(',')}` : flag('key') ? `${flag('key')} on ${flag('focus')}` : has('load') ? 'page load' : 'already moving';
      await sheet.setContent(`<body style="margin:0;padding:12px;background:#8a8a8a;font:12px/1.4 system-ui,sans-serif;color:#111">
        <p style="margin:0 0 8px">${what.replace(/</g, '&lt;')} · ${DURATION}ms at ${RATE}× · ${has('dark') ? 'dark' : 'light'}${has('reduce') ? ' · reduced motion' : ''}</p>
        <div style="display:grid;grid-template-columns:repeat(${cols},${region.width}px);gap:12px">
        ${frames.map((f) => `<figure style="margin:0"><img src="${f.src}" style="display:block;width:${region.width}px;outline:1px solid #0003"><figcaption>${f.at === null ? 'settled' : `${Math.round(f.at)}ms`}</figcaption></figure>`).join('')}
        </div></body>`);
      mkdirSync(dirname(OUT), { recursive: true });
      await sheet.screenshot({ path: OUT, fullPage: true });
      // a film of nothing proves nothing: say how many frames differ from the first, and record it beside the sheet
      const differs = frames.filter((f) => f.src !== frames[0].src).length;
      writeFileSync(OUT.replace(/\.png$/i, '') + '.json', JSON.stringify({
        tool: 'filmstrip', page: url, clip: flag('clip'), action: what, duration: DURATION, rate: RATE, viewport: `${WIDTH}×${HEIGHT}`,
        theme: has('dark') ? 'dark' : 'light', reducedMotion: has('reduce'), frames: frames.length, changed: differs > 0, framesThatDiffer: differs,
        at: new Date().toISOString(),
      }, null, 2));
      console.log(`Filmstrip: ${OUT}`);
      console.log(`  ${what} · ${frames.length - 1} frames over ${DURATION}ms (slowed to ${RATE}×) + the settled frame`);
      console.log(`  frame times (ms): ${frames.filter((f) => f.at !== null).map((f) => Math.round(f.at)).join(', ')}`);
      if (!differs && !has('reduce')) console.log('  WARNING: no frame differs from the first. The action may not have reached the element, or the motion is outside the clip; this film is not evidence of motion.');
      else console.log(`  ${differs} of ${frames.length - 1} frames differ from the first`);
      console.log('  Open it and look at every frame: each should look composed on its own (antheo-motion, "Watch it").');
      }
    }
  }
} finally {
  await browser.close();
}
process.exit(code);

// Chrome, then Edge, then Playwright's own Chromium; one clear line if none is installed. (The same function is in every
// Antheo tool that opens a browser; tests/self-test.mjs keeps the copies identical.)
async function launchBrowser(chromium) {
  for (const options of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { return await chromium.launch(options); } catch { /* try the next one */ }
  }
  console.error('No browser found. Install Chrome or Edge, or run: npx playwright install chromium');
  process.exit(2);
}
