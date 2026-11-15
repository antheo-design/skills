#!/usr/bin/env node
/*
 * Antheo tokens: a whole design system from a short brief, computed, not guessed.
 *
 *   node tokens.mjs --brand "#c2410c" --mood warm --shape soft --density comfortable --out ./design
 *
 * Writes into --out:
 *   tokens.css           CSS custom properties: light, dark (by prefers-color-scheme and by [data-theme])
 *   tokens.tailwind.css  the same as a Tailwind v4 @theme block
 *   tokens.json          the W3C Design Tokens format ($value / $type)
 *   motion.css           the motion kit: hover, press and focus on every control, one entrance, open/close, reduced motion
 *   layout.css           the layout kit: one page grid, splits, auto grids, stacks: fluid from 320px to 2560px
 *   preview.html         a specimen page: palette, type, spacing, radii, shadows, motion, components
 * and prints a contrast report. Every text/background pair it emits is checked against WCAG 2.2 and repaired
 * (lightness moved in OKLCH) until it passes, so the palette can't ship unreadable.
 *
 * Flags (all optional):
 *   --brand    the brand color, any hex (default: picked from --mood)
 *   --mood     calm | warm | playful | bold | technical | editorial | luxury   (default calm)
 *   --shape    sharp | soft | round                                           (default from mood)
 *   --density  comfortable | compact                                          (default comfortable)
 *   --type     grotesk | humanist | geometric | rounded | serif | mono       (default from mood)
 *   --display  a Google Fonts family for headlines, e.g. "Instrument Serif"   (default from --type)
 *   --register product | expressive: product (the default) is the quiet look for components and app screens:
 *              warm-grey neutrals at near-zero chroma, the ink as the accent, the brand kept as --color-brand for one
 *              signal. expressive leans every neutral to the brand hue, for landing and marketing pages.
 *   --paper    tinted | paper | white: how much the page background leans to the brand hue (expressive only)
 *   --field    the color of full-bleed bands and closing scenes, any hex     (default: a deep shade of --brand)
 *   --name     the product's name, for the preview                           (default "Product")
 *   --out      folder to write into                                          (default ./design-tokens)
 * No dependencies: plain Node 18+.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── arguments ──────────────────────────────────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, a, i, all) => (a.startsWith('--') ? [...pairs, [a.slice(2), all[i + 1]?.startsWith('--') ? 'true' : all[i + 1]]] : pairs), []),
);
const KNOWN = ['register', 'brand', 'mood', 'shape', 'density', 'type', 'display', 'paper', 'field', 'name', 'out'];
// asking for help, or a flag it doesn't know, prints how to use it and writes nothing
if ('help' in args || 'h' in args || process.argv.includes('-h') || Object.keys(args).some((k) => !KNOWN.includes(k))) {
  const unknown = Object.keys(args).filter((k) => !KNOWN.includes(k) && k !== 'help' && k !== 'h');
  if (unknown.length) console.error(`unknown flag${unknown.length > 1 ? 's' : ''}: ${unknown.map((k) => `--${k}`).join(', ')}\n`);
  console.log('usage: node tokens.mjs --brand "#c2412d" --mood calm|warm|playful|bold|technical|editorial|luxury --shape sharp|soft|round --density comfortable|compact --type grotesk|humanist|geometric|rounded|serif|mono --display "Font Name" --paper tinted|paper|white --field "#1f2a24" --name "Product" --out ./design-tokens');
  process.exit(unknown.length ? 2 : 0);
}

const MOODS = {
  // neutral chroma, type style, scale ratio, shape, motion character, default brand, hero headline px at 1280 wide
  calm: { chroma: 0.012, type: 'humanist', ratio: 1.2, shape: 'soft', spring: 'smooth', brand: '#5d6b2f', display: 72 },
  warm: { chroma: 0.016, type: 'humanist', ratio: 1.2, shape: 'soft', spring: 'smooth', brand: '#c2410c', display: 76 },
  playful: { chroma: 0.018, type: 'rounded', ratio: 1.25, shape: 'round', spring: 'bouncy', brand: '#e0457b', display: 84 },
  bold: { chroma: 0.008, type: 'grotesk', ratio: 1.333, shape: 'sharp', spring: 'snappy', brand: '#1d1d1f', display: 104 },
  technical: { chroma: 0.006, type: 'grotesk', ratio: 1.2, shape: 'sharp', spring: 'snappy', brand: '#e4570f', display: 68 },
  editorial: { chroma: 0.014, type: 'serif', ratio: 1.333, shape: 'sharp', spring: 'smooth', brand: '#8a3b2b', display: 96 },
  luxury: { chroma: 0.01, type: 'serif', ratio: 1.25, shape: 'sharp', spring: 'smooth', brand: '#6b5a3e', display: 88 },
};
const register = args.register === 'expressive' ? 'expressive' : 'product';
const mood = MOODS[args.mood] ? args.mood : 'calm';
const M = MOODS[mood];
const shape = ['sharp', 'soft', 'round'].includes(args.shape) ? args.shape : M.shape;
// product UI is read up close and worked in all day: compact by default; pages breathe
const density = args.density === 'comfortable' ? 'comfortable' : args.density === 'compact' || register === 'product' ? 'compact' : 'comfortable';
const typeStyle = ['grotesk', 'humanist', 'geometric', 'rounded', 'serif', 'mono'].includes(args.type) ? args.type : register === 'product' ? 'grotesk' : M.type;
const brandHex = /^#?[0-9a-f]{6}$/i.test(args.brand ?? '') ? `#${args.brand.replace('#', '')}` : M.brand;
const name = args.name ?? 'Product';
const out = args.out ?? './design-tokens';
const paper = ['tinted', 'paper', 'white'].includes(args.paper) ? args.paper : 'tinted';
const fieldArg = /^#?[0-9a-f]{6}$/i.test(args.field ?? '') ? `#${args.field.replace('#', '')}` : null;
const displayArg = typeof args.display === 'string' && args.display !== 'true' ? args.display.trim() : null;

// ── color math: OKLCH ⇄ sRGB, gamut mapping, WCAG contrast ─────────────────────────────────────────────────────
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16) / 255);
const rgbToHex = (rgb) => `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')}`;

function rgbToOklch([r, g, b]) {
  [r, g, b] = [r, g, b].map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function oklchToRgbRaw([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(toGam);
}

/** Into sRGB by lowering chroma only, so lightness and hue (what people notice) stay put. */
function oklchToHex([L, C, H]) {
  const inGamut = (c) => oklchToRgbRaw([L, c, H]).every((v) => v >= -0.0005 && v <= 1.0005);
  let c = C;
  if (!inGamut(c)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) (inGamut((lo + hi) / 2) ? (lo = (lo + hi) / 2) : (hi = (lo + hi) / 2));
    c = lo;
  }
  return rgbToHex(oklchToRgbRaw([L, c, H]));
}

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Move lightness toward `dir` (-1 darker, +1 lighter) until `fg` reaches `min` contrast on `bg`. */
function repair(lch, bg, min, dir) {
  let [L, C, H] = lch;
  let hex = oklchToHex([L, C, H]);
  for (let i = 0; i < 100 && contrast(hex, bg) < min; i++) {
    L = Math.min(1, Math.max(0, L + dir * 0.01));
    hex = oklchToHex([L, C, H]);
  }
  return { hex, lch: [L, C, H] };
}

// ── palette ────────────────────────────────────────────────────────────────────────────────────────────────────
const brand = rgbToOklch(hexToRgb(brandHex));
const hue = brand[2];
const nc = M.chroma;
// neutrals lean to the brand hue; "paper" leans to cream stock (hue ~82) instead, whatever the brand
const nHue = paper === 'paper' ? 82 : hue;
const neutral = (L, c = nc) => oklchToHex([L, brand[1] < 0.02 && paper !== 'paper' ? 0 : c, nHue]);

