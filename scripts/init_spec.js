#!/usr/bin/env node
'use strict';

/**
 * init_spec.js — Scaffold a ticket's .specs/ folder for the ffloww dev flow.
 *
 * Creates, inside the TARGET project:
 *   .specs/CONVENTIONS.md              (shared contract; kept current until someone edits it)
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
 *   node init_spec.js --print-conventions
 *
 * Examples:
 *   node init_spec.js AB-1234
 *   node init_spec.js AB-1234 --root /path/to/project --title "Add export button"
 *
 * Idempotent: re-running for an existing ticket is a no-op (it will not overwrite
 * work). CONVENTIONS.md carries a stamp with the hash of its body: while the body still
 * matches the stamp (nobody edited it), a re-run refreshes it to this version of the
 * flow; an edited file is kept as is, with a warning when it differs from the current
 * contract (--print-conventions prints that contract).
 */

const crypto = require('node:crypto');
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

The contract the \`/flow:*\` commands follow. Each phase reads this file, the ticket's
\`state.md\`, and its \`context.md\` before acting.

## The record

\`.specs/<ticket-id>/\` is the flow's memory. Whatever shapes later work (an answer, a
decision, a constraint) goes into the ticket's files as it happens, so any phase can
start in a fresh context.

- \`state.md\` — phase, steps, navigation log; the single source of truth
- \`understanding.md\` — problem, scope, acceptance criteria, design notes
- \`context.md\` — what the developer adds beyond the ticket and the code (\`/flow:context\`)
- \`discoveries.md\` — code map and options · \`decisions.md\` — ADR log and regressions
- \`plan.md\` — the breakdown · \`steps/NN-<slug>.md\` — one spec per step
- \`verification.md\` — whole-ticket check · \`evidence/\` — proof logs · \`assets/\` — design exports

Flow: start → understand → design (if any) → explore → plan → execute ⇄ verify → ship.

## Commands and the ticket

Each phase is a command the developer types: \`/flow:<phase> <ticket-id>\`. A phase ends
by naming the next command (the \`Next:\` line the state script prints) and suggesting
\`/clear\` before it, since the next phase reads everything from disk; the developer runs
it when ready. The ticket id comes from the command's argument; without one, use the
only ticket in progress under \`.specs/\`, or ask which.

## State

\`state.md\` changes only through the flow's state script (\`state.js\`: \`show\`, \`phase\`,
\`set\`, \`add-step\`, \`remove-step\`, \`step\`, \`log\`); the plugin blocks hand edits.
Phases move forward freely; moving back is a regression and needs a reason, recorded in
\`decisions.md\` too. A step moves \`todo → in-progress → proven\` (approved at its gate)
\`→ done\` (committed), one at a time, and the next step starts once the previous one is
committed. Before the gate, a step's proof passes or fails; only the developer's
approval makes it \`proven\`.

## Roles

- The developer decides: the approach, the slicing, and whether each proof holds.
- The main session talks to the developer, opens the gates, and changes state.
  Subagents build or read, then report back; a report is a lead to check.
- A step's \`Executor\` line says who builds it: \`delegate\` (a subagent on Sonnet),
  \`delegate-light\` (on Haiku, for mechanical steps), or \`inline\` (the main session).

## Gates — make it prove it

- Proof is raw evidence recorded by the proof runner (\`run_proof.js\`): command, exit
  code, real output; or a screenshot path. Numbers, not opinions.
- A proof's exit code is its verdict: each proof command exits non-zero exactly when its
  criterion fails (\`! cmd\` when a failure is expected). The runner keeps the full
  output, so no \`| tail\` or \`; echo $?\` is needed; it notes a command chained with
  \`;\`, \`||\` or a pipe, whose exit code is its last part's, so that part carries the
  verdict.
- The developer grades the evidence at the step's \`Gate\`; the assistant presents it
  and records the decision. Recorded evidence is immutable: a new result is a new run.
- Proofs read credentials from environment variables; the runner masks the secrets it
  recognizes before recording.

## Git & PR

Read git freely (\`status\`, \`diff\`, \`log\`). Commits, branches, pushes and PRs are the
developer's: \`/flow:execute\` drafts commit messages and \`/flow:ship\` a PR/MR draft, in
the developer's conventions, for whatever VCS host they use.

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

Phase: **start**.
Next: run \`/flow:understand {ticket}\` to read the ticket and capture the problem and acceptance criteria.

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

// First line of CONVENTIONS.md: the hash of the body as it was written.
const STAMP = /^<!-- ffloww:conventions sha256:([0-9a-f]{16})\b[^\n]*-->\n/;

/** Short sha256 of a text. */
function digest(text) {
    return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/** CONVENTIONS.md as written: the stamp line, then the contract. */
function conventionsFile() {
    const note = '/flow:start keeps this file current until it is edited; an edited file is kept as is.';
    return `<!-- ffloww:conventions sha256:${digest(CONVENTIONS_TEMPLATE)} — ${note} -->\n${CONVENTIONS_TEMPLATE}`;
}

/** Write .specs/CONVENTIONS.md, or refresh it while nobody has edited it. */
function ensureConventions(specsRoot) {
    const file = path.join(specsRoot, 'CONVENTIONS.md');
    if (!fs.existsSync(file)) {
        writeFile(file, conventionsFile());
        console.log('[ok] Created .specs/CONVENTIONS.md');
        return;
    }
    const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const stamp = text.match(STAMP);
    const body = stamp ? text.slice(stamp[0].length) : text;
    if (body === CONVENTIONS_TEMPLATE) {
        console.log('[skip] .specs/CONVENTIONS.md is current');
    } else if (stamp && digest(body) === stamp[1]) {
        writeFile(file, conventionsFile());
        console.log('[ok] Updated .specs/CONVENTIONS.md to this version of the flow');
    } else {
        const why = stamp ? 'has local edits' : 'predates this version of the flow';
        console.log(`[warn] .specs/CONVENTIONS.md ${why}, so it was kept as is. The current contract: node "${__filename}" --print-conventions`);
    }
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
    const out = { ticket: null, root: process.cwd(), title: '', printConventions: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--root') out.root = argv[++i];
        else if (a === '--title') out.title = argv[++i];
        else if (a === '--print-conventions') out.printConventions = true;
        else if (!a.startsWith('--') && out.ticket === null) out.ticket = a;
    }
    return out;
}

function usage() {
    console.log('Usage: node init_spec.js <ticket-id> [--root <dir>] [--title <text>]');
    console.log('       node init_spec.js --print-conventions');
    console.log('\nExamples:');
    console.log('  node init_spec.js AB-1234');
    console.log('  node init_spec.js AB-1234 --root /path/to/project --title "Add export button"');
}

function main() {
    const { ticket, root, title, printConventions } = parseArgs(process.argv.slice(2));

    if (printConventions) {
        process.stdout.write(CONVENTIONS_TEMPLATE);
        process.exit(0);
    }
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

    initSpec(ticket, root, title);

    console.log(`\nNext: /flow:understand ${ticket} — capture the problem and acceptance criteria.`);
    // Exit 0 even on no-op (re-run) — only hard errors above exit non-zero.
    process.exit(0);
}

if (require.main === module) main();

module.exports = { CONVENTIONS_TEMPLATE, conventionsFile, digest };
