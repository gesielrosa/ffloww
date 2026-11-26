'use strict';

/**
 * Snapshots of a project's working tree as git tree ids, for the flow's state script.
 *
 * A snapshot holds every file git tracks or would track (ignored files stay out), except
 * .specs/, the flow's own record. It is built in a temporary index, so the project's
 * index, branch and files stay as they are; the repository only gains objects nothing
 * refers to, which git prunes in time.
 *
 * Two snapshots diff with `git diff <tree> <tree>`, new files included. That is how a
 * step's change stands alone whether or not the steps before it were committed, and how
 * a proof run is tied to the code it ran on.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

/** Run git in a directory: its trimmed stdout, or null when it fails. */
function git(cwd, args, env) {
    const result = spawnSync('git', args, {
        cwd,
        encoding: 'utf8',
        env: env ? { ...process.env, ...env } : process.env,
        maxBuffer: 64 * 1024 * 1024,
    });
    return result.status === 0 ? String(result.stdout).trim() : null;
}

/** A new folder for the temporary index: the system's temp folder, or the git folder where that one is closed. */
function scratch(gitDir) {
    for (const base of [os.tmpdir(), gitDir]) {
        try {
            return fs.mkdtempSync(path.join(base, 'ffloww-index-'));
        } catch {
            // try the next place
        }
    }
    return null;
}

/**
 * The tree id of the working tree under the repository that holds `root`, or null:
 * outside git, or when the snapshot cannot be taken. It never throws, so a step starts
 * with or without one. `specs: true` keeps .specs/ in the tree, for a merge dry run,
 * where the tree stands for everything a commit of the work would hold.
 */
function snapshot(root, { specs: keepSpecs = false } = {}) {
    let dir = null;
    try {
        // One call for both: the index's path, then the project's folder inside the repository ('' at its top).
        const located = git(root, ['rev-parse', '--git-path', 'index', '--show-prefix']);
        if (located === null) return null;
        const [index, prefix = ''] = located.split('\n');
        const real = path.resolve(root, index);
        dir = scratch(path.dirname(real));
        if (!dir) return null;
        const env = { GIT_INDEX_FILE: path.join(dir, 'index') };
        // Starting from the project's index keeps its stat cache, so only changed files are read.
        // The copy keeps the index's own time too: git re-reads any file as new as its index,
        // and a later time would hide an edit made in the same second as the last index write.
        if (fs.existsSync(real)) {
            fs.copyFileSync(real, env.GIT_INDEX_FILE);
            const { atime, mtime } = fs.statSync(real);
            fs.utimesSync(env.GIT_INDEX_FILE, atime, mtime);
        }
        // .specs/ is taken out after the add, never named in it: where the project ignores
        // .specs/, git refuses an add whose pathspec names an ignored path, even to exclude it.
        if (git(root, ['add', '-A', '--', ':(top)'], env) === null) return null;
        if (!keepSpecs && git(root, ['rm', '-r', '--cached', '-q', '--ignore-unmatch', '--', `:(top)${prefix}.specs`], env) === null) return null;
        const tree = git(root, ['write-tree'], env);
        return tree && /^[0-9a-f]{40,64}$/.test(tree) ? tree : null;
    } catch {
        return null;
    } finally {
        if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
}

/** True while the repository still holds this tree. */
function exists(root, tree) {
    return git(root, ['cat-file', '-e', `${tree}^{tree}`]) !== null;
}

/** The files that differ between two snapshots, as "M\tpath" lines; null when git cannot tell. */
function changes(root, base, head) {
    const out = git(root, ['diff', '--name-status', base, head]);
    return out === null ? null : out.split('\n').filter(Boolean);
}

/** The short id of the commit checked out, or null: outside git, or before the first commit. */
function head(root) {
    return git(root, ['rev-parse', '--short', '--verify', '-q', 'HEAD']);
}

module.exports = { snapshot, exists, changes, head };
