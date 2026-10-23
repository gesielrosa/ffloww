---
type: llm
weight: 3
focus: { source: file, path: .specs/INV-42/retro.md }
---

INV-42's record shows: (1) step 02's proof `node bin/invoice.js list --format xml; echo $?` recorded exit code 0 for an error path, and a change request at its gate had it re-run as a command whose exit code is the verdict; (2) step 01's gate asked for the literal U+FEFF character to be replaced by the `﻿` escape; (3) several proofs piped into `xxd`, `grep`, `tail` or `wc`, so their recorded exit codes belonged to the pipeline.

PASS if this retro cites the record (a step, its Gate or an Evidence entry) for at least two of (1)–(3), and proposes for each a change to the environment: an automated check, a line in the project's instructions, or a habit for writing proofs. FAIL if it proposes changes to the product code as the fix, or states things the record does not show.
