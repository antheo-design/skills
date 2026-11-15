# Charts and numbers for dashboards

## Pick the chart by the question

| Question | Chart |
|---|---|
| How does it change over time? | line (area only for a single series, light fill) |
| Which is bigger? | bars (horizontal when labels are long; sorted) |
| What's the ranking? | sorted horizontal bars, or a ranked list with inline bars |
| What's the share of a whole (2 to 3 parts)? | a single stacked bar; a donut only for one percentage with the number in the middle |
| How is it spread out? | histogram |
| Do two things move together? | scatter |
| Is it on track to a goal? | a bullet bar (value bar + target mark), not a gauge |
| A trend in a small space | sparkline (no axes, 32 to 40px tall, last point marked) |

Avoid: pies with many slices, 3D anything, radial gauges, dual y-axes, area charts with overlapping series.

## Axes and labels

- Bars start at zero. Lines may start elsewhere if the axis is labeled.
- 3 to 5 gridlines, very light (`--line`); no chart border; ticks at round numbers ($0, $1k, $2k, never $651).
- Units once: in the title ("Revenue, USD") or the axis, not on every tick.
- Label series directly at the line's end when ≤ 4 series; otherwise a legend in the same order as the data.
- Dates on the x-axis: as few labels as fit, never rotated text; "Nov 1, Nov 8, Nov 15…".
- Tooltips on hover **and** keyboard focus: the exact value, the date, the comparison.

## Color

- One measure = one color (the accent). Comparison period = the same hue at lower contrast, dashed, or gray.
- Categories (≤ 6): hues evenly spaced at equal lightness; never rely on red/green alone.
- Highlight to make a point: one series in accent, the rest gray.
- Chart marks need 3:1 contrast against the background (WCAG 1.4.11).

## KPI tiles

```
Revenue                          ← label, --t-body, --text-2
$48,260                          ← value, .t-num at --w-strong
↑ 12.4% vs last 30 days          ← change: arrow + sign + period; success/danger color plus the arrow
```

- A big standalone figure (a KPI, a hero number) uses the font's **normal proportional figures**, never a monospace font: many fonts give the comma and period a full digit's width under `tabular-nums`, which prints "$50 , 699". `tabular-nums` is for figures that line up in a column or change in place (tables, timers, counters); there, check the separator does not open a gap, and if it does, wrap the separators in `<span style="font-variant-numeric: proportional-nums">`.
- 3 to 5 tiles. The one that matters most is bigger (spans two columns, or a larger value).
- Show the comparison period once in the page header if every tile uses the same one.
- Format: `Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 })` for big money; compact notation ("$48.3k") only where space demands, with the full number in a tooltip.
- A change can be good when it goes down (costs, churn, response time): color by good/bad, not by up/down.

## Accessible charts

- Give the chart a title and a one-sentence summary of what it shows ("Revenue grew 12% this month, mostly from returning customers").
- `role="img"` + `aria-label` with that summary on a static SVG chart; or a visually hidden data table next to it.
- Interactive points reachable by keyboard (arrow keys across points) with the value announced.

## Building charts without a library

For simple lines and bars, inline SVG is enough: compute points from the data, draw a `<polyline>` or `<rect>`s, use `vector-effect: non-scaling-stroke` so lines stay crisp when the SVG stretches, and round axis maxima up to a nice number (1, 2, 2.5, 5 × 10ⁿ).

```js
const niceMax = (v) => { const p = 10 ** Math.floor(Math.log10(v)); return [1, 2, 2.5, 5, 10].map((m) => m * p).find((n) => n >= v); };
```
