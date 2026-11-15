# Type, in detail

## Choosing fonts by mood

Pick one family for text. Add a second only for display (headings over ~28px) and only when the contrast between them is the point. Add a mono for code, IDs and keyboard keys.

| Mood | Text family (pick one) | Display (optional) | Why it fits |
|---|---|---|---|
| product UI (the default) | Geist, or the project's own face | none | neutral, even and made for screens; the product's character comes from its content |
| calm, warm | Figtree, Source Sans 3, Nunito Sans | none | open, humanist shapes read friendly and quiet |
| technical | Hanken Grotesk, Schibsted Grotesk, Inter Tight | none | tight, even grotesks look precise in dense UI |
| geometric, modern | Manrope, Plus Jakarta Sans, Outfit | none | circular forms, clean product feel |
| playful | Nunito, Quicksand | Bricolage Grotesque, Fredoka | soft terminals, characterful display |
| editorial, luxury | Source Sans 3 or Figtree for text | Fraunces, Newsreader, Instrument Serif | serif display with a calm sans for UI text |
| developer | Hanken Grotesk | JetBrains Mono, IBM Plex Mono | mono as display signals "built for builders" |

All of these are free on Google Fonts. A plain face such as Inter is a fine choice for an interface: precise spacing and hierarchy matter more than the face. Check that a font has the weights you need (400, 500, 600) and `tnum` (tabular figures) if you show numbers.

## The scale

A modular scale multiplies a base by a ratio. Smaller ratios for apps, larger for marketing:

| Ratio | Name | Feels | Use |
|---|---|---|---|
| 1.125 | major second | flat, dense | data tools |
| 1.2 | minor third | balanced | most apps |
| 1.25 | major third | lively | consumer apps, playful |
| 1.333 | perfect fourth | dramatic | marketing, editorial |

Round every step to a whole pixel. Assign roles once (page title = 3xl, section = xl …) and never pick a size outside the scale.

**Few sizes, more contrast:** three to four sizes carry most screens. Before adding a size, try weight (`--w-text` → `--w-strong`) or tone (`--text` → `--text-2`).

## Fluid type for big headings

Display sizes should shrink on phones. Interpolate between a minimum at 360px and the full size at 1280px:

```css
/* 48px on desktop, 34px on phones, smooth between */
font-size: clamp(2.125rem, 1.75rem + 1.565vw, 3rem);
```

Always keep a `rem` part in the middle value. Pure `vw` breaks browser zoom (WCAG 1.4.4). The token generator writes these for every step at 32px and above.

## Line height and tracking by size

| Size | line-height | letter-spacing |
|---|---|---|
| ≤ 13px (captions, labels) | 1.5 | +0.01em |
| 14 to 17px (body) | 1.5 to 1.6 | 0 |
| 18 to 24px (lead, small headings) | 1.35 to 1.45 | −0.01em |
| 28 to 40px (headings) | 1.15 to 1.25 | −0.02em |
| 44px+ (display) | 1.0 to 1.1 | −0.025em |

Uppercase labels: +0.05em at 14px and under, `--t-meta`, `--w-strong`. Use them rarely: a tiny uppercase label above every heading is one of the most common "AI-made" tells.

## Wrapping and overflow

- Headings, captions, card titles: `text-wrap: balance` (works on blocks up to ~6 lines).
- Body paragraphs: `text-wrap: pretty` (avoids a lone word on the last line).
- Strings people typed (emails, URLs, IDs): `overflow-wrap: anywhere` on that string, `min-width: 0` on its flex item. Never on labels, values, buttons or headings: it splits real words.
- One line with ellipsis: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` plus `title` or a tooltip with the full text, and `min-width: 0` on the flex child.
- Several lines: `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;`.

## Numbers

- `font-variant-numeric: tabular-nums` on prices, totals, table cells, timers, counters, dates in lists.
- Right-align numbers in tables; keep the same decimal places in one column.
- Format with `Intl.NumberFormat` and `Intl.DateTimeFormat`, never hand-concatenate "$" + value.
- Big KPI numbers: `.t-num` (28px, `-0.02em`) at `--w-strong`; a price at `--w-text`; **proportional figures**, `tabular-nums` only when the number ticks or lines up with others, and then check the comma does not open a gap ("$50 , 699").

## Loading fonts without layout shift

1. Load only the weights you use (usually 3). Prefer variable fonts.
2. `font-display: swap` for text fonts; `optional` for decorative display fonts when stability matters most.
3. In Next.js use `next/font/google`; it self-hosts and generates an adjusted fallback automatically.
4. Elsewhere, match the fallback's metrics: `size-adjust`, `ascent-override`, `descent-override` in a second `@font-face` for the local fallback.
5. Always end the stack with system fonts: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## Hierarchy order

When something needs to stand out, reach for these in order and stop at the first that works: **space around it → size → weight → color → case.** Lead headings, list items and links with the words people scan for.

## Finer points

- **Headings step down in size as their level goes down,** and no heading is smaller than body text. An `h3` that
  looks bigger than an `h2` breaks the outline people see.
- **Light weights (100 to 300) only at 28px and up.** Below that they break up on low-density screens and in dark mode.
- **Line height without units** (`1.5`, not `24px`), so it scales with the font size it sits on.
- **Font features through properties,** not raw tags: `font-variant-numeric: tabular-nums`, `font-variant-caps:
  all-small-caps`, `font-kerning: normal`; `font-feature-settings` only for a feature with no property, and then
  repeat the others, because it replaces them all.
- **Optical sizing on** (`font-optical-sizing: auto`, the default) for variable fonts that have it; never pin
  `opsz` by hand unless the design calls for a display cut at a small size.
- **Underlines from the font:** `text-underline-offset: 0.18em`, `text-decoration-thickness: from-font` (or 1px),
  `text-decoration-skip-ink: auto`, so descenders aren't struck through.
- **Selection in the brand:** `::selection { background: var(--accent-soft); color: var(--text); }`.
- **Smoothing:** `-webkit-font-smoothing: antialiased` once, on the root (the style block sets it), never per
  element: mixed smoothing makes one weight look like two.
- **Fallbacks at the same x-height:** `font-size-adjust` on the root, set to the typeface's x-height ratio (Geist
  0.53, Inter 0.545), so the system font shown while the web font loads, a glyph the font lacks and the mono face
  all draw at the same visual size. Without it, text visibly shrinks or grows when the font arrives.
- **Don't fake styles:** load the italic and the weights you use; `font-synthesis: none` so the browser never
  invents a bold or an oblique.
- **Spot it in code:** `line-height:` with `px`, `font-weight: 300` on body text, `font-feature-settings` with a
  single tag, headings sized by class but not in level order.

## Sources

Butterick, *Practical Typography* (point size, line spacing, line length); Every Layout (measure in `ch`); Utopia (fluid type scales); MDN (`font-variant-numeric`, `text-wrap`, `font-display`); web.dev (`size-adjust`); Nielsen Norman Group (visual hierarchy, F-pattern scanning); WCAG 2.2 SC 1.4.4 and 1.4.12.
