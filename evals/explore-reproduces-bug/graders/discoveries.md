---
type: llm
weight: 3
focus: { source: file, path: .specs/BUG-7/discoveries.md }
---

The bug: `invoice list --to 2026-03-05` omits INV-1004, issued on 2026-03-05, because `filterInvoices` compares `inv.issued < to` instead of `<=`.

PASS if this discoveries.md records (a) a reproduction command that fails on that symptom, with its red result; (b) ranked hypotheses for the cause, the exclusive `<` comparison in `filterInvoices` among them, with which one held; and (c) fix options whose proof is the reproduction (or a regression test built from it) turning green. FAIL if it offers fix options without a reproduction, or if the reproduction does not target the reported symptom.
