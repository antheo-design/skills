#!/usr/bin/env node
/*
 * Antheo page check: opens a page in a real browser and measures what a person would hit. Every finding names the
 * element and the fix. Nothing here is taste; each rule is a threshold from WCAG 2.2 or a count anyone can repeat.
 *
 *   node check-page.mjs http://localhost:3000/settings
 *   node check-page.mjs ./landing.html --json report.json
 *   node check-page.mjs <url> --widths 390,1280 --no-dark
 *
 * Needs playwright-core (npm i -D playwright-core) and Chrome or Edge, or npx playwright install chromium
 * (it tries channel "chrome" first). Closes the browser when done, always.
 *
 *   node check-page.mjs <url> --stress      (also: the page rewritten as a long translation, with very long words and
 *                                          right-to-left, at the phone and the main width, and one pass in forced
 *                                          colours; reports what breaks or disappears only then)
 *   node check-page.mjs <url> --kind page   (or app: forces the marketing-page character checks on or off; app and
 *                                          component pages also get the costume checks of the product look; anything
 *                                          inside [data-object], a drawn object such as a bank card or a dial, is
 *                                          exempt from them, and still measured for contrast and everything else)
 *
 * Scores 0 to 100 per area and overall (higher is better):
 *   access 25 · layout 15 · craft 30 · consistency 10 · motion 10 · robustness 10
 * A blocker (a broken value on screen, a failed image) caps the overall score at 49.
 * Fields: a text field, textarea or select whose edge and fill are both under 3:1 against what is beside them is a
 * high finding (WCAG 1.4.11), in light and in dark. A line on one side is enough: a border, an outline, or a
 * box-shadow layer with no blur.
 * Charts (an element marked data-chart): one with no name a screen reader can say and no table beside it is a high
 * finding; two series drawn in hues of the same lightness with nothing else to tell them apart is a medium one.
 * Load measures, on a first visit at the main width: Largest Contentful Paint and Cumulative Layout Shift, in the
 * JSON as vitals { lcp (ms), cls, lcpElement }. A shift over 0.1 is a finding that names what moved; an LCP over 2.5s
 * is a low one, since a local number is only a floor. Press latency (INP) is latency-probe.mjs's job.
 * "character" counts the measurable signs of the template look; it cannot see taste, so a page can pass it and still
 * be forgettable.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--json', '--widths', '--kind', '--shots', '--preset'];
const STRESS = argv.includes('--stress');
// the first argument that isn't a flag or a flag's value (a page named 2fa.html is a page, not a number)
const target = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const flag = (name) => { const i = argv.indexOf(`--${name}`); return i < 0 ? undefined : argv[i + 1] ?? true; };
if (!target) {
  console.error('usage: node check-page.mjs <url or html file> [--widths 320,390,768,1024,1280,1440,1920] [--kind page|app] [--preset quiet|none] [--shots folder] [--stress] [--json out.json] [--quiet]');
  process.exit(2);
}
const kind = ['page', 'app'].includes(flag('kind')) ? flag('kind') : 'auto';
const widths = String(flag('widths') ?? '320,390,768,1024,1280,1440,1920').split(',').map(Number).filter(Boolean);
if (!widths.length) { console.error(`--widths needs numbers, like 390,1280 (got "${flag('widths')}")`); process.exit(2); }
// --preset quiet (the default) also judges the Antheo Quiet look: outlined cards, many colours, weights, sizes and
// corners, costume tells. --preset none is for a project with its own design system or a requested direction: only
// what is wrong in any style is judged (contrast, overflow, focus, names, targets, broken text, alignment, states).
const preset = flag('preset') === 'none' ? 'none' : 'quiet';
const QUIET_ONLY = /^(cards with a visible outline|colour on too many things|corners up to|\d+ corner sizes|\d+ font weights|\d+ text sizes on one screen|\d+ different text colors|bands of different backgrounds|the header is off the content edge|tilted elements at rest)/;
const shots = typeof flag('shots') === 'string' ? resolve(flag('shots')) : null;
// a local file may carry a query or hash (page.html?state=error): keep it out of the path
const [, filePart, tail = ''] = /^https?:|^file:/.test(target) ? [null, target] : target.match(/^([^?#]*)(.*)$/);
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(filePart)).href + tail;
// exit 4 means the page couldn't be checked at all (no file, no server, an error status): nothing was measured
if (!/^https?:|^file:/.test(target) && !existsSync(resolve(filePart))) { console.error(`No such file: ${resolve(filePart)}`); process.exit(4); }
let loadFailed = null;

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

/* ── what runs inside the page ───────────────────────────────────────────────────────────────────────────────── */
function measure(kind) {
  const vw = innerWidth;
  const srOnly = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const c = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      if (/inset\(50%|circle\(0/.test(c.clipPath) || (c.clip && c.clip !== 'auto' && /rect\(0/.test(c.clip))) return true;
      if (r.width <= 1 && r.height <= 1 && c.overflow !== 'visible') return true;
    }
    return false;
  };
  const out = { overflow: [], contrast: [], unmeasured: [], onImage: [], targets: [], unnamed: [], unlabeled: [], alt: [], headings: [], placeholderLabels: [] };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const sel = (el) => { const id = el.id ? `#${el.id}` : ''; const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''; const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30); return `${el.tagName.toLowerCase()}${id}${cls}${t ? ` "${t}"` : ''}`; };
  // any CSS colour to sRGB 0-255: rgb() directly; oklch(), lab(), color(display-p3 …), hsl() and names through the
  // browser's own canvas, so nothing is guessed. Chrome keeps OKLCH as OKLCH in computed styles, and the style block is
  // OKLCH, so an rgb-only reader would skip every text on an Antheo page. null means "couldn't read it", which is
  // reported, never treated as a pass.
  const parse = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    const cache = new Map();
    return (c) => {
      if (!c) return null;
      if (cache.has(c)) return cache.get(c);
      let v = null;
      const m = c.match(/^rgba?\(([^)]+)\)$/);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); v = { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }
      else if (c === 'transparent') v = { r: 0, g: 0, b: 0, a: 0 };
      else if (cx) {
        cx.fillStyle = '#010203'; cx.fillStyle = c;
        if (cx.fillStyle !== '#010203' || /^#010203$/i.test(c)) {
          cx.clearRect(0, 0, 1, 1); cx.fillRect(0, 0, 1, 1);
          const d = cx.getImageData(0, 0, 1, 1).data;
          const alpha = c.match(/\/\s*([\d.]+%?)\s*\)$/);
          v = { r: d[0], g: d[1], b: d[2], a: alpha ? (alpha[1].endsWith('%') ? parseFloat(alpha[1]) / 100 : +alpha[1]) : d[3] / 255 };
        }
      }
      cache.set(c, v);
      return v;
    };
  })();
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  // the colour behind an element: the first opaque background up the tree; null when an image or gradient is in the way
  const behind = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('url("data:image/svg')) return null;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (root && root.a > 0.99) bg = root;
    for (const l of layers.reverse()) bg = blend(l, bg);
    return bg;
  };

  // overflow: anything wider than the window
  if (document.documentElement.scrollWidth > vw + 1)
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed' && !el.closest('[data-scroll], [style*="overflow"]')) {
        const parentOver = el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1;
        if (!parentOver || out.overflow.length < 3) out.overflow.push(`${sel(el)} reaches ${Math.round(r.right)}px`);
        if (out.overflow.length > 6) break;
      }
    }

  // text: contrast, sizes, families, colors, line length
  const sizes = {}, families = {}, weights = {}, colors = {}, radii = {}, spacing = { on: 0, off: 0 }, offSamples = [];
  // a size only figures wear (1,284 · $12.40 · 98.6% · 12:45 · 4.2k) is the one numeral size a data screen may add
  const wordSizes = {};
  const figure = (t) => /\d/.test(t) && /^[\d\s.,:;'’/+\-−–()%‰\p{Sc}]+$/u.test(t.replace(/(?<=\d)\s?(?:[kKmMbB]|bn)(?!\p{L})/gu, ''));
  // a dialog or a sheet may round up to 16px (the style block's phone sheet has 14px top corners): boxRadii holds the
  // corners of everything else
  const boxRadii = {};
  let longLines = [], smallBody = [], tightLeading = [], chars = 0, smallChars = 0;
  const canvas = document.createElement('canvas').getContext('2d');
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (s.borderRadius && s.borderRadius !== '0px') {
      // the largest of the four corners: a side sheet rounded "0 14px 14px 0" is a 14px corner, not 0
      const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) => s[`border${c}Radius`].split(' ')[0]);
      const r0 = corners.find((c) => c.includes('%')) ?? corners.reduce((a, b) => (parseFloat(b) > parseFloat(a) ? b : a));
      radii[r0] = (radii[r0] || 0) + 1;
      if (!(el.matches('dialog, [role=dialog], [role=alertdialog]') && !r0.includes('%') && parseFloat(r0) <= 16)) boxRadii[r0] = 1;
    }
    for (const p of ['paddingTop', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) {
      const v = parseFloat(s[p]);
      if (v > 2 && v < 200) { if (v % 4 === 0 || v % 4 === 2 && v < 16) spacing.on++; else { spacing.off++; if (offSamples.length < 5) offSamples.push(`${p} ${v}px on ${sel(el)}`); } }
    }
    // text for screen readers only (clipped to nothing or a 1px box) is never seen: no size, no contrast to judge
    if (!own || srOnly(el)) continue;
    const px = parseFloat(s.fontSize);
    sizes[px] = (sizes[px] || 0) + 1;
    if (!figure([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim())) wordSizes[px] = 1;
    const len = [...el.childNodes].filter((n) => n.nodeType === 3).reduce((n, t) => n + t.textContent.trim().length, 0);
    chars += len;
    if (px < 12) smallChars += len;
    families[s.fontFamily.split(',')[0].replace(/["']/g, '').trim()] = 1;
    weights[s.fontWeight] = 1;
    colors[s.color] = (colors[s.color] || 0) + 1;
    const fg = parse(s.color);
    const bg = behind(el);
    if (!fg && out.unmeasured.length < 8) out.unmeasured.push(`${sel(el)} (color: ${s.color})`);
    if (fg && !bg && out.onImage.length < 6) out.onImage.push(sel(el)); // no single colour behind it: said, not skipped
    if (fg && bg && fg.a > 0.05) {
      const c = blend(fg, bg);
      const [hi, lo] = [lum(c), lum(bg)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      const large = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
      const min = large ? 3 : 4.5;
      const disabled = el.closest('[disabled], [aria-disabled="true"]');
      if (ratio < min && !disabled && out.contrast.length < 12) out.contrast.push(`${sel(el)} ${ratio.toFixed(2)}:1 (needs ${min}:1): darken the text or lighten its background`);
    }
    if (['P', 'LI', 'DD', 'BLOCKQUOTE'].includes(el.tagName) && el.innerText.length > 120) {
      canvas.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const avg = canvas.measureText('the quick brown fox jumps over a lazy dog ').width / 42;
      const chars = el.getBoundingClientRect().width / avg;
      if (chars > 90) longLines.push(`${sel(el)} ~${Math.round(chars)} characters per line`);
      if (px < 13) smallBody.push(`${sel(el)} ${px}px`);
      const lh = s.lineHeight === 'normal' ? 1.2 : parseFloat(s.lineHeight) / px;
      if (lh < 1.3) tightLeading.push(`${sel(el)} line-height ${lh.toFixed(2)}`);
    }
  }

  // controls: names, sizes, labels
  const inText = (el) => el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement && /^(P|LI|SPAN|TD|DD|SMALL|LABEL)$/.test(el.parentElement.tagName);
  // a control that isn't rendered (inside a closed <details>, display: none) is not on the page: judged when it shows
  const rendered = (el) => !(el.closest('details:not([open])') && !el.closest('summary')) && (typeof el.checkVisibility !== 'function' || el.checkVisibility({ visibilityProperty: true }));
  const controls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox], [role=menuitem], [tabindex]:not([tabindex="-1"])')].filter((el) => visible(el) && rendered(el));
  // aria-labelledby may list several ids; each one's text is part of the name
  const labelledBy = (el) => (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent || '').join(' ');
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    const name = (el.getAttribute('aria-label') || labelledBy(el) || el.innerText || el.textContent || el.getAttribute('title') || el.value || el.getAttribute('alt') || el.querySelector('img[alt], svg title')?.textContent || el.querySelector('img')?.alt || '').trim();
    const isField = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    if (isField) {
      const labelled = el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label');
      if (!labelled && !['submit', 'button', 'reset', 'checkbox', 'radio', 'range', 'color'].includes(el.type)) {
        (el.placeholder ? out.placeholderLabels : out.unlabeled).push(`${sel(el)}${el.placeholder ? ` placeholder "${el.placeholder.slice(0, 30)}"` : ''}: give it a visible <label for>`);
      }
    } else if (!name) out.unnamed.push(`${sel(el)}: add text or aria-label`);
    const small = r.width < 24 || r.height < 24;
    if (small && !inText(el) && !(isField && ['checkbox', 'radio'].includes(el.type) && el.closest('label'))) out.targets.push(`${sel(el)} ${Math.round(r.width)}×${Math.round(r.height)}px, make the hit area at least 24×24 (44 on touch)`);
  }
  for (const img of document.querySelectorAll('img')) if (visible(img) && !img.hasAttribute('alt')) out.alt.push(`${sel(img)} ${img.src.split('/').pop().slice(0, 40)}: add alt ("" if decorative)`);

  // headings and landmarks
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => +h.tagName[1]);
  const h1 = hs.filter((h) => h === 1).length;
  if (h1 !== 1) out.headings.push(`${h1} <h1> elements; use exactly one per page`);
  for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) { out.headings.push(`heading jumps from h${hs[i - 1]} to h${hs[i]}, don't skip levels`); break; }

  // strong buttons in the first screen: filled with a saturated colour
  const sat = (c) => { const p = parse(c); if (!p || p.a < 0.5) return 0; const mx = Math.max(p.r, p.g, p.b), mn = Math.min(p.r, p.g, p.b); return mx === 0 ? 0 : (mx - mn) / mx; };
  const strong = controls.filter((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && /^(BUTTON|A)$/.test(el.tagName) && sat(getComputedStyle(el).backgroundColor) > 0.35 && r.width > 40; }).length;

  // broken content: values that leaked from code into the page
  const broken = [];
  const leak = /(^|[^\w])(NaN|undefined|null|Infinity|\[object Object\])(?![\w])|\$\{[^}]*\}|\{\{[^}]*\}\}|lorem ipsum/i;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n && broken.length < 8; n = walker.nextNode()) {
    const t = n.textContent.trim();
    if (!t || !leak.test(t) || !n.parentElement || !visible(n.parentElement)) continue;
    if (n.parentElement.closest('script, style, code, pre, textarea')) continue;
    broken.push(`${sel(n.parentElement)} shows "${t.replace(/\s+/g, ' ').slice(0, 40)}"`);
  }
  for (const el of document.querySelectorAll('input, select')) if (visible(el) && /^(NaN|undefined|null)$/.test(el.value)) broken.push(`${sel(el)} has the value "${el.value}"`);
  for (const img of document.querySelectorAll('img')) if (visible(img) && img.complete && !img.naturalWidth) broken.push(`${sel(img)} failed to load`);

  // numbers that fall apart: at 24px+, a separator rendered much wider than in running text ("$50 , 699")
  const splitNumbers = [];
  for (const el of document.querySelectorAll('body *')) {
    if (splitNumbers.length > 3 || !visible(el)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    if (!/\d[,.]\d/.test(own)) continue;
    const s = getComputedStyle(el);
    const px = parseFloat(s.fontSize);
    if (px < 24) continue;
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily};font-variant-numeric:${s.fontVariantNumeric};letter-spacing:${s.letterSpacing};font-feature-settings:${s.fontFeatureSettings}`;
    document.body.appendChild(probe);
    probe.textContent = ','; const comma = probe.getBoundingClientRect().width;
    probe.textContent = '0'; const digit = probe.getBoundingClientRect().width;
    probe.remove();
    if (comma > digit * 0.6) splitNumbers.push(`${sel(el)}: the separator is ${Math.round(comma)}px wide next to ${Math.round(digit)}px digits`);
  }

  // chrome that stops short: a side panel with its own background that ends while the page keeps going
  const shortPanels = [];
  const docH = document.documentElement.scrollHeight;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  if (docH > innerHeight * 1.3)
    for (const el of document.querySelectorAll('aside, nav, [class*="sidebar" i], [class*="side-bar" i], [class*="rail" i]')) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (s.position === 'fixed' || s.position === 'sticky') continue;
      const edge = r.left < 8 || r.right > vw - 8;
      const panel = s.backgroundColor !== bodyBg && parse(s.backgroundColor)?.a > 0.5 || parseFloat(s.borderRightWidth) > 0 || parseFloat(s.borderLeftWidth) > 0;
      const bottom = r.bottom + scrollY;
      if (edge && panel && r.width < vw * 0.4 && r.height > innerHeight * 0.5 && bottom < docH - 120) shortPanels.push(`${sel(el)} ends at ${Math.round(bottom)}px; the page is ${docH}px tall`);
    }

  // character: the measurable signs of the template look (antheo-direction)
  const character = { notes: [] };
  {
    const DEFAULT_FACES = /^(inter|roboto|arial|helvetica|helvetica neue|system-ui|-apple-system|blinkmacsystemfont|segoe ui|poppins|montserrat|open sans|lato|sans-serif|ui-sans-serif)$/i;
    const used = Object.keys(families);
    character.defaultFaces = used.length > 0 && used.every((f) => DEFAULT_FACES.test(f));
    character.faces = used;
    // body size: the most common paragraph size, never below 16 (small meta text would flatter the ratio)
    const pSizes = {};
    for (const p of document.querySelectorAll('p')) if (visible(p) && p.textContent.trim().length > 40) { const v = parseFloat(getComputedStyle(p).fontSize); pSizes[v] = (pSizes[v] || 0) + 1; }
    const body = Math.max(16, +Object.entries(pSizes).sort((a, b) => b[1] - a[1])[0]?.[0] || 16);
    const h1 = document.querySelector('h1');
    character.h1px = h1 && visible(h1) ? parseFloat(getComputedStyle(h1).fontSize) : 0;
    character.ratio = character.h1px / body;
    const sections = [...document.querySelectorAll('main > section, main > div > section, body > section, main > article > section')].filter(visible);
    // a marketing page: long, made of 4+ sections, few form fields, no app chrome, or whatever --kind says
    const fields = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(visible).length;
    // app chrome: a tall, narrow side panel (a sidebar or rail), or a data grid
    const appShell = !!document.querySelector('[role=grid]') || [...document.querySelectorAll('aside, nav, [class*="sidebar" i], [class*="rail" i]')].some((el) => { const r = el.getBoundingClientRect(); return visible(el) && r.height > innerHeight * 0.6 && r.width < innerWidth * 0.3 && (r.left < 8 || r.right > innerWidth - 8); });
    const guess = sections.length >= 4 && document.documentElement.scrollHeight > innerHeight * 2 && fields < 8 && !appShell;
    character.marketing = kind === 'page' ? true : kind === 'app' ? false : guess;
    character.sections = sections.length;
    // a dominant visual in the first screen: a picture, a drawing, or a built product view, not containing the h1
    const vpArea = innerWidth * innerHeight;
    character.heroVisual = [...document.querySelectorAll('body *')].some((el) => {
      if (!visible(el) || (h1 && el.contains(h1)) || el.closest('nav, header > nav')) return false;
      const r = el.getBoundingClientRect();
      if (r.top > innerHeight * 0.9 || r.bottom < 0) return false;
      const area = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      if (area < vpArea * 0.14) return false;
      const s = getComputedStyle(el);
      return /^(IMG|SVG|CANVAS|VIDEO|PICTURE|IFRAME)$/i.test(el.tagName) || s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('linear-gradient') || el.querySelectorAll('*').length >= 12;
    });
    // identical icon cards: 3+ siblings of equal width, each with a small graphic, a heading and text
    const iconRows = [];
    for (const parent of document.querySelectorAll('body *')) {
      const kids = [...parent.children].filter(visible);
      if (kids.length < 3 || kids.length > 6) continue;
      const rects = kids.map((k) => k.getBoundingClientRect());
      const w = rects.map((r) => Math.round(r.width));
      if (Math.max(...w) - Math.min(...w) > 4 || w[0] < 160 || w[0] > innerWidth * 0.45) continue;
      // cards sit side by side: at least three share a row
      if (rects.filter((r) => Math.abs(r.top - rects[0].top) < 4).length < 3) continue;
      const iconic = kids.every((k) => {
        const g = k.querySelector('svg, img, [class*="icon" i]');
        const gr = g?.getBoundingClientRect();
        return g && gr.width <= 72 && gr.height <= 72 && k.querySelector('h2, h3, h4, strong, b') && k.querySelector('p');
      });
      if (iconic && !parent.closest('nav, footer, form, table')) iconRows.push(`${sel(parent)}: ${kids.length} equal cards, each icon + title + text`);
      if (iconRows.length > 2) break;
    }
    character.iconRows = iconRows;
    // eyebrows: small uppercase tracked labels sitting right above headings
    let eyebrows = 0;
    for (const h of document.querySelectorAll('h2, h3')) {
      const prev = h.previousElementSibling;
      if (!prev || !visible(prev)) continue;
      const s = getComputedStyle(prev);
      if (s.textTransform === 'uppercase' && parseFloat(s.fontSize) <= 14 && parseFloat(s.letterSpacing) > 0.5 && !/^\d/.test(prev.textContent.trim())) eyebrows++;
    }
    character.eyebrows = eyebrows;
    character.gradientText = [...document.querySelectorAll('h1, h2, h3, h1 *, h2 *, h3 *')].filter((el) => /text/.test(getComputedStyle(el).backgroundClip || getComputedStyle(el).webkitBackgroundClip)).map(sel).slice(0, 3);
    character.glass = [...document.querySelectorAll('body *')].filter((el) => visible(el) && /blur/.test(getComputedStyle(el).backdropFilter || '') && getComputedStyle(el).position !== 'fixed' && getComputedStyle(el).position !== 'sticky').length;
    // the same rhythm: 3+ consecutive sections with the same background and padding
    const sig = sections.map((s) => { const c = getComputedStyle(s); return `${c.backgroundColor}|${Math.round(parseFloat(c.paddingTop) / 16)}`; });
    let run = 1, longest = 1;
    for (let i = 1; i < sig.length; i++) { run = sig[i] === sig[i - 1] ? run + 1 : 1; longest = Math.max(longest, run); }
    character.sameRun = longest;
    // the accent: the hue of the strongest filled button
    const hueOf = (c) => { const p = parse(c); if (!p) return null; const [r, g, b] = [p.r / 255, p.g / 255, p.b / 255]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 0.15) return null; let h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn); return ((h * 60) + 360) % 360; };
    const btn = [...document.querySelectorAll('button, a')].filter(visible).map((b) => getComputedStyle(b).backgroundColor).map(hueOf).filter((h) => h !== null);
    character.accentHue = btn.length ? btn[0] : null;
    character.faq = document.querySelectorAll('details').length >= 4;
    // costume: a component or app screen wearing its subject (antheo-components references/look.md)
    const SERIF = /serif|fraunces|newsreader|gloock|young serif|playfair|lora|caslon|garamond|baskerville|bodoni|iowan|palatino|georgia|times|tiempos|canela|instrument serif/i;
    const costume = { serif: [], dashed: [], tracked: [], tinted: [], texture: [] };
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      // a drawn object (a bank card, a dial, a radio: antheo-surface references/objects.md) is the thing itself, so its
      // material, print and texture are the job, not a costume; its text is still measured for contrast elsewhere
      if (el.closest('[data-object]')) continue;
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const first = st.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      if (own && SERIF.test(first) && !/sans/i.test(first) && !el.closest('pre, code, kbd, blockquote')) costume.serif.push(`${sel(el)} in ${first}`);
      const dash = ['Top', 'Right', 'Bottom', 'Left'].some((side) => /dashed|dotted/.test(st[`border${side}Style`]) && parseFloat(st[`border${side}Width`]) >= 1);
      if (dash && r.width * r.height > 400) costume.dashed.push(sel(el));
      if (own && st.textTransform === 'uppercase' && parseFloat(st.letterSpacing) > 0.4 && !el.closest('kbd, code')) costume.tracked.push(`${sel(el)} "${el.textContent.trim().slice(0, 18)}"`);
      const bg = parse(st.backgroundColor);
      if (bg && bg.a > 0.6 && r.width * r.height > 30000 && !/^(button|a|img|svg|canvas|video|mark)$/i.test(el.tagName)) {
        const [R, G, B] = [bg.r, bg.g, bg.b];
        const spread = (Math.max(R, G, B) - Math.min(R, G, B)) / 255;
        if (spread > 0.07) costume.tinted.push(`${sel(el)} rgb(${R} ${G} ${B})`);
      }
      if (r.width * r.height > 20000 && /url\(|repeating-(radial|linear)-gradient|radial-gradient\([^)]*\b[0-3]px/.test(st.backgroundImage) && !/^(img|svg|canvas|video)$/i.test(el.tagName)) costume.texture.push(sel(el));
    }
    for (const k of Object.keys(costume)) costume[k] = [...new Set(costume[k])].slice(0, 5);
    character.costume = costume;
  }

  const anims = document.getAnimations().map((a) => ({ inf: a.effect?.getTiming?.().iterations === Infinity, target: a.effect?.target ? sel(a.effect.target) : '?' }));
  const transitionAll = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).transitionProperty === 'all' && getComputedStyle(e).transitionDuration !== '0s').length;

  // custom properties read but never defined: the whole declaration is dropped, so a transition that reads one
  // does not run and the thing jumps
  const undefinedVars = (() => {
    let css = '';
    for (const sheet of document.styleSheets) { try { for (const r of sheet.cssRules) css += r.cssText + '\n'; } catch { /* a cross-origin sheet */ } }
    for (const el of document.querySelectorAll('[style]')) css += el.getAttribute('style') + ';\n';
    const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((x) => x[1]));
    for (const x of css.matchAll(/@property\s+(--[\w-]+)/g)) declared.add(x[1]);
    for (const s of document.scripts) for (const x of (s.textContent || '').matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)) declared.add(x[1]);
    // a linked sheet can be unreadable (file://, another origin), so a name the page actually resolves counts as defined
    const root = getComputedStyle(document.documentElement);
    const open = [...new Set([...css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((x) => x[1]).filter((n) => !declared.has(n) && !root.getPropertyValue(n).trim()))].slice(0, 16);
    // a name some element resolves (a framework's inline style, setProperty from a bundled script) is defined where
    // it is used
    const all = open.length ? [...document.querySelectorAll('body *')].slice(0, 4000) : [];
    return open.filter((n) => !all.some((el) => getComputedStyle(el).getPropertyValue(n).trim())).slice(0, 8);
  })();
  // a framework's default palette, used unchanged
  const SWATCH = { 'rgb(99, 102, 241)': 'indigo-500', 'rgb(79, 70, 229)': 'indigo-600', 'rgb(59, 130, 246)': 'blue-500', 'rgb(37, 99, 235)': 'blue-600', 'rgb(139, 92, 246)': 'violet-500', 'rgb(124, 58, 237)': 'violet-600', 'rgb(168, 85, 247)': 'purple-500', 'rgb(16, 185, 129)': 'emerald-500', 'rgb(15, 23, 42)': 'slate-900' };
  const swatchSet = new Set();
  for (const e of document.querySelectorAll('body *')) {
    const s = getComputedStyle(e);
    for (const v of [s.color, s.backgroundColor, s.borderTopColor]) if (SWATCH[v]) swatchSet.add(SWATCH[v]);
    if (swatchSet.size > 4) break;
  }

  // a field anyone can find (WCAG 1.4.11). It passes when one edge is a line of 1px or more at 3:1 against what is
  // beside it (a border on any side, an outline, or a box-shadow layer with no blur, inset or not: a line on one side
  // such as "inset 0 -1px 0" counts), or when its fill is 3:1 against the surface behind it. The best ratio is reported.
  out.fieldEdge = [];
  const apart = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const FIELD = 'input:not([type=checkbox], [type=radio], [type=range], [type=button], [type=submit], [type=reset], [type=image], [type=color], [type=file], [type=hidden]), textarea, select';
  for (const el of document.querySelectorAll(FIELD)) {
    if (el.disabled || el.closest('[aria-disabled="true"], fieldset:disabled') || !visible(el) || srOnly(el)) continue;
    const size = el.getBoundingClientRect();
    if (size.width < 16 || size.height < 8) continue;
    // what draws the field: the control itself, or a close wrapper that holds only this field (an input and its prefix)
    const boxes = [el];
    for (let a = el.parentElement, n = 0; a && a !== document.body && n < 2; a = a.parentElement, n++) {
      if (a.querySelectorAll(FIELD).length !== 1 || a.getBoundingClientRect().height > size.height + 32) break;
      boxes.push(a);
    }
    let best = 0, unread = false;
    for (const box of boxes) {
      const c = getComputedStyle(box);
      const outside = box.parentElement ? behind(box.parentElement) : null;
      // an image or a gradient behind or inside it: not something this can measure, so nothing is said
      if (!outside || (c.backgroundImage !== 'none' && !c.backgroundImage.startsWith('url("data:image/svg'))) { unread = true; break; }
      const own = parse(c.backgroundColor);
      const fill = own && own.a > 0 ? blend(own, outside) : outside;
      best = Math.max(best, apart(fill, outside));
      // a line is judged as drawn (its colour over what is under it) against the surface outside and the fill inside
      const line = (colour, under) => { const p = parse(colour); if (!p) { unread = true; return; } if (p.a > 0) { const drawn = blend(p, under); best = Math.max(best, apart(drawn, outside), apart(drawn, fill)); } };
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(c[`border${side}Width`]) >= 1 && !['none', 'hidden'].includes(c[`border${side}Style`])) line(c[`border${side}Color`], fill);
      if (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 1) line(c.outlineColor, outside);
      if (c.boxShadow !== 'none') for (const layer of c.boxShadow.split(/,(?![^(]*\))/)) {
        const colour = layer.match(/[a-z-]+\([^)]*\)|#[0-9a-f]{3,8}\b/i)?.[0] ?? layer.trim().split(/\s+/)[0];
        const [x = 0, y = 0, blur = 0, spread = 0] = [...layer.replace(colour, '').matchAll(/-?[\d.]+px/g)].map((m) => parseFloat(m[0]));
        if (blur === 0 && spread + Math.max(Math.abs(x), Math.abs(y)) >= 1) line(colour, /\binset\b/.test(layer) ? fill : outside);
      }
    }
    if (!unread && best < 3 && out.fieldEdge.length < 8) out.fieldEdge.push(`${sel(el)} best ${best.toFixed(2)}:1`);
  }

  // charts (marked data-chart): a name a screen reader can say, and series that differ by more than hue
  out.chartNoName = []; out.chartHue = [];
  const oklch = ({ r, g, b }) => {
    const [R, G, B] = [r, g, b].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), n = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * n, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * n;
    return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * n, C: Math.hypot(A, Bb), H: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360 };
  };
  for (const chart of document.querySelectorAll('[data-chart]')) {
    if (!visible(chart)) continue;
    const labelled = (el) => !!(el.getAttribute('aria-label')?.trim() || (el.getAttribute('aria-labelledby') || '').split(/\s+/).some((id) => id && document.getElementById(id)?.textContent.trim()));
    // the name: role="img" (or a picture element) with a label, an <img alt>, an SVG <title>, a figure's caption, or
    // the same data as a table in the chart, its figure or its section
    const named = [chart, ...chart.querySelectorAll('svg, canvas, img, [role=img]')].some((el) => (labelled(el) && (/^(img|figure|group|graphics-document)$/.test(el.getAttribute('role') || '') || /^(svg|canvas|img)$/i.test(el.tagName)))
        || (el.tagName === 'IMG' && el.alt.trim()) || [...el.children].some((c) => c.tagName.toLowerCase() === 'title' && c.textContent.trim()))
      || !!chart.closest('figure')?.querySelector('figcaption')?.textContent.trim()
      || !!(chart.querySelector('table') || chart.closest('figure, section')?.querySelector('table'));
    if (!named && out.chartNoName.length < 6) out.chartNoName.push(sel(chart));

    // series by hue alone. Conservative on purpose: only drawn SVG marks with a flat, hued, mostly opaque colour are
    // read; a pattern or gradient fill, a canvas, or a colour scale of many steps is left alone.
    const svgMarks = [...chart.querySelectorAll('svg path, svg line, svg polyline, svg polygon, svg rect, svg circle, svg ellipse')].filter((el) => !el.closest('defs, clipPath, mask, marker, pattern, symbol'));
    if (svgMarks.some((el) => { const c = getComputedStyle(el); return /url\(/.test(c.fill) || /url\(/.test(c.stroke); })) continue;
    const words = [...chart.querySelectorAll('svg text')].filter((t) => /\p{L}{2,}/u.test(t.textContent)).map((t) => t.getBoundingClientRect());
    const near = (x0, y0, x1, y1, reach) => words.some((w) => Math.hypot(Math.max(w.left - x1, 0, x0 - w.right), Math.max(w.top - y1, 0, y0 - w.bottom)) <= reach);
    const frame = chart.getBoundingClientRect();
    const series = new Map(); // "r,g,b" → what its marks have besides colour
    for (const el of svgMarks) {
      const r = el.getBoundingClientRect(), c = getComputedStyle(el);
      if (Math.max(r.width, r.height) < 8 || r.width * r.height > 0.8 * frame.width * frame.height) continue; // a speck, or the plot's own ground
      const filled = c.fill !== 'none' && (parse(c.fill)?.a ?? 0) * +c.fillOpacity > 0.5;
      const col = parse(filled ? c.fill : c.stroke);
      if (!col || (!filled && (c.stroke === 'none' || !(parseFloat(c.strokeWidth) > 0))) || col.a * +c.opacity * (filled ? 1 : +c.strokeOpacity) <= 0.5) continue;
      const lch = oklch(col);
      if (lch.C < 0.04) continue; // neutral: gridlines, axes, an ink series
      const key = `${Math.round(col.r)},${Math.round(col.g)},${Math.round(col.b)}`;
      const one = series.get(key) ?? { ...lch, hex: '#' + [col.r, col.g, col.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''), dashes: new Set(), markers: new Set(), labelled: false };
      one.dashes.add(filled ? 'fill' : c.strokeDasharray);
      if (Math.max(r.width, r.height) <= 16) one.markers.add(el.tagName.toLowerCase());
      // a word beside a filled mark, or at the end of a line, is a direct label
      if (filled) one.labelled ||= near(r.left, r.top, r.right, r.bottom, 24);
      else { try { const p = el.getPointAtLength(el.getTotalLength()).matrixTransform(el.getScreenCTM()); one.labelled ||= near(p.x, p.y, p.x, p.y, 40); } catch { one.labelled = true; /* cannot tell: say nothing */ } }
      series.set(key, one);
    }
    const list = [...series.values()];
    if (list.length < 2 || list.length > 8) continue;
    const sig = (x) => [...x.dashes].sort().join('|') + '#' + [...x.markers].sort().join('|');
    let worst = null;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], dH = Math.min(Math.abs(a.H - b.H), 360 - Math.abs(a.H - b.H));
      if (dH < 20 && Math.abs(a.C - b.C) < 0.04) continue; // one series in two tints (a hover, an area under its line)
      if (a.labelled || b.labelled || sig(a) !== sig(b)) continue;
      const dL = Math.abs(a.L - b.L);
      if (dL < 0.08 && (!worst || dL < worst.dL)) worst = { a, b, dL };
    }
    if (worst && out.chartHue.length < 6) out.chartHue.push(`${sel(chart)}: ${worst.a.hex} and ${worst.b.hex} are equally light (OKLCH lightness ${worst.a.L.toFixed(2)} and ${worst.b.L.toFixed(2)}), and their marks differ in nothing else`);
  }

  return {
    ...out,
    broken, shortPanels, character, splitNumbers, undefinedVars, swatches: [...swatchSet],
    smallShare: chars ? smallChars / chars : 0,
    longLines: longLines.slice(0, 4), smallBody: smallBody.slice(0, 4), tightLeading: tightLeading.slice(0, 4),
    sizes: Object.keys(sizes).length, families: Object.keys(families), weights: Object.keys(weights).length, colors: Object.keys(colors).length,
    radii: Object.keys(radii).length, radiiList: Object.keys(radii), sizeList: Object.keys(sizes).map(Number).sort((x, y) => x - y), figureSizes: Object.keys(sizes).filter((k) => !wordSizes[k]).map(Number), sheetRadii: Object.keys(radii).filter((k) => !boxRadii[k]), weightList: Object.keys(weights), spacingOff: spacing.on + spacing.off ? spacing.off / (spacing.on + spacing.off) : 0, offSamples,
    strong, infinite: anims.filter((a) => a.inf).map((a) => a.target).slice(0, 5), transitionAll,
    lang: document.documentElement.lang, main: !!document.querySelector('main, [role=main]'), title: document.title,
    bg: getComputedStyle(document.body).backgroundColor,
  };
}

/* ── craft: runs at every width, in light and dark ───────────────────────────────────────────────────────────── */
// What a designer sees in two seconds and a rule list misses: space that was never decided, things that almost
// line up, controls with uneven insides, text escaping its box. Every item is { id, detail } so the same element
// found at several sizes is reported once.
function craft() {
  const vw = innerWidth;
  const out = { overflow: [], broken: [], dead: [], vgap: [], nearMiss: [], lopsided: [], edges3: [], edges2: [], spill: [], boxSpill: [], clipped: [], gaps: [],
    brokenWord: [], covered: [], seeThrough: [], stuckShort: [], headerEdge: [], unitGap: [], rotated: [], placeholderText: [], bands: [], outlined: [], hued: [] };
  const styleOf = (el) => getComputedStyle(el);
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = styleOf(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const sel = (el) => { const id = el.id ? `#${el.id}` : ''; const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''; const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28); return `${el.tagName.toLowerCase()}${id}${cls}${t ? ` "${t}"` : ''}`; };
  const item = (el, detail) => ({ id: typeof el === 'string' ? el : sel(el), detail });
  // the opacity of any CSS colour: rgb(), oklch(), lab(), color() and the rest (Chrome keeps OKLCH as OKLCH, so an
  // rgb-only reader called every Quiet colour transparent)
  const alpha = (c) => {
    if (!c || c === 'transparent') return 0;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return p[3] ?? 1; }
    const a = c.match(/\/\s*([\d.]+)(%?)\s*\)\s*$/);
    return a ? (a[2] ? +a[1] / 100 : +a[1]) : 1;
  };
  const boxed = (s) => alpha(s.backgroundColor) > 0.05 || s.backgroundImage !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s[`border${k}Width`]) > 0 && alpha(s[`border${k}Color`]) > 0.05 && s[`border${k}Style`] !== 'none');
  const MEDIA = /^(img|svg|canvas|video|input|select|textarea|iframe|picture)$/i;
  const range = document.createRange();
  // what fills space inside root: lines of text, media and fields, and painted boxes (but not full-width backgrounds)
  const content = (root) => {
    const rects = [];
    const limit = root.getBoundingClientRect().width * 0.85;
    const walk = (el) => {
      for (const n of el.childNodes) {
        if (n.nodeType === 3) {
          if (n.textContent.trim()) { range.selectNodeContents(n); for (const r of range.getClientRects()) if (r.width > 2 && r.height > 2) rects.push(r); }
          continue;
        }
        if (n.nodeType !== 1 || /^(script|style|noscript|template)$/i.test(n.tagName)) continue;
        const s = styleOf(n);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) continue;
        const r = n.getBoundingClientRect();
        // a skip link or screen-reader-only text: parked off screen, clipped away or 1px; it fills no space
        if ((s.position === 'absolute' || s.position === 'fixed') && (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || (r.width <= 2 && r.height <= 2) || (s.clip && s.clip !== 'auto') || /inset\(50%|circle\(0/.test(s.clipPath))) continue;
        if (MEDIA.test(n.tagName)) { if (r.width > 2 && r.height > 2) rects.push(r); continue; }
        // a small filled shape (a 6px dot, an icon) is content too, not empty room
        if (boxed(s) && r.width * r.height >= 16 && r.width < limit) rects.push(r);
        walk(n);
      }
    };
    walk(root);
    return rects;
  };
  const firstLine = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement)) continue;
      range.selectNodeContents(n);
      const r = range.getClientRects()[0];
      if (r && r.width > 2) return { top: r.top, left: r.left, right: r.right, size: parseFloat(styleOf(n.parentElement).fontSize), text: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 22), el: n.parentElement };
    }
    return null;
  };

  // horizontal scroll
  if (document.documentElement.scrollWidth > vw + 1)
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && styleOf(el).position !== 'fixed' && !el.closest('[data-scroll], [style*="overflow"]')) {
        const parentOver = el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1;
        if (!parentOver || out.overflow.length < 3) out.overflow.push(item(el, `reaches ${Math.round(r.right)}px in a ${vw}px window`));
        if (out.overflow.length > 5) break;
      }
    }

  // values leaked from code
  const leak = /(^|[^\w])(NaN|undefined|null|Infinity|\[object Object\])(?![\w])|\$\{[^}]*\}|\{\{[^}]*\}\}|lorem ipsum/i;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n && out.broken.length < 8; n = tw.nextNode()) {
    const t = n.textContent.trim();
    if (!t || !leak.test(t) || !n.parentElement || !visible(n.parentElement) || n.parentElement.closest('script, style, code, pre, textarea')) continue;
    out.broken.push(item(n.parentElement, `shows "${t.replace(/\s+/g, ' ').slice(0, 40)}"`));
  }
  for (const img of document.querySelectorAll('img')) if (visible(img) && img.complete && !img.naturalWidth) out.broken.push(item(img, 'failed to load'));

  // the page's scenes: the stacked blocks a person scrolls through
  const blocks = (el) => [...el.children].filter((c) => !/^(script|style|svg|noscript|template)$/i.test(c.tagName) && visible(c) && !['fixed', 'absolute'].includes(styleOf(c).position) && c.getBoundingClientRect().height >= 80);
  let scenes = blocks(document.body);
  for (let i = 0; i < 4; i++) {
    const next = scenes.flatMap((e) => {
      const inner = blocks(e);
      const open = e.tagName === 'MAIN' || scenes.length === 1 || e.getBoundingClientRect().height > innerHeight * 2.5;
      return open && inner.length >= (scenes.length === 1 ? 1 : 2) ? inner : [e];
    });
    if (next.length === scenes.length) break;
    scenes = next;
  }
  const wide = scenes.filter((s) => s.getBoundingClientRect().width >= Math.min(900, vw * 0.9));
  const filled = wide.map((s) => ({ el: s, r: s.getBoundingClientRect(), rects: content(s) })).filter((s) => s.rects.length);

  if (vw >= 1024 && filled.length) {
    // the content column: the span the page's content actually uses
    const cx0 = Math.max(0, Math.min(...filled.flatMap((s) => s.rects.map((r) => r.left))));
    const cx1 = Math.min(vw, Math.max(...filled.flatMap((s) => s.rects.map((r) => r.right))));
    for (const s of filled) {
      const top = s.r.top, h = s.r.height, w = cx1 - cx0;
      if (h < 480 || w < 720) continue;
      // coverage per quarter, on a 16px grid
      const cell = 16, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      const grid = new Uint8Array(cols * rows);
      for (const r of s.rects) {
        const c0 = Math.max(0, Math.floor((r.left - cx0) / cell)), c1 = Math.min(cols, Math.ceil((r.right - cx0) / cell));
        const r0 = Math.max(0, Math.floor((r.top - top) / cell)), r1 = Math.min(rows, Math.ceil((r.bottom - top) / cell));
        for (let y = r0; y < r1; y++) grid.fill(1, y * cols + c0, y * cols + c1);
      }
      const cover = (qx, qy) => { let n = 0, t = 0; for (let y = qy ? rows >> 1 : 0; y < (qy ? rows : rows >> 1); y++) for (let x = qx ? cols >> 1 : 0; x < (qx ? cols : cols >> 1); x++) { t++; n += grid[y * cols + x]; } return t ? n / t : 0; };
      const q = [[cover(0, 0), cover(1, 0)], [cover(0, 1), cover(1, 1)]];
      for (const y of [0, 1]) for (const x of [0, 1]) {
        if (q[y][x] < 0.015 && q[y][1 - x] > 0.3) out.dead.push(item(s.el, `the ${y ? 'lower' : 'upper'} ${x ? 'right' : 'left'} quarter (${Math.round(w / 2)}×${Math.round(h / 2)}px) is empty beside a ${Math.round(q[y][1 - x] * 100)}%-filled ${x ? 'left' : 'right'}`));
      }
      // empty bands above or below the content
      const cTop = Math.min(...s.rects.map((r) => r.top)), cBot = Math.max(...s.rects.map((r) => r.bottom));
      const gapTop = cTop - top, gapBot = s.r.bottom - cBot;
      if (Math.max(gapTop, gapBot) > Math.max(300, h * 0.45)) out.vgap.push(item(s.el, `${Math.round(Math.max(gapTop, gapBot))}px of nothing ${gapTop > gapBot ? 'above' : 'below'} its content (section is ${Math.round(h)}px tall)`));
    }
    // left edges: where each scene's heading starts
    const lefts = [];
    for (const s of filled) {
      const hd = [...s.el.querySelectorAll('h1, h2, h3')].find(visible);
      if (!hd) continue;
      const f = firstLine(hd);
      if (!f) continue;
      const cs = styleOf(hd);
      if (cs.textAlign === 'center' || Math.abs((f.left + f.right) / 2 - (s.r.left + s.r.right) / 2) < 12) continue; // a centred statement is its own axis
      if (!lefts.some((l) => Math.abs(l.x - f.left) <= 8)) lefts.push({ x: Math.round(f.left), text: f.text });
    }
    lefts.sort((a, b) => a.x - b.x);
    const detail = lefts.map((l) => `${l.x}px ("${l.text}")`).join(', ');
    if (lefts.length >= 3) out.edges3.push(item('page', `headings start at ${detail}`));
    else if (lefts.length === 2) out.edges2.push(item('page', `headings start at ${detail}`));
    // the gaps above each scene's content: a few values is rhythm, many is accident
    const tops = [...new Set(filled.map((s) => Math.round((Math.min(...s.rects.map((r) => r.top)) - s.r.top) / 8) * 8).filter((g) => g >= 24))].sort((a, b) => a - b);
    if (tops.length > 4) out.gaps.push(item('page', `${tops.length} different gaps above section content: ${tops.join(', ')}px`));
  }

  // near-miss alignment: side-by-side siblings whose first lines of same-size text almost share a top
  const HELD = 'button, a[href], input, select, textarea, [role=button], [role=switch], [role=tab], [role=slider], [data-object]';
  for (const p of document.querySelectorAll('body *')) {
    if (out.nearMiss.length >= 6) break;
    const s = styleOf(p);
    const row = (s.display.includes('flex') && !s.flexDirection.startsWith('column')) || s.display.includes('grid');
    if (!row) continue;
    const kids = [...p.children].filter(visible);
    if (kids.length < 2 || kids.length > 4) continue;
    const rs = kids.map((k) => k.getBoundingClientRect());
    if (rs.some((r) => r.width < 140)) continue;
    const lines = kids.map(firstLine);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = lines[i], b = lines[j];
      if (!a || !b) continue;
      const beside = (rs[i].right <= rs[j].left + 1 || rs[j].right <= rs[i].left + 1) && Math.min(rs[i].bottom, rs[j].bottom) - Math.max(rs[i].top, rs[j].top) > 8;
      if (!beside || Math.abs(a.size - b.size) > 1.5) continue;
      // a label inside a control or a drawn object is placed by that control; text beside it in the next column of
      // a states sheet is not its pair
      if (!!a.el.closest(HELD) !== !!b.el.closest(HELD)) continue;
      const dy = Math.abs(a.top - b.top);
      if (dy >= 3 && dy <= 28) out.nearMiss.push(item(p, `"${a.text}" and "${b.text}" (both ${Math.round(a.size)}px) start ${Math.round(dy)}px apart`));
    }
  }

  // lopsided insides: a boxed control whose content sits closer to one side. Measured at rest: a control caught
  // mid-animation (a squash, a sliding thumb, an idle loop) has no settled inside yet, and a drawn object's inside is
  // its artwork, not padding.
  const movingNow = document.getAnimations().filter((a) => a.playState === 'running').map((a) => a.effect?.target).filter(Boolean);
  const atRest = (el) => !movingNow.some((t) => t === el || t.contains(el) || el.contains(t));
  let seen = 0;
  for (const el of document.querySelectorAll('button, a, [role=tab], [role=button], [role=radio], label, span, li, div')) {
    if (out.lopsided.length >= 6 || seen > 4000) break;
    seen++;
    const r = el.getBoundingClientRect();
    if (r.height < 18 || r.height > 72 || r.width < 28 || r.width > 420) continue;
    // a group of controls (a segmented track, a toolbar) is judged by its controls, not as one control
    if (!/^(BUTTON|A)$/.test(el.tagName) && el.querySelector('button, a[href], input, select, [role=button], [role=radio], [role=tab], [role=menuitem]')) continue;
    const s = styleOf(el);
    if (!boxed(s) || !visible(el) || !(el.innerText || '').trim()) continue;
    if (el.closest('[data-object]') || !atRest(el)) continue;
    const rects = content(el);
    if (!rects.length) continue;
    // wrapped text ends its lines wherever a word ends, so the room after the longest line says nothing about the
    // padding: judge a wrapped box by its own inline padding instead
    const wrapped = new Set(rects.map((x) => Math.round(x.top))).size > 1 && rects.every((x) => x.height < r.height * 0.75);
    const l = wrapped ? parseFloat(s.paddingLeft) + parseFloat(s.borderLeftWidth) : Math.min(...rects.map((x) => x.left)) - r.left;
    const rr = wrapped ? parseFloat(s.paddingRight) + parseFloat(s.borderRightWidth) : r.right - Math.max(...rects.map((x) => x.right));
    if (l < -1 || rr < -1 || l + rr > r.width * 0.4) continue; // spilling, or set to one side on purpose
    if (Math.abs(l - rr) > 6 && Math.max(l, rr) > 1.8 * Math.max(3, Math.min(l, rr))) out.lopsided.push(item(el, `${Math.round(l)}px of room on the left, ${Math.round(rr)}px on the right`));
  }

  // text escaping its box, and text cut off without an ellipsis
  for (const el of document.querySelectorAll('body *')) {
    if (out.spill.length >= 5 && out.clipped.length >= 5) break;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) || !visible(el) || el.closest('[aria-hidden="true"], svg')) continue;
    const s = styleOf(el);
    const er = el.getBoundingClientRect();
    if (er.width <= 2 || er.height <= 2 || s.clip !== 'auto' || (s.clipPath && s.clipPath !== 'none')) continue; // visually hidden text for screen readers
    if (s.whiteSpace === 'nowrap' && /hidden|clip/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== 'ellipsis' && out.clipped.length < 5) out.clipped.push(item(el, `${el.scrollWidth - el.clientWidth}px of its text is hidden`));
    let box = el;
    for (let i = 0; i < 4 && box && !boxed(styleOf(box)); i++) box = box.parentElement;
    if (!box || box === document.body || !boxed(styleOf(box)) || styleOf(box).overflow !== 'visible' || out.spill.length >= 5) continue;
    // text inside a scrolling or clipping box between it and the painted box is contained, not spilling
    let held = false;
    for (let n = el; n && n !== box; n = n.parentElement) if (styleOf(n).overflowX !== 'visible') held = true;
    if (held) continue;
    const b = box.getBoundingClientRect();
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      range.selectNodeContents(n);
      const t = range.getBoundingClientRect();
      const over = Math.max(t.right - b.right, b.left - t.left, t.bottom - b.bottom);
      if (t.width > 2 && over > 3) { out.spill.push(item(el, `its text runs ${Math.round(over)}px past ${sel(box).split(' ')[0]}`)); break; }
    }
  }

  // a painted box (a button, a chip, a candy) that sticks out of the painted shape holding it: a row that wrapped out of
  // its pill, a control pushed past its card. Popovers, menus, tooltips and anything positioned on purpose are left out.
  const floating = (el) => el.closest('[role=menu], [role=listbox], [role=tooltip], [role=dialog], dialog, [popover]') || [...(function* up(n) { for (; n && n !== document.body; n = n.parentElement) yield n; })(el)].some((n) => /absolute|fixed|sticky/.test(styleOf(n).position));
  for (const el of document.querySelectorAll('button, a, [role=button], [role=switch], [role=radio], [role=tab], [role=checkbox], input, select')) {
    if (out.boxSpill.length >= 5) break;
    if (!visible(el) || !boxed(styleOf(el)) || floating(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 12 || r.height < 12) continue;
    let holder = el.parentElement;
    while (holder && holder !== document.body && !(boxed(styleOf(holder)) && parseFloat(styleOf(holder).borderTopLeftRadius) > 0)) holder = holder.parentElement;
    if (!holder || holder === document.body) continue;
    const hs = styleOf(holder);
    if (hs.overflowX !== 'visible' || hs.overflowY !== 'visible') continue;
    const h = holder.getBoundingClientRect();
    const over = Math.max(h.left - r.left, r.right - h.right, h.top - r.top, r.bottom - h.bottom);
    if (over > 4) out.boxSpill.push(item(el, `it sticks out ${Math.round(over)}px past ${sel(holder).split(' ')[0]}, the shape holding it`));
  }

  /* ── the fundamentals (antheo-build): what an eye catches at once ── */
  const shown = (el) => visible(el) && !el.closest('dialog:not([open]), [hidden], [aria-hidden="true"]');

  // what kind of screen: sign-in and checkout are narrow on purpose; an app screen has controls to work with
  const fieldCount = [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea')].filter(shown).length;
  const isAuth = !!document.querySelector('input[type=password]') && fieldCount <= 8;
  // an app bar (antheo-build rule 11): a short header holding the product and its context, with no navigation links
  const appBar = [...document.querySelectorAll('header, [role=banner]')].some((h) => { const r = h.getBoundingClientRect(); return r.height > 0 && r.height <= 64 && !h.querySelector('a[href], nav'); });
  const isApp = !isAuth && !!document.querySelector('h1') && (fieldCount >= 2 || appBar || !!document.querySelector('[role=switch], table, [role=grid]'));
  const topBar = [...document.querySelectorAll('header, [role=banner], nav')].filter(shown).find((h) => { const r = h.getBoundingClientRect(); return r.top < 80 && r.height < innerHeight * 0.25 && r.width >= innerWidth * 0.9; });

  // counts that define a quiet screen: outlined cards, colour, corner sizes
  {
    const ringOf = (shadow) => {
      let worst = 0;
      for (const m of shadow.matchAll(/((?:rgba?|oklch|oklab|color)\([^)]*\))\s+0px\s+0px\s+0px\s+(\d*\.?\d+)px(?!\s+inset)/g)) {
        const c = m[1], w = parseFloat(m[2]);
        const al = c.includes('/') ? parseFloat(c.split('/')[1]) : /^rgba\(/.test(c) ? parseFloat(c.split(',')[3]) : 1;
        if (w >= 1) worst = Math.max(worst, (Number.isFinite(al) ? al : 1) * (w >= 2 ? 3 : 1));
      }
      return worst;
    };
    const hue = (c) => {
      if (!c || c === 'transparent') return false;
      const ok = c.match(/^okl(?:ch|ab)\(\s*([\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+))?/);
      if (ok) return (ok[4] === undefined || +ok[4] > 0.5) && (c.startsWith('oklch') ? +ok[2] : Math.hypot(+ok[2], +ok[3])) > 0.05;
      const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return false;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return (p[3] ?? 1) > 0.5 && Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) > 45;
    };
    // status colours (an error, a success, a warning) say what happened; they are not accents, so they don't count
    const status = new Set(['--danger', '--success', '--warning', '--error', '--color-danger', '--color-error', '--color-success', '--color-warning'].map((v) => {
      const p = document.createElement('span'); p.style.color = `var(${v}, rgb(0, 0, 0))`; document.body.append(p);
      const c = getComputedStyle(p).color; p.remove(); return c;
    }).filter((c) => hue(c)));
    const accent = (c) => hue(c) && !status.has(c);
    // a field, or a control showing focus or an error, wears its ring as a state; it is not an outlined card
    const fieldLike = (e) => e.matches('input, textarea, select, [contenteditable="true"], :focus, :focus-within, [aria-invalid="true"]')
      || (e.querySelectorAll('input, textarea, select').length === 1 && !e.querySelector('button, a[href], img, h1, h2, h3, p, li'));
    // a list of switches or checkboxes counts as one accent thing (antheo-build, rule 8): count groups, not items
    const groups = new Set();
    const groupOf = (e) => e.closest('fieldset, [role=group], [role=radiogroup], ul, ol, table, [role=list], [role=grid]') || e;
    let hued = 0; const huedSample = [];
    for (const e of document.querySelectorAll('body *')) {
      if (!shown(e) || e.closest('svg') && e.tagName !== 'svg') continue;
      const cs = styleOf(e); const r = e.getBoundingClientRect();
      if (r.width >= 200 && r.height >= 80 && r.width < innerWidth * 0.98 && !fieldLike(e)) {
        const border = ['Top', 'Left'].every((k) => parseFloat(cs['border' + k + 'Width']) >= 1 && alpha(cs['border' + k + 'Color']) > 0.1);
        if (border || ringOf(cs.boxShadow) > 0.1) { if (out.outlined.length < 4) out.outlined.push(item(e, 'a visible outline all round')); }
      }
      const ownText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if ((ownText && accent(cs.color)) || accent(cs.backgroundColor) || (e.tagName === 'svg' && (accent(cs.color) || accent(cs.stroke) || accent(cs.fill)))) {
        const g = groupOf(e);
        if (!groups.has(g)) { groups.add(g); hued++; if (huedSample.length < 4) huedSample.push(sel(e)); }
      }
    }
    if (hued > 8) out.hued.push(item('page', hued + ' coloured things or groups, for example ' + huedSample.join(', ')));
  }

  // a word split across two lines
  {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    let n;
    while ((n = walker.nextNode()) && out.brokenWord.length < 6) {
      const p = n.parentElement;
      if (!p || !shown(p) || /^(script|style|textarea|code|pre|option)$/i.test(p.tagName) || p.closest('.long-text, code, pre')) continue;
      if (/@|:\/\//.test(n.textContent) || styleOf(p).hyphens === 'auto') continue;   // typed strings may break; hyphenation breaks at syllables
      const re = /[A-Za-z][A-Za-z'’]{3,}/g;
      let m;
      while ((m = re.exec(n.textContent))) {
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        const tops = new Set([...range.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
        if (tops.size > 1 && !seen.has(m[0])) { seen.add(m[0]); out.brokenWord.push(item(p, '"' + m[0] + '" is split across two lines')); }
      }
    }
  }

  // bars stuck to the screen: see-through, covering the end of the page, or stuck on a page too short to need one
  {
    const targets = [...document.querySelectorAll('h1,h2,h3,p,label,input,select,textarea,button,a,li,[role=radio],[role=checkbox]')].filter(shown);
    const bars = [...document.querySelectorAll('body *')].filter((e) => { const p = styleOf(e).position; return (p === 'fixed' || p === 'sticky') && shown(e); });
    const overlaps = (bar) => {
      const fb = bar.getBoundingClientRect();
      return targets.filter((e) => {
        if (bar.contains(e) || e.contains(bar)) return false;
        const b = e.getBoundingClientRect();
        return Math.min(b.right, fb.right) - Math.max(b.left, fb.left) > 4 && Math.min(b.bottom, fb.bottom) - Math.max(b.top, fb.top) > 4;
      });
    };
    const pageH = document.documentElement.scrollHeight;
    for (const bar of bars) {
      const fb = bar.getBoundingClientRect();
      if (fb.height > innerHeight * 0.6 || fb.width < innerWidth * 0.5) continue;       // a sidebar or a small floating thing, not a bar
      const s = styleOf(bar);
      const bottomBar = fb.top > innerHeight / 2;
      const under = overlaps(bar);
      if (under.length && (alpha(s.backgroundColor) < 0.9 || /transparent|rgba\([^)]*,\s*0\)/.test(s.backgroundImage)) && !/blur/.test(s.backdropFilter || ''))
        out.seeThrough.push(item(bar, 'content shows through it: ' + sel(under[0])));
      if (bottomBar && bar.querySelector('button, [role=button], a') && pageH <= innerHeight * 1.5 && under.length)
        out.stuckShort.push(item(bar, 'the page is only ' + Math.round(pageH) + 'px tall, and the bar sits over ' + sel(under[0])));
    }
    if (bars.length && pageH > innerHeight + 4) {
      const y = scrollY;
      scrollTo(0, pageH);
      for (const bar of bars) {
        const fb = bar.getBoundingClientRect();
        if (fb.height > innerHeight * 0.6 || fb.width < innerWidth * 0.5 || fb.top < innerHeight / 2) continue;
        const under = overlaps(bar);
        if (under.length) out.covered.push(item(bar, 'at the end of the page it still covers ' + sel(under[0])));
      }
      scrollTo(0, y);
    }
  }

  // the header's brand and the content start on different edges
  if (innerWidth >= 700 && !isApp && !isAuth) {
    const head = [...document.querySelectorAll('header, [role=banner]')].filter(shown).find((h) => h.getBoundingClientRect().height < innerHeight * 0.3 && h.getBoundingClientRect().top < 120 && !h.closest('main, article, section'));
    const h1 = [...(document.querySelector('main') || document.body).querySelectorAll('h1, h2')].filter(shown).find((h) => !head || !head.contains(h));
    if (head && h1 && styleOf(h1).textAlign !== 'center') {
      const first = [...head.querySelectorAll('a, span, strong, b, img, svg, p')].filter(shown).map((e) => e.getBoundingClientRect()).sort((a, b) => a.left - b.left)[0];
      range.selectNodeContents(h1);
      const hx = range.getBoundingClientRect().left;
      if (first && Math.abs(first.left - hx) > 8) out.headerEdge.push(item(head, 'the header starts at ' + Math.round(first.left) + 'px, the content at ' + Math.round(hx) + 'px'));
    }
  }

  // a number and its unit that drifted apart
  for (const e of document.querySelectorAll('span, strong, b, div, p, dd, td')) {
    if (e.children.length || !shown(e) || parseFloat(styleOf(e).fontSize) < 24) continue;
    const t = e.textContent.trim();
    if (!/^[$€£¥₹]\s?\d[\d.,]*$|^\d[\d.,]*\s?[$€£¥₹%]$/.test(t)) continue;
    const u = e.nextElementSibling;
    if (!u || !shown(u) || u.textContent.trim().length > 40 || !/[a-z]/i.test(u.textContent)) continue;
    range.selectNodeContents(e); const pr = range.getBoundingClientRect();
    range.selectNodeContents(u); const ur = range.getBoundingClientRect();
    const lines = new Set([...range.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))).size;
    if (!(ur.top < pr.bottom && ur.bottom > pr.top)) continue;                          // the unit is on its own row below: a layout choice, not a drift
    const gap = ur.left - pr.right;
    if (gap > 16) out.unitGap.push(item(e, '"' + u.textContent.trim().slice(0, 24) + '" sits ' + Math.round(gap) + 'px after ' + t));
    else if (lines > 1) out.unitGap.push(item(e, 'the unit after ' + t + ' wraps onto ' + lines + ' lines'));
  }

  // things tilted at rest
  for (const e of document.querySelectorAll('body *')) {
    if (out.rotated.length >= 4) break;
    if (e.closest('svg') || !shown(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 32 || r.height < 16) continue;
    const s = styleOf(e);
    if (s.animationName !== 'none') continue;
    let deg = 0;
    if (s.rotate && s.rotate !== 'none') deg = parseFloat(s.rotate);
    else if (s.transform && s.transform.startsWith('matrix(')) { const [a, b] = s.transform.slice(7).split(',').map(Number); deg = (Math.atan2(b, a) * 180) / Math.PI; }
    if (Math.abs(deg) >= 1 && Math.abs(deg) <= 20) out.rotated.push(item(e, 'tilted ' + deg.toFixed(1) + '°'));
  }

  // placeholder text left on screen
  {
    const m = (document.body.innerText || '').match(/\b(shown here|lorem ipsum|placeholder text|your text here|tbd|item 1|todo:|coming soon|your company|john doe|jane doe)\b/i);
    if (m) out.placeholderText.push(item('page', '"' + m[0] + '"'));
  }

  // full-width bands of different backgrounds down the page
  {
    const grounds = new Set();
    for (const e of document.querySelectorAll('main > *, body > *, main > * > section')) {
      if (!shown(e)) continue;
      const r = e.getBoundingClientRect();
      const bg = styleOf(e).backgroundColor;
      if (r.width >= innerWidth * 0.95 && r.height >= 160 && alpha(bg) > 0.9) grounds.add(bg);
    }
    if (grounds.size >= 2) out.bands.push(item('page', (grounds.size + 1) + ' different full-width grounds'));
  }
  return out;
}

/* ── motion: what moves, how fast, and whether controls answer back ──────────────────────────────────────────── */
// Read from the page's own CSS and computed styles, so nothing is clicked and no state changes.
function motionAudit() {
  const out = { noHover: [], noPress: [], slow: [], layoutProps: [], scaleZero: [], loadCount: 0, loadSample: [], durations: [], hoverUngated: 0, hoverRules: 0, reduce: false, moving: 0, linkNoHover: 0, links: 0 };
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const sel = (el) => { const id = el.id ? '#' + el.id : ''; const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 26); return el.tagName.toLowerCase() + id + cls + (t ? ' "' + t + '"' : ''); };
  // the opacity of any CSS colour: rgb(), oklch(), lab(), color() and the rest (Chrome keeps OKLCH as OKLCH, so an
  // rgb-only reader called every Quiet colour transparent)
  const alpha = (c) => {
    if (!c || c === 'transparent') return 0;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return p[3] ?? 1; }
    const a = c.match(/\/\s*([\d.]+)(%?)\s*\)\s*$/);
    return a ? (a[2] ? +a[1] / 100 : +a[1]) : 1;
  };
  const LAYOUT = /^(width|height|min-width|min-height|max-width|max-height|top|right|bottom|left|inset|margin|margin-.*|padding|padding-.*)$/;

  // split a selector list on its top-level commas only: ':where(a, b):hover, c' is two selectors, not three
  const splitTop = (text) => { const parts = []; let depth = 0, cur = ''; for (const ch of text) { if (ch === '(') depth++; else if (ch === ')') depth--; if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch; } parts.push(cur); return parts; };
  // every style rule, with the conditions it sits under
  const hover = [], active = [], keyframes = [];
  const walk = (list, ctx) => {
    for (const r of list) {
      if (r.type === 7) { keyframes.push(r); continue; }
      const cond = r.conditionText || (r.media && r.media.mediaText) || '';
      if (/prefers-reduced-motion/.test(cond)) out.reduce = true;
      if (r.type === 1 && r.selectorText) {
        for (const part of splitTop(r.selectorText)) {
          if (part.includes(':hover')) hover.push({ part: part.trim(), gated: /hover:\s*hover/.test(ctx) });
          if (part.includes(':active')) active.push({ part: part.trim() });
        }
        if (/scale\(\s*0\s*\)|scale:\s*0\s*[;}]/.test(r.cssText)) out.scaleZero.push(r.selectorText.slice(0, 50));
      }
      if (r.cssRules) walk(r.cssRules, ctx + ' ' + cond);
    }
  };
  out.blind = 0;
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules, ''); } catch { if (!/fonts\.(googleapis|gstatic)|use\.typekit/.test(sheet.href || '')) out.blind++; } }
  out.hoverRules = hover.length;
  out.hoverUngated = hover.filter((h) => !h.gated).length;
  for (const k of keyframes) {
    const text = k.cssText;
    if (/scale\(\s*0\s*\)|scale:\s*0\s*[;}]/.test(text)) out.scaleZero.push('@keyframes ' + k.name);
    const props = [...text.matchAll(/[{;]\s*([a-z-]+)\s*:/g)].map((m) => m[1]).filter((p) => LAYOUT.test(p));
    if (props.length) out.layoutProps.push('@keyframes ' + k.name + ' animates ' + [...new Set(props)].slice(0, 3).join(', '));
  }
  // a rule on the control's own pseudo-element (a switch's knob) still answers for the control
  const strip = (part, pseudo) => part.replace(new RegExp(':' + pseudo, 'g'), '').replace(/::[\w-]+(\([^)]*\))?/g, '').replace(/:not\(\s*\)/g, '').trim();
  const answers = (el, list, pseudo) => list.some((h) => { try { const q = strip(h.part, pseudo); return q && el.matches(q); } catch { return false; } });

  // button-like controls must answer hover and press; text links must answer hover
  const boxed = (cs) => alpha(cs.backgroundColor) > 0.05 || (parseFloat(cs.borderTopWidth) > 0 && alpha(cs.borderTopColor) > 0.05);
  const controls = [...document.querySelectorAll('button, [role=button], a[href], input[type=submit], summary')].filter(visible).slice(0, 60);
  for (const el of controls) {
    const cs = getComputedStyle(el);
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    // the option already chosen (a segment, a tab, the current page): pressing it changes nothing, so it needn't answer a hover
    if (el.matches('[aria-checked="true"], [aria-selected="true"], [aria-pressed="true"], [aria-current]:not([aria-current="false"])')) continue;
    const er = el.getBoundingClientRect();
    if (er.right <= 4 || er.bottom + scrollY <= 4 || er.width <= 2 || er.height <= 2) continue; // parked off-screen until focused (skip links)
    const buttonLike = el.tagName !== 'A' || boxed(cs);
    const h = answers(el, hover, 'hover');
    if (buttonLike) {
      if (!h && out.noHover.length < 12) { el.setAttribute('data-antheo-nohover', String(out.noHover.length)); out.noHover.push(sel(el)); }
      if (!answers(el, active, 'active') && out.noPress.length < 8) out.noPress.push(sel(el));
    } else { out.links++; if (!h) out.linkNoHover++; }
  }

  // transitions and animations in use
  const durs = new Set();
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const td = cs.transitionDuration.split(',').map((d) => (d.trim().endsWith('ms') ? parseFloat(d) : parseFloat(d) * 1000));
    const tp = cs.transitionProperty.split(',').map((p) => p.trim());
    const max = Math.max(0, ...td);
    if (max > 0 && visible(el)) {
      out.moving++;
      const play = !!el.closest('[data-object]'); // an object's play keeps its own timing (antheo-motion, "When more motion is right")
      if (!play) td.filter((d) => d > 1).forEach((d) => durs.add(Math.round(d)));
      if (max > 400 && !play && !(max <= 800 && el.closest('[data-chart]')) && !tp.every((p) => /stroke-dash|^(inline-size|width)$/.test(p) && el.closest('svg, progress, [role=progressbar], [role=timer]')) && out.slow.length < 6) out.slow.push(sel(el) + ': ' + Math.round(max) + 'ms on ' + tp.slice(0, 3).join(', '));
      const bad = tp.filter((p) => LAYOUT.test(p));
      if (bad.length && out.layoutProps.length < 6) out.layoutProps.push(sel(el) + ' transitions ' + bad.slice(0, 3).join(', '));
    }
    if (cs.animationName !== 'none' && visible(el)) out.moving++;
  }
  out.durations = [...durs].sort((a, b) => a - b);
  // what is animating as the page arrives: finite CSS animations on visible things
  const arriving = document.getAnimations().filter((a) => a.animationName && a.effect && a.effect.getTiming().iterations !== Infinity && a.effect.target && visible(a.effect.target));
  const targets = [...new Set(arriving.map((a) => a.effect.target))];
  out.loadCount = targets.length;
  out.loadSample = targets.slice(0, 4).map(sel);
  return out;
}

