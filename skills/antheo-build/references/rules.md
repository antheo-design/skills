# The usage rules, in full

Part of antheo-build. SKILL.md gives each rule with its numbers; this file gives each one whole, with its edge cases.
The numbers are the same in both, and other skills cite them by number ("antheo-build, rule 6").

**Four kinds of rule.** **Requirements** never bend (the task works, WCAG 2.2 AA, nothing faked, nothing wired to
nothing, nothing breaks at any width). **Guidance** comes from evidence (a press answered within 100ms, layout shift
under 0.1, about 68 characters a line, `--measure`): follow it or say why not. **House defaults** are the look's numbers: they give
way to the person, a reference or the project. **Experiments** are tried against a baseline, never stated as rules. A
number with no kind given is a house default.

1. **Few sizes.** An app screen uses at most four text sizes (meta, body, title, page); a data screen may add `--t-num`
   for its key figures and nothing else; a marketing section at most five (adds num and display). Nothing is larger
   than `--t-page` in an app except those figures, or `--t-display` anywhere.
2. **Two weights.** `--w-text` for text and prices, `--w-strong` for titles, labels and buttons. Never 600 or 700.
3. **Headlines sit tight.** A marketing headline is `--t-display`, one colour, nine words at most, two lines at most.
   An app page title is `--t-page`. Card, plan and section titles are `--t-title`. No trailing full stop on a title,
   label, button or tag; sentence case; no italics; no capitals for emphasis. A page has one title and it names the
   task ("New project", "Billing"); never a generic label above it ("Form fields", "Dashboard"), and the card under
   it doesn't repeat it.
4. **Cards have no outline.** A card is `.card`: the surface on the page, a faint edge and a soft drop. Never a
   visible border, never a coloured edge, never a card inside a card.
5. **Almost no lines.** A hairline (`--line`) only between repeating rows of a list or table (in the Studio look, also
   between panes). Never under a card's
   header, between sections, between a price and its features, or under a top bar at rest (a sticky bar takes one
   once content has scrolled under it).
6. **Three corners.** Cards, dialogs, menus and tables `--r-card`; buttons, fields and chips `--r-control`; tags
   and the logo tile `--r-tag`. Fully round only for switches, avatars and a segmented control, and those don't
   count as a fourth size. No pill buttons.
7. **Tags are rare, so they count.** At most one per card and two per screen. The one thing to notice (a saving,
   the recommended plan, a real status) is a `.tag-accent`, so it stands out; anything else that needs a tag is the
   neutral `.tag`. A role, a count or "You" is plain text. A status in a table is a word (with a 6px dot if it
   helps), not a pill.
8. **Colour means "on" or "look here".** `--accent` only on a switch that is on, a checked box, the chosen chip
   and the highlight tags of rule 7: at most four accent things on a screen (a list of switches counts as one),
   all in the one accent hue. A link is the text colour with a thin underline (the block styles `a`), the same
   everywhere on the screen. The logo mark, icons, ticks, avatars, headings and card edges
   are neutral. `--danger` only on a destructive action and an error.
9. **One primary action.** The only `.btn-primary`, after what it acts on, always enabled (while it is sending
   it stays focusable with `aria-disabled="true"` and ignores a second press). A recommended plan is its
   filled button, a `.tag-accent` "Recommended" and `--sh-lift`, at exactly its neighbours' size.
10. **Fields are wells.** `.field` (a borderless fill with one line along its bottom edge), with its label above (`--t-body`, `--w-strong`, `--text`), 6px apart. A helper
    line only for a constraint or a consequence ("JPG or PNG, up to 2 MB"; "At least 8 characters"), in `--t-meta`
    `--text-2`, 4px under. An error is the red inner edge and a short message under the field naming the fix (antheo-writing).
11. **Chrome only as named.** A "section", a "component" or a page that shows components gets no site header, footer
    or navigation; the live component comes first, in its smallest true setting ("aim higher", step 4), then its
    states. An app page gets one `--h-bar` bar: a neutral logo tile (20px, the `--primary` fill, `--r-tag` corners, a
    simple one-shape mark in `--on-primary`, never an empty square), the product name (`--t-body`, `--w-strong`) and
    the one context the request names, as plain text. No sidebar unless the request lists destinations; never an
    avatar, "Log in" or links nobody named.
