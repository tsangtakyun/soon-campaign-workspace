// Explicitly requested retry for the two assets disabled by the old safety reset.
// Dry-run by default; retain before-images and use optimistic concurrency.
const projectId='6a9f176d-5560-4512-8c13-f8bcdd7b1b5d',workspaceId='6743d1ab-5373-4f44-815e-d73e4ba122b6';
const ids=['8bbb2df8-d0d0-4a39-a7c3-22ab925e60f0','f2b504ab-6219-4911-af71-df29145fdc1d'];
const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
async function request(path,options={}){const r=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers}});if(!r.ok)throw Error('Database HTTP '+r.status);return r.json();}
(async()=>{
 const [p]=await request(`content_projects?select=production,updated_at&id=eq.${projectId}&workspace_id=eq.${workspaceId}`);
 if(!p)throw Error('Project missing');
 const before=p.production.assets.filter(a=>ids.includes(a.id)&&a.autoExtensionDeclinedUrl===a.url&&!a.extensionOriginal);
 if(!before.length){console.log('No eligible markers; unchanged');return;}
 const production={...p.production,assets:p.production.assets.map(a=>before.some(b=>b.id===a.id)?{...a,autoExtensionDeclinedUrl:undefined}:a),
 recoveryHistory:[...(p.production.recoveryHistory||[]),{at:new Date().toISOString(),reason:'User requested P.3/P.6 automatic extension retry; clear only disabled markers',assets:before}]};
 console.log(JSON.stringify({pages:['P.3','P.6'],markers:before.length,cover:'unchanged',images:'unchanged',apply:process.argv.includes('--apply')}));
 if(!process.argv.includes('--apply'))return;
 const saved=await request(`content_projects?id=eq.${projectId}&workspace_id=eq.${workspaceId}&updated_at=eq.${encodeURIComponent(p.updated_at)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({production,updated_at:new Date().toISOString()})});
 if(saved.length!==1)throw Error('Concurrent change; no update applied');
 console.log('Retry enabled; before-images retained. No image regeneration performed.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
