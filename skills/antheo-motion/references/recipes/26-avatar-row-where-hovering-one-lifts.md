# 26. Avatar row where hovering one lifts it and its neighbours less

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.avatars { display: flex; }
.avatars li { margin-inline-start: -8px; transition: translate var(--dur-fast) var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  .avatars li:hover                                                { translate: 0 calc(var(--dist-sm) * -1); }
  .avatars li:hover + li, .avatars li:has(+ li:hover)              { translate: 0 calc(var(--dist-xs) * -1); }
  .avatars li:hover + li + li, .avatars li:has(+ li + li:hover)    { translate: 0 calc(var(--dist-xs) / -2); }
}
@media (prefers-reduced-motion: reduce) { .avatars li { transition: none; translate: none !important; } }
```

The lift falls off with distance: 8, 4, 2. Give the hit area a steady box so the row doesn't flicker when the avatar moves out from under the pointer: put `padding-block: var(--dist-sm)` and a matching negative margin on the `li` child that holds the hover, and lift an inner image instead of the `li` where the row is dense.
