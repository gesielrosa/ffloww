---
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Agent]
---

Step 01 of TEST-3 is built and its proof passes; before its gate, review its change with the flow's reviewer. Call the Agent tool with subagent_type `flow:diff-reviewer`, passing ticket TEST-3, step 01, and the project root (the current directory). Report its findings by axis as it gives them, and change nothing.
