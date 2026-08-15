export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6'

export function anthropicModel(envModel?: string) {
  return envModel || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL
}
