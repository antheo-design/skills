#!/usr/bin/env node
/**
 * inspect.mjs: open a page in a real browser and report how one element is built, layer by layer, so an
 * explanation rests on measurements instead of guesses.
 *
 *   node inspect.mjs http://localhost:3000 ".pricing-card"
 *   node inspect.mjs ./page.html "#hero" --width 390 --dark
 *   node inspect.mjs <url> "<selector>" --json layers.json
 *   node inspect.mjs --site <home url> <list url> <detail url> <form url>     (whole-site mode: no selector)
 *
 * For the element, its pseudo-elements, its children (first level) and its ancestors up to the first stacking
 * context it sits in, it reports: box, the computed properties that make a look (layout, position and layering,
 * fill, edge and shadow, filters, blend, masks, type), running animations with their keyframes and timing, and media
 * (canvas, svg, video, img, background images). Values marked "measured" were read from the browser. Children,
 * animations and media are listed up to 12, keyframes up to 6; a list that was cut says so ("12 of 31 shown").
 *
 * With --site every argument is a page. Each is opened at the same width and theme, and the script counts the values
 * its visible elements use at rest: type faces, sizes and weights, text, fill and edge colours, gaps, padding, corner
 * radii, shadows, the motion declared in CSS, the widths of centred blocks, and the controls by height, corner and
 * type. It prints each value with its count and the number of pages it was found on, most widely shared first, and
 * says per page what it did not look into (iframes, shadow roots, canvases). Exit 1 when no page could be read.
 *
 * Needs playwright-core (npm i -D playwright-core) and Chrome or Edge, or npx playwright install chromium.
 * Closes the browser when done, always.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--json', '--width'];
const pos = argv.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const site = argv.includes('--site');
const [target, selector] = pos;
const flag = (name) => { const i = argv.indexOf(`--${name}`); return i < 0 ? undefined : argv[i + 1] ?? true; };
if (site ? !pos.length : !target || !selector) {
  console.error('usage: node inspect.mjs <url or html file> "<css selector>" [--width 1280] [--dark] [--json out.json]');
  console.error('       node inspect.mjs --site <url or html file> [<more pages> ...] [--width 1280] [--dark] [--json out.json]');
  process.exit(2);
}
const width = Number(flag('width')) || 1280;
const dark = argv.includes('--dark');
// a local file may carry a query or hash (page.html?state=error): keep it out of the path
const toUrl = (t) => { if (/^https?:|^file:/.test(t)) return t; const [, filePart, tail = ''] = t.match(/^([^?#]*)(.*)$/); return pathToFileURL(resolve(filePart)).href + tail; };
const url = toUrl(target);

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
  // lists are cut at CAP (keyframes at FRAMES); `totals` and `keyframeCount` hold the real counts so the report can say so
  const CAP = 12, FRAMES = 6;
  const allAnims = el.getAnimations({ subtree: true });
  const anims = allAnims.slice(0, CAP).map((a) => {
    const e = a.effect; const t = e?.getComputedTiming?.() ?? {}; const frames = e?.getKeyframes?.() ?? [];
    return { target: e?.target ? name(e.target) + (e.pseudoElement ?? '') : '?', kind: a.constructor.name, name: a.animationName ?? a.transitionProperty ?? a.id ?? '',
      duration: t.duration, delay: t.delay, easing: e?.getTiming?.().easing, iterations: t.iterations, keyframeCount: frames.length,
      keyframes: frames.slice(0, FRAMES).map((k) => { const { offset, easing, composite, computedOffset, ...rest } = k; return { offset: computedOffset ?? offset, ...rest }; }) };
  });
  const allMedia = [...el.querySelectorAll('canvas, svg, video, img, picture, iframe')];
  const media = allMedia.slice(0, CAP).map((m) => ({ tag: m.tagName.toLowerCase(), box: box(m), src: (m.currentSrc || m.getAttribute('src') || '').slice(0, 80) }));
  const ancestors = []; let p = el.parentElement;
  while (p && p !== document.documentElement) { const why = stacking(p); ancestors.push({ el: name(p), box: box(p), stacking: why, style: style(p) }); if (why.length) break; p = p.parentElement; }
  return {
    element: { el: name(el), box: box(el), stacking: stacking(el), style: style(el), before: style(el, '::before'), after: style(el, '::after') },
    children: [...el.children].slice(0, CAP).map((c) => ({ el: name(c), box: box(c), stacking: stacking(c), style: style(c), before: style(c, '::before'), after: style(c, '::after') })),
    ancestors, animations: anims, media, totals: { children: el.children.length, animations: allAnims.length, media: allMedia.length },
    page: { width: innerWidth, dpr: devicePixelRatio, scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' },
  };
}

/* runs inside the page (--site): the values the whole page uses at rest, counted per element */
function survey() {
  const KEYS = ['faces', 'sizes', 'weights', 'text', 'fill', 'edge', 'gaps', 'pads', 'corners', 'shadows', 'motion', 'widths', 'controls'];
  const tally = Object.fromEntries(KEYS.map((k) => [k, new Map()]));
  const add = (k, v) => tally[k].set(v, (tally[k].get(v) ?? 0) + 1);
  const px = (v) => `${Math.round(parseFloat(v) * 100) / 100}px`;
  const clear = (c) => c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c);
  const list = (v) => v.split(/,\s*(?![^(]*\))/);
  const LIMIT = 6000, vw = document.documentElement.clientWidth, inside = new WeakSet();
  const all = [...document.querySelectorAll('body *')].filter((e) => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(e.tagName) && e.getClientRects().length);
  for (const el of all.slice(0, LIMIT)) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      add('faces', s.fontFamily.split(',')[0].trim().replace(/["']/g, ''));
      add('sizes', `${px(s.fontSize)}, line ${s.lineHeight === 'normal' ? 'normal' : (parseFloat(s.lineHeight) / parseFloat(s.fontSize)).toFixed(2)}`);
      add('weights', s.fontWeight); add('text', s.color);
    }
    const filled = !clear(s.backgroundColor), gradient = /gradient\(/.test(s.backgroundImage);
    if (filled) add('fill', s.backgroundColor);
    if (gradient) add('fill', 'a gradient (read it with a selector)');
    const side = ['Top', 'Right', 'Bottom', 'Left'].find((d) => parseFloat(s[`border${d}Width`]) > 0 && s[`border${d}Style`] !== 'none' && !clear(s[`border${d}Color`]));
    if (side) add('edge', `${px(s[`border${side}Width`])} ${s[`border${side}Color`]}`);
    if (/flex|grid/.test(s.display)) for (const g of new Set([s.rowGap, s.columnGap])) if (parseFloat(g) > 0) add('gaps', px(g));
    for (const p of new Set([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft])) if (parseFloat(p) > 0) add('pads', px(p));
    const painted = filled || gradient || side || s.boxShadow !== 'none' || s.overflow !== 'visible' || /^(IMG|VIDEO|CANVAS)$/.test(el.tagName);
    if (painted && parseFloat(s.borderTopLeftRadius) > 0) add('corners', s.borderTopLeftRadius);
    if (s.boxShadow !== 'none') add('shadows', s.boxShadow);
    const eases = list(s.transitionTimingFunction);
    for (const m of new Set(list(s.transitionDuration).map((d, i) => (parseFloat(d) > 0 ? `transition ${d} ${eases[i % eases.length]}` : '')))) if (m) add('motion', m);
    if (s.animationName !== 'none') add('motion', `animation ${s.animationName} ${s.animationDuration} ${s.animationTimingFunction}`);
    // the outermost centred block narrower than the page; what sits inside one is not counted again
    if (inside.has(el.parentElement)) inside.add(el);
    else if (s.display !== 'inline' && r.width >= 320 && r.width < vw - 1 && Math.abs(r.left - (vw - r.right)) <= 1) {
      inside.add(el); add('widths', `${Math.round(r.width)}px${s.maxWidth !== 'none' ? ` (max-width ${s.maxWidth})` : ''}`);
    }
    if (el.matches('button, [role=button], input:not([type=hidden]), select, textarea'))
      add('controls', `${el.tagName.toLowerCase()}${el.tagName === 'INPUT' ? `[${el.type}]` : ''} ${Math.round(r.height)}px tall, corner ${s.borderTopLeftRadius}, ${px(s.fontSize)}/${s.fontWeight}`);
  }
  return {
    title: document.title, elements: Math.min(all.length, LIMIT), total: all.length, capped: all.length > LIMIT,
    fontsLoaded: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/["']/g, '')} ${f.weight}`))],
    unread: { iframes: document.querySelectorAll('iframe').length, 'shadow roots': all.filter((e) => e.shadowRoot).length, canvases: document.querySelectorAll('canvas').length },
    running: document.getAnimations().length,
    values: Object.fromEntries(KEYS.map((k) => [k, [...tally[k].entries()].sort((a, b) => b[1] - a[1])])),
  };
}

const chromium = await loadChromium();
let browser;
browser = await launchBrowser(chromium);
try {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: dark ? 'dark' : 'light', deviceScaleFactor: 2 });
  const open = (to) => page.goto(to, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.goto(to, { waitUntil: 'load' }));
  await (site ? surveySite(page, open) : inspectOne(page, open));
} finally {
  await browser.close();
}

