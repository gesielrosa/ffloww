'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { git, gitProject } = require('./helpers');
const { snapshot, exists, changes } = require('../scripts/lib/snapshot');

test('a snapshot holds tracked and new files, and leaves the index and the files alone', () => {
    const { repo, root } = gitProject();
    const before = snapshot(root);
    assert.match(before, /^[0-9a-f]{40}$/);
    assert.ok(exists(root, before));
    fs.appendFileSync(path.join(root, 'src', 'a.js'), 'const b = 2;\n');
    fs.writeFileSync(path.join(root, 'src', 'new.js'), 'const c = 3;\n');
    const status = git(repo, 'status', '--porcelain');
    const after = snapshot(root);
    assert.deepEqual(changes(root, before, after), ['M\tsrc/a.js', 'A\tsrc/new.js']);
    assert.equal(git(repo, 'status', '--porcelain'), status, 'the index and the working tree are as they were');
    assert.equal(git(repo, 'diff', '--cached', '--name-only'), '', 'nothing was staged');
    assert.equal(snapshot(root), after, 'the same tree gives the same id');
});

test('.specs/ and ignored files stay out of a snapshot, tracked or not', () => {
    const { repo, root, dir } = gitProject();
    fs.writeFileSync(path.join(repo, '.gitignore'), 'dist/\n');
    git(repo, 'add', '-A');
    git(repo, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.com', 'commit', '-q', '-m', 'track .specs');
    const before = snapshot(root);
    fs.appendFileSync(path.join(dir, 'context.md'), '\n- a new entry\n');
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'dist', 'bundle.js'), 'built');
    assert.equal(snapshot(root), before);
    assert.doesNotMatch(git(repo, 'ls-tree', '-r', '--name-only', before), /\.specs|dist/);
});

test('a project in a subfolder of the repository snapshots the whole repository, without its .specs/', () => {
    const { repo, root } = gitProject('AB-1', [], path.join('packages', 'app'));
    const before = snapshot(root);
    fs.writeFileSync(path.join(repo, 'shared.js'), 'outside the project root\n');
    assert.deepEqual(changes(root, before, snapshot(root)), ['A\tshared.js']);
    assert.doesNotMatch(git(repo, 'ls-tree', '-r', '--name-only', before), /\.specs/);
});

test('outside a git work tree there is no snapshot', () => {
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-plain-'));
    assert.equal(snapshot(plain), null);
    assert.equal(exists(plain, '4b825dc642cb6eb9a060e54bf8d69288fbee4904'), false);
});