const STATUS_HUES = { success: 150, warning: 75, danger: 27, info: 245 };
const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const notes = [];
for (const [k, h] of Object.entries(STATUS_HUES)) if (brand[1] > 0.05 && hueGap(h, hue) < 22) notes.push(`The brand hue (${Math.round(hue)}°) sits close to ${k} (${h}°). Keep ${k} for status only and never use the brand color to mean ${k}; pair status with an icon and words.`);
if (!args.brand) notes.push(`No --brand given, so the ${mood} default (${brandHex}) was used. Every product that skips this step looks the same: take the brand from three nouns of the subject's world (antheo-tokens Step 1).`);
if (brand[1] > 0.05 && ((hue >= 170 && hue <= 205) || (hue >= 268 && hue <= 310))) notes.push(`The brand hue (${Math.round(hue)}°) is ${hue <= 205 ? 'teal' : 'indigo or violet'}, which most generated UI lands on. Keep it only if the subject's world is that color; say which noun in the brief.`);
if (register === 'expressive' && brand[1] > 0.05 && hue >= 20 && hue <= 80 && paper !== 'white' && !fieldArg) notes.push(`An orange red accent on ${paper} paper with a dark band of the same hue is the other common default ("warm craft"). Keep it only if the nouns are those colors, and pass --field from a second noun so the field is not just a dark shade of the brand.`);
if (register === 'expressive' && !fieldArg) notes.push(`No --field given, so the field is a deep shade of the brand (${''}same hue). A field taken from a second noun, in a different hue, gives the page more identity; it may be bright or pale.`);

// how far the page leans toward the brand hue: white = clinical, tinted = the default, paper = warm stock
const PAPER = { white: { bg: 0.99, c: 0.6, surface: null }, tinted: { bg: 0.978, c: 1.1, surface: 0.992 }, paper: { bg: 0.965, c: 0.018 / nc, surface: 0.985 } }[paper];

function theme(dark) {
  const t = {};
  t.bg = dark ? neutral(0.165, Math.min(nc, 0.008)) : neutral(PAPER.bg, nc * PAPER.c);
  t.surface = dark ? neutral(0.212, Math.min(nc, 0.009)) : PAPER.surface ? neutral(PAPER.surface, nc * PAPER.c * 0.5) : '#ffffff';
  t['surface-2'] = dark ? neutral(0.258, Math.min(nc, 0.01)) : neutral(PAPER.bg - 0.022, nc * PAPER.c);
  t['surface-sunken'] = dark ? neutral(0.145) : neutral(PAPER.bg - 0.035, nc * PAPER.c);
  t.border = dark ? neutral(0.3) : neutral(PAPER.bg - 0.075, nc * PAPER.c);
  t['border-strong'] = dark ? neutral(0.4) : neutral(0.82);
  t.text = repair([dark ? 0.925 : 0.2, nc * 1.5, hue], t.bg, 12, dark ? 1 : -1).hex;
  t['text-muted'] = repair([dark ? 0.705 : 0.47, nc * 1.5, hue], t['surface-2'], 4.5, dark ? 1 : -1).hex;
  t['text-subtle'] = repair([dark ? 0.555 : 0.58, nc, hue], t.bg, 3, dark ? 1 : -1).hex; // placeholders & disabled: 3:1, never for meaning

  // the accent as a filled button: its label must read on it
  const base = dark ? [Math.max(brand[0], 0.68), brand[1] * 0.9, hue] : brand;
  const white = '#ffffff';
  const ink = dark ? t.bg : neutral(0.16);
  let fill = { hex: oklchToHex(base), lch: base };
  let fg = contrast(fill.hex, white) >= contrast(fill.hex, ink) ? white : ink;
  if (contrast(fill.hex, fg) < 4.5) fill = repair(base, fg, 4.5, fg === white ? -1 : 1);
  t.accent = fill.hex;
  t['accent-fg'] = fg;
  t['accent-hover'] = oklchToHex([fill.lch[0] + (fg === white ? -0.05 : 0.05), fill.lch[1], hue]);
  t['accent-press'] = oklchToHex([fill.lch[0] + (fg === white ? -0.09 : 0.09), fill.lch[1], hue]);
  t['accent-soft'] = oklchToHex([dark ? 0.27 : 0.955, Math.min(0.045, brand[1] * 0.35), hue]);
  t['accent-text'] = repair([fill.lch[0], fill.lch[1], hue], t.bg, 4.5, dark ? 1 : -1).hex; // links and accent words
  t.focus = repair([dark ? 0.75 : 0.55, Math.max(0.12, brand[1]), hue], t.bg, 3, dark ? 1 : -1).hex;

  for (const [k, h] of Object.entries(STATUS_HUES)) {
    const solid = repair([dark ? 0.75 : 0.52, k === 'warning' ? 0.15 : 0.16, h], t.bg, 4.5, dark ? 1 : -1);
    t[k] = solid.hex;
    t[`${k}-soft`] = oklchToHex([dark ? 0.26 : 0.96, 0.04, h]);
    t[`${k}-text`] = repair([dark ? 0.82 : 0.42, 0.13, h], t[`${k}-soft`], 4.5, dark ? 1 : -1).hex;
  }
  // the field: a large band of color for one or two scenes (a statement, the closing scene, a sign-up panel).
  // Same in both themes, so a page keeps its identity in dark mode; text on it is repaired to 7:1.
  const fieldLch = fieldArg ? rgbToOklch(hexToRgb(fieldArg)) : dark ? [0.34, Math.min(0.11, Math.max(0.045, brand[1] * 0.7)), hue] : [0.3, Math.min(0.09, Math.max(0.02, brand[1] * 0.55)), hue];
  t.field = oklchToHex(fieldLch);
  const onLight = fieldLch[0] < 0.6;
  t['on-field'] = repair([onLight ? 0.97 : 0.18, nc * 2, hue], t.field, 7, onLight ? 1 : -1).hex;
  t['on-field-muted'] = repair([onLight ? 0.82 : 0.34, nc * 3, hue], t.field, 4.5, onLight ? 1 : -1).hex;
  t['on-field-accent'] = repair([onLight ? 0.82 : 0.42, Math.max(0.1, brand[1]), hue], t.field, 4.5, onLight ? 1 : -1).hex;
  t.selection = oklchToHex([dark ? 0.35 : 0.9, Math.min(0.08, brand[1] * 0.5), hue]);
  t.scrim = dark ? 'rgb(0 0 0 / 0.6)' : 'rgb(20 20 20 / 0.4)';
  // the hairline around raised things: in dark it replaces the shadow, which cannot be seen on a dark page
  // laid over any control on hover: darkens in light, lightens in dark
  t.wash = dark ? 'oklch(1 0 0 / 0.08)' : `oklch(0.2 0.02 ${Math.round(hue)} / 0.07)`;
  t.ring = dark ? 'oklch(1 0 0 / 0.1)' : `oklch(0.25 0.02 ${Math.round(hue)} / 0.08)`;
  if (register === 'product') productLook(t, dark);
  return t;
}
/**
 * The product register: what well-made product UI does. The neutrals are near-neutral grey (never beige, never the
 * brand's hue), the surface is white (0.215 in dark) with a band one step off it, and the accent is the ink itself:
 * primary buttons are ink-filled, selection and focus are ink. Colour comes from content (status, files, people,
 * charts), not from the chrome. The brand survives as --color-brand for at most one signal per screen.
 */
