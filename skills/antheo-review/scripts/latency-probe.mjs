#!/usr/bin/env node
/*
 * Antheo latency probe: does the interface answer the hand fast enough, and does a dragged thing stay under the finger?
 * It uses real pointer input (page.mouse), and samples the page on every animation frame from inside the page.
 *
 *   node latency-probe.mjs http://localhost:3000/board
 *   node latency-probe.mjs ./page.html --drag ".card-handle" --json probe.json
 *   node latency-probe.mjs <url> --width 1280 --max-controls 20 --distance 300 --axis y
 *   node latency-probe.mjs <url> --play ".menu-button" --cpu 4     (how smooth is what the press starts, on a slow CPU)
 *   node latency-probe.mjs <url> --allow-writes     (let the presses send what they send; see Writes below)
 *
 * Measures, per button-like control:
 *   (a) press latency: from the pointerdown event to the first change in the control's computed style (transform,
 *       scale, translate, background, box-shadow, opacity, color, border, filter) or its state attributes (class,
 *       aria-pressed/checked/expanded/selected, data-state). Target 100ms or less; over 100ms fails. No change
 *       while the button is held, or a change only after release, fails: a press must be felt.
 *   (b) press during an animation: click, then press again 50ms later. If the second press changes nothing the
 *       control swallowed the input (WARN: fine for a submit that locks on purpose, a bug for a toggle or a tab).
 * Measures, per draggable thing, over a 40-step drag:
 *   (c) follow distance: on every animation frame, how far the dragged element has drifted from where it started
 *       relative to the pointer (the offset at press is subtracted). Target 0-2px; over 8px fails; 2-8 warns.
 * Measures, for each --play <selector> (repeatable; the first element it matches):
 *   (d) smoothness: the page is opened afresh, the thing is pressed, and for about two seconds every animation
 *       frame's length is recorded with requestAnimationFrame. Reported: the longest frame, how many ran over 16.7ms
 *       and over 33ms, and the share on time. PASS when no frame is over 33ms and 95% or more are within 16.7ms;
 *       WARN while the longest stays within 50ms; FAIL beyond. (One millisecond of slack on each line, so a frame of
 *       exactly one, two or three screen refreshes at 60Hz lands on the right side.) --cpu <n> slows the CPU n times
 *       for the plays only (Chrome's own throttle, through CDP); 4 stands in for a mid-range phone. A play passes
 *       or it does not: WARN and FAIL both exit 1, and so does a play that could not be measured.
 *
 * Which things count as draggable: [draggable], [data-drag], [data-draggable], [role=slider], elements that
 * registered a pointerdown / mousedown / touchstart listener on themselves (seen by wrapping addEventListener before
 * the page loads), elements with cursor grab or move, and anything matched by --drag <selector> (repeatable, comma
 * lists ok). Frameworks that listen on the document root (React, some libraries) hide the listener: pass --drag.
 * Native HTML5 drag-and-drop (dragstart fires) is drawn by the browser, so it is reported and not scored.
 *
 * Limits: the pointer starts at the element's center; a drag that hits a track end or a boundary reads as lag, so
 * pick --distance and --axis to fit. Clicks on links and submits are cancelled so the page stays put. A press that
 * still takes the page elsewhere (a script setting location) is reported as NAVIGATED and not measured; the page is
 * opened again and the next control is measured. A control an earlier press removed is skipped, with the reason.
 * Writes: it presses real buttons, three times each, and on a live app a real Delete or Send would fire. So while it
 * runs, every request the page makes that is not a GET, HEAD or OPTIONS is held back: stopped before it leaves the
 * browser, named in one line at the end and listed in the JSON (heldBack). The press is measured all the same (its
 * feedback is the control's own look, not the request), and service workers are off so none can send it behind the
 * probe. --allow-writes lets every request through: use it only on a page whose data you can lose. Not held back
 * either way: a GET that changes data, and messages on a WebSocket.
 * Exit code 1 when the verdict is FAIL, or when any --play is not a PASS (a press or a drag that only warns still
 * exits 0); 4 when the page could not be loaded or the probe itself could not finish (nothing was measured); 0
 * otherwise. Needs Playwright or Chrome (same loading as check-page.mjs). Closes the browser in a finally block.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--json', '--width', '--height', '--drag', '--max-controls', '--max-drags', '--distance', '--axis', '--play', '--cpu'];
const target = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? undefined : argv[i + 1]; };
const flagAll = (n) => argv.flatMap((a, i) => (a === `--${n}` && argv[i + 1] ? [argv[i + 1]] : []));
if (!target) {
  console.error('usage: node latency-probe.mjs <url or html file> [--drag <selector>]... [--width 1280] [--height 800] [--max-controls 12] [--max-drags 4] [--distance 240] [--axis x|y] [--play <selector>]... [--cpu 1] [--allow-writes] [--json out.json]');
  process.exit(2);
}
const WIDTH = Number(flag('width') ?? 1280), HEIGHT = Number(flag('height') ?? 800);
const MAX_CONTROLS = Number(flag('max-controls') ?? 12), MAX_DRAGS = Number(flag('max-drags') ?? 4);
const DISTANCE = Number(flag('distance') ?? 240), AXIS = flag('axis') === 'y' ? 'y' : 'x';
// a local file may carry a query or hash (page.html?state=error): keep it out of the path
const [, filePart, tail = ''] = /^https?:|^file:/.test(target) ? [null, target] : target.match(/^([^?#]*)(.*)$/);
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(filePart)).href + tail;
const PRESS_PASS = 100, DRAG_PASS = 2, DRAG_FAIL = 8, STEPS = 40;
// a play: about two seconds of frames after the press; a frame is on time within 16.7ms, late over 33ms, broken over 50ms
const PLAY_MS = 2000, FRAME = 16.7, LATE = 33, BROKEN = 50, SLACK = 1;
const CPU = Math.max(1, Number(flag('cpu')) || 1);
const allowWrites = argv.includes('--allow-writes');
const READS = ['GET', 'HEAD', 'OPTIONS'];
const writes = new Map(); // "POST https://host/path" → { method, url, count }: held back, or sent with --allow-writes

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

/* ── runs before the page's own scripts: remember who listens for presses, keep the page from navigating ────── */
function initScript() {
  window.__lpListeners = new Set();
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, ...rest) {
    if (this instanceof Element && /^(pointerdown|mousedown|touchstart)$/.test(type)) window.__lpListeners.add(this);
    return add.call(this, type, ...rest);
  };
  add.call(document, 'click', (e) => { const a = e.target instanceof Element && e.target.closest('a[href]'); if (a) e.preventDefault(); }, true);
  add.call(document, 'submit', (e) => e.preventDefault(), true);
}

