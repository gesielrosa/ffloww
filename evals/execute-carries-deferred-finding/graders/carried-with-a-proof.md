---
type: llm
weight: 2
focus: { source: file, path: .specs/TEST-6/steps/02-every-separator.md }
---

A review finding from step 01 was deferred to this step: `toKebab` leaves underscores in place, so "invoice_number" comes back unchanged instead of "invoice-number".

PASS if this spec carries that finding under Changes (a line saying it comes from step 01, with what has to be handled), and its Proof section has a command or check that would show it handled (for example a test asserting that `toKebab('invoice_number')` returns `invoice-number`), in addition to the two commands it already had.
FAIL if the finding is only mentioned in passing with nothing in Proof to show it handled, or the step's existing Spec and proof commands were removed.
