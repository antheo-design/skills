# The Antheo report

Every Antheo skill that checks something (review, access, color, writing, stress, motion-audit, system's report
mode) answers in this one format, so findings from different skills can be merged, sorted and compared. antheo-critique
is the exception: it asks questions instead of filing findings.

## 1. The verdict comes first

| Skill | Verdict line |
|---|---|
| antheo-review | `Ready to ship: no. <the worst problem in one sentence> (1 blocker, 2 high, 3 medium).` |
| any other checking skill | `Block: <the worst problem> (2 high, 1 medium).` or `Approve (3 medium, 1 low).` |

**Block** when there is any blocker or high finding; **Approve** otherwise. An inferred high finding makes it
`Block, pending <the check that settles it>`.

## 2. One finding

```
[high] <screen or file> · <element by its role and words> (<evidence: screenshot, width-theme, tool>)
Seen: what is there, measured where it can be.
Why: what it costs the person here.
Fix: <before> → <after>.        Where: src/path/file.tsx:84
```

- **Seen** is a fact anyone can check: "the label is 12px from its field and 8px from the next one, at 390px". Never
  a feeling ("the spacing feels tight").
- **Fix** gives the exact value before and after, so a reader can apply it without asking. The cheapest fix: delete,
  then the platform's own element, then an existing token, then the correct value, and only then add something.
- A finding that was inferred, not seen, says so and is written as the check that would settle it.
- One cause, one finding: fourteen pages with the same unnamed button are one finding in the shared component.
- **Where** is `file:line`, and Seen quotes the code as it is now; a finding with no place can't be acted on. A
  number not measured is not a finding: measure it, or list it under `Not verified` with the check that would
  settle it.

## 3. Severity

| Severity | Means |
|---|---|
| **blocker** | someone can't finish the job, or sees at once that it's broken |
| **high** | the job is hard or error-prone; a WCAG A or AA failure |
| **medium** | it works but looks or reads unfinished |
| **low** | polish |

A rule from a convention rather than a standard or a broken task is never above medium.

## 4. Cap the list

At most 15 findings, by severity, never padded to reach it. Problems that were there before the change go in a
separate list, at most three.

## 5. Close

1. Up to three things that work and should be kept, each with why.
2. Decisions that belong to a person, as questions.
3. `Not checked:` every width, theme, state, language and flow nobody looked at. Something nobody looked at is not
   approved.
4. `Not verified:` every check that was meant to run and couldn't (no browser, a login, an unreachable state),
   with why. It is never counted as a pass.
5. `Degraded:` if the visual and measured reviews couldn't be kept apart, say so on the first line.

## A table, when many findings share one shape

Value-level findings (a list of durations, contrast pairs or strings) may be written as a table instead of blocks:

| Severity | Where | Before | After | Why |
|---|---|---|---|---|
| high | `menu.css:41` | `transition: all 300ms` | `opacity, scale 150ms var(--ease-out)` | opened many times a day |
