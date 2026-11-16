#!/usr/bin/env node
/*
 * The skills' own test: run it after changing any rule or tool, and before every release.
 *
 *   node tests/self-test.mjs              the fast checks (no browser), about 5 seconds
 *   node tests/self-test.mjs --browser    also the tools on real pages (needs Playwright and Chrome or Edge)
 *
 * Fast checks: twenty skills with valid front matter; every file a skill points to exists; every var(--name) in the
 * docs and in the tools' fix hints is defined by the style block; no number from before the style block (13px 500,
 * weight 600); every script parses; copy-lint and the gate behave. Browser checks: a page built from the style block
 * passes the page check and the access probe; a page broken on purpose is caught on each thing that was broken.
 * Exit 0 when everything passes, 1 otherwise.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// the public repo keeps skills/ beside tests/; the source repo keeps them three levels up
const SKILLS = [path.resolve(here, '..', 'skills'), path.resolve(here, '..', '..', '..', 'skills')].find((d) => fs.existsSync(path.join(d, 'antheo-build')));
if (!SKILLS) { console.error('Could not find the skills folder next to tests/.'); process.exit(1); }
const PRIVATE = ['antheo-icons', 'antheo-tufts']; // only in the source repo, never published
const BROWSER = process.argv.includes('--browser');

let failed = 0;
const results = [];
const test = (name, fn) => {
  try {
    const problems = fn() || [];
    results.push([problems.length ? 'FAIL' : 'ok', name, problems]);
    if (problems.length) failed++;
  } catch (e) {
    results.push(['FAIL', name, [String(e.message || e)]]);
    failed++;
  }
};
const read = (p) => fs.readFileSync(p, 'utf8');
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(SKILLS, p).split(path.sep).join('/');

const skills = fs.readdirSync(SKILLS).filter((d) => d.startsWith('antheo-') && !PRIVATE.includes(d) && fs.existsSync(path.join(SKILLS, d, 'SKILL.md')));
const files = skills.flatMap((s) => walk(path.join(SKILLS, s)));
const docs = files.filter((f) => /\.(md|css)$/.test(f));
const scripts = files.filter((f) => /\.(mjs|js)$/.test(f));

/* ---------------- structure ---------------- */

test('twenty skills', () => (skills.length === 20 ? [] : [`found ${skills.length}: ${skills.join(', ')}`]));

