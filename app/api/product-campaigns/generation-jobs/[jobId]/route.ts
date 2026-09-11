import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

type RouteProps = { params: Promise<{ jobId: string }> }
type JsonRecord = Record<string, any>

export const runtime = 'nodejs'
export const maxDuration = 120

function clean(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback }

async function loadReferenceImage(imageUrl: string) {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`未能讀取產品原圖（${response.status}）`)
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  return new File([await response.arrayBuffer()], 'product-reference', { type: contentType })
}

async function loadReferenceBuffer(imageUrl: string) {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`未能讀取產品原圖（${response.status}）`)
  return Buffer.from(await response.arrayBuffer())
}

async function createImage(prompt: string, productImageUrl?: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('AI 圖片服務尚未設定')
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
  let response: Response
  if (productImageUrl) {
    const form = new FormData()
    form.append('model', model)
    form.append('image', await loadReferenceImage(productImageUrl))
    form.append('prompt', prompt)
    form.append('size', '1024x1536')
    form.append('quality', 'medium')
    form.append('output_format', 'png')
    form.append('input_fidelity', 'high')
    response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(90_000) })
  } else {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, prompt, size: '1024x1536', quality: 'medium', output_format: 'png' }), signal: AbortSignal.timeout(90_000),
    })
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error?.message || 'AI 圖片生成失敗')
  if (!payload?.data?.[0]?.b64_json) throw new Error('AI 圖片服務未有回傳圖片')
  return payload.data[0].b64_json as string
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] || character)
}

function wrapText(value: string, maxLength: number, maxLines: number) {
  const characters = Array.from(clean(value))
  const lines: string[] = []
  while (characters.length && lines.length < maxLines) lines.push(characters.splice(0, maxLength).join(''))
  if (characters.length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(1, maxLength - 1))}…`
  return lines
}

async function normalizeFeedImage(source: Buffer) {
  const background = await sharp(source).resize(1080, 1350, { fit: 'cover' }).blur(28).modulate({ brightness: 0.78 }).png().toBuffer()
  const foreground = await sharp(source).resize(1080, 1350, { fit: 'contain', background: { r: 246, g: 246, b: 244, alpha: 0 } }).png().toBuffer()
  return sharp(background).composite([{ input: foreground, gravity: 'center' }]).png().toBuffer()
}

async function placeExactProduct(background: Buffer, productImageUrl: string) {
  const source = await loadReferenceBuffer(productImageUrl)
  const { data, info } = await sharp(source).rotate().resize({ width: 760, height: 430, fit: 'inside', withoutEnlargement: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = Buffer.from(data)
  const visited = new Uint8Array(info.width * info.height)
  const queue = new Int32Array(info.width * info.height)
  let head = 0; let tail = 0
  const isBackground = (index: number) => {
    const offset = index * 4
    return pixels[offset + 3] === 0 || (pixels[offset] >= 236 && pixels[offset + 1] >= 236 && pixels[offset + 2] >= 236)
  }
  const enqueue = (index: number) => { if (!visited[index] && isBackground(index)) { visited[index] = 1; queue[tail++] = index } }
  for (let x = 0; x < info.width; x++) { enqueue(x); enqueue((info.height - 1) * info.width + x) }
  for (let y = 0; y < info.height; y++) { enqueue(y * info.width); enqueue(y * info.width + info.width - 1) }
  while (head < tail) {
    const index = queue[head++]; const x = index % info.width; const y = Math.floor(index / info.width)
    if (x > 0) enqueue(index - 1); if (x + 1 < info.width) enqueue(index + 1); if (y > 0) enqueue(index - info.width); if (y + 1 < info.height) enqueue(index + info.width)
  }
  for (let index = 0; index < visited.length; index += 1) if (visited[index]) pixels[index * 4 + 3] = 0
  const product = await sharp(pixels, { raw: info }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(720, 390, { fit: 'inside' }).png().toBuffer()
  const productMeta = await sharp(product).metadata(); const productWidth = productMeta.width || 720; const productHeight = productMeta.height || 390
  const left = Math.round((1080 - productWidth) / 2); const top = Math.max(790, 1240 - productHeight)
  const shadow = Buffer.from(`<svg width="${productWidth}" height="${Math.max(80, productHeight)}" xmlns="http://www.w3.org/2000/svg"><ellipse cx="${productWidth / 2}" cy="${Math.max(50, productHeight - 18)}" rx="${productWidth * .42}" ry="28" fill="rgba(0,0,0,.3)" filter="blur(18px)"/></svg>`)
  return sharp(background).composite([
    { input: shadow, left, top },
    { input: product, left, top },
  ]).png().toBuffer()
}

let cjkFontDataPromise: Promise<string> | null = null
async function cjkFontData() {
  if (!cjkFontDataPromise) cjkFontDataPromise = readFile(path.join(process.cwd(), 'public/fonts/max32002/SweiGothicCJKtc-Regular.ttf')).then((font) => `data:font/truetype;base64,${font.toString('base64')}`)
  return cjkFontDataPromise
}

async function renderCarouselSlide(baseImage: Buffer, slide: JsonRecord, index: number, total: number) {
  const headline = wrapText(clean(slide?.headline, index === 0 ? '今次宣傳重點' : `重點 ${index + 1}`), 13, 3)
  const body = wrapText(clean(slide?.body), 20, 4)
  const headlineSvg = headline.map((line, lineIndex) => `<tspan x="76" dy="${lineIndex ? 82 : 0}">${escapeXml(line)}</tspan>`).join('')
  const bodySvg = body.map((line, lineIndex) => `<tspan x="80" dy="${lineIndex ? 52 : 0}">${escapeXml(line)}</tspan>`).join('')
  const font = await cjkFontData()
  const overlay = Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
    <style>@font-face{font-family:SoonCJK;src:url('${font}')} text{font-family:SoonCJK,sans-serif}</style>
    <rect width="1080" height="1350" fill="rgba(0,0,0,.12)"/>
    <rect x="44" y="690" width="992" height="610" rx="38" fill="rgba(18,18,20,.88)"/>
    <text x="76" y="760" fill="#F6D260" font-size="27" font-weight="700">SOON · ${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}</text>
    <text x="76" y="850" fill="#FFFFFF" font-size="66" font-weight="700">${headlineSvg}</text>
    ${body.length ? `<text x="80" y="${1005 + Math.max(0, headline.length - 1) * 34}" fill="#E7E7E9" font-size="35">${bodySvg}</text>` : ''}
  </svg>`)
  return sharp(baseImage).composite([{ input: overlay }]).png().toBuffer()
}

