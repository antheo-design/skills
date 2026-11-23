#!/usr/bin/env node
/**
 * scan-motion.mjs: list every place a codebase animates, and flag the ones that break antheo-motion's rules.
 *
 *   node scan-motion.mjs src                      a summary and the flagged lines
 *   node scan-motion.mjs src --all                every animated line, flagged or not
 *   node scan-motion.mjs src --json motion.json   the full inventory as JSON
 *   node scan-motion.mjs src --strict             exit 1 when any high finding exists (for CI)
 *   node scan-motion.mjs src --top 5              a quick cleanup: only the five fixes that matter most, worst first
 *
 * Reads CSS, SCSS, JS, TS, JSX, TSX, Vue, Svelte, HTML and MDX. Finds CSS transitions, animations and keyframes,
 * Tailwind motion classes, element.animate(), and Motion / Framer props. No dependencies.
 *
 * Reduced motion: every @media (prefers-reduced-motion: reduce) block is read and named as one of two things, with
 * its file and line. "keeps": a fade or a colour change is left in place (a transition or animation on opacity or
 * colour, a duration shortened but not zeroed, or only transforms and distances set to nothing). "removes": motion is
 * switched off with nothing in its place. A blanket removal (a rule on * that sets transition: none, or a transition
 * duration of 0 or about 1ms) is a high finding, R2: reduced motion turns travel into a short fade, it does not
 * remove the feedback. A removal on named selectors only is a "check". In the JSON: reduced: [{ file, line, kind,
 * blanket, why }]. Tailwind's motion-reduce: classes and JS guards are still only counted as a guard, not read.
 *
 * It reads source text, so it finds candidates, not verdicts: every flag is checked by eye before it is reported.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('usage: node scan-motion.mjs <folder> [--all] [--top 5] [--json motion.json] [--strict]\n  (no flag)  a summary and the flagged lines\n  --all      every animated line, flagged or not\n  --top n    a quick cleanup: only the n fixes that matter most, worst first\n  --json f   the full inventory as JSON\n  --strict   exit 1 when any high finding exists (for CI)');
  process.exit(0);
}
// the folder is the first argument that is not a flag or a flag's value
const VALUE_FLAGS = ['--json', '--top'];
const root = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1])) ?? '.';
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const SHOW_ALL = args.includes('--all');
// --top n: the n flagged lines that matter most (high outweighs medium outweighs check), for a quick cleanup
const TOP = Number(opt('--top')) || 0;
const STRICT = args.includes('--strict');
const JSON_OUT = opt('--json');

const EXTS = new Set(['.css', '.scss', '.js', '.mjs', '.ts', '.jsx', '.tsx', '.vue', '.svelte', '.html', '.mdx']);
const SKIP = new Set(['node_modules', '.next', 'dist', 'build', 'out', '.git', 'coverage', '.turbo', 'public']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name)) && s.size < 1_500_000) out.push(p);
  }
  return out;
}

// What counts as motion on a line
const MOTION = [
  /\btransition(-property|-duration|-timing-function|-delay)?\s*:/,
  /\banimation(-name|-duration|-timing-function)?\s*:/,
  /@keyframes\s/,
  /\.animate\(\s*\[/,
  /\b(animate|initial|exit|whileHover|whileTap|whileInView|layout)\s*=\s*\{/,
  /\btransition\s*=\s*\{\{/,
  /(^|["'`\s])(motion-safe:|hover:|group-hover:|data-\[[^\]]+\]:)?(transition(-all|-colors|-opacity|-transform|-shadow|-\[[^\]]+\])?|duration-\d+|animate-[\w-]+|ease-(in|out|in-out|linear|\[[^\]]+\]))(?=["'`\s])/,
];

const REDUCE = /prefers-reduced-motion|motion-reduce:|motion-safe:|useReducedMotion|reducedMotion|MotionConfig/;

// Rules: id, severity, test(line) -> message | null
const RULES = [
  ['M1', 'high', (l) => /transition\s*:\s*all\b|transition-property\s*:\s*all\b|(^|["'`\s])transition-all(?=["'`\s])/.test(l)
    || /transition\s*:\s*[\d.]+m?s\b/.test(l) ? 'transition on `all`: name the properties that change' : null],
  ['M2', 'high', (l) => /scale\(\s*0\s*\)|\bscale\s*:\s*0\s*[;,}]|(^|["'`\s])scale-0(?=["'`\s])|scale\s*:\s*0\s*\}/.test(l)
    ? 'grows from scale(0): start from 0.96 (0.97 menus, 0.98 tooltips) with a fade' : null],
  ['M3', 'high', (l) => /transition(-property)?\s*:[^;]*\b(width|height|top|left|right|bottom|margin[\w-]*|padding[\w-]*)\b/.test(l)
    || /transition-\[(width|height|top|left|margin|padding)/.test(l)
    || /animate\s*=\s*\{\{[^}]*\b(width|height|top|left)\s*:/.test(l)
    ? 'animates a layout property: use transform, or grid-template-rows for a height reveal' : null],
  ['M4', 'medium', (l) => {
    const ms = durations(l).filter((d) => d > 300);
    if (!ms.length) return null;
    if (/spin|pulse|shimmer|skeleton|loader|marquee|infinite|progress/i.test(l)) return null;   // loops and progress run as long as they need
    if (/view-transition|route|page/i.test(l)) return ms.some((d) => d > 400) ? `${Math.max(...ms)}ms: pages stay at or under 400ms` : null;
    return `${Math.max(...ms)}ms: interface motion stays at or under 300ms`;
  }],
  ['M5', 'medium', (l) => /\bease-in\b(?!-out)|cubic-bezier\(\s*0\.55,\s*0,\s*1,\s*0\.45\s*\)|(^|["'`\s])ease-in(?=["'`\s])/.test(l)
    ? 'ease-in: only for something thrown away for good; arrivals take --ease-out' : null],
  ['M6', 'medium', (l) => /transition(-property)?\s*:[^;]*box-shadow|(^|["'`\s])transition-shadow(?=["'`\s])/.test(l)
    ? 'animates box-shadow: fade a shadow on a pseudo-element instead' : null],
  ['M7', 'medium', (l) => /(hover|focus)[^{]*\{[^}]*animation\s*:|hover:animate-/.test(l)
    ? 'keyframes on an interactive state: use a transition, which reverses mid-flight' : null],
  ['M8', 'check', (l) => /will-change\s*:/.test(l) ? 'will-change: keep only where a profile asked for it' : null],
  ['M9', 'check', (l) => /transition[^;]*\blinear\b|(^|["'`\s])ease-linear(?=["'`\s])/.test(l)
    && !/spin|progress|scroll|shimmer|marquee|loader/i.test(l) ? 'linear on interface motion: linear is for spinners, progress and scroll' : null],
  ['M10', 'check', (l) => /transition-delay\s*:\s*[1-9]|(^|["'`\s])delay-\d+(?=["'`\s])/.test(l)
    ? 'a delay: never delay a close or a hover-out' : null],
];

function durations(line) {
  const out = [];
  for (const m of line.matchAll(/(?<![\w-])(\d*\.?\d+)(ms|s)\b/g)) out.push(m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]));
  for (const m of line.matchAll(/(?:^|["'`\s])duration-(\d+)(?=["'`\s])/g)) out.push(+m[1]);
  for (const m of line.matchAll(/duration\s*:\s*(\d*\.?\d+)\b(?!\s*(ms|s))/g)) { const v = parseFloat(m[1]); out.push(v < 10 ? v * 1000 : v); }
  return out;
}
const curves = (line) => [...line.matchAll(/cubic-bezier\([^)]*\)|\bease(-in-out|-in|-out)?\b|\blinear\b|var\(--[\w-]*(?:ease|out|spring)[\w-]*\)/g)].map((m) => m[0].replace(/\s+/g, ''));

/* What a reduced-motion block does. The block's rules are read one by one: which selector, and whether it stops
   transitions, stops animations, or leaves a fade behind. */
