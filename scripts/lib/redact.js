'use strict';

/**
 * Secret redaction for the evidence run_proof.js records. Recorded evidence is immutable
 * (guard.js blocks edits to it), so a secret has to be masked before it reaches a log, a
 * step spec, or the runner's own output.
 *
 * Two layers: the values of environment variables whose names mark them as secrets
 * (exact matches), then the shapes secrets take in commands and output (auth headers,
 * key=value pairs, credentials in URLs, private keys, well-known token formats).
 */

const MASK = '[REDACTED]';

// Name segments that mark an environment variable as a secret: GITHUB_TOKEN, DB_PASSWORD, AZURE_DEVOPS_PAT.
const SECRET_NAME = /(^|_)(TOKEN|SECRET|PASSWORD|PASSWD|PASS|PAT|APIKEY|API_KEY|ACCESS_KEY|PRIVATE_KEY|CLIENT_SECRET|CREDENTIALS?)(_|$)/i;
const MIN_SECRET_LENGTH = 8;

/** A value that only points at a secret ($TOKEN, <token>, ***), or is too short or plain to be one. */
function isPlaceholder(value) {
    return value.length < 6 || /^\d+$/.test(value) || /^[$<*[%{]/.test(value) || /^(true|false|null|undefined|none)$/i.test(value);
}

// [pattern, replace] pairs for the shapes secrets take in text; replace gets the match and its groups.
const SHAPES = [
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, () => `-----${MASK} PRIVATE KEY-----`],
    // "Authorization: Bearer abc" keeps its scheme: "Authorization: Bearer [REDACTED]".
    [
        /\b((?:proxy-)?authorization["']?[ \t]*[:=][ \t]*["']?)((?:bearer|basic|token|bot|digest)[ \t]+)?([^\s"',;]+)/gi,
        (match, key, scheme = '', value) => (isPlaceholder(value) || /^(bearer|basic|token|bot|digest)$/i.test(value) ? match : `${key}${scheme}${MASK}`),
    ],
    // Credentials in URLs: postgres://user:secret@host.
    [/\b([a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:)([^\s@/]+)@/gi, (match, prefix, secret) => (isPlaceholder(secret) ? match : `${prefix}${MASK}@`)],
    // key=value, key: value, "key": "value" — where the key ends in a secret word.
    [
        /\b([\w.-]*?(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|credentials?)["']?[ \t]*[:=][ \t]*)(["']?)([^\s"'&,;]+)/gi,
        (match, key, quote, value) => (isPlaceholder(value) ? match : `${key}${quote}${MASK}`),
    ],
    [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, () => MASK],
    [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, () => MASK],
    [/\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g, () => MASK],
    [/\bnpm_[A-Za-z0-9]{36}\b/g, () => MASK],
    [/\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}\b/g, () => MASK],
    [/\bAIza[0-9A-Za-z_-]{35}\b/g, () => MASK],
    [/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, () => MASK],
];

/** Secret values in the environment, longest first, so a value that contains another is masked whole. */
function secretValues(env) {
    return Object.entries(env)
        .filter(([name, value]) => SECRET_NAME.test(name) && typeof value === 'string' && value.length >= MIN_SECRET_LENGTH)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value.length - a.value.length);
}

/** Mask the secrets in text. Returns { text, count }, count being how many secrets were masked. */
function redact(text, env = process.env) {
    let count = 0;
    let out = text;
    for (const { name, value } of secretValues(env)) {
        const parts = out.split(value);
        count += parts.length - 1;
        out = parts.join(`[REDACTED:${name}]`);
    }
    for (const [pattern, replace] of SHAPES) {
        out = out.replace(pattern, (...args) => {
            const masked = replace(...args);
            if (masked !== args[0]) count++;
            return masked;
        });
    }
    return { text: out, count };
}

module.exports = { redact, MASK };
