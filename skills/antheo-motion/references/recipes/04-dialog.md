# 4. Dialog

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
dialog { opacity: 0; translate: 0 calc(var(--dist-sm) / 2); scale: var(--scale-leave);   /* leaves: half the distance, ~70% of the enter */
  transition: opacity var(--dur-base) var(--ease-out), translate var(--dur-base) var(--ease-out), scale var(--dur-base) var(--ease-out),
              display var(--dur-base) allow-discrete, overlay var(--dur-base) allow-discrete; }
dialog[open] { opacity: 1; translate: 0 0; scale: 1; transition-duration: var(--dur-open); transition-timing-function: var(--ease-out); }
@starting-style { dialog[open] { opacity: 0; translate: 0 var(--dist-sm); scale: var(--scale-pop); } }
dialog::backdrop { background: var(--backdrop); opacity: 0; transition: opacity var(--dur-open) var(--ease-out), display var(--dur-slow) allow-discrete, overlay var(--dur-slow) allow-discrete; }
dialog[open]::backdrop { opacity: 1; }
@starting-style { dialog[open]::backdrop { opacity: 0; } }
```

Open with `dialog.showModal()` (traps focus, Esc closes). Return focus to the trigger on close (the browser does it for `showModal`).
