---
name: antheo-critique
description: A second pair of eyes on a screenshot, a Figma frame, a page or code. It says in one line what the screen is for, lists the problems anyone could see, raises the matters of taste as questions, names what works, and suggests a few experiments, without redesigning until the person picks a direction. Use for "what do you think?", "critique this", "why does this feel off?", "be honest", feedback on AI-generated UI, or any early design where the person wants to think, not get a fix list.
---

# Antheo Critique

Most people can tell when a screen is off and can't say why. A critique names the why, separates what is clearly
wrong from what is a choice, and leaves the person thinking better about the next version. It does not redesign:
the person directs, then the owning skill builds.

A ship verdict with measured findings belongs to **antheo-review**; explaining how something was built to
**antheo-explain**. Each point is tagged with the Antheo skill that owns its fix.

## Decide in this order

1. **Look first.** Work from what you can see: a screenshot, a frame, a running page, the code. If one image shows
   more than one screen, say which you mean. Say whether it is a phone or a desktop.
2. **Its one job.** One line: who it is for and what they are trying to do here. If you can't tell, say your guess
   and ask before going on.
3. **Structure, then looks.** When something feels wrong, look at the system first (type sizes, alignment, spacing, corner
   and colour roles), then the style. Style expresses order; it can't stand in for it.
4. **Split what you see** into problems anyone could point at, and choices that depend on taste or context, which
   become questions.
5. **Pick what matters.** The few points that would improve the next version most, starting with anything that
   blocks the job.
6. **Stop before redesigning.** Offer experiments; wait for the person to choose.

## Facts are stated, judgement is asked

- **A fact** is visible and breaks a rule an Antheo skill states: say it plainly, with where and what. "The
  price is 13px, the same as its label, so nothing leads (antheo-type)."
- **A question** is a choice that could go either way: ask the one that probes the intent. "Should the plan
  name lead, or the price? Right now they compete (antheo-layout)."
- **Never invent a problem** to fill the list. Nothing visible, nothing said.
- **Estimates are labelled.** Contrast and sizes read from a screenshot are estimates: "looks under 4.5:1
  (estimate)", and never presented as measured. Convert screenshot pixels to CSS pixels by the device scale before
  quoting a size.

## The lenses

Run them together, quietly; tag each point with the one that saw it.

| Lens | Asks | Owner |
|---|---|---|
| Job | Does everything on screen serve the one job? What could go? | antheo-build |
| Direction | Is there one real decision, or a template with a costume? | antheo-direction |
| Type | Does the eye know where to start? Two tones, few sizes? | antheo-type |
| Colour | Does colour mean something, or decorate? Does text read? | antheo-color |
| Layout | Do edges line up? Does space group, or do boxes? | antheo-layout |
| Depth | Is depth doing work, or noise? Do dark surfaces read? | antheo-surface |
| Quiet | How many text sizes, weights, corner sizes, outlines, tags, dividers and coloured things? Would anyone miss each? | antheo-build |
| Controls | One primary? Every state? Does each control look like what it does? Are the choices shown, not remembered? | antheo-components |
| Numbers | Do figures align, compare and format? | antheo-data |
| Words | Does every label say what happens? | antheo-writing |
| Motion | Does movement explain, or perform? | antheo-motion |
| Access | Can it be used without a mouse, without colour, zoomed? | antheo-access |
| Touch | Does it fit a thumb on a phone? | antheo-mobile |

## The answer

```
Read: a pricing page for small teams choosing between three plans (desktop).

Clearly off
1. Three filled buttons, one per plan, so none is recommended (antheo-components).
2. Feature rows on the middle card sit 4px lower than on the others (antheo-layout).
3. Grey feature text looks under 4.5:1 on the tinted card (estimate) (antheo-color).

Worth asking
4. Should the yearly price lead, with monthly as the note? Right now both are 32px (antheo-type).
5. Is the gradient on "Pro" carrying meaning, or decoration? (antheo-direction)

Working
- The plan names are verbs of the job ("Start", "Grow", "Run"): keep them.

Try
- One filled button, on the plan most teams pick; the others raised.
- Yearly price at 32px, monthly at 13px beneath.
```

At most seven facts and questions together; at most three experiments. Be direct and warm: no hedging, no generic
praise ("clean", "modern"); when something works, explain what makes it work. Don't speak for anyone or quote real designers.

## After the person chooses

Hand the chosen direction to the owning skill (antheo-build routes it), and the finished result to antheo-review for
the verdict. Record a correction or a praise in `design/taste.md` (antheo-system) when the person states a taste.

## Done

- [ ] Worked from what is visible; the screen named; phone or desktop said
- [ ] The job stated in one line, or asked
- [ ] System checked before style
- [ ] Facts stated, questions asked, each tagged with its owner; estimates labelled
- [ ] At most seven points and three experiments; something that works named, with why
- [ ] Nothing redesigned before the person chose
