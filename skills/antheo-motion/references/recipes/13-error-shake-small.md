# 13. Error shake (small)

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.field[data-error] input { animation: nudge 300ms var(--ease-out); }
@keyframes nudge { 20% { translate: -5px; } 40% { translate: 4px; } 60% { translate: -3px; } 80% { translate: 2px; } }
@media (prefers-reduced-motion: reduce) { .field[data-error] input { animation: none; } }
```

Only when someone submits; never while typing. The error text below the field is what matters.
