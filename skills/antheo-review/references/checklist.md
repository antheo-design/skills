# Full audit checklist

✓ = check-page (or latency-probe, where named) measures it. The rest you check by hand.

## Access (WCAG 2.2 AA)

**Perceivable**
- [✓] Text contrast 4.5:1 (3:1 for 24px+ or 18.66px bold), in light and dark
- [ ] Non-text contrast 3:1: input borders, focus rings, icons that carry meaning, chart marks
- [✓] Images have `alt` (empty for decoration)
- [ ] Color is never the only signal (errors, status, charts, links in text)
- [ ] Text resizes to 200% without loss; reflow at 320px without horizontal scroll (1.4.10)
- [ ] Text spacing can be increased (line-height 1.5, paragraph spacing 2×) without clipping (1.4.12)
- [ ] Captions/transcripts for audio and video

**Operable**
- [✓] Everything reachable by keyboard; visible focus (2.4.7) that isn't hidden under sticky headers (2.4.11)
- [ ] No keyboard traps; Esc closes overlays; focus returns to the trigger
- [ ] Every button answers its press with something visible: nothing wired to nothing (the access probe's check 7)
- [ ] Logical focus order; skip link to main content on pages with long navigation
- [✓] Targets at least 24×24px (2.5.8); 44×44 for primary touch controls
- [ ] Dragging has a single-pointer alternative (2.5.7): buttons, menus, keyboard
- [ ] Nothing flashes more than 3 times per second
- [✓] Auto-moving content longer than 5s can be paused (2.2.2); motion respects reduced-motion
- [ ] No time limits, or they can be extended

**Understandable**
- [✓] `lang` on `<html>`
- [✓] Every field has a visible label; placeholders are examples, not labels
- [ ] Errors identified in text, with how to fix (3.3.1, 3.3.3); announced
- [ ] Don't make people re-enter information they already gave (3.3.7)
- [ ] Sign-in doesn't require solving puzzles or remembering passwords without paste/managers (3.3.8)
- [ ] Help is in the same place on every page (3.2.6)
- [ ] Navigation and naming consistent across pages

**Robust**
- [✓] Controls have accessible names
- [ ] Custom widgets follow the ARIA Authoring Practices pattern (roles, states, keys)
- [ ] Status messages announced via live regions without moving focus (4.1.3)
- [✓] One `<h1>`; headings in order; landmarks (`main`, `nav`, `header`, `footer`)

## Layout

- [✓] No horizontal scroll at every checked width: 320, 390, 768, 1024, 1280, 1440, 1920
- [ ] Phone layout designed, not squeezed; primary actions within thumb reach
- [✓] Body text 13px in product UI on a desktop, 15px on a phone, 16px for long reading and in fields on touch; never under 12px; line height ≥ 1.4; lines ≤ ~75 characters
- [ ] One primary action per region; hierarchy passes the squint test
- [ ] Controls look like controls (fill, edge, underline or chevron) and nothing else does; known choices are shown as options, not typed from memory
- [ ] Group spacing: inside < half of between
- [ ] Content widths from the block: a form `--w-form`, settings `--w-settings`, pricing `--w-pricing`, data `--w-data`, prose `--measure`
- [ ] Sticky elements don't cover content or focus

## The look (components and app screens, in the Quiet preset; with the project's own system, check it against that system instead)

- [ ] No costume: no serif or display face inside, no paper or texture, no stamps, no dashed borders, no uppercase tracked labels, no brown or brand-tinted neutrals (antheo-direction `references/slop.md` C1 to C7); a drawn object (`data-object`) keeps its own material inside its edge, and is judged beside its reference instead (antheo-surface `references/objects.md`)
- [ ] Chrome chroma ≤ 0.01; the accent is the ink or one brand signal; colour comes from content
- [ ] 13px body, 12px meta, a 15px title at weight 550, two text tones; 32px controls; corners 10/6/4; cards with no outline, hairlines only between repeating rows; at most 2 tags and 4 accent things
- [ ] The side-by-side test: next to the project's best component (or a reference piece) at 100%, light and dark, nothing is louder, larger, browner or busier
- [ ] A signature moment only if one was asked for, and then named and finished (anticipation, response, finish); everything else under 200ms
- [ ] The demo content is real and varied

## Consistency

- [✓] ≤ 4 text sizes on an app screen (5 in a marketing section), 1 family (plus mono for code), 2 weights
- [✓] ≤ 10 text colors (usually 4 to 6 roles)
- [✓] ≤ 3 corner sizes (plus fully round for switches and avatars); nested radii = outer − padding
- [✓] Spacing on the 4px scale
- [ ] One icon set and stroke weight; icons sized 16/20/24
- [ ] Buttons and inputs on one row share a height
- [ ] Same component looks the same everywhere

## Content and states

- [ ] Loading (skeletons shaped like content), empty (first use / no results / done), error (inline, retry), success
- [ ] Long names, missing images, 0/1/100 items handled (fixtures and state switcher: antheo-stress `references/harness.md`)
- [ ] Sentence case, verb buttons, specific errors, no filler words
- [ ] No invented proof or numbers; sample data looks real
- [ ] Dates, numbers and currency formatted with `Intl`; tabular numerals in tables

## Motion

- [ ] Each animation explains a change; nothing animates on load except one entrance
- [ ] Popovers grow from their trigger; exits faster than entrances
- [✓] No `transition: all`; endless loops stop under reduced motion
- [ ] Hover effects gated to hover-capable devices
- [ ] Clicking twice fast reverses smoothly (latency-probe reports a swallowed second press)
- [✓] Drags follow the pointer: 0 to 2px drift per frame, fail over 8px (`latency-probe.mjs`)

## Performance

- [✓] No console errors
- [✓] Interaction feedback within 100ms of the press (`latency-probe.mjs`); [ ] INP ≤ 200ms
- [ ] Images sized and `loading="lazy"` below the fold; `aspect-ratio` reserved (no layout shift)
- [ ] Fonts: ≤ 3 weights loaded, `font-display: swap`, fallback metrics adjusted
- [ ] Animations only on transform/opacity; smooth at 4× CPU throttle

## Dark mode

- [✓] Contrast passes in dark too
- [ ] Surfaces lighten with elevation; no pure black/white; saturated colors toned down
- [ ] Images and illustrations look right on dark
