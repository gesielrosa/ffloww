---
name: design
description: >
  Use when design is involved (design_involved is true from /flow:understand), before
  exploring, to analyze the Figma design against the ticket. Asks the developer for the
  Figma URL with the specific node ids for the screens or components in scope, then
  reads them via the bundled figma MCP — pulling design context, screenshots, and
  variables — and saves the exports plus any developer-provided images into the ticket's
  .specs assets/ folder. Records design notes in understanding.md, updates state.md, and
  hands off to /flow:explore. Trigger on "analyze the design", "here is the Figma", "check
  the design for AB-1234", or entering the design phase.
---

# /flow:design

The conditional design phase. Analyze the Figma design against the ticket and capture
what must be built visually — before exploring the code. Run it only when design is
involved (`design_involved: true` in `state.md`).

## Before you start

- `understanding.md` should be filled and `design_involved` should be `true`. If design
  involvement is unknown, run `/flow:understand` first.
- Read `.specs/CONVENTIONS.md`, the ticket's `state.md`, and `understanding.md`.

## Steps

1. **Get the design reference.** Ask the developer for the Figma URL **with the node
   ids** for the specific screens or components in scope (a node URL ends in
   `node-id=...`). Request the exact nodes, not the whole file — it keeps the read
   precise and cheap. Also collect any images the developer attached as reference, and
   have them dropped into `.specs/<ticket-id>/assets/`.

2. **Read the design — in the `flow:design-reader` agent.** Dispatch it with the ticket
   id, the project root, the Figma node URLs, and the paths of the developer's images in
   `assets/`. It reads node by node, saves screenshots and exports to `assets/`, and
   writes the **Design** section of `understanding.md` — the large design payloads stay
   in its context, not this one. If it stops with a question (a node it cannot read, a
   conflict with the ticket, a missing screen or state), take it to the developer; never
   answer in their place.

   If the agent is not available, do it inline: read each node with the bundled
   **figma** MCP (e.g. `get_design_context`, `get_screenshot`, `get_metadata`,
   `get_variable_defs`, `download_assets`); save the screenshots, exports, and
   developer images into `assets/`; and fill the **Design** section of
   `understanding.md` — the Figma file and node ids, the screens/components in scope,
   states and behavior, the tokens/spacing/variants that matter, and links to the saved
   assets, each tied to the acceptance criterion it serves.

3. **Check the notes against the design.** Read the Design section and open the saved
   screenshots you need to discuss it with the developer. A note that a screenshot
   contradicts goes back to the same agent, which keeps its context.

4. **Update state.** Set `phase: design` in `state.md` (keep `design_involved: true`)
   and append a navigation-log entry.

## Handoff

Summarize what the design requires back to the developer, then recommend `/flow:explore`
(now with the design constraints in hand). Wait for the go-ahead; do not auto-advance.
The design notes and assets are on disk, so suggest starting the next phase in a fresh
context (`/clear` in Claude Code) — the large design payloads do not need to follow it.

## Guardrails

- Do not write code or build UI here — this phase only captures the design.
- Pull only the nodes in scope; do not dump the whole Figma file.
- Persist design artifacts to `assets/` and notes to `understanding.md`, not only chat.
- Never run `git`.