/* ── stress: what real content and other languages do to the layout ────────────────────────────────────────── */
// Rewrites the live page (never the file): every visible text gets ~40% longer and accented, as a German or Finnish
// translation would; the first names, headings and values get one very long unbreakable word; or the whole page is
// set right-to-left. The craft checks then measure what broke.
function stressApply(mode) {
  if (mode === 'rtl') { document.documentElement.dir = 'rtl'; return; }
  const ACC = { a: 'á', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Å', E: 'É', I: 'Î', O: 'Ø', U: 'Ü', c: 'ç', n: 'ñ', y: 'ý' };
  const skip = (el) => !el || el.closest('script, style, noscript, svg, code, pre, [aria-hidden="true"]');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent.trim().length > 1 && !skip(n.parentElement)) nodes.push(n);
  let long = 0;
  for (const n of nodes) {
    const t = n.textContent;
    if (mode === 'long') {
      const grown = t.replace(/[aeiouAEIOUcny]/g, (ch) => ACC[ch] || ch);
      const words = grown.trim().split(/\s+/);
      // short labels grow most in translation (up to 100%), long text about 30%
      // up to 10 characters (a label) grows by 100%, longer text by about 40%
      const short = t.trim().length <= 10;
      const extra = short ? words.length : Math.max(1, Math.round(words.length * 0.4));
      n.textContent = grown.replace(/\s*$/, '') + (short ? '' : ' ') + (short ? grown.trim() : words.slice(0, extra).join(' ')) + (t.match(/\s*$/)[0] || '');
    } else if (mode === 'words') {
      const p = n.parentElement;
      if (long < 12 && /^(H[1-6]|STRONG|B|TD|TH|DT|DD|LABEL|SPAN|A|BUTTON|P|LI)$/.test(p.tagName) && t.trim().length < 40) {
        n.textContent = t.replace(/\S+/, (w) => w + 'Übersetzungsverwaltungsdienstleistungen');
        long++;
      }
    }
  }
  for (const input of document.querySelectorAll('input[type=text], input[type=email], input:not([type]), textarea')) {
    if (mode === 'words') input.value = 'Maximiliana Ottilie Wilhelmina von Hohenzollern-Sigmaringen';
  }
}

