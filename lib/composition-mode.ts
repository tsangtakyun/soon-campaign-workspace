import type { CropRect, SubjectFocus } from './subject-crop';

export type CompositionMode = 'original' | 'ai';
export type CompositionVariant = {
  sourceUrl: string;
  action: 'extend' | 'contain' | 'keep';
  reason: string;
  url?: string;
  width?: number;
  height?: number;
  extensionId?: string;
  subjectFocus?: SubjectFocus | null;
};
export type CompositionAsset = {
  url?: string;
  width?: number;
  height?: number;
  compositionMode?: CompositionMode;
  compositionSourceUrl?: string;
  compositionVariants?: Record<string, CompositionVariant>;
  compositionFit?: 'contain';
  extensionOriginal?: { url: string };
  extensionId?: string;
  subjectFocus?: SubjectFocus | null;
};

/** Geometry, not a page number or animal name, identifies a reusable composition.
 * Relative text zones make equivalent scaled previews share the same result. */
export function compositionKey(frame: CropRect, zones: CropRect[]) {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const overlaps = zones.filter(z => z.x < frame.x + frame.width && z.x + z.width > frame.x && z.y < frame.y + frame.height && z.y + z.height > frame.y);
  return JSON.stringify(['composition-v1', round(frame.width / frame.height), overlaps.map(z => [
    round((z.x - frame.x) / frame.width), round((z.y - frame.y) / frame.height), round(z.width / frame.width), round(z.height / frame.height),
  ]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
}

export function resolveComposition<T extends CompositionAsset>(asset: T, key: string): T {
  if (asset.compositionMode === 'original') return { ...asset, ...(asset.extensionOriginal || {}), compositionFit: 'contain', extensionOriginal: undefined, extensionId: undefined };
  // Previously approved, applied backgrounds are user choices, not disposable cache.
  if (asset.extensionOriginal) return asset;
  const variant = asset.compositionVariants?.[key];
  if (!variant || variant.sourceUrl !== (asset.compositionSourceUrl || asset.url)) {
    return asset.compositionMode === 'ai' ? { ...asset, compositionFit: 'contain' } : asset;
  }
  if (variant.action !== 'extend' || !variant.url) return { ...asset, subjectFocus: variant.subjectFocus || asset.subjectFocus, compositionFit: variant.action === 'contain' ? 'contain' : undefined };
  return { ...asset, url: variant.url, width: variant.width, height: variant.height, compositionFit: undefined,
    subjectFocus: null, extensionId: variant.extensionId, extensionOriginal: { url: variant.sourceUrl } };
}

export function setCompositionMode<T extends CompositionAsset>(assets: T[], mode: CompositionMode): T[] {
  // Preserve originals, variants, manual choices and existing output URLs when switching.
  return assets.map(asset => ({ ...asset, compositionMode: mode }));
}
