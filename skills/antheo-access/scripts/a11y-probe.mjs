#!/usr/bin/env node
/*
 * Antheo access probe: drives a page the way a keyboard, high-contrast, low-vision and zoom user would, and reports
 * what breaks. Every finding names the element and the fix. It cannot judge screen-reader wording or colour contrast;
 * antheo-access/SKILL.md lists what to check by hand.
 *
 *   node a11y-probe.mjs http://localhost:3000/settings
 *   node a11y-probe.mjs ./signup.html --json out.json
 *   node a11y-probe.mjs <url> --max-tabs 150 --no-triggers --quiet
 *   node a11y-probe.mjs <url> --allow-writes     (let the presses send what they send; see Writes below)
 *
 * Needs playwright-core (npm i -D playwright-core) and Chrome or Edge (tries channel "chrome" first).
 * Run it from the project folder so `playwright` resolves. Closes the browser when done, always.
 *
 * Checks:  1 Tab order (names, roles, positions, backwards jumps, invisible/hidden focus, obscured focus, traps)
 *          2 Triggers (dialog, aria-haspopup, aria-expanded): Enter opens, focus moves in, Escape closes, focus returns
 *          3 forced-colors: active (controls whose boundary disappears)
 *          4 WCAG 1.4.12 text-spacing override (clipped or overlapping text)
 *          5 Reflow at 320px, 320x256 (400% zoom) and 640px (200%), horizontal scroll, zoom lock
 *          6 Landmarks, headings, live regions, lang, title, skip link, reduced-motion loops
 *          7 Controls that do nothing: each enabled button is pressed once; no change, focus move, navigation or
 *            request means it is wired to nothing (links and submits are cancelled; skip with --no-triggers)
 * Verdict:  BROKEN (any blocker) · NOT READY (any serious or moderate finding) · CLEAN
 *
 * Writes: the probe presses real buttons, and on a live app a real Delete or Send would fire. So while it runs, every
 * request the page makes that is not a GET, HEAD or OPTIONS is held back: stopped before it leaves the browser, named
 * in one line at the end and listed in the JSON (heldBack). The press that tried to send it counts as answered, and
 * service workers are off so none can send it behind the probe. --allow-writes lets every request through: use it only
 * on a page whose data you can lose. Not held back either way: a GET that changes data, and messages on a WebSocket.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--json', '--max-tabs'];
const target = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const flag = (name) => { const i = argv.indexOf(`--${name}`); return i < 0 ? undefined : argv[i + 1] ?? true; };
if (!target) {
  console.error('usage: node a11y-probe.mjs <url or html file> [--json out.json] [--max-tabs 200] [--no-triggers] [--allow-writes] [--quiet]');
  process.exit(2);
}
// a local file may carry a query or hash (page.html?state=error): keep it out of the path
const [, filePart, tail = ''] = /^https?:|^file:/.test(target) ? [null, target] : target.match(/^([^?#]*)(.*)$/);
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(filePart)).href + tail;
const MAX_TABS = Number(flag('max-tabs')) || 200;
const jsonOut = typeof flag('json') === 'string' ? resolve(flag('json')) : null;
const quiet = !!flag('quiet');
const allowWrites = !!flag('allow-writes');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

/* ── helpers that live inside the page (installed as window.__p) ─────────────────────────────────────────────── */
function helpers() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const cs = (el, pseudo) => getComputedStyle(el, pseudo);
  const sel = (el) => {
    if (!el || !el.tagName) return String(el);
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const t = clean(el.innerText || el.getAttribute('aria-label') || el.value || '').slice(0, 28);
    return `${el.tagName.toLowerCase()}${id}${cls}${t ? ` "${t}"` : ''}`;
  };
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const isHiddenByCss = (el) => { const s = cs(el); return s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse'; };
  const visible = (el) => {
    if (!el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 && r.height <= 0) return false;
    for (let n = el; n; n = n.parentElement) {
      const s = cs(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      if (n.hasAttribute('inert')) return false;
      if (n.tagName === 'DETAILS' && !n.open && n !== el && !(el.tagName === 'SUMMARY' && el.parentElement === n)) {
        const sum = [...n.children].find((c) => c.tagName === 'SUMMARY'); if (!sum || !sum.contains(el)) return false;
      }
    }
    return true;
  };
  const clipped = (el) => { // visually-hidden pattern: clip, 1px box, or off-screen text
    const s = cs(el); const r = el.getBoundingClientRect();
    return (r.width <= 2 && r.height <= 2) || s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)' || +s.opacity === 0 || r.right < 0 || r.bottom + scrollY < 0;
  };
  const IMPLICIT = { a: (e) => (e.hasAttribute('href') ? 'link' : 'generic'), button: () => 'button', summary: () => 'button', select: (e) => (e.multiple || e.size > 1 ? 'listbox' : 'combobox'), textarea: () => 'textbox', img: (e) => (e.getAttribute('alt') === '' ? 'presentation' : 'img'), nav: () => 'navigation', main: () => 'main', aside: () => 'complementary', dialog: () => 'dialog', ul: () => 'list', ol: () => 'list', li: () => 'listitem', table: () => 'table', form: () => 'form', output: () => 'status', progress: () => 'progressbar', meter: () => 'meter', details: () => 'group', fieldset: () => 'group', h1: () => 'heading', h2: () => 'heading', h3: () => 'heading', h4: () => 'heading', h5: () => 'heading', h6: () => 'heading', header: () => 'banner', footer: () => 'contentinfo', search: () => 'search', hr: () => 'separator' };
  const role = (el) => {
    const r = (el.getAttribute('role') || '').split(/\s+/)[0];
    if (r) return r;
    const t = el.tagName.toLowerCase();
    if (t === 'input') {
      const ty = (el.getAttribute('type') || 'text').toLowerCase();
      return { checkbox: 'checkbox', radio: 'radio', range: 'slider', button: 'button', submit: 'button', reset: 'button', image: 'button', search: 'searchbox', number: 'spinbutton', file: 'button', color: 'button' }[ty] || (el.hasAttribute('list') ? 'combobox' : 'textbox');
    }
    return IMPLICIT[t] ? IMPLICIT[t](el) : 'generic';
  };
  const byIds = (ids) => (ids || '').split(/\s+/).map((i) => document.getElementById(i)).filter(Boolean);
  const textOf = (node, ref, top) => {
    if (node.nodeType === 3) return node.nodeValue;
    if (node.nodeType !== 1) return '';
    const el = node;
    if (!ref && (isHiddenByCss(el) || el.getAttribute('aria-hidden') === 'true')) return '';
    if (!top) { const lab = el.getAttribute('aria-label'); if (lab && clean(lab)) return ` ${lab} `; }
    const t = el.tagName.toLowerCase();
    if (t === 'img') return ` ${el.getAttribute('alt') || ''} `;
    if (t === 'svg') { const ti = el.querySelector(':scope > title'); return ti ? ` ${ti.textContent} ` : ''; }
    if (t === 'input' && /^(button|submit|reset)$/.test(el.type)) return ` ${el.value || (el.type === 'submit' ? 'Submit' : el.type === 'reset' ? 'Reset' : '')} `;
    if (t === 'input' || t === 'textarea') return ` ${el.value || ''} `;
    if (t === 'select') return ` ${el.selectedOptions[0]?.textContent || ''} `;
    let out = '';
    const before = cs(el, '::before').content, after = cs(el, '::after').content;
    const pc = (c) => (c && c !== 'none' && c !== 'normal' ? c.replace(/^["']|["']$/g, '') : '');
    out += pc(before);
    for (const c of el.childNodes) out += textOf(c, ref, false);
    out += pc(after);
    const d = cs(el).display;
    return /block|flex|grid|list-item|table/.test(d) ? ` ${out} ` : out;
  };
  // simplified accessible name computation: labelledby, aria-label, native label/alt/value, content, title, placeholder
  const name = (el) => {
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const n = byIds(lb); if (n.length) { const s = clean(n.map((x) => textOf(x, true, true)).join(' ')); if (s) return { name: s, src: 'aria-labelledby' }; } }
    const al = el.getAttribute('aria-label');
    if (al && clean(al)) return { name: clean(al), src: 'aria-label' };
    const t = el.tagName.toLowerCase();
    if (['input', 'select', 'textarea', 'meter', 'progress', 'output'].includes(t)) {
      if (t === 'input' && /^(button|submit|reset)$/.test(el.type)) { const v = clean(el.value) || (el.type === 'submit' ? 'Submit' : el.type === 'reset' ? 'Reset' : ''); if (v) return { name: v, src: 'value' }; }
      if (t === 'input' && el.type === 'image') { const a = clean(el.alt); if (a) return { name: a, src: 'alt' }; }
      const labels = [...(el.labels || [])];
      const s = clean(labels.map((l) => textOf(l, true, true)).join(' '));
      if (s) return { name: s, src: 'label' };
      const ti = clean(el.getAttribute('title')); if (ti) return { name: ti, src: 'title' };
      const ph = clean(el.getAttribute('placeholder')); if (ph) return { name: ph, src: 'placeholder' };
      return { name: '', src: 'none' };
    }
    if (t === 'img') { const a = el.getAttribute('alt'); if (a != null && clean(a)) return { name: clean(a), src: 'alt' }; }
    const s = clean(textOf(el, false, true));
    if (s) return { name: s, src: 'content' };
    const ti = clean(el.getAttribute('title')); if (ti) return { name: ti, src: 'title' };
    return { name: '', src: 'none' };
  };
  const FOCUSABLE = 'a[href], area[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"], audio[controls], video[controls], iframe';
  const tabbable = (el) => {
    if (el.disabled || el.getAttribute('tabindex') === '-1' || el.closest('[inert]')) return false;
    if (el.tagName === 'IFRAME' || el.tagName === 'AREA') return false;
    if (el.tagName === 'SUMMARY' && el.parentElement?.tagName !== 'DETAILS') return false;
    if (el.tagName === 'SUMMARY' && el.parentElement.firstElementChild !== el && ![...el.parentElement.children].find((c) => c.tagName === 'SUMMARY')) return false;
    return visible(el);
  };
  const candidates = () => {
    const seen = new Set(); const out = [];
    for (const el of document.querySelectorAll(FOCUSABLE)) {
      if (!tabbable(el)) continue;
      if (el.tagName === 'INPUT' && el.type === 'radio' && el.name) { const k = (el.form?.id || '') + el.name; if (seen.has(k)) continue; seen.add(k); }
      out.push(el);
    }
    return out;
  };
  const SIG = ['outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopWidth', 'backgroundColor', 'color', 'textDecorationLine', 'textDecorationColor', 'filter', 'transform'];
  const sig = (el) => { const s = cs(el); return Object.fromEntries(SIG.map((k) => [k, s[k]])); };
  const containers = () => [...document.querySelectorAll('dialog[open], [popover]:popover-open, [role=dialog], [role=alertdialog], [role=menu], [role=listbox], [role=tree], [role=grid]')].filter(visible);
  window.__p = { clean, cs, sel, rectOf, visible, clipped, role, name, byIds, candidates, tabbable, sig, containers, FOCUSABLE };
}

/* ── page-side measurements ──────────────────────────────────────────────────────────────────────────────────── */
function describeFocus() {
  const P = window.__p; const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { body: true };
  const r = el.getBoundingClientRect(); const s = P.cs(el); const n = P.name(el);
  const top = document.elementsFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
  const covering = top.find((t) => t !== el && !el.contains(t) && !t.contains(el) && !(el.labels && [...el.labels].some((l) => l.contains(t))));
  const first = top[0];
  const obscured = r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && first && !(first === el || el.contains(first) || first.contains(el) || (el.labels && [...el.labels].some((l) => l.contains(first)))) ? P.sel(first) : null;
  let ariaHiddenAnc = null;
  for (let a = el; a; a = a.parentElement) if (a.getAttribute('aria-hidden') === 'true') { ariaHiddenAnc = P.sel(a); break; }
  return {
    body: false, sel: P.sel(el), tag: el.tagName.toLowerCase(), role: P.role(el), name: n.name, nameSrc: n.src, id: el.id || '',
    rect: P.rectOf(el), vrect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) },
    tabindex: el.getAttribute('tabindex'), type: el.getAttribute('type') || '',
    hidden: s.visibility === 'hidden' || s.display === 'none' || r.width === 0 || r.height === 0,
    // a native checkbox or radio hidden over a drawn box (the box shows the state and the focus) is a sound pattern;
    // the focus check below judges it by the pixels around it, not by the input's own opacity
    transparent: +s.opacity === 0 && !(el.matches('input[type=checkbox], input[type=radio]') && (el.nextElementSibling || el.closest('label'))),
    clippedOut: P.clipped(el) && !(r.width > 0 && +s.opacity > 0 && r.right > 0),
    offscreen: r.width > 0 && (r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight),
    obscured, ariaHiddenAnc, inert: !!el.closest('[inert]'),
    inText: el.tagName === 'A' && !!el.closest('p, li, dd, td, label, h1, h2, h3, h4, h5, h6') && s.display === 'inline',
    skip: el.tagName === 'A' && (el.getAttribute('href') || '').startsWith('#') && (el.getAttribute('href') || '').length > 1,
    inMain: !!el.closest('main, [role=main]'),
  };
}

