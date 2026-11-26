'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run, git } = require('./helpers');
const { PROFILE_TEMPLATE, hints, untouched, profilePath } = require('../scripts/lib/profile');

const write = (root, file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
};

/** A repository with what a real project shows: manifests, scripts, a PR template, CI, one commit, a remote. */
function shown({ remoteHead = true } = {}) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-hints-'));
    const root = path.join(home, 'work');
    fs.mkdirSync(root);
    git(root, 'init', '-q', '-b', 'main');
    write(root, 'package.json', JSON.stringify({ scripts: { start: 'node server.js', test: 'jest', 'test:e2e': 'playwright test', lint: 'eslint .', typecheck: 'tsc --noEmit', prepare: 'husky' } }));
    write(root, 'pnpm-lock.yaml', '');
    write(root, 'nx.json', '{}');
    write(root, 'Makefile', 'test:\n\tjest\n');
    write(root, '.github/PULL_REQUEST_TEMPLATE.md', '## What\n');
    write(root, '.github/workflows/ci.yml', 'on: push\n');
    write(root, '.gitlab/merge_request_templates/Default.md', '## What\n');
    git(root, 'add', '-A');
    git(root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.com', 'commit', '-q', '-m', 'feat(export): add the CSV writer (AB-12)');
    git(home, 'init', '-q', '--bare', '-b', 'main', path.join(home, 'origin.git'));
    git(root, 'remote', 'add', 'origin', path.join(home, 'origin.git'));
    git(root, 'push', '-q', 'origin', 'main');
    if (remoteHead) git(root, 'remote', 'set-head', 'origin', 'main');
    return root;
}

test('hints list what the repository shows, and leave out scripts that prove nothing', () => {
    const text = hints(shown()).join('\n');
    assert.match(text, /^ {3}Base branch: +origin\/main \(the remote's default branch\)$/m);
    assert.match(text, /^ {3}PR template: +\.github\/PULL_REQUEST_TEMPLATE\.md · \.gitlab\/merge_request_templates\/ \(Default\.md\)$/m);
    assert.match(text, /^ {3}Manifests: +package\.json \(pnpm\) · nx\.json · Makefile$/m);
    assert.match(text, /^ {3}Scripts: +test = "jest" · test:e2e = "playwright test" · lint = "eslint \." · typecheck = "tsc --noEmit"$/m);
    assert.match(text, /^ {3}CI: +\.github\/workflows\/ci\.yml$/m);
    assert.match(text, /^ {3}Recent commits:\n {5}feat\(export\): add the CSV writer \(AB-12\)$/m);
    assert.doesNotMatch(text, /start =|prepare =/);
});

test('without the remote\'s default recorded, the base branch is a guess and says so', () => {
    assert.match(hints(shown({ remoteHead: false })).join('\n'), /Base branch: +origin\/main \(the remote has it; its default branch is not recorded here\)/);
});

test('a folder that shows nothing gives no hints', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-nohints-'));
    assert.deepEqual(hints(empty), []);
    assert.match(run('init_spec.js', ['--profile-hints', '--root', empty]).out, /^\[profile\] Found in this repository[^\n]*\n {3}\(nothing it could read: /);
});

test('the scaffolder lists the hints while the profile is empty, and stops once someone fills it', () => {
    const root = shown();
    const first = run('init_spec.js', ['AB-1', '--root', root]).out;
    assert.match(first, /\[ok\] Scaffolded [^\n]*\n\n\[profile\] \.specs\/PROJECT\.md is still empty\. Found in this repository, to propose its first values from:\n {3}Base branch: [^\n]*\n[\s\S]*Recent commits:\n[\s\S]*\nNext: \/flow:understand AB-1/);
    assert.equal(untouched(root), true);
    assert.match(run('init_spec.js', ['AB-1', '--root', root]).out, /\[profile\] \.specs\/PROJECT\.md is still empty/, 'a resume offers it again');

    fs.writeFileSync(profilePath(root), PROFILE_TEMPLATE.replace(/\n/g, '\r\n'));
    assert.equal(untouched(root), true, 'line endings alone are not an edit');
    fs.appendFileSync(profilePath(root), '\n- 2026-11-26: filled as tickets go.\n');
    assert.equal(untouched(root), false);
    assert.doesNotMatch(run('init_spec.js', ['AB-2', '--root', root]).out, /\[profile\]/);
    assert.match(run('init_spec.js', ['--profile-hints', '--root', root]).out, /^\[profile\] Found in this repository[^\n]*\n {3}Base branch: /, 'asked for, the list still prints');
});
