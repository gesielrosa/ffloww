'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const script = (name) => path.join(ROOT, 'scripts', name);

/** Run a flow script; returns { code, out }. */
function run(name, args, options = {}) {
    try {
        return { code: 0, out: execFileSync('node', [script(name), ...args], { encoding: 'utf8', ...options }) };
    } catch (err) {
        return { code: err.status, out: String(err.stdout || '') };
    }
}

/** A scratch project with .specs/<ticket>/ scaffolded and, optionally, step specs. */
function project(ticket = 'AB-1', steps = []) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-test-'));
    run('init_spec.js', [ticket, '--root', root]);
    const dir = path.join(root, '.specs', ticket);
    const template = fs.readFileSync(path.join(dir, 'steps', '_TEMPLATE.md'), 'utf8');
    for (const [id, slug] of steps) {
        fs.writeFileSync(path.join(dir, 'steps', `${id}-${slug}.md`), template.replace('<n>', String(Number(id))).replace('<title>', slug));
    }
    return { root, dir, ticket };
}

/** Run git in a directory; returns its trimmed output. */
function git(cwd, ...args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/**
 * A scratch project inside a git repository with one commit (src/a.js), for the
 * snapshots. `sub` puts the project root in a subfolder of the repository.
 */
function gitProject(ticket = 'AB-1', steps = [], sub = '') {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-git-'));
    const root = path.join(repo, sub);
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'a.js'), 'const a = 1;\n');
    git(repo, 'init', '-q');
    git(repo, 'add', '-A');
    git(repo, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.com', 'commit', '-q', '-m', 'fixture');
    run('init_spec.js', [ticket, '--root', root]);
    const dir = path.join(root, '.specs', ticket);
    for (const [id, slug] of steps) fs.copyFileSync(path.join(dir, 'steps', '_TEMPLATE.md'), path.join(dir, 'steps', `${id}-${slug}.md`));
    return { repo, root, dir, ticket };
}

module.exports = { ROOT, script, run, project, git, gitProject };
