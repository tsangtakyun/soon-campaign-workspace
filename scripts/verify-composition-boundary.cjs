// Opt-in integration probe: persists one boundary-analysis result; never changes
// project assets, generated pages or approved designs, and never generates images.
const {createHash}=require('node:crypto');
const {load}=require('../tests/ts-loader.cjs');
if(!process.argv.includes('--live'))throw Error('Use --live for the scoped, persisted AI analysis probe');
const workspace='6743d1ab-5373-4f44-815e-d73e4ba122b6',project='6a9f176d-5560-4512-8c13-f8bcdd7b1b5d',assetId='8bbb2df8-d0d0-4a39-a7c3-22ab925e60f0';
const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
async function rest(path,method='GET',body){
 const r=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});
 if(!r.ok)throw Error('Persistence request failed '+r.status);return r.json();
}
async function main(){
 if(!process.env.ANTHROPIC_API_KEY)throw Error('Live verification requires configured Anthropic environment');
 const [p]=await rest(`content_projects?select=production,created_by&id=eq.${project}&workspace_id=eq.${workspace}`);
 const asset=p.production.assets.find(a=>a.id===assetId);if(!asset)throw Error('Scoped asset missing');
 const bg=load('lib/background-extension.ts'),quality=load('lib/extension-quality.ts');
 const plan=await bg.prepareExtension(await bg.loadExtensionSource(asset.url),{aspectRatio:523/1350,topFraction:.5});
 const hash=createHash('sha256').update('geometry-whitelist-probe-v1:'+asset.url).digest('hex');
 const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
 const filter=`id=eq.${id}&workspace_id=eq.${workspace}`;
 const [prior]=await rest(`content_project_generation_runs?select=status,output&${filter}`);
 if(prior && prior.output?.failures?.[0]?.name!=='AI_LoadAPIKeyError'){console.log(JSON.stringify({id,cached:true,status:prior.status,boundaries:prior.output?.boundaries}));return;}
 if(prior)await rest(`content_project_generation_runs?${filter}&status=eq.failed`,'PATCH',{status:'pending',updated_at:new Date().toISOString()});
 else await rest('content_project_generation_runs','POST',{id,project_id:project,workspace_id:workspace,actor_id:p.created_by,status:'pending',model:'claude-haiku-4-5',input:{kind:'geometry-whitelist-probe-v1',assetId,geometry:quality.geometryMetadata(plan)}});
 try{
  const result=await quality.inspectExtensionBoundaries(plan.original,plan);
  const output={boundaries:result.output,usage:result.usage,estimatedCostUsd:null,costBasis:'Provider usage retained',model:'claude-haiku-4-5',geometry:quality.geometryMetadata(plan),applied:false};
  await rest(`content_project_generation_runs?${filter}`,'PATCH',{status:'ready',output,updated_at:new Date().toISOString()});
  console.log(JSON.stringify({id,status:'ready',usage:result.usage,boundaries:result.output,sourceBytes:plan.original.length,geometryCharacters:JSON.stringify(quality.geometryMetadata(plan)).length}));
 }catch(e){
  const diagnostic=load('lib/generation-error.ts').generationError(e,'boundary_analysis');
  await rest(`content_project_generation_runs?${filter}`,'PATCH',{status:'failed',error:diagnostic.message,output:{failures:[diagnostic]},updated_at:new Date().toISOString()});
  console.error(diagnostic);process.exitCode=1;
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
