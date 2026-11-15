#!/usr/bin/env node
/*
 * Antheo value audit: finds every hard-coded design value in a codebase (colors, font sizes, spacing, radii,
 * shadows, durations, z-indexes, Tailwind arbitrary values), counts them, groups near-duplicates, and (with --tokens) maps each
 * to the nearest token so it can be replaced.
 *
 *   node audit-values.mjs src
 *   node audit-values.mjs src --tokens src/styles/tokens.css
 *   node audit-values.mjs src --tokens tokens.css --json audit.json
 *
 * Without --tokens it is an extraction: the values the app actually uses, most common first, with near-duplicate
 * colors merged: the raw material for a design system. With --tokens it is a migration map: exact matches, close
 * matches (safe to swap), and strays (a design decision is needed). No dependencies; Node 18+.
 *
 * The ratchet (for CI): store an audit once, then compare every later run against it.
 *
 *   node audit-values.mjs src --json design/audit.json                                  (store the baseline)
 *   node audit-values.mjs src --baseline design/audit.json --fail-on-increase           (CI: exit 1 if any kind grew)
 *
 * --baseline prints, per kind, the count of raw values now vs the baseline and the delta. With --fail-on-increase the
 * exit code is 1 when any kind (or the total) went up. Counts only ever need to go down: when they do, store the
 * new audit as the baseline so the gain is locked in. Comparing against the same file you write with --json is
 * safe: the baseline is read before anything is written.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? undefined : argv[i + 1]; };
const baselineFile = flag('baseline');
const root = argv.find((a, i) => !a.startsWith('--') && !['--tokens', '--json', '--baseline'].includes(argv[i - 1]));
if (!root || argv.includes('--help')) {
  console.log('usage: node audit-values.mjs <folder or file> [--tokens tokens.css] [--json out.json] [--baseline audit.json [--fail-on-increase]]');
  process.exit(root ? 0 : 2);
}
const EXT = new Set(['.css', '.scss', '.sass', '.less', '.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte', '.html', '.astro', '.mdx']);
const SKIP = /(^|[\\/])(node_modules|\.next|dist|build|out|coverage|\.git|\.turbo|vendor|public)([\\/]|$)/;
const files = [];
const walk = (p) => {
  if (SKIP.test(p)) return;
  const st = statSync(p);
  if (st.isDirectory()) for (const f of readdirSync(p)) walk(join(p, f));
  else if (EXT.has(extname(p)) && st.size < 600_000 && !/\.(min|d)\.(js|ts)$/.test(p) && !/tokens?\.(css|json)$/.test(p)) files.push(p);
};
walk(root);

/* ── color math (OKLab) ─────────────────────────────────────────────────────────────────────────────────────────── */
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function toLab([r, g, b]) {
  [r, g, b] = [r, g, b].map((v) => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 100; // ~1 = barely visible, ~2 to 3 = noticeable
function parseColor(raw) {
  const s = raw.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean); const v = p.slice(0, 3).map((x) => (x.endsWith('%') ? parseFloat(x) * 2.55 : parseFloat(x))); return { rgb: v, a: p[3] ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1 }; }
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean); const h = parseFloat(p[0]) / 360, sa = parseFloat(p[1]) / 100, l = parseFloat(p[2]) / 100;
    const f = (n) => { const k = (n + h * 12) % 12; const a = sa * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return { rgb: [f(0), f(8), f(4)], a: p[3] ? parseFloat(p[3]) : 1 };
  }
  return null; // oklch() and named colors are left as written
}

