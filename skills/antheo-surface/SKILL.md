---
name: antheo-surface
description: Gives every surface its depth from what it sits on, whether it rises or sinks, its fill, edge, drop and corner, in light and dark, plus hairlines, translucent chrome, image outlines, optical alignment and icon sizing. Use when UI looks flat, boxy, muddy in dark mode or "cheap", when cards and menus need depth, or when shadows, borders, radii or icons look off.
---

# Antheo Surface

Depth is what makes an interface feel touchable instead of printed. It comes from three parts on every surface (a
**fill**, an **edge** and a **drop**), each taken from the ground it sits on, so a button reads the same on a card, a
row, a menu or a sheet, in light and dark. This skill owns those parts, the corners, the lines, translucent chrome,
image outlines, optical alignment and icons.

Heights, padding, states and anatomy belong to **antheo-components**; colour steps and contrast to **antheo-color**;
token names to **antheo-tokens**; how a surface moves to **antheo-motion**; phone sheets to **antheo-mobile**.

## Decide in this order

1. **The ground.** Name what the thing sits on: the page, a panel, a card, a row, an overlay. Every value below is
   taken from it.
2. **Rise, sink or stay flat.** Raised: something you press or a unit of content. Sunk (a well): somewhere you type
   or a track. Flat: anything that spacing alone already holds together. Most things stay flat.
3. **The level.** Control, card, menu, dialog: one step of the ladder each, never invented in between.
4. **The corner.** From the scale, then concentric with its parent.
5. **The lines.** Space first; a hairline only where space can't do the job.
6. **Dark.** Lighter means higher; check every surface again.
7. **Media and icons.** Outlines on images, icons sized to their text, nudged where geometry looks off.

## The layer stack

Every value is a variable in antheo-build's style block (`references/quiet.css`); a build never writes a shadow,
an edge or a radius of its own.

| Layer | Variable | Light | Dark |
|---|---|---|---|
| The page | `--bg` | one step off white | the darkest step |
| A card, a table, a dialog | `--surface` | white | a clearly lighter fill than the page |
| A raised control (a secondary button, a chosen segment) | `--raised` | white | lighter again |
| A well (a field, a switch or progress track) | `--well` | a step below its surface | a step above it |
| Hover, selected | `--hover`, `--selected` | one and two steps darker | lighter |

White on white is told apart by a faint edge and a soft drop, never by a visible line.

## Four shadows, and no outlines

| Variable | For | What it is |
|---|---|---|
| `--sh-control` | a raised button, a segmented thumb | a 9% edge and a 1px drop |
| `--sh-card` | a card, a table | a 5.5% edge, a 1px drop and a short soft drop |
| `--sh-lift` | a menu, a popover, the one card that leads (a recommended plan) | the same edge, a deeper drop |
| `--sh-dialog` | a dialog, a sheet | the deepest drop |

**A card is never outlined.** No border, no ring you can see as a line, no coloured edge, in any theme. Emphasis is
the next shadow up (`--sh-lift`), never an outline, and never a size change. No glow, no coloured shadow, no card
inside a card. Keep `border: 1px solid transparent` on a card or button so forced-colours mode, which drops shadows,
still draws an edge.

## Dark: lighter is higher

A shadow barely shows on a dark ground, so height is the fill: the page is the darkest, a card clearly lighter, a
raised control lighter again, with one faint light edge (6% white) and no drop on cards. Drops stay only under
menus, dialogs and a lifted card. No lit top edge. Sizes, padding and corners never change between themes.

## Three corners

| Variable | Size | For |
|---|---|---|
| `--r-card` | 10px | cards, tables, dialogs, menus |
| `--r-control` | 6px | buttons, fields, chips, menu items |
| `--r-tag` | 4px | tags |
| `--r-full` | fully round | switches, avatars, a segmented control; never a button |

A sheet on a phone uses `--r-sheet` (14px) on its top corners. A shape inside another with an even gap takes
**outer − gap**, never under 4px. Big round corners (14px and up on cards, pill buttons) read as generated.

## Wells sink

A field is a well, not an outlined box: the block's `.field` (`--well` with the faint inner `--well-edge`), a shade
deeper than what it sits on in light, and a shade brighter in dark. A form is then a column of quiet fills, not a stack of
frames. Focus adds the 2px `--focus` ring; an error swaps the inner edge for `--danger`, and with focus it shows both.