function discoverTriggers() {
  const P = window.__p; const found = new Map(); const add = (el, why) => { if (!P.visible(el) || found.has(el)) return; found.set(el, why); };
  for (const d of document.querySelectorAll('dialog')) {
    const id = d.id; if (!id) continue;
    for (const el of document.querySelectorAll('*')) {
      if (el === d || d.contains(el)) continue;
      for (const a of el.attributes) {
        if (['id', 'for', 'href', 'class', 'style', 'aria-labelledby', 'aria-describedby', 'name'].includes(a.name)) continue;
        if (a.value === id || a.value === `#${id}`) add(el, `dialog #${id}`);
      }
    }
  }
  for (const d of document.querySelectorAll('dialog')) { // guess: a button whose id or class shares a word with the dialog id (del-dlg -> del-open)
    if ([...found.values()].includes('dialog #' + d.id)) continue;
    const toks = d.id.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !['dlg', 'dialog', 'modal', 'popup'].includes(t));
    for (const el of document.querySelectorAll('button, [role=button], a[href="#"]')) if (toks.some((t) => (el.id + ' ' + el.className).toLowerCase().includes(t))) add(el, 'dialog #' + d.id + ' (guessed)');
  }
  for (const el of document.querySelectorAll('[aria-haspopup]:not([aria-haspopup=false]), [aria-expanded], [popovertarget], [commandfor]')) if (!el.closest('dialog:not([open])')) add(el, el.hasAttribute('aria-haspopup') ? `haspopup=${el.getAttribute('aria-haspopup')}` : 'aria-expanded');
  const list = [...found.entries()].slice(0, 25);
  list.forEach(([el], i) => el.setAttribute('data-a11y-probe', String(i)));
  const loose = [...document.querySelectorAll('dialog')].filter((d) => !d.id || ![...found.values()].some((v) => v.startsWith(`dialog #${d.id}`))).map((d) => P.sel(d));
  return { triggers: list.map(([el, why], i) => ({ i, why, sel: P.sel(el), hp: el.getAttribute('aria-haspopup'), expanded: el.getAttribute('aria-expanded'), href: el.getAttribute('href') })), looseDialogs: loose };
}