/* ── collect ────────────────────────────────────────────────────────────────────────────────────────────────────── */
const KINDS = {
  color: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/g,
  size: /\bfont-size\s*:\s*([\d.]+(?:px|rem|em))|\btext-\[([\d.]+(?:px|rem))\]/g,
  space: /\b(?:margin|padding|gap|row-gap|column-gap|inset|top|left|right|bottom)(?:-[a-z]+)?\s*:\s*([^;}{]+)|\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|top|left|right|bottom|inset)-\[([\d.]+(?:px|rem))\]/g,
  radius: /\bborder(?:-[a-z]+)?-radius\s*:\s*([^;}{]+)|\brounded(?:-[a-z]+)?-\[([\d.]+(?:px|rem))\]/g,
  shadow: /\bbox-shadow\s*:\s*([^;}{]+)|\bshadow-\[([^\]]+)\]/g,
  duration: /\b(?:transition|animation)(?:-duration)?\s*:\s*[^;}{]*?(\d+(?:\.\d+)?m?s)\b|\bduration-\[(\d+m?s)\]/g,
  zindex: /\bz-index\s*:\s*(-?\d+)|\bz-\[(-?\d+)\]/g,
};
const found = Object.fromEntries(Object.keys(KINDS).map((k) => [k, new Map()]));
const note = (kind, value, file, line) => {
  const v = value.trim().replace(/\s+/g, ' ');
  if (!v || /var\(|calc\(|inherit|initial|unset|auto|none|^0(px)?$|currentcolor|transparent/i.test(v)) return;
  if (!found[kind].has(v)) found[kind].set(v, { count: 0, where: [] });
  const e = found[kind].get(v); e.count++; if (e.where.length < 3) e.where.push(`${relative(process.cwd(), file)}:${line}`);
};
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((text, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(text) || /(?:url|src|href)\s*[:=(]/i.test(text) && /#[0-9a-f]{3,8}/i.test(text) && !/color|background|fill|stroke|border/i.test(text)) return;
    for (const [kind, re] of Object.entries(KINDS)) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        if (kind === 'color') { if (/&#|#[0-9a-f]{3,8}[g-z]/i.test(text.slice(m.index - 2, m.index + m[0].length + 1))) continue; note(kind, m[0], file, i + 1); }
        else { const v = m[1] ?? m[2]; if (!v) continue; if (kind === 'space') for (const part of v.split(/\s+/)) { if (/^-?[\d.]+(px|rem|em)$/.test(part)) note(kind, part, file, i + 1); } else note(kind, v, file, i + 1); }
      }
    }
  });
}

/* ── tokens ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const tokens = { color: [], px: [] };
const tokenFile = flag('tokens');
if (tokenFile) {
  const css = readFileSync(tokenFile, 'utf8').split(/@media \(prefers-color-scheme: dark\)|:root\[data-theme=.dark.\]/)[0]; // light theme only
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    const [name, value] = [m[1], m[2].trim()];
    const c = parseColor(value);
    if (c) tokens.color.push({ name, value, lab: toLab(c.rgb), a: c.a });
    const px = value.match(/^([\d.]+)(px|rem)$/) || (value.match(/\/\*\s*([\d.]+)px\s*\*\//) && [null, value.match(/\/\*\s*([\d.]+)px/)[1], 'px']);
    if (px) tokens.px.push({ name, px: px[2] === 'rem' ? parseFloat(px[1]) * 16 : parseFloat(px[1]) });
  }
}
const toPx = (v) => { const m = v.match(/^(-?[\d.]+)(px|rem|em)$/); return m ? parseFloat(m[1]) * (m[2] === 'px' ? 1 : 16) : null; };

/* ── report ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const report = { root, files: files.length, tokens: tokenFile ?? null, kinds: {} };
const sorted = (map) => [...map.entries()].sort((a, b) => b[1].count - a[1].count);

// colors: merge near-duplicates (dE < 2) into groups led by the most used value
const colorGroups = [];
for (const [value, e] of sorted(found.color)) {
  const c = parseColor(value);
  if (!c) { colorGroups.push({ lead: value, members: [value], count: e.count, where: e.where }); continue; }
  const lab = toLab(c.rgb);
  const g = colorGroups.find((x) => x.lab && x.a === c.a && dE(x.lab, lab) < 2);
  if (g) { g.members.push(value); g.count += e.count; } else colorGroups.push({ lead: value, lab, a: c.a, members: [value], count: e.count, where: e.where });
}
for (const g of colorGroups) {
  if (!g.lab || !tokens.color.length) continue;
  const best = tokens.color.filter((t) => Math.abs(t.a - g.a) < 0.05).map((t) => ({ t, d: dE(t.lab, g.lab) })).sort((a, b) => a.d - b.d)[0];
  if (best) g.map = { token: `--${best.t.name}`, distance: +best.d.toFixed(2), verdict: best.d < 0.5 ? 'exact' : best.d <= 2 ? 'close' : 'stray' };
}
report.kinds.color = colorGroups.map(({ lab, ...g }) => g);
for (const kind of ['size', 'space', 'radius', 'duration', 'zindex', 'shadow']) {
  report.kinds[kind] = sorted(found[kind]).map(([value, e]) => {
    const px = toPx(value);
    let map;
    if (px !== null && tokens.px.length && ['size', 'space', 'radius'].includes(kind)) {
      const pool = tokens.px.filter((t) => (kind === 'size' ? /^text-/.test(t.name) : kind === 'radius' ? /^radius-/.test(t.name) : /^(space|gap|pad)-/.test(t.name)));
      const best = pool.map((t) => ({ t, d: Math.abs(t.px - px) })).sort((a, b) => a.d - b.d)[0];
      if (best) map = { token: `--${best.t.name}`, distance: best.d, verdict: best.d === 0 ? 'exact' : best.d <= 2 ? 'close' : 'stray' };
    }
    return { value, count: e.count, where: e.where, map };
  });
}

const total = Object.values(report.kinds).reduce((s, list) => s + list.reduce((n, x) => n + x.count, 0), 0);
console.log(`\nAntheo value audit: ${files.length} files under ${root}${tokenFile ? `, mapped to ${tokenFile}` : ''}`);
console.log(`${total} hard-coded values in use\n`);
const show = (kind, label, list, fmt) => {
  if (!list.length) return;
  console.log(`${label}: ${list.length} distinct`);
  for (const x of list.slice(0, 12)) console.log(`  ${String(x.count).padStart(4)}×  ${fmt(x)}${x.map ? `  →  ${x.map.token} (${x.map.verdict}${x.map.distance ? `, off by ${x.map.distance}` : ''})` : ''}`);
  if (list.length > 12) console.log(`  … and ${list.length - 12} more`);
  console.log('');
};
show('color', 'Colors (near-duplicates merged: ΔE under 2 is the same color to the eye)', report.kinds.color, (g) => `${g.lead}${g.members.length > 1 ? `  (+${g.members.length - 1} near-duplicates: ${g.members.slice(1, 4).join(', ')})` : ''}`);
show('size', 'Font sizes', report.kinds.size, (x) => x.value);
show('space', 'Spacing', report.kinds.space, (x) => x.value);
show('radius', 'Corner radii', report.kinds.radius, (x) => x.value);
show('shadow', 'Shadows', report.kinds.shadow, (x) => x.value.slice(0, 70));
show('duration', 'Durations', report.kinds.duration, (x) => x.value);
show('zindex', 'z-index', report.kinds.zindex, (x) => x.value);

// the verdict: how far the code is from one system
const colorCount = report.kinds.color.length, sizeCount = report.kinds.size.length, radiusCount = report.kinds.radius.length;
const drift = [];
if (colorCount > 24) drift.push(`${colorCount} distinct colors (a system needs about 12 to 20 including status colors)`);
if (report.kinds.color.some((g) => g.members.length > 1)) drift.push(`${report.kinds.color.filter((g) => g.members.length > 1).length} colors exist in near-duplicate versions`);
if (sizeCount > 9) drift.push(`${sizeCount} font sizes (a scale has 6 to 9)`);
if (radiusCount > 5) drift.push(`${radiusCount} corner radii (a scale has 4 to 5)`);
if (report.kinds.duration.length > 5) drift.push(`${report.kinds.duration.length} durations (five tokens cover everything)`);
if (report.kinds.zindex.length > 6) drift.push(`${report.kinds.zindex.length} z-index values (use 5 to 6 named layers)`);
if (tokenFile) {
  const all = Object.values(report.kinds).flat().filter((x) => x.map);
  const n = (v) => all.filter((x) => x.map.verdict === v).reduce((s, x) => s + x.count, 0);
  console.log(`Migration: ${n('exact')} uses can be swapped for a token as is, ${n('close')} are within a hair of one (swap and check), ${n('stray')} match nothing (decide: new token or change the design).`);
}
console.log(drift.length ? `Drift: ${drift.join('; ')}.` : 'Drift: low; the values already behave like a system.');
report.drift = drift;
report.totals = Object.fromEntries(Object.entries(report.kinds).map(([k, list]) => [k, list.reduce((n, x) => n + x.count, 0)]));
report.totals.all = total;

// the ratchet: compare per-kind counts with the stored baseline
let grew = false;
if (baselineFile) {
  if (!existsSync(baselineFile)) { console.error(`baseline not found: ${baselineFile}`); process.exit(2); }
  const base = JSON.parse(readFileSync(baselineFile, 'utf8'));
  const baseTotals = base.totals ?? Object.fromEntries(Object.entries(base.kinds ?? {}).map(([k, list]) => [k, list.reduce((n, x) => n + x.count, 0)]));
  baseTotals.all ??= Object.entries(baseTotals).reduce((n, [k, v]) => (k === 'all' ? n : n + v), 0);
  console.log(`
Ratchet against ${baselineFile}`);
  console.log(`  ${'kind'.padEnd(10)} ${'baseline'.padStart(8)} ${'now'.padStart(6)} ${'delta'.padStart(6)}`);
  for (const k of [...Object.keys(report.kinds), 'all']) {
    const now = report.totals[k], was = baseTotals[k] ?? 0, d = now - was;
    if (d > 0) grew = true;
    console.log(`  ${k.padEnd(10)} ${String(was).padStart(8)} ${String(now).padStart(6)} ${((d > 0 ? '+' : '') + d).padStart(6)}${d > 0 ? '  UP' : d < 0 ? '  down' : ''}`);
  }
  console.log(grew ? 'Raw values went up. Use a token for the new ones, then run again.' : 'No kind went up. If any went down, store this audit as the new baseline (--json).');
}
const json = flag('json');
if (json) writeFileSync(json, JSON.stringify(report, null, 2));
if (baselineFile && argv.includes('--fail-on-increase') && grew) process.exit(1);
