# 16. Theme switch without a color storm

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

```js
function setTheme(theme) {
  const root = document.documentElement;
  root.classList.add('no-transitions'); root.dataset.theme = theme;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transitions')));
}
```

```css
.no-transitions *, .no-transitions *::before, .no-transitions *::after { transition: none !important; }
```
