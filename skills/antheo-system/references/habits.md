# What agents get wrong in an existing app

Part of antheo-system. Read it before calling the work done, and check the build against each habit.

Seen again and again when an agent works in a codebase that already has a system (2025 to 26 write-ups). Check for each.

- **Raw palette classes and arbitrary values:** `bg-pink-500`, `p-[13px]`, `rounded-[10px]`, an inline style with
  a hex. Every value maps to a token by role; a lint rule against arbitrary values keeps it so.
- **Invented token names:** `--color-primary-500` in a project whose token is `--brand-action-bg`. If no token
  fits, stop and ask; never coin one that looks plausible.
- **A component restyled from outside:** padding on a Button, a weight on a CardTitle. Use its variants, or add one.
- **A component rebuilt beside the one that exists,** because the nearest files outvoted the rules. Search for it
  first; import the project's own.
- **Drift late in a long session:** new greys, a fourth radius, paddings of 14, 16 and 20. Re-read the tokens
  before each new screen, and audit the last screen against them (`audit-values.mjs`).
- **Old script for what the platform now does:** a script focus trap, scroll listeners, class toggles with
  timers. `<dialog>`, `popover`, `inert`, `@starting-style`, scroll-driven animation.
