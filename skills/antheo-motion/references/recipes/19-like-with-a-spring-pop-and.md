# 19. Like with a spring pop and a one-time burst

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<button class="like" aria-pressed="false" aria-label="Like">
  <svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9-9.2C2 8 4 5 7.2 5c1.9 0 3.6 1 4.8 2.6C13.2 6 14.9 5 16.8 5 20 5 22 8 21 11.3c-1.5 4.6-9 9.2-9 9.2z"/></svg>
</button>
```

```css
.like { position: relative; transition: scale var(--dur-instant) var(--ease-out); }
.like:active { scale: var(--scale-press); }
.like .heart { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.8; transition: fill var(--dur-fast) var(--ease-out), stroke var(--dur-fast) var(--ease-out); }
.like[aria-pressed="true"] .heart { fill: var(--danger); stroke: var(--danger); animation: pop var(--dur-spring) var(--ease-spring); }
@keyframes pop { from { scale: 0.6; } }
.spark { position: absolute; inset: 50% auto auto 50%; width: 4px; height: 4px; margin: -2px; border-radius: 50%; background: var(--danger); pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .like[aria-pressed="true"] .heart { animation: none; } }
```

```js
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
likeBtn.addEventListener('click', () => {
  const on = likeBtn.getAttribute('aria-pressed') !== 'true';
  likeBtn.setAttribute('aria-pressed', on);
  if (!on || reduce.matches) return;                         // burst only when liking: never on unlike, never under reduce
  for (let i = 0; i < 6; i++) {
    const s = Object.assign(document.createElement('span'), { className: 'spark' });
    likeBtn.append(s);
    const a = (i / 6) * Math.PI * 2, r = 18;
    s.animate([{ translate: '0 0', opacity: 1, scale: 1 }, { translate: `${Math.cos(a) * r}px ${Math.sin(a) * r}px`, opacity: 0, scale: 0.4 }],
      { duration: 480, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }).finished.then(() => s.remove());
  }
});
```

The pop uses the bouncy spring and never wobbles twice. The burst is the flourish: once per like, under 0.5s.
