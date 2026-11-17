# Vision: contrast, focus rings, forced colors, zoom, text spacing

Palette and dark mode come from antheo-color; layout reflow patterns from antheo-layout. This file sets the floors and the CSS that makes them hold for low-vision, high-contrast and zoom users.

## 1. Contrast floors

| What | Minimum | Criterion |
|---|---|---|
| Body text and text in images | **4.5:1** | 1.4.3 |
| Large text: 24px regular or 18.66px bold and up | **3:1** | 1.4.3 |
| Control boundary when it is the only cue (an outlined input, a button edge, or the one line under a filled field: the block's `.field` draws it), checkbox/radio box, switch track, slider track, icon that carries meaning, chart marks | **3:1** against the neighbouring colour | 1.4.11 |
| Focus indicator | **3:1** against the control and against the page behind it | 1.4.11 (2.4.13 Focus Appearance is AAA) |
| Disabled controls, pure decoration, logos | exempt, but keep 3:1 for readability where you can | |
| Placeholder text | 4.5:1 (it is text) | 1.4.3 |
| Text over images or gradients | 4.5:1 at the worst point; add a scrim (`rgb(0 0 0 / 0.55)`) | 1.4.3 |
| AAA text (aim for it in long reading) | 7:1 | 1.4.6 |

Formula: relative luminance L = 0.2126 R + 0.7152 G + 0.0722 B (each channel linearised: c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)^2.4); ratio = (L1 + 0.05) / (L2 + 0.05), lighter on top. Check every state: rest, hover, active, visited link, selected, disabled-looking-but-readable, error, focus, in **light and dark** themes, and text on every surface it can sit on. Check with antheo-tokens' `contrast.mjs` or the browser DevTools contrast picker. Fix by moving the **text or border** darker/lighter, not by shrinking the area it applies to.

Not by colour alone (1.4.1): error = icon + text + colour; selected tab = underline + weight; link in text = underline (3:1 against surrounding text if only colour differs, plus a hover/focus change); chart series = label, pattern or shape; required = word; status dot = text beside it.

## 2. Focus ring recipes

One token, from antheo-tokens: `--focus`:

```css
:root { --focus: var(--text-2); }   /* the style block's; a brand may set its own, 3:1 against every surface */
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
```
Do not write `:focus { outline: none }`. Browsers already show `:focus-visible` only for keyboard use, so the one rule above is all you need.

| Situation | Recipe |
|---|---|
| Any control on a plain background | 2px solid `--focus`, offset 2px (a ring of at least 2 CSS px around the control, 3:1 against what it changes from) |
| Unknown or varying background (cards, images, dark/light) | Two-tone ring: `outline: 2px solid var(--focus); outline-offset: 2px; box-shadow: 0 0 0 4px var(--bg);` (keeps 3:1 on both neighbours); in forced colors the outline still shows |
| Input fields | Ring replaces nothing: keep the field's own edge and add the ring; do not rely on a border colour change (needs 3:1 change and 2px) |
| Tight containers with `overflow: hidden` | Negative offset: `outline-offset: -3px`, or pad the container so the ring is not clipped |
| Rounded controls | `outline` follows `border-radius` in modern browsers; no workaround needed |
| Custom checkbox/switch (native input hidden) | `input:focus-visible + .box { outline: 2px solid var(--focus); outline-offset: 2px }` |
| Dark mode | Own `--focus` value; 3:1 against the dark surface |

Never use `box-shadow` alone for focus: forced colors removes shadows. Never animate the ring in from 0 so that the first frames have no ring. Do not make the ring depend on `:hover`. Use `:focus-visible`, not `:focus`, for mouse-quiet UIs; text inputs always show on focus (browsers do this by default).

Focus not obscured (2.4.11): any sticky header, footer, cookie bar or chat bubble must not cover the focused element.
```css
html { scroll-padding-top: calc(var(--header-h, 72px) + 8px); scroll-padding-bottom: calc(var(--footer-h, 0px) + 8px); }
:target, [id] { scroll-margin-top: calc(var(--header-h, 72px) + 8px); }
```
Check by tabbing through the page with the sticky bar visible. The probe flags covered stops.

## 3. Forced colors (Windows High Contrast)

In `forced-colors: active` the browser overrides colours with system keywords, **drops `box-shadow`, `background-image` on controls, and text shadows**, and keeps `border`, `outline`, and `text-decoration`. A control that is only a filled shape disappears.

Rules:
1. Every control keeps a border: `border: 1px solid transparent` (transparent turns into the system colour in forced colors). Same for custom buttons, tabs, switches, chips, cards that act as buttons.
2. Focus uses `outline`. Selected/checked/current states need a non-colour cue that survives: border thickness, an icon, a `::before` with a border, or `outline`.
3. Icons use `currentColor` (fill and stroke). Image-based icons get `forced-color-adjust: none` only when they must keep their colours, with a system-colour fallback beside them.
4. Do not use `forced-color-adjust: none` on the whole page.
5. Backgrounds that carry meaning (a coloured status pill) also get a border and the text label.

