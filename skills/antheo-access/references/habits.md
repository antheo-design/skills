# What generated UI gets wrong here

Part of antheo-access. Read it before calling the work done, and check the build against each habit.

Measured, not guessed: in Microsoft's 2025 evaluation (eight models, 1,280 samples) UI generated with no
accessibility instructions passed the audit about one time in eight; with instructions and a self-review pass,
most of the time. So read this skill before building, and run the probe before done. The failures, most common
first:

- **Contrast** (most of the automated failures): measure the rendered pairs (antheo-color).
- **No `<main>`, content outside landmarks, no skip link, no `h1` or a skipped heading level,** no `lang` or
  `<title>`.
- **Helper text not tied to its field; a group of radios or checkboxes with no `fieldset` and `legend`.**
- **Collapsed content still reachable:** a closed menu or panel left in the tab and reading order. `hidden` or
  `inert`.
- **`aria-expanded="false"` written once and never updated;** ARIA roles missing their required children;
  `aria-modal` on a div with a hand-made trap. Native elements first.
- **Icon-only buttons with no name; a div with a click handler** that Tab skips.
- **`outline: none` with nothing in its place,** or a ring under 3:1.
- **Every item in a toolbar or grid its own tab stop.** One stop, arrows inside.
