# Surface recipes

Copy-ready CSS for the rules in `SKILL.md`. **Every value is a variable from antheo-build's style block**
(`references/quiet.css`): the surfaces `--bg`, `--surface`, `--raised`, `--well`, the four `--sh-*` shadows, the
three `--r-*` corners. Paste the block first; nothing below defines a colour of its own.

## 1. Surfaces that take their edge from their ground

The block already carries the pairs: a surface's fill and the shadow that draws its edge. In dark, the same names
resolve to a lighter fill and a faint light edge, so nothing here changes per theme.

```css
.s-raised { background: var(--raised);  box-shadow: var(--sh-control); border: 1px solid transparent; border-radius: var(--r-control); }
.s-card   { background: var(--surface); box-shadow: var(--sh-card);    border: 1px solid transparent; border-radius: var(--r-card); }
.s-lifted { background: var(--surface); box-shadow: var(--sh-lift);    border: 1px solid transparent; border-radius: var(--r-card); }
.s-menu   { background: var(--surface); box-shadow: var(--sh-lift);    border: 1px solid transparent; border-radius: var(--r-card); padding: var(--s-1); }
.s-dialog { background: var(--surface); box-shadow: var(--sh-dialog);  border: 1px solid transparent; border-radius: var(--r-card); }
.s-well   { background: var(--well);    box-shadow: var(--well-edge);  border: 1px solid transparent; border-radius: var(--r-control); }
/* a well someone types in needs a boundary at 3:1 (WCAG 1.4.11): one line along its bottom edge, as the block's .field has */
.s-field  { background: var(--well);    box-shadow: var(--well-edge), inset 0 -1px 0 var(--text-3); border: 1px solid transparent; border-radius: var(--r-control); }
```

`border: 1px solid transparent` costs nothing on screen and keeps an edge in forced-colours mode, which drops every
shadow. It is in both themes, so the box never changes size.

A control that sits on a well or a tinted band, not on a card, keeps `--sh-control`: its ring is the text colour at
9%, so it follows whatever is under it. Never swap it for a fixed grey border.

## 2. Concentric corners

```css
.s-outer { --r: var(--r-card); --pad: var(--s-1); border-radius: var(--r); padding: var(--pad); }
.s-outer > .s-inner { border-radius: max(var(--r-tag), calc(var(--r) - var(--pad))); }
```

A menu (`--r-card`, 4px padding) holds items at `--r-control`: 10 − 4 = 6. Past `--s-6` of padding, drop the
calculation: the inner thing is its own surface with its own radius.

## 3. Rows that fill in place

```css
.s-row { background: transparent; transition: background-color var(--dur-fast) var(--ease-out); }
@media (hover: hover) and (pointer: fine) { .s-row:hover { background: var(--hover); } }
.s-row[aria-selected='true'], .s-row[aria-current] { background: var(--selected); color: var(--text); }
```

No line appears and nothing moves: the row's own fill changes. A selected row also carries `aria-selected` or
`aria-current`, so the fill is never the only signal.

## 4. A sticky header whose line appears once content passes under it

```css
.s-scroller { overflow: auto; }
.s-sticky {
  position: sticky; inset-block-start: 0; z-index: var(--z-sticky); background: var(--bg);
  box-shadow: 0 1px 0 transparent; transition: box-shadow var(--dur-fast) var(--ease-out);
  animation: s-stuck linear both; animation-timeline: scroll(nearest); animation-range: 0 1px;
}
@keyframes s-stuck { to { box-shadow: 0 1px 0 var(--line); } }
```

Where scroll-driven animation isn't supported, set `data-stuck` from an `IntersectionObserver` on a 1px sentinel
above the header and draw the same line from it.

A fade instead of a hard cut where a list scrolls:

```css
.s-fade { mask-image: linear-gradient(to bottom, #000 calc(100% - var(--s-6)), transparent); }
```

## 5. Translucent chrome

Only for floating chrome over content that scrolls under it (a bar over media, a toolbar over a canvas). Never a
card, a panel or a whole page.

```css
.s-chrome { background: oklch(from var(--bg) l c h / 0.8); backdrop-filter: blur(12px) saturate(1.4); }
@supports not (backdrop-filter: blur(1px)) { .s-chrome { background: var(--bg); } }
@media (prefers-reduced-transparency: reduce) { .s-chrome { background: var(--bg); backdrop-filter: none; } }
```

Measure the text on it against the busiest content that can scroll under it, at the worst spot, with
`antheo-color/scripts/contrast.mjs`.

## 6. Image outlines

An image has no edge of its own, so a pale photo melts into a pale page. A 1px inner line at 10% fixes it in both
themes without a border colour.

```css
.s-media { position: relative; border-radius: inherit; }
.s-media::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  outline: 1px solid oklch(0 0 0 / 0.1); outline-offset: -1px;
}
@media (prefers-color-scheme: dark) { .s-media::after { outline-color: oklch(1 0 0 / 0.1); } }
```

## 7. Behind an overlay

```css
dialog::backdrop { background: var(--backdrop); }
```

No blur behind a dialog: the dim alone says "this is on top". How it fades in belongs to antheo-motion
(`references/recipes.md`).
