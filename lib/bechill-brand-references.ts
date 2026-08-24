import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const BECHILL_REFERENCE_ASSETS = [
  {
    filename: 'bunchill-2D-character-sheet.png',
    label: 'Character Sheet',
    publicPath: '/brand-assets/bechilltogether/bunchill-2D-character-sheet.png',
  },
  {
    filename: 'bunchill-visual-language.png',
    label: 'Visual Language',
    publicPath: '/brand-assets/bechilltogether/bunchill-visual-language.png',
  },
  {
    filename: 'bunchill-expression-core-clean.png',
    label: 'Expression Core clean',
    publicPath: '/brand-assets/bechilltogether/bunchill-expression-core-clean.png',
  },
  {
    filename: 'bunchill-expression-extended-clean.png',
    label: 'Expression Extended clean',
    publicPath: '/brand-assets/bechilltogether/bunchill-expression-extended-clean.png',
  },
  {
    filename: 'bunchill-expression-master-annotated.png',
    label: 'Nine-expression annotated master',
    publicPath: '/brand-assets/bechilltogether/bunchill-expression-master-annotated.png',
  },
] as const

export const BECHILL_REFERENCE_PROMPT = [
  'The five attached Bunchill brand references are mandatory identity constraints.',
  'Follow the Character Sheet for body, proportions, clothing, pocket and character identity.',
  'Follow Visual Language for outlines, rendering, palette, lighting and scene treatment.',
  'Use the clean Core or Extended expression sheet for the requested emotion.',
  'The annotated nine-expression master is a semantic index only: never reproduce its grid, labels, Chinese text, English text, numbers or sheet layout in the output.',
  'Do not merge multiple expressions into one face. Do not expose the eye hidden by the fringe.',
].join(' ')

export function isBechillBrand(value: unknown) {
  const normalized = String(value || '').toLowerCase().replace(/[\s._-]+/g, '')
  return normalized.includes('bechilltogether') || normalized.includes('bunchill')
}

export async function loadBechillReferenceFiles() {
  return Promise.all(
    BECHILL_REFERENCE_ASSETS.map(async (asset) => {
      const bytes = await readFile(
        path.join(process.cwd(), 'public', 'brand-assets', 'bechilltogether', asset.filename),
      )
      return new File([bytes], asset.filename, { type: 'image/png' })
    }),
  )
}
