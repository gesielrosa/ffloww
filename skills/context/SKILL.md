---
name: context
description: >
  Append context the developer shares about a ffloww ticket (links, constraints, decisions
  made outside the ticket, gotchas, related work) to its .specs context.md. Use when the
  developer offers such background for a ticket in progress.
---

# /flow:context

Capture what the ticket, the design, and the codebase do not carry: the developer's tacit
knowledge that shapes the work. A utility for any moment, not a phase: it appends to
`context.md` (and notes a changed decision in `decisions.md`), and the phase stays as it
is.

## Steps

1. **Find the ticket**: the one named; otherwise the only ticket folder under `.specs/`,
   or list them and ask which.

2. **Collect the context** the developer offered, or ask for it: links (Slack, docs,
   related PRs or incidents, dashboards), hard constraints, out-of-ticket decisions,
   gotchas, related work.

3. **Append to `context.md`** under the right section (Links, Constraints, Out-of-ticket
   decisions, Gotchas, Related work), dated. Earlier entries stay as they are.

4. **Route a changed decision.** When the context affects a choice already made, note it
   in `decisions.md` too, and tell the developer it may warrant regressing to
   `/flow:plan`.

Confirm what was captured, then return to wherever the developer was.
