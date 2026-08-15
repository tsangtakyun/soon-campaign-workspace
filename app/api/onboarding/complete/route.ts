import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as JsonRecord[] : []
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function firstString(...values: unknown[]) {
  return values.map(asString).find((value) => value && value.trim().length > 0)
}

function postTypeFromTopic(topic: JsonRecord | undefined) {
  const id = asString(topic?.id)?.toLowerCase() || ''
  const type = asString(topic?.type)?.toLowerCase() || asString(topic?.kind)?.toLowerCase() || ''
  const label = `${asString(topic?.label) || ''} ${asString(topic?.title) || ''}`.toLowerCase()
  const haystack = `${id} ${type} ${label}`

  if (haystack.includes('short-form-video')) return 'short-form-video'
  if (haystack.includes('feed-videos')) return 'feed-videos'
  if (haystack.includes('stories') || haystack.includes('限時')) return 'stories'
  if (haystack.includes('carousel') || haystack.includes('輪播')) return 'carousels'
  if (haystack.includes('email') || haystack.includes('電郵')) return 'emails'
  if (haystack.includes('video') || haystack.includes('影片')) return 'feed-videos'
  return 'still-images'
}

function topicProductImage(topic: JsonRecord | undefined) {
  return firstString(topic?.productImage) || null
}

function topicReferenceImage(topic: JsonRecord | undefined) {
  return firstString(topic?.referenceImage) || null
}

function contentMoodPrompts(contentMood: JsonRecord) {
  const selectedMoods = asArray(contentMood.selectedMoods)
  return selectedMoods
    .map((mood) => firstString(mood.generationMood, mood.label))
    .filter((value): value is string => Boolean(value))
}

function normalizeStyleId(value: unknown) {
  return asString(value)?.replace(/-/g, '_') || null
}

function normalizedContentMoodIds(contentMood: JsonRecord) {
  const moodAliases: Record<string, string> = {
    funny: 'humorous',
    lifestyle: 'authentic_daily',
    cinematic: 'cinematic_ad',
    educational: 'educational',
    warm: 'warm_caring',
    street: 'street_trendy',
  }

  return asArray(contentMood.selectedMoods)
    .map((mood) => normalizeStyleId(mood.id) || normalizeStyleId(mood.label))
    .filter((value): value is string => Boolean(value))
    .map((value) => moodAliases[value] || value)
}

function normalizedPhotoControlId(photoControl: JsonRecord) {
  const id = normalizeStyleId(photoControl.id)
  if (id === 'full') return 'full_freedom'
  if (id === 'balanced') return 'balanced'
  if (id === 'minimal') return 'minimal'
  if (id === 'strict') return 'strict_brand_control'
  return id
}

function normalizedTypefaceId(typeface: JsonRecord) {
  const id = normalizeStyleId(firstString(typeface.typefaceId, typeface.id))
  if (id === 'dela_gothic') return 'dela_gothic_one'
  return id
}

const WEEKLY_POST_SLOTS: Record<string, Array<{ day: number; hour: number }>> = {
  'still-images': [
    { day: 0, hour: 9 },
    { day: 1, hour: 11 },
    { day: 3, hour: 15 },
  ],
  carousels: [{ day: 2, hour: 10 }],
  'feed-videos': [{ day: 4, hour: 18 }],
  'short-form-video': [{ day: 4, hour: 18 }],
  stories: [
    { day: 1, hour: 19 },
    { day: 3, hour: 19 },
  ],
  emails: [{ day: 5, hour: 10 }],
}

function campaignOneStartDate() {
  const now = new Date()
  const start = new Date(now)
  const day = start.getDay()

  if (day === 0) start.setDate(start.getDate() + 1)
  if (day === 6) start.setDate(start.getDate() + 2)

  start.setHours(0, 0, 0, 0)
  return start
}

function campaignStartDate(index: number) {
  const start = campaignOneStartDate()
  start.setDate(start.getDate() + index * 7)
  return start
}

function dateOnly(date: Date) {
  return date.toISOString().split('T')[0]
}

