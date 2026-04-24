import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type UnsplashPhoto = {
  id: string
  urls: { raw: string; regular: string; small: string; thumb: string }
  alt_description: string | null
  user: { name: string; username: string; links: { html: string } }
  links: { download_location: string }
}

type UnsplashSearchResponse = {
  total: number
  results: UnsplashPhoto[]
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY
  if (!apiKey) {
    return Response.json({ error: 'UNSPLASH_ACCESS_KEY not set' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const perPage = Math.min(Number(searchParams.get('per_page') || '3'), 10)
  const orientation = searchParams.get('orientation') || 'squarish'

  if (!q) return Response.json({ error: 'q required' }, { status: 400 })

  const url =
    `https://api.unsplash.com/search/photos` +
    `?query=${encodeURIComponent(q)}` +
    `&per_page=${perPage}` +
    `&orientation=${orientation}` +
    `&content_filter=high`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${apiKey}` },
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!res.ok) {
      return Response.json(
        { error: `unsplash ${res.status}`, detail: await res.text() },
        { status: res.status },
      )
    }
    const json = (await res.json()) as UnsplashSearchResponse
    const photos = json.results.map((p) => ({
      id: p.id,
      url: p.urls.small,
      thumb: p.urls.thumb,
      alt: p.alt_description,
      author: p.user.name,
      authorUrl: `${p.user.links.html}?utm_source=anirum&utm_medium=referral`,
      downloadLocation: p.links.download_location,
    }))
    return Response.json({ photos, urls: photos.map((p) => p.url) })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
