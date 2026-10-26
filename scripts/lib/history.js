'use strict';

/**
 * The texts the flow has written into projects over its versions: every CONVENTIONS.md
 * body and every step template, kept under scripts/history/<kind>/ and named by the
 * digest of their text. A file an earlier version wrote is recognized by it: unedited,
 * it is replaced by the current text; edited, the text it started from is the base for
 * a merge. The current texts are kept there too (tests/upgrade.test.js checks), so a
 * template change always leaves its predecessor behind.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'history');

/** Short sha256 of a text. */
function digest(text) {
    return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/** A text as its template: LF line ends, and the date older contracts carried back to its placeholder. */
function template(text) {
    return text.replace(/\r\n/g, '\n').replace(/Generated \d{4}-\d{2}-\d{2}\./, 'Generated {date}.');
}

/** The file of a shipped text with this digest, or null. */
function shipped(kind, hash) {
    const file = path.join(DIR, kind, `${hash}.md`);
    return fs.existsSync(file) ? file : null;
}

/** Every shipped text of a kind, as { file, text }. */
function all(kind) {
    const dir = path.join(DIR, kind);
    return fs.readdirSync(dir).filter((n) => n.endsWith('.md')).map((n) => ({ file: path.join(dir, n), text: fs.readFileSync(path.join(dir, n), 'utf8') }));
}

/** The shipped text an edited one most likely started from: its file, or null when under half its lines remain. */
function nearest(kind, text) {
    const local = new Set(template(text).split('\n').map((l) => l.trim()).filter(Boolean));
    let best = null;
    for (const { file, text: base } of all(kind)) {
        const lines = base.split('\n').map((l) => l.trim()).filter(Boolean);
        const score = lines.filter((l) => local.has(l)).length / lines.length;
        if (score >= 0.5 && (!best || score > best.score)) best = { file, score };
    }
    return best ? best.file : null;
}

module.exports = { DIR, digest, template, shipped, all, nearest };
