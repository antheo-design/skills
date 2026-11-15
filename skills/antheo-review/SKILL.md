---
name: antheo-review
description: Checks a running screen, page, component or change in a real browser at seven widths in light and dark and answers "ready to ship?" first, with every finding measured, located and given its cheapest fix. Use for "check this before I ship", "review my page", "what broke in this change", or after building any UI.
---

# Antheo Review

A review answers one question, "is it ready?", and backs the answer with evidence: what was measured, where, at
which width, and the cheapest fix. The first judgement is the one a person makes in five seconds: is it calm and
precise, or does it look generated? Clean is counts (few text sizes, two weights, three corner sizes, almost no
lines or colour), so the review counts them. A taste you merely disagree with (a density, a corner size, a voice) is
not a finding. The render is the evidence; the source code only supports it.

Review runs the other skills' checks and puts them in one report: the access probe (**antheo-access**), the copy
linter (**antheo-writing**), the motion approve-or-block (**antheo-motion-audit**), every state and the stress pass
(**antheo-stress**), the tells (**antheo-direction**). An opinion without a verdict ("what do you think?") is
**antheo-critique**'s; how something was built is **antheo-explain**'s.

## Decide in this order

1. **Scope:** what you were asked to check, else the changed screens, else the five main routes. Name each screen's
   job in one line, marked "assumed" if nobody said.
2. **Two reviewers, kept apart** (below): one looks, one measures, neither sees the other's notes until both are done.
3. **Stress:** antheo-stress's states and stress pass.
4. **Merge and rank:** severity, causes merged, taste dropped, at most 15 findings; say where the two disagreed.
5. **Answer first:** the ship line, the findings, then what was not checked.

## Run the page check

```bash
node <this-skill>/scripts/check-page.mjs <url or .html file> --shots ./shots --json review.json
```

It opens the page at 320, 390, 768, 1024, 1280, 1440 and 1920px in light and dark, plus reduced motion, tabs through
it, and measures access, layout, craft, consistency, motion and robustness. Craft includes antheo-build's
rules: more than five text sizes, more than two weights, more than three corner sizes or corners over 12px,
outlined cards, colour on too many things; a word broken mid-word, a unit drifted from its number, a bar covering or showing content, tilted
decoration, placeholder text, bands of backgrounds. It scores each area 0 to 100: a blocker
caps the total at 49; one high finding at 79, three at 69, five at 59. Tells are listed, never scored, and a familiar
layout is never a finding. Never pass `--no-dark`.

The score is a floor, not a verdict: **when the screenshots and the score disagree, the screenshots win.**

**The gate** (`scripts/gate.mjs`) makes these checks a condition for finishing: armed on the pages a change
touches, it keeps the work open while a blocker or high finding stands, for up to three rounds, with waivers only
for a stated reason. As a Claude Code Stop hook it runs by itself; in Codex or Cursor the agent runs `gate.mjs check`.
Setup: `references/gate.md`.

## Look at six screenshots

Open them at 100%; never judge from the score alone. **First, five seconds on the 1280px one:** is it calm, and
does the main task fit the first screen? Then count six things in light and dark: text sizes (at most 4 in an app, 5
in a marketing section), weights (2), corner sizes (3), accent things (4), tags (2), hairlines (only between
repeating rows). A count over its limit is a finding. Then, for each screenshot, one line: where the eye lands first, whether the header and
every block share one edge, whether siblings match, anything that almost lines up, anything nobody would miss if it
were removed. Then the eight questions in `references/rubric.md`. A component or app screen is put beside the best
one in the project: louder, larger, browner or busier anywhere is a finding.

## High on sight, without weighing

- A control with no accessible name; a keyboard trap; focus that is invisible, or lost after a dialog closes.
- Text under its contrast ratio; colour as the only signal; a status colour used against its meaning.
- Sideways scroll at any width; content cut off with no way to the full value; a word broken mid-word.
- A bar covering content or letting it show through; a unit floating away from its number; siblings that don't match.
- Decoration nobody asked for (tilted notes, hand-drawn marks, colour bands); placeholder text; a different person
  or number between two states of one screen.
