import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type InviteRole = 'admin' | 'editor' | 'viewer'

type SendInviteBody = {
  emails?: string[]
  role?: string
  workspaceId?: string
  message?: string
  linkOnly?: boolean
  resend?: boolean
  expiresIn?: string
}

const INVITE_LINK_EMAIL = '*'
const VALID_ROLES = new Set<InviteRole>(['admin', 'editor', 'viewer'])

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://sooncreator.network'
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function roleLabel(role: InviteRole) {
  if (role === 'admin') return '管理員'
  if (role === 'viewer') return '只讀'
  return '編輯'
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function expiresAtFor(value?: string) {
  if (value === '7 日') return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  if (value === '永久有效') return new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
}

async function requireUser() {
  const serverSupabase = createServerSupabase(await cookies())
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  return user
}

async function getWorkspaceAccess(workspaceId: string, userId: string) {
  const supabase = createAdminSupabase()
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id,role,status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id,name,owner_id')
    .eq('id', workspaceId)
    .maybeSingle()

  const role = membership?.role || (workspace?.owner_id === userId ? 'owner' : null)
  return {
    supabase,
    workspace,
    role,
    canView: Boolean(role),
    canManage: role === 'owner' || role === 'admin',
  }
}

async function sendInviteEmail(input: {
  email: string
  inviteUrl: string
  inviterName: string
  message?: string
  role: InviteRole
  workspaceName: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  console.log('RESEND_API_KEY exists:', Boolean(apiKey))

  if (!apiKey) {
    console.error('[invite/send] Missing RESEND_API_KEY')
    return { sent: false, error: 'RESEND_API_KEY is not configured' }
  }

  try {
    console.log(`Attempting to send email to: ${input.email}`)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.INVITE_FROM_EMAIL || 'SOON <noreply@sooncreator.network>',
        to: input.email,
        subject: `${input.workspaceName} 邀請你加入 SOON`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;line-height:1.7;padding:24px;">
            <h2 style="margin:0 0 12px;font-size:22px;">你收到一個 SOON 工作台邀請！</h2>
            <p>${input.inviterName} 邀請你以「${roleLabel(input.role)}」身份加入「${input.workspaceName}」。</p>
            ${
              input.message
                ? `<p style="padding:12px 14px;background:#f5f3ff;border-radius:8px;">留言：${input.message}</p>`
                : ''
            }
            <a href="${input.inviteUrl}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:700;">
              接受邀請
            </a>
            <p style="color:#6b7280;font-size:12px;margin-top:18px;">此邀請連結將於 30 日後失效</p>
          </div>
        `,
      }),
    })

    const responseText = await response.text()
    let responseBody: unknown = responseText

    try {
      responseBody = JSON.parse(responseText)
    } catch {
      // Keep the raw response text for logging.
    }

    console.log('[invite/send] Resend response:', {
      ok: response.ok,
      status: response.status,
      body: responseBody,
    })

    if (!response.ok) {
      return {
        sent: false,
        error: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
      }
    }

    return { sent: true, error: '' }
  } catch (error) {
    console.error('[invite/send] Resend send failed:', error)
    return { sent: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })

    const { supabase, canView } = await getWorkspaceAccess(workspaceId, user.id)
    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] =
      await Promise.all([
        supabase
          .from('workspace_members')
          .select('workspace_id,user_id,email,display_name,role,status,created_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true }),
        supabase
          .from('workspace_invitations')
          .select('id,workspace_id,email,role,status,expires_at,message,created_at,token')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false }),
      ])

    if (membersError) throw membersError
    if (invitationsError) throw invitationsError

    return NextResponse.json({
      members: members ?? [],
      invitations: invitations ?? [],
    })
  } catch (error) {
    console.error('[invite/send] GET', error)
    return NextResponse.json(
      { error: 'Failed to load invitations', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as SendInviteBody
    const workspaceId = body.workspaceId
    const role = VALID_ROLES.has(body.role as InviteRole) ? (body.role as InviteRole) : 'editor'
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })

    const { supabase, workspace, canManage } = await getWorkspaceAccess(workspaceId, user.id)
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!workspace?.id) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const workspaceName = workspace.name || 'SOON 工作台'
    const inviterName = user.user_metadata?.full_name || user.email || 'SOON 團隊成員'

    if (body.linkOnly) {
      const { data: invitation, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          invited_by: user.id,
          email: INVITE_LINK_EMAIL,
          role,
          message: message || null,
          status: 'pending',
          expires_at: expiresAtFor(body.expiresIn),
        })
        .select('token')
        .single()

      if (error) throw error
      return NextResponse.json({
        success: true,
        sent: 0,
        token: invitation.token,
        inviteUrl: `${appUrl()}/invite/${invitation.token}`,
        errors: [],
      })
    }

    const emails = Array.from(new Set((body.emails ?? []).map(normalizeEmail).filter(Boolean)))
    if (!emails.length) return NextResponse.json({ error: 'Missing emails' }, { status: 400 })

    const invalidEmails = emails.filter((email) => !isValidEmail(email))
    if (invalidEmails.length) {
      return NextResponse.json({ error: `Invalid email: ${invalidEmails.join(', ')}` }, { status: 400 })
    }

    const errors: string[] = []
    const emailErrors: string[] = []
    let sent = 0

    for (const email of emails) {
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('email,status')
        .eq('workspace_id', workspaceId)
        .ilike('email', email)
        .eq('status', 'active')
        .maybeSingle()

      if (existingMember) {
        errors.push(`${email} 已經是此工作台成員`)
        continue
      }

      const { data: existingInvite } = await supabase
        .from('workspace_invitations')
        .select('id,token,status,expires_at')
        .eq('workspace_id', workspaceId)
        .ilike('email', email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let token = existingInvite?.token as string | undefined

      if (existingInvite && !body.resend) {
        errors.push(`${email} 已有待確認邀請`)
        continue
      }

      if (!existingInvite) {
        const { data: invitation, error: inviteError } = await supabase
          .from('workspace_invitations')
          .insert({
            workspace_id: workspaceId,
            invited_by: user.id,
            email,
            role,
            message: message || null,
            status: 'pending',
          })
          .select('token')
          .single()

        if (inviteError) {
          errors.push(`${email}: ${inviteError.message}`)
          continue
        }
        token = invitation.token
      }

      const emailResult = await sendInviteEmail({
        email,
        inviteUrl: `${appUrl()}/invite/${token}`,
        inviterName,
        message,
        role,
        workspaceName,
      })

      if (emailResult.sent) {
        sent += 1
      } else {
        const errorMessage = `${email}: ${emailResult.error}`
        errors.push(errorMessage)
        emailErrors.push(errorMessage)
      }
    }

    if (emailErrors.length) {
      console.error('[invite/send] Email sending failed:', emailErrors)
      return NextResponse.json(
        {
          success: false,
          sent,
          errors,
          error: 'EMAIL_SEND_FAILED',
        },
        { status: 502 },
      )
    }

    if (sent === 0 && errors.length) {
      return NextResponse.json({ success: false, sent, errors }, { status: 400 })
    }

    return NextResponse.json({ success: true, sent, errors })
  } catch (error) {
    console.error('[invite/send] POST', error)
    return NextResponse.json(
      { error: 'Failed to send invite', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
