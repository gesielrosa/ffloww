#!/usr/bin/env bash
# TEST-1 just understood: understanding.md filled, context.md still empty.
set -euo pipefail
git init -q
mkdir -p .specs/TEST-1
printf '# .specs — ffloww flow conventions (fixture)\n' > .specs/CONVENTIONS.md
cat > .specs/TEST-1/state.md <<'STATE'
---
ticket: "TEST-1"
title: "Export invoices as CSV"
created: "2026-10-20"
phase: understand
design_involved: false
proof_definition: ""
current_step: null
steps: []
---

# TEST-1 — Export invoices as CSV

## Where we are

Phase: **understand**.
Next: run `/flow:explore TEST-1` to map the code and surface options.

## Navigation log

- 2026-10-20 — flow initialized (phase: start)
- 2026-10-20 — start → understand
STATE
cat > .specs/TEST-1/understanding.md <<'UNDERSTANDING'
# Understanding — TEST-1

## Ticket

- ID: TEST-1
- Title: Export invoices as CSV

## Problem

Finance needs to export the invoice list as a CSV file.

## Acceptance criteria

- [ ] The invoices page has an "Export CSV" action.
- [ ] The CSV holds one row per invoice: number, customer, date, total.
UNDERSTANDING
cat > .specs/TEST-1/context.md <<'CONTEXT'
# Context — TEST-1

## Links

## Constraints

## Out-of-ticket decisions

## Gotchas

## Related work
CONTEXT