function productLook(t, dark) {
  const g = (L, c = 0.003) => oklchToHex([L, c, 80]); // near-neutral: enough hue to feel of a piece, never beige
  t.brand = t.accent;
  t['brand-fg'] = t['accent-fg'];
  t['brand-text'] = t['accent-text'];
  t.bg = dark ? g(0.17, 0.003) : g(0.98, 0.002);
  t.surface = dark ? g(0.215) : '#ffffff';
  t['surface-2'] = dark ? g(0.248) : g(0.972, 0.002);
  t['surface-sunken'] = dark ? g(0.255) : g(0.962, 0.002);
  t.border = dark ? g(0.32) : g(0.9, 0.003);
  t['border-strong'] = dark ? g(0.42) : g(0.8, 0.003);
  t.text = dark ? oklchToHex([0.95, 0.006, 85]) : oklchToHex([0.22, 0.01, 70]);
  t['text-muted'] = repair([dark ? 0.72 : 0.48, 0.008, 75], t['surface-2'], 4.5, dark ? 1 : -1).hex;
  t['text-subtle'] = repair([dark ? 0.58 : 0.6, 0.006, 75], t.bg, 3, dark ? 1 : -1).hex;
  t.accent = t.text;
  t['accent-fg'] = t.surface;
  t['accent-hover'] = dark ? oklchToHex([0.86, 0.006, 85]) : oklchToHex([0.32, 0.01, 70]);
  t['accent-press'] = dark ? oklchToHex([0.8, 0.006, 85]) : oklchToHex([0.38, 0.01, 70]);
  t['accent-soft'] = dark ? g(0.27) : g(0.955, 0.003);
  t['accent-text'] = t.text;
  t.focus = t.text;
  t.selection = dark ? g(0.36) : g(0.9, 0.006);
  t.wash = dark ? 'oklch(1 0 0 / 0.06)' : 'oklch(0.2 0.01 70 / 0.05)';
  t.ring = dark ? 'oklch(1 0 0 / 0.09)' : 'oklch(0.2 0.01 70 / 0.08)';
}
const light = theme(false);
const dark = theme(true);

// ── type ───────────────────────────────────────────────────────────────────────────────────────────────────────
const FONTS = {
  grotesk: { sans: register === 'product' ? ['Geist'] : ['Hanken Grotesk', 'Schibsted Grotesk', 'Inter Tight'], display: ['Familjen Grotesk', 'Geist', 'Schibsted Grotesk'], mono: 'JetBrains Mono' },
  humanist: { sans: ['Figtree', 'Source Sans 3', 'Nunito Sans'], display: ['Young Serif', 'Fraunces', 'Bricolage Grotesque'], mono: 'IBM Plex Mono' },
  geometric: { sans: ['Manrope', 'Plus Jakarta Sans', 'Outfit'], display: ['Bricolage Grotesque', 'Syne', 'Unbounded'], mono: 'JetBrains Mono' },
  rounded: { sans: ['Nunito', 'Quicksand', 'Varela Round'], display: ['Bricolage Grotesque', 'Fredoka'], mono: 'JetBrains Mono' },
  serif: { sans: ['Source Sans 3', 'Figtree', 'Hanken Grotesk'], display: ['Fraunces', 'Newsreader', 'Instrument Serif'], mono: 'IBM Plex Mono' },
  mono: { sans: ['Hanken Grotesk', 'Figtree', 'Manrope'], display: ['JetBrains Mono', 'IBM Plex Mono', 'Geist Mono'], mono: 'JetBrains Mono' },
};
// the brand color picks among good fonts, so two products don't land on the same pair by default
const pick = (list) => list[Math.floor(hue / (360 / list.length)) % list.length];
const F = FONTS[typeStyle];
const sansFont = pick(F.sans);
// product UI keeps one family: a second, expressive face belongs to pages
const displayFont = displayArg ?? (register === 'product' ? sansFont : F.display ? pick(F.display) : sansFont);
const monoFont = F.mono;
const SERIFS = /serif|fraunces|newsreader|gloock|young serif|playfair|lora|caslon|garamond|baskerville|bodoni|tiempos|canela/i;
const displayIsSerif = SERIFS.test(displayFont) && !/sans/i.test(displayFont);
const stack = {
  sans: `"${sansFont}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
  display: displayFont === sansFont ? 'var(--font-sans)' : `"${displayFont}", ${displayIsSerif ? 'ui-serif, Georgia, serif' : 'ui-sans-serif, system-ui, sans-serif'}`,
  mono: `"${monoFont}", ui-monospace, "SF Mono", Menlo, Consolas, monospace`,
};
const families = [...new Set([sansFont, displayFont, monoFont])];
// single-weight display faces break when asked for weights they don't have
const ONE_WEIGHT = ['Instrument Serif', 'Young Serif', 'Gloock', 'DM Serif Display'];
const googleFonts = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f.replace(/ /g, '+')}${ONE_WEIGHT.includes(f) ? ':ital@0;1' : ':wght@400;500;600;700'}`).join('&')}&display=swap`;
// display weight: big type looks expensive light and cheap heavy; serifs at 400, sans at 500 (600 for rounded)
const displayWeight = displayIsSerif ? 400 : typeStyle === 'rounded' ? 600 : 500;

// 14px for the product register (what real products ship on a desktop screen), 16 for pages people read; 13px is --text-sm
const baseSize = register === 'product' ? 14 : density === 'compact' ? 14 : 16;
const STEPS = { xs: -2, sm: -1, base: 0, lg: 1, xl: 2, '2xl': 3, '3xl': 4, '4xl': 5, '5xl': 6 };
const FLOOR = register === 'product' ? { xs: 12, sm: 13 } : density === 'compact' ? { xs: 12, sm: 13 } : { xs: 12, sm: 14 }; // meta and secondary text: never 11px
const sizeAt = (step) => Math.round(baseSize * M.ratio ** step);
const lineHeight = (px) => (px <= 13 ? 1.5 : px <= 17 ? 1.55 : px <= 20 ? 1.45 : px <= 24 ? 1.35 : px <= 32 ? 1.25 : px <= 44 ? 1.15 : 1.05);
const tracking = (px) => (px >= 40 ? '-0.025em' : px >= 28 ? '-0.02em' : px >= 20 ? '-0.01em' : px <= 12 ? '0.01em' : '0em');
const type = Object.fromEntries(
  Object.entries(STEPS).map(([k, s]) => {
    const px = FLOOR[k] ?? Math.max(12, sizeAt(s));
    // the biggest steps scale down on phones: clamp from ~70% at 360px to full at 1280px
    const min = Math.round(px * 0.7);
    const slope = (px - min) / 920; // px of type per px of viewport, between 360 and 1280 wide
    const size = px >= 32 ? `clamp(${(min / 16).toFixed(3)}rem, ${((min - slope * 360) / 16).toFixed(3)}rem + ${(slope * 100).toFixed(3)}vw, ${(px / 16).toFixed(3)}rem)` : `${(px / 16).toFixed(3)}rem`;
    return [k, { px, size, lh: lineHeight(px), tracking: tracking(px) }];
  }),
);
// display sizes sit outside the UI scale: a hero headline 2.5× body or more, set tight. Phones get ~44 to 48%.
const fluid = (px, minPx) => { const slope = (px - minPx) / 920; return `clamp(${(minPx / 16).toFixed(3)}rem, ${((minPx - slope * 360) / 16).toFixed(3)}rem + ${(slope * 100).toFixed(3)}vw, ${(px / 16).toFixed(3)}rem)`; };
const DISPLAY = {
  'display-1': { px: M.display, min: Math.round(Math.max(40, M.display * 0.46)), lh: 1.0, tracking: displayIsSerif ? '-0.02em' : '-0.035em' },
  'display-2': { px: Math.round(M.display * 0.62), min: Math.round(Math.max(32, M.display * 0.4)), lh: 1.05, tracking: displayIsSerif ? '-0.015em' : '-0.028em' },
  'display-num': { px: Math.round(M.display * 1.9), min: Math.round(M.display * 0.9), lh: 0.9, tracking: '-0.04em' },
};
for (const d of Object.values(DISPLAY)) d.size = fluid(d.px, d.min);

// ── space, size, shape, depth, motion ────────────────────────────────────────────────────────────────────────
const SPACE = { 0: 0, px: 1, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96, 32: 128 };
const RADII = { sharp: [2, 4, 6, 8, 12], soft: [4, 6, 10, 14, 20], round: [6, 10, 14, 20, 28] }[shape];
const radius = { xs: RADII[0], sm: RADII[1], md: RADII[2], lg: RADII[3], xl: RADII[4], full: 9999 };
// compact is the product look: 36px buttons and inputs, 28 small, 44 for primary touch targets
const control = density === 'compact' ? { sm: 28, md: 36, lg: 44 } : { sm: 32, md: 40, lg: 48 };

const sh = (dark) => {
  const c = (a) => `oklch(${dark ? 0.08 : 0.28} ${Math.min(0.03, nc * 2).toFixed(3)} ${Math.round(hue)} / ${a})`;
  const k = dark ? 2 : 1;
  return {
    1: `0 1px 2px ${c(0.06 * k)}, 0 1px 1px ${c(0.04 * k)}`,
    2: `0 1px 2px ${c(0.05 * k)}, 0 4px 8px -2px ${c(0.08 * k)}, 0 8px 16px -6px ${c(0.06 * k)}`,
    3: `0 2px 4px ${c(0.05 * k)}, 0 12px 24px -6px ${c(0.12 * k)}, 0 24px 48px -12px ${c(0.1 * k)}`,
    4: `0 4px 8px ${c(0.06 * k)}, 0 24px 48px -8px ${c(0.16 * k)}, 0 48px 96px -16px ${c(0.14 * k)}`,
  };
};

/** A damped spring sampled into CSS linear(), with the time it takes to settle. */
function spring(stiffness, damping, mass = 1) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x = (t) => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  };
  let end = 0.05;
  for (let t = 0.05; t < 4; t += 0.01) {
    let settled = true;
    for (let u = t; u < t + 0.15; u += 0.01) if (Math.abs(x(u) - 1) > 0.004) settled = false;
    if (settled) { end = t; break; }
  }
  const points = Array.from({ length: 33 }, (_, i) => +x((end * i) / 32).toFixed(4));
  points[points.length - 1] = 1;
  return { easing: `linear(${points.join(', ')})`, ms: Math.round(end * 1000) };
}
// settle is judged at 0.4% of the distance: past that, the eye reads it as stopped
const SPRINGS = { smooth: spring(380, 40), snappy: spring(600, 50), bouncy: spring(420, 22) };
const sp = SPRINGS[M.spring];

const motion = {
  'dur-instant': '100ms', // press feedback, colour changes
  'dur-fast': '150ms', // hover, a menu or tooltip opening
  'dur-base': '200ms', // things leaving, a value swap, a toast arriving
  'dur-open': '250ms', // a dialog opening, tabs, an accordion
  'dur-slow': '300ms', // a sheet or drawer rising, a marker sliding across
  'dur-page': '400ms', // page-level and shared-element moves
  'ease-out': 'cubic-bezier(0.23, 1, 0.32, 1)', // things arriving and leaving: quick start, soft landing
  'ease-in': 'cubic-bezier(0.55, 0, 1, 0.45)', // only for something thrown away for good (a toast flung off-screen)
  'ease-in-out': 'cubic-bezier(0.77, 0, 0.175, 1)', // things moving from A to B on screen
  'ease-spring': sp.easing,
  'dur-spring': `${sp.ms}ms`,
  // how far, from what size, through how much blur: pick by what is moving, never by the nearest number
  'dist-xs': '4px', // a value swapping, a tooltip
  'dist-sm': '8px', // menus, toasts, list items arriving
  'dist-md': '12px', // panels, a hero's parts arriving
  'dist-lg': '24px', // a sheet's content settling, a page section
  'scale-press': '0.97', // a control being pressed
  'scale-pop': '0.96', // menus, popovers and dialogs entering
  'scale-tip': '0.98', // tooltips entering
  'scale-leave': '0.98', // anything leaving
  'blur-xs': '2px', // hides the seam of a crossfade
  'blur-sm': '4px', // text and icon swaps
  'blur-md': '8px', // a large surface entering
};

// ── layout kit ─────────────────────────────────────────────────────────────────────────────────────────────────
// Layouts that hold at every width because of how they are built, not because someone tested five sizes.
const LAYOUT = `/* ${name} layout kit: generated by antheo-tokens/scripts/tokens.mjs. Import after tokens.css.
   Fluid by construction: tracks use minmax(), min() and clamp(); nothing has a fixed pixel width; rows wrap on
   their own. Use these instead of writing new containers, so every section shares one left edge.
   In a single-file page, copy only the classes you use, not the whole kit. */

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { margin: 0; }
img, video, canvas { max-width: 100%; height: auto; }
svg { max-width: 100%; }
:where(h1, h2, h3, h4) { text-wrap: balance; margin: 0; }
:where(p, li, dd) { text-wrap: pretty; overflow-wrap: break-word; } /* break-word, not anywhere: a real word is never split to make a column fit */
:where(button) { white-space: nowrap; }
.long-text { overflow-wrap: anywhere; min-width: 0; }      /* only for strings people typed: emails, links, IDs, names */
/* A number and its unit: one line, one baseline, the unit smaller and quieter, right after the number. */
.figure { display: inline-flex; align-items: baseline; gap: 0.375rem; white-space: nowrap; }
.figure > .unit { font-size: var(--t-body); font-weight: 400; color: var(--text-2); }
:where(input, select, textarea, button) { font: inherit; }
:where(input, select, textarea) { min-width: 0; max-width: 100%; }

