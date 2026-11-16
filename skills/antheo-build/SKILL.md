---
name: antheo-build
description: Starts any UI request (a component, a screen, a page, a screenshot or Figma frame to match, or variants to compare). It gives the build one designed style block to paste (colours, surfaces, a small type scale, three corner sizes, spacing, control heights) and the usage rules that keep the result compact and quiet, with few text sizes, two weights, cards without outlines, almost no dividers or tags, colour only for "on" states, and nothing the request didn't name. Use whenever asked to build, design, redesign or "make it look good".
---

# Antheo Build

Clean is not a feeling, it is counts: few text sizes, two weights, three corner sizes, almost no lines, almost no
colour, and everything the person needs on the first screen. A build looks generated when its styles are invented as
it goes. So every build starts from one designed style block and stays inside it. These rules outrank every other
Antheo skill.

## What always holds, and what is the Quiet preset

**Always, in any style:** the person's task is clear and can be finished; every control works and every state is
reachable; keyboard, names, contrast, targets and zoom hold (**antheo-access**); real content survives every width and
both themes; the project's existing system, components and contracts are kept; nothing is invented; and every claim
comes with the check that shows it, with what wasn't checked said as unchecked.

**The Quiet preset** is the style block and the look in the rules below (rules 1 to 8, 13 to 17 and 19, the plan, field and logo-tile looks in rules 9 to 11, and the counts in rule 20): the default look for a new product
with no system of its own. It gives way, in this order, to the person's explicit direction ("bold", "editorial", a
reference they praise: **antheo-direction**) and to the project's own tokens and components (**antheo-system**).
Then its numbers stop applying: outlined cards, pill buttons, more weights, larger or serif type and several meaningful
colours are choices to judge on their own terms, not defects. Keep the restraint either way, and every device earns
its place. Check such work with the gate's `--preset none`, which keeps every universal check and drops the Quiet ones.

**Parts and objects.** The preset is for **parts**: fields, menus, filters, lists, tables, tabs. An **object** is a
component that stands for a physical thing people know and use as one: a bank card, a dial, a knob, a radio tuner, a
thermostat, a ticket, a record player. Naming one asks for it, so it is drawn as the thing, with its own material,
light, depth and colours inside its edge (antheo-surface `references/objects.md`), while everything around it (labels,
buttons, lists, the page) stays a part in the preset. A grey box with a label where the thing should be is the
object's commonest failure.

## Correct is the floor; aim higher

Every rule and check in these skills proves that nothing is broken. None of them proves the work is good: a page can
pass the gate at 100 and still be forgettable. So, for anything meant to be kept (a component for a library, a
product screen, anything creative), also:

1. **One thing at a time.** Several components in one pass each get a fraction of the attention. Build one, finish
   it, then the next.
2. **Start from a reference.** The person's, if they have one; otherwise name one or two real things it should feel
   like (a product, an object, a photo) and say so. With no target, the result drifts to the average.
3. **Directions before detail, when the look is open.** For an object or a creative piece, three quick directions on
   the real page (Variants, below); the person picks; then build that one fully.
4. **The main thing first, and big.** Make the component itself excellent at its real size before drawing its other
   states. On a component's page it comes first, alone; the states sheet comes after it.
5. **Watch it move.** Film every motion (antheo-motion, "Watch it") and read the frames; a still screenshot can't
   judge motion.
6. **Put it beside the reference, zoomed** (antheo-review `scripts/beside.mjs`), and name what is missing (light, a detail, proportion, how it moves).
   Measure a few ratios in both (an icon to its button, a figure to its card) and match them; copy its one or two
   signature details exactly (drawn edges on 3D type, the gloss strip on candy). Fix, and look again. Two or three of
   these rounds is where quality comes from.
7. **Go past a still.** A still reference shows the thing at rest, never its life. Design what it implies, from how
   the real thing behaves: every control answers its press, every change of state moves (values roll, panels slide,
   a needle settles), the object has an idle life if the real one does, and the main action gets one bigger beat.
   Find the one thing people would do with it for fun (tune through the static, squash the candy) and make that the
   richest part (**antheo-creative**); never trim it to fit the app timing rules, which are for chrome. Then film it.
8. **Every control does something,** in a demo too: a button with nothing behind it at least shows its result
   ("Opened the readers report"). The access probe presses each one and reports those that answer with nothing.
9. **Most of the effort goes into the thing.** The gate, the evidence and the notes are the last part of the work,
   not the work: a component that passes every check and lost its charm has failed.
10. **Say honestly where it stands:** what passed, what was compared, and what still falls short of the reference.

## Match the person

Read who is asking from how they ask, and change the depth, never the quality of the work. Ask only when the answer
would change what gets built.

| Person | Give them |
|---|---|
| New to design | the sensible default, built and working, in plain words, and the one mistake to avoid |
| Practised | the options and their trade-offs, and how it fits the code they have |
| Senior | the constraints, exceptions, behaviour contract and the evidence |
| Lead | the outcome for people and the business, the options with cost and owner, rollout and how success is measured |

