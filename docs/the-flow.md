# The flow, phase by phase

Each phase is an independent skill that runs when you type its command. It reads the
shared contract (`.specs/CONVENTIONS.md`), the ticket's `state.md`, and its
`context.md` before acting; does its work; writes its artifact; updates `state.md`;
and ends by naming the next command. You drive transitions: the assistant cannot start
a phase by itself (each phase skill sets `disable-model-invocation`).

```
/flow:start ─▶ understand ─▶ design? ─▶ explore ─▶ plan ─▶ execute ⇄ verify ─▶ ship
                    ▲                                         │
                    └──────── regress (logged) ◀─────────────┘
   /flow:status (compass) and /flow:context (add context) run anytime;
   /flow:review reviews any change, a ticket's whole change included;
   /flow:retro looks back once the ticket is done.
```

**The short route.** A small, clear change (one sane approach, a few files, nothing to
compare) can skip the separate explore and the whole-ticket verify:
`understand → design? → plan → execute → ship`. `/flow:understand` offers it, you choose
it, and `state.md` records it (`route: short`), so every `Next:` line follows it. The
plan maps the change itself; the step gates prove the criteria, and `/flow:ship` still
stops if one has no evidence.

**Phase boundaries.** A phase ends once whatever you said that shapes later work is in
the ticket's files. Up to the plan (understand, design, explore), the next phase builds
on the conversation, so it continues in the same session unless that has grown long (or,
after design, holds the screenshots). From the plan on (each step, verify, ship), each
phase works from self-contained specs, so the flow suggests `/clear` first; a cleared
session is told where each ticket stands.

## Entry — `/flow:start`

Begins or resumes a ticket. Collects the ticket id (and an optional title) and runs
the bundled `init_spec.js` to scaffold `.specs/<ticket-id>/`, the repo-level
`CONVENTIONS.md` and, once per project, the profile `PROJECT.md`. If the ticket already exists, it resumes: it reads `state.md` and
points to the skill for the current phase. On a new ticket it suggests a ticket branch
when you are on the default branch, before the first commit. It does no analysis itself.

## 1. Understand — `/flow:understand`

Captures *what* must be built and *why*, before any code is explored.

- Reads the work item from the bundled **azure-devops** MCP (by id, or by search).
- Fills `understanding.md`: ticket link, problem, scope/non-goals, and **acceptance
  criteria**. It never invents acceptance criteria — it confirms gaps with you.
- **Asks for extra context** after drafting the understanding — links, constraints,
  out-of-ticket decisions, gotchas, and who else has a say in the approach (the
  ticket's owner, the area's) — and saves it to `context.md`; an answer that refines
  an acceptance criterion goes into the criterion itself.
- Closes once the open questions that shape the acceptance criteria are answered (or
  you choose to carry them forward), asking the remaining ones together, each with a
  recommended answer.
- Offers the **short route** when the change is small and clear; you choose.
- **Determines design involvement actively.** It infers design from the work and does
  not rely on a Figma link being in the ticket; when unsure, it asks. Sets
  `design_involved` accordingly.

## 2. Design *(conditional)* — `/flow:design`

Runs only when `design_involved: true`. Analyzes the Figma against the ticket.

- Asks for the Figma URL **with the node ids** for the specific screens/components —
  not the whole file (precise and cheap).
- The `flow:design-reader` subagent (Sonnet) reads each node via the **figma** MCP
  (context, screenshots, variables/tokens), saves exports plus any developer-provided
  images to `assets/`, and records design notes in `understanding.md`, tied to
  acceptance criteria. The large design payloads stay out of the main session.

## 3. Explore — `/flow:explore`

The divergent phase. Build breadth, then options — not a decision.

- Maps the relevant code (where it lives, how it flows, what it touches) with
  `file:line` evidence. The mapping fans out to parallel `flow:code-mapper` subagents
  (Haiku, read-only); the main session confirms the cited lines it builds options on.
- Lays out the viable approaches, each with pros/cons and risk/effort; when the code
  leaves a single sane one, it records that one with the evidence that rules out the
  rest, instead of inventing a second.
- **Measures what decides.** A claim that would rule an option out, or leave only one,
  is checked before it counts: a claim about behavior (what a library, an engine or a
  service does when it runs) by a probe kept under `.specs/<ticket-id>/spike/`, with
  its output; a claim that something is absent by a search of the whole repository. A
  deciding claim it could not check is marked `unverified` and reaches you with the
  options.
