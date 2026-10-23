---
name: understand
description: >
  Read the ticket from Azure DevOps and capture its problem, scope, and acceptance criteria.
disable-model-invocation: true
argument-hint: "<ticket-id>"
---

# /flow:understand

Capture *what* must be built and *why*, before any code is explored. This phase writes
`understanding.md`, and `context.md` when the developer adds context; exploring the code
starts in `/flow:explore`.

## Before you start

Read `.specs/CONVENTIONS.md`, then the ticket's `state.md` and `context.md`. A ticket
without a `.specs/<ticket-id>/` folder starts with `/flow:start <ticket-id>`: say so and
stop.

## Steps

1. **Locate the work item** in the bundled **azure-devops** MCP: a work-item number
   directly (e.g. `wit_get_work_item`); a code or name by searching first (e.g.
   `search_workitem` or a WIQL query), then confirm the match with the developer.

2. **Capture understanding** into `understanding.md`:
   - **Ticket**: id, title, and the real work-item URL (the link is evidence).
   - **Problem**: what is actually being asked; scope and explicit non-goals.
   - **Acceptance criteria**: from the work item, since they drive the later proof.
     Where the ticket has none, or they are ambiguous, draft candidates, mark them as
     drafts, and confirm each one with the developer.
   - **Open questions**: anything to resolve before planning.

3. **Gather extra context.** Record the background the developer already gave, then
   present the draft (problem + acceptance criteria) and ask for what the ticket and the
   codebase still do not carry: links (Slack, docs, related PRs or incidents), hard
   constraints, out-of-ticket decisions, gotchas, related work. Background goes to
   `context.md`; an answer that refines an acceptance criterion goes into that criterion
   in `understanding.md`, so each fact lives in one place.

4. **Determine design involvement.** Infer it from the work (screens, components, UI
   changes, visual wording); a Figma link is often missing from the ticket. When there is
   a UI signal, or it is unclear, ask the developer whether there is a design, and for its
   Figma link or screenshots.
   - Design involved: capture the references given (a Figma URL, screenshots dropped into
     `assets/`) under the Design section; `/flow:design` reads the exact nodes next.
   - No design: write "No design involved".

5. **Update state** through the state script, from the project root:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> set design_involved <true|false>
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase understand
   ```

## Handoff

While open questions that shape an acceptance criterion remain, end your turn with
them: numbered, together, each with your recommended answer. The developer answers
them, or chooses to carry them forward (they stay under Open questions). Once that is
settled, summarize the problem and acceptance criteria for a quick sanity check, name
the next command from the `Next:` line of the state output, and suggest `/clear` before
it: the understanding is on disk.
