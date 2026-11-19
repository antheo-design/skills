---
name: antheo-type
description: Sets how text looks and reads, from the faces to a scale with few sizes, weights by size, line height and tracking by size, line length, wrapping, numbers and loading fonts without a jump. Use for type scales, choosing fonts, text that feels cramped, loud or hard to read, or text that wraps badly.
---

# Antheo Type

> **How to read this skill.** Its numbers are house defaults (antheo-build, "Four kinds of rule"): they give way to the
> person, a reference, a brand or the project's own system. What protects people (contrast, focus, targets, reduced
> motion, nothing broken) is a requirement and never bends.

Most of an interface is text, so its type decides how calm or noisy it feels. This skill picks the faces and sets
every size, weight, line height and wrap. The words themselves belong to **antheo-writing**; text contrast to
**antheo-color**; the display face that carries a landing page's identity is chosen with **antheo-direction**.

**Exact or a judgement.** Some of this can be measured, so it is checked and never argued: a size that is not on
the scale, a weight the font request doesn't load, a touch field under 16px, text clipped under 1.4.12 spacing, a
line over the measure, figures that shift. The rest (the face, the tracking, how loud a title is) is judgement:
say what you see and why, and offer the change as a choice.

## One face for the interface

Product UI uses one text face: the project's own, else Geist (the Quiet preset). A brand whose face is a serif or
something else keeps it. A mono only for code, IDs and keys a person copies. A plain face such as Inter or Geist is
fine: precise spacing and hierarchy matter more than the face. Text in another script (Arabic, Hebrew, Devanagari,
Chinese, Japanese) needs a face made for it, listed after the Latin one, with its own line height; turn off a
`font-size-adjust` tuned for Latin there, or the script shrinks. A Brand page
(antheo-direction) may add one display face for headlines only; everything read or pressed (body, labels, buttons,
prices) stays in the text face. Never two similar sans faces, whose difference looks like a mistake.

**Fallbacks draw at the same size.** The stack ends in system fonts, and the root carries `font-size-adjust` set to
the face's x-height ratio (Geist 0.53; the block sets it). The system font shown while the web font loads, a glyph
the font lacks and the mono face then all match its visual size, so text never jumps when the font arrives. A
different typeface needs its own number: `node <this-skill>/scripts/x-height.mjs "Inter"` measures it. Never keep
another font's number; it would resize the real font.

## Six sizes exist; a screen uses four or five

The scale lives in antheo-build's style block (`references/quiet.css`). In product UI, small, precise type reads as
designed and large, loose type reads as generated. The scale is the Quiet preset's: a Brand page or a praised
reference sets its own display sizes (antheo-direction, "Type at the size of the idea"), and lettering on a drawn
object is drawn to the object. A second face beside the block's font sets `font-size-adjust: none` on itself, or its
own measured number: the block's 0.53 is Geist's.

Sizes and line heights are written in rem, so text follows the size the reader set in their browser; the table
gives them in px at the usual 16px root. Never a font size in px outside the block: use the variable.

| Variable | Size / line height | Tracking | For |
|---|---|---|---|
| `--t-meta` | 12 / 16 | 0 | help, footnotes, table headers; never smaller |
| `--t-body` | 13 / 20 | 0 | everything read or pressed: text, labels, buttons, fields, rows |
| `--t-title` | 15 / 22 | −0.01em | a card, plan, dialog or section title |
| `--t-page` | 20 / 28 | −0.015em | an app page's title: the largest text in an app |
| `--t-num` | 28 / 32 | −0.02em | a price or key figure: proportional alone, tabular in a column or when it ticks |
| `--t-display` | 36 / 40 | −0.025em | a marketing headline: the largest text in the preset |

On a phone, and on any screen whose main pointer is a finger, the block raises them (body 15/22, title 17/24, page
22/28); at phone width the headline drops to 28/32. Fields are 16px on any touch screen so iOS doesn't zoom into
them. That is the fix; never `maximum-scale=1` or `user-scalable=no`, which
take zoom away from the people who need it (1.4.4). An app screen uses at most four of these (a data screen adds
`--t-num`, five), a marketing section at most five. Long reading (an article, docs) is the one exception: 16px
body, 1.6 line height, at most `65ch` a line.

## Two weights

In the Quiet preset, `--w-text` (450) for text and for prices; `--w-strong` (550) for titles, labels and buttons. A
project or brand with its own weights keeps them. In the preset: never 600 or 700,
never a third weight, never a weight the font request doesn't load. The block sets `font-synthesis: style`: the
browser may slant an `<em>` when the face ships no italic, and never fakes a bold or small caps. A
face that ships a real italic loads it. In-between weights give a quieter hierarchy than 400 against 700. A weight
never changes on hover.

## Hierarchy without shouting

