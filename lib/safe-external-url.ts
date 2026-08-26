import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

const MAX_REDIRECTS = 3

function isPrivateIpv4(address: string) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase().split('%')[0]
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.') ||
    normalized.startsWith('::ffff:169.254.')
  )
}

function isPrivateAddress(address: string) {
  const version = isIP(address)
  return version === 4 ? isPrivateIpv4(address) : version === 6 ? isPrivateIpv6(address) : true
}

export async function assertSafeExternalUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL protocol')
  if (url.username || url.password) throw new Error('URL credentials are not allowed')

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Internal network URLs are not allowed')
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error('Internal network URLs are not allowed')
    return url
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Internal network URLs are not allowed')
  }
  return url
}

export async function fetchSafeExternal(
  rawUrl: string,
  init: RequestInit = {},
  redirectCount = 0,
): Promise<Response> {
  const url = await assertSafeExternalUrl(rawUrl)
  const response = await fetch(url, { ...init, redirect: 'manual' })

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (!location || redirectCount >= MAX_REDIRECTS) throw new Error('Unsafe or excessive redirect')
    const nextUrl = new URL(location, url)
    return fetchSafeExternal(nextUrl.toString(), init, redirectCount + 1)
  }

  return response
}
