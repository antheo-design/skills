# 14. Skeleton

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.skeleton { background: var(--well); border-radius: var(--r-control); position: relative; overflow: hidden; }
@media (prefers-reduced-motion: no-preference) {
  .skeleton::after { content: ""; position: absolute; inset: 0; translate: -100% 0;
    background: linear-gradient(90deg, transparent, color-mix(in oklch, var(--surface) 70%, transparent), transparent);
    animation: sweep 1.4s var(--ease-in-out) infinite; }
}
@keyframes sweep { to { translate: 100% 0; } }
```

Shape skeletons like the real content (lines of text, a square for the image). Show them only after ~200ms, and keep them at least ~400ms once shown, so fast loads don't flash.
