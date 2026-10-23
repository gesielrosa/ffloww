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
      _TEMPLATE.md          # template /flow:plan copies per step
      NN-<slug>.md          # one spec per step: executor, spec, changes, proof, evidence, gate
    verification.md         # whole-ticket check, one entry per acceptance criterion
    evidence/               # full proof logs, written by the proof runner
    assets/                 # Figma exports, screenshots, reference images
    pr.md                   # PR/MR draft (created by /flow:ship)
```

`/flow:start` scaffolds all of this by running `init_spec.js`. The scaffolder is
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
phase: execute
design_involved: true
proof_definition: "pnpm test + screenshot of the modal"
current_step: "02"
steps:
  - { id: "01", title: "Add the CSV exporter", status: done }
  - { id: "02", title: "Wire the export button", status: in-progress }
---

# AB-1234 — Add CSV export to reports

## Where we are

Phase: **execute**. Steps: 1 of 2 done; current: 02 — Wire the export button (in-progress).
Next: run `/flow:execute` to continue step 02 — Wire the export button (in progress).

## Navigation log

- 2026-06-19 — flow initialized (phase: start)
- 2026-06-19 — start → understand
- 2026-06-20 — explore → plan
- 2026-06-21 — step 02: todo → in-progress
- 2026-06-22 — (regression) execute → plan: step 02 proof failed, approach changed
```

### The state script

`state.md` changes only through the plugin's `scripts/state.js` — the guard hook blocks
hand edits. Skills call it; you can too:

```bash
node state.js AB-1234 show                 # where we are, and the next move
node state.js AB-1234 phase plan           # forward moves are free
node state.js AB-1234 phase explore --reason "missed a caller"   # back = regression
node state.js AB-1234 add-step 03 "Add the download link"
node state.js AB-1234 step 03 in-progress  # one status at a time, one step in progress
```

It keeps the front matter valid YAML, checks every phase and step move, syncs each step
spec's Status line, appends the navigation log, and rewrites "Where we are".

Field meanings:

- **`phase`** — the current phase. Skills set it as they run, through `state.js`.
- **`design_involved`** — set by `/flow:understand`. Gates whether `/flow:design` runs.
- **`proof_definition`** — what counts as proof for this work; set in `/flow:plan`.
- **`current_step`** — the step being worked, or `null`.
- **`steps`** — one entry per planned step, with a status that advances
  `todo → in-progress → proven → done`.

## Step specs

Each step has its own file with an **Executor** line and five parts: **Spec** (what it
delivers), **Changes** (what to touch), **Proof** (how to prove it), **Evidence** (raw
output from running the proof), and **Gate** (the human decision). `/flow:plan` fills
Executor/Spec/Changes/Proof; `/flow:execute` and `/flow:verify` fill Evidence and Gate.

**Executor** says who builds the step: `delegate` hands it to the `flow:step-executor`
subagent, which runs on a cheaper model and keeps the build's file reads and command
output out of the main session; `inline` keeps it in the main session (spikes, steps
that leave a choice open, proofs that need you during the step). You can flip it when
you approve the plan.

**Evidence** is recorded by the plugin's proof runner (`scripts/run_proof.js`), not
retyped: it runs each proof command, saves the full output to `evidence/`, and appends
the command, exit code, duration, last lines, and log path to the step — or, for a
whole-ticket check, to `verification.md`, one entry per acceptance criterion. The
record comes from the script, so the agent cannot paraphrase or invent it.

## Gates — "make it prove it"

A step is not done because the agent says so:

- Proof is **raw evidence** — the actual command, its exit code, real output, or a
  screenshot path. Numbers, not opinions.
- The agent **never marks its own work as passing.** It presents evidence; you
  validate it.
- Advancing past a step is **your** decision, recorded in the step's Gate section.
- These rules are **enforced in code**, not only asked for. The plugin's `PreToolUse`
  hook (`scripts/guard.js`) blocks, in any session, edits to the proof logs under
  `evidence/`, any edit that would remove or change an evidence entry the runner
  recorded, hand edits to `state.md`, and hand changes to a step's Status line. In the
  flow's subagents it also blocks git commands that write, `state.js` commands other
  than `show`, and changes to a step's Executor line or Gate section.

## Navigation — human-driven and bidirectional

- You drive every transition. The agent recommends and proves; it never auto-advances.
- You can **advance**, **repeat** the current phase, or **regress** to an earlier one.
- A regression is appended to the navigation log *and* to `decisions.md` with its
  reason. History is never rewritten.
- Run `/flow:status` anytime to see where you are and what to run next.

## Versioning `.specs/`

Whether to commit `.specs/` is the consuming project's choice — ffloww does not impose
a policy. Committed, it doubles as a reviewable ADR/decision trail and feeds the PR
draft; ignored, it stays a local working record.
