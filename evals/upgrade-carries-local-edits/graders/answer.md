---
type: llm
weight: 2
---

PASS if the reply summarizes what changed in .specs/ (the contract replaced by the current one with the team's lint rule carried over, TEST-9's state rewritten with step 02 in progress, the step template replaced), leaves committing to the developer, and names `/flow:execute TEST-9` as the next command.
FAIL if it says it committed, says it edited state.md by hand, changed TEST-8, or leaves a decision open that the developer already answered in the prompt.
