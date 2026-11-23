<h1 align="center">Antheo Design Skills</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/strip-dark.svg">
    <img src="assets/strip-light.svg" width="100%" alt="The twenty-one Antheo design skills, each with its own painted icon">
  </picture>
</p>

<p align="center">
  Twenty-one design skills for coding agents. Exact values, firm rules and small checking tools,<br>
  so the interfaces your agent builds look finished and work for everyone.
</p>

<p align="center">
  <a href="#install">Install</a> · <a href="#the-skills">Skills</a> · <a href="#how-a-skill-works">How a skill works</a> · <a href="#done-means-checked">Done means checked</a> · <a href="#evals">Evals</a> · <a href="#license">License</a>
</p>

## What do you want to do?

Install them, then just ask. These six sentences cover most days; the agent opens the right skills by itself.

| Say | It starts in |
|---|---|
| "Build a settings page for my app" | antheo-build, then antheo-review checks it |
| "Make a landing page for my bakery" | antheo-direction plans it, antheo-writing writes it |
| "Why does this screen feel off?" | antheo-critique: an opinion, no code changed |
| "Is this ready to ship?" | antheo-review: a measured verdict |
| "Make this toggle fun to use" | antheo-creative |
| "Our app hardcodes colours everywhere" | antheo-system |

Not sure what your machine can run? `npx github:antheo-design/skills doctor` says, with the line that installs what
is missing.

## Install

```sh
npx skills@latest add antheo-design/skills
```

