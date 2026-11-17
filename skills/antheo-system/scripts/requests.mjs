#!/usr/bin/env node
/*
 * Antheo requests: what a screen sends, captured and compared. A migrated screen that looks the same and sends a
 * different request is broken, and no screenshot shows it (references/parity.md, section 3).
 *
 *   node requests.mjs capture http://localhost:3000/invoices/new --fill "#amount=1,234.50" --fill "#due=2026-11-17"
 *                             --press "button[type=submit]" --out before.json
 *   node requests.mjs capture <the migrated screen> <the same --fill and --press, in the same order> --out after.json
 *   node requests.mjs diff before.json after.json
 *
 * capture opens the page, fills and presses in the order given, and writes every request that would change something
 * (any method but GET, HEAD and OPTIONS) as { method, path, query, contentType, body }. Nothing is sent: each one is
 * stopped before it leaves the browser (the same guard as antheo-access's a11y-probe), so the page sees it fail and
 * the backend never hears of it. A JSON body is parsed and its keys sorted; a form body (URL-encoded or multipart) is
 * decoded into sorted [name, value] pairs, a file written as its name, type and size; anything else is kept as text.
 * Query pairs are sorted too. The host is left out, so the old and the new screen may live at different addresses.
 *   --fill "<selector>=<value>"   types into a field, picks a select's option (by value, then by label), or ticks a
 *                                 checkbox or radio ("true" or "false"). The first "=" outside brackets splits it.
 *   --press "<selector>"          clicks it, then waits for what it sends
 *   --wait <ms>                   how long to wait after each press (default 800)
 *   --reads                       also write the GET requests scripts make after the first step (a search, a filter);
 *                                 these are let through
 *   --out <file>                  where to write (default: printed)
 *
 * diff pairs the requests by method and path, in the order they were sent, and prints every difference field by
 * field: a key on one side only, a changed type ("12" a string against 12 a number), a changed value ("2026-11-17"
 * against "17/11/2026"), "" against null, one request against two.
 *
 * Exit codes: 0 captured, or the two files are the same · 1 they differ · 2 wrong usage · 4 the page or a file could
 * not be read, or a selector matched nothing: nothing was captured or compared.
 * capture needs playwright-core (npm i -D playwright-core) and Chrome or Edge; diff needs nothing. Closes the browser
 * when done, always.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [cmd, ...rest] = process.argv.slice(2);
const USAGE = 'usage: node requests.mjs capture <url or html file> [--fill "<selector>=<value>"]... [--press "<selector>"]... [--wait 800] [--reads] [--out before.json]\n       node requests.mjs diff <before.json> <after.json>';
const fail = (code, msg) => { console.error(msg); process.exit(code); };
const READS = ['GET', 'HEAD', 'OPTIONS'];

/* ── one shape for every request, so two captures can be compared line by line ───────────────────────────────── */
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
const sortPairs = (pairs) => pairs.sort((a, b) => (a[0] === b[0] ? String(JSON.stringify(a[1])).localeCompare(String(JSON.stringify(b[1]))) : a[0].localeCompare(b[0])));
// multipart: each part's name with its text, or with the file's name, type and size (never its bytes)
function multipart(buf, boundary) {
  const pairs = [];
  for (const part of buf.toString('latin1').split(`--${boundary}`).slice(1, -1)) {
    const cut = part.indexOf('\r\n\r\n');
    const head = part.slice(0, cut), body = part.slice(cut + 4).replace(/\r\n$/, '');
    const name = head.match(/name="([^"]*)"/)?.[1] ?? '';
    const file = head.match(/filename="([^"]*)"/)?.[1];
    pairs.push([name, file === undefined ? Buffer.from(body, 'latin1').toString('utf8') : { file, type: head.match(/content-type:\s*([^\r\n;]+)/i)?.[1] ?? '', bytes: body.length }]);
  }
  return sortPairs(pairs);
}
function shape(req) {
  const u = new URL(req.url());
  const type = (req.headers()['content-type'] ?? '').trim();
  const contentType = type.split(';')[0].trim().toLowerCase() || null;
  const buf = req.postDataBuffer();
  let body = null;
  if (buf?.length) {
    const text = buf.toString('utf8');
    if (/json/.test(contentType ?? '')) { try { body = sortKeys(JSON.parse(text)); } catch { body = text; } }
    else if (contentType === 'application/x-www-form-urlencoded') body = sortPairs([...new URLSearchParams(text)]);
    else if (contentType === 'multipart/form-data') body = multipart(buf, type.match(/boundary=("?)([^";]+)\1/)?.[2] ?? '');
    else body = text;
  }
  return { method: req.method(), path: u.pathname, query: sortPairs([...u.searchParams]), contentType, body };
}

