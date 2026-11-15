#!/usr/bin/env node
/**
 * scan-motion.mjs: list every place a codebase animates, and flag the ones that break antheo-motion's rules.
 *
 *   node scan-motion.mjs src                      a summary and the flagged lines
 *   node scan-motion.mjs src --all                every animated line, flagged or not
 *   node scan-motion.mjs src --json motion.json   the full inventory as JSON
 *   node scan-motion.mjs src --strict             exit 1 when any high finding exists (for CI)
 *
 * Reads CSS, SCSS, JS, TS, JSX, TSX, Vue, Svelte, HTML and MDX. Finds CSS transitions, animations and keyframes,
 * Tailwind motion classes, element.animate(), and Motion / Framer props. No dependencies.
 *
 * It reads source text, so it finds candidates, not verdicts: every flag is checked by eye before it is reported.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--')) ?? '.';
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const SHOW_ALL = args.includes('--all');
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

const files = walk(root);
const items = [];
const filesWithMotion = new Set();
const filesWithGuard = new Set();

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (REDUCE.test(text)) filesWithGuard.add(f);
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

console.log(`Motion in ${root}: ${items.length} animated lines in ${filesWithMotion.size} of ${files.length} files`);
console.log(`Reduced motion: ${guardAnywhere ? `guarded in ${filesWithGuard.size} files; ${unguarded.length} animated files have no local guard (check a global one covers them)` : 'NO guard anywhere (high)'}`);
console.log(`Durations (${allDur.length} distinct): ${allDur.slice(0, 12).map(([k, n]) => `${k}×${n}`).join('  ')}`);
console.log(`Curves (${allCurve.length} distinct): ${allCurve.slice(0, 10).map(([k, n]) => `${k}×${n}`).join('  ')}`);
console.log(`Flagged lines: ${flagged.length} (high ${bySev('high')}, medium ${bySev('medium')}, check ${bySev('check')})\n`);

for (const x of SHOW_ALL ? items : flagged) {
  console.log(`${x.file}:${x.line}  ${x.code}`);
  for (const f of x.flags) console.log(`   ${f.sev.toUpperCase().padEnd(6)} ${f.id} ${f.msg}`);
}
if (!guardAnywhere) console.log('\nHIGH   R1 no prefers-reduced-motion handling anywhere: travel, scale and blur must become a short fade');

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ root, files: files.length, filesWithMotion: filesWithMotion.size, guardAnywhere, unguarded, durations: allDur, curves: allCurve, items }, null, 2));
if (STRICT && (bySev('high') > 0 || !guardAnywhere)) process.exit(1);
