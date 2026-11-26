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
  body still matches, or matches an unstamped contract an earlier version wrote,
  `init_spec.js` refreshes it to the plugin's current template; an edited file is kept,
  and edits on an earlier contract get a warning naming `/flow:upgrade`
  (`--print-conventions` prints the template).
- **Skills are independent; phases run only when the developer types them.**
  `/flow:start`, the phases (`/flow:understand`, `/flow:design`, `/flow:explore`,
  `/flow:plan`, `/flow:execute`, `/flow:verify`, `/flow:ship`), `/flow:review`,
  `/flow:retro`, `/flow:upgrade` and `/flow:help` set
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
  step's change in a fresh context before its gate, and the change `/flow:review` names,
  on three axes kept apart (Spec, Proof, Standards, with a code-smell baseline where the
  project documents nothing), so the author never reviews itself; `flow:design-reader` (Sonnet) reads the Figma nodes;
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
- **State changes through a script, never by hand.** `scripts/state.js` (`show`, `diff`,
  `fresh`, `phase`, `set`, `add-step`, `remove-step`, `step`, `log`, `normalize`) is the only writer of
  `state.md`: canonical YAML front matter, phase moves forward (back only with
  `--reason`, logged as a regression; execute ⇄ verify is free), steps move one status
  at a time with one in progress. Step specs' Status lines stay in sync, the navigation
  log is appended, and "Where we are" is regenerated.
- **A step's change stands alone, however the ticket is committed.** The ticket's
  `commit` is the developer's choice: `per-step` (the default: a step starts once the
  previous proven one is done, i.e. committed; `--reason` overrides) or `at-end` (steps
  stay `proven` while the next ones are built, and one commit after the last gate makes
  them `done`; `nextMove()` asks for it before verify). Two real tickets chose the
  latter and paid for it in hand-made snapshots. So the state script snapshots the
  working tree itself (`scripts/lib/snapshot.js`: a git tree id built in a temporary
  index, `.specs/` and ignored files left out, the project's index untouched) when a
  step starts and when it is proven, and `state.js diff <step-id>` prints the step's
  files and its `git diff <tree> <tree>`: the gate's file list, and what the reviewer
  reads. `nextMove()` in it is the single source of the "what's next"
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
  entry notes the count.
- **A proof has to be able to fail.** A proof's exit code is its verdict, and three real
  tickets showed how it lies: `! tool` passes when the tool is missing, a search skips
  what it should read, a test passes without the change. So the runner records the
  expectation beside the result (`--expect <code>` for a proof that passes on another
  code, `--red` for a run before the change, which has to fail) and notes what an exit
  code can hide: a command chained with `;`, `||` or a pipe, a command negated with `!`,
  a command the shell did not find, a red run that passed. `/flow:plan` runs each kind of
  proof command once on the untouched tree (the baseline, target `plan`, recorded in
  `plan.md`) and marks `red first` only the proofs of new behavior that are fast enough
  to run twice, the developer saying what fast is; guards and slow proofs run once.
- **Evidence is about a tree.** A ticket's proofs ran on a base that was 48 commits behind
  by the time it shipped, 99 a day later, and its code changed after the verify gate with
  only a partial re-proof. So `run_proof.js` stamps each entry with the working tree the
  proof ran on (the same snapshots, about a third of a second per run), and
  `state.js fresh` (`scripts/lib/freshness.js`, read-only) reports the base as of the
  last fetch (the profile's `Base branch`, else the remote's default): commits behind,
  files changed on both sides, and a `git merge-tree` dry run on the work as it is,
  committed or not; then which whole-ticket proofs ran on the tree as it is now and
  what changed since the others. `/flow:verify` reads it before the whole-ticket proofs,
  so a rebase comes before them and not after; `/flow:ship` reads it before the draft.
  The flow fetches the base and reports; rebasing, merging and proving again stay the
  developer's call.
- **Every acceptance criterion has a proof or a named gap.** `plan.md` holds a table,
  **Criteria and proof**: per criterion, the level of its proof (`runtime`, `test`,
  `construction`, `manual`), the step and the command, or `gap` with the reason, which
  the developer accepts at plan approval. Real tickets planned an end-to-end run for an
  environment that could not reach the feature, closed verify with gaps nobody had
  chosen, and failed a verify on a command wider than the step's own. So the plan reads
  reachability from the code before it plans a runtime proof, and `/flow:verify` runs
  the table as written.
- **What a gate decides stays decided, and what it defers arrives.** A review finding
  accepted with "a later step handles it" never reached that step on a real ticket,
  and was found again after ship. So the Gate records each finding's outcome (fixed,
  accepted, rejected, deferred to step NN), and a deferred one is written into that
  step's spec in the same turn, as a `Carried from step NN` line under Changes and a
  command under Proof; the reviewer reads it as part of what the step has to do, and
  `/flow:verify` names one that was never taken up.
