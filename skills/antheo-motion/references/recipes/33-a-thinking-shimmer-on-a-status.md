# 33. A "thinking" shimmer on a status label

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```html
<p class="thinking" role="status">Thinking…</p>
```

```css
.thinking { color: var(--text-2); }
@media (prefers-reduced-motion: no-preference) {
  .thinking { background: linear-gradient(90deg, var(--text-2) 35%, var(--text) 50%, var(--text-2) 65%) 100% 0 / 250% 100% no-repeat;
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: think 1.8s linear infinite; }
  @keyframes think { to { background-position: 0 0; } }
}
```

The words carry the meaning (`role="status"` announces them once); the shimmer is only the sign of life. Under reduced motion it is plain muted text. Remove the class the moment the answer starts.