/* ── runs inside the page ─────────────────────────────────────────────────────────────────────────────────────── */
function findThings({ dragSelectors, maxControls, maxDrags }) {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width >= 4 && r.height >= 4 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const name = (el) => { const id = el.id ? `#${el.id}` : ''; const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''; const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24); return `${el.tagName.toLowerCase()}${id}${cls}${t ? ` "${t}"` : ''}`; };
  let n = 0;
  const tag = (el) => { if (!el.dataset.lpId) el.dataset.lpId = String(++n); return el.dataset.lpId; };

  const dragSet = new Set();
  const drags = [];
  const addDrag = (el, why) => { if (!dragSet.has(el) && visible(el)) { dragSet.add(el); drags.push({ id: tag(el), name: name(el), why }); } };
  for (const sel of dragSelectors) { try { document.querySelectorAll(sel).forEach((el) => addDrag(el, `--drag ${sel}`)); } catch {} }
  document.querySelectorAll('[draggable="true"],[data-drag],[data-draggable],[role="slider"]').forEach((el) => addDrag(el, 'marked draggable'));
  const BTN = 'button,[role="button"],[role="switch"],[role="tab"],[role="checkbox"],summary,input[type="button"],input[type="submit"],input[type="reset"],a[role="button"],a[class*="btn"],a[class*="button"]';
  for (const el of window.__lpListeners || []) if (!el.matches(BTN) && el.isConnected) addDrag(el, 'listens for pointerdown');
  document.querySelectorAll('body *').forEach((el) => { const c = getComputedStyle(el).cursor; if ((c === 'grab' || c === 'move') && !el.matches(BTN)) addDrag(el, `cursor ${c}`); });

  const controls = [];
  const seen = new Set();
  const consider = (el) => {
    if (seen.has(el) || dragSet.has(el)) return; seen.add(el);
    if (!visible(el)) return;
    const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
    controls.push({ id: tag(el), name: name(el), disabled });
  };
  document.querySelectorAll(BTN).forEach(consider);
  document.querySelectorAll('body *').forEach((el) => { if (!seen.has(el) && getComputedStyle(el).cursor === 'pointer' && !el.closest(BTN) && !el.parentElement?.closest('[data-lp-id]')) consider(el); });
  return { controls: controls.slice(0, maxControls), drags: drags.slice(0, maxDrags), totalControls: controls.length, totalDrags: drags.length };
}

