---
name: retro
description: >
  Look back at a ticket's .specs record and propose environment changes that make the next ticket go better.
disable-model-invocation: true
argument-hint: "<ticket-id>"
---

# /flow:retro

A retrospective on one ticket, read from its record: what made the work slower or
riskier, and what in the **environment** (the project's instructions, its automated
checks, the way the flow was used) would prevent it next time. It proposes; the
developer picks what to apply. It writes only `retro.md`.

## Before you start

Read `.specs/CONVENTIONS.md`, then the ticket's `state.md` and `context.md`.

## Steps

1. **Read the record as the primary source.** Every claim in the retro cites where the
   record shows it:
   - `state.md`'s navigation log: regressions and their reasons, steps moved back,
     escalations, steps added or removed after the plan;
   - `decisions.md`: regressions and changed decisions;
   - each `steps/NN-*.md`: proof runs that failed before the passing one (a `red` run is
     meant to fail; one that passed is the finding), runner notes, the review's
     findings, and the changes requested at the Gate, with their reasons;
   - `plan.md`: the baseline runs, and what they already showed about a proof command;
   - `verification.md`: criteria with a gap; `context.md`: what the developer added
     after understand;
   - a session transcript, when the developer points to one.

2. **Find the candidates**, each a cost the record shows and the environment can remove:
   - **Automated checks**: a mistake a linter, type check or test could have caught. A
     mechanical rule becomes a check (a lint rule, a test, a CI step), not a sentence.
   - **Project instructions**: a convention the review or a gate had to restate, a gotcha
     found mid-flow, a place the agents searched too long. A judgement call becomes a
     line in the project's `CLAUDE.md`, or in the guide it points to.
   - **Plan**: a step escalated a model tier, was split or re-planned, or caused a
     regression; what the plan could have known.
   - **Proof**: runs that failed for the proof's own sake, an exit code that was not the
     verdict, a test the review called tautological.
   - **The project profile**: what the flow had to learn again here, and every ticket
     will need: a proof command's flags or duration, a slow run that belonged at
     verify, the commit policy, the PR format. It becomes a line in
     `.specs/PROJECT.md`, which the next plan reads.
   - **Context**: what the developer had to add after understand that the ticket could
     carry next time.

   The search is done when every regression, escalation, failed proof run and requested
   change in the record maps to a candidate, or to "nothing to change" with the reason.

3. **Write `retro.md`** in the ticket's folder: the candidates, most severe first, each
   with what happened (cited), the change proposed and where it goes (a file, a check, a
   habit), and the cost it removes.

   A candidate about the flow itself (a command that misled, a gate that was missing, a
   script that got in the way) is not the project's to fix. Put those last, under
   **Feedback for the flow**, each written to be pasted as an issue as it stands:
   - a title that names the phase or script and what went wrong;
   - what happened, in the flow's terms (the command, what it did, what the ticket
     needed), with the cost it had, and without the project's names, code or data;
   - the change proposed;
   - the flow's version, from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.

## Handoff

Present the candidates and ask which to apply; applying one is a change of its own, made
by the developer or at their request. When there is feedback for the flow, say so and
name where it goes: the issue tracker of the plugin's repository (the `repository` in
that manifest). Posting it is the developer's.
