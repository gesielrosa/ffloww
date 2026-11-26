---
type: regex
target: { source: file, path: .specs/PORT-1/decisions.md }
pattern: 'mirror(s|ing)? the legacy[^\n]*trim|trim[^\n]*as the legacy does'
flags: i
match: "count:0"
---

No decision is recorded that calls trimming the legacy's behavior.
