# 1. Press feedback

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.btn { transition: scale var(--dur-instant) var(--ease-out), background-color var(--dur-fast) var(--ease-out); }
.btn:active:not(:disabled) { scale: var(--scale-press); }
```

Use the individual `scale` property so it doesn't fight other `transform`s. Not on large cards.
