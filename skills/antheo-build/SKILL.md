---
name: antheo-build
description: Starts any UI request (a component, a screen, a page, a screenshot or Figma frame to match, or variants to compare). It gives the build one designed style block to paste (colours, surfaces, a small type scale, three corner sizes, spacing, control heights) in one of four looks (Quiet by default; Studio, Editorial or Playful only when the request asks for one) and the usage rules that keep the result compact and quiet, with few text sizes, two weights, cards without outlines, almost no dividers or tags, colour only for "on" states, and nothing the request didn't name. Use whenever asked to build, design, redesign or "make it look good".
---

# Antheo Build

Clean is not a feeling, it is counts: few text sizes, two weights, three corner sizes, almost no lines, almost no
colour, and everything the person needs on the first screen. A build looks generated when its styles are invented as
it goes, so every build starts from one designed style block and stays inside it. The order, in every Antheo skill:
the "always" list, then the person's direction or reference, then the project's own system, then the look.

## What always holds, and the four looks

**Always, in any style:** the person's task is clear and can be finished; every control works and every state is
reachable; keyboard, names, contrast, targets and zoom hold (**antheo-access**); real content survives every width and
both themes; the project's existing system, components and contracts are kept; nothing is invented; and every claim
comes with the check that shows it, with what wasn't checked said as unchecked.

**The look** is the style block and the rules below. **Quiet** is the default, for any new product with no system of
its own. **Studio** (a dense pro tool), **Editorial** (pages people read) and **Playful** (a product meant to be
enjoyed) are chosen only when the request asks for one or clearly is one; never ask, never switch for variety
(`references/looks.md`: the cues, what each changes, a finished page each). Every look keeps every rule, but for the
one exception it names (Studio: a hairline between panes; Editorial: serif headings). The look
gives way to the person's explicit direction or a reference they praise (**antheo-direction**) and to the project's
own tokens (**antheo-system**); then its numbers are choices to judge on their own terms, checked with the gate's
`--preset none`, which keeps every universal check.

Every number below is a **house default** unless it says otherwise; what never bends, what is guidance and what is
an experiment: `references/rules.md`.

**Parts and objects.** The look is for **parts**: fields, menus, lists, tables, tabs. An **object** (a bank card, a
dial, a radio tuner, a ticket) is drawn as the thing, with its own material inside its edge (antheo-surface
`references/objects.md`); a grey box with a label where the thing should be is its commonest failure.

## Match the person

Change the depth, never the quality: someone new gets the sensible default in plain words, a senior the constraints
and the evidence (`references/people.md`). Ask only when the answer would change what gets built. Say which part of a
choice is this style's default and which is true in any style.

## Correct is the floor; aim higher

Every check proves nothing is broken; none proves the work is good. For anything meant to be kept, do the ten steps in
`references/aim-higher.md`: one thing at a time; start from a reference; three directions before detail when the look
is open; the main thing first, in its smallest true setting, on a stage that hugs it; film every motion; put it beside
the reference, zoomed (`beside.mjs`), two or three rounds; give a still its implied life (**antheo-creative**); every
control does something; most effort on the thing, not the notes; say honestly where it stands.

## 1. Paste the style block first

