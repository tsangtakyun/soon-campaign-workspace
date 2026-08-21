import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { metaGet } from '@/lib/meta-ads-api'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export async function GET(req: Request) {
  const workspaceId = new URL(req.url).searchParams.get('workspace_id') || ''
  if (!isUuid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace_id' }, { status: 400 })

  try {
    const serverSupabase = createServerSupabase(await cookies())
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await assertWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })

    const supabase = createAdminSupabase()
    const [{ data: connection }, { data: posts }, { data: brandKit }] = await Promise.all([
      supabase
        .from('social_connections')
        .select('account_id,account_name,access_token,page_access_token,page_id,token_expires_at')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'facebook')
        .maybeSingle(),
      supabase
        .from('campaign_posts')
        .select('id,title,body,image_url,status')
        .eq('workspace_id', workspaceId)
        .in('status', ['approved', 'scheduled', 'published', 'posted', 'ready'])
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('brand_kits').select('business_name').eq('workspace_id', workspaceId).maybeSingle(),
    ])

    if (!connection?.access_token) {
      return NextResponse.json({ connected: false, appLive: process.env.META_APP_LIVE === 'true', posts: posts || [], brandName: brandKit?.business_name || '' })
    }

    const permissionsResult = await metaGet('me/permissions', connection.access_token)
    const permissions = Array.isArray(permissionsResult.data) ? permissionsResult.data : []
    const grantedPermissions = new Set(
      permissions
        .filter((item) => item && typeof item === 'object' && item.status === 'granted')
        .map((item) => item.permission),
    )

    if (!grantedPermissions.has('ads_management') || !grantedPermissions.has('ads_read')) {
      return NextResponse.json({
        connected: true,
        appLive: process.env.META_APP_LIVE === 'true',
        brandName: brandKit?.business_name || '',
        selectedAdAccountId: null,
        adAccounts: [],
        pages: [],
        permissions,
        posts: posts || [],
        tokenExpiresAt: connection.token_expires_at,
      })
    }

    const [adAccountsResult, pagesResult] = await Promise.all([
      metaGet('me/adaccounts', connection.access_token, {
        fields: 'id,name,account_status,currency,amount_spent,disable_reason',
        limit: '100',
      }),
      metaGet('me/accounts', connection.access_token, {
        fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
        limit: '100',
      }),
    ])

    return NextResponse.json({
      connected: true,
      appLive: process.env.META_APP_LIVE === 'true',
      brandName: brandKit?.business_name || '',
      selectedAdAccountId: null,
      adAccounts: Array.isArray(adAccountsResult.data) ? adAccountsResult.data : [],
      pages: Array.isArray(pagesResult.data) ? pagesResult.data : [],
      permissions,
      posts: posts || [],
      tokenExpiresAt: connection.token_expires_at,
    })
  } catch (error) {
    console.error('[meta-ads/setup] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Meta connection failed' }, { status: 500 })
  }
}
