---
type: regex
weight: 2
target: { source: file, path: .specs/TEST-5/state.md }
pattern: 'id: "01", title: "[^"]*", status: proven[^\n]*\n\s+- \{ id: "02", title: "[^"]*", status: in-progress, base: "[0-9a-f]{40}"'
---

Step 01 stays proven and uncommitted while step 02 is built, and step 02 was snapshotted when it started.
