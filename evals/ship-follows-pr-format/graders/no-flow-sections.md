---
type: regex
target: { source: file, path: .specs/SHP-1/pr.md }
pattern: '^#+ (Merge danger|Approach|Acceptance criteria)\b'
flags: m
match: "count:0"
---

The project's format decides the sections; the flow's own are not added beside them.