/* 1. THE PAGE GRID. Every top-level section is a .scene. Its children sit on the content column, so every
      heading on the page starts on the same line. Backgrounds go on the .scene and reach the screen edges. */
.scene {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gutter), 1fr)
    [wide-start] minmax(0, calc((var(--page-wide) - var(--page-max)) / 2))
    [content-start] min(100% - 2 * var(--gutter), var(--page-max))
    [content-end] minmax(0, calc((var(--page-wide) - var(--page-max)) / 2))
    [wide-end] minmax(var(--gutter), 1fr) [full-end];
  padding-block: var(--section);
}
.scene > * { grid-column: content; min-width: 0; }
.scene > .wide { grid-column: wide; }                       /* a wide table, a big visual */
.scene > .full { grid-column: full; }                       /* edge to edge */
.scene.dense { padding-block: var(--section-dense); }
.scene.flush { padding-block: 0; }                          /* a header or footer bar: same column, so its brand starts on the content edge */

/* 2. SPLIT. Two parts side by side; they stack by themselves when either would drop under its minimum. */
.split { display: flex; flex-wrap: wrap; gap: var(--gap-group) clamp(2rem, 5vw, 5rem); align-items: start; }
.split > * { flex: 1 1 var(--split-min, 20rem); min-width: 0; }
.split > .major { flex-grow: 1.6; }                         /* the wider part of a 5/7 split */
.split.center { align-items: center; }

/* 3. BRAND PAGES ONLY (antheo-direction, when the person asked for an expressive page). Never on app screens or
      plain sections: a hero with a real visual, a coloured ground, a roomier section. */
.hero-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: clamp(2rem, 5vw, 5rem); align-items: center; }
.hero-grid > :first-child { max-width: 36rem; }
.hero-visual { min-height: clamp(16rem, 38vw, 40rem); position: relative; }
@media (max-width: 56rem) { .hero-grid { grid-template-columns: minmax(0, 1fr); } }
.scene.airy { padding-block: calc(var(--section) * 1.5); }
.scene.on-field { background: var(--color-field); color: var(--color-on-field); }

/* 4. AUTO GRID. As many equal columns as fit; one column on a phone, no breakpoints. Set --col-min per use. */
.auto-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(var(--col-min, 16rem), 100%), 1fr)); gap: var(--gap-field); }

/* 5. STACK and CLUSTER. Vertical flow with one gap; a wrapping row of small things. */
.stack { display: flex; flex-direction: column; gap: var(--stack-gap, var(--gap-field)); }
.stack > * { margin-block: 0; }
.stack.tight { --stack-gap: var(--gap-label); }
.stack.loose { --stack-gap: var(--gap-group); }
.cluster { display: flex; flex-wrap: wrap; gap: var(--gap-inline) var(--gap-item); align-items: center; }
.cluster.between { justify-content: space-between; }

/* 6. PAIRS. Controls that sit side by side share row lines: label on row 1, control on row 2, help on row 3.
      Each child takes the same three rows, so the labels line up exactly whatever their length. */
