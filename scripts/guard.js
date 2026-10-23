#!/usr/bin/env node
'use strict';

/**
 * guard.js — PreToolUse hook that enforces the ffloww flow's guardrails in code.
 *
 * Reads the hook input (JSON) on stdin and denies, with a reason the model sees:
 *
 *   In any session (main or subagent):
 *     - Edit/Write of a proof log under .specs/<ticket-id>/evidence/ — logs are written
 *       only by run_proof.js;
 *     - Edit/Write of a ticket's state.md — it changes only through state.js;
 *     - an Edit/Write of a step spec or verification.md that would remove or change an
 *       evidence entry run_proof.js recorded ("### Run <timestamp>"), or change a step's
 *       existing Status line (state.js keeps it in sync).
 *
 *   In the flow's subagents (agent_type "flow:<name>"):
 *     - git commands that write — only read-only git (status, diff, log, ...) runs;
 *     - state.js commands other than show;
 *     - changes to a step's Executor line or its Gate section.
 *
 * The main session's git rule stays an instruction, not a block: plugin hooks run in
 * every session, flow or not, and the developer may want commits outside the flow.
 *
 * Fails open: on input it cannot parse or an internal error it makes no decision, so a
 * guard bug never blocks unrelated work.
 */

const fs = require('node:fs');
const path = require('node:path');
const { headings, runEntries } = require('./lib/markdown');

const FILE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

// git subcommands that only read.
const READ_ONLY_GIT = new Set([
    'status', 'diff', 'log', 'show', 'blame', 'annotate', 'grep', 'ls-files', 'ls-tree',
    'ls-remote', 'rev-parse', 'rev-list', 'describe', 'shortlog', 'cat-file', 'merge-base',
    'name-rev', 'show-ref', 'for-each-ref', 'show-branch', 'check-ignore', 'check-attr',
    'count-objects', 'whatchanged', 'range-diff', 'var', 'version', 'help',
]);

// git subcommands that read or write depending on their arguments.
const CONDITIONAL_GIT = {
    branch: (args) => positional(args).length === 0 || hasAny(args, ['-l', '--list', '--show-current']),
    tag: (args) => positional(args).length === 0 || hasAny(args, ['-l', '--list']),
    remote: (args) => positional(args).length === 0 || ['show', 'get-url'].includes(positional(args)[0]),
    stash: (args) => ['list', 'show'].includes(positional(args)[0]),
    reflog: (args) => positional(args).length === 0 || positional(args)[0] === 'show',
    config: (args) => hasAny(args, ['--get', '--get-all', '--get-regexp', '--list', '-l']) || ['get', 'list'].includes(positional(args)[0]),
    worktree: (args) => positional(args)[0] === 'list',
    submodule: (args) => positional(args).length === 0 || positional(args)[0] === 'status',
};

function positional(args) {
    return args.filter((a) => !a.startsWith('-'));
}

function hasAny(args, flags) {
    return args.some((a) => flags.includes(a) || flags.some((f) => a.startsWith(`${f}=`)));
}

