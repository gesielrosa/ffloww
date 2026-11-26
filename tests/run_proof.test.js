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

test("a chained or piped command is noted, since its exit code is the last part's", () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    const piped = run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', 'false | true']);
    assert.match(piped.out, /Exit code: 0\n {3}Note: {6}the exit code is the last part's \(the command chains with "\|"\)/);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', "true && echo 'a; b | c'"]);
    const [first, second] = runEntries(fs.readFileSync(path.join(dir, 'steps', '01-x.md'), 'utf8'));
    assert.match(first, /- Exit code: 0\n- Note: the exit code is the last part's/);
    assert.doesNotMatch(second, /- Note:/);
});

const entriesOf = (dir, file) => runEntries(fs.readFileSync(path.join(dir, file), 'utf8'));

test('--expect records the exit code that passes and whether it was met', () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'a.js'), 'const legacyExport = 1;\n');
    const miss = run('run_proof.js', ['AB-1', '01', '--root', root, '--expect', '1', '--cmd', 'grep -rn nothingHere src/']);
    assert.match(miss.out, /Exit code: 1\n {3}Expected: {2}exit code 1 \(met\)/);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--expect', '1', '--cmd', 'grep -rn legacyExport no-such-dir/']);
    const [met, unmet] = entriesOf(dir, 'steps/01-x.md');
    assert.match(met, /- Exit code: 1\n- Expected: exit code 1 \(met\)\n- Duration/);
    assert.match(unmet, /- Exit code: 2\n- Expected: exit code 1 \(not met\)\n- Note: the exit code is not the expected one/);
    assert.equal(run('run_proof.js', ['AB-1', '01', '--root', root, '--expect', 'one', '--cmd', 'true']).code, 1);
    assert.equal(run('run_proof.js', ['AB-1', '01', '--root', root, '--expect', '300', '--cmd', 'true']).code, 1);
});

test('a red run has to fail: one that passes is noted as a proof that cannot fail', () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--red', '--cmd', 'exit 1']);
    const passing = run('run_proof.js', ['AB-1', '01', '--root', root, '--red', '--label', 'AC 2', '--cmd', 'true']);
    assert.match(passing.out, /Note: {6}the proof already passes without the change, so it cannot fail on it/);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--red', '--expect', '1', '--cmd', 'true']);
    const [red, green, found] = entriesOf(dir, 'steps/01-x.md');
    assert.match(red, /^### Run \S+Z — red: before the change\n\n- Command: `exit 1`\n- Exit code: 1\n- Expected: a non-zero exit code, before the change \(met\)\n- Duration/);
    assert.match(green, /^### Run \S+Z — red: before the change — AC 2\n/);
    assert.match(green, /- Expected: a non-zero exit code, before the change \(not met\)\n- Note: the proof already passes without the change/);
    assert.match(found, /- Exit code: 0\n- Expected: an exit code other than 1, before the change \(met\)\n- Duration/);
});

test('a negated command and a command the shell did not find are noted', () => {
    const { root, dir } = project('AB-1', [['01', 'x']]);
    const negated = run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', '! no_such_tool_xyz pattern src/']);
    assert.match(negated.out, /Exit code: 0\n {3}Note: {6}the command is negated with "!"[^\n]*; run the plain command with --expect <code>\n {3}Note: {6}the output shows a command the shell did not find/);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', 'no_such_tool_xyz pattern src/']);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', "echo 'usage: ! is not negation here' && echo 'cli: command not found: foo'"]);
    run('run_proof.js', ['AB-1', '01', '--root', root, '--cmd', 'true && ! false']);
    const [first, missing, plain, inner] = entriesOf(dir, 'steps/01-x.md');
    assert.match(first, /- Note: the command is negated with "!", so it also passes when the command cannot run or reads nothing\n- Note: the output shows a command the shell did not find \("[^"]*no_such_tool_xyz[^"]*"\), so the proof may not have run/);
    assert.match(missing, /- Exit code: 127\n- Note: exit code 127 means the shell did not find a command \("[^"]*no_such_tool_xyz[^"]*"\), so the proof may not have run/);
    assert.doesNotMatch(plain, /- Note:/, 'a plain command that exits 0 ran, whatever its output says');
    assert.match(inner, /- Note: the command is negated with "!"/);
});

test('the plan target records baseline runs in plan.md', () => {
    const { root, dir } = project();
    const result = run('run_proof.js', ['AB-1', 'plan', '--root', root, '--label', 'baseline: lint', '--cmd', 'echo linted']);
    assert.match(result.out, /Evidence recorded in \.specs[\\/]AB-1[\\/]plan\.md/);
    const text = fs.readFileSync(path.join(dir, 'plan.md'), 'utf8');
    assert.match(text, /## Evidence\n[\s\S]*### Run \S+Z — baseline: lint\n\n- Command: `echo linted`\n- Exit code: 0/);
    assert.match(text, /- Log: `evidence\/plan-\d{8}-\d{6}\.log`/);
});
