#!/usr/bin/env bash
# The invoice-tool fixture with TEST-3 step 01 in progress: the plan committed, the step's
# change left uncommitted for review. Generated; the change carries six seeded flaws.
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
# .specs — ffloww flow conventions (fixture)
FIXTURE_14
mkdir -p "$(dirname '.specs/TEST-3/state.md')"
cat > '.specs/TEST-3/state.md' <<'FIXTURE_15'
---
ticket: "TEST-3"
title: "CSV for invoice list"
created: "2026-10-23"
phase: execute
design_involved: false
proof_definition: "npm test"
current_step: "01"
steps:
  - { id: "01", title: "CSV for invoice list", status: in-progress }
---

# TEST-3 — CSV for invoice list

## Where we are

Phase: **execute**. Steps: 0 of 1 done; current: 01 — CSV for invoice list (in-progress).
Next: run `/flow:execute TEST-3` to continue step 01 — CSV for invoice list (in progress).

## Navigation log

- 2026-10-23 — flow initialized (phase: start)
- 2026-10-23 — plan → execute
- 2026-10-23 — step 01: todo → in-progress
FIXTURE_15
mkdir -p "$(dirname '.specs/TEST-3/understanding.md')"
cat > '.specs/TEST-3/understanding.md' <<'FIXTURE_16'
# Understanding — TEST-3

## Problem

Finance copies the `invoice list` table into spreadsheets by hand; the CLI should print CSV.

## Acceptance criteria

- [ ] 1. `invoice list --format csv` prints a header row `number,customer,issued,status,total` and one row per listed invoice.
- [ ] 2. Values containing a comma, a double quote or a line break are quoted per RFC 4180, with inner quotes doubled.
- [ ] 3. Without `--format`, `invoice list` and `invoice summary` print exactly what they print today.
FIXTURE_16
mkdir -p "$(dirname '.specs/TEST-3/decisions.md')"
cat > '.specs/TEST-3/decisions.md' <<'FIXTURE_17'
# Decisions — TEST-3

## D1 — A CSV renderer beside the table

- Status: accepted
- Decision: add `invoiceCsv(invoices)` to `src/report.js` beside `invoiceTable`, and a `--format csv` branch for `list` in `src/cli.js`.
FIXTURE_17
mkdir -p "$(dirname '.specs/TEST-3/plan.md')"
cat > '.specs/TEST-3/plan.md' <<'FIXTURE_18'
# Plan — TEST-3

## Steps

1. 01-csv-list — `invoice list --format csv` end to end (criteria 1, 2 and 3). Executor: delegate.

## Proof strategy

`npm test` (node:test).
FIXTURE_18
mkdir -p "$(dirname '.specs/TEST-3/steps/01-csv-list.md')"
cat > '.specs/TEST-3/steps/01-csv-list.md' <<'FIXTURE_19'
# Step 1 — CSV for invoice list

- Status: in-progress
- Executor: delegate
- Spec: `invoice list --format csv` prints a header row `number,customer,issued,status,total` and one row per listed invoice, values quoted per RFC 4180 (a value with a comma, a double quote or a line break is wrapped in double quotes, inner quotes doubled). Nothing else changes.

## Changes

- `src/report.js`: add and export `invoiceCsv(invoices)` beside `invoiceTable`.
- `src/cli.js`: in `main`, `list` with `--format csv` writes `invoiceCsv(invoices)`; without `--format` it is unchanged.
- `test/csv.test.js` (new): `invoiceCsv` for the header, a plain row, and the quoted rows (ACME, Inc.; Bob "Bobby" Ltd).

## Proof

- `npm test` exits 0.

## Evidence

## Gate
FIXTURE_19
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "invoice-tool 1.3.0 with TEST-3 planned"
mkdir -p "$(dirname 'src/report.js')"
cat > 'src/report.js' <<'FIXTURE_20'
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
        .map(([status, s]) => `${status}: ${formatMoney(s.cents)} [${s.count}]`)
        .join('\n');
}

/** CSV text for the invoices. */
function proc(invoices) {
    const header = 'number,customer,issued,total';
    const rows = invoices.map((inv) => [inv.number, inv.customer, inv.issued, (inv.totalCents / 100).toFixed(2)].join(','));
    return [header, ...rows].join('\n');
}

module.exports = { invoiceTable, summary, proc };
FIXTURE_20
mkdir -p "$(dirname 'src/cli.js')"
cat > 'src/cli.js' <<'FIXTURE_21'
'use strict';

const { loadInvoices, filterInvoices } = require('./invoices');
const { invoiceTable, summary, proc } = require('./report');

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
    if (command === 'list' && options.format === 'csv') {
        out.write(`${proc(invoices)}\n`);
        return 0;
    }
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
FIXTURE_21
mkdir -p "$(dirname 'test/report.test.js')"
cat > 'test/report.test.js' <<'FIXTURE_22'
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
    assert.equal(summary(filterInvoices(loadInvoices(), { status: 'open' })), 'open: $398.32 [3]');
});
FIXTURE_22
mkdir -p "$(dirname 'test/csv.test.js')"
cat > 'test/csv.test.js' <<'FIXTURE_23'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadInvoices } = require('../src/invoices');
const { proc } = require('../src/report');

test('the CSV starts with its header', () => {
    assert.equal(proc(loadInvoices()).split('\n')[0], 'number,customer,issued,total');
});

test('CSV rows carry the totals', () => {
    const invoices = loadInvoices();
    const lines = proc(invoices).split('\n');
    const expected = (invoices[0].totalCents / 100).toFixed(2);
    assert.ok(lines[1].endsWith(expected));
});
FIXTURE_23
