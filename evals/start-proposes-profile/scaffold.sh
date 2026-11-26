#!/usr/bin/env bash
# A small Node project that has never used the flow: package.json with test and lint
# scripts, a pull-request template, conventional commit subjects, and a remote (a bare
# repo in .remote.git) whose default branch is main. The developer is on a ticket branch.
set -euo pipefail
git init -q -b main
mkdir -p src test tools .github

cat > package.json <<'JSON'
{
  "name": "labels",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node src/case.js",
    "test": "node --test",
    "lint": "node tools/lint.js"
  }
}
JSON
printf '{ "name": "labels", "lockfileVersion": 3, "packages": {} }\n' > package-lock.json
cat > src/case.js <<'JS'
'use strict';

/** "Invoice Number" -> "invoice_number" */
function toSnake(text) {
    return text.trim().toLowerCase().split(/\s+/).join('_');
}

module.exports = { toSnake };
JS
cat > test/case.test.js <<'JS'
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { toSnake } = require('../src/case');

test('toSnake joins lowercased words with underscores', () => {
    assert.equal(toSnake('Invoice Number'), 'invoice_number');
});
JS
cat > tools/lint.js <<'JS'
'use strict';

// The project's linter: source files use spaces, never tabs.
const fs = require('node:fs');
const path = require('node:path');

let bad = 0;
for (const dir of ['src', 'test']) {
    for (const name of fs.readdirSync(dir)) {
        if (fs.readFileSync(path.join(dir, name), 'utf8').includes('\t')) bad++;
    }
}
console.log(bad ? `${bad} file(s) with tabs` : 'lint ok');
process.exit(bad ? 1 : 0);
JS
cat > .github/pull_request_template.md <<'TEMPLATE'
## What changed

## Why

## How it was tested
TEMPLATE
commit() { git add -A && git -c user.name=fixture -c user.email=fixture@example.com commit -q -m "$1"; }
commit "chore: scaffold the labels package"
echo '// keys for the CSV export' >> src/case.js
commit "feat(case): add toSnake for column keys (LBL-3)"
echo '' >> tools/lint.js
commit "fix(lint): read test files too (LBL-5)"
git init -q --bare .remote.git
echo '.remote.git/' >> .git/info/exclude
git remote add origin .remote.git
git push -q origin main
git remote set-head origin main
git switch -q -c PRJ-export-csv