export async function POST(request: Request, { params }: RouteProps) {
  let admin: any; let job: JsonRecord | null = null
  try {
    const server = createServerSupabase(await cookies())
    const { data: { user } } = await server.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const lookup = createAdminSupabase()
    const { data: loaded } = await lookup.from('creative_generation_jobs').select('*').eq('id', (await params).jobId).maybeSingle()
    if (!loaded?.workspace_id) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: loaded.workspace_id })
    if (!access?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    admin = access.admin; job = loaded
    const body = await request.json().catch(() => ({}))
    const force = body?.force === true
    if (job.status === 'completed' && !force) return NextResponse.json({ job, reused: true, success: true })
    if (job.attempt >= job.max_attempts) return NextResponse.json({ error: '已達最大重試次數', job }, { status: 409 })
    const now = new Date().toISOString()
    const { data: claimed, error: claimError } = await admin.from('creative_generation_jobs')
      .update({ status: 'processing', progress: 15, attempt: job.attempt + 1, error_message: null, started_at: now, updated_at: now })
      .eq('id', job.id).neq('status', 'processing').select('*').maybeSingle()
    if (claimError) throw claimError
    if (!claimed) return NextResponse.json({ error: 'Job正在處理', job }, { status: 409 })
    job = claimed
    const { data: campaign } = await admin.from('marketing_campaigns').select('product_id').eq('id', job.campaign_id).maybeSingle()
    const { data: primaryProductAsset } = campaign?.product_id
      ? await admin.from('product_assets').select('url,asset_type').eq('workspace_id', job.workspace_id).eq('product_id', campaign.product_id).eq('is_primary', true).maybeSingle()
      : { data: null }
    const productImageUrl = clean(primaryProductAsset?.url)
    const snapshot = job.prompt_snapshot || {}; const production = snapshot.production || {}; const visual = production.visualBrief || {}
    const isStoryboard = job.job_type === 'video_storyboard'
    const prompt = [
      isStoryboard ? 'Create a cinematic vertical 9:16 keyframe for a short-form product video.' : 'Create a premium vertical 4:5 paid-social product photograph.',
      `Creative concept: ${clean(snapshot.title)}.`, `Angle and purpose: ${JSON.stringify(snapshot.brief || {})}.`,
      `Visual direction: ${clean(visual.generationPrompt) || clean(visual.composition) || clean(production.concept)}.`,
      production.approval?.status === 'changes_requested' ? `Mandatory reviewer revision request: ${clean(production.approval.note)}.` : '',
      isStoryboard ? `Opening scene: ${clean(production.script?.opening)}.` : '',
      productImageUrl
        ? 'Generate only the lifestyle background and people. Do not draw, imitate or include any product, packaging, box, label, logo, medicine or readable text. Leave the lower third visually clean because the exact original product photograph will be composited there afterwards.'
        : 'No authoritative product image is available. Create a conceptual scene without inventing readable packaging claims or pretending the packaging is exact.',
      'Keep the featured product visually coherent and leave usable negative space. Photorealistic, polished commercial lighting.',
      'No visible text, letters, numbers, logos, captions, signage, UI or watermarks. No unsupported before-and-after claims.',
    ].filter(Boolean).join(' ')
    await admin.from('creative_generation_jobs').update({ progress: 45, updated_at: new Date().toISOString() }).eq('id', job.id)
    const base64 = await createImage(prompt)
    await admin.from('creative_generation_jobs').update({ progress: 80, updated_at: new Date().toISOString() }).eq('id', job.id)
    const normalizedBackground = await normalizeFeedImage(Buffer.from(base64, 'base64'))
    const normalizedImage = productImageUrl ? await placeExactProduct(normalizedBackground, productImageUrl) : normalizedBackground
    const carouselSlides = snapshot.format === 'carousel' && Array.isArray(production.carouselPlan?.slides)
      ? production.carouselPlan.slides.slice(0, 7)
      : []
    const slideBuffers = carouselSlides.length >= 2
      ? await Promise.all(carouselSlides.map((slide: JsonRecord, index: number) => renderCarouselSlide(normalizedImage, slide, index, carouselSlides.length)))
      : [normalizedImage]
    const generatedAssets = await Promise.all(slideBuffers.map(async (buffer, index) => {
      const storagePath = `${user.id}/campaigns/${job!.campaign_id}/${job!.content_project_id}/${job!.id}${slideBuffers.length > 1 ? `-slide-${index + 1}` : ''}.png`
      const { error: uploadError } = await admin.storage.from('brand-assets').upload(storagePath, buffer, { contentType: 'image/png', upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = admin.storage.from('brand-assets').getPublicUrl(storagePath)
      return { id: crypto.randomUUID(), url: urlData.publicUrl, filename: slideBuffers.length > 1 ? `Carousel ${index + 1}.png` : isStoryboard ? 'Storyboard keyframe.png' : 'Campaign creative.png', width: 1080, height: 1350, sourceType: 'ai_generated', assetType: slideBuffers.length > 1 ? 'carousel_slide' : isStoryboard ? 'storyboard_keyframe' : 'campaign_image', slide: slideBuffers.length > 1 ? index + 1 : undefined, prompt }
    }))
    const asset = generatedAssets[0]
    const { data: project } = await admin.from('content_projects').select('production').eq('id', job.content_project_id).single()
    const currentProduction = project?.production || {}; const assets = Array.isArray(currentProduction.assets) ? currentProduction.assets : []
    const productionStatus = isStoryboard ? 'storyboard_ready' : 'asset_ready'
    const approval = currentProduction.approval?.status === 'changes_requested'
      ? { ...currentProduction.approval, status: 'pending_review', revisionCompletedAt: new Date().toISOString() }
      : currentProduction.approval
    await admin.from('content_projects').update({ production: { ...currentProduction, assets: [...assets.filter((item: JsonRecord) => item.generationJobId !== job!.id), ...generatedAssets.map((item) => ({ ...item, generationJobId: job!.id }))], productionStatus, approval }, updated_at: new Date().toISOString(), updated_by: user.id }).eq('id', job.content_project_id)
    const completedAt = new Date().toISOString()
    const output = { asset, assets: generatedAssets, productionStatus, finalVideoRendered: false, referenceMode: productImageUrl ? 'product_image' : 'concept_only', productReferenceUrl: productImageUrl || null }
    const { data: completed, error: completeError } = await admin.from('creative_generation_jobs').update({ status: 'completed', progress: 100, output, completed_at: completedAt, updated_at: completedAt }).eq('id', job.id).select('*').single()
    if (completeError) throw completeError
    const { count: incomplete } = await admin.from('creative_generation_jobs').select('id', { count: 'exact', head: true }).eq('campaign_id', job.campaign_id).neq('status', 'completed')
    if (!incomplete) await admin.from('marketing_campaigns').update({ generation_status: 'assets_ready', updated_at: completedAt }).eq('id', job.campaign_id)
    return NextResponse.json({ job: completed, success: true })
  } catch (error) {
    console.error('[creative-generation-job]', error)
    if (admin && job?.id) await admin.from('creative_generation_jobs').update({ status: 'failed', progress: 0, error_message: error instanceof Error ? error.message : String(error), updated_at: new Date().toISOString() }).eq('id', job.id)
    return NextResponse.json({ error: '未能生成Creative Asset', detail: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
