---
name: execute
description: >
  Use to build one planned step at a time. Implements only the current step's scope —
  inline or delegated to the flow:step-executor agent on a cheaper model — runs its
  proof through a bundled runner that records the raw evidence (command, exit code,
  real output, log) in the step spec, never a prose summary and never self-graded.
  Then opens the human gate: the developer reviews the evidence and approves, requests
  changes, or regresses; only then is the step marked proven. On approval it suggests a
  commit message but never commits, keeping the package repo- and platform-agnostic.
  Updates state.md and recommends the next step or /flow:ship. Trigger on "execute the
  next step", "build step 2", "implement AB-1234 step", or entering the execute phase.
---

# /flow:execute

Build one planned step, prove it with real evidence, and stop at the human gate. This
is the per-step loop. It works on a single step at a time and never advances itself.

## Before you start

- A plan must exist: `state.md` has `steps:` and a `proof_definition`. If not, run
  `/flow:plan`.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md`, `context.md`, `decisions.md`
  (the chosen approach), and the current step's `steps/NN-<slug>.md`.

## Steps

1. **Select the step.** Take the next `todo` step, or the one the developer names. In
   `state.md`, set `current_step` to its id and the step's status to `in-progress`.

2. **Build only this step.** Implement the changes in the step's **Spec**/**Changes**,
   and nothing beyond its scope. Keep it small. Match the conventions of the
   surrounding code. You type; the developer reviews. The step's **Executor** line says
   who builds: `delegate` runs steps 2–3 in the `flow:step-executor` agent (see
   **Delegated execution**); `inline` builds here.

3. **Prove it.** Run each command of the step's **Proof** (per `proof_definition`)
   through the plugin's proof runner:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/run_proof.js" <ticket-id> <step-id> --root "<project-root>" --cmd "<command>"
   ```

   The runner saves the full output to `evidence/` and appends the raw entry to the
   step's **Evidence** section: the exact command, its exit code, the duration, the
   last lines of output, and the log path. Give the Bash call a timeout that fits the
   proof. A proof that is not a command (a screenshot) is saved to the path the Proof
   names, and you add an Evidence entry with that path. Numbers, not opinions.
   - Never claim a proof passed without running it. Never replace raw output with a
     summary. Never mark your own work as passing.
   - If the proof fails, fix and re-run — this is the loop — for up to three attempts.
     Then stop and take it to the developer. If the chosen approach turns out wrong,
     stop and recommend regressing to `/flow:plan` (log the reason in the navigation log
     and `decisions.md`).

4. **Open the human gate.** Present the evidence to the developer and ask them to
   validate it. The developer decides: approve / request changes / regress. Record the
   decision (who + when) in the step's **Gate** section. Only on approval set the
   step's status to `proven`.

5. **Suggest a commit.** On approval, propose a draft commit message for this step —
   but **do not commit**. Do not assume the VCS host or the commit convention; the
   developer commits their way. Once they confirm the step is committed, set its
   status to `done`.

6. **Update state.** Keep `state.md` current: step statuses, `current_step`, and a
   navigation-log entry.

## Delegated execution

When the step is `Executor: delegate` and the `flow:step-executor` agent is available,
steps 2–3 run in it: the build's file reads and command output stay out of the main
session's context, and the typing runs on a cheaper model. The main session keeps steps
1 and 4–6 — it alone talks to the developer and writes `state.md`.

- **No Executor set** (e.g. a step planned before the field existed): delegate a step whose
  Spec, Changes and Proof are complete enough to build without a decision. Build inline
  instead: spikes and investigations, steps whose Spec leaves a choice open, and proofs
  that need the developer during the step.
- **The brief.** The ticket id, the step id, and the project root; the agent reads the
  specs itself, so do not retell the plan. One agent at a time, and no edits in the main session while it runs.
- **Check the work, not the report.** Before the gate, read the step's Evidence entries
  and review the diff (`git diff`) against the step's Spec and Changes. The runner wrote
  the evidence, so do not re-run the proof; re-run it through the runner only when an
  entry has no log under `evidence/` or disagrees with the diff. A report that disagrees
  with the evidence or the diff goes back to the agent.
- **When it stops.** A question, a missing decision or a recommendation to regress goes
  to the developer; never answer in their place. After three failing proof attempts,
  decide with the developer: clarify the step and send it back, re-dispatch it on a more
  capable model (`model: opus` on the agent call), or build it inline. Log the
  escalation in the navigation log.
- **Changes requested at the gate.** Send them to the same agent, which keeps its
  context, instead of starting a new one; it re-runs the proof through the runner.
- If the agent is not available, build inline as in steps 2–3.

## Handoff

If steps remain, recommend running `/flow:execute` again for the next step. If all
steps are `done`, recommend `/flow:ship`. Everything the next step needs is on disk, so
suggest starting it in a fresh context (`/clear` in Claude Code). Wait for the
go-ahead; do not auto-advance.

## Guardrails

- One step at a time; never expand beyond the current step's scope.
- Evidence is raw and real, recorded by the runner; the human validates it — the skill
  never self-approves.
- Never run git commands that write (commit, branch, checkout, stash, reset, push) or
  open PRs; reading (`status`, `diff`, `log`) is fine.
- Keep evidence and status on disk in the step spec and `state.md`, not only in chat.
