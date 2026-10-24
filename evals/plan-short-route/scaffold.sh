#!/usr/bin/env bash
# The invoice-tool fixture with TINY-1, a one-line change, understood on the short route. Generated.
set -euo pipefail
git init -q
mkdir -p "$(dirname '.gitignore')"
cat > '.gitignore' <<'FIXTURE_1'
node_modules/
FIXTURE_1
mkdir -p "$(dirname 'CLAUDE.md')"
cat > 'CLAUDE.md' <<'FIXTURE_2'
# invoice-tool

A zero-dependency Node CLI over `data/invoices.json`, used by the finance team.

- Run the tests with `npm test` (node:test); one file with `node --test test/<file>`.
- Keep it dependency-free: no npm packages.
- `src/cli.js` writes results to the `out` stream and errors to `err`, and returns the exit
  code; tests drive `main()` with fake streams instead of spawning the binary.
FIXTURE_2
mkdir -p "$(dirname 'bin/invoice.js')"
cat > 'bin/invoice.js' <<'FIXTURE_3'
#!/usr/bin/env node
'use strict';

process.exitCode = require('../src/cli').main(process.argv.slice(2));
FIXTURE_3
mkdir -p "$(dirname 'data/invoices.json')"
cat > 'data/invoices.json' <<'FIXTURE_4'
[
  { "number": "INV-1001", "customer": "Globex", "issued": "2026-01-14", "status": "paid", "totalCents": 125000, "currency": "USD" },
  { "number": "INV-1002", "customer": "ACME, Inc.", "issued": "2026-02-02", "status": "paid", "totalCents": 98050, "currency": "USD" },
  { "number": "INV-1003", "customer": "Bob \"Bobby\" Ltd", "issued": "2026-02-20", "status": "open", "totalCents": 4500, "currency": "USD" },
  { "number": "INV-1004", "customer": "Café Lumière", "issued": "2026-03-05", "status": "paid", "totalCents": 210075, "currency": "EUR" },
  { "number": "INV-1005", "customer": "Initech", "issued": "2026-03-28", "status": "open", "totalCents": 1999, "currency": "USD" },
  { "number": "INV-1006", "customer": "Umbrella\nResearch Division", "issued": "2026-04-11", "status": "paid", "totalCents": 1500000, "currency": "USD" },
  { "number": "INV-1007", "customer": "Hooli", "issued": "2026-05-09", "status": "open", "totalCents": 33333, "currency": "USD" },
  { "number": "INV-1008", "customer": "Stark Industries", "issued": "2026-06-30", "status": "paid", "totalCents": 76010, "currency": "USD" }
]
FIXTURE_4
mkdir -p "$(dirname 'package.json')"
cat > 'package.json' <<'FIXTURE_5'
{
  "name": "invoice-tool",
  "version": "1.3.0",
  "private": true,
  "description": "A zero-dependency CLI over the finance team's invoice data.",
  "bin": { "invoice": "bin/invoice.js" },
  "scripts": { "test": "node --test" }
}
FIXTURE_5
mkdir -p "$(dirname 'src/cli.js')"
cat > 'src/cli.js' <<'FIXTURE_6'
'use strict';

const { loadInvoices, filterInvoices } = require('./invoices');
const { invoiceTable, summary } = require('./report');

const USAGE = 'usage: invoice <list|summary> [--status paid|open] [--from YYYY-MM-DD] [--to YYYY-MM-DD]';

/** Split argv into the command and its "--key value" options. */
function parseArgs(argv) {
    const [command, ...rest] = argv;
    const options = {};
    for (let i = 0; i < rest.length; i += 2) {
        const key = rest[i];
        if (!key.startsWith('--')) throw new Error(`unexpected argument: ${key}`);
        options[key.slice(2)] = rest[i + 1];
    }
    return { command, options };
}

/** Run the CLI; returns the exit code. */
function main(argv, out = process.stdout, err = process.stderr) {
    let parsed;
    try {
        parsed = parseArgs(argv);
    } catch (e) {
        err.write(`${e.message}\n${USAGE}\n`);
        return 1;
    }
    const { command, options } = parsed;
    const invoices = filterInvoices(loadInvoices(), options);
    if (command === 'list') {
        out.write(`${invoiceTable(invoices)}\n`);
        return 0;
    }
    if (command === 'summary') {
        out.write(`${summary(invoices)}\n`);
        return 0;
    }
    err.write(`${USAGE}\n`);
    return 1;
}

