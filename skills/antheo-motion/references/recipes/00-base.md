# Base layer (put once in global CSS)

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
/* respond to hover only where hovering exists */
@media (hover: hover) and (pointer: fine) { .hoverable:hover { background: var(--well); } }

/* one switch for "less motion" */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
  [data-motion="travel"] { translate: none !important; scale: none !important; rotate: none !important; }
}
```
