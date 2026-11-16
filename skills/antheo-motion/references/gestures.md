# Gestures and physical motion

Touch makes motion physical: a sheet is pushed, a card is flung, a toggle is flicked. People judge it by one thing:
does it behave like an object? These rules make dragged, swiped and thrown things behave like objects.

## The four laws of direct manipulation

1. **The thing stays under the finger.** While dragging, no transition, no easing: `translate` set from the pointer
   on every `pointermove`, inside `requestAnimationFrame`. Any lag reads as broken.
2. **Release keeps the speed.** When the finger lifts, the thing continues with the velocity it had, then settles
   with a spring. A thing that stops dead and then animates is the most common gesture bug.
3. **The decision uses distance or speed.** A sheet dismisses on a downward throw faster than 0.11px/ms (measured over
   the last 100ms), **or** once it has been dragged `min(64px, 15%)` of its height. Speed alone or distance alone feels wrong.
4. **Resistance at the edges.** Pulled beyond its range, the thing moves less than the finger (rubber band), and
   springs back on release.

## Wiring a drag

```css
.draggable { touch-action: none; user-select: none; } /* only on the handle or the dragged thing, never the page */
.sheet { touch-action: pan-x; }                        /* vertical drags are ours, horizontal scroll still works */
```

```js
function drag(el, { axis = 'y', min = 0, max = Infinity, onRelease }) {
  let start = 0, offset = 0, last = 0, lastT = 0, velocity = 0, raf = 0;
  const pos = (e) => (axis === 'y' ? e.clientY : e.clientX);
  // rubber band: past the range, move a third as far
  const band = (v) => (v < min ? min - (min - v) / 3 : v > max ? max + (v - max) / 3 : v);
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);              // keep the events even if the finger leaves the element
    el.getAnimations().forEach((a) => a.cancel());  // grab it mid-flight
    start = pos(e) - offset; last = pos(e); lastT = e.timeStamp; velocity = 0;
    el.style.transition = 'none';
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    const dt = e.timeStamp - lastT;
    if (dt > 0) velocity = 0.8 * ((pos(e) - last) / dt) + 0.2 * velocity; // smoothed px/ms
    last = pos(e); lastT = e.timeStamp;
    offset = band(pos(e) - start);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { el.style.translate = axis === 'y' ? `0 ${offset}px` : `${offset}px 0`; });
  });
  const end = (e) => { if (!el.hasPointerCapture(e.pointerId)) return; el.releasePointerCapture(e.pointerId); onRelease({ offset, velocity }); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
```

On release, pick the target (open, closed, the nearest snap point) and run the JS spring from `springs.md` **with the
release velocity as its starting velocity**. That is what makes a flick feel like a flick. The drag measures px per
millisecond and the spring takes px per second, so pass `velocity * 1000`:

```js
drag(sheet, { axis: 'y', min: 0, max: sheet.offsetHeight, onRelease: ({ offset, velocity }) => {
  const close = offset > Math.min(64, sheet.offsetHeight * 0.15) || velocity > 0.11; // past min(64px, 15%), or a flick over 0.11px/ms
  spring({ from: offset, to: close ? sheet.offsetHeight : 0, velocity: velocity * 1000, stiffness: 420, damping: 38,
    onUpdate: (y) => { sheet.style.translate = `0 ${y}px`; },
    onDone: () => { if (close) sheet.closest('dialog')?.close(); } });
} });
```

## Snap points

Sheets, carousels and picture-in-picture windows settle at fixed points.

- **Pick the target by projection:** where would the thing come to rest if it coasted? `projected = offset +
  velocity * 200` (px/ms × ms). Choose the snap point nearest the projection, not the current position.
- **Corners** (a floating video, a chat bubble): project in both axes, snap to the nearest corner, keep 16px from
  the edges and the safe areas.
- **CSS-only alternative** for scrolling carousels: `scroll-snap-type: x mandatory` with
  `scroll-snap-align: start`; the browser handles momentum. Prefer it whenever the content is a scroller.

## Springs by job

| Job | Spring (stiffness, damping) | Feel |
|---|---|---|
| Sheet or drawer settling | 420, 38 | firm, no bounce |
| Something thrown to a corner | 300, 28 | travels, tiny settle |
| Toggle knob, chosen pill | 600, 45 | snappy |
| Playful object, a like | 420, 22 | one small overshoot |
| Modal scale-in | 500, 40 | calm |

Never more than one visible overshoot. Under reduced motion, jump to the target or fade.

## Gesture conventions people already know

| Gesture | Means | Rule |
|---|---|---|
| Swipe a list row left/right | reveal actions or archive | reveal at 25% width, act at 60% or a fast fling; always also reachable by a button or menu |
| Pull a sheet down | close | from the handle or anywhere when scrolled to top |
| Pull to refresh | reload | only on feeds; the spinner appears after 64px of pull |
| Long press | context menu | 500ms; show a scale-down to 0.97 while pressing so people know something is coming |
| Pinch | zoom | only on images, maps, canvases; never on the page |
| Edge swipe from the left | back (iOS) | don't put your own gesture there |

**Every gesture has a non-gesture alternative** (a button, a menu item, a keyboard key); dragging is a WCAG
requirement too (2.5.7). See **antheo-access**.

## Making a web app feel native on phones

Owned by **antheo-mobile**: the symptom table (zoom, sticky hover, tap flash, safe areas, the keyboard, overscroll)
and the phone shell, sheets and tables.
