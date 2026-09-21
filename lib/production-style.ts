import 'server-only'
import { createHash } from 'node:crypto'
export type RecordValue = Record<string, unknown>
export type ProductionStyle = {
  styleId: string; code: string; name: string; format: string; description: string;
  version: { id: string; number: number; ref: string; contentHash: string; rules: RecordValue };
  templates: Array<{ templateId:string; code:string; version:{ id:string; number:number; ref:string; rendererCode:string; contentHash:string; contract:RecordValue; creatorCommit?:string|null } }>;
  recommendation?: { reason:string; angle:string; gaps:string[]; score:number };
}
export type StyleResult = { id:string; registryVersion:string; contextHash:string; candidateCount:number; styles:ProductionStyle[]; emptyReason:string; outputCapability:string }
export const object = (v:unknown):RecordValue => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {}
export const fingerprint = (v:unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex')
export const coreCode = (v:unknown) => v === 'product-focus' ? 'product_focus' : v === 'ranking-review' ? 'ranking_review' : String(v || '')
export const creatorCode = (v:string) => v === 'product_focus' ? 'product-focus' : v === 'ranking_review' ? 'ranking-review' : v
export const materialFlags = (v:unknown) => ['photos','footage','presenter','research'].filter(x=>Array.isArray(v)&&v.includes(x))
export async function coreRegistry(format:string) {
 const key=process.env.SOON_CORE_KNOWLEDGE_KEY || process.env.SOON_CORE_BUNDLE_KEY
 if(!key) throw new Error('未能連接風格庫，請稍後重試。')
 const r=await fetch(`${(process.env.SOON_CORE_URL || 'https://soon-core.vercel.app').replace(/\/$/,'')}/api/intelligence/styles?format=${encodeURIComponent(format)}`,{headers:{'x-soon-knowledge-key':key},cache:'no-store',signal:AbortSignal.timeout(15000)})
 if(!r.ok) throw new Error('未能讀取已發布風格。')
 return await r.json() as {registryVersion:string;styles:ProductionStyle[]}
}
export async function rankProduction(input:RecordValue):Promise<StyleResult> {
 const key=process.env.SOON_CORE_KNOWLEDGE_KEY || process.env.SOON_CORE_BUNDLE_KEY
 if(!key) throw new Error('未能連接風格庫，請稍後重試。')
 const r=await fetch(`${(process.env.SOON_CORE_URL || 'https://soon-core.vercel.app').replace(/\/$/,'')}/api/intelligence/styles/production-recommend`,{method:'POST',headers:{'content-type':'application/json','x-soon-knowledge-key':key},body:JSON.stringify(input),cache:'no-store',signal:AbortSignal.timeout(115000)})
 const result=await r.json()
 if(!r.ok) throw new Error(result.error || '風格分析未完成，請重試。')
 return result as StyleResult
}
export function styleSnapshot(style:ProductionStyle,result:StyleResult,inputHash:string,topicVersion:string) {
 return {schemaVersion:1,styleCode:style.code,styleId:style.styleId,styleVersionId:style.version.id,styleVersionRef:style.version.ref,styleContentHash:style.version.contentHash,styleRulesSnapshot:style.version.rules,styleName:style.name,format:style.format,registryVersion:result.registryVersion,recommendationId:result.id,inputHash,topicVersion,template:style.templates[0] || null,outputCapability:result.outputCapability,selectedAt:new Date().toISOString()}
}
export async function validateSelection(style:ProductionStyle) {
 const registry=await coreRegistry(style.format)
 const current=registry.styles.find(s=>s.code===style.code && s.version.id===style.version.id && s.version.contentHash===style.version.contentHash)
 if(!current) throw new Error('風格版本已更新或停用，請重新分析後選擇。')
 const template=style.templates[0]
 if(template && !current.templates.some(t=>t.version.id===template.version.id&&t.version.contentHash===template.version.contentHash)) throw new Error('版面版本已更新，請重新分析後選擇。')
 return style
}
