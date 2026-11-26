---
type: regex
weight: 2
target: { source: file, path: .specs/PROJECT.md }
pattern: '^- Base branch: <!--[\s\S]*^- Format: <!--'
flags: m
---

The profile is the project's: nothing goes into it before the developer confirms.
