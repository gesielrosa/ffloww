---
name: ship
description: >
  Use when a ticket's steps are all done and verified, to prepare shipping. Assembles a
  PR/MR description draft strictly from the ticket's specs — the problem from
  understanding.md, the approach and trade-offs from decisions.md, the acceptance
  criteria with their evidence, and a per-step summary — and saves it to the ticket's
  .specs as pr.md. Then suggests the steps to ship (branch, push, open the PR) without
  running git or creating anything, since the package does not assume your VCS host or
  commit conventions. Updates state.md. Trigger on "open a PR", "ship AB-1234", "prepare
  the MR", or entering the ship phase.
---

# /flow:ship

Prepare to ship: turn the ticket's specs into a PR/MR draft, and suggest the steps to
ship it. It **suggests, it does not execute**: no `git`, no branches, no PRs. The
package does not assume your VCS host or commit conventions — you ship your way.

## Before you start

- All steps should be `done` and the whole-ticket proof approved. If not, recommend
  `/flow:execute` / `/flow:verify` first — do not ship unproven work.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md`, `understanding.md`,
  `context.md`, `decisions.md`, `plan.md`, the `steps/` specs (with their evidence), and
  `verification.md` if a whole-ticket check was run.

## Steps

1. **Confirm readiness.** Verify every step is `done` and the acceptance criteria are
   met with recorded evidence. If anything is missing, stop and recommend the skill that
   closes the gap.

2. **Assemble the PR/MR draft** strictly from the specs — invent nothing:
   - **Summary** — the problem and scope (from `understanding.md`).
   - **Approach** — the decision and trade-offs (from `decisions.md`).
   - **Acceptance criteria** — the checklist, each marked with how it was met and a
     pointer to its evidence.
   - **Steps** — a short per-step summary with evidence highlights.
   - **Work item** — the link.

   Save it to `.specs/<ticket-id>/pr.md` and show it to the developer.

3. **Suggest the ship sequence.** Offer the steps to ship — create a branch (suggest a
   name from the ticket), push, open the PR/MR with the draft — as commands the
   developer runs. State clearly that conventions (host, branch/commit style) are
   theirs. Do not run any of it.

4. **Update state.** Set `phase: ship` in `state.md` and append a navigation-log entry.
   Once the developer confirms it is shipped, set `phase: done`.

## Handoff

Hand the developer the `pr.md` draft and the suggested steps. They ship it their way.
Do not run `git`, do not open a PR, and do not auto-advance.

## Guardrails

- Never run `git`, create branches, push, or open PRs — suggest only.
- Do not assume the VCS host, branch naming, or commit convention.
- Build the draft only from the specs; do not invent changes or results.
- Ship only proven, approved work.
