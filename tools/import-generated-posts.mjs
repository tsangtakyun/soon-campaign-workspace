#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ws from 'ws'

const VALID_CATEGORIES = new Set([
  'Trending 最新資訊',
  'Entertainment 娛樂資訊',
  'Celebrity 人物介紹',
  'Travel 旅遊資訊',
  '兩性關係 relationship',
])

const VALID_POST_TYPES = new Set(['carousel', 'single_image', 'threads_post', 'short_video'])
const WORKSPACE_ALIASES = new Map([
  ['egg.soon', 'eggsoon'],
  ['eggsoon', 'eggsoon'],
  ['bechilltogether', 'bechilltogether'],
  ['bunchill', 'bechilltogether'],
])

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    assetsDir: '',
    dryRun: false,
    file: '',
    workspace: '',
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--assets') {
      options.assetsDir = args[index + 1] || ''
      index += 1
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--workspace') {
      options.workspace = args[index + 1] || ''
      index += 1
    } else if (!options.file) {
      options.file = arg
    }
  }

  if (!options.file) {
    throw new Error('Usage: npm run import:generated -- ./imports/egg-week.json --assets /path/to/images')
  }

  return options
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}. Check .env.local or Vercel env.`)
  return value
}

async function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const raw = await readFile(envPath, 'utf8')
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) return
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = value
  })
}

async function readImportFile(filePath) {
  const raw = await readFile(path.resolve(filePath), 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('Import JSON must be an array.')
  return parsed
}

function normalizeWorkspace(value) {
  return (value || '').toLowerCase().replace(/\s+/g, '')
}

function workspaceMatcher(value) {
  const normalized = normalizeWorkspace(value)
  return WORKSPACE_ALIASES.get(normalized) || normalized
}

function validatePost(post, index) {
  const prefix = `Post #${index + 1}`
  if (!post || typeof post !== 'object') throw new Error(`${prefix} is not an object.`)
  if (!post.title || typeof post.title !== 'string') throw new Error(`${prefix} missing title.`)
  if (!post.caption || typeof post.caption !== 'string') throw new Error(`${prefix} missing caption.`)
  if (!post.scheduled_at_hkt || typeof post.scheduled_at_hkt !== 'string') {
    throw new Error(`${prefix} missing scheduled_at_hkt.`)
  }
  if (!VALID_CATEGORIES.has(post.content_category)) {
    throw new Error(`${prefix} invalid content_category: ${post.content_category}`)
  }
  if (!VALID_POST_TYPES.has(post.post_type)) {
    throw new Error(`${prefix} invalid post_type: ${post.post_type}`)
  }
}

