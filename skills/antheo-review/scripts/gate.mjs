#!/usr/bin/env node
/*
 * The gate: a UI change isn't "done" until its page and its words pass, checked by machine, not by the agent's word.
 *
 *   node gate.mjs arm <url-or-html-file>... [--copy <file-or-folder>...] [--widths 390,1280] [--max 3]
 *   node gate.mjs check        run the checks now; exit 0 if they pass, 1 if not (for agents without hooks: Codex, Cursor)
 *   node gate.mjs hook         the same, as a Claude Code Stop hook: blocks stopping (exit 2) while checks fail
 *   node gate.mjs status       what is armed, which round, what's waived
 *   node gate.mjs rearm        a PASS disarms the gate; after more changes, check the same pages again
 *   node gate.mjs disarm       stop gating (after the work is done, or to abandon it)
 *
 * What it checks, on every armed target: antheo-review's check-page.mjs at the armed widths, light and dark (a
 * blocker or a high finding fails it), and antheo-writing's copy-lint.mjs on the --copy paths (a high finding fails
 * it). It works on any stack: the page is checked as rendered (a dev-server URL or a built HTML file), and copy-lint
 * reads HTML, JSX/TSX, Vue, Svelte, Astro, Angular and server templates.
 *
 * Rounds: each failed check is one round; after --max rounds (3) it stops blocking and reports GATE: DONE with what is
 * still open, so a hard case reaches the person instead of looping.
 *
 * Waivers: a finding the checker gets wrong is waived in .antheo/waivers.json, never fixed by gaming the check:
 *   [{ "rule": "horizontal scroll", "target": "http://localhost:3000/settings", "reason": "the code sample scrolls by design" }]
 * "rule" is matched against the finding's rule text, "target" is optional, and "reason" is required (12+ characters).
 * State lives in .antheo/gate.json in the working directory. No dependencies beyond what check-page needs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHECK_PAGE = join(here, 'check-page.mjs');
const COPY_LINT = join(here, '..', '..', 'antheo-writing', 'scripts', 'copy-lint.mjs');
const DIR = resolve('.antheo');
const STATE = join(DIR, 'gate.json');
const WAIVERS = join(DIR, 'waivers.json');

const [cmd = 'help', ...rest] = process.argv.slice(2);
const readJson = (f, fallback) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return fallback; } };
const save = (s) => { mkdirSync(DIR, { recursive: true }); writeFileSync(STATE, JSON.stringify(s, null, 2)); };
const short = (t) => (/^https?:/.test(t) ? t : relative(process.cwd(), t) || t);
const say = (...l) => process.stdout.write(l.join('\n') + '\n');

function waivers() {
  const list = readJson(WAIVERS, []);
  const bad = list.filter((w) => !w || typeof w.rule !== 'string' || typeof w.reason !== 'string' || w.reason.trim().length < 12);
  if (bad.length) throw new Error(`${bad.length} waiver(s) in .antheo/waivers.json have no rule or no real reason (12+ characters). A waiver needs a reason.`);
  return list;
}
const waived = (list, rule, target) => list.find((w) => rule.toLowerCase().includes(w.rule.toLowerCase()) && (!w.target || w.target === target));

function checkPage(target, widths, list) {
  const out = join(DIR, `page-${Buffer.from(target).toString('base64url').slice(-24)}.json`);
  const r = spawnSync(process.execPath, [CHECK_PAGE, target, '--widths', widths, '--json', out, '--quiet'], { encoding: 'utf8', timeout: 240000 });
  if (!existsSync(out)) return { target, error: (r.stderr || r.stdout || 'check-page produced no report').trim().split('\n').slice(-3).join(' ') };
  const rep = readJson(out, null);
  const open = [];
  const skipped = [];
  for (const f of rep.findings ?? []) {
    if (!['blocker', 'high'].includes(f.severity)) continue;
    const w = waived(list, f.rule, target);
    if (w) skipped.push(`${f.rule} (waived: ${w.reason})`);
    else open.push(`${f.severity.toUpperCase()} ${f.rule}${f.items?.length ? `: ${f.items.slice(0, 2).join('; ')}` : ''}${f.fix ? `\n    fix: ${f.fix}` : ''}`);
  }
  return { target, score: rep.overall, open, skipped };
}
function copyLint(paths, list) {
  if (!paths.length) return null;
  const out = join(DIR, 'copy.json');
  spawnSync(process.execPath, [COPY_LINT, ...paths, '--json', out, '--min-severity', 'high'], { encoding: 'utf8', timeout: 120000 });
  const rep = readJson(out, null);
  if (!rep) return { error: 'copy-lint produced no report' };
  const all = Array.isArray(rep) ? rep : rep.findings ?? [];
  const open = [];
  const skipped = [];
  for (const f of all) {
    if (f.severity !== 'high') continue;
    const w = waived(list, f.rule ?? '', f.file ?? '');
    if (w) skipped.push(`${f.rule} (waived: ${w.reason})`);
    else open.push(`HIGH ${f.rule} ${short(f.file ?? '')}:${f.line ?? ''} "${String(f.text ?? '').slice(0, 60)}"${f.fix ? `\n    fix: ${f.fix}` : ''}`);
  }
  return { open, skipped };
}

function run(state) {
  const list = waivers();
  const pages = state.targets.map((t) => checkPage(t, state.widths, list));
  const copy = copyLint(state.copy, list);
  const errors = [...pages.filter((p) => p.error).map((p) => `${short(p.target)}: ${p.error}`), ...(copy?.error ? [`copy: ${copy.error}`] : [])];
  const open = [...pages.flatMap((p) => (p.open ?? []).map((o) => `${short(p.target)}\n  ${o}`)), ...(copy?.open ?? []).map((o) => `copy\n  ${o}`)];
  const skipped = [...pages.flatMap((p) => p.skipped ?? []), ...(copy?.skipped ?? [])];
  return { pages, errors, open, skipped };
}

function report(state, r) {
  const lines = [];
  for (const p of r.pages) if (!p.error) lines.push(`  ${short(p.target)}: score ${p.score}/100, ${p.open.length} blocking`);
  if (r.skipped.length) lines.push(`  waived: ${r.skipped.join('; ')}`);
  if (r.errors.length) lines.push('', 'Could not check:', ...r.errors.map((e) => `  ${e}`));
  if (r.open.length) lines.push('', 'Still failing:', ...r.open.map((o) => `  ${o}`));
  return lines.join('\n');
}

if (cmd === 'arm') {
  const targets = [];
  const copy = [];
  let widths = '390,1280';
  let max = 3;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--copy') { while (rest[i + 1] && !rest[i + 1].startsWith('--')) copy.push(resolve(rest[++i])); }
    else if (rest[i] === '--widths') widths = rest[++i];
    else if (rest[i] === '--max') max = Number(rest[++i]) || 3;
    else if (!rest[i].startsWith('--')) targets.push(/^https?:/.test(rest[i]) ? rest[i] : resolve(rest[i]));
  }
  if (!targets.length) { say('arm needs at least one page: a dev-server URL or an HTML file.'); process.exit(2); }
  save({ armed: true, targets, copy, widths, max, round: 0, at: new Date().toISOString() });
  say(`GATE: ARMED for ${targets.length} page(s)${copy.length ? ` and ${copy.length} copy path(s)` : ''}, up to ${max} rounds.`, 'Run `node gate.mjs check` before saying the work is done (a Claude Code Stop hook runs it for you).');
  process.exit(0);
}
// after a PASS (or DONE) the gate disarms itself; rearm checks the same pages again after more changes
if (cmd === 'rearm') {
  const s = readJson(STATE, null);
  if (!s?.targets?.length) { say('Nothing to re-arm: arm it first with `node gate.mjs arm <page>`.'); process.exit(2); }
  save({ ...s, armed: true, round: 0, at: new Date().toISOString() });
  say(`GATE: ARMED again for ${s.targets.length} page(s)${s.copy.length ? ` and ${s.copy.length} copy path(s)` : ''}, up to ${s.max} rounds.`, 'Run `node gate.mjs check` before saying the work is done.');
  process.exit(0);
}
if (cmd === 'disarm') { if (existsSync(STATE)) rmSync(STATE); say('GATE: DISARMED'); process.exit(0); }
if (cmd === 'status') {
  const s = readJson(STATE, null);
  if (!s?.armed) { say('GATE: not armed'); process.exit(0); }
  say(`GATE: armed, round ${s.round} of ${s.max}`, `pages: ${s.targets.join(', ')}`, `copy: ${s.copy.join(', ') || 'none'}`, `waivers: ${readJson(WAIVERS, []).length}`);
  process.exit(0);
}
if (cmd === 'check' || cmd === 'hook') {
  // a Stop hook gets JSON on stdin; nothing in it changes what we check, so it is read and ignored
  if (cmd === 'hook') { try { readFileSync(0, 'utf8'); } catch { /* no stdin */ } }
  const s = readJson(STATE, null);
  if (!s?.armed) { if (cmd === 'check') say('GATE: not armed (nothing to check). Arm it with `node gate.mjs arm <page>`.'); process.exit(0); }
  let r;
  try { r = run(s); } catch (e) {
    // an error (a waiver with no reason, a page that won't load) counts as a round, so it can't be used to slip out
    s.round += 1;
    const done = s.round >= s.max;
    if (done) s.armed = false;
    save(s);
    const msg = `GATE: ERROR (round ${s.round} of ${s.max}) ${e.message}`;
    if (cmd === 'hook' && !done) { process.stderr.write(msg + '\n'); process.exit(2); }
    say(msg);
    process.exit(cmd === 'hook' ? 0 : 1);
  }
  const failing = r.open.length > 0 || r.errors.length > 0;
  if (!failing) {
    say('GATE: PASS', report(s, r), '', 'The gate has disarmed itself. If you change the page again, run `node gate.mjs rearm` and check again before saying done.');
    s.armed = false;
    s.passedAt = new Date().toISOString();
    save(s);
    process.exit(0);
  }
  s.round += 1;
  save(s);
  if (s.round >= s.max) {
    say(`GATE: DONE after ${s.round} rounds, with work still open. Tell the person what is left; don't keep looping.`, report(s, r));
    s.armed = false;
    save(s);
    process.exit(0);
  }
  const msg = [`GATE: OPEN (round ${s.round} of ${s.max}). The work isn't done: fix these on the page, then stop again.`, report(s, r), '', 'If last round\'s change did not move a finding, revert it before the next idea; never stack guesses.', 'A finding the checker gets wrong goes in .antheo/waivers.json with a reason; never change the check or the page just to pass it.'].join('\n');
  if (cmd === 'hook') { process.stderr.write(msg + '\n'); process.exit(2); }
  say(msg);
  process.exit(1);
}
say('usage: node gate.mjs arm <page>... [--copy <paths>] [--widths 390,1280] [--max 3] | check | hook | status | rearm | disarm');
process.exit(cmd === 'help' ? 0 : 2);
