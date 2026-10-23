#!/usr/bin/env node
'use strict';

/**
 * run_proof.js — Run a proof and record its raw evidence for the ffloww dev flow.
 *
 * Inside the TARGET project it:
 *   - runs the proof command from the project root, through the shell;
 *   - saves the full output to .specs/<ticket-id>/evidence/<target>-<timestamp>.log;
 *   - appends an entry to the Evidence section of the target spec — a step's
 *     .specs/<ticket-id>/steps/<step-id>-*.md, or, for the target `ticket`, the
 *     whole-ticket .specs/<ticket-id>/verification.md (created if missing) — with the
 *     exact command, its exit code, the duration, the log path, and the last lines of
 *     output.
 *
 * The evidence is written by this script, not by the assistant, so it cannot be
 * paraphrased or invented. It records the exit code; it never grades the result.
 *
 * Usage:
 *   node run_proof.js <ticket-id> <step-id|ticket> --cmd "<command>" [--label <text>] [--root <dir>] [--tail <n>] [--timeout <seconds>]
 *
 * Examples:
 *   node run_proof.js AB-1234 02 --cmd "pnpm test -- export"
 *   node run_proof.js AB-1234 02 --cmd "npm run lint && npm test" --root /path/to/project --tail 60
 *   node run_proof.js AB-1234 ticket --label "AC 2: exports a CSV" --cmd "pnpm test -- csv"
 *
 * Exits 0 once the evidence is recorded, whatever the proof's exit code (it prints
 * it); exits 1 only when it cannot run the command or record the evidence.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_TAIL = 40;

/** UTC timestamp for the evidence entry, e.g. 2026-10-23T18:42:10Z. */
function isoStamp(date) {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** UTC timestamp for file names, e.g. 20261023-184210. */
function fileStamp(date) {
    return isoStamp(date).replace(/[-:]/g, '').replace('T', '-').replace('Z', '');
}

/** Remove ANSI escape sequences (colors, cursor moves) that test runners emit. */
function stripAnsi(text) {
    return text.replace(/\u001b\[[0-9;?]*[ -\/]*[@-~]/g, '');
}

/** Split output into display lines; a carriage return keeps only what the terminal shows. */
function displayLines(text) {
    const lines = stripAnsi(text).split(/\r?\n/).map((line) => line.slice(line.lastIndexOf('\r') + 1));
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines;
}

/** "1 line", "3 lines". */
function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Longest run of a character in a string. */
function longestRun(text, char) {
    let best = 0;
    let current = 0;
    for (const c of text) {
        current = c === char ? current + 1 : 0;
        if (current > best) best = current;
    }
    return best;
}

/** Wrap text in inline code, safe when it contains backticks. */
function inlineCode(text) {
    const ticks = '`'.repeat(longestRun(text, '`') + 1);
    const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
    return `${ticks}${pad}${text}${pad}${ticks}`;
}

/** A code fence longer than any backtick run inside the block. */
function fenceFor(text) {
    return '`'.repeat(Math.max(3, longestRun(text, '`') + 1));
}

/** Find the step spec for a step id: steps/<id>-<slug>.md (or steps/<id>.md). */
function findStepFile(stepsDir, stepId) {
    if (!fs.existsSync(stepsDir)) return { error: `no steps/ folder in ${stepsDir}` };
    const matches = fs.readdirSync(stepsDir).filter((name) => name === `${stepId}.md` || (name.startsWith(`${stepId}-`) && name.endsWith('.md')));
    if (matches.length === 0) return { error: `no step spec matching ${stepId}-*.md in ${stepsDir}` };
    if (matches.length > 1) return { error: `more than one step spec matches ${stepId}: ${matches.join(', ')}` };
    return { file: path.join(stepsDir, matches[0]) };
}

/** The whole-ticket verification note, created on first use. */
function ensureVerification(ticketDir, ticket) {
    const file = path.join(ticketDir, 'verification.md');
    if (!fs.existsSync(file)) {
        const content = [
            `# Verification — ${ticket}`,
            '',
            '> Whole-ticket check against the acceptance criteria (/flow:verify). One evidence',
            '> entry per acceptance criterion, recorded by the proof runner; the human decision',
            '> goes in Gate.',
            '',
            '## Evidence',
            '',
            '## Gate',
            '',
            '<!-- Human decision: approved / changes requested / regress. Who + when. -->',
            '',
        ].join('\n');
        fs.writeFileSync(file, content, 'utf8');
    }
    return { file };
}

/** Create a new log file with its header; never overwrites an earlier run's log. */
function createLog(dir, base, header) {
    for (let n = 1; ; n++) {
        const file = path.join(dir, n === 1 ? `${base}.log` : `${base}-${n}.log`);
        try {
            fs.writeFileSync(file, header, { encoding: 'utf8', flag: 'wx' });
            return file;
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
    }
}

/** Markdown headings outside fenced code blocks, as { index, level, text }. */
function headings(lines) {
    const found = [];
    let fence = null;
    lines.forEach((line, index) => {
        const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
        if (fence) {
            if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && line.trim() === marker[1]) fence = null;
            return;
        }
        if (marker) {
            fence = marker[1];
            return;
        }
        const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
        if (heading) found.push({ index, level: heading[1].length, text: heading[2] });
    });
    return found;
}

/** Insert an entry at the end of the spec's Evidence section (created if missing). */
function appendEvidence(specFile, entryLines) {
    const content = fs.readFileSync(specFile, 'utf8');
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const all = headings(lines);
    const evidence = all.find((h) => h.level === 2 && h.text.toLowerCase() === 'evidence');

    if (!evidence) {
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
        const out = [...lines, '', '## Evidence', '', ...entryLines, ''];
        fs.writeFileSync(specFile, out.join(eol), 'utf8');
        return;
    }

    const next = all.find((h) => h.index > evidence.index && h.level <= 2);
    const end = next ? next.index : lines.length;
    let insertAt = end;
    while (insertAt - 1 > evidence.index && lines[insertAt - 1].trim() === '') insertAt--;

    const after = lines.slice(insertAt);
    const spacer = after.length > 0 && after[0].trim() !== '' ? [''] : [];
    const out = [...lines.slice(0, insertAt), '', ...entryLines, ...spacer, ...after];
    fs.writeFileSync(specFile, out.join(eol), 'utf8');
}

/** Run the proof, save the log, append the evidence entry. Returns the run summary. */
function runProof({ ticket, target, cmd, label, root, tail, timeout }) {
    const ticketDir = path.resolve(root, '.specs', ticket);
    if (!fs.existsSync(ticketDir)) throw new Error(`${path.join('.specs', ticket)} not found — run /flow:start first`);

    const found = target === 'ticket' ? ensureVerification(ticketDir, ticket) : findStepFile(path.join(ticketDir, 'steps'), target);
    if (found.error) throw new Error(found.error);

    const started = new Date();
    const evidenceDir = path.join(ticketDir, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const header = [
        '# ffloww proof run',
        `# ticket: ${ticket}`,
        `# target: ${target}`,
        `# command: ${cmd}`,
        `# cwd: ${path.resolve(root)}`,
        `# started: ${isoStamp(started)}`,
        '',
    ].join('\n') + '\n';
    const logFile = createLog(evidenceDir, `${target}-${fileStamp(started)}`, header);

    // Output goes straight to the log file, so stdout and stderr stay interleaved
    // and no buffer limit truncates a long run.
    const fd = fs.openSync(logFile, 'a');
    let result;
    try {
        result = spawnSync(cmd, {
            cwd: path.resolve(root),
            shell: true,
            stdio: ['ignore', fd, fd],
            timeout: timeout ? timeout * 1000 : undefined,
        });
    } finally {
        fs.closeSync(fd);
    }
    const finished = new Date();
    const seconds = ((finished - started) / 1000).toFixed(1);

    const output = fs.readFileSync(logFile).subarray(Buffer.byteLength(header, 'utf8')).toString('utf8');
    const lines = displayLines(output);
    const excerpt = lines.slice(-tail);

    let exit;
    if (result.error && result.error.code === 'ETIMEDOUT') exit = `none (killed after the ${timeout}s timeout)`;
    else if (result.error) exit = `none (failed to start: ${result.error.message})`;
    else if (result.status === null) exit = `none (killed by ${result.signal})`;
    else exit = String(result.status);

    fs.appendFileSync(logFile, `\n# finished: ${isoStamp(finished)}\n# exit code: ${exit}\n`, 'utf8');

    const logRel = path.relative(ticketDir, logFile).split(path.sep).join('/');
    const excerptText = excerpt.join('\n');
    const fence = fenceFor(excerptText);
    const entry = [
        `### Run ${isoStamp(started)}${label ? ` — ${label}` : ''}`,
        '',
        `- Command: ${inlineCode(cmd)}`,
        `- Exit code: ${exit}`,
        `- Duration: ${seconds}s`,
        `- Log: ${inlineCode(logRel)} (${plural(lines.length, 'line')})`,
        '',
        ...(excerpt.length === 0
            ? ['No output.']
            : [lines.length > excerpt.length ? `Last ${excerpt.length} lines:` : 'Output:', '', `${fence}text`, ...excerpt, fence]),
    ];
    appendEvidence(found.file, entry);

    return { specFile: found.file, logFile, exit, seconds, total: lines.length, excerpt };
}

function parseArgs(argv) {
    const out = { ticket: null, target: null, cmd: '', label: '', root: process.cwd(), tail: DEFAULT_TAIL, timeout: 0 };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--cmd') out.cmd = argv[++i] || '';
        else if (a === '--label') out.label = argv[++i] || '';
        else if (a === '--root') out.root = argv[++i];
        else if (a === '--tail') out.tail = Number(argv[++i]);
        else if (a === '--timeout') out.timeout = Number(argv[++i]);
        else if (!a.startsWith('--') && out.ticket === null) out.ticket = a;
        else if (!a.startsWith('--') && out.target === null) out.target = a;
    }
    return out;
}

function usage() {
    console.log('Usage: node run_proof.js <ticket-id> <step-id|ticket> --cmd "<command>" [--label <text>] [--root <dir>] [--tail <n>] [--timeout <seconds>]');
    console.log('\nExamples:');
    console.log('  node run_proof.js AB-1234 02 --cmd "pnpm test -- export"');
    console.log('  node run_proof.js AB-1234 02 --cmd "npm run lint && npm test" --root /path/to/project --tail 60');
    console.log('  node run_proof.js AB-1234 ticket --label "AC 2: exports a CSV" --cmd "pnpm test -- csv"');
}

function main() {
    const args = parseArgs(process.argv.slice(2));

    if (!args.ticket || !args.target || !args.cmd.trim()) {
        usage();
        process.exit(1);
    }
    for (const value of [args.ticket, args.target]) {
        if (value.includes('/') || value.includes('\\')) {
            console.log('[error] ticket and step ids must not contain path separators.');
            process.exit(1);
        }
    }
    if (!Number.isInteger(args.tail) || args.tail < 1 || !Number.isFinite(args.timeout) || args.timeout < 0) {
        console.log('[error] --tail must be a positive integer and --timeout a number of seconds.');
        process.exit(1);
    }

    let run;
    try {
        run = runProof(args);
    } catch (err) {
        console.log(`[error] ${err.message}`);
        process.exit(1);
    }

    const root = path.resolve(args.root);
    console.log(`[ok] Evidence recorded in ${path.relative(root, run.specFile)}`);
    console.log(`   Command:   ${args.cmd}`);
    console.log(`   Exit code: ${run.exit}`);
    console.log(`   Duration:  ${run.seconds}s`);
    console.log(`   Log:       ${path.relative(root, run.logFile)} (${plural(run.total, 'line')})`);
    console.log(`\n--- last ${run.excerpt.length} lines ---`);
    console.log(run.excerpt.join('\n'));
    // Exit 0 even when the proof failed — the exit code above is the result; grading is the human's.
    process.exit(0);
}

main();
