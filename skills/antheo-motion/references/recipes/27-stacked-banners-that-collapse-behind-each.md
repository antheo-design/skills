# 27. Stacked banners that collapse behind each other

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.stack { display: grid; width: min(380px, 100%); --gap: var(--s-2); }
.stack > * { grid-area: 1 / 1; z-index: calc(10 - var(--i)); transform-origin: bottom center;
  translate: 0 calc(var(--i) * var(--dist-sm) * -1); scale: calc(1 - var(--i) * 0.04); opacity: calc(1 - var(--i) * 0.3);
  transition: translate var(--dur-base) var(--ease-out), scale var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
.stack > :nth-child(n + 4) { opacity: 0; pointer-events: none; }
@starting-style { .stack > * { opacity: 0; translate: 0 var(--dist-md); scale: var(--scale-pop); } }
@media (hover: hover) and (pointer: fine) {
  .stack:hover > * { translate: 0 calc(var(--i) * (100% + var(--gap)) * -1); scale: 1; opacity: 1; }   /* spread to read them all; % is the banner's own height */
}
@media (prefers-reduced-motion: reduce) { .stack > * { transition: opacity var(--dur-fast) var(--ease-out); scale: 1; } }
```

```js
const renumber = (stack) => [...stack.children].reverse().forEach((el, i) => el.style.setProperty('--i', i));   // 0 = newest = front
// add: stack.prepend(el); renumber(stack);   remove: el.remove(); renumber(stack); the others slide forward on their own
```

Keep the DOM order newest-last so `:nth-child(n + 4)` hides the oldest; if you prepend, hide by `--i` with a class instead. Cap three visible. Hover and focus pause auto-dismiss. The front banner's action stays reachable by keyboard.
