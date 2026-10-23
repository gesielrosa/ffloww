'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { run, project } = require('./helpers');
const { runEntries } = require('../scripts/lib/markdown');

test('records an entry before Gate, with exit code and log, never grading', () => {
    const { root, dir } = project('AB-1', [['02', 'export']]);
    const result = run('run_proof.js', ['AB-1', '02', '--root', root, '--cmd', 'echo hello; exit 3']);
    assert.equal(result.code, 0);
    assert.match(result.out, /Exit code: 3/);
    const spec = fs.readFileSync(path.join(dir, 'steps', '02-export.md'), 'utf8');
    assert.match(spec, /### Run \S+Z\n\n- Command: `echo hello; exit 3`\n- Exit code: 3\n[\s\S]*hello\n```\n\n## Gate/);
    const [entry] = runEntries(spec);
    const log = entry.match(/- Log: `(evidence\/[^`]+)`/)[1];
    assert.match(fs.readFileSync(path.join(dir, log), 'utf8'), /# exit code: 3/);
});

test('output with headings, fences and colors stays inside one entry', () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', "printf '\\033[31mRED\\033[0m\\n## not a heading\\n```\\n'"]);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', 'echo second']);
    const spec = fs.readFileSync(path.join(dir, 'steps', '01-x.md'), 'utf8');
    const entries = runEntries(spec);
    assert.equal(entries.length, 2);
    assert.match(entries[0], /^RED$/m);
    assert.doesNotMatch(entries[0], /\u001b/);
    assert.match(entries[1], /second/);
    assert.ok(spec.indexOf(entries[1]) < spec.indexOf('## Gate'));
});

test('the ticket target writes verification.md with a label', () => {
    const { root, dir } = project();
    run('run_proof.js', ['AB-1', 'ticket', '--root', root, '--label', 'AC 1: exports', '--cmd', 'echo ok']);
    const text = fs.readFileSync(path.join(dir, 'verification.md'), 'utf8');
    assert.match(text, /### Run \S+Z — AC 1: exports/);
});

test('two runs in the same second keep separate logs', () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', 'true']);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', 'true']);
    assert.equal(fs.readdirSync(path.join(dir, 'evidence')).length, 2);
});

test('bad input exits 1', () => {
    const { root } = project();
    assert.equal(run('run_proof.js', ['AB-1', '99', '--root', root, '--cmd', 'true']).code, 1);
    assert.equal(run('run_proof.js', ['AB-1', '01', '--root', root]).code, 1);
});

test('secrets are masked in the entry, the log and the console before anything is written', () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    const env = { ...process.env, DEPLOY_TOKEN: 'tok-1234567890abcdef' };
    const cmd = 'echo "Authorization: Bearer abc123secretvalue"; echo "$DEPLOY_TOKEN"; echo password=hunter2hunter';
    const result = run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', cmd], { env });
    const spec = fs.readFileSync(path.join(dir, 'steps', '01-x.md'), 'utf8');
    const [entry] = runEntries(spec);
    const log = fs.readFileSync(path.join(dir, entry.match(/- Log: `(evidence\/[^`]+)`/)[1]), 'utf8');
    for (const text of [entry, log, result.out]) {
        assert.doesNotMatch(text, /abc123secretvalue|tok-1234567890abcdef|hunter2hunter/);
    }
    assert.match(entry, /Authorization: Bearer \[REDACTED\]/);
    assert.match(entry, /^\[REDACTED:DEPLOY_TOKEN\]$/m);
    assert.match(entry, /- Redacted: 5 secrets/);
    assert.match(result.out, /Redacted: {2}5 secrets/);
});

test('references to secrets and ordinary output stay as they are', () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    const cmd = 'echo "Authorization: Bearer $API_TOKEN"; echo "Tests: 12 passed, tokens: 1200"';
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', cmd], { env: { ...process.env, API_TOKEN: '' } });
    const [entry] = runEntries(fs.readFileSync(path.join(dir, 'steps', '01-x.md'), 'utf8'));
    assert.match(entry, /- Command: `echo "Authorization: Bearer \$API_TOKEN"; echo "Tests: 12 passed, tokens: 1200"`/);
    assert.match(entry, /^Tests: 12 passed, tokens: 1200$/m);
    assert.doesNotMatch(entry, /Redacted/);
});
