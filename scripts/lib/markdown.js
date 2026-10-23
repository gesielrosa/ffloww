'use strict';

/**
 * Markdown helpers shared by the flow's scripts: run_proof.js writes evidence entries,
 * guard.js checks that nobody rewrites them. Both read headings the same way here.
 */

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

/** Heading text of an evidence entry written by run_proof.js, e.g. "Run 2026-10-23T18:42:10Z". */
function runHeading(isoStamp, label) {
    return `Run ${isoStamp}${label ? ` — ${label}` : ''}`;
}

/** True for a level-3 heading that run_proof.js wrote. */
function isRunHeading(heading) {
    return heading.level === 3 && /^Run \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\b/.test(heading.text);
}

/** The evidence entries run_proof.js wrote in a spec, each as its exact text (LF line ends). */
function runEntries(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const all = headings(lines);
    return all.filter(isRunHeading).map((heading) => {
        const next = all.find((h) => h.index > heading.index && h.level <= 3);
        let end = next ? next.index : lines.length;
        while (end > heading.index + 1 && lines[end - 1].trim() === '') end--;
        return lines.slice(heading.index, end).join('\n');
    });
}

module.exports = { headings, runHeading, isRunHeading, runEntries };
