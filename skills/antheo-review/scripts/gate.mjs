#!/usr/bin/env node
/*
 * The gate: a UI change isn't "done" until its page and its words pass, checked by machine, not by the agent's word.
 *
 *   node gate.mjs arm <url-or-html-file>... [--copy <file-or-folder>...] [--widths 390,1280] [--max 3] [--preset none]
 *                              [--ref <image>...] [--no-probe]
 *                              (--preset none: the project has its own design system or a requested direction, so the
 *                              Antheo Quiet look is not judged; every universal check still runs)
 *                              (--ref: the work is built from these references, so it needs evidence of comparing:
 *                              for each, two beside.mjs sheets made at least a minute apart and one filmstrip.mjs
 *                              sheet in which something moved, in .antheo/evidence/)
 *                              (--no-probe: skip the access probe; by default it runs on every page)
 *   node gate.mjs check        run the checks now (for agents without hooks: Codex, Cursor, and CI). Exit codes:
 *                                0 PASS (or not armed)        1 OPEN: findings to fix, another round
 *                                3 DONE, UNRESOLVED: the rounds ran out with work still open; not a pass
 *                                4 TOOL ERROR: a checker crashed or wrote no report; nothing was verified
 *   node gate.mjs hook         the same, as a Claude Code Stop hook: blocks stopping (exit 2) while checks fail, and
 *                              lets the agent stop after the last round so the person gets the unresolved list
 *   node gate.mjs status       what is armed, which round, what's waived
 *   node gate.mjs rearm        a PASS disarms the gate; after more changes, check the same pages again
 *   node gate.mjs disarm       stop gating (after the work is done, or to abandon it)
 *
 * What it checks, on every armed target: antheo-review's check-page.mjs at the armed widths, light and dark (a
 * blocker or a high finding fails it), antheo-access's a11y-probe.mjs (a blocker or serious finding fails it: keyboard,
 * focus, forced colours, text spacing, reflow, buttons wired to nothing), antheo-writing's copy-lint.mjs on the --copy
 * paths (a high finding fails it), antheo-motion-audit's scan-motion.mjs on the same paths (a high finding fails it:
 * transition on all, growing from scale(0), animating layout, no reduced-motion handling), and with --ref, the
 * evidence of comparing with the references. It works on any stack: the page is checked as rendered (a dev-server URL or a built HTML file), and copy-lint
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
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHECK_PAGE = join(here, 'check-page.mjs');
const COPY_LINT = join(here, '..', '..', 'antheo-writing', 'scripts', 'copy-lint.mjs');
const PROBE = join(here, '..', '..', 'antheo-access', 'scripts', 'a11y-probe.mjs');
const MOTION = join(here, '..', '..', 'antheo-motion-audit', 'scripts', 'scan-motion.mjs');
const EVIDENCE = join(resolve('.antheo'), 'evidence');
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
  // a waiver names a finding by the start of its rule (6+ characters): an empty or one-word rule would waive everything
  const bad = list.filter((w) => !w || typeof w.rule !== 'string' || w.rule.trim().length < 6 || typeof w.reason !== 'string' || w.reason.trim().length < 12);
  if (bad.length) throw new Error(`${bad.length} waiver(s) in .antheo/waivers.json need a rule of 6+ characters (the start of the finding's name) and a reason of 12+ characters.`);
  return list;
}
const waived = (list, rule, target) => list.find((w) => rule.toLowerCase().startsWith(w.rule.trim().toLowerCase()) && (!w.target || w.target === target));

// a report is only trusted when this run wrote it: the old one is deleted first, and a crash, a timeout or an unreadable
// report is a tool error, never a result (a stale passing report must not survive a failed check)
const tail = (r, what) => (r.stderr || r.stdout || `${what} produced no report`).trim().split('\n').slice(-3).join(' ');
function fresh(r, out, what) {
  if (r.error || r.signal) return { error: `${what} did not finish (${r.error?.code || r.signal})` };
  if (!existsSync(out)) return { error: `${what} wrote no report: ${tail(r, what)}` };
  const rep = readJson(out, null);
  if (!rep || typeof rep !== 'object') return { error: `${what} wrote a report that can't be read` };
  return { rep };
}

function checkPage(target, widths, list, preset) {
  const out = join(DIR, `page-${Buffer.from(target).toString('base64url').slice(-24)}.json`);
  rmSync(out, { force: true });
  const r = spawnSync(process.execPath, [CHECK_PAGE, target, '--widths', widths, '--preset', preset || 'quiet', '--json', out, '--quiet'], { encoding: 'utf8', timeout: 240000 });
  const { rep, error } = fresh(r, out, 'check-page');
  if (error) return { target, error };
  if (!Array.isArray(rep.findings)) return { target, error: 'check-page wrote a report with no findings list' };
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
function probe(target, list) {
  const out = join(DIR, `probe-${Buffer.from(target).toString('base64url').slice(-24)}.json`);
  rmSync(out, { force: true });
  const r = spawnSync(process.execPath, [PROBE, target, '--json', out, '--quiet'], { encoding: 'utf8', timeout: 480000 });
  const { rep, error } = fresh(r, out, 'a11y-probe');
  if (error) return { target, error };
  if (!Array.isArray(rep.findings)) return { target, error: 'a11y-probe wrote a report with no findings list' };
  const open = [];
  const skipped = [];
  for (const f of rep.findings) {
    if (!['blocker', 'serious'].includes(f.severity)) continue;
    const rule = `${f.area}: ${f.message}`;
    const w = waived(list, rule, target);
    if (w) skipped.push(`${f.area} (waived: ${w.reason})`);
    else open.push(`${f.severity.toUpperCase()} ${rule}${f.element ? ` (${f.element})` : ''}${f.fix ? `\n    fix: ${f.fix}` : ''}`);
  }
  return { target, open, skipped };
}

/* with --ref: the build was put beside each reference twice, a minute or more apart (compared, changed, compared
   again), and its motion was filmed at least once, all since the gate was first armed */
