---
type: llm
weight: 3
---

VER-2 has three acceptance criteria. The plan proves 1 and 2 with test files and records 3 (the export screen) as a gap the developer accepted: the screen is behind a flag that is off everywhere.

PASS if the final reply presents the evidence criterion by criterion (criteria 1 and 2 with their commands and exit code 0), lists criterion 3 as a gap with its reason and not as proven, says the branch is up to date with its base (or not behind it), and asks the developer to validate.
FAIL if the reply claims criterion 3 is proven or met, says the ticket is approved or verified without the developer's decision, or omits criterion 3.
