# Effects: how to build each kind of play

Each effect is a starting point. Tune its numbers against the reference or the real thing, film it, and keep the
reduced-motion version beside it. Values not in the style block are defined where they are used.

## Squash and stretch on press

The press squashes the thing wide and low at once; letting go overshoots tall, then settles. Volume is kept: when it
gets wider, it gets shorter.

```css
.toy { transition: scale 90ms ease-out; }
.toy:active { scale: 1.06 0.92; }
.toy[data-released] { animation: toy-wobble 440ms var(--ease-out); }
@keyframes toy-wobble {
  0% { scale: 1.06 0.92; } 30% { scale: 0.96 1.05; } 55% { scale: 1.02 0.98; } 78% { scale: 0.995 1.005; } 100% { scale: 1; }
}
@media (prefers-reduced-motion: reduce) { .toy:active { scale: 1; } .toy[data-released] { animation: none; } }
```

Restart the wobble on each press by toggling the attribute (or changing a React `key` on the inner element), and only
after a press, never on load.

## A ripple from the exact press point

```js
function ripple(el, event) {
  const r = el.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'ripple';
  dot.style.left = `${event.clientX - r.left}px`;
  dot.style.top = `${event.clientY - r.top}px`;
  el.append(dot);
  dot.addEventListener('animationend', () => dot.remove());
}
```

```css
.has-ripple { position: relative; overflow: hidden; }
.ripple { position: absolute; width: 8px; height: 8px; margin: -4px; border-radius: 50%; background: currentColor; opacity: 0.25;
  pointer-events: none; animation: ripple 500ms ease-out forwards; }
@keyframes ripple { to { scale: 40; opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ripple { display: none; } }
```

From the keyboard there is no point: start it from the centre.

## A spring that follows speed

For anything dragged or thrown. The spring takes the release speed, so a flick carries on and a gentle let-go settles.

```js
function spring(from, to, velocity, onFrame, { stiffness = 170, damping = 22 } = {}) {
  let x = from, v = velocity, last = performance.now(), raf;
  const step = (now) => {
    const dt = Math.min(32, now - last) / 1000; last = now;
    v += (stiffness * (to - x) - damping * v) * dt;
    x += v * dt;
    onFrame(x);
    if (Math.abs(to - x) > 0.001 || Math.abs(v) > 0.01) raf = requestAnimationFrame(step); else onFrame(to);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
```

Damping 22 to 26 with stiffness 170 settles with a small overshoot; lower damping is bouncier (keep it for toys).
Under reduced motion, jump to `to`.

## Detents that click

A knob or dial snaps to steps. Between steps it moves freely; near a step it pulls in, and the step gives a tiny
press (a 1px nudge, a tick of vibration on phones, an optional click).

```js
const STEP = 15; // degrees between clicks
function detent(angle) {
  const nearest = Math.round(angle / STEP) * STEP;
  const pull = Math.abs(angle - nearest) < 4 ? nearest : angle; // inside 4°, it snaps
  if (pull === nearest && nearest !== lastStep) { lastStep = nearest; navigator.vibrate?.(4); click?.(); }
  return pull;
}
```

## Magnetic hover and a lean towards the pointer

```js
el.addEventListener('pointermove', (e) => {
  const r = el.getBoundingClientRect();
  const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
  el.style.translate = `${dx * 6}px ${dy * 6}px`; // a short pull, never past the edge of its slot
});
el.addEventListener('pointerleave', () => { el.style.translate = '0 0'; });
```

Only for a fine pointer (`matchMedia('(hover: hover) and (pointer: fine)')`), never under reduced motion, and the
move eases back with `transition: translate 200ms`.

## Tilt and glare

A card or object leans towards the pointer and a highlight slides the other way.

```css
.tilt { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform 300ms var(--ease-out); }
.tilt::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(circle at var(--gx, 50%) var(--gy, 0%), oklch(1 0 0 / 0.35), transparent 55%); mix-blend-mode: soft-light; }
```

