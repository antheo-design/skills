# Sign-in and sign-up

**Job:** get in with the least effort. Built with antheo-build's style block and usage rules; every size below is
a variable from the block.

## The column

- `--w-form` wide. At 1280px it sits in a `.card` (padding `--s-6`) centred on the page, `--s-12` from the top. On
  a phone there is no card, just the `--gutter`.
- **Logo:** a neutral tile (20px, `--primary` fill, `--r-tag` corners, a simple one-shape mark inside in `--on-primary`, never an empty square) and the product name (`--t-body` `--w-strong`); `--s-6` to the
  headline.
- **Headline** in `.t-page`, one line, one colour, no full stop. One sub-line in `--text-2`, 14 words at most, 4px
  under. `--s-6` to the first field.
- **Fields:** `.field`, a label above each, 6px apart; fields `--s-4` apart, one per row. The password field has a
  plain "Show" text button inside its end, and its rule under it in `--t-meta` `--text-2` before typing.
- **A choice inside the form** (a time, a plan): a label, then a grid of three columns of chips with one gap
  (`--s-2`) both ways. A chip is a `.btn`. Chosen: `--accent` fill with `--on-accent` text. Unavailable: a `--well`
  fill with `--text-2` text and the reason in the chip, on a second line in `--t-meta` if one line would crowd it
  ("Mon 18:30" over "Full"). When any chip has a second line, every chip in the grid is `--h-row` tall; one `--t-meta` line under the grid says which one
  and what to do. Every chip keeps one size in every state.
- **Submit:** `.btn-primary`, full width, `--h-cta`, `--s-6` after the last field, in the flow. Under it, 12px on,
  the terms line in `--t-meta` `--text-2`, centred; then, `--s-4` on, one "Already have an account? Log in". Every link on the screen has the block's one link
  style: the text colour with a thin underline, never a second colour or a bare word.
- **Fits 1280×800** down to the terms line.

## The states

- **Error:** under the field, one line that offers the way out as a link ("This email already has an account. Log
  in instead"). The "Already have an account?" line at the bottom stays where it is: never hide part of the page
  to avoid a repeat, because the hole reads as a bug.
- **Loading:** the button's label swaps in place to a spinner and "Creating account…"; it keeps focus, carries
  `aria-disabled="true"` and ignores a second press; the chosen chip stays chosen.
- **Done:** on the same card: a short heading without a full stop, what was chosen as one line, where the
  confirmation went, one primary button that leads on ("See my classes", "Open the app"), never a "Done" that only
  resets the form. No "Log in" anywhere; the name and email are the ones typed.

## Not there

Fields taller than `--h-control` on a desktop; a headline larger than `.t-page`; a coloured logo tile; a two-tone
headline; a placeholder standing in for a label; a submit bar stuck to the bottom of a form that fits; a second
panel or a band across the top; anything in a chip that the request didn't name.
