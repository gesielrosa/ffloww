---
type: llm
weight: 3
focus: { source: file, path: .specs/PRF-1/plan.md }
---

The project's whole test suite (`npm run test:all`) takes about 14 minutes; one test file (`node --test test/<file>`) takes under a second, and the linter (`node tools/lint.js`) a moment.

PASS if this plan proves each step with its own test file (the linter may run in every step too), and leaves the whole suite `npm run test:all` to run once for the ticket, at verify (`/flow:verify`).
FAIL if any step's proof runs the whole suite, or if the plan does not say that the whole suite waits for verify.
