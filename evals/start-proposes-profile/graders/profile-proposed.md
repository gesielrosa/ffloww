---
type: llm
weight: 4
---

The project has `npm test` (`node --test`) and `npm run lint` (`node tools/lint.js`) as scripts, a pull-request template at `.github/pull_request_template.md`, a remote whose default branch is `origin/main`, and commit subjects in the conventional style (`feat(scope): … (LBL-3)`, `fix(…): …`). Its project profile, `.specs/PROJECT.md`, was just created empty.

PASS if the final reply proposes values for the profile taken from the repository: the test command and the lint command, `origin/main` as the base branch, the pull-request template as the PR format, and the commit message convention; asks the developer whether they commit after each step or once at the end of the ticket; and leaves all of it for the developer to confirm or correct.
FAIL if the reply proposes nothing for the profile, misses three or more of those items, or says the values were already written into the profile.
