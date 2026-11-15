# 22. Soft value swap

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

The old value fades and lifts `--dist-xs`; the new one arrives from the same distance below. Both sit in one grid cell, so nothing shifts.

```css
.swap { display: inline-grid; }
.swap > * { grid-area: 1 / 1; }
.swap .in  { animation: swap-in  var(--dur-base) var(--ease-out) both; }
.swap .out { animation: swap-out var(--dur-fast) var(--ease-out) both; }   /* about 70% of the enter */
@keyframes swap-in  { from { opacity: 0; translate: 0 var(--dist-xs); filter: blur(var(--blur-xs)); } }
@keyframes swap-out { to   { opacity: 0; translate: 0 calc(var(--dist-xs) * -1); filter: blur(var(--blur-xs)); } }
@media (prefers-reduced-motion: reduce) { .swap .in { animation-name: fade-only; } .swap .out { display: none; } }
```

```js
function swapValue(box, text) {
  const old = box.querySelector('.in');
  if (old) { old.classList.replace('in', 'out'); old.addEventListener('animationend', () => old.remove(), { once: true }); }
  box.append(Object.assign(document.createElement('span'), { className: 'in', textContent: text }));
}
```

For prices, statuses and totals that change from data. Swap only when the value really changed, not on every poll. Give the box `aria-live="polite"` only if the change matters to someone not looking at it.
