'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { run, project } = require('./helpers');
const { parseState, frontMatter, nextMove } = require('../scripts/state');

function setup() {
    const p = project('AB-1', [['01', 'exporter'], ['02', 'button']]);
    const state = (...args) => run('state.js', ['AB-1', '--root', p.root, ...args]);
    const read = () => fs.readFileSync(path.join(p.dir, 'state.md'), 'utf8');
    return { ...p, state, read };
}

test('a fresh state parses and round-trips', () => {
    const { read } = setup();
    const s = parseState(read());
    assert.equal(s.fields.phase, 'start');
    assert.equal(s.fields.current_step, null);
    assert.equal(s.fields.proof_definition, '');
    assert.deepEqual(s.fields.steps, []);
    assert.equal(frontMatter(s.fields, s.extra), read().match(/^---\n[\s\S]*?\n---\n/)[0]);
});

test('phases move forward freely; back needs a reason', () => {
    const { state, read } = setup();
    assert.equal(state('phase', 'understand').code, 0);
    assert.equal(state('phase', 'plan').code, 0);
    const back = state('phase', 'explore');
    assert.equal(back.code, 1);
    assert.match(back.out, /regression: pass --reason/);
    assert.equal(state('phase', 'explore', '--reason', 'missed a caller').code, 0);
    assert.match(read(), /- \d{4}-\d{2}-\d{2} — \(regression\) plan → explore: missed a caller/);
    assert.equal(state('phase', 'nowhere').code, 1);
});

test('execute and verify go back and forth without a reason', () => {
    const { state } = setup();
    state('phase', 'execute');
    assert.equal(state('phase', 'verify').code, 0);
    assert.equal(state('phase', 'execute').code, 0);
});

test('steps move one status at a time, one in progress, and sync the spec', () => {
    const { state, read, dir } = setup();
    state('add-step', '01', 'Add', 'the', 'exporter');
    state('add-step', '02', 'Wire the button');
    assert.equal(state('add-step', '02', 'dup').code, 1);
    assert.equal(state('step', '01', 'proven').code, 1);
    assert.equal(state('step', '01', 'in-progress').code, 0);
    assert.match(state('step', '02', 'in-progress').out, /step 01 is in progress/);
    assert.equal(state('step', '01', 'proven').code, 0);
    assert.match(fs.readFileSync(path.join(dir, 'steps', '01-exporter.md'), 'utf8'), /^- Status: proven <!--/m);
    assert.equal(parseState(read()).fields.current_step, '01');
    assert.equal(state('step', '01', 'done').code, 0);
    assert.equal(parseState(read()).fields.current_step, null);
    assert.equal(state('step', '01', 'todo').code, 1);
    assert.equal(state('step', '01', 'in-progress', '--reason', 'review found a bug').code, 0);
    assert.equal(parseState(read()).fields.steps[0].title, 'Add the exporter');
});

test('the next step starts once the proven one is committed, or with a reason', () => {
    const { state, read } = setup();
    state('add-step', '01', 'One');
    state('add-step', '02', 'Two');
    state('step', '01', 'in-progress');
    state('step', '01', 'proven');
    const early = state('step', '02', 'in-progress');
    assert.equal(early.code, 1);
    assert.match(early.out, /step 01 is proven but not done: commit it/);
    assert.equal(state('step', '02', 'in-progress', '--reason', 'one commit for both').code, 0);
    assert.match(read(), /step 02: todo → in-progress: one commit for both/);
});

test('remove-step only for todo steps, with a reason', () => {
    const { state, read } = setup();
    state('add-step', '01', 'One');
    state('add-step', '02', 'Two');
    assert.equal(state('remove-step', '02').code, 1);
    assert.equal(state('remove-step', '02', '--reason', 'merged into 01').code, 0);
    state('step', '01', 'in-progress');
    assert.equal(state('remove-step', '01', '--reason', 'x').code, 1);
    assert.equal(parseState(read()).fields.steps.length, 1);
});

test('set validates design_involved; repeated values are a no-op', () => {
    const { state, read } = setup();
    assert.equal(state('set', 'design_involved', 'maybe').code, 1);
    assert.equal(state('set', 'design_involved', 'true').code, 0);
    assert.equal(state('set', 'proof_definition', 'pnpm', 'test').code, 0);
    assert.equal(state('set', 'phase', 'done').code, 1);
    assert.equal(parseState(read()).fields.proof_definition, 'pnpm test');
    assert.match(state('phase', 'start').out, /\[skip\]/);
});

