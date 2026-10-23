#!/usr/bin/env node
'use strict';

/**
 * init_spec.js — Scaffold a ticket's .specs/ folder for the ffloww dev flow.
 *
 * Creates, inside the TARGET project:
 *   .specs/CONVENTIONS.md              (shared contract; written once, never clobbered)
 *   .specs/<ticket-id>/state.md        (single source of truth for this ticket)
 *   .specs/<ticket-id>/understanding.md
 *   .specs/<ticket-id>/discoveries.md
 *   .specs/<ticket-id>/decisions.md
 *   .specs/<ticket-id>/plan.md
 *   .specs/<ticket-id>/steps/_TEMPLATE.md
 *   .specs/<ticket-id>/assets/.gitkeep
 *
 * Usage:
 *   node init_spec.js <ticket-id> [--root <dir>] [--title <text>]
 *
 * Examples:
 *   node init_spec.js AB-1234
 *   node init_spec.js AB-1234 --root /path/to/project --title "Add export button"
 *
 * Idempotent: re-running for an existing ticket is a no-op (it will not overwrite
 * work). CONVENTIONS.md is created only if missing.
 */

const fs = require('node:fs');
const path = require('node:path');

/** Replace {key} placeholders in a template string. */
function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : `{${key}}`));
}

/** Today's date as YYYY-MM-DD. */
function today() {
    return new Date().toISOString().slice(0, 10);
}

const CONVENTIONS_TEMPLATE = `# .specs — ffloww flow conventions

Shared contract for the ffloww development flow. Every \`/flow:*\` skill reads this
file, the ticket's \`state.md\`, and the ticket's \`context.md\` before acting. Written
once per project; safe to edit to fit local conventions. Generated {date}.

## What .specs/ is

\`.specs/<ticket-id>/\` is the durable, auditable record of one piece of work — the
flow's memory. It survives across sessions and context resets. **State lives on
disk here, never only in the assistant's context.**

Per ticket:

- \`state.md\` — single source of truth: current phase, step statuses, navigation log
- \`understanding.md\` — problem, scope, acceptance criteria (+ design notes)
- \`context.md\` — extra context the developer provides (not in the ticket, design, or code)
- \`discoveries.md\` — exploration findings and the options considered
- \`decisions.md\` — ADR log: chosen approach, trade-offs, regression reasons
- \`plan.md\` — the step breakdown
- \`steps/NN-<slug>.md\` — one spec per step (copy from \`steps/_TEMPLATE.md\`); its
  \`Executor\` line says who builds it: \`delegate\` (a subagent on a cheaper model) or
  \`inline\` (the main session)
- \`verification.md\` — whole-ticket check, one evidence entry per acceptance criterion
- \`evidence/\` — full proof logs, written by the proof runner
- \`assets/\` — Figma exports, screenshots, images used as reference

## The flow

| Phase | Skill | Produces |
| --- | --- | --- |
| start | \`/flow:start\` | this scaffold |
| understand | \`/flow:understand\` | \`understanding.md\` (+ acceptance criteria) |
| design *(if any)* | \`/flow:design\` | \`assets/\` + design notes |
| explore | \`/flow:explore\` | \`discoveries.md\` (options) |
| plan | \`/flow:plan\` | \`decisions.md\` + \`steps/NN-*.md\` |
| execute | \`/flow:execute\` | code for one step + proof + commit *suggestion* |
| verify | \`/flow:verify\` | raw evidence for a step |
| ship | \`/flow:ship\` | PR/MR draft built from these specs |

Two utility skills run anytime, outside the phases: \`/flow:status\` (see where you are
and what to run next) and \`/flow:context\` (add developer context to \`context.md\`).

## state.md schema

Front matter fields:

- \`phase\`: one of \`start | understand | design | explore | plan | execute | verify | ship | done\`
- \`design_involved\`: \`unknown | true | false\`
- \`proof_definition\`: project-defined proof (usually tests); confirm with the human
- \`current_step\`: id of the step in progress, or \`null\`
- \`steps\`: list of \`{ id, title, status }\`; status is \`todo | in-progress | proven | done\`

## Navigation rules

- **The developer drives transitions.** The assistant never auto-advances a phase.
- Movement is **bidirectional**: advance, repeat the current phase, or regress.
- A regression is appended to the navigation log *and* to \`decisions.md\` with its
  reason — history is never rewritten.
- On finishing, every skill updates \`state.md\` and recommends the next move.
- Every phase reads its inputs from \`.specs/\`, so each phase (and each step) can start
  in a fresh context; skills suggest it at handoff.
- The main session talks to the developer, opens the gates, and writes \`state.md\`.
  Subagents only build or read, then report back to it.
- **Context** can be added anytime via \`/flow:context\`; the default moment is when
  \`/flow:understand\` closes, where the developer fills gaps the ticket and code do not
  cover. Every skill reads \`context.md\` at start.

## Gate protocol — "make it prove it"

- Proof is **raw evidence**, not prose: the actual command, its exit code, real test
  output, or a screenshot path — recorded by the proof runner, not retyped. Numbers,
  not opinions.
- The assistant **never marks its own work as passing.** It presents evidence; the
  human validates.
- Evidence entries and logs recorded by the runner are **immutable**: the plugin's
  guard blocks edits that remove or change them. A new result is a new run.
- Advancing past a step is a human decision, recorded in the step's \`Gate\` section.

## Principles

Give it context · explore before build (surface options) · *you* architect, *it*
types · work in small steps · don't trust it, make it prove it · own it.

## Git & PR

Commits and PR/MR creation are **suggested, never executed** by the flow. The
package does not assume your VCS host or commit conventions. \`/flow:execute\`
proposes a commit message; \`/flow:ship\` assembles a PR/MR draft from these specs and
suggests the steps to ship. You run them, your way. Reading git (\`status\`, \`diff\`,
\`log\`) is fine; nothing that writes.
`;

