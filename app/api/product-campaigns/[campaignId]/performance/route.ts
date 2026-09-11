import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

type RouteProps = { params: Promise<{ campaignId: string }> }
type JsonRecord = Record<string, any>

function metric(value: unknown) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, number) : 0 }

async function load(campaignId: string) {
  const server = createServerSupabase(await cookies()); const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: campaign } = await server.from('marketing_campaigns').select('*').eq('id', campaignId).maybeSingle()
  if (!campaign?.workspace_id) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) }
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: campaign.workspace_id })
  if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { access, campaign, user }
}

async function report(data: Exclude<Awaited<ReturnType<typeof load>>, { error: NextResponse }>) {
  const [{ data: angles }, { data: projects }, { data: posts }, { data: snapshots, error }] = await Promise.all([
    data.access.admin.from('campaign_angles').select('id,name,hook,status,sort_order').eq('campaign_id', data.campaign.id).order('sort_order'),
    data.access.admin.from('content_projects').select('id,title,campaign_angle_id,variant_key,creative_role').eq('campaign_id', data.campaign.id),
    data.access.admin.from('campaign_posts').select('id,content_project_id,status,posted_at,captions').eq('campaign_id', data.campaign.id),
    data.access.admin.from('creative_performance_snapshots').select('*').eq('campaign_id', data.campaign.id).order('period_end', { ascending: false }),
  ])
  if (error) throw error
  const angleMap = new Map<string, JsonRecord>(); const projectMap = new Map((projects || []).map((item: JsonRecord) => [item.id, item]))
  for (const angle of angles || []) angleMap.set(angle.id, { ...angle, impressions: 0, reach: 0, clicks: 0, engagements: 0, conversions: 0, spend: 0, creatives: new Set<string>() })
  for (const row of snapshots || []) { const item = angleMap.get(row.campaign_angle_id); if (!item) continue; item.impressions += Number(row.impressions) || 0; item.reach += Number(row.reach) || 0; item.clicks += Number(row.clicks) || 0; item.engagements += Number(row.engagements) || 0; item.conversions += Number(row.conversions) || 0; item.spend += Number(row.spend) || 0; item.creatives.add(row.content_project_id) }
  const anglePerformance: JsonRecord[] = Array.from(angleMap.values()).map((item) => ({ ...item, creatives: item.creatives.size, ctr: item.impressions ? item.clicks / item.impressions * 100 : 0, engagementRate: item.impressions ? item.engagements / item.impressions * 100 : 0, conversionRate: item.clicks ? item.conversions / item.clicks * 100 : 0 }))
  const eligible = anglePerformance.filter((item) => item.impressions >= 500 && item.creatives >= 1)
  const ranked = [...eligible].sort((a, b) => b.ctr - a.ctr); const best = ranked[0]; const runnerUp = ranked[1]
  const winner = best && runnerUp && best.ctr > 0 && best.ctr >= runnerUp.ctr * 1.2 ? { angleId: best.id, angleName: best.name, metric: 'ctr', value: best.ctr, lift: runnerUp.ctr ? (best.ctr / runnerUp.ctr - 1) * 100 : 0, confidence: 'directional', reason: `至少500 impressions，而且CTR較第二名高${((best.ctr / Math.max(runnerUp.ctr, .0001) - 1) * 100).toFixed(0)}%` } : null
  const postMappings = (posts || []).map((post: JsonRecord) => ({ id: post.id, contentProjectId: post.content_project_id, externalMediaId: post.captions?.publish_status?.instagram?.media_id || null, status: post.status, postedAt: post.posted_at, project: projectMap.get(post.content_project_id) || null }))
  return { campaign: data.campaign, angles: anglePerformance, projects: projects || [], snapshots: snapshots || [], posts: postMappings, winner, winnerRule: { minimumImpressionsPerAngle: 500, minimumAngles: 2, minimumLiftPercent: 20, metric: 'ctr' } }
}

export async function GET(_request: Request, { params }: RouteProps) {
  try { const data = await load((await params).campaignId); if ('error' in data) return data.error; return NextResponse.json(await report(data)) }
  catch (error) { return NextResponse.json({ error: '未能載入Campaign Performance', detail: String(error) }, { status: 500 }) }
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const data = await load((await params).campaignId); if ('error' in data) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json().catch(() => ({})); const observations = Array.isArray(body.observations) ? body.observations.slice(0, 100) : []
    if (!observations.length) return NextResponse.json({ error: '沒有可同步數據' }, { status: 400 })
    const postIds = observations.map((item: JsonRecord) => String(item.postId || '')).filter(Boolean)
    const { data: posts } = await data.access.admin.from('campaign_posts').select('id,content_project_id,campaign_angle_id').eq('campaign_id', data.campaign.id).in('id', postIds)
    const postMap = new Map((posts || []).map((post: JsonRecord) => [post.id, post])); const now = new Date().toISOString()
    const rows = observations.flatMap((item: JsonRecord) => { const post = postMap.get(String(item.postId)); if (!post?.content_project_id || !post.campaign_angle_id) return []; const impressions = metric(item.impressions || item.views); const engagements = metric(item.engagements) || metric(item.likes) + metric(item.comments) + metric(item.shares) + metric(item.saves); return [{ workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id, campaign_angle_id: post.campaign_angle_id, content_project_id: post.content_project_id, campaign_post_id: post.id, platform: String(item.platform || 'manual').slice(0, 40), external_media_id: String(item.externalMediaId || '').slice(0, 200) || null, period_start: item.periodStart || null, period_end: item.periodEnd || now, impressions, reach: metric(item.reach), clicks: metric(item.clicks), engagements, conversions: metric(item.conversions), spend: metric(item.spend), raw_metrics: item.rawMetrics || item, source: String(item.source || 'platform_sync').slice(0, 50) }] })
    if (!rows.length) return NextResponse.json({ error: '數據未能對應Campaign posts' }, { status: 400 })
    const { error } = await data.access.admin.from('creative_performance_snapshots').upsert(rows, { onConflict: 'content_project_id,platform,period_end' }); if (error) throw error
    const result = await report(data)
    if (result.winner) { await data.access.admin.from('campaign_angles').update({ status: 'testing' }).eq('campaign_id', data.campaign.id).eq('status', 'approved'); await data.access.admin.from('campaign_angles').update({ status: 'winner' }).eq('id', result.winner.angleId) }
    await data.access.admin.from('marketing_campaigns').update({ generation_status: result.winner ? 'winner_identified' : 'measuring', status: 'measuring', updated_at: now }).eq('id', data.campaign.id)
    return NextResponse.json({ ...result, success: true })
  } catch (error) { return NextResponse.json({ error: '未能同步Campaign Performance', detail: String(error) }, { status: 500 }) }
}
