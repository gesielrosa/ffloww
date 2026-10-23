---
name: verify
description: >
  Use to prove that a step, or the whole ticket against its acceptance criteria, meets
  its requirements before shipping. Runs the proof through the proof runner without
  changing production code and opens the human gate; it proves, it does not fix.
  Trigger on "verify step 2", "prove this works", or "check it against the acceptance
  criteria".
---

# /flow:verify

Prove that work meets its requirements, with real evidence and a human gate. It
**proves, it does not fix**: verification only runs the proof and records the result.
If something is wrong, the fix belongs to `/flow:execute`.

## Before you start

- There must be something to verify: a built step, or a ticket whose steps are done.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md` (`proof_definition`),
  `understanding.md` (acceptance criteria), `context.md`, and the relevant
  `steps/NN-<slug>.md`.

## Steps

1. **Scope the verification.** Either one step (by id) or the whole ticket (all done
   steps, checked against the acceptance criteria). Ask the developer if it is unclear.

2. **Run the proof through the runner.** Execute the proof for the scope, per
   `proof_definition` and the step's **Proof** section, running each command through
   the plugin's proof runner. Do not modify production code — this
   phase only verifies.
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
   exit code, and the last lines — raw, not retyped. Give the Bash call a timeout that
   fits the proof; read the log when you need more than the last lines. A criterion no
   command proves (a screenshot, a manual check) gets an entry by hand with the
   screenshot path, or is listed as needing the developer. Numbers, not opinions; never
   mark it passing yourself.
   - If the proof fails, stop and report it. Recommend regressing to `/flow:execute` to
     fix the step (record it with `state.js <ticket-id> log "<what failed>"`).

3. **Open the human gate.** Present the evidence and ask the developer to validate it.
   Record their decision (who + when) in the **Gate** section of the step or of
   `verification.md`. Only on approval move the step forward with
   `state.js <ticket-id> step <step-id> proven`.

4. **Update state** through the flow's state script, from the project root. A
   whole-ticket check is the verify phase; a single step leaves the phase as it is:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase verify
   ```

## Handoff

- A single step: hand back to `/flow:execute` (commit suggestion / next step).
- A whole-ticket check that passed and is approved: recommend `/flow:ship`. The evidence
  is on disk, so suggest starting it in a fresh context (`/clear` in Claude Code).

Wait for the go-ahead; do not auto-advance.

## Guardrails

- Verify only — never write or fix production code here (that is `/flow:execute`).
- Evidence is raw and real, recorded by the runner; the human validates it — never
  self-approve.
- Check whole-ticket work against the acceptance criteria, not a vibe.
- Never run `git`.
