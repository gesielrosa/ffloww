# Concept & principles

ffloww encodes one developer's day-to-day flow — the disciplined path from a ticket
to a pull request — and adapts it for working *with* an AI agent instead of alone.

## The problem it solves

A capable AI agent will happily skip straight from a ticket to a pile of code. That
is fast and usually wrong: it loses the human's judgment, hides the trade-offs, and
produces work nobody can defend. The opposite failure is just as real — treating the
agent as untrustworthy and doing everything by hand, wasting what it is good at.

ffloww draws the line deliberately. It splits the work by who is good at what.

## The constant

> **The AI diverges and types. The human converges and decides.**

- **Delegated to the AI:** reading, mapping the codebase, surfacing options, writing
  boilerplate and code, running proofs, drafting documents.
- **Reserved for the human:** the design choice, the trade-offs, how to slice the
  work, and the judgment of "is this actually proven and correct?"

Every phase and every gate in ffloww exists to protect that split.

## The principles

**Give it context.** The agent is only as good as what it knows. ffloww feeds it the
ticket (Azure DevOps), the design (Figma), the codebase (exploration), and — crucially
— the developer's tacit knowledge that none of those carry. See
[the context channel](context-channel.md).

**Explore before build (ask for options).** Before any code, the agent diverges:
it maps the relevant code and lays out more than one viable approach. It does not
lock onto the first idea. The human picks.

**You architect, it types.** The agent produces options and code; the human makes the
design decision, weighs the trade-offs, and decides which ideas to keep. The decision
and its trade-offs are recorded as an ADR.

**Work in small steps.** Work is sliced into steps that are each small, independently
buildable, and independently provable — roughly one commit each. Big steps that can't
be proven in one go get split.

**Don't trust it, make it prove it.** Proof is raw evidence — the actual command, its
exit code, real test output, a screenshot — not prose and not a self-graded "done".
Numbers, not opinions. The human reads every line.

**Own it.** The result is the developer's. ffloww never commits, pushes, or opens a
PR on its own; it suggests, and the human executes. Responsibility stays with the
person whose name is on the work.

## Why state lives on disk

An agent's context window is lossy and gets compacted. If the plan, the decisions, and
the evidence live only in the conversation, they vanish. ffloww externalizes all of it
to `.specs/` in the consuming project, so the work is **resumable, auditable, and
reviewable** — and so any skill can pick up exactly where the last one left off. See
[specs & state](specs-and-state.md).

## Navigation is human-driven

The flow is not a one-way pipeline. Real work loops back: you reach execution and
discover the plan was wrong. ffloww makes that first-class — you can advance, repeat a
phase, or regress to an earlier one. The AI recommends the next move and proves its
work; **you** decide every transition. A regression is recorded with its reason, never
erased.
