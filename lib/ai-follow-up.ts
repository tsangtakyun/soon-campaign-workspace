import { explainAnalysisPoint, type CampaignFormInput } from '@/lib/analysis'
import { anthropicModel } from '@/lib/anthropic-models'

export type FollowUpPayload = {
  form: CampaignFormInput
  sectionTitle: string
  item: string
  question: string
}

export async function generateFollowUpAnswer(payload: FollowUpPayload) {
  const provider = process.env.AI_PROVIDER || 'anthropic'

  if (provider === 'anthropic') {
    return generateAnthropicFollowUp(payload)
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}

async function generateAnthropicFollowUp(payload: FollowUpPayload) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const model = anthropicModel()
  const brand = payload.form.businessName || '品牌'
  const contextExplanation = explainAnalysisPoint(payload.form, payload.sectionTitle, payload.item)

  const systemPrompt = [
    'You are a senior social media marketing strategist for SOON.',
    'Reply in Traditional Chinese with Hong Kong Cantonese wording.',
    'Be concise, direct, and commercially useful.',
    'Explain recommendations in plain language for a client, not for an internal team.',
    'Ground the answer in the campaign context provided.',
    'Do not mention being an AI model or discuss policy.',
    'Keep the answer to 2 short paragraphs or 4 flat bullet points max.',
  ].join(' ')

  const userPrompt = [
    `品牌: ${brand}`,
    `Campaign title: ${payload.form.campaignTitle || '未提供'}`,
    `Objective: ${payload.form.objective}`,
    `Vertical: ${payload.form.vertical}`,
    `Budget range: ${payload.form.budgetRange}`,
    `Brief: ${payload.form.brief}`,
    `Must include: ${payload.form.mustInclude || '未提供'}`,
    `Report section: ${payload.sectionTitle}`,
    `Point being questioned: ${payload.item}`,
    `Current explanation: ${contextExplanation}`,
    `Client follow-up question: ${payload.question}`,
    'Please answer the follow-up question in a way that helps the client understand the business reason, the practical next step, and any tradeoff if relevant.',
  ].join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      temperature: 0.4,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'Anthropic API request failed')
  }

  const text = Array.isArray(data.content)
    ? data.content
      .filter((item: { type?: string }) => item.type === 'text')
      .map((item: { text?: string }) => item.text || '')
      .join('\n')
      .trim()
    : ''

  if (!text) {
    throw new Error('Claude returned an empty answer')
  }

  return {
    answer: text,
    provider: 'anthropic',
    model,
  }
}
