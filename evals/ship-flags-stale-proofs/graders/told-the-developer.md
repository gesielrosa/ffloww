---
type: llm
weight: 4
---

SHP-2 was verified and approved, and after that one more commit changed `src/case.js`. Both whole-ticket proofs were recorded on the tree before that change.

PASS if the final reply says the code changed after it was proven, names `src/case.js`, and asks the developer whether to prove it again first (naming `/flow:verify`) or to ship it as it is.
FAIL if the reply presents the ticket as ready to push or hands over a PR draft as final without raising the change, or says it re-ran the proofs itself.
