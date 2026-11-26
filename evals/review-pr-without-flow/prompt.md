---
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

/flow:review my teammate's pull request: feature/csv-export into main. Its description:

> Finance copies the `invoice list` table into spreadsheets by hand; the CLI should print CSV.
> Adds `invoiceCsv(invoices)` to `src/report.js` beside `invoiceTable`, and a `--format csv` branch for `list` in `src/cli.js`.
>
> - `invoice list --format csv` prints a header row `number,customer,issued,status,total` and one row per listed invoice.
> - Values containing a comma, a double quote or a line break are quoted per RFC 4180, with inner quotes doubled.
> - Without `--format`, `invoice list` and `invoice summary` print exactly what they print today.
