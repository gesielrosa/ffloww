---
name: upgrade
description: >
  Bring a project's .specs/ record, written by an earlier version of the flow, up to the installed one.
disable-model-invocation: true
argument-hint: "[answers to its decisions]"
---

# /flow:upgrade

Bring `.specs/`, written by an earlier version of the flow, up to the installed one, so
the tickets in progress resume under the current contract and scripts. The upgrade
script makes the mechanical changes; the developer settles what only they can: local
edits to carry over, and values the flow no longer knows. It changes only `.specs/`.

## Before you start

The project's `.specs/CONVENTIONS.md` may be the earlier contract this command
replaces, so this page is the guide here. The command covers the whole project; it
takes no ticket id.

## Steps

1. **Report**, from the project root; this changes nothing:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/upgrade.js" --root "<project-root>"
   ```

   Each item is `[ok]`, `[apply]` (a mechanical change), `[decide]` (the developer's),
   or `[note]` (a difference the flow works with as is). Tickets in phase `done` stay
   as they are.

2. **Present it**: the changes `--apply` makes, then each decision with your
   recommendation. When the command's argument already answers a point (an approval,
   what a step status means now, which local rules to keep), act on it without asking
   again.

3. **Apply**, once the developer agrees:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/upgrade.js" --apply --root "<project-root>"
   ```

4. **Settle each decision** with the developer:
   - **Local edits on an earlier contract.** The report names the contract the file
     started from; what differs between it and the project's file is the team's edits
     (its `{date}` placeholder stands for the date the file was written). Show each
     edit; the developer keeps it, or drops it when the current contract already covers
     it. Then write the current contract with the `--replace-conventions` command the
     report prints, and add each kept edit with Edit, where it fits in the current text.
   - **A contract the flow did not write.** The same, with the current contract as the
     only reference: carry over the rules that are the project's own, not an older
     wording of the flow's.
   - **A value the flow does not know** (a step status like `blocked`, a phase): ask
     what it means now, then map it with the state script's `normalize`, as the report
     shows (`02=in-progress`); the navigation log records the mapping.
   - **A `state.md` the script cannot read.** Rebuild it through the state script: move
     the ticket folder aside, scaffold it again (`init_spec.js <ticket-id>`), replay its
     phase and steps with `state.js` (`phase`, `add-step`, then each step one status at
     a time), and move the other files back.

   A `[note]` needs nothing. A step whose evidence was written by hand gets recorded
   evidence when the developer wants it, by re-running its proof through the runner:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/run_proof.js" <ticket-id> <step-id> --root "<project-root>" --cmd "<proof>"`.

5. **Re-run the report**: the upgrade is done when it shows no `[apply]` or
   `[decide]`.

## Handoff

Summarize what changed, file by file. When `.specs/` is tracked by git, offer a commit
message draft; committing is the developer's. Then, for each ticket in progress, name
the next command from the `Next:` line of
`node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> show --root "<project-root>"`;
the developer runs it.
