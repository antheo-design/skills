# 24. Input clear button that dissolves the text

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<div class="clearable"><input id="q" type="search" placeholder="Search"><span class="ghost" aria-hidden="true"></span><button type="button" class="clear" aria-label="Clear search" hidden>×</button></div>
```

```css
.clearable { position: relative; }
.clearable .ghost { position: absolute; inset: 0; padding: inherit; font: inherit; pointer-events: none; white-space: pre; overflow: hidden; opacity: 0; }
.clearable .ghost.go { animation: dissolve var(--dur-fast) var(--ease-out) both; }
@keyframes dissolve { from { opacity: 1; } to { opacity: 0; filter: blur(var(--blur-sm)); } }
.clear { transition: opacity var(--dur-fast) var(--ease-out), scale var(--dur-fast) var(--ease-out); }
.clear[hidden] { display: block; opacity: 0; scale: var(--scale-pop); pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .clearable .ghost.go { animation: none; } .clear[hidden] { scale: none; } }
```

```js
const q = document.getElementById('q'), ghost = q.nextElementSibling, clear = ghost.nextElementSibling;
q.addEventListener('input', () => { clear.hidden = !q.value; });
clear.addEventListener('click', () => {
  ghost.textContent = q.value; ghost.classList.remove('go'); void ghost.offsetWidth; ghost.classList.add('go');   // the old text lingers as a ghost
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); q.focus();                                // the real field is already empty
});
```

The ghost needs the input's exact padding and font. Focus goes back to the field. A hidden button that is `display: block` must also be unreachable: add `tabindex="-1"` while hidden, or use `inert`.
