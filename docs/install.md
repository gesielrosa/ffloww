# Install & configure

ffloww is an APM package, consumed as a dependency of your project. You need the
[APM CLI](https://github.com/microsoft/apm) installed.

## Add the dependency

In your project's `apm.yml`:

```yaml
dependencies:
  apm:
    - gesielrosa/ffloww#v0.1.0     # pin to a released tag
```

Then:

```bash
apm install
```

Or in one step:

```bash
apm install gesielrosa/ffloww#v0.1.0
```

Installing the whole package gives you **all** the `flow-*` skills. APM pins the exact
commit and content hash in `apm.lock.yaml` — commit that file so every contributor
installs the same bytes.

## Where the skills land

APM deploys to the harnesses you target (`targets:` in your `apm.yml`, or auto-detected):

- **Claude Code** → `.claude/skills/flow-*/`
- **Copilot / Cursor / Codex / Gemini / OpenCode** → `.agents/skills/flow-*/`

The `flow-start` skill ships its `scripts/init_spec.js` alongside it, so scaffolding
works wherever the skill is deployed.

## MCP servers (important)

ffloww bundles two MCP servers — **azure-devops** (used by `flow-understand`) and
**figma** (used by `flow-design`). They are *self-defined*, so when you install ffloww
as a dependency they reach you as **transitive** MCP servers, which APM blocks by
default. Two ways to accept them:

```bash
# Option A: trust transitive MCP for this install
apm install --trust-transitive-mcp

# Option B: re-declare them in your own apm.yml (explicit and reviewable)
```

```yaml
# Option B — your apm.yml
dependencies:
  mcp:
    - name: azure-devops
      registry: false
      transport: stdio
      command: npx
      args: ["-y", "@azure-devops/mcp", "<your-org>"]
    - name: figma
      registry: false
      transport: http
      url: https://mcp.figma.com/mcp
```

### Credentials

Provide credentials via environment variables in your own environment — **never in
`apm.yml`**:

- **Azure DevOps** — a Personal Access Token with work-item read access.
- **Figma** — authenticate per the Figma MCP's flow.

If you do not use one of the integrations, you can skip its MCP server: the design
phase is conditional, and the rest of the flow runs without Figma.

## Targets

Pin targets for reproducibility:

```yaml
# your apm.yml
targets:
  - claude
  - copilot
```

Without `targets:`, APM auto-detects harnesses present in your repo.

## Verify the install

```bash
apm install --dry-run     # resolve and print the plan; no writes
apm view ffloww           # inspect installed package metadata
apm audit                 # scan for hidden Unicode + lockfile drift
```

After installing, the skills are discoverable by your agent. Start with `flow-start`
on a ticket — see [the flow](the-flow.md).

## Troubleshooting

- **Install paused on a transitive MCP server.** Expected — use
  `--trust-transitive-mcp` or re-declare the server (above).
- **`azure-devops` calls fail.** Check the PAT env var and its scopes.
- **Skills not picked up.** Confirm they landed under your harness's skills directory
  and that your harness scans it (`.claude/skills/` or `.agents/skills/`).
