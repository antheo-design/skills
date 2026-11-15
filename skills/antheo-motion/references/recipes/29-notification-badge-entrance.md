# 29. Notification badge entrance

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.badge { transition: opacity var(--dur-fast) var(--ease-out), scale var(--dur-fast) var(--ease-out); }
.badge:not([hidden]) { animation: badge-in var(--dur-spring) var(--ease-spring) both; }
@keyframes badge-in { from { opacity: 0; scale: 0.6; } }        /* start at 0.6, never at 0 */
.badge.leaving { opacity: 0; scale: var(--scale-leave); }
@media (prefers-reduced-motion: reduce) { .badge:not([hidden]) { animation: fade-only var(--dur-fast) both; } .badge.leaving { scale: none; } }
```

Show it when the count goes from none to some; later changes use recipe 22 or `.tick`. Give the badge a text equivalent (`aria-label="3 unread"`), not only a dot.
