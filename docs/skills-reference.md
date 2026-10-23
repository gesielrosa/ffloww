# Skills reference

Every skill is independent and invocable. Each reads `.specs/CONVENTIONS.md`, the
ticket's `state.md`, and its `context.md` before acting, then updates `state.md` and
recommends the next move on exit. None of them run `git`.

---

## `/flow:start` — entry

- **When:** starting or resuming a ticket.
- **Does:** collects the ticket id (+ optional title); runs `init_spec.js` to scaffold
  `.specs/<ticket-id>/` and the repo-level `CONVENTIONS.md`; orients from `state.md`.
  On an existing ticket it resumes and points to the current phase.
- **Writes:** the `.specs/` scaffold.
- **Hands off to:** `/flow:understand` (new ticket) or the current-phase skill (resume).

## `/flow:understand` — phase 1

- **When:** after start, to understand the ticket.
- **Does:** reads the work item via the **azure-devops** MCP; captures problem, scope,
  and acceptance criteria; asks you for extra context; actively determines design
  involvement (does not rely on a Figma link being in the ticket).
- **Writes:** `understanding.md`, `context.md`; sets `design_involved`.
- **Hands off to:** `/flow:design` (if design) or `/flow:explore`.

## `/flow:design` — phase 2 *(conditional)*

- **When:** `design_involved: true`.
- **Does:** asks for the Figma URL with the node ids for the screens/components in
  scope; the `flow:design-reader` subagent (Sonnet) reads them via the **figma** MCP
  (context, screenshots, variables), saves exports and developer images to `assets/`,
  and records design notes tied to acceptance criteria — the large design payloads stay
  out of the main session.
- **Writes:** `assets/`, the Design section of `understanding.md`.
- **Hands off to:** `/flow:explore`.

## `/flow:explore` — phase 3

- **When:** after understanding (and design, if any).
- **Does:** maps the relevant code with `file:line` evidence — fanned out to parallel
  `flow:code-mapper` subagents (Haiku), whose leads the main session confirms before
  relying on them; surfaces at least two viable options with pros/cons and risk/effort.
  Diverges — does not decide.
- **Writes:** `discoveries.md`.
- **Hands off to:** `/flow:plan`.

## `/flow:plan` — phase 4

- **When:** after exploring, to converge.
- **Does:** records your chosen approach as an ADR; agrees the proof strategy; slices
  the work into small, provable steps; marks who builds each (`delegate` to a subagent
  or `inline`).
- **Writes:** `decisions.md`, `steps/NN-<slug>.md`; sets `proof_definition` and
  `steps:` in `state.md`.
- **Hands off to:** `/flow:execute`.

## `/flow:execute` — phase 5

- **When:** to build a planned step.
- **Does:** implements one step's scope — inline, or delegated to the
  `flow:step-executor` subagent on a cheaper model; runs its proof through the bundled
  `run_proof.js`, which records the raw evidence; opens the human gate; on approval
  **suggests a commit** (never commits).
- **Writes:** code; the step's Evidence/Gate; logs under `evidence/`; step status in
  `state.md`.
- **Hands off to:** `/flow:execute` (next step) or `/flow:ship` (all done).

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
- **Does:** assembles a PR/MR draft from the specs; suggests the ship sequence (branch,
  push, open PR). **Suggests, never executes** — no git, no assumptions about your VCS
  host or commit conventions.
- **Writes:** `pr.md`; sets `phase: ship` (then `done` once you confirm shipped).
- **Hands off to:** you.

---

## Utilities (anytime)

## `/flow:status` — the compass

- **When:** anytime, to see where a ticket stands.
- **Does:** runs `state.js <ticket> show`; reports phase, step progress, proof status,
  recent navigation; recommends the next skill the script computes. **Read-only** —
  changes nothing.

## `/flow:context` — add context

- **When:** anytime you have context the ticket and code don't carry.
- **Does:** appends to `context.md` (Links, Constraints, Out-of-ticket decisions,
  Gotchas, Related work). Append-only; routes to `decisions.md` if it changes a
  decision. Does not change phase, write code, or run git.

See [the context channel](context-channel.md).

## `/flow:help` — explain the flow

- **When:** anytime the developer wants to understand the flow or has questions about it.
- **Does:** explains the phases, skills, principles, navigation, and `.specs/` in plain
  language; tailors to an active ticket via `CONVENTIONS.md`/`state.md` when present.
  Read-only — it teaches and changes nothing. For "where am I", use `/flow:status`.