/* ── stress: forced colours (Windows contrast themes) drop every fill and shadow ─────────────────────────────── */
// Two passes on the same page. "mark", before forced colours: remember each control whose shape is drawn only by a
// fill or a shadow (no border, no outline, not drawn by the browser itself). "read", in forced colours: the ones that
// still have no edge are the ones that disappear. (The access probe makes the same check, with focus rings.)
function forcedScan(pass) {
  const lined = (c) => ['Top', 'Right', 'Bottom', 'Left'].some((d) => parseFloat(c[`border${d}Width`]) > 0 && !['none', 'hidden'].includes(c[`border${d}Style`])) || (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0);
  const edge = (el) => lined(getComputedStyle(el)) || ['::before', '::after'].some((p) => { const c = getComputedStyle(el, p); return c.content !== 'none' && c.content !== 'normal' && lined(c); });
  if (pass === 'read') return [...document.querySelectorAll('[data-antheo-fc]')].filter((el) => !edge(el)).map((el) => el.getAttribute('data-antheo-fc'));
  const sel = (el) => { const id = el.id ? '#' + el.id : ''; const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; const t = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 26); return el.tagName.toLowerCase() + id + cls + (t ? ' "' + t + '"' : ''); };
  for (const el of document.querySelectorAll('button, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], input:not([type=hidden]), select, textarea, a[class*=btn], a[class*=button]')) {
    const r = el.getBoundingClientRect(), c = getComputedStyle(el);
    if (r.width < 4 || r.height < 4 || c.visibility === 'hidden' || c.display === 'none' || +c.opacity < 0.05) continue;
    // the browser draws these itself: a tick box, a slider, and a field or select left with its native look
    const field = el.matches('select, textarea, input:not([type=button], [type=submit], [type=reset], [type=image])');
    if (/^(checkbox|radio|range|color|file)$/.test(el.type || '') || (field && /^(auto|menulist|menulist-button|textfield)$/.test(c.appearance))) continue;
    const drawn = c.backgroundColor !== 'rgba(0, 0, 0, 0)' || c.backgroundImage !== 'none' || c.boxShadow !== 'none';
    if (drawn && !edge(el)) el.setAttribute('data-antheo-fc', sel(el));
  }
  return [];
}

