import { hasCoreMasterDesigns } from '@/lib/content-templates/core-master-template'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'
import { coreRegistry, creatorCode, rankProduction, type StyleResult } from '@/lib/production-style'
import { projectStyleContext, projectBrand, CREATOR_RENDERERS } from '@/lib/project-style-context'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
export async function POST(request:Request) {
 const body=await request.json().catch(()=>({}))
 if(!isUuid(body.workspaceId)||!isUuid(body.projectId)) return NextResponse.json({error:'Invalid project'}, {status:400})
 const supabase=createServerSupabase(await cookies())
 const {data:{user}}=await supabase.auth.getUser()
 if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
 const access=await getWorkspaceAccess({email:user.email,userId:user.id,workspaceId:body.workspaceId})
 if(!access || !['owner','admin'].includes(access.role)) return NextResponse.json({error:'Forbidden'},{status:403})
 try {
  const {data:project}=await access.admin.from('content_projects').select('id,title,source_note,brief,production,format_decision,selected_format').eq('id',body.projectId).eq('workspace_id',body.workspaceId).maybeSingle()
  if(!project) return NextResponse.json({error:'找不到專案'},{status:404})
  if(project.production?.status!=='structure_confirmed' || (project.selected_format!=='short_video' && project.production?.assetStatus!=='confirmed')) return NextResponse.json({error:'請先確認故事結構及素材。'},{status:409})
  const brand=await projectBrand(access.admin,body.workspaceId)
  const input=projectStyleContext(project,brand), registry=await coreRegistry(input.format)
  const {data:cached,error:readError}=await access.admin.from('content_project_style_runs').select('result').eq('project_id',project.id).eq('input_hash',input.inputHash).eq('registry_version',registry.registryVersion).maybeSingle()
  if(readError) throw readError
  const result:StyleResult=cached?.result || await rankProduction({...input,consumer:'creator',projectId:project.id,workspaceId:body.workspaceId,brand,renderers:[...CREATOR_RENDERERS,...registry.styles.flatMap(style=>style.templates.filter(t=>hasCoreMasterDesigns(t.version.contract)).map(t=>t.version.rendererCode))]})
  if(!cached){const {error}=await access.admin.from('content_project_style_runs').upsert({project_id:project.id,workspace_id:body.workspaceId,input_hash:input.inputHash,registry_version:result.registryVersion,result},{onConflict:'project_id,input_hash,registry_version'});if(error)throw error}
  return NextResponse.json({...result,inputHash:input.inputHash,styles:result.styles.map(style=>({...style,coreCode:style.code,code:creatorCode(style.code),creatorSource:'soon_core'}))},{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'未能分析風格，請重試。'},{status:503})}
}
