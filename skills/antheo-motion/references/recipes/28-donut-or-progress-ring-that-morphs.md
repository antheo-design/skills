# 28. Donut or progress ring that morphs between values

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<svg class="ring" viewBox="0 0 36 36" role="img" aria-label="68% complete">
  <circle class="track" cx="18" cy="18" r="15.915" pathLength="100"/>
  <circle class="seg" cx="18" cy="18" r="15.915" pathLength="100" style="--len: 68; --start: 0"/>
</svg>
```

```css
@property --len   { syntax: "<number>"; inherits: true; initial-value: 0; }
@property --start { syntax: "<number>"; inherits: true; initial-value: 0; }
.ring { width: 96px; rotate: -90deg; }
.ring circle { fill: none; stroke-width: 3.5; }
.ring .track { stroke: var(--well); }
.ring .seg { stroke: var(--accent); stroke-linecap: round; stroke-dasharray: var(--len) 100; stroke-dashoffset: calc(var(--start) * -1);
  transition: --len var(--dur-slow) var(--ease-in-out), --start var(--dur-slow) var(--ease-in-out); }
@media (prefers-reduced-motion: reduce) { .ring .seg { transition: none; } }
```

```js
// a donut is one circle per slice with the same CSS; --start is the sum of the slices before it
function setRing(segs, values) {
  const total = values.reduce((a, b) => a + b, 0); let acc = 0;
  segs.forEach((c, i) => {
    const len = (values[i] / total) * 100;
    c.style.setProperty('--len', Math.max(0, len - (values.length > 1 ? 1 : 0)));   // 1 unit gap between slices
    c.style.setProperty('--start', acc); acc += len;
  });
}
```

Moving from A to B on screen uses `--ease-in-out`. Update the `aria-label` with the new value and roll the centre number with recipe 11. Registering `--len` and `--start` with `@property` is what lets them transition.
