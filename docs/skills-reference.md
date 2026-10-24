# Skills reference

Every skill is independent. The phases, `/flow:start`, `/flow:retro`, and `/flow:help`
run only when you type them (`disable-model-invocation`): the assistant cannot start a
phase by itself, and their descriptions cost no context until you call them.
`/flow:status` and `/flow:context` also answer plain requests ("where are we?", "fyi,
the API is rate limited"). Each phase reads `.specs/CONVENTIONS.md`, the ticket's
`state.md`, and its `context.md` before acting, updates `state.md`, and ends by naming
the next command: the `Next:` line `state.js` prints, ticket id included. None of them
run git that writes.

---

## `/flow:start` — entry

- **When:** starting or resuming a ticket.
- **Does:** collects the ticket id (+ optional title); runs `init_spec.js` to scaffold
  `.specs/<ticket-id>/` and the repo-level `CONVENTIONS.md` (refreshed while unedited);
  orients from `state.md`. On an existing ticket it resumes and points to the current
  phase; on a new one it suggests a ticket branch when you are on the default branch.
- **Writes:** the `.specs/` scaffold.
- **Hands off to:** `/flow:understand` (new ticket) or the current-phase skill (resume).

## `/flow:understand` — phase 1

- **When:** after start, to understand the ticket.
- **Does:** reads the work item via the **azure-devops** MCP; captures its type,
  problem, scope (for a Bug, the symptom as reported), and acceptance criteria; asks you
  for extra context; actively determines design involvement (does not rely on a Figma
  link being in the ticket); closes once the open questions that shape the criteria are
  answered or carried forward.
- **Writes:** `understanding.md`, `context.md`; sets `design_involved`.
- **Hands off to:** `/flow:design` (if design), then `/flow:explore`, or `/flow:plan` on
  the short route, which it offers for a small, clear change and you choose. You continue
  in the same session.

## `/flow:design` — phase 2 *(conditional)*

- **When:** `design_involved: true`.
- **Does:** asks for the Figma URL with the node ids for the screens/components in
  scope; the `flow:design-reader` subagent (Sonnet) reads them via the **figma** MCP
  (context, screenshots, variables), saves exports and developer images to `assets/`,
  and records design notes tied to acceptance criteria — the large design payloads stay
  out of the main session.
- **Writes:** `assets/`, the Design section of `understanding.md`.
- **Hands off to:** `/flow:explore` (`/flow:plan` on the short route); `/clear` first when
  screenshots were opened.

## `/flow:explore` — phase 3

- **When:** after understanding (and design, if any).
- **Does:** maps the relevant code with `file:line` evidence — fanned out to parallel
  `flow:code-mapper` subagents (Haiku), whose leads the main session confirms before
  relying on them; surfaces at least two viable options with pros/cons and risk/effort.
  Diverges — does not decide. A **Bug** is explored from a red reproduction first
  (`skills/explore/BUG.md`, loaded only for bugs): a command that fails on the reported
  symptom, shrunk, then ranked falsifiable hypotheses tested with probes it removes, and
  options whose proof is the reproduction turning green.
- **Writes:** `discoveries.md`; for a bug, the reproduction under `repro/`.
- **Hands off to:** `/flow:plan`, in the same session.

## `/flow:plan` — phase 4

- **When:** after exploring, to converge.
- **Does:** records your chosen approach as an ADR; agrees the proof strategy; slices
  the work into vertical, provable steps (tracer bullets); marks who builds each
  (`delegate` to a Sonnet subagent, `delegate-light` to a Haiku one, or `inline`). For
  a bug, the fixing step's proof is the reproduction, run red before the fix and green
  after. On the short route it reads the few files the change touches itself and
  proposes the one approach; the ADR is one to three sentences unless there was a real
  trade-off.
- **Writes:** `decisions.md`, `plan.md`, `steps/NN-<slug>.md`; sets
  `proof_definition` and `steps:` in `state.md`.
- **Hands off to:** `/flow:execute`, after `/clear`.

## `/flow:execute` — phase 5

- **When:** to build a planned step.
- **Does:** implements one step's scope — inline, or delegated to an executor
  subagent (`flow:step-executor` on Sonnet, `flow:step-executor-light` on Haiku); runs
  its proof through the bundled `run_proof.js`, which records the raw evidence; has the
  change reviewed in a fresh context by `flow:diff-reviewer` (Sonnet, read-only), whose
  cited findings on Spec, Proof and Standards the main session checks (a mechanical
  `delegate-light` step is reviewed by the main session); opens the human gate; on
  approval **drafts a commit message** (never commits). A step starts once the previous
  proven step is committed (`--reason` to start anyway).
- **Writes:** code; the step's Evidence/Gate; logs under `evidence/`; step status in
  `state.md`.
- **Hands off to:** `/flow:execute` (next step), then `/flow:verify`, or `/flow:ship` on
  the short route; `/clear` first.

## `/flow:verify` — phase 6

- **When:** to prove a step or the whole ticket.
- **Does:** runs the proof without changing code, through the plugin's `run_proof.js`,
  which records raw evidence (per step, or per acceptance criterion in
  `verification.md` for a whole-ticket check); opens the human gate. **Proves,
  does not fix** — on failure it recommends regressing to `/flow:execute`.
- **Writes:** the step's Evidence/Gate or `verification.md`; logs under `evidence/`;
  status in `state.md`.
- **Hands off to:** `/flow:execute` (a step) or `/flow:ship` (whole ticket approved).

## `/flow:ship` — phase 7

- **When:** all steps done and verified.
- **Does:** assembles a PR/MR draft from the specs, for a reviewer who sees only the PR
  (the smallest view of the change, each acceptance criterion with its proof inline,
  merge danger); suggests the ship sequence (branch, push, open PR). **Suggests, never
  executes** — no git, no assumptions about your VCS host or commit conventions.
- **Writes:** `pr.md`; sets `phase: ship` (then `done` once you confirm shipped).
- **Hands off to:** you.

---

## Utilities (anytime)

## `/flow:status` — the compass

- **When:** anytime, to see where a ticket stands; also reached by asking in plain words.
- **Does:** runs `state.js <ticket> show`; reports phase, step progress, proof status,
  recent navigation; names the next command the script computes. **Read-only** —
  changes nothing.

## `/flow:context` — add context

- **When:** anytime you have context the ticket and code don't carry; sharing it in
  plain words reaches it too.
- **Does:** appends to `context.md` (Links, Constraints, Out-of-ticket decisions,
  Gotchas, Related work). Append-only; routes to `decisions.md` if it changes a
  decision. Does not change phase, write code, or run git.

See [the context channel](context-channel.md).

## `/flow:retro` — look back

- **When:** after a ticket ships (its `Next:` line suggests it), or anytime on a ticket's
  record.
- **Does:** reads the record as the primary source (regressions, escalations, proof runs
  that failed before passing, review findings, changes requested at gates, context added
  late) and proposes changes to the **environment**, most severe first: automated
  checks for mechanical mistakes, lines in the project's `CLAUDE.md` for judgement calls,
  and habits for planning and proofs. Every proposal cites the record; you pick what to
  apply.
- **Writes:** `retro.md`.

## `/flow:help` — explain the flow

- **When:** anytime the developer wants to understand the flow or has questions about it.
- **Does:** explains the phases, skills, principles, navigation, and `.specs/` in plain
  language; tailors to an active ticket via `CONVENTIONS.md`/`state.md` when present.
  Read-only — it teaches and changes nothing. For "where am I", use `/flow:status`.
