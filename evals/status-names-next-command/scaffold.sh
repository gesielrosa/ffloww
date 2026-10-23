#!/usr/bin/env bash
# TEST-1 mid-execute: step 01 done, step 02 in progress, step 03 to do.
set -euo pipefail
git init -q
mkdir -p .specs/TEST-1/steps
printf '# .specs — ffloww flow conventions (fixture)\n' > .specs/CONVENTIONS.md
cat > .specs/TEST-1/state.md <<'STATE'
---
ticket: "TEST-1"
title: "Export invoices as CSV"
created: "2026-10-20"
phase: execute
design_involved: false
proof_definition: "npm test -- csv"
current_step: "02"
steps:
  - { id: "01", title: "Add the CSV exporter", status: done }
  - { id: "02", title: "Stream large exports", status: in-progress }
  - { id: "03", title: "Wire the export button", status: todo }
---

# TEST-1 — Export invoices as CSV

## Where we are

Phase: **execute**. Steps: 1 of 3 done; current: 02 — Stream large exports (in-progress).
Next: run `/flow:execute TEST-1` to continue step 02 — Stream large exports (in progress).

## Navigation log

- 2026-10-20 — flow initialized (phase: start)
- 2026-10-20 — plan → execute
- 2026-10-21 — step 01: proven → done
- 2026-10-22 — step 02: todo → in-progress
STATE
