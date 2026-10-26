'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run } = require('./helpers');
const { CONVENTIONS_TEMPLATE, STEP_TEMPLATE, conventionsFile } = require('../scripts/init_spec');
const { DIR, digest, all } = require('../scripts/lib/history');
const { needsUpgrade, pastedEvidence } = require('../scripts/upgrade');

const shippedText = (kind, hash) => fs.readFileSync(path.join(DIR, kind, `${hash}.md`), 'utf8');

/** A project as flow 0.1 left it: an edited contract, a hand-written state, pasted evidence. */
function legacy() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-legacy-'));
    const specs = path.join(root, '.specs');
    const dir = path.join(specs, 'OLD-1');
    fs.mkdirSync(path.join(dir, 'steps'), { recursive: true });
    const contract = shippedText('conventions', '6a95c89ef4cd5a5a').replace('{date}', '2026-05-01');
    fs.writeFileSync(path.join(specs, 'CONVENTIONS.md'), `${contract}\n## Team rules\n\n- Run the linter before every proof.\n`);
    fs.writeFileSync(path.join(dir, 'state.md'), [
        '---',
        'ticket: "OLD-1"',
        'title: "Export invoices"',
        'created: "2026-05-01"',
        'phase: execute',
        'design_involved: false',
        'proof_definition: "npm test"',
        'current_step: 02',
        'steps:',
        '  - id: 01',
        '    title: Add the exporter',
        '    status: done',
        '  - id: 02',
        '    title: Wire the button',
        '    status: blocked',
        '  - id: 03',
        '    title: Document it',
        '    status: todo',
        '---',
        '',
        '# OLD-1 — Export invoices',
        '',
        '## Where we are',
        '',
        'Phase: **execute**. Next: run `flow-execute` for step 02.',
        '',
        '## Navigation log',
        '',
        '- 2026-05-01 — flow initialized (phase: start)',
        '',
    ].join('\n'));
    const template = shippedText('step-template', '89b3cb6943e1eb0f');
    fs.writeFileSync(path.join(dir, 'steps', '_TEMPLATE.md'), template);
    const spec = (n, title, status) => template.replace('<n>', n).replace('<title>', title).replace('Status: todo', `Status: ${status}`);
    fs.writeFileSync(path.join(dir, 'steps', '01-exporter.md'), spec('1', 'Add the exporter', 'done').replace('## Gate', '$ npm test\n# pass 12\nexit 0\n\n## Gate'));
    fs.writeFileSync(path.join(dir, 'steps', '02-button.md'), spec('2', 'Wire the button', 'todo'));
    fs.writeFileSync(path.join(dir, 'steps', '03-docs.md'), spec('3', 'Document it', 'todo'));
    run('init_spec.js', ['DONE-1', '--root', root]);
    for (const phase of ['understand', 'explore', 'plan', 'execute', 'verify', 'ship', 'done']) run('state.js', ['DONE-1', 'phase', phase, '--root', root]);
    return { root, specs, dir };
}

/** Every file under a folder, as { relative path: text }. */
function snapshot(root) {
    const out = {};
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(file);
            else out[path.relative(root, file)] = fs.readFileSync(file, 'utf8');
        }
    };
    walk(root);
    return out;
}

test('every shipped text is named by its digest, and the current ones are among them', () => {
    for (const kind of ['conventions', 'step-template']) {
        for (const { file, text } of all(kind)) assert.equal(path.basename(file), `${digest(text)}.md`, file);
    }
    const missing = (kind, text) => `the current ${kind} is not in scripts/history/${kind}/: save it there as ${digest(text)}.md, so projects on this version can upgrade from it`;
    assert.ok(fs.existsSync(path.join(DIR, 'conventions', `${digest(CONVENTIONS_TEMPLATE)}.md`)), missing('conventions', CONVENTIONS_TEMPLATE));
    assert.ok(fs.existsSync(path.join(DIR, 'step-template', `${digest(STEP_TEMPLATE)}.md`)), missing('step-template', STEP_TEMPLATE));
});

