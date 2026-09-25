const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('app/onboarding/content-studio/page.tsx','utf8');
for(const text of ['今次想製作甚麼內容？','我已有內容','我只有想法','開始製作 →','到題材庫找靈感 →','更新 {details.updated}'])assert.ok(source.includes(text),text);
for(const removed of ['讓 SOON 幫我整理 →','下一步會提供 2–3 個內容方向','支援文字、網址及零散重點'])assert.ok(!source.includes(removed),removed);
assert.ok(source.includes('className="project-card-menu"'));
assert.ok(source.includes('projectListDetails(project)'));
console.log('PASS content entry: clear source choice, direct CTA, useful project metadata, hidden destructive action');
