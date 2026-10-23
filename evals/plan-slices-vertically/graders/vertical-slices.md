---
type: llm
weight: 2
focus: { source: file, path: .specs/INV-42/plan.md }
---

The ticket adds `invoice list --format csv` to a Node CLI. PASS if every step in this plan can be proven on its own through the CLI (`invoice list ...`, or `main()` driven with `list` arguments): each step is a vertical slice that a user of the command could observe. FAIL if any step only adds a function or module that no command calls yet (for example, a CSV renderer with unit tests, wired into the CLI by a later step), or if the steps are split by layer.
