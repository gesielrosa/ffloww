---
type: regex
weight: 3
target: { source: file, path: .specs/TEST-6/steps/02-every-separator.md }
pattern: '## Changes[\s\S]*Carried from step 01[^\n]*[\s\S]*## Proof'
---

The deferred finding is written into step 02's spec, under Changes, where the step that inherits it has to build it.