A small control whose edge is its only shape (an empty checkbox or radio, a switch's off track, a slider's track)
needs 3:1 against what it sits on (WCAG 1.4.11). A 1px `--text-3` edge is the lightest in the block that passes (3.7
to 4.3:1 on every surface, light and dark); the faint control ring or `--line` (about 1.1:1) leaves an empty box
invisible to many people.

## Almost no lines

One hairline (`--line`, 1px). It appears only between repeating rows of a list or table, and under a sticky bar
once content has scrolled beneath it. Never under a card's header, between sections of a page, between a price and
its features, around things that spacing already holds together, or under a top bar at rest. No double edges (a bordered thing
inside a bordered parent). Where content scrolls, a short fade into the surface colour hints that there is more, which a hard cut does not.

## Rows fill in place

A list, menu or table row shows the pointer with the local ground **+1 step** and the chosen row with **+2 steps** in
full ink. Each row lights its own fill where it sits (timing from antheo-motion); one highlight never slides between rows.
A picked option in a picker also keeps its check, so the choice is not carried by colour alone.

## Behind an overlay

Dialogs dim the page with `--backdrop` (about a third in light, 60% in dark). A side panel darkens the page only if it sits over it.
A little confirmation that opens where its button is, without a backdrop, uses the control level, not the dialog's.

## Translucent chrome, only over moving content

Blur and translucency are for chrome that content scrolls under (a sticky header, a toolbar, a phone tab bar):
the surface at 80% with `backdrop-filter: blur(12px) saturate(1.4)`. Never on cards, menus or dialogs. Give a solid
fallback under `@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)`, and
measure its text against the worst spot behind it (antheo-color).

## Images and media

Content images get a `1px` outline drawn `1px` inside the edge, black at 10% in light (`oklch(0 0 0 / 0.1)`) and white
at 10% in dark (`oklch(1 0 0 / 0.1)`). A warm or cool grey, or the accent, shows there as a coloured fringe. Skip transparent art (logos, illustrations). An
image inside a card takes the concentric radius.

## Align by eye where geometry looks off

A button's icon side takes `2px` less padding (antheo-components holds the numbers). A play triangle shifts `2px`
toward its point; an asymmetric glyph is fixed in the SVG, not with margins. A number beside an icon aligns to the
icon's optical centre, not its box.

## Icons: few, grey, sized to their text

`16px` beside body text, stroke `1.5px`, in `--text-3` (`currentColor`), one outline set per product. Use them in
navigation, on an icon-only button (with an accessible name), as the tick in a list and for a status. Never inside
a primary button, on headings, in a coloured circle or one per row by default; a logo mark is a neutral tile. Arrows,
back, send and undo flip in right-to-left (`:is([dir='rtl'], [dir='rtl'] *) .icon { scale: -1 1 }`); checks, play,
search and logos don't.

## What generated UI gets wrong here

Check each in `references/habits.md` before calling it done: the same big soft shadow on every box · border, shadow
and tint together · the "not generated" costumes · an icon in a tinted tile · text 2px from an edge · pill corners
on things that aren't controls · fake product chrome drawn in boxes · two or three icon sets in one build.

## Done

- [ ] Every surface's ground named; most things flat; raised and sunk only where it means something
- [ ] Only the block's four shadows; no card outlined in any theme; emphasis is `--sh-lift`
- [ ] Dark checked: lighter is higher, a faint light edge, no drops on cards
- [ ] Rings as box-shadows over a transparent border; no size changes between themes
- [ ] Three corner sizes (10, 6, 4) and fully round only for switches and avatars
- [ ] Hairlines only between repeating rows and under a scrolled sticky bar
- [ ] Rows fill in place; picked options keep a check
- [ ] Translucent chrome has a solid fallback; images outlined; icons sized and mirrored correctly
- [ ] Checked against every habit in `references/habits.md`

## Files

- `references/recipes.md`: the layer stack as CSS custom properties redeclared per surface, the dark mapping, a
  sticky header with its scrolled hairline and fade, translucent chrome with both fallbacks, image outlines
- uses `antheo-components/references/tokens.css` for the component custom properties
- `references/habits.md`: what generated UI gets wrong here, each with its fix
