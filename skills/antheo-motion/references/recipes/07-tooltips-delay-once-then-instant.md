# 7. Tooltips: delay once, then instant

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```js
let warm = false, cool;
for (const t of document.querySelectorAll('[data-tip]')) {
  let timer;
  const show = () => { clearTimeout(cool); timer = setTimeout(() => { t.dataset.open = ''; warm = true; }, warm ? 0 : 400); };
  const hide = () => { clearTimeout(timer); delete t.dataset.open; cool = setTimeout(() => (warm = false), 300); };
  t.addEventListener('pointerenter', show); t.addEventListener('pointerleave', hide);
  t.addEventListener('focus', show); t.addEventListener('blur', hide);
  t.addEventListener('keydown', (e) => e.key === 'Escape' && hide());
}
```

The tooltip text is also the control's accessible name or description (`aria-describedby`). On touch, use a tap-to-open popover instead.