function scheduledAtForPost(postType: string, usage: Map<string, number>, startsOn: Date) {
  const slots = WEEKLY_POST_SLOTS[postType] || WEEKLY_POST_SLOTS['still-images']
  const used = usage.get(postType) || 0
  usage.set(postType, used + 1)

  const weekOffset = Math.floor(used / slots.length)
  const slot = slots[used % slots.length]
  const date = new Date(startsOn)
  date.setDate(date.getDate() + weekOffset * 7 + slot.day)
  date.setHours(slot.hour, 0, 0, 0)
  return date.toISOString()
}

function campaignThemeAt(items: JsonRecord[], index: number, fallbackName: string, fallbackTheme?: string) {
  const theme = items[index] || {}
  const title =
    firstString(theme.title, theme.name, theme.campaignName) ||
    (index === 0 ? fallbackName : `${fallbackName} ${index + 1}`)
  const body = firstString(theme.body, theme.description, theme.theme) || fallbackTheme || null

  return { raw: theme, title, body }
}

async function saveScopedSingle(
  supabase: ReturnType<typeof createAdminSupabase>,
  table: string,
  payload: JsonRecord,
  scopeColumn: string,
  scopeValue: string,
  selectColumns = 'id'
) {
  const { data: existing, error: existingError } = await supabase
    .from(table)
    .select('id')
    .eq(scopeColumn, scopeValue)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing?.id) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', existing.id)
      .select(selectColumns)
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select(selectColumns)
    .single()

  if (error) throw error
  return data
}

async function saveScopedCampaigns(
  supabase: ReturnType<typeof createAdminSupabase>,
  payloads: JsonRecord[],
  scopeColumn: string,
  scopeValue: string
) {
  const sourceKeys = payloads
    .map((payload) => asString(payload.source_key))
    .filter((value): value is string => Boolean(value))

  const { data: existingCampaigns, error: existingError } = sourceKeys.length
    ? await supabase
        .from('marketing_campaigns')
        .select('id,source_key')
        .eq(scopeColumn, scopeValue)
        .in('source_key', sourceKeys)
    : { data: [], error: null }

  if (existingError) throw existingError

  const existingBySource = new Map(
    (existingCampaigns || []).map((campaign: any) => [String(campaign.source_key || ''), campaign.id])
  )

  return Promise.all(
    payloads.map(async (payload) => {
      const sourceKey = asString(payload.source_key) || ''
      const existingId = existingBySource.get(sourceKey)

      if (existingId) {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .update(payload)
          .eq('id', existingId)
          .select('id,source_key,starts_on,cover_image_url')
          .single()

        if (error) throw error
        return data
      }

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert(payload)
        .select('id,source_key,starts_on,cover_image_url')
        .single()

      if (error) throw error
      return data
    })
  )
}

