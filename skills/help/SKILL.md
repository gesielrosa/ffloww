---
name: help
description: >
  Explain the ffloww flow: its phases, commands, principles, gates, and the .specs/ record.
disable-model-invocation: true
argument-hint: "[question]"
---

# /flow:help

Explain the ffloww development flow and answer the developer's questions about it. This
command teaches; it changes nothing.

## How to answer

- Answer in plain language, scoped to what the developer asked, drawing on the
  reference below for a focused, correct answer.
- With a ticket active, `.specs/CONVENTIONS.md` and the ticket's `state.md` let you
  tailor the answer to where they are; a pure "where am I / what's next" question is
  `/flow:status`.
- When they describe a situation, name the command that fits it (see the table).

## The one-line idea

> **The AI diverges and types. The human converges and decides.**

Exploration and code are delegated to the AI; the design choice, the slicing, and the
judgment of "is this proven?" stay with the developer.

## The phases

| Phase | Command | What it does |
|---|---|---|
| Understand | `/flow:understand` | Read the ticket; capture problem + acceptance criteria |
| Design *(if any)* | `/flow:design` | Analyze the Figma against the ticket; save to `assets/` |
| Explore | `/flow:explore` | Map the code; surface options (diverge) |
| Plan | `/flow:plan` | Decide the approach (ADR); break into small steps |
| Execute | `/flow:execute` | Build one step; prove it; human gate; draft a commit |
| Verify | `/flow:verify` | Prove a step or the whole ticket with raw evidence |
| Ship | `/flow:ship` | Draft the PR/MR from the specs; suggest the commands |

## The utility commands (anytime)

- `/flow:start` — begin or resume a ticket; scaffolds its `.specs/` record.
- `/flow:status` — the compass: where a ticket stands and the next command (read-only).
- `/flow:context` — add context the ticket and code don't carry (links, constraints,
  gotchas).
- `/flow:review` — one fresh review of a change on Spec, Proof and Standards: your
  uncommitted work, a branch, a pull request (yours or a teammate's, in any project), or
  a flow ticket's whole change before verify. It reports; you decide what to do with each
  finding.
- `/flow:retro` — after shipping, look back at the ticket's record (regressions,
  escalations, failed proofs, gate changes) and propose changes to the project's
  checks and instructions that make the next ticket go better. What it finds about
  the flow itself comes as feedback ready to paste as an issue.
- `/flow:upgrade` — after a plugin update, bring a project's `.specs/` written by an
  earlier version of the flow up to the installed one (a new or cleared session says
  when it is needed).
- `/flow:help` — this page.

## The principles

- **Give it context** — ticket, design, code, and your tacit knowledge.
- **Explore before build** — ask for options, not one answer.
- **You architect, it types** — you own the design choice and trade-offs.
- **Work in small steps** — one buildable, provable step at a time.
- **Don't trust it, make it prove it** — numbers, not opinions; read every line.
- **Own it** — the result, the commits, and the PR are yours.

## Navigation & gates

- **You drive transitions.** Each phase is a command you type, and the assistant cannot
  start one by itself (Claude Code enforces this). A phase ends by naming the next
  command.
- Movement is **bidirectional**: advance, repeat a phase, or regress. A regression is
  logged with its reason; history is never rewritten.
- **Make it prove it:** proof is raw evidence (command, exit code, real output, a
  screenshot) recorded by a script. You grade it at the gate.
- **Git & PR are yours.** `/flow:execute` drafts a commit message; `/flow:ship` drafts a
  PR — you run them, your way. Commit each step before the next one (the default), or
  say you prefer one commit at the end of the ticket.

## `.specs/` — the memory

State lives on disk, not just in the chat, so the work survives context resets and any
phase can resume. Per ticket: `state.md` (phase, steps, navigation log),
`understanding.md`, `context.md`, `discoveries.md`, `decisions.md`, `plan.md`,
`steps/NN-*.md`, `verification.md`, `evidence/` (full proof logs), and `assets/`. The
shared contract is `.specs/CONVENTIONS.md`, which `/flow:start` keeps current until you
edit it; `/flow:upgrade` carries your edits into a newer contract. `.specs/PROJECT.md`
is the project profile, yours to edit: the proof commands with their flags and
durations, where a fast proof ends, the commit policy, the PR format. While it is
empty, `/flow:start` proposes its first values from what the repository shows, for you
to confirm in one reply. `/flow:plan` reads it and adds what it measures, so the next
ticket does not learn it again. `state.md`
changes only through the flow's state script (`state.js`), which checks every phase and
step move and writes the navigation log.

## Common questions

- **Do I have to use every phase?** No. Design is conditional, and a small, clear change
  can take the short route (understand → plan → execute → ship): `/flow:understand`
  offers it and you choose. You can also skip, repeat, or regress.
- **What if the plan turns out wrong mid-execution?** Regress to `/flow:plan`; the reason
  is logged in the navigation log and `decisions.md`.
- **How do I add context that isn't in the ticket?** `/flow:context`, anytime, or when
  `/flow:understand` closes. Sharing it in plain words works too.