/** The git invocations in a shell command, as { sub, args }. */
function gitCalls(command) {
    const calls = [];
    const pattern = /(?:^|[\s;&|(`$'"])git((?:\s+(?:-C|-c)\s+(?:"[^"]*"|'[^']*'|\S+)|\s+--?[\w-]+(?:=(?:"[^"]*"|'[^']*'|\S+))?)*)\s+([a-z][\w-]*)([^;&|\n)`]*)/g;
    let match;
    while ((match = pattern.exec(command)) !== null) {
        const args = match[3].trim().split(/\s+/).filter(Boolean).map((a) => a.replace(/^['"]|['"]$/g, ''));
        calls.push({ sub: match[2], args });
    }
    return calls;
}

/** True when the command runs state.js with a command other than `show`. */
function mutatingState(command) {
    const at = command.search(/state\.js["']?(\s|$)/);
    if (at === -1) return false;
    const tokens = command.slice(at).split(/[;&|\n]/)[0].split(/\s+/).slice(1).map((t) => t.replace(/^['"]|['"]$/g, ''));
    const words = [];
    for (let i = 0; i < tokens.length; i++) {
        if (['--root', '--reason', '--note'].includes(tokens[i])) i++;
        else if (tokens[i] && !tokens[i].startsWith('--')) words.push(tokens[i]);
    }
    return words.length >= 2 && words[1] !== 'show';
}

function stateCommand() {
    return `node "${process.env.CLAUDE_PLUGIN_ROOT || '${CLAUDE_PLUGIN_ROOT}'}/scripts/state.js" <ticket-id> <command>`;
}

function writingGit(command) {
    return gitCalls(command).find(({ sub, args }) => !READ_ONLY_GIT.has(sub) && !(CONDITIONAL_GIT[sub] && CONDITIONAL_GIT[sub](args)));
}

/** Where a path sits in a ticket's .specs folder: { ticket, rel } or null. */
function specsLocation(filePath) {
    const match = filePath.replace(/\\/g, '/').match(/(?:^|\/)\.specs\/([^/]+)\/(.+)$/);
    return match ? { ticket: match[1], rel: match[2] } : null;
}

function lf(text) {
    return String(text).replace(/\r\n/g, '\n');
}

/** Apply one Edit to the text; null when old_string is not there (the tool will fail). */
function applyEdit(text, edit) {
    const oldString = lf(edit.old_string ?? '');
    const newString = lf(edit.new_string ?? '');
    if (!oldString || !text.includes(oldString)) return null;
    return edit.replace_all ? text.split(oldString).join(newString) : text.replace(oldString, () => newString);
}

/** The file's content before and after the tool call, or null when it cannot be known. */
function beforeAfter(toolName, input) {
    const before = fs.existsSync(input.file_path) ? lf(fs.readFileSync(input.file_path, 'utf8')) : '';
    if (toolName === 'Write') return { before, after: lf(input.content ?? '') };
    const edits = toolName === 'MultiEdit' ? input.edits || [] : [input];
    let after = before;
    for (const edit of edits) {
        after = applyEdit(after, edit);
        if (after === null) return null;
    }
    return { before, after };
}

/** The Status/Executor lines and the Gate section of a step spec. */
function gateFields(text) {
    const lines = text.split('\n');
    const status = lines.filter((line) => /^- (Status|Executor):/.test(line));
    const all = headings(lines);
    const gate = all.find((h) => h.level === 2 && h.text.toLowerCase() === 'gate');
    if (!gate) return { status, gate: null };
    const next = all.find((h) => h.index > gate.index && h.level <= 2);
    return { status, gate: lines.slice(gate.index, next ? next.index : lines.length).join('\n').trim() };
}

/** The reason to deny this tool call, or null to make no decision. */
function check(event) {
    const tool = event.tool_name;
    const input = event.tool_input || {};
    const agent = typeof event.agent_type === 'string' && event.agent_type.startsWith('flow:') ? event.agent_type : null;

    if (tool === 'Bash' && agent) {
        const command = String(input.command || '');
        const call = writingGit(command);
        if (call) {
            return `ffloww guard: ${agent} runs read-only git only (status, diff, log, show, ...); \`git ${call.sub}\` writes. ` +
                'Leave commits and branches to the developer and report back to the main session.';
        }
        if (mutatingState(command)) {
            return `ffloww guard: ${agent} reads state with \`state.js <ticket-id> show\` only; the main session updates it.`;
        }
        return null;
    }

    if (!FILE_TOOLS.has(tool) || !input.file_path) return null;
    const where = specsLocation(String(input.file_path));
    if (!where) return null;

    if (where.rel.startsWith('evidence/')) {
        return 'ffloww guard: proof logs under evidence/ are written only by run_proof.js and cannot be edited. ' +
            'Run the proof again through the runner to record a new result.';
    }
    if (where.rel === 'state.md') {
        return `ffloww guard: state.md changes only through the flow's state script: ${stateCommand()} ` +
            '(show | phase | set | add-step | remove-step | step | log). It validates transitions and writes the navigation log.';
    }

    const isStep = /^steps\/[^/]+\.md$/.test(where.rel) && path.basename(where.rel) !== '_TEMPLATE.md';
    if (!isStep && where.rel !== 'verification.md') return null;

    const change = beforeAfter(tool, input);
    if (!change) return null;

    const lost = runEntries(change.before).find((entry) => !change.after.includes(entry));
    if (lost) {
        return `ffloww guard: this change would remove or alter an evidence entry recorded by run_proof.js (${lost.split('\n')[0]}). ` +
            'Evidence entries are immutable; record a new run through the runner instead.';
    }

    if (isStep) {
        const before = gateFields(change.before);
        const after = gateFields(change.after);
        const status = (fields) => fields.status.filter((line) => line.startsWith('- Status:')).map((line) => line.split(/\s+/)[2]);
        if (status(before).length && status(before).join() !== status(after).join()) {
            return `ffloww guard: a step's Status changes only through the state script, which keeps state.md in sync: ${stateCommand()} → step <id> <status>.`;
        }
        if (agent && (before.status.join('\n') !== after.status.join('\n') || (before.gate !== null && before.gate !== after.gate))) {
            return `ffloww guard: ${agent} does not change a step's Executor line or its Gate section; ` +
                'the main session and the developer decide those.';
        }
    }
    return null;
}

function main() {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (raw += chunk));
    process.stdin.on('end', () => {
        let reason = null;
        try {
            reason = check(JSON.parse(raw));
        } catch {
            reason = null; // fail open
        }
        if (reason) {
            process.stdout.write(JSON.stringify({
                hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
            }));
        }
        process.exit(0);
    });
}

if (require.main === module) main();

module.exports = { check, gitCalls, writingGit, mutatingState };
