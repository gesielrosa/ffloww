---
type: regex
target: { source: file, path: src/invoices.js }
pattern: 'DEBUG'
match: not_contains
---

Probes are removed before the phase ends.
