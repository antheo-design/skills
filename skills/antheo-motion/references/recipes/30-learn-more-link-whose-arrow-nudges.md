# 30. "Learn more" link whose arrow nudges forward

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<a class="more" href="/docs">Learn more <svg class="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
```

```css
.more .arrow { width: 1em; height: 1em; vertical-align: -0.1em; transition: translate var(--dur-base) var(--ease-out); }   /* leaving is slower */
@media (hover: hover) and (pointer: fine) { .more:hover .arrow { translate: var(--dist-xs) 0; transition-duration: var(--dur-fast); } }
.more:focus-visible .arrow { translate: var(--dist-xs) 0; }
@media (prefers-reduced-motion: reduce) { .more .arrow { transition: none; translate: none !important; } }
```

In right-to-left layouts use `translate: calc(var(--dist-xs) * -1) 0` and mirror the arrow.
