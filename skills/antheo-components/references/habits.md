# What generated UI gets wrong here

Part of antheo-components. Read it before calling the work done, and check the build against each habit.

Seen again and again in agent-built pages (detector catalogues, audits and Chrome's 2026 list). Check for each.

- **Half the states:** hover drawn, pressed and disabled forgotten. Every control has rest, hover, focus, pressed,
  disabled, loading and error, and empty where it holds content.
- **One hover for everything** (`opacity: 0.8`, or a scale-up on every element). A fill change on controls; nothing
  on things that aren't clickable.
- **Disabled as lower opacity only;** a border that thickens on focus and shifts the row. Disabled changes fill,
  text and cursor; focus is an outline, so nothing moves.
- **A placeholder as the format hint** ("MM/YY"): it vanishes on the first key. A helper line tied to the field
  with `aria-describedby`.
- **Errors on fields nobody touched.** Validate with `:user-invalid` (after the person has edited and left), and
  keep `aria-invalid` in step with the visible error.
- **Overlays built by hand:** a fixed div, a click-outside listener, a script focus trap, `overflow: hidden` on the
  page. Use `<dialog>`, the `popover` attribute and `inert`: they bring focus, Escape and the top layer.
- **A menu or tooltip cut off** by a parent with `overflow: hidden`. The top layer (popover) or a portal.
- **A dialog for everything:** small confirmations, long forms, two dialogs stacked. Inline, a side panel or a
  page; a dialog only for a short decision.
- **Row actions that exist only on hover:** a touch or keyboard user never finds them. Always there (quiet), or in
  a "More" menu.
- **"No items"** as an empty state; a toast celebrating what the screen already shows. Say what goes here and offer
  the one action; stay silent on a visible success.
- **A control wired to nothing:** a form that says "Thanks" with no request behind it, a button with an empty
  handler, a link to nowhere, a success shown after a failed request. Press every control before calling it done.