```css
.btn, .chip, .tab, .switch, .input, .card--action { border: 1px solid transparent; }
.switch { border: 1px solid transparent; }
.switch::after { background: currentColor; }                 /* thumb */
@media (forced-colors: active) {
  :focus-visible { outline: 2px solid Highlight; outline-offset: 2px; }
  .btn { border-color: ButtonText; }
  .btn[disabled] { border-color: GrayText; color: GrayText; }
  .tab[aria-selected="true"] { border-bottom: 3px solid Highlight; }
  .switch[aria-checked="true"]::after { background: Highlight; }
  .badge { border: 1px solid CanvasText; }
  a { text-decoration: underline; }
}
```
System colour keywords: `Canvas` page background, `CanvasText` text, `LinkText`, `VisitedText`, `ActiveText`, `ButtonFace`, `ButtonText`, `ButtonBorder`, `Field`, `FieldText`, `Highlight`, `HighlightText`, `GrayText`, `Mark`, `MarkText`.

Test: DevTools > Rendering > "Emulate CSS media feature forced-colors: active" (and `prefers-color-scheme` light and dark, which pick different system palettes). Look for: controls with no edge, focus ring missing, invisible icons, text on images, selected state indistinguishable. Playwright: `page.emulateMedia({ forcedColors: 'active' })`.

### prefers-contrast

```css
@media (prefers-contrast: more) {
  :root { --border: #000; --text-muted: var(--text); --focus: #0000ee; }
  .card { border: 1px solid CanvasText; }
  * { text-shadow: none !important; }
}
@media (prefers-contrast: less) { /* soften, but never below the floors in section 1 */ }
```
Raise borders to 4.5:1, remove translucent text, drop decorative gradients behind text. Also support `prefers-reduced-transparency: reduce` by making frosted panels opaque.

## 4. Zoom, reflow and resize text

| Test | Criterion | Value |
|---|---|---|
| Browser zoom to 200% | 1.4.4 Resize text | No loss of content or function |
| 320 CSS px wide window (= 1280px at 400%) | 1.4.10 Reflow | No horizontal scroll for vertical-scrolling content; 256px tall window for horizontal-scrolling content |
| Text-only zoom (Firefox: View > Zoom > Zoom Text Only) / larger system font | 1.4.4 | Still fits |
| Orientation | 1.3.4 | Works in both portrait and landscape |

Rules:
- Never `user-scalable=no` or `maximum-scale` under 5. The meta is `width=device-width, initial-scale=1`.
- Font sizes in `rem` (or `clamp(1rem, …, 1.25rem)`); never `px` for body text; never `vh` alone for text.
- Layout: `min-width: 0` on flex and grid children, `grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr))`, `overflow-wrap: anywhere` on user content, `max-width: 100%` on media, `width: 100%` on inputs. No fixed `width` in px for containers.
- Allowed to scroll sideways in their own box: data tables, code blocks, maps, diagrams. Give that box `tabindex="0"`, a name and `role="region"` so keyboard users can scroll it.
- Sticky headers: at heights under 480px (400% zoom) switch to `position: static`.
```css
@media (max-height: 480px) { .site-header { position: static; } }
```
- Do not truncate with ellipsis when the full text matters (names, prices, errors): wrap.
- A menu that collapses to a button at small widths must be keyboard operable and named.

## 5. Text spacing override (1.4.12)

Users may force these values; nothing may clip, overlap or disappear:

| Property | Value |
|---|---|
| line-height | 1.5 x font size |
| paragraph spacing | 2 x font size |
| letter-spacing | 0.12 x font size |
| word-spacing | 0.16 x font size |

Test style (paste into DevTools, or a bookmarklet):
```css
* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }
```
Fix patterns: replace `height` with `min-height` on anything containing text; `overflow: hidden` only on media; badges and buttons size to content with padding, not fixed widths; do not absolutely-position text over text; labels in tight rows may wrap; `white-space: nowrap` only for short tokens. The probe applies this style and reports clipped or overlapping text.

## 6. Dark mode and themes

Check contrast in each theme separately; do not assume a light pass carries over. Pure `#fff` text on `#000` is allowed but can glare for some users; use `#f2f2f2` on `#121212` (about 16:1). Elevated surfaces in dark mode get lighter, not darker: re-check text on each elevation. Support `color-scheme: light dark` so form controls and scrollbars follow. Never rely on a theme toggle alone: respect `prefers-color-scheme` first and persist the choice. Images with text need a dark variant or a background plate.

## 7. Other low-vision and cognitive aids

- Line length 45 to 75 characters; left-aligned (no justified text); long reading at 16px (1rem) with line-height at least 1.5; app text follows the style block (13px, 15px on a phone, set in rem). WCAG sets no minimum size: what it asks is that text holds at 200% zoom (1.4.4).
- Do not use light weights (under 400) below 18px.
- Links are underlined in running text; link text makes sense out of context ("Read the pricing guide", not "Click here").
- Underline or bold current nav item in addition to colour.
- Keep animations and parallax off for people with vestibular conditions (antheo-motion).
- Do not rely on sound alone or on a single sense: captions for video (1.2.2), transcripts for audio, no autoplay audio over 3 seconds without a stop control (1.4.2).

## 8. Verify

1. Zoom the browser to 200%, then 400%: scroll through, open menus, dialogs, forms.
2. Apply the spacing style: scan for clipped or overlapping text.
3. Emulate forced-colors and prefers-contrast: more.
4. Run the contrast check in both themes on: body, muted, link, placeholder, disabled-looking, error, border, focus ring.
5. `node scripts/a11y-probe.mjs <url>`: reflow, text-spacing, forced-colors and focus sections are clean.
