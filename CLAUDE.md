# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> All authored content — skill names, file/dir names, manifests, scripts, and the
> text *inside* skills and templates — is written in **English**. Conversation with
> the maintainer may be in Portuguese, but the package ships in English.

## What this repository is

`ffloww` is a **Claude Code plugin**, named `flow`, and the marketplace that publishes
it (also `ffloww`). It does not ship application code — it ships *agent context*: a set
of **`/flow:*` skills**, five subagents, the flow's scripts and hooks, and two MCP
servers that, once installed, replicate a ticket-to-PR development flow in the
consuming project.

The flow it encodes (and the human/AI contract behind it):

1. **understand** the ticket — problem, scope, acceptance criteria (Azure DevOps)
2. **design** *(conditional)* — analyze Figma against the ticket (node IDs → assets)
3. **explore** the codebase — diverge, surface options
4. **plan** — decisions/trade-offs (ADR) broken into small, trackable step specs
5. **execute** — build one step at a time, verify each with real proof, human gate
6. **verify** — proof is project-defined (usually tests); raw evidence, never self-graded
7. **ship** — assemble a PR/MR draft from the specs

Governing principles: give it context · explore before build (options) · *you*
architect, *it* types · work in small steps · don't trust it, make it prove it
(numbers, not opinions) · own it. The constant: **the AI diverges and types; the
human converges and decides.**

## Key architecture decisions

- **State is externalized to the target project**, never held in the model's head.
  Each ticket gets a `.specs/<ticket-id>/` folder (in the *consuming* project) that
  is the single source of truth and survives context compaction:
  `state.md` (current phase, step statuses, gate state, navigation log),
  `understanding.md`, `context.md`, `discoveries.md`, `decisions.md` (ADR), `plan.md`,
  `steps/NN-*.md`, `verification.md`, `evidence/` (proof logs), and `assets/`.
- **`.specs/CONVENTIONS.md`** is the shared contract the scaffolding script writes into
  the target project: commands and how a phase ends, state rules, roles, gate protocol,
  git/PR policy, principles. It is the one home of the rules every phase shares, so a
  skill states only what is particular to its phase. Every phase reads it + the
  ticket's `state.md` at start. Its first line stamps the hash of its body: while the
  body still matches, `init_spec.js` refreshes it to the plugin's current template;
  an edited file is kept, with a warning (`--print-conventions` prints the template).
- **Skills are independent; phases run only when the developer types them.**
  `/flow:start`, the phases (`/flow:understand`, `/flow:design`, `/flow:explore`,
  `/flow:plan`, `/flow:execute`, `/flow:verify`, `/flow:ship`), `/flow:retro` and
  `/flow:help` set
  `disable-model-invocation: true`: their descriptions cost no context in any session,
  and neither the model nor a subagent can start a phase (the Skill tool refuses), so
  "the developer drives transitions" is enforced by the harness. Their descriptions are
  one-line, human-facing. `/flow:status` and `/flow:context` stay model-invoked, so
  plain requests reach them; their descriptions carry one trigger per branch.
  `tests/skills.test.js` pins this split. Each phase ends by naming the next command
  from the `Next:` line `state.js` prints (ticket id included), so the mapping lives
  only in `nextMove()`. Skills never read `docs/` — help and explainer skills must be
  self-contained. `claude plugin details` still counts user-invoked descriptions as
  always-on; measure with a headless `claude -p` listing instead.
- **Instructions are written positively, once.** A rule shared by every phase lives in
  `CONVENTIONS.md`; a rule a hook or script enforces is stated as the lane it protects,
  not as a prohibition; skills dispatch agents by naming the tool (`Call the Agent tool
  with subagent_type flow:<name>`).
- **Shared scripts live once, at the plugin root.** `scripts/init_spec.js` and
  `scripts/run_proof.js` are called from skill and agent text as
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.js"` — Claude Code substitutes the
  variable in skill and agent bodies. Node only, Windows-safe, no dependencies.