test('front matter: a name that matches the folder, and a description strict YAML can read', () => {
  const out = [];
  for (const s of skills) {
    const text = read(path.join(SKILLS, s, 'SKILL.md'));
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) { out.push(`${s}: no front matter`); continue; }
    const name = fm[1].match(/^name:\s*(.+)$/m)?.[1].trim();
    const desc = fm[1].match(/^description:\s*(.+)$/m)?.[1].trim() ?? '';
    if (name !== s) out.push(`${s}: name is "${name}"`);
    if (!desc) out.push(`${s}: no description`);
    // a colon and a space in an unquoted value makes strict parsers (the skills installer) skip the whole skill
    if (/: /.test(desc) && !/^["'>|]/.test(desc)) out.push(`${s}: a colon in the description breaks installs`);
    if (desc.length > 1024) out.push(`${s}: description is ${desc.length} characters (the limit is 1024)`);
  }
  return out;
});

test('every file a skill points to exists', () => {
  const out = [];
  const all = new Set(files.map(rel));
  for (const f of docs.filter((d) => d.endsWith('.md'))) {
    const skill = rel(f).split('/')[0];
    for (const m of read(f).matchAll(/`((?:references|scripts)\/[\w./-]+\.(?:md|mjs|js|css|json))`/g)) {
      const p = m[1];
      // its own skill first; a path like "references/gate.md there" may name another skill's file
      if (all.has(`${skill}/${p}`) || [...all].some((a) => a.endsWith(`/${p}`))) continue;
      out.push(`${rel(f)} points to ${p}, which doesn't exist`);
    }
  }
  return out;
});

/* ---------------- drift ---------------- */

// two vocabularies: the style block (quiet.css: --text, --focus) that every build uses, and the tokens skill's full
// design-system set (--color-text, --color-focus). Only the tokens skill may use the second.
const namesIn = (css) => new Set([...read(path.join(SKILLS, css)).matchAll(/(--[a-z][a-z0-9-]*)\s*:/g)].map((m) => m[1]));
const block = namesIn('antheo-build/references/quiet.css');
const fullSet = new Set([...block, ...namesIn('antheo-tokens/references/default-tokens.css')]);

test('every var(--name) in the docs and the tools is a style-block name', () => {
  const out = [];
  // the tokens generator writes a full design-system set with its own --color-* names, and the block-name checker
  // prints a placeholder; the system skill quotes other projects' tokens on purpose
  const own = (f) => /antheo-tokens[\\/]scripts[\\/]tokens\.mjs$|check-block-names\.mjs$|[\\/]antheo-system[\\/]|[\\/]references[\\/]project\.md$/.test(f);
  for (const f of [...docs, ...scripts]) {
    if (own(f)) continue;
    const s = read(f);
    // defined right here: in CSS (--x:), registered (@property --x), in a style object ('--x':) or by script
    // (setProperty('--x'))
    const local = new Set([...s.matchAll(/(--[a-z][a-z0-9-]*)['"]?\s*:|@property\s+(--[a-z][a-z0-9-]*)|setProperty\(\s*['"](--[a-z][a-z0-9-]*)/g)].map((m) => m[1] || m[2] || m[3]));
    const bad = new Set();
    // a knob with its default written in, var(--col-min, 16rem), is the component's own setting, not a block name
    const defined = /[\\/]antheo-tokens[\\/]/.test(f) ? fullSet : block;
    for (const m of s.matchAll(/var\((--[a-z][a-z0-9-]*[a-z0-9])\s*([,)])/g)) if (m[2] === ')' && !defined.has(m[1]) && !local.has(m[1])) bad.add(m[1]);
    if (bad.size) out.push(`${rel(f)}: ${[...bad].join(', ')}`);
  }
  return out;
});

test('no numbers from before the style block (13px 500, weight 600, 0.5px hairlines)', () => {
  const out = [];
  const OLD = [/\b1[1-6]px\s*(?:\/\s*)?(?:500|600|700)\b/, /\(1[1-6]\/(?:500|600)\)/, /\bweight (?:500|600|700)\b/i, /0\.5px hairline/];
  for (const f of docs.filter((d) => d.endsWith('.md'))) {
    read(f).split('\n').forEach((line, i) => {
      for (const re of OLD) if (re.test(line)) out.push(`${rel(f)}:${i + 1}: ${line.trim().slice(0, 90)}`);
    });
  }
  return out;
});

// in the public repo: ANTHEO-CORE.md must be exactly what the skills generate today
const corePath = path.resolve(SKILLS, '..', 'ANTHEO-CORE.md');
const builder = path.resolve(SKILLS, '..', 'scripts', 'build-core.mjs');
if (fs.existsSync(corePath) && fs.existsSync(builder)) {
  const { buildCore, buildCoreMini } = await import(new URL(`file:///${builder.replace(/\\/g, '/')}`).href);
  test('ANTHEO-CORE.md and ANTHEO-CORE-MINI.md match the skills (rebuild with node scripts/build-core.mjs)', () => {
    const out = [];
    if (read(corePath).replace(/\r\n/g, '\n') !== buildCore(SKILLS)) out.push('ANTHEO-CORE.md is out of date');
    const miniPath = corePath.replace(/\.md$/, '-MINI.md');
    if (!fs.existsSync(miniPath) || read(miniPath).replace(/\r\n/g, '\n') !== buildCoreMini(SKILLS)) out.push('ANTHEO-CORE-MINI.md is missing or out of date');
    return out;
  });
}
// wherever the core can be built: it must carry the policy, not only the rules (users without skills get the same)
{
  const builderHere = [builder, path.resolve(here, '..', 'build-core.mjs')].find((f) => fs.existsSync(f));
  if (builderHere) {
    const { buildCore } = await import(new URL(`file:///${builderHere.replace(/\\/g, '/')}`).href);
    test('the one-file core carries the policy: what always holds, the Quiet preset, matching the person', () => {
      const core = buildCore(SKILLS);
      return ['What always holds', 'The Quiet preset', 'Match the person', '## 2. The usage rules'].filter((s) => !core.includes(s)).map((s) => `the core lacks "${s}"`);
    });
  }
}

/* ---------------- the tools, without a browser ---------------- */

test('every script parses', () => {
  const out = [];
  for (const f of scripts) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) out.push(`${rel(f)}: ${(r.stderr || '').split('\n').find((l) => l.trim()) ?? 'syntax error'}`);
  }
  return out;
});

test('every tool that opens a browser uses the same launcher (Chrome, then Edge, then Playwright)', () => {
  // the evals sit beside skills/ in the public repo, inside it in the source repo
  const evals = [path.resolve(SKILLS, '..', 'evals', 'run.mjs'), path.join(SKILLS, 'evals', 'run.mjs')].filter((f) => fs.existsSync(f));
  const tools = [...scripts, ...evals].filter((f) => /chromium/.test(read(f)) && /\.launch\(|launchBrowser/.test(read(f)));
  const body = (f) => read(f).replace(/\r\n/g, '\n').match(/async function launchBrowser\(chromium\) \{[\s\S]*?\n\}/)?.[0];
  const first = tools.map(body).find(Boolean);
  const out = [];
  for (const f of tools) {
    const b = body(f);
    if (!b) out.push(`${path.basename(f)}: launches a browser without launchBrowser()`);
    else if (b !== first) out.push(`${path.basename(f)}: its launchBrowser() differs from the others`);
    if (/chromium\.launch\(\{ channel: 'chrome' \}\)\.catch|catch \{ browser = await chromium\.launch\(\)/.test(read(f))) out.push(`${path.basename(f)}: still has its own chrome-then-default launch`);
  }
  return tools.length ? out : ['no browser tools found'];
});

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'antheo-selftest-'));
const lint = path.join(SKILLS, 'antheo-writing', 'scripts', 'copy-lint.mjs');
const runLint = (target) => {
  const json = path.join(tmp, `lint-${Math.random().toString(36).slice(2)}.json`);
  spawnSync(process.execPath, [lint, target, '--json', json], { encoding: 'utf8' });
  return JSON.parse(read(json));
};

test('copy-lint catches weak words in JSX', () => {
  const dir = path.join(tmp, 'copy');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Form.tsx'), 'export const F = () => (<form><p>Your changes were successfully saved!</p><button>Submit</button></form>);\n');
  const r = runLint(dir);
  const rules = Object.keys(r.byRule ?? {}).join(' | ');
  const out = [];
  if (!/successfully/i.test(JSON.stringify(r))) out.push(`"successfully" not flagged (rules: ${rules || 'none'})`);
  if (!/submit/i.test(JSON.stringify(r))) out.push(`"Submit" not flagged (rules: ${rules || 'none'})`);
  return out;
});

test('copy-lint asks for locale formatting on a price, never on numbers drawn into an SVG path or a transform', () => {
  const dir = path.join(tmp, 'lint-money');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Price.jsx'), [
    'export function Price({ price }) {',
    '  return <p>Total: {price.toFixed(2)}</p>;',
    '}',
    'export function Line({ x, y, dx }) {',
    '  return <svg><path d={`M${x.toFixed(1)},${y.toFixed(1)} L10,10`} /><g transform={`translate(${dx.toFixed(2)} 0)`} /></svg>;',
    '}',
  ].join('\n'));
  const rep = runLint(dir);
  const hits = (rep.findings ?? rep).filter((f) => f.rule === 'format-number').map((f) => f.line);
  const out = [];
  if (!hits.includes(2)) out.push('toFixed on a price was not flagged');
  if (hits.includes(5)) out.push('toFixed inside an SVG path or a transform was flagged as money');
  return out;
});

test("copy-lint skips the gate's own .antheo folder", () => {
  const dir = path.join(tmp, 'state');
  fs.mkdirSync(path.join(dir, '.antheo'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.antheo', 'page.json'), JSON.stringify({ fix: 'Your changes were successfully saved! Click here' }));
  const r = runLint(dir);
  return (r.findings ?? []).length ? [`${r.findings.length} findings from .antheo`] : [];
});

test('the gate arms, re-arms, reports and disarms', () => {
  const gate = path.join(SKILLS, 'antheo-review', 'scripts', 'gate.mjs');
  const dir = path.join(tmp, 'gate');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>t</title><p>Hello</p>');
  const g = (...a) => spawnSync(process.execPath, [gate, ...a], { cwd: dir, encoding: 'utf8' });
  const out = [];
  if (!/ARMED/.test(g('arm', 'index.html').stdout)) out.push('arm did not say ARMED');
  if (!/armed, round 0/.test(g('status').stdout)) out.push('status did not report round 0');
  const state = path.join(dir, '.antheo', 'gate.json');
  const s = JSON.parse(read(state));
  fs.writeFileSync(state, JSON.stringify({ ...s, armed: false, round: 2 })); // as if a PASS had disarmed it
  if (!/ARMED again/.test(g('rearm').stdout)) out.push('rearm did not re-arm');
  if (JSON.parse(read(state)).round !== 0) out.push('rearm did not reset the round');
  if (!/DISARMED/.test(g('disarm').stdout)) out.push('disarm did not say DISARMED');
  return out;
});

test("a checker that crashes is a TOOL ERROR (exit 4), even with an old passing report left behind", () => {
  const gate = path.join(SKILLS, 'antheo-review', 'scripts', 'gate.mjs');
  const dir = path.join(tmp, 'stale');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>t</title><p>Hello</p>');
  const g = (...a) => spawnSync(process.execPath, [gate, ...a], { cwd: dir, encoding: 'utf8', timeout: 240000 });
  g('arm', 'index.html');
  const state = path.join(dir, '.antheo', 'gate.json');
  const s = JSON.parse(read(state));
  // an old passing report where the next one will be written, and a setting that makes the checker fail before writing
  fs.writeFileSync(path.join(dir, '.antheo', `page-${Buffer.from(s.targets[0]).toString('base64url').slice(-24)}.json`), JSON.stringify({ overall: 100, verdict: 'READY', findings: [] }));
  fs.writeFileSync(state, JSON.stringify({ ...s, widths: 'not-a-number' }));
  const r = g('check');
  const out = [];
  if (/GATE: PASS/.test(r.stdout)) out.push('the gate passed on a stale report');
  if (r.status !== 4) out.push(`exit ${r.status}, expected 4`);
  if (!/TOOL ERROR/.test(r.stdout)) out.push('it did not say TOOL ERROR');
  return out;
});

test('three rounds with work still open is DONE, UNRESOLVED (exit 3), never a pass', () => {
  const gate = path.join(SKILLS, 'antheo-review', 'scripts', 'gate.mjs');
  const dir = path.join(tmp, 'done');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  // a high copy finding (a sentence built from pieces), checked without a browser: no pages, only the copy
  fs.writeFileSync(path.join(dir, 'src', 'Summary.tsx'), 'export const S = ({ n }: { n: number }) => <h2>Fix {n} things to continue</h2>;\n');
  fs.mkdirSync(path.join(dir, '.antheo'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.antheo', 'gate.json'), JSON.stringify({ armed: true, targets: [], copy: [path.join(dir, 'src')], widths: '390,1280', max: 3, round: 2 }));
  const r = spawnSync(process.execPath, [gate, 'check'], { cwd: dir, encoding: 'utf8', timeout: 120000 });
  const out = [];
  if (/GATE: PASS/.test(r.stdout)) out.push('it said PASS with work open');
  if (r.status !== 3) out.push(`exit ${r.status}, expected 3 (${r.stdout.split('\n')[0]})`);
  if (!/DONE, UNRESOLVED/.test(r.stdout)) out.push('it did not say DONE, UNRESOLVED');
  return out;
});

test('nothing checked is never a pass: a missing page, unread copy, an empty waiver, an unarmed check', () => {
  const gate = path.join(SKILLS, 'antheo-review', 'scripts', 'gate.mjs');
  const checkPage = path.join(SKILLS, 'antheo-review', 'scripts', 'check-page.mjs');
  const out = [];
  // a page file that doesn't exist: exit 4, before any browser starts
  const missing = spawnSync(process.execPath, [checkPage, path.join(tmp, 'no-such-page.html')], { encoding: 'utf8', timeout: 60000 });
  if (missing.status !== 4) out.push(`check-page on a missing file exited ${missing.status}, expected 4`);
  // copy that reads no files, with no pages: a tool error, not clean copy
  const dir = path.join(tmp, 'nothing');
  fs.mkdirSync(path.join(dir, '.antheo'), { recursive: true });
  const state = path.join(dir, '.antheo', 'gate.json');
  const arm = (extra) => fs.writeFileSync(state, JSON.stringify({ armed: true, targets: [], copy: [path.join(dir, 'no-such-folder')], widths: '390,1280', max: 3, round: 0, ...extra }));
  const g = () => spawnSync(process.execPath, [gate, 'check'], { cwd: dir, encoding: 'utf8', timeout: 120000 });
  arm();
  let r = g();
  if (r.status !== 4 || !/TOOL ERROR/.test(r.stdout)) out.push(`copy that read no files: exit ${r.status}, expected 4 (TOOL ERROR)`);
  // an empty waiver rule would waive everything: refused
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'A.tsx'), 'export const A = ({ n }: { n: number }) => <h2>Fix {n} things to continue</h2>;\n');
  arm({ copy: [path.join(dir, 'src')] });
  fs.writeFileSync(path.join(dir, '.antheo', 'waivers.json'), JSON.stringify([{ rule: '', reason: 'this would waive every finding at once' }]));
  r = g();
  if (/GATE: PASS/.test(r.stdout)) out.push('an empty waiver rule waived the findings');
  fs.rmSync(path.join(dir, '.antheo', 'waivers.json'));
  // not armed: after an unresolved run, still non-zero; with no state, nothing was checked
  fs.writeFileSync(state, JSON.stringify({ armed: false, result: 'unresolved', targets: [] }));
  r = g();
  if (r.status !== 3) out.push(`check after an unresolved run exited ${r.status}, expected 3`);
  fs.rmSync(state);
  r = g();
  if (r.status !== 2) out.push(`check with nothing armed exited ${r.status}, expected 2`);
  return out;
});

/* ---------------- the tools on real pages ---------------- */

const PAGE_HEAD = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>`;
// built from the style block, following its rules: one title, a card at the form width, labelled fields, one primary
const GOOD = (css) => `${PAGE_HEAD('Profile · Acme')}<style>${css}
main { width: min(var(--w-form), 100% - 2 * var(--gutter)); margin: var(--s-10) auto; display: grid; gap: var(--s-4); }
form { display: grid; gap: var(--gap-field); }
label { display: block; margin-block-end: var(--gap-label); font-weight: var(--w-strong); }
.check { display: flex; gap: var(--s-2); align-items: center; font-weight: var(--w-text); margin: 0; }
.hint { margin-block-start: var(--s-1); font-size: var(--t-meta); line-height: var(--l-meta); color: var(--text-2); }
</style></head><body><main>
<h1 class="t-page">Profile</h1>
<form class="card" onsubmit="event.preventDefault()">
  <div><label for="name">Full name</label><input class="field" id="name" autocomplete="name" value="Maya Lindqvist"></div>
  <div><label for="email">Email</label><input class="field" id="email" type="email" autocomplete="email" value="maya@northwind.studio" aria-describedby="email-hint"><p class="hint" id="email-hint">We send receipts here</p></div>
  <label class="check"><input type="checkbox" checked> Email me a weekly summary</label>
  <div><button class="btn btn-primary" type="submit">Save profile</button></div>
</form>
</main></body></html>`;
// each broken thing is planted on purpose, and each must be caught
const BROKEN = `${PAGE_HEAD('Broken on purpose')}<style>
:root { --danger: rgb(200, 30, 30); --accent: rgb(20, 140, 90); }
body { margin: 0; font: 14px/20px system-ui; background: #fafafa; color: #222; }
main { max-width: 640px; margin: 0 auto; padding: 32px 16px; display: grid; gap: 16px; }
input { height: 32px; border: 1px solid #ccc; border-radius: 6px; padding: 0 8px; outline: none; }
.card { border: 1px solid #bbb; border-radius: 10px; padding: 20px; min-height: 100px; background: #fff; }
.hue { color: var(--accent); } .err { color: var(--danger); }
</style></head><body><main><h1>Broken on purpose</h1>
<label for="a">Name</label><input id="a">
<div class="card"><p>An outlined card with a border all round.</p></div>
${Array.from({ length: 10 }, (_, i) => `<p class="hue">Accent ${i + 1}</p>`).join('')}
<p class="err">An error, which is status, not accent</p>
</main></body></html>`;

// the browser checks need Playwright where they run (the tools resolve it from the current folder); without it they
// are skipped and said to be skipped, never counted as passed
const { createRequire } = await import('node:module');
const hasPlaywright = ['playwright-core', 'playwright'].some((name) => { try { createRequire(path.join(process.cwd(), 'package.json')).resolve(name); return true; } catch { return false; } });
let skippedBrowser = false;
if (BROWSER && !hasPlaywright) {
  skippedBrowser = true;
  console.log('SKIPPED: the browser checks. Playwright is not installed here. Run: npm i -D playwright-core (it uses your Chrome or Edge; with neither, also run: npx playwright install chromium)\n');
}

if (BROWSER && hasPlaywright) {
  const checkPage = path.join(SKILLS, 'antheo-review', 'scripts', 'check-page.mjs');
  const probe = path.join(SKILLS, 'antheo-access', 'scripts', 'a11y-probe.mjs');
  const quiet = read(path.join(SKILLS, 'antheo-build', 'references', 'quiet.css'));
  const good = path.join(tmp, 'good.html');
  const broken = path.join(tmp, 'broken.html');
  fs.writeFileSync(good, GOOD(quiet));
  fs.writeFileSync(broken, BROKEN);
  const page = (file) => {
    const json = file.replace(/\.html$/, '.check.json');
    const r = spawnSync(process.execPath, [checkPage, file, '--widths', '390,1280', '--json', json], { encoding: 'utf8', timeout: 240000 });
    if (!fs.existsSync(json)) throw new Error(`the page check didn't run: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`);
    return JSON.parse(read(json));
  };

  test('a page built from the style block passes the page check', () => {
    const r = page(good);
    const serious = r.findings.filter((f) => ['blocker', 'high'].includes(f.severity)).map((f) => `${f.severity}: ${f.rule}`);
    return [...serious, ...(r.overall < 90 ? [`score ${r.overall}, expected 90 or more`] : [])];
  });

  test('a page broken on purpose is caught on each planted problem', () => {
    const rules = page(broken).findings.map((f) => f.rule);
    return ['no visible focus', 'cards with a visible outline', 'colour on too many things'].filter((want) => !rules.includes(want)).map((r) => `not caught: ${r}`);
  });

  // the ten example pages are the golden pages: built from the style block, each must pass both checkers. They link the
  // block by a relative path that only resolves in the public repo, so each is tested with the block inlined.
  const examples = [path.resolve(SKILLS, '..', 'examples'), path.resolve(here, '..', 'examples')].find((d) => fs.existsSync(d));
  if (examples) {
    const golden = fs.readdirSync(examples).filter((f) => f.endsWith('.html'));
    test(`the ${golden.length} example pages pass the page check and the access probe (no blocker or high, probe CLEAN)`, () => {
      const out = [];
      for (const f of golden) {
        const file = path.join(tmp, `golden-${f}`);
        fs.writeFileSync(file, read(path.join(examples, f)).replace(/<link rel="stylesheet" href="[^"]*quiet\.css">/, () => `<style>${quiet}</style>`));
        const r = page(file);
        for (const x of r.findings.filter((x) => ['blocker', 'high'].includes(x.severity))) out.push(`${f}: page check ${x.severity}: ${x.rule}`);
        const json = file.replace(/\.html$/, '.probe.json');
        spawnSync(process.execPath, [probe, file, '--json', json], { encoding: 'utf8', timeout: 240000 });
        const p = fs.existsSync(json) ? JSON.parse(read(json)) : { verdict: 'DID NOT RUN', findings: [] };
        if (p.verdict !== 'CLEAN') out.push(`${f}: access probe ${p.verdict}: ${(p.findings ?? []).slice(0, 2).map((x) => `${x.area} ${x.element}`).join('; ')}`);
      }
      return out;
    });
  }

  // pages broken on purpose, one defect each: every checker must name what was planted
  const BAD = {
    'low-contrast': ['page', 'text below contrast minimum', '<p style="color:#b5b5b5">Grey text a person must read, at about 2:1</p>'],
    // the style block is OKLCH and Chrome keeps it OKLCH: a reader that only knew rgb() skipped every Antheo text
    'low-contrast-oklch': ['page', 'text below contrast minimum', '<p style="color:oklch(0.82 0.01 80)">Pale grey written in OKLCH, about 1.8:1</p>'],
    'overflow': ['page', 'horizontal scroll', '<div style="width:900px;background:#eee;padding:8px">A box fixed at 900px wide, so a phone scrolls sideways</div>'],
    'many-sizes': ['page', 'text sizes on one screen', [11, 13, 15, 17, 19, 22, 26, 30].map((s) => `<p style="font-size:${s}px">Text at ${s}px</p>`).join('')],
    // a resting shadow is not a focus ring: the button looks the same focused and not
    'shadow-not-focus': ['page', 'no visible focus', '<button type="button" style="height:32px;padding:0 12px;border:0;border-radius:6px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.15),0 1px 1px rgba(0,0,0,.1);outline:none">Save</button><style>button:focus{outline:none}</style>'],
    'unnamed': ['probe', 'names', '<button type="button" style="width:32px;height:32px"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6"/></svg></button>'],
    'tiny-targets': ['probe', 'target-size', '<div style="display:flex;gap:2px">' + ['A', 'B', 'C', 'D'].map((l) => `<button type="button" style="width:16px;height:16px;padding:0;font-size:10px">${l}</button>`).join('') + '</div>'],
  };
  test(`${Object.keys(BAD).length} more pages broken on purpose are each caught on what was planted`, () => {
    const out = [];
    for (const [name, [tool, want, body]] of Object.entries(BAD)) {
      const file = path.join(tmp, `bad-${name}.html`);
      fs.writeFileSync(file, `${PAGE_HEAD(`Broken: ${name}`)}<style>body{margin:0;font:14px/20px system-ui;background:#fff;color:#222}main{max-width:640px;margin:0 auto;padding:24px 16px}</style></head><body><main><h1 style="font-size:20px">Broken on purpose</h1>${body}</main></body></html>`);
      if (tool === 'page') {
        const rules = page(file).findings.map((f) => f.rule);
        if (!rules.some((r) => r.includes(want))) out.push(`${name}: the page check didn't name "${want}" (it found: ${rules.slice(0, 4).join('; ') || 'nothing'})`);
      } else {
        const json = file.replace(/\.html$/, '.probe.json');
        spawnSync(process.execPath, [probe, file, '--json', json], { encoding: 'utf8', timeout: 240000 });
        const areas = fs.existsSync(json) ? (JSON.parse(read(json)).findings ?? []).map((f) => f.area) : [];
        if (!areas.includes(want)) out.push(`${name}: the access probe didn't name "${want}" (it found: ${[...new Set(areas)].join(', ') || 'nothing'})`);
      }
    }
    return out;
  });

  test('--preset none stops judging the Quiet look but still catches what is wrong in any style', () => {
    const file = path.join(tmp, 'own-system.html');
    fs.writeFileSync(file, `${PAGE_HEAD('Own system')}<style>body{margin:0;font:15px/22px Georgia,serif;color:#1a1a1a;background:#fff}main{max-width:720px;margin:40px auto;padding:0 16px}.card{border:1px solid #c8c8c8;border-radius:16px;padding:24px;min-height:120px}</style></head><body><main><h1>A studio with its own look</h1><div class="card"><p>Outlined cards and a serif are this brand's choices.</p><p style="color:#c4c4c4">But this pale note fails contrast in any style.</p></div></main></body></html>`);
    const run = (preset) => {
      const json = file.replace(/\.html$/, `.${preset}.json`);
      spawnSync(process.execPath, [checkPage, file, '--widths', '1280', '--preset', preset, '--json', json], { encoding: 'utf8', timeout: 240000 });
      return JSON.parse(read(json)).findings.map((f) => f.rule);
    };
    const quietRules = run('quiet');
    const noneRules = run('none');
    const out = [];
    if (!quietRules.includes('cards with a visible outline')) out.push('the Quiet preset should flag the outlined card');
    if (noneRules.includes('cards with a visible outline')) out.push('--preset none still judged the outlined card');
    if (noneRules.some((r) => /serif or display face/.test(r))) out.push('--preset none still judged the serif');
    if (!noneRules.includes('text below contrast minimum')) out.push('--preset none dropped a universal check (contrast)');
    return out;
  });

  // the mini core's style block is the same CSS with comments and spacing removed: prove it renders identically
  const coreBuilder = [path.resolve(SKILLS, '..', 'scripts', 'build-core.mjs'), path.resolve(here, '..', 'build-core.mjs')].find((f) => fs.existsSync(f));
  if (examples && coreBuilder) {
    const { buildCoreMini } = await import(new URL(`file:///${coreBuilder.replace(/\\/g, '/')}`).href);
    const miniCss = buildCoreMini(SKILLS).match(/```css\n([\s\S]*?)\n```/)[1];
    const req = createRequire(path.join(process.cwd(), 'package.json'));
    const pw = await import(new URL(`file:///${req.resolve('playwright-core').replace(/\\/g, '/')}`).href).then((m) => m.default ?? m);
    const shots = [];
    const browser = await (async () => { for (const o of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) { try { return await pw.chromium.launch(o); } catch { /* next */ } } return null; })();
    try {
      for (const f of ['settings.html', 'dashboard.html', 'phone.html']) {
        for (const scheme of ['light', 'dark']) {
          const pair = [];
          for (const css of [quiet, miniCss]) {
            const file = path.join(tmp, `mini-${scheme}-${pair.length}-${f}`);
            fs.writeFileSync(file, read(path.join(examples, f)).replace(/<link rel="stylesheet" href="[^"]*quiet\.css">/, () => `<style>${css}</style>`).replace(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/g, ''));
            const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
            await p.goto(`file:///${file.replace(/\\/g, '/')}`);
            pair.push(await p.screenshot({ fullPage: true }));
            await p.close();
          }
          shots.push([`${f} ${scheme}`, pair[0].equals(pair[1])]);
        }
      }
    } finally {
      await browser?.close();
    }
    test('the mini core\'s style block renders pixel for pixel like the full one (3 golden pages, light and dark)', () =>
      shots.filter(([, same]) => !same).map(([name]) => `${name} renders differently with the mini CSS`));
  }

  // false alarms the lab's round of 25 components ran into: each stays quiet on the right page, and the real defect
  // next to it is still caught
  const labPage = (name, body, style = '') => {
    const file = path.join(tmp, `lab-${name}.html`);
    fs.writeFileSync(file, `${PAGE_HEAD(name)}<style>${quiet}${style}</style></head><body><main style="max-width:720px;margin:0 auto;padding:24px 16px"><h1 class="t-page">Lab ${name}</h1>${body}</main></body></html>`);
    return file;
  };
  const rulesOf = (file, extra = []) => {
    const json = file.replace(/\.html$/, '.check.json');
    spawnSync(process.execPath, [checkPage, file, '--widths', '390,1280', '--json', json, ...extra], { encoding: 'utf8', timeout: 240000 });
    return fs.existsSync(json) ? JSON.parse(read(json)).findings : null;
  };
  test('a drawn object keeps its texture; the same texture on a panel is still a costume', () => {
    const tex = 'background:repeating-linear-gradient(90deg,oklch(1 0 0/.06) 0 1px,transparent 1px 3px),oklch(0.35 0.03 260);width:320px;height:200px;border-radius:12px';
    const file = labPage('object', `<div data-object class="obj-card" role="img" aria-label="Bank card ending 4242" style="${tex}"></div><div class="card panel-tex" style="margin-top:24px;${tex}"></div>`);
    const f = rulesOf(file, ['--kind', 'app']);
    if (!f) return ['the page check did not run'];
    const flagged = JSON.stringify(f.filter((x) => /texture or pattern/.test(x.rule)).flatMap((x) => x.items));
    const out = [];
    if (!flagged.includes('panel-tex')) out.push('the textured panel outside the object was not flagged');
    if (flagged.includes('obj-card')) out.push('the drawn object was flagged as a costume');
    return out;
  });
  test('wrapped text is not lopsided padding, and a focus ring drawn on a tree row counts as focus', () => {
    const file = labPage('wrap-tree',
      '<div style="width:240px;padding:8px 12px;border-radius:6px;background:var(--well)">No one called "zoe" on this team, try another name</div>'
      + '<ul role="tree" aria-label="Files" style="list-style:none;padding:0;margin-top:24px"><li role="treeitem" tabindex="0" aria-selected="false" class="ti"><div class="row">src</div></li></ul>',
      '.ti{outline:none}.ti:focus-visible>.row{outline:2px solid var(--focus);outline-offset:-2px}.row{height:var(--h-row);display:flex;align-items:center;padding:0 var(--s-2)}');
    const f = rulesOf(file);
    if (!f) return ['the page check did not run'];
    return f.filter((x) => /lopsided padding|no visible focus/.test(x.rule)).map((x) => `false alarm: ${x.rule}`);
  });
  test('Tab from the last card of one board column to the first of the next is not a backwards jump', () => {
    const card = (t) => `<li tabindex="0" aria-label="${t}" style="position:relative;padding:12px 48px 12px 12px;background:var(--raised);border-radius:6px;margin-bottom:8px"><span>${t}</span><button type="button" class="btn" aria-label="Move ${t}" style="position:absolute;right:8px;top:8px">→</button></li>`;
    const col = (name, a, b) => `<section aria-label="${name}" style="background:var(--well);padding:12px;border-radius:10px"><h2 class="t-title">${name}</h2><ul style="list-style:none;padding:0;margin:0">${card(a)}${card(b)}</ul></section>`;
    const file = labPage('board', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${col('To do', 'Write copy', 'Plan research')}${col('Done', 'Ship tokens', 'Fix focus')}</div>`);
    const json = file.replace(/\.html$/, '.probe.json');
    spawnSync(process.execPath, [probe, file, '--json', json], { encoding: 'utf8', timeout: 240000 });
    if (!fs.existsSync(json)) return ["the access probe didn't run"];
    return (JSON.parse(read(json)).findings ?? []).filter((x) => x.area === 'focus-order').map((x) => `false alarm: ${x.msg ?? x.area}`);
  });
  test('the access probe presses every button and names the ones wired to nothing, never the chosen option', () => {
    const file = labPage('dead', '<div class="seg" role="radiogroup" aria-label="Period"><button type="button" role="radio" aria-checked="true" class="q">Q4</button><button type="button" role="radio" aria-checked="false" class="q">Q3</button></div>'
      + '<p id="said">Nothing yet</p><button type="button" class="btn" id="live">Open report</button> <button type="button" class="btn" id="dead">See more</button>');
    fs.appendFileSync(file, '<script>document.getElementById("live").onclick=()=>{document.getElementById("said").textContent="Opened the report"};'
      + 'document.querySelectorAll(".q").forEach((b)=>b.onclick=()=>document.querySelectorAll(".q").forEach((o)=>o.setAttribute("aria-checked",String(o===b))))</script>');
    const json = file.replace(/\.html$/, '.probe.json');
    spawnSync(process.execPath, [probe, file, '--json', json], { encoding: 'utf8', timeout: 240000 });
    if (!fs.existsSync(json)) return ["the access probe didn't run"];
    const dead = (JSON.parse(read(json)).findings ?? []).filter((f) => f.area === 'dead-control').map((f) => f.element);
    const out = [];
    if (!dead.some((d) => d.includes('See more'))) out.push('the dead "See more" button was not named');
    if (dead.some((d) => d.includes('Open report'))) out.push('the working "Open report" button was called dead');
    if (dead.some((d) => /Q4|Q3/.test(d))) out.push('a period option was called dead');
    return out;
  });

  test('beside puts a build next to its reference, and the gate armed with --ref asks for that evidence until it exists', () => {
    const out = [];
    const besideTool = path.join(SKILLS, 'antheo-review', 'scripts', 'beside.mjs');
    const gate = path.join(SKILLS, 'antheo-review', 'scripts', 'gate.mjs');
    const dir = path.join(tmp, 'evidence-gate');
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(good, path.join(dir, 'index.html'));
    // a 1×1 PNG is enough to stand for a reference
    fs.writeFileSync(path.join(dir, 'ref.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
    const b = spawnSync(process.execPath, [besideTool, 'index.html', '--clip', 'main', '--ref', 'ref.png', '--out', 'sheet.png'], { cwd: dir, encoding: 'utf8', timeout: 240000 });
    if (b.status !== 0 || !fs.existsSync(path.join(dir, 'sheet.png'))) out.push(`beside wrote no sheet (exit ${b.status}): ${(b.stderr || '').trim().split('\n').pop()}`);
    const g = (...a) => spawnSync(process.execPath, [gate, ...a], { cwd: dir, encoding: 'utf8', timeout: 480000 });
    g('arm', 'index.html', '--ref', 'ref.png', '--no-probe');
    const first = g('check');
    if (!/EVIDENCE beside ref/.test(first.stdout) || !/EVIDENCE motion/.test(first.stdout)) out.push('the gate did not ask for the comparisons and the filmstrip');
    if (first.status === 0) out.push('the gate passed with no evidence');
    const ev = path.join(dir, '.antheo', 'evidence');
    fs.mkdirSync(ev, { recursive: true });
    const now = Date.now() / 1000;
    for (const [f, t] of [['beside-ref-a.png', now + 5], ['beside-ref-b.png', now + 95], ['film-a.png', now + 5]]) { fs.copyFileSync(path.join(dir, 'ref.png'), path.join(ev, f)); fs.utimesSync(path.join(ev, f), t, t); }
    const second = g('check');
    if (second.status !== 0) out.push(`with the evidence in place the gate still did not pass: ${second.stdout.split('\n').slice(0, 6).join(' | ')}`);
    return out;
  });

  test('the gate runs the access probe by default and keeps a dead button open', () => {
    const gate = path.join(SKILLS, 'antheo-review', 'scripts', 'gate.mjs');
    const dir = path.join(tmp, 'probe-gate');
    fs.mkdirSync(dir, { recursive: true });
    const file = labPage('probe-gate', '<p id="said">Nothing yet</p><button type="button" class="btn" id="dead">See more</button>');
    fs.appendFileSync(file, '<script>/* the page has a script, so its buttons are expected to do something */</script>');
    fs.copyFileSync(file, path.join(dir, 'index.html'));
    const g = (...a) => spawnSync(process.execPath, [gate, ...a], { cwd: dir, encoding: 'utf8', timeout: 480000 });
    g('arm', 'index.html');
    const r = g('check');
    return /dead-control/.test(r.stdout) && r.status !== 0 ? [] : [`the gate did not hold on the dead button (exit ${r.status}): ${r.stdout.split('\n').slice(0, 5).join(' | ')}`];
  });

  test('the filmstrip films a motion into a sheet, and a missing element is a tool error', () => {
    const film = path.join(SKILLS, 'antheo-motion', 'scripts', 'filmstrip.mjs');
    const file = labPage('film', '<button type="button" class="btn" id="go">Move</button><div id="box" style="width:120px;height:60px;margin-top:16px;border-radius:6px;background:var(--primary);transition:translate 400ms var(--ease-out)"></div>',
      '#box.on{translate:200px 0}');
    fs.appendFileSync(file, '<script>document.getElementById("go").onclick=()=>document.getElementById("box").classList.toggle("on")</script>');
    const out = path.join(tmp, 'film.png');
    const r = spawnSync(process.execPath, [film, file, '--clip', 'main', '--click', '#go', '--frames', '6', '--duration', '400', '--out', out], { encoding: 'utf8', timeout: 240000 });
    const problems = [];
    if (r.status !== 0 || !fs.existsSync(out) || fs.statSync(out).size < 2000) problems.push(`no sheet (exit ${r.status}): ${(r.stderr || '').trim().split('\n').pop()}`);
    const times = (r.stdout.match(/frame times \(ms\): ([\d, ]+)/)?.[1] ?? '').split(',').map(Number);
    if (times.length !== 6 || times.at(-1) < 300) problems.push(`frames should span the motion, got: ${times.join(', ')}`);
    const miss = spawnSync(process.execPath, [film, file, '--clip', '#nothing-here', '--out', out], { encoding: 'utf8', timeout: 240000 });
    if (miss.status !== 4) problems.push(`a missing --clip exited ${miss.status}, expected 4`);
    return problems;
  });

  test('a page that does not load (a stopped server) is a tool error, exit 4, not a measured page', () => {
    const r = spawnSync(process.execPath, [checkPage, 'http://127.0.0.1:59999/', '--widths', '1280'], { encoding: 'utf8', timeout: 240000 });
    return r.status === 4 ? [] : [`check-page on a dead server exited ${r.status}, expected 4`];
  });

  test('the access probe calls the good page clean', () => {
    const json = path.join(tmp, 'probe.json');
    spawnSync(process.execPath, [probe, good, '--json', json], { encoding: 'utf8', timeout: 240000 });
    if (!fs.existsSync(json)) return ["the access probe didn't run"];
    const r = JSON.parse(read(json));
    return r.verdict === 'CLEAN' ? [] : [`verdict ${r.verdict}: ${(r.findings ?? []).slice(0, 3).map((f) => f.msg || f.rule || f.check || JSON.stringify(f).slice(0, 80)).join('; ')}`];
  });
}

fs.rmSync(tmp, { recursive: true, force: true });

for (const [state, name, problems] of results) {
  console.log(`${state === 'ok' ? 'ok  ' : 'FAIL'}  ${name}`);
  for (const p of problems.slice(0, 12)) console.log(`        ${p}`);
  if (problems.length > 12) console.log(`        … ${problems.length - 12} more`);
}
console.log(`\n${results.length - failed} of ${results.length} passed${skippedBrowser ? '; the browser checks were SKIPPED (see above), so this is not a full run' : BROWSER ? '' : ' (add --browser to test the tools on real pages)'}`);
process.exit(failed ? 1 : skippedBrowser ? 2 : 0);
