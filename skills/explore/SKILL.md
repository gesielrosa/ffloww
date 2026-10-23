---
name: explore
description: >
  Map the code the ticket touches and lay out options with file:line evidence, for the developer to choose.
disable-model-invocation: true
argument-hint: "<ticket-id>"
---

# /flow:explore

The divergent phase: build a broad picture of the relevant code and surface *options*.
Choosing among them happens in `/flow:plan`, and it is the developer's call. This phase
writes `discoveries.md`; a bug adds its reproduction under `repro/` and probes that are
gone before the phase ends.

## Before you start

Read `.specs/CONVENTIONS.md`, then the ticket's `state.md`, `context.md`, and
`understanding.md`. Until the problem and acceptance criteria are captured, the next
command is `/flow:understand <ticket-id>`: say so and stop.

## Mindset

Diverge before converging: understand the full context, then lay out more than one
viable way forward, keeping the first idea as one option among several. Every claim
about the code rests on a `file:line` reference you have read.

A ticket whose type in `understanding.md` is **Bug** is explored from a red reproduction
first: read [BUG.md](BUG.md) and follow it alongside the mapping, before surfacing
options.

## Steps

1. **Map the relevant code.** Find where the affected behavior lives, how data and control
   flow through it, what it touches (callers, tests, configs), and the prior art to
   follow. Code that fits in a few files is read directly. For anything larger, split
   the mapping into two to four focused questions and, in one message, call the Agent
   tool once per question with subagent_type `flow:code-mapper`, passing the ticket id,
   the project root, the question, and any known starting points. They run in parallel,
   keep their file reads in their own contexts, and each returns a compact map.

2. **Check before you rely on it.** A mapper's entry is a lead until you have read it:
   open the cited lines the options will rest on. Record the map in `discoveries.md` with
   the `file:line` references you confirmed.

3. **Surface options.** Lay out at least two distinct approaches that satisfy the
   acceptance criteria. For each: the approach, pros and cons, and a rough risk/effort
   read. Keep them genuine options; a leaning may be noted, and the choice stays with the
   developer.

4. **Note constraints and gotchas.** Existing patterns to follow, prior art, landmines:
   anything that would shape the choice.

5. **Update state.** With everything saved in `discoveries.md`, set the phase through the
   state script, from the project root:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase explore
   ```

## Handoff

Present the options as a short comparison. Then name the next command from the `Next:`
line of the state output, where the developer picks the approach and it becomes a
recorded decision, and suggest `/clear` before it: the options are on disk.
