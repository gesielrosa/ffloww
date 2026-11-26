---
type: llm
weight: 2
focus: { source: file, path: .specs/PRF-1/decision-summary.md }
---

This file is a note for Dana Reyes, who owns the feature and was not in the planning conversation. The decision was to add two helpers, `toKebab` and `toDot`, beside the existing `toSnake`, instead of one generic `toCase(text, separator)`, because the generic one would change `toSnake`.

PASS if someone who reads only this file learns the problem, the decision and why, the option that was not taken, and what is asked of them (their agreement, or an answer), in about a page or less.
FAIL if it needs the conversation or the other files to be understood, leaves out the option not taken, or asks nothing of its reader.
