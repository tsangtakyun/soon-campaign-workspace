import { createHash } from 'node:crypto';
import { validExtensionPlacement } from '@/lib/extension-geometry';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireWorkspaceUser, consumeApiQuota } from '@/lib/platform-access';
import { isUuid } from '@/lib/oauth-connections';
import { generationError } from '@/lib/generation-error';
import { loadExtensionSource, prepareExtension, finishExtension, EXTENSION_VERSION } from '@/lib/background-extension';
import { boundarySchema, boundariesSafe, qualityApproved, inspectExtensionBoundaries, reviewExtension, extensionPrompt } from '@/lib/extension-quality';

export const runtime = 'nodejs';
export const maxDuration = 180;
const table = 'content_project_generation_runs';
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function POST(request: Request) {
  let admin: SupabaseClient | undefined, runId: string | undefined;
  let stage='prepare', metadata: Record<string, any> = {};
  try {
    const { workspaceId, projectId, assetId, placement = { aspectRatio: .8, topFraction: 0 } } = await request.json().catch(() => ({}));
    if (!validExtensionPlacement(placement)) return reply({ error: 'Invalid placement' }, 400);
    if (!isUuid(workspaceId) || !isUuid(projectId) || typeof assetId !== 'string' || !assetId || assetId.length > 200) return reply({ error: 'Invalid request' }, 400);
    const auth = await requireWorkspaceUser(workspaceId, 'canEdit');
    if (auth.error) return auth.error;
    admin = auth.access.admin;
    if (!(await consumeApiQuota(auth.access.user.id, 'extend-background', 10))) return reply({ error: '已達生成次數限制，請稍後再試。' }, 429);
    const { data: project, error } = await admin.from('content_projects').select('production').eq('id', projectId).eq('workspace_id', workspaceId).maybeSingle();
    if (error) return reply({ error: '未能讀取專案。' }, 503);
    const asset = Array.isArray(project?.production?.assets) ? project.production.assets.find((a: any) => a?.id === assetId) : null;
    if (!asset?.url) return reply({ error: '找不到圖片。' }, 404);
    if (asset.extensionOriginal) return reply({ error: '此圖已延伸；請先還原原圖。' }, 422);
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
    const bytes = await loadExtensionSource(new URL(asset.url, request.url).toString());
    const plan = await prepareExtension(bytes, placement);
    const hash = createHash('sha256').update(`${workspaceId}:${projectId}:${assetId}:${model}:${EXTENSION_VERSION}:${placement.aspectRatio}:${placement.topFraction}:${placement.leftFraction ?? .5}:${placement.expansion ?? 1}:`).update(bytes).digest('hex');
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const { data: old, error: lookupError } = await admin.from(table).select('status,output,updated_at').eq('id', id).eq('workspace_id', workspaceId).maybeSingle();
    if (lookupError) return reply({ error: '生成紀錄暫時不可用。' }, 503);
    if (old?.output?.rejected) return reply({ code:'EXTENSION_REJECTED', stage:old.output.rejectionStage||'review',error:'延伸未通過環境／主體檢查，已保留原圖；不會重複生成。' },422);
    if (old?.status === 'ready' && qualityApproved(old.output?.review)) return reply({ ...old.output, cached: true });
    if (old?.status === 'pending' && Date.now() - Date.parse(old.updated_at) < 240_000) return reply({ error: '正在延伸，請稍後再按；完成後會讀取已保存版本。' }, 409);
    if (!process.env.OPENAI_API_KEY) return reply({ error: '圖片服務尚未設定。' }, 503);
    const updatedAt = new Date().toISOString();
    const claim = old ? await admin.from(table).update({ status: 'pending', error: null, updated_at: updatedAt }).eq('id', id).eq('status', old.status).eq('updated_at', old.updated_at).select('id').maybeSingle()
      : await admin.from(table).insert({ id, project_id: projectId, workspace_id: workspaceId, actor_id: auth.access.user.id, status: 'pending', model,
        input: { kind: EXTENSION_VERSION, assetId, originalUrl: asset.url, hash }, updated_at: updatedAt }).select('id').maybeSingle();
    if (claim.error || !claim.data) return reply({ error: '生成請求已在處理，請稍後再試。' }, 409);
    runId = id;
    metadata = { ...(old?.output || {}) };
    async function persistMetadata() {
      const saved = await admin!.from(table).update({output:metadata,updated_at:new Date().toISOString()}).eq('id',id);
      if(saved.error) throw new Error('Review metadata storage failed');
    }
    async function rejectExtension() {
      metadata.rejected=true;
      metadata.rejectionStage=stage;
      await persistMetadata();
      const saved=await admin!.from(table).update({status:'failed',error:'延伸未通過環境／主體檢查'}).eq('id',id);
      if(saved.error)throw new Error('Rejection storage failed');
      return reply({code:'EXTENSION_REJECTED',stage,error:stage==='boundary_analysis'?'生成前邊界檢查未通過，未生成新背景；原圖保留。':'生成結果未通過品質檢查；原圖保留。'},422);
    }
    const priorBoundary=boundarySchema.safeParse(metadata.boundaries);
    if(!priorBoundary.success) {
      stage='boundary_analysis';
      const inspection=await inspectExtensionBoundaries(plan.original,plan);
      metadata={...metadata,boundaries:inspection.output,boundaryUsage:inspection.usage,boundaryInspectedAt:new Date().toISOString()};
      await persistMetadata();
    }
    stage='boundary_analysis';
    if(!boundariesSafe(metadata.boundaries,plan)) return rejectExtension();
    const boundaries=boundarySchema.parse(metadata.boundaries);
    const path = `${workspaceId}/content-projects/${projectId}/extensions/${id}.png`;
    const bucket = admin.storage.from('brand-assets');
    // A completed upload survives a subsequent database failure; never pay to regenerate it.
    const recovered = await bucket.download(path);
    let usage: unknown = old?.output?.usage || null;
    if (!recovered.data) {
      const rawPath = `${workspaceId}/content-projects/${projectId}/extensions/${id}-raw.png`;
      const priorRaw = await bucket.download(rawPath);
      let generated: Buffer;
      if (priorRaw.data) generated = Buffer.from(await priorRaw.data.arrayBuffer());
      else {
      stage='image_generation';
      const form = new FormData();
      form.append('model', model);
      form.append('image', new File([new Uint8Array(plan.canvas)], 'canvas.png', { type: 'image/png' }));
      form.append('mask', new File([new Uint8Array(plan.mask)], 'mask.png', { type: 'image/png' }));
      form.append('size', '1024x1536'); form.append('quality', 'medium'); form.append('output_format', 'png');
      form.append('prompt', extensionPrompt(plan,boundaries));
      const response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form, signal: AbortSignal.timeout(90_000) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.[0]?.b64_json) throw Object.assign(new Error('Image generation failed'),{statusCode:response.status,responseBody:JSON.stringify({error:payload?.error}),responseHeaders:{'x-request-id':response.headers.get('x-request-id')||''}});
      usage = payload.usage || null;
      generated = Buffer.from(payload.data[0].b64_json, 'base64');
      let rawUpload = await bucket.upload(rawPath, generated, { contentType: 'image/png', upsert: true });
      if (rawUpload.error) rawUpload = await bucket.upload(rawPath, generated, { contentType: 'image/png', upsert: true });
      if (rawUpload.error) throw new Error('Raw image storage failed');
      metadata={...metadata,usage,rawPath};
      await persistMetadata();
      }
      const final = await finishExtension(generated, plan);
      if(!qualityApproved(metadata.review)) {
        stage='quality_review';
        const inspection=await reviewExtension(plan.original,final,plan,boundaries);
        metadata={...metadata,review:inspection.output,reviewUsage:inspection.usage,reviewedAt:new Date().toISOString()};
        await persistMetadata();
      }
      if(!qualityApproved(metadata.review)) return rejectExtension();
      let upload = await bucket.upload(path, final, { contentType: 'image/png', cacheControl: '31536000', upsert: true });
      if (upload.error) upload = await bucket.upload(path, final, { contentType: 'image/png', cacheControl: '31536000', upsert: true });
      if (upload.error) throw new Error('Image storage failed');
    }
    if(recovered.data && !qualityApproved(metadata.review)) {
      stage='quality_review';
      const inspection=await reviewExtension(plan.original,new Uint8Array(await recovered.data.arrayBuffer()),plan,boundaries);
      metadata={...metadata,review:inspection.output,reviewUsage:inspection.usage,reviewedAt:new Date().toISOString()};
      await persistMetadata();
      if(!qualityApproved(metadata.review))return rejectExtension();
    }
    const output = { ...metadata, id, url: bucket.getPublicUrl(path).data.publicUrl, originalUrl: asset.url, width: plan.width, height: plan.height,
      originalWidth: plan.originalWidth, originalLeft: plan.originalLeft, originalHeight: plan.originalHeight, originalTop: plan.originalTop, placement, model, usage, estimatedCostUsd: null, costBasis: 'Provider usage retained; monetary cost not estimated', kind: EXTENSION_VERSION, createdAt: updatedAt };
    stage='persist_result';
    let saved = await admin.from(table).update({ status: 'ready', output, updated_at: new Date().toISOString() }).eq('id', id);
    if (saved.error) saved = await admin.from(table).update({ status: 'ready', output, updated_at: new Date().toISOString() }).eq('id', id);
    if (saved.error) throw new Error('Record storage failed');
    return reply({ ...output, cached: Boolean(recovered.data) });
  } catch (error) {
    const diagnostic=generationError(error,stage);
    if (runId && admin) await admin.from(table).update({ status: 'failed', error: `${stage}: ${diagnostic.name} ${diagnostic.statusCode||''}`,output:{...metadata,failures:[...(metadata.failures||[]),diagnostic]}, updated_at: new Date().toISOString() }).eq('id', runId);
    if (error instanceof Error && ['NO_EXTENSION_NEEDED', 'EXTENSION_TOO_LARGE', 'INVALID_PLACEMENT'].includes(error.message)) return reply({ error: '此構圖不需要延伸或超出安全延伸範圍；原圖及母版保留。' }, 422);
    console.error('[extend-background]',{runId,...diagnostic});
    return reply({ code:'EXTENSION_FAILED',runId,stage,error: '背景延伸未完成，原圖未改動。可重試本頁，或保留原圖繼續。' }, 502);
  }
}
