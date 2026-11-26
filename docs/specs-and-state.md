# Specs & state

`.specs/` is the flow's memory: the durable, auditable record of the work, living in
the *consuming* project. State lives here on disk — never only in the agent's context —
so the work survives context compaction and any skill can resume from it.

## Layout

```
.specs/
  CONVENTIONS.md            # shared contract, kept current until edited
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

Written into the project by `/flow:start` and read by every phase at start. It is how
independent skills stay consistent without referencing each other's files, and the one
home of the rules they share: the commands and how a phase ends, the state rules, the
roles, the gate protocol, the git/PR policy, and the principles.

Its first line is a stamp with the hash of its body. While the body still matches the
stamp, `/flow:start` refreshes the file to the installed version of the flow; so it
does for an unedited contract written before the stamp existed. It is safe to edit to
fit local conventions: an edited file is kept as is. When the edits sit on an earlier
contract, `/flow:start` warns and `/flow:upgrade` merges them into the current one
(`init_spec.js --print-conventions` prints it).

## `state.md` — the single source of truth

Parseable front matter plus a human-readable navigation log:

```markdown
---
ticket: "AB-1234"
title: "Add CSV export to reports"
created: "2026-06-19"
phase: execute
design_involved: true
route: full
commit: per-step
proof_definition: "pnpm test + screenshot of the modal"
current_step: "02"
steps:
  - { id: "01", title: "Add the CSV exporter", status: done, base: "8a83e71…", head: "26fdaf5…" }
  - { id: "02", title: "Wire the export button", status: in-progress, base: "26fdaf5…" }
---

# AB-1234 — Add CSV export to reports

## Where we are

