# 11. Numbers that roll

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.roll { display: inline-flex; gap: 0; letter-spacing: inherit; overflow: hidden; height: 1lh; font-variant-numeric: tabular-nums; } /* no gap: "$50,699" must read as one word */
.roll .col { display: flex; flex-direction: column; translate: 0 calc(var(--d) * -1lh); transition: translate var(--dur-slow) var(--ease-move, var(--ease-out)); }
```

```js
function roll(el, value) {
  const s = String(value);
  el.setAttribute('aria-label', s);                 // read the number, not the columns
  el.innerHTML = [...s].map((c) => /\d/.test(c)
    ? `<span class="col" aria-hidden="true" style="--d:${c}">${'0123456789'.split('').map((n) => `<span>${n}</span>`).join('')}</span>`
    : `<span aria-hidden="true">${c}</span>`).join('');
}
```

Roll only when the value changes meaningfully (not every poll).
