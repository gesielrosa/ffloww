#!/usr/bin/env bash
# A project as flow 0.1 (APM) left it, committed: CONVENTIONS.md is the 0.1 contract with a
# team rule added; TEST-9 is mid-execute with a hand-written state.md (step 02 "blocked"),
# evidence pasted by hand on step 01, and the 0.1 step template; TEST-8 is done.
# Generated from scripts/history/ (conventions 6a95c89ef4cd5a5a, step-template 89b3cb6943e1eb0f).
set -euo pipefail
git init -q
mkdir -p .specs/TEST-9/steps .specs/TEST-9/assets .specs/TEST-8
cat > .specs/CONVENTIONS.md <<'CONTRACT'
# .specs — ffloww flow conventions

Shared contract for the ffloww development flow. Every `flow-*` skill reads this
file, the ticket's `state.md`, and the ticket's `context.md` before acting. Written
once per project; safe to edit to fit local conventions. Generated 2026-05-04.

## What .specs/ is

`.specs/<ticket-id>/` is the durable, auditable record of one piece of work — the
flow's memory. It survives across sessions and context resets. **State lives on
disk here, never only in the assistant's context.**

Per ticket:

- `state.md` — single source of truth: current phase, step statuses, navigation log
- `understanding.md` — problem, scope, acceptance criteria (+ design notes)
- `context.md` — extra context the developer provides (not in the ticket, design, or code)
- `discoveries.md` — exploration findings and the options considered
- `decisions.md` — ADR log: chosen approach, trade-offs, regression reasons
- `plan.md` — the step breakdown
- `steps/NN-<slug>.md` — one spec per step (copy from `steps/_TEMPLATE.md`)
- `assets/` — Figma exports, screenshots, images used as reference

## The flow

| Phase | Skill | Produces |
| --- | --- | --- |
| start | `flow-start` | this scaffold |
| understand | `flow-understand` | `understanding.md` (+ acceptance criteria) |
| design *(if any)* | `flow-design` | `assets/` + design notes |
| explore | `flow-explore` | `discoveries.md` (options) |
| plan | `flow-plan` | `decisions.md` + `steps/NN-*.md` |
| execute | `flow-execute` | code for one step + proof + commit *suggestion* |
| verify | `flow-verify` | raw evidence for a step |
| ship | `flow-ship` | PR/MR draft built from these specs |

Two utility skills run anytime, outside the phases: `flow-status` (see where you are
and what to run next) and `flow-context` (add developer context to `context.md`).

## state.md schema

Front matter fields:

- `phase`: one of `start | understand | design | explore | plan | execute | verify | ship | done`
- `design_involved`: `unknown | true | false`
- `proof_definition`: project-defined proof (usually tests); confirm with the human
- `current_step`: id of the step in progress, or `null`
- `steps`: list of `{ id, title, status }`; status is `todo | in-progress | proven | done`

## Navigation rules

- **The developer drives transitions.** The assistant never auto-advances a phase.
- Movement is **bidirectional**: advance, repeat the current phase, or regress.
- A regression is appended to the navigation log *and* to `decisions.md` with its
  reason — history is never rewritten.
- On finishing, every skill updates `state.md` and recommends the next move.
- **Context** can be added anytime via `flow-context`; the default moment is when
  `flow-understand` closes, where the developer fills gaps the ticket and code do not
  cover. Every skill reads `context.md` at start.

## Gate protocol — "make it prove it"

- Proof is **raw evidence**, not prose: the actual command, its exit code, real test
  output, or a screenshot path. Numbers, not opinions.
- The assistant **never marks its own work as passing.** It presents evidence; the
  human validates.
- Advancing past a step is a human decision, recorded in the step's `Gate` section.

## Principles

Give it context · explore before build (surface options) · *you* architect, *it*
types · work in small steps · don't trust it, make it prove it · own it.

## Git & PR

Commits and PR/MR creation are **suggested, never executed** by the flow. The
package does not assume your VCS host or commit conventions. `flow-execute`
proposes a commit message; `flow-ship` assembles a PR/MR draft from these specs and
suggests the steps to ship. You run them, your way.

## Team rules

