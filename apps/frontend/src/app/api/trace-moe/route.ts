import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type Body = {
  image: string // base64 data URL
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

// trace.moe — специализированный поиск по кадрам аниме.
// Рекомендуется cutBorders=true (режет чёрные полосы), anilistInfo для метаданных.
// Лимит без API-ключа: 10 req/min, 1000/month.
// Если нужно больше — зарегистрировать ключ на trace.moe и добавить X-Trace-Key header.
const TRACE_MOE_URL = 'https://api.trace.moe/search?anilistInfo&cutBorders'

export async function POST(req: NextRequest) {
  const { image }: Body = await req.json()
  if (!image || !image.startsWith('data:image/')) {
    return Response.json({ error: 'image (data URL) required' }, { status: 400 })
  }

  try {
    // Парсим data URL → Blob для multipart POST
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) {
      return Response.json({ error: 'invalid image data URL' }, { status: 400 })
    }
    const [, mediaType, base64] = match
    const buffer = Buffer.from(base64, 'base64')
    const blob = new Blob([buffer], { type: mediaType })

    const form = new FormData()
    form.append('image', blob, 'screenshot.png')

    const apiKey = process.env.TRACE_MOE_API_KEY
    const headers: Record<string, string> = {}
    if (apiKey) headers['x-trace-key'] = apiKey

    const res = await fetch(TRACE_MOE_URL, {
      method: 'POST',
      body: form,
      headers,
    })

    if (!res.ok) {
      const errText = await res.text()
      return Response.json(
        { error: `trace.moe failed: ${res.status} ${errText}` },
        { status: res.status },
      )
    }

    const data = (await res.json()) as TraceMoeResponse

    // Отдаём только top-1 результат — с самым высоким similarity
    if (!data.result || data.result.length === 0) {
      return Response.json({ found: false })
    }
    const top = data.result[0]
    // Порог 0.87 — ниже результат не надёжный (официальная рекомендация trace.moe)
    if (top.similarity < 0.87) {
      return Response.json({ found: false, similarity: top.similarity })
    }

    const title =
      top.anilist?.title?.english ||
      top.anilist?.title?.romaji ||
      top.anilist?.title?.native ||
      top.filename ||
      'unknown'

    const fromTime = formatTime(top.from)
    const toTime = formatTime(top.to)

    return Response.json({
      found: true,
      title,
      titleNative: top.anilist?.title?.native,
      episode: top.episode,
      from: fromTime,
      to: toTime,
      similarity: Math.round(top.similarity * 100),
      anilistId: top.anilist?.id,
      malId: top.anilist?.idMal,
      isAdult: top.anilist?.isAdult,
      previewVideo: top.video,
    })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
