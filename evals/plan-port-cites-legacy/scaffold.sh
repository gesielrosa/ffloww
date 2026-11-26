#!/usr/bin/env bash
# A small Node project with PORT-1 explored: move pen matching from src/legacy/ to a new
# module, with the same behavior. The legacy code upper-cases only the colours the plugin
# sends, and never trims.
set -euo pipefail
git init -q -b main
mkdir -p src/legacy test .specs/PORT-1/steps

cat > package.json <<'JSON'
{ "name": "fixture", "version": "1.0.0", "private": true, "scripts": { "test": "node --test" } }
JSON
cat > src/legacy/pen-match.js <<'JS'
'use strict';

const PENS = { '#FF0000': 'red', '#00ff00': 'green', '#0000FF': 'blue' };

/** The pen for a colour, or null when no pen has it. */
function matchPen(color, fromPlugin) {
    // The plugin sends colours in any case; a code typed by hand is matched as it is.
    const code = fromPlugin ? color.toUpperCase() : color;
    return PENS[code] || null;
}

module.exports = { matchPen, PENS };
JS
cat > test/pen-match.test.js <<'JS'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { matchPen } = require('../src/legacy/pen-match');

test('a plugin colour is matched in upper case', () => {
    assert.equal(matchPen('#ff0000', true), 'red');
});

test('a typed code is matched as it is', () => {
    assert.equal(matchPen('#00ff00', false), 'green');
    assert.equal(matchPen('#ff0000', false), null);
});
JS
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "pens 1.0.0"

printf '# .specs — ffloww flow conventions (fixture)\n' > .specs/CONVENTIONS.md
cat > .specs/PROJECT.md <<'PROFILE'
# Project profile

## Proof commands

- one test file: `node --test test/<file>` (under 1 s)

- Fast ends at: 60 s

## Commits

- Policy: per-step
- Messages:

## Pull requests

- Base branch:
- Format:

## Notes
PROFILE
cat > .specs/PORT-1/state.md <<'STATE'
---
ticket: "PORT-1"
title: "Move pen matching out of legacy"
created: "2026-11-20"
phase: explore
design_involved: false
route: full
commit: per-step
proof_definition: ""
current_step: null
steps: []
---

# PORT-1 — Move pen matching out of legacy

## Where we are

Phase: **explore**.
Next: run `/flow:plan PORT-1` to pick an approach and slice it into steps.

## Navigation log

- 2026-11-20 — flow initialized (phase: start)
- 2026-11-20 — start → understand
- 2026-11-20 — understand → explore
STATE
cat > .specs/PORT-1/understanding.md <<'UNDERSTANDING'
# Understanding — PORT-1

## Ticket

- ID: PORT-1
- Title: Move pen matching out of legacy
- Type: Task
- Link: https://dev.azure.com/acme/pens/_workitems/edit/1

## Problem

Pen matching lives in `src/legacy/`, which is being retired. Port it to a new module,
`src/pens/match.js`, with the same behavior, so callers can move over one by one. In
scope: the new module and its tests. Non-goals: changing what matches, deleting the
legacy file.

## Acceptance criteria

- [ ] 1. `match(color, { fromPlugin })` in `src/pens/match.js` returns the same pen as the legacy `matchPen(color, fromPlugin)` for every input.
- [ ] 2. The legacy module stays as it is.

## Design

No design involved.

## Open questions
UNDERSTANDING
cat > .specs/PORT-1/context.md <<'CONTEXT'
# Context — PORT-1

## Constraints

- Parity with the legacy matching: a pen that matches today matches after the port, and one that does not, does not.
CONTEXT
cat > .specs/PORT-1/discoveries.md <<'DISCOVERIES'
# Discoveries — PORT-1

## Context map

- `src/legacy/pen-match.js:3` — `PENS`, the colour codes and their pens.
- `src/legacy/pen-match.js:6-10` — `matchPen(color, fromPlugin)`: looks the colour up in `PENS`, null when absent.
- `test/pen-match.test.js` — the legacy's tests, with `node:test`.

## Options

### Option A — a new module with the logic moved over

- Approach: `src/pens/match.js` with `match(color, { fromPlugin })`, its own copy of the lookup, and tests of its own; the legacy file stays until its callers move.
- Pros / Cons: the new module stands alone; two copies for a while.
- Risk / effort: low / small.

### Option B — a new module that calls the legacy

- Approach: `src/pens/match.js` re-exports `matchPen` under the new signature.
- Pros / Cons: no duplication; the new module cannot outlive the legacy file, which defeats the ticket.
- Risk / effort: low / tiny.

## Notes

- The new signature takes an options object; the legacy takes a boolean.
DISCOVERIES
cat > .specs/PORT-1/decisions.md <<'DECISIONS'
# Decisions — PORT-1

> ADR log. One entry per decision. Append-only.
DECISIONS
cat > .specs/PORT-1/plan.md <<'PLAN'
# Plan — PORT-1

## Approach

## Steps

## Criteria and proof

| # | Criterion | Level | Step | Proof |
|---|-----------|-------|------|-------|

## Proof strategy

## Evidence
PLAN
cat > .specs/PORT-1/steps/_TEMPLATE.md <<'STEP'
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

<!-- Human decision: approved / changes requested / regress. Who + when. Then each review
     finding that reached the gate, with its outcome: fixed, accepted (why), rejected
     (why), or deferred to step NN (that step's spec carries it). -->
STEP
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "PORT-1 explored"
