# Motion performance: 60 frames a second, on a cheap phone

Smooth motion is a budget: at 60fps the browser has 16.7ms per frame (8.3ms at 120Hz) for your script, styles,
layout, paint and compositing. Stay inside it by choosing what you animate and when.

## What is cheap and what is not

| Animating | Cost | Use |
|---|---|---|
| `transform` / `translate` / `scale` / `rotate`, `opacity` | compositor only: cheap | always prefer these |
| `filter` (blur) on a small element, `clip-path` | paint each frame; fine small and short | crossfade seams, reveals under 200ms |
| `color`, `background-color`, `border-color` | paint, no layout | state changes |
| `box-shadow` | paint, large areas are expensive | animate the opacity of a pseudo-element that carries the shadow instead |
| `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size` | layout every frame: expensive | never for motion; FLIP or `interpolate-size` for height |
| `backdrop-filter` | very expensive on large areas | small floating chrome only, never animate it |

## Rules

1. Animate transform and opacity. For a moving shadow, put the shadow on `::after` and animate its opacity.
2. **Don't read layout in the middle of writing it.** Batch reads (`getBoundingClientRect`) before writes (style
   changes) in a frame; never alternate them in a loop.
3. **`will-change`** only on something about to animate, only for the duration (add on `pointerdown`, remove on
   `transitionend`). Left on dozens of elements it costs memory and can make things slower.
4. **Pause what isn't seen:** stop loops and canvases off-screen (`IntersectionObserver`) and in hidden tabs
   (`document.visibilityState`); never animate under a modal.
5. **Long lists:** virtualize past ~200 rows (only render what is visible); `content-visibility: auto` with
   `contain-intrinsic-size` on long pages; don't stagger more than 8 rows.
6. **Scroll-linked effects** use CSS scroll-driven animations (`animation-timeline: scroll()` / `view()`) where
   supported; they run off the main thread. With JS, listen `passive` and update in `requestAnimationFrame`.
7. **Images and fonts** that load during an animation cause jank: give images `width`/`height`, preload the hero
   font, `font-display: swap`.
8. **Canvas and WebGL:** cap the device pixel ratio at 2, stop rendering when nothing changes, and stop off-screen.

## How to check

1. DevTools → Performance → enable **CPU 4× slowdown**, record the interaction, look for long tasks (red corners)
   and purple Layout blocks during the animation. Any layout during a transform animation is a bug.
2. DevTools → Rendering → **Paint flashing**: during the animation, only the animated element should flash; if the
   whole page flashes, something is painting that shouldn't.
3. **Layer borders** (Rendering panel): an animated element should get its own layer while moving.
4. On a real mid-range Android phone if possible: open the menu, scroll the list, drag the sheet, 10 times each.
5. The page check (**antheo-review**) flags transitions on layout properties, `transition: all`, more than six
   elements animating on load, and motion longer than 450ms (the page token).

## Symptoms and causes

| Symptom | Usual cause | Fix |
|---|---|---|
| Animation stutters on phones only | animating layout or a big shadow/blur | transform/opacity; shadow on a pseudo-element |
| First frame jumps | `display: none → block` with no starting style | `@starting-style`, or start from the end state's transform |
| Drag lags behind the finger | a CSS transition left on the dragged element; work in `pointermove` | `transition: none` while dragging; rAF; pointer capture |
| Scroll janks on a long page | scroll listener doing layout; images without size | passive listeners, rAF, sizes on images, `content-visibility` |
| Everything slows after a while | an endless loop or canvas still running off-screen | pause off-screen and in hidden tabs |
| Text looks blurry after scaling | text left on a scaled layer | end at `scale: 1`; avoid fractional translate on text at rest |