/* ── dark: does the dark theme have depth, or is it mud? ─────────────────────────────────────────────────────── */
function darkAudit() {
  const out = { melt: [], glare: null, tiers: null };
  // the same reader as measure(): any CSS colour to sRGB through the canvas, so OKLCH dark themes are judged too
  const parse = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    const cache = new Map();
    return (c) => {
      if (!c) return null;
      if (cache.has(c)) return cache.get(c);
      let v = null;
      const m = c.match(/^rgba?\(([^)]+)\)$/);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); v = { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }
      else if (c === 'transparent') v = { r: 0, g: 0, b: 0, a: 0 };
      else if (cx) {
        cx.fillStyle = '#010203'; cx.fillStyle = c;
        if (cx.fillStyle !== '#010203' || /^#010203$/i.test(c)) {
          cx.clearRect(0, 0, 1, 1); cx.fillRect(0, 0, 1, 1);
          const d = cx.getImageData(0, 0, 1, 1).data;
          const alpha = c.match(/\/\s*([\d.]+%?)\s*\)$/);
          v = { r: d[0], g: d[1], b: d[2], a: alpha ? (alpha[1].endsWith('%') ? parseFloat(alpha[1]) / 100 : +alpha[1]) : d[3] / 255 };
        }
      }
      cache.set(c, v);
      return v;
    };
  })();
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const sel = (el) => { const id = el.id ? '#' + el.id : ''; const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + id + cls; };
  // the color behind an element (first opaque background up the tree)
  const behind = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.95) return c; } return parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 }; };
  const vpArea = innerWidth * innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    if (out.melt.length >= 6 || !visible(el)) continue;
    const cs = getComputedStyle(el);
    const c = parse(cs.backgroundColor);
    if (!c || c.a < 0.95) continue;
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area < vpArea * 0.02 || r.width > innerWidth * 0.9) continue; // a card or panel, not the page band
    const under = behind(el);
    const step = ratio(c, under);
    const edged = ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(cs['border' + k + 'Width']) > 0 && (parse(cs['border' + k + 'Color'])?.a ?? 0) > 0.05) || /0px 0px 0px [1-9]/.test(cs.boxShadow);
    if (step > 1.0 && step < 1.12 && !edged) out.melt.push(sel(el) + ': ' + Math.round(r.width) + '×' + Math.round(r.height) + ' surface is only ' + step.toFixed(2) + ':1 from what is behind it, with no edge');
  }
  // text tiers: weight colors by how much text uses them
  const tiers = new Map();
  const bg = parse(getComputedStyle(document.body).backgroundColor) || parse(getComputedStyle(document.documentElement).backgroundColor);
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (own.length < 2 || !visible(el)) continue;
    const col = getComputedStyle(el).color;
    tiers.set(col, (tiers.get(col) || 0) + own.length);
  }
  const ranked = [...tiers.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => parse(c)).filter(Boolean);
  if (bg && ranked[0]) {
    const main = ratio(ranked[0], bg);
    if (main > 17) out.glare = main.toFixed(1);
    if (ranked[1]) { const second = ratio(ranked[1], bg); const hi = Math.max(main, second), lo = Math.min(main, second); if (lo / hi > 0.85 && Math.abs(lum(ranked[0]) - lum(ranked[1])) > 0.0001) out.tiers = [hi.toFixed(1), lo.toFixed(1)]; }
  }
  return out;
}

