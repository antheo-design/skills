#!/usr/bin/env node
/*
 * Builds ANTHEO-CORE.md: the core of the Antheo skills in one file, for agents and tools that don't load skills
 * (Cursor rules, Aider, a local or small model). It is generated from the skills themselves, never edited by hand,
 * so it can't drift: the style block whole, antheo-build's rules, the traps that matter most, and the gate.
 *
 *   node scripts/build-core.mjs [out]      default: ANTHEO-CORE.md next to skills/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// the traps an agent most often walks into, by their id in antheo-components/references/traps.md
const TRAPS = ['F2', 'F3', 'F4', 'L2', 'S1', 'S6', 'S7', 'S8', 'S10', 'D4'];

export function buildCore(skillsDir) {
  const read = (p) => fs.readFileSync(path.join(skillsDir, p), 'utf8').replace(/\r\n/g, '\n');
  const build = read('antheo-build/SKILL.md');
  const section = (from, to) => {
    const a = build.indexOf(from);
    const b = build.indexOf(to, a + from.length);
    if (a < 0 || b < 0) throw new Error(`antheo-build/SKILL.md has no section between "${from}" and "${to}"`);
    return build.slice(a, b).trim();
  };
  const css = read('antheo-build/references/quiet.css').trim();
  const traps = read('antheo-components/references/traps.md').split('\n');
  const head = traps.find((l) => /^\| ID \| Trap/.test(l));
  const rows = TRAPS.map((id) => {
    const row = traps.find((l) => l.startsWith(`| ${id} |`));
    if (!row) throw new Error(`traps.md has no ${id}`);
    return row;
  });

  return `<!-- Generated from the Antheo skills by scripts/build-core.mjs. Don't edit: change the skills and rebuild. -->
# Antheo core

The core of the Antheo design skills in one file, for an agent or tool that doesn't load skills: paste it into your
rules (Cursor, Aider, a system prompt). It holds the style block, the rules every build follows, the traps that
matter most and the gate. The full set, with colour, type, motion, access, data and the rest, is at
https://github.com/antheo-design/skills.

${section('## What always holds, and what is the Quiet preset', '## 1. Paste the style block first')}

${section('## 1. Paste the style block first', '## 3. Then the screen')}

## The traps that look finished and break in use

${head}
|---|---|---|---|
${rows.join('\n')}

## Done means checked

With the full skills installed, the gate checks the page in a real browser and the words in the source, and keeps
the work open until both pass:

\`\`\`sh
node <antheo-review>/scripts/gate.mjs arm http://localhost:5173/ --copy src
node <antheo-review>/scripts/gate.mjs check     # PASS, or what to fix
node <antheo-review>/scripts/gate.mjs rearm     # after any later change, then check again
\`\`\`

Without it: open the page at 390 and 1280px, light and dark, count text sizes, weights, corners, accent things, tags
and hairlines against the rules above, press every control, and read the console.

## The style block: references/quiet.css

\`\`\`css
${css}
\`\`\`
`;
}

// The mini core, for small local models: the policy, each rule's first sentence, and the style block without comments
// or extra spacing (the same CSS, just smaller).
export function buildCoreMini(skillsDir) {
  const read = (p) => fs.readFileSync(path.join(skillsDir, p), 'utf8').replace(/\r\n/g, '\n');
  const build = read('antheo-build/SKILL.md');
  const between = (from, to) => {
    const a = build.indexOf(from);
    const b = build.indexOf(to, a + from.length);
    if (a < 0 || b < 0) throw new Error(`antheo-build/SKILL.md has no section between "${from}" and "${to}"`);
    return build.slice(a + from.length, b).trim();
  };
  const always = between('## What always holds, and what is the Quiet preset', '## Match the person');
  // each numbered rule, joined onto one line, cut after its first sentence
  const rules = between('## 2. The usage rules', '## 3. Then the screen')
    .split(/\n(?=\d+\. \*\*)/)
    .map((r) => r.replace(/\s*\n\s*/g, ' ').trim())
    .map((r) => { const m = r.match(/^(\d+\. \*\*[^*]+\*\*\s*[^.]*?\.)(\s|$)/); return m ? m[1] : r; });
  const css = read('antheo-build/references/quiet.css')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};:,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
  return `<!-- Generated from the Antheo skills by scripts/build-core.mjs. Don't edit: change the skills and rebuild. -->
# Antheo core, mini

The smallest form of the Antheo design skills, for a small or local model. Paste the style block as the first CSS,
follow the rules, and check the page at 390 and 1280px, light and dark. The full rules are in ANTHEO-CORE.md and the
skills: https://github.com/antheo-design/skills

## What always holds, and the Quiet preset

${always}

## The rules (first sentences; ANTHEO-CORE.md has them whole)

${rules.join('\n')}

## The style block (references/quiet.css, comments removed)

\`\`\`css
${css}
\`\`\`
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // the public repo keeps skills/ beside scripts/; the source repo keeps them two levels up
  const skills = [path.resolve(here, '..', 'skills'), path.resolve(here, '..', '..', 'skills')].find((d) => fs.existsSync(path.join(d, 'antheo-build')));
  const out = path.resolve(process.argv[2] ?? path.join(skills, '..', 'ANTHEO-CORE.md'));
  fs.writeFileSync(out, buildCore(skills));
  const mini = out.replace(/\.md$/, '-MINI.md');
  fs.writeFileSync(mini, buildCoreMini(skills));
  console.log(`wrote ${out} and ${mini}`);
}