function hktToIso(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/)
  if (!match) throw new Error(`Invalid scheduled_at_hkt format: ${value}. Use YYYY-MM-DD HH:mm`)
  const [, year, month, day, hour, minute] = match
  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`
}

function mapPostType(value) {
  if (value === 'short_video') return 'video'
  if (value === 'threads_post') return 'text'
  if (value === 'carousel') return 'carousel'
  if (value === 'single_image') return 'still_image'
  return value
}

async function findWorkspace(supabase, requestedWorkspace) {
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('id,name,owner_id,created_at')
    .order('created_at', { ascending: true })

  if (error) throw error

  const target = workspaceMatcher(requestedWorkspace || 'Egg.soon')
  const workspace = (workspaces || []).find((item) => workspaceMatcher(item.name) === target)
  if (!workspace) {
    throw new Error(`Workspace not found: ${requestedWorkspace || 'Egg.soon'}`)
  }
  return workspace
}

async function uploadAsset(supabase, options, workspace, post, asset, index) {
  const filename = asset?.filename
  if (!filename || typeof filename !== 'string') return null
  if (/^https?:\/\//i.test(filename)) {
    return { ...asset, url: filename }
  }

  const assetPath = path.resolve(options.assetsDir || path.dirname(options.file), filename)
  const info = await stat(assetPath).catch(() => null)
  if (!info?.isFile()) {
    throw new Error(`Asset file not found: ${assetPath}`)
  }
  if (options.dryRun) {
    return { ...asset, url: `dry-run://${path.basename(filename)}` }
  }

  const ext = path.extname(filename).toLowerCase()
  const contentType =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.mp4'
          ? 'video/mp4'
          : 'image/jpeg'
  const bucket = ext === '.mp4' ? 'public-assets' : 'brand-assets'
  const safeTitle = post.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'post'
  const stablePostKey = String(post.source_key || `${index + 1}-${safeTitle}`)
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  const storagePath = `${workspace.id}/imported-posts/${stablePostKey}/${path.basename(filename)}`
  const bytes = await readFile(assetPath)
  const { error } = await supabase.storage.from(bucket).upload(storagePath, bytes, {
    cacheControl: '31536000',
    contentType,
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  return { ...asset, url: data.publicUrl }
}

async function upsertImportCampaign(supabase, workspace, posts) {
  const sourceKey = `manual-import-${new Date().toISOString().slice(0, 10)}`
  const { data: existing, error: existingError } = await supabase
    .from('marketing_campaigns')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('source_key', sourceKey)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing?.id) return existing.id

  const firstDate = posts
    .map((post) => post.scheduled_at_hkt)
    .sort()[0]
    ?.slice(0, 10)

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      duration_weeks: 1,
      name: `Imported posts ${new Date().toISOString().slice(0, 10)}`,
      source_key: sourceKey,
      starts_on: firstDate || new Date().toISOString().slice(0, 10),
      status: 'pending_approval',
      strategy_emoji: '✦',
      strategy_title: `${workspace.name} imported content`,
      user_id: workspace.owner_id,
      workspace_id: workspace.id,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function main() {
  await loadLocalEnv()
  const options = parseArgs()
  const posts = await readImportFile(options.file)
  posts.forEach(validatePost)

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      realtime: {
        transport: ws,
      },
    }
  )
  const workspace = await findWorkspace(supabase, options.workspace || posts[0]?.workspace)
  const sourceKeys = posts.map((post, index) =>
    typeof post.source_key === 'string' && post.source_key.trim()
      ? post.source_key.trim()
      : `manual-import-${post.scheduled_at_hkt.slice(0, 10)}-${index + 1}`,
  )
  const { data: duplicatePosts, error: duplicateError } = await supabase
    .from('campaign_posts')
    .select('id,title,source_key')
    .eq('workspace_id', workspace.id)
    .in('source_key', sourceKeys)
  if (duplicateError) throw duplicateError
  if (duplicatePosts?.length) {
    throw new Error(`Import already exists: ${duplicatePosts.map((post) => `${post.title} (${post.source_key})`).join(', ')}`)
  }
  const campaignId = options.dryRun
    ? 'dry-run-campaign-id'
    : await upsertImportCampaign(supabase, workspace, posts)

  const rows = []
  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index]
    const uploadedAssets = []
    for (const asset of post.assets || []) {
      const uploaded = await uploadAsset(supabase, options, workspace, post, asset, index)
      if (uploaded) uploadedAssets.push(uploaded)
    }

    rows.push({
      body: post.caption,
      campaign_id: campaignId,
      captions: {
        approval_note: post.approval_note || '',
        assets: uploadedAssets,
        content_category: post.content_category,
        import_source: 'SOON_IMPORT_JSON',
        platforms: post.platforms || ['Instagram', 'Facebook', 'Threads'],
      },
      image_url: uploadedAssets[0]?.url || null,
      post_type: mapPostType(post.post_type),
      scheduled_at: hktToIso(post.scheduled_at_hkt),
      source_key: sourceKeys[index],
      status: post.status === 'approved' ? 'approved' : 'ready',
      title: post.title,
      updated_at: new Date().toISOString(),
      user_id: workspace.owner_id,
      workspace_id: workspace.id,
    })
  }

  if (options.dryRun) {
    console.log(JSON.stringify({ workspace, campaignId, rows }, null, 2))
    return
  }

  const { data, error } = await supabase.from('campaign_posts').insert(rows).select('id,title,scheduled_at,status')
  if (error) throw error

  console.log(`Imported ${data.length} post(s) into ${workspace.name}.`)
  data.forEach((post) => {
    console.log(`- ${post.title} (${post.status}) ${post.scheduled_at}`)
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
