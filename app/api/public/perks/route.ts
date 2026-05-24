import { createAdminSupabase } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

type BrandPerk = {
  id: string
  type: string
  title: string
  description: string | null
  requirements: string | null
  quota: number | null
  valid_until: string | null
  is_active: boolean | null
  workspace_id: string
  workspaces?: { id?: string; name?: string | null; description?: string | null } | null
}

export async function GET() {
  const supabaseAdmin = createAdminSupabase()

  const { data, error } = await supabaseAdmin
    .from('brand_perks')
    .select(`
      id,
      type,
      title,
      description,
      requirements,
      quota,
      valid_until,
      is_active,
      workspace_id,
      workspaces!inner(id, name, description)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const enriched = await Promise.all(
    ((data ?? []) as BrandPerk[]).map(async (perk) => {
      const [{ data: kit }, { count }] = await Promise.all([
        supabaseAdmin
          .from('brand_kits')
          .select('business_name, website_url, logo_url')
          .eq('workspace_id', perk.workspace_id)
          .maybeSingle(),
        supabaseAdmin
          .from('perk_claims')
          .select('*', { count: 'exact', head: true })
          .eq('perk_id', perk.id),
      ])

      return {
        ...perk,
        brand_name: kit?.business_name ?? perk.workspaces?.name ?? null,
        brand_website: kit?.website_url ?? null,
        brand_logo_url: kit?.logo_url ?? null,
        claimed_count: count ?? 0,
      }
    })
  )

  return NextResponse.json(
    { perks: enriched },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
