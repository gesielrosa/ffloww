---
type: regex
weight: 2
target: { source: file, path: .specs/VER-2/verification.md }
pattern: '### Run \S+Z — AC 2[^\n]*\n\n- Command: `node --test test/case\.test\.js`\n- Exit code: 0\n'
---
