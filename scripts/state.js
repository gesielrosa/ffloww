#!/usr/bin/env node
'use strict';

/**
 * state.js — Read and update a ticket's .specs/<ticket-id>/state.md for the ffloww flow.
 *
 * Every change to state.md goes through here, so the front matter stays valid YAML,
 * phase and step transitions are checked, the step specs' Status lines stay in sync,
 * the navigation log is appended, and "Where we are" always matches the state.
 *
 * Usage:
 *   node state.js <ticket-id> show [--json]
 *   node state.js <ticket-id> phase <phase> [--reason <text>] [--note <text>]
 *   node state.js <ticket-id> set <design_involved|route|proof_definition|title> <value>
 *   node state.js <ticket-id> add-step <id> <title>
 *   node state.js <ticket-id> remove-step <id> --reason <text>
 *   node state.js <ticket-id> step <id> <todo|in-progress|proven|done> [--reason <text>] [--note <text>]
 *   node state.js <ticket-id> log <text>
 *   (every command takes --root <dir>; default: the current directory)
 *
 * Examples:
 *   node state.js AB-1234 phase plan
 *   node state.js AB-1234 add-step 01 "Add the CSV exporter"
 *   node state.js AB-1234 step 01 in-progress
 *   node state.js AB-1234 phase plan --reason "step 02 showed the exporter cannot stream"
 *
 * Rules: phases move forward freely and between execute and verify; moving back is a
 * regression and needs --reason. A step moves one status forward at a time
 * (todo -> in-progress -> proven -> done); moving it back needs --reason. Only one step
 * is in progress at a time, and a step starts after the previous proven one is done
 * (committed), so each step's diff stands alone; starting anyway needs --reason.
 *
 * Route: "full" (the default) runs every phase. "short", chosen by the developer for a
 * small, clear change, goes from understand (and design, if any) straight to plan, and
 * from the last step to ship, since the step gates already proved the criteria.
 */

const fs = require('node:fs');
const path = require('node:path');

const PHASES = ['start', 'understand', 'design', 'explore', 'plan', 'execute', 'verify', 'ship', 'done'];
const STATUSES = ['todo', 'in-progress', 'proven', 'done'];
const DESIGN = ['unknown', 'true', 'false'];
const ROUTES = ['full', 'short'];
const KNOWN = ['ticket', 'title', 'created', 'phase', 'design_involved', 'route', 'proof_definition', 'current_step', 'steps'];
const SETTABLE = { design_involved: DESIGN, route: ROUTES, proof_definition: null, title: null };

/** Today as YYYY-MM-DD (UTC), like the rest of .specs. */
function today() {
    return new Date().toISOString().slice(0, 10);
}

// --- YAML subset ----------------------------------------------------------------

/** Index of the closing quote of a quoted scalar starting at 0, or -1. */
function closingQuote(s, quote) {
    for (let i = 1; i < s.length; i++) {
        if (quote === '"' && s[i] === '\\') i++;
        else if (s[i] === quote) {
            if (quote === "'" && s[i + 1] === "'") i++;
            else return i;
        }
    }
    return -1;
}

/** A YAML scalar: quoted strings, null/~, or a bare word (kept as a string). */
function parseScalar(raw) {
    const s = String(raw).trim();
    if (s === '' || s === 'null' || s === '~') return null;
    if (s[0] === '"' || s[0] === "'") {
        const end = closingQuote(s, s[0]);
        const inner = end === -1 ? s.slice(1) : s.slice(1, end);
        if (s[0] === "'") return inner.replace(/''/g, "'");
        try {
            return JSON.parse(`"${inner}"`);
        } catch {
            return inner;
        }
    }
    return s.replace(/\s+#.*$/, '');
}

/** Split "a: 1, b: 'x, y'" (or ";"-separated) into [key, value] pairs, quote-aware. */
function pairs(text) {
    const out = [];
    let current = '';
    let quote = null;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote) {
            current += c;
            if (quote === '"' && c === '\\') current += text[++i] ?? '';
            else if (c === quote) quote = null;
        } else if (c === '"' || c === "'") {
            quote = c;
            current += c;
        } else if (c === ',' || c === ';') {
            out.push(current);
            current = '';
        } else current += c;
    }
    out.push(current);
    return out
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
            const at = p.indexOf(':');
            return at === -1 ? null : [p.slice(0, at).trim(), parseScalar(p.slice(at + 1))];
        })
        .filter(Boolean);
}