.pair-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr)); grid-auto-rows: auto; gap: var(--gap-label) var(--gap-group); align-items: start; }
.pair-row > * { display: grid; grid-template-rows: subgrid; grid-row: span 3; min-width: 0; }
@supports not (grid-template-rows: subgrid) { .pair-row > * { grid-template-rows: auto auto auto; row-gap: var(--gap-label); } }

/* 7. MEASURE and SCROLLERS. Text never runs wider than it can be read; wide data scrolls inside its own box. */
.measure { max-width: var(--measure); }
.scroll-x { overflow-x: auto; overscroll-behavior-x: contain; max-width: 100%; }
.scroll-x > table { min-width: max-content; }

/* 8. APP SHELL. A sidebar that becomes a top bar by itself when the window is narrow. */
.shell { display: grid; grid-template-columns: minmax(0, 1fr); min-height: 100dvh; }
@media (min-width: 60rem) {
  .shell { grid-template-columns: var(--shell-side, 15rem) minmax(0, 1fr); }
  .shell > :first-child { position: sticky; top: 0; height: 100dvh; overflow-y: auto; }
}
.shell-main { padding: var(--s-6) var(--gutter); max-width: calc(var(--page-wide) + 2 * var(--gutter)); width: 100%; margin-inline: auto; min-width: 0; }

/* 9. No smooth scrolling for people who ask for less motion. */
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

/* 10. HIGH CONTRAST (Windows forced colors): backgrounds are removed, so controls keep an edge and a chosen state stays visible. */
@media (forced-colors: active) {
  :where(button, [role="button"], [role="switch"], [role="tab"], input, select, textarea, .btn) { border: 1px solid ButtonText; }
  :where([aria-pressed="true"], [aria-checked="true"], [aria-selected="true"], [aria-current]:not([aria-current="false"])) { outline: 2px solid Highlight; outline-offset: -2px; forced-color-adjust: none; background: Highlight; color: HighlightText; }
  :where(svg) { forced-color-adjust: auto; }
}
`;

// ── motion kit ─────────────────────────────────────────────────────────────────────────────────────────────────
const MOTION = `/* ${name} motion kit: generated by antheo-tokens/scripts/tokens.mjs. Import after tokens.css.
   Motion that is there by default, so nothing on the page is dead: every control answers a hover and a press,
   things that open arrive from somewhere, and reduced motion is already handled. Selectors use :where(), so any
   rule you write wins over these. */

:root { interpolate-size: allow-keywords; }

/* 1. FEEDBACK. Every button-like control answers back, whatever its style. */
:where(button, [role="button"], [role="switch"], [role="tab"], summary, input[type="submit"], input[type="button"], .btn) {
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out),
    scale var(--dur-instant) var(--ease-out);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
:where(button, [role="button"], [role="tab"], summary, input[type="submit"], input[type="button"], .btn):active { scale: var(--scale-press); }
:where(button, [role="button"], [role="switch"], [role="tab"], summary, input[type="submit"], input[type="button"], .btn):disabled,
:where(button, [role="button"], .btn)[aria-disabled="true"] { cursor: not-allowed; scale: none; }
@media (hover: hover) and (pointer: fine) {
  /* a wash laid over the control's own color: works on filled, outlined and bare buttons alike */
  :where(button, [role="button"], [role="switch"], [role="tab"], summary, input[type="submit"], input[type="button"], .btn):hover:not(:disabled, [aria-disabled="true"]) {
    background-image: linear-gradient(var(--wash), var(--wash));
  }
  :where(a:not(.btn)) { text-underline-offset: 0.18em; text-decoration-thickness: 1px; transition: color var(--dur-fast) var(--ease-out), text-decoration-color var(--dur-fast) var(--ease-out); }
  :where(a:not(.btn)):hover { text-decoration-line: underline; text-decoration-thickness: 2px; }
  .hoverable { transition: background-color var(--dur-fast) var(--ease-out); }
  .hoverable:hover { background-color: var(--well); }
}
:where(a:not(.btn)):active { opacity: 0.7; }

/* 2. FOCUS. One ring for everything, never removed. */
:where(a, button, input, select, textarea, summary, [tabindex], [role="button"], [role="switch"], [role="tab"]):focus-visible {
  outline: 2px solid var(--focus); outline-offset: 2px;
}
:where(input, select, textarea) { transition: border-color var(--dur-fast) var(--ease-out); }

/* 3. ARRIVE. The page's one orchestrated entrance: put .arrive on up to six things in the hero and number them
      with style="--i: 0", 1, 2… They rise in order, once. Nothing else animates on load. */
@media (prefers-reduced-motion: no-preference) {
  .arrive { animation: arrive var(--dur-page) var(--ease-out) both; animation-delay: calc(var(--i, 0) * 70ms); }
  @keyframes arrive { from { opacity: 0; translate: 0 var(--dist-md); } }
}

/* 4. OPEN and CLOSE. Dialogs and popovers fade and grow a little from where they were called; they leave faster. */
:where(dialog, [popover]) {
  opacity: 0; scale: var(--scale-pop); transform-origin: var(--origin, center);
  transition: opacity var(--dur-fast) var(--ease-out), scale var(--dur-fast) var(--ease-out),
    overlay var(--dur-fast) allow-discrete, display var(--dur-fast) allow-discrete;
}
:where(dialog[open]) { opacity: 1; scale: 1; transition-duration: var(--dur-open); }
:where([popover]:popover-open) { opacity: 1; scale: 1; transition-duration: var(--dur-fast); }
@starting-style { :where(dialog[open], [popover]:popover-open) { opacity: 0; scale: var(--scale-pop); } }
:where(dialog)::backdrop { background: var(--backdrop); opacity: 0; transition: opacity var(--dur-base) var(--ease-out), overlay var(--dur-base) allow-discrete, display var(--dur-base) allow-discrete; }
:where(dialog[open])::backdrop { opacity: 1; }
@starting-style { :where(dialog[open])::backdrop { opacity: 0; } }
/* a menu under a button: set --origin to the corner it hangs from, e.g. style="--origin: top left" */

/* 5. DISCLOSE. <details> opens and closes smoothly to its real height. */
:where(details)::details-content { block-size: 0; overflow: clip; opacity: 0;
  transition: block-size var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out), content-visibility var(--dur-base) allow-discrete; }
:where(details[open])::details-content { block-size: auto; opacity: 1; }

/* 6. CHANGE. A value that updates says so: add .tick to the element each time its text changes (see retick below). */
@media (prefers-reduced-motion: no-preference) {
  .tick { animation: tick var(--dur-base) var(--ease-out); }
  @keyframes tick { from { opacity: 0.35; translate: 0 0.18em; } }
}
/* a line that draws itself once: <path pathLength="1"> inside .draw; add .is-on to play */
.draw :where(path, line, polyline, circle) { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset var(--dur-page) var(--ease-out); }
.draw.is-on :where(path, line, polyline, circle) { stroke-dashoffset: 0; }
/* a thing that slides between positions (a tab underline, a chosen pill): move it with translate, never left/width */
.glide { transition: translate var(--dur-spring) var(--ease-spring), inline-size var(--dur-spring) var(--ease-spring); }

/* 7. SWITCHING THEME. Add .no-motion to <html> for one frame while the theme changes, or every color animates. */
.no-motion, .no-motion * { transition: none !important; }

/* 8. LESS MOTION. Fades and color stay; travel, growth and loops stop. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
  :where(button, [role="button"], [role="tab"], summary, .btn):active { scale: none; }
  :where(dialog, [popover]) { scale: none; }
  .glide { transition: none; }
}

/* retick: call after changing a number or a label, so the change is seen.
   const retick = (el) => { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }; */
