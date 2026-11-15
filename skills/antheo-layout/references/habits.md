# What generated UI gets wrong here

Part of antheo-layout. Read it before calling the work done, and check the build against each habit.

Seen again and again in agent-built pages (detector catalogues and audits, 2025 to 26). Check for each.

- **The page everyone has seen:** hero, three features, logos, pricing, questions, footer, in that order, whatever
  the product. Sections come from the content; one with no real content is left out.
- **The hero formula:** a pill above the headline, a sub-line that repeats the headline, a filled button beside a
  ghost one. No pill; a sub-line that adds a fact; one action.
- **A hero sized in `vh`,** cut off at 1280×800 or leaving a blank band on a tall screen. Content sets the height
  (`svh` if it truly must fill).
- **Everything centred.** Centre a short heading over a centred row; running text, section copy, lists and forms
  start on the left edge.
- **A stat band:** three or four huge figures with tiny labels ("10M+", "99.9%"). A real number inside a
  sentence, or nothing.
- **One value for every gap:** the same 24px inside cards, between cards and between sections. Tight inside a
  group, looser between groups, loosest between sections (the block's gap roles).
- **Sideways scroll hidden, not fixed:** `width: 100vw` with `overflow-x: hidden` on the body. `width: 100%`, and
  find what overflows.
- **A grid blown out by its content:** bare `1fr` tracks stretched by an image or a long word. `minmax(0, 1fr)`
  and `min-width: 0`.
- **One card alone on the last row;** two sticky bars both at `top: 0`; a sideways scroller whose first card
  touches the edge. Change the count or the columns; offset the second bar; pad both ends.
- **Every panel on screen at once,** whatever step the person is on; a newsletter band closing every page. Show
  what this step needs; end on the job's own action.
