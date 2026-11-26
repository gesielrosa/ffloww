---
type: regex
weight: 2
target: { source: file, path: .specs/TEST-4/steps/01-add-to-title.md }
pattern: '### Run \S+Z — red: before the change[^\n]*\n\n- Command: [^\n]*title\.test\.js[^\n]*\n- Exit code: [1-9][\s\S]*### Run \S+Z\n\n- Command: [^\n]*title\.test\.js[^\n]*\n- Exit code: 0'
---

The new test was recorded failing before the code it tests (a `--red` run with a non-zero exit code), and passing after.
