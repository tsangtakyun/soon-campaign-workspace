// Explicit live verification: persists generation steps, never updates projects/images.
// Run with production env via `vercel env run -e production -- node ... RUN_ID`.
const {createClient}=require('@supabase/supabase-js');
const {load}=require('../tests/ts-loader.cjs');
async function main(){
  const id=process.argv[2];
  if(!id)throw new Error('An existing comparison alignment run ID is required');
  for(const key of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ANTHROPIC_API_KEY'])if(!process.env[key])throw new Error(`Live verification unavailable: ${key} is not supplied (sensitive production values cannot be exported).`);
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
  const {data:run,error}=await admin.from('content_project_generation_runs').select('input,project_id,workspace_id,actor_id').eq('id',id).single();
  if(error||run?.input?.key?.kind!=='comparison-alignment-v1')throw new Error('Comparison alignment run unavailable');
  const input=run.input.key.input;
  const page={headline:input.headline,comparisonLabels:input.dimensions,body:[...input.labels,...['L','R'].map(side=>input.facts.filter(f=>f.id.startsWith(side)).map(f=>f.text).join('\n')),'',input.source]};
  const {repairComparisonPage}=load('lib/repair-comparison-page.ts');
  const result=await repairComparisonPage({admin,projectId:run.project_id,workspaceId:run.workspace_id,actorId:run.actor_id},process.env.ANTHROPIC_API_KEY,process.env.ANTHROPIC_CONTENT_MODEL||'claude-sonnet-4-6',page);
  console.log(JSON.stringify({status:'PASS',comparisonLabels:result.comparisonLabels,body:result.body,repairId:result.comparisonRepairId,projectUnchanged:true},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
