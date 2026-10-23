'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const skills = fs.readdirSync(path.join(ROOT, 'skills')).filter((name) => fs.existsSync(path.join(ROOT, 'skills', name, 'SKILL.md')));
const agents = fs.readdirSync(path.join(ROOT, 'agents')).map((name) => name.replace(/\.md$/, ''));
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const frontMatter = (name) => read('skills', name, 'SKILL.md').match(/^---\n([\s\S]*?)\n---\n/)[1];

// Model-invoked: the assistant reaches these from plain requests. Every other command
// only runs when the developer types it, so no phase can start by itself.
const MODEL_INVOKED = ['context', 'status'];

test('only status and context are model-invoked; every phase is typed by the developer', () => {
    for (const name of skills) {
        const userInvoked = /^disable-model-invocation: true$/m.test(frontMatter(name));
        assert.equal(userInvoked, !MODEL_INVOKED.includes(name), `skills/${name}`);
    }
});

test('/flow:help names every command', () => {
    const help = read('skills', 'help', 'SKILL.md');
    for (const name of skills) assert.match(help, new RegExp(`/flow:${name}\\b`), `/flow:${name} missing from help`);
});

test('the next move only routes to commands that exist', () => {
    const routed = new Set([...read('scripts', 'state.js').matchAll(/'\/flow:([a-z-]+)'/g)].map((m) => m[1]));
    assert.ok(routed.size > 0);
    for (const name of routed) assert.ok(skills.includes(name), `nextMove routes to /flow:${name}, which has no skill`);
});

test('every flow:<agent> a skill dispatches exists', () => {
    for (const name of skills) {
        const named = new Set([...read('skills', name, 'SKILL.md').matchAll(/`flow:([a-z-]+)`/g)].map((m) => m[1]));
        for (const agent of named) assert.ok(agents.includes(agent), `skills/${name} names flow:${agent}, which has no agent`);
    }
});
