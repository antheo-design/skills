#!/usr/bin/env node
/*
 * Grades eval results. Each results folder holds one sub-folder per eval id (index.html or answer.md), made by any
 * agent (Claude Code, Codex, Cursor, …) from evals.json. Every check is measured: in a real browser for pages
 * (check-page, axe, the computed styles, an iPhone 15 emulation for the phone brief) and by pattern for answers.
 *
 *   node evals/run.mjs <results-dir>                         grade one run
 *   node evals/run.mjs <with-dir> --baseline <without-dir>   grade both, side by side, with the difference
 *   options: --only build,layout   --json report.json   --html report.html
 *
 * Exit code 0 always (it is a measurement, not a gate). Needs playwright-core (or playwright) and Chrome, and
 * axe-core for the contrast and axe checks (both resolved from the current project).
 */
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
// the skills sit beside this folder (evals) or in a skills folder next to it (evals/ and skills/)
const SKILLS = existsSync(join(here, '..', 'skills', 'antheo-review')) ? resolve(here, '..', 'skills') : resolve(here, '..');
const CHECK_PAGE = join(SKILLS, 'antheo-review', 'scripts', 'check-page.mjs');
const COPY_LINT = join(SKILLS, 'antheo-writing', 'scripts', 'copy-lint.mjs');
const { iphone } = await import(pathToFileURL(join(here, 'lib', 'iphone.mjs')).href);
const EVALS = JSON.parse(readFileSync(join(here, 'evals.json'), 'utf8')).evals;

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : null; };
const dirs = argv.filter((a, i) => !a.startsWith('--') && !['--baseline', '--only', '--json', '--html'].includes(argv[i - 1]));
if (!dirs.length) { console.log('usage: node run.mjs <results-dir> [--baseline <dir>] [--only ids] [--json out] [--html out]'); process.exit(2); }
const runs = [{ name: 'with', dir: resolve(dirs[0]) }];
if (opt('baseline')) runs.unshift({ name: 'without', dir: resolve(opt('baseline')) });
const only = opt('only')?.split(',');

const require = createRequire(pathToFileURL(resolve('package.json')).href);
let chromium;
for (const n of ['playwright-core', 'playwright']) { try { const m = await import(pathToFileURL(require.resolve(n)).href); chromium = m.chromium ?? m.default.chromium; break; } catch { /* next */ } }
if (!chromium) { console.log('playwright-core is not installed in this project'); process.exit(2); }
let AXE = null;
try { AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch { /* axe checks report "not verified" */ }
const TMP = mkdtempSync(join(tmpdir(), 'antheo-evals-'));

/* ---------- helpers that run inside the page ---------- */
const pageFacts = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const textEls = [...document.querySelectorAll('body *')].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const sizes = new Set(textEls.map((e) => getComputedStyle(e).fontSize));
  const weights = new Set(textEls.map((e) => getComputedStyle(e).fontWeight));
  const radii = new Set([...document.querySelectorAll('body *')].filter(vis).map((e) => getComputedStyle(e).borderTopLeftRadius).filter((r) => r !== '0px' && parseFloat(r) < 100));
  const texts = textEls.map((e) => e.textContent.trim().replace(/\s+/g, ' '));
  return { sizes: sizes.size, weights: weights.size, radii: radii.size, texts };
};

