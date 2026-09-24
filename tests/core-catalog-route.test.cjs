const assert=require('node:assert/strict'),{load}=require('./ts-loader.cjs');
let allowed=true,fail=false,calls=0;
const {GET}=load('app/api/content-styles/catalog/route.ts',{
 'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200,headers:options.headers})}},
 '@/lib/platform-access':{requireWorkspaceUser:async()=>({error:allowed?null:{status:403}})},
 '@/lib/core-catalog-selection':{catalogFormats:{carousel:'instagram_carousel'},catalogStyles:s=>s},
 '@/lib/production-style':{coreRegistry:async()=>{calls++;if(fail)throw Error('offline');return{registryVersion:'v',styles:[{code:'core'}]};},creatorCode:()=> 'creator'},
 '@/lib/oauth-connections':{isUuid:v=>v==='workspace'},
});
(async()=>{
 assert.equal((await GET(new Request('https://test/?workspaceId=bad&format=carousel'))).status,400);
 allowed=false;assert.equal((await GET(new Request('https://test/?workspaceId=workspace&format=carousel'))).status,403);assert.equal(calls,0);
 allowed=true;const ok=await GET(new Request('https://test/?workspaceId=workspace&format=carousel'));assert.equal(ok.body.styles[0].code,'creator');assert.equal(ok.headers['Cache-Control'],'private, no-store');
 fail=true;assert.equal((await GET(new Request('https://test/?workspaceId=workspace&format=carousel'))).status,503);
 console.log('PASS: catalog input validation, workspace authorization, no-store and explicit Core outage');
})().catch(e=>{console.error(e);process.exitCode=1});
