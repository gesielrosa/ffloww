---
name: flow-start
description: >
  Use when a developer begins work on a ticket, story, or bug and wants to start the
  ffloww development flow — or to resume an existing one. Collects the ticket id (and
  an optional title), scaffolds the ticket's durable per-ticket .specs record via the
  bundled init_spec.js script, writes the shared .specs/CONVENTIONS.md contract,
  orients from state.md, and recommends the next phase (flow-understand). Trigger on
  "start a ticket", "begin work on AB-1234", "kick off the flow", "start dev flow",
  or "resume AB-1234".
---

# flow-start

Entry point for the ffloww development flow. It sets up a ticket's durable `.specs/`
record and points to the first phase. It does **not** do the analysis itself.

## Do not do the work here

Do not read the ticket's contents, explore the codebase, or plan in this skill.
`flow-start` only scaffolds and orients. Understanding the ticket belongs to
`flow-understand`.

## Steps

1. **Identify the project root.** Default to the current repository root (the
   developer's project). Confirm only if ambiguous.

2. **Collect the ticket id.** Required (e.g. `AB-1234`). If the developer already
   named it in the request, use that — do not re-ask. Then ask for a short optional
   title; if none is given, the id is used as the title.

3. **Run the bundled scaffolder.** Invoke the `init_spec.js` script that ships in
   this skill's own `scripts/` directory, using its absolute path:

   ```bash
   node "<path-to-this-skill>/scripts/init_spec.js" <ticket-id> --root "<project-root>" --title "<title>"
   ```

   The script is idempotent: on an existing ticket it overwrites nothing and reports
   that it skipped. Pass `--title` only when a title was provided.

4. **Read the contract and state.** Read `<project-root>/.specs/CONVENTIONS.md` (the
   shared contract — always read it the first time you operate in a project so you
   follow its navigation and gate rules) and the ticket's
   `<project-root>/.specs/<ticket-id>/state.md`.

5. **Orient and hand off.**
   - **New ticket** — report what was created (the ticket folder and its files), then
     recommend running `flow-understand` next.
   - **Existing ticket** (the script skipped it) — treat this as a *resume*: summarize
     `state.md` (current phase, step statuses, last navigation-log entries) and
     recommend the skill for the current phase, the same way `flow-status` would.

## Handoff

Recommend the next skill; **do not auto-advance**. Per the contract, the developer
drives transitions. Offer to continue (e.g. "Run flow-understand now?") and wait for
the go-ahead. If the developer agrees, proceed to that skill; otherwise stop.

## Guardrails

- Never run `git` or create branches/PRs.
- Never overwrite existing `.specs/` content — the script enforces this; respect it.
- Keep state on disk: anything learned here that matters belongs in `state.md`, not
  only in the conversation.