A small component task gets no strategy memo; a rollout question gets more than a component. Explaining a choice at
any depth, say which part is a default of this style ("this style keeps corners small") and which is true in any style
("the button keeps its width, so nothing jumps"); never call another look wrong because the preset avoids it.

## 1. Paste the style block first

Paste `references/quiet.css` whole, as the first CSS of the build, and load its font. After it, **every** colour,
font size, line height, weight, radius, shadow and control height is a `var(--…)` from the block: no hex, no `px`
font size, no new radius. (Allowed literals: `0`, `1px`, `2px`, `100%`, and widths; and inside a drawn object, its own
material colours, defined once on its root for light and dark.) If the project already has its
own tokens, those are the block (**antheo-system**). In a framework or a server-rendered app, load it once,
globally, first, and read its names from components, Tailwind or a theme object: `references/stacks.md` has where
it goes in React, Vue, Svelte, Angular, Astro, Django, Rails, Laravel and the rest.

```
--bg --surface --raised --well --hover --line      the page, cards, white controls, fields, hover, a hairline
--text --text-2 --text-3 --primary --accent --danger   main text, help, icons, the filled button, "on", danger
--accent-soft --accent-text                        a highlight tag: the saving, the recommended plan
--t-meta 12 · --t-body 13 · --t-title 15 · --t-page 20 · --t-num 28 · --t-display 36   (each with --l-* and --k-*)
--w-text 450 · --w-strong 550                      the only two weights
--r-tag 4 · --r-control 6 · --r-card 10 · --r-full the only corners
--sh-control --sh-card --sh-lift --sh-dialog       the only shadows
--h-control 32 · --h-cta 36 · --h-row 40 · --pad-card 20 · --gap-section 32
--dur-fast 150ms · --dur-base 200ms · --ease-out   the motion variables (antheo-motion's recipes read them)
.card  .field  .btn  .btn-primary  .btn-quiet  .tag  .tag-accent  .switch  .seg  dialog  a
.t-meta  .t-title  .t-page  .t-num  .t-display  .muted
```

## 2. The usage rules

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
5. **Almost no lines.** A hairline (`--line`) only between repeating rows of a list or table. Never under a card's
   header, between sections, between a price and its features, or under a top bar.
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
10. **Fields are wells.** `.field`, with its label above (`--t-body`, `--w-strong`, `--text`), 6px apart. A helper
    line only for a constraint or a consequence ("JPG or PNG, up to 2 MB"; "At least 8 characters"), in `--t-meta`
    `--text-2`, 4px under. An error is the red inner edge and a short message under the field naming the fix (antheo-writing).
11. **Chrome only as named.** A "section", a "component" or a page that shows components gets no site header, footer
    or navigation. A page that shows a component puts the live component first, at its real size, then its states.
    An app page
    gets one `--h-bar` bar: a neutral logo tile (20px, the `--primary` fill, `--r-tag` corners, a simple one-shape mark inside in `--on-primary`; never an
    empty square), the product name (`--t-body`, `--w-strong`), and the one
    context the request names (a workspace name, as plain text). No sidebar unless the request lists destinations;
    never an avatar, "Log in" or links nobody named.
12. **Only what was asked.** No invented data, features, panels or copy. A sub-line only if it says something the
    title doesn't, in at most 12 words. Feature lists of five or six concrete lines, the same count per plan.
13. **Compact, with rhythm.** Controls `--h-control`, rows `--h-row`, card padding `--pad-card`, sections
    `--gap-section` apart; more space above a title than below it; equal padding on all sides of a card or bar.
    At 1280×800 the main task fits the first screen: every plan to its last feature; a sign-up to its button; a
    list to eight rows and its action; settings to the whole first card. When it doesn't fit, tighten in this order:
    the gaps between fields or rows, then card padding, then the space above the title; never control heights or text
    sizes.
