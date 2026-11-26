---
type: llm
weight: 2
---

The working tree holds two steps' uncommitted work: step 01 (toKebab, `test/kebab.test.js`), already approved, and step 02 (toDot, `test/dot.test.js`), built in this run.
PASS if the final reply presents step 02's proof evidence (the proof command and its exit code 0), lists step 02's changed files (`src/case.js` and the new `test/dot.test.js`), and asks the developer to approve, request changes, or regress.
FAIL if the reply lists `test/kebab.test.js` among the files step 02 changed; asks the developer to commit step 01 before step 02 could be built; says step 02 is approved, proven, or done; or says it committed anything.
