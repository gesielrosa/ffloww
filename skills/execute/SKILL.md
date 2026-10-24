---
name: execute
description: >
  Build and prove one planned step, then stop at the human gate.
disable-model-invocation: true
argument-hint: "<ticket-id> [step-id]"
---

# /flow:execute

The per-step loop: build one planned step, prove it with real evidence, and stop at the
human gate. One step per run, within that step's scope.

## Before you start

Read `.specs/CONVENTIONS.md`, then the ticket's `state.md`, `context.md`, `decisions.md`
(the chosen approach), and the step's `steps/NN-<slug>.md`. Without `steps:` and a
`proof_definition` in `state.md`, the next command is `/flow:plan <ticket-id>`: say so
and stop.

## Steps

1. **Select the step**: the one the developer names, or the next `todo`. Start it
   through the state script, from the project root; it sets the current step and syncs
   the step spec's Status line:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase execute
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> step <step-id> in-progress
   ```

   The script refuses while another step is in progress, or proven but not yet
   committed. For the latter, ask the developer to commit it (then `step <id> done`);
   starting anyway takes `--reason "<why>"`, and the review in step 4 then sees both
   steps' changes.

2. **Build only this step.** Implement the step's **Spec** and **Changes**, nothing
   beyond, matching the conventions of the surrounding code. The **Executor** line says
   who builds: `delegate` and `delegate-light` run steps 2–3 in an executor subagent
   (see **Delegated execution**); `inline` builds here.

3. **Prove it.** Run each command of the step's **Proof** (per `proof_definition`)
   through the proof runner:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/run_proof.js" <ticket-id> <step-id> --root "<project-root>" --cmd "<command>"
   ```

   The runner saves the full output to `evidence/` and appends the raw entry to the
   step's **Evidence** section: the exact command, its exit code, the duration, the last
   lines of output, and the log path. Give the Bash call a timeout that fits the proof. A
   proof that is not a command (a screenshot) is saved to the path the Proof names, and
   you add an Evidence entry with that path. Every result you report is one the runner
   recorded.
   - A Proof that asks for a red run before the change (a bug's reproduction) runs first,
     before the build, with `--label "red: before the fix"`; that run is not an attempt.
   - A failing proof is the loop: fix and re-run, for up to three attempts, then take it
     to the developer. If the chosen approach turns out wrong, stop and recommend
     regressing to `/flow:plan` (record the reason in `decisions.md`; the move is
     `state.js <ticket-id> phase plan --reason "<why>"`).

4. **Review the change in a fresh context.** Call the Agent tool with subagent_type
   `flow:diff-reviewer`, passing the ticket id, the step id and the project root. It
   reads the change cold and reports cited findings on three axes: Spec (missing, scope,
   wrong), Proof (tautological, internal, untested) and Standards. Each finding is a lead:
   open its cited lines before you take it to the gate. One review per step: after
   changes requested at the gate, check the new change against the findings it answers,
   and review again only when the developer asks.
   - A `delegate-light` step, a mechanical mirror of existing code, is reviewed here
     instead, against its Spec and Changes: `git status --porcelain` lists every changed
     and new file, `git diff HEAD` shows the changes to tracked files, and each new file
     is read in full, since `git diff` leaves it out.

5. **Open the human gate.** A passing proof readies the step for the gate; the
   developer's approval is what makes it `proven`. Present the evidence, the changed
   files (`git status --porcelain`), and the review findings you confirmed, by axis, and
   ask the developer to validate them: approve / request changes / regress. Record the
   decision (who + when) in the step's **Gate** section. On approval, run
   `state.js <ticket-id> step <step-id> proven`.

6. **Draft the commit.** On approval, propose a commit message for this step in the
   developer's conventions; the developer commits. Once they confirm the commit, run
   `state.js <ticket-id> step <step-id> done`. Anything else worth keeping, such as an
   escalation, goes to the log: `state.js <ticket-id> log "<text>"`.

## Delegated execution

When the step is `Executor: delegate` or `delegate-light`, steps 2–3 run in an executor
subagent: the build's file reads and command output stay out of the main session's
context, and the typing runs on a cheaper model. The main session keeps steps 1 and 4–6;
it alone talks to the developer and writes `state.md`.

- **The agent.** Call the Agent tool with subagent_type `flow:step-executor` for
  `delegate` (Sonnet) or `flow:step-executor-light` for `delegate-light` (Haiku). Same
  instructions; each pins its model.
- **No Executor set** (a step planned before the field existed): delegate a step whose
  Spec, Changes and Proof are complete enough to build without a decision; build inline
  spikes and investigations, steps whose Spec leaves a choice open, and proofs that need
  the developer during the step.
- **The brief.** The ticket id, the step id, and the project root; the agent reads the
  specs itself, so the plan needs no retelling. One agent at a time, and the main session
  leaves the code alone while it runs.
- **Check the work, not the report.** Read the step's Evidence entries and compare the
  agent's file list with `git status --porcelain`; the review in step 4 reads the change
  itself. The runner wrote the evidence, so re-run a proof (through the runner) only when
  an entry has no log under `evidence/` or disagrees with the change. A report that
  disagrees with the evidence or the change goes back to the agent.
- **When it stops.** A question, a missing decision, or a recommendation to regress goes
  to the developer, who answers it. After three failing proof attempts, decide with the
  developer: clarify the step and send it back, re-dispatch it one model up in a new
  agent call (`flow:step-executor-light` → `flow:step-executor` → `flow:step-executor`
  with `model: opus`), or build it inline. Log the escalation with
  `state.js <ticket-id> log "<text>"`; a `delegate-light` step that needed more is a
  signal for the next plan.
- **Changes requested at the gate** go to the same agent, which keeps its context; it
  re-runs the proof through the runner.

## Handoff

Name the next command from the `Next:` line of the state output (another
`/flow:execute` while steps remain, then the whole-ticket `/flow:verify`, or `/flow:ship`
on the short route), and suggest `/clear` before it: everything the next step needs is
on disk.
