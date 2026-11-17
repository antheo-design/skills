# Responsive, in practice

## Intrinsic first

Layouts that adapt without breakpoints:

```css
/* cards that reflow on their own */
.grid { display: grid; gap: var(--s-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); }

/* a sidebar that drops below when there's no room */
.with-sidebar { display: flex; flex-wrap: wrap; gap: var(--s-6); }
.with-sidebar > aside { flex: 1 1 16rem; }
.with-sidebar > main { flex: 999 1 32rem; min-width: 0; }

/* a row of things that wraps */
.cluster { display: flex; flex-wrap: wrap; gap: var(--s-2); align-items: center; }

/* padding and gaps that breathe with the screen */
section { padding-block: clamp(var(--s-12), 8vw, var(--s-24)); }
```

## Container queries for components

```css
.panel { container-type: inline-size; }
@container (min-width: 32rem) { .stat { grid-template-columns: 1fr auto; } }
```

Use them for anything that can live in a sidebar *and* a main column. Use `cqi` units for spacing that scales with the container.

**Three traps that only show when content is taller than its box** (found building components in a fixed-height
stage):

- **A clipped item in a fixed-height grid gets squashed.** A grid item with `overflow` other than `visible` has a
  minimum height of 0, so `auto` rows in a grid of definite height shrink to fit and the item spills over its
  neighbours. Size such rows to their content: `grid-auto-rows: max-content` (or `grid-template-rows: max-content`).
- **`align-content: center` cuts off the top of a scroller.** When the content is taller than the scroll box, centring
  pushes the top above the start, where it can't be scrolled to. Use `align-content: safe center` (and
  `place-items: safe center`).
- **A size container holds `position: fixed` children.** `container-type: inline-size` adds layout containment, which
  makes the container the box fixed children are placed in. Anything that must fly across the page (a dragged clone, a
  flying avatar) goes on `document.body`, not inside the container.

## When you do need breakpoints

Add one where the content breaks. Typical page-level ones: `40rem` (640px: phone → tablet), `64rem` (1024px: tablet → desktop), `80rem` (1280px: wide). Write them in `rem` so they follow the user's font size.

## Mobile specifics

- `100dvh` for full-height screens (the `vh` unit ignores the browser bars).
- Safe areas: `padding-bottom: max(var(--s-4), env(safe-area-inset-bottom))` on bottom bars and sheets; add `viewport-fit=cover` to the viewport meta.
- Inputs at 16px or larger (iOS zooms smaller ones). `inputmode` and `autocomplete` on every field.
- Hover doesn't exist on touch: wrap hover-only effects in `@media (hover: hover) and (pointer: fine)` so a tap doesn't leave something stuck "hovered".
- Primary actions: after the last field on a short form; on a form longer than about a screen and a half, a bottom bar that is opaque with a hairline, with the content padded by its height so nothing is covered (antheo-mobile).
- Sticky headers: `--h-bar` tall; on a long page they may hide on scroll down / show on scroll up for long pages; reserve `scroll-padding-top` equal to their height so anchors don't hide under them.

## Test widths

The page check runs 320, 390, 768, 1024, 1280, 1440 and 1920px in light and dark (antheo-review). 320 is also what a
desktop zoomed to 400% looks like: WCAG 1.4.10 requires content to reflow there without horizontal scrolling. Check
tablets in both orientations.

## Built to hold at every width

The layout must be right at every width because of how it is built, not because five sizes were tested.

- **Use the kit** (`layout.css`, written next to `tokens.css`): `.scene` for every section (`.scene.on-field` for a band on the field color), `.split` for two parts,
  `.hero-grid` for text plus a visual, `.auto-grid` for cards, `.stack` and `.cluster` for flow, `.pair-row` for
  controls side by side, `.scroll-x` for wide tables, `.shell` for an app with a sidebar.
- **No fixed widths on layout boxes.** Never `width: 600px` or `height: 400px` on a container. Use `max-width`,
  `minmax()`, `min()`, `clamp()`, `aspect-ratio`, `flex-wrap`. Every flex or grid child that holds text gets
  `min-width: 0`.
- **Type and space are fluid** (`clamp()` tokens). Do not add breakpoints to resize text.
- **Components adapt to their container**, not the window: `container-type: inline-size` on the parent and
  `@container` rules, so a card works in a sidebar and in a wide grid.
- **Wide tables scroll inside their own box** (`.scroll-x`), with the first column sticky. The page never scrolls
  sideways.
- **Wide screens (1440px and up) need a plan.** Text and controls stay inside `--page-max`. What grows is the
  visual and the data: a wide table uses `.wide`. A narrow block in a wide column is centred or left on the content
  edge; never fill the space beside it with a placeholder or a decoration.
- **Small screens (320px and up):** one column; section padding shrinks by its clamp; gaps inside groups do not
  change; body text stays 16px; touch targets 44px; nothing depends on hover.
- **Things that break pages, and the fix:**

| Breaks | Fix |
|---|---|
| A long URL or email pushes the page wide | `.long-text` (`overflow-wrap: anywhere`) on that string only, and `min-width: 0` on its flex or grid child. Never on labels, values or buttons: it splits real words ("Unlimite / d") |
| `100vw` on a full-width band causes sideways scroll (it includes the scrollbar) | `width: 100%`; let `.scene` reach the edges |
| `100vh` hero cut off by mobile browser bars | `min-height: 100svh`, or no min-height: size by padding |
| A table at 320px | `.scroll-x` wrapper (a labelled, focusable region), sticky first column, or stacked rows under 40rem |
| A grid with a fixed `repeat(4, 1fr)` squeezes on phones | `.auto-grid`: `repeat(auto-fit, minmax(min(var(--col-min, 18rem), 100%), 1fr))` |
| Fixed widths (`width: 600px`) | `width: min(100%, 37.5rem)` or `max-width` |
| An absolutely positioned decoration overlapping text at another width | position it inside a sized box with `overflow: clip`; hide it below the width where it has no room |
| A row of buttons that overflows | `.cluster` (wraps); full-width primary button on phones, inside the page gutter |
| A long button label | buttons stay one line: shorten the label, or let the button go full width; never wrap or clip it |
| A fixed-height card clipping longer text | never fix the height; `min-height` or let content decide |
| Images shifting the layout as they load | `width` and `height` attributes, or `aspect-ratio` |
| The scrollbar appearing shifts the layout | `scrollbar-gutter: stable` on the page and scroll containers |
| Size containment (`container-type: size`) on a box that sizes to its content | it collapses to zero: use `container-type: inline-size` on a parent with a real width |
| A component with a container query on itself | a query styles only descendants: `container-type` on the wrapper, query from inside |
| Media queries inside a component used in a sidebar and a wide grid | `@container` for components, `@media` for the page |
| A glow or decoration layer over controls eats taps and hovers | `pointer-events: none` on decoration |

## Show that more exists

Hidden content must announce itself, or people never find it.

- **Horizontal scrollers peek:** the next card shows 16 to 32px at the edge. Item width = `calc(100% - var(--gap-field) - 24px)`
  on phones, with `scroll-snap-type: x mandatory`, `scroll-padding-inline: var(--gutter)` and the same padding on
  the track, so the first card lines up with the page edge.
- **Collapsed lists say what is hidden and how much:** "Show 12 more orders", never "Show more".
- **Truncated text has a way back** that works by keyboard too: the full text in a tooltip that opens on focus as
  well as hover (a `title` attribute alone does not count), or in the detail view.
- **Scroll areas fade at the edge that has more** (a 24px gradient mask on that side only) and lose the fade at the end.
