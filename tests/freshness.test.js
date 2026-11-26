'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run, project, git } = require('./helpers');
const { ago } = require('../scripts/lib/freshness');

const commit = (cwd, message) => git(cwd, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.com', 'commit', '-q', '-m', message);

/**
 * A ticket on its own branch of a clone, with a bare remote whose default branch is main.
 * `theirs` commits a change to main from another clone and fetches it into the work.
 */
function remoteProject() {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-remote-'));
    const origin = path.join(home, 'origin.git');
    const root = path.join(home, 'work');
    git(home, 'init', '-q', '--bare', '-b', 'main', origin);
    git(home, 'clone', '-q', origin, root);
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'a.js'), 'const a = 1;\n');
    fs.writeFileSync(path.join(root, 'src', 'b.js'), 'const b = 1;\n');
    git(root, 'add', '-A');
    commit(root, 'base');
    git(root, 'push', '-q', 'origin', 'HEAD:main');
    git(root, 'remote', 'set-head', 'origin', 'main');
    git(root, 'switch', '-q', '-c', 'AB-1');
    run('init_spec.js', ['AB-1', '--root', root]);
    const dir = path.join(root, '.specs', 'AB-1');
    fs.copyFileSync(path.join(dir, 'steps', '_TEMPLATE.md'), path.join(dir, 'steps', '01-exporter.md'));
    run('state.js', ['AB-1', 'add-step', '01', 'Add the exporter', '--root', root]);
    const theirs = (file, content) => {
        const other = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-other-'));
        git(other, 'clone', '-q', origin, '.');
        fs.writeFileSync(path.join(other, file), content);
        git(other, 'add', '-A');
        commit(other, `theirs: ${file}`);
        git(other, 'push', '-q', 'origin', 'HEAD:main');
        git(root, 'fetch', '-q', 'origin');
    };
    const fresh = () => run('state.js', ['AB-1', 'fresh', '--root', root]).out.trimEnd();
    const prove = (target, ...args) => run('run_proof.js', ['AB-1', target, '--root', root, ...args]);
    return { root, dir, theirs, fresh, prove };
}

test('the runner records the tree a proof ran on, in a git work tree only', () => {
    const { root, dir, prove } = remoteProject();
    prove('01', '--cmd', 'echo ok');
    const spec = fs.readFileSync(path.join(dir, 'steps', '01-exporter.md'), 'utf8');
    assert.match(spec, /- Duration: \S+s\n- Tree: `[0-9a-f]{40}` \(HEAD `[0-9a-f]{7,}`\)\n- Log: /);
    assert.equal(spec.match(/- Tree: `([0-9a-f]{40})`/)[1], git(root, 'rev-parse', 'HEAD^{tree}'), 'nothing changed yet, and .specs/ stays out');

    const plain = project('AB-1', [['01', 'x']]);
    run('run_proof.js', ['AB-1', '01', '--root', plain.root, '--cmd', 'echo ok']);
    assert.doesNotMatch(fs.readFileSync(path.join(plain.dir, 'steps', '01-x.md'), 'utf8'), /- Tree:/);
    assert.match(run('state.js', ['AB-1', 'fresh', '--root', plain.root]).out, /^\[skip\] not a git work tree/);
});

