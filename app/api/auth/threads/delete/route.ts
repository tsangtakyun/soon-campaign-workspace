import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST() {
  return NextResponse.json({
    confirmation_code: `threads-delete-${Date.now()}`,
    url: 'https://soon-campaign-workspace.vercel.app/contact',
  })
}
