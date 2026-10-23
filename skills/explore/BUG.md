# Exploring a bug

A bug is explored from a **red** reproduction: one command that fails on *this* bug, with
the symptom the ticket reports, and that will pass once the bug is fixed. With it, the
cause is found by experiment and the fix has its proof; without it, options are guesses.

1. **Build the reproduction.** Try, roughly in this order: a failing test at the seam that
   reaches the bug; a script that drives the CLI or the API with the reported input; a
   headless-browser script for a UI symptom; a replay of a captured payload or log. Keep it
   as a script under `.specs/<ticket-id>/repro/`, outside the codebase. It is done when the
   command:
   - fails with the reported symptom, not a nearby one;
   - gives the same verdict on every run (for a flaky bug, a known and high failure rate);
   - runs in seconds, unattended.

   When no reproduction can be built, say what was tried and ask the developer for access
   to an environment where the bug happens, or for a captured artifact (a log, a payload,
   a screen recording); the options wait for it.

2. **Shrink it.** Cut inputs, data and steps one at a time while it stays red; the
   smallest red case becomes the regression test.

3. **Hypothesise.** Rank three to five causes, each falsifiable ("if X is the cause,
   changing Y makes the reproduction pass"), and share the ranking with the developer,
   who often knows which to rule out. Test the leading ones with targeted probes, logs
   tagged `[DEBUG-<ticket-id>]`, and remove every probe before the phase ends.

4. **Record and hand over.** In `discoveries.md`: the reproduction command and its red
   output, the hypotheses and which one held, and the options, each a fix for the
   confirmed cause whose proof is the reproduction turning green.
