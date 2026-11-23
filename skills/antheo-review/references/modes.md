# Reviewing a change, a whole app, and fixing

Part of antheo-review. Open it when the review is of a change (a diff or a PR), of a whole app, or when the person asks
for the fixes too. Everything in SKILL.md still holds.

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