`;

// ── write ──────────────────────────────────────────────────────────────────────────────────────────────────────
const vars = (o, prefix) => Object.entries(o).map(([k, v]) => `  --${prefix}${k}: ${v};`).join('\n');
const scaleVars = () =>
  [
    `  --font-sans: ${stack.sans};`,
    `  --font-display: ${stack.display};`,
    `  --font-mono: ${stack.mono};`,
    ...Object.entries(type).flatMap(([k, t]) => [`  --text-${k}: ${t.size}; /* ${t.px}px */`, `  --leading-${k}: ${t.lh};`, `  --tracking-${k}: ${t.tracking};`]),
    `  /* display: the hero headline, big statements, numerals as image, in --font-display at --weight-display */`,
    ...Object.entries(DISPLAY).flatMap(([k, t]) => [`  --text-${k}: ${t.size}; /* ${t.min} to ${t.px}px */`, `  --leading-${k}: ${t.lh};`, `  --tracking-${k}: ${t.tracking};`]),
    `  --weight-display: ${displayWeight};`,
    ...Object.entries(SPACE).map(([k, v]) => `  --space-${String(k).replace('.', '_')}: ${v / 16}rem; /* ${v}px */`),
    ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${v}px;`),
    ...Object.entries(control).map(([k, v]) => `  --control-${k}: ${v}px;`),
    `  --target-min: 24px; /* WCAG 2.2 AA; aim for 44px on touch */`,
    `  --measure: 66ch; /* body text line length */`,
    `  /* layout: one container and one gutter for the whole page, so every section starts on the same edge */`,
    `  --page-max: 76rem; /* 1216px: text and controls never go wider */`,
    `  --page-wide: 96rem; /* 1536px: how far a hero visual or a wide table may reach */`,
    `  --page-gutter: clamp(1rem, 0.25rem + 3.2vw, 3rem); /* 16 to 48px */`,
    `  --content-max: var(--page-max);`,
    `  /* section rhythm: three values, each fluid from phone to wide screen */`,
    `  --section-dense: clamp(2.5rem, 1.9rem + 2.6vw, 4.5rem); /* 40 to 72px */`,
    `  --section: clamp(4rem, 2.8rem + 5vw, 7.5rem); /* 64 to 120px */`,
    `  --section-airy: clamp(5rem, 3rem + 8.5vw, 11rem); /* 80 to 176px */`,
    `  /* gaps by role: one value each. The gap inside a group is a third of the gap between groups */`,
    `  --gap-label: ${density === 'compact' ? 0.375 : 0.5}rem; /* a label to its own control */`,
    `  --gap-inline: 0.5rem; /* an icon to its label, chips in a row */`,
    `  --gap-item: 0.75rem; /* items in a list, buttons in a row */`,
    `  --gap-field: ${density === 'compact' ? 1 : 1.5}rem; /* one field or row to the next */`,
    `  --gap-group: ${density === 'compact' ? 2 : 2.5}rem; /* one group to the next */`,
    `  --pad-control: ${density === 'compact' ? 0.75 : 1}rem; /* inline padding of buttons and inputs, both sides */`,
    `  --pad-card: ${density === 'compact' ? 1 : 1.5}rem;`,
    `  --pad-panel: ${density === 'compact' ? 1.5 : 2}rem;`,
    `  /* layers: the only z-index values; never type a number */`,
    `  --z-base: 0; --z-sticky: 10; --z-dropdown: 20; --z-overlay: 30; --z-modal: 40; --z-toast: 50;`,
    `  --focus-width: 2px;`,
    `  --focus-offset: 2px;`,
    ...Object.entries(motion).map(([k, v]) => `  --${k}: ${v};`),
  ].join('\n');

// The style block's six type roles, as steps of this scale; and its element rules and classes (.card, .field, .btn,
// .tag…), read from the block itself so there is one copy. Its font-size-adjust is Geist's, so it only stays for Geist.
const BLOCK_TYPE = { meta: 'xs', body: register === 'product' ? 'sm' : 'base', title: 'lg', page: 'xl', num: '3xl', display: '4xl' };
const BLOCK_RULES = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  const file = [join(here, '..', '..', 'antheo-build', 'references', 'quiet.css'), join(here, '..', 'references', 'quiet.css')].find((f) => existsSync(f));
  if (!file) return '';
  const block = readFileSync(file, 'utf8');
  const rules = block.slice(block.indexOf('*, *::before, *::after'));
  const geist = /"Geist"/.test(stack.sans);
  return `\n/* The style block's element rules and classes, unchanged. */\n${geist ? rules : rules.replace(/\s*font-size-adjust:[^;]+;/, '').replace(/\/\* font-size-adjust:[\s\S]*?\*\/\n/, '')}`;
})();

const css = `/* ${name} design tokens: generated by antheo-tokens/scripts/tokens.mjs
   brief: brand ${brandHex}, mood ${mood}, shape ${shape}, density ${density}, type ${typeStyle}
   fonts: <link rel="stylesheet" href="${googleFonts}">
   Use semantic names only (--color-text, --color-accent…), never the hex values. */

:root {
  color-scheme: light dark;
${scaleVars()}
${vars(light, 'color-')}
${vars(sh(false), 'shadow-')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${vars(dark, 'color-').replace(/^ {2}/gm, '    ')}
${vars(sh(true), 'shadow-').replace(/^ {2}/gm, '    ')}
  }
}

:root[data-theme='dark'] {
${vars(dark, 'color-')}
${vars(sh(true), 'shadow-')}
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-fast: 150ms; --dur-base: 150ms; --dur-open: 150ms; --dur-slow: 150ms; --dur-page: 150ms; --dur-spring: 150ms;
    /* what moved now only fades, in a 150ms crossfade; the motion kit drops travel, scale and blur */
  }
}

/* The style block's names (antheo-build's quiet.css): what every Antheo recipe, kit and pattern card reads. Each
   points at a token above, so it follows light and dark by itself. Components use these short names. */
:root {
  --bg: var(--color-bg); --surface: var(--color-surface); --raised: var(--color-surface); --well: var(--color-surface-sunken);
  --hover: var(--color-surface-2); --selected: var(--color-selection); --line: var(--color-border);
  --text: var(--color-text); --text-2: var(--color-text-muted); --text-3: var(--color-text-subtle);
  --primary: var(--color-accent); --on-primary: var(--color-accent-fg);
  --accent: var(--color-brand); --on-accent: var(--color-brand-fg);
  --accent-soft: color-mix(in oklch, var(--color-brand) 10%, var(--color-surface)); --accent-text: var(--color-brand-text);
  --danger: var(--color-danger); --success: var(--color-success); --warning: var(--color-warning); --focus: var(--color-focus);
  --backdrop: var(--color-scrim); --wash: var(--color-wash);
  --edge: 0 0 0 1px var(--color-ring);
  --sh-control: var(--edge), var(--shadow-1); --sh-card: var(--edge), var(--shadow-1); --sh-lift: var(--edge), var(--shadow-2);
  --sh-dialog: var(--edge), var(--shadow-3); --well-edge: inset 0 0 0 1px var(--color-ring);
  --font: var(--font-sans); --mono: var(--font-mono); --w-text: 400; --w-strong: 500;
${Object.entries(BLOCK_TYPE).map(([b, k]) => `  --t-${b}: var(--text-${k}); --l-${b}: var(--leading-${k}); --k-${b}: var(--tracking-${k});`).join('\n')}
  --t-field: var(--t-body);
  --r-tag: var(--radius-xs); --r-control: var(--radius-sm); --r-card: var(--radius-md); --r-sheet: var(--radius-lg); --r-full: var(--radius-full);
  ${[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24].map((k) => `--s-${k}: var(--space-${k});`).join(' ')}
  --gap-section: var(--gap-group); --gutter: var(--page-gutter);
  --h-control: var(--control-md); --h-small: var(--control-sm); --h-cta: var(--control-md); --h-row: 40px; --h-tag: 20px; --h-bar: 48px;
  --sw-w: 32px; --sw-h: 20px; --sw-knob: 16px;
  --w-form: 400px; --w-settings: 680px; --w-pricing: 1040px; --w-data: 1120px;
  --ease-move: var(--ease-out);
}
@media (pointer: coarse) { :root { --t-field: 16px; } }
${BLOCK_RULES}`;