- **The main session decides; subagents type.** The main session (the developer's
  model, e.g. Opus) talks to the developer, opens gates, and owns `state.md`. Bounded,
  decision-free work runs in subagents pinned to cheaper models: `flow:step-executor`
  (Sonnet, effort xhigh) builds `delegate` steps and `flow:step-executor-light`
  (Haiku, effort high) builds `delegate-light` ones — same body, kept identical by
  `tests/agents.test.js`; `flow:diff-reviewer` (Sonnet, read-only) reviews each
  step's change in a fresh context before its gate, on three axes kept apart (Spec,
  Proof, Standards, with a code-smell baseline where the project documents nothing), so
  the author never reviews itself; `flow:design-reader` (Sonnet) reads the Figma nodes;
  `flow:code-mapper` (Haiku, read-only) maps code for `/flow:explore`. Their output is
  a lead the main session checks, never a verdict. `/flow:plan` records who builds
  each step in the step's `Executor` line; `/flow:execute` escalates one model per new
  agent call (light → executor → executor with per-call `model: opus` → inline) when a
  delegated step stalls. Skills never set `model:` in their own frontmatter — that
  switches the main session's model and rebuilds its prompt cache.
- **Phase boundaries follow what the next phase reads.** A phase ends once whatever the
  developer said that shapes later work is on disk. Up to the plan (understand, design,
  explore) the next phase builds on the conversation, so it continues in the same
  session unless that has grown long (design suggests `/clear` after opening
  screenshots). From the plan on (each step, verify, ship) phases work from
  self-contained specs, so they hand off with a `/clear` suggestion. The rule lives in
  `CONVENTIONS.md`; each handoff states its own case.
- **State changes through a script, never by hand.** `scripts/state.js` (`show`,
  `phase`, `set`, `add-step`, `remove-step`, `step`, `log`) is the only writer of
  `state.md`: canonical YAML front matter, phase moves forward (back only with
  `--reason`, logged as a regression; execute ⇄ verify is free), steps move one status
  at a time with one in progress, and a step starts only once the previous proven step
  is done, i.e. committed (`--reason` overrides), so each step's diff stands alone.
  Step specs' Status lines stay in sync, the navigation log is appended, and "Where we
  are" is regenerated. `nextMove()` in it is the single source of the "what's next"
  mapping that every phase's handoff, `/flow:status`, and the SessionStart hook report.
  It follows the ticket's `route`: `full` by default, or `short`, which the developer
  chooses for a small, clear change (offered by `/flow:understand`): understand →
  design? → plan → execute → ship, with the plan mapping the change itself and no
  whole-ticket verify.
