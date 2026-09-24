/** Retain actionable provider diagnostics, never request bodies, keys or images. */
export function generationError(error: unknown, stage: string) {
  const e=error as {name?:string;message?:string;statusCode?:number;responseBody?:string;responseHeaders?:Record<string,string>};
  let provider: {code?:string;type?:string;message?:string}={};
  try { provider=JSON.parse(e?.responseBody||'{}').error||{}; } catch { /* non-JSON response */ }
  const scrub=(v:unknown)=>String(v||'').replace(/Bearer\s+\S+|sk-[\w-]+/gi,'[redacted]').replace(/https?:\/\/\S+/g,'[url]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9+/=]{100,}/g,'[data]').slice(0,600);
  return {stage,name:scrub(e?.name||'UnknownError'),statusCode:Number.isFinite(e?.statusCode)?e.statusCode:null,
    code:scrub(provider.code||provider.type),message:scrub(provider.message||e?.message),
    requestId:scrub(e?.responseHeaders?.['request-id']||e?.responseHeaders?.['x-request-id']),at:new Date().toISOString()};
}