const tw = `/* ${name} tokens as a Tailwind v4 theme. Import after "tailwindcss" and after tokens.css. */
@theme inline {
${Object.keys(light).map((k) => `  --color-${k}: var(--color-${k});`).join('\n')}
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);
${[...Object.keys(type), ...Object.keys(DISPLAY)].map((k) => `  --text-${k}: var(--text-${k});\n  --text-${k}--line-height: var(--leading-${k});\n  --text-${k}--letter-spacing: var(--tracking-${k});`).join('\n')}
${Object.keys(radius).map((k) => `  --radius-${k}: var(--radius-${k});`).join('\n')}
${[1, 2, 3, 4].map((k) => `  --shadow-${k}: var(--shadow-${k});`).join('\n')}
  --ease-out: var(--ease-out);
  --ease-in: var(--ease-in);
  --ease-in-out: var(--ease-in-out);
}
`;

const dtcg = {
  $description: `${name} design tokens (brand ${brandHex}, ${mood}, ${shape}, ${density}). W3C Design Tokens format.`,
  color: {
    light: Object.fromEntries(Object.entries(light).map(([k, v]) => [k, { $type: 'color', $value: v }])),
    dark: Object.fromEntries(Object.entries(dark).map(([k, v]) => [k, { $type: 'color', $value: v }])),
  },
  font: {
    family: { sans: { $type: 'fontFamily', $value: stack.sans }, display: { $type: 'fontFamily', $value: stack.display }, mono: { $type: 'fontFamily', $value: stack.mono } },
    size: Object.fromEntries([...Object.entries(type), ...Object.entries(DISPLAY)].map(([k, t]) => [k, { $type: 'dimension', $value: { value: t.px, unit: 'px' } }])),
    weight: { display: { $type: 'fontWeight', $value: displayWeight } },
  },
  space: Object.fromEntries(Object.entries(SPACE).map(([k, v]) => [String(k).replace('.', '_'), { $type: 'dimension', $value: { value: v, unit: 'px' } }])),
  radius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, { $type: 'dimension', $value: { value: v, unit: 'px' } }])),
  duration: Object.fromEntries(Object.entries(motion).filter(([k]) => k.startsWith('dur')).map(([k, v]) => [k, { $type: 'duration', $value: { value: parseInt(v, 10), unit: 'ms' } }])),
  easing: Object.fromEntries(['ease-out', 'ease-in', 'ease-in-out'].map((k) => [k, { $type: 'cubicBezier', $value: motion[k].match(/[\d.]+/g).map(Number) }])),
};

// contrast report: the pairs people actually read
const PAIRS = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text-muted', 'bg', 4.5], ['text-muted', 'surface-2', 4.5], ['accent-fg', 'accent', 4.5],
  ['accent-text', 'bg', 4.5], ['focus', 'bg', 3], ['border-strong', 'bg', 1.5], ['danger', 'bg', 4.5], ['danger-text', 'danger-soft', 4.5],
  ['success-text', 'success-soft', 4.5], ['warning-text', 'warning-soft', 4.5], ['info-text', 'info-soft', 4.5],
  ['on-field', 'field', 7], ['on-field-muted', 'field', 4.5], ['on-field-accent', 'field', 4.5],
];
const report = [];
for (const [label, t] of [['light', light], ['dark', dark]])
  for (const [fg, bg, min] of PAIRS) {
    const r = contrast(t[fg], t[bg]);
    report.push({ theme: label, pair: `${fg} on ${bg}`, ratio: +r.toFixed(2), min, pass: r >= min });
  }

const preview = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}: design tokens</title>
<link rel="stylesheet" href="${googleFonts}">
<link rel="stylesheet" href="./tokens.css">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--color-bg); color: var(--color-text); font: var(--text-base)/var(--leading-base) var(--font-sans); -webkit-font-smoothing: antialiased; }
  main { max-width: var(--content-max); margin: 0 auto; padding: var(--space-12) var(--space-6) var(--space-24); }
  h1, h2 { font-family: var(--font-display); margin: 0; text-wrap: balance; }
  h1 { font-size: var(--text-4xl); line-height: var(--leading-4xl); letter-spacing: var(--tracking-4xl); }
  h2 { font-size: var(--text-xl); line-height: var(--leading-xl); letter-spacing: var(--tracking-xl); margin-top: var(--space-16); margin-bottom: var(--space-6); }
  p.lead { color: var(--color-text-muted); max-width: var(--measure); font-size: var(--text-lg); margin: var(--space-3) 0 0; }
  .row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
  .grid { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); }
  .sw { border-radius: var(--radius-md); border: 1px solid var(--color-border); overflow: hidden; background: var(--color-surface); }
  .sw i { display: block; height: 3.5rem; }
  .sw b, .sw code { display: block; padding: 0 var(--space-3); font-size: var(--text-xs); font-weight: 500; }
  .sw b { padding-top: var(--space-2); } .sw code { color: var(--color-text-muted); padding-bottom: var(--space-2); font-family: var(--font-mono); }
  .type div { display: flex; gap: var(--space-6); align-items: baseline; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border); }
  .type code { width: 6rem; flex: none; color: var(--color-text-muted); font: var(--text-xs) var(--font-mono); }
  .type span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .btn { height: var(--control-md); padding: 0 var(--space-4); border-radius: var(--radius-md); border: 1px solid transparent; font: 500 var(--text-sm)/1 var(--font-sans); cursor: pointer;
         transition: background-color var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out); }
  .btn:active { transform: scale(0.97); }
  .btn:focus-visible { outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset); }
  .primary { background: var(--color-accent); color: var(--color-accent-fg); } .primary:hover { background: var(--color-accent-hover); }
  .secondary { background: var(--color-surface); color: var(--color-text); border-color: var(--color-border-strong); } .secondary:hover { background: var(--color-surface-2); }
  .ghost { background: transparent; color: var(--color-text); } .ghost:hover { background: var(--color-surface-2); }
  .danger { background: var(--color-surface); color: var(--color-danger); border-color: var(--color-border-strong); }
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-1); max-width: 26rem; }
  .card .inner { margin-top: var(--space-4); padding: var(--space-3); border-radius: calc(var(--radius-lg) - var(--space-3)); background: var(--color-surface-2); font-size: var(--text-sm); color: var(--color-text-muted); }
  .field { display: grid; gap: var(--space-1_5); max-width: 22rem; }
  .field label { font-size: var(--text-sm); font-weight: 500; }
  .field input { height: var(--control-md); padding: 0 var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--color-border-strong); background: var(--color-surface); color: var(--color-text); font: inherit; }
  .field input:focus-visible { outline: var(--focus-width) solid var(--color-focus); outline-offset: 0; border-color: transparent; }
  .badge { display: inline-flex; align-items: center; gap: var(--space-1); height: 1.5rem; padding: 0 var(--space-2); border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
  .shadows div { height: 5rem; border-radius: var(--radius-lg); background: var(--color-surface); display: grid; place-items: center; font-size: var(--text-xs); color: var(--color-text-muted); }
  .ball { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--color-accent); }
  .track { background: var(--color-surface-2); border-radius: var(--radius-full); padding: var(--space-1); margin-bottom: var(--space-2); }
  .track .ball { transition: translate var(--dur-spring) var(--ease-spring); }
  .track.out .ball { transition: translate var(--dur-slow) var(--ease-out); }
  .go .track .ball { translate: calc(min(36rem, 70vw)) 0; }
  table { border-collapse: collapse; font-size: var(--text-sm); width: 100%; max-width: 40rem; }
  td, th { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); }
  td.n { font-variant-numeric: tabular-nums; text-align: right; }
  .theme { position: fixed; top: var(--space-4); right: var(--space-4); }