- **Evidence is recorded by a script, not retyped.** `run_proof.js` runs each proof
  command, saves the full log under `.specs/<ticket-id>/evidence/`, and appends command,
  exit code, and last lines to the step spec (or, for the target `ticket`, to
  `verification.md`). Recorded evidence cannot be edited afterwards, so the runner masks
  secrets first (`scripts/lib/redact.js`: secret-named env var values, auth headers,
  `key=value` credentials, URL credentials, private keys, known token formats) and the
  entry notes the count. A proof's exit code is its verdict, so the runner also notes a
  command chained with `;`, `||` or a pipe (its exit code is the last part's).
- **A cleared session resumes from disk.** A `SessionStart` hook
  (`scripts/session_start.js`) adds one line per ticket that is not done — phase, step,
  next move from `nextMove()` — on startup, resume, `/clear`, and compaction. It adds
  nothing in a project without `.specs/`, so the `/clear` the flow suggests from the
  plan on costs no re-orientation.
- **Guardrails are enforced in code where a rule can be checked.** `hooks/hooks.json`
  runs `scripts/guard.js` on every `PreToolUse` of Bash/Edit/Write/MultiEdit. In any
  session it denies edits to `evidence/` logs, edits that would remove or change a
  `### Run` entry, hand edits to `state.md`, and hand changes to a step's Status line.
  In the flow's subagents (hook input `agent_type` = `flow:<name>`) it also denies git
  commands that write, `state.js` commands other than `show`, and changes to a step's
  Executor line or Gate section. The main session's git rule stays an
  instruction, because plugin hooks run in every session, flow or not. The guard fails
  open on bad input or internal errors.
- **Git and PR steps are suggested, never executed.** `/flow:execute` proposes a
  commit (draft message); `/flow:ship` assembles a PR draft from the specs and
  suggests the push/PR sequence. The package does not assume GitHub/GitLab/Azure or
  any commit convention — that keeps it repo- and platform-agnostic.

## Repository layout

```
ffloww/
  .claude-plugin/
    plugin.json        # plugin manifest: name "flow", version, metadata
    marketplace.json   # marketplace "ffloww", listing this repo ("./") as plugin "flow"
  skills/<name>/SKILL.md   # one skill per phase/utility → /flow:<name> (lean, <500 lines)
  agents/<name>.md         # subagents (model/effort/tools pinned) → flow:<name>
  scripts/                 # init_spec.js, state.js, run_proof.js, guard.js, session_start.js
    lib/markdown.js        # evidence-entry format shared by run_proof.js and guard.js
    lib/redact.js          # secret masking for run_proof.js
  hooks/hooks.json         # PreToolUse → guard.js; SessionStart → session_start.js
  tests/                   # node --test tests/*.test.js (no dependencies)
  evals/                   # claude plugin eval cases: behavior of the commands (see evals/README.md)
  .mcp.json                # bundled MCP servers: azure-devops, figma
  docs/                    # product docs (concept, the flow, specs & state, install, reference)
  README.md  CLAUDE.md
```

The whole repository is the plugin: Claude Code loads `skills/`, `agents/`,
`hooks/hooks.json`, and `.mcp.json` from the root. `CLAUDE.md` and `docs/` are for
maintainers and readers; plugins do not load them as context.

## Plugin dev loop

```bash
node --test tests/*.test.js         # scripts, plus the skill/agent contracts (skills, agents tests)
claude plugin eval . --scaffold --trust-plugin --ablation none --model sonnet --no-publish --allow-tools Bash Edit Write
claude plugin validate .            # plugin.json + marketplace.json
claude plugin validate ./skills --strict && claude plugin validate ./agents --strict
claude --plugin-dir .               # load this working copy for a session; /reload-plugins after edits
claude --plugin-dir . plugin details flow   # component inventory + projected token cost
claude plugin tag .                 # release tag flow--v<version> (checks plugin.json vs marketplace)
```

`claude plugin validate . --strict` always reports the warning that `CLAUDE.md` at the
plugin root is not loaded as context, which is expected here; its plugin-directory
checks also flag the missing icon and privacy policy URL. Change a skill's behavior
with the evals before and after (`evals/README.md` shows how to compare two versions).
For a headless smoke test, run a skill in a scratch git repo:
`claude -p "/flow:start TEST-1" --plugin-dir <this repo> --strict-mcp-config --model haiku --allowedTools "Bash(node *)"`.

Release: bump `version` in `.claude-plugin/plugin.json` — consumers on a pinned
version stay on it until it changes — then tag.

## MCP servers

`.mcp.json` declares `azure-devops` (`npx -y @azure-devops/mcp ${AZURE_DEVOPS_ORG:-…}`)
and `figma` (remote http). Consumers supply auth through their own environment and
accounts, never through the plugin. In a session their tools are named
`mcp__plugin_flow_<server>__<tool>`.

## Build status

Done: `.specs/` scaffolding, all `/flow:*` skills, model-routed subagents, the proof
runner, the Claude Code plugin packaging (replacing APM), the guard hook, and the state
script, the `delegate-light` (Haiku) executor tier, user-invoked phases, secret
masking in the runner, a self-refreshing `CONVENTIONS.md`, the eval suite, and the
independent diff reviewer before the gate. Next: an end-to-end run on a real ticket.
