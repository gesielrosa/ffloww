---
type: regex
weight: 2
target: { source: file, path: .specs/PROJECT.md }
pattern: '## Proof commands[\s\S]*(npm test|npm run test|node --test)[\s\S]*(npm run lint|node tools/lint\.js)[\s\S]*## Commits'
---

The test and lint commands the repository shows are in the profile, for the first plan to start from.
