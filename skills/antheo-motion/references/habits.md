# What generated UI gets wrong here

Part of antheo-motion. Read it before calling the work done, and check the build against each habit.

Seen again and again in agent-built pages (detector catalogues and audits, 2025 to 26). Check for each.

- **`transition: all`,** an entrance on `ease-in` or plain `ease`, a menu taking 300ms or more, the same timing in
  and out, a popover growing from `scale(0)`. Named properties, `--ease-out`, `--dur-fast`, a faster exit, from
  `--scale-pop`.
- **Content hidden until a script reveals it** (`opacity: 0` waiting for an observer): if the script fails, the
  page is blank. Visible by default; entrances with `@starting-style`.
- **A blanket reduced-motion reset** (`* { transition-duration: 0.01ms }`): it also kills the fades that explain a
  state change. Remove travel and scale; keep opacity and colour (the block does this).
- **A focus ring that fades or slides in.** Instant, always.
- **Motion that performs:** a blinking cursor on finished text, an auto-scrolling logo row or carousel with no
  pause, scroll-jacking, a cursor trail, `scroll-behavior: smooth` on the whole page. None; a row that must move
  pauses on hover and focus.
- **Hover effects on things that aren't clickable,** the same zoom on every image, hover motion firing on touch.
  One signal, on the thing that acts, inside `@media (hover: hover) and (pointer: fine)`.
- **A transition reading a name nobody defined:** it doesn't run, and the thing jumps. Paste the block first;
  antheo-review's `check-block-names.mjs` lists any undefined name.
