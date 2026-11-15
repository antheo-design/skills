# 23. Number pop-in for a count that appears

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.count-in { animation: count-in var(--dur-base) var(--ease-out) both; font-variant-numeric: tabular-nums; }
@keyframes count-in { from { opacity: 0; scale: 0.8; filter: blur(var(--blur-sm)); } }
@media (prefers-reduced-motion: reduce) { .count-in { animation-name: fade-only; } }
```

Add the class when the count first appears (0 items becomes 1, the first result). Later changes use `.tick` (motion kit) or recipe 22. Never scale from 0.
