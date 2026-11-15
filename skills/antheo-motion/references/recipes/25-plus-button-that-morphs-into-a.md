# 25. Plus button that morphs into a menu

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<div class="fab" data-open="false">
  <ul class="fab-menu" id="fab-menu" role="menu" inert><li role="none"><button role="menuitem">New note</button></li><li role="none"><button role="menuitem">New folder</button></li></ul>
  <button class="fab-btn" aria-expanded="false" aria-controls="fab-menu" aria-label="Create"><span class="plus">+</span></button>
</div>
```

```css
.fab { position: relative; width: 48px; height: 48px; }
.fab-menu { position: absolute; inset: auto 0 0 auto; min-width: 200px; margin: 0; padding: var(--s-2) var(--s-2) 56px; list-style: none; background: var(--surface);
  clip-path: inset(calc(100% - 48px) 0 0 calc(100% - 48px) round 24px);          /* starts as the button's own circle */
  transition: clip-path var(--dur-fast) var(--ease-out); }
.fab[data-open="true"] .fab-menu { clip-path: inset(0 round var(--r-card)); transition-duration: var(--dur-slow); }
.fab-menu li { opacity: 0; translate: 0 var(--dist-xs); transition: opacity var(--dur-fast) var(--ease-out), translate var(--dur-fast) var(--ease-out); }
.fab[data-open="true"] .fab-menu li { opacity: 1; translate: 0 0; transition-delay: calc(var(--dur-fast) + var(--i, 0) * 35ms); }
.fab-btn { position: absolute; inset: auto 0 0 auto; width: 48px; height: 48px; border-radius: 50%; }
.fab-btn .plus { display: block; transition: rotate var(--dur-base) var(--ease-out); }
.fab[data-open="true"] .plus { rotate: 45deg; }                                    /* + becomes x */
@media (prefers-reduced-motion: reduce) {
  .fab-menu { clip-path: none; opacity: 0; transition: opacity var(--dur-fast) var(--ease-out); }
  .fab[data-open="true"] .fab-menu { opacity: 1; }
  .fab-menu li { translate: none; opacity: 1; transition: none; }
  .fab[data-open="true"] .plus { rotate: none; }
}
```

```js
fab.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--i', i));
function setOpen(o, { focus = true } = {}) {
  fab.dataset.open = o; btn.setAttribute('aria-expanded', o); menu.inert = !o;      // closed items cannot be focused
  if (focus) (o ? menu.querySelector('button') : btn).focus();
}
btn.addEventListener('click', () => setOpen(fab.dataset.open !== 'true'));
fab.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
```

If a keyboard shortcut opens it, add `data-instant` and set `transition-duration: var(--dur-instant)` on it.