test('the report names what --apply changes and what the developer decides, and changes nothing', () => {
    const { root } = legacy();
    const before = snapshot(root);
    const { code, out } = run('upgrade.js', ['--root', root]);
    assert.equal(code, 0);
    assert.match(out, /\.specs\/CONVENTIONS\.md\n {2}\[decide\] local edits on an earlier contract[\s\S]*history\/conventions\/6a95c89ef4cd5a5a\.md[\s\S]*--replace-conventions/);
    assert.match(out, /OLD-1 — Export invoices \(phase execute\)\n {2}\[decide\] state\.md: step 02 has an unknown status "blocked"[\s\S]*state\.js" OLD-1 normalize <assignment>/);
    assert.match(out, /\[apply\] steps\/_TEMPLATE\.md: an earlier template, unedited/);
    assert.match(out, /\[note\] step 03: no Executor line/);
    assert.match(out, /\[note\] step 01: evidence written by hand/);
    assert.match(out, /DONE-1 — done, left as is/);
    assert.match(out, /Summary: 1 change\(s\) to apply: .*--apply.*; 2 decision\(s\) for the developer/);
    assert.deepEqual(snapshot(root), before);
});

test('--apply, the mapping and the merge bring the record up to date', () => {
    const { root, specs, dir } = legacy();
    const done = fs.readFileSync(path.join(specs, 'DONE-1', 'state.md'), 'utf8');
    assert.match(run('upgrade.js', ['--apply', '--root', root]).out, /\[ok\] steps\/_TEMPLATE\.md replaced with the current template[\s\S]*Summary: 1 change\(s\) applied; 2 decision/);
    assert.equal(fs.readFileSync(path.join(dir, 'steps', '_TEMPLATE.md'), 'utf8'), STEP_TEMPLATE);

    assert.equal(run('state.js', ['OLD-1', 'normalize', '02=in-progress', '--root', root]).code, 0);
    assert.equal(run('upgrade.js', ['--replace-conventions', '--root', root]).code, 0);
    assert.equal(fs.readFileSync(path.join(specs, 'CONVENTIONS.md'), 'utf8'), conventionsFile());
    fs.appendFileSync(path.join(specs, 'CONVENTIONS.md'), '\n## Team rules\n\n- Run the linter before every proof.\n');

    const { out } = run('upgrade.js', ['--root', root]);
    assert.match(out, /\[ok\] the current contract, with local edits/);
    assert.doesNotMatch(out, /^ {2}\[(apply|decide)\]/m);
    assert.match(out, /\[note\] steps 02, 03: no Executor line/);
    assert.match(run('state.js', ['OLD-1', 'show', '--root', root]).out, /Next: \/flow:execute OLD-1 — continue step 02/);
    assert.equal(fs.readFileSync(path.join(specs, 'DONE-1', 'state.md'), 'utf8'), done);
});

test('a state.md in the 0.2 shape is rewritten by --apply; a current project has nothing to do', () => {
    const { root, specs } = legacy();
    fs.rmSync(path.join(specs, 'OLD-1'), { recursive: true });
    fs.writeFileSync(path.join(specs, 'CONVENTIONS.md'), conventionsFile());
    run('init_spec.js', ['NEW-1', '--root', root]);
    const file = path.join(specs, 'NEW-1', 'state.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('route: full\n', ''));
    assert.match(run('upgrade.js', ['--root', root]).out, /\[apply\] state\.md: rewrite it in the current format/);
    assert.match(run('upgrade.js', ['--apply', '--root', root]).out, /\[ok\] state\.md rewritten in the current format/);
    assert.match(fs.readFileSync(file, 'utf8'), /^route: full$/m);
    assert.match(run('upgrade.js', ['--root', root]).out, /Summary: nothing to apply or decide/);
});

test('a project without .specs has nothing to upgrade', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-empty-'));
    assert.match(run('upgrade.js', ['--root', empty]).out, /\[skip\] no \.specs\//);
    assert.equal(needsUpgrade(empty), false);
});

test('an upgrade is needed only while work in progress meets an earlier record', () => {
    const { root, specs } = legacy();
    assert.equal(needsUpgrade(root), true);
    run('state.js', ['OLD-1', 'normalize', '02=todo', '--root', root]);
    assert.equal(needsUpgrade(root), true, 'the earlier contract is still there');
    fs.writeFileSync(path.join(specs, 'CONVENTIONS.md'), `${conventionsFile()}\n## Team rules\n`);
    assert.equal(needsUpgrade(root), false);
    fs.writeFileSync(path.join(specs, 'CONVENTIONS.md'), shippedText('conventions', '6a95c89ef4cd5a5a'));
    fs.rmSync(path.join(specs, 'OLD-1'), { recursive: true });
    assert.equal(needsUpgrade(root), false, 'only done tickets are left');
});

test('evidence written by hand is told apart from the runner\'s entries', () => {
    const spec = (evidence) => `# Step 1\n\n## Evidence\n\n<!-- RAW entries -->\n${evidence}\n## Gate\n\nok\n`;
    assert.equal(pastedEvidence(spec('$ npm test\nexit 0\n')), true);
    assert.equal(pastedEvidence(spec('')), false);
    assert.equal(pastedEvidence(spec('### Run 2026-10-23T18:42:10Z\n\n- Command: `npm test`\n')), false);
});
