import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export const runtime = 'nodejs'

type GeneratedPage = { page?: string; url?: string }

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function createZip(files: Array<{ name: string; data: Buffer }>) {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const checksum = crc32(file.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(file.data.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    localParts.push(local, name, file.data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(file.data.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)
    offset += local.length + name.length + file.data.length
  }
  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...localParts, centralDirectory, end])
}

async function fetchImage(url: string) {
  const parsed = new URL(url)
  if (parsed.hostname !== 'auth.sooncreator.network' || !parsed.pathname.startsWith('/storage/v1/object/public/brand-assets/')) {
    throw new Error('Invalid generated image URL')
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Image download failed (${response.status})`)
  return Buffer.from(await response.arrayBuffer())
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const workspaceId = url.searchParams.get('workspaceId') || ''
    const projectId = url.searchParams.get('projectId') || ''
    const requestedPage = url.searchParams.get('page') || ''
    if (!isUuid(workspaceId) || !isUuid(projectId)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const serverSupabase = createServerSupabase(await cookies())
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: project, error } = await access.admin
      .from('content_projects')
      .select('id,title,production')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .single()
    if (error) throw error
    const production = project.production && typeof project.production === 'object' ? project.production as Record<string, unknown> : {}
    const pages = (Array.isArray(production.generatedPages) ? production.generatedPages : [])
      .filter((item): item is GeneratedPage => Boolean(item && typeof item === 'object' && typeof item.url === 'string'))
    if (!pages.length) return NextResponse.json({ error: 'No generated images' }, { status: 404 })

    if (requestedPage) {
      const page = pages.find((item) => item.page === requestedPage)
      if (!page?.url) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      const image = await fetchImage(page.url)
      const filename = `SOON-${requestedPage.replace(/[^A-Za-z0-9.-]/g, '-')}.png`
      return new Response(image, { headers: { 'content-type': 'image/png', 'content-disposition': `attachment; filename="${filename}"`, 'cache-control': 'private, no-store' } })
    }

    const files = await Promise.all(pages.map(async (page, index) => ({
      name: `${String(index + 1).padStart(2, '0')}-${String(page.page || `P.${index + 1}`).replace(/[^A-Za-z0-9.-]/g, '-')}.png`,
      data: await fetchImage(page.url || ''),
    })))
    const zip = createZip(files)
    return new Response(zip, { headers: { 'content-type': 'application/zip', 'content-disposition': 'attachment; filename="SOON-carousel.zip"', 'cache-control': 'private, no-store' } })
  } catch (error) {
    console.error('[content-projects/download]', error)
    return NextResponse.json({ error: 'Failed to download images', detail: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
