# Antheo skills

Twenty design skills for coding agents. Each one gives your agent the exact values, rules and small checking tools for
one part of design, so the interfaces it builds look finished and work for everyone who uses them.

```sh
npx skills add antheo-design/skills
```

Works with Claude Code, Codex, Cursor, OpenCode and the other agents the skills installer supports.

## Install

The command above finds the agents on your machine and installs the skills where each one looks: `.claude/skills`
for Claude Code, and `.agents/skills` for Codex, Cursor, OpenCode and the others that share it.

```sh
npx skills add antheo-design/skills -g                    # for every project, not just this one
npx skills add antheo-design/skills -a claude-code        # for one agent
npx skills add antheo-design/skills -s antheo-build       # one skill
npx skills add antheo-design/skills -l                    # list the skills without installing
```

Or copy `skills/antheo-*` into your agent's skills folder by hand.

The checking tools need Node 18 or later. The ones that open a browser (the page check, the access probe, the gate) also
need Playwright in your project, `npm i -D playwright-core`, and Chrome installed, or `npx playwright install chromium`.

## Start

Ask for what you want the way you would tell a teammate: "build a settings page for our app", "our dark mode looks
muddy", "is this ready to ship?". Your agent reads **antheo-build** first. It pastes one designed style block, follows
its usage rules, and reads another skill only when the work needs it.

## The skills

### Start here

| Skill | What it does |
|---|---|
| antheo-build | Starts every UI request: one designed style block to paste first, and the rules that keep a screen compact and quiet |

### Set the look

| Skill | What it does |
|---|---|
| antheo-direction | Gives a landing or brand page its own identity, only when you ask for something expressive |
| antheo-tokens | Puts your brand on the style block with every text pair measured, or writes a full token set for a design system |
| antheo-color | Picks the colour roles and passes WCAG 2.2 contrast in every theme and state |
| antheo-type | A small type scale, two weights, numbers that line up, and fallback fonts drawn at the same size |
| antheo-layout | One column, one left edge, and a grid that holds from 320 to 2560px, in long languages and right to left |
| antheo-surface | Depth without outlines: a faint edge, a soft drop, three corner sizes, in light and dark |

### Build the pieces

| Skill | What it does |
|---|---|
| antheo-components | Single controls with exact sizes and every state |
| antheo-data | Tables, charts and figures people can compare |
| antheo-writing | Every word in the interface: plain, specific and ready to translate |
| antheo-motion | Decides whether a thing should move, then gives its timing, easing and distance |
| antheo-moment | The one signature moment, kept for a rare and meaningful event |
| antheo-access | Keyboard, screen reader, voice, touch and zoom, to WCAG 2.2 AA |
| antheo-mobile | Makes a web screen feel native on a phone: safe areas, the keyboard, bottom sheets |

### Check and keep

| Skill | What it does |
|---|---|
| antheo-stress | Breaks the screen on purpose: long text, nothing at all, ten times the data, right to left |
| antheo-review | Answers "ready to ship?" first, then gives measured findings, each with its file and line |
| antheo-motion-audit | Audits the motion across a whole app and removes what should not move |
| antheo-system | Works with an app that already exists: extracts its values, maps them to tokens, migrates, learns your taste |

### Ask about it

| Skill | What it does |
|---|---|
| antheo-critique | A design partner: says what is clearly off, asks about the judgement calls, redesigns nothing unasked |
| antheo-explain | Explains how an interface was built, layer by layer, and says how sure it is of each claim |

## Tools

Each skill carries its own scripts. No dependencies beyond Node, except Playwright for the browser checks.

| Tool | Skill | What it does |
|---|---|---|
| `check-page.mjs` | review | Opens a page at seven widths in light and dark and reports what is broken, with a score |
| `gate.mjs` | review | Keeps the agent working until the page check and the copy check pass |
| `a11y-probe.mjs` | access | Walks a page by keyboard: focus order, traps, dialogs, zoom, forced colours |
| `copy-lint.mjs` | writing | Finds weak words, vague buttons and broken plurals in JSX, Vue, Svelte, Angular and server templates |
| `contrast.mjs` | color | WCAG 2.2 contrast and APCA for any two colours |
| `block.mjs`, `tokens.mjs` | tokens | The style block in your brand, or a full token set, with every pair measured |
| `variant-bar.js` | build | Three versions on the real page, switched with the keys 1, 2 and 3 |
| `scan-motion.mjs` | motion audit | Every animation in a codebase, with drift in durations and curves |
| `audit-values.mjs` | system | Every hardcoded value in a codebase, grouped and mapped to tokens |
| `inspect.mjs` | explain | One element's layers, styles and animations |

## Done means checked

An agent saying "done" proves nothing. These skills ask for proof.

- **The gate.** Before the agent may finish, `gate.mjs` runs the page check and the copy check on every page the work
  touched. It allows three rounds, and a finding can only be waived with a written reason.
- **Two reviewers, kept apart.** antheo-review runs one reviewer on the screenshots and one on the measurements, in
  separate contexts, then merges what they found and lists where they disagree.
- **Evidence or nothing.** A finding names its file and line, or its screenshot. A number that was not measured never
  decides a verdict, and anything that could not be checked is listed as not verified.
- **Reproduce first.** A fix starts by showing the problem on the running page and ends by showing it gone. A change
  that did not help is undone before the next idea.

To make the gate automatic in Claude Code, add this to `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "node .claude/skills/antheo-review/scripts/gate.mjs hook" }] }]
  }
}
```

Codex, Cursor and OpenCode read the skills from `.agents/skills` and have no stop hook, so add one line to `AGENTS.md`:

> Before saying a UI change is done, run `node .agents/skills/antheo-review/scripts/gate.mjs check` and fix what it
> lists.

For skills installed with `-g`, use the folders the installer printed; they sit in your home directory.

## Any stack

The skills judge what people see, so the framework does not matter. Load the style block once, globally, before any
other CSS; templates use its classes, and components, Tailwind and theme objects read its names. The page checks take a
URL, so they run against any dev server. `skills/antheo-build/references/stacks.md` shows where the block goes in
React, Vue, Svelte, Angular, Astro, Django, Flask, Rails, Laravel and Phoenix.

## Evals

`evals/` holds twenty briefs, one per skill, each with checks that are measured in a real browser or read from the
written answer, never judged by eye. Run each brief with your agent twice, once without the skill and once with it, and
grade both:

```sh
node evals/run.mjs out/with --baseline out/without --html report.html
```

A skill earns its place when its side passes more checks and fails none that the plain side passes. `evals/README.md`
has the prompts for Codex, Claude Code and other agents.

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
