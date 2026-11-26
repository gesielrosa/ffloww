---
type: llm
weight: 2
---

PASS if the final reply presents the step's proof evidence recorded by the runner, including that `test/title.test.js` failed before the change (the red run) and passes after it (exit code 0), lists the step's changed files including the new `test/title.test.js`, and asks the developer to approve, request changes, or regress.
FAIL if the reply says the step is approved, proven, or done; says it committed the change; presents the red run as a problem with the step; says a hook or guard stopped the reviewer from reading the step's diff; or asks for approval without showing the evidence.
