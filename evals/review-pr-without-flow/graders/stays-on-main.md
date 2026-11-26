---
type: regex
target: { source: file, path: .git/HEAD }
pattern: 'ref: refs/heads/main'
---

The pull request is read at its own revision, so the developer's working tree stays on main.
