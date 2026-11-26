#!/usr/bin/env bash
# A small Node project that exports rows through a vendored CSV writer, with EXP-1
# understood: the notes column, which holds line breaks, must be quoted. The writer's
# README says it does not quote line breaks; a plugin it loads from another folder does.
set -euo pipefail
git init -q -b main
mkdir -p src test vendor/tinycsv/plugins .specs/EXP-1/steps

cat > package.json <<'JSON'
{ "name": "fixture", "version": "1.0.0", "private": true, "scripts": { "test": "node --test" } }
JSON
cat > vendor/tinycsv/README.md <<'DOC'
# tinycsv

A tiny CSV writer, vendored at 0.3.

    const { write } = require('./vendor/tinycsv');
    write([['a', 'b'], ['1', '2']]);   // "a,b\r\n1,2\r\n"

## Limitations

- Fields with commas or double quotes are quoted. Fields with line breaks are written
  as they are: callers that need RFC 4180 must escape them first.
DOC
cat > vendor/tinycsv/rules.js <<'JS'
'use strict';

// What makes a field need quotes. Plugins add to this list.
const rules = [(field) => field.includes(','), (field) => field.includes('"')];

module.exports = { rules };
JS
cat > vendor/tinycsv/plugins/index.js <<'JS'
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Every plugin in this folder is loaded, in name order.
for (const name of fs.readdirSync(__dirname).sort()) {
    if (name !== 'index.js' && name.endsWith('.js')) require(path.join(__dirname, name));
}
JS
cat > vendor/tinycsv/plugins/multiline.js <<'JS'
'use strict';

const { rules } = require('../rules');

rules.push((field) => /[\r\n]/.test(field));
JS
cat > vendor/tinycsv/index.js <<'JS'
'use strict';

const { rules } = require('./rules');
require('./plugins');

/** One field, quoted when a rule asks for it. */
function field(value) {
    const text = String(value);
    return rules.some((rule) => rule(text)) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows as CSV text, CRLF after each record. */
function write(rows) {
    return rows.map((row) => `${row.map(field).join(',')}\r\n`).join('');
}

module.exports = { write };
JS
cat > src/export.js <<'JS'
'use strict';

const { write } = require('../vendor/tinycsv');

/** The orders as CSV: number, customer. */
function exportOrders(orders) {
    return write([['number', 'customer'], ...orders.map((o) => [o.number, o.customer])]);
}

module.exports = { exportOrders };
JS
cat > test/export.test.js <<'JS'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { exportOrders } = require('../src/export');

test('orders are exported with a header', () => {
    assert.equal(exportOrders([{ number: 'A-1', customer: 'ACME, Inc.' }]), 'number,customer\r\nA-1,"ACME, Inc."\r\n');
});
JS
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "orders 1.0.0"

printf '# .specs — ffloww flow conventions (fixture)\n' > .specs/CONVENTIONS.md
cat > .specs/EXP-1/state.md <<'STATE'
---
ticket: "EXP-1"
title: "Export the notes column"
created: "2026-11-20"
phase: understand
design_involved: false
route: full
commit: per-step
proof_definition: ""
current_step: null
steps: []
---

# EXP-1 — Export the notes column

## Where we are

Phase: **understand**.
Next: run `/flow:explore EXP-1` to map the code and surface options.

## Navigation log

- 2026-11-20 — flow initialized (phase: start)
- 2026-11-20 — start → understand
STATE
cat > .specs/EXP-1/understanding.md <<'UNDERSTANDING'
# Understanding — EXP-1

## Ticket

- ID: EXP-1
- Title: Export the notes column
- Type: User Story
- Link: https://dev.azure.com/acme/orders/_workitems/edit/1

## Problem

The orders export needs a third column, `notes`. Notes are free text and often hold line
breaks. In scope: the column in `exportOrders`. Non-goals: other formats.

## Acceptance criteria

- [ ] 1. `exportOrders` writes a third column, `notes`, after `customer`.
- [ ] 2. A note with a line break is quoted per RFC 4180, so the file still has one record per order.

## Design

No design involved.

## Open questions
UNDERSTANDING
cat > .specs/EXP-1/context.md <<'CONTEXT'
# Context — EXP-1

## Constraints

- No new npm packages. `vendor/tinycsv` is vendored: changing it is allowed, replacing it is a bigger decision.
CONTEXT
cat > .specs/EXP-1/discoveries.md <<'DISCOVERIES'
# Discoveries — EXP-1

## Context map

## Options

## Notes
DISCOVERIES
cat > .specs/EXP-1/decisions.md <<'DECISIONS'
# Decisions — EXP-1
DECISIONS
cat > .specs/EXP-1/plan.md <<'PLAN'
# Plan — EXP-1
PLAN