/* ── load: how soon the main content shows, and whether the page jumps while it loads ─────────────────────────── */
// Read from the browser's own buffered records, so everything since the navigation began is counted. LCP is the last
// largest-contentful-paint record. CLS is the worst burst of layout shifts (shifts under a second apart, five seconds
// at most), without the ones the browser marks as following a press or a key. Each shift names up to five elements
// that moved, so the finding can say which.
async function vitals() {
  const sel = (el) => { const id = el.id ? '#' + el.id : ''; const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 26); return el.tagName.toLowerCase() + id + cls + (t ? ' "' + t + '"' : ''); };
  const can = (type) => typeof PerformanceObserver === 'function' && (PerformanceObserver.supportedEntryTypes ?? []).includes(type);
  const read = async (type) => {
    if (!can(type)) return null;
    const got = [];
    const po = new PerformanceObserver((l) => got.push(...l.getEntries()));
    po.observe({ type, buffered: true });
    await new Promise((r) => setTimeout(r, 120)); // buffered records arrive in a task of their own
    got.push(...po.takeRecords());
    po.disconnect();
    return got;
  };
  const [paints, shifts] = await Promise.all([read('largest-contentful-paint'), read('layout-shift')]);
  const out = { lcp: null, cls: null, lcpElement: null, moved: [] };
  const last = paints?.[paints.length - 1];
  if (last) { out.lcp = Math.round(last.startTime); out.lcpElement = last.element ? sel(last.element) : last.url ? last.url.split('/').pop().slice(0, 60) : null; }
  if (shifts) {
    let worst = 0, burst = 0, first = 0, prev = 0;
    const moved = new Map(); // element → the furthest it moved, and when
    for (const e of shifts) {
      if (e.hadRecentInput) continue;
      if (!(burst > 0 && e.startTime - prev < 1000 && e.startTime - first < 5000)) { burst = 0; first = e.startTime; }
      burst += e.value;
      prev = e.startTime;
      worst = Math.max(worst, burst);
      for (const src of e.sources ?? []) {
        const node = src.node?.nodeType === 3 ? src.node.parentElement : src.node;
        if (!node?.tagName) continue;
        const dy = Math.round(src.currentRect.y - src.previousRect.y), dx = Math.round(src.currentRect.x - src.previousRect.x);
        const far = Math.max(Math.abs(dy), Math.abs(dx));
        if (far > (moved.get(node)?.far ?? 0)) moved.set(node, { far, value: e.value, text: `${sel(node)} moved ${far}px ${Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : 'sideways'}, ${Math.round(e.startTime)}ms into the load` });
      }
    }
    out.cls = Math.round(worst * 1000) / 1000;
    out.moved = [...moved.values()].sort((a, b) => b.value - a.value || b.far - a.far).slice(0, 6).map((m) => m.text);
  }
  return out;
}