async function clearScopedGeneratedPosts(
  supabase: ReturnType<typeof createAdminSupabase>,
  scopeColumn: string,
  scopeValue: string
) {
  const { error } = await supabase
    .from('campaign_posts')
    .delete()
    .eq(scopeColumn, scopeValue)
    .like('source_key', 'campaign-%')

  if (error) throw error
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as JsonRecord
    const sessionId = asString(body.sessionId)

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    const userId = user?.id ?? null
    const supabase = createAdminSupabase()

    if (userId) {
      await Promise.all([
        supabase.from('campaign_posts').delete().eq('onboarding_session_id', sessionId).is('user_id', null),
        supabase.from('marketing_campaigns').delete().eq('onboarding_session_id', sessionId).is('user_id', null),
        supabase.from('content_preferences').delete().eq('onboarding_session_id', sessionId).is('user_id', null),
        supabase.from('brand_assets').delete().eq('onboarding_session_id', sessionId).is('user_id', null),
        supabase.from('brand_kits').delete().eq('onboarding_session_id', sessionId).is('user_id', null),
      ])
    }

    const websiteAnalysis = asRecord(body.websiteAnalysis)
    const websiteAnalysisData = asRecord(websiteAnalysis.analysis)
    const websiteOnboarding = asRecord(websiteAnalysis.onboarding)
    const businessProfile = asRecord(body.businessProfile)
    const contentStrategy = asRecord(body.contentStrategy)
    const campaignDetails = asRecord(body.campaignDetails)
    const distributionPrefs = asRecord(body.distributionPrefs)
    const contentMix = asRecord(body.contentMix)
    const contentMood = asRecord(body.contentMood)
    const contentModification = firstString(body.contentModification)
    const visualStyle = asRecord(body.visualStyle)
    const typeface = asRecord(body.typeface)
    const photoControl = asRecord(body.photoControl)
    const topicReview = body.topicReview
    const topicReviewItems = asArray(topicReview)
    const campaignThemes = body.campaignThemes
    const campaignThemeItems = asArray(campaignThemes)

    const businessName =
      firstString(businessProfile.businessName, websiteAnalysisData.businessName, websiteOnboarding.name) ||
      'SOON 品牌'
    const logoUrl = firstString(businessProfile.logoUrl, websiteAnalysisData.logoUrl)
    const requestedWorkspaceId = firstString(body.workspaceId)
    let workspaceId: string | null = null

    if (userId) {
      if (requestedWorkspaceId) {
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('workspace_id', requestedWorkspaceId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle()

        const { data: ownedWorkspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', requestedWorkspaceId)
          .eq('owner_id', userId)
          .maybeSingle()

        if (membership?.workspace_id || ownedWorkspace?.id) {
          workspaceId = requestedWorkspaceId
          const { error: workspaceUpdateError } = await supabase
            .from('workspaces')
            .update({
              name: businessName,
              type: 'brand',
              owner: user?.email ?? null,
              owner_id: userId,
              content_modification: contentModification || null,
              description: firstString(businessProfile.elevatorPitch, websiteAnalysisData.elevatorPitch),
            })
            .eq('id', workspaceId)

          if (workspaceUpdateError) throw workspaceUpdateError
        }
      }

      if (!workspaceId) {
        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .insert({
            name: businessName,
            type: 'brand',
            owner: user?.email ?? null,
            owner_id: userId,
            content_modification: contentModification || null,
            description: firstString(businessProfile.elevatorPitch, websiteAnalysisData.elevatorPitch),
          })
          .select('id')
          .single()

        if (workspaceError) throw workspaceError
        workspaceId = workspace.id
      }

      const { error: memberError } = await supabase.from('workspace_members').upsert(
        {
          workspace_id: workspaceId,
          user_id: userId,
          email: user?.email ?? userId,
          display_name: user?.user_metadata?.full_name ?? user?.email ?? businessName,
          role: 'owner',
          status: 'active',
        },
        { onConflict: 'workspace_id,user_id' }
      )

      if (memberError) throw memberError
    }

    const ownerScope = userId && workspaceId
      ? { column: 'workspace_id', value: workspaceId }
      : { column: 'onboarding_session_id', value: sessionId }

    const brandKitPayload = {
      user_id: userId,
      workspace_id: workspaceId,
      onboarding_session_id: sessionId,
      business_name: businessName,
      business_type: firstString(businessProfile.businessType, websiteAnalysisData.businessType),
      website_url: firstString(businessProfile.websiteUrl, websiteAnalysisData.websiteUrl, websiteOnboarding.website),
      elevator_pitch: firstString(businessProfile.elevatorPitch, websiteAnalysisData.elevatorPitch),
      language: firstString(businessProfile.language, websiteAnalysisData.language) || 'zh-HK',
      logo_url: logoUrl,
      audience: businessProfile.audience ?? websiteAnalysisData.audience ?? null,
      content_people: businessProfile.contentPeople ?? websiteAnalysisData.contentPeople ?? null,
      market_positioning: businessProfile.marketPositioning ?? websiteAnalysisData.marketPositioning ?? null,
      brand_profile: businessProfile.brandProfile ?? websiteAnalysisData.brandProfile ?? null,
      visual_style_id: firstString(visualStyle.id),
      visual_style_title: firstString(visualStyle.title, visualStyle.label),
      visual_style_preview: firstString(visualStyle.previewImage, visualStyle.image),
      visual_style_keywords: firstString(visualStyle.aiPromptKeywords) || null,
      typeface_direction: firstString(typeface.directionId),
      typeface_id: firstString(typeface.typefaceId, typeface.id),
      typeface_family: firstString(typeface.fontFamily, typeface.family),
      typeface_weight:
        typeof typeface.weight === 'number' ? String(typeface.weight) : firstString(typeface.weight),
      raw_website_analysis: websiteAnalysis,
      raw_business_profile: businessProfile,
      updated_at: new Date().toISOString(),
    }

    let brandKit: any

    try {
      brandKit = await saveScopedSingle(
        supabase,
        'brand_kits',
        brandKitPayload,
        ownerScope.column,
        ownerScope.value,
        'id'
      )
    } catch (brandKitError: any) {
      const missingVisualKeywordsColumn =
        brandKitError.code === 'PGRST204' &&
        brandKitError.message?.toLowerCase().includes('visual_style_keywords')

      if (!missingVisualKeywordsColumn) throw brandKitError

      const fallbackBrandKitPayload: Partial<typeof brandKitPayload> = { ...brandKitPayload }
      delete fallbackBrandKitPayload.visual_style_keywords
      brandKit = await saveScopedSingle(
        supabase,
        'brand_kits',
        fallbackBrandKitPayload,
        ownerScope.column,
        ownerScope.value,
        'id'
      )
    }

    if (logoUrl && !logoUrl.startsWith('blob:')) {
      const { error: assetError } = await supabase.from('brand_assets').upsert(
        {
          user_id: userId,
          workspace_id: workspaceId,
          onboarding_session_id: sessionId,
          brand_kit_id: brandKit.id,
          asset_type: 'logo',
          url: logoUrl,
          filename: `${businessName} logo`,
          is_used: true,
        },
        { onConflict: 'brand_kit_id,asset_type,url' }
      )
      if (assetError) throw assetError
    }

    const contentMoodValue = Object.keys(contentMood).length ? contentMood : null
    const contentPreferencesPayload = {
      user_id: userId,
      workspace_id: workspaceId,
      onboarding_session_id: sessionId,
      channels: distributionPrefs.channels ?? null,
      channel_ids: distributionPrefs.channelIds ?? null,
      schedule: distributionPrefs.schedule ?? null,
      cross_posting:
        typeof distributionPrefs.crossPosting === 'boolean' ? distributionPrefs.crossPosting : false,
      content_mix: Object.keys(contentMix).length ? contentMix : null,
      content_mood: contentMoodValue,
      photo_control_id: firstString(photoControl.id),
      photo_control_title: firstString(photoControl.title, photoControl.label),
      photo_control_preview: firstString(photoControl.previewImage, photoControl.previewPath),
      photo_control_prompt: firstString(photoControl.generationPrompt),
      raw_distribution: distributionPrefs,
      raw_content_mix: {
        ...contentMix,
        contentMood: contentMoodValue,
        contentModification: contentModification || null,
      },
      raw_photo_control: photoControl,
      updated_at: new Date().toISOString(),
    }

    try {
      await saveScopedSingle(
        supabase,
        'content_preferences',
        contentPreferencesPayload,
        ownerScope.column,
        ownerScope.value
      )
    } catch (prefError: any) {
      const missingContentMoodColumn =
        prefError.code === 'PGRST204' &&
        prefError.message?.toLowerCase().includes('content_mood')

      if (!missingContentMoodColumn) throw prefError

      const fallbackPayload: Partial<typeof contentPreferencesPayload> = { ...contentPreferencesPayload }
      delete fallbackPayload.content_mood
      await saveScopedSingle(
        supabase,
        'content_preferences',
        fallbackPayload,
        ownerScope.column,
        ownerScope.value
      )
    }

    await clearScopedGeneratedPosts(supabase, ownerScope.column, ownerScope.value)

    const fallbackCampaignName =
      firstString(campaignDetails.campaignName, campaignDetails.name, contentStrategy.titleZh, contentStrategy.title) ||
      '第一個宣傳活動'
    const fallbackCampaignTheme = firstString(campaignDetails.theme, campaignDetails.description)
    const campaignPayloads = Array.from({ length: 4 }, (_, index) => {
      const start = campaignStartDate(index)
      const campaignTheme = campaignThemeAt(
        campaignThemeItems,
        index,
        fallbackCampaignName,
        fallbackCampaignTheme
      )

      return {
        user_id: userId,
        workspace_id: workspaceId,
        onboarding_session_id: sessionId,
        source_key: `onboarding-v1-campaign-${index + 1}`,
        name: campaignTheme.title,
        theme: campaignTheme.body,
        call_to_action: firstString(campaignDetails.callToAction, campaignDetails.cta),
        target_link: firstString(campaignDetails.targetLink, campaignDetails.url),
        strategy_id: firstString(contentStrategy.id),
        strategy_title: firstString(contentStrategy.titleZh, contentStrategy.title),
        strategy_emoji: firstString(contentStrategy.emoji),
        funnel_stage: firstString(contentStrategy.funnelStage),
        starts_on: dateOnly(start),
        duration_weeks: 1,
        status: 'generating',
        campaign_themes: campaignTheme.raw,
        topic_review: topicReview ?? null,
        raw_campaign_details: campaignDetails,
        raw_campaign_themes: campaignThemes ?? null,
        updated_at: new Date().toISOString(),
      }
    })

    const campaigns = await saveScopedCampaigns(
      supabase,
      campaignPayloads,
      ownerScope.column,
      ownerScope.value
    )

    const campaignsBySource = new Map((campaigns || []).map((campaign) => [campaign.source_key, campaign]))

    const sourceTopics = topicReviewItems.length
      ? topicReviewItems
      : [
          {
            id: 'still-images-1',
            label: '靜態圖片 1',
            topic: '差點沒拍下來的片段',
          },
        ]
    const postVisualStyle = normalizeStyleId(visualStyle.id)
    const postContentMood = normalizedContentMoodIds(contentMood)
    const postTypeface = normalizedTypefaceId(typeface)
    const postPhotoControl = normalizedPhotoControlId(photoControl)

    const posts = campaignPayloads.flatMap((campaignPayload, campaignIndex) => {
      const savedCampaign = campaignsBySource.get(campaignPayload.source_key)
      if (!savedCampaign?.id) return []

      const startsOn = new Date(`${campaignPayload.starts_on}T00:00:00`)
      const scheduleUsage = new Map<string, number>()

      return sourceTopics.map((topic, index) => {
        const postType = postTypeFromTopic(topic)
        const label = firstString(topic.label) || `內容 ${index + 1}`
        const topicText = firstString(topic.topic, topic.title, topic.body)

        return {
          user_id: userId,
          workspace_id: workspaceId,
          onboarding_session_id: sessionId,
          campaign_id: savedCampaign.id,
          source_key: `campaign-${campaignIndex + 1}-topic-${asString(topic.id) || index + 1}`,
          title: topicText || label,
          body:
            firstString(topic.body, topic.description, topicText) ||
            'SOON 會根據你的品牌資料生成內容。',
          post_type: postType,
          scheduled_at: scheduledAtForPost(postType, scheduleUsage, startsOn),
          image_url: null,
          visual_style: postVisualStyle,
          content_mood: postContentMood,
          typeface: postTypeface,
          photo_control: postPhotoControl,
          captions: {
            topic,
            campaignTheme: campaignPayload.campaign_themes,
            productImage: topicProductImage(topic),
            referenceImage: topicReferenceImage(topic),
            contentMoods: contentMoodPrompts(contentMood),
          },
          status: 'draft',
          updated_at: new Date().toISOString(),
        }
      })
    })
    const createdPostIds: string[] = []
    const allCreatedPostIds: string[] = []

    if (posts.length) {
      const { data: savedPosts, error: postsError } = await supabase
        .from('campaign_posts')
        .upsert(posts, { onConflict: 'campaign_id,source_key' })
        .select('id,source_key')

      if (postsError) throw postsError

      savedPosts?.forEach((savedPost) => {
        allCreatedPostIds.push(savedPost.id)
        if (String(savedPost.source_key || '').startsWith('campaign-1-')) {
          createdPostIds.push(savedPost.id)
        }
        console.log('[onboarding/complete] prepared campaign post image generation:', {
          postId: savedPost.id,
          sourceKey: savedPost.source_key,
          immediateGeneration: String(savedPost.source_key || '').startsWith('campaign-1-'),
        })
      })
    }

    console.log('[onboarding/complete] campaign post ids prepared:', {
      weekOnePostIds: createdPostIds.length,
      allPostIds: allCreatedPostIds.length,
    })

    return NextResponse.json({
      success: true,
      sessionId,
      userId,
      workspaceId,
      brandKitId: brandKit.id,
      campaignIds: campaigns?.map((campaign) => campaign.id) || [],
      postsCreated: posts.length,
      allCreatedPostIds,
      createdPostIds,
    })
  } catch (error) {
    console.error('onboarding/complete error:', error)
    return NextResponse.json(
      { error: 'Failed to save onboarding data', detail: String(error) },
      { status: 500 }
    )
  }
}
