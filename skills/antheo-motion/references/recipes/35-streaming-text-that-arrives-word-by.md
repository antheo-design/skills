# 35. Streaming text that arrives word by word through a short soft blur

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```css
.stream { min-block-size: calc(var(--lines, 3) * 1lh); overflow-anchor: none; }   /* reserve the lines so what is below never jumps */
.stream .w { animation: word-in var(--dur-fast) var(--ease-out) both; }
@keyframes word-in { from { opacity: 0; filter: blur(var(--blur-sm)); } }        /* no translate: a word never shoves its neighbours */
@media (prefers-reduced-motion: reduce) { .stream .w { animation: none; } }
```

```js
function createStream(el) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tail = '';
  el.setAttribute('aria-busy', 'true');                                            // announce the finished text, not every word
  return {
    push(chunk) {
      const parts = (tail + chunk).split(/(\s+)/); tail = parts.pop();             // hold back a half-received word
      for (const p of parts) {
        if (reduce || /^\s*$/.test(p)) { el.append(p); continue; }                  // whitespace is plain text; under reduce, show it all at once
        el.append(Object.assign(document.createElement('span'), { className: 'w', textContent: p }));
      }
      if (reduce) { el.append(tail); tail = ''; }
    },
    end() { el.append(tail); tail = ''; el.removeAttribute('aria-busy'); },
  };
}
```

Each new word lands in its final place and only its opacity and blur change, so earlier lines never move, and a new line grows into space that is already reserved. Raise `--lines` if answers are usually longer. For generated text only, never for text the person is about to act on.