function evidence(state) {
  if (!state.refs?.length) return [];
  const since = Date.parse(state.firstAt ?? state.at ?? 0) - 1000;
  const files = existsSync(EVIDENCE) ? readdirSync(EVIDENCE).map((f) => ({ f, t: statSync(join(EVIDENCE, f)).mtimeMs })).filter((x) => x.t >= since) : [];
  const open = [];
  for (const ref of state.refs) {
    const name = basename(ref, extname(ref));
    const times = files.filter((x) => x.f.startsWith(`beside-${name}-`) && x.f.endsWith('.png')).map((x) => x.t).sort((a, b) => a - b);
    if (times.length < 2 || times[times.length - 1] - times[0] < 60000) {
      open.push(`EVIDENCE beside ${name}: ${times.length} comparison sheet(s); it needs two, a minute or more apart\n    fix: node <antheo-review>/scripts/beside.mjs <page> --clip <selector> --ref ${short(ref)}; open it, fix what differs, run it again`);
    }
  }
  // a film counts only when its record says something moved; one per reference, since each component moves its own way
  const films = files.filter((x) => x.f.startsWith('film-') && x.f.endsWith('.png')).filter((x) => {
    const rec = readJson(join(EVIDENCE, x.f.replace(/\.png$/, '.json')), null);
    return !rec || rec.changed !== false; // an older film with no record still counts
  });
  if (films.length < state.refs.length) {
    open.push(`EVIDENCE motion: ${films.length} filmstrip(s) where something moved, for ${state.refs.length} reference(s); film each component's main interaction\n    fix: node <antheo-motion>/scripts/filmstrip.mjs <page> --clip <selector> --click <selector>; read every frame`);
  }
  return open;
}

/* the motion in the same source folders the copy check reads: a high finding (transition on all, growing from
   scale(0), animating width or top, no reduced-motion handling anywhere) keeps the work open */
function motionScan(paths, list) {
  if (!paths.length) return null;
  const open = [];
  const skipped = [];
  for (const p of paths) {
    const out = join(DIR, `motion-${Buffer.from(p).toString('base64url').slice(-24)}.json`);
    rmSync(out, { force: true });
    const r = spawnSync(process.execPath, [MOTION, p, '--json', out], { encoding: 'utf8', timeout: 120000 });
    const { rep, error } = fresh(r, out, 'scan-motion');
    if (error) return { error };
    if (rep.filesWithMotion > 0 && rep.guardAnywhere === false) {
      const w = waived(list, 'no reduced-motion handling', p);
      if (w) skipped.push(`no reduced-motion handling (waived: ${w.reason})`);
      else open.push(`HIGH no reduced-motion handling anywhere in ${short(p)}\n    fix: travel, scale and blur become a short fade under @media (prefers-reduced-motion: reduce)`);
    }
    for (const item of rep.items ?? []) {
      for (const f of item.flags ?? []) {
        if (f.sev !== 'high') continue;
        const w = waived(list, f.msg, item.file);
        if (w) skipped.push(`${f.msg} (waived: ${w.reason})`);
        else open.push(`HIGH ${f.msg} ${item.file}:${item.line} "${String(item.code).slice(0, 60)}"`);
      }
    }
  }
  return { open, skipped };
}

