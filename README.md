# ffloww

**A ticket-to-PR development flow, as installable AI skills.**

ffloww is an [APM](https://github.com/microsoft/apm) package — a set of invocable
`flow-*` skills (plus the Azure DevOps and Figma MCP servers) that walk a developer
and an AI agent through the same disciplined path on every ticket: **understand →
design → explore → plan → execute → verify → ship**, keeping a durable, auditable
record in `.specs/`.

The constant behind every step:

> **The AI diverges and types. The human converges and decides.**

Exploration and code are delegated; the design choice, the slicing, and the judgment
of "is this proven?" are not.

## The flow at a glance

| Phase | Skill | What happens |
|---|---|---|
| 1. Understand | `flow-understand` | Read the ticket; capture problem + acceptance criteria |
| 2. Design *(if any)* | `flow-design` | Analyze the Figma against the ticket; save to `assets/` |
| 3. Explore | `flow-explore` | Map the code; surface options (diverge) |
| 4. Plan | `flow-plan` | Decide the approach (ADR); break into small steps |
| 5. Execute | `flow-execute` | Build one step; prove it; human gate; suggest a commit |
| 6. Verify | `flow-verify` | Prove a step or the whole ticket with raw evidence |
| 7. Ship | `flow-ship` | Assemble a PR/MR draft from the specs (suggest, don't run) |

- **Entry:** `flow-start` begins (or resumes) a ticket and scaffolds its `.specs/` record.
- **Anytime utilities:** `flow-status` (the compass — where am I, what's next),
  `flow-context` (add context the ticket and code don't carry), and `flow-help`
  (explain the flow and answer questions).

Navigation is **human-driven and bidirectional**: the AI recommends and proves; you
choose to advance, repeat, or regress. A regression is logged, not lost.

## Principles

- **Give it context** — ticket, design, code, and your tacit knowledge.
- **Explore before build** — ask for options, not one answer.
- **You architect, it types** — you own the design choice and the trade-offs.
- **Work in small steps** — one buildable, provable step at a time.
- **Don't trust it, make it prove it** — numbers, not opinions; read every line.
- **Own it** — the result, the commits, and the PR are yours.

## How it works: `.specs/` as memory

State never lives only in the model's context. Each ticket gets a folder in the
*consuming* project:

```
.specs/
  CONVENTIONS.md          # the shared contract (written once)
  <ticket-id>/
    state.md              # phase, steps, gate state, navigation log
    understanding.md      # problem + acceptance criteria (+ design notes)
    context.md            # extra context you provide
    discoveries.md        # exploration findings + options
    decisions.md          # ADR: chosen approach + trade-offs
    plan.md               # the step breakdown
    steps/NN-*.md         # one spec per step, with proof + evidence
    assets/               # Figma exports, screenshots
```

It survives context compaction and lets any skill resume from disk.

## Install

ffloww is consumed as an APM dependency. In your project's `apm.yml`:

```yaml
dependencies:
  apm:
    - gesielrosa/ffloww#v0.1.0
```

```bash
apm install
```

This deploys the `flow-*` skills into your harness (`.claude/skills/` for Claude
Code, `.agents/skills/` for the others).

**MCP servers.** ffloww bundles the `azure-devops` and `figma` MCP servers. Because
they are self-defined, they reach you as *transitive* dependencies — APM asks you to
re-declare them in your own `apm.yml`, or to install with `--trust-transitive-mcp`.
Provide their credentials via environment variables (Azure DevOps PAT, Figma auth),
never in `apm.yml`. See [Install & configure](docs/install.md).

## Documentation

- [Concept & principles](docs/concept.md) — the human/AI contract behind the flow.
- [The flow, phase by phase](docs/the-flow.md) — what each phase does and why.
- [Specs & state](docs/specs-and-state.md) — `.specs/`, `state.md`, gates, navigation.
- [The context channel](docs/context-channel.md) — `context.md` and `flow-context`.
- [Install & configure](docs/install.md) — dependency install, MCP, targets.
- [Skills reference](docs/skills-reference.md) — every `flow-*` skill in detail.

## License

MIT.
