#!/usr/bin/env node
/*
 * The style block, rebranded: antheo-build's quiet.css with your accent, your neutral's temperature and your
 * typeface, every text pair measured. Sizes, weights, corners, shadows and heights stay as designed.
 *
 *   node block.mjs --accent "#c2412d" --out ./src/styles/quiet.css
 *   node block.mjs --accent "#2f6fed" --neutral cool --font "Inter" --x-height 0.546
 *
 * Flags (all optional):
 *   --accent    the one brand colour, any hex. Its hue is kept; lightness is set so text on it passes 4.5:1.
 *   --neutral   warm (hue 80, the default) | cool (hue 255) | a hue number: the lean of every grey
 *   --font      a grotesk with a variable weight axis (or 450 and 550 loaded), e.g. "Inter"
 *   --x-height  that font's x-height ratio, for font-size-adjust (antheo-type/scripts/x-height.mjs measures it).
 *               Without it, font-size-adjust is removed for a font this script doesn't know: a wrong number would
 *               resize the real font.
 *   --out       the file to write (default ./quiet.css)
 * Exit code 1 if a pair still fails. No dependencies: plain Node 18+.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const KNOWN = ['accent', 'neutral', 'font', 'x-height', 'out'];
const args = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
const unknown = Object.keys(args).filter((k) => !KNOWN.includes(k));
if (unknown.length || 'help' in args) {
  if (unknown.length && !('help' in args)) console.error(`unknown flag: ${unknown.map((k) => `--${k}`).join(', ')}`);
  console.log('usage: node block.mjs [--accent "#hex"] [--neutral warm|cool|<hue>] [--font "Family" --x-height 0.53] [--out ./quiet.css]');
  process.exit(unknown.length ? 2 : 0);
}

const here = dirname(fileURLToPath(import.meta.url));
const source = [join(here, '..', '..', 'antheo-build', 'references', 'quiet.css'), join(here, '..', 'references', 'quiet.css')].find((f) => existsSync(f));
if (!source) { console.error('quiet.css not found: this script reads antheo-build/references/quiet.css beside this skill.'); process.exit(2); }
let css = readFileSync(source, 'utf8');

// ── colour maths: OKLCH ⇄ sRGB, WCAG contrast ──
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToOklch(hex) {
  const [r, g, b] = [0, 2, 4].map((i) => toLin(parseInt(hex.replace('#', '').slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
function toRgb([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const inGamut = (lch) => toRgb(lch).every((v) => v >= -0.0005 && v <= 1.0005);
/** Lower chroma only until the colour fits sRGB, so lightness and hue stay put. */
function fit([L, C, H]) {
  if (inGamut([L, C, H])) return [L, C, H];
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 24; i++) (inGamut([L, (lo + hi) / 2, H]) ? (lo = (lo + hi) / 2) : (hi = (lo + hi) / 2));
  return [L, lo, H];
}
const lum = (lch) => { const [r, g, b] = toRgb(fit(lch)).map((v) => Math.min(1, Math.max(0, v))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const fmt = ([L, C, H]) => `oklch(${+L.toFixed(3)} ${+C.toFixed(3)} ${Math.round(H)})`;

// ── the accent ──
const notes = [];
if (args.accent && args.accent !== 'true') {
  if (!/^#?[0-9a-f]{6}$/i.test(args.accent)) { console.error('--accent takes a six-digit hex, e.g. "#c2412d"'); process.exit(2); }
  const brandLch = hexToOklch(args.accent);
  const [, brandC, hue] = brandLch;
  const k = Math.min(1, brandC / 0.12); // a muted brand stays muted
  if (brandC < 0.03) notes.push('the accent is nearly grey, so "on" states will read as ink: fine for a monochrome product, weak as a signal');
  if (Math.min(Math.abs(hue - 27), 360 - Math.abs(hue - 27)) < 20) notes.push(`the accent hue (${Math.round(hue)}°) sits close to danger (27°): never use the accent to mean danger, and pair every error with words`);
  const white = [1, 0, 0];
  const darkInk = [0.17, 0.004, 80];
  const move = (lch, ok, dir) => { let c = fit(lch); for (let i = 0; i < 80 && !ok(c); i++) c = fit([Math.min(1, Math.max(0, c[0] + dir * 0.005)), lch[1], lch[2]]); return c; };
  const light = {};
  // the brand itself when white text on it already passes; otherwise the nearest lightness that does
  light.accent = contrast(white, brandLch) >= 4.5 ? brandLch : move([0.55, 0.12 * k, hue], (c) => contrast(white, c) >= 4.6, -1);
  if (light.accent === brandLch) notes.push(`--accent is your brand colour exactly (${args.accent}); the soft tint and dark values are derived from its hue`);
  light.soft = fit([0.95, 0.035 * k, hue]);
  light.text = move([0.4, 0.09 * k, hue], (c) => contrast(c, light.soft) >= 4.6, -1);
  const dark = {};
  dark.accent = move([0.72, 0.12 * k, hue], (c) => contrast(darkInk, c) >= 4.6, 1);
  dark.soft = fit([0.27, 0.045 * k, hue]);
  dark.text = move([0.84, 0.1 * k, hue], (c) => contrast(c, dark.soft) >= 4.6, 1);
  // a value is dark when it sits in the dark media block or in a [data-theme="dark"] block
  const ranges = [];
  for (const start of [css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf('[data-theme="dark"] {')]) {
    if (start < 0) continue;
    let depth = 0, i = css.indexOf('{', start);
    for (; i < css.length; i++) { if (css[i] === '{') depth++; else if (css[i] === '}' && --depth === 0) break; }
    ranges.push([start, i]);
  }
  const isDark = (at) => ranges.some(([a, z]) => at > a && at < z);
  const set = (name, lightValue, darkValue) => {
    const re = new RegExp(`(--${name}:\\s*)oklch\\([^)]*\\)`, 'g');
    css = css.replace(re, (m, head, at) => head + fmt(isDark(at) ? darkValue : lightValue));
  };
  set('accent', light.accent, dark.accent); set('accent-soft', light.soft, dark.soft); set('accent-text', light.text, dark.text);
}

// ── the neutral's temperature ──
if (args.neutral && args.neutral !== 'true') {
  const hue = args.neutral === 'warm' ? 80 : args.neutral === 'cool' ? 255 : Number(args.neutral);
  if (!Number.isFinite(hue) || hue < 0 || hue > 360) { console.error('--neutral takes warm, cool or a hue from 0 to 360'); process.exit(2); }
  css = css.replace(/(oklch\(\s*[\d.]+\s+0\.00\d\s+)80(\s*[/)])/g, `$1${hue}$2`).replace(/(--ink:\s*[\d.]+\s+[\d.]+\s+)80;/, `$1${hue};`);
}

// ── the typeface ──
const KNOWN_X = { geist: 0.53, inter: 0.546 };
if (args.font && args.font !== 'true') {
  const font = args.font.trim();
  css = css.replace('"Geist", ui-sans-serif', `"${font}", ui-sans-serif`).replace('family=Geist:wght@400..600', `family=${font.replace(/ /g, '+')}:wght@400..600`);
  const x = Number(args['x-height']) || KNOWN_X[font.toLowerCase()];
  if (x) css = css.replace(/font-size-adjust:\s*[\d.]+;/, `font-size-adjust: ${x};`).replace("Geist's x-height is 0.53 of its size", `${font}'s x-height is ${x} of its size`).replace('while\n   Geist loads, a glyph Geist lacks', `while\n   ${font} loads, a glyph ${font} lacks`);
  else {
    css = css.replace(/\s*font-size-adjust:\s*[\d.]+;/, '').replace(/\/\* font-size-adjust:[\s\S]*?\*\/\n/, '');
    notes.push(`font-size-adjust was removed: measure ${font} with antheo-type/scripts/x-height.mjs and run again with --x-height`);
  }
  notes.push(`load ${font} with a weight axis, or exactly 450 and 550, so no weight is faked`);
}

// ── measure every pair people read, light and dark ──
function theme(dark) {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)'));
  const over = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf('/* Phones'));
  const read = (text) => Object.fromEntries([...text.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const vars = { ...read(root), ...(dark ? read(over) : {}) };
  const get = (name) => {
    let v = vars[name];
    for (let i = 0; i < 5 && /^var\(/.test(v ?? ''); i++) v = vars[v.match(/var\((--[a-z0-9-]+)\)/)[1]];
    const m = (v ?? '').match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  };
  return get;
}
const PAIRS = [
  ['--text', '--bg', 4.5], ['--text', '--surface', 4.5], ['--text-2', '--bg', 4.5], ['--text-2', '--surface', 4.5], ['--text-2', '--well', 4.5],
  ['--text-3', '--surface', 3], ['--on-primary', '--primary', 4.5], ['--on-accent', '--accent', 4.5], ['--accent-text', '--accent-soft', 4.5],
  ['--accent', '--surface', 3], ['--danger', '--surface', 4.5], ['--success', '--surface', 4.5], ['--warning', '--surface', 4.5],
];
let failed = 0;
const lines = [];
for (const [label, dark] of [['light', false], ['dark', true]]) {
  const get = theme(dark);
  for (const [fg, bg, min] of PAIRS) {
    const a = get(fg);
    const b = get(bg);
    if (!a || !b) continue;
    const r = contrast(a, b);
    if (r < min) { failed++; lines.push(`  FAIL ${label} ${fg} on ${bg}: ${r.toFixed(2)}:1 (needs ${min}:1)`); }
  }
}

const out = args.out && args.out !== 'true' ? args.out : './quiet.css';
writeFileSync(out, css);
console.log(`wrote ${out}  (from ${source.replace(/\\/g, '/').split('/').slice(-3).join('/')})`);
console.log(failed ? `contrast: ${failed} pair(s) fail\n${lines.join('\n')}` : `contrast: all ${PAIRS.length * 2} pairs pass, light and dark`);
for (const n of notes) console.log(`note: ${n}`);
process.exit(failed ? 1 : 0);
