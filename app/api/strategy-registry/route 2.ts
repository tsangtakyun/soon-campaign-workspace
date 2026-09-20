import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerSupabase } from '@/lib/server-supabase'
import { createStrategyVersion, getPublishedStrategies, STRATEGY_TYPES, type StrategyType } from '@/lib/strategy-registry'

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)

async function internalUser() {
  const supabase = createServerSupabase(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes((user.email || '').toLowerCase())) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

export async function GET(req: Request) {
  try {
    const auth = await internalUser()
    if (auth.error) return auth.error
    const requestedType = new URL(req.url).searchParams.get('type')
    const strategyType = STRATEGY_TYPES.includes(requestedType as StrategyType) ? requestedType as StrategyType : undefined
    return NextResponse.json({ items: await getPublishedStrategies(strategyType) })
  } catch (error) {
    return NextResponse.json({ error: '未能載入 Strategy Registry', detail: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await internalUser()
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const strategyType = STRATEGY_TYPES.includes(body.strategyType) ? body.strategyType as StrategyType : null
    const strategyId = typeof body.strategyId === 'string' ? body.strategyId.trim().slice(0, 120) : ''
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 160) : ''
    if (!strategyType || !strategyId || !name || !body.definition || typeof body.definition !== 'object') {
      return NextResponse.json({ error: 'Strategy資料不完整' }, { status: 400 })
    }
    const version = await createStrategyVersion({
      strategyId, strategyType, name,
      nameZh: typeof body.nameZh === 'string' ? body.nameZh.trim().slice(0, 160) : name,
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : '',
      definition: body.definition,
      changeNote: typeof body.changeNote === 'string' ? body.changeNote.trim().slice(0, 1000) : '',
      publish: body.publish === true,
      userId: auth.user.id,
    })
    return NextResponse.json({ success: true, version }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: '未能建立 Strategy Version', detail: String(error) }, { status: 500 })
  }
}
