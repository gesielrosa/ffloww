---
name: plan
description: >
  Use after exploring, to converge on a plan. Records the developer's chosen approach
  as an ADR, agrees the proof strategy, and slices the work into small step specs,
  each marked delegate, delegate-light, or inline. Trigger on "plan AB-1234", "make a
  plan", or "break this into steps".
---

# /flow:plan

The convergent phase. Turn the explored options into a recorded decision and a set of
small, buildable steps. **You architect, it types**: the approach and the slicing are
the developer's choices; this skill drafts the ADR and the step specs from them.

## Before you start

- `discoveries.md` should hold the context map and options. If not, run `/flow:explore`.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md`, `understanding.md`,
  `discoveries.md`, and `context.md`.

## Steps

1. **Confirm the decision.** The developer chooses among the options in
   `discoveries.md`. If they have not chosen, present the options and ask — do not
   decide for them. Record the choice as an ADR entry in `decisions.md`: context, the
   decision, trade-offs (which options were rejected and why), and consequences.
   `decisions.md` is append-only.

2. **Agree the proof strategy.** Decide what counts as proof for this work — it is
   project-defined (often tests, sometimes a command's output or a screenshot). Ask
   the developer if it is not already clear. Record it through the flow's state
   script, from the project root:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> set proof_definition "<the proof>"
   ```

3. **Break into small steps.** Slice the work into steps that are each small,
   independently buildable, and independently provable (roughly one commit each). For
   each step, copy `steps/_TEMPLATE.md` to `steps/NN-<slug>.md` (NN = 01, 02, …),
   replace the `<n>`/`<title>` placeholders, and fill the **Spec**, **Changes**, and
   **Proof** sections. Leave **Evidence** and **Gate** for `/flow:execute`.

4. **Choose who builds each step.** Set each step's **Executor** line to one of:
   - `delegate` — a subagent on Sonnet builds it, so the spec must be buildable without
     a decision: the files to touch, the existing code to follow (`file:line`), and the
     exact proof commands.
   - `delegate-light` — a lighter subagent on Haiku, for mechanical steps with nothing
     to interpret: a rename or move, a config or copy change, a field or test case that
     mirrors an existing one line for line, with a fast, deterministic proof. Not for
     new logic, changes across modules, or anything touching security, data, or
     concurrency.
   - `inline` — the main session builds it: spikes and investigations, steps that leave
     a choice open, and proofs that need the developer during the step.

   Aim for `delegate` or `delegate-light` by writing complete specs; when unsure
   between the two, choose `delegate`. The developer can change any step when
   approving the plan.

5. **Mirror into state** through the state script: set the phase, then add one entry
   per step, ids matching the NN files. It writes the navigation log; `/flow:execute`
   sets the current step when work starts. On a re-plan, `remove-step <id> --reason
   "<why>"` drops a step that is still `todo`.

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase plan
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> add-step 01 "<step title>"
   ```

## Handoff

Present the plan back — the decision, the proof strategy, and the ordered steps with
who builds each — for the developer's approval. Then recommend `/flow:execute` for the
first step and wait for the go-ahead. The plan is on disk, so suggest starting
execution in a fresh context (`/clear` in Claude Code). If the developer wants to
revisit exploration or understanding, that is a regression: record the reason in
`decisions.md` and move back with `state.js <ticket-id> phase <earlier phase> --reason
"<why>"`.

## Guardrails

- Do not write production code here — that is `/flow:execute`.
- The developer owns the approach and the slicing; never finalize a decision they have
  not confirmed.
- Keep steps small; a step too big to prove in one go should be split.
- Keep the plan on disk (`decisions.md`, `steps/`, `state.md`), not only in chat.
- Never run `git`.
