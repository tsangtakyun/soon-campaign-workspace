import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { MetaApiError, metaGet, metaPost, normalizeAdAccountId, uploadMetaImage } from '@/lib/meta-ads-api'
import { isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'
import { withWorkspaceAuth } from '@/lib/workspace-access'

type LaunchPayload = {
  workspaceId?: string
  adAccountId?: string
  pageId?: string
  instagramAccountId?: string
  campaignName?: string
  objective?: 'awareness' | 'traffic' | 'engagement' | 'leads'
  targetLink?: string
  headline?: string
  caption?: string
  callToAction?: string
  dailyBudget?: number
  ageMin?: number
  ageMax?: number
  countries?: string[]
  postIds?: string[]
  launchAttemptId?: string
}

type SavedLaunch = {
  meta_campaign_id?: string
  meta_adset_id?: string
  ads?: Array<{ adId?: string; creativeId: string; postId: string }>
}

const OBJECTIVES = {
  awareness: { campaign: 'OUTCOME_AWARENESS', optimization: 'REACH' },
  traffic: { campaign: 'OUTCOME_TRAFFIC', optimization: 'LINK_CLICKS' },
  engagement: { campaign: 'OUTCOME_ENGAGEMENT', optimization: 'POST_ENGAGEMENT' },
  leads: { campaign: 'OUTCOME_LEADS', optimization: 'LEAD_GENERATION' },
} as const

function graphId(value: unknown, label: string) {
  const id = typeof value === 'string' ? value.trim() : ''
  if (!/^\d+$/.test(id)) throw new Error(`Invalid ${label}`)
  return id
}

function safeText(value: unknown, fallback: string, max: number) {
  const text = typeof value === 'string' ? value.trim() : ''
  return (text || fallback).slice(0, max)
}

function publicLaunchError(error: unknown) {
  const raw = error instanceof Error ? error.message : ''
  const metaError = error instanceof MetaApiError ? error : null
  const developmentMode = /開發模式|development mode/i.test(raw)
  const permissionDenied = Boolean(metaError && [10, 200].includes(metaError.code || 0))
    || /permission|權限|not authorized/i.test(raw)

  if (developmentMode) return {
    code: 'META_APP_DEVELOPMENT_MODE',
    message: 'Meta App 尚未公開，暫時無法建立廣告創意。請先完成 App Review、取得所需權限，並將 App 切換為 Live 後再試。',
    requiresAppLive: true,
  }
  if (permissionDenied) return {
    code: 'META_PERMISSION_REQUIRED',
    message: '目前 Meta 連接未獲批所需廣告權限。請完成 App Review／Advanced Access，然後重新授權 Meta 帳戶。',
    requiresAppLive: false,
  }
  if (metaError?.code === 190) return {
    code: 'META_TOKEN_EXPIRED',
    message: 'Meta 登入授權已失效，請重新連接 Meta Ads 帳戶後再試。',
    requiresAppLive: false,
  }
  return {
    code: 'META_LAUNCH_FAILED',
    message: 'Meta 暫時未能完成建立。已建立的項目會保持 PAUSED；請稍後重試，系統會沿用今次進度。',
    requiresAppLive: false,
  }
}

export async function POST(req: Request) {
  let createdCampaignId = ''
  let createdAdSetId = ''
  let createdAds: Array<{ adId?: string; creativeId: string; postId: string }> = []
  let sourceKey = ''
  let supabase: ReturnType<typeof createAdminSupabase> | null = null
  let accessToken = ''
  try {
    const input = (await req.json()) as LaunchPayload
    const workspaceId = input.workspaceId || ''
    if (!isUuid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 })

    const serverSupabase = createServerSupabase(await cookies())
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const authorized = await withWorkspaceAuth({ email: user.email, userId: user.id, workspaceId }, { require: 'canManageAds' }, async () => 'authorized' as const)
    if (authorized !== 'authorized') return authorized
    if (process.env.META_APP_LIVE !== 'true') {
      return NextResponse.json({
        code: 'META_APP_DEVELOPMENT_MODE',
        error: 'Meta App 尚未公開，暫時無法建立廣告。',
        requiresAppLive: true,
      }, { status: 409 })
    }

    const launchAttemptId = input.launchAttemptId || ''
    if (!isUuid(launchAttemptId)) return NextResponse.json({ error: '建立請求識別碼無效，請關閉 wizard 後再試。' }, { status: 400 })
    sourceKey = `meta-launch-${launchAttemptId}`

    const adAccountId = normalizeAdAccountId(input.adAccountId || '')
    const pageId = graphId(input.pageId, 'Facebook Page')
    const instagramAccountId = input.instagramAccountId ? graphId(input.instagramAccountId, 'Instagram account') : ''
    const objectiveKey = input.objective && input.objective in OBJECTIVES ? input.objective : 'awareness'
    const objective = OBJECTIVES[objectiveKey]
    const dailyBudget = Math.round(Number(input.dailyBudget) * 100)
    if (!Number.isFinite(dailyBudget) || dailyBudget < 100) throw new Error('每日預算必須大於 1')
    const targetLink = new URL(input.targetLink || '').toString()
    if (!['http:', 'https:'].includes(new URL(targetLink).protocol)) throw new Error('推廣網址必須使用 http 或 https')

    supabase = createAdminSupabase()
    const { data: connection } = await supabase
      .from('social_connections')
      .select('access_token')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .maybeSingle()
    if (!connection?.access_token) throw new Error('請先重新連接 Meta Ads 帳戶')

    accessToken = connection.access_token as string
    const [{ data: allowedAccounts }, { data: allowedPages }] = await Promise.all([
      metaGet('me/adaccounts', accessToken, { fields: 'id,account_status', limit: '100' }),
      metaGet('me/accounts', accessToken, { fields: 'id,instagram_business_account{id}', limit: '100' }),
    ])
    const accounts = Array.isArray(allowedAccounts) ? allowedAccounts as Array<{ id?: string; account_status?: number }> : []
    const pages = Array.isArray(allowedPages) ? allowedPages as Array<{ id?: string; instagram_business_account?: { id?: string } }> : []
    if (!accounts.some((account) => account.id === adAccountId && account.account_status === 1)) {
      throw new Error('所選 Ad Account 不可用或未啟用')
    }
    const selectedPage = pages.find((page) => page.id === pageId)
    if (!selectedPage) throw new Error('所選 Facebook Page 不屬於目前連接')
    if (instagramAccountId && selectedPage.instagram_business_account?.id !== instagramAccountId) {
      throw new Error('所選 Instagram Account 未連接到此 Facebook Page')
    }

    const postIds = (input.postIds || []).filter((id) => isUuid(id)).slice(0, 5)
    if (!postIds.length) throw new Error('請至少選擇一個廣告素材')
    const { data: posts, error: postsError } = await supabase
      .from('campaign_posts')
      .select('id,title,body,image_url')
      .eq('workspace_id', workspaceId)
      .in('id', postIds)
      .not('image_url', 'is', null)
    if (postsError) throw postsError
    if (!posts?.length) throw new Error('找不到可用廣告圖片')

    const campaignName = safeText(input.campaignName, `SOON Campaign ${new Date().toISOString().slice(0, 10)}`, 200)
    const { data: savedCampaign } = await supabase
      .from('marketing_campaigns')
      .select('raw_campaign_details')
      .eq('workspace_id', workspaceId)
      .eq('source_key', sourceKey)
      .maybeSingle()
    const saved = (savedCampaign?.raw_campaign_details || {}) as SavedLaunch
    createdCampaignId = saved.meta_campaign_id || ''
    createdAdSetId = saved.meta_adset_id || ''
    createdAds = Array.isArray(saved.ads) ? saved.ads : []

    async function saveProgress() {
      const { error: saveError } = await supabase!.from('marketing_campaigns').upsert({
        user_id: user.id,
        workspace_id: workspaceId,
        source_key: sourceKey,
        name: campaignName,
        target_link: targetLink,
        status: 'paused',
        raw_campaign_details: {
          provider: 'meta',
          launch_attempt_id: launchAttemptId,
          meta_campaign_id: createdCampaignId || null,
          meta_adset_id: createdAdSetId || null,
          ads: createdAds,
          objective: objectiveKey,
          daily_budget_minor: dailyBudget,
          page_id: pageId,
          instagram_account_id: instagramAccountId || null,
        },
      }, { onConflict: 'workspace_id,source_key' })
      if (saveError) throw saveError
    }

    if (!createdCampaignId) {
      const campaign = await metaPost(`${adAccountId}/campaigns`, accessToken, {
        name: campaignName,
        objective: objective.campaign,
        special_ad_categories: '[]',
        is_adset_budget_sharing_enabled: 'false',
        status: 'PAUSED',
      })
      createdCampaignId = typeof campaign.id === 'string' ? campaign.id : ''
      if (!createdCampaignId) throw new Error('Meta 未有回傳 Campaign ID')
      await saveProgress()
    }

    const targeting = {
      age_min: Math.max(18, Math.min(65, Number(input.ageMin) || 18)),
      age_max: Math.max(18, Math.min(65, Number(input.ageMax) || 65)),
      geo_locations: { countries: (input.countries || ['HK']).slice(0, 10) },
    }
    if (!createdAdSetId) {
      const adSet = await metaPost(`${adAccountId}/adsets`, accessToken, {
        name: `${campaignName} — Audience`,
        campaign_id: createdCampaignId,
        daily_budget: String(dailyBudget),
        billing_event: 'IMPRESSIONS',
        optimization_goal: objective.optimization,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: JSON.stringify(targeting),
        status: 'PAUSED',
      })
      createdAdSetId = typeof adSet.id === 'string' ? adSet.id : ''
      if (!createdAdSetId) throw new Error('Meta 未有回傳 Ad Set ID')
      await saveProgress()
    }

    for (const post of posts) {
      let savedAd = createdAds.find((item) => item.postId === post.id)
      if (savedAd?.adId) continue
      if (!savedAd?.creativeId) {
        const imageHash = await uploadMetaImage(adAccountId, accessToken, String(post.image_url))
        const creative = await metaPost(`${adAccountId}/adcreatives`, accessToken, {
          name: `${campaignName} — ${safeText(post.title, 'Creative', 80)}`,
          object_story_spec: JSON.stringify({
            page_id: pageId,
            ...(instagramAccountId ? { instagram_user_id: instagramAccountId } : {}),
            link_data: {
              link: targetLink,
              image_hash: imageHash,
              name: safeText(input.headline, post.title || '了解更多', 40),
              message: safeText(input.caption, post.body || '', 2200),
              call_to_action: { type: safeText(input.callToAction, 'LEARN_MORE', 40), value: { link: targetLink } },
            },
          }),
        })
        const creativeId = typeof creative.id === 'string' ? creative.id : ''
        if (!creativeId) throw new Error('Meta 未有回傳 Creative ID')
        savedAd = { creativeId, postId: post.id }
        createdAds.push(savedAd)
        await saveProgress()
      }
      const ad = await metaPost(`${adAccountId}/ads`, accessToken, {
        name: `${campaignName} — ${safeText(post.title, 'Ad', 80)}`,
        adset_id: createdAdSetId,
        creative: JSON.stringify({ creative_id: savedAd.creativeId }),
        status: 'PAUSED',
      })
      const adId = typeof ad.id === 'string' ? ad.id : ''
      if (!adId) throw new Error('Meta 未有回傳 Ad ID')
      savedAd.adId = adId
      await saveProgress()
    }

    await saveProgress()

    return NextResponse.json({
      ok: true,
      status: 'PAUSED',
      campaignId: createdCampaignId,
      adSetId: createdAdSetId,
      creativeIds: createdAds.map((item) => item.creativeId),
      adIds: createdAds.flatMap((item) => item.adId ? [item.adId] : []),
      ads: createdAds,
      message: 'Campaign 已真實建立到 Meta，現時保持暫停，未開始扣款。',
    })
  } catch (error) {
    const publicError = publicLaunchError(error)
    console.error('[meta-ads/launch] failed', { sourceKey, createdCampaignId, createdAdSetId, createdAds, error })
    return NextResponse.json({
      error: publicError.message,
      code: publicError.code,
      requiresAppLive: publicError.requiresAppLive,
      partial: Boolean(createdCampaignId || createdAdSetId || createdAds.length),
      createdCampaignId: createdCampaignId || null,
      createdAdSetId: createdAdSetId || null,
      creativeIds: createdAds.map((item) => item.creativeId),
      adIds: createdAds.flatMap((item) => item.adId ? [item.adId] : []),
    }, { status: 500 })
  }
}
