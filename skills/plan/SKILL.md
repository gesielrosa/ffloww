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

Read `.specs/CONVENTIONS.md`, then the ticket's `state.md`, `context.md`,
`understanding.md`, and `discoveries.md`. Without a context map and options in
`discoveries.md`, the next command is `/flow:explore <ticket-id>`: say so and stop.

## Steps

1. **Record the decision.** The developer chooses among the options in `discoveries.md`;
   when they have not chosen yet, present the options and ask. Once they choose, append
   an ADR entry to `decisions.md` (append-only): context, the decision, trade-offs (which
   options were rejected and why), and consequences.

2. **Agree the proof strategy.** What counts as proof is project-defined (often tests,
   sometimes a command's output or a screenshot); ask the developer when it is not
   already clear. Record it through the state script, from the project root:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> set proof_definition "<the proof>"
   ```

3. **Break into small steps**, each small, independently buildable, and independently
   provable (roughly one commit each); a step too big to prove in one go becomes two.
   For each, copy `steps/_TEMPLATE.md` to `steps/NN-<slug>.md` (NN = 01, 02, …), replace
   the `<n>`/`<title>` placeholders, and fill **Spec**, **Changes**, and **Proof**;
   **Evidence** and **Gate** belong to `/flow:execute`. Then fill `plan.md`: the approach
   in a paragraph, the ordered steps, and the proof strategy.

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

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase plan
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> add-step 01 "<step title>"
   ```

## Handoff

Present the plan for the developer's approval: the decision, the proof strategy, and the
ordered steps with who builds each. Then name the next command from the `Next:` line of
the state output, and suggest `/clear` before it: the plan is on disk. When the
developer wants to revisit exploration or understanding instead, that is a regression:
record the reason in `decisions.md` and move back with
`state.js <ticket-id> phase <earlier phase> --reason "<why>"`.
