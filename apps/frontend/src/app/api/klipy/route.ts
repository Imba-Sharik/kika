import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type ContentType = 'gifs' | 'stickers' | 'memes' | 'clips'

function deepFindUrls(obj: unknown, found: string[] = []): string[] {
  if (!obj) return found
  if (typeof obj === 'string') {
    if (/^https?:\/\/[^"\s]+\.(gif|mp4|webp)(\?|$)/i.test(obj)) {
      found.push(obj)
    }
    return found
  }
  if (Array.isArray(obj)) {
    for (const item of obj) deepFindUrls(item, found)
    return found
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      deepFindUrls(value, found)
    }
  }
  return found
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.KLIPY_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'KLIPY_API_KEY not set' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const type = (searchParams.get('type') as ContentType) || 'gifs'
  const locale = searchParams.get('locale') || 'en_us'
  const customerId = searchParams.get('customer_id') || 'kika-web'
  const debug = searchParams.get('debug') === '1'

  if (!q) return Response.json({ error: 'q required' }, { status: 400 })

  function buildUrl(t: ContentType): string {
    return `https://api.klipy.com/api/v1/${apiKey}/${t}/search?q=${encodeURIComponent(q!)}&locale=${locale}&page=1&per_page=6&customer_id=${encodeURIComponent(customerId)}`
  }

  async function fetchType(t: ContentType): Promise<{
    urls: string[]
    raw: unknown
    status: number
  }> {
    const res = await fetch(buildUrl(t))
    if (!res.ok) {
      return { urls: [], raw: await res.text(), status: res.status }
    }
    const json: unknown = await res.json()
    const allUrls = deepFindUrls(json)
    return { urls: Array.from(new Set(allUrls)), raw: json, status: 200 }
  }

  try {
    let result = await fetchType(type)

    if (result.urls.length === 0 && type !== 'gifs') {
      const fb = await fetchType('gifs')
      if (fb.urls.length > 0) result = fb
    }

    if (debug) {
      return Response.json({ urls: result.urls, raw: result.raw, status: result.status })
    }
    return Response.json({ urls: result.urls })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