/** The steps list, from its inline value and its block lines. Accepts the shapes models write. */
function parseSteps(inline, block) {
    const steps = [];
    const flowMaps = (text) => (text.match(/\{[^{}]*\}/g) || []).forEach((m) => steps.push(Object.fromEntries(pairs(m.slice(1, -1)))));
    if (inline.trim().startsWith('[')) flowMaps(inline);
    let item = null;
    for (const line of block) {
        const dash = line.match(/^\s*-\s+(.*)$/);
        if (dash) {
            if (dash[1].trim().startsWith('{')) {
                item = null;
                flowMaps(dash[1]);
            } else {
                item = Object.fromEntries(pairs(dash[1]));
                steps.push(item);
            }
        } else if (item && line.trim()) {
            for (const [k, v] of pairs(line)) item[k] = v;
        }
    }
    return steps.map((s) => ({ id: String(s.id ?? ''), title: String(s.title ?? ''), status: String(s.status ?? 'todo') }));
}

/** Parse state.md into its known fields, any extra front-matter keys, and the body. */
function parseState(text) {
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const t = text.replace(/\r\n/g, '\n');
    const fm = t.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!fm) throw new Error('state.md has no front matter');
    const lines = fm[1].split('\n');
    const fields = { steps: [] };
    const extra = [];
    let i = 0;
    while (i < lines.length) {
        const key = lines[i].match(/^([A-Za-z_][\w-]*):(.*)$/);
        const start = i++;
        while (i < lines.length && (/^\s/.test(lines[i]) || /^-\s/.test(lines[i]) || lines[i] === '')) i++;
        if (!key) continue;
        const block = lines.slice(start + 1, i);
        if (key[1] === 'steps') fields.steps = parseSteps(key[2], block);
        else if (KNOWN.includes(key[1])) fields[key[1]] = parseScalar(key[2]);
        else extra.push(lines.slice(start, i).join('\n').replace(/\n+$/, ''));
    }
    for (const step of fields.steps) {
        if (!STATUSES.includes(step.status)) throw new Error(`step ${step.id} has an unknown status "${step.status}"`);
    }
    return { fields, extra, body: t.slice(fm[0].length), eol };
}

function quoted(value) {
    return value === null || value === undefined ? 'null' : JSON.stringify(String(value));
}

/** The front matter in its canonical form. */
function frontMatter(f, extra) {
    const lines = [
        `ticket: ${quoted(f.ticket)}`,
        `title: ${quoted(f.title)}`,
        `created: ${quoted(f.created)}`,
        `phase: ${f.phase}`,
        `design_involved: ${f.design_involved ?? 'unknown'}`,
        `route: ${f.route ?? 'full'}`,
        `proof_definition: ${quoted(f.proof_definition ?? '')}`,
        `current_step: ${quoted(f.current_step)}`,
    ];
    if (f.steps.length === 0) lines.push('steps: []');
    else {
        lines.push('steps:');
        for (const s of f.steps) lines.push(`  - { id: ${quoted(s.id)}, title: ${quoted(s.title)}, status: ${s.status} }`);
    }
    return ['---', ...lines, ...extra, '---', ''].join('\n');
}

// --- body sections ----------------------------------------------------------------

