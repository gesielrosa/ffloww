---
name: plan
description: >
  Record the chosen approach as an ADR and slice the work into small, provable steps.
disable-model-invocation: true
argument-hint: "<ticket-id>"
---

# /flow:plan

The convergent phase: turn the explored options into a recorded decision and a set of
small, buildable steps. **You architect, it types**: the approach and the slicing are
the developer's choices; this phase drafts the ADR and the step specs from them, writing
`decisions.md`, `plan.md`, and `steps/`. Building starts in `/flow:execute`.

## Before you start

Read `.specs/CONVENTIONS.md` and `.specs/PROJECT.md`, the project profile, then the
ticket's `state.md`, `context.md`, `understanding.md`, and `discoveries.md`. A project
without a profile gets the empty one from the scaffolder, which leaves the ticket as it
is: `node "${CLAUDE_PLUGIN_ROOT}/scripts/init_spec.js" <ticket-id> --root "<project-root>"`.
On the full route, without a context map and
options in `discoveries.md`, the next command is `/flow:explore <ticket-id>`: say so and
stop. On the short route (`route: short`), the plan maps the change itself.

## Steps

1. **Record the decision.** On the full route, the developer chooses among the options in
   `discoveries.md`; when they have not chosen yet, present the options and ask. On the
   short route, read the files the change touches and propose its one approach, with
   `file:line` evidence, for the developer to confirm. Once chosen, append an ADR entry to
   `decisions.md` (append-only): the context, the decision and why, in one to three
   sentences, plus the rejected options and the consequences when there was a real
   trade-off.

2. **Agree the proof strategy.** What counts as proof is project-defined (often tests,
   sometimes a command's output or a screenshot). Start from the profile's **Proof
   commands**, and ask the developer for what they leave open. Record it through the
   state script, from the project root:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> set proof_definition "<the proof>"
   ```

   Then take the **baseline**: run each kind of proof command the steps will use once,
   on the untouched tree, through the proof runner (the lint, the typecheck, a test
   filter pointed at an existing test, to see that it narrows the run):

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/run_proof.js" <ticket-id> plan --label "baseline: <what>" --root "<project-root>" --cmd "<command>"
   ```

   The runner appends each run to `plan.md`. A baseline is done when the command ran
   with the flags the steps will use, is green before the ticket, and its duration is
   known; a guard that is already red is fixed, narrowed or left out, the developer's
   call. A slow run the profile already times (the whole suite, a build) is taken from
   there; one it does not time is the developer's to run or to vouch for.

   Then bring the profile up to what the baseline showed, with Edit: a proof command it
   lacks, a flag or a duration it has wrong, and the developer's line for fast once
   they give it. The next ticket's plan starts from it.

3. **Slice the work into vertical steps.** Each step is a **tracer bullet**: a narrow
   path through every layer it touches, provable on its own through the entry point the
   acceptance criteria use (the command, the endpoint, the screen), roughly one commit.
   A slice by layer (all the data first, then the API, then the UI) proves only an
   interface nothing calls yet. Refactoring that makes the change easy comes first, as
   its own step. A wide mechanical change (a rename across the codebase) goes
   expand–contract: add the new form, move the callers in batches, then remove the old
   one. A step too big to prove in one go becomes two.

   Size each step's Proof to the step: the tests of what it changes (a filter the
   baseline showed narrowing the run), and the guards that are fast. A slow run (the
   whole suite of a large project, a build, an end-to-end run) runs once for the
   ticket, at `/flow:verify`; on the short route, in the last step. Where fast ends is
   the developer's line, in the profile (`Fast ends at`); until they draw it, a proof
   that runs in seconds is fast and one that takes minutes is slow.

   Where only a runtime tail shows a criterion (a build, then a probe, an end-to-end
   run or a comparison with its controls), that tail is a step of its own, after the
   code steps it exercises and built `inline`: its runs are long, it has little to
   type, and an executor would spend its turn budget waiting on them.

   For each step, copy `steps/_TEMPLATE.md` to `steps/NN-<slug>.md` (NN = 01, 02, …),
   replace the `<n>`/`<title>` placeholders, and fill **Spec**, **Changes**, and
   **Proof**: one command per line, each exiting non-zero exactly when the step fails
   its criterion, or naming the exit code that passes; **Evidence** and **Gate** belong
   to `/flow:execute`.

   Mark a Proof command `red first` when it proves new behavior and is fast: it runs
   once before the change, where it has to fail, and again after. Guards (lint,
   typecheck, the existing suite) and mechanical steps carry no mark. A slow proof of
   new behavior runs once, after the change; when the developer wants to see it fail,
   a last step breaks the change, shows that proof red, and restores it. For a bug,
   the fixing step's Proof is the reproduction from `discoveries.md`, made a
   regression test where a seam reaches the bug, marked `red first`.

   Then fill `plan.md` with Edit, so the baseline entries the runner recorded stay as
   they are: the approach in a paragraph, the ordered steps with the acceptance
   criteria each one proves, the proof strategy with the slow runs left for verify,
   and **Criteria and proof**, one row per acceptance criterion: the level of its
   proof (`runtime`: the running product; `test`; `construction`: read off the code;
   `manual`: the developer checks), the step that proves it, and the command.
   `/flow:verify` runs that table as written. Before a row plans a runtime proof, read
   from the code that the environment or path the criterion names reaches the change
   (a flag, a hidden entry, a platform with no target). A criterion this ticket will
   not show, or not at the level it asks for, is a `gap` row with the reason.

4. **Choose who builds each step.** Set each step's **Executor** line to one of:
   - `delegate`: a subagent on Sonnet builds it, so the spec must be buildable without a
     decision: the files to touch, the existing code to follow (`file:line`), and the
     exact proof commands.
   - `delegate-light`: a lighter subagent on Haiku, for mechanical steps with nothing to
     interpret: a rename or move, a config or copy change, a field or test case that
     mirrors an existing one line for line, with a fast, deterministic proof. New logic,
     changes across modules, and anything touching security, data, or concurrency go to
     `delegate`.
   - `inline`: the main session builds it: spikes and investigations, steps that leave a
     choice open, and proofs that need the developer during the step.

   Aim for `delegate` or `delegate-light` by writing complete specs; when unsure between
   the two, choose `delegate`. The developer can change any step when approving the plan.

5. **Mirror into state** through the state script: set the phase, then add one entry per
   step, ids matching the NN files. `/flow:execute` sets the current step when work
   starts. On a re-plan, `remove-step <id> --reason "<why>"` drops a step still `todo`.
   The ticket starts with the profile's commit policy. When the developer prefers one
   commit for the whole ticket over one per step, record it with `set commit at-end`,
   and in the profile's `Policy` too when they say it is how they work in this project.

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase plan
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> add-step 01 "<step title>"
   ```

## Handoff

Present the plan for the developer's approval: the decision, the proof strategy with
its baseline durations and the slow runs left for verify, and the ordered steps with
who builds each, the criteria each proves, and the proofs marked `red first`, any of
which the developer can change. Show the criteria table and name each `gap`: a gap
stands once the developer accepts it here. Say how the steps are committed (one by
one, unless the developer chose one commit at the end), and what you added to the
profile. Ask whether the granularity is right: a step to split or merge, a step that
cannot be proven on its own.
Once approved, name the next command from the `Next:` line of the state output, and
suggest `/clear` before it: the plan is on disk. When the
developer wants to revisit exploration or understanding instead, that is a regression:
record the reason in `decisions.md` and move back with
`state.js <ticket-id> phase <earlier phase> --reason "<why>"`.
