---
type: llm
weight: 2
---

PASS if the final reply hands the developer the PR draft (shown or summarized, saved as `.specs/SHP-1/pr.md`), says it follows the repository's pull-request template, and suggests the commands to push the branch and open the pull request for the developer to run.
FAIL if the reply says it pushed, opened a pull request or marked the ticket done, or presents the draft in sections of its own instead of the template's.