The [skills installer](https://skills.sh) finds the agents on your machine and puts the skills where each one looks:
`.claude/skills` for Claude Code, and `.agents/skills` for Codex, Cursor, OpenCode and the others that share it.

```sh
npx skills@latest add antheo-design/skills --global                 # every project, not just this one
npx skills@latest add antheo-design/skills --agent claude-code       # one agent
npx skills@latest add antheo-design/skills --skill antheo-build      # one skill
npx skills@latest add antheo-design/skills --list                    # list them first
```

Or copy `skills/antheo-*` into your agent's skills folder by hand. Each skill is a plain folder with a `SKILL.md`, so
it works in any agent that reads [Agent Skills](https://agentskills.io).

The tools need Node 18 or later. The browser checks also need Playwright in your project (`npm i -D playwright-core`)
and Chrome or Edge, or `npx playwright install chromium`.

### One command for every tool

Every checking tool also runs straight from GitHub, with nothing to install:

```sh
npx github:antheo-design/skills check http://localhost:3000/settings   # the page check
npx github:antheo-design/skills gate arm http://localhost:3000 --copy src
npx github:antheo-design/skills gate check                             # PASS, or what to fix
npx github:antheo-design/skills init --agents                          # the style block, and the gate rule in AGENTS.md
npx github:antheo-design/skills help                                   # all of them
```

### One file, for tools without skills

[`ANTHEO-CORE.md`](ANTHEO-CORE.md) is the core in a single file: the style block, the build rules, the traps that
matter most and the gate. Paste it into Cursor rules, Aider or a local model's system prompt. For a small local model,
[`ANTHEO-CORE-MINI.md`](ANTHEO-CORE-MINI.md) is about half the size: the policy, each rule's first sentence and the
same style block without comments, tested to render pixel for pixel like the full one. Both are generated from the
skills, so they always say the same thing they do.

## Start

Ask the way you would ask a teammate. Your agent picks the skill.

```
Build a settings page for our app: profile, notifications and billing.
```

```
Our dark mode looks muddy. Fix it.
```

```
Is this page ready to ship? http://localhost:3000/pricing
```

New to this? Install, ask for what you want in plain words, and let the gate check the result. Already reviewing a
page you built? Ask "fix my page: http://localhost:3000/settings" and the agent reproduces each problem, fixes it and
shows it gone. [`GUIDE.md`](GUIDE.md) explains how the skills fit together, the default look and when it steps aside,
and how much gets checked for a small change versus a release. [`examples/`](examples) has ten pages built only from
the style block: sign-up, settings, a list, a table, a dashboard, pricing, an empty state, an error, a phone screen and
a right-to-left page.

Every build starts with **antheo-build**. It pastes one designed style block, follows its rules, and opens another
skill only when the work needs it: a table brings in antheo-data, a dialog that opens brings in antheo-motion, "make it
fun" brings in antheo-creative, "ready to ship?" brings in antheo-review.

## Get the best results

**Set it up once.** Add these lines to your project's `AGENTS.md` (and `CLAUDE.md`), so every agent uses the skills
without being reminded. Use the skills folder the installer printed in place of `<skills>`.

```markdown
## UI work
- Before building or changing any UI, read <skills>/antheo-build/SKILL.md.
- Start from the project's own tokens; with none, from antheo-build's style block.
- Arm the gate at the start: node <skills>/antheo-review/scripts/gate.mjs arm <page url> --copy src
  (add --preset none when the project has its own look, and --ref <images> when building from references).
- Run every check from the project folder. Not done until `gate.mjs check` says GATE: PASS.
```

In Claude Code, the stop hook under "Make the gate automatic" below makes the gate run on its own.

**Ask in the way that fits the job.**

A screen or component for a product:

```
Build <what> for <who>. Use the Antheo skills, starting with antheo-build. Arm the gate on <url> --copy src,
film the main interaction, and don't stop until the gate passes.
```

From a reference (a screenshot, a Dribbble shot, a video's frames):

```
Build <what> from <ref.png>. Look at it closely first. Use the Antheo skills, starting with antheo-build; match the
reference's look and the effects it shows or implies, and make the words and content your own. Arm the gate with
--preset none --ref <ref.png>, compare with beside.mjs, fix what differs, compare again, film the motion, and don't
stop until the gate passes.
```

Something people should enjoy using (a widget, a toy, an empty state, onboarding):

```
Build <what> and make it fun to use. Use antheo-creative to find its play, then antheo-build for the rest.
Name the one thing people will do with it for fun and make that the richest part. Film it, and don't stop until the
gate passes.
```

**What makes the difference:**

- **Give a reference** when you care about the look: agents get far closer to a picture than to a description.
- **One component at a time.** Five at once each get a fifth of the attention.
- **Let the gate run.** It catches what a quick look misses: dead buttons, focus you can't see, text that breaks at
  320px, a row that spills out of its card.
- **Press everything yourself.** The checks prove it isn't broken; only you can say it's good. Tell the agent what
  feels wrong in one line, and it records your taste for next time (antheo-system).

## The skills

### Start here

| Skill | What it does |
|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-build.svg"><img src="assets/icons/antheo-build.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;build](skills/antheo-build/SKILL.md) | Starts every UI request: one designed style block to paste first, and the rules that keep a screen compact and quiet |

### Set the look

| Skill | What it does |
|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-direction.svg"><img src="assets/icons/antheo-direction.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;direction](skills/antheo-direction/SKILL.md) | Plans any landing page (its kind, sections and one of five hero layouts), and gives a page its own identity when you ask for something expressive |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-tokens.svg"><img src="assets/icons/antheo-tokens.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;tokens](skills/antheo-tokens/SKILL.md) | Puts your brand on the style block with every text pair measured, or writes a full token set for a design system |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-color.svg"><img src="assets/icons/antheo-color.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;color](skills/antheo-color/SKILL.md) | Picks the colour roles and passes WCAG 2.2 contrast in every theme and state |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-type.svg"><img src="assets/icons/antheo-type.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;type](skills/antheo-type/SKILL.md) | A small type scale, two weights, numbers that line up, and fallback fonts drawn at the same size |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-layout.svg"><img src="assets/icons/antheo-layout.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;layout](skills/antheo-layout/SKILL.md) | One column, one left edge, and a grid that holds from 320 to 2560px, in long languages and right to left |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-surface.svg"><img src="assets/icons/antheo-surface.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;surface](skills/antheo-surface/SKILL.md) | Depth without outlines: a faint edge, a soft drop, three corner sizes, in light and dark |

### Build the pieces

| Skill | What it does |
|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-components.svg"><img src="assets/icons/antheo-components.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;components](skills/antheo-components/SKILL.md) | Single controls with exact sizes and every state |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-data.svg"><img src="assets/icons/antheo-data.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;data](skills/antheo-data/SKILL.md) | Tables, charts and figures people can compare |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-writing.svg"><img src="assets/icons/antheo-writing.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;writing](skills/antheo-writing/SKILL.md) | Every word in the interface, and the copy of a page that sells: plain, specific and ready to translate |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-motion.svg"><img src="assets/icons/antheo-motion.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;motion](skills/antheo-motion/SKILL.md) | Decides whether a thing should move, then gives its timing, easing and distance |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-moment.svg"><img src="assets/icons/antheo-moment.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;moment](skills/antheo-moment/SKILL.md) | The one signature moment, kept for a rare and meaningful event |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-creative.svg"><img src="assets/icons/antheo-creative.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;creative](skills/antheo-creative/SKILL.md) | Makes a component playful and fun to use: the effects a reference shows or implies, or the play its real-world cousin has |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-access.svg"><img src="assets/icons/antheo-access.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;access](skills/antheo-access/SKILL.md) | Keyboard, screen reader, voice, touch and zoom, to WCAG 2.2 AA |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-mobile.svg"><img src="assets/icons/antheo-mobile.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;mobile](skills/antheo-mobile/SKILL.md) | Makes a web screen feel native on a phone: safe areas, the keyboard, bottom sheets |