</style>
</head>
<body>
<button class="btn secondary theme" type="button" onclick="const r=document.documentElement;r.dataset.theme=r.dataset.theme==='dark'?'light':'dark'">Switch theme</button>
<main>
  <h1 style="font-size:var(--text-display-1);line-height:var(--leading-display-1);letter-spacing:var(--tracking-display-1);font-weight:var(--weight-display);max-width:12em">${name}, set at display size</h1>
  <p class="lead">A ${mood} system: ${shape} corners, ${density} density, ${paper} paper, ${sansFont}${displayFont !== sansFont ? ` with ${displayFont} for display` : ''}. Every color pair below passes WCAG 2.2.</p>
  <section style="margin:var(--space-12) calc(50% - 50vw) 0;padding:var(--space-24) max(var(--space-6),calc(50vw - 50% + var(--space-6)));background:var(--color-field);color:var(--color-on-field)">
    <p style="margin:0;font:var(--weight-display) var(--text-display-num)/var(--leading-display-num) var(--font-display);letter-spacing:var(--tracking-display-num);font-variant-numeric:tabular-nums">48<span style="font-size:var(--text-2xl);letter-spacing:0;color:var(--color-on-field-accent)"> hrs</span></p>
    <p style="margin:var(--space-4) 0 0;max-width:var(--measure);color:var(--color-on-field-muted)">The field: one or two full-bleed scenes per page sit on it: a statement, a number as the image, the closing line. It keeps its color in dark mode.</p>
  </section>

  <h2>Color</h2>
  <div class="grid">${Object.keys(light).filter((k) => k !== 'scrim').map((k) => `<div class="sw"><i style="background:var(--color-${k})"></i><b>${k}</b><code>--color-${k}</code></div>`).join('')}</div>

  <h2>Type</h2>
  <div class="type">${Object.entries(type).reverse().map(([k, t]) => `<div><code>${k} · ${t.px}px</code><span style="font-family:${t.px >= 24 ? 'var(--font-display)' : 'var(--font-sans)'};font-size:var(--text-${k});line-height:var(--leading-${k});letter-spacing:var(--tracking-${k})">The quick brown fox jumps over the lazy dog</span></div>`).join('')}</div>

  <h2>Components</h2>
  <div class="row">
    <button class="btn primary" type="button">Save changes</button>
    <button class="btn secondary" type="button">Cancel</button>
    <button class="btn ghost" type="button">Learn more</button>
    <button class="btn danger" type="button">Delete project</button>
  </div>
  <div class="row" style="margin-top:var(--space-4)">
    <span class="badge" style="background:var(--color-success-soft);color:var(--color-success-text)">● Active</span>
    <span class="badge" style="background:var(--color-warning-soft);color:var(--color-warning-text)">● Pending</span>
    <span class="badge" style="background:var(--color-danger-soft);color:var(--color-danger-text)">● Failed</span>
    <span class="badge" style="background:var(--color-info-soft);color:var(--color-info-text)">● Draft</span>
    <span class="badge" style="background:var(--color-accent-soft);color:var(--color-accent-text)">New</span>
  </div>
  <div class="row" style="margin-top:var(--space-8);align-items:flex-start;gap:var(--space-8)">
    <div class="card"><strong>Nested corners</strong><p style="margin:var(--space-1) 0 0;color:var(--color-text-muted);font-size:var(--text-sm)">The inner box's radius is the card's minus its gap, so the curves stay parallel.</p><div class="inner">radius-lg − space-3</div></div>
    <div class="field"><label for="e">Email</label><input id="e" type="email" autocomplete="email" placeholder="you@example.com"><small style="color:var(--color-text-muted)">We only use it to sign you in.</small></div>
  </div>
  <table style="margin-top:var(--space-8)"><thead><tr><th>Order</th><th>Customer</th><th style="text-align:right">Total</th></tr></thead>
    <tbody><tr><td>#1042</td><td>Ana Ruiz</td><td class="n">$1,284.00</td></tr><tr><td>#1041</td><td>Kenji Mori</td><td class="n">$96.50</td></tr><tr><td>#1040</td><td>Lea Brandt</td><td class="n">$410.25</td></tr></tbody></table>

  <h2>Space, shape and depth</h2>
  <div class="row">${Object.entries(SPACE).filter(([, v]) => v >= 4 && v <= 64).map(([k, v]) => `<div title="--space-${k}" style="width:${v}px;height:${v}px;background:var(--color-accent-soft);border:1px solid var(--color-border)"></div>`).join('')}</div>
  <div class="row" style="margin-top:var(--space-4)">${Object.entries(radius).filter(([k]) => k !== 'full').map(([k, v]) => `<div style="width:4rem;height:4rem;border:1px solid var(--color-border-strong);border-radius:${v}px;display:grid;place-items:center;font-size:var(--text-xs)">${k}</div>`).join('')}</div>
  <div class="grid shadows" style="margin-top:var(--space-6)">${[1, 2, 3, 4].map((k) => `<div style="box-shadow:var(--shadow-${k})">shadow-${k}</div>`).join('')}</div>

  <h2>Motion</h2>
  <p class="lead" style="font-size:var(--text-sm)">Top: the spring (${sp.ms}ms). Bottom: ease-out at --dur-slow. <button class="btn secondary" type="button" onclick="document.body.classList.toggle('go')">Play</button></p>
  <div class="track"><div class="ball"></div></div>
  <div class="track out"><div class="ball"></div></div>
</main>
</body>
</html>
`;

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'tokens.css'), css);
writeFileSync(join(out, 'tokens.tailwind.css'), tw);
writeFileSync(join(out, 'tokens.json'), JSON.stringify(dtcg, null, 2));
writeFileSync(join(out, 'preview.html'), preview);
writeFileSync(join(out, 'layout.css'), LAYOUT);
writeFileSync(join(out, 'motion.css'), MOTION);

// contrast is hierarchy as well as a minimum: each role has a band. Too low fails people; too high in dark mode glares,
// and roles that land on the same ratio flatten the page.
const BANDS = {
  light: [['text', 'bg', 12, 21], ['text-muted', 'bg', 4.5, 7.5], ['text-subtle', 'bg', 3, 4.5], ['border-strong', 'bg', 1.6, 3.5], ['border', 'bg', 1.15, 1.6]],
  dark: [['text', 'bg', 10, 16.5], ['text-muted', 'bg', 4.5, 8], ['text-subtle', 'bg', 3, 4.5], ['border-strong', 'bg', 1.6, 3.5], ['border', 'bg', 1.15, 1.6]],
};
const bandNotes = [];
for (const [label, t] of [['light', light], ['dark', dark]])
  for (const [fg, bg, lo, hi] of BANDS[label]) {
    const r = contrast(t[fg], t[bg]);
    if (r < lo - 0.05 || r > hi + 0.05) bandNotes.push(`${label} ${fg} ${r.toFixed(1)}:1 (band ${lo} to ${hi})`);
  }
// dark surfaces must step visibly, or cards melt into the page
const Lof = (hex) => rgbToOklch(hexToRgb(hex))[0];
const steps = [['bg', 'surface'], ['surface', 'surface-2']].map(([a, b]) => Lof(dark[b]) - Lof(dark[a]));
if (steps.some((d) => d < 0.03)) bandNotes.push(`dark surfaces step by ${steps.map((d) => d.toFixed(3)).join(' and ')} in lightness (needs 0.03+)`);
const failed = report.filter((r) => !r.pass);
console.log(`${name}: ${mood}, ${shape}, ${density}, ${typeStyle}, brand ${brandHex} (oklch ${brand.map((v, i) => (i === 2 ? Math.round(v) : v.toFixed(3))).join(' ')})`);
console.log(`fonts: ${families.join(', ')}  →  ${googleFonts}`);
console.log(`type: ${Object.entries(type).map(([k, t]) => `${k} ${t.px}`).join(' · ')}   spring: ${sp.ms}ms`);
console.log(`display: ${Object.entries(DISPLAY).map(([k, t]) => `${k} ${t.min} to ${t.px}`).join(' · ')} in ${displayFont} ${displayWeight}   paper: ${paper}   field: ${light.field}`);
console.log(`contrast: ${report.length - failed.length}/${report.length} pairs pass${failed.length ? `, FAILS: ${failed.map((f) => `${f.theme} ${f.pair} ${f.ratio}`).join('; ')}` : ''}`);
console.log(`hierarchy: ${bandNotes.length ? `outside its band, ${bandNotes.join('; ')}` : 'every text, border and surface role sits in its band, light and dark'}`);
for (const n of notes) console.log(`note: ${n}`);
console.log(`wrote ${out}/tokens.css, layout.css, motion.css, tokens.tailwind.css, tokens.json, preview.html`);
