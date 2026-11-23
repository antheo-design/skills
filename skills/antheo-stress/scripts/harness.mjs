#!/usr/bin/env node
/*
 * Antheo harness: one throwaway HTML page that shows a component in every state, at every width it is used at, and
 * with awkward content pushed through each of its slots (references/harness.md, sections 1 and 4).
 *
 *   node harness.mjs card.harness.json                    writes card.harness.html beside it
 *   node harness.mjs card.harness.json --out tmp/harness.html
 *
 * Only for a component that is HTML and CSS: a pattern built from classes, or the output of a server template. A
 * component that lives in a framework is rendered by a harness route written by hand, through its real props: this
 * script would only copy its markup, and a copy proves nothing about the component.
 *
 * The JSON:
 *   { "title": "Invoice card",
 *     "css": ["../src/styles/quiet.css", "../src/styles/invoice.css"],     linked as written, relative to the page
 *     "widths": [320, 480],                                                the widths the component gets in use
 *     "template": "<article class=\"card\"><h2>{{name}}</h2><p>{{email}}</p><p>{{amount}}</p></article>",
 *     "states": { "default": { "name": "Joanna Lindqvist", "email": "joanna@example.com", "amount": "4,800.00" },
 *                 "loading": { "html": "<article class=\"card\" aria-busy=\"true\">…</article>" },
 *                 "long": { "name": "Alexandria Montgomery-Featherstonehaugh III", … } } }
 * A state is the values for the template's {{slots}} (escaped; {{{slot}}} is written as HTML), or its own "html"
 * when it is built differently (loading, empty, error). A slot the state leaves out is taken from "default".
 *
 * The page: ?state=<name> shows one state, ?state=fixtures the awkward content, nothing shows all. Each cell is
 * labelled with the state and the width and nothing else. The seven states the reference asks for (loading, empty,
 * error, partial, long, success, disabled) are named when one is missing. Delete the page when the work is done.
 * Exit codes: 0 written · 2 wrong usage · 4 the JSON could not be read or has no template or states.
 * No dependencies: plain Node 18+.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const file = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out');
if (!file || (argv.includes('--out') && !argv[argv.indexOf('--out') + 1])) { console.error('usage: node harness.mjs <harness.json> [--out harness.html]'); process.exit(2); }
const out = resolve(argv.includes('--out') ? argv[argv.indexOf('--out') + 1] ?? '' : file.replace(/(\.json)?$/, '.html'));
let spec;
try { spec = JSON.parse(readFileSync(resolve(file), 'utf8')); } catch (e) { console.error(`Could not read ${file}: ${String(e.message).split('\n')[0]}. Nothing was written.`); process.exit(4); }
if (typeof spec.template !== 'string' || !spec.states || typeof spec.states !== 'object' || !Object.keys(spec.states).length) { console.error(`${file} needs a "template" and at least one entry in "states". Nothing was written.`); process.exit(4); }

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const base = spec.states.default && !spec.states.default.html ? spec.states.default : {};
// a state's own html, or the template with its values (missing ones from "default")
const render = (values) => (typeof values.html === 'string' ? values.html
  : spec.template.replace(/\{\{\{\s*([\w.-]+)\s*\}\}\}|\{\{\s*([\w.-]+)\s*\}\}/g, (_, raw, safe) => (raw ? String(values[raw] ?? base[raw] ?? '') : esc(values[safe] ?? base[safe]))));
const widths = Array.isArray(spec.widths) && spec.widths.length ? spec.widths.map(Number).filter((w) => w > 0) : [320];
const cell = (group, label, html, width) => `<section data-state="${esc(group)}"><p class="harness-label">${esc(label)} · ${width}px</p><div class="harness-cell" style="width:${width}px">${html}</div></section>`;

// the awkward content of the reference's fixtures list, one slot at a time, at the narrowest width
const FIXTURES = {
  'a long name with no break': 'Maximiliana-Alexandrina Featherstonehaugh-Montgomery',
  'one word of 70 letters': 'Übersetzungsverwaltungsdienstleistungsunternehmensgesellschaftsvertrag',
  'accents and apostrophes': 'Siobhán O\'Brien-Núñez and Zoë O’Neil',
  'right to left': 'محمد الفاسي (@mfassi)',
  emoji: 'Sam 🌱🚀 👩🏽‍💻',
  empty: '',
  'one character': 'J',
  'text that looks like markup': '<b>Ana</b> & Co "Ltd"',
  'a 64-character email name': 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl@example.com',
  'seven digits': '1,234,567.89',
  negative: '-48.20',
  zero: '0',
};
const slots = [...new Set([...spec.template.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1]))];
const narrow = Math.min(...widths);
const cells = [
  ...Object.entries(spec.states).flatMap(([name, values]) => widths.map((w) => cell(name, name, render(values), w))),
  ...slots.flatMap((slot) => Object.entries(FIXTURES).map(([what, value]) => cell('fixtures', `${slot}: ${what}`, render({ ...base, [slot]: value }), narrow))),
];
const page = `<!doctype html>
<!-- A stress harness written by antheo-stress/scripts/harness.mjs from ${esc(file.split(/[\\/]/).pop())}. Throwaway: delete this file when the work is done. -->
<html lang="${esc(spec.lang ?? 'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(spec.title ?? 'Component')}: harness</title>
${(spec.css ?? []).map((href) => `<link rel="stylesheet" href="${esc(href)}">`).join('\n')}
<style>
  .harness { display: flex; flex-wrap: wrap; gap: 32px 24px; align-items: flex-start; padding: 24px; margin: 0; }
  .harness > h1 { flex: 0 0 100%; margin: 0; font: 600 14px/20px system-ui, sans-serif; }
  .harness-label { margin: 0 0 8px; font: 12px/16px ui-monospace, monospace; opacity: 0.7; }
  .harness-cell { max-width: 100%; }
  .harness [hidden] { display: none; }
</style></head>
<body><main class="harness"><h1>${esc(spec.title ?? 'Component')}: every state${slots.length ? ', then awkward content in each slot' : ''}</h1>
${cells.join('\n')}
</main>
<script>
  // ?state=loading shows one state, ?state=fixtures the awkward content; with nothing, or all, everything shows
  const want = new URLSearchParams(location.search).get('state') ?? 'all';
  for (const s of document.querySelectorAll('[data-state]')) s.hidden = want !== 'all' && s.dataset.state !== want;
</script></body></html>
`;
writeFileSync(out, page);
const missing = ['loading', 'empty', 'error', 'partial', 'long', 'success', 'disabled'].filter((s) => !(s in spec.states));
console.log(`wrote ${out}: ${Object.keys(spec.states).length} state(s) at ${widths.join(', ')}px${slots.length ? `, and ${Object.keys(FIXTURES).length} awkward values through each of ${slots.length} slot(s) (${slots.join(', ')}) at ${narrow}px` : ''}.`);
if (missing.length) console.log(`not covered yet: ${missing.join(', ')}. Add each to "states", or say in the report why the component has no such state.`);
console.log('Open it, then run check-page.mjs on it with --stress; delete the page when the work is done.');