/* ── run ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const chromium = await loadChromium();
let browser;
browser = await launchBrowser(chromium);
const findings = [];
const add = (area, severity, rule, items, fix) => { if (items && (items.length ?? items)) findings.push({ area, severity, rule, items: Array.isArray(items) ? [...new Set(items)] : [], fix }); };
const results = {};
const errors = [];
const missing = [];
// craft rules: [area, severity, rule, fix]
const CRAFT = {
  brokenWord: ['craft', 'high', 'a word broken mid-word', 'never overflow-wrap: anywhere on labels, values, buttons or headings: give the column room, stack the row, or white-space: nowrap; only strings people typed (.long-text) may break'],
  covered: ['craft', 'high', 'a bar covers the end of the page', 'give the content padding-bottom equal to the bar height, or keep the button in the flow after the last field'],
  seeThrough: ['craft', 'high', 'a see-through bar over content', 'an opaque background (the page ground) and a hairline on its edge; never a gradient or a fade'],
  stuckShort: ['craft', 'medium', 'a button stuck to the bottom of a short page', 'a page under a screen and a half keeps its button in the flow, after the last field'],
  headerEdge: ['craft', 'medium', 'the header is off the content edge', 'on a marketing page, put the header on the page column (.scene.flush) so its brand starts where the headings start'],
  outlined: ['craft', 'medium', 'cards with a visible outline', 'a card is a surface with a faint edge (about 5% of the ink) and a soft drop, never a border or a strong ring; emphasis is a deeper drop, not an outline (antheo-build, rule 4)'],
  hued: ['craft', 'medium', 'colour on too many things', 'colour only means "on" or "look here": a switch that is on, the chosen chip, a highlight tag; the logo mark, ticks, icons and avatars stay neutral (antheo-build, rule 8)'],
  unitGap: ['craft', 'high', 'a unit drifted from its number', 'one inline row: display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap (.figure); no min-width on the number'],
  rotated: ['craft', 'medium', 'tilted elements at rest', 'remove the rotation: decoration with no job (antheo-build, rule 12)'],
  placeholderText: ['craft', 'high', 'placeholder text on screen', 'replace it with the real value, or remove the element'],
  bands: ['craft', 'medium', 'bands of different backgrounds', 'one ground for the page; a second ground once at most, with a reason'],
  overflow: ['layout', 'high', 'horizontal scroll', 'let it wrap or shrink: min-width: 0 on flex/grid children, max-width: 100% on media, overflow-wrap: anywhere on long strings; never a fixed px width on a layout box'],
  broken: ['robustness', 'blocker', 'broken values on screen', 'a value leaked from code: compute it (a missing field gives NaN), fill the template, or replace the placeholder text'],
  dead: ['craft', 'high', 'a section with an empty quarter beside a full one', 'decide what that space is for: put the section\'s visual or its controls there, let the content span the grid, or centre a short statement. A left block with a bare right half is the commonest wide-screen failure'],
  vgap: ['craft', 'medium', 'a tall empty band inside a section', 'size sections with padding from the scale, not min-height: 100vh; centre content in a full-height hero or drop the min-height'],
  nearMiss: ['craft', 'high', 'near-miss alignment: side-by-side items that almost line up', 'give the pair the same structure (label, then control) and align them on one grid row with align-items: start or baseline; things line up exactly or differ on purpose, never by a few px'],
  lopsided: ['craft', 'high', 'lopsided padding inside a control', 'equal inline padding on both sides, with gap between a label and its icon; a badge sits beside or above a control, never inside one of its segments'],
  edges3: ['craft', 'medium', 'section headings start on three or more left edges', 'one container, one grid: every scene\'s heading starts on the same column line (or is centred); indent only by whole grid columns'],
  edges2: ['craft', 'low', 'section headings start on two left edges', 'check the second edge is a deliberate grid column; if it is just a different max-width or margin, align it to the first'],
  boxSpill: ['craft', 'high', 'a control spilling out of the shape that holds it', 'the row wrapped or overflowed: let the holder grow with its contents, or shrink the parts; render it with 1, 2 and many items (antheo-stress)'],
  spill: ['craft', 'high', 'text spilling out of its box', 'let the box grow (no fixed height or width), allow wrapping, or shorten the text; test with long words and translations'],
  clipped: ['craft', 'medium', 'text cut off with no ellipsis', 'text-overflow: ellipsis with a title/tooltip, or let it wrap'],
  gaps: ['craft', 'low', 'section spacing follows no rhythm', 'two or three section paddings (dense, regular, airy) from the scale, used on purpose'],
};
// a text field nobody can find: the same rule in light and, for fields that only fail there, in dark
const FIELD_EDGE = ['a field with no visible boundary: its edge and fill are under 3:1 (WCAG 1.4.11)', 'one line anyone can see: a 1px border, an underline or an inset shadow with no blur, at 3:1 against the surface (the style block\'s .field draws its bottom line in the third text tone), or a fill at 3:1; a faint well on its own is not a boundary'];
const hits = new Map(); // rule key → Map(item id → { detail, where: Set })
const hit = (key, items, where) => { for (const it of items ?? []) { if (!hits.has(key)) hits.set(key, new Map()); const m = hits.get(key); if (!m.has(it.id)) m.set(it.id, { detail: it.detail, where: new Set() }); m.get(it.id).where.add(where); } };
const full = (m) => {
    add('layout', 'high', 'side panel stops before the page ends', m.shortPanels, 'make it sticky (position: sticky; top: 0; height: 100dvh) or let the shell grid stretch it (min-height: 100dvh on the grid, align-self: stretch)');
    {
      add('access', 'high', 'text below contrast minimum', m.contrast, 'WCAG 2.2 1.4.3: 4.5:1 for text, 3:1 for 24px+ (or 18.66px bold)');
      // a colour the checker couldn't read is not a pass: it stays open until someone measures it
      add('access', 'high', 'contrast not measured: a text colour this checker could not read', m.unmeasured, 'measure these pairs with antheo-color/scripts/contrast.mjs, or waive with the measured ratio as the reason');
      add('access', 'medium', 'contrast not measured: text on an image or gradient', m.onImage, 'look at it in both themes, and measure the lightest and darkest spot behind the text with antheo-color/scripts/contrast.mjs');
      add('access', 'high', 'controls with no accessible name', m.unnamed, 'visible text, or aria-label on icon-only controls');
      add('access', 'high', 'form fields with no label', m.unlabeled, '<label for> tied to the field; placeholders are not labels');
      add('access', 'high', FIELD_EDGE[0], m.fieldEdge, FIELD_EDGE[1]);
      add('access', 'medium', 'placeholder used as the label', m.placeholderLabels, 'add a visible label above the field; keep the placeholder as an example');
      add('access', 'medium', 'images without alt', m.alt, 'describe what it shows, or alt="" when it is decoration');
      add('access', 'medium', 'heading structure', m.headings, 'one h1, then h2, h3 in order');
      add('access', 'high', 'a chart with no name: nobody using a screen reader learns what it shows', m.chartNoName, 'role="img" on the chart with an aria-label that says what it shows ("Invoiced by month: up 12% since March"), or a <title> in its SVG, or a <figure> with a <figcaption>, or the same data as a <table> in the same figure or section (antheo-data)');
      add('access', 'medium', 'chart series told apart by hue alone', m.chartHue, 'give the two series a second difference: 0.08 or more of OKLCH lightness, a dash pattern, a different marker shape, or a label at the end of each line; then look at it in greyscale (antheo-data)');
      if (!m.lang) add('access', 'low', 'no lang on <html>', ['<html>'], 'lang="en" (or the page language) so screen readers pronounce it right');
      if (!m.main) add('access', 'low', 'no <main> landmark', ['page'], 'wrap the page content in <main>');
      add('layout', 'medium', 'lines too long to read comfortably', m.longLines, 'cap text at about 66 characters: max-width: 66ch');
      add('layout', 'medium', 'body text under 13px', m.smallBody, 'app text 13px with a pointer and 15px on touch; pages people read 16px');
      if (m.smallShare > 0.35) add('layout', 'medium', `${Math.round(m.smallShare * 100)}% of the text is smaller than 12px`, ['most of the page'], 'the page reads small: app text 13px with a pointer, 15px on touch; reading pages 16px; 12px only for meta');
      add('layout', 'low', 'body line height under 1.3', m.tightLeading, 'body line-height 1.45 to 1.6');
      // four sizes; a fifth only when one of them is worn by nothing but figures (a data screen's numeral size). A
      // marketing page keeps its five (it adds a display size), with or without numerals
      if (m.sizes > (m.figureSizes.length || m.character.marketing ? 5 : 4)) add('consistency', 'medium', `${m.sizes} text sizes on one screen`, [`${m.sizeList.join(', ')}px${m.figureSizes.length ? ` (only numerals at ${m.figureSizes.join(', ')}px)` : ''}`], 'an app screen uses four text sizes, and a data screen may add one numeral size (five); a marketing page five: take them from the style block (antheo-build, rule 1)');
      if (m.families.length > 3) add('consistency', 'medium', `${m.families.length} font families`, m.families, 'one family for text, one optional for display, one mono');
      if (m.weights > 2) add('consistency', 'medium', `${m.weights} font weights`, [m.weightList.join(', ')], 'two weights: one for text, one for titles, labels and buttons (antheo-build, rule 2)');
      if (m.colors > 10) add('consistency', 'medium', `${m.colors} different text colors`, [`${m.colors} colors`], 'text needs 3 to 4 roles: default, muted, accent, on-accent');
      { // a radius worn only by a dialog or a sheet, 16px or less, is neither a fourth size nor a big corner (the style
        // block's phone sheet is 14px): tag, control, card and a sheet read as three sizes at every width
        const sheet = new Set(m.sheetRadii);
        const rs = [...new Set(m.radiiList.filter((r) => !sheet.has(r)).map((r) => (/%/.test(r) ? 999 : parseFloat(r))).filter((v) => v > 0 && v < 100))].sort((x, y) => x - y);
        if (rs.length > 3) add('consistency', 'medium', `${rs.length} corner sizes`, [rs.join(', ') + 'px'], 'three corner sizes: 10px cards, 6px controls, 4px tags; fully round only for switches and avatars; a dialog or a sheet may have its own, up to 16px (antheo-build, rule 6)');
        if (rs.length && rs[rs.length - 1] > 12) add('craft', 'medium', `corners up to ${rs[rs.length - 1]}px`, [`${rs[rs.length - 1]}px`], 'big round corners read as generated: cards 10px at most; only a dialog or a sheet goes further, to 16px'); }
      if (m.spacingOff > 0.2) add('consistency', 'low', `${Math.round(m.spacingOff * 100)}% of spacing off the 4px grid`, m.offSamples, 'take every gap and padding from one spacing scale');
      if (m.strong > 2) add('consistency', 'medium', `${m.strong} strong filled buttons in the first screen`, [`${m.strong} buttons`], 'one primary action per view; the rest secondary or quiet');
      if (m.transitionAll) add('motion', 'low', `${m.transitionAll} elements use transition: all`, [`${m.transitionAll} elements`], 'name the properties: transform, opacity, background-color');
      add('robustness', 'high', 'script errors', errors, 'fix the errors in the console');
      add('robustness', 'high', 'a file the page asks for is missing', missing, 'fix the address or add the file: a missing script or stylesheet breaks the page, a missing image leaves a hole');
      add('robustness', 'high', 'a style reads a variable nobody defined', m.undefinedVars, 'define it, or paste the style block first: the whole declaration is dropped, so a transition that reads it does not run and the thing jumps');
      add('character', 'medium', 'a framework palette, unchanged', m.swatches, 'every colour comes from the style block or the project tokens; search the build for palette names');
      add('consistency', 'high', 'big numbers that read as two words', m.splitNumbers, 'drop tabular-nums on standalone figures (use proportional-nums); keep tabular only in columns and counters');
      const c = m.character;
      const art = 'antheo-direction';
      if (c.eyebrows >= 3) add('character', 'low', `${c.eyebrows} uppercase labels sitting above headings`, [`${c.eyebrows} eyebrows`], 'let claim headings stand alone; a mono index (02 / 06) only where order matters');
      add('character', 'medium', 'gradient text', c.gradientText, 'flat ink or one flat accent; emphasis through words');
      if (c.glass >= 3) add('character', 'low', `${c.glass} frosted-glass panels`, [`${c.glass} panels`], 'solid surfaces; blur only for floating chrome over media');
      if (!c.marketing && c.costume) {
        const look = 'antheo-components references/look.md';
        add('character', 'medium', 'a serif or display face inside the UI (costume)', c.costume.serif, `one grotesk for the whole component or screen; a 15/550 title (${look})`);
        add('character', 'medium', 'dashed or dotted borders (costume)', c.costume.dashed, 'hairlines between rows; a band or sunken card between sections; dashes only on a drag target while dragging');
        add('character', 'low', 'uppercase tracked labels', c.costume.tracked, 'sentence case at 12px in the second text tone');
        add('character', 'medium', 'tinted panels: colour on the chrome', c.costume.tinted, 'white surface (0.215 in dark), a band one step off it, chroma ≤ 0.01; colour only from content');
        add('character', 'medium', 'texture or pattern on a panel (costume)', c.costume.texture, 'a flat surface; the subject belongs in the content and the moment, not the ground');
      }
    }
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));
  // a failed request is named by its address under "a file the page asks for is missing", never repeated as an
  // anonymous console line
  page.on('console', (m) => m.type() === 'error' && !/^Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 120)));
  // the icon a browser asks for by itself is not something the page asked for
  const BROWSER_ASKS = /\/(favicon\.ico|apple-touch-icon[\w-]*\.png)(\?|$)/;
  const short = (u) => (u.startsWith('file:') ? u.split('/').slice(-2).join('/') : u.replace(/^https?:\/\/[^/]+/, '')).slice(0, 100);
  // an image that failed is reported where it sits on the page ("broken images"), so not here as well
  const ours = (r) => r.url() !== url && !BROWSER_ASKS.test(r.url()) && r.resourceType() !== 'image';
  page.on('response', (r) => { if (r.status() >= 400 && ours(r.request())) missing.push(`${r.status()} ${short(r.url())}`); });
  page.on('requestfailed', (r) => { if (ours(r) && !/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) missing.push(`did not load: ${short(r.url())}`); });
  const nearest = (t) => widths.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
  const main = nearest(1280), phone = nearest(390), widest = Math.max(...widths);
  const load = async (width, theme) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    // a page that didn't load (a stopped server, a 404, a missing file) is a tool error, never measured as if it were
    // the page: a blank error page only earns medium findings and would pass
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => ({ failed: String(e.message || e).split('\n')[0] }));
    if (res?.failed) { loadFailed = res.failed; throw new Error(loadFailed); }
    if (res && typeof res.status === 'function' && res.status() >= 400) { loadFailed = `HTTP ${res.status()}`; throw new Error(loadFailed); }
    await page.waitForTimeout(450);
  };
  if (shots) mkdirSync(shots, { recursive: true });
  let lightBg = null, lightFp = null;
  // the colours of the first 300 visible elements: a page can keep its body and theme only its components (light-dark())
  const fingerprint = () => [...document.querySelectorAll('body *')].filter((e) => e.getClientRects().length).slice(0, 300).map((e) => { const c = getComputedStyle(e); return c.backgroundColor + c.color; }).join('|');
  for (const theme of flag('no-dark') === undefined ? ['light', 'dark'] : ['light']) {
    if (theme === 'dark') {
      await load(main, 'dark');
      const info = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, scheme: `${document.querySelector('meta[name="color-scheme"]')?.content ?? ''} ${getComputedStyle(document.documentElement).colorScheme}` }));
      results.dark = { supported: info.bg !== lightBg || (await page.evaluate(fingerprint)) !== lightFp };
      if (!results.dark.supported) {
        // one theme is fine when it is declared; undeclared, a dark-mode visitor gets default dark form controls on a light page
        if (!/only|^\s*light\s+light\s*$|^\s*light\s*$/.test(info.scheme)) add('craft', 'low', 'no dark theme, and the page does not say it is light-only', ['<html>'], 'ship a dark theme, or declare color-scheme: only light on :root');
        break;
      }
    }
    for (const width of widths) {
      await load(width, theme);
      const where = `${width}${theme === 'dark' ? ' dark' : ''}`;
      const c = await page.evaluate(craft);
      for (const key of Object.keys(CRAFT)) hit(key, c[key], where);
      if (theme === 'light' && width === main) {
        const m = await page.evaluate(measure, kind); results[width] = m; lightBg = m.bg; lightFp = await page.evaluate(fingerprint); full(m);
        const mo = await page.evaluate(motionAudit);
        // rules can be unreadable (a linked sheet on file://, another origin), so confirm with a real hover
        // the control, its pseudo-elements and its first 12 descendants: a hover can show on a fill or label inside it
        const look = (el) => {
          const one = (c) => [c.backgroundColor, c.backgroundImage, c.color, c.borderTopColor, c.boxShadow, c.textDecorationLine, c.textDecorationThickness, c.transform, c.scale, c.translate, c.opacity, c.filter, c.outlineStyle].join('|');
          return [el, ...[...el.querySelectorAll('*')].slice(0, 12)].map((n) => one(getComputedStyle(n)) + one(getComputedStyle(n, '::before')) + one(getComputedStyle(n, '::after'))).join('#');
        };
        const still = [];
        for (let i = 0; i < mo.noHover.length; i++) {
          const el = await page.$(`[data-antheo-nohover="${i}"]`);
          if (!el) continue;
          try {
            const before = await el.evaluate(look);
            await el.hover({ timeout: 1500 });
            await page.waitForTimeout(260);
            if ((await el.evaluate(look)) === before) still.push(mo.noHover[i]);
          } catch { /* covered or off-screen: cannot be hovered, so it is not judged */ }
        }
        await page.mouse.move(2, 2);
        mo.noHover = still;
        if (mo.blind) mo.noPress = []; // press rules cannot be read from an unreadable sheet, and pressing would change the page
        results.motion = mo;
        add('motion', 'high', 'buttons that do not answer a hover', mo.noHover, 'every control shows it can be pressed: a step darker or lighter on :hover, inside @media (hover: hover)');
        add('motion', 'medium', 'buttons with no press feedback', mo.noPress, ':active { scale: 0.97 } (or a step darker) at --dur-instant, so a press is felt');
        if (mo.links >= 3 && mo.linkNoHover / mo.links > 0.5) add('motion', 'low', `${mo.linkNoHover} of ${mo.links} text links do not change on hover`, [`${mo.linkNoHover} links`], 'underline, thicken the underline or change color on :hover');
        add('motion', 'medium', 'interface motion slower than 400ms', mo.slow, 'use the duration tokens: interface motion up to --dur-slow (300ms), page and shared-element moves --dur-page (400ms); only a rare, deliberate moment runs longer');
        add('motion', 'medium', 'animating layout properties', mo.layoutProps, 'animate transform and opacity; for height use grid-template-rows 0fr → 1fr or interpolate-size');
        add('motion', 'medium', 'something grows from nothing (scale 0)', [...new Set(mo.scaleZero)], 'start at --scale-pop (0.96) or --scale-tip (0.98) with opacity 0; badges from 0.6 at the least');
        if (mo.loadCount > 6) add('motion', 'medium', `${mo.loadCount} elements animate as the page loads`, mo.loadSample, 'one orchestrated entrance (the hero or the signature); everything else is simply there');
        if (mo.durations.length > 6) add('motion', 'low', `${mo.durations.length} different transition durations`, [mo.durations.join(', ') + 'ms'], 'use the six duration tokens: 100, 150, 200, 250, 300, 400ms');
        if (mo.moving > 0 && !mo.reduce && !mo.blind) add('motion', 'medium', 'motion with no reduced-motion rule', ['no @media (prefers-reduced-motion) in the page'], 'under reduce: keep fades and color, remove travel, scale and loops');
        if (mo.moving === 0) add('motion', 'medium', 'nothing on the page moves: every change will jump', ['no transitions or animations'], 'press and hover feedback on controls; enter and exit for anything that appears');
        if (mo.blind) console.error(`note: ${mo.blind} stylesheet(s) could not be read by the check (linked from file:// or another origin); press-feedback and reduced-motion rules in them were not judged`);
        if (mo.hoverRules >= 4 && mo.hoverUngated / mo.hoverRules > 0.5) add('motion', 'low', `${mo.hoverUngated} of ${mo.hoverRules} hover styles also fire on touch screens`, [`${mo.hoverUngated} rules`], 'wrap hover styles in @media (hover: hover)');
      }
      if (theme === 'light' && width === phone && phone <= 480 && phone !== main) { const m = await page.evaluate(measure, kind); add('access', 'medium', 'touch targets under 24px at phone width', m.targets, 'min 24×24 (WCAG 2.2 2.5.8), 44×44 for primary touch controls'); }
      if (theme === 'dark' && width === main) {
        const m = await page.evaluate(measure, kind); add('access', 'high', 'text below contrast minimum in dark mode', m.contrast, 'tune the dark palette separately; it is not an inversion');
        const inLight = new Set((results[main]?.fieldEdge ?? []).map((i) => i.split(' best ')[0]));
        add('access', 'high', `${FIELD_EDGE[0]} in dark mode`, m.fieldEdge.filter((i) => !inLight.has(i.split(' best ')[0])), FIELD_EDGE[1]);
        const d = await page.evaluate(darkAudit);
        add('craft', 'medium', 'dark mode: raised surfaces melt into the page', d.melt, 'step each surface up 0.03+ in lightness (--surface, --raised) and give raised things the faint edge: box-shadow: var(--edge)');
        if (d.glare) add('craft', 'low', `dark mode: main text glares at ${d.glare}:1`, ['body text'], 'keep dark-mode text at 10 to 16.5:1 (the style block sets --text to L 0.95)');
        if (d.tiers) add('craft', 'low', `dark mode: the two most-used text colors are almost equally bright (${d.tiers[0]}:1 and ${d.tiers[1]}:1)`, ['text tiers'], 'muted text 4.5 to 8:1 so the hierarchy survives in dark');
      }
      if (shots && [phone, main, widest].includes(width)) {
        await page.screenshot({ path: join(shots, `${width}-${theme}.png`) });
        if (width === main) await page.screenshot({ path: join(shots, `${width}-${theme}-full.png`), fullPage: true });
      }
    }
  }
  // stress: the same craft checks on the page rewritten as a long translation, with long words, and right-to-left
  if (STRESS) {
    const SCRIPT = { long: 'long translation (labels +100%, text +40%, accents)', words: 'very long names and words', rtl: 'right-to-left' };
    const before = new Set([...hits.entries()].flatMap(([k, m]) => [...m.keys()].map((id) => k + '|' + id)));
    for (const mode of ['long', 'words', 'rtl']) {
      for (const width of [nearest(390), nearest(1280)]) {
        await load(width, 'light');
        await page.evaluate(stressApply, mode);
        await page.waitForTimeout(150);
        const c = await page.evaluate(craft);
        const found = [];
        for (const key of ['overflow', 'spill', 'clipped']) for (const it of c[key] ?? []) if (!before.has(key + '|' + it.id)) found.push(`${it.id}: ${it.detail}`);
        add('robustness', 'high', `breaks under stress: ${SCRIPT[mode]} at ${width}px`, found.slice(0, 8), mode === 'rtl'
          ? 'use logical properties (margin-inline-start, inset-inline-end, text-align: start), flex/grid order instead of absolute left/right, and mirror direction icons; see antheo-layout'
          : 'let it wrap and grow: no fixed widths or heights on text boxes, min-width: 0 on flex children, overflow-wrap: anywhere on names and user text, room for 40% longer labels');
        if (shots && width === nearest(1280)) await page.screenshot({ path: join(shots, `stress-${mode}-${width}.png`), fullPage: true });
      }
    }
    // and one pass in forced colours, at the main width: what was drawn with a fill or a shadow alone is gone
    await load(nearest(1280), 'light');
    await page.evaluate(forcedScan, 'mark');
    await page.emulateMedia({ forcedColors: 'active' });
    await page.waitForTimeout(200);
    const gone = await page.evaluate(forcedScan, 'read');
    if (shots) await page.screenshot({ path: join(shots, `stress-forced-colors-${nearest(1280)}.png`), fullPage: true });
    await page.emulateMedia({ forcedColors: 'none' });
    add('access', 'high', 'disappears in forced colours: a control with no edge left', gone.slice(0, 8), 'border: 1px solid transparent on every control (it becomes the system\'s edge colour) and focus drawn with outline, never box-shadow alone; or give it an edge inside @media (forced-colors: active)');
  }
  await page.close();
  // one finding per craft rule, each element once, with every size it was seen at
  const sizes = (set) => { const l = [...set].filter((w) => !w.endsWith('dark')).map(Number).sort((a, b) => a - b), d = [...set].filter((w) => w.endsWith('dark')).map((w) => parseInt(w, 10)).sort((a, b) => a - b); return [l.length ? `${l.join(', ')}px` : '', d.length ? `dark ${d.join(', ')}px` : ''].filter(Boolean).join('; '); };
  for (const [key, m] of hits) { const [area, sev, rule, fix] = CRAFT[key]; add(area, sev, rule, [...m].map(([id, v]) => `${id}: ${v.detail} (at ${sizes(v.where)})`), fix); }

  // load measures: a first visit (a new page has an empty cache) at the main width, in light
  {
    const page = await browser.newPage({ viewport: { width: main, height: main < 600 ? 844 : 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(450);
    const v = await page.evaluate(vitals).catch(() => null);
    await page.close();
    results.vitals = { lcp: v?.lcp ?? null, cls: v?.cls ?? null, lcpElement: v?.lcpElement ?? null };
    if (v?.cls > 0.1) add('layout', 'medium', `the page jumps while it loads (CLS ${v.cls.toFixed(2)})`, v.moved.length ? v.moved : ['the elements that moved are no longer on the page'], 'reserve the room before the content arrives: width and height (or aspect-ratio) on images, video and embeds; a min-height or a skeleton of the final size for anything filled in after load; a fallback font with matched metrics. Put late content below what is on screen, never above it. Good is 0.1 or less');
    if (v?.lcp > 2500) add('robustness', 'low', `the main content shows late (LCP ${(v.lcp / 1000).toFixed(1)}s)`, [v.lcpElement ?? 'the largest element in the first screen'], 'a local number is a floor: the real one is measured on the deployed page, on a mid-range phone and a slow connection (good is 2.5s or less). Send the largest element in the first HTML, not after a script; preload its image or font and never lazy-load it. A dev server that compiles on request reads high, so check a production build before acting on this');
  }

  // keyboard: does focus show?
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    // a ring that fades in over 150ms reads as unchanged the instant after blur; judge the end state, not the fade
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' }).catch(() => {});
    const invisible = [];
    let reached = 0;
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        // the ring can be on the element, on a wrapper that reacts to :focus-within (a field's well around an input
        // and its prefix), on the drawn box beside a visually hidden native checkbox or radio, or on the row a tree
        // item or grid cell draws as its first child
        const near = [el, el.parentElement, el.parentElement?.parentElement, el.nextElementSibling, el.firstElementChild].filter((n) => n && n !== document.body);
        // snapshot as strings while focused: getComputedStyle is live, so reading it again after blur would compare
        // the blurred style with itself
        const snap = (n) => { const c = getComputedStyle(n); return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.backgroundColor, c.borderTopColor].join('|'); };
        // focus shows only if something changes when focus arrives: a shadow or ring the control wears at rest (every
        // raised button has one) is not a focus indicator
        const focused = near.map(snap);
        const label = `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 24)}"`;
        el.blur();
        const changed = near.some((n, i) => snap(n) !== focused[i]);
        el.focus({ focusVisible: true });
        return { label, visible: changed };
      });
      if (!r) continue;
      reached++;
      if (!r.visible) invisible.push(r.label);
    }
    // a read-only page (a report, a printed view) has nothing to reach; it is a defect only when something looks pressable
    const pressable = !reached && await page.evaluate(() => [...document.querySelectorAll('body *')].some((e) => e.hasAttribute('onclick') || getComputedStyle(e).cursor === 'pointer')).catch(() => true);
    if (!reached && pressable) add('access', 'high', 'keyboard cannot reach anything', ['Tab reaches no control, though something looks pressable'], 'use real <button>, <a href>, <input>; never remove them from the tab order');
    add('access', 'high', 'no visible focus', invisible, ':focus-visible { outline: 2px solid var(--focus); outline-offset: 2px } (or the ring on the wrapper that draws the field, with :focus-within)');
    await page.close();
  }

  // reduced motion: endless animation must stop
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(600);
    const inf = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.getTiming?.().iterations === Infinity && a.playState === 'running').map((a) => a.effect?.target?.tagName?.toLowerCase() + (a.effect?.target?.className ? `.${String(a.effect.target.className).split(' ')[0]}` : '')).slice(0, 5));
    add('motion', 'medium', 'endless animation keeps running with reduced motion on', inf, '@media (prefers-reduced-motion: reduce) { …: animation: none }; keep fades, drop travel, spin and zoom');
    await page.close();
  }

} catch (e) {
  if (!loadFailed) throw e;
} finally {
  await browser.close();
}
if (loadFailed) { console.error(`Could not load ${url}: ${loadFailed}. Nothing was checked.`); process.exit(4); }

