# Mobile recipes

Copy-ready code for the rules in `SKILL.md`. Values here are the same ones; change them there first.

## 1. The viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
```

Never `maximum-scale=1` or `user-scalable=no`: people must be able to zoom (antheo-access). Fields stop zooming the
page because their text is 16px, not because zoom is off.

## 2. The native-feel base

```css
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
.app-shell { min-height: 100dvh; overscroll-behavior-y: none; }

@media (pointer: coarse) {
  input, select, textarea { font-size: max(16px, 1em); }
  :where(button, [role='button'], a, label, summary) {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  :where(button, [role='button'], [role='tab'], [role='switch']) {
    user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  }
}

.sheet, .drawer, .chat-scroll { overscroll-behavior: contain; }
```

## 3. Hover only for a mouse or trackpad

Plain CSS:

```css
@media (hover: hover) and (pointer: fine) { .btn:hover { background: var(--hover); } }
@media (pointer: coarse) { :where(.btn):active { background: var(--hover); } }
```

Tailwind v4, so every `hover:` utility is gated at once:

```css
@custom-variant hover (@media (hover: hover) and (pointer: fine) { &:hover { @slot; } });
```

`:where()` keeps the touch press at zero specificity, so any `:active` style a control sets for itself takes precedence.

## 4. A 44px hit area, look unchanged

```css
@media (pointer: coarse) {
  .hit { position: relative; }
  .hit::after {
    content: ''; position: absolute; inset-inline-start: 50%; inset-block-start: 50%;
    inline-size: max(100%, 44px); block-size: max(100%, 44px); translate: -50% -50%;
  }
}
```

Two `.hit` controls closer than 44px between centres overlap: space them, or group them into one control.

## 5. Safe areas and a bottom bar that clears the keyboard

```css
.top-bar { padding-block-start: env(safe-area-inset-top); block-size: calc(56px + env(safe-area-inset-top)); }
.bottom-bar {
  position: fixed; inset-inline: 0; inset-block-end: 0;
  padding: 12px 16px max(16px, env(safe-area-inset-bottom));
}
:root { --bottom-bar: calc(68px + max(16px, env(safe-area-inset-bottom))); }
.content { padding-block-end: calc(var(--bottom-bar) + 24px); }
```

Safari on iPhone ignores `interactive-widget` (only Chrome on Android honours it): the page keeps its full height and
the keyboard simply covers the bottom 336pt. So on iPhone the bar must be moved by script, with the visual viewport.
Ship both: the meta for Android, this for iPhone.

```js
const vv = window.visualViewport;
const place = () => {
  const covered = window.innerHeight - vv.height - vv.offsetTop;
  bar.style.translate = `0 ${-Math.max(0, covered)}px`;
};
vv?.addEventListener('resize', place);
vv?.addEventListener('scroll', place);
```

## 6. The bottom sheet

```html
<dialog class="sheet" aria-labelledby="sheet-title">
  <button class="sheet-handle" type="button" aria-label="Close"><span></span></button>
  <h2 id="sheet-title">Share project</h2>
  …
</dialog>
```

```css
.sheet {
  inset-block: auto 0; inset-inline: 0; margin: 0; inline-size: 100%; max-inline-size: none;
  max-block-size: calc(100dvh - env(safe-area-inset-top) - 24px);
  border-radius: 20px 20px 0 0; padding: 20px 20px 0;
  border-block-end: env(safe-area-inset-bottom) solid transparent;     /* the home bar, outside the padding */
  box-shadow: 0 -0.5px 0 var(--line), 0 200px 0 var(--surface);    /* top hairline; colour runs on below */
  background: var(--surface); overflow: visible; touch-action: none;
}
.sheet-handle {
  position: absolute; inset-block-start: -56px; inset-inline-start: 50%; translate: -50% 0;
  inline-size: 88px; block-size: 44px; display: grid; place-items: end center; padding-block-end: 12px;
  background: none; border: 0;
}
.sheet-handle span { inline-size: 36px; block-size: 5px; border-radius: 999px; background: white;
  box-shadow: 0 0 0 0.5px oklch(0 0 0 / 0.12), 0 1px 2px oklch(0 0 0 / 0.28); }
.sheet-handle:focus-visible { outline: none; }
.sheet-handle:focus-visible span { outline: 2px solid white; outline-offset: 3px; }
```

Its rise, fall and drag come from antheo-motion: the sheet recipe in `references/recipes/05-bottom-sheet-that-follows-the-finger.md` and `drag()` with the
close rule in `references/gestures.md`. Start a drag only after 4px of movement, and swallow the click that ends a
drag so the row it started on doesn't fire.

## 7. A table that scrolls sideways

```css
.table-frame { overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; }
.table-frame table { min-inline-size: 100%; white-space: nowrap; }
.table-frame :is(th, td):first-child { position: sticky; inset-inline-start: 0; background: inherit; }
```

Turn the sticky column off (a class from a `ResizeObserver`) when it would leave less than 88px beside it.

## 8. Find what is wider than the screen

```js
[...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > innerWidth + 1)
  .forEach(el => console.log(el, el.getBoundingClientRect().width));
```
