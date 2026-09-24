import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/oauth-connections';
import { createServerSupabase } from '@/lib/server-supabase';
import { getWorkspaceAccess } from '@/lib/workspace-access';
import { createCoreMasterCanvas, getCoreMasterPageDesign } from '@/lib/content-templates/core-master-template';
import { resolveClearMagazineRole } from '@/lib/content-templates/clear-magazine-carousel-v1';
import { resolveContentBranding, findBrandTypeface } from '@/lib/content-branding';

export async function GET(req:Request) {
  const params=new URL(req.url).searchParams;
  const workspaceId=params.get('workspaceId')||'',projectId=params.get('projectId')||'',page=params.get('page')||'';
  if(!isUuid(workspaceId)||!isUuid(projectId)||!/^P\.\d+$/.test(page))return NextResponse.json({error:'Invalid request'},{status:400});
  const {data:{user}}=await createServerSupabase(await cookies()).auth.getUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const access=await getWorkspaceAccess({email:user.email,userId:user.id,workspaceId});
  if(!access || !['owner','admin'].includes(access.role))return NextResponse.json({error:'Forbidden'},{status:403});
  try {
    const {data:project,error}=await access.admin.from('content_projects').select('id,title,production,format_decision,updated_at').eq('id',projectId).eq('workspace_id',workspaceId).maybeSingle();
    if(error)throw error;
    if(!project)return NextResponse.json({error:'找不到專案'},{status:404});
    const saved=project.production?.editorDesigns?.[page];
    const savedObjects=saved?.canvasJson?.objects;
    // Old one-PNG editor saves are migrated from the retained master and copy, not reused as layers.
    const flattened=Array.isArray(savedObjects)&&savedObjects.length===1&&savedObjects[0]?.data?.id==='carousel-generated-design';
    if(saved?.canvasJson && !flattened)return NextResponse.json({...saved,projectUpdatedAt:project.updated_at},{headers:{'Cache-Control':'private, no-store'}});
    const drafts=project.production?.pageDrafts || [],index=Number(page.slice(2))-1,draft=drafts[index];
    if(!draft)return NextResponse.json({error:'找不到本頁草稿'},{status:404});
    const role=resolveClearMagazineRole(draft,index,drafts.length);
    const contract=project.format_decision?.templateContractSnapshot;
    const design=getCoreMasterPageDesign(contract,role);
    if(!design)return NextResponse.json({error:'此頁缺少可編輯母版，未有載入合成圖片代替。'},{status:409});
    const [{data:workspace},{data:kit},{data:profile}]=await Promise.all([
      access.admin.from('workspaces').select('name,logo_url,font_style').eq('id',workspaceId).maybeSingle(),
      access.admin.from('brand_kits').select('logo_url,typeface_family,typeface_id').eq('workspace_id',workspaceId).order('updated_at',{ascending:false}).limit(1).maybeSingle(),
      access.admin.from('brand_profiles').select('business_name').eq('workspace_id',workspaceId).maybeSingle(),
    ]);
    const name=profile?.business_name || workspace?.name || 'SOON';
    const brand=resolveContentBranding(workspace,kit,name),typeface=findBrandTypeface(brand.fontStyle);
    const family=typeface?.fontFamily || (contract?.typography?.locked?'SOON Magazine Sans':'SweiGothicCJKtc-Regular');
    const ids=[...new Set([...(draft.assetIds||[]),draft.assetId].filter(Boolean))];
    const assets=project.production?.assets || [];
    const primary=assets.find((a:{id:string})=>a.id===ids[0]),secondary=assets.find((a:{id:string})=>a.id===ids[1]);
    const canvasJson=createCoreMasterCanvas({design,copy:draft,page:`${String(index+1).padStart(2,'0')} / ${String(drafts.length).padStart(2,'0')}`,
      primary:primary?{...primary,position:draft.imagePosition || 'center'}:undefined,secondary:secondary?{...secondary,position:draft.secondaryImagePosition || 'center'}:undefined,
      branding:{name,logoUrl:brand.logoUrl},fonts:{family,editorialFamily:typeface?family:contract?.typography?.locked?'SOON Magazine Serif':'Noto Serif TC'}});
    return NextResponse.json({canvasJson,canvasWidth:1080,canvasHeight:1350,projectUpdatedAt:project.updated_at,migrated:flattened},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){console.error('[editor-document]',error);return NextResponse.json({error:'未能載入可編輯圖層，請重試。'},{status:500});}
}
