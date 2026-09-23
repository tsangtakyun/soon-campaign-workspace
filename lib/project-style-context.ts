import { object, fingerprint } from './production-style'
import { confirmedProjectMaterials } from './confirmed-project-materials'
export function projectStyleContext(project: Record<string, unknown>, brand?:unknown) {
 const production=object(project.production), decision=object(project.format_decision)
 const format=project.selected_format==='short_video' ? decision.videoMethod==='ai_video_generation' ? 'ai_short_video' : 'human_short_video' : project.selected_format==='carousel' ? 'instagram_carousel' : 'instagram_single_feed'
 const brief=object(project.brief)
 // Crop-only metadata must not invalidate a previously accepted recommendation.
 const assets=Array.isArray(production.assets) ? production.assets.map(asset=>{const {subjectFocus,extensionOriginal,extensionId,...content}=object(asset);if(extensionOriginal){const {subjectFocus:originalFocus,...original}=object(extensionOriginal);return {...content,...original}}return content}) : production.assets || []
 const context={recommendationEngine:'production-v2',brand,format,brief:[project.title,brief.summary || project.source_note].filter(Boolean).join('\n'),story:production.script || production.pages || [],assets,materials:confirmedProjectMaterials(production,decision.confirmedMaterials),constraints:{angle:brief.angle,videoMethod:decision.videoMethod},topicVersion:fingerprint({source:project.source_note,brief:project.brief})}
 return {...context,inputHash:fingerprint(context)}
}
export const CREATOR_RENDERERS=['clear-magazine-carousel-v1','product-focus','ranking-review','editorial-clear','problem-solution','creator-natural','bold-social']

export async function projectBrand(admin: import('@supabase/supabase-js').SupabaseClient,workspaceId:string) {
 const [{data:workspace},{data:brandKit}]=await Promise.all([
 admin.from('workspaces').select('name,description,content_directions,market_locations').eq('id',workspaceId).maybeSingle(),
 admin.from('brand_kits').select('business_name,business_type,elevator_pitch,audience,market_positioning,brand_profile').eq('workspace_id',workspaceId).order('updated_at',{ascending:false}).limit(1).maybeSingle()])
 return {workspace,brandKit}
}
