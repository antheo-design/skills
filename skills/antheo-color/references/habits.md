# What generated UI gets wrong here

Part of antheo-color. Read it before calling the work done, and check the build against each habit.

Seen again and again in agent-built pages (detector catalogues and audits, 2025 to 26). Check for each.

- **A framework's swatches:** `indigo-500`, `violet-500`, `slate-900`, `#6366f1`, `#3b82f6`, `#10b981`. Search the
  build for palette names and these hexes; every colour is a block variable.
- **The next default after the banned one.** Told to avoid purple, a model reaches for cyan on near-black, acid
  green on black, or cream with terracotta. The hue comes from the brief, as a value.
- **Gradients as polish:** gradient text, a gradient border, a gradient-filled button. Solid fills.
- **Dark as the default nobody asked for,** with mid-grey text. Light unless asked; both themes built, following
  the system.
- **Dark made by inverting light:** pure `#000` under pure `#fff`, light-mode shadows left on (they vanish), the
  accent at full strength. Use the block's dark values: off-black, off-white, a lighter fill for height, a quieter
  accent.
- **Grey text on a coloured or dark panel:** it turns to mud. Text on a fill is that fill's own `--on-*` colour.
- **State by colour alone:** a red edge as the only sign of an error, a tint as the only sign of selection. Add
  the words or the mark.
- **A theme half applied:** no `<meta name="color-scheme" content="light dark">` (a white flash before dark paints;
  light scrollbars and native controls in dark), default blue selection and checkboxes. The block sets
  `color-scheme`, `accent-color` and `::selection`; add the meta tag to the page.
- **A two-way theme switch** that forgets the system. Three choices (system, light, dark), system first, and other
  open tabs follow.
