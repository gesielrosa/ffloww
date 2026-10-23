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
   `.specs/CONVENTIONS.md` current; relay any `[warn]` line it prints.

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

   Then name the next command from the `Next:` line of the state output; the developer
   runs it.
