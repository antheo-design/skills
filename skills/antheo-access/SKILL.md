---
name: antheo-access
description: Makes an interface usable by keyboard, screen reader, voice, touch, zoom and high contrast, to WCAG 2.2 AA, covering native elements, names, key maps, focus that shows and returns, announcements, forms, targets and reflow, proved with a keyboard probe. Use before shipping anything interactive, or for "is this accessible", focus, dialogs, forms and screen readers.
---

# Antheo Access

Accessibility is what a control is, not a layer on top: a name, a role, a state, a way to reach it and a way to see
it. Build those in while building the control, then prove them. The target is WCAG 2.2 AA, plus the cheap wins
beyond it (a thick focus ring, 44px touch targets). Contrast values belong to **antheo-color**, the reduced-motion
timing to **antheo-motion**, the words to **antheo-writing**, reflow and right-to-left to **antheo-layout**.

## A finding cites a criterion

Every finding cites a WCAG 2.2 A or AA success criterion by its number, or names a real task that someone using
assistive technology can't finish. Anything else is a recommendation, never high severity.

## Native first, ARIA last

Use the element that exists: `button` does something, `a href` goes somewhere; `input`, `select`, `textarea`,
`details`, `dialog`, `[popover]`, `fieldset`, `table`, `progress`, `meter`. ARIA only where HTML has no element for the
job (tabs, menu, combobox, tree, grid, live regions). A role is a promise: every ARIA widget works by keyboard exactly
as `references/patterns.md` says. Never `aria-hidden` or `role="presentation"` on anything focusable. No ARIA beats
bad ARIA.

## Every control has a name that contains its visible text

Name sources in order: `aria-labelledby`, `aria-label`, the native label (`<label for>`, `alt`, `<legend>`), its own
text. What people can read on a control is part of what it is called (2.5.3), so voice users can say it. Icon-only
buttons get `aria-label` and an `aria-hidden` icon. Repeated controls get distinct names ("Delete Amara"). Help text
and errors go in `aria-describedby`.

## Keyboard

| Rule | Value |
|---|---|
| Order | DOM order is visual order is reading order; no positive `tabindex`; no CSS reordering of interactive things |
| Composites | tabs, radios, menus, toolbars, listboxes, grids: one tab stop; arrows move inside (roving `tabindex`, or `aria-activedescendant` when focus must stay in an input) |
| Keys | Enter and Space on buttons; Enter on links; Escape closes the topmost layer only |
| Traps | only an open modal loops focus, and Escape always leaves |
| Shortcuts | single-character ones can be turned off or remapped, or work only on focus (2.1.4) |

## Focus shows, and goes back where it came from

- `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }` (the style block's neutral ring, so focus
  is not one more coloured thing), at 3:1 against every colour it
  crosses (a two-colour ring when the backdrop is unknown). Drawn with `outline`, which forced colours keep. Never
  `outline: none` without a replacement (2.4.7).
- Never hidden under a sticky bar (2.4.11): `scroll-padding-top` the bar's height.
- Dialogs: `<dialog>` with `showModal()` (it inerts the page, traps Tab, closes on Escape). Initial focus on the first
  field, on Cancel for a destructive confirm, or on the title for long reading. On close, focus returns to the opener;
  if the opener is gone (a deleted row), to the next row or the list's heading.
- A route change moves focus to the new `<h1 tabindex="-1">` and updates the title.
- A skip link first in the page, to `<main id="main" tabindex="-1">`.

## Structure

One `h1`, headings in order, the level by the outline and the size by CSS. Landmarks (`header`, `nav`, `main`,
`footer`), a second `nav` named. `<html lang>`; `lang` on foreign phrases. Lists are lists; data tables have
`th scope` and a caption.

## Say what changed

The live region exists before its text changes. `role="status"` (polite) for "Saved", "3 results", success; `role=
"alert"` only for a failed submit or a session about to end; `role="log"` for feeds. Never move focus to a toast. A
status toast stays at least 6 seconds (one more per 10 words) and pauses on hover and focus; one with an action or an error stays until
dismissed and is never the only place the message lives (2.2.1). Details: `references/screen-readers.md`.

## Forms

A visible `<label for>` above every field (a placeholder is never the label; an example placeholder goes on every
field or none); related fields in `fieldset` and `legend`; "required" in words; `autocomplete`, the right `type` and
`inputmode`. Check a field when it loses focus after it was changed, and on submit, never on every keystroke of a first
attempt; once it shows an error, re-check as they type. An error is said once: an inline message under
its field, tied by `aria-describedby`, with `aria-invalid="true"`, text and an icon, entered values kept. One
error: focus goes to that field, with no summary. Several errors: a summary at the top takes focus and links to
each field, in exactly the words of the inline messages (a short form that fits one screen may focus the first
problem instead; `references/forms.md`). Never block paste, and never
filter what a person types as they type it (accept it, then say what is wrong). Warn before leaving a form with unsaved
changes.
Never ask for the same data twice in a flow (3.3.7). Sign-in works with password managers, passkeys or an email link,
no puzzle (3.3.8). Patterns: `references/forms.md`.

