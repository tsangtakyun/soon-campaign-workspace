import sharp from 'sharp';
import { fetchSafeExternal } from './safe-external-url';
import {extensionGeometry,type ExtensionPlacement} from './extension-geometry';

export const EXTENSION_VERSION = 'extend-four-boundaries-v4';
export async function loadExtensionSource(url: string) {
  const response = await fetchSafeExternal(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Source unavailable');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Source unavailable');
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > 12 * 1024 * 1024) throw new Error('Source too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}

/** Preserve the entire source; only the four new margins are editable. */
export async function prepareExtension(bytes: Buffer, placement:ExtensionPlacement = { aspectRatio: .8, topFraction: 0 }) {
  const normalized=await sharp(bytes,{limitInputPixels:40_000_000,animated:false}).rotate().flatten({background:'#fff'}).png().toBuffer({resolveWithObject:true});
  const geometry=extensionGeometry(normalized.info.width,normalized.info.height,placement);
  if(geometry.width-geometry.originalWidth+geometry.height-geometry.originalHeight<32)throw new Error('NO_EXTENSION_NEEDED');
  const scale=Math.min(1,1024/geometry.width,1536/geometry.height);
  const width=Math.floor(geometry.width*scale),height=Math.floor(geometry.height*scale);
  const {data:original,info}=await sharp(normalized.data).resize({width:Math.max(1,Math.floor(geometry.originalWidth*scale)),height:Math.max(1,Math.floor(geometry.originalHeight*scale)),fit:'fill',withoutEnlargement:true}).png().toBuffer({resolveWithObject:true});
  const originalTop=Math.round((height-info.height)*placement.topFraction);
  const originalLeft=Math.round((width-info.width)*(placement.leftFraction??.5));
  const canvas = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: original, left: originalLeft, top: originalTop }]).png().toBuffer();
  const opaque = await sharp({ create: { width:info.width, height: info.height, channels: 4, background: '#fff' } }).png().toBuffer();
  const mask = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: opaque, left: originalLeft, top: originalTop }]).png().toBuffer();
  return { original, canvas, mask, width, height, originalWidth:info.width,originalLeft,originalHeight: info.height, originalTop };
}

/** Masks are advisory to the model. Re-compositing guarantees original pixels survive. */
export async function finishExtension(generated: Buffer, plan: Awaited<ReturnType<typeof prepareExtension>>) {
  const metadata = await sharp(generated, { limitInputPixels: 40_000_000 }).metadata();
  if (metadata.width !== 1024 || metadata.height !== 1536) throw new Error('Unexpected generated dimensions');
  return sharp(generated).extract({ left: 0, top: 0, width: plan.width, height: plan.height })
    .composite([{ input: plan.original, left: plan.originalLeft, top: plan.originalTop }]).png().toBuffer();
}
