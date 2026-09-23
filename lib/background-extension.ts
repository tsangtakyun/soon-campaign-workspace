import sharp from 'sharp';
import { fetchSafeExternal } from './safe-external-url';

export const EXTENSION_VERSION = 'extend-bottom-cover-v1';
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

/** No enlargement: keep the whole source at the top; only new canvas is editable. */
export async function prepareExtension(bytes: Buffer) {
  const { data: original, info } = await sharp(bytes, { limitInputPixels: 40_000_000, animated: false })
    .rotate().resize({ width: 1024, withoutEnlargement: true }).flatten({ background: '#fff' }).png().toBuffer({ resolveWithObject: true });
  const width = info.width, height = Math.round(width * 1.25);
  if (info.height >= height - 32) throw new Error('NOT_LANDSCAPE');
  const canvas = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: original, left: 0, top: 0 }]).png().toBuffer();
  const opaque = await sharp({ create: { width, height: info.height, channels: 4, background: '#fff' } }).png().toBuffer();
  const mask = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: opaque, left: 0, top: 0 }]).png().toBuffer();
  return { original, canvas, mask, width, height, originalHeight: info.height };
}

/** Masks are advisory to the model. Re-compositing guarantees original pixels survive. */
export async function finishExtension(generated: Buffer, plan: Awaited<ReturnType<typeof prepareExtension>>) {
  const metadata = await sharp(generated, { limitInputPixels: 40_000_000 }).metadata();
  if (metadata.width !== 1024 || metadata.height !== 1536) throw new Error('Unexpected generated dimensions');
  return sharp(generated).extract({ left: 0, top: 0, width: plan.width, height: plan.height })
    .composite([{ input: plan.original, left: 0, top: 0 }]).png().toBuffer();
}
