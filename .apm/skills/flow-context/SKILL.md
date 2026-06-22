---
name: flow-context
description: >
  Use anytime the developer wants to add context the ticket, design, and codebase do
  not carry — links (Slack, docs, related PRs or incidents), hard constraints,
  out-of-ticket decisions, gotchas, or related work. Appends what they provide to the
  ticket's .specs context.md, which every phase reads at start. Append-only and
  otherwise read-only: it does not change phase, write code, or run git. The natural
  first moment is when flow-understand closes, but it can run at any point in the flow.
  Trigger on "add context", "flow-context", "here is some background", "note this
  constraint", or "fyi for AB-1234".
---

# flow-context

Capture context that the ticket, the design, and the codebase do not carry — the
developer's tacit knowledge that shapes the work. A cross-cutting utility: run it at any
moment, not as a phase.

## Before you start

- Read `.specs/CONVENTIONS.md`. If no ticket is named, list the ticket folders under
  `.specs/` and ask which — or use it directly if there is only one.

## Steps

1. **Collect the context.** Ask the developer (or take what they offered) for anything
   relevant that is not in the ticket or the code: links (Slack, docs, related PRs or
   incidents, dashboards), hard constraints, out-of-ticket decisions, gotchas, related
   work.

2. **Append to `context.md`.** Add it under the right section of
   `.specs/<ticket-id>/context.md` (Links, Constraints, Out-of-ticket decisions,
   Gotchas, Related work). Append-only — never rewrite or drop earlier context. Date new
   entries.

3. **Route if it changes a decision.** If the context affects a choice already made, note
   it in `decisions.md` too, and tell the developer it may warrant regressing to
   `flow-plan`.

## Handoff

Confirm what was captured and return to wherever the developer was. Do not advance the
flow yourself.

## Guardrails

- Append-only to `context.md`; never overwrite earlier context.
- Do not change `phase`, write code, or run `git`.
- This is an input channel, not a phase — it never decides or advances anything.
