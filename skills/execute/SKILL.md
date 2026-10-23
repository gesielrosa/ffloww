---
name: execute
description: >
  Use to build one planned step at a time — inline or in a flow:step-executor* subagent
  — prove it through the proof runner (raw evidence, never self-graded), and stop at
  the human gate. On approval it suggests a commit message but never commits. Trigger
  on "execute the next step", "build step 2", or "implement AB-1234 step".
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

1. **Select the step.** Take the next `todo` step, or the one the developer names, and
   start it through the flow's state script, from the project root. It sets the
   current step, syncs the step spec's Status line, and refuses a second step in
   progress:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase execute
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> step <step-id> in-progress
   ```

2. **Build only this step.** Implement the changes in the step's **Spec**/**Changes**,
   and nothing beyond its scope. Keep it small. Match the conventions of the
   surrounding code. You type; the developer reviews. The step's **Executor** line says
   who builds: `delegate` and `delegate-light` run steps 2–3 in an executor subagent
   (see **Delegated execution**); `inline` builds here.

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
     stop and recommend regressing to `/flow:plan` (record the reason in `decisions.md`;
     the move is `state.js <ticket-id> phase plan --reason "<why>"`).

4. **Open the human gate.** Present the evidence to the developer and ask them to
   validate it. The developer decides: approve / request changes / regress. Record the
   decision (who + when) in the step's **Gate** section. Only on approval run
   `state.js <ticket-id> step <step-id> proven`.

5. **Suggest a commit.** On approval, propose a draft commit message for this step —
   but **do not commit**. Do not assume the VCS host or the commit convention; the
   developer commits their way. Once they confirm the step is committed, run
   `state.js <ticket-id> step <step-id> done`.

6. **Keep state in the script.** Every change to `state.md` goes through `state.js` —
   the plugin blocks hand edits. Record anything else worth keeping, such as an
   escalation, with `state.js <ticket-id> log "<text>"`.

## Delegated execution

When the step is `Executor: delegate` or `delegate-light` and the executor agents are
available, steps 2–3 run in one: the build's file reads and command output stay out of
the main session's context, and the typing runs on a cheaper model. The main session
keeps steps 1 and 4–6 — it alone talks to the developer and writes `state.md`.

- **The agent.** `delegate` → `flow:step-executor` (Sonnet). `delegate-light` →
  `flow:step-executor-light` (Haiku). Same instructions; each pins its model.
- **No Executor set** (e.g. a step planned before the field existed): delegate a step
  whose Spec, Changes and Proof are complete enough to build without a decision. Build
  inline instead: spikes and investigations, steps whose Spec leaves a choice open,
  and proofs that need the developer during the step.
- **The brief.** The ticket id, the step id, and the project root; the agent reads the
  specs itself, so do not retell the plan. One agent at a time, and no edits in the
  main session while it runs.
- **Check the work, not the report.** Before the gate, read the step's Evidence entries
  and review the diff (`git diff`) against the step's Spec and Changes. The runner wrote
  the evidence, so do not re-run the proof; re-run it through the runner only when an
  entry has no log under `evidence/` or disagrees with the diff. A report that disagrees
  with the evidence or the diff goes back to the agent.
- **When it stops.** A question, a missing decision or a recommendation to regress goes
  to the developer; never answer in their place. After three failing proof attempts,
  decide with the developer: clarify the step and send it back, re-dispatch it one
  model up in a new agent call — `flow:step-executor-light` → `flow:step-executor` →
  `flow:step-executor` with `model: opus` — or build it inline. Log the escalation with
  `state.js <ticket-id> log "<text>"`; a `delegate-light` step that needed more is a
  signal for the next plan.
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