const STATE_TEMPLATE = `---
ticket: "{ticket}"
title: "{title}"
created: "{date}"
phase: start
design_involved: unknown
proof_definition: ""
current_step: null
steps: []
---

# {ticket} — {title}

## Where we are

Phase: **start**. Next: run \`/flow:understand\` to read the ticket and capture the
problem and acceptance criteria.

## Navigation log

- {date} — flow initialized (phase: start)
`;

const UNDERSTANDING_TEMPLATE = `# Understanding — {ticket}

> Source of truth for *what* must be built and *why*. Filled in the \`understand\`
> phase (and \`design\`, if applicable). Keep it factual; link evidence.

## Ticket

- ID: {ticket}
- Title: {title}
- Link: <!-- work item URL -->

## Problem

<!-- What is actually being asked? Scope and explicit non-goals. -->

## Acceptance criteria

<!-- The checklist the work is verified against. Pulled from the ticket; clarify gaps
     with a human. This feeds the proof strategy. -->

- [ ]

## Design

<!-- If design is involved: Figma file + node IDs for the screens/components, with
     snapshots saved under assets/. If not: state "No design involved." -->

## Open questions

<!-- Anything ambiguous to confirm with a human before planning. -->
`;

const DISCOVERIES_TEMPLATE = `# Discoveries — {ticket}

> Output of the \`explore\` phase. Diverge first: map the relevant code and surface
> *options*, not a single answer. The human picks; that choice is recorded in
> decisions.md.

## Context map

<!-- Where the relevant code lives, how it flows, what it touches. Use file:line refs. -->

## Options

### Option A — <name>

- Approach:
- Pros / Cons:
- Risk / effort:

### Option B — <name>

- Approach:
- Pros / Cons:
- Risk / effort:

## Notes

<!-- Constraints, gotchas, and prior art found in the codebase. -->
`;

const DECISIONS_TEMPLATE = `# Decisions — {ticket}

> ADR log. One entry per decision. Append-only; never rewrite history. Loop-backs
> (regressions) are recorded here too, with the reason.

## D1 — <decision title>

- Date: {date}
- Status: proposed <!-- proposed | accepted | superseded by Dn -->
- Context: <!-- what forced a choice -->
- Decision: <!-- the approach chosen -->
- Trade-offs: <!-- what we gave up; options rejected and why (link discoveries.md) -->
- Consequences: <!-- impact on the plan and steps -->
`;

const PLAN_TEMPLATE = `# Plan — {ticket}

> The step breakdown. Each step is small, independently buildable, and has its own
> spec under steps/. Execution is tracked against these in state.md.

## Approach

<!-- One-paragraph summary of the chosen approach (see decisions.md). -->

## Steps

<!-- Mirror these into state.md \`steps:\` and create steps/NN-<slug>.md (from
     steps/_TEMPLATE.md) for each. -->

1.
2.

## Proof strategy

<!-- How each step and the whole are proven. Project-defined; confirm with a human. -->
`;

// Step template keeps <n>/<title> placeholders for /flow:plan to fill per step.
const STEP_TEMPLATE = `# Step <n> — <title>

- Status: todo <!-- todo | in-progress | proven | done -->
- Executor: <!-- delegate (a subagent on a cheaper model) | inline (the main session); set by /flow:plan -->
- Spec: <!-- what this step delivers; its scope boundary -->

## Changes

<!-- Files/areas to touch, and the existing code to follow (file:line). Keep the step small. -->

## Proof

<!-- The project-defined proof for THIS step: the exact commands, test names, expected output. -->

## Evidence

<!-- RAW entries recorded by the proof runner (command + exit code + last lines + log
     under evidence/), or a screenshot path. Numbers, not opinions. The human reviews
     this before the gate. -->

## Gate

<!-- Human decision: approved / changes requested / regress. Who + when. -->
`;