/* ── capture ─────────────────────────────────────────────────────────────────────────────────────────────────── */
if (cmd === 'capture') {
  const VALUE = ['--fill', '--press', '--wait', '--out'];
  const target = rest.find((a, i) => !a.startsWith('--') && !VALUE.includes(rest[i - 1]));
  if (!target) fail(2, USAGE);
  const opt = (name) => { const i = rest.indexOf(name); return i < 0 ? undefined : rest[i + 1]; };
  const wait = Number(opt('--wait')) || 800;
  const reads = rest.includes('--reads');
  // the steps, in the order they were written
  const steps = [];
  rest.forEach((a, i) => {
    if (a === '--press' && rest[i + 1]) steps.push({ press: rest[i + 1] });
    if (a === '--fill' && rest[i + 1]) {
      // the first "=" that is not inside [brackets] or quotes: [name=amount]=12 fills [name=amount] with 12
      const t = rest[i + 1]; let depth = 0, quote = '', at = -1;
      for (let k = 0; k < t.length && at < 0; k++) { const ch = t[k]; if (quote) { if (ch === quote) quote = ''; } else if (ch === '"' || ch === "'") quote = ch; else if (ch === '[' || ch === '(') depth++; else if (ch === ']' || ch === ')') depth--; else if (ch === '=' && depth === 0) at = k; }
      if (at < 1) fail(2, `--fill needs "<selector>=<value>", got "${t}"\n${USAGE}`);
      steps.push({ fill: t.slice(0, at), value: t.slice(at + 1) });
    }
  });
  const [, filePart, tail = ''] = /^https?:|^file:/.test(target) ? [null, target] : target.match(/^([^?#]*)(.*)$/);
  const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(filePart)).href + tail;

  const chromium = await loadChromium();
  const browser = await launchBrowser(chromium);
  const requests = [];
  let error = null;
  try {
    // service workers are off: a worker's own requests never pass through the route below
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    let started = false; // reads are written only once the first step has run: the page's own loading is not the screen's answer
    await ctx.route('**/*', (route) => {
      const req = route.request();
      if (READS.includes(req.method())) {
        if (reads && started && req.method() === 'GET' && ['fetch', 'xhr'].includes(req.resourceType())) requests.push(shape(req));
        return route.continue().catch(() => {});
      }
      requests.push(shape(req));
      return route.abort('aborted').catch(() => {}); // "aborted" also leaves the page where it was when a form posts
    });
    const res = await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch((e) => ({ failed: String(e.message || e).split('\n')[0] }));
    if (res?.failed) throw new Error(`could not load ${url}: ${res.failed}`);
    if (res && typeof res.status === 'function' && res.status() >= 400) throw new Error(`could not load ${url}: HTTP ${res.status()}`);
    await page.waitForTimeout(500);
    for (const s of steps) {
      started = true;
      const q = s.fill ?? s.press;
      const el = page.locator(q).first();
      if (!(await el.count().catch(() => 0))) throw new Error(`nothing on the page matches ${q}`);
      if (s.press) { await el.click({ timeout: 5000 }); await page.waitForTimeout(wait); continue; }
      const kind = await el.evaluate((e) => (e.tagName === 'SELECT' ? 'select' : /^(checkbox|radio)$/.test(e.type) ? 'tick' : 'text'));
      if (kind === 'select') await el.selectOption(s.value, { timeout: 5000 }).catch(() => el.selectOption({ label: s.value }, { timeout: 5000 }));
      else if (kind === 'tick') await el.setChecked(!/^(false|0|off|no)$/i.test(s.value), { timeout: 5000 });
      else await el.fill(s.value, { timeout: 5000 });
    }
    await page.waitForTimeout(steps.some((s) => s.press) ? 0 : wait);
  } catch (e) {
    error = String(e.message || e).split('\n')[0];
  } finally {
    await browser.close();
  }
  if (error) fail(4, `Nothing was captured: ${error}.`);
  const out = JSON.stringify({ url, steps: steps.map((s) => (s.press ? `press ${s.press}` : `fill ${s.fill} = ${s.value}`)), requests }, null, 2);
  if (opt('--out')) writeFileSync(resolve(opt('--out')), out + '\n'); else console.log(out);
  console.error(`${requests.length} request${requests.length === 1 ? '' : 's'} held back and written${opt('--out') ? ` to ${opt('--out')}` : ''}: ${requests.map((r) => `${r.method} ${r.path}`).join(', ') || 'the steps sent nothing'}. Nothing was sent.`);
  process.exit(0);
}

/* ── diff ────────────────────────────────────────────────────────────────────────────────────────────────────── */
if (cmd === 'diff') {
  if (rest.length !== 2) fail(2, USAGE);
  const read = (f) => { try { const j = JSON.parse(readFileSync(resolve(f), 'utf8')); if (!Array.isArray(j.requests)) throw new Error('it has no "requests" list'); return j.requests; } catch (e) { fail(4, `Could not read ${f}: ${String(e.message || e).split('\n')[0]}. Nothing was compared.`); } };
  const [before, after] = rest.map(read);
  const kind = (v) => (v === null ? 'null' : v === undefined ? 'missing' : Array.isArray(v) ? 'a list' : typeof v === 'object' ? 'an object' : `a ${typeof v}`);
  const show = (v) => { const s = JSON.stringify(v); return s.length > 80 ? s.slice(0, 77) + '…' : s; };
  // [name, value] pairs as an object, so a missing field is named and a repeated name is a list
  const pairs = (v) => Array.isArray(v) && v.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === 'string');
  const named = (v) => { const o = {}; for (const [k, x] of v) o[k] = k in o ? [].concat(o[k], [x]) : x; return o; };
  const lines = [];
  const walk = (a, b, at, say) => {
    const typed = (v) => (v === null ? 'null' : `${show(v)} (${kind(v)})`);
    if (kind(a) !== kind(b)) return say(`${at}: ${typed(a)} before, ${typed(b)} after`);
    if (kind(a) === 'an object') {
      for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
        if (!(k in a)) say(`${at}.${k}: missing before, ${show(b[k])} after`);
        else if (!(k in b)) say(`${at}.${k}: ${show(a[k])} before, missing after`);
        else walk(a[k], b[k], `${at}.${k}`, say);
      }
    } else if (kind(a) === 'a list') {
      if (a.length !== b.length) say(`${at}: ${a.length} item${a.length === 1 ? '' : 's'} before, ${b.length} after`);
      for (let i = 0; i < Math.min(a.length, b.length); i++) walk(a[i], b[i], `${at}[${i}]`, say);
    } else if (a !== b) say(`${at}: ${show(a)} before, ${show(b)} after`);
  };
  // the nth POST /x before is compared with the nth POST /x after
  const keyed = (list) => { const n = {}; return list.map((r) => { const k = `${r.method} ${r.path}`; n[k] = (n[k] ?? 0) + 1; return [`${k}${n[k] > 1 ? ` (time ${n[k]})` : ''}`, r]; }); };
  const A = new Map(keyed(before)), B = new Map(keyed(after));
  for (const k of new Set([...A.keys(), ...B.keys()])) {
    const a = A.get(k), b = B.get(k);
    if (!a || !b) { lines.push(`${k}: sent only ${a ? 'before' : 'after'}`); continue; }
    const say = (m) => lines.push(`${k}  ${m}`);
    walk(named(a.query ?? []), named(b.query ?? []), 'query', say);
    if (a.contentType !== b.contentType) say(`contentType: ${show(a.contentType)} before, ${show(b.contentType)} after`);
    walk(pairs(a.body) ? named(a.body) : a.body, pairs(b.body) ? named(b.body) : b.body, 'body', say);
  }
  const order = (list) => list.map((r) => `${r.method} ${r.path}`).join(', ');
  if (!lines.length && order(before) !== order(after)) lines.push(`the same requests in another order: ${order(before)} before, ${order(after)} after`);
  if (!lines.length) { console.log(`The same: ${before.length} request${before.length === 1 ? '' : 's'}, every field equal.`); process.exit(0); }
  console.log(lines.join('\n'));
  console.log(`\n${lines.length} difference${lines.length === 1 ? '' : 's'} in what the server would receive. Fix each one, or raise it: it is never "close enough".`);
  process.exit(1);
}

fail(2, USAGE);

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

// Chrome, then Edge, then Playwright's own Chromium; one clear line if none is installed. (The same function is in every
// Antheo tool that opens a browser; tests/self-test.mjs keeps the copies identical.)
async function launchBrowser(chromium) {
  for (const options of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { return await chromium.launch(options); } catch { /* try the next one */ }
  }
  console.error('No browser found. Install Chrome or Edge, or run: npx playwright install chromium');
  process.exit(2);
}
