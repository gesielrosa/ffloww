---
name: flow-status
description: >
  Use anytime to see where a ticket's flow stands and what to do next. Reads the
  ticket's .specs state.md and reports the current phase, step progress, proof status,
  and recent navigation, then recommends the next skill to run (for example flow-execute
  for the next step, or flow-ship when all steps are done). Read-only: it never changes
  state, writes code, or advances the flow — it is the compass; the developer drives. If
  no ticket is named, it lists the tickets under .specs and asks which. Trigger on "where
  are we", "flow status", "what's next for AB-1234", or "status".
---

# flow-status

The compass for the flow. Read where a ticket stands and recommend the next move. It is
**read-only**: it never changes state, writes code, or advances the flow.

## Before you start

- Read `.specs/CONVENTIONS.md` to follow the flow's phases and navigation rules.

## Steps

1. **Find the ticket.** If the developer names one, use it. Otherwise list the ticket
   folders under `.specs/` and ask which — or use it directly if there is only one.

2. **Read the state.** Open `.specs/<ticket-id>/state.md`: `phase`, `design_involved`,
   `proof_definition`, `current_step`, the `steps:` statuses, and the latest
   navigation-log entries.

3. **Report concisely.** Tell the developer where they are: the current phase, step
   progress (e.g. 2 of 5 done, which one is in progress), what proof is defined, and the
   last couple of navigation entries.

4. **Recommend the next move.** Map the state to the right skill and suggest it:
   - phase `start` → `flow-understand`
   - phase `understand`, `design_involved: true` → `flow-design`; else `flow-explore`
   - phase `design` → `flow-explore`
   - phase `explore` → `flow-plan`
   - phase `plan`, or steps still `todo`/`in-progress` → `flow-execute` (next step)
   - a step needs proving → `flow-verify`
   - all steps `done` → `flow-ship`

   Offer to run it and wait for the go-ahead.

## Guardrails

- Read-only: do not edit `state.md` or any spec, write code, or run `git`.
- Recommend only; the developer drives every transition.