- **People outside the session are part of the flow's inputs.** One ticket's design
  reached the feature's owner only in the PR, and a step was built on a question still
  open with them: a regression after ship, and half a step reverted. `/flow:understand`
  asks who else has a say (`Owner:` in `context.md`); `/flow:plan` drafts
  `decision-summary.md` for the developer to send before the build, puts a step that
  rests on an open question last, and logs a build that goes on without a reply.
  Sending and waiting are the developer's call.
- **A claim that decides is measured.** The same ticket rejected its best option on an
  engine behavior nobody had run, read in one file while the behavior lived in another.
  `/flow:explore` checks a claim that would rule an option out before writing it as a
  fact: a behavior by a probe kept under `.specs/<ticket-id>/spike/`, an absence by a
  search of the whole repository; one it could not check is marked `unverified`. Only
  deciding claims pay this, so the map's other claims still rest on lines read.
- **A port's spec is the code it mirrors.** A step spec told a port to upper-case a
  value the legacy code does not, and the review, which compares the change with its
  spec, could not see it. `skills/plan/PORT.md`, read only for ports (like explore's
  `BUG.md` for bugs), has each transformation cite its legacy line, lists what has none
  as new behavior for the developer to accept, and proves parity by comparison.
- **What a project teaches the flow is kept once.** `.specs/PROJECT.md`, the project
  profile (`scripts/lib/profile.js`), holds what every ticket needs and none should learn
  twice: the proof commands with their flags and durations, where a fast proof ends, the
  commit policy, the base branch and the PR format. `init_spec.js` writes it once, empty,
  and it is the project's from then on (never replaced, so it has no stamp and no
  history). The scripts read only its settings, lines written `- Name: value`: a new
  ticket takes its `Policy`. `/flow:plan` starts the proof strategy from it and writes
  back what the baseline measured; `/flow:ship` drafts the PR in its `Format`, else in a
  pull-request template the repository holds, else in the flow's own; `/flow:retro`
  proposes changes to it.
- **A step's proof is sized to the step.** One real ticket ran a 7–15 minute suite about
  twenty times, and two steps of another ran out of executor turns waiting on a build
  and an end-to-end run. So a step's Proof holds the tests of what it changes and the
  guards that are fast; a slow run happens once for the ticket, at `/flow:verify` (in the
  last step on the short route), and a runtime tail is a step of its own, built inline.
  The developer's line for fast (`Fast ends at`, in the profile) serves this and
  `red first` alike. The bar for any new rule is the same: it adds no slow run per step.
- **A cleared session resumes from disk.** A `SessionStart` hook
  (`scripts/session_start.js`) adds one line per ticket that is not done — phase, step,
  next move from `nextMove()` — on startup, resume, `/clear`, and compaction. It adds
  nothing in a project without `.specs/`, so the `/clear` the flow suggests from the
  plan on costs no re-orientation.