- **How do I know what to run next?** Every phase ends by naming it, `/flow:status` shows
  it, and a new or cleared session lists it for each ticket in progress.
- **Can I just say "start AB-1234"?** Phases run when you type them:
  `/flow:start AB-1234`. Plain questions like "where are we?" reach `/flow:status`.
- **Does the AI commit or open PRs?** No — it drafts; you run them.
- **Do I have to commit after every step?** No. That is the default, so each step is its
  own commit. Say you prefer one commit for the ticket and it is recorded as
  `commit: at-end`: steps stay `proven` while the next ones are built, and one commit
  after the last gate makes them `done`. Set `Policy: at-end` in `.specs/PROJECT.md`
  and every new ticket in the project starts that way. Either way each step is reviewed on its own
  change: the state script snapshots the working tree when a step starts, and
  `state.js <ticket-id> diff <step-id>` shows what that step changed.
- **How do I know a proof can fail?** The plan runs each proof command once on the
  untouched tree (the baseline) and marks the fast proofs of new behavior `red first`:
  those run before the change, where they have to fail, and again after. You say what
  counts as fast; guards (lint, typecheck, the suite) and slow proofs run once. The
  runner also notes what an exit code can hide: a chained or negated command, a command
  the shell did not find, a code other than the one the proof expects.
- **Does every step run the whole test suite?** No. A step's proof is the tests of what
  it changes plus the guards that are fast. The slow runs (the whole suite of a large
  project, a build, an end-to-end run) run once for the ticket, at `/flow:verify`, or
  in the last step on the short route. You say where fast ends (`Fast ends at` in
  `.specs/PROJECT.md`).
- **What happens to a review finding I do not fix now?** It leaves the gate with an
  outcome, written in the step's Gate: fixed, accepted, rejected, or deferred to a
  later step. A deferred one is written into that step's spec as a check of its own,
  so the step that inherits it has to build and prove it.
- **Someone else owns this ticket. When do they see the design?** Before the build.
  Tell `/flow:understand` who has a say (it asks), and `/flow:plan` drafts a decision
  summary for you to send them; their answer comes back through `/flow:context`. A step
  that rests on a question still open with them goes last.
- **I am porting existing behavior. Anything different?** `/flow:plan` then cites, for
  each transformation, the legacy line it mirrors, lists what has no such line as new
  behavior for you to accept, and proves parity by comparing the old and new paths.
- **How do I know every acceptance criterion is covered?** The plan writes a table,
  **Criteria and proof**, with one row per criterion: how it is shown (the running
  product, a test, read off the code, checked by you), by which step, with which
  command. `/flow:verify` runs that table as written. A criterion the ticket will not
  show is a `gap` row with its reason, which stands once you accept it.
- **What if the base branch moved, or I changed code after it was proven?** The runner
  records the working tree each proof ran on. `/flow:verify` fetches the base and tells
  you, before any proof runs, how far behind it the branch is, which files both sides
  changed, and whether they would merge, so a rebase comes before the proofs.
  `/flow:ship` says which proofs predate the code as it is now, and the files that
  changed since. `state.js <ticket-id> fresh` prints the same report anytime.
- **Can the PR draft follow my team's template?** Yes. `/flow:ship` fills the format
  the profile names (`Format`), else a pull-request template it finds in the
  repository, else its own draft.
- **Who writes the code?** `/flow:plan` marks each step `delegate`, `delegate-light`,
  or `inline`. A delegated step is built by an executor subagent — `flow:step-executor`
  on Sonnet, or `flow:step-executor-light` on Haiku for mechanical steps; the main
  session keeps the conversation, the gate, and `state.md`. You can change any step.
  Reading the Figma (`flow:design-reader`) and mapping the code (`flow:code-mapper`)
  also run in subagents, so their bulk stays out of your session.
- **Who reviews the code?** Before each gate, `flow:diff-reviewer` (Sonnet, read-only)
  reads the step's change in a fresh context, so the author never reviews itself. It
  reports cited findings on three axes: Spec, Proof (would the tests catch a wrong
  change?) and Standards. Its findings are leads; you decide at the gate. Mechanical
  `delegate-light` steps are reviewed by the main session instead. Per-step reviews miss
  what spans steps, so once a ticket of several steps is built, the next move offers
  `/flow:review <ticket-id>`, the same reviewer on the whole change, before verify.
- **Can the AI rewrite the evidence?** No. The proof runner records it, masking the
  secrets it recognizes first, and the plugin's guard hook blocks edits that remove or
  change a recorded entry or log, and hand edits to `state.md`. The flow's subagents are
  also blocked from git writes and a step's gate.
- **When does it suggest `/clear`?** From the plan on (before each step and before
  ship), each phase works from self-contained specs in `.specs/`, so a fresh context costs
  nothing in knowledge and keeps the build sharp; a new or cleared session is told which
  tickets are in progress and their next command. Up to the plan (understand, design,
  explore), the next phase builds on the conversation, so it continues in the same
  session unless that has grown long.
