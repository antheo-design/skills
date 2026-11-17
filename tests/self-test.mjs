#!/usr/bin/env node
/*
 * The skills' own test: run it after changing any rule or tool, and before every release.
 *
 *   node tests/self-test.mjs              the fast checks (no browser), about 5 seconds
 *   node tests/self-test.mjs --browser    also the tools on real pages (needs Playwright and Chrome or Edge)
 *
 * Fast checks: twenty-one skills with valid front matter; every file a skill points to exists; every var(--name) in the
 * docs and in the tools' fix hints is defined by the style block; no number from before the style block (13px 500,
 * weight 600); every script parses; copy-lint and the gate behave; tokens.json follows the Design Tokens format.
 * Browser checks: a page built from the style block passes the page check and the access probe; a page broken on
 * purpose is caught on each thing that was broken; the probe holds back the writes its presses try to send.
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

test('twenty-one skills', () => (skills.length === 21 ? [] : [`found ${skills.length}: ${skills.join(', ')}`]));

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

test('the numbers the skills repeat are the style block\'s (durations, scales, type, corners, heights)', () => {
  // the block is the one source; a table that restates it must say the same thing, or name a sentence that moved
  const css = read(path.join(SKILLS, 'antheo-build', 'references', 'quiet.css'));
  const root = css.slice(0, css.indexOf('@media'));
  const tok = (n) => (root.match(new RegExp(`--${n}:\\s*([^;]+);`)) ?? [])[1]?.trim();
  const num = (n) => { const v = tok(n) ?? ''; return /rem$/.test(v) ? parseFloat(v) * 16 : parseFloat(v); };
  const out = [];
  const doc = (f) => read(path.join(SKILLS, ...f.split('/')));
  // [file, the sentence, the tokens its numbers must equal, in order]
  const PINS = [
    ['antheo-motion/SKILL.md', /\| Dialog \| (\d+)ms[^|]*\| (\d+)ms \|/, ['dur-base', 'dur-fast']],
    ['antheo-motion/SKILL.md', /\| Menu, popover, select \| (\d+)ms, from `scale\(([\d.]+)\)`/, ['dur-fast', 'scale-pop']],
    ['antheo-motion/SKILL.md', /\| Sheet, drawer \| (\d+)ms[^|]*\| (\d+)ms \|/, ['dur-slow', 'dur-base']],
    ['antheo-components/SKILL.md', /`scale: ([\d.]+)` \(`--scale-press`\) over `(\d+)ms`/, ['scale-press', 'dur-instant']],
    ['antheo-moment/SKILL.md', /`scale\(([\d.]+)\)` in (\d+)ms/, ['scale-press', 'dur-instant']],
    ['antheo-mobile/SKILL.md', /`--r-sheet` \((\d+)px\)/, ['r-sheet']],
    ['antheo-surface/SKILL.md', /`--r-sheet` \((\d+)px\)/, ['r-sheet']],
    ['antheo-data/SKILL.md', /`--h-row` \((\d+)px;/, ['h-row']],
    ['antheo-build/SKILL.md', /--t-meta (\d+) · --t-body (\d+) · --t-title (\d+) · --t-page (\d+) · --t-num (\d+) · --t-display (\d+)/, ['t-meta', 't-body', 't-title', 't-page', 't-num', 't-display']],
    ['antheo-build/SKILL.md', /--w-text (\d+) · --w-strong (\d+)/, ['w-text', 'w-strong']],
    ['antheo-build/SKILL.md', /--r-tag (\d+) · --r-control (\d+) · --r-card (\d+)/, ['r-tag', 'r-control', 'r-card']],
    ['antheo-build/SKILL.md', /--h-control (\d+) · --h-cta (\d+) · --h-row (\d+) · --pad-card (\d+) · --gap-section (\d+)/, ['h-control', 'h-cta', 'h-row', 'pad-card', 'gap-section']],
    ['antheo-build/SKILL.md', /--dur-fast (\d+)ms · --dur-base (\d+)ms/, ['dur-fast', 'dur-base']],
  ];
  for (const [f, re, names] of PINS) {
    const m = doc(f).match(re);
    if (!m) { out.push(`${f}: the sentence this test pins is gone (${String(re).slice(1, 40)}…)`); continue; }
    names.forEach((n, i) => { if (Number(m[i + 1]) !== num(n)) out.push(`${f}: says ${m[i + 1]} where the block's --${n} is ${tok(n)}`); });
  }
  // whole tables: every row that names a token carries that token's value
  const ROWS = [
    ['antheo-motion/SKILL.md', /\| `--(dur-\w+)` \| (\d+)ms \|/g, (m) => [[m[1], m[2]]]],
    ['antheo-type/SKILL.md', /\| `--t-(\w+)` \| (\d+) \/ (\d+) \|/g, (m) => [[`t-${m[1]}`, m[2]], [`l-${m[1]}`, m[3]]]],
    ['antheo-surface/SKILL.md', /\| `--(r-(?:card|control|tag))` \| (\d+)px \|/g, (m) => [[m[1], m[2]]]],
  ];
  for (const [f, re, pairs] of ROWS) {
    const rows = [...doc(f).matchAll(re)];
    if (rows.length < 3) out.push(`${f}: the table this test pins is gone (${String(re).slice(1, 30)}…)`);
    for (const m of rows) for (const [n, v] of pairs(m)) if (Number(v) !== num(n)) out.push(`${f}: says ${v} where the block's --${n} is ${tok(n)}`);
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

test('the gate keeps the probe from sending writes unless it is armed with --allow-writes', () => {
  const gate = path.join(SKILLS, 'antheo-review', 'scripts', 'gate.mjs');
  const dir = path.join(tmp, 'gate-writes');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>t</title><p>Hello</p>');
  const g = (...a) => spawnSync(process.execPath, [gate, ...a], { cwd: dir, encoding: 'utf8' });
  const state = () => JSON.parse(read(path.join(dir, '.antheo', 'gate.json')));
  const out = [];
  g('arm', 'index.html');
  if (state().allowWrites !== false) out.push('armed plainly, the gate should hold writes back (allowWrites: false)');
  const armed = g('arm', 'index.html', '--allow-writes');
  if (state().allowWrites !== true) out.push('--allow-writes was not kept in the gate state');
  if (!/--allow-writes/.test(armed.stdout)) out.push('arming with --allow-writes did not say the probe may send writes');
  g('disarm');
  return out;
});

// tokens.json follows the Design Tokens format 2025.10 (designtokens.org/tr/2025.10/format and /color): two briefs, one
// whose display face is the text face (an alias) and one whose brand hue rounds to 360 (the format stops short of 360)
{
  const tokensTool = path.join(SKILLS, 'antheo-tokens', 'scripts', 'tokens.mjs');
  const briefs = { product: [], expressive: ['--brand', '#d0006e', '--mood', 'editorial', '--register', 'expressive'] };
  const made = {};
  const make = (name) => {
    if (made[name]) return made[name];
    const dir = path.join(tmp, `tokens-${name}`);
    const r = spawnSync(process.execPath, [tokensTool, ...briefs[name], '--out', dir], { encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(path.join(dir, 'tokens.json'))) throw new Error(`tokens.mjs did not write tokens.json: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`);
    return (made[name] = { json: JSON.parse(read(path.join(dir, 'tokens.json'))), css: read(path.join(dir, 'tokens.css')) });
  };
  // every token (an object with $value) with its dotted path, and every name on the way
  const walkTokens = (node, at = [], out = { tokens: [], names: [] }) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      out.names.push([...at, k].join(' > '));
      if (v && typeof v === 'object' && '$value' in v) out.tokens.push([[...at, k].join('.'), v]);
      else if (v && typeof v === 'object') walkTokens(v, [...at, k], out);
    }
    return out;
  };
  const SPACES = ['srgb', 'srgb-linear', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50'];
  const colourProblems = (where, v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return [`${where}: the colour is ${JSON.stringify(v)}, not an object with colorSpace and components`];
    const out = [];
    if (!SPACES.includes(v.colorSpace)) out.push(`${where}: colorSpace is ${JSON.stringify(v.colorSpace)}`);
    if (!Array.isArray(v.components) || v.components.length !== 3 || v.components.some((c) => typeof c !== 'number' && c !== 'none')) out.push(`${where}: components is ${JSON.stringify(v.components)}`);
    else if (v.colorSpace === 'srgb' && v.components.some((c) => c < 0 || c > 1)) out.push(`${where}: an sRGB component is outside 0 to 1`);
    else if (v.colorSpace === 'oklch' && !(v.components[2] >= 0 && v.components[2] < 360)) out.push(`${where}: the hue is ${v.components[2]}, outside 0 up to (not including) 360`);
    if ('alpha' in v && !(typeof v.alpha === 'number' && v.alpha >= 0 && v.alpha <= 1)) out.push(`${where}: alpha is ${JSON.stringify(v.alpha)}`);
    if ('hex' in v && !/^#[0-9a-f]{6}$/i.test(v.hex)) out.push(`${where}: the hex fallback is ${JSON.stringify(v.hex)}, not six digits`);
    return out;
  };
  const unit = (v, units) => v && typeof v === 'object' && typeof v.value === 'number' && units.includes(v.unit);

  test('tokens.json: every colour is an object with colorSpace and components (Design Tokens 2025.10), never a string', () => {
    const out = [];
    for (const name of Object.keys(briefs)) {
      const colours = walkTokens(make(name).json).tokens.filter(([, t]) => t.$type === 'color');
      if (colours.length < 60) out.push(`${name}: only ${colours.length} colour tokens found`);
      for (const [p, t] of colours) out.push(...colourProblems(`${name} ${p}`, t.$value));
    }
    return out;
  });

  test('tokens.json: sizes, times, curves, families, weights, shadows and aliases have the shape the format gives them, and the colours are the CSS ones', () => {
    const out = [];
    for (const name of Object.keys(briefs)) {
      const { json, css } = make(name);
      const { tokens, names } = walkTokens(json);
      const byPath = new Map(tokens);
      for (const n of names) if (/[{}.]/.test(n.split(' > ').pop())) out.push(`${name}: the name "${n}" has a character the format forbids ({ } .)`);
      for (const [p, t] of tokens) {
        const v = t.$value, at = `${name} ${p}`;
        // an alias is the whole value in curly brackets, and must lead to a token of the same type
        if (typeof v === 'string' && /^\{[^{}]+\}$/.test(v)) {
          const target = byPath.get(v.slice(1, -1));
          if (!target) out.push(`${at}: the alias ${v} leads nowhere`);
          else if (target.$type !== t.$type) out.push(`${at}: the alias ${v} leads to a ${target.$type}, not a ${t.$type}`);
          continue;
        }
        if (t.$type === 'color') continue; // the test above
        else if (t.$type === 'dimension') { if (!unit(v, ['px', 'rem'])) out.push(`${at}: a dimension is { value, unit: px or rem }, got ${JSON.stringify(v)}`); }
        else if (t.$type === 'duration') { if (!unit(v, ['ms', 's'])) out.push(`${at}: a duration is { value, unit: ms or s }, got ${JSON.stringify(v)}`); }
        else if (t.$type === 'cubicBezier') { if (!Array.isArray(v) || v.length !== 4 || v.some((n) => typeof n !== 'number') || v[0] < 0 || v[0] > 1 || v[2] < 0 || v[2] > 1) out.push(`${at}: a cubic bézier is four numbers with both x between 0 and 1, got ${JSON.stringify(v)}`); }
        else if (t.$type === 'fontFamily') { if (!(Array.isArray(v) && v.length && v.every((n) => typeof n === 'string' && n && !/[",]/.test(n)))) out.push(`${at}: a font family is a list of names, got ${JSON.stringify(v)}`); }
        else if (t.$type === 'fontWeight') { if (!(typeof v === 'number' && v >= 1 && v <= 1000)) out.push(`${at}: a font weight is a number from 1 to 1000, got ${JSON.stringify(v)}`); }
        else if (t.$type === 'shadow') {
          const layers = Array.isArray(v) ? v : [v];
          if (!layers.length) out.push(`${at}: a shadow with no layers`);
          layers.forEach((l, i) => {
            out.push(...colourProblems(`${at} layer ${i + 1}`, l?.color));
            for (const k of ['offsetX', 'offsetY', 'blur', 'spread']) if (!unit(l?.[k], ['px', 'rem'])) out.push(`${at} layer ${i + 1}: ${k} is ${JSON.stringify(l?.[k])}`);
          });
        } else out.push(`${at}: $type is ${JSON.stringify(t.$type)}`);
      }
      for (const type of ['dimension', 'duration', 'cubicBezier', 'fontFamily', 'fontWeight', 'shadow']) if (!tokens.some(([, t]) => t.$type === type)) out.push(`${name}: no ${type} token`);
      // the hex fallback of each light colour is the hex tokens.css ships (its first block is the light theme)
      for (const [k, t] of Object.entries(json.color.light)) {
        const shipped = css.match(new RegExp(`--color-${k}: (#[0-9a-f]{6});`))?.[1];
        if (shipped && t.$value?.hex !== shipped) out.push(`${name} color.light.${k}: tokens.css ships ${shipped}, tokens.json says ${t.$value?.hex}`);
      }
    }
    if (make('product').json.font.family.display.$value !== '{font.family.sans}') out.push('product: the display face is the text face, so it should be the alias {font.family.sans}');
    return out;
  });
}

// the generated path (antheo-tokens' tokens.css) must behave like the style block: nothing it reads is left undefined,
// its touch block carries the block's sizes, and the shipped default-tokens.css is what the generator writes today
test('the generated tokens define every name they read and carry the touch sizes, and default-tokens.css is a fresh run of the generator', () => {
  const tokensTool = path.join(SKILLS, 'antheo-tokens', 'scripts', 'tokens.mjs');
  const out = [];
  const made = {};
  for (const [name, args] of Object.entries({ product: [], expressive: ['--brand', '#c2410c', '--mood', 'warm', '--register', 'expressive', '--density', 'comfortable'] })) {
    const dir = path.join(tmp, `bridge-${name}`);
    const r = spawnSync(process.execPath, [tokensTool, ...args, '--out', dir], { encoding: 'utf8' });
    if (r.status !== 0) return [`tokens.mjs failed for the ${name} brief: ${(r.stderr || '').trim().split('\n').pop()}`];
    const css = (made[name] = read(path.join(dir, 'tokens.css')));
    const defined = new Set([...css.matchAll(/(--[a-z][a-z0-9-]*)\s*:/g)].map((m) => m[1]));
    const loose = [...new Set([...css.matchAll(/var\((--[a-z][a-z0-9-]*)\s*[,)]/g)].map((m) => m[1]))].filter((n) => !defined.has(n));
    if (loose.length) out.push(`${name}: tokens.css reads ${loose.join(', ')} and never defines ${loose.length > 1 ? 'them' : 'it'}`);
    const touch = css.match(/@media \(max-width: 47\.99rem\), \(pointer: coarse\) \{\s*:root \{([^}]*)\}/)?.[1] ?? '';
    for (const want of ['--h-control: var(--control-lg)', '--h-small: var(--control-md)', '--h-cta: var(--control-lg)', '--h-row: 3.25rem', '--sw-w: 2.75rem', '--sw-h: 1.625rem', '--sw-knob: 1.375rem']) if (!touch.includes(want)) out.push(`${name}: the touch block lacks "${want}"`);
    if (!/@media \(max-width: 47\.99rem\) \{\s*:root \{[^}]*--pad-card: var\(--space-4\)[^}]*--gutter: var\(--space-4\)/.test(css)) out.push(`${name}: the phone block lacks the card padding or the gutter`);
  }
  // the product register's touch text is the style block's own: every size and line height the block writes in its
  // touch and phone blocks (meta 13/18, body 15/22, title 17/24, page 22/28px; a 28/32px headline) is here word for word
  const TOUCH = /@media \(max-width: 47\.99rem\), \(pointer: coarse\) \{\s*:root \{([^}]*)\}/, PHONE = /@media \(max-width: 47\.99rem\) \{\s*:root \{([^}]*)\}/;
  const blockCss = read(path.join(SKILLS, 'antheo-build', 'references', 'quiet.css'));
  const typeOf = (css, media) => [...(css.match(media)?.[1] ?? '').matchAll(/--[tl]-[a-z]+:\s*[^;]+;/g)].map((m) => m[0].replace(/\s+/g, ' '));
  const blockTouch = typeOf(blockCss, TOUCH), blockPhone = typeOf(blockCss, PHONE);
  for (const want of ['--t-meta: 0.8125rem;', '--l-meta: 1.125rem;', '--t-body: 0.9375rem;', '--l-body: 1.375rem;', '--t-title: 1.0625rem;', '--l-title: 1.5rem;', '--t-page: 1.375rem;', '--l-page: 1.75rem;']) if (!blockTouch.includes(want)) out.push(`the style block's touch block no longer says "${want}": update this test with the block`);
  if (blockPhone.join(' ') !== '--t-display: 1.75rem; --l-display: 2rem;') out.push(`the style block's phone headline is no longer 28/32px: ${blockPhone.join(' ')}`);
  if (typeOf(made.product, TOUCH).join(' ') !== blockTouch.join(' ')) out.push(`product: the touch text is not the style block's: ${typeOf(made.product, TOUCH).join(' ') || 'nothing'}`);
  if (typeOf(made.product, PHONE).join(' ') !== blockPhone.join(' ')) out.push(`product: the phone headline is not the style block's: ${typeOf(made.product, PHONE).join(' ') || 'nothing'}`);
  // the expressive register keeps its own scale: a 12px meta takes the next step, a 16px body is past the block's 15px
  // and stays, and the headline takes the numeral's step
  const exprTouch = made.expressive.match(TOUCH)?.[1] ?? '';
  if (!exprTouch.includes('--t-meta: var(--text-sm)')) out.push('expressive: the 12px meta does not step up on touch');
  if (/--t-body:/.test(exprTouch)) out.push('expressive: a 16px body was stepped up on touch');
  if (!(made.expressive.match(PHONE)?.[1] ?? '').includes('--t-display: var(--text-3xl)')) out.push('expressive: the phone headline does not take the numeral\'s step');
  const from = (s) => s.replace(/\r\n/g, '\n').slice(s.replace(/\r\n/g, '\n').indexOf(':root {'));
  if (from(read(path.join(SKILLS, 'antheo-tokens', 'references', 'default-tokens.css'))) !== from(made.product)) out.push('references/default-tokens.css is out of date: run tokens.mjs with no flags, keep the file\'s own header comment, and replace everything from the first ":root {" with the new tokens.css');
  return out;
});

test('harness.mjs writes every state at every width and pushes awkward content through each slot, escaped', () => {
  const harness = path.join(SKILLS, 'antheo-stress', 'scripts', 'harness.mjs');
  const dir = path.join(tmp, 'harness');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'card.harness.json'), JSON.stringify({
    title: 'Invoice card', css: ['quiet.css'], widths: [320, 480],
    template: '<article class="card"><h2 class="t-title">{{name}}</h2><p>{{email}}</p></article>',
    states: { default: { name: 'Priya Raman', email: 'priya@fieldnotes.co' }, loading: { html: '<article class="card" aria-busy="true"><p>Loading the invoice</p></article>' }, long: { name: 'Alexandria Montgomery-Featherstonehaugh III' } },
  }));
  const r = spawnSync(process.execPath, [harness, 'card.harness.json'], { cwd: dir, encoding: 'utf8' });
  const file = path.join(dir, 'card.harness.html');
  if (r.status !== 0 || !fs.existsSync(file)) return [`no page written (exit ${r.status}): ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`];
  const html = read(file);
  const out = [];
  const count = (state) => (html.match(new RegExp(`data-state="${state}"`, 'g')) ?? []).length;
  for (const state of ['default', 'loading', 'long']) if (count(state) !== 2) out.push(`"${state}" should be drawn at both widths, found ${count(state)} cell(s)`);
  if (count('fixtures') !== 24) out.push(`two slots should each get the 12 awkward values, found ${count('fixtures')} cell(s)`);
  if (!html.includes('Alexandria Montgomery-Featherstonehaugh III</h2><p>priya@fieldnotes.co')) out.push('a slot the "long" state left out was not taken from "default"');
  if (!html.includes('&lt;b&gt;Ana&lt;/b&gt; &amp; Co') || html.includes('<b>Ana</b>')) out.push('text that looks like markup was not escaped');
  if (!html.includes('aria-busy="true"><p>Loading the invoice')) out.push('a state\'s own html was not written as it is');
  if (!html.includes('<link rel="stylesheet" href="quiet.css">') || !html.includes("get('state')")) out.push('the page lacks its stylesheet link or the ?state= switch');
  if (!/not covered yet: empty, error, partial, success, disabled/.test(r.stdout)) out.push('the missing states were not named');
  const none = spawnSync(process.execPath, [harness, 'no-such.json'], { cwd: dir, encoding: 'utf8' });
  if (none.status !== 4) out.push(`a missing JSON exited ${none.status}, expected 4`);
  return out;
});

test('the motion scanner tells a reduced-motion block that keeps a fade from one that removes all motion, and the blanket removal is a high finding', () => {
  const scan = path.join(SKILLS, 'antheo-motion-audit', 'scripts', 'scan-motion.mjs');
  const dir = path.join(tmp, 'reduced');
  const write = (folder, name, css) => { fs.mkdirSync(path.join(dir, folder), { recursive: true }); fs.writeFileSync(path.join(dir, folder, name), css); };
  const menu = '.menu { transition: opacity 150ms ease-out, translate 150ms ease-out; }\n';
  // travel goes, the fade stays
  write('keeps', 'menu.css', `${menu}/* the menu stops travelling and fades */\n@media (prefers-reduced-motion: reduce) {\n  .menu { transition: opacity 150ms ease-out; translate: none; }\n}\n`);
  // only movement is set to nothing; and keyframes cut on everything while transitions stay
  write('keeps', 'tokens.css', '@media (prefers-reduced-motion: reduce) { :root { --dist-md: 0px; --scale-pop: 1; } }\n@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 1ms !important; } }\n');
  // the reset that switches everything off
  write('removes', 'reset.css', `${menu}\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n`);
  write('removes', 'sheet.css', '.sheet { transition: translate 250ms ease-out; }\n@media (prefers-reduced-motion: reduce) { .sheet { transition: none; } }\n');
  const run = (folder) => {
    const json = path.join(dir, `${folder}.json`);
    const r = spawnSync(process.execPath, [scan, folder, '--json', json, '--strict'], { cwd: dir, encoding: 'utf8' });
    return { status: r.status, stdout: r.stdout, rep: fs.existsSync(json) ? JSON.parse(read(json)) : null };
  };
  const out = [];
  const keeps = run('keeps'), removes = run('removes');
  if (!keeps.rep || !removes.rep) return ['the scanner did not run'];
  if (keeps.rep.reduced.length !== 3 || keeps.rep.reduced.some((b) => b.kind !== 'keeps')) out.push(`three blocks that keep a fade or only stop movement should all read "keeps": ${JSON.stringify(keeps.rep.reduced.map((b) => [b.file, b.line, b.kind]))}`);
  if (keeps.rep.items.some((x) => x.flags.some((f) => f.id === 'R2')) || keeps.status !== 0) out.push(`a block that keeps a fade was made a finding (exit ${keeps.status})`);
  const reset = removes.rep.reduced.find((b) => b.file.endsWith('reset.css')), sheet = removes.rep.reduced.find((b) => b.file.endsWith('sheet.css'));
  if (reset?.kind !== 'removes' || reset.blanket !== true || reset.line !== 3) out.push(`the blanket reset should read "removes", blanket, at line 3: ${JSON.stringify(reset)}`);
  if (sheet?.kind !== 'removes' || sheet.blanket !== false || sheet.line !== 2) out.push(`the sheet whose transition is switched off should read "removes", not blanket, at line 2: ${JSON.stringify(sheet)}`);
  const flag = (file) => removes.rep.items.find((x) => x.file.endsWith(file) && x.flags.some((f) => f.id === 'R2'))?.flags.find((f) => f.id === 'R2');
  if (flag('reset.css')?.sev !== 'high') out.push(`the blanket removal should be a high finding, got ${flag('reset.css')?.sev}`);
  if (flag('sheet.css')?.sev !== 'check') out.push(`a removal on one named rule should be a "check", got ${flag('sheet.css')?.sev}`);
  if (removes.status !== 1) out.push(`--strict with a blanket removal exited ${removes.status}, expected 1`);
  if (!/reset\.css:3\s+removes \(blanket\)/.test(removes.stdout) || !/menu\.css:3\s+keeps/.test(keeps.stdout)) out.push('the printed list does not name each block with its file, line and kind');
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
    // a row that wrapped out of the pill holding it: the second button sits below the red shape
    'box-spill': ['page', 'a control spilling out of the shape that holds it', '<div style="display:flex;flex-wrap:wrap;gap:4px;width:200px;height:40px;padding:4px;border-radius:20px;background:#d33"><button type="button" style="width:120px;height:32px;border:0;border-radius:16px;background:#25f;color:#fff">One</button><button type="button" style="width:120px;height:32px;border:0;border-radius:16px;background:#25f;color:#fff">Two</button></div>'],
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
  test('a control that answers only by its own state or an animation on its object is not called dead', () => {
    // the toy redraws itself every frame (so the probe hears it as noise), and a press only flips its own data-state
    // and starts a one-shot animation on a child: both are answers
    const file = labPage('alive', '<div data-object class="toy" role="group" aria-label="Toy" style="width:120px;height:120px;border-radius:12px;background:oklch(0.5 0.1 250)">'
      + '<button type="button" id="spin" aria-label="Spin" style="width:44px;height:44px;border:0;border-radius:50%;background:oklch(0.9 0.02 250)"><i id="dot" style="display:block;width:8px;height:8px;margin:auto;border-radius:50%;background:oklch(0.3 0.02 250)"></i></button>'
      + '<button type="button" id="flip" aria-label="Flip" data-state="off" style="width:44px;height:44px;border:0;border-radius:50%;background:oklch(0.9 0.02 250)"></button></div>'
      + '<button type="button" class="btn" id="dead">See more</button>');
    fs.appendFileSync(file, '<script>const t=document.querySelector(".toy"),s=document.getElementById("spin"),f=document.getElementById("flip");'
      + 'const tick=()=>{t.style.setProperty("--n",String(performance.now()|0));s.style.opacity="1";f.style.opacity="1";requestAnimationFrame(tick)};tick();'
      + 's.onclick=()=>document.getElementById("dot").animate([{transform:"scale(1)"},{transform:"scale(1.6)"},{transform:"scale(1)"}],{duration:400});'
      + 'f.onclick=()=>{f.dataset.state=f.dataset.state==="on"?"off":"on"}</script>');
    const json = file.replace(/\.html$/, '.probe.json');
    spawnSync(process.execPath, [probe, file, '--json', json], { encoding: 'utf8', timeout: 240000 });
    if (!fs.existsSync(json)) return ["the access probe didn't run"];
    const dead = (JSON.parse(read(json)).findings ?? []).filter((x) => x.area === 'dead-control').map((x) => x.element);
    const out = [];
    if (dead.some((d) => /Spin/.test(d))) out.push('a button that starts an animation on its own object was called dead');
    if (dead.some((d) => /Flip/.test(d))) out.push('a button that flips its own state was called dead');
    if (!dead.some((d) => d.includes('See more'))) out.push('the dead "See more" button was not named');
    return out;
  });
  test("an object's play is not judged as chrome, and a missing file is named while the browser's own favicon request is not", () => {
    // inside the object: a long spring and uneven insides are its artwork; a script that is not there is named
    const file = labPage('play', '<div data-object class="sw" style="display:inline-flex;height:40px;width:96px;border-radius:20px;background:oklch(0.85 0.05 250);align-items:center">'
      + '<span class="knob" style="margin-left:2px;padding:0 4px 0 22px;height:32px;border-radius:16px;background:oklch(0.99 0 0);font-size:12px;line-height:32px">On</span></div>'
      + '<p style="margin-top:24px"><span class="tag chip-bad" style="padding:0 4px 0 22px">Off balance</span></p><script src="./not-there.js"></script>',
      '.knob{transition:transform 620ms cubic-bezier(.3,1.4,.5,1)}');
    const f = rulesOf(file, ['--preset', 'none']);
    if (!f) return ['the page check did not run'];
    const items = (re) => JSON.stringify(f.filter((x) => re.test(x.rule)).flatMap((x) => x.items));
    const out = [];
    if (items(/lopsided padding/).includes('knob')) out.push("the object's own inside was called lopsided padding");
    if (!items(/lopsided padding/).includes('chip-bad')) out.push('a lopsided tag outside the object was not caught');
    if (items(/slower than 400ms/).includes('knob')) out.push("the object's 620ms spring was called slow interface motion");
    if (!items(/a file the page asks for is missing/).includes('not-there.js')) out.push('the missing script was not named');
    if (items(/script errors|is missing/).includes('favicon')) out.push('a favicon request was reported as an error');
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
    const b = spawnSync(process.execPath, [besideTool, 'index.html', '--clip', 'main', '--ref', 'ref.png', '--region', '0,0,1,1', '--out', 'sheet.png'], { cwd: dir, encoding: 'utf8', timeout: 240000 });
    if (b.status !== 0 || !fs.existsSync(path.join(dir, 'sheet.png'))) out.push(`beside wrote no sheet (exit ${b.status}): ${(b.stderr || '').trim().split('\n').pop()}`);
    else if (JSON.parse(read(path.join(dir, 'sheet.json'))).region?.join(',') !== '0,0,1,1') out.push('beside did not record the region it compared');
    const g = (...a) => spawnSync(process.execPath, [gate, ...a], { cwd: dir, encoding: 'utf8', timeout: 480000 });
    g('arm', 'index.html', '--ref', 'ref.png', '--no-probe');
    const first = g('check');
    if (!/EVIDENCE beside ref/.test(first.stdout) || !/EVIDENCE motion/.test(first.stdout)) out.push('the gate did not ask for the comparisons and the filmstrip');
    if (first.status === 0) out.push('the gate passed with no evidence');
    const ev = path.join(dir, '.antheo', 'evidence');
    fs.mkdirSync(ev, { recursive: true });
    const now = Date.now() / 1000;
    for (const [f, t] of [['beside-ref-a.png', now + 5], ['beside-ref-b.png', now + 95], ['film-still.png', now + 5]]) { fs.copyFileSync(path.join(dir, 'ref.png'), path.join(ev, f)); fs.utimesSync(path.join(ev, f), t, t); }
    fs.writeFileSync(path.join(ev, 'film-still.json'), JSON.stringify({ tool: 'filmstrip', changed: false }));
    const stillOnly = g('check');
    if (!/EVIDENCE motion/.test(stillOnly.stdout)) out.push('the gate counted a film where nothing moved');
    fs.copyFileSync(path.join(dir, 'ref.png'), path.join(ev, 'film-a.png')); fs.utimesSync(path.join(ev, 'film-a.png'), now + 5, now + 5);
    fs.writeFileSync(path.join(ev, 'film-a.json'), JSON.stringify({ tool: 'filmstrip', changed: true }));
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

  test('a control inside a closed details is not called unnamed; an icon-only button with no name still is', () => {
    const file = labPage('names', '<details><summary>More options</summary><button type="button" class="btn">Save changes</button></details>'
      + '<button type="button" class="btn" id="bare" style="margin-top:16px"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6"/></svg></button>'
      + '<p id="a">Delete</p><p id="b">invoice 482</p><button type="button" class="btn" aria-labelledby="a b"><svg width="16" height="16" aria-hidden="true"><path d="M2 2h12"/></svg></button>');
    const f = rulesOf(file, ['--widths', '1280']);
    if (!f) return ['the page check did not run'];
    const unnamed = JSON.stringify(f.filter((x) => x.rule === 'controls with no accessible name').flatMap((x) => x.items));
    const out = [];
    if (/Save changes/.test(unnamed)) out.push('the button inside the closed details was called unnamed');
    if (!/#bare/.test(unnamed)) out.push('the icon-only button with no name was not caught');
    if (/Delete/.test(unnamed)) out.push('a button named by two aria-labelledby ids was called unnamed');
    return out;
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
    const rec = JSON.parse(read(out.replace(/\.png$/, '.json')));
    if (rec.changed !== true) problems.push('the record of a film where the box moved does not say it changed');
    const stillOut = path.join(tmp, 'film-still.png');
    const still = spawnSync(process.execPath, [film, file, '--clip', 'h1', '--click', 'h1', '--frames', '4', '--duration', '300', '--out', stillOut], { encoding: 'utf8', timeout: 240000 });
    if (!/WARNING: no frame differs/.test(still.stdout) || JSON.parse(read(stillOut.replace(/\.png$/, '.json'))).changed !== false) problems.push('a film where nothing moved was not flagged');
    const miss = spawnSync(process.execPath, [film, file, '--clip', '#nothing-here', '--out', out], { encoding: 'utf8', timeout: 240000 });
    if (miss.status !== 4) problems.push(`a missing --clip exited ${miss.status}, expected 4`);
    return problems;
  });

  // the write guard: the probe presses real buttons, so a local server stands in for a live app and records what
  // reaches it. One button posts with fetch, one posts a form by script (no fetch and no submit event to notice), one
  // is wired to nothing. Then the gate is armed with --allow-writes on the same page, and the post must arrive.
  {
    const http = await import('node:http');
    const { spawn } = await import('node:child_process');
    const html = `${PAGE_HEAD('Writes')}<style>${quiet}</style></head><body><main style="max-width:720px;margin:0 auto;padding:24px 16px"><h1 class="t-page">Invoice 482</h1>`
      + '<button type="button" class="btn" id="send">Send invoice</button> <button type="button" class="btn" id="post">Delete invoice</button> <button type="button" class="btn" id="dead">See more</button>'
      + '<form id="f" method="post" action="/delete"><input type="hidden" name="id" value="482"></form>'
      + '<script>document.getElementById("send").onclick=()=>{fetch("/x",{method:"POST",body:"id=482"}).catch(()=>{})};document.getElementById("post").onclick=()=>document.getElementById("f").submit()</script></main></body></html>';
    const seen = [];
    const server = http.createServer((req, res) => { seen.push(`${req.method} ${req.url}`); res.writeHead(200, { 'content-type': 'text/html' }); res.end(req.url === '/' ? html : '<!doctype html><title>ok</title><h1>ok</h1>'); });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const address = `http://127.0.0.1:${server.address().port}/`;
    // not spawnSync: this process must stay free to serve the page while the tool runs
    const run = (args, cwd) => new Promise((done) => {
      const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.stderr.on('data', (d) => { out += d; });
      const timer = setTimeout(() => child.kill(), 480000);
      child.on('exit', (status) => { clearTimeout(timer); done({ status, out }); });
    });
    const json = path.join(tmp, 'guard.probe.json');
    const guarded = await run([probe, address, '--json', json]);
    const rep = fs.existsSync(json) ? JSON.parse(read(json)) : null;
    const reached = [...seen];
    seen.length = 0;
    // the latency probe presses the same buttons, three times each, behind the same guard
    const latencyJson = path.join(tmp, 'guard.latency.json');
    const pressed = await run([path.join(SKILLS, 'antheo-review', 'scripts', 'latency-probe.mjs'), address, '--json', latencyJson]);
    const latencyRep = fs.existsSync(latencyJson) ? JSON.parse(read(latencyJson)) : null;
    const reachedLatency = [...seen];
    seen.length = 0;
    test('the latency probe holds back what its presses try to send, and still measures the press', () => {
      if (!latencyRep) return [`the latency probe didn't run: ${pressed.out.trim().split('\n').pop()}`];
      const out = [];
      const held = (latencyRep.heldBack ?? []).map((w) => `${w.method} ${new URL(w.url).pathname}`);
      for (const want of ['POST /x', 'POST /delete']) if (!held.includes(want)) out.push(`${want} is not listed as held back (listed: ${held.join(', ') || 'nothing'})`);
      const send = latencyRep.controls.find((c) => c.name.includes('Send invoice'));
      if (typeof send?.press !== 'number' || send.verdict === 'SKIP') out.push(`the press on "Send invoice" was not measured: ${JSON.stringify(send)}`);
      if (latencyRep.controls.length !== 3) out.push(`the probe should have pressed all three buttons, it has ${latencyRep.controls.length} rows`);
      if (!/writes: held back .*POST \/x/.test(pressed.out)) out.push('no line at the end names what was held back');
      const sent = reachedLatency.filter((r) => !/^(GET|HEAD|OPTIONS) /.test(r));
      if (sent.length) out.push(`the server received ${sent.join(', ')}`);
      if (!reachedLatency.includes('GET /')) out.push('the page itself was never asked for, so nothing was pressed');
      return out;
    });
    const dir = path.join(tmp, 'guard-gate');
    fs.mkdirSync(dir, { recursive: true });
    const gate = path.join(SKILLS, 'antheo-review', 'scripts', 'gate.mjs');
    await run([gate, 'arm', address, '--widths', '1280', '--allow-writes'], dir);
    const allowed = await run([gate, 'check'], dir);
    const reachedAllowed = [...seen];
    await new Promise((r) => server.close(r));
    test('the access probe holds back what its presses try to send: the POST is listed, the button is not called dead, nothing reaches the server', () => {
      if (!rep) return [`the access probe didn't run: ${guarded.out.trim().split('\n').pop()}`];
      const out = [];
      const dead = (rep.findings ?? []).filter((f) => f.area === 'dead-control').map((f) => f.element);
      const held = (rep.heldBack ?? []).map((w) => `${w.method} ${new URL(w.url).pathname}`);
      if (dead.some((d) => /Send invoice|Delete invoice/.test(d))) out.push(`a button that tried to send a write was called dead: ${dead.join('; ')}`);
      if (!dead.some((d) => d.includes('See more'))) out.push('the press check did not reach the dead "See more" button after the held-back writes');
      for (const want of ['POST /x', 'POST /delete']) if (!held.includes(want)) out.push(`${want} is not listed as held back (listed: ${held.join(', ') || 'nothing'})`);
      if ((rep.findings ?? []).some((f) => /held back/.test(f.message ?? ''))) out.push('the held-back list was reported as a finding');
      if (!/writes: held back .*POST \/x/.test(guarded.out)) out.push('no line at the end names what was held back');
      const sent = reached.filter((r) => !/^(GET|HEAD|OPTIONS) /.test(r));
      if (sent.length) out.push(`the server received ${sent.join(', ')}`);
      if (!reached.includes('GET /')) out.push('the page itself was never asked for, so nothing was probed');
      return out;
    });
    test('--allow-writes, passed through the gate, lets the same POST reach the server', () => {
      const out = [];
      if (!reachedAllowed.includes('POST /x')) out.push(`the server never received POST /x (it saw: ${[...new Set(reachedAllowed)].join(', ') || 'nothing'}); gate said: ${allowed.out.trim().split('\n')[0]}`);
      if (/writes the probe held back/.test(allowed.out)) out.push('the gate says writes were held back although it was armed with --allow-writes');
      return out;
    });
  }

  const reportOf = (file, extra = []) => {
    const json = file.replace(/\.html$/, '.report.json');
    fs.rmSync(json, { force: true });
    spawnSync(process.execPath, [checkPage, file, '--widths', '1280', '--json', json, ...extra], { encoding: 'utf8', timeout: 240000 });
    return fs.existsSync(json) ? JSON.parse(read(json)) : null;
  };

  test('a page that pushes its content down 300ms after loading is reported as jumping, with what moved; the good page is not', () => {
    const file = labPage('shift', `<div id="slot"></div>${Array.from({ length: 20 }, (_, i) => `<p class="para">Paragraph ${i + 1} of the page a person was reading when a banner arrived above it.</p>`).join('')}`);
    fs.appendFileSync(file, '<script>setTimeout(()=>{const b=document.createElement("div");b.className="late-banner";b.style.cssText="height:480px;background:var(--well);border-radius:10px";document.getElementById("slot").append(b)},300)</script>');
    const bad = reportOf(file);
    const fine = reportOf(good);
    if (!bad || !fine) return ['the page check did not run'];
    const out = [];
    const jump = bad.findings.find((f) => f.rule.startsWith('the page jumps while it loads'));
    if (!jump) out.push(`the shift was not reported (vitals: ${JSON.stringify(bad.vitals)})`);
    else {
      if (jump.severity !== 'medium') out.push(`the shift is ${jump.severity}, expected medium`);
      if (!jump.items.some((i) => /p\.para .* moved \d+px down/.test(i))) out.push(`the finding does not name the paragraphs that moved: ${jump.items.slice(0, 2).join('; ')}`);
    }
    if (!(bad.vitals?.cls > 0.1)) out.push(`vitals.cls is ${bad.vitals?.cls}, expected over 0.1`);
    if (typeof bad.vitals?.lcp !== 'number') out.push(`vitals.lcp is ${bad.vitals?.lcp}, expected a number of milliseconds`);
    if (typeof fine.vitals?.cls !== 'number' || fine.vitals.cls > 0.1) out.push(`the good page's vitals.cls is ${fine.vitals?.cls}`);
    for (const f of fine.findings) if (/the page jumps|the main content shows late/.test(f.rule)) out.push(`the good page was given a load finding: ${f.rule}`);
    return out;
  });

  test('four text sizes pass, a fifth is flagged, and a fifth worn only by numerals is the one a data screen may add', () => {
    const sized = (list) => list.map(([px, text]) => `<p style="font-size:${px}px;line-height:1.3">${text}</p>`).join('');
    const base = [[12, 'Updated two minutes ago'], [13, 'Revenue for the quarter so far'], [15, 'Quarterly revenue']]; // the title is a fourth size, 20px
    const sizesRule = (name, more) => {
      const r = reportOf(labPage(name, sized([...base, ...more])));
      if (!r) throw new Error('the page check did not run');
      return r.findings.find((f) => /text sizes on one screen/.test(f.rule));
    };
    const out = [];
    const four = sizesRule('sizes-four', []);
    if (four) out.push(`four sizes were flagged: ${four.rule}`);
    const words = sizesRule('sizes-five-words', [[28, 'A fifth size of words']]);
    if (!words) out.push('five sizes of words were not flagged');
    else if (words.severity !== 'medium') out.push(`five sizes of words are ${words.severity}, expected medium`);
    const figures = sizesRule('sizes-five-figures', [[28, '$48,210.50'], [28, '98.6%'], [28, '4.2k']]);
    if (figures) out.push(`five sizes with one worn only by numerals were flagged: ${figures.rule} (${figures.items[0]})`);
    const six = sizesRule('sizes-six-figures', [[17, 'A fifth size of words'], [28, '1,284']]);
    if (!six) out.push('six sizes, one of them numerals, were not flagged');
    return out;
  });

  test('a dialog or sheet rounded 16px or less is neither a big corner nor a fourth corner size; the largest of an element\'s four corners is the one read', () => {
    const sheet = 'border:0;padding:16px;background:var(--surface);box-shadow:var(--sh-dialog)';
    const topSheet = `<dialog open aria-label="Share" style="border-radius:14px 14px 0 0;${sheet}"><p>A sheet with 14px top corners.</p></dialog>`;
    // the style block's three sizes: a 4px tag, a 6px control, a 10px card
    const three = '<p><span class="tag">Paid</span></p><p><button type="button" class="btn">Edit invoice</button></p><div class="card"><p>A card at 10px.</p></div>';
    const corners = (name, body) => {
      const r = reportOf(labPage(name, body));
      if (!r) throw new Error('the page check did not run');
      return { big: r.findings.find((f) => f.rule.startsWith('corners up to')), count: r.findings.find((f) => / corner sizes$/.test(f.rule)) };
    };
    const out = [];
    // tag, control, card, a 14px sheet, a 16px alert and a side sheet rounded on its far edge only: three sizes, no big corner
    const quietSheet = corners('corner-sheet', `${three}${topSheet}`
      + `<div role="alertdialog" aria-label="Delete the invoice?" style="margin-top:160px;border-radius:16px;${sheet}"><p>An alert at 16px.</p></div>`
      + `<div role="dialog" aria-label="Details" style="margin-top:24px;border-radius:0 14px 14px 0;${sheet}"><p>A side sheet, 14px on its far edge.</p></div>`);
    if (quietSheet.big) out.push(`a 14px sheet, a 16px alert dialog and a side sheet were flagged: ${quietSheet.big.rule}`);
    if (quietSheet.count) out.push(`tag, control, card and sheets should read three corner sizes, got "${quietSheet.count.rule}" (${quietSheet.count.items[0]})`);
    // the same 14px on a panel that is no dialog, on its far edge only: read as 14px (not 0), a big corner and a fourth size
    const panel = corners('corner-panel', `${three}${topSheet}<aside aria-label="Details" style="margin-top:160px;border-radius:0 14px 14px 0;padding:16px;background:var(--well)"><p>A panel, 14px on its far edge.</p></aside>`);
    if (panel.big?.rule !== 'corners up to 14px' || panel.big.severity !== 'medium') out.push(`a panel rounded "0 14px 14px 0" beside a 14px sheet should be a medium "corners up to 14px", got ${panel.big ? `${panel.big.severity} "${panel.big.rule}"` : 'nothing'}`);
    if (panel.count?.rule !== '4 corner sizes') out.push(`tag, control, card and a 14px panel should be "4 corner sizes", got ${panel.count ? `"${panel.count.rule}"` : 'nothing'}`);
    const wide = corners('corner-dialog', `<dialog open aria-label="Share" style="border-radius:20px;${sheet}"><p>A dialog at 20px.</p></dialog>`);
    if (wide.big?.rule !== 'corners up to 20px') out.push(`a dialog at 20px should be "corners up to 20px", got ${wide.big ? `"${wide.big.rule}"` : 'nothing'}`);
    return out;
  });

  test('the latency probe reads press feedback that has no transition as answered, a button with none as failing, a press that navigates as navigated, and a stopped server as exit 4', () => {
    const latency = path.join(SKILLS, 'antheo-review', 'scripts', 'latency-probe.mjs');
    // :active with no transition is already applied when pointerdown is heard: it must not read as "answers only on release"
    const file = labPage('latency', '<button type="button" class="btn" id="leave">Open report</button> <button type="button" id="instant" style="height:32px;padding:0 12px;border:0;border-radius:6px;background:#222;color:#fff">Instant</button> '
      + '<button type="button" id="mute" style="height:32px;padding:0 12px;border:0;border-radius:6px;background:#222;color:#fff">Mute</button>',
      '#instant,#mute{transition:none}#instant:active{background:#555 !important}#mute:active{scale:none}');
    // a press that takes the page elsewhere by script: reported, and the two buttons after it are still measured
    fs.appendFileSync(file, '<script>document.getElementById("leave").onclick=()=>{location.href=location.pathname+"?report=1"}</script>');
    const json = file.replace(/\.html$/, '.latency.json');
    const r = spawnSync(process.execPath, [latency, file, '--json', json], { encoding: 'utf8', timeout: 240000 });
    if (!fs.existsSync(json)) return [`the latency probe didn't run: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`];
    const rows = JSON.parse(read(json)).controls;
    const instant = rows.find((c) => c.name.includes('Instant')), mute = rows.find((c) => c.name.includes('Mute')), leave = rows.find((c) => c.name.includes('Open report'));
    const out = [];
    if (leave?.verdict !== 'NAVIGATED' || !leave.notes.some((n) => n.includes('report=1'))) out.push(`the press that navigated should be reported as NAVIGATED with where it went, got ${leave?.verdict} (${leave?.notes.join('; ')})`);
    if (instant?.verdict !== 'PASS' || !(instant.press <= 100)) out.push(`instant :active feedback should pass within 100ms, got ${instant?.verdict} ${instant?.press}ms (${instant?.notes.join('; ')})`);
    if (mute?.verdict !== 'FAIL') out.push(`a button with no press feedback should fail, got ${mute?.verdict}`);
    if (r.status !== 1) out.push(`a FAIL verdict should exit 1, got ${r.status}`);
    const dead = spawnSync(process.execPath, [latency, 'http://127.0.0.1:59999/'], { encoding: 'utf8', timeout: 240000 });
    if (dead.status !== 4) out.push(`the latency probe on a dead server exited ${dead.status}, expected 4`);
    return out;
  });

  // the generated product set (default-tokens.css carries the block's own rules) and the style block, on the same
  // small page at phone width: what a finger presses must come out the same size
  {
    const req = createRequire(path.join(process.cwd(), 'package.json'));
    const pw = await import(new URL(`file:///${req.resolve('playwright-core').replace(/\\/g, '/')}`).href).then((m) => m.default ?? m);
    const body = '<main><h1 class="t-page" id="page">Page</h1><h2 class="t-title" id="title">Title</h2><p id="body">Body text</p><p class="t-meta" id="meta">Meta</p><p class="t-display" id="display">Display</p>'
      + '<button type="button" class="btn" id="btn">Save</button><input class="field" id="field" value="x" aria-label="Name">'
      + '<button type="button" class="switch" role="switch" aria-checked="true" aria-label="On" id="sw"></button><div class="card" id="card">Card</div></main>';
    const sizes = {};
    const browser = await (async () => { for (const o of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) { try { return await pw.chromium.launch(o); } catch { /* next */ } } return null; })();
    try {
      for (const [name, css] of [['block', quiet], ['generated', read(path.join(SKILLS, 'antheo-tokens', 'references', 'default-tokens.css'))]]) {
        const file = path.join(tmp, `touch-${name}.html`);
        fs.writeFileSync(file, `${PAGE_HEAD(name)}<style>${css}</style></head><body>${body}</body></html>`);
        const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await p.goto(`file:///${file.replace(/\\/g, '/')}`);
        sizes[name] = await p.evaluate(() => {
          const cs = (id, pseudo) => getComputedStyle(document.getElementById(id), pseudo);
          const len = (n) => { const i = document.createElement('i'); i.style.cssText = `position:absolute;height:var(${n})`; document.body.append(i); const h = getComputedStyle(i).height; i.remove(); return h; };
          const text = (id) => `${cs(id).fontSize} on ${cs(id).lineHeight}`;
          return { meta: text('meta'), body: text('body'), title: text('title'), page: text('page'), headline: text('display'), button: cs('btn').height, field: cs('field').height, 'small control': len('--h-small'), 'call to action': len('--h-cta'), row: len('--h-row'), switch: `${cs('sw').width} by ${cs('sw').height}`, knob: cs('sw', '::after').width, 'knob fill': cs('sw', '::after').backgroundColor, 'card padding': cs('card').paddingTop, gutter: len('--gutter') };
        });
        await p.close();
      }
    } finally {
      await browser?.close();
    }
    test('on a phone the generated product set gives the same text sizes, control heights, switch, card padding and gutter as the style block', () => {
      const out = Object.keys(sizes.block ?? {}).filter((k) => sizes.block[k] !== sizes.generated?.[k]).map((k) => `${k}: ${sizes.block[k]} in the block, ${sizes.generated?.[k]} generated`);
      const want = { meta: '13px on 18px', body: '15px on 22px', title: '17px on 24px', page: '22px on 28px', headline: '28px on 32px' };
      for (const [k, v] of Object.entries(want)) if (sizes.block?.[k] !== v) out.push(`the block's ${k} should be ${v} at 390px wide, it is ${sizes.block?.[k]}`);
      if (sizes.block?.button !== '44px') out.push(`the block's own button should be 44px at 390px wide, it is ${sizes.block?.button}`);
      return out;
    });
  }

  test('the latency probe\'s --play passes a transform animation (exit 0); a play that warns, fails or was never measured exits 1', () => {
    const latency = path.join(SKILLS, 'antheo-review', 'scripts', 'latency-probe.mjs');
    const box = '<button type="button" class="btn" id="go">Play</button><div id="box" style="width:120px;height:60px;margin-top:16px;border-radius:6px;background:var(--primary)"></div>';
    const smooth = labPage('play-smooth', box, '#box{transition:translate 1500ms var(--ease-out)}#box.on{translate:320px 0}');
    fs.appendFileSync(smooth, '<script>document.getElementById("go").onclick=()=>document.getElementById("box").classList.toggle("on")</script>');
    const janky = labPage('play-janky', box);
    fs.appendFileSync(janky, '<script>document.getElementById("go").onclick=()=>{const end=performance.now()+3000,b=document.getElementById("box");let x=0;const step=()=>{const t=performance.now();while(performance.now()-t<120){}b.style.translate=(x+=4)+"px 0";if(performance.now()<end)requestAnimationFrame(step)};requestAnimationFrame(step)}</script>');
    const play = (file, extra = []) => {
      const json = file.replace(/\.html$/, '.play.json');
      fs.rmSync(json, { force: true });
      const r = spawnSync(process.execPath, [latency, file, '--play', '#go', '--max-controls', '0', '--json', json, ...extra], { encoding: 'utf8', timeout: 240000 });
      const rows = fs.existsSync(json) ? JSON.parse(read(json)).plays ?? [] : [];
      return { status: r.status, row: rows[0] ?? null, rows };
    };
    const out = [];
    // a timing measure: a busy machine may drop a frame once, so a smooth page gets a second go before it is called a failure
    let good = play(smooth);
    if (good.row?.verdict !== 'PASS') good = play(smooth);
    if (good.row?.verdict !== 'PASS' || good.status !== 0) out.push(`a 1.5s transform animation should PASS and exit 0, got ${good.row?.verdict} (exit ${good.status}): ${JSON.stringify(good.row)}`);
    else if (!(good.row.frames > 60) || typeof good.row.longestMs !== 'number' || good.row.over33 !== 0 || !(good.row.onTime >= 0.95)) out.push(`the smooth play's numbers are off: ${JSON.stringify(good.row)}`);
    const bad = play(janky, ['--cpu', '2']);
    if (bad.row?.verdict !== 'FAIL' || bad.status !== 1) out.push(`a 120ms block on every frame should FAIL and exit 1, got ${bad.row?.verdict} (exit ${bad.status}): ${JSON.stringify(bad.row)}`);
    else if (!(bad.row.longestMs > 100) || bad.row.cpu !== 2) out.push(`the janky play's numbers are off: ${JSON.stringify(bad.row)}`);
    // 38ms of work on every frame: frames land between 33 and 50ms, a WARN, and a play that only warns still exits 1
    // (on a busy machine one may slip past 50ms and read FAIL, which exits 1 as well)
    const slow = labPage('play-slow', box);
    fs.appendFileSync(slow, '<script>document.getElementById("go").onclick=()=>{const end=performance.now()+3000,b=document.getElementById("box");let x=0;const step=()=>{const t=performance.now();while(performance.now()-t<38){}b.style.translate=(x+=2)+"px 0";if(performance.now()<end)requestAnimationFrame(step)};requestAnimationFrame(step)}</script>');
    const warned = play(slow);
    if (!['WARN', 'FAIL'].includes(warned.row?.verdict) || warned.status !== 1) out.push(`38ms on every frame should not pass and should exit 1, got ${warned.row?.verdict} (exit ${warned.status}): ${JSON.stringify(warned.row)}`);
    // a play that was never measured is not a pass either
    const missed = play(smooth, ['--play', '#not-on-the-page']);
    if (missed.rows[1]?.verdict !== 'SKIP' || missed.status !== 1) out.push(`a --play that matches nothing should be SKIP and exit 1, got ${missed.rows[1]?.verdict} (exit ${missed.status})`);
    return out;
  });

  test('a text field nobody can find is caught: the block\'s field, an outlined, an underlined, a native and a wrapped one pass in light and dark; a well alone and a faint border do not', () => {
    const plain = 'height:32px;padding:0 8px;border-radius:6px;background:transparent;color:inherit';
    const file = labPage('fields', '<form onsubmit="event.preventDefault()" style="display:grid;gap:16px">'
      + '<div><label for="block">Block field</label><input class="field" id="block" value="Maya"></div>'
      + '<div><label for="area">Block textarea</label><textarea class="field" id="area" style="height:64px">A note</textarea></div>'
      + '<div><label for="well">Well only</label><input class="field" id="well" value="Maya" style="--field-edge: var(--well-edge)"></div>'
      + `<div><label for="outlined">Outlined</label><input id="outlined" value="Maya" style="${plain};border:1px solid #767676"></div>`
      + `<div><label for="under">Underlined</label><input id="under" value="Maya" style="${plain};border:0;border-bottom:1px solid #767676;border-radius:0"></div>`
      + '<div><label for="faint">Faint border</label><input id="faint" value="Maya" style="height:32px;padding:0 8px;border:1px solid #e3e3e3;border-radius:6px;background:#fff;color:#222"></div>'
      + '<div><label for="native">Native</label><input id="native" value="Maya"></div>'
      + '<div><label for="pick">Native select</label><select id="pick"><option>Team</option></select></div>'
      + `<div><label for="wrapped">Wrapped</label><div style="display:flex;align-items:center;gap:4px;height:32px;border:1px solid #767676;border-radius:6px;padding:0 8px"><span>$</span><input id="wrapped" value="12" style="border:0;background:transparent;outline:0;height:28px;color:inherit"></div></div>`
      + '<div><label><input type="checkbox"> A tick box is not a text field</label></div></form>');
    const out = [];
    for (const preset of ['quiet', 'none']) {
      const r = reportOf(file, ['--preset', preset]);
      if (!r) return ['the page check did not run'];
      const found = r.findings.filter((f) => f.rule.startsWith('a field with no visible boundary: its edge and fill are under 3:1 (WCAG 1.4.11)'));
      const items = found.flatMap((f) => f.items);
      if (!found.length || found.some((f) => f.severity !== 'high' || f.area !== 'access')) out.push(`${preset}: the finding should be access, high: ${JSON.stringify(found.map((f) => [f.area, f.severity]))}`);
      for (const id of ['well', 'faint']) if (!items.some((i) => i.includes(`#${id}`) && /best \d\.\d\d:1/.test(i))) out.push(`${preset}: #${id} was not flagged with its best ratio`);
      for (const id of ['block', 'area', 'outlined', 'under', 'native', 'pick', 'wrapped']) if (items.some((i) => i.includes(`#${id}`))) out.push(`${preset}: #${id} has a visible boundary and was flagged (${items.find((i) => i.includes(`#${id}`))}${found.find((f) => f.items.some((i) => i.includes(`#${id}`)))?.rule.endsWith('dark mode') ? ', in dark' : ''})`);
    }
    return out;
  });

  test('a chart with no name is caught, and so are two series in equally light hues; named charts with labelled lines or lightness steps stay clean', () => {
    const axes = '<line x1="40" y1="170" x2="400" y2="170" stroke="oklch(0.9 0.003 80)" stroke-width="1"/><line x1="40" y1="90" x2="400" y2="90" stroke="oklch(0.9 0.003 80)" stroke-width="1"/>';
    const lines = (second) => `<path d="M40,150 L130,120 L220,128 L310,80 L400,60" fill="none" stroke="#2f6fde" stroke-width="2"/><path d="M40,160 L130,150 L220,110 L310,118 L400,96" fill="none" stroke="#d1493f" stroke-width="2"${second}/>`;
    const bars = (a, b) => [0, 1, 2, 3].map((i) => `<rect x="${60 + i * 90}" y="${90 - i * 10}" width="28" height="${80 + i * 10}" fill="${a}"/><rect x="${92 + i * 90}" y="${120 - i * 8}" width="28" height="${50 + i * 8}" fill="${b}"/>`).join('');
    const svg = (inner, attrs = '') => `<svg viewBox="0 0 470 190" width="470" height="190"${attrs}>${axes}${inner}</svg>`;
    const chartRules = (file, extra = []) => {
      const r = reportOf(file, extra);
      if (!r) throw new Error('the page check did not run');
      return r.findings.filter((f) => /chart/.test(f.rule));
    };
    const out = [];
    // a blue and a red of the same lightness, nothing else between them, and no name; then the same bars with a table beside them
    const badFile = labPage('chart-bad', `<div class="card" id="bare" data-chart>${svg(lines(''))}</div>`
      + `<section class="card" style="margin-top:24px"><div id="tabled" data-chart>${svg(bars('#2f6fde', '#d1493f'), ' aria-hidden="true"')}</div><table><caption>Invoiced and paid by quarter</caption><tr><th>Quarter</th><th>Invoiced</th><th>Paid</th></tr><tr><td>Q1</td><td>80</td><td>50</td></tr></table></section>`);
    for (const preset of ['quiet', 'none']) {
      const bad = chartRules(badFile, ['--preset', preset]);
      const unnamed = bad.find((f) => f.rule.startsWith('a chart with no name'));
      const hue = bad.find((f) => f.rule === 'chart series told apart by hue alone');
      if (unnamed?.severity !== 'high' || !unnamed.items.some((i) => i.includes('#bare'))) out.push(`${preset}: the chart with no name was not a high finding naming it`);
      if (unnamed?.items.some((i) => i.includes('#tabled'))) out.push(`${preset}: a chart with its data in a table in the same section was called unnamed`);
      if (hue?.severity !== 'medium' || !hue.items.some((i) => i.includes('#bare') && i.includes('#2f6fde') && i.includes('#d1493f'))) out.push(`${preset}: two equally light line colours were not a medium finding naming both`);
      if (!hue?.items.some((i) => i.includes('#tabled'))) out.push(`${preset}: two equally light bar colours were not named`);
    }
    // named, and told apart by a label at each line's end; by a dash; by a step of lightness
    const good = chartRules(labPage('chart-good', `<figure class="card" data-chart style="margin:0">${svg(`${lines('')}<text x="406" y="64" font-size="12" fill="currentColor">Invoiced</text><text x="406" y="100" font-size="12" fill="currentColor">Paid</text>`, ' role="img" aria-label="Invoiced and paid by month: both rose from March"')}</figure>`
      + `<div class="card" data-chart style="margin-top:24px">${svg(`<title>Invoiced (solid) and paid (dashed) by month</title>${lines(' stroke-dasharray="4 3"')}`)}</div>`
      + `<figure class="card" data-chart style="margin:24px 0 0">${svg(bars('#1f4fa8', '#9db9ee'))}<figcaption>Invoiced (dark) and paid (light) by quarter</figcaption></figure>`));
    for (const f of good) out.push(`a good chart was flagged: ${f.rule} (${f.items[0]})`);
    return out;
  });

  test('--stress also takes a pass in forced colours: a button drawn only by its fill is reported, the block\'s button and a text button are not', () => {
    const file = labPage('forced', '<p><button type="button" id="bare" style="height:32px;padding:0 12px;border:0;border-radius:6px;background:#222;color:#fff">Bare fill</button></p>'
      + '<p><button type="button" class="btn btn-primary">Block button</button></p><p><button type="button" id="plain" style="border:0;background:none;padding:8px">Text only</button></p>');
    const stressed = reportOf(file, ['--stress']);
    if (!stressed) return ['the page check did not run'];
    const out = [];
    const gone = stressed.findings.find((f) => f.rule.startsWith('disappears in forced colours'));
    if (!gone?.items.some((i) => i.includes('Bare fill'))) out.push('the button with no edge was not reported');
    if (gone?.items.some((i) => /Block button|Text only/.test(i))) out.push(`a control that keeps its shape was reported: ${gone.items.join('; ')}`);
    return out;
  });

  // what a screen sends: two versions of a small form, served locally. The second sends the amount as a string and
  // the date in another format; the capture holds every request back, so the server must only ever see GETs.
  {
    const http = await import('node:http');
    const { spawn } = await import('node:child_process');
    const tool = path.join(SKILLS, 'antheo-system', 'scripts', 'requests.mjs');
    const form = (send) => `${PAGE_HEAD('New invoice')}</head><body><main><h1>New invoice</h1><form id="f"><label>Amount <input id="amount" name="amount"></label>`
      + '<label>Due <input id="due" name="due" type="date"></label><button type="submit" id="save">Save invoice</button></form>'
      + `<script>document.getElementById("f").addEventListener("submit",(e)=>{e.preventDefault();const v=(id)=>document.getElementById(id).value;${send}})</script></main></body></html>`;
    const post = (body) => `fetch("/api/invoices?source=form",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(${body})}).catch(()=>{})`;
    const pages = { '/v1': form(post('{due:v("due"),amount:Number(v("amount"))}')), '/v2': form(`const [y,m,d]=v("due").split("-");${post('{amount:v("amount"),due:d+"/"+m+"/"+y}')}`) };
    const seen = [];
    const server = http.createServer((req, res) => { seen.push(`${req.method} ${req.url}`); res.writeHead(200, { 'content-type': 'text/html' }); res.end(pages[req.url] ?? 'ok'); });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    const run = (args) => new Promise((done) => {
      const child = spawn(process.execPath, [tool, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.stderr.on('data', (d) => { out += d; });
      const timer = setTimeout(() => child.kill(), 240000);
      child.on('exit', (status) => { clearTimeout(timer); done({ status, out }); });
    });
    const steps = ['--fill', '#amount=12', '--fill', '#due=2026-11-17', '--press', '#save'];
    const file = (name) => path.join(tmp, `requests-${name}.json`);
    const captures = [];
    for (const [name, at] of [['before', '/v1'], ['again', '/v1'], ['after', '/v2']]) captures.push(await run(['capture', base + at, ...steps, '--out', file(name)]));
    await new Promise((r) => server.close(r));
    const same = await run(['diff', file('before'), file('again')]);
    const differs = await run(['diff', file('before'), file('after')]);
    const unread = await run(['diff', file('before'), file('never-written')]);
    test('requests.mjs: a number sent as a string and a date in another format are both named (exit 1); the same screen twice is the same (exit 0); nothing is sent', () => {
      const out = [];
      if (captures.some((c) => c.status !== 0) || !fs.existsSync(file('before'))) return [`capture did not run: ${captures.map((c) => c.out.trim().split('\n').pop()).join(' | ')}`];
      const first = JSON.parse(read(file('before'))).requests;
      const want = { method: 'POST', path: '/api/invoices', query: [['source', 'form']], contentType: 'application/json', body: { amount: 12, due: '2026-11-17' } };
      if (JSON.stringify(first) !== JSON.stringify([want])) out.push(`the capture should be one POST with its body parsed and its keys sorted, got ${JSON.stringify(first)}`);
      if (same.status !== 0) out.push(`the same screen captured twice exited ${same.status}: ${same.out.trim().split('\n')[0]}`);
      if (differs.status !== 1) out.push(`two screens that send different bodies exited ${differs.status}, expected 1`);
      if (!/body\.amount: 12 \(a number\) before, "12" \(a string\) after/.test(differs.out)) out.push(`the number sent as a string was not named: ${differs.out.trim().split('\n')[0]}`);
      if (!/body\.due: "2026-11-17" before, "17\/11\/2026" after/.test(differs.out)) out.push('the date in another format was not named');
      if (unread.status !== 4) out.push(`a file that is not there exited ${unread.status}, expected 4`);
      const sent = seen.filter((r) => !/^(GET|HEAD|OPTIONS) /.test(r));
      if (sent.length) out.push(`the server received ${sent.join(', ')}`);
      return out;
    });
  }

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
