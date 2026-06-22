# The context channel

"Give it context" is the first principle. The ticket, the design, and the codebase
cover three sources — but they miss the fourth: **what only the developer knows.** The
context channel is the first-class home for that.

## What belongs here

Tacit knowledge that the ticket and the code do not carry:

- **Links** — Slack threads, docs, related PRs or incidents, dashboards.
- **Constraints** — hard limits: "do not touch X", "must keep Y backward-compatible",
  deadlines.
- **Out-of-ticket decisions** — verbal or async decisions never written in the ticket.
- **Gotchas** — known traps, flaky areas, prior failed attempts.
- **Related work** — adjacent tickets, past changes, people who know the area.

All of it lives in `.specs/<ticket-id>/context.md`, and **every skill reads it at
start** — so context added at any point is picked up by the next phase.

## When to give context

Two entry points:

1. **The default moment — at the end of `flow-understand`.** After the agent drafts the
   understanding (problem + acceptance criteria), it presents it and asks you for
   anything the ticket and code don't carry. You fill the gaps; the understanding is
   refined with what you add. This is the prime moment because it is the latest "early"
   point that still feeds explore, plan, and execute.

2. **Anytime — via `flow-context`.** When you remember a gotcha mid-execution, get a new
   link during planning, or learn of a constraint late, run `flow-context`. It appends
   to `context.md` without changing the phase, writing code, or running git.

In short: *you're invited to give context when the understanding closes, and you can
add more at any moment with `flow-context`.*

## How it flows through the work

- `context.md` is **append-only** — new context is added, earlier context is never
  rewritten or dropped. Date your entries.
- If a piece of context affects a decision already made, it is also recorded in
  `decisions.md`, and may warrant regressing to `flow-plan`.
- Because every phase reads `context.md` first, late context still shapes the work that
  follows it.

## Why a dedicated channel (not just chat)

Context dropped in conversation is lost to compaction and invisible to the next skill.
A dedicated, always-read file makes context **persistent, discoverable, and auditable**
— part of the record, not a passing remark.
