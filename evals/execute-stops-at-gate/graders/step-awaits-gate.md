---
type: regex
target: { source: file, path: .specs/TEST-2/state.md }
pattern: 'id: "01", title: "[^"]*", status: in-progress'
---

Only the developer's approval at the gate moves the step to proven; with no developer in the run, it stays in progress.
