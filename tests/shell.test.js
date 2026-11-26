'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { run, project } = require('./helpers');
const { pickShell } = require('../scripts/lib/shell');
const { runProof } = require('../scripts/run_proof');
const { runEntries } = require('../scripts/lib/markdown');

const only = (...files) => (file) => files.includes(file);
const BASH = pickShell().path;

test('on a POSIX system the runner uses bash when there is one, and /bin/sh otherwise', () => {
    assert.deepEqual(pickShell({ PATH: '/opt/tools:/usr/local/bin' }, 'linux', only('/usr/local/bin/bash')), { path: '/usr/local/bin/bash', name: '/usr/local/bin/bash', pipes: false });
    assert.equal(pickShell({ PATH: '' }, 'linux', only('/bin/bash')).path, '/bin/bash');
    assert.deepEqual(pickShell({ PATH: '/usr/bin' }, 'linux', only()), { path: null, name: "/bin/sh (the platform's shell)", pipes: false });
});

test('on Windows the runner uses Git Bash through pipes, and never WSL\'s launcher', () => {
    const git = 'C:\\Program Files\\Git\\bin\\bash.exe';
    const wsl = 'C:\\Windows\\System32\\bash.exe';
    const env = { ProgramFiles: 'C:\\Program Files', Path: 'C:\\Windows\\System32;C:\\tools' };
    assert.deepEqual(pickShell(env, 'win32', only(git, wsl)), { path: git, name: git, pipes: true });
    assert.equal(pickShell({ ...env, CLAUDE_CODE_GIT_BASH_PATH: 'D:\\git\\bash.exe' }, 'win32', only(git, 'D:\\git\\bash.exe')).path, 'D:\\git\\bash.exe');
    assert.equal(pickShell({ Path: 'C:\\Windows\\System32;C:\\tools' }, 'win32', only(wsl, 'C:\\tools\\bash.exe')).path, 'C:\\tools\\bash.exe', 'a bash on PATH outside System32');
    assert.deepEqual(pickShell({ Path: 'C:\\Windows\\System32' }, 'win32', only(wsl)), { path: null, name: "cmd.exe (the platform's shell)", pipes: false });
    assert.equal(pickShell({ SHELL: '/usr/bin/bash', Path: '' }, 'win32', only()).path, null, 'an MSYS path is not a Windows file');
});

test('FFLOWW_PROOF_SHELL overrides the choice: the platform\'s shell, or a path', () => {
    const everything = () => true;
    assert.deepEqual(pickShell({ FFLOWW_PROOF_SHELL: 'default', PATH: '/bin' }, 'linux', everything), { path: null, name: "/bin/sh (the platform's shell)", pipes: false });
    assert.deepEqual(pickShell({ FFLOWW_PROOF_SHELL: 'Default', ProgramFiles: 'C:\\Program Files' }, 'win32', everything), { path: null, name: "cmd.exe (the platform's shell)", pipes: false });
    assert.deepEqual(pickShell({ FFLOWW_PROOF_SHELL: '/opt/zsh' }, 'linux', only()), { path: '/opt/zsh', name: '/opt/zsh (FFLOWW_PROOF_SHELL)', pipes: false });
    assert.equal(pickShell({ FFLOWW_PROOF_SHELL: 'C:\\msys\\bash.exe' }, 'win32', only()).pipes, true);
});

test('a proof written for bash runs as written, and the log names the shell', { skip: !BASH }, () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    const result = run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', 'diff <(echo same) <(echo same) && [[ "a b" == a* ]] && echo matched']);
    assert.match(result.out, /Exit code: 0\n[\s\S]*matched/);
    const log = fs.readdirSync(path.join(dir, 'evidence'))[0];
    assert.match(fs.readFileSync(path.join(dir, 'evidence', log), 'utf8'), new RegExp(`^# shell: ${BASH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));

    const plain = run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', 'echo plain'], { env: { ...process.env, FFLOWW_PROOF_SHELL: 'default' } });
    assert.match(plain.out, /Exit code: 0/);
    const logs = fs.readdirSync(path.join(dir, 'evidence')).map((name) => fs.readFileSync(path.join(dir, 'evidence', name), 'utf8'));
    assert.match(logs.find((text) => text.includes('# command: echo plain')), /^# shell: \S+ \(the platform's shell\)$/m);
});

test('through pipes the log still gets both streams, the exit code and the timeout', { skip: !BASH }, async () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    const shell = { path: BASH, name: BASH, pipes: true };
    const base = { ticket: 'AB-1', target: '01', label: '', root, tail: 40, timeout: 0, shell };

    const both = await runProof({ ...base, cmd: 'echo to-stdout; echo to-stderr >&2; exit 3' });
    assert.equal(both.exit, '3');
    assert.deepEqual([...both.excerpt].sort(), ['to-stderr', 'to-stdout']);
    assert.match(fs.readFileSync(both.logFile, 'utf8'), /# shell: [^\n]*\n[\s\S]*to-stdout[\s\S]*# exit code: 3\n$/);

    const big = await runProof({ ...base, cmd: 'for i in $(seq 1 20000); do echo "line $i of a long run that would overflow a buffer"; done' });
    assert.equal(big.exit, '0');
    assert.equal(big.total, 20000);

    const slow = await runProof({ ...base, cmd: 'echo started; sleep 20', timeout: 1 });
    assert.equal(slow.exit, 'none (killed after the 1s timeout)');
    assert.deepEqual(slow.excerpt, ['started']);

    const missing = await runProof({ ...base, cmd: 'echo x', shell: { path: path.join(root, 'no-such-shell'), name: 'no-such-shell', pipes: true } });
    assert.match(missing.exit, /^none \(failed to start: /);
    assert.equal(runEntries(fs.readFileSync(path.join(dir, 'steps', '01-x.md'), 'utf8')).length, 4);
});
