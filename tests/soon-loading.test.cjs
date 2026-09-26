const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('components/ui/SoonLoading.tsx', 'utf8');

for (const text of ["status?: 'pending' | 'active' | 'done'", 'aria-label="處理進度"', "normalized.status === 'done'", "normalized.status === 'active'"]) {
  assert.ok(source.includes(text), text);
}

assert.ok(source.includes('.soon-loading-steps span.done'));
assert.ok(source.includes('.soon-loading-steps span.active'));
console.log('PASS SoonLoading: shared full-page pattern supports pending, active and completed steps');
