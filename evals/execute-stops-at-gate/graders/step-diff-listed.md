---
type: tool_used
tool: Bash
input_match: 'TEST-2[\\"]*\s+(?:--root\s+\S+\s+)?diff\s+[\\"]*01(?![\w-])'
---

The step's change is listed from its snapshot (`state.js TEST-2 diff 01`), which holds new files
too, so the gate shows the step's own files.
