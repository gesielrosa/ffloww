'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { run, project, script } = require('./helpers');
const { DIR } = require('../scripts/lib/history');

const hook = (input) => execFileSync('node', [script('session_start.js')], { input: JSON.stringify(input), encoding: 'utf8' });

test('no .specs means no context at all', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-empty-'));
    assert.equal(hook({ cwd: empty, source: 'startup' }), '');
});

test('active tickets are listed with their next move; done tickets are not', () => {
    const { root } = project('AB-1');
    run('init_spec.js', ['AB-2', '--root', root, '--title', 'Finished work']);
    const state = (ticket, ...args) => run('state.js', [ticket, '--root', root, ...args]);
    state('AB-1', 'phase', 'plan');
    state('AB-1', 'add-step', '01', 'Add the exporter');
    state('AB-1', 'phase', 'execute');
    state('AB-1', 'step', '01', 'in-progress');
    for (const phase of ['understand', 'explore', 'plan', 'execute', 'verify', 'ship', 'done']) state('AB-2', 'phase', phase);

    const out = JSON.parse(hook({ cwd: root, source: 'clear' }));
    assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
    const text = out.hookSpecificOutput.additionalContext;
    assert.match(text, /AB-1 — AB-1 · phase execute · steps 0\/1 done · current 01 \(in-progress\) · next: \/flow:execute AB-1 — continue step 01/);
    assert.doesNotMatch(text, /AB-2/);
});

test('a broken state.md is skipped, not an error', () => {
    const { root, dir } = project('AB-1');
    fs.writeFileSync(path.join(dir, 'state.md'), 'no front matter here');
    assert.equal(hook({ cwd: root }), '');
    assert.equal(execFileSync('node', [script('session_start.js')], { input: 'garbage', encoding: 'utf8' }), '');
});

test('work in progress on an earlier record points to /flow:upgrade', () => {
    const { root } = project('AB-1');
    const contract = path.join(root, '.specs', 'CONVENTIONS.md');
    assert.doesNotMatch(hook({ cwd: root }), /flow:upgrade/);
    fs.writeFileSync(contract, '# .specs — a contract the project wrote\n');
    assert.doesNotMatch(hook({ cwd: root }), /flow:upgrade/);
    fs.writeFileSync(contract, fs.readFileSync(path.join(DIR, 'conventions', '6a95c89ef4cd5a5a.md'), 'utf8').replace('{date}', '2026-05-01'));
    const text = JSON.parse(hook({ cwd: root })).hookSpecificOutput.additionalContext;
    assert.match(text, /- AB-1 — AB-1 · phase start[^\n]*\nffloww: part of \.specs\/ was written by an earlier version of the flow: suggest \/flow:upgrade/);
});
