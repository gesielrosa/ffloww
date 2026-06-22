---
name: flow-execute
description: >
  Use to build one planned step at a time. Implements only the current step's scope,
  runs its proof, and pastes the raw evidence (command, exit code, real test output, or
  screenshot path) into the step spec — never a prose summary and never self-graded.
  Then opens the human gate: the developer reviews the evidence and approves, requests
  changes, or regresses; only then is the step marked proven. On approval it suggests a
  commit message but never runs git, keeping the package repo- and platform-agnostic.
  Updates state.md and recommends the next step or flow-ship. Trigger on "execute the
  next step", "build step 2", "implement AB-1234 step", or entering the execute phase.
---

# flow-execute

Build one planned step, prove it with real evidence, and stop at the human gate. This
is the per-step loop. It works on a single step at a time and never advances itself.

## Before you start

- A plan must exist: `state.md` has `steps:` and a `proof_definition`. If not, run
  `flow-plan`.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md`, `context.md`, `decisions.md`
  (the chosen approach), and the current step's `steps/NN-<slug>.md`.

## Steps

1. **Select the step.** Take the next `todo` step, or the one the developer names. In
   `state.md`, set `current_step` to its id and the step's status to `in-progress`.

2. **Build only this step.** Implement the changes in the step's **Spec**/**Changes**,
   and nothing beyond its scope. Keep it small. Match the conventions of the
   surrounding code. You type; the developer reviews.

3. **Prove it.** Run the step's **Proof** (per `proof_definition`). Paste the **raw**
   result into the step's **Evidence** section: the exact command, its exit code, and
   the real output (or a screenshot path). Numbers, not opinions.
   - Never claim a proof passed without running it. Never replace raw output with a
     summary. Never mark your own work as passing.
   - If the proof fails, fix and re-run — this is the loop. Update Evidence each
     attempt and stay on this step until the proof actually passes. If the chosen
     approach turns out wrong, stop and recommend regressing to `flow-plan` (log the
     reason in the navigation log and `decisions.md`).

4. **Open the human gate.** Present the evidence to the developer and ask them to
   validate it. The developer decides: approve / request changes / regress. Record the
   decision (who + when) in the step's **Gate** section. Only on approval set the
   step's status to `proven`.

5. **Suggest a commit.** On approval, propose a draft commit message for this step —
   but **do not run `git`**. Do not assume the VCS host or the commit convention; the
   developer commits their way. Once they confirm the step is committed, set its
   status to `done`.

6. **Update state.** Keep `state.md` current: step statuses, `current_step`, and a
   navigation-log entry.

## Handoff

If steps remain, recommend running `flow-execute` again for the next step. If all
steps are `done`, recommend `flow-ship`. Wait for the go-ahead; do not auto-advance.

## Guardrails

- One step at a time; never expand beyond the current step's scope.
- Evidence is raw and real; the human validates it — the skill never self-approves.
- Never run `git`, create branches, or open PRs.
- Keep evidence and status on disk in the step spec and `state.md`, not only in chat.