/* ── score and report ───────────────────────────────────────────────────────────────────────────────────────── */
// with --preset none, the Quiet look's own rules and the costume tells step aside; nothing universal is dropped
if (preset === 'none') for (let i = findings.length - 1; i >= 0; i--) if (findings[i].area === 'character' || QUIET_ONLY.test(findings[i].rule)) findings.splice(i, 1);
const WEIGHT ={ access: 25, layout: 15, craft: 30, consistency: 10, motion: 10, robustness: 10 }; // "character" findings (tells) are listed, never scored
const COST = { blocker: 100, high: 12, medium: 6, low: 3 };
const scores = Object.fromEntries(Object.keys(WEIGHT).map((a) => {
  const lost = findings.filter((f) => f.area === a).reduce((s, f) => s + COST[f.severity] * Math.min(3, Math.max(1, Math.ceil(f.items.length / 3))), 0);
  return [a, Math.max(0, 100 - lost)];
}));
// a blocker is something a person sees as broken at a glance: the page cannot pass, whatever else it gets right
const blocked = findings.some((f) => f.severity === 'blocker');
// serious findings cap the score: a page with a broken control cannot read as "85, nearly there"
const highs = findings.filter((f) => f.severity === 'high').length;
const cap = blocked ? 49 : highs >= 5 ? 59 : highs >= 3 ? 69 : highs >= 1 ? 79 : 100;
const overall = Math.min(cap, Math.round(Object.entries(WEIGHT).reduce((s, [a, w]) => s + (scores[a] * w) / 100, 0)));
const mediums = findings.filter((f) => f.severity === 'medium').length;
const verdict = blocked ? 'BROKEN: fix the blockers' : highs ? `NOT READY: ${highs} serious finding${highs > 1 ? 's' : ''}` : mediums ? `ALMOST: ${mediums} medium finding${mediums > 1 ? 's' : ''} left` : 'CLEAN: no measured defects (now look at it)';
const order = { blocker: -1, high: 0, medium: 1, low: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);