// one element: its layers, computed styles, running animations and media
async function inspectOne(page, open) {
  await open(url);
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
    // a list cut at its cap says so: "12 of 31 shown"
    const cut = (shown, total, what = '') => (total > shown ? `${shown} of ${total} ${what}shown` : '');
    out.children.forEach((c) => line('  child  ', c));
    if (cut(out.children.length, out.totals.children)) console.log(`  child  … ${cut(out.children.length, out.totals.children, 'children ')}`);
    out.ancestors.forEach((a) => line('  parent ', a));
    const head = (label, shown, total) => console.log(`\n${label}${cut(shown, total) ? ` (${cut(shown, total)})` : ''}`);
    if (out.animations.length) {
      head('RUNNING ANIMATIONS', out.animations.length, out.totals.animations);
      for (const a of out.animations) console.log(`  ${a.target}  ${a.kind} ${a.name}  ${a.duration}ms  delay ${a.delay}  ${a.easing}  ×${a.iterations}  ${JSON.stringify(a.keyframes)}${cut(a.keyframes.length, a.keyframeCount) ? `  (${cut(a.keyframes.length, a.keyframeCount, 'keyframes ')})` : ''}`);
    }
    if (out.media.length) { head('MEDIA', out.media.length, out.totals.media); for (const m of out.media) console.log(`  ${m.tag} ${m.box.w}×${m.box.h} ${m.src}`); }
    if (flag('json')) writeFileSync(String(flag('json')), JSON.stringify(out, null, 2));
  }
}

