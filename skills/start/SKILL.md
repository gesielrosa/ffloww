---
name: start
description: >
  Begin or resume a ticket: scaffold its .specs/ record and point to the next phase.
disable-model-invocation: true
argument-hint: "<ticket-id> [title]"
---

# /flow:start

Entry point of the flow: set up the ticket's durable `.specs/` record and point to the
next phase. Reading the ticket itself starts in `/flow:understand`.

## Steps

1. **Collect the ticket id** (e.g. `AB-1234`) from the command's argument, or ask for it.
   A title is optional: take it from the argument when given; otherwise the id serves as
   the title.

2. **Run the scaffolder** for the project root (the current repository root):

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/init_spec.js" <ticket-id> --root "<project-root>" --title "<title>"
   ```

   Pass `--title` only when a title was given. The script is idempotent: an existing
   ticket keeps every file and is reported as skipped. It also keeps
   `.specs/CONVENTIONS.md` current, and writes the project profile,
   `.specs/PROJECT.md`, when the project has none; relay any `[warn]` line it prints.

3. **Read the contract and the state**: `.specs/CONVENTIONS.md`, then

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> show --root "<project-root>"
   ```

4. **Orient.**
   - **New ticket**: report the ticket folder and the files created. When the current
     branch (`git branch --show-current`) is the default one (`main`, `master`, or the
     remote's), suggest a ticket branch before the first commit, as a command for the
     developer to run (e.g. `git switch -c <ticket-id>-<slug>`).
   - **Existing ticket** (skipped): this is a resume. Summarize the phase, the step
     statuses, and the last navigation entries.

5. **Offer the profile's first values**, while `.specs/PROJECT.md` is still empty: the
   scaffolder then ends with a `[profile]` block listing what it found in the
   repository. From it, and from the files it names, propose the profile in one
   message, each line with the value you recommend, so the developer can accept it in
   a word:
   - the proof commands: which script is the test, the lint and the typecheck, and how
     one test file runs alone. Durations and `Fast ends at` wait for the first plan's
     baseline;
   - the base branch, and the PR format: the template found, or the flow's own draft;
   - the commit message convention the recent subjects show;
   - the one choice that is the developer's alone: a commit per step, or one commit for
     the whole ticket at the end.

   Write what they confirm into the profile with Edit. When they choose one commit at
   the end, set `Policy: at-end` there and, for this ticket,
   `state.js <ticket-id> set commit at-end`. When they would rather fill it as tickets
   go, add a dated line under Notes saying so, which ends the offer. The offer never
   holds the flow: a developer who runs the next command instead gets it again with
   the next ticket.

6. **Name the next command** from the `Next:` line of the state output; the developer
   runs it.
