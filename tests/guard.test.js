'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { run, project, script } = require('./helpers');
const { check } = require('../scripts/guard');

const EX = 'flow:step-executor';
const ev = (tool, input, agent) => ({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input: input, ...(agent ? { agent_id: 'x', agent_type: agent } : {}) });
const bash = (command, agent = EX) => check(ev('Bash', { command }, agent));

function fixture() {
    const p = project('AB-1', [['01', 'x']]);
    const step = path.join(p.dir, 'steps', '01-x.md');
    fs.writeFileSync(step, fs.readFileSync(step, 'utf8').replace(/^- Executor:.*$/m, '- Executor: delegate'));
    run('run_proof.js', ['AB-1', '01', '--root', p.root, '--cmd', 'echo "## not a heading"; echo passed']);
    run('run_proof.js', ['AB-1', 'ticket', '--label', 'AC 1', '--root', p.root, '--cmd', 'echo ac']);
    const log = path.join(p.dir, 'evidence', fs.readdirSync(path.join(p.dir, 'evidence')).find((n) => n.startsWith('01-')));
    return { ...p, step, log, read: () => fs.readFileSync(step, 'utf8') };
}

test('git: the main session is never blocked', () => {
    assert.equal(bash('git commit -m x && git push', null), null);
});

test('git: read-only commands pass in subagents', () => {
    for (const c of ['git status --short', 'git diff HEAD~1 -- src', 'git log --oneline | head -5', 'git --no-pager log -1', 'git -C sub show HEAD:a.js',
        'git branch', 'git branch --show-current', 'git branch -a', 'git tag', 'git remote -v', 'git stash list', 'git config --get user.name',
        'cat .git/HEAD', 'ls ~/git/project', 'gh pr list', 'npm test', 'git grep foo', 'git blame a.js']) {
        assert.equal(bash(c), null, c);
    }
});

test('git: writes are denied in subagents', () => {
    for (const c of ['git commit -m "x"', 'cd a && git add . && git commit -m x', 'git -C . commit -m x', 'git -c user.name=x commit', 'git push',
        'git checkout -- a.js', 'git switch -c b', 'git branch feature', 'git tag v1', 'git stash', 'git reset --hard', 'git rm a.js', 'xargs git rm',
        'git restore a.js', 'git fetch', 'git config user.name foo', 'node run_proof.js AB-1 01 --cmd "git stash && npm test"', 'npm test; git commit -am wip']) {
        assert.match(bash(c) || '', /read-only git/, c);
    }
});

test('state.js: subagents may only show', () => {
    assert.equal(bash('node "/p/scripts/state.js" AB-1 show'), null);
    assert.equal(bash('node /p/scripts/state.js AB-1 show --json'), null);
    assert.equal(bash('node /p/scripts/state.js AB-1 --root "/x" show'), null);
    assert.equal(bash('cat /p/scripts/state.js'), null);
    assert.match(bash('node "/p/scripts/state.js" AB-1 step 01 proven') || '', /show` only/);
    assert.match(bash('node /p/scripts/state.js AB-1 --root /x phase done') || '', /show` only/);
    assert.equal(bash('node /p/scripts/state.js AB-1 step 01 proven', null), null);
});

