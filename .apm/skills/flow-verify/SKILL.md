---
name: flow-verify
description: >
  Use to prove that work meets its requirements — on demand for one step, or as a final
  check of the whole ticket against its acceptance criteria before shipping. Runs the
  proof defined for the work (per proof_definition) without changing production code,
  pastes the raw evidence (command, exit code, real output, or screenshot path) into the
  step spec or a verification note, and opens the human gate. It proves, it does not fix:
  if the proof fails it reports and recommends regressing to flow-execute. Never
  self-grades. Updates state.md. Trigger on "verify step 2", "prove this works", "check
  it against the acceptance criteria", or entering the verify phase.
---

# flow-verify

Prove that work meets its requirements, with real evidence and a human gate. It
**proves, it does not fix**: verification only runs the proof and records the result.
If something is wrong, the fix belongs to `flow-execute`.

## Before you start

- There must be something to verify: a built step, or a ticket whose steps are done.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md` (`proof_definition`),
  `understanding.md` (acceptance criteria), `context.md`, and the relevant
  `steps/NN-<slug>.md`.

## Steps

1. **Scope the verification.** Either one step (by id) or the whole ticket (all done
   steps, checked against the acceptance criteria). Ask the developer if it is unclear.

2. **Run the proof.** Execute the proof for the scope, per `proof_definition` and the
   step's **Proof** section (for a whole-ticket check, run against each acceptance
   criterion). Do not modify production code — this phase only verifies.

3. **Record raw evidence.** Paste the **raw** result — the exact command, its exit code,
   and the real output (or a screenshot path) — into the step's **Evidence** section.
   For a whole-ticket check, record evidence per acceptance criterion. Numbers, not
   opinions; never replace output with a summary; never mark it passing yourself.
   - If the proof fails, stop and report it. Recommend regressing to `flow-execute` to
     fix the step (log the reason in the navigation log).

4. **Open the human gate.** Present the evidence and ask the developer to validate it.
   Record their decision (who + when) in the **Gate** section. Only on approval set the
   step's status to `proven`.

5. **Update state.** Keep `state.md` current and append a navigation-log entry.

## Handoff

- A single step: hand back to `flow-execute` (commit suggestion / next step).
- A whole-ticket check that passed and is approved: recommend `flow-ship`.

Wait for the go-ahead; do not auto-advance.

## Guardrails

- Verify only — never write or fix production code here (that is `flow-execute`).
- Evidence is raw and real; the human validates it — never self-approve.
- Check whole-ticket work against the acceptance criteria, not a vibe.
- Never run `git`.