function triggerState() {
  const P = window.__p; const el = document.querySelector('[data-a11y-probe].__cur') || document.querySelector('[data-a11y-cur]');
  const active = document.activeElement;
  const cont = P.containers();
  return {
    expanded: el?.getAttribute('aria-expanded') ?? null,
    containers: cont.map((c) => (c.setAttribute('data-a11y-c', '1'), P.sel(c))),
    activeSel: active ? P.sel(active) : '', activeIsTrigger: !!el && (active === el || el.contains(active)),
    activeInContainer: cont.some((c) => c.contains(active)),
    controlsVisible: (() => { const ids = (el?.getAttribute('aria-controls') || '').split(/\s+/).filter(Boolean); const t = ids.map((i) => document.getElementById(i)).filter(Boolean); return t.length ? t.some((x) => P.visible(x) && !x.hasAttribute('hidden')) : null; })(),
    activeInControls: (() => { const ids = (el?.getAttribute('aria-controls') || '').split(/\s+/).filter(Boolean); return ids.map((i) => document.getElementById(i)).filter(Boolean).some((x) => x.contains(active)); })(),
    modal: cont.some((c) => c.tagName === 'DIALOG' ? c.matches(':modal') : c.getAttribute('aria-modal') === 'true'),
  };
}

function forcedColorsScan() {
  const P = window.__p; const out = [];
  const hasEdge = (s) => ['Top', 'Right', 'Bottom', 'Left'].some((d) => parseFloat(s[`border${d}Width`]) > 0 && s[`border${d}Style`] !== 'none' && s[`border${d}Style`] !== 'hidden');
  const hasOutline = (s) => s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const pseudoEdge = (el) => ['::before', '::after'].some((p) => { const s = P.cs(el, p); return s.content !== 'none' && s.content !== 'normal' && s.display !== 'none' && (hasEdge(s) || hasOutline(s)); });
  const seen = new Set();
  const push = (el, msg) => { if (!seen.has(el)) { seen.add(el); el.setAttribute('data-probe-fc', String(out.length)); out.push({ el: P.sel(el), msg, i: out.length }); } };
  for (const el of document.querySelectorAll('button, input, select, textarea, summary, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=slider], [role=menuitem], [role=option], a[href]')) {
    if (!P.visible(el)) continue;
    const r = el.getBoundingClientRect();
    const t = el.tagName.toLowerCase(); const ty = (el.getAttribute('type') || '').toLowerCase();
    const s = P.cs(el);
    if (t === 'input' && ['checkbox', 'radio'].includes(ty) && (r.width < 6 || +s.opacity === 0 || P.clipped(el))) {
      const proxy = el.nextElementSibling || el.closest('label')?.querySelector('span, i, svg, div');
      if (!proxy) { push(el, 'custom checkbox or radio has no visible box element'); continue; }
      const ps = P.cs(proxy);
      if (!hasEdge(ps) && !hasOutline(ps) && !pseudoEdge(proxy) && !(proxy.tagName.toLowerCase() === 'svg')) push(el, `custom ${ty} box (${P.sel(proxy)}) has no border or outline, so it vanishes in forced colors`);
      continue;
    }
    if (t === 'input' && ['checkbox', 'radio', 'range', 'color', 'file'].includes(ty)) continue;       // browser draws these
    if (t === 'a') {
      const boxy = P.cs(el).backgroundColor !== 'rgba(0, 0, 0, 0)' && !hasEdge(s) && !hasOutline(s) && r.height >= 28 && s.display !== 'inline' && /btn|button|cta/i.test(el.className + ' ' + (el.getAttribute('role') || '')) && !el.classList.contains('skip');
      if (boxy) push(el, 'link styled as a button with a background only: the button shape disappears');
      continue;
    }
    if (t === 'summary' || el.getAttribute('role') === 'menuitem' || el.getAttribute('role') === 'option') continue;
    const nativeBox = (t === 'select' || t === 'textarea' || (t === 'input' && !['button', 'submit', 'reset', 'image'].includes(ty))) ? s.appearance === 'auto' || s.appearance === 'menulist' || s.appearance === 'textfield' : false;
    if (!hasEdge(s) && !hasOutline(s) && !nativeBox && !pseudoEdge(el)) {
      const filled = s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none';
      const hasText = !!P.clean(el.innerText);
      const boxed = [el.parentElement, el.parentElement?.parentElement].some((a) => a && hasEdge(P.cs(a)));
      if (!filled && (hasText || boxed || el.querySelector('svg, img'))) continue; // plain text or a visible glyph: the glyph itself carries the control
      push(el, filled ? 'only a background or shadow marks the edge; both are overridden in forced colors, add a transparent border' : 'no border or outline: nothing marks the control; add border: 1px solid transparent');
    }
  }
  return out;
}

function clipScan() {
  const P = window.__p; const els = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(), i = 0; n; n = walker.nextNode(), i++) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'TEMPLATE'].includes(n.tagName.toUpperCase())) continue;
    const own = [...n.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim());
    if (!own || !P.visible(n)) continue;
    // text for screen readers only, itself or inside a visually hidden box, is never seen, so it can't be clipped or overlap
    let hidden = false;
    for (let a = n; a && a !== document.body; a = a.parentElement) if (P.clipped(a)) { hidden = true; break; }
    if (hidden) continue;
    n.setAttribute('data-a11y-t', String(els.length)); els.push(n);
  }
  const clippedSet = [], rects = [];
  els.forEach((el, i) => {
    const s = P.cs(el);
    if (el.tagName === 'OPTION') return;
    const clips = ['hidden', 'clip'].includes(s.overflowY) || ['hidden', 'clip'].includes(s.overflowX);
    const lineClamp = s.webkitLineClamp && s.webkitLineClamp !== 'none';
    if (clips && !lineClamp && s.textOverflow !== 'ellipsis' && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) clippedSet.push(i);
    const r = el.getBoundingClientRect();
    // text-only rect: union of the element's own text nodes
    const rg = document.createRange(); let u = null;
    for (const c of el.childNodes) if (c.nodeType === 3 && c.nodeValue.trim()) { rg.selectNodeContents(c); for (const q of rg.getClientRects()) { if (q.width < 1 || q.height < 1) continue; u = u ? { l: Math.min(u.l, q.left), t: Math.min(u.t, q.top + scrollY), r: Math.max(u.r, q.right), b: Math.max(u.b, q.bottom + scrollY) } : { l: q.left, t: q.top + scrollY, r: q.right, b: q.bottom + scrollY }; } }
    let box = u || { l: r.left, t: r.top + scrollY, r: r.right, b: r.bottom + scrollY };
    // only the part an ancestor doesn't clip away can overlap anything: a counter's off-window digits, a scroller's hidden rows
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const c = P.cs(a);
      if (c.overflowX === 'visible' && c.overflowY === 'visible' && c.clipPath === 'none') continue;
      const q = a.getBoundingClientRect();
      box = { l: Math.max(box.l, q.left), t: Math.max(box.t, q.top + scrollY), r: Math.min(box.r, q.right), b: Math.min(box.b, q.bottom + scrollY) };
    }
    rects.push(box.r - box.l > 1 && box.b - box.t > 1 ? box : { l: 0, t: 0, r: 0, b: 0 });
  });
  const overlaps = [];
  for (let a = 0; a < els.length; a++) for (let b = a + 1; b < els.length; b++) {
    if (els[a].contains(els[b]) || els[b].contains(els[a])) continue;
    const A = rects[a], B = rects[b];
    const w = Math.min(A.r, B.r) - Math.max(A.l, B.l), h = Math.min(A.b, B.b) - Math.max(A.t, B.t);
    if (w > 3 && h > 3 && w * h > 0.2 * Math.min((A.r - A.l) * (A.b - A.t), (B.r - B.l) * (B.b - B.t))) {
      const pa = P.cs(els[a]).position, pb = P.cs(els[b]).position;
      overlaps.push([a, b, `${P.sel(els[a])}  x  ${P.sel(els[b])}`, pa === 'absolute' || pb === 'absolute' || pa === 'fixed' || pb === 'fixed']);
    }
  }
  return { clipped: clippedSet.map((i) => ({ k: `t${i}`, el: P.sel(els[i]) })), overlaps: overlaps.map(([a, b, d]) => ({ k: `t${a}-${b}`, el: d })) };
}