Paste `references/quiet.css` whole, as the first CSS, and load its font; for Studio, Editorial or Playful, paste that
look's file from `references/looks/` right after it. Then **every** colour, font size, line height, weight, radius,
shadow and control height is a `var(--…)` from the block: no hex, no `px` font size, no new radius (allowed literals:
`0`, `1px`, `2px`, `100%`, widths, and a drawn object's own colours defined once on its root). A second typeface sets
its own `font-size-adjust` (**antheo-type**). A project with its own tokens uses them as the block (**antheo-system**).
In a framework, load it once, globally, first (`references/stacks.md`).

```
--bg --surface --raised --well --hover --line      the page, cards, white controls, fields, hover, a hairline
--text --text-2 --text-3 --primary --accent --danger   main text, help, icons, the filled button, "on", danger
--accent-soft --accent-text                        a highlight tag: the saving, the recommended plan
--t-meta 12 · --t-body 13 · --t-title 15 · --t-page 20 · --t-num 28 · --t-display 36   (px at a 16px root; set in rem; each with --l-* and --k-*)
--w-text 450 · --w-strong 550                      the only two weights
--r-tag 4 · --r-control 6 · --r-card 10 · --r-full the only corners
--sh-control --sh-card --sh-lift --sh-dialog       the only shadows
--h-control 32 · --h-cta 36 · --h-row 40 · --pad-card 20 · --gap-section 32
--dur-fast 150ms · --dur-base 200ms · --ease-out   the motion variables (antheo-motion's recipes read them)
.card  .field  .btn  .btn-primary  .btn-quiet  .chip  .tag  .tag-accent  .switch  .seg  dialog  a
.t-meta  .t-title  .t-page  .t-num  .t-display  .muted
```

The numbers are Quiet's; a look file changes some of them and keeps every name.

## 2. The usage rules

Each with its limits; `references/rules.md` has each one whole, with its edge cases. Read it once before a screen.

1. **Few sizes.** At most four text sizes on an app screen (meta, body, title, page); a data screen may add `--t-num`
   for its key figures; a marketing section at most five (adds num and display). Nothing above `--t-page` in an app
   but those figures.
2. **Two weights.** `--w-text` for text and prices, `--w-strong` for titles, labels and buttons. Never 600 or 700.
3. **Headlines sit tight.** A marketing headline is `--t-display`, one colour, nine words and two lines at most; an app
   page title `--t-page`; card, plan and section titles `--t-title`. Sentence case, no trailing full stop, no italics or
   capitals for emphasis; one page title, and it names the task.
4. **Cards have no outline.** `.card`: the surface, a faint edge, a soft drop. Never a visible or coloured border, never
   a card in a card.
5. **Almost no lines.** A hairline only between repeating rows of a list or table (in Studio, also between panes);
   a sticky bar takes one only once content scrolls under it.
6. **Three corners.** `--r-card` for cards, dialogs, menus, tables; `--r-control` for buttons, fields, chips; `--r-tag`
   for tags and the logo tile. Fully round only for switches, avatars and a segmented control. No pill buttons.
7. **Tags are rare, so they count.** One per card, two per screen. The one thing to notice is a `.tag-accent`; anything
   else is the neutral `.tag`; a role, a count or a status in a table is a word, not a pill.
8. **Colour means "on" or "look here".** `--accent` only on what is on or chosen and the highlight tags: four accent
   things a screen at most, one hue. A link is the text colour with a thin underline. Logo, icons, ticks, avatars and
   headings stay neutral; `--danger` only on a destructive action and an error.
9. **One primary action.** One `.btn-primary`, after what it acts on, always enabled (while sending it keeps focus with
   `aria-disabled="true"` and ignores a second press). A recommended plan: its filled button, a `.tag-accent` and
   `--sh-lift`, at its neighbours' size.
10. **Fields are wells.** `.field`, its label above (`--t-body`, `--w-strong`, 6px apart); a helper line only for a
    constraint or a consequence (`--t-meta`, `--text-2`, 4px under); an error is the red inner edge and a message that
    names the fix (antheo-writing).
11. **Chrome only as named.** A section or a component gets no header, footer or navigation. An app page gets one
    `--h-bar` bar: a neutral logo tile (20px, `--primary`, `--r-tag`, a one-shape mark), the product name and the one
    context named. No sidebar unless the request lists destinations; no avatar, "Log in" or links nobody named.
12. **Only what was asked.** No invented data, features, panels or copy; a sub-line only if it adds something, 12 words
    at most; the same feature count in every plan. A component's demo setting is not invented chrome.
13. **Compact, with rhythm.** `--h-control`, `--h-row`, `--pad-card`, `--gap-section`; more space above a title than
    below. At 1280×800 the main task fits the first screen; to make it fit, tighten gaps, then padding, then the space
    above the title, never heights or text sizes.
14. **Widths.** A form `--w-form`, settings `--w-settings`, a pricing row `--w-pricing`, data `--w-data`, centred.
    Fields that belong together share a row. A block narrower than its column takes the column's width, unless it is
    alone on the page.
15. **One edge, matching siblings.** One left edge in the column for what is read; buttons go where the eye ends (a
    stacked form's on the fields' left edge; a card's, a wide dialog's or a switch list's at the end, main one last);
    the bar on the window gutter; cards in a row match in size, padding, order and button side; controls in a row
    share a height; a grid has one gap both ways.
16. **Two text tones.** `--text` for values, titles and labels; `--text-2` for descriptions, meta and placeholders;
    `--text-3` only for icons and ticks.
17. **A unit stays with its number:** on its baseline, 6px after it, `--t-body` `--text-2`, one line. A discount keeps
    the original's precision (9.99 → 7.99), never a computed 9.60.
18. **Every state on the same layout,** one made-up person throughout, no placeholder text. A state opened by a URL
    holds until dismissed. Done says the past tense of its verb ("Saved") and what changed; loading swaps the label in
    place; nothing covers content, breaks a word or jumps; a removed row closes smoothly (antheo-motion recipe 37).
19. **Icons are few and grey:** 16px, 1.5 stroke, `--text-3`, for navigation, a named icon-only button and list ticks.
    No decorative icon in a primary button; a spinner and a done check are states (antheo-components).
20. **Count before done.** In the 1280px screenshots, light and dark: text sizes, weights, corners, accent things,
    tags, hairlines, each within these limits, and the main task on the first screen. A score is not a look.
21. **Arm the gate, and pass it.** At the start, `gate.mjs arm <page> --copy <source>` (`--preset studio`, `editorial`
    or `playful` for a look, `none` for the project's own system, `--landing` for a landing page, `--ref` for
    references); before done, `gate.mjs check` says PASS, or DONE, UNRESOLVED told to the person (antheo-review
    `references/gate.md`). When exploring a throwaway sketch or early direction, skip the gate until the person picks
    one to keep, then arm it before calling the build done. A PASS is the floor.

## 3. Then the screen's pattern card

One card in antheo-layout `references/screens/` (`pricing.md`, `settings.md`, `sign-up.md`, `list.md`): the regions
in block variables and what is **not** there. Other screens: `references/screens.md`.

## Read another skill only when its job comes up

| When | Read |
|---|---|
| A single component for a library; a table or chart | **antheo-components**, **antheo-data** |
| A component that is a physical thing (a card, a dial, a knob) | **antheo-surface** `references/objects.md` |
| It should be fun, playful or surprising to use | **antheo-creative** |
| It will be used on a phone | **antheo-mobile** |
| Wording errors, confirms, empty states | **antheo-writing** |
| Something opens, closes or moves | **antheo-motion** |
| A custom control (not a native element) | **antheo-access** |
| A new brand colour or typeface for the block | **antheo-tokens** (`block.mjs`, with `--look` for a look) |
| Any landing, company or product page | **antheo-direction** `references/landing.md`, **antheo-writing** `references/marketing.md` |
| An expressive page the person asked for ("bold", "distinctive", a campaign) | **antheo-direction**, and **antheo-moment** for one rare peak |
| Before shipping | **antheo-review** |

An opinion goes to **antheo-critique**, "how was this made" to **antheo-explain**, a whole app's motion to
**antheo-motion-audit**, an app that already has a look to **antheo-system**.

## Four lines before any code

```
Job:      what the person gets done here
Content:  exactly what the request names, with believable values
States:   every state it must show
Style:    Antheo Quiet (or Studio, Editorial, Playful, from the request) pasted; pattern card read
```

## From a design, variants and corrections

A Figma frame, export or screenshot: measure, don't guess (`references/from-design.md`: map every value to the
project's within 2px or ΔE 2, build only what is drawn, compare with `pixdiff.mjs`). Variants: one question, three
versions on its axis, on the real page (`references/variants.md`, `scripts/variant-bar.js`). A correction from the
person: make it, then record it with **antheo-system** (`design/taste.md`). Habits to catch in yourself:
`references/habits.md`.

## Done

- [ ] The style block (and the chosen look) pasted; nothing outside it but a drawn object's own colours
- [ ] Within the limits: 4 text sizes (5 in a marketing section), 2 weights, 3 corners, no outlined cards, hairlines
      only between rows, 2 tags, 4 accent things
- [ ] Nothing the request didn't name; the main task fits 1280×800; every state on the same layout, one person
- [ ] Screenshots opened and counted, light and dark, at 390 and 1280px; every control pressed; the console clean
- [ ] Anything meant to be kept: built one at a time from a reference, put beside it zoomed, every motion filmed
- [ ] An object drawn as the thing, its root marked `data-object`; a component's page shows it first, on a stage that hugs it
- [ ] The gate armed and passed; checked against every habit in `references/habits.md`

## Files

- `references/quiet.css` the block; `references/looks.md` and `references/looks/` the other three looks and a page each
- `references/rules.md` the rules in full; `references/aim-higher.md` the ten steps; `references/people.md` depth by person
- `references/from-design.md`, `references/variants.md`, `references/stacks.md` (React, Vue, Tailwind, shadcn, templates)
- `references/examples.md` what goes wrong and the fix; `references/habits.md` habits to catch in yourself
- `references/pages/` ten finished Quiet pages; open the nearest one when unsure how the rules look together
