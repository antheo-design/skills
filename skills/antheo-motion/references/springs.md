# Springs

A spring moves something toward a target like a weight on an elastic band. Three numbers shape it:

| Number | Higher means | Typical UI range |
|---|---|---|
| stiffness | snappier, quicker to arrive | 300 to 600 |
| damping | less bounce | 30 to 50 calm, 18 to 24 playful |
| mass | heavier, slower, more momentum | 1 (leave it) |

**Damping ratio** decides the character: `damping / (2 × √(stiffness × mass))`. At 1 or above there's no overshoot; around 0.5 it overshoots once and settles. UI springs live between 0.55 and 1.0.

## Presets (the token generator emits one as `--ease-spring`)

| Name | stiffness / damping | Feel | Use |
|---|---|---|---|
| smooth | 380 / 40 | settles softly, no overshoot | toggles, sheets, calm products |
| snappy | 600 / 50 | quick and firm | tabs, segmented controls, technical products |
| bouncy | 420 / 22 | one small overshoot | likes, playful products, celebrations |

## CSS: `linear()` with a fallback

`linear()` draws the spring as many straight segments. Keep a cubic-bezier fallback for browsers without it:

```css
:root { --ease-move: var(--ease-out); }
@supports (transition-timing-function: linear(0, 1)) {
  :root { --ease-move: var(--ease-spring); }
}
.switch-thumb { transition: translate var(--dur-spring) var(--ease-move); }
```

Limits: the duration is fixed, and if interrupted it doesn't keep its velocity. Fine for toggles and taps; for drags use JS.

## JS: a tiny spring that keeps velocity

```js
// spring(el, from, to, onFrame): animates a number with real physics; returns stop()
export function spring({ from, to, stiffness = 380, damping = 40, mass = 1, velocity = 0, onUpdate, onDone }) {
  let x = from, v = velocity, last = performance.now(), raf;
  const step = (now) => {
    const dt = Math.min(0.032, (now - last) / 1000); last = now;   // clamp big gaps (tab switches)
    const force = -stiffness * (x - to) - damping * v;
    v += (force / mass) * dt; x += v * dt;
    onUpdate(x);
    if (Math.abs(v) < 0.01 && Math.abs(x - to) < 0.01) { onUpdate(to); onDone?.(); return; }
    raf = requestAnimationFrame(step);
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { onUpdate(to); onDone?.(); return () => {}; }
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// a released drag keeps its throw speed:
// stop = spring({ from: x, to: snapPoint, velocity: pointerVelocity, onUpdate: (x) => el.style.translate = `${x}px 0` });
```

Measure pointer velocity from the last ~80ms of `pointermove` events (distance / time), in px per second.

## When not to spring

Opacity, color, blur, and anything that should feel calm and exact (data updates, layout changes in dense tools). Springs are for **position and scale**.
