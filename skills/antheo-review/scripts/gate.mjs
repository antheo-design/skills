#!/usr/bin/env node
/*
 * The gate: a UI change isn't "done" until its page and its words pass, checked by machine, not by the agent's word.
 *
 *   node gate.mjs arm <url-or-html-file>... [--copy <file-or-folder>...] [--widths 390,1280] [--max 3] [--preset none|studio|editorial|playful]
 *                              [--ref <image>...] [--no-probe] [--allow-writes] [--landing]
 *                              (--landing: a landing, company or product page: the page check adds its first-screen,
 *                              contact and share checks, and copy-lint counts the devices of marketing copy)
 *                              (--preset none: the project has its own design system or a requested direction, so the
 *                              Antheo Quiet look is not judged; every universal check still runs; --preset studio,
 *                              editorial or playful: the page uses that look of the block, judged by its own corners)
 *                              (--ref: the work is built from these references, so it needs evidence of comparing:
 *                              for each, two beside.mjs sheets made at least a minute apart and one filmstrip.mjs
 *                              sheet in which something moved, in .antheo/evidence/)
 *                              (--no-probe: skip the access probe; by default it runs on every page)
 *                              (--allow-writes: the access probe presses real buttons and, by default, holds back
 *                              every request that is not a GET, HEAD or OPTIONS, so a Delete or a Send never leaves
 *                              the browser; this lets them through, for a page whose data can be lost)
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
 * Honest checks: the gate records a fingerprint of every checking tool when it is armed, and a tool that changed since
 * is a high finding; so is page source that tests for the checker (navigator.webdriver, a headless user agent, the
 * checker's own markers); more than 5 waivers is one too. A pass where a checker could not read everything (no
 * load measures, a stylesheet it could not open, a file copy-lint skipped) is reported as PASS, PARTLY MEASURED with
 * the list, never as a plain pass.
 *
 * Waivers: a finding the checker gets wrong is waived in .antheo/waivers.json, never fixed by gaming the check:
 *   [{ "rule": "horizontal scroll", "target": "http://localhost:3000/settings", "reason": "the code sample scrolls by design" }]
 * "rule" is matched against the finding's rule text, "target" is optional, and "reason" is required (12+ characters).
 * State lives in .antheo/gate.json in the working directory. No dependencies beyond what check-page needs.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
const MAX_WAIVERS = 5;
// the tools whose verdict the gate trusts: a change to one of them after arming is a finding, never a quiet pass
const TOOLS = [CHECK_PAGE, COPY_LINT, PROBE, MOTION, fileURLToPath(import.meta.url)];
const fingerprint = (f) => { try { return createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16); } catch { return 'missing'; } };
const fingerprints = () => Object.fromEntries(TOOLS.map((f) => [basename(f), fingerprint(f)]));

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

function checkPage(target, widths, list, preset, landing) {
  const out = join(DIR, `page-${Buffer.from(target).toString('base64url').slice(-24)}.json`);
  rmSync(out, { force: true });
  const r = spawnSync(process.execPath, [CHECK_PAGE, target, '--widths', widths, '--preset', preset || 'quiet', ...(landing ? ['--landing'] : []), '--json', out, '--quiet'], { encoding: 'utf8', timeout: 300000 });
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
  return { target, score: rep.overall, open, skipped, partly: Array.isArray(rep.notMeasured) ? rep.notMeasured : [] };
}
// safe by default: the probe holds back every write its presses try to send, unless the gate was armed with --allow-writes
function probe(target, list, allowWrites) {
  const out = join(DIR, `probe-${Buffer.from(target).toString('base64url').slice(-24)}.json`);
  rmSync(out, { force: true });
  const r = spawnSync(process.execPath, [PROBE, target, '--json', out, '--quiet', ...(allowWrites ? ['--allow-writes'] : [])], { encoding: 'utf8', timeout: 480000 });
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
  const held = (rep.heldBack ?? []).map((w) => `${w.method} ${String(w.url).replace(/^https?:\/\/[^/]+/, '')}`);
  return { target, open, skipped, held };
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

// the copy findings that hold a landing page open at medium: each is a device past its budget or the page talking
// about itself (antheo-writing references/marketing.md)
const MARKETING_BLOCKS = new Set(['two-fragment', 'contrast-frame', 'negation-run', 'stat-strip', 'process-talk', 'virtue-word']);
function copyLint(paths, list, marketing) {
  if (!paths.length) return null;
  const out = join(DIR, 'copy.json');
  rmSync(out, { force: true });
  // a landing page also blocks on the marketing devices past their budget (medium), not only on high findings
  const r = spawnSync(process.execPath, [COPY_LINT, ...paths, '--json', out, '--min-severity', marketing ? 'medium' : 'high', ...(marketing ? ['--marketing'] : [])], { encoding: 'utf8', timeout: 120000 });
  const { rep, error } = fresh(r, out, 'copy-lint');
  if (error) return { error };
  // a wrong --copy path reads nothing and finds nothing: that is not clean copy
  if (!rep.files) return { error: `copy-lint read no files in ${paths.map(short).join(', ')}` };
  const all = Array.isArray(rep) ? rep : rep.findings ?? [];
  const open = [];
  const skipped = [];
  for (const f of all) {
    if (f.severity !== 'high' && !(marketing && f.severity === 'medium' && MARKETING_BLOCKS.has(f.rule))) continue;
    const w = waived(list, f.rule ?? '', f.file ?? '');
    if (w) skipped.push(`${f.rule} (waived: ${w.reason})`);
    else open.push(`${f.severity.toUpperCase()} ${f.rule} ${short(f.file ?? '')}:${f.line ?? ''} "${String(f.text ?? '').slice(0, 60)}"${f.fix ? `\n    fix: ${f.fix}` : ''}`);
  }
  const partly = (rep.skipped ?? []).map((x) => `copy-lint skipped ${x}`);
  return { open, skipped, partly };
}

/* honest checks: the page must not test for the checker, and the checkers must be the ones that were armed */
const SNIFF = [
  [/navigator\s*(?:\?\.|\.)\s*webdriver|navigator\s*(?:\?\.)?\s*\[\s*['"`]webdriver['"`]\s*\]/, 'reads navigator.webdriver'],
  [/HeadlessChrome/, 'looks for a headless browser in the user agent'],
  [/userAgent[^;\n]{0,80}headless|headless[^;\n]{0,80}userAgent/i, 'looks for a headless browser in the user agent'],
  [/__playwright|__pwInitScripts|__puppeteer/, 'looks for the automation driver'],
  [/data-antheo-(?:nohover|fc)\b/, "reads the checker's own markers"],
];
const SOURCE = /\.(?:html?|jsx?|tsx?|mjs|cjs|vue|svelte|astro)$/i;
const SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.antheo', '.svelte-kit', '.turbo', '.cache']);
function sniff(paths, list) {
  const open = [];
  const skipped = [];
  const files = [];
  const walk = (p) => {
    let st; try { st = statSync(p); } catch { return; }
    if (st.isDirectory()) { for (const e of readdirSync(p)) if (!SKIP.has(e)) walk(join(p, e)); }
    // tests and their fixtures drive the browser on purpose; the page they test is what is read
    else if (SOURCE.test(p) && !/[\\/](?:tests?|e2e|__tests__)[\\/]|\.(?:spec|test)\.[a-z]+$/i.test(p) && files.length < 4000 && !files.includes(resolve(p))) files.push(resolve(p));
  };
  for (const p of paths) walk(p);
  for (const f of files) {
    let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
    for (const [re, what] of SNIFF) {
      const m = re.exec(src);
      if (!m) continue;
      const line = src.slice(0, m.index).split('\n').length;
      const rule = `the page tests for the checker: it ${what}`;
      const w = waived(list, rule, f);
      if (w) skipped.push(`${rule} (waived: ${w.reason})`);
      else open.push(`HIGH ${rule} ${short(f)}:${line}\n    fix: remove it. A page that behaves differently when it is being checked makes every result a lie; if the code has another job (bot filtering in analytics), waive it with that reason`);
      break;
    }
  }
  return { open, skipped };
}
function toolsChanged(state) {
  if (!state.tools) return []; // armed by an older gate, before fingerprints
  const now = fingerprints();
  return Object.entries(state.tools).filter(([name, was]) => now[name] !== was).map(([name]) => `HIGH a checking tool changed since the gate was armed: ${name}\n    fix: put it back (git checkout or reinstall the skill). If the person changed it on purpose, they arm the gate again; never edit a checker to pass it`);
}

function run(state) {
  const list = waivers();
  const pages = state.targets.map((t) => checkPage(t, state.widths, list, state.preset, state.landing));
  const probes = state.probe ? state.targets.map((t) => probe(t, list, state.allowWrites === true)) : [];
  const copy = copyLint(state.copy, list, state.landing);
  const motion = motionScan(state.copy, list);
  // the honest-check findings: page source read for checker tests (the copy paths, and the armed targets that are files)
  const honest = sniff([...state.copy, ...state.targets.filter((t) => !/^https?:/.test(t))], list);
  const integrity = toolsChanged(state);
  const tooMany = list.length > MAX_WAIVERS ? [`HIGH ${list.length} waivers in .antheo/waivers.json; at most ${MAX_WAIVERS}\n    fix: fix the findings instead, or stop and tell the person what is still open; a waiver is for a checker that is wrong, not for work left undone`] : [];
  const errors = [...(motion?.error ? [`motion: ${motion.error}`] : []), ...pages.filter((p) => p.error).map((p) => `${short(p.target)}: ${p.error}`), ...probes.filter((p) => p.error).map((p) => `${short(p.target)}: ${p.error}`), ...(copy?.error ? [`copy: ${copy.error}`] : [])];
  const open = [
    ...pages.flatMap((p) => (p.open ?? []).map((o) => `${short(p.target)}\n  ${o}`)),
    ...probes.flatMap((p) => (p.open ?? []).map((o) => `${short(p.target)} (access probe)\n  ${o}`)),
    ...(copy?.open ?? []).map((o) => `copy\n  ${o}`),
    ...(motion?.open ?? []).map((o) => `motion\n  ${o}`),
    ...evidence(state).map((o) => `evidence\n  ${o}`),
    ...[...integrity, ...tooMany, ...honest.open].map((o) => `honest checks\n  ${o}`),
  ];
  const skipped = [...pages.flatMap((p) => p.skipped ?? []), ...probes.flatMap((p) => p.skipped ?? []), ...(copy?.skipped ?? []), ...(motion?.skipped ?? []), ...honest.skipped];
  const held = [...new Set(probes.flatMap((p) => p.held ?? []))];
  // what could not be read: a pass with any of this is a partial pass
  const partly = [...new Set([...pages.flatMap((p) => (p.partly ?? []).map((x) => `${short(p.target)}: ${x}`)), ...(copy?.partly ?? [])])];
  return { pages, errors, open, skipped, held, partly };
}

function report(state, r) {
  const lines = [];
  for (const p of r.pages) if (!p.error) lines.push(`  ${short(p.target)}: score ${p.score}/100, ${p.open.length} blocking`);
  if (state.probe) lines.push(`  access probe: ${r.open.filter((o) => o.includes('(access probe)')).length} blocking`);
  if (r.held?.length) lines.push(`  writes the probe held back (nothing was sent): ${r.held.slice(0, 6).join(', ')}${r.held.length > 6 ? `, and ${r.held.length - 6} more` : ''}`);
  if (state.refs?.length) lines.push(`  evidence: ${r.open.some((o) => o.startsWith('evidence')) ? 'missing' : 'present'} for ${state.refs.length} reference(s)`);
  if (r.skipped.length) lines.push(`  waived: ${r.skipped.join('; ')}`);
  if (r.partly?.length) lines.push('', 'Not measured (look at these yourself, or say they are unverified):', ...r.partly.map((p) => `  ${p}`));
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
  let allowWrites = false;
  let landing = false;
  let maxGiven = false;
  const refs = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--copy') { while (rest[i + 1] && !rest[i + 1].startsWith('--')) copy.push(resolve(rest[++i])); }
    else if (rest[i] === '--widths') widths = rest[++i];
    else if (rest[i] === '--preset') { const p = rest[++i]; preset = ['none', 'studio', 'editorial', 'playful'].includes(p) ? p : 'quiet'; }
    else if (rest[i] === '--max') { max = Number(rest[++i]) || 3; maxGiven = true; }
    else if (rest[i] === '--no-probe') probeOn = false;
    else if (rest[i] === '--allow-writes') allowWrites = true;
    else if (rest[i] === '--landing') landing = true;
    else if (rest[i] === '--ref') { while (rest[i + 1] && !rest[i + 1].startsWith('--')) refs.push(resolve(rest[++i])); }
    else if (!rest[i].startsWith('--')) targets.push(/^https?:/.test(rest[i]) ? rest[i] : resolve(rest[i]));
  }
  if (!targets.length) { say('arm needs at least one page: a dev-server URL or an HTML file.'); process.exit(2); }
  // each further reference is another thing to get right: one more round for each, six at most
  if (!maxGiven && refs.length > 1) max = Math.min(6, max + refs.length - 1);
  const missingRef = refs.find((r) => !existsSync(r));
  if (missingRef) { say(`No reference image at ${missingRef}.`); process.exit(2); }
  const now = new Date().toISOString();
  // the fingerprints are taken once, here; rearm keeps them, so a checker edited mid-work stays a finding
  save({ armed: true, targets, copy, widths, max, preset, probe: probeOn, allowWrites, landing, refs, tools: fingerprints(), round: 0, at: now, firstAt: now });
  say(`GATE: ARMED for ${targets.length} ${landing ? 'landing ' : ''}page(s)${copy.length ? ` and ${copy.length} copy path(s)` : ''}${refs.length ? `, ${refs.length} reference(s)` : ''}, up to ${max} rounds${probeOn ? '' : ', without the access probe'}${probeOn && allowWrites ? ', and the probe may send writes (--allow-writes)' : ''}.`,'Run `node gate.mjs check` before saying the work is done (a Claude Code Stop hook runs it for you).');
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
  say(`GATE: armed, round ${s.round} of ${s.max}`, `pages: ${s.targets.join(', ')}${s.landing ? ' (landing)' : ''}`, `copy: ${s.copy.join(', ') || 'none'}`, `access probe: ${!s.probe ? 'off' : s.allowWrites === true ? 'on, and its presses may send writes (--allow-writes)' : 'on, writes held back'}`, `waivers: ${readJson(WAIVERS, []).length}`);
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
    if (s?.result === 'pass') { say(`GATE: not armed; the last run passed${s.partly?.length ? ', partly measured' : ''}. Rearm after any change.`); process.exit(0); }
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
    // nothing blocking, but something went unread: it is a pass on what was measured, and it says so
    s.partly = r.partly ?? [];
    say(s.partly.length ? `GATE: PASS, PARTLY MEASURED (${s.partly.length} thing${s.partly.length > 1 ? 's' : ''} the checks could not read; tell the person they are unverified)` : 'GATE: PASS', report(s, r), '', 'The gate has disarmed itself. If you change the page again, run `node gate.mjs rearm` and check again before saying done.', 'A PASS means the automated checks found nothing blocking. It is not a full release review: what the checks cannot see (taste, real devices, screen readers) stays unverified until someone looks.');
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
say('usage: node gate.mjs arm <page>... [--copy <paths>] [--widths 390,1280] [--max 3] [--preset none|studio|editorial|playful] [--ref <images>] [--no-probe] [--allow-writes] [--landing] | check | hook | status | rearm | disarm');
process.exit(cmd === 'help' ? 0 : 2);
