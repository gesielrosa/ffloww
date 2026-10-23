---
name: understand
description: >
  Use after /flow:start, when the developer is ready to understand a ticket before
  exploring or planning. Reads the work item from the bundled azure-devops MCP,
  then captures the problem, scope and non-goals, and acceptance
  criteria into the ticket's .specs understanding.md. Detects whether design is
  involved and routes to /flow:design or /flow:explore. Updates state.md and never
  fabricates acceptance criteria — it confirms gaps with the developer. Trigger on
  "understand the ticket", "read AB-1234", "what does this ticket need", or entering
  the understand phase.
---

# /flow:understand

Capture *what* must be built and *why*, before any code is explored. This phase
reads the ticket and writes the ticket's `understanding.md`. It does not explore the
codebase and it does not plan.

## Before you start

- The ticket must be scaffolded. If `.specs/<ticket-id>/` is missing, run
  `/flow:start` first.
- Read `.specs/CONVENTIONS.md`, the ticket's `.specs/<ticket-id>/state.md`, and its
  `context.md` (anything the developer added earlier) to orient.

## Steps

1. **Locate the work item.** Take the ticket id from `state.md` and fetch it from the
   bundled **azure-devops** MCP. If the id is a work-item number, get it directly
   (e.g. the `wit_get_work_item` tool). If it is a code or name, search for
   it first (e.g. `search_workitem` or a WIQL query) and confirm the match with the
   developer.

2. **Capture understanding** into `understanding.md`:
   - **Ticket** — id, title, and the real work-item URL (link it; that is evidence).
   - **Problem** — what is actually being asked; scope and explicit non-goals.
   - **Acceptance criteria** — pull them from the work item. If the ticket has none or
     they are ambiguous, draft candidates and **confirm them with the developer** —
     never invent acceptance criteria silently. These drive the later proof.
   - **Open questions** — anything to resolve before planning.

3. **Ask for extra context.** Present the draft understanding (problem + acceptance
   criteria) and ask the developer for anything the ticket and the codebase do not
   carry — links (Slack, docs, related PRs/incidents), hard constraints, out-of-ticket
   decisions, gotchas, related work. Append what they give to `context.md`, then refine
   the understanding with it. If they have nothing, move on.

4. **Determine design involvement (actively).** Infer from the work — screens,
   components, UI changes, visual wording — whether design is involved. Do not rely on a
   Figma link being in the ticket; it often is not there. When there is a UI signal, or
   when it is unclear, **ask the developer**: is there a design, and do they have a Figma
   link or screenshots?
   - If design is involved: set `design_involved: true` in `state.md`, capture whatever
     references the developer gives (Figma URL, screenshots — they can drop files into
     `assets/`) under the Design section, and plan to run `/flow:design` next, which pulls
     the exact node ids and exports the assets.
   - If not: write "No design involved" and set `design_involved: false`.

5. **Update state.** In `state.md`: set `phase: understand`, set `design_involved`,
   and append a navigation-log entry.

## Handoff

Summarize the problem and acceptance criteria back to the developer for a quick
sanity check. Then recommend the next skill — `/flow:design` if design is involved,
otherwise `/flow:explore` — and wait for the go-ahead. Do not auto-advance. The
understanding is on disk, so suggest starting the next phase in a fresh context
(`/clear` in Claude Code).

## Guardrails

- Do not explore the codebase or propose solutions here — that is `/flow:explore`.
- Never fabricate or assume acceptance criteria; confirm gaps with the developer.
- Keep everything on disk in `understanding.md` and `state.md`, not only in chat.
- Never run `git`.