Phase: **execute**. Steps: 1 of 2 done; current: 02 — Wire the export button (in-progress).
Next: run `/flow:execute AB-1234` to continue step 02 — Wire the export button (in progress).

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
node state.js AB-1234 diff 03              # what step 03 changed, and the git diff for it
node state.js AB-1234 set commit at-end    # one commit for the ticket, after the last gate
node state.js AB-1234 normalize 02=todo     # an older state.md, in the current format (/flow:upgrade)
```

It keeps the front matter valid YAML, checks every phase and step move, syncs each step
spec's Status line, appends the navigation log, and rewrites "Where we are".

When a step starts, the script also snapshots the working tree as a git tree id (`base`),
and again when the step is proven (`head`). A snapshot is built in a temporary index, so
your index, branch and files stay as they are, and it leaves `.specs/` and ignored files
out. `diff <step-id>` prints the files between the two and the `git diff <tree> <tree>`
command, new files included: the step's change alone, whether or not the steps before it
were committed. Outside git, or for a step started before the flow took snapshots, it
says so and the change is the uncommitted work.

Field meanings:

- **`phase`** — the current phase. Skills set it as they run, through `state.js`.
- **`design_involved`** — set by `/flow:understand`. Gates whether `/flow:design` runs.
- **`route`** — `full` (the default) or `short`. `/flow:understand` offers the short
  route for a small, clear change and you choose it: the plan maps the change itself
  instead of a separate explore, and the last step's gate leads to ship, without a
  whole-ticket verify. `/flow:ship` still checks every criterion has evidence.
- **`commit`** — `per-step` (the default) or `at-end`. Per step, each proven step is
  committed, and so `done`, before the next one starts (`--reason` starts it anyway).
  At the end, which you choose with `set commit at-end`, steps stay `proven` while the
  next ones are built; after the last gate `/flow:execute` drafts one commit message
  for the ticket, and that commit makes them all `done`.
- **`proof_definition`** — what counts as proof for this work; set in `/flow:plan`.
- **`current_step`** — the step being worked, or `null`.
- **`steps`** — one entry per planned step, with a status that advances
  `todo → in-progress → proven → done`, and the step's snapshots (`base`, `head`).

## Step specs

Each step has its own file with an **Executor** line and five parts: **Spec** (what it
delivers), **Changes** (what to touch), **Proof** (how to prove it), **Evidence** (raw
output from running the proof), and **Gate** (the human decision). `/flow:plan` fills
Executor/Spec/Changes/Proof; `/flow:execute` and `/flow:verify` fill Evidence and Gate.

**Executor** says who builds the step: `delegate` hands it to the `flow:step-executor`
subagent on Sonnet, which keeps the build's file reads and command output out of the
main session; `delegate-light` hands it to `flow:step-executor-light` on Haiku, for
mechanical steps (a rename, a config change, a case that mirrors an existing one);
`inline` keeps it in the main session (spikes, steps that leave a choice open, proofs
that need you during the step). You can change it when you approve the plan. A
delegated step that fails its proof three times moves one model up: Haiku → Sonnet →
Opus → inline.

**Evidence** is recorded by the plugin's proof runner (`scripts/run_proof.js`), not
retyped: it runs each proof command, saves the full output to `evidence/`, and appends
the command, exit code, duration, last lines, and log path to the step — or, for a
whole-ticket check, to `verification.md`, one entry per acceptance criterion. The
record comes from the script, so the agent cannot paraphrase or invent it. Since a
recorded entry cannot be edited afterwards, the runner masks secrets before it writes
anything (`scripts/lib/redact.js`): the values of environment variables named like
secrets (`*_TOKEN`, `*_PASSWORD`, `*_PAT`, …), auth headers, `key=value` credentials,
credentials in URLs, private keys, and well-known token formats. The entry notes how
many were masked. Proofs should read credentials from environment variables.

A proof's exit code is its verdict: each proof command exits non-zero exactly when its
criterion fails. The runner records what the proof was expected to do beside what it
did, and notes what an exit code can hide:

- `--expect <code>` names the exit code that passes when it is not 0. A search that
  must find nothing runs as `--expect 1 --cmd "grep -rn legacyExport src/"`: `grep`
  exits 1 on a clean miss, and 2 or 127 when it could not look, which `! grep …` would
  turn into a pass.
- `--red` marks a run made **before** the change the proof is for, where it has to
  fail. The plan marks a Proof command `red first` when it proves new behavior and is
  fast enough to run twice (you say what fast is); guards that are green before and
  after (lint, typecheck, the existing suite) and slow proofs run once. A red run that
  passes gets a note: the proof passes without the change, so it cannot fail on it.
- A **note** is added for a command chained with `;`, `||` or a pipe (the exit code is
  its last part's: `cmd; echo $?` always exits 0), a command negated with `!`, a
  command the shell did not find (exit code 127, or `command not found` in the output),
  and an exit code that is not the expected one. Notes go to the gate with the result.

Before the steps are written, `/flow:plan` runs each kind of proof command once on the
untouched tree (`run_proof.js <ticket-id> plan --label "baseline: …"`), recorded in
`plan.md`: the command works with its flags, is green before the ticket, and its
duration is known, which is what decides `red first`.

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
  recorded (in a step spec, `verification.md` or `plan.md`), hand edits to `state.md`,
  and hand changes to a step's Status line. In the
  flow's subagents it also blocks git commands that write, `state.js` commands that
  change the state (`show` and `diff` only read it), and changes to a step's Executor
  line or Gate section.

## Navigation — human-driven and bidirectional

- You drive every transition. Each phase runs only when you type its command and ends
  by naming the next one; the agent proves, and cannot start a phase by itself.
- By default a step starts once the previous proven step is committed (`state.js`
  refuses otherwise; `--reason` starts it anyway); with `commit: at-end` the steps are
  committed together after the last gate. Either way each step's change is reviewed
  alone, from the snapshot taken when it started.
- You can **advance**, **repeat** the current phase, or **regress** to an earlier one.
- A regression is appended to the navigation log *and* to `decisions.md` with its
  reason. History is never rewritten.
- Run `/flow:status` anytime to see where you are and what to run next.

## Upgrading `.specs/` from an earlier version

A record an earlier version of the flow wrote keeps working, and `/flow:upgrade` brings
it up to the installed version. Its script (`scripts/upgrade.js`) first reports, item
by item, and changes nothing; `--apply` then makes the mechanical part:

- an unedited earlier `CONVENTIONS.md` or `steps/_TEMPLATE.md` is replaced by the
  current one, recognized from `scripts/history/` (every contract and step template
  the flow has written);
- a `state.md` in an older shape is rewritten in the current format by
  `state.js normalize`: canonical front matter (a missing `route` becomes `full`), the
  step specs' Status lines in sync, "Where we are" regenerated, one log entry.

What only you can settle comes back as a decision: local edits on an earlier contract
(the report names the contract they started from, so the diff shows exactly your
edits), a value the flow does not know, like a step status `blocked`
(`state.js AB-1234 normalize 02=in-progress`), or a `state.md` the script cannot read.
Steps without an Executor line and evidence written by hand are notes: the flow works
with them as they are. Tickets in phase `done` stay as they are. While work in progress
meets an earlier record, a new or cleared session suggests `/flow:upgrade`.

## Versioning `.specs/`

Whether to commit `.specs/` is the consuming project's choice — ffloww does not impose
a policy. Committed, it doubles as a reviewable ADR/decision trail and feeds the PR
draft; ignored, it stays a local working record.
