# Evals

Behavior checks for the flow's commands, run with `claude plugin eval`: numbers, not
opinions, about the skills themselves. Each case seeds a scratch project with its
`scaffold.sh`, runs one prompt against the plugin, and grades the reply, the trace, and
the files left behind.

| Case | Checks |
|---|---|
| `start-names-next-command` | `/flow:start` scaffolds `.specs/`, stays in `start`, and names `/flow:understand <id>` |
| `status-names-next-command` | a plain "where are we?" reaches the status report, read-only, with the next command |
| `context-captures-background` | background shared in plain words lands in `context.md`, phase unchanged |
| `plan-slices-vertically` | given the developer's choices, `/flow:plan` slices INV-42 into vertical steps provable through the CLI, asks about granularity, and writes no code (judged by an LLM on `plan.md`) |
| `plan-sizes-proofs` | with a project profile that times the whole suite at 14 minutes, `/flow:plan` proves each step with its own test file, leaves the suite for verify without running it for the baseline, baselines the linter the developer names and adds it to the profile |
| `execute-stops-at-gate` | a `delegate-light` step is built by its executor, proven by the runner, reviewed, and stopped at the gate with no commit (tag `heavy`) |
| `execute-proves-red-first` | a step whose Proof marks its new test `red first` has that test recorded failing before the code exists and passing after, its review reads the step's snapshot diff, and the run stops at the gate (tag `heavy`) |
| `execute-commit-at-end` | on a ticket committed at the end, with step 01 proven and uncommitted, `/flow:execute` builds step 02 without asking for a commit and takes only step 02's change to the review and the gate (tag `heavy`) |
| `review-flags-seeded-flaws` | `flow:diff-reviewer` reads a step's change cold and names, by axis, at least five of the seven flaws seeded in it (tag `heavy`) |
| `review-pr-without-flow` | in a project without `.specs/`, `/flow:review` fetches a teammate's pull request from the branches the developer names, reviews it against the pasted description, and reports the seeded flaws by axis as comments ready to paste, leaving the checkout on `main` and git otherwise alone (tag `heavy`) |
| `explore-reproduces-bug` | for a Bug ticket, `/flow:explore` builds a red reproduction under `repro/`, ranks hypotheses, and offers fixes proven by the reproduction turning green, leaving the code and no probes behind |
| `retro-reads-the-record` | on a shipped ticket's real record, `/flow:retro` proposes environment changes that cite the record, and leaves the product code alone |
| `understand-offers-short-route` | for a one-line change, `/flow:understand` offers the short route, leaves the choice (and `route: full`) to the developer, and keeps the next phase in the session |
| `plan-short-route` | on the short route, `/flow:plan` maps the change itself (no explore detour), writes a short ADR and one small step, and suggests `/clear` before execute |
| `verify-stops-behind-base` | on a built ticket whose base moved on the remote, with the same file changed on both sides, `/flow:verify` fetches, reads `state.js fresh` and stops before any proof runs, leaving the rebase or merge to the developer |
| `verify-runs-criteria-table` | up to date with its base, `/flow:verify` runs each criterion's command from the plan's criteria table as written, lists the accepted gap as a gap, and stops at the gate |
| `ship-flags-stale-proofs` | on a verified ticket whose code changed after the verify gate, `/flow:ship` names the file that changed since the proofs ran and asks whether to prove again or ship as it is, before any draft |
| `ship-follows-pr-format` | on a verified ticket in a repository with a pull-request template, `/flow:ship` drafts `pr.md` in the template's sections, with the proof's command in it, and suggests the ship commands without running git |
| `upgrade-carries-local-edits` | on a record flow 0.1 left, `/flow:upgrade` applies the mechanical changes, carries the team's rule into the current contract, maps the blocked step as the developer says, and leaves the done ticket, the evidence and git alone |

Run from the repository root:

```bash
claude plugin eval . --scaffold --trust-plugin --ablation none --model sonnet --no-publish \
  --allow-tools Bash Edit Write
```

Add `--tag smoke` for the quick cases only, or `--case <name>` for one. `--scaffold` is
required: every case seeds its project. Grant Bash whole: a run that meets one denied
command (an `ls`, a `cd … &&`) tends to stop and report that Bash is unavailable, which
measures the grant rather than the skill; the `no-git-writes` graders still watch git.
The bundled MCP servers stay off (no mocks are recorded), so no case reads Azure DevOps
or Figma.

To compare two versions of the flow, extract each into its own folder with this suite
copied in, run both with the same flags and `--json <file>`, and compare
`aggregates.overallScore` and each case's score. Results land in `evals/results/`, which
git ignores.

`plan-slices-vertically/scaffold.sh` is generated: it writes the invoice-tool fixture and
INV-42's `.specs` at the explore phase with heredocs, from the rehearsal run that found
the horizontal slicing. Edit it as a fixture, not by hand-tuning the plan it leads to.
`review-flags-seeded-flaws/scaffold.sh` is generated the same way: the fixture with
TEST-3's step in progress, committed, then an uncommitted change carrying the seven flaws
its `findings` grader lists. `review-pr-without-flow/scaffold.sh` is built from it: the
same fixture without `.specs/`, the flawed change committed on a branch that only a bare
remote in `.remote.git` holds. So are `explore-reproduces-bug` (a seeded `--to` bug, with
the test that covered it removed) and `retro-reads-the-record` (the rehearsal's own
INV-42 record, shipped). `upgrade-carries-local-edits/scaffold.sh` is generated from
`scripts/history/`: the 0.1 contract and step template, with a hand-written state.
The two `verify-*` cases and `ship-flags-stale-proofs` share one mould: a labels project
with a bare remote in `.remote.git`, the ticket built on its branch, and its evidence
stamped with the tree it ran on (`git rev-parse 'HEAD^{tree}'`, which is what the
runner records there, since the project ignores `.specs/`).