12. **Only what was asked.** No invented data, features, panels or copy. A sub-line only if it says something the
    title doesn't, in at most 12 words. Feature lists of five or six concrete lines, the same count per plan. A
    component's demo setting (the photo a like button sits under) is not invented chrome: it is the least content
    that makes the component readable, and it stays in the demo.
13. **Compact, with rhythm.** Controls `--h-control`, rows `--h-row`, card padding `--pad-card`, sections
    `--gap-section` apart; more space above a title than below it; equal padding on all sides of a card or bar.
    At 1280×800 the main task fits the first screen: every plan to its last feature, a sign-up to its button, a
    list to eight rows and its action, settings to the whole first card. When it doesn't fit, tighten the gaps between
    fields or rows, then card padding, then the space above the title; never control heights or text sizes.
14. **Widths.** A form `--w-form`; settings one `--w-settings` column; a pricing row `--w-pricing`; data `--w-data`;
    centred in the window. Fields that belong together share a row (name and email). A block narrower than its
    column (a form, a card, one settings group) takes the column's width, so it keeps the one edge; only a block
    alone on the page (a sign-in card) stays narrow and centred. Never a narrow block with bare space beside it.
15. **One edge, matching siblings.** Everything read in the column (headings, cards, fields, text) shares its left
    edge; the bar's contents sit on the window gutter. Buttons go where the eye ends: after a stacked form's last
    field, on the fields' left edge; at the end edge of a card, a wide dialog or a list of switches, the main one
    last; sharing the width in a narrow decision dialog; full width on a phone (antheo-layout, "Chrome only as
    named, then one edge"). Cards in a row match in width, height, padding, the order inside and the side their
    buttons sit on; controls in a row share a height; a grid has one gap in both directions.
16. **Two text tones in a card.** `--text` for values, titles and labels; `--text-2` for descriptions and meta.
    `--text-3` only for icons and ticks; a placeholder is text someone reads, so it takes `--text-2` (the block does
    this).
17. **A unit stays with its number:** on its baseline, 6px after it, `--t-body` `--text-2`, on one line. A discounted
    price keeps the precision of the original (15 → 12, 9.99 → 7.99), never a computed 9.60 nobody would publish.
18. **Every state on the same layout,** with one made-up person throughout and no placeholder text. A state
    opened by a URL parameter or a story holds until dismissed, so it can be looked at. Done: the button says the
    past tense of its own verb (Save → "Saved", Send → "Sent") and one line says what changed. Loading: the label
    swaps in place and choices stay chosen. Nothing covers content; a word never breaks; a removed row closes
    smoothly (antheo-motion recipe 37); nothing on the screen jumps.
19. **Icons are few and grey.** 16px, 1.5 stroke, `--text-3`: navigation, an icon-only button (with a name), a tick
    in a list. No decorative icon inside a primary button; a spinner while it works and a check when it's done are
    states, not decoration (antheo-components).
20. **Count before done.** Open the 1280px screenshots, light and dark, and count: text sizes, weights, corner sizes,
    accent things, tags, hairlines. Each within the limits above, and the main task on the first screen. A
    checker's score is not a look.
21. **Arm the gate, and pass it.** At the start, arm antheo-review's gate on every page the work touches
    (`gate.mjs arm <url-or-file> --copy <source folder>`, plus `--preset studio`, `editorial` or `playful` for a
    look, `--preset none` when the project has its own system, `--landing` for a landing page, and `--ref <images>`
    when the work is built from references); before saying done, `gate.mjs check` must say
    PASS, or after its rounds DONE, UNRESOLVED with what is left, told to the person. When exploring a throwaway
    sketch or early direction, skip the gate until the person picks one to keep, then arm it before calling the build
    done. Rounds, setup and how much to check beyond the gate: antheo-review `references/gate.md` and "How much to check". A PASS is the floor, not the
    finish.
