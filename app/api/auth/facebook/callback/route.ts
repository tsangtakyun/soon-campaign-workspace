import { NextResponse } from 'next/server'

import { appUrl } from '@/lib/oauth-connections'

export async function GET(req: Request) {
  // Retain the old URL only as a safe redirect. New connections must begin at
  // /api/auth/facebook and return through the workspace-scoped callback.
  return NextResponse.redirect(
    `${appUrl(req)}/onboarding/integrations?error=legacy_callback_disabled`
  )
}
