import { timingSafeEqual } from 'node:crypto'

export function isAuthorizedInternalRequest(req: Request) {
  const expected = process.env.SOON_INTERNAL_API_KEY
  const provided = req.headers.get('x-soon-api-key')
  if (!expected || !provided) return false

  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer)
}

