#!/usr/bin/env node
'use strict';

/**
 * session_start.js — SessionStart hook that tells a new or cleared session where the
 * project's flow tickets stand.
 *
 * Reads the hook input (JSON) on stdin, looks for .specs/<ticket-id>/state.md under the
 * project, and adds one line per ticket that is not done — phase, step progress, and
 * the next move — to the session's context. The flow suggests /clear between phases;
 * this is what lets a cleared session pick the work up without asking.
 *
 * Prints nothing in a project without active tickets, so it costs no context there.
 * Fails silently: a broken state.md is skipped, never an error.
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseState, nextMove } = require('./state');

const MAX_TICKETS = 5;

/** One line per active ticket, most recently changed first. */
function activeTickets(root) {
    const specs = path.join(root, '.specs');
    if (!fs.existsSync(specs)) return [];
    const tickets = [];
    for (const name of fs.readdirSync(specs)) {
        const file = path.join(specs, name, 'state.md');
        if (!fs.existsSync(file)) continue;
        try {
            const { fields: f } = parseState(fs.readFileSync(file, 'utf8'));
            if (f.phase === 'done') continue;
            const done = f.steps.filter((s) => s.status === 'done').length;
            const current = f.steps.find((s) => s.id === f.current_step);
            const next = nextMove(f);
            const parts = [`${f.ticket || name} — ${f.title || name}`, `phase ${f.phase}`];
            if (f.steps.length) parts.push(`steps ${done}/${f.steps.length} done`);
            if (current) parts.push(`current ${current.id} (${current.status})`);
            parts.push(`next: ${next.skill ? `${next.skill} ${f.ticket || name} — ${next.why}` : next.why}`);
            tickets.push({ line: parts.join(' · '), mtime: fs.statSync(file).mtimeMs });
        } catch {
            // an unreadable state.md is skipped
        }
    }
    return tickets.sort((a, b) => b.mtime - a.mtime).map((t) => t.line);
}

/** The context to add, or '' for none. */
function context(root) {
    const lines = activeTickets(root);
    if (lines.length === 0) return '';
    const shown = lines.slice(0, MAX_TICKETS).map((l) => `- ${l}`);
    if (lines.length > MAX_TICKETS) shown.push(`- … and ${lines.length - MAX_TICKETS} more (see /flow:status)`);
    return [
        'ffloww: tickets in progress in this project (from .specs/<ticket-id>/state.md):',
        ...shown,
        'The flow state lives in .specs/, not in this conversation. To continue, run the next move above or /flow:status <ticket-id>; nothing advances without the developer.',
    ].join('\n');
}

function main() {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (raw += chunk));
    process.stdin.on('end', () => {
        try {
            const input = raw.trim() ? JSON.parse(raw) : {};
            const text = context(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
            if (text) {
                process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
            }
        } catch {
            // fail silently: no context is better than a broken session start
        }
        process.exit(0);
    });
}

if (require.main === module) main();

module.exports = { activeTickets, context };
