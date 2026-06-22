---
name: flow-explore
description: >
  Use after the ticket is understood (and design captured, if any), to explore the
  codebase before planning. This is the divergent phase: map where the relevant code
  lives and how it flows, then surface multiple viable options to solve the ticket —
  not a single answer. Records the context map and options in the ticket's .specs
  discoveries.md with file:line evidence, updates state.md, and hands off to flow-plan
  where the developer decides. Trigger on "explore the codebase", "what are the
  options", "how could we solve AB-1234", or entering the explore phase.
---

# flow-explore

The divergent phase. Build a broad picture of the relevant code and surface
*options* — not a decision. Choosing among them happens in `flow-plan`, and it is
the developer's call.

## Before you start

- `understanding.md` should be filled. If the problem and acceptance criteria are not
  captured yet, run `flow-understand` first.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md`, `understanding.md`, and
  `context.md`.

## Mindset

Diverge before converging. Aim for breadth: understand the full context, then lay
out more than one viable way forward. Do not lock onto the first idea, and do not
start building. Every claim about the code is backed by a real `file:line`
reference, not a guess.

## Steps

1. **Map the relevant code.** Find where the affected behavior lives, how data and
   control flow through it, and what it touches (callers, tests, configs). Search
   broadly; fan out parallel searches if your harness supports it. Record the map in
   `discoveries.md` with `file:line` references.

2. **Surface options.** Lay out at least two distinct approaches that satisfy the
   acceptance criteria. For each: the approach, pros and cons, and a rough risk/effort
   read. Keep them as genuine options — you may note a leaning, but do not decide.

3. **Note constraints and gotchas.** Existing patterns to follow, prior art, landmines
   — anything that would shape the choice.

4. **Update state.** Set `phase: explore` in `state.md` and append a navigation-log
   entry. Save everything to `discoveries.md`.

## Handoff

Present the options to the developer (a short comparison) and recommend `flow-plan`,
where they pick the approach and it becomes a recorded decision. Wait for the
go-ahead; do not decide for them and do not auto-advance.

## Guardrails

- Do not write production code or commit to one solution here.
- Ground every finding in real `file:line` evidence — no assumptions stated as fact.
- Keep findings on disk in `discoveries.md`, not only in chat.
- Never run `git`.
