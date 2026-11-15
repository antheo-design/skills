# Advanced motion

Read this when the basics (tokens, transform and opacity, recipes) are in place and you need to pick the right engine, build something three-dimensional, tie motion to scroll or navigation, or find out why something feels off.

## Transforms in depth

- **Percentages in `translate` are of the element's own size**, not its parent's. `translate: 0 100%` moves an element down by exactly its own height, whatever that is. This is how a toast leaves "just off its own edge" and how a drawer starts fully hidden without knowing its width. `top: 100%` is relative to the parent, so the two behave differently.
- **`scale()` scales everything inside**: children, text, border widths, border radius, shadows. A button scaled to 1.2 has 1.2x thicker borders and blurrier text. Either animate a wrapper and leave the content alone, or counter-scale the child: `.child { scale: calc(1 / var(--s)); }` with the parent's `--s` set from the same variable. For layout-sized change, use FLIP (choreography.md) instead of scale.
- **Order matters** in the `transform` shorthand (`translate() rotate()` is not `rotate() translate()`). The individual properties `translate`, `rotate` and `scale` always apply in a fixed order (translate, rotate, scale) and let you animate each separately. Prefer them.
- **`transform-origin`** decides what stays still. A menu grows from its trigger's corner; a rotating hand turns around its pivot; percentages here refer to the element's own box.
- **End on whole pixels at rest.** A fractional translate on text leaves it blurry. Finish animations at `translate: 0` or `scale: 1`, not at 0.5px.

### 3D: perspective, flips and tilts

```css
.scene { perspective: 800px; }                              /* on the parent: shared vanishing point; lower = stronger depth */
.card { transform-style: preserve-3d; transition: rotate var(--dur-slow) var(--ease-in-out); }
.card[data-flipped] { rotate: y 180deg; }
.face { position: absolute; inset: 0; backface-visibility: hidden; }
.back { rotate: y 180deg; }                                 /* the back face starts turned away */
@media (prefers-reduced-motion: reduce) { .card { transition: none; } }
```

- Put `perspective` on the parent (or use `perspective()` first in a transform). Without it a rotation looks flat.
- A flip needs **both faces** with `backface-visibility: hidden`, the back pre-rotated 180deg, and `preserve-3d` on their container. `overflow: hidden` or `filter` on a parent flattens the 3D, so keep them off the scene.
- **Tilt toward the pointer** is a hover effect: at most 6deg, `perspective` 800 to 1200px, desktop pointers only, and it eases back on leave. Set `rotate` from `pointermove` inside `requestAnimationFrame` and add the transition only for the return.
- Under reduced motion, a flip becomes a crossfade between faces.

## Transitions, Web Animations, or JS springs

| Engine | Strong at | Under a busy main thread |
|---|---|---|
| **CSS transitions** | state changes that people toggle fast; they retarget and reverse smoothly | `transform` and `opacity` keep running on the compositor, so they stay smooth even when script is busy |
| **CSS keyframe animations** | one-off sequences, loops, entrances | same: compositor for transform and opacity; restarts instead of reversing |
| **Web Animations API** (`el.animate`) | CSS-grade performance with script control: dynamic values, `finished` promises, `reverse()`, `commitStyles()`, many elements started from JS | same compositor benefit for transform and opacity |
| **JS springs** (rAF, `springs.md`) | gestures that must keep velocity, interruptible physics, values CSS cannot express | runs on the main thread: it stutters exactly when the page is busy |

Rule of thumb: default to a CSS transition; use WAAPI when JS must start, await or cancel it; use a JS spring only when a gesture hands over its release velocity or the value must be interrupted and redirected continuously. If you need a spring and the main thread is busy, sample the spring into a `linear()` easing or a list of keyframes and let the compositor play it. Whatever the engine, animate only compositable properties, and read layout before writing it.

## Scroll-driven animation

```css
@supports (animation-timeline: scroll()) {
  .progress { transform-origin: left; scale: 0 1; animation: grow linear both; animation-timeline: scroll(root); }
  @keyframes grow { to { scale: 1 1; } }
  .reveal { animation: rise linear both; animation-timeline: view(); animation-range: entry 0% entry 40%; }   /* rise: recipes #10 */
}
@media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }
```

- `scroll()` ties progress to a scroller's position; `view()` ties it to an element crossing the viewport; `animation-range` picks which part of that crossing plays.
- The effect runs off the main thread where supported, so it beats a scroll listener for smoothness.
- It is **progressive enhancement**: wrap it in `@supports` and make sure the content is fully visible and usable without it.
- Keep travel small, tie only decorative motion to scroll, and never hide content that people must read until it scrolls in. A reading progress bar and a header that gains a border are the safe uses.

## View Transitions for page navigation

```css
@view-transition { navigation: auto; }                       /* same-origin, multi-page: both pages opt in */
::view-transition-old(root), ::view-transition-new(root) { animation-duration: var(--dur-page); animation-timing-function: var(--ease-in-out); }
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation-duration: 1ms; } }
```

- **Same document** (single-page apps): `document.startViewTransition(() => updateDom())`, with a plain update when the method is missing.
- **Between pages**: the `@view-transition` rule above plus `view-transition-name` on elements that should travel (a product image to its detail page). Names must be unique at the moment of the transition.
- By default the whole page crossfades. Give the pieces that persist (header, nav) their own name so they stay put while the content changes.
- Page and shared-element moves can use up to the page token (450ms). A navigation people repeat all day (switching between inbox folders) should be faster or skip the transition. A keyboard-triggered navigation stays instant.
- The browser captures screenshots, so the page is not interactive for the length of the transition: keep it short and never chain them.

## How to film and step through motion

You cannot judge motion from a still frame, and not reliably at full speed either.

1. **Slow it down.** Chrome DevTools, three-dot menu, More tools, **Animations**: it records every animation and transition that runs while it is open, lets you scrub, and slows playback to 25% or 10%. From the console, slow everything that is running: `document.getAnimations().forEach((a) => a.updatePlaybackRate(0.1))`.
2. **Record and step.** DevTools, **Performance**, enable *Screenshots*, record the interaction, then click along the frames. Look for long tasks, layout blocks purple during a transform animation, and dropped frames. Repeat with **CPU 4x slowdown**.
3. **Film it.** Screen-record at 60fps (OS recorder, or a phone filming a phone for touch), then step through the file frame by frame. Check: does anything jump on the first or last frame, does the exit end on the same pose as the enter began, does anything move that should be still, do two things move in different directions.
4. **Interrupt it.** Trigger it twice quickly, then reverse mid-flight. A transition should turn around smoothly; a keyframe animation that snaps shows up here.
5. **Check the ends.** Pause on the first and last frame: are they pixel-identical to the static states? Is text sharp?

## Review it the next day

Motion is judged by feel, and feel is poor on the day you built it, because you have watched it fifty times and know what it means.

- Come back the next day, open the page cold, and use it at normal speed on the device real people will use. Notice what you wanted to skip.
- Say the reason sentence for each animation ("This moves so the person understands ______"). If you cannot, cut it.
- Remove one thing. Most motion passes improve by subtraction.
- Show it to someone and say nothing. If they ask what just happened, it was too fast, too small, or in the wrong place; if they say "oh, that's slow", it was too long.
- Run the Whole-app review in SKILL.md before approving.
