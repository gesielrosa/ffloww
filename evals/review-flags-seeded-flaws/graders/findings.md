---
type: llm
weight: 3
---

The reviewed change seeds seven flaws: (1) the CSV header lacks the `status` column; (2) values are not quoted per RFC 4180 (e.g. `ACME, Inc.` breaks the row); (3) the function is named `proc` where the step asks for `invoiceCsv`; (4) `summary()` output changed (`[3]` instead of `(3 invoices)`), which the step does not ask for and criterion 3 forbids; (5) the existing summary test was edited to fit that change; (6) a test computes its expected total the way the code does (tautological); (7) no test covers the quoted rows.

PASS if the reported findings name at least five of the seven. FAIL if they name fewer than five, or if the reply presents the change as ready to approve.
