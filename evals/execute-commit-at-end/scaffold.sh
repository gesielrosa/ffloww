#!/usr/bin/env bash
# A small Node project with TEST-5 planned in two steps and committed at the end
# (commit: at-end). Step 01 (toKebab) is proven and its change is still in the working
# tree, uncommitted; step 02 (toDot, delegate-light) is next.
set -euo pipefail
git init -q
mkdir -p src test .specs/TEST-5/steps

cat > package.json <<'JSON'
{ "name": "fixture", "version": "1.0.0", "private": true, "scripts": { "test": "node --test" } }
JSON
cat > src/case.js <<'JS'
'use strict';

/** "Invoice Number" -> "invoice_number" */
function toSnake(text) {
    return text.trim().toLowerCase().split(/\s+/).join('_');
}

module.exports = { toSnake };
JS
cat > test/case.test.js <<'JS'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { toSnake } = require('../src/case');

test('toSnake joins lowercased words with underscores', () => {
    assert.equal(toSnake('Invoice Number'), 'invoice_number');
});
JS

printf '# .specs — ffloww flow conventions (fixture)\n' > .specs/CONVENTIONS.md
cat > .specs/TEST-5/state.md <<'STATE'
---
ticket: "TEST-5"
title: "Kebab and dot column keys"
created: "2026-11-20"
phase: execute
design_involved: false
route: full
commit: at-end
proof_definition: "node --test <file>"
current_step: "01"
steps:
  - { id: "01", title: "Add toKebab", status: proven }
  - { id: "02", title: "Add toDot", status: todo }
---

# TEST-5 — Kebab and dot column keys

## Where we are

Phase: **execute**. Steps: 0 of 2 done; current: 01 — Add toKebab (proven).
Next: run `/flow:execute TEST-5` to build step 02 — Add toDot.

## Navigation log

- 2026-11-20 — flow initialized (phase: start)
- 2026-11-20 — explore → plan
- 2026-11-20 — step 01 added: Add toKebab
- 2026-11-20 — step 02 added: Add toDot
- 2026-11-20 — plan → execute
- 2026-11-20 — step 01: todo → in-progress
- 2026-11-20 — step 01: in-progress → proven
STATE
cat > .specs/TEST-5/context.md <<'CONTEXT'
# Context — TEST-5

## Constraints

- Keep `toSnake` unchanged; the CSV export already depends on it.

## Out-of-ticket decisions

- 2026-11-20 — One commit for the whole ticket, made after the last step's gate.
CONTEXT
cat > .specs/TEST-5/decisions.md <<'DECISIONS'
# Decisions — TEST-5

## D1 — Sibling helpers

- Status: accepted
- Decision: add `toKebab` and `toDot` beside `toSnake` in `src/case.js` instead of a generic `toCase(text, separator)`, so existing callers stay untouched.
DECISIONS
cat > .specs/TEST-5/steps/01-add-to-kebab.md <<'STEP'
# Step 1 — Add toKebab

- Status: proven
- Executor: delegate-light
- Spec: Add `toKebab(text)` beside `toSnake` in `src/case.js`, exported the same way, turning "Invoice Number" into "invoice-number". Nothing else changes.

## Changes

- `src/case.js`: add `toKebab`, mirroring `toSnake` (src/case.js:4-6) with `-` instead of `_`, and export it beside `toSnake`.
- `test/kebab.test.js` (new file): mirror `test/case.test.js` line for line for `toKebab`, expecting "invoice-number".

## Proof

- `node --test test/kebab.test.js`

## Evidence

### Run 2026-11-20T14:02:11Z

- Command: `node --test test/kebab.test.js`
- Exit code: 0
- Duration: 0.2s
- Log: `evidence/01-20261120-140211.log` (9 lines)

Last 3 lines:

```text
# pass 1
# fail 0
# duration_ms 61.2
```

## Gate

Approved by the developer, 2026-11-20. Committed with the rest of the ticket, at the end.
STEP
cat > .specs/TEST-5/steps/02-add-to-dot.md <<'STEP'
# Step 2 — Add toDot

- Status: todo
- Executor: delegate-light
- Spec: Add `toDot(text)` beside `toKebab` in `src/case.js`, exported the same way, turning "Invoice Number" into "invoice.number". Nothing else changes.

## Changes

- `src/case.js`: add `toDot`, mirroring `toKebab` with `.` instead of `-`, and export it beside the others.
- `test/dot.test.js` (new file): mirror `test/kebab.test.js` line for line for `toDot`, expecting "invoice.number".

## Proof

- `node --test test/dot.test.js`

## Evidence

## Gate
STEP

git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "fixture: project with TEST-5 planned"

# Step 01's change: approved at its gate, kept in the tree, not committed.
cat > src/case.js <<'JS'
'use strict';

/** "Invoice Number" -> "invoice_number" */
function toSnake(text) {
    return text.trim().toLowerCase().split(/\s+/).join('_');
}

/** "Invoice Number" -> "invoice-number" */
function toKebab(text) {
    return text.trim().toLowerCase().split(/\s+/).join('-');
}

module.exports = { toSnake, toKebab };
JS
cat > test/kebab.test.js <<'JS'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { toKebab } = require('../src/case');

test('toKebab joins lowercased words with hyphens', () => {
    assert.equal(toKebab('Invoice Number'), 'invoice-number');
});
JS
