---
name: status
description: >
  Report where a ffloww ticket stands (phase, steps, proof, recent navigation) and the next
  /flow command. Use when the developer asks about a ticket's progress or what comes next.
  Read-only.
---

# /flow:status

The compass of the flow: where a ticket stands, and the next command. Read-only: it runs
only the state script's `show`.

## Steps

1. **Find the ticket**: the one the developer names; otherwise the only ticket folder
   under `.specs/`, or list them and ask which.

2. **Read the state** with the state script, from the project root:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> show
   ```

3. **Report concisely**: the phase, step progress (e.g. 2 of 5 done, which one is in
   progress), the proof defined, and the last couple of navigation entries.

4. **Name the next command** from the `Next:` line; the developer runs it.
