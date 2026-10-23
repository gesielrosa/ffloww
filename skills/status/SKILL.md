---
name: status
description: >
  Use anytime to see where a ticket's flow stands and what to run next. Read-only:
  reports phase, step progress, proof, and recent navigation from the state script and
  recommends the next skill. Trigger on "where are we", "flow status", "what's next
  for AB-1234", or "status".
---

# /flow:status

The compass for the flow. Read where a ticket stands and recommend the next move. It is
**read-only**: it never changes state, writes code, or advances the flow.

## Before you start

- Read `.specs/CONVENTIONS.md` to follow the flow's phases and navigation rules.

## Steps

1. **Find the ticket.** If the developer names one, use it. Otherwise list the ticket
   folders under `.specs/` and ask which — or use it directly if there is only one.

2. **Read the state** with the flow's state script, from the project root. It parses
   `state.md` and computes the next move:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> show
   ```

3. **Report concisely.** Tell the developer where they are: the current phase, step
   progress (e.g. 2 of 5 done, which one is in progress), what proof is defined, and the
   last couple of navigation entries.

4. **Recommend the next move** the output names on its `Next:` line. Offer to run it and
   wait for the go-ahead.

## Guardrails

- Read-only: run only the state script's `show`; do not edit `state.md` or any spec,
  write code, or run `git`.
- Recommend only; the developer drives every transition.
