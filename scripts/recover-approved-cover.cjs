// Scoped recovery of the user-approved cover after the 2026-09-24 blanket reset.
// Dry-run unless --apply. Keeps an in-project before-image and uses optimistic CAS.
const projectId='6a9f176d-5560-4512-8c13-f8bcdd7b1b5d',workspaceId='6743d1ab-5373-4f44-815e-d73e4ba122b6',runId='258a47a4-a17a-50a3-ae69-47b46bb00d00';
const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
async function request(path,options={}){const r=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers}});if(!r.ok)throw Error('Database HTTP '+r.status);return r.json();}
(async()=>{
 const [project]=await request(`content_projects?select=production,updated_at&id=eq.${projectId}&workspace_id=eq.${workspaceId}`);
 const [run]=await request(`content_project_generation_runs?select=id,status,input,output&id=eq.${runId}&project_id=eq.${projectId}&workspace_id=eq.${workspaceId}`);
 if(!project || run?.status!=='ready' || !run.output?.url)throw Error('Missing recovery evidence');
 const production=project.production,asset=production.assets.find(a=>a.id===run.input.assetId);
 if(asset?.extensionId===runId){console.log('Already restored; no mutation');return;}
 if(!asset || asset.url!==run.output.originalUrl || asset.extensionOriginal)throw Error('Asset changed; manual review required');
 const imageUrl=`https://auth.sooncreator.network/storage/v1/object/public/brand-assets/${workspaceId}/content-projects/${projectId}/carousel/p-1-1790231279055.png`;
 for(const url of [imageUrl,run.output.url])if(!(await fetch(url,{method:'HEAD'})).ok)throw Error('Recovery image unavailable');
 const next={...production,assets:production.assets.map(a=>a.id!==asset.id?a:{...a,url:run.output.url,width:run.output.width,height:run.output.height,subjectFocus:null,extensionId:runId,extensionUserApprovedId:runId,extensionOriginal:{url:asset.url,width:asset.width,height:asset.height,subjectFocus:asset.subjectFocus},autoExtensionDeclinedUrl:undefined}),generatedPages:production.generatedPages.map(p=>p.page==='P.1'?{...p,url:imageUrl}:p),
 recoveryHistory:[...(production.recoveryHistory||[]),{at:new Date().toISOString(),reason:'Restore user-approved cover only; preserve all other pages',asset,page:production.generatedPages.find(p=>p.page==='P.1')}]};
 console.log(JSON.stringify({action:'restore-approved-cover',page:'P.1',otherPages:'unchanged',apply:process.argv.includes('--apply')}));
 if(!process.argv.includes('--apply'))return;
 const saved=await request(`content_projects?id=eq.${projectId}&workspace_id=eq.${workspaceId}&updated_at=eq.${encodeURIComponent(project.updated_at)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({production:next,updated_at:new Date().toISOString()})});
 if(saved.length!==1)throw Error('Concurrent change; not applied');
 console.log('Restored approved cover asset and PNG; before-image retained in recoveryHistory.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
