#!/usr/bin/env node
/*
 * antheo: every Antheo tool behind one short command, run straight from GitHub with no install:
 *
 *   npx github:antheo-design/skills <command> [...]
 *
 * It runs the copies of the tools that ship in this repo, in the folder you run it from, so a check reads your
 * project's Playwright and writes its state next to your work.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const SKILLS = path.join(ROOT, 'skills');

const TOOLS = {
  check: ['antheo-review/scripts/check-page.mjs', 'check a page at seven widths, light and dark: antheo check http://localhost:3000/settings'],
  gate: ['antheo-review/scripts/gate.mjs', 'keep the work open until the checks pass: antheo gate arm <url> --copy src, then antheo gate check'],
  probe: ['antheo-access/scripts/a11y-probe.mjs', 'walk a page by keyboard: focus order, traps, dialogs, zoom, forced colours'],
  lint: ['antheo-writing/scripts/copy-lint.mjs', 'weak words, vague buttons and broken plurals in your source: antheo lint src'],
  contrast: ['antheo-color/scripts/contrast.mjs', 'WCAG 2.2 and APCA contrast for two colours: antheo contrast "#6b6b6b" "#ffffff"'],
  block: ['antheo-tokens/scripts/block.mjs', 'the style block in your brand: antheo block --brand "#5d6b2f"'],
  tokens: ['antheo-tokens/scripts/tokens.mjs', 'a full token set for a design system, every pair measured'],
  inspect: ['antheo-explain/scripts/inspect.mjs', "one element's layers, styles and animations"],
  film: ['antheo-motion/scripts/filmstrip.mjs', 'film one motion, slowed, into a sheet of frames: antheo film <url> --clip ".card" --click ".card"'],
  motion: ['antheo-motion-audit/scripts/scan-motion.mjs', 'every animation in a codebase, with drift in durations and curves'],
  values: ['antheo-system/scripts/audit-values.mjs', 'every hardcoded value in a codebase, grouped and mapped to tokens'],
};

const [cmd, ...args] = process.argv.slice(2);

function help() {
  const width = Math.max(...Object.keys(TOOLS).map((k) => k.length), 'self-test'.length);
  console.log(`antheo: the Antheo design skills' tools

  npx github:antheo-design/skills <command> [...]

${Object.entries(TOOLS).map(([k, [, d]]) => `  ${k.padEnd(width)}  ${d}`).join('\n')}
  ${'init'.padEnd(width)}  put the style block in your project and the gate rule in AGENTS.md (see: antheo init --help)
  ${'doctor'.padEnd(width)}  is every installed copy of the skills up to date?
  ${'self-test'.padEnd(width)}  test the skills and tools themselves (add --browser for the page checks)

The browser checks need Playwright in your project (npm i -D playwright-core) and Chrome or Edge.
The skills themselves install with: npx skills@latest add antheo-design/skills`);
}

function run(script, rest) {
  const file = path.join(SKILLS, script);
  if (!fs.existsSync(file)) { console.error(`This copy has no ${script}.`); process.exit(2); }
  const r = spawnSync(process.execPath, [file, ...rest], { stdio: 'inherit', cwd: process.cwd() });
  process.exit(r.status ?? 1);
}

const GATE_LINE = 'Before saying a UI change is done, run the Antheo gate (`npx github:antheo-design/skills gate check`) and fix what it lists.';

function init(rest) {
  if (rest.includes('--help')) {
    console.log(`antheo init [--to <file>] [--agents]

  Copies the style block (antheo-build/references/quiet.css) into your project, without overwriting a file that is
  already there. Without --to it picks src/antheo-quiet.css, app/antheo-quiet.css or ./antheo-quiet.css, whichever
  folder exists first. Import it once, globally, before any other CSS (skills/antheo-build/references/stacks.md has
  where that is in React, Vue, Svelte, Angular, Astro, Django, Rails, Laravel and the rest).

  --agents  also adds one line to AGENTS.md (Codex, Cursor, OpenCode and others read it) telling the agent to run
            the gate before saying a UI change is done. Run it twice and the line is still there once.

  For Claude Code's automatic gate, add a Stop hook; the README shows the exact JSON.`);
    return;
  }
  const at = rest.indexOf('--to');
  const target = path.resolve(at >= 0 && rest[at + 1] ? rest[at + 1] : ['src', 'app'].map((d) => path.join(d, 'antheo-quiet.css')).find((f) => fs.existsSync(path.dirname(f))) ?? 'antheo-quiet.css');
  if (fs.existsSync(target)) console.log(`kept ${path.relative(process.cwd(), target)}: it is already there`);
  else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(SKILLS, 'antheo-build', 'references', 'quiet.css'), target);
    console.log(`wrote ${path.relative(process.cwd(), target)}: import it once, globally, before any other CSS`);
  }
  if (rest.includes('--agents')) {
    const agents = path.resolve('AGENTS.md');
    const now = fs.existsSync(agents) ? fs.readFileSync(agents, 'utf8') : '';
    if (now.includes(GATE_LINE)) console.log('kept AGENTS.md: the gate line is already there');
    else {
      fs.writeFileSync(agents, `${now}${now && !now.endsWith('\n') ? '\n' : ''}${now ? '\n' : ''}${GATE_LINE}\n`);
      console.log(`${now ? 'added the gate line to' : 'wrote'} AGENTS.md`);
    }
  }
}

// doctor: is every installed copy of the skills the same as this one (the latest, when run with npx from GitHub)?
function doctor() {
  const os = process.env.USERPROFILE || process.env.HOME || '';
  const config = process.env.CLAUDE_CONFIG_DIR;
  const places = [
    ...(config ? [path.join(config, 'skills')] : []),
    path.join(os, '.claude', 'skills'),
    path.join(os, '.agents', 'skills'),
    path.join(process.cwd(), '.claude', 'skills'),
    path.join(process.cwd(), '.agents', 'skills'),
  ].filter((p, i, all) => all.indexOf(p) === i && fs.existsSync(p));
  const files = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p, base) : [path.relative(base, p)];
  });
  const same = (a, b) => fs.readFileSync(a, 'utf8').replace(/\r\n/g, '\n') === fs.readFileSync(b, 'utf8').replace(/\r\n/g, '\n');
  const ours = fs.readdirSync(SKILLS).filter((d) => d.startsWith('antheo-'));
  let stale = 0;
  let found = 0;
  for (const place of places) {
    const installed = ours.filter((s) => fs.existsSync(path.join(place, s, 'SKILL.md')));
    if (!installed.length) continue;
    found++;
    const off = [];
    for (const s of installed) {
      const mine = files(path.join(SKILLS, s));
      const changed = mine.filter((f) => { const there = path.join(place, s, f); return !fs.existsSync(there) || !same(path.join(SKILLS, s, f), there); });
      if (changed.length) off.push(`${s} (${changed.length} file${changed.length === 1 ? '' : 's'})`);
    }
    const missing = ours.length - installed.length;
    if (off.length) stale++;
    console.log(`${off.length ? 'OUT OF DATE' : 'up to date '}  ${place}  ${installed.length} of ${ours.length} skills${missing ? `, ${missing} not installed` : ''}`);
    for (const o of off) console.log(`               ${o}`);
  }
  if (!found) { console.log('No Antheo skills installed here or in your home folder. Install them with: npx skills@latest add antheo-design/skills'); return; }
  console.log(stale
    ? '\nUpdate with: npx skills@latest add antheo-design/skills --global (and again without --global inside a project that has its own copy)'
    : '\nEvery installed copy matches.');
  if (stale) process.exitCode = 1;
}

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') help();
else if (cmd === 'doctor') doctor();
else if (TOOLS[cmd]) run(TOOLS[cmd][0], args);
else if (cmd === 'init') init(args);
else if (cmd === 'self-test') {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tests', 'self-test.mjs'), ...args], { stdio: 'inherit', cwd: process.cwd() });
  process.exit(r.status ?? 1);
} else {
  console.error(`Unknown command "${cmd}".\n`);
  help();
  process.exit(2);
}