const CONTEXT_TEMPLATE = `# Context — {ticket}

> Extra context the developer provides that is NOT in the ticket, the design, or the
> codebase — tacit knowledge that shapes the work. Captured at the end of
> \`/flow:understand\`, and addable anytime with \`/flow:context\`. Every skill reads this
> at start. Append-only; date new entries.

## Links

<!-- Slack threads, docs, related PRs/incidents, dashboards. -->

## Constraints

<!-- Hard limits: do not touch X, must keep Y backward-compatible, deadlines. -->

## Out-of-ticket decisions

<!-- Verbal or async decisions that are not written in the ticket. -->

## Gotchas

<!-- Known traps, flaky areas, prior failed attempts. -->

## Related work

<!-- Adjacent tickets, past changes, people who know this area. -->
`;

/** Write a file, creating parent dirs. Returns true if written, false if skipped. */
function writeFile(filePath, content, { overwrite = true } = {}) {
    if (!overwrite && fs.existsSync(filePath)) return false;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
}

/** Ensure .specs/CONVENTIONS.md exists (written once). */
function ensureConventions(specsRoot) {
    const file = path.join(specsRoot, 'CONVENTIONS.md');
    const written = writeFile(file, fill(CONVENTIONS_TEMPLATE, { date: today() }), { overwrite: false });
    console.log(written ? '[ok] Created .specs/CONVENTIONS.md' : '[skip] .specs/CONVENTIONS.md already exists (kept)');
}

/** Scaffold a ticket folder. Returns the ticket dir, or null on error/no-op. */
function initSpec(ticket, root, title) {
    const specsRoot = path.resolve(root, '.specs');
    const ticketDir = path.join(specsRoot, ticket);

    ensureConventions(specsRoot);

    if (fs.existsSync(ticketDir)) {
        console.log(`[skip] ${path.join('.specs', ticket)} already initialized — skipping (no files overwritten).`);
        return null;
    }

    const vars = { ticket, title: title || ticket, date: today() };

    writeFile(path.join(ticketDir, 'state.md'), fill(STATE_TEMPLATE, vars));
    writeFile(path.join(ticketDir, 'understanding.md'), fill(UNDERSTANDING_TEMPLATE, vars));
    writeFile(path.join(ticketDir, 'context.md'), fill(CONTEXT_TEMPLATE, vars));
    writeFile(path.join(ticketDir, 'discoveries.md'), fill(DISCOVERIES_TEMPLATE, vars));
    writeFile(path.join(ticketDir, 'decisions.md'), fill(DECISIONS_TEMPLATE, vars));
    writeFile(path.join(ticketDir, 'plan.md'), fill(PLAN_TEMPLATE, vars));
    writeFile(path.join(ticketDir, 'steps', '_TEMPLATE.md'), STEP_TEMPLATE);
    writeFile(path.join(ticketDir, 'assets', '.gitkeep'), '');

    console.log(`[ok] Scaffolded ${path.join('.specs', ticket)}/ (state.md, understanding.md, context.md, discoveries.md, decisions.md, plan.md, steps/, assets/)`);
    return ticketDir;
}

function parseArgs(argv) {
    const out = { ticket: null, root: process.cwd(), title: '' };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--root') out.root = argv[++i];
        else if (a === '--title') out.title = argv[++i];
        else if (!a.startsWith('--') && out.ticket === null) out.ticket = a;
    }
    return out;
}

function usage() {
    console.log('Usage: node init_spec.js <ticket-id> [--root <dir>] [--title <text>]');
    console.log('\nExamples:');
    console.log('  node init_spec.js AB-1234');
    console.log('  node init_spec.js AB-1234 --root /path/to/project --title "Add export button"');
}

function main() {
    const { ticket, root, title } = parseArgs(process.argv.slice(2));

    if (!ticket) {
        usage();
        process.exit(1);
    }
    if (ticket.includes('/') || ticket.includes('\\')) {
        console.log('[error] ticket id must not contain path separators.');
        process.exit(1);
    }

    console.log(`[init] Initializing .specs for ticket: ${ticket}`);
    console.log(`   Project root: ${path.resolve(root)}`);
    console.log();

    const result = initSpec(ticket, root, title);

    console.log('\nNext: run `/flow:understand` to capture the problem and acceptance criteria.');
    // Exit 0 even on no-op (re-run) — only hard errors above exit non-zero.
    process.exit(0);
}

main();
