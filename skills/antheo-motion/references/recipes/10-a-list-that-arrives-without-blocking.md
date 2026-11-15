# 10. A list that arrives without blocking

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.list > li { animation: rise var(--dur-base) var(--ease-out) both; animation-delay: calc(min(sibling-index(), 8) * 35ms); }   /* 30 to 40ms a step for lists */
@keyframes rise { from { opacity: 0; translate: 0 var(--dist-xs); } }
@media (prefers-reduced-motion: reduce) { .list > li { animation: none; } }
```

Where `sibling-index()` isn't supported, set `style="--i: 3"` per item and use `var(--i)`. Items are clickable immediately, no `pointer-events: none` while arriving. Only on first load of a list, not on every filter.
