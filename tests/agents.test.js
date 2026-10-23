'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

function agent(name) {
    const text = fs.readFileSync(path.join(ROOT, 'agents', `${name}.md`), 'utf8');
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    const field = (key) => (fm[1].match(new RegExp(`^${key}: (.*)$`, 'm')) || [])[1];
    return { body: text.slice(fm[0].length), field };
}

test('the light executor keeps the same instructions as the executor', () => {
    assert.equal(agent('step-executor-light').body, agent('step-executor').body);
});

test('each executor tier pins its model', () => {
    assert.equal(agent('step-executor').field('model'), 'sonnet');
    assert.equal(agent('step-executor-light').field('model'), 'haiku');
    assert.equal(agent('step-executor-light').field('tools'), agent('step-executor').field('tools'));
});
