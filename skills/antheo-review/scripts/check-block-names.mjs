#!/usr/bin/env node
/*
 * Checks that every var(--name) a skill's recipe, kit or pattern card reads is defined by the style block
 * (antheo-build/references/quiet.css) or declared in the same file. A recipe that reads a name nobody defines
 * silently breaks its declaration: a transition with an unknown duration does not run at all.
 *   node check-block-names.mjs            every .md and .css under the skills folder this script sits in
 *   node check-block-names.mjs page.html  one built page: names it reads but never defines
 *   node check-block-names.mjs src        a project in any stack: .css .scss .less .html .vue .svelte .astro .jsx
 *                                         .tsx and templates; a name defined in any of them (the pasted block, a
 *                                         global stylesheet) counts as defined for all of them
 * Exit code 1 when a name is undefined.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skills = resolve(here, '..', '..');
const block = readFileSync(join(skills, 'antheo-build', 'references', 'quiet.css'), 'utf8');
// `--name: value` in CSS, and `'--name': value` as a key of a style object (React, Vue, Svelte)
const declared = (css) => new Set([...css.matchAll(/(--[a-z0-9_-]+)['"`]?\]?\s*:/gi)].map((m) => m[1]));
const reads = (css) => [...css.matchAll(/var\(\s*(--[a-z0-9_-]+)\s*([,)])/gi)].map((m) => ({ name: m[1], fallback: m[2] === ',' }));
const BLOCK = declared(block);
// names set from script or inline style by a recipe, and the few a brand page adds on purpose (antheo-direction)
const BRAND = /^--(color-(field|on-field|on-field-muted|on-field-accent|selection)|font-display|weight-display|text-display|leading-display|tracking-display)/;

const LOCAL = /^--[a-z][0-9]?$/; // a one-letter local a snippet sets in a style attribute (--i, --d, --c2)

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? walk(p) : /\.(md|css)$/.test(e.name) ? [p] : [];
});
const SKIP = ['antheo-icons', 'antheo-tufts', 'antheo-tokens', 'antheo-system', 'default-tokens.css'];
const SOURCE = /\.(css|scss|sass|less|html?|vue|svelte|astro|jsx|tsx|js|ts|erb|jinja2?|j2|twig|liquid|hbs|njk|php|heex)$/i;
const SKIP_DIR = new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.angular', 'dist', 'build', 'coverage', 'out']);
const walkSource = (p) => {
  const st = statSync(p);
  if (!st.isDirectory()) return [p];
  return readdirSync(p, { withFileTypes: true }).flatMap((e) => (SKIP_DIR.has(e.name) ? [] : e.isDirectory() ? walkSource(join(p, e.name)) : SOURCE.test(e.name) ? [join(p, e.name)] : []));
};
const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const target = targets.length > 0;
const files = target ? targets.flatMap((t) => walkSource(resolve(t))) : walk(skills).filter((f) => !SKIP.some((s) => f.includes(s)));
// in a project, a name defined in any file it was given is defined for all of them
const PROJECT = new Set(target ? files.flatMap((f) => [...declared(readFileSync(f, 'utf8'))]) : []);

let bad = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const own = declared(text);
  // a name written into a style attribute or set from script counts as declared in the file
  for (const m of text.matchAll(/setProperty\(\s*['"`](--[a-z0-9_-]+)/gi)) own.add(m[1]);
  const missing = new Map();
  for (const { name, fallback } of reads(text)) {
    // a built page must define what it reads itself; a skill file may lean on the block
    if ((!target && BLOCK.has(name)) || own.has(name) || PROJECT.has(name) || fallback || BRAND.test(name) || LOCAL.test(name)) continue;
    missing.set(name, (missing.get(name) ?? 0) + 1);
  }
  if (missing.size) {
    bad += missing.size;
    console.log((target ? f.replace(process.cwd(), '') : f.replace(skills, '')).replace(/\\/g, '/').replace(/^\//, ''));
    for (const [name, n] of missing) console.log(`  ${name}  (${n})`);
  }
}
console.log(bad ? `${bad} undefined name(s)` : `every name read is defined (${files.length} file${files.length === 1 ? '' : 's'})`);
process.exit(bad ? 1 : 0);
