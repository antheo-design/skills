# Reviewing with no browser

Part of antheo-review, and the place antheo-access, antheo-stress and antheo-motion point to when Playwright or a
browser is missing. Most of a review needs the page as rendered. Without it, do what still runs, hand the person the
few checks only their own browser can do, and say plainly what nobody checked. A review with no browser never ends
in "ready to ship".

## 1. Try to get a browser first

`npx github:antheo-design/skills doctor` (or `node <repo>/bin/antheo.mjs doctor`) names what is missing and the one
line that installs it: `npm i -D playwright-core`, then Chrome or Edge, or `npx playwright install chromium`. Ask the
person once whether to install it. If they can't (a locked machine, a sandbox), go on.

## 2. What still runs on Node alone

| Tool | It checks | From |
|---|---|---|
| `copy-lint.mjs <src>` (`--marketing` on a page that sells) | every word on the page | antheo-writing |
| `scan-motion.mjs <src> --top 5` | the motion rules: transition on all, scale(0), layout properties, no reduced-motion handling | antheo-motion-audit |
| `audit-values.mjs <src>` | hardcoded colours, sizes, radii and shadows | antheo-system |
| `contrast.mjs <fg> <bg>` | each text and background pair read from the CSS, in light and in dark | antheo-color |
| `check-block-names.mjs <file>` | every custom property the page reads is one the style block defines | antheo-review |
| `harness.mjs <card.harness.json>` | writes every state of a component onto one page, for the person to open | antheo-stress |

Read the source for the rest: a `<label>` for each field, a real `<button>` for each action, `alt` on images, one `h1`,
`:focus-visible` styles, `@media (prefers-reduced-motion)`, `@media (prefers-color-scheme: dark)`. Source says what
was declared, not what renders: tag every finding that way.

## 3. Five minutes in the person's own browser

Give them this list and ask what they saw:

1. **Keyboard:** press Tab from the top. Does every control get a ring you can see, in order? Does Escape close
   what opened?
2. **Phone:** open the developer tools, set the width to 390px. Does anything scroll sideways or get cut off?
3. **Dark:** switch the system to dark mode. Is every text still easy to read?
4. **Zoom:** zoom to 200%. Does every word still fit?
5. **Press everything:** does each button do something?

## 4. Report

The verdict is **Not verified**, never Approve. List what ran and what it found, the person's answers, and under
**Not checked** everything a browser would have measured: layout at each width, rendered contrast, focus order,
overflow, loading and jumps, motion as it plays. An armed gate says TOOL ERROR without a browser; that is correct,
because nothing was rendered. Leave it armed and say why; never disarm it to make the problem go away.
