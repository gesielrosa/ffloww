'use strict';

/**
 * The project profile, .specs/PROJECT.md: what the flow has learned about a project that
 * every ticket needs and none should learn twice (how proofs run there, how work is
 * committed, how it ships). The developer and the phases write it as prose; the scripts
 * read only its settings, the lines written as "- Name: value".
 *
 * The file is the project's: it is written once, from the template below, and never
 * replaced. A setting that is empty or missing falls back to the flow's default.
 *
 * While nobody has filled it, `hints` reads the repository for what its first values
 * can be proposed from (the default branch, a pull-request template, the manifests and
 * their scripts, the CI files, recent commit subjects). It only lists what is there:
 * which script is the test, and what the developer prefers, is not its call.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROFILE_TEMPLATE = `# Project profile

> What the flow has learned about this project and every ticket needs: how proofs run
> here, how work is committed and how it ships. \`/flow:plan\` reads it and adds what its
> baseline shows, \`/flow:retro\` proposes changes to it, and you edit it freely. The
> lines written as "- Name: value" are settings the flow's scripts read.

## Proof commands

<!-- One line per command the flow uses as proof here: what it proves, the exact command
     with the flags that make its output valid evidence, how long it takes, and what to
     know before running it. For example:
       unit tests, one file: \`npx jest <path> --verbose\` (about 20 s)
       the whole suite: \`npm test\` (about 12 min; once per ticket, at verify) -->

- Fast ends at: <!-- the longest a proof may take and still run in every step, e.g. 60 s; a slower one runs once per ticket -->

## Commits

- Policy: per-step <!-- per-step | at-end: how a new ticket is committed -->
- Messages: <!-- the convention commit drafts follow, e.g. "feat(scope): summary (AB-1234)" -->

## Pull requests

- Base branch: <!-- the branch tickets merge into, as the remote names it, e.g. origin/main -->
- Format: <!-- the template a PR draft fills (a path), or the shape you want: sections, length, where the proof goes. Empty: the flow's own draft -->

## Notes

<!-- Anything else every ticket should know about working here with the flow. -->
`;

const POLICIES = ['per-step', 'at-end'];

/** The value of a "- <Name>: <value>" line, its comments left out; '' when unset or absent. */
function setting(text, name) {
    const prefix = `- ${name.toLowerCase()}:`;
    const line = text.replace(/\r\n/g, '\n').split('\n').find((l) => l.trim().toLowerCase().startsWith(prefix));
    if (!line) return '';
    return line.slice(line.indexOf(':') + 1).replace(/<!--[\s\S]*?-->/g, '').replace(/`/g, '').trim();
}

/** The profile's file under a project root. */
function profilePath(root) {
    return path.join(root, '.specs', 'PROJECT.md');
}

/**
 * The settings the scripts read, as { exists, commit, base }: the commit policy of a new
 * ticket ('' unless it is one the flow knows) and the branch tickets merge into.
 */
function readProfile(root) {
    const file = profilePath(root);
    if (!fs.existsSync(file)) return { exists: false, commit: '', base: '' };
    const text = fs.readFileSync(file, 'utf8');
    const policy = setting(text, 'Policy').split(/\s+/)[0];
    return {
        exists: true,
        commit: POLICIES.includes(policy) ? policy : '',
        base: setting(text, 'Base branch').split(/\s+/)[0],
    };
}

/** True while the profile is the template as written: nobody has filled it yet. */
function untouched(root) {
    const file = profilePath(root);
    return fs.existsSync(file) && fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') === PROFILE_TEMPLATE;
}

/** git's trimmed output in a folder, or null when it fails. */
function git(root, args) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    return result.status === 0 ? String(result.stdout).trim() : null;
}

/** The names in a folder, or none when it is not one. */
function entries(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }
}

/** The branch tickets most likely merge into: the remote's default, else a main or master it has. */
function baseHint(root) {
    const head = git(root, ['symbolic-ref', '-q', '--short', 'refs/remotes/origin/HEAD']);
    if (head) return `${head} (the remote's default branch)`;
    const guess = ['origin/main', 'origin/master'].find((ref) => git(root, ['rev-parse', '--verify', '-q', `${ref}^{commit}`]) !== null);
    return guess ? `${guess} (the remote has it; its default branch is not recorded here)` : null;
}

/** Pull-request and merge-request templates, where hosts look for them. */
function templateHints(root) {
    const found = [];
    for (const dir of ['', 'docs', '.github', '.azuredevops', '.gitlab']) {
        for (const entry of entries(path.join(root, dir))) {
            const name = entry.name.toLowerCase();
            const at = dir ? `${dir}/${entry.name}` : entry.name;
            if (entry.isFile() && name === 'pull_request_template.md') found.push(at);
            else if (entry.isDirectory() && ['pull_request_template', 'merge_request_templates'].includes(name)) {
                const inside = entries(path.join(root, dir, entry.name)).filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'));
                if (inside.length) found.push(`${at}/ (${inside.map((e) => e.name).join(', ')})`);
            }
        }
    }
    return found;
}

// Manifests at the project root that say how it builds and tests.
const MANIFESTS = ['package.json', 'nx.json', 'turbo.json', 'pnpm-workspace.yaml', 'Makefile', 'pyproject.toml', 'tox.ini', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'Gemfile', 'composer.json', 'mix.exs'];
const LOCKFILES = { 'pnpm-lock.yaml': 'pnpm', 'yarn.lock': 'yarn', 'bun.lockb': 'bun', 'bun.lock': 'bun', 'package-lock.json': 'npm' };
// Script names that are usually a proof: the tests, the guards, the builds.
const PROOF_SCRIPT = /(^|[:_-])(test|tests|spec|lint|typecheck|type-check|types|tsc|check|e2e|build|format|fmt)([:_-]|$)/i;
const MAX_SCRIPTS = 10;
const MAX_COMMITS = 8;

/** The manifests at the root, package.json with the package manager its lockfile names. */
function manifestHints(root) {
    const names = new Set(entries(root).filter((e) => e.isFile()).map((e) => e.name));
    const manager = Object.keys(LOCKFILES).find((file) => names.has(file));
    const found = MANIFESTS.filter((name) => names.has(name)).map((name) => (name === 'package.json' && manager ? `package.json (${LOCKFILES[manager]})` : name));
    const solutions = [...names].filter((name) => /\.(sln|csproj)$/.test(name));
    return [...found, ...solutions];
}

/** package.json scripts that look like proofs, as `name = "command"`. */
function scriptHints(root) {
    let scripts;
    try {
        scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
    } catch {
        return [];
    }
    const short = (text) => (text.length > 70 ? `${text.slice(0, 67)}…` : text);
    return Object.entries(scripts).filter(([name]) => PROOF_SCRIPT.test(name)).slice(0, MAX_SCRIPTS).map(([name, cmd]) => `${name} = ${JSON.stringify(short(String(cmd)))}`);
}

/** The CI definitions, where the project's own checks are spelled out. */
function ciHints(root) {
    const workflows = entries(path.join(root, '.github', 'workflows')).filter((e) => e.isFile() && /\.ya?ml$/.test(e.name)).map((e) => `.github/workflows/${e.name}`);
    const others = ['azure-pipelines.yml', '.gitlab-ci.yml', 'Jenkinsfile', 'bitbucket-pipelines.yml'].filter((name) => fs.existsSync(path.join(root, name)));
    return [...workflows.slice(0, 5), ...others];
}

/**
 * What the repository shows that the profile's first values can be proposed from, as
 * lines to print; empty when it shows nothing.
 */
function hints(root) {
    const lines = [];
    const add = (label, values) => {
        const list = [].concat(values || []).filter(Boolean);
        if (list.length) lines.push(`   ${`${label}:`.padEnd(15)}${list.join(' · ')}`);
    };
    add('Base branch', baseHint(root));
    add('PR template', templateHints(root));
    add('Manifests', manifestHints(root));
    add('Scripts', scriptHints(root));
    add('CI', ciHints(root));
    const subjects = (git(root, ['log', '--no-merges', `-${MAX_COMMITS}`, '--format=%s']) || '').split('\n').filter(Boolean);
    if (subjects.length) lines.push('   Recent commits:', ...subjects.map((subject) => `     ${subject.slice(0, 100)}`));
    return lines;
}

module.exports = { PROFILE_TEMPLATE, setting, profilePath, readProfile, untouched, hints };
