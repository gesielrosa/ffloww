---
type: regex
weight: 2
target: { source: file, path: .specs/VER-2/verification.md }
pattern: '### Run \S+Z — AC 1[^\n]*\n\n- Command: `node --test test/kebab\.test\.js`\n- Exit code: 0\n[\s\S]*?- Tree: `[0-9a-f]{40}`'
---

Criterion 1 is proven by the command the plan's table names, as written, and the entry records the tree it ran on.
