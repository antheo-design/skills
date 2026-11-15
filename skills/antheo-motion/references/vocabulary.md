# Motion vocabulary: what it's called, and how to build it

People describe motion in plain words; code needs the pattern's name and recipe. Find the description on the left,
use the name in your plan, build it from the recipe.

| Someone says | It's called | Build it with |
|---|---|---|
| "the button shrinks a bit when I press it" | press feedback | `:active { scale: var(--scale-press) }`, 100ms (motion kit) |
| "the menu grows out of the button" | origin-aware popover | `transform-origin` at the trigger, `--scale-pop` → 1 + fade (recipes #3) |
| "the dialog fades and zooms in a little" | scale-fade enter | `@starting-style`, scale 0.97 → 1 (motion kit; `--scale-pop` in your own) |
| "the panel slides in from the side" | drawer / sheet | translate from its edge, 300ms in and 200ms out (recipes #5) |
| "the underline slides to the tab I click" | shared indicator / glide | one indicator moved with translate (recipes #8, `.glide`) |
| "the other items close the gap when I delete one" | layout animation / FLIP | `choreography.md` |
| "the card expands into the full page" | shared-element transition / morph | View Transitions (recipes #15) |
| "things appear one after another" | stagger | 30 to 40ms steps for lists, 60 to 80ms for a hero's 3 to 6 parts, capped (`choreography.md`) |
| "the number counts up / rolls" | number roll / ticker | recipes #11; `.tick` for small changes |
| "the checkmark draws itself" | stroke draw | `stroke-dashoffset` 1 → 0 (`.draw`) |
| "the field shakes when it's wrong" | error shake | 3 cycles, 4px, 300ms total (recipes #13) |
| "the grey boxes shimmer while loading" | skeleton | recipes #14, no shimmer under reduced motion |
| "it bounces a little when it lands" | spring with overshoot | the "bouncy" spring, one overshoot (`springs.md`) |
| "I can throw it and it keeps going" | momentum / inertia | release velocity into a spring (`gestures.md`) |
| "it sticks to the corners" | snap points | projection + nearest point (`gestures.md`) |
| "it stretches when I pull too far" | rubber band / overscroll | a third of the overshoot (`gestures.md`) |
| "it follows my mouse slightly" | pointer parallax / tilt | ≤ 6° rotate, pointer devices only, off under reduced motion |
| "it changes as I scroll" | scroll-driven animation | `animation-timeline: view()` (recipes #17) |
| "the page doesn't flash white between pages" | page / view transition | `@view-transition { navigation: auto }` |
| "the icon morphs from hamburger to X" | icon swap / morph | stacked icons crossfade with scale and blur (`choreography.md`) |
| "the toast slides up and stacks" | toast stack | recipes #6; for a collapsing stack see recipes #27 |
| "the text appears word by word" | text reveal / streaming | per-word opacity, 20 to 30ms steps, only for generated text |
| "the hover feels gentle leaving" | hover | 150ms in and out, never delayed (recipes #2) |
| "the background color glides when I switch theme" | theme transition | suppress transitions for one frame (`.no-motion`); it should *not* glide |

| "the heart pops and sparks fly" | like with a burst | recipes #19 |
| "the checkbox draws its tick" | checkbox draw | recipes #20 |
| "only the new letters fade in" | text morph | recipes #21 |
| "the old number floats away, the new one arrives" | soft value swap | recipes #22 |
| "a count pops in" / "a badge appears" | number pop-in / badge entrance | recipes #23, #29 |
| "the text dissolves when I clear" | clear dissolve | recipes #24 |
| "the plus turns into a menu" | plus-to-menu morph | recipes #25 |
| "avatars lift like a wave" | avatar row hover | recipes #26 |
| "notifications fold behind each other" | banner stack | recipes #27 |
| "the ring changes smoothly" | ring morph | recipes #28 |
| "the arrow nudges on hover" | learn-more link | recipes #30 |
| "press and hold to confirm" | hold-to-confirm | recipes #31 |
| "the image wipes open" | clip-path reveal | recipes #32 |
| "Thinking… shimmers" / "it shows its reasoning" / "words stream in" | AI status, reasoning stream, streaming text | recipes #33 to 35 |
| "the flip card", "the tilt", "it moves as I scroll", "page slides" | 3D transform, scroll-driven, view transition | `advanced.md` |

If the description doesn't match a row, name it by **what changes** (position, size, opacity, shape, color) and
**what triggers it** (press, hover, appear, leave, scroll, drag, data change), then pick the closest recipe.
