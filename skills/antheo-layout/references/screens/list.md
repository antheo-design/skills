# A list page (people, orders, records)

**Job:** find a record and act on it. Built with antheo-build's style block and usage rules; every size below is a
variable from the block.

## At 1280px

- **Bar** `--h-bar` tall, across the window, `--surface`, no line under it: a neutral logo tile (20px, `--primary` fill, `--r-tag` corners, a simple one-shape mark inside in `--on-primary`, never an empty square), the product
  name (`--t-body` `--w-strong`), and the one context the request names as `--text-2` text. No sidebar unless the
  request lists destinations.
- **Column** `--w-data`, centred, `--s-12` under the bar.
- **Title row:** the title in `.t-page`; under it the count as `--t-body` `--text-2` ("9 people · 2 pending"); at
  the end of the row, centred on the title block, the one `.btn-primary` (no icon).
- **The table,** `--s-6` below: a `.card` with padding 0.
  - Header row 36px: `--t-meta` `--w-strong` in `--text-2`, sentence case, a hairline under it.
  - Rows `--h-row` tall, a hairline between rows only; no column lines; `--s-4` of padding at each end.
  - The first column carries the record's name in `--w-strong` (with a 24px neutral avatar if it is a person);
    other cells are `--text-2`; numbers and dates use tabular figures.
  - A value someone changes is a `--h-small` select styled as a `.btn`; a value nobody can change is plain text.
  - Row actions at the end: `.btn.btn-quiet.icon` buttons, a name for each; danger colour shows only on hover or
    focus.
  - All the rows the request names fit the first screen.
- **A second list** (pending items): its title in `.t-title`, `--s-8` above, `--s-3` to a second table card of the
  same build.

## The states

- **A form to add one:** the block's `dialog` (a sheet on a phone): the fields `--s-4` apart, then Cancel and one
  primary button at the end. Nothing is reserved for an error: its line appears under its field and the dialog grows by that one line. An
  empty reserved slot between two fields reads as a spacing mistake.
- **Empty:** the card holds one line saying what will be here and the action to add one. No illustration.
- **After a removal:** the row fades and its height closes (`--dur-base`, antheo-motion recipe 37), so the rows
  below slide up; nothing jumps. A small toast at the bottom centre (the `--primary` fill) names what was removed,
  with "Undo" and a small close button ("Dismiss"). Because it carries an action it stays until it is dismissed
  or the next toast replaces it; undo grows the row back in place.

## At 390px

Each record becomes a two-line row in one card, the same arrangement in every list on the page:

- **Line one:** the avatar and the name at the start; at the end the value's control, then the row action
  (`.btn-quiet.icon`). All three centred on this line.
- **The name wins the space.** It is never cut short: the control here is quiet and only as wide as its word (a
  `.btn-quiet` select showing the value and a chevron, no box, `--s-2` of padding; the plain word where it can't
  change). If a name still can't fit beside it (a long email standing in as the name), the name wraps onto a
  second line.
- **Line two,** under the name and starting on its left edge: whatever other facts the record has as one
  `--t-meta` `--text-2` line ("dana@kiln.studio · 2 hours ago"; for a pending invitation, "Sent 2 days ago"),
  truncated with an ellipsis at the card's edge.
- `--s-3` above and below; `--h-row` is the least a row can be, not its height. A row with no control keeps the
  same two lines, so text lines up down the list.
- The primary button goes full width under the title. Sizes change only through the block's phone values.

## Not there

A sidebar with destinations nobody named; a workspace chip or an avatar in the bar; tinted or coloured avatars;
roles, counts or "You" as pills; column dividers; a long sub-line; rows taller than `--h-row`; a red icon at rest; a
status dot unless status is part of the request.
