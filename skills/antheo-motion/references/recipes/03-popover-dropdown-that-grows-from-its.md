# 3. Popover / dropdown that grows from its trigger

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<button popovertarget="m" class="btn">Options</button>
<div id="m" popover class="menu">…</div>
```

```css
.menu {
  transform-origin: top left;                    /* the corner nearest the trigger */
  opacity: 1; scale: 1; translate: 0 0;
  transition: opacity var(--dur-fast) var(--ease-out), scale var(--dur-fast) var(--ease-out), translate var(--dur-fast) var(--ease-out),
              display var(--dur-fast) allow-discrete, overlay var(--dur-fast) allow-discrete;
  transition-duration: calc(var(--dur-fast) * 0.8);  /* closing: 120ms */
}
/* opening: 150ms, because a menu is opened many times a day */
.menu:popover-open { transition-timing-function: var(--ease-out); transition-duration: var(--dur-fast); }
@starting-style { .menu:popover-open { opacity: 0; scale: var(--scale-pop); translate: 0 calc(var(--dist-xs) * -1); } }
.menu:not(:popover-open) { opacity: 0; scale: var(--scale-leave); }
```

Position it with anchor positioning (`position-anchor`, `position-area: bottom span-right`) where supported, or your floating-UI library.
