import { NextResponse } from 'next/server'

import { buildAnalysisPreview, type CampaignFormInput } from '@/lib/analysis'
import { getStrategyLibrary } from '@/lib/strategy-library-store'

export async function POST(request: Request) {
  let form: CampaignFormInput

  try {
    form = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const strategyLibrary = await getStrategyLibrary()
  const preview = buildAnalysisPreview(form, strategyLibrary)

  return NextResponse.json({ preview })
}
