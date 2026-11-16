---
name: antheo-system
description: Works with an app that already exists. It extracts the design system the app really uses, maps every hard-coded value to a token by role, migrates screen by screen without visible change, documents components from their code, and keeps a record of the person's taste so the next agent starts where the last one stopped. Use for "make our UI consistent", "we hardcode colours everywhere", "extract tokens", "do we actually use our tokens?" (a report that changes nothing), "migrate to the new components", "document this component", "remember that I prefer…", or before building into an existing codebase.
---

# Antheo System

Old apps drift: forty greys, eleven radii, three buttons, and a person who has said "less rounded" to five different
agents. This skill turns what an app already is into one system, moves the app onto it without breaking anything,
and remembers the person's taste. Making new tokens belongs to **antheo-tokens**; building new components to
**antheo-components**; checking a screen to **antheo-review**.

Everything it writes lives in **`design/`** at the project root: `system.md` (the system on one page), `taste.md`
(learned from corrections, newest first), `audit.json` (the latest value audit), `migration.md` (the plan and its
progress), `components/<name>.md` (one page per component). Templates: `references/design-folder.md`.

## Decide in this order

1. **Read:** `design/taste.md` and `design/system.md` before building anything. They outrank every default in the
   other Antheo skills. Use the app's tokens and shared components; never add a second button.
2. **Readiness:** is there a token file, a shared components folder, and a way to screenshot the key screens? Before
   a migration, also **tone coverage**: a grid of the clickable and row components against the status colours and
   the muted look; any combination missing from it is filled before the migration starts. Each missing piece becomes the first item in the plan.
3. **Extract:** what the app really uses.
4. **Map:** every raw value to a token, by role.
5. **Migrate:** exact, then close, then components, then strays, then lock.
6. **Record:** every correction from the person, as a rule.

**A reported problem** (a wrong colour, a broken screen, "it looks off on my phone"): reproduce it first on the
running app, with a screenshot or a measurement, before touching code. Change the smallest thing that removes the
cause; if a change doesn't move it, revert that change before the next idea. The same capture afterwards shows it
gone. Can't reproduce it: say so and ask for the steps, the width and the theme.

## Extract

```bash
node <this-skill>/scripts/audit-values.mjs src --json design/audit.json
```

It lists every hard-coded colour, font size, spacing value, radius, shadow, duration and z-index with counts and
places, and merges colours closer than ΔE 2.

| Kind | Becomes |
|---|---|
| Colours | grouped by role (page, surfaces, borders, text default, muted and subtle, accent, status); the most used value in each group is the token; regenerate the set with antheo-tokens (`tokens.mjs --brand <the accent found>`) and keep the generated ramp unless the brand needs an exact value |
| Type | the most used sizes become the scale; the rest snap to it |
| Spacing | snapped to the 4px scale and named by role (`--gap-label`, `--gap-field`, `--pad-card`) |
| Radii, shadows, motion, layers | 4 to 5 radii, 4 elevations, the motion durations, 6 named layers (`--z-base`, `--z-sticky`, `--z-dropdown`, `--z-overlay`, `--z-modal`, `--z-toast`) |
| Components | every job done twice (two buttons, three modals): one kept per job, the rest go on the migration list |

Show the counts before and after ("43 colours → 18 tokens; 11 radii → 5") and the three decisions that need the
person: usually the accent, the radius character and which button wins.

## Map by role, then by value

```bash
node <this-skill>/scripts/audit-values.mjs src --tokens src/styles/tokens.css --json design/audit.json
```

| Class | Means | Do |
|---|---|---|
| **exact** | the token's value | swap it |
| **close** | within ΔE 2, or 2px | swap, then look |
| **stray** | matches nothing | used 3 or more times across 2 or more files: a gap, so propose a token; fewer: a mistake, so correct it; ask when unsure |

A token is picked for its job, never because its value happens to match: a border on `--color-text-subtle` because the grey matched breaks the
day the text colour changes. Payload values are not drift: colours in code samples, data URIs, third-party brand
logos and exported files are left alone, and listed as exempt by element, not by file.

### Report only

