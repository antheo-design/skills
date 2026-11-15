# 18. Switch with a spring

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
/* the style block already has .switch (track --sw-w × --sw-h, knob --sw-knob, on = --accent). This adds the spring: */
@media (prefers-reduced-motion: no-preference) {
  .switch::after { transition: translate var(--dur-spring) var(--ease-spring); }
}
```

`<button role="switch" aria-checked="false">` with a visible label; Space and Enter toggle it.

---

# Recipes 19 to 32: micro-interactions

All use the distance, scale and blur tokens from SKILL.md Step 2. Hover parts sit inside `@media (hover: hover) and (pointer: fine)`. Every recipe ends with its reduced-motion variant. The shared helper below is used by several of them.

```css
@keyframes fade-only { from { opacity: 0; } }   /* the reduced-motion stand-in: a plain fade */
```
