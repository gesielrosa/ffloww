#!/usr/bin/env bash
# The labels project with VER-2 built and committed on its branch, up to date with its base.
# Its plan holds the criteria table: two criteria proven by test files, one accepted as a gap.
set -euo pipefail
git init -q -b main
mkdir -p src test

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
cat > .gitignore <<'IGNORE'
.specs/
IGNORE
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "labels 1.0.0"
git init -q --bare .remote.git
echo '.remote.git/' >> .git/info/exclude
git remote add origin .remote.git
git push -q origin main
git remote set-head origin main

git switch -q -c VER-2-kebab-keys
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
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "feat: add toKebab (VER-2)"
PROVEN_TREE=$(git rev-parse 'HEAD^{tree}')
PROVEN_HEAD=$(git rev-parse --short HEAD)

mkdir -p .specs/VER-2/steps .specs/VER-2/evidence
printf '# .specs — ffloww flow conventions (fixture)\n' > .specs/CONVENTIONS.md
cat > .specs/PROJECT.md <<'PROFILE'
# Project profile

## Proof commands

- one test file: `node --test test/<file>` (under 1 s)

- Fast ends at: 60 s

## Commits

- Policy: per-step
- Messages: "feat: summary (TICKET-ID)"

## Pull requests

- Base branch: origin/main
- Format:

## Notes
PROFILE
cat > .specs/VER-2/state.md <<'STATE'
---
ticket: "VER-2"
title: "Kebab column keys"
created: "2026-11-20"
phase: execute
design_involved: false
route: full
commit: per-step
proof_definition: "node --test <file>"
current_step: null
steps:
  - { id: "01", title: "Add toKebab", status: done }
---

# VER-2 — Kebab column keys

## Where we are

Phase: **execute**. Steps: 1 of 1 done.
Next: run `/flow:verify VER-2` to check the whole ticket against its acceptance criteria.

## Navigation log

- 2026-11-20 — flow initialized (phase: start)
- 2026-11-20 — explore → plan
- 2026-11-20 — step 01 added: Add toKebab
- 2026-11-20 — plan → execute
- 2026-11-20 — step 01: todo → in-progress
- 2026-11-20 — step 01: in-progress → proven
- 2026-11-20 — step 01: proven → done
STATE
cat > .specs/VER-2/understanding.md <<'UNDERSTANDING'
# Understanding — VER-2

## Ticket

- ID: VER-2
- Title: Kebab column keys
- Type: User Story
- Link: https://dev.azure.com/acme/labels/_workitems/edit/7

## Problem

The export needs column keys in kebab case besides snake case. In scope: `toKebab` beside
`toSnake`. Non-goals: changing `toSnake`.

## Acceptance criteria

- [ ] 1. `toKebab('Invoice Number')` returns `invoice-number`.
- [ ] 2. `toSnake` behaves as before.
- [ ] 3. The export screen lists its columns by kebab key.

## Design

No design involved.
UNDERSTANDING
cat > .specs/VER-2/context.md <<'CONTEXT'
# Context — VER-2

## Constraints

- Keep `toSnake` unchanged; the CSV export already depends on it.
CONTEXT
cat > .specs/VER-2/decisions.md <<'DECISIONS'
# Decisions — VER-2

## D1 — A sibling helper

- Date: 2026-11-20
- Status: accepted

`toKebab` is added beside `toSnake` instead of a generic `toCase(text, separator)`, so the
existing callers of `toSnake` stay untouched.
DECISIONS
cat > .specs/VER-2/plan.md <<'PLAN'
# Plan — VER-2

## Approach

Add `toKebab` beside `toSnake` in `src/case.js`, mirroring it with `-`.

## Steps

1. Add toKebab (criteria 1 and 2).

## Criteria and proof

| # | Criterion | Level | Step | Proof |
|---|-----------|-------|------|-------|
| 1 | `toKebab('Invoice Number')` returns `invoice-number` | test | 01 | `node --test test/kebab.test.js` |
| 2 | `toSnake` behaves as before | test | 01 | `node --test test/case.test.js` |
| 3 | The export screen lists its columns by kebab key | gap | — | the screen sits behind the `exportV2` flag, off in every environment, so nothing can show it yet; accepted by the developer at plan approval |

## Proof strategy

Each helper has a test file of its own, run with `node --test test/<file>`. The project has
no slow suite to leave for verify.
PLAN
cat > .specs/VER-2/steps/01-add-to-kebab.md <<STEP
# Step 1 — Add toKebab

- Status: done
- Executor: delegate-light
- Spec: Add \`toKebab(text)\` beside \`toSnake\` in \`src/case.js\`, exported the same way, turning "Invoice Number" into "invoice-number". Nothing else changes.

## Changes

- \`src/case.js\`: add \`toKebab\`, mirroring \`toSnake\` with \`-\` instead of \`_\`.
- \`test/kebab.test.js\` (new file): mirror \`test/case.test.js\` for \`toKebab\`.

## Proof

- \`node --test test/kebab.test.js\` — red first
- \`node --test test/case.test.js\`

## Evidence

### Run 2026-11-20T14:02:11Z

- Command: \`node --test test/kebab.test.js\`
- Exit code: 0
- Duration: 0.2s
- Tree: \`$PROVEN_TREE\` (HEAD \`$PROVEN_HEAD\`)
- Log: \`evidence/01-20261120-140211.log\` (9 lines)

Last 3 lines:

\`\`\`text
# pass 1
# fail 0
# duration_ms 61.2
\`\`\`

## Gate

Approved by the developer, 2026-11-20.
STEP
printf '# ffloww proof run\n# pass 1\n# fail 0\n# exit code: 0\n' > .specs/VER-2/evidence/01-20261120-140211.log
