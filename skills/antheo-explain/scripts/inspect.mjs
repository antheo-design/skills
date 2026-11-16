#!/usr/bin/env node
/**
 * inspect.mjs: open a page in a real browser and report how one element is built, layer by layer, so an
 * explanation rests on measurements instead of guesses.
 *
 *   node inspect.mjs http://localhost:3000 ".pricing-card"
 *   node inspect.mjs ./page.html "#hero" --width 390 --dark
 *   node inspect.mjs <url> "<selector>" --json layers.json
 *
 * For the element, its pseudo-elements, its children (first level) and its ancestors up to the first stacking
 * context it sits in, it reports: box, the computed properties that make a look (layout, position and layering,
 * fill, edge and shadow, filters, blend, masks, type), running animations with their keyframes and timing, and media
 * (canvas, svg, video, img, background images). Values marked "measured" were read from the browser.
 *
 * Needs Playwright (npm i -D playwright, then npx playwright install chromium) or an installed Chrome.
 * Closes the browser when done, always.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--json', '--width'];
const pos = argv.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const [target, selector] = pos;
const flag = (name) => { const i = argv.indexOf(`--${name}`); return i < 0 ? undefined : argv[i + 1] ?? true; };
if (!target || !selector) {
  console.error('usage: node inspect.mjs <url or html file> "<css selector>" [--width 1280] [--dark] [--json out.json]');
  process.exit(2);
}
const width = Number(flag('width')) || 1280;
const dark = argv.includes('--dark');
// a local file may carry a query or hash (page.html?state=error): keep it out of the path
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
  console.error('Playwright is not installed here. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

/* runs inside the page */
function read(selector) {
  const el = document.querySelector(selector);
  if (!el) return { error: `no element matches ${selector}` };
  const PROPS = ['display', 'position', 'inset', 'z-index', 'isolation', 'overflow', 'contain', 'container-type',
    'grid-template-columns', 'grid-template-rows', 'flex-direction', 'gap', 'padding', 'margin', 'width', 'height', 'aspect-ratio',
    'transform', 'translate', 'scale', 'rotate', 'perspective', 'transform-style', 'opacity', 'filter', 'backdrop-filter',
    'mix-blend-mode', 'background-blend-mode', 'mask-image', 'clip-path', 'background-color', 'background-image',
    'background-size', 'border', 'border-radius', 'outline', 'box-shadow', 'color', 'font-family', 'font-size',
    'font-weight', 'line-height', 'letter-spacing', 'font-feature-settings', 'font-variant-numeric', 'text-wrap',
    'text-shadow', '-webkit-text-stroke', 'transition', 'animation', 'will-change', 'view-transition-name'];
  const DEFAULTS = new Set(['none', 'auto', 'normal', '0px', 'static', 'visible', 'rgba(0, 0, 0, 0)', 'match-parent', '0s', 'all 0s ease 0s', 'none 0s ease 0s 1 normal none running', '1', 'start', 'row', 'stretch', '0px none rgb(0, 0, 0)']);
  const name = (n) => { const id = n.id ? `#${n.id}` : ''; const cls = typeof n.className === 'string' && n.className.trim() ? `.${n.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''; return `${n.tagName.toLowerCase()}${id}${cls}`; };
  const NOISE = (p, v) => (/^(border|outline|-webkit-text-stroke)$/.test(p) && (/^0px\b/.test(v) || /\bnone\b/.test(v)))
    || (p === 'transform-style' && v === 'flat') || (p === 'transition' && /^all( 0s)?/.test(v) && !/[1-9]/.test(v))
    || (p === 'text-wrap' && v === 'wrap');
  const INHERITED = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-feature-settings', 'font-variant-numeric', 'text-wrap'];
  const style = (n, pseudo) => {
    const s = getComputedStyle(n, pseudo); const out = {};
    const up = !pseudo && n.parentElement ? getComputedStyle(n.parentElement) : null;
    for (const p of PROPS) {
      const v = s.getPropertyValue(p).trim();
      if (!v || DEFAULTS.has(v) || NOISE(p, v)) continue;
      if (up && INHERITED.includes(p) && up.getPropertyValue(p).trim() === v) continue;   // same as its parent: inherited, not set here
      out[p] = v;
    }
    if (pseudo) { const c = s.getPropertyValue('content'); if (!c || c === 'none' || c === 'normal') return null; out.content = c; }
    return out;
  };
  const stacking = (n) => { const s = getComputedStyle(n); const why = [];
    if (s.position !== 'static' && s.zIndex !== 'auto') why.push(`position + z-index ${s.zIndex}`);
    if (+s.opacity < 1) why.push(`opacity ${s.opacity}`);
    if (s.transform !== 'none' || s.translate !== 'none' || s.scale !== 'none' || s.rotate !== 'none') why.push('transform');
    if (s.filter !== 'none') why.push('filter'); if (s.backdropFilter && s.backdropFilter !== 'none') why.push('backdrop-filter');
    if (s.isolation === 'isolate') why.push('isolation'); if (s.mixBlendMode !== 'normal') why.push(`mix-blend-mode ${s.mixBlendMode}`);
    if (s.maskImage && s.maskImage !== 'none') why.push('mask'); if (s.clipPath !== 'none') why.push('clip-path');
    if (s.position === 'fixed' || s.position === 'sticky') why.push(s.position);
    if (/paint|layout|strict|content/.test(s.contain)) why.push(`contain ${s.contain}`);
    return why; };
  const box = (n) => { const r = n.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const anims = (n) => n.getAnimations({ subtree: true }).slice(0, 12).map((a) => {
    const e = a.effect; const t = e?.getComputedTiming?.() ?? {};
    return { target: e?.target ? name(e.target) + (e.pseudoElement ?? '') : '?', kind: a.constructor.name, name: a.animationName ?? a.transitionProperty ?? a.id ?? '',
      duration: t.duration, delay: t.delay, easing: e?.getTiming?.().easing, iterations: t.iterations,
      keyframes: (e?.getKeyframes?.() ?? []).slice(0, 6).map((k) => { const { offset, easing, composite, computedOffset, ...rest } = k; return { offset: computedOffset ?? offset, ...rest }; }) };
  });
  const media = [...el.querySelectorAll('canvas, svg, video, img, picture, iframe')].slice(0, 12).map((m) => ({ tag: m.tagName.toLowerCase(), box: box(m), src: (m.currentSrc || m.getAttribute('src') || '').slice(0, 80) }));
  const ancestors = []; let p = el.parentElement;
  while (p && p !== document.documentElement) { const why = stacking(p); ancestors.push({ el: name(p), box: box(p), stacking: why, style: style(p) }); if (why.length) break; p = p.parentElement; }
  return {
    element: { el: name(el), box: box(el), stacking: stacking(el), style: style(el), before: style(el, '::before'), after: style(el, '::after') },
    children: [...el.children].slice(0, 12).map((c) => ({ el: name(c), box: box(c), stacking: stacking(c), style: style(c), before: style(c, '::before'), after: style(c, '::after') })),
    ancestors, animations: anims(el), media,
    page: { width: innerWidth, dpr: devicePixelRatio, scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' },
  };
}

const chromium = await loadChromium();
let browser;
browser = await launchBrowser(chromium);
try {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: dark ? 'dark' : 'light', deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.goto(url, { waitUntil: 'load' }));
  await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {});   // pages that render after hydration
  await page.waitForTimeout(400);
  const out = await page.evaluate(read, selector);
  if (out.error) { console.error(out.error); process.exitCode = 1; }
  else {
    const line = (label, n) => {
      console.log(`${label}${n.el}  ${n.box.w}×${n.box.h} at ${n.box.x},${n.box.y}${n.stacking?.length ? `  [stacking: ${n.stacking.join(', ')}]` : ''}`);
      for (const [k, v] of Object.entries(n.style ?? {})) console.log(`    ${k}: ${v}`);
      for (const ps of ['before', 'after']) if (n[ps]) { console.log(`    ::${ps}`); for (const [k, v] of Object.entries(n[ps])) console.log(`        ${k}: ${v}`); }
    };
    console.log(`Measured at ${out.page.width}px, ${out.page.scheme}, ${out.page.dpr}x\n`);
    line('ELEMENT  ', out.element);
    out.children.forEach((c) => line('  child  ', c));
    out.ancestors.forEach((a) => line('  parent ', a));
    if (out.animations.length) { console.log('\nRUNNING ANIMATIONS'); for (const a of out.animations) console.log(`  ${a.target}  ${a.kind} ${a.name}  ${a.duration}ms  delay ${a.delay}  ${a.easing}  ×${a.iterations}  ${JSON.stringify(a.keyframes)}`); }
    if (out.media.length) { console.log('\nMEDIA'); for (const m of out.media) console.log(`  ${m.tag} ${m.box.w}×${m.box.h} ${m.src}`); }
    if (flag('json')) writeFileSync(String(flag('json')), JSON.stringify(out, null, 2));
  }
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
