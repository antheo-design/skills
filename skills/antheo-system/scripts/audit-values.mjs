#!/usr/bin/env node
/*
 * Antheo value audit: finds every hard-coded design value in a codebase (colors, font sizes, line heights, spacing,
 * radii, control heights, shadows, durations, z-indexes, Tailwind arbitrary values), counts them, groups close
 * colors, and (with --tokens) maps each to the nearest token so it can be replaced.
 *
 *   node audit-values.mjs src
 *   node audit-values.mjs src --tokens src/styles/tokens.css
 *   node audit-values.mjs src --tokens tokens.css --json audit.json
 *
 * Without --tokens it is an extraction: the values the app actually uses, most common first, with close colors
 * merged: the raw material for a design system. With --tokens it is a migration map: exact matches, close matches
 * (swap and look), and strays (a design decision is needed). No dependencies; Node 18+.
 *
 * One story for every threshold:
 *   Colors are compared by ΔE: the straight-line distance between the two colors in OKLab, times 100 (not CIE76, not
 *   CIEDE2000). Every form is converted first: hex, rgb(), hsl(), hwb(), lab(), lch(), oklab(), oklch(), color() in
 *   srgb, srgb-linear, display-p3 and xyz, and the CSS named colors. A named color is counted where a color is
 *   expected: a declaration of a color-taking property, or an SVG fill or stroke attribute. A form that cannot be
 *   converted (relative colors, color() in other spaces) is counted and reported as "not compared", never dropped.
 *     exact   ΔE under 0.5 and alpha within 0.005: the same color written another way
 *     close   ΔE 2 or under and alpha within 0.02
 *     stray   anything further
 *   Two literals merge into one group when they are close, in the same theme. A literal is mapped to a token by the
 *   same three words.
 *   Lengths (rem and em read at a 16px root): exact at 0px apart; close up to 2px for spacing, radii and heights,
 *   up to 1px for font sizes and line heights; stray beyond that. A radius of 999px or more is "full" and matches
 *   any other full radius. Heights are counted up to 64px: control heights, not layout boxes.
 *
 * Token names read from the --tokens file, by kind: font sizes --text-*, --t-*, --font-size-*; line heights
 * --leading-*, --l-*, --line-height-*; radii --radius-*, --r-*; spacing --space-*, --s-*, --gap-*, --pad-*, --gutter;
 * heights --h-*, --height-*. A token that points at another (var(--s-2)) takes its value. Only unconditional values
 * are read: a value inside @media (pointer: coarse) or a width query is another context, and is left out.
 *
 * Themes: tokens under @media (prefers-color-scheme: dark), [data-theme="dark"] or .dark are the dark values; a token
 * the dark theme does not redefine keeps its light value there. A literal in the source that sits in a dark block, or
 * behind a Tailwind dark: variant, is a dark literal: it merges only with other dark literals and maps against the
 * dark values. The file given with --tokens is never audited itself.
 *
 * The ratchet (for CI): store an audit once, then compare every later run against it.
 *
 *   node audit-values.mjs src --json design/audit.json                                  (store the baseline)
 *   node audit-values.mjs src --baseline design/audit.json --fail-on-increase           (CI: exit 1 if any kind grew)
 *
 * --baseline prints, per kind, the count of raw values now vs the baseline and the delta. With --fail-on-increase the
 * exit code is 1 when any kind (or the total) went up. Counts only ever need to go down: when they do, store the
 * new audit as the baseline so the gain is locked in. Comparing against the same file you write with --json is
 * safe: the baseline is read before anything is written. A baseline stored by an older audit counted fewer color
 * forms and fewer kinds: the run says so, and a kind the baseline does not have is shown as new, not as an increase.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const AUDIT = 2; // what is counted changed in 2: every color form, line heights, control heights
const EXACT = 0.5, CLOSE = 2, ALPHA_EXACT = 0.005, ALPHA_CLOSE = 0.02;
const CLOSE_PX = { size: 1, leading: 1, space: 2, radius: 2, height: 2 };
const MAX_HEIGHT = 64, FULL_RADIUS = 999;

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? undefined : argv[i + 1]; };
const baselineFile = flag('baseline');
const tokenFile = flag('tokens');
const root = argv.find((a, i) => !a.startsWith('--') && !['--tokens', '--json', '--baseline'].includes(argv[i - 1]));
if (!root || argv.includes('--help')) {
  console.log('usage: node audit-values.mjs <folder or file> [--tokens tokens.css] [--json out.json] [--baseline audit.json [--fail-on-increase]]');
  process.exit(root ? 0 : 2);
}
const EXT = new Set(['.css', '.scss', '.sass', '.less', '.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte', '.html', '.astro', '.mdx']);
const SKIP = /(^|[\\/])(node_modules|\.next|dist|build|out|coverage|\.git|\.turbo|vendor|public)([\\/]|$)/;
const tokenPath = tokenFile ? resolve(tokenFile) : null;
const files = [];
const walk = (p) => {
  if (SKIP.test(p)) return;
  const st = statSync(p);
  if (st.isDirectory()) for (const f of readdirSync(p)) walk(join(p, f));
  else if (EXT.has(extname(p)) && st.size < 600_000 && !/\.(min|d)\.(js|ts)$/.test(p) && !/tokens?\.(css|json)$/.test(p) && resolve(p) !== tokenPath) files.push(p);
};
walk(root);

/* ── color math: every form goes to linear sRGB, then to OKLab ──────────────────────────────────────────────────── */
const NAMED = Object.fromEntries(('aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000 '
  + 'blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e coral ff7f50 '
  + 'cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 '
  + 'darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a '
  + 'darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 '
  + 'deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff '
  + 'gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 '
  + 'indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 '
  + 'lightcoral f08080 lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a '
  + 'lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00 '
  + 'limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db '
  + 'mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 '
  + 'mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 '
  + 'orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 '
  + 'peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 '
  + 'saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd '
  + 'slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 '
  + 'turquoise 40e0d0 violet ee82ee wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32').match(/\S+ \S+/g).map((p) => p.split(' ')));
const mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const XYZ_TO_LIN = [[3.2409699419045226, -1.537383177570094, -0.4986107602930034], [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559], [0.05563007969699366, -0.20397695888897652, 1.0569715142428786]];
const D50_TO_D65 = [[0.9554734527042182, -0.023098536874261423, 0.0632593086610217], [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008], [0.012314001688319899, -0.020507696433477912, 1.3303659366080753]];
const P3_TO_XYZ = [[0.4865709486482162, 0.26566769316909306, 0.1982172852343625], [0.2289745640697488, 0.6917385218365064, 0.079286914093745], [0, 0.04511338185890264, 1.043944368900976]];
const lin = (c) => (Math.abs(c) <= 0.04045 ? c / 12.92 : Math.sign(c) * ((Math.abs(c) + 0.055) / 1.055) ** 2.4); // one channel, 0 to 1
function oklab([r, g, b]) { // from linear sRGB
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 100; // under 0.5 exact, 2 or under close
const hslRgb = (h, s, l) => [0, 8, 4].map((n) => { const k = (n + (((h % 360) + 360) % 360) / 30) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); });
function cieLab(L, a, b) { // CIE Lab (D50) to linear sRGB
  const k = 24389 / 27, e = 216 / 24389, fy = (L + 16) / 116, fx = a / 500 + fy, fz = fy - b / 200;
  const xyz = [fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k, L > k * e ? fy ** 3 : L / k, fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k];
  return mul(XYZ_TO_LIN, mul(D50_TO_D65, [xyz[0] * 0.9642956764295677, xyz[1], xyz[2] * 0.8251046025104602]));
}
const SPACES = {
  srgb: (v) => v.map(lin), 'srgb-linear': (v) => v, 'display-p3': (v) => mul(XYZ_TO_LIN, mul(P3_TO_XYZ, v.map(lin))),
  xyz: (v) => mul(XYZ_TO_LIN, v), 'xyz-d65': (v) => mul(XYZ_TO_LIN, v), 'xyz-d50': (v) => mul(XYZ_TO_LIN, mul(D50_TO_D65, v)),
};
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:%|deg|grad|rad|turn)?$/;
const part = (t, whole) => (t === 'none' ? 0 : t.endsWith('%') ? (parseFloat(t) / 100) * whole : parseFloat(t)); // a number, or a percent of `whole`
const hue = (t) => { const n = t === 'none' ? 0 : parseFloat(t); return t.endsWith('grad') ? n * 0.9 : t.endsWith('rad') ? (n * 180) / Math.PI : t.endsWith('turn') ? n * 360 : n; };
// { lab, a } for a color; { lab: null, a, why } for a color this audit cannot convert; null for text that is not a color literal
function parseColor(raw) {
  const s = raw.trim().toLowerCase();
  const rgb255 = (v, a = 1) => ({ lab: oklab(v.map((x) => lin(x / 255))), a });
  if (NAMED[s]) return rgb255([0, 2, 4].map((i) => parseInt(NAMED[s].slice(i, i + 2), 16)));
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (![3, 4, 6, 8].includes(h.length)) return null;
    if (h.length < 6) h = [...h].map((c) => c + c).join('');
    return rgb255([0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1);
  }
  m = s.match(/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\((.*)\)$/);
  if (!m) return null;
  const fn = m[1].replace(/^(rgb|hsl)a$/, '$1');
  if (/^from\s/.test(m[2].trim())) return { lab: null, a: 1, why: 'a relative color' };
  const [main, slash] = m[2].split('/');
  const p = main.trim().split(/[\s,_]+/).filter(Boolean);
  const space = fn === 'color' ? p.shift() : null;
  let alpha = slash?.trim();
  if (alpha === undefined && p.length === 4) alpha = p.pop(); // rgba(r, g, b, a)
  if (p.length !== 3 || ![...p, ...(alpha === undefined ? [] : [alpha])].every((t) => t === 'none' || NUMBER.test(t))) return null; // a call with variables, not a literal
  const a = alpha === undefined ? 1 : Math.max(0, Math.min(1, part(alpha, 1)));
  if (fn === 'rgb') return rgb255(p.map((t) => part(t, 255)), a);
  if (fn === 'hsl') return { lab: oklab(hslRgb(hue(p[0]), parseFloat(p[1]) / 100 || 0, parseFloat(p[2]) / 100 || 0).map(lin)), a };
  if (fn === 'hwb') {
    const w = parseFloat(p[1]) / 100 || 0, b = parseFloat(p[2]) / 100 || 0;
    return { lab: oklab((w + b >= 1 ? [0, 0, 0].map(() => w / (w + b)) : hslRgb(hue(p[0]), 1, 0.5).map((c) => c * (1 - w - b) + w)).map(lin)), a };
  }
  const rad = (hue(p[2]) * Math.PI) / 180;
  if (fn === 'oklab') return { lab: [part(p[0], 1), part(p[1], 0.4), part(p[2], 0.4)], a };
  if (fn === 'oklch') { const c = part(p[1], 0.4); return { lab: [part(p[0], 1), c * Math.cos(rad), c * Math.sin(rad)], a }; }
  if (fn === 'lab') return { lab: oklab(cieLab(part(p[0], 100), part(p[1], 125), part(p[2], 125))), a };
  if (fn === 'lch') { const c = part(p[1], 150); return { lab: oklab(cieLab(part(p[0], 100), c * Math.cos(rad), c * Math.sin(rad))), a }; }
  if (SPACES[space]) return { lab: oklab(SPACES[space](p.map((t) => part(t, 1)))), a };
  return /^(a98-rgb|prophoto-rgb|rec2020)$/.test(space) ? { lab: null, a, why: `color(${space})` } : null;
}

