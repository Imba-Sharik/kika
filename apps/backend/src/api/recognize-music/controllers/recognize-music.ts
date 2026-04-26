import { readFile } from 'node:fs/promises'

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

export default {
  async recognize(ctx) {
    const apiKey = process.env.AUDD_API_KEY
    if (!apiKey) {
      ctx.status = 500
      return { error: 'AUDD_API_KEY not set' }
    }

    const files = (ctx.request.files || {}) as Record<
      string,
      { filepath?: string; path?: string; mimetype?: string; originalFilename?: string } | undefined
    >
    const audioFile = files.audio
    if (!audioFile) {
      return ctx.badRequest('audio file required')
    }

    const filepath = audioFile.filepath || audioFile.path
    if (!filepath) {
      return ctx.badRequest('audio filepath missing')
    }

    try {
      const bytes = await readFile(filepath)
      const blob = new Blob([bytes], { type: audioFile.mimetype || 'audio/webm' })

      const body = new FormData()
      body.append('api_token', apiKey)
      body.append('file', blob, audioFile.originalFilename || 'sample.webm')
      body.append('return', 'apple_music,spotify')

      const res = await fetch('https://api.audd.io/', { method: 'POST', body })
      if (!res.ok) throw new Error(`AudD HTTP ${res.status}`)
      const data = (await res.json()) as AudDResult

      if (data.status !== 'success') {
        ctx.status = 500
        return { error: data.error?.error_message ?? 'recognition failed' }
      }

      if (!data.result) return { found: false }

      return {
        found: true,
        artist: data.result.artist ?? '',
        title: data.result.title ?? '',
        album: data.result.album ?? '',
        release_date: data.result.release_date ?? '',
        spotify: data.result.spotify?.external_urls?.spotify ?? null,
        apple_music: data.result.apple_music?.url ?? null,
      }
    } catch (e) {
      strapi.log.error('[recognize-music] failed', e)
      ctx.status = 500
      return { error: e instanceof Error ? e.message : String(e) }
    }
  },
}
