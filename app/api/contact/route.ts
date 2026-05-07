import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ContactPayload = {
  name?: string
  email?: string
  website?: string
  phone?: string
  location?: string
  budget?: string
  goal?: string
}

const CONTACT_TO_EMAIL = 'hello@sooncreator.network'
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'SOON <hello@sooncreator.network>'

function clean(value?: string) {
  return (value || '').trim()
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildEmailHtml(payload: Required<ContactPayload>) {
  const rows = [
    ['姓名', payload.name],
    ['公司電郵', payload.email],
    ['公司網站 / 社交連結', payload.website || '未提供'],
    ['電話 / WhatsApp', payload.phone || '未提供'],
    ['公司所在地', payload.location || '未提供'],
    ['每月宣傳預算', payload.budget || '未提供'],
    ['希望協助方向', payload.goal],
  ]

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111111; line-height: 1.6;">
      <h1 style="margin: 0 0 16px; font-size: 24px;">新的 SOON 聯絡表格提交</h1>
      <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="width: 180px; padding: 12px; border: 1px solid #e6e6e6; background: #f7f7f7; font-weight: 700;">${escapeHtml(label)}</td>
            <td style="padding: 12px; border: 1px solid #e6e6e6; white-space: pre-wrap;">${escapeHtml(value)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `
}

async function sendContactEmail(payload: Required<ContactPayload>) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: false, reason: 'RESEND_API_KEY is not configured' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      reply_to: payload.email,
      subject: `SOON 聯絡表格：${payload.name || payload.email}`,
      html: buildEmailHtml(payload),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return { sent: false, reason: error }
  }

  return { sent: true, reason: '' }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload
    const payload: Required<ContactPayload> = {
      name: clean(body.name),
      email: clean(body.email),
      website: clean(body.website),
      phone: clean(body.phone),
      location: clean(body.location),
      budget: clean(body.budget),
      goal: clean(body.goal),
    }

    if (!payload.name || !payload.email || !payload.goal) {
      return NextResponse.json({ error: '請填寫姓名、公司電郵和希望協助方向。' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const brief = [
      payload.goal,
      payload.location ? `所在地：${payload.location}` : '',
      payload.website ? `網站：${payload.website}` : '',
    ].filter(Boolean).join('\n')

    const { error } = await supabase.from('campaign_intakes').insert({
      contact_name: payload.name,
      objective: 'consultation',
      business_name: payload.website || '未提供',
      whatsapp: payload.phone,
      email: payload.email,
      campaign_title: '聯絡我們',
      vertical: 'general',
      budget_range: payload.budget || '未提供',
      brief,
      must_include: '由聯絡我們頁面提交',
      source_channel: 'soon-contact-page',
    })

    if (error) throw error

    const emailResult = await sendContactEmail(payload)

    return NextResponse.json({
      ok: true,
      emailSent: emailResult.sent,
      emailReason: emailResult.reason,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '暫時未能提交資料。' }, { status: 500 })
  }
}
