import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'
import { contentStylePromptFromDecision } from '@/lib/content-style-library'

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
    const { data: contentPreferences } = await access.admin
      .from('content_preferences')
      .select('content_mood')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    const contentMood = contentPreferences?.content_mood && typeof contentPreferences.content_mood === 'object'
      ? contentPreferences.content_mood as Record<string, unknown>
      : {}
    const languageStyle = contentMood.languageStyle === 'written' || contentMood.languageStyle === 'conversational'
      ? contentMood.languageStyle
      : 'brand'
    const languageInstruction = languageStyle === 'written'
      ? '本工作台選擇「書面語」：所有對外文案使用自然、簡潔的繁體中文書面語，避免「有冇、係咪、睇、揀、唔、咁、佢」等口語。'
      : languageStyle === 'conversational'
        ? '本工作台選擇「口語」：使用自然香港廣東話及短句，保持清楚、可信，不使用生硬書面腔。'
        : '本工作台選擇「品牌慣用語氣」：優先遵從 Workspace Prompt 內的品牌語氣及不同內容格式規則。'
    const formatDecision = project.format_decision && typeof project.format_decision === 'object'
      ? project.format_decision as Record<string, unknown>
      : {}
    const styleRules = contentStylePromptFromDecision(formatDecision, project.selected_format)
    const slideCount = Math.min(10, Math.max(3, Number(formatDecision.slideCount) || 5))
    const templateContract = formatDecision.templateContractSnapshot && typeof formatDecision.templateContractSnapshot === 'object'
      ? formatDecision.templateContractSnapshot as Record<string, unknown>
      : null
    const contractRoles = Array.isArray(templateContract?.page_roles)
      ? templateContract.page_roles
          .map((item) => item && typeof item === 'object' && 'role' in item ? String(item.role) : '')
          .filter(Boolean)
      : []
    const templateCode = String(formatDecision.renderTemplateCode || formatDecision.templateCode || '')
    const usesSemanticTemplateRoles = [
      'clear-magazine-carousel-v1',
      'clear_magazine_carousel',
      'editorial-clear',
    ].includes(templateCode)
    const roleDefinitions = [
      'cover：用一句吸引人的開場及一個清晰承諾帶出主題。',
      'longform：解釋主題的核心價值或背景，不得重複封面開場。',
      'split：把一個流程、步驟或兩組互相關聯的內容清楚拆開。',
      'comparison：作明確的並列比較，讓讀者一眼看出差異。',
      'feature：整理口味、產品選擇、功能或其他具體賣點。',
      'end：只保留總結、行動呼籲及必要店舖資料。',
    ].join('\n')
    const roleInstruction = project.selected_format === 'carousel' && contractRoles.length
      ? [
          `Template 的完整參考結構為 ${contractRoles.length} 頁：${contractRoles.join(' → ')}。`,
          `用家已選擇 ${slideCount} 頁，頁數選擇優先於 Template 的完整頁數；不得擅自增加頁面。`,
          `各角色功能如下：\n${roleDefinitions}`,
          usesSemanticTemplateRoles
            ? 'Template artboards 只提供視覺規則與可用頁型，不代表固定頁序。除 cover 必須在首頁、end 必須在末頁外，中段須按內容語意選擇 longform、split、comparison 或 feature；不可為了還原參考圖次序而硬套頁型。'
            : slideCount === contractRoles.length
            ? '頁數與 Template 完整結構相同。每一頁的 role 必須按位置逐一完全對應上述角色，不得改名、互換或用相鄰頁重複同一訊息。'
            : slideCount < contractRoles.length
            ? '請保留 cover 與 end，將最相近的中段功能自然合併。合併後每頁仍只可有一個清晰主旨，最後一頁同時承擔總結及 CTA。'
            : '請按 Template 角色順序分配內容；如頁數較多，只可拆細中段，不可重複同一訊息。',
        ].join('\n')
      : ''
    const formatInstruction = project.selected_format === 'single_image'
      ? '這是單張貼文。pages 必須只輸出 P.1，集中一個最清晰的視覺訊息。'
      : project.selected_format === 'short_video'
        ? formatDecision.videoMethod === 'ai_video_generation'
          ? '這是 AI 生成短片。pages 代表連續鏡頭，並為每個鏡頭提供可供影片生成使用的 visualDirection。不要聲稱影片已經生成。'
          : '這是真人拍攝短片。pages 代表連續鏡頭，內容必須實際可拍攝；提供人物動作、畫面及說話重點。'
        : `這是輪播貼文。pages 必須剛好輸出 ${slideCount} 頁，由 P.1 至 P.${slideCount}。`

    const userPrompt = [
      '你正在 SOON Content Studio 執行已確認格式之後的「資料核查＋故事結構」階段。',
      '遵從下方 Workspace Prompt 的品牌、語氣、核查及內容規則，但今次不要生成圖片。',
      '',
      '【Workspace Prompt】',
      workspaceInstructions,
      '',
      '【文字語氣設定】',
      languageInstruction,
      '',
      '【SOON Style 製作規格】',
      styleRules,
      roleInstruction,
      '',
      '【本次 Project】',
      `題目：${project.title}`,
      `來源：${project.source_name || '未提供'}`,
      `來源連結：${project.source_url || '未提供'}`,
      `來源內容：${project.source_note || '未提供'}`,
      `Brief：${JSON.stringify(project.brief || {})}`,
      `已確認格式：${project.selected_format || '未提供'}`,
      `格式備註：${JSON.stringify(project.format_decision || {})}`,
      `格式製作要求：${formatInstruction}`,
      '',
      '只輸出一個 JSON object，不要 Markdown code fence。JSON 必須符合：',
      '{',
      '  "verificationSummary": "繁體中文核查摘要",',
      '  "confirmedFacts": ["只列可由目前來源支持的事實"],',
      '  "selfReportedClaims": ["當事人或原帖自述"],',
      '  "unverifiedClaims": ["未能獨立核實或需要再查證的說法"],',
      '  "sources": [{"label":"來源名稱","url":"https://..."}],',
      '  "pages": [{"page":"P.1","role":"cover|longform|split|comparison|feature|end","templateArtboardId":"01_COVER|02_FULL_BLEED_TEXT|03_IMAGE_TOP_TEXT_BOTTOM|04_COMPARISON|05_LEFT_TEXT_RIGHT_IMAGE|06_END_CTA","headline":"頁面標題","purpose":"該頁功能","copyDirection":"內容重點／文案方向","visualDirection":"圖片方向"}]',
      '}',
      'pages 必須由 P.1 開始連續編號，並嚴格遵從上述格式製作要求。不要把未核實內容寫成事實。',
      usesSemanticTemplateRoles ? '每頁必須輸出 templateArtboardId，並與 role 一一對應：cover=01_COVER、longform=02_FULL_BLEED_TEXT、split=03_IMAGE_TOP_TEXT_BOTTOM、comparison=04_COMPARISON、feature=05_LEFT_TEXT_RIGHT_IMAGE、end=06_END_CTA。選定後 renderer 不會自行改版。' : '',
      `輪播每頁只可傳達一個主旨，不得在不同頁重複解釋相同內容。headline 應遵從上述文字語氣設定，建議不超過 18 個中文字。`,
      'copyDirection 只保留該頁必要內容，使用 2 至 3 個短句，建議不超過 70 個中文字；地址、價格、營業時間及免責資料不要分散重複。',
      '不得使用過度絕對或來源未支持的標題，例如「不是工廠製作」；應改為準確的比較或描述。',
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
