---
name: antheo-components
description: Builds and fixes single interface components (buttons, fields, menus, dialogs, tables, cards, lists) with exact sizes, every state drawn and depth from antheo-surface. Use when building or polishing a component, or when one "looks off", "looks cheap" or "feels default".
---

# Antheo Components

> **How to read this skill.** Its numbers are house defaults (antheo-build, "Four kinds of rule"): they give way to the
> person, a reference, a brand or the project's own system. What protects people (contrast, focus, targets, reduced
> motion, nothing broken) is a requirement and never bends.

A component looks designed when every value on it has a reason and every state has been seen. It looks generated
when it was assembled from defaults, and themed when it wears its subject as a costume. This skill holds the anatomy, the
measurements and the states, with the exact value each one takes.

Inside the preset the values are exact, not ranges to approximate: `32px` is not `34px`, `0.97` is not `0.95`. When the project has its
own design system or component library, its tokens and components win; the proportions and the restraint stay.

Fill, edge, drop, corners, lines and icons belong to **antheo-surface**. Colour values belong to **antheo-color**, type to **antheo-type**, token names to **antheo-tokens**. Page structure
and right-to-left layout belong to **antheo-layout**; tables and charts to **antheo-data**. Whether and how a thing
moves belongs to **antheo-motion**, and a signature moment to **antheo-moment**. Every
word belongs to **antheo-writing**; keyboard, names and hit-area minimums to **antheo-access**; the list of tells to
**antheo-direction**; measuring the result to **antheo-review**.

## Decide in this order

Most weak components start at step 5. Work down; each step limits the next.

1. **The job.** Name the one thing a person does here. That is the one primary action, or there is none.
2. **The least content that does the job.** One clear number is worth more than six small ones. A list that is a summary (a card on a
   dashboard) shows 5 to 6 rows, then "View all"; a list that is the screen's job fills the first screen (antheo-build). Leave out what is empty, finished or not relevant yet.
3. **The component.** Use the project's own first. Plain rows for lists, a card for one thing and its details, a table
   for many records, a dialog only for a focused task or a confirm.
4. **The surface.** What it sits on, then raised or sunk: decided with **antheo-surface**. A component that stands for
   a physical thing (a card, a dial, a knob) is an object, drawn as the thing (antheo-surface `references/objects.md`).
5. **Size and type.** From the tables in `references/look.md`.
6. **Every state.** Drawn and seen, not assumed.
7. **Whether it moves.** Ask antheo-motion's gate first; most things answer quickly and stop.

## Use what the project has

Restyle the project's components with its tokens; never rebuild a select it already has. With no library, pick by the
job: shadcn/ui on Radix or Base UI for React with styling control, React Aria Components for complex widgets (date
ranges, comboboxes, grids), the platform (`<dialog>`, `popover`, `<details>`, `<select>`) for plain HTML. Never two
libraries for the same kind of control on one screen.

## Quiet chrome, colour from content

A component is built from antheo-build's style block (`references/quiet.css` there), the same one a whole screen
uses: white surfaces on a near-neutral ground, two text tones, an ink primary button. Colour means "on" or "look
here" (a switch that is on, the chosen chip, one highlight tag) and otherwise comes from what is shown (a file's
kind, a status, one chart series), never from the frame. The tables are in `references/look.md`.

## Controls are 32px tall

`--h-control` (32px) is the default, `--h-small` (28px) in a dense row, `--h-cta` (36px) for a main call to
action, 44px on touch. Every control in a row shares one height. Fields are wells of the same height, with `16px`
text on touch screens so phones don't zoom.

## Equal padding, 2px less on the icon side

Inline padding is `--s-3` (12px) at every height, the same on both sides, as the block's `.btn` draws it. A leading or
trailing icon takes `2px` off its own side, because the icon's box carries its own air.

## Few actions in view

One primary and at most two or three secondary actions show; more go into one menu. A dialog is at most `100dvh`
tall with its actions outside the part that scrolls.

A close button sits alone in the card's top corner, on the end side: never squeezed into the title's row, where it
pushes the title off its line.

## One helper line, where it is needed