Set `--rx`, `--ry` (at most 10 degrees) and `--gx`, `--gy` from the pointer; reset on leave; none on touch or under
reduced motion.

## Static and grain on a screen

A screen that searches shows noise. Draw it on a small canvas, scaled up, and fade it with how far off the signal is.

```js
function staticNoise(canvas, getStrength) {
  const ctx = canvas.getContext('2d');
  canvas.width = 96; canvas.height = 64; // small, then scaled by CSS with image-rendering: pixelated or smooth
  const img = ctx.createImageData(96, 64);
  let raf;
  const draw = () => {
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    canvas.style.opacity = String(getStrength());
    raf = requestAnimationFrame(draw);
  };
  draw();
  return () => cancelAnimationFrame(raf);
}
```

Run it only while searching; under reduced motion draw one frame and keep it still. An SVG `feTurbulence` stepped
every 100ms is a cheaper alternative for a still grain.

## Shimmer across foil or a sticker

```css
.foil { position: relative; overflow: hidden; }
.foil::after { content: ""; position: absolute; inset: -50%; pointer-events: none;
  background: linear-gradient(105deg, transparent 40%, oklch(1 0 0 / 0.5) 50%, transparent 60%);
  translate: -60% 0; transition: translate 700ms var(--ease-out); }
.foil:hover::after, .foil[data-shine]::after { translate: 60% 0; }
```

Once per hover, never looping on its own.

## Numbers that roll

Each digit is a wheel of 0 to 9 (and a 0 again) seen through a window one digit tall; the wheel turns with the value.
For a continuous value (a frequency, a count-up), turn the last wheel with the fraction and the wheel to its left
only while the one beside it rolls from 9 to 0. Fade the window's top and bottom with a mask so the rolling digits
blur out at the edges. Centre each digit in its own cell (`display: flex; align-items: center; height: 1em`), so a
reader's own line height can't shift the wheel.

## A small burst

For a finish only (antheo-moment): six to ten particles from the press point, each with its own angle and distance,
fading as they travel; invisible until the check has drawn, gone in under 700ms.

```js
function burst(x, y, host, colors) {
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('i');
    const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4, d = 24 + Math.random() * 18;
    p.className = 'bit';
    p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px`;
    host.append(p); p.addEventListener('animationend', () => p.remove());
  }
}
```

```css
.bit { position: absolute; width: 5px; height: 5px; border-radius: 50%; pointer-events: none; animation: bit 600ms var(--ease-out) forwards; }
@keyframes bit { to { translate: var(--tx) var(--ty); opacity: 0; scale: 0.4; } }
@media (prefers-reduced-motion: reduce) { .bit { display: none; } }
```

## A character that reacts

A small character (pixel, flat or drawn) has three to five states named by what happens, not how it looks:
`listening`, `searching`, `resting`, `pleased`, `puzzled`. Each state is a pose plus at most one loop (a nod, a
look-around, a breath, a blinking "z"). It reacts within a frame of the event, it's `aria-hidden`, and under reduced
motion it changes pose without the loop. Eyes that follow the pointer move at most 1 to 2px and only with a fine
pointer.

## A click with Web Audio (opt-in)

```js
let audio;
function click(pitch = 1800) {
  audio ??= new AudioContext();
  const o = audio.createOscillator(), g = audio.createGain();
  o.frequency.value = pitch; o.type = 'triangle';
  g.gain.setValueAtTime(0.08, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.05);
  o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.06);
}
```

Off by default, switched on by the person, played only after a real press, never on load, never louder than a tap.

## Idle life

A breath (scale 1 to 1.015 over 3 to 4s), a blink every 3 to 6 seconds at random, a sparkle that twinkles in turn.
Stop it when the element is off screen (`IntersectionObserver`), give anything over five seconds a pause control,
and drop it under reduced motion.
