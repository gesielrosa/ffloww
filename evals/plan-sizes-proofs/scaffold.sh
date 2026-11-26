#!/usr/bin/env bash
# A small Node project with PRF-1 explored, and a project profile (.specs/PROJECT.md) that
# times one test file at under a second and the whole suite at about 14 minutes.
set -euo pipefail
git init -q
mkdir -p src test tools .specs/PRF-1/steps

cat > package.json <<'JSON'
{ "name": "fixture", "version": "1.0.0", "private": true, "scripts": { "test:all": "node --test" } }
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
cat > tools/lint.js <<'JS'
'use strict';

// The project's linter: source files use spaces, never tabs.
const fs = require('node:fs');
const path = require('node:path');

let bad = 0;
for (const dir of ['src', 'test']) {
    for (const name of fs.readdirSync(dir)) {
        if (fs.readFileSync(path.join(dir, name), 'utf8').includes('\t')) {
            console.log(`${dir}/${name}: tab character`);
            bad++;
        }
    }
}
console.log(bad ? `${bad} file(s) with tabs` : 'lint ok');
process.exit(bad ? 1 : 0);
JS

printf '# .specs — ffloww flow conventions (fixture)\n' > .specs/CONVENTIONS.md
cat > .specs/PROJECT.md <<'PROFILE'
# Project profile

> What the flow has learned about this project and every ticket needs: how proofs run
> here, how work is committed and how it ships. `/flow:plan` reads it and adds what its
> baseline shows, `/flow:retro` proposes changes to it, and you edit it freely. The
> lines written as "- Name: value" are settings the flow's scripts read.

## Proof commands

- one test file: `node --test test/<file>` (under 1 s)
- the whole suite: `npm run test:all` (about 14 min: it replays the customer data set; once per ticket)

- Fast ends at: 60 s

## Commits

- Policy: per-step
- Messages:

## Pull requests

- Base branch:
- Format:

## Notes
PROFILE
cat > .specs/PRF-1/state.md <<'STATE'
---
ticket: "PRF-1"
title: "Kebab and dot column keys"
created: "2026-11-20"
phase: explore
design_involved: false
route: full
commit: per-step
proof_definition: ""
current_step: null
steps: []
---

# PRF-1 — Kebab and dot column keys

## Where we are

Phase: **explore**.
Next: run `/flow:plan PRF-1` to pick an approach and slice it into steps.

## Navigation log

- 2026-11-20 — flow initialized (phase: start)
- 2026-11-20 — start → understand
- 2026-11-20 — understand → explore
STATE
cat > .specs/PRF-1/understanding.md <<'UNDERSTANDING'
# Understanding — PRF-1

## Ticket

- ID: PRF-1
- Title: Kebab and dot column keys
- Type: User Story
- Link: https://dev.azure.com/acme/labels/_workitems/edit/1

## Problem

The export needs column keys in two more shapes besides snake case. In scope: two helpers
beside `toSnake`. Non-goals: changing `toSnake`, a generic case converter.

## Acceptance criteria

- [ ] 1. `toKebab('Invoice Number')` returns `invoice-number`.
- [ ] 2. `toDot('Invoice Number')` returns `invoice.number`.
- [ ] 3. `toSnake` behaves as before.

## Design

No design involved.

## Open questions
UNDERSTANDING
cat > .specs/PRF-1/context.md <<'CONTEXT'
# Context — PRF-1

## Constraints

- Keep `toSnake` unchanged; the CSV export already depends on it.
CONTEXT
cat > .specs/PRF-1/discoveries.md <<'DISCOVERIES'
# Discoveries — PRF-1

## Context map

- `src/case.js:4-6` — `toSnake(text)`: trim, lower-case, split on whitespace, join with `_`. Exported at `:8`.
- `test/case.test.js:7-9` — the one test of `toSnake`, with `node:test`.
- `tools/lint.js` — the linter: fails on a tab character in `src/` or `test/`.

## Options

### Option A — sibling helpers

- Approach: add `toKebab` and `toDot` beside `toSnake`, each mirroring it with its own separator, each with a test file of its own.
- Pros / Cons: existing callers untouched; three near-identical functions.
- Risk / effort: low / small.

### Option B — a generic `toCase(text, separator)`

- Approach: one function, and `toSnake` becomes a call to it.
- Pros / Cons: no duplication; it changes `toSnake`, which the ticket rules out.
- Risk / effort: low / small.

## Notes

- Each helper is provable on its own through its export.
DISCOVERIES
cat > .specs/PRF-1/decisions.md <<'DECISIONS'
# Decisions — PRF-1

> ADR log. One entry per decision. Append-only.
DECISIONS
cat > .specs/PRF-1/plan.md <<'PLAN'
# Plan — PRF-1

## Approach

## Steps

## Proof strategy

## Evidence
PLAN
cat > .specs/PRF-1/steps/_TEMPLATE.md <<'STEP'
# Step <n> — <title>

- Status: todo <!-- todo | in-progress | proven | done -->
- Executor: <!-- delegate (subagent on Sonnet) | delegate-light (subagent on Haiku, mechanical steps) | inline (main session); set by /flow:plan -->
- Spec: <!-- what this step delivers; its scope boundary -->

## Changes

<!-- Files/areas to touch, and the existing code to follow (file:line). Keep the step small. -->

## Proof

<!-- The project-defined proof for THIS step: the exact commands, one per line, with the
     exit code that passes when it is not 0. "red first" marks a command that proves new
     behavior and is fast enough to run twice: it runs before the change too, and has to
     fail there. Guards (lint, typecheck, the existing suite) carry no mark. -->

## Evidence

<!-- RAW entries recorded by the proof runner (command + exit code + last lines + log
     under evidence/), or a screenshot path. Numbers, not opinions. The human reviews
     this before the gate. -->

## Gate

<!-- Human decision: approved / changes requested / regress. Who + when. -->
STEP
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "labels 1.0.0 with PRF-1 explored"