- A **Bug** is explored from a **red reproduction** first: one command that fails on
  the reported symptom, kept under `.specs/<ticket-id>/repro/` and shrunk to its
  smallest red case; then three to five ranked, falsifiable hypotheses, tested with
  probes that are removed before the phase ends. The options are fixes for the
  confirmed cause, and the reproduction is their proof: red now, green after.
- Records everything in `discoveries.md`. The choice happens next, and it is yours.

## 4. Plan — `/flow:plan`

The convergent phase. You architect, it types.

- You pick an approach from the options (on the short route, the plan reads the few
  files itself and proposes the one approach); the skill records it as an **ADR** in
  `decisions.md`: context, decision and why in one to three sentences, plus the rejected
  options and consequences when there was a real trade-off. When someone else has a say
  in the approach, it drafts a **decision summary** for you to send them before the
  build (`decision-summary.md`); a step that rests on a question still open with them
  goes last.
- A **port** (a migration, a rewrite, parity with what exists) is planned from the code
  it mirrors: each transformation in a step spec cites the legacy line, what has no
  such line is listed as new behavior for you to accept, and parity is proven by
  comparing the old and the new path.
- Agrees the **proof strategy** (project-defined; often tests), starting from the
  proof commands in the project profile (`.specs/PROJECT.md`), and writes it to
  `state.md` as `proof_definition`. Then takes the **baseline**: each kind of proof
  command runs once on the untouched tree, through the runner, recorded in `plan.md`,
  so a flag the tool ignores, a guard that is already red or a twenty-minute suite
  shows up before any step depends on it. A slow run the profile already times is
  taken from there, and what the baseline measured goes back into the profile, for the
  next ticket.
- Slices the work into **vertical** steps (tracer bullets): each a narrow path through
  every layer it touches, provable on its own through the entry point the acceptance
  criteria use; refactoring that makes the change easy comes first, and a wide
  mechanical change goes expand–contract. One `steps/NN-<slug>.md` each (from
  `steps/_TEMPLATE.md`), mirrored into `state.md`'s `steps:`, and each proof command
  exits non-zero exactly when its step fails. It asks you whether the granularity is
  right before you approve.
- **Sizes each step's proof to the step**: the tests of what it changes, and the guards
  that are fast. A slow run (the whole suite of a large project, a build, an end-to-end
  run) runs once for the ticket, at verify, or in the last step on the short route; a
  runtime tail (a build, then a probe or an end-to-end run with its controls) becomes
  a step of its own, built inline. You say where fast ends.
- Writes **Criteria and proof** in `plan.md`: one row per acceptance criterion, with
  how it is shown (the running product, a test, read off the code, checked by you), the
  step that proves it and the command. A runtime proof is planned only after the code
  shows the environment the criterion names can reach the change; a criterion the
  ticket will not show is a `gap` with its reason, which you accept or not when you
  approve the plan.
- Marks the proofs that run **red first**: a proof of new behavior that is fast enough
  to run twice (you say what fast is) runs before the change too, where it has to fail.
  Guards (lint, typecheck, the existing suite), mechanical steps and slow proofs run
  once.
- Records how the ticket is committed when you prefer one commit at the end over one
  per step (`commit: at-end`); the profile's `Policy` makes it the project's default.
- Marks who builds each step: `delegate` (a subagent on Sonnet; the spec must need no
  decision), `delegate-light` (a lighter subagent on Haiku, for mechanical steps), or
  `inline` (the main session). You can change any of them.

## 5. Execute — `/flow:execute`

Builds one step, proves it, and stops at the human gate.

- Implements only the current step's scope. Small. A delegated step is built by an
  executor subagent on a cheaper model (Sonnet, or Haiku for `delegate-light`); the
  main session keeps the gate.
- Runs the step's proof through `run_proof.js`, which records the **raw evidence**
  (command, exit code, last lines, full log) in the step spec. Never self-graded. A
  proof marked `red first` runs before the change too (`--red`) and has to fail there;
  the runner notes a red run that passed, and anything else an exit code can hide (a
  chained or negated command, a command the shell did not find).
- Stops after three failing proof attempts and brings it to you: clarify the step,
  re-run it on a more capable model, or build it inline.
