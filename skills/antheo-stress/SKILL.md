---
name: antheo-stress
description: Breaks a component or screen on purpose before anyone else does. It renders every state on one page and pushes real, awkward content through every slot (long, empty, ten times the realistic count, right to left, zoomed, slow). Then it records what held and what broke. Use before shipping a component, for "test the edge cases", "what if the name is long", empty, loading and error states, or mock data.
---

# Antheo Stress

A component that has only been seen with its happy-path sample has not been tested. This skill builds a harness that
shows every state at once, feeds it content shaped like the product at its worst, and writes one line for each case:
held, or what broke. Fixing what broke belongs to the skill that owns it: overflow and wrapping to **antheo-layout**,
words to **antheo-writing**, names and focus to **antheo-access**. The ship decision belongs to **antheo-review**.

## Decide in this order

1. **Axes:** read the component's props and slots, then pick the axes it can really vary on, and name the ones you
   skip.
2. **Harness:** one throwaway page that shows the real component in every state.
3. **Fixtures:** real-shaped content for every text, number and image slot.
4. **Push:** each fixture through each slot, at each width the component is used.
5. **Record:** one line per case, held or broken, then hand each break to its owner.

## Every state, on one page

Default, loading, empty, error, partial, long, success, disabled; plus hover, focus, pressed, selected and expanded
for anything interactive. Each one goes in its own labelled cell at the component's real width, selectable with
`?state=`. Render the **real component** through its normal props, never a copy of its markup. A state that props
can't produce (a failed request, a slow load) is produced by the harness with a fake fetch that rejects or waits.
Recipe: `references/harness.md`.

## Axes come from the component, not a matrix

| Axis | Vary | Breaks to look for |
|---|---|---|
| Length | shortest real, typical, longest real, 3× longest, one unbroken 60-character word | wrapping, an ellipsis with no way to the full value, a button pushed off its row |
| Shape | each optional part present and absent: no image, no subtitle, one action or three | gaps left behind, baselines that don't line up, a collapsed row |
| Quantity | 0, 1, 2, realistic, **ten times realistic** for every list, table, tab set and chip row | the empty state, singular wording, scroll, a layout jump, slow rendering |
| Container | each width the component gets where it is used (240, 320, 480, 768, full) | breakpoints inside the component: container queries, not the viewport |
| Environment | dark, reduced motion, right-to-left, 200% zoom, forced colours, 4× slower CPU | contrast, mirrored icons and padding, motion that stops, text that reflows |

A fixed-width badge has no container axis: skip it and say why, rather than forgetting it.

## Mock data is shaped like the product

Real-sounding names, plausible amounts and dates, sentences an editor would write. Lists come at the count people
really have, then ten times that. Never "Lorem ipsum", "Test 1", "foo@bar.com" or ten identical rows: identical rows
hide every length and wrapping bug. Keep the fixtures list ready (long and accented names, right-to-left names, emoji,
a 64-character email local part, seven-digit and negative amounts, zero, broken and odd-shaped images, the counts 0,
1, 99, 100 and 1000) and push it through every slot. The list: `references/harness.md`.

## A disclosure shows its cue

Anything that opens, expands, scrolls or truncates has a visible cue that it does: a chevron, a count ("+3 more"), a
fade at the cut edge, a scrollbar. Truncated text has a way to the full value (a tooltip, an expanding row, the
detail view). If the cue is missing at any length or count, it is a break.

## Run it

```bash
node <antheo-review>/scripts/check-page.mjs "<harness>?state=all" --stress --shots ./stress
```

`--stress` fills every text slot with long and right-to-left text, multiplies lists, breaks images and zooms to 200%.
Run it once per state when `?state=all` is too long to read. Look at every screenshot; the script finds overflow, not
ugliness.

## Record one line per case

```
long name · 320px · light   held: wraps to two lines, avatar stays top-aligned
10× rows  · 1280px          broke: header scrolls away, totals row lost  → antheo-layout
rtl       · 390px · dark    broke: the chevron points the wrong way      → antheo-layout
```

Every break names its owner. Nothing is "fine" without a screenshot behind it.

## Done

- [ ] The axes chosen from the component's props; the skipped ones named with a reason
- [ ] Every state is rendered from the real component on one page, selectable with `?state=`
- [ ] Mock data is product-shaped; lists at the realistic count and ten times that; no lorem
- [ ] Every fixture is pushed through every slot at every real container width
- [ ] Every disclosure shows its cue; truncated text reaches its full value
- [ ] `check-page.mjs --stress` run; every screenshot looked at
- [ ] One line per case, every break handed to its owner
- [ ] Reported in antheo-review's format (`references/report.md` there): Block or Approve first, then Seen, Why
      and Fix with the value before and after

## Files

- `references/harness.md`: the state switcher, the variant picker, scenario axes and the full fixtures list
- `antheo-review/scripts/check-page.mjs --stress`: long and right-to-left text, multiplied lists, broken images,
  200% zoom
