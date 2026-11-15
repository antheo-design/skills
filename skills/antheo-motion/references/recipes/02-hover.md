# 2. Hover

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
/* 150ms in and out: the fill fades in place on this row; leaving is never delayed */
.row { transition: background-color var(--dur-fast) var(--ease-out); }
@media (hover: hover) { .row:hover { background: var(--well); } }
```

Move an inner element, never the hovered box itself: a box that slides out from under the cursor flickers.
