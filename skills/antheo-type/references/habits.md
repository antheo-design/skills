# What generated UI gets wrong here

Part of antheo-type. Read it before calling the work done, and check the build against each habit.

Seen again and again in agent-built pages (detector catalogues and audits, 2025 to 26). Check for each.

- **A face picked to look different.** Space Grotesk, Instrument Serif, Plus Jakarta Sans, Poppins, Playfair: each is
  now as recognisable as the default it replaced. The face is the project's, else the block's; a new one only when
  the person names it.
- **A framework's whole ramp** (12, 14, 16, 18, 24, 30, 36, 48, 60, 72): ten sizes nobody chose. Only the block's six.
- **A button, tab or nav label on two lines** at any width from 320 to 1920. Shorten it, then `white-space: nowrap`.
- **A last line of one word** in a heading or paragraph. `balance` and `pretty` are set by the block; rewrite a
  heading that still strands a word.
- **Gradient-filled text** (`background-clip: text`), all-capital headings, body text at the strong weight. One
  ink, sentence case, `--w-text`.
- **One line height for everything:** a heading at 1.5 looks loose, body at 1.2 looks cramped. Each size carries its
  own line height in the block.
- **Typewriter characters in rendered copy:** straight quotes and apostrophes, `--`, three dots. Use ’ “ ” – … in
  the strings (antheo-writing's `copy-lint.mjs` finds them).
- **Figures that jiggle:** any number in a column, a timer or a value that updates takes `tabular-nums`.
