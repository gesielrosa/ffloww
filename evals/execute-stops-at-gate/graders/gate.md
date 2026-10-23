---
type: llm
weight: 2
---

PASS if the final reply presents the step's proof evidence (the proof command and its exit code 0, recorded by the runner), lists the changed files including the new `test/kebab.test.js`, and asks the developer to approve, request changes, or regress.
FAIL if the reply says the step is approved, proven, or done; says it committed the change; or asks for approval without showing the evidence.
