# Variants: compare designs on the real page, then pick one

Use when the person asks for options ("show me three versions", "which layout is better?") or when a decision can't
be settled by a rule. A variant answers one question; three that differ in one thing are worth more than ten that
differ in everything.

## Decide in this order

1. **Name the one question.** "List or cards for the members page?", "Where does the plan switch go?" Write it down.
2. **Three variants, structurally different on that one axis** (two is a coin toss, five is noise; never more than
   five). Same content, same style block, same states; only the axis changes. Never one "good" and two strawmen.
   Each one is finished enough to ship: the "always" list holds in all of them (names, keyboard, contrast, nothing
   broken), because a variant that fails it is not a choice to offer.
3. **On the real page, not an empty route.** Mount the variants where the thing will live, with the real header,
   data and width around them: an empty page hides the problems.
4. **One line each** on what it is best at (`data-variant-note`). Never mark a favourite.
5. **Let the person pick.** Then offer, once, to bring over one named part from each of the others ("the list's
   row height", "the table's sortable header"), never a blend of everything. Apply only what they accept, then
   delete the others and the bar.

## Build them

Each variant's root gets `data-variant="<short-name>"` and `data-variant-note="<what it's best at>"`. Load
`scripts/variant-bar.js` once in development. It shows one variant at a time, adds a floating bar (keys 1 to 9, or Shift
with ← →), keeps the choice in `?variant=`, and its Pick button copies a verdict line to paste back.

It works in any stack because it only reads attributes in the rendered page:

| Stack | How |
|---|---|
| Plain HTML, Astro, server templates (Django, Jinja, Rails, Laravel, Phoenix) | render all three, each with `data-variant` |
| React, Preact, Solid | `<div data-variant="list" data-variant-note="…">` around each; render all three |
| Vue, Nuxt | `<section data-variant="list" data-variant-note="…">` around each |
| Svelte, SvelteKit | the same attributes on each block |
| Angular | `<section data-variant="list" [attr.data-variant-note]="'…'">` |
| A native or canvas app | not this tool: build each as its own screen and screenshot all three side by side |

Load the script with a dev-only `<script src>` (or your framework's dev-only script slot); it is never shipped.

## Show them side by side when the person can't run the page

Take a screenshot of each (`?variant=<name>`) at the same width with antheo-review's `check-page.mjs --shots` or the
project's own harness, and put them in one row with their notes underneath.

## Done

- [ ] One question, written down; three variants that differ only on its axis
- [ ] Same content, style block and states in each; mounted on the real page
- [ ] A one-line note per variant; no favourite marked
- [ ] After the pick: one named part from each of the others offered; only the accepted ones brought over
- [ ] Then the other variants and the bar removed