When the person asks "do we actually use our tokens?" or wants a token audit, change nothing: report each raw value as
**exact**, **close** (with its ΔE or px), **ambiguous** (name every candidate token), **gap** (no token fits; never
invent one in the report) or **do not use** (the value matches but the token's job differs), with its places. A close
or nearest match is a candidate until it is confirmed in context (the same role, the same state, the same ground);
never migrate a value to a token by numeric closeness alone. If at
least 12 rows are gaps and they make up more than 30% of the rows, say "not actionable (gap threshold): the system is
missing tokens", and list the three largest gaps instead of mapping row by row.

## Migrate without visible change

1. **Exact swaps:** shots of the key screens before and after with `antheo-review/scripts/check-page.mjs --shots`,
   then `node <antheo-review>/scripts/pixdiff.mjs before after --max 0 --out diffs`. Any changed pixel is a mistake
   or a swap that was not really exact.
2. **Close swaps:** one kind at a time (colours, spacing, radii), same diff with `--tolerance 2 to 4` for antialiasing,
   each swap classified with the table below.
3. **Components:** one screen per change. First write a **behaviour contract** for the component being replaced
   (props and slots, states, keys, focus, events, strings; template in `references/design-folder.md`), then check
   the new one against every row. A row it fails is fixed or raised with the person, never silently dropped. The old
   component stays as a thin wrapper until nothing uses it.
4. **Strays:** one decision each, recorded in `design/system.md`.
5. **Lock it:** store the audit as the baseline; CI runs `audit-values.mjs src --baseline design/audit.json
   --fail-on-increase`, which exits 1 when any kind of raw value goes up. When counts drop, store the new baseline.

Never mix a migration with a redesign. More surfaces than one agent can hold: coordinator, worker and verifier briefs
in `references/parallel.md`, one owner per surface and per shared file.

## Is a swap a visible change?

| Property | No visible change when | Must match exactly |
|---|---|---|
| Colour | ΔE ≤ 2 | |
| Spacing, size, radius | ≤ 2px apart | |
| Font size | ≤ 1px apart | |
| Line height | ≤ 0.05 apart | |
| Opacity | ≤ 0.02 apart | |
| Duration, delay | ≤ 30ms apart | |
| Border width, font weight, font family, easing | | yes |

Several within-tolerance changes on one element can add up: look at it in the diff before calling it unchanged.
Anything outside goes in `migration.md` as a visible change for the person to see.

## Document a component from its code

`design/components/<name>.md`, written from the code and every real import: what it is for in one sentence and what
to use instead; anatomy with token names; props and variants with defaults; every state; keys, role, name and
announcements (antheo-access); label rules and limits (antheo-writing); two real dos and don'ts from the app; the 3 to 5
most important places it is used. Document what the code does, not what it should do; gaps go at the end as issues.

## Learn the person's taste

When the person corrects something ("too rounded", "buttons feel heavy", "that's exactly it"), make the change, then
add to `design/taste.md`:

```
## 2026-11-14 · Corners: less round
Rule: cards and inputs use --radius-sm (6px), not --radius-lg; pills only for badges.
Why (their words): "everything looks like a toy"
Scope: whole app        Source: correction on the settings page
```

1. Write the rule, not the incident, and keep their words: they carry the intent to cases the rule doesn't cover.
2. Praise counts too: "I love the tin drawing" becomes a rule about what is welcome.
3. Scope it: whole app, a section or one screen; never widen a one-screen remark.
4. Newer wins: update the old entry with the date; never keep two rules that disagree.
5. The third rule touching the same value changes the token instead, noted in `design/system.md`.
6. Say which rules you applied in your output.

## What agents get wrong in an existing app

Check each in `references/habits.md` before calling it done: raw palette classes and arbitrary values · invented
token names · a component restyled from outside · a component rebuilt beside the one that exists · drift late in a
long session · old script for what the platform now does.

## Migrate without surprises

A migration ships in small batches or behind a switch, each batch with a before and after screenshot and its
behaviour checked against the old one: the same props, states, keys and accessible names. The old version stays
until the new one has run in production, and there is a written way back. Tokens and components carry a version,
every change has an owner, and adoption is measured by the screens moved, not the components written.

## Done

- [ ] `taste.md` and `system.md` read (or created) before building; readiness gaps planned first
- [ ] Audit run; counts before and after shown; the three decisions asked, not guessed
- [ ] Mapped by role; strays sorted into gaps and mistakes; payload values exempt by element
- [ ] Migration in order, each step through pixdiff; every swap classified; visible changes listed
- [ ] A behaviour contract met before each component replacement
- [ ] The ratchet runs in CI
- [ ] Every correction recorded as a scoped rule in the person's words
- [ ] Checked against every habit in `references/habits.md`

## Files

- `scripts/audit-values.mjs`: finds hard-coded values, merges colours under ΔE 2, maps values to tokens (exact,
  close, stray), `--baseline <audit.json> --fail-on-increase` for CI
- `references/design-folder.md`: templates for `system.md`, `taste.md`, `migration.md` and the behaviour contract
- `references/parallel.md`: coordinator, worker and verifier briefs for a migration split across agents
- uses `antheo-review/scripts/check-page.mjs` and `pixdiff.mjs` for every before and after
- `references/habits.md`: what agents get wrong in an existing app, each with its fix
