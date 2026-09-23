import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid } from '@/lib/oauth-connections';
import { requireWorkspaceUser, consumeApiQuota } from '@/lib/platform-access';
import { fetchSafeExternal } from '@/lib/safe-external-url';
import { detectSubject, focusFromDetection, SUBJECT_MODEL, SUBJECT_PROMPT_VERSION } from '@/lib/ai-subject-focus';

export const runtime = 'nodejs';
export const maxDuration = 60;
const table = 'content_project_generation_runs';
const headers = { 'Cache-Control': 'private, no-store' };
function reply(data: unknown, status = 200) { return NextResponse.json(data, { status, headers }); }
async function readImage(url: string) {
  const response = await fetchSafeExternal(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('圖片未能讀取');
  const limit = 12 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('圖片超過 12MB'); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('圖片未能讀取');
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error('圖片超過 12MB');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000, animated: false }).rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

export async function POST(request: Request) {
  let runId: string | undefined;
  let admin: SupabaseClient | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, projectId, assetId } = body;
    if (!isUuid(workspaceId) || !isUuid(projectId) || typeof assetId !== 'string' || !assetId || assetId.length > 200) return reply({ error: 'Invalid request' }, 400);
    const auth = await requireWorkspaceUser(workspaceId, 'canEdit');
    if (auth.error) return auth.error;
    admin = auth.access.admin;
    if (!(await consumeApiQuota(auth.access.user.id, 'detect-subject', 30))) return reply({ error: '請稍後再試，已達辨識次數限制。' }, 429);
    const { data: project, error } = await admin.from('content_projects').select('production').eq('id', projectId).eq('workspace_id', workspaceId).maybeSingle();
    if (error) return reply({ error: '未能讀取專案。' }, 503);
    const asset = Array.isArray(project?.production?.assets) ? project.production.assets.find((a: any) => a?.id === assetId) : null;
    if (!asset?.url) return reply({ error: '找不到專案圖片。' }, 404);
    // The client supplies an asset ID, never a URL. Do not send authenticated URLs or original metadata to the model.
    const image = await readImage(new URL(asset.url, request.url).toString());
    const hash = createHash('sha256').update(`${workspaceId}:${projectId}:${assetId}:${SUBJECT_MODEL}:${SUBJECT_PROMPT_VERSION}:`).update(image).digest('hex');
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const { data: old, error: lookupError } = await admin.from(table).select('status,output,updated_at').eq('id', id).eq('workspace_id', workspaceId).maybeSingle();
    if (lookupError) return reply({ error: '辨識紀錄暫時不可用。' }, 503);
    const address = `/api/content-projects/detect-subject?workspaceId=${workspaceId}&id=${id}`;
    if (old?.status === 'ready') return reply({ ...old.output, id, url: address, cached: true });
    if (!process.env.ANTHROPIC_API_KEY) return reply({ error: 'AI 辨識服務尚未設定，請先使用手動焦點。' }, 503);
    if (old?.status === 'pending' && Date.now() - Date.parse(old.updated_at) < 120_000) return reply({ error: '此圖片正在辨識中；請稍後再按一次。', id, url: address }, 409);
    const record = { id, project_id: projectId, workspace_id: workspaceId, actor_id: auth.access.user.id, status: 'pending', model: SUBJECT_MODEL,
      input: { kind: SUBJECT_PROMPT_VERSION, assetId, imageHash: hash }, updated_at: new Date().toISOString() };
    const claim = old ? await admin.from(table).update({ status: 'pending', error: null, updated_at: record.updated_at }).eq('id', id).eq('status', old.status).eq('updated_at', old.updated_at).select('id').maybeSingle()
      : await admin.from(table).insert(record).select('id').maybeSingle();
    if (claim.error || !claim.data) return reply({ error: '辨識請求已在處理，請稍後再試。' }, 409);
    runId = id;
    const result = await detectSubject(image);
    const focus = focusFromDetection(result.output);
    const inputTokens = result.totalUsage.inputTokens || 0, outputTokens = result.totalUsage.outputTokens || 0;
    const output = { detection: result.output, focus, usage: { inputTokens, outputTokens }, model: SUBJECT_MODEL, provider: 'anthropic-direct',
      estimatedCostUsd: inputTokens * .000001 + outputTokens * .000005, costBasis: 'Gateway catalog 2026-09-23, estimate excluding cache discounts',
      createdAt: new Date().toISOString(), applied: false };
    const { error: savedError } = await admin.from(table).update({ status: 'ready', output, updated_at: new Date().toISOString() }).eq('id', id);
    if (savedError) throw new Error('未能保存辨識結果');
    return reply({ ...output, id, url: address, cached: false });
  } catch (error) {
    if (runId && admin) await admin.from(table).update({ status: 'failed', error: '辨識未完成', updated_at: new Date().toISOString() }).eq('id', runId);
    console.error('[detect-subject]', error instanceof Error ? error.name : 'UnknownError');
    return reply({ error: 'AI 主體辨識暫時未完成，原本焦點未有改動。請稍後重試或手動設定。' }, 502);
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams, workspaceId = params.get('workspaceId') || '', id = params.get('id') || '';
  if (!isUuid(workspaceId) || !isUuid(id)) return reply({ error: 'Invalid request' }, 400);
  const auth = await requireWorkspaceUser(workspaceId, 'canEdit');
  if (auth.error) return auth.error;
  const { data, error } = await auth.access.admin.from(table).select('id,status,output,error,created_at').eq('id', id).eq('workspace_id', workspaceId).eq('input->>kind', SUBJECT_PROMPT_VERSION).maybeSingle();
  return reply(error ? { error: 'Unavailable' } : data || { error: 'Not found' }, error ? 503 : data ? 200 : 404);
}
