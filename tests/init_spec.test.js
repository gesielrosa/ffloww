'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { run, project } = require('./helpers');
const { CONVENTIONS_TEMPLATE, conventionsFile, digest } = require('../scripts/init_spec');

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

test('an edited or unstamped CONVENTIONS.md is kept, with a warning', () => {
    const { root } = project();
    const edited = `${conventionsFile()}\n## Our team rule\n`;
    fs.writeFileSync(conventions(root), edited);
    assert.match(run('init_spec.js', ['AB-2', '--root', root]).out, /\[warn\] \.specs\/CONVENTIONS\.md has local edits/);
    assert.equal(fs.readFileSync(conventions(root), 'utf8'), edited);

    fs.writeFileSync(conventions(root), '# .specs — conventions from an older flow\n');
    assert.match(run('init_spec.js', ['AB-3', '--root', root]).out, /\[warn\] .*predates this version of the flow.*--print-conventions/);
});

test('--print-conventions prints the current contract', () => {
    assert.equal(run('init_spec.js', ['--print-conventions']).out, CONVENTIONS_TEMPLATE);
});
