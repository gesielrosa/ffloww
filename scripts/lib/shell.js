'use strict';

/**
 * The shell a proof command runs in, and how its output reaches the log.
 *
 * Proof commands are written in the shell the session works in, which is bash: with
 * process substitution, `[[ ]]` and, on Windows, the Unix tools Git Bash brings. The
 * platform's own shell (/bin/sh, cmd.exe) runs some of them differently or not at all,
 * so the runner uses bash where it finds one, and the platform's shell otherwise.
 *
 * On Windows, Git Bash cannot write to the append-only handle the runner hands a child
 * for its log, and prints nothing. There the output comes back through pipes and the
 * runner writes the log itself.
 *
 * FFLOWW_PROOF_SHELL overrides the choice: `default` is the platform's shell writing
 * straight to the log (how the runner worked before it looked for bash), and anything
 * else is the path of a POSIX shell to run the command with (`<shell> -c "<command>"`).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

function isFile(file) {
    try {
        return fs.statSync(file).isFile();
    } catch {
        return false;
    }
}

/** The folders on PATH. */
function pathDirs(env, separator) {
    return String(env.PATH || env.Path || '').split(separator).filter(Boolean);
}

/** Git Bash on Windows, or null. WSL's launcher in System32 is another machine's shell, so it is passed over. */
function windowsBash(env, exists) {
    const join = path.win32.join;
    const candidates = [
        env.CLAUDE_CODE_GIT_BASH_PATH,
        /bash(\.exe)?$/i.test(env.SHELL || '') ? env.SHELL : null,
        ...['ProgramFiles', 'ProgramW6432', 'ProgramFiles(x86)'].map((name) => env[name] && join(env[name], 'Git', 'bin', 'bash.exe')),
        env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe'),
        ...pathDirs(env, ';').filter((dir) => !/\\(system32|windowsapps)\\?$/i.test(dir)).map((dir) => join(dir, 'bash.exe')),
    ];
    return candidates.find((file) => file && exists(file)) || null;
}

/** bash on a POSIX system, or null. */
function posixBash(env, exists) {
    const candidates = [...pathDirs(env, ':').map((dir) => path.posix.join(dir, 'bash')), '/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash'];
    return candidates.find((file) => exists(file)) || null;
}

/**
 * The shell for a proof command, as { path, name, pipes }: `path` null is the
 * platform's own shell; `pipes` says the output comes back through pipes instead of
 * going straight to the log.
 */
function pickShell(env = process.env, platform = process.platform, exists = isFile) {
    const windows = platform === 'win32';
    const platformShell = { path: null, name: windows ? "cmd.exe (the platform's shell)" : "/bin/sh (the platform's shell)", pipes: false };
    const chosen = String(env.FFLOWW_PROOF_SHELL || '').trim();
    if (chosen.toLowerCase() === 'default') return platformShell;
    if (chosen) return { path: chosen, name: `${chosen} (FFLOWW_PROOF_SHELL)`, pipes: windows };
    const bash = windows ? windowsBash(env, exists) : posixBash(env, exists);
    return bash ? { path: bash, name: bash, pipes: windows } : platformShell;
}

/**
 * Run the command in the shell, its output appended to the log file. Resolves to
 * { status, signal, error }, like spawnSync: `error.code` is ETIMEDOUT after a timeout.
 */
function execute(cmd, { cwd, logFile, timeout, shell }) {
    if (!shell.pipes) {
        // The child writes straight to the log, so stdout and stderr stay interleaved
        // and no buffer limit truncates a long run.
        const fd = fs.openSync(logFile, 'a');
        try {
            const result = spawnSync(cmd, { cwd, shell: shell.path || true, stdio: ['ignore', fd, fd], timeout: timeout ? timeout * 1000 : undefined, windowsHide: true });
            return Promise.resolve({ status: result.status, signal: result.signal, error: result.error || null });
        } finally {
            fs.closeSync(fd);
        }
    }
    return new Promise((resolve) => {
        const log = fs.createWriteStream(logFile, { flags: 'a' });
        let error = null;
        let settled = false;
        let timer = null;
        const settle = (status, signal) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            log.end(() => resolve({ status, signal, error }));
        };
        const child = spawn(shell.path, ['-c', cmd], { cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        child.stdout.pipe(log, { end: false });
        child.stderr.pipe(log, { end: false });
        if (timeout) {
            timer = setTimeout(() => {
                error = Object.assign(new Error(`timed out after ${timeout}s`), { code: 'ETIMEDOUT' });
                child.kill();
            }, timeout * 1000);
        }
        child.on('error', (err) => {
            error = error || err;
            settle(null, null);
        });
        child.on('close', settle);
    });
}

module.exports = { pickShell, execute };
