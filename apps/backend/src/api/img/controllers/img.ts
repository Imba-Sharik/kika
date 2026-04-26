import { Readable } from 'node:stream'

// Whitelist обязателен — иначе endpoint станет open proxy для anonymous-юзеров.
// Только хосты которые отдают unsplash/klipy сами.
const ALLOWED_HOSTS = new Set([
  'images.unsplash.com',
  'plus.unsplash.com',
  'media.klipy.co',
  'media1.klipy.com',
  'media2.klipy.com',
  'cdn.klipy.com',
])

export default {
  async proxy(ctx) {
    const target = ctx.query.url as string | undefined
    if (!target) {
      ctx.status = 400
      ctx.body = 'url required'
      return
    }

    let parsed: URL
    try {
      parsed = new URL(target)
    } catch {
      ctx.status = 400
      ctx.body = 'bad url'
      return
    }

    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
      ctx.status = 403
      ctx.body = 'forbidden host'
      return
    }

    try {
      const upstream = await fetch(parsed.toString(), {
        headers: { 'user-agent': 'YukaiImageProxy/1.0' },
      })
      if (!upstream.ok || !upstream.body) {
        ctx.status = 502
        ctx.body = 'upstream error'
        return
      }

      ctx.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')
      // Иммутабельные картинки — кешируем агрессивно у клиента и на CDN/relay
      ctx.set('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable')
      ctx.body = Readable.fromWeb(upstream.body as never)
    } catch (e) {
      strapi.log.error('[img] proxy failed', e)
      ctx.status = 502
      ctx.body = 'fetch failed'
    }
  },
}