### Check and keep

| Skill | What it does |
|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-stress.svg"><img src="assets/icons/antheo-stress.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;stress](skills/antheo-stress/SKILL.md) | Breaks the screen on purpose: long text, nothing at all, ten times the data, right to left |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-review.svg"><img src="assets/icons/antheo-review.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;review](skills/antheo-review/SKILL.md) | Answers "ready to ship?" first, then gives measured findings, each with its file and line |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-motion-audit.svg"><img src="assets/icons/antheo-motion-audit.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;motion&#8209;audit](skills/antheo-motion-audit/SKILL.md) | Audits the motion across a whole app and removes what should not move |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-system.svg"><img src="assets/icons/antheo-system.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;system](skills/antheo-system/SKILL.md) | Works with an app that already exists: extracts its values, maps them to tokens, migrates, learns your taste |

### Ask about it

| Skill | What it does |
|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-critique.svg"><img src="assets/icons/antheo-critique.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;critique](skills/antheo-critique/SKILL.md) | A second pair of eyes: names the plain problems, raises matters of taste as questions, redesigns nothing unasked |
| <picture><source media="(prefers-color-scheme: dark)" srcset="assets/icons/dark/antheo-explain.svg"><img src="assets/icons/antheo-explain.svg" width="20" height="20" align="top" alt=""></picture>&nbsp; [antheo&#8209;explain](skills/antheo-explain/SKILL.md) | Explains how an interface was built, layer by layer, and says how sure it is of each claim |

## How a skill works

Every skill is a folder with up to three parts:

```
skills/antheo-motion/
  SKILL.md       the rules your agent reads the moment the skill starts
  references/    deeper files it opens only when the work calls for one
  scripts/       tools it runs to check its own work
```

**SKILL.md** is short on purpose: the decisions, the values and a checklist for done. Your agent reads it whole.

**references/** holds the detail a task sometimes needs: the style block itself, the recipe for one kind of
animation, the pattern for a pricing page, the habits to catch before calling work done. The agent opens one file
when the job needs it and never loads the rest, so twenty-one skills cost almost nothing until they are used.

**scripts/** are plain Node files with no dependencies. They measure what an agent would otherwise guess: contrast,
layout at seven widths, the words on a screen, every hardcoded value in a codebase.

<details>
<summary>The tools</summary>

| Tool | Skill | What it does |
|---|---|---|
| `beside.mjs` | review | Puts what you built next to its reference, same height, with 3× close-ups of both |
| `check-page.mjs` | review | Opens a page at seven widths in light and dark and reports what is broken, with a score: load speed, layout shift and page weight, a field nobody can find, a chart nobody can read, stand-in photos without credit; with `--landing`, the first screen, contact details to confirm and share tags; with `--preset studio`, `editorial` or `playful`, that look; with `--stress`, long text, right to left and forced colours |
| `latency-probe.mjs` | review | Real presses and drags: how fast each control answers, drag drift, and with `--play`, every frame while something plays |
| `gate.mjs` | review | Keeps the agent working until the page check, the access probe and the copy check pass, and, when built from references, until it has compared and filmed; checks its own tools were not edited and the page does not test for the checker; says PASS, PARTLY MEASURED when something went unread |
| `a11y-probe.mjs` | access | Walks a page by keyboard: focus order, traps, dialogs, zoom, forced colours; presses every button, holding back anything it would send |
| `copy-lint.mjs` | writing | Finds weak words, vague buttons and broken plurals in JSX, Vue, Svelte, Angular and server templates; with `--marketing`, the devices of generated selling copy |
| `stand-ins.mjs` | direction | Finds openly licensed stand-in photos for a detail slot on Openverse and Wikimedia Commons (no key), checks each licence and writes the credits |
| `contrast.mjs` | color | WCAG 2.2 contrast and APCA for any two colours |
| `block.mjs`, `tokens.mjs` | tokens | The style block in your brand (and with `--look`, in the Studio, Editorial or Playful look), or a full token set, with every pair measured |
| `variant-bar.js` | build | Three versions on the real page, switched with the keys 1, 2 and 3 |
| `filmstrip.mjs` | motion | Films one motion at a tenth of its speed into a sheet of frames, so it can be judged, not guessed |
| `scan-motion.mjs` | motion audit | Every animation in a codebase, with drift in durations and curves, and reduced-motion rules that remove too much; `--top 5` for only the fixes that matter most |
| `audit-values.mjs` | system | Every hardcoded value in a codebase, in any colour form, grouped and mapped to tokens |
| `requests.mjs` | system | What a screen sends, captured before and after a migration and compared field by field, with nothing sent |
| `harness.mjs` | stress | Every state at every width, and awkward content through every slot, on one page |
| `inspect.mjs` | explain | One element's layers, styles and animations, or a survey of a whole site with `--site` |

</details>

## Done means checked

An agent saying "done" proves nothing. These skills ask for proof.

- **The gate.** Before the agent may finish, `gate.mjs` runs the page check, the access probe (keyboard, focus, text
  spacing, and every button pressed to find the dead ones), the copy check and the motion scan on every page the work
  touched. Built from a reference, it also wants proof of comparing: two side-by-side sheets per reference and a
  filmstrip of the motion. It allows three rounds, and a finding can only be waived with a written reason.
- **Two reviewers, kept apart.** antheo-review runs one reviewer on the screenshots and one on the measurements, in
  separate contexts, then merges what they found and lists where they disagree.
- **Evidence or nothing.** A finding names its file and line, or its screenshot. A number that was not measured never
  decides a verdict, and anything that could not be checked is listed as not verified.
- **Reproduce first.** A fix starts by showing the problem on the running page and ends by showing it gone. A change
  that did not help is undone before the next idea.

<details>
<summary>Make the gate automatic</summary>

In Claude Code, add a stop hook to `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "node .claude/skills/antheo-review/scripts/gate.mjs hook" }] }]
  }
}
```

Codex, Cursor and OpenCode have no stop hook, so add one line to `AGENTS.md`:

> Before saying a UI change is done, run `node .agents/skills/antheo-review/scripts/gate.mjs check` and fix what it
> lists.

For skills installed with `--global`, use the folders the installer printed; they sit in your home directory.

</details>

## Any stack

The skills judge what people see, so the framework does not matter. Load the style block once, globally, before any
other CSS; templates use its classes, and components, Tailwind and theme objects read its names. The page checks take
a URL, so they run against any dev server.
[`stacks.md`](skills/antheo-build/references/stacks.md) shows where the block goes in React, Vue, Svelte, Angular,
Astro, Django, Flask, Rails, Laravel and Phoenix.

## Evals

[`evals/`](evals) holds twenty-one briefs, one per skill, and a beginner and a senior wording of six of them (thirty-three in all). Every check is measured in a real browser or read from the
written answer, never judged by eye. Run each brief twice, once without the skill and once with it, and grade both:

```sh
node evals/run.mjs out/with --baseline out/without --html report.html
```

A skill earns its place when its side passes more checks and fails none that the plain side passes.
[`evals/README.md`](evals/README.md) has the prompts for Codex, Claude Code and other agents.

## Principles

1. **Clean is counts.** Few text sizes, two weights, three corner sizes, almost no lines, almost no colour.
2. **One set of names.** Every colour, size, corner, shadow and duration has one name, defined once.
3. **Only what was asked.** No invented features, data or copy.
4. **Measured, not guessed.** Real pages, real widths, both themes.
5. **Proven by a run.** A claim about a screen comes with the check that shows it.

## Pairs well with

These skills own how an interface looks, reads, moves and works for people, not how its code is structured. For that,
pair them with Vercel's react-best-practices for React performance and Matt Pocock's tdd and diagnosing-bugs skills.

## License

Free to use in your own work and your clients' work, commercial work included, and free to change. You may not sell
the skills themselves, or a product or service whose value comes mainly from them. MIT with the Commons Clause; the
full text is in [LICENSE](LICENSE).

## Contributing

Issues and pull requests are welcome. A change to a skill should come with an eval brief, or a change to one, that
shows the difference.

Before sending a change, run the self-test. It checks that every skill's front matter installs, every file a skill
points to exists, every token name is one the style block defines, no old values have crept back, and the tools still
pass a good page and catch a broken one:

```sh
node tests/self-test.mjs --browser
```

After changing a rule, rebuild the one-file core with `node scripts/build-core.mjs`.