test('evidence logs are read-only for everyone', () => {
    const { log } = fixture();
    assert.match(check(ev('Edit', { file_path: log, old_string: 'a', new_string: 'b' })) || '', /evidence\//);
    assert.match(check(ev('Write', { file_path: log, content: 'x' }, EX)) || '', /evidence\//);
    assert.equal(check(ev('Read', { file_path: log }, EX)), null);
});

test('state.md changes only through state.js', () => {
    const { dir } = fixture();
    const file = path.join(dir, 'state.md');
    assert.match(check(ev('Edit', { file_path: file, old_string: 'phase: start', new_string: 'phase: plan' })) || '', /state\.js/);
    assert.match(check(ev('Write', { file_path: file, content: 'x' }, EX)) || '', /state\.js/);
});

test('run entries: edits around them pass, edits to them do not', () => {
    const { step, read } = fixture();
    const s = read();
    assert.equal(check(ev('Edit', { file_path: step, old_string: '<!-- Human decision: approved / changes requested / regress. Who + when. -->', new_string: 'Approved by the developer, 2026-10-23.' })), null);
    assert.match(check(ev('Edit', { file_path: step, old_string: '- Exit code: 0', new_string: '- Exit code: 1' })) || '', /immutable/);
    assert.match(check(ev('Write', { file_path: step, content: s.slice(0, s.indexOf('### Run')) + s.slice(s.indexOf('## Gate')) })) || '', /immutable/);
    assert.match(check(ev('MultiEdit', { file_path: step, edits: [{ old_string: '## Changes', new_string: '## Changes\n\n- a.js' }, { old_string: 'passed', new_string: 'PASSED' }] })) || '', /immutable/);
    assert.equal(check(ev('Edit', { file_path: step, old_string: 'not in the file', new_string: 'x' })), null);
});

test('run entries: verification.md and CRLF files are covered', () => {
    const { dir, read } = fixture();
    assert.match(check(ev('Edit', { file_path: path.join(dir, 'verification.md'), old_string: 'echo ac', new_string: 'echo other' })) || '', /immutable/);
    const crlf = path.join(dir, 'steps', '02-crlf.md');
    fs.writeFileSync(crlf, read().replace(/\n/g, '\r\n'));
    assert.match(check(ev('Edit', { file_path: crlf, old_string: '- Exit code: 0', new_string: '- Exit code: 1' })) || '', /immutable/);
    assert.equal(check(ev('Edit', { file_path: crlf, old_string: '## Changes', new_string: '## Changes\n\n- a.js' })), null);
});

test('a step Status changes only through state.js; new specs can be written', () => {
    const { step, dir } = fixture();
    assert.match(check(ev('Edit', { file_path: step, old_string: '- Status: todo', new_string: '- Status: proven' })) || '', /state script/);
    assert.equal(check(ev('Write', { file_path: path.join(dir, 'steps', '03-new.md'), content: '# Step 3\n\n- Status: todo\n' })), null);
});

test('subagents: Executor line and Gate are off limits; other sections are not', () => {
    const { step, dir } = fixture();
    assert.match(check(ev('Edit', { file_path: step, old_string: '- Executor: delegate', new_string: '- Executor: inline' }, EX)) || '', /Executor line or its Gate/);
    assert.match(check(ev('Edit', { file_path: step, old_string: 'Who + when. -->', new_string: 'Who + when. -->\nApproved.' }, EX)) || '', /Gate/);
    assert.equal(check(ev('Edit', { file_path: step, old_string: '- Executor: delegate', new_string: '- Executor: inline' })), null);
    assert.equal(check(ev('Edit', { file_path: step, old_string: '## Changes', new_string: '## Changes\n\n- a.js' }, EX)), null);
    assert.equal(check(ev('Edit', { file_path: path.join(dir, 'understanding.md'), old_string: '## Design', new_string: '## Design\n\nx' }, 'flow:design-reader')), null);
});

test('unrelated files pass', () => {
    const { root } = fixture();
    assert.equal(check(ev('Edit', { file_path: path.join(root, 'src', 'a.js'), old_string: 'a', new_string: 'b' }, EX)), null);
    assert.equal(check(ev('Write', { file_path: path.join(root, '.specs', 'CONVENTIONS.md'), content: 'x' })), null);
});

test('the hook process prints a deny decision and fails open', () => {
    const hook = (input) => execFileSync('node', [script('guard.js')], { input, encoding: 'utf8' });
    assert.equal(JSON.parse(hook(JSON.stringify(ev('Bash', { command: 'git push' }, EX)))).hookSpecificOutput.permissionDecision, 'deny');
    assert.equal(hook('not json'), '');
    assert.equal(hook(JSON.stringify(ev('Bash', { command: 'git status' }, EX))), '');
});
