---
name: antheo-color
description: Chooses and checks colour, from the brand colour of the subject to roles for text, surfaces and status, contrast that passes WCAG 2.2 in light and dark, a dark theme designed rather than inverted, and colour used only where it means something. Use for palettes, contrast problems, muddy dark modes or "our greys look brown".
---

# Antheo Color

> **How to read this skill.** Its numbers are house defaults (antheo-build, "Four kinds of rule"): they give way to the
> person, a reference, a brand or the project's own system. What protects people (contrast, focus, targets, reduced
> motion, nothing broken) is a requirement and never bends.

Colour carries meaning, so most of a screen should have none. This skill picks the few colours a product needs,
gives each a role, and proves every pair readable in both themes. The token names and the generator belong to
**antheo-tokens**; chart palettes to **antheo-data**; which colour makes the product's identity to
**antheo-direction**.

## Take the brand colour from the subject

List three real colours from the product's world (a bike shop: frame-paint red, chain-oil black, tyre tan) and pick
the one most specific to this product. Don't reach for the reflex (SaaS blue `#3b82f6`, startup purple `#8b5cf6`,
teal, or cream with forest green and terracotta) when choosing freely; a brand that already is one of these keeps it.

## Chrome is near-grey; colour comes from content

The colours of a build are the variables in antheo-build's style block (`references/quiet.css` there). Neutrals take
one hue at chroma `0.002 to 0.008` in OKLCH, all warm or all cool, so the page feels of a piece without looking
tinted. Near-black text and near-white surfaces, never `#000` or `#fff` for text.

**Colour means "on" or "look here", never rank.** The primary button is the ink. The one accent (`--accent`)
appears only on a switch that is on, a checked box, the chosen chip, and one or two
highlight tags (a saving, the recommended plan): at most four accent things on a screen, in one hue. The logo mark,
icons, ticks, avatars, headings and card edges stay neutral; twenty tinted things read as generated. Beyond that,
colour comes from what is shown: a file's kind, one chart series, a status in its own ink. To rebrand, change the
accent's hue and keep its lightness and chroma, then measure the pairs again.

## Text contrast passes WCAG 2.2, measured

| Pair | Minimum |
|---|---|
| Body text, labels, placeholders people must read | 4.5:1 |
| Large text (24px, or 18.66px bold) | 3:1 |
| Input borders, icons that carry meaning, chart lines, any state indicator | 3:1 against what is next to it |
| A focus ring | 3:1 against every colour it crosses |
| Disabled controls, decoration | none, so never put information there |

Check any pair: `node <this-skill>/scripts/contrast.mjs "#6b6b6b" "#ffffff"` (it takes hex and `oklch()`).

## WCAG 2.2 decides; APCA is a second look

The ratio above is pass or fail (WCAG 2.1 AA is what the European Accessibility Act enforces). APCA is optional, a
second look at thin text and dark mode only (about Lc 75 for body text, 60 for other text). It was dropped from the
WCAG 3 draft, whose contrast method is still undecided, so never call it "WCAG 3".

## Measure the pair as rendered

Text over a tint, a `color-mix()`, an alpha, a `backdrop-filter` or an image is measured against the worst spot
behind it, not against the token. A fix that changes the hue but not the lightness is not a fix: change lightness
first.

## Roles, used for their job

| You need | Use | Never |
|---|---|---|
| Page ground | `--bg` | pure white everywhere |
| Cards, dialogs, menus; white controls | `--surface`, `--raised` | a different grey per component |
| Fields and tracks; a hovered row; a selected row | `--well`, `--hover`, `--selected` | opacity hacks |
| Main text | `--text` (light 12 to 21:1, dark 10 to 16.5:1) | pure `#000` |
| Secondary text | `--text-2` (4.5 to 7.5:1) | a grey that fails |
| Icons, ticks, placeholders, disabled | `--text-3` (3 to 4.5:1) | anything people must read |
| The one main action | `--primary` (the ink), with `--on-primary` on it | a coloured primary button beside a coloured accent |
| "On", chosen, the one highlight tag | `--accent` with `--on-accent`; `--accent-soft` with `--accent-text` | the accent on more than four things on a screen |
| Status | `--success`, `--warning`, `--danger`, each always with its word | the brand colour to mean success or error; a status colour as decoration |

Two text tones carry hierarchy; a third (subtle) is only for placeholders and disabled text. Stacks of `/0.6`,
`/0.4`, `/0.2` of one colour read as generated.

## Colour is never the only signal

An error border has a message; a green "+12%" has an arrow or the word "up"; a selected item has a tick or a weight
change too (WCAG 1.4.1). Links in running text are underlined.

## One accent, and status stays status

One accent hue per product, only for "on" and "look here": a switch that is on, a checked box, the chosen item, one
highlight. The main action is filled with the ink, and focus is the neutral `--focus`. Status hues sit at least 15° from the
accent in OKLCH hue. A red brand still shows errors in the danger red, with an icon and words. A filled button gets
the colour on its background, never on its label alone; one filled button per view.

## Dark mode is its own theme

| Part | Value |
|---|---|
| Ground | off-black, OKLCH lightness 0.15 to 0.20 (never `#000`) |
| Text | lightness 0.93 to 0.96 (never `#fff`) |
| Each layer up | about 0.03 to 0.04 lighter; elevation is lightness, not shadow |
| Raised edge | a single 0.5px line all round, lighter than the fill (1px at lower contrast on 1× screens, where 0.5px can vanish) |
| Accents | lightness raised, chroma lowered 10 to 20% so they don't vibrate; every pair re-checked |
| Drawn objects and illustrations | a reference's artwork keeps its palette in both themes; a drawn material may adapt to the dark ground (antheo-surface `references/objects.md`); say which was chosen |
| Page | `color-scheme: dark` and a matching `<meta name="theme-color">` |

Never invert. A warm colour made darker turns to mud. Look at every screen in dark before calling it done.

To show a screen in dark whatever the system setting (a screenshot, a demo, a spec), put `data-theme="dark"` on the
page or the part; the style block defines it. `data-theme="light"` forces light the same way.

## Gradients, rarely

Same-hue, under 12% lightness shift, never behind body text, never as text. Interpolate `in oklab`; `in oklch` when
two distant hues would pass through grey.

## Check with colour vision in mind

Emulate the colour-vision deficiencies and greyscale (DevTools, Rendering): states still tell apart, every status has
an icon or a word, and `forced-colors` and `prefers-contrast: more` still show every edge and state.

## What generated UI gets wrong here

Check each in `references/habits.md` before calling it done: a framework's swatches · the next default after the
banned one · gradients as polish · dark as the default nobody asked for · dark made by inverting light · grey text
on a coloured or dark panel · state by colour alone · a theme half applied · a two-way theme switch.

## Done

- [ ] Brand colour traced to the subject; chrome near-grey; one accent
- [ ] Every text and UI pair measured as rendered and passing WCAG 2.2, in light and dark
- [ ] Colour never the only signal; status never borrows the brand
- [ ] Dark theme designed: off-black ground, lighter layers, outlined raised things, accents re-checked
- [ ] Greyscale, colour-vision, `forced-colors` and `prefers-contrast` checked
- [ ] Checked against every habit in `references/habits.md`
- [ ] Reported in antheo-review's format (`references/report.md` there): Block or Approve first, then Seen, Why
      and Fix with the value before and after

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `scripts/contrast.mjs`: the ratio (and APCA) for any two colours, hex or `oklch()`
- `references/color.md`: how the generator builds the palette in OKLCH, contrast as hierarchy bands, dark mode in detail
- `references/habits.md`: what generated UI gets wrong here, each with its fix
