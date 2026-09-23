// Shared by the selector UI and server-side recommendation context.
export function confirmedPhotoCount(production: Record<string, unknown> | null | undefined) {
  if (production?.assetStatus !== 'confirmed' || !Array.isArray(production.assets)) return 0
  return production.assets.filter(asset => asset && typeof asset.url === 'string' && asset.url.trim()).length
}

export function confirmedProjectMaterials(production: Record<string, unknown>, explicit: unknown): string[] {
  const materials = ['photos', 'footage', 'presenter', 'research'].filter(id => Array.isArray(explicit) && explicit.includes(id))
  if (confirmedPhotoCount(production) && !materials.includes('photos')) materials.push('photos')
  // An uploaded photo or completed story is not proof that research was verified.
  return materials
}
