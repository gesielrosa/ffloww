---
type: llm
weight: 3
---

The pull request seeds seven flaws: (1) the CSV header lacks the `status` column; (2) values are not quoted per RFC 4180 (e.g. `ACME, Inc.` breaks the row); (3) the function is named `proc` where the description asks for `invoiceCsv`; (4) `summary()` output changed (`[3]` instead of `(3 invoices)`), which the description does not ask for and its last criterion forbids; (5) the existing summary test was edited to fit that change; (6) a test computes its expected total the way the code does (tautological); (7) no test covers the quoted rows.

PASS if the reply names at least five of the seven and gives the findings as review comments ready to paste, each anchored at a file and line. FAIL if it names fewer than five, says it posted or submitted the comments, or presents the pull request as ready to approve.
