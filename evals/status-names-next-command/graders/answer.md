---
type: llm
weight: 2
---

PASS if the reply says TEST-1 is in the execute phase, names step 02 (Stream large exports) as the step in progress, and gives `/flow:execute` (with or without the ticket id) as the command to run next.
FAIL if the reply marks step 02 done or proven, names another phase or step as current, runs or claims to run the next phase itself, or tells the developer to edit state.md by hand.
