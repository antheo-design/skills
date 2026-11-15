# 8. Tab indicator that slides (no crossfade)

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.tabs { position: relative; display: flex; gap: var(--s-1); }
.tabs .indicator { position: absolute; inset-block-end: 0; height: 2px; background: var(--accent);
  left: 0; width: var(--w); translate: var(--x) 0;
  transition: translate var(--dur-base) var(--ease-move, var(--ease-out)), width var(--dur-base) var(--ease-out); }
```

```js
function moveIndicator(tab) {
  const ind = tab.parentElement.querySelector('.indicator');
  ind.style.setProperty('--x', `${tab.offsetLeft}px`); ind.style.setProperty('--w', `${tab.offsetWidth}px`);
}
```

Set it without transition on first render (add a `.ready` class one frame later that enables the transition).
