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
  const { buildCore } = await import(new URL(`file:///${builder.replace(/\\/g, '/')}`).href);
  test('ANTHEO-CORE.md matches the skills (rebuild it with node scripts/build-core.mjs)', () =>
    read(corePath).replace(/\r\n/g, '\n') === buildCore(SKILLS) ? [] : ['ANTHEO-CORE.md is out of date']);
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

if (BROWSER) {
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
console.log(`\n${results.length - failed} of ${results.length} passed${BROWSER ? '' : ' (add --browser to test the tools on real pages)'}`);
process.exit(failed ? 1 : 0);
