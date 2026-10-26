#!/usr/bin/env node
'use strict';

/**
 * upgrade.js — Bring a project's .specs/, written by an earlier version of the ffloww
 * flow, up to the installed one. Used by /flow:upgrade.
 *
 * It reads .specs/ and reports, item by item:
 *   [ok]      already current;
 *   [apply]   a mechanical change --apply makes: CONVENTIONS.md or a ticket's
 *             steps/_TEMPLATE.md that an earlier version wrote and nobody edited is
 *             replaced by the current one, and a state.md in an older shape is rewritten
 *             in the current format (through state.js normalize);
 *   [decide]  a change only the developer can make: local edits on an earlier contract
 *             to merge, a step status the flow does not know, a state.md it cannot read;
 *   [note]    a difference the flow works with as is.
 * Tickets in phase done are history and stay as they are. Earlier texts are recognized
 * from scripts/history/ (lib/history.js).
 *
 * Usage:
 *   node upgrade.js [--root <dir>]                        report; changes nothing
 *   node upgrade.js --apply [--root <dir>]                make the [apply] changes
 *   node upgrade.js --replace-conventions [--root <dir>]  write the current contract over
 *                                                         CONVENTIONS.md, for a merge
 *
 * Exits 0 after reporting; 1 only on bad input.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { STEP_TEMPLATE, conventionsFile, conventionsState, digest, writeFile } = require('./init_spec');
const { STATUSES, parseState, normalize, stepSpec } = require('./state');
const { shipped } = require('./lib/history');
const { headings, runEntries } = require('./lib/markdown');

const INIT_SPEC = path.join(__dirname, 'init_spec.js');
const STATE = path.join(__dirname, 'state.js');

/** The installed flow's version, from the plugin manifest. */
function version() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version;
    } catch {
        return 'unknown';
    }
}

/** Ticket folders under .specs/: the ones with a state.md. */
function ticketNames(specs) {
    if (!fs.existsSync(specs)) return [];
    return fs.readdirSync(specs).filter((name) => fs.existsSync(path.join(specs, name, 'state.md'))).sort();
}

/** The CONVENTIONS.md item. */
function conventionsItem(root) {
    const file = path.join(root, '.specs', 'CONVENTIONS.md');
    const write = () => writeFile(file, conventionsFile());
    if (!fs.existsSync(file)) return { level: 'apply', text: 'missing: write the current contract', done: 'written', run: write };
    const { kind, base } = conventionsState(fs.readFileSync(file, 'utf8'));
    const current = `node "${INIT_SPEC}" --print-conventions`;
    const replace = `node "${__filename}" --replace-conventions --root "${root}"`;
    switch (kind) {
        case 'current':
            return { level: 'ok', text: 'the current contract' };
        case 'edited':
            return { level: 'ok', text: 'the current contract, with local edits' };
        case 'earlier':
            return { level: 'apply', text: 'an earlier contract, unedited: replace it with the current one', done: 'replaced with the current contract', run: write };
        case 'edited-earlier':
            return {
                level: 'decide',
                text: [
                    'local edits on an earlier contract: merge them into the current one',
                    `the contract they started from: ${base}`,
                    `the current one: ${current}`,
                    `to write the current one and re-apply the edits kept: ${replace}`,
                ].join('\n'),
            };
        default:
            return {
                level: 'decide',
                text: [
                    'matches no contract the flow has written: carry its local rules into the current one',
                    `the current one: ${current}`,
                    `to write the current one and re-apply the rules kept: ${replace}`,
                ].join('\n'),
            };
    }
}

/** The status recorded on a spec's "- Status:" line, or null. */
function specStatus(file) {
    const line = fs.readFileSync(file, 'utf8').match(/^- Status:[ \t]*(\S+)/m);
    return line ? line[1] : null;
}

/** True when a spec's Evidence section holds content but no entry the proof runner recorded. */
function pastedEvidence(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const all = headings(lines);
    const evidence = all.find((h) => h.level === 2 && h.text.toLowerCase() === 'evidence');
    if (!evidence) return false;
    const next = all.find((h) => h.index > evidence.index && h.level <= 2);
    const content = lines.slice(evidence.index + 1, next ? next.index : lines.length).join('\n').replace(/<!--[\s\S]*?-->/g, '').trim();
    return content !== '' && runEntries(text).length === 0;
}

