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
`context.md`, `understanding.md` (acceptance criteria), and the relevant
`steps/NN-<slug>.md`. Verification needs something built: a step, or a ticket whose
steps are done.

## Steps

1. **Scope the verification**: one step (by id), or the whole ticket (all done steps,
   checked against the acceptance criteria). Ask the developer when it is unclear.

2. **Run the proof through the runner**, per `proof_definition` and the step's **Proof**
   section:
   - One step: the runner appends to the step's **Evidence** section.

     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/run_proof.js" <ticket-id> <step-id> --root "<project-root>" --tail 15 --cmd "<command>"
     ```

   - Whole ticket: one entry per acceptance criterion, in the ticket's
     `verification.md` (the runner creates it).

     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/run_proof.js" <ticket-id> ticket --label "AC <n>: <criterion>" --root "<project-root>" --tail 15 --cmd "<command>"
     ```

   The runner saves the full output to `evidence/` and records the exact command, its
   exit code, and the last lines. Give the Bash call a timeout that fits the proof; read
   the log when you need more than the last lines. A criterion no command proves (a
   screenshot, a manual check) gets an entry by hand with the screenshot path, or is
   listed as needing the developer: every acceptance criterion ends up with evidence or
   a named gap.
   - A failing proof ends the run: report it and recommend regressing to `/flow:execute`
     to fix the step (log it with `state.js <ticket-id> log "<what failed>"`).

3. **Open the human gate.** Present the evidence and ask the developer to validate it.
   Record their decision (who + when) in the **Gate** section of the step or of
   `verification.md`. On approval of a step, move it forward with
   `state.js <ticket-id> step <step-id> proven`.

4. **Update state** through the state script, from the project root. A whole-ticket
   check is the verify phase; a single step leaves the phase as it is:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase verify
   ```

## Handoff

Name the next command from the `Next:` line of the state output (back to
`/flow:execute` after a single step, or `/flow:ship` after an approved whole-ticket
check), and suggest `/clear` before it: the evidence is on disk.
