---
name: antheo-layout
description: Lays out screens and pages so they read clearly and hold up at every width, from a 320px phone to a 2560px monitor, in long languages and right to left, through the one job, hierarchy, grouping by space, one content edge, widths, and responsive structure. Use when laying out a screen, or when something breaks on a phone, looks empty on a big screen, or feels cluttered.
---

# Antheo Layout

> **How to read this skill.** Its numbers are house defaults (antheo-build, "Four kinds of rule"): they give way to the
> person, a reference, a brand or the project's own system. What protects people (contrast, focus, targets, reduced
> motion, nothing broken) is a requirement and never bends.

Layout decides what matters most, what belongs together, and what happens when the space changes. This skill owns
page structure, the space between things, widths, and how a screen changes with its width and language. Spacing
inside a single component belongs to **antheo-components**; tables and charts to **antheo-data**; phones to
**antheo-mobile**. antheo-build's fundamentals come first; this skill is their detail.

## Write the screen's one job first

"This screen lets **[who]** **[do what]** so they can **[outcome]**." Then the one primary action, the 3 to 5 things
people look for first, and what can wait. A screen that needs two sentences is two screens. Start from its pattern:
a card in `references/screens/` (pricing, settings, sign-up, list) or `references/screens.md` for the rest.

## Hierarchy in five moves, in order

Position, then space, then size, then weight and tone, then containers last, only when space can't group. The squint
test: blur the screenshot, and the shapes you still see are the things from the job, in order.

## Group with space: one value per role

| Role | Gap (style-block variables) |
|---|---|
| A label to its field | 6px |
| A title to its description | 2 to 4px |
| An icon to its text; chips in a grid | `--s-2` (8px), the same both ways |
| Items in a list; buttons in a row | `--s-2` to `--s-3` (8 to 12px) |
| One field to the next; cards in a row | `--s-4` (16px) |
| Blocks inside a card | `--s-5` (20px) |
| A section's title to its card | `--s-3` (12px) |
| One section to the next | `--gap-section` (32px) |
| Card padding | `--pad-card` (20px; `--s-6` in a plan card) |
| Above a marketing heading | `--s-16` (64px) |
| Page side padding | `--gutter` (24px; 16px on a phone) |

The steps are 4, 8, 12, 16, 20, 24, 32, 48 and 64px. Compact beats roomy: the main task fits the first screen.
More space above a title than below it; equal padding on every side of a card or bar. The gap inside a group is at
most half the gap between groups; two gaps that look alike are the same token (a 2 to 12px difference is a defect). A heading sits about
twice as far from what is above it as from what it labels. `gap` on the parent, never margins on children.

Controls with no edge of their own (text buttons, icon buttons, links in a row) need more room, because nothing marks
where one ends: `24px` between their visible glyphs, padding counted, against `12px` between bordered or raised
controls. Full-width buttons on a phone sit `16px` in from the screen edges, never flush.

## Chrome only as named, then one edge

A "section" or a "component" gets no site header, footer or navigation. An app page gets one bar (`--h-bar`,
`--surface`, no line under it): a neutral logo tile, the product name, and the one context the request names, as
plain text. A sidebar only when the request lists destinations; never an avatar, "Log in" or links nobody named. The
bar's contents sit on the window gutter.

Under it, one centred column holds everything, and everything in it shares its left edge: every heading, card and
text block starts on it, and things at the end (a row's control, a card's button) finish on its right edge. A pill
or nav item lines up by its **text**. At most three left edges, and no two within 8px of each other: almost aligned
is worse than clearly different.

Not every screen is one column. A dense tool (an editor, an inbox, a data workspace) sets panes side by side, the
main one widest, the others resizable or collapsible, and keeps the one-edge rule inside each pane. An editorial or
long-reading page runs a reading measure (`--measure`) with images and quotes free to break out of it. "Fits the
first screen" is for a task screen; a document, a report or a story scrolls.

Text starts at the start edge. A centred block centres everything in it (its heading with its content); never a
left-aligned heading above a centred grid, or the reverse.

When to centre: a card with one purpose and few words (a confirmation, an empty or error state, a sign in) centres
its picture and its heading. Forms, lists, tables and settings keep the start edge, even inside a centred card:
people read fields and rows from their start.

## Siblings match

