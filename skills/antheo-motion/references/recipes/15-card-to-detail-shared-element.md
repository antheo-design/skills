# 15. Card → detail (shared element)

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.card img { view-transition-name: var(--vt, none); }
::view-transition-group(*) { animation-duration: var(--dur-page); animation-timing-function: var(--ease-in-out); }
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation-duration: 1ms; } }
```

```js
async function openDetail(card) {
  const img = card.querySelector('img');
  img.style.setProperty('--vt', 'hero');                           // name only the one being opened
  if (!document.startViewTransition) return render();
  const t = document.startViewTransition(() => { img.style.removeProperty('--vt'); render(); });   // detail's hero image has view-transition-name: hero
  await t.finished;
}
```

Multi-page sites: `@view-transition { navigation: auto; }` on both pages (Chrome, Safari).
