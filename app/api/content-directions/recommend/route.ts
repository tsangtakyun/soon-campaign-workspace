import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Recommendation = {
  id: string
  title: string
  concept: string
  reason: string
  hook: string
  category: string
  version?: string
}

const clean = (value: unknown, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : ''

function normalize(value: unknown): Recommendation[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 3).map((item, index) => ({
    id: clean(item?.id, 100) || `direction-${index + 1}`,
    title: clean(item?.title, 80),
    concept: clean(item?.concept, 180),
    reason: clean(item?.reason, 180),
    hook: clean(item?.hook, 160),
    category: clean(item?.category, 80) || '內容解說',
    version: clean(item?.version, 80) || undefined,
  })).filter((item) => item.title && item.concept)
}

function fallback(summary: string): Recommendation[] {
  const subject = summary.replace(/\s+/g, ' ').slice(0, 34) || '今次題材'
  return [
    { id: 'problem-solution', title: '由問題帶出解決方法', concept: `先指出受眾面對的問題，再以「${subject}」提供清晰答案。`, reason: '結構直接，適合讓新受眾迅速理解內容價值。', hook: '你是否也遇過這個問題？', category: '問題解決', version: 'creator-fallback-v1' },
    { id: 'contrast-truth', title: '拆解常見誤解', concept: `以常見看法與實際情況的差異，帶出「${subject}」的重點。`, reason: '反差較容易引起停留，同時建立專業可信度。', hook: '大家一直以為如此，其實關鍵並不在這裡。', category: '反差／真相拆解', version: 'creator-fallback-v1' },
    { id: 'practical-guide', title: '整理成實用指南', concept: `將「${subject}」整理成可以立即理解和保存的步驟。`, reason: '資訊層次清楚，適合輪播貼文及收藏型內容。', hook: '先記下這幾個重點，需要時就能用上。', category: '教育解說', version: 'creator-fallback-v1' },
  ]
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const workspaceId = clean(body.workspaceId, 80)
    const projectId = clean(body.projectId, 80)
    const summary = clean(body.summary, 5000)
    const format = clean(body.format, 80)
    if (!isUuid(workspaceId) || !isUuid(projectId) || !summary) {
      return NextResponse.json({ error: 'Missing recommendation context' }, { status: 400 })
    }

    const supabase = createServerSupabase(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [{ data: workspace }, { data: brandKit }] = await Promise.all([
      access.admin.from('workspaces').select('name,description,content_directions,market_locations').eq('id', workspaceId).maybeSingle(),
      access.admin.from('brand_kits').select('business_name,business_type,elevator_pitch,audience,market_positioning,brand_profile').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const coreKey = process.env.SOON_CORE_KNOWLEDGE_KEY
    if (coreKey) {
      try {
        const baseUrl = (process.env.SOON_CORE_URL || 'https://soon-core.vercel.app').replace(/\/$/, '')
        const response = await fetch(`${baseUrl}/api/intelligence/directions/recommend`, {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-soon-knowledge-key': coreKey },
          body: JSON.stringify({ workspaceId, projectId, summary, format, workspace, brand: brandKit }),
          cache: 'no-store', signal: AbortSignal.timeout(10000),
        })
        if (response.ok) {
          const payload = await response.json()
          const recommendations = normalize(payload?.recommendations)
          if (recommendations.length) return NextResponse.json({ recommendations, source: 'soon_core' })
        }
      } catch (error) {
        console.error('[content-directions] Core recommendation unavailable', error)
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ recommendations: fallback(summary), source: 'fallback' })
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL), max_tokens: 1200, temperature: 0.3,
        system: 'You are SOON, a senior Hong Kong content strategist. Return valid JSON only. Use concise polished Traditional Chinese. Never invent claims or facts.',
        messages: [{ role: 'user', content: `根據以下資料推薦剛好 3 個明顯不同、可直接製作的內容方向。每個方向只需一個核心概念。\n格式：${format}\n題材：${summary}\n品牌資料：${JSON.stringify({ workspace, brandKit })}\n只輸出 {"recommendations":[{"id":"stable-slug","title":"最多14字","concept":"一句具體構想","reason":"一句適合原因","hook":"示例開場句","category":"內容分類","version":"ai-v1"}]}` }],
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || 'Recommendation failed')
    const output = Array.isArray(data.content) ? data.content.find((item: any) => item.type === 'text')?.text : ''
    const parsed = JSON.parse(String(output || '').replace(/^```json\s*|\s*```$/g, ''))
    const recommendations = normalize(parsed?.recommendations)
    return NextResponse.json({ recommendations: recommendations.length ? recommendations : fallback(summary), source: recommendations.length ? 'creator_ai' : 'fallback' })
  } catch (error) {
    console.error('[content-directions] recommendation failed', error)
    return NextResponse.json({ error: '未能取得內容方向建議', detail: String(error) }, { status: 500 })
  }
}
