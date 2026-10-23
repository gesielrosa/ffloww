---
name: plan
description: >
  Use after exploring, to converge on a plan. The developer picks an approach from the
  options in discoveries.md; this skill records it as an ADR in decisions.md, agrees
  the project's proof strategy, and breaks the work into small, independently buildable
  steps — creating one spec per step under steps/ and mirroring them into state.md. You
  architect, it types: the design choice and the slicing are the developer's; the skill
  drafts and records them. Hands off to /flow:execute. Trigger on "plan AB-1234", "make
  a plan", "break this into steps", or entering the plan phase.
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
   the developer if it is not already clear. Record it in `state.md` as
   `proof_definition`.

3. **Break into small steps.** Slice the work into steps that are each small,
   independently buildable, and independently provable (roughly one commit each). For
   each step, copy `steps/_TEMPLATE.md` to `steps/NN-<slug>.md` (NN = 01, 02, …),
   replace the `<n>`/`<title>` placeholders, and fill the **Spec**, **Changes**, and
   **Proof** sections. Leave **Evidence** and **Gate** for `/flow:execute`.

4. **Choose who builds each step.** Set each step's **Executor** line. `delegate` hands
   the step to a subagent on a cheaper model, so its spec must be buildable without a
   decision: the files to touch, the existing code to follow (`file:line`), and the
   exact proof commands. `inline` keeps it in the main session: spikes and
   investigations, steps that leave a choice open, and proofs that need the developer
   during the step. Aim for `delegate` by writing complete specs; the developer can flip
   any step when approving the plan.

5. **Mirror into state.** In `state.md`: set `phase: plan`, write the proof strategy
   into `proof_definition`, and populate `steps:` with one
   `{ id, title, status: todo }` entry per step (ids matching the NN files). Append a
   navigation-log entry. Leave `current_step: null` — `/flow:execute` sets it when work
   starts.

## Handoff

Present the plan back — the decision, the proof strategy, and the ordered steps with
who builds each — for the developer's approval. Then recommend `/flow:execute` for the
first step and wait for the go-ahead. The plan is on disk, so suggest starting
execution in a fresh context (`/clear` in Claude Code). If the developer wants to
revisit exploration or understanding, that is a regression: log it in the navigation
log and in `decisions.md` with the reason.

## Guardrails

- Do not write production code here — that is `/flow:execute`.
- The developer owns the approach and the slicing; never finalize a decision they have
  not confirmed.
- Keep steps small; a step too big to prove in one go should be split.
- Keep the plan on disk (`decisions.md`, `steps/`, `state.md`), not only in chat.
- Never run `git`.
