# Design quality rubric

Score each question 1 to 5. Use the anchors; don't average your feelings. A page is **shippable at ≥ 3 on every question** and **excellent at ≥ 4 on six or more**.

| # | Question | 1 | 3 | 5 |
|---|---|---|---|---|
| 1 | **Job**: does the eye land on what this screen is for? | can't tell what to do | the job is findable after a scan | the job is the first thing you see; nothing competes |
| 2 | **Hierarchy**: clear levels of importance? | everything shouts or nothing does | 2 to 3 levels, one minor conflict | one dominant element, a clear second level, quiet rest; one primary action per region |
| 3 | **Grouping and rhythm**: is related stuff together, is the spacing consistent? | 5+ near-miss or off-scale spacing findings, or 6+ distinct left edges | 1 to 2 near-miss findings, 4 to 5 left edges, no empty-quarter finding | 0 near-miss findings, every gap on the scale, section headings share one left edge (3 or fewer left edges on the page), 0 empty-quarter findings; groups obvious without lines |
| 4 | **States**: empty, loading, error, long content, disabled? | happy path only | some states, generic | every state designed as one family; nothing jumps between them |
| 5 | **Words**: clear, specific, consistent? | jargon, "Submit", "Error occurred", hype | mostly clear, some filler | sentence case, verb buttons, errors that say how to fix, no filler |
| 6 | **Quiet and precise**: is every style from one small system, with nothing there for show? | invented styles: outlined or coloured-edge cards, big corners, a huge headline, three weights, pills and dividers everywhere, chrome nobody asked for; or decoration (tilted notes, hand-drawn marks, colour bands); or 5+ tells | the system is followed but one count is over (a fifth size, a third tag, a stray divider), or one or two tells | at most 4 to 5 text sizes, 2 weights, 3 corner sizes; cards without outlines; colour only for "on" and one highlight; only what was asked; the main task on the first screen |
| 7 | **Motion**: purposeful and kind? | none where needed, or everything moves | every control answers press; 1 to 2 effects with no reason | explains change, fast on repeat, one delight at a completion point, reduced-motion safe |
| 8 | **Craft**: the details? | 3+ craft findings (mismatched radii, icon sizes, lopsided padding, a layout jump) | 1 to 2 craft findings, none in the main flow | nested radii, optical alignment, one icon style, tabular numbers, no shifts, both themes polished |

## How to judge quiet and precise (question 6)

Count, on the 1280px screenshot in light and dark: text sizes, weights, corner sizes, accent things, tags,
hairlines. The limits are antheo-build's usage rules. Then ask of each element "if this were removed, would anyone
miss it?", and of each control "is the one line a person needs here (a limit, a consequence) present?". Count tells
from antheo-direction `references/slop.md`. A familiar layout is never a tell, and neither is a small type size.

For a component, also do the side-by-side test (antheo-components `references/look.md`): louder, larger or browner
than the best existing piece caps this at 3; any costume (slop.md C1 to C7) caps it at 2.

## Combining with the page check

Report both: **check score** (0 to 100, measured) and **design score** (8 to 40, judged). A page needs both: a high check score never overrides what the screenshots show. When they disagree, the screenshots win, and the checker gets a new rule.
