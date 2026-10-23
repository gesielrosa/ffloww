---
type: regex
target: { source: file, path: .specs/TEST-1/state.md }
pattern: 'status: in-progress \}'
match: "count:1"
---

Status is read-only, so step 02 is still the one in progress.
