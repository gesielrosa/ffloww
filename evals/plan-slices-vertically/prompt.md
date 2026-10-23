---
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

/flow:plan INV-42

My choices: option A, with one FORMATS array driving both validation and the error message. Proof: the node:test suite (`npm test`) plus one real run of the CLI. Validate `--format` only for `list`; `--format` with no value is the same error. The currency column and formula injection are follow-ups, not this ticket.
