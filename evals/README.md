# Evals

Twenty-one briefs, one per skill, each with checks that are measured rather than judged by eye, and for six of them (build, direction, components, data, writing, mobile) the same brief worded twice more: once as a beginner would ask (vague, casual) and once as a senior would (every constraint named), with the same checks. Run every brief twice with the same agent and model: once with no design skill, once reading only the skill it tests. Then grade both folders. A skill earns its place when its side passes more checks and doesn't fail any check that the plain side passes.

```
evals.json      the briefs and what each must show
fixtures/       the files the five answer briefs read (review, critique, explain, system, motion-audit)
run.mjs         the grader
lib/iphone.mjs  the iPhone 15 emulation (safe areas, Dynamic Island, keyboard) the phone brief is graded in
```

Run the grader from the project root, where `playwright-core` and `axe-core` are installed. It uses the installed Chrome and falls back to Playwright's Chromium.

## Run it with Codex (or any agent)

1. Make two empty folders, for example `evals-out/without` and `evals-out/with`.
2. For each brief in `evals.json`, start a **fresh** session for each side, so neither side sees the other's work.

   **Without:**

   ```
   Read evals/evals.json. Do the brief with id "<id>", following its "rules".
   Do not open anything under skills/antheo-* or any other design skill.
   Write the result to evals-out/without/<id>/index.html (or answer.md for an answer brief).
   ```

   **With:**

   ```
   Read skills/antheo-<skill>/SKILL.md and follow it, reading its references when it says to.
   Then read evals/evals.json and do the brief with id "<id>", following its "rules".
   Write the result to evals-out/with/<id>/index.html (or answer.md for an answer brief).
   ```

   Use the `skill` field for `<skill>` (build, direction, tokens and so on). In Codex: `codex exec "<prompt>"`, one call per brief and side. In Claude Code: `claude -p "<prompt>"`.

   Codex can also run all of a side in one loop:

   ```sh
   for id in $(node -e "require('./evals/evals.json').evals.forEach(e=>console.log(e.id))"); do
     codex exec "Read evals/evals.json. Do the brief with id \"$id\", following its rules. Do not open anything under skills/antheo-*. Write the result to evals-out/without/$id/ (index.html, or answer.md for an answer brief)."
   done
   ```

3. Grade:

   ```sh
   node evals/run.mjs evals-out/with --baseline evals-out/without --html evals-out/report.html --json evals-out/report.json
   ```

   It prints one line per brief and a total per side. The HTML report has every check with what was measured: green passed, red failed, grey couldn't be checked.

4. Run each side three times if you can (`with-1`, `with-2` and so on). One run per side is noise: a brief that passes once and fails twice hasn't been learned.

## Beginner and senior wordings

A brief with `"persona"` is a rewording of the brief named in `"of"`, graded by the same checks. Run them like any
other brief. A skill holds for everyone when its side passes the same checks on all three wordings: a check that passes
on the base and the senior wording but fails on the beginner one means the skill leans on the asker naming what they
want, and its defaults need to do that work instead.

## Reading the result

- **A check the plain side fails and the skill side passes** is the skill working.
- **A check both sides pass** means the model already does it; the skill's words for it can be shortened.
- **A check the skill side fails** is a bug in the skill. Fix the skill (not the brief) and run that brief again.
- **Grey (not verified)** means the check couldn't run, for example axe-core isn't installed or there was no menu to measure. It counts as neither a pass nor a fail.

## What the checks measure

| Check | Measured how |
|---|---|
| `page-clean` | `antheo-review/scripts/check-page.mjs` at 390 and 1280, light and dark: no blocker or high findings, no script errors |
| `copy-clean` | `antheo-writing/scripts/copy-lint.mjs`: no medium or high findings |
| `text-sizes`, `weights`, `radius-count` | distinct computed font sizes, weights and corner radii of visible elements |
| `contrast`, `axe-clean` | axe-core in the page |
| `focus-visible` | Tab through up to eight stops; each must show an outline or ring |
| `one-left-edge` | left edges of the headings, fields and buttons |
| `no-overflow` | no sideways scroll at the given widths |
| `menu-opens`, `open-duration`, `no-linear-or-ease-in-open` | press the first button, find the menu holding "Newest first", read its computed transition |
| `label-steps`, `no-layout-shift` | press the button and sample its label and size every 120ms |
| `plays-on-press` | press the first button once; something must be animating 60ms later |
| `action-above-keyboard`, `clear-of-island`, `field-16px` | iPhone 15 emulation (393×852, 59pt top and 34pt bottom safe areas); the keyboard covers 336pt and resizes `visualViewport`, as on iOS |
| `answer-*` | patterns in answer.md: the verdict first, named findings, line references, a question, no unasked redesign |

The checks are a floor, not taste. A page can pass all of them and still be dull, so look at the two folders side by side as well.

## Adding a brief

Add an entry to `evals.json` with an `id`, the `skill` it tests, a `type` (`visual`, `motion`, `phone` or `answer`), the `prompt`, and `expect` checks from the table above. A new kind of check goes in `CHECKS` in `run.mjs` (visual) or in the motion, phone or answer function. Run it against a careful page and a careless page before trusting it: it must pass the first and fail the second.
