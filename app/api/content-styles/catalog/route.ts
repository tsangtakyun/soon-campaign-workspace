import {NextResponse} from 'next/server';
import {requireWorkspaceUser} from '@/lib/platform-access';
import {catalogFormats,catalogStyles} from '@/lib/core-catalog-selection';
import {coreRegistry,creatorCode} from '@/lib/production-style';
import {isUuid} from '@/lib/oauth-connections';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const url=new URL(request.url),workspaceId=url.searchParams.get('workspaceId')||'',format=url.searchParams.get('format')||'';
  if(!isUuid(workspaceId)||!catalogFormats[format])return NextResponse.json({error:'Invalid workspace or format'},{status:400});
  const auth=await requireWorkspaceUser(workspaceId,'canEdit');
  if(auth.error)return auth.error;
  try {
    const registry=await coreRegistry(catalogFormats[format]);
    return NextResponse.json({registryVersion:registry.registryVersion,styles:catalogStyles(registry.styles).map(s=>({...s,code:creatorCode(s.code),creatorSource:'soon_core'}))},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'未能讀取 Core 已發布母版，請重試；不會以其他設計代替。'},{status:503});}
}
