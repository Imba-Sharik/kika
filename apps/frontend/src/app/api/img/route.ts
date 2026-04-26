import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Универсальный прокси для внешних картинок. Нужен потому что РФ-провайдеры
// блокируют CDN типа images.unsplash.com / media.klipy.co — юзер без VPN
// видит placeholder. Через этот endpoint картинка идёт по цепочке:
// юзер → ru.yukai.app (Selectel) → Vercel → upstream CDN → обратно.
// Whitelist хостов обязателен, иначе endpoint станет open proxy.
const ALLOWED_HOSTS = new Set([
  'images.unsplash.com',
  'plus.unsplash.com',
  'media.klipy.co',
  'media1.klipy.com',
  'media2.klipy.com',
  'cdn.klipy.com',
])

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url')
  if (!target) return new Response('url required', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('bad url', { status: 400 })
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return new Response('forbidden host', { status: 403 })
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'user-agent': 'YukaiImageProxy/1.0' },
      // Vercel-edge кеш + браузер кеш: картинки иммутабельные, держим долго
      next: { revalidate: 60 * 60 * 24 * 7 },
    })
    if (!upstream.ok || !upstream.body) {
      return new Response('upstream error', { status: 502 })
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'public, max-age=86400, s-maxage=2592000, immutable',
      },
    })
  } catch {
    return new Response('fetch failed', { status: 502 })
  }
}
