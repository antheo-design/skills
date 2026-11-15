# 32. Clip-path inset reveal

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.clip-in { animation: clip-in var(--dur-slow) var(--ease-out) both; }
.clip-in > img { animation: clip-zoom var(--dur-slow) var(--ease-out) both; }
@keyframes clip-in   { from { clip-path: inset(0 0 100% 0 round var(--r-control)); } to { clip-path: inset(0 0 0 0 round var(--r-control)); } }
@keyframes clip-zoom { from { scale: 1.04; } }
@media (prefers-reduced-motion: reduce) { .clip-in { animation-name: fade-only; } .clip-in > img { animation: none; } }
```

Use `inset(0 100% 0 0)` for a left-to-right wipe. One reveal per section at most. The content is in the DOM and visible if the animation never runs. `clip-path` repaints each frame: fine at this size and length, not on a full-bleed hero.

---

# Recipes 33 to 35: AI interfaces

AI motion says one thing: it is working, and this is what it is doing. Keep it quiet; people watch it for long stretches.
