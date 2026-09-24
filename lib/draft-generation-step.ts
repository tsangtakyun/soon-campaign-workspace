import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type DraftScope = { admin: SupabaseClient; workspaceId: string; projectId: string; actorId: string };
export class DraftStepError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
const table = 'content_project_generation_runs';
export function draftStepId(scope: DraftScope, key: unknown) {
  const hash = createHash('sha256').update(JSON.stringify([scope.workspaceId, scope.projectId, key])).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
export async function readDraftStep(scope: DraftScope, key: unknown) {
  const id = draftStepId(scope, key);
  const {data,error} = await scope.admin.from(table).select('status,output,updated_at').eq('id',id).eq('workspace_id',scope.workspaceId).eq('project_id',scope.projectId).maybeSingle();
  if (error) throw new DraftStepError('未能讀取已保存進度，請稍後重試。',503);
  return {id,record:data};
}
export async function runDraftStep(scope: DraftScope, key: unknown, model: string, execute: () => Promise<Record<string,unknown>>, validate?: (result:Record<string,unknown>)=>void) {
  const {id,record} = await readDraftStep(scope,key);
  if (record?.output?.completed === true) { console.info('[draft-step] cached',{id}); return {id,output:record.output,cached:true}; }
  // A lease is longer than the route's maximum execution time. Concurrent clicks never start a second paid call.
  if (record?.status === 'pending' && Date.now()-Date.parse(record.updated_at)<240_000)
    throw new DraftStepError('同一批草稿正在處理中，請稍後再試；已完成步驟會保留。',409);
  const lease = new Date().toISOString();
  const claim = record
    ? await scope.admin.from(table).update({status:'pending',error:null,updated_at:lease}).eq('id',id).eq('status',record.status).eq('updated_at',record.updated_at).select('id').maybeSingle()
    : await scope.admin.from(table).insert({id,project_id:scope.projectId,workspace_id:scope.workspaceId,actor_id:scope.actorId,status:'pending',model,input:{kind:'draft-step-v1',key},updated_at:lease}).select('id').maybeSingle();
  if (claim.error || !claim.data) throw new DraftStepError('此步驟已在處理，請稍後重試。',409);
  console.info('[draft-step] started',{id,model});
  let result:Record<string,unknown>|undefined;
  try {
    result=await execute();
    validate?.(result);
    const output={...result,completed:true,model,createdAt:new Date().toISOString(),estimatedCostUsd:null,costNote:'Token usage recorded; monetary estimate unavailable'};
    const {error}=await scope.admin.from(table).update({status:'ready',output,updated_at:new Date().toISOString()}).eq('id',id).eq('updated_at',lease);
    if(error) throw new DraftStepError('未能保存生成結果，請稍後重試。',503);
    console.info('[draft-step] saved',{id,model});
    return {id,output,cached:false};
  } catch(error) {
    await scope.admin.from(table).update({status:'failed',...(result?{output:{...result,completed:false,model}}:{}),error:error instanceof Error ? error.message : '生成未完成',updated_at:new Date().toISOString()}).eq('id',id).eq('updated_at',lease);
    throw error;
  }
}

export async function draftAnthropic(apiKey: string, body: Record<string,unknown>, timeoutMs: number) {
  try {
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
    const data=await response.json();
    if(!response.ok) throw new DraftStepError('AI 服務暫時未能完成，已完成步驟已保留，請稍後重試。',response.status===429 ? 429 : 502);
    return data;
  } catch(error) {
    if(error instanceof Error && ['TimeoutError','AbortError'].includes(error.name))
      throw new DraftStepError('AI 此步驟逾時；已完成的圖片分析及草稿結果會保留。請稍後按同一按鈕繼續，毋須重新建立內容。',504);
    throw error;
  }
}
