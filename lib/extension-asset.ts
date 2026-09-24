import type { SubjectFocus } from './subject-crop';
export type ExtensionPreview = { id: string; url: string; originalUrl: string; width: number; height: number; originalHeight: number };
export type ExtensionOriginal = { url: string; width: number; height: number; subjectFocus?: SubjectFocus | null };
export type ExtendableAsset = import('./composition-mode').CompositionAsset & { url: string; width: number; height: number; subjectFocus?: SubjectFocus | null; extensionOriginal?: ExtensionOriginal; extensionId?: string; autoExtensionDeclinedUrl?: string; extensionRejectedUrl?: string; compositionFit?: 'contain' };
export function applyExtension<T extends ExtendableAsset>(asset: T, preview: ExtensionPreview): T {
  if (asset.extensionOriginal || preview.originalUrl !== asset.url) throw new Error('圖片已更改，請重新預覽。');
  return { ...asset, extensionOriginal: { url: asset.url, width: asset.width, height: asset.height, subjectFocus: asset.subjectFocus },
    extensionId: preview.id, url: preview.url, width: preview.width, height: preview.height, subjectFocus: null, compositionFit: undefined, extensionRejectedUrl: undefined };
}
export function restoreExtension<T extends ExtendableAsset>(asset: T): T {
  if (!asset.extensionOriginal) return asset;
  const { extensionOriginal, extensionId, ...rest } = asset;
  return { ...rest, ...extensionOriginal, autoExtensionDeclinedUrl: extensionOriginal.url } as T;
}
