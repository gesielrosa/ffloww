#!/usr/bin/env bash
# A small Node project with TEST-6 planned in two steps. Step 01 (toKebab) is built in the
# working tree, its proof recorded, and waits at its gate; step 02 (separators) is todo.
set -euo pipefail
git init -q -b main
mkdir -p src test .specs/TEST-6/steps .specs/TEST-6/evidence

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
printf '.specs/\n' > .gitignore
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "labels 1.0.0"

# Step 01's change, built and still uncommitted.
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

printf '# .specs — ffloww flow conventions (fixture)\n' > .specs/CONVENTIONS.md
cat > .specs/TEST-6/state.md <<'STATE'
---
ticket: "TEST-6"
title: "Kebab column keys"
created: "2026-11-20"
phase: execute
design_involved: false
route: full
commit: per-step
proof_definition: "node --test <file>"
current_step: "01"
steps:
  - { id: "01", title: "Add toKebab", status: in-progress }
  - { id: "02", title: "Treat every separator alike", status: todo }
---

# TEST-6 — Kebab column keys

## Where we are

Phase: **execute**. Steps: 0 of 2 done; current: 01 — Add toKebab (in-progress).
Next: run `/flow:execute TEST-6` to continue step 01 — Add toKebab (in progress).

## Navigation log

- 2026-11-20 — flow initialized (phase: start)
- 2026-11-20 — explore → plan
- 2026-11-20 — step 01 added: Add toKebab
- 2026-11-20 — step 02 added: Treat every separator alike
- 2026-11-20 — plan → execute
- 2026-11-20 — step 01: todo → in-progress
STATE
cat > .specs/TEST-6/context.md <<'CONTEXT'
# Context — TEST-6

## Constraints

- Keep `toSnake` unchanged; the CSV export already depends on it.
CONTEXT
cat > .specs/TEST-6/understanding.md <<'UNDERSTANDING'
# Understanding — TEST-6

## Acceptance criteria

- [ ] 1. `toKebab('Invoice Number')` returns `invoice-number`.
- [ ] 2. Keys that already carry a separator (`invoice_number`, `invoice.number`) come out in the target case too.
UNDERSTANDING
cat > .specs/TEST-6/decisions.md <<'DECISIONS'
# Decisions — TEST-6

## D1 — A sibling helper, then one splitter

- Status: accepted
- Decision: add `toKebab` beside `toSnake` first (step 01), then make both split on the same separators (step 02).
DECISIONS
cat > .specs/TEST-6/plan.md <<'PLAN'
# Plan — TEST-6

## Steps

1. Add toKebab (criterion 1).
2. Treat every separator alike (criterion 2).
PLAN
cat > .specs/TEST-6/steps/01-add-to-kebab.md <<'STEP'
# Step 1 — Add toKebab

- Status: in-progress
- Executor: delegate-light
- Spec: Add `toKebab(text)` beside `toSnake` in `src/case.js`, exported the same way, turning "Invoice Number" into "invoice-number". Nothing else changes.

## Changes

- `src/case.js`: add `toKebab`, mirroring `toSnake` (src/case.js:4-6) with `-` instead of `_`.
- `test/kebab.test.js` (new file): mirror `test/case.test.js` for `toKebab`.

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

<!-- Human decision: approved / changes requested / regress. Who + when. Then each review
     finding that reached the gate, with its outcome: fixed, accepted (why), rejected
     (why), or deferred to step NN (that step's spec carries it). -->
STEP
cat > .specs/TEST-6/steps/02-every-separator.md <<'STEP'
# Step 2 — Treat every separator alike

- Status: todo
- Executor: delegate
- Spec: `toSnake` keeps its behavior for words separated by spaces, and both helpers share one way of splitting their input.

## Changes

- `src/case.js`: move the splitting into one function used by `toSnake` and `toKebab`.

## Proof

- `node --test test/case.test.js`
- `node --test test/kebab.test.js`

## Evidence

## Gate

<!-- Human decision: approved / changes requested / regress. Who + when. Then each review
     finding that reached the gate, with its outcome: fixed, accepted (why), rejected
     (why), or deferred to step NN (that step's spec carries it). -->
STEP
printf '# ffloww proof run\n# pass 1\n# fail 0\n# exit code: 0\n' > .specs/TEST-6/evidence/01-20261120-140211.log