function installProbe() {
  const PROPS = ['transform', 'scale', 'translate', 'rotate', 'backgroundColor', 'boxShadow', 'opacity', 'color', 'borderColor', 'filter', 'outlineColor'];
  const ATTRS = ['class', 'aria-pressed', 'aria-checked', 'aria-expanded', 'aria-selected', 'data-state', 'disabled'];
  const el = (id) => document.querySelector(`[data-lp-id="${id}"]`);
  const sig = (e) => { const cs = getComputedStyle(e); return PROPS.map((p) => cs[p]).join('|') + '#' + ATTRS.map((a) => e.getAttribute(a)).join('|'); };
  const P = (window.__lp = { run: null });
  P.stop = () => { if (P.run) P.run.stopped = true; P.run = null; };

  // press watcher: every pointerdown on the page starts a clock; the first frame whose style differs from the one
  // seen just before the press stops it. Sampling happens after the frame's own callbacks (setTimeout 0).
  P.armPress = (id) => {
    P.stop();
    const e = el(id), run = (P.run = { downs: [], ups: [], stopped: false });
    // the look before the press, refreshed every frame while nothing is held. It cannot be read when pointerdown is
    // heard: the browser has applied :active by then, so feedback with no transition would be in the "before" and
    // read as no answer. A look that already differs at pointerdown answered at once (0ms).
    let rest = sig(e), held = false;
    window.addEventListener('pointerdown', (ev) => { if (run.stopped) return; held = true; run.downs.push({ at: ev.timeStamp, base: rest, change: sig(e) !== rest ? ev.timeStamp : null }); }, true);
    window.addEventListener('pointerup', (ev) => { if (run.stopped) return; held = false; run.ups.push(ev.timeStamp); }, true);
    const tick = () => {
      if (run.stopped) return;
      setTimeout(() => { const now = performance.now(), s = sig(e); for (const d of run.downs) if (d.change === null && s !== d.base) d.change = now; if (!held) rest = s; }, 0);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  P.readPress = () => { const r = P.run; return r ? { downs: r.downs.map((d) => ({ latency: d.change === null ? null : d.change - d.at, at: d.at, change: d.change })), ups: r.ups } : null; };

  // drag watcher: pointer position vs element center each frame, with the start offset subtracted
  P.armDrag = (id) => {
    P.stop();
    const e = el(id), run = (P.run = { stopped: false, active: false, ptr: null, off: null, errs: [], native: false });
    window.addEventListener('pointerdown', (ev) => { const r = e.getBoundingClientRect(); run.off = { x: ev.clientX - (r.left + r.width / 2), y: ev.clientY - (r.top + r.height / 2) }; run.ptr = { x: ev.clientX, y: ev.clientY }; run.active = true; }, true);
    window.addEventListener('pointermove', (ev) => { if (run.active) run.ptr = { x: ev.clientX, y: ev.clientY }; }, true);
    window.addEventListener('pointerup', () => { run.active = false; }, true);
    document.addEventListener('dragstart', () => { run.native = true; }, true);
    const tick = () => {
      if (run.stopped) return;
      setTimeout(() => {
        if (!run.active || !run.ptr) return;
        const r = e.getBoundingClientRect();
        run.errs.push(Math.hypot(run.ptr.x - (r.left + r.width / 2) - run.off.x, run.ptr.y - (r.top + r.height / 2) - run.off.y));
      }, 0);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  P.readDrag = () => { const r = P.run; return r ? { errs: r.errs, native: r.native } : null; };
  // play watcher: from the first pointerdown, the length of every animation frame (the frame's own timestamps, so
  // a blocked main thread shows as one long frame)
  P.armPlay = () => {
    P.stop();
    const run = (P.run = { stopped: false, at: null, frames: [] });
    let last = null;
    window.addEventListener('pointerdown', (ev) => { if (!run.stopped && run.at === null) run.at = ev.timeStamp; }, true);
    const tick = (t) => { if (run.stopped) return; if (last !== null && run.at !== null && t > run.at) run.frames.push(t - last); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  P.readPlay = () => { const r = P.run; return r ? { frames: r.frames, pressed: r.at !== null } : null; };
  P.find = (sel) => { let e; try { e = document.querySelector(sel); } catch { return { bad: true }; } if (!e) return null; if (!e.dataset.lpId) e.dataset.lpId = `play-${document.querySelectorAll('[data-lp-id]').length}`; const t = (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24); return { id: e.dataset.lpId, name: `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${t ? ` "${t}"` : ''}` }; };
  P.center = (id) => { const e = el(id); e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return { x, y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, covered: !(top && (top === e || e.contains(top) || top.contains(e))), coveredBy: top ? top.tagName.toLowerCase() : null }; };
  P.reset = () => { document.querySelectorAll('dialog[open]').forEach((d) => { try { d.close(); } catch {} }); };
}

const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (v) => (v === null ? null : Math.round(v * 10) / 10);

const chromium = await loadChromium();
let browser;
browser = await launchBrowser(chromium);
const report = { url, width: WIDTH, controls: [], drags: [], plays: [], skipped: [], verdict: 'PASS' };
let loadFailed = null, crashed = null;
try {
  // with the guard on, service workers are off: a worker's own requests never pass through the route below
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, ...(allowWrites ? {} : { serviceWorkers: 'block' }) });
  const page = await ctx.newPage();
  /* the write guard (the same as the access probe's): a request that would change something is stopped before it
     leaves the browser and remembered. "aborted" leaves the page where it was, so a form posted by script does not
     take the page away mid-measure. With --allow-writes nothing is stopped, and what went out is remembered instead. */
  const noteWrite = (req) => {
    let where = req.url().split('#')[0].split('?')[0];
    try { const u = new URL(req.url()); where = u.origin === 'null' ? u.pathname : u.origin + u.pathname; } catch { /* keep the address as given */ }
    const k = `${req.method()} ${where}`;
    writes.set(k, { method: req.method(), url: where, count: (writes.get(k)?.count ?? 0) + 1 });
  };
  if (allowWrites) ctx.on('request', (req) => { if (!READS.includes(req.method())) noteWrite(req); });
  else await ctx.route('**/*', (route) => {
    const req = route.request();
    // a request still in the air when the browser closes has nothing left to answer: not an error
    if (READS.includes(req.method())) return route.continue().catch(() => {});
    noteWrite(req);
    return route.abort('aborted').catch(() => {});
  });
  await page.addInitScript(initScript);
  // a page that didn't load (a stopped server, an error status) is a tool error, exit 4: the browser's own error page
  // must not be pressed as if it were the page. A page that loaded but never goes quiet (it polls) is still measured.
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => ({ failed: String(e.message || e).split('\n')[0] }));
  if (res?.failed && !/Timeout/i.test(res.failed)) loadFailed = res.failed;
  else if (res && typeof res.status === 'function' && res.status() >= 400) loadFailed = `HTTP ${res.status()}`;
  if (loadFailed) throw new Error(loadFailed);
  const things = { dragSelectors: flagAll('drag').flatMap((s) => s.split(/,(?![^(]*\))/)).map((s) => s.trim()).filter(Boolean), maxControls: MAX_CONTROLS, maxDrags: MAX_DRAGS };
  // ids are given in document order, so the page opened again gives the same elements the same ids
  const settle = async () => { await page.waitForTimeout(500); const f = await page.evaluate(findThings, things); await page.evaluate(installProbe); return f; };
  const found = await settle();
  /* A press can take the page elsewhere (a script setting location) or remove the next control. Neither ends the run:
     the row says what happened, and after a navigation the page is opened again for the rest. */
  const here = () => page.evaluate(() => !!window.__lp).catch(() => false);
  const short = (u) => (u.startsWith('file:') ? u.split('/').slice(-1)[0] : u.replace(/^https?:\/\/[^/]+/, '')).slice(0, 80);
  let lost = false; // the page could not be opened again: nothing after this is measured
  const reopen = async () => {
    const back = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => (/Timeout/i.test(String(e.message || e)) ? null : { failed: true }));
    if (back?.failed || (back && typeof back.status === 'function' && back.status() >= 400)) { lost = true; report.skipped.push('the page could not be opened again, so the rest was not measured'); return; }
    await settle();
  };
  // runs one row's measure; true when it finished on the page it started on
  const measure = async (row, fn) => {
    if (lost) { row.verdict = 'SKIP'; row.notes.push('not measured: the page could not be opened again'); return false; }
    try {
      await fn();
      if (await here()) return true;
    } catch (e) {
      if (await here()) { row.verdict = 'SKIP'; row.notes.push(`not measured: ${/null|undefined/.test(String(e.message)) ? 'it is no longer on the page after an earlier press' : String(e.message || e).split('\n')[0].slice(0, 100)}`); return false; }
    }
    row.verdict = 'NAVIGATED';
    if ('press' in row) { row.press = null; row.secondPress = null; }
    row.notes.push(`the press took the page to ${short(page.url())}, so it was not measured here: measure the page it opens`);
    await reopen();
    return false;
  };
  report.found = { controls: found.totalControls, draggables: found.totalDrags };
  if (found.totalControls > found.controls.length) report.skipped.push(`${found.totalControls - found.controls.length} more controls (raise --max-controls)`);

  /* (a) and (b): presses */
  for (const c of found.controls) {
    const row = { name: c.name, press: null, secondPress: null, verdict: 'PASS', notes: [] };
    report.controls.push(row);
    if (c.disabled) { row.verdict = 'SKIP'; row.notes.push('disabled'); continue; }
    await measure(row, async () => {
    const pos = await page.evaluate((id) => window.__lp.center(id), c.id);
    if (pos.covered) { row.verdict = 'SKIP'; row.notes.push(`covered by <${pos.coveredBy}> at its center`); return; }
    await page.mouse.move(pos.x, pos.y);
    await page.waitForTimeout(450); // let hover settle so only the press is measured
    await page.evaluate((id) => window.__lp.armPress(id), c.id);
    await page.mouse.down();
    await page.waitForTimeout(350);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const a = await page.evaluate(() => window.__lp.readPress());
    const d = a?.downs[0];
    if (!d || d.latency === null) { row.press = null; row.verdict = 'FAIL'; row.notes.push('no visible change on press or release'); }
    else {
      const upAt = a.ups[0];
      row.press = r1(d.latency);
      if (upAt !== undefined && d.at + d.latency >= upAt) { row.verdict = 'FAIL'; row.notes.push(`answers only on release (${r1(d.latency)}ms after press): give the press itself a response`); }
      else if (d.latency > PRESS_PASS) { row.verdict = 'FAIL'; row.notes.push(`${r1(d.latency)}ms to the first change (target ${PRESS_PASS}ms or less)`); }
    }
    // second press during the animation
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__lp.reset());
    if (row.press !== null) {
      await page.evaluate((id) => window.__lp.armPress(id), c.id);
      await page.mouse.down(); await page.mouse.up();
      await page.waitForTimeout(50);
      await page.mouse.down();
      await page.waitForTimeout(300);
      await page.mouse.up();
      await page.waitForTimeout(150);
      const b = await page.evaluate(() => window.__lp.readPress());
      const second = b?.downs[1];
      if (second) {
        row.secondPress = second.latency === null ? 'ignored' : 'answered';
        if (second.latency === null) { if (row.verdict === 'PASS') row.verdict = 'WARN'; row.notes.push('a second press 50ms after the first changed nothing (input swallowed; fine if it locks on purpose or opened a modal over itself)'); }
      }
    }
    await page.evaluate(() => { window.__lp.stop(); window.__lp.reset(); });
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    });
  }

  /* drags */
  for (const g of found.drags) {
    const row = { name: g.name, found: g.why, frames: 0, maxPx: null, p95Px: null, meanPx: null, verdict: 'PASS', notes: [] };
    report.drags.push(row);
    await measure(row, async () => {
    const pos = await page.evaluate((id) => window.__lp.center(id), g.id);
    if (pos.covered) { row.verdict = 'SKIP'; row.notes.push(`covered by <${pos.coveredBy}> at its center`); return; }
    const room = AXIS === 'x' ? pos.vw : pos.vh, at = AXIS === 'x' ? pos.x : pos.y;
    const dir = at + DISTANCE < room - 8 ? 1 : -1;
    await page.mouse.move(pos.x, pos.y);
    await page.waitForTimeout(200);
    await page.evaluate((id) => window.__lp.armDrag(id), g.id);
    await page.mouse.down();
    for (let i = 1; i <= STEPS; i++) {
      const o = (dir * DISTANCE * i) / STEPS;
      await page.mouse.move(pos.x + (AXIS === 'x' ? o : 0), pos.y + (AXIS === 'y' ? o : 0));
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(40);
    await page.mouse.up();
    const d = await page.evaluate(() => window.__lp.readDrag());
    await page.evaluate(() => window.__lp.stop());
    await page.waitForTimeout(300);
    if (d.native) { row.verdict = 'SKIP'; row.notes.push('native HTML5 drag: the browser draws the drag image, nothing to score'); return; }
    row.frames = d.errs.length;
    if (d.errs.length < 10) { row.verdict = 'WARN'; row.notes.push(`only ${d.errs.length} frames sampled: the element may not respond to pointer input`); }
    if (d.errs.length) {
      row.maxPx = r1(Math.max(...d.errs)); row.p95Px = r1(pct(d.errs, 0.95)); row.meanPx = r1(d.errs.reduce((s, v) => s + v, 0) / d.errs.length);
      if (row.maxPx > DRAG_FAIL) { row.verdict = 'FAIL'; row.notes.push(`drifts ${row.maxPx}px from the pointer (target ${DRAG_PASS}px or less, fail over ${DRAG_FAIL}px)`); }
      else if (row.maxPx > DRAG_PASS) { if (row.verdict === 'PASS') row.verdict = 'WARN'; row.notes.push(`drifts ${row.maxPx}px from the pointer (target ${DRAG_PASS}px or less)`); }
      if (row.maxPx > DRAG_PASS && row.meanPx !== null && Math.abs(dir * DISTANCE) > 0 && row.p95Px - row.meanPx < 1) row.notes.push('steady offset rather than lag: check the element is not axis-locked, clamped, or a different element than the one that moves');
    }
    await page.mouse.move(0, 0);
    });
  }

  /* (d) plays: each from the page as it loads, not as the presses above left it */
  const plays = flagAll('play');
  const cdp = plays.length ? await ctx.newCDPSession(page) : null;
  for (const sel of plays) {
    const row = { name: sel, selector: sel, cpu: CPU, frames: 0, longestMs: null, over16: null, over33: null, onTime: null, verdict: 'PASS', notes: [] };
    report.plays.push(row);
    if (!lost) await reopen();
    await measure(row, async () => {
      const hit = await page.evaluate((q) => window.__lp.find(q), sel);
      if (!hit || hit.bad) { row.verdict = 'SKIP'; row.notes.push(hit?.bad ? 'not a selector the browser can read' : 'nothing on the page matches'); return; }
      row.name = hit.name;
      const pos = await page.evaluate((id) => window.__lp.center(id), hit.id);
      if (pos.covered) { row.verdict = 'SKIP'; row.notes.push(`covered by <${pos.coveredBy}> at its center`); return; }
      await page.mouse.move(pos.x, pos.y);
      await page.waitForTimeout(300);
      let d;
      try {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
        await page.evaluate(() => window.__lp.armPlay());
        await page.mouse.down(); await page.mouse.up();
        await page.waitForTimeout(PLAY_MS);
        d = await page.evaluate(() => window.__lp.readPlay());
      } finally {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
      }
      await page.evaluate(() => window.__lp.stop());
      const fr = d?.frames ?? [];
      row.frames = fr.length;
      if (!fr.length) { row.verdict = 'WARN'; row.notes.push('no frame was recorded after the press'); return; }
      row.longestMs = r1(Math.max(...fr));
      row.over16 = fr.filter((v) => v > FRAME + SLACK).length;
      row.over33 = fr.filter((v) => v > LATE + SLACK).length;
      row.onTime = Math.round((1 - row.over16 / fr.length) * 1000) / 1000;
      if (row.longestMs > BROKEN + SLACK) { row.verdict = 'FAIL'; row.notes.push(`the longest frame took ${row.longestMs}ms (fail over ${BROKEN}ms): something blocks the main thread while it plays`); }
      else if (row.over33 > 0 || row.onTime < 0.95) { row.verdict = 'WARN'; row.notes.push(`${row.over16} of ${fr.length} frames ran long (target: none over ${LATE}ms, 95% within ${FRAME}ms)`); }
    });
  }
} catch (e) {
  // a probe that could not finish measured nothing anyone should trust: said in one line, exit 4, never read as a FAIL
  if (!loadFailed) crashed = String(e.message || e).split('\n')[0];
} finally {
  await browser.close();
}
if (loadFailed) { console.error(`Could not load ${url}: ${loadFailed}. Nothing was measured.`); process.exit(4); }
if (crashed) { console.error(`The probe could not finish on ${url}: ${crashed}. Nothing was measured.`); process.exit(4); }

const all = [...report.controls, ...report.drags, ...report.plays];
report.verdict = all.some((r) => r.verdict === 'FAIL') ? 'FAIL' : all.some((r) => r.verdict === 'WARN') ? 'WARN' : all.every((r) => ['SKIP', 'NAVIGATED'].includes(r.verdict)) ? 'NOTHING MEASURED' : 'PASS';
console.log(`\nAntheo latency probe: ${url} at ${WIDTH}px`);
console.log(`found ${report.found.controls} button-like controls, ${report.found.draggables} draggable things\n`);
if (report.controls.length) console.log('Controls (press -> first change, target 100ms or less)');
for (const r of report.controls) console.log(`  ${r.verdict.padEnd(4)}  ${r.name.padEnd(40)} ${r.press === null ? '   n/a' : String(r.press).padStart(6) + 'ms'}  second press: ${r.secondPress ?? 'n/a'}${r.notes.length ? '  | ' + r.notes.join('; ') : ''}`);
if (report.drags.length) console.log('\nDrags (pointer to element distance per frame, target 0-2px, fail over 8px)');
for (const r of report.drags) console.log(`  ${r.verdict.padEnd(4)}  ${r.name.padEnd(40)} ${r.maxPx === null ? '   n/a' : `max ${r.maxPx}px, p95 ${r.p95Px}px, mean ${r.meanPx}px over ${r.frames} frames`}  [${r.found}]${r.notes.length ? '  | ' + r.notes.join('; ') : ''}`);
if (report.plays.length) console.log(`\nPlays (frame lengths for ${PLAY_MS / 1000}s after the press${CPU > 1 ? `, CPU slowed ${CPU} times` : ''}; target: none over ${LATE}ms, 95% within ${FRAME}ms)`);
for (const r of report.plays) console.log(`  ${r.verdict.padEnd(4)}  ${r.name.padEnd(40)} ${r.longestMs === null ? '   n/a' : `longest ${r.longestMs}ms, ${r.over16} over ${FRAME}ms, ${r.over33} over ${LATE}ms, ${Math.round(r.onTime * 100)}% on time over ${r.frames} frames`}${r.notes.length ? '  | ' + r.notes.join('; ') : ''}`);
for (const s of report.skipped) console.log(`\nnote: ${s}`);
if (!report.drags.length && !report.plays.length) console.log('\nNo draggable things found. If the page has drags, pass --drag <selector>.');
// what the presses tried to send: a list beside the rows, never a verdict
report.allowWrites = allowWrites;
report.heldBack = allowWrites ? [] : [...writes.values()];
if (allowWrites) report.sentWrites = [...writes.values()];
if (writes.size) {
  // method and a short path (the page's own origin left off), each once, eight at most
  const origin = (() => { try { return new URL(url).origin; } catch { return ''; } })();
  const names = [...writes.values()].map((w) => `${w.method} ${(w.url.startsWith(origin + '/') ? w.url.slice(origin.length) : w.url).slice(0, 60)}${w.count > 1 ? ` (${w.count} times)` : ''}`);
  const list = names.slice(0, 8).join(', ') + (names.length > 8 ? `, and ${names.length - 8} more (see --json)` : '');
  console.log(allowWrites
    ? `\nwrites: --allow-writes was on, so the presses really sent ${list}.`
    : `\nwrites: held back ${list}. Nothing was sent; each press was measured all the same. --allow-writes lets them through (only on a page whose data you can lose).`);
}
console.log(`\nVerdict: ${report.verdict}`);
// a play passes or it does not: a warning, a failure or a play that was never measured is not a pass, and the exit
// code says so (a press or a drag that only warns still exits 0)
const playsOpen = report.plays.filter((r) => r.verdict !== 'PASS');
report.playsPass = report.plays.length ? playsOpen.length === 0 : null;
if (playsOpen.length && report.verdict !== 'FAIL') console.log(`${playsOpen.length} of ${report.plays.length} play${report.plays.length === 1 ? '' : 's'} did not pass (${playsOpen.map((r) => r.verdict).join(', ')}): a play passes only with no frame over ${LATE}ms and 95% within ${FRAME}ms, so this exits 1.`);
const json = flag('json');
if (json) writeFileSync(json, JSON.stringify(report, null, 2));
process.exit(report.verdict === 'FAIL' || playsOpen.length ? 1 : 0);

// Chrome, then Edge, then Playwright's own Chromium; one clear line if none is installed. (The same function is in every
// Antheo tool that opens a browser; tests/self-test.mjs keeps the copies identical.)
async function launchBrowser(chromium) {
  for (const options of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { return await chromium.launch(options); } catch { /* try the next one */ }
  }
  console.error('No browser found. Install Chrome or Edge, or run: npx playwright install chromium');
  process.exit(2);
}
