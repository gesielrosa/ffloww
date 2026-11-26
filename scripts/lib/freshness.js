'use strict';

/**
 * How fresh a ticket's evidence is, for `state.js <ticket-id> fresh`.
 *
 * A proof describes the tree it ran on. Two things make that tree stop being the one
 * that ships: the branch's base moves, so the merge brings code no proof saw, and the
 * work changes after its proof. The proof runner stamps each evidence entry with the
 * working tree it ran on (lib/snapshot.js). This reads those stamps and git, and says
 * how far the branch is behind its base, whether the two would merge, and which runs
 * predate the tree as it is now.
 *
 * It only reads. The base is as of the last fetch, which is the caller's to make.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runEntries } = require('./markdown');
const { readProfile } = require('./profile');
const { snapshot, exists, changes } = require('./snapshot');

const MAX_FILES = 20;

/** Run git: { status, out }. */
function git(cwd, args) {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return { status: result.status, out: String(result.stdout || '').trim() };
}

/** git's output when it succeeds, or null. */
function read(cwd, args) {
    const { status, out } = git(cwd, args);
    return status === 0 ? out : null;
}

/** "3 files", "1 file". */
function count(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** A list of lines, cut at MAX_FILES with a count of the rest. */
function listed(items) {
    const shown = items.slice(0, MAX_FILES).map((item) => `  ${item}`);
    if (items.length > MAX_FILES) shown.push(`  … and ${items.length - MAX_FILES} more`);
    return shown;
}

/** "2 h ago", from a time in the past. */
function ago(date, now = new Date()) {
    const minutes = Math.max(0, Math.round((now - date) / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 48 * 60) return `${Math.round(minutes / 60)} h ago`;
    return `${Math.round(minutes / 1440)} days ago`;
}

/** The branch the ticket merges into, as { ref, source }: the profile's, else the remote's default; or null. */
function baseRef(root) {
    const named = readProfile(root).base;
    if (named) return { ref: named, source: 'from .specs/PROJECT.md' };
    const remote = read(root, ['symbolic-ref', '-q', '--short', 'refs/remotes/origin/HEAD']);
    return remote ? { ref: remote, source: "the remote's default branch" } : null;
}

/** When the repository last fetched, or null. */
function lastFetch(root) {
    const file = read(root, ['rev-parse', '--git-path', 'FETCH_HEAD']);
    try {
        return file ? fs.statSync(path.resolve(root, file)).mtime : null;
    } catch {
        return null;
    }
}

/** The lines about the base: how far behind it the branch is, and whether the two would merge. */
function baseLines(root, now) {
    const base = baseRef(root);
    if (!base) return ['Base: unknown: name the branch tickets merge into in .specs/PROJECT.md (Pull requests, Base branch), e.g. origin/main'];
    if (read(root, ['rev-parse', '--verify', '-q', `${base.ref}^{commit}`]) === null) {
        return [`Base: ${base.ref} (${base.source}) is not a commit here: fetch it, or correct the profile's Base branch`];
    }
    const fetched = lastFetch(root);
    const lines = [`Base: ${base.ref} (${base.source}), ${fetched ? `as of the last fetch, ${ago(fetched, now)} (${fetched.toISOString().replace(/\.\d{3}Z$/, 'Z')})` : 'never fetched here'}`];
    const counts = read(root, ['rev-list', '--left-right', '--count', `HEAD...${base.ref}`]);
    const mergeBase = read(root, ['merge-base', 'HEAD', base.ref]);
    if (counts === null || mergeBase === null) return [...lines, `Behind: unknown: HEAD and ${base.ref} share no history`];
    const [ahead, behind] = counts.split(/\s+/).map(Number);
    if (behind === 0) return [...lines, `Behind: 0: the branch holds everything on ${base.ref}`];
    lines.push(`Behind: ${count(behind, 'commit')} (${ahead} ahead; merge base ${mergeBase.slice(0, 10)})`);

    // Everything a commit of the work would hold, .specs/ included, against what the base brings.
    const work = snapshot(root, { specs: true });
    if (!work) return lines;
    const theirs = new Set((read(root, ['diff', '--name-only', mergeBase, base.ref]) || '').split('\n').filter(Boolean));
    const both = (read(root, ['diff', '--name-only', mergeBase, work]) || '').split('\n').filter((file) => file && theirs.has(file));
    lines.push(both.length ? `Overlap: ${count(both.length, 'file')} changed on both sides` : `Overlap: none: no file changed on both sides`, ...listed(both));

    const merge = git(root, ['merge-tree', '--write-tree', '--name-only', `--merge-base=${mergeBase}`, work, base.ref]);
    if (merge.status === 0) lines.push('Merge: clean in a dry run');
    else if (merge.status === 1) {
        const conflicts = merge.out.split('\n').slice(1);
        const files = conflicts.slice(0, conflicts.indexOf('') === -1 ? conflicts.length : conflicts.indexOf(''));
        lines.push(`Merge: ${count(files.length, 'file')} would conflict in a dry run`, ...listed(files));
    } else lines.push('Merge: not tried (this git has no dry run for it)');
    return lines;
}

/** The proof runs recorded in a spec, as { where, time, label, command, tree }; red runs left out. */
function runs(file, where) {
    if (!fs.existsSync(file)) return [];
    return runEntries(fs.readFileSync(file, 'utf8')).map((entry) => {
        const lines = entry.split('\n');
        const heading = lines[0].match(/^### Run (\S+Z)(?: — (.*))?$/);
        const field = (name) => (lines.find((line) => line.startsWith(`- ${name}: `)) || '').slice(name.length + 4);
        const tree = field('Tree').match(/`([0-9a-f]{40,64})`/);
        return { where, time: heading ? heading[1] : '', label: heading && heading[2] ? heading[2] : '', command: field('Command'), tree: tree ? tree[1] : null };
    }).filter((run) => !run.label.startsWith('red: '));
}

/** The lines about the proofs: which of them ran on the working tree as it is now. */
function proofLines(root, ticketDir, steps, tree, stepSpec) {
    const whole = runs(path.join(ticketDir, 'verification.md'), 'verification.md');
    const stepRuns = steps.flatMap((step) => {
        const file = stepSpec(ticketDir, step.id);
        return file ? runs(file, `step ${step.id}`) : [];
    });
    const all = [...whole, ...stepRuns];
    if (all.length === 0) return ['Proven: no proof run recorded yet'];
    const lines = [];
    const latest = (list) => list.reduce((a, b) => (b.time >= a.time ? b : a));
    let reference = null;

    const untracked = 'recorded by an earlier version of the flow, or outside git';

    if (whole.length) {
        // The latest run of each proof is the one that stands.
        const byProof = new Map();
        for (const run of whole) byProof.set(run.label || run.command, run);
        const proofs = [...byProof.values()];
        const stale = proofs.filter((run) => run.tree && run.tree !== tree);
        const unknown = proofs.filter((run) => !run.tree);
        if (stale.length) {
            lines.push(`Proven: ${stale.length} of ${count(proofs.length, 'whole-ticket proof')} last ran on an earlier tree than the one here now`);
            lines.push(...listed(stale.map((run) => `${run.label || run.command} (${run.time})`)));
            reference = stale.reduce((a, b) => (b.time < a.time ? b : a));
        } else if (unknown.length === proofs.length) {
            lines.push(`Proven: unknown: the whole-ticket proofs (verification.md, ${proofs.length}) carry no tree (${untracked})`);
        } else if (unknown.length) {
            lines.push(`Proven: ${proofs.length - unknown.length} of ${count(proofs.length, 'whole-ticket proof')} ran on the working tree as it is now; ${unknown.length} ${unknown.length === 1 ? 'carries' : 'carry'} no tree (${untracked})`);
        } else {
            lines.push(`Proven: the whole-ticket proofs (verification.md, ${proofs.length}) all ran on the working tree as it is now`);
        }
    } else {
        const last = latest(stepRuns);
        if (!last.tree) lines.push(`Proven: unknown: no whole-ticket run yet, and the latest step run (${last.where}, ${last.time}) carries no tree (${untracked})`);
        else {
            const on = last.tree === tree ? 'the working tree as it is now' : 'an earlier tree than the one here now';
            lines.push(`Proven: no whole-ticket run yet; the latest step run (${last.where}, ${last.time}) ran on ${on}`);
            if (last.tree !== tree) reference = last;
        }
    }

    if (reference) {
        const files = exists(root, reference.tree) ? changes(root, reference.tree, tree) : null;
        if (files === null) lines.push(`Changed since: unknown: the tree of the run at ${reference.time} is no longer in the repository`);
        else lines.push(`Changed since: ${count(files.length, 'file')} since the run at ${reference.time}`, ...listed(files));
    }
    return lines;
}

/** The freshness report for a ticket: the lines `state.js <ticket-id> fresh` prints. */
function freshness(root, ticketDir, steps, stepSpec, now = new Date()) {
    const tree = snapshot(root);
    if (!tree) return ['[skip] not a git work tree, so neither the base nor the proofs\' trees can be read'];
    return [...baseLines(root, now), ...proofLines(root, ticketDir, steps, tree, stepSpec)];
}

module.exports = { freshness, baseRef, runs, ago };
