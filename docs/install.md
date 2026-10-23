# Install & configure

ffloww is a Claude Code plugin named **`flow`**. The `gesielrosa/ffloww` repository is
both the plugin and its marketplace (also named `ffloww`).

## Requirements

- Claude Code (the one-step install below needs 2.1.275 or later).
- Node.js on the `PATH` — the flow's scripts (`init_spec.js`, `run_proof.js`) run with
  `node`, and the Azure DevOps MCP server starts with `npx`.

## Install

In a Claude Code session, in one step:

```text
/plugin install flow --marketplace gesielrosa/ffloww
```

Or add the marketplace first, then install:

```text
/plugin marketplace add gesielrosa/ffloww
/plugin install flow@ffloww
```

From the shell:

```bash
claude plugin marketplace add gesielrosa/ffloww
claude plugin install flow@ffloww --scope project   # or --scope user
```

### For a team

Install with `--scope project`: Claude Code records the plugin in the repository's
`.claude/settings.json`. Commit that file. Each teammate adds the marketplace and runs
the same install command once — the committed entry does not download the plugin by
itself.

## What you get

- **Skills** — `/flow:start`, `/flow:understand`, `/flow:design`, `/flow:explore`,
  `/flow:plan`, `/flow:execute`, `/flow:verify`, `/flow:ship`, and the utilities
  `/flow:status`, `/flow:context`, `/flow:help`.
- **Subagents** — `flow:step-executor` (Sonnet) builds delegated steps,
  `flow:design-reader` (Sonnet) reads the Figma nodes, `flow:code-mapper` (Haiku,
  read-only) maps code during exploration. Their models are pinned in their definitions.
- **Scripts** — `init_spec.js` scaffolds `.specs/`; `run_proof.js` runs proofs and
  records their evidence.
- **A guard hook** — `scripts/guard.js` runs before every Bash, Edit, and Write call
  while the plugin is enabled. It acts only on `.specs/` files and on the flow's
  subagents: evidence stays immutable, and subagents cannot run git that writes, edit
  `state.md`, or change a step's gate. Everything else passes untouched.
- **MCP servers** — `azure-devops` and `figma` (below).

## MCP servers

The plugin starts two MCP servers while it is enabled:

- **azure-devops** — used by `/flow:understand` to read the work item. It runs
  `npx -y @azure-devops/mcp <organization>`; set `AZURE_DEVOPS_ORG` in your environment
  to your organization (it defaults to `HAL-LMKSRVST`). Sign in with a Microsoft account
  that can access the organization when prompted.
- **figma** — used by `/flow:design`. The remote Figma MCP server
  (`https://mcp.figma.com/mcp`); authenticate it from `/mcp`.

Credentials stay in your environment and your accounts, never in the plugin. If you do
not use one of them, turn it off in `/mcp`: the design phase is conditional, and the
rest of the flow runs without Figma. The tools appear as
`mcp__plugin_flow_<server>__<tool>`.

## Update

```bash
claude plugin update flow@ffloww
```

Then run `/reload-plugins` in an open session. Auto-update is off by default for
marketplaces other than Anthropic's.

## Verify the install

- `/plugin` lists `flow` as enabled.
- `/agents` lists `flow:step-executor`, `flow:design-reader`, and `flow:code-mapper`.
- `claude plugin details flow` shows the components and their projected token cost.

Start with `/flow:start` on a ticket — see [the flow](the-flow.md).

## Troubleshooting

- **Skills or agents missing.** Check `/plugin` that `flow` is enabled, then run
  `/reload-plugins`.
- **`azure-devops` calls fail.** Check `AZURE_DEVOPS_ORG` and that you signed in with
  an account that can access it.
- **`node` not found when scaffolding or proving.** Install Node.js and make sure it is
  on the `PATH` of the shell Claude Code uses.
