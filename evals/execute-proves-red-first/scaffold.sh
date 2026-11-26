#!/usr/bin/env bash
# A small Node project, committed, with TEST-4 planned: one delegate step that adds
# toTitle with a NEW test, and a Proof that marks that test "red first".
set -euo pipefail
git init -q
mkdir -p src test .specs/TEST-4/steps

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
cat > .specs/TEST-4/state.md <<'STATE'
---
ticket: "TEST-4"
title: "Title-case column headers"
created: "2026-11-20"
phase: plan
design_involved: false
route: full
commit: per-step
proof_definition: "node --test <file>; new tests run red first"
current_step: null
steps:
  - { id: "01", title: "Add toTitle", status: todo }
---

# TEST-4 — Title-case column headers

## Where we are

Phase: **plan**. Steps: 0 of 1 done.
Next: run `/flow:execute TEST-4` to build step 01 — Add toTitle.

## Navigation log

- 2026-11-20 — flow initialized (phase: start)
- 2026-11-20 — explore → plan
- 2026-11-20 — step 01 added: Add toTitle
STATE
cat > .specs/TEST-4/context.md <<'CONTEXT'
# Context — TEST-4

## Constraints

- Keep `toSnake` unchanged; the CSV export already depends on it.
CONTEXT
cat > .specs/TEST-4/decisions.md <<'DECISIONS'
# Decisions — TEST-4

## D1 — A sibling helper

- Status: accepted
- Decision: add `toTitle` beside `toSnake` in `src/case.js`, so existing callers stay untouched.
DECISIONS
cat > .specs/TEST-4/plan.md <<'PLAN'
# Plan — TEST-4

## Approach

Add `toTitle` beside `toSnake`; the report header uses it in a later ticket.

## Steps

1. Add toTitle (proves AC 1: "invoice number" renders as "Invoice Number").

## Proof strategy

`node --test <file>` per step. A test file runs in well under a second, so every new test
runs red first; the existing suite is the guard.
PLAN
cat > .specs/TEST-4/steps/01-add-to-title.md <<'STEP'
# Step 1 — Add toTitle

- Status: todo
- Executor: delegate
- Spec: Add `toTitle(text)` beside `toSnake` in `src/case.js`, exported the same way. It trims the text, collapses runs of whitespace to one space, and upper-cases the first letter of each word, lower-casing the rest: "  invoice   NUMBER " becomes "Invoice Number". An empty or blank string gives "". Nothing else changes.

## Changes

- `src/case.js`: add `toTitle`, following the shape of `toSnake` (src/case.js:4-6), and export it beside `toSnake`.
- `test/title.test.js` (new file): follow `test/case.test.js`; cases for "invoice number", "  invoice   NUMBER " and "", each against its literal expected value.

## Proof

- `node --test test/title.test.js` — red first
- `node --test test/case.test.js` (the existing suite, a guard)

## Evidence

## Gate
STEP

git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "fixture: project with TEST-4 planned"