A control with a constraint or a consequence says it in one line under it (`--t-meta`, `--text-2`): a file button
its formats and limit ("JPG or PNG, up to 2 MB"), a password its rule, a destructive button what is lost, with
counts. Not under every control. A button never gets a label above it repeating what it says, and a primary button
carries no icon.

## Depth comes from antheo-surface

Corners, edges, drops, wells, hairlines, dark elevation and icon sizes are **antheo-surface**'s. Take them from there
for every component; never invent a shadow or radius here.

## Pressed things squeeze

`scale: 0.97` (`--scale-press`) over `100ms` (`--dur-instant`) with `--ease-out`, starting on pointer-down; `0.92` for targets of 24px, `0.99` for cards. A
disabled control never squeezes. Under reduced motion, drop the scale and keep the colour change.

## One primary per surface, filled with ink

The primary button is filled with the text colour; secondaries are raised white; tertiary actions are text. It sits
after what it acts on (a form: after the last field) and never looks disabled: keep it enabled and validate on
submit, because a grey filled button reads as broken. The one exception is a type-to-confirm delete, whose confirm
stays off until the typed name matches, with the line above it saying so (antheo-writing). A destructive trigger is the raised surface with danger-red
text; only its final confirm is filled red.

Two buttons at the foot of a card share its row at equal width, the primary at the end; a lone button takes the
whole width. Neither hugs its label in a corner.

## Text: two tones, two weights

Body, rows, labels and controls `--t-body` (13/20); help and meta `--t-meta` (12/16); a title `--t-title`
(15/22); a value that matters `--t-num` (tabular figures only when it lines up with others or ticks). `--text` and `--text-2` only; a field's label is
`--text` at `--w-strong`. Hierarchy is weight and tone, not size jumps or colour. In the Quiet preset, one grotesk
and no serif, italics or tracked uppercase inside a component; a project's own system decides otherwise.

## Nothing inside a control that isn't part of it

A badge, count, saving or "new" marker sits beside the control or under it as text, never inside a button, tab or
segment. A dot or count anchors to the trigger's corner (`inset-block-start: -4px; inset-inline-end: -4px`) and never
moves it.

## Labels stay on one line

`white-space: nowrap` in buttons, tabs and badges; if a label can't fit, the layout changes, not the label. Truncation
always has a way back (a tooltip or the detail view) and never cuts a value someone compares, such as a price or an ID.
A name or message from a person gets `dir="auto"`.

## It looks like what it does

A thing you can press looks pressable before anyone touches it, and a thing you can't, doesn't. A button has a fill
or the raised edge (`--sh-control`); a link is underlined in running text; a field is a well with its label above;
a row that opens something shows a chevron or its hover fill. Plain text never acts as a button, and a card or row
that does nothing gets no hover. Example: a "Remove" written as grey text beside a name is easy to miss; as a
`.btn` (or an icon button with its name), it is plainly a control.

## Show the choices, don't make people remember them

Put the options in front of people instead of asking them to recall them. A field that takes a known set of values
is a select, a segmented control or a list of chips, not a blank box; a search shows recent and suggested items as
soon as it opens; a command palette lists commands before anything is typed; a form keeps what was typed after an
error. Example: "Role" as a text field makes people remember and spell "Admin"; as a select with Owner, Admin,
Member, Guest, they recognise it.

## Every state, drawn

Controls: default, hover (pointer only, `@media (hover: hover) and (pointer: fine)`), focus-visible, pressed, disabled, loading, selected,
error. Data: loading (a skeleton after `200ms`), empty first use, empty no results, error with Retry, very long content,
success. Write the CSS in that order: hover never removes a focus ring, error and focus outrank hover, hover skips
disabled controls, and a control in error that has focus shows both (the danger edge and the focus ring). A loading button keeps its width and stays readable: in the preset its label turns into the -ing form of the same verb
("Sending…") with a spinner before it; a project that keeps the label and only adds the spinner is as right. Never a
spinner alone. Anything that shows a wait appears only after `200ms` and then stays at least `300ms`, so a fast answer
never flashes a loader. A selected thing is unmistakable at a glance and has a cue besides
colour. There is one answer per kind: a switch that is on takes the accent; a chosen chip is the accent fill with a
tick (`.chip`); a chosen segment is raised in place; a chosen row or option takes the `--selected` fill and a tick.
Never a faint tint alone; an unavailable one says why inside
it ("Full"), not only with a strikethrough. A choice that carries a description (an option with a line under it, a
plan card, a list choice) shows its chosen state on the whole item, a `--selected` fill across it as well as its own
dot or tick, so the choice reads before the mark is found. Disabled is the well fill with its label in `--text-2` and no shadow, as the block draws it
(an icon-only button drops to opacity `0.4`), never hidden information, with the reason nearby when it isn't obvious; a control
that must still explain itself stays focusable with `aria-disabled` instead of `disabled`. Details in
`references/states.md`.

