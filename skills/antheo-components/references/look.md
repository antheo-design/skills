# The look

One look for a single component and for a whole screen: antheo-build's style block (`references/quiet.css` there),
measured from components people pick as designed (a confirm dialog, a CRM table, a file drop zone, a context menu).
Every value below is a variable from that block. A project's own design system replaces the values; the proportions
and the restraint stay.

**Quiet chrome, tactile surfaces, real content.** The frame is nearly colourless and small, so the content stands out
against it. Things that can be pressed look pressable. The demo content is part of the design.

## Colour

| Role | Variable | Rule |
|---|---|---|
| what it sits on | `--bg` | a near-neutral grey-white; never cream, never brand-tinted |
| the card | `--surface` | white (a clearly lighter fill than the page in dark) |
| a strip inside a card | `--well` | one step off the surface; no line between them |
| fields and tracks | `--well` with `--well-edge`; a field adds one `--text-3` line along its bottom edge (`--field-edge`) | sunk, not outlined; a field is still found at 3:1 |
| a raised control | `--raised` with `--sh-control` | |
| hover, selected | `--hover`, `--selected` | fades in place on that row; selection also has a cue that isn't colour |
| text | `--text` | titles, values, labels |
| help, descriptions, meta | `--text-2` | the only other text tone |
| icons, ticks, placeholders | `--text-3` | never text a person must read |
| the primary button | `--primary` | ink-filled; the focus ring is `--focus` (neutral) |
| "on" and "look here" | `--accent` | a switch that is on, a checked box, the chosen chip, one highlight tag (a link is the text colour, underlined) |
| status | `--danger`, `--success` | a word or icon in the status ink; never a coloured row or edge |

- **Colour is content.** A file's kind, a logo, one chart series may carry their own colour. An avatar is neutral
  (initials in `--text-2` on `--well`) unless it is a photo. Letters on any tint still pass 4.5:1.
- **An action takes its meaning's colour only while it acts:** archive green, delete red. Each needs a word or an
  icon as well.
- At most four accent things on a screen, in one hue.

## Type

| Role | Variable | Notes |
|---|---|---|
| body, rows, buttons, fields, labels | `--t-body` (13/20) | `--w-text`; labels, buttons and names at `--w-strong`; fields 16px on touch |
| help, meta, column headers | `--t-meta` (12/16) | `--text-2`; never smaller |
| a component's title | `--t-title` (15/22) | `--w-strong`; its description in `--t-body` `--text-2`, 2px below |
| a value that matters | `--t-num` (28/32) | `--w-text`, proportional alone, tabular in a column or when it ticks; its unit beside it in `--t-body` `--text-2` |

- **One grotesk:** the project's, else Geist. Mono only for code and IDs a person copies.
- **Two weights,** sentence case, no tracked uppercase labels, no full stop after a title or label.
- **Tabular figures** wherever numbers line up or change.

## Size

| Thing | Value |
|---|---|
| controls | `--h-control` (32px; `--h-small` 28px in a dense row; 44px on touch); padding 0 12px; the icon side 2px tighter |
| a main call to action | `--h-cta` (36px) |
| icon buttons | `--h-small` square with a larger reach via `::before`; 44px on touch |
| fields | `.field`: `--h-control`, a well, `--r-control` |
| switch | `--sw-w` × `--sw-h` (32×20), knob `--sw-knob`; on is `--accent`, the off track still 3:1; no "On" or "Off" text beside it |
| card padding | `--pad-card` (20px; 16px on a phone); cards side by side always share one padding |
| rows | `--h-row` (40px; 52px on a phone); a row with a second line about 56px; a menu item `--h-control` |
| tags | `--h-tag` (20px), `--r-tag`; at most one per card |
| bars | 4px, round, a well track, the fill in ink (accent when it means "on") |
| gaps | inside a control 4 to 8; between items 8 to 12; between groups in one component 20 to 24; between page sections `--gap-section` |
| width | a natural width (340 to 420px for a card or dialog); fields in one form fill their column or all stop at one width |

## Surfaces

Fill, edge, drop, corners, wells, hairlines and dark elevation: **antheo-surface** (`SKILL.md` for the ladder,
`references/recipes.md` for the CSS).

## The parts that recur

- **Panel head:** title (`--t-title`) and description (`--t-body`, `--text-2`) at the start; a 28px close button at the end, centred on
  the title's first line. A section's actions sit at the end of its title row, above what they act on.
- **Detail card:** a well holding the value that matters with its label above (`--t-meta`, `--text-2`), then rows of label
  (text-2, start) and value (end), 8px apart, no lines.
- **Footer:** quiet then primary, sharing the width. One primary per surface.
- **List row:** a 24 to 32px neutral tile or avatar, the name (`--t-body`, `--w-strong`) over one fact (`--t-meta`, `--text-2`), the trailing value at the end.
  Hover fills the row in place.
- **Row actions:** the trailing value swaps for 2 to 3 icon buttons on hover or focus within the row, in the same place;
  always visible on touch.
- **A grid of choices** (times, sizes): one gap in both directions; every chip the same size whatever its state (edges are rings, never borders that add pixels); the choice stays visible while loading or disabled; raised chips at `--h-control` with `--r-control` corners, `--t-body` `--w-strong`; the chosen
  one filled with `--accent`; an unavailable one says why on focus.
- **Copy a value:** the icon turns to a tick the moment it is pressed, says "Copied" to screen readers, and reverts or
  says "Copy failed". No toast.
- **Empty state:** one 20px glyph, one line saying what will be here, one hint or action. No box around it.
- **Status:** a word or a dot in the status ink. Never a coloured row or a coloured left border.

## The side-by-side test

Put it next to the best component in the project at 100%, in light and dark: the same body size, title weight,
control height, two text tones, surface, band, edge and drop. If yours is louder, larger, browner or busier anywhere,
fix that. The tells to remove first are in antheo-direction `references/slop.md`.