- **Independent review:** before the gate, `flow:diff-reviewer` (Sonnet, read-only)
  reads the step's change in a fresh context, so the author never reviews itself (the
  change is the diff between two snapshots of the working tree, the step's start and
  now, so it is this step's alone even when earlier steps are not committed), and
  reports cited findings on three axes kept apart: **Spec** (missing, out of scope,
  wrong), **Proof** (a tautological test, a test of internals, an untested criterion),
  and **Standards** (the project's documented rules, then a baseline of code smells).
  The main session checks each finding it brings you; one review per step, never a loop
  until clean. Mechanical `delegate-light` steps are reviewed by the main session.
  Per-step reviews miss what spans steps, so once a ticket of several steps is built,
  the `Next:` line offers `/flow:review <ticket-id>` before verify (optional).
- **Human gate:** you validate the evidence and the findings, and decide approve /
  changes / regress. Only on approval does the step become `proven`. Each finding
  leaves the gate with an outcome, written in the step's Gate: fixed, accepted,
  rejected, or deferred to a later step, whose spec then carries it as a check of its
  own.
- On approval it **suggests a commit message** — it never commits. You commit your
  way; then the step is `done`. With `commit: at-end`, the step stays `proven`, the
  next one starts, and after the last gate it suggests one message for the whole
  ticket.

## 6. Verify — `/flow:verify`

Proves work meets its requirements — it **proves, it does not fix**.

- Scope: one step, or the whole ticket against its acceptance criteria.
- For the whole ticket it **checks the base first**: it fetches the base branch and
  reads `state.js fresh`. Behind the base with files both sides changed, or a merge
  that would conflict, it stops before any proof runs and tells you; the rebase or
  merge is yours, and the proofs run on its result instead of twice.
- Takes each criterion's command from the plan's **Criteria and proof** table and runs
  it as written; a gap is listed as a gap.
- Runs the proof without changing production code, through `run_proof.js`; records raw
  evidence per step, or per acceptance criterion in `verification.md`. The slow runs the
  plan left for the whole ticket (the suite, a build, an end-to-end run) run here, once.
- If it fails, it reports and recommends regressing to `/flow:execute`.

## 7. Ship — `/flow:ship`

Prepares to ship. It **suggests, it does not execute** — no `git`, no branches, no PRs.

- Confirms every step is `done` and the acceptance criteria are met with evidence, or
  are gaps you accepted at the plan.
- **Checks that the proofs still describe what ships**: it fetches the base and reads
  `state.js fresh`. Code that changed after its proof is named, file by file, with the
  recommendation to verify again; a branch behind its base is said with the time of the
  fetch, and when the two overlap, the ship sequence starts with your rebase or merge
  and the proofs run again before the push.
- Assembles a PR/MR draft **from the specs**, for a reviewer who sees only the PR, into
  `.specs/<ticket-id>/pr.md`. The project's format decides the sections and the length:
  the `Format` the profile names, else a pull-request template in the repository. With
  neither, the flow's own draft: summary with the smallest view of the change (a call
  tree, a file tree, a diff sketch), approach + trade-offs, acceptance criteria each
  with its proof inline (command, exit code, decisive output line), merge danger
  (one-way or two-way door, blast radius), one line per step, and the work-item link.
- Suggests the ship sequence (branch, push, open PR) as commands you run — it does not
  assume your VCS host or commit conventions.

## Anytime utilities

- **`/flow:status`** — read-only compass. Reports the current phase, step progress, and
  the next command. Changes nothing. Asking "where are we?" reaches it too.
- **`/flow:context`** — append developer context to `context.md` at any point; sharing
  it in plain words reaches it too. See [the context channel](context-channel.md).
- **`/flow:review`** — one fresh review of a change, by `flow:diff-reviewer`, on Spec,
  Proof and Standards kept apart: your uncommitted work, a branch, a pull request (yours
  or a teammate's, in a project with or without the flow), or a ticket's whole change.
  The spec is the ticket's `.specs/` record, the pull request's description and linked
  work item, or what you point to. It reports checked findings, each with `path:line`
  (for a pull request, also as comments ready to paste); posting and fixing are yours.
- **`/flow:retro`** — after shipping, reads the ticket's record (regressions,
  escalations, failed proof runs, review findings, gate changes) and proposes changes to
  the environment: automated checks for mechanical mistakes, `CLAUDE.md` lines for
  judgement calls, and lines in the project profile for what the flow had to learn
  again. What it finds about the flow itself comes last, as feedback ready to paste as
  an issue on the plugin's repository. Writes `retro.md`; you pick what to apply.
- **`/flow:upgrade`** — after a plugin update, brings a `.specs/` an earlier version
  wrote up to the installed one: the mechanical changes once you agree, your edits to
  `CONVENTIONS.md` merged into the new contract, and step statuses the flow no longer
  knows mapped with you. See
  [Upgrading `.specs/`](specs-and-state.md#upgrading-specs-from-an-earlier-version).
- **`/flow:help`** — explains the flow and answers questions about it, in plain language
  (read-only). For "where am I", use `/flow:status`.
