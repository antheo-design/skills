# 12. A check that draws itself

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>
```

```css
.check path { fill: none; stroke: var(--success); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw var(--dur-slow) var(--ease-out) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
```

Pair with text ("Saved"): the check is the flourish, the word is the message.