/** The items of one ticket: { label, items, done }. */
function ticketItems(root, name) {
    const dir = path.join(root, '.specs', name);
    const raw = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    let state;
    try {
        state = parseState(raw, { lenient: true });
    } catch (err) {
        return {
            label: name,
            items: [{ level: 'decide', text: `state.md cannot be read (${err.message}): rebuild it through the state script, then carry the record over` }],
        };
    }
    const f = state.fields;
    if (f.phase === 'done') return { label: `${name} — done, left as is`, items: [], done: true };
    const items = [];
    const which = (steps) => `${steps.length > 1 ? 'steps' : 'step'} ${steps.map((s) => s.id).join(', ')}`;

    try {
        const { text, notes } = normalize(parseState(raw, { lenient: true }), name, []);
        const unsynced = f.steps.filter((s) => {
            const file = stepSpec(dir, s.id);
            return file && specStatus(file) !== null && specStatus(file) !== s.status;
        });
        if (unsynced.length) notes.push(`Status line of ${which(unsynced)} synced`);
        if (text !== state.text || notes.length) {
            const run = () => {
                const result = spawnSync(process.execPath, [STATE, name, 'normalize', '--root', root], { encoding: 'utf8' });
                if (result.status !== 0) throw new Error(String(result.stdout).split('\n')[0]);
            };
            const detail = notes.length ? ` (${notes.join('; ')})` : '';
            items.push({ level: 'apply', text: `state.md: rewrite it in the current format${detail}`, done: `state.md rewritten in the current format${detail}`, run });
        }
    } catch (err) {
        items.push({ level: 'decide', text: `state.md: ${err.message}\nmap each with: node "${STATE}" ${name} normalize <assignment>... --root "${root}"` });
    }

    const template = path.join(dir, 'steps', '_TEMPLATE.md');
    if (fs.existsSync(template)) {
        const text = fs.readFileSync(template, 'utf8').replace(/\r\n/g, '\n');
        if (text !== STEP_TEMPLATE) {
            if (shipped('step-template', digest(text))) {
                const run = () => writeFile(template, STEP_TEMPLATE);
                items.push({ level: 'apply', text: 'steps/_TEMPLATE.md: an earlier template, unedited: replace it with the current one', done: 'steps/_TEMPLATE.md replaced with the current template', run });
            } else {
                items.push({ level: 'note', text: 'steps/_TEMPLATE.md has local edits, so it stays as is' });
            }
        }
    }

    const spec = (s) => stepSpec(dir, s.id);
    const open = f.steps.filter((s) => ['todo', 'in-progress'].includes(s.status) && spec(s) && !/^- Executor:/m.test(fs.readFileSync(spec(s), 'utf8')));
    if (open.length) items.push({ level: 'note', text: `${which(open)}: no Executor line; /flow:execute chooses who builds ${open.length > 1 ? 'each' : 'it'}` });
    const proven = f.steps.filter((s) => ['proven', 'done'].includes(s.status) && spec(s) && pastedEvidence(fs.readFileSync(spec(s), 'utf8')));
    if (proven.length) items.push({ level: 'note', text: `${which(proven)}: evidence written by hand, none recorded by the proof runner; /flow:ship reads it as it is` });

    return { label: `${name} — ${f.title || name} (phase ${f.phase})`, items };
}

/**
 * True when work in progress meets a record an earlier version of the flow wrote: its
 * CONVENTIONS.md (edited or not), or a step status the state script does not know. A
 * contract the flow did not write is left to /flow:start's warning.
 */
function needsUpgrade(root) {
    const specs = path.join(root, '.specs');
    let active = false;
    for (const name of ticketNames(specs)) {
        let fields;
        try {
            fields = parseState(fs.readFileSync(path.join(specs, name, 'state.md'), 'utf8'), { lenient: true }).fields;
        } catch {
            continue;
        }
        if (fields.phase === 'done') continue;
        active = true;
        if (fields.steps.some((s) => !STATUSES.includes(s.status))) return true;
    }
    const file = path.join(specs, 'CONVENTIONS.md');
    if (!active || !fs.existsSync(file)) return false;
    return ['earlier', 'edited-earlier'].includes(conventionsState(fs.readFileSync(file, 'utf8')).kind);
}

/** Print one item, indented, its continuation lines aligned. */
function print(level, text) {
    const [first, ...rest] = text.split('\n');
    const tag = `  [${level}] `;
    console.log(tag + first);
    for (const line of rest) console.log(' '.repeat(tag.length) + line);
}

function parseArgs(argv) {
    const out = { root: process.cwd(), apply: false, replaceConventions: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--root') out.root = argv[++i];
        else if (a === '--apply') out.apply = true;
        else if (a === '--replace-conventions') out.replaceConventions = true;
        else {
            console.log(`[error] unknown argument "${a}"`);
            console.log('Usage: node upgrade.js [--apply | --replace-conventions] [--root <dir>]');
            process.exit(1);
        }
    }
    out.root = path.resolve(out.root || '.');
    return out;
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    const specs = path.join(opts.root, '.specs');
    if (!fs.existsSync(specs)) {
        console.log(`[skip] no .specs/ under ${opts.root}: nothing to upgrade`);
        process.exit(0);
    }
    if (opts.replaceConventions) {
        writeFile(path.join(specs, 'CONVENTIONS.md'), conventionsFile());
        console.log('[ok] Wrote the current contract to .specs/CONVENTIONS.md');
        process.exit(0);
    }

    console.log(`[upgrade] .specs/ in ${opts.root}, to flow ${version()}${opts.apply ? '' : ' (report only; --apply makes the [apply] changes)'}`);
    const groups = [{ label: '.specs/CONVENTIONS.md', items: [conventionsItem(opts.root)] }];
    for (const name of ticketNames(specs)) groups.push(ticketItems(opts.root, name));

    const count = { applied: 0, apply: 0, decide: 0, failed: 0 };
    for (const { label, items, done } of groups) {
        console.log(`\n${label}`);
        if (items.length === 0 && !done) print('ok', 'current');
        for (const item of items) {
            if (item.level !== 'apply') {
                if (item.level === 'decide') count.decide++;
                print(item.level, item.text);
            } else if (!opts.apply) {
                count.apply++;
                print('apply', item.text);
            } else {
                try {
                    item.run();
                    count.applied++;
                    print('ok', item.done);
                } catch (err) {
                    count.failed++;
                    print('error', `${item.text}: ${err.message}`);
                }
            }
        }
    }

    const parts = [];
    if (count.applied) parts.push(`${count.applied} change(s) applied`);
    if (count.apply) parts.push(`${count.apply} change(s) to apply: node "${__filename}" --apply --root "${opts.root}"`);
    if (count.failed) parts.push(`${count.failed} failed`);
    if (count.decide) parts.push(`${count.decide} decision(s) for the developer ([decide])`);
    console.log(`\nSummary: ${parts.length ? parts.join('; ') : 'nothing to apply or decide; .specs/ matches this version of the flow'}.`);
    process.exit(0);
}

if (require.main === module) main();

module.exports = { needsUpgrade, pastedEvidence };
