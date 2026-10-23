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
| `execute-stops-at-gate` | a `delegate-light` step is built by its executor, proven by the runner, reviewed, and stopped at the gate with no commit (tag `heavy`) |
| `review-flags-seeded-flaws` | `flow:diff-reviewer` reads a step's change cold and names, by axis, at least five of the seven flaws seeded in it (tag `heavy`) |
| `explore-reproduces-bug` | for a Bug ticket, `/flow:explore` builds a red reproduction under `repro/`, ranks hypotheses, and offers fixes proven by the reproduction turning green, leaving the code and no probes behind |
| `retro-reads-the-record` | on a shipped ticket's real record, `/flow:retro` proposes environment changes that cite the record, and leaves the product code alone |

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
its `findings` grader lists. So are `explore-reproduces-bug` (a seeded `--to` bug, with
the test that covered it removed) and `retro-reads-the-record` (the rehearsal's own
INV-42 record, shipped).
