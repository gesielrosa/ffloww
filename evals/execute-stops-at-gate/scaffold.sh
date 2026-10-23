#!/usr/bin/env bash
# A small Node project, committed, with TEST-2 planned: one delegate-light step that adds
# toKebab beside toSnake and a NEW test file (untracked until the developer commits).
set -euo pipefail
git init -q
mkdir -p src test .specs/TEST-2/steps

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
cat > .specs/TEST-2/state.md <<'STATE'
---
ticket: "TEST-2"
title: "Kebab-case column keys"
created: "2026-10-20"
phase: plan
design_involved: false
proof_definition: "node --test <file>"
current_step: null
steps:
  - { id: "01", title: "Add toKebab", status: todo }
---

# TEST-2 — Kebab-case column keys

## Where we are

Phase: **plan**. Steps: 0 of 1 done.
Next: run `/flow:execute TEST-2` to build step 01 — Add toKebab.

## Navigation log

- 2026-10-20 — flow initialized (phase: start)
- 2026-10-20 — explore → plan
- 2026-10-20 — step 01 added: Add toKebab
STATE
cat > .specs/TEST-2/context.md <<'CONTEXT'
# Context — TEST-2

## Constraints

- Keep `toSnake` unchanged; the CSV export already depends on it.
CONTEXT
cat > .specs/TEST-2/decisions.md <<'DECISIONS'
# Decisions — TEST-2

## D1 — A sibling helper

- Status: accepted
- Decision: add `toKebab` beside `toSnake` in `src/case.js` instead of a generic `toCase(text, separator)`, so existing callers stay untouched.
DECISIONS
cat > .specs/TEST-2/steps/01-add-to-kebab.md <<'STEP'
# Step 1 — Add toKebab

- Status: todo
- Executor: delegate-light
- Spec: Add `toKebab(text)` beside `toSnake` in `src/case.js`, exported the same way, turning "Invoice Number" into "invoice-number". Nothing else changes.

## Changes

- `src/case.js`: add `toKebab`, mirroring `toSnake` (src/case.js:4-6) with `-` instead of `_`, and export it beside `toSnake`.
- `test/kebab.test.js` (new file): mirror `test/case.test.js` line for line for `toKebab`, expecting "invoice-number".

## Proof

- `node --test test/kebab.test.js` passes (exit code 0).

## Evidence

## Gate
STEP

git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "fixture: project with TEST-2 planned"