// --site: survey every page given, then print each value with its count and how many pages use it
async function surveySite(page, open) {
  const LABELS = { faces: 'TYPE FACES (the first family named: confirm it against the fonts loaded)', sizes: 'TYPE SIZES and line heights', weights: 'WEIGHTS',
    text: 'TEXT COLOURS', fill: 'FILL COLOURS', edge: 'EDGES (width and colour)', gaps: 'GAPS', pads: 'PADDING', corners: 'CORNER RADII', shadows: 'SHADOWS',
    motion: 'MOTION declared in CSS', widths: 'WIDTHS of the outermost centred blocks', controls: 'CONTROLS (height, corner, type size/weight)' };
  const pages = [];
  for (const t of pos) {
    const to = toUrl(t);
    try {
      const res = await open(to);
      if (res && res.status() >= 400) throw new Error(`HTTP ${res.status()}`);
      await page.waitForTimeout(400);
      pages.push({ url: to, ...(await page.evaluate(survey)) });
    } catch (e) { console.error(`not read: ${to} (${String(e.message || e).split('\n')[0]})`); }
  }
  if (!pages.length) { console.error('No page could be read.'); process.exitCode = 1; return; }
  console.log(`Measured at rest at ${width}px, ${dark ? 'dark' : 'light'}, on ${pages.length} of ${pos.length} pages. Hover, scroll and script-set values are not in these counts.\n`);
  for (const p of pages) {
    const skipped = Object.entries(p.unread).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ');
    console.log(`PAGE  ${p.url}  "${p.title}"  ${p.capped ? `${p.elements} of ${p.total} elements counted` : `${p.elements} elements`},${p.running} running animations`);
    console.log(`    fonts loaded: ${p.fontsLoaded.join(', ') || 'none (system faces only)'}${skipped ? `\n    not looked into: ${skipped}` : ''}`);
  }
  const shared = {};
  for (const key of Object.keys(LABELS)) {
    const merged = new Map();
    for (const p of pages) for (const [value, count] of p.values[key]) { const m = merged.get(value) ?? { value, count: 0, pages: 0 }; m.count += count; m.pages++; merged.set(value, m); }
    shared[key] = [...merged.values()].sort((a, b) => b.pages - a.pages || b.count - a.count);
    if (!shared[key].length) continue;
    console.log(`\n${LABELS[key]}: ${shared[key].length} distinct`);
    for (const m of shared[key].slice(0, 10)) console.log(`  ${String(m.count).padStart(5)}×  on ${m.pages}/${pages.length} pages  ${m.value}`);
    if (shared[key].length > 10) console.log(`         … and ${shared[key].length - 10} more (--json has them all)`);
  }
  if (flag('json')) writeFileSync(String(flag('json')), JSON.stringify({ width, scheme: dark ? 'dark' : 'light', pages, shared }, null, 2));
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
