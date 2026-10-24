---
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

/flow:understand TINY-1

The azure-devops MCP isn't connected here, so here is the work item:

TINY-1 — Capitalize the usage line (Task)
URL: https://dev.azure.com/acme-finance/invoice-tool/_workitems/edit/11
Description: The usage line the CLI prints on a bad command starts with a lowercase "usage:"; the team's other tools print "Usage:". Only the first word changes.
Acceptance criteria:
1. The usage line printed on an unknown command starts with "Usage: invoice".

No extra context, and no design involved.
