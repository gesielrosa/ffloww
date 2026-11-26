---
type: regex
weight: 3
target: { source: file, path: .specs/SHP-1/pr.md }
pattern: '^## What changed\s[\s\S]*^## Why\s[\s\S]*^## How it was tested\s[\s\S]*^## Rollback\s'
flags: m
---

The draft follows the repository's pull-request template: its four sections, in its order.