## Pointer and touch

- Targets at least 24 × 24 CSS px (2.5.8), unless: a 24px circle centred on the target touches no other target or
  circle (spacing); an equal control elsewhere meets it; it sits inline in text; the browser draws it; or its size is
  essential. Primary touch controls 44 × 44.
- Every drag has a single-pointer or key alternative (2.5.7): buttons, a "move to" menu, arrow keys.
- Act on click or pointer-up; moving off cancels (2.5.2).
- Hover and focus content is dismissible with Escape, hoverable, and persistent (1.4.13); anything on hover also works
  on focus and touch.
- A disabled control that needs a tooltip stays focusable: `aria-disabled="true"`, not `disabled`.

## Vision and zoom

Contrast passes in every theme and state (antheo-color); never colour alone (1.4.1). Reflow at 320 CSS px and 400%
zoom without sideways scroll (1.4.10). Text survives the spacing override, line 1.5, letters 0.12em, words 0.16em,
paragraphs 2em (1.4.12): no fixed heights on text. Never block zoom. `forced-colors: active`: every control keeps a
`1px solid transparent` border, icons use `currentColor`. Details: `references/vision.md`.

## Time and motion

Reduced motion honoured (antheo-motion). Anything moving or updating by itself for more than 5 seconds has pause,
stop or hide (2.2.2); nothing flashes more than 3 times a second (2.3.1). Timeouts warn 20 seconds ahead and can be
extended (2.2.1). Selecting a value never submits or navigates (3.2.2). Help sits in the same place on every page
(3.2.6).

## Prove it

```bash
node <this-skill>/scripts/a11y-probe.mjs <url or file> --json a11y.json
```

It walks the page by keyboard: focus order, traps, dialogs returning focus, forced colours, text spacing, reflow at
320px. Fix every BLOCKER and SERIOUS finding. Then the 15-minute manual pass in `references/screen-readers.md`
(keyboard only, a screen-reader tour, 200% zoom, forced colours, reduced motion). Automated tools catch about a third
of real problems; never call something accessible from a green scan alone. In a framework, also keep its linter on
(jsx-a11y, vuejs-accessibility, Svelte's a11y warnings, angular-eslint's template rules; the list is in
antheo-build's `references/stacks.md`): it catches the static half while you type, the probe the rest.

## What generated UI gets wrong here

Check each in `references/habits.md` before calling it done: contrast · no <main>, content outside landmarks, no
skip link, no h1 or a skipped heading level · helper text not tied to its field; a group of radios or checkboxes
with no fieldset and legend · collapsed content still reachable · aria-expanded="false" written once and never
updated · icon-only buttons with no name; a div with a click handler · outline: none with nothing in its place ·
every item in a toolbar or grid its own tab stop.

## Done

- [ ] Native elements; every control named with its visible text
- [ ] Keyboard order matches the screen; composites have one tab stop and their key map
- [ ] Focus visible at 3:1, never under a sticky bar, returned on close and after delete
- [ ] Changes announced once; action and error toasts stay until dismissed
- [ ] Forms: visible labels, errors tied and summarised, paste allowed, no repeated entry
- [ ] Targets 24px (or a listed exception), 44 on touch; drag alternatives; hover content dismissible
- [ ] Reflow at 320px, spacing override survives, forced colours keep every edge
- [ ] Probe not BROKEN; 15-minute manual pass done
- [ ] Checked against every habit in `references/habits.md`
- [ ] Reported in antheo-review's format (`references/report.md` there): Block or Approve first, then Seen, Why
      and Fix with the value before and after

## Files

- `scripts/a11y-probe.mjs`: drives a page by keyboard and gives a verdict (exit 0 clean, 1 not ready, 3 broken)
- `references/patterns.md`: key maps and markup for 20 widgets; roving tabindex and combobox code
- `references/forms.md`: labels, groups, errors, the summary, autocomplete tokens, input types, timeouts
- `references/screen-readers.md`: live regions, hidden content, images, tables, charts, the 15-minute test
- `references/vision.md`: contrast, focus-ring recipes, forced colours, prefers-contrast, zoom, text spacing
- `references/habits.md`: what generated UI gets wrong here, each with its fix