/** [start, end) line range of a "## <name>" section's content, or null. */
function section(lines, name) {
    const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${name}`);
    if (start === -1) return null;
    let end = lines.findIndex((l, i) => i > start && /^##?\s/.test(l));
    if (end === -1) end = lines.length;
    return [start + 1, end];
}

function navEntries(body) {
    const lines = body.split('\n');
    const range = section(lines, 'navigation log');
    return range ? lines.slice(...range).filter((l) => /^\s*-\s/.test(l)).map((l) => l.replace(/^\s*-\s+/, '')) : [];
}

/** Replace the "Where we are" section and append navigation-log entries. */
function updateBody(body, whereText, newEntries) {
    let lines = body.replace(/\n+$/, '').split('\n');
    const where = section(lines, 'where we are');
    if (where) lines.splice(where[0], where[1] - where[0], '', whereText, '');
    else {
        const nav = lines.findIndex((l) => l.trim().toLowerCase() === '## navigation log');
        const at = nav === -1 ? lines.length : nav;
        lines.splice(at, 0, '## Where we are', '', whereText, '');
    }
    if (newEntries.length) {
        let nav = section(lines, 'navigation log');
        if (!nav) {
            lines.push('', '## Navigation log', '');
            nav = [lines.length, lines.length];
        }
        let at = nav[1];
        while (at > nav[0] && lines[at - 1].trim() === '') at--;
        lines.splice(at, 0, ...newEntries.map((e) => `- ${today()} — ${e}`));
    }
    return lines.join('\n') + '\n';
}

// --- the flow ---------------------------------------------------------------------

/** The recommended next move: { skill, why }. */
function nextMove(f) {
    const steps = f.steps;
    const current = steps.find((s) => s.status === 'in-progress');
    const proven = steps.find((s) => s.status === 'proven');
    const todo = steps.find((s) => s.status === 'todo');
    const label = (s) => `step ${s.id} — ${s.title}`;
    const short = f.route === 'short';
    const explore = short
        ? { skill: '/flow:plan', why: 'map the small change and slice it (short route)' }
        : { skill: '/flow:explore', why: 'map the code and surface options' };
    switch (f.phase) {
        case 'start':
            return { skill: '/flow:understand', why: 'read the ticket and capture the problem and acceptance criteria' };
        case 'understand':
            if (f.design_involved === 'true') return { skill: '/flow:design', why: 'analyze the design against the ticket' };
            if (f.design_involved === 'false') return explore;
            return { skill: '/flow:understand', why: 'finish understanding: decide whether design is involved' };
        case 'design':
            return explore;
        case 'explore':
            return { skill: '/flow:plan', why: 'pick an approach and slice it into steps' };
        case 'plan':
        case 'execute':
        case 'verify':
            if (steps.length === 0) return { skill: '/flow:plan', why: 'break the work into steps' };
            if (current) return { skill: '/flow:execute', why: `continue ${label(current)} (in progress)` };
            if (proven) return { skill: '/flow:execute', why: `commit ${label(proven)}, then mark it done` };
            if (todo) return { skill: '/flow:execute', why: `build ${label(todo)}` };
            if (f.phase !== 'verify' && !short) return { skill: '/flow:verify', why: 'check the whole ticket against its acceptance criteria' };
            return { skill: '/flow:ship', why: 'assemble the PR/MR draft from the specs' };
        case 'ship':
            return { skill: null, why: 'ship it your way, then mark the phase done' };
        default:
            return { skill: '/flow:retro', why: 'look back at the record for changes that make the next ticket go better (optional)' };
    }
}

function whereWeAre(f) {
    const done = f.steps.filter((s) => s.status === 'done').length;
    const current = f.steps.find((s) => s.id === f.current_step);
    const progress = f.steps.length ? ` Steps: ${done} of ${f.steps.length} done` + (current ? `; current: ${current.id} — ${current.title} (${current.status}).` : '.') : '';
    const next = nextMove(f);
    const nextText = next.skill ? `Next: run \`${next.skill} ${f.ticket}\` to ${next.why}.` : `Next: ${next.why}.`;
    return `Phase: **${f.phase}**.${progress}\n${nextText}`;
}

function summary(f, nav) {
    const done = f.steps.filter((s) => s.status === 'done').length;
    const next = nextMove(f);
    const out = [
        `${f.ticket} — ${f.title}`,
        `Phase: ${f.phase} · design: ${f.design_involved ?? 'unknown'}${f.route === 'short' ? ' · route: short' : ''} · proof: ${f.proof_definition || '(not set)'}`,
        `Steps (${done}/${f.steps.length} done):`,
        ...(f.steps.length ? f.steps.map((s) => `  ${s.id} ${s.status.padEnd(11)} ${s.title}${s.id === f.current_step ? '  <- current' : ''}`) : ['  (none)']),
        'Recent navigation:',
        ...(nav.length ? nav.slice(-5).map((e) => `  - ${e}`) : ['  (none)']),
        `Next: ${next.skill ? `${next.skill} ${f.ticket} — ${next.why}` : next.why}`,
    ];
    return out.join('\n');
}