module.exports = { main, parseArgs, USAGE };
FIXTURE_6
mkdir -p "$(dirname 'src/format.js')"
cat > 'src/format.js' <<'FIXTURE_7'
'use strict';

/** 123450 cents → "$1,234.50" (or "€1,234.50" for EUR). */
function formatMoney(cents, currency = 'USD') {
    const symbol = currency === 'EUR' ? '€' : '$';
    const value = (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol}${value}`;
}

/** Pad a table cell to a width. */
function pad(text, width) {
    return String(text).padEnd(width);
}

module.exports = { formatMoney, pad };
FIXTURE_7
mkdir -p "$(dirname 'src/invoices.js')"
cat > 'src/invoices.js' <<'FIXTURE_8'
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DATA = path.join(__dirname, '..', 'data', 'invoices.json');

/** All invoices, oldest first. */
function loadInvoices(file = DATA) {
    const invoices = JSON.parse(fs.readFileSync(file, 'utf8'));
    return invoices.sort((a, b) => a.issued.localeCompare(b.issued));
}

/** Invoices matching the filters: status ('paid' | 'open'), from / to (inclusive, YYYY-MM-DD). */
function filterInvoices(invoices, { status, from, to } = {}) {
    return invoices.filter(
        (inv) => (!status || inv.status === status) && (!from || inv.issued >= from) && (!to || inv.issued <= to),
    );
}

module.exports = { loadInvoices, filterInvoices };
FIXTURE_8
mkdir -p "$(dirname 'src/report.js')"
cat > 'src/report.js' <<'FIXTURE_9'
'use strict';

const { formatMoney, pad } = require('./format');

/** A text table of invoices: number, customer, issued, status, total. */
function invoiceTable(invoices) {
    const header = ['Number', 'Customer', 'Issued', 'Status', 'Total'];
    const rows = invoices.map((inv) => [inv.number, inv.customer, inv.issued, inv.status, formatMoney(inv.totalCents, inv.currency)]);
    const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
    const line = (cells) => cells.map((c, i) => pad(c, widths[i])).join('  ').trimEnd();
    return [line(header), ...rows.map(line)].join('\n');
}

/** Totals per status, e.g. "paid: $1,234.50 (3 invoices)". */
function summary(invoices) {
    const byStatus = {};
    for (const inv of invoices) {
        byStatus[inv.status] = byStatus[inv.status] || { cents: 0, count: 0 };
        byStatus[inv.status].cents += inv.totalCents;
        byStatus[inv.status].count += 1;
    }
    return Object.entries(byStatus)
        .map(([status, s]) => `${status}: ${formatMoney(s.cents)} (${s.count} invoice${s.count === 1 ? '' : 's'})`)
        .join('\n');
}

module.exports = { invoiceTable, summary };
FIXTURE_9
mkdir -p "$(dirname 'test/cli.test.js')"
cat > 'test/cli.test.js' <<'FIXTURE_10'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { main } = require('../src/cli');

/** A writable stand-in that keeps what was written. */
function sink() {
    return { text: '', write(chunk) { this.text += chunk; } };
}

test('list prints the table of the filtered invoices', () => {
    const out = sink();
    assert.equal(main(['list', '--status', 'open'], out, sink()), 0);
    assert.equal(out.text.trim().split('\n').length, 4);
});

test('an unknown command prints the usage and exits 1', () => {
    const err = sink();
    assert.equal(main(['export'], sink(), err), 1);
    assert.match(err.text, /^usage: invoice/);
});
FIXTURE_10
mkdir -p "$(dirname 'test/format.test.js')"
cat > 'test/format.test.js' <<'FIXTURE_11'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { formatMoney } = require('../src/format');

test('formatMoney shows the symbol, thousands separators and two decimals', () => {
    assert.equal(formatMoney(123450), '$1,234.50');
    assert.equal(formatMoney(210075, 'EUR'), '€2,100.75');
    assert.equal(formatMoney(5), '$0.05');
});
FIXTURE_11
mkdir -p "$(dirname 'test/invoices.test.js')"
cat > 'test/invoices.test.js' <<'FIXTURE_12'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadInvoices, filterInvoices } = require('../src/invoices');

test('loadInvoices returns every invoice, oldest first', () => {
    const invoices = loadInvoices();
    assert.equal(invoices.length, 8);
    assert.equal(invoices[0].number, 'INV-1001');
    assert.equal(invoices[7].number, 'INV-1008');
});

test('filterInvoices keeps the status and the inclusive date range', () => {
    const invoices = loadInvoices();
    assert.deepEqual(filterInvoices(invoices, { status: 'open' }).map((i) => i.number), ['INV-1003', 'INV-1005', 'INV-1007']);
    assert.deepEqual(filterInvoices(invoices, { from: '2026-03-05', to: '2026-04-11' }).map((i) => i.number), ['INV-1004', 'INV-1005', 'INV-1006']);
});
FIXTURE_12
mkdir -p "$(dirname 'test/report.test.js')"
cat > 'test/report.test.js' <<'FIXTURE_13'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadInvoices, filterInvoices } = require('../src/invoices');
const { invoiceTable, summary } = require('../src/report');

test('invoiceTable has a header and one line per invoice', () => {
    const lines = invoiceTable(filterInvoices(loadInvoices(), { status: 'open' })).split('\n');
    assert.match(lines[0], /^Number\s+Customer\s+Issued\s+Status\s+Total$/);
    assert.equal(lines.length, 4);
    assert.match(lines[1], /^INV-1003\s+Bob "Bobby" Ltd\s+2026-02-20\s+open\s+\$45\.00$/);
});

test('summary totals each status', () => {
    assert.equal(summary(filterInvoices(loadInvoices(), { status: 'open' })), 'open: $398.32 (3 invoices)');
});
FIXTURE_13
chmod +x bin/invoice.js
mkdir -p "$(dirname '.specs/CONVENTIONS.md')"
cat > '.specs/CONVENTIONS.md' <<'FIXTURE_14'
# .specs — ffloww flow conventions

The contract the `/flow:*` commands follow. Each phase reads this file, the ticket's
`state.md`, and its `context.md` before acting.

## The record

`.specs/<ticket-id>/` is the flow's memory. Whatever shapes later work (an answer, a
decision, a constraint) goes into the ticket's files as it happens, so any phase can
start in a fresh context.

- `state.md` — phase, steps, navigation log; the single source of truth
- `understanding.md` — problem, scope, acceptance criteria, design notes
- `context.md` — what the developer adds beyond the ticket and the code (`/flow:context`)
- `discoveries.md` — code map and options · `decisions.md` — ADR log and regressions
- `plan.md` — the breakdown · `steps/NN-<slug>.md` — one spec per step
- `verification.md` — whole-ticket check · `evidence/` — proof logs · `assets/` — design exports

Flow: start → understand → design (if any) → explore → plan → execute ⇄ verify → ship.
Short route: start → understand → design (if any) → plan → execute → ship.

## Commands and the ticket

Each phase is a command the developer types: `/flow:<phase> <ticket-id>`, and the
developer runs the next one when ready. The ticket id comes from the command's argument;
without one, use the only ticket in progress under `.specs/`, or ask which.

## Phase boundaries

A phase ends once whatever the developer said that shapes later work is in the ticket's
files. It then names the next command (the `Next:` line the state script prints) and
advises on the session:
- up to the plan (understand, design, explore), the next phase builds on this
  conversation, so it continues in this session unless the session has grown long;
- from the plan on (plan → execute, step to step, verify → ship), each phase works from
  self-contained specs, so `/clear` comes first.

## State

`state.md` changes only through the flow's state script (`state.js`: `show`, `phase`,
`set`, `add-step`, `remove-step`, `step`, `log`); the plugin blocks hand edits.
Phases move forward freely; moving back is a regression and needs a reason, recorded in
`decisions.md` too. A step moves `todo → in-progress → proven` (approved at its gate)
`→ done` (committed), one at a time, and the next step starts once the previous one is
committed. Before the gate, a step's proof passes or fails; only the developer's
approval makes it `proven`.

A small, clear change can take the **short route**, when the developer chooses it
(`state.js set route short`): the plan maps the change itself instead of a separate
explore, and the last step's gate leads to ship, without a whole-ticket verify.

## Roles

- The developer decides: the approach, the slicing, and whether each proof holds.
- The main session talks to the developer, opens the gates, and changes state.
  Subagents build or read, then report back; a report is a lead to check.
- A step's `Executor` line says who builds it: `delegate` (a subagent on Sonnet),
  `delegate-light` (on Haiku, for mechanical steps), or `inline` (the main session).

## Gates — make it prove it

- Proof is raw evidence recorded by the proof runner (`run_proof.js`): command, exit
  code, real output; or a screenshot path. Numbers, not opinions.
- A proof's exit code is its verdict: each proof command exits non-zero exactly when its
  criterion fails (`! cmd` when a failure is expected). The runner keeps the full
  output, so no `| tail` or `; echo $?` is needed; it notes a command chained with
  `;`, `||` or a pipe, whose exit code is its last part's, so that part carries the
  verdict.
- The developer grades the evidence at the step's `Gate`; the assistant presents it
  and records the decision. Recorded evidence is immutable: a new result is a new run.
- Proofs read credentials from environment variables; the runner masks the secrets it
  recognizes before recording.

## Git & PR

Read git freely (`status`, `diff`, `log`). Commits, branches, pushes and PRs are the
developer's: `/flow:execute` drafts commit messages and `/flow:ship` a PR/MR draft, in
the developer's conventions, for whatever VCS host they use.

Principles: give it context · explore before build · you architect, it types · small
steps · make it prove it · own it.
FIXTURE_14
mkdir -p "$(dirname '.specs/TINY-1/state.md')"
cat > '.specs/TINY-1/state.md' <<'FIXTURE_15'
---
ticket: "TINY-1"
title: "Capitalize the usage line"
created: "2026-10-23"
phase: understand
design_involved: false
route: short
proof_definition: ""
current_step: null
steps: []
---

# TINY-1 — Capitalize the usage line

## Where we are

Phase: **understand**.
Next: run `/flow:plan TINY-1` to map the small change and slice it (short route).

## Navigation log

- 2026-10-23 — flow initialized (phase: start)
- 2026-10-23 — start → understand
FIXTURE_15
mkdir -p "$(dirname '.specs/TINY-1/context.md')"
cat > '.specs/TINY-1/context.md' <<'FIXTURE_16'
# Context — TINY-1

## Links

## Constraints

## Out-of-ticket decisions

## Gotchas

## Related work
FIXTURE_16
mkdir -p "$(dirname '.specs/TINY-1/understanding.md')"
cat > '.specs/TINY-1/understanding.md' <<'FIXTURE_17'
# Understanding — TINY-1

## Ticket

- ID: TINY-1
- Title: Capitalize the usage line
- Type: Task
- Link: https://dev.azure.com/acme-finance/invoice-tool/_workitems/edit/11

## Problem

The usage line the CLI prints on a bad command starts with a lowercase `usage:`; the team's other tools print `Usage:`. Only the first word changes.

## Acceptance criteria

- [ ] 1. The usage line printed on an unknown command starts with `Usage: invoice`.

## Design

No design involved.

## Open questions
FIXTURE_17
mkdir -p "$(dirname '.specs/TINY-1/discoveries.md')"
cat > '.specs/TINY-1/discoveries.md' <<'FIXTURE_18'
# Discoveries — TINY-1

## Context map

## Options

## Notes
FIXTURE_18
mkdir -p "$(dirname '.specs/TINY-1/decisions.md')"
cat > '.specs/TINY-1/decisions.md' <<'FIXTURE_19'
# Decisions — TINY-1

> ADR log. One entry per decision. Append-only.
FIXTURE_19
mkdir -p "$(dirname '.specs/TINY-1/plan.md')"
cat > '.specs/TINY-1/plan.md' <<'FIXTURE_20'
# Plan — TINY-1

## Approach

## Steps

## Proof strategy
FIXTURE_20
mkdir -p "$(dirname '.specs/TINY-1/steps/_TEMPLATE.md')"
cat > '.specs/TINY-1/steps/_TEMPLATE.md' <<'FIXTURE_21'
# Step <n> — <title>

- Status: todo <!-- todo | in-progress | proven | done -->
- Executor: <!-- delegate | delegate-light | inline; set by /flow:plan -->
- Spec: <!-- what this step delivers; its scope boundary -->

## Changes

## Proof

## Evidence

## Gate
FIXTURE_21
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "invoice-tool 1.3.0 with TINY-1"
