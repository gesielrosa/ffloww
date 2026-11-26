---
type: regex
target: { source: file, path: .specs/TEST-4/state.md }
pattern: 'id: "01", title: "[^"]*", status: in-progress, base: "[0-9a-f]{40}"'
---

The step was snapshotted when it started, and only the developer's approval moves it to proven.
