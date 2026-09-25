const assert=require('node:assert/strict'),{load}=require('./ts-loader.cjs');
const c=require('./fixtures/clear-magazine-v3.contract.json');
c.structure={mode:'fixed',page_count:6,page_roles:['cover','longform','split','comparison','feature','end'].map(role=>({role,required:true,repeatable:false}))};
const {applyCoreTemplateStructure}=load('lib/core-template-contract.ts');
const before=JSON.stringify(c);
for(const count of [3,6,7,10]){
 const input=Array.from({length:count},(_,i)=>({headline:`Topic ${i}`,role:i===0?'cover':i===count-1?'end':'comparison'}));
 const pages=applyCoreTemplateStructure(input,c);
 assert.equal(pages.length,count);
 assert.equal(pages[0].role,'cover');assert.equal(pages.at(-1).role,'end');
 assert.ok(pages.slice(1,-1).every(p=>p.role==='comparison'));
 assert.equal(pages.at(-1).page,`P.${count}`);
 assert.equal(pages.at(-1).headline,`Topic ${count-1}`);
}
assert.equal(applyCoreTemplateStructure([],c).length,0,'style selection cannot manufacture six empty pages');
assert.equal(JSON.stringify(c),before,'published design library unchanged');
const schema=load('lib/draft-output.ts').draftOutputSchema;
function check(node){if(node.type==='object')assert.deepEqual([...node.required].sort(),Object.keys(node.properties).sort(),'no optional grammar branches');for(const child of Object.values(node.properties||{}))check(child);if(node.items)check(node.items);}
check(schema);
console.log('PASS content-driven 3/6/7/10 pages, repeated comparisons, immutable master library, bounded schema grammar');
