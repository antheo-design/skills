# Pricing section

**Job:** pick a plan with confidence. Built with antheo-build's style block and usage rules; every size below is a
variable from the block.

## At 1280px

- **No site header, footer or navigation** unless the request asks for a whole page.
- **Container** `--w-pricing`, centred, `--s-16` above the heading.
- **Heading, centred:** the headline in `.t-display`, one colour, nine words at most, on one line if it fits; a
  sub-line in `--t-title` size at `--w-text` in `--text-2`, two lines at most, no wider than 48ch, `--s-2` under.
- **Billing switch,** `--s-6` under: the block's `.seg` (a `--well` track, fully round, `--h-control` tall; the
  chosen option raised in place, no sliding thumb needed). Beside it, the saving as one
  `.tag-accent` ("Save 20% yearly"): it is the offer, so it stands out.
- **Plan cards,** `--s-8` below: two to four `.card` in one row, `--s-4` apart, padding `--s-6`, equal heights. In
  each, in this order:
  1. the plan's name, `.t-title`;
  2. who it is for, `--t-body` `--text-2`, two lines at most (reserve two lines so the prices line up);
  3. `--s-5`, then the price in `.t-num` at `--w-text`, its unit beside it on the same baseline, 6px after
     (`--t-body` `--text-2`: "per seat / month");
  4. one line under it in `--t-meta` `--text-2`: "No card needed"; "Billed monthly. Cancel any time."; on yearly,
     the billed total ("$144 per seat, billed yearly");
  5. `--s-5`, then a full-width button `--h-cta` tall: `.btn-primary` on the recommended plan only, `.btn` on the rest;
  6. `--s-5`, then five or six feature lines, the same count on every plan (give or take one), so no card looks
     thin beside its neighbours: `--t-body` in `--text`, a 16px tick in `--text-3`, `--s-2` apart; a paid plan
     opens with one lead line at `--w-strong`, with no tick and not counted, naming the plan directly below it
     ("Everything in Free, plus", then "Everything in Team, plus"). So the first plan has six lines and each paid
     plan the lead and five, and the cards end level. Each line is a concrete thing with its number
     ("Up to 3 projects", "30-day version history"), never a vague one ("Advanced features").
- **The recommended plan:** the filled button, one `.tag-accent` ("Recommended") beside its name, and `--sh-lift`. Same
  size, padding and corners as its neighbours.
- **Under the cards,** `--s-6` below: one centred line, `--t-meta` `--text-2` (currency, and that seats can change).
- **Fits 1280×800:** all plans visible to their last feature.

Prices stay whole on both periods (15 → 12, 35 → 28). Switching the period changes the numbers and nothing else.

## At 390px

The cards stack with the recommended one first, `--s-3` apart. Sizes change only through the block's phone values.

## Not there

A site header or nav; "Log in"; an outline or coloured edge on any card; a second accent hue, coloured ticks or more than two tags; a
divider between the price and the features; an icon in a button; a comparison table or questions unless asked; a two-tone, italic or full-stopped headline; text larger than `--t-display`.
