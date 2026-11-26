---
name: verify
description: >
  Prove a step, or the whole ticket against its acceptance criteria, with recorded evidence.
disable-model-invocation: true
argument-hint: "<ticket-id> [step-id]"
---

# /flow:verify

Prove that work meets its requirements, with real evidence and a human gate. It
**proves, it does not fix**: this phase runs the proof and records the result, leaving
production code as it is; a fix belongs to `/flow:execute`.

## Before you start

Read `.specs/CONVENTIONS.md`, then the ticket's `state.md` (`proof_definition`),
`context.md`, `understanding.md` (acceptance criteria), `plan.md` (the proof strategy)
and the relevant `steps/NN-<slug>.md`. Verification needs something built: a step, or a ticket whose
steps are done.

## Steps

1. **Scope the verification**: one step (by id), or the whole ticket (all done steps,
   checked against the acceptance criteria). Ask the developer when it is unclear.

2. **Check the base first** (whole ticket). A proof describes the tree it ran on, so a
   branch behind its base is brought up to date before the proofs, not after them.
   Fetch the base (`git fetch <remote> <branch>`: the profile's `Base branch`, else the
   remote's default), then read the report, from the project root:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> fresh
   ```

   `Behind: 0`, or behind with no `Overlap`: go on, and say the count at the gate.
   Behind with an `Overlap` or a `Merge` conflict: stop before any proof runs and tell
   the developer the count and the files; the rebase or merge is theirs, and the
   proofs run on its result. A fetch that fails leaves the base as of the last one:
   say when that was.

3. **Run the proof through the runner**, per `proof_definition` and the step's **Proof**
   section:
   - One step: the runner appends to the step's **Evidence** section.

     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/run_proof.js" <ticket-id> <step-id> --root "<project-root>" --tail 15 --cmd "<command>"
     ```

   - Whole ticket: one entry per acceptance criterion, in the ticket's
     `verification.md` (the runner creates it). The plan's **Criteria and proof**
     table says what proves each one: run its command as written. A command changed
     here (a wider pattern, another filter) proves something else, so change one
     only for a reason the record gives, and say so at the gate. A plan without the
     table gets its rows from the steps' Proof sections first.

     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/run_proof.js" <ticket-id> ticket --label "AC <n>: <criterion>" --root "<project-root>" --tail 15 --cmd "<command>"
     ```

     The slow runs the plan left for here (the whole suite, a build, an end-to-end
     run) run now, once each, as entries of their own (`--label "guard: <what>"`), one
     at a time.

   Each command exits non-zero exactly when its criterion fails, or runs plain with
   `--expect <code>` when it passes on another one. The runner saves the full output to
   `evidence/` and records the exact command, its exit code, the last lines, and a
   `Note` for a result the exit code may not carry, which goes to the gate with it.
   Give the Bash call a timeout that fits the proof; read the log when you need more
   than the last lines. A criterion no command proves (`manual` or `construction` in
   the table: a screenshot, a check by reading) gets an entry by hand saying what was
   checked and where, or is listed as needing the developer; a `gap` is listed as one,
   with the plan's reason. Every acceptance criterion ends up with evidence or a named
   gap.
   - A failing proof ends the run: report it and recommend regressing to `/flow:execute`
     to fix the step (log it with `state.js <ticket-id> log "<what failed>"`).

4. **Open the human gate.** Present the evidence, criterion by criterion, with the gaps
   and what the freshness report said, and ask the developer to validate it. For the
   whole ticket, also name any finding a step's gate deferred (`deferred to step NN`
   in its Gate) that the later step's spec does not carry: it was never taken up.
   Record their decision (who + when) in the **Gate** section of the step or of
   `verification.md`. On approval of a step, move it forward with
   `state.js <ticket-id> step <step-id> proven`.

5. **Update state** through the state script, from the project root. A whole-ticket
   check is the verify phase; a single step leaves the phase as it is:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase verify
   ```

## Handoff

Name the next command from the `Next:` line of the state output (back to
`/flow:execute` after a single step, or `/flow:ship` after an approved whole-ticket
check), and suggest `/clear` before it: the evidence is on disk.