function copyLint(paths, list) {
  if (!paths.length) return null;
  const out = join(DIR, 'copy.json');
  rmSync(out, { force: true });
  const r = spawnSync(process.execPath, [COPY_LINT, ...paths, '--json', out, '--min-severity', 'high'], { encoding: 'utf8', timeout: 120000 });
  const { rep, error } = fresh(r, out, 'copy-lint');
  if (error) return { error };
  // a wrong --copy path reads nothing and finds nothing: that is not clean copy
  if (!rep.files) return { error: `copy-lint read no files in ${paths.map(short).join(', ')}` };
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
  const pages = state.targets.map((t) => checkPage(t, state.widths, list, state.preset));
  const probes = state.probe ? state.targets.map((t) => probe(t, list)) : [];
  const copy = copyLint(state.copy, list);
  const motion = motionScan(state.copy, list);
  const errors = [...(motion?.error ? [`motion: ${motion.error}`] : []), ...pages.filter((p) => p.error).map((p) => `${short(p.target)}: ${p.error}`), ...probes.filter((p) => p.error).map((p) => `${short(p.target)}: ${p.error}`), ...(copy?.error ? [`copy: ${copy.error}`] : [])];
  const open = [
    ...pages.flatMap((p) => (p.open ?? []).map((o) => `${short(p.target)}\n  ${o}`)),
    ...probes.flatMap((p) => (p.open ?? []).map((o) => `${short(p.target)} (access probe)\n  ${o}`)),
    ...(copy?.open ?? []).map((o) => `copy\n  ${o}`),
    ...(motion?.open ?? []).map((o) => `motion\n  ${o}`),
    ...evidence(state).map((o) => `evidence\n  ${o}`),
  ];
  const skipped = [...pages.flatMap((p) => p.skipped ?? []), ...probes.flatMap((p) => p.skipped ?? []), ...(copy?.skipped ?? []), ...(motion?.skipped ?? [])];
  return { pages, errors, open, skipped };
}