test('fresh names the base: the profile\'s, else the remote\'s default, and says when it cannot', () => {
    const { root, fresh } = remoteProject();
    assert.match(fresh(), /^Base: origin\/main \(the remote's default branch\), never fetched here\nBehind: 0: the branch holds everything on origin\/main\n/);
    const profile = path.join(root, '.specs', 'PROJECT.md');
    const base = (value) => fs.writeFileSync(profile, fs.readFileSync(profile, 'utf8').replace(/^- Base branch:.*$/m, `- Base branch: ${value}`));
    base('origin/main <!-- where tickets merge -->');
    assert.match(fresh(), /^Base: origin\/main \(from \.specs\/PROJECT\.md\)/);
    base('origin/release');
    assert.match(fresh(), /^Base: origin\/release \(from \.specs\/PROJECT\.md\) is not a commit here: fetch it, or correct the profile's Base branch\n/);
    base('');
    git(root, 'symbolic-ref', '-d', 'refs/remotes/origin/HEAD');
    assert.match(fresh(), /^Base: unknown: name the branch tickets merge into in \.specs\/PROJECT\.md/);
});

test('fresh says how far behind the base the work is, what both sides changed, and whether they would merge', () => {
    const { root, theirs, fresh } = remoteProject();
    fs.writeFileSync(path.join(root, 'src', 'a.js'), 'const a = 2;\n');
    fs.writeFileSync(path.join(root, 'src', 'new.js'), 'const n = 1;\n');

    theirs('src/b.js', 'const b = 9;\n');
    assert.match(fresh(), /^Base: origin\/main \(the remote's default branch\), as of the last fetch, \d+ min ago \(\S+Z\)\nBehind: 1 commit \(0 ahead; merge base [0-9a-f]{10}\)\nOverlap: none: no file changed on both sides\nMerge: clean in a dry run\n/);

    theirs('src/a.js', 'const a = 3;\n');
    assert.match(fresh(), /Behind: 2 commits \(0 ahead; [^\n]*\nOverlap: 1 file changed on both sides\n {2}src\/a\.js\nMerge: 1 file would conflict in a dry run\n {2}src\/a\.js\n/);
    assert.equal(git(root, 'status', '--porcelain', '--', 'src'), 'M src/a.js\n?? src/new.js', 'the dry run left the work as it was');
    assert.equal(git(root, 'diff', '--cached', '--name-only'), '');
});

test('fresh tells the proofs that ran on the working tree as it is from the ones that predate it', () => {
    const { root, dir, fresh, prove } = remoteProject();
    assert.match(fresh(), /\nProven: no proof run recorded yet$/);

    prove('01', '--red', '--cmd', 'exit 1');
    assert.match(fresh(), /\nProven: no proof run recorded yet$/, 'a red run proves nothing yet');
    prove('01', '--cmd', 'echo ok');
    assert.match(fresh(), /\nProven: no whole-ticket run yet; the latest step run \(step 01, \S+Z\) ran on the working tree as it is now$/);
    fs.writeFileSync(path.join(root, 'src', 'a.js'), 'const a = 2;\n');
    assert.match(fresh(), /the latest step run \(step 01, \S+Z\) ran on an earlier tree than the one here now\nChanged since: 1 file since the run at \S+Z\n {2}M\tsrc\/a\.js$/);

    prove('ticket', '--label', 'AC 1: a is 2', '--cmd', 'grep -q 2 src/a.js');
    prove('ticket', '--label', 'AC 2: b is 1', '--cmd', 'grep -q 1 src/b.js');
    assert.match(fresh(), /\nProven: the whole-ticket proofs \(verification\.md, 2\) all ran on the working tree as it is now$/);

    // The code changes after the verify gate, and only one criterion is proven again.
    fs.writeFileSync(path.join(root, 'src', 'b.js'), 'const b = 1; // tidy\n');
    prove('ticket', '--label', 'AC 2: b is 1', '--cmd', 'grep -q 1 src/b.js');
    assert.match(fresh(), /\nProven: 1 of 2 whole-ticket proofs last ran on an earlier tree than the one here now\n {2}AC 1: a is 2 \(\S+Z\)\nChanged since: 1 file since the run at \S+Z\n {2}M\tsrc\/b\.js$/);
    prove('ticket', '--label', 'AC 1: a is 2', '--cmd', 'grep -q 2 src/a.js');
    assert.match(fresh(), /\nProven: the whole-ticket proofs \(verification\.md, 2\) all ran on the working tree as it is now$/);

    // An entry an earlier version recorded carries no tree.
    const file = path.join(dir, 'verification.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('## Gate', '### Run 2026-01-01T00:00:00Z — AC 3: old\n\n- Command: `true`\n- Exit code: 0\n\n## Gate'));
    assert.match(fresh(), /\nProven: 2 of 3 whole-ticket proofs ran on the working tree as it is now; 1 carries no tree \(recorded by an earlier version of the flow, or outside git\)$/);
});

test('a record from before the runner stamped trees is unknown, never stale', () => {
    const { dir, fresh } = remoteProject();
    const entry = (label) => `### Run 2026-01-01T00:00:00Z${label}\n\n- Command: \`true\`\n- Exit code: 0\n\n`;
    const step = path.join(dir, 'steps', '01-exporter.md');
    fs.writeFileSync(step, fs.readFileSync(step, 'utf8').replace('## Gate', `${entry('')}## Gate`));
    assert.match(fresh(), /\nProven: unknown: no whole-ticket run yet, and the latest step run \(step 01, 2026-01-01T00:00:00Z\) carries no tree \(recorded by an earlier version of the flow, or outside git\)$/);
    fs.writeFileSync(path.join(dir, 'verification.md'), `# Verification\n\n## Evidence\n\n${entry(' — AC 1: old')}${entry(' — AC 2: old')}## Gate\n`);
    const report = fresh();
    assert.match(report, /\nProven: unknown: the whole-ticket proofs \(verification\.md, 2\) carry no tree \(recorded by an earlier version of the flow, or outside git\)$/);
    assert.doesNotMatch(report, /Changed since|earlier tree/);
});

test('ages read as minutes, hours, then days', () => {
    const now = new Date('2026-11-26T12:00:00Z');
    assert.equal(ago(new Date('2026-11-26T11:48:00Z'), now), '12 min ago');
    assert.equal(ago(new Date('2026-11-26T09:00:00Z'), now), '3 h ago');
    assert.equal(ago(new Date('2026-11-20T12:00:00Z'), now), '6 days ago');
});
