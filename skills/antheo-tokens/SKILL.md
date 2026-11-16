---
name: antheo-tokens
description: Generates a product's design tokens from a short brief (colour, type, space, corners, shadows and motion, for light and dark, every contrast pair checked) and names them so every screen reuses them. Use when starting a project, adding dark mode, or when a codebase types raw colours and sizes.
---

# Antheo Tokens

A token is a decision made once: every screen reuses it, nothing types the value again. This skill runs the
generator, wires its output into the project, and owns how tokens are named. What each value should be belongs to
the skill that owns it: colours to **antheo-color**, type to **antheo-type**, gaps and widths to **antheo-layout**,
corners, edges and shadows to **antheo-surface**, durations and easing to **antheo-motion**.

## Never type a raw value in a component

**The default tokens are antheo-build's style block** (`references/quiet.css` there): a compact, designed set every
build pastes first. This skill is for what the block doesn't cover: rebranding it (a new accent or neutral hue, a
different typeface), a full token set for a design system (Tailwind theme, W3C JSON), and the expressive register
for a Brand page the person asked for.

No hex, `rgb()`, px font size, radius, shadow or duration in a component's styles: every value is a token. A value a
screen truly needs is added as a token first, with a note saying why.

## Use the project's tokens if it has them

Read them first (with **antheo-system** in an existing app). Generate only when there are none.

## Rebrand the style block, don't replace it

Most products need only three changes to the block, and one command makes them and measures the result:

```bash
node <this-skill>/scripts/block.mjs --accent "#c2412d" --neutral cool --font "Inter" --out ./src/styles/quiet.css
```

| Flag | What it changes | Rule |
|---|---|---|
| `--accent` | the hue of `--accent`, `--accent-soft` and `--accent-text`, light and dark | the brand's hue is kept; lightness is set so text on it passes 4.5:1; a muted brand stays muted |
| `--neutral` | the one hue every grey leans to: `warm` (80), `cool` (255) or a number | chroma stays at or under 0.008, so greys never turn brown or blue |
| `--font` with `--x-height` | `--font`, the font link and `font-size-adjust` | a grotesk with a weight axis (or 450 and 550 loaded), so no weight is faked; the x-height ratio comes from antheo-type's `scripts/x-height.mjs`. Without it, `font-size-adjust` is removed, because a wrong number would resize the real font |

It prints `contrast: all 26 pairs pass` or names each pair that fails, and a `note:` for a choice to look at (an
accent near the danger hue, a nearly grey accent). By hand, change the same three things and measure the same
pairs with antheo-color's `contrast.mjs`. The sizes, weights, corners, shadows and heights stay as they are: they
are what makes it look designed. A brand colour that already passes with white text is kept exactly.

**Both themes at once** (a theme preview, a spec, a side-by-side): put `data-theme="light"` and `data-theme="dark"`
on two sibling elements of the same size; each draws its own ground, whatever the system setting. Never copy the dark
values into a class by hand.

## A full token set, from five lines

```bash
node <this-skill>/scripts/tokens.mjs --brand "#c2412d" --name "Spoke & Chain" --out ./src/styles/tokens
```

Pass `--register expressive` only for a Brand page the person asked for (antheo-direction); every other screen is
`product`, the default. `--brand` is the one colour from the subject's world (antheo-color). The other flags
(mood, shape, density, display face, field colour) and the six files it writes (`tokens.css` with the block's
names and classes on top, `layout.css`, `motion.css`, `tokens.tailwind.css`, `tokens.json`, `preview.html`) are in
`references/generator.md`.

**Every contrast line must say pass**, and the hierarchy line must say every role sits in its band. A `note:` line
names a default that wasn't chosen (no brand given, a brand near a status colour); follow it or say why not.

## Wire it in once

1. Import `tokens.css`, then `layout.css` and `motion.css`, at the root, before any component styles. In a
   single-file page, paste the tokens and only the kit classes you use, never the whole kit.
