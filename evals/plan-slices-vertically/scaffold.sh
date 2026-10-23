#!/usr/bin/env bash
# The invoice-tool fixture (a zero-dependency Node CLI) with INV-42 explored: understanding,
# context and three options in discoveries.md. Generated from the rehearsal project.
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
mkdir -p "$(dirname '.specs/INV-42/state.md')"
cat > '.specs/INV-42/state.md' <<'FIXTURE_15'
---
ticket: "INV-42"
title: "Export invoices as CSV"
created: "2026-10-23"
phase: explore
design_involved: false
proof_definition: ""
current_step: null
steps: []
---

# INV-42 — Export invoices as CSV

## Where we are

Phase: **explore**.
Next: run `/flow:plan INV-42` to pick an approach and slice it into steps.

## Navigation log

- 2026-10-23 — flow initialized (phase: start)
- 2026-10-23 — start → understand
- 2026-10-23 — understand → explore
FIXTURE_15
mkdir -p "$(dirname '.specs/INV-42/understanding.md')"
cat > '.specs/INV-42/understanding.md' <<'FIXTURE_16'
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
FIXTURE_16
mkdir -p "$(dirname '.specs/INV-42/context.md')"
cat > '.specs/INV-42/context.md' <<'FIXTURE_17'
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
mkdir -p "$(dirname '.specs/INV-42/decisions.md')"
cat > '.specs/INV-42/decisions.md' <<'FIXTURE_19'
# Decisions — INV-42

> ADR log. One entry per decision. Append-only.
FIXTURE_19
mkdir -p "$(dirname '.specs/INV-42/plan.md')"
cat > '.specs/INV-42/plan.md' <<'FIXTURE_20'
# Plan — INV-42

## Approach

## Steps

## Proof strategy
FIXTURE_20
mkdir -p "$(dirname '.specs/INV-42/steps/_TEMPLATE.md')"
cat > '.specs/INV-42/steps/_TEMPLATE.md' <<'FIXTURE_21'
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
FIXTURE_21
git add -A
git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "invoice-tool 1.3.0 with INV-42 explored"
