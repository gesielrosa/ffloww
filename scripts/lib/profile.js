'use strict';

/**
 * The project profile, .specs/PROJECT.md: what the flow has learned about a project that
 * every ticket needs and none should learn twice (how proofs run there, how work is
 * committed, how it ships). The developer and the phases write it as prose; the scripts
 * read only its settings, the lines written as "- Name: value".
 *
 * The file is the project's: it is written once, from the template below, and never
 * replaced. A setting that is empty or missing falls back to the flow's default.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROFILE_TEMPLATE = `# Project profile

> What the flow has learned about this project and every ticket needs: how proofs run
> here, how work is committed and how it ships. \`/flow:plan\` reads it and adds what its
> baseline shows, \`/flow:retro\` proposes changes to it, and you edit it freely. The
> lines written as "- Name: value" are settings the flow's scripts read.

## Proof commands

<!-- One line per command the flow uses as proof here: what it proves, the exact command
     with the flags that make its output valid evidence, how long it takes, and what to
     know before running it. For example:
       unit tests, one file: \`npx jest <path> --verbose\` (about 20 s)
       the whole suite: \`npm test\` (about 12 min; once per ticket, at verify) -->

- Fast ends at: <!-- the longest a proof may take and still run in every step, e.g. 60 s; a slower one runs once per ticket -->

## Commits

- Policy: per-step <!-- per-step | at-end: how a new ticket is committed -->
- Messages: <!-- the convention commit drafts follow, e.g. "feat(scope): summary (AB-1234)" -->

## Pull requests

- Base branch: <!-- the branch tickets merge into, as the remote names it, e.g. origin/main -->
- Format: <!-- the template a PR draft fills (a path), or the shape you want: sections, length, where the proof goes. Empty: the flow's own draft -->

## Notes

<!-- Anything else every ticket should know about working here with the flow. -->
`;

const POLICIES = ['per-step', 'at-end'];

/** The value of a "- <Name>: <value>" line, its comments left out; '' when unset or absent. */
function setting(text, name) {
    const prefix = `- ${name.toLowerCase()}:`;
    const line = text.replace(/\r\n/g, '\n').split('\n').find((l) => l.trim().toLowerCase().startsWith(prefix));
    if (!line) return '';
    return line.slice(line.indexOf(':') + 1).replace(/<!--[\s\S]*?-->/g, '').replace(/`/g, '').trim();
}

/** The profile's file under a project root. */
function profilePath(root) {
    return path.join(root, '.specs', 'PROJECT.md');
}

/**
 * The settings the scripts read, as { exists, commit, base }: the commit policy of a new
 * ticket ('' unless it is one the flow knows) and the branch tickets merge into.
 */
function readProfile(root) {
    const file = profilePath(root);
    if (!fs.existsSync(file)) return { exists: false, commit: '', base: '' };
    const text = fs.readFileSync(file, 'utf8');
    const policy = setting(text, 'Policy').split(/\s+/)[0];
    return {
        exists: true,
        commit: POLICIES.includes(policy) ? policy : '',
        base: setting(text, 'Base branch').split(/\s+/)[0],
    };
}

module.exports = { PROFILE_TEMPLATE, setting, profilePath, readProfile };
