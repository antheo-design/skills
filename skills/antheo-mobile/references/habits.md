# What generated UI gets wrong here

Part of antheo-mobile. Read it before calling the work done, and check the build against each habit.

Seen again and again in agent-built pages (detector catalogues, audits and Chrome's 2026 list). Check for each.

- **Small targets:** generated controls come out around 32px unless told. 44px on touch (the block's phone values).
- **Navigation or actions `display: none` on a phone,** or content that exists at 1440 and is gone at 375. Recompose
  for the phone; never delete.
- **A desktop layout squeezed:** text within 8px of the screen edge, a table with columns off-screen and no way to
  reach them. `--gutter`; rows as a list, or a scroll inside the table's own box.
- **A hint hidden by the keyboard:** the field scrolls into view but its helper or error doesn't. `scroll-margin-block:
  var(--s-16)` on fields, and check with the keyboard open.
- **A swipe that leaves the page:** a sideways scroller without `overscroll-behavior-x: contain` takes an
  over-swipe as "back".
- **Things that only work on hover or a long press.** A visible control for each.
- **`100vh` panels that jump** as the browser's bars show and hide. `svh` or `dvh`.
