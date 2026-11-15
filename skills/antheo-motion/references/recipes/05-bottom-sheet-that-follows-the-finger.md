# 5. Bottom sheet that follows the finger

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```js
const sheet = document.querySelector('.sheet');
const SLOP = 4;                                                     // a press becomes a drag only after 4px
let id = null, startY = 0, y = 0, dragging = false, samples = [];
sheet.addEventListener('pointerdown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  const body = e.target.closest('.sheet-body');
  if (body && body.scrollTop > 0) return;                           // a scrolled body scrolls; drag only from its top
  id = e.pointerId; startY = e.clientY; dragging = false; samples = [{ y: 0, t: e.timeStamp }];
});
sheet.addEventListener('pointermove', (e) => {
  if (e.pointerId !== id) return;
  const d = e.clientY - startY;
  if (!dragging) {
    if (Math.abs(d) < SLOP) return;                                 // still a tap
    dragging = true; sheet.setPointerCapture(id); sheet.style.transition = 'none';
  }
  y = d > 0 ? d : (1 - 1 / (-d * 0.55 / 32 + 1)) * -32;             // down follows; up gives, tiring out at 32px
  sheet.style.translate = `0 ${y}px`;
  samples.push({ y: d, t: e.timeStamp }); samples = samples.filter(s => e.timeStamp - s.t <= 100);
});
sheet.addEventListener('pointerup', (e) => {
  if (e.pointerId !== id) return; id = null;
  if (!dragging) return;                                            // a tap: let the row or button handle it
  sheet.addEventListener('click', (c) => { c.stopPropagation(); c.preventDefault(); }, { capture: true, once: true });
  const first = samples[0], last = samples[samples.length - 1];
  const v = (last.y - first.y) / Math.max(1, last.t - first.t);     // px/ms over the last 100ms
  const close = y > Math.min(64, sheet.offsetHeight * 0.15) || v > 0.11;
  // a sheet flung away for good is the one place ease-in belongs: it accelerates off-screen
  sheet.style.transition = `translate var(--dur-slow) ${close ? 'var(--ease-in)' : 'var(--ease-spring)'}`;
  sheet.style.translate = close ? '0 calc(100% + 48px)' : '0 0'; y = 0;
  if (close) sheet.addEventListener('transitionend', () => sheet.closest('dialog')?.close(), { once: true });
});
```

Also give it a handle that is a real button, and Esc: dragging is never the only way (WCAG 2.5.7). The sheet's shape
and handle are antheo-mobile's (`references/recipes.md`).