if (!flag('quiet')) {
  console.log(`\nAntheo page check: ${url}`);
  console.log(`score ${overall}/100  (access ${scores.access} · layout ${scores.layout} · craft ${scores.craft} · consistency ${scores.consistency} · motion ${scores.motion} · robustness ${scores.robustness})`);
  console.log(`verdict: ${verdict}`);
  console.log(`checked at ${widths.join(', ')}px, light${results.dark?.supported ? ' and dark' : ''}${shots ? `; screenshots in ${shots}` : ''}`);
  console.log('100 means no measured defect, not a good design: open the screenshots (--shots) and look before you call it done.');
  console.log(preset === 'none' ? 'preset: none (the project\'s own look is not judged; universal checks only)' : 'preset: Quiet (also judges the Antheo Quiet look; --preset none for a project with its own system or a requested direction)');
  if (flag('no-dark') !== undefined) console.log('WARNING: dark mode was not checked (--no-dark). People with a dark system setting will see a theme nobody looked at.');
  if (results.dark) console.log(`dark theme: ${results.dark.supported ? 'yes' : 'none found'}`);
  if (results.vitals) console.log(`load, measured here on a first visit: LCP ${results.vitals.lcp === null ? 'not measured' : `${results.vitals.lcp}ms`} · CLS ${results.vitals.cls === null ? 'not measured' : results.vitals.cls.toFixed(2)} (a floor: the real numbers come from the deployed page)`);
  if (!findings.length) console.log('\nNo findings. Still look at it at 390px and in dark mode yourself.');
  for (const f of findings) {
    console.log(`\n[${f.severity}] ${f.area}: ${f.rule}`);
    for (const i of f.items.slice(0, 6)) console.log(`   - ${i}`);
    if (f.items.length > 6) console.log(`   … and ${f.items.length - 6} more`);
    console.log(`   fix: ${f.fix}`);
  }
}
const json = flag('json');
if (json && json !== true) writeFileSync(json, JSON.stringify({ url, preset, overall, verdict, scores, findings, vitals: results.vitals, dark: results.dark, motion: results.motion }, null, 2));
if (flag('quiet')) console.log(JSON.stringify({ overall, verdict, highs, mediums, scores }));

// Chrome, then Edge, then Playwright's own Chromium; one clear line if none is installed. (The same function is in every
// Antheo tool that opens a browser; tests/self-test.mjs keeps the copies identical.)
async function launchBrowser(chromium) {
  for (const options of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { return await chromium.launch(options); } catch { /* try the next one */ }
  }
  console.error('No browser found. Install Chrome or Edge, or run: npx playwright install chromium');
  process.exit(2);
}
