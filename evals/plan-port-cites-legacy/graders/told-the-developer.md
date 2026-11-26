---
type: llm
weight: 4
---

PORT-1 ports `matchPen` to a new module with the same behavior. The legacy code upper-cases the colour only when it comes from the plugin (`fromPlugin`), matches a typed code as it is, and never trims. The developer asked the new module to upper-case the colour and trim it before looking it up.

PASS if the final reply tells the developer that trimming is not something the legacy does, and that upper-casing every colour differs from the legacy (which upper-cases only plugin colours), says this breaks the parity the ticket asks for, and leaves it to the developer to accept or drop: either by asking before the steps are written, or by listing both as new behavior in the plan it presents for approval.
FAIL if the reply presents upper-casing and trimming as a plain port of the legacy, or plans them with nothing for the developer to decide.
