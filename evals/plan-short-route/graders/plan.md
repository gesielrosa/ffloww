---
type: llm
weight: 2
focus: { source: file, path: .specs/TINY-1/plan.md }
---

TINY-1 changes the first word of the CLI's usage line from "usage:" to "Usage:" (the line lives in `src/cli.js`, and `test/cli.test.js` asserts it). PASS if this plan has one step (two at most) that makes the change and proves it with a test of the usage line, and names the acceptance criterion it proves. FAIL if it splits the change into several steps by layer or plans work beyond the ticket.