/** Keep the "- Status:" line of the step's spec in sync, if the spec exists. */
function syncStepFile(ticketDir, id, status) {
    const dir = path.join(ticketDir, 'steps');
    if (!fs.existsSync(dir)) return null;
    const name = fs.readdirSync(dir).find((n) => n === `${id}.md` || (n.startsWith(`${id}-`) && n.endsWith('.md')));
    if (!name) return null;
    const file = path.join(dir, name);
    const text = fs.readFileSync(file, 'utf8');
    const updated = text.replace(/^- Status:[ \t]*\S+/m, `- Status: ${status}`);
    if (updated !== text) fs.writeFileSync(file, updated, 'utf8');
    return name;
}

/** Apply one command. Returns { changed, message, entries } or throws on a rule violation. */
function apply(state, ticketDir, command, args, opts) {
    const f = state.fields;
    const entries = [];
    const need = (value, what) => {
        if (value === undefined || value === '') throw new Error(`missing ${what}`);
        return value;
    };
    switch (command) {
        case 'phase': {
            const to = need(args[0], 'phase');
            if (!PHASES.includes(to)) throw new Error(`unknown phase "${to}" (one of: ${PHASES.join(', ')})`);
            const from = f.phase;
            if (to === from) return { changed: false, message: `phase is already ${to}` };
            const back = PHASES.indexOf(to) < PHASES.indexOf(from) && !(from === 'verify' && to === 'execute');
            if (back && !opts.reason) throw new Error(`moving back from ${from} to ${to} is a regression: pass --reason (and record it in decisions.md)`);
            f.phase = to;
            const note = opts.reason || opts.note;
            entries.push(`${back ? '(regression) ' : ''}${from} → ${to}${note ? `: ${note}` : ''}`);
            return { changed: true, message: `phase ${from} → ${to}`, entries };
        }
        case 'set': {
            const field = need(args[0], 'field');
            if (!(field in SETTABLE)) throw new Error(`"${field}" cannot be set here (settable: ${Object.keys(SETTABLE).join(', ')})`);
            const value = need(args.slice(1).join(' ').trim(), 'value');
            if (SETTABLE[field] && !SETTABLE[field].includes(value)) throw new Error(`${field} must be one of: ${SETTABLE[field].join(', ')}`);
            f[field] = value;
            return { changed: true, message: `${field} = ${value}`, entries };
        }
        case 'add-step': {
            const id = need(args[0], 'step id');
            const title = need(args.slice(1).join(' ').trim(), 'step title');
            if (!/^\d{2,}$/.test(id)) throw new Error(`step id "${id}" must be two or more digits (01, 02, ...)`);
            if (f.steps.some((s) => s.id === id)) throw new Error(`step ${id} already exists`);
            f.steps.push({ id, title, status: 'todo' });
            f.steps.sort((a, b) => Number(a.id) - Number(b.id));
            entries.push(`step ${id} added: ${title}`);
            return { changed: true, message: `step ${id} added`, entries };
        }
        case 'remove-step': {
            const id = need(args[0], 'step id');
            const step = f.steps.find((s) => s.id === id);
            if (!step) throw new Error(`no step ${id}`);
            if (step.status !== 'todo') throw new Error(`step ${id} is ${step.status}; only a todo step can be removed`);
            if (!opts.reason) throw new Error('removing a step needs --reason');
            f.steps = f.steps.filter((s) => s.id !== id);
            entries.push(`step ${id} removed: ${opts.reason}`);
            return { changed: true, message: `step ${id} removed`, entries };
        }
        case 'step': {
            const id = need(args[0], 'step id');
            const to = need(args[1], 'status');
            if (!STATUSES.includes(to)) throw new Error(`unknown status "${to}" (one of: ${STATUSES.join(', ')})`);
            const step = f.steps.find((s) => s.id === id);
            if (!step) throw new Error(`no step ${id}`);
            const from = step.status;
            if (to === from) return { changed: false, message: `step ${id} is already ${to}` };
            const delta = STATUSES.indexOf(to) - STATUSES.indexOf(from);
            if (delta > 1) throw new Error(`step ${id} moves one status at a time: ${from} → ${STATUSES[STATUSES.indexOf(from) + 1]} next`);
            if (delta < 0 && !opts.reason) throw new Error(`moving step ${id} back from ${from} to ${to} needs --reason`);
            const other = f.steps.find((s) => s.id !== id && s.status === 'in-progress');
            if (to === 'in-progress' && other) throw new Error(`step ${other.id} is in progress; one step at a time`);
            const uncommitted = f.steps.find((s) => s.id !== id && s.status === 'proven');
            if (to === 'in-progress' && uncommitted && !opts.reason) {
                throw new Error(`step ${uncommitted.id} is proven but not done: commit it and mark it done first, or pass --reason to start step ${id} anyway`);
            }
            step.status = to;
            if (to === 'in-progress') f.current_step = id;
            else if (to === 'done' && f.current_step === id) f.current_step = null;
            else if (to === 'todo' && f.current_step === id) f.current_step = null;
            const synced = syncStepFile(ticketDir, id, to);
            const note = opts.reason || opts.note;
            entries.push(`step ${id}: ${from} → ${to}${delta < 0 ? ' (back)' : ''}${note ? `: ${note}` : ''}`);
            return { changed: true, message: `step ${id}: ${from} → ${to}${synced ? ` (${synced} Status synced)` : ''}`, entries };
        }
        case 'log': {
            const text = args.join(' ').trim();
            if (!text) throw new Error('missing log text');
            entries.push(text);
            return { changed: true, message: 'navigation log updated', entries };
        }
        default:
            throw new Error(`unknown command "${command}"`);
    }
}

