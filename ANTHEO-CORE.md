<!-- Generated from the Antheo skills by scripts/build-core.mjs. Don't edit: change the skills and rebuild. -->
# Antheo core

The core of the Antheo design skills in one file, for an agent or tool that doesn't load skills: paste it into your
rules (Cursor, Aider, a system prompt). It holds the style block, the rules every build follows, the traps that
matter most and the gate. The full set, with colour, type, motion, access, data and the rest, is at
https://github.com/antheo-design/skills.

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
6. **Put it beside the reference, zoomed,** and name what is missing (light, a detail, proportion, how it moves).
   Measure a few ratios in both (an icon to its button, a figure to its card) and match them; copy its one or two
   signature details exactly (drawn edges on 3D type, the gloss strip on candy). Fix, and look again. Two or three of
   these rounds is where quality comes from.
7. **Go past a still.** A still reference shows the thing at rest, never its life. Design what it implies, from how
   the real thing behaves: every control answers its press, every change of state moves (values roll, panels slide,
   a needle settles), the object has an idle life if the real one does, and the main action gets one bigger beat.
   Then film it.
8. **Every control does something,** in a demo too: a button with nothing behind it at least shows its result
   ("Opened the readers report"). The access probe presses each one and reports those that answer with nothing.
9. **Say honestly where it stands:** what passed, what was compared, and what still falls short of the reference.

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
    (`gate.mjs arm <url-or-file> --copy <source folder>`, plus `--preset none` when the project has its own system);
    before saying done, `gate.mjs check` must say PASS, or after three rounds DONE, UNRESOLVED with what is left, told
    to the person. How much to check beyond the gate depends on the size of the change (antheo-review, "How much to
    check"). Setup for each agent: antheo-review `references/gate.md`. A PASS is the floor, not the finish: it says
    nothing measured is broken, never that the work is good ("Correct is the floor; aim higher").

## The traps that look finished and break in use

| ID | Trap | Spot it | Fix |
|---|---|---|---|
| F2 | Submit disabled until the form is valid, so people can't find out what's missing | `disabled={!isValid}` | always pressable; on press, show each error next to its field and focus the first |
| F3 | Errors shown while someone is still typing their first attempt | validation on `input` before the first blur | validate on blur, then live once a field has shown an error |
| F4 | What was typed is lost after a failed request | the form resets in the error branch | keep every value; only clear on success |
| L2 | A dialog is rendered conditionally, so it can't animate out and loses its scroll and form state | `{open && <Dialog/>}` | keep it mounted (`<dialog>` with `open`/`close()`, or an exit state) and let it animate out |
| S1 | Hovering a focused control hides its focus ring | `:hover` rule after `:focus-visible` that resets `outline` or `box-shadow` | order rules default → hover → focus-visible → active → invalid → disabled; hover never touches the ring |
| S6 | A loading button changes width and the layout jumps | label replaced by a spinner alone | keep the width (its rest width as `min-width`); the label becomes the -ing form ("Sending…") with a spinner before it |
| S7 | A selected state shown by color alone | only `background` changes | add a check, weight, underline or icon |
| S8 | A focused control in error loses its focus ring | the `[aria-invalid]` shadow replaces the focus shadow | a combined rule: `[aria-invalid="true"]:focus-visible` draws both |
| S10 | Something appears or disappears and moves what is under the pointer: an error cleared on blur pulls the next checkbox up as it is clicked; a hint shown on focus pushes the button down | messages added or removed on `blur` or `focus`; nothing reserves their room | clear errors while typing, not on blur; give lines that come and go a reserved line or animate their height; never re-flow on pointer-down |
| D4 | Empty, loading and error look the same (a blank area) | one `if (!data)` branch | three branches with their own design (antheo-components `references/states.md`) |

## Done means checked

With the full skills installed, the gate checks the page in a real browser and the words in the source, and keeps
the work open until both pass:

```sh
node <antheo-review>/scripts/gate.mjs arm http://localhost:5173/ --copy src
node <antheo-review>/scripts/gate.mjs check     # PASS, or what to fix
node <antheo-review>/scripts/gate.mjs rearm     # after any later change, then check again
```

Without it: open the page at 390 and 1280px, light and dark, count text sizes, weights, corners, accent things, tags
and hairlines against the rules above, press every control, and read the console.

## The style block: references/quiet.css

```css
/* Antheo Quiet v1: the style block every build starts from. Paste it whole as the first CSS.
   After it, write no colour, font size, line height, weight, radius, shadow or control height that is not a var(--…).
   Font (one family, a variable weight axis so nothing is faked bold):
   <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..600&display=swap" rel="stylesheet"> */
:root {
  color-scheme: light dark;

  /* Neutrals: one warm grey, almost no chroma. bg = the page, surface = cards and dialogs,
     raised = white controls, well = fields and tracks. */
  --bg:       oklch(0.976 0.002 80);
  --surface:  oklch(1 0 0);
  --raised:   oklch(1 0 0);
  --well:     oklch(0.958 0.003 80);
  --hover:    oklch(0.948 0.003 80);
  --selected: oklch(0.928 0.004 80);
  --line:     oklch(0.912 0.004 80);       /* a hairline: between repeating rows and in tables, nowhere else */
  --text:     oklch(0.215 0.006 80);       /* titles, values, labels, the primary button */
  --text-2:   oklch(0.475 0.008 80);       /* descriptions, help, meta */
  --text-3:   oklch(0.6 0.008 80);         /* icons, ticks, placeholders, an off track: never text a person must read */
  --primary:  var(--text);
  --on-primary: var(--surface);

  /* One accent, for "on" states only. Change the hue per product; keep the lightness and chroma. */
  --accent:    oklch(0.55 0.12 160);
  --on-accent: oklch(1 0 0);
  --accent-soft: oklch(0.95 0.035 160);    /* the fill of a highlight tag */
  --accent-text: oklch(0.4 0.09 160);      /* its text */
  --danger:    oklch(0.53 0.17 27);
  --success:   oklch(0.5 0.11 155);
  --warning:   oklch(0.52 0.11 75);        /* status only, always with its word */
  --focus:     var(--text-2);

  /* Edges and shadows. A card is never outlined: it is a surface with a faint edge and a soft drop. */
  --ink: 0.215 0.006 80;
  --edge:       0 0 0 1px oklch(var(--ink) / 0.055);
  --sh-control: 0 0 0 1px oklch(var(--ink) / 0.09), 0 1px 1px oklch(var(--ink) / 0.06);
  --sh-card:    var(--edge), 0 1px 2px oklch(var(--ink) / 0.05), 0 2px 8px -2px oklch(var(--ink) / 0.06);
  --sh-lift:    var(--edge), 0 2px 4px -1px oklch(var(--ink) / 0.06), 0 8px 16px -6px oklch(var(--ink) / 0.1);
  --sh-dialog:  var(--edge), 0 4px 8px -2px oklch(var(--ink) / 0.08), 0 16px 32px -8px oklch(var(--ink) / 0.18);
  --well-edge:  inset 0 0 0 1px oklch(var(--ink) / 0.06);
  --backdrop:   oklch(0.2 0.006 80 / 0.32);
  --wash:       oklch(var(--ink) / 0.05);  /* laid over any fill on hover, when the fill itself must stay */

  /* Type: six sizes exist, a screen uses four or five. Two weights. */
  --font: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --w-text: 450;
  --w-strong: 550;
  --t-meta: 12px;    --l-meta: 16px;    --k-meta: 0em;       /* help, footnotes, table headers */
  --t-body: 13px;    --l-body: 20px;    --k-body: 0em;       /* everything read or pressed */
  --t-title: 15px;   --l-title: 22px;   --k-title: -0.01em;  /* a card, plan, dialog or section title */
  --t-page: 20px;    --l-page: 28px;    --k-page: -0.015em;  /* an app page's title: the largest text in an app */
  --t-num: 28px;     --l-num: 32px;     --k-num: -0.02em;    /* a price or key figure */
  --t-display: 36px; --l-display: 40px; --k-display: -0.025em; /* a marketing headline: the largest text anywhere */
  --t-field: 13px;

  /* Shape: three corner sizes. */
  --r-tag: 4px; --r-control: 6px; --r-card: 10px; --r-sheet: 14px; --r-full: 999px;

  /* Space: a 4px grid. */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px; --s-6: 24px;
  --s-8: 32px; --s-10: 40px; --s-12: 48px; --s-16: 64px; --s-24: 96px;
  --pad-card: 20px; --gap-section: 32px; --gutter: 24px;
  /* Gaps by role: a label to its control, an icon to its label, items in a list, one field to the next, one group to the next. */
  --gap-label: 6px; --gap-inline: var(--s-2); --gap-item: var(--s-3); --gap-field: var(--s-4); --gap-group: var(--s-6);

  /* Sizes. */
  --h-control: 32px; --h-small: 28px; --h-cta: 36px; --h-row: 40px; --h-tag: 20px; --h-bar: 48px;
  --sw-w: 32px; --sw-h: 20px; --sw-knob: 16px; --sw-knob-fill: oklch(1 0 0);
  --w-form: 400px; --w-settings: 680px; --w-pricing: 1040px; --w-data: 1120px;
  --measure: 65ch;                           /* the longest line of running text */
  /* A whole marketing page only: its container and the space between its sections. */
  --page-max: var(--w-data); --page-wide: 1440px; --section: clamp(64px, 8vw, 96px); --section-dense: var(--s-12);

  /* Motion: every duration, easing, distance and scale a transition may use (antheo-motion's recipes read these).
     Presses 100ms, hovers and small changes 150ms, things that open 200 to 250ms and leave faster; nothing over 400ms. */
  --dur-instant: 100ms; --dur-fast: 150ms; --dur-base: 200ms; --dur-open: 250ms; --dur-slow: 300ms; --dur-page: 400ms;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* anything arriving or answering a press */
  --ease-in: cubic-bezier(0.55, 0, 1, 0.45);       /* only for something leaving the screen for good */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* something moving from one place on screen to another */
  --ease-spring: linear(0, 0.0253, 0.0864, 0.1667, 0.2549, 0.344, 0.4294, 0.5085, 0.5801, 0.6437, 0.6995, 0.7478, 0.7892, 0.8245, 0.8544, 0.8796, 0.9007, 0.9183, 0.9329, 0.9451, 0.9551, 0.9633, 0.9701, 0.9757, 0.9802, 0.984, 0.987, 0.9895, 0.9915, 0.9931, 0.9944, 0.9955, 1);
  --dur-spring: 400ms;
  --ease-move: var(--ease-out);
  --dist-xs: 4px; --dist-sm: 8px; --dist-md: 12px; --dist-lg: 24px;
  --scale-press: 0.97; --scale-pop: 0.96; --scale-tip: 0.98; --scale-leave: 0.98;
  --blur-xs: 2px; --blur-sm: 4px; --blur-md: 8px;
  --z-sticky: 10; --z-dropdown: 20; --z-overlay: 30; --z-modal: 40; --z-toast: 50;   /* the only layers; never 9999 */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: oklch(0.145 0.003 80); --surface: oklch(0.19 0.004 80); --raised: oklch(0.235 0.004 80);
    --well: oklch(0.225 0.004 80); --hover: oklch(0.235 0.004 80); --selected: oklch(0.265 0.005 80);
    --line: oklch(0.27 0.004 80); --text: oklch(0.95 0.003 80); --text-2: oklch(0.73 0.006 80);
    --text-3: oklch(0.58 0.006 80); --on-primary: oklch(0.17 0.004 80);
    --accent: oklch(0.72 0.12 160); --on-accent: oklch(0.17 0.004 80);
    --accent-soft: oklch(0.27 0.045 160); --accent-text: oklch(0.84 0.1 160);
    --danger: oklch(0.72 0.14 27); --success: oklch(0.74 0.11 155); --warning: oklch(0.78 0.12 80);
    /* in dark, height is a lighter fill and a faint light edge; drops only under menus, dialogs and a lifted card */
    --edge: 0 0 0 1px oklch(1 0 0 / 0.06);
    --sh-control: 0 0 0 1px oklch(1 0 0 / 0.08), 0 1px 1px oklch(0 0 0 / 0.4);
    --sh-card: var(--edge);
    --sh-lift: 0 0 0 1px oklch(1 0 0 / 0.09), 0 8px 20px -8px oklch(0 0 0 / 0.6);
    --sh-dialog: 0 0 0 1px oklch(1 0 0 / 0.09), 0 16px 40px -8px oklch(0 0 0 / 0.7);
    --well-edge: inset 0 0 0 1px oklch(1 0 0 / 0.05);
    --backdrop: oklch(0 0 0 / 0.6); --wash: oklch(1 0 0 / 0.06);
  }
}

/* Phones: only these values change; nothing else in a build is re-sized by hand. */
@media (max-width: 47.99rem) {
  :root {
    --t-meta: 13px; --l-meta: 18px; --t-body: 15px; --l-body: 22px; --t-title: 17px; --l-title: 24px;
    --t-page: 22px; --l-page: 28px; --t-display: 28px; --l-display: 32px;
    --h-control: 44px; --h-small: 36px; --h-cta: 44px; --h-row: 52px; --pad-card: 16px; --gutter: 16px;
    --sw-w: 44px; --sw-h: 26px; --sw-knob: 22px;
  }
}
@media (pointer: coarse) { :root { --t-field: 16px; } }

/* One theme for one part of the page, whatever the system's: put data-theme="dark" or "light" on any element (the
   page, a card, one half of a side-by-side). Everything inside follows. */
[data-theme="dark"] {
  color-scheme: dark;
  /* names that point at other names resolve where they are declared, so a themed part declares them again */
  --primary: var(--text); --focus: var(--text-2);
  --bg: oklch(0.145 0.003 80); --surface: oklch(0.19 0.004 80); --raised: oklch(0.235 0.004 80);
  --well: oklch(0.225 0.004 80); --hover: oklch(0.235 0.004 80); --selected: oklch(0.265 0.005 80);
  --line: oklch(0.27 0.004 80); --text: oklch(0.95 0.003 80); --text-2: oklch(0.73 0.006 80);
  --text-3: oklch(0.58 0.006 80); --on-primary: oklch(0.17 0.004 80);
  --accent: oklch(0.72 0.12 160); --on-accent: oklch(0.17 0.004 80);
  --accent-soft: oklch(0.27 0.045 160); --accent-text: oklch(0.84 0.1 160);
  --danger: oklch(0.72 0.14 27); --success: oklch(0.74 0.11 155); --warning: oklch(0.78 0.12 80);
  --edge: 0 0 0 1px oklch(1 0 0 / 0.06);
  --sh-control: 0 0 0 1px oklch(1 0 0 / 0.08), 0 1px 1px oklch(0 0 0 / 0.4);
  --sh-card: var(--edge);
  --sh-lift: 0 0 0 1px oklch(1 0 0 / 0.09), 0 8px 20px -8px oklch(0 0 0 / 0.6);
  --sh-dialog: 0 0 0 1px oklch(1 0 0 / 0.09), 0 16px 40px -8px oklch(0 0 0 / 0.7);
  --well-edge: inset 0 0 0 1px oklch(1 0 0 / 0.05);
  --backdrop: oklch(0 0 0 / 0.6); --wash: oklch(1 0 0 / 0.06);
}
[data-theme="light"] {
  color-scheme: light;
  --primary: var(--text); --focus: var(--text-2);
  --bg: oklch(0.976 0.002 80); --surface: oklch(1 0 0); --raised: oklch(1 0 0);
  --well: oklch(0.958 0.003 80); --hover: oklch(0.948 0.003 80); --selected: oklch(0.928 0.004 80);
  --line: oklch(0.912 0.004 80); --text: oklch(0.215 0.006 80); --text-2: oklch(0.475 0.008 80);
  --text-3: oklch(0.6 0.008 80); --on-primary: oklch(1 0 0);
  --accent: oklch(0.55 0.12 160); --on-accent: oklch(1 0 0);
  --accent-soft: oklch(0.95 0.035 160); --accent-text: oklch(0.4 0.09 160);
  --danger: oklch(0.53 0.17 27); --success: oklch(0.5 0.11 155); --warning: oklch(0.52 0.11 75);
  --edge: 0 0 0 1px oklch(var(--ink) / 0.055);
  --sh-control: 0 0 0 1px oklch(var(--ink) / 0.09), 0 1px 1px oklch(var(--ink) / 0.06);
  --sh-card: var(--edge), 0 1px 2px oklch(var(--ink) / 0.05), 0 2px 8px -2px oklch(var(--ink) / 0.06);
  --sh-lift: var(--edge), 0 2px 4px -1px oklch(var(--ink) / 0.06), 0 8px 16px -6px oklch(var(--ink) / 0.1);
  --sh-dialog: var(--edge), 0 4px 8px -2px oklch(var(--ink) / 0.08), 0 16px 32px -8px oklch(var(--ink) / 0.18);
  --well-edge: inset 0 0 0 1px oklch(var(--ink) / 0.06);
  --backdrop: oklch(0.2 0.006 80 / 0.32); --wash: oklch(var(--ink) / 0.05);
}
/* a themed part draws its own ground and text, so it reads as that theme */
:where([data-theme]):not(html) { background: var(--bg); color: var(--text); }

/* Base: the only element rules every build gets. */
*, *::before, *::after { box-sizing: border-box; }
/* font-size-adjust: Geist's x-height is 0.53 of its size. Naming it makes every fallback (the system font while
   Geist loads, a glyph Geist lacks, the mono face) draw at the same x-height, so text never changes size when the
   font arrives. A different typeface needs its own number (antheo-type). */
html { background: var(--bg); -webkit-text-size-adjust: 100%; text-size-adjust: 100%; font-size-adjust: 0.53; accent-color: var(--accent); }
::selection { background: color-mix(in oklch, var(--accent) 22%, transparent); }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: var(--w-text) var(--t-body) / var(--l-body) var(--font); letter-spacing: var(--k-body);
  -webkit-font-smoothing: antialiased; font-synthesis: none;
}
h1, h2, h3 { margin: 0; font-weight: var(--w-strong); text-wrap: balance; }
p { margin: 0; text-wrap: pretty; }
button, input, select, textarea { font: inherit; color: inherit; letter-spacing: inherit; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
/* The one link style: the text colour with a thin underline. Every link on a screen looks like this. */
a { color: inherit; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.18em; text-decoration-color: var(--text-3); transition: text-decoration-color var(--dur-fast) var(--ease-out); }
@media (hover: hover) and (pointer: fine) { a:hover { text-decoration-color: currentColor; } }

.t-meta    { font-size: var(--t-meta); line-height: var(--l-meta); letter-spacing: var(--k-meta); }
.t-title   { font-size: var(--t-title); line-height: var(--l-title); letter-spacing: var(--k-title); font-weight: var(--w-strong); }
.t-page    { font-size: var(--t-page); line-height: var(--l-page); letter-spacing: var(--k-page); font-weight: var(--w-strong); }
.t-num     { font-size: var(--t-num); line-height: var(--l-num); letter-spacing: var(--k-num); font-variant-numeric: tabular-nums; }
.t-display { font-size: var(--t-display); line-height: var(--l-display); letter-spacing: var(--k-display); font-weight: var(--w-strong); }
.muted { color: var(--text-2); }

.card { background: var(--surface); border: 1px solid transparent; border-radius: var(--r-card); box-shadow: var(--sh-card); padding: var(--pad-card); }
.field {
  height: var(--h-control); width: 100%; padding: 0 var(--s-3); border: 1px solid transparent; border-radius: var(--r-control);
  background: var(--well); box-shadow: var(--well-edge); font-size: var(--t-field);
}
.field:focus-visible { outline: 2px solid transparent; outline-offset: 2px; box-shadow: var(--well-edge), 0 0 0 2px var(--focus); } /* the transparent border and outline turn visible in forced colours, where shadows are dropped */
.field[aria-invalid="true"] { box-shadow: inset 0 0 0 1px var(--danger); }
.field[aria-invalid="true"]:focus-visible { box-shadow: inset 0 0 0 1px var(--danger), 0 0 0 2px var(--focus); } /* in error and focused: both */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--s-2);
  height: var(--h-control); padding: 0 var(--s-3); border: 1px solid transparent; border-radius: var(--r-control);
  background: var(--raised); box-shadow: var(--sh-control); font-weight: var(--w-strong); white-space: nowrap; cursor: pointer;
  transition: scale var(--dur-instant) var(--ease-out), background-color var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) { .btn:hover { background: var(--hover); } .btn-primary:hover { background: var(--primary); opacity: 0.9; } }
.btn:active { scale: var(--scale-press); }
.btn:disabled, .btn[aria-disabled="true"] { cursor: not-allowed; scale: 1; }
.btn-primary { background: var(--primary); color: var(--on-primary); box-shadow: none; }
.tag {
  display: inline-flex; align-items: center; height: var(--h-tag); padding: 0 6px; border-radius: var(--r-tag);
  background: var(--well); color: var(--text-2); font-size: var(--t-meta); line-height: var(--l-meta);
}
.tag-accent { background: var(--accent-soft); color: var(--accent-text); font-weight: var(--w-strong); } /* the one thing to notice: a saving, the recommended plan */
/* A button with no chrome: a row action, "Show", a close button. Use with .btn; add .icon for a square one. */
.btn-quiet { background: transparent; box-shadow: none; color: var(--text-2); }
.btn-quiet.icon { width: var(--h-small); height: var(--h-small); padding: 0; color: var(--text-3); }
/* A switch: <button class="switch" role="switch" aria-checked="true">. It applies at once; no "On" or "Off" text. */
.switch {
  position: relative; flex: none; width: var(--sw-w); height: var(--sw-h); padding: 0; border: 0; border-radius: var(--r-full);
  background: var(--text-3); cursor: pointer; transition: background-color var(--dur-fast) var(--ease-out);
}
.switch::after {
  content: ""; position: absolute; inset-block-start: 2px; inset-inline-start: 2px; width: var(--sw-knob); height: var(--sw-knob);
  border-radius: var(--r-full); background: var(--sw-knob-fill); box-shadow: 0 1px 2px oklch(0 0 0 / 0.2);
  transition: translate var(--dur-fast) var(--ease-out), scale var(--dur-instant) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) { .switch:hover { background-image: linear-gradient(var(--wash), var(--wash)); } }
.switch:active::after { scale: 0.9; }
.switch[aria-checked="true"] { background-color: var(--accent); } /* the colour only: the shorthand would wipe the hover wash */
/* forced colours drop fills and shadows: a transparent outline turns into the system's edge, and "on" takes the system
   highlight, so a switch or a chosen segment stays visible (not while focused, so the focus ring wins) */
.switch:not(:focus-visible), .seg > button:not(:focus-visible) { outline: 1px solid transparent; outline-offset: -1px; }
@media (forced-colors: active) {
  .switch[aria-checked="true"], .seg > button[aria-checked="true"] { background-color: Highlight; color: HighlightText; }
  .switch::after { background: CanvasText; }
  .switch[aria-checked="true"]::after { background: HighlightText; }
}
.switch[aria-checked="true"]::after { translate: calc(var(--sw-w) - var(--sw-knob) - 4px) 0; }
.switch[aria-checked="true"]:dir(rtl)::after { translate: calc(-1 * (var(--sw-w) - var(--sw-knob) - 4px)) 0; }
/* A segmented control: <div class="seg" role="radiogroup"> of <button role="radio" aria-checked>. Labels only inside.
   The chosen one is raised in place; a fill that slides between them is optional (antheo-motion recipe 36). */
.seg { display: inline-grid; grid-auto-flow: column; grid-auto-columns: 1fr; padding: 2px; border-radius: var(--r-full); background: var(--well); box-shadow: var(--well-edge); }
.seg > button {
  height: calc(var(--h-control) - 4px); padding: 0 var(--s-4); border: 0; border-radius: var(--r-full); background: transparent;
  color: var(--text-2); font-weight: var(--w-strong); white-space: nowrap; cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.seg > button[aria-checked="true"] { background: var(--raised); color: var(--text); box-shadow: var(--sh-control); }
@media (hover: hover) and (pointer: fine) { .seg > button:hover { color: var(--text); } }
.seg > button:active { scale: var(--scale-press); }
/* A dialog: the native element, opened with showModal(). On a phone it is a sheet on the bottom edge. */
dialog {
  width: min(var(--w-form), 100% - 2 * var(--gutter)); max-height: calc(100dvh - 2 * var(--gutter)); overflow: auto; padding: var(--s-6);
  border: 1px solid transparent; border-radius: var(--r-card); background: var(--surface); color: var(--text); box-shadow: var(--sh-dialog);
  opacity: 0; scale: var(--scale-pop);
  transition: opacity var(--dur-fast) var(--ease-out), scale var(--dur-fast) var(--ease-out), translate var(--dur-fast) var(--ease-out),
    overlay var(--dur-fast) allow-discrete, display var(--dur-fast) allow-discrete;
}
dialog[open] { opacity: 1; scale: 1; transition-duration: var(--dur-base); }
@starting-style { dialog[open] { opacity: 0; scale: var(--scale-pop); } }
dialog::backdrop { background: var(--backdrop); opacity: 0; transition: opacity var(--dur-base) var(--ease-out), overlay var(--dur-base) allow-discrete, display var(--dur-base) allow-discrete; }
dialog[open]::backdrop { opacity: 1; }
@starting-style { dialog[open]::backdrop { opacity: 0; } }
@media (max-width: 47.99rem) {
  dialog {
    width: 100%; max-width: 100%; margin: auto 0 0; border-radius: var(--r-sheet) var(--r-sheet) 0 0;
    padding-block-end: max(var(--s-6), env(safe-area-inset-bottom)); scale: 1; translate: 0 var(--dist-lg);
  }
  dialog[open] { translate: 0 0; }
  @starting-style { dialog[open] { scale: 1; translate: 0 var(--dist-lg); } }
}
/* Reduced motion: travel and scale go, a short fade stays. */
@media (prefers-reduced-motion: reduce) {
  :root { --dist-xs: 0px; --dist-sm: 0px; --dist-md: 0px; --dist-lg: 0px; --scale-press: 1; --scale-pop: 1; --scale-tip: 1; --scale-leave: 1; --ease-spring: var(--ease-out); }
  .btn { transition: background-color var(--dur-fast) var(--ease-out); }
}
```
