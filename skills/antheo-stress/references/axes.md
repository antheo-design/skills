# Which axes to run: one cue each

Part of antheo-stress. Open it when choosing axes, above all for a small change, where running everything wastes
the run and hides the one case that matters. Each axis has a cue: the thing in the component that makes it apply.
No cue, skip it, and say so.

## Two reasons to skip, and only two

1. **The component has nothing for the axis to act on.** A fixed-width badge has no container axis. This holds for
   any run, a new component and a release included.
2. **The change did not touch what the axis acts on.** Only for a small change to a component that was stressed
   before. Read the diff first and write what it touched (a text slot, the list, a colour, a size, motion, the
   data it loads). An axis runs when its cue is in those lines or depends on them.

"It probably works" is not a reason. When unsure whether a cue is there, run the axis: it is one more screenshot.

## The cues

| Axis | Run it when the component has | Safe to skip when |
|---|---|---|
| Long content | a slot filled by people or by data: a name, a title, an address, a translated label | every string has a fixed format (a 6-digit code, a time, a currency code) and the product ships in one language |
| Unbroken word | a slot that can hold a URL, an email, a file name, an id or a hash | the slot takes only words from a fixed list in code |
| Awkward characters | any text people type: accents, apostrophes, emoji, markup-like text | all text comes from a fixed list in code |
| Empty and missing parts | an optional prop or slot, or a value the real data can send as `null` or `""` | every part is required by the type and present in the real data (check the data, not only the type) |
| Quantity: 0, 1, 2, realistic, ten times | anything drawn from an array: a list, a table, tabs, chips, options, pages | it shows exactly one item, or a fixed set written in code |
| Numbers, money, dates | a figure, an amount, a count, a date or a duration | it shows no figures |
| Images | an image slot: an avatar, a cover, a logo, an upload | no image slot |
| Container width | more than one place of use at different widths, or a fluid width (percent, flex, grid) | a fixed pixel size everywhere it is used |
| Async states: loading, error, partial, success | a fetch, a submit, or a `loading`, `error` or `disabled` prop | no async work and no such props: only the default and the interactive states exist |
| Interactive states | anything that can be pressed, focused, selected or opened | nothing interactive: text, a divider, a picture |
| Dark theme | a colour, shadow, border or image of its own, in a product with a dark theme | the product has one theme, or the change touched no colour, shadow or image |
| Right to left | a direction: an icon that points, start and end padding, a progress or slider, an order of items, a corner badge | the product ships no right-to-left language (still push one right-to-left name through every slot people type into) |
| 200% zoom | a fixed height or width, truncation, `nowrap`, text placed absolutely or inside an icon-sized box | a small change that touched no size, spacing or text. Never skipped for a new component |
| Reduced motion | anything that moves: a transition over 200ms, a keyframe animation, autoplay, a moment | nothing moves, or the change touched no motion |
| Forced colours | a state or an edge shown only by a fill, a shadow or a background image: a selected chip, a toggle track, a focus ring made of `box-shadow`, a custom checkbox | only text and native controls with their own borders, or the change touched no state styling |
| Slow CPU (4×) | animation, many rows, layout measured in script, dragging, filtering as you type | static and small: no script work after the first render |
| Slow network | a fetch, lazy images or code, a skeleton, a spinner, streamed content | all its data arrives with the page as props and it has no images |

## A small change, worked

The change: the row's padding went from `12px 16px` to `padding-block: 10px; padding-inline: 16px`.
It touched: size and a start and end property. So:

```
run:     long content · unbroken word · empty and missing parts · container width · interactive states (the
         hover fill and focus ring follow the padding) · 200% zoom · right to left
skipped: awkward characters (no text handling touched) · quantity (the list code is unchanged) · numbers,
         images (the row has neither) · async states, slow network (no data code touched) · dark theme, forced
         colours (no colour or state styling touched) · reduced motion, slow CPU (no motion or script touched)
```

Seven run and ten skipped: all 17.

## In the result

Every axis in the table appears once: under the cases it produced, or on the `skipped:` line with what made it
safe. An axis that appears nowhere was forgotten, and the run is not done. Proof: the axes run plus the axes
skipped add up to the 17 rows above.
