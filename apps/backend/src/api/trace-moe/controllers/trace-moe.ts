type Body = {
  image: string // data:image/...;base64,...
}

type TraceMoeResult = {
  anilist?: {
    id: number
    idMal: number
    title: { native?: string; romaji?: string; english?: string | null }
    synonyms?: string[]
    isAdult?: boolean
  }
  filename?: string
  episode?: number | string | null
  from: number
  to: number
  similarity: number
  video?: string
  image?: string
}

type TraceMoeResponse = {
  frameCount: number
  error: string
  result: TraceMoeResult[]
}

const TRACE_MOE_URL = 'https://api.trace.moe/search?anilistInfo&cutBorders'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default {
  async identify(ctx) {
    const { image }: Body = ctx.request.body || {}
    if (!image || !image.startsWith('data:image/')) {
      return ctx.badRequest('image (data URL) required')
    }

    try {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) return ctx.badRequest('invalid image data URL')
      const [, mediaType, base64] = match
      const buffer = Buffer.from(base64, 'base64')
      const blob = new Blob([buffer], { type: mediaType })

      const form = new FormData()
      form.append('image', blob, 'screenshot.png')

      const apiKey = process.env.TRACE_MOE_API_KEY
      const headers: Record<string, string> = {}
      if (apiKey) headers['x-trace-key'] = apiKey

      const res = await fetch(TRACE_MOE_URL, { method: 'POST', body: form, headers })
      if (!res.ok) {
        ctx.status = res.status
        return { error: `trace.moe failed: ${res.status} ${await res.text()}` }
      }

      const data = (await res.json()) as TraceMoeResponse
      if (!data.result || data.result.length === 0) {
        return { found: false }
      }

      const top = data.result[0]
      // Порог 0.87 — официальная рекомендация trace.moe, ниже шум
      if (top.similarity < 0.87) {
        return { found: false, similarity: top.similarity }
      }

      const title =
        top.anilist?.title?.english ||
        top.anilist?.title?.romaji ||
        top.anilist?.title?.native ||
        top.filename ||
        'unknown'

      return {
        found: true,
        title,
        titleNative: top.anilist?.title?.native,
        episode: top.episode,
        from: formatTime(top.from),
        to: formatTime(top.to),
        similarity: Math.round(top.similarity * 100),
        anilistId: top.anilist?.id,
        malId: top.anilist?.idMal,
        isAdult: top.anilist?.isAdult,
        previewVideo: top.video,
      }
    } catch (e) {
      strapi.log.error('[trace-moe] failed', e)
      ctx.status = 500
      return { error: e instanceof Error ? e.message : String(e) }
    }
  },
}
