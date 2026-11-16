# Color, in detail

## Picking the brand color from the subject

Most generated UIs share three looks: SaaS blue (#3b82f6), startup purple (#8b5cf6), and cream with forest green and terracotta. Step out of them on purpose:

1. Name the physical world of the product: what it touches, where it lives, what it is made of.
2. List three real colors from that world. A bike repair shop: frame-paint red, chain-oil black, the tan of a gum-wall tyre. A ledger app: carbon-paper blue, red ink, manila. A climbing gym: chalk, rope orange, granite.
3. Pick the one that is **most specific to this product** and least like its competitors. That's the brand color.
4. Feed it to the generator. Everything else is computed.

## How the generator builds the palette (so you can reason about it)

All math is in **OKLCH** (lightness, chroma, hue), where equal steps in L look equally different to the eye, unlike HSL.

- **Neutrals** take the brand's hue at very low chroma (0.004 to 0.014). A warm brand gets warm grays, a cool brand cool grays. This is why the page feels "of a piece".
- **Light theme** (`--paper tinted`, the default): bg L≈0.978, surface L≈0.992 (tinted, not white; `--paper white` gives a white surface), surface-2 L≈0.956, border L≈0.90, text L≈0.20, muted L≈0.47.
- **Dark theme:** bg L≈0.165, surfaces step up to 0.212 and 0.258 (higher = closer to you; each step 0.03+), text L≈0.925 (brighter glares), muted L≈0.705, accent lightened to L≥0.68 and slightly desaturated so it doesn't vibrate.
- **Accent:** your brand color. If its label color (white or near-black, whichever reads better) doesn't reach 4.5:1, the generator walks the accent's lightness until it does. `accent-text` is a separate shade tuned to read on the page background.
- **Status colors** sit at fixed hues (success 150°, warning 75°, danger 27°, info 245°), each as a solid, a soft background and a text color that reads on the soft background.
- Out-of-gamut colors are brought into sRGB by lowering chroma only, so lightness and hue stay true.

## Contrast rules (WCAG 2.2)

| What | Minimum |
|---|---|
| Body text, labels, placeholders people need | 4.5:1 |
| Large text (24px+, or 18.66px+ bold) | 3:1 |
| Icons that carry meaning, input borders, focus rings, chart lines | 3:1 against what's next to them |
| Disabled controls, decoration | no minimum, but don't put information there |

Check any pair: `node scripts/contrast.mjs "#6b6b6b" "#ffffff"`.

APCA is an optional second look for dark mode and thin fonts (about Lc 75 for body text, Lc 60 for large text). It is not a standard: it was dropped from the WCAG 3 draft, whose contrast method is still undecided. WCAG 2.2 decides pass or fail.

## Using color with restraint

- **One accent per screen.** Primary button, selected tab, focus, progress, the one number that matters. That's it.
- **Don't put meaning in color alone.** A red border needs an error message; a green "+12%" needs an arrow or the word "up".
- **Brand ≠ status.** If the brand is red, errors still use the danger red *with* an icon and text, and the brand red never appears next to an error.
- **Tints, not opacity:** `accent-soft` for selected backgrounds, not the accent at 10% opacity, which changes on every surface.
- **No gradients by default.** If the brand calls for one, use it once (hero or illustration), in the same hue family, and never behind body text.

## Charts

Chart palettes (one measure in one colour, categories, sequential and diverging scales, colour-blind safety) belong to
**antheo-data**.

## Color-blind and low-vision checks

1. View the page in grayscale (DevTools → Rendering → Emulate vision deficiencies). Can you still tell states apart?
2. Every status has an icon or word.
3. Links in body text are underlined (or have 3:1 contrast against surrounding text plus a non-color cue on hover/focus).

## Dark mode, specifically

- Backgrounds: very dark tinted gray (L 0.14 to 0.20), never #000. Pure black with white text causes halation for many readers.
- Text: L ~0.93 to 0.96, never #fff.
- Saturated colors look brighter on dark: reduce chroma 10 to 20% and raise lightness.
- Elevation: each layer up gets ~0.04 lighter.
- Shadows mostly disappear; a raised thing gets a single 0.5px line all round, lighter than its fill (1px at lower contrast on 1× screens).
- Re-check every pair; a palette that passes in light can fail in dark.

## Sources

WCAG 2.2 SC 1.4.3, 1.4.11, 1.4.1; APCA documentation; Evil Martians on OKLCH; Radix Colors (step roles); W3C Design Tokens Community Group format 2025.10; Nielsen Norman Group and Datawrapper guidance on chart color.

## Contrast as hierarchy

Minimums keep text readable; bands keep the page from going flat. Each role has a target band, and the generator's
`hierarchy:` line reports any role outside it:

| Role | Light | Dark |
|---|---|---|
| `--text` on `--bg` | 12 to 21:1 | 10 to 16.5:1 (higher glares on dark) |
| `--text-2` | 4.5 to 7.5:1 | 4.5 to 8:1 |
| `--text-3` (icons, placeholders, disabled) | 3 to 4.5:1 | 3 to 4.5:1 |
| a control's edge (the ring in `--sh-control`, an off switch track) | 1.6 to 3.5:1 | 1.6 to 3.5:1 |
| `--line` (hairlines between rows) | 1.15 to 1.6:1 | 1.15 to 1.6:1 |
| Dark surfaces, each step | none | 0.03+ in OKLCH lightness |

**APCA** judges dark mode more fairly than the 2.x ratio, but it is not a standard (no longer in the WCAG 3 draft).
Use it only as a second look, never instead of the WCAG 2.2 ratio: about Lc 75 for body text, 60 for other
text, 45 for large headlines, 30 for solid icons and controls, 15 for dividers.
