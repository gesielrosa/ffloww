#!/usr/bin/env bash
# The labels project with SHP-2 built, verified and approved, each proof stamped with the tree
# it ran on. After the verify gate one more commit changed src/case.js, and nothing was proven
# again. The branch is up to date with its base (a bare repo in .remote.git).
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

git switch -q -c SHP-2-kebab-keys
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
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "feat: add toKebab (SHP-2)"
PROVEN_TREE=$(git rev-parse 'HEAD^{tree}')
PROVEN_HEAD=$(git rev-parse --short HEAD)

mkdir -p .specs/SHP-2/steps .specs/SHP-2/evidence
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
cat > .specs/SHP-2/state.md <<'STATE'
---
ticket: "SHP-2"
title: "Kebab column keys"
created: "2026-11-20"
phase: verify
design_involved: false
route: full
commit: per-step
proof_definition: "node --test <file>"
current_step: null
steps:
  - { id: "01", title: "Add toKebab", status: done }
---

# SHP-2 — Kebab column keys

## Where we are

Phase: **verify**. Steps: 1 of 1 done.
Next: run `/flow:ship SHP-2` to assemble the PR/MR draft from the specs.

## Navigation log

- 2026-11-20 — flow initialized (phase: start)
- 2026-11-20 — explore → plan
- 2026-11-20 — step 01 added: Add toKebab
- 2026-11-20 — plan → execute
- 2026-11-20 — step 01: todo → in-progress
- 2026-11-20 — step 01: in-progress → proven
- 2026-11-20 — step 01: proven → done
STATE
cat > .specs/SHP-2/understanding.md <<'UNDERSTANDING'
# Understanding — SHP-2

## Ticket

- ID: SHP-2
- Title: Kebab column keys
- Type: User Story
- Link: https://dev.azure.com/acme/labels/_workitems/edit/7

## Problem

The export needs column keys in kebab case besides snake case. In scope: `toKebab` beside
`toSnake`. Non-goals: changing `toSnake`.

## Acceptance criteria

- [ ] 1. `toKebab('Invoice Number')` returns `invoice-number`.
- [ ] 2. `toSnake` behaves as before.

## Design

No design involved.
UNDERSTANDING
cat > .specs/SHP-2/context.md <<'CONTEXT'
# Context — SHP-2

## Constraints

- Keep `toSnake` unchanged; the CSV export already depends on it.
CONTEXT
cat > .specs/SHP-2/decisions.md <<'DECISIONS'
# Decisions — SHP-2

## D1 — A sibling helper

- Date: 2026-11-20
- Status: accepted

`toKebab` is added beside `toSnake` instead of a generic `toCase(text, separator)`, so the
existing callers of `toSnake` stay untouched.
DECISIONS
cat > .specs/SHP-2/plan.md <<'PLAN'
# Plan — SHP-2

## Approach

Add `toKebab` beside `toSnake` in `src/case.js`, mirroring it with `-`.

## Steps

1. Add toKebab (criteria 1 and 2).

## Criteria and proof

| # | Criterion | Level | Step | Proof |
|---|-----------|-------|------|-------|
| 1 | `toKebab('Invoice Number')` returns `invoice-number` | test | 01 | `node --test test/kebab.test.js` |
| 2 | `toSnake` behaves as before | test | 01 | `node --test test/case.test.js` |

## Proof strategy

Each helper has a test file of its own, run with `node --test test/<file>`. The project has
no slow suite to leave for verify.
PLAN
cat > .specs/SHP-2/steps/01-add-to-kebab.md <<STEP
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
printf '# ffloww proof run\n# pass 1\n# fail 0\n# exit code: 0\n' > .specs/SHP-2/evidence/01-20261120-140211.log

cat > .specs/SHP-2/verification.md <<VERIFICATION
# Verification — SHP-2

> Whole-ticket check against the acceptance criteria (/flow:verify). One evidence
> entry per acceptance criterion, recorded by the proof runner; the human decision
> goes in Gate.

## Evidence

### Run 2026-11-21T09:15:02Z — AC 1: toKebab('Invoice Number') returns invoice-number

- Command: \`node --test test/kebab.test.js\`
- Exit code: 0
- Duration: 0.2s
- Tree: \`$PROVEN_TREE\` (HEAD \`$PROVEN_HEAD\`)
- Log: \`evidence/ticket-20261121-091502.log\` (9 lines)

Last 3 lines:

\`\`\`text
# pass 1
# fail 0
# duration_ms 58.4
\`\`\`

### Run 2026-11-21T09:15:09Z — AC 2: toSnake behaves as before

- Command: \`node --test test/case.test.js\`
- Exit code: 0
- Duration: 0.2s
- Tree: \`$PROVEN_TREE\` (HEAD \`$PROVEN_HEAD\`)
- Log: \`evidence/ticket-20261121-091509.log\` (9 lines)

Last 3 lines:

\`\`\`text
# pass 1
# fail 0
# duration_ms 57.9
\`\`\`

## Gate

Approved by the developer, 2026-11-21.
VERIFICATION
for log in ticket-20261121-091502 ticket-20261121-091509; do
    printf '# ffloww proof run\n# pass 1\n# fail 0\n# exit code: 0\n' > ".specs/SHP-2/evidence/$log.log"
done
echo '- 2026-11-21 — execute → verify' >> .specs/SHP-2/state.md

# After the verify gate, the code changed: toKebab now also splits on underscores.
cat > src/case.js <<'JS'
'use strict';

/** "Invoice Number" -> "invoice_number" */
function toSnake(text) {
    return text.trim().toLowerCase().split(/\s+/).join('_');
}

/** "Invoice Number" or "invoice_number" -> "invoice-number" */
function toKebab(text) {
    return text.trim().toLowerCase().split(/[\s_]+/).join('-');
}

module.exports = { toSnake, toKebab };
JS
git -c user.name=fixture -c user.email=fixture@example.com commit -q -am "fix: toKebab splits on underscores too (SHP-2)"
