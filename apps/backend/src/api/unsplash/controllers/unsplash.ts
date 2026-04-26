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

export default {
  async search(ctx) {
    const apiKey = process.env.UNSPLASH_ACCESS_KEY
    if (!apiKey) {
      ctx.status = 500
      return { error: 'UNSPLASH_ACCESS_KEY not set' }
    }

    const q = (ctx.query.q as string)?.trim()
    const perPage = Math.min(Number(ctx.query.per_page || '3'), 10)
    const orientation = (ctx.query.orientation as string) || 'squarish'

    if (!q) return ctx.badRequest('q required')

    const url =
      `https://api.unsplash.com/search/photos` +
      `?query=${encodeURIComponent(q)}` +
      `&per_page=${perPage}` +
      `&orientation=${orientation}` +
      `&content_filter=high`

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${apiKey}` },
      })
      if (!res.ok) {
        ctx.status = res.status
        return { error: `unsplash ${res.status}`, detail: await res.text() }
      }
      const json = (await res.json()) as UnsplashSearchResponse

      // Относительные URL — клиент префиксит их через getAiBaseUrl, чтобы и /api/img
      // ходил тем же путём (relay для РФ, прямо для EN). Без префикса картинки бы
      // ушли на yukai.app/api/img — а там этого роута уже не будет после Phase 4.
      const proxify = (u: string) => `/api/img?url=${encodeURIComponent(u)}`
      const photos = json.results.map((p) => ({
        id: p.id,
        url: proxify(p.urls.small),
        thumb: proxify(p.urls.thumb),
        alt: p.alt_description,
        author: p.user.name,
        authorUrl: `${p.user.links.html}?utm_source=anirum&utm_medium=referral`,
        downloadLocation: p.links.download_location,
      }))
      return { photos, urls: photos.map((p) => p.url) }
    } catch (e) {
      strapi.log.error('[unsplash] failed', e)
      ctx.status = 500
      return { error: e instanceof Error ? e.message : String(e) }
    }
  },
}