14. **Widths.** A form `--w-form`; settings one `--w-settings` column; a pricing row `--w-pricing`; data
    `--w-data`. Centred in the window. Fields that belong together share a row (name and email). A block narrower than
    the column it sits in (a form, a card, a dialog's content, one settings group) takes the column's width, with
    related things side by side, so it keeps the one edge; only a block alone on the page (a sign-in card) stays
    narrow, centred. Never a narrow block against one edge with bare space beside it.
15. **One edge, matching siblings.** Everything in the column shares its left edge; the bar's contents sit on the
    window gutter. Cards in a row match in width, height, padding and the order inside; controls in a row share a
    height; a grid has one gap in both directions.
16. **Two text tones in a card.** `--text` for values, titles and labels; `--text-2` for descriptions and meta.
    `--text-3` only for icons, ticks and placeholders.
17. **A unit stays with its number:** on its baseline, 6px after it, `--t-body` `--text-2`, on one line. A discounted
    price keeps the precision of the original (15 → 12, 9.99 → 7.99), never a computed 9.60 nobody would publish.
18. **Every state on the same layout,** with one made-up person throughout and no placeholder text. A state
    opened by a URL parameter or a story holds until dismissed, so it can be looked at. Done: the
    button says the past tense of its own verb (Save → "Saved", Create → "Created", Send → "Sent") and one line says
    what changed. Loading: the label swaps in place and choices stay chosen.
    Nothing covers content; a word never breaks. A row that is removed closes smoothly (antheo-motion recipe
    37); nothing on the screen jumps.
19. **Icons are few and grey.** 16px, 1.5 stroke, `--text-3`: navigation, an icon-only button (with a name), a tick
    in a list. No decorative icon inside a primary button; a spinner while it works and a check when it's done are
    states, not decoration (antheo-components).
20. **Count before done.** Open the 1280px screenshots, light and dark, and count: text sizes, weights, corner sizes,
    accent things, tags, hairlines. Each within the limits above, and the main task on the first screen. A
    checker's score is not a look.
21. **Arm the gate, and pass it.** At the start, arm antheo-review's gate on every page the work touches
    (`gate.mjs arm <url-or-file> --copy <source folder>`, plus `--preset none` when the project has its own system,
    and `--ref <images>` when the work is built from references, so it asks for the comparisons and a filmstrip);
    before saying done, `gate.mjs check` must say PASS, or after three rounds DONE, UNRESOLVED with what is left, told
    to the person. How much to check beyond the gate depends on the size of the change (antheo-review, "How much to
    check"). Setup for each agent: antheo-review `references/gate.md`. A PASS is the floor, not the finish: it says
    nothing measured is broken, never that the work is good ("Correct is the floor; aim higher").

## 3. Then the screen's pattern card

One card in antheo-layout, `references/screens/`: `pricing.md`, `settings.md`, `sign-up.md`, `list.md`. Each gives
the regions in block variables and what is **not** there. Other screens: `references/screens.md`, built with the
same block and rules.

## Read another skill only when its job comes up

| When | Read |
|---|---|
| A single component for a library; a table or chart | **antheo-components**, **antheo-data** |
| A component that is a physical thing (a card, a dial, a knob) | **antheo-surface** `references/objects.md` |
| It should be fun, playful or surprising to use; a widget, a toy, onboarding | **antheo-creative** |
| It will be used on a phone | **antheo-mobile** |
| Wording errors, confirms, empty states | **antheo-writing** |
| Something opens, closes or moves | **antheo-motion** |
| A custom control (not a native element) | **antheo-access** |
| A new brand colour or typeface for the block | **antheo-tokens** |
| Before shipping | **antheo-review** |

An opinion goes to **antheo-critique**, "how was this made" to **antheo-explain**, a whole app's motion to
**antheo-motion-audit**, an app that already has a look to **antheo-system**.

## Four lines before any code

```
Job:      what the person gets done here
Content:  exactly what the request names, with believable values
States:   every state it must show
Style:    Antheo Quiet pasted; pattern card read
```

## Brand, only when asked

A display typeface, a colour field, an illustration or a signature moment only when the person asks ("landing
page", "campaign", "bold", "playful") or praises a reference: **antheo-direction**, and **antheo-moment**. The
"always" list still holds, and the page carries one expressive idea, with as many devices as serve it.

## From a design: measure, don't guess

1. **Figma:** search the available tools for a Figma connector first; ask for an export only if none exists.
2. **A screenshot gives proportions, not sizes.** State the scale you assumed ("2× retina, so halve it").
3. **Round to a block variable only within 2px, or ΔE 2 for a colour.** Further off, ask; never invent a value.
4. **Build only what is drawn,** then put a screenshot of the build beside the design (`node
   <antheo-review>/scripts/pixdiff.mjs design.png build.png --tolerance 4 --out diff.png`) and fix what differs.
5. **Finish with a table:** `element | design value | built value | matched or explained`.

## Variants and corrections

Variants: one question, three versions that differ only on its axis, on the real page, one line each on what it is
best at, never a favourite. Mark each root `data-variant` and load `scripts/variant-bar.js` to switch and pick, in any
stack (`references/variants.md`); after the pick, offer one named part from each of the others. A correction from the person: make the change, then record it with
**antheo-system** (`design/taste.md`).

## Habits to catch in yourself

Check each in `references/habits.md` before calling it done: "Done" on code evidence · more than asked, or less than
promised · drift · quieting a check instead of fixing it · a fix loop · another design skill pulling the other way.

## Done

- [ ] The style block pasted; no colour, size, weight, radius or shadow outside it
- [ ] In the Quiet preset: at most 4 text sizes (5 in a marketing section), 2 weights, 3 corner sizes
- [ ] In the Quiet preset: no outlined cards; hairlines only between repeating rows; at most 2 tags; at most 4 accent things
- [ ] Nothing the request didn't name: no header on a section, no invented navigation, data or copy
- [ ] The main task fits 1280×800; every state on the same layout, one person throughout
- [ ] The screenshots opened and the six counts made, light and dark, at 390px and 1280px
- [ ] Every control pressed; the console clean; no "TODO", sample name or leftover text; nothing jumps
- [ ] Anything meant to be kept: built one at a time, from a reference, put beside it zoomed, every motion filmed and read
- [ ] Every control answers its press (nothing wired to nothing); a still reference given its motion
- [ ] An object drawn as the thing, not a box with a label; its root marked `data-object`
- [ ] Checked against every habit in `references/habits.md`
