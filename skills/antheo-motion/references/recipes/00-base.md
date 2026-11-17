# Base layer (put once in global CSS)

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
/* respond to hover only where hovering exists */
@media (hover: hover) and (pointer: fine) { .hoverable:hover { background: var(--well); } }

/* "less motion": travel, scale and rotation go; fades and colour stay, and a spinner or progress bar keeps turning,
   because it is the only sign that something is happening. Never a blanket reset on *: it stops those too. The style
   block already zeroes its distance and scale tokens; each recipe with keyframes carries its own reduced version. */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  [data-motion="travel"] { translate: none !important; scale: none !important; rotate: none !important; }
  [data-motion="loop"] { animation: none !important; }   /* a decorative loop; never put this on a spinner */
}
```
