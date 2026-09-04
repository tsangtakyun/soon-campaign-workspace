import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

function parseJsonObject(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
    throw new Error('AI response is not valid JSON')
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    if (!isUuid(workspaceId) || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createServerSupabase(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access || (access.role !== 'owner' && access.role !== 'admin')) {
      return NextResponse.json({ error: '內容製作只限 Workspace Owner 或 Admin' }, { status: 403 })
    }

    const { data: project, error: projectError } = await access.admin
      .from('content_projects')
      .select('id,title,source_url,source_name,source_note,brief,format_decision,selected_format,prompt_version_id')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .single()
    if (projectError) throw projectError

    let promptId = project.prompt_version_id as string | null
    let prompt: any = null
    if (promptId) {
      const result = await access.admin
        .from('workspace_prompt_versions')
        .select('id,name,version,brief_prompt,format_prompt,production_prompt')
        .eq('id', promptId)
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      prompt = result.data
    }

    // Seeded blank prompt versions are not useful. Upgrade only those projects to
    // the latest populated version; real populated versions remain locked.
    const hasPrompt = Boolean(prompt?.brief_prompt?.trim() || prompt?.format_prompt?.trim() || prompt?.production_prompt?.trim())
    if (!hasPrompt) {
      const result = await access.admin
        .from('workspace_prompt_versions')
        .select('id,name,version,brief_prompt,format_prompt,production_prompt')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      prompt = result.data
      promptId = prompt?.id || null
    }

    if (!prompt || !(prompt.brief_prompt?.trim() || prompt.format_prompt?.trim() || prompt.production_prompt?.trim())) {
      return NextResponse.json({ error: '請先由 Owner 在 Prompt 管理儲存 Workspace Prompt' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 })

    const workspaceInstructions = [prompt.brief_prompt, prompt.format_prompt, prompt.production_prompt]
      .filter((value) => typeof value === 'string' && value.trim())
      .join('\n\n--- NEXT WORKFLOW PROMPT ---\n\n')

    const userPrompt = [
      '你正在 SOON Content Studio 執行已確認格式之後的「資料核查＋故事結構」階段。',
      '遵從下方 Workspace Prompt 的品牌、語氣、核查及內容規則，但今次不要生成圖片。',
      '',
      '【Workspace Prompt】',
      workspaceInstructions,
      '',
      '【本次 Project】',
      `題目：${project.title}`,
      `來源：${project.source_name || '未提供'}`,
      `來源連結：${project.source_url || '未提供'}`,
      `來源內容：${project.source_note || '未提供'}`,
      `Brief：${JSON.stringify(project.brief || {})}`,
      `已確認格式：${project.selected_format || '未提供'}`,
      `格式備註：${JSON.stringify(project.format_decision || {})}`,
      '',
      '只輸出一個 JSON object，不要 Markdown code fence。JSON 必須符合：',
      '{',
      '  "verificationSummary": "繁體中文核查摘要",',
      '  "confirmedFacts": ["只列可由目前來源支持的事實"],',
      '  "selfReportedClaims": ["當事人或原帖自述"],',
      '  "unverifiedClaims": ["未能獨立核實或需要再查證的說法"],',
      '  "sources": [{"label":"來源名稱","url":"https://..."}],',
      '  "pages": [{"page":"P.1","headline":"頁面標題","purpose":"該頁功能","copyDirection":"內容重點／文案方向","visualDirection":"圖片方向"}]',
      '}',
      'pages 必須由 P.1 開始連續編號；Carousel 一般 5–9 頁，按資料量決定。不要把未核實內容寫成事實。',
      'confirmedFacts 只可包含來源內容或來源連結明確支持的事實；品牌自述必須放入 selfReportedClaims。',
      '如沒有外部來源連結，confirmedFacts 必須是空陣列。不得以一般常識補充解剖、生物力學、醫療或訓練原理；這些內容只能列為待核實，亦不得寫入 pages。',
    ].join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL),
        max_tokens: 5000,
        temperature: 0.25,
        system: 'You are SOON Content Studio. Follow the workspace-specific workflow faithfully. Return valid JSON only.',
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || 'AI request failed')
    const text = Array.isArray(data.content)
      ? data.content.filter((item: any) => item.type === 'text').map((item: any) => item.text || '').join('\n')
      : ''
    const generated = parseJsonObject(text)
    const hasExternalSource = Boolean(project.source_url?.trim())
    const unsupportedConfirmedFacts = hasExternalSource
      ? []
      : Array.isArray(generated.confirmedFacts)
        ? generated.confirmedFacts
        : []
    const production = {
      ...generated,
      confirmedFacts: hasExternalSource && Array.isArray(generated.confirmedFacts)
        ? generated.confirmedFacts
        : [],
      unverifiedClaims: [
        ...(Array.isArray(generated.unverifiedClaims) ? generated.unverifiedClaims : []),
        ...unsupportedConfirmedFacts.map((fact: unknown) => `未有外部來源支持：${String(fact)}`),
      ],
      status: 'structure_ready',
      generatedAt: new Date().toISOString(),
      promptVersion: prompt.version,
    }

    const updates: Record<string, unknown> = {
      production,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }
    if (promptId !== project.prompt_version_id) updates.prompt_version_id = promptId
    const { data: saved, error: saveError } = await access.admin
      .from('content_projects')
      .update(updates)
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .select('id,production,updated_at')
      .single()
    if (saveError) throw saveError

    return NextResponse.json({ success: true, project: saved })
  } catch (error) {
    console.error('[content-projects/generate-structure]', error)
    return NextResponse.json({ error: '未能生成資料核查及故事結構', detail: String(error) }, { status: 500 })
  }
}
