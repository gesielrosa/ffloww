---
type: regex
weight: 2
target: { source: file, path: .specs/PRF-1/plan.md }
pattern: '## Criteria and proof[\s\S]*\n\|\s*1\s*\|[^\n]*\|\s*(runtime|test|construction|manual|gap)\s*\|[^\n]*\n\|\s*2\s*\|[^\n]*\n\|\s*3\s*\|[^\n]*\|'
---

The plan's criteria table has a row for each of the three acceptance criteria, with the level of its proof.
