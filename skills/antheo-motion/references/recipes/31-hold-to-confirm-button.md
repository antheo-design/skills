# 31. Hold-to-confirm button

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<button class="hold"><span class="fill" aria-hidden="true"></span><span class="label">Hold to delete</span></button>
<p id="hold-hint">Hold the button, or press Enter twice, to confirm.</p>
```

```css
.hold { position: relative; overflow: hidden; --hold: 1200ms; }
.hold .fill { position: absolute; inset: 0; background: var(--danger); transform-origin: left; scale: 0 1; transition: scale var(--dur-fast) var(--ease-out); }   /* release: drains quickly */
.hold.holding .fill { scale: 1 1; transition: scale var(--hold) linear; }       /* the fill is the progress, so it is linear and lasts as long as the intent needs */
.hold .label { position: relative; }
/* reduced motion: the fill is information, not decoration, so it stays */
```

```js
function holdToConfirm(btn, onConfirm, ms = 1200) {
  const label = btn.querySelector('.label'), text = label.textContent;
  btn.setAttribute('aria-describedby', 'hold-hint');
  let timer, armed = 0;
  const start = () => { btn.classList.add('holding'); timer = setTimeout(() => { cancel(); onConfirm(); }, ms); };
  const cancel = () => { clearTimeout(timer); btn.classList.remove('holding'); };      // letting go cancels and drains the fill
  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => btn.addEventListener(t, cancel));
  btn.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    if (e.key === ' ') return start();                                                  // Space held = pointer held
    if (Date.now() - armed < 3000) { armed = 0; label.textContent = text; onConfirm(); } // Enter twice within 3s
    else { armed = Date.now(); label.textContent = 'Press Enter again'; setTimeout(() => (label.textContent = text), 3000); }
  });
  btn.addEventListener('keyup', (e) => e.key === ' ' && cancel());
  btn.addEventListener('blur', cancel);
}
```

Only for destructive, hard-to-undo actions; where an undo toast is possible, use that instead. The keyboard path (hold Space, or Enter twice within 3 seconds) must exist and the hint must be visible text, so switch and screen-reader users are never locked out of a hold.