function reflowScan() {
  const P = window.__p; const vw = innerWidth; const off = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > vw + 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); const s = P.cs(el);
      if (r.width > 0 && r.right > vw + 1 && s.position !== 'fixed' && s.display !== 'none' && s.visibility !== 'hidden' && !el.closest('[data-scroll], pre, table')) {
        let sc = false; for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = P.cs(a); if (/(auto|scroll|hidden|clip)/.test(o.overflowX) && a.getBoundingClientRect().right <= vw + 1) { sc = true; break; } }
        if (!sc && !off.some((o) => o.node.contains(el))) off.push({ node: el, el: P.sel(el), right: Math.round(r.right) });
      }
    }
  }
  const fixed = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = P.cs(el); if ((s.position === 'fixed' || s.position === 'sticky') && P.visible(el)) { const r = el.getBoundingClientRect(); if (r.height > 0 && r.top < innerHeight && r.bottom > 0) fixed.push({ el: P.sel(el), h: Math.round(r.height), ofViewport: Math.round((r.height / innerHeight) * 100) }); }
  }
  return { scrollWidth: doc.scrollWidth, vw, offenders: off.slice(0, 6).map(({ el, right }) => ({ el, right })), fixed };
}

function inventory() {
  const P = window.__p; const out = {};
  out.lang = document.documentElement.getAttribute('lang') || '';
  out.title = document.title;
  const vp = document.querySelector('meta[name=viewport]')?.getAttribute('content') || '';
  out.zoomLocked = /user-scalable\s*=\s*(no|0)/i.test(vp) || /maximum-scale\s*=\s*(0?\.\d+|1(\.0*)?)\b/i.test(vp);
  out.viewportMeta = vp;
  const LM = 'header, nav, main, aside, footer, form, search, section, [role=banner], [role=navigation], [role=main], [role=complementary], [role=contentinfo], [role=search], [role=region], [role=form]';
  out.landmarks = [...document.querySelectorAll(LM)].filter(P.visible).map((el) => {
    const t = el.tagName.toLowerCase(); let r = P.role(el);
    const named = !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
    if (t === 'header' && el.closest('article, aside, main, nav, section, [role=main]')) r = 'generic';
    if (t === 'footer' && el.closest('article, aside, main, nav, section, [role=main]')) r = 'generic';
    if (t === 'section') r = named ? 'region' : 'generic';
    if (t === 'form') r = named ? 'form' : 'generic';
    if (el.getAttribute('role') === 'region' && !named) r = 'generic';
    return { role: r, name: P.name(el).src === 'aria-label' || P.name(el).src === 'aria-labelledby' ? P.name(el).name : '', sel: P.sel(el) };
  }).filter((l) => l.role !== 'generic' && l.role !== 'group');
  out.headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role=heading]')].filter(P.visible).map((h) => ({ level: +(h.getAttribute('aria-level') || h.tagName[1] || 2), text: P.clean(h.innerText).slice(0, 60), sel: P.sel(h) }));
  out.live = [...document.querySelectorAll('[aria-live], [role=status], [role=alert], [role=log], [role=timer], [role=marquee], output')].map((el) => ({ kind: el.getAttribute('role') || el.tagName.toLowerCase(), live: el.getAttribute('aria-live') || '', atomic: el.getAttribute('aria-atomic') || '', text: P.clean(el.textContent).slice(0, 40), sel: P.sel(el), hiddenNow: !P.visible(el) && !P.clipped(el) }));
  out.badRefs = [];
  for (const el of document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns], [aria-activedescendant], label[for]')) {
    for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'for']) {
      const v = el.getAttribute(a); if (!v) continue;
      for (const id of v.split(/\s+/)) if (!document.getElementById(id)) out.badRefs.push(`${P.sel(el)} ${a}="${id}"`);
    }
  }
  const ids = {}; for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
  out.dupIds = Object.keys(ids).filter((k) => ids[k] > 1);
  out.imgNoAlt = [...document.querySelectorAll('img:not([alt])')].filter(P.visible).map(P.sel).slice(0, 8);
  out.mouseOnly = [];
  const focusSel = P.FOCUSABLE;
  for (const el of document.querySelectorAll('body *')) {
    if (!P.visible(el)) continue;
    const s = P.cs(el);
    if (s.cursor !== 'pointer' && !el.hasAttribute('onclick')) continue;
    if (el.matches(focusSel) || el.closest('a[href], button, label, summary, select, [role=button], [role=tab], [role=option], [role=menuitem], [tabindex]') || el.querySelector(focusSel) || el.closest('[disabled], [aria-disabled=true]')) continue;
    if (el.parentElement && P.cs(el.parentElement).cursor === 'pointer' && !el.hasAttribute('onclick')) continue;
    out.mouseOnly.push(P.sel(el));
  }
  out.mouseOnly = out.mouseOnly.slice(0, 8);
  out.posTabindex = [...document.querySelectorAll('[tabindex]')].filter((e) => +e.getAttribute('tabindex') > 0).map(P.sel);
  return out;
}

function motionScan() {
  return document.getAnimations().filter((a) => a.playState === 'running' && (a.effect?.getComputedTiming().iterations === Infinity || a.effect?.getComputedTiming().duration > 5000)).map((a) => { const t = a.effect?.target; return `${t?.tagName?.toLowerCase() || '?'}${t?.id ? '#' + t.id : ''}${t?.className && typeof t.className === 'string' ? '.' + t.className.trim().split(/\s+/)[0] : ''} ${a.animationName || a.transitionProperty || ''}`.trim(); }).slice(0, 8);
}

/* Presses every visible, enabled button once and reports the ones that answer with nothing: no change in the page, no
   focus move, no navigation, no request, no new window, nothing copied. What changes by itself (an animation loop, a
   clock) is watched first for a moment and doesn't count as an answer, except on the pressed control: its own state
   (aria-pressed, aria-checked, a data attribute, a class) changing, or an animation starting on it or its object, is
   an answer even when the control was already moving. Links and form submits are cancelled. */
