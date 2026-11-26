---
type: llm
weight: 4
focus: { source: file, path: .specs/EXP-1/discoveries.md }
---

The project writes CSV through a vendored library, tinycsv. Its README says fields with line breaks are written as they are, not quoted. That is out of date: when the library runs, it does quote a field with a line break, because a plugin under `vendor/tinycsv/plugins/` adds that rule. Whether tinycsv handles line breaks decides between keeping it as it is and replacing or patching it.

PASS if this file states that tinycsv quotes fields with line breaks, shows where that comes from (a command that ran the library and its output, or the probe that did), and keeps "use tinycsv as it is" as a viable option.
FAIL if it says tinycsv does not quote line breaks, rules out or penalizes keeping tinycsv on the README's word, or states the behavior with no measurement shown.
