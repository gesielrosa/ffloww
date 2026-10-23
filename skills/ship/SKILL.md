---
name: ship
description: >
  Draft the PR/MR description from the ticket's specs and suggest the commands to ship it.
disable-model-invocation: true
argument-hint: "<ticket-id>"
---

# /flow:ship

Prepare to ship: turn the ticket's specs into a PR/MR draft and suggest the commands to
ship it. The developer runs them, in their conventions and on their VCS host.

## Before you start

Read `.specs/CONVENTIONS.md`, then the ticket's `state.md`, `context.md`,
`understanding.md`, `decisions.md`, `plan.md`, the `steps/` specs (with their evidence),
and `verification.md` when a whole-ticket check was run.

## Steps

1. **Confirm readiness.** Every step is `done` and each acceptance criterion is met with
   recorded evidence. When something is missing, stop and name the command that closes
   the gap (`/flow:execute` or `/flow:verify`): only proven, approved work ships.

2. **Assemble the PR/MR draft** from the specs alone, for a reviewer who sees only the PR:
   - **Summary**: the problem and scope (from `understanding.md`), then the smallest view
     that makes the change clear: a call tree, a file tree, or a diff sketch.
   - **Approach**: the decision and trade-offs (from `decisions.md`).
   - **Acceptance criteria**: the checklist, each with its proof inline: the command, its
     exit code, and the decisive output line. `.specs/` may stay out of the repository,
     so a log path alone proves nothing to the reviewer.
   - **Merge danger**: a one-way or two-way door (how hard it is to roll back), and the
     blast radius (what else it can affect).
   - **Steps**: one line each.
   - **Work item**: the link.

   Save it to `.specs/<ticket-id>/pr.md` and show it to the developer.

3. **Suggest the ship sequence**, built from what `git branch` and `git remote -v` show:
   create a branch (a name suggested from the ticket) when the work sits on the default
   branch, push, and open the PR/MR with the draft, as commands for the developer to
   run. Their conventions (host, branch and commit style) decide the final form.

4. **Update state** through the state script, from the project root; once the developer
   confirms it is shipped, move to `done` the same way:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase ship
   ```

## Handoff

Hand the developer the `pr.md` draft and the suggested commands; they ship it their way.
Once they confirm it shipped and the phase is `done`, name the optional next command
from the `Next:` line of the state output.
