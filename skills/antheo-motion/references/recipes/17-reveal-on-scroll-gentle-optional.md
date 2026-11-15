# 17. Reveal on scroll (gentle, optional)

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .reveal { animation: rise linear both; animation-timeline: view(); animation-range: entry 0% entry 40%; }
  }
}
```

One section style at most, small travel (6 to 12px). Never hide content until it's scrolled to on pages people need to read; if the animation fails, the content must still show.