Position first, then space, then one step of size or weight, then tone (`--text` to `--text-2`). A headline is one
colour and one weight, two lines at most, with no grey half and no coloured or italic word. More space above a
title than below it. Line heights are the block's values, on the 4px grid at the usual root size, so heights add up
(a 32px control is a 20px line plus 6px above and below). Running text outside the block's roles takes a unitless
line height, so it follows its size. Tracking tightens only as size grows; never track body text, never
negative under 14px. Uppercase labels are rare (an eyebrow over every heading is a tell).

## Wrapping

- Headings and card titles: `text-wrap: balance`; paragraphs: `text-wrap: pretty`.
- A word never breaks mid-word. Labels, values and buttons stay on one line (`white-space: nowrap`) and the layout
  gives them room; a heading wraps between words, never inside one. Only strings
  people typed (emails, links, IDs) take `overflow-wrap: anywhere`, with `min-width: 0` on their flex item.
- One line with an ellipsis has a way back to the full text (a tooltip or the detail view) and `min-width: 0` on its
  flex item; never truncate a value someone compares.
- A short line in a card that is already narrow needs no measure of its own: a `max-width` there only wraps it early
  into a ragged second line. Cap the measure on wide containers, not inside narrow ones.
- Text survives WCAG 1.4.12's spacing (line height 1.5, letters +0.12em, words +0.16em) with nothing clipped: no
  fixed heights on boxes that hold text.

## Numbers

`font-variant-numeric: tabular-nums` wherever numbers line up or change (tables, totals, timers, counters); a big
standalone figure keeps proportional figures. Format with `Intl` (antheo-writing), never by joining strings.

A unit stays with its number: on the number's baseline, 6px after it, on one line, in `--t-body` and the second
tone: "$12 per member / month". Use an inline row aligned on the baseline (`display:
inline-flex; align-items: baseline; gap: 6px; white-space: nowrap`), never a reserved fixed-width box that opens a
gap. A price in a plan card is `--t-num` at `--w-text`.

## Headings step down with their level

An `h3` never looks bigger than an `h2`, and no heading drops below body size, except an overline chosen
on purpose.

## Fine points

- Underlines: `text-underline-offset: 0.18em`, `text-decoration-thickness: from-font`, `text-decoration-skip-ink: auto`.
- Font features through properties (`font-variant-numeric`, `font-variant-caps`); `font-feature-settings` only for
  a feature with no property.
- Load every face and weight the design uses; the browser never invents a bold (`font-synthesis: style`).
- A variable font is one file for every weight: ask for the range you use (`wght@400..600`), set weight with
  `font-weight`, and leave `font-variation-settings` for an axis with no property of its own (each declaration replaces the whole
  list, so an axis set higher up is lost unless it is repeated).
  Optical size follows the font size by itself (`font-optical-sizing: auto`).
- OpenType features worth knowing by name: `tnum` (figures that line up), `zero` (a slashed zero in codes and IDs),
  `case` (punctuation that sits right beside capitals), `ss01` and up (a face's alternates: pick per brand, once).
- `-webkit-font-smoothing: antialiased` on the root (the style block sets it).
- Buttons and badges can trim the line box: `text-box: trim-both cap alphabetic`, where supported.

## Load fonts without a jump

Load only the weights you use, variable where possible; `font-display: swap` for text, `optional` for decorative
display faces. In Next.js use `next/font`, which self-hosts and matches the fallback's metrics; elsewhere add a
fallback `@font-face` with `size-adjust`, `ascent-override` and `descent-override`. End every stack with system faces.

## What generated UI gets wrong here

Check each in `references/habits.md` before calling it done: a face picked to look different · a framework's whole
ramp · a button, tab or nav label on two lines · a last line of one word · gradient-filled text · one line height
for everything · typewriter characters in rendered copy · figures that jiggle.

## Done

- [ ] One interface face (a display face only for headlines on a Brand page); mono only for code and IDs
- [ ] Sizes only from the block, none typed in px: at most 4 on an app screen (5 with a key figure), 5 in a
      marketing section; 16px in touch inputs, zoom never switched off
- [ ] Two weights, both loaded; a headline in one colour, two lines at most
- [ ] Headings in level order; more space above a title than below
- [ ] Wrapping set; truncation has a way back; text survives 1.4.12 spacing
- [ ] Numbers tabular where they align or change; every unit beside its number on one baseline; no word broken
- [ ] Fonts load without a layout shift
- [ ] Checked against every habit in `references/habits.md`

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `scripts/x-height.mjs`: a typeface's x-height ratio, for `font-size-adjust`
- `references/type.md`: faces by mood, scale ratios, fluid display sizes, wrapping recipes, numbers, loading
- `references/habits.md`: what generated UI gets wrong here, each with its fix