- Run `pnpm lint` before every proof; a lint failure fails the step.
CONTRACT
cat > .specs/TEST-9/state.md <<'STATE'
---
ticket: "TEST-9"
title: "Export invoices as CSV"
created: "2026-05-04"
phase: execute
design_involved: false
proof_definition: "npm test"
current_step: 02
steps:
  - id: 01
    title: Add the CSV exporter
    status: done
  - id: 02
    title: Wire the export button
    status: blocked
  - id: 03
    title: Document the export
    status: todo
---

# TEST-9 — Export invoices as CSV

## Where we are

Phase: **execute**. Step 02 is blocked on the pricing API. Next: run `flow-execute`
once it is back.

## Navigation log

- 2026-05-04 — flow initialized (phase: start)
- 2026-05-04 — start → understand → explore → plan
- 2026-05-05 — step 01 done
- 2026-05-06 — step 02 blocked: the pricing API is down
STATE
cat > .specs/TEST-9/steps/_TEMPLATE.md <<'SPEC'
# Step <n> — <title>

- Status: todo <!-- todo | in-progress | proven | done -->
- Spec: <!-- what this step delivers; its scope boundary -->

## Changes

<!-- Files/areas to touch. Keep the step small. -->

## Proof

<!-- The project-defined proof for THIS step: test names, command, expected output. -->

## Evidence

<!-- RAW output pasted after running the proof: command + exit code + test output, or
     a screenshot path. Numbers, not opinions. The human reviews this before the gate. -->

## Gate

<!-- Human decision: approved / changes requested / regress. Who + when. -->
SPEC
cat > .specs/TEST-9/steps/01-csv-exporter.md <<'SPEC'
# Step 1 — Add the CSV exporter

- Status: done <!-- todo | in-progress | proven | done -->
- Spec: <!-- what this step delivers; its scope boundary -->

## Changes

<!-- Files/areas to touch. Keep the step small. -->

## Proof

<!-- The project-defined proof for THIS step: test names, command, expected output. -->

## Evidence

<!-- RAW output pasted after running the proof: command + exit code + test output, or
     a screenshot path. Numbers, not opinions. The human reviews this before the gate. -->

$ npm test -- csv
# tests 6
# pass 6
exit 0

## Gate

<!-- Human decision: approved / changes requested / regress. Who + when. -->

Approved by the developer, 2026-05-05.
SPEC
cat > .specs/TEST-9/steps/02-export-button.md <<'SPEC'
# Step 2 — Wire the export button

- Status: todo <!-- todo | in-progress | proven | done -->
- Spec: <!-- what this step delivers; its scope boundary -->

## Changes

<!-- Files/areas to touch. Keep the step small. -->

## Proof

<!-- The project-defined proof for THIS step: test names, command, expected output. -->

## Evidence

<!-- RAW output pasted after running the proof: command + exit code + test output, or
     a screenshot path. Numbers, not opinions. The human reviews this before the gate. -->

## Gate

<!-- Human decision: approved / changes requested / regress. Who + when. -->
SPEC
cat > .specs/TEST-9/steps/03-docs.md <<'SPEC'
# Step 3 — Document the export

- Status: todo <!-- todo | in-progress | proven | done -->
- Spec: <!-- what this step delivers; its scope boundary -->

## Changes

<!-- Files/areas to touch. Keep the step small. -->

## Proof

<!-- The project-defined proof for THIS step: test names, command, expected output. -->

## Evidence

<!-- RAW output pasted after running the proof: command + exit code + test output, or
     a screenshot path. Numbers, not opinions. The human reviews this before the gate. -->

## Gate

<!-- Human decision: approved / changes requested / regress. Who + when. -->
SPEC
cat > .specs/TEST-8/state.md <<'STATE'
---
ticket: "TEST-8"
title: "Rename the invoice number column"
created: "2026-04-20"
phase: done
design_involved: false
proof_definition: "npm test"
current_step: null
steps:
  - id: 01
    title: Rename the column
    status: done
---

# TEST-8 — Rename the invoice number column

## Where we are

Phase: **done**. Shipped.

## Navigation log

- 2026-04-20 — flow initialized (phase: start)
- 2026-04-22 — shipped
STATE
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -qm "flow 0.1 record"
