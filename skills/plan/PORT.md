# Planning a port

A port moves behavior the code already has: a migration, a rewrite, a new path that has
to match the old one. Its spec is the code it mirrors, so the plan cites that code line
by line. A spec written from a reading of the legacy can ask for behavior the legacy
never had, and a review against that spec cannot see the difference.

1. **Cite every transformation.** In each step's Spec and Changes, each thing the new
   code does to its input (a case change, a default, a filter, an ordering, an early
   return) carries the legacy `file:line` it mirrors, read in this session.

2. **Name what is new.** A transformation with no legacy line to cite is new behavior,
   whoever asked for it. List each one in `plan.md` under **New behavior**, for the
   developer to accept or drop at approval. One that breaks a criterion asking for
   parity is settled before the steps are written, since the answer changes them: show
   the legacy lines, the inputs whose result would change, and ask. A deliberate
   difference from the legacy is a decision: it goes to `decisions.md`, the criterion
   it breaks becomes a `gap` row, and the PR names it beside any claim of parity.

3. **Prove parity by comparison.** Where the old and the new path can both run, the
   proof sends the same inputs through both and compares the results, with inputs
   taken from the cited branches: the value the default applies to, the one the filter
   drops. Where only the new one can run, each cited branch gets a case of its own. A
   differential with its controls is a runtime tail, so it is a step of its own.

4. **Keep the legacy in the review's reach.** The reviewer checks each step's change
   against the lines its spec cites. Per-step reviews compare a step with its own
   spec, so before verify, `/flow:review <ticket-id>` reads the whole change against
   the legacy files.