- **Earlier records are upgraded, not abandoned.** `scripts/upgrade.js`, behind
  `/flow:upgrade`, reports what a project's `.specs/` needs to match the installed
  version; `--apply` makes the mechanical part (an unedited earlier `CONVENTIONS.md` or
  `steps/_TEMPLATE.md` is replaced; a project without a profile gets the empty one; an
  older `state.md` is rewritten by
  `state.js normalize`, which also takes the developer's mapping of values the flow
  does not know, like a step status `blocked`). Local edits on an earlier contract are
  merged with the developer, against the contract they started from. Earlier texts are
  recognized from `scripts/history/<kind>/<digest>.md`, every contract and step
  template the flow has written; the current ones are kept there too
  (`tests/upgrade.test.js`), so every release stays upgradable. While work in progress
  meets an earlier record, the SessionStart hook adds one line suggesting
  `/flow:upgrade`. Tickets in phase `done` are history and stay as they are.
- **Guardrails are enforced in code where a rule can be checked.** `hooks/hooks.json`
  runs `scripts/guard.js` on every `PreToolUse` of Bash/Edit/Write/MultiEdit. In any
  session it denies edits to `evidence/` logs, edits that would remove or change a
  `### Run` entry (in a step spec, `verification.md` or `plan.md`), hand edits to
  `state.md`, and hand changes to a step's Status line.
  In the flow's subagents (hook input `agent_type` = `flow:<name>`) it also denies git
  commands that write, `state.js` commands that change the state (`show`, `diff` and
  `fresh` only read it), and changes to a step's Executor line or Gate section. The main session's git rule stays an
  instruction, because plugin hooks run in every session, flow or not. The guard fails
  open on bad input or internal errors.
- **`/flow:review` works in any git project, on any host.** A utility outside the
  phases: it pins a change to a base and a head with git alone (a pull request's
  branches come from whatever tools the session has for the host, or from the
  developer, and are read without touching the working tree), takes its intent from a
  ticket's `.specs/` when there is one, or from the pull request and what the developer
  points to, and reports checked findings; posting them is the developer's, so the
  skill names no VCS host. `nextMove()` offers it, optionally, once a ticket of several
  steps is built: per-step reviews against per-step specs miss what spans steps, which a
  real ticket's post-ship review showed.
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
  scripts/                 # init_spec.js, state.js, run_proof.js, guard.js, session_start.js, upgrade.js
    lib/markdown.js        # evidence-entry format shared by run_proof.js and guard.js
    lib/redact.js          # secret masking for run_proof.js
    lib/snapshot.js        # working-tree snapshots as git tree ids, for state.js
    lib/profile.js         # the project profile (.specs/PROJECT.md): its template and settings
    lib/freshness.js       # the base's drift and the proofs' trees, for state.js fresh
    lib/history.js         # recognizes the texts earlier versions wrote (init_spec.js, upgrade.js)
    history/               # every CONVENTIONS.md body and step template shipped, named by digest
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
version stay on it until it changes — then tag. A change to `CONVENTIONS_TEMPLATE` or
`STEP_TEMPLATE` saves the new text under `scripts/history/` (the failing test names the
file), so projects on that version can upgrade from it.

## MCP servers

`.mcp.json` declares `azure-devops` (`npx -y @azure-devops/mcp ${AZURE_DEVOPS_ORG}`, no
default organization) and `figma` (remote http). Consumers supply the organization and
auth through their own environment and accounts, never through the plugin. In a session their tools are named
`mcp__plugin_flow_<server>__<tool>`.

## Build status

Done: `.specs/` scaffolding, all `/flow:*` skills, model-routed subagents, the proof
runner, the Claude Code plugin packaging (replacing APM), the guard hook, and the state
script, the `delegate-light` (Haiku) executor tier, user-invoked phases, secret
masking in the runner, a self-refreshing `CONVENTIONS.md`, the eval suite, the
independent diff reviewer before the gate, `/flow:upgrade` for records earlier
versions wrote, `/flow:review` for any change, in any project, and, from three real
tickets' retros, proofs that have to be able to fail (baseline, `red first`, `--expect`,
runner notes), per-step snapshots with a commit policy, the project profile, proofs
sized to the step, a PR draft in the project's format, evidence freshness (the tree
each proof ran on, the base's drift), the criteria-and-proof table, gate outcomes with
carried findings, the owner's decision summary, measured deciding claims, the port
branch of the plan, and the retro's feedback for the flow. Next: the rest of those
retros' feedback (the runner's shell on Windows).
