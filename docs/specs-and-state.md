# Specs & state

`.specs/` is the flow's memory: the durable, auditable record of the work, living in
the *consuming* project. State lives here on disk — never only in the agent's context —
so the work survives context compaction and any skill can resume from it.

## Layout

```
.specs/
  CONVENTIONS.md            # shared contract, written once per project
  <ticket-id>/
    state.md                # single source of truth (see below)
    understanding.md        # problem, scope, acceptance criteria (+ design notes)
    context.md              # extra context the developer provides
    discoveries.md          # exploration findings and options
    decisions.md            # ADR log: chosen approach, trade-offs, regression reasons
    plan.md                 # the step breakdown
    steps/
      _TEMPLATE.md          # template flow-plan copies per step
      NN-<slug>.md          # one spec per step: spec, changes, proof, evidence, gate
    assets/                 # Figma exports, screenshots, reference images
    pr.md                   # PR/MR draft (created by flow-ship)
```

`flow-start` scaffolds all of this by running `init_spec.js`. The scaffolder is
idempotent — re-running on an existing ticket overwrites nothing.

## `CONVENTIONS.md` — the shared contract

Written once per project and read by every skill at start. It is how independent
skills stay consistent without referencing each other's files. It documents the state
schema, the navigation rules, the gate protocol, the principles, and the git/PR
policy. It is safe to edit to fit local conventions.

## `state.md` — the single source of truth

Parseable front matter plus a human-readable navigation log:

```markdown
---
ticket: "AB-1234"
title: "Add CSV export to reports"
created: "2026-06-19"
phase: execute            # start|understand|design|explore|plan|execute|verify|ship|done
design_involved: true     # unknown | true | false
proof_definition: "pnpm test + screenshot of the modal"
current_step: "02"
steps:
  - id: "01"; title: "..."; status: done       # todo | in-progress | proven | done
  - id: "02"; title: "..."; status: in-progress
---

## Where we are
...

## Navigation log
- understand → explore (design skipped: no figma)
- explore → plan
- (regression) execute → plan: step 02 proof failed, approach changed — see decisions.md
```

Field meanings:

- **`phase`** — the current phase. Skills set it as they run.
- **`design_involved`** — set by `flow-understand`. Gates whether `flow-design` runs.
- **`proof_definition`** — what counts as proof for this work; set in `flow-plan`.
- **`current_step`** — the step being worked, or `null`.
- **`steps`** — one entry per planned step, with a status that advances
  `todo → in-progress → proven → done`.

## Step specs

Each step has its own file with five parts: **Spec** (what it delivers), **Changes**
(what to touch), **Proof** (how to prove it), **Evidence** (raw output, pasted after
running the proof), and **Gate** (the human decision). `flow-plan` fills Spec/Changes/
Proof; `flow-execute` and `flow-verify` fill Evidence and Gate.

## Gates — "make it prove it"

A step is not done because the agent says so:

- Proof is **raw evidence** — the actual command, its exit code, real output, or a
  screenshot path. Numbers, not opinions.
- The agent **never marks its own work as passing.** It presents evidence; you
  validate it.
- Advancing past a step is **your** decision, recorded in the step's Gate section.

## Navigation — human-driven and bidirectional

- You drive every transition. The agent recommends and proves; it never auto-advances.
- You can **advance**, **repeat** the current phase, or **regress** to an earlier one.
- A regression is appended to the navigation log *and* to `decisions.md` with its
  reason. History is never rewritten.
- Run `flow-status` anytime to see where you are and what to run next.

## Versioning `.specs/`

Whether to commit `.specs/` is the consuming project's choice — ffloww does not impose
a policy. Committed, it doubles as a reviewable ADR/decision trail and feeds the PR
draft; ignored, it stays a local working record.
