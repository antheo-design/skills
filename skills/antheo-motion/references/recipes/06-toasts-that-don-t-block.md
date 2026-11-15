# 6. Toasts that don't block

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.toasts { position: fixed; inset-block-end: var(--s-4); inset-inline-end: var(--s-4); display: grid; gap: var(--s-2); z-index: 50; pointer-events: none; }
.toast { pointer-events: auto; translate: 0 0; opacity: 1;
  transition: translate var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
@starting-style { .toast { translate: 0 var(--dist-md); opacity: 0; } }
.toast.leaving { opacity: 0; translate: var(--dist-sm) 0; transition-duration: var(--dur-fast); }   /* ease-out, ~70% of the enter, half the travel; a toast dismissed by a fling uses --ease-in */
```

```html
<div class="toasts" role="status" aria-live="polite"></div>
```

Auto-dismiss after at least 6s (1s more per 10 words), pausing on hover and focus; max 3 visible. A toast with an action ("Undo") or an error stays until dismissed, its action reachable by keyboard.