test('show reports the next move', () => {
    const { state } = setup();
    state('phase', 'understand');
    state('set', 'design_involved', 'true');
    assert.match(state('show').out, /Next: \/flow:design AB-1 — /);
    const json = JSON.parse(state('show', '--json').out);
    assert.equal(json.next.skill, '/flow:design');
});

test('a shipped ticket points to the optional retro', () => {
    const { state } = setup();
    for (const phase of ['understand', 'explore', 'plan', 'execute', 'verify', 'ship']) state('phase', phase);
    assert.match(state('show').out, /Next: ship it your way, then mark the phase done/);
    state('phase', 'done');
    assert.match(state('show').out, /Next: \/flow:retro AB-1 — look back at the record/);
});

test('the short route skips explore and the whole-ticket verify; the full route keeps both', () => {
    const routes = {};
    for (const route of ['full', 'short']) {
        const { state, read } = setup();
        state('phase', 'understand');
        state('set', 'design_involved', 'false');
        assert.equal(state('set', 'route', route).code, 0);
        const afterUnderstand = state('show').out;
        state('phase', 'plan');
        state('add-step', '01', 'One');
        state('phase', 'execute');
        for (const status of ['in-progress', 'proven', 'done']) state('step', '01', status);
        routes[route] = { afterUnderstand, afterSteps: state('show').out, file: read() };
    }
    assert.match(routes.full.afterUnderstand, /Next: \/flow:explore AB-1/);
    assert.match(routes.full.afterSteps, /Next: \/flow:verify AB-1/);
    assert.match(routes.short.afterUnderstand, /route: short[\s\S]*Next: \/flow:plan AB-1 — map the small change/);
    assert.match(routes.short.afterSteps, /Next: \/flow:ship AB-1/);
    assert.match(routes.short.file, /^route: short$/m);
    assert.equal(setup().state('set', 'route', 'shortest').code, 1);
});

test('Where we are is regenerated and the log keeps history', () => {
    const { state, read } = setup();
    state('phase', 'understand');
    state('set', 'design_involved', 'false');
    state('log', 'context added by the developer');
    const text = read();
    assert.match(text, /## Where we are\n\nPhase: \*\*understand\*\*\.\nNext: run `\/flow:explore AB-1`/);
    assert.match(text, /flow initialized \(phase: start\)\n- \d{4}-\d{2}-\d{2} — start → understand\n- \d{4}-\d{2}-\d{2} — context added by the developer\n$/);
});

test('reads the step shapes models write by hand, and keeps extra keys', () => {
    const text = [
        '---',
        'ticket: AB-2',
        "title: 'It''s a title'",
        'created: "2026-01-01"',
        'phase: execute',
        'design_involved: false',
        'proof_definition: "npm test"',
        'current_step: "02"',
        'owner: "gesiel"',
        'steps:',
        '  - id: "01"; title: "Semicolons"; status: done',
        '  - id: "02"',
        '    title: Block map',
        '    status: in-progress',
        '  - { id: "03", title: "Flow, with comma", status: todo }',
        '---',
        '',
        '# AB-2',
        '',
    ].join('\n');
    const s = parseState(text);
    assert.equal(s.fields.title, "It's a title");
    assert.deepEqual(s.fields.steps.map((x) => [x.id, x.title, x.status]), [
        ['01', 'Semicolons', 'done'],
        ['02', 'Block map', 'in-progress'],
        ['03', 'Flow, with comma', 'todo'],
    ]);
    assert.match(frontMatter(s.fields, s.extra), /owner: "gesiel"\n---\n$/);
    assert.equal(nextMove(s.fields).skill, '/flow:execute');
});

test('a title with quotes stays valid', () => {
    const p = project('AB-3');
    run('init_spec.js', ['AB-4', '--root', p.root, '--title', 'Add "CSV" export']);
    const s = parseState(fs.readFileSync(path.join(p.root, '.specs', 'AB-4', 'state.md'), 'utf8'));
    assert.equal(s.fields.title, 'Add "CSV" export');
});
