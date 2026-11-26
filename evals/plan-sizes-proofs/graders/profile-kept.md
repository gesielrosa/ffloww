---
type: regex
target: { source: file, path: .specs/PROJECT.md }
pattern: 'npm run test:all[^\n]*14 min[\s\S]*- Fast ends at: 60 s[\s\S]*- Policy: per-step'
---

The profile's existing lines stay as they were.
