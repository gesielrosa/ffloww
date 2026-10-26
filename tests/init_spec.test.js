'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { run, project } = require('./helpers');
const { CONVENTIONS_TEMPLATE, conventionsFile, conventionsState, digest } = require('../scripts/init_spec');
const { DIR } = require('../scripts/lib/history');

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
