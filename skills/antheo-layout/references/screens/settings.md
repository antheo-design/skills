# Settings

**Job:** change things safely; find any setting fast. Built with antheo-build's style block and usage rules; every
size below is a variable from the block.

## At 1280px

- **Bar** `--h-bar` tall, across the window, `--surface`, no line under it. A neutral logo tile (20px, `--primary` fill,
  `--r-tag` corners, a simple one-shape mark inside in `--on-primary`, never an empty square) and the product name (`--t-body` `--w-strong`) at the start, `--gutter` from the edge; the workspace's
  name as `--text-2` text at the end. Nothing else.
- **Column** `--w-settings`, centred, `--s-12` under the bar.
- **Page title** in `.t-page`; `--s-8` to the first section. A sub-line only if it adds something, in `--text-2`,
  12 words at most.
- **Each section** (up to four; with five or more, a settings nav of plain text links beside the column): its
  title in `.t-title`, `--s-3` to its `.card` (a one-line description under the title, in `--text-2`, only when
  the request gives one). Sections
  `--gap-section` apart. No lines between sections.

## The profile card

- An avatar (48px, initials in `--text-2` on `--well`), a `.btn` "Change photo" beside it, and under the button
  "JPG or PNG, up to 2 MB" in `--t-meta` `--text-2`.
- `--s-5`, then name and email side by side (`--s-4` apart) as `.field`, labels above; under the email one
  `--t-meta` line saying what it is used for.
- `--s-5`, then "Save changes", `.btn-primary`, enabled, on the fields' left edge.
- Saved: the button reads "Saved" for two seconds, and one `--t-meta` line beside it says what changed. Error: the
  red inner edge and one `--t-meta` line under the field naming the fix. The card never changes size.

## The notifications card

Rows of a label (`--t-body` `--w-strong`) over one line of description (`--t-meta` `--text-2`, naming the channel
or the timing), the block's `.switch` at the end (on is `--accent`, off is a `--text-3` track). A hairline
between rows is allowed, since it is a repeating list. Switches apply at once; no "On" or "Off" text.

## The danger zone

The same `.card` as the others, on the same edge. A label ("Delete this workspace"), the consequence with real
counts in `--text-2`, and at the end a `.btn` whose text is `--danger`. The dialog is the block's `dialog` (a sheet on a
phone): the loss named with the same counts, a `.field` to type the name, Cancel, and a filled `--danger`
button that turns on when the name matches.

## At 390px

One field per row; Save full width; switches and rows grow through the block's phone values.

## Not there

A title column beside the cards; lines between sections; a workspace chip, an avatar in the bar or a sidebar; a
coloured logo tile or tinted avatar; an icon in Save; a label over a button that already says what it does; a
description that repeats its title; more than four text sizes.