async function deadScan() {
  const P = window.__p;
  // a page with no script at all is a static mock-up: nothing can be wired yet, so there is nothing to press
  if (!document.scripts.length) return { checked: 0, dead: [], static: true };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let signal = false;
  const mark = () => { signal = true; };
  // the probe calls this when the write guard holds a request back: a press that tried to send something answered
  window.__probeWrite = mark;
  const f = window.fetch; window.fetch = function (...a) { mark(); return f.apply(this, a); };
  const xs = XMLHttpRequest.prototype.send; XMLHttpRequest.prototype.send = function (...a) { mark(); return xs.apply(this, a); };
  try { const sb = navigator.sendBeacon?.bind(navigator); if (sb) navigator.sendBeacon = (...a) => { mark(); return sb(...a); }; } catch { /* read-only here */ }
  window.open = () => { mark(); return null; };
  // going back or forward is an answer too, and must not leave the page mid-check
  for (const k of ['back', 'forward', 'go', 'pushState', 'replaceState']) { try { history[k] = () => mark(); } catch { /* read-only here */ } }
  try { const c = navigator.clipboard; if (c) { const w = c.writeText?.bind(c); c.writeText = (t) => { mark(); return w ? w(t).catch(() => {}) : Promise.resolve(); }; } } catch { /* no clipboard here */ }
  document.addEventListener('click', (e) => { const a = e.target instanceof Element && e.target.closest('a[href]'); if (a) { e.preventDefault(); mark(); } }, true);
  document.addEventListener('submit', (e) => { e.preventDefault(); mark(); }, true);
  const watch = (onM) => { const mo = new MutationObserver((ms) => ms.forEach(onM)); mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); return mo; };
  const noisy = new Set();
  let mo = watch((m) => noisy.add(m.target));
  await sleep(700); mo.disconnect();
  const sel = 'button, [role=button], [role=switch], [role=tab], [role=menuitem], [role=menuitemcheckbox], [role=option], input[type=button], input[type=submit], input[type=reset]';
  // the option already chosen in a pick-one group (a tab, a segment, a preset) rightly does nothing when pressed again
  const chosen = (el) => el.getAttribute('aria-selected') === 'true' || el.hasAttribute('aria-current')
    || (el.getAttribute('role') === 'radio' && el.getAttribute('aria-checked') === 'true')
    || (el.getAttribute('aria-pressed') === 'true' && [...(el.parentElement?.children ?? [])].filter((c) => c.hasAttribute('aria-pressed')).length > 1 && !el.closest('[aria-multiselectable="true"]') && [...(el.parentElement?.children ?? [])].filter((c) => c.getAttribute('aria-pressed') === 'true').length === 1);
  const list = [...document.querySelectorAll(sel)].filter((el) => P.visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !el.closest('[inert]') && !chosen(el)).slice(0, 60);
  const dead = [];
  const href = location.href;
  // the control's own state, without its inline style (a running animation rewrites that every frame)
  const state = (el) => [el, el.closest('[data-object]')].filter(Boolean).map((n) => [...n.attributes].filter((a) => a.name !== 'style').map((a) => `${a.name}=${a.value}`).join('|')).join('#');
  // animations that are not endless loops, on the control, inside it, or on the object it belongs to
  const started = (el, before) => { const home = el.closest('[data-object]') ?? el; return document.getAnimations().some((a) => !before.has(a) && a.effect?.target && (home.contains(a.effect.target) || a.effect.target.contains(el)) && a.effect.getComputedTiming().iterations !== Infinity); };
  for (const el of list) {
    // an earlier press may have chosen this one already (two switches bound to the same state)
    if (!el.isConnected || chosen(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    signal = false; let changed = false;
    const before = document.activeElement;
    const was = state(el), running = new Set(document.getAnimations());
    mo = watch((m) => { if (!noisy.has(m.target)) changed = true; });
    el.click();
    await sleep(120);
    if (started(el, running)) changed = true;
    await sleep(330);
    mo.disconnect();
    if (el.isConnected && (state(el) !== was || started(el, running))) changed = true;
    if (!changed && !signal && location.href === href && document.activeElement === before) dead.push(P.sel(el));
  }
  return { checked: list.length, dead: dead.slice(0, 12) };
}

/* ── the run ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const SEV = { blocker: 3, serious: 2, moderate: 1, info: 0 };
const findings = [];
const add = (severity, area, el, message, fix) => findings.push({ severity, area, element: el || '', message, fix: fix || '' });
const report = { url, tabStops: [], inventory: null, triggers: [], reflow: [] };
const READS = ['GET', 'HEAD', 'OPTIONS'];
const writes = new Map(); // "POST https://host/path" → { method, url, count }: held back, or sent with --allow-writes

const chromium = await loadChromium();
let browser;
try {
  browser = await launchBrowser(chromium);
  // with the guard on, service workers are off: a worker's own requests never pass through the route below
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...(allowWrites ? {} : { serviceWorkers: 'block' }) });
  const page = await ctx.newPage();
  /* the write guard: a request that would change something (not GET, HEAD or OPTIONS) is stopped before it leaves the
     browser and remembered; the page is told, so the press that tried to send it counts as answered. A form posted by
     script is stopped the same way, and "aborted" leaves the page where it was. With --allow-writes nothing is
     stopped, and what went out is remembered instead. */
  const noteWrite = (req) => {
    let where = req.url().split('#')[0].split('?')[0];
    try { const u = new URL(req.url()); where = u.origin === 'null' ? u.pathname : u.origin + u.pathname; } catch { /* keep the address as given */ }
    const k = `${req.method()} ${where}`;
    writes.set(k, { method: req.method(), url: where, count: (writes.get(k)?.count ?? 0) + 1 });
  };
  if (allowWrites) ctx.on('request', (req) => { if (!READS.includes(req.method())) noteWrite(req); });
  else await ctx.route('**/*', async (route) => {
    const req = route.request();
    // a request still in the air when the page or the browser closes has nothing left to answer: not an error
    if (READS.includes(req.method())) return route.continue().catch(() => {});
    noteWrite(req);
    // told at once, and never waited on for long: a page between loads has nobody to tell
    await Promise.race([page.evaluate(() => window.__probeWrite?.()).catch(() => {}), wait(300)]);
    return route.abort('aborted').catch(() => {});
  });
  // a page that doesn't load is a tool error (exit 4), never probed as if it were the page
  const open = async () => {
    const res = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (res && typeof res.status === 'function' && res.status() >= 400) throw new Error(`HTTP ${res.status()}`);
    await wait(500); await page.evaluate(`(${helpers})()`);
  };
  await open();

  /* 6 inventory first (no mutation) */
  const inv = await page.evaluate(inventory);
  report.inventory = inv;
  if (!inv.lang) add('serious', 'language', 'html', 'The page has no lang attribute, so screen readers guess the voice and pronunciation.', 'Set <html lang="en"> (or the real language).');
  if (!inv.title.trim()) add('serious', 'structure', 'title', 'The page has no <title>.', 'Give every page a unique title: "Page - Site".');
  if (inv.zoomLocked) add('blocker', 'zoom', 'meta viewport', `Zoom is blocked by the viewport meta (${inv.viewportMeta}).`, 'Use <meta name="viewport" content="width=device-width, initial-scale=1"> only.');
  const mains = inv.landmarks.filter((l) => l.role === 'main');
  if (mains.length === 0) add('moderate', 'landmarks', 'page', 'No <main> landmark, so screen-reader users cannot jump to the content.', 'Wrap the page content in one <main>.');
  if (mains.length > 1) add('moderate', 'landmarks', mains[1].sel, 'More than one visible <main>.', 'Keep exactly one main landmark.');
  for (const role of ['navigation', 'complementary', 'region', 'form']) { const l = inv.landmarks.filter((x) => x.role === role); if (l.length > 1 && l.some((x) => !x.name) && role !== 'region' && role !== 'form') add('moderate', 'landmarks', l.find((x) => !x.name).sel, `${l.length} ${role} landmarks and one has no name, so they sound identical.`, 'Add a distinct aria-label to each (for example "Main", "Footer", "Breadcrumb").'); }
  const h1s = inv.headings.filter((h) => h.level === 1);
  if (h1s.length === 0) add('moderate', 'headings', 'page', 'No h1.', 'Add one h1 that names the page.');
  if (h1s.length > 1) add('moderate', 'headings', h1s[1].sel, `${h1s.length} h1 elements.`, 'Use one h1; demote the rest.');
  inv.headings.forEach((h, i) => {
    if (!h.text) add('moderate', 'headings', h.sel, 'Empty heading.', 'Remove it or give it text.');
    if (i > 0 && h.level > inv.headings[i - 1].level + 1) add('moderate', 'headings', h.sel, `Heading level jumps from h${inv.headings[i - 1].level} to h${h.level}.`, 'Do not skip levels; choose the level by outline, style it with CSS.');
  });
  for (const b of inv.badRefs.slice(0, 6)) add('serious', 'aria', b, 'An ARIA or label reference points at an id that does not exist.', 'Fix the id or remove the attribute.');
  if (inv.dupIds.length) add('moderate', 'aria', inv.dupIds.slice(0, 5).join(', '), 'Duplicate ids break label and aria-* references.', 'Make ids unique.');
  for (const i of inv.imgNoAlt) add('serious', 'images', i, 'Image without an alt attribute.', 'alt="" if decorative, else describe its job.');
  for (const m of inv.mouseOnly) add('moderate', 'keyboard', m, 'Looks clickable (pointer cursor or onclick) but cannot take keyboard focus.', 'Make it a <button> or <a href>, not a div or span.');
  for (const p of inv.posTabindex.slice(0, 4)) add('moderate', 'keyboard', p, 'Positive tabindex overrides the natural order.', 'Use tabindex="0" or "-1" only; fix the DOM order.');

  /* 1 tab order */
  const cand = await page.evaluate(() => window.__p.candidates().length);
  report.candidates = cand;
  await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); });
  const stops = []; let first = null; let wrapped = false; const seen = new Map(); let lastKey = null;
  const limit = Math.min(MAX_TABS, cand * 2 + 10);
  for (let n = 0; n < limit; n++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(describeFocus);
    if (d.body) { wrapped = n > 0; if (wrapped) break; continue; }
    const key = `${d.sel}@${d.rect.x},${d.rect.y}`;
    // a native date or time field is one element with several parts (day, month, year): Tab walks the parts while focus
    // stays on the same element, which is not a loop
    const segmented = key === lastKey && await page.evaluate(() => !!document.activeElement?.matches?.('input[type=date], input[type=time], input[type=datetime-local], input[type=month], input[type=week]'));
    lastKey = key;
    if (segmented) continue;
    if (first === null) first = key;
    else if (key === first) { wrapped = true; break; }
    if (seen.has(key)) { stops.push({ ...d, order: stops.length + 1, repeat: true }); break; }
    seen.set(key, true);
    await page.evaluate((i) => { document.activeElement.setAttribute('data-a11y-tab', String(i)); }, stops.length);
    stops.push({ ...d, order: stops.length + 1 });
  }
  const last = stops[stops.length - 1];
  if (last?.repeat) add('blocker', 'keyboard', last.sel, `Keyboard trap or loop: Tab came back to ${last.sel} after only ${stops.length - 1} stops (${cand} focusable elements exist).`, 'Let Tab leave the widget. Only a modal dialog may loop, and only while it is open; use inert on the rest, not a key handler.');
  else if (!wrapped && stops.length >= limit) add('serious', 'keyboard', last?.sel, `Tab did not finish within ${limit} presses; the page may have an endless focusable region.`, 'Check infinite scroll and focus handlers; give a way to reach the footer.');
  else if (stops.length < Math.ceil(cand * 0.5) && cand > 3) add('blocker', 'keyboard', last?.sel, `Tab reached ${stops.length} of ${cand} focusable elements and then left the page: part of the page cannot be reached by keyboard.`, 'Find what swallows focus (a handler calling preventDefault on Tab, tabindex=-1 on a container, a hidden overlay).');
  const visited = new Set(stops.map((s) => s.sel));
  // a native radio group is one tab stop by design (arrows move inside it), so a radio whose group was reached is fine
  const missed = await page.evaluate(() => window.__p.candidates().filter((e) => !e.hasAttribute('data-a11y-tab')
    && !e.closest('[role=tablist], [role=menu], [role=listbox], [role=radiogroup], [role=toolbar], [role=tree], [role=grid], [inert]')
    && !(e.matches('input[type=radio]') && e.name && [...document.querySelectorAll('input[type=radio][data-a11y-tab]')].some((o) => o.name === e.name && o.form === e.form))).map(window.__p.sel).slice(0, 5));
  if (!last?.repeat && wrapped) for (const m of missed) add('moderate', 'keyboard', m, 'Visible focusable element that Tab never reached.', 'Check for tabindex=-1 or a focus handler that skips it.');
  const rtl = await page.evaluate(() => getComputedStyle(document.body).direction === 'rtl').catch(() => false);
  stops.forEach((s, i) => {
    const prev = stops[i - 1];
    if (prev && !s.repeat) {
      const dy = s.rect.y - prev.rect.y;
      const dx = Math.abs(s.rect.x - prev.rect.x); // a move of 150px+ sideways is a new column (sidebar to main), not a jump back
      // so is a stop that starts to the right of where the last one ended: the last card of a board column (its button
      // at the column's right edge) to the first card of the next column
      const nextColumn = rtl ? s.rect.x + s.rect.w <= prev.rect.x + 4 : s.rect.x >= prev.rect.x + prev.rect.w - 4;
      if (dy < -24 && dx <= 150 && !nextColumn && !s.skip) add('serious', 'focus-order', s.sel, `Focus jumps backwards on screen (stop ${prev.order} at y=${prev.rect.y} to stop ${s.order} at y=${s.rect.y}).`, 'Make DOM order match visual order; do not reorder with CSS order, flex-direction: *-reverse, grid placement or absolute positioning.');
    }
    if (!s.name && !['textbox', 'searchbox', 'combobox'].includes(s.role) || (!s.name && s.role)) add('blocker', 'names', s.sel, `No accessible name (${s.role}).`, 'Give it visible text, a <label>, or aria-label for icon-only controls.');
    else if (s.nameSrc === 'placeholder') add('serious', 'names', s.sel, 'Named only by its placeholder, which disappears on typing.', 'Add a real <label for>.');
    if (s.hidden || s.inert) add('blocker', 'focus-hidden', s.sel, 'Focus landed on an element that is not rendered (display none, visibility hidden or zero size).', 'Remove it from the tab order with hidden/inert, or make it visible on focus.');
    else if (s.ariaHiddenAnc) add('blocker', 'focus-hidden', s.sel, `Focusable element inside aria-hidden (${s.ariaHiddenAnc}): sighted keyboard users can reach it, screen readers cannot see it.`, 'Use inert on the hidden branch instead of aria-hidden, or remove the focusable child.');
    else if (s.offscreen && !s.clippedOut) add('blocker', 'focus-hidden', s.sel, 'Focus landed outside the visible window and the page did not scroll to it.', 'Do not park focusable items off-screen; use inert or display: none when closed.');
    else if (s.clippedOut && s.rect.w <= 2) add('serious', 'focus-hidden', s.sel, 'Focus lands on a 1px or clipped element (hidden-until-focus must become visible on :focus).', 'Show it on :focus, as a skip link does.');
    else if (s.transparent) add('serious', 'focus-hidden', s.sel, 'Focused element has opacity 0.', 'Reveal it on :focus-visible or take it out of the tab order.');
    if (s.obscured) add('serious', 'focus-obscured', s.sel, `Focused element is covered by ${s.obscured} (WCAG 2.4.11).`, 'Add scroll-padding-top equal to the sticky bar height, and keep banners out of the focus path.');
    // WCAG 2.5.8's spacing exception: a smaller target passes when a 24px circle on its centre touches no other target
    const spaced = (t) => {
      const cx = t.rect.x + t.rect.w / 2, cy = t.rect.y + t.rect.h / 2;
      return stops.every((o) => o === t || o.repeat || o.hidden || !o.rect.w ||
        Math.hypot(Math.max(o.rect.x - cx, 0, cx - (o.rect.x + o.rect.w)), Math.max(o.rect.y - cy, 0, cy - (o.rect.y + o.rect.h))) >= 12);
    };
    if (s.rect.w > 0 && (s.rect.w < 24 || s.rect.h < 24) && !s.inText && !['textbox', 'checkbox', 'radio'].includes(s.role) && !spaced(s)) add('moderate', 'target-size', s.sel, `Target is ${s.rect.w}x${s.rect.h}px, under the 24x24 minimum (WCAG 2.5.8).`, 'Pad it to 24px (44px on touch) or space it so a 24px circle around it touches no other target.');
  });
  if (stops.length > 5) {
    const firstMain = stops.findIndex((s) => s.inMain);
    if (firstMain > 5 && !stops[0].skip) add('moderate', 'skip-link', stops[0].sel, `${firstMain} tab stops come before the main content and the first one is not a skip link.`, 'Add <a class="skip" href="#main">Skip to content</a> as the first element, visible on focus.');
    if (stops[0].skip) { const ok = await page.evaluate((i) => { const a = document.querySelector(`[data-a11y-tab="0"]`); const id = (a.getAttribute('href') || '').slice(1); return !!document.getElementById(id); }); if (!ok) add('serious', 'skip-link', stops[0].sel, 'Skip link target does not exist.', 'Point href at the id of <main>.'); }
  }
  report.tabStops = stops.map(({ order, sel, role: r, name, nameSrc, rect, tabindex }) => ({ order, sel, role: r, name, nameSrc, rect, tabindex }));

  /* focus visibility: style diff, then pixel diff */
  const FOCUS_CAP = 60;
  await page.addStyleTag({ content: '*{caret-color:transparent!important;transition:none!important;animation:none!important}' });
  const checkFocus = async (forced) => {
    let n = 0;
    for (const s of stops) {
      if (s.repeat || s.hidden || n++ >= FOCUS_CAP) continue;
      const sel = `[data-a11y-tab="${s.order - 1}"]`;
      const r = await page.evaluate((q) => {
        const el = document.querySelector(q); if (!el) return null; const P = window.__p;
        el.blur(); const a = P.sig(el); el.focus(); const b = P.sig(el);
        const diff = Object.keys(a).filter((k) => a[k] !== b[k]);
        const cx = el.getBoundingClientRect();
        const lab = el.labels?.[0] || el.closest('label');
        const t = (el.tagName === 'INPUT' && (cx.width < 8 || +P.cs(el).opacity === 0)) ? (lab || el.parentElement) : el;
        const tr = t.getBoundingClientRect();
        return { diff, fv: el.matches(':focus-visible'), ow: parseFloat(b.outlineWidth), os: b.outlineStyle, shadow: b.boxShadow !== 'none', clip: { x: Math.max(0, tr.left - 10), y: Math.max(0, tr.top - 10), width: Math.min(innerWidth, tr.width + 20), height: Math.min(innerHeight, tr.height + 20) }, inView: tr.bottom > 0 && tr.top < innerHeight };
      }, sel);
      if (!r || !r.fv) continue;
      let ok = r.diff.length > 0;
      if (forced && ok) ok = r.diff.some((k) => /outline|border|textDecoration|color$/i.test(k) && !/boxShadow|filter|transform/.test(k));
      if (!ok && !forced && r.inView && r.clip.width > 0 && r.clip.height > 0) {
        try {
          await page.evaluate((q) => document.querySelector(q).blur(), sel); const A = await page.screenshot({ clip: r.clip });
          await page.evaluate((q) => document.querySelector(q).focus({ preventScroll: true }), sel); const B = await page.screenshot({ clip: r.clip });
          ok = !A.equals(B);
        } catch { ok = true; }
      }
      if (!ok) add(forced ? 'serious' : 'serious', forced ? 'forced-colors' : 'focus-visible', s.sel, forced ? 'Focus indicator disappears in forced-colors mode (box-shadow and background are overridden).' : 'No visible focus indicator: focusing it changes nothing on screen (WCAG 2.4.7).', forced ? 'Draw focus with outline (outline: 2px solid; outline-offset: 2px), never box-shadow alone.' : 'Add :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px } and never outline: none without a replacement.');
      else if (!forced && r.os !== 'none' && r.ow > 0 && r.ow < 2 && !r.shadow) add('moderate', 'focus-visible', s.sel, `Focus outline is ${r.ow}px; WCAG 2.4.13 wants at least 2px.`, 'Use a 2px outline with a 2px offset.');
    }
  };
  await checkFocus(false);

  /* 2 triggers */
  if (!flag('no-triggers')) {
    await open();
    const { triggers, looseDialogs } = await page.evaluate(discoverTriggers);
    for (const d of looseDialogs.slice(0, 5)) add('info', 'dialog', d, 'A <dialog> exists but no trigger was found by aria-controls, commandfor or a data attribute; test it by hand.', '');
    for (const t of triggers) {
      await open(); await page.evaluate(discoverTriggers);
      const q = `[data-a11y-probe="${t.i}"]`;
      const rec = { sel: t.sel, why: t.why, opened: false, focusMoved: null, escape: null, restored: null };
      try {
        await page.evaluate((qq) => { document.querySelectorAll('[data-a11y-cur]').forEach((e) => e.removeAttribute('data-a11y-cur')); const el = document.querySelector(qq); el.setAttribute('data-a11y-cur', '1'); el.focus(); window.__p0 = new Set(window.__p.containers()); window.__p1 = el.getAttribute('aria-expanded'); }, q);
        const startUrl = page.url();
        let st = null;
        for (const key of ['Enter', 'Space']) {
          await page.keyboard.press(key === 'Space' ? ' ' : key); await wait(450);
          st = await page.evaluate(() => { const s = triggerStateFn(); return s; }).catch(() => null);
          if (!st) st = await page.evaluate(`(${triggerState})()`);
          const opened = st.expanded === 'true' || st.containers.length > 0 || st.controlsVisible === true;
          if (opened) { rec.opened = true; rec.key = key; break; }
        }
        if (page.url() !== startUrl && !rec.opened) { rec.note = 'navigated'; report.triggers.push(rec); continue; }
        if (!rec.opened) {
          if (t.href) { report.triggers.push(rec); continue; }
          if (t.expanded !== null || t.hp) add('serious', 'trigger', t.sel, 'Neither Enter nor Space opened it (aria-expanded did not change and nothing appeared).', 'Use a real <button> so Enter and Space both work; toggle aria-expanded in the click handler.');
          report.triggers.push(rec); continue;
        }
        const newCont = st.containers.length > 0 || st.controlsVisible;
        const popupish = t.hp && t.hp !== 'false' || t.why.startsWith('dialog') || st.modal;
        if (newCont && popupish) {
          rec.focusMoved = st.activeInContainer || st.activeInControls;
          if (!rec.focusMoved) add(st.modal ? 'blocker' : 'serious', 'trigger', t.sel, `After opening, focus stayed on ${st.activeSel || 'the page'} instead of moving into the popup.`, 'Focus the first control (or the dialog title with tabindex="-1") when it opens: dialog.showModal() does this, or call .focus() yourself.');
        }
        await page.keyboard.press('Escape'); await wait(450);
        const st2 = await page.evaluate(`(${triggerState})()`);
        const closed = st2.expanded === 'false' || st2.expanded === null ? (st2.containers.length === 0 && st2.controlsVisible !== true) : false;
        const isPopup = newCont && popupish;
        if (isPopup || st.modal) {
          rec.escape = closed;
          if (!closed) add(st.modal ? 'blocker' : 'serious', 'trigger', t.sel, 'Escape did not close the popup.', 'Handle keydown Escape (native <dialog> and [popover] do it for you).');
          else {
            rec.restored = st2.activeIsTrigger;
            if (!st2.activeIsTrigger) add('serious', 'trigger', t.sel, `After closing, focus went to ${st2.activeSel || 'the page start'}, not back to the trigger.`, 'Save document.activeElement before opening and call .focus() on it after closing.');
          }
        }
      } catch (e) { rec.error = String(e.message || e).slice(0, 80); }
      report.triggers.push(rec);
    }
  }

  /* 3 forced colors */
  await open();
  const fc = await page.evaluate(forcedColorsScan); // author styles, read before the browser overrides them
  await page.emulateMedia({ forcedColors: 'active' });
  await wait(200);
  // a page may fix this itself inside @media (forced-colors: active): keep only controls that still have no edge in that mode
  const fixedHere = await page.evaluate(() => [...document.querySelectorAll('[data-probe-fc]')].filter((el) => { const c = getComputedStyle(el); const edge = ['Top', 'Right', 'Bottom', 'Left'].some((d) => parseFloat(c['border' + d + 'Width']) > 0 && !['none', 'hidden'].includes(c['border' + d + 'Style'])); return edge || (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0); }).map((el) => +el.getAttribute('data-probe-fc')));
  const fcLeft = fc.filter((f) => !fixedHere.includes(f.i));
  fc.length = 0; fc.push(...fcLeft);
  for (const f of fc.slice(0, 12)) add('serious', 'forced-colors', f.el, f.msg, 'Add border: 1px solid transparent (it turns into the system border colour), and draw focus with outline.');
  if (fc.length > 12) add('info', 'forced-colors', '', `${fc.length - 12} more controls lost their boundary.`, '');
  // focus indicators in forced colors
  await page.evaluate(() => { document.activeElement?.blur?.(); });
  await page.evaluate(() => {});
  const forcedStops = []; await page.evaluate(() => { scrollTo(0, 0); });
  for (let n = 0; n < Math.min(stops.length, 30); n++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const P = window.__p; el.setAttribute('data-a11y-f', '1'); const a = (() => { el.blur(); const x = P.sig(el); el.focus(); return [x, P.sig(el)]; })(); const diff = Object.keys(a[0]).filter((k) => a[0][k] !== a[1][k] && /outline|border|textDecoration/i.test(k)); el.removeAttribute('data-a11y-f'); return { sel: P.sel(el), ok: diff.length > 0 || /textbox|searchbox|combobox/.test(P.role(el)) || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' }; });
    if (d) forcedStops.push(d);
  }
  for (const d of forcedStops) if (!d.ok) add('serious', 'forced-colors', d.sel, 'Focus indicator is gone in forced-colors mode (only background or box-shadow changes, and both are overridden).', 'Draw focus with outline: 2px solid; outline-offset: 2px (it is kept and recoloured).');
  await page.emulateMedia({ forcedColors: 'none' });

  /* 4 text spacing */
  await open();
  const base = await page.evaluate(clipScan);
  await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}p{margin-bottom:2em!important}' });
  await wait(250);
  const spaced = await page.evaluate(clipScan);
  const bc = new Set(base.clipped.map((c) => c.el)), bo = new Set(base.overlaps.map((c) => c.el));
  for (const c of spaced.clipped) if (!bc.has(c.el)) add('serious', 'text-spacing', c.el, 'Text is clipped when users apply the WCAG text-spacing override (line 1.5, letter 0.12em, word 0.16em).', 'Never fix height on text containers; use min-height and let the box grow; avoid overflow: hidden on text.');
  for (const c of spaced.overlaps) if (!bo.has(c.el)) add('serious', 'text-spacing', c.el, 'Text overlaps other text under the text-spacing override.', 'Replace fixed heights and absolute positioning of text with flow layout.');

  /* 5 reflow */
  for (const [w, h, label] of [[320, 800, '320px'], [320, 256, '320x256 (400% zoom)'], [640, 640, '640px (200% zoom)']]) {
    await page.setViewportSize({ width: w, height: h }); await open(); await wait(150);
    const r = await page.evaluate(reflowScan);
    report.reflow.push({ label, scrollWidth: r.scrollWidth, vw: r.vw, offenders: r.offenders });
    if (r.scrollWidth > r.vw + 1 && (w === 320 || w === 640)) add('serious', 'reflow', r.offenders[0]?.el || 'page', `Horizontal scroll at ${label}: content is ${r.scrollWidth}px wide in a ${r.vw}px window${r.offenders[0] ? `, first wide element reaches x=${r.offenders[0].right}` : ''} (WCAG 1.4.10).`, 'Let the layout wrap: min-width: 0 on flex/grid children, minmax(0, 1fr), overflow-wrap: anywhere; scroll only data tables and code inside their own wrapper.');
    if (h === 256) { const big = r.fixed.filter((f) => f.ofViewport > 30); if (big.length) add('serious', 'reflow', big[0].el, `At 400% zoom this fixed or sticky element covers ${big[0].ofViewport}% of the window height, leaving little room to read.`, 'Un-stick headers and banners at small heights: @media (max-height: 480px) { header { position: static } }.'); }
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  /* reduced motion */
  await open();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await wait(500);
  const loops = await page.evaluate(motionScan);
  for (const l of loops) add('moderate', 'motion', l, 'Animation keeps running under prefers-reduced-motion: reduce (infinite or longer than 5s).', 'Wrap it in @media (prefers-reduced-motion: no-preference) and give long loops a visible pause button (WCAG 2.2.2).');
  report.liveAfter = inv.live.length;

  /* 7 controls that do nothing: press each button and watch for any answer at all */
  const dead = flag('no-triggers') ? { checked: 0, dead: [] } : await (async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open();
    // a press that still navigates (a script setting location) ends the check early: said, never a crash
    return page.evaluate(deadScan).catch((e) => ({ checked: 0, dead: [], stopped: String(e.message || e).split('\n')[0] }));
  })();
  if (dead.stopped) add('info', 'dead-control', 'page', `The press check stopped early: a press left the page (${dead.stopped}).`, 'Nothing to fix for this; check the remaining buttons by hand.');
  report.deadChecked = dead.checked;
  for (const d of dead.dead) add('serious', 'dead-control', d, 'Pressing it changed nothing: no change on the page, no focus move, no navigation, no request, nothing copied.', 'Wire it to what it says, or remove it. In a demo, a button that only shows its result (a line saying "Opened the readers report") still answers the press.');
} catch (e) {
  // a crash or a page that didn't load: say so and exit 4, so it is never read as "not ready" (exit 1)
  await browser?.close();
  console.error(`The probe could not run on ${url}: ${String(e.message || e).split('\n')[0]}. Nothing was checked.`);
  process.exit(4);
} finally {
  await browser?.close();
}