- Styles invented outside the style block: an outlined card, a coloured edge, a corner over 12px, a headline over
  36px, three weights, a divider inside a card, chrome the request never named (a site header on a section, a sidebar
  of made-up destinations).
- A leaked code value (`NaN`, `undefined`, `[object Object]`, `${…}`, lorem ipsum); an image that failed.
- A submit that visibly does nothing; an error with no way to recover; a destructive action with no confirm or undo.
- A state change carried by motion alone; a disclosure with no visible cue that it opens.

## Two reviewers, kept apart

A reviewer who has read the checker's numbers sees what the numbers point at and misses the rest; one who has only
looked trusts their eye where a measurement would disagree. So a review is two passes that can't anchor each other:

- **The visual reviewer** gets the screenshots (390, 1280 and 1920px, light and dark) and the screen's job, and
  nothing else: no score, no findings. It writes what a careful designer would not ship, each with its screenshot.
- **The measured reviewer** gets only the tools: `check-page.mjs`, the access probe, the copy linter, the latency
  probe where there are buttons or drags. It writes what was measured, each with the number.
- **Run them as two subagents with fresh context** where the agent can (Claude Code, Codex), and give the visual
  one its brief first. Where it can't, do the visual pass first, write it down, and only then run the tools. A
  review done in one pass with both at once says so at the top: `Degraded: one pass, the two reviews could anchor`.
- **Then merge:** a finding both found is confirmed; one only the eye found is checked against a measurement before it
  ships as `high`; one only the tools found is checked on the screenshot. Disagreements are listed, not hidden.

## A finding has evidence, a place and a fix

The element by its role and words, the width and theme where it shows, what was measured, why it matters here, and
the fix, written so it fails on the current build:

```
[high] Settings · button "Publish" (1280-light.png)
Seen: two filled primary buttons side by side, "Save changes" and "Publish".
Why: people can't tell which one keeps their work.
Fix: "Publish" becomes secondary.  Where: src/app/settings/page.tsx:84
```

Wrong: "The spacing feels tight." Right: "The label sits 24px from its own field and 8px from the next one, at 390px."
A finding inferred but not seen is written as the check that would settle it. The full format, shared by every
checking skill, is `references/report.md`.

**Evidence or nothing.**

- Every code finding names `file:line` and quotes the current code; every visual finding names its screenshot.
- A number is reported only if it was measured. A contrast, a size or a duration read off a screenshot never
  decides the verdict: measure it (`contrast.mjs`, the page check, `inspect.mjs`) or move it to `Not verified` with
  the check that would settle it. Only a finding proven by a run survives.
