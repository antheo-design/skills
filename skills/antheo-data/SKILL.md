---
name: antheo-data
description: Shows numbers people compare and act on, in tables that align and sort, charts picked by the question with one colour per measure, and KPIs with honest comparisons, all readable without colour and by screen reader. Use for tables, dashboards, charts, KPI tiles and any list of figures.
---

# Antheo Data

A table or a chart answers a question. This skill picks the form that answers it fastest and sets every value of how
numbers are shown. Single controls belong to **antheo-components**; number and date formatting rules to
**antheo-writing**; page widths to **antheo-layout**.

## Name the question first

Write the one question the view answers ("Which invoices are overdue?", "Is revenue on track?"). Values to compare
are a table; a change over time is a line; a ranking is sorted bars; one figure that matters is a KPI. If the
question needs two views, it is two questions.

## Tables

| Part | Value |
|---|---|
| Row height | `--h-row` (40px; 52px on a phone) from antheo-build's style block, 36px for the header row; one height per table, so the rows asked for fit the first screen |
| Lines and cells | a hairline between rows only, never between columns; the first column in `--text` at `--w-strong`, other cells `--text-2`; a status is a word (with a 6px dot), a role or count is plain text, never a pill |
| Cell padding | 16px inline (12px dense); the row height sets the rest; the first column is the human-readable name |
| Text | starts at the start edge |
| Numbers | at the end edge, `tabular-nums`, the same decimal places down a column, units in the header ("Amount, USD"), not in each cell |
| Header | `--t-meta` at `--w-strong` in `--text-2`; sticky once the body scrolls; sortable headers are buttons with `aria-sort` |
| Lines | a 1px `--line` hairline between rows; no vertical lines; no zebra stripes on short tables |
| IDs | mono; long ones truncate in the middle (`inv_8f2…91c`) with the full value on focus and hover |
| Row actions | at the row end, shown on hover **and** keyboard focus, always visible on touch |
| Selection | a checkbox column first; the header box shows "some" as indeterminate |
| Dates | relative in the row ("3 days ago"), the absolute date and time on hover and focus |
| Empty | what would be here, why it is empty, one action; zero results suggests loosening the filters |

On a phone, a table becomes a list of rows with the 2 to 3 key fields, or scrolls inside a labelled region with the
first column sticky. Never a page that scrolls sideways.

## Pick the chart by the question

| Question | Chart |
|---|---|
| How does it change over time? | a line (an area only for a single series, lightly filled) |
| Which is bigger? | bars, sorted, horizontal when labels are long |
| What share of a whole (2 to 3 parts)? | one stacked bar; a donut only for a single percentage with the number inside |
| Is it on track to a goal? | a bullet bar (the value and a target mark), never a gauge |
| How is it spread? | a histogram |
| Do two things move together? | a scatter |
| A trend in a small space | a sparkline 32 to 40px tall, no axes, the last point marked |

Never: pies with many slices, 3D, radial gauges, two y-axes, overlapping areas.

## Axes and labels

Bars start at zero. Three to five light gridlines (`--line`), no chart border, ticks at round numbers (0,
1k, 2k; never 651). Units once, in the title or the axis. Up to four series are labelled at their line's end instead
of a legend; more get a legend in the data's order. Date ticks as few as fit, never rotated.

## Colour: one measure, one colour

One measure is the accent; a comparison period is the same hue quieter, dashed or grey. Up to 5 to 7 categories get
hues evenly spaced at equal lightness and chroma in OKLCH; to make a point, colour one series and grey the rest.
Sequential data is one hue from light to dark; diverging data is two hues meeting at a neutral. Marks reach 3:1
against the background (WCAG 1.4.11), and red against green is never the only difference: vary lightness, add a
label or a pattern.

## KPIs

```
Revenue                       --t-body, --text-2
$48,260                       .t-num (28px) at --w-text, proportional figures; in an app, the one size allowed above --t-page (antheo-build rule 1)
↑ 12.4% vs last 30 days       an arrow, a sign and the period; coloured by good or bad, not by up or down
```

Three to five tiles at one size, the one that matters most first and wider; or one hero number with two or three smaller ones under a
hairline. The comparison period said once in the header when every tile shares it. Compact notation ("$48.3k") only
where space demands, with the full number on focus and hover. A fall can be good (costs, churn, wait times).

## Readable without sight or colour

Every chart has a title and one sentence saying what it shows ("Revenue grew 12% this month, mostly from returning
customers"), given as `role="img"` with that sentence as its name on a static SVG, or a table beside it. Points in an
interactive chart are reachable by keyboard and announce their value; tooltips open on focus as well as hover.

## What generated dashboards get wrong

Check each in `references/habits.md` before calling it done: a sparkline beside every figure · a pie for a ranking
or many categories · chart chrome · a chart with no period or source · a filter wired to one chart of four · labels
clipped at the axis; a chart spilling out of its card · sample data shown as real · thousands of rows put straight
into the page · rows of identical dots or icons standing in for a quantity.

## Honest numbers

A missing value is a gap, never a zero, and the chart says why it is missing. A metric names its definition where
it is shown (on focus or hover: "Active: signed in during the last 28 days"). Show the uncertainty when it is known
(a range, a sample size, "estimated") and compare like with like: the same period, the same base, the same units,
and a percentage change only on a base big enough to mean something (say "from 3 to 6", not "+100%").

## Done

- [ ] The question written; the form picked from it
- [ ] Tables: numbers at the end edge in tabular figures, units in headers, sticky sortable headers, actions on focus
- [ ] Charts: zero baselines for bars, one colour per measure, direct labels, 3:1 marks, never colour alone
- [ ] KPIs: the comparison stated, coloured by good or bad, proportional figures
- [ ] A sentence and a keyboard path for every chart; a phone version for every table
- [ ] Checked against every habit in `references/habits.md`

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `references/charts.md`: chart choice, axes, colour, KPI tiles, accessible charts, building simple charts in SVG
- `references/habits.md`: what generated dashboards get wrong, each with its fix