async function visual(browser, file, ev) {
  const res = {};
  const url = pathToFileURL(file).href;
  // the page check, at a phone and a desktop width, light and dark
  const out = join(TMP, `${ev.id}-${Math.random().toString(36).slice(2)}.json`);
  spawnSync(process.execPath, [CHECK_PAGE, file, '--widths', '390,1280', '--json', out, '--quiet'], { encoding: 'utf8', timeout: 240000 });
  const cp = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
  res.score = cp?.overall ?? null;
  res.highs = cp ? cp.findings.filter((f) => ['blocker', 'high'].includes(f.severity)).map((f) => f.rule) : null;
  const ctx = await browser.newContext({ viewport: { width: 900, height: 800 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  res.errors = errors;
  res.facts = await page.evaluate(pageFacts);
  res.page = page;
  res.ctx = ctx;
  res.file = file;
  res.html = readFileSync(file, 'utf8');
  return res;
}

const axe = async (page, rules) => {
  if (!AXE) return null;
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  return page.evaluate(async (r) => (await window.axe.run(document, r ? { runOnly: r } : { resultTypes: ['violations'] })).violations.map((v) => `${v.id} (${v.nodes.length})`), rules);
};
const copyHighs = (file) => {
  const out = join(TMP, `copy-${Math.random().toString(36).slice(2)}.json`);
  spawnSync(process.execPath, [COPY_LINT, file, '--json', out], { encoding: 'utf8', timeout: 60000 });
  if (!existsSync(out)) return null;
  return JSON.parse(readFileSync(out, 'utf8')).findings.filter((f) => f.severity !== 'low').map((f) => `${f.rule}: ${f.text}`);
};
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/* ---------- the checks: each returns { pass, detail } or { pass: null, detail } when it couldn't run ---------- */
const CHECKS = {
  'page-clean': async (r) => (r.highs === null ? { pass: null, detail: 'page check did not run' } : { pass: r.highs.length === 0 && r.errors.length === 0, detail: r.highs.length || r.errors.length ? [...r.highs, ...r.errors].slice(0, 4).join('; ') : `score ${r.score}` }),
  'text-sizes': async (r, e) => ({ pass: r.facts.sizes <= e.max, detail: `${r.facts.sizes} sizes` }),
  weights: async (r, e) => ({ pass: r.facts.weights <= e.max, detail: `${r.facts.weights} weights` }),
  'radius-count': async (r, e) => ({ pass: r.facts.radii <= e.max, detail: `${r.facts.radii} corner sizes` }),
  'no-text': async (r, e) => { const re = new RegExp(e.pattern, e.flags ?? ''); const hit = r.facts.texts.filter((t) => re.test(t)); return { pass: !hit.length, detail: hit.slice(0, 3).join(' | ') || 'none' }; },
  'has-text': async (r, e) => { const re = new RegExp(e.pattern, e.flags ?? 'i'); return { pass: re.test(r.facts.texts.join('\n')), detail: e.pattern }; },
  'copy-clean': async (r) => { const h = copyHighs(r.file); return h === null ? { pass: null, detail: 'copy-lint did not run' } : { pass: !h.length, detail: h.slice(0, 3).join('; ') || 'clean' }; },
  'switches-named': async (r) => r.page.evaluate(() => {
    const sw = [...document.querySelectorAll('[role=switch], input[type=checkbox]')];
    const named = sw.filter((e) => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.labels?.length || e.closest('label')));
    return { pass: sw.length >= 3 && named.length === sw.length, detail: `${named.length}/${sw.length} named` };
  }),
  'primary-buttons': async (r, e) => r.page.evaluate((max) => {
    // a switch, a checkbox, a radio, a tab or a pressed toggle drawn as a button is a control's state, not an action
    const btns = [...document.querySelectorAll('button, [role=button], input[type=submit]')].filter((b) => b.getBoundingClientRect().width && !b.matches('[role=switch], [role=checkbox], [role=radio], [role=tab], [role=menuitemradio], [aria-pressed]'));
    const bg = (b) => getComputedStyle(b).backgroundColor;
    const filled = btns.filter((b) => { if (getComputedStyle(b).backgroundImage.includes('gradient')) return true; const c = bg(b).match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255, 0]; const a = c[3] ?? 1; const l = (c[0] + c[1] + c[2]) / 3; return a > 0.5 && (l < 90 || Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 60); });
    return { pass: filled.length <= max, detail: `${filled.length} filled` };
  }, e.max),
  'no-gradient-text': async (r) => r.page.evaluate(() => { const n = [...document.querySelectorAll('body *')].filter((e) => /text/.test(getComputedStyle(e).backgroundClip || getComputedStyle(e).webkitBackgroundClip)).length; return { pass: n === 0, detail: `${n} gradient-text elements` }; }),
  'headline-words': async (r, e) => r.page.evaluate((max) => { const h = document.querySelector('h1'); const n = h ? h.textContent.trim().split(/\s+/).length : 0; return { pass: !!h && n <= max, detail: h ? `${n} words` : 'no h1' }; }, e.max),
  'no-pill-above-h1': async (r) => r.page.evaluate(() => {
    const h = document.querySelector('h1'); if (!h) return { pass: null, detail: 'no h1' };
    const top = h.getBoundingClientRect().top;
    const pills = [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return b.bottom <= top + 2 && b.bottom > top - 80 && parseFloat(s.borderTopLeftRadius) >= b.height / 2 - 1 && b.height < 40 && b.width < 400 && e.textContent.trim() && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderTopWidth) > 0); });
    return { pass: pills.length === 0, detail: pills.length ? pills[0].textContent.trim().slice(0, 40) : 'none' };
  }),
  'both-themes': async (r) => r.page.evaluate(() => {
    const ls = [...document.querySelectorAll('body, body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 150 && b.height > 100; }).map((e) => getComputedStyle(e).backgroundColor).filter((c) => !/rgba\(0, 0, 0, 0\)/.test(c)).map((c) => (c.match(/[\d.]+/g) || []).slice(0, 3).reduce((a, x) => a + +x, 0) / 3);
    const dark = ls.some((l) => l < 60); const light = ls.some((l) => l > 200);
    return { pass: dark && light, detail: `${dark ? 'dark' : 'no dark'} + ${light ? 'light' : 'no light'}` };
  }),
  'uses-colour': async (r, e) => {
    const want = hexRgb(e.hex);
    const cols = await r.page.evaluate(() => [...document.querySelectorAll('body *')].flatMap((x) => { const s = getComputedStyle(x); return [s.backgroundColor, s.color, s.borderTopColor]; }));
    const near = cols.map(rgb).some((c) => c.length === 3 && Math.max(...c.map((v, i) => Math.abs(v - want[i]))) <= e.tolerance);
    return { pass: near, detail: near ? `${e.hex} found` : `${e.hex} not used` };
  },
  'custom-properties': async (r, e) => { const n = new Set([...r.html.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])).size; return { pass: n >= e.min, detail: `${n} custom properties` }; },
  'dark-ground': async (r) => r.page.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor; const v = (c.match(/[\d.]+/g) || [255, 255, 255]).slice(0, 3).reduce((a, x) => a + +x, 0) / 3; const h = getComputedStyle(document.documentElement).backgroundColor; const w = (h.match(/[\d.]+/g) || [255]).slice(0, 3).reduce((a, x) => a + +x, 0) / 3; return { pass: Math.min(v, /rgba\(0, 0, 0, 0\)/.test(h) ? v : w) < 60, detail: c }; }),
  contrast: async (r) => { const v = await axe(r.page, { type: 'rule', values: ['color-contrast'] }); return v === null ? { pass: null, detail: 'axe-core not installed' } : { pass: !v.length, detail: v.join('; ') || 'all pass' }; },
  'axe-clean': async (r) => { const v = await axe(r.page); return v === null ? { pass: null, detail: 'axe-core not installed' } : { pass: !v.length, detail: v.join('; ') || 'no violations' }; },
  'tabular-numbers': async (r) => r.page.evaluate(() => { const els = [...document.querySelectorAll('body *')].filter((e) => /\d[\d,.]*\d/.test([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''))); const tab = els.filter((e) => /tabular-nums/.test(getComputedStyle(e).fontVariantNumeric)); return { pass: els.length > 0 && tab.length >= Math.ceil(els.length * 0.6), detail: `${tab.length}/${els.length} number elements tabular` }; }),
  'no-caps-labels': async (r) => r.page.evaluate(() => { const n = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).textTransform === 'uppercase' && parseFloat(getComputedStyle(e).letterSpacing) > 0.5 && e.textContent.trim()).length; return { pass: n === 0, detail: `${n} spaced capital labels` }; }),
  'one-left-edge': async (r, e) => r.page.evaluate((tol) => {
    const pick = (sel) => [...document.querySelectorAll(sel)].filter((x) => x.getBoundingClientRect().width);
    const xs = [...pick('h1,h2,h3'), ...pick('input'), ...pick('button, [role=button]')].map((x) => Math.round(x.getBoundingClientRect().left));
    if (xs.length < 3) return { pass: null, detail: 'not enough elements to compare' };
    const min = Math.min(...xs); const off = xs.filter((x) => x - min > tol && x - min < 200);
    return { pass: off.length <= 1, detail: `${new Set(xs).size} distinct left edges (${[...new Set(xs)].join(', ')})` };
  }, e.tolerance),
  'no-overflow': async (r, e) => {
    const bad = [];
    for (const w of e.widths) { await r.page.setViewportSize({ width: w, height: 800 }); await r.page.waitForTimeout(150); if (await r.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) bad.push(w); }
    await r.page.setViewportSize({ width: 900, height: 800 });
    return { pass: !bad.length, detail: bad.length ? `scrolls sideways at ${bad.join(', ')}` : 'no sideways scroll' };
  },
  'card-no-outline': async (r) => r.page.evaluate(() => {
    const cards = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 240 && b.height > 100 && e.querySelector('input, button'); });
    const c = cards.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)[0];
    if (!c) return { pass: null, detail: 'no card found' };
    const s = getComputedStyle(c); const w = parseFloat(s.borderTopWidth); const col = s.borderTopColor; const a = (col.match(/[\d.]+/g) || [])[3];
    const visible = w >= 1 && (a === undefined || +a > 0.15) && col !== 'transparent';
    return { pass: !visible, detail: visible ? `${w}px border ${col}` : 'no visible border' };
  }),
  'field-is-well': async (r) => r.page.evaluate(() => {
    const f = document.querySelector('input'); if (!f) return { pass: null, detail: 'no field' };
    let p = f.parentElement; while (p && getComputedStyle(p).backgroundColor === 'rgba(0, 0, 0, 0)') p = p.parentElement;
    const a = getComputedStyle(f).backgroundColor; const b = p ? getComputedStyle(p).backgroundColor : 'rgb(255, 255, 255)';
    return { pass: a !== b && a !== 'rgba(0, 0, 0, 0)', detail: `field ${a} on ${b}` };
  }),
  'state-labels': async (r, e) => { const t = r.facts.texts.join(' ').toLowerCase(); const found = ['rest|default|idle', 'hover', 'focus', 'press|active', 'disabled', 'loading|sending', 'error|fail', 'success|sent|done'].filter((k) => new RegExp(`\\b(${k})`).test(t)); return { pass: found.length >= e.min, detail: `${found.length} states labelled` }; },
  'states-distinct': async (r) => r.page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role=button]')].filter((b) => b.getBoundingClientRect().width && /send|invite|sent|sending/i.test(b.textContent));
    const look = (b) => { const s = getComputedStyle(b); return [s.backgroundColor, s.color, s.boxShadow, s.outlineStyle, s.opacity, b.textContent.trim()].join('|'); };
    const looks = btns.map(look); const dup = looks.length - new Set(looks).size;
    return { pass: btns.length >= 6 && dup <= 1, detail: `${btns.length} buttons, ${dup} look like another` };
  }),
  'sorted-desc': async (r, e) => { const t = r.facts.texts.join('\n'); const at = e.values.map((v) => t.indexOf(v)); return { pass: at.every((x, i) => x >= 0 && (i === 0 || x > at[i - 1])), detail: at.includes(-1) ? 'a client is missing' : at.every((x, i) => i === 0 || x > at[i - 1]) ? 'largest first' : 'not in amount order' }; },
  'numbers-end-aligned': async (r) => r.page.evaluate(() => {
    const cells = [...document.querySelectorAll('td, [role=cell], [role=gridcell]')].filter((c) => /^\$?[\d,]+(\.\d+)?$/.test(c.textContent.trim().replace(/\s/g, '')));
    if (!cells.length) { const els = [...document.querySelectorAll('body *')].filter((e) => /^\$[\d,]+(\.\d+)?$/.test(e.textContent.trim())); const rights = new Set(els.map((e) => Math.round(e.getBoundingClientRect().right))); return { pass: els.length >= 3 && rights.size <= Math.ceil(els.length / 3), detail: `${rights.size} right edges for ${els.length} amounts` }; }
    const ok = cells.filter((c) => /right|end/.test(getComputedStyle(c).textAlign) || getComputedStyle(c).justifyContent.includes('end')).length;
    return { pass: ok >= cells.length * 0.75, detail: `${ok}/${cells.length} amount cells end-aligned` };
  }),
  'controls-named': async (r) => r.page.evaluate(() => { const c = [...document.querySelectorAll('button, [role=button], a[href], input, select')].filter((e) => e.getBoundingClientRect().width); const un = c.filter((e) => !(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.textContent.trim() || e.labels?.length || e.title)); return { pass: !un.length, detail: `${un.length} unnamed of ${c.length}` }; }),
  'field-labelled': async (r) => r.page.evaluate(() => { const f = [...document.querySelectorAll('input')].filter((e) => e.getBoundingClientRect().width); const un = f.filter((e) => !(e.labels?.length || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'))); return { pass: f.length > 0 && !un.length, detail: `${f.length - un.length}/${f.length} fields labelled` }; }),
  'focus-visible': async (r) => {
    const n = await r.page.evaluate(() => [...document.querySelectorAll('button, a[href], input, select, [tabindex="0"]')].filter((e) => e.getBoundingClientRect().width).length);
    let shown = 0;
    for (let i = 0; i < Math.min(n, 8); i++) {
      await r.page.keyboard.press('Tab');
      const ok = await r.page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return false; const s = getComputedStyle(e); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'; });
      if (ok) shown++;
    }
    return { pass: shown >= Math.min(n, 8), detail: `${shown}/${Math.min(n, 8)} focus stops visible` };
  },
  // the first control is pressed once; something must be animating 60ms later (a squash, a pop, a ripple)
  'plays-on-press': async (r) => r.page.evaluate(async () => {
    const b = document.querySelector('button, [role=button], [role=switch]');
    if (!b) return { pass: false, detail: 'no button to press' };
    b.click();
    await new Promise((res) => setTimeout(res, 60));
    const n = document.getAnimations().filter((a) => a.playState === 'running').length;
    return { pass: n > 0, detail: `${n} animation(s) running after the press` };
  }),
  'no-clipped-text': async (r) => r.page.evaluate(() => { const c = [...document.querySelectorAll('button, [role=button], label, span, p, h1, h2, h3, div')].filter((e) => e.getBoundingClientRect().width && e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible'); return { pass: !c.length, detail: c.length ? c.slice(0, 2).map((e) => e.textContent.trim().slice(0, 30)).join(' | ') : 'nothing cut off' }; }),
};

/* ---------- motion and phone checks open their own pages ---------- */
async function motionChecks(browser, file, ev) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 800 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const html = readFileSync(file, 'utf8');
  const out = {};
  const btn = page.locator('button').first();
  for (const e of ev.expect) {
    if (e.check === 'menu-opens' || e.check === 'open-duration' || e.check === 'no-linear-or-ease-in-open') {
      if (!out._menu) {
        const before = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((x) => /newest first/i.test(x.textContent) && x.getBoundingClientRect().height && getComputedStyle(x).visibility !== 'hidden' && +getComputedStyle(x).opacity > 0.1).length);
        await btn.click().catch(() => {});
        await page.waitForTimeout(600);
        const info = await page.evaluate(() => {
          const item = [...document.querySelectorAll('body *')].find((x) => /^newest first/i.test(x.textContent.trim()) && x.children.length === 0);
          if (!item) return null;
          const isMenu = (x) => /^(menu|listbox|dialog)$/.test(x.getAttribute('role') || '') || x.tagName === 'DIALOG' || x.hasAttribute('popover') || /(^|[\s_-])(menu|popover|dropdown|listbox|popup)([\s_-]|$)/i.test(typeof x.className === 'string' ? x.className : '');
          let m = item.parentElement; while (m && m !== document.body && !isMenu(m)) m = m.parentElement;
          if (!m || m === document.body) m = item.parentElement;
          const s = getComputedStyle(m);
          const durs = s.transitionDuration.split(',').concat(s.animationDuration.split(',')).map((d) => parseFloat(d) * (d.includes('ms') ? 1 : 1000)).filter((d) => d > 0);
          return { visible: m.getBoundingClientRect().height > 0 && s.visibility !== 'hidden' && +s.opacity > 0.5, dur: durs.length ? Math.max(...durs) : 0, ease: s.transitionTimingFunction + ' ' + s.animationTimingFunction };
        });
        out._menu = { before, info };
      }
      const m = out._menu;
      if (e.check === 'menu-opens') out[e.check] = { pass: !!m.info?.visible, detail: m.info?.visible ? 'menu visible after press' : 'menu not found after press' };
      if (e.check === 'open-duration') out[e.check] = m.info ? { pass: m.info.dur > 0 && m.info.dur <= e.max, detail: m.info.dur ? `${m.info.dur}ms` : 'no transition on the menu' } : { pass: null, detail: 'no menu' };
      if (e.check === 'no-linear-or-ease-in-open') out[e.check] = m.info ? { pass: !/\blinear\b|\bease-in\b(?!-out)/.test(m.info.ease), detail: m.info.ease.trim() } : { pass: null, detail: 'no menu' };
    } else if (e.check === 'no-transition-all') {
      const n = (html.match(/transition\s*:\s*all\b/g) || []).length;
      out[e.check] = { pass: n === 0, detail: `${n} transition: all` };
    } else if (e.check === 'label-steps' || e.check === 'no-layout-shift') {
      if (!out._steps) {
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(400);
        const b = page.locator('button').first();
        const box0 = await b.boundingBox();
        const seen = [(await b.textContent())?.trim()];
        const sizes = [];
        const t0 = Date.now();
        await b.click().catch(() => {});
        while (Date.now() - t0 < (e.within ?? 4000)) {
          await page.waitForTimeout(120);
          const tx = (await b.textContent().catch(() => ''))?.trim().replace(/\s+/g, ' ');
          if (tx && tx !== seen[seen.length - 1]) seen.push(tx);
          const bb = await b.boundingBox().catch(() => null);
          if (bb) sizes.push(bb);
        }
        out._steps = { seen, box0, sizes };
      }
      const s = out._steps;
      if (e.check === 'label-steps') out[e.check] = { pass: s.seen.length >= e.min, detail: s.seen.join(' → ') };
      if (e.check === 'no-layout-shift') { const moved = s.sizes.some((b) => s.box0 && (Math.abs(b.width - s.box0.width) > 2 || Math.abs(b.height - s.box0.height) > 2)); out[e.check] = { pass: !moved, detail: moved ? 'the button changes size' : 'the button keeps its size' }; }
    } else if (e.check === 'reduced-motion') {
      out[e.check] = { pass: /prefers-reduced-motion/.test(html), detail: /prefers-reduced-motion/.test(html) ? 'handled' : 'no reduced-motion rule' };
    }
  }
  await ctx.close();
  delete out._menu; delete out._steps;
  return out;
}

async function phoneChecks(browser, file, ev) {
  const html = readFileSync(file, 'utf8');
  const url = pathToFileURL(file).href;
  const out = {};
  let { ctx, page } = await iphone(browser, url, { scale: 1 });
  for (const e of ev.expect) {
    if (e.check === 'viewport-fit-cover') out[e.check] = { pass: /viewport-fit\s*=\s*cover/.test(html), detail: /viewport-fit\s*=\s*cover/.test(html) ? 'viewport-fit=cover' : 'missing' };
    if (e.check === 'field-16px') out[e.check] = await page.evaluate(() => { const f = document.querySelector('input, textarea'); const px = f ? parseFloat(getComputedStyle(f).fontSize) : 0; return { pass: px >= 16, detail: f ? `${px}px` : 'no field' }; });
    if (e.check === 'clear-of-island') out[e.check] = await page.evaluate(() => { const hits = [...document.querySelectorAll('body *')].filter((x) => { const b = x.getBoundingClientRect(); return [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && b.height && b.top < 54; }); return { pass: !hits.length, detail: hits.length ? `"${hits[0].textContent.trim().slice(0, 24)}" at ${Math.round(hits[0].getBoundingClientRect().top)}pt` : 'nothing above 54pt' }; });
  }
  await ctx.close();
  if (ev.expect.some((e) => e.check === 'action-above-keyboard')) {
    ({ ctx, page } = await iphone(browser, url, { keyboard: true, scale: 1 }));
    out['action-above-keyboard'] = await page.evaluate(() => {
      const kbTop = innerHeight - 336;
      const btns = [...document.querySelectorAll('button, [role=button], input[type=submit]')].filter((b) => /save|done|add|create/i.test(b.textContent + (b.value || '')));
      const b = btns[btns.length - 1];
      if (!b) return { pass: null, detail: 'no save button found' };
      const r = b.getBoundingClientRect();
      return { pass: r.bottom <= kbTop + 1 && r.top >= 0, detail: `button bottom at ${Math.round(r.bottom)}pt, keyboard top at ${kbTop}pt` };
    });
    await ctx.close();
  }
  return out;
}

function answerChecks(file, ev) {
  const t = readFileSync(file, 'utf8');
  const out = {};
  for (const e of ev.expect) {
    const flags = e.flags ?? '';
    if (e.check === 'answer-first-line') { const first = t.split('\n').find((l) => l.trim()) ?? ''; out[e.check] = { pass: new RegExp(e.pattern, flags).test(first), detail: first.slice(0, 80) }; }
    if (e.check === 'answer-mentions') { const miss = e.all.filter((p) => !new RegExp(p, flags).test(t)); out[`${e.check}:${e.all.join('+').slice(0, 30)}`] = { pass: !miss.length, detail: miss.length ? `missing: ${miss.join(', ')}` : 'all found' }; }
    if (e.check === 'answer-cites-lines') { const n = (t.match(/(:\d+\b|\bline \d+|\bL\d+\b)/gi) || []).length; out[e.check] = { pass: n >= e.min, detail: `${n} line references` }; }
    if (e.check === 'answer-has-question') out[e.check] = { pass: /\?\s*$/m.test(t), detail: /\?\s*$/m.test(t) ? 'asks' : 'no question' };
    if (e.check === 'answer-not') out[e.check] = { pass: !new RegExp(e.pattern, flags).test(t), detail: new RegExp(e.pattern, flags).test(t) ? 'redesigned' : 'did not redesign' };
  }
  return out;
}

/* ---------- run ---------- */
const browser = await launchBrowser(chromium);
const results = {};
try {
  for (const ev of EVALS) {
    if (only && !only.includes(ev.id)) continue;
    results[ev.id] = {};
    for (const run of runs) {
      const dir = join(run.dir, ev.id);
      const file = ev.type === 'answer' ? join(dir, 'answer.md') : join(dir, 'index.html');
      if (!existsSync(file)) { results[ev.id][run.name] = { missing: true }; continue; }
      let checks = {};
      try {
        if (ev.type === 'answer') checks = answerChecks(file, ev);
        else if (ev.type === 'motion') checks = await motionChecks(browser, file, ev);
        else if (ev.type === 'phone') checks = await phoneChecks(browser, file, ev);
        else {
          const r = await visual(browser, file, ev);
          for (const e of ev.expect) {
            const fn = CHECKS[e.check];
            checks[e.check] = fn ? await fn(r, e).catch((err) => ({ pass: null, detail: `error: ${err.message.slice(0, 80)}` })) : { pass: null, detail: 'unknown check' };
          }
          await r.ctx.close();
        }
      } catch (err) { checks = { run: { pass: null, detail: `could not run: ${err.message.slice(0, 100)}` } }; }
      const vals = Object.values(checks);
      results[ev.id][run.name] = { checks, passed: vals.filter((c) => c.pass === true).length, failed: vals.filter((c) => c.pass === false).length, unverified: vals.filter((c) => c.pass === null).length };
    }
    const line = runs.map((r) => { const x = results[ev.id][r.name]; return x.missing ? `${r.name}: missing` : `${r.name}: ${x.passed}/${x.passed + x.failed}${x.unverified ? ` (${x.unverified} not verified)` : ''}`; }).join('   ');
    console.log(`${ev.id.padEnd(13)} ${line}`);
  }
} finally {
  await browser.close();
}
const total = (name) => Object.values(results).reduce((a, r) => { const x = r[name]; if (!x || x.missing) return a; return { p: a.p + x.passed, n: a.n + x.passed + x.failed, u: a.u + x.unverified }; }, { p: 0, n: 0, u: 0 });
console.log('');
for (const r of runs) { const t = total(r.name); console.log(`${r.name.padEnd(8)} ${t.p}/${t.n} checks pass (${t.n ? Math.round((t.p / t.n) * 100) : 0}%)${t.u ? `, ${t.u} not verified` : ''}`); }
const report = { at: new Date().toISOString(), runs: runs.map((r) => ({ ...r, ...total(r.name) })), results };
if (opt('json')) writeFileSync(opt('json'), JSON.stringify(report, null, 2));
if (opt('html')) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const rows = Object.entries(results).flatMap(([id, r]) => { const keys = [...new Set(runs.flatMap((x) => Object.keys(r[x.name]?.checks ?? {})))]; return keys.map((k, i) => `<tr>${i === 0 ? `<th rowspan="${keys.length}">${id}</th>` : ''}<td>${esc(k)}</td>${runs.map((x) => { const c = r[x.name]?.checks?.[k]; return `<td class="${c ? (c.pass === true ? 'ok' : c.pass === false ? 'no' : 'nv') : 'nv'}">${c ? esc(c.detail) : 'none'}</td>`; }).join('')}</tr>`); }).join('');
  writeFileSync(opt('html'), `<!doctype html><meta charset="utf-8"><title>Antheo evals</title><style>body{font:13px system-ui;margin:24px}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:4px 8px;text-align:left;vertical-align:top}.ok{background:#e6f6ec}.no{background:#fde8e8}.nv{background:#f4f4f4;color:#777}</style><h1>Antheo evals</h1><p>${runs.map((r) => { const t = total(r.name); return `${r.name}: ${t.p}/${t.n}`; }).join(' · ')}</p><table><tr><th>eval</th><th>check</th>${runs.map((r) => `<th>${r.name}</th>`).join('')}</tr>${rows}</table>`);
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
