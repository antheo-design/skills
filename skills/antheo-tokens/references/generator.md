# The token generator: flags and files

Part of antheo-tokens. `node <antheo-tokens>/scripts/tokens.mjs --help` prints the same.

| Flag | Default | Choose |
|---|---|---|
| `--register` | `product` | `product` for every Clean screen: components, app screens, and ordinary pricing or marketing sections (near-neutral chrome, an ink primary button, the brand for selection, Geist, 14px body with 13px as `--text-sm`); `expressive` only for a Brand page the person asked for (antheo-direction) |
| `--brand` | a calm default (it warns you) | the one colour from the subject's world (antheo-color) |
| `--field` | a deep shade of the brand | expressive only: the band colour, from a second noun |
| `--display` | from the mood | expressive only: the display face (antheo-type) |
| `--mood` | `calm` | calm, warm, playful, bold, technical, editorial, luxury |
| `--shape` | `soft` | sharp, soft, round |
| `--density` | compact for product | `comfortable` for anything people read or fill in; `compact` for dense tools used all day |

The generator writes six files and prints a report:

| File | What |
|---|---|
| `tokens.css` | every token, light and dark; then the style block's names (`--bg`, `--text-2`, `--r-card`, `--sh-card`, `--t-body`…) pointing at them, and the block's classes (`.card`, `.field`, `.btn`, `.tag`), so every Antheo recipe, kit and pattern card works on top of it unchanged |
| `layout.css` | the layout kit (antheo-layout) |
| `motion.css` | the motion kit (antheo-motion) |
| `tokens.tailwind.css` | the same as a Tailwind v4 `@theme` |
| `tokens.json` | the Design Tokens format (the 2025.10 stable release: colours as objects with a colour space, components and a hex; sizes and times with their unit), for other tools |
| `preview.html` | every token on one page, in both themes |
