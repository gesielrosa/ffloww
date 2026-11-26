'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run, project } = require('./helpers');
const { CONVENTIONS_TEMPLATE, conventionsFile, conventionsState, digest } = require('../scripts/init_spec');
const { DIR } = require('../scripts/lib/history');
const { PROFILE_TEMPLATE, setting, readProfile } = require('../scripts/lib/profile');

const conventions = (root) => path.join(root, '.specs', 'CONVENTIONS.md');

test('CONVENTIONS.md is written with a stamp, and a re-run leaves a current one alone', () => {
    const { root } = project();
    assert.equal(fs.readFileSync(conventions(root), 'utf8'), conventionsFile());
    assert.match(run('init_spec.js', ['AB-2', '--root', root]).out, /\[skip\] \.specs\/CONVENTIONS\.md is current/);
});

test('an unedited CONVENTIONS.md from an older flow is refreshed', () => {
    const { root } = project();
    const old = '# old contract\n';
    fs.writeFileSync(conventions(root), `<!-- ffloww:conventions sha256:${digest(old)} — note -->\n${old}`);
    assert.match(run('init_spec.js', ['AB-2', '--root', root]).out, /\[ok\] Updated \.specs\/CONVENTIONS\.md/);
    assert.equal(fs.readFileSync(conventions(root), 'utf8'), conventionsFile());
});

test('an unstamped CONVENTIONS.md an earlier flow wrote is refreshed', () => {
    const { root } = project();
    const earlier = fs.readFileSync(path.join(DIR, 'conventions', '6a95c89ef4cd5a5a.md'), 'utf8').replace('{date}', '2026-05-01');
    fs.writeFileSync(conventions(root), earlier.replace(/\n/g, '\r\n'));
    assert.match(run('init_spec.js', ['AB-2', '--root', root]).out, /\[ok\] Updated \.specs\/CONVENTIONS\.md/);
    assert.equal(fs.readFileSync(conventions(root), 'utf8'), conventionsFile());
});

test('an edited CONVENTIONS.md is kept; edits on an earlier contract point to /flow:upgrade', () => {
    const { root } = project();
    const edited = `${conventionsFile()}\n## Our team rule\n`;
    fs.writeFileSync(conventions(root), edited);
    assert.match(run('init_spec.js', ['AB-2', '--root', root]).out, /\[skip\] \.specs\/CONVENTIONS\.md has local edits on the current contract/);
    assert.equal(fs.readFileSync(conventions(root), 'utf8'), edited);

    const earlier = fs.readFileSync(path.join(DIR, 'conventions', '14b64f4dd7c386da.md'), 'utf8').replace('{date}', '2026-09-01');
    fs.writeFileSync(conventions(root), `${earlier}\n## Our team rule\n`);
    assert.match(run('init_spec.js', ['AB-3', '--root', root]).out, /\[warn\] \.specs\/CONVENTIONS\.md has local edits on an earlier contract.*\/flow:upgrade/);
    assert.deepEqual(conventionsState(fs.readFileSync(conventions(root), 'utf8')), { kind: 'edited-earlier', base: path.join(DIR, 'conventions', '14b64f4dd7c386da.md') });

    fs.writeFileSync(conventions(root), '# .specs — conventions from an older flow\n');
    assert.match(run('init_spec.js', ['AB-4', '--root', root]).out, /\[warn\] .*matches no contract the flow has written.*--print-conventions/);
});

test('--print-conventions prints the current contract', () => {
    assert.equal(run('init_spec.js', ['--print-conventions']).out, CONVENTIONS_TEMPLATE);
});

const profile = (root) => path.join(root, '.specs', 'PROJECT.md');

test('the project profile is written once and then left to the project', () => {
    const { root } = project();
    assert.equal(fs.readFileSync(profile(root), 'utf8'), PROFILE_TEMPLATE);
    fs.writeFileSync(profile(root), '# Project profile\n\n- Fast ends at: 60 s\n');
    assert.doesNotMatch(run('init_spec.js', ['AB-2', '--root', root]).out, /PROJECT\.md/);
    assert.equal(fs.readFileSync(profile(root), 'utf8'), '# Project profile\n\n- Fast ends at: 60 s\n');

    fs.rmSync(profile(root));
    assert.match(run('init_spec.js', ['AB-2', '--root', root]).out, /\[ok\] Created \.specs\/PROJECT\.md[\s\S]*AB-2 already initialized/);
    assert.equal(fs.readFileSync(profile(root), 'utf8'), PROFILE_TEMPLATE);
});

test('a new ticket takes the commit policy the profile sets', () => {
    const { root } = project();
    const commit = (ticket) => fs.readFileSync(path.join(root, '.specs', ticket, 'state.md'), 'utf8').match(/^commit: (.*)$/m)[1];
    assert.equal(commit('AB-1'), 'per-step');

    fs.writeFileSync(profile(root), PROFILE_TEMPLATE.replace('- Policy: per-step', '- Policy: at-end'));
    assert.match(run('init_spec.js', ['AB-2', '--root', root]).out, /\[ok\] Commit policy at-end, from \.specs\/PROJECT\.md/);
    assert.equal(commit('AB-2'), 'at-end');
    assert.match(run('state.js', ['AB-2', 'show', '--root', root]).out, /commit: at-end/);

    fs.writeFileSync(profile(root), PROFILE_TEMPLATE.replace('- Policy: per-step', '- Policy: whenever'));
    run('init_spec.js', ['AB-3', '--root', root]);
    assert.equal(commit('AB-3'), 'per-step', 'a policy the flow does not know falls back to the default');
});

test('the profile\'s settings are read without their comments', () => {
    assert.deepEqual(readProfile(project().root), { exists: true, commit: 'per-step', base: '' });
    assert.equal(setting(PROFILE_TEMPLATE, 'Base branch'), '');
    assert.equal(setting('- Base branch: `origin/main` <!-- the default -->\n', 'base branch'), 'origin/main');
    assert.equal(setting('## Commits\r\n\r\n- Policy: at-end\r\n', 'Policy'), 'at-end');
    assert.deepEqual(readProfile(fs.mkdtempSync(path.join(os.tmpdir(), 'ffloww-none-'))), { exists: false, commit: '', base: '' });
});