/* ── themes: which part of a stylesheet is dark, and which sits in another context ──────────────────────────────── */
const DARK = /prefers-color-scheme\s*:\s*dark|data-(?:theme|mode|color-scheme)\s*=\s*["']?dark|\.(?:theme-)?dark(?:-mode|-theme)?(?![\w-])/i;
// one state per character: 0 light or unconditional, 1 dark, 2 inside another condition (a width, a pointer, @supports)
function states(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (x) => ' '.repeat(x.length)); // a comment that mentions dark is not a dark block
  const out = new Uint8Array(text.length), stack = [0];
  let prelude = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], top = stack[stack.length - 1];
    out[i] = top;
    if (ch === '{') {
      const p = prelude.replace(/:not\([^)]*\)/g, '');
      const conditional = /@(media|container|supports)\b/.test(p) && !/prefers-color-scheme/.test(p);
      stack.push(top === 2 || conditional ? 2 : DARK.test(p) ? 1 : top);
      prelude = '';
    } else if (ch === '}') { if (stack.length > 1) stack.pop(); prelude = ''; } else if (ch === ';') prelude = '';
    else prelude += ch;
  }
  return out;
}

/* ── collect ────────────────────────────────────────────────────────────────────────────────────────────────────── */
const COLOR = /#[0-9a-fA-F]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/gi;
const COLOR_PROP = /(?:^|[\s;{(,"'`])-{0,2}[a-zA-Z-]*(?:color|background|border|outline|fill|stroke|shadow|caret|decoration)[a-zA-Z-]*\s*:\s*([^;}{]+)/gi;
const COLOR_PROP_JS = /(?:color|background|border|outline|fill|stroke|shadow|caret|decoration)[a-zA-Z]*["']?\s*:\s*(["'`])([^"'`]*)\1(?!\s*\|)/gi;
const SVG_ATTR = /\b(?:fill|stroke|stop-color|stopColor|flood-color|floodColor)\s*=\s*\{?\s*["']([a-zA-Z]+)["']/g;
const WORD = /(?<![\w.$@#-])[a-zA-Z]+(?![\w(.:-])/g;
const KINDS = {
  size: /\bfont-size\s*:\s*([\d.]+(?:px|rem|em))|\btext-\[([\d.]+(?:px|rem))\]/g,
  leading: /(?<![\w-])line-height\s*:\s*([\d.]+(?:px|rem))|\bleading-\[([\d.]+(?:px|rem))\]/g,
  space: /\b(?:margin|padding|gap|row-gap|column-gap|inset|top|left|right|bottom)(?:-[a-z]+)?\s*:\s*([^;}{]+)|\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|top|left|right|bottom|inset)-\[([\d.]+(?:px|rem))\]/g,
  radius: /\bborder(?:-[a-z]+)?-radius\s*:\s*([^;}{]+)|\brounded(?:-[a-z]+)?-\[([\d.]+(?:px|rem))\]/g,
  height: /(?<![\w-])(?:min-)?height\s*:\s*([\d.]+(?:px|rem))|(?<![\w-])(?:min-)?h-\[([\d.]+(?:px|rem))\]/g,
  shadow: /\bbox-shadow\s*:\s*([^;}{]+)|\bshadow-\[([^\]]+)\]/g,
  duration: /\b(?:transition|animation)(?:-duration)?\s*:\s*[^;}{]*?(\d+(?:\.\d+)?m?s)\b|\bduration-\[(\d+m?s)\]/g,
  zindex: /\bz-index\s*:\s*(-?\d+)|\bz-\[(-?\d+)\]/g,
};
const toPx = (v) => { const m = v.match(/^(-?[\d.]+)(px|rem|em)$/); return m ? parseFloat(m[1]) * (m[2] === 'px' ? 1 : 16) : null; };
const found = Object.fromEntries(['color', ...Object.keys(KINDS)].map((k) => [k, new Map()]));
const note = (kind, value, file, line, extra) => {
  const v = value.trim().replace(/\s+/g, ' ');
  if (!v || /var\(|calc\(|inherit|initial|unset|auto|none|^0(px)?$|currentcolor|transparent/i.test(v)) return;
  if (kind === 'height' && !(toPx(v) <= MAX_HEIGHT)) return;
  const key = extra?.dark ? `dark ${v}` : v;
  if (!found[kind].has(key)) found[kind].set(key, { value: v, count: 0, where: [], ...extra });
  const e = found[kind].get(key); e.count++; if (e.where.length < 3) e.where.push(`${relative(process.cwd(), file)}:${line}`);
};
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const state = /dark/i.test(source) ? states(source) : null;
  const script = /\.(tsx?|jsx?|mdx)$/.test(file);
  let offset = 0;
  source.split('\n').forEach((text, i) => {
    const at = offset; offset += text.length + 1;
    if (/^\s*(\/\/|\*|\/\*)/.test(text) || /(?:url|src|href)\s*[:=(]/i.test(text) && /#[0-9a-f]{3,8}/i.test(text) && !/color|background|fill|stroke|border/i.test(text)) return;
    // a literal in a dark block, or behind a Tailwind dark: variant, is a dark literal
    const dark = (col) => state?.[at + col] === 1 || /(?:^|[\s"'`])(?:[\w-]+:)*dark:(?:[\w-]+:)*[\w-]*\[$/.test(text.slice(0, col));
    const color = (raw, col) => { const c = parseColor(raw); if (c) note('color', raw, file, i + 1, { c, dark: dark(col) }); return c; };
    const scan = (str, base) => {
      for (const m of str.matchAll(COLOR)) {
        const col = base + m.index;
        if (m[0][0] === '#') { if (!/&#|#[0-9a-f]{3,8}[g-z]/i.test(text.slice(Math.max(0, col - 2), col + m[0].length + 1))) color(m[0], col); }
        else if (!/var\(|calc\(/.test(m[0]) && !color(m[0], col)) { const open = m[0].indexOf('(') + 1; scan(m[0].slice(open), col + open); } // not a literal: look inside it
      }
    };
    scan(text, 0);
    const words = (str, base) => { for (const w of str.replace(/(?:url|var)\([^)]*\)/g, (x) => ' '.repeat(x.length)).matchAll(WORD)) if (NAMED[w[0].toLowerCase()]) color(w[0].toLowerCase(), base + w.index); };
    if (script) for (const m of text.matchAll(COLOR_PROP_JS)) words(m[2], m.index + m[0].indexOf(m[2]));
    else for (const m of text.matchAll(COLOR_PROP)) words(m[1], m.index + m[0].length - m[1].length);
    for (const m of text.matchAll(SVG_ATTR)) if (NAMED[m[1].toLowerCase()]) color(m[1].toLowerCase(), m.index);
    for (const [kind, re] of Object.entries(KINDS)) {
      for (const m of text.matchAll(re)) {
        const v = m[1] ?? m[2]; if (!v) continue;
        if (kind === 'space') { for (const piece of v.split(/\s+/)) if (/^-?[\d.]+(px|rem|em)$/.test(piece)) note(kind, piece, file, i + 1); } else note(kind, v, file, i + 1);
      }
    }
  });
}

/* ── tokens ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const tokens = { light: [], dark: [], px: [] };
if (tokenFile) {
  const css = readFileSync(tokenFile, 'utf8');
  const state = states(css), raw = [new Map(), new Map()]; // name → value as written, light then dark
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;{}]+)/g)) {
    const st = state[m.index]; if (st === 2) continue;
    const value = m[2].trim(), both = value.match(/^light-dark\((.*)\)$/s)?.[1].split(/,(?![^(]*\))/);
    if (both?.length === 2) { raw[0].set(m[1], both[0].trim()); raw[1].set(m[1], both[1].trim()); } else raw[st].set(m[1], value);
  }
  // a token that points at another takes its value; the dark theme falls back to the light value
  const value = (name, theme, depth = 0) => {
    const v = (theme ? raw[1].get(name) : undefined) ?? raw[0].get(name); const ref = v?.match(/^var\(\s*--([\w-]+)\s*\)$/);
    return ref && depth < 8 ? value(ref[1], theme, depth + 1) : v;
  };
  const bare = (v) => v.replace(/\/\*.*?\*\//g, '').trim(); // the value without a trailing comment
  for (const name of raw[0].keys()) {
    const v = value(name, 0); if (!v) continue;
    const c = parseColor(bare(v));
    if (c?.lab) tokens.light.push({ name, value: bare(v), lab: c.lab, a: c.a });
    const px = bare(v).match(/^([\d.]+)(px|rem)$/) || (v.match(/\/\*\s*([\d.]+)px\s*\*\//) && [null, v.match(/\/\*\s*([\d.]+)px/)[1], 'px']); // 0.8125rem, or clamp(...) /* 13px */
    if (px) tokens.px.push({ name, px: px[2] === 'rem' ? parseFloat(px[1]) * 16 : parseFloat(px[1]) });
  }
  for (const name of new Set([...raw[0].keys(), ...raw[1].keys()])) {
    const v = value(name, 1), c = v && parseColor(bare(v));
    if (c?.lab) tokens.dark.push({ name, value: bare(v), lab: c.lab, a: c.a });
  }
}
const POOL = { size: /^(text|t|font-size)-/, leading: /^(leading|l|line-height)-/, radius: /^(radius|r)-/, space: /^(space|s|gap|pad)-|^gutter$/, height: /^(h|height)-/ };

/* ── report ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const report = { audit: AUDIT, root, files: files.length, tokens: tokenFile ?? null, kinds: {} };
const sorted = (map) => [...map.values()].sort((a, b) => b.count - a.count);

// colors: merge close ones (ΔE 2 or under, alpha within 0.02, same theme) into groups led by the most used value
const colorGroups = [];
for (const e of sorted(found.color)) {
  const theme = e.dark ? 'dark' : 'light';
  if (!e.c.lab) { colorGroups.push({ lead: e.value, theme, members: [e.value], count: e.count, where: e.where, map: { verdict: 'not compared', why: e.c.why } }); continue; }
  const g = colorGroups.find((x) => x.lab && x.theme === theme && Math.abs(x.a - e.c.a) <= ALPHA_CLOSE && dE(x.lab, e.c.lab) <= CLOSE);
  if (g) { g.members.push(e.value); g.count += e.count; } else colorGroups.push({ lead: e.value, theme, lab: e.c.lab, a: e.c.a, members: [e.value], count: e.count, where: e.where });
}
for (const g of colorGroups) {
  if (!g.lab || !tokenFile) continue;
  const best = tokens[g.theme].map((t) => ({ t, d: dE(t.lab, g.lab), da: Math.abs(t.a - g.a) })).filter((x) => x.da <= ALPHA_CLOSE).sort((a, b) => a.d - b.d)[0];
  g.map = best ? { token: `--${best.t.name}`, distance: +best.d.toFixed(2), verdict: best.d < EXACT && best.da <= ALPHA_EXACT ? 'exact' : best.d <= CLOSE ? 'close' : 'stray' } : { verdict: 'stray' };
}
report.kinds.color = colorGroups.map(({ lab, ...g }) => g);
for (const kind of Object.keys(KINDS)) {
  report.kinds[kind] = sorted(found[kind]).map((e) => {
    const px = toPx(e.value);
    let map;
    if (px !== null && POOL[kind]) {
      const full = (n) => kind === 'radius' && n >= FULL_RADIUS;
      const best = tokens.px.filter((t) => POOL[kind].test(t.name)).map((t) => ({ t, d: full(px) && full(t.px) ? 0 : Math.abs(t.px - px) })).sort((a, b) => a.d - b.d)[0];
      if (best) map = { token: `--${best.t.name}`, distance: +best.d.toFixed(2), verdict: best.d < 0.01 ? 'exact' : best.d <= CLOSE_PX[kind] ? 'close' : 'stray' };
    }
    return { value: e.value, count: e.count, where: e.where, map };
  });
}

const total = Object.values(report.kinds).reduce((s, list) => s + list.reduce((n, x) => n + x.count, 0), 0);
console.log(`\nAntheo value audit: ${files.length} files under ${root}${tokenFile ? `, mapped to ${tokenFile}` : ''}`);
console.log(`${total} hard-coded values in use\n`);
const arrow = (map) => (!map ? '' : map.verdict === 'not compared' ? `  →  not compared (${map.why}: check it by hand)` : !map.token ? '  →  no token at this alpha (stray)' : `  →  ${map.token} (${map.verdict}${map.distance ? `, off by ${map.distance}` : ''})`);
const show = (label, list, fmt) => {
  if (!list.length) return;
  console.log(`${label}: ${list.length} distinct`);
  for (const x of list.slice(0, 12)) console.log(`  ${String(x.count).padStart(4)}×  ${fmt(x)}${arrow(x.map)}`);
  if (list.length > 12) console.log(`  … and ${list.length - 12} more`);
  console.log('');
};
show('Colors (close ones merged: ΔE 2 or under in OKLab, at the same alpha and in the same theme)', report.kinds.color, (g) => `${g.lead}${g.theme === 'dark' ? '  [dark]' : ''}${g.members.length > 1 ? `  (+${g.members.length - 1} close: ${g.members.slice(1, 4).join(', ')})` : ''}`);
show('Font sizes', report.kinds.size, (x) => x.value);
show('Line heights', report.kinds.leading, (x) => x.value);
show('Spacing', report.kinds.space, (x) => x.value);
show('Corner radii', report.kinds.radius, (x) => x.value);
show(`Control heights (${MAX_HEIGHT}px and under)`, report.kinds.height, (x) => x.value);
show('Shadows', report.kinds.shadow, (x) => x.value.slice(0, 70));
show('Durations', report.kinds.duration, (x) => x.value);
show('z-index', report.kinds.zindex, (x) => x.value);

// the verdict: how far the code is from one system
const colorCount = report.kinds.color.length, sizeCount = report.kinds.size.length, radiusCount = report.kinds.radius.length;
const drift = [];
if (colorCount > 24) drift.push(`${colorCount} distinct colors (a system needs about 12 to 20 including status colors)`);
if (report.kinds.color.some((g) => g.members.length > 1)) drift.push(`${report.kinds.color.filter((g) => g.members.length > 1).length} colors exist in close versions`);
if (sizeCount > 9) drift.push(`${sizeCount} font sizes (a scale has 6 to 9)`);
if (radiusCount > 5) drift.push(`${radiusCount} corner radii (a scale has 4 to 5)`);
if (report.kinds.duration.length > 5) drift.push(`${report.kinds.duration.length} durations (five tokens cover everything)`);
if (report.kinds.zindex.length > 6) drift.push(`${report.kinds.zindex.length} z-index values (use 5 to 6 named layers)`);
const notCompared = report.kinds.color.filter((g) => g.map?.verdict === 'not compared').reduce((s, g) => s + g.count, 0);
if (tokenFile) {
  const all = Object.values(report.kinds).flat().filter((x) => x.map);
  const n = (v) => all.filter((x) => x.map.verdict === v).reduce((s, x) => s + x.count, 0);
  console.log(`Migration: ${n('exact')} uses are exact (swap for the token as is), ${n('close')} are close (swap and look), ${n('stray')} are strays (decide: new token or change the design)${notCompared ? `, ${notCompared} are not compared (a color form this audit cannot convert: check by hand)` : ''}.`);
  console.log(`Exact: ΔE under ${EXACT}, or 0px. Close: ΔE ${CLOSE} or under, or within 2px (1px for font sizes and line heights). Stray: further. Dark literals are mapped to the dark values.`);
} else if (notCompared) console.log(`${notCompared} uses are in a color form this audit cannot convert: counted, not compared.`);
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
  const known = Object.keys(report.kinds).filter((k) => baseTotals[k] !== undefined);
  console.log(`
Ratchet against ${baselineFile}`);
  console.log(`  ${'kind'.padEnd(10)} ${'baseline'.padStart(8)} ${'now'.padStart(6)} ${'delta'.padStart(6)}`);
  for (const k of [...Object.keys(report.kinds), 'all']) {
    // a kind the baseline never counted is new, not an increase; the total compares only the kinds both have
    if (k !== 'all' && !known.includes(k)) { console.log(`  ${k.padEnd(10)} ${'-'.padStart(8)} ${String(report.totals[k]).padStart(6)} ${'new'.padStart(6)}  not in this baseline`); continue; }
    const now = k === 'all' ? known.reduce((n, x) => n + report.totals[x], 0) : report.totals[k];
    const was = k === 'all' ? known.reduce((n, x) => n + baseTotals[x], 0) : baseTotals[k], d = now - was;
    if (d > 0) grew = true;
    console.log(`  ${k.padEnd(10)} ${String(was).padStart(8)} ${String(now).padStart(6)} ${((d > 0 ? '+' : '') + d).padStart(6)}${d > 0 ? '  UP' : d < 0 ? '  down' : ''}`);
  }
  if ((base.audit ?? 1) < AUDIT) console.log('This baseline was stored by an older audit, which did not count oklch(), oklab(), lab(), lch(), hwb(), color() or named colors, line heights or control heights. A rise in color may be those. Store a new baseline (--json) and compare against that.');
  console.log(grew ? 'Raw values went up. Use a token for the new ones, then run again.' : 'No kind went up. If any went down, store this audit as the new baseline (--json).');
}
const json = flag('json');
if (json) writeFileSync(json, JSON.stringify(report, null, 2));
if (baselineFile && argv.includes('--fail-on-increase') && grew) process.exit(1);
