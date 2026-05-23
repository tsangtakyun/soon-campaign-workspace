import { createAdminSupabase } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabase()

  const { data: campaigns, error } = await supabase
    .from('marketing_campaigns')
    .select(`
      id,
      name,
      theme,
      status,
      starts_on,
      duration_weeks,
      target_audience,
      call_to_action,
      cover_image_url,
      workspace_id,
      created_at,
      workspaces!inner(name)
    `)
    .in('status', ['active', 'generating', 'draft'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ campaigns })
}
