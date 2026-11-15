# 9. Accordion to `height: auto`

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
:root { interpolate-size: allow-keywords; }                       /* Chromium: real height animation */
details::details-content { block-size: 0; overflow: clip; transition: block-size var(--dur-base) var(--ease-out), content-visibility var(--dur-base) allow-discrete; }
details[open]::details-content { block-size: auto; }

/* everywhere else: the grid trick */
.fold { transition: grid-template-rows var(--dur-base) var(--ease-out); display: grid; grid-template-rows: 0fr; }
.fold[data-open] { grid-template-rows: 1fr; }
.fold > div { overflow: hidden; } /* the one child clips while the row grows */
```