/* ── report ──────────────────────────────────────────────────────────────────────────────────────────────────── */
const uniq = []; const keys = new Set();
for (const f of findings) { const k = `${f.area}|${f.element}|${f.message}`; if (!keys.has(k)) { keys.add(k); uniq.push(f); } }
uniq.sort((a, b) => SEV[b.severity] - SEV[a.severity]);
const count = (s) => uniq.filter((f) => f.severity === s).length;
const verdict = count('blocker') ? 'BROKEN' : (count('serious') || count('moderate')) ? 'NOT READY' : 'CLEAN';
report.findings = uniq; report.verdict = verdict;
// what the presses tried to send: a list beside the findings, never one of them
report.allowWrites = allowWrites;
report.heldBack = allowWrites ? [] : [...writes.values()];
if (allowWrites) report.sentWrites = [...writes.values()];
report.summary = { blocker: count('blocker'), serious: count('serious'), moderate: count('moderate'), info: count('info'), tabStops: report.tabStops.length, focusable: report.candidates };

const L = [];
L.push(`Antheo access probe: ${url}`);
L.push(`VERDICT: ${verdict}   blockers ${count('blocker')} · serious ${count('serious')} · moderate ${count('moderate')} · info ${count('info')}`);
L.push(`Tab stops ${report.tabStops.length} of ${report.candidates} focusable · landmarks ${report.inventory.landmarks.length} · headings ${report.inventory.headings.length} · live regions ${report.inventory.live.length} · triggers tried ${report.triggers.length}`);
L.push('');
const shown = quiet ? uniq.filter((f) => f.severity === 'blocker') : uniq;
for (const f of shown.slice(0, quiet ? 10 : 40)) { L.push(`[${f.severity.toUpperCase()}] ${f.area}: ${f.element}`); L.push(`    ${f.message}`); if (f.fix) L.push(`    Fix: ${f.fix}`); }
if (shown.length > (quiet ? 10 : 40)) L.push(`... ${shown.length - (quiet ? 10 : 40)} more (see --json)`);
if (!quiet) {
  L.push('');
  L.push('Landmarks: ' + (report.inventory.landmarks.map((l) => l.role + (l.name ? `("${l.name}")` : '')).join(', ') || 'none'));
  L.push('Headings:  ' + (report.inventory.headings.map((h) => `h${h.level} ${h.text}`).slice(0, 14).join(' | ') || 'none'));
  L.push('Live:      ' + (report.inventory.live.map((l) => `${l.kind}${l.live ? '=' + l.live : ''}`).join(', ') || 'none (async results will not be announced)'));
}
if (writes.size) {
  // method and a short path (the page's own origin left off), each once, eight at most
  const origin = (() => { try { return new URL(url).origin; } catch { return ''; } })();
  const names = [...writes.values()].map((w) => `${w.method} ${(w.url.startsWith(origin + '/') ? w.url.slice(origin.length) : w.url).slice(0, 60)}${w.count > 1 ? ` (${w.count} times)` : ''}`);
  const list = names.slice(0, 8).join(', ') + (names.length > 8 ? `, and ${names.length - 8} more (see --json)` : '');
  L.push('');
  L.push(allowWrites
    ? `[INFO] writes: --allow-writes was on, so the presses really sent ${list}.`
    : `[INFO] writes: held back ${list}. Nothing was sent; each press that tried counts as answered. --allow-writes lets them through (only on a page whose data you can lose).`);
}
console.log(L.join('\n'));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));
process.exit(verdict === 'CLEAN' ? 0 : verdict === 'NOT READY' ? 1 : 3);

// Chrome, then Edge, then Playwright's own Chromium; one clear line if none is installed. (The same function is in every
// Antheo tool that opens a browser; tests/self-test.mjs keeps the copies identical.)
async function launchBrowser(chromium) {
  for (const options of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { return await chromium.launch(options); } catch { /* try the next one */ }
  }
  console.error('No browser found. Install Chrome or Edge, or run: npx playwright install chromium');
  process.exit(2);
}
