# What a passing check hides

Part of antheo-review. Read it before calling the work done, and check the build against each habit.

From 2025 to 26 write-ups of agent-built UI: each of these shipped with green checks.

- **Nobody opened it.** Types, tests and a score passed; the route never mounted the component, a dialog rendered
  under its own backdrop, a stale build was screenshotted. Review the running page, never the diff alone.
- **A screenshot that looks right over a structure that is wrong:** divs for buttons, no landmarks, a form that
  posts nowhere. Look, and run the probes.
- **A style reading a variable nobody defined:** the declaration is dropped silently, so a transition doesn't run
  (`check-page.mjs` lists them; `check-block-names.mjs` checks a file).
- **Controls wired to nothing; a success shown after a failed request; leftovers** ("TODO", "Coming soon", a
  template's title). Press every control (the access probe does it: check 7); search the text.
- **A check that was quieted:** `eslint-disable`, `as any`, a deleted or weakened test, `overflow: hidden` over an
  overflow. Each is a finding in a change review.
- **Only one browser, only the happy path.** Say which browser and which states were not checked.
