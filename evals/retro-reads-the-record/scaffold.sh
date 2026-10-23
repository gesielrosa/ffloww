#!/usr/bin/env bash
# invoice-tool after INV-42 shipped through the flow, with its whole .specs record:
# a change requested at a gate, a proof re-run for a masked exit code, piped proofs.
# Generated from the rehearsal run.
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
const { invoiceTable, invoiceCsv, summary } = require('./report');

const FORMATS = ['table', 'csv'];
const USAGE = 'usage: invoice <list|summary> [--status paid|open] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--format table|csv]';

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
    if (command === 'list' && 'format' in options && !FORMATS.includes(options.format)) {
        err.write(`unknown format "${options.format ?? ''}"; supported formats: ${FORMATS.join(', ')}\n`);
        return 1;
    }
    const invoices = filterInvoices(loadInvoices(), options);
    if (command === 'list') {
        out.write(options.format === 'csv' ? invoiceCsv(invoices) : `${invoiceTable(invoices)}\n`);
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

/** 123450 cents → "1234.50": no symbol, no separators, for machine-readable output. */
function plainAmount(cents) {
    return (cents / 100).toFixed(2);
}

/** Pad a table cell to a width. */
function pad(text, width) {
    return String(text).padEnd(width);
}

module.exports = { formatMoney, plainAmount, pad };
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

const { formatMoney, plainAmount, pad } = require('./format');

const BOM = '\uFEFF';

/** A text table of invoices: number, customer, issued, status, total. */
function invoiceTable(invoices) {
    const header = ['Number', 'Customer', 'Issued', 'Status', 'Total'];
    const rows = invoices.map((inv) => [inv.number, inv.customer, inv.issued, inv.status, formatMoney(inv.totalCents, inv.currency)]);
    const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
    const line = (cells) => cells.map((c, i) => pad(c, widths[i])).join('  ').trimEnd();
    return [line(header), ...rows.map(line)].join('\n');
}

/** RFC 4180 field: quoted when it holds a comma, quote or line break; inner quotes doubled. */
function csvField(value) {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The invoices as CSV (same columns as invoiceTable): UTF-8 BOM, then CRLF-terminated records. */
function invoiceCsv(invoices) {
    const header = ['number', 'customer', 'issued', 'status', 'total'];
    const rows = invoices.map((inv) => [inv.number, inv.customer, inv.issued, inv.status, plainAmount(inv.totalCents)]);
    return BOM + [header, ...rows].map((cells) => cells.map(csvField).join(',') + '\r\n').join('');
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

module.exports = { invoiceTable, invoiceCsv, summary };
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

/** The invoice numbers found in some output, in order. */
function numbersIn(text) {
    return text.match(/INV-\d+/g) || [];
}

test('list --format csv starts with the BOM and header and ends with a single CRLF', () => {
    const out = sink();
    assert.equal(main(['list', '--format', 'csv'], out, sink()), 0);
    assert.ok(out.text.startsWith('﻿number,customer,issued,status,total\r\n'));
    assert.ok(out.text.endsWith('\r\n'));
    assert.ok(!out.text.endsWith('\r\n\n'));
});

test('list --format csv has the same invoices as the default list', () => {
    const table = sink();
    const csv = sink();
    assert.equal(main(['list'], table, sink()), 0);
    assert.equal(main(['list', '--format', 'csv'], csv, sink()), 0);
    assert.equal(numbersIn(csv.text).length, numbersIn(table.text).length);
    assert.deepEqual(numbersIn(csv.text), numbersIn(table.text));
});

test('the filters apply to the CSV', () => {
    const open = sink();
    assert.equal(main(['list', '--format', 'csv', '--status', 'open'], open, sink()), 0);
    assert.deepEqual(numbersIn(open.text), ['INV-1003', 'INV-1005', 'INV-1007']);

    const range = sink();
    assert.equal(main(['list', '--format', 'csv', '--from', '2026-03-01', '--to', '2026-04-30'], range, sink()), 0);
    assert.deepEqual(numbersIn(range.text), ['INV-1004', 'INV-1005', 'INV-1006']);
});

test('list --format table is the same as the default list', () => {
    const plain = sink();
    const table = sink();
    assert.equal(main(['list'], plain, sink()), 0);
    assert.equal(main(['list', '--format', 'table'], table, sink()), 0);
    assert.equal(table.text, plain.text);
});

test('an unknown format prints the supported ones on err and exits 1', () => {
    const out = sink();
    const err = sink();
    assert.equal(main(['list', '--format', 'xml'], out, err), 1);
    assert.match(err.text, /unknown format "xml"/);
    assert.match(err.text, /table, csv/);
    assert.equal(out.text, '');
});

test('--format without a value is the same error', () => {
    const out = sink();
    const err = sink();
    assert.equal(main(['list', '--format'], out, err), 1);
    assert.match(err.text, /unknown format ""/);
    assert.match(err.text, /table, csv/);
    assert.equal(out.text, '');
});

test('summary ignores --format', () => {
    const out = sink();
    const err = sink();
    assert.equal(main(['summary', '--format', 'xml'], out, err), 0);
    assert.match(out.text, /paid:/);
    assert.equal(err.text, '');
});
FIXTURE_10
mkdir -p "$(dirname 'test/format.test.js')"
cat > 'test/format.test.js' <<'FIXTURE_11'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { formatMoney, plainAmount } = require('../src/format');

test('formatMoney shows the symbol, thousands separators and two decimals', () => {
    assert.equal(formatMoney(123450), '$1,234.50');
    assert.equal(formatMoney(210075, 'EUR'), '€2,100.75');
    assert.equal(formatMoney(5), '$0.05');
});

test('plainAmount has two decimals and no symbol or separators', () => {
    assert.equal(plainAmount(123450), '1234.50');
    assert.equal(plainAmount(5), '0.05');
    assert.equal(plainAmount(100), '1.00');
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
const { invoiceTable, invoiceCsv, summary } = require('../src/report');

test('invoiceTable has a header and one line per invoice', () => {
    const lines = invoiceTable(filterInvoices(loadInvoices(), { status: 'open' })).split('\n');
    assert.match(lines[0], /^Number\s+Customer\s+Issued\s+Status\s+Total$/);
    assert.equal(lines.length, 4);
    assert.match(lines[1], /^INV-1003\s+Bob "Bobby" Ltd\s+2026-02-20\s+open\s+\$45\.00$/);
});

const BOM = '\uFEFF';
const CSV_HEADER = 'number,customer,issued,status,total';

test('invoiceCsv starts with the BOM and the header row', () => {
    const csv = invoiceCsv(loadInvoices());
    assert.ok(csv.startsWith(`${BOM}${CSV_HEADER}\r\n`));
});

test('invoiceCsv ends every record, the last included, with CRLF', () => {
    const csv = invoiceCsv(filterInvoices(loadInvoices(), { status: 'open' }));
    assert.ok(csv.endsWith('\r\n'));
    // the only bare LF allowed is inside a quoted field; open invoices have none
    assert.equal(csv.split('\n').length - 1, csv.split('\r\n').length - 1);
    assert.equal(csv.split('\r\n').length, 5); // header + 3 invoices + trailing empty piece
});

test('invoiceCsv quotes a field with a comma', () => {
    assert.ok(invoiceCsv(loadInvoices()).includes('INV-1002,"ACME, Inc.",2026-02-02,paid,980.50\r\n'));
});

test('invoiceCsv quotes a field with a quote and doubles the inner quotes', () => {
    assert.ok(invoiceCsv(loadInvoices()).includes('INV-1003,"Bob ""Bobby"" Ltd",2026-02-20,open,45.00\r\n'));
});

test('invoiceCsv keeps an embedded line break inside the quoted field', () => {
    assert.ok(invoiceCsv(loadInvoices()).includes('INV-1006,"Umbrella\nResearch Division",2026-04-11,paid,15000.00\r\n'));
});

test('invoiceCsv writes the total with no currency symbol, EUR included', () => {
    const csv = invoiceCsv(loadInvoices());
    assert.ok(csv.includes('INV-1004,Café Lumière,2026-03-05,paid,2100.75\r\n'));
    assert.ok(!csv.includes('$') && !csv.includes('€'));
});

test('invoiceCsv keeps non-ASCII characters as they are', () => {
    assert.ok(invoiceCsv(loadInvoices()).includes('Café Lumière'));
});

test('invoiceCsv of an empty list is the BOM and the header row only', () => {
    assert.equal(invoiceCsv([]), `${BOM}${CSV_HEADER}\r\n`);
});

test('summary totals each status', () => {
    assert.equal(summary(filterInvoices(loadInvoices(), { status: 'open' })), 'open: $398.32 (3 invoices)');
});
FIXTURE_13
chmod +x bin/invoice.js
mkdir -p "$(dirname '.specs/CONVENTIONS.md')"
cat > '.specs/CONVENTIONS.md' <<'FIXTURE_14'
<!-- ffloww:conventions sha256:9ed4580896a03820 — /flow:start keeps this file current until it is edited; an edited file is kept as is. -->
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

## Commands and the ticket

Each phase is a command the developer types: `/flow:<phase> <ticket-id>`. A phase ends
by naming the next command (the `Next:` line the state script prints) and suggesting
`/clear` before it, since the next phase reads everything from disk; the developer runs
it when ready. The ticket id comes from the command's argument; without one, use the
only ticket in progress under `.specs/`, or ask which.

## State

`state.md` changes only through the flow's state script (`state.js`: `show`, `phase`,
`set`, `add-step`, `remove-step`, `step`, `log`); the plugin blocks hand edits.
Phases move forward freely; moving back is a regression and needs a reason, recorded in
`decisions.md` too. A step moves `todo → in-progress → proven → done`, one at a time,
and the next step starts once the previous one is committed.

## Roles

- The developer decides: the approach, the slicing, and whether each proof holds.
- The main session talks to the developer, opens the gates, and changes state.
  Subagents build or read, then report back; a report is a lead to check.
- A step's `Executor` line says who builds it: `delegate` (a subagent on Sonnet),
  `delegate-light` (on Haiku, for mechanical steps), or `inline` (the main session).

## Gates — make it prove it

- Proof is raw evidence recorded by the proof runner (`run_proof.js`): command, exit
  code, real output; or a screenshot path. Numbers, not opinions.
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
mkdir -p "$(dirname '.specs/INV-42/assets/.gitkeep')"
cat > '.specs/INV-42/assets/.gitkeep' <<'FIXTURE_15'

FIXTURE_15
mkdir -p "$(dirname '.specs/INV-42/context.md')"
cat > '.specs/INV-42/context.md' <<'FIXTURE_16'
# Context — INV-42

> Extra context the developer provides that is NOT in the ticket, the design, or the
> codebase — tacit knowledge that shapes the work. Captured at the end of
> `/flow:understand`, and addable anytime with `/flow:context`. Every skill reads this
> at start. Append-only; date new entries.

## Links

<!-- Slack threads, docs, related PRs/incidents, dashboards. -->

## Constraints

<!-- Hard limits: do not touch X, must keep Y backward-compatible, deadlines. -->

- 2026-10-23 — Finance opens the exported file in Excel.
- 2026-10-23 — Must stay dependency-free: no `csv` npm package.

## Out-of-ticket decisions

<!-- Verbal or async decisions that are not written in the ticket. -->

- 2026-10-23 — Write a UTF-8 BOM at the start of the CSV (Excel).
- 2026-10-23 — CRLF line endings, per RFC 4180.
- 2026-10-23 — `table` is a `--format` value and the default; the unknown-format error lists `table, csv` and goes to `err`.

## Gotchas

<!-- Known traps, flaky areas, prior failed attempts. -->

## Related work

<!-- Adjacent tickets, past changes, people who know this area. -->
FIXTURE_16
mkdir -p "$(dirname '.specs/INV-42/decisions.md')"
cat > '.specs/INV-42/decisions.md' <<'FIXTURE_17'
# Decisions — INV-42

> ADR log. One entry per decision. Append-only; never rewrite history. Loop-backs
> (regressions) are recorded here too, with the reason.

## D1 — CSV renderer in `report.js`, `--format` branch in `main` (Option A)

- Date: 2026-10-23
- Status: accepted
- Context: `invoice list` needs a CSV export (INV-42). Filters already run before dispatch in `main` (`src/cli.js:30`), so only a renderer and a `--format` switch are missing. `formatMoney` adds symbols and separators, so it cannot serve the CSV.
- Decision: Option A (discoveries.md). Add `invoiceCsv(invoices)` to `src/report.js` next to `invoiceTable`, with a `csvField` escaper and a plain two-decimal amount helper in `src/format.js`. In `src/cli.js`, a single `FORMATS = ['table', 'csv']` array drives both validation and the error message. Developer choices:
  - `--format` is validated only for `list`; `summary` keeps ignoring it.
  - `--format` given without a value (last arg) is an error: exit 1, the same unknown-format message on `err`.
  - Validation runs before `loadInvoices()`.
  - `invoiceCsv` output is BOM + CRLF-terminated records (last one included); `main` writes it without the extra `\n`.
- Trade-offs: Option B (registry) rejected: more structure than two formats need and further formats are non-goals; its one benefit (no drift between the format list and the message) is kept via the `FORMATS` array. Option C (`src/csv.js`) rejected: an extra module for a single caller.
- Consequences: Two steps (renderer, then CLI wiring). Default `table` output is unchanged. Follow-ups, out of this ticket:
  - The fixed header has no currency column, so USD and EUR totals are indistinguishable in the CSV.
  - Spreadsheet formula injection: a field starting with `=`, `+`, `-` or `@` is evaluated by Excel.
FIXTURE_17
mkdir -p "$(dirname '.specs/INV-42/discoveries.md')"
cat > '.specs/INV-42/discoveries.md' <<'FIXTURE_18'
# Discoveries — INV-42

> Output of the `explore` phase. Diverge first: map the relevant code and surface
> *options*, not a single answer. The human picks; that choice is recorded in
> decisions.md.

## Context map

The codebase is ~175 lines, so it was read directly (no mapper agents); every line below was read.

- `bin/invoice.js:4` — entry; passes `process.argv.slice(2)` to `main` and sets the exit code.
- `src/cli.js:9-18` — `parseArgs`: first arg is the command, the rest are strictly `--key value` pairs (step 2). `--format csv` already parses; any `--key` is accepted, nothing validates option names.
- `src/cli.js:21-41` — `main(argv, out, err)`: parse errors → `err` + USAGE, exit 1 (`:24-28`). Filters are applied **before** dispatch (`:30`), so a `list` branch gets already-filtered invoices (criterion 4 comes for free). `list` writes `invoiceTable(invoices)` + `\n` to `out` (`:31-34`). Unknown command → USAGE on `err`, exit 1 (`:39-40`).
- `src/cli.js:6` — `USAGE` string does not mention `--format`.
- `src/report.js:6-12` — `invoiceTable`: columns number, customer, issued, status, total (same as the CSV header); total via `formatMoney(inv.totalCents, inv.currency)`.
- `src/format.js:4-8` — `formatMoney(cents, currency)` adds `$`/`€` and thousands separators, so it **cannot** be reused for CSV (criterion 2). `pad` is table-only.
- `src/invoices.js:9-12` — `loadInvoices` sorts oldest first; `:15-19` `filterInvoices` (status, inclusive from/to on the `YYYY-MM-DD` string). `issued` is already `YYYY-MM-DD`.
- `data/invoices.json` — **open question answered:** `totalCents` is an integer in cents, with a `currency` of USD or EUR (INV-1004 is EUR). `1234.50` = `totalCents / 100` with 2 decimals; `toFixed(2)` on the division is safe for integer cents.
- Tests: `test/cli.test.js:12-22` drive `main()` with `sink()` fakes (the CLAUDE.md pattern); `test/report.test.js:8-17` unit-tests `report.js`; `test/format.test.js` for `format.js`.

Fixtures already cover every escaping case in criterion 3: `ACME, Inc.` (comma, INV-1002), `Bob "Bobby" Ltd` (quote, INV-1003), `Umbrella\nResearch Division` (line break, INV-1006), plus non-ASCII `Café Lumière` (INV-1004).

## Options

### Option A — CSV renderer in `report.js`, plain `--format` branch in `main`

- Approach: add `invoiceCsv(invoices)` to `src/report.js` next to `invoiceTable` (with a small `csvField` escaper and a plain `amount` helper, in `format.js`). In `main`, read `options.format` (default `table`), validate against `['table','csv']`, and have the `list` branch pick the renderer with an `if`/ternary. The BOM and CRLF are produced by `invoiceCsv`.
- Pros: smallest diff, follows the existing layout (render in `report.js`, wire in `cli.js`), easy unit tests next to `invoiceTable`. Cons: a second format means a second `if` in `main`; a third format would want Option B.
- Risk / effort: low / small (~25 lines + tests).

### Option B — formatter registry (`FORMATS = { table, csv }`)

- Approach: a `FORMATS` map from name to renderer, so `main` looks up `FORMATS[options.format ?? 'table']`, and the supported list in the error message is `Object.keys(FORMATS)`, which cannot drift from the code.
- Pros: the error message and the supported formats come from one place; adding a format is one entry. Cons: more structure than two formats need, and the ticket's non-goals rule out more formats (YAGNI).
- Risk / effort: low / small-to-medium (~35 lines + tests).

### Option C — new module `src/csv.js` (generic RFC 4180 writer) + thin wiring

- Approach: a dependency-free `toCsv(rows)` that knows only quoting/CRLF/BOM, reused by `report.js` for the invoice mapping; `main` wiring as in A or B.
- Pros: the escaping logic is isolated and testable on its own; reusable if `summary` ever needs CSV. Cons: an extra file/abstraction for one caller; `summary` export is a non-goal.
- Risk / effort: low / small-to-medium.

Leaning (not a decision): A, optionally with B's single-source format list; C only if reuse is expected.

## Notes

Constraints and gotchas that shape the choice:

- **Error path for criterion 5 / D-context:** unknown `--format` must exit 1 with `table, csv` on `err`. Validate before rendering, and decide whether it applies only to `list` (the ticket scopes `--format` to `list`) or also to `summary`, which would silently ignore it today (`cli.js:35-38`). The same silent-ignore applies to any unknown `--key` already.
- **`--format` with no value:** `parseArgs` gives `undefined` (`cli.js:15`), which would fall to the default `table` unless handled; the pair-stepping loop also means `--format` as the last arg yields `format: undefined`, not an error. Worth a test and a decision.
- **Validation order:** `loadInvoices()` runs before the command check (`cli.js:30`), so the format check should come before or independent of it, to avoid reading the file for a bad flag.
- **BOM and CRLF with `out.write`:** `cli.js:32` appends `\n`; the CSV path must not (records already end in CRLF, including the last). The BOM is a `﻿` char at the start of the string; `process.stdout` writes it as UTF-8 `EF BB BF`. Tests with `sink()` see the `﻿` char, not bytes.
- **Amount unit:** CSV total has no currency symbol, and the file mixes USD and EUR (INV-1004) with no currency column in the required header, so EUR and USD totals are indistinguishable in the CSV. The ticket fixes the header; worth flagging to the developer, not solving here.
- **Spreadsheet formula injection:** a customer starting with `=`, `+`, `-`, `@` would be evaluated by Excel. Not in the criteria, and the current data has none; flag it as a possible follow-up.
- **Line breaks in a field:** INV-1006 has an embedded `\n`; quote it. Records end with CRLF, but the embedded break stays as stored (`\n`).
- Dependency-free (CLAUDE.md): `Intl`/`toFixed` and string ops suffice.
- Tests follow `node:test` with `sink()` fakes; assert on `out.text` and `err.text`. Existing `list` test counts lines (`cli.test.js:15`), so keep the default `table` output unchanged.
FIXTURE_18
mkdir -p "$(dirname '.specs/INV-42/evidence/01-20261023-231715.log')"
cat > '.specs/INV-42/evidence/01-20261023-231715.log' <<'FIXTURE_19'
# ffloww proof run
# ticket: INV-42
# target: 01
# command: node --test test/format.test.js test/report.test.js
# cwd: /work/invoice-tool
# started: 2026-10-23T23:17:15Z

TAP version 13
# Subtest: formatMoney shows the symbol, thousands separators and two decimals
ok 1 - formatMoney shows the symbol, thousands separators and two decimals
  ---
  duration_ms: 9.03025
  type: 'test'
  ...
# Subtest: plainAmount has two decimals and no symbol or separators
ok 2 - plainAmount has two decimals and no symbol or separators
  ---
  duration_ms: 0.066541
  type: 'test'
  ...
# Subtest: invoiceTable has a header and one line per invoice
ok 3 - invoiceTable has a header and one line per invoice
  ---
  duration_ms: 8.189375
  type: 'test'
  ...
# Subtest: invoiceCsv starts with the BOM and the header row
ok 4 - invoiceCsv starts with the BOM and the header row
  ---
  duration_ms: 0.390459
  type: 'test'
  ...
# Subtest: invoiceCsv ends every record, the last included, with CRLF
ok 5 - invoiceCsv ends every record, the last included, with CRLF
  ---
  duration_ms: 0.503708
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a comma
ok 6 - invoiceCsv quotes a field with a comma
  ---
  duration_ms: 0.218333
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a quote and doubles the inner quotes
ok 7 - invoiceCsv quotes a field with a quote and doubles the inner quotes
  ---
  duration_ms: 0.260917
  type: 'test'
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 8 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.1955
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 9 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.259917
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 10 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.239625
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 11 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.180458
  type: 'test'
  ...
# Subtest: summary totals each status
ok 12 - summary totals each status
  ---
  duration_ms: 0.444875
  type: 'test'
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 90.221667

# finished: 2026-10-23T23:17:15Z
# exit code: 0
FIXTURE_19
mkdir -p "$(dirname '.specs/INV-42/evidence/01-20261023-231716.log')"
cat > '.specs/INV-42/evidence/01-20261023-231716.log' <<'FIXTURE_20'
# ffloww proof run
# ticket: INV-42
# target: 01
# command: npm test
# cwd: /work/invoice-tool
# started: 2026-10-23T23:17:16Z


> invoice-tool@1.3.0 test
> node --test

TAP version 13
# Subtest: list prints the table of the filtered invoices
ok 1 - list prints the table of the filtered invoices
  ---
  duration_ms: 11.42275
  type: 'test'
  ...
# Subtest: an unknown command prints the usage and exits 1
ok 2 - an unknown command prints the usage and exits 1
  ---
  duration_ms: 0.437792
  type: 'test'
  ...
# Subtest: formatMoney shows the symbol, thousands separators and two decimals
ok 3 - formatMoney shows the symbol, thousands separators and two decimals
  ---
  duration_ms: 8.946875
  type: 'test'
  ...
# Subtest: plainAmount has two decimals and no symbol or separators
ok 4 - plainAmount has two decimals and no symbol or separators
  ---
  duration_ms: 0.07575
  type: 'test'
  ...
# Subtest: loadInvoices returns every invoice, oldest first
ok 5 - loadInvoices returns every invoice, oldest first
  ---
  duration_ms: 6.06925
  type: 'test'
  ...
# Subtest: filterInvoices keeps the status and the inclusive date range
ok 6 - filterInvoices keeps the status and the inclusive date range
  ---
  duration_ms: 0.575375
  type: 'test'
  ...
# Subtest: invoiceTable has a header and one line per invoice
ok 7 - invoiceTable has a header and one line per invoice
  ---
  duration_ms: 9.46025
  type: 'test'
  ...
# Subtest: invoiceCsv starts with the BOM and the header row
ok 8 - invoiceCsv starts with the BOM and the header row
  ---
  duration_ms: 0.476625
  type: 'test'
  ...
# Subtest: invoiceCsv ends every record, the last included, with CRLF
ok 9 - invoiceCsv ends every record, the last included, with CRLF
  ---
  duration_ms: 0.891833
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a comma
ok 10 - invoiceCsv quotes a field with a comma
  ---
  duration_ms: 0.290125
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a quote and doubles the inner quotes
ok 11 - invoiceCsv quotes a field with a quote and doubles the inner quotes
  ---
  duration_ms: 0.352083
  type: 'test'
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 12 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.2915
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 13 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.26875
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 14 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.195584
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 15 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.219083
  type: 'test'
  ...
# Subtest: summary totals each status
ok 16 - summary totals each status
  ---
  duration_ms: 0.581708
  type: 'test'
  ...
1..16
# tests 16
# suites 0
# pass 16
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 189.823833

# finished: 2026-10-23T23:17:16Z
# exit code: 0
FIXTURE_20
mkdir -p "$(dirname '.specs/INV-42/evidence/01-20261023-231828.log')"
cat > '.specs/INV-42/evidence/01-20261023-231828.log' <<'FIXTURE_21'
# ffloww proof run
# ticket: INV-42
# target: 01
# command: node --test test/format.test.js test/report.test.js
# cwd: /work/invoice-tool
# started: 2026-10-23T23:18:28Z

TAP version 13
# Subtest: formatMoney shows the symbol, thousands separators and two decimals
ok 1 - formatMoney shows the symbol, thousands separators and two decimals
  ---
  duration_ms: 10.286333
  type: 'test'
  ...
# Subtest: plainAmount has two decimals and no symbol or separators
ok 2 - plainAmount has two decimals and no symbol or separators
  ---
  duration_ms: 0.074875
  type: 'test'
  ...
# Subtest: invoiceTable has a header and one line per invoice
ok 3 - invoiceTable has a header and one line per invoice
  ---
  duration_ms: 9.736542
  type: 'test'
  ...
# Subtest: invoiceCsv starts with the BOM and the header row
ok 4 - invoiceCsv starts with the BOM and the header row
  ---
  duration_ms: 0.540375
  type: 'test'
  ...
# Subtest: invoiceCsv ends every record, the last included, with CRLF
ok 5 - invoiceCsv ends every record, the last included, with CRLF
  ---
  duration_ms: 0.4145
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a comma
ok 6 - invoiceCsv quotes a field with a comma
  ---
  duration_ms: 0.379458
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a quote and doubles the inner quotes
ok 7 - invoiceCsv quotes a field with a quote and doubles the inner quotes
  ---
  duration_ms: 0.44775
  type: 'test'
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 8 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.363708
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 9 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.403125
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 10 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.360834
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 11 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.216208
  type: 'test'
  ...
# Subtest: summary totals each status
ok 12 - summary totals each status
  ---
  duration_ms: 0.610291
  type: 'test'
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 132.1185

# finished: 2026-10-23T23:18:28Z
# exit code: 0
FIXTURE_21
mkdir -p "$(dirname '.specs/INV-42/evidence/01-20261023-231831.log')"
cat > '.specs/INV-42/evidence/01-20261023-231831.log' <<'FIXTURE_22'
# ffloww proof run
# ticket: INV-42
# target: 01
# command: npm test
# cwd: /work/invoice-tool
# started: 2026-10-23T23:18:31Z


> invoice-tool@1.3.0 test
> node --test

TAP version 13
# Subtest: list prints the table of the filtered invoices
ok 1 - list prints the table of the filtered invoices
  ---
  duration_ms: 11.506459
  type: 'test'
  ...
# Subtest: an unknown command prints the usage and exits 1
ok 2 - an unknown command prints the usage and exits 1
  ---
  duration_ms: 0.522542
  type: 'test'
  ...
# Subtest: formatMoney shows the symbol, thousands separators and two decimals
ok 3 - formatMoney shows the symbol, thousands separators and two decimals
  ---
  duration_ms: 9.936625
  type: 'test'
  ...
# Subtest: plainAmount has two decimals and no symbol or separators
ok 4 - plainAmount has two decimals and no symbol or separators
  ---
  duration_ms: 0.071
  type: 'test'
  ...
# Subtest: loadInvoices returns every invoice, oldest first
ok 5 - loadInvoices returns every invoice, oldest first
  ---
  duration_ms: 5.326291
  type: 'test'
  ...
# Subtest: filterInvoices keeps the status and the inclusive date range
ok 6 - filterInvoices keeps the status and the inclusive date range
  ---
  duration_ms: 0.579917
  type: 'test'
  ...
# Subtest: invoiceTable has a header and one line per invoice
ok 7 - invoiceTable has a header and one line per invoice
  ---
  duration_ms: 8.497958
  type: 'test'
  ...
# Subtest: invoiceCsv starts with the BOM and the header row
ok 8 - invoiceCsv starts with the BOM and the header row
  ---
  duration_ms: 0.557208
  type: 'test'
  ...
# Subtest: invoiceCsv ends every record, the last included, with CRLF
ok 9 - invoiceCsv ends every record, the last included, with CRLF
  ---
  duration_ms: 0.430875
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a comma
ok 10 - invoiceCsv quotes a field with a comma
  ---
  duration_ms: 0.388667
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a quote and doubles the inner quotes
ok 11 - invoiceCsv quotes a field with a quote and doubles the inner quotes
  ---
  duration_ms: 0.422042
  type: 'test'
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 12 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.414708
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 13 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.529458
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 14 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.370834
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 15 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.200709
  type: 'test'
  ...
# Subtest: summary totals each status
ok 16 - summary totals each status
  ---
  duration_ms: 0.62825
  type: 'test'
  ...
1..16
# tests 16
# suites 0
# pass 16
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 194.831541

# finished: 2026-10-23T23:18:32Z
# exit code: 0
FIXTURE_22
mkdir -p "$(dirname '.specs/INV-42/evidence/02-20261023-232044.log')"
cat > '.specs/INV-42/evidence/02-20261023-232044.log' <<'FIXTURE_23'
# ffloww proof run
# ticket: INV-42
# target: 02
# command: node --test test/cli.test.js
# cwd: /work/invoice-tool
# started: 2026-10-23T23:20:44Z

TAP version 13
# Subtest: list prints the table of the filtered invoices
ok 1 - list prints the table of the filtered invoices
  ---
  duration_ms: 12.677291
  type: 'test'
  ...
# Subtest: an unknown command prints the usage and exits 1
ok 2 - an unknown command prints the usage and exits 1
  ---
  duration_ms: 0.631292
  type: 'test'
  ...
# Subtest: list --format csv starts with the BOM and header and ends with a single CRLF
ok 3 - list --format csv starts with the BOM and header and ends with a single CRLF
  ---
  duration_ms: 0.722459
  type: 'test'
  ...
# Subtest: list --format csv has the same invoices as the default list
ok 4 - list --format csv has the same invoices as the default list
  ---
  duration_ms: 1.039292
  type: 'test'
  ...
# Subtest: the filters apply to the CSV
ok 5 - the filters apply to the CSV
  ---
  duration_ms: 0.522542
  type: 'test'
  ...
# Subtest: list --format table is the same as the default list
ok 6 - list --format table is the same as the default list
  ---
  duration_ms: 0.762125
  type: 'test'
  ...
# Subtest: an unknown format prints the supported ones on err and exits 1
ok 7 - an unknown format prints the supported ones on err and exits 1
  ---
  duration_ms: 0.110833
  type: 'test'
  ...
# Subtest: --format without a value is the same error
ok 8 - --format without a value is the same error
  ---
  duration_ms: 0.057667
  type: 'test'
  ...
# Subtest: summary ignores --format
ok 9 - summary ignores --format
  ---
  duration_ms: 0.516458
  type: 'test'
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 122.638833

# finished: 2026-10-23T23:20:44Z
# exit code: 0
FIXTURE_23
mkdir -p "$(dirname '.specs/INV-42/evidence/02-20261023-232047.log')"
cat > '.specs/INV-42/evidence/02-20261023-232047.log' <<'FIXTURE_24'
# ffloww proof run
# ticket: INV-42
# target: 02
# command: npm test
# cwd: /work/invoice-tool
# started: 2026-10-23T23:20:47Z


> invoice-tool@1.3.0 test
> node --test

TAP version 13
# Subtest: list prints the table of the filtered invoices
ok 1 - list prints the table of the filtered invoices
  ---
  duration_ms: 12.439416
  type: 'test'
  ...
# Subtest: an unknown command prints the usage and exits 1
ok 2 - an unknown command prints the usage and exits 1
  ---
  duration_ms: 0.6605
  type: 'test'
  ...
# Subtest: list --format csv starts with the BOM and header and ends with a single CRLF
ok 3 - list --format csv starts with the BOM and header and ends with a single CRLF
  ---
  duration_ms: 1.100666
  type: 'test'
  ...
# Subtest: list --format csv has the same invoices as the default list
ok 4 - list --format csv has the same invoices as the default list
  ---
  duration_ms: 1.496584
  type: 'test'
  ...
# Subtest: the filters apply to the CSV
ok 5 - the filters apply to the CSV
  ---
  duration_ms: 0.962708
  type: 'test'
  ...
# Subtest: list --format table is the same as the default list
ok 6 - list --format table is the same as the default list
  ---
  duration_ms: 0.918125
  type: 'test'
  ...
# Subtest: an unknown format prints the supported ones on err and exits 1
ok 7 - an unknown format prints the supported ones on err and exits 1
  ---
  duration_ms: 0.127625
  type: 'test'
  ...
# Subtest: --format without a value is the same error
ok 8 - --format without a value is the same error
  ---
  duration_ms: 0.068042
  type: 'test'
  ...
# Subtest: summary ignores --format
ok 9 - summary ignores --format
  ---
  duration_ms: 0.655291
  type: 'test'
  ...
# Subtest: formatMoney shows the symbol, thousands separators and two decimals
ok 10 - formatMoney shows the symbol, thousands separators and two decimals
  ---
  duration_ms: 9.064417
  type: 'test'
  ...
# Subtest: plainAmount has two decimals and no symbol or separators
ok 11 - plainAmount has two decimals and no symbol or separators
  ---
  duration_ms: 0.07225
  type: 'test'
  ...
# Subtest: loadInvoices returns every invoice, oldest first
ok 12 - loadInvoices returns every invoice, oldest first
  ---
  duration_ms: 5.320708
  type: 'test'
  ...
# Subtest: filterInvoices keeps the status and the inclusive date range
ok 13 - filterInvoices keeps the status and the inclusive date range
  ---
  duration_ms: 0.654333
  type: 'test'
  ...
# Subtest: invoiceTable has a header and one line per invoice
ok 14 - invoiceTable has a header and one line per invoice
  ---
  duration_ms: 8.567834
  type: 'test'
  ...
# Subtest: invoiceCsv starts with the BOM and the header row
ok 15 - invoiceCsv starts with the BOM and the header row
  ---
  duration_ms: 0.54775
  type: 'test'
  ...
# Subtest: invoiceCsv ends every record, the last included, with CRLF
ok 16 - invoiceCsv ends every record, the last included, with CRLF
  ---
  duration_ms: 0.425292
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a comma
ok 17 - invoiceCsv quotes a field with a comma
  ---
  duration_ms: 0.404792
  type: 'test'
  ...
# Subtest: invoiceCsv quotes a field with a quote and doubles the inner quotes
ok 18 - invoiceCsv quotes a field with a quote and doubles the inner quotes
  ---
  duration_ms: 0.452666
  type: 'test'
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 19 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.356833
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 20 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.4035
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 21 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.341958
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 22 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.1965
  type: 'test'
  ...
# Subtest: summary totals each status
ok 23 - summary totals each status
  ---
  duration_ms: 0.665542
  type: 'test'
  ...
1..23
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 214.278167

# finished: 2026-10-23T23:20:48Z
# exit code: 0
FIXTURE_24
mkdir -p "$(dirname '.specs/INV-42/evidence/02-20261023-232049.log')"
cat > '.specs/INV-42/evidence/02-20261023-232049.log' <<'FIXTURE_25'
# ffloww proof run
# ticket: INV-42
# target: 02
# command: node bin/invoice.js list --format csv | xxd | head -n 12; echo "exit=${PIPESTATUS[0]:-$?}"
# cwd: /work/invoice-tool
# started: 2026-10-23T23:20:49Z

00000000: efbb bf6e 756d 6265 722c 6375 7374 6f6d  ...number,custom
00000010: 6572 2c69 7373 7565 642c 7374 6174 7573  er,issued,status
00000020: 2c74 6f74 616c 0d0a 494e 562d 3130 3031  ,total..INV-1001
00000030: 2c47 6c6f 6265 782c 3230 3236 2d30 312d  ,Globex,2026-01-
00000040: 3134 2c70 6169 642c 3132 3530 2e30 300d  14,paid,1250.00.
00000050: 0a49 4e56 2d31 3030 322c 2241 434d 452c  .INV-1002,"ACME,
00000060: 2049 6e63 2e22 2c32 3032 362d 3032 2d30   Inc.",2026-02-0
00000070: 322c 7061 6964 2c39 3830 2e35 300d 0a49  2,paid,980.50..I
00000080: 4e56 2d31 3030 332c 2242 6f62 2022 2242  NV-1003,"Bob ""B
00000090: 6f62 6279 2222 204c 7464 222c 3230 3236  obby"" Ltd",2026
000000a0: 2d30 322d 3230 2c6f 7065 6e2c 3435 2e30  -02-20,open,45.0
000000b0: 300d 0a49 4e56 2d31 3030 342c 4361 66c3  0..INV-1004,Caf.
exit=0

# finished: 2026-10-23T23:20:49Z
# exit code: 0
FIXTURE_25
mkdir -p "$(dirname '.specs/INV-42/evidence/02-20261023-232053.log')"
cat > '.specs/INV-42/evidence/02-20261023-232053.log' <<'FIXTURE_26'
# ffloww proof run
# ticket: INV-42
# target: 02
# command: node bin/invoice.js list --format csv
# cwd: /work/invoice-tool
# started: 2026-10-23T23:20:53Z

﻿number,customer,issued,status,total
INV-1001,Globex,2026-01-14,paid,1250.00
INV-1002,"ACME, Inc.",2026-02-02,paid,980.50
INV-1003,"Bob ""Bobby"" Ltd",2026-02-20,open,45.00
INV-1004,Café Lumière,2026-03-05,paid,2100.75
INV-1005,Initech,2026-03-28,open,19.99
INV-1006,"Umbrella
Research Division",2026-04-11,paid,15000.00
INV-1007,Hooli,2026-05-09,open,333.33
INV-1008,Stark Industries,2026-06-30,paid,760.10

# finished: 2026-10-23T23:20:54Z
# exit code: 0
FIXTURE_26
mkdir -p "$(dirname '.specs/INV-42/evidence/02-20261023-232054.log')"
cat > '.specs/INV-42/evidence/02-20261023-232054.log' <<'FIXTURE_27'
# ffloww proof run
# ticket: INV-42
# target: 02
# command: node bin/invoice.js list --format xml; echo $?
# cwd: /work/invoice-tool
# started: 2026-10-23T23:20:54Z

unknown format "xml"; supported formats: table, csv
1

# finished: 2026-10-23T23:20:54Z
# exit code: 0
FIXTURE_27
mkdir -p "$(dirname '.specs/INV-42/evidence/02-20261023-232150.log')"
cat > '.specs/INV-42/evidence/02-20261023-232150.log' <<'FIXTURE_28'
# ffloww proof run
# ticket: INV-42
# target: 02
# command: node bin/invoice.js list --format xml 2>&1 | grep -q 'supported formats: table, csv' && ! node bin/invoice.js list --format xml 2>/dev/null
# cwd: /work/invoice-tool
# started: 2026-10-23T23:21:50Z


# finished: 2026-10-23T23:21:51Z
# exit code: 0
FIXTURE_28
mkdir -p "$(dirname '.specs/INV-42/evidence/ticket-20261023-232306-2.log')"
cat > '.specs/INV-42/evidence/ticket-20261023-232306-2.log' <<'FIXTURE_29'
# ffloww proof run
# ticket: INV-42
# target: ticket
# command: node bin/invoice.js list --format csv | tr -d '\r'; node --test test/format.test.js test/report.test.js 2>&1 | grep -E '^(not )?ok .*(plainAmount|total)'
# cwd: /work/invoice-tool
# started: 2026-10-23T23:23:06Z

﻿number,customer,issued,status,total
INV-1001,Globex,2026-01-14,paid,1250.00
INV-1002,"ACME, Inc.",2026-02-02,paid,980.50
INV-1003,"Bob ""Bobby"" Ltd",2026-02-20,open,45.00
INV-1004,Café Lumière,2026-03-05,paid,2100.75
INV-1005,Initech,2026-03-28,open,19.99
INV-1006,"Umbrella
Research Division",2026-04-11,paid,15000.00
INV-1007,Hooli,2026-05-09,open,333.33
INV-1008,Stark Industries,2026-06-30,paid,760.10
ok 2 - plainAmount has two decimals and no symbol or separators
ok 9 - invoiceCsv writes the total with no currency symbol, EUR included
ok 12 - summary totals each status

# finished: 2026-10-23T23:23:07Z
# exit code: 0
FIXTURE_29
mkdir -p "$(dirname '.specs/INV-42/evidence/ticket-20261023-232306.log')"
cat > '.specs/INV-42/evidence/ticket-20261023-232306.log' <<'FIXTURE_30'
# ffloww proof run
# ticket: INV-42
# target: ticket
# command: node bin/invoice.js list --format csv | xxd | head -5; echo; node bin/invoice.js list --format csv | tail -n +1 | wc -l; node bin/invoice.js list | wc -l; node --test test/cli.test.js 2>&1 | grep -E '^(not )?ok .*(BOM|same invoices)'
# cwd: /work/invoice-tool
# started: 2026-10-23T23:23:06Z

00000000: efbb bf6e 756d 6265 722c 6375 7374 6f6d  ...number,custom
00000010: 6572 2c69 7373 7565 642c 7374 6174 7573  er,issued,status
00000020: 2c74 6f74 616c 0d0a 494e 562d 3130 3031  ,total..INV-1001
00000030: 2c47 6c6f 6265 782c 3230 3236 2d30 312d  ,Globex,2026-01-
00000040: 3134 2c70 6169 642c 3132 3530 2e30 300d  14,paid,1250.00.

      10
      10
ok 3 - list --format csv starts with the BOM and header and ends with a single CRLF
ok 4 - list --format csv has the same invoices as the default list

# finished: 2026-10-23T23:23:06Z
# exit code: 0
FIXTURE_30
mkdir -p "$(dirname '.specs/INV-42/evidence/ticket-20261023-232307-2.log')"
cat > '.specs/INV-42/evidence/ticket-20261023-232307-2.log' <<'FIXTURE_31'
# ffloww proof run
# ticket: INV-42
# target: ticket
# command: node bin/invoice.js list --format csv --status open | tr -d '\r'; echo ---; node bin/invoice.js list --status open | wc -l; node --test test/cli.test.js 2>&1 | grep -E '^(not )?ok .*filters'
# cwd: /work/invoice-tool
# started: 2026-10-23T23:23:07Z

﻿number,customer,issued,status,total
INV-1003,"Bob ""Bobby"" Ltd",2026-02-20,open,45.00
INV-1005,Initech,2026-03-28,open,19.99
INV-1007,Hooli,2026-05-09,open,333.33
---
       4
ok 5 - the filters apply to the CSV

# finished: 2026-10-23T23:23:08Z
# exit code: 0
FIXTURE_31
mkdir -p "$(dirname '.specs/INV-42/evidence/ticket-20261023-232307.log')"
cat > '.specs/INV-42/evidence/ticket-20261023-232307.log' <<'FIXTURE_32'
# ffloww proof run
# ticket: INV-42
# target: ticket
# command: node --test test/report.test.js 2>&1 | grep -E '^(not )?ok|^# (pass|fail)'
# cwd: /work/invoice-tool
# started: 2026-10-23T23:23:07Z

ok 1 - invoiceTable has a header and one line per invoice
ok 2 - invoiceCsv starts with the BOM and the header row
ok 3 - invoiceCsv ends every record, the last included, with CRLF
ok 4 - invoiceCsv quotes a field with a comma
ok 5 - invoiceCsv quotes a field with a quote and doubles the inner quotes
ok 6 - invoiceCsv keeps an embedded line break inside the quoted field
ok 7 - invoiceCsv writes the total with no currency symbol, EUR included
ok 8 - invoiceCsv keeps non-ASCII characters as they are
ok 9 - invoiceCsv of an empty list is the BOM and the header row only
ok 10 - summary totals each status
# pass 10
# fail 0

# finished: 2026-10-23T23:23:07Z
# exit code: 0
FIXTURE_32
mkdir -p "$(dirname '.specs/INV-42/evidence/ticket-20261023-232308-2.log')"
cat > '.specs/INV-42/evidence/ticket-20261023-232308-2.log' <<'FIXTURE_33'
# ffloww proof run
# ticket: INV-42
# target: ticket
# command: npm test 2>&1 | tail -12
# cwd: /work/invoice-tool
# started: 2026-10-23T23:23:08Z

  duration_ms: 0.617625
  type: 'test'
  ...
1..23
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 217.312

# finished: 2026-10-23T23:23:09Z
# exit code: 0
FIXTURE_33
mkdir -p "$(dirname '.specs/INV-42/evidence/ticket-20261023-232308.log')"
cat > '.specs/INV-42/evidence/ticket-20261023-232308.log' <<'FIXTURE_34'
# ffloww proof run
# ticket: INV-42
# target: ticket
# command: node bin/invoice.js list --format xml; echo exit=$?
# cwd: /work/invoice-tool
# started: 2026-10-23T23:23:08Z

unknown format "xml"; supported formats: table, csv
exit=1

# finished: 2026-10-23T23:23:08Z
# exit code: 0
FIXTURE_34
mkdir -p "$(dirname '.specs/INV-42/plan.md')"
cat > '.specs/INV-42/plan.md' <<'FIXTURE_35'
# Plan — INV-42

## Approach

Option A (D1): a pure `invoiceCsv` renderer in `src/report.js` (with a plain amount helper in `src/format.js`), then `--format` wiring in `main` with a single `FORMATS` array that drives validation and the error message. Filters, already applied before dispatch, give criterion 4 for free.

## Steps

1. 01-csv-renderer — `plainAmount`, `csvField`, `invoiceCsv` with unit tests (criteria 1–3 at unit level). Executor: delegate.
2. 02-format-option — `--format` on `list`, validation and errors, usage text, CLI tests plus a real run (criteria 1, 4, 5). Executor: delegate.

## Proof strategy

`npm test` (node:test) with `main()` driven by fake streams, covering each acceptance criterion against the existing fixtures: comma (INV-1002), quote (INV-1003), embedded newline (INV-1006), EUR and non-ASCII (INV-1004). Plus one real run of `node bin/invoice.js list --format csv`, output captured as evidence in step 02.
FIXTURE_35
mkdir -p "$(dirname '.specs/INV-42/pr.md')"
cat > '.specs/INV-42/pr.md' <<'FIXTURE_36'
# INV-42: Export invoices as CSV

## Summary

Finance copies the `invoice list` table into spreadsheets by hand. This adds
`invoice list --format csv`, so they can redirect stdout to a file and open it in Excel.
The existing filters apply to it. Out of scope: other formats, writing to a file from the
tool, and any change to the default table output.

## Approach

Decision D1 (`decisions.md`), Option A:

- `invoiceCsv(invoices)` and a private `csvField` escaper in `src/report.js`, next to `invoiceTable`.
- `plainAmount(cents)` in `src/format.js`. `formatMoney` adds symbols and separators, so it can't serve the CSV.
- `src/cli.js`: one `FORMATS = ['table', 'csv']` array drives both validation and the error message.
- Output follows finance's Excel needs: UTF-8 BOM, CRLF records (the last one included), RFC 4180 quoting.
- `--format` is validated only for `list` (`summary` still ignores it), before `loadInvoices()`. `--format` with no value is the same error.

Trade-offs: a format registry (Option B) and a separate `src/csv.js` module (Option C) were
rejected as more structure than two formats and one caller need. No new dependencies.

## Acceptance criteria

Evidence is in `.specs/INV-42/verification.md` (whole-ticket run) and the step specs.

- [x] 1. `list --format csv` prints the same invoices as `list`, with header `number,customer,issued,status,total`. Real run plus the "same invoices" CLI test (`evidence/ticket-20261023-232306.log`).
- [x] 2. Two-decimal totals with no symbol or separator, dates `YYYY-MM-DD`. Real output and the `plainAmount` / EUR tests (`evidence/ticket-20261023-232306-2.log`).
- [x] 3. RFC 4180 quoting for commas, quotes and line breaks. Report tests cover the comma, quote and embedded-newline fixtures (`evidence/ticket-20261023-232307.log`).
- [x] 4. `--status`, `--from` and `--to` apply to the CSV. Real run with `--status open` plus the CLI filter test (`evidence/ticket-20261023-232307-2.log`). `--from` and `--to` are covered by unit tests only.
- [x] 5. Unknown `--format` exits 1 and lists `table, csv` on `err`. Real run printed `unknown format "xml"; supported formats: table, csv` and exited 1 (`evidence/ticket-20261023-232308.log`; the gating run is `evidence/02-20261023-232150.log`).

Full suite: `npm test` → 23 pass, 0 fail (`evidence/ticket-20261023-232308-2.log`).

## Steps

1. **CSV renderer**: `plainAmount`, `csvField`, `invoiceCsv` and their unit tests (BOM, header, CRLF, comma, quote, newline, EUR, non-ASCII, empty list). Evidence: 12/12 on the two test files and 16/16 on the suite (`evidence/01-20261023-231828.log`, `-231831.log`).
2. **`--format` option on `list`**: wiring, validation, usage text and CLI tests, including `table` equal to the default and `summary` unaffected. Evidence: `test/cli.test.js` 9/9, suite 23/23, a real CSV run with the BOM and CRLF visible in `xxd`, and the xml proof run as a pass/fail command (`evidence/02-*.log`).

## Follow-ups (out of this ticket)

- The fixed header has no currency column, so USD and EUR totals can't be told apart in the CSV.
- Spreadsheet formula injection: Excel evaluates a field starting with `=`, `+`, `-` or `@`.

## Work item

https://dev.azure.com/acme-finance/invoice-tool/_workitems/edit/42
FIXTURE_36
mkdir -p "$(dirname '.specs/INV-42/state.md')"
cat > '.specs/INV-42/state.md' <<'FIXTURE_37'
---
ticket: "INV-42"
title: "Export invoices as CSV"
created: "2026-10-23"
phase: done
design_involved: false
proof_definition: "npm test (node:test, main() with fake streams) covers each acceptance criterion with the existing fixtures; plus a real run of 'node bin/invoice.js list --format csv' captured as evidence"
current_step: null
steps:
  - { id: "01", title: "CSV renderer", status: done }
  - { id: "02", title: "--format option on list", status: done }
---

# INV-42 — Export invoices as CSV

## Where we are

Phase: **ship**. Steps: 2 of 2 done.
Next: ship it your way, then mark the phase done.

## Navigation log

- 2026-10-23 — flow initialized (phase: start)
- 2026-10-23 — start → understand
- 2026-10-23 — understand → explore
- 2026-10-23 — explore → plan
- 2026-10-23 — step 01 added: CSV renderer
- 2026-10-23 — step 02 added: --format option on list
- 2026-10-23 — plan → execute
- 2026-10-23 — step 01: todo → in-progress
- 2026-10-23 — step 01: in-progress → proven
- 2026-10-23 — step 01: proven → done
- 2026-10-23 — step 02: todo → in-progress
- 2026-10-23 — step 02: in-progress → proven
- 2026-10-23 — step 02: proven → done
- 2026-10-23 — execute → verify
- 2026-10-23 — verify: whole-ticket check approved by developer (AC 1-5)
- 2026-10-23 — verify → ship
- 2026-10-23 — ship → done
FIXTURE_37
mkdir -p "$(dirname '.specs/INV-42/steps/01-csv-renderer.md')"
cat > '.specs/INV-42/steps/01-csv-renderer.md' <<'FIXTURE_38'
# Step 01 — CSV renderer

- Status: done
- Executor: delegate
- Spec: Pure functions that turn invoices into CSV text. No CLI changes. Scope boundary: do not touch `src/cli.js`.

## Changes

- `src/format.js`: add `plainAmount(cents)` → `(cents / 100).toFixed(2)` (e.g. `123450` → `"1234.50"`); export it. Follow `formatMoney` at `src/format.js:4-8`.
- `src/report.js`: add and export `invoiceCsv(invoices)`, following `invoiceTable` at `src/report.js:6-12` (same columns, same order). Output:
  - starts with the BOM `﻿`;
  - header row `number,customer,issued,status,total`;
  - every record, the last included, ends with `\r\n`;
  - empty list gives BOM + header row only.
- `csvField(value)` (private to `report.js`): if the string contains `,`, `"`, `\r` or `\n`, wrap in double quotes and double inner quotes; otherwise return as is. Embedded line breaks stay as stored.
- Tests: `test/format.test.js` for `plainAmount` (`123450` → `1234.50`, `5` → `0.05`, `100` → `1.00`); `test/report.test.js` (pattern at `:8-17`) for `invoiceCsv`: BOM, header, CRLF endings, comma (`ACME, Inc.`), quote (`Bob "Bobby" Ltd` → `"Bob ""Bobby"" Ltd"`), embedded `\n` (INV-1006), EUR total without symbol (INV-1004), non-ASCII kept, empty list.

## Proof

- `node --test test/format.test.js test/report.test.js` → exit 0, all pass.
- `npm test` → exit 0.

## Evidence

### Run 2026-10-23T23:17:15Z

- Command: `node --test test/format.test.js test/report.test.js`
- Exit code: 0
- Duration: 0.2s
- Log: `evidence/01-20261023-231715.log` (82 lines)

Last 40 lines:

```text
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 8 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.1955
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 9 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.259917
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 10 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.239625
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 11 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.180458
  type: 'test'
  ...
# Subtest: summary totals each status
ok 12 - summary totals each status
  ---
  duration_ms: 0.444875
  type: 'test'
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 90.221667
```

### Run 2026-10-23T23:17:16Z

- Command: `npm test`
- Exit code: 0
- Duration: 0.6s
- Log: `evidence/01-20261023-231716.log` (110 lines)

Last 40 lines:

```text
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 12 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.2915
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 13 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.26875
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 14 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.195584
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 15 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.219083
  type: 'test'
  ...
# Subtest: summary totals each status
ok 16 - summary totals each status
  ---
  duration_ms: 0.581708
  type: 'test'
  ...
1..16
# tests 16
# suites 0
# pass 16
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 189.823833
```

### Run 2026-10-23T23:18:28Z

- Command: `node --test test/format.test.js test/report.test.js`
- Exit code: 0
- Duration: 0.3s
- Log: `evidence/01-20261023-231828.log` (82 lines)

Last 40 lines:

```text
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 8 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.363708
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 9 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.403125
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 10 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.360834
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 11 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.216208
  type: 'test'
  ...
# Subtest: summary totals each status
ok 12 - summary totals each status
  ---
  duration_ms: 0.610291
  type: 'test'
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 132.1185
```

### Run 2026-10-23T23:18:31Z

- Command: `npm test`
- Exit code: 0
- Duration: 0.8s
- Log: `evidence/01-20261023-231831.log` (110 lines)

Last 40 lines:

```text
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 12 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.414708
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 13 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.529458
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 14 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.370834
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 15 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.200709
  type: 'test'
  ...
# Subtest: summary totals each status
ok 16 - summary totals each status
  ---
  duration_ms: 0.62825
  type: 'test'
  ...
1..16
# tests 16
# suites 0
# pass 16
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 194.831541
```

## Gate

- Decision: approved by dev@example.com on 2026-10-23, after one change request (literal BOM replaced by the `'﻿'` escape; proof re-run, both commands exit 0).
FIXTURE_38
mkdir -p "$(dirname '.specs/INV-42/steps/02-format-option.md')"
cat > '.specs/INV-42/steps/02-format-option.md' <<'FIXTURE_39'
# Step 02 — `--format` option on `list`

- Status: done
- Executor: delegate
- Spec: Wire `invoiceCsv` into `invoice list --format csv`, with validation. Depends on step 01. Scope boundary: `summary` behaviour and the default table output must not change.

## Changes

- `src/cli.js`:
  - Add `const FORMATS = ['table', 'csv'];` near `USAGE` (`:6`) and add `[--format table|csv]` to the `USAGE` text.
  - In `main` (`:21-41`), when `command === 'list'`, validate before `loadInvoices()` (`:30`): `'format' in options` and the value (`options.format`, which is `undefined` when `--format` is the last arg, see `parseArgs` `:15`) not in `FORMATS` → write `unknown format "<value or empty>"; supported formats: ${FORMATS.join(', ')}\n` to `err` and return 1. Absent `--format` defaults to `table`.
  - `list` branch: `csv` → `out.write(invoiceCsv(invoices))` (no added `\n`); `table` → unchanged `${invoiceTable(invoices)}\n`.
  - `summary` keeps ignoring `--format`.
- `test/cli.test.js` (pattern at `:12-22`, using `sink()`): `list --format csv` output starts with BOM and header, has the same invoices as `list` (compare count); `--status open` / `--from` / `--to` apply to CSV; `--format table` equals default; `--format xml` → exit 1, `err.text` contains `table, csv`, `out.text` empty; `list --format` (no value) → same error; `summary --format xml` still exits 0. Existing tests unchanged.

## Proof

- `node --test test/cli.test.js` → exit 0.
- `npm test` → exit 0.
- Real run: `node bin/invoice.js list --format csv` (exit 0, output captured, BOM + CRLF visible via `| xxd | head`) and `node bin/invoice.js list --format xml; echo $?` (exit 1, message listing `table, csv`).

## Evidence

### Run 2026-10-23T23:20:44Z

- Command: `node --test test/cli.test.js`
- Exit code: 0
- Duration: 0.3s
- Log: `evidence/02-20261023-232044.log` (64 lines)

Last 40 lines:

```text
  ...
# Subtest: the filters apply to the CSV
ok 5 - the filters apply to the CSV
  ---
  duration_ms: 0.522542
  type: 'test'
  ...
# Subtest: list --format table is the same as the default list
ok 6 - list --format table is the same as the default list
  ---
  duration_ms: 0.762125
  type: 'test'
  ...
# Subtest: an unknown format prints the supported ones on err and exits 1
ok 7 - an unknown format prints the supported ones on err and exits 1
  ---
  duration_ms: 0.110833
  type: 'test'
  ...
# Subtest: --format without a value is the same error
ok 8 - --format without a value is the same error
  ---
  duration_ms: 0.057667
  type: 'test'
  ...
# Subtest: summary ignores --format
ok 9 - summary ignores --format
  ---
  duration_ms: 0.516458
  type: 'test'
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 122.638833
```

### Run 2026-10-23T23:20:47Z

- Command: `npm test`
- Exit code: 0
- Duration: 0.9s
- Log: `evidence/02-20261023-232047.log` (152 lines)

Last 40 lines:

```text
  ...
# Subtest: invoiceCsv keeps an embedded line break inside the quoted field
ok 19 - invoiceCsv keeps an embedded line break inside the quoted field
  ---
  duration_ms: 0.356833
  type: 'test'
  ...
# Subtest: invoiceCsv writes the total with no currency symbol, EUR included
ok 20 - invoiceCsv writes the total with no currency symbol, EUR included
  ---
  duration_ms: 0.4035
  type: 'test'
  ...
# Subtest: invoiceCsv keeps non-ASCII characters as they are
ok 21 - invoiceCsv keeps non-ASCII characters as they are
  ---
  duration_ms: 0.341958
  type: 'test'
  ...
# Subtest: invoiceCsv of an empty list is the BOM and the header row only
ok 22 - invoiceCsv of an empty list is the BOM and the header row only
  ---
  duration_ms: 0.1965
  type: 'test'
  ...
# Subtest: summary totals each status
ok 23 - summary totals each status
  ---
  duration_ms: 0.665542
  type: 'test'
  ...
1..23
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 214.278167
```

### Run 2026-10-23T23:20:49Z

- Command: `node bin/invoice.js list --format csv | xxd | head -n 12; echo "exit=${PIPESTATUS[0]:-$?}"`
- Exit code: 0
- Duration: 0.3s
- Log: `evidence/02-20261023-232049.log` (13 lines)

Output:

```text
00000000: efbb bf6e 756d 6265 722c 6375 7374 6f6d  ...number,custom
00000010: 6572 2c69 7373 7565 642c 7374 6174 7573  er,issued,status
00000020: 2c74 6f74 616c 0d0a 494e 562d 3130 3031  ,total..INV-1001
00000030: 2c47 6c6f 6265 782c 3230 3236 2d30 312d  ,Globex,2026-01-
00000040: 3134 2c70 6169 642c 3132 3530 2e30 300d  14,paid,1250.00.
00000050: 0a49 4e56 2d31 3030 322c 2241 434d 452c  .INV-1002,"ACME,
00000060: 2049 6e63 2e22 2c32 3032 362d 3032 2d30   Inc.",2026-02-0
00000070: 322c 7061 6964 2c39 3830 2e35 300d 0a49  2,paid,980.50..I
00000080: 4e56 2d31 3030 332c 2242 6f62 2022 2242  NV-1003,"Bob ""B
00000090: 6f62 6279 2222 204c 7464 222c 3230 3236  obby"" Ltd",2026
000000a0: 2d30 322d 3230 2c6f 7065 6e2c 3435 2e30  -02-20,open,45.0
000000b0: 300d 0a49 4e56 2d31 3030 342c 4361 66c3  0..INV-1004,Caf.
exit=0
```

### Run 2026-10-23T23:20:53Z

- Command: `node bin/invoice.js list --format csv`
- Exit code: 0
- Duration: 0.3s
- Log: `evidence/02-20261023-232053.log` (10 lines)

Output:

```text
﻿number,customer,issued,status,total
INV-1001,Globex,2026-01-14,paid,1250.00
INV-1002,"ACME, Inc.",2026-02-02,paid,980.50
INV-1003,"Bob ""Bobby"" Ltd",2026-02-20,open,45.00
INV-1004,Café Lumière,2026-03-05,paid,2100.75
INV-1005,Initech,2026-03-28,open,19.99
INV-1006,"Umbrella
Research Division",2026-04-11,paid,15000.00
INV-1007,Hooli,2026-05-09,open,333.33
INV-1008,Stark Industries,2026-06-30,paid,760.10
```

### Run 2026-10-23T23:20:54Z

- Command: `node bin/invoice.js list --format xml; echo $?`
- Exit code: 0
- Duration: 0.2s
- Log: `evidence/02-20261023-232054.log` (2 lines)

Output:

```text
unknown format "xml"; supported formats: table, csv
1
```

### Run 2026-10-23T23:21:50Z

- Command: `node bin/invoice.js list --format xml 2>&1 | grep -q 'supported formats: table, csv' && ! node bin/invoice.js list --format xml 2>/dev/null`
- Exit code: 0
- Duration: 0.2s
- Log: `evidence/02-20261023-232150.log` (0 lines)

No output.

## Gate

- 2026-10-23 — dev@example.com: changes requested — the xml proof's exit code must be the verdict (re-run as a command that exits 0 only when the CLI exits 1 with the message). Done in the run of 23:21:50Z.
- 2026-10-23 — dev@example.com: approved.
FIXTURE_39
mkdir -p "$(dirname '.specs/INV-42/steps/_TEMPLATE.md')"
cat > '.specs/INV-42/steps/_TEMPLATE.md' <<'FIXTURE_40'
# Step <n> — <title>

- Status: todo <!-- todo | in-progress | proven | done -->
- Executor: <!-- delegate (subagent on Sonnet) | delegate-light (subagent on Haiku, mechanical steps) | inline (main session); set by /flow:plan -->
- Spec: <!-- what this step delivers; its scope boundary -->

## Changes

<!-- Files/areas to touch, and the existing code to follow (file:line). Keep the step small. -->

## Proof

<!-- The project-defined proof for THIS step: the exact commands, test names, expected output. -->

## Evidence

<!-- RAW entries recorded by the proof runner (command + exit code + last lines + log
     under evidence/), or a screenshot path. Numbers, not opinions. The human reviews
     this before the gate. -->

## Gate

<!-- Human decision: approved / changes requested / regress. Who + when. -->
FIXTURE_40
mkdir -p "$(dirname '.specs/INV-42/understanding.md')"
cat > '.specs/INV-42/understanding.md' <<'FIXTURE_41'
# Understanding — INV-42

> Source of truth for *what* must be built and *why*. Filled in the `understand`
> phase (and `design`, if applicable). Keep it factual; link evidence.

## Ticket

- ID: INV-42
- Title: Export invoices as CSV (User Story)
- Link: https://dev.azure.com/acme-finance/invoice-tool/_workitems/edit/42
- Source: work item text pasted by the developer (the azure-devops MCP was unavailable)

## Problem

Finance pulls invoice lists into spreadsheets by copying the table output by hand. The
CLI needs a CSV export so they can redirect it to a file and open it in Excel.

- In scope: a `--format csv` option on `invoice list`, applying the existing filters.
- Non-goals (inferred, to confirm): other formats (JSON, etc.), writing to a file from
  the tool itself (finance redirects stdout), changes to the default table output.

## Acceptance criteria

From the work item:

- [ ] 1. `invoice list --format csv` prints the same invoices `invoice list` would, as CSV, with a header row: `number,customer,issued,status,total`.
- [ ] 2. Totals use two decimals and no currency symbol or thousands separator (e.g. `1234.50`); dates are `YYYY-MM-DD`.
- [ ] 3. Values containing commas, double quotes or line breaks are quoted per RFC 4180, with inner quotes doubled.
- [ ] 4. The existing filters (`--status`, `--from`, `--to`) apply to the CSV output too.
- [ ] 5. An unknown `--format` value exits with code 1 and a message listing the supported formats.

Project constraint (CLAUDE.md): dependency-free, no npm packages.

## Design

No design involved. It's a CLI.

## Decisions from the developer (not in the ticket)

Confirmed 2026-10-23; they refine the criteria above:

- The CSV output starts with a UTF-8 BOM (finance opens it in Excel).
- Records end in CRLF, per RFC 4180.
- `table` is a supported `--format` value and stays the default; the unknown-format
  message (criterion 5) lists `table, csv`.
- The unknown-format message goes to `err`.
- Non-goals confirmed: no other formats, no writing to a file from the tool, no change to
  the default table output.

## Open questions

- Is the stored `total` already a number with a known unit (e.g. cents vs. decimal)?
  To check in `/flow:explore`, not here.
FIXTURE_41
mkdir -p "$(dirname '.specs/INV-42/verification.md')"
cat > '.specs/INV-42/verification.md' <<'FIXTURE_42'
# Verification — INV-42

> Whole-ticket check against the acceptance criteria (/flow:verify). One evidence
> entry per acceptance criterion, recorded by the proof runner; the human decision
> goes in Gate.

## Evidence

### Run 2026-10-23T23:23:06Z — AC 1: list --format csv prints the same invoices as list, with header number,customer,issued,status,total

- Command: `node bin/invoice.js list --format csv | xxd | head -5; echo; node bin/invoice.js list --format csv | tail -n +1 | wc -l; node bin/invoice.js list | wc -l; node --test test/cli.test.js 2>&1 | grep -E '^(not )?ok .*(BOM|same invoices)'`
- Exit code: 0
- Duration: 0.5s
- Log: `evidence/ticket-20261023-232306.log` (10 lines)

Output:

```text
00000000: efbb bf6e 756d 6265 722c 6375 7374 6f6d  ...number,custom
00000010: 6572 2c69 7373 7565 642c 7374 6174 7573  er,issued,status
00000020: 2c74 6f74 616c 0d0a 494e 562d 3130 3031  ,total..INV-1001
00000030: 2c47 6c6f 6265 782c 3230 3236 2d30 312d  ,Globex,2026-01-
00000040: 3134 2c70 6169 642c 3132 3530 2e30 300d  14,paid,1250.00.

      10
      10
ok 3 - list --format csv starts with the BOM and header and ends with a single CRLF
ok 4 - list --format csv has the same invoices as the default list
```

### Run 2026-10-23T23:23:06Z — AC 2: totals two decimals no symbol/separator; dates YYYY-MM-DD

- Command: `node bin/invoice.js list --format csv | tr -d '\r'; node --test test/format.test.js test/report.test.js 2>&1 | grep -E '^(not )?ok .*(plainAmount|total)'`
- Exit code: 0
- Duration: 0.3s
- Log: `evidence/ticket-20261023-232306-2.log` (13 lines)

Output:

```text
﻿number,customer,issued,status,total
INV-1001,Globex,2026-01-14,paid,1250.00
INV-1002,"ACME, Inc.",2026-02-02,paid,980.50
INV-1003,"Bob ""Bobby"" Ltd",2026-02-20,open,45.00
INV-1004,Café Lumière,2026-03-05,paid,2100.75
INV-1005,Initech,2026-03-28,open,19.99
INV-1006,"Umbrella
Research Division",2026-04-11,paid,15000.00
INV-1007,Hooli,2026-05-09,open,333.33
INV-1008,Stark Industries,2026-06-30,paid,760.10
ok 2 - plainAmount has two decimals and no symbol or separators
ok 9 - invoiceCsv writes the total with no currency symbol, EUR included
ok 12 - summary totals each status
```

### Run 2026-10-23T23:23:07Z — AC 3: RFC 4180 quoting (comma, quote, line break)

- Command: `node --test test/report.test.js 2>&1 | grep -E '^(not )?ok|^# (pass|fail)'`
- Exit code: 0
- Duration: 0.2s
- Log: `evidence/ticket-20261023-232307.log` (12 lines)

Output:

```text
ok 1 - invoiceTable has a header and one line per invoice
ok 2 - invoiceCsv starts with the BOM and the header row
ok 3 - invoiceCsv ends every record, the last included, with CRLF
ok 4 - invoiceCsv quotes a field with a comma
ok 5 - invoiceCsv quotes a field with a quote and doubles the inner quotes
ok 6 - invoiceCsv keeps an embedded line break inside the quoted field
ok 7 - invoiceCsv writes the total with no currency symbol, EUR included
ok 8 - invoiceCsv keeps non-ASCII characters as they are
ok 9 - invoiceCsv of an empty list is the BOM and the header row only
ok 10 - summary totals each status
# pass 10
# fail 0
```

### Run 2026-10-23T23:23:07Z — AC 4: --status/--from/--to apply to CSV

- Command: `node bin/invoice.js list --format csv --status open | tr -d '\r'; echo ---; node bin/invoice.js list --status open | wc -l; node --test test/cli.test.js 2>&1 | grep -E '^(not )?ok .*filters'`
- Exit code: 0
- Duration: 0.7s
- Log: `evidence/ticket-20261023-232307-2.log` (7 lines)

Output:

```text
﻿number,customer,issued,status,total
INV-1003,"Bob ""Bobby"" Ltd",2026-02-20,open,45.00
INV-1005,Initech,2026-03-28,open,19.99
INV-1007,Hooli,2026-05-09,open,333.33
---
       4
ok 5 - the filters apply to the CSV
```

### Run 2026-10-23T23:23:08Z — AC 5: unknown --format exits 1 listing supported formats

- Command: `node bin/invoice.js list --format xml; echo exit=$?`
- Exit code: 0
- Duration: 0.2s
- Log: `evidence/ticket-20261023-232308.log` (2 lines)

Output:

```text
unknown format "xml"; supported formats: table, csv
exit=1
```

### Run 2026-10-23T23:23:08Z — Full suite

- Command: `npm test 2>&1 | tail -12`
- Exit code: 0
- Duration: 1.0s
- Log: `evidence/ticket-20261023-232308-2.log` (12 lines)

Output:

```text
  duration_ms: 0.617625
  type: 'test'
  ...
1..23
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 217.312
```

## Gate

- Decision: **approved** (AC 1–5 and the full suite, 23 pass / 0 fail)
- By: dev@example.com (Rehearsal Dev)
- When: 2026-10-23
- Notes: `--from`/`--to` are covered by unit tests only; the real run exercised `--status`. Several proofs pipe into grep/tail/wc, so their recorded exit code is the pipeline's; the printed output is the evidence.
FIXTURE_42
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "invoice-tool with INV-42 shipped"