2. With Tailwind v4, import `tokens.tailwind.css` after `@import "tailwindcss"`.
3. Add the fonts it prints (in Next.js, `next/font/google` with the same families).
4. Open `preview.html` in light and dark. Something wrong: change the brief and run again; never edit a hex by hand.

No Node: copy `references/default-tokens.css` (the generator's product set) and change only `--color-brand*`.

**Which one?** A screen, a component or a small product: the style block, rebranded with `block.mjs`. A design
system that needs a Tailwind theme, W3C JSON, a full type ramp or the expressive register: the generator. Either
way components read the block's short names, so nothing is rewritten when a product moves from one to the other.

## Two tiers, named for the job

- **Primitive** tokens hold raw values and are named for what they are (`--moss-600`).
- **Semantic** tokens are named for their job (`--accent`, `--text-2`, `--gap-field`) and are the only ones components read.
- **No component tokens to start with.** Add `--button-bg` only when a component must differ from its role on
  purpose, with the reason beside it.
- **One word per idea:** `muted` everywhere, never `muted` here and `secondary` there. No brand or product words in
  semantic names: `--accent`, not `--moss`.
- A brand palette that arrives fixed becomes primitives; point the semantic tokens at them.

## The families, and who decides their values

The block's name first (what components read), then the generator's long-form token behind it.

| Family | Examples | Owner |
|---|---|---|
| Colour | `--bg`, `--surface`, `--well`, `--text`, `--text-2`, `--accent`, `--danger` (`--color-bg`, `--color-surface`, `--color-text-muted`, `--color-brand`…) | antheo-color |
| Type | `--font`, `--t-meta` … `--t-display` with `--l-*` and `--k-*`, `--w-text`, `--w-strong` (`--font-sans`, `--text-xs` … `--text-5xl`, display steps) | antheo-type |
| Space | `--s-1` … `--s-24`, `--gap-label`, `--gap-item`, `--gap-field`, `--pad-card`, `--gutter`, `--w-form` … `--w-data` (`--space-*`, `--page-gutter`) | antheo-layout |
| Shape and depth | `--r-tag`, `--r-control`, `--r-card`, `--sh-control` … `--sh-dialog`, `--h-control`, `--h-row` (`--radius-*`, `--shadow-1` … `--shadow-4`, `--control-*`) | antheo-surface (control heights: antheo-components) |
| Motion | `--dur-instant` … `--dur-page`, `--ease-out`, `--ease-in-out`, `--ease-spring`, `--scale-*`, `--dist-*` | antheo-motion |

## Write the decisions down

Before the second screen, put the brief, the fonts and any changed rule at the top of `tokens.css` or in a
`DESIGN.md` beside it, where the next agent will read it.

## More than one product shape

A product can need more than one density (compact for a tool, comfortable for touch), more than two themes (a
brand theme, a high-contrast one) and more than one brand. Each is a set of values on the same names, never new
names. A token that belongs to one component (a chart's series, a brand's hero button) is fine when it has a reason
and is named by its role, and it still reads from the shared scale.

## Done

- [ ] No raw colour, size, radius, shadow or duration in any component (search the styles for `#`, `rgb(`, `px`)
- [ ] The generator's contrast and hierarchy lines pass; every `note:` followed or answered
- [ ] Tokens, layout kit and motion kit imported once at the root; fonts loaded
- [ ] Preview opened in light and dark
- [ ] Semantic names only in components; one word per idea; decisions written down

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `scripts/block.mjs`: the style block, rebranded and measured (no dependencies)
- `scripts/tokens.mjs`: the full generator (no dependencies)
- `references/default-tokens.css`: the product register's tokens, for when the generator can't run
- `references/geometry.md`: radius presets and nesting, shadow steps, hit areas and the grid the generator follows
- `references/generator.md`: the token generator's flags and the six files it writes
