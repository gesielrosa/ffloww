---
name: review
description: >
  Review a change (local work, a branch, a pull request, or a flow ticket) on spec, proof and standards.
disable-model-invocation: true
argument-hint: "[<ticket-id> | <pull-request> | <ref>] [<spec>]"
---

# /flow:review

One review of one change, read cold, on three axes kept apart: **Spec** (does it do what
was asked, and only that?), **Proof** (would its tests fail if it were wrong?) and
**Standards** (does it follow the project's documented rules?). It works in any git
project, flow or not: a flow ticket brings its `.specs/` record as the spec. It reads and
reports. What happens to each finding is the developer's call; posting comments, approving
and changing the code are theirs.

## Steps

1. **Pin the change** to a base and a head, from the argument:
   - **nothing**: the uncommitted work against `HEAD`; with none, the current branch
     against its merge base with the default branch;
   - **a flow ticket** (`.specs/<ticket-id>/` exists): read `.specs/CONVENTIONS.md` and
     the ticket's `state.md` first. The change runs from the merge base with the default
     branch to the working tree (`git diff <merge-base>`, untracked files included); when
     the branch carries work from outside the ticket, or the ticket was built on the
     default branch itself, ask the developer for the base;
   - **a ref**: one `HEAD` descends from (`git merge-base --is-ancestor <ref> HEAD`) is the
     base, `<ref>...HEAD`; any other branch or commit is the change, against its merge base
     with the default branch;
   - **a pull request** (a number or a link): its source and target branches, from
     whatever tools this session has for the developer's host, or from the developer.
     Fetch both and review `<remote>/<target>...<remote>/<source>`, reading its files at
     the source revision, so the developer's working tree stays as it is.

   Confirm the refs resolve and the diff is not empty before any agent runs, and note the
   commits (`git log --oneline <base>..<head>`) and the size (`git diff --shortstat`).

2. **Find the intent**, what the change was asked to do:
   - a flow ticket: `understanding.md` (acceptance criteria), `decisions.md`, `plan.md`,
     the step specs, and the existing code they cite when the change ports or mirrors it;
   - a spec the developer passed (a path or text);
   - a pull request's description, and the work item or issue it links, read with the
     tools this session has;
   - ticket or issue ids in the commit messages, read the same way.

   With none found, ask the developer once. With no spec at all, the Spec axis reports
   "No spec given." and Proof and Standards run as usual.

3. **Review in a fresh context.** Call the Agent tool with subagent_type
   `flow:diff-reviewer`, with a change brief: the project root, the diff command, the
   commits, the revision to read files at (for a pull request), and the intent sources
   as paths, or as text quoted in full when it came from a tool. For a change over about
   15 files or 800 changed lines, call three in the same message, one axis each.

4. **Check every finding** before it reaches the developer: open its cited lines and keep
   what holds. A finding you drop is listed with the reason, in one line.

5. **Report by axis**, in the order Spec, Proof, Standards, never merged or ranked across
   each other: each finding with its `path:line`, and one closing line with the count per
   axis and the worst finding in each.
   - **A pull request**: each finding is also written as a review comment, ready to paste
     at its `path:line`, in the language the pull request is written in.
   - **A flow ticket**: save the report to `.specs/<ticket-id>/review.md` and log it with
     `node "${CLAUDE_PLUGIN_ROOT}/scripts/state.js" <ticket-id> log "review: <count per axis>"`.

## Handoff

Ask which findings to act on. For a flow ticket, the ones the developer accepts become a
new step: write its spec from `steps/_TEMPLATE.md`, add it with
`state.js <ticket-id> add-step <id> "<title>"`, and name the next command from the
`Next:` line the state script prints; `review.md` keeps the rest on disk. Otherwise the
developer takes the findings their way: comments on the pull request, or changes of
their own.
