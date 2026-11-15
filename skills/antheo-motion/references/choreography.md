# Choreography: several things moving as one

One element animating is a transition. Several elements animating together is choreography, and it is where most
generated motion falls apart: everything fades in at once, the list jumps when an item is deleted, the panel resizes
in one frame while its contents slide. The rules below keep a group of moving things reading as one event.

## The five rules

1. **One leader.** In any change, one element moves first and furthest (the thing the person acted on). Everything
   else follows it, moves less, and finishes no later than 100ms after it.
2. **Same curve, same family.** Everything in one event shares one easing. Mixing a spring on one element with
   ease-in-out on its neighbour looks like two events.
3. **Things that stay, slide; things that come and go, fade.** A surviving item glides to its new place
   (transform). A leaving item fades and shrinks a little (opacity, `--scale-leave`). An arriving one fades and rises
   4 to 8px (`--dist-xs` to `--dist-sm`). Never slide something in from off-screen unless it lives there (a drawer).
4. **Layout changes are animated from the old box to the new one, not by animating layout properties.** Measure,
   change, invert, play (FLIP, below), or the View Transitions API.
5. **Total time stays under 400ms** for anything a person triggers; a sequence of more than 6 steps is cut to the 6
   that matter.

## Stagger

| Case | Step between items | Cap |
|---|---|---|
| A hero's 3 to 6 parts arriving once | 60 to 80ms | 6 items |
| A list's first appearance | 30 to 40ms | first 8 items; the rest appear with the 8th |
| Items after a filter | 0 (all together) or 20ms | none |
| Anything people open many times a day | none | none |

Clicks are never blocked while a stagger plays; reverse a stagger on close only if it is under 150ms in total,
otherwise close everything at once.

## Removing an item from a list (the other items close the gap)

```js
// FLIP: First (measure), Last (change), Invert (offset back), Play (animate to zero)
function removeWithFlip(list, item) {
  const others = [...list.children].filter((el) => el !== item);
  const first = new Map(others.map((el) => [el, el.getBoundingClientRect()]));
  item.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.98 }], { duration: 140, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' })
    .finished.then(() => {
      item.remove();
      for (const el of others) {
        const a = first.get(el), b = el.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (dx || dy) el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }],
          { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      }
    });
}
```

The same pattern reorders a list after sorting, moves a card between columns, and inserts an item (measure before
inserting, animate the others from their old spots, fade the new one in).

With the View Transitions API (Chrome, Edge, Safari 18+), give each item `view-transition-name: item-<id>` and wrap
the DOM change in `document.startViewTransition(() => update())`; the browser does the FLIP. Keep the fallback: if
`startViewTransition` is missing, just update.

## A panel that changes size

Animate the container's size and crossfade its contents, never both sliding:

- **Height to auto:** `interpolate-size: allow-keywords` on `:root` and transition `height`/`block-size`; the
  `grid-template-rows: 0fr → 1fr` trick where unsupported. (The motion kit turns on `interpolate-size`.)
- **Contents swap** (tab panels, step forms): old content fades out in 100ms, new content fades in over 150ms with a
  4px rise; the container's height glides over 250ms at the same time.
- **Shared element** (a card opens into a detail): View Transitions with one name on both; the container morphs, the
  text crossfades, the image keeps its aspect ratio. 300 to 400ms.

## Crossfades that look clean

- Add `filter: blur(var(--blur-xs))` to the outgoing and incoming states of a crossfade under 200ms: it hides the moment both
  are half-visible.
- **Icon swap** (copy → check, play → pause, menu → close): both icons stacked in one box; outgoing scales 1 → 0.6
  and fades, incoming 0.6 → 1 and fades in, 150ms, ease-out. The box never changes size.
- **Text and icon swaps** use `--blur-sm`; a big surface entering uses `--blur-md`.
- **Number change:** see `.tick` in the motion kit, or roll digits (recipes #11).

## Exits

- Exits use `--ease-out` too, never `--ease-in`: `--ease-in` is only for something that accelerates away for good (a toast flung off-screen).
- **Keyboard-initiated changes do not animate** (a shortcut opening a palette, arrow keys moving through a list), or use `--dur-instant`.

- An exit is shorter (about 70% of the enter) and travels less (half the distance) than its enter.
- Elements leaving the DOM need their exit to run first: `@starting-style` and `transition-behavior: allow-discrete`
  for `display`/`overlay` on dialogs and popovers (the motion kit does this), or wait for the animation's `finished`
  promise before removing.
- Toasts leave toward where they came from; dismissed by swipe, they leave in the swipe's direction at its speed.
