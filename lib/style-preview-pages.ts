// Representative samples only. Preserve original page ids for asset matching.
export function stylePreviewPages<T>(pages: T[]): Array<{ page: T; sourceIndex: number; label: string }> {
  if (!pages.length) return [];
  const indices = [...new Set([0, Math.min(1, pages.length - 1), pages.length - 1])];
  return indices.map(sourceIndex => ({ page: pages[sourceIndex], sourceIndex,
    label: sourceIndex === 0 ? '封面' : sourceIndex === pages.length - 1 ? '收尾' : '內文' }));
}
