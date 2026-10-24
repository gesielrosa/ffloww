---
name: design
description: >
  Read the Figma nodes in scope and record what the design requires, tied to the acceptance criteria.
disable-model-invocation: true
argument-hint: "<ticket-id>"
---

# /flow:design

The conditional design phase: analyze the Figma design against the ticket and capture
what must be built visually, before exploring the code. It runs when `design_involved`
is `true`, and writes only `assets/` and the Design section of `understanding.md`.

## Before you start

Read `.specs/CONVENTIONS.md`, then the ticket's `state.md`, `context.md`, and
`understanding.md`. While design involvement is still unknown, the next command is
`/flow:understand <ticket-id>`: say so and stop.

## Steps

1. **Get the design reference.** Ask the developer for the Figma URL **with the node
   ids** of the screens or components in scope (a node URL ends in `node-id=...`); the
   exact nodes keep the read precise and cheap. Have any reference images dropped into
   `.specs/<ticket-id>/assets/`.

2. **Read the design in a subagent.** Call the Agent tool with subagent_type
   `flow:design-reader`, passing the ticket id, the project root, the Figma node URLs,
   and the paths of the developer's images in `assets/`. It reads node by node, saves
   screenshots and exports to `assets/`, and writes the **Design** section of
   `understanding.md`; the large design payloads stay in its context. A question it stops
   with (a node it cannot read, a conflict with the ticket, a missing screen or state)
   goes to the developer, and their answer goes back to the agent.

3. **Check the notes against the design.** Read the Design section and open the saved
   screenshots you need to discuss it with the developer. A note a screenshot
   contradicts goes back to the same agent, which keeps its context.

4. **Update state** through the state script, from the project root:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> phase design
   ```

## Handoff

Summarize what the design requires. Then name the next command from the `Next:` line of
the state output. When you opened screenshots in this session, suggest `/clear` before
it: images weigh on the context, and the notes and assets are on disk. Otherwise it runs
in this session.
