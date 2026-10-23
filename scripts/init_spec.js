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

The contract every \`/flow:*\` skill follows. Each skill reads it, the ticket's
\`state.md\`, and its \`context.md\` before acting. Written once; safe to edit.
Generated {date}.

## The record

\`.specs/<ticket-id>/\` is the flow's memory: state lives on disk, never only in the
conversation, so any phase or step can start in a fresh context.

- \`state.md\` — phase, steps, navigation log; the single source of truth
- \`understanding.md\` — problem, scope, acceptance criteria, design notes
- \`context.md\` — what the developer adds beyond the ticket and the code (\`/flow:context\`)
- \`discoveries.md\` — code map and options · \`decisions.md\` — ADR log and regressions
- \`plan.md\` — the breakdown · \`steps/NN-<slug>.md\` — one spec per step
- \`verification.md\` — whole-ticket check · \`evidence/\` — proof logs · \`assets/\` — design exports

Flow: start → understand → design (if any) → explore → plan → execute ⇄ verify → ship.

## State

Change \`state.md\` only through the flow's state script (\`state.js\`: \`show\`, \`phase\`,
\`set\`, \`add-step\`, \`remove-step\`, \`step\`, \`log\`); the plugin blocks hand edits.
Phases move forward freely; moving back is a regression and needs a reason, recorded
in \`decisions.md\` too. A step moves \`todo → in-progress → proven → done\`, one at a
time.

## Roles

- The developer drives every transition; the assistant recommends and never
  auto-advances.
- The main session talks to the developer, opens the gates, and changes state.
  Subagents only build or read, then report back.
- A step's \`Executor\` line says who builds it: \`delegate\` (a subagent on Sonnet),
  \`delegate-light\` (on Haiku, for mechanical steps), or \`inline\` (the main session).

## Gates — make it prove it

- Proof is raw evidence recorded by the proof runner — command, exit code, real
  output — or a screenshot path. Numbers, not opinions.
- The assistant never marks its own work as passing; the developer decides at the
  step's \`Gate\`. Recorded evidence is immutable: a new result is a new run.

## Git & PR

Suggested, never executed: \`/flow:execute\` drafts commit messages, \`/flow:ship\` a
PR/MR draft. No VCS host or commit convention is assumed. Reading git is fine;
nothing that writes.

Principles: give it context · explore before build · you architect, it types · small
steps · make it prove it · own it.
`;

const STATE_TEMPLATE = `---
ticket: {ticketYaml}
title: {titleYaml}
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
- Executor: <!-- delegate (subagent on Sonnet) | delegate-light (subagent on Haiku, mechanical steps) | inline (main session); set by /flow:plan -->
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
    // Front-matter values are JSON strings, which YAML reads as double-quoted scalars.
    Object.assign(vars, { ticketYaml: JSON.stringify(vars.ticket), titleYaml: JSON.stringify(vars.title) });

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
