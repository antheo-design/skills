# Every language: right-to-left and long translations

A layout built for short English labels breaks in German (labels 30 to 40% longer, compound words with no break),
Finnish, Russian and French, and mirrors wrong in Arabic, Hebrew, Persian and Urdu. Build it right once and it holds
for all of them.

## Write directions as start and end, never left and right

| Don't write | Write |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left: 16px; padding-right: 8px` | `padding-inline: 16px 8px` |
| `left: 0` / `right: 0` (positioned) | `inset-inline-start: 0` / `inset-inline-end: 0` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |
| `border-top-left-radius` | `border-start-start-radius` |
| `float: left` | `float: inline-start` |
| `width` / `height` (in writing-mode-aware components) | `inline-size` / `block-size` |
| `translate: 8px 0` for "forward" | `translate: calc(8px * var(--dir, 1)) 0` with `[dir=rtl] { --dir: -1 }` |
| Tailwind `ml-4 pr-2 left-0 text-left` | `ms-4 pe-2 start-0 text-start` |

Flexbox and grid already follow the direction (`row` starts at the inline start), so prefer them to absolute
positioning.

## What mirrors and what doesn't

| Mirrors in right-to-left | Stays the same |
|---|---|
| Page layout, sidebar side, the order of columns | Numbers, phone numbers, times, code |
| Back/forward, next/previous, undo/redo arrows | Media play/pause/skip (they follow the tape direction) |
| Progress and sliders (they fill from the start) | Clocks, check marks, search and other symmetric icons |
| Breadcrumb separators, chevrons in lists | Brand logos, photos, charts' time axis only if the locale reads charts left-to-right (most do) |
| Text alignment, list bullets, indentation | Keyboard shortcuts shown as keys |

Flip a direction icon with `:is([dir='rtl'], [dir='rtl'] *) .icon-dir { scale: -1 1; }`. Avoid `:dir(rtl)`: Lightning CSS (Next.js, Vite) lowers it to a list of `:lang()` right-to-left languages, so `dir="rtl"` with any other `lang` silently fails. Prefer logical properties, which need no selector at all. Set direction once on `<html dir="rtl"
lang="ar">`; never mirror with transforms on the page.

## Mixed-direction text

- User content (names, titles, messages) may be in either direction: wrap it in `<bdi>` or give it `dir="auto"`, so a
  Hebrew name doesn't scramble an English sentence.
- Inputs for free text: `dir="auto"`. Email, URL, phone and code inputs: `dir="ltr"` always.
- Numbers with units and punctuation next to user content: isolate the user part.

## Room to grow

| Text length in English | Plan for |
|---|---|
| Up to 10 characters (button, tab, label) | 100 to 200% longer |
| 11 to 20 characters | 80% longer |
| 21 to 70 characters | 40 to 60% longer |
| Longer text | 30% longer |

- **No fixed widths on anything holding text**; buttons size to their label; tabs and segmented controls scroll or
  wrap when they don't fit, they never truncate a label.
- **German compounds**: `hyphens: auto` with the right `lang` on paragraphs and headings, so long words break at a
  syllable with a hyphen; give labels and cells room to grow instead of breaking them.
- **Line height for tall scripts:** Thai, Hindi (Devanagari), Arabic and Vietnamese need more vertical room;
  keep body line height at 1.5 or more and never clip a text box's height.
- **CJK** (Chinese, Japanese, Korean) is shorter but denser: don't letter-space it, don't italicize it, and use
  `word-break: keep-all` for Korean headings.
- **Don't build sentences from pieces** in the layout ("Showing" + 10 + "of" + 42): word order changes by
  language; see **antheo-writing**.
- Fonts: a display face rarely covers Arabic, Hebrew, Cyrillic or CJK; give the stack a fallback with the right
  script (Noto Sans Arabic, Noto Sans Hebrew, Noto Sans JP…) so headlines don't fall back to a random system font.

## Test it

- `check-page.mjs --stress` (antheo-review) rewrites the page as a 40%-longer accented translation, with very long
  words, and right-to-left, and reports what overflows or clips.
- By hand: set `<html dir="rtl">` in DevTools and walk the page; does every arrow point forward, every panel open
  from the right side, every input align to the start?