**No two states look alike.** Put them side by side and each must be told apart at a glance, without its label:
loading keeps the ink fill, with a spinner before "Sending…" (never the same grey as disabled);
disabled is the well fill with its label in `--text-2`; done shows a check and the past tense ("Sent"); an error keeps the
button as it was and adds the red message under it with an icon. Hover and pressed differ from rest by a visible
step (a darker fill; the 97% squeeze).

**Showing every state at once** (a states sheet, a story, a spec), after the live component, never instead of it: the
component comes first at its real size, then one row per state in a single `.card`, the state's
name in `--t-meta` on the left in a fixed column, the control in the middle, and one line on the right saying what
triggers it. Hairlines between rows, no card per state. Force the pointer states with a class that copies the
`:hover` and `:active` rules (`.is-hover`, `.is-pressed`), and focus with `.is-focus` copying `:focus-visible`. A
forced state is a picture of that state, so make its row `inert`: it leaves the tab order, and a keyboard user never
lands on a control that already looks focused and changes nothing.

## It behaves like the web

- **The address holds the state.** The open tab, the filters, the sort, the page and the open item are in the URL, so
  a reload, Back and a shared link all land on the same view. State that lives only in memory is lost by all three.
- **Navigation is a link.** Anything that goes somewhere is an `<a href>`, so Cmd or Ctrl-click, middle-click and
  "open in a new tab" work. A `div` or a button with a click handler that changes the page takes those away.
- **Focus on arrival, with care.** A dialog or a single-purpose screen may focus its first field on a desktop. Never
  on touch (the keyboard opens and the page jumps), and never when there is something to read first.

## Quick to answer, one moment at most

A control answers within `100ms` and settles within `150 to 200ms`. The more often something is used, the less it moves:
a menu or palette opened all day appears at once. A component may have **one** signature moment, when the person asks for one, on its rare,
meaningful event (a code accepted, a payment sent, a file landed), built with **antheo-moment**.
Never on hover, typing or opening.

## What generated UI gets wrong here

Check each in `references/habits.md` before calling it done: half the states · one hover for everything · disabled
as lower opacity only · a placeholder as the format hint · errors on fields nobody touched · overlays built by hand
· a menu or tooltip cut off · a dialog for everything · row actions that exist only on hover · "No items" · a
control wired to nothing.

## Done

- [ ] antheo-build's fundamentals hold; the order was followed: one job, the least content, the project's own component
- [ ] Built from the style block: heights 32/28/36 (44 on touch), equal padding; depth, corners and icons from antheo-surface
- [ ] The view survives a reload and Back; everything that navigates is a real link; no loader flashes
- [ ] Two text tones, two weights, one grotesk; colour only for "on", one highlight and content
- [ ] Everything you can press looks pressable, nothing else does; known choices are shown, not typed from memory
- [ ] Every state seen in light and dark at 100% and 200% zoom, with long, empty and error content
- [ ] The traps in `references/traps.md` checked
- [ ] Keyboard and names per antheo-access; words per antheo-writing; checked with antheo-review
- [ ] Put beside the best existing component in the project: not louder, larger, browner or busier anywhere
- [ ] Checked against every habit in `references/habits.md`

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `references/look.md`: the look as tables: colour, type, size, the parts that recur
- `references/tokens.css`: how a standalone component scopes the style block under its own prefix
- `references/components.md`: 30 components, each with anatomy, states, keys and markup
- `references/states.md`: loading, empty, error, success, long content, offline, permissions
- `references/traps.md`: about 35 things that look finished in a screenshot and break in use
- `references/habits.md`: what generated UI gets wrong here, each with its fix
