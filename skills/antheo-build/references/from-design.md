# From a design: build what is drawn

A Figma frame, an export or a screenshot is the answer to "what should this look like". The job is to build that, in
the project's own parts, and to say plainly what the design did not decide.

## 1. Get the source

- **Figma:** look for a Figma connector among the available tools first. It gives real values (sizes, colours,
  auto-layout, component names). Ask for an export only if there is none.
- **A screenshot gives proportions, not sizes.** State the scale you assumed ("2× retina, so halved") and treat every
  number read from it as an estimate.

## 2. Map before building

Write the mapping first, one line per thing the design uses. Nothing is typed as a raw value.

| The design shows | It becomes |
|---|---|
| A colour | the project's token (or the block's) within ΔE 2 (antheo-system's measure). Further off: ask, never invent |
| A text style | a type role whose size is within 2px; never a new size |
| A gap or a padding | the step of the 4px grid within 2px |
| A corner | one of the three corner sizes |
| A shadow | the `--sh-*` with the same job (a control, a card, a lifted card, a dialog), chosen by job, not by numbers |
| A component | the project's own component that does the same job, before any new markup |
| An icon | the project's icon set, by name; one that is missing is listed, never redrawn from memory |
| An auto-layout frame | flex or grid with the same direction, gap and alignment: "hug" is the content's own size, "fill" is `flex: 1` or `1fr`, "fixed" only where the design shows it can never change |

## 3. Build only what is drawn

- **A state the design does not show is not yours to design.** Hover, focus, disabled, loading, empty, error, a long
  name, the phone width: take each from the project's component or the style block, and list it under "Not drawn".
- **The change is no wider than the design.** No restyled neighbours, renamed tokens or upgraded components on the
  way. If the design needs one, say so and ask.
- **A requirement outranks a drawing.** Text under its contrast, a 20px touch target, a field with no label: build it
  to the requirement and note the design's value under "Conflicts".

## 4. Compare

Put a screenshot of the build beside the design and fix what differs:

```bash
node <antheo-review>/scripts/pixdiff.mjs design.png build.png --tolerance 4 --out diff.png
```

For a reference image that is not a pixel-exact design, use `beside.mjs` (antheo-review) instead.

## 5. Report

- The table: `element | design value | built value | matched or explained`.
- **Not wired:** controls the design draws without saying what they do.
- **Not drawn:** the states and widths the design lacks, and what was used for each.
- **Conflicts:** where the design broke a requirement, the design's value and the built one.

## Done

- [ ] The mapping written before the build; no raw value typed
- [ ] Only what is drawn was built; the diff touches nothing else
- [ ] The build compared with the design, and the differences fixed or explained
- [ ] The report has all three lists, even when one is empty
