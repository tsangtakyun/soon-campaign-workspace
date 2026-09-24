import type { SupabaseClient } from '@supabase/supabase-js';

export class RequestAuthError extends Error {
  constructor(message:string,public status:401|503){super(message);}
}
function transient(error:any):boolean {
  return error?.name==='AuthRetryableFetchError'||[0,429,502,503,504].includes(error?.status)||
    /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|fetch failed|network/i.test(`${error?.message||''} ${error?.cause?.code||''}`)||Number(error?.status)>=500;
}
/** Retry only authentication reads, never the generation or project mutation. */
export async function verifiedRequestUser(client:Pick<SupabaseClient,'auth'>,pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms))){
  for(let attempt=0;attempt<3;attempt++){
    let result;
    try{result=await client.auth.getUser();}
    catch(error){result={data:{user:null},error};}
    const {data,error}=result;
    if(!error&&data.user)return data.user;
    if(transient(error)){
      if(attempt<2){await pause(250*(attempt+1));continue;}
      console.warn('[request-auth] verification unavailable after 3 attempts');
      throw new RequestAuthError('登入驗證服務暫時未能連線；已保存進度保留，請稍後重試，毋須重新上載。',503);
    }
    if(!error||['AuthSessionMissingError'].includes((error as any)?.name)||[400,401,403].includes((error as any)?.status))
      throw new RequestAuthError('登入已失效，請重新登入後繼續；已保存進度保留。',401);
    // Unknown service/configuration failures are not evidence of an expired login.
    throw new RequestAuthError('暫時未能驗證登入；已保存進度保留，請稍後重試。',503);
  }
  throw new RequestAuthError('暫時未能驗證登入，請稍後重試。',503);
}
