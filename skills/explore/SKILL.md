---
name: explore
description: >
  Use after the ticket is understood (and design captured, if any), to explore the
  codebase before planning. This is the divergent phase: map where the relevant code
  lives and how it flows, then surface multiple viable options to solve the ticket —
  not a single answer. Records the context map and options in the ticket's .specs
  discoveries.md with file:line evidence, updates state.md, and hands off to /flow:plan
  where the developer decides. Trigger on "explore the codebase", "what are the
  options", "how could we solve AB-1234", or entering the explore phase.
---

# /flow:explore

The divergent phase. Build a broad picture of the relevant code and surface
*options* — not a decision. Choosing among them happens in `/flow:plan`, and it is
the developer's call.

## Before you start

- `understanding.md` should be filled. If the problem and acceptance criteria are not
  captured yet, run `/flow:understand` first.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md`, `understanding.md`, and
  `context.md`.

## Mindset

Diverge before converging. Aim for breadth: understand the full context, then lay
out more than one viable way forward. Do not lock onto the first idea, and do not
start building. Every claim about the code is backed by a real `file:line`
reference, not a guess.

## Steps

1. **Map the relevant code.** Find where the affected behavior lives, how data and
   control flow through it, and what it touches (callers, tests, configs), and the
   prior art to follow. Split this into two to four focused questions and dispatch one
   `flow:code-mapper` agent per question, in parallel, with the ticket id, the project
   root, the question, and any known starting points. The file reads stay in their
   contexts; each returns a compact map. If the agent is not available, search
   yourself.

2. **Check before you rely on it.** A mapper's entry is a lead, not evidence, until you
   have read it: open the cited lines that the options will rest on. Record the map in
   `discoveries.md` with `file:line` references you have confirmed.

3. **Surface options.** Lay out at least two distinct approaches that satisfy the
   acceptance criteria. For each: the approach, pros and cons, and a rough risk/effort
   read. Keep them as genuine options — you may note a leaning, but do not decide.

4. **Note constraints and gotchas.** Existing patterns to follow, prior art, landmines
   — anything that would shape the choice.

5. **Update state.** Save everything to `discoveries.md`, then set the phase through
   the flow's state script, from the project root; it writes the navigation log:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase explore
   ```

## Handoff

Present the options to the developer (a short comparison) and recommend `/flow:plan`,
where they pick the approach and it becomes a recorded decision. Wait for the
go-ahead; do not decide for them and do not auto-advance. The options are on disk in
`discoveries.md`, so suggest starting the next phase in a fresh context (`/clear` in
Claude Code).

## Guardrails

- Do not write production code or commit to one solution here.
- Ground every finding in real `file:line` evidence — no assumptions stated as fact.
- Keep findings on disk in `discoveries.md`, not only in chat.
- Never run `git`.
