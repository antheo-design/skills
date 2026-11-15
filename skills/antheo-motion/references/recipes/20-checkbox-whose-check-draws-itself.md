# 20. Checkbox whose check draws itself

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<label class="cb"><input type="checkbox"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" pathLength="1"/></svg>Remember me</label>
```

```css
.cb { display: inline-flex; align-items: center; gap: var(--s-2); position: relative; }
.cb input { appearance: none; width: 20px; height: 20px; border: 1.5px solid var(--text-3); border-radius: var(--r-control); margin: 0;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), scale var(--dur-instant) var(--ease-out); }
.cb input:active { scale: var(--scale-press); }
.cb input:checked { background: var(--accent); border-color: var(--accent); }
.cb svg { position: absolute; width: 20px; height: 20px; pointer-events: none; fill: none; stroke: var(--on-accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset var(--dur-fast) var(--ease-out); }
.cb input:checked + svg { stroke-dashoffset: 0; transition-delay: 40ms; }       /* the box fills, then the check follows */
@media (prefers-reduced-motion: reduce) { .cb svg { transition: none; } .cb input:active { scale: none; } }
```

Unchecking undoes it at once (no delay), and a transition reverses cleanly mid-flight. Keep the real `<input>`: label click, keyboard and forms work for free.