function parseArgs(argv) {
    const out = { ticket: null, command: null, args: [], root: process.cwd(), reason: '', note: '', json: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--root') out.root = argv[++i];
        else if (a === '--reason') out.reason = argv[++i] || '';
        else if (a === '--note') out.note = argv[++i] || '';
        else if (a === '--json') out.json = true;
        else if (out.ticket === null) out.ticket = a;
        else if (out.command === null) out.command = a;
        else out.args.push(a);
    }
    return out;
}

function usage() {
    console.log('Usage: node state.js <ticket-id> <command> [args] [--root <dir>]');
    console.log('\nCommands:');
    console.log('  show [--json]');
    console.log('  phase <phase> [--reason <text>] [--note <text>]');
    console.log('  set <design_involved|route|proof_definition|title> <value>');
    console.log('  add-step <id> <title>');
    console.log('  remove-step <id> --reason <text>');
    console.log('  step <id> <todo|in-progress|proven|done> [--reason <text>] [--note <text>]');
    console.log('  log <text>');
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (!opts.ticket || !opts.command) {
        usage();
        process.exit(1);
    }
    if (opts.ticket.includes('/') || opts.ticket.includes('\\')) {
        console.log('[error] ticket id must not contain path separators.');
        process.exit(1);
    }
    const ticketDir = path.resolve(opts.root, '.specs', opts.ticket);
    const file = path.join(ticketDir, 'state.md');
    if (!fs.existsSync(file)) {
        console.log(`[error] ${path.join('.specs', opts.ticket, 'state.md')} not found — run /flow:start first`);
        process.exit(1);
    }

    try {
        const state = parseState(fs.readFileSync(file, 'utf8'));
        if (opts.command === 'show') {
            const nav = navEntries(state.body);
            if (opts.json) console.log(JSON.stringify({ ...state.fields, next: nextMove(state.fields), navigation: nav }, null, 2));
            else console.log(summary(state.fields, nav));
            process.exit(0);
        }
        const result = apply(state, ticketDir, opts.command, opts.args, opts);
        if (result.changed) {
            const body = updateBody(state.body, whereWeAre(state.fields), result.entries);
            const text = frontMatter(state.fields, state.extra) + body;
            fs.writeFileSync(file, text.replace(/\n/g, state.eol), 'utf8');
        }
        const nav = navEntries(state.body).concat((result.entries || []).map((e) => `${today()} — ${e}`));
        console.log(`[${result.changed ? 'ok' : 'skip'}] ${result.message}\n`);
        console.log(summary(state.fields, nav));
        process.exit(0);
    } catch (err) {
        console.log(`[error] ${err.message}`);
        process.exit(1);
    }
}

if (require.main === module) main();

module.exports = { parseState, frontMatter, parseSteps, parseScalar, nextMove, apply, updateBody, navEntries };
