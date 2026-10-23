---
type: regex
target: { source: file, path: src/invoices.js }
pattern: 'inv\.issued < to\)'
---

Exploring finds the cause; the fix belongs to /flow:execute, so the bug is still in the code.