function report(state, r) {
  const lines = [];
  for (const p of r.pages) if (!p.error) lines.push(`  ${short(p.target)}: score ${p.score}/100, ${p.open.length} blocking`);
  if (state.probe) lines.push(`  access probe: ${r.open.filter((o) => o.includes('(access probe)')).length} blocking`);
  if (state.refs?.length) lines.push(`  evidence: ${r.open.some((o) => o.startsWith('evidence')) ? 'missing' : 'present'} for ${state.refs.length} reference(s)`);
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
  let preset = 'quiet';
  let probeOn = true;
  const refs = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--copy') { while (rest[i + 1] && !rest[i + 1].startsWith('--')) copy.push(resolve(rest[++i])); }
    else if (rest[i] === '--widths') widths = rest[++i];
    else if (rest[i] === '--preset') preset = rest[++i] === 'none' ? 'none' : 'quiet';
    else if (rest[i] === '--max') max = Number(rest[++i]) || 3;
    else if (rest[i] === '--no-probe') probeOn = false;
    else if (rest[i] === '--ref') { while (rest[i + 1] && !rest[i + 1].startsWith('--')) refs.push(resolve(rest[++i])); }
    else if (!rest[i].startsWith('--')) targets.push(/^https?:/.test(rest[i]) ? rest[i] : resolve(rest[i]));
  }
  if (!targets.length) { say('arm needs at least one page: a dev-server URL or an HTML file.'); process.exit(2); }
  const missingRef = refs.find((r) => !existsSync(r));
  if (missingRef) { say(`No reference image at ${missingRef}.`); process.exit(2); }
  const now = new Date().toISOString();
  save({ armed: true, targets, copy, widths, max, preset, probe: probeOn, refs, round: 0, at: now, firstAt: now });
  say(`GATE: ARMED for ${targets.length} page(s)${copy.length ? ` and ${copy.length} copy path(s)` : ''}${refs.length ? `, ${refs.length} reference(s)` : ''}, up to ${max} rounds${probeOn ? '' : ', without the access probe'}.`, 'Run `node gate.mjs check` before saying the work is done (a Claude Code Stop hook runs it for you).');
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
  if (!s?.armed) { say(`GATE: not armed${s?.result ? ` (last result: ${s.result})` : ''}`); process.exit(0); }
  say(`GATE: armed, round ${s.round} of ${s.max}`, `pages: ${s.targets.join(', ')}`, `copy: ${s.copy.join(', ') || 'none'}`, `waivers: ${readJson(WAIVERS, []).length}`);
  process.exit(0);
}
if (cmd === 'check' || cmd === 'hook') {
  // a Stop hook gets JSON on stdin; nothing in it changes what we check, so it is read and ignored
  if (cmd === 'hook') { try { readFileSync(0, 'utf8'); } catch { /* no stdin */ } }
  const s = readJson(STATE, null);
  // not armed: the hook lets the agent stop. `check` reports the last result honestly: an unresolved or errored run
  // stays non-zero, and with no state at all nothing was checked (exit 2), which CI must not read as success
  if (!s?.armed) {
    if (cmd === 'hook') process.exit(0);
    if (s?.result === 'unresolved') { say('GATE: not armed; the last run ended DONE, UNRESOLVED. Rearm and check again.'); process.exit(3); }
    if (s?.result === 'tool error') { say('GATE: not armed; the last run ended in a TOOL ERROR. Nothing was verified.'); process.exit(4); }
    if (s?.result === 'pass') { say('GATE: not armed; the last run passed. Rearm after any change.'); process.exit(0); }
    say('GATE: not armed, so nothing was checked. Arm it first: `node gate.mjs arm <page>`.');
    process.exit(2);
  }
  let r;
  try { r = run(s); } catch (e) {
    // an error (a waiver with no reason) counts as a round, so it can't be used to slip out
    r = { pages: [], errors: [e.message], open: [], skipped: [] };
  }
  // a checker that crashed or wrote no report verified nothing: that is a tool error, never a pass
  if (r.errors.length) {
    s.round += 1;
    const done = s.round >= s.max;
    if (done) s.armed = false;
    s.result = 'tool error';
    save(s);
    const msg = [`GATE: TOOL ERROR (round ${s.round} of ${s.max}). Nothing was verified; fix the tool problem, then check again.`, report(s, r)].join('\n');
    if (cmd === 'hook' && !done) { process.stderr.write(msg + '\n'); process.exit(2); }
    say(msg, ...(done ? ['', 'The rounds ran out on a tool error: tell the person the page is unverified.'] : []));
    process.exit(cmd === 'hook' ? 0 : 4);
  }
  const failing = r.open.length > 0;
  if (!failing) {
    say('GATE: PASS', report(s, r), '', 'The gate has disarmed itself. If you change the page again, run `node gate.mjs rearm` and check again before saying done.', 'A PASS means the automated checks found nothing blocking. It is not a full release review: what the checks cannot see (taste, real devices, screen readers) stays unverified until someone looks.');
    s.armed = false;
    s.result = 'pass';
    s.passedAt = new Date().toISOString();
    save(s);
    process.exit(0);
  }
  s.round += 1;
  save(s);
  if (s.round >= s.max) {
    // the loop stops so a hard case reaches the person; it is not a pass, and CI sees a non-zero exit
    say(`GATE: DONE, UNRESOLVED after ${s.round} rounds. This is not a pass: tell the person what is still open; don't keep looping.`, report(s, r));
    s.armed = false;
    s.result = 'unresolved';
    save(s);
    process.exit(cmd === 'hook' ? 0 : 3);
  }
  const msg = [`GATE: OPEN (round ${s.round} of ${s.max}). The work isn't done: fix these on the page, then stop again.`, report(s, r), '', 'If last round\'s change did not move a finding, revert it before the next idea; never stack guesses.', 'A finding the checker gets wrong goes in .antheo/waivers.json with a reason; never change the check or the page just to pass it.'].join('\n');
  if (cmd === 'hook') { process.stderr.write(msg + '\n'); process.exit(2); }
  say(msg);
  process.exit(1);
}
say('usage: node gate.mjs arm <page>... [--copy <paths>] [--widths 390,1280] [--max 3] [--preset none] [--ref <images>] [--no-probe] | check | hook | status | rearm | disarm');
process.exit(cmd === 'help' ? 0 : 2);