- A check you could not run (no browser, a page behind a login, a state you couldn't reach) is listed under
  `Not verified`, never as a finding and never as a pass.

## A rule is global, and edges are checked close up

A fix applies to every instance of the thing, not only the one in front of you: search for the others before
calling it fixed. And zoom the screenshot to 400% on edges and corners: seams, double edges, corners that don't nest,
labels that wrap or crop, and siblings that don't match show there first.

## The cheapest fix first

Delete, then use the platform's own element, then reuse an existing token, then correct the value, and only then add
something. If the fix adds what a deletion would solve, the fix is the deletion.

## Rank, and cap the list

| Severity | Means |
|---|---|
| **blocker** | someone can't finish the job, or sees at once that it's broken |
| **high** | the job is hard or error-prone |
| **medium** | it works but looks unfinished |
| **low** | polish |

At most 15 findings, never padded to reach it. Fourteen pages with the same unnamed button are one finding in one
shared component. Problems that were already there go in a separate list of at most three.

## Answer first

```
Ready to ship: no. Enter in the email field closes the dialog (1 blocker, 2 high, 3 medium).
```

Any blocker or high finding makes it **no**; an inferred one, **no, pending** the check; mediums alone **yes, with
fixes**; lows alone **yes**. Then the findings by severity, the check score and the design score, three things that
work and should be kept, and decisions that belong to a person.

## End with what was not checked

`Not checked:` and every width, theme, state, language and flow nobody looked at. Something nobody looked at is not
approved. A page behind a login you don't have is said there.

## Reviewing a change

1. **Scope:** `git diff --name-only <base>...HEAD`, a PR's files, or the working tree; say which.
2. **Spread:** walk each changed file up to every route that uses it.
3. **Removed signals:** a removed `aria-*`, `outline`, `tabindex`, `prefers-reduced-motion`, `lang`, `dir`,
   `tabular-nums` or logical property is a finding unless the same change adds an equivalent.
4. **Before and after:** the page check with `--shots` on the base and on the change, then
   `node <this-skill>/scripts/pixdiff.mjs before/<name> after/<name> --out diffs/<name>`.
5. **Classify:** introduced, regression, or pre-existing. Only introduced findings and regressions decide the ship
   line.

## Reviewing a whole app

Every route and state that matters (signed out, empty, full, error), the page check with `--stress` on each, findings
grouped by cause, causes ranked by screens touched times severity, shared components and tokens fixed first, each
cause handed to the skill that owns it, every route re-run after each batch.

## If asked to fix

1. **Reproduce first.** Before touching code, capture each finding on the running page (a screenshot or a
   measurement at the width and theme it was found). A finding you can't reproduce isn't fixed; it moves to
   `Not verified`.
2. **Fix in severity order** with the cheapest fix, the smallest change that removes the cause.
3. **Undo a wrong guess.** If a change didn't move the finding it targeted, revert it before trying the next idea;
   never stack guesses. A finding still open after a change means the cause was wrong.
4. **Prove it gone** with the same capture, re-run the checks after each batch, and report the ship line before and
   after.

## What a passing check hides

Check each in `references/habits.md` before calling it done: nobody opened it · a screenshot that looks right over a
structure that is wrong · a style reading a variable nobody defined · controls wired to nothing; a success shown
after a failed request; leftovers · a check that was quieted · only one browser, only the happy path.

## Done

- [ ] The ship line answers first and matches the findings
- [ ] Two reviews kept apart (visual first, then measured), merged with disagreements listed; or `Degraded:` said
- [ ] Page check, access probe and copy linter run; latency probe where there are buttons or drags
- [ ] Six screenshots looked at; antheo-stress's pass done
- [ ] Each finding: evidence, `file:line` or screenshot, width, cheapest fix; no unmeasured number in the verdict; at most 15; causes
  merged; taste dropped
- [ ] For a change: removed signals checked; findings classified
- [ ] Checked against every habit in `references/habits.md`
- [ ] `Not verified:` lists what couldn't run; `Not checked:` ends the report

## Files

- `scripts/gate.mjs`: arms a gate on the pages a change touches; a Stop hook (or `check`) keeps the work open until they pass (`references/gate.md`)
- `scripts/check-block-names.mjs`: every variable a file reads is defined by the style block or in the file; given
  a folder, anywhere in the project (any stack)
- `scripts/check-page.mjs`: seven widths × two themes; access, layout, craft, consistency, motion, tells, robustness;
  `--stress`; `--shots`
- `scripts/latency-probe.mjs`: real presses and drags; time to the first visible change, swallowed second presses,
  drag drift
- `scripts/pixdiff.mjs`: compares two screenshots or folders; changed pixels, the changed box, a diff image
- `references/report.md`: the one report format every checking skill uses: verdict, finding, severity, cap, close
- `references/rubric.md`: eight design-quality questions, scored 1 to 5 with anchors
- `references/checklist.md`: the full list: access, layout, the look, consistency, states, motion, performance
- `references/habits.md`: what a passing check hides, each with its fix
