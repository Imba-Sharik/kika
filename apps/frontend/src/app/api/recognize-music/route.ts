import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

type AudDResult = {
  status: string
  result?: {
    artist?: string
    title?: string
    album?: string
    release_date?: string
    spotify?: { external_urls?: { spotify?: string } }
    apple_music?: { url?: string }
  }
  error?: { error_message?: string }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.AUDD_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'AUDD_API_KEY not set' }, { status: 500 })
  }

  const formData = await req.formData()
  const audio = formData.get('audio')
  if (!(audio instanceof File)) {
    return Response.json({ error: 'audio file required' }, { status: 400 })
  }

  try {
    const body = new FormData()
    body.append('api_token', apiKey)
    body.append('file', audio)
    body.append('return', 'apple_music,spotify')

    const res = await fetch('https://api.audd.io/', { method: 'POST', body })
    if (!res.ok) throw new Error(`AudD HTTP ${res.status}`)
    const data = (await res.json()) as AudDResult

    if (data.status !== 'success') {
      return Response.json(
        { error: data.error?.error_message ?? 'recognition failed' },
        { status: 500 },
      )
    }

    if (!data.result) return Response.json({ found: false })

    return Response.json({
      found: true,
      artist: data.result.artist ?? '',
      title: data.result.title ?? '',
      album: data.result.album ?? '',
      release_date: data.result.release_date ?? '',
      spotify: data.result.spotify?.external_urls?.spotify ?? null,
      apple_music: data.result.apple_music?.url ?? null,
    })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