const SHORT = String.raw`(?:0(?:\.0+)?(?:m?s)?|0?\.\d+ms|1ms|0?\.00\d*s)`; // 0, 0s, 0.01ms, 1ms, 0.001s: gone to the eye
const STOPS_TRANSITION = new RegExp(String.raw`\btransition\s*:\s*none\b|\btransition-property\s*:\s*none\b|\btransition(?:-duration)?\s*:\s*${SHORT}\s*(?:!important)?\s*(?:;|$)`, 'i');
const STOPS_ANIMATION = new RegExp(String.raw`\banimation(?:-name)?\s*:\s*none\b|\banimation(?:-duration)?\s*:\s*${SHORT}\s*(?:!important)?\s*(?:;|$)`, 'i');
const FADE = /\b(opacity|color|background(-color)?|border(-color)?|outline(-color)?|fill|stroke|box-shadow|text-decoration(-color)?)\b/i;
function keepsFade(decls) {
  for (const d of decls.split(';')) {
    const m = d.match(/^\s*([\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (!m) continue;
    const [, prop, value] = m;
    const gone = durations(value).length > 0 && durations(value).every((ms) => ms <= 1);
    if (/^transition(-property)?$/i.test(prop) && !/^none\b/i.test(value) && FADE.test(value) && !gone) return 'a transition on opacity or colour is left in place';
    if (/^animation$/i.test(prop) && !/^none\b/i.test(value) && durations(value).some((ms) => ms > 1)) return 'an animation is kept, shortened';
    if (/^(transition|animation)-duration$/i.test(prop) && durations(value).some((ms) => ms > 1)) return 'durations are shortened, not zeroed';
    if (/^--[\w-]*dur[\w-]*$/i.test(prop) && durations(value).some((ms) => ms > 1)) return 'the duration tokens are shortened, not zeroed';
  }
  return null;
}
function reducedBlocks(text) {
  // comments out, same length, so every index still points at the right line
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const out = [];
  for (const m of clean.matchAll(/@media[^{};]*\(\s*prefers-reduced-motion\s*(?::\s*reduce\s*)?\)[^{};]*\{/g)) {
    let depth = 1, i = m.index + m[0].length;
    while (i < clean.length && depth > 0) { if (clean[i] === '{') depth++; else if (clean[i] === '}') depth--; i++; }
    const body = clean.slice(m.index + m[0].length, i - 1);
    const rules = [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((r) => ({ selector: r[1].replace(/@[^{]*$/, '').trim(), decls: r[2] }));
    const blanket = (sel) => sel.split(',').some((one) => /^(?:(?:html|body|:root)\s+)?\*(?:::?[\w-]+)?$/.test(one.trim()));
    const kept = rules.map((r) => keepsFade(r.decls)).find(Boolean);
    const wipes = rules.filter((r) => blanket(r.selector) && STOPS_TRANSITION.test(r.decls));
    const stops = rules.filter((r) => STOPS_TRANSITION.test(r.decls) || STOPS_ANIMATION.test(r.decls));
    let kind, why, sev = null;
    if (wipes.length && !kept) { kind = 'removes'; sev = 'high'; why = `a blanket rule (${wipes[0].selector.replace(/\s+/g, ' ').slice(0, 40)}) stops every transition${STOPS_ANIMATION.test(wipes[0].decls) ? ' and animation' : ''}, with no fade left`; }
    else if (kept) { kind = 'keeps'; why = kept; if (wipes.length) { sev = 'check'; why += '; a blanket rule in the same block stops transitions, so check the fade survives it'; } }
    else if (rules.some((r) => blanket(r.selector) && STOPS_ANIMATION.test(r.decls))) { kind = 'keeps'; why = 'keyframe animations are cut to an instant on everything; transitions, so fades and colour changes, are untouched'; }
    else if (stops.length) { kind = 'removes'; sev = 'check'; why = `motion is switched off on ${stops.length} rule${stops.length === 1 ? '' : 's'} (${stops.slice(0, 3).map((r) => r.selector.replace(/\s+/g, ' ').slice(0, 30)).join('; ')}) with no fade in its place`; }
    else { kind = 'keeps'; why = 'only movement is set to nothing (transforms, distances, loops); fades and colour are untouched'; }
    out.push({ line: clean.slice(0, m.index).split('\n').length, kind, blanket: wipes.length > 0, why, sev, code: m[0].replace(/\s+/g, ' ').trim().slice(0, 160) });
  }
  return out;
}

const files = walk(root);
const items = [];
const reduced = [];
const filesWithMotion = new Set();
const filesWithGuard = new Set();

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (REDUCE.test(text)) filesWithGuard.add(f);
  for (const b of reducedBlocks(text)) {
    const file = relative(process.cwd(), f).replaceAll('\\', '/');
    reduced.push({ file, line: b.line, kind: b.kind, blanket: b.blanket, why: b.why });
    // a removal is listed with the flagged lines (and read by the gate and --strict) like any other finding
    if (b.sev) items.push({ file, line: b.line, code: b.code, durations: [], curves: [], reduced: true, flags: [{ id: 'R2', sev: b.sev, msg: b.sev === 'high' ? `reduced motion removes all motion (${b.why}): keep a short fade or a colour change, about 150ms, where things moved` : `reduced motion: ${b.why}` }] });
  }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.length > 2000 || !MOTION.some((re) => re.test(line))) return;
    filesWithMotion.add(f);
    const flags = [];
    for (const [id, sev, test] of RULES) { const msg = test(line); if (msg) flags.push({ id, sev, msg }); }
    items.push({ file: relative(process.cwd(), f).replaceAll('\\', '/'), line: i + 1, code: line.trim().slice(0, 160), durations: durations(line), curves: curves(line), flags });
  });
}

const guardAnywhere = filesWithGuard.size > 0;
const unguarded = [...filesWithMotion].filter((f) => !filesWithGuard.has(f)).map((f) => relative(process.cwd(), f).replaceAll('\\', '/'));

const tally = (arr) => Object.entries(arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
const allDur = tally(items.flatMap((x) => x.durations.map((d) => `${Math.round(d)}ms`)));
const allCurve = tally(items.flatMap((x) => x.curves));
const flagged = items.filter((x) => x.flags.length);
const bySev = (s) => flagged.filter((x) => x.flags.some((f) => f.sev === s)).length;

console.log(`Motion in ${root}: ${items.filter((x) => !x.reduced).length} animated lines in ${filesWithMotion.size} of ${files.length} files`);
console.log(`Reduced motion: ${guardAnywhere ? `guarded in ${filesWithGuard.size} files; ${unguarded.length} animated files have no local guard (check a global one covers them)` : 'NO guard anywhere (high)'}`);
if (reduced.length) {
  console.log(`Reduced-motion blocks: ${reduced.length} (${reduced.filter((b) => b.kind === 'keeps').length} keep a fade or a colour change, ${reduced.filter((b) => b.kind === 'removes').length} remove motion)`);
  if (!TOP) for (const b of reduced) console.log(`   ${b.file}:${b.line}  ${b.kind}${b.blanket && b.kind === 'removes' ? ' (blanket)' : ''}: ${b.why}`);
}
console.log(`Durations (${allDur.length} distinct): ${allDur.slice(0, 12).map(([k, n]) => `${k}×${n}`).join('  ')}`);
console.log(`Curves (${allCurve.length} distinct): ${allCurve.slice(0, 10).map(([k, n]) => `${k}×${n}`).join('  ')}`);
console.log(`Flagged lines: ${flagged.length} (high ${bySev('high')}, medium ${bySev('medium')}, check ${bySev('check')})\n`);

// --top: rank every candidate (flagged lines, and reduced-motion blocks that remove all motion) by weight, worst first;
// no guard anywhere is the first fix and takes one of the places
const WEIGHT = { high: 9, medium: 3, check: 1 };
const worth = (x) => x.flags.reduce((n, f) => n + (WEIGHT[f.sev] ?? 0), 0);
const blanket = reduced.filter((b) => b.blanket && b.kind === 'removes').map((b) => ({ file: b.file, line: b.line, code: b.why, flags: [{ sev: 'high', id: 'R2', msg: 'reduced motion removes all feedback: keep a short fade' }] }));
const ranked = [...blanket, ...flagged].sort((a, b) => worth(b) - worth(a));
const places = TOP - (guardAnywhere ? 0 : 1);
const shown = TOP ? ranked.slice(0, Math.max(0, places)) : SHOW_ALL ? items : flagged;
if (TOP) {
  console.log(`The ${shown.length + (guardAnywhere ? 0 : 1)} fixes that matter most, of ${ranked.length + (guardAnywhere ? 0 : 1)}, worst first (without --top for every one):\n`);
  if (!guardAnywhere) console.log('HIGH   R1 no prefers-reduced-motion handling anywhere: travel, scale and blur must become a short fade\n');
}
for (const x of shown) {
  console.log(`${x.file}:${x.line}  ${x.code}`);
  for (const f of x.flags) console.log(`   ${f.sev.toUpperCase().padEnd(6)} ${f.id} ${f.msg}`);
}
if (!TOP && !guardAnywhere) console.log('\nHIGH   R1 no prefers-reduced-motion handling anywhere: travel, scale and blur must become a short fade');

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ root, files: files.length, filesWithMotion: filesWithMotion.size, guardAnywhere, unguarded, reduced, durations: allDur, curves: allCurve, items }, null, 2));
if (STRICT && (bySev('high') > 0 || !guardAnywhere)) process.exit(1);
