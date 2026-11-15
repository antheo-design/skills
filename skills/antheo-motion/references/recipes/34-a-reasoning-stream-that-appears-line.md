# 34. A reasoning stream that appears line by line and can be collapsed

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<section class="reasoning" data-open="true">
  <button aria-expanded="true" aria-controls="r-body">Thinking…</button>
  <div class="r-fold"><div id="r-body" class="r-body"></div></div>
</section>
```

```css
.r-fold { display: grid; grid-template-rows: 1fr; transition: grid-template-rows var(--dur-base) var(--ease-out); }
.reasoning[data-open="false"] .r-fold { grid-template-rows: 0fr; transition-duration: var(--dur-fast); }
.r-body { min-block-size: 0; max-block-size: 12lh; overflow-y: auto; color: var(--text-2); }
.r-line { animation: r-in var(--dur-base) var(--ease-out) both; }
@keyframes r-in { from { opacity: 0; translate: 0 var(--dist-xs); } }
@media (prefers-reduced-motion: reduce) { .r-line { animation: none; } .r-fold { transition: none; } }
```

```js
function addLine(body, text) {
  const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;     // follow only if the reader is already at the bottom
  body.append(Object.assign(document.createElement('p'), { className: 'r-line', textContent: text }));
  if (atBottom) body.scrollTop = body.scrollHeight;
}
btn.addEventListener('click', () => { const o = section.dataset.open !== 'true'; section.dataset.open = o; btn.setAttribute('aria-expanded', o); });
// when the answer is ready: set the label to "Thought for 6s" and collapse it, so the answer takes the space
```

Lines arrive at their natural pace, so no stagger delay is added. The header is a real button with `aria-expanded`. Don't use `aria-live` on the stream: announce the label, not every line.
