#!/usr/bin/env node
/*
 * Contrast of two colors (WCAG 2.2), with APCA as a second opinion, and the nearest passing text color if it fails.
 *   node contrast.mjs "#6b6b6b" "#ffffff"              text color, background color
 *   node contrast.mjs "#6b6b6b" "#ffffff" --large       24px+ text (3:1 is enough)
 *   node contrast.mjs "rgb(0 0 0 / 0.55)" "#faf7f0"     a translucent text color is blended over the background first
 *   node contrast.mjs --tokens tokens.css               every text/background role pair in a token file, light and dark
 * Colors: #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() and oklch(), with alpha. No dependencies.
 */
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const parse = (raw) => {
  const s = String(raw ?? '').trim().toLowerCase();
  let m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    return { c: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255), a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    const ch = (x) => (x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x) / 255);
    return { c: p.slice(0, 3).map(ch), a: p[3] === undefined ? 1 : p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]) };
  }
  // oklch(L C H [/ a]): every product token is written this way
  m = s.match(/^oklch\(([^)]+)\)$/);
  if (m) {
    const [main, al] = m[1].split('/');
    const [Ls, Cs, Hs] = main.trim().split(/\s+/);
    const L = Ls.endsWith('%') ? parseFloat(Ls) / 100 : parseFloat(Ls);
    const C = parseFloat(Cs) || 0, H = ((parseFloat(Hs) || 0) * Math.PI) / 180;
    const A = C * Math.cos(H), B = C * Math.sin(H);
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, mm = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, sx = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const linRgb = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * sx, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * sx, -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * sx];
    const enc = (v) => { v = Math.max(0, Math.min(1, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; };
    const a = al === undefined ? 1 : al.trim().endsWith('%') ? parseFloat(al) / 100 : parseFloat(al);
    return { c: linRgb.map(enc), a };
  }
  return null;
};
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (c) => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const blend = (fg, bg) => fg.c.map((v, i) => v * fg.a + bg.c[i] * (1 - fg.a));
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;

// APCA (0.0.98G constants): a perceptual lightness contrast, signed; reported as |Lc|
function apca(text, back) {
  const Y = (c) => { const [r, g, b] = c.map((v) => v ** 2.4); const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b; return y > 0.022 ? y : y + (0.022 - y) ** 1.414; };
  const yt = Y(text), yb = Y(back);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  const lc = yb > yt ? (yb ** 0.56 - yt ** 0.57) * 1.14 : (yb ** 0.65 - yt ** 0.62) * 1.14;
  const out = Math.abs(lc) < 0.1 ? 0 : lc > 0 ? lc - 0.027 : lc + 0.027;
  return Math.round(Math.abs(out) * 100);
}

if (argv.includes('--tokens')) {
  const file = argv[argv.indexOf('--tokens') + 1];
  const css = readFileSync(file, 'utf8');
  const [lightCss, darkCss = ''] = css.split(/@media \(prefers-color-scheme: dark\)/);
  const read = (block) => Object.fromEntries([...block.matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const themes = { light: read(lightCss), dark: { ...read(lightCss), ...read(darkCss) } };
  const PAIRS = [['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text-muted', 'bg', 4.5], ['text-muted', 'surface', 4.5], ['text-subtle', 'bg', 3], ['accent-fg', 'accent', 4.5], ['accent-text', 'bg', 4.5], ['focus', 'bg', 3], ['danger-text', 'danger-soft', 4.5], ['on-field', 'field', 4.5]];
  let fails = 0;
  for (const [name, t] of Object.entries(themes)) {
    for (const [f, b, min] of PAIRS) {
      const F = parse(t[f]), B = parse(t[b]);
      if (!F || !B) continue;
      const r = ratio(blend(F, B), B.c);
      if (r < min) fails++;
      console.log(`${name.padEnd(5)} ${`${f} on ${b}`.padEnd(28)} ${r.toFixed(2).padStart(5)}:1  APCA ${String(apca(blend(F, B), B.c)).padStart(3)}  ${r >= min ? 'ok' : `FAILS (needs ${min}:1)`}`);
    }
  }
  process.exit(fails ? 1 : 0);
}

const [fgRaw, bgRaw] = argv.filter((a) => !a.startsWith('--'));
const large = argv.includes('--large');
const F = parse(fgRaw), B = parse(bgRaw);
if (!F || !B) {
  console.error('usage: node contrast.mjs <text color> <background color> [--large]   |   node contrast.mjs --tokens tokens.css');
  process.exit(2);
}
if (B.a < 1) console.error('note: the background is translucent; it was treated as opaque. Pass the color it sits on instead.');
const text = blend(F, B);
const min = large ? 3 : 4.5;
const r = ratio(text, B.c);
const lc = apca(text, B.c);
console.log(`${fgRaw}${F.a < 1 ? ` (blends to ${hex(text)})` : ''} on ${bgRaw}: ${r.toFixed(2)}:1, ${r >= min ? 'passes' : 'FAILS'} ${large ? 'large text (3:1)' : 'text (4.5:1)'}${r >= 7 ? ', and AAA (7:1)' : ''}`);
console.log(`APCA Lc ${lc}: ${lc >= 75 ? 'fine for body text' : lc >= 60 ? 'fine for other text, short of body text (75)' : lc >= 45 ? 'large headlines only (45)' : lc >= 30 ? 'solid icons and controls only (30)' : lc >= 15 ? 'dividers only (15)' : 'not visible enough for anything'}  (a second opinion; WCAG 2.2 above is the requirement)`);
if (r < min) {
  // walk the text color toward black or white, whichever the background allows, keeping its hue
  const darker = lum(B.c) > 0.18;
  let c = [...text];
  for (let i = 0; i < 100 && ratio(c, B.c) < min; i++) c = c.map((v) => (darker ? v * 0.97 : v + (1 - v) * 0.04));
  console.log(`nearest passing text color: ${hex(c)} (${ratio(c, B.c).toFixed(2)}:1)`);
}
