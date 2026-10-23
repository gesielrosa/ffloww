---
name: help
description: >
  Use when the developer wants to understand the ffloww flow — its phases, what each
  /flow:* skill does, the principles, gates, navigation, or .specs/. Read-only; for
  "where am I", use /flow:status. Trigger on "how does the flow work", "explain
  ffloww", "what does /flow:plan do", or "help with the flow".
---

# /flow:help

Explain the ffloww development flow and answer the developer's questions about it. This
skill **teaches** — it is read-only and changes nothing.

## How to answer

- Answer in plain language, scoped to what the developer asked. Do not dump everything;
  use the reference below to give a focused, correct answer.
- If a ticket is active, you may read `.specs/CONVENTIONS.md` and the ticket's
  `state.md` to tailor the explanation to where they are — but for a pure "where am I /
  what's next" question, point them to `/flow:status`.
- When they describe a situation, recommend the **right skill** for it (see the table).
- Stay read-only: never change `state.md`, write code, scaffold, or run `git` here.

## The one-line idea

> **The AI diverges and types. The human converges and decides.**

Exploration and code are delegated to the AI; the design choice, the slicing, and the
judgment of "is this proven?" stay with the developer.

## The phases

| Phase | Skill | What it does |
|---|---|---|
| Understand | `/flow:understand` | Read the ticket; capture problem + acceptance criteria |
| Design *(if any)* | `/flow:design` | Analyze the Figma against the ticket; save to `assets/` |
| Explore | `/flow:explore` | Map the code; surface options (diverge) |
| Plan | `/flow:plan` | Decide the approach (ADR); break into small steps |
| Execute | `/flow:execute` | Build one step; prove it; human gate; suggest a commit |
| Verify | `/flow:verify` | Prove a step or the whole ticket with raw evidence |
| Ship | `/flow:ship` | Assemble a PR/MR draft from the specs (suggest, don't run) |

## The utility skills (anytime)

- `/flow:start` — begin or resume a ticket; scaffolds its `.specs/` record.
- `/flow:status` — the compass: where am I, what should I run next (read-only).
- `/flow:context` — add context the ticket and code don't carry (links, constraints,
  gotchas), anytime.
- `/flow:help` — this skill.

## The principles

- **Give it context** — ticket, design, code, and your tacit knowledge.
- **Explore before build** — ask for options, not one answer.
- **You architect, it types** — you own the design choice and trade-offs.
- **Work in small steps** — one buildable, provable step at a time.
- **Don't trust it, make it prove it** — numbers, not opinions; read every line.
- **Own it** — the result, the commits, and the PR are yours.

## Navigation & gates

- **You drive transitions.** The AI recommends and proves; it never auto-advances.
- Movement is **bidirectional**: advance, repeat a phase, or regress. A regression is
  logged with its reason — history is never rewritten.
- **Make it prove it:** proof is raw evidence (command, exit code, real output, a
  screenshot), never a self-graded "done". You validate it at the gate.
- **Git & PR are suggested, never executed.** `/flow:execute` proposes a commit;
  `/flow:ship` drafts a PR — you run them, your way.

## `.specs/` — the memory

State lives on disk, not just in the chat, so the work survives context resets and any
skill can resume. Per ticket: `state.md` (phase, steps, navigation log),
`understanding.md`, `context.md`, `discoveries.md`, `decisions.md`, `plan.md`,
`steps/NN-*.md`, `verification.md`, `evidence/` (full proof logs), and `assets/`. The shared contract is
`.specs/CONVENTIONS.md`. `state.md` changes only through the flow's state script
(`state.js`), which checks every phase and step move and writes the navigation log.

## Common questions

- **Do I have to use every phase?** No. Design is conditional; you can skip, repeat, or
  regress. The flow adapts to you.
- **What if the plan turns out wrong mid-execution?** Regress to `/flow:plan`; the reason
  is logged in the navigation log and `decisions.md`.
- **How do I add context that isn't in the ticket?** `/flow:context`, anytime — or when
  `/flow:understand` closes.
- **How do I know what to run next?** `/flow:start` to begin, then `/flow:status` anytime.
- **Does the AI commit or open PRs?** No — it suggests; you execute.
- **Who writes the code?** `/flow:plan` marks each step `delegate`, `delegate-light`,
  or `inline`. A delegated step is built by the `flow:step-executor` subagent — on
  Sonnet, or on Haiku for mechanical `delegate-light` steps; the main session keeps the
  conversation, the gate, and `state.md`. You can change any step.
  Reading the Figma (`flow:design-reader`) and mapping the code (`flow:code-mapper`)
  also run in subagents, so their bulk stays out of your session.
- **Can the AI rewrite the evidence?** No. The proof runner records it, and the
  plugin's guard hook blocks edits that remove or change a recorded entry or log, and
  hand edits to `state.md`. The flow's subagents are also blocked from git writes and a
  step's gate.
- **Why does it suggest `/clear` between phases?** Everything a phase needs is on disk in
  `.specs/`, so a fresh context costs nothing in knowledge and saves tokens. A new or
  cleared session is told which tickets are in progress and their next move.
