#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ws from 'ws'

async function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const raw = await readFile(envPath, 'utf8')
  raw.split(/\r?\n/).forEach((line) => {
    const value = line.trim()
    if (!value || value.startsWith('#')) return
    const split = value.indexOf('=')
    if (split < 0) return
    const key = value.slice(0, split).trim()
    const val = value.slice(split + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = val
  })
}

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function hktToIso(value) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/)
  if (!m) throw new Error(`Invalid scheduled_at_hkt: ${value}`)
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+08:00`
}

await loadLocalEnv()
const importFile = process.argv[2]
if (!importFile) throw new Error('Usage: node tools/update-imported-post.mjs imports/post.json')
const [post] = JSON.parse(await readFile(path.resolve(importFile), 'utf8'))
if (!post?.source_key) throw new Error('Import needs source_key')

const supabase = createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  realtime: { transport: ws },
})
const { data: existing, error: lookupError } = await supabase
  .from('campaign_posts')
  .select('id,workspace_id,captions,status')
  .eq('source_key', post.source_key)
  .single()
if (lookupError) throw lookupError

const assets = []
for (const asset of post.assets || []) {
  const filename = path.resolve(asset.filename)
  const info = await stat(filename).catch(() => null)
  if (!info?.isFile()) throw new Error(`Asset not found: ${filename}`)
  const storagePath = `${existing.workspace_id}/imported-posts/${post.source_key}/${path.basename(filename)}`
  const bytes = await readFile(filename)
  const { error } = await supabase.storage.from('brand-assets').upload(storagePath, bytes, {
    cacheControl: '31536000', contentType: 'image/png', upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)
  assets.push({ ...asset, url: data.publicUrl })
}

const captions = {
  ...(existing.captions || {}),
  approval_note: post.approval_note || '',
  assets,
  content_category: post.content_category,
  import_source: 'SOON_IMPORT_JSON',
  platforms: post.platforms || ['Instagram'],
}
const { data: updated, error: updateError } = await supabase
  .from('campaign_posts')
  .update({
    body: post.caption,
    captions,
    image_url: assets[0]?.url || null,
    post_type: post.post_type === 'carousel' ? 'carousel' : post.post_type,
    scheduled_at: hktToIso(post.scheduled_at_hkt),
    status: 'ready',
    title: post.title,
    updated_at: new Date().toISOString(),
  })
  .eq('id', existing.id)
  .select('id,title,status,scheduled_at,captions')
  .single()
if (updateError) throw updateError
console.log(JSON.stringify({ id: updated.id, title: updated.title, status: updated.status, scheduled_at: updated.scheduled_at, asset_count: updated.captions.assets.length }, null, 2))