Sections of one page share one container (all cards, or none), one padding, one heading style and one gap; the last
section is not special (a danger zone is a section like the others). Cards in a row share width, height, padding,
radius and the order of what is inside, with actions pinned to the bottom so buttons line up across cards (`subgrid`
on the cards' rows lines up titles, prices and lists across them too). Controls in
a row share one height. Before review, list each set of siblings and check them against each other.

## Widths

| What | Width (a variable in antheo-build's style block) |
|---|---|
| A form, a sign-in, a dialog | `--w-form` (400px) |
| Settings, a reading column inside an app | `--w-settings` (680px), one column |
| A pricing row | `--w-pricing` (1040px) |
| Lists, tables, dashboards | `--w-data` (1120px) |
| Prose | 65ch |

Each is centred in the window. The main task fits the first screen at 1280×800: compact beats roomy. Fields that
belong together share a row (name and email). Never invent a second half, a title column or extra chrome to fill
space. A block narrower than the column it sits in (a form card on a settings-width page, a dialog's content, one
group of settings) takes the column's width, with related items side by side, so it keeps the one edge; only a block
that stands alone on the page (a sign-in card) is narrower, and then it is centred. Never a narrow block against
one edge with bare space beside it: it reads as unfinished.

## Built to flex, not tested into shape

The kit (`.scene`, `.split`, `.auto-grid`, `.stack`, `.cluster`, `.pair-row`, `.figure`, `.scroll-x`, `.shell`)
wraps, clamps and scales by itself from 320px to 2560px. No fixed widths or heights on boxes that hold text. Phone
first, deciding each region:

| Region | Phone | Desktop |
|---|---|---|
| Navigation | a bottom bar (≤ 5) or a menu | a top bar (≤ 7) or a sidebar |
| Side-by-side panels | stacked, the important one first | columns |
| Card grids | one column | `repeat(auto-fill, minmax(min(100%, 18rem), 1fr))` |
| Filters and secondary info | behind a button, in a sheet | always shown |
| Dialogs | a bottom sheet | centred |

Components that live at different widths use **container queries**; the page uses media queries, with breakpoints
where the content breaks, not at device sizes. Things that trap layouts: a `container-type` flex item with no
definite width collapses to nothing; `width: 100vw` causes sideways scroll; a page that jumps sideways when a
scrollbar appears needs `scrollbar-gutter: stable`; an overflowing grid item in a
fixed-height grid is squashed (use `grid-auto-rows: max-content`); centring a scroller hides its top (use
`align-content: safe center`). More in `references/responsive.md`.

## The platform details

- No sideways scroll at 320px (WCAG 1.4.10): `min-width: 0` on flex and grid children that hold text.
- A word never breaks mid-word: labels, values and buttons stay on one line and get room; a heading wraps between
  words; only strings
  people typed (emails, links, IDs) take `overflow-wrap: anywhere` (`.long-text`).
- A number keeps its unit beside it, on one baseline (`.figure`), never in a reserved fixed-width box.
- Full-height layouts use `100dvh` (or `100svh` for a hero), never `100vh`.
- Bottom bars and sheets respect safe areas: `padding-bottom: max(16px, env(safe-area-inset-bottom))`.
- `overscroll-behavior: contain` in sheets and scrolling panels; `touch-action: manipulation` on controls.
- Sticky headers never cover the focused element (WCAG 2.4.11): `scroll-padding-top` equal to the header's height.
- A bar fixed to the bottom that holds an action is opaque with a hairline above it (a tab bar may be translucent,
  antheo-surface), and the content gets bottom padding equal to its height; a short form keeps its button in the flow (antheo-mobile). A top bar has no line at rest and takes one once
  content has scrolled under it (antheo-surface).
- Show that more exists: a scroller lets the next card peek by 16 to 32px; a collapsed list says what and how many.
- What you see is the order it reads in: never rearrange with `order`, `row-reverse` or grid placement, because
  keyboard and screen-reader order follow the markup. Move the markup instead.
- A container query needs a box with a width: `container-type: inline-size` on a flex item, an inline-block or an
  absolutely placed element with no set width collapses it to zero. Give it a width, or query its parent.
- Safe areas only work with `viewport-fit=cover` in the viewport meta (without it every `env()` inset is 0). The
  left and right insets are physical, so pair them with `left`/`right` and a `[dir="rtl"]` override, never with
  `inset-inline-*`.
- A critical action is never parked where zoom, resizing or scrolling can clip it: it sits in the flow or in stable
  chrome, and it is the last thing to wrap.

## Every language

Write every direction as start and end (`margin-inline-start`, `inset-inline-end`, `text-align: start`), so
right-to-left works without a second stylesheet. Mirror only icons that mean direction. Isolate people's text with
`<bdi>` or `dir="auto"`. Leave room: long text grows 30 to 40% in German, and labels under 10 characters can grow 2 to 3
times. Scripts that need more line height, and what mirrors: `references/languages.md`.

## Cards only when they earn it

A card is for a unit of different-in-kind content (a dashboard's panels). Many similar items are a list; values to
compare are a table (antheo-data). A row of cards follows "Siblings match" above.

## Check it

The page check (antheo-review) runs 320, 390, 768, 1024, 1280, 1440 and 1920px in light and dark. Look at 390, 1280
and 1920 yourself, and at 200% zoom.

## What generated UI gets wrong here

Check each in `references/habits.md` before calling it done: the page everyone has seen · the hero formula · a hero
sized in vh · everything centred · a stat band · one value for every gap · sideways scroll hidden, not fixed · a
grid blown out by its content · one card alone on the last row · every panel on screen at once.

## Done

- [ ] The one job written; the eye lands on it first; one primary action per screen or region
- [ ] Gaps only from the role tokens; the inside gap at most half the between gap
- [ ] Chrome only as named; one centred column from the block's widths; at most three left edges, none within 8px
- [ ] The main task fits 1280×800
- [ ] Siblings match: sections, cards in a row, controls in a row
- [ ] No broken words; units beside their numbers; nothing covered by a bar; no invented second half
- [ ] Each region's phone version decided; container queries for components; no sideways scroll at 320px
- [ ] `dvh`, safe areas, sticky headers that never hide focus
- [ ] Start and end everywhere; room for 2 to 3 times longer labels; right-to-left checked
- [ ] Checked against every habit in `references/habits.md`

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `references/screens.md`: the bar and the other screen patterns, each with its phone version
- `references/screens/pricing.md`, `settings.md`, `sign-up.md`, `list.md`: one short card each, in style-block variables, with what is not there
- `references/responsive.md`: intrinsic layouts, container queries, breakpoints, the traps, mobile details
- `references/languages.md`: right-to-left, logical properties, what mirrors, room to grow, scripts
- `references/cards.md`: card anatomy, grids of cards, clickable cards, card or list or table
- `references/layout-kit.css`: the layout kit, for when the generator can't run
- `references/habits.md`: what generated UI gets wrong here, each with its fix
