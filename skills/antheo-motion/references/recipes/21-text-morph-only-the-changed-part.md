# 21. Text morph: only the changed part blurs in

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.morph .new { display: inline-block; animation: morph-in var(--dur-base) var(--ease-out) both; }
@keyframes morph-in { from { opacity: 0; filter: blur(var(--blur-sm)); } }
@media (prefers-reduced-motion: reduce) { .morph .new { animation: none; } }
```

```js
function morph(el, next) {
  const prev = el.textContent; let i = 0;
  while (i < prev.length && i < next.length && prev[i] === next[i]) i++;   // letters both share stay where they are
  const tail = Object.assign(document.createElement('span'), { className: 'new', textContent: next.slice(i) });
  el.replaceChildren(document.createTextNode(next.slice(0, i)), tail);
  el.classList.add('morph');
}
// morph(button.querySelector('.label'), 'Saved');   "Save" stays, only "d" blurs in
```

The element holds the new text at once, so screen readers read the new label. Skip it for labels that change many times a day. Call `morph` again later and the previous tail is simply replaced.
