# Geometry: shape, size and the grid

The style block uses three of these, by role: `--r-tag` 4, `--r-control` 6, `--r-card` 10 (and `--r-sheet` 14 for a
phone sheet). The table below is the generator's full scale behind them, for a design system that picks a shape.

## Radius scales by shape

| Token | sharp | soft | round | Used on |
|---|---:|---:|---:|---|
| `--radius-xs` | 2 | 4 | 6 | checkboxes, small chips, kbd |
| `--radius-sm` | 4 | 6 | 10 | inputs, small buttons, tags |
| `--radius-md` | 6 | 10 | 14 | buttons, selects, menus items |
| `--radius-lg` | 8 | 14 | 20 | cards, popovers, panels |
| `--radius-xl` | 12 | 20 | 28 | dialogs, sheets, large media |
| `--radius-full` | 9999 | 9999 | 9999 | pills, avatars, switches |

One shape per product. Mixing a sharp table with bubbly buttons reads as two products glued together.

## Nesting math

```
inner radius = outer radius − gap        (gap = padding + border width)
             = max(2px, outer − gap)      (never let it reach 0 unless you want a square)
```

| Outer | Padding | Inner |
|---:|---:|---:|
| 20 | 8 | 12 |
| 14 | 4 | 10 |
| 14 | 12 | 2 |
| 8 | 16 | 0 → use a square inner corner, or a smaller padding |

```css
.card { --r: var(--radius-lg); --pad: var(--space-3); border-radius: var(--r); padding: var(--pad); }
.card > .media { border-radius: max(2px, calc(var(--r) - var(--pad))); }
```

Apply the rule at every even gap, including 2 to 4px (a pill inside a track): that is exactly where a pinched corner shows. Never go below 2px.

## Squircles

```css
.tile { border-radius: var(--radius-xl); }
@supports (corner-shape: squircle) {
  .tile { corner-shape: squircle; border-radius: calc(var(--radius-xl) * 1.4); } /* squircles read smaller */
}
```

Experimental (Chromium only in 2026). Never depend on it.

## Hit areas

The minimums (24×24 everywhere, 44×44 for primary touch controls) are owned by **antheo-access**. The sizes that
meet them for common controls:

| Control | Visual size | Hit area |
|---|---|---|
| Icon button in a toolbar (pointer) | 16px icon | 32×32 (`--control-sm`) |
| Icon button on touch | 20px icon | 44×44 |
| Checkbox / radio | 16 to 20px | the whole label is clickable |
| Close (×) on a dialog | 16px icon | 32×32 pointer, 44×44 touch |
| Inline text link | text | exempt, but keep 8px from other links |
| Slider thumb | 20px | 32×32 pointer, 44×44 touch |

Grow the hit area without growing the look:

```css
.icon-btn { position: relative; width: 20px; height: 20px; }
.icon-btn::before { content: ""; position: absolute; inset: -12px; } /* a 44×44 target */
```

Never let two hit areas overlap. WCAG 2.2 (2.5.8) sets 24×24 as the minimum; 44×44 is the comfortable touch size.

## Optical corrections

1. **Play / arrow triangles:** nudge 1 to 2px toward the point so the visual mass is centered.
2. **Round vs square icons:** a circle looks smaller than a square of the same box; let it overshoot by ~1px.
3. **Icon + label in a button:** padding on the icon side 2 to 4px smaller than on the text side.
4. **Text in pills and badges:** if text looks low, it usually is, cap-height centering differs from box centering; nudge with `padding-block` asymmetry of 1px or `text-box-trim` where supported.
5. **Numbers in circles** (badges): use `tabular-nums` and an even pixel height so "1" and "8" sit in the same place.

## Icons

- One set, one style. Outline by default; filled only to show "selected/on".
- Sizes: 16 (beside 12 to 14px text), 20 (beside 16px text), 24 (standalone, navigation, touch).
- Stroke: 1.5px at 20 to 24px; 1.25 to 1.5px at 16px. Don't scale a 24px icon to 16px, the stroke goes thin and blurry.
- Color: `currentColor`, so it follows the text next to it.
- Center icons on the text's x-height, not the line box.
- Directional icons (arrows, chevrons, "back") flip in right-to-left layouts; clocks, checkmarks and media "play" do not.

## Grids and breakpoints

Prefer **intrinsic layouts** that reflow on their own:

```css
.cards { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); }
```

When you need a column grid:

| Width | Columns | Side margin | Gutter |
|---|---:|---:|---:|
| < 640px (phones) | 4 | 16 to 20px | 16px |
| 640 to 1023px (tablets) | 8 | 24 to 32px | 16 to 24px |
| ≥ 1024px | 12 | auto (centered, `--page-max` 76rem; visuals to `--page-wide` 96rem) | `--page-gutter` |

Use **container queries** for components that live in different widths (a card in a sidebar vs. the main column): `container-type: inline-size` on the parent, `@container (min-width: 28rem) { … }` in the component.

Breakpoints come from content: resize the browser and add a breakpoint where the layout breaks, not at device names.

## Aspect ratios

Reserve space so images don't jump in: `aspect-ratio: 16 / 9` on the frame, `object-fit: cover` on the image. Common: 16:9 video, 3:2 or 4:3 photos, 1:1 avatars and thumbnails, 4:5 portrait cards, 21:9 wide banners. **One ratio per row of cards.**

## Borders and shadows

- Hairline borders (1px, `--color-border`) for structure: inputs, table rows, dividers, card edges.
- Shadows for elevation only: things floating above the page.
- One light source: shadows fall down, slightly more down than sideways.
- In dark mode use surface lightness for elevation; popovers and dialogs get the faint edge (`box-shadow: var(--edge)`, part of `--sh-dialog`), not a border.

## Sources

WCAG 2.2 Understanding 2.5.8 (target size); MDN `corner-shape`; jakub.kr and 30 Seconds of Code on concentric radii; Josh W. Comeau, *Designing shadows*; IBM Carbon spacing and 2x grid; Every Layout; Nielsen Norman Group on cards.
